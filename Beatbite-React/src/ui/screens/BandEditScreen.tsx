/**
 * BandEditScreen - Edit band avatar, name, and backstory.
 */

import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore, useBands } from '../../core/store';
import { clsx } from 'clsx';

/**
 * Generate a gradient color based on band name for placeholder avatar.
 */
function getBandAvatarGradient(name: string): string {
  const gradients = [
    'from-[#00ffff] to-[#0066ff]',
    'from-[#ff00ff] to-[#6600ff]',
    'from-[#00ff66] to-[#00ccff]',
    'from-[#ffcc00] to-[#ff6600]',
    'from-[#ff6699] to-[#ff3366]',
    'from-[#66ffcc] to-[#33cc99]',
    'from-[#9966ff] to-[#6633ff]',
    'from-[#ff9966] to-[#ff6633]',
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

export function BandEditScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const bands = useBands();
  const { updateBand } = useAppStore();

  const band = bands.find(b => b.id === id);

  const [name, setName] = useState(band?.name || '');
  const [backstory, setBackstory] = useState(band?.backstory || '');
  const [avatar, setAvatar] = useState<string | undefined>(band?.avatar);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update state when band loads
  useEffect(() => {
    if (band) {
      setName(band.name);
      setBackstory(band.backstory || '');
      setAvatar(band.avatar);
    }
  }, [band]);

  // Handle avatar image selection
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      // Resize image to reduce storage size
      resizeImage(dataUrl, 200, 200).then(resized => {
        setAvatar(resized);
      });
    };
    reader.readAsDataURL(file);
  };

  // Resize image to max dimensions while maintaining aspect ratio
  const resizeImage = (dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = dataUrl;
    });
  };

  // Remove avatar
  const handleRemoveAvatar = () => {
    setAvatar(undefined);
  };

  // Save changes
  const handleSave = async () => {
    if (!id || !name.trim()) return;

    setIsSaving(true);
    try {
      updateBand(id, {
        name: name.trim(),
        backstory: backstory.trim() || undefined,
        avatar,
      });
      navigate('/library/bands');
    } catch (error) {
      console.error('[BandEditScreen] Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/library/bands');
  };

  // Band not found
  if (!band) {
    return (
      <div className="h-full w-full bg-[#050505] flex flex-col items-center justify-center px-6">
        <p className="text-[#666666] font-mono text-center">Band not found</p>
        <button
          onClick={() => navigate('/library/bands')}
          className="mt-4 px-4 py-2 bg-[#1a1a1a] rounded-lg text-white font-mono text-sm"
        >
          Back to Library
        </button>
      </div>
    );
  }

  const bandInitial = name.charAt(0).toUpperCase() || '?';
  const avatarGradient = getBandAvatarGradient(name || 'Band');

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between border-b border-[#1a1a1a]">
        <button
          onClick={handleCancel}
          className="text-[#666666] hover:text-white transition-colors font-mono text-sm"
        >
          Cancel
        </button>
        <h1 className="text-lg font-bold text-white font-mono">Edit Band</h1>
        <button
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
          className={clsx(
            'font-mono text-sm font-bold transition-colors',
            name.trim() && !isSaving
              ? 'text-[#00ffff] hover:text-[#00cccc]'
              : 'text-[#333333]'
          )}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Avatar section */}
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={handleAvatarClick}
            className="relative w-32 h-32 rounded-2xl overflow-hidden group"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={clsx(
                'w-full h-full flex items-center justify-center bg-gradient-to-br',
                avatarGradient
              )}>
                <span className="text-4xl font-bold text-white/90 font-mono">{bandInitial}</span>
              </div>
            )}
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <p className="text-[#666666] text-xs font-mono mt-3">
            Tap to change photo
          </p>

          {avatar && (
            <button
              onClick={handleRemoveAvatar}
              className="mt-2 text-[#ff4444] text-xs font-mono hover:text-[#ff6666] transition-colors"
            >
              Remove photo
            </button>
          )}
        </div>

        {/* Name field */}
        <div className="mb-6">
          <label className="block text-[#888888] text-xs font-mono uppercase tracking-wider mb-2">
            Band Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter band name"
            maxLength={30}
            className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#222222] rounded-xl text-white font-mono text-base focus:outline-none focus:border-[#00ffff] transition-colors"
          />
          <p className="text-[#444444] text-xs font-mono mt-1 text-right">
            {name.length}/30
          </p>
        </div>

        {/* Backstory field */}
        <div className="mb-6">
          <label className="block text-[#888888] text-xs font-mono uppercase tracking-wider mb-2">
            Backstory
          </label>
          <textarea
            value={backstory}
            onChange={(e) => setBackstory(e.target.value)}
            placeholder="Tell the story of your band... Where did you meet? What's your sound?"
            maxLength={500}
            rows={5}
            className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#222222] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#00ffff] transition-colors resize-none"
          />
          <p className="text-[#444444] text-xs font-mono mt-1 text-right">
            {backstory.length}/500
          </p>
        </div>

        {/* Preview card */}
        <div className="mt-8">
          <p className="text-[#666666] text-xs font-mono uppercase tracking-wider mb-3">
            Preview
          </p>
          <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
            <div className="flex items-start gap-4">
              {/* Avatar preview */}
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                {avatar ? (
                  <img src={avatar} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className={clsx(
                    'w-full h-full flex items-center justify-center bg-gradient-to-br',
                    avatarGradient
                  )}>
                    <span className="text-xl font-bold text-white/90 font-mono">{bandInitial}</span>
                  </div>
                )}
              </div>

              {/* Info preview */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-mono font-bold text-base truncate">
                  {name || 'Band Name'}
                </h3>
                {backstory && (
                  <p className="text-[#888888] text-xs font-mono mt-1 line-clamp-2">
                    {backstory}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
