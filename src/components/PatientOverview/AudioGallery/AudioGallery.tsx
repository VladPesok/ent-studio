import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Space, message } from 'antd';
import { 
  PlusOutlined, 
  FolderOpenOutlined,
  AudioOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import RecordAudioModal from './RecordAudioModal/RecordAudioModal';
import * as configApi from "../../../helpers/configApi";
import * as patientsApi from "../../../helpers/patientsApi";
import { getFileIconByExtension, getFileType } from '../../../helpers/fileTypeHelper';
import type { FileType } from '../../../helpers/fileTypeHelper';

import "./AudioGallery.css";

interface AudioFile {
  url: string;
  fileName: string;
  path: string;
  size: number;
  extension: string;
  modified: Date;
  fileType: FileType;
  isAudio: boolean;
}

interface AudioGalleryProps {
  baseFolder: string;
  currentAppointment?: string;
}

const AudioGallery: React.FC<AudioGalleryProps> = ({ baseFolder, currentAppointment }) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [praatPath, setPraatPath] = useState<string>("");

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = (element: HTMLAudioElement): string => {
    if (!element.duration || isNaN(element.duration)) return "";
    const minutes = Math.floor(element.duration / 60);
    const seconds = Math.floor(element.duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const loadAudioFiles = useCallback(async () => {
    setLoading(true);
    try {
      const files = await patientsApi.getAudioFiles(baseFolder, currentAppointment);
      setAudioFiles(files);
      setTotal(files.length);
    } catch (error) {
      console.error("Failed to load audio files:", error);
    } finally {
      setLoading(false);
    }
  }, [baseFolder, currentAppointment]);

  useEffect(() => {
    loadAudioFiles();
    
    // Load Praat path from settings
    const loadPraatPath = async () => {
      try {
        const settings = await configApi.getSettings();
        setPraatPath(settings.praatPath || "");
      } catch (error) {
        console.error('Failed to load Praat path:', error);
      }
    };
    loadPraatPath();
  }, [loadAudioFiles]);

  const handleLoadMoreFiles = async () => {
    try {
      const result = await patientsApi.loadMoreAudio(baseFolder, currentAppointment);
      if (result.success && result.count > 0) {
        loadAudioFiles();
      }
    } catch (error) {
      console.error("Failed to load more files:", error);
    }
  };

  const handleOpenAudioFolder = async () => {
    try {
      await patientsApi.openAudioFolder(baseFolder, currentAppointment);
    } catch (error) {
      console.error("Failed to open audio folder:", error);
    }
  };

  const handleAudioEnded = (audioFile: AudioFile) => {
    if (currentPlaying === audioFile.url) {
      setCurrentPlaying(null);
    }
  };

  const handleSaveRecording = async (audioBlob: Blob, filename: string) => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const result = await patientsApi.saveRecordedAudio(
        baseFolder, 
        currentAppointment, 
        arrayBuffer, 
        filename
      );
      
      if (result.success) {
        // Reload audio files to show the new recording
        loadAudioFiles();
      } else {
        throw new Error(result.error || 'Failed to save recording');
      }
    } catch (error) {
      console.error('Error saving recording:', error);
      throw error;
    }
  };

  const handleOpenWithPraat = async (audioFile: AudioFile) => {
    if (!praatPath) {
      message.warning('Шлях до Praat не налаштовано. Перейдіть до налаштувань для конфігурації.');
      return;
    }

    try {
      const success = await configApi.openFileWithPraat(praatPath, audioFile.path);
      if (success) {
        message.success(`Файл ${audioFile.fileName} відкрито в Praat`);
      } else {
        message.error('Помилка при відкритті файлу в Praat');
      }
    } catch (error) {
      console.error('Error opening file with Praat:', error);
      message.error('Помилка при відкритті файлу в Praat');
    }
  };

  const handleOpenFile = async (file: AudioFile) => {
    try {
      await patientsApi.openFileInDefaultApp(file.path);
      message.success(`Файл ${file.fileName} відкрито`);
    } catch (error) {
      console.error('Error opening file:', error);
      message.error('Помилка при відкритті файлу');
    }
  };

  if (loading && audioFiles.length === 0) {
    return (
      <div className="audio-gallery-wrap">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Завантаження файлів...</p>
        </div>
      </div>
    );
  }

  if (!loading && audioFiles.length === 0) {
    return (
      <div className="audio-gallery-empty-wrap">
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
          <h3>Немає файлів</h3>
          <p>Додайте файли до цього прийому</p>
          <Space>
            <Button 
              type="primary" 
              icon={<AudioOutlined />} 
              onClick={() => setRecordModalVisible(true)}
            >
              Записати аудіо
            </Button>
            <Button 
              icon={<PlusOutlined />} 
              onClick={handleLoadMoreFiles}
            >
              Додати файли
            </Button>
            <Button 
              icon={<FolderOpenOutlined />} 
              onClick={handleOpenAudioFolder}
            >
              Відкрити папку
            </Button>
          </Space>
        </div>
        
        <RecordAudioModal
          visible={recordModalVisible}
          onCancel={() => setRecordModalVisible(false)}
          onSave={handleSaveRecording}
        />
      </div>
    );
  }

  return (
    <div className="audio-gallery-wrap">
      <div className="audio-gallery-header">
        <div className="gallery-info">
          <h3>Матеріали ({total})</h3>
        </div>
        <div className="gallery-actions">
          <Space>
            <Button 
              type="primary" 
              icon={<AudioOutlined />} 
              onClick={() => setRecordModalVisible(true)}
            >
              Записати аудіо
            </Button>
            <Button 
              icon={<PlusOutlined />} 
              onClick={handleLoadMoreFiles}
            >
              Додати файли
            </Button>
            <Button 
              icon={<FolderOpenOutlined />} 
              onClick={handleOpenAudioFolder}
            >
              Відкрити папку
            </Button>
          </Space>
        </div>
      </div>

      <div className="audio-files-list">
        {audioFiles.map((file) => (
          <div key={file.url} className="audio-file-item">
            <div className="audio-file-info">
              <div className="audio-file-main">
                <div className="file-icon" style={{ fontSize: '24px', marginRight: '12px', color: '#1890ff' }}>
                  {getFileIconByExtension(file.extension)}
                </div>
                <div className="audio-file-details">
                  <div className="audio-file-header">
                    <div className="audio-file-title-row">
                      <h4 
                        className="audio-file-name" 
                        title={file.fileName}
                        style={{ cursor: file.isAudio ? 'default' : 'pointer' }}
                        onClick={file.isAudio ? undefined : () => handleOpenFile(file)}
                      >
                        {file.fileName}
                      </h4>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {praatPath && file.isAudio && (
                          <Button
                            size="small"
                            icon={<ExperimentOutlined />}
                            onClick={() => handleOpenWithPraat(file)}
                            title="Відкрити в Praat"
                            className="praat-button"
                          >
                            Praat
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="audio-file-meta">
                      <span className="file-size">{formatFileSize(file.size)}</span>
                      <span className="file-ext">{file.extension.toUpperCase()}</span>
                      <span className="file-date">{formatDate(file.modified)}</span>
                      <span className="file-type">{file.fileType}</span>
                    </div>
                  </div>
                </div>
              </div>
              {file.isAudio && (
                <div className="audio-controls">
                  <audio
                    ref={(el) => {
                      if (el) {
                        audioRefs.current[file.url] = el;
                      }
                    }}
                    src={file.url}
                    preload="metadata"
                    onEnded={() => handleAudioEnded(file)}
                    onLoadedMetadata={(e) => {
                      const duration = getDuration(e.currentTarget);
                      const durationEl = document.getElementById(`duration-${file.url}`);
                      if (duration && durationEl) {
                        durationEl.textContent = duration;
                      }
                    }}
                    controls
                    className="audio-player"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <RecordAudioModal
        visible={recordModalVisible}
        onCancel={() => setRecordModalVisible(false)}
        onSave={handleSaveRecording}
      />
    </div>
  );
};

export default AudioGallery;
