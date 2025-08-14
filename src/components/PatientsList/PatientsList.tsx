import React, { useMemo, useState, useEffect } from "react";
import { Table, Input, Button, Dropdown, theme as antTheme, MenuProps, DatePicker, Select, Space, Tag, Row, Col, Pagination } from "antd";
import {
  EllipsisOutlined,
  PlusOutlined,
  UsbOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  ClearOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import AddCardModal from "./AddCardModal/AddCardModal";
import type { ColumnsType } from "antd/es/table";
import type { FilterDropdownProps } from "antd/es/table/interface";
import * as patientsApi from "../../helpers/patientsApi";
import * as configApi from "../../helpers/configApi";
import "./PatientsList.css";

const { RangePicker } = DatePicker;

const { useToken } = antTheme;



const PatientsList: React.FC = () => {
  const [patients, setPatients] = useState<patientsApi.Patient[]>([]);

  const [addOpen, setAddOpen] = useState(false);

  const [dicts, setDicts] = useState<{ doctors: string[]; diagnosis: string[] }>({ doctors: [], diagnosis: [] });
  const [tableState, setTableState] = useState<patientsApi.TableState>({
    pagination: { current: 1, pageSize: 10, total: 0 },
    filters: {},
    sorter: {},
    search: ''
  });

  const nav = useNavigate();
  const { token } = useToken();

  const updateTableState = async (newState: Partial<patientsApi.TableState>) => {
    const updatedState = { ...tableState, ...newState };
    setTableState(updatedState);

    // Convert table state to API filters
    const apiFilters: patientsApi.PatientFilters = {
      page: updatedState.pagination.current,
      pageSize: updatedState.pagination.pageSize,
      search: updatedState.search || undefined,
      name: updatedState.filters.name?.[0] || undefined,
      bithdate: updatedState.filters.bithdate?.[0] || null,
      appointmentDate: updatedState.filters.appointmentDate?.[0] || null,
      doctor: updatedState.filters.doctor || undefined,
      diagnosis: updatedState.filters.diagnosis || undefined,
      sortField: updatedState.sorter.field || undefined,
      sortOrder: updatedState.sorter.order || undefined,
    };

    const result = await patientsApi.getPatients(apiFilters);
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
  };

  const getColumnSearchProps = (dataIndex: string, placeholder: string) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Пошук ${placeholder.toLowerCase()}`}
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
            Пошук
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
            Скинути
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
          placeholder={['Від дати', 'До дати']}
          allowEmpty={[true, true]}
        />
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            type="primary"
            onClick={() => confirm()}
            size="small"
            style={{ width: 90 }}
          >
            Фільтр
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
            Скинути
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
          placeholder="Оберіть варіанти"
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
            Фільтр
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
            Скинути
          </Button>
        </Space>
      </div>
    ),
    filteredValue: tableState.filters[filterKey] || null,
    onFilter: () => true
  });

  const reloadPatients = async () => {
    const apiFilters: patientsApi.PatientFilters = {
      page: tableState.pagination.current,
      pageSize: tableState.pagination.pageSize,
      search: tableState.search || undefined,
      name: tableState.filters.name?.[0] || undefined,
      bithdate: tableState.filters.bithdate?.[0] || null,
      appointmentDate: tableState.filters.appointmentDate?.[0] || null,
      doctor: tableState.filters.doctor || undefined,
      diagnosis: tableState.filters.diagnosis || undefined,
      sortField: tableState.sorter.field || undefined,
      sortOrder: tableState.sorter.order || undefined,
    };

    const result = await patientsApi.getPatients(apiFilters);
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
  };

  const loadDictionaries = async () => {
    try {
      const dictionaries = await configApi.getDictionaries();
      setDicts(dictionaries);
    } catch (error) {
      console.error('Failed to load dictionaries:', error);
    }
  };

  useEffect(() => {
    reloadPatients();
    loadDictionaries();
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
    if (tableState.search) activeFilters.push(`Пошук: "${tableState.search}"`);
    if (tableState.filters.name?.[0]) activeFilters.push(`Ім'я: "${tableState.filters.name[0]}"`);
    if (tableState.filters.bithdate) activeFilters.push('Дата народження');
    if (tableState.filters.appointmentDate) activeFilters.push('Дата прийому');
    if (tableState.filters.doctor && tableState.filters.doctor.length > 0) activeFilters.push(`Лікарі: ${tableState.filters.doctor.length}`);
    if (tableState.filters.diagnosis && tableState.filters.diagnosis.length > 0) activeFilters.push(`Діагнози: ${tableState.filters.diagnosis.length}`);
    return activeFilters;
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return !!(tableState.search || tableState.filters.name?.[0] || tableState.filters.bithdate || 
              tableState.filters.appointmentDate || (tableState.filters.doctor && tableState.filters.doctor.length > 0) || 
              (tableState.filters.diagnosis && tableState.filters.diagnosis.length > 0) || tableState.sorter.field);
  };

  const data = useMemo(() => {
    return patients.map((p) => ({ key: p.folder, ...p }));
  }, [patients]);
  
  const columns: ColumnsType<patientsApi.Patient & { key: string }> = [
    {
      title: "Прізвище та ім'я",
      dataIndex: "name",
      key: "name",
      render: (name) => {
        return <span style={{cursor: 'pointer'}} className="patient-cell">{name}</span>;
      },
      sorter: true,
      ...getColumnSearchProps('name', "Прізвище та ім'я"),
    },
    {
      title: "Дата народження",
      dataIndex: "birthdate",
      key: "bithdate",
      width: 240,
      render: (birthdate) => {
        if (!birthdate) return '';
        const date = new Date(birthdate);
        return date.toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' });
      },
      sorter: true,
      ...getDateRangeProps('bithdate') as any,
    },
    {
      title: "Дата останнього прийому",
      dataIndex: "latestAppointmentDate",
      key: "appointmentDate",
      width: 240,
      render: (latestAppointmentDate) => {
        if (!latestAppointmentDate) return '';
        const dateObj = new Date(latestAppointmentDate);
        return dateObj.toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' });
      },
      sorter: true,
      ...getDateRangeProps('appointmentDate') as any,
    },
    {
      title: "Лікар",
      dataIndex: "doctor",
      key: "doctor",
      width: 240,
      sorter: true,
      ...getSelectProps(dicts.doctors, 'doctor'),
    },
    {
      title: "Діагноз",
      dataIndex: "diagnosis",
      key: "diagnosis",
      width: 240,
      sorter: true,
      ...getSelectProps(dicts.diagnosis, 'diagnosis'),
    },
    {
      title: "",
      key: "open",
      width: 50,
      render: (_, r) => (
        <FolderOpenOutlined
          onClick={(e) => {
            e.stopPropagation();
            patientsApi.openPatientFolderInFs(r.folder);
          }}
          style={{ cursor: "pointer", fontSize: 18 }}
        />
      ),
    },
  ];

  const items: MenuProps["items"] = [
    {
      key: "usb",
      icon: <UsbOutlined />,
      label: "Імпорт з USB",
      onClick: async () => {
        await patientsApi.scanUsb();
        reloadPatients();
      },
    },
  ];

  const handleAdd = async (folderBase: string, date: string, metadata: { doctor: string; diagnosis: string }) => {
    await patientsApi.makePatient(folderBase, date);
    
    await patientsApi.setPatient(folderBase, metadata);
    
    setAddOpen(false);
    reloadPatients();
  };

  return (
    <>
      {addOpen && (
        <AddCardModal onClose={() => setAddOpen(false)} onOk={handleAdd} />
      )}

      <div className="project-view">
        <div style={{
              margin: 24,
              padding: 24,
              background: token.colorBgContainer,
            }}>
          <div className="title-row">
            <div className="title-left">
              <h2>Пацієнти</h2>
              <Input
                className="search-input"
                placeholder="Пошук за іменем/прізвищем…"
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
                Додати картку
              </Button>

              <Dropdown menu={{ items }} trigger={["click"]}>
                <Button icon={<EllipsisOutlined />} />
              </Dropdown>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={data}
            pagination={false}
            onChange={handleTableChange}
            onRow={(record) => ({
              onClick: () => nav(`/patients/${record.folder}`),
            })}
            rowClassName="patient-row"
            locale={{
              emptyText: "Поки немає доданих пацієнтів"
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
                  Очистити фільтри
                </Button>
                {getActiveFilters().length > 0 && (
                  <span style={{ color: '#666', fontSize: '13px' }}>
                    Активні фільтри: {getActiveFilters().map((filter, index) => (
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
                  showSizeChanger
                  showTotal={(total, range) => 
                    `${range[0]}-${range[1]} з ${total} записів`
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
