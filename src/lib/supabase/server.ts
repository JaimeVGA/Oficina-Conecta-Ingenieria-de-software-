import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function isSupabaseServerConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && url.trim().length > 0 && key && key.trim().length > 0);
}

export async function createSupabaseServerClient(responseObj?: {
  cookies: { set: (...args: any[]) => any };
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
            if (responseObj) {
              responseObj.cookies.set(name, value, options);
            }
          }
        } catch {
          if (responseObj) {
            for (const { name, value, options } of cookiesToSet) {
              responseObj.cookies.set(name, value, options);
            }
          }
        }
      },
    },
  });
}
