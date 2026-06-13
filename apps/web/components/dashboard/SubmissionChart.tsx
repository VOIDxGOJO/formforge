'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Point = { day: string; count: number };

export function SubmissionChart({ data }: { data: Point[] }) {
  return (
    <div className="h-72 w-full rounded-lg border p-4">
      <h3 className="mb-4 font-semibold">Submissions (30 days)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Area type="monotone" dataKey="count" stroke="#0f172a" fill="#cbd5e1" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
