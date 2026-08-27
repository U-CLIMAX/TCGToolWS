package top.uclimax.tcgtoolws

import android.app.DownloadManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.URLUtil
import android.webkit.WebView
import android.widget.Toast
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

/**
 * Android Native Bridge exposed to WebView.
 * Handles file saving (MediaStore) and clipboard operations (FileProvider) without frontend changes.
 */
class AndroidBridge(private val context: Context, private val webView: WebView) {

    companion object {
        const val TAG = "TCGToolWS_NativeBridge"
        const val BRIDGE_NAME = "__AndroidNativeBridge__"

        /**
         * Polyfill script injected into WebView to intercept downloads and image copying.
         */
        const val INJECTION_SCRIPT = """
(function() {
    if (window.__TCGTOOLWS_NATIVE_HOOKED__) return;
    window.__TCGTOOLWS_NATIVE_HOOKED__ = true;

    // 1. Safe Blob Cache to defend against immediate URL.revokeObjectURL calls
    var blobMap = new Map();
    var origCreateObjectURL = URL.createObjectURL;
    var origRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = function(blob) {
        var url = origCreateObjectURL.call(URL, blob);
        if (blob instanceof Blob) {
            blobMap.set(url, blob);
            setTimeout(function() {
                blobMap.delete(url);
            }, 60000);
        }
        return url;
    };

    URL.revokeObjectURL = function(url) {
        setTimeout(function() {
            blobMap.delete(url);
            try {
                origRevokeObjectURL.call(URL, url);
            } catch (e) {}
        }, 30000);
    };

    function readBlobAsBase64(blob) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onloadend = function() {
                if (typeof reader.result === 'string') {
                    var idx = reader.result.indexOf(',');
                    resolve(idx >= 0 ? reader.result.substring(idx + 1) : reader.result);
                } else {
                    reject(new Error('Failed to read blob as Base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function resolveBlob(url) {
        if (blobMap.has(url)) {
            return blobMap.get(url);
        }
        if (url.indexOf('data:') === 0 || url.indexOf('blob:') === 0) {
            try {
                var response = await fetch(url);
                return await response.blob();
            } catch (e) {
                console.warn('[NativeBridge] fetch failed for URL:', url, e);
            }
        }
        return null;
    }

    // 2. Intercept HTMLAnchorElement.prototype.click
    var origAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() {
        var href = this.href || '';
        var hasDownloadAttr = this.hasAttribute('download');
        var downloadAttr = this.getAttribute('download') || this.download;

        if (window.__AndroidNativeBridge__ && (hasDownloadAttr || href.indexOf('blob:') === 0 || href.indexOf('data:') === 0)) {
            var filename = downloadAttr || '';
            if (!filename) {
                if (href.indexOf('data:image/png') === 0) filename = 'image.png';
                else if (href.indexOf('data:application/pdf') === 0) filename = 'document.pdf';
                else filename = 'download';
            }

            resolveBlob(href).then(async function(blob) {
                if (blob) {
                    var mime = blob.type || (filename.endsWith('.pdf') ? 'application/pdf' : 'image/png');
                    var base64 = await readBlobAsBase64(blob);
                    window.__AndroidNativeBridge__.saveBase64File(base64, filename, mime);
                } else if (href.indexOf('http://') === 0 || href.indexOf('https://') === 0) {
                    window.__AndroidNativeBridge__.downloadUrl(href, filename);
                }
            }).catch(function(err) {
                console.error('[NativeBridge] Download interception error:', err);
            });

            return;
        }

        return origAnchorClick.apply(this, arguments);
    };

    // 3. Intercept navigator.clipboard.write
    if (navigator.clipboard) {
        var origClipboardWrite = navigator.clipboard.write ? navigator.clipboard.write.bind(navigator.clipboard) : null;

        navigator.clipboard.write = async function(items) {
            if (!window.__AndroidNativeBridge__) {
                if (origClipboardWrite) return origClipboardWrite(items);
                throw new Error('Clipboard API unavailable');
            }

            var imageItemHandled = false;
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item && item.types) {
                    var imgType = item.types.find(function(t) { return t.indexOf('image/') === 0; });
                    if (imgType) {
                        try {
                            var blob = await item.getType(imgType);
                            var base64 = await readBlobAsBase64(blob);
                            window.__AndroidNativeBridge__.copyImageToClipboard(base64, imgType);
                            imageItemHandled = true;
                            break;
                        } catch (err) {
                            console.error('[NativeBridge] Clipboard item extraction error:', err);
                        }
                    }
                }
            }

            if (imageItemHandled) {
                return Promise.resolve();
            }

            if (origClipboardWrite) {
                return origClipboardWrite(items);
            }
            return Promise.resolve();
        };
    }
})();
"""
    }

    /**
     * Save a base64 encoded file into Android public directories (Pictures or Downloads) via MediaStore.
     */
    @JavascriptInterface
    fun saveBase64File(base64Data: String, fileName: String, mimeType: String) {
        Thread {
            try {
                val cleanFileName = sanitizeFileName(fileName)
                val isImage = mimeType.startsWith("image/", ignoreCase = true) ||
                        cleanFileName.endsWith(".png", ignoreCase = true) ||
                        cleanFileName.endsWith(".jpg", ignoreCase = true) ||
                        cleanFileName.endsWith(".jpeg", ignoreCase = true) ||
                        cleanFileName.endsWith(".webp", ignoreCase = true)

                val effectiveMime = when {
                    mimeType.isNotBlank() && mimeType != "application/octet-stream" -> mimeType
                    cleanFileName.endsWith(".pdf", ignoreCase = true) -> "application/pdf"
                    cleanFileName.endsWith(".png", ignoreCase = true) -> "image/png"
                    cleanFileName.endsWith(".jpg", ignoreCase = true) || cleanFileName.endsWith(".jpeg", ignoreCase = true) -> "image/jpeg"
                    cleanFileName.endsWith(".webp", ignoreCase = true) -> "image/webp"
                    else -> if (isImage) "image/png" else "application/octet-stream"
                }

                val bytes = Base64.decode(base64Data, Base64.DEFAULT)

                if (isImage) {
                    saveImageToMediaStore(cleanFileName, effectiveMime, bytes)
                    showToast("已保存图片至相册: $cleanFileName")
                } else {
                    saveDownloadToMediaStore(cleanFileName, effectiveMime, bytes)
                    showToast("已保存文件至下载目录: $cleanFileName")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error saving base64 file: $fileName", e)
                showToast("保存失败: ${e.localizedMessage ?: "未知错误"}")
            }
        }.start()
    }

    /**
     * Copy an image to the Android system clipboard via FileProvider and ClipData.
     */
    @JavascriptInterface
    fun copyImageToClipboard(base64Data: String, mimeType: String) {
        Thread {
            try {
                val bytes = Base64.decode(base64Data, Base64.DEFAULT)
                val cacheDir = File(context.cacheDir, "clipboard_images").apply { mkdirs() }
                cacheDir.listFiles()?.forEach { it.delete() }

                val ext = when {
                    mimeType.contains("jpeg") || mimeType.contains("jpg") -> ".jpg"
                    mimeType.contains("webp") -> ".webp"
                    else -> ".png"
                }
                val imageFile = File(cacheDir, "copied_image$ext")
                FileOutputStream(imageFile).use { it.write(bytes) }

                val contentUri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    imageFile
                )

                Handler(Looper.getMainLooper()).post {
                    try {
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = ClipData.newUri(context.contentResolver, "Image", contentUri)
                        clipboard.setPrimaryClip(clip)
                        Toast.makeText(context, "图片已成功复制到剪贴板", Toast.LENGTH_SHORT).show()
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to set clipboard clip", e)
                        Toast.makeText(context, "复制到剪贴板失败: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error copying image to clipboard", e)
                showToast("复制失败: ${e.localizedMessage ?: "未知错误"}")
            }
        }.start()
    }

    /**
     * Fallback for standard HTTP/HTTPS file downloads.
     */
    @JavascriptInterface
    fun downloadUrl(url: String, fileName: String) {
        handleDownloadListener(url, null, "attachment; filename=\"$fileName\"", null)
    }

    /**
     * Handles WebView download listener requests for normal network links.
     */
    fun handleDownloadListener(url: String, userAgent: String?, contentDisposition: String?, mimetype: String?) {
        try {
            if (url.startsWith("http://", ignoreCase = true) || url.startsWith("https://", ignoreCase = true)) {
                val request = DownloadManager.Request(Uri.parse(url)).apply {
                    if (!mimetype.isNullOrBlank()) setMimeType(mimetype)
                    if (!userAgent.isNullOrBlank()) addRequestHeader("User-Agent", userAgent)
                    val rawFileName = URLUtil.guessFileName(url, contentDisposition, mimetype)
                    val cleanFileName = sanitizeFileName(rawFileName)
                    setDescription("正在下载 $cleanFileName")
                    setTitle(cleanFileName)
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "U-CLIMAX/$cleanFileName")
                }
                val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                dm.enqueue(request)
                showToast("开始下载文件...")
            }
        } catch (e: Exception) {
            Log.e(TAG, "DownloadManager failed", e)
            showToast("下载启动失败: ${e.localizedMessage}")
        }
    }

    private fun saveImageToMediaStore(fileName: String, mimeType: String, bytes: ByteArray) {
        val resolver = context.contentResolver
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val contentValues = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
                put(MediaStore.Images.Media.MIME_TYPE, mimeType)
                put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + File.separator + "U-CLIMAX")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
            val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                ?: throw IllegalStateException("无法创建相册媒体条目")
            resolver.openOutputStream(uri)?.use { it.write(bytes) }
                ?: throw IllegalStateException("无法打开输出流写入图片")
            contentValues.clear()
            contentValues.put(MediaStore.Images.Media.IS_PENDING, 0)
            resolver.update(uri, contentValues, null, null)
        } else {
            val picturesDir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "U-CLIMAX").apply { mkdirs() }
            val file = File(picturesDir, fileName)
            FileOutputStream(file).use { it.write(bytes) }
            MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf(mimeType), null)
        }
    }

    private fun saveDownloadToMediaStore(fileName: String, mimeType: String, bytes: ByteArray) {
        val resolver = context.contentResolver
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val contentValues = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                put(MediaStore.Downloads.MIME_TYPE, mimeType)
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + File.separator + "U-CLIMAX")
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                ?: throw IllegalStateException("无法创建下载媒体条目")
            resolver.openOutputStream(uri)?.use { it.write(bytes) }
                ?: throw IllegalStateException("无法打开输出流写入文件")
            contentValues.clear()
            contentValues.put(MediaStore.Downloads.IS_PENDING, 0)
            resolver.update(uri, contentValues, null, null)
        } else {
            val downloadDir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "U-CLIMAX").apply { mkdirs() }
            val file = File(downloadDir, fileName)
            FileOutputStream(file).use { it.write(bytes) }
            MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf(mimeType), null)
        }
    }

    private fun sanitizeFileName(fileName: String): String {
        var clean = fileName.trim().replace(Regex("[\\\\/:*?\"<>|]"), "_")
        if (clean.isBlank()) {
            clean = "download_${System.currentTimeMillis()}"
        }
        return clean
    }

    private fun showToast(message: String) {
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }
    }
}
