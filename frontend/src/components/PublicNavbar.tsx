import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogIn, LogOut, UserPlus } from 'lucide-react';
import { useAuth } from '../lib/authContext';

const BC_ICON = 'https://www.belgiumcampus.ac.za/wp-content/uploads/2021/01/BC-Icon.png';

const CAMPUS_LINKS = [
  { code: 'PTA', label: 'Pretoria' },
  { code: 'KMP', label: 'Kempton Park' },
  { code: 'STB', label: 'Stellenbosch' },
];

export function PublicNavbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-[#141414]/92 backdrop-blur-md text-white border-b border-white/10">
      <div className="bc-tricolour-bar" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-white p-1 shadow-sm ring-1 ring-white/20 group-hover:ring-[#E9C00E] transition-all">
            <img src={BC_ICON} alt="Belgium Campus iTversity" className="w-full h-full object-contain" />
          </div>
          <div className="leading-none">
            <p className="font-extrabold tracking-tight text-sm sm:text-base text-white">
              Belgium Campus <span className="text-[#DB3335]">iTversity</span>
            </p>
            <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.18em] mt-1">
              CLC · Student Leadership
            </p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
          {CAMPUS_LINKS.map((item) => {
            const active = location.pathname.toUpperCase() === `/CAMPUS/${item.code}`;
            return (
              <Link
                key={item.code}
                to={`/campus/${item.code}`}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#DB3335] text-white shadow-sm'
                    : 'text-neutral-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#DB3335] hover:bg-[#B52325] text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-[#DB3335]/20"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Portal</span>
                <span className="hidden sm:inline font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/25 text-[#E9C00E]">
                  {user?.role}
                </span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/15 hover:border-white/40 text-neutral-300 hover:text-white text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth?mode=login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/20 hover:border-[#E9C00E] hover:text-[#E9C00E] text-white text-xs sm:text-sm font-semibold transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </Link>
              <Link
                to="/auth?mode=signup"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#DB3335] hover:bg-[#B52325] text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-[#DB3335]/25"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
