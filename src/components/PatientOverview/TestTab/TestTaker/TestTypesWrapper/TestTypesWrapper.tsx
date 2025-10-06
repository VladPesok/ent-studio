import React from 'react';
import type { PatientTest } from '../../../../../helpers/patientTestsApi';
import HandicapIndexTaker from './HandicapIndex/HandicapIndexTaker';
import { TEST_TYPES } from '../../../../TestConstructor/TestEditor/TestTypesWrapper/constants/testTypes';

interface TestTypesWrapperProps {
  patientTest: PatientTest;
  baseFolder: string;
  currentAppointment?: string;
  onTestComplete: (updatedTest: PatientTest) => void;
  isRetaking?: boolean;
}

const TestTypesWrapper: React.FC<TestTypesWrapperProps> = ({
  patientTest,
  baseFolder,
  currentAppointment,
  onTestComplete,
  isRetaking = false
}) => {
  const testType = patientTest.testType;

  if (testType === TEST_TYPES.HANDICAP_INDEX) {
    return (
      <HandicapIndexTaker
        patientTest={patientTest}
        baseFolder={baseFolder}
        currentAppointment={currentAppointment}
        onTestComplete={onTestComplete}
        isRetaking={isRetaking}
      />
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <p style={{ color: '#8c8c8c', fontSize: '16px' }}>
        Непідтримуваний тип тесту: {testType}
      </p>
    </div>
  );
};

export default TestTypesWrapper;
