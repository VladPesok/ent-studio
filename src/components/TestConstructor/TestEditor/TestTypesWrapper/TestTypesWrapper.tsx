import React from 'react';
import { Form } from 'antd';
import type { Test } from '../../TestConstructor';
import HandicapIndex from './HandicapIndex/HandicapIndex';
import { TEST_TYPES } from './constants/testTypes';

interface TestTypesWrapperProps {
  test: Test | null;
  form: any;
  initialValues: {
    name: string;
    description: string;
    testType: string;
  };
  onDataChange: (data: object) => void;
}

const TestTypesWrapper: React.FC<TestTypesWrapperProps> = ({
  test,
  form,
  initialValues,
  onDataChange
}) => {
  let formValues = form.getFieldsValue();
  formValues = Object.keys(formValues).length === 0 ? initialValues : formValues;
  const testType = formValues.testType;

  if (testType === TEST_TYPES.HANDICAP_INDEX) {
    return (
      <HandicapIndex
        test={test}
        onDataChange={onDataChange}
      />
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <p style={{ color: '#8c8c8c', fontSize: '16px' }}>
        Оберіть тип тесту для налаштування
      </p>
    </div>
  );
};

export default TestTypesWrapper;
