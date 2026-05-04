/**
 * useWebcamStream — custom hook
 *
 * Manages the full lifecycle of:
 *  1. Accessing the user's webcam (getUserMedia)
 *  2. Capturing frames at a target FPS via canvas
 *  3. Sending frames over a WebSocket to the backend /stream endpoint
 *  4. Receiving ROI metadata back from the backend
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/stream';
const TARGET_FPS = 15; // Frames per second to send
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
const JPEG_QUALITY = 0.7; // Canvas toBlob quality [0–1]

/**
 * @typedef {Object} ROIData
 * @property {boolean} detected
 * @property {string}  frame_id
 * @property {number}  x
 * @property {number}  y
 * @property {number}  width
 * @property {number}  height
 * @property {number}  confidence
 * @property {string}  timestamp
 */

export function useWebcamStream() {
  const [isStreaming, setIsStreaming]   = useState(false);
  const [isConnected, setIsConnected]  = useState(false);
  const [error, setError]              = useState(null);
  const [roi, setRoi]                  = useState(null);   // Latest ROI data
  const [stats, setStats]              = useState({ fps: 0, frames: 0 });

  const videoRef        = useRef(null);   // <video> element for webcam preview
  const canvasRef       = useRef(null);   // Off-screen canvas for frame capture
  const wsRef           = useRef(null);   // WebSocket instance
  const streamRef       = useRef(null);   // MediaStream instance
  const frameTimerRef   = useRef(null);   // setInterval for frame capture
  const fpsCounterRef   = useRef({ count: 0, last: Date.now() });

  /**
   * Connect the WebSocket to the backend /stream endpoint.
   */
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('[WS] Connected to', WS_URL);
      setIsConnected(true);
      setError(null);
    };

    ws.onclose = (ev) => {
      console.warn('[WS] Disconnected', ev.code, ev.reason);
      setIsConnected(false);
      setRoi(null);
    };

    ws.onerror = (ev) => {
      console.error('[WS] Error', ev);
      setError('WebSocket connection failed. Is the backend running?');
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'roi') {
          setRoi(data.detected ? data : null);
        }
      } catch (e) {
        // ignore non-JSON messages
      }
    };

    wsRef.current = ws;
  }, []);

  /**
   * Request webcam access and populate the <video> element.
   */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:  { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      return true;
    } catch (err) {
      console.error('[Camera]', err);
      setError(`Camera access denied: ${err.message}`);
      return false;
    }
  }, []);

  /**
   * Capture a single frame from the webcam and send it via WebSocket.
   */
  const captureAndSend = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const ws     = wsRef.current;

    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (video.readyState < 2) return; // Not ready

    const { videoWidth: w, videoHeight: h } = video;
    if (!w || !h) return;

    canvas.width  = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);

    // Encode as JPEG blob and send as binary
    canvas.toBlob(
      (blob) => {
        if (!blob || ws.readyState !== WebSocket.OPEN) return;
        blob.arrayBuffer().then((buf) => {
          ws.send(buf);

          // Update FPS stats
          const counter = fpsCounterRef.current;
          counter.count += 1;
          const now = Date.now();
          if (now - counter.last >= 1000) {
            setStats((prev) => ({
              fps:    counter.count,
              frames: prev.frames + counter.count,
            }));
            counter.count = 0;
            counter.last  = now;
          }
        });
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  }, []);

  /**
   * Start streaming: open camera, connect WS, begin frame capture loop.
   */
  const startStreaming = useCallback(async () => {
    setError(null);
    const ok = await startCamera();
    if (!ok) return;
    connectWs();

    // Give WebSocket a moment to open before frame capture begins
    await new Promise((r) => setTimeout(r, 300));

    frameTimerRef.current = setInterval(captureAndSend, FRAME_INTERVAL_MS);
    setIsStreaming(true);
  }, [startCamera, connectWs, captureAndSend]);

  /**
   * Stop streaming: clear interval, close WS, stop media tracks.
   */
  const stopStreaming = useCallback(() => {
    clearInterval(frameTimerRef.current);

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setIsConnected(false);
    setRoi(null);
    setStats({ fps: 0, frames: 0 });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    videoRef,
    canvasRef,
    isStreaming,
    isConnected,
    error,
    roi,
    stats,
    startStreaming,
    stopStreaming,
  };
}
