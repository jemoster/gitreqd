# ShallGraph

Follow links in requirement files named `*.req.yml` or `*.req.yaml` (for example `satisfies: GRD-SYS-001`) via click or Go to Definition.

The extension activates when you open YAML in a workspace whose root contains `shallgraph.yaml` or `shallgraph.yml`. Link navigation, Go to Definition, schema validation under `requirements/`, and the preview apply to `*.req.yml` and `*.req.yaml` files. Requirement YAML validation uses the YAML extension: on activation, ShallGraph registers the JSON Schema from core and refreshes it when `shallgraph.yaml` / `shallgraph.yml` or workspace folders change.

## Requirement preview and rich-text editing

With a requirement file active, use the editor title **Open Requirement Preview** action (preview icon) to open the HTML preview beside the editor. The preview matches the structure and styling of the exported requirements report. File paths in the preview (the requirement source file and local implementation or verification artifacts) open in the current editor, including when that editor is attached over SSH or to a container.

For **Description** and **Rationale** (when present), the preview includes a rich (WYSIWYG) editor with a formatting toolbar (headings, emphasis, lists, links, images, tables, code blocks, quotes). Edit the raw Markdown in the YAML file when you need the plain source. Changes in the preview are written back to the YAML file; you can also edit the same fields in the text editor. Updates stay in sync when the document changes.
