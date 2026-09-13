import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  Users,
  Send,
  Award,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  Bot
} from 'lucide-react';

export const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/staff/dashboard' },
    { label: 'Examinations', icon: GraduationCap, path: '/staff/exams' },
    { label: 'Question Papers', icon: FileText, path: '/staff/question-papers' },
    { label: 'Submissions', icon: Send, path: '/staff/submissions' },
    { label: 'AI Evaluations', icon: Sparkles, path: '/staff/evaluations' },
    { label: 'Mark Statement', icon: Award, path: '/staff/mark-statement' },
    { label: 'Settings', icon: Settings, path: '/staff/settings' },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen glass-panel border-r border-slate-800/80 transition-all duration-300 flex flex-col justify-between ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between p-4.5 border-b border-slate-800/80 h-18">
          <div className="flex items-center gap-3 overflow-hidden px-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-600/30 flex-shrink-0">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:via-indigo-100 dark:to-indigo-300 dark:bg-clip-text">
                  Evaluation AI
                </span>
                <span className="text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
                  Agentic RAG System
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors hidden md:flex items-center justify-center"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group relative ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`} />
                {!isCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {/* Tooltip on collapsed mode */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-slate-100 text-xs rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Student Mode Switcher */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80">
        <NavLink
          to="/student-portal"
          target="_blank"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 dark:hover:bg-emerald-900/40 transition-colors group relative ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col text-left">
              <span className="text-emerald-900 dark:text-emerald-200">Student Portal</span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400/80 font-normal">Open in new tab &rarr;</span>
            </div>
          )}
          {isCollapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-emerald-300 text-xs rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              Student Portal
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  );
};
