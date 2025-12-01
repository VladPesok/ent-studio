import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, message, Tooltip, Typography } from 'antd';
import { 
  FolderAddOutlined, 
  FolderOpenOutlined, 
  CheckCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import './StorageLocations.css';

const { Text } = Typography;

interface StorageLocation {
  id: number;
  path: string;
  isActive: boolean;
  createdAt: string;
  patientCount: number;
  totalSize: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const StorageLocations: React.FC = () => {
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const data = await window.ipcRenderer.invoke('db:storagePaths:getAll');
      setLocations(data);
    } catch (error) {
      console.error('Failed to load storage locations:', error);
      message.error('Помилка завантаження розташувань');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const handleAddLocation = async () => {
    setActionLoading(-1);
    try {
      const result = await window.ipcRenderer.invoke('db:storagePaths:add');
      if (result.success) {
        message.success('Папку додано');
        loadLocations();
      } else if (!result.canceled) {
        message.error(result.error || 'Помилка додавання папки');
      }
    } catch (error) {
      console.error('Failed to add location:', error);
      message.error('Помилка додавання папки');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetActive = async (id: number) => {
    setActionLoading(id);
    try {
      await window.ipcRenderer.invoke('db:storagePaths:setActive', id);
      message.success('Активну папку змінено');
      loadLocations();
    } catch (error) {
      console.error('Failed to set active location:', error);
      message.error('Помилка зміни активної папки');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenFolder = async (path: string) => {
    try {
      await window.ipcRenderer.invoke('db:storagePaths:openInExplorer', path);
    } catch (error) {
      console.error('Failed to open folder:', error);
      message.error('Помилка відкриття папки');
    }
  };

  const columns: ColumnsType<StorageLocation> = [
    {
      title: 'Шлях',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
      render: (path: string, record) => (
        <Space>
          <Tooltip title={path}>
            <Text 
              style={{ 
                maxWidth: 400, 
                display: 'inline-block',
                color: record.isActive ? undefined : '#666'
              }} 
              ellipsis
            >
              {path}
            </Text>
          </Tooltip>
          <Tooltip title="Відкрити в провіднику">
            <Button
              type="text"
              size="small"
              icon={<FolderOpenOutlined />}
              onClick={() => handleOpenFolder(path)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Пацієнтів',
      dataIndex: 'patientCount',
      key: 'patientCount',
      width: 120,
      align: 'center',
      render: (count: number) => count,
    },
    {
      title: 'Розмір',
      dataIndex: 'totalSize',
      key: 'totalSize',
      width: 120,
      align: 'right',
      render: (size: number) => formatBytes(size),
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'status',
      width: 130,
      align: 'center',
      render: (isActive: boolean) => (
        isActive ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>Активна</Tag>
        ) : (
          <Tag color="default">Неактивна</Tag>
        )
      ),
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 130,
      align: 'center',
      render: (_, record) => (
        !record.isActive ? (
          <Tooltip title="Зробити активною">
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleSetActive(record.id)}
              loading={actionLoading === record.id}
            >
              Активувати
            </Button>
          </Tooltip>
        ) : null
      ),
    },
  ];

  return (
    <Card 
      title="Розташування даних пацієнтів" 
      style={{ marginBottom: 24 }}
      extra={
        <Button
          type="primary"
          icon={<FolderAddOutlined />}
          onClick={handleAddLocation}
          loading={actionLoading === -1}
        >
          Додати папку
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={locations}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'Немає налаштованих розташувань' }}
      />
      
      <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
        <strong>Примітка:</strong> Нові пацієнти будуть створюватися в активній папці. 
        Існуючі пацієнти залишаться у своїх папках.
      </Text>
    </Card>
  );
};

export default StorageLocations;

