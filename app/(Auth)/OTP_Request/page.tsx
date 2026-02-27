"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";

export default function OtpRequestPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function sendOtp(e: React.FormEvent) {
  e.preventDefault();
  setMsg(null);
  setLoading(true);

  if (!email.trim()) {
    setMsg("Email is required.");
    setLoading(false);
    return;
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, // SIGN UP
    },
  });

  setLoading(false);

  if (error) return setMsg(error.message);

  router.push(`/otp-verify?email=${encodeURIComponent(email)}&mode=signup`);
}

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={sendOtp} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Email OTP</h1>

        <input
          className="w-full rounded-xl border p-3"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
  
        {msg && <p className="text-sm text-red-500">{msg}</p>}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-black text-white p-3"
        >
          {loading ? "Sending..." : "Send code"}
        </button>
      </form>
    </div>
  );
}