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
          Live detection
        </h2>
        <div className={styles.metrics}>
          <MetricCard
            label="Status"
            value={roi?.detected ? 'Detected' : 'No face'}
            color={roi?.detected ? 'green' : 'muted'}
          />
          <MetricCard
            label="Confidence"
            value={roi?.detected ? `${Math.round((roi.confidence || 0) * 100)}` : '-'}
            unit={roi?.detected ? '%' : ''}
            color="blue"
          />
          <MetricCard label="X position" value={roi?.x != null ? roi.x.toFixed(0) : '-'} unit="px" />
          <MetricCard label="Y position" value={roi?.y != null ? roi.y.toFixed(0) : '-'} unit="px" />
          <MetricCard label="Width" value={roi?.width != null ? roi.width.toFixed(0) : '-'} unit="px" />
          <MetricCard label="Height" value={roi?.height != null ? roi.height.toFixed(0) : '-'} unit="px" />
        </div>
      </section>

      {/* ── Stream Stats ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.titleBar} />
          Stream stats
        </h2>
        <div className={styles.metrics}>
          <MetricCard label="FPS" value={stats.fps} color="yellow" />
          <MetricCard label="Frames" value={stats.frames.toLocaleString()} />
          <MetricCard label="DB records" value={total.toLocaleString()} color="blue" />
        </div>
      </section>

      {/* ── History Table ── */}
      <section className={styles.section + ' ' + styles.tableSection}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.titleBar} />
          Detection log
          <span className={styles.recordCount}>{total} total</span>
        </h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>X</th>
                <th>Y</th>
                <th>W</th>
                <th>H</th>
                <th>Conf</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    No records yet
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
