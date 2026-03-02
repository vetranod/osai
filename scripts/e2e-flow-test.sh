#!/usr/bin/env bash
# End-to-end flow test: full M1→M4 milestone progression
# Tests a NON-REGULATED rollout (standard path) and a REGULATED rollout (deferred-create path)
# Usage: bash scripts/e2e-flow-test.sh

BASE="http://localhost:3000"
PASS=0
FAIL=0

green() { echo -e "\033[32m✓ $*\033[0m"; }
red()   { echo -e "\033[31m✗ $*\033[0m"; }
blue()  { echo -e "\033[34m» $*\033[0m"; }
yellow(){ echo -e "\033[33m~ $*\033[0m"; }

assert_eq() {
  local label="$1" actual="$2" expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    green "$label"
    PASS=$((PASS+1))
  else
    red "$label — expected '$expected', got '$actual'"
    FAIL=$((FAIL+1))
  fi
}

assert_contains() {
  local label="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    green "$label"
    PASS=$((PASS+1))
  else
    red "$label — '$needle' not found in response"
    echo "  Response: $haystack"
    FAIL=$((FAIL+1))
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Helper: transition a milestone and return the response body
# ─────────────────────────────────────────────────────────────────────────────
transition() {
  local rollout_id="$1" milestone_id="$2" from="$3" to="$4"
  curl -s -X POST "$BASE/api/rollouts/$rollout_id/milestones/$milestone_id/transition" \
    -H "Content-Type: application/json" \
    -d "{\"from_status\":\"$from\",\"to_status\":\"$to\"}"
}

# ─────────────────────────────────────────────────────────────────────────────
# Helper: walk a milestone through IN_PROGRESS → CONFIRMED → ACTIVATED
# (mirrors the two UI clicks: "Mark as reviewed" + "Mark as active")
# ─────────────────────────────────────────────────────────────────────────────
walk_milestone() {
  local rollout_id="$1" milestone_id="$2" code="$3"
  local r ok

  blue "  Walking $code (milestone_id=$milestone_id)"

  # Step 1: IN_PROGRESS → AWAITING_CONFIRMATION
  r=$(transition "$rollout_id" "$milestone_id" "IN_PROGRESS" "AWAITING_CONFIRMATION")
  ok=$(echo "$r" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('ok','')).lower())" 2>/dev/null || echo "")
  assert_eq "    $code IN_PROGRESS→AWAITING" "$ok" "true"

  # Step 2: AWAITING_CONFIRMATION → CONFIRMED
  r=$(transition "$rollout_id" "$milestone_id" "AWAITING_CONFIRMATION" "CONFIRMED")
  ok=$(echo "$r" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('ok','')).lower())" 2>/dev/null || echo "")
  assert_eq "    $code AWAITING→CONFIRMED" "$ok" "true"

  # Step 3: CONFIRMED → ACTIVATED
  r=$(transition "$rollout_id" "$milestone_id" "CONFIRMED" "ACTIVATED")
  ok=$(echo "$r" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('ok','')).lower())" 2>/dev/null || echo "")
  assert_eq "    $code CONFIRMED→ACTIVATED" "$ok" "true"
}

# ─────────────────────────────────────────────────────────────────────────────
# Helper: check that expected artifact types exist and are generated
# ─────────────────────────────────────────────────────────────────────────────
check_artifacts() {
  local rollout_id="$1"
  shift
  local expected_types=("$@")

  local arts
  arts=$(curl -s "$BASE/api/rollouts/$rollout_id/artifacts")
  local arts_ok
  arts_ok=$(echo "$arts" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('ok','')).lower())" 2>/dev/null || echo "")
  assert_eq "    artifacts endpoint ok" "$arts_ok" "true"

  for atype in "${expected_types[@]}"; do
    local generated
    generated=$(echo "$arts" | python3 -c "
import sys,json
d=json.load(sys.stdin)
arts=d.get('artifacts',[])
match=[a for a in arts if a.get('artifact_type')=='$atype']
if match:
    print(str(match[0].get('generated',False)).lower())
else:
    print('missing')
" 2>/dev/null || echo "error")
    assert_eq "    artifact $atype generated" "$generated" "true"
  done
}

# ─────────────────────────────────────────────────────────────────────────────
# Helper: get milestone id by code
# ─────────────────────────────────────────────────────────────────────────────
get_milestone_id() {
  local rollout_id="$1" code="$2"
  local ms
  ms=$(curl -s "$BASE/api/rollouts/$rollout_id/milestones")
  echo "$ms" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ms=d.get('milestones',[])
match=[m for m in ms if m.get('code')=='$code']
print(match[0]['milestone_id'] if match else '')
" 2>/dev/null || echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════
#  TEST 1: Standard rollout (CLIENT sensitivity, non-REGULATED)
# ═══════════════════════════════════════════════════════════
echo ""
echo "══════════════════════════════════════════════════════"
blue "TEST 1: Standard rollout (CLIENT_MATERIALS sensitivity)"
echo "══════════════════════════════════════════════════════"

# 1a. Create rollout
blue "1a. Creating rollout..."
CREATE=$(curl -s -X POST "$BASE/api/rollouts" \
  -H "Content-Type: application/json" \
  -d '{
    "primary_goal": "CLIENT_COMMUNICATION",
    "adoption_state": "FEW_EXPERIMENTING",
    "sensitivity_anchor": "CLIENT_MATERIALS",
    "leadership_posture": "BALANCED",
    "initiative_lead_name": "Jane Smith",
    "initiative_lead_title": "Director of Operations",
    "approving_authority_name": "John Doe",
    "approving_authority_title": "CEO"
  }')

CREATE_OK=$(echo "$CREATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('ok','')).lower())" 2>/dev/null || echo "")
ROLLOUT_ID=$(echo "$CREATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('rollout',{}).get('id',''))" 2>/dev/null || echo "")

assert_eq "  CREATE rollout ok" "$CREATE_OK" "true"
assert_eq "  rollout_id present" "$([ -n "$ROLLOUT_ID" ] && echo 'yes' || echo 'no')" "yes"
echo "  rollout_id: $ROLLOUT_ID"

if [[ -z "$ROLLOUT_ID" ]]; then
  red "  Skipping test 1 — no rollout_id"
  FAIL=$((FAIL+1))
else
  # 1b. Finalize (save identity + generate M1 artifacts)
  blue "1b. Finalizing rollout (generating M1 artifacts)..."
  FINALIZE=$(curl -s -X PATCH "$BASE/api/rollouts/$ROLLOUT_ID/finalize" \
    -H "Content-Type: application/json" \
    -d '{
      "initiative_lead_name": "Jane Smith",
      "initiative_lead_title": "Director of Operations",
      "approving_authority_name": "John Doe",
      "approving_authority_title": "CEO"
    }')
  FIN_OK=$(echo "$FINALIZE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('ok','')).lower())" 2>/dev/null || echo "")
  assert_eq "  FINALIZE ok" "$FIN_OK" "true"

  sleep 1  # brief pause for artifact writes

  # 1c. Check M1 artifacts exist (PROFILE + GUARDRAILS)
  blue "1c. Checking M1 artifacts (PROFILE + GUARDRAILS)..."
  check_artifacts "$ROLLOUT_ID" "PROFILE" "GUARDRAILS"

  # 1d. Walk M1
  blue "1d. Walking M1..."
  M1_ID=$(get_milestone_id "$ROLLOUT_ID" "M1")
  assert_eq "  M1 milestone_id present" "$([ -n "$M1_ID" ] && echo 'yes' || echo 'no')" "yes"
  walk_milestone "$ROLLOUT_ID" "$M1_ID" "M1"
  sleep 1

  # 1e. Check M2 artifacts (REVIEW_MODEL) — generated on M1 ACTIVATED
  blue "1e. Checking M2 artifacts (REVIEW_MODEL)..."
  check_artifacts "$ROLLOUT_ID" "REVIEW_MODEL"

  # 1f. Walk M2
  blue "1f. Walking M2..."
  M2_ID=$(get_milestone_id "$ROLLOUT_ID" "M2")
  walk_milestone "$ROLLOUT_ID" "$M2_ID" "M2"
  sleep 1

  # 1g. Check M3 artifacts (ROLLOUT_PLAN) — generated on M2 ACTIVATED
  blue "1g. Checking M3 artifacts (ROLLOUT_PLAN)..."
  check_artifacts "$ROLLOUT_ID" "ROLLOUT_PLAN"

  # 1h. Walk M3
  blue "1h. Walking M3..."
  M3_ID=$(get_milestone_id "$ROLLOUT_ID" "M3")
  walk_milestone "$ROLLOUT_ID" "$M3_ID" "M3"
  sleep 1

  # 1i. Check M4 artifacts (POLICY) — generated on M3 ACTIVATED
  blue "1i. Checking M4 artifacts (POLICY)..."
  check_artifacts "$ROLLOUT_ID" "POLICY"

  # 1j. Walk M4
  blue "1j. Walking M4..."
  M4_ID=$(get_milestone_id "$ROLLOUT_ID" "M4")
  walk_milestone "$ROLLOUT_ID" "$M4_ID" "M4"

  # 1k. Final state check — all milestones ACTIVATED
  blue "1k. Verifying all milestones ACTIVATED..."
  FINAL_MS=$(curl -s "$BASE/api/rollouts/$ROLLOUT_ID/milestones")
  for code in M1 M2 M3 M4; do
    status=$(echo "$FINAL_MS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ms=d.get('milestones',[])
match=[m for m in ms if m.get('code')=='$code']
print(match[0]['status'] if match else 'MISSING')
" 2>/dev/null || echo "ERROR")
    assert_eq "  $code final status" "$status" "ACTIVATED"
  done

  # 1l. Final artifact check — all 5 artifact types present
  blue "1l. Verifying all 5 artifact types present..."
  check_artifacts "$ROLLOUT_ID" "PROFILE" "GUARDRAILS" "REVIEW_MODEL" "ROLLOUT_PLAN" "POLICY"

  green "TEST 1 complete — rollout_id: $ROLLOUT_ID"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════
#  TEST 2: REGULATED rollout (deferred-create path)
# ═══════════════════════════════════════════════════════════
echo ""
echo "══════════════════════════════════════════════════════"
blue "TEST 2: REGULATED rollout (REGULATED_CONFIDENTIAL, deferred create)"
echo "══════════════════════════════════════════════════════"

# 2a. Evaluate first (mirrors the deferred UI path — no DB write)
blue "2a. Evaluate (no DB write)..."
EVAL=$(curl -s -X POST "$BASE/api/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "primary_goal": "OPERATIONS_ADMIN",
    "adoption_state": "NONE",
    "sensitivity_anchor": "REGULATED_CONFIDENTIAL",
    "leadership_posture": "CAUTIOUS"
  }')
EVAL_OK=$(echo "$EVAL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('ok','')).lower())" 2>/dev/null || echo "")
assert_eq "  EVALUATE ok" "$EVAL_OK" "true"
SENSITIVITY=$(echo "$EVAL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('output',{}).get('sensitivity_tier',''))" 2>/dev/null || echo "")
assert_eq "  sensitivity_tier = REGULATED" "$SENSITIVITY" "REGULATED"

# 2b. Create rollout with identity fields in one shot (deferred path)
blue "2b. Creating REGULATED rollout with identity fields..."
CREATE2=$(curl -s -X POST "$BASE/api/rollouts" \
  -H "Content-Type: application/json" \
  -d '{
    "primary_goal": "OPERATIONS_ADMIN",
    "adoption_state": "NONE",
    "sensitivity_anchor": "REGULATED_CONFIDENTIAL",
    "leadership_posture": "CAUTIOUS",
    "initiative_lead_name": "Alice Johnson",
    "initiative_lead_title": "Chief Compliance Officer",
    "approving_authority_name": "Bob Williams",
    "approving_authority_title": "Managing Partner"
  }')
CREATE2_OK=$(echo "$CREATE2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('ok','')).lower())" 2>/dev/null || echo "")
ROLLOUT_ID2=$(echo "$CREATE2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('rollout',{}).get('id',''))" 2>/dev/null || echo "")
assert_eq "  CREATE REGULATED rollout ok" "$CREATE2_OK" "true"
assert_eq "  rollout_id2 present" "$([ -n "$ROLLOUT_ID2" ] && echo 'yes' || echo 'no')" "yes"
echo "  rollout_id2: $ROLLOUT_ID2"

if [[ -z "$ROLLOUT_ID2" ]]; then
  red "  Skipping test 2 — no rollout_id"
  FAIL=$((FAIL+1))
else
  sleep 1

  # 2c. M1 artifacts should already exist (deferred create triggers M1 generation)
  blue "2c. Checking M1 artifacts exist after deferred create..."
  check_artifacts "$ROLLOUT_ID2" "PROFILE" "GUARDRAILS"

  # 2d. Walk M1 → M4 (same as test 1)
  blue "2d. Walking M1→M4 for REGULATED rollout..."
  for code in M1 M2 M3 M4; do
    MID=$(get_milestone_id "$ROLLOUT_ID2" "$code")
    walk_milestone "$ROLLOUT_ID2" "$MID" "$code"
    sleep 1
  done

  # 2e. Final state check
  blue "2e. Final state check for REGULATED rollout..."
  FINAL_MS2=$(curl -s "$BASE/api/rollouts/$ROLLOUT_ID2/milestones")
  for code in M1 M2 M3 M4; do
    status=$(echo "$FINAL_MS2" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ms=d.get('milestones',[])
match=[m for m in ms if m.get('code')=='$code']
print(match[0]['status'] if match else 'MISSING')
" 2>/dev/null || echo "ERROR")
    assert_eq "  $code final status" "$status" "ACTIVATED"
  done

  check_artifacts "$ROLLOUT_ID2" "PROFILE" "GUARDRAILS" "REVIEW_MODEL" "ROLLOUT_PLAN" "POLICY"

  green "TEST 2 complete — rollout_id: $ROLLOUT_ID2"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════
#  TEST 3: Error boundary paths
# ═══════════════════════════════════════════════════════════
echo ""
echo "══════════════════════════════════════════════════════"
blue "TEST 3: Error & 404 paths"
echo "══════════════════════════════════════════════════════"

# 3a. GET non-existent rollout (rollout endpoint returns 404; milestones returns 200+empty)
blue "3a. GET /api/rollouts/{unknown} → 404"
NF=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/rollouts/00000000-0000-0000-0000-000000000000")
assert_eq "  rollout 404 for unknown id" "$NF" "404"
NF_MSG=$(curl -s "$BASE/api/rollouts/00000000-0000-0000-0000-000000000000" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null || echo "")
assert_eq "  rollout 404 message present" "$NF_MSG" "Rollout not found."

# 3b. REGULATED without identity fields → should 400
blue "3b. POST REGULATED without identity fields → 400"
BAD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/rollouts" \
  -H "Content-Type: application/json" \
  -d '{"primary_goal":"OPERATIONS_ADMIN","adoption_state":"NONE","sensitivity_anchor":"REGULATED_CONFIDENTIAL","leadership_posture":"CAUTIOUS"}')
assert_eq "  REGULATED without identity → 400" "$BAD" "400"

# 3c. Invalid transition → should 409
if [[ -n "${ROLLOUT_ID:-}" && -n "${M4_ID:-}" ]]; then
  blue "3c. Transition already-ACTIVATED milestone → 409"
  BAD_TR=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$BASE/api/rollouts/$ROLLOUT_ID/milestones/$M4_ID/transition" \
    -H "Content-Type: application/json" \
    -d '{"from_status":"IN_PROGRESS","to_status":"AWAITING_CONFIRMATION"}')
  assert_eq "  invalid transition → 409" "$BAD_TR" "409"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
TOTAL=$((PASS+FAIL))
echo "  PASS: $PASS / $TOTAL"
echo "  FAIL: $FAIL / $TOTAL"
if [[ $FAIL -eq 0 ]]; then
  green "ALL $TOTAL ASSERTIONS PASSED"
else
  red "$FAIL ASSERTION(S) FAILED"
fi
