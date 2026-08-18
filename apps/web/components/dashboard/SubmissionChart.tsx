'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Point = { day: string; count: number };

export function SubmissionChart({ data }: { data: Point[] }) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Submissions (30 days)</h3>
        <span className="text-xs font-medium text-muted-foreground">Last 30 days</span>
      </div>

      <div className="h-64 w-full">
        {!hasData ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-medium text-foreground">No submissions yet</p>
            <p className="text-xs text-muted-foreground">Data will appear here once your forms start collecting responses</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="submissionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(258 82% 62%)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(258 82% 62%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 92%)" vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                tick={{ fontSize: 12, fill: 'hsl(240 6% 46%)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: 'hsl(240 6% 46%)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid hsl(240 12% 90%)',
                  boxShadow: '0 8px 24px rgba(16,24,40,0.08)',
                  fontSize: 13
                }}
                labelFormatter={(v) => new Date(v).toLocaleDateString()}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(258 82% 62%)"
                strokeWidth={2.5}
                fill="url(#submissionFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}