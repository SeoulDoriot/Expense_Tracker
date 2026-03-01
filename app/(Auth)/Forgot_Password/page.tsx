"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";

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

    // IMPORTANT: This must match your Set New Password route
    // Example: app/(Auth)/Setnew_Password/page.tsx => /Setnew_Password
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/Setnew_Password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Reset link sent. Please check your email.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#fbfbfb]">
      <main className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center px-6 py-16 md:px-20">
        <div className="grid w-full grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Left Card */}
          <section className="flex justify-center lg:justify-start">
            <div className="flex w-full max-w-[520px] min-h-[560px] flex-col rounded-3xl bg-white px-10 py-14 md:px-12 shadow-[0_30px_90px_rgba(0,0,0,0.12)] ring-1 ring-zinc-100">
              <h1 className="text-center text-4xl font-semibold text-zinc-900">
                Forgot password
              </h1>

              <div className="mt-5 text-center text-sm text-zinc-400">
                Enter your email and we’ll send you a reset link.
              </div>

              <div className="mt-10 space-y-4">
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
                    href="/Log_in"
                    className="font-semibold underline underline-offset-2 hover:text-zinc-600"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Right Illustration */}
          <section className="relative flex justify-center">
            <div className="relative hidden min-h-[700px] bottom-20 justify-end items-end lg:flex">
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