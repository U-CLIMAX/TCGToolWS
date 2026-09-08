mod image_sync;
#[cfg(desktop)]
mod platform_mem;
mod updater;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            updater::download_and_install_update,
            image_sync::get_default_card_image_dir,
            image_sync::get_local_image_folders,
            image_sync::sync_card_image_package,
            image_sync::cancel_card_image_sync,
            image_sync::reset_card_image_sync_cancel,
            image_sync::delete_card_image_dir,
            image_sync::show_desktop_notification
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Resized(..) = event {
                if window.is_minimized().unwrap_or(false) {
                    platform_mem::trim_memory();
                }
            }
        });

    #[cfg(not(desktop))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        updater::download_and_install_update,
        image_sync::get_default_card_image_dir,
        image_sync::get_local_image_folders,
        image_sync::sync_card_image_package,
        image_sync::cancel_card_image_sync,
        image_sync::reset_card_image_sync_cancel,
        image_sync::delete_card_image_dir
    ]);

    #[cfg(target_os = "android")]
    let builder = builder.plugin(tauri_plugin_webview_upgrade::init());

    builder
        .setup(|app| {
            updater::cleanup_old_updates();

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
