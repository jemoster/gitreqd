"use client";

/**
 * GRD-UI-001 + GRD-UI-003 + GRD-UI-004: Split-pane browser UI (Next.js App Router + React).
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ApiRequirement = {
  id: string;
  title: string;
  category?: string[];
  description?: string;
  attributes?: Record<string, unknown>;
  links?: Array<Record<string, unknown>>;
  parameters?: Record<string, unknown>;
};

async function apiJson(
  path: string,
  options?: RequestInit & { headers?: HeadersInit }
): Promise<unknown> {
  const res = await fetch(path, options);
  const body: unknown = await res.json();
  if (!res.ok) {
    const err = body as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `HTTP ${res.status}`);
  }
  return body;
}

function computeRelations(requirements: ApiRequirement[]) {
  const ids = new Set(requirements.map((r) => r.id));
  const childrenByParent = new Map<string, string[]>();
  const incoming = new Set<string>();
  for (const r of requirements) {
    for (const link of r.links ?? []) {
      if (link && typeof link === "object" && typeof (link as { satisfies?: string }).satisfies === "string") {
        const parentId = (link as { satisfies: string }).satisfies;
        if (!ids.has(parentId)) continue;
        incoming.add(r.id);
        if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
        childrenByParent.get(parentId)!.push(r.id);
      }
    }
  }
  return { childrenByParent, incoming };
}

function groupRootsByDirectory(requirements: ApiRequirement[], incoming: Set<string>) {
  const groups = new Map<string, string[]>();
  const add = (r: ApiRequirement) => {
    const key = (r.category ?? []).join("/") || "(root)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r.id);
  };
  for (const r of requirements) {
    if (incoming.has(r.id)) continue;
    add(r);
  }
  if (groups.size === 0) {
    for (const r of requirements) add(r);
  }
  return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

export type BrowserAppProps = {
  /** Shown when a user label is provided (e.g. signed-in or test mode). */
  userLabel?: string;
  showLogout?: boolean;
};

export function BrowserApp({ userLabel, showLogout = true }: BrowserAppProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requirements, setRequirements] = useState<ApiRequirement[]>([]);
  const byId = useMemo(() => new Map(requirements.map((r) => [r.id, r])), [requirements]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [expandedReqs, setExpandedReqs] = useState<Set<string>>(new Set());
  const [statusCount, setStatusCount] = useState<number | null>(null);
  const [statusValidation, setStatusValidation] = useState<{ ok: boolean; text: string }>({
    ok: true,
    text: "Validation: -",
  });
  const [detailHtml, setDetailHtml] = useState<string>("");

  const refreshDetail = useCallback(async (id: string) => {
    const rendered = (await apiJson(`/api/requirements/${encodeURIComponent(id)}/rendered-detail`)) as {
      html: string;
    };
    setDetailHtml(rendered.html ?? "");
  }, []);

  const loadData = useCallback(
    async (keepId?: string | null) => {
      const data = (await apiJson("/api/requirements")) as { requirements: ApiRequirement[] };
      const list = data.requirements ?? [];
      setRequirements(list);
      setExpandedDirs((prev) => {
        if (prev.size > 0) return prev;
        const next = new Set<string>();
        for (const r of list) {
          next.add((r.category ?? []).join("/") || "(root)");
        }
        return next;
      });

      const urlId = searchParams.get("req")?.trim() || null;
      const selected =
        (keepId && list.some((r) => r.id === keepId) ? keepId : null) ??
        (urlId && list.some((r) => r.id === urlId) ? urlId : null) ??
        null;
      setSelectedId(selected);
      if (selected) {
        const p = new URLSearchParams(searchParams.toString());
        p.set("req", selected);
        router.replace(`/?${p.toString()}`, { scroll: false });
        await refreshDetail(selected);
      } else {
        setDetailHtml("");
      }

      const st = (await apiJson("/api/status")) as {
        requirementCount: number;
        errors: unknown[];
      };
      setStatusCount(st.requirementCount);
      const hasErrors = Boolean(st.errors?.length);
      setStatusValidation({
        ok: !hasErrors,
        text: hasErrors ? `Validation: ${st.errors.length} error(s)` : "Validation: OK",
      });
    },
    [refreshDetail, router, searchParams]
  );

  useEffect(() => {
    void loadData(searchParams.get("req"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial project load only
  }, []);

  useEffect(() => {
    if (requirements.length === 0) return;
    const id = searchParams.get("req")?.trim();
    if (!id || !byId.has(id)) return;
    if (id !== selectedId) {
      setSelectedId(id);
      void refreshDetail(id);
    }
  }, [searchParams, requirements.length, byId, selectedId, refreshDetail]);

  const selectRequirement = useCallback(
    async (id: string) => {
      if (!byId.has(id)) return;
      setSelectedId(id);
      const p = new URLSearchParams(searchParams.toString());
      p.set("req", id);
      router.push(`/?${p.toString()}`, { scroll: false });
      await refreshDetail(id);
    },
    [byId, refreshDetail, router, searchParams]
  );

  useEffect(() => {
    const divider = document.getElementById("sidebar-divider");
    if (!divider) return;
    let resizing = false;
    const minWidth = 260;
    const maxWidth = 640;
    const down = () => {
      resizing = true;
    };
    const up = () => {
      resizing = false;
    };
    const move = (ev: MouseEvent) => {
      if (!resizing) return;
      const next = Math.max(minWidth, Math.min(maxWidth, ev.clientX));
      document.documentElement.style.setProperty("--sidebar-width", `${next}px`);
    };
    divider.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move);
    return () => {
      divider.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("mousemove", move);
    };
  }, []);

  const onDetailClick = useCallback(
    (ev: React.MouseEvent<HTMLDivElement>) => {
      const target = ev.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href^='#']");
      if (!link) return;
      const href = link.getAttribute("href") ?? "";
      const id = href.startsWith("#") ? href.slice(1) : "";
      if (!id || !byId.has(id)) return;
      ev.preventDefault();
      void selectRequirement(id);
    },
    [byId, selectRequirement]
  );

  const rel = useMemo(() => computeRelations(requirements), [requirements]);
  const groups = useMemo(
    () => groupRootsByDirectory(requirements, rel.incoming),
    [requirements, rel.incoming]
  );

  const req = selectedId ? byId.get(selectedId) : undefined;

  return (
    <>
      <div className="status">
        <span className="status-title">gitreqd browser</span>
        {userLabel ? (
          <span className="status-meta status-user">
            {userLabel}
            {showLogout ? (
              <>
                {" "}
                <a href="/auth/logout">Sign out</a>
              </>
            ) : null}
          </span>
        ) : null}
        <span className="status-meta">Requirements: {statusCount ?? "-"}</span>
        <span className={`status-meta${statusValidation.ok ? "" : " error"}`}>{statusValidation.text}</span>
      </div>
      <div className="layout">
        <aside className="left">
          <div className="controls" />
          <div id="tree-root">
            <ul>
              {[...groups.entries()].map(([dir, ids]) => (
                <li key={dir}>
                  <div className="tree-row">
                    <button
                      type="button"
                      className="tree-row-btn"
                      onClick={() => {
                        setExpandedDirs((prev) => {
                          const n = new Set(prev);
                          if (n.has(dir)) n.delete(dir);
                          else n.add(dir);
                          return n;
                        });
                      }}
                    >
                      <span className="tree-icon">{expandedDirs.has(dir) ? "▾" : "▸"}</span>
                      <span className="tree-select">{dir}</span>
                    </button>
                  </div>
                  {expandedDirs.has(dir) && (
                    <ul>
                      {ids
                        .slice()
                        .sort()
                        .map((id) => (
                          <li key={id}>
                            <TreeReqNode
                              id={id}
                              childrenByParent={rel.childrenByParent}
                              byId={byId}
                              selectedId={selectedId}
                              expandedReqs={expandedReqs}
                              setExpandedReqs={setExpandedReqs}
                              onSelect={(rid) => void selectRequirement(rid)}
                            />
                          </li>
                        ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <div
          id="sidebar-divider"
          className="divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
        />
        <main className="right">
          <div id="detail-root">
            {!req ? (
              <p>Select a requirement.</p>
            ) : (
              <>
                <div
                  className="detail-report"
                  dangerouslySetInnerHTML={{ __html: detailHtml }}
                  onClick={onDetailClick}
                />
                <LinkEditor
                  requirement={req}
                  onChanged={() => void loadData(req.id)}
                />
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function TreeReqNode({
  id,
  childrenByParent,
  byId,
  selectedId,
  expandedReqs,
  setExpandedReqs,
  onSelect,
}: {
  id: string;
  childrenByParent: Map<string, string[]>;
  byId: Map<string, ApiRequirement>;
  selectedId: string | null;
  expandedReqs: Set<string>;
  setExpandedReqs: Dispatch<SetStateAction<Set<string>>>;
  onSelect: (id: string) => void;
}) {
  const r = byId.get(id);
  if (!r) return null;
  const kids = (childrenByParent.get(id) ?? []).slice().sort();
  const expanded = expandedReqs.has(id);
  return (
    <div>
      <div className="tree-row">
        <button
          type="button"
          className={`tree-row-btn${selectedId === r.id ? " active" : ""}`}
          onClick={() => onSelect(r.id)}
        >
          <span
            className="tree-icon"
            onClick={(ev) => {
              ev.stopPropagation();
              if (!kids.length) return;
              setExpandedReqs((prev) => {
                const n = new Set(prev);
                if (n.has(id)) n.delete(id);
                else n.add(id);
                return n;
              });
            }}
            title={kids.length ? (expanded ? "Collapse" : "Expand") : undefined}
          >
            {kids.length ? (expanded ? "▾" : "▸") : " "}
          </span>
          <span className="tree-select">
            <span className="req-id">{r.id}</span>
            <span className="req-title">{r.title}</span>
          </span>
        </button>
      </div>
      {kids.length > 0 && expanded && (
        <ul>
          {kids.map((childId) => (
            <li key={childId}>
              <TreeReqNode
                id={childId}
                childrenByParent={childrenByParent}
                byId={byId}
                selectedId={selectedId}
                expandedReqs={expandedReqs}
                setExpandedReqs={setExpandedReqs}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LinkEditor({
  requirement,
  onChanged,
}: {
  requirement: ApiRequirement;
  onChanged: () => void;
}) {
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");

  const remove = async (link: Record<string, unknown>) => {
    await apiJson(`/api/requirements/${encodeURIComponent(requirement.id)}/links`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "remove", link }),
    });
    onChanged();
  };

  const add = async () => {
    const key = keyInput.trim();
    const value = valueInput.trim();
    if (!key || !value) return;
    const link: Record<string, unknown> = { [key]: value };
    await apiJson(`/api/requirements/${encodeURIComponent(requirement.id)}/links`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "add", link }),
    });
    setKeyInput("");
    setValueInput("");
    onChanged();
  };

  return (
    <div className="section">
      <h3>Edit links</h3>
      <div>
        {(requirement.links ?? []).map((link, i) => (
          <span key={i} className="chip mono">
            {JSON.stringify(link)}
            <button type="button" onClick={() => void remove(link as Record<string, unknown>)}>
              x
            </button>
          </span>
        ))}
      </div>
      <div>
        <input
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="key"
          aria-label="Link key"
        />
        <input
          value={valueInput}
          onChange={(e) => setValueInput(e.target.value)}
          placeholder="value"
          aria-label="Link value"
        />
        <button type="button" onClick={() => void add()}>
          Add link
        </button>
      </div>
    </div>
  );
}
