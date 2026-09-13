import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { StaffLayout } from './components/layout/StaffLayout';
import { ExamCreateModal } from './components/exam/ExamCreateModal';

// Auth Pages
import { Login } from './pages/auth/Login';

// Staff Pages
import { Dashboard } from './pages/staff/Dashboard';
import { Exams } from './pages/staff/Exams';
import { QuestionPapers } from './pages/staff/QuestionPapers';
import { Submissions } from './pages/staff/Submissions';
import { Evaluations } from './pages/staff/Evaluations';
import { EvaluationDetail } from './pages/staff/EvaluationDetail';
import { MarkStatement } from './pages/staff/MarkStatement';
import { Settings } from './pages/staff/Settings';

// Student Pages
import { StudentPortal } from './pages/student/StudentPortal';

import { NotFound } from './pages/common/NotFound';

export function App() {
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth */}
            <Route path="/login" element={<Login />} />

            {/* Student Public Portal */}
            <Route path="/student" element={<StudentPortal />} />
            <Route path="/students" element={<StudentPortal />} />
            <Route path="/student-portal" element={<StudentPortal />} />
            <Route path="/portal" element={<StudentPortal />} />

            {/* Fallback for index.html */}
            <Route path="/index.html" element={<Navigate to="/staff/dashboard" replace />} />

            {/* Staff Protected Routes */}
            <Route
              path="/staff"
              element={<StaffLayout onNewExamClick={() => setIsExamModalOpen(true)} />}
            >
              <Route index element={<Navigate to="/staff/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard onNewExamClick={() => setIsExamModalOpen(true)} />} />
              <Route path="exams" element={<Exams onNewExamClick={() => setIsExamModalOpen(true)} />} />
              <Route path="question-papers" element={<QuestionPapers />} />
              <Route path="submissions" element={<Submissions />} />
              <Route path="evaluations" element={<Evaluations />} />
              <Route path="evaluations/:submissionId" element={<EvaluationDetail />} />
              <Route path="mark-statement" element={<MarkStatement />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Default Catch-All */}
            <Route path="/" element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          {/* Global Exam Creation Wizard Modal */}
          <ExamCreateModal
            isOpen={isExamModalOpen}
            onClose={() => setIsExamModalOpen(false)}
            onExamCreated={() => {
              window.location.reload();
            }}
          />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
