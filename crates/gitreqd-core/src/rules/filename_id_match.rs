//! GRD-VALID-002: The tool shall validate that requirement files are named
//! after their id and that the id matches the file name.

use std::path::Path;

use crate::requirement_files::{
    expected_requirement_basenames_for_id, requirement_file_extensions_display,
    requirement_id_from_filename,
};
use crate::types::{RequirementWithSource, ValidationError};

pub fn filename_id_match(requirement: &RequirementWithSource) -> Vec<ValidationError> {
    let basename = Path::new(&requirement.source_path)
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();
    match requirement_id_from_filename(&basename) {
        None => vec![ValidationError::new(
            requirement.source_path.display().to_string(),
            format!(
                "Requirement file must use {} (got \"{basename}\")",
                requirement_file_extensions_display()
            ),
        )],
        Some(name_without_ext) if name_without_ext != requirement.id => vec![ValidationError::new(
            requirement.source_path.display().to_string(),
            format!(
                "Requirement id \"{}\" does not match filename \"{basename}\" (expected {})",
                requirement.id,
                expected_requirement_basenames_for_id(&requirement.id)
            ),
        )],
        Some(_) => Vec::new(),
    }
}
