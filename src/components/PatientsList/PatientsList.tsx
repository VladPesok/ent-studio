import React, { useMemo, useState, useEffect, useContext } from "react";
import { Table, Input, Button, Dropdown, theme as antTheme, MenuProps, DatePicker, Select, Space, Tag, Row, Col, Pagination, Modal, Progress, message, Tooltip } from "antd";
import {
  EllipsisOutlined,
  PlusOutlined,
  UsbOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  ClearOutlined,
  LoadingOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AddCardModal from "./AddCardModal/AddCardModal";
import type { ColumnsType } from "antd/es/table";
import type { FilterDropdownProps } from "antd/es/table/interface";
import * as patientsApi from "../../helpers/patientsApi";
import { AppConfigContext } from "../../holders/AppConfig";
import { saveTableState, loadTableState, TABLE_KEYS } from "../../helpers/tableStateHelper";
import "./PatientsList.css";

const { RangePicker } = DatePicker;

const { useToken } = antTheme;



interface ImportProgress {
  current: number;
  total: number;
  progress: number;
  folderName: string;
}

const PatientsList: React.FC = () => {
  const { t } = useTranslation();
  const { doctors, showSizeChanger } = useContext(AppConfigContext);
  const [patients, setPatients] = useState<patientsApi.Patient[]>([]);
  const [patientStatuses, setPatientStatuses] = useState<patientsApi.PatientStatus[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0, progress: 0, folderName: '' });
  const [tableState, setTableState] = useState<patientsApi.TableState>({
    pagination: { current: 1, pageSize: 10, total: 0 },
    filters: {},
    sorter: {},
    search: ''
  });

  const nav = useNavigate();
  const { token } = useToken();

  // Load patient statuses
  useEffect(() => {
    const loadStatuses = async () => {
      const statuses = await patientsApi.getPatientStatuses();
      setPatientStatuses(statuses);
    };
    loadStatuses();
  }, []);

  // Handle status change
  const handleStatusChange = async (folder: string, statusId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    try {
      await patientsApi.updatePatientStatus(folder, statusId);
      message.success(t('patientsList.messages.statusUpdated'));
      reloadPatients();
    } catch (error) {
      console.error('Failed to update status:', error);
      message.error(t('patientsList.messages.statusUpdateError'));
    }
  };

  const updateTableState = async (newState: Partial<patientsApi.TableState>, skipSave = false) => {
    const updatedState = { ...tableState, ...newState };
    setTableState(updatedState);

    // Convert table state to database filters
    const dbFilters = patientsApi.tableStateToDbFilters(updatedState);
    
    const result = await patientsApi.getPatients(dbFilters);
    setPatients(result.data);
    setTableState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        total: result.total,
        current: result.page,
        pageSize: result.pageSize
      }
    }));

    // Save table state (excluding search)
    if (!skipSave) {
      saveTableState(TABLE_KEYS.PATIENTS, {
        pageSize: updatedState.pagination.pageSize,
        filters: updatedState.filters,
        sorter: updatedState.sorter.field ? {
          field: updatedState.sorter.field,
          order: updatedState.sorter.order,
        } : undefined,
      });
    }
  };

  const getColumnSearchProps = (dataIndex: string, placeholder: string) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={t('patientsList.filters.searchFor', { placeholder: placeholder.toLowerCase() })}
          value={selectedKeys[0] || ''}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            {t('patientsList.filters.search')}
          </Button>
          <Button
            onClick={() => {
              setSelectedKeys([]);
              clearIndividualFilter(dataIndex);
              if (clearFilters) clearFilters();
            }}
            size="small"
            style={{ width: 90 }}
          >
            {t('patientsList.filters.reset')}
          </Button>
        </Space>
      </div>
    ),
    filteredValue: tableState.filters[dataIndex] || null,
    onFilter: () => true, // Filtering is handled by handleTableChange
  });

  const getDateRangeProps = (filterKey: 'bithdate' | 'appointmentDate') => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <div style={{ padding: 8, width: 220 }}>
        <RangePicker
          value={selectedKeys[0] as any || null}
          onChange={(dates) => setSelectedKeys(dates ? [dates as any] : [])}
          style={{ marginBottom: 8, width: '100%' }}
          format="DD.MM.YYYY"
          placeholder={[t('patientsList.filters.fromDate'), t('patientsList.filters.toDate')]}
          allowEmpty={[true, true]}
        />
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            type="primary"
            onClick={() => confirm()}
            size="small"
            style={{ width: 90 }}
          >
            {t('patientsList.filters.filter')}
          </Button>
          <Button
            onClick={() => {
              setSelectedKeys([]);
              clearIndividualFilter(filterKey);
              if (clearFilters) clearFilters();
            }}
            size="small"
            style={{ width: 90 }}
          >
            {t('patientsList.filters.reset')}
          </Button>
        </Space>
      </div>
    ),
    filteredValue: tableState.filters[filterKey] || null,
    onFilter: () => true
  });

  const getSelectProps = (options: string[], filterKey: 'doctor' | 'diagnosis') => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <div style={{ padding: 8, width: 250 }}>
        <Select
          mode="multiple"
          placeholder={t('patientsList.filters.selectOptions')}
          value={selectedKeys.length > 0 ? selectedKeys : []}
          onChange={(values) => setSelectedKeys(values)}
          style={{ marginBottom: 8, width: '100%' }}
          options={options.map(option => ({ label: option, value: option }))}
          maxTagCount="responsive"
        />
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            type="primary"
            onClick={() => confirm()}
            size="small"
            style={{ width: 90 }}
          >
            {t('patientsList.filters.filter')}
          </Button>
          <Button
            onClick={() => {
              setSelectedKeys([]);
              clearIndividualFilter(filterKey);
              if (clearFilters) clearFilters();
            }}
            size="small"
            style={{ width: 90 }}
          >
            {t('patientsList.filters.reset')}
          </Button>
        </Space>
      </div>
    ),
    filteredValue: tableState.filters[filterKey] || null,
    onFilter: () => true
  });

  const getStatusSelectProps = () => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <div style={{ padding: 8, width: 200 }}>
        <Select
          mode="multiple"
          placeholder={t('patientsList.filters.selectStatus')}
          value={selectedKeys.length > 0 ? selectedKeys : []}
          onChange={(values) => setSelectedKeys(values)}
          style={{ marginBottom: 8, width: '100%' }}
          options={patientStatuses.map(status => ({ label: status.name, value: status.id }))}
          maxTagCount="responsive"
        />
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            type="primary"
            onClick={() => confirm()}
            size="small"
            style={{ width: 90 }}
          >
            {t('patientsList.filters.filter')}
          </Button>
          <Button
            onClick={() => {
              setSelectedKeys([]);
              clearIndividualFilter('status');
              if (clearFilters) clearFilters();
            }}
            size="small"
            style={{ width: 90 }}
          >
            {t('patientsList.filters.reset')}
          </Button>
        </Space>
      </div>
    ),
    filteredValue: tableState.filters.status || null,
    onFilter: () => true
  });

  const reloadPatients = async (state?: patientsApi.TableState, showLoader = false) => {
    if (showLoader) setTableLoading(true);
    try {
      const stateToUse = state || tableState;
      const dbFilters = patientsApi.tableStateToDbFilters(stateToUse);

      const result = await patientsApi.getPatients(dbFilters);
      setPatients(result.data);
      setTableState(prev => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          total: result.total,
          current: result.page,
          pageSize: result.pageSize
        }
      }));
    } finally {
      if (showLoader) setTableLoading(false);
    }
  };

  // Load saved table state on mount
  useEffect(() => {
    const initializeTableState = async () => {
      setTableLoading(true);
      try {
        const savedState = await loadTableState(TABLE_KEYS.PATIENTS);
        if (savedState) {
          const restoredState: patientsApi.TableState = {
            pagination: { 
              current: 1, 
              pageSize: savedState.pageSize || 10, 
              total: 0 
            },
            filters: savedState.filters || {},
            sorter: savedState.sorter ? {
              field: savedState.sorter.field,
              order: savedState.sorter.order,
            } : {},
            search: ''
          };
          setTableState(restoredState);
          await reloadPatients(restoredState);
        } else {
          await reloadPatients();
        }
      } finally {
        setTableLoading(false);
      }
    };
    initializeTableState();
  }, []);

  // Listen for import progress events
  useEffect(() => {
    const handleImportProgress = (_event: any, progressData: ImportProgress) => {
      setImportProgress(progressData);
    };

    window.ipcRenderer.on('import-progress', handleImportProgress);

    return () => {
      window.ipcRenderer.off('import-progress', handleImportProgress);
    };
  }, []);

  const handleSearchChange = async (value: string) => {
    await updateTableState({ 
      search: value || '', 
      pagination: { ...tableState.pagination, current: 1 } 
    }); // Reset to first page when searching
  };

  // Handle table changes (sorting, pagination, etc.)
  const handleTableChange = (_: any, filters: any, sorter: any) => {
    const newTableState = {
      pagination: tableState.pagination,
      filters: filters,
      sorter: sorter,
      search: tableState.search
    };

    updateTableState(newTableState);
  };

  // Helper function to clear individual filter
  const clearIndividualFilter = (filterKey: string) => {
    const newFilters = { ...tableState.filters };
    delete newFilters[filterKey];
    
    handleTableChange(
      tableState.pagination,
      newFilters,
      tableState.sorter
    );
  };

  // Clear all filters
  const clearAllFilters = async () => {
    const clearedState = {
      pagination: { current: 1, pageSize: tableState.pagination.pageSize, total: 0 },
      filters: {},
      sorter: {},
      search: ''
    };
    await updateTableState(clearedState);
  };

  // Get active filters for display
  const getActiveFilters = () => {
    const activeFilters = [];
    if (tableState.search) activeFilters.push(`${t('patientsList.activeFilterLabels.search')} "${tableState.search}"`);
    if (tableState.filters.name?.[0]) activeFilters.push(`${t('patientsList.activeFilterLabels.name')} "${tableState.filters.name[0]}"`);
    if (tableState.filters.bithdate) activeFilters.push(t('patientsList.activeFilterLabels.birthdate'));
    if (tableState.filters.appointmentDate) activeFilters.push(t('patientsList.activeFilterLabels.appointmentDate'));
    if (tableState.filters.doctor && tableState.filters.doctor.length > 0) activeFilters.push(`${t('patientsList.activeFilterLabels.doctors')} ${tableState.filters.doctor.length}`);
    if (tableState.filters.diagnosis && tableState.filters.diagnosis.length > 0) activeFilters.push(`${t('patientsList.activeFilterLabels.diagnosis')} ${tableState.filters.diagnosis.length}`);
    if (tableState.filters.status && tableState.filters.status.length > 0) activeFilters.push(`${t('patientsList.activeFilterLabels.status')} ${tableState.filters.status.length}`);
    return activeFilters;
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return !!(tableState.search || tableState.filters.name?.[0] || tableState.filters.bithdate || 
              tableState.filters.appointmentDate || (tableState.filters.doctor && tableState.filters.doctor.length > 0) || 
              (tableState.filters.diagnosis && tableState.filters.diagnosis.length > 0) ||
              (tableState.filters.status && tableState.filters.status.length > 0) || tableState.sorter.field);
  };

  const data = useMemo(() => {
    return patients.map((p) => ({ key: p.folder, ...p }));
  }, [patients]);
  
  const columns: ColumnsType<patientsApi.Patient & { key: string }> = [
    {
      title: t('patientsList.columns.name'),
      dataIndex: "name",
      key: "name",
      render: (name) => {
        return <span style={{cursor: 'pointer'}} className="patient-cell">{name}</span>;
      },
      sorter: true,
      sortOrder: tableState.sorter.field === 'name' ? tableState.sorter.order : null,
      ...getColumnSearchProps('name', t('patientsList.columns.name')),
    },
    {
      title: t('patientsList.columns.birthdate'),
      dataIndex: "birthdate",
      key: "bithdate",
      width: 220,
      render: (birthdate) => {
        if (!birthdate) return '';
        const date = new Date(birthdate);
        return date.toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' });
      },
      sorter: true,
      sortOrder: tableState.sorter.field === 'birthdate' ? tableState.sorter.order : null,
      ...getDateRangeProps('bithdate') as any,
    },
    {
      title: t('patientsList.columns.lastAppointment'),
      dataIndex: "latestAppointmentDate",
      key: "appointmentDate",
      width: 220,
      render: (latestAppointmentDate) => {
        if (!latestAppointmentDate) return '';
        const dateObj = new Date(latestAppointmentDate);
        return dateObj.toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' });
      },
      sorter: true,
      sortOrder: tableState.sorter.field === 'latestAppointmentDate' ? tableState.sorter.order : null,
      ...getDateRangeProps('appointmentDate') as any,
    },
    {
      title: t('patientsList.columns.doctor'),
      dataIndex: "doctor",
      key: "doctor",
      width: 220,
      sorter: true,
      sortOrder: tableState.sorter.field === 'doctor' ? tableState.sorter.order : null,
      ...getSelectProps(doctors, 'doctor'),
    },
    {
      title: t('patientsList.columns.diagnosis'),
      dataIndex: "diagnosis",
      key: "diagnosis",
      width: 220,
      sorter: true,
      sortOrder: tableState.sorter.field === 'diagnosis' ? tableState.sorter.order : null,
      ...getColumnSearchProps('diagnosis', t('patientsList.columns.diagnosis')),
    },
    {
      title: t('patientsList.columns.status'),
      dataIndex: "statusName",
      key: "status",
      width: 120,
      sorter: true,
      sortOrder: tableState.sorter.field === 'statusName' ? tableState.sorter.order : null,
      render: (statusName, r) => {
        const isActive = r.statusId === 1;
        const statusMenuItems = patientStatuses
          .filter(status => status.id !== r.statusId)
          .map(status => ({
            key: status.id.toString(),
            label: status.name,
            onClick: (info: { domEvent: React.MouseEvent | React.KeyboardEvent }) => handleStatusChange(r.folder, status.id, info.domEvent as React.MouseEvent),
          }));

        return (
          <Dropdown 
            menu={{ items: statusMenuItems }} 
            trigger={["click"]}
            disabled={statusMenuItems.length === 0}
          >
            <Tag 
              color={isActive ? "green" : "default"} 
              style={{ cursor: 'pointer' }}
              onClick={(e) => e.stopPropagation()}
            >
              {statusName}
            </Tag>
          </Dropdown>
        );
      },
      ...getStatusSelectProps(),
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_, r) => (
        <Tooltip title={t('patientsList.openFolder')}>
          <FolderOpenOutlined
            onClick={(e) => {
              e.stopPropagation();
              patientsApi.openPatientFolderInFs(r.folder);
            }}
            style={{ cursor: "pointer", fontSize: 16 }}
          />
        </Tooltip>
      ),
    },
  ];

  const handleUsbImport = async () => {
    try {
      setImportLoading(true);
      setImportProgress({ current: 0, total: 0, progress: 0, folderName: '' });
      
      const result = await patientsApi.scanUsb();
      
      if (result && result.length > 0) {
        message.success(t('patientsList.messages.importSuccess'));
      } else {
        message.info(t('patientsList.messages.noDataToImport'));
      }
      
      await reloadPatients();
    } catch (error) {
      console.error('Import error:', error);
      message.error(t('patientsList.messages.importError'));
    } finally {
      setImportLoading(false);
      setImportProgress({ current: 0, total: 0, progress: 0, folderName: '' });
    }
  };

  const items: MenuProps["items"] = [
    {
      key: "usb",
      icon: <UsbOutlined />,
      label: t('patientsList.importFromFolder'),
      onClick: handleUsbImport,
    },
  ];

  const handleAdd = async (folderBase: string, date: string, metadata: { doctor: string; diagnosis: string; patientCard?: string }) => {
    // Extract name and birthdate from folderBase (format: surname_name_YYYY-MM-DD)
    const parts = folderBase.split('_');
    const surname = parts[0] || '';
    const name = parts[1] || '';
    const birthdate = parts[2] || '';
    
    const fullMetadata = {
      name: `${surname} ${name}`.trim(),
      birthdate,
      doctor: metadata.doctor,
      diagnosis: metadata.diagnosis,
      patientCard: metadata.patientCard || ""
    };
    
    await patientsApi.makePatient(folderBase, date, fullMetadata);
    
    // Copy patient card if selected
    if (metadata.patientCard) {
      try {
        const configApi = await import('../../helpers/configApi');
        const result = await configApi.copyPatientCardToPatient(metadata.patientCard, folderBase);
        if (!result.success) {
          console.error('Failed to copy patient card:', result.error);
          // Note: We don't show an error to user as the patient was already created successfully
        }
      } catch (error) {
        console.error('Failed to copy patient card:', error);
      }
    }
    
    setAddOpen(false);
    reloadPatients();
  };

  return (
    <>
      {addOpen && (
        <AddCardModal onClose={() => setAddOpen(false)} onOk={handleAdd} />
      )}

      <Modal
        open={importLoading}
        closable={false}
        footer={null}
        centered
        width={450}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <LoadingOutlined style={{ fontSize: 48, color: token.colorPrimary, marginBottom: 20 }} />
          <h3 style={{ marginBottom: 16 }}>{t('patientsList.import.title')}</h3>
          
          {importProgress.total > 0 ? (
            <>
              <Progress 
                percent={importProgress.progress} 
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <p style={{ marginTop: 12, color: '#666', fontSize: '14px' }}>
                {t('patientsList.import.processingFolder', { current: importProgress.current, total: importProgress.total })}
              </p>
              {importProgress.folderName && (
                <p style={{ marginTop: 8, fontSize: '12px', color: '#999', wordBreak: 'break-all' }}>
                  {importProgress.folderName}
                </p>
              )}
            </>
          ) : (
            <>
              <Progress percent={100} status="active" showInfo={false} />
              <p style={{ marginTop: 16, color: '#666' }}>
                {t('patientsList.import.preparing')}
              </p>
            </>
          )}
          
          <p style={{ marginTop: 12, fontSize: '12px', color: '#999' }}>
            {t('patientsList.import.largeFilesNote')}
          </p>
        </div>
      </Modal>

      <div className="project-view">
        <div style={{
              margin: 24,
              padding: 24,
              background: token.colorBgContainer,
            }}>
          <div className="title-row">
            <div className="title-left">
              <h2>{t('patientsList.title')}</h2>
              <Input
                className="search-input"
                placeholder={t('patientsList.searchPlaceholder')}
                value={tableState.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                allowClear
              />
            </div>
            
            <div className="title-right">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddOpen(true)}
              >
                {t('patientsList.addCard')}
              </Button>

              <Dropdown menu={{ items }} trigger={["click"]}>
                <Button icon={<EllipsisOutlined />} />
              </Dropdown>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={data}
            loading={tableLoading}
            pagination={false}
            onChange={handleTableChange}
            onRow={(record) => ({
              onClick: () => nav(`/patients/${record.folder}`),
            })}
            rowClassName="patient-row"
            locale={{
              emptyText: t('patientsList.emptyText')
            }}
          />

          <Row justify="space-between" align="middle" style={{ marginTop: 16, padding: '8px 0' }}>
            <Col flex="auto">
              <Space size="middle" wrap>
                <Button 
                  icon={<ClearOutlined />} 
                  onClick={clearAllFilters}
                  disabled={!hasActiveFilters()}
                  size="small"
                >
                  {t('patientsList.filters.clearFilters')}
                </Button>
                {getActiveFilters().length > 0 && (
                  <span style={{ color: '#666', fontSize: '13px' }}>
                    {t('patientsList.filters.activeFilters')} {getActiveFilters().map((filter, index) => (
                      <Tag key={index} color="blue" style={{ margin: '0 2px' }}>
                        {filter}
                      </Tag>
                    ))}
                  </span>
                )}
              </Space>
            </Col>
            <Col flex="none">
              <Space align="center" size="small">
                <Pagination
                  current={tableState.pagination.current}
                  pageSize={tableState.pagination.pageSize}
                  total={tableState.pagination.total}
                  showSizeChanger={showSizeChanger}
                  showTotal={(total, range) => 
                    t('common.pagination.showTotal', { start: range[0], end: range[1], total })
                  }
                  onChange={(page, pageSize) => {
                    updateTableState({ 
                      pagination: { ...tableState.pagination, current: page, pageSize } 
                    });
                  }}
                />
              </Space>
            </Col>
          </Row>
        </div>
      </div>
    </>
  );
};

export default PatientsList;
