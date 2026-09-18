//! GRD-SYS-015: `require` must be a single normative statement with exactly one RFC2119 keyword.

use std::sync::OnceLock;

use regex::Regex;

use crate::types::{RequirementWithSource, ValidationError};

fn rfc2119_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\b(shall|should|may)\b").expect("rfc2119 regex"))
}

fn count_rfc2119_keywords(text: &str) -> usize {
    rfc2119_re().find_iter(text).count()
}

pub fn require_valid(requirement: &RequirementWithSource) -> Vec<ValidationError> {
    let mut errors = Vec::new();
    let req = requirement.require.trim();
    if req.is_empty() {
        errors.push(ValidationError::new(
            requirement.source_path.display().to_string(),
            "Missing or empty required field: require",
        ));
        return errors;
    }
    let count = count_rfc2119_keywords(req);
    if count == 0 {
        errors.push(ValidationError::new(
            requirement.source_path.display().to_string(),
            "require must contain exactly one normative keyword (shall, should, or may)",
        ));
    } else if count > 1 {
        errors.push(ValidationError::new(
            requirement.source_path.display().to_string(),
            "require must be a single statement with exactly one normative keyword (shall, should, or may)",
        ));
    }
    errors
}
