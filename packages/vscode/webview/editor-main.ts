/**
 * GRD-VSC-006: WYSIWYG editing for refinement and rationale; plain text for require in the preview webview.
 */
import Editor from "@toast-ui/editor";

declare function acquireVsCodeApi(): { postMessage: (msg: unknown) => void };

type MarkdownField = "refinement" | "rationale";

interface BootstrapPayload {
  fields: Record<string, string | undefined>;
}

const vscode = acquireVsCodeApi();

const editors: Partial<Record<MarkdownField, Editor>> = {};

function debounce(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

function mountRequireEditor(value: string): void {
  const container = document.querySelector('[data-gitreqd-field="require"]');
  if (!container || !(container instanceof HTMLElement)) return;

  container.innerHTML = "";
  const textarea = document.createElement("textarea");
  textarea.className = "gitreqd-require-editor";
  textarea.value = value;
  textarea.rows = 3;
  textarea.style.width = "100%";
  textarea.style.boxSizing = "border-box";
  textarea.style.fontFamily = "inherit";
  textarea.style.fontSize = "inherit";
  textarea.style.resize = "vertical";

  const notify = debounce(() => {
    vscode.postMessage({
      type: "fieldEdit",
      field: "require",
      value: textarea.value,
    });
  }, 280);

  textarea.addEventListener("input", () => notify());
  container.appendChild(textarea);
}

function mountEditors(payload: BootstrapPayload): void {
  const fields = payload.fields;
  if (fields.require !== undefined) {
    mountRequireEditor(fields.require);
  }

  const keys: MarkdownField[] = ["refinement", "rationale"];
  for (const key of keys) {
    const raw = fields[key];
    if (raw === undefined) continue;
    const container = document.querySelector(`[data-gitreqd-field="${key}"]`);
    if (!container || !(container instanceof HTMLElement)) continue;

    container.innerHTML = "";

    const fieldKey = key;
    const notify = debounce(() => {
      const ed = editors[fieldKey];
      if (!ed) return;
      vscode.postMessage({
        type: "fieldEdit",
        field: fieldKey,
        value: ed.getMarkdown(),
      });
    }, 280);

    const editor = new Editor({
      el: container,
      initialEditType: "wysiwyg",
      initialValue: raw,
      hideModeSwitch: true,
      usageStatistics: false,
      autofocus: false,
      useCommandShortcut: false,
      minHeight: "140px",
      events: {
        change: () => {
          notify();
        },
      },
    });
    editors[key] = editor;
  }
}

function readBootstrap(): BootstrapPayload {
  const el = document.getElementById("gitreqd-bootstrap");
  if (!el?.textContent) {
    return { fields: {} };
  }
  return JSON.parse(el.textContent) as BootstrapPayload;
}

mountEditors(readBootstrap());

window.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data as { type?: string; fields?: Record<string, string> };
  if (msg?.type !== "syncFields" || !msg.fields) return;
  const root = document.scrollingElement ?? document.documentElement;
  const scrollTop = root.scrollTop;
  const scrollLeft = root.scrollLeft;
  let applied = false;

  if (typeof msg.fields.require === "string") {
    const container = document.querySelector('[data-gitreqd-field="require"]');
    const textarea = container?.querySelector("textarea.gitreqd-require-editor");
    if (textarea instanceof HTMLTextAreaElement && textarea.value !== msg.fields.require) {
      textarea.value = msg.fields.require;
      applied = true;
    }
  }

  for (const key of Object.keys(msg.fields) as MarkdownField[]) {
    const ed = editors[key];
    const next = msg.fields[key];
    if (!ed || typeof next !== "string") continue;
    if (ed.getMarkdown() !== next) {
      ed.setMarkdown(next, false);
      applied = true;
    }
  }
  if (applied) {
    requestAnimationFrame(() => {
      root.scrollTop = scrollTop;
      root.scrollLeft = scrollLeft;
    });
  }
});
