import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, ConfidenceBadge } from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Award,
  BookOpen,
  User,
  MessageSquare,
  HelpCircle
} from 'lucide-react';

export const EvaluationDetail = () => {
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [teacherInputs, setTeacherInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    fetchSubmissionData();
  }, [submissionId]);

  const fetchSubmissionData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/submissions/${submissionId}`);
      setSubmission(res.data);
      setEvaluations(res.data.evaluations || []);

      // Initialize inputs for overrides
      const inputs = {};
      (res.data.evaluations || []).forEach((ev) => {
        inputs[ev.id] = {
          revised_mark: ev.final_mark !== null ? ev.final_mark : ev.marks_obtained,
          teacher_comment: ev.teacher_review?.teacher_comment || ''
        };
      });
      setTeacherInputs(inputs);
    } catch (err) {
      console.error(err);
      error('Failed to load submission evaluation details.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (evalId, field, val) => {
    setTeacherInputs((prev) => ({
      ...prev,
      [evalId]: {
        ...prev[evalId],
        [field]: field === 'revised_mark' ? parseFloat(val) || 0 : val
      }
    }));
  };

  const handleSaveOverride = async (ev) => {
    const data = teacherInputs[ev.id];
    if (!data) return;

    try {
      await api.put(`/evaluations/${ev.id}/teacher-review`, {
        revised_mark: data.revised_mark,
        teacher_comment: data.teacher_comment
      });
      success(`Mark updated for Question ${ev.question_number}!`);
      fetchSubmissionData();
    } catch (err) {
      error('Failed to save teacher override.');
    }
  };

  const handleAcceptAIMark = async (ev) => {
    try {
      await api.put(`/evaluations/${ev.id}/teacher-review`, {
        revised_mark: ev.marks_obtained,
        teacher_comment: 'Accepted AI evaluation.'
      });
      success(`Accepted AI mark for Question ${ev.question_number}!`);
      fetchSubmissionData();
    } catch (err) {
      error('Failed to accept AI mark.');
    }
  };

  const handleRerunEvaluation = async () => {
    if (!submission) return;
    setActionLoading(true);
    try {
      await api.post(`/evaluations/run/${submission.id}`);
      success('AI Evaluation workflow re-executed successfully!');
      fetchSubmissionData();
    } catch (err) {
      error('Failed to re-run evaluation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeAll = async () => {
    if (!submission) return;
    setActionLoading(true);
    try {
      await api.put(`/evaluations/submission/${submission.id}/finalize`);
      success('All marks finalized for this submission!');
      fetchSubmissionData();
    } catch (err) {
      error('Failed to finalize marks.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !submission) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back Button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/staff/submissions"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Submissions
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Human-in-the-Loop Evaluation Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Audit AI scores, inspect reasoning and missing concepts, and override marks with teacher commentary.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleRerunEvaluation}
            loading={actionLoading}
            icon={RotateCcw}
          >
            Re-run RAG Evaluation
          </Button>

          {submission.status !== 'FINALIZED' && (
            <Button
              variant="emerald"
              onClick={handleFinalizeAll}
              loading={actionLoading}
              icon={ShieldCheck}
            >
              Finalize Marks
            </Button>
          )}
        </div>
      </div>

      {/* Student Banner Card */}
      <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-indigo-950/40 dark:via-slate-900/80 dark:to-slate-900/60 shadow-md dark:shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{submission.student_name}</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700">
                {submission.register_number}
              </span>
              <StatusBadge status={submission.status} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <strong>Exam:</strong> {submission.exam_name} &bull; <strong>Class:</strong> {submission.class_name} ({submission.department})
            </p>
          </div>

          {/* Big Score Meter */}
          <div className="flex items-center gap-6 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="text-center">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Score</span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {submission.total_score} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">/ {submission.max_score}</span>
              </div>
            </div>
            <div className="text-center border-l border-slate-200 dark:border-slate-800 pl-6">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Percentage</span>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {submission.percentage}%
              </div>
            </div>
            {submission.rank && (
              <div className="text-center border-l border-slate-200 dark:border-slate-800 pl-6">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Class Rank</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  #{submission.rank}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Question-Wise Evaluation Cards */}
      <div className="space-y-6">
        {evaluations.map((ev, index) => {
          const inputs = teacherInputs[ev.id] || { revised_mark: ev.marks_obtained, teacher_comment: '' };
          const isOverridden = ev.is_overridden || (ev.final_mark !== null && ev.final_mark !== ev.marks_obtained);

          return (
            <div
              key={ev.id}
              className={`p-6 rounded-2xl border transition-all ${
                ev.needs_manual_review
                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40 shadow-lg shadow-amber-950/5 dark:shadow-amber-950/20'
                  : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                    Q{ev.question_number || index + 1}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {ev.topic || 'General'}
                  </span>
                  <ConfidenceBadge confidence={ev.confidence} />
                </div>

                <div className="flex items-center gap-3">
                  {ev.needs_manual_review && (
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5" /> Manual Review Flagged
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Max: {ev.max_marks} Marks
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div className="py-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {ev.question_text || `Question ${ev.question_number}`}
                </h4>
              </div>

              {/* Grid: Student Answer vs AI Reasoning */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
                {/* Extracted Student Answer */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Student Extracted Answer (PDF / OCR)
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
                    {ev.student_answer_text || 'No answer text extracted.'}
                  </p>
                </div>

                {/* AI Evaluation Output */}
                <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> AI Evaluation Breakdown
                    </span>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/20">
                      AI Mark: {ev.marks_obtained} / {ev.max_marks}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Reason:</span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5 leading-snug">{ev.reason}</p>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Feedback:</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-snug">{ev.feedback}</p>
                  </div>

                  {ev.missing_points && ev.missing_points.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Missing Concepts:</span>
                      <ul className="list-disc list-inside text-xs text-rose-700 dark:text-rose-300/90 mt-0.5 space-y-0.5">
                        {ev.missing_points.map((mp, i) => (
                          <li key={i}>{mp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Human-in-the-Loop Override Panel */}
              <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Teacher Review & Mark Finalization
                  </span>
                  {isOverridden && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                      Mark Overridden by Teacher
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Final Mark (Max {ev.max_marks})
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max={ev.max_marks}
                      value={inputs.revised_mark}
                      onChange={(e) => handleInputChange(ev.id, 'revised_mark', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Teacher Commentary / Rationale
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Accepted based on classroom explanation."
                      value={inputs.teacher_comment}
                      onChange={(e) => handleInputChange(ev.id, 'teacher_comment', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAcceptAIMark(ev)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  >
                    Accept AI Mark ({ev.marks_obtained}m)
                  </button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveOverride(ev)}
                    icon={CheckCircle2}
                  >
                    Save Teacher Override
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
