// Patient Tests API - uses database IPC handlers

// Patient Test Progress interfaces
export interface TestAnswer {
  questionId: string;
  selectedOption: number; // Index of selected answer option
  points: number;
}

export interface TestProgress {
  currentQuestionIndex: number;
  answers: TestAnswer[];
  completed: boolean;
  score: number;
  diagnosis: string | null;
  completedAt: string | null;
}

// Patient Test interface - represents a test instance for a specific patient
export interface PatientTest {
  id: string;
  testId: string; // Reference to original test from test constructor
  testName: string;
  testType: string;
  createdAt: string;
  updatedAt: string;
  testData: {
    questions: any[];
    diagnosisRanges: any[];
    answerOptions?: any[];
  };
  progress: TestProgress;
}

// API functions - all use database handlers
export const getPatientTests = async (folder: string, currentAppointment?: string): Promise<PatientTest[]> => {
  try {
    return await window.ipcRenderer.invoke("db:patientTests:getAll", folder, currentAppointment);
  } catch (error) {
    console.error('Failed to get patient tests:', error);
    throw error;
  }
};

export const createPatientTest = async (
  folder: string,
  currentAppointment: string | undefined,
  testId: string,
  testData: any
): Promise<PatientTest> => {
  try {
    return await window.ipcRenderer.invoke("db:patientTests:create", folder, currentAppointment, testId, testData);
  } catch (error) {
    console.error('Failed to create patient test:', error);
    throw error;
  }
};

export const updatePatientTest = async (
  folder: string,
  currentAppointment: string | undefined,
  patientTestId: string,
  progressData: Partial<TestProgress>
): Promise<PatientTest> => {
  try {
    return await window.ipcRenderer.invoke("db:patientTests:update", folder, currentAppointment, patientTestId, progressData);
  } catch (error) {
    console.error('Failed to update patient test:', error);
    throw error;
  }
};

export const deletePatientTest = async (
  folder: string,
  currentAppointment: string | undefined,
  patientTestId: string
): Promise<{ success: boolean }> => {
  try {
    return await window.ipcRenderer.invoke("db:patientTests:delete", folder, currentAppointment, patientTestId);
  } catch (error) {
    console.error('Failed to delete patient test:', error);
    throw error;
  }
};

// Utility functions
export const getTestProgress = (test: PatientTest): { answeredQuestions: number; totalQuestions: number; progressPercentage: number } => {
  const totalQuestions = test.testData.questions.length;
  const answeredQuestions = test.progress.answers.length;
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  
  return {
    answeredQuestions,
    totalQuestions,
    progressPercentage
  };
};

export const isTestCompleted = (test: PatientTest): boolean => {
  return test.progress.completed;
};

export const getTestDiagnosis = (test: PatientTest): string | null => {
  if (!test.progress.completed || !test.progress.diagnosis) {
    return null;
  }
  return test.progress.diagnosis;
};

export const calculateTestScore = (answers: TestAnswer[]): number => {
  return answers.reduce((total, answer) => total + answer.points, 0);
};

export const findDiagnosisByScore = (score: number, diagnosisRanges: any[]): string | null => {
  const range = diagnosisRanges.find(range => 
    score >= range.minScore && score <= range.maxScore
  );
  return range ? range.diagnosis : null;
};
