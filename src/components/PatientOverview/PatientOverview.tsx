import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Layout,
  Card,
  Descriptions,
  Form,
  Input,
  Button,
  Tabs,
  List,
  Select,
  Typography,
  Tooltip,
  message,
} from "antd";
import {
  VideoCameraOutlined,
  AudioOutlined,
  CalendarOutlined,
  FolderOpenOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import VideoGallery from "./VideoGallery/VideoGallery";
import AudioGallery from "./AudioGallery/AudioGallery";
import CustomTab from "./CustomTab/CustomTab";
import CreatableSelect from "../../common/input/CreatableSelect";
import AddAppointmentModal from "./AddAppointmentModal/AddAppointmentModal";

import * as patientsApi from "../../helpers/patientsApi";
import * as configApi from "../../helpers/configApi";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const fmt = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

const PatientOverview: React.FC = () => {
  const { id: folder = "" } = useParams();
  const { t } = useTranslation();

  const { surname, name, dob } = useMemo(() => patientsApi.parsePatientFolder(folder), [folder]);

  const [patientMeta, setPatientMeta] = useState<patientsApi.PatientMeta>({});
  const [shownTabs, setShownTabs] = useState<configApi.TabEntry[]>(configApi.getDefaultTabs());
  const [currentAppointment, setCurrentAppointment] = useState<string>("");
  const [addAppointmentModalVisible, setAddAppointmentModalVisible] = useState(false);
  const [patientInfoLoading, setPatientInfoLoading] = useState(true);
  const [currentAppointmentLoading, setCurrentAppointmentLoading] = useState(false);
  
  const [dicts, setDicts] = useState<{ doctors: string[]; diagnosis: string[] }>(
    { doctors: [], diagnosis: [] },
  );
  const [form, setForm] = useState({
    doctor: "",
    diagnosis: "",
    notes: "",
    voiceReport: [] as any[],
  });
  const [currentAppointmentForm, setCurrentAppointmentForm] = useState({
    doctors: [],
    diagnosis: "",
    notes: "",
  });

  useEffect(() => {
    const loadData = async () => {
      setPatientInfoLoading(true);
      try {
        const [dictionaries, patientMeta, tabs] = await Promise.all([
          configApi.getDictionaries(),
          patientsApi.getPatientMeta(folder),
          configApi.getShownTabs(),
        ]);
        
        setDicts(dictionaries);
        setPatientMeta(patientMeta);
        setShownTabs(Array.isArray(tabs) ? tabs : configApi.getDefaultTabs());
        
        // Set currentAppointment as inner variable (not saved to config)
        const selectedAppointment = patientMeta.appointments?.[0]?.date || "";
        setCurrentAppointment(selectedAppointment);
        
        // Load patient-level data (only doctor and diagnosis)
        const loaded = {
          doctor:      patientMeta?.doctor     ?? "",
          diagnosis:   patientMeta?.diagnosis  ?? "",
          notes:       "", // notes are appointment-level, not patient-level
          voiceReport: [], // voiceReport is appointment-level, not patient-level
        };
        setForm(loaded);
        
        // Load appointment-specific data if we have a selected appointment
        if (selectedAppointment) {
          try {
            await handleAppointmentChange(selectedAppointment);
          } catch (appointmentError) {
            console.error('Error loading appointment data:', appointmentError);
          }
        }
      } catch (error) {
        console.error('Error loading patient data:', error);
        // Set default tabs if loading fails
        setShownTabs(configApi.getDefaultTabs());
      } finally {
        setPatientInfoLoading(false);
      }
    };
    
    loadData();
  }, [folder]);

  const updateField = async (patch: Partial<typeof form>) => {
    const newForm = { ...form, ...patch };
    setForm(newForm);
    
    // Auto-save only doctor and diagnosis to patient.config (patient-level)
    try {
      const patientConfigData: { doctor?: string; diagnosis?: string } = {};
      
      if ('doctor' in patch) patientConfigData.doctor = newForm.doctor;
      if ('diagnosis' in patch) patientConfigData.diagnosis = newForm.diagnosis;
      
      // Only save if we have patient-level data to save
      if (Object.keys(patientConfigData).length > 0) {
        await patientsApi.setPatient(folder, patientConfigData);
      }

      // Add new entries to dictionaries if needed
      if (newForm.doctor && !dicts.doctors.includes(newForm.doctor))
        await configApi.addDictionaryEntry("doctors", newForm.doctor);

      if (newForm.diagnosis && !dicts.diagnosis.includes(newForm.diagnosis))
        await configApi.addDictionaryEntry("diagnosis", newForm.diagnosis);
    } catch (error) {
      console.error('Failed to auto-save patient data:', error);
    }
  };



  const handleAppointmentChange = async (appointmentDate: string) => {
    // Skip reload if clicking on the current appointment
    if (currentAppointment === appointmentDate) {
      return;
    }
    
    setCurrentAppointment(appointmentDate);
    setCurrentAppointmentLoading(true);
    
    // Load appointment-specific data from appointment.config
    try {
      const appointmentData = await patientsApi.getPatientAppointment(`${folder}/${appointmentDate}`);
      setCurrentAppointmentForm({
        doctors: appointmentData.doctors || [],
        diagnosis: appointmentData.diagnosis || "",
        notes: appointmentData.notes || "",
      });
    } catch (error) {
      // If appointment data doesn't exist, use defaults
      setCurrentAppointmentForm({
        doctors: [],
        diagnosis: "",
        notes: "",
      });
    } finally {
      setCurrentAppointmentLoading(false);
    }
  };

  const handleCreateAppointment = async (appointmentData: {
    date: string;
    doctors: string[];
    diagnosis: string;
    notes: string;
  }) => {
    try {
      setPatientInfoLoading(true);
      
      // Create the appointment folder
      await patientsApi.makePatient(folder, appointmentData.date);
      
      // Save appointment-specific data
      await patientsApi.setPatientAppointments(`${folder}/${appointmentData.date}`, {
        doctors: appointmentData.doctors,
        diagnosis: appointmentData.diagnosis,
        notes: appointmentData.notes,
      });
      
      // Refresh appointments list
      const meta = await patientsApi.getPatientMeta(folder);
      setPatientMeta(meta);
      
      // Select the new appointment
      await handleAppointmentChange(appointmentData.date);
      
      // Close modal
      setAddAppointmentModalVisible(false);
      
      message.success('Прийом успішно створено');
    } catch (error) {
      console.error('Failed to create appointment:', error);
      message.error('Не вдалося створити прийом');
    } finally {
      setPatientInfoLoading(false);
    }
  };

  const handleOpenPatientFolder = async () => {
    try {
      await patientsApi.openPatientFolderInFs(folder);
    } catch (error) {
      console.error('Failed to open patient folder:', error);
    }
  };

  const handleOpenAppointmentFolder = async () => {
    if (currentAppointment) {
      try {
        await patientsApi.openPatientFolderInFs(`${folder}/${currentAppointment}`);
      } catch (error) {
        console.error('Failed to open appointment folder:', error);
      }
    }
  };

  const handleDoctorCreate = async (newDoctor: string) => {
    try {
      await configApi.addDictionaryEntry('doctors', newDoctor);
      // Refresh dictionaries
      const newDicts = await configApi.getDictionaries();
      setDicts(newDicts);
    } catch (error) {
      console.error('Failed to add doctor:', error);
    }
  };

  const handleDiagnosisCreate = async (newDiagnosis: string) => {
    try {
      await configApi.addDictionaryEntry('diagnosis', newDiagnosis);
      // Refresh dictionaries
      const newDicts = await configApi.getDictionaries();
      setDicts(newDicts);
    } catch (error) {
      console.error('Failed to add diagnosis:', error);
    }
  };

  const updateAppointmentField = async (patch: Partial<typeof currentAppointmentForm>) => {
    const newForm = { ...currentAppointmentForm, ...patch };
    setCurrentAppointmentForm(newForm);
    
    // Auto-save doctor, diagnosis, and notes to appointment.config (appointment-level)
    if (currentAppointment) {
      try {
        const appointmentConfigData: { doctors?: string[]; diagnosis?: string; notes?: string } = {};
        
        if ('doctors' in patch) appointmentConfigData.doctors = newForm.doctors;
        if ('diagnosis' in patch) appointmentConfigData.diagnosis = newForm.diagnosis;
        if ('notes' in patch) appointmentConfigData.notes = newForm.notes;
        
        // Only save if we have appointment-level data to save
        if (Object.keys(appointmentConfigData).length > 0) {
          await patientsApi.setPatientAppointments(`${folder}/${currentAppointment}`, appointmentConfigData);
        }
      } catch (error) {
        console.error('Failed to auto-save appointment data:', error);
      }
    }
  };

  // Generate tab items based on shownTabs configuration
  const generateTabItems = () => {
    if (!Array.isArray(shownTabs) || shownTabs.length === 0) {
      return configApi.getDefaultTabs().map((tab) => {
        const key = tab.folder;
        
        if (tab.folder === 'video') {
          return {
            key,
            label: (
              <>
                <VideoCameraOutlined /> {t(tab.folder)}
              </>
            ),
            children: <VideoGallery baseFolder={folder} currentAppointment={currentAppointment} />,
          };
        } else if (tab.folder === 'audio') {
          return {
            key,
            label: (
              <>
                <AudioOutlined /> {t(tab.folder)}
              </>
            ),
            children: <AudioGallery baseFolder={folder} currentAppointment={currentAppointment} />,
          };
        } else {
          // Custom tab
          return {
            key,
            label: tab.name || tab.folder,
            children: <CustomTab baseFolder={folder} tabFolder={tab.folder} tabName={tab.name || tab.folder} currentAppointment={currentAppointment} />,
          };
        }
      });
    }
    
    return shownTabs.map((tab) => {
      const key = tab.folder;
      
      if (tab.folder === 'video') {
        return {
          key,
          label: (
            <>
              <VideoCameraOutlined /> {t(tab.folder)}
            </>
          ),
          children: <VideoGallery baseFolder={folder} currentAppointment={currentAppointment} />,
        };
      } else if (tab.folder === 'audio') {
        return {
          key,
          label: (
            <>
              <AudioOutlined /> {t(tab.folder)}
            </>
          ),
          children: <AudioGallery baseFolder={folder} currentAppointment={currentAppointment} />,
        };
      } else {
        // Custom tab
        return {
          key,
          label: tab.name || tab.folder,
          children: <CustomTab baseFolder={folder} tabFolder={tab.folder} tabName={tab.name || tab.folder} currentAppointment={currentAppointment} />,
        };
      }
    });
  };

  return (
    <Layout style={{ padding: 24, height: "100%", boxSizing: "border-box" }}>
      <Layout style={{ background: "transparent" }}>
        <Sider
          width={400}
          theme="light"
          style={{ background: "transparent", paddingRight: 24 }}
        >
          {/* First Card: Patient Info */}
          <Card
            loading={patientInfoLoading}
            title={
              <>
                <div style={{ marginTop: 8 }}>
                  <Title level={3} style={{ margin: 0 }}>
                    {surname} {name}
                  </Title>
                </div>
                
                <Descriptions column={1} size="small" style={{ marginBottom: 8 }}>
                  <Descriptions.Item label="Дата народження">
                    {fmt(dob)}
                  </Descriptions.Item>
                </Descriptions>
              </>
            }
            extra={
              <Tooltip title="Відкрити папку пацієнта">
                <Button 
                  type="text" 
                  icon={<FolderOpenOutlined />} 
                  onClick={handleOpenPatientFolder}
                />
              </Tooltip>
            }
          >
            <Form layout="vertical">
              <Form.Item label="Ведучий лікар">
                <CreatableSelect
                  value={form.doctor || null}
                  items={Array.isArray(dicts.doctors) ? dicts.doctors : []}
                  onChange={(val) => updateField({ doctor: val || "" })}
                  onCreate={handleDoctorCreate}
                  placeholder="Обрати або додати лікаря..."
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label="Основний діагноз">
                <CreatableSelect
                  value={form.diagnosis || null}
                  items={Array.isArray(dicts.diagnosis) ? dicts.diagnosis : []}
                  onChange={(val) => updateField({ diagnosis: val || "" })}
                  onCreate={handleDiagnosisCreate}
                  placeholder="Обрати або додати діагноз..."
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Form>

            {/* Appointments List */}
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                <CalendarOutlined style={{ marginRight: 8 }} />
                Список прийомів
              </div>
              
              {/* Create New Appointment Button */}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => setAddAppointmentModalVisible(true)}
                style={{ width: '100%', marginBottom: 8 }}
              >
                Створити новий прийом
              </Button>

              {patientMeta.appointments && patientMeta.appointments.length > 0 ? (
                <List
                  size="small"
                  dataSource={patientMeta.appointments}
                  renderItem={(appointment) => (
                    <List.Item style={{ padding: '4px 0' }}>
                      <Button
                        type={currentAppointment === appointment.date ? "primary" : "text"}
                        onClick={() => handleAppointmentChange(appointment.date)}
                        style={{ width: '100%', textAlign: 'left' }}
                      >
                        {fmt(appointment.date)}
                      </Button>
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: '16px 0' }}>
                  Немає прийомів
                </div>
              )}
            </div>


          </Card>

          {/* Second Card: Current Appointment Details */}
          {currentAppointment && (
            <Card
              loading={currentAppointmentLoading}
              title={`Прийом ${fmt(currentAppointment)}`}
              style={{ marginTop: 16 }}
              extra={
                <Tooltip title="Відкрити папку прийому">
                  <Button 
                    type="text" 
                    icon={<FolderOpenOutlined />} 
                    onClick={handleOpenAppointmentFolder}
                  />
                </Tooltip>
              }
            >
              <Form layout="vertical">
                <Form.Item label="Лікарі на прийомі">
                  <Select
                    mode="tags"
                    value={currentAppointmentForm.doctors || []}
                    options={Array.isArray(dicts.doctors) ? dicts.doctors.map(doctor => ({ value: doctor, label: doctor })) : []}
                    onChange={async (val) => {
                      // Handle new doctor creation
                      const newDoctors = val.filter(doctor => !dicts.doctors.includes(doctor));
                      for (const newDoctor of newDoctors) {
                        await handleDoctorCreate(newDoctor);
                      }
                      updateAppointmentField({ doctors: val || [] });
                    }}
                    placeholder="Обрати або додати лікаря..."
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item label="Діагноз станом на дату прийому">
                  <CreatableSelect
                    value={currentAppointmentForm.diagnosis || null}
                    items={Array.isArray(dicts.diagnosis) ? dicts.diagnosis : []}
                    onChange={(val) => updateAppointmentField({ diagnosis: val || "" })}
                    onCreate={handleDiagnosisCreate}
                    placeholder="Обрати або додати діагноз..."
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item label="Нотатки">
                  <Input.TextArea
                    rows={4}
                    value={currentAppointmentForm.notes}
                    onChange={(e) => updateAppointmentField({ notes: e.target.value })}
                    placeholder="Нотатки про прийом..."
                  />
                </Form.Item>


              </Form>
            </Card>
          )}
        </Sider>

        {/* Main content (right) */}
        <Content style={{ background: "transparent" }}>
          <Tabs
            defaultActiveKey={
              Array.isArray(shownTabs) && shownTabs.length > 0 
                ? shownTabs[0].folder 
                : configApi.getDefaultTabs()[0]?.folder
            }
            items={generateTabItems()}
          />
        </Content>
      </Layout>
      
      {/* Add Appointment Modal */}
      <AddAppointmentModal
        visible={addAppointmentModalVisible}
        onCancel={() => setAddAppointmentModalVisible(false)}
        onSubmit={handleCreateAppointment}
        existingDates={(patientMeta.appointments || []).map(appt => appt.date)}
        defaultDoctor={patientMeta.doctor || ''}
        defaultDiagnosis={patientMeta.diagnosis || ''}
        doctors={dicts.doctors}
        diagnoses={dicts.diagnosis}
      />
    </Layout>
  );
};

export default PatientOverview;
