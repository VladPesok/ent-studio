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
  Space,
  Typography,
  Tooltip,
  message,
} from "antd";
import {
  SaveOutlined,
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
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { surname, name, dob } = useMemo(() => patientsApi.parsePatientFolder(folder), [folder]);

  const [patientMeta, setPatientMeta] = useState<patientsApi.PatientMeta>({});
  const [shownTabs, setShownTabs] = useState<configApi.TabEntry[]>(configApi.getDefaultTabs());
  const [currentAppointment, setCurrentAppointment] = useState<string>("");
  
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
    doctor: "",
    diagnosis: "",
    notes: "",
  });
  const [initialHash, setInitialHash] = useState("");
  const [appointmentDirty, setAppointmentDirty] = useState(false);

  const dirty = !!initialHash && JSON.stringify(form) !== initialHash;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dictionaries, patientCfg, tabs] = await Promise.all([
          configApi.getDictionaries(),
          patientsApi.getPatientMeta(folder),
          configApi.getShownTabs(),
        ]);

        setDicts(dictionaries);
        setPatientMeta(patientCfg);
        setShownTabs(Array.isArray(tabs) ? tabs : configApi.getDefaultTabs());
        setCurrentAppointment(patientCfg.currentAppointment || patientCfg.appointments?.[0]?.date || "");
        
        const loaded = {
          doctor:      patientCfg?.doctor     ?? "",
          diagnosis:   patientCfg?.diagnosis  ?? "",
          notes:       patientCfg?.notes      ?? "",
          voiceReport: Array.isArray(patientCfg?.voiceReport)
                         ? patientCfg.voiceReport
                         : [],
        };
        setForm(loaded);
        setInitialHash(JSON.stringify(loaded));
      } catch (error) {
        console.error('Error loading patient data:', error);
        // Set default tabs if loading fails
        setShownTabs(configApi.getDefaultTabs());
      }
    };
    
    loadData();
  }, [folder]);

  const updateField = (patch: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    const dataToSave = {
      ...form,
      currentAppointment
    };
    
    await patientsApi.setPatient(folder, dataToSave);

    if (form.doctor && !dicts.doctors.includes(form.doctor))
      await configApi.addDictionaryEntry("doctors", form.doctor);

    if (form.diagnosis && !dicts.diagnosis.includes(form.diagnosis))
      await configApi.addDictionaryEntry("diagnosis", form.diagnosis);

    setInitialHash(JSON.stringify(form));
    message.success("Зміни збережено");
  };

  const handleAppointmentChange = async (appointmentDate: string) => {
    setCurrentAppointment(appointmentDate);
    // Save the current appointment selection
    await patientsApi.setPatient(folder, { currentAppointment: appointmentDate });
    
    // Load appointment-specific data
    try {
      const appointmentData = await patientsApi.getPatient(`${folder}/${appointmentDate}`);
      setCurrentAppointmentForm({
        doctor: appointmentData.doctor || "",
        diagnosis: appointmentData.diagnosis || "",
        notes: appointmentData.notes || "",
      });
    } catch (error) {
      // If appointment data doesn't exist, use defaults
      setCurrentAppointmentForm({
        doctor: "",
        diagnosis: "",
        notes: "",
      });
    }
  };

  const handleCreateAppointment = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await window.electronAPI.makePatient(folder, today);
      // Refresh appointments list
      const meta = await patientsApi.getPatientMeta(folder);
      setPatientMeta(meta);
      // Select the new appointment
      await handleAppointmentChange(today);
    } catch (error) {
      console.error('Failed to create appointment:', error);
    }
  };

  const handleOpenPatientFolder = async () => {
    try {
      await window.electronAPI.openPatientFolderInFs(folder);
    } catch (error) {
      console.error('Failed to open patient folder:', error);
    }
  };

  const handleOpenAppointmentFolder = async () => {
    if (currentAppointment) {
      try {
        await window.electronAPI.openPatientFolderInFs(`${folder}/${currentAppointment}`);
      } catch (error) {
        console.error('Failed to open appointment folder:', error);
      }
    }
  };

  const handleDoctorCreate = async (newDoctor: string) => {
    try {
      await window.electronAPI.addDictionaryEntry('doctors', newDoctor);
      // Refresh dictionaries
      const newDicts = await window.electronAPI.getDictionaries();
      setDicts(newDicts);
    } catch (error) {
      console.error('Failed to add doctor:', error);
    }
  };

  const handleDiagnosisCreate = async (newDiagnosis: string) => {
    try {
      await window.electronAPI.addDictionaryEntry('diagnosis', newDiagnosis);
      // Refresh dictionaries
      const newDicts = await window.electronAPI.getDictionaries();
      setDicts(newDicts);
    } catch (error) {
      console.error('Failed to add diagnosis:', error);
    }
  };

  const updateAppointmentField = (patch: Partial<typeof currentAppointmentForm>) => {
    setCurrentAppointmentForm(prev => ({ ...prev, ...patch }));
    setAppointmentDirty(true);
  };

  const saveAppointmentData = async () => {
    if (currentAppointment) {
      try {
        await patientsApi.setPatient(`${folder}/${currentAppointment}`, currentAppointmentForm);
        setAppointmentDirty(false);
      } catch (error) {
        console.error('Failed to save appointment data:', error);
      }
    }
  };


  // Generate tab items based on shownTabs configuration
  const generateTabItems = () => {
    if (!Array.isArray(shownTabs) || shownTabs.length === 0) {
      return configApi.getDefaultTabs().map((tab, index) => {
        const key = tab.folder;
        
        if (tab.folder === 'video') {
          return {
            key,
            label: (
              <>
                <VideoCameraOutlined /> {t(tab.name)}
              </>
            ),
            children: <VideoGallery baseFolder={folder} />,
          };
        } else if (tab.folder === 'audio') {
          return {
            key,
            label: (
              <>
                <AudioOutlined /> {t(tab.name)}
              </>
            ),
            children: <AudioGallery baseFolder={folder} />,
          };
        } else {
          // Custom tab
          return {
            key,
            label: tab.name,
            children: <CustomTab baseFolder={folder} tabFolder={tab.folder} tabName={tab.name} />,
          };
        }
      });
    }
    
    return shownTabs.map((tab, index) => {
      const key = tab.folder;
      
      if (tab.folder === 'video') {
        return {
          key,
          label: (
            <>
              <VideoCameraOutlined /> {t(tab.name)}
            </>
          ),
          children: <VideoGallery baseFolder={folder} />,
        };
      } else if (tab.folder === 'audio') {
        return {
          key,
          label: (
            <>
              <AudioOutlined /> {t(tab.name)}
            </>
          ),
          children: <AudioGallery baseFolder={folder} />,
        };
      } else {
        // Custom tab
        return {
          key,
          label: tab.name,
          children: <CustomTab baseFolder={folder} tabFolder={tab.folder} tabName={tab.name} />,
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
              <Form.Item label="Основний лікар">
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
                onClick={handleCreateAppointment}
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

            {dirty && (
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={save}
                style={{ width: '100%', marginTop: 16 }}
              >
                Зберегти основні дані
              </Button>
            )}
          </Card>

          {/* Second Card: Current Appointment Details */}
          {currentAppointment && (
            <Card
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
                <Form.Item label="Лікар на прийомі">
                  <CreatableSelect
                    value={currentAppointmentForm.doctor || null}
                    items={Array.isArray(dicts.doctors) ? dicts.doctors : []}
                    onChange={(val) => updateAppointmentField({ doctor: val || "" })}
                    onCreate={handleDoctorCreate}
                    placeholder="Обрати або додати лікаря..."
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item label="Поточний діагноз">
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

                {appointmentDirty && (
                  <Form.Item>
                    <Button 
                      type="primary" 
                      icon={<SaveOutlined />} 
                      onClick={saveAppointmentData}
                      style={{ width: '100%' }}
                    >
                      Зберегти дані прийому
                    </Button>
                  </Form.Item>
                )}
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
    </Layout>
  );
};

export default PatientOverview;
