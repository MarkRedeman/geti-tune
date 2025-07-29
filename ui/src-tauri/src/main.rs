// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    env,
    io::{BufRead, BufReader},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
};
use tauri::RunEvent;

/// “python_backend.exe” on Windows, “python_backend” elsewhere.
fn backend_filename() -> &'static str {
    if cfg!(windows) {
        "python_backend.exe"
    } else {
        "python_backend"
    }
}

/// Spawns the side-car in the same folder as this executable.
fn spawn_backend() -> std::io::Result<Child> {
    // Locate the Tauri executable, then its parent folder
    let exe_path = env::current_exe().expect("failed to get current exe path");
    let exe_dir = exe_path
        .parent()
        .expect("failed to get parent directory of exe");

    // Build the full path to python_backend[-<triple>].exe
    // Tauri build will have renamed the suffixed file to plain name next to the exe.
    let backend_path = exe_dir.join(backend_filename());

    println!("▶ looking for side-car at {:?}", backend_path);
    let mut child = Command::new(&backend_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    // Pipe stdout
    if let Some(out) = child.stdout.take() {
        thread::spawn(move || {
            for line in BufReader::new(out).lines().flatten() {
                println!("[backend] {line}");
            }
        });
    }
    // Pipe stderr
    if let Some(err) = child.stderr.take() {
        thread::spawn(move || {
            for line in BufReader::new(err).lines().flatten() {
                eprintln!("[backend-err] {line}");
            }
        });
    }

    println!("▶ spawned backend: {:?}", backend_path);
    Ok(child)
}

fn main() {
    // Shared handle so we can kill it on exit
    let child_handle = Arc::new(Mutex::new(None));

    // Build the app
    let app = tauri::Builder::default()
        .setup({
            let child_handle = child_handle.clone();
            move |_app_handle| {
                let child = spawn_backend().expect("failed to spawn python backend");
                *child_handle.lock().unwrap() = Some(child);
                Ok(())
            }
        })
        //.invoke_handler(tauri::generate_handler![demo_todo_ru_py_lib::py_api])
        .build(tauri::generate_context!())
        .expect("error building Tauri");

    // Run and on Exit make sure to kill the backend
    let exit_handle = child_handle.clone();
    app.run(move |_app_handle, event| {
        if let RunEvent::Exit = event {
            if let Some(mut child) = exit_handle.lock().unwrap().take() {
                let _ = child.kill();
                println!("⛔ backend terminated");
            }
        }
    });
    //app_lib::run();
}

// use tauri_plugin_shell::ShellExt;
// use tauri_plugin_shell::process::CommandEvent;

// let sidecar_command = app.shell().sidecar("my-sidecar").unwrap();
// let (mut rx, mut _child) = sidecar_command
//   .spawn()
//   .expect("Failed to spawn sidecar");

// tauri::async_runtime::spawn(async move {
//   // read events such as stdout
//   while let Some(event) = rx.recv().await {
//     if let CommandEvent::Stdout(line_bytes) = event {
//       let line = String::from_utf8_lossy(&line_bytes);
//       window
//         .emit("message", Some(format!("'{}'", line)))
//         .expect("failed to emit event");
//       // write to stdin
//       child.write("message from Rust\n".as_bytes()).unwrap();
//     }
//   }
// });
