import React, { useState, useEffect } from 'react';
import { Button, Space, message, Empty } from 'antd';
import { 
  PlusOutlined, 
  FolderOpenOutlined
} from '@ant-design/icons';
import * as patientsApi from '../../../helpers/patientsApi';
import { getFileIconByExtension } from '../../../helpers/fileTypeHelper';
import './CustomTab.css';

interface CustomTabProps {
  baseFolder: string;
  tabFolder: string;
  tabName: string;
  currentAppointment?: string;
}

interface CustomFile {
  name: string;
  path: string;
  size: number;
  type: string;
  extension: string;
  modified: Date;
}

const CustomTab: React.FC<CustomTabProps> = ({ baseFolder, tabFolder, tabName, currentAppointment }) => {
  const [files, setFiles] = useState<CustomFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [baseFolder, tabFolder, currentAppointment]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };



  const loadFiles = async () => {
    setLoading(true);
    try {
      const customFiles = await patientsApi.getCustomTabFiles(baseFolder, tabName, currentAppointment);
      setFiles((customFiles || []).map((file: CustomFile) => ({
        ...file,
        type: file.extension.substring(1)
      })));
    } catch (error) {
      console.error('Error loading custom tab files:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFiles = async () => {
    try {      
      const result = await patientsApi.selectAndCopyFiles(baseFolder, tabName, currentAppointment);
      if (result.success && result.count > 0) {
        message.success(`Додано ${result.count} файл(ів)`);
        loadFiles();
      }
    } catch (error) {
      console.error("Failed to add files:", error);
      message.error("Помилка додавання файлів");
    }
  };

  const handleOpenFolder = async () => {
    try {
      const folderPath = currentAppointment 
        ? `${baseFolder}/${currentAppointment}/${tabFolder}`
        : `${baseFolder}/${tabFolder}`;
      
      await patientsApi.openPatientFolderInFs(folderPath);
    } catch (error) {
      console.error("Failed to open folder:", error);
      message.error("Помилка відкриття папки");
    }
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      await patientsApi.openFileInDefaultApp(filePath);
    } catch (error) {
      console.error("Failed to open file:", error);
      message.error("Помилка відкриття файлу");
    }
  };

  if (loading && files.length === 0) {
    return (
      <div className="custom-tab-wrap">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Завантаження файлів...</p>
        </div>
      </div>
    );
  }

  if (!loading && files.length === 0) {
    return (
      <div className="custom-tab-empty-wrap">
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>Немає файлів</h3>
          <p>Додайте файли до папки "{tabName}"</p>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddFiles}
            >
              Додати файли
            </Button>
            <Button 
              icon={<FolderOpenOutlined />} 
              onClick={handleOpenFolder}
            >
              Відкрити папку
            </Button>
          </Space>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-tab-wrap">
      <div className="custom-tab-header">
        <div className="tab-info">
          <h3>{tabName} ({files.length})</h3>
        </div>
        <div className="tab-actions">
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddFiles}
            >
              Додати файли
            </Button>
            <Button 
              icon={<FolderOpenOutlined />} 
              onClick={handleOpenFolder}
            >
              Відкрити папку
            </Button>
          </Space>
        </div>
      </div>

      <div className="files-grid">
        {files.map((file, index) => (
          <div
            key={`${file.path}-${index}`}
            className="file-card"
            onClick={() => handleOpenFile(file.path)}
          >
            <div className="file-card-icon">
              {getFileIconByExtension(file.extension)}
            </div>
            <div className="file-card-content">
              <h4 className="file-card-name" title={file.name}>
                {file.name}
              </h4>
              <div className="file-card-meta">
                <div className="file-card-size">{formatFileSize(file.size)}</div>
                <div className="file-card-ext">{file.extension.toUpperCase()}</div>
                <div className="file-card-date">
                  {new Date(file.modified).toLocaleDateString('uk-UA')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomTab;