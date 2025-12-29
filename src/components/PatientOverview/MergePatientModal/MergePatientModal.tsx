import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Select, Button, Typography, Space, Spin, message } from 'antd';
import { ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { DefaultOptionType } from 'antd/es/select';
import * as patientsApi from '../../../helpers/patientsApi';

const { Text, Title } = Typography;

interface MergePatientModalProps {
  visible: boolean;
  currentPatientFolder: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const MergePatientModal: React.FC<MergePatientModalProps> = ({
  visible,
  currentPatientFolder,
  onCancel,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<patientsApi.PatientListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  // Load patients when modal opens
  useEffect(() => {
    if (visible) {
      loadPatients();
    } else {
      setSelectedPatient(null);
    }
  }, [visible]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const allPatients = await patientsApi.getAllPatientsLightweight();
      // Filter out current patient
      setPatients(allPatients.filter(p => p.folder !== currentPatientFolder));
    } catch (error) {
      console.error('Failed to load patients:', error);
      message.error(t('patientOverview.mergeModal.messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // Format birthdate for display
  const formatBirthdate = (birthdate: string) => {
    if (!birthdate) return '';
    const [year, month, day] = birthdate.split('-');
    return `${day}.${month}.${year}`;
  };

  // Create select options with virtualization support
  const options: DefaultOptionType[] = useMemo(() => {
    return patients.map(patient => ({
      value: patient.folder,
      label: `${patient.surname} ${patient.name} (${formatBirthdate(patient.birthdate)})`,
      // For search filtering
      searchText: `${patient.surname} ${patient.name} ${patient.birthdate}`.toLowerCase(),
    }));
  }, [patients]);

  // Handle confirm with warning
  const handleConfirm = () => {
    if (!selectedPatient) return;

    const selectedPatientData = patients.find(p => p.folder === selectedPatient);
    const patientName = selectedPatientData 
      ? `${selectedPatientData.surname} ${selectedPatientData.name}`
      : selectedPatient;

    Modal.confirm({
      title: t('patientOverview.mergeModal.confirmTitle'),
      icon: <WarningOutlined style={{ color: '#faad14' }} />,
      content: (
        <div>
          <Text>
            {t('patientOverview.mergeModal.confirmMessage', { patientName })}
          </Text>
          <br /><br />
          <Text type="danger">
            <ExclamationCircleOutlined /> {t('patientOverview.mergeModal.confirmWarning')}
          </Text>
        </div>
      ),
      okText: t('patientOverview.mergeModal.yesMerge'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: handleMerge,
    });
  };

  // Perform the merge
  const handleMerge = async () => {
    if (!selectedPatient) return;

    setMerging(true);
    try {
      const result = await patientsApi.mergePatients(selectedPatient, currentPatientFolder);
      
      if (result.success) {
        message.success(t('patientOverview.mergeModal.messages.mergeSuccess'));
        onSuccess();
      } else {
        message.error(result.error || t('patientOverview.mergeModal.messages.mergeError'));
      }
    } catch (error) {
      console.error('Failed to merge patients:', error);
      message.error(t('patientOverview.mergeModal.messages.mergeError'));
    } finally {
      setMerging(false);
    }
  };

  // Filter function for search
  const filterOption = (input: string, option?: DefaultOptionType) => {
    if (!option) return false;
    const searchText = (option as any).searchText || '';
    return searchText.includes(input.toLowerCase());
  };

  return (
    <Modal
      open={visible}
      title={
        <Title level={4} style={{ margin: 0 }}>
          {t('patientOverview.mergeModal.title')}
        </Title>
      }
      onCancel={onCancel}
      footer={
        <Space>
          <Button onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            type="primary"
            danger
            disabled={!selectedPatient}
            loading={merging}
            onClick={handleConfirm}
          >
            {t('patientOverview.mergeModal.confirm')}
          </Button>
        </Space>
      }
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          {t('patientOverview.mergeModal.description')}
        </Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin />
        </div>
      ) : (
        <Select
          showSearch
          placeholder={t('patientOverview.mergeModal.selectPatientPlaceholder')}
          value={selectedPatient}
          onChange={setSelectedPatient}
          options={options}
          filterOption={filterOption}
          style={{ width: '100%' }}
          size="large"
          virtual
          listHeight={300}
          notFoundContent={t('patientOverview.mergeModal.noPatients')}
        />
      )}
    </Modal>
  );
};

export default MergePatientModal;

