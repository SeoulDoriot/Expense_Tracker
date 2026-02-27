// NEW VERSION: Goals are scoped per logged-in user using Supabase Auth + RLS.
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type Goal = {
  id: string;
  title: string;
  target: number;
  saved: number;
  contributingMonthly: number;
  imageUrl?: string; // local preview url (not persisted)
  image_url?: string | null; // persisted url (optional)
};

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function GoalsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string>("");

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [target, setTarget] = useState<string>("");
  const [saved, setSaved] = useState<string>("");
  const [contributingMonthly, setContributingMonthly] = useState<string>("50");

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [imageFileName, setImageFileName] = useState<string>("");

  const totalSaved = useMemo(
    () => goals.reduce((sum, g) => sum + g.saved, 0),
    [goals]
  );

  // 1) Require Auth: get user on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoadError("");

      if (!supabase) {
        setLoading(false);
        setLoadError(
          "Supabase env is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
        return;
      }

      const { data, error } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error) {
        setLoading(false);
        setLoadError(error.message);
        return;
      }

      const uid = data.user?.id;

      if (!uid) {
        // Not logged in → send to your login page
        // Update this path if your login route is different.
        router.push("/Auth/login");
        return;
      }

      setUserId(uid);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // 2) Load goals for this user
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!supabase) return;
      if (!userId) return;

      setLoading(true);
      setLoadError("");

      // Try ordering by created_at first
      let data: any[] | null = null;
      let error: any = null;

      {
        const res = await supabase
          .from("goals")
          .select("id,title,target,saved,contributing_monthly,image_url,created_at,user_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        data = res.data as any[] | null;
        error = res.error;
      }

      // If created_at doesn't exist, retry without ordering
      if (error && String(error.message || "").toLowerCase().includes("created_at")) {
        const res2 = await supabase
          .from("goals")
          .select("id,title,target,saved,contributing_monthly,image_url,user_id")
          .eq("user_id", userId);

        data = res2.data as any[] | null;
        error = res2.error;
      }

      if (cancelled) return;

      if (error) {
        setLoadError(error.message);
        setGoals([]);
      } else {
        const mapped: Goal[] = (data ?? []).map((g: any) => ({
          id: String(g.id),
          title: String(g.title ?? ""),
          target: Number(g.target ?? 0),
          saved: Number(g.saved ?? 0),
          contributingMonthly: Number(g?.contributing_monthly ?? 50),
          image_url: g.image_url ?? null,
        }));
        setGoals(mapped);
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  function resetForm() {
    setTitle("");
    setTarget("");
    setSaved("");
    setContributingMonthly("50");
    setImagePreviewUrl("");
    setImageFileName("");
  }

  function closeModal() {
    setOpen(false);
    resetForm();
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    if (imagePreviewUrl) {
      try {
        URL.revokeObjectURL(imagePreviewUrl);
      } catch {
        // ignore
      }
    }

    setImagePreviewUrl(url);
    setImageFileName(file.name);
  }

  async function addGoal() {
    if (!supabase) return;
    if (!userId) return;

    const t = title.trim();
    const targetNum = Number(target);
    const savedNum = Number(saved || "0");
    const contribNum = Number(contributingMonthly || "0");

    if (!t) return;
    if (!Number.isFinite(targetNum) || targetNum <= 0) return;
    if (!Number.isFinite(savedNum) || savedNum < 0) return;
    if (!Number.isFinite(contribNum) || contribNum < 0) return;

    const safeSaved = Math.min(savedNum, targetNum);
    const localPreview = imagePreviewUrl || undefined;

    const optimistic: Goal = {
      id: `tmp_${Date.now()}`,
      title: t,
      target: targetNum,
      saved: safeSaved,
      contributingMonthly: contribNum || 0,
      imageUrl: localPreview,
      image_url: null,
    };

    setGoals((prev) => [optimistic, ...prev]);

    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title: t,
        target: targetNum,
        saved: safeSaved,
        contributing_monthly: contribNum || 0,
        image_url: null,
      })
      .select("id,title,target,saved,contributing_monthly,image_url,created_at,user_id")
      .single();

    if (error) {
      setGoals((prev) => prev.filter((g) => g.id !== optimistic.id));
      setLoadError(error.message);
      closeModal();
      return;
    }

    const real: Goal = {
      id: String(data.id),
      title: String(data.title ?? t),
      target: Number(data.target ?? targetNum),
      saved: Number(data.saved ?? safeSaved),
      contributingMonthly: Number(data?.contributing_monthly ?? contribNum ?? 0),
      imageUrl: localPreview,
      image_url: data.image_url ?? null,
    };

    setGoals((prev) => [real, ...prev.filter((g) => g.id !== optimistic.id)]);
    closeModal();
  }

  async function addContribution(goalId: string, amount: number) {
    if (!supabase) return;
    if (!userId) return;

    // optimistic UI
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g
      )
    );

    const current = goals.find((g) => g.id === goalId);
    if (!current) return;

    const newSaved = Math.min(current.target, current.saved + amount);

    const { error } = await supabase
      .from("goals")
      .update({ saved: newSaved })
      .eq("id", goalId)
      .eq("user_id", userId);

    if (error) {
      setLoadError(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          .se-motion { animation: none !important; transition: none !important; }
        }

        @keyframes seFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes seScaleIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes seOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .se-page-in { opacity: 0; animation: seFadeUp 520ms ease-out forwards; }
        .se-card-in { opacity: 0; animation: seFadeUp 520ms ease-out forwards; }
        .se-modal-overlay { opacity: 0; animation: seOverlayIn 180ms ease-out forwards; }
        .se-modal-panel { opacity: 0; animation: seScaleIn 220ms ease-out forwards; }

        .se-hover-lift { transition: transform 220ms ease, box-shadow 220ms ease; }
        .se-hover-lift:hover { transform: translateY(-2px); box-shadow: 0 18px 60px rgba(0,0,0,0.12); }

        .se-btn { transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease, background-color 180ms ease; }
        .se-btn:active { transform: translateY(1px); }
      `}</style>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="rounded-[28px] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.12)] ring-1 ring-black/5 min-h-[calc(100vh-140px)] se-motion se-page-in">
          <div className="px-6 py-8 sm:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">Goals</h1>
            <p className="mt-1 text-sm text-zinc-500">Track and achieve your savings goals.</p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-md se-btn hover:bg-blue-700"
          >
            + Create Goal
          </button>
        </div>

        {loadError ? (
          <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
            {loadError}
          </div>
        ) : null}

        {loading ? <p className="mb-6 text-sm text-zinc-500">Loading goals…</p> : null}

        <div className="mb-8">
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm se-hover-lift">
            <p className="text-sm text-zinc-500">Total Saved</p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-900">${formatMoney(totalSaved)}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {goals.map((g, idx) => {
            const pct = Math.max(0, Math.min(100, Math.round((g.saved / g.target) * 100)));

            return (
              <div
                key={g.id}
                className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm se-motion se-card-in se-hover-lift"
                style={{ animationDelay: `${Math.min(idx, 12) * 60}ms` }}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                      {g.image_url || g.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={(g.image_url || g.imageUrl) as string}
                          alt="goal"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-zinc-400">
                          IMG
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-zinc-900">{g.title}</h3>
                      <p className="text-xs text-zinc-400">Target: ${formatMoney(g.target)}</p>
                    </div>
                  </div>

                  <span className="text-sm font-semibold text-zinc-900">{pct}%</span>
                </div>

                <div className="mb-3 h-2 w-full rounded-full bg-zinc-100">
                  <div className="h-2 rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Saved: ${formatMoney(g.saved)}</span>
                  <span className="text-zinc-400">Remaining: ${formatMoney(Math.max(0, g.target - g.saved))}</span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-zinc-500">
                    Contributing ${formatMoney(g.contributingMonthly)} / month
                  </span>

                  <button
                    type="button"
                    onClick={() => addContribution(g.id, g.contributingMonthly || 50)}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm se-btn hover:bg-blue-700"
                  >
                    + Add ${formatMoney(g.contributingMonthly || 50)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
          </div>
        </div>
      </main>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 se-motion se-modal-overlay">
          <button
            type="button"
            aria-label="Close"
            onClick={closeModal}
            className="absolute inset-0 bg-black/30"
          />

          <div className="relative w-full max-w-[520px] rounded-2xl bg-white p-6 shadow-xl se-motion se-modal-panel">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Create goal</h2>
                <p className="mt-1 text-sm text-zinc-500">Add a goal, target amount, and optional image.</p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-500 hover:bg-zinc-50"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <div className="rounded-xl border border-zinc-200 p-4">
                <p className="text-xs font-semibold text-zinc-600">Goal image (optional)</p>

                <div className="mt-3 flex items-center gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                    {imagePreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagePreviewUrl} alt="preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-zinc-400">
                        Preview
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-100">
                      Choose image
                      <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
                    </label>

                    <p className="mt-2 text-xs text-zinc-500">
                      {imageFileName
                        ? imageFileName
                        : "PNG/JPG recommended. It will display as a small square on the card."}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600">Goal title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., New iPhone"
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/25"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600">Target ($)</label>
                  <input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    inputMode="numeric"
                    placeholder="1500"
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/25"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600">Saved so far ($)</label>
                  <input
                    value={saved}
                    onChange={(e) => setSaved(e.target.value)}
                    inputMode="numeric"
                    placeholder="0"
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/25"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600">Contributing / month ($)</label>
                  <input
                    value={contributingMonthly}
                    onChange={(e) => setContributingMonthly(e.target.value)}
                    inputMode="numeric"
                    placeholder="50"
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/25"
                  />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-11 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addGoal}
                  className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm se-btn hover:bg-blue-700"
                >
                  Create
                </button>
              </div>

              <p className="text-[11px] text-zinc-400">
                Note: the selected image is a local preview. To keep it after refresh, upload it to Supabase Storage and save the public URL in `image_url`.
              </p>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}