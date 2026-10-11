import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const configured = import.meta.env.VITE_SERVER_URL as string | undefined;
export const apiOrigin =
  configured?.replace(/\/$/, "") ??
  (import.meta.env.PROD ? "" : "http://localhost:3001");
let supabase: SupabaseClient | undefined;
let pending: Promise<Record<string, string>> | undefined;

async function identityHeaders(): Promise<Record<string, string>> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    if (import.meta.env.PROD)
      throw new Error("Anonymous authentication is not configured");
    // Development also isolates visitors; this header is never a production identity.
    try {
      const storageKey = "careerdive-local-identity";
      let owner = window.localStorage.getItem(storageKey);
      if (!owner || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(owner)) {
        owner = crypto.randomUUID();
        window.localStorage.setItem(storageKey, owner);
      }
      if (window.localStorage.getItem(storageKey) !== owner)
        throw new Error("Storage unavailable");
      return { "x-user-id": owner };
    } catch {
      throw new Error("Persistent identity storage unavailable");
    }
  }
  // Identity must survive reload before any owner-bound mutation can proceed.
  try {
    const probe = "career-expo-auth-storage-check";
    window.localStorage.setItem(probe, "ok");
    if (window.localStorage.getItem(probe) !== "ok")
      throw new Error("Storage unavailable");
    window.localStorage.removeItem(probe);
  } catch {
    throw new Error("Persistent identity storage unavailable");
  }
  supabase ??= createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error("Identity unavailable");
  let session = data.session;
  if (
    session &&
    (session.expires_at ?? 0) <= Math.floor(Date.now() / 1000) + 30
  ) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session)
      throw new Error("Identity refresh failed");
    session = refreshed.data.session;
  }
  if (!session) {
    const created = await supabase.auth.signInAnonymously();
    if (created.error || !created.data.session)
      throw new Error("Identity creation failed");
    session = created.data.session;
  }
  return { Authorization: `Bearer ${session.access_token}` };
}
export function authHeaders(): Promise<Record<string, string>> {
  pending ??= (async () => {
    if (typeof navigator !== "undefined" && "locks" in navigator)
      return await navigator.locks.request(
        "career-expo-anonymous-identity",
        identityHeaders,
      );
    return identityHeaders();
  })().finally(() => {
    pending = undefined;
  });
  return pending;
}
export async function apiPost(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`${apiOrigin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    throw new Error("Service unavailable");
  return response.json();
}
