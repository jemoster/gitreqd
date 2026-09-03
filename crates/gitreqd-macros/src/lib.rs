//! Attribute macros that tag Rust items as gitreqd source links.
//!
//! `#[gitreqd::implements("…")]` and `#[gitreqd::verifies("…")]` are available
//! when this crate is aliased as `gitreqd` (`extern crate gitreqd_macros as gitreqd`).

use proc_macro::TokenStream;
use syn::parse::Parser;
use syn::punctuated::Punctuated;
use syn::{LitStr, Token};

fn parse_ids(args: TokenStream) -> syn::Result<Vec<String>> {
    let parser = Punctuated::<LitStr, Token![,]>::parse_terminated;
    let lits = parser.parse(args)?;
    if lits.is_empty() {
        return Err(syn::Error::new(
            proc_macro2::Span::call_site(),
            "expected at least one requirement ID string literal",
        ));
    }
    Ok(lits.into_iter().map(|lit| lit.value()).collect())
}

fn expand(args: TokenStream, input: TokenStream) -> TokenStream {
    if let Err(err) = parse_ids(args) {
        return err.to_compile_error().into();
    }
    input
}

/// Marks the following item as an implementation of each listed requirement.
#[proc_macro_attribute]
pub fn implements(args: TokenStream, input: TokenStream) -> TokenStream {
    expand(args, input)
}

/// Marks the following item as a verification of each listed requirement.
#[proc_macro_attribute]
pub fn verifies(args: TokenStream, input: TokenStream) -> TokenStream {
    expand(args, input)
}
