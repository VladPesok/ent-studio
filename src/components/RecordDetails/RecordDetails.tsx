import React, { useEffect, useState } from "react";
import CreatableSelect from "react-select/creatable";
import AudioGallery from "./AudioGallery/AudioGallery";

import "./RecordDetails.css";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const parseFolder = (folder: string) => {
  const [surname = "", name = "", dob = ""] = folder.split("_");
  return { surname, name, dob };
};

interface Project {
  folder: string;
  date: string;
}

interface Props {
  project: Project;
  onClose: () => void;   // ← back to list
  onSaved: () => void;   // ← refresh list
}

const RecordDetails: React.FC<Props> = ({ project, onClose, onSaved }) => {
  const { surname, name, dob } = parseFolder(project.folder);

  const [tab, setTab] = useState<"video" | "audio">("video");

  const [dicts, setDicts] = useState<{ doctors: string[]; diagnosis: string[] }>(
    { doctors: [], diagnosis: [] }
  );

  const [form, setForm] = useState<{
    doctor: string;
    diagnosis: string;
    notes: string;
    voiceReport: {
      length: number | null;
      medianPitch: number;
      jitter: number;
      shimmer: number;
      ratio: number;
      file: string;
    }[];
  }>({
    doctor: "",
    diagnosis: "",
    notes: "",
    voiceReport: [],
  });

  const [initialHash, setInitialHash] = useState("");

  useEffect(() => {
    (async () => {
      const [dictionaries, patient] = await Promise.all([
        window.electronAPI.getDictionaries(),
        window.electronAPI.getPatient(project.folder),
      ]);

      setDicts(dictionaries);
      const loaded = {
        doctor:      patient.doctor    ?? "",
        diagnosis:   patient.diagnosis ?? "",
        notes:       patient.notes     ?? "",
        voiceReport:
          Array.isArray(patient.voiceReport) ? patient.voiceReport : [],
      };
      setForm(loaded);
      setInitialHash(JSON.stringify(loaded));
    })();
  }, [project.folder]);

  const dirty = initialHash && JSON.stringify(form) !== initialHash;
  const updateField = (patch: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    await window.electronAPI.setPatient(project.folder, form);

    if (form.doctor && !dicts.doctors.includes(form.doctor))
      await window.electronAPI.addDictionaryEntry("doctors", form.doctor);

    if (form.diagnosis && !dicts.diagnosis.includes(form.diagnosis))
      await window.electronAPI.addDictionaryEntry("diagnosis", form.diagnosis);

    setInitialHash(JSON.stringify(form));
    onSaved();
  };

  return (
    <div className="record-grid">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="patient-meta">
            <span className="patient-title">{name} {surname}</span><br/>
            {fmt(dob)}
          </span>
            {dirty && (
            <button className="btn save" onClick={save}>
              Зберегти
            </button>
          )}
        </div>

        <p>
          Дата обстеження: {fmt(project.date)}
        </p>

        <div className="form-grid">
          <label>Лікар</label>
          <CreatableSelect
            classNamePrefix="rs"
            isClearable
            value={
              form.doctor ? { value: form.doctor, label: form.doctor } : null
            }
            options={dicts.doctors.map((d) => ({ value: d, label: d }))}
            placeholder="Додати/обрати..."
            noOptionsMessage={() => "Немає варіантів"}
            formatCreateLabel={(i) => `Додати: “${i}”`}
            onChange={(o) => updateField({ doctor: o?.value || "" })}
          />

          <label style={{ marginTop: 12 }}>Діагноз</label>
          <CreatableSelect
            classNamePrefix="rs"
            isClearable
            value={
              form.diagnosis
                ? { value: form.diagnosis, label: form.diagnosis }
                : null
            }
            options={dicts.diagnosis.map((d) => ({ value: d, label: d }))}
            placeholder="Додати/обрати..."
            noOptionsMessage={() => "Немає варіантів"}
            formatCreateLabel={(i) => `Додати: “${i}”`}
            onChange={(o) => updateField({ diagnosis: o?.value || "" })}
          />

          <label style={{ marginTop: 12 }}>Нотатки</label>
          <textarea
            rows={7}
            value={form.notes}
            onChange={(e) => updateField({ notes: e.target.value })}
          />
        </div>
      </aside>

      {/* ---------- MAIN PANEL ---------- */}
      <section className="main-panel">
        {/* tab bar */}
        <div className="tabs">
          <button
            className={tab === "video" ? "tab active" : "tab"}
            onClick={() => setTab("video")}
          >
            Відео матеріали
          </button>
          <button
            className={tab === "audio" ? "tab active" : "tab"}
            onClick={() => setTab("audio")}
          >
            Голосовий звіт
          </button>

          <span className="flex-spacer" />

          {/* back link here per request */}
          <button className="back-link" onClick={onClose}>
            ← До списку
          </button>
        </div>
        <div className="tab-body">
          {tab === "video" ? (
            <VideoGallery baseFolder={project.folder} />
          ) : (
            <AudioGallery baseFolder={project.folder} />
          )}
        </div>
      </section>
    </div>
  );
};

export default RecordDetails;

/* ---------- VideoGallery (from old modal) ---------- */
const VideoGallery: React.FC<{ baseFolder: string }> = ({ baseFolder }) => {
  const [clips, setClips] = useState<{ url: string; label: string }[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.getClips(baseFolder).then((res) => {
      const list = [
        ...res.video.map((u) => ({ url: u, label: "Відео" }))
      ];
      setClips(list);
      setActive(null);
    });
  }, [baseFolder]);

  if (!clips.length) return null;

  return (
    <div className="gallery-wrap">
      <div className="gallery-head">
        {active && (
          <button className="btn hide" onClick={() => setActive(null)}>
            Згорнути
          </button>
        )}
      </div>

      {active && (
        <div className="large-player">
          <video src={active} controls autoPlay />
        </div>
      )}

      <div className="thumb-grid">
        {clips.map(({ url, label }) => (
          <div key={url} className="thumb" onClick={() => setActive(url)}>
            <video src={url} muted preload="metadata" playsInline />
            <span className="thumb-tag">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
