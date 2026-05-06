/**
 * Face ROI — Main App
 *
 * Layout:
 *   Header
 *   Controls bar
 *   Main grid: [VideoPanel (2/3)] | [ROIPanel (1/3)]
 *   Footer
 */

import React, { useEffect, useState } from 'react';
import { useWebcamStream } from './hooks/useWebcamStream';
import { useROIData }      from './hooks/useROIData';
import VideoPanel          from './components/VideoPanel';
import ROIPanel            from './components/ROIPanel';
import Controls            from './components/Controls';
import './App.css';

export default function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

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
  const isDark = theme === 'dark';

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <div className="logo">ROI</div>
          <div>
            <div className="title">MegaAI ROI Detection Model</div>
            <div className="subtitle">Real-time face region tracking with MediaPipe and FastAPI</div>
          </div>
        </div>
        <div className="header-right">
          <button
            type="button"
            className="theme-toggle"
            role="switch"
            aria-checked={isDark}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          >
            <span className="theme-toggle-track">
              <span className="theme-toggle-thumb" />
            </span>
            <span>{isDark ? 'Dark' : 'Light'} mode</span>
          </button>
          <div className="sys-info">
            <span>System</span>
            <span className="sys-ok">Online</span>
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
        <span>Face ROI System v1.0.0</span>
        <span>MediaPipe / FastAPI / PostgreSQL / React</span>
        <span>No OpenCV</span>
      </footer>
    </div>
  );
}
