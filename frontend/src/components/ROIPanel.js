/**
 * ROIPanel — displays live ROI metrics and detection history table.
 */

import React from 'react';
import styles from './ROIPanel.module.css';

function MetricCard({ label, value, unit, color }) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} data-color={color}>
        {value}
        {unit && <span className={styles.metricUnit}>{unit}</span>}
      </div>
    </div>
  );
}

export default function ROIPanel({ roi, stats, records, total }) {
  return (
    <div className={styles.container}>

      {/* ── Live ROI Readout ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.titleDot} data-active={roi?.detected} />
          LIVE DETECTION
        </h2>
        <div className={styles.metrics}>
          <MetricCard
            label="STATUS"
            value={roi?.detected ? 'DETECTED' : 'NO FACE'}
            color={roi?.detected ? 'green' : 'muted'}
          />
          <MetricCard
            label="CONFIDENCE"
            value={roi?.detected ? `${Math.round((roi.confidence || 0) * 100)}` : '—'}
            unit={roi?.detected ? '%' : ''}
            color="blue"
          />
          <MetricCard label="X" value={roi?.x != null ? roi.x.toFixed(0) : '—'} unit="px" />
          <MetricCard label="Y" value={roi?.y != null ? roi.y.toFixed(0) : '—'} unit="px" />
          <MetricCard label="W" value={roi?.width != null ? roi.width.toFixed(0) : '—'} unit="px" />
          <MetricCard label="H" value={roi?.height != null ? roi.height.toFixed(0) : '—'} unit="px" />
        </div>
      </section>

      {/* ── Stream Stats ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.titleBar} />
          STREAM STATS
        </h2>
        <div className={styles.metrics}>
          <MetricCard label="FPS" value={stats.fps} color="yellow" />
          <MetricCard label="FRAMES" value={stats.frames.toLocaleString()} />
          <MetricCard label="DB RECORDS" value={total.toLocaleString()} color="blue" />
        </div>
      </section>

      {/* ── History Table ── */}
      <section className={styles.section + ' ' + styles.tableSection}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.titleBar} />
          DETECTION LOG
          <span className={styles.recordCount}>{total} total</span>
        </h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>TIME</th>
                <th>X</th>
                <th>Y</th>
                <th>W</th>
                <th>H</th>
                <th>CONF</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    — NO RECORDS —
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className={styles.dataRow}>
                    <td>{new Date(r.timestamp).toLocaleTimeString()}</td>
                    <td>{r.x.toFixed(0)}</td>
                    <td>{r.y.toFixed(0)}</td>
                    <td>{r.width.toFixed(0)}</td>
                    <td>{r.height.toFixed(0)}</td>
                    <td className={styles.confCell}>
                      {Math.round((r.confidence || 0) * 100)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
