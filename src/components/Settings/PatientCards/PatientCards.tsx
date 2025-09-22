import React, { useState, useContext } from 'react';
import { Card, Button, List, Space, Typography, message, Empty, Select, Form, Popconfirm } from 'antd';
import { PlusOutlined, FileTextOutlined, StarOutlined, DeleteOutlined } from '@ant-design/icons';
import ImportPatientCardModal from './ImportPatientCardModal';
import { AppConfigContext, PatientCard } from '../../../holders/AppConfig';
import * as configApi from '../../../helpers/configApi';

const { Paragraph } = Typography;

const PatientCards: React.FC = () => {
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
        message.success('Картку пацієнта успішно імпортовано');
      } else {
        message.error(result.error || 'Помилка імпорту картки');
      }
    } catch (error) {
      console.error('Failed to import patient card:', error);
      message.error('Помилка імпорту картки пацієнта');
    }
  };

  const handleOpenCard = async (card: PatientCard) => {
    try {
      const result = await configApi.openPatientCard(card.path);
      if (!result.success) {
        message.error('Не вдалося відкрити файл');
      }
    } catch (error) {
      console.error('Failed to open patient card:', error);
      message.error('Помилка відкриття файлу');
    }
  };

  const handleDefaultCardChange = async (fileName: string | null) => {
    try {
      await setDefaultPatientCard(fileName);
      message.success('Картку за замовчуванням змінено');
    } catch (error) {
      console.error('Failed to set default patient card:', error);
      message.error('Помилка зміни картки за замовчуванням');
    }
  };

  const handleDeleteCard = async (card: PatientCard) => {
    try {
      const cardFileName = card.name + card.extension;
      const result = await deletePatientCard(cardFileName);
      if (result.success) {
        message.success('Картку пацієнта видалено');
      } else {
        message.error(result.error || 'Помилка видалення картки');
      }
    } catch (error) {
      console.error('Failed to delete patient card:', error);
      message.error('Помилка видалення картки пацієнта');
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
    <Card title="Картки пацієнтів" style={{ marginBottom: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Paragraph type="secondary">
          Імпортуйте документи-шаблони карток пацієнтів (DOC, DOCX, RTF файли) для подальшого використання
        </Paragraph>
        
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setImportModalVisible(true)}
          style={{ marginBottom: 16 }}
        >
          Імпортувати картку
        </Button>

        {patientCards.length >= 2 && (
          <Form layout="vertical" style={{ marginBottom: 16 }}>
            <Form.Item 
              label="Картка пацієнта за замовчуванням"
              help="Картка, яка буде використовуватися за замовчуванням. Якщо не обрано, використовується перша картка."
            >
              <Select
                style={{ width: '100%' }}
                placeholder="Оберіть картку за замовчуванням..."
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
            description="Немає імпортованих карток"
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
                    Відкрити
                  </Button>,
                  <Popconfirm
                    title="Видалити картку?"
                    description="Ця дія незворотна. Картку буде видалено назавжди."
                    onConfirm={() => handleDeleteCard(card)}
                    okText="Видалити"
                    cancelText="Скасувати"
                    okType="danger"
                  >
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      style={{ padding: 0 }}
                    >
                      Видалити
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
                          title="Картка за замовчуванням"
                        />
                      )}
                    </Space>
                  }
                  description={
                    <Space split="|">
                      <span>{card.extension.toUpperCase()}</span>
                      <span>{formatFileSize(card.size)}</span>
                      <span>{formatDate(card.modified)}</span>
                      {isDefaultCard(card) && <span style={{ color: '#faad14' }}>За замовчуванням</span>}
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
