# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Email a concise report to
`support@atlowest.com` with the affected component, reproduction steps, expected and actual
behavior, and any suggested mitigation. Do not include customer data, access tokens, or credentials
in the report.

Reports are acknowledged within five business days. Severity and remediation timing depend on
exploitability, tenant impact, and whether the vulnerable surface is deployed.

## Local development

- Do not commit `.env`, provider credentials, generated release directories, or CloudFormation
  synthesis output.
- Use `.env.example` as the configuration contract. It contains variable names only.
- Treat `NEXT_PUBLIC_*` values as public. Server-side secrets must never appear in browser bundles,
  logs, issues, or examples.
- Run `npm run check` and `npm audit --omit=dev` before proposing a release.

## Scope

The platform is under active development and is not security-certified. The current security model,
implemented controls, and known pre-launch validation work are documented in
[`docs/security.md`](docs/security.md).
