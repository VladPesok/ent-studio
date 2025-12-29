import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { UploadFile, UploadProps } from 'antd';

interface ImportPatientCardModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (cardName: string, file: File) => Promise<void>;
}

const ImportPatientCardModal: React.FC<ImportPatientCardModalProps> = ({
  visible,
  onCancel,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cardName, setCardName] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setSelectedFile(null);
      setCardName('');
    }
  }, [visible, form]);

  const validateFileName = (name: string): boolean => {
    // Check for invalid characters for file names
    const invalidChars = /[<>:"/\\|?*]/g;
    return !invalidChars.test(name) && name.trim().length > 0;
  };

  const getFileNameWithoutExtension = (fileName: string): string => {
    return fileName.replace(/\.[^/.]+$/, '');
  };

  const handleFileChange: UploadProps['onChange'] = (info) => {
    const { fileList } = info;
    
    if (fileList.length > 0) {
      const file = fileList[0].originFileObj;
      if (file) {
        setSelectedFile(file);
        
        // If card name is empty, use file name without extension
        if (!cardName.trim()) {
          const fileNameWithoutExt = getFileNameWithoutExtension(file.name);
          setCardName(fileNameWithoutExt);
          form.setFieldsValue({ cardName: fileNameWithoutExt });
        }
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      
      if (!selectedFile) {
        message.error(t('settings.patientCards.importModal.selectFileError'));
        return;
      }

      const finalCardName = cardName.trim() || getFileNameWithoutExtension(selectedFile.name);
      
      if (!validateFileName(finalCardName)) {
        message.error(t('settings.patientCards.importModal.invalidNameError'));
        return;
      }

      setLoading(true);
      await onSubmit(finalCardName, selectedFile);
      
      // Reset form and close modal
      form.resetFields();
      setSelectedFile(null);
      setCardName('');
      onCancel();
      
    } catch (error) {
      console.error('Failed to import patient card:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedFile(null);
    setCardName('');
    onCancel();
  };

  const beforeUpload = (file: File) => {
    const isValidType = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/rtf', 'text/rtf'].includes(file.type) ||
      file.name.toLowerCase().endsWith('.doc') ||
      file.name.toLowerCase().endsWith('.docx') ||
      file.name.toLowerCase().endsWith('.rtf');
    
    if (!isValidType) {
      message.error(t('settings.patientCards.importModal.fileTypeError'));
      return false;
    }
    
    return false; // Prevent automatic upload, we handle it manually
  };

  return (
    <Modal
      title={t('settings.patientCards.importModal.title')}
      open={visible}
      onCancel={handleCancel}
      width={520}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          disabled={!selectedFile}
          onClick={handleSubmit}
        >
          {t('common.create')}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label={t('settings.patientCards.importModal.cardName')}
          name="cardName"
          help={t('settings.patientCards.importModal.cardNameHelp')}
        >
          <Input
            placeholder={t('settings.patientCards.importModal.cardNamePlaceholder')}
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
          />
        </Form.Item>

        <Form.Item
          label={t('settings.patientCards.importModal.fileLabel')}
          name="file"
          rules={[{ required: true, message: t('settings.patientCards.importModal.fileRequired') }]}
        >
          <Upload
            maxCount={1}
            beforeUpload={beforeUpload}
            onChange={handleFileChange}
            fileList={selectedFile ? [{
              uid: '1',
              name: selectedFile.name,
              status: 'done',
            } as UploadFile] : []}
            accept=".doc,.docx,.rtf"
          >
            <Button icon={<UploadOutlined />}>
              {t('settings.patientCards.importModal.selectFile')}
            </Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ImportPatientCardModal;
