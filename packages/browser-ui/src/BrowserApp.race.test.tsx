/** @jest-environment jsdom */

/**
 * Regression test for overlapping `loadData` runs: when two `/api/requirements` fetches
 * overlap and the older run finishes last, the UI must not revert `req` in the URL.
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useState } from "react";

const mockReplace = jest.fn();
const mockPush = jest.fn();

/** Stable mock: parent assigns current URLSearchParams each render (matches Next behavior). */
let mockSearchParams = new URLSearchParams("req=GRD-GIT-001");

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: (...args: unknown[]) => mockReplace(...args),
    push: (...args: unknown[]) => mockPush(...args),
  }),
  useSearchParams: () => mockSearchParams,
}));

import { BrowserApp } from "./BrowserApp";

const LIST_PAYLOAD = {
  requirements: [
    { id: "GRD-GIT-001", title: "First" },
    { id: "GRD-GIT-003", title: "Third" },
  ],
  loadedRevision: null,
};

function mkJsonResponse(data: unknown): Response {
  return {
    ok: true,
    json: async () => data,
  } as Response;
}

function RaceHarness() {
  const [params, setParams] = useState(() => new URLSearchParams("req=GRD-GIT-001"));
  mockSearchParams = params;

  return (
    <>
      <BrowserApp />
      <button
        type="button"
        data-testid="switch-req"
        onClick={() => {
          const next = new URLSearchParams();
          next.set("req", "GRD-GIT-003");
          setParams(next);
        }}
      >
        switch
      </button>
    </>
  );
}

describe("BrowserApp requirement load race", () => {
  let fetchMock: jest.Mock;
  let requirementResolveOrder: Array<(r: Response) => void>;

  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams("req=GRD-GIT-001");
    requirementResolveOrder = [];

    fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : input.href;
      const path = new URL(url, "http://local.test").pathname;

      if (url.includes("/rendered-detail")) {
        return Promise.resolve(mkJsonResponse({ html: "<p>x</p>" }));
      }
      if (/\/api\/requirements\/[^/]+\/links/.test(path)) {
        return Promise.resolve(mkJsonResponse({}));
      }
      if (path === "/api/requirements") {
        return new Promise<Response>((resolve) => {
          requirementResolveOrder.push(resolve);
        });
      }
      if (path === "/api/status") {
        return Promise.resolve(mkJsonResponse({ requirementCount: 2, errors: [] }));
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    global.fetch = fetchMock as typeof fetch;
  });

  it("keeps the latest req in the URL when an older loadData completes last", async () => {
    render(<RaceHarness />);

    await waitFor(() => {
      expect(requirementResolveOrder.length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByTestId("switch-req"));

    await waitFor(() => {
      expect(requirementResolveOrder.length).toBe(2);
    });

    // Newer navigation completes first (simulates slow network for the first fetch).
    requirementResolveOrder[1](mkJsonResponse(LIST_PAYLOAD));
    await waitFor(() => expect(mockReplace.mock.calls.length).toBeGreaterThan(0));

    const replaceCallsAfterNewerLoad = mockReplace.mock.calls.length;
    const urlAfterNewerLoad = String(mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0]);
    expect(urlAfterNewerLoad).toContain("req=GRD-GIT-003");

    requirementResolveOrder[0](mkJsonResponse(LIST_PAYLOAD));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReplace.mock.calls.length).toBe(replaceCallsAfterNewerLoad);

    const last = String(mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0]);
    expect(last).toContain("req=GRD-GIT-003");
  });
});
