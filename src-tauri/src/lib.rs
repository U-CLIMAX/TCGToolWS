#[cfg(desktop)]
mod platform_mem;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Resized(..) = event {
                if window.is_minimized().unwrap_or(false) {
                    platform_mem::trim_memory();
                }
            }
        });

    #[cfg(target_os = "android")]
    let builder = builder.plugin(tauri_plugin_webview_upgrade::init());

    builder
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
