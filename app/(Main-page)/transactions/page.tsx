"use client";
import { supabase } from "@/src/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

type TxType = "Income" | "Expense";
type TimeRange = "this_month" | "last_month";

type Transaction = {
  id: string;
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

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M10.5 19a8.5 8.5 0 1 1 0-17 8.5 8.5 0 0 1 0 17Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white border border-zinc-100 shadow-[0_10px_25px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYYYYMMDD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toYYYYMMDD(d);
}

function parseDateYYYYMMDD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function isInThisMonth(dateStr: string) {
  const d = parseDateYYYYMMDD(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isInLastMonth(dateStr: string) {
  const d = parseDateYYYYMMDD(dateStr);
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d.getFullYear() === last.getFullYear() && d.getMonth() === last.getMonth();
}

function AmountPill({ type, amount }: { type: TxType; amount: number }) {
  const sign = type === "Income" ? "+" : "-";
  return (
    <span className={cn("text-sm font-semibold", type === "Income" ? "text-emerald-600" : "text-red-500")}>
      {sign}${amount.toLocaleString()}
    </span>
  );
}

function TypeChip({ type }: { type: TxType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        type === "Income" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      )}
    >
      {type}
    </span>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      const { data, error } = await supabase
        .from("transactions")
        .select("id,type,title,category,amount,occurred_on,note")
        .order("occurred_on", { ascending: false });

      if (error) {
        console.error("Failed to load transactions:", error.message);
        return;
      }

      if (!isMounted) return;

      // Supabase can return `occurred_on` as a Date or string depending on settings.
      const normalized: Transaction[] = (data ?? []).map((row: any) => ({
        id: String(row.id),
        type: row.type as TxType,
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

      setTransactions(normalized);
    }

    loadTransactions();

    return () => {
      isMounted = false;
    };
  }, []);

  const [filterType, setFilterType] = useState<"all" | TxType>("all");
  const [range, setRange] = useState<TimeRange>("this_month");
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [formType, setFormType] = useState<TxType>("Expense");
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("0.00");
  const [formDate, setFormDate] = useState(toYYYYMMDD(new Date()));
  const [formNote, setFormNote] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return transactions
      .filter((t) => (range === "this_month" ? isInThisMonth(t.occurred_on) : isInLastMonth(t.occurred_on)))
      .filter((t) => (filterType === "all" ? true : t.type === filterType))
      .filter((t) => {
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.note || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => parseDateYYYYMMDD(b.occurred_on).getTime() - parseDateYYYYMMDD(a.occurred_on).getTime());
  }, [transactions, filterType, range, search]);

  function openAddModal() {
    setFormType("Expense");
    setFormTitle("");
    setFormCategory("");
    setFormAmount("0.00");
    setFormDate(toYYYYMMDD(new Date()));
    setFormNote("");
    setOpen(true);
  }

  function addTransaction() {
    const amt = Number(formAmount);

    if (!formTitle.trim()) return;
    if (!formCategory.trim()) return;
    if (!formDate.trim()) return;
    if (!Number.isFinite(amt) || amt <= 0) return;

    const tx: Transaction = {
      id: crypto.randomUUID(),
      type: formType,
      title: formTitle.trim(),
      category: formCategory.trim(),
      amount: Math.round(amt * 100) / 100,
      occurred_on: formDate,
      note: formNote.trim() ? formNote.trim() : undefined,
    };

    setTransactions((prev) => [tx, ...prev]);
    setOpen(false);
  }

    return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          .motion-safe-anim { animation: none !important; transition: none !important; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fade-up { opacity: 0; animation: fadeUp 650ms ease-out forwards; }
        .fade-up.d1 { animation-delay: 80ms; }
        .fade-up.d2 { animation-delay: 180ms; }
        .fade-up.d3 { animation-delay: 280ms; }

        .hover-lift { transition: transform 220ms ease, box-shadow 220ms ease; }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 18px 45px rgba(15, 23, 42, 0.10); }
      `}</style>

      {/* ✅ NO header here → avoids duplicate navbar */}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
        {/* Big centered white card like your Dashboard */}
        <div className="motion-safe-anim fade-up d1 rounded-[28px] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.12)] ring-1 ring-black/5 flex flex-col min-h-[calc(100vh-140px)]">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-7 sm:px-8">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">Transaction</h1>
              <p className="mt-1 text-sm text-zinc-500">Overview of your finance &amp; latest review.</p>
            </div>

            <button
              onClick={openAddModal}
              className="motion-safe-anim fade-up d2 inline-flex items-center gap-2 rounded-full bg-[#2F52FF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              <IconPlus />
              Add Transaction
            </button>
          </div>

          {/* Filters row */}
          <div className="px-6 pb-6 pt-6 sm:px-8 flex-1 flex flex-col">
            <div className="motion-safe-anim fade-up d2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "Income", "Expense"] as const).map((k) => {
                  const active = filterType === k;
                  const label = k === "all" ? "All" : k;
                  return (
                    <button
                      key={k}
                      onClick={() => setFilterType(k)}
                      className={cn(
                        "h-9 rounded-xl px-4 text-sm font-semibold transition",
                        active ? "bg-[#2F52FF] text-white" : "text-zinc-500 hover:bg-zinc-50"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}

                <div className="mx-2 hidden h-6 w-px bg-zinc-200 sm:block" />

                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value as TimeRange)}
                  className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 outline-none hover:bg-zinc-50"
                >
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                </select>
              </div>

              <div className="relative w-full sm:w-[260px]">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  <IconSearch />
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="h-9 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#2F52FF]/20"
                />
              </div>
            </div>

            {/* Table header */}
            <div className="mt-5 grid grid-cols-[44px_1fr_120px] sm:grid-cols-[44px_1fr_140px_120px] items-center px-2 text-xs font-semibold text-zinc-500">
              <div />
              <div>Title</div>
              <div className="text-right">Amount</div>
              <div className="hidden sm:block text-right">Status</div>
            </div>

            {/* Rows */}
            <div className="mt-3 flex-1 space-y-3 overflow-auto pr-1">
              {filtered.length === 0 ? (
                <div className="motion-safe-anim fade-up d3 flex-1 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-14 text-center text-sm text-zinc-500 flex items-center justify-center">
                  No transactions found for this filter.
                </div>
              ) : (
                filtered.map((t) => (
                  <div
                    key={t.id}
                    className="hover-lift rounded-2xl border border-zinc-100 bg-white px-2 py-3"
                  >
                    <div className="grid grid-cols-[44px_1fr_120px] sm:grid-cols-[44px_1fr_140px_120px] items-center">
                      <div className="flex items-center justify-center">
                        <div
                          className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold",
                            t.type === "Income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                          )}
                        >
                          {t.type === "Income" ? "↗" : "↘"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-900">{t.title}</p>
                          <TypeChip type={t.type} />
                          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
                            {t.category}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {t.occurred_on}
                          {t.note ? ` • ${t.note}` : ""}
                        </p>
                      </div>

                      <div className="text-right">
                        <AmountPill type={t.type} amount={t.amount} />
                      </div>

                      <div className="hidden sm:block text-right">
                        <span className="text-xs font-semibold text-emerald-600">Paid</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal */}
        {open ? (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2">
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-900">Add Transaction</p>
                  <button
                    className="h-9 w-9 rounded-lg hover:bg-zinc-50 flex items-center justify-center text-zinc-600"
                    onClick={() => setOpen(false)}
                  >
                    <IconClose />
                  </button>
                </div>

                <p className="mt-1 text-xs text-zinc-500">Cash out = Expense, cash in = Income.</p>

                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600">Type</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as TxType)}
                      className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#2F52FF]/20"
                    >
                      <option value="Expense">Expense</option>
                      <option value="Income">Income</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600">Title</label>
                    <input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Coffee, Salary, Rent..."
                      className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#2F52FF]/20"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#2F52FF]/20"
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      <option value="Food">Food</option>
                      <option value="Transport">Transport</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Job">Job</option>
                      <option value="Side Job">Side Job</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600">Amount ($)</label>
                      <input
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#2F52FF]/20"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600">Date</label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#2F52FF]/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600">Note (optional)</label>
                    <input
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      placeholder="Any detail you want to remember"
                      className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#2F52FF]/20"
                    />
                  </div>

                  <button
                    onClick={addTransaction}
                    className="mt-1 h-10 w-full rounded-xl bg-[#111827] text-white text-sm font-semibold hover:bg-[#1F2937] transition"
                  >
                    Save Transaction
                  </button>
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}