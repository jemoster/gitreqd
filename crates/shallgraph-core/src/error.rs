//! Error type for discovery and project-root operations.

use std::io;
use std::path::PathBuf;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("{0}")]
    Message(String),
    #[error("{0}")]
    Io(String),
}

impl Error {
    pub fn msg(msg: impl Into<String>) -> Self {
        Self::Message(msg.into())
    }
}

impl From<io::Error> for Error {
    fn from(err: io::Error) -> Self {
        Self::Io(err.to_string())
    }
}

#[derive(Debug, Clone)]
pub struct DiscoverResult {
    pub root_dir: PathBuf,
    pub requirement_paths: Vec<PathBuf>,
}
