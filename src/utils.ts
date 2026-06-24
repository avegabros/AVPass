import { API_URL } from './types';

export function resolveImg(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith('data:')) return u;
  if (u.startsWith('/images/')) return u;
  
  // Extract filename (strip query string and hashes)
  const cleanUrl = u.split('?')[0].split('#')[0];
  const parts = cleanUrl.split('/');
  const filename = parts[parts.length - 1];
  return '/images/' + filename;
}

export async function uploadImage(file: File, employeeName: string, fileType: 'photo' | 'signature'): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('employeeName', employeeName);
    formData.append('fileType', fileType);
    const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
    if (!res.ok) return null;
    return (await res.json()).url;
  } catch { return null; }
}

export function hexToColorFilter(hex: string): string {
  if (!hex || hex.length < 7) return 'none';
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const matrix = [0,0,0,0,r, 0,0,0,0,g, 0,0,0,0,b, -0.333,-0.333,-0.333,1,0].join(' ');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><filter id="f"><feColorMatrix type="matrix" values="' + matrix + '"/></filter></svg>';
  return 'url("data:image/svg+xml;base64,' + btoa(svg) + '#f")';
}

export function hexToColorFilterWhite(hex: string): string {
  if (!hex || hex.length < 7) return 'none';
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const matrix = [0,0,0,0,r, 0,0,0,0,g, 0,0,0,0,b, 0.333,0.333,0.333,1,-1].join(' ');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><filter id="f"><feColorMatrix type="matrix" values="' + matrix + '"/></filter></svg>';
  return 'url("data:image/svg+xml;base64,' + btoa(svg) + '#f")';
}