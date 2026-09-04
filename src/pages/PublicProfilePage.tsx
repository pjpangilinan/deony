import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../providers/AuthProvider';
import { SkeletonCard, EmptyState } from '../components/ui';
import { useToast } from '../components/ui/useToast';
import { formatRating5 } from '../utils/rating';
import { shareContent } from '../utils/share';

type PublicExperience = {
  id: string;
  media_id?: string;
  media_title: string;
  media_type: string;
  status: string;
  rating?: number | null;
  sort_date?: string;
  thoughts?: string;
  created_at: string;
  cover_image?: string | null;
};

type UserProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  profile_visibility: 'public' | 'private';
  avatar_url?: string | null;
  created_at?: string;
  entries_count: number;
  experiences?: PublicExperience[];
};

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedExp, setSelectedExp] = useState<PublicExperience | null>(null);
  const { showToast } = useToast();

  const handleShareProfile = async () => {
    if (!profile) return;
    const name = profile.display_name || profile.username;
    const profileUrl = `${window.location.origin}/u/${profile.username}`;
    const res = await shareContent({
      title: `${name}'s Media Archive — Deony`,
      text: `Explore ${name}'s personal media archive on Deony:`,
      url: profileUrl,
    });

    if (res === 'shared') {
      showToast('Profile shared!', 'success');
    } else if (res === 'copied') {
      showToast('Profile link copied to clipboard!', 'success');
    } else {
      showToast('Failed to copy link', 'error');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (profile) {
      const name = profile.display_name || profile.username;
      document.title = `${name}'s Archive — Deony`;

      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute(
        'content',
        profile.bio || `Explore ${name}'s curated media collection and reflections on Deony.`
      );
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get<UserProfile>(`/users/username/${username}`);
      setProfile(res);
    } catch (err: unknown) {
      console.error(err);
      setError('This user profile could not be found.');
    } finally {
      setLoading(false);
    }
  };

  const stripHtml = (html?: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').trim();
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Public Header */}
      <header className="flex justify-between items-center px-gutter md:px-margin-desktop py-md border-b border-tertiary bg-surface sticky top-0 z-40">
        <Link to="/" className="font-display text-headline-md text-primary tracking-tight">
          Deony
        </Link>
        <div className="flex items-center gap-md font-label-md text-label-md">
          {isAuthenticated ? (
            <Link
              to="/home"
              className="inline-flex items-center gap-xs text-primary hover:bg-primary-container/10 px-md py-xs rounded-md transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-secondary hover:text-primary px-sm py-xs transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="bg-primary text-white hover:bg-primary/90 px-md py-xs rounded-md transition-colors"
              >
                Join Deony
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="max-w-[1100px] w-full mx-auto px-gutter py-xl flex-1 flex flex-col">
        {loading ? (
          <div className="animate-pulse space-y-xl">
            <div className="flex flex-col md:flex-row gap-xl items-center md:items-start">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-surface-variant shrink-0 border border-tertiary" />
              <div className="flex-1 w-full space-y-sm text-center md:text-left">
                <div className="h-8 bg-surface-variant w-48 mx-auto md:mx-0 rounded" />
                <div className="h-4 bg-surface-variant w-32 mx-auto md:mx-0 rounded" />
                <div className="h-12 bg-surface-variant w-full max-w-lg mx-auto md:mx-0 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-md">
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonCard key={i} aspectRatio="poster" />
              ))}
            </div>
          </div>
        ) : error ? (
          <EmptyState
            icon="person_off"
            title="Profile Unavailable"
            description={error}
            primaryAction={{
              label: 'Return Home',
              onClick: () => navigate('/'),
              icon: 'home',
            }}
          />
        ) : profile?.profile_visibility === 'private' ? (
          <EmptyState
            icon="lock"
            title="This archive is private"
            description="The owner of this collection has set their profile visibility to private."
            primaryAction={{
              label: 'Explore Deony',
              onClick: () => navigate('/'),
              icon: 'home',
            }}
          />
        ) : (
          <>
            {/* Profile Info Header */}
            <div className="flex flex-col md:flex-row gap-xl items-center md:items-start mb-xl pb-xl border-b border-tertiary/30 text-center md:text-left">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border border-tertiary bg-surface-variant shrink-0 shadow-sm">
                <img
                  src={profile?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile?.display_name || username}`}
                  alt={profile?.display_name || username}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 w-full">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-sm mb-xs">
                  <div>
                    <h1 className="font-display text-display-sm text-primary mb-xs">
                      {profile?.display_name || profile?.username}
                    </h1>
                    <p className="font-label-md text-secondary mb-sm">@{profile?.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleShareProfile}
                    className="inline-flex items-center gap-xs bg-primary text-on-primary font-label-md text-label-md px-md py-1.5 rounded-lg hover:bg-primary/90 transition-all hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 cursor-pointer mb-sm sm:mb-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">share</span>
                    Share Profile
                  </button>
                </div>

                {profile?.bio && (
                  <p className="text-on-surface font-body-md max-w-[640px] mb-md leading-relaxed mx-auto md:mx-0">
                    {profile.bio}
                  </p>
                )}

                <div className="flex flex-wrap justify-center md:justify-start items-center gap-md font-caption text-secondary">
                  <span>
                    <strong className="text-on-surface font-medium">
                      {profile?.entries_count || 0}
                    </strong>{' '}
                    Experiences Logged
                  </span>
                  {profile?.created_at && (
                    <>
                      <span>•</span>
                      <span>
                        Archiving since{' '}
                        {new Date(profile.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Public Shelves */}
            <div className="flex items-center justify-between mb-lg">
              <h2 className="font-headline-md text-headline-md text-primary">Public Archive</h2>
            </div>

            {!profile?.experiences || profile.experiences.length === 0 ? (
              <EmptyState
                icon="shelves"
                title="This archive is empty"
                description="No public media experiences have been logged yet."
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-md gap-y-xl">
                {profile.experiences.map((exp) => (
                  <article
                    key={exp.id}
                    onClick={() => setSelectedExp(exp)}
                    className="group flex flex-col cursor-pointer"
                  >
                    <div className="aspect-[2/3] w-full overflow-hidden rounded-md border border-tertiary/10 bg-surface-variant relative mb-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
                      {exp.cover_image ? (
                        <img
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                          src={exp.cover_image}
                          alt={exp.media_title}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-tertiary">
                          <span className="material-symbols-outlined text-[40px] opacity-25">
                            perm_media
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-body-md font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                      {exp.media_title}
                    </h3>

                    <div className="flex items-center gap-xs mt-xs text-secondary font-caption">
                      {exp.rating !== undefined && exp.rating !== null ? (
                        <>
                          <span
                            className="material-symbols-outlined text-[14px] text-primary/80"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          <span>{formatRating5(exp.rating)}</span>
                          <span>•</span>
                        </>
                      ) : (
                        <>
                          <span className="italic">Unrated</span>
                          <span>•</span>
                        </>
                      )}
                      <span className="capitalize truncate">{exp.media_type || 'Media'}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Public Experience Details Modal (Read-Only) */}
      {selectedExp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-gutter animate-fade-in">
          <div className="bg-surface rounded-xl border border-tertiary max-w-[540px] w-full p-xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-md">
              <div>
                <span className="font-caption text-secondary uppercase tracking-wider text-[11px]">
                  {selectedExp.media_type}
                </span>
                <h3 className="font-headline-md text-headline-md text-primary mt-xs">
                  {selectedExp.media_title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExp(null)}
                className="text-secondary hover:text-primary transition-colors p-xs"
                aria-label="Close details"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex items-center gap-md mb-lg font-caption text-secondary">
              {selectedExp.rating !== undefined && selectedExp.rating !== null && (
                <span className="flex items-center gap-xs">
                  <span
                    className="material-symbols-outlined text-[16px] text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  <strong className="text-on-surface">{formatRating5(selectedExp.rating)} / 5</strong>
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant font-label-md text-[11px]">
                {selectedExp.status}
              </span>
            </div>

            {selectedExp.thoughts && (
              <div className="border-t border-tertiary/40 pt-md mt-md">
                <h4 className="font-label-md text-secondary mb-xs">Reflections & Thoughts</h4>
                <p className="font-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
                  {stripHtml(selectedExp.thoughts)}
                </p>
              </div>
            )}

            <div className="mt-xl pt-md border-t border-tertiary/30 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedExp(null)}
                className="font-label-md text-label-md bg-surface-variant text-on-surface-variant hover:bg-surface-container px-lg py-sm rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
