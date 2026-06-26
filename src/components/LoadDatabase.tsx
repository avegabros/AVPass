import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Loader2, AlertCircle, RefreshCw, Phone, UserCheck } from 'lucide-react';
import { API_URL } from '../types';

export interface ApiEmployee {
  id: string;
  employee_id: string;
  full_name: string;
  emergency_contact_num?: string;
  emergency_contact_person?: string;
  signature?: string;
  picture?: string;
  position?: string;
  department?: string;
  company?: string;
  status?: string;
  employee_status?: string;
  [key: string]: any;
}

interface LoadDatabaseProps {
  employeeDatabase?: any;
  setEmployeeDatabase?: any;
}

const LIMIT = 100;

export default function LoadDatabase({ setEmployeeDatabase }: LoadDatabaseProps) {
  const [employees, setEmployees]         = useState<ApiEmployee[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState("");
  const [searchQuery, setSearchQuery]     = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [page, setPage]                   = useState(0);
  const [totalCount, setTotalCount]       = useState(0);

  const fetchEmployees = useCallback(async (query: string, company: string, pg: number) => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ order: "asc", sort: "id", limit: LIMIT.toString(), page: pg.toString() });
      if (query.trim()) params.append("search", query.trim());
      if (company.trim()) params.append("company", company.trim());
      const res = await fetch(`${API_URL}/employees?${params}`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      const rawList: ApiEmployee[] = Array.isArray(data) ? data : (data.data ?? []);
      setEmployees(rawList);
      setTotalCount(data.total ?? data.count ?? rawList.length);
      if (setEmployeeDatabase) setEmployeeDatabase(rawList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [setEmployeeDatabase]);

  useEffect(() => {
    const t = setTimeout(() => fetchEmployees(searchQuery, companyFilter, page), 400);
    return () => clearTimeout(t);
  }, [searchQuery, companyFilter, page, fetchEmployees]);

  const card: React.CSSProperties = { background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" };
  const th: React.CSSProperties   = { padding: "10px 16px", fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: "left", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
  const td: React.CSSProperties   = { padding: "12px 16px", fontSize: "13px", color: "#0f172a", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>Employee Directory</h2>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#94a3b8" }}>
            Live data from HRIS API{totalCount > 0 && ` · ${totalCount.toLocaleString()} employees`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
            <input type="text" placeholder="Search employees..." value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              style={{ paddingLeft: "32px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", outline: "none", width: "220px", color: "#0f172a", background: "#fff" }} />
          </div>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
            <input type="text" placeholder="Filter by company..." value={companyFilter}
              onChange={e => { setCompanyFilter(e.target.value); setPage(0); }}
              style={{ paddingLeft: "32px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", outline: "none", width: "200px", color: "#0f172a", background: "#fff" }} />
          </div>
          <button onClick={() => fetchEmployees(searchQuery, companyFilter, page)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>
            <RefreshCw size={14} style={isLoading ? { animation: "spin 1s linear infinite" } : undefined} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "14px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px" }}>
          <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#dc2626" }}>Failed to load employees</div>
            <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: "2px" }}>{error}</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Make sure the backend server is running.</div>
          </div>
        </div>
      )}

      <div style={card}>
        {isLoading && employees.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "260px", gap: "12px", color: "#94a3b8" }}>
            <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#667eea" }} />
            <span style={{ fontSize: "13px" }}>Fetching from HRIS API...</span>
          </div>
        ) : employees.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "260px", gap: "8px", color: "#94a3b8" }}>
            <Users size={36} />
            <span style={{ fontSize: "14px", fontWeight: 600 }}>No employees found</span>
            <span style={{ fontSize: "12px" }}>Try a different search term.</span>
          </div>
        ) : (
          <div style={{ overflowX: "auto", maxHeight: "560px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Employee ID</th>
                  <th style={th}>Full Name</th>
                  <th style={th}>Position</th>
                  <th style={th}>Company</th>
                  <th style={th}>Status</th>
                  <th style={th}><span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Phone size={11}/>Emergency #</span></th>
                  <th style={th}><span style={{ display: "flex", alignItems: "center", gap: "4px" }}><UserCheck size={11}/>Contact Person</span></th>
                  <th style={th}>Photo</th>
                  <th style={th}>Signature</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => (
                  <tr key={emp.id ?? idx}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#fff"}>
                    <td style={{ ...td, color: "#94a3b8", fontSize: "11px" }}>{page * LIMIT + idx + 1}</td>
                    <td style={{ ...td, fontFamily: "monospace", fontWeight: 700, color: "#667eea", fontSize: "12px" }}>{emp.employee_id || "—"}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{emp.full_name || "—"}</td>
                    <td style={{ ...td, color: "#64748b" }}>{emp.position || <span style={{ color: "#cbd5e1", fontSize: "11px" }}>—</span>}</td>
                    <td style={{ ...td, fontSize: "12px" }}>{emp.company
                      ? <span style={{ background: "#eff6ff", color: "#2563eb", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 600 }}>{emp.company}</span>
                      : <span style={{ color: "#cbd5e1", fontSize: "11px" }}>—</span>}
                    </td>
                    <td style={td}>{emp.employee_status
                      ? <span style={{ background: ["probationary","regular","casual","fixed term","part-time"].includes((emp.employee_status||"").toLowerCase()) ? "#ecfdf5" : "#fff7ed", color: ["probationary","regular","casual","fixed term","part-time"].includes((emp.employee_status||"").toLowerCase()) ? "#059669" : "#ea580c", borderRadius: "6px", padding: "2px 8px", fontSize: "10px", fontWeight: 700, textTransform: "capitalize" }}>{emp.employee_status}</span>
                      : <span style={{ color: "#cbd5e1", fontSize: "11px" }}>—</span>}
                    </td>
                    <td style={td}>{emp.emergency_contact_num ? <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{emp.emergency_contact_num}</span> : <span style={{ color: "#cbd5e1", fontSize: "11px" }}>—</span>}</td>
                    <td style={{ ...td, color: "#64748b", fontSize: "12px" }}>{emp.emergency_contact_person || <span style={{ color: "#cbd5e1", fontSize: "11px" }}>—</span>}</td>
                    <td style={td}>
                      {emp.picture ? (
                        <a href={emp.picture} target="_blank" rel="noopener noreferrer" style={{ background: "#ecfdf5", color: "#059669", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", textDecoration: "none" }}>
                          ✓ Yes
                        </a>
                      ) : (
                        <span style={{ background: "#f8fafc", color: "#cbd5e1", fontSize: "10px", padding: "2px 8px", borderRadius: "20px" }}>—</span>
                      )}
                    </td>
                    <td style={td}>
                      {emp.signature ? (
                        <a href={emp.signature} target="_blank" rel="noopener noreferrer" style={{ background: "#ecfdf5", color: "#059669", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", textDecoration: "none" }}>
                          ✓ Yes
                        </a>
                      ) : (
                        <span style={{ background: "#f8fafc", color: "#cbd5e1", fontSize: "10px", padding: "2px 8px", borderRadius: "20px" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {employees.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              {isLoading ? "Loading..." : `Showing ${page * LIMIT + 1}–${page * LIMIT + employees.length}${totalCount ? ` of ${totalCount.toLocaleString()}` : ""}`}
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: page === 0 ? "#f8fafc" : "#fff", color: page === 0 ? "#cbd5e1" : "#475569", cursor: page === 0 ? "default" : "pointer", fontSize: "12px", fontWeight: 600 }}>
                ← Prev
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={employees.length < LIMIT}
                style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: employees.length < LIMIT ? "#f8fafc" : "#fff", color: employees.length < LIMIT ? "#cbd5e1" : "#475569", cursor: employees.length < LIMIT ? "default" : "pointer", fontSize: "12px", fontWeight: 600 }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}