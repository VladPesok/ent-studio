import React, { useState } from 'react';
import { Collapse, Input, Button, Tooltip } from 'antd';
import { DeleteOutlined, DragOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Question, AnswerOption } from '../HandicapIndex';
import './QuestionCard.css';

const { TextArea } = Input;

interface QuestionCardProps {
  question: Question;
  index: number;
  answerOptions: AnswerOption[];
  onUpdate: (questionId: string, text: string) => void;
  onDelete: (questionId: string) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  isExpanded: boolean;
  onExpandChange: (isExpanded: boolean) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  answerOptions,
  onUpdate,
  onDelete,
  isExpanded,
  onExpandChange
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState(question.text);

  const handleTextChange = (value: string) => {
    setText(value);
    onUpdate(question.id, value);
  };

  const handleDelete = () => {
    onDelete(question.id);
  };

  const handleCollapseChange = (key: string | string[]) => {
    const keys = Array.isArray(key) ? key : [key];
    onExpandChange(keys.length > 0);
  };

  const getTitle = () => {
    const baseTitle = t('testConstructor.handicapIndex.questionN', { n: index + 1 });
    return text.trim() ? `${baseTitle}: ${text.trim()}` : baseTitle;
  };

  const getPointsLabel = (points: number) => {
    if (points === 1) return t('testConstructor.handicapIndex.point');
    if (points >= 2 && points <= 4) return t('testConstructor.handicapIndex.points_few');
    return t('testConstructor.handicapIndex.points_many');
  };

  return (
    <div className="question-card">
      <Collapse
        size="small"
        activeKey={isExpanded ? ['question'] : []}
        onChange={handleCollapseChange}
        className="question-collapse"
      >
        <Collapse.Panel
          key="question"
          header={
            <div className="question-card-header">
              <span className="question-number">{getTitle()}</span>
            </div>
          }
          extra={
            <Tooltip title={t('testConstructor.handicapIndex.deleteQuestion')}>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                size="small"
              />
            </Tooltip>
          }
        >
          <div className="question-content">
            <TextArea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={t('testConstructor.handicapIndex.enterQuestionText')}
              rows={2}
              className="question-text-input"
            />
            
            <div className="question-preview">
              <div className="preview-label">{t('testConstructor.handicapIndex.preview')}</div>
              <div className="preview-question">
                {text || t('testConstructor.handicapIndex.questionTextWillBeDisplayed')}
              </div>
              <div className="preview-answers">
                {answerOptions.map((option, idx) => (
                  <div key={idx} className="answer-option-preview">
                    ◯ {option.text} ({option.points} {getPointsLabel(option.points)})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Collapse.Panel>
      </Collapse>
    </div>
  );
};

export default QuestionCard;