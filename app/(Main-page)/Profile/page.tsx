"use client";

import {
  applyAppSettings,
  DEFAULT_APP_SETTINGS,
  readAppPreferences,
  translateAppLabel,
  type AppSettings,
  writeAppPreferences,
} from "@/src/lib/appPreferences";
import { AUTH_ROUTES } from "@/src/lib/authFlow";
import { writeProfileDisplay } from "@/src/lib/profileDisplay";
import { supabase } from "@/src/lib/supabaseClient";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type TabKey = "general" | "preferences" | "notifications" | "security" | "data";

type ProfileRow = {
  id: string; // same as auth.user.id
  full_name: string | null;
  avatar_url: string | null;
  email: string | null; // optional (can store for convenience)
  created_at?: string | null;
  updated_at?: string | null;
};

type SettingsRow = AppSettings & {
  user_id: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  const first = parts[0]?.[0] ?? "U";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

function IconChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 21a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a8.3 8.3 0 0 0 .1-1l2-1.2-2-3.4-2.3.6a7.7 7.7 0 0 0-.9-.6l-.4-2.4H10l-.4 2.4c-.3.2-.6.4-.9.6L6.4 9.4l-2 3.4 2 1.2a8.3 8.3 0 0 0 .1 1l-2 1.2 2 3.4 2.3-.6c.3.2.6.4.9.6l.4 2.4h4l.4-2.4c.3-.2.6-.4.9-.6l2.3.6 2-3.4-2-1.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="5" rx="8" ry="3" stroke="currentColor" strokeWidth="2" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" stroke="currentColor" strokeWidth="2" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-9 w-16 rounded-full transition ring-1 ring-black/10",
        checked ? "bg-emerald-500" : "bg-zinc-300"
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          "absolute top-1.5 h-6 w-6 rounded-full bg-white shadow transition",
          checked ? "left-9" : "left-1.5"
        )}
      />
    </button>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [tab, setTab] = useState<TabKey>("general");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [settings, setSettings] = useState<SettingsRow>({
    ...DEFAULT_APP_SETTINGS,
    user_id: "",
  });
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | null>(null);

  // form fields (editable)
  const [fullName, setFullName] = useState<string>("");
  const [plan, setPlan] = useState<"Free" | "Pro">("Free");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const avatarFallback = useMemo(() => initials(fullName || "User"), [fullName]);
  const currentLanguage = settings.language;

  useEffect(() => {
    let alive = true;

    async function hydrateProfile(user: { id: string; email?: string | null; user_metadata?: { full_name?: string; avatar_url?: string } }) {
      setUserId(user.id);
      setEmail(user.email ?? "");

      // ---- load profile row (optional but recommended)
      const profRes = await supabase
        .from("profiles")
        .select("id,full_name,avatar_url,email,created_at,updated_at")
        .eq("id", user.id)
        .maybeSingle();

      if (!alive) return;

      const profRow: ProfileRow | null = profRes.data
        ? {
            id: String(profRes.data.id),
            full_name: profRes.data.full_name ?? null,
            avatar_url: profRes.data.avatar_url ?? null,
            email: profRes.data.email ?? null,
            created_at: profRes.data.created_at ?? null,
            updated_at: profRes.data.updated_at ?? null,
          }
        : null;

      // prefill
      const namePrefill = profRow?.full_name || user.user_metadata?.full_name || "";
      const avatarPrefill = profRow?.avatar_url || user.user_metadata?.avatar_url || "";
      const storedPrefs = readAppPreferences(user.id);
      setProfile(profRow);
      setFullName(namePrefill);
      setPlan(storedPrefs?.plan ?? "Free");
      setAvatarUrl(avatarPrefill);
      writeProfileDisplay(user.id, {
        fullName: namePrefill || "Smart User",
        email: profRow?.email || user.email || "No email",
        avatarUrl: avatarPrefill || null,
      });
      const merged: SettingsRow = {
        ...DEFAULT_APP_SETTINGS,
        user_id: user.id,
        ...(storedPrefs?.settings ?? {}),
      };

      setSettings(merged);
      setLoading(false);
    }

    async function load() {
      setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user;

      if (!alive) return;

      if (sessionUser) {
        await hydrateProfile(sessionUser);
        return;
      }

      const userRes = await supabase.auth.getUser();
      const directUser = userRes.data.user;

      if (!alive) return;

      if (!directUser) {
        setUserId(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      await hydrateProfile(directUser);
    }

    void load();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;

      if (session?.user) {
        void hydrateProfile(session.user);
        return;
      }

      if (event === "SIGNED_OUT") {
        setUserId(null);
        setProfile(null);
        setLoading(false);
        router.push("/Log_in");
      }
    });

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  async function saveAll() {
    if (!userId) return;
    setSaving(true);
    setStatusMsg(null);
    setStatusTone(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setSaving(false);
      setStatusTone("error");
      setStatusMsg("Your session expired. Please log in again and retry.");
      router.push("/Log_in");
      return;
    }

    const authUpdate = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim() ? fullName.trim() : "",
      },
    });
    // 1) upsert profile
    const profilePayload: ProfileRow = {
      id: userId,
      full_name: fullName.trim() ? fullName.trim() : null,
      avatar_url: avatarUrl.trim() ? avatarUrl.trim() : null,
      email: email || null,
    };

    const profileResponse = await fetch("/api/profile/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        fullName: profilePayload.full_name,
        avatarUrl: profilePayload.avatar_url,
      }),
    });
    const profileResult = (await profileResponse.json()) as {
      success: boolean;
      message?: string;
      profile?: ProfileRow;
    };
    writeAppPreferences(userId, {
      plan,
      settings: {
        currency: settings.currency,
        language: settings.language,
        theme: settings.theme,
        budget_alert: settings.budget_alert,
        weekly_summary: settings.weekly_summary,
        daily_reminder: settings.daily_reminder,
      },
    });
    applyAppSettings(settings);

    setSaving(false);

    if (authUpdate.error || !profileResponse.ok || !profileResult.success) {
      setStatusTone("error");
      setStatusMsg(
        `Save failed. ${authUpdate.error?.message ?? ""} ${profileResult.message ?? ""}`.trim()
      );
      return;
    }

    setProfile(profileResult.profile ?? {
      id: userId,
      full_name: profilePayload.full_name,
      avatar_url: profilePayload.avatar_url,
      email: profilePayload.email,
      created_at: profile?.created_at ?? null,
      updated_at: profile?.updated_at ?? null,
    });
    writeProfileDisplay(userId, {
      fullName: profilePayload.full_name || "Smart User",
      email: profilePayload.email || "No email",
      avatarUrl: profilePayload.avatar_url,
    });
    setStatusTone("success");
    setStatusMsg("Profile updated successfully.");
  }

  function handleChoosePhoto() {
    fileInputRef.current?.click();
  }

  function handleRemovePhoto() {
    setAvatarUrl("");
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatusTone("error");
      setStatusMsg("Please choose a valid image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 1024 * 1024) {
      setStatusTone("error");
      setStatusMsg("Please use an image smaller than 1 MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setAvatarUrl(result);
      setStatusTone(null);
      setStatusMsg(null);
    };
    reader.onerror = () => {
      setStatusTone("error");
      setStatusMsg("Unable to read that image. Please try another file.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }


  
  async function connect(provider: "google" | "apple") {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/dashboard`
          : undefined,
    },
  });

  if (error) alert(error.message);
}

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/"); // change if your app uses /login
  }

  const navItem = (key: TabKey, label: string, icon: React.ReactNode) => {
    const active = tab === key;
    return (
      <button
        type="button"
        onClick={() => setTab(key)}
        className={cn(
          "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition",
          active ? "bg-white shadow ring-1 ring-black/5 text-zinc-900" : "text-zinc-600 hover:bg-white/60"
        )}
      >
        <span className={cn("h-9 w-9 rounded-full flex items-center justify-center ring-1 ring-black/5", active ? "bg-zinc-100" : "bg-white/70")}>
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Your layout already has navbar — so this page is only content */}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Back button (ONLY ONE) */}
        <div className="mb-5 flex items-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow ring-1 ring-black/5 hover:bg-zinc-50 transition"
          >
            <IconChevronLeft />
            Back
          </button>
        </div>

        <div className="rounded-[28px] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
          <div className="px-6 pt-7 sm:px-8">
            <h1 className="text-2xl font-semibold text-zinc-900">Profile</h1>
            <p className="mt-1 text-sm text-zinc-500">Manage the profile and settings for the currently logged-in user.</p>
          </div>

          <div className="px-6 pb-8 pt-6 sm:px-8">
            {loading ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
                Loading profile...
              </div>
            ) : !userId ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-700">
                You are not logged in. Please login first.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
                {/* LEFT: Profile card + side nav */}
                <div className="rounded-2xl bg-zinc-50 ring-1 ring-zinc-200 p-5">
                  <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
                    <div className="flex flex-col items-center text-center">
                      {/* Avatar */}
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt="avatar"
                          className="h-24 w-24 rounded-full object-cover ring-1 ring-black/10"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-zinc-200 ring-1 ring-black/10 flex items-center justify-center text-2xl font-semibold text-zinc-700">
                          {avatarFallback}
                        </div>
                      )}

                      <p className="mt-4 text-lg font-semibold text-zinc-900">
                        {fullName || "Your Name"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">{email || "—"}</p>

                      <span className="mt-3 inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 ring-1 ring-black/5">
                        {plan === "Pro" ? "Pro Plan" : "Free Plan"}
                      </span>

                      <div className="mt-4 w-full">
                        <button
                          type="button"
                          onClick={signOut}
                          className="h-10 w-full rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {navItem("general", "General", <IconUser />)}
                    {navItem("preferences", "Preferences", <IconGear />)}
                    {navItem("notifications", "Notifications", <IconBell />)}
                    {navItem("security", "Security", <IconShield />)}
                    {navItem("data", "Data", <IconDatabase />)}
                  </div>
                </div>

                {/* RIGHT: Content */}
                <div className="rounded-2xl bg-white ring-1 ring-black/5 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
                  {/* Top tabs (nice looking) */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-4">
                    {(["general", "preferences", "notifications", "security", "data"] as TabKey[]).map((k) => {
                      const active = tab === k;
                      const label =
                        k === "general"
                          ? "General"
                          : k === "preferences"
                          ? "Preferences"
                          : k === "notifications"
                          ? "Notifications"
                          : k === "security"
                          ? "Security"
                          : "Data";
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setTab(k)}
                          className={cn(
                            "h-10 rounded-xl px-4 text-sm font-semibold transition",
                            active
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">Save your profile changes</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Your updated name and photo will also appear in the top navigation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={saveAll}
                      disabled={saving}
                      className={cn(
                        "h-11 rounded-xl px-5 text-sm font-semibold text-white transition",
                        saving ? "bg-zinc-400" : "bg-[#111827] hover:bg-[#1F2937]"
                      )}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>

                  {statusMsg ? (
                    <div
                      className={cn(
                        "mt-4 rounded-2xl border px-4 py-3 text-sm",
                        statusTone === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      )}
                    >
                      {statusMsg}
                    </div>
                  ) : null}

                  {/* TAB PANELS */}
                  {tab === "general" ? (
                    <div className="pt-5">
                      <h2 className="text-lg font-semibold text-zinc-900">Account Settings</h2>
                      <p className="mt-1 text-sm text-zinc-500">Update your profile and account details.</p>

                      <div className="mt-5 grid grid-cols-1 gap-4">
                        <div>
                          <label className="text-sm font-semibold text-zinc-800">Profile Photo</label>
                          <div className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                              {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={avatarUrl}
                                  alt="Profile preview"
                                  className="h-20 w-20 rounded-full object-cover ring-1 ring-black/10"
                                />
                              ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold text-zinc-700 ring-1 ring-black/10">
                                  {avatarFallback}
                                </div>
                              )}

                              <div className="flex-1">
                                <p className="text-sm font-medium text-zinc-900">
                                  Upload a square photo for the best result.
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  PNG, JPG, or WEBP up to 1 MB.
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={handleChoosePhoto}
                                    className="h-10 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                                  >
                                    Change photo
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleRemovePhoto}
                                    className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  className="hidden"
                                  onChange={handleAvatarFileChange}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-zinc-800">Full Name</label>
                          <input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your full name"
                            className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-zinc-900/15"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-zinc-800">Email</label>
                          <input
                            value={email}
                            readOnly
                            className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-4 text-sm text-zinc-600 outline-none"
                          />
                          
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-zinc-800">Plan</label>
                          <div className="mt-2 grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setPlan("Free")}
                              className={cn(
                                "h-11 rounded-xl border text-sm font-semibold transition",
                                plan === "Free"
                                  ? "border-zinc-900 bg-zinc-900 text-white"
                                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                              )}
                            >
                              Free
                            </button>
                            <button
                              type="button"
                              onClick={() => setPlan("Pro")}
                              className={cn(
                                "h-11 rounded-xl border text-sm font-semibold transition",
                                plan === "Pro"
                                  ? "border-zinc-900 bg-zinc-900 text-white"
                                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                              )}
                            >
                              Pro
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-zinc-500">
                          </p>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <p className="text-sm font-semibold text-zinc-900">Connect Accounts</p>
                          

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-white border border-zinc-200 p-4 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-zinc-900">Google</p>
                                <p className="text-xs text-zinc-500">Sign in with Google</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => connect("google")}
                                className="h-10 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 transition"
                              >
                                Connect
                              </button>
                            </div>

                            <div className="rounded-2xl bg-white border border-zinc-200 p-4 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-zinc-900">Apple</p>
                                <p className="text-xs text-zinc-500">Sign in with Apple</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => connect("apple")}
                                className="h-10 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 transition"
                              >
                                Connect
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "preferences" ? (
                    <div className="pt-5">
                      <h2 className="text-lg font-semibold text-zinc-900">Preferences</h2>
                      <p className="mt-1 text-sm text-zinc-500">Customize how the app looks and behaves.</p>

                      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-semibold text-zinc-800">Currency</label>
                          <select
                            value={settings.currency ?? "USD"}
                            onChange={(e) =>
                              setSettings((s) => ({
                                ...s,
                                currency: e.target.value === "KHR" ? "KHR" : "USD",
                              }))
                            }
                            className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-zinc-900/15"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="KHR">KHR (៛)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-zinc-800">Language</label>
                          <select
                            value={settings.language ?? "en"}
                            onChange={(e) =>
                              setSettings((s) => ({
                                ...s,
                                language: e.target.value === "km" ? "km" : "en",
                              }))
                            }
                            className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-zinc-900/15"
                          >
                            <option value="en">{translateAppLabel(currentLanguage, "english")}</option>
                            <option value="km">{translateAppLabel(currentLanguage, "khmer")}</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-sm font-semibold text-zinc-800">Theme</label>
                          <div className="mt-2 grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setSettings((s) => ({ ...s, theme: "light" }))}
                              className={cn(
                                "h-11 rounded-xl border text-sm font-semibold transition",
                                (settings.theme ?? "light") === "light"
                                  ? "border-zinc-900 bg-zinc-900 text-white"
                                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                              )}
                            >
                              {translateAppLabel(currentLanguage, "light")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSettings((s) => ({ ...s, theme: "dark" }))}
                              className={cn(
                                "h-11 rounded-xl border text-sm font-semibold transition",
                                settings.theme === "dark"
                                  ? "border-zinc-900 bg-zinc-900 text-white"  
                                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                              )}
                            >
                              {translateAppLabel(currentLanguage, "dark")}
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-zinc-500">
                            Save this section to apply , currency conversion, and language across the app.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "notifications" ? (
                    <div className="pt-5">
                      <h2 className="text-lg font-semibold text-zinc-900">Notifications</h2>
                      <p className="mt-1 text-sm text-zinc-500">Choose which alerts you want.</p>

                      <div className="mt-5 space-y-4">
                        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">Budget Alert</p>
                            <p className="text-xs text-zinc-500">Notify when spending hits your limit</p>
                          </div>
                          <Toggle
                            checked={!!settings.budget_alert}
                            onChange={(v) => setSettings((s) => ({ ...s, budget_alert: v }))}
                          />
                        </div>

                        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">Weekly Summary</p>
                            <p className="text-xs text-zinc-500">Weekly report of income & expenses</p>
                          </div>
                          <Toggle
                            checked={!!settings.weekly_summary}
                            onChange={(v) => setSettings((s) => ({ ...s, weekly_summary: v }))}
                          />
                        </div>

                        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">Daily Reminder</p>
                            <p className="text-xs text-zinc-500">Remind to add today’s expenses</p>
                          </div>
                          <Toggle
                            checked={!!settings.daily_reminder}
                            onChange={(v) => setSettings((s) => ({ ...s, daily_reminder: v }))}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "security" ? (
                    <div className="pt-5">
                      <h2 className="text-lg font-semibold text-zinc-900">Security</h2>
                      <p className="mt-1 text-sm text-zinc-500">Manage password and account safety.</p>

                      <div className="mt-5 space-y-4">
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <p className="text-sm font-semibold text-zinc-900">Create or Change Password</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Add a password to this account so you can log in with Google or with email/password.
                          </p>

                          <button
                            type="button"
                            onClick={() => router.push(`${AUTH_ROUTES.updatePassword}?mode=account`)}
                            className="mt-3 h-10 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 transition"
                          >
                            Manage password
                          </button>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <p className="text-sm font-semibold text-zinc-900">Reset Password</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            This will send a reset password email.
                          </p>

                          <button
                            type="button"
                            onClick={async () => {
                              if (!email) return alert("No email found.");
                              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                                redirectTo:
                                  typeof window !== "undefined"
                                    ? `${window.location.origin}/Setnew_Password`
                                    : undefined,
                              });
                              if (error) return alert(error.message);
                              alert("Reset email sent ✅");
                            }}
                            className="mt-3 h-10 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 transition"
                          >
                            Send Reset Email
                          </button>
                        </div>

                        
                      </div>
                    </div>
                  ) : null}

                  {tab === "data" ? (
                    <div className="pt-5">
                      <h2 className="text-lg font-semibold text-zinc-900">Data</h2>
                      <p className="mt-1 text-sm text-zinc-500">Export your transactions for backup.</p>

                      <div className="mt-5 space-y-4">
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <p className="text-sm font-semibold text-zinc-900">Export (Demo)</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Later we can export CSV from your <b>transactions</b> table.
                          </p>

                          <button
                            type="button"
                            onClick={() => alert("Export is a demo for now. We can build CSV export next.")}
                            className="mt-3 h-10 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 transition"
                          >
                            Export CSV
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Save button (always visible) */}
                  <div className="mt-8 flex items-center justify-end gap-3 border-t border-zinc-200 pt-5">
                    <button
                      type="button"
                      onClick={saveAll}
                      disabled={saving}
                      className={cn(
                        "h-11 rounded-xl px-5 text-sm font-semibold text-white transition",
                        saving ? "bg-zinc-400" : "bg-[#111827] hover:bg-[#1F2937]"
                      )}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
