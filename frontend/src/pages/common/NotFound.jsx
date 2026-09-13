import React from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, Home, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-md p-8 rounded-3xl glass-card border border-slate-700/80 shadow-2xl text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
          <BrainCircuit className="w-8 h-8" />
        </div>

        <div>
          <div className="text-5xl font-black text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-300 bg-clip-text">
            404
          </div>
          <h2 className="text-lg font-bold text-slate-100 mt-2">Page Not Found</h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            The evaluation route or resource you requested could not be located on the server.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/staff/dashboard"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <Home className="w-4 h-4" />
            Staff Dashboard
          </Link>
          <Link
            to="/student-portal"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            Student Portal
          </Link>
        </div>
      </div>
    </div>
  );
};
