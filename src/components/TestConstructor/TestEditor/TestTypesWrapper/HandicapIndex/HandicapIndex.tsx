import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Space, 
  Divider, 
  Collapse,
  Input,
  InputNumber,
  Popconfirm,
  Tooltip
} from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Test } from '../../../TestConstructor';
import QuestionCard from './components/QuestionCard';
import DiagnosisRangeCard from './components/DiagnosisRangeCard';
import './HandicapIndex.css';

export interface Question {
  id: string;
  text: string;
  order: number;
}

export interface DiagnosisRange {
  id: string;
  minScore: number;
  maxScore: number;
  diagnosis: string;
}

export interface AnswerOption {
  text: string;
  points: number;
}

export const DEFAULT_ANSWER_OPTIONS: AnswerOption[] = [
  { text: 'Ніколи', points: 1 },
  { text: 'Майже ніколи', points: 2 },
  { text: 'Інколи', points: 3 },
  { text: 'Майже завжди', points: 4 },
  { text: 'Завжди', points: 5 }
];

// For backward compatibility
export const ANSWER_OPTIONS = DEFAULT_ANSWER_OPTIONS;

export interface HandicapIndexData {
  questions: Question[];
  diagnosisRanges: DiagnosisRange[];
  answerOptions?: AnswerOption[];
}

interface HandicapIndexProps {
  test: Test | null;
  onDataChange: (data: HandicapIndexData) => void;
}

const HandicapIndex: React.FC<HandicapIndexProps> = ({ test, onDataChange }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [diagnosisRanges, setDiagnosisRanges] = useState<DiagnosisRange[]>([]);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>(DEFAULT_ANSWER_OPTIONS);
  
  const [activeCards, setActiveCards] = useState<string[]>(['answerOptions']);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [expandedDiagnosisRanges, setExpandedDiagnosisRanges] = useState<Set<string>>(new Set());

  // Initialize data from test
  useEffect(() => {
    if (test && test.testData) {
      const data = test.testData as HandicapIndexData;
      setQuestions(data.questions || []);
      setDiagnosisRanges(data.diagnosisRanges || []);
      setAnswerOptions(data.answerOptions || DEFAULT_ANSWER_OPTIONS);
    }
  }, [test]);

  // Notify parent of data changes
  useEffect(() => {
    onDataChange({ questions, diagnosisRanges, answerOptions });
  }, [questions, diagnosisRanges, answerOptions, onDataChange]);

  const handleCardChange = (key: string | string[]) => {
    // For accordion behavior - only allow one panel open at a time
    if (Array.isArray(key)) {
      // If multiple keys, take the last one (newly opened)
      setActiveCards(key.length > 0 ? [key[key.length - 1]] : []);
    } else {
      // Single key or empty
      setActiveCards(key ? [key] : []);
    }
  };

  const handleQuestionExpandChange = (questionId: string, isExpanded: boolean) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(questionId);
      } else {
        newSet.delete(questionId);
      }
      return newSet;
    });
  };

  const handleDiagnosisRangeExpandChange = (rangeId: string, isExpanded: boolean) => {
    setExpandedDiagnosisRanges(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(rangeId);
      } else {
        newSet.delete(rangeId);
      }
      return newSet;
    });
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `question_${Date.now()}`,
      text: '',
      order: questions.length + 1
    };
    setQuestions([...questions, newQuestion]);
    
    // Expand only the new question, collapse all others
    setExpandedQuestions(new Set([newQuestion.id]));
  };

  const updateQuestion = (questionId: string, text: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, text } : q
    ));
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    // Remove from expanded questions
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      newSet.delete(questionId);
      return newSet;
    });
  };

  const reorderQuestions = (dragIndex: number, hoverIndex: number) => {
    const reorderedQuestions = [...questions];
    const draggedQuestion = reorderedQuestions[dragIndex];
    reorderedQuestions.splice(dragIndex, 1);
    reorderedQuestions.splice(hoverIndex, 0, draggedQuestion);
    
    // Update order numbers
    const updatedQuestions = reorderedQuestions.map((q, index) => ({
      ...q,
      order: index + 1
    }));
    
    setQuestions(updatedQuestions);
  };

  const addDiagnosisRange = () => {
    const newRange: DiagnosisRange = {
      id: `range_${Date.now()}`,
      minScore: 0,
      maxScore: 0,
      diagnosis: ''
    };
    setDiagnosisRanges([...diagnosisRanges, newRange]);
    
    // Expand only the new diagnosis range, collapse all others
    setExpandedDiagnosisRanges(new Set([newRange.id]));
  };

  const updateDiagnosisRange = (rangeId: string, updates: Partial<DiagnosisRange>) => {
    setDiagnosisRanges(diagnosisRanges.map(r => 
      r.id === rangeId ? { ...r, ...updates } : r
    ));
  };

  const deleteDiagnosisRange = (rangeId: string) => {
    setDiagnosisRanges(diagnosisRanges.filter(r => r.id !== rangeId));
    // Remove from expanded diagnosis ranges
    setExpandedDiagnosisRanges(prev => {
      const newSet = new Set(prev);
      newSet.delete(rangeId);
      return newSet;
    });
  };

  const addAnswerOption = () => {
    const newOption: AnswerOption = {
      text: '',
      points: Math.max(...answerOptions.map(o => o.points)) + 1
    };
    setAnswerOptions([...answerOptions, newOption]);
  };

  const updateAnswerOption = (index: number, updates: Partial<AnswerOption>) => {
    setAnswerOptions(answerOptions.map((option, i) => 
      i === index ? { ...option, ...updates } : option
    ));
  };

  const deleteAnswerOption = (index: number) => {
    if (answerOptions.length > 1) {
      setAnswerOptions(answerOptions.filter((_, i) => i !== index));
    }
  };

  const resetAnswerOptions = () => {
    setAnswerOptions([...DEFAULT_ANSWER_OPTIONS]);
  };

  const calculateMaxPossibleScore = () => {
    return questions.length * Math.max(...answerOptions.map(option => option.points));
  };

  const validateRanges = () => {
    if (diagnosisRanges.length === 0) return { valid: false, message: 'Додайте хоча б один діапазон діагнозу' };

    const sortedRanges = [...diagnosisRanges].sort((a, b) => a.minScore - b.minScore);
    for (let i = 0; i < sortedRanges.length - 1; i++) {
      const current = sortedRanges[i];
      const next = sortedRanges[i + 1];
      if (current.maxScore >= next.minScore) {
        return { valid: false, message: 'Діапазони не можуть перетинатися' };
      }
    }

    const maxScore = calculateMaxPossibleScore();
    const minScore = 0;
    
    if (sortedRanges[0].minScore > minScore) {
      return { valid: false, message: `Діапазони повинні покривати мінімальний бал (${minScore})` };
    }
    
    if (sortedRanges[sortedRanges.length - 1].maxScore < maxScore) {
      return { valid: false, message: `Діапазони повинні покривати максимальний бал (${maxScore})` };
    }

    return { valid: true, message: '' };
  };

  const maxPossibleScore = calculateMaxPossibleScore();
  const rangeValidation = validateRanges();
  return (
    <Collapse 
      activeKey={activeCards} 
      onChange={handleCardChange}
      className="handicap-index-collapse"
    >
      <Collapse.Panel 
        header={
          <div className="panel-header">
            <span className="panel-title">Варіанти відповідей ({answerOptions.length})</span>
            <Space>
              <Tooltip title="Скинути до стандартних">
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    resetAnswerOptions();
                  }}
                  className="header-action-button"
                />
              </Tooltip>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  // Open answerOptions panel and close others
                  setActiveCards(['answerOptions']);
                  addAnswerOption();
                }}
                style={{ width: '140px' }}
                className="header-add-button"
                title="Додати варіант"
              >
                <span className="button-text">Додати варіант</span>
              </Button>
            </Space>
          </div>
        } 
        key="answerOptions"
      >
        <div className="answer-options-manager">
          <p style={{ marginBottom: '16px', color: '#666' }}>
            Налаштуйте варіанти відповідей, які будуть доступні для всіх питань цього тесту.
          </p>
          
          <div className="answer-options-list">
            {answerOptions.map((option, index) => (
              <div key={index} className="answer-option-item">
                <div className="option-inputs">
                  <InputNumber
                    placeholder="Бали"
                    value={option.points}
                    onChange={(value) => updateAnswerOption(index, { points: value || 0 })}
                    min={0}
                    style={{ width: '100px' }}
                  />
                  <Input
                    placeholder="Текст відповіді"
                    value={option.text}
                    onChange={(e) => updateAnswerOption(index, { text: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <Popconfirm
                    title="Видалити цей варіант відповіді?"
                    onConfirm={() => deleteAnswerOption(index)}
                    okText="Так"
                    cancelText="Ні"
                    disabled={answerOptions.length <= 1}
                  >
                    <Button
                      icon={<DeleteOutlined />}
                      danger
                      disabled={answerOptions.length <= 1}
                      title={answerOptions.length <= 1 ? "Неможливо видалити останній варіант" : "Видалити варіант"}
                    />
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
          
          <div className="add-button-container">
            <Button
              type="primary"
              icon={<PlusOutlined />} 
              onClick={addAnswerOption}
              block
              size="large"
              style={{ width: '500px' }}
            >
              Додати варіант відповіді
            </Button>
          </div>
        </div>
      </Collapse.Panel>

      <Collapse.Panel 
        header={
          <div className="panel-header">
            <span className="panel-title">Питання ({questions.length})</span>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                // Open questions panel and close others
                setActiveCards(['questions']);
                addQuestion();
              }}
              style={{ width: '140px' }}
              className="header-add-button"
              title="Додати питання"
            >
              <span className="button-text">Додати питання</span>
            </Button>
          </div>
        } 
        key="questions"
      >
        <div className="questions-list">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              answerOptions={answerOptions}
              onUpdate={updateQuestion}
              onDelete={deleteQuestion}
              onReorder={reorderQuestions}
              isExpanded={expandedQuestions.has(question.id)}
              onExpandChange={(isExpanded) => handleQuestionExpandChange(question.id, isExpanded)}
            />
          ))}
          
          <div className="add-button-container">
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={addQuestion}
              block
              size="large"
              style={{ width: '500px' }}
            >
              {questions.length === 0 ? 'Додати перше питання' : 'Додати питання'}
            </Button>
          </div>
        </div>
      </Collapse.Panel>

      <Collapse.Panel 
        header={
          <div className="panel-header">
            <span className="panel-title">Діапазони діагнозів ({diagnosisRanges.length})</span>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setActiveCards(['diagnosis']);
                addDiagnosisRange();
              }}
              className="header-add-button"
              title="Додати діапазон"
              style={{ width: '140px' }}
            >
              <span className="button-text">Додати діапазон</span>
            </Button>
          </div>
        } 
        key="diagnosis"
      >
        <div className="score-info">
          <p>
            Максимальний можливий бал: <strong>{maxPossibleScore}</strong>
            {questions.length > 0 && (
              <span className="score-calculation">
                ({questions.length} питань × {Math.max(...answerOptions.map(o => o.points))} балів)
              </span>
            )}
          </p>
          
          {!rangeValidation.valid && (
            <div className="validation-error-banner">
              ⚠️ {rangeValidation.message}
            </div>
          )}
        </div>

        <Divider />

        <div className="diagnosis-ranges-list">
          {diagnosisRanges.map((range) => (
            <DiagnosisRangeCard
              key={range.id}
              range={range}
              maxPossibleScore={maxPossibleScore}
              onUpdate={updateDiagnosisRange}
              onDelete={deleteDiagnosisRange}
              isExpanded={expandedDiagnosisRanges.has(range.id)}
              onExpandChange={(isExpanded) => handleDiagnosisRangeExpandChange(range.id, isExpanded)}
            />
          ))}
          
          <div className="add-button-container">
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={addDiagnosisRange}
              block
              size="large"
              style={{ width: '500px' }}
            >
              {diagnosisRanges.length === 0 ? 'Додати перший діапазон' : 'Додати діапазон'}
            </Button>
          </div>
        </div>
      </Collapse.Panel>
    </Collapse>
  );
};

// Export validation functions for use by TestEditor
export const validateHandicapData = (data: HandicapIndexData) => {
  const { questions, diagnosisRanges, answerOptions = DEFAULT_ANSWER_OPTIONS } = data;
  
  if (diagnosisRanges.length === 0) return { valid: false, message: 'Додайте хоча б один діапазон діагнозу' };

  // Check for intersections
  const sortedRanges = [...diagnosisRanges].sort((a, b) => a.minScore - b.minScore);
  for (let i = 0; i < sortedRanges.length - 1; i++) {
    const current = sortedRanges[i];
    const next = sortedRanges[i + 1];
    if (current.maxScore >= next.minScore) {
      return { valid: false, message: 'Діапазони не можуть перетинатися' };
    }
  }

  // Check for gaps and coverage
  const maxScore = questions.length * Math.max(...answerOptions.map(option => option.points));
  const minScore = 1; // Minimum possible score
  
  if (sortedRanges[0].minScore > minScore) {
    return { valid: false, message: `Діапазони повинні покривати мінімальний бал (${minScore})` };
  }
  
  if (sortedRanges[sortedRanges.length - 1].maxScore < maxScore) {
    return { valid: false, message: `Діапазони повинні покривати максимальний бал (${maxScore})` };
  }

  return { valid: true, message: '' };
};

export const isHandicapDataValid = (data: HandicapIndexData) => {
  const { questions } = data;
  const hasQuestions = questions.length > 0 && questions.every(q => q.text.trim());
  const rangeValidation = validateHandicapData(data);
  
  return hasQuestions && rangeValidation.valid;
};

export const getHandicapDataErrors = (data: HandicapIndexData) => {
  const { questions } = data;
  const errors: string[] = [];
  
  if (questions.length === 0) {
    errors.push('Додайте хоча б одне питання');
  } else {
    const emptyQuestions = questions.filter(q => !q.text.trim());
    if (emptyQuestions.length > 0) {
      errors.push('Всі питання повинні мати текст');
    }
  }
  
  const rangeValidation = validateHandicapData(data);
  if (!rangeValidation.valid) {
    errors.push(rangeValidation.message);
  }
  
  return errors;
};

export default HandicapIndex;
