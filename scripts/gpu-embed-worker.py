# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "onnxruntime-gpu[cuda,cudnn]",
#   "onnx",
#   "onnxconverter-common",
#   "pillow",
#   "numpy",
# ]
# ///

import json
import os
import struct
import sys
import time
import warnings
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait

import numpy as np
import onnx
import onnxruntime as ort
from onnxconverter_common import float16
from PIL import Image

warnings.filterwarnings("ignore", message=".*will be truncated to.*")

MILO_SIZE = 448
DIMS = 128
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(3, 1, 1)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(3, 1, 1)


def build_batched_fp16_bytes(model_path: str, batch_size: int) -> bytes:
    model = onnx.load(model_path)
    seen = set()
    for node in model.graph.node:
        if node.op_type == "Reshape" and node.input[1] not in seen:
            init = next((i for i in model.graph.initializer if i.name == node.input[1]), None)
            if init is not None:
                seen.add(node.input[1])
                arr = onnx.numpy_helper.to_array(init).copy()
                if arr[0] > 0:
                    arr[0] *= batch_size
                    init.CopyFrom(onnx.numpy_helper.from_array(arr, init.name))
    model.graph.input[0].type.tensor_type.shape.dim[0].dim_value = batch_size
    model.graph.output[0].type.tensor_type.shape.dim[0].dim_value = batch_size
    del model.graph.value_info[:]
    inferred = onnx.shape_inference.infer_shapes(model)
    fp16_model = float16.convert_float_to_float16(inferred, keep_io_types=True)
    return fp16_model.SerializeToString()


def load_nchw_image(job: dict):
    idx = job["idx"]
    img_path = job["imgPath"]
    try:
        with Image.open(img_path) as im:
            rgb = im.convert("RGB").resize((MILO_SIZE, MILO_SIZE), Image.Resampling.BILINEAR)
            arr = np.asarray(rgb, dtype=np.float32) * (1.0 / 255.0)
            chw = np.transpose(arr, (2, 0, 1))
            chw = (chw - MEAN) / STD
            return idx, np.ascontiguousarray(chw), None
    except Exception as exc:
        return idx, None, str(exc)


def l2_normalize_batch(vecs: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms = np.where(norms > 1e-12, norms, 1.0)
    return (vecs / norms).astype(np.float32)


def main():
    if len(sys.argv) < 4:
        print(
            "Usage: gpu-embed-worker.py <model_path> <jobs_json> <stream_out_bin> [batch_size]",
            file=sys.stderr,
        )
        sys.exit(2)

    model_path = sys.argv[1]
    jobs_path = sys.argv[2]
    out_path = sys.argv[3]
    batch_size = int(sys.argv[4]) if len(sys.argv) > 4 else 8

    with open(jobs_path, "r", encoding="utf-8") as f:
        jobs = json.load(f)

    if not jobs:
        open(out_path, "wb").close()
        return

    ort.preload_dlls()
    ort.set_default_logger_severity(3)

    session = None
    active_bs = batch_size
    for try_bs in ([batch_size, 8, 4] if batch_size > 8 else [batch_size, 4]):
        try:
            model_bytes = build_batched_fp16_bytes(model_path, try_bs)
            sess_opts = ort.SessionOptions()
            sess_opts.log_severity_level = 3
            sess = ort.InferenceSession(
                model_bytes,
                sess_options=sess_opts,
                providers=[("CUDAExecutionProvider", {"cudnn_conv_algo_search": "HEURISTIC"})],
            )
            if "CUDAExecutionProvider" not in sess.get_providers():
                raise RuntimeError("CUDAExecutionProvider not active")
            probe = np.zeros((try_bs, 3, MILO_SIZE, MILO_SIZE), dtype=np.float32)
            sess.run(None, {sess.get_inputs()[0].name: probe})
            session = sess
            active_bs = try_bs
            break
        except Exception as exc:
            print(f"   ⚠️ CUDA batch={try_bs} unavailable: {exc}", file=sys.stderr)

    if session is None:
        raise RuntimeError("No CUDA execution provider available for MilO embedding inference")

    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    total = len(jobs)
    decode_workers = min(12, max(4, (os.cpu_count() or 8) - 2))
    print(f"   ⚡ CUDA FP16 active (batch={active_bs}, decode_threads={decode_workers}) for {total} images")

    batch_tensor = np.zeros((active_bs, 3, MILO_SIZE, MILO_SIZE), dtype=np.float32)
    batch_indices = []
    processed = 0
    failed = 0
    t_start = time.perf_counter()

    with open(out_path, "wb") as out_f, ThreadPoolExecutor(max_workers=decode_workers) as pool:

        def flush_batch():
            nonlocal processed
            if not batch_indices:
                return
            outputs = session.run([output_name], {input_name: batch_tensor})[0]
            normed = l2_normalize_batch(outputs[: len(batch_indices)])
            for row_i, job_idx in enumerate(batch_indices):
                out_f.write(struct.pack("<I", job_idx))
                out_f.write(normed[row_i].tobytes())
            processed += len(batch_indices)
            batch_indices.clear()
            if processed % 500 < active_bs or processed + failed >= total:
                out_f.flush()
                elapsed = max(0.05, time.perf_counter() - t_start)
                rate = (processed + failed) / elapsed
                eta = int((total - processed - failed) / max(0.1, rate))
                print(f"   ... {processed + failed}/{total} ({rate:.1f} img/s, ETA {eta}s)", flush=True)

        max_in_flight = max(16, decode_workers * 3)
        in_flight = set()
        job_iter = iter(jobs)
        exhausted = False

        def submit_more():
            nonlocal exhausted
            while not exhausted and len(in_flight) < max_in_flight:
                try:
                    job = next(job_iter)
                    in_flight.add(pool.submit(load_nchw_image, job))
                except StopIteration:
                    exhausted = True

        submit_more()
        while in_flight:
            done, in_flight = wait(in_flight, return_when=FIRST_COMPLETED)
            submit_more()
            for fut in done:
                job_idx, chw, err = fut.result()
                if err is not None or chw is None:
                    failed += 1
                    print(f"   ⚠️ Skip job {job_idx}: {err}", file=sys.stderr)
                    continue
                slot = len(batch_indices)
                batch_tensor[slot] = chw
                batch_indices.append(job_idx)
                if len(batch_indices) == active_bs:
                    flush_batch()

        flush_batch()
        out_f.flush()


if __name__ == "__main__":
    main()
