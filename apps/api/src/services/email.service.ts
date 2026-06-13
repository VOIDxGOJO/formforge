import { resend, fromEmail } from '../lib/resend.js';

export const emailService = {
  send: async (to: string, subject: string, html: string) => {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_test_key') {
      console.log(`[email:dev] To: ${to} | Subject: ${subject}`);
      return { id: 'dev-mode' };
    }
    return resend.emails.send({ from: fromEmail, to, subject, html });
  },

  sendInvite: async (to: string, workspaceName: string, inviteUrl: string) =>
    emailService.send(
      to,
      `You've been invited to ${workspaceName} on FormForge`,
      `<p>You have been invited to join <strong>${workspaceName}</strong>.</p>
       <p><a href="${inviteUrl}">Accept invitation</a></p>`
    ),

  sendWorkflowEmail: async (to: string, subject: string, body: string) =>
    emailService.send(to, subject, `<div>${body.replace(/\n/g, '<br>')}</div>`)
};
