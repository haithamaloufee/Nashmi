import { ok } from "@/lib/apiResponse";

export async function POST() {
  return ok({
    accepted: true,
    message: "تفعيل البريد يحتاج مزود بريد ورموز آمنة. لم يتم تنفيذ تفعيل تجريبي غير آمن في هذا الإصدار."
  });
}
