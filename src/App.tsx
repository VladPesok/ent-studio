import React, { useEffect, useState } from "react";
import "./App.css";
import { scanUsb, getLocal, Project } from "./helpers/scanUsb";
import ProjectsView from "./components/ProjectView/ProjectsView";


/* ───────────── Main component ───────────── */
const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scanning, setScanning] = useState(false);

    
  useEffect(() => {
    (async () => {
      const existing = await getLocal();
      setProjects(existing);
    })();
  }, []);

  return (
    <div className="app-container">
      {/* Top bar */}
      <header className="top-bar">
        <h1>ENT Video Ingest</h1>
        <button
          className="scan-btn"
          disabled={scanning}
          onClick={async () => {
            setScanning(true);
            try {
              const newProjects = await scanUsb();
              if(newProjects.length){
                setProjects([...projects, ...newProjects]);
              }
            } finally {
              setScanning(false)
            }
          }}
        >
          Scan USB / Folder
        </button>
      </header>

      {/* Project list */}
      <main className="content">
        <ProjectsView projects={projects}/>
      </main>
    </div>
  );
};

export default App;
