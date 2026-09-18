//! GRD-SYS-007: allowed requirement file suffixes (longest first so `.req.yaml` matches before `.req.yml`).

pub const REQUIREMENT_FILE_EXTENSIONS: [&str; 2] = [".req.yaml", ".req.yml"];

/// Default suffix for new files (bootstrap).
pub const REQUIREMENT_FILE_EXTENSION: &str = ".req.yml";

pub fn is_requirement_filename(basename: &str) -> bool {
    REQUIREMENT_FILE_EXTENSIONS
        .iter()
        .any(|ext| basename.ends_with(ext))
}

/// Strip the requirement extension; returns None if the basename is not a requirement file.
pub fn requirement_id_from_filename(basename: &str) -> Option<&str> {
    for ext in REQUIREMENT_FILE_EXTENSIONS {
        if let Some(stem) = basename.strip_suffix(ext) {
            return Some(stem);
        }
    }
    None
}

/// For validation error messages.
pub fn requirement_file_extensions_display() -> String {
    REQUIREMENT_FILE_EXTENSIONS.join(" or ")
}

/// Valid basenames for a given id, for error messages.
pub fn expected_requirement_basenames_for_id(id: &str) -> String {
    REQUIREMENT_FILE_EXTENSIONS
        .iter()
        .map(|ext| format!("{id}{ext}"))
        .collect::<Vec<_>>()
        .join(" or ")
}
