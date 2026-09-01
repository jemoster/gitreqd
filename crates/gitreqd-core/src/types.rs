//! Core types for gitreqd requirement documents (GRD-SYS-001).

use std::collections::BTreeMap;
use std::path::PathBuf;

/// GRD-SYS-005: Parameter value type (string, number, or boolean).
#[derive(Debug, Clone, PartialEq)]
pub enum ParameterValue {
    String(String),
    Integer(i64),
    Float(f64),
    Bool(bool),
}

impl ParameterValue {
    pub fn as_display_string(&self) -> String {
        match self {
            ParameterValue::String(s) => s.clone(),
            ParameterValue::Integer(n) => n.to_string(),
            ParameterValue::Float(n) => {
                if n.fract() == 0.0 && n.is_finite() {
                    format!("{}", *n as i64)
                } else {
                    n.to_string()
                }
            }
            ParameterValue::Bool(b) => {
                if *b {
                    "true".to_string()
                } else {
                    "false".to_string()
                }
            }
        }
    }
}

/// Link object on a requirement (e.g. `satisfies`). GRD-SYS-001.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct Link {
    pub satisfies: Option<String>,
    /// Additional link keys (e.g. `refines`) mapped to JSON values.
    pub extra: BTreeMap<String, serde_json::Value>,
}

impl Link {
    /// All string-valued link targets (satisfies plus extra string fields).
    pub fn string_targets(&self) -> Vec<String> {
        let mut targets = Vec::new();
        if let Some(id) = &self.satisfies {
            if !id.is_empty() {
                targets.push(id.clone());
            }
        }
        for (key, value) in &self.extra {
            if key == "satisfies" {
                continue;
            }
            if let Some(s) = value.as_str() {
                if !s.is_empty() {
                    targets.push(s.to_string());
                }
            }
        }
        targets
    }
}

/// GRD-SYS-016: Reference to an implementation or verification artifact (path or URL).
#[derive(Debug, Clone, PartialEq)]
pub struct ArtifactRef {
    pub artifact: String,
    pub description: Option<String>,
}

/// Requirement shape for YAML files. Runtime validation is enforced by the schema
/// in `schema` (GRD-SYS-009); this struct is the Rust contract.
#[derive(Debug, Clone, PartialEq)]
pub struct Requirement {
    pub id: String,
    pub title: String,
    /// Single normative Shall/Should/May statement for this requirement ID.
    pub require: String,
    /// Supporting prose (Markdown in HTML reports).
    pub refinement: String,
    pub attributes: Option<BTreeMap<String, serde_json::Value>>,
    pub links: Option<Vec<Link>>,
    /// GRD-SYS-016: Artifacts that implement or satisfy this requirement.
    pub satisfied_by: Option<Vec<ArtifactRef>>,
    /// GRD-SYS-016: Artifacts that verify this requirement was met.
    pub verified_by: Option<Vec<ArtifactRef>>,
    /// GRD-SYS-005: Named parameters for templating in text fields.
    pub parameters: Option<BTreeMap<String, ParameterValue>>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct RequirementWithSource {
    pub id: String,
    pub title: String,
    pub require: String,
    pub refinement: String,
    pub attributes: Option<BTreeMap<String, serde_json::Value>>,
    pub links: Option<Vec<Link>>,
    pub satisfied_by: Option<Vec<ArtifactRef>>,
    pub verified_by: Option<Vec<ArtifactRef>>,
    pub parameters: Option<BTreeMap<String, ParameterValue>>,
    /// Path to the YAML file this requirement was loaded from.
    pub source_path: PathBuf,
    /// GRD-SYS-004: Path segments from the requirement_dir that contains this file
    /// to the file's directory (relative). Empty = file is directly under a requirement_dir.
    pub category_path: Option<Vec<String>>,
}

impl RequirementWithSource {
    pub fn from_requirement(req: Requirement, source_path: PathBuf) -> Self {
        Self {
            id: req.id,
            title: req.title,
            require: req.require,
            refinement: req.refinement,
            attributes: req.attributes,
            links: req.links,
            satisfied_by: req.satisfied_by,
            verified_by: req.verified_by,
            parameters: req.parameters,
            source_path,
            category_path: None,
        }
    }
}

pub struct ProjectInfo {
    /// Absolute path to the project root (directory containing gitreqd.yaml or gitreqd.yml).
    pub root_dir: PathBuf,
    /// Absolute paths to requirement YAML files under the project.
    pub requirement_paths: Vec<PathBuf>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ValidationError {
    pub path: String,
    pub message: String,
    pub line: Option<usize>,
}

impl ValidationError {
    pub fn new(path: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            path: path.into(),
            message: message.into(),
            line: None,
        }
    }

    pub fn with_line(path: impl Into<String>, message: impl Into<String>, line: usize) -> Self {
        Self {
            path: path.into(),
            message: message.into(),
            line: Some(line),
        }
    }
}

pub struct LoadResult {
    pub requirements: Vec<RequirementWithSource>,
    pub errors: Vec<ValidationError>,
}

/// Optional inputs when the JSON Schema must reflect project runtime configuration (GRD-SYS-009).
/// Profiles (GRD-SYS-010) pass compose options from project configuration into schema export.
#[derive(Debug, Clone, Default)]
pub struct RequirementSchemaComposeOptions {}
