import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Calendar,
  Compass,
  Megaphone,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { PublicNavbar } from '../components/PublicNavbar';
import type { Campus } from '../types/api';

const FALLBACK_HERO = 'https://www.belgiumcampus.ac.za/wp-content/uploads/2024/09/Campus-background-2.png';

const DEPARTMENTS = [
  {
    name: 'Events & Logistics',
    tag: 'KANBAN · GANTT',
    desc: 'Proposal pipelines, venue conflict detection, and live campus event publishing.',
    icon: Sparkles,
    accent: 'border-t-[#DB3335]',
    iconColor: 'text-[#DB3335]',
  },
  {
    name: 'Student Clubs',
    tag: 'SOCIETIES',
    desc: 'Official club registration, Club Head appointments, and cross-campus student communities.',
    icon: Users,
    accent: 'border-t-[#E9C00E]',
    iconColor: 'text-[#C9A300]',
  },
  {
    name: 'Marketing & Media',
    tag: 'CAMPAIGNS',
    desc: 'Event-linked promotional campaigns and verified poster galleries published campus-wide.',
    icon: Megaphone,
    accent: 'border-t-[#4AC1C1]',
    iconColor: 'text-[#2B9A9A]',
  },
  {
    name: 'Campus Leadership',
    tag: 'GOVERNANCE',
    desc: 'Structured approval reviews, meeting schedules, role governance, and quarterly audit trails.',
    icon: ShieldCheck,
    accent: 'border-t-[#0170B9]',
    iconColor: 'text-[#0170B9]',
  },
];

export function LandingPage() {
  const campusesQuery = useQuery({
    queryKey: ['public-campuses'],
    queryFn: () => apiFetch<Campus[]>('/api/v1/campuses'),
  });

  const campuses = campusesQuery.data ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const spotlight = campuses[activeIndex] ?? campuses[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F4F2]">
      <PublicNavbar />

      {/* Interactive Full-Bleed Hero */}
      <section className="relative bg-[#141414] text-white overflow-hidden">
        <img
          src={spotlight?.imageUrl || FALLBACK_HERO}
          alt={spotlight?.name || 'Belgium Campus iTversity'}
          className="absolute inset-0 w-full h-full object-cover opacity-30 scale-105 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#141414]/88 to-[#141414]/55" />
        <div className="absolute inset-0 bc-dot-grid opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 animate-fade-up">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/8 border border-white/15 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-[#E9C00E] animate-pulse" />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-200">
                  Pretoria · Kempton Park · Stellenbosch
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
                One Council.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E9C00E] via-[#F7D74C] to-[#DB3335]">
                  Three Campuses.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-neutral-300 max-w-2xl leading-relaxed">
                The official Campus Leadership Council platform for{' '}
                <strong className="text-white">Belgium Campus iTversity</strong>. Pick a campus to
                explore confirmed student events, or sign in to coordinate proposals, clubs, and
                departmental operations.
              </p>

              {/* Interactive Campus Selector Pills */}
              {campuses.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {campuses.map((c, idx) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => setActiveIndex(idx)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                        idx === activeIndex
                          ? 'bg-white text-[#161616] border-white shadow-lg'
                          : 'bg-white/5 text-neutral-300 border-white/15 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      <span className="font-mono text-[#DB3335] mr-1.5">{c.code}</span>
                      {c.name.replace(' Campus', '')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Interactive Spotlight Card */}
            {spotlight && (
              <div className="lg:col-span-5 animate-fade-up">
                <Link
                  to={`/campus/${spotlight.code}`}
                  className="group block rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-5 hover:border-[#E9C00E]/70 transition-all shadow-2xl"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#E9C00E]">
                      Active Spotlight · {spotlight.code}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-200 group-hover:text-[#E9C00E]">
                      Open Activity
                      <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">{spotlight.name}</h2>
                  <p className="text-xs text-neutral-300 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#DB3335]" />
                    {spotlight.address}, {spotlight.province}
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-neutral-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#4AC1C1]" />
                      Live Confirmed Events
                    </span>
                    <span className="font-mono font-bold text-sm text-white px-2.5 py-0.5 rounded-md bg-[#DB3335]">
                      {spotlight.confirmedEventCount}
                    </span>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Full-Bleed Photographic Campus Grid */}
      <section id="campuses" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#DB3335] flex items-center gap-2">
              <Compass className="w-4 h-4" />
              Select a Campus
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#161616] mt-2">
              Belgium Campus iTversity Locations
            </h2>
          </div>
          <p className="text-sm text-[#54595F] max-w-md">
            Click any campus photograph below to inspect its public event schedule, venues, and
            promotional posters.
          </p>
        </div>

        {campusesQuery.isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[420px] rounded-3xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {campuses.map((campus, idx) => {
              const spanClass = idx === 0 ? 'lg:col-span-6' : 'lg:col-span-3';
              return (
                <Link
                  key={campus.id}
                  to={`/campus/${campus.code}`}
                  className={`${spanClass} group relative h-[410px] rounded-3xl overflow-hidden bg-[#161616] shadow-md hover:shadow-2xl transition-all duration-500 flex flex-col justify-between`}
                >
                  <img
                    src={campus.imageUrl}
                    alt={campus.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/45 to-black/20 group-hover:via-[#111111]/55 transition-colors" />

                  {/* Top Floating Badges */}
                  <div className="relative p-5 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-[#161616]/85 backdrop-blur-sm text-[#E9C00E] border border-white/15">
                      {campus.code}
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20">
                      {campus.province}
                    </span>
                  </div>

                  {/* Bottom Content Overlay */}
                  <div className="relative p-6 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-extrabold text-white tracking-tight group-hover:text-[#E9C00E] transition-colors">
                          {campus.name}
                        </h3>
                        <p className="text-xs text-neutral-300 mt-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#DB3335] shrink-0" />
                          {campus.address}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-[#DB3335] text-white flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-[#E9C00E] group-hover:text-[#161616] transition-all shadow-lg">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-neutral-300 line-clamp-2 leading-relaxed">
                      {campus.description}
                    </p>

                    <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                      <span className="font-mono text-neutral-200">
                        {campus.confirmedEventCount}{' '}
                        {campus.confirmedEventCount === 1 ? 'EVENT LIVE' : 'EVENTS LIVE'}
                      </span>
                      <span className="font-bold text-[#E9C00E] group-hover:underline">
                        View Campus Activity →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* CLC Structure Strip */}
      <section className="bg-white border-t border-neutral-200/80 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#54595F]">
                Unified Operations
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#161616] mt-1">
                Built for Every CLC Portfolio
              </h2>
            </div>
            <Link
              to="/auth?mode=signup"
              className="text-sm font-bold text-[#DB3335] hover:underline inline-flex items-center gap-1"
            >
              Join your campus council
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {DEPARTMENTS.map((dept) => {
              const Icon = dept.icon;
              return (
                <div
                  key={dept.name}
                  className={`rounded-2xl bg-[#F8F8F6] border border-neutral-200/80 border-t-4 ${dept.accent} p-5 hover:bg-white hover:shadow-md transition-all`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <Icon className={`w-5 h-5 ${dept.iconColor}`} />
                    <span className="font-mono text-[10px] font-bold tracking-wider text-neutral-500">
                      {dept.tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[#161616]">{dept.name}</h3>
                  <p className="text-xs text-[#54595F] mt-2 leading-relaxed">{dept.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#141414] text-neutral-400 text-xs py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium text-neutral-300">
            © {new Date().getFullYear()} Belgium Campus iTversity — Campus Leadership Council
          </p>
          <p className="font-mono text-[11px] text-neutral-500">
            PTA · KMP · STB &nbsp;|&nbsp; SOUTH AFRICA
          </p>
        </div>
      </footer>
    </div>
  );
}
