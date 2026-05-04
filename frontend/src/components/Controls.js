import React from 'react';
import styles from './Controls.module.css';

export default function Controls({
  isStreaming,
  isConnected,
  error,
  onStart,
  onStop,
}) {
  return (
    <div className={styles.bar}>
      {/* Status indicators */}
      <div className={styles.indicators}>
        <div className={styles.indicator}>
          <span
            className={styles.led}
            data-on={isStreaming ? 'true' : 'false'}
            data-color="green"
          />
          <span>CAMERA</span>
        </div>
        <div className={styles.indicator}>
          <span
            className={styles.led}
            data-on={isConnected ? 'true' : 'false'}
            data-color="blue"
          />
          <span>WEBSOCKET</span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠</span>
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className={styles.buttons}>
        {!isStreaming ? (
          <button className={styles.btn} data-variant="start" onClick={onStart}>
            ▶ INITIALIZE STREAM
          </button>
        ) : (
          <button className={styles.btn} data-variant="stop" onClick={onStop}>
            ■ TERMINATE STREAM
          </button>
        )}
      </div>
    </div>
  );
}
