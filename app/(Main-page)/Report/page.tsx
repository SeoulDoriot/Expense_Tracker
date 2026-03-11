"use client";

import { supabase } from "@/src/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import {
  formatAppCurrency,
  type AppCurrency,
  type AppLanguage,
} from "@/src/lib/appPreferences";
import { useAppPreferences } from "@/src/hooks/useAppPreferences";

type TxType = "Income" | "Expense";

type Transaction = {
  id: string;
  user_id?: string;
  type: TxType;
  title: string;
  category: string;
  amount: number;
  occurred_on: string; // YYYY-MM-DD
  note?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYYYYMMDD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseDateYYYYMMDD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function daysBack(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toYYYYMMDD(d);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function normalizeTransactionType(value: unknown): TxType {
  return String(value).toLowerCase() === "income" ? "Income" : "Expense";
}

function formatMoney(n: number, currency: AppCurrency, language: AppLanguage) {
  return formatAppCurrency(n, currency, language, {
    maximumFractionDigits: currency === "KHR" ? 0 : 2,
  });
}

/* ---------- tiny icons (no external lib) ---------- */
function IconWallet() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7.5c0-1.4 1.1-2.5 2.5-2.5H18a2 2 0 0 1 2 2v1.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 9.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.5H6.5A2.5 2.5 0 0 0 4 9.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M18 13h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconUp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconDown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconPercent() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M19 5 5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M7.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M12 10v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 7h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- simple SVG charts ---------- */
function BarCompareChart({
  title,
  subtitle,
  income,
  expense,
  currency,
  language,
}: {
  title: string;
  subtitle: string;
  income: number;
  expense: number;
  currency: AppCurrency;
  language: AppLanguage;
}) {
  const max = Math.max(income, expense, 1);

  const incomeH = Math.round((income / max) * 180);
  const expenseH = Math.round((expense / max) * 180);

  return (
    <div className="rounded-2xl bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
      <div className="px-6 pt-6">
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      </div>

      <div className="px-6 pb-6 pt-4">
        <div className="h-[220px] sm:h-[240px] w-full rounded-2xl bg-zinc-50 ring-1 ring-zinc-100">
          <svg viewBox="0 0 360 220" className="h-full w-full">
            <line x1="30" y1="200" x2="340" y2="200" stroke="#E5E7EB" strokeWidth="2" />

            <rect x="90" y={200 - incomeH} width="70" height={incomeH} rx="12" fill="#10B981" opacity="0.85" />
            <rect x="200" y={200 - expenseH} width="70" height={expenseH} rx="12" fill="#EF4444" opacity="0.85" />

            <text x="125" y="214" textAnchor="middle" fontSize="12" fill="#6B7280">
              Income
            </text>
            <text x="235" y="214" textAnchor="middle" fontSize="12" fill="#6B7280">
              Expense
            </text>

            <text x="125" y={Math.max(28, 200 - incomeH - 10)} textAnchor="middle" fontSize="12" fill="#065F46">
              {formatMoney(income, currency, language)}
            </text>
            <text x="235" y={Math.max(28, 200 - expenseH - 10)} textAnchor="middle" fontSize="12" fill="#7F1D1D">
              {formatMoney(expense, currency, language)}
            </text>
          </svg>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Income
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Expense
          </span>
        </div>
      </div>
    </div>
  );
}

function LineTrendChart({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle: string;
  points: Array<{ xLabel: string; value: number }>;
}) {
  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);

  const W = 360;
  const H = 220;
  const padX = 24;
  const padY = 22;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const coords = points.map((p, i) => {
    const x = padX + (points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW);
    const y = padY + (1 - p.value / max) * innerH;
    return { x, y };
  });

  const d = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <div className="rounded-2xl bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
      <div className="px-6 pt-6">
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      </div>

      <div className="px-6 pb-6 pt-4">
        <div className="h-[220px] sm:h-[240px] w-full rounded-2xl bg-zinc-50 ring-1 ring-zinc-100">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
            {[0.25, 0.5, 0.75].map((t) => {
              const y = padY + t * innerH;
              return <line key={t} x1={padX} y1={y} x2={W - padX} y2={y} stroke="#E5E7EB" strokeWidth="1" />;
            })}
            <path d={d} fill="none" stroke="#2F52FF" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {coords.map((c, idx) => (
              <circle key={idx} cx={c.x} cy={c.y} r="4" fill="#2F52FF" opacity="0.9" />
            ))}
          </svg>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
          <span>{points[0]?.xLabel || ""}</span>
          <span>{points[Math.floor(points.length / 2)]?.xLabel || ""}</span>
          <span>{points[points.length - 1]?.xLabel || ""}</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
  tone,
  onInfo,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone: "neutral" | "income" | "expense" | "rate";
  onInfo: () => void;
}) {
  const toneCls =
    tone === "income"
      ? "text-emerald-700 bg-emerald-100"
      : tone === "expense"
      ? "text-red-600 bg-red-100"
      : tone === "rate"
      ? "text-indigo-700 bg-indigo-100"
      : "text-zinc-700 bg-zinc-100";

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_10px_25px_rgba(0,0,0,0.08)] ring-1 ring-black/5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.10)] transition duration-200 hover:-translate-y-[2px]">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", toneCls)}>{icon}</div>

        <button
          onClick={onInfo}
          className="h-9 w-9 rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition flex items-center justify-center"
          title="Info"
          type="button"
        >
          <IconInfo />
        </button>
      </div>

      <p className="mt-3 text-xs font-medium text-zinc-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
      <p className="mt-1 text-[11px] text-emerald-600">{sub}</p>
    </div>
  );
}

export default function ReportPage() {
  const { settings } = useAppPreferences();
  const [tx, setTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [infoOpen, setInfoOpen] = useState<null | "net" | "income" | "expense" | "rate">(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;

      const fromDate = daysBack(120);

      let q = supabase
        .from("transactions")
        .select("id,user_id,type,title,category,amount,occurred_on,note")
        .gte("occurred_on", fromDate)
        .order("occurred_on", { ascending: false });

      if (userId) q = q.eq("user_id", userId);

      const { data, error } = await q;

      if (!alive) return;

      if (error) {
        console.error("Report load error:", error.message);
        setTx([]);
        setLoading(false);
        return;
      }

      const normalized: Transaction[] = (data ?? []).map((row: any) => ({
        id: String(row.id),
        user_id: row.user_id ? String(row.user_id) : undefined,
        type: normalizeTransactionType(row.type),
        title: String(row.title ?? ""),
        category: String(row.category ?? ""),
        amount: typeof row.amount === "number" ? row.amount : Number(row.amount ?? 0),
        occurred_on:
          typeof row.occurred_on === "string"
            ? row.occurred_on
            : row.occurred_on instanceof Date
            ? row.occurred_on.toISOString().slice(0, 10)
            : String(row.occurred_on ?? ""),
        note: row.note ?? undefined,
      }));

      setTx(normalized);
      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  const now = new Date();
  const thisMonthKey = monthKey(now);

  const computed = useMemo(() => {
    let thisMonthIncome = 0;
    let thisMonthExpense = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    for (const t of tx) {
      const amt = Number(t.amount) || 0;
      const mKey = monthKey(parseDateYYYYMMDD(t.occurred_on));

      if (t.type === "Income") {
        totalIncome += amt;
        if (mKey === thisMonthKey) thisMonthIncome += amt;
      } else {
        totalExpense += amt;
        if (mKey === thisMonthKey) thisMonthExpense += amt;
      }
    }

    const monthExpenseAbs = Math.abs(thisMonthExpense);
    const totalExpenseAbs = Math.abs(totalExpense);

    const netWorth = totalIncome - totalExpenseAbs;
    const savingRate =
      thisMonthIncome <= 0 ? 0 : Math.round(((thisMonthIncome - monthExpenseAbs) / thisMonthIncome) * 100);

    const days = 30;
    const labels: Array<{ xLabel: string; value: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toYYYYMMDD(d);
      const short = `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;

      let dayExpense = 0;
      for (const t of tx) {
        if (t.occurred_on === key && t.type === "Expense") dayExpense += Math.abs(Number(t.amount) || 0);
      }

      labels.push({ xLabel: short, value: dayExpense });
    }

    return {
      netWorth,
      monthIncome: thisMonthIncome,
      monthExpense: monthExpenseAbs,
      savingRate,
      trend: labels,
    };
  }, [tx, thisMonthKey]);

  return (
    <div className="min-h-screen bg-transparent">
      {/* no navbar here (your layout already has it) */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          .motion-safe-anim {
            animation: none !important;
            transition: none !important;
          }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .fade-up {
          opacity: 0;
          animation: fadeUp 650ms ease-out forwards;
        }
        .fade-up.d1 {
          animation-delay: 80ms;
        }
        .fade-up.d2 {
          animation-delay: 180ms;
        }
        .fade-up.d3 {
          animation-delay: 280ms;
        }
      `}</style>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="motion-safe-anim fade-up d1 rounded-[28px] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.12)] ring-1 ring-black/5 min-h-[calc(100vh-140px)] flex flex-col">
          {/* Header */}
          <div className="px-6 pt-7 sm:px-8">
            <h1 className="text-2xl font-semibold text-zinc-900">Report</h1>
            <p className="mt-1 text-sm text-zinc-500">Your financial summary & trends in one clean view.</p>
          </div>

          {/* Stats */}
          <div className="px-6 pb-2 pt-6 sm:px-8">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Net Worth"
                value={loading ? "—" : formatMoney(computed.netWorth, settings.currency, settings.language)}
                sub="All-time balance overview"
                icon={<IconWallet />}
                tone="neutral"
                onInfo={() => setInfoOpen("net")}
              />
              <StatCard
                title="Monthly Income"
                value={loading ? "—" : formatMoney(computed.monthIncome, settings.currency, settings.language)}
                sub="Total income this month"
                icon={<IconUp />}
                tone="income"
                onInfo={() => setInfoOpen("income")}
              />
              <StatCard
                title="Monthly Expense"
                value={loading ? "—" : formatMoney(computed.monthExpense, settings.currency, settings.language)}
                sub="Total spending this month"
                icon={<IconDown />}
                tone="expense"
                onInfo={() => setInfoOpen("expense")}
              />
              <StatCard
                title="Saving Rate"
                value={loading ? "—" : `${computed.savingRate}%`}
                sub="Based on this month"
                icon={<IconPercent />}
                tone="rate"
                onInfo={() => setInfoOpen("rate")}
              />
            </div>
          </div>

          {/* Charts */}
          <div className="px-6 pb-8 pt-6 sm:px-8 flex-1">
            <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
              <BarCompareChart
                title="Monthly Income vs Expense"
                subtitle="Compare your monthly financial flow"
                income={computed.monthIncome}
                expense={computed.monthExpense}
                currency={settings.currency}
                language={settings.language}
              />

              <LineTrendChart title="30-Day Spending Trend" subtitle="Your daily expense activity" points={computed.trend} />
            </div>

            {!loading && tx.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-600">
                No transactions yet. Add transactions first, then your report will show real charts.
              </div>
            ) : null}
          </div>
        </div>

        {/* Info popup */}
        {infoOpen ? (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setInfoOpen(null)} />
            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)] ring-1 ring-black/10">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-900">What does this mean?</p>
                <button
                  type="button"
                  className="h-9 w-9 rounded-full bg-zinc-100 hover:bg-zinc-200 transition"
                  onClick={() => setInfoOpen(null)}
                >
                  ✕
                </button>
              </div>

              <div className="mt-3 text-sm text-zinc-700 leading-6">
                {infoOpen === "net" ? (
                  <>
                    <p className="font-semibold">Net Worth</p>
                    <p className="mt-1">
                      This is your all-time balance: <b>Total Income</b> minus <b>Total Expenses</b>. It helps you see your
                      overall financial position.
                    </p>
                  </>
                ) : infoOpen === "income" ? (
                  <>
                    <p className="font-semibold">Monthly Income</p>
                    <p className="mt-1">Total money you earned this month (salary, side jobs, gifts, etc.).</p>
                  </>
                ) : infoOpen === "expense" ? (
                  <>
                    <p className="font-semibold">Monthly Expense</p>
                    <p className="mt-1">Total money you spent this month (food, bills, transport, shopping, etc.).</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Saving Rate</p>
                    <p className="mt-1">
                      How much you saved from your income this month: <b>(Income − Expense) / Income</b>. A higher % means
                      better saving behavior.
                    </p>
                  </>
                )}
              </div>

              <button
                onClick={() => setInfoOpen(null)}
                className="mt-4 h-10 w-full rounded-xl bg-[#111827] text-white text-sm font-semibold hover:bg-[#1F2937] transition"
              >
                Got it
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
