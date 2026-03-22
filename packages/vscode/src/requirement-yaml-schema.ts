/**
 * GRD-VSC-004 / GRD-SYS-009: Register the requirement JSON Schema with the YAML extension at runtime.
 * The schema is regenerated when workspace folders or project root marker (`gitreqd.yaml` / `gitreqd.yml`)
 * change so future runtime-config-driven composition can update validation without rebuilding the extension.
 */
import * as vscode from "vscode";
import {
  exportRequirementFileJsonSchema,
  type RequirementSchemaComposeOptions,
} from "@gitreqd/core";

const SCHEMA_FILE = "requirement.json";
const GLOB_REQ_YML = "**/requirements/**/*.req.yml";
const GLOB_REQ_YAML = "**/requirements/**/*.req.yaml";

async function composeOptionsFromWorkspace(): Promise<RequirementSchemaComposeOptions | undefined> {
  // When project config affects the Zod schema, read it here and return options for
  // exportRequirementFileJsonSchema (e.g. extra fields from gitreqd.yaml).
  return undefined;
}

export function registerRequirementYamlSchema(context: vscode.ExtensionContext): vscode.Disposable {
  const subs: vscode.Disposable[] = [];
  let markerWatchers: vscode.Disposable | undefined;

  const schemaOutUri = (): vscode.Uri =>
    vscode.Uri.joinPath(context.globalStorageUri, "schemas", SCHEMA_FILE);

  const regenerate = async (): Promise<void> => {
    const options = await composeOptionsFromWorkspace();
    const json = exportRequirementFileJsonSchema(options);
    const dir = vscode.Uri.joinPath(context.globalStorageUri, "schemas");
    await vscode.workspace.fs.createDirectory(dir);
    const out = schemaOutUri();
    await vscode.workspace.fs.writeFile(
      out,
      Buffer.from(`${JSON.stringify(json, null, 2)}\n`, "utf8")
    );

    if (!vscode.workspace.workspaceFolders?.length) {
      return;
    }
    const yaml = vscode.workspace.getConfiguration("yaml");
    const existing = yaml.get<Record<string, string | string[]>>("schemas") ?? {};
    const key = out.toString(true);
    await yaml.update(
      "schemas",
      { ...existing, [key]: [GLOB_REQ_YML, GLOB_REQ_YAML] },
      vscode.ConfigurationTarget.Workspace
    );
  };

  const scheduleRegenerate = (): void => {
    void regenerate().catch((err: unknown) => {
      console.error("[Gitreqd] requirement YAML schema refresh failed:", err);
    });
  };

  const refreshMarkerWatchers = (): void => {
    markerWatchers?.dispose();
    const parts: vscode.Disposable[] = [];
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      for (const name of ["gitreqd.yaml", "gitreqd.yml"] as const) {
        const w = vscode.workspace.createFileSystemWatcher(
          new vscode.RelativePattern(folder, `**/${name}`)
        );
        w.onDidChange(scheduleRegenerate);
        w.onDidCreate(scheduleRegenerate);
        w.onDidDelete(scheduleRegenerate);
        parts.push(w);
      }
    }
    markerWatchers = vscode.Disposable.from(...parts);
  };

  scheduleRegenerate();
  refreshMarkerWatchers();

  subs.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      scheduleRegenerate();
      refreshMarkerWatchers();
    })
  );

  return vscode.Disposable.from(
    ...subs,
    new vscode.Disposable(() => {
      markerWatchers?.dispose();
    })
  );
}
