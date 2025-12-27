import React, { useState, useEffect } from 'react';
import { Button, Space, message, Empty, Select, Card, Progress, Typography, Modal, Tooltip } from 'antd';
import { 
  PlusOutlined, 
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import * as patientTestsApi from '../../../helpers/patientTestsApi';
import * as testApi from '../../../helpers/testApi';
import type { Test } from '../../TestConstructor/TestConstructor';
import type { PatientTest } from '../../../helpers/patientTestsApi';
import TestTaker from './TestTaker/TestTaker';
import './TestTab.css';

const { Text } = Typography;

interface TestTabProps {
  baseFolder: string;
  currentAppointment?: string;
}

const TestTab: React.FC<TestTabProps> = ({ baseFolder, currentAppointment }) => {
  const { t } = useTranslation();
  const [patientTests, setPatientTests] = useState<PatientTest[]>([]);
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [currentTestTaking, setCurrentTestTaking] = useState<PatientTest | null>(null);

  useEffect(() => {
    loadData();
  }, [baseFolder, currentAppointment]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [patientTestsData, availableTestsData] = await Promise.all([
        patientTestsApi.getPatientTests(baseFolder, currentAppointment),
        testApi.getTests()
      ]);
      console.log({availableTestsData});
      setPatientTests(patientTestsData);
      setAvailableTests(availableTestsData);
    } catch (error) {
      console.error('Error loading test data:', error);
      message.error('Помилка завантаження тестів');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTest = async () => {
    if (!selectedTestId) {
      message.warning('Будь ласка, оберіть тест для додавання');
      return;
    }

    const selectedTest = availableTests.find(test => test.id === selectedTestId);
    if (!selectedTest) {
      message.error('Обраний тест не знайдено');
      return;
    }

    // Check if test already exists for this appointment
    const existingTest = patientTests.find(pt => pt.testId === selectedTestId);
    if (existingTest) {
      message.warning('Цей тест вже додано до поточного прийому');
      return;
    }

    try {
      const newPatientTest = await patientTestsApi.createPatientTest(
        baseFolder,
        currentAppointment,
        selectedTestId,
        selectedTest
      );
      setPatientTests(prev => [newPatientTest, ...prev]);
      setSelectedTestId('');
      message.success('Тест успішно додано');
    } catch (error) {
      console.error('Error adding test:', error);
      message.error('Помилка додавання тесту');
    }
  };

  const handleStartTest = (patientTest: PatientTest) => {
    setCurrentTestTaking(patientTest);
  };

  const handleRestartTest = async (patientTest: PatientTest) => {
    try {
      // Reset test progress but keep answers for reference
      await patientTestsApi.updatePatientTest(baseFolder, currentAppointment, patientTest.id, {
        currentQuestionIndex: 0,
        completed: false,
        score: 0,
        diagnosis: null,
        completedAt: null
      });
      
      await loadData();
      
      const updatedTests = await patientTestsApi.getPatientTests(baseFolder, currentAppointment);
      const updatedTest = updatedTests.find(t => t.id === patientTest.id);
      
      if (updatedTest) {
        setCurrentTestTaking(updatedTest);
      }
      
      message.success('Тест скинуто. Можна проходити знову.');
    } catch (error) {
      console.error('Error restarting test:', error);
      message.error('Помилка перезапуску тесту');
    }
  };

  const handleTestComplete = async (patientTest: PatientTest) => {
    // Refresh the test list
    await loadData();
    setCurrentTestTaking(null);
    message.success('Тест успішно завершено!');
  };

  const handleDeleteTest = async (patientTestId: string) => {
    Modal.confirm({
      title: 'Видалити тест?',
      content: 'Ви впевнені, що хочете видалити цей тест? Всі дані будуть втрачені.',
      okText: 'Видалити',
      okType: 'danger',
      cancelText: 'Скасувати',
      onOk: async () => {
        try {
          await patientTestsApi.deletePatientTest(baseFolder, currentAppointment, patientTestId);
          setPatientTests(prev => prev.filter(pt => pt.id !== patientTestId));
          message.success('Тест видалено');
        } catch (error) {
          console.error('Error deleting test:', error);
          message.error('Помилка видалення тесту');
        }
      }
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTestStatusIcon = (test: PatientTest) => {
    if (test.progress?.completed) {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
    if ((test.progress?.answers?.length ?? 0) > 0) {
      return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    }
    return <PlayCircleOutlined style={{ color: '#1890ff' }} />;
  };

  const getTestStatusText = (test: PatientTest) => {
    if (test.progress?.completed) {
      return 'Завершено';
    }
    if ((test.progress?.answers?.length ?? 0) > 0) {
      return 'В процесі';
    }
    return 'Не розпочато';
  };

  // Filter available tests to exclude already added ones
  const filteredAvailableTests = availableTests.filter(test => 
    !patientTests.some(pt => pt.testId === test.id)
  );

  // Group available tests by type
  const groupedAvailableTests = filteredAvailableTests.reduce((groups, test) => {
    const type = test.testType;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(test);
    return groups;
  }, {} as Record<string, Test[]>);

  // Create select options grouped by test type
  const getTestSelectOptions = () => {
    const options: Array<{ label: string; options?: Array<{ label: string; value: string }>; value?: string }> = [];
    Object.entries(groupedAvailableTests).forEach(([testType, tests]) => {
      const typeLabel = t(`testTypes.${testType.replace('_', '')}`) || testType;
      
      if (tests.length === 1) {
        // If only one test in this type, add it directly
        options.push({
          label: `${typeLabel}: ${tests[0].name}`,
          value: tests[0].id
        });
      } else if (tests.length > 1) {
        // If multiple tests, create a group
        options.push({
          label: typeLabel,
          options: tests.map(test => ({
            label: test.name,
            value: test.id
          }))
        });
      }
    });
    
    return options;
  };

  if (currentTestTaking) {
    return (
      <TestTaker
        patientTest={currentTestTaking}
        baseFolder={baseFolder}
        currentAppointment={currentAppointment}
        onTestComplete={handleTestComplete}
        onCancel={() => setCurrentTestTaking(null)}
      />
    );
  }

  if (loading && patientTests.length === 0) {
    return (
      <div className="test-tab-wrap">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Завантаження тестів...</p>
        </div>
      </div>
    );
  }

  if (!loading && patientTests.length === 0) {
    return (
      <div className="test-tab-empty-wrap">
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>Немає тестів</h3>
          <p>Додайте тест для проходження пацієнтом</p>
          
          {filteredAvailableTests.length > 0 ? (
            <Space direction="vertical" style={{ width: '100%', maxWidth: 400 }}>
              <Select
                style={{ width: '100%' }}
                placeholder="Оберіть тест для додавання..."
                value={selectedTestId || undefined}
                onChange={setSelectedTestId}
                options={getTestSelectOptions()}
              />
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddTest}
                disabled={!selectedTestId}
                style={{ width: '100%' }}
              >
                Додати тест
              </Button>
            </Space>
          ) : (
            <p style={{ color: '#8c8c8c', marginTop: 16 }}>
              Немає доступних тестів. Створіть тести в конструкторі тестів.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="test-tab-wrap">
      <div className="test-tab-header">
        <div className="tab-info">
          <h3>Тести ({patientTests.length})</h3>
        </div>
        
        {filteredAvailableTests.length > 0 && (
          <div className="tab-actions">
            <Space>
              <Select
                style={{ width: 250 }}
                placeholder="Оберіть тест для додавання..."
                value={selectedTestId || undefined}
                onChange={setSelectedTestId}
                options={getTestSelectOptions()}
              />
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddTest}
                disabled={!selectedTestId}
              >
                Додати тест
              </Button>
            </Space>
          </div>
        )}
      </div>

      <div className="tests-grid">
        {patientTests.map((patientTest) => {
          const progress = patientTestsApi.getTestProgress(patientTest);
          
          return (
            <Card
              key={patientTest.id}
              className="test-card"
              actions={[
                <Button
                  key="start"
                  type="link"
                  icon={getTestStatusIcon(patientTest)}
                  onClick={() => handleStartTest(patientTest)}
                >
                  {patientTest.progress?.completed ? 'Переглянути' : 'Пройти тест'}
                </Button>,
                ...(patientTest.progress?.completed ? [
                  <Button
                    key="restart"
                    type="link"
                    icon={<ReloadOutlined />}
                    onClick={() => handleRestartTest(patientTest)}
                  >
                    Пройти знову
                  </Button>
                ] : []),
                <Button
                  key="delete"
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteTest(patientTest.id)}
                >
                  Видалити
                </Button>
              ]}
            >
              <div className="test-card-content">
                <div className="test-card-header">
                  <Tooltip title={patientTest.testName} placement="top">
                    <h4 className="test-card-title">{patientTest.testName}</h4>
                  </Tooltip>
                  <div className="test-card-status">
                    {getTestStatusIcon(patientTest)}
                    <Text type="secondary">{getTestStatusText(patientTest)}</Text>
                  </div>
                </div>

                <div className="test-card-meta">
                  <Text type="secondary">
                    Додано: {formatDate(patientTest.createdAt)}
                  </Text>
                  {patientTest.progress?.completedAt && (
                    <Text type="secondary">
                      Завершено: {formatDate(patientTest.progress.completedAt)}
                    </Text>
                  )}
                </div>

                <div className="test-card-progress">
                  <div className="progress-info">
                    <Text>
                      Прогрес: {progress.answeredQuestions} з {progress.totalQuestions} питань
                    </Text>
                    <Text type="secondary">
                      {progress.progressPercentage}%
                    </Text>
                  </div>
                  <Progress 
                    percent={progress.progressPercentage} 
                    status={patientTest.progress?.completed ? 'success' : 'active'}
                    strokeWidth={8}
                  />
                </div>

                {patientTest.progress?.completed && patientTest.progress?.diagnosis && (
                  <div className="test-card-result">
                    <Text strong>Результат: </Text>
                    <Text>{patientTest.progress.diagnosis}</Text>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TestTab;
