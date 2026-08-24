# Resend-backed Supabase OTP

The Dashboard continues to use Supabase Auth for password verification, email
confirmation, and sessions. Resend is the SMTP delivery provider. This preserves
the existing tenant and session security boundary while replacing Brevo.

## DNS and domain status

The authoritative AWS Route 53 zone for `atlowest.in` now contains the Resend DKIM
TXT record, the Resend SPF MX/TXT records, and a monitoring-only DMARC record. Resend
must finish verification before production delivery is enabled.

## Configure Supabase Auth

Use a fresh Resend API key after the previous key was revoked. From a trusted shell or
CI runner, set `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `RESEND_API_KEY`,
`AUTH_FROM_EMAIL`, and optionally `AUTH_SENDER_NAME`, then run:

```sh
node scripts/configure-supabase-resend-smtp.mjs
```

The script configures Resend SMTP (`smtp.resend.com:465`), a six-digit OTP with a
10-minute expiry, and the branded code-only templates for sign-in and account
confirmation. The email template uses
the Voomate logo and an email-safe approximation of the landing page's warm matte
texture. WebGL shader backgrounds cannot render reliably inside email clients, so the
template uses compatible radial texture layers instead.

Never put the Resend key in `NEXT_PUBLIC_*`, commit it, or send it through the browser.
The Supabase Auth template must contain `{{ .Token }}` for code-based OTP sign-in.
