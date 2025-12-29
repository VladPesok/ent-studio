import React, { useState, useEffect, useContext } from 'react';
import { Tabs, Button, Modal, Input, message, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { AppConfigContext } from '../../holders/AppConfig';
import * as patientsApi from '../../helpers/patientsApi';
import { DictionaryItem, PatientStatusItem, DictionaryType } from './types';
import DoctorsTable from './pages/DoctorsTable';
import DiagnosesTable from './pages/DiagnosesTable';
import StatusesTable from './pages/StatusesTable';
import './Dictionaries.css';

const { Title } = Typography;

const Dictionaries: React.FC = () => {
  const { t } = useTranslation();
  const { refreshDictionaries } = useContext(AppConfigContext);
  const [activeTab, setActiveTab] = useState<DictionaryType>('doctors');
  const [doctors, setDoctors] = useState<DictionaryItem[]>([]);
  const [diagnoses, setDiagnoses] = useState<DictionaryItem[]>([]);
  const [statuses, setStatuses] = useState<PatientStatusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [doctorsData, diagnosesData, statusesData] = await Promise.all([
        window.ipcRenderer.invoke('db:dict:doctors:getAll', true),
        window.ipcRenderer.invoke('db:dict:diagnoses:getAll', true),
        patientsApi.getPatientStatuses(),
      ]);
      setDoctors(doctorsData);
      setDiagnoses(diagnosesData);
      setStatuses(statusesData);
    } catch (error) {
      console.error('Failed to load dictionaries:', error);
      message.error(t('dictionaries.messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;

    try {
      if (activeTab === 'statuses') {
        await patientsApi.createPatientStatusEntry(newName.trim());
      } else {
        const handler = activeTab === 'doctors' ? 'db:dict:addDoctor' : 'db:dict:addDiagnosis';
        await window.ipcRenderer.invoke(handler, newName.trim());
        refreshDictionaries();
      }
      message.success(t('common.added'));
      setAddModalVisible(false);
      setNewName('');
      loadData();
    } catch (error) {
      console.error('Failed to add:', error);
      message.error(t('dictionaries.messages.saveError'));
    }
  };

  const getAddButtonLabel = () => {
    switch (activeTab) {
      case 'doctors': return t('dictionaries.addButtons.doctor');
      case 'diagnoses': return t('dictionaries.addButtons.diagnosis');
      case 'statuses': return t('dictionaries.addButtons.status');
      default: return t('common.add');
    }
  };

  const getModalTitle = () => {
    switch (activeTab) {
      case 'doctors': return t('dictionaries.modals.addDoctor');
      case 'diagnoses': return t('dictionaries.modals.addDiagnosis');
      case 'statuses': return t('dictionaries.modals.addStatus');
      default: return t('common.add');
    }
  };

  const tabItems = [
    {
      key: 'doctors',
      label: t('dictionaries.tabs.doctors'),
      children: (
        <DoctorsTable 
          data={doctors} 
          loading={loading} 
          onDataChange={loadData} 
        />
      ),
    },
    {
      key: 'diagnoses',
      label: t('dictionaries.tabs.diagnoses'),
      children: (
        <DiagnosesTable 
          data={diagnoses} 
          loading={loading} 
          onDataChange={loadData} 
        />
      ),
    },
    {
      key: 'statuses',
      label: t('dictionaries.tabs.statuses'),
      children: (
        <StatusesTable 
          data={statuses} 
          loading={loading} 
          onDataChange={loadData} 
        />
      ),
    },
  ];

  return (
    <div className="dictionaries-wrapper">
      <div className="dictionaries-container">
        <div className="dictionaries-header">
          <Title level={3}>{t('dictionaries.title')}</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalVisible(true)}
          >
            {getAddButtonLabel()}
          </Button>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as DictionaryType)}
          items={tabItems}
        />

        <Modal
          title={getModalTitle()}
          open={addModalVisible}
          onOk={handleAdd}
          onCancel={() => {
            setAddModalVisible(false);
            setNewName('');
          }}
          okText={t('common.add')}
          cancelText={t('common.cancel')}
        >
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('dictionaries.placeholders.enterName')}
            onPressEnter={handleAdd}
          />
        </Modal>
      </div>
    </div>
  );
};

export default Dictionaries;
