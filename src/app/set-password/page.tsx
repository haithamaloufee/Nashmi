import PasswordActionForm from "@/components/auth/PasswordActionForm";

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <main className="container-page grid min-h-[65vh] place-items-center py-10"><PasswordActionForm kind="setup" token={params.token || ""} /></main>;
}
