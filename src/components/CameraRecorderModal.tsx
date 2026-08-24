import React, { useState, useRef, useEffect } from 'react';
import { Camera, Video, Square, RefreshCw, X, Check, Flame, Sparkles, Volume2, Download, AlertCircle } from 'lucide-react';
import { MEDIA_FILTERS } from '../utils/socket';
import { MediaItem } from '../types';

interface CameraRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMedia: (media: Partial<MediaItem>, fileData: string) => void;
  recipientName: string;
}

export const CameraRecorderModal: React.FC<CameraRecorderModalProps> = ({
  isOpen,
  onClose,
  onSendMedia,
  recipientName,
}) => {
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [capturedPreview, setCapturedPreview] = useState<{
    dataUrl: string;
    type: 'image' | 'video';
    blob?: Blob;
    duration?: number;
  } | null>(null);

  const [caption, setCaption] = useState('');
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [viewOnceTimer, setViewOnceTimer] = useState(10);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashActive, setIsFlashActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Initialize camera stream
  useEffect(() => {
    if (isOpen && !capturedPreview) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, facingMode, capturedPreview]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please check browser permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Capture Photo
  const capturePhoto = () => {
    if (!videoRef.current) return;

    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle mirror mode for front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    setCapturedPreview({
      dataUrl,
      type: 'image',
    });
    stopCamera();
  };

  // Start Video Recording
  const startRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];
    setRecordingTime(0);

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(videoBlob);
        reader.onloadend = () => {
          setCapturedPreview({
            dataUrl: reader.result as string,
            type: 'video',
            blob: videoBlob,
            duration: recordingTime,
          });
          stopCamera();
        };
      };

      recorder.start(200);
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Recording start failed:', e);
      setCameraError('Video recording failed to start.');
    }
  };

  // Stop Video Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Handle Send
  const handleSend = () => {
    if (!capturedPreview) return;

    onSendMedia(
      {
        type: capturedPreview.type,
        caption: caption.trim() || undefined,
        filter: selectedFilter !== 'normal' ? selectedFilter : undefined,
        isViewOnce,
        expiresInSeconds: isViewOnce ? viewOnceTimer : undefined,
        duration: capturedPreview.duration,
        fileName: `${capturedPreview.type === 'video' ? 'snap_clip' : 'snap_shot'}_${Date.now()}.${capturedPreview.type === 'video' ? 'webm' : 'jpg'}`,
      },
      capturedPreview.dataUrl
    );

    // Reset and close
    setCapturedPreview(null);
    setCaption('');
    setIsViewOnce(false);
    onClose();
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    setCaption('');
  };

  if (!isOpen) return null;

  const currentFilterObj = MEDIA_FILTERS.find((f) => f.id === selectedFilter) || MEDIA_FILTERS[0];

  return (
    <div 
      id="camera-modal-backdrop" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[92vh]"
      >
        {/* Flash animation */}
        {isFlashActive && <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200" />}

        {/* Top Header Controls */}
        <div className="flex items-center justify-between px-6 py-4 z-10 bg-slate-950/80 border-b border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-100 text-sm font-semibold tracking-tight">
              {capturedPreview
                ? `Review ${capturedPreview.type === 'video' ? 'Video' : 'Photo'}`
                : mode === 'photo'
                ? 'Camera Capture'
                : 'Video Recorder'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!capturedPreview && (
              <button
                id="btn-switch-camera"
                onClick={switchCamera}
                title="Switch Camera Lens"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
              >
                <RefreshCw className="w-4 h-4 text-indigo-400" />
              </button>
            )}
            <button
              id="btn-close-camera"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder or Preview Canvas */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[380px] overflow-hidden">
          {cameraError ? (
            <div className="flex flex-col items-center gap-3 text-center p-6 max-w-sm">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-sm text-slate-300">{cameraError}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20"
              >
                Retry Access
              </button>
            </div>
          ) : capturedPreview ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {capturedPreview.type === 'image' ? (
                <img
                  src={capturedPreview.dataUrl}
                  alt="Captured"
                  className={`max-h-[460px] w-full object-contain ${currentFilterObj.css}`}
                />
              ) : (
                <video
                  ref={previewVideoRef}
                  src={capturedPreview.dataUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className={`max-h-[460px] w-full object-contain ${currentFilterObj.css}`}
                />
              )}

              {/* View once badge preview */}
              {isViewOnce && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/90 text-white text-xs font-semibold shadow-lg backdrop-blur-sm animate-pulse">
                  <Flame className="w-3.5 h-3.5" />
                  View Once ({viewOnceTimer}s self-destruct)
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover max-h-[460px] ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                } ${currentFilterObj.css}`}
              />

              {/* Live recording indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-semibold tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  REC {Math.floor(recordingTime / 60)}:
                  {(recordingTime % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter Selection Chips */}
        <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800 overflow-x-auto flex items-center gap-2 scrollbar-none">
          <div className="flex items-center gap-1 text-xs text-slate-400 font-medium mr-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Filters:</span>
          </div>
          {MEDIA_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                selectedFilter === filter.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              {filter.name}
            </button>
          ))}
        </div>

        {/* Bottom Action Controls */}
        <div className="p-5 bg-slate-950 border-t border-slate-800">
          {capturedPreview ? (
            /* Post-capture edit & send controls */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a photo caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />

                {/* View-Once Toggle Button */}
                <button
                  type="button"
                  id="btn-toggle-view-once"
                  onClick={() => setIsViewOnce(!isViewOnce)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isViewOnce
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                      : 'bg-slate-850 text-slate-400 border border-slate-700 hover:text-white'
                  }`}
                  title="Make this photo/video view-once"
                >
                  <Flame className="w-4 h-4" />
                  <span>1x View</span>
                </button>

                {isViewOnce && (
                  <select
                    value={viewOnceTimer}
                    onChange={(e) => setViewOnceTimer(Number(e.target.value))}
                    className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-xl px-2.5 py-2.5 focus:outline-none"
                  >
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                  </select>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  id="btn-retake-media"
                  onClick={handleRetake}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retake
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = capturedPreview.dataUrl;
                      a.download = `media_${Date.now()}.${capturedPreview.type === 'video' ? 'webm' : 'jpg'}`;
                      a.click();
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition border border-slate-700"
                    title="Save copy to device"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    id="btn-confirm-send-media"
                    onClick={handleSend}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 transition transform active:scale-95"
                  >
                    <span>Send to {recipientName}</span>
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Live recording / Capture controls */
            <div className="flex flex-col items-center gap-4">
              {/* Mode Toggle */}
              <div className="flex items-center p-1 rounded-full bg-slate-900 border border-slate-800">
                <button
                  onClick={() => {
                    if (isRecording) stopRecording();
                    setMode('photo');
                  }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition ${
                    mode === 'photo'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Photo
                </button>
                <button
                  onClick={() => setMode('video')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition ${
                    mode === 'video'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  Video Clip
                </button>
              </div>

              {/* Shutter Button */}
              <div className="flex items-center justify-center">
                {mode === 'photo' ? (
                  <button
                    id="btn-shutter-photo"
                    onClick={capturePhoto}
                    className="w-18 h-18 rounded-full border-4 border-indigo-400 p-1 flex items-center justify-center transition transform active:scale-90 hover:opacity-90 shadow-xl shadow-indigo-500/20"
                    title="Take Photo"
                  >
                    <div className="w-full h-full rounded-full bg-white" />
                  </button>
                ) : isRecording ? (
                  <button
                    id="btn-stop-recording"
                    onClick={stopRecording}
                    className="w-18 h-18 rounded-full border-4 border-red-500 p-1 flex items-center justify-center transition transform active:scale-95 animate-pulse"
                    title="Stop Video Recording"
                  >
                    <div className="w-6 h-6 rounded-md bg-red-600" />
                  </button>
                ) : (
                  <button
                    id="btn-start-recording"
                    onClick={startRecording}
                    className="w-18 h-18 rounded-full border-4 border-red-500 p-1 flex items-center justify-center transition transform active:scale-90 hover:opacity-90"
                    title="Record Video"
                  >
                    <div className="w-full h-full rounded-full bg-red-600" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
