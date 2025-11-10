import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../connection';
import { patientTests, patients, appointments } from '../models';

/**
 * Get all patient tests for a specific folder and appointment
 */
export function getPatientTests(folderPath: string, appointmentDate?: string) {
  const db = getDb();
  
  // Get patient ID
  const patient = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.folderPath, folderPath))
    .get();
    
  if (!patient) return [];

  let query = db
    .select()
    .from(patientTests)
    .where(eq(patientTests.patientId, patient.id));

  // Filter by appointment if provided
  if (appointmentDate) {
    const appointment = db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, patient.id),
          eq(appointments.appointmentDate, appointmentDate)
        )
      )
      .get();
    
    if (!appointment) return [];
    
    query = db
      .select()
      .from(patientTests)
      .where(
        and(
          eq(patientTests.patientId, patient.id),
          eq(patientTests.appointmentId, appointment.id)
        )
      );
  }

  const tests = query.orderBy(desc(patientTests.createdAt)).all();

  // Format response
  return tests.map(test => {
    const data = typeof test.testData === 'string' ? JSON.parse(test.testData) : test.testData;
    
    return {
      id: `patient_test_${test.id}`,
      testId: test.testTemplateId,
      testName: test.testName,
      testType: test.testType,
      testData: data.testData || {},
      progress: data.progress || {
        currentQuestionIndex: 0,
        answers: [],
        completed: false,
        score: 0,
        diagnosis: null,
        completedAt: null,
      },
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
    };
  });
}

/**
 * Create a new patient test
 */
export function createPatientTest(
  folderPath: string,
  appointmentDate: string | undefined,
  testTemplateId: string,
  testData: any
) {
  const db = getDb();
  
  // Get patient ID
  const patient = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.folderPath, folderPath))
    .get();
    
  if (!patient) throw new Error('Patient not found');

  // Get appointment ID if appointment date provided
  let appointmentId: number | null = null;
  if (appointmentDate) {
    const appointment = db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, patient.id),
          eq(appointments.appointmentDate, appointmentDate)
        )
      )
      .get();
      
    appointmentId = appointment?.id || null;
  }

  const now = new Date().toISOString();
  
  // Prepare test data with progress
  const fullTestData = {
    testData: {
      questions: testData.testData?.questions || [],
      diagnosisRanges: testData.testData?.diagnosisRanges || [],
      answerOptions: testData.testData?.answerOptions || [],
    },
    progress: {
      currentQuestionIndex: 0,
      answers: [],
      completed: false,
      score: 0,
      diagnosis: null,
      completedAt: null,
    },
  };

  // Insert patient test
  const result = db.insert(patientTests).values({
    patientId: patient.id,
    appointmentId,
    testTemplateId: parseInt(testTemplateId),
    testName: testData.name,
    testType: testData.testType || 'questionnaire',
    testData: JSON.stringify(fullTestData),
    createdAt: now,
    updatedAt: now,
  }).run();

  const patientTestId = Number(result.lastInsertRowid);

  return {
    id: `patient_test_${patientTestId}`,
    testId: testTemplateId,
    testName: testData.name,
    testType: testData.testType || 'questionnaire',
    testData: fullTestData.testData,
    progress: fullTestData.progress,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update patient test progress
 */
export function updatePatientTest(
  folderPath: string,
  appointmentDate: string | undefined,
  patientTestId: string,
  progressData: any
) {
  const db = getDb();
  
  // Extract numeric ID from string ID
  const numericId = parseInt(patientTestId.replace('patient_test_', ''));
  
  // Get patient ID for verification
  const patient = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.folderPath, folderPath))
    .get();
    
  if (!patient) throw new Error('Patient not found');

  // Get existing test
  const existingTest = db
    .select()
    .from(patientTests)
    .where(
      and(
        eq(patientTests.id, numericId),
        eq(patientTests.patientId, patient.id)
      )
    )
    .get();

  if (!existingTest) {
    throw new Error('Patient test not found');
  }

  // Parse existing data and merge with progress updates
  const currentData = typeof existingTest.testData === 'string' 
    ? JSON.parse(existingTest.testData) 
    : existingTest.testData;
    
  const updatedData = {
    ...currentData,
    progress: {
      ...currentData.progress,
      ...progressData,
    },
  };

  const now = new Date().toISOString();

  // Update the test
  db.update(patientTests)
    .set({
      testData: JSON.stringify(updatedData),
      updatedAt: now,
    })
    .where(eq(patientTests.id, numericId))
    .run();

  // Return updated test
  return {
    id: `patient_test_${numericId}`,
    testId: existingTest.testTemplateId,
    testName: existingTest.testName,
    testType: existingTest.testType,
    testData: updatedData.testData,
    progress: updatedData.progress,
    createdAt: existingTest.createdAt,
    updatedAt: now,
  };
}

/**
 * Delete a patient test
 */
export function deletePatientTest(folderPath: string, patientTestId: string) {
  const db = getDb();
  
  // Extract numeric ID from string ID
  const numericId = parseInt(patientTestId.replace('patient_test_', ''));
  
  // Get patient ID for verification
  const patient = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.folderPath, folderPath))
    .get();
    
  if (!patient) throw new Error('Patient not found');

  // Delete the test
  const result = db
    .delete(patientTests)
    .where(
      and(
        eq(patientTests.id, numericId),
        eq(patientTests.patientId, patient.id)
      )
    )
    .run();

  if (result.changes === 0) {
    throw new Error('Patient test not found');
  }

  return { success: true };
}

