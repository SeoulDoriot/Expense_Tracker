"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ShakeWrapper from "@/components/animation/ShakeWrapper";
import AuthStudentIllustration from "@/components/auth/AuthStudentIllustration";
import { AUTH_ROUTES } from "@/src/lib/authFlow";
import { toFriendlyAuthMessage } from "@/src/lib/authMessages";
import { signInWithSocialProvider, type SocialProvider } from "@/src/lib/socialAuth";
import { getSupabaseBrowserClient } from "@/src/lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);

  const [shake, setShake] = useState(false);

  function triggerShake() {
    // restart animation reliably
    setShake(false);
    requestAnimationFrame(() => {
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
    });
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      triggerShake();
      return setErrorMsg("Please fill all fields.");
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      triggerShake();
      return setErrorMsg(
        "Supabase keys are missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local."
      );
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setIsLoading(false);
        triggerShake();
        return setErrorMsg(toFriendlyAuthMessage(error.message || "Login failed."));
      }

      router.push(AUTH_ROUTES.dashboard);
    } catch {
      setIsLoading(false);
      return setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSocialLogin(provider: SocialProvider) {
    setErrorMsg(null);
    setSocialLoading(provider);

    try {
      await signInWithSocialProvider(provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to continue with social sign-in.";
      setErrorMsg(toFriendlyAuthMessage(message));
      setSocialLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center">
      <div className="auth-stage mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-2 lg:items-center w-full">
        {/* Title */}
        <div className="auth-reveal auth-delay-1 lg:col-span-2 mb-2">
          <h1 className="text-4xl font-bold text-zinc-900">Welcome Back !!</h1>
        </div>

        {/* Left: Form */}
        <div className="auth-reveal-left auth-delay-2 relative z-20 mt-2 w-full max-w-md">
          <form onSubmit={handleLogin} className="auth-form-stack">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-6 w-full rounded-full border border-zinc-200 px-6 py-4 text-sm text-zinc-900 outline-none focus:border-[#F4C9A6]"
            />

            <div className="relative mt-6">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-full border border-zinc-200 px-6 py-4 text-sm text-zinc-900 outline-none focus:border-[#F4C9A6]"
              />
            </div>

            <div className="mt-3 text-right text-xs text-zinc-500">
              <Link href={AUTH_ROUTES.forgotPassword}>Forgot Password ?</Link>
            </div>

            {errorMsg && <p className="mt-4 text-sm text-red-500">{errorMsg}</p>}

            <ShakeWrapper active={shake && !isLoading}>
              <button
                type="submit"
                disabled={isLoading}
                className="mt-8 w-full rounded-full bg-[#111827] py-4 text-sm font-semibold hover:bg-[#1F2937] text-white disabled:opacity-60 transition-all duration-200"
              >
                {isLoading ? "Logging in..." : "Log in"}
              </button>
            </ShakeWrapper>
          </form>

          <div className="auth-reveal auth-delay-3 my-8 flex items-center gap-4 text-xs text-zinc-400">
            <div className="h-px flex-1 bg-zinc-200" />
            or
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <div className="auth-reveal auth-delay-4 flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={() => void handleSocialLogin("google")}
              disabled={socialLoading !== null}
              className="rounded-full p-2 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Continue with Google"
            >
              <Image src="/google.png" alt="Google" width={26} height={26} />
            </button>
            <button
              type="button"
              onClick={() => void handleSocialLogin("apple")}
              disabled={socialLoading !== null}
              className="rounded-full p-2 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Continue with Apple"
            >
              <Image src="/apple.png" alt="Apple" width={46} height={46} />
            </button>
          </div>

          {socialLoading ? (
            <p className="auth-reveal auth-delay-4 mt-3 text-center text-xs text-zinc-500">
              Redirecting to {socialLoading === "google" ? "Google" : "Apple"}...
            </p>
          ) : null}

          <p className="auth-reveal auth-delay-4 mt-6 text-center text-xs text-zinc-500">
            Don’t have an account?{" "}
            <Link href={AUTH_ROUTES.signup} className="font-semibold text-zinc-900 underline">
              Sign Up
            </Link>
          </p>
        </div>

        {/* Right: Image (match Sign_up) */}
        <AuthStudentIllustration />
      </div>
    </div>
  );
}
