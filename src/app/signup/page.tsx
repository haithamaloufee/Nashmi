import Link from "next/link";
import AuthForm from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <main className="container-page py-8">
      <AuthForm mode="signup" />
      <p className="mt-4 text-center text-sm text-ink/60">
        لديك حساب؟ <Link className="font-semibold text-civic" href="/login">تسجيل الدخول</Link>
      </p>
    </main>
  );
}
