"use client";

import { AUTH_ROUTES } from "@/src/lib/authFlow";
import { getSupabaseBrowserClient } from "@/src/lib/supabaseBrowser";

export type SocialProvider = "google" | "apple";

export async function signInWithSocialProvider(provider: SocialProvider) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error(
      "Supabase keys are missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}${AUTH_ROUTES.oauthCallback}`
      : undefined;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error("Unable to start social sign-in.");
  }

  window.location.assign(data.url);
}
