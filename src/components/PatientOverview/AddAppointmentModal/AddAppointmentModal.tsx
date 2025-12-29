import React, { useState, useEffect, useContext } from 'react';
import { Modal, Form, DatePicker, Input, Row, Col, Divider, Typography, Select } from 'antd';
import { CalendarOutlined, MedicineBoxOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/uk';
import CreatableSelect from '../../../common/input/CreatableSelect';
import { AppConfigContext } from '../../../holders/AppConfig';
import './AddAppointmentModal.css';

dayjs.locale('uk');

const { Title, Text } = Typography;

interface AddAppointmentModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (data: {
    date: string;
    doctors: string[];
    diagnosis: string;
    notes: string;
  }) => void;
  existingDates: string[];
  defaultDoctor: string;
  defaultDiagnosis: string;
}

const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  existingDates,
  defaultDoctor,
  defaultDiagnosis,
}) => {
  const { t } = useTranslation();
  const { doctors, diagnoses, addDoctor, addDiagnosis } = useContext(AppConfigContext);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Get today's date
  const today = dayjs().format('YYYY-MM-DD');
  const isTodayTaken = existingDates.includes(today);

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        date: isTodayTaken ? null : dayjs(),
        doctors: defaultDoctor ? [defaultDoctor] : [],
        diagnosis: defaultDiagnosis || null,
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
      await addDoctor(value);
    } catch (error) {
      console.error("Failed to add doctor:", error);
    }
  };

  const handleDiagnosisCreate = async (value: string) => {
    try {
      await addDiagnosis(value);
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
        doctors: values.doctors,
        diagnosis: values.diagnosis,
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
            {t('patientOverview.addAppointmentModal.title')}
          </Title>
        </div>
      }
      okText={t('common.create')}
      cancelText={t('common.cancel')}
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
              <CalendarOutlined /> {t('patientOverview.addAppointmentModal.appointmentDate')}
            </Title>
            
            <Form.Item
              label={t('patientOverview.addAppointmentModal.appointmentDate')}
              name="date"
              rules={[
                { required: true, message: t('patientOverview.addAppointmentModal.selectAppointmentDate') },
                {
                  validator: (_, value) =>
                    value && value.isValid()
                      ? Promise.resolve()
                      : Promise.reject(t('patientOverview.addAppointmentModal.invalidDateFormat')),
                },
              ]}
            >
              <DatePicker
                allowClear={false}
                format="DD-MM-YYYY"
                style={{ width: '100%' }}
                size="large"
                disabledDate={disabledDate}
                placeholder={t('patientOverview.addAppointmentModal.selectAppointmentDate')}
              />
            </Form.Item>
          </div>

          <Divider />

          <div className="form-section">
            <Title level={5} className="section-title">
              <MedicineBoxOutlined /> {t('patientOverview.addAppointmentModal.medicalInfo')}
            </Title>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={t('patientOverview.addAppointmentModal.doctorsAtAppointment')}
                  name="doctors"
                >
                  <Select
                    mode="tags"
                    value={form.getFieldValue('doctors')}
                    onChange={(value) => {
                      form.setFieldsValue({ doctors: value });
                      if (Array.isArray(value)) {
                        const newDoctors = value.filter(v => !doctors.includes(v));
                        if (newDoctors.length > 0) {
                          newDoctors.forEach(handleDoctorCreate);
                        }
                      }
                    }}
                    options={doctors.map(doctor => ({ label: doctor, value: doctor }))}
                    placeholder={t('patientOverview.addAppointmentModal.selectOrEnterDoctor')}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  label={t('patientOverview.addAppointmentModal.diagnosisAtDate')}
                  name="diagnosis"
                >
                 <CreatableSelect
                    value={form.getFieldValue('diagnosis')}
                    onChange={(value) => form.setFieldsValue({ diagnosis: value })}
                    items={diagnoses}
                    onCreate={handleDiagnosisCreate}
                    placeholder={t('patientOverview.addAppointmentModal.selectOrEnterDiagnosis')}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Divider />

          <div className="form-section">
            <Title level={5} className="section-title">
              <FileTextOutlined /> {t('patientOverview.addAppointmentModal.additionalInfo')}
              <Text type="secondary" className="optional-label">{t('patientOverview.addAppointmentModal.optional')}</Text>
            </Title>
            
            <Form.Item
              label={t('patientOverview.addAppointmentModal.notesLabel')}
              name="notes"
            >
              <Input.TextArea
                rows={3}
                placeholder={t('patientOverview.addAppointmentModal.additionalNotes')}
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