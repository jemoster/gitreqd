//! GRD-VALID-005: The directed graph of links between requirements must be acyclic.

use std::collections::{HashMap, HashSet};

use crate::types::{RequirementWithSource, ValidationError};

fn get_link_targets(requirement: &RequirementWithSource) -> Vec<String> {
    let mut targets = Vec::new();
    for link in requirement.links.as_deref().unwrap_or(&[]) {
        targets.extend(link.string_targets());
    }
    targets
}

fn cycle_key(cycle: &[String]) -> String {
    let mut sorted = cycle.to_vec();
    sorted.sort();
    sorted.join(",")
}

pub fn links_acyclic(requirements: &[RequirementWithSource]) -> Vec<ValidationError> {
    let mut errors = Vec::new();
    let id_set: HashSet<String> = requirements.iter().map(|r| r.id.clone()).collect();
    let id_to_req: HashMap<&str, &RequirementWithSource> =
        requirements.iter().map(|r| (r.id.as_str(), r)).collect();

    let mut adj: HashMap<String, Vec<String>> = HashMap::new();
    for r in requirements {
        let targets: Vec<String> = get_link_targets(r)
            .into_iter()
            .filter(|id| id_set.contains(id))
            .collect();
        if !targets.is_empty() {
            adj.insert(r.id.clone(), targets);
        }
    }

    let mut visited: HashSet<String> = HashSet::new();
    let mut stack: Vec<String> = Vec::new();
    let mut stack_set: HashSet<String> = HashSet::new();
    let mut seen_cycles: Vec<(String, Vec<String>)> = Vec::new();

    fn add_cycle(seen_cycles: &mut Vec<(String, Vec<String>)>, cycle: Vec<String>) {
        let key = cycle_key(&cycle);
        if seen_cycles.iter().any(|(k, _)| k == &key) {
            return;
        }
        seen_cycles.push((key, cycle));
    }

    fn dfs(
        id: &str,
        adj: &HashMap<String, Vec<String>>,
        visited: &mut HashSet<String>,
        stack: &mut Vec<String>,
        stack_set: &mut HashSet<String>,
        seen_cycles: &mut Vec<(String, Vec<String>)>,
    ) {
        if stack_set.contains(id) {
            let idx = stack.iter().position(|s| s == id).unwrap_or(0);
            let mut cycle = stack[idx..].to_vec();
            cycle.push(id.to_string());
            add_cycle(seen_cycles, cycle);
            return;
        }
        if visited.contains(id) {
            return;
        }
        visited.insert(id.to_string());
        stack.push(id.to_string());
        stack_set.insert(id.to_string());
        if let Some(targets) = adj.get(id) {
            for target in targets {
                dfs(target, adj, visited, stack, stack_set, seen_cycles);
            }
        }
        stack.pop();
        stack_set.remove(id);
    }

    for id in &id_set {
        if !visited.contains(id) {
            dfs(
                id,
                &adj,
                &mut visited,
                &mut stack,
                &mut stack_set,
                &mut seen_cycles,
            );
        }
    }

    for (_, cycle) in seen_cycles {
        let path_str = cycle.join(" -> ");
        let source_path = id_to_req
            .get(cycle[0].as_str())
            .map(|r| r.source_path.display().to_string())
            .unwrap_or_else(|| cycle[0].clone());
        errors.push(ValidationError::new(
            source_path,
            format!("Cycle in requirement links: {path_str}"),
        ));
    }

    errors
}
