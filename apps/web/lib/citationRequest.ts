"use client";

import { getCurrentUser, getSupabaseClient } from "@/lib/supabase";

// send the live cloud token, not the name cached in the browser
export async function citationRequestHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  // local and signed-out sessions don't get a bearer token
  if (getCurrentUser()?.mode !== "supabase") return headers;
  const client = getSupabaseClient();
  // no cloud client, so stick with the plain json header
  if (!client) return headers;
  try {
    const { data, error } = await client.auth.getSession();
    // attach the access token when the session is actually there
    if (!error && data.session?.access_token) {
      headers.authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {
    // Local citation guidance remains available when session refresh is unavailable.
  }
  return headers;
}
