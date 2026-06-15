'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminDashboard } from '@/features/dashboard/api';

/**
 * Charts are split into their own module and loaded with `next/dynamic` so the
 * Recharts library (~100kB) is fetched on demand rather than shipped in the
 * dashboard's initial bundle — keeping first navigation snappy.
 */
export default function DashboardCharts({ charts }: { charts: AdminDashboard['charts'] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Attendance Trend (7 days)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Headcount by Department</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.headcountByDepartment}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="department" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
