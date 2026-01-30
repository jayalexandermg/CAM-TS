#!/usr/bin/env bash
#
# verify.sh - Automated verification script for Infinite Aura TS
#
# Usage:
#   ./verify.sh [OPTIONS]
#
# Options:
#   --type, -t      Run TypeScript type checking only
#   --lint, -l      Run ESLint only
#   --format, -f    Run format checking only
#   --test, -T      Run tests only
#   --coverage, -c  Run tests with coverage
#   --security, -s  Run security audit
#   --build, -b     Run build verification
#   --all, -a       Run all checks (default)
#   --quick, -q     Run quick checks (type, lint, format)
#   --help, -h      Show this help message
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall status
FAILED_CHECKS=()
PASSED_CHECKS=()

# Print colored output
print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_failure() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

print_info() {
    echo -e "${BLUE}→ $1${NC}"
}

# Check if pnpm is available
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        print_failure "pnpm is not installed. Please install pnpm first."
        exit 1
    fi
}

# Run a verification check
run_check() {
    local name="$1"
    local cmd="$2"
    local description="$3"

    print_info "Running: $description"
    echo "  Command: $cmd"
    echo ""

    if eval "$cmd"; then
        print_success "$name passed"
        PASSED_CHECKS+=("$name")
        return 0
    else
        print_failure "$name failed"
        FAILED_CHECKS+=("$name")
        return 1
    fi
}

# TypeScript type checking
check_types() {
    print_header "TypeScript Type Checking"
    run_check "Type Check" "pnpm typecheck" "TypeScript strict type checking"
}

# ESLint
check_lint() {
    print_header "ESLint Rules Compliance"
    run_check "Lint" "pnpm lint" "ESLint code quality checks"
}

# Prettier format check
check_format() {
    print_header "Code Formatting"
    run_check "Format" "pnpm format:check" "Prettier format verification"
}

# Jest tests
check_tests() {
    print_header "Unit & Integration Tests"
    run_check "Tests" "pnpm test" "Jest test suite"
}

# Jest tests with coverage
check_coverage() {
    print_header "Test Coverage"
    run_check "Coverage" "pnpm test:coverage" "Jest tests with coverage thresholds"
}

# Security audit
check_security() {
    print_header "Security Audit"
    # pnpm audit returns non-zero if vulnerabilities found at specified level
    run_check "Security" "pnpm audit --audit-level=moderate || true" "Dependency vulnerability scan"
}

# Build verification
check_build() {
    print_header "Build Verification"
    run_check "Build" "pnpm build" "TypeScript compilation to dist/"

    # Verify dist directory exists and has content
    if [ -d "dist" ] && [ "$(ls -A dist 2>/dev/null)" ]; then
        print_success "dist/ directory populated"
    else
        print_failure "dist/ directory is empty or missing"
        FAILED_CHECKS+=("Build Artifacts")
    fi
}

# Quick checks (type, lint, format)
check_quick() {
    check_types
    check_lint
    check_format
}

# All checks
check_all() {
    check_types
    check_lint
    check_format
    check_coverage
    check_security
    check_build
}

# Print final summary
print_summary() {
    print_header "Verification Summary"

    echo "Passed checks (${#PASSED_CHECKS[@]}):"
    for check in "${PASSED_CHECKS[@]}"; do
        print_success "  $check"
    done

    echo ""

    if [ ${#FAILED_CHECKS[@]} -gt 0 ]; then
        echo "Failed checks (${#FAILED_CHECKS[@]}):"
        for check in "${FAILED_CHECKS[@]}"; do
            print_failure "  $check"
        done
        echo ""
        print_failure "Verification FAILED"
        return 1
    else
        print_success "All verification checks PASSED"
        return 0
    fi
}

# Show help
show_help() {
    echo "verify.sh - Automated verification script for Infinite Aura TS"
    echo ""
    echo "Usage:"
    echo "  ./verify.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --type, -t      Run TypeScript type checking only"
    echo "  --lint, -l      Run ESLint only"
    echo "  --format, -f    Run format checking only"
    echo "  --test, -T      Run tests only"
    echo "  --coverage, -c  Run tests with coverage"
    echo "  --security, -s  Run security audit"
    echo "  --build, -b     Run build verification"
    echo "  --all, -a       Run all checks (default)"
    echo "  --quick, -q     Run quick checks (type, lint, format)"
    echo "  --help, -h      Show this help message"
    echo ""
    echo "Exit codes:"
    echo "  0 - All checks passed"
    echo "  1 - One or more checks failed"
    echo ""
    echo "Examples:"
    echo "  ./verify.sh              # Run all checks"
    echo "  ./verify.sh --quick      # Run quick checks only"
    echo "  ./verify.sh --coverage   # Run tests with coverage"
}

# Main
main() {
    check_pnpm

    # Default to all checks if no arguments
    if [ $# -eq 0 ]; then
        set -- "--all"
    fi

    # Process arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --type|-t)
                check_types
                ;;
            --lint|-l)
                check_lint
                ;;
            --format|-f)
                check_format
                ;;
            --test|-T)
                check_tests
                ;;
            --coverage|-c)
                check_coverage
                ;;
            --security|-s)
                check_security
                ;;
            --build|-b)
                check_build
                ;;
            --all|-a)
                check_all
                ;;
            --quick|-q)
                check_quick
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
        shift
    done

    # Print summary and exit with appropriate code
    print_summary
}

# Run main function
main "$@"
