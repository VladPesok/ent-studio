import React, { useEffect, useState } from "react";
import "./ProjectCard.css";
import type { Project } from "../ProjectsView";

/* ---------- helpers ---------- */
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" });

const parseFolder = (folder: string) => {
  const [surname = "", name = "", dob = ""] = folder.split("_");
  return { fullName: `${name} ${surname}`.trim(), dob };
};

/* ---------- component ---------- */
interface Extra {
  doctor: string;
  diagnosis: string;
  videoCount?: number;
  videoAudioCount?: number;
  voiceCount?: number;            // ← new
}

const ProjectCard: React.FC<{ project: Project; onClick: () => void }> = ({ project, onClick }) => {
  const { fullName, dob } = parseFolder(project.folder);
  const [extra, setExtra] = useState<Extra>({ doctor: "", diagnosis: "" });

  /* fetch patient config + live counts */
  useEffect(() => {
    (async () => {
      const [pat, counts] = await Promise.all([
        window.electronAPI.getPatient(project.folder),
        window.electronAPI.getCounts(project.folder),
      ]);
      setExtra({
        ...pat,
        ...counts,
        voiceCount: Array.isArray(pat.voiceReport) ? pat.voiceReport.length : 0,
      });

    })();
  }, [project.folder]);

  return (
    <article className="card" onClick={onClick}>
      <header className="card__title">{fullName}</header>

      <p className="card__line">Дата народження: <span>{fmt(dob)}</span></p>
      <p className="card__line">Дата обстеження: <span>{fmt(project.date)}</span></p>
      <p className="card__line">Лікар: <span>{extra.doctor || "—"}</span></p>
      <p className="card__line">Діагноз: <span>{extra.diagnosis || "—"}</span></p>

      <p className="card__tiny">
        Відео: {extra.videoCount ?? "—"} &nbsp;|&nbsp;
        Відео+Аудіо: {extra.videoAudioCount ?? "—"}
      </p>
      
      {extra.voiceCount ? (
        <p className="card__badge">
          📑 Звіт(и): {extra.voiceCount}
        </p>
      ) : null}

    </article>
  );
};

export default ProjectCard;
