import React, { useEffect, useState } from "react";
import "./AudioGallery.css";

interface Props {
  /** patient root folder (PatientOverview passes project.folder) */
  baseFolder: string;
}

const AudioGallery: React.FC<Props> = ({ baseFolder }) => {
  const [tracks, setTracks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  /* fetch list from main */
  const load = async () => {
    setLoading(true);
    // const res = await window.electronAPI.getAudio(baseFolder);
    // setTracks(res.audio);
    setLoading(false);
  };

  useEffect(() => { load(); }, [baseFolder]);

  const handleAdd = async () => {
    // const ok = await window.electronAPI.addAudio(baseFolder);
    // if (ok) load();
  };

  return (
    <div className="audio-gallery">
      <div className="audio-head">
        <button className="btn primary" onClick={handleAdd}>
          Завантажити аудіо
        </button>
      </div>

      {loading && <p className="placeholder">Завантаження…</p>}

      {!loading && tracks.length === 0 && (
        <p className="placeholder">Аудіозаписів немає</p>
      )}

      <ul className="audio-list">
        {tracks.map((src) => {
          const name = src.split("/").pop() ?? src;
          return (
            <li key={src} className="audio-item">
              <span className="audio-name">{name}</span>
              <audio controls src={src} className="audio-player" />
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AudioGallery;
