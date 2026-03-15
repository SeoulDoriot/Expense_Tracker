"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthStudentIllustration from "@/components/auth/AuthStudentIllustration";
import { AUTH_ROUTES } from "@/src/lib/authFlow";
import { getSupabaseBrowserClient } from "@/src/lib/supabaseBrowser";
import { toFriendlyAuthMessage } from "@/src/lib/authMessages";

type PasswordMode = "social-signup" | "account";

function getPageCopy(mode: PasswordMode) {
  if (mode === "social-signup") {
    return {
      title: "Create your password",
      subtitle:
        "Your Google account is ready. Add a password now so you can log in with either Google or email/password later.",
      button: "Save password and continue",
      success: "Password saved. Redirecting to your dashboard...",
    };
  }

  return {
    title: "Update password",
    subtitle:
      "Set or change your password while you are signed in. You can still keep using Google too.",
    button: "Update password",
    success: "Password updated. Redirecting to your dashboard...",
  };
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") === "social-signup" ? "social-signup" : "account") as PasswordMode;
  const copy = useMemo(() => getPageCopy(mode), [mode]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadSession() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (alive) {
          setReady(false);
          setMessage("Supabase keys are missing. Please configure your environment variables.");
        }
        return;
      }

      const sessionResult = await supabase.auth.getSession();
      if (!alive) {
        return;
      }

      if (sessionResult.error) {
        setReady(false);
        setMessage(toFriendlyAuthMessage(sessionResult.error.message));
        return;
      }

      const user = sessionResult.data.session?.user;
      if (!user) {
        setReady(false);
        setMessage("Please sign in first, or use Forgot Password if you already have an account.");
        return;
      }

      setEmail(user.email ?? "");
      setReady(true);
      setMessage("");
    }

    void loadSession();

    return () => {
      alive = false;
    };
  }, []);

  const canSubmit =
    ready &&
    !loading &&
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    password === confirmPassword;

  async function handleUpdatePassword() {
    if (!canSubmit) {
      if (password.length < 6) {
        setMessage("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
      }
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase keys are missing. Please configure your environment variables.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setMessage(toFriendlyAuthMessage(error.message));
      return;
    }

    setLoading(false);
    setMessage(copy.success);
    window.setTimeout(() => router.replace(AUTH_ROUTES.dashboard), 700);
  }

  return (
    <div className="min-h-screen bg-transparent">
      <main className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center px-6 py-16 md:px-20">
        <div className="grid w-full grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <section className="flex justify-center lg:justify-start">
            <div className="auth-panel auth-delay-1 surface-card flex w-full max-w-[520px] min-h-[560px] flex-col rounded-3xl px-10 py-14 md:px-12">
              <h1 className="text-center text-4xl font-semibold text-zinc-900">{copy.title}</h1>

              <div className="mt-5 text-center text-sm text-zinc-400">
                <p>{copy.subtitle}</p>
                {email ? (
                  <p className="mt-2">
                    Signed in as <span className="font-medium text-zinc-700">{email}</span>
                  </p>
                ) : null}
              </div>

              <div className="mt-10 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-600">New password</p>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter a password"
                    type="password"
                    className="h-12 w-full rounded-full border border-zinc-200 bg-white px-5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-600">Confirm password</p>
                  <input
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm your password"
                    type="password"
                    className="h-12 w-full rounded-full border border-zinc-200 bg-white px-5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={!ready || loading}
                  className="mt-3 h-11 w-full rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Saving..." : copy.button}
                </button>

                {message ? (
                  <p
                    className={`mt-3 text-center text-sm ${
                      message.toLowerCase().includes("redirecting") ||
                      message.toLowerCase().includes("updated") ||
                      message.toLowerCase().includes("saved")
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {message}
                  </p>
                ) : null}

                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-400">
                  <span>Need another option?</span>
                  <Link
                    href={AUTH_ROUTES.emailContinue}
                    className="font-semibold underline underline-offset-2 hover:text-zinc-600"
                  >
                    Continue with email code
                  </Link>
                </div>

                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-zinc-400">
                  <span>Forgot the password later?</span>
                  <Link
                    href={AUTH_ROUTES.forgotPassword}
                    className="font-semibold underline underline-offset-2 hover:text-zinc-600"
                  >
                    Reset it here
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <AuthStudentIllustration alt="Student setting a password for account access" />
        </div>
      </main>
    </div>
  );
}
