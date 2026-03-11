"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// UI components
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import Divider from "../../../components/auth/Divider";
import AuthStudentIllustration from "@/components/auth/AuthStudentIllustration";
import SocialIcon from "../../../components/auth/Socialicon";
import { AUTH_ROUTES, storePendingSignup } from "@/src/lib/authFlow";
import { toFriendlyAuthMessage } from "@/src/lib/authMessages";
import { signInWithSocialProvider, type SocialProvider } from "@/src/lib/socialAuth";

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M10.6 10.6A2 2 0 0012 16a2 2 0 001.4-.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9.9 5.1A10.3 10.3 0 0112 4c7 0 10 8 10 8a17 17 0 01-4.2 5.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.1 6.1C3.6 8.2 2 12 2 12s3 8 10 8c1.1 0 2.1-.2 3-.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [shake, setShake] = useState(false);

  function triggerShake() {
    // restart animation reliably
    setShake(false);
    requestAnimationFrame(() => {
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
    });
  }

  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !email.trim() || !password || !repeatPassword) {
      triggerShake();
      return setErrorMsg("Please fill all fields.");
    }

    if (password !== repeatPassword) {
      triggerShake();
      return setErrorMsg("Passwords do not match.");
    }

    if (!acceptedTerms) {
      triggerShake();
      return setErrorMsg("Please accept the terms and privacy policy.");
    }

    try {
      setLoading(true);
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const result = (await response.json()) as {
        success: boolean;
        message: string;
      };

      if (!response.ok || !result.success) {
        triggerShake();
        return setErrorMsg(
          toFriendlyAuthMessage(result.message || "Unable to create your account.")
        );
      }

      storePendingSignup({
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        password,
      });
      router.push(`${AUTH_ROUTES.otpVerify}?email=${encodeURIComponent(email.trim().toLowerCase())}&type=signup`);
    } catch {
      triggerShake();
      setErrorMsg("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialSignup(provider: SocialProvider) {
    setErrorMsg(null);
    setSocialLoading(provider);

    try {
      await signInWithSocialProvider(provider);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to continue with social sign-in.";
      setErrorMsg(toFriendlyAuthMessage(message));
      setSocialLoading(null);
    }
  }
  

  return (
    <div className="min-h-screen bg-transparent flex items-center">
      <div className="auth-stage mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-2 lg:items-center w-full">
        {/* KIT logo top-left */}

        {/* Title */}
        <div className="auth-reveal auth-delay-1 lg:col-span-2 mb-2">
          <h1 className="text-3xl font-semibold text-black">Registration</h1>
        </div>

        {/* Left: Form */}
        <form onSubmit={handleSubmit} className="auth-reveal-left auth-delay-2 auth-form-stack relative z-20 mt-2 space-y-5">
          <Input
            placeholder="Full name"
            type="text"
            value={fullName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
          />


          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          />

          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            rightIcon={<EyeOffIcon />}
          />

          <Input
            placeholder="Repeat Password"
            type="password"
            value={repeatPassword}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setRepeatPassword(e.target.value)}
            rightIcon={<EyeOffIcon />}
          />

          {/* Checkbox row */}
          <label className="flex items-center gap-3 pt-1 text-xs text-zinc-700">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="h-4 w-4 accent-black"
            />
            <span>I accept the terms and privacy policy</span>
          </label>

          {errorMsg ? <div className="text-sm text-red-500">{errorMsg}</div> : null}

          <div className={shake && !loading ? "animate-seoul-shake" : ""}>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </Button>
          </div>

          <p className="pt-1 text-center text-[11px] text-zinc-500">
            By creating an account or signing you agree to our{" "}
            <span className="font-semibold text-black underline">Terms and Conditions</span>
          </p>

          <Divider />

          <p className="text-center text-[11px] text-zinc-400">Continue with :</p>

          <div className="flex items-center justify-center gap-6">
            <SocialIcon
              src="/google.png"
              alt="Google"
              onClick={() => void handleSocialSignup("google")}
              disabled={socialLoading !== null}
            />
            <SocialIcon
              src="/apple.png"
              alt="Apple"
              onClick={() => void handleSocialSignup("apple")}
              disabled={socialLoading !== null}
            />
          </div>

          {socialLoading ? (
            <p className="text-center text-[11px] text-zinc-500">
              Redirecting to {socialLoading === "google" ? "Google" : "Apple"}...
            </p>
          ) : null}

          <p className="pt-2 text-center text-xs text-zinc-500">
            Already have an account?{" "}
            <Link href={AUTH_ROUTES.login} className="font-semibold text-black underline">
              Login
            </Link>
          </p>
        </form>

        {/* Right: Image (cannot block clicks) */}
        <AuthStudentIllustration />
      </div>
      <style jsx global>{`
        @keyframes seoul-shake {
          0% { transform: translate3d(0, 0, 0); }
          20% { transform: translate3d(-4px, 0, 0); }
          40% { transform: translate3d(4px, 0, 0); }
          60% { transform: translate3d(-3px, 0, 0); }
          80% { transform: translate3d(3px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        .animate-seoul-shake {
          animation: seoul-shake 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97);
          will-change: transform;
        }
      `}</style>
    </div>
  );
}
