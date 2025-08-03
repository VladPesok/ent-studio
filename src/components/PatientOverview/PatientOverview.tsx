import React, { useEffect, useState, useMemo } from "react";
import {
  Layout,
  Card,
  Descriptions,
  Tabs,
  Button,
  Form,
  Select,
  Input,
  Space,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  VideoCameraOutlined,
  AudioOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";

import * as patientsApi from "../../helpers/patientsApi";
import * as configApi from "../../helpers/configApi";

import VideoGallery from "./VideoGallery/VideoGallery";
import AudioGallery from "./AudioGallery/AudioGallery";

import "./PatientOverview.css"; // keep any custom tweaks

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */
const fmt = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

const parseFolder = (folder: string) => {
  const [surname = "", name = "", dob = ""] = folder.split("_");
  return { surname, name, dob };
};

/* ------------------------------------------------------------------ */
/* component                                                          */
/* ------------------------------------------------------------------ */
const PatientOverview: React.FC = () => {
  const { folder = "" } = useParams();
  const navigate = useNavigate();

  const { surname, name, dob } = useMemo(() => parseFolder(folder), [folder]);

  /* ------------ state -------------------------------------------- */
  const [patientDate, setPatientDate] = useState<string | undefined>();

  const [dicts, setDicts] = useState<{ doctors: string[]; diagnosis: string[] }>(
    { doctors: [], diagnosis: [] }
  );

  /** raw patient data, persisted */
  const [form, setForm] = useState<{
    doctor: string;
    diagnosis: string;
    notes: string;
    voiceReport: any[];
  }>({
    doctor: "",
    diagnosis: "",
    notes: "",
    voiceReport: [],
  });
  const [initialHash, setInitialHash] = useState("");

  const dirty = !!initialHash && JSON.stringify(form) !== initialHash;

  /* ------------ load dictionaries + patient + date --------------- */
  useEffect(() => {
    (async () => {
      const [dictionaries, patientCfg, allPatients] = await Promise.all([
        configApi.getDictionaries(),
        patientsApi.getPatientMeta(folder),
        patientsApi.getPatients(),
      ]);

      setDicts(dictionaries);

      const loaded = {
        doctor: patientCfg?.doctor ?? "",
        diagnosis: patientCfg?.diagnosis ?? "",
        notes: patientCfg?.notes ?? "",
        voiceReport: Array.isArray(patientCfg?.voiceReport)
          ? patientCfg.voiceReport
          : [],
      };
      setForm(loaded);
      setInitialHash(JSON.stringify(loaded));

      /* find appointment date for header */
      setPatientDate(allPatients.find((p) => p.folder === folder)?.date);
    })();
  }, [folder]);

  /* ------------ update shorthand --------------------------------- */
  const updateField = (patch: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  /* ------------ save handler ------------------------------------- */
  const save = async () => {
    await patientsApi.setPatient(folder, form);

    /* sync ad-hoc dictionary entries */
    if (form.doctor && !dicts.doctors.includes(form.doctor))
      await configApi.addDictionaryEntry("doctors", form.doctor);

    if (form.diagnosis && !dicts.diagnosis.includes(form.diagnosis))
      await configApi.addDictionaryEntry("diagnosis", form.diagnosis);

    setInitialHash(JSON.stringify(form));
    message.success("Зміни збережено");
  };

  /* ------------------------------------------------------------------ */
  /* UI                                                                 */
  /* ------------------------------------------------------------------ */
  return (
    <Layout style={{ padding: 24, gap: 24 }}>
      {/* --- Header row ------------------------------------------------ */}
      <Space align="center" style={{ marginBottom: 8 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/patients")}
        >
          До списку
        </Button>

        <h2 style={{ margin: 0 }}>Карта пацієнта</h2>

        <Space style={{ marginLeft: "auto" }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={!dirty}
            onClick={save}
          >
            Зберегти
          </Button>
        </Space>
      </Space>

      {/* --- Patient meta --------------------------------------------- */}
      <Card>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Пацієнт">
            {surname} {name}
          </Descriptions.Item>
          <Descriptions.Item label="Дата народження">
            {fmt(dob)}
          </Descriptions.Item>
          <Descriptions.Item label="Дата обстеження">
            {fmt(patientDate)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* --- Edit form ------------------------------------------------- */}
      <Card title="Відомості прийому" style={{ maxWidth: 600 }}>
        <Form layout="vertical">
          <Form.Item label="Лікар">
            <Select
              mode="tags"
              placeholder="Додати/обрати..."
              value={form.doctor ? [form.doctor] : []}
              onChange={(vals) => updateField({ doctor: vals[0] || "" })}
              options={dicts.doctors.map((d) => ({ value: d, label: d }))}
              maxTagCount={1}
              allowClear
            />
          </Form.Item>

          <Form.Item label="Діагноз">
            <Select
              mode="tags"
              placeholder="Додати/обрати..."
              value={form.diagnosis ? [form.diagnosis] : []}
              onChange={(vals) => updateField({ diagnosis: vals[0] || "" })}
              options={dicts.diagnosis.map((d) => ({ value: d, label: d }))}
              maxTagCount={1}
              allowClear
            />
          </Form.Item>

          <Form.Item label="Нотатки">
            <Input.TextArea
              rows={6}
              value={form.notes}
              onChange={(e) => updateField({ notes: e.target.value })}
            />
          </Form.Item>
        </Form>
      </Card>

      {/* --- Tabs: video / audio -------------------------------------- */}
      <Tabs
        defaultActiveKey="video"
        items={[
          {
            key: "video",
            label: (
              <>
                <VideoCameraOutlined /> Відео матеріали
              </>
            ),
            children: <VideoGallery baseFolder={folder} />,
          },
          {
            key: "audio",
            label: (
              <>
                <AudioOutlined /> Голосовий звіт
              </>
            ),
            children: <AudioGallery baseFolder={folder} />,
          },
        ]}
      />
    </Layout>
  );
};

export default PatientOverview;
