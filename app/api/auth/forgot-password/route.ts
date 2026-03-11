import { NextResponse } from "next/server";
import { AUTH_ROUTES } from "@/src/lib/authFlow";
import { getSupabaseServerClient } from "@/src/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      cleanEmail,
      {
        redirectTo: `${origin}${AUTH_ROUTES.setNewPassword}`,
      }
    );

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Reset instructions have been sent to ${cleanEmail}.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send reset email.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
