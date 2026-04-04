import { Suspense } from "react";
import { BrowserApp } from "@/components/BrowserApp";

/** GRD-UI-004: Next.js App Router shell for the browser UI. */
export default function HomePage() {
  return (
    <Suspense fallback={<div className="status">Loading…</div>}>
      <BrowserApp />
    </Suspense>
  );
}
