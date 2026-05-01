---
name: require
description: >-
  Drafts or updates gitreqd requirement YAML under requirements/ without
  implementing code. Use when the user wants to add or refine requirements,
  requirement files, or a requirements-only workflow in a gitreqd project.
disable-model-invocation: true
---

# gitreqd — define requirements only

Do not implement the requirement. Only define the requirement.

## Steps

1. Analyze the given requirements.

   - Check for clarity — If the requirement is unclear or inconsistent, stop to ask the user clarifying questions and update the requirement. If changes are made, redo this step until there are no changes made.
   - Check for redundancy — If the requirement is redundant with another requirement, stop to ask the user if the requirement should be removed. If changes are made, redo this step until there are no changes made.

2. Define the requirement.

   - Create a new requirement or update an existing requirement file in the requirements directory. The requirement file should be named after the requirement ID.
   - The requirement file should be a YAML file and adhere to the requirement schema.

## YAML style

When writing requirements YAML, do not include newlines to limit the line length. Assume instead that word-wrap will be used to maintain readability.
