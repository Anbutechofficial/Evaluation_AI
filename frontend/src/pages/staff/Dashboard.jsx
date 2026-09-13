import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader } from '../../components/common/Card';
import { StatusBadge, ConfidenceBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { CardSkeleton, TableSkeleton } from '../../components/common/Skeleton';
import api from '../../services/api';
import {
  FileText,
  Send,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  GraduationCap,
  Clock,
  ChevronRight,
  ShieldAlert,
  ClipboardList
} from 'lucide-react';

export const Dashboard = ({ onNewExamClick }) => {
  const [submissions, setSubmissions] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedExamId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [submissionsRes, examsRes] = await Promise.all([
        api.get(selectedExamId ? `/submissions?exam_id=${selectedExamId}` : '/submissions'),
        api.get('/exams')
      ]);

      setSubmissions(submissionsRes.data || []);
      setExams(examsRes.data || []);
    } catch (err) {
      console.error('Error fetching evaluation data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real calculations directly from database submissions
  const totalSubmissions = submissions.length;
  const evaluatedList = submissions.filter(s => s.status === 'EVALUATED' || s.status === 'FINALIZED');
  const evaluatedCount = evaluatedList.length;
  const pendingReviewList = submissions.filter(s => s.needs_teacher_review || s.status === 'PENDING_REVIEW');
  const pendingReviewCount = pendingReviewList.length;
  const finalizedCount = submissions.filter(s => s.status === 'FINALIZED').length;

  const averageScore = evaluatedList.length > 0
    ? (evaluatedList.reduce((acc, s) => acc + (s.final_score != null ? s.final_score : (s.total_score || 0)), 0) / evaluatedList.length).toFixed(1)
    : null;

  if (loading && submissions.length === 0 && exams.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header & Exam Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Evaluation Operations Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time RAG answer sheet grading, confidence scoring, and human-in-the-loop review.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Examinations ({exams.length})</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>

          <Button size="sm" onClick={onNewExamClick}>
            + Create Exam
          </Button>
        </div>
      </div>

      {/* 4 Core Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Total Submissions</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-100">
              {totalSubmissions}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Answer papers registered in system</p>
          </div>
        </Card>

        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">AI Evaluated</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-100">
              {evaluatedCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Graded via multi-criteria rubrics</p>
          </div>
        </Card>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pending Review</span>
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-100">
              {pendingReviewCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Flagged for faculty verification</p>
          </div>
        </Card>

        <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Finalized Papers</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-100">
              {finalizedCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {averageScore ? `Average Score: ${averageScore}` : 'Marks locked & published'}
            </p>
          </div>
        </Card>
      </div>

      {/* Faculty Action Queues: Pending Review Highlight */}
      {pendingReviewList.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-950/15">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  Human-in-the-Loop Review Queue ({pendingReviewList.length} Papers Requiring Verification)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI confidence was below threshold or flags were raised during evaluation.
                </p>
              </div>
            </div>

            <Link to="/staff/evaluations">
              <Button size="sm" variant="outline" className="text-amber-300 border-amber-500/30 hover:bg-amber-500/10">
                Review Queue &rarr;
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {pendingReviewList.slice(0, 3).map((sub) => (
              <div
                key={sub.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{sub.student_name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Reg: {sub.register_number}</div>
                </div>
                <Link
                  to={`/staff/evaluations/${sub.id}`}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  Grade / Verify
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Active Examinations Overview */}
      <Card>
        <CardHeader
          title="Active Examination Sessions"
          subtitle="Configured question papers, rubrics, and answer sheet ingestion status."
          action={
            <Link to="/staff/exams" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1">
              Manage Exams <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 flex flex-col justify-between hover:border-indigo-500/30 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                    {exam.subject}
                  </span>
                  <StatusBadge status={exam.status} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{exam.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">{exam.class_name}</p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                <span>{exam.total_questions || 10} Questions &bull; {exam.total_marks || 20} Marks</span>
                <Link
                  to="/staff/question-papers"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                >
                  Rubrics &rarr;
                </Link>
              </div>
            </div>
          ))}

          {exams.length === 0 && (
            <div className="col-span-full text-center py-8 text-slate-500 text-xs">
              No examination sessions created yet. Click "+ Create Exam" to configure your first evaluation.
            </div>
          )}
        </div>
      </Card>

      {/* Recent Submissions Table */}
      <Card>
        <CardHeader
          title="Recent Answer Sheet Submissions"
          subtitle="Real-time intake of student PDFs and their agentic scoring status."
          action={
            <Link
              to="/staff/submissions"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        />

        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-6">Reg Number</th>
                <th className="py-3 px-6">Student Name</th>
                <th className="py-3 px-6">Class / Dept</th>
                <th className="py-3 px-6">Evaluation Status</th>
                <th className="py-3 px-6 text-center">Marks</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {submissions.slice(0, 8).map((sub) => {
                const score = sub.final_score != null ? sub.final_score : sub.total_score;
                return (
                  <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-6 font-mono font-semibold text-slate-200">
                      {sub.register_number}
                    </td>
                    <td className="py-3 px-6 font-medium text-slate-100">
                      {sub.student_name}
                    </td>
                    <td className="py-3 px-6 text-slate-400">
                      {sub.class_name}
                    </td>
                    <td className="py-3 px-6">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-3 px-6 text-center font-bold">
                      {score != null ? (
                        <span className="text-emerald-400 font-mono">{score.toFixed(1)} / 20.0</span>
                      ) : (
                        <span className="text-slate-500 font-mono">--</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <Link
                        to={`/staff/evaluations/${sub.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        Review
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {submissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No student submissions found. Direct students to the Student Portal to upload answer sheets.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
