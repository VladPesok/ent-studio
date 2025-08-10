import React, { useEffect, useState, useCallback, useRef } from "react";
import { Button, Space } from "antd";
import { PlusOutlined, FolderOpenOutlined } from "@ant-design/icons";
import "./VideoGallery.css";
import { detectAudioInfo } from "./helpers/detectAudio";

interface VideoClip {
  url: string;
  fileName: string;
  fileType: string;
  hasAudio: boolean;
  isSilent?: boolean;        // NEW: will be set by detectAudioInfo
  size: number;
  modified: Date;
  extension: string;
}

interface VideoGalleryProps {
  baseFolder: string;
  currentAppointment?: string;
}

const ITEMS_PER_PAGE = 12;

// ---- tiny concurrency limiter so we don't spin up too many decoders at once
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let idx = 0;

  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await mapper(items[i], i);
    }
  });

  await Promise.all(workers);
  return results;
}

const VideoGallery: React.FC<VideoGalleryProps> = ({ baseFolder, currentAppointment }) => {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [active, setActive] = useState<VideoClip | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const loadTokenRef = useRef(0);    // cancels stale async work
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getLabel = (clip: VideoClip): string => {
    if (clip.hasAudio) {
      if (clip.isSilent === true) return "Відео";
      if (clip.isSilent === false) return "Відео + Аудіо";
      return "Відео + Аудіо (?)";
    }
    return "Відео";
  };

  const getDuration = (element: HTMLVideoElement | HTMLAudioElement): string => {
    if (!element.duration || isNaN(element.duration)) return "";
    const minutes = Math.floor(element.duration / 60);
    const seconds = Math.floor(element.duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (isFullscreen) setIsFullscreen(false);
      else if (active) setActive(null);
    }
  }, [isFullscreen, active]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const shouldAnalyze = (clip: VideoClip) => {
    const ext = clip.extension?.toLowerCase();
    // Analyze common container types only
    return [".mp4", ".mov", ".m4v", ".avi", ".webm", ".mkv"].includes(ext);
  };

  const loadClips = useCallback(async (reset = false) => {
    const loadToken = ++loadTokenRef.current;

    if (reset) {
      setLoading(true);
      setLoadingMore(false);
    } else {
      setLoading(false);
      setLoadingMore(true);
    }

    try {
      const currentOffset = reset ? 0 : offset;

      // Fetch page from backend
      const res = await window.electronAPI.getClipsDetailed(
        baseFolder,
        currentOffset,
        ITEMS_PER_PAGE
      );

      if (!isMountedRef.current || loadToken !== loadTokenRef.current) return;

      const pageClips: VideoClip[] = res.clips;

      // Analyze audio per file with small concurrency
      const analyzed = await mapWithConcurrency(pageClips, 3, async (clip) => {
        if (!shouldAnalyze(clip)) {
          return clip;
        }

        try {
          // const { hasAudioTrack, isSilent } = await detectAudioInfo(clip.url, {
          //   // Multi-segment scan parameters:
          //   checkAudibility: true,
          //   segments: 5,          // evenly spaced across the duration
          //   paddingSec: 1.0,      // skip first/last second (often quiet)
          //   listenSeconds: 0.75,  // ~0.75s per segment
          //   rmsThresholdDb: -60,
          //   peakThresholdDb: -50,
          // });

          return { ...clip, hasAudio: true, isSilent: true };
        } catch {
          // If detection fails, keep original flags from backend
          return clip;
        }
      });

      if (!isMountedRef.current || loadToken !== loadTokenRef.current) return;

      if (reset) {
        setClips(analyzed);
        setOffset(ITEMS_PER_PAGE);
      } else {
        setClips((prev) => [...prev, ...analyzed]);
        setOffset((prev) => prev + ITEMS_PER_PAGE);
      }

      setHasMore(res.hasMore);
      setTotal(res.total);
    } catch (error) {
      console.error("Failed to load clips:", error);
    } finally {
      if (!isMountedRef.current || loadToken !== loadTokenRef.current) return;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [baseFolder, offset]);

  useEffect(() => {
    loadClips(true);
  }, [baseFolder]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) loadClips(false);
  };

  const handleLoadMoreVideos = async () => {
    try {
      const result = await window.electronAPI.loadMoreVideos(baseFolder);
      if (result.success && result.count > 0) {
        loadClips(true);
      }
    } catch (error) {
      console.error("Failed to load more videos:", error);
    }
  };

  const handleOpenVideoFolder = async () => {
    try {
      if (currentAppointment) {
        await window.electronAPI.openPatientFolderInFs(`${baseFolder}/${currentAppointment}/video`);
      } else {
        // Fallback to base folder if no current appointment
        await window.electronAPI.openPatientFolderInFs(baseFolder);
      }
    } catch (error) {
      console.error("Failed to open video folder:", error);
    }
  };

  if (loading && clips.length === 0) {
    return (
      <div className="gallery-wrap">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Завантаження відео...</p>
        </div>
      </div>
    );
  }

  if (!loading && clips.length === 0) {
    return (
      <div className="gallery-wrap">
        <div className="empty-state">
          <div className="empty-icon">🎬</div>
          <h3>Немає відео файлів</h3>
          <p>Додайте відео файли до цього прийому</p>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleLoadMoreVideos}
            >
              Додати відео файли
            </Button>
            <Button 
              icon={<FolderOpenOutlined />} 
              onClick={handleOpenVideoFolder}
            >
              Відкрити папку
            </Button>
          </Space>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-wrap">
      <div className="gallery-header">
        <div className="gallery-info">
          <h3>Відео матеріали ({total})</h3>
        </div>
        <div className="gallery-actions">
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleLoadMoreVideos}
            >
              Додати файли
            </Button>
            <Button 
              icon={<FolderOpenOutlined />} 
              onClick={handleOpenVideoFolder}
            >
              Відкрити папку
            </Button>
          </Space>
        </div>
      </div>

      {active && (
        <div className={`media-player ${isFullscreen ? "fullscreen" : ""}`}>
          <div className="player-header">
            <div className="player-info">
              <h4>{active.fileName}</h4>
              <span className="file-details">
                {getLabel(active)} • {formatFileSize(active.size)}
              </span>
            </div>
            <div className="player-controls">
              <button className="btn-icon" onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? "⤓" : "⤢"}
              </button>
              <button className="btn-icon" onClick={() => setActive(null)}>
                ✕
              </button>
            </div>
          </div>
          <div className="player-content">
            <video src={active.url} controls autoPlay className="video-player" />
          </div>
        </div>
      )}

      <div className="video-grid">
        {clips.map((clip) => (
          <div
            key={clip.url}
            className="video-card"
            onClick={() => setActive(clip)}
          >
            <div className="video-thumbnail">
              <video
                src={clip.url}
                muted
                preload="metadata"
                playsInline
                onLoadedMetadata={(e) => {
                  const duration = getDuration(e.currentTarget);
                  if (duration) {
                    const durationEl = e.currentTarget.parentElement?.querySelector(".duration");
                    if (durationEl) durationEl.textContent = duration;
                  }
                }}
              />
              <div className="video-overlay">
                <div className="play-button">▶</div>
              </div>
              <div className="video-badges">
                <span className="file-type-badge">{getLabel(clip)}</span>
                <span className="duration"></span>
              </div>
            </div>
            <div className="video-info">
              <h4 className="video-title" title={clip.fileName}>
                {clip.fileName}
              </h4>
              <div className="video-meta">
                <span className="file-size">{formatFileSize(clip.size)}</span>
                <span className="file-ext">{clip.extension.toUpperCase()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="load-more-section">
          <button
            className="btn-load-more"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <div className="loading-spinner small"></div>
                Завантаження...
              </>
            ) : (
              `Завантажити ще (${total - clips.length} залишилось)`
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoGallery;
