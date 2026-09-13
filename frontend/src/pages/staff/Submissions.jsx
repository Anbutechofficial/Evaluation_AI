import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { TableSkeleton } from '../../components/common/Skeleton';
import api from '../../services/api';
import {
  Send,
  Search,
  Filter,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RotateCcw
} from 'lucide-react';

export const Submissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [selectedExamId]);

  const fetchExams = async () => {
    try {
      const res = await api.get('/exams');
      setExams(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const url = selectedExamId ? `/submissions?exam_id=${selectedExamId}` : '/submissions';
      const res = await api.get(url);
      setSubmissions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    // Tab filter
    if (activeTab === 'MANUAL_REVIEW' && sub.status !== 'MANUAL_REVIEW') return false;
    if (activeTab === 'EVALUATED' && sub.status !== 'EVALUATED') return false;
    if (activeTab === 'FINALIZED' && sub.status !== 'FINALIZED') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = sub.student_name.toLowerCase().includes(q);
      const matchReg = sub.register_number.toLowerCase().includes(q);
      return matchName || matchReg;
    }
    return true;
  });

  const countPending = submissions.filter((s) => s.status === 'MANUAL_REVIEW').length;
  const countEvaluated = submissions.filter((s) => s.status === 'EVALUATED').length;
  const countFinalized = submissions.filter((s) => s.status === 'FINALIZED').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Student Submissions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse student answer sheets, RAG evaluations, confidence scores, and manual review flags.
          </p>
        </div>

        {/* Filter by Exam */}
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Examinations</option>
          {exams.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({submissions.length})
          </button>
          <button
            onClick={() => setActiveTab('MANUAL_REVIEW')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'MANUAL_REVIEW'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Pending Review ({countPending})
          </button>
          <button
            onClick={() => setActiveTab('EVALUATED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'EVALUATED'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Evaluated ({countEvaluated})
          </button>
          <button
            onClick={() => setActiveTab('FINALIZED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'FINALIZED'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Finalized ({countFinalized})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student or reg no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Submissions Table */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : filteredSubmissions.length === 0 ? (
        <Card className="text-center py-12">
          <Send className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">No Submissions Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'No students matched your search criteria.' : 'No student answer sheets have been submitted yet.'}
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-5 font-semibold">Rank</th>
                  <th className="py-3.5 px-5 font-semibold">Student Name</th>
                  <th className="py-3.5 px-5 font-semibold">Register No</th>
                  <th className="py-3.5 px-5 font-semibold">Class / Dept</th>
                  <th className="py-3.5 px-5 font-semibold">Score</th>
                  <th className="py-3.5 px-5 font-semibold">Percentage</th>
                  <th className="py-3.5 px-5 font-semibold">Status</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-5 font-bold text-slate-400">
                      #{sub.rank || '-'}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-100 text-sm">{sub.student_name}</div>
                      <div className="text-[11px] text-slate-400">{sub.file_name}</div>
                    </td>
                    <td className="py-4 px-5 font-mono text-indigo-300 font-semibold">
                      {sub.register_number}
                    </td>
                    <td className="py-4 px-5 text-slate-300">
                      {sub.class_name}
                    </td>
                    <td className="py-4 px-5 font-extrabold text-slate-100 text-sm">
                      {sub.total_score} / {sub.max_score}
                    </td>
                    <td className="py-4 px-5 font-bold text-indigo-400">
                      {sub.percentage}%
                    </td>
                    <td className="py-4 px-5">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <Link
                        to={`/staff/evaluations/${sub.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                      >
                        HITL Review <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
