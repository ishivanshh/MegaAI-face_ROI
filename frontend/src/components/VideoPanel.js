/**
 * VideoPanel — dual video display:
 *  - Left:  Raw webcam preview (local, no latency)
 *  - Right: Processed MJPEG feed from backend with bounding boxes drawn server-side
 *
 * Also renders a canvas overlay on the raw webcam feed showing
 * the live ROI data received via WebSocket (client-side overlay).
 */

import React, { useRef, useEffect } from 'react';
import styles from './VideoPanel.module.css';

const MJPEG_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/video-feed`
  : 'http://localhost:8000/video-feed';

/**
 * Draw ROI overlay on the canvas element positioned over the webcam feed.
 */
function drawROIOverlay(canvas, video, roi) {
  if (!canvas || !video) return;

  const { videoWidth: vw, videoHeight: vh } = video;
  if (!vw || !vh) return;

  // Match canvas display dimensions to video element
  canvas.width  = vw;
  canvas.height = vh;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, vw, vh);

  if (!roi || !roi.detected) return;

  const { x, y, width, height, confidence } = roi;

  // Outer glow effect
  ctx.shadowColor = '#00ff7f';
  ctx.shadowBlur  = 18;

  // Bounding box
  ctx.strokeStyle = '#00ff7f';
  ctx.lineWidth   = 2.5;
  ctx.strokeRect(x, y, width, height);

  // Corner accents
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 3;
  const cl = Math.min(22, width * 0.15);
  const corners = [
    [[x, y + cl], [x, y], [x + cl, y]],
    [[x + width - cl, y], [x + width, y], [x + width, y + cl]],
    [[x, y + height - cl], [x, y + height], [x + cl, y + height]],
    [[x + width - cl, y + height], [x + width, y + height], [x + width, y + height - cl]],
  ];
  corners.forEach((pts) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.stroke();
  });

  // Label
  const label = `FACE  ${Math.round(confidence * 100)}%`;
  const fontSize = Math.max(11, Math.round(width * 0.07));
  ctx.font = `bold ${fontSize}px 'Share Tech Mono', monospace`;
  const textW = ctx.measureText(label).width;
  const lx = x;
  const ly = y - fontSize - 6;

  // Label background
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(lx - 3, ly - 2, textW + 8, fontSize + 6);

  // Label text
  ctx.fillStyle   = '#00ff7f';
  ctx.shadowColor = '#00ff7f';
  ctx.shadowBlur  = 6;
  ctx.fillText(label, lx + 1, ly + fontSize - 2);
  ctx.shadowBlur = 0;
}

export default function VideoPanel({ videoRef, canvasRef, isStreaming, roi }) {
  const overlayRef = useRef(null);

  // Re-draw overlay whenever ROI updates
  useEffect(() => {
    drawROIOverlay(overlayRef.current, videoRef.current, roi);
  }, [roi, videoRef]);

  return (
    <div className={styles.panels}>
      {/* ── Left: Local webcam preview with canvas overlay ── */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.dot} data-active={isStreaming} />
          <span className={styles.label}>LOCAL INPUT</span>
          <span className={styles.badge}>RAW</span>
        </div>
        <div className={styles.videoWrapper}>
          <video
            ref={videoRef}
            muted
            playsInline
            className={styles.video}
          />
          {/* Client-side ROI canvas overlay */}
          <canvas
            ref={overlayRef}
            className={styles.overlay}
          />
          {!isStreaming && (
            <div className={styles.placeholder}>
              <div className={styles.placeholderIcon}>◈</div>
              <div>CAMERA OFFLINE</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Processed MJPEG from backend ── */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.dot} data-active={isStreaming} data-color="blue" />
          <span className={styles.label}>PROCESSED OUTPUT</span>
          <span className={styles.badge} data-color="blue">MJPEG</span>
        </div>
        <div className={styles.videoWrapper}>
          {isStreaming ? (
            <img
              src={MJPEG_URL}
              alt="Processed video feed with face ROI"
              className={styles.video}
            />
          ) : (
            <div className={styles.placeholder}>
              <div className={styles.placeholderIcon}>◈</div>
              <div>AWAITING STREAM</div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for frame capture (no display) */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
