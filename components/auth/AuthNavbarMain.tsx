"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { translateAppLabel } from "@/src/lib/appPreferences";
import { useAppPreferences } from "@/src/hooks/useAppPreferences";
import {
  cacheProfileDisplay,
  clearProfileDisplay,
  PROFILE_DISPLAY_UPDATED_EVENT,
  readProfileDisplay,
} from "@/src/lib/profileDisplay";
import { supabase } from "@/src/lib/supabaseClient";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`relative pb-1 text-sm font-medium tracking-[0.01em] transition ${
        active ? "text-zinc-950" : "text-zinc-600 hover:text-zinc-950"
      }`}
    >
      {label}
      <span
        className={`absolute -bottom-1 left-0 h-0.5 rounded-full bg-zinc-950 transition-all ${
          active ? "w-full opacity-100" : "w-0 opacity-0"
        }`}
      />
    </Link>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "SE";
}

export default function MainNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { settings } = useAppPreferences();
  const [userName, setUserName] = useState("Smart User");
  const [userEmail, setUserEmail] = useState("Not signed in");
  const [avatarUrl, setAvatarUrl] = useState("");
  const initials = useMemo(() => getInitials(userName), [userName]);

  useEffect(() => {
    let alive = true;

    async function loadUser() {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user;

      const { data } = sessionUser ? { data: { user: sessionUser } } : await supabase.auth.getUser();

      if (!alive) {
        return;
      }

      const user = data?.user;
      if (!user) {
        setUserName("Smart User");
        setUserEmail("Not signed in");
        setAvatarUrl("");
        return;
      }

      const cachedProfile = readProfileDisplay(user.id);
      if (cachedProfile) {
        setUserName(cachedProfile.fullName || "Smart User");
        setUserEmail(cachedProfile.email || user.email || "No email");
        setAvatarUrl(cachedProfile.avatarUrl ?? "");
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name,avatar_url,email")
        .eq("id", user.id)
        .maybeSingle();

      if (!alive) {
        return;
      }

      const resolvedName = String(
        profileRow?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Smart User"
      );
      const resolvedEmail = String(profileRow?.email || user.email || cachedProfile?.email || "No email");
      const resolvedAvatar = profileRow?.avatar_url || cachedProfile?.avatarUrl || "";

      setUserName(resolvedName);
      setUserEmail(resolvedEmail);
      setAvatarUrl(resolvedAvatar);
      cacheProfileDisplay(user.id, {
        fullName: resolvedName,
        email: resolvedEmail,
        avatarUrl: resolvedAvatar || null,
      });
    }

    void loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) {
        return;
      }

      if (session?.user) {
        void loadUser();
        return;
      }

      setUserName("Smart User");
      setUserEmail("Not signed in");
      setAvatarUrl("");
    });

    function handleProfileDisplayUpdate() {
      void loadUser();
    }

    function handleStorage(event: StorageEvent) {
      if (event.key?.startsWith("profile-display:")) {
        void loadUser();
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener(PROFILE_DISPLAY_UPDATED_EVENT, handleProfileDisplayUpdate);
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener(PROFILE_DISPLAY_UPDATED_EVENT, handleProfileDisplayUpdate);
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, []);

  async function handleLogout() {
    const { data } = await supabase.auth.getUser();
    await supabase.auth.signOut();
    if (data.user?.id) {
      clearProfileDisplay(data.user.id);
    }
    router.push("/Log_in");
    router.refresh();
  }

  const showSearch = !pathname.startsWith("/Profile");

  return (
    <header className="main-nav-enter sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="chrome-bar mx-auto max-w-7xl rounded-[28px] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/image.png"
              alt="Smart Expense"
              width={42}
              height={42}
              className="rounded-2xl"
              priority
            />
            <div className="leading-tight">
              <p className="text-[13px] uppercase tracking-[0.22em] text-zinc-500">
                {translateAppLabel(settings.language, "smart")}
              </p>
              <p className="text-lg font-semibold text-zinc-950">
                {translateAppLabel(settings.language, "expense")}
              </p>
            </div>
          </Link>

          <nav className="ml-auto hidden items-center gap-7 lg:flex">
            <NavItem href="/dashboard" label={translateAppLabel(settings.language, "dashboard")} />
            <NavItem href="/transactions" label={translateAppLabel(settings.language, "transactions")} />
            <NavItem href="/goals" label={translateAppLabel(settings.language, "goals")} />
            <NavItem href="/Report" label={translateAppLabel(settings.language, "reports")} />
          </nav>

          {showSearch ? (
            <div className="chrome-search ml-auto hidden items-center gap-2 rounded-full px-4 py-2.5 md:flex lg:ml-8">
              <span className="text-zinc-400">⌕</span>
              <input
                className="w-36 bg-transparent text-sm text-zinc-700 outline-none"
                placeholder={translateAppLabel(settings.language, "search")}
              />
            </div>
          ) : null}

          <details className="relative ml-2">
            <summary className="list-none cursor-pointer">
              <div className="chrome-shell flex items-center gap-3 rounded-full px-2.5 py-2 text-left transition hover:-translate-y-0.5">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-black/10"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                    {initials}
                  </div>
                )}
                <div className="hidden min-w-0 md:block">
                  <p className="truncate text-sm font-semibold text-zinc-950">{userName}</p>
                  <p className="truncate text-xs text-zinc-500">{userEmail}</p>
                </div>
              </div>
            </summary>

            <div className="surface-card absolute right-0 mt-3 w-72 rounded-[24px] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                {translateAppLabel(settings.language, "account")}
              </p>
              <div className="mt-3 flex items-center gap-3">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="h-12 w-12 rounded-full object-cover ring-1 ring-black/10"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-zinc-950">{userName}</p>
                  <p className="truncate text-sm text-zinc-500">{userEmail}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-zinc-700">
                <Link href="/Profile" className="rounded-2xl border border-zinc-200 px-4 py-3 transition hover:bg-zinc-50">
                  {translateAppLabel(settings.language, "profileSettings")}
                </Link>
                <Link href="/goals" className="rounded-2xl border border-zinc-200 px-4 py-3 transition hover:bg-zinc-50">
                  {translateAppLabel(settings.language, "savingsGoals")}
                </Link>
              </div>

              <button
                type="button"
                onClick={() => void handleLogout()}
                className="mt-4 w-full rounded-full bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                {translateAppLabel(settings.language, "logout")}
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
