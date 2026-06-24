import React from 'react';
import QRCode from 'qrcode';
import { Download, Loader2, Search, Settings, Image as ImageIcon, Save, Printer, RefreshCw, Undo, Redo, Grid, Magnet, X, MousePointer2, LayoutTemplate, Layers, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { API_URL } from '../../types';
import type { EmployeeRecord, IDField, IDSide, IDTemplate, EditingID } from '../../types';
import { resolveImg, hexToColorFilter, hexToColorFilterWhite } from '../../utils';

// ── DEFAULT FIELDS ──
const defaultFrontFields: IDField[] = [
  { id: 'nickname', label: 'First Name / Nickname', value: 'JESUS', x: 50, y: 62, fontSize: 22, color: '#ffffff', bold: true, italic: false, align: 'left', visible: false },
  { id: 'idnum',    label: 'ID Number',              value: 'ABISC-231003', x: 32, y: 92, fontSize: 10, color: '#ffffff', bold: false, italic: false, align: 'left', visible: true },
  { id: 'fullname', label: 'Full Name',               value: 'JESUS B. ILLUSTRISIMO', x: 13, y: 75, fontSize: 10, color: '#ffffff', bold: true, italic: false, align: 'left', visible: true },
  { id: 'position', label: 'Position / Designation',  value: 'ASSISTANT PORT ENGINEER', x: 32, y: 92, fontSize: 9, color: '#ffffff', bold: false, italic: false, align: 'left', visible: true },
  { id: 'company',  label: 'Company',                 value: '', x: 50, y: 88, fontSize: 8, color: '#ffffff', bold: false, italic: false, align: 'center', visible: false },
];

const defaultBackFields: IDField[] = [
  { id: 'emergency_num',    label: 'Emergency Number',         value: '09123456789',         x: 35, y: 20, fontSize: 10, color: '#ffffff', bold: false,  italic: false, align: 'center', visible: true },
  { id: 'emergency_person', label: 'Emergency Contact Person', value: 'Contact Person Name', x: 43, y: 15, fontSize: 10, color: '#ffffff', bold: false, italic: false, align: 'center', visible: true },
  { id: 'company_back',     label: 'Company',                  value: '',                    x: 50, y: 88, fontSize: 8,  color: '#ffffff', bold: false, italic: false, align: 'center', visible: false },
];

// ── SHARED STYLES & COMPONENTS ──
const inpStyle: React.CSSProperties = {
  width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', 
  padding: '8px 12px', color: '#0f172a', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
};

const SegmentedControl = ({ options, value, onChange }: { options: {label:string, value:string}[], value: string, onChange: (v:string)=>void }) => (
  <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', width: '100%' }}>
    {options.map(opt => {
      const active = value === opt.value;
      return (
        <button key={opt.value} onClick={(e) => { e.preventDefault(); onChange(opt.value); }}
          style={{
            flex: 1, padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            background: active ? '#fff' : 'transparent', color: active ? '#0f172a' : '#64748b',
            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}>
          {opt.label}
        </button>
      );
    })}
  </div>
);

// ── ACCORDION SECTION ──
const AccSection = React.memo(({ id, icon, title, open, onToggle, children }: {
  id: string; icon: React.ReactNode; title: string; open: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) => (
  <div style={{borderBottom:'1px solid #e2e8f0'}}>
    <button onClick={()=>onToggle(id)}
      style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',background:open?'#f8fafc':'#fff',border:'none',cursor:'pointer',textAlign:'left',transition:'background 0.2s'}}>
      <span style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'14px',fontWeight:600,color:open?'#667eea':'#475569'}}>
        <span style={{color:open?'#667eea':'#94a3b8'}}>{icon}</span>{title}
      </span>
      <span style={{color:'#94a3b8',fontSize:'11px',transform:open?'rotate(180deg)':'none',transition:'transform 0.2s'}}>▼</span>
    </button>
    {open && <div style={{padding:'16px 20px',background:'#fff',display:'flex',flexDirection:'column',gap:'12px'}}>{children}</div>}
  </div>
));

// ── LAYER EDITOR (Properties Panel) ──
interface LayerEditorProps { 
  layer: 'photo' | 'sig'; 
  side: IDSide; 
  onUpdate: (updates: Partial<IDSide>) => void; 
  customPhoto: string | null;
  setCustomPhoto: (url: string | null) => void;
  customSig: string | null;
  setCustomSig: (url: string | null) => void;
}
const LayerEditor = React.memo(({ layer, side: sd, onUpdate, customPhoto, setCustomPhoto, customSig, setCustomSig }: LayerEditorProps) => {
  const isPhoto = layer === 'photo';
  const accentColor = isPhoto ? '#3b82f6' : '#8b5cf6';

  const sliderRow = (lbl: string, val: number, min: number, max: number, key: string, accent: string) => (
    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
      <label style={{fontSize:'11px',color:'#64748b',minWidth:'64px',fontWeight:500}}>{lbl}</label>
      <input type="range" min={min} max={max} step={1} value={val} onChange={e=>onUpdate({[key]:Number(e.target.value)})} style={{flex:1,accentColor:accent}}/>
      <span style={{fontSize:'12px',fontWeight:600,color:'#0f172a',minWidth:'34px',textAlign:'right'}}>{val}{max===100&&min===0?'%':''}</span>
    </div>
  );
  const colorRow = (lbl: string, val: string, key: string) => (
    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
      <label style={{fontSize:'11px',color:'#64748b',minWidth:'64px',fontWeight:500}}>{lbl}</label>
      <input type="color" value={val} onChange={e=>onUpdate({[key]:e.target.value})} style={{width:'36px',height:'30px',border:'1px solid #e2e8f0',borderRadius:'6px',cursor:'pointer',padding:'2px',flexShrink:0,background:'#fff'}}/>
      <input type="text" value={val} onChange={e=>onUpdate({[key]:e.target.value})} style={{flex:1,background:'#fff',border:'1px solid #e2e8f0',borderRadius:'6px',padding:'6px 10px',fontSize:'12px',fontFamily:'monospace',outline:'none',color:'#0f172a'}}/>
    </div>
  );
  const panel = (title: string, children: React.ReactNode) => (
    <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'12px',padding:'16px',display:'flex',flexDirection:'column',gap:'12px',boxShadow:'0 1px 2px rgba(0,0,0,0.02)'}}>
      <div style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'2px'}}>{title}</div>
      {children}
    </div>
  );

  const customAsset = isPhoto ? customPhoto : customSig;
  const setCustomAsset = isPhoto ? setCustomPhoto : setCustomSig;
  const fileInputId = isPhoto ? 'prop-photo-upload' : 'prop-sig-upload';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomAsset(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'16px'}}>
      {panel(isPhoto ? 'Upload / Replace Photo' : 'Upload / Replace Signature',
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input 
            type="file" 
            accept="image/*" 
            id={fileInputId}
            onChange={handleFileChange} 
            style={{ display: 'none' }}
          />
          <label 
            htmlFor={fileInputId}
            style={{ 
              flex: 1, padding: '8px 12px', border: `1px dashed ${accentColor}`, borderRadius: '8px', 
              background: customAsset ? `${accentColor}10` : '#fff', color: accentColor, fontSize: '12px', 
              fontWeight: 600, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
              display: 'block'
            }}>
            {customAsset ? '✓ File Uploaded (Change)' : `📁 Upload ${isPhoto ? 'Photo' : 'Signature'}`}
          </label>
          {customAsset && (
            <button 
              onClick={() => setCustomAsset(null)} 
              style={{ 
                padding: '8px 12px', border: '1px solid #fca5a5', background: '#fef2f2', 
                color: '#ef4444', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' 
              }}>
              Reset
            </button>
          )}
        </div>
      )}
      {panel('Position & Size',
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
          {(isPhoto?[{l:'X %',k:'photoX',v:sd.photoX},{l:'Y %',k:'photoY',v:sd.photoY},{l:'Width %',k:'photoW',v:sd.photoW},{l:'Height %',k:'photoH',v:sd.photoH}]:[{l:'X %',k:'sigX',v:sd.sigX},{l:'Y %',k:'sigY',v:sd.sigY},{l:'Width %',k:'sigW',v:sd.sigW},{l:'Height %',k:'sigH',v:sd.sigH}]).map(({l,k,v})=>(
            <div key={k}>
              <label style={{fontSize:'11px',color:'#64748b',display:'block',marginBottom:'4px',fontWeight:500}}>{l}</label>
              <input type="number" value={v} min={0} max={100} onChange={e=>onUpdate({[k]:Number(e.target.value)})} style={{...inpStyle,padding:'6px 8px'}}/>
            </div>
          ))}
        </div>
      )}
      {!isPhoto && panel('Recolor Signature',
        <>
          <p style={{margin:'0 0 4px',fontSize:'11px',color:'#64748b',lineHeight:'1.5'}}>Select source ink type, then pick target color.</p>
          <div style={{display:'flex',gap:'6px'}}>
            <button onClick={()=>onUpdate({sigInkDark:true})} style={{flex:1,padding:'8px',borderRadius:'8px',border:(sd.sigInkDark!==false)?'1px solid #8b5cf6':'1px solid #e2e8f0',background:(sd.sigInkDark!==false)?'#8b5cf615':'#fff',color:(sd.sigInkDark!==false)?'#7c3aed':'#64748b',cursor:'pointer',fontSize:'12px',fontWeight:600}}>🖊 Dark Ink</button>
            <button onClick={()=>onUpdate({sigInkDark:false})} style={{flex:1,padding:'8px',borderRadius:'8px',border:(sd.sigInkDark===false)?'1px solid #8b5cf6':'1px solid #e2e8f0',background:(sd.sigInkDark===false)?'#8b5cf615':'#fff',color:(sd.sigInkDark===false)?'#7c3aed':'#64748b',cursor:'pointer',fontSize:'12px',fontWeight:600}}>✒ White Ink</button>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',background:sd.sigColorize?'#8b5cf615':'#fff',border:`1px solid ${sd.sigColorize?'#8b5cf6':'#e2e8f0'}`,borderRadius:'8px',cursor:'pointer',marginTop:'4px'}}>
            <input type="checkbox" checked={!!sd.sigColorize} onChange={e=>onUpdate({sigColorize:e.target.checked})} style={{accentColor:'#7c3aed',width:'16px',height:'16px'}}/>
            <span style={{fontSize:'13px',fontWeight:600,color:sd.sigColorize?'#7c3aed':'#475569'}}>{sd.sigColorize?'Recolor ON':'Recolor OFF'}</span>
          </label>
          {sd.sigColorize && colorRow('Target Color', sd.sigColorizeColor||'#ffffff', 'sigColorizeColor')}
          {sd.sigColorize && (
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'4px'}}>
              {[{c:'#ffffff',l:'White'},{c:'#0f172a',l:'Navy'},{c:'#000000',l:'Black'},{c:'#f59e0b',l:'Gold'}].map(({c,l})=>(
                <button key={c} onClick={()=>onUpdate({sigColorizeColor:c})} style={{padding:'4px 10px',borderRadius:'6px',border:`1px solid ${(sd.sigColorizeColor||'#ffffff')===c?accentColor:'#e2e8f0'}`,background:c,color:c==='#ffffff'||c==='#f59e0b'?'#0f172a':'#fff',fontSize:'11px',fontWeight:600,cursor:'pointer',boxShadow:'0 1px 2px rgba(0,0,0,0.05)'}}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {isPhoto && panel('Color Overlay',
        <>
          <label style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',background:sd.photoColorize?'#3b82f615':'#fff',border:`1px solid ${sd.photoColorize?'#3b82f6':'#e2e8f0'}`,borderRadius:'8px',cursor:'pointer'}}>
            <input type="checkbox" checked={!!sd.photoColorize} onChange={e=>onUpdate({photoColorize:e.target.checked})} style={{accentColor:'#3b82f6',width:'16px',height:'16px'}}/>
            <span style={{fontSize:'13px',fontWeight:600,color:sd.photoColorize?'#2563eb':'#475569'}}>{sd.photoColorize?'Colorize ON':'Colorize OFF'}</span>
          </label>
          {sd.photoColorize && colorRow('Color', sd.photoColorizeColor||'#000080', 'photoColorizeColor')}
        </>
      )}
      {panel('Brightness & Contrast',
        <>
          {sliderRow('Brightness',(isPhoto?sd.photoBrightness:sd.sigBrightness)??100,0,200,isPhoto?'photoBrightness':'sigBrightness','#f59e0b')}
          {sliderRow('Contrast',(isPhoto?sd.photoContrast:sd.sigContrast)??100,0,200,isPhoto?'photoContrast':'sigContrast','#06b6d4')}
          <button onClick={()=>onUpdate(isPhoto?{photoBrightness:100,photoContrast:100}:{sigBrightness:100,sigContrast:100})}
            style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',cursor:'pointer',fontSize:'11px',fontWeight:600,alignSelf:'flex-start',marginTop:'4px',transition:'background 0.2s'}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#f8fafc'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#fff'}>
            Reset Settings
          </button>
        </>
      )}
      {panel(isPhoto?'Photo Stroke':'Signature Border',
        <>
          {sliderRow('Width',(isPhoto?sd.photoStrokeWidth:sd.sigStrokeWidth)||0,0,16,isPhoto?'photoStrokeWidth':'sigStrokeWidth',accentColor)}
          {colorRow('Color',(isPhoto?sd.photoStrokeColor:sd.sigStrokeColor)||'#ffffff',isPhoto?'photoStrokeColor':'sigStrokeColor')}
        </>
      )}
      {panel(isPhoto?'Photo Shadow':'Signature Shadow',
        <>
          {sliderRow('Blur',(isPhoto?sd.photoShadowBlur:sd.sigShadowBlur)||0,0,30,isPhoto?'photoShadowBlur':'sigShadowBlur','#64748b')}
          {colorRow('Color',(isPhoto?sd.photoShadowColor:sd.sigShadowColor)||'#000000',isPhoto?'photoShadowColor':'sigShadowColor')}
        </>
      )}
      <label style={{display:'flex',alignItems:'center',gap:'10px',padding:'14px 16px',background:(isPhoto?sd.showPhoto:sd.showSig)?'#10b98115':'#ef444415',border:`1px solid ${(isPhoto?sd.showPhoto:sd.showSig)?'#10b981':'#ef4444'}`,borderRadius:'10px',cursor:'pointer'}}>
        <input type="checkbox" checked={isPhoto?sd.showPhoto:sd.showSig} onChange={e=>onUpdate(isPhoto?{showPhoto:e.target.checked}:{showSig:e.target.checked})} style={{accentColor:(isPhoto?sd.showPhoto:sd.showSig)?'#10b981':'#ef4444',width:'18px',height:'18px'}}/>
        <span style={{fontSize:'13px',fontWeight:600,color:(isPhoto?sd.showPhoto:sd.showSig)?'#059669':'#dc2626'}}>{(isPhoto?sd.showPhoto:sd.showSig)?'Layer is visible on card':'Layer is hidden from card'}</span>
      </label>
    </div>
  );
});

// ── FIELD EDITOR (Properties Panel) ──
interface FieldEditorProps { field: IDField; onUpdate: (id: string, updates: Partial<IDField>) => void; }
const FieldEditor = React.memo(({ field, onUpdate }: FieldEditorProps) => {
  const [localVal, setLocalVal] = React.useState(field.value);
  const lastId = React.useRef(field.id);
  if (field.id !== lastId.current) { lastId.current = field.id; setLocalVal(field.value); }
  const lastVal = React.useRef(field.value);
  if (field.value !== lastVal.current && field.value !== localVal) { lastVal.current = field.value; setLocalVal(field.value); }

  const panel = (title: string, children: React.ReactNode) => (
    <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'12px',padding:'16px',display:'flex',flexDirection:'column',gap:'12px',boxShadow:'0 1px 2px rgba(0,0,0,0.02)'}}>
      <div style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'2px'}}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 14px',background:'#f0f4ff',borderRadius:'10px',border:'1px solid #c7d2fe'}}>
        <span style={{fontSize:'16px'}}>✏️</span>
        <div>
          <div style={{fontSize:'10px',fontWeight:700,color:'#6366f1',textTransform:'uppercase',letterSpacing:'1px'}}>Editing Field</div>
          <div style={{fontSize:'13px',fontWeight:700,color:'#0f172a'}}>{field.label}</div>
        </div>
      </div>
      <div>
        <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#475569',marginBottom:'6px'}}>Text Content</label>
        <textarea value={localVal} rows={3} onChange={e=>{setLocalVal(e.target.value); onUpdate(field.id,{value:e.target.value});}} style={{...inpStyle,resize:'vertical',fontFamily:'inherit',lineHeight:'1.5'}}/> 
      </div>
      
      {panel('Typography', <>
        <div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
            <label style={{fontSize:'11px',fontWeight:600,color:'#475569'}}>Font Size</label>
            <span style={{fontSize:'12px',fontWeight:700,color:'#667eea'}}>{field.fontSize}px</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <button onClick={()=>onUpdate(field.id,{fontSize:Math.max(6,field.fontSize-1)})} style={{width:'32px',height:'32px',border:'1px solid #e2e8f0',borderRadius:'8px',background:'#fff',cursor:'pointer',fontSize:'16px',color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>−</button>
            <input type="range" min={6} max={60} value={field.fontSize} onChange={e=>onUpdate(field.id,{fontSize:Number(e.target.value)})} style={{flex:1,accentColor:'#667eea'}}/>
            <button onClick={()=>onUpdate(field.id,{fontSize:Math.min(60,field.fontSize+1)})} style={{width:'32px',height:'32px',border:'1px solid #e2e8f0',borderRadius:'8px',background:'#fff',cursor:'pointer',fontSize:'16px',color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>+</button>
          </div>
        </div>
        <div>
          <label style={{display:'block',fontSize:'11px',fontWeight:600,color:'#475569',marginBottom:'6px'}}>Color</label>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <input type="color" value={field.color} onChange={e=>onUpdate(field.id,{color:e.target.value})} style={{width:'40px',height:'40px',border:'1px solid #e2e8f0',borderRadius:'8px',cursor:'pointer',padding:'2px',flexShrink:0,background:'#fff'}}/>
            <input type="text" value={field.color} onChange={e=>onUpdate(field.id,{color:e.target.value})} style={{...inpStyle,fontFamily:'monospace',height:'40px'}}/>
          </div>
          <div style={{display:'flex',gap:'6px',marginTop:'10px',flexWrap:'wrap'}}>
            {['#ffffff','#0f172a','#667eea','#ec4899','#10b981','#f59e0b','#ef4444','#8b5cf6'].map(t=>(
              <button key={t} onClick={()=>onUpdate(field.id,{color:t})} style={{width:'24px',height:'24px',borderRadius:'50%',background:t,border:field.color===t?'2px solid #667eea':'1px solid #e2e8f0',cursor:'pointer',boxShadow:'0 1px 2px rgba(0,0,0,0.05)'}}/>
            ))}
          </div>
        </div>
        <div>
          <label style={{display:'block',fontSize:'11px',fontWeight:600,color:'#475569',marginBottom:'6px'}}>Font Family</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            {([
                {label:'Sans-Serif', value:"'Inter','Segoe UI',sans-serif"},
                {label:'Serif',      value:"Georgia,'Times New Roman',serif"},
                {label:'Monospace',  value:"'Courier New',monospace"},
                {label:'Narrow',     value:"'Arial Narrow',Impact,sans-serif"},
                {label:'BankGothic', value:"'Bebas Neue','Rajdhani',Impact,sans-serif"},
                {label:'Orbitron',   value:"'Orbitron','Rajdhani',sans-serif"},
              ] as const).map(f=>{
              const active=(field.fontFamily||"'Orbitron','Rajdhani',sans-serif").includes(f.value.split(',')[0]);
              return <button key={f.value} onClick={()=>onUpdate(field.id,{fontFamily:f.value})} style={{padding:'8px 4px',borderRadius:'8px',border:active?'1px solid #667eea':'1px solid #e2e8f0',background:active?'#667eea10':'#fff',color:active?'#667eea':'#64748b',cursor:'pointer',fontSize:'11px',fontWeight:active?600:400,fontFamily:f.value,textAlign:'center'}}>{f.label}</button>;
            })}
          </div>
        </div>
      </>)}

      <div>
        <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#475569',marginBottom:'8px'}}>Style & Alignment</label>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>onUpdate(field.id,{bold:!field.bold})} style={{flex:1,padding:'8px',borderRadius:'8px',border:field.bold?'1px solid #667eea':'1px solid #e2e8f0',background:field.bold?'#667eea10':'#fff',color:field.bold?'#667eea':'#64748b',cursor:'pointer',fontWeight:800,fontSize:'14px'}}>B</button>
          <button onClick={()=>onUpdate(field.id,{italic:!field.italic})} style={{flex:1,padding:'8px',borderRadius:'8px',border:field.italic?'1px solid #667eea':'1px solid #e2e8f0',background:field.italic?'#667eea10':'#fff',color:field.italic?'#667eea':'#64748b',cursor:'pointer',fontStyle:'italic',fontSize:'14px',fontWeight:600}}>I</button>
          <button onClick={()=>onUpdate(field.id,{underline:!field.underline})} style={{flex:1,padding:'8px',borderRadius:'8px',border:field.underline?'1px solid #667eea':'1px solid #e2e8f0',background:field.underline?'#667eea10':'#fff',color:field.underline?'#667eea':'#64748b',cursor:'pointer',textDecoration:'underline',fontSize:'14px',fontWeight:600}}>U</button>
          {(['left','center','right'] as const).map(a=>(
            <button key={a} onClick={()=>onUpdate(field.id,{align:a})} style={{flex:1,padding:'8px',borderRadius:'8px',border:field.align===a?'1px solid #667eea':'1px solid #e2e8f0',background:field.align===a?'#667eea10':'#fff',color:field.align===a?'#667eea':'#64748b',cursor:'pointer',fontSize:'13px',fontWeight:600}}>
              {a==='left'?'←':a==='center'?'↔':'→'}
            </button>
          ))}
        </div>
      </div>

      {panel('Position & Size',
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
          {([{label:'X %',key:'x',val:field.x,min:0,max:100,step:0.5},{label:'Y %',key:'y',val:field.y,min:0,max:100,step:0.5},{label:'Width %',key:'w',val:field.w??90,min:5,max:100,step:1}] as const).map(({label,key,val,min,max,step})=>(
            <div key={key}>
              <label style={{fontSize:'11px',color:'#64748b',display:'block',marginBottom:'4px',fontWeight:500}}>{label}</label>
              <input type="number" value={Math.round(Number(val)*10)/10} min={min} max={max} step={step} onChange={e=>onUpdate(field.id,{[key]:Number(e.target.value)})} style={{...inpStyle,padding:'6px 8px'}}/>
            </div>
          ))}
        </div>
      )}

      {panel('Effects', <>
        <div style={{marginBottom:'10px'}}>
          <div style={{fontSize:'11px',fontWeight:600,color:'#475569',marginBottom:'6px'}}>Text Stroke</div>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
            <input type="range" min={0} max={8} step={0.5} value={field.strokeWidth||0} onChange={e=>onUpdate(field.id,{strokeWidth:Number(e.target.value)})} style={{flex:1,accentColor:'#667eea'}}/>
            <span style={{fontSize:'12px',fontWeight:600,color:'#0f172a',minWidth:'28px',textAlign:'right'}}>{field.strokeWidth||0}px</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <input type="color" value={field.strokeColor||'#000000'} onChange={e=>onUpdate(field.id,{strokeColor:e.target.value})} style={{width:'36px',height:'30px',border:'1px solid #e2e8f0',borderRadius:'6px',cursor:'pointer',padding:'2px',flexShrink:0,background:'#fff'}}/>
            <input type="text" value={field.strokeColor||'#000000'} onChange={e=>onUpdate(field.id,{strokeColor:e.target.value})} style={{flex:1,background:'#fff',border:'1px solid #e2e8f0',borderRadius:'6px',padding:'6px 10px',fontSize:'12px',fontFamily:'monospace',color:'#0f172a',outline:'none'}}/>
          </div>
        </div>
        <div>
          <div style={{fontSize:'11px',fontWeight:600,color:'#475569',marginBottom:'6px'}}>Text Shadow</div>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
            <input type="range" min={0} max={20} step={1} value={field.shadowBlur||0} onChange={e=>onUpdate(field.id,{shadowBlur:Number(e.target.value)})} style={{flex:1,accentColor:'#64748b'}}/>
            <span style={{fontSize:'12px',fontWeight:600,color:'#0f172a',minWidth:'28px',textAlign:'right'}}>{field.shadowBlur||0}px</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <input type="color" value={field.shadowColor||'#000000'} onChange={e=>onUpdate(field.id,{shadowColor:e.target.value})} style={{width:'36px',height:'30px',border:'1px solid #e2e8f0',borderRadius:'6px',cursor:'pointer',padding:'2px',flexShrink:0,background:'#fff'}}/>
            <input type="text" value={field.shadowColor||'#000000'} onChange={e=>onUpdate(field.id,{shadowColor:e.target.value})} style={{flex:1,background:'#fff',border:'1px solid #e2e8f0',borderRadius:'6px',padding:'6px 10px',fontSize:'12px',fontFamily:'monospace',color:'#0f172a',outline:'none'}}/>
          </div>
        </div>
      </>)}

      <label style={{display:'flex',alignItems:'center',gap:'10px',padding:'14px 16px',background:field.visible?'#10b98115':'#ef444415',border:`1px solid ${field.visible?'#10b981':'#ef4444'}`,borderRadius:'10px',cursor:'pointer'}}>
        <input type="checkbox" checked={field.visible} onChange={e=>onUpdate(field.id,{visible:e.target.checked})} style={{accentColor:field.visible?'#10b981':'#ef4444',width:'18px',height:'18px'}}/>
        <span style={{fontSize:'13px',fontWeight:600,color:field.visible?'#059669':'#dc2626'}}>{field.visible?'Field is visible on card':'Field is hidden'}</span>
      </label>
    </div>
  );
});


// ── MAIN ID BUILDER COMPONENT ──
interface IDBuilderProps {
  records?: EmployeeRecord[]; // kept for backwards compat — employee search now uses API
  editingID?: EditingID | null;
  onEditSaved?: (id: string) => void;
  pendingTemplate?: IDTemplate | null;
  onTemplatLoaded?: () => void;
  onBack?: () => void;
}
export default function IDBuilder({ editingID, onEditSaved, pendingTemplate, onTemplatLoaded, onBack }: IDBuilderProps) {
  const CARD_W = 214, CARD_H = 340; // CR80 portrait: 54mm x 85.6mm

  // ── core state ──
  const [activeSide, setActiveSide] = React.useState<'front'|'back'>('front');
  const [customPhoto, setCustomPhoto] = React.useState<string|null>(null);
  const [customSig, setCustomSig] = React.useState<string|null>(null);
  const getMobileZoom = () => {
    if (typeof window === 'undefined') return 1.0;
    if (window.innerWidth < 768) {
      // Fit card with some padding on mobile
      return Math.min((window.innerWidth - 48) / 214, 1.2);
    }
    return 1.0;
  };
  const [zoom, setZoom] = React.useState(getMobileZoom);
  const [showGrid, setShowGrid]     = React.useState(false);
  const [snap, setSnap]             = React.useState(true);

  // ── accordion open state ──
  const [openSection, setOpenSection] = React.useState<string>('employee');
  const toggleSection = (s: string) => setOpenSection(p => p === s ? '' : s);

  // ── field interaction ──
  const [selectedFieldId, setSelectedFieldId] = React.useState<string|null>(null);
  const [selectedLayer,   setSelectedLayer]   = React.useState<'photo'|'sig'|null>(null);
  const [draggingId,      setDraggingId]      = React.useState<string|null>(null);
  const [dragOffset,      setDragOffset]      = React.useState({x:0,y:0});
  const [draggingLayer,   setDraggingLayer]   = React.useState<'photo'|'sig'|null>(null);
  const [layerDragOffset, setLayerDragOffset] = React.useState({x:0,y:0});
  const [resizingLayer,   setResizingLayer]   = React.useState<{layer:'photo'|'sig', handle:string}|null>(null);
  const [resizeStart,     setResizeStart]     = React.useState({mouseX:0,mouseY:0,w:0,h:0,x:0,y:0});
  const pendingDrag = React.useRef<{type:'field'|'layer', id:string, startX:number, startY:number, offset:{x:number,y:number}}|null>(null);
  const isDragging  = React.useRef(false);
  const cardFrontRef = React.useRef<HTMLDivElement>(null);
  const cardBackRef  = React.useRef<HTMLDivElement>(null);

  // ── employee (API-driven) ──
  const [selectedEmployee, setSelectedEmployee] = React.useState<EmployeeRecord|null>(null);
  const [empSearch,        setEmpSearch]         = React.useState('');
  const empSearchRef = React.useRef<HTMLInputElement>(null);
  const [showEmpDrop,      setShowEmpDrop]       = React.useState(false);
  const [empResults,       setEmpResults]        = React.useState<EmployeeRecord[]>([]);
  const [empLoading,       setEmpLoading]        = React.useState(false);
  const empDebounceRef = React.useRef<ReturnType<typeof setTimeout>|null>(null);

  const fetchEmployees = React.useCallback((query: string) => {
    if (empDebounceRef.current) clearTimeout(empDebounceRef.current);
    empDebounceRef.current = setTimeout(async () => {
      setEmpLoading(true);
      try {
        const params = new URLSearchParams({ order: 'asc', sort: 'id' });
        if (query.trim()) params.append('search', query.trim());
        const res = await fetch(`${API_URL}/employees?${params}`);
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const list: EmployeeRecord[] = (Array.isArray(data) ? data : (data.data ?? [])).map((e: any) => ({
          id: Number(e.id),
          name: e.full_name ?? '',
          position: e.position ?? '',
          empCode: e.employee_id ?? '',
          company: e.company ?? '',
          indication: e.indication ?? '',
          photo: e.picture || null,
          signature: e.signature || null,
          emergency_contact_num: e.emergency_contact_num || '',
          emergency_contact_person: e.emergency_contact_person || '',
        } as any));
        setEmpResults(list);
      } catch { setEmpResults([]); }
      finally { setEmpLoading(false); }
    }, 350);
  }, []);

  const getInitialFront = (): IDSide => {
    if (editingID) {
      if (editingID.front) return editingID.front;
      const fields = defaultFrontFields.map(f => {
        if (f.id === 'fullname') return { ...f, value: editingID.employeeName };
        if (f.id === 'nickname') {
          const commaIdx = editingID.employeeName.indexOf(',');
          let firstName = editingID.employeeName;
          if (commaIdx !== -1) {
            const afterComma = editingID.employeeName.slice(commaIdx + 1).trim();
            firstName = afterComma.split(' ')[0] || afterComma;
          }
          return { ...f, value: firstName };
        }
        if (f.id === 'position') return { ...f, value: editingID.position || '' };
        return f;
      });
      return {
        background: null, fields,
        photoX: 50, photoY: 49, photoW: 70, photoH: 50, showPhoto: true,
        sigX: 35, sigY: 86, sigW: 40, sigH: 8, showSig: true,
      };
    }
    return {
      background: null, fields: defaultFrontFields,
      photoX: 50, photoY: 49, photoW: 70, photoH: 50, showPhoto: true,
      sigX: 35, sigY: 86, sigW: 40, sigH: 8, showSig: true,
    };
  };

  const getInitialBack = (): IDSide => {
    if (editingID) {
      if (editingID.back) return editingID.back;
      return {
        background: null, fields: defaultBackFields,
        photoX: 50, photoY: 49, photoW: 70, photoH: 50, showPhoto: false,
        sigX: 35, sigY: 86, sigW: 40, sigH: 8, showSig: false,
        showQR: true, qrX: 50, qrY: 42, qrSize: 70,
        qrUrl: 'https://employee.abas.ph/verify/',
        qrFg: '#000000', qrBg: '#ffffff',
      };
    }
    return {
      background: null, fields: defaultBackFields,
      photoX: 50, photoY: 49, photoW: 70, photoH: 50, showPhoto: false,
      sigX: 35, sigY: 86, sigW: 40, sigH: 8, showSig: false,
      showQR: true, qrX: 50, qrY: 42, qrSize: 70,
      qrUrl: 'https://employee.abas.ph/verify/',
      qrFg: '#000000', qrBg: '#ffffff',
    };
  };

  // ── card data ──
  const [front, setFront] = React.useState<IDSide>(getInitialFront);
  const [back, setBack] = React.useState<IDSide>(getInitialBack);
  // Pre-fill employee name from editingID
  const [_editingIDRef] = React.useState(editingID);

  // ── history ──
  const [history,    setHistory]    = React.useState<{front:IDSide;back:IDSide}[]>([]);
  const [historyIdx, setHistoryIdx] = React.useState(-1);
  const pushHistory = React.useCallback((f:IDSide,b:IDSide) => {
    setHistory(p => [...p.slice(0,historyIdx+1),{front:f,back:b}].slice(-40));
    setHistoryIdx(p => Math.min(p+1,39));
  },[historyIdx]);
  const undo = () => { if(historyIdx<=0) return; const i=historyIdx-1; setFront(history[i].front); setBack(history[i].back); setHistoryIdx(i); };
  const redo = () => { if(historyIdx>=history.length-1) return; const i=historyIdx+1; setFront(history[i].front); setBack(history[i].back); setHistoryIdx(i); };

  React.useEffect(() => {
    const h = (e:KeyboardEvent) => {
      if ((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo();}
      if ((e.ctrlKey||e.metaKey)&&e.key==='y'){e.preventDefault();redo();}
    };
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  });

  // ── templates ──
  const [templates,       setTemplates]       = React.useState<IDTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = React.useState(false);
  const [confirmLoad, setConfirmLoad] = React.useState<any>(null); // pending template to load
  React.useEffect(()=>{ fetch(`${API_URL}/templates`).then(r=>r.ok?r.json():[]).then(setTemplates).catch(()=>{}); },[]);

  // ── notifications ──
  const [msg,       setMsg]       = React.useState<{type:'success'|'error';text:string}|null>(null);
  const [savingID,    setSavingID]    = React.useState(false);
  const [qrGenerating, setQrGenerating] = React.useState(false);
  const [showFlip,  setShowFlip]  = React.useState(false);

  // ── Mobile responsive ──
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [mobileTab, setMobileTab] = React.useState<'layers'|'canvas'|'props'>('canvas');
  React.useEffect(() => {
    const h = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setZoom(Math.min((window.innerWidth - 48) / 214, 1.2));
      else setZoom(1.0);
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ── Load saved ID data when editing ──
  React.useEffect(() => {
    if (_editingIDRef) {
      setEmpSearch(_editingIDRef.employeeName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load pending template from TemplateManager (ask first) ──
  React.useEffect(() => {
    if (pendingTemplate) {
      setConfirmLoad(pendingTemplate);
    }
  }, [pendingTemplate]);
  // ── QR Code ──
  const PLACEHOLDER_QR = 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ffffff"/><rect x="5" y="5" width="35" height="35" fill="none" stroke="#000" stroke-width="4"/><rect x="13" y="13" width="19" height="19" fill="#000"/><rect x="60" y="5" width="35" height="35" fill="none" stroke="#000" stroke-width="4"/><rect x="68" y="13" width="19" height="19" fill="#000"/><rect x="5" y="60" width="35" height="35" fill="none" stroke="#000" stroke-width="4"/><rect x="13" y="68" width="19" height="19" fill="#000"/><rect x="60" y="60" width="8" height="8" fill="#000"/><rect x="72" y="60" width="8" height="8" fill="#000"/><rect x="84" y="60" width="8" height="8" fill="#000"/><rect x="60" y="72" width="8" height="8" fill="#000"/><rect x="84" y="72" width="8" height="8" fill="#000"/><rect x="60" y="84" width="8" height="8" fill="#000"/><rect x="72" y="84" width="8" height="8" fill="#000"/><rect x="84" y="84" width="8" height="8" fill="#000"/><text x="50" y="54" text-anchor="middle" fill="#94a3b8" font-size="7" font-family="sans-serif">QR CODE</text></svg>`);
  const [qrDataUrl, setQrDataUrl] = React.useState<string|null>(PLACEHOLDER_QR);
  const selectedEmpCode = React.useRef<string>('');

  const generateQR = React.useCallback(async (empCode: string, url: string, fg: string, bg: string) => {
    if (!empCode) { setQrDataUrl(PLACEHOLDER_QR); return; }
    setQrGenerating(true);
    try {
      let token = empCode;
      try {
        const hashRes = await fetch('/api/hash/' + encodeURIComponent(empCode));
        if (hashRes.ok) {
          const hashData = await hashRes.json();
          if (hashData.hash) token = hashData.hash;
        }
      } catch { /* fall back to raw empCode if server unreachable */ }

      const base = url.endsWith('/') ? url.slice(0, -1) : url;
      const fullUrl = base + '/' + token;
      const dataUrl = await QRCode.toDataURL(fullUrl, {
        width: 200, margin: 1,
        color: { dark: fg || '#000000', light: bg || '#ffffff' }
      });
      setQrDataUrl(dataUrl);
    } catch { setQrDataUrl(PLACEHOLDER_QR); }
    finally { setQrGenerating(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Regenerate QR when employee or QR settings change
  React.useEffect(() => {
    const empCode = selectedEmployee?.empCode || '';
    selectedEmpCode.current = empCode;
    generateQR(empCode, back.qrUrl || 'https://employee.abas.ph/verify/', back.qrFg || '#000000', back.qrBg || '#ffffff');
  }, [selectedEmployee, back.qrUrl, back.qrFg, back.qrBg, generateQR]);

  const [flipFace,  setFlipFace]  = React.useState<'front'|'back'>('front');
  const [flipAnim,  setFlipAnim]  = React.useState(false);
  const [frontUrl,  setFrontUrl]  = React.useState<string|null>(null);
  const [backUrl,   setBackUrl]   = React.useState<string|null>(null);

  React.useEffect(()=>{
    if(!showFlip) return;
    (async()=>{
      const [f,b] = await Promise.all([renderSide('front'),renderSide('back')]);
      setFrontUrl(f); setBackUrl(b); setFlipFace('front'); setFlipAnim(false);
    })();
  },[showFlip]);

  const doFlip = ()=>{
    setFlipAnim(true);
    setTimeout(()=>{ setFlipFace(p=>p==='front'?'back':'front'); setFlipAnim(false); },300);
  };

  const handlePrint = async()=>{
    const [fUrl, bUrl] = await Promise.all([renderSide('front'), renderSide('back')]);
    const win = window.open('','_blank');
    if(!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Print ID Card</title>
    <style>
      @page { size: 54mm 85.6mm; margin: 0; }
      * { margin:0; padding:0; box-sizing:border-box; }
      body { background:#fff; }
      .card { width:54mm; height:85.6mm; position:relative; overflow:hidden; break-after:page; }
      .card img { width:100%; height:100%; object-fit:fill; display:block; }
      @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    </style></head><body>
    <div class="card"><img src="${fUrl}"/></div>
    <div class="card"><img src="${bUrl}"/></div>
    </body></html>`);
    win.document.close();
    setTimeout(()=>win.print(), 500);
  };
  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),3000); };

  // ── helpers ──
  const side    = activeSide==='front' ? front : back;
  const setSide = activeSide==='front' ? setFront : setBack;
  const activeRef = activeSide==='front' ? cardFrontRef : cardBackRef;
  const selectedField = side.fields.find(f=>f.id===selectedFieldId)||null;

  const updateField = (id:string, updates:Partial<IDField>) =>
    setSide(p=>({...p, fields:p.fields.map(f=>f.id===id?{...f,...updates}:f)}));
  const updateSideProps = (updates:Partial<IDSide>) =>
    setSide(p=>({...p,...updates}));

  const autoFill = (emp:EmployeeRecord) => {
    setSelectedEmployee(emp); setEmpSearch(emp.name); setShowEmpDrop(false);
    setCustomPhoto(null);
    setCustomSig(null);
    if(empSearchRef.current) empSearchRef.current.value = emp.name;
    // Fill front card fields
    setFront(p=>({...p, fields:p.fields.map(f=>{
      if(f.id==='fullname') return {...f, value: emp.name};
      if(f.id==='nickname') {
        const commaIdx = emp.name.indexOf(',');
        let firstName = emp.name;
        if (commaIdx !== -1) {
          const afterComma = emp.name.slice(commaIdx + 1).trim();
          firstName = afterComma.split(' ')[0] || afterComma;
        }
        return {...f, value: firstName};
      }
      if(f.id==='position') return {...f, value: emp.position || ''};
      if(f.id==='idnum' && emp.empCode) return {...f, value: emp.empCode};
      if(f.id==='company') return {...f, value: (emp as any).company || ''};
      return f;
    })}));
    // Fill back card fields from API data
    const emergencyNum    = (emp as any).emergency_contact_num    || '';
    const emergencyPerson = (emp as any).emergency_contact_person || '';
    const company         = (emp as any).company || '';
    setBack(p=>({...p, fields:p.fields.map(f=>{
      if(f.id==='emergency_num'    && emergencyNum)    return {...f, value: emergencyNum};
      if(f.id==='emergency_person' && emergencyPerson) return {...f, value: emergencyPerson};
      if(f.id==='company_back')                        return {...f, value: company};
      return f;
    })}));
  };


  const employeePhoto = customPhoto || (selectedEmployee?.photo 
    ? resolveImg(selectedEmployee.photo) 
    : (editingID?.pictureUrl ? resolveImg(editingID.pictureUrl) : null));
  const employeeSig   = customSig || (selectedEmployee?.signature 
    ? resolveImg(selectedEmployee.signature) 
    : (editingID?.signatureUrl ? resolveImg(editingID.signatureUrl) : null));

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSigUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomSig(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFieldMouseDown = (e:React.MouseEvent, fieldId:string) => {
    if (isMobile) setMobileTab('props');
    e.stopPropagation(); e.preventDefault();
    setSelectedFieldId(fieldId); setSelectedLayer(null);
    const rect = activeRef.current!.getBoundingClientRect();
    const f = side.fields.find(f=>f.id===fieldId)!;
    const offset = { x: e.clientX-rect.left-(f.x/100*CARD_W*zoom), y: e.clientY-rect.top-(f.y/100*CARD_H*zoom) };
    isDragging.current = false;
    pendingDrag.current = { type:'field', id:fieldId, startX:e.clientX, startY:e.clientY, offset };
  };

  const handleLayerMouseDown = (e:React.MouseEvent, layer:'photo'|'sig') => {
    if (isMobile) setMobileTab('props');
    e.stopPropagation(); e.preventDefault();
    setSelectedLayer(layer); setSelectedFieldId(null);
    const rect = activeRef.current!.getBoundingClientRect();
    const xKey = layer==='photo'?'photoX':'sigX', yKey = layer==='photo'?'photoY':'sigY';
    const cx = (side as any)[xKey], cy = (side as any)[yKey];
    const offset = { x: e.clientX-rect.left-(cx/100*CARD_W*zoom), y: e.clientY-rect.top-(cy/100*CARD_H*zoom) };
    isDragging.current = false;
    pendingDrag.current = { type:'layer', id:layer, startX:e.clientX, startY:e.clientY, offset };
  };

  const handleResizeMouseDown = (e:React.MouseEvent, layer:'photo'|'sig', handle:string) => {
    e.stopPropagation(); e.preventDefault();
    pendingDrag.current = null;
    const wKey=layer==='photo'?'photoW':'sigW', hKey=layer==='photo'?'photoH':'sigH';
    const xKey=layer==='photo'?'photoX':'sigX', yKey=layer==='photo'?'photoY':'sigY';
    setResizingLayer({layer, handle});
    setResizeStart({
      mouseX:e.clientX, mouseY:e.clientY,
      w:(side as any)[wKey], h:(side as any)[hKey],
      x:(side as any)[xKey], y:(side as any)[yKey],
    });
  };

  const handleMouseMove = React.useCallback((e:MouseEvent) => {
    const THRESHOLD = 4;
    if(pendingDrag.current && !isDragging.current) {
      const dx = Math.abs(e.clientX - pendingDrag.current.startX);
      const dy = Math.abs(e.clientY - pendingDrag.current.startY);
      if(dx > THRESHOLD || dy > THRESHOLD) {
        isDragging.current = true;
        if(pendingDrag.current.type === 'field') {
          setDraggingId(pendingDrag.current.id); setDragOffset(pendingDrag.current.offset);
        } else {
          setDraggingLayer(pendingDrag.current.id as 'photo'|'sig'); setLayerDragOffset(pendingDrag.current.offset);
        }
      }
      return;
    }

    if(draggingId && activeRef.current) {
      const rect = activeRef.current.getBoundingClientRect();
      let x = (e.clientX-rect.left-dragOffset.x)/zoom/CARD_W*100;
      let y = (e.clientY-rect.top -dragOffset.y)/zoom/CARD_H*100;
      if(snap){ x=Math.round(x/5)*5; y=Math.round(y/5)*5; }
      x=Math.max(0,Math.min(100,x)); y=Math.max(0,Math.min(100,y));
      setSide(p=>({...p, fields:p.fields.map(f=>f.id===draggingId?{...f,x,y}:f)}));
      return;
    }
    if(draggingLayer && activeRef.current) {
      const rect = activeRef.current.getBoundingClientRect();
      let x = (e.clientX-rect.left-layerDragOffset.x)/zoom/CARD_W*100;
      let y = (e.clientY-rect.top -layerDragOffset.y)/zoom/CARD_H*100;
      if(snap){ x=Math.round(x/5)*5; y=Math.round(y/5)*5; }
      x=Math.max(0,Math.min(100,x)); y=Math.max(0,Math.min(100,y));
      const xKey=draggingLayer==='photo'?'photoX':'sigX', yKey=draggingLayer==='photo'?'photoY':'sigY';
      setSide(p=>({...p, [xKey]:x, [yKey]:y}));
      return;
    }
    if(resizingLayer && activeRef.current) {
      const {layer, handle} = resizingLayer;
      const dxPx = e.clientX-resizeStart.mouseX, dyPx = e.clientY-resizeStart.mouseY;
      const dx = dxPx/zoom/CARD_W*100, dy = dyPx/zoom/CARD_H*100;
      const wKey=layer==='photo'?'photoW':'sigW', hKey=layer==='photo'?'photoH':'sigH';
      const xKey=layer==='photo'?'photoX':'sigX', yKey=layer==='photo'?'photoY':'sigY';
      let w=resizeStart.w, h=resizeStart.h, x=resizeStart.x, y=resizeStart.y;
      if(handle.includes('e')) w = Math.max(5, resizeStart.w + dx*2);
      if(handle.includes('w')) w = Math.max(5, resizeStart.w - dx*2);
      if(handle.includes('s')) h = Math.max(5, resizeStart.h + dy*2);
      if(handle.includes('n')) h = Math.max(5, resizeStart.h - dy*2);
      if(snap){ w=Math.round(w/5)*5; h=Math.round(h/5)*5; }
      setSide(p=>({...p, [wKey]:w, [hKey]:h, [xKey]:x, [yKey]:y}));
    }
  },[draggingId,draggingLayer,resizingLayer,dragOffset,layerDragOffset,resizeStart,zoom,activeSide,snap]);

  const handleMouseUp = React.useCallback(()=>{
    const wasDragging = isDragging.current;
    pendingDrag.current = null;
    isDragging.current  = false;
    if(draggingId||draggingLayer||resizingLayer||wasDragging){
      setDraggingId(null); setDraggingLayer(null); setResizingLayer(null);
      if(wasDragging) pushHistory(front,back);
    }
  },[draggingId,draggingLayer,resizingLayer,front,back,pushHistory]);

  React.useEffect(()=>{
    window.addEventListener('mousemove',handleMouseMove);
    window.addEventListener('mouseup',handleMouseUp);
    return ()=>{ window.removeEventListener('mousemove',handleMouseMove); window.removeEventListener('mouseup',handleMouseUp); };
  },[handleMouseMove,handleMouseUp]);

  React.useEffect(()=>{
    const onKey = (e:KeyboardEvent) => {
      const arrows = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
      if(!arrows.includes(e.key)) return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if(tag==='INPUT'||tag==='TEXTAREA') return;
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      const dx = e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0;
      const dy = e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;
      if(selectedFieldId) {
        setSide(p=>({...p, fields:p.fields.map(f=>f.id===selectedFieldId
          ?{...f, x:Math.max(0,Math.min(100,f.x+dx)), y:Math.max(0,Math.min(100,f.y+dy))}
          :f)}));
      } else if(selectedLayer) {
        const xKey=selectedLayer==='photo'?'photoX':'sigX', yKey=selectedLayer==='photo'?'photoY':'sigY';
        setSide(p=>({...p, [xKey]:Math.max(0,Math.min(100,(p as any)[xKey]+dx)), [yKey]:Math.max(0,Math.min(100,(p as any)[yKey]+dy))}));
      }
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[selectedFieldId,selectedLayer,activeSide]);

  const renderSide = React.useCallback(async(which:'front'|'back'):Promise<string>=>{
    const sd = which==='front' ? front : back;
    const SCALE = 4;
    const W = CARD_W * SCALE;
    const H = CARD_H * SCALE;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    const li = (src:string) => new Promise<HTMLImageElement>((res,rej)=>{
      const img = new Image(); img.crossOrigin='anonymous';
      img.onload=()=>res(img); img.onerror=rej; img.src=src;
    });

    if (sd.background) {
      try {
        const img = await li(sd.background);
        const iw = img.naturalWidth, ih = img.naturalHeight;
        const scale = Math.max(CARD_W/iw, CARD_H/ih);
        const sw = iw*scale, sh = ih*scale;
        const sx = (CARD_W - sw)/2, sy = (CARD_H - sh)/2;
        ctx.drawImage(img, sx, sy, sw, sh);
      } catch { ctx.fillStyle='#cc0000'; ctx.fillRect(0,0,CARD_W,CARD_H); }
    } else {
      const grd = ctx.createLinearGradient(0,0,CARD_W*0.7,CARD_H);
      if(which==='front'){ grd.addColorStop(0,'#b91c1c'); grd.addColorStop(0.6,'#ef4444'); grd.addColorStop(1,'#f97316'); }
      else { grd.addColorStop(0,'#f1f5f9'); grd.addColorStop(1,'#e2e8f0'); }
      ctx.fillStyle=grd; ctx.fillRect(0,0,CARD_W,CARD_H);
    }

    const photo = which==='front' ? employeePhoto : null;

    const drawImg = (img:HTMLImageElement, x:number, y:number, w:number, h:number,
      opts:{strokeW?:number,strokeC?:string,shadowBlur?:number,shadowC?:string,overlayC?:string,overlayOp?:number}) => {
      ctx.save();
      if(opts.shadowBlur&&opts.shadowBlur>0){ ctx.shadowColor=opts.shadowC||'rgba(0,0,0,0.6)'; ctx.shadowBlur=opts.shadowBlur; }
      if(opts.strokeW&&opts.strokeW>0){ ctx.strokeStyle=opts.strokeC||'#000000'; ctx.lineWidth=opts.strokeW; ctx.strokeRect(x,y,w,h); }
      ctx.drawImage(img,x,y,w,h);
      ctx.shadowBlur=0;
      if(opts.overlayC&&opts.overlayOp&&opts.overlayOp>0){ ctx.globalAlpha=opts.overlayOp/100; ctx.fillStyle=opts.overlayC; ctx.fillRect(x,y,w,h); ctx.globalAlpha=1; }
      ctx.restore();
    };

    const drawSigRecolor = async(imgSrc:string, x:number, y:number, w:number, h:number, color:string, inkDark:boolean,
      opts:{strokeW?:number,strokeC?:string,shadowBlur?:number,shadowC?:string}) => {
      const img = await li(imgSrc);
      const imgAR=img.naturalWidth/img.naturalHeight, boxAR=w/h;
      let dw=w,dh=h,dx=x,dy=y;
      if(imgAR>boxAR){dh=w/imgAR;dy=y+(h-dh)/2;}else{dw=h*imgAR;dx=x+(w-dw)/2;}
      const oc=document.createElement('canvas'); oc.width=Math.round(dw*SCALE); oc.height=Math.round(dh*SCALE);
      const oc2=oc.getContext('2d')!;
      oc2.drawImage(img,0,0,oc.width,oc.height);
      const pd=oc2.getImageData(0,0,oc.width,oc.height); const d=pd.data;
      const tr=parseInt(color.slice(1,3),16),tg=parseInt(color.slice(3,5),16),tb=parseInt(color.slice(5,7),16);
      for(let i=0;i<d.length;i+=4){
        const lum=d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114;
        const oa=d[i+3]/255;
        const str=inkDark?(1-lum/255)*oa:(lum/255)*oa;
        d[i]=tr;d[i+1]=tg;d[i+2]=tb;d[i+3]=Math.round(str*255);
      }
      oc2.putImageData(pd,0,0);
      ctx.save();
      if(opts.shadowBlur&&opts.shadowBlur>0){ctx.shadowColor=opts.shadowC||'rgba(0,0,0,0.5)';ctx.shadowBlur=opts.shadowBlur;}
      if(opts.strokeW&&opts.strokeW>0){ctx.strokeStyle=opts.strokeC||'#000';ctx.lineWidth=opts.strokeW;ctx.strokeRect(dx,dy,dw,dh);}
      ctx.drawImage(oc,dx,dy,dw,dh);
      ctx.shadowBlur=0; ctx.restore();
    };

    if(sd.showPhoto&&photo){
      try{
        const img=await li(photo);
        const pw=sd.photoW/100*CARD_W,ph=sd.photoH/100*CARD_H;
        const px=sd.photoX/100*CARD_W-pw/2,py=sd.photoY/100*CARD_H-ph/2;
        // Use objectFit:contain logic (match HTML preview)
        const imgAR=img.naturalWidth/img.naturalHeight, boxAR=pw/ph;
        let dw=pw,dh=ph,dx=px,dy=py;
        if(imgAR>boxAR){dh=pw/imgAR;dy=py+(ph-dh)/2;}else{dw=ph*imgAR;dx=px+(pw-dw)/2;}
        // Apply brightness/contrast filter
        if((sd.photoBrightness&&sd.photoBrightness!==100)||(sd.photoContrast&&sd.photoContrast!==100)){
          const oc=document.createElement('canvas');oc.width=Math.round(dw*4);oc.height=Math.round(dh*4);
          const oc2=oc.getContext('2d')!;
          oc2.filter=`brightness(${(sd.photoBrightness??100)/100}) contrast(${(sd.photoContrast??100)/100})`;
          oc2.drawImage(img,0,0,oc.width,oc.height);
          drawImg(oc as unknown as HTMLImageElement,dx,dy,dw,dh,{strokeW:sd.photoStrokeWidth,strokeC:sd.photoStrokeColor,shadowBlur:sd.photoShadowBlur,shadowC:sd.photoShadowColor,overlayC:sd.photoOverlayColor,overlayOp:sd.photoOverlayOpacity});
        } else {
          drawImg(img,dx,dy,dw,dh,{strokeW:sd.photoStrokeWidth,strokeC:sd.photoStrokeColor,shadowBlur:sd.photoShadowBlur,shadowC:sd.photoShadowColor,overlayC:sd.photoOverlayColor,overlayOp:sd.photoOverlayOpacity});
        }
      }catch{}
    }

    if(sd.showSig&&employeeSig){
      try{
        const sw=sd.sigW/100*CARD_W,sh=sd.sigH/100*CARD_H;
        const sx=sd.sigX/100*CARD_W-sw/2,sy=sd.sigY/100*CARD_H-sh/2;
        if(sd.sigColorize&&sd.sigColorizeColor){
          await drawSigRecolor(employeeSig,sx,sy,sw,sh,sd.sigColorizeColor,sd.sigInkDark!==false,{strokeW:sd.sigStrokeWidth,strokeC:sd.sigStrokeColor,shadowBlur:sd.sigShadowBlur,shadowC:sd.sigShadowColor});
        } else {
          const img=await li(employeeSig);
          // Use objectFit:contain for sig too
          const sImgAR=img.naturalWidth/img.naturalHeight, sBoxAR=sw/sh;
          let sdw=sw,sdh=sh,sdx=sx,sdy=sy;
          if(sImgAR>sBoxAR){sdh=sw/sImgAR;sdy=sy+(sh-sdh)/2;}else{sdw=sh*sImgAR;sdx=sx+(sw-sdw)/2;}
          drawImg(img,sdx,sdy,sdw,sdh,{strokeW:sd.sigStrokeWidth,strokeC:sd.sigStrokeColor,shadowBlur:sd.sigShadowBlur,shadowC:sd.sigShadowColor});
        }
      }catch{}
    }

    // ── QR Code on canvas ──
    if(sd.showQR && qrDataUrl && which==='back') {
      try {
        const qrImg = await li(qrDataUrl);
        const qSize = (sd.qrSize||70)/100*CARD_W;
        const qx = (sd.qrX||50)/100*CARD_W - qSize/2;
        const qy = (sd.qrY||42)/100*CARD_H - qSize/2;
        ctx.drawImage(qrImg, qx, qy, qSize, qSize);
      } catch {}
    }

    sd.fields.filter(f=>f.visible).forEach(f=>{
      const ff=f.fontFamily||"'Inter','Segoe UI',sans-serif";
      ctx.font=`${f.italic?'italic ':''}${f.bold?'bold ':''}${f.fontSize}px ${ff}`;
      ctx.textAlign=f.align;
      ctx.textBaseline='middle';
      const x=f.align==='right'?(100-f.x)/100*CARD_W:f.x/100*CARD_W;
      const cy=f.y/100*CARD_H; // center Y (matches HTML translateY(-50%))
      const maxW=((f.w??90)/100)*CARD_W;
      const words=f.value.split(' '); let line='',lines:string[]=[];
      for(const ww of words){ const t=line+(line?' ':'')+ww; if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=ww;}else line=t; }
      lines.push(line);
      // Total block height centered at cy
      const lineH=f.fontSize*1.3;
      const totalH=lines.length*lineH;
      const startY=cy - totalH/2 + lineH/2;
      if(f.shadowBlur&&f.shadowBlur>0){ctx.shadowColor=f.shadowColor||'rgba(0,0,0,0.6)';ctx.shadowBlur=f.shadowBlur;}else{ctx.shadowBlur=0;}
      lines.forEach((l,i)=>{
        const ly=startY+i*lineH;
        if(f.overlayBg&&f.overlayOpacity&&f.overlayOpacity>0){
          const mw=ctx.measureText(l).width;
          const ox=f.align==='center'?x-mw/2:f.align==='right'?x-mw:x;
          ctx.globalAlpha=f.overlayOpacity/100; ctx.fillStyle=f.overlayBg;
          ctx.fillRect(ox-4,ly-f.fontSize/2,mw+8,f.fontSize*1.2); ctx.globalAlpha=1;
        }
        if(f.strokeWidth&&f.strokeWidth>0){ctx.strokeStyle=f.strokeColor||'#000';ctx.lineWidth=f.strokeWidth;ctx.lineJoin='round';ctx.strokeText(l,x,ly);}
        ctx.fillStyle=f.color; ctx.fillText(l,x,ly);
        if(f.underline){
          const mw=ctx.measureText(l).width;
          const ux=f.align==='center'?x-mw/2:f.align==='right'?x-mw:x;
          ctx.save();ctx.strokeStyle=f.color;ctx.lineWidth=Math.max(0.5,f.fontSize*0.06);
          ctx.beginPath();ctx.moveTo(ux,ly+f.fontSize*0.6);ctx.lineTo(ux+mw,ly+f.fontSize*0.6);ctx.stroke();ctx.restore();
        }
      });
      ctx.shadowBlur=0;
    });

    return cv.toDataURL('image/jpeg', 0.95);
  },[front,back,employeePhoto,employeeSig]);

  const captureCard = async (which: 'front'|'back'): Promise<string> => {
    const ref = which === 'front' ? cardFrontRef : cardBackRef;
    const h2c = (window as any).html2canvas;
    if (!ref.current || !h2c) return renderSide(which);
    try {
      const canvas = await h2c(ref.current, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
        imageTimeout: 0,
        width: ref.current.offsetWidth,
        height: ref.current.offsetHeight,
      });
      // Crop to exact card size
      const out = document.createElement('canvas');
      out.width  = CARD_W * 4;
      out.height = CARD_H * 4;
      out.getContext('2d')!.drawImage(canvas, 0, 0);
      return out.toDataURL('image/jpeg', 0.95);
    } catch(err) {
      console.warn('html2canvas failed', err);
      return renderSide(which);
    }
  };

  const downloadSide = async(w:'front'|'back')=>{
    // Make sure correct side is active and visible
    if (activeSide !== w) {
      setActiveSide(w);
      await new Promise(r => setTimeout(r, 200));
    }
    const url = await captureCard(w);
    const a = document.createElement('a');
    a.download = `id-${w}-${Date.now()}.jpg`;
    a.href = url;
    a.click();
  };

  const toBase64 = async (url: string): Promise<string | null> => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const saveIDToServer = async()=>{
    if(!selectedEmployee&&!editingID) return;
    setSavingID(true);
    // Capture both sides - use renderSide (canvas renderer) for saving
    // html2canvas only captures visible elements; renderSide works for both
    const [fi, bi] = await Promise.all([renderSide('front'), renderSide('back')]);
    
    // Convert avatar and signature to base64 to save them to MinIO
    const [avatarB64, sigB64] = await Promise.all([
      employeePhoto ? toBase64(employeePhoto) : Promise.resolve(null),
      employeeSig ? toBase64(employeeSig) : Promise.resolve(null)
    ]);

    const name    = selectedEmployee?.name     || editingID?.employeeName || '';
    const pos     = selectedEmployee?.position || editingID?.position     || '';
    const empCode = selectedEmployee?.empCode  || '';
    const company = (selectedEmployee as any)?.company || front.fields.find(f=>f.id==='company')?.value || '';
    const abasReqId = editingID?.abasRequestId || null;
    const abasEmpId = selectedEmployee?.id || (editingID as any)?.abasEmployeeId || null;

    try{
      const payload = {
        employeeName: name,
        position: pos,
        empCode,
        company,
        frontImg: fi,
        backImg: bi,
        avatarImg: avatarB64,
        signatureImg: sigB64,
        savedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        abasRequestId: abasReqId,
        abasEmployeeId: abasEmpId
      };

      let savedIdId = '';
      let saveOk = false;

      if(editingID && editingID.id){
        // Update existing saved ID
        savedIdId = editingID.id;
        const res = await fetch(`${API_URL}/saved-ids/${editingID.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        saveOk = res.ok;
      } else {
        // Save new ID
        savedIdId = `${selectedEmployee?.id || Date.now()}-${Date.now()}`;
        const res = await fetch(`${API_URL}/saved-ids`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: savedIdId, ...payload })
        });
        saveOk = res.ok;
      }

      if (saveOk) {
        setMsg({ type: 'success', text: `ID saved for ${name}` });

        // If this ID is linked to a request, update the request status to 'id generated'
        if (editingID?.requestId) {
          try {
            // Update request status in AVPass to 'id generated'
            const patchRes = await fetch(`${API_URL}/id-requests/${editingID.requestId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'id generated', note: 'ID generated by builder.' })
            });

            if (patchRes.ok) {
              // Notify ABAS webhook that ID is ready
              await fetch(`${API_URL}/notify-abas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  abasRequestId: abasReqId,
                  savedIdId: savedIdId,
                })
              });
            }
          } catch (patchErr) {
            console.error('Failed to update request status:', patchErr);
          }
        }

        if (editingID && onEditSaved) onEditSaved(savedIdId);
      } else {
        setMsg({ type: 'error', text: 'Failed to save ID' });
      }
    } catch { setMsg({ type: 'error', text: 'Connection error' }); }
    setSavingID(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const loadTemplate = (t:IDTemplate)=>{ setConfirmLoad(t); };
  const deleteTemplateFromModal = async(id:string)=>{
    const updated = templates.filter(t=>t.id!==id);
    await fetch(`${API_URL}/templates`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)});
    setTemplates(updated);
  };
  const editTemplateInEditor = (t:IDTemplate)=>{ setShowTemplateModal(false); showMsg('success',`Go to ID Templates to edit "${t.name}"`); };
  const doLoadTemplate = (t:IDTemplate)=>{
    // Merge template fields with defaults — ensures new default fields (e.g. emergency_person)
    // are always present even if the saved template predates them
    const mergeFields = (templateFields: IDField[], defaults: IDField[]): IDField[] => {
      const ids = new Set(templateFields.map(f => f.id));
      const missing = defaults.filter(f => !ids.has(f.id));
      return [...templateFields, ...missing];
    };
    const mergedBack  = { ...t.back,  fields: mergeFields(t.back.fields,  defaultBackFields)  };
    const mergedFront = { ...t.front, fields: mergeFields(t.front.fields, defaultFrontFields) };
    setFront(mergedFront); setBack(mergedBack);
    pushHistory(mergedFront, mergedBack);
    showMsg("success",`Loaded "${t.name}"`);
    setConfirmLoad(null);
    if(onTemplatLoaded) onTemplatLoaded();
  };

  const renderCard = (which:'front'|'back') => {
    const sd     = which==='front'?front:back;
    const isActive = activeSide===which;
    const ref    = which==='front'?cardFrontRef:cardBackRef;
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'16px'}}>
        <div style={{fontSize:'13px',fontWeight:700,color:isActive?'#0f172a':'#94a3b8',letterSpacing:'1px',textTransform:'uppercase',display:'flex',alignItems:'center',gap:'8px'}}>
          {which==='front'?'▣ Front Face':'▢ Back Face'}
          {isActive && <span style={{fontSize:'10px',fontWeight:500,color:'#3b82f6',background:'#eff6ff',padding:'2px 8px',borderRadius:'12px',letterSpacing:'0',textTransform:'none'}}>Active</span>}
        </div>
        <div ref={ref}
          onClick={(e)=>{e.stopPropagation(); setActiveSide(which);}}
          style={{width:CARD_W*zoom,height:CARD_H*zoom,position:'relative',borderRadius:8*zoom,overflow:'hidden',
            boxShadow:isActive?`0 0 0 4px rgba(102,126,234,0.4), 0 20px 40px rgba(0,0,0,0.15)`:`0 10px 30px rgba(0,0,0,0.06)`,
            userSelect:'none',flexShrink:0,transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',cursor:isActive?'default':'pointer',
            transform:isActive?'scale(1)':'scale(0.98)', opacity:isActive?1:0.8}}>

          {sd.background
            ? <img src={sd.background} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}}/>
            : <div style={{position:'absolute',inset:0,background:which==='front'?'linear-gradient(160deg,#b91c1c,#ef4444,#f97316)':'linear-gradient(160deg,#f1f5f9,#e2e8f0)',pointerEvents:'none'}}/>}

          {showGrid&&isActive&&<div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(rgba(0,0,0,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.1) 1px,transparent 1px)`,backgroundSize:`${CARD_W*zoom/10}px ${CARD_H*zoom/10}px`,pointerEvents:'none',zIndex:5}}/>}

          {draggingId&&isActive&&<>
            <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:'1px',background:'rgba(102,126,234,0.8)',zIndex:6,pointerEvents:'none'}}/>
            <div style={{position:'absolute',top:'50%',left:0,right:0,height:'1px',background:'rgba(102,126,234,0.8)',zIndex:6,pointerEvents:'none'}}/>
          </>}

          {sd.showPhoto&&employeePhoto&&(
            <div onMouseDown={e=>{e.stopPropagation(); if(isActive){handleLayerMouseDown(e,'photo');}else{setActiveSide(which);setSelectedLayer('photo');setSelectedFieldId(null);}}}
              style={{position:'absolute',left:`${sd.photoX}%`,top:`${sd.photoY}%`,width:`${sd.photoW}%`,height:`${sd.photoH}%`,transform:'translate(-50%,-50%)',
                cursor:isActive?(draggingLayer==='photo'?'grabbing':'grab'):'pointer', zIndex:8,
                boxShadow:sd.photoShadowBlur&&sd.photoShadowBlur>0?`0 0 ${sd.photoShadowBlur}px ${sd.photoShadowColor||'rgba(0,0,0,0.6)'}`:'none',
                outline:(isActive&&selectedLayer==='photo')?'2px dashed rgba(59,130,246,0.9)':(sd.photoStrokeWidth&&sd.photoStrokeWidth>0?`${sd.photoStrokeWidth}px solid ${sd.photoStrokeColor||'#000000'}`:'none'),
                outlineOffset:(isActive&&selectedLayer==='photo')?'3px':'-1px'}}>
              <img src={employeePhoto} style={{width:'100%',height:'100%',objectFit:'contain',display:'block',pointerEvents:'none',
                filter:[
                  sd.photoBrightness!==undefined&&sd.photoBrightness!==100?`brightness(${sd.photoBrightness}%)`:'',
                  sd.photoContrast!==undefined&&sd.photoContrast!==100?`contrast(${sd.photoContrast}%)`:'',
                ].filter(Boolean).join(' ')||'none'}}/>
              {sd.photoOverlayOpacity&&sd.photoOverlayOpacity>0&&<div style={{position:'absolute',inset:0,background:sd.photoOverlayColor||'#000000',opacity:sd.photoOverlayOpacity/100,mixBlendMode:'normal',pointerEvents:'none'}}/>}
              {sd.photoColorize&&sd.photoColorizeColor&&<div style={{position:'absolute',inset:0,background:sd.photoColorizeColor,mixBlendMode:'color',pointerEvents:'none'}}/>}
              {isActive&&selectedLayer==='photo'&&(['n','s','e','w','ne','nw','se','sw'] as const).map(h=>{
                const top  = h.includes('n')?'-4px':h.includes('s')?'calc(100% - 4px)':'calc(50% - 4px)';
                const left = h.includes('w')?'-4px':h.includes('e')?'calc(100% - 4px)':'calc(50% - 4px)';
                const cur  = h==='n'||h==='s'?'ns-resize':h==='e'||h==='w'?'ew-resize':h==='ne'||h==='sw'?'nesw-resize':'nwse-resize';
                return <div key={h} onMouseDown={e=>handleResizeMouseDown(e,'photo',h)}
                  style={{position:'absolute',top,left,width:'8px',height:'8px',borderRadius:'50%',background:'#fff',border:'2px solid #3b82f6',zIndex:20,cursor:cur}}/>;
              })}
            </div>
          )}
          {sd.showSig&&employeeSig&&(
            <div onMouseDown={e=>{e.stopPropagation(); if(isActive){handleLayerMouseDown(e,'sig');}else{setActiveSide(which);setSelectedLayer('sig');setSelectedFieldId(null);}}}
              style={{position:'absolute',left:`${sd.sigX}%`,top:`${sd.sigY}%`,width:`${sd.sigW}%`,height:`${sd.sigH}%`,transform:'translate(-50%,-50%)',
                cursor:isActive?(draggingLayer==='sig'?'grabbing':'grab'):'pointer', zIndex:8,
                boxShadow:sd.sigShadowBlur&&sd.sigShadowBlur>0?`0 0 ${sd.sigShadowBlur}px ${sd.sigShadowColor||'rgba(0,0,0,0.6)'}`:'none',
                outline:(isActive&&selectedLayer==='sig')?'2px dashed rgba(139,92,246,0.9)':(sd.sigStrokeWidth&&sd.sigStrokeWidth>0?`${sd.sigStrokeWidth}px solid ${sd.sigStrokeColor||'#000000'}`:'none'),
                outlineOffset:(isActive&&selectedLayer==='sig')?'3px':'-1px'}}>
              <img src={employeeSig} style={{width:'100%',height:'100%',objectFit:'contain',display:'block',pointerEvents:'none',
                filter:sd.sigColorize&&sd.sigColorizeColor
                  ? (sd.sigInkDark===false ? hexToColorFilterWhite(sd.sigColorizeColor) : hexToColorFilter(sd.sigColorizeColor))
                  : [
                      sd.sigBrightness!==undefined&&sd.sigBrightness!==100?`brightness(${sd.sigBrightness}%)`:'',
                      sd.sigContrast!==undefined&&sd.sigContrast!==100?`contrast(${sd.sigContrast}%)`:'',
                    ].filter(Boolean).join(' ')||'none'}}/>
              {isActive&&selectedLayer==='sig'&&(['n','s','e','w','ne','nw','se','sw'] as const).map(h=>{
                const top  = h.includes('n')?'-4px':h.includes('s')?'calc(100% - 4px)':'calc(50% - 4px)';
                const left = h.includes('w')?'-4px':h.includes('e')?'calc(100% - 4px)':'calc(50% - 4px)';
                const cur  = h==='n'||h==='s'?'ns-resize':h==='e'||h==='w'?'ew-resize':h==='ne'||h==='sw'?'nesw-resize':'nwse-resize';
                return <div key={h} onMouseDown={e=>handleResizeMouseDown(e,'sig',h)}
                  style={{position:'absolute',top,left,width:'8px',height:'8px',borderRadius:'50%',background:'#fff',border:'2px solid #8b5cf6',zIndex:20,cursor:cur}}/>;
              })}
            </div>
          )}

          {/* ── QR Code preview ── */}
          {which==='back' && sd.showQR && qrDataUrl && (
            <div
              onClick={e=>{e.stopPropagation(); if(isActive){setSelectedLayer(null);setSelectedFieldId(null);}}}
              style={{
                position:'absolute',
                left:`${sd.qrX||50}%`, top:`${sd.qrY||42}%`,
                width:`${sd.qrSize||70}%`, height:`${(sd.qrSize||70)/CARD_W*CARD_H}%`,
                transform:'translate(-50%,-50%)',
                zIndex:9, cursor:'default',
                outline:(isActive&&which==='back'&&!selectedFieldId&&!selectedLayer)?'2px dashed rgba(16,185,129,0.6)':'none',
                outlineOffset:'3px',
              }}>
              <img src={qrDataUrl} style={{width:'100%',height:'100%',objectFit:'contain',display:'block',pointerEvents:'none'}}/>
            </div>
          )}

          {sd.fields.filter(f=>f.visible).map(field=>{
            const isSel  = isActive&&selectedFieldId===field.id;
            const isDrag = draggingId===field.id;
            return (
              <div key={field.id}
                onMouseDown={e=>{e.stopPropagation(); if(isActive){handleFieldMouseDown(e,field.id);}else{setActiveSide(which);setSelectedFieldId(field.id);setSelectedLayer(null);}}}
                style={{
                  position:'absolute',
                  left:field.align!=='right'?`${field.x}%`:'auto',
                  right:field.align==='right'?`${100-field.x}%`:'auto',
                  top:`${field.y}%`,
                  transform:field.align==='center'?'translate(-50%,-50%)':'translateY(-50%)',
                  fontSize:field.fontSize*zoom,
                  color:field.color,
                  fontWeight:field.bold?700:400,
                  fontStyle:field.italic?'italic':'normal',
                  textDecoration:field.underline?'underline':'none',
                  textAlign:field.align,
                  width:field.w?`${field.w}%`:'auto',
                  maxWidth:field.w?`${field.w}%`:'90%',
                  lineHeight:1.3,
                  fontFamily:field.fontFamily||"'Inter','Segoe UI',sans-serif",
                  cursor:isActive?(isDrag?'grabbing':'grab'):'pointer',
                  zIndex:10,
                  outline:isSel?'2px dashed rgba(102,126,234,0.9)':'2px solid transparent',
                  outlineOffset:'3px',
                  borderRadius:'3px',
                  padding:'1px 4px',
                  background:isSel?'rgba(102,126,234,0.15)':isDrag?'rgba(102,126,234,0.08)':(field.overlayBg&&field.overlayOpacity?`${field.overlayBg}${Math.round((field.overlayOpacity/100)*255).toString(16).padStart(2,'0')}`:'transparent'),
                  wordBreak:'break-word',
                  transition:isDrag?'none':'all 0.1s',
                  textShadow:field.shadowBlur&&field.shadowBlur>0?`0 0 ${field.shadowBlur}px ${field.shadowColor||'rgba(0,0,0,0.6)'}`:undefined,
                  WebkitTextStroke:field.strokeWidth&&field.strokeWidth>0?`${field.strokeWidth}px ${field.strokeColor||'#000000'}`:undefined,
                }}>
                {field.value}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const navBtnStyle = { background: '#fff', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' };

  return (
    <>
    <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden',background:'#f8fafc', height: '100%'}}>
      
      {/* ════════════════════════════════════ TOP GLOBAL TOOLBAR ══ */}
      <header style={{minHeight:'56px',background:'#fff',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'space-between',padding:isMobile?'0 12px':'0 24px',flexShrink:0,zIndex:20,flexWrap:isMobile?'wrap':'nowrap',gap:'8px'}}>
        {/* Brand & History */}
        <div style={{display:'flex',alignItems:'center',gap:'24px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            {onBack && (
              <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 12px',borderRadius:'8px',border:'1px solid #e2e8f0',background:'#fff',color:'#475569',cursor:'pointer',fontSize:'13px',fontWeight:600,boxShadow:'0 1px 2px rgba(0,0,0,0.04)',transition:'all 0.15s',flexShrink:0}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#f8fafc'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#fff'}>
                <ArrowLeft size={14}/> {!isMobile && 'Back'}
              </button>
            )}
            <div style={{background:'linear-gradient(135deg,#ec4899,#be185d)',padding:'8px',borderRadius:'10px',boxShadow:'0 4px 10px rgba(236,72,153,0.3)'}}><LayoutTemplate size={18} color="#fff"/></div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{fontSize:'15px',fontWeight:800,color:'#0f172a',lineHeight:1.1}}>ID Studio</div>
                {editingID && (
                  <span style={{
                    background: editingID.requestId ? '#eff6ff' : '#f59e0b22',
                    color: editingID.requestId ? '#2563eb' : '#d97706',
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '20px',
                    border: `1px solid ${editingID.requestId ? '#bfdbfe' : '#f59e0b44'}`,
                    letterSpacing: '0.5px'
                  }}>
                    {editingID.requestId ? '📋 REQUEST LINKED' : '✏ EDITING'}
                  </span>
                )}
              </div>
              <div style={{fontSize:'11px',color:'#94a3b8',fontWeight:500}}>
                {editingID ? (
                  <>
                    Editing: <strong>{editingID.employeeName}</strong>
                    {editingID.requestId && ` · Request ID: ${editingID.requestId}`}
                    {editingID.abasRequestId && ` · ABAS Ticket ID: ${editingID.abasRequestId}`}
                  </>
                ) : 'Design & Export'}
              </div>
            </div>
          </div>
          {!isMobile && <div style={{width:'1px',height:'28px',background:'#e2e8f0'}}></div>}
          <div style={{display:isMobile?'none':'flex',gap:'6px'}}>
            <button onClick={undo} disabled={historyIdx<=0} style={{padding:'8px',borderRadius:'8px',border:'1px solid #e2e8f0',background:historyIdx>0?'#f8fafc':'#fff',color:historyIdx>0?'#475569':'#cbd5e1',cursor:historyIdx>0?'pointer':'default',transition:'all 0.2s'}}><Undo size={14}/></button>
            <button onClick={redo} disabled={historyIdx>=history.length-1} style={{padding:'8px',borderRadius:'8px',border:'1px solid #e2e8f0',background:historyIdx<history.length-1?'#f8fafc':'#fff',color:historyIdx<history.length-1?'#475569':'#cbd5e1',cursor:historyIdx<history.length-1?'pointer':'default',transition:'all 0.2s'}}><Redo size={14}/></button>
          </div>
        </div>

        {/* Center Canvas Tools */}
        {msg ? (
          <div style={{padding:'8px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:600,background:msg.type==='success'?'#ecfdf5':'#fef2f2',color:msg.type==='success'?'#059669':'#dc2626',border:`1px solid ${msg.type==='success'?'#a7f3d0':'#fecaca'}`,display:'flex',alignItems:'center',gap:'8px',boxShadow:'0 2px 10px rgba(0,0,0,0.05)',animation:'fadein 0.3s'}}>
            <span>{msg.type==='success'?'✓':'✕'}</span> {msg.text}
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'center',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'10px',padding:'4px'}}>
            <button onClick={()=>setZoom(z=>Math.max(0.5,+(z-0.1).toFixed(1)))} style={{background:'transparent',border:'none',color:'#64748b',width:'32px',height:'32px',cursor:'pointer',fontSize:'18px',fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
            <span style={{fontSize:'12px',color:'#0f172a',fontWeight:700,width:'48px',textAlign:'center'}}>{Math.round(zoom*100)}%</span>
            <button onClick={()=>setZoom(z=>Math.min(2.5,+(z+0.1).toFixed(1)))} style={{background:'transparent',border:'none',color:'#64748b',width:'32px',height:'32px',cursor:'pointer',fontSize:'18px',fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
            <div style={{width:'1px',height:'20px',background:'#e2e8f0',margin:'0 8px'}}></div>
            {!isMobile && <button onClick={()=>setShowGrid(g=>!g)} style={{padding:'6px 12px',borderRadius:'8px',border:'none',background:showGrid?'#e0e7ff':'transparent',color:showGrid?'#4f46e5':'#64748b',cursor:'pointer',fontSize:'12px',fontWeight:600,display:'flex',alignItems:'center',gap:'6px'}}><Grid size={14}/> Grid</button>}
            {!isMobile && <button onClick={()=>setSnap(s=>!s)} style={{padding:'6px 12px',borderRadius:'8px',border:'none',background:snap?'#f3e8ff':'transparent',color:snap?'#7c3aed':'#64748b',cursor:'pointer',fontSize:'12px',fontWeight:600,display:'flex',alignItems:'center',gap:'6px'}}><Magnet size={14}/> Snap</button>}
          </div>
        )}

        {/* Right Actions */}
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <button onClick={()=>{setShowFlip(p=>!p); if(isMobile) setMobileTab('canvas');}} style={navBtnStyle} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#f8fafc'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#fff'}>
            <RefreshCw size={14} color="#8b5cf6"/> {!isMobile && (showFlip?'Editor':'Preview')}
          </button>
          {!isMobile && <button onClick={handlePrint} style={navBtnStyle} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#f8fafc'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#fff'}>
            <Printer size={14}/> Print
          </button>}
          <div style={{width:'1px',height:'24px',background:'#e2e8f0',margin:'0 4px'}}></div>
          <button onClick={()=>downloadSide(activeSide)} style={{...navBtnStyle, background:'#f8fafc'}}>
            <Download size={14} color="#667eea"/> Export {activeSide}
          </button>
          <button onClick={saveIDToServer} disabled={savingID||qrGenerating||(!selectedEmployee&&!editingID)} style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:(selectedEmployee||editingID)?'linear-gradient(135deg,#10b981,#059669)':'#e2e8f0',color:(selectedEmployee||editingID)?'#fff':'#94a3b8',cursor:(selectedEmployee||editingID)&&!qrGenerating?'pointer':'not-allowed',fontSize:'13px',fontWeight:700,display:'flex',alignItems:'center',gap:'8px',boxShadow:(selectedEmployee||editingID)?'0 4px 14px rgba(16,185,129,0.3)':'none'}}>
            {savingID?<Loader2 size={16} style={{animation:'spin 1s linear infinite'}}/>:qrGenerating?<Loader2 size={16} style={{animation:'spin 1s linear infinite'}}/>:<Save size={16}/>} {qrGenerating?'Generating QR...':'Save ID'}
          </button>
        </div>
      </header>

      {/* ── Mobile Tab Bar ── */}
      {isMobile && (
        <div style={{display:'flex',background:'#fff',borderBottom:'1px solid #e2e8f0',flexShrink:0}}>
          {([
            {id:'layers', label:'Layers', icon:'☰'},
            {id:'canvas', label:'Canvas', icon:'🖼'},
            {id:'props',  label:'Properties', icon:'⚙'},
          ] as const).map(tab => (
            <button key={tab.id} onClick={()=>setMobileTab(tab.id)}
              style={{flex:1,padding:'10px 4px',border:'none',background:'transparent',cursor:'pointer',fontSize:'12px',fontWeight:mobileTab===tab.id?700:400,color:mobileTab===tab.id?'#667eea':'#94a3b8',borderBottom:mobileTab===tab.id?'2px solid #667eea':'2px solid transparent',display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
              <span style={{fontSize:'16px'}}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        
        {/* ════════════════════════════════════ LEFT PANEL (Assets & Layers) ══ */}
        <div style={{width:isMobile?'100%':'300px',flexShrink:0,background:'#fff',borderRight:isMobile?'none':'1px solid #e2e8f0',display:isMobile?(mobileTab==='layers'?'flex':'none'):'flex',flexDirection:'column',overflow:'hidden',boxShadow:isMobile?'none':'4px 0 24px rgba(0,0,0,0.02)',zIndex:10}}>
          <div style={{padding:'20px 20px 10px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
            <SegmentedControl options={[{label:'Front Card',value:'front'},{label:'Back Card',value:'back'}]} value={activeSide} onChange={(v:any)=>{setActiveSide(v);setSelectedFieldId(null);setSelectedLayer(null);}}/>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            <AccSection id="employee" icon={<Search size={16}/>} title="Employee Link" open={openSection==="employee"} onToggle={toggleSection}>
              {editingID?.requestId && (
                <div style={{ padding: '10px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', fontSize: '12px', color: '#1e40af', marginBottom: '12px', lineHeight: 1.4 }}>
                  <div style={{ fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>📋</span> Linked to Request
                  </div>
                  <div><strong>Request ID:</strong> {editingID.requestId}</div>
                  {editingID.abasRequestId && <div><strong>ABAS Ticket ID:</strong> {editingID.abasRequestId}</div>}
                </div>
              )}
              <div style={{position:'relative'}}>
                <div style={{position:'relative'}}>
                  <input type="text" value={empSearch} placeholder="Search employee name..." ref={empSearchRef}
                    onChange={e=>{ setEmpSearch(e.target.value); setShowEmpDrop(true); fetchEmployees(e.target.value); }}
                    onFocus={()=>{ setShowEmpDrop(true); fetchEmployees(empSearch); }}
                    onBlur={()=>setTimeout(()=>setShowEmpDrop(false),200)}
                    style={inpStyle}/>
                  {empLoading && <Loader2 size={14} style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',color:'#94a3b8',animation:'spin 1s linear infinite'}}/>}
                </div>
                {showEmpDrop&&(
                  <ul style={{position:'absolute',zIndex:999,width:'100%',marginTop:'6px',background:'#fff',border:'1px solid #e2e8f0',borderRadius:'12px',boxShadow:'0 12px 32px rgba(0,0,0,0.1)',maxHeight:'200px',overflowY:'auto',padding:0,listStyle:'none'}}>
                    {empLoading && (
                      <li style={{padding:'14px',textAlign:'center',color:'#94a3b8',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                        <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> Searching...
                      </li>
                    )}
                    {!empLoading && empResults.length===0 && empSearch.trim().length>0 && (
                      <li style={{padding:'14px',textAlign:'center',color:'#94a3b8',fontSize:'12px'}}>No employees found for "{empSearch}"</li>
                    )}
                    {empResults.map(r=>(
                      <li key={r.id} onMouseDown={()=>autoFill(r)}
                        style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid #f8fafc',transition:'background 0.1s'}}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#f8fafc'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#fff'}>
                        <div style={{fontWeight:600,color:'#0f172a',fontSize:'13px'}}>{r.name}</div>
                        <div style={{color:'#64748b',fontSize:'11px',display:'flex',alignItems:'center',gap:'6px',marginTop:'2px'}}>
                          <span>{r.position}</span>
                          {r.empCode ? <span style={{background:'#667eea15',color:'#667eea',borderRadius:'4px',padding:'2px 6px',fontFamily:'monospace',fontWeight:700,fontSize:'10px'}}>{r.empCode}</span> : <span style={{color:'#ef4444',fontSize:'10px'}}>⚠ no code</span>}
                          {r.company && <span style={{background:'#f1f5f9',color:'#64748b',borderRadius:'4px',padding:'2px 6px',fontSize:'10px'}}>{r.company}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedEmployee&&(
                <div style={{padding:'12px',background:'#f8fafc',borderRadius:'10px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:'12px'}}>
                  {employeePhoto ? <img src={employeePhoto} style={{width:'36px',height:'36px',borderRadius:'50%',objectFit:'cover',flexShrink:0,border:'2px solid #fff',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}/> : <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:700,color:'#94a3b8'}}>{selectedEmployee.name.charAt(0)}</div>}
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selectedEmployee.name}</div>
                    <div style={{fontSize:'11px',color:'#64748b'}}>{selectedEmployee.position}</div>
                    {(selectedEmployee as any).company && (
                      <div style={{marginTop:'4px'}}>
                        <span style={{background:'#eff6ff',color:'#2563eb',borderRadius:'4px',padding:'2px 7px',fontSize:'10px',fontWeight:600}}>{(selectedEmployee as any).company}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(selectedEmployee || editingID) && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    Upload Custom Assets
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Custom ID Photo</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="custom-photo-upload"
                          onChange={handlePhotoUpload} 
                          style={{ display: 'none' }}
                        />
                        <label 
                          htmlFor="custom-photo-upload"
                          style={{ 
                            flex: 1, padding: '8px 12px', border: '1px dashed #667eea', borderRadius: '8px', 
                            background: customPhoto ? '#f5f3ff' : '#fff', color: '#667eea', fontSize: '12px', 
                            fontWeight: 600, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                            display: 'block'
                          }}>
                          {customPhoto ? '✓ Photo Uploaded (Change)' : '📁 Upload Photo'}
                        </label>
                        {customPhoto && (
                          <button 
                            onClick={() => setCustomPhoto(null)} 
                            style={{ 
                              padding: '8px 12px', border: '1px solid #fca5a5', background: '#fef2f2', 
                              color: '#ef4444', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' 
                            }}>
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Custom Signature</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="custom-sig-upload"
                          onChange={handleSigUpload} 
                          style={{ display: 'none' }}
                        />
                        <label 
                          htmlFor="custom-sig-upload"
                          style={{ 
                            flex: 1, padding: '8px 12px', border: '1px dashed #8b5cf6', borderRadius: '8px', 
                            background: customSig ? '#f5f3ff' : '#fff', color: '#8b5cf6', fontSize: '12px', 
                            fontWeight: 600, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                            display: 'block'
                          }}>
                          {customSig ? '✓ Signature Uploaded (Change)' : '📁 Upload Signature'}
                        </label>
                        {customSig && (
                          <button 
                            onClick={() => setCustomSig(null)} 
                            style={{ 
                              padding: '8px 12px', border: '1px solid #fca5a5', background: '#fef2f2', 
                              color: '#ef4444', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' 
                            }}>
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </AccSection>

            <AccSection id="fields" icon={<Layers size={16}/>} title="Layers & Fields" open={openSection==="fields"} onToggle={toggleSection}>
              {/* Special Layers */}
              {activeSide==='front' && (
                <button onClick={()=>setSelectedLayer('photo')} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',borderRadius:'8px',border:selectedLayer==='photo'?'1px solid #3b82f6':'1px solid #e2e8f0',background:selectedLayer==='photo'?'#eff6ff':'#fff',cursor:'pointer',textAlign:'left',transition:'all 0.1s',boxShadow:selectedLayer==='photo'?'0 2px 6px rgba(59,130,246,0.15)':'0 1px 2px rgba(0,0,0,0.02)',marginBottom:'8px'}}>
                  <div style={{background:'#e0e7ff',color:'#4f46e5',padding:'6px',borderRadius:'6px'}}><ImageIcon size={14}/></div>
                  <div style={{flex:1}}><div style={{fontSize:'12px',fontWeight:700,color:selectedLayer==='photo'?'#2563eb':'#0f172a'}}>Employee Photo</div><div style={{fontSize:'11px',color:'#64748b',marginTop:'2px'}}>{side.showPhoto?'Visible':'Hidden'}</div></div>
                </button>
              )}
              <button onClick={()=>setSelectedLayer('sig')} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',borderRadius:'8px',border:selectedLayer==='sig'?'1px solid #8b5cf6':'1px solid #e2e8f0',background:selectedLayer==='sig'?'#f3e8ff':'#fff',cursor:'pointer',textAlign:'left',transition:'all 0.1s',boxShadow:selectedLayer==='sig'?'0 2px 6px rgba(139,92,246,0.15)':'0 1px 2px rgba(0,0,0,0.02)',marginBottom:'16px'}}>
                <div style={{background:'#ede9fe',color:'#7c3aed',padding:'6px',borderRadius:'6px'}}><Settings size={14}/></div>
                <div style={{flex:1}}><div style={{fontSize:'12px',fontWeight:700,color:selectedLayer==='sig'?'#7c3aed':'#0f172a'}}>Signature Layer</div><div style={{fontSize:'11px',color:'#64748b',marginTop:'2px'}}>{side.showSig?'Visible':'Hidden'}</div></div>
              </button>

              {/* QR Code layer — back card only */}
              {activeSide==='back' && (
                <div style={{marginBottom:'16px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                    <span style={{fontSize:'12px',fontWeight:700,color:'#0f172a',display:'flex',alignItems:'center',gap:'6px'}}>
                      <span style={{background:'#ecfdf5',color:'#059669',padding:'4px 6px',borderRadius:'6px',fontSize:'11px'}}>QR</span>
                      QR Code
                    </span>
                    <label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}>
                      <input type="checkbox" checked={!!back.showQR} onChange={e=>setBack(p=>({...p,showQR:e.target.checked}))} style={{accentColor:'#10b981',width:'14px',height:'14px'}}/>
                      <span style={{fontSize:'11px',color:back.showQR?'#059669':'#94a3b8',fontWeight:600}}>{back.showQR?'ON':'OFF'}</span>
                    </label>
                  </div>
                  {back.showQR && (
                    <div style={{display:'flex',flexDirection:'column',gap:'8px',padding:'10px',background:'#f8fafc',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
                      <div>
                        <label style={{fontSize:'11px',color:'#64748b',fontWeight:500,display:'block',marginBottom:'4px'}}>Verify URL</label>
                        <input type="text" value={back.qrUrl||''} onChange={e=>setBack(p=>({...p,qrUrl:e.target.value}))}
                          placeholder="https://employee.abas.ph/verify/"
                          style={{width:'100%',background:'#fff',border:'1px solid #e2e8f0',borderRadius:'6px',padding:'6px 8px',fontSize:'11px',color:'#0f172a',outline:'none',boxSizing:'border-box'}}/>
                        <p style={{margin:'3px 0 0',fontSize:'10px',color:'#94a3b8'}}>Employee ID will be appended automatically</p>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
                        <div>
                          <label style={{fontSize:'11px',color:'#64748b',fontWeight:500,display:'block',marginBottom:'4px'}}>X %</label>
                          <input type="number" value={back.qrX??50}  min={0} max={100} onChange={e=>setBack(p=>({...p,qrX:Number(e.target.value)}))} style={{width:'100%',background:'#fff',border:'1px solid #e2e8f0',borderRadius:'6px',padding:'5px 6px',fontSize:'11px',color:'#0f172a',outline:'none'}}/>
                        </div>
                        <div>
                          <label style={{fontSize:'11px',color:'#64748b',fontWeight:500,display:'block',marginBottom:'4px'}}>Y %</label>
                          <input type="number" value={back.qrY??42} min={0} max={100} onChange={e=>setBack(p=>({...p,qrY:Number(e.target.value)}))} style={{width:'100%',background:'#fff',border:'1px solid #e2e8f0',borderRadius:'6px',padding:'5px 6px',fontSize:'11px',color:'#0f172a',outline:'none'}}/>
                        </div>
                        <div>
                          <label style={{fontSize:'11px',color:'#64748b',fontWeight:500,display:'block',marginBottom:'4px'}}>Size %</label>
                          <input type="number" value={back.qrSize??70} min={10} max={80} onChange={e=>setBack(p=>({...p,qrSize:Number(e.target.value)}))} style={{width:'100%',background:'#fff',border:'1px solid #e2e8f0',borderRadius:'6px',padding:'5px 6px',fontSize:'11px',color:'#0f172a',outline:'none'}}/>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                        <div>
                          <label style={{fontSize:'11px',color:'#64748b',fontWeight:500,display:'block',marginBottom:'4px'}}>QR Color</label>
                          <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                            <input type="color" value={back.qrFg||'#000000'} onChange={e=>setBack(p=>({...p,qrFg:e.target.value}))} style={{width:'28px',height:'26px',border:'1px solid #e2e8f0',borderRadius:'4px',cursor:'pointer',padding:'1px'}}/>
                            <input type="text" value={back.qrFg||'#000000'} onChange={e=>setBack(p=>({...p,qrFg:e.target.value}))} style={{flex:1,background:'#fff',border:'1px solid #e2e8f0',borderRadius:'6px',padding:'5px 6px',fontSize:'10px',fontFamily:'monospace',color:'#0f172a',outline:'none'}}/>
                          </div>
                        </div>
                        <div>
                          <label style={{fontSize:'11px',color:'#64748b',fontWeight:500,display:'block',marginBottom:'4px'}}>BG Color</label>
                          <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                            <input type="color" value={back.qrBg||'#ffffff'} onChange={e=>setBack(p=>({...p,qrBg:e.target.value}))} style={{width:'28px',height:'26px',border:'1px solid #e2e8f0',borderRadius:'4px',cursor:'pointer',padding:'1px'}}/>
                            <input type="text" value={back.qrBg||'#ffffff'} onChange={e=>setBack(p=>({...p,qrBg:e.target.value}))} style={{flex:1,background:'#fff',border:'1px solid #e2e8f0',borderRadius:'6px',padding:'5px 6px',fontSize:'10px',fontFamily:'monospace',color:'#0f172a',outline:'none'}}/>
                          </div>
                        </div>
                      </div>
                      {!selectedEmployee && (
                        <p style={{margin:0,fontSize:'10px',color:'#f59e0b',background:'#fffbeb',padding:'6px 8px',borderRadius:'6px',border:'1px solid #fde68a'}}>
                          ⚠ Select an employee to preview QR
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div style={{height:'1px',background:'#f1f5f9',margin:'0 -20px 16px'}}/>
              
              <div style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px'}}>Text Elements</div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {side.fields.map(field=>(
                  <button key={field.id} onClick={()=>setSelectedFieldId(field.id)}
                    style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderRadius:'8px',border:selectedFieldId===field.id?'1px solid #ec4899':'1px solid #e2e8f0',background:selectedFieldId===field.id?'#fdf2f8':'#fff',cursor:'pointer',textAlign:'left',transition:'all 0.1s',boxShadow:selectedFieldId===field.id?'0 2px 6px rgba(236,72,153,0.15)':'0 1px 2px rgba(0,0,0,0.02)'}}>
                    <div style={{width:'12px',height:'12px',borderRadius:'4px',background:field.color,border:'1px solid rgba(0,0,0,0.1)',flexShrink:0}}></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'12px',fontWeight:700,color:selectedFieldId===field.id?'#be185d':'#0f172a'}}>{field.label}</div>
                      <div style={{fontSize:'11px',color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:'1px'}}>{field.value}</div>
                    </div>
                  </button>
                ))}
              </div>
            </AccSection>

            {/* Direct Browse Templates button - no accordion needed */}
            <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9'}}>
              <button onClick={()=>setShowTemplateModal(true)} disabled={templates.length===0}
                style={{width:'100%',background:templates.length>0?'linear-gradient(135deg,#667eea,#764ba2)':'#f1f5f9',color:templates.length>0?'#fff':'#94a3b8',border:'none',borderRadius:'12px',padding:'12px',cursor:templates.length>0?'pointer':'not-allowed',fontSize:'13px',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',boxShadow:templates.length>0?'0 4px 12px rgba(102,126,234,0.3)':'none',transition:'all 0.2s'}}>
                <LayoutTemplate size={15}/>
                {templates.length===0?'No Templates Saved':` Browse Templates (${templates.length})`}
              </button>
              {templates.length===0&&<p style={{margin:'6px 0 0',fontSize:'11px',color:'#94a3b8',textAlign:'center'}}>Design templates in ID Templates section</p>}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════ CANVAS WORKSPACE ══ */}
        <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden',background:'#f1f5f9'}}
             onMouseDown={(e)=>{if(e.target===e.currentTarget){setSelectedFieldId(null);setSelectedLayer(null);}}}>
          
          {/* subtle dot grid background pattern */}
          <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'radial-gradient(#cbd5e1 1px, transparent 1px)',backgroundSize:'24px 24px',opacity:0.6}}/>
          
          {showFlip ? (
            <div style={{flex:1,overflow:'auto',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'32px',padding:'40px',position:'relative',zIndex:1}}>
              <div style={{perspective:'1200px'}}>
                <div style={{
                  width:CARD_W*1.5, height:CARD_H*1.5, position:'relative', transformStyle:'preserve-3d', transition:'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform:flipAnim?(flipFace==='front'?'rotateY(90deg)':'rotateY(-90deg)'):'rotateY(0deg)',
                }}>
                  {(frontUrl||backUrl)
                    ? <img src={flipFace==='front'?(frontUrl||''):(backUrl||'')} style={{width:'100%',height:'100%',borderRadius:'12px',boxShadow:'0 24px 60px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)',display:'block',objectFit:'fill'}}/>
                    : <div style={{width:'100%',height:'100%',background:'#fff',borderRadius:'12px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#94a3b8',boxShadow:'0 12px 32px rgba(0,0,0,0.05)'}}><Loader2 size={32} style={{animation:'spin 1s linear infinite', marginBottom:'12px', color:'#e2e8f0'}}/>Rendering…</div>
                  }
                </div>
              </div>
              <div style={{display:'flex',gap:'16px',alignItems:'center',background:'#fff',padding:'16px 24px',borderRadius:'16px',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
                <div style={{fontSize:'13px',color:'#64748b',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginRight:'8px'}}>{flipFace==='front'?'▣ Front Face':'▢ Back Face'}</div>
                <button onClick={doFlip} style={{padding:'12px 28px',background:'linear-gradient(135deg,#8b5cf6,#7c3aed)',color:'#fff',border:'none',borderRadius:'10px',cursor:'pointer',fontSize:'13px',fontWeight:700,display:'flex',alignItems:'center',gap:'8px',boxShadow:'0 4px 14px rgba(124,58,237,0.3)'}}><RefreshCw size={16}/> Flip Card</button>
              </div>
            </div>
          ) : (
            <div style={{flex:1,overflow:'auto',display:'flex',flexDirection:'column',gap:isMobile?'0':'64px',alignItems:'center',justifyContent:isMobile?'flex-start':'center',padding:isMobile?'16px 12px':'60px 40px',position:'relative',zIndex:1}}
                 onMouseDown={(e)=>{if(e.target===e.currentTarget){setSelectedFieldId(null);setSelectedLayer(null);}}}>
              {/* Mobile: show front/back switcher + single card */}
              {isMobile ? (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px',width:'100%'}}>
                  {/* Front/Back switcher */}
                  <div style={{display:'flex',background:'#e2e8f0',borderRadius:'10px',padding:'3px',gap:'3px',width:'100%',maxWidth:'300px'}}>
                    {(['front','back'] as const).map(side => (
                      <button key={side} onClick={()=>{setActiveSide(side);setSelectedFieldId(null);setSelectedLayer(null);}}
                        style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'13px',fontWeight:700,
                          background:activeSide===side?'#fff':'transparent',
                          color:activeSide===side?'#0f172a':'#94a3b8',
                          boxShadow:activeSide===side?'0 1px 4px rgba(0,0,0,0.1)':'none',
                          transition:'all 0.15s'}}>
                        {side==='front'?'▣ Front':'▢ Back'}
                      </button>
                    ))}
                  </div>
                  {/* Single active card */}
                  {renderCard(activeSide)}
                  {/* Hint */}
                  <p style={{fontSize:'11px',color:'#94a3b8',margin:'4px 0 0',textAlign:'center'}}>Tap fields to edit • Switch tabs for layers & properties</p>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'row',gap:'64px',alignItems:'center',justifyContent:'center'}}>
                  {renderCard('front')}
                  {renderCard('back')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════ RIGHT PANEL (Properties) ══ */}
        <div style={{width:isMobile?'100%':'320px',flexShrink:0,background:'#fff',borderLeft:isMobile?'none':'1px solid #e2e8f0',display:isMobile?(mobileTab==='props'?'flex':'none'):'flex',flexDirection:'column',boxShadow:isMobile?'none':'-4px 0 24px rgba(0,0,0,0.02)',zIndex:10}}>
          {/* Properties Header */}
          <div style={{height:'56px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',background:'#f8fafc'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <Settings size={16} color="#64748b"/>
              <span style={{fontWeight:700,fontSize:'13px',color:'#0f172a'}}>
                {selectedLayer ? (selectedLayer==='photo'?'Photo Settings':'Signature Settings') : selectedField ? 'Text Properties' : 'Design Properties'}
              </span>
            </div>
            {(selectedLayer || selectedField) && (
              <button onClick={()=>{setSelectedLayer(null); setSelectedFieldId(null);}} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:'6px',padding:'4px',color:'#64748b',cursor:'pointer',boxShadow:'0 1px 2px rgba(0,0,0,0.02)'}}><X size={14}/></button>
            )}
          </div>
          
          {/* Properties Content */}
          <div style={{flex:1,overflowY:'auto'}}>
            {selectedLayer ? (
              <LayerEditor 
                layer={selectedLayer} 
                side={side} 
                onUpdate={updateSideProps}
                customPhoto={customPhoto}
                setCustomPhoto={setCustomPhoto}
                customSig={customSig}
                setCustomSig={setCustomSig}
              />
            ) : selectedField ? (
              <FieldEditor field={selectedField} onUpdate={updateField}/>
            ) : (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',padding:'32px',textAlign:'center',color:'#94a3b8'}}>
                <div style={{background:'#f1f5f9',padding:'16px',borderRadius:'50%',marginBottom:'20px'}}><MousePointer2 size={32} color="#cbd5e1"/></div>
                <h3 style={{margin:'0 0 8px',fontSize:'15px',color:'#475569',fontWeight:700}}>No element selected</h3>
                <p style={{margin:0,fontSize:'13px',lineHeight:1.5}}>Click on any text field, photo, or signature layer on the canvas to edit its properties.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
      {/* ════════════ TEMPLATE PICKER MODAL ════════════ */}
      {showTemplateModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(6px)',padding:'16px'}}
          onClick={()=>setShowTemplateModal(false)}>
          <div style={{background:'#fff',borderRadius:'24px',width:'100%',maxWidth:'860px',maxHeight:'85vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 80px rgba(0,0,0,0.3)',overflow:'hidden',animation:'modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,background:'linear-gradient(135deg,#667eea15,#764ba215)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{background:'linear-gradient(135deg,#667eea,#764ba2)',borderRadius:'10px',padding:'8px',display:'flex',boxShadow:'0 4px 10px rgba(102,126,234,0.35)'}}>
                  <LayoutTemplate size={16} color="white"/>
                </div>
                <div>
                  <h3 style={{margin:0,fontSize:'16px',fontWeight:800,color:'#0f172a'}}>Choose a Template</h3>
                  <p style={{margin:0,fontSize:'12px',color:'#94a3b8'}}>{templates.length} saved template{templates.length!==1?'s':''} — click to load</p>
                </div>
              </div>
              <button onClick={()=>setShowTemplateModal(false)}
                style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'10px',width:'36px',height:'36px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b'}}>
                <X size={16}/>
              </button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'16px'}}>
                {templates.map((t:IDTemplate)=>(
                  <div key={t.id}
                    style={{background:'#fff',border:'2px solid #e2e8f0',borderRadius:'16px',overflow:'hidden',transition:'all 0.2s',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='#667eea';(e.currentTarget as HTMLElement).style.boxShadow='0 8px 24px rgba(102,126,234,0.2)';}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='#e2e8f0';(e.currentTarget as HTMLElement).style.boxShadow='0 2px 8px rgba(0,0,0,0.04)';}}>
                    {/* Mini card previews */}
                    <div style={{background:'linear-gradient(135deg,#667eea08,#764ba208)',padding:'12px',display:'flex',gap:'8px',justifyContent:'center',borderBottom:'1px solid #f1f5f9'}}>
                      {([{sd:t.front,lbl:'F'},{sd:t.back,lbl:'B'}] as const).map(({sd,lbl})=>(
                        <div key={lbl} style={{width:'64px',height:'102px',borderRadius:'6px',overflow:'hidden',position:'relative',flexShrink:0,boxShadow:'0 4px 12px rgba(0,0,0,0.15)',background:sd.background?'#000':(lbl==='F'?'linear-gradient(160deg,#b91c1c,#ef4444,#f97316)':'linear-gradient(160deg,#f1f5f9,#e2e8f0)')}}>
                          {sd.background&&<img src={sd.background} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} crossOrigin="anonymous"/>}
                          <div style={{position:'absolute',inset:0,padding:'4px',display:'flex',flexDirection:'column',justifyContent:'flex-end',gap:'1px'}}>
                            {(sd.fields as IDField[]).filter((f:IDField)=>f.visible).slice(0,3).map((f:IDField)=>(
                              <div key={f.id} style={{fontSize:`${Math.max(4,f.fontSize*64/214*0.85)}px`,color:f.color,fontWeight:f.bold?700:400,textAlign:f.align,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',lineHeight:1.2,textShadow:'0 1px 2px rgba(0,0,0,0.5)'}}>{f.value}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Info */}
                    <div style={{padding:'10px 12px 8px'}}>
                      <p style={{margin:'0 0 2px',fontSize:'13px',fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.name}</p>
                      {t.company&&<p style={{margin:'0 0 2px',fontSize:'11px',color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.company}</p>}
                      {t.createdAt&&<p style={{margin:'0 0 10px',fontSize:'10px',color:'#94a3b8'}}>{t.createdAt}</p>}
                      {/* Action buttons */}
                      <div style={{display:'flex',gap:'6px'}}>
                        <button onClick={()=>loadTemplate(t)}
                          style={{flex:1,background:'linear-gradient(135deg,#667eea,#764ba2)',color:'#fff',border:'none',borderRadius:'8px',padding:'7px 6px',cursor:'pointer',fontSize:'11px',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:'4px',boxShadow:'0 2px 8px rgba(102,126,234,0.3)'}}>
                          <LayoutTemplate size={11}/> Load
                        </button>
                        <button onClick={()=>editTemplateInEditor(t)}
                          style={{background:'#f8fafc',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'7px 8px',cursor:'pointer',fontSize:'11px',fontWeight:600,display:'flex',alignItems:'center',gap:'4px'}}
                          title="Edit template">
                          <Pencil size={11}/>
                        </button>
                        <button onClick={()=>deleteTemplateFromModal(t.id)}
                          style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:'8px',padding:'7px 8px',cursor:'pointer',display:'flex',alignItems:'center'}}
                          title="Delete template">
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ CONFIRM LOAD DIALOG ════════════ */}
      {confirmLoad && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(6px)',padding:'16px'}}
          onClick={()=>{setConfirmLoad(null);if(onTemplatLoaded)onTemplatLoaded();}}>
          <div style={{background:'#fff',borderRadius:'20px',padding:'28px 32px',maxWidth:'420px',width:'100%',boxShadow:'0 24px 64px rgba(0,0,0,0.25)',textAlign:'center'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:'#f59e0b15',borderRadius:'50%',width:'56px',height:'56px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <LayoutTemplate size={26} color="#d97706"/>
            </div>
            <h3 style={{margin:'0 0 8px',fontSize:'18px',fontWeight:800,color:'#0f172a'}}>Load Template?</h3>
            <p style={{margin:'0 0 8px',fontSize:'13px',color:'#64748b'}}>This will replace your current design with:</p>
            <p style={{margin:'0 0 4px',fontSize:'15px',fontWeight:700,color:'#0f172a',background:'#f8fafc',borderRadius:'8px',padding:'10px 16px'}}>{confirmLoad.name}</p>
            {confirmLoad.company&&<p style={{margin:'0 0 16px',fontSize:'12px',color:'#64748b'}}>{confirmLoad.company}</p>}
            <p style={{margin:'0 0 24px',fontSize:'12px',color:'#94a3b8'}}>Your current unsaved design will be lost.</p>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>{setConfirmLoad(null);if(onTemplatLoaded)onTemplatLoaded();}}
                style={{flex:1,background:'#f8fafc',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'10px',padding:'11px',cursor:'pointer',fontSize:'13px',fontWeight:600}}>
                Cancel
              </button>
              <button onClick={()=>doLoadTemplate(confirmLoad)}
                style={{flex:1,background:'linear-gradient(135deg,#667eea,#764ba2)',color:'#fff',border:'none',borderRadius:'10px',padding:'11px',cursor:'pointer',fontSize:'13px',fontWeight:700,boxShadow:'0 4px 12px rgba(102,126,234,0.4)'}}>
                Yes, Load Template
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}