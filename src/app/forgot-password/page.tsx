import EmailRequestForm from "@/components/auth/EmailRequestForm";

export default function ForgotPasswordPage() {
  return <main className="container-page grid min-h-[65vh] place-items-center py-10"><EmailRequestForm kind="forgot" /></main>;
}
