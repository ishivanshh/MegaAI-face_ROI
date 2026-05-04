/**
 * useROIData — custom hook
 *
 * Periodically polls GET /roi-data to fetch stored ROI records from the DB.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const POLL_INTERVAL_MS = 3000; // Poll every 3 seconds

export function useROIData(autoFetch = true) {
  const [records, setRecords]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const timerRef                = useRef(null);

  const fetchROIData = useCallback(async (limit = 20) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/roi-data?limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecords(data.records || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoFetch) return;
    fetchROIData();
    timerRef.current = setInterval(() => fetchROIData(), POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [autoFetch, fetchROIData]);

  return { records, total, loading, error, refetch: fetchROIData };
}
