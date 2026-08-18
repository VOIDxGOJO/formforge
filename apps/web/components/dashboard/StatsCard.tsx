import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatsCard({
  title,
  value,
  icon: Icon,
  accent = false
}: {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  accent?: boolean;
}) {
  return (
    <Card className="transition-smooth hover:-translate-y-0.5 hover:shadow-lift">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              accent ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}