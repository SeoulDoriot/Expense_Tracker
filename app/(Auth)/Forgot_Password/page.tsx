"use client";

import { useState } from "react";
import Link from "next/link";
import AuthStudentIllustration from "@/components/auth/AuthStudentIllustration";
import { AUTH_ROUTES } from "@/src/lib/authFlow";
import { toFriendlyAuthMessage } from "@/src/lib/authMessages";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  async function handleSendReset() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setMessage("Please enter your email.");
      return;
    }

    setLoading(true);
    setMessage("");

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: cleanEmail }),
    });
    const result = (await response.json()) as { success: boolean; message: string };

    if (!response.ok || !result.success) {
      setMessage(toFriendlyAuthMessage(result.message || "Unable to send reset email."));
      setLoading(false);
      return;
    }

    setMessage(result.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-transparent">
      <main className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center px-6 py-16 md:px-20">
        <div className="grid w-full grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Left Card */}
          <section className="flex justify-center lg:justify-start">
            <div className="auth-panel auth-delay-1 surface-card flex w-full max-w-[520px] min-h-[560px] flex-col rounded-3xl px-10 py-14 md:px-12">
              <h1 className="text-center text-4xl font-semibold text-zinc-900">
                Forgot password
              </h1>

              <div className="mt-5 text-center text-sm text-zinc-400">
                Enter the exact email you used for your account and we&apos;ll send the reset steps there.
              </div>

              <div className="auth-form-stack mt-10 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-600">Email</p>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="h-12 w-full rounded-full border border-zinc-200 bg-white px-5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendReset}
                  disabled={loading}
                  className="mt-3 h-11 w-full rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>

                {message && (
                  <p
                    className={`mt-3 text-center text-sm ${
                      message.toLowerCase().includes("sent")
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {message}
                  </p>
                )}

                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-400">
                  <span>Remember your password?</span>
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
          <AuthStudentIllustration alt="Student checking a reset email" />
        </div>
      </main>
    </div>
  );
}
