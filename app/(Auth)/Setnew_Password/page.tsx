"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthStudentIllustration from "@/components/auth/AuthStudentIllustration";
import { AUTH_ROUTES } from "@/src/lib/authFlow";
import { getSupabaseBrowserClient } from "@/src/lib/supabaseBrowser";

function getTokensFromHash() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash; // like: #access_token=...&refresh_token=...
  if (!hash || !hash.includes("access_token")) return null;

  const params = new URLSearchParams(hash.replace("#", ""));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

export default function SetNewPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [ready, setReady] = useState(false);

  // Ensure we have a recovery session from the email link
  useEffect(() => {
    let mounted = true;

    async function init() {
      setMessage("");
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (mounted) {
          setMessage("Supabase keys are missing. Please configure your environment variables.");
        }
        return;
      }

      // 1) Try normal session
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (mounted) setReady(true);
        return;
      }

      // 2) App Router recovery links can include an auth code in the query string.
      const code =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("code")
          : null;
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (mounted) {
            setReady(false);
            setMessage(
              "Reset link is invalid or expired. Please request a new password reset email."
            );
          }
          return;
        }
        if (mounted) setReady(true);
        return;
      }

      // 3) If not, try to read tokens from URL hash and set session
      const tokens = getTokensFromHash();
      if (tokens) {
        const { error } = await supabase.auth.setSession(tokens);
        if (error) {
          if (mounted) {
            setReady(false);
            setMessage(
              "Session missing. Please open the reset link from your email again (it may have expired)."
            );
          }
          return;
        }
        if (mounted) setReady(true);
        return;
      }

      // 4) No session and no tokens => user opened page directly
      if (mounted) {
        setReady(false);
        setMessage(
          "Session missing. Please open the reset link from your email again (it may have expired)."
        );
      }
    }

    void init();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleUpdatePassword() {
    if (!ready) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase keys are missing. Please configure your environment variables.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated successfully. Redirecting...");
    setLoading(false);

    // Optional: go to login page
    setTimeout(() => router.push(AUTH_ROUTES.login), 800);
  }

  return (
    <div className="min-h-screen bg-transparent">
      <main className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center px-6 py-16 md:px-20">
        <div className="grid w-full grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Left Card */}
          <section className="flex justify-center lg:justify-start">
            <div className="auth-panel auth-delay-1 surface-card flex w-full max-w-[520px] min-h-[560px] flex-col rounded-3xl px-10 py-14 md:px-12">
              <h1 className="text-center text-4xl font-semibold text-zinc-900">
                Set new password
              </h1>

              <div className="mt-5 text-center text-sm text-zinc-400">
                Enter your new password below.
              </div>

              <div className="auth-form-stack mt-10 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-600">New password</p>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    type="password"
                    className="h-12 w-full rounded-full border border-zinc-200 bg-white px-5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-600">
                    Confirm password
                  </p>
                  <input
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm password"
                    type="password"
                    className="h-12 w-full rounded-full border border-zinc-200 bg-white px-5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={loading || !ready}
                  className="mt-3 h-11 w-full rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update password"}
                </button>

                {message && (
                  <p
                    className={`mt-3 text-center text-sm ${
                      message.toLowerCase().includes("success")
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {message}
                  </p>
                )}

                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-400">
                  <span>Back to</span>
                  <Link
                    href={AUTH_ROUTES.login}
                    className="font-semibold underline underline-offset-2 hover:text-zinc-600"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Right Illustration */}
          <AuthStudentIllustration alt="Student finishing a password reset" />
        </div>
      </main>
    </div>
  );
}
