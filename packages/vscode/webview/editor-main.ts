/**
 * GRD-VSC-006: WYSIWYG editing for description and rationale in the preview webview (raw Markdown in the YAML editor).
 */
import Editor from "@toast-ui/editor";

declare function acquireVsCodeApi(): { postMessage: (msg: unknown) => void };

type MarkdownField = "description" | "rationale";

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

function mountEditors(payload: BootstrapPayload): void {
  const fields = payload.fields;
  const keys: MarkdownField[] = ["description", "rationale"];
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
  for (const key of Object.keys(msg.fields) as MarkdownField[]) {
    const ed = editors[key];
    const next = msg.fields[key];
    if (!ed || typeof next !== "string") continue;
    if (ed.getMarkdown() !== next) {
      /* cursorToEnd=false avoids focusing the webview / stealing input from the YAML editor (host sync). */
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
