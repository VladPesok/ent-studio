/****************************************************************
 * ProjectsView.tsx – search-bar + sort by recording-date (DESC) *
 ****************************************************************/
import React, { useMemo, useState } from "react";
import "./ProjectsView.css";
import ProjectCard from "./ProjectCard/ProjectCard";
import { ProjectModal } from "./ProjectModal/ProjectModal";

export interface Project {
  folder: string;  // Пупкін_Іван_1970-01-01_2025-06-30
  date:   string;  // 2025-06-30
}

interface Props { projects: Project[]; }

const ProjectsView: React.FC<Props> = ({ projects }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery]          = useState("");

  /* bump cards when a modal saves */
  const bump = () => setRefreshKey((k) => k + 1);

  /* ---------- derived list: sort + search ---------- */
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return projects
      .filter((p) => {
        if (!term) return true;
        const [surname = "", name = ""] = p.folder.split("_");
        return (
          surname.toLowerCase().includes(term) ||
          name.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1)); // DESC by date
  }, [projects, query]);

  if (!projects.length)
    return <p className="empty-msg">Поки немає доданих пацієнтів</p>;

  return (
    <>
      <div className="title-row">
        <h2>Пацієнти</h2>
        <input
          className="search-input"
          placeholder="Пошук за іменем/прізвищем…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="card-grid">
        {filtered.length === 0 ? (
          <p className="empty-msg">Нічого не знайдено</p>
        ) : (
          filtered.map((proj) => (
            <ProjectCard
              key={`${proj.folder}-${refreshKey}`}
              project={proj}
              onClick={() =>
                setActiveIdx(projects.findIndex((p) => p.folder === proj.folder))
              }
            />
          ))
        )}
      </div>

      {activeIdx !== null && (
        <ProjectModal
          project={projects[activeIdx]}
          onClose={() => setActiveIdx(null)}
          onSaved={bump}
        />
      )}
    </>
  );
};

export default ProjectsView;
