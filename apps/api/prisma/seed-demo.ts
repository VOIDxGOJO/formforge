// Seeds the FormForge 2.0 demo workspace: two demo accounts, seven forms with their
// responses, a webhook workflow, a synthetic warm start, trained adaptive models and
// cached insights. Data comes from prisma/demo/demo-workspace.json; response times
// are replayed relative to now, so the 30-day dashboard chart is always populated.
//
//   npm run db:seed            create the demo (skips if it already exists)
//   npm run db:seed -- --reset delete the demo accounts and their workspace, then recreate
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { Prisma, Role, type ActionType } from '@prisma/client';
import { prisma } from '../src/lib/prisma.js';
import { adaptiveService } from '../src/services/adaptive.service.js';

type DemoForm = {
  name: string;
  objective: string | null;
  fields: Prisma.InputJsonValue;
  adaptiveConfig: { enabled?: boolean } | null;
  isActive: boolean;
  createdAgo: number;
  workflows: Array<{ name: string; isActive: boolean; steps: Array<{ actionType: ActionType; actionConfig: Prisma.InputJsonValue; order: number }> }>;
  submissions: Array<{ responses: Prisma.InputJsonValue; imputed: Prisma.InputJsonValue | null; ago: number }>;
  synthetic: Array<{ persona: string; responses: Prisma.InputJsonValue }>;
  insight: { summary: string; topics: Prisma.InputJsonValue; sentiment: Prisma.InputJsonValue; clusters: Prisma.InputJsonValue; basedOn: number } | null;
};
type Demo = {
  workspace: { name: string };
  members: Array<{ name: string; email: string; role: Role }>;
  forms: DemoForm[];
};

const read = <T>(file: string): T => JSON.parse(readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')) as T;
const demo = read<Demo>('./demo/demo-workspace.json');
const { accounts } = read<{ accounts: Array<{ email: string; password: string }> }>('./demo/accounts.json');

const slugify = (name: string, size: number) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${nanoid(size)}`;
const ago = (seconds: number) => new Date(Date.now() - seconds * 1000);

async function removeExisting(emails: string[]) {
  const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  if (users.length === 0) return;
  // Only workspaces owned by a demo account are removed; forms and responses cascade.
  const owned = await prisma.membership.findMany({ where: { userId: { in: users.map((u) => u.id) }, role: Role.OWNER }, select: { workspaceId: true } });
  await prisma.workspace.deleteMany({ where: { id: { in: owned.map((m) => m.workspaceId) } } });
  await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
}

async function main() {
  const reset = process.argv.includes('--reset');
  const emails = demo.members.map((m) => m.email);
  if (!emails.every((e) => e.endsWith('@formforge.test'))) throw new Error('Demo accounts must use @formforge.test addresses.');

  const existing = await prisma.user.count({ where: { email: { in: emails } } });
  if (existing > 0 && !reset) {
    console.log('Demo accounts already exist. Run "npm run db:seed -- --reset" to recreate the demo.');
    return;
  }
  if (reset) await removeExisting(emails);

  const passwordOf = new Map(accounts.map((a) => [a.email, a.password]));
  const users = new Map<string, string>();
  for (const m of demo.members) {
    const password = passwordOf.get(m.email);
    if (!password) throw new Error(`No password for ${m.email} in prisma/demo/accounts.json`);
    const user = await prisma.user.create({ data: { email: m.email, name: m.name, passwordHash: await bcrypt.hash(password, 12) } });
    users.set(m.email, user.id);
  }
  const workspace = await prisma.workspace.create({
    data: {
      name: demo.workspace.name,
      slug: slugify(demo.workspace.name, 6),
      memberships: { create: demo.members.map((m) => ({ userId: users.get(m.email)!, role: m.role })) }
    }
  });

  for (const f of demo.forms) {
    const form = await prisma.form.create({
      data: {
        workspaceId: workspace.id,
        name: f.name,
        slug: slugify(f.name, 8),
        objective: f.objective,
        fields: f.fields,
        adaptiveConfig: f.adaptiveConfig ?? Prisma.JsonNull,
        isActive: f.isActive,
        createdAt: ago(f.createdAgo)
      }
    });
    for (const w of f.workflows) {
      await prisma.workflow.create({
        data: { formId: form.id, name: w.name, isActive: w.isActive, steps: { create: w.steps } }
      });
    }
    if (f.submissions.length) {
      await prisma.submission.createMany({
        data: f.submissions.map((s) => ({
          formId: form.id,
          responses: s.responses,
          imputed: s.imputed ?? Prisma.JsonNull,
          submittedAt: ago(s.ago)
        }))
      });
    }
    if (f.synthetic.length) {
      await prisma.syntheticResponse.createMany({ data: f.synthetic.map((s) => ({ formId: form.id, ...s })) });
    }
    // Train the respondent model for adaptive forms and warm-started forms.
    if (f.adaptiveConfig?.enabled || f.synthetic.length) await adaptiveService.refit(form.id);
    if (f.insight) await prisma.responseInsight.create({ data: { formId: form.id, ...f.insight } });
    console.log(`  ${f.name}: ${f.submissions.length} responses${f.synthetic.length ? `, ${f.synthetic.length} synthetic` : ''}`);
  }

  console.log(`\nDemo workspace "${demo.workspace.name}" is ready.`);
  for (const m of demo.members) console.log(`  ${m.role.padEnd(6)} ${m.email}`);
  console.log('Passwords are in apps/api/prisma/demo/accounts.json.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
