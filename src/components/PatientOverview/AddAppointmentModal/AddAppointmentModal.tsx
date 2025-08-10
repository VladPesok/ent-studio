import React, { useState, useEffect } from 'react';
import { Modal, Form, DatePicker, Input, Row, Col, Divider, Typography } from 'antd';
import { CalendarOutlined, MedicineBoxOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/uk';
import CreatableSelect from '../../../common/input/CreatableSelect';
import * as configApi from '../../../helpers/configApi';
import './AddAppointmentModal.css';

dayjs.locale('uk');

const { Title, Text } = Typography;

interface AddAppointmentModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (data: {
    date: string;
    doctor: string;
    diagnosis: string;
    notes: string;
  }) => void;
  existingDates: string[];
  defaultDoctor: string;
  defaultDiagnosis: string;
  doctors: string[];
  diagnoses: string[];
}

const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  existingDates,
  defaultDoctor,
  defaultDiagnosis,
  doctors,
  diagnoses,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Get today's date
  const today = dayjs().format('YYYY-MM-DD');
  const isTodayTaken = existingDates.includes(today);

  useEffect(() => {
    if (visible) {
      // Set default values when modal opens
      form.setFieldsValue({
        date: isTodayTaken ? null : dayjs(),
        doctor: defaultDoctor || undefined,
        diagnosis: defaultDiagnosis || undefined,
        notes: '',
      });
    } else {
      // Reset form when modal is closed
      form.resetFields();
      setLoading(false);
    }
  }, [visible, form, isTodayTaken, defaultDoctor, defaultDiagnosis]);

  const handleDoctorCreate = async (value: string) => {
    try {
      await configApi.addDictionaryEntry('doctors', value);
    } catch (error) {
      console.error("Failed to add doctor:", error);
    }
  };

  const handleDiagnosisCreate = async (value: string) => {
    try {
      await configApi.addDictionaryEntry('diagnosis', value);
    } catch (error) {
      console.error("Failed to add diagnosis:", error);
    }
  };

  const handleOk = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      onSubmit({
        date: values.date.format('YYYY-MM-DD'),
        doctor: values.doctor || '',
        diagnosis: values.diagnosis || '',
        notes: values.notes || '',
      });
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setLoading(false);
    onCancel();
  };

  const disabledDate = (current: Dayjs) => {
    if (!current) return false;
    const dateStr = current.format('YYYY-MM-DD');
    return existingDates.includes(dateStr);
  };

  return (
    <Modal
      open={visible}
      title={
        <div className="modal-header">
          <Title level={4} style={{ margin: 0 }}>
            Новий прийом
          </Title>
        </div>
      }
      okText="Створити"
      cancelText="Скасувати"
      onCancel={handleCancel}
      onOk={handleOk}
      confirmLoading={loading}
      width={600}
      className="add-appointment-modal"
    >
      <div className="modal-content">
        <Form
          form={form}
          layout="vertical"
          className="appointment-form"
        >
          <div className="form-section">
            <Title level={5} className="section-title">
              <CalendarOutlined /> Дата прийому
            </Title>
            
            <Form.Item
              label="Дата прийому"
              name="date"
              rules={[
                { required: true, message: 'Оберіть дату прийому' },
                {
                  validator: (_, value) =>
                    value && value.isValid()
                      ? Promise.resolve()
                      : Promise.reject('Невірний формат дати'),
                },
              ]}
            >
              <DatePicker
                allowClear={false}
                format="DD-MM-YYYY"
                style={{ width: '100%' }}
                size="large"
                disabledDate={disabledDate}
                placeholder="Оберіть дату прийому"
              />
            </Form.Item>
          </div>

          <Divider />

          <div className="form-section">
            <Title level={5} className="section-title">
              <MedicineBoxOutlined /> Медична інформація
            </Title>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Лікар"
                  name="doctor"
                >
                  <CreatableSelect
                    value={form.getFieldValue('doctor') || null}
                    items={Array.isArray(doctors) ? doctors : []}
                    onChange={(value) => form.setFieldValue('doctor', value)}
                    onCreate={handleDoctorCreate}
                    placeholder="Оберіть або введіть лікаря"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  label="Діагноз"
                  name="diagnosis"
                >
                  <CreatableSelect
                    value={form.getFieldValue('diagnosis') || null}
                    items={Array.isArray(diagnoses) ? diagnoses : []}
                    onChange={(value) => form.setFieldValue('diagnosis', value)}
                    onCreate={handleDiagnosisCreate}
                    placeholder="Оберіть або введіть діагноз"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Divider />

          <div className="form-section">
            <Title level={5} className="section-title">
              <FileTextOutlined /> Додаткова інформація
              <Text type="secondary" className="optional-label">(необов'язково)</Text>
            </Title>
            
            <Form.Item
              label="Примітки"
              name="notes"
            >
              <Input.TextArea
                rows={3}
                placeholder="Додаткові примітки до прийому"
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default AddAppointmentModal;