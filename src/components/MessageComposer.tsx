import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Image, 
  Video, 
  Send, 
  Flame, 
  Mic, 
  Square, 
  X, 
  Sparkles, 
  Paperclip, 
  Smile, 
  Plus 
} from 'lucide-react';
import { MediaItem, ReplyContext } from '../types';
import { fileToBase64, MEDIA_FILTERS } from '../utils/socket';

interface MessageComposerProps {
  onSendMessage: (text: string, mediaList: Partial<MediaItem>[], fileDataMap: Record<string, string>) => void;
  onOpenLiveCamera: () => void;
  onTyping: (isTyping: boolean) => void;
  replyContext: ReplyContext | null;
  onCancelReply: () => void;
  recipientName: string;
}

interface StagedAttachment {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  type: 'image' | 'video' | 'audio';
  caption?: string;
  filter?: string;
  duration?: number;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onOpenLiveCamera,
  onTyping,
  replyContext,
  onCancelReply,
  recipientName,
}) => {
  const [text, setText] = useState('');
  const [stagedFiles, setStagedFiles] = useState<StagedAttachment[]>([]);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [viewOnceTimer, setViewOnceTimer] = useState(10);
  const [activeFilter, setActiveFilter] = useState('normal');
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<any>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file selection (Photos & Videos)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files) as File[];
    const newStaged: StagedAttachment[] = [];

    for (const file of files) {
      try {
        const base64 = await fileToBase64(file);
        const type = file.type.startsWith('video/')
          ? 'video'
          : file.type.startsWith('audio/')
          ? 'audio'
          : 'image';

        newStaged.push({
          id: `staged_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          base64,
          type,
          filter: activeFilter,
        });
      } catch (err) {
        console.error('File load error:', err);
      }
    }

    setStagedFiles((prev) => [...prev, ...newStaged]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Voice Note Recording
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      setAudioDuration(0);

      const recorder = new MediaRecorder(stream);
      audioRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const fakeFile = new File([audioBlob], `voice_memo_${Date.now()}.webm`, { type: 'audio/webm' });
          setStagedFiles((prev) => [
            ...prev,
            {
              id: `audio_${Date.now()}`,
              file: fakeFile,
              previewUrl: URL.createObjectURL(audioBlob),
              base64,
              type: 'audio',
              duration: audioDuration,
            },
          ]);
        };
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecordingAudio(true);

      audioTimerRef.current = setInterval(() => {
        setAudioDuration((d) => d + 1);
      }, 1000);
    } catch (e) {
      console.error('Audio recorder error:', e);
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecordingAudio) {
      audioRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    }
  };

  // Dispatch Send
  const handleSend = () => {
    if (!text.trim() && stagedFiles.length === 0) return;

    const fileDataMap: Record<string, string> = {};
    const mediaList: Partial<MediaItem>[] = stagedFiles.map((staged) => {
      fileDataMap[staged.id] = staged.base64;
      return {
        id: staged.id,
        type: staged.type,
        fileName: staged.file.name,
        fileSize: staged.file.size,
        mimeType: staged.file.type,
        caption: staged.caption,
        filter: staged.filter !== 'normal' ? staged.filter : undefined,
        isViewOnce,
        expiresInSeconds: isViewOnce ? viewOnceTimer : undefined,
        duration: staged.duration,
      };
    });

    onSendMessage(text.trim(), mediaList, fileDataMap);

    // Reset composer state
    setText('');
    setStagedFiles([]);
    setIsViewOnce(false);
    onTyping(false);
  };

  return (
    <div className="relative border-t border-slate-800 bg-slate-950 p-4 md:p-6">
      {/* Reply Quote Banner */}
      {replyContext && (
        <div className="flex items-center justify-between px-4 py-2.5 mb-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-indigo-400">Replying to {replyContext.senderName}:</span>
            <span className="text-slate-400 truncate">
              {replyContext.text || (replyContext.mediaType ? `[${replyContext.mediaType}]` : '')}
            </span>
          </div>
          <button onClick={onCancelReply} className="text-slate-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Staged Attachments Preview Strip */}
      {stagedFiles.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-3 mb-3 scrollbar-none">
          {stagedFiles.map((staged) => {
            const filterObj = MEDIA_FILTERS.find((f) => f.id === staged.filter);
            return (
              <div
                key={staged.id}
                className="relative group shrink-0 w-24 h-24 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-md"
              >
                {staged.type === 'video' ? (
                  <video src={staged.previewUrl} className={`w-full h-full object-cover ${filterObj?.css || ''}`} />
                ) : staged.type === 'audio' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-300">
                    <Mic className="w-6 h-6 text-indigo-400 mb-1" />
                    <span className="text-[10px] font-mono">{staged.duration || 0}s</span>
                  </div>
                ) : (
                  <img src={staged.previewUrl} alt="preview" className={`w-full h-full object-cover ${filterObj?.css || ''}`} />
                )}

                <button
                  type="button"
                  onClick={() => removeStagedFile(staged.id)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-950/80 hover:bg-red-600 text-white transition shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>

                {isViewOnce && (
                  <div className="absolute bottom-1.5 left-1.5 p-1 rounded-full bg-red-500 text-white">
                    <Flame className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 w-24 h-24 rounded-2xl border-2 border-dashed border-slate-800 hover:border-slate-600 flex flex-col items-center justify-center text-slate-400 hover:text-white transition gap-1 bg-slate-900/40"
          >
            <Plus className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] font-medium">Add more</span>
          </button>
        </div>
      )}

      {/* Filter Selector Strip when expanded */}
      {showFilterPicker && (
        <div className="flex items-center gap-1.5 pb-3 overflow-x-auto scrollbar-none">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Filter:
          </span>
          {MEDIA_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setActiveFilter(f.id);
                setStagedFiles((prev) => prev.map((s) => ({ ...s, filter: f.id })));
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                activeFilter === f.id
                  ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Box (Sleek Interface Style) */}
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl shadow-xl">
        {/* Hidden Multi-file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Quick Attach & Camera tool buttons */}
        <button
          type="button"
          id="btn-composer-attach"
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700/60 shrink-0"
          title="Attach Photos & Videos"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <button
          type="button"
          id="btn-composer-camera"
          onClick={onOpenLiveCamera}
          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700/60 shrink-0"
          title="Instant Live Camera"
        >
          <Camera className="w-4 h-4 text-indigo-400" />
        </button>

        <button
          type="button"
          id="btn-composer-view-once"
          onClick={() => setIsViewOnce(!isViewOnce)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition border shrink-0 ${
            isViewOnce
              ? 'bg-amber-500/20 border-amber-500/60 text-amber-400'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700/60 text-slate-400 hover:text-white'
          }`}
          title="View Once Ephemeral Mode"
        >
          <Flame className="w-4 h-4" />
        </button>

        <button
          type="button"
          id="btn-composer-filters"
          onClick={() => setShowFilterPicker(!showFilterPicker)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition border shrink-0 ${
            showFilterPicker
              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700/60 text-slate-400 hover:text-white'
          }`}
          title="Photo & Video Color Grading Filters"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Text Input area */}
        <div className="flex-1 min-w-0">
          {isRecordingAudio ? (
            <div className="flex items-center justify-between py-1 text-indigo-400 text-sm font-medium">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                <span>Recording voice memo... {audioDuration}s</span>
              </div>
              <button
                type="button"
                onClick={stopAudioRecording}
                className="px-3 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-semibold"
              >
                Done
              </button>
            </div>
          ) : (
            <textarea
              id="composer-input-textarea"
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${recipientName}...`}
              className="w-full bg-transparent border-none outline-none text-sm text-slate-100 placeholder:text-slate-500 resize-none max-h-28 scrollbar-none py-1.5 focus:ring-0"
            />
          )}
        </div>

        {/* Mic & Send Buttons */}
        <div className="flex items-center gap-2 pr-1">
          {!text.trim() && stagedFiles.length === 0 && (
            <button
              type="button"
              id="btn-mic-record"
              onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
              className={`p-2.5 rounded-xl transition border ${
                isRecordingAudio
                  ? 'bg-red-600 border-red-500 text-white animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Record Voice Memo"
            >
              {isRecordingAudio ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            id="btn-send-message"
            onClick={handleSend}
            disabled={!text.trim() && stagedFiles.length === 0}
            className={`px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition transform active:scale-95 flex items-center justify-center gap-1.5 ${
              text.trim() || stagedFiles.length > 0
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25 cursor-pointer'
                : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
            }`}
            title="Send Message"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
