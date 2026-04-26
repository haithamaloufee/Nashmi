import Link from "next/link";
import AuthForm from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <main className="container-page py-8">
      <AuthForm mode="login" />
      <p className="mt-4 text-center text-sm text-ink/60">
        لا تملك حسابا؟ <Link className="font-semibold text-civic" href="/signup">إنشاء حساب مواطن</Link>
      </p>
    </main>
  );
}
