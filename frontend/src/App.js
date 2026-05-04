/**
 * Face ROI Detection System — Main App
 *
 * Layout:
 *   Header
 *   Controls bar
 *   Main grid: [VideoPanel (2/3)] | [ROIPanel (1/3)]
 *   Footer
 */

import React from 'react';
import { useWebcamStream } from './hooks/useWebcamStream';
import { useROIData }      from './hooks/useROIData';
import VideoPanel          from './components/VideoPanel';
import ROIPanel            from './components/ROIPanel';
import Controls            from './components/Controls';
import './App.css';

export default function App() {
  const {
    videoRef,
    canvasRef,
    isStreaming,
    isConnected,
    error,
    roi,
    stats,
    startStreaming,
    stopStreaming,
  } = useWebcamStream();

  const { records, total } = useROIData(true);

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <div className="logo">◈</div>
          <div>
            <div className="title">FACE ROI DETECTION</div>
            <div className="subtitle">REAL-TIME NEURAL PIPELINE // MEDIAPIPE + FASTAPI</div>
          </div>
        </div>
        <div className="header-right">
          <div className="sys-info">
            <span>SYS</span>
            <span className="sys-ok">ONLINE</span>
          </div>
        </div>
      </header>

      {/* ── Controls ── */}
      <div className="controls-row">
        <Controls
          isStreaming={isStreaming}
          isConnected={isConnected}
          error={error}
          onStart={startStreaming}
          onStop={stopStreaming}
        />
      </div>

      {/* ── Main content grid ── */}
      <main className="main-grid">
        <div className="video-col">
          <VideoPanel
            videoRef={videoRef}
            canvasRef={canvasRef}
            isStreaming={isStreaming}
            roi={roi}
          />
        </div>
        <div className="roi-col">
          <ROIPanel
            roi={roi}
            stats={stats}
            records={records}
            total={total}
          />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        <span>FACE-ROI-SYSTEM v1.0.0</span>
        <span>MEDIAPIPE · FASTAPI · POSTGRESQL · REACT</span>
        <span>NO OPENCV</span>
      </footer>
    </div>
  );
}
