import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { Department, UserProfile, UserRole } from '../types/api';

const ROLES: UserRole[] = [
  'CampusHead',
  'Deputy',
  'EventsHead',
  'ClubsHead',
  'MarketingHead',
  'DepartmentMember',
  'Unassigned',
];
const DEPARTMENTS: Department[] = ['None', 'Events', 'Clubs', 'Marketing'];

export function MembersAdminPage() {
  const queryClient = useQueryClient();
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [error, setError] = useState('');

  const usersQuery = useQuery({
    queryKey: ['admin-users', showUnassigned],
    queryFn: () => apiFetch<UserProfile[]>(`/api/v1/users?unassigned=${showUnassigned}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, role, department }: { id: string; role: UserRole; department: Department }) =>
      apiFetch<UserProfile>(`/api/v1/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role, department, campusId: null }),
      }),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campus Member Role Management</h1>
          <p className="text-sm text-slate-600">
            Promote, demote, or transfer members across CLC positions within your campus.
          </p>
        </div>

        <button
          onClick={() => setShowUnassigned(!showUnassigned)}
          className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {showUnassigned ? 'Show Campus Members' : 'Show Unassigned New Accounts'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(usersQuery.data ?? []).map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{u.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      updateMutation.mutate({
                        id: u.id,
                        role: e.target.value as UserRole,
                        department: u.department,
                      })
                    }
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.department}
                    onChange={(e) =>
                      updateMutation.mutate({
                        id: u.id,
                        role: u.role,
                        department: e.target.value as Department,
                      })
                    }
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
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
