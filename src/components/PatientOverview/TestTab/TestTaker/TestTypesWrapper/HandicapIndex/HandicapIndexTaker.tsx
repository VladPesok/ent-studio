import React, { useState, useEffect } from 'react';
import { Button, Radio, Progress, Typography, Space, message } from 'antd';
import { 
  ArrowLeftOutlined, 
  ArrowRightOutlined, 
  CheckCircleOutlined
} from '@ant-design/icons';
import * as patientTestsApi from '../../../../../../helpers/patientTestsApi';
import type { PatientTest, TestAnswer } from '../../../../../../helpers/patientTestsApi';
import { DEFAULT_ANSWER_OPTIONS, type AnswerOption } from '../../../../../TestConstructor/TestEditor/TestTypesWrapper/HandicapIndex/HandicapIndex';

const { Text } = Typography;

interface HandicapIndexTakerProps {
  patientTest: PatientTest;
  baseFolder: string;
  currentAppointment?: string;
  onTestComplete: (updatedTest: PatientTest) => void;
  isRetaking?: boolean;
}

const HandicapIndexTaker: React.FC<HandicapIndexTakerProps> = ({
  patientTest,
  baseFolder,
  currentAppointment,
  onTestComplete,
  isRetaking = false
}) => {
  // Initialize state based on whether we're retaking or continuing
  const initialQuestionIndex = isRetaking ? 0 : patientTest.progress.currentQuestionIndex;
  const initialAnswers = isRetaking ? patientTest.progress.answers : patientTest.progress.answers;
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
  const [answers, setAnswers] = useState<TestAnswer[]>(initialAnswers);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const questions = patientTest.testData.questions;
  const answerOptions = patientTest.testData.answerOptions || DEFAULT_ANSWER_OPTIONS;
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const progressPercentage = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);

  useEffect(() => {
    // Load existing answer for current question
    const existingAnswer = answers.find(answer => answer.questionId === currentQuestion?.id);
    setSelectedAnswer(existingAnswer ? existingAnswer.selectedOption : null);
  }, [currentQuestionIndex, answers, currentQuestion]);

  const handleAnswerChange = (value: number) => {
    setSelectedAnswer(value);
  };

  const saveCurrentAnswer = async () => {
    if (selectedAnswer === null || !currentQuestion) return;

    const answerOption = answerOptions[selectedAnswer];
    const newAnswer: TestAnswer = {
      questionId: currentQuestion.id,
      selectedOption: selectedAnswer,
      points: answerOption.points
    };

    const updatedAnswers = answers.filter(a => a.questionId !== currentQuestion.id);
    updatedAnswers.push(newAnswer);
    setAnswers(updatedAnswers);

    try {
      setSaving(true);
      await patientTestsApi.updatePatientTest(baseFolder, currentAppointment, patientTest.id, {
        currentQuestionIndex,
        answers: updatedAnswers
      });
    } catch (error) {
      console.error('Error saving answer:', error);
      message.error('Помилка збереження відповіді');
    } finally {
      setSaving(false);
    }
  };

  const handleNextQuestion = async () => {
    if (selectedAnswer === null) {
      message.warning('Будь ласка, оберіть відповідь');
      return;
    }

    await saveCurrentAnswer();

    if (isLastQuestion) {
      await completeTest();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
    }
  };

  const handlePreviousQuestion = async () => {
    if (selectedAnswer !== null) {
      await saveCurrentAnswer();
    }
    setCurrentQuestionIndex(prev => prev - 1);
  };

  const completeTest = async () => {
    try {
      setSaving(true);
      
      let finalAnswers = answers;
      if (selectedAnswer !== null && currentQuestion) {
        const answerOption = answerOptions[selectedAnswer];
        const lastAnswer: TestAnswer = {
          questionId: currentQuestion.id,
          selectedOption: selectedAnswer,
          points: answerOption.points
        };

        finalAnswers = answers.filter(a => a.questionId !== currentQuestion.id);
        finalAnswers.push(lastAnswer);
      }
      
      const finalScore = patientTestsApi.calculateTestScore(finalAnswers);
      
      const diagnosis = patientTestsApi.findDiagnosisByScore(finalScore, patientTest.testData.diagnosisRanges);
      
      const updatedTest = await patientTestsApi.updatePatientTest(baseFolder, currentAppointment, patientTest.id, {
        currentQuestionIndex,
        answers: finalAnswers,
        completed: true,
        score: finalScore,
        diagnosis,
        completedAt: new Date().toISOString()
      });

      onTestComplete(updatedTest);
    } catch (error) {
      console.error('Error completing test:', error);
      message.error('Помилка завершення тесту');
    } finally {
      setSaving(false);
    }
  };

  // Reset test progress when retaking
  useEffect(() => {
    if (isRetaking) {
      // Reset progress to allow retaking
      patientTestsApi.updatePatientTest(baseFolder, currentAppointment, patientTest.id, {
        currentQuestionIndex: 0,
        completed: false,
        score: 0,
        diagnosis: null,
        completedAt: null
      }).catch(error => {
        console.error('Error resetting test progress:', error);
      });
    }
  }, [isRetaking, baseFolder, currentAppointment, patientTest.id]);

  if (!currentQuestion) return null;

  return (
    <div className="test-question-content">
      <div className="question-header">
        <div className="question-progress">
          <Text type="secondary" style={{ fontSize: '13px' }}>
            Питання {currentQuestionIndex + 1} з {totalQuestions}
          </Text>
          <Progress 
            percent={progressPercentage} 
            strokeWidth={6}
            status="active"
            size="small"
          />
        </div>
      </div>

      <div className="question-body">
        <div className="question-text">
          {currentQuestion.text}
        </div>

        <Radio.Group
          value={selectedAnswer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          className="answer-options"
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {answerOptions.map((option: AnswerOption, index: number) => (
              <Radio key={index} value={index} className="answer-option">
                <span className="option-text">{option.text}</span>
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </div>

      <div className="question-actions">
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0 || saving}
          >
            Попереднє
          </Button>
          
          <Button
            type="primary"
            icon={isLastQuestion ? <CheckCircleOutlined /> : <ArrowRightOutlined />}
            onClick={handleNextQuestion}
            disabled={selectedAnswer === null || saving}
            loading={saving}
          >
            {isLastQuestion ? 'Завершити тест' : 'Наступне'}
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default HandicapIndexTaker;
