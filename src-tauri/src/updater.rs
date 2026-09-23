use futures_util::StreamExt;
use serde::Serialize;
use std::io::Write;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Emitter;

static UPDATER_CANCELLED: AtomicBool = AtomicBool::new(false);

#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    pub progress: f64,
    pub downloaded: u64,
    pub total: u64,
}

/// Cancels any ongoing client update download immediately
#[tauri::command]
pub fn cancel_client_update() {
    UPDATER_CANCELLED.store(true, Ordering::Relaxed);
}

/// Resets the updater cancellation flag before starting a download
#[tauri::command]
pub fn reset_client_update_cancel() {
    UPDATER_CANCELLED.store(false, Ordering::Relaxed);
}

#[tauri::command]
pub async fn download_and_install_update(
    app_handle: tauri::AppHandle,
    url: String,
    filename: String,
) -> Result<(), String> {
    UPDATER_CANCELLED.store(false, Ordering::Relaxed);

    let client = reqwest::Client::builder()
        .user_agent("TCGToolWS-Client")
        .build()
        .map_err(|e| e.to_string())?;

    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Download failed with status: {}", res.status()));
    }

    if UPDATER_CANCELLED.load(Ordering::Relaxed) {
        return Err("Download cancelled by user".to_string());
    }

    let total_size = res.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;

    let temp_dir = std::env::temp_dir();
    let dest_path = temp_dir.join(&filename);
    let mut file = std::fs::File::create(&dest_path).map_err(|e| e.to_string())?;

    let mut stream = res.bytes_stream();
    while let Some(item) = stream.next().await {
        if UPDATER_CANCELLED.load(Ordering::Relaxed) {
            drop(file);
            let _ = std::fs::remove_file(&dest_path);
            return Err("Download cancelled by user".to_string());
        }

        let chunk = item.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        let progress = if total_size > 0 {
            (downloaded as f64 / total_size as f64) * 100.0
        } else {
            0.0
        };

        let _ = app_handle.emit(
            "client-update-progress",
            ProgressPayload {
                progress,
                downloaded,
                total: total_size,
            },
        );
    }

    file.flush().map_err(|e| e.to_string())?;
    drop(file);

    if UPDATER_CANCELLED.load(Ordering::Relaxed) {
        let _ = std::fs::remove_file(&dest_path);
        return Err("Download cancelled by user".to_string());
    }

    #[cfg(windows)]
    {
        std::process::Command::new(&dest_path)
            .spawn()
            .map_err(|e| format!("Failed to run installer: {}", e))?;
        app_handle.exit(0);
    }

    #[cfg(all(target_os = "linux", not(target_os = "android")))]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&dest_path, std::fs::Permissions::from_mode(0o755))
            .map_err(|e| format!("Failed to set permissions: {}", e))?;

        // Check if running inside an AppImage environment
        if let Ok(appimage_env) = std::env::var("APPIMAGE") {
            let target_appimage = std::path::PathBuf::from(&appimage_env);
            if target_appimage.exists() && target_appimage != dest_path {
                let backup_path = target_appimage.with_extension("AppImage.old");
                let _ = std::fs::remove_file(&backup_path);

                if std::fs::rename(&target_appimage, &backup_path).is_ok() {
                    if std::fs::copy(&dest_path, &target_appimage).is_ok() {
                        let _ = std::fs::set_permissions(
                            &target_appimage,
                            std::fs::Permissions::from_mode(0o755),
                        );
                        let _ = std::fs::remove_file(&backup_path);
                        let _ = std::fs::remove_file(&dest_path);

                        std::process::Command::new(&target_appimage)
                            .spawn()
                            .map_err(|e| format!("Failed to run updated AppImage: {}", e))?;
                        app_handle.exit(0);
                    } else {
                        // Rollback on copy failure
                        let _ = std::fs::rename(&backup_path, &target_appimage);
                    }
                }
            }
        }

        std::process::Command::new(&dest_path)
            .spawn()
            .map_err(|e| format!("Failed to run AppImage: {}", e))?;
        app_handle.exit(0);
    }

    Ok(())
}

/// Cleanup leftover update files in temp directory from previous update sessions
pub fn cleanup_old_updates() {
    let temp_dir = std::env::temp_dir();
    if let Ok(entries) = std::fs::read_dir(&temp_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                let is_update_file = (file_name.starts_with("tcgtoolws_update")
                    || file_name.starts_with("uclimax_update")
                    || file_name.starts_with("U-CLIMAX"))
                    && (file_name.ends_with(".exe")
                        || file_name.ends_with(".AppImage")
                        || file_name.ends_with(".apk"));

                if is_update_file {
                    let _ = std::fs::remove_file(&path);
                }
            }
        }
    }
}
