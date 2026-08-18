'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/hooks/use-workspace';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/forms', label: 'Forms', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings }
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { workspaceId, setWorkspaceId } = useWorkspace();
  const activeWorkspace =
    user?.workspaces.find((w) => w.id === workspaceId) ?? user?.workspaces[0];

  useEffect(() => {
    if (activeWorkspace && workspaceId !== activeWorkspace.id) {
      setWorkspaceId(activeWorkspace.id);
    }
  }, [activeWorkspace, workspaceId, setWorkspaceId]);

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="flex h-screen w-[248px] flex-col border-r border-border bg-card px-4 py-5">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          F
        </div>
        <span className="text-[15px] font-bold text-foreground">FormForge</span>
      </div>

      <div className="mb-6 rounded-xl bg-secondary/60 px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Workspace</p>
        <p className="truncate text-sm font-semibold text-foreground">{activeWorkspace?.name ?? 'FormForge'}</p>
        {user && user.workspaces.length > 1 && (
          <select
            className="mt-2 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
            value={activeWorkspace?.id}
            onChange={(e) => setWorkspaceId(e.target.value)}
          >
            {user.workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <nav className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'transition-smooth flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground',
                active && 'bg-primary/10 font-semibold text-primary hover:bg-primary/10 hover:text-primary'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Separator className="my-4" />
        <div className="mb-3 flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            {initials || 'U'}
          </div>
          <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={() => logout.mutate()}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}