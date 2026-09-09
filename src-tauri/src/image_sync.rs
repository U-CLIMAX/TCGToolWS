use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::{Emitter, Manager};

#[derive(Deserialize)]
struct TeraCloudShareResponse {
    location: Option<String>,
}

#[derive(Clone, Serialize)]
pub struct ImagePackageProgress {
    pub folder: String,
    pub progress: f64,
    pub downloaded: u64,
    pub total: u64,
    pub stage: String, // "requesting" | "downloading" | "extracting" | "done"
}

/// RAII Guard ensuring temporary files are cleanly deleted from disk when dropped
struct TempFileGuard<'a>(&'a Path);

impl<'a> Drop for TempFileGuard<'a> {
    fn drop(&mut self) {
        if self.0.exists() {
            let _ = std::fs::remove_file(self.0);
        }
    }
}

/// Sanitizes share_id input by extracting the ID token if a full URL or path was supplied
pub fn sanitize_share_id(raw_id: &str) -> &str {
    let trimmed = raw_id.trim().trim_end_matches('/');
    if let Some(pos) = trimmed.rfind('/') {
        &trimmed[pos + 1..]
    } else {
        trimmed
    }
}

/// Helper: Decodes OEM bytes from Windows CLI tools (fsutil) to a UTF-8 String across all system locales.
#[cfg(windows)]
fn decode_oem_string(bytes: &[u8]) -> String {
    if let Ok(s) = std::str::from_utf8(bytes) {
        return s.to_string();
    }
    #[link(name = "kernel32")]
    extern "system" {
        fn MultiByteToWideChar(
            code_page: u32,
            flags: u32,
            multi_byte_str: *const u8,
            multi_byte_len: i32,
            wide_char_str: *mut u16,
            wide_char_len: i32,
        ) -> i32;
    }
    const CP_OEMCP: u32 = 1;

    unsafe {
        let len = MultiByteToWideChar(
            CP_OEMCP,
            0,
            bytes.as_ptr(),
            bytes.len() as i32,
            std::ptr::null_mut(),
            0,
        );
        if len > 0 {
            let mut wide_buf = vec![0u16; len as usize];
            MultiByteToWideChar(
                CP_OEMCP,
                0,
                bytes.as_ptr(),
                bytes.len() as i32,
                wide_buf.as_mut_ptr(),
                len,
            );
            return String::from_utf16_lossy(&wide_buf);
        }
    }
    String::from_utf8_lossy(bytes).to_string()
}

/// Helper: Checks if a directory has the case-sensitive attribute enabled on Windows.
#[cfg(windows)]
pub fn is_dir_case_sensitive(dir: &Path) -> bool {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let path_str = dir.to_string_lossy().to_string();
    if let Ok(output) = std::process::Command::new("fsutil.exe")
        .args(["file", "queryCaseSensitiveInfo", &path_str])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    {
        let text = decode_oem_string(&output.stdout).to_lowercase();
        text.contains("is enabled")
            || (text.contains("enabled") && !text.contains("disabled"))
            || text.contains("已啟用")
            || text.contains("啟用")
            || text.contains("已启用")
            || text.contains("启用")
            // Big5 raw byte signature fallback for '啟' [0xB1, 0xD2]
            || output.stdout.windows(2).any(|w| w == [0xb1, 0xd2])
    } else {
        false
    }
}

/// Helper: Attempts to enable case-sensitivity on a newly created (empty) directory on Windows.
/// Runs silently in background without window popups.
#[cfg(windows)]
pub fn enable_case_sensitive_dir(dir: &Path) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let _ = std::process::Command::new("fsutil.exe")
        .args([
            "file",
            "setCaseSensitiveInfo",
            &dir.to_string_lossy(),
            "enable",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
}

#[cfg(not(windows))]
pub fn enable_case_sensitive_dir(_dir: &Path) {}

/// Resolves the default card image directory within the app's AppData directory
#[tauri::command]
pub async fn get_default_card_image_dir(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_data = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let image_dir = app_data.join("card-images");
    Ok(image_dir.to_string_lossy().to_string())
}

/// Lists all existing card series subfolder names in the target local directory (ignoring empty folders)
#[tauri::command]
pub async fn get_local_image_folders(target_dir: String) -> Result<Vec<String>, String> {
    let clean_dir = target_dir.trim();
    if clean_dir.is_empty() {
        return Ok(Vec::new());
    }

    let base_path = PathBuf::from(clean_dir).join("ws-image-data");
    if !base_path.exists() || !base_path.is_dir() {
        return Ok(Vec::new());
    }

    let mut folders = Vec::new();
    if let Ok(entries) = std::fs::read_dir(base_path) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_dir() {
                    // Check if directory contains at least one file/entry (preventing empty dirs from blocking sync)
                    if let Ok(mut sub_entries) = std::fs::read_dir(entry.path()) {
                        if sub_entries.next().is_some() {
                            if let Ok(name) = entry.file_name().into_string() {
                                folders.push(name);
                            }
                        }
                    }
                }
            }
        }
    }
    folders.sort();
    Ok(folders)
}

use std::sync::atomic::{AtomicBool, Ordering};

static SYNC_CANCELLED: AtomicBool = AtomicBool::new(false);

/// Cancels any ongoing card image sync immediately
#[tauri::command]
pub fn cancel_card_image_sync() {
    SYNC_CANCELLED.store(true, Ordering::Relaxed);
}

/// Resets the cancellation flag before starting a new sync session
#[tauri::command]
pub fn reset_card_image_sync_cancel() {
    SYNC_CANCELLED.store(false, Ordering::Relaxed);
}

/// Downloads and extracts a single card image package from TeraCloud directly into target_dir
#[tauri::command]
pub async fn sync_card_image_package(
    app_handle: tauri::AppHandle,
    folder: String,
    share_id: String,
    target_dir: String,
) -> Result<(), String> {
    if SYNC_CANCELLED.load(Ordering::Relaxed) {
        return Err("Sync cancelled by user".to_string());
    }

    let clean_share_id = sanitize_share_id(&share_id);
    if clean_share_id.is_empty() || clean_share_id == "0" {
        return Err(format!("Package {} has no valid share_id", folder));
    }

    let clean_target_dir = target_dir.trim();
    if clean_target_dir.is_empty() {
        return Err("Target directory is empty".to_string());
    }

    let _ = app_handle.emit(
        "card-image-sync-progress",
        ImagePackageProgress {
            folder: folder.clone(),
            progress: 0.0,
            downloaded: 0,
            total: 0,
            stage: "requesting".to_string(),
        },
    );

    let client = reqwest::Client::builder()
        .user_agent("TCGToolWS-Client")
        .connect_timeout(std::time::Duration::from_secs(20))
        .tcp_keepalive(Some(std::time::Duration::from_secs(15)))
        .pool_idle_timeout(Some(std::time::Duration::from_secs(60)))
        .no_gzip()
        .no_brotli()
        .no_deflate()
        .build()
        .map_err(|e| e.to_string())?;

    // Step 1: Request download location from TeraCloud share API with retry resilience
    let share_url = format!(
        "https://seto.teracloud.jp/v2/api/share/public/{}",
        clean_share_id
    );

    let mut location_opt: Option<String> = None;
    let mut last_err = String::new();

    for attempt in 1..=3 {
        if SYNC_CANCELLED.load(Ordering::Relaxed) {
            return Err("Sync cancelled by user".to_string());
        }

        match client
            .post(&share_url)
            .header("Accept", "application/json")
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body("")
            .send()
            .await
        {
            Ok(post_res) => {
                if post_res.status().is_success() {
                    if let Ok(text) = post_res.text().await {
                        if let Ok(share_data) =
                            serde_json::from_str::<TeraCloudShareResponse>(&text)
                        {
                            if let Some(loc) = share_data.location {
                                location_opt = Some(loc);
                                break;
                            }
                        }
                    }
                } else {
                    last_err = format!(
                        "TeraCloud API returned status {} for folder {}",
                        post_res.status(),
                        folder
                    );
                }
            }
            Err(e) => {
                last_err = format!("Failed to request share location: {}", e);
            }
        }

        if attempt < 3 && !SYNC_CANCELLED.load(Ordering::Relaxed) {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }
    }

    let location = location_opt.ok_or_else(|| {
        if last_err.is_empty() {
            "No download location returned by TeraCloud".to_string()
        } else {
            last_err
        }
    })?;

    let download_url = if location.starts_with("http://") || location.starts_with("https://") {
        location
    } else if location.starts_with('/') {
        format!("https://seto.teracloud.jp{}", location)
    } else {
        format!("https://seto.teracloud.jp/{}", location)
    };

    if SYNC_CANCELLED.load(Ordering::Relaxed) {
        return Err("Sync cancelled by user".to_string());
    }

    // Step 2: Stream download the ZIP archive into a temp file with HTTP Range resume resilience
    let temp_zip_filename = format!(
        "tcgtoolws_sync_{}_{}.zip",
        folder.replace(|c: char| !c.is_alphanumeric() && c != '_' && c != '-', "_"),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );
    let temp_zip_path = std::env::temp_dir().join(temp_zip_filename);
    let _temp_guard = TempFileGuard(&temp_zip_path);

    let mut downloaded: u64 = 0;
    let mut total_size: u64 = 0;

    {
        let max_retries = 5;
        let mut attempt = 0;

        let mut temp_file = std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&temp_zip_path)
            .map_err(|e| e.to_string())?;

        while attempt < max_retries {
            if SYNC_CANCELLED.load(Ordering::Relaxed) {
                return Err("Sync cancelled by user".to_string());
            }

            let mut req = client.get(&download_url);
            if downloaded > 0 {
                req = req.header("Range", format!("bytes={}-", downloaded));
            }

            let get_res = match req.send().await {
                Ok(res) => res,
                Err(e) => {
                    attempt += 1;
                    if attempt >= max_retries {
                        return Err(format!(
                            "Failed to start download after {} attempts: {}",
                            max_retries, e
                        ));
                    }
                    tokio::time::sleep(std::time::Duration::from_millis(500 * (1 << attempt)))
                        .await;
                    continue;
                }
            };

            let status = get_res.status();
            if !status.is_success() {
                attempt += 1;
                if attempt >= max_retries {
                    return Err(format!("Download failed with status: {}", status));
                }
                tokio::time::sleep(std::time::Duration::from_millis(500 * (1 << attempt))).await;
                continue;
            }

            if downloaded == 0 {
                total_size = get_res.content_length().unwrap_or(0);
            } else if status == reqwest::StatusCode::OK {
                // Server did not honor Range request (returned full file 200 OK)
                downloaded = 0;
                total_size = get_res.content_length().unwrap_or(0);
                temp_file = std::fs::OpenOptions::new()
                    .create(true)
                    .write(true)
                    .truncate(true)
                    .open(&temp_zip_path)
                    .map_err(|e| e.to_string())?;
            }

            let mut stream = get_res.bytes_stream();
            let mut last_emit = std::time::Instant::now();
            let mut stream_interrupted = false;

            while let Some(chunk_res) = stream.next().await {
                if SYNC_CANCELLED.load(Ordering::Relaxed) {
                    return Err("Sync cancelled by user".to_string());
                }

                match chunk_res {
                    Ok(chunk) => {
                        temp_file
                            .write_all(&chunk)
                            .map_err(|e| format!("Write chunk error: {}", e))?;
                        downloaded += chunk.len() as u64;

                        if last_emit.elapsed().as_millis() >= 100
                            || (total_size > 0 && downloaded == total_size)
                        {
                            let progress = if total_size > 0 {
                                (downloaded as f64 / total_size as f64) * 100.0
                            } else {
                                0.0
                            };

                            let _ = app_handle.emit(
                                "card-image-sync-progress",
                                ImagePackageProgress {
                                    folder: folder.clone(),
                                    progress,
                                    downloaded,
                                    total: total_size,
                                    stage: "downloading".to_string(),
                                },
                            );
                            last_emit = std::time::Instant::now();
                        }
                    }
                    Err(e) => {
                        eprintln!(
                            "Download stream interrupted for {}: {}, attempting resume from offset {}...",
                            folder, e, downloaded
                        );
                        stream_interrupted = true;
                        break;
                    }
                }
            }

            if stream_interrupted {
                attempt += 1;
                if attempt >= max_retries {
                    return Err(format!(
                        "Stream read error after {} retry attempts",
                        max_retries
                    ));
                }
                tokio::time::sleep(std::time::Duration::from_millis(500 * (1 << attempt))).await;
                continue;
            }

            temp_file.flush().map_err(|e| e.to_string())?;
            break;
        }
    } // temp_file is explicitly flushed and closed here

    if SYNC_CANCELLED.load(Ordering::Relaxed) {
        return Err("Sync cancelled by user".to_string());
    }

    // Step 3: Extract ZIP archive directly into target_dir
    let _ = app_handle.emit(
        "card-image-sync-progress",
        ImagePackageProgress {
            folder: folder.clone(),
            progress: 100.0,
            downloaded,
            total: total_size,
            stage: "extracting".to_string(),
        },
    );

    let target_path = Path::new(&target_dir);
    if !target_path.exists() {
        std::fs::create_dir_all(target_path)
            .map_err(|e| format!("Failed to create target dir: {}", e))?;
        enable_case_sensitive_dir(target_path);
    }

    // Ensure the specific series subfolders in ws-image-data & ws-blur-image-data are case-sensitive on Windows
    #[cfg(windows)]
    {
        let img_folder = target_path.join("ws-image-data").join(&folder);
        let blur_folder = target_path.join("ws-blur-image-data").join(&folder);

        for dir in [&img_folder, &blur_folder] {
            // If the folder exists but was created previously without case-sensitivity,
            // clean it first so fsutil setCaseSensitiveInfo can succeed on the empty folder.
            if dir.exists() && !is_dir_case_sensitive(dir) {
                let _ = std::fs::remove_dir_all(dir);
            }
            if !dir.exists() {
                if let Ok(()) = std::fs::create_dir_all(dir) {
                    enable_case_sensitive_dir(dir);
                }
            }
        }
    }

    {
        let zip_file = File::open(&temp_zip_path).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(zip_file).map_err(|e| e.to_string())?;

        for i in 0..archive.len() {
            if SYNC_CANCELLED.load(Ordering::Relaxed) {
                return Err("Sync cancelled by user".to_string());
            }

            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            let enclosed = match file.enclosed_name() {
                Some(path) => path.to_owned(),
                None => continue,
            };

            let outpath = target_path.join(enclosed);

            if file.is_dir() {
                if !outpath.exists() {
                    std::fs::create_dir_all(&outpath).map_err(|e| {
                        format!("Failed to create directory {}: {}", outpath.display(), e)
                    })?;
                    enable_case_sensitive_dir(&outpath);
                }
            } else {
                if let Some(parent) = outpath.parent() {
                    if !parent.exists() {
                        std::fs::create_dir_all(parent).map_err(|e| {
                            format!(
                                "Failed to create parent directory {}: {}",
                                parent.display(),
                                e
                            )
                        })?;
                        enable_case_sensitive_dir(parent);
                    }
                }
                let mut outfile = File::create(&outpath)
                    .map_err(|e| format!("Failed to create file {}: {}", outpath.display(), e))?;
                std::io::copy(&mut file, &mut outfile)
                    .map_err(|e| format!("Failed to extract file {}: {}", outpath.display(), e))?;
            }
        }
    } // archive and zip_file are dropped and closed here, freeing Windows file locks

    let _ = app_handle.emit(
        "card-image-sync-progress",
        ImagePackageProgress {
            folder: folder.clone(),
            progress: 100.0,
            downloaded,
            total: total_size,
            stage: "done".to_string(),
        },
    );

    // _temp_guard will automatically delete temp_zip_path upon drop
    Ok(())
}

fn remove_dir_all_robust(path: &Path) -> std::io::Result<()> {
    if let Err(_) = std::fs::remove_dir_all(path) {
        remove_dir_contents_recursive(path)?;
        let _ = std::fs::remove_dir(path);
    }
    Ok(())
}

fn remove_dir_contents_recursive(path: &Path) -> std::io::Result<()> {
    if path.is_dir() {
        for entry in std::fs::read_dir(path)? {
            let entry = entry?;
            let entry_path = entry.path();
            if entry_path.is_dir() {
                let _ = remove_dir_contents_recursive(&entry_path);
                let _ = std::fs::remove_dir(&entry_path);
            } else {
                if let Ok(metadata) = std::fs::metadata(&entry_path) {
                    let mut perms = metadata.permissions();
                    if perms.readonly() {
                        perms.set_readonly(false);
                        let _ = std::fs::set_permissions(&entry_path, perms);
                    }
                }
                let _ = std::fs::remove_file(&entry_path);
            }
        }
    }
    Ok(())
}

/// Safely deletes the entire local card image directory
#[tauri::command]
pub async fn delete_card_image_dir(target_dir: String) -> Result<(), String> {
    let clean_dir = target_dir.trim();
    if clean_dir.is_empty() {
        return Err("Target directory path is empty".to_string());
    }

    let path = PathBuf::from(clean_dir);
    if !path.exists() {
        return Ok(());
    }

    if !path.is_dir() {
        return Err("Specified path is not a directory".to_string());
    }

    // Safety guard: prevent accidental deletion of drive root or top-level directories
    let canonical = path.canonicalize().map_err(|e| e.to_string())?;
    if canonical.components().count() <= 2 {
        return Err("Refusing to delete root or top-level directory for safety".to_string());
    }

    remove_dir_all_robust(&canonical)
        .map_err(|e| format!("Failed to delete card image directory: {}", e))?;

    Ok(())
}

/// Sends a native desktop notification (Windows Toast / macOS / Linux notification)
#[cfg(desktop)]
#[tauri::command]
pub fn show_desktop_notification(
    app_handle: tauri::AppHandle,
    title: String,
    body: String,
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    let mut builder = app_handle.notification().builder();
    if !title.trim().is_empty() {
        builder = builder.title(title);
    }
    if !body.trim().is_empty() {
        builder = builder.body(body);
    }
    builder.show().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_share_id() {
        assert_eq!(sanitize_share_id("abc123xyz"), "abc123xyz");
        assert_eq!(sanitize_share_id("  abc123xyz/  "), "abc123xyz");
        assert_eq!(
            sanitize_share_id("https://seto.teracloud.jp/v2/api/share/public/abcdef9876"),
            "abcdef9876"
        );
        assert_eq!(
            sanitize_share_id("https://teracloud.jp/share/target_folder/"),
            "target_folder"
        );
        assert_eq!(sanitize_share_id("   "), "");
        assert_eq!(sanitize_share_id("0"), "0");
        assert_eq!(sanitize_share_id(" 0 "), "0");
        assert_eq!(sanitize_share_id("0/"), "0");
    }

    #[test]
    fn test_get_local_image_folders_empty() {
        tauri::async_runtime::block_on(async {
            let res = get_local_image_folders("   ".to_string()).await.unwrap();
            assert!(res.is_empty());

            let res2 = get_local_image_folders("non_existent_folder_path_xyz".to_string())
                .await
                .unwrap();
            assert!(res2.is_empty());
        });
    }

    #[test]
    fn test_temp_file_guard_cleanup() {
        let temp_path = std::env::temp_dir().join(format!(
            "tcgtoolws_test_{}.tmp",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        File::create(&temp_path).unwrap();
        assert!(temp_path.exists());

        {
            let _guard = TempFileGuard(&temp_path);
        }

        assert!(
            !temp_path.exists(),
            "Temp file should be deleted by TempFileGuard drop"
        );
    }

    #[test]
    fn test_delete_card_image_dir() {
        tauri::async_runtime::block_on(async {
            // Test non-existent path returns Ok(())
            let non_existent = std::env::temp_dir().join("tcgtoolws_non_existent_dir_12345");
            let res = delete_card_image_dir(non_existent.to_string_lossy().to_string()).await;
            assert!(res.is_ok());

            // Test empty path returns Err
            let empty_res = delete_card_image_dir("   ".to_string()).await;
            assert!(empty_res.is_err());

            // Test real directory creation and deletion
            let test_dir = std::env::temp_dir().join(format!(
                "tcgtoolws_test_delete_dir_{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
            let sub_dir = test_dir.join("ws-image-data").join("series-a");
            std::fs::create_dir_all(&sub_dir).unwrap();
            let test_file = sub_dir.join("test.txt");
            let mut f = File::create(&test_file).unwrap();
            f.write_all(b"sample data").unwrap();
            assert!(test_dir.exists());
            assert!(test_file.exists());

            let delete_res = delete_card_image_dir(test_dir.to_string_lossy().to_string()).await;
            assert!(delete_res.is_ok());
            assert!(!test_dir.exists());

            // Test directory containing readonly files
            let readonly_dir = std::env::temp_dir().join(format!(
                "tcgtoolws_test_readonly_dir_{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
            let ro_sub_dir = readonly_dir.join("ws-image-data").join("series-ro");
            std::fs::create_dir_all(&ro_sub_dir).unwrap();
            let ro_file = ro_sub_dir.join("readonly_card.webp");
            let mut ro_f = File::create(&ro_file).unwrap();
            ro_f.write_all(b"image bytes").unwrap();
            drop(ro_f);

            let mut perms = std::fs::metadata(&ro_file).unwrap().permissions();
            perms.set_readonly(true);
            std::fs::set_permissions(&ro_file, perms).unwrap();

            let ro_delete_res =
                delete_card_image_dir(readonly_dir.to_string_lossy().to_string()).await;
            assert!(ro_delete_res.is_ok());
            assert!(!readonly_dir.exists());
        });
    }

    #[test]
    #[cfg(windows)]
    fn test_case_sensitive_dir_handling() {
        let test_dir = std::env::temp_dir().join(format!(
            "tcgtoolws_test_cs_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&test_dir).unwrap();
        enable_case_sensitive_dir(&test_dir);

        let is_cs = is_dir_case_sensitive(&test_dir);
        let _ = std::fs::remove_dir_all(&test_dir);
        assert!(
            is_cs,
            "Newly created empty directory should have case sensitivity enabled"
        );
    }
}
