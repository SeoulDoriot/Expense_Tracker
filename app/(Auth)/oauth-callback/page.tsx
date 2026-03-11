"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthStudentIllustration from "@/components/auth/AuthStudentIllustration";
import { AUTH_ROUTES } from "@/src/lib/authFlow";
import { toFriendlyAuthMessage } from "@/src/lib/authMessages";
import { getSupabaseBrowserClient } from "@/src/lib/supabaseBrowser";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Finishing sign-in...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setErrorMsg(
        "Supabase keys are missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    const client = supabase;

    let active = true;

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active || !session) {
        return;
      }

      router.replace(AUTH_ROUTES.dashboard);
    });

    async function finishOAuth() {
      const url = new URL(window.location.href);
      const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

      if (providerError) {
        if (!active) {
          return;
        }

        setErrorMsg(toFriendlyAuthMessage(providerError));
        return;
      }

      const { data, error } = await client.auth.getSession();

      if (!active) {
        return;
      }

      if (error) {
        setErrorMsg(toFriendlyAuthMessage(error.message));
        return;
      }

      if (data.session) {
        router.replace(AUTH_ROUTES.dashboard);
        return;
      }

      setMessage("Waiting for your provider to confirm sign-in...");

      window.setTimeout(async () => {
        const retry = await client.auth.getSession();

        if (!active) {
          return;
        }

        if (retry.data.session) {
          router.replace(AUTH_ROUTES.dashboard);
          return;
        }

        if (retry.error) {
          setErrorMsg(toFriendlyAuthMessage(retry.error.message));
          return;
        }

        setErrorMsg("Social sign-in did not complete. Please try again.");
      }, 1200);
    }

    void finishOAuth();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-transparent">
      <main className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center px-6 py-16 md:px-20">
        <div className="grid w-full grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <section className="flex justify-center lg:justify-start">
            <div className="auth-panel auth-delay-1 surface-card flex w-full max-w-[520px] min-h-[520px] flex-col justify-center rounded-3xl px-10 py-14 md:px-12">
              <div className="auth-form-stack text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                </div>

                <h1 className="mt-6 text-3xl font-semibold text-zinc-900">
                  Connecting account
                </h1>

                <p className="mt-3 text-sm text-zinc-500">
                  {errorMsg ? errorMsg : message}
                </p>

                {errorMsg ? (
                  <div className="mt-6 text-sm">
                    <Link
                      href={AUTH_ROUTES.login}
                      className="font-semibold text-zinc-900 underline underline-offset-2"
                    >
                      Back to login
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <AuthStudentIllustration alt="Student waiting for social sign-in to finish" />
        </div>
      </main>
    </div>
  );
}
