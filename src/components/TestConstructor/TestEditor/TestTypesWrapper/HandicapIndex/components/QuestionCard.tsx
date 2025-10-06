import React, { useState } from 'react';
import { Collapse, Input, Button, Tooltip } from 'antd';
import { DeleteOutlined, DragOutlined } from '@ant-design/icons';
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
    const baseTitle = `Питання ${index + 1}`;
    return text.trim() ? `${baseTitle}: ${text.trim()}` : baseTitle;
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
            <Tooltip title="Видалити питання">
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
              placeholder="Введіть текст питання..."
              rows={2}
              className="question-text-input"
            />
            
            <div className="question-preview">
              <div className="preview-label">Попередній перегляд:</div>
              <div className="preview-question">
                {text || 'Текст питання буде відображено тут...'}
              </div>
              <div className="preview-answers">
                {answerOptions.map((option, index) => (
                  <div key={index} className="answer-option-preview">
                    ◯ {option.text} ({option.points} {option.points === 1 ? 'бал' : option.points < 5 ? 'бали' : 'балів'})
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