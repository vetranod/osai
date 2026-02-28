export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return Response.json({
    hasUrl: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}