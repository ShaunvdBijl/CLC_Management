import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogIn, Shield, UserPlus } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { PublicNavbar } from '../components/PublicNavbar';
import type { Campus } from '../types/api';

export function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const navigate = useNavigate();
  const { loginWithEmail, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [preferredCampusId, setPreferredCampusId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const campusesQuery = useQuery({
    queryKey: ['public-campuses'],
    queryFn: () => apiFetch<Campus[]>('/api/v1/campuses'),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email);
      } else {
        await signUp(fullName, email, preferredCampusId || null);
      }
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-200 shadow-lg overflow-hidden">
          <div className="bc-tricolour-bar" />

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 border-b border-neutral-200 bg-neutral-50">
            <button
              type="button"
              onClick={() => {
                setError('');
                setSearchParams({ mode: 'login' });
              }}
              className={`py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                mode === 'login'
                  ? 'bg-white text-[#DB3335] border-b-2 border-[#DB3335]'
                  : 'text-[#54595F] hover:text-[#1E1E1E]'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setSearchParams({ mode: 'signup' });
              }}
              className={`py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                mode === 'signup'
                  ? 'bg-white text-[#DB3335] border-b-2 border-[#DB3335]'
                  : 'text-[#54595F] hover:text-[#1E1E1E]'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
            <div>
              <h1 className="text-xl font-bold text-[#1E1E1E]">
                {mode === 'login' ? 'Sign in to CLC Portal' : 'Create CLC Account'}
              </h1>
              <p className="text-xs text-[#54595F] mt-1">
                {mode === 'login'
                  ? 'Use your Belgium Campus iTversity / registered email to access your campus workspace.'
                  : 'New accounts start as Unassigned until promoted by an Admin or Campus Head.'}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                {error}
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[#3A3A3A] mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g., Thabo Mokoena"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#DB3335]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#3A3A3A] mb-1">Email Address</label>
              <input
                required
                type="email"
                placeholder="name@belgiumcampus.ac.za"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#DB3335]"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[#3A3A3A] mb-1">Campus</label>
                <select
                  required
                  value={preferredCampusId}
                  onChange={(e) => setPreferredCampusId(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#DB3335]"
                >
                  <option value="">Select your campus...</option>
                  {(campusesQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.province})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-[#DB3335] hover:bg-[#B52325] text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Log In to Portal'
                  : 'Create Account'}
            </button>

            {mode === 'login' && (import.meta.env.VITE_AUTH_MODE || 'DevMock') === 'DevMock' && (
              <div className="pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEmail('shaunvdbijl@gmail.com')}
                  className="w-full py-2 px-3 rounded-lg bg-[#1E1E1E] hover:bg-[#2B2B2B] text-[#E9C00E] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Fill Admin Account (shaunvdbijl@gmail.com)
                </button>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
