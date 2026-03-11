"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import AuthStudentIllustration from "@/components/auth/AuthStudentIllustration";
import { AUTH_ROUTES, clearPendingSignup, readPendingSignup } from "@/src/lib/authFlow";
import { toFriendlyAuthMessage } from "@/src/lib/authMessages";
import { getSupabaseBrowserClient } from "@/src/lib/supabaseBrowser";

function getTokensFromHash() {
  if (typeof window === "undefined") {
    return null;
  }

  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token")) {
    return null;
  }

  const params = new URLSearchParams(hash.replace("#", ""));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (!access_token || !refresh_token) {
    return null;
  }

  return { access_token, refresh_token };
}

function OTPVerifyInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const email = searchParams.get("email");
  const type = searchParams.get("type") === "recovery" ? "recovery" : "signup";

  const [otp, setOtp] = useState<string[]>(Array(8).fill(""));
  const [message, setMessage] = useState<string>("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [linkModeLoading, setLinkModeLoading] = useState(false);

  // Simple countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Auto-submit when all 8 digits filled
  const finalOtp = useMemo(() => otp.join(""), [otp]);
  useEffect(() => {
    if (finalOtp.length === 8 && !loading) {
      void handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalOtp]);

  async function finalizePendingSignup(supabase: SupabaseClient) {
    const pendingSignup = readPendingSignup();

    if (!pendingSignup?.password) {
      setMessage(
        "Your email was confirmed, but the signup session no longer has your password. Please create your account again from the signup page."
      );
      await supabase.auth.signOut();
      return false;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: pendingSignup.password,
      data: {
        full_name: pendingSignup.fullName,
      },
    });

    if (updateError) {
      setMessage(toFriendlyAuthMessage(updateError.message));
      return false;
    }

    clearPendingSignup();
    return true;
  }

  useEffect(() => {
    if (type !== "signup") {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    const supabaseClient = supabase;

    let mounted = true;

    async function handleLinkConfirmation() {
      const code =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("code")
          : null;

      const tokens = getTokensFromHash();
      const pendingSignup = readPendingSignup();

      if (!code && !tokens) {
        const { data } = await supabaseClient.auth.getSession();
        const sessionEmail = data.session?.user?.email?.toLowerCase();

        if (!data.session || !pendingSignup?.password) {
          return;
        }

        if (email && sessionEmail && sessionEmail !== email.toLowerCase()) {
          return;
        }
      }

      if (!pendingSignup?.password) {
        return;
      }

      setLinkModeLoading(true);
      setMessage("Finishing verification from your email link...");

      if (code) {
        const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
        if (error) {
          if (mounted) {
            setMessage(toFriendlyAuthMessage(error.message));
            setLinkModeLoading(false);
          }
          return;
        }
      } else if (tokens) {
        const { error } = await supabaseClient.auth.setSession(tokens);
        if (error) {
          if (mounted) {
            setMessage(toFriendlyAuthMessage(error.message));
            setLinkModeLoading(false);
          }
          return;
        }
      }

      const completed = await finalizePendingSignup(supabaseClient);
      if (!mounted) {
        return;
      }

      if (!completed) {
        setLinkModeLoading(false);
        return;
      }

      router.replace(AUTH_ROUTES.dashboard);
    }

    void handleLinkConfirmation();

    return () => {
      mounted = false;
    };
  }, [router, type]);

  async function handleVerify() {
    if (!email) {
      setMessage("Email missing. Please go back and request OTP again.");
      return;
    }

    if (finalOtp.length !== 8) return;

    setLoading(true);
    setMessage("");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase keys are missing. Please configure your environment variables.");
      setLoading(false);
      return;
    }

    const verifyType = type === "signup" ? "email" : "recovery";
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: finalOtp,
      type: verifyType,
    });

    if (error) {
      setMessage(toFriendlyAuthMessage(error.message));
      setLoading(false);
      return;
    }

    if (type === "signup") {
      const completed = await finalizePendingSignup(supabase);
      if (!completed) {
        setLoading(false);
        return;
      }
    }

    router.push(AUTH_ROUTES.dashboard);
  }

  async function handleResend() {
    if (!email) {
      setMessage("Email missing. Please go back and request OTP again.");
      return;
    }
    if (cooldown > 0) return;

    setMessage("");
    const response = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: (() => {
        const pendingSignup = readPendingSignup();
        return JSON.stringify({
          email,
          type,
          password: pendingSignup?.password,
          fullName: pendingSignup?.fullName,
        });
      })(),
    });
    const result = (await response.json()) as {
      success: boolean;
      message: string;
    };

    if (!response.ok || !result.success) {
      setMessage(toFriendlyAuthMessage(result.message || "Unable to resend OTP."));
      return;
    }

    setMessage(result.message);
    setOtp(Array(8).fill(""));
    setCooldown(30);

    // focus first box again
    setTimeout(() => {
      document.getElementById("otp-0")?.focus();
    }, 50);
  }

  useEffect(() => {
    if (email) {
      return;
    }

    const pendingSignup = readPendingSignup();
    if (pendingSignup?.email) {
      router.replace(`${AUTH_ROUTES.otpVerify}?email=${encodeURIComponent(pendingSignup.email)}&type=signup`);
    }
  }, [email, router]);

  function setDigit(index: number, value: string) {
    const v = value.replace(/[^0-9]/g, "").slice(0, 1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = v;
      return next;
    });

    if (v && index < 7) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (otp[index]) {
        // clear current digit
        setOtp((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
        return;
      }
      if (index > 0) {
        document.getElementById(`otp-${index - 1}`)?.focus();
      }
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Top nav (same style as your Figma screenshot) */}
      {/* Main layout */}
      <main className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center px-20 py-16">
        <div className="grid w-full grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* OTP Card */}
          <section className="flex justify-center lg:justify-start">
            <div className="auth-panel auth-delay-1 surface-card flex w-full max-w-[520px] min-h-[560px] flex-col rounded-3xl px-10 py-14 md:px-12">
              <div>
                <h1 className="text-center text-4xl font-semibold text-zinc-900">
                  Check your email
                </h1>
              </div>
              <div className="h-8" />
              <div className="auth-form-stack">
                <p className="mt-1 text-center text-sm text-zinc-400">
                  We sent a verification email to{" "}
                  <span className="font-medium text-zinc-700"> {email ?? "your email"}</span>
                  . Enter the 8-digit verification code below to finish verification.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3 md:gap-4">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => setDigit(index, e.target.value)}
                      onKeyDown={(e) => onKeyDown(index, e)}
                      className="h-14 w-14 rounded-2xl border border-zinc-200 bg-white text-center text-xl font-semibold text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 md:h-16 md:w-16 md:text-2xl"
                    />
                  ))}
                </div>

                <div className="mt-5 text-center text-xs text-zinc-500">
                  Didn’t receive code?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0}
                    className="font-semibold text-emerald-600 underline underline-offset-2 disabled:opacity-40"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                  </button>
                </div>

                  {message && (
                  <p
                    className={`mt-5 text-center text-sm ${
                      message.toLowerCase().includes("sent") ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {message}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={loading || linkModeLoading || finalOtp.length !== 8}
                  className="mt-7 h-11 w-full rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading || linkModeLoading
                    ? "Verifying..."
                    : type === "recovery"
                      ? "Continue"
                      : "Verify account"}
                </button>

                <div className="mt-6 text-center text-xs text-zinc-400">
                  <Link href={AUTH_ROUTES.signup} className="underline underline-offset-2 hover:text-zinc-600">
                    Change email
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <AuthStudentIllustration alt="Student waiting for an email verification code" />
        </div>
      </main>
    </div>
  );
}

export default function OTPVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent" /> }>
      <OTPVerifyInner />
    </Suspense>
  );
}
