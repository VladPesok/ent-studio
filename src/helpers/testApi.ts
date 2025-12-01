// Test API - uses filesystem IPC handlers (tests are stored as JSON files)

import type { Test } from '../components/TestConstructor/TestConstructor';

export interface TestData {
  name: string;
  description: string;
  testType: string;
  testData: object;
}

// All test operations use filesystem handlers
export const getTests = async (): Promise<Test[]> => {
  return window.ipcRenderer.invoke("fs:tests:getAll");
};

export const getTest = async (testId: string): Promise<Test> => {
  return window.ipcRenderer.invoke("fs:tests:getById", testId);
};

export const createTest = async (testData: TestData): Promise<Test> => {
  return window.ipcRenderer.invoke("fs:tests:create", testData);
};

export const updateTest = async (testId: string, testData: TestData): Promise<Test> => {
  return window.ipcRenderer.invoke("fs:tests:update", testId, testData);
};

export const deleteTest = async (testId: string): Promise<void> => {
  return window.ipcRenderer.invoke("fs:tests:delete", testId);
};

export const validateTestName = async (name: string, excludeId?: string): Promise<boolean> => {
  return window.ipcRenderer.invoke("fs:tests:validateName", name, excludeId);
};

export const openTestsFolder = async (): Promise<{ success: boolean; error?: string }> => {
  return window.ipcRenderer.invoke("fs:tests:openFolder");
};

export const exportTest = async (testId: string): Promise<{ success: boolean; error?: string }> => {
  return window.ipcRenderer.invoke("fs:tests:export", testId);
};

export const importTest = async (): Promise<{ success: boolean; test?: Test; error?: string }> => {
  return window.ipcRenderer.invoke("fs:tests:import");
};
