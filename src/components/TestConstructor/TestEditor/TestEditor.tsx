import React, { useState, useCallback } from 'react';
import { 
  Button, 
  Form, 
  Input, 
  Select, 
  message, 
  Modal,
  Collapse 
} from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Test } from '../TestConstructor';
import { 
  type HandicapIndexData, 
  isHandicapDataValid,
  getHandicapDataErrors
} from './TestTypesWrapper/HandicapIndex/HandicapIndex';
import { TEST_TYPES, TEST_TYPE_CONFIG } from './TestTypesWrapper/constants/testTypes';
import TestTypesWrapper from './TestTypesWrapper/TestTypesWrapper';
import * as testApi from '../../../helpers/testApi';
import './TestEditor.css';


const { TextArea } = Input;
const { Option } = Select;

interface TestEditorProps {
  test: Test | null;
  onBack: () => void;
  onTestSaved: () => void;
}

const TestEditor: React.FC<TestEditorProps> = ({ test, onBack, onTestSaved }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeCards, setActiveCards] = useState<string[]>(['metadata']);
  const [testData, setTestData] = useState<object>({});

  const isEditing = !!test;

  // Initial values for the form
  const initialValues = {
    name: test?.name || '',
    description: test?.description || '',
    testType: test?.testType || TEST_TYPES.HANDICAP_INDEX
  };
  
  const handleFormChange = () => {
    setHasChanges(true);
  };

  const handleTestDataChange = useCallback((data: object) => {
    setTestData(data);
    setHasChanges(true);
  }, []);

  const handleBack = () => {
    if (hasChanges) {
      Modal.confirm({
        title: t('testConstructor.editor.unsavedChanges'),
        content: t('testConstructor.editor.unsavedChangesMessage'),
        okText: t('testConstructor.editor.yesExit'),
        cancelText: t('common.cancel'),
        onOk: onBack
      });
    } else {
      onBack();
    }
  };

  const isFormValid = () => {
    const formValues = form.getFieldsValue();
    const hasValidForm = formValues.name && formValues.description && formValues.testType;

    return hasValidForm;
  };

  const handleCardChange = (key: string | string[]) => {
    setActiveCards(Array.isArray(key) ? key : [key]);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (!isFormValid()) {
        if (values.testType === TEST_TYPES.HANDICAP_INDEX) {
          const errors = getHandicapDataErrors(testData as HandicapIndexData);
          if (errors.length > 0) {
            message.error(errors[0]);
            return;
          }
        }

        message.error(t('testConstructor.editor.checkRequiredFields'));
        return;
      }

      setSaving(true);

      const testPayload: Omit<Test, 'id' | 'createdAt' | 'updatedAt'> = {
        name: values.name,
        description: values.description,
        testType: values.testType,
        testData: values.testType === TEST_TYPES.HANDICAP_INDEX ? {
          questions: (testData as HandicapIndexData).questions.sort((a, b) => a.order - b.order),
          diagnosisRanges: (testData as HandicapIndexData).diagnosisRanges.sort((a, b) => a.minScore - b.minScore),
          answerOptions: (testData as HandicapIndexData).answerOptions
        } : testData
      };

      if (isEditing) {
        await testApi.updateTest(test.id, testPayload);
        message.success(t('testConstructor.editor.messages.testUpdated'));
      } else {
        await testApi.createTest(testPayload);
        message.success(t('testConstructor.editor.messages.testCreated'));
      }

      setHasChanges(false);
      onTestSaved();
    } catch (error) {
      console.error('Failed to save test:', error);
      message.error(t('testConstructor.editor.messages.saveError'));
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="test-editor-container">
      <div className="test-editor-content">
        <Collapse 
          activeKey={activeCards} 
          onChange={handleCardChange}
          className="test-editor-collapse"
        >
          <Collapse.Panel header={t('testConstructor.editor.basicInfo')} key="metadata">
            <Form
              form={form}
              layout="vertical"
              initialValues={initialValues}
              onValuesChange={handleFormChange}
            >
              <Form.Item
                label={t('testConstructor.editor.testType')}
                name="testType"
                rules={[{ required: true, message: t('testConstructor.editor.selectTestType') }]}
              >
                <Select placeholder={t('testConstructor.editor.selectTestType')}>
                  {TEST_TYPE_CONFIG.map(type => (
                    <Option key={type.value} value={type.value}>
                      {t(type.labelKey)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label={t('testConstructor.editor.testName')}
                name="name"
                rules={[{ required: true, message: t('testConstructor.editor.enterTestName') }]}
              >
                <Input placeholder={t('testConstructor.editor.enterTestName')} />
              </Form.Item>

              <Form.Item
                style={{ marginBottom: '0px' }}
                label={t('testConstructor.editor.testDescription')}
                name="description"
                rules={[{ required: true, message: t('testConstructor.editor.enterTestDescription') }]}
              >
                <TextArea 
                  placeholder={t('testConstructor.editor.enterTestDescription')}
                  rows={3}
                />
              </Form.Item>
            </Form>
          </Collapse.Panel>
        </Collapse>

        <TestTypesWrapper
          test={test}
          form={form}
          initialValues={initialValues}
          onDataChange={handleTestDataChange}
        />
      </div>

      <div className="test-editor-footer">
        <div className="footer-content">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
          >
            {t('testConstructor.editor.backToList')}
          </Button>
          
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={handleSave}
            loading={saving}
            disabled={!isFormValid()}
          >
            {isEditing ? t('testConstructor.editor.updateTest') : t('testConstructor.editor.saveTest')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestEditor;
