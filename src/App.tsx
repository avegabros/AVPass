import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileSpreadsheet, BookMarked, Menu, Shield, X, Home, Clock, Wand2, Archive, ClipboardList } from 'lucide-react';
import { API_URL } from './types';
import type { Employee, ActiveSection, EditingID } from './types';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import LoadDatabase from './components/LoadDatabase';
import SavedIDs from './components/SavedIDs';
import IDBuilder from './components/IDBuilder';
import TemplateManager from './components/TemplateManager';
import AccountManager from './components/AccountManager';
import IDRequests from './components/IDRequests';

const INACTIVE_MS = 300_000; // 5 minutes total inactivity before logout
const WARNING_MS  = 30_000;  // show warning for last 30 seconds

export default function App() {
  // ── Auth state ──
  const [authUser, setAuthUser] = useState<{username:string;role:string;token:string}|null>(() => {
    try {
      const token = localStorage.getItem('avpass_token');
      const user = localStorage.getItem('avpass_user');
      if (token && user) return { ...JSON.parse(user), token };
    } catch {}
    return null;
  });

  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const logoutTimer        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval  = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleLogout = useCallback((reason?: string) => {
    localStorage.removeItem('avpass_token');
    localStorage.removeItem('avpass_user');
    setAuthUser(null);
    setShowTimeoutWarning(false);
    if (reason) console.info(`[AUTH] Logged out: ${reason}`);
  }, []);

  const clearTimers = useCallback(() => {
    if (logoutTimer.current)        clearTimeout(logoutTimer.current);
    if (warningTimer.current)       clearTimeout(warningTimer.current);
    if (countdownInterval.current)  clearInterval(countdownInterval.current);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (!authUser) return;
    clearTimers();
    setShowTimeoutWarning(false);
    // Show warning 30 s before logout
    warningTimer.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      setCountdown(WARNING_MS / 1000);
      countdownInterval.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(countdownInterval.current!); return 0; }
          return c - 1;
        });
      }, 1000);
    }, INACTIVE_MS - WARNING_MS);
    // Auto-logout after full inactivity period
    logoutTimer.current = setTimeout(() => handleLogout('inactivity'), INACTIVE_MS);
  }, [authUser, clearTimers, handleLogout]);

  // Attach/detach activity listeners whenever login state changes
  useEffect(() => {
    if (!authUser) { clearTimers(); return; }
    resetInactivityTimer();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer, { passive: true }));
    return () => {
      clearTimers();
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
    };
  }, [authUser, resetInactivityTimer, clearTimers]);

  const [employeeDatabase, setEmployeeDatabase] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');
  const [savedIDs, setSavedIDs] = useState<any[]>([]);
  const [editingID, setEditingID] = useState<EditingID | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<any | null>(null);

  // Detect mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/saved-ids`).then(r => r.ok ? r.json() : []).then(setSavedIDs).catch(() => {});
  }, [activeSection]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const dbRes = await fetch(`${API_URL}/database`);
        if (dbRes.ok) setEmployeeDatabase(await dbRes.json());
      } catch { console.error('Connection failed.'); }
      finally { setIsLoading(false); }
    };
    if (!(window as any).XLSX) {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.async = true; document.body.appendChild(s);
    }
    loadData();
  }, []);

  const navItems: { id: ActiveSection; label: string; icon: React.ReactNode; color: string; badge?: number | null }[] = [
    { id: 'home',        label: 'Home',        icon: <Home size={18}/>,           color: '#667eea' },
    { id: 'idbuilder',   label: 'ID Builder',  icon: <Wand2 size={18}/>,          color: '#ec4899' },
    { id: 'idrecords',   label: 'Saved IDs',   icon: <Archive size={18}/>,        color: '#8b5cf6', badge: savedIDs.length || null },
    { id: 'idrequests',  label: 'Requests',    icon: <ClipboardList size={18}/>,  color: '#6366f1' },
    { id: 'templates',   label: 'Templates',   icon: <BookMarked size={18}/>,     color: '#f59e0b' },
  ];

  const allNavItems: { id: ActiveSection; label: string; icon: React.ReactNode; color: string; badge?: number | null }[] = [
    { id: 'home',        label: 'Home',          icon: <Home size={16}/>,            color: '#667eea' },
    { id: 'database',    label: 'Load Database', icon: <FileSpreadsheet size={16}/>, color: '#f59e0b', badge: employeeDatabase.length || null },
    { id: 'idbuilder',   label: 'ID Builder',    icon: <Wand2 size={16}/>,           color: '#ec4899' },
    { id: 'idrecords',   label: 'Saved IDs',     icon: <Archive size={16}/>,         color: '#8b5cf6', badge: savedIDs.length || null },
    { id: 'idrequests',  label: 'ID Requests',   icon: <ClipboardList size={16}/>,   color: '#6366f1' },
    { id: 'templates',   label: 'ID Templates',  icon: <BookMarked size={16}/>,      color: '#f59e0b', badge: null },
    { id: 'accounts',    label: 'Accounts',      icon: <Shield size={16}/>,          color: '#64748b' },
  ];

  const sectionTitle: Record<ActiveSection, string> = {
    home: 'Home', database: 'Load Database',
    idbuilder: 'ID Builder', idrecords: 'Saved IDs', templates: 'ID Templates', accounts: 'Account Manager',
    idrequests: 'ID Requests',
  };

  const handleNav = (item: typeof allNavItems[0]) => {
    setActiveSection(item.id); setSidebarOpen(false);
  };

  // Show login if not authenticated
  if (!authUser) return <LoginPage onLogin={setAuthUser} />;

  if (isLoading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#667eea 0%,#764ba2 50%,#ec4899 100%)', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '32px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', border: '1px solid rgba(255,255,255,0.2)' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '12px', display: 'flex', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}><Shield size={28} color="#667eea" /></div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 800, letterSpacing: '3px' }}>AVPASS</p>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '12px', letterSpacing: '1px' }}>ID Management System</p>
        </div>
        <div style={{ width: '180px', height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'white', animation: 'loading 1.4s ease-in-out infinite', borderRadius: '2px' }}></div>
        </div>
      </div>
      <style>{`@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', height: '100vh', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: '#0f172a', overflow: 'hidden' }}>

      {/* ── INACTIVITY WARNING MODAL ── */}
      {showTimeoutWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '36px 40px', maxWidth: '380px', width: '90%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', animation: 'modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ background: '#fef3c7', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Clock size={28} color="#d97706" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Still there?</h2>
            <p style={{ margin: '0 0 6px', fontSize: '14px', color: '#64748b' }}>You've been inactive. You'll be logged out in</p>
            <div style={{ fontSize: '48px', fontWeight: 900, color: countdown <= 10 ? '#ef4444' : '#f59e0b', margin: '12px 0', lineHeight: 1, transition: 'color 0.3s' }}>
              {countdown}
            </div>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#94a3b8' }}>seconds</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleLogout('manual')}
                style={{ flex: 1, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '11px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                Log Out
              </button>
              <button onClick={resetInactivityTimer}
                style={{ flex: 2, background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', border: 'none', borderRadius: '12px', padding: '11px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, boxShadow: '0 4px 14px rgba(102,126,234,0.4)' }}>
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DESKTOP SIDEBAR ── */}
      {!isMobile && (
        <aside style={{ width: sidebarOpen ? '240px' : '64px', background: '#fff', transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)', flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', borderRight: '1px solid #e2e8f0', boxShadow: '4px 0 24px rgba(0,0,0,0.04)' }} className="print:hidden">
          <div style={{ padding: sidebarOpen ? '20px 18px' : '20px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '64px' }}>
            <div style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '12px', padding: '8px', display: 'flex', flexShrink: 0, boxShadow: '0 4px 12px rgba(102,126,234,0.4)' }}>
              <Shield size={16} color="white" />
            </div>
            {sidebarOpen && (
              <div>
                <p style={{ margin: 0, color: '#0f172a', fontSize: '14px', fontWeight: 800, letterSpacing: '0.5px' }}>AVPass</p>
                <p style={{ margin: '1px 0 0', color: '#94a3b8', fontSize: '10px', letterSpacing: '1px' }}>ID Management System</p>
              </div>
            )}
          </div>
          <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
            {sidebarOpen && <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '0 10px', margin: '0 0 8px' }}>Navigation</p>}
            {allNavItems.map(item => (
              <button key={item.id} onClick={() => handleNav(item)} title={!sidebarOpen ? item.label : undefined}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: activeSection === item.id ? `${item.color}15` : 'transparent', color: activeSection === item.id ? item.color : '#64748b', marginBottom: '2px', transition: 'all 0.15s', textAlign: 'left', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
                onMouseEnter={e => { if (activeSection !== item.id) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (activeSection !== item.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <span style={{ flexShrink: 0, color: activeSection === item.id ? item.color : '#94a3b8' }}>{item.icon}</span>
                {sidebarOpen && (
                  <>
                    <span style={{ fontSize: '13px', fontWeight: activeSection === item.id ? 600 : 400, flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span style={{ background: activeSection === item.id ? item.color : '#e2e8f0', color: activeSection === item.id ? '#fff' : '#64748b', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px' }}>{item.badge}</span>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ margin: '8px', padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Menu size={15} />
          </button>
        </aside>
      )}

      {/* ── MOBILE DRAWER OVERLAY ── */}
      {isMobile && sidebarOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, backdropFilter: 'blur(4px)' }} onClick={() => setSidebarOpen(false)} />
          <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '280px', background: '#fff', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '8px 0 32px rgba(0,0,0,0.15)', animation: 'slideIn 0.25s ease' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '12px', padding: '8px', display: 'flex', boxShadow: '0 4px 12px rgba(102,126,234,0.4)' }}><Shield size={16} color="white" /></div>
                <div>
                  <p style={{ margin: 0, color: '#0f172a', fontSize: '15px', fontWeight: 800 }}>AVPass</p>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '10px' }}>ID Management System</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex', color: '#64748b' }}><X size={16} /></button>
            </div>
            <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
              <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '0 10px', margin: '0 0 8px' }}>Navigation</p>
              {allNavItems.map(item => (
                <button key={item.id} onClick={() => handleNav(item)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: activeSection === item.id ? `${item.color}15` : 'transparent', color: activeSection === item.id ? item.color : '#64748b', marginBottom: '4px', textAlign: 'left' }}>
                  <span style={{ color: activeSection === item.id ? item.color : '#94a3b8' }}>{item.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: activeSection === item.id ? 600 : 400, flex: 1 }}>{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span style={{ background: activeSection === item.id ? item.color : '#e2e8f0', color: activeSection === item.id ? '#fff' : '#64748b', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>{item.badge}</span>
                  )}
                </button>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Header */}
        <header style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0', padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, zIndex: 30 }} className="print:hidden">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
              <Menu size={16} />
            </button>
            {isMobile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '8px', padding: '5px', display: 'flex' }}><Shield size={13} color="white" /></div>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>AVPass</span>
                <span style={{ color: '#cbd5e1' }}>·</span>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{sectionTitle[activeSection]}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>AVPass</span>
                <span style={{ color: '#cbd5e1' }}>/</span>
                <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: 600 }}>{sectionTitle[activeSection]}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }}></div>
              {!isMobile && <span style={{ color: '#64748b', fontSize: '11px' }}>Online</span>}
            </div>
            <span style={{ color: '#e2e8f0' }}>|</span>
            {/* User badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', borderRadius: '10px', padding: '4px 10px 4px 5px', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>{authUser.username.charAt(0).toUpperCase()}</span>
              </div>
              {!isMobile && <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{authUser.username}</span>}
            </div>
            <button onClick={() => handleLogout('manual')}
              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {isMobile ? '⏻' : 'Sign Out'}
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: activeSection === 'idbuilder' ? '0' : isMobile ? '16px 12px 80px' : '24px' }}>
          {activeSection === 'home' && <HomePage savedIDs={savedIDs} employeeDatabase={employeeDatabase} onNavigate={setActiveSection} />}
          {activeSection === 'database' && <LoadDatabase employeeDatabase={employeeDatabase} setEmployeeDatabase={setEmployeeDatabase} />}
          {activeSection === 'idbuilder' && <IDBuilder editingID={editingID} onEditSaved={_id => { setEditingID(null); }} pendingTemplate={pendingTemplate} onTemplatLoaded={() => setPendingTemplate(null)} onBack={() => setActiveSection('home')} />}
          {activeSection === 'templates' && <TemplateManager onBack={() => setActiveSection('home')} />}
          {activeSection === 'accounts' && <AccountManager currentUser={authUser} />}
          {activeSection === 'idrequests' && <IDRequests currentUser={authUser} onGoToBuilder={req => {
            setEditingID(null);
            // Pre-populate the builder search with employee name from the request
            // by using a lightweight editingID with no front/back (fresh canvas)
            setEditingID({
              id: '',
              employeeName: req.employeeName,
              position: req.position,
              front: null as any,
              back: null as any,
              requestId: req.id,
              abasRequestId: req.abasRequestId,
              pictureUrl: req.pictureUrl,
              signatureUrl: req.signatureUrl
            });
            setActiveSection('idbuilder');
          }} />}
          {activeSection === 'idrecords' && <SavedIDs savedIDs={savedIDs} setSavedIDs={setSavedIDs} onEditInBuilder={entry => { setEditingID({ id: entry.id, employeeName: entry.employeeName, position: entry.position, front: entry.front, back: entry.back }); setActiveSection('idbuilder'); }} />}
        </div>

        {/* ── MOBILE BOTTOM NAV ── */}
        {isMobile && (
          <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', zIndex: 30, boxShadow: '0 -4px 24px rgba(0,0,0,0.08)' }} className="print:hidden">
            {navItems.map(item => (
              <button key={item.id} onClick={() => handleNav(item)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', border: 'none', background: 'transparent', cursor: 'pointer', color: activeSection === item.id ? item.color : '#94a3b8', transition: 'all 0.15s', position: 'relative', minHeight: '60px' }}>
                {activeSection === item.id && (
                  <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '3px', background: item.color, borderRadius: '0 0 4px 4px' }} />
                )}
                <div style={{ position: 'relative' }}>
                  {item.icon}
                  {item.badge != null && item.badge > 0 && (
                    <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: item.color, color: '#fff', fontSize: '9px', fontWeight: 700, padding: '1px 4px', borderRadius: '20px', minWidth: '14px', textAlign: 'center' }}>{item.badge > 99 ? '99+' : item.badge}</span>
                  )}
                </div>
                <span style={{ fontSize: '10px', fontWeight: activeSection === item.id ? 700 : 400, marginTop: '4px' }}>{item.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }
        tr:hover .row-actions { opacity: 1 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @media (max-width: 768px) {
          table { font-size: 12px !important; }
          th, td { padding: 8px 10px !important; }
        }
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; }
          table { border-collapse: collapse !important; width: 100% !important; }
          thead { display: table-header-group !important; }
          th, td { border: 1px solid #000 !important; color: #000 !important; background: #fff !important; padding: 8px !important; }
          tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          img { display: block !important; max-width: 100% !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}