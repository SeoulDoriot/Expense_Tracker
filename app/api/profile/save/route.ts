import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/src/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/src/lib/supabaseServer";

type ProfileSaveBody = {
  fullName?: string;
  avatarUrl?: string;
};

function getBearerToken(headerValue: string | null) {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export async function POST(req: Request) {
  try {
    const accessToken = getBearerToken(req.headers.get("authorization"));
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Missing session token." },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "You need to be logged in to save your profile." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as ProfileSaveBody;
    const fullName =
      typeof body.fullName === "string" && body.fullName.trim()
        ? body.fullName.trim()
        : null;
    const avatarUrl =
      typeof body.avatarUrl === "string" && body.avatarUrl.trim()
        ? body.avatarUrl.trim()
        : null;

    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: fullName,
          avatar_url: avatarUrl,
          email: user.email ?? null,
        },
        { onConflict: "id" }
      )
      .select("id,full_name,avatar_url,email,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save profile.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
