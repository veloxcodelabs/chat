import React, { useState, useEffect } from 'react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  ArrowRight,
  AlertCircle,
  Camera
} from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
  availableUsers: User[];
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onAuthSuccess,
  availableUsers,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Registration form state
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regBio, setRegBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setErrorMsg(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  // Handle Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim()) {
      setErrorMsg('Please enter your username or handle.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.user) {
        setErrorMsg(data.error || 'Failed to log in. Please check username.');
        setIsLoading(false);
        return;
      }

      // Successful login
      localStorage.setItem('prism_logged_user_id', data.user.id);
      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regDisplayName.trim() || !regUsername.trim()) {
      setErrorMsg('Display name and handle are required.');
      return;
    }

    if (regPassword && regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: regDisplayName.trim(),
          username: regUsername.trim(),
          password: regPassword || undefined,
          avatar: selectedAvatar,
          bio: regBio.trim() || 'Media Creator & Visual Artist',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.user) {
        setErrorMsg(data.error || 'Registration failed. Username may be taken.');
        setIsLoading(false);
        return;
      }

      // Successful registration
      localStorage.setItem('prism_logged_user_id', data.user.id);
      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      console.error('Register error:', err);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Account Picker Login
  const handleQuickLogin = (user: User) => {
    setLoginUsername(user.username);
    localStorage.setItem('prism_logged_user_id', user.id);
    onAuthSuccess(user);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      id="auth-modal-backdrop" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="relative w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
              </h3>
              <p className="text-xs text-slate-400">
                Private Media & Direct Video Sharing
              </p>
            </div>
          </div>
          <button
            id="btn-close-auth-modal"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Login / Register) */}
        <div className="px-6 pt-4">
          <div className="flex items-center p-1 rounded-2xl bg-slate-950/80 border border-slate-800">
            <button
              id="tab-btn-login"
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>

            <button
              id="tab-btn-register"
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-4">
          {mode === 'login' ? (
            /* ===== LOGIN FORM ===== */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Username or Handle
                </label>
                <input
                  id="input-login-username"
                  type="text"
                  required
                  placeholder="e.g. you or elena_v"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="input-login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Enter account password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Logging In...</span>
                ) : (
                  <>
                    <span>Log In to Direct Messages</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick One-Click Demo Profiles */}
              <div className="pt-3 border-t border-slate-800">
                <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-2.5">
                  Or Instant Sign-In as Demo Creator:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {availableUsers.slice(0, 4).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickLogin(u)}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-left transition group"
                    >
                      <img
                        src={u.avatar}
                        alt={u.displayName}
                        className="w-7 h-7 rounded-full object-cover border border-slate-700"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 truncate">
                          {u.displayName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">@{u.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            /* ===== REGISTER FORM ===== */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Select Profile Avatar
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {AVATAR_PRESETS.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="Preset option"
                      onClick={() => setSelectedAvatar(url)}
                      className={`w-10 h-10 rounded-full object-cover cursor-pointer border-2 transition ${
                        selectedAvatar === url
                          ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/30'
                          : 'border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Display Name
                  </label>
                  <input
                    id="input-reg-displayname"
                    type="text"
                    required
                    placeholder="e.g. Jordan Day"
                    value={regDisplayName}
                    onChange={(e) => setRegDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Handle / Username
                  </label>
                  <input
                    id="input-reg-username"
                    type="text"
                    required
                    placeholder="e.g. jordan_d"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tagline / Bio (Optional)
                </label>
                <input
                  id="input-reg-bio"
                  type="text"
                  placeholder="e.g. Visual Director & Photographer 🎬"
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    id="input-reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="input-reg-confirmpassword"
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-show-pw"
                  checked={showRegPassword}
                  onChange={(e) => setShowRegPassword(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="chk-show-pw" className="text-xs text-slate-400 cursor-pointer">
                  Show passwords
                </label>
              </div>

              <button
                id="btn-submit-register"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Registering...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create Account & Start Sharing</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Security Note */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted Account & Private Key Protocol</span>
        </div>
      </div>
    </div>
  );
};
