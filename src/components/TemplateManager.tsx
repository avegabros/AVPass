import React from 'react';
import {
  Download, Loader2, Upload, Settings, Image as ImageIcon, Save, Printer,
  RefreshCw, Undo, Redo, Grid, Magnet, X, MousePointer2, LayoutTemplate,
  Layers, Pencil, Trash2, ArrowLeft, Eye, EyeOff, Lock, Unlock,
  GripVertical, Plus,
  Square, Circle, Minus, Type, QrCode,
} from 'lucide-react';
import { API_URL } from '../types';
import type { IDField, IDSide, IDTemplate, ShapeElement } from '../types';
import { hexToColorFilter, hexToColorFilterWhite } from '../utils';

// ─────────────────────────────────────────────────────────────
//  LAYER SYSTEM TYPES
// ─────────────────────────────────────────────────────────────
type LayerKind = 'photo' | 'sig' | 'qr' | 'shape' | 'text' | 'canvasimg';
interface Layer {
  id: string;
  kind: LayerKind;
  label: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  color?: string;
  thumb?: string;
}
interface CanvasImage {
  id: string;
  src: string;
  label: string;
  x: number; y: number;
  w: number; h: number;
  opacity: number;
  borderRadius: number;
  rotation: number;
}

// ─────────────────────────────────────────────────────────────
//  DEFAULT FIELDS
// ─────────────────────────────────────────────────────────────
const defaultFrontFields: IDField[] = [
  { id: 'nickname', label: 'First Name / Nickname', value: 'JESUS', x: 35, y: 86, fontSize: 22, color: '#ffffff', bold: true, italic: false, align: 'left', visible: false },
  { id: 'idnum',    label: 'ID Number',              value: 'ABISC-231003', x: 32, y: 92, fontSize: 10, color: '#ffffff', bold: false, italic: false, align: 'left', visible: true },
  { id: 'fullname', label: 'Full Name',               value: 'JESUS B. ILLUSTRISIMO', x: 13, y: 75, fontSize: 10, color: '#ffffff', bold: true, italic: false, align: 'left', visible: true },
  { id: 'position', label: 'Position / Designation',  value: 'ASSISTANT PORT ENGINEER', x: 13, y: 79, fontSize: 9, color: '#ffffff', bold: false, italic: false, align: 'left', visible: true },
  { id: 'company',  label: 'Company',                 value: '', x: 50, y: 88, fontSize: 8, color: '#ffffff', bold: false, italic: false, align: 'center', visible: false },
];
const defaultBackFields: IDField[] = [
  { id: 'emergency_person', label: 'Emergency Contact Person', value: 'Contact Person Name', x: 43, y: 15, fontSize: 10, color: '#ffffff', bold: false, italic: false, align: 'center', visible: true },
  { id: 'emergency_num',    label: 'Emergency Number',         value: '09123456789',         x: 35, y: 20, fontSize: 10, color: '#ffffff', bold: false, italic: false, align: 'center', visible: true },
  { id: 'company_back',     label: 'Company',                  value: '',                    x: 50, y: 88, fontSize: 8,  color: '#ffffff', bold: false, italic: false, align: 'center', visible: false },
];

// ─────────────────────────────────────────────────────────────
//  SHARED STYLES
// ─────────────────────────────────────────────────────────────
const inpStyle: React.CSSProperties = {
  width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '8px 12px', color: '#0f172a', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const SegmentedControl = ({ options, value, onChange }: { options: {label:string,value:string}[], value: string, onChange: (v:string)=>void }) => (
  <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '9px', width: '100%' }}>
    {options.map(opt => {
      const active = value === opt.value;
      return (
        <button key={opt.value} onClick={e => { e.preventDefault(); onChange(opt.value); }}
          style={{ flex: 1, padding: '6px 8px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s',
            background: active ? '#fff' : 'transparent', color: active ? '#0f172a' : '#64748b',
            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
          {opt.label}
        </button>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────
//  LAYER ICON
// ─────────────────────────────────────────────────────────────
const LayerIcon = ({ kind, color, thumb }: { kind: LayerKind; color?: string; thumb?: string }) => {
  const size = 13;
  const map: Record<LayerKind, React.ReactNode> = {
    photo: <ImageIcon size={size} />,
    sig:   <Pencil size={size} />,
    qr:    <QrCode size={size} />,
    shape: <Square size={size} />,
    text:  <Type size={size} />,
    canvasimg: <ImageIcon size={size} />,
  };
  const bg: Record<LayerKind, string> = {
    photo: '#3b82f6', sig: '#8b5cf6', qr: '#f59e0b', shape: color || '#10b981', text: '#ec4899', canvasimg: '#0ea5e9',
  };
  if (kind === 'canvasimg' && thumb) {
    return <div style={{ width: 26, height: 26, borderRadius: 7, overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}><img src={thumb} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  }
  return (
    <div style={{ width: 26, height: 26, borderRadius: 7, background: bg[kind], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff' }}>
      {map[kind]}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  CANVA-STYLE LAYER ROW
// ─────────────────────────────────────────────────────────────
interface LayerRowProps {
  layer: Layer;
  selected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onToggleLock: () => void;
  onDelete?: () => void;
  dragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}
const LayerRow = React.memo(({
  layer, selected, onSelect, onToggleVisible, onToggleLock, onDelete,
  onDragStart, onDragOver, onDrop,
}: LayerRowProps) => {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver?.(e); }}
      onDrop={onDrop}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
        borderRadius: 9, cursor: 'pointer', userSelect: 'none',
        background: selected ? '#eff6ff' : hover ? '#f8fafc' : 'transparent',
        border: selected ? '1px solid #bfdbfe' : '1px solid transparent',
        transition: 'all 0.12s', marginBottom: 2,
        opacity: layer.visible ? 1 : 0.45,
      }}>
      {/* Drag handle */}
      <div style={{ color: '#cbd5e1', cursor: 'grab', flexShrink: 0, display: hover || selected ? 'flex' : 'flex', alignItems: 'center' }}>
        <GripVertical size={13} />
      </div>
      {/* Icon */}
      <LayerIcon kind={layer.kind} color={layer.color} thumb={layer.thumb} />
      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: selected ? 700 : 500, color: selected ? '#1d4ed8' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {layer.label}
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'capitalize' }}>{layer.kind}</div>
      </div>
      {/* Z-index badge */}
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, minWidth: 18, textAlign: 'center', display: hover || selected ? 'block' : 'none' }}>
        {layer.zIndex}
      </div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
        <button onClick={onToggleLock} title={layer.locked ? 'Unlock' : 'Lock'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: layer.locked ? '#f59e0b' : '#cbd5e1', borderRadius: 4, display: hover || selected || layer.locked ? 'flex' : 'none', alignItems: 'center' }}>
          {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
        <button onClick={onToggleVisible} title={layer.visible ? 'Hide' : 'Show'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: layer.visible ? '#3b82f6' : '#94a3b8', borderRadius: 4, display: 'flex', alignItems: 'center' }}>
          {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        {onDelete && (
          <button onClick={onDelete} title="Delete"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: '#ef4444', borderRadius: 4, display: hover || selected ? 'flex' : 'none', alignItems: 'center' }}>
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
//  LAYER EDITOR (Photo / Sig properties panel)
// ─────────────────────────────────────────────────────────────
interface LayerEditorProps { layer: 'photo' | 'sig'; side: IDSide; onUpdate: (updates: Partial<IDSide>) => void; }
const LayerEditor = React.memo(({ layer, side: sd, onUpdate }: LayerEditorProps) => {
  const isPhoto = layer === 'photo';
  const accentColor = isPhoto ? '#3b82f6' : '#8b5cf6';

  const sliderRow = (lbl: string, val: number, min: number, max: number, key: string, accent: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{ fontSize: 11, color: '#64748b', minWidth: 68, fontWeight: 500 }}>{lbl}</label>
      <input type="range" min={min} max={max} step={1} value={val} onChange={e => onUpdate({ [key]: Number(e.target.value) })} style={{ flex: 1, accentColor: accent }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', minWidth: 36, textAlign: 'right' }}>{val}{max === 100 && min === 0 ? '%' : ''}</span>
    </div>
  );
  const colorRow = (lbl: string, val: string, key: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{ fontSize: 11, color: '#64748b', minWidth: 68, fontWeight: 500 }}>{lbl}</label>
      <input type="color" value={val} onChange={e => onUpdate({ [key]: e.target.value })} style={{ width: 36, height: 30, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 2, flexShrink: 0 }} />
      <input type="text" value={val} onChange={e => onUpdate({ [key]: e.target.value })} style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontFamily: 'monospace', outline: 'none', color: '#0f172a' }} />
    </div>
  );
  const panel = (title: string, children: React.ReactNode) => (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {panel('Position & Size',
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(isPhoto
            ? [{ l: 'X %', k: 'photoX', v: sd.photoX }, { l: 'Y %', k: 'photoY', v: sd.photoY }, { l: 'Width %', k: 'photoW', v: sd.photoW }, { l: 'Height %', k: 'photoH', v: sd.photoH }]
            : [{ l: 'X %', k: 'sigX', v: sd.sigX }, { l: 'Y %', k: 'sigY', v: sd.sigY }, { l: 'Width %', k: 'sigW', v: sd.sigW }, { l: 'Height %', k: 'sigH', v: sd.sigH }]
          ).map(({ l, k, v }) => (
            <div key={k}>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3, fontWeight: 500 }}>{l}</label>
              <input type="number" value={v} min={0} max={100} onChange={e => onUpdate({ [k]: Number(e.target.value) })} style={{ ...inpStyle, padding: '5px 8px' }} />
            </div>
          ))}
        </div>
      )}
      {!isPhoto && panel('Recolor Signature',
        <>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => onUpdate({ sigInkDark: true })} style={{ flex: 1, padding: 8, borderRadius: 8, border: (sd.sigInkDark !== false) ? `1px solid ${accentColor}` : '1px solid #e2e8f0', background: (sd.sigInkDark !== false) ? '#8b5cf615' : '#fff', color: (sd.sigInkDark !== false) ? '#7c3aed' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🖊 Dark Ink</button>
            <button onClick={() => onUpdate({ sigInkDark: false })} style={{ flex: 1, padding: 8, borderRadius: 8, border: (sd.sigInkDark === false) ? `1px solid ${accentColor}` : '1px solid #e2e8f0', background: (sd.sigInkDark === false) ? '#8b5cf615' : '#fff', color: (sd.sigInkDark === false) ? '#7c3aed' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>✒ White Ink</button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: sd.sigColorize ? '#8b5cf615' : '#fff', border: `1px solid ${sd.sigColorize ? '#8b5cf6' : '#e2e8f0'}`, borderRadius: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!sd.sigColorize} onChange={e => onUpdate({ sigColorize: e.target.checked })} style={{ accentColor: '#7c3aed', width: 16, height: 16 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: sd.sigColorize ? '#7c3aed' : '#475569' }}>{sd.sigColorize ? 'Recolor ON' : 'Recolor OFF'}</span>
          </label>
          {sd.sigColorize && colorRow('Target', sd.sigColorizeColor || '#ffffff', 'sigColorizeColor')}
          {sd.sigColorize && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[{ c: '#ffffff', l: 'White' }, { c: '#0f172a', l: 'Navy' }, { c: '#000000', l: 'Black' }, { c: '#f59e0b', l: 'Gold' }].map(({ c, l }) => (
                <button key={c} onClick={() => onUpdate({ sigColorizeColor: c })} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${(sd.sigColorizeColor || '#ffffff') === c ? accentColor : '#e2e8f0'}`, background: c, color: c === '#ffffff' || c === '#f59e0b' ? '#0f172a' : '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
              ))}
            </div>
          )}
        </>
      )}
      {isPhoto && panel('Color Overlay',
        <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: sd.photoColorize ? '#3b82f615' : '#fff', border: `1px solid ${sd.photoColorize ? '#3b82f6' : '#e2e8f0'}`, borderRadius: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!sd.photoColorize} onChange={e => onUpdate({ photoColorize: e.target.checked })} style={{ accentColor: '#3b82f6', width: 16, height: 16 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: sd.photoColorize ? '#2563eb' : '#475569' }}>{sd.photoColorize ? 'Colorize ON' : 'Colorize OFF'}</span>
          </label>
          {sd.photoColorize && colorRow('Color', sd.photoColorizeColor || '#000080', 'photoColorizeColor')}
        </>
      )}
      {panel('Brightness & Contrast',
        <>
          {sliderRow('Brightness', (isPhoto ? sd.photoBrightness : sd.sigBrightness) ?? 100, 0, 200, isPhoto ? 'photoBrightness' : 'sigBrightness', '#f59e0b')}
          {sliderRow('Contrast', (isPhoto ? sd.photoContrast : sd.sigContrast) ?? 100, 0, 200, isPhoto ? 'photoContrast' : 'sigContrast', '#06b6d4')}
          <button onClick={() => onUpdate(isPhoto ? { photoBrightness: 100, photoContrast: 100 } : { sigBrightness: 100, sigContrast: 100 })}
            style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: 11, fontWeight: 600, alignSelf: 'flex-start' }}>
            Reset
          </button>
        </>
      )}
      {panel(isPhoto ? 'Photo Stroke' : 'Signature Border',
        <>
          {sliderRow('Width', (isPhoto ? sd.photoStrokeWidth : sd.sigStrokeWidth) || 0, 0, 16, isPhoto ? 'photoStrokeWidth' : 'sigStrokeWidth', accentColor)}
          {colorRow('Color', (isPhoto ? sd.photoStrokeColor : sd.sigStrokeColor) || '#ffffff', isPhoto ? 'photoStrokeColor' : 'sigStrokeColor')}
        </>
      )}
      {panel(isPhoto ? 'Photo Shadow' : 'Signature Shadow',
        <>
          {sliderRow('Blur', (isPhoto ? sd.photoShadowBlur : sd.sigShadowBlur) || 0, 0, 30, isPhoto ? 'photoShadowBlur' : 'sigShadowBlur', '#64748b')}
          {colorRow('Color', (isPhoto ? sd.photoShadowColor : sd.sigShadowColor) || '#000000', isPhoto ? 'photoShadowColor' : 'sigShadowColor')}
        </>
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: (isPhoto ? sd.showPhoto : sd.showSig) ? '#10b98115' : '#ef444415', border: `1px solid ${(isPhoto ? sd.showPhoto : sd.showSig) ? '#10b981' : '#ef4444'}`, borderRadius: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={isPhoto ? sd.showPhoto : sd.showSig} onChange={e => onUpdate(isPhoto ? { showPhoto: e.target.checked } : { showSig: e.target.checked })} style={{ accentColor: (isPhoto ? sd.showPhoto : sd.showSig) ? '#10b981' : '#ef4444', width: 18, height: 18 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: (isPhoto ? sd.showPhoto : sd.showSig) ? '#059669' : '#dc2626' }}>{(isPhoto ? sd.showPhoto : sd.showSig) ? 'Layer visible on card' : 'Layer hidden from card'}</span>
      </label>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
//  FIELD EDITOR
// ─────────────────────────────────────────────────────────────
interface FieldEditorProps { field: IDField; onUpdate: (id: string, updates: Partial<IDField>) => void; }
const FieldEditor = React.memo(({ field, onUpdate }: FieldEditorProps) => {
  const [localVal, setLocalVal] = React.useState(field.value);
  const lastId = React.useRef(field.id);
  if (field.id !== lastId.current) { lastId.current = field.id; setLocalVal(field.value); }
  const lastVal = React.useRef(field.value);
  if (field.value !== lastVal.current && field.value !== localVal) { lastVal.current = field.value; setLocalVal(field.value); }

  const panel = (title: string, children: React.ReactNode) => (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0f4ff', borderRadius: 10, border: '1px solid #c7d2fe' }}>
        <span style={{ fontSize: 16 }}>✏️</span>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1px' }}>Editing Field</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{field.label}</div>
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Text Content</label>
        <textarea value={localVal} rows={3} onChange={e => { setLocalVal(e.target.value); onUpdate(field.id, { value: e.target.value }); }} style={{ ...inpStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }} />
      </div>
      {panel('Typography',
        <>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Font Size</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#667eea' }}>{field.fontSize}px</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => onUpdate(field.id, { fontSize: Math.max(6, field.fontSize - 1) })} style={{ width: 30, height: 30, border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>−</button>
              <input type="range" min={6} max={60} value={field.fontSize} onChange={e => onUpdate(field.id, { fontSize: Number(e.target.value) })} style={{ flex: 1, accentColor: '#667eea' }} />
              <button onClick={() => onUpdate(field.id, { fontSize: Math.min(60, field.fontSize + 1) })} style={{ width: 30, height: 30, border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>+</button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Color</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={field.color} onChange={e => onUpdate(field.id, { color: e.target.value })} style={{ width: 40, height: 36, border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', padding: 2, flexShrink: 0 }} />
              <input type="text" value={field.color} onChange={e => onUpdate(field.id, { color: e.target.value })} style={{ ...inpStyle, fontFamily: 'monospace', height: 36 }} />
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {['#ffffff', '#0f172a', '#667eea', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(t => (
                <button key={t} onClick={() => onUpdate(field.id, { color: t })} style={{ width: 22, height: 22, borderRadius: '50%', background: t, border: field.color === t ? '2px solid #667eea' : '1px solid #e2e8f0', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Font Family</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {([
                { label: 'Sans-Serif', value: "'Inter','Segoe UI',sans-serif" },
                { label: 'Serif', value: "Georgia,'Times New Roman',serif" },
                { label: 'Monospace', value: "'Courier New',monospace" },
                { label: 'Narrow', value: "'Arial Narrow',Impact,sans-serif" },
                { label: 'BankGothic', value: "'Bebas Neue','Rajdhani',Impact,sans-serif" },
                { label: 'Orbitron', value: "'Orbitron','Rajdhani',sans-serif" },
              ] as const).map(f => {
                const active = (field.fontFamily || "'Orbitron','Rajdhani',sans-serif").includes(f.value.split(',')[0]);
                return <button key={f.value} onClick={() => onUpdate(field.id, { fontFamily: f.value })} style={{ padding: '7px 4px', borderRadius: 7, border: active ? '1px solid #667eea' : '1px solid #e2e8f0', background: active ? '#667eea10' : '#fff', color: active ? '#667eea' : '#64748b', cursor: 'pointer', fontSize: 11, fontWeight: active ? 600 : 400, fontFamily: f.value, textAlign: 'center' }}>{f.label}</button>;
              })}
            </div>
          </div>
        </>
      )}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 7 }}>Style & Alignment</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onUpdate(field.id, { bold: !field.bold })} style={{ flex: 1, padding: 7, borderRadius: 7, border: field.bold ? '1px solid #667eea' : '1px solid #e2e8f0', background: field.bold ? '#667eea10' : '#fff', color: field.bold ? '#667eea' : '#64748b', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>B</button>
          <button onClick={() => onUpdate(field.id, { italic: !field.italic })} style={{ flex: 1, padding: 7, borderRadius: 7, border: field.italic ? '1px solid #667eea' : '1px solid #e2e8f0', background: field.italic ? '#667eea10' : '#fff', color: field.italic ? '#667eea' : '#64748b', cursor: 'pointer', fontStyle: 'italic', fontSize: 14, fontWeight: 600 }}>I</button>
          <button onClick={() => onUpdate(field.id, { underline: !field.underline })} style={{ flex: 1, padding: 7, borderRadius: 7, border: field.underline ? '1px solid #667eea' : '1px solid #e2e8f0', background: field.underline ? '#667eea10' : '#fff', color: field.underline ? '#667eea' : '#64748b', cursor: 'pointer', textDecoration: 'underline', fontSize: 14, fontWeight: 600 }}>U</button>
          {(['left', 'center', 'right'] as const).map(a => (
            <button key={a} onClick={() => onUpdate(field.id, { align: a })} style={{ flex: 1, padding: 7, borderRadius: 7, border: field.align === a ? '1px solid #667eea' : '1px solid #e2e8f0', background: field.align === a ? '#667eea10' : '#fff', color: field.align === a ? '#667eea' : '#64748b', cursor: 'pointer', fontSize: 13 }}>
              {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
            </button>
          ))}
        </div>
      </div>
      {panel('Position & Size',
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {([{ label: 'X %', key: 'x', val: field.x, min: 0, max: 100, step: 0.5 }, { label: 'Y %', key: 'y', val: field.y, min: 0, max: 100, step: 0.5 }, { label: 'Width %', key: 'w', val: field.w ?? 90, min: 5, max: 100, step: 1 }] as const).map(({ label, key, val, min, max, step }) => (
            <div key={key}>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3, fontWeight: 500 }}>{label}</label>
              <input type="number" value={Math.round(Number(val) * 10) / 10} min={min} max={max} step={step} onChange={e => onUpdate(field.id, { [key]: Number(e.target.value) })} style={{ ...inpStyle, padding: '5px 8px' }} />
            </div>
          ))}
        </div>
      )}
      {panel('Effects',
        <>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Text Stroke</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input type="range" min={0} max={8} step={0.5} value={field.strokeWidth || 0} onChange={e => onUpdate(field.id, { strokeWidth: Number(e.target.value) })} style={{ flex: 1, accentColor: '#667eea' }} />
              <span style={{ fontSize: 12, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{field.strokeWidth || 0}px</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="color" value={field.strokeColor || '#000000'} onChange={e => onUpdate(field.id, { strokeColor: e.target.value })} style={{ width: 36, height: 28, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 2, flexShrink: 0 }} />
              <input type="text" value={field.strokeColor || '#000000'} onChange={e => onUpdate(field.id, { strokeColor: e.target.value })} style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', fontSize: 12, fontFamily: 'monospace', outline: 'none', color: '#0f172a' }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Text Shadow</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input type="range" min={0} max={20} step={1} value={field.shadowBlur || 0} onChange={e => onUpdate(field.id, { shadowBlur: Number(e.target.value) })} style={{ flex: 1, accentColor: '#64748b' }} />
              <span style={{ fontSize: 12, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{field.shadowBlur || 0}px</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="color" value={field.shadowColor || '#000000'} onChange={e => onUpdate(field.id, { shadowColor: e.target.value })} style={{ width: 36, height: 28, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 2, flexShrink: 0 }} />
              <input type="text" value={field.shadowColor || '#000000'} onChange={e => onUpdate(field.id, { shadowColor: e.target.value })} style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', fontSize: 12, fontFamily: 'monospace', outline: 'none', color: '#0f172a' }} />
            </div>
          </div>
        </>
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: field.visible ? '#10b98115' : '#ef444415', border: `1px solid ${field.visible ? '#10b981' : '#ef4444'}`, borderRadius: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={field.visible} onChange={e => onUpdate(field.id, { visible: e.target.checked })} style={{ accentColor: field.visible ? '#10b981' : '#ef4444', width: 18, height: 18 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: field.visible ? '#059669' : '#dc2626' }}>{field.visible ? 'Field visible on card' : 'Field hidden'}</span>
      </label>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
interface TemplateManagerProps {
  editingTemplate?: IDTemplate | null;
  onBack?: () => void;
}
export default function TemplateManager({ editingTemplate, onBack }: TemplateManagerProps) {
  const CARD_W = 214, CARD_H = 340;

  // core state
  const [activeSide, setActiveSide] = React.useState<'front' | 'back'>('front');
  const getMobileZoom = () => typeof window !== 'undefined' && window.innerWidth < 768 ? Math.min((window.innerWidth - 48) / 214, 1.2) : 1.0;
  const [zoom, setZoom] = React.useState(getMobileZoom);
  const [showGrid, setShowGrid] = React.useState(false);
  const [snap, setSnap] = React.useState(true);

  // left panel
  const [leftTab, setLeftTab] = React.useState<'layers' | 'elements' | 'background'>('layers');

  // locked layers map
  const [lockedLayers, setLockedLayers] = React.useState<Record<string, boolean>>({});
  const isLocked = (id: string) => !!lockedLayers[id];
  const toggleLock = (id: string) => setLockedLayers(p => ({ ...p, [id]: !p[id] }));

  // layer drag-to-reorder state
  const [dragReorderFrom, setDragReorderFrom] = React.useState<string | null>(null);
  // persists drag-reordered position of special layers (photo/sig/qr)
  const [specialLayerOrder, setSpecialLayerOrder] = React.useState<string[]>(["photo", "sig", "qr"]);

  // shape state
  const [selectedShapeId, setSelectedShapeId] = React.useState<string | null>(null);
  const [draggingShapeId, setDraggingShapeId] = React.useState<string | null>(null);
  const [shapeDragOffset, setShapeDragOffset] = React.useState({ x: 0, y: 0 });
  const [resizingShape, setResizingShape] = React.useState<{ id: string; handle: string } | null>(null);
  const [shapeResizeStart, setShapeResizeStart] = React.useState({ mouseX: 0, mouseY: 0, w: 0, h: 0, x: 0, y: 0 });

  const addShape = (type: ShapeElement['type']) => {
    const s: ShapeElement = { id: `shape_${Date.now()}`, type, x: 50, y: 50, w: type === 'line' ? 60 : 40, h: type === 'line' ? 4 : 30, fill: type === 'line' ? 'transparent' : '#667eea', fillOpacity: 80, stroke: '#667eea', strokeWidth: type === 'line' ? 3 : 0, borderRadius: type === 'rect' ? 4 : 0 };
    setSide((p: IDSide) => ({ ...p, shapes: [...(p.shapes || []), s] }));
    setSelectedShapeId(s.id); setSelectedFieldId(null); setSelectedLayer(null); setSelectedQR(false);
  };
  const addTextBox = () => {
    const f: IDField = { id: `text_${Date.now()}`, label: 'Text Box', value: 'Text', x: 50, y: 50, fontSize: 14, color: '#ffffff', bold: false, italic: false, align: 'center', visible: true, w: 80 };
    setSide((p: IDSide) => ({ ...p, fields: [...p.fields, f] }));
    setSelectedFieldId(f.id); setSelectedShapeId(null); setSelectedLayer(null); setSelectedQR(false);
  };
  const updateShape = (id: string, updates: Partial<ShapeElement>) => setSide((p: IDSide) => ({ ...p, shapes: (p.shapes || []).map((s: ShapeElement) => s.id === id ? { ...s, ...updates } : s) }));
  const deleteShape = (id: string) => { setSide((p: IDSide) => ({ ...p, shapes: (p.shapes || []).filter((s: ShapeElement) => s.id !== id) })); setSelectedShapeId(null); };
  const deleteField = (id: string) => { setSide((p: IDSide) => ({ ...p, fields: p.fields.filter((f: IDField) => f.id !== id) })); setSelectedFieldId(null); };

  // ─── Canvas Image handlers ───
  const [selectedCanvasImgId, setSelectedCanvasImgId] = React.useState<string | null>(null);
  const [draggingCanvasImgId, setDraggingCanvasImgId] = React.useState<string | null>(null);
  const [canvasImgDragOffset, setCanvasImgDragOffset] = React.useState({ x: 0, y: 0 });
  const [resizingCanvasImg, setResizingCanvasImg] = React.useState<{ id: string; handle: string } | null>(null);
  const [canvasImgResizeStart, setCanvasImgResizeStart] = React.useState({ mouseX: 0, mouseY: 0, w: 0, h: 0, x: 0, y: 0 });

  const addCanvasImages = (files: FileList) => {
    const readers = Array.from(files).map((file, i) => new Promise<CanvasImage>(res => {
      const r = new FileReader();
      r.onload = () => {
        const img: CanvasImage = {
          id: `cimg_${Date.now()}_${i}`,
          src: r.result as string,
          label: file.name.replace(/\.[^.]+$/, '').slice(0, 20) || `Image ${i + 1}`,
          x: 50, y: 50, w: 60, h: 40,
          opacity: 100, borderRadius: 0, rotation: 0,
        };
        res(img);
      };
      r.readAsDataURL(file);
    }));
    Promise.all(readers).then(imgs => {
      setSide((p: IDSide) => ({ ...p, canvasImages: [...(p.canvasImages || []), ...imgs] }));
      if (imgs.length > 0) { setSelectedCanvasImgId(imgs[imgs.length - 1].id); setSelectedFieldId(null); setSelectedLayer(null); setSelectedShapeId(null); setSelectedQR(false); }
    });
  };

  const updateCanvasImg = (id: string, updates: Partial<CanvasImage>) =>
    setSide((p: IDSide) => ({ ...p, canvasImages: (p.canvasImages || []).map((ci: CanvasImage) => ci.id === id ? { ...ci, ...updates } : ci) }));

  const deleteCanvasImg = (id: string) => {
    setSide((p: IDSide) => ({ ...p, canvasImages: (p.canvasImages || []).filter((ci: CanvasImage) => ci.id !== id) }));
    setSelectedCanvasImgId(null);
  };

  // field interaction
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = React.useState<'photo' | 'sig' | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [draggingLayer, setDraggingLayer] = React.useState<'photo' | 'sig' | null>(null);
  const [layerDragOffset, setLayerDragOffset] = React.useState({ x: 0, y: 0 });
  const [resizingLayer, setResizingLayer] = React.useState<{ layer: 'photo' | 'sig'; handle: string } | null>(null);
  const [resizeStart, setResizeStart] = React.useState({ mouseX: 0, mouseY: 0, w: 0, h: 0, x: 0, y: 0 });
  const pendingDrag = React.useRef<{ type: 'field' | 'layer' | 'shape' | 'canvasimg'; id: string; startX: number; startY: number; offset: { x: number; y: number } } | null>(null);
  const isDragging = React.useRef(false);
  const cardFrontRef = React.useRef<HTMLDivElement>(null);
  const cardBackRef = React.useRef<HTMLDivElement>(null);

  // card data
  const companyFrontDefault: IDField = { id: 'company',      label: 'Company', value: '', x: 50, y: 88, fontSize: 8, color: '#ffffff', bold: false, italic: false, align: 'center', visible: false };
  const companyBackDefault:  IDField = { id: 'company_back', label: 'Company', value: '', x: 50, y: 88, fontSize: 8, color: '#ffffff', bold: false, italic: false, align: 'center', visible: false };
  const ensureFrontCompany = (side: IDSide): IDSide => {
    if (side.fields.some(f => f.id === 'company')) return side;
    return { ...side, fields: [...side.fields, companyFrontDefault] };
  };
  const ensureBackCompany = (side: IDSide): IDSide => {
    if (side.fields.some(f => f.id === 'company_back')) return side;
    return { ...side, fields: [...side.fields, companyBackDefault] };
  };

  const [front, setFront] = React.useState<IDSide>(ensureFrontCompany(editingTemplate?.front ?? {
    background: null, fields: defaultFrontFields,
    photoX: 50, photoY: 48, photoW: 70, photoH: 44, showPhoto: true,
    sigX: 35, sigY: 86, sigW: 40, sigH: 8, showSig: true,
  }));
  const [back, setBack] = React.useState<IDSide>(ensureBackCompany(editingTemplate?.back ?? {
    background: null, fields: defaultBackFields,
    photoX: 50, photoY: 48, photoW: 70, photoH: 50, showPhoto: false,
    sigX: 35, sigY: 85, sigW: 40, sigH: 8, showSig: false,
    showQR: true, qrX: 50, qrY: 42, qrSize: 70,
    qrUrl: 'https://employee.abas.ph/verify/',
    qrFg: '#000000', qrBg: '#ffffff',
  }));

  // history
  const [history, setHistory] = React.useState<{ front: IDSide; back: IDSide }[]>([]);
  const [historyIdx, setHistoryIdx] = React.useState(-1);
  const pushHistory = React.useCallback((f: IDSide, b: IDSide) => {
    setHistory(p => [...p.slice(0, historyIdx + 1), { front: f, back: b }].slice(-40));
    setHistoryIdx(p => Math.min(p + 1, 39));
  }, [historyIdx]);
  const undo = () => { if (historyIdx <= 0) return; const i = historyIdx - 1; setFront(history[i].front); setBack(history[i].back); setHistoryIdx(i); };
  const redo = () => { if (historyIdx >= history.length - 1) return; const i = historyIdx + 1; setFront(history[i].front); setBack(history[i].back); setHistoryIdx(i); };

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  // templates
  const [templates, setTemplates] = React.useState<IDTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = React.useState(false);
  const [templateName, setTemplateName] = React.useState(editingTemplate?.name || '');
  const [templateCompany, setTemplateCompany] = React.useState(editingTemplate?.company || '');
  React.useEffect(() => { fetch(`${API_URL}/templates`).then(r => r.ok ? r.json() : []).then(setTemplates).catch(() => {}); }, []);

  // notifications
  const [msg, setMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const [showFlip, setShowFlip] = React.useState(false);

  // mobile
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [mobileTab, setMobileTab] = React.useState<'layers' | 'canvas' | 'props'>('canvas');
  React.useEffect(() => {
    const h = () => { const m = window.innerWidth < 768; setIsMobile(m); if (m) setZoom(Math.min((window.innerWidth - 48) / 214, 1.2)); else setZoom(1.0); };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const [flipFace, setFlipFace] = React.useState<'front' | 'back'>('front');
  const [flipAnim, setFlipAnim] = React.useState(false);
  const [frontUrl, setFrontUrl] = React.useState<string | null>(null);
  const [backUrl, setBackUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!showFlip) return;
    (async () => {
      const [f, b] = await Promise.all([renderSide('front'), renderSide('back')]);
      setFrontUrl(f); setBackUrl(b); setFlipFace('front'); setFlipAnim(false);
    })();
  }, [showFlip]);

  const doFlip = () => { setFlipAnim(true); setTimeout(() => { setFlipFace(p => p === 'front' ? 'back' : 'front'); setFlipAnim(false); }, 300); };

  const handlePrint = async () => {
    const [fUrl, bUrl] = await Promise.all([renderSide('front'), renderSide('back')]);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Print ID Card</title><style>@page{size:54mm 85.6mm;margin:0}*{margin:0;padding:0;box-sizing:border-box}body{background:#fff}.card{width:54mm;height:85.6mm;position:relative;overflow:hidden;break-after:page}.card img{width:100%;height:100%;object-fit:fill;display:block}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="card"><img src="${fUrl}"/></div><div class="card"><img src="${bUrl}"/></div></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000); };

  const side = activeSide === 'front' ? front : back;
  const setSide = activeSide === 'front' ? setFront : setBack;
  const activeRef = activeSide === 'front' ? cardFrontRef : cardBackRef;
  const selectedField = side.fields.find((f: IDField) => f.id === selectedFieldId) || null;
  const selectedShape = (side.shapes || []).find((s: ShapeElement) => s.id === selectedShapeId) || null;
  const selectedCanvasImg = (side.canvasImages || []).find((ci: CanvasImage) => ci.id === selectedCanvasImgId) || null;  // ← add here


  const updateField = (id: string, updates: Partial<IDField>) => setSide((p: IDSide) => ({ ...p, fields: p.fields.map((f: IDField) => f.id === id ? { ...f, ...updates } : f) }));
  const updateSideProps = (updates: Partial<IDSide>) => setSide((p: IDSide) => ({ ...p, ...updates }));
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const r = new FileReader(); r.onload = () => updateSideProps({ background: r.result as string }); r.readAsDataURL(file); e.target.value = ''; };

  const DUMMY_PHOTO = 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#cbd5e1"/><circle cx="50" cy="38" r="18" fill="#94a3b8"/><ellipse cx="50" cy="80" rx="28" ry="20" fill="#94a3b8"/><text x="50" y="58" text-anchor="middle" fill="#64748b" font-size="10" font-family="sans-serif">PHOTO</text></svg>`);
  const DUMMY_SIG = 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60"><rect width="200" height="60" fill="transparent"/><path d="M10 40 Q30 10 50 35 Q70 55 90 25 Q110 5 130 30 Q150 50 170 20 Q185 5 195 25" stroke="#94a3b8" stroke-width="3" fill="none" stroke-linecap="round"/><text x="100" y="55" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="sans-serif">SIGNATURE</text></svg>`);
  const DUMMY_QR = 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ffffff"/><rect x="5" y="5" width="35" height="35" fill="none" stroke="#000" stroke-width="4"/><rect x="13" y="13" width="19" height="19" fill="#000"/><rect x="60" y="5" width="35" height="35" fill="none" stroke="#000" stroke-width="4"/><rect x="68" y="13" width="19" height="19" fill="#000"/><rect x="5" y="60" width="35" height="35" fill="none" stroke="#000" stroke-width="4"/><rect x="13" y="68" width="19" height="19" fill="#000"/><rect x="60" y="60" width="8" height="8" fill="#000"/><rect x="72" y="60" width="8" height="8" fill="#000"/><rect x="84" y="60" width="8" height="8" fill="#000"/><rect x="60" y="72" width="8" height="8" fill="#000"/><rect x="84" y="72" width="8" height="8" fill="#000"/><rect x="60" y="84" width="8" height="8" fill="#000"/><rect x="72" y="84" width="8" height="8" fill="#000"/><rect x="84" y="84" width="8" height="8" fill="#000"/></svg>`);

  const [selectedQR, setSelectedQR] = React.useState(false);

  // ─── BUILD LAYER LIST ───
  const buildLayers = React.useCallback((sd: IDSide, isBack: boolean): Layer[] => {
    const layers: Layer[] = [];
    let z = 1;
    // Special layers ordered by specialLayerOrder
    const orderedSpecial = specialLayerOrder.filter(id => id !== 'qr' || isBack);
    orderedSpecial.forEach(id => {
      if (id === 'photo') layers.push({ id: 'photo', kind: 'photo', label: 'Employee Photo', visible: !!sd.showPhoto, locked: isLocked('photo'), zIndex: z++ });
      else if (id === 'sig') layers.push({ id: 'sig', kind: 'sig', label: 'Signature', visible: !!sd.showSig, locked: isLocked('sig'), zIndex: z++ });
      else if (id === 'qr') layers.push({ id: 'qr', kind: 'qr', label: 'QR Code', visible: !!sd.showQR, locked: isLocked('qr'), zIndex: z++ });
    });
    (sd.canvasImages || []).forEach((ci: CanvasImage) => { layers.push({ id: ci.id, kind: 'canvasimg', label: ci.label, visible: true, locked: isLocked(ci.id), zIndex: z++, thumb: ci.src }); });
    (sd.shapes || []).forEach((sh: ShapeElement) => { layers.push({ id: sh.id, kind: 'shape', label: `${sh.type.charAt(0).toUpperCase() + sh.type.slice(1)}`, visible: true, locked: isLocked(sh.id), zIndex: z++, color: sh.fill !== 'transparent' ? sh.fill : sh.stroke }); });
    sd.fields.forEach((f: IDField) => { layers.push({ id: f.id, kind: 'text', label: f.label, visible: f.visible, locked: isLocked(f.id), zIndex: z++, color: f.color }); });
    return layers.reverse();
  }, [lockedLayers, specialLayerOrder]);

  const layers = buildLayers(side, activeSide === 'back');

  const selectedLayerId = selectedLayer || selectedShapeId || selectedCanvasImgId || selectedFieldId || (selectedQR ? 'qr' : null);

  const selectLayer = (id: string) => {
    if (id === 'photo') { setSelectedLayer('photo'); setSelectedFieldId(null); setSelectedShapeId(null); setSelectedQR(false); setSelectedCanvasImgId(null); if (isMobile) setMobileTab('props'); }
    else if (id === 'sig') { setSelectedLayer('sig'); setSelectedFieldId(null); setSelectedShapeId(null); setSelectedQR(false); setSelectedCanvasImgId(null); if (isMobile) setMobileTab('props'); }
    else if (id === 'qr') { setSelectedQR(true); setSelectedLayer(null); setSelectedFieldId(null); setSelectedShapeId(null); setSelectedCanvasImgId(null); if (isMobile) setMobileTab('props'); }
    else if ((side.canvasImages || []).find((ci: CanvasImage) => ci.id === id)) { setSelectedCanvasImgId(id); setSelectedLayer(null); setSelectedFieldId(null); setSelectedShapeId(null); setSelectedQR(false); if (isMobile) setMobileTab('props'); }
    else if ((side.shapes || []).find((s: ShapeElement) => s.id === id)) { setSelectedShapeId(id); setSelectedLayer(null); setSelectedFieldId(null); setSelectedQR(false); setSelectedCanvasImgId(null); if (isMobile) setMobileTab('props'); }
    else { setSelectedFieldId(id); setSelectedLayer(null); setSelectedShapeId(null); setSelectedQR(false); setSelectedCanvasImgId(null); if (isMobile) setMobileTab('props'); }
  };

  const toggleLayerVisible = (id: string) => {
    if (id === 'photo') updateSideProps({ showPhoto: !side.showPhoto });
    else if (id === 'sig') updateSideProps({ showSig: !side.showSig });
    else if (id === 'qr') setSide((p: IDSide) => ({ ...p, showQR: !p.showQR }));
    else if ((side.canvasImages || []).find((ci: CanvasImage) => ci.id === id)) {/* canvas images always visible, handled by opacity */}
    else if ((side.shapes || []).find((s: ShapeElement) => s.id === id)) {
      const sh = (side.shapes || []).find((s: ShapeElement) => s.id === id)!;
      updateShape(id, { fillOpacity: sh.fillOpacity > 0 ? 0 : 80 });
    }
    else updateField(id, { visible: !side.fields.find((f: IDField) => f.id === id)?.visible });
  };

  const deleteLayer = (id: string) => {
    if ((side.shapes || []).find((s: ShapeElement) => s.id === id)) deleteShape(id);
    else if ((side.canvasImages || []).find((ci: CanvasImage) => ci.id === id)) deleteCanvasImg(id);
    else if (side.fields.find((f: IDField) => f.id === id)) deleteField(id);
  };

  const isDeletable = (id: string) => {
    const f = side.fields.find((f: IDField) => f.id === id);
    return f?.label === 'Text Box' || !!(side.shapes || []).find((s: ShapeElement) => s.id === id) || !!(side.canvasImages || []).find((ci: CanvasImage) => ci.id === id);
  };

  // ─── mouse handlers ───
  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
    if (isLocked(fieldId)) return;
    if (isMobile) setMobileTab('props');
    e.stopPropagation(); e.preventDefault();
    setSelectedFieldId(fieldId); setSelectedLayer(null); setSelectedQR(false);
    const rect = activeRef.current!.getBoundingClientRect();
    const f = side.fields.find((f: IDField) => f.id === fieldId)!;
    const offset = { x: e.clientX - rect.left - (f.x / 100 * CARD_W * zoom), y: e.clientY - rect.top - (f.y / 100 * CARD_H * zoom) };
    isDragging.current = false;
    pendingDrag.current = { type: 'field', id: fieldId, startX: e.clientX, startY: e.clientY, offset };
  };

  const handleLayerMouseDown = (e: React.MouseEvent, layer: 'photo' | 'sig') => {
    if (isLocked(layer)) return;
    if (isMobile) setMobileTab('props');
    e.stopPropagation(); e.preventDefault();
    setSelectedLayer(layer); setSelectedFieldId(null);
    const rect = activeRef.current!.getBoundingClientRect();
    const xKey = layer === 'photo' ? 'photoX' : 'sigX', yKey = layer === 'photo' ? 'photoY' : 'sigY';
    const cx = (side as any)[xKey], cy = (side as any)[yKey];
    const offset = { x: e.clientX - rect.left - (cx / 100 * CARD_W * zoom), y: e.clientY - rect.top - (cy / 100 * CARD_H * zoom) };
    isDragging.current = false;
    pendingDrag.current = { type: 'layer', id: layer, startX: e.clientX, startY: e.clientY, offset };
  };

  const handleResizeMouseDown = (e: React.MouseEvent, layer: 'photo' | 'sig', handle: string) => {
    e.stopPropagation(); e.preventDefault();
    pendingDrag.current = null;
    const wKey = layer === 'photo' ? 'photoW' : 'sigW', hKey = layer === 'photo' ? 'photoH' : 'sigH';
    const xKey = layer === 'photo' ? 'photoX' : 'sigX', yKey = layer === 'photo' ? 'photoY' : 'sigY';
    setResizingLayer({ layer, handle });
    setResizeStart({ mouseX: e.clientX, mouseY: e.clientY, w: (side as any)[wKey], h: (side as any)[hKey], x: (side as any)[xKey], y: (side as any)[yKey] });
  };

  const handleShapeMouseDown = (e: React.MouseEvent, shapeId: string) => {
    if (isLocked(shapeId)) return;
    if (isMobile) setMobileTab('props');
    e.stopPropagation(); e.preventDefault();
    setSelectedShapeId(shapeId); setSelectedFieldId(null); setSelectedLayer(null); setSelectedQR(false);
    const rect = activeRef.current!.getBoundingClientRect();
    const sh = (side.shapes || []).find((s: ShapeElement) => s.id === shapeId)!;
    const offset = { x: e.clientX - rect.left - (sh.x / 100 * CARD_W * zoom), y: e.clientY - rect.top - (sh.y / 100 * CARD_H * zoom) };
    isDragging.current = false;
    pendingDrag.current = { type: 'shape', id: shapeId, startX: e.clientX, startY: e.clientY, offset };
  };

  const handleShapeResizeMouseDown = (e: React.MouseEvent, shapeId: string, handle: string) => {
    e.stopPropagation(); e.preventDefault();
    pendingDrag.current = null;
    const sh = (side.shapes || []).find((s: ShapeElement) => s.id === shapeId)!;
    setResizingShape({ id: shapeId, handle });
    setShapeResizeStart({ mouseX: e.clientX, mouseY: e.clientY, w: sh.w, h: sh.h, x: sh.x, y: sh.y });
  };

  const handleCanvasImgMouseDown = (e: React.MouseEvent, imgId: string) => {
    if (isLocked(imgId)) return;
    if (isMobile) setMobileTab('props');
    e.stopPropagation(); e.preventDefault();
    setSelectedCanvasImgId(imgId); setSelectedFieldId(null); setSelectedLayer(null); setSelectedShapeId(null); setSelectedQR(false);
    const rect = activeRef.current!.getBoundingClientRect();
    const ci = (side.canvasImages || []).find((c: CanvasImage) => c.id === imgId)!;
    const offset = { x: e.clientX - rect.left - (ci.x / 100 * CARD_W * zoom), y: e.clientY - rect.top - (ci.y / 100 * CARD_H * zoom) };
    isDragging.current = false;
    pendingDrag.current = { type: 'canvasimg', id: imgId, startX: e.clientX, startY: e.clientY, offset };
  };

  const handleCanvasImgResizeMouseDown = (e: React.MouseEvent, imgId: string, handle: string) => {
    e.stopPropagation(); e.preventDefault();
    pendingDrag.current = null;
    const ci = (side.canvasImages || []).find((c: CanvasImage) => c.id === imgId)!;
    setResizingCanvasImg({ id: imgId, handle });
    setCanvasImgResizeStart({ mouseX: e.clientX, mouseY: e.clientY, w: ci.w, h: ci.h, x: ci.x, y: ci.y });
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    const THRESHOLD = 4;
    if (pendingDrag.current && !isDragging.current) {
      const dx = Math.abs(e.clientX - pendingDrag.current.startX), dy = Math.abs(e.clientY - pendingDrag.current.startY);
      if (dx > THRESHOLD || dy > THRESHOLD) {
        isDragging.current = true;
        if (pendingDrag.current.type === 'field') { setDraggingId(pendingDrag.current.id); setDragOffset(pendingDrag.current.offset); }
        else if (pendingDrag.current.type === 'shape') { setDraggingShapeId(pendingDrag.current.id); setShapeDragOffset(pendingDrag.current.offset); }
        else if (pendingDrag.current.type === 'canvasimg') { setDraggingCanvasImgId(pendingDrag.current.id); setCanvasImgDragOffset(pendingDrag.current.offset); }
        else { setDraggingLayer(pendingDrag.current.id as 'photo' | 'sig'); setLayerDragOffset(pendingDrag.current.offset); }
      }
      return;
    }
    if (draggingId && activeRef.current) {
      const rect = activeRef.current.getBoundingClientRect();
      let x = (e.clientX - rect.left - dragOffset.x) / zoom / CARD_W * 100, y = (e.clientY - rect.top - dragOffset.y) / zoom / CARD_H * 100;
      if (snap) { x = Math.round(x / 5) * 5; y = Math.round(y / 5) * 5; }
      x = Math.max(0, Math.min(100, x)); y = Math.max(0, Math.min(100, y));
      setSide((p: IDSide) => ({ ...p, fields: p.fields.map((f: IDField) => f.id === draggingId ? { ...f, x, y } : f) }));
      return;
    }
    if (draggingShapeId && activeRef.current) {
      const rect = activeRef.current.getBoundingClientRect();
      let x = (e.clientX - rect.left - shapeDragOffset.x) / zoom / CARD_W * 100, y = (e.clientY - rect.top - shapeDragOffset.y) / zoom / CARD_H * 100;
      if (snap) { x = Math.round(x / 5) * 5; y = Math.round(y / 5) * 5; }
      x = Math.max(0, Math.min(100, x)); y = Math.max(0, Math.min(100, y));
      setSide((p: IDSide) => ({ ...p, shapes: (p.shapes || []).map((s: ShapeElement) => s.id === draggingShapeId ? { ...s, x, y } : s) }));
      return;
    }
    if (draggingLayer && activeRef.current) {
      const rect = activeRef.current.getBoundingClientRect();
      let x = (e.clientX - rect.left - layerDragOffset.x) / zoom / CARD_W * 100, y = (e.clientY - rect.top - layerDragOffset.y) / zoom / CARD_H * 100;
      if (snap) { x = Math.round(x / 5) * 5; y = Math.round(y / 5) * 5; }
      x = Math.max(0, Math.min(100, x)); y = Math.max(0, Math.min(100, y));
      const xKey = draggingLayer === 'photo' ? 'photoX' : 'sigX', yKey = draggingLayer === 'photo' ? 'photoY' : 'sigY';
      setSide((p: IDSide) => ({ ...p, [xKey]: x, [yKey]: y }));
      return;
    }
    if (resizingShape && activeRef.current) {
      const { id, handle } = resizingShape;
      const dx = (e.clientX - shapeResizeStart.mouseX) / zoom / CARD_W * 100, dy = (e.clientY - shapeResizeStart.mouseY) / zoom / CARD_H * 100;
      let w = shapeResizeStart.w, h = shapeResizeStart.h;
      if (handle.includes('e')) w = Math.max(5, shapeResizeStart.w + dx * 2);
      if (handle.includes('w')) w = Math.max(5, shapeResizeStart.w - dx * 2);
      if (handle.includes('s')) h = Math.max(5, shapeResizeStart.h + dy * 2);
      if (handle.includes('n')) h = Math.max(5, shapeResizeStart.h - dy * 2);
      if (snap) { w = Math.round(w / 5) * 5; h = Math.round(h / 5) * 5; }
      setSide((p: IDSide) => ({ ...p, shapes: (p.shapes || []).map((s: ShapeElement) => s.id === id ? { ...s, w, h } : s) }));
      return;
    }
    if (resizingLayer && activeRef.current) {
      const { layer, handle } = resizingLayer;
      const dx = (e.clientX - resizeStart.mouseX) / zoom / CARD_W * 100, dy = (e.clientY - resizeStart.mouseY) / zoom / CARD_H * 100;
      const wKey = layer === 'photo' ? 'photoW' : 'sigW', hKey = layer === 'photo' ? 'photoH' : 'sigH';
      const xKey = layer === 'photo' ? 'photoX' : 'sigX', yKey = layer === 'photo' ? 'photoY' : 'sigY';
      let w = resizeStart.w, h = resizeStart.h;
      if (handle.includes('e')) w = Math.max(5, resizeStart.w + dx * 2);
      if (handle.includes('w')) w = Math.max(5, resizeStart.w - dx * 2);
      if (handle.includes('s')) h = Math.max(5, resizeStart.h + dy * 2);
      if (handle.includes('n')) h = Math.max(5, resizeStart.h - dy * 2);
      if (snap) { w = Math.round(w / 5) * 5; h = Math.round(h / 5) * 5; }
      setSide((p: IDSide) => ({ ...p, [wKey]: w, [hKey]: h, [xKey]: resizeStart.x, [yKey]: resizeStart.y }));
    }
    if (draggingCanvasImgId && activeRef.current) {
      const rect = activeRef.current.getBoundingClientRect();
      let x = (e.clientX - rect.left - canvasImgDragOffset.x) / zoom / CARD_W * 100, y = (e.clientY - rect.top - canvasImgDragOffset.y) / zoom / CARD_H * 100;
      if (snap) { x = Math.round(x / 5) * 5; y = Math.round(y / 5) * 5; }
      x = Math.max(0, Math.min(100, x)); y = Math.max(0, Math.min(100, y));
      setSide((p: IDSide) => ({ ...p, canvasImages: (p.canvasImages || []).map((ci: CanvasImage) => ci.id === draggingCanvasImgId ? { ...ci, x, y } : ci) }));
      return;
    }
    if (resizingCanvasImg && activeRef.current) {
      const { id, handle } = resizingCanvasImg;
      const dx = (e.clientX - canvasImgResizeStart.mouseX) / zoom / CARD_W * 100, dy = (e.clientY - canvasImgResizeStart.mouseY) / zoom / CARD_H * 100;
      let w = canvasImgResizeStart.w, h = canvasImgResizeStart.h;
      if (handle.includes('e')) w = Math.max(5, canvasImgResizeStart.w + dx * 2);
      if (handle.includes('w')) w = Math.max(5, canvasImgResizeStart.w - dx * 2);
      if (handle.includes('s')) h = Math.max(5, canvasImgResizeStart.h + dy * 2);
      if (handle.includes('n')) h = Math.max(5, canvasImgResizeStart.h - dy * 2);
      if (snap) { w = Math.round(w / 5) * 5; h = Math.round(h / 5) * 5; }
      setSide((p: IDSide) => ({ ...p, canvasImages: (p.canvasImages || []).map((ci: CanvasImage) => ci.id === id ? { ...ci, w, h } : ci) }));
    }
  }, [draggingId, draggingShapeId, draggingLayer, draggingCanvasImgId, resizingLayer, resizingShape, resizingCanvasImg, dragOffset, shapeDragOffset, layerDragOffset, canvasImgDragOffset, resizeStart, shapeResizeStart, canvasImgResizeStart, zoom, activeSide, snap]);

  const handleMouseUp = React.useCallback(() => {
    const wasDragging = isDragging.current;
    pendingDrag.current = null; isDragging.current = false;
    if (draggingId || draggingShapeId || draggingLayer || draggingCanvasImgId || resizingLayer || resizingShape || resizingCanvasImg || wasDragging) {
      setDraggingId(null); setDraggingShapeId(null); setDraggingLayer(null); setDraggingCanvasImgId(null);
      setResizingLayer(null); setResizingShape(null); setResizingCanvasImg(null);
      if (wasDragging) pushHistory(front, back);
    }
  }, [draggingId, draggingShapeId, draggingLayer, draggingCanvasImgId, resizingLayer, resizingShape, resizingCanvasImg, front, back, pushHistory]);

  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!arrows.includes(e.key)) return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      if (selectedFieldId) setSide((p: IDSide) => ({ ...p, fields: p.fields.map((f: IDField) => f.id === selectedFieldId ? { ...f, x: Math.max(0, Math.min(100, f.x + dx)), y: Math.max(0, Math.min(100, f.y + dy)) } : f) }));
      else if (selectedLayer) {
        const xKey = selectedLayer === 'photo' ? 'photoX' : 'sigX', yKey = selectedLayer === 'photo' ? 'photoY' : 'sigY';
        setSide((p: IDSide) => ({ ...p, [xKey]: Math.max(0, Math.min(100, (p as any)[xKey] + dx)), [yKey]: Math.max(0, Math.min(100, (p as any)[yKey] + dy)) }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedFieldId, selectedLayer, activeSide]);

  // renderSide (canvas export)
  const renderSide = React.useCallback(async (which: 'front' | 'back'): Promise<string> => {
    const sd = which === 'front' ? front : back;
    const SCALE = 4, W = CARD_W * SCALE, H = CARD_H * SCALE;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d')!;
    ctx.scale(SCALE, SCALE);
    const li = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => res(img); img.onerror = rej; img.src = src; });

    if (sd.background) { try { const img = await li(sd.background); const iw = img.naturalWidth, ih = img.naturalHeight; const scale = Math.max(CARD_W / iw, CARD_H / ih); const sw = iw * scale, sh = ih * scale; ctx.drawImage(img, (CARD_W - sw) / 2, (CARD_H - sh) / 2, sw, sh); } catch { ctx.fillStyle = '#cc0000'; ctx.fillRect(0, 0, CARD_W, CARD_H); } }
    else if (sd.bgGradient) { const g = sd.bgGradient; let grd: CanvasGradient; if (g.type === 'radial') { grd = ctx.createRadialGradient(CARD_W / 2, CARD_H / 2, 0, CARD_W / 2, CARD_H / 2, Math.max(CARD_W, CARD_H) / 2); } else { const rad = ((g.angle ?? 135) * Math.PI) / 180; const cx2 = CARD_W / 2, cy2 = CARD_H / 2, len = Math.sqrt(CARD_W * CARD_W + CARD_H * CARD_H) / 2; grd = ctx.createLinearGradient(cx2 - Math.cos(rad) * len, cy2 - Math.sin(rad) * len, cx2 + Math.cos(rad) * len, cy2 + Math.sin(rad) * len); } grd.addColorStop(0, g.color1); grd.addColorStop(1, g.color2); ctx.fillStyle = grd; ctx.fillRect(0, 0, CARD_W, CARD_H); }
    else if (sd.bgColor) { ctx.fillStyle = sd.bgColor; ctx.fillRect(0, 0, CARD_W, CARD_H); }
    else { const grd = ctx.createLinearGradient(0, 0, CARD_W * 0.7, CARD_H); if (which === 'front') { grd.addColorStop(0, '#b91c1c'); grd.addColorStop(0.6, '#ef4444'); grd.addColorStop(1, '#f97316'); } else { grd.addColorStop(0, '#f1f5f9'); grd.addColorStop(1, '#e2e8f0'); } ctx.fillStyle = grd; ctx.fillRect(0, 0, CARD_W, CARD_H); }

    // Draw canvas images (free-placed photos)
    for (const ci of (sd.canvasImages || [])) {
      try {
        const img = await li(ci.src);
        const ix = ci.x / 100 * CARD_W - ci.w / 100 * CARD_W / 2;
        const iy = ci.y / 100 * CARD_H - ci.h / 100 * CARD_H / 2;
        const iw = ci.w / 100 * CARD_W, ih = ci.h / 100 * CARD_H;
        ctx.save();
        ctx.globalAlpha = ci.opacity / 100;
        if (ci.borderRadius > 0) {
          const r = ci.borderRadius;
          ctx.beginPath();
          ctx.moveTo(ix + r, iy); ctx.lineTo(ix + iw - r, iy);
          ctx.quadraticCurveTo(ix + iw, iy, ix + iw, iy + r);
          ctx.lineTo(ix + iw, iy + ih - r); ctx.quadraticCurveTo(ix + iw, iy + ih, ix + iw - r, iy + ih);
          ctx.lineTo(ix + r, iy + ih); ctx.quadraticCurveTo(ix, iy + ih, ix, iy + ih - r);
          ctx.lineTo(ix, iy + r); ctx.quadraticCurveTo(ix, iy, ix + r, iy);
          ctx.closePath(); ctx.clip();
        }
        ctx.drawImage(img, ix, iy, iw, ih);
        ctx.restore();
      } catch {}
    }

    for (const sh of (sd.shapes || [])) {
      const sx2 = sh.x / 100 * CARD_W - sh.w / 100 * CARD_W / 2, sy2 = sh.y / 100 * CARD_H - sh.h / 100 * CARD_H / 2, sw2 = sh.w / 100 * CARD_W, sh2 = sh.h / 100 * CARD_H;
      ctx.save(); ctx.globalAlpha = sh.fillOpacity / 100;
      if (sh.type === 'circle') { ctx.beginPath(); ctx.ellipse(sx2 + sw2 / 2, sy2 + sh2 / 2, sw2 / 2, sh2 / 2, 0, 0, Math.PI * 2); if (sh.fill !== 'transparent') { ctx.fillStyle = sh.fill; ctx.fill(); } if (sh.strokeWidth > 0) { ctx.globalAlpha = 1; ctx.strokeStyle = sh.stroke; ctx.lineWidth = sh.strokeWidth; ctx.stroke(); } }
      else if (sh.type === 'line') { ctx.beginPath(); ctx.moveTo(sx2, sy2 + sh2 / 2); ctx.lineTo(sx2 + sw2, sy2 + sh2 / 2); ctx.globalAlpha = 1; ctx.strokeStyle = sh.stroke; ctx.lineWidth = Math.max(1, sh.strokeWidth || 3); ctx.stroke(); }
      else { const r = sh.borderRadius || 0; ctx.beginPath(); ctx.moveTo(sx2 + r, sy2); ctx.lineTo(sx2 + sw2 - r, sy2); ctx.quadraticCurveTo(sx2 + sw2, sy2, sx2 + sw2, sy2 + r); ctx.lineTo(sx2 + sw2, sy2 + sh2 - r); ctx.quadraticCurveTo(sx2 + sw2, sy2 + sh2, sx2 + sw2 - r, sy2 + sh2); ctx.lineTo(sx2 + r, sy2 + sh2); ctx.quadraticCurveTo(sx2, sy2 + sh2, sx2, sy2 + sh2 - r); ctx.lineTo(sx2, sy2 + r); ctx.quadraticCurveTo(sx2, sy2, sx2 + r, sy2); ctx.closePath(); if (sh.fill !== 'transparent') { ctx.fillStyle = sh.fill; ctx.fill(); } if (sh.strokeWidth > 0) { ctx.globalAlpha = 1; ctx.strokeStyle = sh.stroke; ctx.lineWidth = sh.strokeWidth; ctx.stroke(); } }
      ctx.restore();
    }

    sd.fields.filter((f: IDField) => f.visible).forEach((f: IDField) => {
      const ff = f.fontFamily || "'Inter','Segoe UI',sans-serif";
      ctx.font = `${f.italic ? 'italic ' : ''}${f.bold ? 'bold ' : ''}${f.fontSize}px ${ff}`;
      ctx.textAlign = f.align; ctx.textBaseline = 'middle';
      const x = f.align === 'right' ? (100 - f.x) / 100 * CARD_W : f.x / 100 * CARD_W;
      const cy = f.y / 100 * CARD_H;
      const maxW = ((f.w ?? 90) / 100) * CARD_W;
      const words = f.value.split(' '); let line = '', lines: string[] = [];
      for (const ww of words) { const t = line + (line ? ' ' : '') + ww; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = ww; } else line = t; }
      lines.push(line);
      const lineH = f.fontSize * 1.3, totalH = lines.length * lineH, startY = cy - totalH / 2 + lineH / 2;
      if (f.shadowBlur && f.shadowBlur > 0) { ctx.shadowColor = f.shadowColor || 'rgba(0,0,0,0.6)'; ctx.shadowBlur = f.shadowBlur; } else ctx.shadowBlur = 0;
      lines.forEach((l, i) => {
        const ly = startY + i * lineH;
        if (f.strokeWidth && f.strokeWidth > 0) { ctx.strokeStyle = f.strokeColor || '#000'; ctx.lineWidth = f.strokeWidth; ctx.lineJoin = 'round'; ctx.strokeText(l, x, ly); }
        ctx.fillStyle = f.color; ctx.fillText(l, x, ly);
      });
      ctx.shadowBlur = 0;
    });
    return cv.toDataURL('image/jpeg', 0.95);
  }, [front, back]);

  const captureCard = async (which: 'front' | 'back'): Promise<string> => {
    const ref = which === 'front' ? cardFrontRef : cardBackRef;
    const h2c = (window as any).html2canvas;
    if (!ref.current || !h2c) return renderSide(which);
    try {
      const canvas = await h2c(ref.current, { scale: 4, useCORS: true, allowTaint: true, backgroundColor: null, logging: false });
      const out = document.createElement('canvas'); out.width = CARD_W * 4; out.height = CARD_H * 4;
      out.getContext('2d')!.drawImage(canvas, 0, 0);
      return out.toDataURL('image/jpeg', 0.95);
    } catch { return renderSide(which); }
  };

  const downloadSide = async (w: 'front' | 'back') => {
    if (activeSide !== w) { setActiveSide(w); await new Promise(r => setTimeout(r, 200)); }
    const url = await captureCard(w);
    const a = document.createElement('a'); a.download = `id-${w}-${Date.now()}.jpg`; a.href = url; a.click();
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    const t: IDTemplate = { id: Date.now().toString(), name: templateName.trim(), company: templateCompany.trim(), createdAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), front, back };
    const existing = await fetch(`${API_URL}/templates`).then(r => r.ok ? r.json() : []).catch(() => []);
    const updated = editingTemplate ? existing.map((x: IDTemplate) => x.id === editingTemplate.id ? t : { ...x, id: x.id }) : [...existing, t];
    await fetch(`${API_URL}/templates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    showMsg('success', editingTemplate ? 'Template updated!' : `Template "${t.name}" saved!`);
    if (!editingTemplate) { setTemplateName(''); setTemplateCompany(''); }
    setSavingTemplate(false);
  };

  const loadTemplate = (t: IDTemplate) => { setFront(ensureFrontCompany({ ...t.front })); setBack(ensureBackCompany({ ...t.back })); setTemplateName(t.name); setTemplateCompany(t.company || ''); pushHistory(t.front, t.back); showMsg('success', `Loaded "${t.name}"`); setShowTemplateModal(false); };
  const deleteTemplateFromModal = async (id: string) => { const updated = templates.filter(t => t.id !== id); await fetch(`${API_URL}/templates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) }); setTemplates(updated); };

  // ─── RENDER CARD ───
  const renderCard = (which: 'front' | 'back') => {
    const sd = which === 'front' ? front : back;
    const isActive = activeSide === which;
    const ref = which === 'front' ? cardFrontRef : cardBackRef;
    return (
      <div ref={ref} onClick={e => { e.stopPropagation(); setActiveSide(which); }}
        style={{ width: CARD_W * zoom, height: CARD_H * zoom, position: 'relative', borderRadius: 8 * zoom, overflow: 'hidden', boxShadow: isActive ? '0 0 0 3px rgba(102,126,234,0.5), 0 20px 50px rgba(0,0,0,0.18)' : '0 8px 24px rgba(0,0,0,0.1)', userSelect: 'none', flexShrink: 0, transition: 'all 0.2s', cursor: isActive ? 'default' : 'pointer', transform: isActive ? 'scale(1)' : 'scale(0.97)', opacity: isActive ? 1 : 0.75 }}>

        {/* Background */}
        {sd.background ? <img src={sd.background} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
          : sd.bgGradient ? <div style={{ position: 'absolute', inset: 0, background: sd.bgGradient.type === 'radial' ? `radial-gradient(circle, ${sd.bgGradient.color1}, ${sd.bgGradient.color2})` : `linear-gradient(${sd.bgGradient.angle ?? 135}deg, ${sd.bgGradient.color1}, ${sd.bgGradient.color2})`, pointerEvents: 'none' }} />
            : sd.bgColor ? <div style={{ position: 'absolute', inset: 0, background: sd.bgColor, pointerEvents: 'none' }} />
              : <div style={{ position: 'absolute', inset: 0, background: which === 'front' ? 'linear-gradient(160deg,#b91c1c,#ef4444,#f97316)' : 'linear-gradient(160deg,#f1f5f9,#e2e8f0)', pointerEvents: 'none' }} />}

        {/* Grid overlay */}
        {showGrid && isActive && <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(0,0,0,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.08) 1px,transparent 1px)`, backgroundSize: `${CARD_W * zoom / 10}px ${CARD_H * zoom / 10}px`, pointerEvents: 'none', zIndex: 5 }} />}

        {/* Snap guides */}
        {draggingId && isActive && <>
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(102,126,234,0.7)', zIndex: 6, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(102,126,234,0.7)', zIndex: 6, pointerEvents: 'none' }} />
        </>}

        {/* Photo layer */}
        {sd.showPhoto && (
          <div onMouseDown={e => { e.stopPropagation(); if (isActive) handleLayerMouseDown(e, 'photo'); else { setActiveSide(which); setSelectedLayer('photo'); setSelectedFieldId(null); } }}
            style={{ position: 'absolute', left: `${sd.photoX}%`, top: `${sd.photoY}%`, width: `${sd.photoW}%`, height: `${sd.photoH}%`, transform: 'translate(-50%,-50%)', cursor: isActive ? (draggingLayer === 'photo' ? 'grabbing' : 'grab') : 'pointer', zIndex: 8, boxShadow: sd.photoShadowBlur && sd.photoShadowBlur > 0 ? `0 0 ${sd.photoShadowBlur}px ${sd.photoShadowColor || 'rgba(0,0,0,0.6)'}` : 'none', outline: (isActive && selectedLayer === 'photo') ? '2px dashed rgba(59,130,246,0.9)' : sd.photoStrokeWidth && sd.photoStrokeWidth > 0 ? `${sd.photoStrokeWidth}px solid ${sd.photoStrokeColor || '#000000'}` : 'none', outlineOffset: (isActive && selectedLayer === 'photo') ? 3 : -1 }}>
            <img src={DUMMY_PHOTO} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none', filter: [sd.photoBrightness !== undefined && sd.photoBrightness !== 100 ? `brightness(${sd.photoBrightness}%)` : '', sd.photoContrast !== undefined && sd.photoContrast !== 100 ? `contrast(${sd.photoContrast}%)` : ''].filter(Boolean).join(' ') || 'none' }} />
            {sd.photoColorize && sd.photoColorizeColor && <div style={{ position: 'absolute', inset: 0, background: sd.photoColorizeColor, mixBlendMode: 'color', pointerEvents: 'none' }} />}
            {isActive && selectedLayer === 'photo' && (['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const).map(h => {
              const top = h.includes('n') ? '-4px' : h.includes('s') ? 'calc(100% - 4px)' : 'calc(50% - 4px)';
              const left = h.includes('w') ? '-4px' : h.includes('e') ? 'calc(100% - 4px)' : 'calc(50% - 4px)';
              const cur = h === 'n' || h === 's' ? 'ns-resize' : h === 'e' || h === 'w' ? 'ew-resize' : h === 'ne' || h === 'sw' ? 'nesw-resize' : 'nwse-resize';
              return <div key={h} onMouseDown={e => handleResizeMouseDown(e, 'photo', h)} style={{ position: 'absolute', top, left, width: 8, height: 8, borderRadius: '50%', background: '#fff', border: '2px solid #3b82f6', zIndex: 20, cursor: cur }} />;
            })}
          </div>
        )}

        {/* Sig layer */}
        {sd.showSig && (
          <div onMouseDown={e => { e.stopPropagation(); if (isActive) handleLayerMouseDown(e, 'sig'); else { setActiveSide(which); setSelectedLayer('sig'); setSelectedFieldId(null); } }}
            style={{ position: 'absolute', left: `${sd.sigX}%`, top: `${sd.sigY}%`, width: `${sd.sigW}%`, height: `${sd.sigH}%`, transform: 'translate(-50%,-50%)', cursor: isActive ? (draggingLayer === 'sig' ? 'grabbing' : 'grab') : 'pointer', zIndex: 8, outline: (isActive && selectedLayer === 'sig') ? '2px dashed rgba(139,92,246,0.9)' : 'none', outlineOffset: 3 }}>
            <img src={DUMMY_SIG} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none', filter: sd.sigColorize && sd.sigColorizeColor ? (sd.sigInkDark === false ? hexToColorFilterWhite(sd.sigColorizeColor) : hexToColorFilter(sd.sigColorizeColor)) : 'none' }} />
            {isActive && selectedLayer === 'sig' && (['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const).map(h => {
              const top = h.includes('n') ? '-4px' : h.includes('s') ? 'calc(100% - 4px)' : 'calc(50% - 4px)';
              const left = h.includes('w') ? '-4px' : h.includes('e') ? 'calc(100% - 4px)' : 'calc(50% - 4px)';
              const cur = h === 'n' || h === 's' ? 'ns-resize' : h === 'e' || h === 'w' ? 'ew-resize' : h === 'ne' || h === 'sw' ? 'nesw-resize' : 'nwse-resize';
              return <div key={h} onMouseDown={e => handleResizeMouseDown(e, 'sig', h)} style={{ position: 'absolute', top, left, width: 8, height: 8, borderRadius: '50%', background: '#fff', border: '2px solid #8b5cf6', zIndex: 20, cursor: cur }} />;
            })}
          </div>
        )}

        {/* QR */}
        {which === 'back' && sd.showQR && (
          <div onMouseDown={e => { e.stopPropagation(); if (isActive) { setSelectedQR(true); setSelectedFieldId(null); setSelectedLayer(null); } else setActiveSide(which); }}
            style={{ position: 'absolute', left: `${sd.qrX ?? 50}%`, top: `${sd.qrY ?? 42}%`, width: `${sd.qrSize ?? 70}%`, aspectRatio: '1/1', transform: 'translate(-50%,-50%)', cursor: isActive ? 'grab' : 'pointer', zIndex: 11, outline: isActive && selectedQR ? '2px dashed rgba(234,179,8,0.9)' : '2px solid transparent', outlineOffset: 3, borderRadius: 4 }}>
            <img src={DUMMY_QR} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
          </div>
        )}

        {/* Canvas Images — free-placed photos */}
        {(sd.canvasImages || []).map((ci: CanvasImage) => {
          const isSel = isActive && selectedCanvasImgId === ci.id;
          const isDragCI = draggingCanvasImgId === ci.id;
          return (
            <div key={ci.id}
              onMouseDown={e => { e.stopPropagation(); if (isActive) handleCanvasImgMouseDown(e, ci.id); else { setActiveSide(which); setSelectedCanvasImgId(ci.id); setSelectedFieldId(null); setSelectedLayer(null); setSelectedShapeId(null); } }}
              style={{
                position: 'absolute', left: `${ci.x}%`, top: `${ci.y}%`,
                width: `${ci.w}%`, height: `${ci.h}%`,
                transform: 'translate(-50%,-50%)',
                cursor: isActive ? (isDragCI ? 'grabbing' : 'grab') : 'pointer',
                zIndex: 7,
                outline: isSel ? '2px dashed rgba(14,165,233,0.9)' : 'none',
                outlineOffset: 3,
                opacity: ci.opacity / 100,
                borderRadius: ci.borderRadius,
                overflow: 'hidden',
                boxSizing: 'border-box',
              }}>
              <img src={ci.src} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
              {isSel && (['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const).map(h => {
                const top = h.includes('n') ? '-4px' : h.includes('s') ? 'calc(100% - 4px)' : 'calc(50% - 4px)';
                const left = h.includes('w') ? '-4px' : h.includes('e') ? 'calc(100% - 4px)' : 'calc(50% - 4px)';
                const cur = h === 'n' || h === 's' ? 'ns-resize' : h === 'e' || h === 'w' ? 'ew-resize' : h === 'ne' || h === 'sw' ? 'nesw-resize' : 'nwse-resize';
                return <div key={h} onMouseDown={e => handleCanvasImgResizeMouseDown(e, ci.id, h)} style={{ position: 'absolute', top, left, width: 8, height: 8, borderRadius: '50%', background: '#fff', border: '2px solid #0ea5e9', zIndex: 20, cursor: cur }} />;
              })}
            </div>
          );
        })}

        {/* Shapes */}
        {(sd.shapes || []).map((sh: ShapeElement) => {
          const isSel = isActive && selectedShapeId === sh.id;
          return (
            <div key={sh.id} onMouseDown={e => { e.stopPropagation(); if (isActive) handleShapeMouseDown(e, sh.id); else { setActiveSide(which); setSelectedShapeId(sh.id); setSelectedFieldId(null); setSelectedLayer(null); } }}
              style={{ position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`, width: `${sh.w}%`, height: `${sh.h}%`, transform: 'translate(-50%,-50%)', background: sh.type === 'line' ? 'transparent' : `${sh.fill}${Math.round((sh.fillOpacity / 100) * 255).toString(16).padStart(2, '0')}`, border: sh.strokeWidth > 0 ? `${sh.strokeWidth}px solid ${sh.stroke}` : sh.type === 'line' ? `${Math.max(2, sh.strokeWidth || 3)}px solid ${sh.stroke}` : 'none', borderRadius: sh.type === 'circle' ? '50%' : `${sh.borderRadius || 0}px`, cursor: isActive ? (draggingShapeId === sh.id ? 'grabbing' : 'grab') : 'pointer', zIndex: 6, outline: isSel ? '2px dashed rgba(102,126,234,0.9)' : 'none', outlineOffset: 3, boxSizing: 'border-box', opacity: isLocked(sh.id) ? 0.7 : 1 }}>
              {isSel && (['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const).map(h => {
                const top = h.includes('n') ? '-4px' : h.includes('s') ? 'calc(100% - 4px)' : 'calc(50% - 4px)';
                const left = h.includes('w') ? '-4px' : h.includes('e') ? 'calc(100% - 4px)' : 'calc(50% - 4px)';
                const cur = h === 'n' || h === 's' ? 'ns-resize' : h === 'e' || h === 'w' ? 'ew-resize' : h === 'ne' || h === 'sw' ? 'nesw-resize' : 'nwse-resize';
                return <div key={h} onMouseDown={e => handleShapeResizeMouseDown(e, sh.id, h)} style={{ position: 'absolute', top, left, width: 8, height: 8, borderRadius: '50%', background: '#fff', border: '2px solid #667eea', zIndex: 20, cursor: cur }} />;
              })}
            </div>
          );
        })}

        {/* Text fields */}
        {sd.fields.filter((f: IDField) => f.visible).map((field: IDField) => {
          const isSel = isActive && selectedFieldId === field.id;
          return (
            <div key={field.id} onMouseDown={e => { e.stopPropagation(); if (isActive) handleFieldMouseDown(e, field.id); else { setActiveSide(which); setSelectedFieldId(field.id); setSelectedLayer(null); } }}
              style={{ position: 'absolute', left: field.align !== 'right' ? `${field.x}%` : 'auto', right: field.align === 'right' ? `${100 - field.x}%` : 'auto', top: `${field.y}%`, transform: field.align === 'center' ? 'translate(-50%,-50%)' : 'translateY(-50%)', fontSize: field.fontSize * zoom, color: field.color, fontWeight: field.bold ? 700 : 400, fontStyle: field.italic ? 'italic' : 'normal', textDecoration: field.underline ? 'underline' : 'none', textAlign: field.align, width: field.w ? `${field.w}%` : 'auto', maxWidth: field.w ? `${field.w}%` : '90%', lineHeight: 1.3, fontFamily: field.fontFamily || "'Inter','Segoe UI',sans-serif", cursor: isActive ? (draggingId === field.id ? 'grabbing' : 'grab') : 'pointer', zIndex: 10, outline: isSel ? '2px dashed rgba(102,126,234,0.9)' : '2px solid transparent', outlineOffset: 3, borderRadius: 3, padding: '1px 4px', background: isSel ? 'rgba(102,126,234,0.15)' : 'transparent', wordBreak: 'break-word', textShadow: field.shadowBlur && field.shadowBlur > 0 ? `0 0 ${field.shadowBlur}px ${field.shadowColor || 'rgba(0,0,0,0.6)'}` : undefined, WebkitTextStroke: field.strokeWidth && field.strokeWidth > 0 ? `${field.strokeWidth}px ${field.strokeColor || '#000000'}` : undefined, opacity: isLocked(field.id) ? 0.7 : 1 }}>
              {field.value}
            </div>
          );
        })}
      </div>
    );
  };

  const navBtn: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', color: '#475569', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' };

  // ─────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadein { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        .layer-row-drag-over { background: #eff6ff !important; border-color: #93c5fd !important; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#f8fafc', height: '100%' }}>

        {/* ═══ TOP TOOLBAR ═══ */}
        <header style={{ minHeight: 56, background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 12px' : '0 20px', flexShrink: 0, zIndex: 20, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {onBack && (
              <button onClick={onBack} style={{ ...navBtn, padding: '7px 10px' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                <ArrowLeft size={14} /> {!isMobile && 'Back'}
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: 'linear-gradient(135deg,#ec4899,#be185d)', padding: 8, borderRadius: 10, boxShadow: '0 4px 10px rgba(236,72,153,0.3)' }}><LayoutTemplate size={16} color="#fff" /></div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Template Editor
                  {editingTemplate && <span style={{ background: '#f59e0b22', color: '#d97706', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, border: '1px solid #f59e0b44' }}>✏ EDITING</span>}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{editingTemplate ? `Editing: ${editingTemplate.name}` : 'Design & Export'}</div>
              </div>
            </div>
            {!isMobile && <>
              <div style={{ width: 1, height: 28, background: '#e2e8f0' }} />
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={undo} disabled={historyIdx <= 0} style={{ padding: 7, borderRadius: 7, border: '1px solid #e2e8f0', background: historyIdx > 0 ? '#f8fafc' : '#fff', color: historyIdx > 0 ? '#475569' : '#cbd5e1', cursor: historyIdx > 0 ? 'pointer' : 'default' }}><Undo size={13} /></button>
                <button onClick={redo} disabled={historyIdx >= history.length - 1} style={{ padding: 7, borderRadius: 7, border: '1px solid #e2e8f0', background: historyIdx < history.length - 1 ? '#f8fafc' : '#fff', color: historyIdx < history.length - 1 ? '#475569' : '#cbd5e1', cursor: historyIdx < history.length - 1 ? 'pointer' : 'default' }}><Redo size={13} /></button>
              </div>
            </>}
          </div>

          {/* center zoom & tools */}
          {msg ? (
            <div style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2', color: msg.type === 'success' ? '#059669' : '#dc2626', border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}`, animation: 'fadein 0.3s', display: 'flex', alignItems: 'center', gap: 7 }}>
              {msg.type === 'success' ? '✓' : '✕'} {msg.text}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 4 }}>
              <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1)))} style={{ background: 'transparent', border: 'none', color: '#64748b', width: 30, height: 30, cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 700, width: 46, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2.5, +(z + 0.1).toFixed(1)))} style={{ background: 'transparent', border: 'none', color: '#64748b', width: 30, height: 30, cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              {!isMobile && <>
                <div style={{ width: 1, height: 18, background: '#e2e8f0', margin: '0 6px' }} />
                <button onClick={() => setShowGrid(g => !g)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: showGrid ? '#e0e7ff' : 'transparent', color: showGrid ? '#4f46e5' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Grid size={13} /> Grid</button>
                <button onClick={() => setSnap(s => !s)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: snap ? '#f3e8ff' : 'transparent', color: snap ? '#7c3aed' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Magnet size={13} /> Snap</button>
              </>}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => { setShowFlip(p => !p); if (isMobile) setMobileTab('canvas'); }} style={navBtn} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
              <RefreshCw size={13} color="#8b5cf6" /> {!isMobile && (showFlip ? 'Editor' : 'Preview')}
            </button>
            {!isMobile && <button onClick={handlePrint} style={navBtn} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}><Printer size={13} /> Print</button>}
            <div style={{ width: 1, height: 22, background: '#e2e8f0' }} />
            <button onClick={() => downloadSide(activeSide)} style={{ ...navBtn, background: '#f8fafc' }}><Download size={13} color="#667eea" /> Export</button>
            <button onClick={saveAsTemplate} disabled={savingTemplate || !templateName.trim()}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: templateName.trim() ? 'linear-gradient(135deg,#10b981,#059669)' : '#e2e8f0', color: templateName.trim() ? '#fff' : '#94a3b8', cursor: templateName.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, boxShadow: templateName.trim() ? '0 4px 12px rgba(16,185,129,0.3)' : 'none' }}>
              {savingTemplate ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />} Save
            </button>
          </div>
        </header>

        {/* ═══ MOBILE TAB BAR ═══ */}
        {isMobile && (
          <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
            {([{ id: 'layers', label: 'Layers', icon: '☰' }, { id: 'canvas', label: 'Canvas', icon: '🖼' }, { id: 'props', label: 'Properties', icon: '⚙' }] as const).map(tab => (
              <button key={tab.id} onClick={() => setMobileTab(tab.id)} style={{ flex: 1, padding: '9px 4px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: mobileTab === tab.id ? 700 : 400, color: mobileTab === tab.id ? '#667eea' : '#94a3b8', borderBottom: mobileTab === tab.id ? '2px solid #667eea' : '2px solid transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 15 }}>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ═══════════════════════════════════════════════════
              LEFT PANEL — CANVA-STYLE
          ═══════════════════════════════════════════════════ */}
          <div style={{ width: isMobile ? '100%' : 280, flexShrink: 0, background: '#fff', borderRight: isMobile ? 'none' : '1px solid #e2e8f0', display: isMobile ? (mobileTab === 'layers' ? 'flex' : 'none') : 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 10 }}>

            {/* Side switcher */}
            <div style={{ padding: '10px 12px 8px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
              <SegmentedControl options={[{ label: '▣ Front', value: 'front' }, { label: '▢ Back', value: 'back' }]} value={activeSide} onChange={(v: any) => { setActiveSide(v); setSelectedFieldId(null); setSelectedLayer(null); setSelectedShapeId(null); setSelectedQR(false); }} />
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
              {([{ id: 'layers', label: 'Layers', icon: <Layers size={14} /> }, { id: 'elements', label: 'Elements', icon: <Plus size={14} /> }, { id: 'background', label: 'BG', icon: <ImageIcon size={14} /> }] as const).map(tab => (
                <button key={tab.id} onClick={() => setLeftTab(tab.id)}
                  style={{ flex: 1, padding: '9px 4px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: leftTab === tab.id ? 700 : 400, color: leftTab === tab.id ? '#667eea' : '#94a3b8', borderBottom: leftTab === tab.id ? '2px solid #667eea' : '2px solid transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, transition: 'all 0.15s' }}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* ── LAYERS TAB ── */}
              {leftTab === 'layers' && (
                <div style={{ padding: '12px 10px' }}>

                  {/* Template info inline at top */}
                  <div style={{ marginBottom: 14, padding: '12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Template Info</div>
                    <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template name…" style={{ ...inpStyle, marginBottom: 6, fontSize: 12 }} />
                    <input type="text" value={templateCompany} onChange={e => setTemplateCompany(e.target.value)} placeholder="Company (optional)" style={{ ...inpStyle, fontSize: 12 }} />
                  </div>

                  {/* ── LAYER STACK HEADER ── */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={13} color="#667eea" /> Layers
                      <span style={{ background: '#e0e7ff', color: '#4f46e5', fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 20 }}>{layers.length}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button title="Add text" onClick={addTextBox} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#667eea', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><Type size={11} /> T</button>
                      <button title="Add rect" onClick={() => addShape('rect')} style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Square size={11} /></button>
                      <button title="Add circle" onClick={() => addShape('circle')} style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#ec4899', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Circle size={11} /></button>
                      <button title="Add line" onClick={() => addShape('line')} style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Minus size={11} /></button>
                    </div>
                  </div>

                  {/* ── LAYER ROWS ── */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {layers.map(layer => (
                      <LayerRow
                        key={layer.id}
                        layer={layer}
                        selected={selectedLayerId === layer.id}
                        onSelect={() => selectLayer(layer.id)}
                        onToggleVisible={() => toggleLayerVisible(layer.id)}
                        onToggleLock={() => toggleLock(layer.id)}
                        onDelete={isDeletable(layer.id) ? () => deleteLayer(layer.id) : undefined}
                        onDragStart={() => setDragReorderFrom(layer.id)}
                        onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add('layer-row-drag-over'); }}
                        onDrop={e => {
                          (e.currentTarget as HTMLElement).classList.remove('layer-row-drag-over');
                          if (!dragReorderFrom || dragReorderFrom === layer.id) return;
                          const specialIds = ['photo', 'sig', 'qr'];
                          const fromIsSpecial = specialIds.includes(dragReorderFrom);
                          const toIsSpecial = specialIds.includes(layer.id);
                          // Reorder special layers (photo/sig/qr)
                          if (fromIsSpecial && toIsSpecial) {
                            setSpecialLayerOrder(prev => {
                              const arr = [...prev];
                              const fi = arr.indexOf(dragReorderFrom), ti = arr.indexOf(layer.id);
                              if (fi !== -1 && ti !== -1) { const [item] = arr.splice(fi, 1); arr.splice(ti, 0, item); }
                              return arr;
                            });
                          }
                          // Reorder canvas images
                          const fromCImg = (side.canvasImages || []).find((ci: CanvasImage) => ci.id === dragReorderFrom);
                          const toCImg = (side.canvasImages || []).find((ci: CanvasImage) => ci.id === layer.id);
                          if (fromCImg && toCImg) {
                            setSide((p: IDSide) => {
                              const arr = [...(p.canvasImages || [])];
                              const fi = arr.findIndex(ci => ci.id === dragReorderFrom), ti = arr.findIndex(ci => ci.id === layer.id);
                              const [item] = arr.splice(fi, 1); arr.splice(ti, 0, item);
                              return { ...p, canvasImages: arr };
                            });
                          }
                          // Reorder shapes
                          const fromShape = (side.shapes || []).find((s: ShapeElement) => s.id === dragReorderFrom);
                          const toShape = (side.shapes || []).find((s: ShapeElement) => s.id === layer.id);
                          if (fromShape && toShape) {
                            setSide((p: IDSide) => {
                              const arr = [...(p.shapes || [])];
                              const fi = arr.findIndex(s => s.id === dragReorderFrom), ti = arr.findIndex(s => s.id === layer.id);
                              const [item] = arr.splice(fi, 1); arr.splice(ti, 0, item);
                              return { ...p, shapes: arr };
                            });
                          }
                          // Reorder text fields
                          const fromField = side.fields.find((f: IDField) => f.id === dragReorderFrom);
                          const toField = side.fields.find((f: IDField) => f.id === layer.id);
                          if (fromField && toField) {
                            setSide((p: IDSide) => {
                              const arr = [...p.fields];
                              const fi = arr.findIndex(f => f.id === dragReorderFrom), ti = arr.findIndex(f => f.id === layer.id);
                              const [item] = arr.splice(fi, 1); arr.splice(ti, 0, item);
                              return { ...p, fields: arr };
                            });
                          }
                          setDragReorderFrom(null);
                        }}
                      />
                    ))}
                    {layers.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: 12 }}>
                        <Layers size={28} style={{ margin: '0 auto 8px', display: 'block', color: '#e2e8f0' }} />
                        No layers yet.<br />Add text or shapes above.
                      </div>
                    )}
                  </div>

                  {/* Templates quick loader */}
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                    <button onClick={() => setShowTemplateModal(true)} disabled={templates.length === 0}
                      style={{ width: '100%', background: templates.length > 0 ? 'linear-gradient(135deg,#667eea,#764ba2)' : '#f1f5f9', color: templates.length > 0 ? '#fff' : '#94a3b8', border: 'none', borderRadius: 9, padding: '9px', cursor: templates.length > 0 ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: templates.length > 0 ? '0 3px 10px rgba(102,126,234,0.3)' : 'none' }}>
                      <LayoutTemplate size={13} /> {templates.length === 0 ? 'No Templates' : `Browse (${templates.length})`}
                    </button>
                  </div>
                </div>
              )}

              {/* ── ELEMENTS TAB ── */}
              {leftTab === 'elements' && (
                <div style={{ padding: 14 }}>
                  <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>Click to add to the card. Drag to reposition.</p>

                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Text</div>
                    <button onClick={addTextBox} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 10, border: '1.5px dashed #c7d2fe', background: '#eff6ff', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#e0e7ff'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#eff6ff'}>
                      <div style={{ background: '#667eea', color: '#fff', padding: '7px 10px', borderRadius: 8, fontWeight: 800, fontSize: 14 }}>T</div>
                      <div><div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>Add Text Box</div><div style={{ fontSize: 11, color: '#6366f1', marginTop: 2 }}>Draggable text layer</div></div>
                    </button>
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Shapes</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                      {([
                        { type: 'rect' as const, label: 'Rect', preview: <div style={{ width: 26, height: 18, background: '#667eea', borderRadius: 3 }} /> },
                        { type: 'circle' as const, label: 'Circle', preview: <div style={{ width: 20, height: 20, background: '#ec4899', borderRadius: '50%' }} /> },
                        { type: 'line' as const, label: 'Line', preview: <div style={{ width: 26, height: 3, background: '#8b5cf6', borderRadius: 2, marginTop: 8 }} /> },
                      ]).map(({ type, label, preview }) => (
                        <button key={type} onClick={() => addShape(type)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '13px 6px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; (e.currentTarget as HTMLElement).style.borderColor = '#667eea'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}>
                          <div style={{ height: 20, display: 'flex', alignItems: 'center' }}>{preview}</div>
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Quick Blocks</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {['#667eea', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#ffffff', '#0f172a'].map(color => (
                        <button key={color} onClick={() => { const sh: ShapeElement = { id: `shape_${Date.now()}`, type: 'rect', x: 50, y: 50, w: 40, h: 20, fill: color, fillOpacity: 90, stroke: 'transparent', strokeWidth: 0, borderRadius: 0 }; setSide((p: IDSide) => ({ ...p, shapes: [...(p.shapes || []), sh] })); setSelectedShapeId(sh.id); setSelectedFieldId(null); setSelectedLayer(null); setSelectedQR(false); }}
                          style={{ width: 30, height: 30, borderRadius: 6, background: color, border: '2px solid #e2e8f0', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── BACKGROUND TAB ── */}
              {leftTab === 'background' && (
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Mode switcher */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Background Mode</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {([
                        { v: 'predesigned', label: '🖼 Pre-designed', desc: 'Single full-card BG image' },
                        { v: 'canvas', label: '🎨 Canvas Images', desc: 'Place multiple photos freely' },
                      ] as const).map(({ v, label, desc }) => {
                        const active = (side.bgMode || 'predesigned') === v;
                        return (
                          <button key={v} onClick={() => updateSideProps({ bgMode: v })}
                            style={{ flex: 1, padding: '10px 8px', borderRadius: 9, border: `1.5px solid ${active ? '#667eea' : '#e2e8f0'}`, background: active ? '#eff6ff' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#4f46e5' : '#475569', marginBottom: 2 }}>{label}</div>
                            <div style={{ fontSize: 10, color: active ? '#6366f1' : '#94a3b8', lineHeight: 1.3 }}>{desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* PRE-DESIGNED MODE */}
                  {(side.bgMode || 'predesigned') === 'predesigned' && <>
                    {/* Solid */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Solid Color</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {['#1e3a5f', '#b91c1c', '#0f172a', '#1e40af', '#065f46', '#6b21a8', '#9a3412', '#374151', '#ffffff'].map(c => (
                          <button key={c} onClick={() => updateSideProps({ bgColor: c, bgGradient: null, background: null })} style={{ width: 26, height: 26, borderRadius: 5, background: c, border: side.bgColor === c && !side.bgGradient && !side.background ? '2px solid #667eea' : '2px solid #e2e8f0', cursor: 'pointer' }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 7 }}>
                        <input type="color" value={side.bgColor || '#1e3a5f'} onChange={e => updateSideProps({ bgColor: e.target.value, bgGradient: null, background: null })} style={{ width: 38, height: 34, border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', padding: 2, flexShrink: 0 }} />
                        <input type="text" value={side.bgColor || ''} onChange={e => updateSideProps({ bgColor: e.target.value, bgGradient: null, background: null })} placeholder="#1e3a5f" style={{ ...inpStyle, fontFamily: 'monospace', fontSize: 12 }} />
                      </div>
                    </div>

                    {/* Gradient */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Gradient</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {[{ c1: '#667eea', c2: '#764ba2', a: 135 }, { c1: '#ec4899', c2: '#be185d', a: 135 }, { c1: '#1e3a5f', c2: '#0ea5e9', a: 160 }, { c1: '#065f46', c2: '#10b981', a: 135 }, { c1: '#b91c1c', c2: '#f97316', a: 160 }, { c1: '#6b21a8', c2: '#ec4899', a: 135 }].map(({ c1, c2, a }, i) => (
                          <button key={i} onClick={() => updateSideProps({ bgGradient: { type: 'linear', color1: c1, color2: c2, angle: a }, background: null, bgColor: undefined })} style={{ width: 34, height: 34, borderRadius: 7, background: `linear-gradient(${a}deg,${c1},${c2})`, border: '2px solid #e2e8f0', cursor: 'pointer' }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 7 }}>
                        <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Color 1</label><input type="color" value={side.bgGradient?.color1 || '#667eea'} onChange={e => updateSideProps({ bgGradient: { type: 'linear', color1: e.target.value, color2: side.bgGradient?.color2 || '#764ba2', angle: side.bgGradient?.angle ?? 135 }, background: null })} style={{ width: '100%', height: 34, border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', padding: 2 }} /></div>
                        <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Color 2</label><input type="color" value={side.bgGradient?.color2 || '#764ba2'} onChange={e => updateSideProps({ bgGradient: { type: 'linear', color1: side.bgGradient?.color1 || '#667eea', color2: e.target.value, angle: side.bgGradient?.angle ?? 135 }, background: null })} style={{ width: '100%', height: 34, border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', padding: 2 }} /></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ fontSize: 10, color: '#64748b', minWidth: 40 }}>Angle</label>
                        <input type="range" min={0} max={360} value={side.bgGradient?.angle ?? 135} onChange={e => updateSideProps({ bgGradient: { type: 'linear', color1: side.bgGradient?.color1 || '#667eea', color2: side.bgGradient?.color2 || '#764ba2', angle: Number(e.target.value) }, background: null })} style={{ flex: 1, accentColor: '#667eea' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{side.bgGradient?.angle ?? 135}°</span>
                      </div>
                    </div>

                    {/* Pre-designed image upload */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Pre-designed Image</div>
                      <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>Upload a single full-card background image (e.g. a designed ID template).</p>
                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, border: '1.5px dashed #cbd5e1', borderRadius: 9, padding: 18, cursor: 'pointer', background: '#fff', transition: 'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#667eea'; (e.currentTarget as HTMLElement).style.background = '#eff6ff'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1'; (e.currentTarget as HTMLElement).style.background = '#fff'; }}>
                        <Upload size={16} color="#667eea" />
                        <div style={{ textAlign: 'center' }}><span style={{ fontSize: 12, color: '#0f172a', fontWeight: 600, display: 'block' }}>Upload Background</span><span style={{ fontSize: 10, color: '#64748b' }}>JPEG or PNG · Full card</span></div>
                        <input type="file" accept="image/*" onChange={handleBgUpload} style={{ display: 'none' }} />
                      </label>
                      {side.background && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 7 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <img src={side.background} style={{ height: 28, width: 20, objectFit: 'cover', borderRadius: 3 }} />
                            <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>BG Active</span>
                          </div>
                          <button onClick={() => updateSideProps({ background: null })} style={{ fontSize: 11, color: '#dc2626', background: '#fff', border: '1px solid #fecaca', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                        </div>
                      )}
                      {(side.bgColor || side.bgGradient || side.background) && (
                        <button onClick={() => updateSideProps({ bgColor: undefined, bgGradient: null, background: null })} style={{ padding: 7, borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                          <X size={11} /> Clear All Background
                        </button>
                      )}
                    </div>
                  </>}

                  {/* CANVAS IMAGES MODE */}
                  {side.bgMode === 'canvas' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Upload area */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '1px' }}>Upload Canvas Images</div>
                        <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>Upload one or more images. Each becomes a draggable, resizable layer on the card.</p>
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, border: '1.5px dashed #7dd3fc', borderRadius: 9, padding: 20, cursor: 'pointer', background: '#f0f9ff', transition: 'all 0.2s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0ea5e9'; (e.currentTarget as HTMLElement).style.background = '#e0f2fe'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7dd3fc'; (e.currentTarget as HTMLElement).style.background = '#f0f9ff'; }}>
                          <div style={{ background: '#0ea5e9', borderRadius: '50%', padding: 10, boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}><Upload size={18} color="#fff" /></div>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700, display: 'block' }}>Upload Images</span>
                            <span style={{ fontSize: 10, color: '#64748b' }}>Multiple files supported · JPEG, PNG</span>
                          </div>
                          <input type="file" accept="image/*" multiple onChange={e => e.target.files && addCanvasImages(e.target.files)} style={{ display: 'none' }} />
                        </label>
                      </div>

                      {/* Uploaded images list */}
                      {(side.canvasImages || []).length > 0 && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Canvas Images ({(side.canvasImages || []).length})
                          </div>
                          {(side.canvasImages || []).map((ci: CanvasImage) => (
                            <div key={ci.id}
                              onClick={() => { setSelectedCanvasImgId(ci.id); setSelectedFieldId(null); setSelectedLayer(null); setSelectedShapeId(null); setSelectedQR(false); if (isMobile) setMobileTab('props'); }}
                              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: selectedCanvasImgId === ci.id ? '1.5px solid #0ea5e9' : '1px solid #e2e8f0', background: selectedCanvasImgId === ci.id ? '#f0f9ff' : '#fff', cursor: 'pointer', transition: 'all 0.12s' }}>
                              <img src={ci.src} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 5, border: '1px solid #e2e8f0', flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: selectedCanvasImgId === ci.id ? '#0284c7' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ci.label}</div>
                                <div style={{ fontSize: 10, color: '#94a3b8' }}>{ci.w}% × {ci.h}% · {ci.opacity}% opacity</div>
                              </div>
                              <button onClick={e => { e.stopPropagation(); deleteCanvasImg(ci.id); }}
                                style={{ padding: 5, border: '1px solid #fecaca', borderRadius: 5, background: '#fef2f2', color: '#dc2626', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Still allow solid/gradient base in canvas mode */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Base Color</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {['#1e3a5f', '#b91c1c', '#0f172a', '#1e40af', '#065f46', '#6b21a8', '#9a3412', '#374151', '#ffffff'].map(c => (
                            <button key={c} onClick={() => updateSideProps({ bgColor: c, bgGradient: null, background: null })} style={{ width: 26, height: 26, borderRadius: 5, background: c, border: side.bgColor === c && !side.bgGradient ? '2px solid #0ea5e9' : '2px solid #e2e8f0', cursor: 'pointer' }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 7 }}>
                          <input type="color" value={side.bgColor || '#1e3a5f'} onChange={e => updateSideProps({ bgColor: e.target.value, bgGradient: null, background: null })} style={{ width: 38, height: 34, border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', padding: 2, flexShrink: 0 }} />
                          <input type="text" value={side.bgColor || ''} onChange={e => updateSideProps({ bgColor: e.target.value, bgGradient: null, background: null })} placeholder="#1e3a5f" style={{ ...inpStyle, fontFamily: 'monospace', fontSize: 12 }} />
                        </div>
                        {(side.bgColor || side.bgGradient) && (
                          <button onClick={() => updateSideProps({ bgColor: undefined, bgGradient: null })} style={{ padding: 7, borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            <X size={11} /> Clear Base Color
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              CANVAS WORKSPACE
          ═══════════════════════════════════════════════════ */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: '#f1f5f9' }}
            onMouseDown={e => { if (e.target === e.currentTarget) { setSelectedFieldId(null); setSelectedLayer(null); setSelectedShapeId(null); setSelectedQR(false); } }}>

            {/* dot grid */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.55 }} />

            {showFlip ? (
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: 40, position: 'relative', zIndex: 1 }}>
                <div style={{ perspective: 1200 }}>
                  <div style={{ width: CARD_W * 1.5, height: CARD_H * 1.5, position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)', transform: flipAnim ? (flipFace === 'front' ? 'rotateY(90deg)' : 'rotateY(-90deg)') : 'rotateY(0deg)' }}>
                    {(frontUrl || backUrl)
                      ? <img src={flipFace === 'front' ? (frontUrl || '') : (backUrl || '')} style={{ width: '100%', height: '100%', borderRadius: 12, boxShadow: '0 24px 60px rgba(0,0,0,0.15)', display: 'block', objectFit: 'fill' }} />
                      : <div style={{ width: '100%', height: '100%', background: '#fff', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', boxShadow: '0 12px 32px rgba(0,0,0,0.05)' }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 10, color: '#e2e8f0' }} />Rendering…</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#fff', padding: '13px 20px', borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{flipFace === 'front' ? '▣ Front' : '▢ Back'}</div>
                  <button onClick={doFlip} style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}><RefreshCw size={14} /> Flip Card</button>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: isMobile ? '16px 12px' : '28px 36px', position: 'relative', zIndex: 1, gap: 14 }}
                onMouseDown={e => { if (e.target === e.currentTarget) { setSelectedFieldId(null); setSelectedLayer(null); } }}>

                {/* Front/Back tab */}
                <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 11, padding: 4, gap: 3, flexShrink: 0 }}>
                  {(['front', 'back'] as const).map(s => (
                    <button key={s} onClick={() => { setActiveSide(s); setSelectedFieldId(null); setSelectedLayer(null); }}
                      style={{ padding: '8px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: activeSide === s ? '#fff' : 'transparent', color: activeSide === s ? '#0f172a' : '#94a3b8', boxShadow: activeSide === s ? '0 2px 6px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      {s === 'front' ? '▣ Front' : '▢ Back'}
                    </button>
                  ))}
                </div>

                {renderCard(activeSide)}

                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textAlign: 'center' }}>Click to select · Drag to move · Handle to resize</p>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════
              RIGHT PANEL — PROPERTIES
          ═══════════════════════════════════════════════════ */}
          <div style={{ width: isMobile ? '100%' : 300, flexShrink: 0, background: '#fff', borderLeft: isMobile ? 'none' : '1px solid #e2e8f0', display: isMobile ? (mobileTab === 'props' ? 'flex' : 'none') : 'flex', flexDirection: 'column', zIndex: 10 }}>
            {/* Header */}
            <div style={{ height: 50, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: '#f8fafc', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={14} color="#64748b" />
                <span style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>
                  {selectedLayer ? (selectedLayer === 'photo' ? '📷 Photo' : '✍ Signature') : selectedQR ? '▦ QR Code' : selectedCanvasImg ? '🖼 Image' : selectedShape ? '◻ Shape' : selectedField ? '𝚃 Text' : 'Properties'}
                </span>
              </div>
              {(selectedLayer || selectedField || selectedQR || selectedShape || selectedCanvasImg) && (
                <button onClick={() => { setSelectedLayer(null); setSelectedFieldId(null); setSelectedQR(false); setSelectedShapeId(null); setSelectedCanvasImgId(null); }} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 4, color: '#64748b', cursor: 'pointer' }}><X size={13} /></button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {selectedLayer ? (
                <LayerEditor layer={selectedLayer} side={side} onUpdate={updateSideProps} />
              ) : selectedCanvasImg ? (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {/* Preview */}
                  <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={selectedCanvasImg.src} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: 6 }} />
                  </div>
                  {/* Label */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Label</label>
                    <input type="text" value={selectedCanvasImg.label} onChange={e => updateCanvasImg(selectedCanvasImg.id, { label: e.target.value })} style={inpStyle} />
                  </div>
                  {/* Position & Size */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Position & Size</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                      {([['X %','x',selectedCanvasImg.x],['Y %','y',selectedCanvasImg.y],['W %','w',selectedCanvasImg.w],['H %','h',selectedCanvasImg.h]] as [string,string,number][]).map(([lbl,key,val])=>(
                        <div key={key}>
                          <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3, fontWeight: 500 }}>{lbl}</label>
                          <input type="number" value={Math.round(val * 10)/10} min={0} max={100} step={0.5} onChange={e => updateCanvasImg(selectedCanvasImg.id, { [key]: Number(e.target.value) })} style={{ ...inpStyle, padding: '5px 7px', fontSize: 12 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Appearance */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Appearance</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 11, color: '#64748b', minWidth: 60, fontWeight: 500 }}>Opacity</label>
                      <input type="range" min={0} max={100} value={selectedCanvasImg.opacity} onChange={e => updateCanvasImg(selectedCanvasImg.id, { opacity: Number(e.target.value) })} style={{ flex: 1, accentColor: '#0ea5e9' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{selectedCanvasImg.opacity}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 11, color: '#64748b', minWidth: 60, fontWeight: 500 }}>Radius</label>
                      <input type="range" min={0} max={100} value={selectedCanvasImg.borderRadius} onChange={e => updateCanvasImg(selectedCanvasImg.id, { borderRadius: Number(e.target.value) })} style={{ flex: 1, accentColor: '#0ea5e9' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{selectedCanvasImg.borderRadius}px</span>
                    </div>
                    {/* Quick presets for border radius */}
                    <div style={{ display: 'flex', gap: 5 }}>
                      {[{l:'None',v:0},{l:'Soft',v:8},{l:'Round',v:16},{l:'Circle',v:999}].map(({l,v})=>(
                        <button key={v} onClick={() => updateCanvasImg(selectedCanvasImg.id, { borderRadius: v })}
                          style={{ flex: 1, padding: '5px 4px', borderRadius: 6, border: selectedCanvasImg.borderRadius === v ? '1px solid #0ea5e9' : '1px solid #e2e8f0', background: selectedCanvasImg.borderRadius === v ? '#f0f9ff' : '#fff', color: selectedCanvasImg.borderRadius === v ? '#0284c7' : '#64748b', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>{l}</button>
                      ))}
                    </div>
                  </div>
                  {/* Delete */}
                  <button onClick={() => deleteCanvasImg(selectedCanvasImg.id)}
                    style={{ padding: 9, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <Trash2 size={13} /> Remove Image
                  </button>
                </div>
              ) : selectedQR ? (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '1px' }}>QR Visibility</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', background: back.showQR ? '#10b98115' : '#ef444415', border: `1px solid ${back.showQR ? '#10b981' : '#ef4444'}`, borderRadius: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!back.showQR} onChange={e => setBack((p: IDSide) => ({ ...p, showQR: e.target.checked }))} style={{ accentColor: back.showQR ? '#10b981' : '#ef4444', width: 16, height: 16 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: back.showQR ? '#059669' : '#dc2626' }}>{back.showQR ? 'QR Visible on Back' : 'QR Hidden'}</span>
                    </label>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Position & Size</div>
                    {([['X %', 'qrX', back.qrX ?? 50], ['Y %', 'qrY', back.qrY ?? 42], ['Size %', 'qrSize', back.qrSize ?? 70]] as [string, string, number][]).map(([l, k, v]) => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ fontSize: 11, color: '#64748b', minWidth: 50, fontWeight: 500 }}>{l}</label>
                        <input type="range" min={5} max={100} value={v} onChange={e => setBack((p: IDSide) => ({ ...p, [k]: Number(e.target.value) }))} style={{ flex: 1, accentColor: '#eab308' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{v}%</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Verification URL</div>
                    <input type="text" value={back.qrUrl || ''} onChange={e => setBack((p: IDSide) => ({ ...p, qrUrl: e.target.value }))} placeholder="https://..." style={{ ...inpStyle, fontSize: 12, fontFamily: 'monospace' }} />
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Colors</div>
                    {([['Foreground', 'qrFg', back.qrFg || '#000000'], ['Background', 'qrBg', back.qrBg || '#ffffff']] as [string, string, string][]).map(([l, k, v]) => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ fontSize: 11, color: '#64748b', minWidth: 68, fontWeight: 500 }}>{l}</label>
                        <input type="color" value={v} onChange={e => setBack((p: IDSide) => ({ ...p, [k]: e.target.value }))} style={{ width: 36, height: 28, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                        <input type="text" value={v} onChange={e => setBack((p: IDSide) => ({ ...p, [k]: e.target.value }))} style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', fontSize: 12, fontFamily: 'monospace', outline: 'none', color: '#0f172a' }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedShape ? (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Fill</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="color" value={selectedShape.fill === 'transparent' ? '#ffffff' : selectedShape.fill} onChange={e => updateShape(selectedShape.id, { fill: e.target.value })} style={{ width: 36, height: 28, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 2, flexShrink: 0 }} />
                      <input type="text" value={selectedShape.fill} onChange={e => updateShape(selectedShape.id, { fill: e.target.value })} style={{ flex: 1, ...inpStyle, fontFamily: 'monospace', fontSize: 12 }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 11, color: '#64748b', minWidth: 50 }}>Opacity</label>
                      <input type="range" min={0} max={100} value={selectedShape.fillOpacity} onChange={e => updateShape(selectedShape.id, { fillOpacity: Number(e.target.value) })} style={{ flex: 1, accentColor: '#667eea' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{selectedShape.fillOpacity}%</span>
                    </div>
                    <button onClick={() => updateShape(selectedShape.id, { fill: 'transparent', fillOpacity: 0 })} style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: 11, fontWeight: 600, alignSelf: 'flex-start' }}>No Fill</button>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Stroke</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="color" value={selectedShape.stroke === 'transparent' ? '#000000' : selectedShape.stroke} onChange={e => updateShape(selectedShape.id, { stroke: e.target.value })} style={{ width: 36, height: 28, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 2, flexShrink: 0 }} />
                      <input type="text" value={selectedShape.stroke} onChange={e => updateShape(selectedShape.id, { stroke: e.target.value })} style={{ flex: 1, ...inpStyle, fontFamily: 'monospace', fontSize: 12 }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 11, color: '#64748b', minWidth: 50 }}>Width</label>
                      <input type="range" min={0} max={16} value={selectedShape.strokeWidth} onChange={e => updateShape(selectedShape.id, { strokeWidth: Number(e.target.value) })} style={{ flex: 1, accentColor: '#667eea' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{selectedShape.strokeWidth}px</span>
                    </div>
                  </div>
                  {selectedShape.type === 'rect' && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Corner Radius</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="range" min={0} max={50} value={selectedShape.borderRadius || 0} onChange={e => updateShape(selectedShape.id, { borderRadius: Number(e.target.value) })} style={{ flex: 1, accentColor: '#667eea' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{selectedShape.borderRadius || 0}px</span>
                      </div>
                    </div>
                  )}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Position & Size</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                      {([['X %', 'x', selectedShape.x], ['Y %', 'y', selectedShape.y], ['W %', 'w', selectedShape.w], ['H %', 'h', selectedShape.h]] as [string, string, number][]).map(([lbl, key, val]) => (
                        <div key={key}><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3, fontWeight: 500 }}>{lbl}</label><input type="number" value={Math.round(val * 10) / 10} min={0} max={100} step={0.5} onChange={e => updateShape(selectedShape.id, { [key]: Number(e.target.value) })} style={{ ...inpStyle, padding: '5px 7px', fontSize: 12 }} /></div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => deleteShape(selectedShape.id)} style={{ padding: 9, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <Trash2 size={13} /> Delete Shape
                  </button>
                </div>
              ) : selectedField ? (
                <FieldEditor field={selectedField} onUpdate={updateField} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 28, textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ background: '#f1f5f9', padding: 14, borderRadius: '50%', marginBottom: 16 }}><MousePointer2 size={28} color="#cbd5e1" /></div>
                  <h3 style={{ margin: '0 0 7px', fontSize: 14, color: '#475569', fontWeight: 700 }}>Nothing selected</h3>
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>Click a layer in the panel or directly on the canvas to edit its properties.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TEMPLATE MODAL ═══ */}
      {showTemplateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)', padding: 16 }} onClick={() => setShowTemplateModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 820, maxHeight: '84vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.28)', overflow: 'hidden', animation: 'modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'linear-gradient(135deg,#667eea15,#764ba215)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: 9, padding: 8, boxShadow: '0 3px 9px rgba(102,126,234,0.3)' }}><LayoutTemplate size={15} color="white" /></div>
                <div><h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Choose a Template</h3><p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{templates.length} saved</p></div>
              </div>
              <button onClick={() => setShowTemplateModal(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><X size={14} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
                {templates.map((t: IDTemplate) => (
                  <div key={t.id} style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#667eea'; (e.currentTarget as HTMLElement).style.boxShadow = '0 7px 22px rgba(102,126,234,0.18)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}>
                    <div style={{ background: '#f8fafc', padding: '10px 10px 8px', display: 'flex', gap: 7, justifyContent: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      {([{ sd: t.front, lbl: 'F' }, { sd: t.back, lbl: 'B' }] as const).map(({ sd, lbl }) => (
                        <div key={lbl} style={{ width: 60, height: 95, borderRadius: 5, overflow: 'hidden', position: 'relative', flexShrink: 0, boxShadow: '0 3px 10px rgba(0,0,0,0.14)', background: sd.background ? '#000' : (lbl === 'F' ? 'linear-gradient(160deg,#b91c1c,#ef4444,#f97316)' : 'linear-gradient(160deg,#f1f5f9,#e2e8f0)') }}>
                          {sd.background && <img src={sd.background} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} crossOrigin="anonymous" />}
                          <div style={{ position: 'absolute', inset: 0, padding: 4, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 1 }}>
                            {(sd.fields as IDField[]).filter((f: IDField) => f.visible).slice(0, 3).map((f: IDField) => (
                              <div key={f.id} style={{ fontSize: `${Math.max(4, f.fontSize * 60 / 214 * 0.85)}px`, color: f.color, fontWeight: f.bold ? 700 : 400, textAlign: f.align, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: 1.2, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{f.value}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '9px 11px 8px' }}>
                      <p style={{ margin: '0 0 1px', fontSize: 12, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                      {t.company && <p style={{ margin: '0 0 1px', fontSize: 10, color: '#64748b' }}>{t.company}</p>}
                      {t.createdAt && <p style={{ margin: '0 0 9px', fontSize: 10, color: '#94a3b8' }}>{t.createdAt}</p>}
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => loadTemplate(t)} style={{ flex: 1, background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', border: 'none', borderRadius: 7, padding: '6px', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: '0 2px 7px rgba(102,126,234,0.28)' }}><LayoutTemplate size={10} /> Load</button>
                        <button onClick={() => deleteTemplateFromModal(t.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Delete"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}