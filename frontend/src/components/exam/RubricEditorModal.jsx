import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { Plus, Trash2, Check, Sparkles, AlertCircle } from 'lucide-react';

export const RubricEditorModal = ({ isOpen, onClose, question, onSaved }) => {
  const [criteria, setCriteria] = useState([]);
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [modelAnswer, setModelAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (question) {
      if (question.rubric) {
        setCriteria(question.rubric.criteria || []);
        setExpectedAnswer(question.rubric.expected_answer || '');
        setModelAnswer(question.rubric.model_answer || '');
      } else {
        setCriteria([
          { criterion: 'Core definition and conceptual terminology', marks: 1.0 },
          { criterion: 'Working mechanism or supporting features', marks: 0.5 },
          { criterion: 'Relevant practical example or use case', marks: 0.5 }
        ]);
        setExpectedAnswer('');
        setModelAnswer('');
      }
    }
  }, [question]);

  const handleCriterionChange = (index, field, value) => {
    const updated = [...criteria];
    updated[index][field] = field === 'marks' ? parseFloat(value) || 0 : value;
    setCriteria(updated);
  };

  const addCriterion = () => {
    setCriteria([...criteria, { criterion: 'New evaluation criterion', marks: 0.5 }]);
  };

  const removeCriterion = (index) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const totalCalculatedMarks = criteria.reduce((sum, c) => sum + (parseFloat(c.marks) || 0), 0);
  const maxMarks = question?.max_marks || 2.0;
  const isMarksValid = Math.abs(totalCalculatedMarks - maxMarks) < 0.05;

  const handleSave = async () => {
    if (!question) return;

    if (!isMarksValid) {
      error(`Criteria marks sum (${totalCalculatedMarks.toFixed(1)}) must equal maximum marks (${maxMarks.toFixed(1)})`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.put(`/questions/${question.id}/rubric`, {
        criteria,
        expected_answer: expectedAnswer,
        model_answer: modelAnswer
      });
      success('Rubric and benchmark model answer updated!');
      onSaved(res.data);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update rubric.';
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!question) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Evaluation Rubric: Question ${question.question_number}`}
      subtitle={`Configure structured scoring criteria and ideal benchmark model answer for "${question.question_text.slice(0, 60)}..."`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Question Banner */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
            <span>Topic: {question.topic || 'General'}</span>
            <span>Max Marks: {maxMarks.toFixed(1)}</span>
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{question.question_text}</p>
        </div>

        {/* Criteria Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Rubric Criteria Breakdown
            </h4>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                isMarksValid 
                  ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/20' 
                  : 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/20'
              }`}>
                Sum: {totalCalculatedMarks.toFixed(1)} / {maxMarks.toFixed(1)} Marks
              </span>
              <button
                type="button"
                onClick={addCriterion}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Criterion
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {criteria.map((c, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 w-6 text-center">{idx + 1}.</span>
                <input
                  type="text"
                  value={c.criterion}
                  onChange={(e) => handleCriterionChange(idx, 'criterion', e.target.value)}
                  placeholder="Criterion description..."
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center gap-1 w-24">
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max={maxMarks}
                    value={c.marks}
                    onChange={(e) => handleCriterionChange(idx, 'marks', e.target.value)}
                    className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">m</span>
                </div>
                {criteria.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCriterion(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Expected & Model Answer */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expected Answer / Key Concepts
            </label>
            <textarea
              rows={2}
              value={expectedAnswer}
              onChange={(e) => setExpectedAnswer(e.target.value)}
              placeholder="What core points must the student include..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ideal Benchmark Model Answer (Generated by LLM)
            </label>
            <textarea
              rows={3}
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
              placeholder="Complete ideal student response..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Changes immediately sync to the semantic RAG vector store.</span>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" loading={loading} onClick={handleSave} icon={Check}>
              Save Rubric
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
