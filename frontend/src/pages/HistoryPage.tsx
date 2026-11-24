import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { ActivityLog } from '../types/api';

export function HistoryPage() {
  const [department, setDepartment] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const historyQuery = useQuery({
    queryKey: ['history', department, from, to],
    queryFn: () => {
      const params = new URLSearchParams();
      if (department) params.set('department', department);
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(to).toISOString());
      return apiFetch<ActivityLog[]>(`/api/v1/history?${params}`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Departmental Activity History</h1>
        <p className="text-sm text-slate-600">
          Automatic audit trail of approved proposals, confirmed events, and completed tasks for quarterly evaluations.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">All Departments</option>
          <option value="Events">Events</option>
          <option value="Clubs">Clubs</option>
          <option value="Marketing">Marketing</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {(historyQuery.data ?? []).map((log) => (
          <div key={log.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 mr-2">
                {log.department}
              </span>
              <span className="text-sm font-medium text-slate-900">{log.summary}</span>
              <p className="text-xs text-slate-500 mt-0.5">
                {log.actionType} · by {log.actorName}
              </p>
            </div>
            <span className="text-xs text-slate-500">{new Date(log.occurredAt).toLocaleString()}</span>
          </div>
        ))}
        {!(historyQuery.data ?? []).length && (
          <p className="p-6 text-sm text-slate-500 text-center">No activity logs found for this filter.</p>
        )}
      </div>
    </div>
  );
}
