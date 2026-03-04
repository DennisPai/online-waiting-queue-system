import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  ToggleButton, ToggleButtonGroup, Divider, IconButton, Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon,
  RestoreFromTrash as RestoreIcon,
  FilterAlt as FilterIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';
import { store } from '../../redux/store';

// 使用 config/api.js 的 ADMIN endpoint（含正確的 backend URL）
const ADMIN_API = API_ENDPOINTS.ADMIN;

// 每次呼叫都從 Redux store 取最新 token，避免 closure 陷阱
function getAuthHeaders() {
  const token = store.getState().auth?.token || localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

function formatDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
}

// ── 最近 10 筆操作快照 ──
function SnapshotSection() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState({ open: false, snapshot: null });
  const [confirmToken, setConfirmToken] = useState('');
  const [restoreMsg, setRestoreMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API}/backups?limit=10`, { headers: getAuthHeaders() });
      setSnapshots(res.data.data?.snapshots || []);
    } catch {
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const handleRestore = async () => {
    try {
      const res = await axios.post(
        `${ADMIN_API}/backups/${restoreDialog.snapshot._id}/restore`,
        { confirmToken },
        { headers: getAuthHeaders() }
      );
      setRestoreMsg({ type: 'success', text: res.data.message || '恢復成功' });
    } catch (err) {
      setRestoreMsg({ type: 'error', text: err.response?.data?.message || '恢復失敗' });
    } finally {
      setRestoreDialog({ open: false, snapshot: null });
      setConfirmToken('');
    }
  };

  const opColor = (op) => {
    if (op === 'end-session') return 'error';
    if (op?.includes('delete')) return 'warning';
    return 'default';
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <Typography variant="h6">操作快照備份</Typography>
        <Tooltip title="重新整理"><IconButton size="small" onClick={load}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
      </Box>
      {restoreMsg && <Alert severity={restoreMsg.type} sx={{ mb: 2 }} onClose={() => setRestoreMsg(null)}>{restoreMsg.text}</Alert>}
      {loading ? <CircularProgress size={24} /> : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>時間</TableCell>
                <TableCell>操作</TableCell>
                <TableCell>資料集</TableCell>
                <TableCell>文件 ID</TableCell>
                <TableCell align="center">恢復</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {snapshots.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">尚無快照記錄</TableCell></TableRow>
              ) : snapshots.map((s) => (
                <TableRow key={s._id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(s.timestamp)}</TableCell>
                  <TableCell><Chip label={s.operation} size="small" color={opColor(s.operation)} /></TableCell>
                  <TableCell>{s.collection}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{s.documentId || '（批次）'}</TableCell>
                  <TableCell align="center">
                    {s.operation === 'end-session' || Array.isArray(s.beforeData) ? (
                      <Chip label="不支援" size="small" variant="outlined" />
                    ) : (
                      <Button size="small" startIcon={<RestoreIcon />}
                        onClick={() => { setRestoreDialog({ open: true, snapshot: s }); setConfirmToken(''); }}>
                        恢復
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 恢復確認 Dialog */}
      <Dialog open={restoreDialog.open} onClose={() => setRestoreDialog({ open: false, snapshot: null })}>
        <DialogTitle>確認恢復資料</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            此操作將覆蓋現有資料，請確認後再執行！
          </Alert>
          <Typography variant="body2" sx={{ mb: 1 }}>
            操作：<strong>{restoreDialog.snapshot?.operation}</strong>｜
            資料集：<strong>{restoreDialog.snapshot?.collection}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            快照時間：{formatDate(restoreDialog.snapshot?.timestamp)}
          </Typography>
          <TextField
            fullWidth label='輸入 "CONFIRM_RESTORE" 確認'
            value={confirmToken}
            onChange={(e) => setConfirmToken(e.target.value)}
            placeholder="CONFIRM_RESTORE"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog({ open: false, snapshot: null })}>取消</Button>
          <Button variant="contained" color="error" onClick={handleRestore} disabled={confirmToken !== 'CONFIRM_RESTORE'}>
            確認恢復
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

// ── Google Drive 備份紀錄 ──
function GDriveSection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API}/backup/logs`, { headers: getAuthHeaders() });
      setLogs(res.data.data?.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const handleBackup = async () => {
    setBackingUp(true);
    setMsg(null);
    try {
      const res = await axios.post(`${ADMIN_API}/backup/gdrive`, {}, { headers: getAuthHeaders() });
      const d = res.data;
      setMsg({ type: 'success', text: d.data?.dryRun ? 'dry-run 完成（未實際上傳）' : `備份完成：${d.data?.fileName}` });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || '備份失敗' });
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <Typography variant="h6">Google Drive 備份</Typography>
        <Tooltip title="重新整理"><IconButton size="small" onClick={load}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
        <Box sx={{ ml: 'auto' }}>
          <Button variant="contained" startIcon={backingUp ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
            onClick={handleBackup} disabled={backingUp}>
            {backingUp ? '備份中...' : '立即備份'}
          </Button>
        </Box>
      </Box>
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      {loading ? <CircularProgress size={24} /> : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>時間</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell>檔案名稱</TableCell>
                <TableCell>大小</TableCell>
                <TableCell>備註</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">尚無備份記錄</TableCell></TableRow>
              ) : logs.slice(0, 5).map((l, i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(l.timestamp)}</TableCell>
                  <TableCell>
                    <Chip label={l.status} size="small" color={l.status === 'success' ? 'success' : 'error'} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{l.fileName || '-'}</TableCell>
                  <TableCell>{l.fileSizeBytes ? `${Math.round(l.fileSizeBytes / 1024)} KB` : '-'}</TableCell>
                  <TableCell>{l.dryRun ? <Chip label="dry-run" size="small" variant="outlined" /> : (l.error || '-')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

// ── API Log ──
function ApiLogSection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dangerOnly, setDangerOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (dangerOnly) params.set('tag', 'danger');
      const res = await axios.get(`${ADMIN_API}/logs?${params}`, { headers: getAuthHeaders() });
      setLogs(res.data.data?.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [dangerOnly]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const methodColor = (m) => ({ GET: 'default', POST: 'primary', PUT: 'warning', DELETE: 'error', PATCH: 'warning' }[m] || 'default');

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6">API Log</Typography>
        <Tooltip title="重新整理"><IconButton size="small" onClick={load}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon fontSize="small" color={dangerOnly ? 'error' : 'action'} />
          <ToggleButtonGroup size="small" value={dangerOnly ? 'danger' : 'all'}
            exclusive onChange={(_, v) => setDangerOnly(v === 'danger')}>
            <ToggleButton value="all">全部</ToggleButton>
            <ToggleButton value="danger" color="error">僅危險操作</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      {loading ? <CircularProgress size={24} /> : (
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>時間</TableCell>
                <TableCell>方法</TableCell>
                <TableCell>路徑</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell>耗時</TableCell>
                <TableCell>標籤</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">無記錄</TableCell></TableRow>
              ) : logs.map((l) => (
                <TableRow key={l._id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{formatDate(l.timestamp)}</TableCell>
                  <TableCell><Chip label={l.method} size="small" color={methodColor(l.method)} /></TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.path}</TableCell>
                  <TableCell>
                    <Chip label={l.statusCode} size="small" color={l.statusCode >= 400 ? 'error' : 'success'} variant="outlined" />
                  </TableCell>
                  <TableCell>{l.responseTimeMs != null ? `${l.responseTimeMs}ms` : '-'}</TableCell>
                  <TableCell>
                    {(l.tags || []).map((t) => (
                      <Chip key={t} label={t} size="small" sx={{ mr: 0.3 }}
                        color={t === 'danger' ? 'error' : t === 'error' ? 'warning' : 'default'} />
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

// ── 主頁面 ──
export default function SystemPage() {
  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        系統管理
      </Typography>
      <Divider sx={{ mb: 3 }} />
      <SnapshotSection />
      <GDriveSection />
      <ApiLogSection />
    </Box>
  );
}
