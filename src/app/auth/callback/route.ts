import { NextResponse } from "next/server";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";

function sanitizeNextPath(raw: string | null): string {
  if (!raw) return "/generate";
  if (!raw.startsWith("/")) return "/generate";
  if (raw.startsWith("//")) return "/generate";
  return raw;
}

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    try {
      const supabase = await getSupabaseServerAuthClient();
      await supabase.auth.exchangeCodeForSession(code);

      // Redirect directly to the destination — no intermediate confirmed page.
      // For invite/magic-link flows the user is already authenticated at this point.
      const destUrl = new URL(next, requestUrl.origin);
      return NextResponse.redirect(destUrl);
    } catch {
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("next", next);
      loginUrl.searchParams.set("auth_error", "exchange_failed");
      return NextResponse.redirect(loginUrl);
    }
  }

  // No ?code= present — this is likely an implicit-flow invite where Supabase
  // appended tokens to the URL fragment (#access_token=…).  Fragments are
  // browser-only: the server never sees them, and a server-side redirect would
  // silently drop them.  Instead, serve a tiny HTML page whose inline script
  // reads the fragment, pushes the tokens to the SSR bridge, then navigates
  // to the destination.
  const encodedNext = encodeURIComponent(next);
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Signing in…</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0f172a;color:#94a3b8}</style>
</head><body><p>Signing you in…</p>
<script>
(function(){
  var hash = window.location.hash.replace(/^#/,'');
  var p = new URLSearchParams(hash);
  var at = p.get('access_token');
  var rt = p.get('refresh_token');
  var next = decodeURIComponent(${JSON.stringify(encodedNext)});
  if(at && rt){
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
