/**
 * GRD-VSC-005: Template for a new requirement YAML file.
 * Content matches the requirement schema (id, title, description, attributes, links)
 * so the created file gets full editor support (validation, completion) from the YAML schema.
 */
export function newRequirementYamlTemplate(id: string): string {
  return `id: ${id}
title: ''
description: |
  
attributes:
  status: active
  rationale: |
    
links: []
`;
}
