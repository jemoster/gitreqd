//! Core API for gitreqd. Used by the CLI (GRD-CLI-008).

pub mod discovery;
pub mod error;
pub mod html;
pub mod load;
pub mod parameters;
pub mod parse;
pub mod profile;
pub mod requirement_files;
pub mod rules;
pub mod schema;
pub mod schema_compose;
pub mod types;

pub use discovery::{
    discover_project, discover_project_root, discover_project_root_candidates,
    discover_requirement_paths, find_root_marker_path, get_requirement_dirs, normalize_path,
    ROOT_MARKER, ROOT_MARKER_FILENAMES, ROOT_MARKER_HINT,
};
pub use error::{DiscoverResult, Error};
pub use html::generate_full_html;
pub use load::{get_requirements_with_links, load_requirements};
pub use parameters::{resolve_text, resolve_to_segments, ResolvedSegment, SegmentKind};
pub use parse::{parse_requirement_content, parse_requirement_data, parse_requirement_file};
pub use profile::{
    get_active_profile_id, get_requirement_profile, list_registered_profile_ids,
    load_active_profile, RequirementProfile, STANDARD_PROFILE_ID,
};
pub use requirement_files::{
    expected_requirement_basenames_for_id, is_requirement_filename,
    requirement_file_extensions_display, requirement_id_from_filename, REQUIREMENT_FILE_EXTENSION,
    REQUIREMENT_FILE_EXTENSIONS,
};
pub use rules::{
    default_global_rules, default_rules, filename_id_match, links_acyclic, parameters_valid,
    require_valid, run_global_rules, run_rules, satisfies_references_exist, unique_ids,
    validate_requirements, NamedGlobalRule, NamedRule, ValidationRule,
};
pub use schema::{export_requirement_file_json_schema, parse_requirement_value};
pub use schema_compose::requirement_schema_compose_options_for_project;
pub use types::{
    ArtifactRef, Link, LoadResult, ParameterValue, ProjectInfo, Requirement,
    RequirementSchemaComposeOptions, RequirementWithSource, ValidationError,
};
