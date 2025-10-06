import React, { useState } from 'react';
import { Modal, Button, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { PatientTest } from '../../../../helpers/patientTestsApi';
import TestTypesWrapper from './TestTypesWrapper/TestTypesWrapper';
import './TestTaker.css';

const { Title, Text } = Typography;

interface TestTakerProps {
  patientTest: PatientTest;
  baseFolder: string;
  currentAppointment?: string;
  onTestComplete: (updatedTest: PatientTest) => void;
  onCancel: () => void;
}

const TestTaker: React.FC<TestTakerProps> = ({
  patientTest,
  baseFolder,
  currentAppointment,
  onTestComplete,
  onCancel
}) => {
  const { t } = useTranslation();
  const [showingResult, setShowingResult] = useState(patientTest.progress.completed);

  const handleTestComplete = (updatedTest: PatientTest) => {
    setShowingResult(true);
    onTestComplete(updatedTest);
  };

  const handleRestartTest = () => {
    setShowingResult(false);
  };

  const handleCancel = () => {
    onCancel();
  };

  const getTestResult = () => {
    if (!patientTest.progress.completed) return null;
    
    return {
      score: patientTest.progress.score,
      diagnosis: patientTest.progress.diagnosis,
      completedAt: patientTest.progress.completedAt
    };
  };

  const renderTestResult = () => {
    const result = getTestResult();
    if (!result) return null;

    return (
      <div className="test-result-content">
        <div className="result-header">
          <CheckCircleOutlined className="result-icon success" />
          <Title level={4}>Тест завершено!</Title>
        </div>
        
        <div className="result-details">
          <div className="result-item">
            <Text strong>Загальний бал: </Text>
            <Text>{result.score}</Text>
          </div>
          
          {result.diagnosis && (
            <div className="result-item">
              <Text strong>Діагноз: </Text>
              <Text>{result.diagnosis}</Text>
            </div>
          )}
          
          <div className="result-item">
            <Text strong>Завершено: </Text>
            <Text>{new Date(result.completedAt!).toLocaleDateString('uk-UA', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}</Text>
          </div>
        </div>

        <div className="result-actions">
          <Button onClick={onCancel} style={{ marginRight: '12px' }}>
            Закрити
          </Button>
          <Button type="primary" onClick={handleRestartTest}>
            Пройти тест знову
          </Button>
        </div>
      </div>
    );
  };

  const renderTestQuestion = () => {
    return (
      <TestTypesWrapper
        patientTest={patientTest}
        baseFolder={baseFolder}
        currentAppointment={currentAppointment}
        onTestComplete={handleTestComplete}
        isRetaking={!patientTest.progress.completed && patientTest.progress.answers.length > 0}
      />
    );
  };

  return (
    <Modal
      title={
        <div className="test-modal-header">
          <Title level={4} style={{ margin: 0 }}>
            {patientTest.testName}
          </Title>
          <Text type="secondary">
            {showingResult ? 'Результати тесту' : 'Проходження тесту'}
          </Text>
        </div>
      }
      open={true}
      onCancel={showingResult ? onCancel : handleCancel}
      footer={null}
      width={700}
      className="test-taker-modal"
      destroyOnHidden
    >
      {showingResult ? renderTestResult() : renderTestQuestion()}
    </Modal>
  );
};

export default TestTaker;
