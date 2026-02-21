import { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, X, Check, ZoomIn, ZoomOut, Loader } from 'lucide-react';

const MAX_FILE_SIZE_MB = 2;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const OUTPUT_SIZE = 256; // px — square output

// Crop the image using an off-screen canvas and return a Blob
async function getCroppedBlob(imageSrc, croppedAreaPixels) {
  const image = await createImageBitmap(
    await fetch(imageSrc).then(r => r.blob())
  );
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
}

export default function TeamLogoUploader({ currentLogoUrl, onUpload, children }) {
  const inputRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);     // raw selected image data URL
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const onCropComplete = useCallback((_, cap) => setCroppedAreaPixels(cap), []);

  const handleFileChange = (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleConfirm = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setUploading(true);
    setError('');
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      await onUpload(blob);
      setImageSrc(null);
    } catch (e) {
      console.error('Upload error:', e);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setImageSrc(null);
    setError('');
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  return (
    <>
      {/* Trigger area — renders the children (the circle logo) wrapped in a clickable div */}
      <div
        className="relative group cursor-pointer"
        onClick={() => !imageSrc && inputRef.current?.click()}
        title="Click to change team logo"
      >
        {children}
        {/* Pencil overlay on hover */}
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera size={18} className="text-white" />
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />

      {error && !imageSrc && (
        <p className="text-xs text-red-500 mt-1 text-center">{error}</p>
      )}

      {/* Crop Modal */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 flex-shrink-0">
            <button onClick={handleCancel} className="text-white/70 hover:text-white flex items-center gap-1.5 text-sm">
              <X size={16} /> Cancel
            </button>
            <span className="text-white text-sm font-semibold">Crop Logo</span>
            <button
              onClick={handleConfirm}
              disabled={uploading}
              className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-60"
            >
              {uploading
                ? <><Loader size={14} className="animate-spin" /> Uploading...</>
                : <><Check size={14} /> Save</>
              }
            </button>
          </div>

          {/* Crop area */}
          <div className="relative flex-1">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3 px-6 py-4 bg-black/80 flex-shrink-0">
            <ZoomOut size={16} className="text-white/60" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary-500"
            />
            <ZoomIn size={16} className="text-white/60" />
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center pb-3">{error}</p>
          )}
        </div>
      )}
    </>
  );
}
