import React, { useState, useEffect } from 'react';
import { Card, List, Button, Upload, message, Empty } from 'antd';
import { UploadOutlined, FileOutlined, DeleteOutlined } from '@ant-design/icons';

interface CustomTabProps {
  baseFolder: string;
  tabFolder: string;
  tabName: string;
}

interface CustomFile {
  name: string;
  path: string;
  size: number;
  type: string;
}

const CustomTab: React.FC<CustomTabProps> = ({ baseFolder, tabFolder, tabName }) => {
  const [files, setFiles] = useState<CustomFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [baseFolder, tabFolder]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      // This would call electron API to get files from the custom folder
      const customFiles = await window.electronAPI.getCustomTabFiles(baseFolder, tabFolder);
      setFiles(customFiles || []);
    } catch (error) {
      console.error('Error loading custom tab files:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      await window.electronAPI.uploadCustomTabFile(baseFolder, tabFolder, file);
      message.success(`Файл ${file.name} завантажено`);
      loadFiles();
    } catch (error) {
      message.error(`Помилка завантаження файлу: ${error}`);
    }
    return false; // Prevent default upload
  };

  const handleDelete = async (fileName: string) => {
    try {
      await window.electronAPI.deleteCustomTabFile(baseFolder, tabFolder, fileName);
      message.success('Файл видалено');
      loadFiles();
    } catch (error) {
      message.error(`Помилка видалення файлу: ${error}`);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      await window.electronAPI.openFileInDefaultApp(filePath);
    } catch (error) {
      message.error(`Помилка відкриття файлу: ${error}`);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Card
        title={`${tabName} - Файли`}
        extra={
          <Upload
            beforeUpload={handleUpload}
            showUploadList={false}
            multiple
          >
            <Button icon={<UploadOutlined />}>
              Завантажити файли
            </Button>
          </Upload>
        }
      >
        {files.length === 0 ? (
          <Empty description="Немає файлів" />
        ) : (
          <List
            loading={loading}
            dataSource={files}
            renderItem={(file) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    icon={<FileOutlined />}
                    onClick={() => handleOpenFile(file.path)}
                  >
                    Відкрити
                  </Button>,
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(file.name)}
                  >
                    Видалити
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<FileOutlined />}
                  title={file.name}
                  description={`${(file.size / 1024).toFixed(1)} KB`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default CustomTab;