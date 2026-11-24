import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { WorkTask, WorkTaskStatus } from '../types/api';

const COLUMNS: { key: WorkTaskStatus; label: string; color: string }[] = [
  { key: 'ToDo', label: 'To Do', color: 'border-slate-300 bg-slate-100/70' },
  { key: 'InProgress', label: 'In Progress', color: 'border-indigo-300 bg-indigo-50/50' },
  { key: 'Done', label: 'Done', color: 'border-emerald-300 bg-emerald-50/50' },
];

const PRIORITY_BADGE: Record<string, string> = {
  Critical: 'bg-rose-100 text-rose-800',
  High: 'bg-amber-100 text-amber-800',
  Medium: 'bg-sky-100 text-sky-800',
  Low: 'bg-slate-200 text-slate-700',
};

export function EventsKanbanPage() {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['events-kanban'],
    queryFn: () => apiFetch<WorkTask[]>('/api/v1/tasks?department=Events'),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkTaskStatus }) =>
      apiFetch(`/api/v1/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, sortOrder: 1 }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const tasks = tasksQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Events Kanban Board</h1>
        <p className="text-sm text-slate-600">
          Event execution tasks ordered by priority (Critical → High → Medium → Low).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className={`rounded-xl border p-4 space-y-3 ${col.color}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm text-slate-900">{col.label}</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-slate-700">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {colTasks.map((t) => (
                  <div key={t.id} className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-slate-900">{t.title}</p>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${PRIORITY_BADGE[t.priority]}`}>
                        {t.priority}
                      </span>
                    </div>
                    {t.eventTitle && <p className="text-xs text-indigo-600 font-medium">{t.eventTitle}</p>}
                    <p className="text-xs text-slate-600">{t.description}</p>
                    <p className="text-[11px] text-slate-500">
                      Assignee: {t.assignedToName}
                      {t.dueAt ? ` · Due ${new Date(t.dueAt).toLocaleDateString()}` : ''}
                    </p>
                    <div className="flex gap-1.5 pt-1">
                      {COLUMNS.filter((c) => c.key !== col.key).map((target) => (
                        <button
                          key={target.key}
                          onClick={() => moveMutation.mutate({ id: t.id, status: target.key })}
                          className="text-[11px] px-2 py-1 rounded bg-slate-100 hover:bg-indigo-100 text-slate-700 font-medium"
                        >
                          → {target.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && <p className="text-xs text-slate-500 text-center py-6">No tasks</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
