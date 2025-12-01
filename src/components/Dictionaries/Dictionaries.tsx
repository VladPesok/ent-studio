import React, { useState, useEffect, useContext } from 'react';
import { Tabs, Table, Button, Modal, Input, Space, Tag, message, Tooltip, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, UndoOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AppConfigContext } from '../../holders/AppConfig';
import './Dictionaries.css';

const { Title } = Typography;

interface DictionaryItem {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

type DictionaryType = 'doctors' | 'diagnoses';

const Dictionaries: React.FC = () => {
  const { refreshDictionaries } = useContext(AppConfigContext);
  const [activeTab, setActiveTab] = useState<DictionaryType>('doctors');
  const [doctors, setDoctors] = useState<DictionaryItem[]>([]);
  const [diagnoses, setDiagnoses] = useState<DictionaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [doctorsData, diagnosesData] = await Promise.all([
        window.ipcRenderer.invoke('db:dict:doctors:getAll', true),
        window.ipcRenderer.invoke('db:dict:diagnoses:getAll', true),
      ]);
      setDoctors(doctorsData);
      setDiagnoses(diagnosesData);
    } catch (error) {
      console.error('Failed to load dictionaries:', error);
      message.error('Помилка завантаження словників');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle edit
  const handleEdit = (item: DictionaryItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditModalVisible(true);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim()) return;

    try {
      const handler = activeTab === 'doctors' ? 'db:dict:doctors:update' : 'db:dict:diagnoses:update';
      await window.ipcRenderer.invoke(handler, editingItem.id, editName.trim());
      message.success('Збережено');
      setEditModalVisible(false);
      setEditingItem(null);
      setEditName('');
      loadData();
      refreshDictionaries();
    } catch (error) {
      console.error('Failed to update:', error);
      message.error('Помилка збереження');
    }
  };

  // Handle soft delete
  const handleDelete = async (item: DictionaryItem) => {
    try {
      const handler = activeTab === 'doctors' ? 'db:dict:doctors:delete' : 'db:dict:diagnoses:delete';
      await window.ipcRenderer.invoke(handler, item.id);
      message.success('Видалено');
      loadData();
      refreshDictionaries();
    } catch (error) {
      console.error('Failed to delete:', error);
      message.error('Помилка видалення');
    }
  };

  // Handle restore
  const handleRestore = async (item: DictionaryItem) => {
    try {
      const handler = activeTab === 'doctors' ? 'db:dict:doctors:restore' : 'db:dict:diagnoses:restore';
      await window.ipcRenderer.invoke(handler, item.id);
      message.success('Відновлено');
      loadData();
      refreshDictionaries();
    } catch (error) {
      console.error('Failed to restore:', error);
      message.error('Помилка відновлення');
    }
  };

  // Handle add new
  const handleAdd = async () => {
    if (!newName.trim()) return;

    try {
      const handler = activeTab === 'doctors' ? 'db:dict:addDoctor' : 'db:dict:addDiagnosis';
      await window.ipcRenderer.invoke(handler, newName.trim());
      message.success('Додано');
      setAddModalVisible(false);
      setNewName('');
      loadData();
      refreshDictionaries();
    } catch (error) {
      console.error('Failed to add:', error);
      message.error('Помилка додавання');
    }
  };

  // Table columns
  const columns: ColumnsType<DictionaryItem> = [
    {
      title: 'Назва',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <span style={{ color: record.deletedAt ? '#999' : 'inherit' }}>
          {text}
        </span>
      ),
    },
    {
      title: 'Створено',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => formatDate(text),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Оновлено',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (text) => formatDate(text),
      sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    },
    {
      title: 'Статус',
      dataIndex: 'deletedAt',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Активний', value: 'active' },
        { text: 'Видалений', value: 'deleted' },
      ],
      onFilter: (value, record) => {
        if (value === 'active') return !record.deletedAt;
        return !!record.deletedAt;
      },
      render: (deletedAt) => (
        deletedAt ? (
          <Tag color="red">Видалений</Tag>
        ) : (
          <Tag color="green">Активний</Tag>
        )
      ),
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Редагувати">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {record.deletedAt ? (
            <Tooltip title="Відновити">
              <Button
                type="text"
                size="small"
                icon={<UndoOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleRestore(record)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Видалити">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'doctors',
      label: 'Лікарі',
      children: (
        <Table
          columns={columns}
          dataSource={doctors}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10, 
            showSizeChanger: true, 
            showTotal: (total, range) => `${range[0]}-${range[1]} з ${total} записів` 
          }}
        />
      ),
    },
    {
      key: 'diagnoses',
      label: 'Діагнози',
      children: (
        <Table
          columns={columns}
          dataSource={diagnoses}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10, 
            showSizeChanger: true, 
            showTotal: (total, range) => `${range[0]}-${range[1]} з ${total} записів` 
          }}
        />
      ),
    },
  ];

  return (
    <div className="dictionaries-wrapper">
      <div className="dictionaries-container">
        <div className="dictionaries-header">
        <Title level={3}>Словники</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalVisible(true)}
        >
          Додати {activeTab === 'doctors' ? 'лікаря' : 'діагноз'}
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as DictionaryType)}
        items={tabItems}
      />

      {/* Edit Modal */}
      <Modal
        title="Редагувати"
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingItem(null);
          setEditName('');
        }}
        okText="Зберегти"
        cancelText="Скасувати"
      >
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Введіть назву"
          onPressEnter={handleSaveEdit}
        />
      </Modal>

      {/* Add Modal */}
      <Modal
        title={`Додати ${activeTab === 'doctors' ? 'лікаря' : 'діагноз'}`}
        open={addModalVisible}
        onOk={handleAdd}
        onCancel={() => {
          setAddModalVisible(false);
          setNewName('');
        }}
        okText="Додати"
        cancelText="Скасувати"
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Введіть назву"
          onPressEnter={handleAdd}
        />
      </Modal>
      </div>
    </div>
  );
};

export default Dictionaries;

