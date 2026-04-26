"use client";

import Link from "next/link";

export function LoginPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <div className="card w-full max-w-md bg-white p-6">
        <h2 className="text-xl font-bold">تسجيل الدخول مطلوب</h2>
        <p className="mt-3 text-ink/70">للحفاظ على نزاهة التفاعل ومنع التكرار، يرجى تسجيل الدخول.</p>
        <div className="mt-5 flex gap-3">
          <Link href="/login" className="rounded bg-civic px-4 py-2 font-semibold text-white">
            تسجيل الدخول
          </Link>
          <button onClick={onClose} className="rounded border border-line px-4 py-2" type="button">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
