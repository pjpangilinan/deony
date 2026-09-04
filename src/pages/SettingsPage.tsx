import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/ui/useToast';
import { api } from '../services/api';
import { shareContent } from '../utils/share';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  
  const [publicProfile, setPublicProfile] = useState(false);
  const [searchIndexing, setSearchIndexing] = useState(true);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      api.get<any>('/users/me')
        .then(profile => {
          if (profile) {
            if (profile.display_name) setDisplayName(profile.display_name);
            if (profile.username) setUsername(profile.username);
            if (profile.bio) setBio(profile.bio);
            if (profile.profile_visibility) setPublicProfile(profile.profile_visibility === 'public');
          }
        })
        .catch(() => {
          setDisplayName(user.user_metadata?.display_name || user.username || '');
        });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      await api.patch('/users/me', {
        display_name: displayName,
        bio,
        profile_visibility: publicProfile ? 'public' : 'private',
      });
      showToast('Profile saved successfully', 'success');
    } catch (e) {
      showToast('Failed to save profile', 'error');
    }
  };

  const handleTogglePublicProfile = async () => {
    const nextVal = !publicProfile;
    setPublicProfile(nextVal);
    try {
      await api.patch('/users/me', {
        profile_visibility: nextVal ? 'public' : 'private',
      });
      showToast(nextVal ? 'Public profile enabled' : 'Profile visibility set to private', 'success');
    } catch {
      setPublicProfile(!nextVal);
      showToast('Failed to update privacy setting', 'error');
    }
  };

  const handleToggleSearchIndexing = async () => {
    const nextVal = !searchIndexing;
    setSearchIndexing(nextVal);
    try {
      await api.patch('/users/me', {
        search_indexing: nextVal,
      });
      showToast(nextVal ? 'Search engine indexing enabled' : 'Search engine indexing disabled', 'success');
    } catch {
      setSearchIndexing(!nextVal);
      showToast('Failed to update indexing setting', 'error');
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRequestExport = async () => {
    try {
      setIsExporting(true);
      const [profileRes, catRes, expRes] = await Promise.all([
        api.get<any>('/users/me').catch(() => null),
        api.get<{ items: any[] }>('/categories').catch(() => ({ items: [] })),
        api.get<{ items: any[] }>('/experiences').catch(() => ({ items: [] })),
      ]);

      const archiveData = {
        app: 'Deony',
        exported_at: new Date().toISOString(),
        user: profileRes || { username, display_name: displayName, bio },
        categories: catRes.items || [],
        experiences: expRes.items || [],
      };

      const blob = new Blob([JSON.stringify(archiveData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deony-archive-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Archive downloaded', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to export data', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (confirmUsername !== username) return;
    try {
      setIsDeleting(true);
      await api.delete('/users/me');
      showToast('Account deleted', 'success');
      signOut();
      navigate('/');
    } catch (e) {
      console.error(e);
      showToast('Failed to delete account', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShareProfile = async () => {
    if (!username) return;
    const profileUrl = `${window.location.origin}/u/${username}`;
    const res = await shareContent({
      title: `${displayName || username}'s Media Archive — Deony`,
      text: `Explore my curated media experiences and reflections on Deony:`,
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

  return (
    <div className="max-w-[800px] mx-auto px-gutter py-xl">
      <div className="mb-xl">
        <h1 className="font-display text-display-md text-primary mb-xs">
          Settings
        </h1>
        <p className="text-secondary font-body-md text-body-md">
          Manage your sanctuary preferences and personal details.
        </p>
      </div>

      {/* Profile Section */}
      <section className="mb-xl">
        <h2 className="font-headline-md text-headline-md text-primary mb-md border-b border-tertiary pb-xs">
          Profile
        </h2>
        
        <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg flex flex-col sm:flex-row gap-lg">
          <div className="shrink-0">
            <div className="w-[100px] h-[100px] rounded-full bg-surface-variant flex items-center justify-center overflow-hidden border border-tertiary">
              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${displayName || 'User'}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <div className="mb-md">
              <label className="block font-label-md text-label-md text-secondary mb-xs uppercase">
                DISPLAY NAME
              </label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full py-sm border-b border-tertiary focus:border-primary bg-transparent outline-none font-body-md text-body-md text-on-surface transition-colors"
                placeholder="Your display name"
              />
            </div>
            
            <div className="mb-md">
              <label className="block font-label-md text-label-md text-secondary mb-xs uppercase">
                USERNAME
              </label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full py-sm border-b border-tertiary focus:border-primary bg-transparent outline-none font-body-md text-body-md text-on-surface transition-colors"
                placeholder="@username"
              />
            </div>
            
            <div className="mb-lg">
              <label className="block font-label-md text-label-md text-secondary mb-xs uppercase">
                BIO
              </label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full py-sm border-b border-tertiary focus:border-primary bg-transparent outline-none resize-y font-body-md text-body-md text-on-surface transition-colors"
                placeholder="Tell us about yourself..."
              />
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={handleSaveProfile}
                className="bg-primary text-on-primary font-label-md text-label-md rounded-lg px-lg py-sm hover:opacity-90 transition-opacity"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Organization Section */}
      <section className="mb-xl">
        <h2 className="font-headline-md text-headline-md text-primary mb-md border-b border-tertiary pb-xs">
          Organization
        </h2>
        
        <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
          <div>
            <div className="font-body-lg text-body-lg text-on-surface mb-xs font-medium">Category Management</div>
            <div className="font-body-md text-body-md text-secondary max-w-[500px]">
              Create custom categories, assign icons, reorder collections, and customize your archive taxonomy.
            </div>
          </div>
          <Link
            to="/categories"
            className="flex items-center gap-xs bg-surface text-primary border border-tertiary font-label-md text-label-md px-lg py-sm rounded-lg hover:bg-surface-variant transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">category</span>
            Manage Categories
          </Link>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="mb-xl">
        <h2 className="font-headline-md text-headline-md text-primary mb-md border-b border-tertiary pb-xs">
          Privacy
        </h2>
        
        <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg flex flex-col gap-lg">
          <div className="flex justify-between items-center pb-lg border-b border-tertiary">
            <div>
              <div className="font-body-lg text-body-lg text-on-surface mb-xs" id="public-profile-label">Public Profile</div>
              <div className="font-body-md text-body-md text-secondary">Allow others to view your public entries and profile details.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={publicProfile} onChange={handleTogglePublicProfile} aria-labelledby="public-profile-label" />
              <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {publicProfile && username ? (
            <div className="p-md rounded-lg bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
              <div className="flex flex-col gap-xs">
                <span className="font-label-md text-label-md text-primary font-medium flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[18px]">public</span>
                  Public Profile Active
                </span>
                <span className="font-caption text-caption text-secondary">
                  Shareable link:{' '}
                  <code className="bg-surface-variant px-1.5 py-0.5 rounded text-primary text-[12px]">
                    {`${window.location.origin}/u/${username}`}
                  </code>
                </span>
              </div>
              <div className="flex items-center gap-xs w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleShareProfile}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-xs bg-primary text-on-primary font-label-md text-label-md px-md py-xs rounded-md hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">share</span>
                  Share Profile
                </button>
                <Link
                  to={`/u/${username}`}
                  target="_blank"
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-xs border border-tertiary text-on-surface-variant font-label-md text-label-md px-md py-xs rounded-md hover:bg-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  View
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-md rounded-lg bg-surface-variant/40 border border-tertiary/20 flex items-center gap-sm">
              <span className="material-symbols-outlined text-[18px] text-secondary">lock</span>
              <span className="font-body-md text-body-md text-secondary">
                Your profile is currently private. Enable Public Profile to share your personal archive link with others.
              </span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div>
              <div className="font-body-lg text-body-lg text-on-surface mb-xs" id="search-indexing-label">Search Engine Indexing</div>
              <div className="font-body-md text-body-md text-secondary">Allow search engines to find your public profile.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={searchIndexing} onChange={handleToggleSearchIndexing} aria-labelledby="search-indexing-label" />
              <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Account Section */}
      <section className="mb-xl">
        <h2 className="font-headline-md text-headline-md text-primary mb-md border-b border-tertiary pb-xs">
          Account
        </h2>
        
        <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg flex flex-col gap-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-lg border-b border-tertiary gap-md">
            <div>
              <div className="font-body-lg text-body-lg text-on-surface mb-xs">Export Data</div>
              <div className="font-body-md text-body-md text-secondary">Download a copy of all your journal entries and media.</div>
            </div>
            <button 
              onClick={handleRequestExport}
              disabled={isExporting}
              className="flex items-center gap-xs border border-tertiary text-on-surface-variant font-label-md text-label-md rounded-lg px-lg py-sm hover:bg-surface-variant transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isExporting ? 'sync' : 'download'}
              </span>
              {isExporting ? 'Exporting...' : 'Request Export'}
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
            <div>
              <div className="font-body-lg text-body-lg text-error mb-xs">Danger Zone</div>
              <div className="font-body-md text-body-md text-secondary">Permanently delete your account and all associated data.</div>
            </div>
            <button 
              onClick={() => {
                setConfirmUsername('');
                setIsDeleteModalOpen(true);
              }}
              className="flex items-center gap-xs border border-error text-error font-label-md text-label-md rounded-lg px-lg py-sm hover:bg-error hover:text-white transition-colors whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Delete Account
            </button>
          </div>
        </div>
      </section>

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-gutter">
          <div className="bg-surface rounded-xl border border-tertiary max-w-[480px] w-full p-xl shadow-xl animate-fade-in">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="font-headline-md text-headline-md text-error flex items-center gap-xs">
                <span className="material-symbols-outlined">warning</span>
                Delete Account
              </h2>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-secondary hover:text-primary transition-colors"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="font-body-md text-body-md text-on-surface mb-md">
              This action cannot be undone. All your categories, experiences, and personal journal thoughts will be permanently deleted.
            </p>

            <p className="font-body-md text-body-md text-secondary mb-md">
              Please type <span className="font-semibold text-on-surface">{username}</span> to confirm:
            </p>

            <input
              type="text"
              value={confirmUsername}
              onChange={(e) => setConfirmUsername(e.target.value)}
              placeholder={username}
              className="w-full py-sm px-xs border border-tertiary rounded-lg bg-surface-variant/40 outline-none font-body-md text-body-md text-on-surface mb-lg focus:border-error"
            />

            <div className="flex justify-end gap-md">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setConfirmUsername('');
                }}
                className="px-lg py-sm rounded-lg border border-tertiary text-on-surface-variant font-label-md text-label-md hover:bg-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmUsername !== username || isDeleting}
                onClick={handleConfirmDeleteAccount}
                className="px-lg py-sm rounded-lg bg-error text-white font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
