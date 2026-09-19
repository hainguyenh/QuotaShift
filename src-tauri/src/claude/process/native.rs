#[cfg(target_os = "windows")]
pub(super) fn set_process_suspended(pid: u32, suspended: bool) -> bool {
    use std::ffi::c_void;

    type Handle = *mut c_void;
    const PROCESS_SUSPEND_RESUME: u32 = 0x0800;

    #[link(name = "kernel32")]
    extern "system" {
        fn OpenProcess(desired_access: u32, inherit_handle: i32, process_id: u32) -> Handle;
        fn CloseHandle(handle: Handle) -> i32;
    }

    #[link(name = "ntdll")]
    extern "system" {
        fn NtSuspendProcess(process_handle: Handle) -> i32;
        fn NtResumeProcess(process_handle: Handle) -> i32;
    }

    unsafe {
        let handle = OpenProcess(PROCESS_SUSPEND_RESUME, 0, pid);
        if handle.is_null() {
            return false;
        }
        let status = if suspended {
            NtSuspendProcess(handle)
        } else {
            NtResumeProcess(handle)
        };
        let _ = CloseHandle(handle);
        status >= 0
    }
}

#[cfg(target_os = "windows")]
pub(super) fn is_process_still_suspended(pid: u32) -> Option<bool> {
    use std::ffi::c_void;
    use std::mem::{size_of, zeroed};

    type Handle = *mut c_void;
    const TH32CS_SNAPTHREAD: u32 = 0x0000_0004;
    const THREAD_QUERY_INFORMATION: u32 = 0x0040;
    const THREAD_SUSPEND_COUNT: i32 = 35;

    #[repr(C)]
    struct ThreadEntry32 {
        size: u32,
        usage_count: u32,
        thread_id: u32,
        owner_process_id: u32,
        base_priority: i32,
        priority_delta: i32,
        flags: u32,
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn CreateToolhelp32Snapshot(flags: u32, process_id: u32) -> Handle;
        fn Thread32First(snapshot: Handle, entry: *mut ThreadEntry32) -> i32;
        fn Thread32Next(snapshot: Handle, entry: *mut ThreadEntry32) -> i32;
        fn OpenThread(desired_access: u32, inherit_handle: i32, thread_id: u32) -> Handle;
        fn CloseHandle(handle: Handle) -> i32;
    }

    #[link(name = "ntdll")]
    extern "system" {
        fn NtQueryInformationThread(
            thread_handle: Handle,
            info_class: i32,
            info: *mut c_void,
            info_length: u32,
            return_length: *mut u32,
        ) -> i32;
    }

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);
        if snapshot == (-1isize as Handle) {
            return None;
        }

        let mut entry: ThreadEntry32 = zeroed();
        entry.size = size_of::<ThreadEntry32>() as u32;
        if Thread32First(snapshot, &mut entry) == 0 {
            let _ = CloseHandle(snapshot);
            return None;
        }

        let mut found = false;
        let mut all_suspended = true;
        loop {
            if entry.owner_process_id == pid {
                found = true;
                let thread = OpenThread(THREAD_QUERY_INFORMATION, 0, entry.thread_id);
                if thread.is_null() {
                    let _ = CloseHandle(snapshot);
                    return None;
                }
                let mut suspend_count = 0u32;
                let status = NtQueryInformationThread(
                    thread,
                    THREAD_SUSPEND_COUNT,
                    (&mut suspend_count as *mut u32).cast(),
                    size_of::<u32>() as u32,
                    std::ptr::null_mut(),
                );
                let _ = CloseHandle(thread);
                if status < 0 {
                    let _ = CloseHandle(snapshot);
                    return None;
                }
                if suspend_count == 0 {
                    all_suspended = false;
                }
            }
            if Thread32Next(snapshot, &mut entry) == 0 {
                break;
            }
        }
        let _ = CloseHandle(snapshot);
        found.then_some(all_suspended)
    }
}

#[cfg(unix)]
pub(super) fn set_process_suspended(pid: u32, suspended: bool) -> bool {
    let signal = if suspended {
        libc::SIGSTOP
    } else {
        libc::SIGCONT
    };
    unsafe { libc::kill(pid as i32, signal) == 0 }
}

#[cfg(unix)]
pub(super) fn is_process_still_suspended(pid: u32) -> Option<bool> {
    use sysinfo::{Pid, ProcessStatus, System};

    let system = System::new_all();
    let status = system.process(Pid::from_u32(pid))?.status();
    Some(matches!(
        status,
        ProcessStatus::Stop | ProcessStatus::Tracing
    ))
}

#[cfg(not(any(target_os = "windows", unix)))]
pub(super) fn set_process_suspended(_pid: u32, _suspended: bool) -> bool {
    false
}

#[cfg(not(any(target_os = "windows", unix)))]
pub(super) fn is_process_still_suspended(_pid: u32) -> Option<bool> {
    None
}
