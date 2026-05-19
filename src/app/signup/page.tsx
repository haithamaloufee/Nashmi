import Link from "next/link";
import AuthForm from "@/components/auth/AuthForm";
import { I18nText } from "@/components/i18n/LanguageProvider";

export default function SignupPage() {
  return (
    <main className="container-page py-8">
      <AuthForm mode="signup" />
      <p className="mt-4 text-center text-sm text-ink/60">
        <I18nText id="auth.haveAccount" /> <Link className="font-semibold text-civic" href="/login"><I18nText id="auth.login" /></Link>
      </p>
    </main>
  );
}
