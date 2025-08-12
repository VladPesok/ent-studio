import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Input, Select, Space, Progress, Typography, message } from 'antd';
import { 
  AudioOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined,
  SaveOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { getWaveBlob } from 'webm-to-wav-converter';
import './RecordAudioModal.css';

const { Text, Title } = Typography;
const { Option } = Select;

interface RecordAudioModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (audioBlob: Blob, filename: string) => Promise<void>;
}

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
}

const RecordAudioModal: React.FC<RecordAudioModalProps> = ({
  visible,
  onCancel,
  onSave
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [filename, setFilename] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [fileExtension, setFileExtension] = useState('.wav');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate default filename
  const generateDefaultFilename = () => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `AudioRecord_${timestamp}`;
  };

  // Load audio devices
  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`
        }));
      
      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDevice) {
        setSelectedDevice(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error loading audio devices:', error);
      message.error('Failed to load audio devices');
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
    
  const pickAudioMime = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2',  // Safari fallback
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];
    return candidates.find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t)) || '';
  };

  // Start recording
  const startRecording = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const mimeType = pickAudioMime();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // preserve original type for correct conversion branch
        const type = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        setFileExtension('.wav');
        setFilename((prev) => {
          const currentName = prev || generateDefaultFilename();
          // Remove any existing extension and don't add .wav since it's shown as suffix
          return currentName.replace(/\.[^.]+$/, '');
        });

        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch (e) {
      message.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  // Pause/Resume recording
  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl('');
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleSave = async () => {
    if (!audioBlob || !filename.trim()) {
      message.error('Please provide a filename for the recording');
      return;
    }

    setSaving(true);
    try {
      let finalFilename = filename.trim();
      let finalBlob: Blob = audioBlob;

      const ensureWavName = (name: string) =>
        name.replace(/\.[^.]+$/i, '') + '.wav';

      // Convert only if it's not already a WAV
      const isWebmLike =
        /webm|ogg|mp4|m4a|aac|mp3|wma|flac/i.test(audioBlob.type) ||
        /\.webm|\.ogg|\.mp4|\.m4a|\.aac|\.mp3|\.wma|\.flac$/i.test(finalFilename);

      if (isWebmLike) {
        try {
          const wavBlob = await getWaveBlob(audioBlob, false); // 16-bit PCM
          finalBlob = new Blob([wavBlob], { type: 'audio/wav' });
          finalFilename = ensureWavName(finalFilename);
        } catch (err) {
          message.warning('WAV conversion failed, saving original format');
          // keep original blob; normalize extension
          if (!/\.[^.]+$/.test(finalFilename)) {
            finalFilename += audioBlob.type.includes('webm') ? '.webm' : '';
          }
        }
      } else {
        // not webm-like, ensure .wav suffix
        finalFilename = ensureWavName(finalFilename);
        if (!/wav/i.test(finalBlob.type)) {
          finalBlob = new Blob([await finalBlob.arrayBuffer()], { type: 'audio/wav' });
        }
      }

      await onSave(finalBlob, finalFilename);
      const format = finalFilename.toLowerCase().endsWith('.wav') ? 'WAV' : 'original';
      handleCancel();
    } catch (error) {
      message.error('Failed to save recording');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setAudioUrl('');
    setFilename(generateDefaultFilename());
    setFileExtension('.wav');
    
    onCancel();
  };

  useEffect(() => {
    if (visible) {
      setFilename(generateDefaultFilename());
      loadAudioDevices();
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <Modal
      title={
        <div className="record-modal-title">
          <AudioOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Record Audio
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          disabled={!audioBlob || !filename.trim()}
          loading={saving}
        >
          Save Recording
        </Button>
      ]}
      className="record-audio-modal"
    >
      <div className="record-modal-content">
        {/* Device Selection */}
        <div className="device-selection">
          <Text strong>Microphone:</Text>
          <Select
            value={selectedDevice}
            onChange={setSelectedDevice}
            style={{ width: '100%', marginTop: 8 }}
            placeholder="Select microphone"
          >
            {audioDevices.map(device => (
              <Option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </Option>
            ))}
          </Select>
        </div>

        {/* Filename Input */}
        <div className="filename-input">
          <Text strong>Filename:</Text>
          <Input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Enter filename"
            style={{ marginTop: 8 }}
            suffix={fileExtension}
          />
        </div>

        {/* Recording Controls */}
        <div className="recording-controls">
          <div className="recording-status">
            {isRecording && (
              <div className="recording-indicator">
                <div className="recording-dot" />
                <Text strong style={{ color: '#ff4d4f' }}>
                  {isPaused ? 'PAUSED' : 'RECORDING'}
                </Text>
              </div>
            )}
            <div className="recording-time">
              <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {formatTime(recordingTime)}
              </Text>
            </div>
          </div>

          <div className="control-buttons">
            <Space size="large">
              {!isRecording ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<AudioOutlined />}
                  onClick={startRecording}
                  disabled={!selectedDevice}
                >
                  Start Recording
                </Button>
              ) : (
                <>
                  <Button
                    size="large"
                    icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                    onClick={togglePauseRecording}
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    size="large"
                    icon={<StopOutlined />}
                    onClick={stopRecording}
                    danger
                  >
                    Stop
                  </Button>
                </>
              )}
            </Space>
          </div>
        </div>

        {/* Playback Controls */}
        {audioBlob && (
          <div className="playback-section">
            <div className="playback-header">
              <Text strong>Recording Preview:</Text>
              <Button
                type="text"
                icon={<DeleteOutlined />}
                onClick={deleteRecording}
                danger
                size="small"
              >
                Delete
              </Button>
            </div>
            
            <div className="playback-controls">
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RecordAudioModal;