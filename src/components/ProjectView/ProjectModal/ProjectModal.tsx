import React, { useEffect, useState } from "react";
import CreatableSelect from "react-select/creatable";
import "./ProjectModal.css";
import type { Project } from "../ProjectsView";

interface Props {
  project: Project;
  onClose: () => void;
  onSaved: () => void;
}

/* helpers ------------------------------------------------------*/
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" });

const parse = (folder: string) => {
  const [surname = "", name = "", dob = ""] = folder.split("_");
  return { surname, name, dob };
};

export const ProjectModal: React.FC<Props> = ({ project, onClose, onSaved }) => {
  const { surname, name, dob } = parse(project.folder);

  /* dicts */
  const [dicts, setDicts] = useState<{ doctors: string[]; diagnosis: string[] }>({ doctors: [], diagnosis: [] });

  /* single form object incl. voiceReport */
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
  }>({ doctor: "", diagnosis: "", notes: "", voiceReport: [] });

  const [initialHash, setInitialHash] = useState("");

  /* ---------------- initial load ---------------- */
  useEffect(() => {
    (async () => {
      const [dictionaries, patient] = await Promise.all([
        window.electronAPI.getDictionaries(),
        window.electronAPI.getPatient(project.folder),
      ]);

      setDicts(dictionaries);
      const loadedForm = {
        doctor:       patient.doctor ?? "",
        diagnosis:    patient.diagnosis ?? "",
        notes:        patient.notes ?? "",
        voiceReport:  Array.isArray(patient.voiceReport) ? patient.voiceReport : [],
      };
      setForm(loadedForm);
      setInitialHash(JSON.stringify(loadedForm));
    })();
  }, [project.folder]);

  /* -------------- dirty flag -------------- */
  const dirty = initialHash && JSON.stringify(form) !== initialHash;

  /* -------------- save -------------- */
  const save = async () => {
    await window.electronAPI.setPatient(project.folder, form);

    if (form.doctor && !dicts.doctors.includes(form.doctor))
      await window.electronAPI.addDictionaryEntry("doctors", form.doctor);
    if (form.diagnosis && !dicts.diagnosis.includes(form.diagnosis))
      await window.electronAPI.addDictionaryEntry("diagnosis", form.diagnosis);

    setInitialHash(JSON.stringify(form)); // reset dirty
    onSaved();                             // refresh cards list
  };

  /* -------------- ui -------------- */
  const overlayClick = () => !dirty && onClose();

  /* helper to mark dirty on inner updates */
  const updateField = (patch: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  return (
    <div className="modal-overlay" onClick={overlayClick}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="modal-header">
          <h2 className="patient-title">{name} {surname}</h2>
          <div className="modal-actions">
            {dirty && <button className="btn save" onClick={save}>Зберегти</button>}
            <button className="btn cancel" onClick={onClose}>Закрити</button>
          </div>
        </div>

        <p className="patient-meta">
          Дата народження: {fmt(dob)}<br />
          Дата обстеження: {fmt(project.date)}
        </p>

        <div className="form-grid">
          <div className="field">
            <label>Лікар</label>
            <CreatableSelect
              classNamePrefix="rs"
              isClearable
              value={form.doctor ? { value: form.doctor, label: form.doctor } : null}
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
              value={form.diagnosis ? { value: form.diagnosis, label: form.diagnosis } : null}
              options={dicts.diagnosis.map((d) => ({ value: d, label: d }))}
              placeholder="Додати/обрати..."
              noOptionsMessage={() => "Немає варіантів"}
              formatCreateLabel={(i) => `Додати: “${i}”`}
              onChange={(o) => updateField({ diagnosis: o?.value || "" })}
            />
          </div>

          <div className="field">
            <label>Нотатки</label>
            <textarea
              rows={7}
              value={form.notes}
              onChange={(e) => updateField({ notes: e.target.value })}
            />
          </div>
        </div>

        <div className="modal-block">
          <div className="gallery-head">
            <span className="gallery-title">Голосовий звіт</span>
            <button
              className="btn hide"
              onClick={async () => {
                const res = await window.electronAPI.addVoiceReport(project.folder);
                if (!res.ok) {
                  if (res.reason === "invalid") alert("Файл не містить потрібних показників!");
                  return;
                }
                const nextForm = { ...form, voiceReport: res.report };
                setForm(nextForm);
                setInitialHash(JSON.stringify(nextForm));
                onSaved();
              }}
            >
              Додати звіт
            </button>
          </div>
            <table className="voice-table">
              <colgroup>
                {[...Array(5)].map((_, idx) => (
                  <col key={idx} style={{ width: '18%' }} />
                ))}
                <col style={{ width: '10%' }} />
              </colgroup>

              <thead>
                <tr>
                  <th>ЧМФ</th>
                  <th>ЧОТ&nbsp;(Hz)</th>
                  <th>Jitter&nbsp;(%)</th>
                  <th>Shimmer&nbsp;(%)</th>
                  <th>СГШ&nbsp;(dB)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                 {form.voiceReport.length === 0 && (
                  <tr className="vt-empty">
                    <td colSpan={6} className="vt-empty-msg">
                      Для даної картки звіти відсутні
                    </td>
                  </tr>
                )}

                {form.voiceReport.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        type="number"
                        value={r.length ?? ''}
                        placeholder="—"
                        onChange={(e) => {
                          const v = e.target.value ? Number(e.target.value) : null;
                          updateField({
                            voiceReport: form.voiceReport.map((row, idx) =>
                              idx === i ? { ...row, length: v } : row
                            ),
                          });
                        }}
                      />
                    </td>
                    <td>{r.medianPitch}</td>
                    <td>{r.jitter}</td>
                    <td>{r.shimmer}</td>
                    <td>{r.ratio}</td>
                    <td className="vt-action">
                      <button
                        className="vt-open"
                        title="Відкрити файл"
                        onClick={() =>
                          window.electronAPI.openVoiceDoc(project.folder, r.file)
                        }
                      >
                        📂
                      </button>
                      <button
                        className="vt-del"
                        title="Видалити звіт"
                        onClick={async () => {
                          const list = await window.electronAPI.deleteVoiceDoc(project.folder, r.file);
                          const nextForm = { ...form, voiceReport: list };
                          setForm(nextForm);
                          setInitialHash(JSON.stringify(nextForm));
                          onSaved();
                        }}
                      >🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

        </div>

        <VideoGallery baseFolder={project.folder} />
      </div>
    </div>
  );
};

const VideoGallery: React.FC<{ baseFolder: string }> = ({ baseFolder }) => {
  const [clips,  setClips]  = useState<{ url: string; label: string }[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.getClips(baseFolder).then((res) => {
      const list = [
        ...res.video.map((u)      => ({ url: u, label: "Відео" })),
        ...res.videoAudio.map((u) => ({ url: u, label: "Відео+Аудіо" })),
      ];
      setClips(list);
      setActive(null);
    });
  }, [baseFolder]);

  if (!clips.length) return null;

  return (
    <div className="modal-block">
      <div className="gallery-head">
        <span className="gallery-title">Відео матеріали</span>

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
