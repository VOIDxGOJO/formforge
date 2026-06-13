import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'FormForge <onboarding@resend.dev>';
