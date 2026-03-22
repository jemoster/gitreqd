/**
 * VSCode extension for gitreqd: link resolution, preview (GRD-VSC-003), navigation,
 * YAML schema for requirement files (GRD-VSC-004): registered at runtime from core Zod (GRD-SYS-009),
 * refreshed when project root markers change, and new requirement from explorer (GRD-VSC-005).
 */
import * as vscode from "vscode";
import * as path from "node:path";
import { REQUIREMENT_FILE_EXTENSION } from "@gitreqd/core";
import { isRequirementDocument } from "./requirement-document.js";
import { resolveRequirementPath } from "./link-resolver.js";
import { newRequirementYamlTemplate } from "./new-requirement-template.js";
import { RequirementPreviewManager } from "./preview.js";
import { registerRequirementYamlSchema } from "./requirement-yaml-schema.js";

const SATISFIES_REGEX = /satisfies:\s*['"]?([^\s'"\n]+)['"]?/g;

function* findLinkRanges(document: vscode.TextDocument): Generator<{ range: vscode.Range; id: string }> {
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const text = line.text;
    let match: RegExpExecArray | null;
    SATISFIES_REGEX.lastIndex = 0;
    while ((match = SATISFIES_REGEX.exec(text)) !== null) {
      const id = match[1]!;
      const startOffset = match.index + match[0].indexOf(id);
      const endOffset = startOffset + id.length;
      yield {
        range: new vscode.Range(i, startOffset, i, endOffset),
        id,
      };
    }
  }
}

const OUTPUT_CHANNEL_NAME = "Gitreqd";

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  const log = (message: string) => outputChannel.appendLine(message);
  context.subscriptions.push(outputChannel);
  log(
    "[Gitreqd] Extension active. Open a `.req.yml` or `.req.yaml` requirement file to resolve links; logs will appear here."
  );

  context.subscriptions.push(registerRequirementYamlSchema(context));

  const previewManager = new RequirementPreviewManager(
    context,
    log,
    async (requirementId: string) => {
      const activeUri = vscode.window.activeTextEditor?.document.uri;
      const folder =
        (activeUri && vscode.workspace.getWorkspaceFolder(activeUri)) ??
        vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        log("[Gitreqd] No workspace folder; cannot open preview for " + requirementId);
        return;
      }
      const targetPath = await resolveRequirementPath(
        folder.uri.fsPath,
        requirementId,
        log
      );
      if (!targetPath) {
        log("[Gitreqd] Requirement not found: " + requirementId);
        return;
      }
      const doc = await vscode.workspace.openTextDocument(targetPath);
      await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One });
      previewManager.openPreviewForDocument(doc);
    }
  );

  /** GRD-SYS-007: requirement files use `.req.yml` or `.req.yaml`. */
  const requirementYamlSelector: vscode.DocumentSelector = [
    { language: "yaml", pattern: "**/*.req.yml" },
    { language: "yaml", pattern: "**/*.req.yaml" },
  ];

  const documentLinkProvider = vscode.languages.registerDocumentLinkProvider(
    requirementYamlSelector,
    {
      async provideDocumentLinks(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken
      ): Promise<vscode.DocumentLink[]> {
        const folder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!folder) {
          log("[Gitreqd] No workspace folder for document; links disabled.");
          return [];
        }
        const workspaceRoot = folder.uri.fsPath;
        const links: vscode.DocumentLink[] = [];
        for (const { range, id } of findLinkRanges(document)) {
          const targetPath = await resolveRequirementPath(workspaceRoot, id, log);
          if (targetPath) {
            links.push(new vscode.DocumentLink(range, vscode.Uri.file(targetPath)));
          }
        }
        return links;
      },
    }
  );

  const definitionProvider = vscode.languages.registerDefinitionProvider(
    requirementYamlSelector,
    {
      async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
      ): Promise<vscode.Definition | undefined> {
        const folder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!folder) {
          log("[Gitreqd] No workspace folder for document; Go to Definition disabled.");
          return undefined;
        }
        const workspaceRoot = folder.uri.fsPath;
        for (const { range, id } of findLinkRanges(document)) {
          if (token.isCancellationRequested) {
            return undefined;
          }
          if (range.contains(position)) {
            const targetPath = await resolveRequirementPath(workspaceRoot, id, log);
            if (targetPath) {
              return new vscode.Location(vscode.Uri.file(targetPath), new vscode.Position(0, 0));
            }
            return undefined;
          }
        }
        return undefined;
      },
    }
  );

  // GRD-VSC-003: Editor title action (Preview button) — opens requirement preview webview side-by-side.
  const openPreviewCommand = vscode.commands.registerCommand(
    "gitreqd.requirement.openPreview",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        log("[Gitreqd] No active editor for preview command.");
        return;
      }
      if (!isRequirementDocument(editor.document)) {
        log("[Gitreqd] Preview applies only to `.req.yml` / `.req.yaml` requirement files.");
        return;
      }
      previewManager.openPreviewForDocument(editor.document);
    }
  );

  // GRD-VSC-005: Explorer context menu — create a new requirement with schema-based template.
  const newRequirementCommand = vscode.commands.registerCommand(
    "gitreqd.requirement.new",
    async (resource?: vscode.Uri) => {
      let targetDir: string;
      if (resource) {
        const stat = await vscode.workspace.fs.stat(resource);
        targetDir =
          stat.type === vscode.FileType.Directory
            ? resource.fsPath
            : path.dirname(resource.fsPath);
      } else {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
          log("[Gitreqd] No workspace folder; open a folder to add a new requirement.");
          vscode.window.showErrorMessage("GitReqD: Open a workspace folder first.");
          return;
        }
        targetDir = folder.uri.fsPath;
      }

      const id = await vscode.window.showInputBox({
        title: "GitReqD: New Requirement",
        prompt: `Requirement ID (e.g. GRD-VSC-006). Filename will be {id}${REQUIREMENT_FILE_EXTENSION}`,
        placeHolder: "GRD-XXX-001",
        validateInput(value) {
          if (!value.trim()) {
            return "ID is required.";
          }
          if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(value.trim())) {
            return "ID must be alphanumeric with optional hyphens.";
          }
          return null;
        },
      });
      if (id === undefined || !id.trim()) {
        return;
      }
      const trimmedId = id.trim();
      const filePath = path.join(targetDir, `${trimmedId}${REQUIREMENT_FILE_EXTENSION}`);
      const uri = vscode.Uri.file(filePath);
      try {
        await vscode.workspace.fs.stat(uri);
        vscode.window.showErrorMessage(`GitReqD: File already exists: ${trimmedId}${REQUIREMENT_FILE_EXTENSION}`);
        return;
      } catch {
        // file does not exist, ok to create
      }
      const content = newRequirementYamlTemplate(trimmedId);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Active });
      log(`[Gitreqd] Created requirement: ${filePath}`);
    }
  );

  context.subscriptions.push(
    documentLinkProvider,
    definitionProvider,
    openPreviewCommand,
    newRequirementCommand
  );
}

export function deactivate(): void {}
