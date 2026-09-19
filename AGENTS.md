# Agent Guidelines for QuotaShift

This document defines strict engineering rules and guidelines for AI coding agents working on the QuotaShift codebase.

## 1. Code Formatting & LOC Limits Policy

* **Never Cheat Prettier or Lint LOC**:
  * Never compress multiple statements onto single lines, compress imports, cram JSX attributes, or artificially minimize code to circumvent LOC limits.
  * All files must be formatted cleanly with Prettier (for TypeScript, TSX, CSS, HTML) and `cargo fmt` (for Rust).
  * The LOC limit verification gate (`scripts/check-loc.mjs`) evaluates file lengths against their Prettier-formatted code. Minimized code will be expanded and measured in its standard formatted structure.
* **Refactor, Don't Compress**:
  * When a file exceeds its LOC limit, it must be modularized into meaningful, well-structured subcomponents, custom hooks, or utility functions.
  * Every refactored unit must make sense architecturally, have clear single-responsibility, and maintain full test coverage.
* **LOC Thresholds**:
  * `.tsx`: maximum **350** LOC
  * `.ts`: maximum **300** LOC
  * `.rs`: maximum **300** LOC
  * `.css`: maximum **600** LOC

## 2. Code Quality & Meaningful Architecture

* All changes must be sensible, meaningful, and maintainable.
* Preserve documentation, comments, and contracts across the codebase.
* Do not introduce stub or dummy code to satisfy gates.

## 3. Security & Account Privacy

* **Never touch user accounts**: Never modify, overwrite, or delete account credentials, tokens, API keys, or secure vault entries.
* Always use secure storage facades and isolated SQLite writers for sensitive data.

## 4. Verification Workflow

Before completing any task, always verify:
1. `pnpm run format:check` / `pnpm run prettier` (clean formatting for all code types)
2. `pnpm run lint:loc` (100% of files within LOC limits)
3. `pnpm test` (all tests passing)
4. `cargo check` / `cargo test` (clean Rust compilation)
