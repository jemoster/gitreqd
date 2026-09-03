//! CLI tests for GRD-CLI-004 / GRD-CLI-005 / GRD-CLI-001 / GRD-CLI-002.

extern crate gitreqd_macros as gitreqd;

use gitreqd_cli::{
    run_bootstrap, run_html, run_schema, run_validate, BootstrapOptions, SchemaOutputFormat,
};
use gitreqd_core::ROOT_MARKER;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn temp_dir() -> PathBuf {
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    let dir = std::env::temp_dir().join(format!("gitreqd-cli-{n}-{}", std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn bootstrap_creates_marker_and_requirements() {
    let tmp = temp_dir();
    let result = run_bootstrap(&tmp, BootstrapOptions::default());
    assert!(result.success, "{:?}", result.error);
    assert!(result.created.iter().any(|p| p.ends_with(ROOT_MARKER)));
    assert!(result.created.iter().any(|p| p.ends_with("requirements")));
    let content = fs::read_to_string(tmp.join(ROOT_MARKER)).unwrap();
    assert!(content.contains("requirement_dirs:"));
    assert!(content.contains("- requirements"));
    assert!(tmp.join("requirements").is_dir());
}

#[test]
fn bootstrap_fails_when_marker_exists() {
    let tmp = temp_dir();
    fs::write(tmp.join(ROOT_MARKER), "requirement_dirs:\n  - x\n").unwrap();
    let result = run_bootstrap(&tmp, BootstrapOptions::default());
    assert!(!result.success);
    assert!(result.error.unwrap().contains("already exists"));
}

#[test]
fn bootstrap_fails_when_yml_marker_exists() {
    let tmp = temp_dir();
    fs::write(tmp.join("gitreqd.yml"), "requirement_dirs:\n  - x\n").unwrap();
    let result = run_bootstrap(&tmp, BootstrapOptions::default());
    assert!(!result.success);
    assert!(result.error.unwrap().contains("already exists"));
}

#[test]
fn bootstrap_force_overwrites() {
    let tmp = temp_dir();
    fs::write(tmp.join(ROOT_MARKER), "requirement_dirs:\n  - other\n").unwrap();
    let result = run_bootstrap(
        &tmp,
        BootstrapOptions {
            force: true,
            cursor_rules: false,
        },
    );
    assert!(result.success);
    let content = fs::read_to_string(tmp.join(ROOT_MARKER)).unwrap();
    assert!(content.contains("- requirements"));
}

#[test]
fn bootstrap_ok_when_requirements_exists() {
    let tmp = temp_dir();
    fs::create_dir_all(tmp.join("requirements")).unwrap();
    let result = run_bootstrap(&tmp, BootstrapOptions::default());
    assert!(result.success);
}

#[test]
fn bootstrap_fails_when_not_directory() {
    let tmp = temp_dir();
    let file = tmp.join("file");
    fs::write(&file, "").unwrap();
    let result = run_bootstrap(&file, BootstrapOptions::default());
    assert!(!result.success);
    assert!(result.error.unwrap().contains("Not a directory"));
}

#[test]
fn bootstrap_fails_when_missing() {
    let tmp = temp_dir();
    let missing = tmp.join("missing");
    let result = run_bootstrap(&missing, BootstrapOptions::default());
    assert!(!result.success);
    assert!(result.error.unwrap().contains("does not exist"));
}

#[test]
fn bootstrap_cursor_rules() {
    let tmp = temp_dir();
    let result = run_bootstrap(
        &tmp,
        BootstrapOptions {
            force: false,
            cursor_rules: true,
        },
    );
    assert!(result.success);
    let rules = tmp.join(".cursor/rules/requirements.md");
    assert!(rules.is_file());
    let content = fs::read_to_string(rules).unwrap();
    assert!(content.contains("Requirements"));
}

#[test]
fn schema_json_and_yaml() {
    let tmp = temp_dir();
    fs::write(
        tmp.join(ROOT_MARKER),
        "requirement_dirs:\n  - requirements\n",
    )
    .unwrap();
    fs::create_dir_all(tmp.join("requirements")).unwrap();
    let out = tmp.join("schema.json");
    let ok = run_schema(&tmp, SchemaOutputFormat::JsonSchema, Some(&out)).unwrap();
    assert!(ok);
    let parsed: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&out).unwrap()).unwrap();
    assert_eq!(parsed["type"], "object");
    let required = parsed["required"].as_array().unwrap();
    assert!(required.iter().any(|v| v == "id"));
    assert!(required.iter().any(|v| v == "title"));

    let yaml_out = tmp.join("schema.yaml");
    let ok = run_schema(&tmp, SchemaOutputFormat::Yaml, Some(&yaml_out)).unwrap();
    assert!(ok);
    let raw = fs::read_to_string(&yaml_out).unwrap();
    assert!(raw.contains("type:"));
}

#[test]
fn schema_fails_without_root() {
    let tmp = temp_dir();
    let err = run_schema(&tmp, SchemaOutputFormat::JsonSchema, None).unwrap_err();
    assert!(err.contains("No project root found"));
}

#[test]
fn validate_and_html_on_temp_project() {
    let tmp = temp_dir();
    fs::write(
        tmp.join(ROOT_MARKER),
        "requirement_dirs:\n  - requirements\n",
    )
    .unwrap();
    let reqs = tmp.join("requirements");
    fs::create_dir_all(&reqs).unwrap();
    fs::write(
        reqs.join("DEMO-001.req.yml"),
        "id: DEMO-001\ntitle: Demo\nrequire: The system shall demonstrate validation.\n",
    )
    .unwrap();

    assert!(run_validate(&tmp).unwrap());

    let out = tmp.join("html-out");
    assert!(run_html(&tmp, &out).unwrap());
    let html = fs::read_to_string(out.join("index.html")).unwrap();
    assert!(html.contains("DEMO-001"));
    assert!(html.contains("Requirements"));
}

#[gitreqd::verifies("GRD-HTML-007")]
#[test]
fn html_presents_source_links_from_rust_attributes() {
    let tmp = temp_dir();
    fs::write(
        tmp.join(ROOT_MARKER),
        "requirement_dirs:\n  - requirements\n",
    )
    .unwrap();
    let reqs = tmp.join("requirements");
    fs::create_dir_all(&reqs).unwrap();
    fs::write(
        reqs.join("DEMO-001.req.yml"),
        "id: DEMO-001\ntitle: Demo\nrequire: The system shall demonstrate validation.\n",
    )
    .unwrap();
    let src = tmp.join("src");
    fs::create_dir_all(&src).unwrap();
    fs::write(
        src.join("lib.rs"),
        r#"#[gitreqd::implements("DEMO-001")]
fn demo() {}

#[gitreqd::verifies("DEMO-001")]
#[test]
fn checks_demo() {}
"#,
    )
    .unwrap();

    let out = tmp.join("html-out");
    assert!(run_html(&tmp, &out).unwrap());
    let html = fs::read_to_string(out.join("index.html")).unwrap();
    let start = html.find("id=\"DEMO-001\"").unwrap();
    let end = html[start..].find("</section>").unwrap() + start;
    let detail = &html[start..end];
    assert!(detail.contains("Implemented by"));
    assert!(detail.contains("<code>src/lib.rs</code>"));
    assert!(detail.contains("function"));
    assert!(detail.contains("Verified by"));
    assert!(detail.contains("test"));
}
