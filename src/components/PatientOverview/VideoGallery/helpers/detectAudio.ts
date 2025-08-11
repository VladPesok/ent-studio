// helpers/detectAudio.ts

/**
 * Result of audio detection analysis
 */
export type AudioDetectResult = {
  /** Whether the media file contains an audio track */
  hasAudioTrack: boolean;
  /** Whether the audio is mostly silent (undefined if not checked or detection failed) */
  isSilent?: boolean;
};

/**
 * Convert amplitude to decibels
 */
const toDb = (x: number): number => (x > 0 ? 20 * Math.log10(x) : -Infinity);

/**
 * Check if a video element has audio tracks using browser-specific APIs
 */
function hasAudio(video: HTMLVideoElement): boolean {
  // Firefox
  if ('mozHasAudio' in video) {
    return (video as any).mozHasAudio;
  }
  
  // WebKit/Safari
  if ('webkitAudioDecodedByteCount' in video) {
    return Boolean((video as any).webkitAudioDecodedByteCount);
  }
  
  // Modern browsers with AudioTrack API
  if ('audioTracks' in video && video.audioTracks) {
    return (video.audioTracks as any).length > 0;
  }
  
  // Fallback: assume audio exists if we can't detect
  return true;
}
/**
 * Detect if a video file has audio tracks by creating a video element and checking for audio
 * @param src - The video file URL or path
 * @returns Promise that resolves to true if audio tracks are detected, false otherwise
 */
function hasVideoGotAudio(src: string): Promise<boolean> {
  const video = document.createElement('video');
  video.muted = true;
  video.crossOrigin = 'anonymous';
  video.preload = 'auto';

  return new Promise<boolean>((resolve, reject) => {
    const cleanup = () => {
      try {
        video.src = '';
        video.removeAttribute('src');
        video.load();
      } catch {}
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout waiting for video metadata'));
    }, 10000); // 10 second timeout

    video.addEventListener('error', (e) => {
      clearTimeout(timeoutId);
      cleanup();
      reject(e);
    });

    video.addEventListener(
      'canplay',
      () => {
        video.currentTime = 0.99;
      },
      { once: true } // Important because 'canplay' can be fired hundreds of times.
    );

    video.addEventListener('seeked', () => {
      clearTimeout(timeoutId);
      const result = hasAudio(video);
      cleanup();
      resolve(result);
    }, {
      once: true,
    });

    video.src = src;
  });
}

/** Await a single event with timeout */
function waitFor(el: EventTarget, event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      el.removeEventListener(event, onEvent);
      reject(new Error(`Timeout waiting for ${event}`));
    }, timeoutMs);
    const onEvent = () => { clearTimeout(t); resolve(); };
    el.addEventListener(event, onEvent, { once: true });
  });
}

/** Measure short RMS/peak window using Web Audio on an existing media element */
async function measureWindowRmsPeak(
  ac: AudioContext,
  el: HTMLMediaElement,
  listenSeconds: number
): Promise<{ rmsDb: number; peakDb: number }> {
  const src = ac.createMediaElementSource(el);
  const analyser = ac.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser); // do not connect to destination; stays silent

  const buf = new Float32Array(analyser.fftSize);
  let maxAbs = 0;
  let sumSq = 0;
  let frames = 0;

  const start = performance.now();
  await el.play().catch(() => {}); // muted anyway

  await new Promise<void>((res) => {
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      for (let i = 0; i < buf.length; i++) {
        const s = buf[i];
        const a = Math.abs(s);
        if (a > maxAbs) maxAbs = a;
        sumSq += s * s;
        frames++;
      }
      if (performance.now() - start < listenSeconds * 1000) {
        requestAnimationFrame(tick);
      } else {
        res();
      }
    };
    requestAnimationFrame(tick);
  });

  try { el.pause(); } catch {}
  try { src.disconnect(); analyser.disconnect(); } catch {}

  const rms = Math.sqrt(sumSq / Math.max(1, frames));
  return { rmsDb: toDb(rms), peakDb: toDb(maxAbs) };
}

/**
 * Scan multiple segments across the file and decide audibility.
 * Returns true only if ALL scanned segments are below thresholds (i.e., mostly silent).
 * Returns false if any segment has audible content or if analysis fails.
 */
export async function isMostlySilentByScanning(
  src: string,
  {
    segments = 5,            // how many time points to sample
    paddingSec = 1.0,        // avoid very start/end
    listenSeconds = 0.75,    // window length per segment
    rmsThresholdDb = -60,
    peakThresholdDb = -50,
    perSeekTimeoutMs = 4000,
    metadataTimeoutMs = 5000,
  }: {
    segments?: number;
    paddingSec?: number;
    listenSeconds?: number;
    rmsThresholdDb?: number;
    peakThresholdDb?: number;
    perSeekTimeoutMs?: number;
    metadataTimeoutMs?: number;
  } = {}
): Promise<boolean> {
  const el = document.createElement('audio');
  el.src = src;
  el.preload = 'auto';
  el.crossOrigin = 'anonymous';
  el.muted = true;

  const ac = new (window.AudioContext || (window as any).webkitAudioContext)();

  const cleanup = async () => {
    try { el.pause(); } catch {}
    try {
      el.src = '';
      el.removeAttribute('src');
      el.load();
    } catch {}
    try { await ac.close(); } catch {}
  };

  try {
    // Wait for duration
    await Promise.race([
      waitFor(el, 'loadedmetadata', metadataTimeoutMs),
      waitFor(el, 'error', metadataTimeoutMs).then(() => { throw new Error('metadata error'); })
    ]);

    const dur = el.duration;
    if (!isFinite(dur) || dur <= 0) {
      // Cannot scan; treat as not-silent to avoid false positives
      await cleanup();
      return false;
    }

    // Ensure we have valid parameters
    if (segments <= 0 || listenSeconds <= 0) {
      await cleanup();
      return false;
    }

    const times: number[] = [];
    const start = Math.max(0, paddingSec);
    const end = Math.max(start, dur - paddingSec);
    
    if (end <= start || dur < listenSeconds) {
      // For very short files, just check the middle
      times.push(Math.min(dur * 0.5, Math.max(0, dur - 0.1)));
    } else {
      for (let i = 0; i < segments; i++) {
        const t = start + (i / Math.max(1, segments - 1)) * (end - start);
        times.push(Math.min(Math.max(0, t), dur - 0.1));
      }
    }

    let validSegments = 0;
    let silentSegments = 0;

    for (const t of times) {
      el.currentTime = t;
      // wait until the new position is decoded enough to play
      try {
        await Promise.race([
          waitFor(el, 'seeked', perSeekTimeoutMs),
          waitFor(el, 'canplay', perSeekTimeoutMs),
          waitFor(el, 'error', perSeekTimeoutMs).then(() => { throw new Error('seek error'); })
        ]);
      } catch {
        // If seeking failed, skip this segment
        continue;
      }

      try {
        const { rmsDb, peakDb } = await measureWindowRmsPeak(ac, el, listenSeconds);
        validSegments++;

        // If this segment exceeds thresholds -> it's not silent
        if (rmsDb > rmsThresholdDb || peakDb > peakThresholdDb) {
          await cleanup();
          return false; // not silent - found audible content
        } else {
          silentSegments++;
        }
      } catch {
        // If measurement failed, skip this segment
        continue;
      }
    }

    await cleanup();
    
    // We need at least one valid segment to make a determination
    // If we couldn't analyze any segments, assume not silent (conservative approach)
    if (validSegments === 0) {
      return false;
    }
    
    // All analyzed segments were silent
    return silentSegments === validSegments;
  } catch {
    await cleanup();
    // On failure, be conservative: not silent (so you don't hide actual audio)
    return false;
  }
}

/**
 * Comprehensive audio detection and analysis for media files
 * @param src - The media file URL or path
 * @param options - Configuration options for audio detection
 * @param options.checkAudibility - Whether to analyze if audio is mostly silent (default: true)
 * @param options.segments - Number of time segments to analyze for silence detection (default: 5)
 * @param options.paddingSec - Seconds to skip at start/end of file (default: 1.0)
 * @param options.listenSeconds - Duration to analyze per segment (default: 0.75)
 * @param options.rmsThresholdDb - RMS threshold in dB for silence detection (default: -60)
 * @param options.peakThresholdDb - Peak threshold in dB for silence detection (default: -50)
 * @returns Promise resolving to AudioDetectResult with track detection and silence analysis
 */
export async function detectAudioInfo(
  src: string,
  {
    checkAudibility = true,
    // pass-through options for scanning
    segments,
    paddingSec,
    listenSeconds,
    rmsThresholdDb,
    peakThresholdDb,
  }: {
    checkAudibility?: boolean;
    segments?: number;
    paddingSec?: number;
    listenSeconds?: number;
    rmsThresholdDb?: number;
    peakThresholdDb?: number;
  } = {}
): Promise<AudioDetectResult> {
  try {
    const hasAudioTrack = await hasVideoGotAudio(src);
    
    // If no audio track detected, return early
    if (!hasAudioTrack) {
      return { hasAudioTrack: false, isSilent: undefined };
    }

    // If we don't want to check audibility, return with audio track detected but unknown silence
    if (!checkAudibility) {
      return { hasAudioTrack: true, isSilent: undefined };
    }

    // Check if the audio is mostly silent
    try {
      const isSilent = await isMostlySilentByScanning(src, {
        segments: segments ?? 5,         // default scan 5 points: start..end
        paddingSec: paddingSec ?? 1.0,   // skip first/last 1s
        listenSeconds: listenSeconds ?? 0.75,
        rmsThresholdDb: rmsThresholdDb ?? -60,
        peakThresholdDb: peakThresholdDb ?? -50,
      });

      return { hasAudioTrack: true, isSilent };
    } catch (silenceCheckError) {
      // If silence detection fails, we know there's an audio track but can't determine if it's silent
      console.warn('Failed to check audio silence:', silenceCheckError);
      return { hasAudioTrack: true, isSilent: undefined };
    }
  } catch (audioDetectionError) {
    // If audio track detection fails completely, assume no audio
    console.warn('Failed to detect audio track:', audioDetectionError);
    return { hasAudioTrack: false, isSilent: undefined };
  }
}
