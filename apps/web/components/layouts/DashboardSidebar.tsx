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

  return (
    <aside className="flex h-full w-[220px] flex-col border-r bg-card p-4">
      <div className="mb-6">
        <p className="text-xs text-muted-foreground">Workspace</p>
        <p className="font-semibold">{activeWorkspace?.name ?? 'FormForge'}</p>
        {user && user.workspaces.length > 1 && (
          <select
            className="mt-2 w-full rounded border px-2 py-1 text-sm"
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
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent',
              pathname === href && 'bg-accent font-medium'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <Separator className="my-4" />
        <p className="mb-2 truncate text-sm">{user?.name}</p>
        <Button variant="outline" size="sm" className="w-full" onClick={() => logout.mutate()}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
