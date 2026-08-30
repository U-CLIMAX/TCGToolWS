#[cfg(target_os = "windows")]
pub fn trim_memory() {
    extern "system" {
        fn GetCurrentProcess() -> *mut std::ffi::c_void;
        fn SetProcessWorkingSetSize(h: *mut std::ffi::c_void, min: usize, max: usize) -> i32;
    }
    unsafe {
        SetProcessWorkingSetSize(GetCurrentProcess(), usize::MAX, usize::MAX);
    }
}

#[cfg(all(target_os = "linux", target_env = "gnu"))]
pub fn trim_memory() {
    unsafe {
        libc::malloc_trim(0);
    }
}

#[cfg(not(any(target_os = "windows", all(target_os = "linux", target_env = "gnu"))))]
pub fn trim_memory() {}
