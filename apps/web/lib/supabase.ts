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
  // A missing cloud configuration never enables local passwords in production.
  if (!rawUrl || !anonKey || rawUrl.includes("your-project-ref") || anonKey.includes("paste-your")) {
    cachedClient = null;
    return null;
  }
  const url = rawUrl.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && parsed.protocol === "http:")) {
      cachedClient = null;
      return null;
    }
    cachedClient = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch {
    // An invalid deployment configuration must not crash the sample or create passwords.
    cachedClient = null;
  }
  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

export const ACCOUNT_UNAVAILABLE_MESSAGE =
  "Account sign-in is not available on this installation yet. You can explore the sample project without creating an account.";

export function getAccountAuthMode(): "cloud" | "development" | "unavailable" {
  if (isSupabaseConfigured()) return "cloud";
  return process.env.NODE_ENV === "production" ? "unavailable" : "development";
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
  try {
    if (!canUseStorage()) return null;
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as PermitPilotUser;
    // Legacy development accounts are UI conveniences, never production identities.
    if (process.env.NODE_ENV === "production" && user.mode === "local" &&
      !(user.isDemoJudge && user.id === DEMO_JUDGE_ID)) return null;
    return user;
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

// Configured cloud accounts must authenticate with the cloud service.
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: PermitPilotUser | null; error?: string; message?: string }> {
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
    return { user: null, error: error?.message ?? "Unable to sign in. Please try again." };
  }

  if (getAccountAuthMode() === "unavailable") {
    return { user: null, error: ACCOUNT_UNAVAILABLE_MESSAGE };
  }

  // Development only. Production requires Supabase authentication.
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
      mode: "local",
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
): Promise<{ user: PermitPilotUser | null; error?: string; message?: string }> {
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
    if (error) return { user: null, error: error.message };
    if (!data.session) {
      return { user: null, message: "Check your email to confirm your account, then return here to sign in." };
    }
    if (!data.user) return { user: null, error: "Unable to create your account. Please try again." };
    const mapped = mapSupabaseUser(data.user);
    setStoredUser(mapped);
    return { user: mapped };
  }

  if (getAccountAuthMode() === "unavailable") {
    return { user: null, error: ACCOUNT_UNAVAILABLE_MESSAGE };
  }

  const accounts = getLocalAccounts();
  const existing = accounts.find((acc) => acc.email === normalizedEmail);
  if (existing) return { user: null, error: "An account already exists for this email. Sign in with your password instead." };
  const account: StoredLocalAccount = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: cleanName,
    password,
  };
  saveLocalAccounts([...accounts, account]);
  const user: PermitPilotUser = {
    id: account.id,
    email: account.email,
    name: account.name,
    mode: "local",
  };
  setStoredUser(user);
  return { user };
}

// judges can skip making a real account
export async function signInAsDemoJudge(): Promise<PermitPilotUser> {
  // Samples are always browser-local and never share a real cloud credential.
  const judgeUser: PermitPilotUser = {
    id: DEMO_JUDGE_ID,
    email: DEMO_JUDGE_EMAIL,
    name: DEMO_JUDGE_NAME,
    isDemoJudge: true,
    mode: "local",
  };
  setStoredUser(judgeUser);
  return judgeUser;
}

export async function signOutPermitPilot(): Promise<void> {
  // wipe both cloud and the local session
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
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
