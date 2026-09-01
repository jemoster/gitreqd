//! GRD-CLI-005 / GRD-SYS-009: Build compose options for the requirement JSON Schema from the
//! project root marker, when configuration affects the exported schema.

use std::path::Path;

use crate::discovery::find_root_marker_path;
use crate::types::RequirementSchemaComposeOptions;

/// Currently reserved: project marker is read so future fields can map into compose options.
pub fn requirement_schema_compose_options_for_project(
    project_root: &Path,
) -> Option<RequirementSchemaComposeOptions> {
    let marker = find_root_marker_path(project_root)?;
    let _raw = std::fs::read_to_string(marker).ok()?;
    // Future: map gitreqd.yaml fields into RequirementSchemaComposeOptions when schema composition uses them.
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering};

    static COUNTER: AtomicU64 = AtomicU64::new(0);

    fn temp_dir() -> std::path::PathBuf {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!("gitreqd-compose-{n}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn returns_none_without_marker() {
        let dir = temp_dir();
        assert!(requirement_schema_compose_options_for_project(&dir).is_none());
    }

    #[test]
    fn does_not_throw_when_marker_exists() {
        let dir = temp_dir();
        fs::write(
            dir.join("gitreqd.yaml"),
            "requirement_dirs:\n  - requirements\n",
        )
        .unwrap();
        let _ = requirement_schema_compose_options_for_project(&dir);
    }
}
