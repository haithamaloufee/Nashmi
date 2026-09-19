"use client";

import dynamic from "next/dynamic";
import type { LawFormData } from "@/components/laws/LawManagementControls";

const LawManagementControls = dynamic(() => import("@/components/laws/LawManagementControls"), {
  ssr: false,
  loading: () => <span className="inline-block min-h-11 min-w-28" aria-hidden="true" />
});

export default function LazyLawManagementControls({ mode, law }: { mode: "create" | "edit"; law?: LawFormData }) {
  return <LawManagementControls mode={mode} law={law} />;
}
