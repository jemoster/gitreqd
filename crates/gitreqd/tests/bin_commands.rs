//! End-to-end binary tests for the essential CLI (GRD-CLI-008).

use std::fs;
use std::path::PathBuf;
use std::process::Command;

fn bin() -> PathBuf {
    PathBuf::from(env!("CARGO_BIN_EXE_gitreqd"))
}

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

#[test]
fn help_lists_essential_commands() {
    let out = Command::new(bin()).arg("--help").output().unwrap();
    assert!(out.status.success());
    let text = String::from_utf8_lossy(&out.stdout);
    assert!(text.contains("validate"));
    assert!(text.contains("html"));
    assert!(text.contains("schema"));
    assert!(text.contains("bootstrap"));
}

#[test]
fn help_lists_format_command() {
    let out = Command::new(bin()).arg("--help").output().unwrap();
    assert!(out.status.success());
    let text = String::from_utf8_lossy(&out.stdout);
    assert!(text.contains("format"));
}

#[test]
fn validate_sample_project_basic() {
    let root = repo_root();
    let out = Command::new(bin())
        .args([
            "validate",
            "--project-dir",
            root.join("sample_projects/basic").to_str().unwrap(),
        ])
        .output()
        .unwrap();
    let stdout = String::from_utf8_lossy(&out.stdout);
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(
        out.status.success(),
        "validate failed: stdout={stdout} stderr={stderr}"
    );
    assert!(stdout.contains("Validated"));
}

#[test]
fn schema_json_stdout_from_sample() {
    let root = repo_root();
    let out = Command::new(bin())
        .args([
            "schema",
            "--project-dir",
            root.join("sample_projects/basic").to_str().unwrap(),
        ])
        .output()
        .unwrap();
    assert!(out.status.success());
    let parsed: serde_json::Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!(parsed["type"], "object");
}

#[test]
fn html_writes_index() {
    let root = repo_root();
    let tmp = std::env::temp_dir().join(format!("gitreqd-bin-html-{}", std::process::id()));
    let _ = fs::remove_dir_all(&tmp);
    fs::create_dir_all(&tmp).unwrap();
    let out = Command::new(bin())
        .args([
            "html",
            "--project-dir",
            root.join("sample_projects/basic").to_str().unwrap(),
            "--output",
            tmp.to_str().unwrap(),
        ])
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let html = fs::read_to_string(tmp.join("index.html")).unwrap();
    assert!(html.contains("<h1>Requirements</h1>"));
    assert!(html.contains("SYS-001") || html.contains("FR-"));
}

#[test]
fn html_dot_output_prints_normalized_path() {
    let root = repo_root();
    let tmp = std::env::temp_dir().join(format!("gitreqd-bin-html-dot-{}", std::process::id()));
    let _ = fs::remove_dir_all(&tmp);
    fs::create_dir_all(&tmp).unwrap();
    let out = Command::new(bin())
        .current_dir(&tmp)
        .args([
            "html",
            "--project-dir",
            root.join("sample_projects/basic").to_str().unwrap(),
            "--output",
            ".",
        ])
        .output()
        .unwrap();
    let stdout = String::from_utf8_lossy(&out.stdout);
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(
        out.status.success(),
        "html failed: stdout={stdout} stderr={stderr}"
    );
    let expected = tmp.join("index.html");
    assert!(
        stdout.contains(&format!("Wrote {}", expected.display())),
        "expected normalized path in stdout, got {stdout}"
    );
    assert!(
        !stdout.contains("/./"),
        "output path should not contain /./, got {stdout}"
    );
}

#[test]
fn validate_this_repository() {
    let root = repo_root();
    let out = Command::new(bin())
        .args(["validate", "--project-dir", root.to_str().unwrap()])
        .output()
        .unwrap();
    let stdout = String::from_utf8_lossy(&out.stdout);
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(
        out.status.success(),
        "validate repo failed: stdout={stdout} stderr={stderr}"
    );
}
