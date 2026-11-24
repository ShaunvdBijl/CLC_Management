import { Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, LayoutDashboard, UserPlus } from 'lucide-react';
import { useAuth } from '../lib/authContext';

const BC_ICON = 'https://www.belgiumcampus.ac.za/wp-content/uploads/2021/01/BC-Icon.png';

export function PublicNavbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-[#1E1E1E] text-white shadow-md">
      <div className="bc-tricolour-bar" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src={BC_ICON}
            alt="Belgium Campus iTversity"
            className="w-9 h-9 rounded-md object-contain bg-white p-0.5"
          />
          <div>
            <p className="font-bold tracking-tight text-sm sm:text-base leading-tight text-white group-hover:text-[#E9C00E] transition-colors">
              Belgium Campus <span className="text-[#DB3335]">iTversity</span>
            </p>
            <p className="text-[11px] text-neutral-400 tracking-wide uppercase">
              Campus Leadership Council
            </p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-300">
          <Link to="/campus/PTA" className="hover:text-[#E9C00E] transition-colors">
            Pretoria
          </Link>
          <Link to="/campus/KMP" className="hover:text-[#E9C00E] transition-colors">
            Kempton Park
          </Link>
          <Link to="/campus/STB" className="hover:text-[#E9C00E] transition-colors">
            Stellenbosch
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#DB3335] hover:bg-[#B52325] text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>CLC Portal ({user?.role})</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-600 hover:border-neutral-400 text-neutral-200 text-xs sm:text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth?mode=login"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-500 hover:border-[#E9C00E] hover:text-[#E9C00E] text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </Link>
              <Link
                to="/auth?mode=signup"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#DB3335] hover:bg-[#B52325] text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Sign Up</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
