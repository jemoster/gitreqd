//! GRD-SYS-018: Collect source-link records from gitreqd tracing attributes on Rust items.

use std::collections::HashSet;
use std::fs;
use std::path::Path;

use proc_macro2::Span;
use syn::parse::Parser;
use syn::punctuated::Punctuated;
use syn::spanned::Spanned;
use syn::visit::Visit;
use syn::{Attribute, ImplItem, Item, LitStr, Token, TraitItem};
use walkdir::WalkDir;

use crate::discovery::normalize_path;
use crate::error::Error;
use crate::types::{SourceLink, SourceLinkKind};

const SKIP_DIR_NAMES: &[&str] = &["target", "node_modules", ".git", "dist"];

fn skip_dir_name(name: &str) -> bool {
    SKIP_DIR_NAMES.contains(&name)
}

fn path_should_skip(path: &Path) -> bool {
    path.components()
        .any(|c| c.as_os_str().to_str().is_some_and(skip_dir_name))
}

fn project_relative_path(project_root: &Path, file: &Path) -> String {
    let file = normalize_path(file);
    let root = normalize_path(project_root);
    match file.strip_prefix(&root) {
        Ok(rel) => rel.to_string_lossy().replace('\\', "/"),
        Err(_) => file.to_string_lossy().replace('\\', "/"),
    }
}

fn is_gitreqd_tracing_attr(attr: &Attribute) -> Option<SourceLinkKind> {
    let segs: Vec<String> = attr
        .path()
        .segments
        .iter()
        .map(|s| s.ident.to_string())
        .collect();
    if segs.len() < 2 {
        return None;
    }
    let crate_name = segs[0].as_str();
    if crate_name != "gitreqd" && crate_name != "gitreqd_macros" {
        return None;
    }
    match segs.last().map(String::as_str) {
        Some("implements") => Some(SourceLinkKind::Implements),
        Some("verifies") => Some(SourceLinkKind::Verifies),
        _ => None,
    }
}

fn attr_requirement_ids(attr: &Attribute) -> Vec<String> {
    let syn::Meta::List(list) = &attr.meta else {
        return Vec::new();
    };
    match Punctuated::<LitStr, Token![,]>::parse_terminated.parse2(list.tokens.clone()) {
        Ok(lits) => lits.into_iter().map(|lit| lit.value()).collect(),
        Err(_) => Vec::new(),
    }
}

fn is_test_attr(attr: &Attribute) -> bool {
    attr.path()
        .segments
        .last()
        .is_some_and(|s| s.ident == "test")
}

fn linespace_from_spans(spans: impl IntoIterator<Item = Span>) -> Vec<u32> {
    let mut min_line: Option<u32> = None;
    let mut max_line: Option<u32> = None;
    for span in spans {
        let start = span.start().line as u32;
        let end = span.end().line as u32;
        if start == 0 && end == 0 {
            continue;
        }
        min_line = Some(min_line.map_or(start, |m| m.min(start)));
        max_line = Some(max_line.map_or(end, |m| m.max(end)));
    }
    match (min_line, max_line) {
        (Some(start), Some(end)) if start > 0 && end >= start => (start..=end).collect(),
        _ => Vec::new(),
    }
}

fn emit_links(
    attrs: &[Attribute],
    extra_spans: &[Span],
    item: &str,
    path: &str,
    known_ids: &HashSet<String>,
    out: &mut Vec<SourceLink>,
) {
    let mut spans: Vec<Span> = attrs.iter().map(|a| a.span()).collect();
    spans.extend_from_slice(extra_spans);
    let linespace = linespace_from_spans(spans);
    for attr in attrs {
        let Some(kind) = is_gitreqd_tracing_attr(attr) else {
            continue;
        };
        for id in attr_requirement_ids(attr) {
            if !known_ids.contains(&id) {
                continue;
            }
            if let Some(link) = SourceLink::new(id, kind, path, item, linespace.clone()) {
                out.push(link);
            }
        }
    }
}

fn fn_item_type(attrs: &[Attribute]) -> &'static str {
    if attrs.iter().any(is_test_attr) {
        "test"
    } else {
        "function"
    }
}

fn item_type(item: &Item) -> &'static str {
    match item {
        Item::Fn(f) => fn_item_type(&f.attrs),
        Item::Mod(_) => "module",
        Item::Struct(_) => "struct",
        Item::Enum(_) => "enum",
        Item::Trait(_) => "trait",
        Item::Const(_) => "constant",
        Item::Static(_) => "static",
        Item::Type(_) => "type",
        Item::Impl(_) => "impl",
        Item::Union(_) => "union",
        Item::Use(_) => "use",
        Item::Macro(_) => "macro",
        Item::ForeignMod(_) => "foreign_mod",
        Item::TraitAlias(_) => "trait_alias",
        Item::ExternCrate(_) => "extern_crate",
        _ => "item",
    }
}

fn item_attrs_and_span(item: &Item) -> (&[Attribute], Span) {
    match item {
        Item::Fn(i) => (&i.attrs, i.span()),
        Item::Mod(i) => (&i.attrs, i.span()),
        Item::Struct(i) => (&i.attrs, i.span()),
        Item::Enum(i) => (&i.attrs, i.span()),
        Item::Trait(i) => (&i.attrs, i.span()),
        Item::Const(i) => (&i.attrs, i.span()),
        Item::Static(i) => (&i.attrs, i.span()),
        Item::Type(i) => (&i.attrs, i.span()),
        Item::Impl(i) => (&i.attrs, i.span()),
        Item::Union(i) => (&i.attrs, i.span()),
        Item::Use(i) => (&i.attrs, i.span()),
        Item::Macro(i) => (&i.attrs, i.span()),
        Item::ForeignMod(i) => (&i.attrs, i.span()),
        Item::TraitAlias(i) => (&i.attrs, i.span()),
        Item::ExternCrate(i) => (&i.attrs, i.span()),
        other => (&[], other.span()),
    }
}

struct FileCollector<'a> {
    path: &'a str,
    known_ids: &'a HashSet<String>,
    out: &'a mut Vec<SourceLink>,
}

impl<'ast> Visit<'ast> for FileCollector<'_> {
    fn visit_item(&mut self, item: &'ast Item) {
        let (attrs, span) = item_attrs_and_span(item);
        emit_links(
            attrs,
            &[span],
            item_type(item),
            self.path,
            self.known_ids,
            self.out,
        );
        syn::visit::visit_item(self, item);
    }

    fn visit_impl_item(&mut self, item: &'ast ImplItem) {
        match item {
            ImplItem::Fn(f) => emit_links(
                &f.attrs,
                &[f.span()],
                fn_item_type(&f.attrs),
                self.path,
                self.known_ids,
                self.out,
            ),
            ImplItem::Const(c) => emit_links(
                &c.attrs,
                &[c.span()],
                "constant",
                self.path,
                self.known_ids,
                self.out,
            ),
            ImplItem::Type(t) => emit_links(
                &t.attrs,
                &[t.span()],
                "type",
                self.path,
                self.known_ids,
                self.out,
            ),
            ImplItem::Macro(m) => emit_links(
                &m.attrs,
                &[m.span()],
                "macro",
                self.path,
                self.known_ids,
                self.out,
            ),
            _ => {}
        }
        syn::visit::visit_impl_item(self, item);
    }

    fn visit_trait_item(&mut self, item: &'ast TraitItem) {
        match item {
            TraitItem::Fn(f) => emit_links(
                &f.attrs,
                &[f.span()],
                fn_item_type(&f.attrs),
                self.path,
                self.known_ids,
                self.out,
            ),
            TraitItem::Const(c) => emit_links(
                &c.attrs,
                &[c.span()],
                "constant",
                self.path,
                self.known_ids,
                self.out,
            ),
            TraitItem::Type(t) => emit_links(
                &t.attrs,
                &[t.span()],
                "type",
                self.path,
                self.known_ids,
                self.out,
            ),
            TraitItem::Macro(m) => emit_links(
                &m.attrs,
                &[m.span()],
                "macro",
                self.path,
                self.known_ids,
                self.out,
            ),
            _ => {}
        }
        syn::visit::visit_trait_item(self, item);
    }
}

fn collect_from_rust_source(
    source: &str,
    path: &str,
    known_ids: &HashSet<String>,
    out: &mut Vec<SourceLink>,
) {
    let Ok(file) = syn::parse_file(source) else {
        return;
    };
    let mut visitor = FileCollector {
        path,
        known_ids,
        out,
    };
    visitor.visit_file(&file);
}

/// GRD-SYS-018: Walk `*.rs` under `project_root` and emit source-link records for
/// `#[gitreqd::implements]` / `#[gitreqd::verifies]` (and `gitreqd_macros::…`) whose
/// IDs are in `known_ids`. Skips generated and dependency directories such as `target/`.
#[gitreqd::implements("GRD-SYS-018")]
pub fn collect_rust_source_links(
    project_root: &Path,
    known_ids: &HashSet<String>,
) -> Result<Vec<SourceLink>, Error> {
    if known_ids.is_empty() {
        return Ok(Vec::new());
    }
    let root = normalize_path(&if project_root.is_absolute() {
        project_root.to_path_buf()
    } else {
        std::env::current_dir()?.join(project_root)
    });
    if !root.is_dir() {
        return Err(Error::msg(format!(
            "Project root is not a directory: {}",
            root.display()
        )));
    }

    let mut out = Vec::new();
    let walker = WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            if e.file_type().is_dir() {
                !e.file_name().to_str().is_some_and(skip_dir_name)
            } else {
                true
            }
        });

    for entry in walker {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        if path_should_skip(path) {
            continue;
        }
        if path.extension().and_then(|e| e.to_str()) != Some("rs") {
            continue;
        }
        let Ok(source) = fs::read_to_string(path) else {
            continue;
        };
        let rel = project_relative_path(&root, path);
        collect_from_rust_source(&source, &rel, known_ids, &mut out);
    }

    out.sort_by(|a, b| {
        a.path
            .cmp(&b.path)
            .then(a.kind.cmp(&b.kind))
            .then(a.requirement_id.cmp(&b.requirement_id))
            .then(a.linespace.cmp(&b.linespace))
            .then(a.item.cmp(&b.item))
    });
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU64, Ordering};

    static COUNTER: AtomicU64 = AtomicU64::new(0);

    fn temp_root() -> PathBuf {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!("gitreqd-src-links-{n}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn ids(vals: &[&str]) -> HashSet<String> {
        vals.iter().map(|s| (*s).to_string()).collect()
    }

    fn write_rs(root: &Path, rel: &str, body: &str) {
        let path = root.join(rel);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(path, body).unwrap();
    }

    #[gitreqd::verifies("GRD-SYS-017")]
    #[test]
    fn new_normalizes_linespace_and_rejects_empty() {
        let link = SourceLink::new(
            "REQ-A",
            SourceLinkKind::Implements,
            "src/lib.rs",
            "function",
            vec![4, 2, 2, 3],
        )
        .unwrap();
        assert_eq!(link.requirement_id, "REQ-A");
        assert_eq!(link.kind, SourceLinkKind::Implements);
        assert_eq!(link.path, "src/lib.rs");
        assert_eq!(link.item, "function");
        assert_eq!(link.linespace, vec![2, 3, 4]);
        assert!(SourceLink::new(
            "REQ-A",
            SourceLinkKind::Verifies,
            "src/lib.rs",
            "function",
            Vec::new(),
        )
        .is_none());
    }

    #[gitreqd::verifies("GRD-SYS-018")]
    #[test]
    fn collects_implements_on_function() {
        let root = temp_root();
        write_rs(
            &root,
            "src/lib.rs",
            r#"
#[gitreqd::implements("REQ-A")]
pub fn collect_source_links() {}
"#,
        );
        let links = collect_rust_source_links(&root, &ids(&["REQ-A", "REQ-B"])).unwrap();
        assert_eq!(links.len(), 1);
        assert_eq!(links[0].requirement_id, "REQ-A");
        assert_eq!(links[0].kind, SourceLinkKind::Implements);
        assert_eq!(links[0].path, "src/lib.rs");
        assert_eq!(links[0].item, "function");
        assert!(!links[0].linespace.is_empty());
        assert!(links[0].linespace.windows(2).all(|w| w[0] < w[1]));
    }

    #[gitreqd::verifies("GRD-SYS-018")]
    #[test]
    fn collects_verifies_on_test_and_multiple_ids() {
        let root = temp_root();
        write_rs(
            &root,
            "src/lib.rs",
            r#"
#[gitreqd::verifies("REQ-A", "REQ-B")]
#[test]
fn collects_implements_attribute() {}
"#,
        );
        let links = collect_rust_source_links(&root, &ids(&["REQ-A", "REQ-B"])).unwrap();
        assert_eq!(links.len(), 2);
        assert!(links.iter().all(|l| l.kind == SourceLinkKind::Verifies));
        assert!(links.iter().all(|l| l.item == "test"));
        let mut reqs: Vec<_> = links.iter().map(|l| l.requirement_id.as_str()).collect();
        reqs.sort();
        assert_eq!(reqs, vec!["REQ-A", "REQ-B"]);
    }

    #[gitreqd::verifies("GRD-SYS-018")]
    #[test]
    fn omits_unknown_ids_and_skips_target_dir() {
        let root = temp_root();
        write_rs(
            &root,
            "src/lib.rs",
            r#"
#[gitreqd::implements("REQ-A")]
#[gitreqd::implements("UNKNOWN")]
pub fn keep() {}
"#,
        );
        write_rs(
            &root,
            "target/debug/build.rs",
            r#"
#[gitreqd::implements("REQ-A")]
pub fn ignored() {}
"#,
        );
        let links = collect_rust_source_links(&root, &ids(&["REQ-A"])).unwrap();
        assert_eq!(links.len(), 1);
        assert_eq!(links[0].path, "src/lib.rs");
    }

    #[gitreqd::verifies("GRD-SYS-018")]
    #[test]
    fn collects_struct_and_nested_module_and_macros_prefix() {
        let root = temp_root();
        write_rs(
            &root,
            "src/model.rs",
            r#"
mod inner {
    #[gitreqd::implements("REQ-S")]
    pub struct Record {}
}

#[gitreqd_macros::implements("REQ-C")]
pub const LIMIT: u8 = 1;
"#,
        );
        let links = collect_rust_source_links(&root, &ids(&["REQ-S", "REQ-C"])).unwrap();
        assert_eq!(links.len(), 2);
        let s = links.iter().find(|l| l.requirement_id == "REQ-S").unwrap();
        assert_eq!(s.item, "struct");
        let c = links.iter().find(|l| l.requirement_id == "REQ-C").unwrap();
        assert_eq!(c.item, "constant");
        assert_eq!(c.path, "src/model.rs");
    }

    #[gitreqd::verifies("GRD-SYS-018")]
    #[test]
    fn skips_unparseable_rust_and_empty_known_ids() {
        let root = temp_root();
        write_rs(&root, "src/bad.rs", "fn broken(");
        write_rs(
            &root,
            "src/ok.rs",
            r#"
#[gitreqd::implements("REQ-A")]
pub fn ok() {}
"#,
        );
        assert!(collect_rust_source_links(&root, &HashSet::new())
            .unwrap()
            .is_empty());
        let links = collect_rust_source_links(&root, &ids(&["REQ-A"])).unwrap();
        assert_eq!(links.len(), 1);
        assert_eq!(links[0].path, "src/ok.rs");
    }

    #[gitreqd::verifies("GRD-SYS-017")]
    #[gitreqd::verifies("GRD-SYS-018")]
    #[test]
    fn collects_self_annotations_from_crate_sources() {
        let crate_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let known = ids(&["GRD-SYS-017", "GRD-SYS-018"]);
        let links = collect_rust_source_links(&crate_dir, &known).unwrap();
        assert!(links.iter().any(|l| {
            l.requirement_id == "GRD-SYS-017"
                && l.kind == SourceLinkKind::Implements
                && l.item == "struct"
        }));
        assert!(links.iter().any(|l| {
            l.requirement_id == "GRD-SYS-018"
                && l.kind == SourceLinkKind::Implements
                && l.item == "function"
        }));
        assert!(links.iter().any(|l| {
            l.requirement_id == "GRD-SYS-018" && l.kind == SourceLinkKind::Verifies && l.item == "test"
        }));
        assert!(links.iter().all(|l| !l.path.contains("target/")));
    }
}
