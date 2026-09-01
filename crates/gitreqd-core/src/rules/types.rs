//! Validation rule types (GRD-VALID-001).

use crate::types::{RequirementWithSource, ValidationError};

/// A validation rule: takes a single requirement (with its source path) and
/// returns zero or more validation errors.
pub type ValidationRule = fn(&RequirementWithSource) -> Vec<ValidationError>;

pub struct NamedRule {
    pub id: &'static str,
    pub run: ValidationRule,
}

/// A global validation rule: takes all requirements and returns validation errors.
pub type GlobalValidationRule = fn(&[RequirementWithSource]) -> Vec<ValidationError>;

pub struct NamedGlobalRule {
    pub id: &'static str,
    pub run: GlobalValidationRule,
}
