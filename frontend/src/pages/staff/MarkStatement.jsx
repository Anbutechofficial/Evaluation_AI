import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import {
  Award,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  ArrowUpDown,
  GraduationCap
} from 'lucide-react';

export const MarkStatement = () => {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rank'); // rank, name, score
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchSubmissions(selectedExamId);
    }
  }, [selectedExamId]);

  const fetchExams = async () => {
    try {
      const res = await api.get('/exams');
      setExams(res.data);
      if (res.data.length > 0) {
        setSelectedExamId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubmissions = async (examId) => {
    setLoading(true);
    try {
      const res = await api.get(`/submissions?exam_id=${examId}`);
      setSubmissions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentExam = exams.find((e) => e.id === selectedExamId);

  const handleExportPDF = () => {
    if (!selectedExamId) return;
    window.open(`/api/export/marks/${selectedExamId}/pdf`, '_blank');
    success('Generating official PDF Mark Statement download...');
  };

  const handleExportExcel = () => {
    if (!selectedExamId) return;
    window.open(`/api/export/marks/${selectedExamId}/excel`, '_blank');
    success('Generating Excel Mark Statement download...');
  };

  // Sort & Filter
  const filteredSubmissions = submissions
    .filter((sub) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return sub.student_name.toLowerCase().includes(q) || sub.register_number.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'rank') {
        const rA = a.rank || 999;
        const rB = b.rank || 999;
        return sortOrder === 'asc' ? rA - rB : rB - rA;
      }
      if (sortBy === 'score') {
        return sortOrder === 'asc' ? a.total_score - b.total_score : b.total_score - a.total_score;
      }
      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.student_name.localeCompare(b.student_name)
          : b.student_name.localeCompare(a.student_name);
      }
      return 0;
    });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
            <Award className="w-7 h-7 text-indigo-400" />
            Official Mark Statement
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Institutional score ranking sheet, percentage statistics, and instant PDF/Excel exports.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={handleExportPDF}
            icon={FileText}
          >
            Export PDF
          </Button>
          <Button
            variant="emerald"
            onClick={handleExportExcel}
            icon={FileSpreadsheet}
          >
            Export Excel
          </Button>
        </div>
      </div>

      {/* Control Bar: Exam Selector & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">Exam:</span>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student or register no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Statement Table */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/95 text-slate-300 border-b border-slate-800">
                <tr>
                  <th
                    onClick={() => {
                      setSortBy('rank');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                    className="py-4 px-5 font-bold cursor-pointer hover:text-indigo-400 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Rank <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      setSortBy('name');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                    className="py-4 px-5 font-bold cursor-pointer hover:text-indigo-400 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Student Name <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-4 px-5 font-bold">Register Number</th>
                  <th className="py-4 px-5 font-bold">Class / Department</th>
                  <th
                    onClick={() => {
                      setSortBy('score');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                    className="py-4 px-5 font-bold cursor-pointer hover:text-indigo-400 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Marks Obtained <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-4 px-5 font-bold">Max Marks</th>
                  <th className="py-4 px-5 font-bold">Percentage</th>
                  <th className="py-4 px-5 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSubmissions.map((sub, idx) => (
                  <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-5 font-black text-sm text-indigo-400">
                      #{sub.rank || idx + 1}
                    </td>
                    <td className="py-4 px-5 font-bold text-slate-100 text-sm">
                      {sub.student_name}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-300 font-semibold">
                      {sub.register_number}
                    </td>
                    <td className="py-4 px-5 text-slate-400">
                      {sub.class_name}
                    </td>
                    <td className="py-4 px-5 font-black text-slate-100 text-sm">
                      {sub.total_score}
                    </td>
                    <td className="py-4 px-5 text-slate-400">
                      {sub.max_score}
                    </td>
                    <td className="py-4 px-5 font-extrabold text-emerald-400 text-sm">
                      {sub.percentage}%
                    </td>
                    <td className="py-4 px-5 text-right">
                      <StatusBadge status={sub.status} />
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
