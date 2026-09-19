import VerifyEmailClient from "@/components/auth/VerifyEmailClient";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string; sent?: string }> }) {
  const params = await searchParams;
  return <main className="container-page grid min-h-[65vh] place-items-center py-10"><VerifyEmailClient token={params.token || ""} email={params.email || ""} sent={params.sent === "1"} /></main>;
}
