"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ShakeWrapper from "@/components/animation/ShakeWrapper";

export default function LoginPage() {
  const router = useRouter();

  // Supabase client (client-side)
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      // We keep it usable, but show a helpful error below on submit.
      return null;
    }

    return createClient(url, anonKey);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        return setErrorMsg(error.message || "Login failed.");
      }

      // ✅ New flow: after login go to your app dashboard (change this path if you want)
      router.push("/dashboard");
    } catch (err) {
      setIsLoading(false);
      return setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fbfbfb] flex items-center">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-2 lg:items-center w-full">
        {/* Title */}
        <div className="lg:col-span-2 mb-2">
          <h1 className="text-4xl font-bold text-zinc-900">Welcome Back !!</h1>
        </div>

        {/* Left: Form */}
        <div className="relative z-20 mt-2 w-full max-w-md">
          <form onSubmit={handleLogin}>
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
              <Link href="/forgot-password">Forgot Password ?</Link>
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

          <div className="my-8 flex items-center gap-4 text-xs text-zinc-400">
            <div className="h-px flex-1 bg-zinc-200" />
            or
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <div className="flex items-center justify-center gap-8">
            <button
              type="button"
              className="rounded-full p-2 hover:bg-zinc-100"
              aria-label="Continue with Google"
            >
              <Image src="/google.png" alt="Google" width={26} height={26} />
            </button>
            <button
              type="button"
              className="rounded-full p-2 hover:bg-zinc-100"
              aria-label="Continue with Apple"
            >
              <Image src="/apple.png" alt="Apple" width={46} height={46} />
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-500">
            Don’t have an account?{" "}
            <Link href="/Sign_up" className="font-semibold text-zinc-900 underline">
              Sign Up
            </Link>
          </p>
        </div>

        {/* Right: Image (match Sign_up) */}
        <div className="relative hidden lg:flex w-full justify-end items-center pointer-events-none">
          <div className="relative h-[520px] w-[520px]">
            <div className="absolute -right-10 bottom-[-220] h-[900px] w-[400px] rounded-full bg-[#E5E5E5]" />
            <div
              className="absolute right-0 top-0 overflow-hidden rounded-3xl"
              style={{ transform: "translateY(-40px)" }}
            >
              <Image
                src="/student2.png"
                alt="student"
                width={720}
                height={760}
                className="object-contain rounded-3xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}