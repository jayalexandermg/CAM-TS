#!/usr/bin/env bash
set -euo pipefail

# Validate Infinite Aura / Aura scaffold

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"

echo "Validating scaffold at: $REPO_ROOT"
echo ""

ERRORS=0

# Check root docs
echo "Checking root docs..."
for doc in "Project_Brief.md" "Memory_Checklist.md" "Decisions_Log.md"; do
    if [[ -f "$REPO_ROOT/$doc" ]]; then
        echo "  [OK] $doc"
    else
        echo "  [MISSING] $doc"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Check reference docs
echo "Checking reference docs..."
SKILL_DIR="$REPO_ROOT/.claude/skills/memory-system-builder"
for doc in "SKILL.md" "references/OPERATING_CONTRACT.md" "references/PHASE_REFERENCE.md"; do
    if [[ -f "$SKILL_DIR/$doc" ]]; then
        echo "  [OK] $doc"
    else
        echo "  [MISSING] $doc"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

if [[ $ERRORS -eq 0 ]]; then
    echo "OK: scaffold valid"
    exit 0
else
    echo "FAIL: $ERRORS file(s) missing"
    exit 1
fi
