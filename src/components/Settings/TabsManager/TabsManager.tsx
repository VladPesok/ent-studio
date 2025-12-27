import React, { useState, useEffect } from 'react';
import { Card, List, Switch, Button, Input, Modal, message, Space, Typography, Tooltip } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined,
  LockOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import * as configApi from '../../../helpers/configApi';
import './TabsManager.css';

const { Text } = Typography;

interface TabItem {
  id: number;
  name: string;
  folder: string;
  displayOrder: number;
  isVisible: boolean;
  isDefault: boolean;
}

const TabsManager: React.FC = () => {
  const { t } = useTranslation();
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTab, setEditingTab] = useState<TabItem | null>(null);
  const [newTabName, setNewTabName] = useState('');
  const [editTabName, setEditTabName] = useState('');

  const loadTabs = async () => {
    setLoading(true);
    try {
      const data = await window.ipcRenderer.invoke('db:tabs:getAll');
      setTabs(data.sort((a: TabItem, b: TabItem) => a.displayOrder - b.displayOrder));
    } catch (error) {
      console.error('Failed to load tabs:', error);
      message.error('Помилка завантаження вкладок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabs();
  }, []);

  const handleVisibilityChange = async (tab: TabItem, checked: boolean) => {
    try {
      await window.ipcRenderer.invoke('db:tabs:setVisibility', tab.id, checked);
      setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isVisible: checked } : t));
    } catch (error) {
      console.error('Failed to update visibility:', error);
      message.error('Помилка зміни видимості');
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    
    const newTabs = [...tabs];
    [newTabs[index - 1], newTabs[index]] = [newTabs[index], newTabs[index - 1]];
    
    try {
      await window.ipcRenderer.invoke('db:tabs:reorder', newTabs.map(t => t.id));
      setTabs(newTabs.map((t, i) => ({ ...t, displayOrder: i })));
    } catch (error) {
      console.error('Failed to reorder:', error);
      message.error('Помилка зміни порядку');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === tabs.length - 1) return;
    
    const newTabs = [...tabs];
    [newTabs[index], newTabs[index + 1]] = [newTabs[index + 1], newTabs[index]];
    
    try {
      await window.ipcRenderer.invoke('db:tabs:reorder', newTabs.map(t => t.id));
      setTabs(newTabs.map((t, i) => ({ ...t, displayOrder: i })));
    } catch (error) {
      console.error('Failed to reorder:', error);
      message.error('Помилка зміни порядку');
    }
  };

  const handleEdit = (tab: TabItem) => {
    setEditingTab(tab);
    setEditTabName(tab.isDefault ? t(tab.name) : tab.name);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTab || !editTabName.trim()) return;
    
    try {
      await window.ipcRenderer.invoke('db:tabs:rename', editingTab.id, editTabName.trim());
      setTabs(prev => prev.map(t => t.id === editingTab.id ? { ...t, name: editTabName.trim() } : t));
      setEditModalVisible(false);
      setEditingTab(null);
      setEditTabName('');
      message.success('Вкладку перейменовано');
    } catch (error) {
      console.error('Failed to rename:', error);
      message.error('Помилка перейменування');
    }
  };

  const handleAdd = async () => {
    if (!newTabName.trim()) return;
    
    const folder = configApi.createFolderName(newTabName.trim());
    
    // Check for duplicate folder
    if (tabs.some(t => t.folder === folder)) {
      message.error('Вкладка з такою назвою вже існує');
      return;
    }
    
    try {
      const newTab = await window.ipcRenderer.invoke('db:tabs:add', newTabName.trim(), folder);
      setTabs(prev => [...prev, newTab]);
      setAddModalVisible(false);
      setNewTabName('');
      message.success('Вкладку додано');
    } catch (error) {
      console.error('Failed to add tab:', error);
      message.error('Помилка додавання вкладки');
    }
  };

  const handleDelete = async (tab: TabItem) => {
    Modal.confirm({
      title: 'Видалити вкладку?',
      content: `Ви впевнені, що хочете видалити вкладку "${tab.name}"? Файли в папці пацієнтів не будуть видалені.`,
      okText: 'Видалити',
      cancelText: 'Скасувати',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const result = await window.ipcRenderer.invoke('db:tabs:delete', tab.id);
          if (result.success) {
            setTabs(prev => prev.filter(t => t.id !== tab.id));
            message.success('Вкладку видалено');
          } else {
            message.error(result.error || 'Помилка видалення');
          }
        } catch (error) {
          console.error('Failed to delete:', error);
          message.error('Помилка видалення');
        }
      },
    });
  };

  const getDisplayName = (tab: TabItem) => {
    if (tab.isDefault) {
      return t(tab.name);
    }
    return tab.name;
  };

  return (
    <Card 
      title="Відображувані вкладки" 
      style={{ marginBottom: 24 }}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalVisible(true)}
          size="small"
        >
          Додати вкладку
        </Button>
      }
    >
      <List
        loading={loading}
        dataSource={tabs}
        locale={{ emptyText: 'Немає вкладок' }}
        renderItem={(tab, index) => (
          <List.Item
            className={`tab-list-item ${!tab.isVisible ? 'tab-hidden' : ''}`}
            actions={[
              <Space key="actions" size="small">
                <Tooltip title="Вгору">
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowUpOutlined />}
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  />
                </Tooltip>
                <Tooltip title="Вниз">
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowDownOutlined />}
                    onClick={() => handleMoveDown(index)}
                    disabled={index === tabs.length - 1}
                  />
                </Tooltip>
                <Tooltip title="Перейменувати">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(tab)}
                  />
                </Tooltip>
                {!tab.isDefault && (
                  <Tooltip title="Видалити">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(tab)}
                    />
                  </Tooltip>
                )}
              </Space>
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Switch
                    size="small"
                    checked={tab.isVisible}
                    onChange={(checked) => handleVisibilityChange(tab, checked)}
                  />
                  <Text style={{ color: tab.isVisible ? undefined : '#999' }}>
                    {getDisplayName(tab)}
                  </Text>
                  {tab.isDefault && (
                    <Tooltip title="Стандартна вкладка">
                      <LockOutlined style={{ color: '#999', fontSize: 12 }} />
                    </Tooltip>
                  )}
                </Space>
              }
            />
          </List.Item>
        )}
      />

      <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
        Використовуйте стрілки для зміни порядку вкладок. Приховані вкладки не відображаються у картці пацієнта.
      </Text>

      {/* Add Modal */}
      <Modal
        title="Додати вкладку"
        open={addModalVisible}
        onOk={handleAdd}
        onCancel={() => {
          setAddModalVisible(false);
          setNewTabName('');
        }}
        okText="Додати"
        cancelText="Скасувати"
      >
        <Input
          value={newTabName}
          onChange={(e) => setNewTabName(e.target.value)}
          placeholder="Назва вкладки"
          onPressEnter={handleAdd}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Перейменувати вкладку"
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingTab(null);
          setEditTabName('');
        }}
        okText="Зберегти"
        cancelText="Скасувати"
      >
        <Input
          value={editTabName}
          onChange={(e) => setEditTabName(e.target.value)}
          placeholder="Назва вкладки"
          onPressEnter={handleSaveEdit}
        />
      </Modal>
    </Card>
  );
};

export default TabsManager;

