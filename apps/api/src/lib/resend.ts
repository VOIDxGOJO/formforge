import { Resend } from 'resend';

// Built on first use: the Resend constructor throws without a key, and the API
// (and its tests) must start without one, since e-mail falls back to dev logging.
let client: Resend | null = null;
export const getResend = () => (client ??= new Resend(process.env.RESEND_API_KEY));

export const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'FormForge <onboarding@resend.dev>';
