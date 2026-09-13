import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { CardSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import {
  GraduationCap,
  Plus,
  FileText,
  Clock,
  HelpCircle,
  Award,
  Users,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const Exams = ({ onNewExamClick }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/exams');
      setExams(res.data);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (exam) => {
    const nextStatus = exam.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await api.put(`/exams/${exam.id}`, { status: nextStatus });
      success(`Exam ${nextStatus === 'PUBLISHED' ? 'published for student submissions' : 'moved to draft mode'}.`);
      fetchExams();
    } catch (err) {
      error('Failed to update status.');
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this examination? This will remove all associated submissions and questions.')) {
      return;
    }
    try {
      await api.delete(`/exams/${examId}`);
      success('Examination deleted.');
      fetchExams();
    } catch (err) {
      error('Failed to delete examination.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Examinations & Assessments
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage question papers, rubric standards, and active examination portals.
          </p>
        </div>

        <Button onClick={onNewExamClick} icon={Plus}>
          Create Examination
        </Button>
      </div>

      {/* Grid of Exams */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : exams.length === 0 ? (
        <Card className="text-center py-12">
          <GraduationCap className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">No Examinations Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Create your first examination to upload question papers and enable AI RAG evaluation.
          </p>
          <Button onClick={onNewExamClick} className="mt-4" icon={Plus}>
            Create First Exam
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <Card key={exam.id} hover className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                    {exam.subject}
                  </span>
                  <StatusBadge status={exam.status} />
                </div>

                <h3 className="text-base font-bold text-slate-100 line-clamp-2">
                  {exam.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {exam.class_name} &bull; {exam.department}
                </p>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-2 mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Questions</span>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{exam.total_questions}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Max Marks</span>
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{exam.total_marks}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Submissions</span>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{exam.submissions_count || 0}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 mt-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <Link
                  to={`/staff/question-papers?exam_id=${exam.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Edit Rubrics & Questions &rarr;
                </Link>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(exam)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      exam.status === 'PUBLISHED'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                  >
                    {exam.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </button>

                  <button
                    onClick={() => handleDeleteExam(exam.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors hover:bg-slate-800"
                    title="Delete Exam"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
