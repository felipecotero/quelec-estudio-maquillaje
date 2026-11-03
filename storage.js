const PROJECT_FORMAT = 'quelec-makeup';
const PROJECT_VERSION = 2;
const MAX_PROJECT_BYTES = 80 * 1024 * 1024;

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return { blob, name };
}

export function safeName(value, fallback = 'Quelec-estudio') {
  return String(value || fallback).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 _.-]/g, '-').replace(/[. ]+$/g, '').slice(0, 100) || fallback;
}

function serializeValue(value, seen = new WeakSet()) {
  if (value == null || typeof value !== 'object') return value;
  if (typeof HTMLCanvasElement !== 'undefined' && value instanceof HTMLCanvasElement) return value.toDataURL('image/png');
  if (value instanceof Blob) throw new Error('Convierte las fotografías en datos de imagen antes de guardar el proyecto.');
  if (seen.has(value)) throw new Error('El proyecto contiene una referencia circular.');
  seen.add(value);
  const result = Array.isArray(value) ? value.map(item => serializeValue(item, seen)) : {};
  if (!Array.isArray(value)) for (const [key, item] of Object.entries(value)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key) || typeof item === 'function') continue;
    result[key] = serializeValue(item, seen);
  }
  seen.delete(value);
  return result;
}

export function projectBlob(project) {
  const data = serializeValue(project);
  const envelope = { format: PROJECT_FORMAT, version: PROJECT_VERSION, savedAt: new Date().toISOString(), project: data };
  const blob = new Blob([JSON.stringify(envelope)], { type: 'application/json' });
  if (blob.size > MAX_PROJECT_BYTES) throw new Error('El proyecto supera 80 MB. Reduce la resolución o el número de capas.');
  return blob;
}

export async function readProject(file) {
  if (!file || typeof file.text !== 'function') throw new Error('Escoge un archivo de proyecto .quelec.');
  if (file.size > MAX_PROJECT_BYTES) throw new Error('Este archivo supera el límite de 80 MB.');
  let data;
  try { data = JSON.parse(await file.text(), (key, value) => ['__proto__', 'constructor', 'prototype'].includes(key) ? undefined : value); }
  catch { throw new Error('El archivo no contiene un proyecto JSON válido.'); }
  if(data.format===PROJECT_FORMAT&&data.version===1)throw new Error('Este archivo usa el mapa de las caras MQ01. La nueva cabeza continua usa otro mapa; esas capas no se pueden aplicar automáticamente. El archivo original se conserva.');
  if (data.format !== PROJECT_FORMAT || data.version !== PROJECT_VERSION || !data.project || typeof data.project !== 'object') {
    throw new Error('El archivo no es un proyecto compatible de Quelec Estudio.');
  }
  if (data.project.uvRevision !== 'MakeHuman-head-atlas-1') throw new Error('El mapa de piel de este proyecto no coincide con la cabeza actual. Conserva el archivo original.');
  if (data.project.layers && (!Array.isArray(data.project.layers) || data.project.layers.length > 40)) throw new Error('El proyecto debe contener un máximo de 40 capas.');
  const ids = new Set();
  for (const layer of data.project.layers || []) {
    if (!layer || typeof layer !== 'object') throw new Error('Hay una capa inválida en el proyecto.');
    if (typeof layer.id !== 'string' || !/^[\w.-]{1,100}$/.test(layer.id) || ids.has(layer.id)) throw new Error('Las capas deben tener identificadores válidos y únicos.');
    ids.add(layer.id);
    if (layer.finish != null && !['matte', 'satin', 'metal', 'metallic', 'fluorescent', 'glossy'].includes(layer.finish)) throw new Error('El acabado de una capa no es compatible.');
    for (const key of ['canvas', 'data', 'image', 'dataURL']) {
      if (typeof layer[key] === 'string' && !/^data:image\/(png|jpeg|webp);base64,/.test(layer[key])) throw new Error('Las capas deben contener imágenes integradas PNG, JPG o WebP.');
    }
    if (layer.opacity != null && (!Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1)) throw new Error('La opacidad de una capa está fuera del rango permitido.');
  }
  const project = data.project;
  const hexColor = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
  const unitValue = value => Number.isFinite(value) && value >= 0 && value <= 1;
  if (project.customPhoto != null && (typeof project.customPhoto !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(project.customPhoto))) throw new Error('La fotografía del proyecto debe estar integrada en el archivo.');
  for (const record of [project.hair, project.light]) if (record?.color != null && !hexColor(record.color)) throw new Error('El proyecto contiene un color inválido.');
  if (project.light?.intensity != null && (!Number.isFinite(project.light.intensity) || project.light.intensity < .05 || project.light.intensity > 10)) throw new Error('La intensidad de iluminación está fuera del rango permitido.');
  if (project.light?.azimuth != null && (!Number.isFinite(project.light.azimuth) || Math.abs(project.light.azimuth) > 360)) throw new Error('La dirección de iluminación es inválida.');
  if (project.projection != null && Object.values(project.projection).some(value => !Number.isFinite(value))) throw new Error('Los ajustes de fotografía deben ser numéricos.');
  if (project.morphs != null && (Array.isArray(project.morphs) || typeof project.morphs !== 'object' || Object.values(project.morphs).some(value => !Number.isFinite(value) || Math.abs(value) > 1))) throw new Error('Las proporciones del rostro deben estar entre −1 y 1.');
  if (project.brush != null) {
    if (typeof project.brush !== 'object' || Array.isArray(project.brush)) throw new Error('La configuración de brocha es inválida.');
    const allowed = new Set(['color', 'colorName', 'size', 'opacity', 'hardness', 'flow', 'scatter', 'grain', 'stabilization', 'symmetry', 'finish']);
    project.brush = Object.fromEntries(Object.entries(project.brush).filter(([key]) => allowed.has(key)));
    if (project.brush.color != null && !hexColor(project.brush.color)) throw new Error('El color de brocha es inválido.');
    for (const key of ['opacity', 'hardness', 'flow', 'scatter', 'grain', 'stabilization']) if (project.brush[key] != null && !unitValue(project.brush[key])) throw new Error(`El ajuste de brocha ${key} debe estar entre 0 y 1.`);
    if (project.brush.size != null && (!Number.isFinite(project.brush.size) || project.brush.size < 1 || project.brush.size > 200)) throw new Error('El diámetro de brocha debe estar entre 1 y 200.');
    if (project.brush.symmetry != null && typeof project.brush.symmetry !== 'boolean') throw new Error('El ajuste de simetría es inválido.');
  }
  return data.project;
}

export async function saveProject(project) {
  const blob = projectBlob(project);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return downloadBlob(blob, `${safeName(project.title || project.name || project.subject?.name)}-${stamp}.quelec`);
}

function chooseFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.quelec,application/json'; input.hidden = true;
    input.addEventListener('change', () => { const file = input.files[0]; input.remove(); file ? resolve(file) : reject(new DOMException('Sin archivo seleccionado.', 'AbortError')); }, { once: true });
    input.addEventListener('cancel', () => { input.remove(); reject(new DOMException('Selección cancelada.', 'AbortError')); }, { once: true });
    document.body.append(input); input.click();
  });
}

export class ProjectStore {
  constructor() { this.directory = null; this.memory = new Map(); }
  get directoryName() { return this.directory?.name || null; }
  get usesExternalFolder() { return !!this.directory; }
  async chooseDirectory() {
    if (typeof window.showDirectoryPicker !== 'function') throw new Error('Este navegador no permite elegir una carpeta de guardado. Usa Guardar para descargar el proyecto y elige la carpeta de Quelec del disco externo.');
    this.directory = await window.showDirectoryPicker({ id: 'quelec-makeup-projects', mode: 'readwrite' });
    return { name: this.directory.name, mode: 'directory' };
  }
  async save(project) {
    const blob = projectBlob(project);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `${safeName(project.title || project.name || project.subject?.name)}-${stamp}.quelec`;
    if (!this.directory) { downloadBlob(blob, name); return { mode: 'download', name, blob }; }
    const handle = await this.directory.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    try { await writable.write(blob); await writable.close(); }
    catch (error) { try { await writable.abort(); } catch {} throw error; }
    this.memory.set(name, { name, handle, savedAt: new Date().toISOString(), size: blob.size });
    return { mode: 'directory', name, directory: this.directory.name, blob };
  }
  async list() {
    if (!this.directory) return [...this.memory.values()].map(({ handle, ...record }) => record);
    const records = [];
    for await (const [name, handle] of this.directory.entries()) {
      if (handle.kind !== 'file' || !name.endsWith('.quelec')) continue;
      const file = await handle.getFile();
      records.push({ name, size: file.size, savedAt: new Date(file.lastModified).toISOString() });
    }
    return records.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }
  async load(name) {
    let file;
    if (name && this.directory) {
      if (name.includes('/') || name.includes('\\') || !name.endsWith('.quelec')) throw new Error('Nombre de proyecto inválido.');
      file = await (await this.directory.getFileHandle(name)).getFile();
    } else if (typeof window.showOpenFilePicker === 'function') {
      const [handle] = await window.showOpenFilePicker({ multiple: false, types: [{ description: 'Proyecto Quelec', accept: { 'application/json': ['.quelec'] } }] });
      file = await handle.getFile();
    } else file = await chooseFile();
    return readProject(file);
  }
  async delete(name) {
    if (!this.directory) throw new Error('No hay una carpeta de proyectos seleccionada.');
    if (!name || name.includes('/') || name.includes('\\') || !name.endsWith('.quelec')) throw new Error('Nombre de proyecto inválido.');
    await this.directory.getFileHandle(name);
    await this.directory.removeEntry(name);
    this.memory.delete(name);
  }
}

export const DRIVE_FOLDER_URL = 'https://drive.google.com/drive/my-drive';

