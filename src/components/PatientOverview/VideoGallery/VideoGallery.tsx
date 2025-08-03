import React, { useEffect, useState } from "react";


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

export default VideoGallery;
