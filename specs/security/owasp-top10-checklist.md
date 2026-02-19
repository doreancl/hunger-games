# OWASP Top 10 Security Review Checklist

Date: 2026-02-19
Scope: Next.js API routes, domain validation, local persistence, runtime integrity, and platform configuration.

## Results

| OWASP 2021 | Status | Evidence / Mitigation |
| --- | --- | --- |
| A01 Broken Access Control | Partial | V1 intentionally has no accounts (documented). Match IDs are random UUIDs and state-changing APIs validate payload shape and IDs. Residual risk accepted for unauthenticated MVP scope. |
| A02 Cryptographic Failures | Improved | Runtime resume now rejects checksum mismatch in local snapshot parsing (`lib/local-runtime.ts`). |
| A03 Injection | Pass | Strict Zod parsing for request/response contracts and typed errors; no dynamic code execution or raw SQL in scope. |
| A04 Insecure Design | Improved | Added hard limit for create payload body (`16,384` bytes) returning 413 on abuse (`app/api/matches/route.ts`). |
| A05 Security Misconfiguration | Improved | Added baseline hardening headers and disabled `x-powered-by` (`next.config.ts`). |
| A06 Vulnerable and Outdated Components | Risk | `npm audit` reports vulnerabilities in dependency tree; needs separate upgrade/remediation track. |
| A07 Identification and Authentication Failures | Partial | Auth not required by product spec. Rate-limit client key now validates IP formats and resists malformed header spoofing fallback abuse (`lib/api/rate-limit.ts`). |
| A08 Software and Data Integrity Failures | Improved | Local runtime checksum is now enforced; tampered snapshots are rejected as unrecoverable (`lib/local-runtime.ts`). |
| A09 Security Logging and Monitoring Failures | Pass | Structured telemetry records route status and latency for all API paths. |
| A10 Server-Side Request Forgery (SSRF) | Pass | No outbound URL fetching or server-side remote fetch from user-controlled URLs in reviewed scope. |

## Implemented Changes

- Enforced request-size limit in `POST /api/matches` with typed 413 error (`PAYLOAD_TOO_LARGE`).
- Hardened rate-limit identity extraction and added bucket-eviction guardrail to mitigate memory growth attacks.
- Enforced checksum validation during local runtime resume.
- Added global security headers and disabled framework fingerprint header.
- Added/updated tests for all new security behavior.

## Remaining Security Work

1. Dependency vulnerability remediation from `npm audit` (A06).
2. Decide explicit authn/authz roadmap for post-MVP hardening (A01/A07).
3. Evaluate stronger checksum/HMAC strategy for snapshot integrity if threat model expands beyond local trust boundaries (A02/A08).
