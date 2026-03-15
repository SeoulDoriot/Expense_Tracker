"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  AUTH_ROUTES,
  clearSocialAuthIntent,
  readSocialAuthIntent,
} from "@/src/lib/authFlow";
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

function hasEmailPasswordIdentity(user: User | null | undefined) {
  const providers = new Set<string>();

  user?.identities?.forEach((identity) => {
    if (identity.provider) {
      providers.add(identity.provider);
    }
  });

  user?.app_metadata?.providers?.forEach((provider) => {
    if (typeof provider === "string") {
      providers.add(provider);
    }
  });

  return providers.has("email");
}

function isFreshOAuthSignup(user: User | null | undefined) {
  if (!user?.created_at || !user?.last_sign_in_at) {
    return false;
  }

  const createdAt = Date.parse(user.created_at);
  const lastSignInAt = Date.parse(user.last_sign_in_at);

  if (Number.isNaN(createdAt) || Number.isNaN(lastSignInAt)) {
    return false;
  }

  return Math.abs(lastSignInAt - createdAt) <= 60_000;
}

function resolvePostOAuthRoute(user: User | null | undefined) {
  const intent = readSocialAuthIntent();
  const needsPasswordSetup =
    intent === "signup" && (isFreshOAuthSignup(user) || !hasEmailPasswordIdentity(user));

  if (needsPasswordSetup) {
    return `${AUTH_ROUTES.updatePassword}?mode=social-signup`;
  }

  return AUTH_ROUTES.dashboard;
}

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    let active = true;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.replace(AUTH_ROUTES.login);
      return;
    }

    const client = supabase;

    function redirectToLogin(nextMessage: string) {
      clearSocialAuthIntent();
      setMessage(nextMessage);

      window.setTimeout(() => {
        if (!active) {
          return;
        }

        router.replace(AUTH_ROUTES.login);
      }, 500);
    }

    function completeSignIn(user: User | null | undefined) {
      const nextRoute = resolvePostOAuthRoute(user);
      clearSocialAuthIntent();
      router.replace(nextRoute);
    }

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active || !session) {
        return;
      }

      completeSignIn(session.user);
    });

    async function finishOAuth() {
      const url = new URL(window.location.href);
      const providerError =
        url.searchParams.get("error_description") ?? url.searchParams.get("error");
      const code = url.searchParams.get("code");
      const tokens = getTokensFromHash();

      if (providerError) {
        redirectToLogin(toFriendlyAuthMessage(providerError));
        return;
      }

      if (code) {
        setMessage("Confirming your Google sign-in...");

        const exchange = await client.auth.exchangeCodeForSession(code);
        if (!active) {
          return;
        }

        if (exchange.error) {
          redirectToLogin(toFriendlyAuthMessage(exchange.error.message));
          return;
        }

        const user = exchange.data.session?.user;
        completeSignIn(user);
        return;
      }

      if (tokens) {
        setMessage("Restoring your session...");

        const sessionResult = await client.auth.setSession(tokens);
        if (!active) {
          return;
        }

        if (sessionResult.error) {
          redirectToLogin(toFriendlyAuthMessage(sessionResult.error.message));
          return;
        }

        completeSignIn(sessionResult.data.user ?? sessionResult.data.session?.user);
        return;
      }

      const { data, error } = await client.auth.getSession();
      if (!active) {
        return;
      }

      if (error) {
        redirectToLogin(toFriendlyAuthMessage(error.message));
        return;
      }

      if (data.session) {
        completeSignIn(data.session.user);
        return;
      }

      setMessage("Waiting for sign-in to finish...");

      window.setTimeout(async () => {
        const retry = await client.auth.getSession();
        if (!active) {
          return;
        }

        if (retry.data.session) {
          completeSignIn(retry.data.session.user);
          return;
        }

        if (retry.error) {
          redirectToLogin(toFriendlyAuthMessage(retry.error.message));
          return;
        }

        redirectToLogin("Google sign-in did not complete. Redirecting to login...");
      }, 1200);
    }

    void finishOAuth();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="rounded-3xl border border-zinc-200 bg-white px-8 py-10 shadow-sm">
        <p className="text-base font-medium text-zinc-700">{message}</p>
      </div>
    </div>
  );
}
