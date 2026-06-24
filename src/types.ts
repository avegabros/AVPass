export const API_URL = "/api";
export const BASE_URL = "";

export interface Employee {
  fullname: string;
  position: string;
  empCode?: string;
  company?: string;
  department?: string;
}

export interface EmployeeRecord {
  id: number;
  name: string;
  position: string;
  empCode?: string;
  company?: string;
  indication: string;
  signature: string | null;
  photo: string | null;
}

export interface ShapeElement {
  id: string;
  type: 'rect' | 'circle' | 'line';
  x: number; y: number;
  w: number; h: number;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  borderRadius?: number;
  rotation?: number;
}

export interface IDField {
  id: string;
  label: string;
  value: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline?: boolean;
  fontFamily?: string;
  align: 'left' | 'center' | 'right';
  visible: boolean;
  w?: number;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  overlayBg?: string;
  overlayOpacity?: number;
}

export interface CanvasImage {
  id: string;
  src: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  borderRadius: number;
  rotation: number;
  locked?: boolean;
}

export interface IDSide {
  background: string | null;
  bgColor?: string;
  bgGradient?: { type: 'linear' | 'radial'; color1: string; color2: string; angle?: number } | null;
  bgMode?: 'predesigned' | 'canvas';
  shapes?: ShapeElement[];
  canvasImages?: CanvasImage[];
  fields: IDField[];

  photoX: number; photoY: number; photoW: number; photoH: number; showPhoto: boolean;
  photoStrokeWidth?: number; photoStrokeColor?: string;
  photoShadowBlur?: number; photoShadowColor?: string;
  photoOverlayColor?: string; photoOverlayOpacity?: number;
  photoBrightness?: number; photoContrast?: number;
  photoColorize?: boolean; photoColorizeColor?: string;
  sigX: number; sigY: number; sigW: number; sigH: number; showSig: boolean;
  sigStrokeWidth?: number; sigStrokeColor?: string;
  sigShadowBlur?: number; sigShadowColor?: string;
  sigBrightness?: number; sigContrast?: number;
  sigColorize?: boolean; sigColorizeColor?: string; sigInkDark?: boolean;

  // QR Code
  showQR?: boolean;
  qrX?: number; qrY?: number; qrSize?: number;
  qrUrl?: string;
  qrFg?: string; qrBg?: string;
}

export interface IDTemplate {
  id: string;
  name: string;
  company?: string;
  createdAt?: string;
  front: IDSide;
  back: IDSide;
}

export type ActiveSection = 'home' | 'database' | 'idbuilder' | 'idrecords' | 'templates' | 'accounts' | 'idrequests';

export interface EditingID {
  id: string;
  employeeName: string;
  position: string;
  front: IDSide;
  back: IDSide;
  requestId?: string;
  abasRequestId?: number | null;
  pictureUrl?: string | null;
  signatureUrl?: string | null;
}

export type RequestStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'id generated'
  | 'printed'
  | 'completed'
  | 'for releasing'
  | 'claimed'
  | 'cancelled';

export interface StatusEntry {
  status: RequestStatus;
  note: string;
  changedAt: string;
}

export interface IDRequest {
  id: string;
  employeeName: string;
  empCode: string;
  company: string;
  department: string;
  position: string;
  purpose: string;
  requestedBy: string;
  status: RequestStatus;
  statusHistory: StatusEntry[];
  createdAt: string;
  updatedAt: string;
  abasRequestId?: number | null;
  abasEmployeeId?: number | null;
  iraafId?: string | null;
  pictureUrl?: string | null;
  signatureUrl?: string | null;
  supportingDocUrl?: string | null;
  verifierName?: string | null;
  approverName?: string | null;
}