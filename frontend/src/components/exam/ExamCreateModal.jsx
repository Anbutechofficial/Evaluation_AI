import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { BookOpen, Calendar, Clock, Layers, FileUp, Sparkles } from 'lucide-react';

export const ExamCreateModal = ({ isOpen, onClose, onExamCreated }) => {
  const [formData, setFormData] = useState({
    name: 'AI Fundamentals - Internal Assessment 2',
    subject: 'CS8691 - Artificial Intelligence',
    class_name: 'IV Year B.Tech CSE',
    department: 'Computer Science & Engineering',
    duration_minutes: 60,
    total_questions: 10,
    total_marks: 20.0
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'duration_minutes' || name === 'total_questions' ? parseInt(value) || 0 : name === 'total_marks' ? parseFloat(value) || 0 : value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        error('Please select a valid PDF file.');
        return;
      }
      setPdfFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.subject || !formData.class_name) {
      error('Please complete all required fields.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Exam record
      const res = await api.post('/exams', formData);
      const createdExam = res.data;

      // 2. Upload Question paper if selected
      if (pdfFile) {
        const uploadData = new FormData();
        uploadData.append('file', pdfFile);
        await api.post(`/exams/${createdExam.id}/upload-question-paper`, uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        success('Exam created and Question Paper PDF processed with AI extraction & rubrics!');
      } else {
        success('Exam created successfully.');
      }

      onExamCreated(createdExam);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create exam.';
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Examination"
      subtitle="Configure exam details and optionally attach a Question Paper PDF for automated RAG extraction."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Exam Title *</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. AI Fundamentals - Internal Assessment 1"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Subject / Course Code *</label>
            <input
              type="text"
              name="subject"
              required
              value={formData.subject}
              onChange={handleChange}
              placeholder="e.g. CS8691 - Artificial Intelligence"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Class / Year / Section *</label>
            <input
              type="text"
              name="class_name"
              required
              value={formData.class_name}
              onChange={handleChange}
              placeholder="e.g. IV Year B.Tech CSE - A"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Department *</label>
          <input
            type="text"
            name="department"
            required
            value={formData.department}
            onChange={handleChange}
            placeholder="e.g. Computer Science & Engineering"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Min)</label>
            <input
              type="number"
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Total Questions</label>
            <input
              type="number"
              name="total_questions"
              value={formData.total_questions}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Total Marks</label>
            <input
              type="number"
              step="0.5"
              name="total_marks"
              value={formData.total_marks}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Optional Question Paper Upload */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Upload Question Paper PDF (Optional)</span>
            <span className="text-[11px] text-indigo-400 font-normal flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Auto-extracts 2-mark questions & rubrics
            </span>
          </label>
          <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-4 text-center bg-slate-900/40 transition-colors">
            <input
              type="file"
              accept=".pdf"
              id="exam-pdf-upload"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="exam-pdf-upload" className="cursor-pointer block">
              <FileUp className="w-8 h-8 text-indigo-400 mx-auto mb-1.5" />
              {pdfFile ? (
                <span className="text-sm font-semibold text-emerald-400">
                  {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                </span>
              ) : (
                <span className="text-xs text-slate-400">
                  Click to choose PDF or drag and drop question paper
                </span>
              )}
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Examination
          </Button>
        </div>
      </form>
    </Modal>
  );
};
