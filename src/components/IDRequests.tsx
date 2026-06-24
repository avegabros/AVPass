import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../types';
import type { IDRequest, RequestStatus } from '../types';
import {
  ClipboardList, Plus, X, ChevronDown, Clock, CheckCircle, XCircle,
  Loader, PackageCheck, Search, Trash2, RefreshCw, ChevronRight, User,
  Pencil, Wand2, Printer
} from 'lucide-react';

interface Props {
  currentUser: { username: string; role: string; token: string };
  onGoToBuilder: (req: IDRequest) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:        { label: 'Pending',         color: '#d97706', bg: '#fef3c7', icon: <Clock size={13} /> },
  processing:     { label: 'Processing',      color: '#2563eb', bg: '#dbeafe', icon: <Loader size={13} /> },
  approved:       { label: 'Approved',        color: '#059669', bg: '#d1fae5', icon: <CheckCircle size={13} /> },
  rejected:       { label: 'Rejected',        color: '#dc2626', bg: '#fee2e2', icon: <XCircle size={13} /> },
  'id generated': { label: 'ID Generated',    color: '#8b5cf6', bg: '#f3e8ff', icon: <Wand2 size={13} /> },
  printed:        { label: 'Printed',         color: '#06b6d4', bg: '#ecfeff', icon: <Printer size={13} /> },
  completed:      { label: 'Completed',       color: '#7c3aed', bg: '#ede9fe', icon: <PackageCheck size={13} /> },
  'for releasing':{ label: 'For Releasing',   color: '#3b82f6', bg: '#eff6ff', icon: <Clock size={13} /> },
  claimed:        { label: 'Claimed',         color: '#10b981', bg: '#ecfdf5', icon: <CheckCircle size={13} /> },
  cancelled:      { label: 'Cancelled',       color: '#64748b', bg: '#f1f5f9', icon: <XCircle size={13} /> },
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: cfg.bg, color: cfg.color, fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function fmt(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

interface ApiEmployee {
  id: string;
  employee_id: string;
  full_name: string;
  position?: string;
  department?: string;
  company?: string;
  [key: string]: any;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IDRequests({ currentUser, onGoToBuilder }: Props) {
  const isAdmin = currentUser.role === 'admin';
  const [requests, setRequests] = useState<IDRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | RequestStatus>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedReq, setSelectedReq] = useState<IDRequest | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Form state (new + edit shared)
  const [form, setForm] = useState({
    employeeName: '',
    empCode: '',
    company: '',
    department: '',
    position: '',
    purpose: '',
    iraafId: '',
    verifierName: '',
    approverName: '',
    pictureUrl: '',
    signatureUrl: '',
    supportingDocUrl: ''
  });
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [supportingDocFile, setSupportingDocFile] = useState<File | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [editingReq, setEditingReq] = useState<IDRequest | null>(null); // null = new, set = editing

  // Autocomplete state
  const [empSuggestions, setEmpSuggestions] = useState<ApiEmployee[]>([]);
  const [empSearchLoading, setEmpSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const empDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Admin: update status state
  const [statusUpdate, setStatusUpdate] = useState<{ status: RequestStatus; note: string }>({ status: 'pending', note: '' });
  const [statusLoading, setStatusLoading] = useState(false);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/id-requests`);
      if (res.ok) setRequests(await res.json());
    } catch { showToast('Failed to load requests', 'err'); }
    finally { setLoading(false); }
  }, []);

  // Fetch saved ID when selected request changes
  const [matchingSavedId, setMatchingSavedId] = useState<any | null>(null);

  useEffect(() => {
    if (!selectedReq?.empCode) { setMatchingSavedId(null); return; }
    fetch(`${API_URL}/saved-ids?empCode=${encodeURIComponent(selectedReq.empCode)}`)
      .then(r => r.ok ? r.json() : [])
      .then(list => setMatchingSavedId(list.length > 0 ? list[list.length - 1] : null))
      .catch(() => setMatchingSavedId(null));
  }, [selectedReq?.empCode]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ── Employee autocomplete ──
  const searchEmployees = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) { setEmpSuggestions([]); setShowSuggestions(false); return; }
    setEmpSearchLoading(true);
    try {
      const res = await fetch(`${API_URL}/employees?search=${encodeURIComponent(query)}&limit=10`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list: ApiEmployee[] = Array.isArray(data) ? data : (data.data ?? []);
      setEmpSuggestions(list);
      setShowSuggestions(list.length > 0);
      setActiveSuggestion(-1);
    } catch { setEmpSuggestions([]); }
    finally { setEmpSearchLoading(false); }
  }, []);

  const handleEmpNameChange = (value: string) => {
    setForm(prev => ({ ...prev, employeeName: value }));
    if (empDebounce.current) clearTimeout(empDebounce.current);
    empDebounce.current = setTimeout(() => searchEmployees(value), 300);
  };

  const selectEmployee = (emp: ApiEmployee) => {
    setForm(prev => ({
      ...prev,
      employeeName: emp.full_name,
      empCode: emp.employee_id || prev.empCode,
      position: emp.position || prev.position,
      department: emp.department || prev.department,
      company: emp.company || prev.company,
    }));
    setShowSuggestions(false);
    setEmpSuggestions([]);
  };

  const handleEmpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || empSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestion(i => Math.min(i + 1, empSuggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSuggestion(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeSuggestion >= 0) { e.preventDefault(); selectEmployee(empSuggestions[activeSuggestion]); }
    else if (e.key === 'Escape') { setShowSuggestions(false); }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Helper to open form for editing ──
  const openEditForm = (req: IDRequest) => {
    setEditingReq(req);
    setForm({
      employeeName: req.employeeName || '',
      empCode: req.empCode || '',
      company: req.company || '',
      department: req.department || '',
      position: req.position || '',
      purpose: req.purpose || '',
      iraafId: req.iraafId || '',
      verifierName: req.verifierName || '',
      approverName: req.approverName || '',
      pictureUrl: req.pictureUrl || '',
      signatureUrl: req.signatureUrl || '',
      supportingDocUrl: req.supportingDocUrl || ''
    });
    setPictureFile(null);
    setSignatureFile(null);
    setSupportingDocFile(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingReq(null);
    setForm({
      employeeName: '',
      empCode: '',
      company: '',
      department: '',
      position: '',
      purpose: '',
      iraafId: '',
      verifierName: '',
      approverName: '',
      pictureUrl: '',
      signatureUrl: '',
      supportingDocUrl: ''
    });
    setPictureFile(null);
    setSignatureFile(null);
    setSupportingDocFile(null);
    setEmpSuggestions([]);
    setShowSuggestions(false);
  };

  // ── Submit new request OR save edit ──
  const handleSubmit = async () => {
    if (!form.employeeName.trim()) { showToast('Employee name is required', 'err'); return; }
    setFormLoading(true);

    try {
      // 1. Upload files if selected
      let uploadedUrls = { pictureUrl: form.pictureUrl, signatureUrl: form.signatureUrl, supportingDocUrl: form.supportingDocUrl };
      if (pictureFile || signatureFile || supportingDocFile) {
        const formData = new FormData();
        formData.append('employeeName', form.employeeName);
        if (pictureFile) formData.append('picture', pictureFile);
        if (signatureFile) formData.append('signature', signatureFile);
        if (supportingDocFile) formData.append('supportingDoc', supportingDocFile);

        const uploadRes = await fetch(`${API_URL}/id-requests/upload`, {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const resData = await uploadRes.json();
          uploadedUrls = {
            pictureUrl: resData.pictureUrl || form.pictureUrl,
            signatureUrl: resData.signatureUrl || form.signatureUrl,
            supportingDocUrl: resData.supportingDocUrl || form.supportingDocUrl
          };
        } else {
          throw new Error('File upload failed');
        }
      }

      const submissionPayload = {
        ...form,
        ...uploadedUrls
      };

      if (editingReq) {
        // EDIT — PATCH only the fields (no status change)
        const res = await fetch(`${API_URL}/id-requests/${editingReq.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionPayload),
        });
        if (!res.ok) throw new Error();
        const updated: IDRequest = await res.json();
        setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
        if (selectedReq?.id === updated.id) setSelectedReq(updated);
        showToast('Request updated!');
      } else {
        // NEW
        const res = await fetch(`${API_URL}/id-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...submissionPayload, requestedBy: currentUser.username }),
        });
        if (!res.ok) throw new Error();
        const created: IDRequest = await res.json();
        setRequests(prev => [created, ...prev]);
        showToast(`Request ${created.id} submitted!`);
      }
      closeForm();
    } catch (err: any) {
      showToast(err.message || (editingReq ? 'Failed to update request' : 'Failed to submit request'), 'err');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Update status (admin) ──
  const handleStatusUpdate = async (newStatus?: RequestStatus, noteText?: string) => {
    if (!selectedReq) return;
    setStatusLoading(true);
    const payload = newStatus
      ? { status: newStatus, note: noteText || '' }
      : statusUpdate;
    try {
      const res = await fetch(`${API_URL}/id-requests/${selectedReq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const updated: IDRequest = await res.json();
      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSelectedReq(updated);
      showToast('Status updated!');
    } catch { showToast('Failed to update status', 'err'); }
    finally { setStatusLoading(false); }
  };

  // ── Delete request — only if not approved ──
  const handleDelete = async (id: string, status: RequestStatus) => {
    if (status === 'approved' || status === 'completed') {
      showToast('Cannot delete an approved or completed request', 'err'); return;
    }
    if (!window.confirm('Delete this request?')) return;
    try {
      await fetch(`${API_URL}/id-requests/${id}`, { method: 'DELETE' });
      setRequests(prev => prev.filter(r => r.id !== id));
      if (selectedReq?.id === id) setSelectedReq(null);
      showToast('Request deleted');
    } catch { showToast('Failed to delete', 'err'); }
  };

  // ── Filtered list ──
  const filtered = requests.filter(r => {
    const matchSearch = !search || [r.employeeName, r.empCode, r.company, r.id].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = Object.keys(STATUS_CONFIG).reduce((acc, s) => {
    acc[s as RequestStatus] = requests.filter(r => r.status === s).length;
    return acc;
  }, {} as Record<RequestStatus, number>);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 0 40px' }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', top: '70px', right: '20px', zIndex: 9999, background: toast.type === 'ok' ? '#10b981' : '#ef4444', color: '#fff', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', animation: 'modalIn 0.2s ease' }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={22} color="#6366f1" /> ID Requests
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
            {isAdmin ? 'Manage and update ID request statuses.' : 'Submit and track your ID requests.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchRequests} title="Refresh" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowForm(true)} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
            <Plus size={15} /> New Request
          </button>
        </div>
      </div>

      {/* ── Status Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px', marginBottom: '20px' }}>
        {(Object.entries(STATUS_CONFIG) as [RequestStatus, typeof STATUS_CONFIG[RequestStatus]][]).map(([s, cfg]) => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            style={{ background: filterStatus === s ? cfg.bg : '#fff', border: `2px solid ${filterStatus === s ? cfg.color : '#e2e8f0'}`, borderRadius: '14px', padding: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: cfg.color, marginBottom: '6px' }}>
              {cfg.icon}
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cfg.label}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: filterStatus === s ? cfg.color : '#0f172a' }}>{counts[s]}</div>
          </button>
        ))}
      </div>

      {/* ── Search & Filter ── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, emp code, company, ID..."
            style={{ width: '100%', paddingLeft: '34px', padding: '9px 12px 9px 34px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', background: '#fff', outline: 'none', color: '#0f172a', boxSizing: 'border-box' }} />
        </div>
        {filterStatus !== 'all' && (
          <button onClick={() => setFilterStatus('all')} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <X size={12} /> Clear filter
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <Loader size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px', display: 'block' }} />
            <p style={{ margin: 0, fontSize: '13px' }}>Loading requests...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <ClipboardList size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#64748b' }}>{requests.length === 0 ? 'No requests yet' : 'No results found'}</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>{requests.length === 0 ? 'Create a new request to get started.' : 'Try adjusting your search or filter.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Request ID', 'Employee', 'Company / Dept', 'Purpose', 'Requested By', 'Date', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((req, i) => (
                  <tr key={req.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', background: selectedReq?.id === req.id ? '#f5f3ff' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                    onClick={() => { setSelectedReq(req); setStatusUpdate({ status: req.status, note: '' }); }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '12px', color: '#6366f1', fontWeight: 700 }}>
                      {req.id}
                      {req.iraafId && (
                        <div style={{ fontSize: '9px', background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px', display: 'block', marginTop: '4px', fontWeight: 700, width: 'fit-content' }}>IRAAF: {req.iraafId}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{req.employeeName}</div>
                      {req.empCode && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{req.empCode}</div>}
                      {req.position && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{req.position}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      <div>{req.company || '—'}</div>
                      {req.department && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{req.department}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', maxWidth: '160px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.purpose || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <User size={12} />{req.requestedBy}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {new Date(req.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={req.status} /></td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={e => { e.stopPropagation(); setSelectedReq(req); setStatusUpdate({ status: req.status, note: '' }); }}
                          style={{ background: '#f1f5f9', border: 'none', borderRadius: '7px', padding: '5px 8px', cursor: 'pointer', color: '#6366f1', display: 'flex', alignItems: 'center' }}>
                          <ChevronRight size={13} />
                        </button>
                        {req.status !== 'approved' && req.status !== 'completed' && (
                          <button onClick={e => { e.stopPropagation(); openEditForm(req); }}
                            style={{ background: '#eff6ff', border: 'none', borderRadius: '7px', padding: '5px 8px', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center' }}
                            title="Edit request">
                            <Pencil size={13} />
                          </button>
                        )}
                        {(isAdmin || req.requestedBy === currentUser.username) && req.status !== 'approved' && req.status !== 'completed' && (
                          <button onClick={e => { e.stopPropagation(); handleDelete(req.id, req.status); }}
                            style={{ background: '#fef2f2', border: 'none', borderRadius: '7px', padding: '5px 8px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}
                            title="Delete request">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p style={{ textAlign: 'right', fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
        Showing {filtered.length} of {requests.length} request{requests.length !== 1 ? 's' : ''}
      </p>

      {/* ── Detail / Admin Panel (slide-in drawer style) ── */}
      {selectedReq && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedReq(null)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '480px', height: '100%', background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', animation: 'slideFromRight 0.25s ease' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>REQUEST DETAILS</p>
                <p style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 800, color: '#6366f1', fontFamily: 'monospace' }}>{selectedReq.id}</p>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {selectedReq.status !== 'approved' && selectedReq.status !== 'completed' && (
                  <button onClick={() => { openEditForm(selectedReq); setSelectedReq(null); }}
                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '7px 12px', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                    <Pencil size={13} /> Edit
                  </button>
                )}
                {(isAdmin || selectedReq.requestedBy === currentUser.username) && selectedReq.status !== 'approved' && selectedReq.status !== 'completed' && (
                  <button onClick={() => handleDelete(selectedReq.id, selectedReq.status)}
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '7px 12px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                    <Trash2 size={13} /> Delete
                  </button>
                )}
                <button onClick={() => setSelectedReq(null)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex', color: '#64748b' }}><X size={16} /></button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {/* Employee info */}
              <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>{selectedReq.employeeName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{selectedReq.employeeName}</p>
                      {selectedReq.iraafId && (
                        <span style={{ fontSize: '9px', background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>IRAAF Ticket Ref: {selectedReq.iraafId}</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{selectedReq.position || 'No position'}</p>
                  </div>
                </div>
                 {[
                  ['Request ID', selectedReq.id],
                  ['IRAAF Ticket ID', selectedReq.iraafId],
                  ['Emp Code', selectedReq.empCode],
                  ['Company', selectedReq.company],
                  ['Department', selectedReq.department],
                  ['Verifier/Supervisor', selectedReq.verifierName],
                  ['Approver/Manager', selectedReq.approverName],
                  ['Reason', selectedReq.purpose],
                  ['Requested By', selectedReq.requestedBy],
                  ['Submitted', fmt(selectedReq.createdAt)],
                  ['Last Updated', fmt(selectedReq.updatedAt)],
                ].map(([label, val]) => {
                  if (!val) return null;
                  if (label === 'Reason') {
                    const purposeClean = String(val).trim().toLowerCase();
                    let bg = '#e2e8f0';
                    let color = '#475569';
                    if (purposeClean === 'new') {
                      bg = '#d1fae5'; color = '#065f46';
                    } else if (purposeClean === 'lost') {
                      bg = '#fee2e2'; color = '#991b1b';
                    } else if (purposeClean === 'damaged') {
                      bg = '#ffedd5'; color = '#9a3412';
                    } else if (purposeClean === 'replacement') {
                      bg = '#dbeafe'; color = '#1e40af';
                    }
                    return (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
                        <span style={{ background: bg, color: color, fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', textAlign: 'right', maxWidth: '60%', display: 'inline-block' }}>{val}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
                      <span style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{val}</span>
                    </div>
                  );
                })}
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Current Status:</span>
                  <StatusBadge status={selectedReq.status} />
                </div>
              </div>

              {/* Request Attachments */}
              {(selectedReq.pictureUrl || selectedReq.signatureUrl || selectedReq.supportingDocUrl) && (
                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted Attachments</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    {selectedReq.pictureUrl && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748b' }}>Profile Picture:</span>
                        <a href={selectedReq.pictureUrl} target="_blank" rel="noreferrer" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>View Photo ↗</a>
                      </div>
                    )}
                    {selectedReq.signatureUrl && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748b' }}>Signature:</span>
                        <a href={selectedReq.signatureUrl} target="_blank" rel="noreferrer" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>View Signature ↗</a>
                      </div>
                    )}
                    {selectedReq.supportingDocUrl && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>Supporting Doc:</span>
                        <a href={selectedReq.supportingDocUrl} target="_blank" rel="noreferrer" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>View Document ↗</a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Generated ID Card Preview */}
              {matchingSavedId && (
                <div style={{ marginBottom: '16px', background: '#f8fafc', borderRadius: '14px', padding: '16px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Generated ID Card</p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    {matchingSavedId.frontImg && (
                      <img src={matchingSavedId.frontImg} style={{ width: '140px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0' }} alt="ID Front" />
                    )}
                    {matchingSavedId.backImg && (
                      <img src={matchingSavedId.backImg} style={{ width: '140px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0' }} alt="ID Back" />
                    )}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                    Saved ID: <strong>{matchingSavedId.employeeName}</strong> · Saved {matchingSavedId.savedAt}
                  </div>
                </div>
              )}

              {/* Mark as Done & Notify ABAS Button */}
              {isAdmin && selectedReq.status === 'approved' && selectedReq.abasRequestId && matchingSavedId && (
                <div style={{ background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', border: '1px solid #6ee7b7', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={15} color="#059669" /> ID card ready for ABAS
                  </p>
                  <button
                    onClick={async () => {
                      // 1. Update request status to 'completed'
                      await handleStatusUpdate('completed', 'ID card generated and ABAS notified.');
                      // 2. Notify ABAS webhook
                      try {
                        const notifyRes = await fetch(`${API_URL}/notify-abas`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            abasRequestId: selectedReq.abasRequestId,
                            savedIdId: matchingSavedId.id,
                          }),
                        });
                        if (!notifyRes.ok) throw new Error();
                        showToast('ABAS notified — ID is marked ready!');
                      } catch {
                        showToast('Status updated but failed to notify ABAS', 'err');
                      }
                    }}
                    style={{ width: '100%', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}
                  >
                    ✓ Mark Done & Notify ABAS
                  </button>
                </div>
              )}

              {/* Status Timeline */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status History</p>
                <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '14px' }}>
                  {[...(selectedReq.statusHistory || [])].reverse().map((h, i) => {
                    const cfg = STATUS_CONFIG[h.status] || STATUS_CONFIG.pending;
                    return (
                      <div key={i} style={{ position: 'relative', marginBottom: '12px' }}>
                        <div style={{ position: 'absolute', left: '-20px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: cfg.color, border: '2px solid #fff', boxShadow: `0 0 0 2px ${cfg.color}` }} />
                        <div style={{ background: cfg.bg, borderRadius: '10px', padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <StatusBadge status={h.status} />
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{fmt(h.changedAt)}</span>
                          </div>
                          {h.note && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569' }}>{h.note}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Admin: Proceed to ID Builder when approved */}
              {isAdmin && selectedReq.status === 'approved' && (
                <div style={{ background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', border: '1px solid #6ee7b7', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} color="#059669" />
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#065f46' }}>Request Approved</p>
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#047857' }}>
                    This request is approved. You can now proceed to create the ID in the builder.
                  </p>
                  <button onClick={() => { onGoToBuilder(selectedReq); setSelectedReq(null); }}
                    style={{ width: '100%', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}>
                    <Wand2 size={15} /> Proceed to ID Builder
                  </button>
                </div>
              )}

              {/* Admin: Update Status */}
              {isAdmin && (
                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '14px', padding: '16px' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Update Status</p>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '5px' }}>New Status</label>
                    <div style={{ position: 'relative' }}>
                      <select value={statusUpdate.status} onChange={e => setStatusUpdate(s => ({ ...s, status: e.target.value as RequestStatus }))}
                        style={{ width: '100%', padding: '9px 32px 9px 12px', border: '1px solid #ddd6fe', borderRadius: '10px', fontSize: '13px', background: '#fff', appearance: 'none', outline: 'none', color: '#0f172a', cursor: 'pointer', boxSizing: 'border-box' }}>
                        {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
                          <option key={s} value={s}>{cfg.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '5px' }}>Note (optional)</label>
                    <textarea value={statusUpdate.note} onChange={e => setStatusUpdate(s => ({ ...s, note: e.target.value }))} placeholder="Add a note about this status change..."
                      rows={2}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd6fe', borderRadius: '10px', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <button onClick={() => handleStatusUpdate()} disabled={statusLoading || statusUpdate.status === selectedReq.status}
                    style={{ width: '100%', background: statusUpdate.status === selectedReq.status ? '#e2e8f0' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: statusUpdate.status === selectedReq.status ? '#94a3b8' : '#fff', border: 'none', borderRadius: '10px', padding: '10px', cursor: statusUpdate.status === selectedReq.status ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {statusLoading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Updating...</> : 'Update Status'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── New Request Modal ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', maxWidth: '480px', width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', animation: 'modalIn 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{editingReq ? 'Edit Request' : 'New ID Request'}</h3>
                <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '12px' }}>{editingReq ? `Editing ${editingReq.id}` : 'Fill in the employee details to submit a request.'}</p>
              </div>
              <button onClick={closeForm} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={16} /></button>
            </div>

            {/* Employee Name with Autocomplete */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Employee Full Name *</label>
              <div style={{ position: 'relative' }} ref={suggestionsRef}>
                <div style={{ position: 'relative' }}>
                  <input
                    value={form.employeeName}
                    onChange={e => handleEmpNameChange(e.target.value)}
                    onKeyDown={handleEmpKeyDown}
                    onFocus={() => { if (empSuggestions.length > 0) setShowSuggestions(true); }}
                    placeholder="Type to search employee..."
                    autoComplete="off"
                    style={{ width: '100%', padding: '9px 36px 9px 12px', border: `1px solid ${showSuggestions ? '#6366f1' : '#e2e8f0'}`, borderRadius: showSuggestions ? '10px 10px 0 0' : '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', color: '#0f172a', transition: 'border-color 0.15s' }}
                  />
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    {empSearchLoading
                      ? <Loader size={14} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} />
                      : <Search size={14} color="#94a3b8" />
                    }
                  </div>
                </div>
                {showSuggestions && empSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, zIndex: 500, background: '#fff', border: '1px solid #6366f1', borderTop: 'none', borderRadius: '0 0 12px 12px', boxShadow: '0 8px 24px rgba(99,102,241,0.15)', maxHeight: '220px', overflowY: 'auto' }}>
                    {empSuggestions.map((emp, i) => (
                      <button
                        key={emp.id}
                        onMouseDown={e => { e.preventDefault(); selectEmployee(emp); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', border: 'none', background: i === activeSuggestion ? '#f5f3ff' : 'transparent', cursor: 'pointer', textAlign: 'left', borderBottom: i < empSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>{emp.full_name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.full_name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[emp.employee_id, emp.position, emp.company].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {[
              { key: 'empCode',      label: 'Employee Code',      placeholder: 'e.g. EMP-001' },
              { key: 'position',     label: 'Position / Title',   placeholder: 'e.g. Software Engineer' },
              { key: 'company',      label: 'Company',            placeholder: 'e.g. Avega Bros. Inc.' },
              { key: 'department',   label: 'Department',         placeholder: 'e.g. IT Department' },
              { key: 'iraafId',      label: 'IRAAF Ticket ID',    placeholder: 'e.g. TKT-12345 (Optional)' },
              { key: 'verifierName', label: 'Verifier/Supervisor', placeholder: 'e.g. John Doe' },
              { key: 'approverName', label: 'Approver/Manager',   placeholder: 'e.g. Jane Smith' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', color: '#0f172a' }} />
              </div>
            ))}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Purpose / Reason</label>
              <textarea value={form.purpose} onChange={e => setForm(prev => ({ ...prev, purpose: e.target.value }))} placeholder="e.g. New employee onboarding, Lost ID replacement..." rows={2}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            {/* File Upload Fields */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#475569' }}>📸 Attachments</p>
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Employee Picture (photo)</label>
                <input type="file" accept="image/*" onChange={e => setPictureFile(e.target.files?.[0] || null)} style={{ fontSize: '12px' }} />
                {form.pictureUrl && <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px' }}>✓ Currently attached: <a href={form.pictureUrl} target="_blank" rel="noreferrer">View Photo</a></div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Employee Signature</label>
                <input type="file" accept="image/*" onChange={e => setSignatureFile(e.target.files?.[0] || null)} style={{ fontSize: '12px' }} />
                {form.signatureUrl && <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px' }}>✓ Currently attached: <a href={form.signatureUrl} target="_blank" rel="noreferrer">View Signature</a></div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Supporting Doc (PDF / Image)</label>
                <input type="file" accept="image/*,application/pdf" onChange={e => setSupportingDocFile(e.target.files?.[0] || null)} style={{ fontSize: '12px' }} />
                {form.supportingDocUrl && <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px' }}>✓ Currently attached: <a href={form.supportingDocUrl} target="_blank" rel="noreferrer">View Doc</a></div>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={closeForm} style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '11px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={formLoading}
                style={{ flex: 2, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '12px', padding: '11px', cursor: formLoading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                {formLoading
                  ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> {editingReq ? 'Saving...' : 'Submitting...'}</>
                  : editingReq ? <><Pencil size={14} /> Save Changes</> : <><Plus size={14} /> Submit Request</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}