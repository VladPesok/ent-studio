import React, { useState, useEffect } from 'react';
import { Button, Card, List, message, Empty, Tooltip, Switch, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ImportOutlined, ExportOutlined, UndoOutlined } from '@ant-design/icons';
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
  deletedAt?: string;
}

const TestConstructor: React.FC = () => {
  const { t } = useTranslation();
  const [tests, setTests] = useState<Test[]>([]);
  const [archivedTests, setArchivedTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'editor'>('list');
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [showArchived, setShowArchived] = useState(false);

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
      const archived = await testApi.getArchivedTests();
      setArchivedTests(archived);
    } catch (error) {
      console.error('Failed to load tests:', error);
      message.error(t('testConstructor.messages.loadError'));
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

  const handleArchiveTest = async (testId: string) => {
    try {
      await testApi.archiveTest(testId);
      message.success(t('testConstructor.messages.archivedSuccess'));
      loadTests();
    } catch (error) {
      console.error('Failed to archive test:', error);
      message.error(t('testConstructor.messages.archiveError'));
    }
  };

  const handleRestoreTest = async (testId: string) => {
    try {
      await testApi.restoreTest(testId);
      message.success(t('testConstructor.messages.restoredSuccess'));
      loadTests();
    } catch (error) {
      console.error('Failed to restore test:', error);
      message.error(t('testConstructor.messages.restoreError'));
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
        message.error(t('testConstructor.messages.folderOpenError', { error: result.error }));
      }
    } catch (error) {
      console.error('Failed to open tests folder:', error);
      message.error(t('testConstructor.messages.folderOpenFailed'));
    }
  };

  const handleImportTest = async () => {
    try {
      const result = await testApi.importTest();
      if (result.success) {
        message.success(t('testConstructor.messages.importSuccess', { name: result.test?.name }));
        loadTests(); // Refresh the list
      } else if (result.error !== 'Import cancelled') {
        message.error(t('testConstructor.messages.importError', { error: result.error }));
      }
    } catch (error) {
      console.error('Failed to import test:', error);
      message.error(t('testConstructor.messages.importFailed'));
    }
  };

  const handleExportTest = async (testId: string, testName: string) => {
    try {
      const result = await testApi.exportTest(testId);
      if (result.success) {
        message.success(t('testConstructor.messages.exportSuccess', { name: testName }));
      } else if (result.error !== 'Export cancelled') {
        message.error(t('testConstructor.messages.exportError', { error: result.error }));
      }
    } catch (error) {
      console.error('Failed to export test:', error);
      message.error(t('testConstructor.messages.exportFailed'));
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

  const displayedTests = showArchived ? archivedTests : tests;

  return (
    <div className="test-constructor-container">
      <div className="test-constructor-header">
      <h1>
        {t('testConstructor.title')}
      </h1>
        <div className="header-actions">
          <Space style={{ marginRight: '24px' }}>
            <span>{t('testConstructor.showArchive')}</span>
            <Switch 
              checked={showArchived} 
              onChange={setShowArchived}
              size="small"
            />
            {archivedTests.length > 0 && (
              <span style={{ color: '#999' }}>({archivedTests.length})</span>
            )}
          </Space>
          <Button
            icon={<ImportOutlined />}
            onClick={handleImportTest}
            style={{ marginRight: '12px' }}
          >
            {t('testConstructor.importTest')}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddTest}
          >
            {t('testConstructor.createTest')}
          </Button>
        </div>
      </div>

      <div className="test-list-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>{t('testConstructor.loadingTests')}</p>
          </div>
        ) : displayedTests.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <h3>{showArchived ? t('testConstructor.archiveEmptyTitle') : t('testConstructor.emptyTitle')}</h3>
                <p>{showArchived ? t('testConstructor.archiveEmptyDescription') : t('testConstructor.emptyDescription')}</p>
              </div>
            }
          >
            {!showArchived && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTest}>
                {t('testConstructor.createTest')}
              </Button>
            )}
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
            dataSource={displayedTests}
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
                          <>{t('testConstructor.updated')} {new Date(test.updatedAt).toLocaleDateString('uk-UA')}</>
                        ) : (
                          <>{t('testConstructor.created')} {new Date(test.createdAt).toLocaleDateString('uk-UA')}</>
                        )}
                      </div>
                    </div>
                  }
                  extra={
                    <div className="test-card-actions">
                      {showArchived ? (
                        <Button
                          type="text"
                          icon={<UndoOutlined />}
                          onClick={() => handleRestoreTest(test.id)}
                          title={t('testConstructor.tooltips.restore')}
                          style={{ color: '#52c41a' }}
                        />
                      ) : (
                        <>
                          <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => handleEditTest(test)}
                            title={t('testConstructor.tooltips.edit')}
                          />
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleArchiveTest(test.id)}
                            title={t('testConstructor.tooltips.archive')}
                          />
                        </>
                      )}
                    </div>
                  }
                >
                  <div className="test-card-content">
                    <p className="test-description">{test.description}</p>
                    <div className="test-meta">
                      <span className="test-type">{t('testConstructor.type')} {getTestTypeLabel(test.testType)}</span>
                      <span className="test-questions">
                        {t('testConstructor.questions')} {(test.testData as any)?.questions?.length || 0}
                      </span>
                      <span className="test-ranges">
                        {t('testConstructor.diagnoses')} {(test.testData as any)?.diagnosisRanges?.length || 0}
                      </span>
                    </div>
                    {showArchived ? (
                      <div className="test-card-footer">
                        <span style={{ color: '#999', fontSize: '12px' }}>
                          {t('testConstructor.archived')} {test.deletedAt ? new Date(test.deletedAt).toLocaleDateString('uk-UA') : '—'}
                        </span>
                      </div>
                    ) : (
                      <div className="test-card-footer">
                        <Button
                          icon={<ExportOutlined />}
                          size="small"
                          type="primary"
                          onClick={() => handleExportTest(test.id, test.name)}
                        >
                          {t('testConstructor.exportTest')}
                        </Button>
                      </div>
                    )}
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
