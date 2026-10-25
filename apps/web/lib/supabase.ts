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
  // strip a pasted /rest/v1 path and any trailing slash
  const url = rawUrl.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  try {
    const parsed = new URL(url);
    // production has to be https; http is only ok outside production
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

// true when the env vars actually built a client
export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

export const ACCOUNT_UNAVAILABLE_MESSAGE =
  "Account sign-in is not available on this installation yet. You can explore the sample project without creating an account.";

// cloud if supabase is set up, otherwise local dev or fully off
export function getAccountAuthMode(): "cloud" | "development" | "unavailable" {
  // a real client means cloud accounts
  if (isSupabaseConfigured()) return "cloud";
  // production without supabase cannot fall back to browser passwords
  return process.env.NODE_ENV === "production" ? "unavailable" : "development";
}

// localStorage only exists in the browser
function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

// turn a supabase user into the shape the rest of the app stores
function mapSupabaseUser(user: User): PermitPilotUser {
  const email = user.email ?? DEMO_JUDGE_EMAIL;
  // prefer the name they set, otherwise the bit before the @
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
    // server render has no browser storage
    if (!canUseStorage()) return null;
    const raw = window.localStorage.getItem(SESSION_KEY);
    // nobody is signed in
    if (!raw) return null;
    const user = JSON.parse(raw) as PermitPilotUser;
    // Legacy development accounts are UI conveniences, never production identities.
    if (process.env.NODE_ENV === "production" && user.mode === "local" &&
      !(user.isDemoJudge && user.id === DEMO_JUDGE_ID)) return null;
    return user;
  } catch {
    // bad json should look like signed out
    return null;
  }
}

// save or clear the session and tell the rest of the page
function setStoredUser(user: PermitPilotUser | null): void {
  // nothing to write outside the browser
  if (!canUseStorage()) return;
  // save the user, or clear the session
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

// browser-only accounts used when supabase isn't configured
function getLocalAccounts(): StoredLocalAccount[] {
  // no browser storage
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(ACCOUNTS_KEY);
  // nobody has signed up locally yet
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredLocalAccount[];
  } catch {
    // bad json, treat it as no accounts
    return [];
  }
}

// write the local account list back
function saveLocalAccounts(accounts: StoredLocalAccount[]): void {
  // no browser storage
  if (!canUseStorage()) return;
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// Configured cloud accounts must authenticate with the cloud service.
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: PermitPilotUser | null; error?: string; message?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  // both fields are required
  if (!normalizedEmail || !password) {
    return { user: null, error: "Enter both your email and password." };
  }

  const supabase = getSupabaseClient();
  // cloud is configured, so sign in there
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    // cloud sign-in worked
    if (!error && data.user) {
      const mapped = mapSupabaseUser(data.user);
      setStoredUser(mapped);
      return { user: mapped };
    }
    return { user: null, error: error?.message ?? "Unable to sign in. Please try again." };
  }

  // production with no cloud has nowhere to sign in
  if (getAccountAuthMode() === "unavailable") {
    return { user: null, error: ACCOUNT_UNAVAILABLE_MESSAGE };
  }

  // Development only. Production requires Supabase authentication.
  const accounts = getLocalAccounts();
  const existing = accounts.find((acc) => acc.email === normalizedEmail);
  // this email already has a local account
  if (existing) {
    // right email, wrong password
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

// create an account in the cloud, or in the browser during development
export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<{ user: PermitPilotUser | null; error?: string; message?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  // fall back to the email prefix when they left the name blank
  const cleanName = name.trim() || normalizedEmail.split("@")[0] || "Applicant";
  // password has to be at least 6 characters
  if (!normalizedEmail || password.length < 6) {
    return { user: null, error: "Provide a valid email and a password of at least 6 characters." };
  }

  const supabase = getSupabaseClient();
  // cloud is configured, so create the account there
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { name: cleanName },
      },
    });
    // cloud rejected the sign-up
    if (error) return { user: null, error: error.message };
    // they still need to confirm the email
    if (!data.session) {
      return { user: null, message: "Check your email to confirm your account, then return here to sign in." };
    }
    // signup returned neither an error nor a user
    if (!data.user) return { user: null, error: "Unable to create your account. Please try again." };
    const mapped = mapSupabaseUser(data.user);
    setStoredUser(mapped);
    return { user: mapped };
  }

  // production with no cloud cannot create a browser password
  if (getAccountAuthMode() === "unavailable") {
    return { user: null, error: ACCOUNT_UNAVAILABLE_MESSAGE };
  }

  const accounts = getLocalAccounts();
  const existing = accounts.find((acc) => acc.email === normalizedEmail);
  // don't overwrite a local account that already uses this email
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
  // sign out of the cloud first when we have a client
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    // a failed cloud sign-out should not clear the local session
    if (error) throw new Error(error.message);
  }
  setStoredUser(null);
}

// current user, whether we've read storage yet, and a sign-out helper
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
    // if the cloud session is still valid, refresh the stored user from it
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
    // stop listening when this component goes away
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
