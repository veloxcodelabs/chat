import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Flame, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2 
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatBytes, formatTimeAgo, MEDIA_FILTERS } from '../utils/socket';

interface MediaViewerModalProps {
  media: MediaItem | null;
  allMediaList?: MediaItem[];
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (media: MediaItem) => void;
  onViewOnceExpire?: (mediaId: string) => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  media,
  allMediaList = [],
  isOpen,
  onClose,
  onNavigate,
  onViewOnceExpire,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [viewOnceCountdown, setViewOnceCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setZoom(1);
    setRotation(0);

    if (media?.isViewOnce && !media.viewOnceExpired) {
      const duration = media.expiresInSeconds || 10;
      setViewOnceCountdown(duration);

      const interval = setInterval(() => {
        setViewOnceCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            if (media?.id && onViewOnceExpire) {
              onViewOnceExpire(media.id);
            }
            setTimeout(onClose, 800);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setViewOnceCountdown(null);
    }
  }, [media, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, media, allMediaList]);

  if (!isOpen || !media) return null;

  const currentIndex = allMediaList.findIndex((m) => m.id === media.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < allMediaList.length - 1;

  const handlePrev = () => {
    if (hasPrev && onNavigate) {
      onNavigate(allMediaList[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigate) {
      onNavigate(allMediaList[currentIndex + 1]);
    }
  };

  const handleDownload = () => {
    if (!media) return;
    const a = document.createElement('a');
    a.href = media.url;
    a.download = media.fileName || `media_${Date.now()}`;
    a.target = '_blank';
    a.click();
  };

  if (!isOpen || !media) return null;

  const currentFilterObj = MEDIA_FILTERS.find((f) => f.id === media.filter) || MEDIA_FILTERS[0];

  return (
    <div 
      id="media-viewer-backdrop" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-lg"
    >
      {/* Top Bar Controls */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-slate-950/90 to-transparent border-b border-slate-800/40">
        <div className="flex items-center gap-3">
          <span className="text-slate-100 text-sm font-semibold tracking-tight">
            {media.fileName || (media.type === 'video' ? 'Video Player' : 'Photo Viewer')}
          </span>

          {media.isViewOnce && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg animate-pulse">
              <Flame className="w-3.5 h-3.5" />
              <span>Self-Destructs in {viewOnceCountdown}s</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls for photos */}
          {media.type === 'image' && (
            <>
              <button
                id="btn-zoom-out"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 min-w-10 text-center font-mono">
                {Math.round(zoom * 100)}%
              </span>
              <button
                id="btn-zoom-in"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                id="btn-rotate"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Video Speed Selector */}
          {media.type === 'video' && (
            <select
              value={playbackSpeed}
              onChange={(e) => {
                const speed = Number(e.target.value);
                setPlaybackSpeed(speed);
                if (videoRef.current) videoRef.current.playbackRate = speed;
              }}
              className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2.0x</option>
            </select>
          )}

          <button
            id="btn-info-toggle"
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-xl transition border ${
              showInfo
                ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Inspect Media Info"
          >
            <Info className="w-4 h-4" />
          </button>

          {!media.isViewOnce && (
            <button
              id="btn-download-media"
              onClick={handleDownload}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
              title="Download Media File"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          <button
            id="btn-close-viewer"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition ml-2 border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Media Viewport */}
      <div className="relative w-full h-full flex items-center justify-center p-8 overflow-hidden">
        {media.type === 'image' ? (
          <div
            className="transition-transform duration-200 ease-out max-h-full max-w-full flex items-center justify-center"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={media.url}
              alt={media.caption || 'Photo'}
              className={`max-h-[82vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-slate-800 ${currentFilterObj.css}`}
            />
          </div>
        ) : (
          <div className="relative max-h-[82vh] max-w-[90vw] flex items-center justify-center">
            <video
              ref={videoRef}
              src={media.url}
              controls
              autoPlay
              playsInline
              className={`max-h-[82vh] max-w-[90vw] rounded-2xl shadow-2xl bg-black border border-slate-800 ${currentFilterObj.css}`}
            />
          </div>
        )}

        {/* Previous/Next Navigation Arrows */}
        {hasPrev && (
          <button
            id="btn-viewer-prev"
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white transition backdrop-blur-md shadow-xl border border-slate-700"
            title="Previous Media"
          >
            <ChevronLeft className="w-6 h-6 text-indigo-300" />
          </button>
        )}

        {hasNext && (
          <button
            id="btn-viewer-next"
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white transition backdrop-blur-md shadow-xl border border-slate-700"
            title="Next Media"
          >
            <ChevronRight className="w-6 h-6 text-indigo-300" />
          </button>
        )}
      </div>

      {/* Bottom Caption Overlay */}
      {media.caption && (
        <div className="absolute bottom-6 inset-x-0 flex justify-center z-20 pointer-events-none px-6">
          <div className="max-w-xl px-5 py-3 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-800 text-slate-100 text-sm text-center shadow-xl">
            {media.caption}
          </div>
        </div>
      )}

      {/* Info Sidebar Modal */}
      {showInfo && (
        <div className="absolute top-20 right-6 z-30 w-72 p-5 rounded-2xl bg-slate-900/95 border border-slate-800 text-slate-300 text-xs shadow-2xl backdrop-blur-md space-y-3 animate-in fade-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-semibold text-white">Media Details</span>
            <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">File Type:</span>
              <span className="font-mono text-slate-200 uppercase">{media.mimeType || media.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">File Size:</span>
              <span className="font-mono text-slate-200">{formatBytes(media.fileSize)}</span>
            </div>
            {media.duration && (
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-mono text-slate-200">{media.duration}s</span>
              </div>
            )}
            {media.filter && media.filter !== 'normal' && (
              <div className="flex justify-between">
                <span className="text-slate-500">Filter:</span>
                <span className="font-medium text-indigo-400 capitalize">{media.filter}</span>
              </div>
            )}
            {media.isViewOnce && (
              <div className="flex justify-between text-red-400">
                <span>Security:</span>
                <span className="font-semibold">View Once</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
