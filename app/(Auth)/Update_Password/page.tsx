"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [ready, setReady] = useState<boolean>(false);

  // When user clicks Supabase reset link, Supabase usually opens a recovery session.
  // We check session here to know if the link is valid.
  useEffect(() => {
    let alive = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!alive) return;

      if (error) {
        setMessage(error.message);
        setReady(true);
        return;
      }

      const session = data.session;
      setEmail(session?.user?.email ?? "");
      setReady(true);

      if (!session) {
        setMessage(
          "Session missing. Please open the reset link from your email again (it may have expired)."
        );
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    if (!ready) return false;
    if (!password || !confirmPassword) return false;
    if (password.length < 6) return false;
    if (password !== confirmPassword) return false;
    return true;
  }, [ready, password, confirmPassword]);

  async function handleUpdatePassword() {
    setMessage("");

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    // Must still have recovery session
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setMessage(
        "Session missing. Please open the reset link from your email again (it may have expired)."
      );
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated successfully. Redirecting to login...");

    // Optional: sign out recovery session so user logs in normally
    await supabase.auth.signOut();

    setLoading(false);

    // Go to your login page route
    router.push("/Log_in");
  }

  return (
    <div className="min-h-screen bg-[#fbfbfb]">
      <main className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center px-6 py-16 md:px-20">
        <div className="grid w-full grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Left Card */}
          <section className="flex justify-center lg:justify-start">
            <div className="flex w-full max-w-[520px] min-h-[560px] flex-col rounded-3xl bg-white px-10 py-14 md:px-12 shadow-[0_30px_90px_rgba(0,0,0,0.12)] ring-1 ring-zinc-100">
              <h1 className="text-center text-4xl font-semibold text-zinc-900">
                Set new password
              </h1>

              <div className="mt-5 text-center text-sm text-zinc-400">
                {email ? (
                  <>
                    For: <span className="font-medium text-zinc-700">{email}</span>
                  </>
                ) : (
                  "Create a new password for your account."
                )}
              </div>

              <div className="mt-10 space-y-4">
                {/* New password */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-600">New password</p>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    type="password"
                    className="h-12 w-full rounded-full border border-zinc-200 bg-white px-5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-600">Confirm password</p>
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    type="password"
                    className="h-12 w-full rounded-full border border-zinc-200 bg-white px-5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={!canSubmit || loading}
                  className="mt-3 h-11 w-full rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update password"}
                </button>

                {message && (
                  <p
                    className={`mt-3 text-center text-sm ${
                      message.toLowerCase().includes("success") ||
                      message.toLowerCase().includes("redirecting")
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
                    href="/Log_in"
                    className="font-semibold underline underline-offset-2 hover:text-zinc-600"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Right Illustration (same style as your OTP page) */}
          <section className="relative flex justify-center">
            <div className="relative hidden min-h-[700px] bottom-20 justify-end items-end lg:flex">
              {/* Big circle background */}
              <div className="absolute -right-10 bottom-0 h-[600px] w-[380px] rounded-full bg-[#E5E5E5] -translate-y-6" />

              <Image
                src="/student.png"
                alt="Student"
                width={520}
                height={760}
                className="relative z-10 object-contain -translate-y-6 right-6"
                priority
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}