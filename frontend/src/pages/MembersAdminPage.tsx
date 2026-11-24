import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { isAdmin, useAuth } from '../lib/authContext';
import type { Campus, Department, UserProfile, UserRole } from '../types/api';

const ALL_ROLES: UserRole[] = [
  'Admin',
  'CampusHead',
  'Deputy',
  'EventsHead',
  'ClubsHead',
  'MarketingHead',
  'DepartmentMember',
  'Unassigned',
];
const CAMPUS_HEAD_ROLES: UserRole[] = ALL_ROLES.filter((r) => r !== 'Admin');
const DEPARTMENTS: Department[] = ['None', 'Events', 'Clubs', 'Marketing'];

export function MembersAdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [error, setError] = useState('');

  const globalAdmin = isAdmin(user);
  const allowedRoles = globalAdmin ? ALL_ROLES : CAMPUS_HEAD_ROLES;

  const campusesQuery = useQuery({
    queryKey: ['public-campuses'],
    queryFn: () => apiFetch<Campus[]>('/api/v1/campuses'),
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users', showUnassigned],
    queryFn: () => apiFetch<UserProfile[]>(`/api/v1/users?unassigned=${showUnassigned}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      role,
      department,
      campusId,
    }: {
      id: string;
      role: UserRole;
      department: Department;
      campusId: string | null;
    }) =>
      apiFetch<UserProfile>(`/api/v1/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role, department, campusId }),
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
          <h1 className="text-2xl font-bold text-[#1E1E1E]">
            {globalAdmin ? 'Global Role & Campus Management (Admin)' : 'Campus Member Role Management'}
          </h1>
          <p className="text-sm text-[#54595F]">
            {globalAdmin
              ? 'As Admin, you can promote or assign any account to any role, department, and Belgium Campus iTversity location.'
              : 'Promote, demote, or transfer members across CLC positions within your campus.'}
          </p>
        </div>

        <button
          onClick={() => setShowUnassigned(!showUnassigned)}
          className="px-3.5 py-2 rounded-lg border border-neutral-300 bg-white text-xs font-semibold text-[#1E1E1E] hover:border-[#DB3335]"
        >
          {showUnassigned ? 'Show All Users' : 'Filter Unassigned Accounts'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto shadow-xs">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#1E1E1E] text-xs uppercase text-neutral-200">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Campus</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(usersQuery.data ?? []).map((u) => (
              <tr key={u.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-semibold text-[#1E1E1E]">{u.fullName}</td>
                <td className="px-4 py-3 text-[#54595F]">{u.email}</td>
                <td className="px-4 py-3">
                  {globalAdmin ? (
                    <select
                      value={u.campusId ?? ''}
                      onChange={(e) =>
                        updateMutation.mutate({
                          id: u.id,
                          role: u.role,
                          department: u.department,
                          campusId: e.target.value || null,
                        })
                      }
                      className="text-xs border border-neutral-300 rounded-lg px-2 py-1.5 bg-white"
                    >
                      <option value="">Unassigned</option>
                      {(campusesQuery.data ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-medium text-[#3A3A3A]">{u.campusName ?? 'Unassigned'}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      updateMutation.mutate({
                        id: u.id,
                        role: e.target.value as UserRole,
                        department: u.department,
                        campusId: u.campusId,
                      })
                    }
                    className="text-xs border border-neutral-300 rounded-lg px-2 py-1.5 bg-white font-semibold"
                  >
                    {allowedRoles.map((r) => (
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
                        campusId: u.campusId,
                      })
                    }
                    className="text-xs border border-neutral-300 rounded-lg px-2 py-1.5 bg-white"
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
            {!(usersQuery.data ?? []).length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#54595F]">
                  No accounts found. New users who sign up will appear here for role assignment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
