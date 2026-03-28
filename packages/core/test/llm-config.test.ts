import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DEFAULT_CLAUDE_MODEL,
  ollamaModelMatchesTag,
  parseLlmConfig,
  validateLlmForUse,
} from "../src/llm-config.js";
import { ROOT_MARKER } from "../src/discovery.js";

describe("GRD-SYS-012 / GRD-SYS-013 / GRD-SYS-014: llm-config", () => {
  function makeTempProject(): string {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-llm-"));
    const projectRoot = path.join(tmpDir, "project");
    fs.mkdirSync(projectRoot);
    return projectRoot;
  }

  it("ollamaModelMatchesTag handles :latest suffixes", () => {
    expect(ollamaModelMatchesTag("llama3.2", "llama3.2:latest")).toBe(true);
    expect(ollamaModelMatchesTag("llama3.2", "llama3.2")).toBe(true);
    expect(ollamaModelMatchesTag("mistral", "mistral:7b")).toBe(true);
    expect(ollamaModelMatchesTag("foo", "bar")).toBe(false);
  });

  it("parses claude with default model when model omitted", () => {
    const projectRoot = makeTempProject();
    fs.writeFileSync(
      path.join(projectRoot, ROOT_MARKER),
      ["requirement_dirs:", "  - reqs", "llm:", "  provider: claude", "  api_key_env: TEST_ANTHROPIC_KEY"].join("\n"),
      "utf-8"
    );
    const r = parseLlmConfig(projectRoot);
    expect(r.ok).toBe(true);
    if (r.ok && r.config.provider === "claude") {
      expect(r.config.model).toBe(DEFAULT_CLAUDE_MODEL);
      expect(r.config.api_key_env).toBe("TEST_ANTHROPIC_KEY");
    }
  });

  it("validateLlmForUse fails for claude when env is empty", async () => {
    const projectRoot = makeTempProject();
    fs.writeFileSync(
      path.join(projectRoot, ROOT_MARKER),
      [
        "requirement_dirs:",
        "  - reqs",
        "llm:",
        "  provider: claude",
        "  api_key_env: MISSING_CLAUDE_KEY",
      ].join("\n"),
      "utf-8"
    );
    const prev = process.env.MISSING_CLAUDE_KEY;
    delete process.env.MISSING_CLAUDE_KEY;
    try {
      const r = parseLlmConfig(projectRoot);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const v = await validateLlmForUse(r.config);
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.message).toMatch(/MISSING_CLAUDE_KEY/);
    } finally {
      if (prev !== undefined) process.env.MISSING_CLAUDE_KEY = prev;
    }
  });

  it("invokes warn for unknown keys without failing", () => {
    const projectRoot = makeTempProject();
    fs.writeFileSync(
      path.join(projectRoot, ROOT_MARKER),
      [
        "requirement_dirs:",
        "  - reqs",
        "llm:",
        "  provider: ollama",
        "  model: m",
        "  future_field: true",
      ].join("\n"),
      "utf-8"
    );
    const warnings: string[] = [];
    const r = parseLlmConfig(projectRoot, { warn: (m) => warnings.push(m) });
    expect(r.ok).toBe(true);
    expect(warnings.some((w) => /future_field|Unknown key/i.test(w))).toBe(true);
  });
});
