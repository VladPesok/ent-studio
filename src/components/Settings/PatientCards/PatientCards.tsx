import React, { useState, useContext } from 'react';
import { Card, Button, List, Space, Typography, message, Empty, Select, Form, Popconfirm } from 'antd';
import { PlusOutlined, FileTextOutlined, StarOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import ImportPatientCardModal from './ImportPatientCardModal';
import { AppConfigContext, PatientCard } from '../../../holders/AppConfig';
import * as patientsApi from '../../../helpers/patientsApi';

const { Paragraph } = Typography;

const PatientCards: React.FC = () => {
  const { t } = useTranslation();
  const {
    patientCards,
    defaultPatientCard,
    importPatientCard,
    deletePatientCard,
    setDefaultPatientCard,
    getEffectiveDefaultCard
  } = useContext(AppConfigContext);
  const [importModalVisible, setImportModalVisible] = useState(false);

  const handleImportCard = async (cardName: string, file: File) => {
    try {
      const result = await importPatientCard(cardName, file);
      if (result.success) {
        message.success(t('settings.patientCards.messages.importSuccess'));
      } else {
        message.error(result.error || t('settings.patientCards.messages.importError'));
      }
    } catch (error) {
      console.error('Failed to import patient card:', error);
      message.error(t('settings.patientCards.messages.importError'));
    }
  };

  const handleOpenCard = async (card: PatientCard) => {
    try {
      await patientsApi.openFileInDefaultApp(card.path);
    } catch (error) {
      console.error('Failed to open patient card:', error);
      message.error(t('settings.patientCards.messages.openError'));
    }
  };

  const handleDefaultCardChange = async (fileName: string | null) => {
    try {
      await setDefaultPatientCard(fileName);
      message.success(t('settings.patientCards.messages.defaultChanged'));
    } catch (error) {
      console.error('Failed to set default patient card:', error);
      message.error(t('settings.patientCards.messages.defaultChangeError'));
    }
  };

  const handleDeleteCard = async (card: PatientCard) => {
    try {
      const cardFileName = card.name + card.extension;
      const result = await deletePatientCard(cardFileName);
      if (result.success) {
        message.success(t('settings.patientCards.messages.deleteSuccess'));
      } else {
        message.error(result.error || t('settings.patientCards.messages.deleteError'));
      }
    } catch (error) {
      console.error('Failed to delete patient card:', error);
      message.error(t('settings.patientCards.messages.deleteError'));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if a card is the default (considering first card rule)
  const isDefaultCard = (card: PatientCard): boolean => {
    const effectiveDefault = getEffectiveDefaultCard();
    const cardFileName = card.name + card.extension;
    return effectiveDefault === cardFileName;
  };

  return (
    <Card title={t('settings.patientCards.title')} style={{ marginBottom: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Paragraph type="secondary">
          {t('settings.patientCards.description')}
        </Paragraph>
        
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setImportModalVisible(true)}
          style={{ marginBottom: 16 }}
        >
          {t('settings.patientCards.importCard')}
        </Button>

        {patientCards.length >= 2 && (
          <Form layout="vertical" style={{ marginBottom: 16 }}>
            <Form.Item 
              label={t('settings.patientCards.defaultCard')}
              help={t('settings.patientCards.defaultCardHelp')}
            >
              <Select
                style={{ width: '100%' }}
                placeholder={t('settings.patientCards.defaultCardPlaceholder')}
                value={defaultPatientCard}
                onChange={handleDefaultCardChange}
                allowClear
                clearIcon={null}
                options={patientCards.map(card => ({
                  label: card.name,
                  value: card.name + card.extension
                }))}
              />
            </Form.Item>
          </Form>
        )}

        {patientCards.length === 0 ? (
          <Empty
            description={t('settings.patientCards.noCards')}
            style={{ margin: '20px 0' }}
          />
        ) : (
          <List
            dataSource={patientCards}
            renderItem={(card) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    onClick={() => handleOpenCard(card)}
                    style={{ padding: 0 }}
                  >
                    {t('common.open')}
                  </Button>,
                  <Popconfirm
                    title={t('settings.patientCards.deleteConfirm.title')}
                    description={t('settings.patientCards.deleteConfirm.description')}
                    onConfirm={() => handleDeleteCard(card)}
                    okText={t('common.delete')}
                    cancelText={t('common.cancel')}
                    okType="danger"
                  >
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      style={{ padding: 0 }}
                    >
                      {t('common.delete')}
                    </Button>
                  </Popconfirm>
                ]}
                style={{ cursor: 'pointer' }}
                onClick={() => handleOpenCard(card)}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                  title={
                    <Space>
                      {card.name}
                      {isDefaultCard(card) && (
                        <StarOutlined 
                          style={{ color: '#faad14' }} 
                          title={t('settings.patientCards.defaultLabel')}
                        />
                      )}
                    </Space>
                  }
                  description={
                    <Space split="|">
                      <span>{card.extension.toUpperCase()}</span>
                      <span>{formatFileSize(card.size)}</span>
                      <span>{formatDate(card.modified)}</span>
                      {isDefaultCard(card) && <span style={{ color: '#faad14' }}>{t('settings.patientCards.defaultLabel')}</span>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Space>

      <ImportPatientCardModal
        visible={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onSubmit={handleImportCard}
      />
    </Card>
  );
};

export default PatientCards;
