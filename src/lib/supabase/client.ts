"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let sessionPromise: Promise<SupabaseClient> | null = null;

function readConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return readConfig() !== null;
}

/**
 * One browser client. The publishable/anon key is safe to ship; writes are
 * restricted by RLS and validated SECURITY DEFINER RPCs.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = readConfig();

  if (!config) {
    return null;
  }

  client ??= createClient(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}

/**
 * Returns a client with an anonymous Supabase session. Anonymous auth keeps a
 * stable UUID in local storage without asking for an email or password.
 */
export function ensureAnonymousSession(): Promise<SupabaseClient> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return Promise.reject(new Error("Live sync is not configured."));
  }

  sessionPromise ??= (async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInAnonymously();

      if (signInError) {
        throw signInError;
      }
    }

    return supabase;
  })().catch((error: unknown) => {
    sessionPromise = null;
    throw error;
  });

  return sessionPromise;
}

/** Clears the cached promise after sign-out or a project configuration change. */
export function resetSupabaseSession(): void {
  sessionPromise = null;
}
