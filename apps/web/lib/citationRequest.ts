"use client";

import { getCurrentUser, getSupabaseClient } from "@/lib/supabase";

/** Use the actual cloud session, never the browser's cached display profile. */
export async function citationRequestHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (getCurrentUser()?.mode !== "supabase") return headers;
  const client = getSupabaseClient();
  if (!client) return headers;
  try {
    const { data, error } = await client.auth.getSession();
    if (!error && data.session?.access_token) {
      headers.authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {
    // Local citation guidance remains available when session refresh is unavailable.
  }
  return headers;
}
