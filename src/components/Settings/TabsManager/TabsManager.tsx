import React, { useState, useEffect } from 'react';
import { Card, List, Switch, Button, Input, Modal, message, Space, Typography, Tooltip } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  HolderOutlined,
  LockOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

interface SortableTabItemProps {
  tab: TabItem;
  onVisibilityChange: (tab: TabItem, checked: boolean) => void;
  onEdit: (tab: TabItem) => void;
  getDisplayName: (tab: TabItem) => string;
  renameTooltip: string;
  defaultTabTooltip: string;
}

const SortableTabItem: React.FC<SortableTabItemProps> = ({ 
  tab, 
  onVisibilityChange, 
  onEdit, 
  getDisplayName,
  renameTooltip,
  defaultTabTooltip
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? '#fafafa' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="tab-drag-item">
      <List.Item
        className={`tab-list-item ${!tab.isVisible ? 'tab-hidden' : ''}`}
        actions={[
          <Space key="actions" size="small">
            <Tooltip title={renameTooltip}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(tab)}
              />
            </Tooltip>
          </Space>
        ]}
      >
        <div className="tab-item-content">
          <div 
            className="drag-handle" 
            {...attributes} 
            {...listeners}
          >
            <HolderOutlined />
          </div>
          <List.Item.Meta
            title={
              <Space>
                <Switch
                  size="small"
                  checked={tab.isVisible}
                  onChange={(checked) => onVisibilityChange(tab, checked)}
                />
                <Text style={{ color: tab.isVisible ? undefined : '#999' }}>
                  {getDisplayName(tab)}
                </Text>
                {tab.isDefault && (
                  <Tooltip title={defaultTabTooltip}>
                    <LockOutlined style={{ color: '#999', fontSize: 12 }} />
                  </Tooltip>
                )}
              </Space>
            }
          />
        </div>
      </List.Item>
    </div>
  );
};

const TabsManager: React.FC = () => {
  const { t } = useTranslation();
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTab, setEditingTab] = useState<TabItem | null>(null);
  const [newTabName, setNewTabName] = useState('');
  const [editTabName, setEditTabName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadTabs = async () => {
    setLoading(true);
    try {
      const data = await window.ipcRenderer.invoke('db:tabs:getAll');
      setTabs(data.sort((a: TabItem, b: TabItem) => a.displayOrder - b.displayOrder));
    } catch (error) {
      console.error('Failed to load tabs:', error);
      message.error(t('settings.tabs.messages.loadError'));
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
      message.error(t('settings.tabs.messages.visibilityError'));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id);
      const newIndex = tabs.findIndex((t) => t.id === over.id);
      
      const newTabs = arrayMove(tabs, oldIndex, newIndex);
      setTabs(newTabs.map((t, i) => ({ ...t, displayOrder: i })));
      
      try {
        await window.ipcRenderer.invoke('db:tabs:reorder', newTabs.map(t => t.id));
      } catch (error) {
        console.error('Failed to reorder:', error);
        message.error(t('settings.tabs.messages.reorderError'));
        // Revert on error
        loadTabs();
      }
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
      message.success(t('settings.tabs.messages.tabRenamed'));
    } catch (error) {
      console.error('Failed to rename:', error);
      message.error(t('settings.tabs.messages.renameError'));
    }
  };

  const handleAdd = async () => {
    if (!newTabName.trim()) return;
    
    const folder = configApi.createFolderName(newTabName.trim());
    
    // Check for duplicate folder
    if (tabs.some(t => t.folder === folder)) {
      message.error(t('settings.tabs.messages.tabExists'));
      return;
    }
    
    try {
      const newTab = await window.ipcRenderer.invoke('db:tabs:add', newTabName.trim(), folder);
      setTabs(prev => [...prev, newTab]);
      setAddModalVisible(false);
      setNewTabName('');
      message.success(t('settings.tabs.messages.tabAdded'));
    } catch (error) {
      console.error('Failed to add tab:', error);
      message.error(t('settings.tabs.messages.addError'));
    }
  };

  const getDisplayName = (tab: TabItem) => {
    if (tab.isDefault) {
      return t(tab.name);
    }
    return tab.name;
  };

  return (
    <Card 
      title={t('settings.tabs.title')} 
      style={{ marginBottom: 24 }}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalVisible(true)}
          size="small"
        >
          {t('settings.tabs.addTab')}
        </Button>
      }
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tabs.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <List
            loading={loading}
            dataSource={tabs}
            locale={{ emptyText: t('settings.tabs.emptyTabs') }}
            renderItem={(tab) => (
              <SortableTabItem
                key={tab.id}
                tab={tab}
                onVisibilityChange={handleVisibilityChange}
                onEdit={handleEdit}
                getDisplayName={getDisplayName}
                renameTooltip={t('common.rename')}
                defaultTabTooltip={t('settings.tabs.defaultTab')}
              />
            )}
          />
        </SortableContext>
      </DndContext>

      <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
        {t('settings.tabs.dragHint')}
      </Text>

      {/* Add Modal */}
      <Modal
        title={t('settings.tabs.addTabModal')}
        open={addModalVisible}
        onOk={handleAdd}
        onCancel={() => {
          setAddModalVisible(false);
          setNewTabName('');
        }}
        okText={t('common.add')}
        cancelText={t('common.cancel')}
      >
        <Input
          value={newTabName}
          onChange={(e) => setNewTabName(e.target.value)}
          placeholder={t('settings.tabs.tabName')}
          onPressEnter={handleAdd}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={t('settings.tabs.renameTab')}
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingTab(null);
          setEditTabName('');
        }}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Input
          value={editTabName}
          onChange={(e) => setEditTabName(e.target.value)}
          placeholder={t('settings.tabs.tabName')}
          onPressEnter={handleSaveEdit}
        />
      </Modal>
    </Card>
  );
};

export default TabsManager;
