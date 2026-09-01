//! GRD-VALID-004: Every reference id under a requirement's "links" (e.g. satisfies)
//! must exist as another requirement in the project.

use std::collections::HashSet;

use crate::types::{RequirementWithSource, ValidationError};

pub fn satisfies_references_exist(requirements: &[RequirementWithSource]) -> Vec<ValidationError> {
    let mut errors = Vec::new();
    let id_set: HashSet<&str> = requirements.iter().map(|r| r.id.as_str()).collect();

    for r in requirements {
        for link in r.links.as_deref().unwrap_or(&[]) {
            if let Some(target_id) = &link.satisfies {
                if !target_id.is_empty() && !id_set.contains(target_id.as_str()) {
                    errors.push(ValidationError::new(
                        r.source_path.display().to_string(),
                        format!("Requirement {} references unknown id: {target_id}", r.id),
                    ));
                }
            }
        }
    }

    errors
}
