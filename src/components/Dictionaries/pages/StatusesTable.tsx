import React, { useState, useEffect, useContext } from 'react';
import { Table, Button, Modal, Input, Space, Tag, message, Tooltip, Radio } from 'antd';
import { EditOutlined, DeleteOutlined, UndoOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';
import { AppConfigContext } from '../../../holders/AppConfig';
import { PatientStatusItem, formatDate } from '../types';
import * as patientsApi from '../../../helpers/patientsApi';
import { saveTableState, loadTableState, TABLE_KEYS, PersistedTableState } from '../../../helpers/tableStateHelper';

interface StatusesTableProps {
  data: PatientStatusItem[];
  loading: boolean;
  onDataChange: () => void;
}

const StatusesTable: React.FC<StatusesTableProps> = ({ data, loading, onDataChange }) => {
  const { t } = useTranslation();
  const { showSizeChanger } = useContext(AppConfigContext);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingStatus, setEditingStatus] = useState<PatientStatusItem | null>(null);
  const [editName, setEditName] = useState('');

  // Table state
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, FilterValue | null>>({});
  const [sorter, setSorter] = useState<{ field?: string; order?: 'ascend' | 'descend' }>({});

  // Load saved table state on mount
  useEffect(() => {
    const loadSavedState = async () => {
      const savedState = await loadTableState(TABLE_KEYS.STATUSES);
      if (savedState) {
        if (savedState.pageSize) setPageSize(savedState.pageSize);
        if (savedState.filters) setFilters(savedState.filters);
        if (savedState.sorter) setSorter(savedState.sorter);
      }
    };
    loadSavedState();
  }, []);

  // Save table state when it changes
  const handleTableChange = (
    pagination: TablePaginationConfig,
    tableFilters: Record<string, FilterValue | null>,
    tableSorter: SorterResult<PatientStatusItem> | SorterResult<PatientStatusItem>[]
  ) => {
    const singleSorter = Array.isArray(tableSorter) ? tableSorter[0] : tableSorter;
    const newPageSize = pagination.pageSize || 10;
    const newSorter = singleSorter.field ? {
      field: singleSorter.field as string,
      order: singleSorter.order as 'ascend' | 'descend' | undefined,
    } : {};

    setPageSize(newPageSize);
    setFilters(tableFilters);
    setSorter(newSorter);

    const stateToSave: PersistedTableState = {
      pageSize: newPageSize,
      filters: tableFilters,
      sorter: newSorter.field ? newSorter : undefined,
    };
    saveTableState(TABLE_KEYS.STATUSES, stateToSave);
  };

  const handleEdit = (item: PatientStatusItem) => {
    setEditingStatus(item);
    setEditName(item.name);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingStatus || !editName.trim()) return;

    try {
      const success = await patientsApi.updatePatientStatusEntry(editingStatus.id, editName.trim());
      if (!success) {
        message.error(t('dictionaries.messages.saveStatusError'));
        return;
      }
      message.success(t('dictionaries.messages.saveSuccess'));
      setEditModalVisible(false);
      setEditingStatus(null);
      setEditName('');
      onDataChange();
    } catch (error) {
      console.error('Failed to update:', error);
      message.error(t('dictionaries.messages.saveError'));
    }
  };

  const handleDelete = async (item: PatientStatusItem) => {
    if (item.isDefault) {
      message.error(t('dictionaries.messages.cannotArchiveDefault'));
      return;
    }
    try {
      const success = await patientsApi.deletePatientStatusEntry(item.id);
      if (!success) {
        message.error(t('dictionaries.messages.archiveStatusError'));
        return;
      }
      message.success(t('dictionaries.messages.archiveSuccess'));
      onDataChange();
    } catch (error) {
      console.error('Failed to archive status:', error);
      message.error(t('dictionaries.messages.archiveError'));
    }
  };

  const handleRestore = async (item: PatientStatusItem) => {
    try {
      const success = await patientsApi.restorePatientStatusEntry(item.id);
      if (!success) {
        message.error(t('dictionaries.messages.restoreStatusError'));
        return;
      }
      message.success(t('dictionaries.messages.restoreSuccess'));
      onDataChange();
    } catch (error) {
      console.error('Failed to restore status:', error);
      message.error(t('dictionaries.messages.restoreError'));
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const success = await patientsApi.setDefaultPatientStatus(id);
      if (!success) {
        message.error(t('dictionaries.messages.defaultUpdateError'));
        return;
      }
      message.success(t('dictionaries.messages.defaultUpdated'));
      onDataChange();
    } catch (error) {
      console.error('Failed to set default status:', error);
      message.error(t('dictionaries.messages.updateError'));
    }
  };

  const columns: ColumnsType<PatientStatusItem> = [
    {
      title: t('dictionaries.columns.name'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortOrder: sorter.field === 'name' ? sorter.order : undefined,
      render: (text, record) => (
        <span style={{ color: record.deletedAt ? '#999' : 'inherit' }}>
          {text}
        </span>
      ),
    },
    {
      title: t('dictionaries.columns.isDefault'),
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 160,
      render: (isDefault, record) => (
        <Radio
          checked={isDefault}
          onChange={() => handleSetDefault(record.id)}
          disabled={!!record.deletedAt}
        >
          {isDefault && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 4 }} />}
        </Radio>
      ),
    },
    {
      title: t('dictionaries.columns.status'),
      dataIndex: 'deletedAt',
      key: 'status',
      width: 120,
      filters: [
        { text: t('dictionaries.filters.active'), value: 'active' },
        { text: t('dictionaries.filters.archived'), value: 'deleted' },
      ],
      filteredValue: filters.status as string[] || null,
      onFilter: (value, record) => {
        if (value === 'active') return !record.deletedAt;
        return !!record.deletedAt;
      },
      render: (deletedAt) => (
        deletedAt ? (
          <Tag color="red">{t('dictionaries.statuses.archived')}</Tag>
        ) : (
          <Tag color="green">{t('dictionaries.statuses.active')}</Tag>
        )
      ),
    },
    {
      title: t('dictionaries.columns.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => formatDate(text),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      sortOrder: sorter.field === 'createdAt' ? sorter.order : undefined,
    },
    {
      title: t('dictionaries.columns.updatedAt'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (text) => formatDate(text),
      sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      sortOrder: sorter.field === 'updatedAt' ? sorter.order : undefined,
    },
    {
      title: t('dictionaries.columns.actions'),
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('dictionaries.tooltips.edit')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {record.deletedAt ? (
            <Tooltip title={t('dictionaries.tooltips.restore')}>
              <Button
                type="text"
                size="small"
                icon={<UndoOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleRestore(record)}
              />
            </Tooltip>
          ) : (
            <Tooltip title={record.isDefault ? t('dictionaries.tooltips.cannotArchiveDefault') : t('dictionaries.tooltips.archive')}>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
                disabled={record.isDefault}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        onChange={handleTableChange}
        pagination={{ 
          pageSize: pageSize, 
          showSizeChanger: showSizeChanger, 
          showTotal: (total, range) => t('common.pagination.showTotal', { start: range[0], end: range[1], total })
        }}
      />

      <Modal
        title={t('dictionaries.modals.editStatus')}
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingStatus(null);
          setEditName('');
        }}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder={t('dictionaries.placeholders.enterStatusName')}
          onPressEnter={handleSaveEdit}
        />
      </Modal>
    </>
  );
};

export default StatusesTable;
