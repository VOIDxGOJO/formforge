import { DashboardSidebar } from '@/components/layouts/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto">
        <header className="border-b px-6 py-4">
          <p className="text-sm text-muted-foreground">FormForge</p>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
