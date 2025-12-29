import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, message, Tooltip, Typography } from 'antd';
import { 
  FolderAddOutlined, 
  FolderOpenOutlined, 
  CheckCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
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

const formatBytes = (bytes: number, t: (key: string) => string): string => {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const StorageLocations: React.FC = () => {
  const { t } = useTranslation();
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
      message.error(t('settings.storage.messages.loadError'));
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
        message.success(t('settings.storage.messages.folderAdded'));
        loadLocations();
      } else if (!result.canceled) {
        message.error(result.error || t('settings.storage.messages.folderAddError'));
      }
    } catch (error) {
      console.error('Failed to add location:', error);
      message.error(t('settings.storage.messages.folderAddError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetActive = async (id: number) => {
    setActionLoading(id);
    try {
      await window.ipcRenderer.invoke('db:storagePaths:setActive', id);
      message.success(t('settings.storage.messages.activeFolderChanged'));
      loadLocations();
    } catch (error) {
      console.error('Failed to set active location:', error);
      message.error(t('settings.storage.messages.activeFolderError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenFolder = async (path: string) => {
    try {
      await window.ipcRenderer.invoke('db:storagePaths:openInExplorer', path);
    } catch (error) {
      console.error('Failed to open folder:', error);
      message.error(t('settings.storage.messages.openFolderError'));
    }
  };

  const columns: ColumnsType<StorageLocation> = [
    {
      title: t('settings.storage.columns.path'),
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
          <Tooltip title={t('settings.storage.openInExplorer')}>
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
      title: t('settings.storage.columns.patientCount'),
      dataIndex: 'patientCount',
      key: 'patientCount',
      width: 120,
      align: 'center',
      render: (count: number) => count,
    },
    {
      title: t('settings.storage.columns.size'),
      dataIndex: 'totalSize',
      key: 'totalSize',
      width: 120,
      align: 'right',
      render: (size: number) => formatBytes(size, t),
    },
    {
      title: t('settings.storage.columns.status'),
      dataIndex: 'isActive',
      key: 'status',
      width: 130,
      align: 'center',
      render: (isActive: boolean) => (
        isActive ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>{t('settings.storage.statuses.active')}</Tag>
        ) : (
          <Tag color="default">{t('settings.storage.statuses.inactive')}</Tag>
        )
      ),
    },
    {
      title: t('settings.storage.columns.actions'),
      key: 'actions',
      width: 130,
      align: 'center',
      render: (_, record) => (
        !record.isActive ? (
          <Tooltip title={t('settings.storage.makeActive')}>
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleSetActive(record.id)}
              loading={actionLoading === record.id}
            >
              {t('settings.storage.activate')}
            </Button>
          </Tooltip>
        ) : null
      ),
    },
  ];

  return (
    <Card 
      title={t('settings.storage.title')} 
      style={{ marginBottom: 24 }}
      extra={
        <Button
          type="primary"
          icon={<FolderAddOutlined />}
          onClick={handleAddLocation}
          loading={actionLoading === -1}
        >
          {t('settings.storage.addFolder')}
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={locations}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: t('settings.storage.emptyLocations') }}
      />
      
      <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
        <strong>{t('common.note')}</strong> {t('settings.storage.hint')}
      </Text>
    </Card>
  );
};

export default StorageLocations;
