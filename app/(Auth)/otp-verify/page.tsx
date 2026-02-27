"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16.5 16.5 21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function OTPVerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const email = searchParams.get("email");
  const mode = searchParams.get("mode") ?? "signup"; // "signup" | "login" (optional)

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [message, setMessage] = useState<string>("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  // Simple countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Auto-submit when all 6 digits filled
  const finalOtp = useMemo(() => otp.join(""), [otp]);
  useEffect(() => {
    if (finalOtp.length === 6 && !loading) {
      void handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalOtp]);

  async function handleVerify() {
    if (!email) {
      setMessage("Email missing. Please go back and request OTP again.");
      return;
    }

    if (finalOtp.length !== 6) return;

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: finalOtp,
      type: "email",
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // session should exist after verify
    console.log("User session:", data.session);
    router.push("/Main-page");
  }

  async function handleResend() {
    if (!email) {
      setMessage("Email missing. Please go back and request OTP again.");
      return;
    }
    if (cooldown > 0) return;

    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: mode === "signup",
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("New code sent to your email.");
    setOtp(Array(6).fill(""));
    setCooldown(30);

    // focus first box again
    setTimeout(() => {
      document.getElementById("otp-0")?.focus();
    }, 50);
  }

  function setDigit(index: number, value: string) {
    const v = value.replace(/[^0-9]/g, "").slice(0, 1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = v;
      return next;
    });

    if (v && index < 5) {
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
    <div className="min-h-screen bg-[#fbfbfb]">
      {/* Top nav (same style as your Figma screenshot) */}
      {/* Main layout */}
      <main className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center px-20 py-16">
        <div className="grid w-full grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* OTP Card */}
          <section className="flex justify-center lg:justify-start">
            <div className="flex w-full max-w-[520px] min-h-[560px] flex-col rounded-3xl bg-white px-10 py-14 md:px-12 shadow-[0_30px_90px_rgba(0,0,0,0.12)] ring-1 ring-zinc-100">
              <div>
                <h1 className="text-center text-4xl font-semibold text-zinc-900">
                Verify OTP
              </h1>
              </div>
              <div className="h-15"></div>
              <div className="">
                <p className="mt-1 text-center text-1sm text-zinc-400">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-medium text-zinc-700"> {email ?? "your email"}</span>
                </p>

                <div className="mt-5 flex justify-center gap-4">
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
                      className="h-12 w-12 rounded-2xl border border-zinc-200 bg-white text-center text-lg font-semibold text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
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
                  disabled={loading || finalOtp.length !== 6}
                  className="mt-7 h-11 w-full rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Verifying..." : mode === "login" ? "Continue" : "Create account"}
                </button>

                <div className="mt-6 text-center text-xs text-zinc-400">
                  <Link href="/otp-request" className="underline underline-offset-2 hover:text-zinc-600">
                    Change email
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Right illustration area */}
          <section className="relative flex justify-center">
            {/* Arch background */}
            <div className="relative hidden min-h-[700px] bottom-20 justify-end items-end lg:flex">
                        {/* Big circle background (lower, like your design) */}
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