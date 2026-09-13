import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { ConfidenceBadge, StatusBadge } from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/Skeleton';
import { Modal } from '../../components/common/Modal';
import api from '../../services/api';
import {
  Sparkles,
  Search,
  Filter,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  FileText,
  Eye
} from 'lucide-react';

export const Evaluations = () => {
  const [submissions, setSubmissions] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedModalRow, setSelectedModalRow] = useState(null);

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

  // Flatten evaluations across all submissions
  const allEvaluationRows = [];
  submissions.forEach((sub) => {
    (sub.evaluations || []).forEach((ev) => {
      allEvaluationRows.push({
        ...ev,
        student_name: sub.student_name,
        register_number: sub.register_number,
        exam_name: sub.exam_name,
        submission_id: sub.id,
        submission_status: sub.status,
        student_answer_text: ev.student_answer_text || ''
      });
    });
  });

  const filteredRows = allEvaluationRows.filter((row) => {
    // Confidence filter
    if (confidenceFilter === 'HIGH' && row.confidence < 0.85) return false;
    if (confidenceFilter === 'MEDIUM' && (row.confidence < 0.70 || row.confidence >= 0.85)) return false;
    if (confidenceFilter === 'LOW' && row.confidence >= 0.70) return false;
    if (confidenceFilter === 'REVIEW' && !row.needs_manual_review) return false;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (row.student_name || '').toLowerCase().includes(q);
      const matchReg = (row.register_number || '').toLowerCase().includes(q);
      const matchTopic = (row.topic || '').toLowerCase().includes(q);
      const matchAnswer = (row.student_answer_text || '').toLowerCase().includes(q);
      return matchName || matchReg || matchTopic || matchAnswer;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-indigo-400" />
            AI Evaluations Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audit item-level AI scoring, student extracted answers from PDF images, and human-in-the-loop review alerts.
          </p>
        </div>

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

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
          <button
            onClick={() => setConfidenceFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              confidenceFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Items ({allEvaluationRows.length})
          </button>
          <button
            onClick={() => setConfidenceFilter('REVIEW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              confidenceFilter === 'REVIEW'
                ? 'bg-amber-600 text-white shadow'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Needs Review
          </button>
          <button
            onClick={() => setConfidenceFilter('LOW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              confidenceFilter === 'LOW'
                ? 'bg-rose-600 text-white shadow'
                : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            Low Conf (&lt;70%)
          </button>
          <button
            onClick={() => setConfidenceFilter('MEDIUM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              confidenceFilter === 'MEDIUM'
                ? 'bg-yellow-600 text-white shadow'
                : 'text-yellow-400 hover:text-yellow-300'
            }`}
          >
            Medium (70-85%)
          </button>
          <button
            onClick={() => setConfidenceFilter('HIGH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              confidenceFilter === 'HIGH'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            High (&gt;85%)
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student, reg no, answer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : filteredRows.length === 0 ? (
        <Card className="text-center py-12">
          <Sparkles className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">No Evaluations Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No question evaluations matched the selected filter.
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/95 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-5 font-semibold">Student</th>
                  <th className="py-3.5 px-5 font-semibold">Question & Topic</th>
                  <th className="py-3.5 px-5 font-semibold">AI Mark</th>
                  <th className="py-3.5 px-5 font-semibold">Final Mark</th>
                  <th className="py-3.5 px-5 font-semibold">Confidence</th>
                  <th className="py-3.5 px-5 font-semibold min-w-[240px] max-w-sm">Extracted Student Answer</th>
                  <th className="py-3.5 px-5 font-semibold min-w-[260px] max-w-sm">AI Reasoning & Feedback</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-100">{row.student_name}</div>
                      <div className="text-[11px] font-mono text-indigo-300">{row.register_number}</div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-200">Question {row.question_number}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{row.topic || 'General'}</div>
                    </td>
                    <td className="py-4 px-5 font-bold text-slate-300">
                      {row.marks_obtained} / {row.max_marks}
                    </td>
                    <td className="py-4 px-5 font-extrabold text-emerald-400 text-sm">
                      {row.final_mark !== null ? row.final_mark : row.marks_obtained} / {row.max_marks}
                    </td>
                    <td className="py-4 px-5">
                      <ConfidenceBadge confidence={row.confidence} />
                    </td>
                    {/* Extracted Student Answer Column (Before AI Reasoning & Feedback) */}
                    <td className="py-4 px-5 max-w-sm">
                      {row.student_answer_text && row.student_answer_text.trim() && row.student_answer_text.toLowerCase() !== 'unanswered' ? (
                        <div 
                          onClick={() => setSelectedModalRow(row)}
                          className="group bg-slate-50 dark:bg-slate-950/80 hover:bg-slate-100 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-500/50 rounded-xl p-3 cursor-pointer transition-all shadow-sm hover:shadow-indigo-500/10"
                          title="Click to view full extracted answer"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                              <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              Extracted from PDF
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1 transition-colors">
                              <Eye className="w-3 h-3" /> Full View
                            </span>
                          </div>
                          <p className="text-xs text-slate-750 dark:text-slate-200 line-clamp-3 leading-relaxed font-sans whitespace-pre-wrap break-words">
                            {row.student_answer_text}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 italic bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg">
                          Unanswered / Nil
                        </span>
                      )}
                    </td>
                    {/* AI Reasoning & Feedback Column */}
                    <td className="py-4 px-5 max-w-sm">
                      <div className="space-y-1.5">
                        <div className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed" title={row.reason}>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-300">Reason:</span> {row.reason}
                        </div>
                        {row.feedback && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 italic" title={row.feedback}>
                            <span className="font-medium text-slate-700 dark:text-slate-300">Feedback:</span> {row.feedback}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <Link
                        to={`/staff/evaluations/${row.submission_id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 hover:text-white transition-all border border-slate-300 dark:border-slate-700 hover:border-indigo-500"
                      >
                        Review &bull; HITL
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Full Answer Modal */}
      <Modal
        isOpen={!!selectedModalRow}
        onClose={() => setSelectedModalRow(null)}
        title={selectedModalRow ? `Question ${selectedModalRow.question_number} - Extracted Answer` : ''}
        subtitle={selectedModalRow ? `${selectedModalRow.student_name} (${selectedModalRow.register_number}) • ${selectedModalRow.topic || 'General'}` : ''}
        maxWidth="max-w-2xl"
      >
        {selectedModalRow && (
          <div className="space-y-5">
            {/* Question */}
            {selectedModalRow.question_text && (
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Question Prompt ({selectedModalRow.max_marks} Marks)
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                  {selectedModalRow.question_text}
                </p>
              </div>
            )}

            {/* Extracted Answer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Student's Extracted Answer Text
                </span>
                <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/20 font-bold">
                  Score: {selectedModalRow.final_mark !== null ? selectedModalRow.final_mark : selectedModalRow.marks_obtained} / {selectedModalRow.max_marks}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900/40 rounded-xl p-4 text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedModalRow.student_answer_text || 'No answer text extracted.'}
              </div>
            </div>

            {/* AI Reasoning */}
            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> AI Evaluation Reasoning
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                {selectedModalRow.reason}
              </p>
              {selectedModalRow.feedback && (
                <div className="pt-1 text-xs text-slate-600 dark:text-slate-400 italic">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Feedback:</span> {selectedModalRow.feedback}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedModalRow(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
              <Link
                to={`/staff/evaluations/${selectedModalRow.submission_id}`}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                Open in Review Studio &bull; HITL
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
