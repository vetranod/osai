export type PrimaryGoal =
  | "CLIENT_COMMUNICATION"
  | "INTERNAL_DOCUMENTATION"
  | "MARKETING_CONTENT"
  | "SALES_PROPOSALS"
  | "DATA_REPORTING"
  | "OPERATIONS_ADMIN";

export type AdoptionState =
  | "NONE"
  | "FEW_EXPERIMENTING"
  | "MULTIPLE_REGULAR"
  | "ENCOURAGED_UNSTRUCTURED"
  | "WIDELY_USED_UNSTANDARDIZED";

export type SensitivityAnchor =
  | "PUBLIC_CONTENT"
  | "INTERNAL_BUSINESS_INFO"
  | "CLIENT_MATERIALS"
  | "FINANCIAL_OPERATIONAL_RECORDS"
  | "REGULATED_CONFIDENTIAL";

export type LeadershipPosture =
  | "MOVE_QUICKLY"
  | "CAUTIOUS"
  | "BALANCED";

export type DecisionInputs = Readonly<{
  primary_goal: PrimaryGoal;
  adoption_state: AdoptionState;
  sensitivity_anchor: SensitivityAnchor;
  leadership_posture: LeadershipPosture;
}>;

export type Option<T extends string> = Readonly<{
  value: T;
  label: string;
  order?: number;
}>;

export const PRIMARY_GOAL_OPTIONS: ReadonlyArray<Option<PrimaryGoal>> = [
  { value: "CLIENT_COMMUNICATION", label: "Client communication" },
  { value: "INTERNAL_DOCUMENTATION", label: "Internal documentation" },
  { value: "MARKETING_CONTENT", label: "Marketing / content" },
  { value: "SALES_PROPOSALS", label: "Sales / proposals" },
  { value: "DATA_REPORTING", label: "Data / reporting" },
  { value: "OPERATIONS_ADMIN", label: "Operations / admin" },
] as const;

export const ADOPTION_STATE_OPTIONS: ReadonlyArray<Option<AdoptionState>> = [
  { value: "NONE", label: "No one using it yet", order: 1 },
  { value: "FEW_EXPERIMENTING", label: "A few experimenting", order: 2 },
  { value: "MULTIPLE_REGULAR", label: "Multiple using regularly", order: 3 },
  { value: "ENCOURAGED_UNSTRUCTURED", label: "Encouraged but unstructured", order: 4 },
  { value: "WIDELY_USED_UNSTANDARDIZED", label: "Widely used but unstandardized", order: 5 },
] as const;

export const SENSITIVITY_ANCHOR_OPTIONS: ReadonlyArray<Option<SensitivityAnchor>> = [
  { value: "PUBLIC_CONTENT", label: "Public content", order: 1 },
  { value: "INTERNAL_BUSINESS_INFO", label: "Internal business info", order: 2 },
  { value: "CLIENT_MATERIALS", label: "Client materials", order: 3 },
  { value: "FINANCIAL_OPERATIONAL_RECORDS", label: "Financial/operational records", order: 4 },
  { value: "REGULATED_CONFIDENTIAL", label: "Regulated/confidential data", order: 5 },
] as const;

export const LEADERSHIP_POSTURE_OPTIONS: ReadonlyArray<Option<LeadershipPosture>> = [
  { value: "MOVE_QUICKLY", label: "Moving quickly" },
  { value: "CAUTIOUS", label: "Using AI cautiously" },
  { value: "BALANCED", label: "Balanced" },
] as const;

export const ADOPTION_STATE_RANK: Readonly<Record<AdoptionState, number>> = {
  NONE: 1,
  FEW_EXPERIMENTING: 2,
  MULTIPLE_REGULAR: 3,
  ENCOURAGED_UNSTRUCTURED: 4,
  WIDELY_USED_UNSTANDARDIZED: 5,
} as const;

export const SENSITIVITY_ANCHOR_RANK: Readonly<Record<SensitivityAnchor, number>> = {
  PUBLIC_CONTENT: 1,
  INTERNAL_BUSINESS_INFO: 2,
  CLIENT_MATERIALS: 3,
  FINANCIAL_OPERATIONAL_RECORDS: 4,
  REGULATED_CONFIDENTIAL: 5,
} as const;

type ValidationErrorCode =
  | "MISSING_FIELD"
  | "INVALID_VALUE"
  | "INVALID_BODY";

export type ValidationError = Readonly<{
  ok: false;
  code: ValidationErrorCode;
  message: string;
  field?: keyof DecisionInputs;
  allowed?: ReadonlyArray<string>;
}>;

export type ValidationSuccess = Readonly<{
  ok: true;
  value: DecisionInputs;
}>;

export type ValidationResult = ValidationSuccess | ValidationError;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function valuesOf<T extends string>(options: ReadonlyArray<Option<T>>): ReadonlyArray<T> {
  return options.map((o) => o.value);
}

const PRIMARY_GOAL_VALUES = valuesOf(PRIMARY_GOAL_OPTIONS);
const ADOPTION_STATE_VALUES = valuesOf(ADOPTION_STATE_OPTIONS);
const SENSITIVITY_ANCHOR_VALUES = valuesOf(SENSITIVITY_ANCHOR_OPTIONS);
const LEADERSHIP_POSTURE_VALUES = valuesOf(LEADERSHIP_POSTURE_OPTIONS);

function missingField(field: keyof DecisionInputs): ValidationError {
  return {
    ok: false,
    code: "MISSING_FIELD",
    message: `Missing required field: ${field}`,
    field,
  };
}

function invalidValue(field: keyof DecisionInputs, allowed: ReadonlyArray<string>): ValidationError {
  return {
    ok: false,
    code: "INVALID_VALUE",
    message: `Invalid value for field: ${field}`,
    field,
    allowed,
  };
}

export function validateDecisionInputs(body: unknown): ValidationResult {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "Request body must be a JSON object.",
    };
  }

  const primary_goal = body.primary_goal;
  const adoption_state = body.adoption_state;
  const sensitivity_anchor = body.sensitivity_anchor;
  const leadership_posture = body.leadership_posture;

  if (primary_goal === undefined) return missingField("primary_goal");
  if (adoption_state === undefined) return missingField("adoption_state");
  if (sensitivity_anchor === undefined) return missingField("sensitivity_anchor");
  if (leadership_posture === undefined) return missingField("leadership_posture");

  if (typeof primary_goal !== "string" || !PRIMARY_GOAL_VALUES.includes(primary_goal as PrimaryGoal)) {
    return invalidValue("primary_goal", PRIMARY_GOAL_VALUES);
  }

  if (typeof adoption_state !== "string" || !ADOPTION_STATE_VALUES.includes(adoption_state as AdoptionState)) {
    return invalidValue("adoption_state", ADOPTION_STATE_VALUES);
  }

  if (
    typeof sensitivity_anchor !== "string" ||
    !SENSITIVITY_ANCHOR_VALUES.includes(sensitivity_anchor as SensitivityAnchor)
  ) {
    return invalidValue("sensitivity_anchor", SENSITIVITY_ANCHOR_VALUES);
  }

  if (
    typeof leadership_posture !== "string" ||
    !LEADERSHIP_POSTURE_VALUES.includes(leadership_posture as LeadershipPosture)
  ) {
    return invalidValue("leadership_posture", LEADERSHIP_POSTURE_VALUES);
  }

  return {
    ok: true,
    value: {
      primary_goal: primary_goal as PrimaryGoal,
      adoption_state: adoption_state as AdoptionState,
      sensitivity_anchor: sensitivity_anchor as SensitivityAnchor,
      leadership_posture: leadership_posture as LeadershipPosture,
    },
  };
}