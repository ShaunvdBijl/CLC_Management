import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar, MapPin, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { PublicNavbar } from '../components/PublicNavbar';
import type { Campus } from '../types/api';

const HERO_BG = 'https://www.belgiumcampus.ac.za/wp-content/uploads/2024/09/Campus-background-2.png';

export function LandingPage() {
  const campusesQuery = useQuery({
    queryKey: ['public-campuses'],
    queryFn: () => apiFetch<Campus[]>('/api/v1/campuses'),
  });

  const campuses = campusesQuery.data ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative bg-[#1E1E1E] text-white overflow-hidden">
        <img
          src={HERO_BG}
          alt="Belgium Campus iTversity"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E1E1E] via-[#1E1E1E]/90 to-[#1E1E1E]/70" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9C00E]/15 border border-[#E9C00E]/40 text-[#E9C00E] text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              Belgium Campus iTversity · Student Leadership
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Campus Leadership Council{' '}
              <span className="text-[#DB3335]">Operations Hub</span>
            </h1>
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
              Explore live student events and campus life across our three South African campuses —
              <strong className="text-white"> Pretoria</strong>,{' '}
              <strong className="text-white">Kempton Park</strong>, and{' '}
              <strong className="text-white">Stellenbosch</strong>. Select a campus below to view its latest activity.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="#campuses"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#DB3335] hover:bg-[#B52325] text-white text-sm font-bold transition-colors shadow-lg"
              >
                Explore Our 3 Campuses
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                to="/auth?mode=login"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition-colors"
              >
                CLC Member Log In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Campus Cards */}
      <section id="campuses" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex-1 w-full">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#DB3335]">Our Campuses</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1E1E1E] mt-1">
              Select a Campus to View Activity
            </h2>
          </div>
          <p className="text-sm text-[#54595F]">
            Click any campus card to view confirmed public events, venues, and posters.
          </p>
        </div>

        {campusesQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {campuses.map((campus) => (
              <Link
                key={campus.id}
                to={`/campus/${campus.code}`}
                className="group bg-white rounded-2xl overflow-hidden border border-neutral-200 shadow-sm hover:shadow-xl hover:border-[#DB3335] transition-all duration-300 flex flex-col"
              >
                <div className="relative h-56 overflow-hidden bg-[#1E1E1E]">
                  <img
                    src={campus.imageUrl}
                    alt={campus.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1E1E1E]/85 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-[#1E1E1E]/90 text-[#E9C00E] text-xs font-bold tracking-wider">
                      {campus.code}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-white/90 text-[#1E1E1E] text-xs font-semibold">
                      {campus.province}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <h3 className="text-xl font-bold text-white">{campus.name}</h3>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium text-[#54595F] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#DB3335] shrink-0" />
                      {campus.address}
                    </p>
                    <p className="text-sm text-[#3A3A3A] leading-relaxed">{campus.description}</p>
                  </div>

                  <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0170B9]">
                      <Calendar className="w-3.5 h-3.5" />
                      {campus.confirmedEventCount}{' '}
                      {campus.confirmedEventCount === 1 ? 'Confirmed Event' : 'Confirmed Events'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#DB3335] group-hover:translate-x-1 transition-transform">
                      View Activity
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-[#1E1E1E] text-neutral-400 text-xs py-6 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Belgium Campus iTversity — Campus Leadership Council (CLC)</p>
          <p>Pretoria · Kempton Park · Stellenbosch</p>
        </div>
      </footer>
    </div>
  );
}
