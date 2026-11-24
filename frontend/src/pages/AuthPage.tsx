import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, LogIn, Shield, UserPlus } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/authContext';
import type { Campus } from '../types/api';

const BC_ICON = 'https://www.belgiumcampus.ac.za/wp-content/uploads/2021/01/BC-Icon.png';
const AUTH_BG = 'https://www.belgiumcampus.ac.za/wp-content/uploads/2024/10/Pretoria-Campus_0029_Background-768x512.png';

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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#F4F4F2]">
      {/* Left Editorial Photo Panel */}
      <div className="hidden lg:flex lg:col-span-6 relative bg-[#141414] text-white flex-col justify-between p-12 overflow-hidden">
        <img
          src={AUTH_BG}
          alt="Belgium Campus iTversity"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#141414]/95 via-[#141414]/80 to-[#DB3335]/25" />
        <div className="bc-tricolour-bar absolute top-0 left-0 right-0" />

        <div className="relative flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={BC_ICON} alt="BC" className="w-10 h-10 rounded-lg bg-white p-1 object-contain" />
            <div>
              <p className="font-extrabold text-base leading-none">
                Belgium Campus <span className="text-[#DB3335]">iTversity</span>
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 mt-1">
                CLC Operations Portal
              </p>
            </div>
          </Link>
        </div>

        <div className="relative space-y-5 max-w-lg">
          <div className="flex gap-2">
            {['PTA', 'KMP', 'STB'].map((code) => (
              <span
                key={code}
                className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-md bg-white/10 border border-white/15 text-[#E9C00E]"
              >
                {code}
              </span>
            ))}
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
            Lead your campus with clarity, speed, and accountability.
          </h2>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Submit proposals, manage departmental tasks, publish campus events, and keep Pretoria,
            Kempton Park, and Stellenbosch connected in one workspace.
          </p>
        </div>

        <p className="relative font-mono text-[11px] text-neutral-400">
          PRETORIA · KEMPTON PARK · STELLENBOSCH
        </p>
      </div>

      {/* Right Form Panel */}
      <div className="lg:col-span-6 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#54595F] hover:text-[#DB3335] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Campus Showcase
          </Link>

          <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-xl overflow-hidden">
            <div className="bc-tricolour-bar" />

            <div className="grid grid-cols-2 p-1.5 m-4 mb-0 rounded-2xl bg-[#F4F4F2]">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSearchParams({ mode: 'login' });
                }}
                className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  mode === 'login'
                    ? 'bg-[#161616] text-white shadow-sm'
                    : 'text-[#54595F] hover:text-[#161616]'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSearchParams({ mode: 'signup' });
                }}
                className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  mode === 'signup'
                    ? 'bg-[#161616] text-white shadow-sm'
                    : 'text-[#54595F] hover:text-[#161616]'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#161616]">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="text-xs text-[#54595F] mt-1 leading-relaxed">
                  {mode === 'login'
                    ? 'Sign in with your registered email to open your campus dashboard.'
                    : 'New accounts start as Unassigned until promoted by the Admin or Campus Head.'}
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
                  {error}
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-[#161616] mb-1.5">Full Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g., Thabo Mokoena"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm bg-[#FAFAFA] focus:bg-white focus:outline-none focus:border-[#DB3335] transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#161616] mb-1.5">Email Address</label>
                <input
                  required
                  type="email"
                  placeholder="name@belgiumcampus.ac.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm bg-[#FAFAFA] focus:bg-white focus:outline-none focus:border-[#DB3335] transition-colors"
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-[#161616] mb-1.5">Campus</label>
                  <select
                    required
                    value={preferredCampusId}
                    onChange={(e) => setPreferredCampusId(e.target.value)}
                    className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm bg-[#FAFAFA] focus:bg-white focus:outline-none focus:border-[#DB3335] transition-colors"
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
                className="w-full py-3 rounded-xl bg-[#DB3335] hover:bg-[#B52325] text-white text-sm font-bold transition-all shadow-lg shadow-[#DB3335]/20 disabled:opacity-50"
              >
                {submitting
                  ? 'Authenticating...'
                  : mode === 'login'
                    ? 'Sign In to CLC Portal'
                    : 'Create Account'}
              </button>

              {mode === 'login' && (import.meta.env.VITE_AUTH_MODE || 'DevMock') === 'DevMock' && (
                <div className="pt-4 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setEmail('shaunvdbijl@gmail.com')}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#161616] hover:bg-[#262626] text-[#E9C00E] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Quick Fill Admin (shaunvdbijl@gmail.com)
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
