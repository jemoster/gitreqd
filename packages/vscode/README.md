# gitreqd VSCode extension

Follow links in requirement files named `*.req.yml` or `*.req.yaml` (e.g. `satisfies: GRD-SYS-001`) via click or Go to Definition.

## Install for regular use

1. **Build and package** (from the repo root):

   ```bash
   npm run build
   cd packages/vscode && npm run package
   ```

   (The package script uses the local `vsce` via `npx`; no global install needed.)

   The build bundles `@gitreqd/core` into the extension so the installed VSIX is self-contained. Requirement YAML validation uses the Red Hat **YAML** extension: on activation, gitreqd registers the JSON Schema from core (and refreshes it when `gitreqd.yaml` / `gitreqd.yml` or workspace folders change).

   This produces a `.vsix` file in `packages/vscode/` (e.g. `gitreqd-vscode-0.1.0.vsix`).

2. **Install the VSIX in VSCode**:

   - Open the **Extensions** view (Ctrl+Shift+X / Cmd+Shift+X).
   - Click the **...** menu at the top of the Extensions panel.
   - Choose **Install from VSIX...**.
   - Select the `gitreqd-vscode-*.vsix` file from `packages/vscode/`.
   - Reload the window if prompted.

The extension will then be installed like any marketplace extension and activate when you open YAML (including `.req.yml` / `.req.yaml` requirement files) in a workspace whose root contains `gitreqd.yaml` or `gitreqd.yml` (see gitreqd docs). Link navigation, Go to Definition, schema validation under `requirements/`, and the preview apply only to `*.req.yml` and `*.req.yaml` files, not plain `.yml` or `.yaml` files.

### Requirement preview and rich-text editing

With a requirement file active, use the editor title **Open Requirement Preview** action (preview icon) to open the HTML preview beside the editor. The preview matches the structure and styling of the exported requirements report.

For **Description** and **Rationale** (when present), the preview includes a rich (WYSIWYG) editor with a formatting toolbar (headings, emphasis, lists, links, images, tables, code blocks, quotes). Edit the raw Markdown in the YAML file when you need the plain source. Changes in the preview are written back to the YAML file; you can also edit the same fields in the text editor—updates stay in sync when the document changes.

## Update the installation

After changing the extension or upgrading the repo:

1. **Rebuild and repackage** (from repo root):

   ```bash
   npm run build
   cd packages/vscode && npm run package
   ```

2. **Install the new VSIX** (same as above):

   - **Extensions** → **...** → **Install from VSIX...** → select the new `gitreqd-vscode-*.vsix`.

Installing a VSIX with the same or higher version replaces the previously installed copy. Reload the window after installing if the extension was already active.

To avoid picking an old file, remove the previous `.vsix` from `packages/vscode/` or run `npm run package` and install the newest file (check its timestamp or version in the filename).

## Finding the logs (debugging)

If links are not working, the extension writes brief log lines to help debug.

1. Open the **Output** panel: **View** → **Output** (or Ctrl+Shift+U / Cmd+Shift+U).
2. In the dropdown on the right of the Output panel, choose **Gitreqd**.

You will see messages such as:

- **No workspace folder for document** – The current file is not inside any opened workspace folder (e.g. you opened a single file). Open a folder as the workspace so the extension can use it as the project root.
- **Using workspace root: /path/to/workspace** – The folder the extension is using as the project root.
- **Discovery failed: …** – Reading or parsing the project root marker (`gitreqd.yaml` or `gitreqd.yml`) at the workspace root failed (e.g. file missing or invalid). The message shows the error; fix that file and try again.
- **Discovered N requirement file(s)** – Discovery succeeded; links should resolve if the requirement ids exist in those files.

After changing the project root marker or requirement `.req.yml` / `.req.yaml` files, close and reopen the file (or reload the window) so the extension’s cache is refreshed and new log lines are written.
