import React, { useState } from 'react';
import { Collapse, Input, InputNumber, Button, Tooltip, Row, Col } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { DiagnosisRange } from '../HandicapIndex';
import './DiagnosisRangeCard.css';

interface DiagnosisRangeCardProps {
  range: DiagnosisRange;
  maxPossibleScore: number;
  onUpdate: (rangeId: string, updates: Partial<DiagnosisRange>) => void;
  onDelete: (rangeId: string) => void;
  isExpanded: boolean;
  onExpandChange: (isExpanded: boolean) => void;
}

const DiagnosisRangeCard: React.FC<DiagnosisRangeCardProps> = ({
  range,
  maxPossibleScore,
  onUpdate,
  onDelete,
  isExpanded,
  onExpandChange
}) => {
  const [diagnosis, setDiagnosis] = useState(range.diagnosis);
  const [minScore, setMinScore] = useState(range.minScore);
  const [maxScore, setMaxScore] = useState(range.maxScore);

  const handleDiagnosisChange = (value: string) => {
    setDiagnosis(value);
    onUpdate(range.id, { diagnosis: value });
  };

  const handleMinScoreChange = (value: number | null) => {
    const newMinScore = value || 0;
    setMinScore(newMinScore);
    onUpdate(range.id, { minScore: newMinScore });
  };

  const handleMaxScoreChange = (value: number | null) => {
    const newMaxScore = value || 0;
    setMaxScore(newMaxScore);
    onUpdate(range.id, { maxScore: newMaxScore });
  };

  const handleDelete = () => {
    onDelete(range.id);
  };

  const handleCollapseChange = (key: string | string[]) => {
    const keys = Array.isArray(key) ? key : [key];
    onExpandChange(keys.length > 0);
  };

  const getTitle = () => {
    const baseTitle = "Діапазон діагнозу";
    return diagnosis.trim() ? `${baseTitle}: ${diagnosis.trim()}` : baseTitle;
  };

  const isValidRange = minScore >= 0 && maxScore >= minScore && maxScore <= maxPossibleScore;
  const rangeWidth = maxPossibleScore > 0 ? ((maxScore - minScore + 1) / maxPossibleScore) * 100 : 0;

  return (
    <div className={`diagnosis-range-card ${!isValidRange ? 'invalid-range' : ''}`}>
      <Collapse
        size="small"
        activeKey={isExpanded ? ['diagnosis'] : []}
        onChange={handleCollapseChange}
        className="diagnosis-range-collapse"
      >
        <Collapse.Panel
          key="diagnosis"
          header={getTitle()}
          extra={
            <Tooltip title="Видалити діапазон">
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
          <div className="diagnosis-range-content">
        <Row gutter={16}>
          <Col span={24}>
            <div className="field-group">
              <label className="field-label">Діагноз:</label>
              <Input
                value={diagnosis}
                onChange={(e) => handleDiagnosisChange(e.target.value)}
                placeholder="Введіть діагноз..."
                className="diagnosis-input"
              />
            </div>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <div className="field-group">
              <label className="field-label">Мін. бал:</label>
              <InputNumber
                value={minScore}
                onChange={handleMinScoreChange}
                min={0}
                max={maxPossibleScore}
                className="score-input"
                style={{ width: '100%' }}
              />
            </div>
          </Col>
          <Col span={12}>
            <div className="field-group">
              <label className="field-label">Макс. бал:</label>
              <InputNumber
                value={maxScore}
                onChange={handleMaxScoreChange}
                min={minScore}
                max={maxPossibleScore}
                className="score-input"
                style={{ width: '100%' }}
              />
            </div>
          </Col>
        </Row>

        {maxPossibleScore > 0 && (
          <div className="range-visualization">
            <div className="range-label">Візуалізація діапазону:</div>
            <div className="range-bar-container">
              <div className="range-bar-background">
                <div 
                  className="range-bar-fill"
                  style={{
                    left: `${(minScore / maxPossibleScore) * 100}%`,
                    width: `${rangeWidth}%`
                  }}
                />
              </div>
              <div className="range-labels">
                <span className="range-start">0</span>
                <span className="range-end">{maxPossibleScore}</span>
              </div>
            </div>
            <div className="range-info">
              <span className="range-text">
                {minScore} - {maxScore} балів
                {diagnosis && ` → ${diagnosis}`}
              </span>
            </div>
          </div>
        )}

            {!isValidRange && (
              <div className="validation-error">
                <span>⚠️ Некоректний діапазон балів</span>
              </div>
            )}
          </div>
        </Collapse.Panel>
      </Collapse>
    </div>
  );
};

export default DiagnosisRangeCard;