//! GRD-SYS-001 / GRD-SYS-009: Parse requirement YAML from content or disk.

use std::fs;
use std::path::Path;

use serde_yaml::Value;

use crate::schema::parse_requirement_value;
use crate::types::{RequirementWithSource, ValidationError};

/// Parse YAML object data into a requirement (GRD-SYS-010).
pub fn parse_requirement_data(
    data: &Value,
    file_path: &Path,
) -> Result<RequirementWithSource, ValidationError> {
    match parse_requirement_value(data) {
        Ok(req) => Ok(RequirementWithSource::from_requirement(
            req,
            file_path.to_path_buf(),
        )),
        Err(message) => Err(ValidationError::new(
            file_path.display().to_string(),
            message,
        )),
    }
}

/// Parse requirement YAML from a content string (GRD-SYS-010 profiles).
pub fn parse_requirement_content(
    content: &str,
    file_path: &Path,
) -> Result<RequirementWithSource, ValidationError> {
    let data: Value = match serde_yaml::from_str(content) {
        Ok(v) => v,
        Err(err) => {
            let line = err.location().map(|loc| loc.line());
            return Err(ValidationError {
                path: file_path.display().to_string(),
                message: err.to_string(),
                line,
            });
        }
    };
    parse_requirement_data(&data, file_path)
}

/// Parse a single requirement file.
pub fn parse_requirement_file(file_path: &Path) -> Result<RequirementWithSource, ValidationError> {
    let raw = match fs::read_to_string(file_path) {
        Ok(s) => s,
        Err(err) => {
            return Err(ValidationError::new(
                file_path.display().to_string(),
                err.to_string(),
            ));
        }
    };
    parse_requirement_content(&raw, file_path)
}
