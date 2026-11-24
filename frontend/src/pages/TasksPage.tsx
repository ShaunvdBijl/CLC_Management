import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { isDeptHead, useAuth } from '../lib/authContext';
import type { TaskPriority, UserProfile, WorkTask, WorkTaskStatus } from '../types/api';

export function TasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [dueAt, setDueAt] = useState('');
  const [error, setError] = useState('');

  const canCreate = isDeptHead(user);

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiFetch<WorkTask[]>('/api/v1/tasks'),
  });

  const deptUsersQuery = useQuery({
    queryKey: ['dept-users', user?.department],
    queryFn: () => apiFetch<UserProfile[]>(`/api/v1/users?department=${user?.department}`),
    enabled: canCreate && !!user?.department,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<WorkTask>('/api/v1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          eventId: null,
          assignedToId,
          title,
          description,
          priority,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      }),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setDueAt('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkTaskStatus }) =>
      apiFetch(`/api/v1/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, sortOrder: 1 }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Departmental Tasks</h1>
        <p className="text-sm text-slate-600">
          Assign operational tasks to department members and track completion automatically for quarterly reviews.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">{error}</div>
      )}

      {canCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
        >
          <h2 className="font-semibold text-slate-900">Assign New {user?.department} Task</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              required
              placeholder="Task Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <select
              required
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Assign to Department Member...</option>
              {(deptUsersQuery.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role})
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
              <option value="Critical">Critical Priority</option>
            </select>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <textarea
            required
            rows={2}
            placeholder="Task instructions..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#DB3335] text-white text-sm font-medium hover:bg-[#B52325]"
          >
            Create & Assign Task
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Dept</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(tasksQuery.data ?? []).map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{t.title}</p>
                  <p className="text-xs text-slate-500">{t.description}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{t.department}</td>
                <td className="px-4 py-3 text-slate-600">{t.assignedToName}</td>
                <td className="px-4 py-3 font-medium">{t.priority}</td>
                <td className="px-4 py-3">
                  <select
                    value={t.status}
                    onChange={(e) =>
                      statusMutation.mutate({ id: t.id, status: e.target.value as WorkTaskStatus })
                    }
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  >
                    <option value="ToDo">To Do</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
