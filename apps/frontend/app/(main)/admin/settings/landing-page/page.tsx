'use client';
import RequireAuth from '@/components/RequireAuth';
import { useEffect, useState, useCallback } from 'react';
import { apiBase, parseErrorMessage } from '@/lib/api';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';
import SortableImageList from '@/components/landing/SortableImageList';
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronRight,
  Image as ImageIcon, Save, Loader2, Eye, EyeOff, Layout, Star, Images, LayoutTemplate
} from 'lucide-react';

// Types
interface HeroImage {
  id: string;
  url: string;
  alt?: string | null;
  intervalMs?: number;
}

interface FeatureImage {
  id: string;
  url: string;
  alt?: string | null;
  intervalMs?: number;
}

interface Feature {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  images: FeatureImage[];
}

interface GalleryImage {
  id: string;
  url: string;
  alt?: string | null;
  caption?: string | null;
}

interface LandingConfig {
  heroHeadline: string;
  heroSubtext: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  galleryTitle: string;
  gallerySubtext: string;
  showHero: boolean;
  showFeatures: boolean;
  showGallery: boolean;
  showFooter: boolean;
}

interface LandingPageAdminData {
  config: LandingConfig;
  heroImages: HeroImage[];
  features: Feature[];
  galleryImages: GalleryImage[];
}

// Default config values
const DEFAULT_CONFIG: LandingConfig = {
  heroHeadline: 'Welcome to Our Event',
  heroSubtext: 'Join us for an unforgettable experience',
  heroCtaPrimary: 'Register Now',
  heroCtaSecondary: 'Learn More',
  galleryTitle: 'Event Gallery',
  gallerySubtext: 'Moments from our previous events',
  showHero: true,
  showFeatures: true,
  showGallery: true,
  showFooter: true,
};

export default function LandingPageSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Data state
  const [config, setConfig] = useState<LandingConfig>(DEFAULT_CONFIG);
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hero: true,
    features: true,
    gallery: true,
    visibility: true,
  });

  const tokenHeader = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase()}/admin/landing-page`, { headers: tokenHeader() });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(parseErrorMessage(text));
      }
      const data: LandingPageAdminData = await res.json();
      setConfig(data.config);
      setHeroImages(data.heroImages);
      setFeatures(data.features);
      setGalleryImages(data.galleryImages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Save config
  const saveConfig = async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`${apiBase()}/admin/landing-page`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...tokenHeader() },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(parseErrorMessage(text));
      }
      setMessage('Konfigurasi tersimpan.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Hero image handlers
  const handleReorderHeroImages = async (imageIds: string[]) => {
    await fetch(`${apiBase()}/admin/landing-page/hero-image/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
      body: JSON.stringify({ imageIds }),
    });
  };

  const handleUploadHeroImage = async (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`${apiBase()}/admin/landing-page/hero-image`, {
      method: 'POST',
      headers: tokenHeader(),
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseErrorMessage(text));
    }
    const newImage = await res.json();
    setHeroImages(prev => [...prev, newImage]);
  };

  const handleDeleteHeroImage = async (imageId: string) => {
    const res = await fetch(`${apiBase()}/admin/landing-page/hero-image/${imageId}`, {
      method: 'DELETE',
      headers: tokenHeader(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseErrorMessage(text));
    }
  };

  // Feature handlers
  const handleAddFeature = async () => {
    try {
      const res = await fetch(`${apiBase()}/admin/landing-page/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tokenHeader() },
        body: JSON.stringify({ title: 'New Feature', description: 'Feature description' }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(parseErrorMessage(text));
      }
      const newFeature = await res.json();
      setFeatures(prev => [...prev, newFeature]);
      setMessage('Feature ditambahkan.');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleUpdateFeature = async (featureId: string, updates: Partial<Feature>) => {
    const res = await fetch(`${apiBase()}/admin/landing-page/features/${featureId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseErrorMessage(text));
    }
    const updated = await res.json();
    setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, ...updated } : f));
  };

  const handleDeleteFeature = async (featureId: string) => {
    if (!confirm('Hapus feature ini?')) return;
    const res = await fetch(`${apiBase()}/admin/landing-page/features/${featureId}`, {
      method: 'DELETE',
      headers: tokenHeader(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseErrorMessage(text));
    }
    setFeatures(prev => prev.filter(f => f.id !== featureId));
  };

  const handleReorderFeatures = async (featureIds: string[]) => {
    await fetch(`${apiBase()}/admin/landing-page/features/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
      body: JSON.stringify({ featureIds }),
    });
  };

  // Feature image handlers
  const handleUploadFeatureImage = async (featureId: string, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`${apiBase()}/admin/landing-page/features/${featureId}/images`, {
      method: 'POST',
      headers: tokenHeader(),
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseErrorMessage(text));
    }
    const newImage = await res.json();
    setFeatures(prev => prev.map(f =>
      f.id === featureId ? { ...f, images: [...f.images, newImage] } : f
    ));
  };

  const handleDeleteFeatureImage = async (featureId: string, imageId: string) => {
    const res = await fetch(`${apiBase()}/admin/landing-page/features/${featureId}/images/${imageId}`, {
      method: 'DELETE',
      headers: tokenHeader(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseErrorMessage(text));
    }
    setFeatures(prev => prev.map(f =>
      f.id === featureId ? { ...f, images: f.images.filter(img => img.id !== imageId) } : f
    ));
  };

  const handleReorderFeatureImages = async (featureId: string, imageIds: string[]) => {
    await fetch(`${apiBase()}/admin/landing-page/features/${featureId}/images/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
      body: JSON.stringify({ imageIds }),
    });
  };

  // Gallery image handlers
  const handleReorderGalleryImages = async (imageIds: string[]) => {
    await fetch(`${apiBase()}/admin/landing-page/gallery/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
      body: JSON.stringify({ imageIds }),
    });
  };

  const handleUploadGalleryImage = async (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`${apiBase()}/admin/landing-page/gallery`, {
      method: 'POST',
      headers: tokenHeader(),
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseErrorMessage(text));
    }
    const newImage = await res.json();
    setGalleryImages(prev => [...prev, newImage]);
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    const res = await fetch(`${apiBase()}/admin/landing-page/gallery/${imageId}`, {
      method: 'DELETE',
      headers: tokenHeader(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseErrorMessage(text));
    }
  };

  if (loading) {
    return (
      <RequireAuth>
        <div className="p-6 text-sm text-brand-textMuted flex items-center justify-center min-h-[200px]">
          <Loader2 className="animate-spin mr-2" size={20} />
          Loading...
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-screen p-6 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white text-shadow-lg">Landing Page Settings</h1>
              <p className="text-sm text-brand-textMuted mt-1">Kustomisasi halaman landing event</p>
            </div>
            <Button
              onClick={saveConfig}
              disabled={saving}
              size="md"
              className="flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>

          {error && (
            <div className="text-sm text-brand-danger bg-brand-danger/10 p-3 rounded-lg border border-brand-danger/20">
              {error}
            </div>
          )}
          {message && (
            <div className="text-sm text-brand-primary bg-brand-primary/10 p-3 rounded-lg border border-brand-primary/20">
              {message}
            </div>
          )}

          {/* Section Visibility Toggles */}
          <Card variant="glass" className="p-6">
            <button
              onClick={() => toggleSection('visibility')}
              className="w-full flex items-center justify-between text-lg font-semibold text-white mb-4"
            >
              <span className="flex items-center gap-2">
                <Eye size={20} />
                Section Visibility
              </span>
              {expandedSections.visibility ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>

            {expandedSections.visibility && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Toggle
                  label="Show Hero Section"
                  description="Tampilkan hero dengan carousel gambar"
                  checked={config.showHero}
                  onChange={(checked) => setConfig({ ...config, showHero: checked })}
                />
                <Toggle
                  label="Show Features Section"
                  description="Tampilkan feature cards dengan gambar"
                  checked={config.showFeatures}
                  onChange={(checked) => setConfig({ ...config, showFeatures: checked })}
                />
                <Toggle
                  label="Show Gallery Section"
                  description="Tampilkan galeri foto event"
                  checked={config.showGallery}
                  onChange={(checked) => setConfig({ ...config, showGallery: checked })}
                />
                <Toggle
                  label="Show Footer"
                  description="Tampilkan footer dengan info event"
                  checked={config.showFooter}
                  onChange={(checked) => setConfig({ ...config, showFooter: checked })}
                />
              </div>
            )}
          </Card>

          {/* Hero Section */}
          <Card variant="glass" className="p-6">
            <button
              onClick={() => toggleSection('hero')}
              className="w-full flex items-center justify-between text-lg font-semibold text-white mb-4"
            >
              <span className="flex items-center gap-2">
                <Layout size={20} />
                Hero Section
              </span>
              {expandedSections.hero ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>

            {expandedSections.hero && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2">Headline</Label>
                    <Input
                      value={config.heroHeadline}
                      onChange={(e) => setConfig({ ...config, heroHeadline: e.target.value })}
                      placeholder="Welcome to Our Event"
                    />
                  </div>
                  <div>
                    <Label className="mb-2">Subtext</Label>
                    <Input
                      value={config.heroSubtext}
                      onChange={(e) => setConfig({ ...config, heroSubtext: e.target.value })}
                      placeholder="Join us for an unforgettable experience"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2">Primary CTA</Label>
                    <Input
                      value={config.heroCtaPrimary}
                      onChange={(e) => setConfig({ ...config, heroCtaPrimary: e.target.value })}
                      placeholder="Register Now"
                    />
                  </div>
                  <div>
                    <Label className="mb-2">Secondary CTA</Label>
                    <Input
                      value={config.heroCtaSecondary}
                      onChange={(e) => setConfig({ ...config, heroCtaSecondary: e.target.value })}
                      placeholder="Learn More"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 flex items-center gap-2">
                    <ImageIcon size={16} />
                    Hero Images (Carousel)
                  </Label>
                  <SortableImageList
                    images={heroImages}
                    onReorder={handleReorderHeroImages}
                    onDelete={handleDeleteHeroImage}
                    onUpload={handleUploadHeroImage}
                    showInterval={true}
                    emptyMessage="Belum ada gambar hero. Upload gambar untuk carousel."
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Features Section */}
          <Card variant="glass" className="p-6">
            <button
              onClick={() => toggleSection('features')}
              className="w-full flex items-center justify-between text-lg font-semibold text-white mb-4"
            >
              <span className="flex items-center gap-2">
                <Star size={20} />
                Features Section
              </span>
              {expandedSections.features ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>

            {expandedSections.features && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Feature Cards</Label>
                    <Button size="sm" variant="secondary" onClick={handleAddFeature} className="flex items-center gap-1">
                      <Plus size={16} />
                      Add Feature
                    </Button>
                  </div>

                  {features.length === 0 ? (
                    <p className="text-sm text-brand-textMuted text-center py-8 surface rounded-xl">
                      Belum ada feature. Klik "Add Feature" untuk menambahkan.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {features.map((feature, index) => (
                        <FeatureCard
                          key={feature.id}
                          feature={feature}
                          index={index}
                          onUpdate={handleUpdateFeature}
                          onDelete={handleDeleteFeature}
                          onUploadImage={handleUploadFeatureImage}
                          onDeleteImage={handleDeleteFeatureImage}
                          onReorderImages={handleReorderFeatureImages}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Gallery Section */}
          <Card variant="glass" className="p-6">
            <button
              onClick={() => toggleSection('gallery')}
              className="w-full flex items-center justify-between text-lg font-semibold text-white mb-4"
            >
              <span className="flex items-center gap-2">
                <Images size={20} />
                Gallery Section
              </span>
              {expandedSections.gallery ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>

            {expandedSections.gallery && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2">Gallery Title</Label>
                    <Input
                      value={config.galleryTitle}
                      onChange={(e) => setConfig({ ...config, galleryTitle: e.target.value })}
                      placeholder="Event Gallery"
                    />
                  </div>
                  <div>
                    <Label className="mb-2">Gallery Subtext</Label>
                    <Input
                      value={config.gallerySubtext}
                      onChange={(e) => setConfig({ ...config, gallerySubtext: e.target.value })}
                      placeholder="Moments from our previous events"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 flex items-center gap-2">
                    <ImageIcon size={16} />
                    Gallery Images
                  </Label>
                  <SortableImageList
                    images={galleryImages}
                    onReorder={handleReorderGalleryImages}
                    onDelete={handleDeleteGalleryImage}
                    onUpload={handleUploadGalleryImage}
                    showCaption={true}
                    emptyMessage="Belum ada gambar gallery. Upload gambar untuk gallery."
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={saveConfig}
              disabled={saving}
              size="lg"
              className="flex items-center gap-2 min-w-[160px] justify-center"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

// Feature Card Component
interface FeatureCardProps {
  feature: Feature;
  index: number;
  onUpdate: (id: string, updates: Partial<Feature>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUploadImage: (featureId: string, file: File) => Promise<void>;
  onDeleteImage: (featureId: string, imageId: string) => Promise<void>;
  onReorderImages: (featureId: string, imageIds: string[]) => Promise<void>;
}

function FeatureCard({
  feature,
  index,
  onUpdate,
  onDelete,
  onUploadImage,
  onDeleteImage,
  onReorderImages,
}: FeatureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(feature.title);
  const [description, setDescription] = useState(feature.description);
  const [isActive, setIsActive] = useState(feature.isActive);

  const handleSave = async () => {
    await onUpdate(feature.id, { title, description, isActive });
  };

  return (
    <div className="surface rounded-xl overflow-hidden border border-brand-border/50">
      <div className="p-4 flex items-start gap-4">
        <div className="p-2 cursor-grab text-brand-textMuted">
          <GripVertical size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-brand-textMuted">#{index + 1}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${isActive ? 'bg-brand-success/20 text-brand-success' : 'bg-white/10 text-white/50'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <h4 className="font-medium text-white truncate">{title || 'Untitled Feature'}</h4>
          <p className="text-sm text-brand-textMuted line-clamp-2">{description || 'No description'}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-brand-textMuted hover:text-brand-text transition-colors"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          <button
            onClick={() => onDelete(feature.id)}
            className="p-2 text-brand-textMuted hover:text-brand-danger transition-colors"
            title="Delete Feature"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 pt-0 border-t border-white/10 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 text-xs">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                placeholder="Feature title"
              />
            </div>
            <div className="flex items-end">
              <Toggle
                label="Active"
                checked={isActive}
                onChange={(checked) => { setIsActive(checked); onUpdate(feature.id, { isActive: checked }); }}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              placeholder="Feature description"
              rows={3}
            />
          </div>

          <div>
            <Label className="mb-2 text-xs flex items-center gap-2">
              <ImageIcon size={14} />
              Feature Images
            </Label>
            <SortableImageList
              images={feature.images}
              onReorder={(ids) => onReorderImages(feature.id, ids)}
              onDelete={(id) => onDeleteImage(feature.id, id)}
              onUpload={(file) => onUploadImage(feature.id, file)}
              showInterval={true}
              emptyMessage="No images for this feature."
            />
          </div>
        </div>
      )}
    </div>
  );
}