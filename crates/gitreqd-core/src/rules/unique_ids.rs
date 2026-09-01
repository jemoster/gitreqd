//! GRD-VALID-003: Requirement ids must be unique across the project.

use crate::types::{RequirementWithSource, ValidationError};

pub fn unique_ids(requirements: &[RequirementWithSource]) -> Vec<ValidationError> {
    let mut errors = Vec::new();
    let mut by_id: Vec<(&str, &RequirementWithSource)> = Vec::new();

    for r in requirements {
        if let Some(existing) = by_id.iter().find(|(id, _)| *id == r.id.as_str()) {
            errors.push(ValidationError::new(
                r.source_path.display().to_string(),
                format!(
                    "Duplicate requirement id: {} (also in {})",
                    r.id,
                    existing.1.source_path.display()
                ),
            ));
        } else {
            by_id.push((r.id.as_str(), r));
        }
    }

    errors
}
