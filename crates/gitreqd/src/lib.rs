//! GRD-CLI-008: Essential command-line interface (bootstrap, validate, html, schema).

extern crate gitreqd_macros as gitreqd;

pub mod bootstrap;
pub mod format;
pub mod html;
pub mod schema;
pub mod validate;

pub use bootstrap::{run_bootstrap, BootstrapOptions, BootstrapResult};
pub use format::run_format;
pub use html::run_html;
pub use schema::{run_schema, SchemaOutputFormat};
pub use validate::run_validate;
