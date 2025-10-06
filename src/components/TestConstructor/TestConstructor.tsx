import React, { useState, useEffect } from 'react';
import { Button, Card, List, message, Empty, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ImportOutlined, ExportOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import TestEditor from './TestEditor/TestEditor';
import { TEST_TYPES } from './TestEditor/TestTypesWrapper/constants/testTypes';
import * as testApi from '../../helpers/testApi';
import './TestConstructor.css';

export interface Test {
  id: string;
  name: string;
  description: string;
  testType: string;
  testData: object;
  createdAt: Date;
  updatedAt: Date;
}

const TestConstructor: React.FC = () => {
  const { t } = useTranslation();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'editor'>('list');
  const [editingTest, setEditingTest] = useState<Test | null>(null);

  const getTestTypeLabel = (testType: string) => {
    switch (testType) {
      case TEST_TYPES.HANDICAP_INDEX:
        return t('testTypes.handicapIndex');
      default:
        return testType;
    }
  };

  const loadTests = async () => {
    setLoading(true);
    try {
      const testList = await testApi.getTests();
      setTests(testList);
    } catch (error) {
      console.error('Failed to load tests:', error);
      message.error('Помилка завантаження тестів');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  const handleAddTest = () => {
    setEditingTest(null);
    setCurrentView('editor');
  };

  const handleEditTest = (test: Test) => {
    setEditingTest(test);
    setCurrentView('editor');
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      await testApi.deleteTest(testId);
      message.success('Тест видалено успішно');
      loadTests();
    } catch (error) {
      console.error('Failed to delete test:', error);
      message.error('Помилка видалення тесту');
    }
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setEditingTest(null);
    loadTests();
  };

  const handleTestSaved = () => {
    setCurrentView('list');
    setEditingTest(null);
    loadTests();
  };

  const handleOpenTestsFolder = async () => {
    try {
      const result = await testApi.openTestsFolder();
      if (!result.success) {
        message.error(`Помилка відкриття папки: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to open tests folder:', error);
      message.error('Помилка відкриття папки тестів');
    }
  };

  const handleImportTest = async () => {
    try {
      const result = await testApi.importTest();
      if (result.success) {
        message.success(`Тест "${result.test?.name}" імпортовано успішно`);
        loadTests(); // Refresh the list
      } else if (result.error !== 'Import cancelled') {
        message.error(`Помилка імпорту: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to import test:', error);
      message.error('Помилка імпорту тесту');
    }
  };

  const handleExportTest = async (testId: string, testName: string) => {
    try {
      const result = await testApi.exportTest(testId);
      if (result.success) {
        message.success(`Тест "${testName}" експортовано успішно`);
      } else if (result.error !== 'Export cancelled') {
        message.error(`Помилка експорту: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to export test:', error);
      message.error('Помилка експорту тесту');
    }
  };

  if (currentView === 'editor') {
    return (
      <TestEditor
        test={editingTest}
        onBack={handleBackToList}
        onTestSaved={handleTestSaved}
      />
    );
  }

  return (
    <div className="test-constructor-container">
      <div className="test-constructor-header">
      <h1>
        Конструктор тестів
      </h1>
        <div className="header-actions">
          <Button
            icon={<ImportOutlined />}
            onClick={handleImportTest}
            style={{ marginRight: '12px' }}
          >
            Імпортувати тест
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddTest}
          >
            Створити тест
          </Button>
        </div>
      </div>

      <div className="test-list-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Завантаження тестів...</p>
          </div>
        ) : tests.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <h3>Немає створених тестів</h3>
                <p>Створіть свій перший медичний тест</p>
              </div>
            }
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTest}>
              Створити тест
            </Button>
          </Empty>
        ) : (
          <List
            style={{ width: '100%' }}
            grid={{
              gutter: 16,
              xs: 1,
              sm: 1,
              md: 2,
              lg: 3,
              xl: 3,
              xxl: 4,
            }}
            dataSource={tests}
            renderItem={(test) => (
              <List.Item style={{ width: '100%' }}>
                <Card
                  className="test-card"
                  title={
                    <div className="test-card-title">
                      <Tooltip title={test.name} placement="topLeft">
                        <div className="test-name">{test.name}</div>
                      </Tooltip>
                      <div className="test-created-date">
                        {test.updatedAt !== test.createdAt ? (
                          <>Оновлено: {new Date(test.updatedAt).toLocaleDateString('uk-UA')}</>
                        ) : (
                          <>Створено: {new Date(test.createdAt).toLocaleDateString('uk-UA')}</>
                        )}
                      </div>
                    </div>
                  }
                  extra={
                    <div className="test-card-actions">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEditTest(test)}
                        title="Редагувати"
                      />
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteTest(test.id)}
                        title="Видалити"
                      />
                    </div>
                  }
                >
                  <div className="test-card-content">
                    <p className="test-description">{test.description}</p>
                    <div className="test-meta">
                      <span className="test-type">Тип: {getTestTypeLabel(test.testType)}</span>
                      <span className="test-questions">
                        Питань: {(test.testData as any)?.questions?.length || 0}
                      </span>
                      <span className="test-ranges">
                        Діагнозів: {(test.testData as any)?.diagnosisRanges?.length || 0}
                      </span>
                    </div>
                    <div className="test-card-footer">
                      <Button
                        icon={<ExportOutlined />}
                        size="small"
                        type="primary"
                        onClick={() => handleExportTest(test.id, test.name)}
                      >
                        Експортувати тест
                      </Button>
                    </div>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
};

export default TestConstructor;
