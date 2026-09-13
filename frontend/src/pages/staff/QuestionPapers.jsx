import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { RubricEditorModal } from '../../components/exam/RubricEditorModal';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import {
  FileText,
  UploadCloud,
  Sparkles,
  Edit3,
  Plus,
  ShieldCheck,
  Tag,
  BookOpen,
  CheckCircle2,
  Clock,
  Building,
  GraduationCap,
  Layers,
  AlertCircle,
  HelpCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';

export const QuestionPapers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(searchParams.get('exam_id') || '');
  const [currentExam, setCurrentExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  // Create Exam Form State
  const [newExamData, setNewExamData] = useState({
    name: '',
    subject: '',
    class_name: '',
    department: '',
    duration_minutes: 90
  });
  const [newExamFile, setNewExamFile] = useState(null);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchExamDetails(selectedExamId);
      setSearchParams({ exam_id: selectedExamId });
    }
  }, [selectedExamId]);

  const fetchExams = async () => {
    try {
      const res = await api.get('/exams');
      setExams(res.data);
      if (res.data.length > 0 && !selectedExamId) {
        setSelectedExamId(res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
    }
  };

  const fetchExamDetails = async (examId) => {
    setLoading(true);
    try {
      const [examRes, questionsRes] = await Promise.all([
        api.get(`/exams/${examId}`),
        api.get(`/questions/exam/${examId}`)
      ]);
      setCurrentExam(examRes.data);
      setQuestions(questionsRes.data);
    } catch (err) {
      console.error('Error fetching exam details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      error('Please select a valid PDF file.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/exams/${selectedExamId}/upload-question-paper`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      success('Question paper extracted! Ideal benchmark model answers formulated by LLM.');
      fetchExamDetails(selectedExamId);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to process question paper.';
      error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateWithPdf = async (e) => {
    e.preventDefault();
    if (!newExamData.name || !newExamData.subject || !newExamFile) {
      error('Please fill in exam details and attach a Question Paper PDF.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('name', newExamData.name);
    formData.append('subject', newExamData.subject);
    formData.append('class_name', newExamData.class_name || 'General');
    formData.append('department', newExamData.department || 'General');
    formData.append('duration_minutes', newExamData.duration_minutes);
    formData.append('file', newExamFile);

    try {
      const res = await api.post('/exams/create-with-question-paper', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      success('Exam created! LLM successfully extracted questions and formulated ideal model answers.');
      setIsCreateModalOpen(false);
      setNewExamData({ name: '', subject: '', class_name: '', department: '', duration_minutes: 90 });
      setNewExamFile(null);
      await fetchExams();
      setSelectedExamId(res.data.id);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create exam and process question paper.';
      error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handlePublishExam = async () => {
    if (!currentExam) return;
    if (questions.length === 0) {
      error('Cannot publish an exam with no questions. Please upload a question paper PDF first.');
      return;
    }

    setPublishing(true);
    try {
      await api.post(`/exams/${currentExam.id}/publish`);
      success('Examination successfully published! Students can now submit answer sheets in the Student Portal.');
      fetchExamDetails(currentExam.id);
      fetchExams();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to publish exam.';
      error(msg);
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublishExam = async () => {
    if (!currentExam) return;
    setPublishing(true);
    try {
      await api.post(`/exams/${currentExam.id}/unpublish`);
      success('Examination moved to draft status.');
      fetchExamDetails(currentExam.id);
      fetchExams();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to unpublish exam.';
      error(msg);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Question Papers & Rubric Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload Question Paper PDFs. LLM extracts questions, formulates ideal benchmark model answers, and prepares rubrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {exams.length > 0 && (
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 shadow-sm"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.status})
                </option>
              ))}
            </select>
          )}

          <Button onClick={() => setIsCreateModalOpen(true)} icon={Plus}>
            New Exam & PDF
          </Button>
        </div>
      </div>

      {/* When no exams exist at all */}
      {exams.length === 0 && !loading && (
        <Card className="text-center py-16 border-dashed border-2 border-slate-300 dark:border-slate-700">
          <UploadCloud className="w-16 h-16 text-indigo-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">No Examinations Found</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
            Upload a Question Paper PDF to let Google Gemini LLM extract questions, formulate ideal benchmark model answers, and configure scoring rubrics.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="mt-6" icon={Plus}>
            Create Exam & Upload Question Paper PDF
          </Button>
        </Card>
      )}

      {currentExam && (
        <div className="space-y-6">
          {/* Exam Summary & Upload / Publish Card */}
          <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-indigo-950/40 dark:via-slate-900/90 dark:to-slate-900/70 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                    {currentExam.subject}
                  </span>
                  <StatusBadge status={currentExam.status} />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{currentExam.name}</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                  <span>{currentExam.class_name}</span> &bull; 
                  <span>{currentExam.department}</span> &bull; 
                  <span>{currentExam.duration_minutes} Minutes</span>
                </p>
                <div className="flex items-center gap-5 mt-4 text-xs text-slate-700 dark:text-slate-300">
                  <span>Questions Extracted: <strong className="text-slate-900 dark:text-white font-bold">{questions.length}</strong></span>
                  <span>Total Maximum Marks: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{currentExam.total_marks} Marks</strong></span>
                </div>
              </div>

              {/* PDF Actions & Publish Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    id="replace-qp-pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <label
                    htmlFor="replace-qp-pdf"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-indigo-500 transition-all cursor-pointer shadow-sm"
                  >
                    <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    {uploading ? 'Processing PDF with LLM...' : currentExam.question_paper ? 'Re-upload Question Paper PDF' : 'Upload Question Paper PDF'}
                  </label>
                </div>

                {currentExam.status !== 'PUBLISHED' ? (
                  <Button
                    onClick={handlePublishExam}
                    variant="emerald"
                    icon={ShieldCheck}
                    disabled={questions.length === 0 || publishing}
                    loading={publishing}
                  >
                    Publish Question Paper
                  </Button>
                ) : (
                  <Button
                    onClick={handleUnpublishExam}
                    variant="secondary"
                    icon={RotateCcw}
                    loading={publishing}
                  >
                    Unpublish (Draft)
                  </Button>
                )}
              </div>
            </div>

            {/* Status notice */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentExam.status === 'PUBLISHED' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      Published and live! Students can now submit answer sheets in the Student Portal.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-700 dark:text-amber-400 font-medium">
                      Draft Mode: Review the extracted benchmark model answers below, then click "Publish Question Paper" to make it live for students.
                    </span>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Extracted Questions List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Extracted Examination Questions & Benchmark Model Answers ({questions.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Every question displays its ideal benchmark model answer formulated by Gemini LLM and calibrated rubric criteria.
                </p>
              </div>
            </div>

            {questions.length === 0 ? (
              <Card className="text-center py-12 border-dashed border border-slate-300 dark:border-slate-800">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Questions Extracted Yet</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Click "Upload Question Paper PDF" above to let AI automatically extract the questions, formulate model answers, and configure scoring criteria.
                </p>
              </Card>
            ) : (
              <div className="space-y-5">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 transition-all shadow-sm dark:shadow-md space-y-4"
                  >
                    {/* Question Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-400 font-black text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                          Q{q.question_number}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {q.topic || 'General Topic'}
                        </span>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                          {q.max_marks} Marks
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingQuestion(q);
                          setIsRubricModalOpen(true);
                        }}
                        icon={Edit3}
                      >
                        Edit Rubric & Model Answer
                      </Button>
                    </div>

                    {/* Question Text */}
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                        Question:
                      </span>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                        {q.question_text}
                      </p>
                    </div>

                    {/* Ideal Model Answer Section */}
                    {q.rubric && (q.rubric.model_answer || q.rubric.expected_answer) && (
                      <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>LLM Generated Model Answer (Ideal Benchmark):</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                          {q.rubric.model_answer || q.rubric.expected_answer}
                        </p>
                      </div>
                    )}

                    {/* Rubric Criteria Breakdown */}
                    {q.rubric && q.rubric.criteria && q.rubric.criteria.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                          Grading Criteria Breakdown ({q.rubric.criteria.length} criteria):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.rubric.criteria.map((crit, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                            >
                              <span className="text-slate-700 dark:text-slate-300 truncate pr-2">
                                &bull; {crit.criterion}
                              </span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                                {crit.marks}m
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Publish Bar */}
            {questions.length > 0 && currentExam.status !== 'PUBLISHED' && (
              <div className="mt-8 p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Ready to accept student submissions?</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Publishing makes this question paper available in the Student Portal for answer sheet uploads.
                  </p>
                </div>
                <Button
                  onClick={handlePublishExam}
                  variant="emerald"
                  icon={ShieldCheck}
                  loading={publishing}
                >
                  Publish Question Paper Now
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rubric Editor Modal */}
      <RubricEditorModal
        isOpen={isRubricModalOpen}
        onClose={() => {
          setIsRubricModalOpen(false);
          setEditingQuestion(null);
        }}
        question={editingQuestion}
        onSaved={() => fetchExamDetails(selectedExamId)}
      />

      {/* Create Exam & Upload PDF Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Examination & Upload Question Paper"
        subtitle="Provide examination details and attach the Question Paper PDF. Gemini LLM will extract questions and formulate ideal benchmark model answers."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateWithPdf} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Examination Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. End Semester Autonomous Examination"
              value={newExamData.name}
              onChange={(e) => setNewExamData({ ...newExamData, name: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject Name / Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CS8691 - Artificial Intelligence"
                value={newExamData.subject}
                onChange={(e) => setNewExamData({ ...newExamData, subject: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                value={newExamData.duration_minutes}
                onChange={(e) => setNewExamData({ ...newExamData, duration_minutes: parseInt(e.target.value) || 90 })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Class / Section
              </label>
              <input
                type="text"
                placeholder="e.g. IV Year B.Tech CSE"
                value={newExamData.class_name}
                onChange={(e) => setNewExamData({ ...newExamData, class_name: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Science and Engineering"
                value={newExamData.department}
                onChange={(e) => setNewExamData({ ...newExamData, department: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* PDF Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Upload Question Paper PDF *
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors">
              <input
                type="file"
                accept=".pdf"
                required
                id="create-modal-pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setNewExamFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <label htmlFor="create-modal-pdf" className="cursor-pointer block">
                <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-1.5" />
                {newExamFile ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block truncate max-w-xs mx-auto">
                    {newExamFile.name} ({(newExamFile.size / 1024).toFixed(1)} KB)
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    Click to select Question Paper PDF
                  </span>
                )}
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={uploading} icon={Sparkles}>
              Create & Extract with AI
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
