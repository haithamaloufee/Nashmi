import type { ReactNode } from "react";

export default function Alert({ children }: { children: ReactNode }) {
  return <div className="rounded border border-civic/30 bg-civic/10 p-4 text-sm text-ink">{children}</div>;
}
