import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

function sanitizeNextPath(raw: string | null): string {
  if (!raw) return "/generate";
  if (!raw.startsWith("/")) return "/generate";
  if (raw.startsWith("//")) return "/generate";
  return raw;
}

export async function GET(request: NextRequest): Promise<Response> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const destUrl = new URL(next, requestUrl.origin);
    const response = NextResponse.redirect(destUrl);

    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    try {
      await supabase.auth.exchangeCodeForSession(code);
      return response;
    } catch {
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("next", next);
      loginUrl.searchParams.set("auth_error", "exchange_failed");
      return NextResponse.redirect(loginUrl);
    }
  }

  const encodedContinue = encodeURIComponent(`/auth/continue?next=${encodeURIComponent(next)}`);
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Signing in...</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0f172a;color:#94a3b8}</style>
</head><body><p>Signing you in...</p>
<script>
(function(){
  var hash = window.location.hash.replace(/^#/,'');
  var p = new URLSearchParams(hash);
  var at = p.get('access_token');
  var rt = p.get('refresh_token');
  var exp = p.get('expires_at');
  var next = decodeURIComponent(${JSON.stringify(encodedContinue)});
  if(at && rt){
    try{
      window.sessionStorage.setItem('osai_browser_session_cache_v1',JSON.stringify({
        access_token:at,refresh_token:rt,
        expires_at:exp?parseInt(exp,10):null,
        user_id:null,email:null,cached_at:Date.now()
      }));
    }catch(e){}
    fetch('/api/auth/bridge-session',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body:JSON.stringify({access_token:at,refresh_token:rt})
    }).finally(function(){ window.location.href = next; });
  } else {
    window.location.href = next;
  }
})();
</script></body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
