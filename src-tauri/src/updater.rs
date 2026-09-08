use futures_util::StreamExt;
use serde::Serialize;
use std::io::Write;
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    pub progress: f64,
    pub downloaded: u64,
    pub total: u64,
}

#[tauri::command]
pub async fn download_and_install_update(
    app_handle: tauri::AppHandle,
    url: String,
    filename: String,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("TCGToolWS-Client")
        .build()
        .map_err(|e| e.to_string())?;

    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Download failed with status: {}", res.status()));
    }

    let total_size = res.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;

    let temp_dir = std::env::temp_dir();
    let dest_path = temp_dir.join(&filename);
    let mut file = std::fs::File::create(&dest_path).map_err(|e| e.to_string())?;

    let mut stream = res.bytes_stream();
    while let Some(item) = stream.next().await {
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
