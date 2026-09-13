import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useClerk } from '@clerk/clerk-react';
import { LogOut, Plus, Sun, Moon, Sparkles } from 'lucide-react';

export const Header = ({ onNewExamClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const clerk = useClerk();

  const handleLogout = async () => {
    try {
      if (clerk?.loaded) {
        await clerk.signOut();
      }
    } catch (e) {
      // ignore
    }
    logout();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning, Faculty 👋';
    if (hour < 17) return 'Good Afternoon, Faculty 👋';
    return 'Good Evening, Faculty 👋';
  };

  return (
    <header className="h-18 glass-panel border-b border-slate-800/80 sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Greeting & Subtitle */}
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            {getGreeting()}
          </h2>
          <p className="text-xs text-slate-400">
            Intelligent Agentic Answer Sheet Evaluation System
          </p>
        </div>
      </div>

      {/* Right Controls & Profile */}
      <div className="flex items-center gap-3">
        {/* Dark / Light Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2 rounded-xl glass-card border border-slate-700/70 text-slate-300 hover:text-amber-400 hover:border-amber-400/40 transition-all cursor-pointer shadow-sm"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>

        {onNewExamClick && (
          <button
            onClick={onNewExamClick}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 border border-indigo-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Exam
          </button>
        )}

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'F'}
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-semibold text-slate-200">
              {user?.full_name || 'Faculty Evaluator'}
            </span>
            <span className="text-[10px] text-indigo-400 font-medium">
              {user?.role || 'STAFF'} &bull; Evaluator
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors ml-1 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
