use std::path::PathBuf;

fn repo_file(path: &str) -> String {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let full_path = manifest.join(path);
    std::fs::read_to_string(&full_path)
        .unwrap_or_else(|error| panic!("failed to read {}: {}", full_path.display(), error))
}

#[test]
fn main_window_uses_normal_desktop_lifecycle() {
    let lib = repo_file("src/lib.rs");
    let manager = repo_file("src/window/window_manager.rs");

    assert!(
        lib.contains("Open QuotaShift window"),
        "tray menu must describe opening the normal application window"
    );
    assert!(
        manager.contains("pub fn open_main_window"),
        "normal window lifecycle needs one shared open path"
    );
    assert!(
        manager.contains("window.unminimize()") && manager.contains("window.set_focus()"),
        "opening from tray or second instance must restore and focus the window"
    );
    assert!(
        !lib.contains("PANEL_FOCUS_GUARD_MS") && !lib.contains("should_hide_panel_on_focus_loss"),
        "normal desktop window must not retain tray-panel focus-loss guards"
    );
}

#[test]
fn close_hides_to_tray_and_left_click_does_not_open_native_menu() {
    let lib = repo_file("src/lib.rs");

    assert!(
        lib.contains("WindowEvent::CloseRequested")
            && lib.contains("hide_main_window(&main_app, \"window_close\")"),
        "window close should hide to tray instead of exiting"
    );
    assert!(
        lib.contains(".show_menu_on_left_click(false)"),
        "left-click remains reserved for opening the QuotaShift window; tray menu stays right-click only"
    );
}
