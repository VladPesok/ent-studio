import React, { useState, useEffect } from "react";
import { Modal, Form, Input, DatePicker, Row, Col, Divider, Typography } from "antd";
import { UserOutlined, CalendarOutlined, MedicineBoxOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/uk";
import { getDictionaries, addDictionaryEntry } from "../../../helpers/configApi";
import { setPatient } from "../../../helpers/patientsApi";
import CreatableSelect from "../../../common/input/CreatableSelect";
import "./AddCardModal.css";

dayjs.locale("uk");

const { Title, Text } = Typography;

interface Props {
  onOk(folderBase: string, visitDate: string): void;
  onClose(): void;
}

type FormValues = {
  surname: string;
  name: string;
  dob: Dayjs;
  visitDate: Dayjs;
  doctor?: string;
  diagnosis?: string;
};

const AddCardModal: React.FC<Props> = ({ onOk, onClose }) => {
  const [form] = Form.useForm<FormValues>();
  const [dictionaries, setDictionaries] = useState<{ doctors: string[]; diagnosis: string[] }>({
    doctors: [],
    diagnosis: []
  });
  const [loading, setLoading] = useState(false);

  const fmt = (d: Dayjs) => d.format("YYYY-MM-DD");

  useEffect(() => {
    const loadDictionaries = async () => {
      try {
        const dicts = await getDictionaries();
        setDictionaries(dicts);
      } catch (error) {
        console.error("Failed to load dictionaries:", error);
      }
    };
    loadDictionaries();
  }, []);

  const handleCreateDoctor = async (value: string) => {
    try {
      await addDictionaryEntry("doctors", value);
      setDictionaries(prev => ({
        ...prev,
        doctors: [...prev.doctors, value]
      }));
    } catch (error) {
      console.error("Failed to add doctor:", error);
    }
  };

  const handleCreateDiagnosis = async (value: string) => {
    try {
      await addDictionaryEntry("diagnosis", value);
      setDictionaries(prev => ({
        ...prev,
        diagnosis: [...prev.diagnosis, value]
      }));
    } catch (error) {
      console.error("Failed to add diagnosis:", error);
    }
  };

  const handleOk = async () => {
    try {
      setLoading(true);
      const v = await form.validateFields();
      const folderBase = `${v.surname.trim()}_${v.name.trim()}_${fmt(v.dob)}`;
      
      // Create patient first
      await onOk(folderBase, fmt(v.visitDate));
      
      // Save patient metadata if provided
      if (v.doctor || v.diagnosis) {
        try {
          await setPatient(folderBase, {
            doctor: v.doctor || "",
            diagnosis: v.diagnosis || ""
          });
        } catch (error) {
          console.error("Failed to save patient metadata:", error);
        }
      }
    } catch {
      // Form validation failed
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      title={
        <div className="modal-header">
          <UserOutlined className="modal-icon" />
          <Title level={4} style={{ margin: 0, color: 'white' }}>
            Нова картка пацієнта
          </Title>
        </div>
      }
      okText="Створити"
      cancelText="Скасувати"
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      destroyOnHidden
      width={600}
      className="add-card-modal"
    >
      <div className="modal-content">
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          initialValues={{ visitDate: dayjs() }}
          className="patient-form"
        >
          <div className="form-section">
            <Title level={5} className="section-title">
              <UserOutlined /> Особисті дані
            </Title>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Прізвище"
                  name="surname"
                  rules={[{ required: true, message: "Вкажіть прізвище" }]}
                >
                  <Input 
                    placeholder="Вкажіть прізвище" 
                    prefix={<UserOutlined className="input-icon" />}
                    size="large"
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  label="Ім'я"
                  name="name"
                  rules={[{ required: true, message: "Вкажіть ім'я" }]}
                >
                  <Input 
                    placeholder="Вкажіть ім'я" 
                    prefix={<UserOutlined className="input-icon" />}
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Дата народження"
              name="dob"
              rules={[
                { required: true, message: "Вкажіть дату народження" },
                {
                  validator: (_, value) =>
                    value && value.isValid()
                      ? Promise.resolve()
                      : Promise.reject("Невірний формат дати"),
                },
              ]}
            >
              <DatePicker
                allowClear={false}
                format="DD-MM-YYYY"
                style={{ width: "100%" }}
                size="large"
                prefix={<CalendarOutlined />}
                placeholder="Оберіть дату народження"
              />
            </Form.Item>
          </div>

          <Divider />

          <div className="form-section">
            <Title level={5} className="section-title">
              <CalendarOutlined /> Дата прийому
            </Title>
            
            <Form.Item
              label="Дата прийому"
              name="visitDate"
              rules={[
                { required: true, message: "Вкажіть дату прийому" },
                {
                  validator: (_, value) =>
                    value && value.isValid()
                      ? Promise.resolve()
                      : Promise.reject("Невірний формат дати"),
                },
              ]}
            >
              <DatePicker
                allowClear={false}
                format="DD-MM-YYYY"
                style={{ width: "100%" }}
                size="large"
                placeholder="Оберіть дату прийому"
              />
            </Form.Item>
          </div>

          <Divider />

          <div className="form-section optional-section">
            <Title level={5} className="section-title">
              <MedicineBoxOutlined /> Медична інформація 
              <Text type="secondary" className="optional-label">(необов'язково)</Text>
            </Title>
            
            <Row gutter={16}>
               <Col span={12}>
                 <Form.Item
                   label="Лікар"
                   name="doctor"
                 >
                   <CreatableSelect
                     value={form.getFieldValue('doctor') || null}
                     items={dictionaries.doctors}
                     onChange={(value) => form.setFieldValue('doctor', value)}
                     onCreate={handleCreateDoctor}
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
                     items={dictionaries.diagnosis}
                     onChange={(value) => form.setFieldValue('diagnosis', value)}
                     onCreate={handleCreateDiagnosis}
                     placeholder="Оберіть або введіть діагноз"
                     style={{ width: '100%' }}
                   />
                 </Form.Item>
               </Col>
             </Row>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default AddCardModal;
