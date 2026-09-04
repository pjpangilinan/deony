import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';

export function AppLayout() {
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const closeMenu = () => setIsMobileMenuOpen(false);

  const handleSignOut = () => {
    signOut();
    closeMenu();
    navigate('/');
  };

  const isPublicRoute = location.pathname === '/' || location.pathname === '/auth' || location.pathname === '/onboarding' || location.pathname === '/404' || location.pathname.startsWith('/u/') || location.pathname.startsWith('/profile/');

  if (isPublicRoute || !user) {
    return <Outlet />; // Public pages or unauthenticated visitors handle their own layout
  }

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex selection:bg-primary-container selection:text-on-primary-container">
      {/* SideNavBar (Hidden on Mobile) */}
      <nav className="hidden md:flex h-screen w-64 fixed left-0 top-0 border-r border-tertiary bg-surface flex-col py-xl px-md space-y-md z-50">
        <div className="mb-xl px-sm">
          <h1 className="font-display text-headline-md text-primary tracking-tight">Deony</h1>
          <p className="font-caption text-caption text-secondary mt-xs">Digital Sanctuary</p>
        </div>
        
        <ul className="flex-1 space-y-sm w-full">
          <li>
            <Link to="/library" className={`flex items-center gap-md px-md py-sm rounded-lg transition-all group ${location.pathname.startsWith('/library') || location.pathname === '/stats' ? 'text-primary font-bold bg-primary-container/10' : 'text-secondary hover:bg-primary-container/10 hover:text-primary'}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname.startsWith('/library') || location.pathname === '/stats' ? "'FILL' 1" : "'FILL' 0" }}>perm_media</span>
              <span className="font-label-md text-label-md">Library</span>
            </Link>
          </li>
          <li>
            <Link to="/timeline" className={`flex items-center gap-md px-md py-sm rounded-lg transition-all group ${location.pathname === '/timeline' ? 'text-primary font-bold bg-primary-container/10' : 'text-secondary hover:bg-primary-container/10 hover:text-primary'}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/timeline' ? "'FILL' 1" : "'FILL' 0" }}>history</span>
              <span className="font-label-md text-label-md">Timeline</span>
            </Link>
          </li>
          <li>
            <Link to="/settings" className={`flex items-center gap-md px-md py-sm rounded-lg transition-all group ${location.pathname === '/settings' || location.pathname === '/categories' ? 'text-primary font-bold bg-primary-container/10' : 'text-secondary hover:bg-primary-container/10 hover:text-primary'}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/settings' || location.pathname === '/categories' ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
              <span className="font-label-md text-label-md">Settings</span>
            </Link>
          </li>
          <li>
            <button onClick={handleSignOut} className="flex w-full items-center gap-md px-md py-sm rounded-lg text-secondary hover:bg-error-container hover:text-error transition-all group cursor-pointer">
              <span className="material-symbols-outlined">logout</span>
              <span className="font-label-md text-label-md">Sign Out</span>
            </button>
          </li>
        </ul>
        
        <div className="mt-auto px-sm pt-xl border-t border-tertiary">
          <Link to="/log" className="w-full bg-primary text-on-primary font-label-md text-label-md py-md rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-colors duration-200 flex items-center justify-center gap-sm">
            <span className="material-symbols-outlined">add</span>
            New Entry
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 w-full">
        {/* TopAppBar (Mobile Only) */}
        <header className="md:hidden w-full sticky top-0 bg-background/90 backdrop-blur-md z-40 border-b border-tertiary flex justify-between items-center px-gutter h-16">
          <h1 className="font-display text-headline-md text-primary tracking-tight">Deony</h1>
          <button className="text-primary hover:opacity-70 transition-opacity" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <span className="material-symbols-outlined">menu</span>
          </button>
        </header>

        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col p-lg">
            <div className="flex justify-between items-center mb-xl">
              <h1 className="font-display text-headline-md text-primary tracking-tight">Deony</h1>
              <button className="text-primary hover:opacity-70 transition-opacity" onClick={closeMenu}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <ul className="space-y-md">
              <li><Link to="/library" onClick={closeMenu} className="text-headline-md font-headline-md">Library</Link></li>
              <li><Link to="/timeline" onClick={closeMenu} className="text-headline-md font-headline-md">Timeline</Link></li>
              <li><Link to="/settings" onClick={closeMenu} className="text-headline-md font-headline-md">Settings</Link></li>
              <li><Link to="/log" onClick={closeMenu} className="text-headline-md font-headline-md text-primary">+ New Entry</Link></li>
              <li><button onClick={handleSignOut} className="text-headline-md font-headline-md text-error">Sign Out</button></li>
            </ul>
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
}
