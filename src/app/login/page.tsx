import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginCard } from "@/components/LoginCard";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

// Auth.js passes an absolute callbackUrl; keep only its path so redirects stay on-site.
function safeCallbackUrl(value: string | undefined) {
  if (!value) {
    return "/";
  }
  try {
    const { pathname, search } = new URL(value, "http://localhost");
    return pathname === "/login" ? "/" : `${pathname}${search}`;
  } catch {
    return "/";
  }
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense fallback={null}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: LoginPageProps) {
  await connection();
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const session = await auth();
  if (session?.user) {
    redirect(callbackUrl);
  }

  return <LoginCard callbackUrl={callbackUrl} hasError={Boolean(params.error)} />;
}
