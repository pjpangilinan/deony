import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/ui/useToast';
import { api } from '../services/api';
import { shareContent } from '../utils/share';
import { SkeletonRow, EmptyState } from '../components/ui';
import { compressImage } from '../utils/imageCompressor';

interface Category {
  id: string;
  name: string;
  media_type: string;
  sort_order: number;
  is_builtin: boolean;
  icon?: string;
  count?: number;
}

const AVAILABLE_ICONS = [
  'movie',
  'tv',
  'menu_book',
  'sports_esports',
  'album',
  'podcasts',
  'article',
  'bookmark',
  'favorite',
  'folder',
];

const MEDIA_TYPES = [
  { value: 'movie', label: 'Movie' },
  { value: 'tv', label: 'TV Show' },
  { value: 'book', label: 'Book' },
  { value: 'game', label: 'Video Game' },
  { value: 'music', label: 'Music / Album' },
  { value: 'other', label: 'Other' },
];

export const PRESET_AVATARS = [
  { id: 'cinephile', label: 'Cinephile', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Cinephile' },
  { id: 'bookworm', label: 'Bookworm', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Bibliophile' },
  { id: 'gamer', label: 'Retro Gamer', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Gamer' },
  { id: 'audiophile', label: 'Vinyl Collector', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Audiophile' },
  { id: 'curator', label: 'Curator', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Curator' },
  { id: 'midnight', label: 'Midnight Reader', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Midnight' },
  { id: 'director', label: 'Director', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Director' },
  { id: 'archivist', label: 'Archivist', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Archivist' },
  { id: 'pixelbot', label: 'Pixel Bot', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=PixelBot' },
  { id: 'synth', label: 'Retro Synth', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Synth' },
  { id: 'cozy', label: 'Cozy Reader', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Cozy' },
  { id: 'explorer', label: 'Explorer', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Wanderer' },
  { id: 'stargazer', label: 'Stargazer', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Stargazer' },
  { id: 'novelist', label: 'Novelist', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Novelist' },
  { id: 'scholar', label: 'Scholar', url: 'https://api.dicebear.com/7.x/thumbs/svg?seed=Scholar' },
  { id: 'botanist', label: 'Botanist', url: 'https://api.dicebear.com/7.x/thumbs/svg?seed=Botanist' },
];

interface SettingsPageProps {
  initialTab?: string;
}

export function SettingsPage({ initialTab }: SettingsPageProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  // Profile State
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [publicProfile, setPublicProfile] = useState(false);
  const [searchIndexing, setSearchIndexing] = useState(true);

  // Avatar Picker & Upload State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatMediaType, setNewCatMediaType] = useState('movie');
  const [newCatIcon, setNewCatIcon] = useState('movie');
  const [isCatSubmitting, setIsCatSubmitting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Category Management & Edit Modal State
  const [isManageCatModalOpen, setIsManageCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('movie');
  const [isEditCatSubmitting, setIsEditCatSubmitting] = useState(false);

  // Account State
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      api.get<any>('/users/me')
        .then(profile => {
          if (profile) {
            if (profile.display_name) setDisplayName(profile.display_name);
            if (profile.username) setUsername(profile.username);
            if (profile.bio) setBio(profile.bio);
            if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
            if (profile.profile_visibility) setPublicProfile(profile.profile_visibility === 'public');
            if (profile.search_indexing !== undefined) setSearchIndexing(profile.search_indexing);
          }
        })
        .catch(() => {
          setDisplayName(user.user_metadata?.display_name || user.username || '');
        });
    }
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto scroll to section if tab or initialTab is passed
  useEffect(() => {
    const target = initialTab || searchParams.get('tab');
    if (target === 'categories') {
      const el = document.getElementById('settings-categories');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [initialTab, searchParams]);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await api.get<{ items: Category[] }>('/categories');
      const sorted = (res.items || []).sort((a, b) => a.sort_order - b.sort_order);
      setCategories(sorted);
    } catch (err) {
      console.error(err);
      showToast('Failed to load categories', 'error');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const getCategoryIcon = (cat: Category) => {
    if (cat.icon) return cat.icon;
    switch (cat.media_type) {
      case 'book':
      case 'books': return 'menu_book';
      case 'movie':
      case 'movies': return 'movie';
      case 'tv': return 'tv';
      case 'music':
      case 'albums': return 'album';
      case 'game':
      case 'games': return 'sports_esports';
      case 'podcasts': return 'podcasts';
      default: return 'folder';
    }
  };

  const handleOpenCatModal = () => {
    setNewCatName('');
    setNewCatMediaType('movie');
    setNewCatIcon('movie');
    setIsCategoryModalOpen(true);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      setIsCatSubmitting(true);
      await api.post('/categories', {
        name: newCatName.trim(),
        media_type: newCatMediaType,
        icon: newCatIcon,
        sort_order: categories.length,
        is_builtin: false,
      });
      showToast('Category created', 'success');
      setIsCategoryModalOpen(false);
      await fetchCategories();
    } catch (err) {
      console.error(err);
      showToast('Failed to create category', 'error');
    } finally {
      setIsCatSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (cat.is_builtin) {
      showToast('Cannot delete built-in category', 'error');
      return;
    }

    const confirmMsg = cat.count && cat.count > 0
      ? `Delete "${cat.name}"? This category currently has ${cat.count} item(s).`
      : `Are you sure you want to delete "${cat.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/categories/${cat.id}`);
      showToast('Category deleted', 'success');
      setCategories(prev => prev.filter(c => c.id !== cat.id));
    } catch (err) {
      console.error(err);
      showToast('Failed to delete category', 'error');
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const reordered = [...categories];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const updated = reordered.map((cat, idx) => ({
      ...cat,
      sort_order: idx,
    }));

    setCategories(updated);
    setDraggedIndex(null);

    try {
      await Promise.all(
        updated.map(cat =>
          api.patch(`/categories/${cat.id}`, { sort_order: cat.sort_order })
        )
      );
    } catch (err) {
      console.error('Failed to save category order', err);
      showToast('Failed to save category order', 'error');
    }
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Only image files (JPEG, PNG, WebP, GIF) are allowed', 'error');
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image file must be under 10MB', 'error');
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const compressedDataUrl = await compressImage(file, 400, 0.85);
      setAvatarUrl(compressedDataUrl);
      await api.patch('/users/me', { avatar_url: compressedDataUrl });
      showToast('Profile picture updated successfully!', 'success');
      setIsAvatarModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to process image upload', 'error');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  const handleSelectPreset = async (url: string) => {
    try {
      setAvatarUrl(url);
      await api.patch('/users/me', { avatar_url: url });
      showToast('Profile picture updated!', 'success');
      setIsAvatarModalOpen(false);
    } catch (err) {
      showToast('Failed to update profile picture', 'error');
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setAvatarUrl('');
      await api.patch('/users/me', { avatar_url: null });
      showToast('Profile picture reset to default', 'success');
      setIsAvatarModalOpen(false);
    } catch (err) {
      showToast('Failed to reset profile picture', 'error');
    }
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatIcon(cat.icon || getCategoryIcon(cat));
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim()) return;

    try {
      setIsEditCatSubmitting(true);
      await api.patch(`/categories/${editingCategory.id}`, {
        name: editCatName.trim(),
        icon: editCatIcon,
      });
      showToast('Category updated successfully', 'success');
      setEditingCategory(null);
      await fetchCategories();
    } catch (err) {
      console.error(err);
      showToast('Failed to update category', 'error');
    } finally {
      setIsEditCatSubmitting(false);
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const updated = reordered.map((cat, idx) => ({
      ...cat,
      sort_order: idx,
    }));

    setCategories(updated);

    try {
      await Promise.all(
        updated.map(cat =>
          api.patch(`/categories/${cat.id}`, { sort_order: cat.sort_order })
        )
      );
      showToast('Category order updated', 'success');
    } catch (err) {
      console.error('Failed to save category order', err);
      showToast('Failed to save category order', 'error');
      fetchCategories();
    }
  };

  const handleSaveProfile = async () => {
    try {
      const cleanUsername = username.trim().replace(/^@/, '');
      await api.patch('/users/me', {
        username: cleanUsername,
        display_name: displayName,
        bio,
        profile_visibility: publicProfile ? 'public' : 'private',
        avatar_url: avatarUrl || null,
      });
      setUsername(cleanUsername);
      showToast('Profile saved successfully', 'success');
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to save profile';
      showToast(msg, 'error');
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
    if (confirmUsername !== username) {
      showToast('Username does not match', 'error');
      return;
    }

    try {
      setIsDeleting(true);
      await api.delete('/users/me');
      showToast('Account deleted', 'success');
      signOut();
      navigate('/');
    } catch (e) {
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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="max-w-[960px] mx-auto px-gutter md:px-8 py-lg md:py-xl space-y-xl">
      {/* Header & Quick Navigation */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-sm">
          <h1 className="font-headline-lg text-headline-lg text-primary m-0">Settings</h1>
          {/* Section Navigation Pills */}
          <div className="flex flex-wrap items-center gap-xs">
            <button
              type="button"
              onClick={() => scrollToSection('settings-profile')}
              className="px-sm py-1 rounded-md text-xs font-medium text-secondary hover:text-primary hover:bg-surface-variant transition-colors cursor-pointer"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('settings-categories')}
              className="px-sm py-1 rounded-md text-xs font-medium text-secondary hover:text-primary hover:bg-surface-variant transition-colors cursor-pointer"
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('settings-privacy')}
              className="px-sm py-1 rounded-md text-xs font-medium text-secondary hover:text-primary hover:bg-surface-variant transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('settings-account')}
              className="px-sm py-1 rounded-md text-xs font-medium text-secondary hover:text-primary hover:bg-surface-variant transition-colors cursor-pointer"
            >
              Account
            </button>
          </div>
        </div>
        <p className="text-secondary font-body-md text-body-md m-0">
          Manage your sanctuary preferences, personal taxonomy, and privacy.
        </p>
      </div>

      {/* SECTION 1: PROFILE */}
      <section id="settings-profile" className="space-y-md">
        <h2 className="font-headline-md text-headline-md text-primary border-b border-tertiary/25 pb-xs mb-md">
          Profile
        </h2>
        
        <div className="bg-surface-container-lowest border border-tertiary/25 rounded-xl p-md sm:p-lg shadow-xs space-y-md">
          {/* Avatar & Identity Header Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md pb-md border-b border-tertiary/20">
            <div className="flex items-center gap-md sm:gap-lg">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden border-2 border-primary/30 bg-surface-variant shadow-xs">
                  <img 
                    src={avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${displayName || username || 'User'}`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-surface"
                  aria-label="Change profile picture"
                  title="Change profile picture"
                >
                  <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                </button>
              </div>

              <div className="min-w-0">
                <h3 className="font-headline-sm text-lg sm:text-xl text-primary truncate font-serif">
                  {displayName || username || 'Curator'}
                </h3>
                <p className="font-mono text-xs text-secondary mb-2 truncate">
                  @{username || 'username'}
                </p>
                <div className="flex flex-wrap items-center gap-xs sm:gap-sm">
                  <button
                    type="button"
                    onClick={() => setIsAvatarModalOpen(true)}
                    className="inline-flex items-center gap-xs px-sm py-1 rounded-lg text-xs font-medium bg-surface text-primary border border-tertiary/40 hover:bg-surface-variant transition-colors cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">palette</span>
                    <span>Choose Preset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="inline-flex items-center gap-xs px-sm py-1 rounded-lg text-xs font-medium bg-surface text-secondary hover:text-primary border border-tertiary/40 hover:bg-surface-variant transition-colors cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">upload</span>
                    <span>{isUploadingAvatar ? 'Uploading...' : 'Upload Image'}</span>
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-xs text-secondary hover:text-error transition-colors px-xs py-1 cursor-pointer font-medium"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif"
              onChange={handleAvatarFileUpload}
              className="hidden"
            />
          </div>
          
          {/* Profile Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md pt-xs">
            <div>
              <label className="block font-label-md text-xs text-secondary mb-xs uppercase font-medium">
                DISPLAY NAME
              </label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-md py-2 bg-surface border border-tertiary/30 focus:border-primary rounded-lg outline-none font-body-md text-body-md text-on-surface transition-all focus:ring-1 focus:ring-primary/20"
                placeholder="Your display name"
              />
            </div>
            
            <div>
              <label className="block font-label-md text-xs text-secondary mb-xs uppercase font-medium">
                USERNAME
              </label>
              <div className="flex items-center bg-surface border border-tertiary/30 focus-within:border-primary rounded-lg px-md py-2 transition-all focus-within:ring-1 focus-within:ring-primary/20">
                <span className="text-secondary font-mono text-sm mr-1 select-none">@</span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent outline-none font-body-md text-body-md text-on-surface"
                  placeholder="@username"
                />
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <div className="flex justify-between items-center mb-xs">
                <label className="block font-label-md text-xs text-secondary uppercase font-medium">
                  BIO
                </label>
                <span className="text-[11px] text-secondary font-mono">
                  {bio.length}/500
                </span>
              </div>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full px-md py-2 bg-surface border border-tertiary/30 focus:border-primary rounded-lg outline-none resize-y font-body-md text-body-md text-on-surface transition-all focus:ring-1 focus:ring-primary/20"
                placeholder="Tell us about your reading, watching, and gaming tastes..."
              />
            </div>
          </div>
          
          {/* Save Profile Button */}
          <div className="flex justify-end pt-xs">
            <button 
              type="button"
              onClick={handleSaveProfile}
              className="bg-primary text-on-primary font-label-md text-label-md rounded-lg px-lg py-2 hover:opacity-90 transition-all cursor-pointer shadow-xs flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>Save Profile</span>
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: CATEGORY MANAGEMENT */}
      <section id="settings-categories" className="space-y-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm border-b border-tertiary/25 pb-xs mb-md">
          <div>
            <h1 className="font-headline-md text-headline-md text-primary m-0">Category Management</h1>
            <p className="font-body-md text-sm text-secondary m-0 mt-0.5">
              Organize and customize your personal media taxonomy.
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <button
              type="button"
              onClick={() => setIsManageCatModalOpen(true)}
              className="flex items-center gap-xs bg-surface text-primary border border-tertiary font-label-md text-label-md px-md py-xs rounded-lg hover:bg-surface-variant transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
              Manage Categories
            </button>
            <button
              type="button"
              onClick={handleOpenCatModal}
              className="bg-primary text-on-primary font-label-md text-label-md rounded-lg px-md py-xs flex items-center gap-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create Custom Category
            </button>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-tertiary/25 rounded-xl p-md sm:p-lg shadow-xs">
          <div className="flex justify-between text-secondary font-label-md text-xs uppercase tracking-wider mb-sm pb-xs border-b border-tertiary/25">
            <span>CATEGORY</span>
            <span>ITEMS</span>
          </div>

          {categoriesLoading ? (
            <div className="flex flex-col gap-xs">
              {[1, 2, 3, 4].map(i => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <EmptyState
              icon="category"
              title="No categories found"
              description="Organize your experiences into custom categories like Anime, Philosophy Books, or Retro Games."
              primaryAction={{
                label: 'Create Custom Category',
                onClick: handleOpenCatModal,
                icon: 'add',
              }}
            />
          ) : (
            <div className="flex flex-col gap-xs">
              {categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`flex justify-between items-center px-sm py-2 rounded-lg hover:bg-surface-variant/40 transition-colors border border-transparent hover:border-tertiary/30 group cursor-default ${
                    draggedIndex === idx ? 'opacity-40 border-dashed border-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-md">
                    <span
                      className="material-symbols-outlined cursor-grab active:cursor-grabbing text-secondary hover:text-on-surface transition-colors text-[18px]"
                      aria-label="Drag to reorder"
                    >
                      drag_indicator
                    </span>
                    <div className="w-8 h-8 bg-surface-variant flex items-center justify-center rounded text-primary">
                      <span className="material-symbols-outlined text-[18px]">
                        {getCategoryIcon(cat)}
                      </span>
                    </div>
                    <span className="font-body-md text-sm sm:text-base font-medium text-on-surface">{cat.name}</span>
                    {!cat.is_builtin && (
                      <span className="font-caption text-xs bg-surface-variant text-on-surface-variant px-sm py-[1px] rounded-full">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-md">
                    <span className="font-body-md text-sm text-secondary">
                      {cat.count !== undefined ? cat.count : 0}
                    </span>
                    {!cat.is_builtin && (
                      <div className="flex items-center gap-xs opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleStartEditCategory(cat)}
                          className="text-secondary hover:text-primary transition-colors p-xs rounded cursor-pointer"
                          aria-label={`Edit ${cat.name}`}
                          title="Edit category"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="text-secondary hover:text-error transition-colors p-xs rounded cursor-pointer"
                          aria-label={`Delete ${cat.name}`}
                          title="Delete category"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: PRIVACY & VISIBILITY */}
      <section id="settings-privacy" className="space-y-md">
        <h2 className="font-headline-md text-headline-md text-primary border-b border-tertiary/25 pb-xs mb-md">
          Privacy
        </h2>
        
        <div className="bg-surface-container-lowest border border-tertiary/25 rounded-xl p-md sm:p-lg flex flex-col gap-lg shadow-xs">
          {/* Public Profile Toggle Row matching selector input[aria-labelledby="public-profile-label"] */}
          <div className="flex justify-between items-center pb-md border-b border-tertiary/25">
            <div>
              <div className="font-body-lg text-body-lg text-on-surface mb-xs font-medium" id="public-profile-label">
                Public Profile
              </div>
              <div className="font-body-md text-body-md text-secondary">
                Allow others to view your public entries and profile details.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={publicProfile}
                onChange={handleTogglePublicProfile}
                aria-labelledby="public-profile-label"
              />
              <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Public Profile Link & Actions */}
          {publicProfile && username ? (
            <div className="p-md rounded-lg bg-surface border border-tertiary/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md animate-fade-in">
              <div className="flex items-center gap-md min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">public</span>
                </div>
                <div className="min-w-0">
                  <span className="font-body-md text-body-md text-on-surface font-medium block">Public Profile Active</span>
                  <code className="font-mono text-xs text-secondary truncate block">
                    {window.location.origin}/u/{username}
                  </code>
                </div>
              </div>
              <div className="flex items-center gap-sm shrink-0">
                <button
                  type="button"
                  onClick={handleShareProfile}
                  className="flex items-center gap-xs px-md py-sm bg-surface-variant hover:bg-surface-container text-primary font-label-md text-label-md rounded-lg border border-tertiary/25 transition-colors cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">share</span>
                  <span>Share Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/u/${username}`)}
                  className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span>View</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Toggle Search Indexing */}
          <div className="flex items-center justify-between pt-xs">
            <div>
              <div className="font-body-lg text-body-lg text-on-surface mb-xs font-medium">Search Engine Indexing</div>
              <div className="font-body-md text-body-md text-secondary">
                Allow search engines like Google to index your public profile page.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={searchIndexing}
                onChange={handleToggleSearchIndexing}
              />
              <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </section>

      {/* SECTION 4: DATA & ACCOUNT */}
      <section id="settings-account" className="space-y-md">
        <h2 className="font-headline-md text-headline-md text-primary border-b border-tertiary/25 pb-xs mb-md">
          Account
        </h2>
        
        <div className="bg-surface-container-lowest border border-tertiary/25 rounded-xl p-md sm:p-lg space-y-lg shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md pb-md border-b border-tertiary/25">
            <div>
              <div className="font-body-lg text-body-lg text-on-surface mb-xs font-medium">Export Your Archive</div>
              <div className="font-body-md text-body-md text-secondary">
                Download a comprehensive JSON archive containing all your logged media experiences, reflections, and categories.
              </div>
            </div>
            <button 
              onClick={handleRequestExport}
              disabled={isExporting}
              className="bg-surface text-primary border border-tertiary/30 font-label-md text-label-md rounded-lg px-lg py-sm hover:bg-surface-variant transition-colors disabled:opacity-50 shrink-0 cursor-pointer shadow-xs"
            >
              {isExporting ? 'Exporting...' : 'Request Export'}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
            <div>
              <div className="font-body-lg text-body-lg text-error mb-xs font-medium">Delete Account</div>
              <div className="font-body-md text-body-md text-secondary">
                Permanently erase your sanctuary, all logged experiences, and reflections. This action is irreversible.
              </div>
            </div>
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="bg-error text-on-error font-label-md text-label-md rounded-lg px-lg py-sm hover:opacity-90 transition-opacity shrink-0 cursor-pointer shadow-xs"
            >
              Delete Account
            </button>
          </div>
        </div>
      </section>

      {/* Create Custom Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-gutter">
          <div className="bg-surface rounded-xl border border-tertiary max-w-[480px] w-full p-lg sm:p-xl shadow-xl animate-fade-in">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="font-headline-md text-headline-md text-primary">Create Custom Category</h2>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-secondary hover:text-primary transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="flex flex-col gap-lg">
              <div className="flex flex-col gap-xs">
                <label htmlFor="cat-name" className="font-label-md text-xs text-secondary uppercase font-medium">
                  Category Name
                </label>
                <input
                  id="cat-name"
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Graphic Novels, Podcasts, Anime"
                  className="w-full py-sm border-b border-tertiary focus:border-primary bg-transparent outline-none font-body-md text-body-md text-on-surface transition-colors"
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label htmlFor="cat-media-type" className="font-label-md text-xs text-secondary uppercase font-medium">
                  Media Type <span className="text-secondary text-caption normal-case">(immutable once created)</span>
                </label>
                <select
                  id="cat-media-type"
                  value={newCatMediaType}
                  onChange={(e) => setNewCatMediaType(e.target.value)}
                  className="w-full py-sm border-b border-tertiary focus:border-primary bg-transparent outline-none font-body-md text-body-md text-on-surface cursor-pointer"
                >
                  {MEDIA_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-xs text-secondary uppercase font-medium mb-xs">
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-sm">
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewCatIcon(icon)}
                      className={`h-10 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                        newCatIcon === icon
                          ? 'border-primary bg-primary text-on-primary shadow-xs'
                          : 'border-tertiary bg-surface-variant text-on-surface hover:border-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-md mt-md">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-lg py-sm rounded-lg border border-tertiary text-secondary font-label-md text-label-md hover:bg-surface-variant transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCatSubmitting || !newCatName.trim()}
                  className="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isCatSubmitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Select Profile Picture Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-gutter">
          <div className="bg-surface rounded-xl border border-tertiary max-w-[540px] w-full p-lg sm:p-xl shadow-xl animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-md shrink-0">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary text-[24px]">account_circle</span>
                <h2 className="font-headline-md text-headline-md text-primary">Select Profile Picture</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="text-secondary hover:text-primary transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="overflow-y-auto space-y-lg pr-xs flex-1">
              {/* Current Preview */}
              <div className="flex items-center gap-md p-md bg-surface-variant/40 rounded-xl border border-tertiary/25">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/40 bg-surface shrink-0">
                  <img
                    src={avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${displayName || username || 'User'}`}
                    alt="Current Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-body-md text-sm font-medium text-on-surface">Active Avatar</div>
                  <div className="text-xs text-secondary">
                    {avatarUrl ? 'Customized avatar active' : 'Default generative avatar'}
                  </div>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-xs text-error hover:underline cursor-pointer mt-1 font-medium inline-block"
                    >
                      Reset to default
                    </button>
                  )}
                </div>
              </div>

              {/* Preset Gallery */}
              <div>
                <label className="block font-label-md text-xs text-secondary uppercase font-medium mb-xs">
                  Choose from Curated Archetypes
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-sm">
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = avatarUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.url)}
                        className={`group relative flex flex-col items-center p-xs rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/40'
                            : 'border-tertiary/30 bg-surface hover:border-primary/60 hover:bg-surface-variant/50'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-variant mb-1.5 border border-tertiary/30">
                          <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[11px] font-medium text-on-surface truncate w-full text-center">
                          {preset.label}
                        </span>
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-on-primary rounded-full flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload Custom Image */}
              <div>
                <label className="block font-label-md text-xs text-secondary uppercase font-medium mb-xs">
                  Upload Image File
                </label>
                <div
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="border-2 border-dashed border-tertiary/60 hover:border-primary rounded-xl p-md flex flex-col items-center justify-center gap-xs cursor-pointer hover:bg-surface-variant/30 transition-all text-center"
                >
                  <span className="material-symbols-outlined text-[28px] text-primary">add_photo_alternate</span>
                  <span className="text-sm font-medium text-on-surface">
                    {isUploadingAvatar ? 'Compressing and uploading...' : 'Choose an image file'}
                  </span>
                  <span className="text-xs text-secondary">
                    Supports JPG, PNG, WebP, GIF (max 10MB, auto-optimized)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-md pt-md mt-md border-t border-tertiary/25 shrink-0">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="px-lg py-sm rounded-lg border border-tertiary text-secondary font-label-md text-label-md hover:bg-surface-variant transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {isManageCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-gutter">
          <div className="bg-surface rounded-xl border border-tertiary max-w-[560px] w-full p-lg sm:p-xl shadow-xl animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-sm shrink-0">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary text-[24px]">category</span>
                <h2 className="font-headline-md text-headline-md text-primary">Manage Categories</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsManageCatModalOpen(false)}
                className="text-secondary hover:text-primary transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-sm text-secondary mb-md shrink-0">
              Reorder your categories using the arrows, or customize names and icons for your custom categories.
            </p>

            <div className="overflow-y-auto space-y-xs pr-xs flex-1">
              {categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="flex justify-between items-center p-sm rounded-lg bg-surface-container-lowest border border-tertiary/25 hover:border-tertiary/50 transition-colors"
                >
                  <div className="flex items-center gap-xs sm:gap-sm min-w-0">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveCategory(idx, 'up')}
                        className="w-6 h-5 flex items-center justify-center text-secondary hover:text-primary disabled:opacity-20 disabled:hover:text-secondary rounded cursor-pointer transition-colors"
                        aria-label="Move category up"
                        title="Move up"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        disabled={idx === categories.length - 1}
                        onClick={() => handleMoveCategory(idx, 'down')}
                        className="w-6 h-5 flex items-center justify-center text-secondary hover:text-primary disabled:opacity-20 disabled:hover:text-secondary rounded cursor-pointer transition-colors"
                        aria-label="Move category down"
                        title="Move down"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                      </button>
                    </div>

                    <div className="w-8 h-8 bg-surface-variant flex items-center justify-center rounded text-primary shrink-0">
                      <span className="material-symbols-outlined text-[18px]">
                        {getCategoryIcon(cat)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-xs">
                        <span className="font-body-md text-sm font-medium text-on-surface truncate">
                          {cat.name}
                        </span>
                        {!cat.is_builtin ? (
                          <span className="font-caption text-[10px] bg-primary/10 text-primary px-1.5 py-[0.5px] rounded-full shrink-0">
                            Custom
                          </span>
                        ) : (
                          <span className="font-caption text-[10px] bg-surface-variant text-secondary px-1.5 py-[0.5px] rounded-full shrink-0">
                            Built-in
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-secondary capitalize">
                        {cat.media_type} • {cat.count ?? 0} item{cat.count === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-xs shrink-0">
                    {!cat.is_builtin ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            handleStartEditCategory(cat);
                          }}
                          className="p-1.5 text-secondary hover:text-primary hover:bg-surface-variant rounded-lg transition-colors cursor-pointer"
                          aria-label={`Edit ${cat.name}`}
                          title="Edit category"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-secondary hover:text-error hover:bg-surface-variant rounded-lg transition-colors cursor-pointer"
                          aria-label={`Delete ${cat.name}`}
                          title="Delete category"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-secondary/60 px-2 py-1">Permanent</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-md mt-md border-t border-tertiary/25 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleOpenCatModal();
                }}
                className="flex items-center gap-xs text-sm font-medium text-primary hover:underline cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Create New Category
              </button>
              <button
                type="button"
                onClick={() => setIsManageCatModalOpen(false)}
                className="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-gutter">
          <div className="bg-surface rounded-xl border border-tertiary max-w-[480px] w-full p-lg sm:p-xl shadow-xl animate-fade-in">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="font-headline-md text-headline-md text-primary">Edit Category</h2>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-secondary hover:text-primary transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="flex flex-col gap-lg">
              <div className="flex flex-col gap-xs">
                <label htmlFor="edit-cat-name" className="font-label-md text-xs text-secondary uppercase font-medium">
                  Category Name
                </label>
                <input
                  id="edit-cat-name"
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full py-sm border-b border-tertiary focus:border-primary bg-transparent outline-none font-body-md text-body-md text-on-surface transition-colors"
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-xs text-secondary uppercase font-medium">
                  Media Type
                </label>
                <div className="py-sm text-sm text-secondary capitalize flex items-center justify-between border-b border-tertiary/30">
                  <span>{editingCategory.media_type}</span>
                  <span className="text-[11px] text-secondary/70">Immutable once created</span>
                </div>
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-xs text-secondary uppercase font-medium mb-xs">
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-sm">
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setEditCatIcon(icon)}
                      className={`h-10 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                        editCatIcon === icon
                          ? 'border-primary bg-primary text-on-primary shadow-xs'
                          : 'border-tertiary bg-surface-variant text-on-surface hover:border-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-md mt-md">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-lg py-sm rounded-lg border border-tertiary text-secondary font-label-md text-label-md hover:bg-surface-variant transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditCatSubmitting || !editCatName.trim()}
                  className="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isEditCatSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-gutter">
          <div className="bg-surface rounded-xl border border-tertiary max-w-[480px] w-full p-xl shadow-xl animate-fade-in">
            <h3 className="font-headline-md text-headline-md text-error mb-sm">Delete Account</h3>
            <p className="font-body-md text-body-md text-secondary mb-lg">
              This action cannot be undone. All your logged experiences, notes, and categories will be permanently erased.
            </p>
            
            <div className="mb-lg">
              <label className="block font-label-md text-label-md text-secondary mb-xs">
                To confirm, please type your username <span className="font-bold text-on-surface">@{username}</span>:
              </label>
              <input 
                type="text" 
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                className="w-full py-sm border-b border-error focus:border-error bg-transparent outline-none font-body-md text-body-md text-on-surface transition-colors"
                placeholder={username}
              />
            </div>
            
            <div className="flex justify-end gap-md">
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setConfirmUsername('');
                }}
                className="font-label-md text-label-md text-secondary hover:text-on-surface px-md py-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDeleteAccount}
                disabled={confirmUsername !== username || isDeleting}
                className="bg-error text-on-error font-label-md text-label-md rounded-lg px-lg py-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
