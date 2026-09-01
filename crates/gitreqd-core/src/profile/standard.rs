//! GRD-SYS-010: Default `standard` profile — current requirement schema, ruleset, and HTML report layout.

use std::path::Path;

use crate::html::generate_full_html;
use crate::parse::{parse_requirement_content, parse_requirement_file};
use crate::rules::validate_requirements;
use crate::schema::export_requirement_file_json_schema;
use crate::schema_compose::requirement_schema_compose_options_for_project as compose_options;
use crate::types::{RequirementSchemaComposeOptions, RequirementWithSource, ValidationError};

use super::types::RequirementProfile;

pub struct StandardProfile;

impl RequirementProfile for StandardProfile {
    fn id(&self) -> &str {
        "standard"
    }

    fn parse_requirement_file(
        &self,
        file_path: &Path,
    ) -> Result<RequirementWithSource, ValidationError> {
        parse_requirement_file(file_path)
    }

    fn parse_requirement_content(
        &self,
        content: &str,
        file_path: &Path,
    ) -> Result<RequirementWithSource, ValidationError> {
        parse_requirement_content(content, file_path)
    }

    fn validate_requirements(
        &self,
        requirements: &[RequirementWithSource],
    ) -> Vec<ValidationError> {
        validate_requirements(requirements)
    }

    fn export_requirement_file_json_schema(
        &self,
        options: Option<&RequirementSchemaComposeOptions>,
    ) -> serde_json::Value {
        export_requirement_file_json_schema(options)
    }

    fn requirement_schema_compose_options_for_project(
        &self,
        project_root: &Path,
    ) -> Option<RequirementSchemaComposeOptions> {
        compose_options(project_root)
    }

    fn generate_full_html(&self, requirements: &[RequirementWithSource]) -> String {
        generate_full_html(requirements)
    }
}
