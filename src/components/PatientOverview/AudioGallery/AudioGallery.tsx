import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Space } from 'antd';
import { 
  PlusOutlined, 
  FolderOpenOutlined,
  AudioOutlined
} from '@ant-design/icons';
import RecordAudioModal from './RecordAudioModal/RecordAudioModal';

import "./AudioGallery.css";

interface AudioFile {
  url: string;
  fileName: string;
  path: string;
  size: number;
  extension: string;
  modified: Date;
  fileType: string;
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
      const files = await window.electronAPI.getAudioFiles(baseFolder, currentAppointment);
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
  }, [loadAudioFiles]);

  const handleLoadMoreAudio = async () => {
    try {
      const result = await window.electronAPI.loadMoreAudio(baseFolder, currentAppointment);
      if (result.success && result.count > 0) {
        loadAudioFiles();
      }
    } catch (error) {
      console.error("Failed to load more audio:", error);
    }
  };

  const handleOpenAudioFolder = async () => {
    try {
      await window.electronAPI.openAudioFolder(baseFolder, currentAppointment);
    } catch (error) {
      console.error("Failed to open audio folder:", error);
    }
  };

  const handlePlayPause = (audioFile: AudioFile) => {
    const audioElement = audioRefs.current[audioFile.url];
    if (!audioElement) return;

    if (currentPlaying === audioFile.url) {
      audioElement.pause();
      setCurrentPlaying(null);
    } else {
      // Pause any currently playing audio
      Object.values(audioRefs.current).forEach(audio => {
        if (!audio.paused) {
          audio.pause();
        }
      });
      
      audioElement.play();
      setCurrentPlaying(audioFile.url);
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
      const result = await window.electronAPI.saveRecordedAudio(
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

  if (loading && audioFiles.length === 0) {
    return (
      <div className="audio-gallery-wrap">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Завантаження аудіо файлів...</p>
        </div>
      </div>
    );
  }

  if (!loading && audioFiles.length === 0) {
    return (
      <div className="audio-gallery-wrap">
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
          <h3>Немає аудіо файлів</h3>
          <p>Додайте аудіо файли до цього прийому</p>
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
              onClick={handleLoadMoreAudio}
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
    );
  }

  return (
    <div className="audio-gallery-wrap">
      <div className="audio-gallery-header">
        <div className="gallery-info">
          <h3>Аудіо матеріали ({total})</h3>
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
              onClick={handleLoadMoreAudio}
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
        {audioFiles.map((audioFile) => (
          <div key={audioFile.url} className="audio-file-item">
            <div className="audio-file-info">
              <div className="audio-file-main">
                <div className="audio-file-details">
                  <div className="audio-file-header">
                    <h4 className="audio-file-name" title={audioFile.fileName}>
                      {audioFile.fileName}
                    </h4>
                    <div className="audio-file-meta">
                      <span className="file-size">{formatFileSize(audioFile.size)}</span>
                      <span className="file-ext">{audioFile.extension.toUpperCase()}</span>
                      <span className="file-date">{formatDate(audioFile.modified)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="audio-controls">
                <audio
                  ref={(el) => {
                    if (el) {
                      audioRefs.current[audioFile.url] = el;
                    }
                  }}
                  src={audioFile.url}
                  preload="metadata"
                  onEnded={() => handleAudioEnded(audioFile)}
                  onLoadedMetadata={(e) => {
                    const duration = getDuration(e.currentTarget);
                    const durationEl = document.getElementById(`duration-${audioFile.url}`);
                    if (duration && durationEl) {
                      durationEl.textContent = duration;
                    }
                  }}
                  controls
                  className="audio-player"
                />
              </div>
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
