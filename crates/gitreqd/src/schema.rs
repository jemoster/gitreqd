//! GRD-CLI-005: CLI output requirement schema.

use gitreqd_core::{discover_project_root_candidates, load_active_profile, ROOT_MARKER_HINT};
use std::fs;
use std::io::{self, Write};
use std::path::Path;

/// GRD-CLI-005: Supported schema output formats (extensible).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SchemaOutputFormat {
    JsonSchema,
    Yaml,
}

impl SchemaOutputFormat {
    pub fn parse(name: &str) -> Option<Self> {
        match name {
            "json-schema" => Some(Self::JsonSchema),
            "yaml" => Some(Self::Yaml),
            _ => None,
        }
    }
}

/// GRD-CLI-005: Write the effective requirement schema for the project to stdout or a file.
pub fn run_schema(
    project_dir: &Path,
    format: SchemaOutputFormat,
    output_file: Option<&Path>,
) -> Result<bool, String> {
    let candidates = discover_project_root_candidates(project_dir).map_err(|e| e.to_string())?;
    if candidates.is_empty() {
        return Err(format!(
            "No project root found (missing {ROOT_MARKER_HINT}). Run from a directory that contains {ROOT_MARKER_HINT} or use --project-dir."
        ));
    }

    let root = &candidates[0];
    let profile = load_active_profile(root).map_err(|e| e.to_string())?;
    let compose = profile.requirement_schema_compose_options_for_project(root);
    let schema = profile.export_requirement_file_json_schema(compose.as_ref());

    let body = match format {
        SchemaOutputFormat::JsonSchema => {
            let mut s = serde_json::to_string_pretty(&schema).map_err(|e| e.to_string())?;
            s.push('\n');
            s
        }
        SchemaOutputFormat::Yaml => {
            let mut s = serde_yaml::to_string(&schema).map_err(|e| e.to_string())?;
            if !s.ends_with('\n') {
                s.push('\n');
            }
            s
        }
    };

    if let Some(path) = output_file {
        if !path.as_os_str().is_empty() {
            fs::write(path, &body).map_err(|e| e.to_string())?;
            return Ok(true);
        }
    }
    io::stdout()
        .write_all(body.as_bytes())
        .map_err(|e| e.to_string())?;
    Ok(true)
}
