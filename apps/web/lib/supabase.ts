"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export interface PermitPilotUser {
  id: string;
  email: string;
  name: string;
  isDemoJudge?: boolean;
  mode: "supabase" | "local";
}

// localStorage keys so we remember who is signed in
const SESSION_KEY = "permitpilot:auth:user";
const ACCOUNTS_KEY = "permitpilot:auth:accounts";
const AUTH_EVENT = "permitpilot:auth-changed";

export const DEMO_JUDGE_EMAIL = "judge@permitpilot.demo";
export const DEMO_JUDGE_NAME = "CAC Judge (Demo Harbor)";
const DEMO_JUDGE_ID = "00000000-0000-4000-8000-000000000001";

let cachedClient: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  // only build the client once
  if (cachedClient !== undefined) return cachedClient;
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  // no keys = just use local accounts
  if (!rawUrl || !anonKey || rawUrl.includes("your-project-ref") || anonKey.includes("paste-your")) {
    cachedClient = null;
    return null;
  }
  const url = rawUrl.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function mapSupabaseUser(user: User): PermitPilotUser {
  const email = user.email ?? DEMO_JUDGE_EMAIL;
  const metaName =
    typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
      ? user.user_metadata.name.trim()
      : email.split("@")[0];
  return {
    id: user.id,
    email,
    name: metaName,
    isDemoJudge: email.toLowerCase() === DEMO_JUDGE_EMAIL,
    mode: "supabase",
  };
}

// whoever is in localStorage right now
export function getCurrentUser(): PermitPilotUser | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PermitPilotUser;
  } catch {
    return null;
  }
}

function setStoredUser(user: PermitPilotUser | null): void {
  if (!canUseStorage()) return;
  if (user) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
  window.dispatchEvent(new Event(AUTH_EVENT));
}

interface StoredLocalAccount {
  id: string;
  email: string;
  name: string;
  password: string;
}

function getLocalAccounts(): StoredLocalAccount[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredLocalAccount[];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: StoredLocalAccount[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// try cloud first then fall back to the browser list
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: PermitPilotUser | null; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return { user: null, error: "Enter both your email and password." };
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (!error && data.user) {
      const mapped = mapSupabaseUser(data.user);
      setStoredUser(mapped);
      return { user: mapped };
    }
    if (error && !normalizedEmail.endsWith(".demo")) {
      return { user: null, error: error.message };
    }
  }

  // local fallback if they dont have supabase set up
  const accounts = getLocalAccounts();
  const existing = accounts.find((acc) => acc.email === normalizedEmail);
  if (existing) {
    if (existing.password !== password) {
      return { user: null, error: "Incorrect password for this account." };
    }
    const user: PermitPilotUser = {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      isDemoJudge: existing.email === DEMO_JUDGE_EMAIL,
      mode: supabase ? "supabase" : "local",
    };
    setStoredUser(user);
    return { user };
  }

  return {
    user: null,
    error: "No account found for that email. Create an account or click Continue as Demo Judge.",
  };
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<{ user: PermitPilotUser | null; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = name.trim() || normalizedEmail.split("@")[0] || "Applicant";
  if (!normalizedEmail || password.length < 6) {
    return { user: null, error: "Provide a valid email and a password of at least 6 characters." };
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { name: cleanName },
      },
    });
    if (!error && data.user) {
      const mapped = mapSupabaseUser(data.user);
      setStoredUser(mapped);
      return { user: mapped };
    }
  }

  const accounts = getLocalAccounts();
  const existing = accounts.find((acc) => acc.email === normalizedEmail);
  const account: StoredLocalAccount = existing ?? {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: cleanName,
    password,
  };
  if (!existing) {
    saveLocalAccounts([...accounts, account]);
  }
  const user: PermitPilotUser = {
    id: account.id,
    email: account.email,
    name: account.name,
    mode: supabase ? "supabase" : "local",
  };
  setStoredUser(user);
  return { user };
}

// judges can skip making a real account
export async function signInAsDemoJudge(): Promise<PermitPilotUser> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const signInAttempt = await supabase.auth.signInWithPassword({
      email: DEMO_JUDGE_EMAIL,
      password: "permitpilot-judge-2026",
    });
    if (!signInAttempt.error && signInAttempt.data.user) {
      const mapped = mapSupabaseUser(signInAttempt.data.user);
      setStoredUser(mapped);
      return mapped;
    }
  }

  const judgeUser: PermitPilotUser = {
    id: DEMO_JUDGE_ID,
    email: DEMO_JUDGE_EMAIL,
    name: DEMO_JUDGE_NAME,
    isDemoJudge: true,
    mode: supabase ? "supabase" : "local",
  };
  setStoredUser(judgeUser);
  return judgeUser;
}

export async function signOutPermitPilot(): Promise<void> {
  // wipe both cloud and the local session
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut().catch(() => undefined);
  }
  setStoredUser(null);
}

export function useAuth(): {
  user: PermitPilotUser | null;
  hydrated: boolean;
  cloudConnected: boolean;
  signOut: () => Promise<void>;
} {
  const [user, setUser] = useState<PermitPilotUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // keep the header in sync if they sign in on another tab
    const sync = () => {
      setUser(getCurrentUser());
      setHydrated(true);
    };
    sync();

    const supabase = getSupabaseClient();
    if (supabase) {
      void supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          const mapped = mapSupabaseUser(data.user);
          setStoredUser(mapped);
          setUser(mapped);
        }
      });
    }

    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    user,
    hydrated,
    cloudConnected: isSupabaseConfigured(),
    signOut: signOutPermitPilot,
  };
}
