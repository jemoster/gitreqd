//! GRD-SYS-010: Active profile drives requirement document shape, validation, and HTML output.

use crate::types::{RequirementSchemaComposeOptions, RequirementWithSource, ValidationError};
use std::path::Path;

/// GRD-SYS-010: Active profile drives requirement document shape, validation, and HTML output.
pub trait RequirementProfile: Send + Sync {
    fn id(&self) -> &str;
    fn parse_requirement_file(
        &self,
        file_path: &Path,
    ) -> Result<RequirementWithSource, ValidationError>;
    fn parse_requirement_content(
        &self,
        content: &str,
        file_path: &Path,
    ) -> Result<RequirementWithSource, ValidationError>;
    fn validate_requirements(&self, requirements: &[RequirementWithSource])
        -> Vec<ValidationError>;
    fn export_requirement_file_json_schema(
        &self,
        options: Option<&RequirementSchemaComposeOptions>,
    ) -> serde_json::Value;
    fn requirement_schema_compose_options_for_project(
        &self,
        project_root: &Path,
    ) -> Option<RequirementSchemaComposeOptions>;
    fn generate_full_html(&self, requirements: &[RequirementWithSource]) -> String;
}
