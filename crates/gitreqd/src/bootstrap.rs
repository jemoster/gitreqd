//! GRD-CLI-004: CLI bootstrap project – initialize a directory with gitreqd.yaml and requirements folder.

use gitreqd_core::{find_root_marker_path, ROOT_MARKER};
use std::fs;
use std::path::{Path, PathBuf};

const DEFAULT_REQUIREMENT_DIR: &str = "requirements";
const MINIMAL_ROOT_CONTENT: &str = "requirement_dirs:\n  - requirements\n";

const CURSOR_RULES_REQUIREMENTS_MD: &str =
    include_str!("../templates/.cursor/rules/requirements.md");

#[derive(Debug, Clone, Default)]
pub struct BootstrapOptions {
    /// When true, overwrite existing gitreqd.yaml and do not fail if requirements dir exists.
    pub force: bool,
    /// When true, copy .cursor rules into target/.cursor/rules.
    pub cursor_rules: bool,
}

#[derive(Debug, Clone)]
pub struct BootstrapResult {
    pub success: bool,
    /// Paths created or updated (for messaging).
    pub created: Vec<PathBuf>,
    pub error: Option<String>,
}

/// GRD-CLI-004: Bootstrap a directory with gitreqd.yaml and a requirements folder.
/// Optionally add .cursor rules. With force, overwrites gitreqd.yaml and skips creating requirements if it exists.
pub fn run_bootstrap(target_dir: &Path, options: BootstrapOptions) -> BootstrapResult {
    let resolved_dir = if target_dir.is_absolute() {
        target_dir.to_path_buf()
    } else {
        match std::env::current_dir() {
            Ok(cwd) => cwd.join(target_dir),
            Err(err) => {
                return BootstrapResult {
                    success: false,
                    created: Vec::new(),
                    error: Some(err.to_string()),
                };
            }
        }
    };

    let mut created = Vec::new();

    if !resolved_dir.exists() {
        return BootstrapResult {
            success: false,
            created: Vec::new(),
            error: Some(format!(
                "Target directory does not exist: {}",
                resolved_dir.display()
            )),
        };
    }

    if !resolved_dir.is_dir() {
        return BootstrapResult {
            success: false,
            created: Vec::new(),
            error: Some(format!("Not a directory: {}", resolved_dir.display())),
        };
    }

    let existing_marker = find_root_marker_path(&resolved_dir);
    let root_marker_path = resolved_dir.join(ROOT_MARKER);
    let requirements_path = resolved_dir.join(DEFAULT_REQUIREMENT_DIR);

    if existing_marker.is_some() && !options.force {
        return BootstrapResult {
            success: false,
            created: Vec::new(),
            error: Some(format!(
                "Project root file already exists: {}. Use --force to overwrite.",
                existing_marker.unwrap().display()
            )),
        };
    }

    if requirements_path.exists() && !requirements_path.is_dir() {
        return BootstrapResult {
            success: false,
            created: Vec::new(),
            error: Some(format!(
                "Path exists and is not a directory: {}.",
                requirements_path.display()
            )),
        };
    }

    if let Err(err) = fs::write(&root_marker_path, MINIMAL_ROOT_CONTENT) {
        return BootstrapResult {
            success: false,
            created,
            error: Some(format!("Failed to write {ROOT_MARKER}: {err}")),
        };
    }
    created.push(root_marker_path);

    if !requirements_path.exists() {
        if let Err(err) = fs::create_dir_all(&requirements_path) {
            return BootstrapResult {
                success: false,
                created,
                error: Some(format!("Failed to create requirements folder: {err}")),
            };
        }
        created.push(requirements_path);
    }

    if options.cursor_rules {
        let dest_dir = resolved_dir.join(".cursor/rules");
        if let Err(err) = fs::create_dir_all(&dest_dir) {
            return BootstrapResult {
                success: false,
                created,
                error: Some(format!("Failed to create .cursor/rules: {err}")),
            };
        }
        let dest = dest_dir.join("requirements.md");
        if let Err(err) = fs::write(&dest, CURSOR_RULES_REQUIREMENTS_MD) {
            return BootstrapResult {
                success: false,
                created,
                error: Some(format!("Failed to write cursor rules: {err}")),
            };
        }
        created.push(dest);
    }

    BootstrapResult {
        success: true,
        created,
        error: None,
    }
}
