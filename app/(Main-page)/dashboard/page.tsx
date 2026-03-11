"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { readStoredJson, removeStoredValue, writeStoredJson } from "@/src/lib/browserStorage";
import {
  convertCurrencyToUsd,
  formatAppCurrency,
  getCurrencyCode,
  type AppCurrency,
  type AppLanguage,
} from "@/src/lib/appPreferences";
import { useAppPreferences } from "@/src/hooks/useAppPreferences";
import {
  getTransactionCategories,
  isValidTransactionCategory,
} from "@/src/lib/transactionCategories";

type TxType = "Income" | "Expense";

type Transaction = {
  id: string;
  title: string;
  type: TxType;
  tag: string;
  date: string;
  amount: number; // signed in UI (+ income, - expense)
};

type StatKey = "balance" | "income" | "expense" | "rate";

type StatMeta = {
  key: StatKey;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  description: string;
};

type DashboardDraft = {
  txType: TxType;
  amount: string;
  description: string;
  category: string;
  date: string;
};

const DASHBOARD_DRAFT_KEY = "dashboard-transaction-draft";

function formatMoney(amount: number, currency: AppCurrency, language: AppLanguage) {
  return formatAppCurrency(amount, currency, language, {
    signed: true,
    maximumFractionDigits: currency === "KHR" ? 0 : 2,
  });
}

function formatCurrency(amount: number, currency: AppCurrency, language: AppLanguage) {
  return formatAppCurrency(amount, currency, language, {
    maximumFractionDigits: currency === "KHR" ? 0 : 2,
  });
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "neutral" | "income" | "expense" }) {
  const cls =
    tone === "income"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "expense"
      ? "bg-rose-50 text-rose-700 border-rose-100"
      : "bg-zinc-50 text-zinc-700 border-zinc-100";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

function CircleIcon({ tone }: { tone: "income" | "expense" }) {
  const wrap = tone === "income" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700";
  return (
    <div className={`h-9 w-9 rounded-full ${wrap} flex items-center justify-center`}> 
      <span className="text-sm font-semibold">{tone === "income" ? "↗" : "↘"}</span>
    </div>
  );
}

function IconBalance() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 7V6a2 2 0 012-2h6a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconIncome() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 3h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconExpense() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 21h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconRate() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 16v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 16V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 16v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 6l4 3 4-5 4 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 17v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 7h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)] ring-1 ring-black/5 animate-seoul-pop">
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{title}</p>
              <p className="mt-1 text-xs text-zinc-500">Details & tips</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              aria-label="Close"
            >
              <XIcon />
            </button>
          </div>
          <div className="px-6 pb-6 pt-4 text-sm leading-6 text-zinc-700">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { settings } = useAppPreferences();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Info modal
  const [openInfo, setOpenInfo] = useState<StatKey | null>(null);

  // Form state
  const [txType, setTxType] = useState<TxType>("Expense");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [draftReady, setDraftReady] = useState(false);
  const categoryOptions = useMemo(() => getTransactionCategories(txType), [txType]);

  const stats = useMemo(() => {
    const income = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const balance = income - expense;

    return {
      totalBalance: balance,
      totalIncome: income,
      totalExpense: expense,
      savingRate: income === 0 ? 0 : Math.round(((income - expense) / income) * 100),
    };
  }, [transactions]);

  const statMeta: StatMeta[] = useMemo(
    () => [
      {
        key: "balance",
        title: "Total Balance",
        subtitle: "Your current net balance",
        icon: <IconBalance />,
        description:
          "Total Balance = Total Income − Total Expense. This is your net money after expenses. Add income/expense to see it update instantly.",
      },
      {
        key: "income",
        title: "Total Income",
        subtitle: "Money coming in",
        icon: <IconIncome />,
        description:
          "Income is money you receive (salary, freelance, allowance). Add an Income transaction to increase it.",
      },
      {
        key: "expense",
        title: "Total Expense",
        subtitle: "Money going out",
        icon: <IconExpense />,
        description:
          "Expense is money you spend (food, transport, bills). Add an Expense transaction to increase expense.",
      },
      {
        key: "rate",
        title: "Saving Rate",
        subtitle: "How much you keep",
        icon: <IconRate />,
        description:
          "Saving Rate = (Income − Expense) / Income. If you spend less, your saving rate goes up.",
      },
    ],
    []
  );

  async function loadTransactions() {
    setLoadingTx(true);
    setTxError(null);

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const user = sessionData.session?.user;
      if (!user) {
        setTransactions([]);
        return;
      }

      // IMPORTANT: your DB columns are: title, type, category, occurred_on, amount
      const { data, error } = await supabase
        .from("transactions")
        .select("id,title,type,category,occurred_on,amount,created_at")
        .eq("user_id", user.id)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: Transaction[] = (data ?? []).map((t: any) => {
        const isIncome = String(t.type).toLowerCase() === "income";
        const signedAmount = isIncome ? Number(t.amount) : -Number(t.amount);

        return {
          id: String(t.id),
          title: String(t.title ?? "Transaction"),
          type: isIncome ? "Income" : "Expense",
          tag: t.category ? String(t.category) : "General",
          date: t.occurred_on ? new Date(String(t.occurred_on)).toLocaleDateString() : new Date().toLocaleDateString(),
          amount: signedAmount,
        };
      });

      setTransactions(mapped);
    } catch (e: any) {
      setTxError(e?.message ?? "Failed to load transactions");
    } finally {
      setLoadingTx(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    const draft = readStoredJson<DashboardDraft>(DASHBOARD_DRAFT_KEY);

    if (draft) {
      setTxType(draft.txType ?? "Expense");
      setAmount(draft.amount ?? "");
      setDescription(draft.description ?? "");
      setCategory(draft.category ?? "");
      setDate(draft.date ?? "");
    }

    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) {
      return;
    }

    writeStoredJson<DashboardDraft>(DASHBOARD_DRAFT_KEY, {
      txType,
      amount,
      description,
      category,
      date,
    });
  }, [amount, category, date, description, draftReady, txType]);

  useEffect(() => {
    if (!category) {
      return;
    }

    if (!isValidTransactionCategory(txType, category)) {
      setCategory("");
    }
  }, [category, txType]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setupRealtime() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      channel = supabase
        .channel(`dashboard-transactions-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void loadTransactions();
          }
        )
        .subscribe();
    }

    function handleFocusRefresh() {
      void loadTransactions();
    }

    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        void loadTransactions();
      }
    }

    void setupRealtime();
    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  async function addTransaction() {
    const n = Number(amount);
    if (!n || n <= 0) return;

    if (!category) {
      setTxError("Please choose a category.");
      return;
    }

    setTxError(null);

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const user = sessionData.session?.user;
      if (!user) throw new Error("Not logged in.");

      const title = description.trim() ? description.trim() : txType === "Income" ? "Income" : "Expense";
      const categoryValue = category.trim();
      const occurredOn = date ? date : new Date().toISOString().slice(0, 10);

      // DB expects type text; we store lower-case to keep consistent with policies
      const dbType = txType === "Income" ? "income" : "expense";

      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        title,
        type: dbType,
        category: categoryValue,
        amount: Math.round(convertCurrencyToUsd(n, settings.currency) * 100) / 100,
        occurred_on: occurredOn,
      });

      if (error) throw error;

      setAmount("");
      setDescription("");
      setCategory("");
      setDate("");
      removeStoredValue(DASHBOARD_DRAFT_KEY);

      await loadTransactions();
    } catch (e: any) {
      setTxError(e?.message ?? "Failed to add transaction");
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* subtle page bg like Figma */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-72 -top-52 h-[620px] w-[620px] rounded-full bg-slate-900/5" />
        <div className="absolute -left-64 top-[420px] h-[520px] w-[520px] rounded-full bg-slate-900/4" />
      </div>

      <div className="relative mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 animate-seoul-fadeup">Dashboard</h1>
          <p className="text-sm text-slate-500 animate-seoul-fadeup seoul-d2">Overview of your finances & latest activity</p>
        </div>

        {/* Top stat cards (4) */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:gap-6">
          {statMeta.map((m) => {
            const value =
              m.key === "balance"
                ? formatCurrency(stats.totalBalance, settings.currency, settings.language)
                : m.key === "income"
                ? formatCurrency(stats.totalIncome, settings.currency, settings.language)
                : m.key === "expense"
                ? formatCurrency(stats.totalExpense, settings.currency, settings.language)
                : `${stats.savingRate}%`;

            const chip =
              m.key === "expense" ? "-0.80% this month" : m.key === "rate" ? "Monthly average" : "+2.15% this month";

            return (
              <StatCard
                key={m.key}
                title={m.title}
                value={value}
                sub={chip}
                icon={m.icon}
                onInfo={() => setOpenInfo(m.key)}
              />
            );
          })}
        </div>

        {/* Main grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Add Transaction */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 animate-seoul-fadeup seoul-d2">
              <div className="flex items-center justify-between px-5 pt-5">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Add Transaction</p>
                  <p className="mt-1 text-xs text-zinc-500">Record a new income or expense</p>
                </div>

                <button
                  type="button"
                  onClick={addTransaction}
                  className="h-9 w-9 rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50"
                  title="Quick add"
                >
                  +
                </button>
              </div>

              <div className="px-5 pb-5 pt-4 space-y-4">
                <Field label="Transaction Type">
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as TxType)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 outline-none focus:border-zinc-300"
                  >
                    <option value="Expense">Expense</option>
                    <option value="Income">Income</option>
                  </select>
                </Field>

                <Field label={`Amount (${getCurrencyCode(settings.currency)})`}>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="0.00"
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 outline-none focus:border-zinc-300"
                    inputMode="decimal"
                  />
                </Field>

                <Field label="Description">
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter transaction description"
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 outline-none focus:border-zinc-300"
                  />
                </Field>

                <Field label="Category">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 outline-none focus:border-zinc-300"
                  >
                    <option value="" disabled>
                      Select category
                    </option>
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Date">
                  <input
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    type="date"
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 outline-none focus:border-zinc-300"
                  />
                </Field>

                <button
                  type="button"
                  onClick={addTransaction}
                  className="mt-2 w-full rounded-xl bg-[#0F172A] py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 active:scale-[0.99]"
                >
                  Add Transaction
                </button>

                {txError ? <p className="text-[12px] text-rose-600">{txError}</p> : null}
              </div>
            </div>
          </div>

          {/* Right: Recent Transactions */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 animate-seoul-fadeup seoul-d3">
              <div className="flex items-start justify-between gap-4 px-6 pt-6">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Recent Transactions</p>
                  <p className="mt-1 text-xs text-zinc-500">Your latest financial activities</p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] text-zinc-600">
                    Synced with Supabase
                  </span>
                </div>
              </div>

              <div className="px-4 pb-4 pt-4">
                <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100">
                  {loadingTx ? (
                    <div className="p-5 text-sm text-zinc-500">Loading…</div>
                  ) : transactions.length === 0 ? (
                    <div className="p-5 text-sm text-zinc-500">No transactions yet. Add your first one on the left.</div>
                  ) : (
                    transactions.slice(0, 6).map((t) => {
                      const isIncome = t.amount > 0;
                      return (
                        <div key={t.id} className="flex items-center gap-4 p-4 hover:bg-zinc-50 transition">
                          <CircleIcon tone={isIncome ? "income" : "expense"} />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-zinc-900">{t.title}</p>
                              <Pill tone={isIncome ? "income" : "expense"}>{t.type}</Pill>
                              <Pill tone="neutral">{t.tag}</Pill>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">{t.date}</p>
                          </div>

                          <div className="text-right">
                            <p className={`text-sm font-semibold ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                              {formatMoney(t.amount, settings.currency, settings.language)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <p className="mt-3 text-[11px] text-zinc-400">
                  Dashboard totals now use all saved transactions, while this list shows only your latest 6 records from the same Supabase table.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info modals */}
      <Modal
        open={openInfo !== null}
        title={statMeta.find((s) => s.key === openInfo)?.title ?? "Info"}
        onClose={() => setOpenInfo(null)}
      >
        {openInfo === "balance" ? (
          <>
            <p className="text-sm text-zinc-700">
              Your <span className="font-semibold">current balance</span> is:
            </p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{formatCurrency(stats.totalBalance, settings.currency, settings.language)}</p>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-700">How it’s calculated</p>
              <p className="mt-2 text-xs text-zinc-600">Balance = Income − Expense</p>
              <p className="mt-1 text-xs text-zinc-600">
                {formatCurrency(stats.totalIncome, settings.currency, settings.language)} − {formatCurrency(stats.totalExpense, settings.currency, settings.language)} = {formatCurrency(stats.totalBalance, settings.currency, settings.language)}
              </p>
            </div>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold text-zinc-700">Tip</p>
              <p className="mt-2 text-xs text-zinc-600">
                Add an <span className="font-medium">Income</span> to increase your balance, or an <span className="font-medium">Expense</span> to decrease it.
              </p>
            </div>
          </>
        ) : openInfo === "income" ? (
          <>
            <p className="text-sm text-zinc-700">Your <span className="font-semibold">total income</span> so far is:</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{formatCurrency(stats.totalIncome, settings.currency, settings.language)}</p>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-700">What counts as income</p>
              <ul className="mt-2 list-disc pl-5 text-xs text-zinc-600 space-y-1">
                <li>Salary / allowance</li>
                <li>Freelance / side job</li>
                <li>Refunds (if you want)</li>
              </ul>
            </div>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold text-zinc-700">Tip</p>
              <p className="mt-2 text-xs text-zinc-600">
                Keep categories consistent (e.g., <span className="font-medium">Job</span>, <span className="font-medium">Side Job</span>) so reports look clean.
              </p>
            </div>
          </>
        ) : openInfo === "expense" ? (
          <>
            <p className="text-sm text-zinc-700">Your <span className="font-semibold">total expense</span> so far is:</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{formatCurrency(stats.totalExpense, settings.currency, settings.language)}</p>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-700">What counts as expense</p>
              <ul className="mt-2 list-disc pl-5 text-xs text-zinc-600 space-y-1">
                <li>Food / groceries</li>
                <li>Transport</li>
                <li>Bills (electricity, water, internet)</li>
              </ul>
            </div>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold text-zinc-700">Tip</p>
              <p className="mt-2 text-xs text-zinc-600">
                Add a clear description (e.g., <span className="font-medium">“Lunch”</span>, <span className="font-medium">“Gas”</span>) to quickly find spending later.
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-zinc-700">Your <span className="font-semibold">saving rate</span> right now is:</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{stats.savingRate}%</p>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-700">How it’s calculated</p>
              <p className="mt-2 text-xs text-zinc-600">Saving Rate = (Income − Expense) / Income</p>
              <p className="mt-1 text-xs text-zinc-600">
                ({formatCurrency(stats.totalIncome, settings.currency, settings.language)} − {formatCurrency(stats.totalExpense, settings.currency, settings.language)}) / {formatCurrency(stats.totalIncome, settings.currency, settings.language)}
              </p>
            </div>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold text-zinc-700">Tip</p>
              <p className="mt-2 text-xs text-zinc-600">
                To improve saving rate: reduce expenses in big categories (Food, Bills) or increase income (Side Job).
              </p>
            </div>
          </>
        )}
      </Modal>

      {/* Page animations */}
      <style jsx global>{`
        @keyframes seoulFadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes seoulPop {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-seoul-fadeup {
          opacity: 0;
          animation: seoulFadeUp 650ms ease-out forwards;
        }
        .animate-seoul-pop {
          animation: seoulPop 180ms ease-out;
        }
        .seoul-d2 {
          animation-delay: 90ms;
        }
        .seoul-d3 {
          animation-delay: 180ms;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-seoul-fadeup {
            opacity: 1;
            animation: none !important;
          }
          .animate-seoul-pop {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
  onInfo,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  onInfo: () => void;
}) {
  return (
    <div className="group rounded-2xl bg-white px-6 py-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-[2px] hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)] animate-seoul-fadeup min-h-[132px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-500">{title}</p>
          <p className="mt-2 text-[28px] font-semibold leading-none text-zinc-900">{value}</p>
          <p className="mt-1 text-[11px] text-emerald-600">{sub}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="h-11 w-11 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center">{icon}</div>
          <button
            type="button"
            onClick={onInfo}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
            aria-label={`Info: ${title}`}
          >
            <span className="hidden sm:inline">Info</span>
            <span className="sm:hidden">i</span>
            <span className="text-zinc-500">
              <InfoIcon />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-zinc-600">{label}</p>
      {children}
    </div>
  );
}
