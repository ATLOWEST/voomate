#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';

try {
  loadEnvFile('.env');
} catch {
  // CI and production runners provide secrets through their environment instead.
}

/**
 * Configure Supabase Auth to send its OTP email through Resend SMTP.
 * Credentials are read from the environment and are never printed.
 */
const required = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_PROJECT_REF',
  'RESEND_API_KEY',
  'AUTH_FROM_EMAIL',
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  const projectRef = process.env.SUPABASE_PROJECT_REF.trim();
  const magicLinkTemplate = await readFile(
    new URL('../supabase/templates/magic_link.html', import.meta.url),
    'utf8',
  );
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_email_enabled: true,
        mailer_autoconfirm: false,
        mailer_secure_email_change_enabled: true,
        smtp_admin_email: process.env.AUTH_FROM_EMAIL.trim(),
        smtp_host: 'smtp.resend.com',
        smtp_port: '465',
        smtp_user: 'resend',
        smtp_pass: process.env.RESEND_API_KEY,
        smtp_sender_name: process.env.AUTH_SENDER_NAME?.trim() || 'Voomate',
        mailer_otp_exp: 600,
        mailer_otp_length: 6,
        mailer_subjects_magic_link: 'Your Voomate sign-in code',
        mailer_templates_magic_link_content: magicLinkTemplate,
        // Password signup uses Supabase's confirmation email. Keep it code-only too, so a
        // new merchant never receives an unwanted Supabase magic link.
        mailer_subjects_confirmation: 'Verify your Voomate account',
        mailer_templates_confirmation_content: magicLinkTemplate,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase Auth Resend SMTP update failed with HTTP ${response.status}.`);
  }

  console.log('Supabase Auth is configured for Resend SMTP and the Voomate OTP template.');
}
