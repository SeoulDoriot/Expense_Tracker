"use client";

import { useState } from "react";


export default function SupportPage() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(data?.error || "Failed to send.");
      } else {
        setStatus("✅ Sent! We received your message.");
        setEmail("");
        setSubject("");
        setMessage("");
      }
    } catch {
      setStatus("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="min-h-screen bg-[#fbfbfb] text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <h1 className="text-4xl font-extrabold tracking-tight">Support</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
            Need help using Smart Expense? Find quick answers, learn features, or contact us.
          </p>

          {/* Quick actions */}
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#faq"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:opacity-90"
            >
              View FAQ
            </a>
            <a
              href="#learn"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Learn more
            </a>
            <a
              href="#contact"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Contact support
            </a>
          </div>
        </div>

        {/* Learn more */}
        <section id="learn" className="mt-10">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <SupportCard
              title="Getting started"
              desc="Create an account, add your first transaction, and learn the dashboard."
              bullets={["Sign up / Log in", "Add income & expense", "See your summary"]}
            />
            <SupportCard
              title="Transactions"
              desc="Learn how filters, categories, and status work."
              bullets={["All / Income / Expense", "Search by title", "Edit & delete items"]}
            />
            <SupportCard
              title="Goals & budgets"
              desc="Track savings goals and stay on budget."
              bullets={["Create a goal", "Contributing amount", "Progress tracking"]}
            />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-12">
          <h2 className="text-2xl font-bold">FAQ</h2>
          <div className="mt-5 space-y-4">
            <FAQ
              q="I can’t log in. What should I do?"
              a="Check your email/password, then try again. If you use OTP, request a new code and verify it. Also make sure your Supabase keys are correct in .env.local."
            />
            <FAQ
              q="Why don’t I see my data?"
              a="If you use Supabase tables, each user should see only their own records (RLS + user_id). Make sure you created the table and policies correctly."
            />
            <FAQ
              q="Can I edit or delete a transaction?"
              a="Yes. Add edit/delete actions on each row/card. If you want, I can generate the UI and the Supabase queries for it."
            />
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="mt-12">
          <h2 className="text-2xl font-bold">Contact</h2>

          <h1 className="text-3xl font-bold">Support</h1>

        <form
          onSubmit={onSubmit}
          className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-3"
        >
          <input
            className="h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
            placeholder="Your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <textarea
            className="min-h-[140px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none"
            placeholder="Write your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />

          {status && <p className="text-sm text-zinc-600">{status}</p>}

          <button
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-zinc-900 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Submit"}
          </button>
        </form>
        </section>

        {/* Footer small */}
        <div className="mt-12 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Smart Expense — Support
        </div>
      </div>
    </main>
  );
}

function SupportCard({
  title,
  desc,
  bullets,
}: {
  title: string;
  desc: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-[6px] h-2 w-2 rounded-full bg-slate-900/30" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
        {q}
      </summary>
      <p className="mt-3 text-sm leading-7 text-slate-600">{a}</p>
    </details>
  );
}