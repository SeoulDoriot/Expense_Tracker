import { NextResponse } from "next/server";
import { AUTH_ROUTES } from "@/src/lib/authFlow";
import { getSupabaseServerClient } from "@/src/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { email, password, fullName } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, message: "Full name, email, and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${origin}${AUTH_ROUTES.otpVerify}?email=${encodeURIComponent(cleanEmail)}&type=signup`,
        data: {
          full_name: String(fullName).trim(),
        },
      },
    });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}. Enter the 8-digit code on the OTP page to finish creating your account.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
