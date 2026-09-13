import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSignIn, useUser } from '@clerk/clerk-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { BrainCircuit, Lock, Mail, ArrowRight, Sun, Moon, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { signIn, isLoaded: isSignInLoaded } = useSignIn();
  const { user: clerkUser, isLoaded: isUserLoaded, isSignedIn } = useUser();

  const { user, login, syncClerkUser } = useAuth();
  const { success, error } = useToast();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  // If already authenticated via JWT / session, navigate straight to staff dashboard
  useEffect(() => {
    if (user) {
      navigate('/staff/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // If already signed in via Clerk, automatically sync with backend and proceed
  useEffect(() => {
    if (isSignedIn && clerkUser && isUserLoaded) {
      const doClerkSync = async () => {
        try {
          const userEmail = clerkUser.primaryEmailAddress?.emailAddress;
          const userName = clerkUser.fullName || clerkUser.firstName || 'Faculty Staff';
          if (userEmail) {
            await syncClerkUser({
              email: userEmail,
              full_name: userName,
              clerk_id: clerkUser.id,
            });
            success(`Signed in as ${userName}`);
            navigate('/staff/dashboard');
          }
        } catch (err) {
          console.error('Clerk backend sync error:', err);
        }
      };
      doClerkSync();
    }
  }, [isSignedIn, clerkUser, isUserLoaded]);

  // Handle Google / Gmail OAuth via Clerk
  const handleGoogleLogin = async () => {
    if (!isSignInLoaded) return;
    setGoogleLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/login',
        redirectUrlComplete: '/staff/dashboard',
      });
    } catch (err) {
      console.error('Google OAuth error:', err);
      error(err.errors?.[0]?.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  // Handle standard Staff credentials login
  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      error('Please enter your staff email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      success('Authentication successful. Welcome to Staff Portal.');
      navigate('/staff/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid staff email or password credentials.';
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* Top Navbar / Controls */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2.5 rounded-xl glass-card border border-slate-700/80 text-slate-300 hover:text-amber-400 hover:border-amber-400/40 transition-all cursor-pointer shadow-md"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>
      </div>

      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 shadow-xl shadow-indigo-600/30 mb-4 animate-float">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Evaluation AI
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Intelligent Answer Sheet Evaluation Platform
          </p>
        </div>

        {/* Form Container */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/80">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-100">Staff Portal Authentication</h2>
            <p className="text-xs text-slate-400 mt-1">
              Sign in with institutional Google/Gmail or staff credentials.
            </p>
          </div>

          {/* Clerk Google / Gmail Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || !isSignInLoaded}
            className="w-full py-3 px-4 rounded-xl font-medium text-sm text-slate-200 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700 hover:border-indigo-500/50 transition-all flex items-center justify-center gap-3 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google / Gmail</span>
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-slate-900 px-3 text-slate-500 font-semibold">
                Or sign in with email
              </span>
            </div>
          </div>

          {/* Standard Staff Credentials Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="faculty@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full mt-2 py-3"
              icon={ArrowRight}
            >
              Sign In to Staff Dashboard
            </Button>
          </form>
        </div>

        {/* Student Portal Navigation */}
        <div className="text-center mt-6">
          <Link
            to="/student-portal"
            className="text-xs text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5 font-medium"
          >
            Access Student Answer Sheet Submission Portal &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
