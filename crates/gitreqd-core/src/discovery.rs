//! GRD-SYS-003 / GRD-SYS-007 / GRD-CLI-003: Project root discovery and requirement file discovery.

use std::collections::BTreeSet;
use std::fs;
use std::path::{Component, Path, PathBuf};

use serde_yaml::Value;
use walkdir::WalkDir;

use crate::error::{DiscoverResult, Error};
use crate::requirement_files::REQUIREMENT_FILE_EXTENSIONS;

/// GRD-SYS-007: primary project root marker filename (bootstrap writes this name).
pub const ROOT_MARKER: &str = "gitreqd.yaml";

/// GRD-SYS-007: accepted project root marker filenames (first wins when reading if several exist).
pub const ROOT_MARKER_FILENAMES: [&str; 2] = ["gitreqd.yaml", "gitreqd.yml"];

/// User-facing hint when no marker is found.
pub const ROOT_MARKER_HINT: &str = "gitreqd.yaml or gitreqd.yml";

/// Absolute path to the project root marker file under `project_root`, or None if none exist.
/// GRD-SYS-007: prefers `gitreqd.yaml` over `gitreqd.yml` when both exist.
pub fn find_root_marker_path(project_root: &Path) -> Option<PathBuf> {
    for name in ROOT_MARKER_FILENAMES {
        let p = project_root.join(name);
        if p.is_file() {
            return Some(p);
        }
    }
    None
}

/// Collapse `.` and `..` lexically without touching the filesystem.
/// Matches Node `path.resolve` collapsing for joined relative segments such as `.`.
pub fn normalize_path(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for c in path.components() {
        match c {
            Component::CurDir => {}
            Component::ParentDir => {
                out.pop();
            }
            other => out.push(other.as_os_str()),
        }
    }
    out
}

/// Find the candidate project root by starting at `start_dir` and walking up the directory structure.
///
/// Returns an array with zero or one absolute directory paths. Empty if none.
pub fn discover_project_root_candidates(start_dir: &Path) -> Result<Vec<PathBuf>, Error> {
    let resolved = if start_dir.is_absolute() {
        start_dir.to_path_buf()
    } else {
        std::env::current_dir()?.join(start_dir)
    };
    let resolved = normalize_path(&resolved);

    let mut current = if resolved.is_file() {
        resolved.parent().map(Path::to_path_buf).unwrap_or(resolved)
    } else {
        resolved
    };

    loop {
        if find_root_marker_path(&current).is_some() {
            return Ok(vec![current]);
        }
        match current.parent() {
            Some(parent) if parent != current => {
                current = parent.to_path_buf();
            }
            _ => return Ok(Vec::new()),
        }
    }
}

/// Find the project root by searching from `start_dir` and walking up until the first
/// directory containing a root marker is found. Returns that root, or None if none is found.
pub fn discover_project_root(start_dir: &Path) -> Result<Option<PathBuf>, Error> {
    let candidates = discover_project_root_candidates(start_dir)?;
    Ok(if candidates.len() == 1 {
        Some(candidates.into_iter().next().unwrap())
    } else {
        None
    })
}

fn marker_label(root_path: &Path) -> String {
    root_path
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| ROOT_MARKER.to_string())
}

/// Read the project root marker under `project_root` and return the configured
/// requirement directories, as absolute paths. The file must follow GRD-SYS-007.
pub fn get_requirement_dirs(project_root: &Path) -> Result<Vec<PathBuf>, Error> {
    let project_root = normalize_path(&if project_root.is_absolute() {
        project_root.to_path_buf()
    } else {
        std::env::current_dir()?.join(project_root)
    });

    let root_path = find_root_marker_path(&project_root).ok_or_else(|| {
        Error::msg(format!(
            "Failed to find {ROOT_MARKER_HINT} under {}",
            project_root.display()
        ))
    })?;
    let marker_label = marker_label(&root_path);

    let raw = fs::read_to_string(&root_path).map_err(|err| {
        Error::msg(format!(
            "Failed to read {marker_label} at {}: {err}",
            root_path.display()
        ))
    })?;

    let data: Value = serde_yaml::from_str(&raw).map_err(|err| {
        Error::msg(format!(
            "Failed to parse {marker_label} at {}: {err}",
            root_path.display()
        ))
    })?;

    let obj = match &data {
        Value::Mapping(m) => m,
        _ => {
            return Err(Error::msg(format!(
                "Invalid {marker_label} at {}: expected a mapping at top level",
                root_path.display()
            )));
        }
    };

    let dirs = obj
        .get(Value::String("requirement_dirs".to_string()))
        .ok_or_else(|| {
            Error::msg(format!(
                "Invalid {marker_label} at {}: \"requirement_dirs\" must be a sequence",
                root_path.display()
            ))
        })?;

    let seq = match dirs {
        Value::Sequence(s) => s,
        _ => {
            return Err(Error::msg(format!(
                "Invalid {marker_label} at {}: \"requirement_dirs\" must be a sequence",
                root_path.display()
            )));
        }
    };

    let mut resolved_dirs: Vec<PathBuf> = Vec::new();
    let mut seen = BTreeSet::new();

    for raw_value in seq {
        let trimmed = match raw_value {
            Value::String(s) => s.trim().to_string(),
            _ => {
                return Err(Error::msg(format!(
                    "Invalid {marker_label} at {}: each \"requirement_dirs\" entry must be a non-empty string",
                    root_path.display()
                )));
            }
        };
        if trimmed.is_empty() {
            return Err(Error::msg(format!(
                "Invalid {marker_label} at {}: each \"requirement_dirs\" entry must be a non-empty string",
                root_path.display()
            )));
        }
        let abs = normalize_path(&project_root.join(&trimmed));
        if !seen.insert(abs.clone()) {
            return Err(Error::msg(format!(
                "Invalid {marker_label} at {}: duplicate \"requirement_dirs\" entry after resolving paths: {}",
                root_path.display(),
                abs.display()
            )));
        }
        resolved_dirs.push(abs);
    }

    Ok(resolved_dirs)
}

fn path_contains_node_modules(path: &Path) -> bool {
    path.components().any(|c| c.as_os_str() == "node_modules")
}

/// Discover all requirement files under the directories configured in the project root marker.
/// GRD-SYS-007: `*.req.yml` and `*.req.yaml`. Excludes node_modules.
/// GRD-SYS-007: a `requirement_dirs` entry of exactly `.` resolves to the project root and is searched recursively.
pub fn discover_requirement_paths(project_root: &Path) -> Result<Vec<PathBuf>, Error> {
    let cwd = normalize_path(&if project_root.is_absolute() {
        project_root.to_path_buf()
    } else {
        std::env::current_dir()?.join(project_root)
    });
    let requirement_dirs = get_requirement_dirs(&cwd)?;
    if requirement_dirs.is_empty() {
        return Ok(Vec::new());
    }

    let mut matches = BTreeSet::new();
    for dir in requirement_dirs {
        if !dir.is_dir() {
            continue;
        }
        let walker = WalkDir::new(&dir)
            .follow_links(false)
            .into_iter()
            .filter_entry(|e| e.file_name() != "node_modules");
        for entry in walker {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };
            if !entry.file_type().is_file() {
                continue;
            }
            if path_contains_node_modules(entry.path()) {
                continue;
            }
            let name = entry.file_name().to_string_lossy();
            if REQUIREMENT_FILE_EXTENSIONS
                .iter()
                .any(|ext| name.ends_with(ext))
            {
                matches.insert(normalize_path(entry.path()));
            }
        }
    }

    Ok(matches.into_iter().collect())
}

/// Discover project root from `start_dir` (walking up) and all requirement
/// file paths under it. Errors if no project root is found.
pub fn discover_project(start_dir: &Path) -> Result<DiscoverResult, Error> {
    let candidates = discover_project_root_candidates(start_dir)?;
    if candidates.is_empty() {
        let resolved = if start_dir.is_absolute() {
            start_dir.to_path_buf()
        } else {
            std::env::current_dir()?.join(start_dir)
        };
        return Err(Error::msg(format!(
            "No project root found (missing {ROOT_MARKER_HINT}) from: {}",
            normalize_path(&resolved).display()
        )));
    }
    let root_dir = candidates.into_iter().next().unwrap();
    let requirement_paths = discover_requirement_paths(&root_dir)?;
    Ok(DiscoverResult {
        root_dir,
        requirement_paths,
    })
}

/// Parse the project root marker as a YAML mapping, if present and valid.
pub fn read_root_marker_mapping(project_root: &Path) -> Option<(PathBuf, serde_yaml::Mapping)> {
    let root_path = find_root_marker_path(project_root)?;
    let raw = fs::read_to_string(&root_path).ok()?;
    let data: Value = serde_yaml::from_str(&raw).ok()?;
    match data {
        Value::Mapping(m) => Some((root_path, m)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static COUNTER: AtomicU64 = AtomicU64::new(0);

    fn temp_dir() -> PathBuf {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!("gitreqd-disc-{n}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn normalize_path_drops_dot_segments() {
        assert_eq!(
            normalize_path(Path::new("/workspace/./index.html")),
            PathBuf::from("/workspace/index.html")
        );
        assert_eq!(
            normalize_path(Path::new("/workspace/.")),
            PathBuf::from("/workspace")
        );
    }

    #[test]
    fn empty_when_no_marker() {
        let tmp = temp_dir();
        let sub = tmp.join("a/b/c");
        fs::create_dir_all(&sub).unwrap();
        let candidates = discover_project_root_candidates(&sub).unwrap();
        assert!(candidates.is_empty());
        assert!(discover_project_root(&sub).unwrap().is_none());
    }

    #[test]
    fn finds_root_at_start_dir() {
        let tmp = temp_dir();
        fs::write(tmp.join(ROOT_MARKER), "requirement_dirs:\n  - reqs\n").unwrap();
        let candidates = discover_project_root_candidates(&tmp).unwrap();
        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0], normalize_path(&tmp));
        assert_eq!(
            discover_project_root(&tmp).unwrap().unwrap(),
            normalize_path(&tmp)
        );
    }

    #[test]
    fn finds_root_walking_up() {
        let tmp = temp_dir();
        let project = tmp.join("project");
        let sub = project.join("src/deep");
        fs::create_dir_all(&sub).unwrap();
        fs::write(
            project.join(ROOT_MARKER),
            "requirement_dirs:\n  - requirements\n",
        )
        .unwrap();
        let candidates = discover_project_root_candidates(&sub).unwrap();
        assert_eq!(candidates[0], normalize_path(&project));
    }

    #[test]
    fn nearest_root_wins() {
        let tmp = temp_dir();
        let inner = tmp.join("outer/inner/leaf");
        fs::create_dir_all(&inner).unwrap();
        fs::write(
            tmp.join("outer").join(ROOT_MARKER),
            "requirement_dirs:\n  - a\n",
        )
        .unwrap();
        fs::write(
            tmp.join("outer/inner").join(ROOT_MARKER),
            "requirement_dirs:\n  - b\n",
        )
        .unwrap();
        let candidates = discover_project_root_candidates(&inner).unwrap();
        assert_eq!(candidates[0], normalize_path(&tmp.join("outer/inner")));
    }

    #[test]
    fn finds_yml_marker() {
        let tmp = temp_dir();
        fs::write(tmp.join("gitreqd.yml"), "requirement_dirs:\n  - reqs\n").unwrap();
        let candidates = discover_project_root_candidates(&tmp).unwrap();
        assert_eq!(candidates.len(), 1);
    }

    #[test]
    fn requirement_dirs_and_extensions() {
        let tmp = temp_dir();
        let a = tmp.join("reqs-a");
        let b = tmp.join("reqs-b");
        fs::create_dir_all(&a).unwrap();
        fs::create_dir_all(&b).unwrap();
        fs::write(
            a.join("one.req.yml"),
            "id: TEST-A\ntitle: A\nrequire: The system shall test.\n",
        )
        .unwrap();
        fs::write(
            b.join("two.req.yml"),
            "id: TEST-B\ntitle: B\nrequire: The system shall test.\n",
        )
        .unwrap();
        fs::write(
            tmp.join(ROOT_MARKER),
            "requirement_dirs:\n  - reqs-a\n  - reqs-b\n",
        )
        .unwrap();
        let paths = discover_requirement_paths(&tmp).unwrap();
        assert_eq!(paths.len(), 2);

        let reqs = tmp.join("reqs");
        fs::create_dir_all(&reqs).unwrap();
        fs::write(
            reqs.join("A.req.yml"),
            "id: A\ntitle: A\nrequire: The system shall test.\n",
        )
        .unwrap();
        fs::write(
            reqs.join("B.req.yaml"),
            "id: B\ntitle: B\nrequire: The system shall test.\n",
        )
        .unwrap();
        fs::write(tmp.join(ROOT_MARKER), "requirement_dirs:\n  - reqs\n").unwrap();
        let paths = discover_requirement_paths(&tmp).unwrap();
        assert_eq!(paths.len(), 2);
    }

    #[test]
    fn dot_entry_is_recursive_root() {
        let tmp = temp_dir();
        let nested = tmp.join("deep/nested");
        fs::create_dir_all(&nested).unwrap();
        fs::write(
            tmp.join("at-root.req.yml"),
            "id: ROOT\ntitle: t\nrequire: The system shall test.\n",
        )
        .unwrap();
        fs::write(
            nested.join("deep.req.yml"),
            "id: DEEP\ntitle: t\nrequire: The system shall test.\n",
        )
        .unwrap();
        fs::write(tmp.join(ROOT_MARKER), "requirement_dirs:\n  - .\n").unwrap();
        let paths = discover_requirement_paths(&tmp).unwrap();
        assert_eq!(paths.len(), 2);
    }

    #[test]
    fn mapping_and_sequence_errors() {
        let tmp = temp_dir();
        fs::write(tmp.join(ROOT_MARKER), "- not a mapping\n").unwrap();
        let err = get_requirement_dirs(&tmp).unwrap_err().to_string();
        assert!(err.contains("expected a mapping at top level"));

        fs::write(tmp.join(ROOT_MARKER), "requirement_dirs: reqs\n").unwrap();
        let err = get_requirement_dirs(&tmp).unwrap_err().to_string();
        assert!(err.contains("\"requirement_dirs\" must be a sequence"));
    }

    #[test]
    fn duplicate_dirs_error() {
        let tmp = temp_dir();
        fs::write(
            tmp.join(ROOT_MARKER),
            "requirement_dirs:\n  - reqs\n  - ./reqs\n",
        )
        .unwrap();
        let err = discover_requirement_paths(&tmp).unwrap_err().to_string();
        assert!(err.contains("duplicate \"requirement_dirs\" entry after resolving paths"));
    }
}
