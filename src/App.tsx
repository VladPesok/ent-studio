import React, { useEffect, useState } from "react";
import "./App.css";
import { scanUsb, getLocal, Project } from "./helpers/scanUsb";
import ProjectsView from "./components/ProjectView/ProjectsView";
import { ConfigProvider } from "antd";


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
    <ConfigProvider
      theme={{ token: { colorPrimary: "#2563eb" /* Tailwind indigo‑600 */ } }}
    >
      <div className="app-container">
        {/* Top bar */}
        <header className="top-bar">
          <h1>ENT Video Ingest</h1>
        </header>

        {/* Project list */}
        <main className="content">
          <ProjectsView projects={projects}/>
        </main>
      </div>
    </ConfigProvider>
  );
};

export default App;
