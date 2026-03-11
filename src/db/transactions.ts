import { supabase } from "@/src/lib/supabaseClient";

export type DbTransaction = {
  id: string;
  user_id: string;
  title: string;
  type: "income" | "expense";
  category: string | null;
  note: string | null;
  amount: number;
  occurred_on: string; // yyyy-mm-dd
  created_at: string;
};

export async function getRecentTransactions(limit = 5) {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const user = sessionData.session?.user;
  if (!user) throw new Error("Not logged in.");

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as DbTransaction[];
}

export type NewTransactionInput = {
  title: string;
  type: "income" | "expense";
  category?: string | null;
  note?: string | null;
  amount: number;
  occurred_on: string; // yyyy-mm-dd
};

export async function createTransaction(input: NewTransactionInput) {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;

  const user = sessionData.session?.user;
  if (!user) throw new Error("Not logged in.");

  const payload = {
    user_id: user.id,
    title: input.title,
    type: input.type,
    category: input.category ?? null,
    note: input.note ?? null,
    amount: input.amount,
    occurred_on: input.occurred_on,
  };

  const { data, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as DbTransaction;
}

export async function listTransactions(limit = 50) {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const user = sessionData.session?.user;
  if (!user) throw new Error("Not logged in.");

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as DbTransaction[];
}
