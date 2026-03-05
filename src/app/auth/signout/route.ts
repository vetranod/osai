import { NextResponse } from "next/server";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const supabase = await getSupabaseServerAuthClient();
  await supabase.auth.signOut();

  const redirectUrl = new URL("/login", requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}

