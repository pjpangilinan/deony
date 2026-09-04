import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/library');
    }
  }, [user, navigate]);
  return (
    <div className="min-h-screen flex flex-col font-body-md text-body-md bg-background overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
      {/* TopAppBar - Sticky with subtle backdrop blur & smooth transitions */}
      <header className="w-full top-0 sticky z-50 bg-background/85 backdrop-blur-md border-b border-tertiary/15 transition-all duration-300">
        <div className="flex justify-between items-center px-gutter max-w-[1100px] mx-auto h-14 sm:h-16">
          {/* Brand */}
          <Link 
            className="font-display text-[26px] sm:text-[28px] text-primary tracking-tight hover:opacity-85 transition-opacity duration-200" 
            to="/"
          >
            Deony
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex gap-lg items-center">
            <a 
              className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 cursor-pointer" 
              href="#features"
            >
              Features
            </a>
            <a 
              className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 cursor-pointer" 
              href="#philosophy"
            >
              Philosophy
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-sm sm:gap-md">
            <Link 
              className="font-label-md text-label-md text-primary hover:text-primary/70 px-sm py-xs transition-colors duration-200" 
              to="/auth"
            >
              Sign In
            </Link>
            <Link 
              className="font-label-md text-label-md bg-primary text-on-primary px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:bg-on-primary-fixed-variant hover:-translate-y-0.5 active:translate-y-0" 
              to="/auth"
            >
              Start Archive
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content - Tightened vertical cadence */}
      <main className="flex-grow w-full max-w-[1100px] mx-auto px-gutter py-md sm:py-lg space-y-lg sm:space-y-xl">
        {/* Hero Section - Tightened & Elevated with Smooth Fade-in */}
        <section className="flex flex-col items-center text-center pt-md sm:pt-lg pb-xs max-w-3xl mx-auto">
          <h1 className="font-display text-[2.25rem] sm:text-[3rem] md:text-[3.5rem] text-primary leading-[1.12] tracking-tight">
            Your life, indexed through the art you love.
          </h1>
          <p className="font-body-md sm:font-body-lg text-body-md sm:text-body-lg text-secondary max-w-[38rem] mt-sm sm:mt-md leading-relaxed">
            A digital sanctuary for your media consumption. Forget social pressure and fleeting metrics. Build a permanent, personal archive of the films, books, and music that shape your perspective.
          </p>
          <div className="flex flex-col sm:flex-row gap-xs sm:gap-sm mt-md sm:mt-lg w-full sm:w-auto">
            <Link 
              className="bg-primary text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 text-center" 
              to="/auth"
            >
              Start your archive
            </Link>
            <a 
              className="border border-tertiary/35 text-primary font-label-md text-label-md px-lg py-sm rounded-lg hover:bg-surface-variant/70 hover:border-primary hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 text-center" 
              href="#philosophy"
            >
              Read our philosophy
            </a>
          </div>
        </section>

        {/* Visual Teaser (Timeline) - Tightened & Smoothly Interactive */}
        <section className="w-full py-md sm:py-lg px-md sm:px-lg border border-tertiary/20 relative overflow-hidden bg-surface-container-lowest/70 rounded-2xl shadow-xs transition-all duration-300">
          <div 
            className="absolute inset-0 opacity-5 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(#3d3c39 1px, transparent 1px)', 
              backgroundSize: '20px 20px' 
            }}
          />
          <div className="relative z-10 w-full">
            <div className="flex items-end justify-between mb-sm sm:mb-md border-b border-tertiary/15 pb-xs">
              <h2 className="font-headline-md text-[20px] sm:text-headline-md text-primary font-medium">Recent Entries</h2>
              <span className="font-label-md text-label-md text-secondary uppercase tracking-widest text-[11px] sm:text-[12px]">2024 Archive</span>
            </div>
            {/* Horizontal scroll container */}
            <div className="flex gap-md overflow-x-auto timeline-scroll pb-xs items-start pt-xs">
              {/* Entry 1 */}
              <div className="flex-shrink-0 w-60 group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1">
                <div className="relative h-36 w-full mb-xs bg-surface-variant rounded-lg border border-tertiary/20 overflow-hidden shadow-xs group-hover:shadow-md transition-shadow">
                  <img 
                    className="w-full h-full object-cover grayscale opacity-85 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjFDEMc6abDK8gxuBEdp5n6k5jOwxk7C6tc74k-SWECebgm4OhdKk-ygCNkHyKWCul8GF54CNHMATxhnAfjMV64OFrflJG9D7fK52Ib0mK-rk4xBa9mOZmC8_qZlusMvGAfue--cYup20AHepmAitO6JvsEp0iDGVv1zuKuurE4TEC4NpIiPGNX23I5CYTCUHlV6pmVMiidkiPItj5dXeTho2_WblfsufVOVzzLeYwDt2Ij_nJcUVE" 
                    alt="La Dolce Vita"
                  />
                  <div className="absolute top-2 left-2 bg-background/90 px-1.5 py-0.5 rounded border border-tertiary/25 backdrop-blur-xs">
                    <span className="material-symbols-outlined text-[13px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>movie</span>
                  </div>
                </div>
                <div className="flex flex-col gap-xs px-0.5">
                  <span className="font-caption text-[11px] text-secondary">Oct 12 · Film</span>
                  <h3 className="font-headline-md text-body-md text-primary leading-snug group-hover:text-primary-container transition-colors">La Dolce Vita</h3>
                  <p className="font-caption text-[11px] text-on-surface-variant border-l-2 border-primary/70 pl-2 leading-tight">An exploration of emptiness masked by excess.</p>
                </div>
              </div>

              {/* Entry 2 */}
              <div className="flex-shrink-0 w-60 group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 mt-sm">
                <div className="relative h-36 w-full mb-xs bg-surface-variant rounded-lg border border-tertiary/20 overflow-hidden shadow-xs group-hover:shadow-md transition-shadow">
                  <img 
                    className="w-full h-full object-cover grayscale opacity-85 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQByCdVvoWZGjIdUxs2RsJnWYivEmPK0EUzubRDSncZQ3XRk-xNyX0fCmsrl50KumG94UM1ppW6eWppIsXwYi5rxaGOwNZxPJ0ShB8H0Eak3o80gXW17biy_X3DH-tQKpxRw98UWWf-RYCHw2SKWz_RwYVKjOjI_lsEVBQoF8YmEznQuQ5eqse5o6-VfueTTcYDb5Qmvrzk3cIbja7ikSXIxjeWMHyxVObegpAyVrnTlhYhqTk3ReK" 
                    alt="The Unbearable Lightness of Being"
                  />
                  <div className="absolute top-2 left-2 bg-background/90 px-1.5 py-0.5 rounded border border-tertiary/25 backdrop-blur-xs">
                    <span className="material-symbols-outlined text-[13px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                  </div>
                </div>
                <div className="flex flex-col gap-xs px-0.5">
                  <span className="font-caption text-[11px] text-secondary">Oct 10 · Book</span>
                  <h3 className="font-headline-md text-body-md text-primary leading-snug group-hover:text-primary-container transition-colors">The Unbearable Lightness of Being</h3>
                  <p className="font-caption text-[11px] text-on-surface-variant border-l-2 border-primary/70 pl-2 leading-tight">The dichotomy of weight and lightness.</p>
                </div>
              </div>

              {/* Entry 3 */}
              <div className="flex-shrink-0 w-60 group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1">
                <div className="relative h-36 w-full mb-xs bg-surface-variant rounded-lg border border-tertiary/20 overflow-hidden shadow-xs group-hover:shadow-md transition-shadow">
                  <img 
                    className="w-full h-full object-cover grayscale opacity-85 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAetEPZW43k1oJsFnkVpVgBAKTab7XplzRYdkZ05nAd0VEVU9Rgvpnf2GSiyTyRultXswlZd1sg_FoGPCzQu4rFwyx8iOAnBwV4iomHWHEMxBjaOewR168jUKtdIKd1PKSVX7tKzWadiAWnH4MxH4ijWXx53jFfTOIwWMMlllU1IHdqEl4TV-jZliYYoTYLvvtDEZr8UVIykZWcNUMM-JaiAbdKzVuXtTBFBnR8NsBkjwTVHXOHaO2l" 
                    alt="Promises"
                  />
                  <div className="absolute top-2 left-2 bg-background/90 px-1.5 py-0.5 rounded border border-tertiary/25 backdrop-blur-xs">
                    <span className="material-symbols-outlined text-[13px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>album</span>
                  </div>
                </div>
                <div className="flex flex-col gap-xs px-0.5">
                  <span className="font-caption text-[11px] text-secondary">Oct 05 · Album</span>
                  <h3 className="font-headline-md text-body-md text-primary leading-snug group-hover:text-primary-container transition-colors">Promises</h3>
                  <p className="font-caption text-[11px] text-on-surface-variant border-l-2 border-primary/70 pl-2 leading-tight">A meditative space. Pure texture and tension.</p>
                </div>
              </div>

              {/* Entry 4: Add Entry */}
              <Link to="/auth" className="flex-shrink-0 w-60 group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1">
                <div className="h-36 w-full mb-xs border-2 border-dashed border-tertiary/30 rounded-lg flex flex-col items-center justify-center hover:border-primary/60 hover:bg-primary/5 transition-all duration-200">
                  <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors text-[24px] mb-1">add_circle</span>
                  <span className="font-label-md text-label-md text-secondary group-hover:text-primary transition-colors">Add Entry</span>
                </div>
                <div className="flex flex-col gap-xs px-0.5">
                  <span className="font-caption text-[11px] text-secondary/70">Your Archive</span>
                  <span className="font-body-md text-body-md text-secondary/80">Begin recording</span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Value Props (Bento grid) - Tightened & Elevated */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-md sm:gap-lg py-xs" id="features">
          {/* Cell 1: Wide */}
          <div className="md:col-span-8 bg-surface border border-tertiary/20 rounded-xl p-lg sm:p-xl flex flex-col justify-between group hover:border-primary/40 hover:bg-surface-container-low hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div>
              <span className="material-symbols-outlined text-primary text-[28px] sm:text-[32px] mb-sm block group-hover:scale-110 transition-transform duration-200">
                inventory_2
              </span>
              <h3 className="font-headline-md text-[20px] sm:text-headline-md text-primary mb-xs">
                Archive over Track
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-[34rem] leading-relaxed">
                We don't care how many movies you watched this year. Deony is built for journaling, reflection, and capturing how a piece of media made you feel, not just ticking a box.
              </p>
            </div>
          </div>

          {/* Cell 2: Tall */}
          <div className="md:col-span-4 bg-surface-container-lowest border border-tertiary/20 rounded-xl p-lg sm:p-xl flex flex-col justify-between group hover:border-primary/40 hover:bg-surface-container-low hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-15 transition-opacity">
              <span className="material-symbols-outlined text-[100px] text-primary">vpn_lock</span>
            </div>
            <div className="relative z-10">
              <span className="material-symbols-outlined text-primary text-[28px] sm:text-[32px] mb-sm block group-hover:scale-110 transition-transform duration-200">
                person
              </span>
              <h3 className="font-headline-md text-[20px] sm:text-headline-md text-primary mb-xs">
                Personal over Social
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                No followers. No likes. No algorithmic feeds. Your archive is a private sanctuary for your own introspection.
              </p>
            </div>
          </div>

          {/* Cell 3: Standard (Philosophy) */}
          <div className="md:col-span-12 bg-primary-container/10 border border-tertiary/20 rounded-xl p-lg sm:p-xl flex flex-col md:flex-row items-center gap-md sm:gap-xl justify-between group hover:border-primary/40 hover:shadow-md transition-all duration-300" id="philosophy">
            <div className="md:w-1/2">
              <span className="material-symbols-outlined text-primary text-[28px] sm:text-[32px] mb-sm block group-hover:scale-110 transition-transform duration-200">
                tune
              </span>
              <h3 className="font-headline-md text-[20px] sm:text-headline-md text-primary mb-xs">
                Flexible over Rigid
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Define your own categories, tags, and rating systems. Or use none at all. Deony adapts to how you think, providing a fluid structure for your unorganized thoughts.
              </p>
            </div>
            <div className="md:w-1/2 w-full h-36 sm:h-44 bg-background border border-tertiary/25 rounded-lg p-md flex items-center justify-center relative shadow-[3px_3px_0_0_#3d3c39] group-hover:shadow-[5px_5px_0_0_#114349] transition-all duration-300">
              <div className="flex flex-wrap gap-xs sm:gap-sm justify-center">
                <span className="px-3 py-1 border border-primary text-primary font-caption text-caption rounded-full hover:scale-105 transition-transform cursor-default">
                  #neo-noir
                </span>
                <span className="px-3 py-1 bg-surface-variant text-secondary font-caption text-caption rounded-full hover:scale-105 transition-transform cursor-default">
                  Must Revisit
                </span>
                <span className="px-3 py-1 border border-outline/50 text-secondary font-caption text-caption rounded-full hover:scale-105 transition-transform cursor-default">
                  Existential
                </span>
                <span className="px-3 py-1 bg-primary text-on-primary font-caption text-caption rounded-full hover:scale-105 transition-transform cursor-default">
                  5 Stars
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Tightened */}
      <footer className="w-full py-md sm:py-lg border-t border-tertiary/20 bg-background mt-lg">
        <div className="max-w-[1100px] mx-auto px-gutter flex flex-col md:flex-row justify-between items-center gap-sm">
          <Link className="font-display text-label-md text-primary hover:opacity-80 transition-opacity" to="/">
            Deony
          </Link>
          <div className="font-caption text-caption text-secondary">
            © {new Date().getFullYear()} Deony Archive. Introspection through permanence.
          </div>
          <nav className="flex gap-md">
            <a className="font-caption text-caption text-secondary hover:text-primary transition-colors" href="#features">Privacy</a>
            <a className="font-caption text-caption text-secondary hover:text-primary transition-colors" href="#philosophy">Manifesto</a>
            <Link className="font-caption text-caption text-secondary hover:text-primary transition-colors" to="/auth">Start Archive</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
