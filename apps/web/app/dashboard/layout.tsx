import { DashboardSidebar } from '@/components/layouts/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-8 animate-fade-in">{children}</div>
      </div>
    </div>
  );
}