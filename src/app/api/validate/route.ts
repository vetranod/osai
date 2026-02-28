import { validateDecisionInputs } from "@/decision-engine/options";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        code: "INVALID_BODY",
        message: "Request body must be valid JSON.",
      },
      { status: 400 }
    );
  }

  const result = validateDecisionInputs(body);

  if (result.ok) {
    return Response.json(result, { status: 200 });
  }

  return Response.json(result, { status: 400 });
}
