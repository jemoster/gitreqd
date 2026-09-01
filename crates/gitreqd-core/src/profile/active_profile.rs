//! GRD-SYS-010: Read optional `profile` from the project root marker; default `standard`.

use std::path::Path;

use serde_yaml::Value;

use crate::discovery::{find_root_marker_path, ROOT_MARKER};
use crate::error::Error;

use super::registry::{list_registered_profile_ids, STANDARD_PROFILE_ID};

pub fn get_active_profile_id(project_root: &Path) -> Result<String, Error> {
    let Some(root_path) = find_root_marker_path(project_root) else {
        return Ok(STANDARD_PROFILE_ID.to_string());
    };

    let marker_label = root_path
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| ROOT_MARKER.to_string());

    let Ok(raw) = std::fs::read_to_string(&root_path) else {
        return Ok(STANDARD_PROFILE_ID.to_string());
    };
    let Ok(data) = serde_yaml::from_str::<Value>(&raw) else {
        return Ok(STANDARD_PROFILE_ID.to_string());
    };
    let Value::Mapping(obj) = data else {
        return Ok(STANDARD_PROFILE_ID.to_string());
    };

    match obj.get(Value::String("profile".to_string())) {
        None | Some(Value::Null) => Ok(STANDARD_PROFILE_ID.to_string()),
        Some(Value::String(s)) => {
            let id = s.trim();
            if id.is_empty() {
                return Err(Error::msg(format!(
                    "Invalid {marker_label} at {}: \"profile\" must be a non-empty string when set",
                    root_path.display()
                )));
            }
            let known = list_registered_profile_ids();
            if !known.contains(&id) {
                let mut sorted = known;
                sorted.sort();
                return Err(Error::msg(format!(
                    "Unknown profile \"{id}\" in {marker_label} at {}. Known profiles: {}",
                    root_path.display(),
                    sorted.join(", ")
                )));
            }
            Ok(id.to_string())
        }
        Some(_) => Err(Error::msg(format!(
            "Invalid {marker_label} at {}: \"profile\" must be a non-empty string when set",
            root_path.display()
        ))),
    }
}
