//! GRD-SYS-010: Profile registry.

use crate::error::Error;

use super::standard::StandardProfile;
use super::types::RequirementProfile;

pub const STANDARD_PROFILE_ID: &str = "standard";

static STANDARD: StandardProfile = StandardProfile;

pub fn get_requirement_profile(id: &str) -> Result<&'static dyn RequirementProfile, Error> {
    match id {
        STANDARD_PROFILE_ID => Ok(&STANDARD),
        other => Err(Error::msg(format!("Unknown requirement profile: {other}"))),
    }
}

pub fn list_registered_profile_ids() -> Vec<&'static str> {
    vec![STANDARD_PROFILE_ID]
}
