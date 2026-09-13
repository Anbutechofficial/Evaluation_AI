import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import {
  BrainCircuit,
  Bot,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User,
  GraduationCap,
  Sun,
  Moon
} from 'lucide-react';

export const StudentPortal = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [exams, setExams] = useState([]);
  const [formData, setFormData] = useState({
    exam_id: '',
    student_name: '',
    register_number: '',
    class_name: '',
    department: ''
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Form, 2: Upload, 3: Processing Pipeline, 4: Result
  const [processingStage, setProcessingStage] = useState(0);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const PIPELINE_STAGES = [
    { title: 'Uploading Answer Sheet PDF', desc: 'Securely transmitting document to evaluation server...' },
    { title: 'Extracting PDF & OCR Text', desc: 'Running PyMuPDF stream parser with OCR fallback...' },
    { title: 'Matching Question-Answer Pairs', desc: 'Segmenting answers and mapping to examination questions...' },
    { title: 'RAG Semantic Knowledge Retrieval', desc: 'Fetching question context and grading rubrics from Vector Store...' },
    { title: 'LangGraph Agentic AI Scoring', desc: 'Evaluating answers against rubrics with explainability...' },
    { title: 'Deterministic Validation & Storage', desc: 'Clamping marks and saving evaluation record...' }
  ];

  useEffect(() => {
    fetchPublishedExams();
  }, []);

  const fetchPublishedExams = async () => {
    try {
      const res = await api.get('/exams/published');
      setExams(res.data);
      if (res.data.length > 0) {
        setFormData((prev) => ({ ...prev, exam_id: res.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        error('Only PDF answer sheets are accepted.');
        return;
      }
      setPdfFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.exam_id || !formData.student_name || !formData.register_number || !pdfFile) {
      error('Please complete all student information and select an answer PDF.');
      return;
    }

    setCurrentStep(3); // Start Processing Stepper
    setLoading(true);

    // Simulate animated pipeline stages while backend computes
    const stageInterval = setInterval(() => {
      setProcessingStage((prev) => (prev < PIPELINE_STAGES.length - 1 ? prev + 1 : prev));
    }, 900);

    try {
      const uploadData = new FormData();
      uploadData.append('exam_id', formData.exam_id);
      uploadData.append('student_name', formData.student_name);
      uploadData.append('register_number', formData.register_number);
      uploadData.append('class_name', formData.class_name);
      uploadData.append('department', formData.department);
      uploadData.append('file', pdfFile);

      const res = await api.post('/submissions', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(stageInterval);
      setProcessingStage(PIPELINE_STAGES.length - 1);
      setSubmissionResult(res.data);
      setTimeout(() => {
        setCurrentStep(4); // Success Receipt
        success('Answer sheet submitted and AI evaluated successfully!');
      }, 800);
    } catch (err) {
      clearInterval(stageInterval);
      setCurrentStep(1);
      const msg = err.response?.data?.detail || 'Submission failed. Please try again.';
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedExam = exams.find((e) => e.id === formData.exam_id);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 relative overflow-hidden transition-colors duration-300">
      {/* Background Orbs */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-4 z-10 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">Evaluation AI</h2>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">Student Answer Submission Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 rounded-xl glass-card border border-slate-300 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:text-amber-500 hover:border-amber-400/40 transition-all cursor-pointer shadow-sm"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Secure AI Evaluation
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl w-full mx-auto my-8 z-10 space-y-6">
        {/* Conversational AI Assistant Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-slate-50 border border-indigo-200 dark:from-indigo-950/40 dark:via-slate-900/90 dark:to-slate-900/60 dark:border-indigo-500/25 flex items-start gap-4 shadow-md dark:shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-600/20 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 border border-indigo-200 dark:border-indigo-500/30">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Evaluation AI Assistant
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Hello! Welcome to the Examination Evaluation Portal. Please select your examination, provide your student information, and upload your answer sheet PDF. Our Agentic RAG pipeline will evaluate your answers against institutional rubrics.
            </p>
          </div>
        </div>

        {/* STEP 1 & 2: Form & File Upload */}
        {currentStep === 1 && (
          <Card className="border-slate-800 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Exam Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  1. Select Available Examination *
                </label>
                {exams.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300 flex items-center gap-3 text-xs leading-relaxed shadow-sm">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span>
                      <strong className="font-semibold text-amber-950 dark:text-amber-200">No Active Exams:</strong> No active examinations published at this moment. Please check back later or contact your instructor.
                    </span>
                  </div>
                ) : (
                  <select
                    name="exam_id"
                    required
                    value={formData.exam_id}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} &bull; ({ex.subject})
                      </option>
                    ))}
                  </select>
                )}

                {selectedExam && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span><strong>Subject:</strong> {selectedExam.subject}</span>
                    <span><strong>Questions:</strong> {selectedExam.total_questions}</span>
                    <span><strong>Max Marks:</strong> {selectedExam.total_marks} Marks</span>
                  </div>
                )}
              </div>

              {/* Student Information */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  2. Student Identification Details *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Student Full Name</label>
                    <input
                      type="text"
                      name="student_name"
                      required
                      placeholder="Enter student full name"
                      value={formData.student_name}
                      onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Register Number</label>
                    <input
                      type="text"
                      name="register_number"
                      required
                      placeholder="e.g. 717822P101"
                      value={formData.register_number}
                      onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Class / Section</label>
                    <input
                      type="text"
                      name="class_name"
                      required
                      placeholder="e.g. IV Year CSE - A"
                      value={formData.class_name}
                      onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Department</label>
                    <input
                      type="text"
                      name="department"
                      required
                      placeholder="e.g. Computer Science and Engineering"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* PDF Answer Sheet Upload Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  3. Upload Answer Sheet PDF *
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-all">
                  <input
                    type="file"
                    accept=".pdf"
                    required
                    id="student-pdf-upload"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="student-pdf-upload" className="cursor-pointer block">
                    <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto mb-2 animate-bounce" />
                    {pdfFile ? (
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-emerald-400 block">
                          {pdfFile.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {(pdfFile.size / 1024).toFixed(1)} KB &bull; Click to change file
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-sm font-semibold text-slate-200 block">
                          Drag & Drop your Answer Sheet PDF here
                        </span>
                        <span className="text-xs text-slate-400 block">
                          or click to browse from computer (Max 25MB)
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                disabled={exams.length === 0 || !pdfFile}
                className="w-full py-3.5"
                icon={Sparkles}
              >
                Submit Answer Sheet & Start AI Evaluation
              </Button>
            </form>
          </Card>
        )}

        {/* STEP 3: Real-Time Processing Stepper */}
        {currentStep === 3 && (
          <Card className="text-center py-10 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-100">
                Agentic Evaluation in Progress
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                LangGraph StateGraph Workflow is actively analyzing your answers.
              </p>
            </div>

            {/* Stepper Timeline */}
            <div className="max-w-md mx-auto text-left space-y-3 pt-2">
              {PIPELINE_STAGES.map((stage, idx) => {
                const isCompleted = idx < processingStage;
                const isCurrent = idx === processingStage;

                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-700" />
                      )}
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isCurrent ? 'text-indigo-400' : isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                        {stage.title}
                      </div>
                      <div className="text-[11px] text-slate-500">{stage.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* STEP 4: Comprehensive Interactive Evaluation Results Dashboard */}
        {currentStep === 4 && submissionResult && (
          <div className="space-y-6">
            {/* Hero Result Card */}
            <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-50/90 via-white to-slate-50 dark:from-indigo-950/40 dark:via-slate-900/90 dark:to-slate-900/80 shadow-xl overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Evaluation Complete
                    </span>
                    <StatusBadge status={submissionResult.status} />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {submissionResult.exam_name}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Candidate: <strong className="text-slate-900 dark:text-slate-200">{submissionResult.student_name}</strong> &bull; 
                    Reg No: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{submissionResult.register_number}</strong> &bull; 
                    {submissionResult.class_name} ({submissionResult.department})
                  </p>
                </div>

                {/* Score Summary Box */}
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-right">
                    <div className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                      {submissionResult.total_score}
                      <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 ml-1">
                        / {submissionResult.max_score}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {submissionResult.percentage}% &bull; {
                        submissionResult.percentage >= 90 ? 'Outstanding (O Grade)' :
                        submissionResult.percentage >= 80 ? 'Distinction (A+ Grade)' :
                        submissionResult.percentage >= 70 ? 'First Class (A Grade)' :
                        submissionResult.percentage >= 60 ? 'Second Class (B+ Grade)' :
                        submissionResult.percentage >= 50 ? 'Pass (B Grade)' : 'Requires Review'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick AI Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Evaluation Engine</span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Gemini Multimodal
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Questions Evaluated</span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {submissionResult.evaluations?.length || 0} Questions
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Average Confidence</span>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {Math.round(
                      (submissionResult.evaluations?.reduce((acc, ev) => acc + (ev.confidence || 0.9), 0) /
                        Math.max(1, submissionResult.evaluations?.length || 1)) * 100
                    )}% High
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Benchmark Alignment</span>
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {Math.round(
                      (submissionResult.evaluations?.reduce((acc, ev) => acc + (ev.model_alignment_score || 0), 0) /
                        Math.max(1, submissionResult.evaluations?.length || 1))
                    )}% Match
                  </div>
                </div>
              </div>
            </Card>

            {/* Question-by-Question Deep Dive */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Detailed Question-by-Question Evaluation Breakdown
                </h3>
                <span className="text-xs text-slate-500">
                  Transcribed answers &bull; Benchmark model answer comparison &bull; AI Conceptual feedback
                </span>
              </div>

              {submissionResult.evaluations && submissionResult.evaluations.length > 0 ? (
                submissionResult.evaluations.map((ev, index) => (
                  <Card key={ev.id || index} className="space-y-4 border-slate-200 dark:border-slate-800">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-400 font-black text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                          Q{ev.question_number || index + 1}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {ev.topic || 'General Topic'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          ev.marks_obtained >= ev.max_marks
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                            : ev.marks_obtained > 0
                            ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20'
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                        }`}>
                          Score: {ev.marks_obtained} / {ev.max_marks} Marks
                        </span>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                        Question:
                      </span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {ev.question_text || `Question ${ev.question_number}`}
                      </p>
                    </div>

                    {/* Extracted Student Answer vs Benchmark Model Answer */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                      {/* Student's Extracted Answer */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          Student Extracted Answer (From Uploaded Paper):
                        </span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
                          {ev.student_answer_text || 'No answer text detected for this question.'}
                        </p>
                      </div>

                      {/* Benchmark Model Answer */}
                      <div className="p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-1.5">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Staff / Benchmark Model Answer:
                        </span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                          {ev.model_answer || ev.expected_answer || 'Accurate conceptual explanation with mechanisms and terminology.'}
                        </p>
                      </div>
                    </div>

                    {/* Model Answer Alignment Breakdown */}
                    <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">
                            Benchmark Model Answer Comparison:
                          </span>
                          <span className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                            Evaluated against LLM Generated Ideal Benchmark Answer
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Model Alignment:
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          (ev.model_alignment_score || 0) >= 80
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50'
                            : (ev.model_alignment_score || 0) >= 50
                            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/50'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/50'
                        }`}>
                          {Math.round(ev.model_alignment_score || 0)}% Match
                        </span>
                      </div>
                    </div>

                    {/* LLM Conceptual Evaluation & Constructive Feedback */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-0.5">
                          AI Conceptual Evaluation Reason:
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {ev.reason}
                        </p>
                      </div>

                      {ev.feedback && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                            Actionable Pedagogical Feedback:
                          </span>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {ev.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="text-center py-8 text-slate-400 text-xs">
                  No individual question evaluations found.
                </Card>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={() => window.print()}
                variant="secondary"
                icon={FileText}
              >
                Print / Save Evaluation Statement
              </Button>

              <Button
                onClick={() => {
                  setCurrentStep(1);
                  setPdfFile(null);
                  setSubmissionResult(null);
                }}
                variant="primary"
                icon={ArrowRight}
              >
                Submit Another Answer Sheet
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-4 border-t border-slate-800/60 max-w-4xl w-full mx-auto">
        Evaluation AI &bull; Production-Grade Agentic RAG Educational Evaluation System
      </footer>
    </div>
  );
};
