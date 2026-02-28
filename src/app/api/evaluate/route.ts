import { validateDecisionInputs } from "@/decision-engine/options";
import { evaluateDecision } from "@/decision-engine/engine";

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

  const validation = validateDecisionInputs(body);
  if (!validation.ok) {
    return Response.json(validation, { status: 400 });
  }

  const result = evaluateDecision(validation.value);

  return Response.json(
    {
      ok: true,
      input: validation.value,
      output: result.output,
      trace: result.trace,
    },
    { status: 200 }
  );
}
