// components/AuthModal.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'verify-otp' | 'forgot-password' | 'reset-password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => setOtpCooldown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // ── SIGNUP ───────────────────────────────────────────────────────────────
  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/formulagpt/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');

      setAuthMode('verify-otp');
      setSuccessMessage('Check your email for the verification code.');
      setOtpCooldown(60);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  // ── LOGIN ────────────────────────────────────────────────────────────────
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      // Step 1: Check Prisma emailVerified BEFORE attempting Supabase login.
      // Since we create Supabase users with email_confirm: true, Supabase will
      // happily let unverified users log in — so Prisma is our real gate.
      const checkRes = await fetch('/api/formulagpt/check-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();

      if (!checkData.verified) {
        throw new Error('Please verify your email first. Check your inbox for the OTP code.');
      }

      // Step 2: Prisma says verified — now sign in with Supabase
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      resetAndClose();
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  // ── VERIFY OTP ───────────────────────────────────────────────────────────
  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    // Snapshot before any state resets
    const currentEmail = email;
    const currentPassword = password;

    try {
      const res = await fetch('/api/formulagpt/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail, otp, password: currentPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setSuccessMessage('Email verified! Logging you in...');

      // Path 1: server returned a session — use it directly
      if (data.session?.access_token && data.session?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (!sessionError) {
          setTimeout(() => resetAndClose(), 800);
          return;
        }
        console.error('[verify-otp] setSession error:', sessionError);
      }

      // Path 2: no session returned — sign in client-side
      // Safe because signup uses email_confirm: true, so Supabase won't block
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });

      if (loginError) {
        console.error('[verify-otp] Fallback login error:', loginError.message);
        setSuccessMessage('');
        setAuthError('Email verified! Please log in using the form below.');
        setAuthMode('login');
        setEmail(currentEmail);
        setPassword('');
        return;
      }

      setTimeout(() => resetAndClose(), 800);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  // ── RESEND OTP ───────────────────────────────────────────────────────────
  async function handleResendOtp() {
    if (otpCooldown > 0) return;
    setAuthError('');
    setSuccessMessage('');

    try {
      const endpoint = authMode === 'reset-password'
        ? '/api/formulagpt/forgot-password'
        : '/api/formulagpt/resend-otp';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend code');

      setSuccessMessage('New code sent to your email!');
      setOtpCooldown(60);
    } catch (err: any) {
      setAuthError(err.message);
    }
  }

  // ── FORGOT PASSWORD ──────────────────────────────────────────────────────
  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/formulagpt/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset code');

      setAuthMode('reset-password');
      setSuccessMessage('Reset code sent to your email!');
      setOtpCooldown(60);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  // ── RESET PASSWORD ───────────────────────────────────────────────────────
  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/formulagpt/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setSuccessMessage('Password reset! You can now log in.');
      setOtp('');
      setNewPassword('');
      setTimeout(() => { setAuthMode('login'); setSuccessMessage(''); }, 2000);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  // ── GOOGLE ───────────────────────────────────────────────────────────────
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/tools/formulagpt`
          : undefined,
      },
    });
    if (error) setAuthError(error.message);
    else onClose();
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────
  function resetAndClose() {
    onClose();
    setAuthMode(initialMode);
    setAuthError('');
    setSuccessMessage('');
    setEmail('');
    setPassword('');
    setOtp('');
    setNewPassword('');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {authMode === 'login' && 'Login'}
            {authMode === 'signup' && 'Sign Up'}
            {authMode === 'verify-otp' && 'Verify Email'}
            {authMode === 'forgot-password' && 'Forgot Password'}
            {authMode === 'reset-password' && 'Reset Password'}
          </h2>
          <button onClick={resetAndClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl leading-none"
            aria-label="Close">✕</button>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{authError}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-600 dark:text-green-400 text-sm">{successMessage}</p>
          </div>
        )}

        {/* LOGIN */}
        {authMode === 'login' && (
          <>
            <button onClick={signInWithGoogle} type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all mb-4">
              <GoogleIcon /> Continue with Google
            </button>
            <Divider />
            <form onSubmit={handleLogin} className="space-y-4">
              <EmailField value={email} onChange={setEmail} />
              <div>
                <PasswordField value={password} onChange={setPassword} label="Password" />
                <div className="text-right mt-1">
                  <button type="button"
                    onClick={() => { setAuthMode('forgot-password'); setAuthError(''); setSuccessMessage(''); }}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                    Forgot password?
                  </button>
                </div>
              </div>
              <SubmitButton loading={authLoading} label="Login" loadingLabel="Please wait..." />
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => { setAuthMode('signup'); setAuthError(''); setSuccessMessage(''); }}
                className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline">
                Don't have an account? Sign Up
              </button>
            </div>
          </>
        )}

        {/* SIGNUP */}
        {authMode === 'signup' && (
          <>
            <button onClick={signInWithGoogle} type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all mb-4">
              <GoogleIcon /> Continue with Google
            </button>
            <Divider />
            <form onSubmit={handleSignup} className="space-y-4">
              <EmailField value={email} onChange={setEmail} />
              <div>
                <PasswordField value={password} onChange={setPassword} label="Password" minLength={6} />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must be at least 6 characters</p>
              </div>
              <SubmitButton loading={authLoading} label="Sign Up" loadingLabel="Please wait..." />
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => { setAuthMode('login'); setAuthError(''); setSuccessMessage(''); }}
                className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline">
                Already have an account? Login
              </button>
            </div>
          </>
        )}

        {/* VERIFY OTP */}
        {authMode === 'verify-otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm text-center mb-2">
              We sent a 6-digit code to <strong>{email}</strong>
            </p>
            <OtpField value={otp} onChange={setOtp} />
            <SubmitButton loading={authLoading} disabled={otp.length !== 6} label="Verify Email" loadingLabel="Verifying..." />
            <div className="text-center space-y-2">
              <button type="button" onClick={handleResendOtp} disabled={otpCooldown > 0}
                className="block w-full text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50">
                {otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : "Didn't receive the code? Resend"}
              </button>
              <button type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); setSuccessMessage(''); }}
                className="block w-full text-sm text-gray-500 dark:text-gray-400 hover:underline">
                Back to login
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD */}
        {authMode === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm text-center mb-2">
              Enter your email and we'll send a reset code
            </p>
            <EmailField value={email} onChange={setEmail} />
            <SubmitButton loading={authLoading} label="Send Reset Code" loadingLabel="Sending..." />
            <div className="text-center">
              <button type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); setSuccessMessage(''); }}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                Back to login
              </button>
            </div>
          </form>
        )}

        {/* RESET PASSWORD */}
        {authMode === 'reset-password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm text-center mb-2">
              Enter the code sent to <strong>{email}</strong> and your new password
            </p>
            <OtpField value={otp} onChange={setOtp} />
            <div>
              <PasswordField value={newPassword} onChange={setNewPassword} label="New Password" minLength={6} />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must be at least 6 characters</p>
            </div>
            <SubmitButton loading={authLoading} disabled={otp.length !== 6} label="Reset Password" loadingLabel="Resetting..." />
            <div className="text-center space-y-2">
              <button type="button" onClick={handleResendOtp} disabled={otpCooldown > 0}
                className="block w-full text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50">
                {otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : "Didn't receive the code? Resend"}
              </button>
              <button type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); setSuccessMessage(''); }}
                className="block w-full text-sm text-gray-500 dark:text-gray-400 hover:underline">
                Back to login
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.8055 10.2292C19.8055 9.55056 19.7501 8.86667 19.6306 8.19833H10.2V12.0492H15.6014C15.3773 13.2911 14.6571 14.3898 13.6026 15.0875V17.5867H16.8251C18.7173 15.8449 19.8055 13.2728 19.8055 10.2292Z" fill="#4285F4"/>
      <path d="M10.2 20C12.9523 20 15.2705 19.1045 16.8295 17.5867L13.607 15.0875C12.7053 15.6972 11.5492 16.0428 10.2044 16.0428C7.54264 16.0428 5.28653 14.2828 4.49516 11.9167H1.1709V14.4928C2.77896 17.6883 6.32665 20 10.2 20Z" fill="#34A853"/>
      <path d="M4.49083 11.9167C4.07391 10.6748 4.07391 9.33008 4.49083 8.08817V5.51199H1.17096C-0.195426 8.23733 -0.195426 11.7676 1.17096 14.4929L4.49083 11.9167Z" fill="#FBBC04"/>
      <path d="M10.2 3.95717C11.6211 3.93478 13.0008 4.47311 14.0409 5.45833L16.8948 2.60428C15.1826 0.990498 12.9347 0.0949966 10.2 0.12222C6.32665 0.12222 2.77896 2.43389 1.1709 5.51194L4.49077 8.08811C5.27783 5.71689 7.53828 3.95717 10.2 3.95717Z" fill="#EA4335"/>
    </svg>
  );
}

function Divider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200 dark:border-gray-600"/>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400">Or continue with email</span>
      </div>
    </div>
  );
}

function EmailField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Email</label>
      <input type="email" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="your@email.com" required
        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"/>
    </div>
  );
}

function PasswordField({ value, onChange, label, minLength }: {
  value: string; onChange: (v: string) => void; label: string; minLength?: number;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">{label}</label>
      <input type="password" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••" required minLength={minLength}
        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"/>
    </div>
  );
}

function OtpField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Verification Code</label>
      <input type="text" inputMode="numeric" value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000" required maxLength={6}
        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-2xl tracking-widest"/>
    </div>
  );
}

function SubmitButton({ loading, disabled, label, loadingLabel }: {
  loading: boolean; disabled?: boolean; label: string; loadingLabel: string;
}) {
  return (
    <button type="submit" disabled={loading || disabled}
      className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
      {loading ? loadingLabel : label}
    </button>
  );
}