import Link from "next/link";
import AuthForm from "@/components/auth/AuthForm";
import { I18nText } from "@/components/i18n/LanguageProvider";

export default function LoginPage() {
  return (
    <main className="container-page py-8">
      <AuthForm mode="login" />
      <p className="mt-4 text-center text-sm text-ink/60">
        <I18nText id="auth.noAccount" /> <Link className="font-semibold text-civic" href="/signup"><I18nText id="auth.signup" /></Link>
      </p>
    </main>
  );
}
