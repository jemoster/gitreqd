//! GRD-SYS-010: Profiles API for standard and user-defined profiles.

mod registry;
mod standard;
mod types;

#[cfg(feature = "std-fs")]
mod active_profile;

#[cfg(feature = "std-fs")]
pub use active_profile::get_active_profile_id;
pub use registry::{get_requirement_profile, list_registered_profile_ids, STANDARD_PROFILE_ID};
pub use types::RequirementProfile;

#[cfg(feature = "std-fs")]
use crate::error::Error;
#[cfg(feature = "std-fs")]
use std::path::Path;

/// GRD-SYS-010: Resolve the active profile from project configuration and return its implementation.
#[cfg(feature = "std-fs")]
pub fn load_active_profile(project_root: &Path) -> Result<&'static dyn RequirementProfile, Error> {
    get_requirement_profile(&get_active_profile_id(project_root)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering};

    static COUNTER: AtomicU64 = AtomicU64::new(0);

    fn temp_project() -> std::path::PathBuf {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!("gitreqd-profile-{n}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn lists_standard_profile() {
        assert!(list_registered_profile_ids().contains(&STANDARD_PROFILE_ID));
        assert_eq!(
            get_requirement_profile(STANDARD_PROFILE_ID).unwrap().id(),
            STANDARD_PROFILE_ID
        );
    }

    #[cfg(feature = "std-fs")]
    #[test]
    fn defaults_missing_profile_key() {
        let dir = temp_project();
        fs::write(
            dir.join("gitreqd.yaml"),
            "requirement_dirs:\n  - requirements\n",
        )
        .unwrap();
        assert_eq!(get_active_profile_id(&dir).unwrap(), STANDARD_PROFILE_ID);
        assert_eq!(load_active_profile(&dir).unwrap().id(), STANDARD_PROFILE_ID);
    }

    #[cfg(feature = "std-fs")]
    #[test]
    fn reads_explicit_standard() {
        let dir = temp_project();
        fs::write(
            dir.join("gitreqd.yaml"),
            "requirement_dirs:\n  - requirements\nprofile: standard\n",
        )
        .unwrap();
        assert_eq!(get_active_profile_id(&dir).unwrap(), STANDARD_PROFILE_ID);
    }

    #[cfg(feature = "std-fs")]
    #[test]
    fn unknown_profile_errors() {
        let dir = temp_project();
        fs::write(
            dir.join("gitreqd.yaml"),
            "requirement_dirs:\n  - requirements\nprofile: nonexistent-profile\n",
        )
        .unwrap();
        let err = get_active_profile_id(&dir).unwrap_err();
        assert!(err.to_string().contains("Unknown profile"));
    }
}
