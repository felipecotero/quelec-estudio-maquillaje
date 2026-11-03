import { downloadBlob, safeName, saveProject, readProject } from './storage.js';
export { saveProject, readProject };

const encoder = new TextEncoder();
const blendKeys = { normal: 'norm', 'source-over': 'norm', multiply: 'mul ', screen: 'scrn', overlay: 'over', 'soft-light': 'sLit', 'hard-light': 'hLit', difference: 'diff', darken: 'dark', lighten: 'lite', color: 'colr', luminosity: 'lum ', saturation: 'sat ', hue: 'hue ' };
const makeCanvas = (width, height) => Object.assign(document.createElement('canvas'), { width, height });
function concat(...parts) { const size = parts.reduce((total, p) => total + p.byteLength, 0), bytes = new Uint8Array(size); let offset = 0; for (const p of parts) { bytes.set(new Uint8Array(p.buffer || p, p.byteOffset || 0, p.byteLength), offset); offset += p.byteLength; } return bytes; }
function ascii(value) { return encoder.encode(value); }
function uint8(value) { return new Uint8Array([value & 255]); }
function uint16(value) { const out = new Uint8Array(2); new DataView(out.buffer).setUint16(0, value); return out; }
function uint32(value) { const out = new Uint8Array(4); new DataView(out.buffer).setUint32(0, value); return out; }
function int16(value) { const out = new Uint8Array(2); new DataView(out.buffer).setInt16(0, value); return out; }
function align(bytes, boundary = 4, fill = 0) { const count = (boundary - bytes.length % boundary) % boundary; return concat(bytes, new Uint8Array(count).fill(fill)); }
async function canvasBlob(canvas, type = 'image/png', quality = .95) { return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen.')), type, quality)); }
function drawFit(ctx, source, x, y, width, height) { const scale = Math.min(width / source.width, height / source.height), w = source.width * scale, h = source.height * scale; ctx.drawImage(source, x + (width - w) / 2, y + (height - h) / 2, w, h); }

export async function composeCapture(studio, { comparison = false, subject, title, view, beforeImageUrl, width = 1200, height = 1400 } = {}) {
  await studio.hairReady;
  const after = await studio.renderCapture({ withoutMakeup: false, width, height });
  if (!after?.getContext) throw new Error('El visor no entregó una captura válida.');
  if (!comparison) return after;
  let before;
  if (beforeImageUrl) {
    const image = new Image(); image.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('No se pudo cargar la fotografía original para el comparativo.')); image.src = beforeImageUrl; });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('La fotografía original no contiene una imagen válida.');
    before = image;
  } else before = await studio.renderCapture({ withoutMakeup: true, width, height });
  const profile = /perfil|lateral|left|right|izq|der/i.test(view || studio.currentView || studio.view || '');
  const gap = 18, margin = 30, header = 90, label = 48;
  const canvas = makeCanvas(profile ? width + margin * 2 : width * 2 + margin * 2 + gap, profile ? height * 2 + header + label * 2 + gap + margin : height + header + label + margin);
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#16191e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f4ede2'; ctx.font = '34px Arial'; ctx.fillText(title || subject?.name || 'Quelec · estudio de maquillaje', margin, 47);
  ctx.font = '20px Arial'; ctx.fillStyle = '#b9b5b0';
  const first = { x: margin, y: header + label }, second = profile ? { x: margin, y: header + label * 2 + height + gap } : { x: margin + width + gap, y: header + label };
  ctx.fillText(beforeImageUrl ? 'ANTES · fotografía de referencia' : 'ANTES · base sin maquillaje', first.x, first.y - 16); ctx.fillText('DESPUÉS · propuesta', second.x, second.y - 16);
  drawFit(ctx, before, first.x, first.y, width, height); drawFit(ctx, after, second.x, second.y, width, height);
  return canvas;
}

export async function exportImage(studio, format, options = {}) {
  await studio.hairReady;
  const name = safeName(options.title || options.subject?.name || 'Quelec-maquillaje');
  format = format.toLowerCase().replace('jpeg', 'jpg');
  let blob;
  if (format === 'psd') {
    const payload = await studio.getExportScene();
    const base = payload.baseCanvas || studio.baseCanvas;
    const layers = payload.layers || studio.layers || [];
    const composite = payload.textureCanvas || studio.textureCanvas;
    if (!base?.getContext || !composite?.getContext) throw new Error('El modelo aún no tiene una textura base lista para exportar sus capas.');
    blob = createPSD({ width: base.width, height: base.height, composite, layers: [{ name: 'Piel · textura base', canvas: base, visible: true, opacity: 1, blend: 'normal' }, ...layers] });
  } else {
    const canvas = await composeCapture(studio, options);
    if (format === 'png') blob = await canvasBlob(canvas);
    else if (format === 'jpg') { const flat = makeCanvas(canvas.width, canvas.height), ctx = flat.getContext('2d'); ctx.fillStyle = '#181b20'; ctx.fillRect(0, 0, flat.width, flat.height); ctx.drawImage(canvas, 0, 0); blob = await canvasBlob(flat, 'image/jpeg', .96); }
    else if (format === 'pdf') blob = await createPDF(canvas);
    else throw new Error('Formato de imagen no disponible.');
  }
  return downloadBlob(blob, `${name}${format === 'psd' ? '-textura-UV-capas' : options.comparison ? '-antes-despues' : ''}.${format}`);
}

export async function createPDF(canvas) {
  const jpeg = new Uint8Array(await (await canvasBlob(canvas, 'image/jpeg', .96)).arrayBuffer());
  const landscape = canvas.width > canvas.height, pageW = landscape ? 841.89 : 595.28, pageH = landscape ? 595.28 : 841.89;
  const scale = Math.min((pageW - 40) / canvas.width, (pageH - 40) / canvas.height), width = canvas.width * scale, height = canvas.height * scale, x = (pageW - width) / 2, y = (pageH - height) / 2;
  const command = ascii(`q ${width.toFixed(4)} 0 0 ${height.toFixed(4)} ${x.toFixed(4)} ${y.toFixed(4)} cm /Im0 Do Q\n`);
  const objects = [ascii('<< /Type /Catalog /Pages 2 0 R >>'), ascii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'), ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`), concat(ascii(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, ascii('\nendstream')), concat(ascii(`<< /Length ${command.length} >>\nstream\n`), command, ascii('endstream'))];
  const chunks = [concat(ascii('%PDF-1.4\n%'), new Uint8Array([226, 227, 207, 211]), ascii('\n'))], offsets = [0]; let offset = chunks[0].length;
  objects.forEach((object, i) => { offsets.push(offset); const chunk = concat(ascii(`${i + 1} 0 obj\n`), object, ascii('\nendobj\n')); chunks.push(chunk); offset += chunk.length; });
  const xref = offset;
  chunks.push(ascii(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return new Blob(chunks, { type: 'application/pdf' });
}

function unicodeName(name) { const chars = Array.from(name).join(''); const data = new Uint8Array(4 + chars.length * 2); const view = new DataView(data.buffer); view.setUint32(0, chars.length); for (let i = 0; i < chars.length; i++) view.setUint16(4 + i * 2, chars.charCodeAt(i)); return concat(ascii('8BIMluni'), uint32(data.length), align(data, 4)); }
function pixelsFor(canvas, width, height) { const target = makeCanvas(width, height); target.getContext('2d').drawImage(canvas, 0, 0, width, height); return target.getContext('2d').getImageData(0, 0, width, height).data; }
function channelBytes(pixels, channel) { const out = new Uint8Array(pixels.length / 4); for (let i = 0, p = channel; i < out.length; i++, p += 4) out[i] = pixels[p]; return out; }

export function createPSD({ width, height, composite, layers }) {
  if (width < 1 || height < 1 || width > 4096 || height > 4096 || layers.length > 40) throw new Error('El PSD admite hasta 4096 × 4096 y 40 capas en esta edición.');
  const planeSize = width * height, records = [], channelData = [];
  for (const layer of [...layers].reverse()) {
    if (!layer.canvas?.getContext) continue;
    const pixels = pixelsFor(layer.canvas, width, height);
    const name = String(layer.name || 'Capa') + (layer.finish && layer.finish !== 'matte' ? ` · ${layer.finish}` : '');
    const fallback = ascii(safeName(name, 'Capa')).slice(0, 255);
    const extra = concat(uint32(0), uint32(0), align(concat(uint8(fallback.length), fallback)), unicodeName(name));
    records.push(concat(uint32(0), uint32(0), uint32(height), uint32(width), uint16(4), ...[0, 1, 2, -1].map(id => concat(int16(id), uint32(planeSize + 2))), ascii('8BIM'), ascii(blendKeys[layer.blend] || 'norm'), uint8(Math.round(Math.max(0, Math.min(1, layer.opacity ?? 1)) * 255)), uint8(0), uint8(layer.visible === false ? 2 : 0), uint8(0), uint32(extra.length), extra));
    for (const channel of [0, 1, 2, 3]) channelData.push(concat(uint16(0), channelBytes(pixels, channel)));
  }
  const info = align(concat(int16(-records.length), ...records, ...channelData), 2);
  const masks = concat(uint32(info.length), info, uint32(0));
  const merged = pixelsFor(composite, width, height);
  const header = concat(ascii('8BPS'), uint16(1), new Uint8Array(6), uint16(4), uint32(height), uint32(width), uint16(8), uint16(3), uint32(0), uint32(0), uint32(masks.length));
  return new Blob([header, masks, uint16(0), ...[0, 1, 2, 3].map(ch => channelBytes(merged, ch))], { type: 'image/vnd.adobe.photoshop' });
}

let crcTable;
function crc32(bytes) { if (!crcTable) crcTable = Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1; return c >>> 0; }); let c = -1; for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ c >>> 8; return (c ^ -1) >>> 0; }
function le16(n) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n, true); return b; }
function le32(n) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; }
export async function createZIP(files) {
  const local = [], central = []; let offset = 0;
  for (const [path, value] of Object.entries(files)) {
    const name = ascii(path), bytes = typeof value === 'string' ? ascii(value) : value instanceof Blob ? new Uint8Array(await value.arrayBuffer()) : new Uint8Array(value.buffer || value, value.byteOffset || 0, value.byteLength), crc = crc32(bytes);
    const header = concat(le32(0x04034b50), le16(20), le16(0x0800), le16(0), le16(0), le16(0x21), le32(crc), le32(bytes.length), le32(bytes.length), le16(name.length), le16(0), name);
    local.push(header, bytes);
    central.push(concat(le32(0x02014b50), le16(20), le16(20), le16(0x0800), le16(0), le16(0), le16(0x21), le32(crc), le32(bytes.length), le32(bytes.length), le16(name.length), le16(0), le16(0), le16(0), le16(0), le32(0), le32(offset), name));
    offset += header.length + bytes.length;
  }
  const directory = concat(...central);
  return new Blob([...local, directory, concat(le32(0x06054b50), le16(0), le16(0), le16(central.length), le16(central.length), le32(directory.length), le32(offset), le16(0))], { type: 'application/zip' });
}

function meshesFrom(payload) {
  const scene = payload.scene || payload;
  if (typeof scene.traverse !== 'function') throw new Error('El modelo 3D aún no está listo.');
  scene.updateMatrixWorld?.(true);
  const meshes = [];
  scene.traverse(object => {
    if (!object.isMesh || !object.geometry?.attributes?.position || object.userData?.export === false) return;
    let parent = object; while (parent) { if (parent.visible === false) return; parent = parent.parent; }
    meshes.push(object);
  });
  if (!meshes.length) throw new Error('No hay una malla exportable.');
  return meshes;
}
function transformedPosition(attribute, index, elements) {
  const x = attribute.getX(index), y = attribute.getY(index), z = attribute.getZ(index);
  if (!elements) return [x, y, z];
  return [elements[0] * x + elements[4] * y + elements[8] * z + elements[12], elements[1] * x + elements[5] * y + elements[9] * z + elements[13], elements[2] * x + elements[6] * y + elements[10] * z + elements[14]];
}
function firstMaterial(mesh) { return Array.isArray(mesh.material) ? mesh.material[0] : mesh.material; }
async function imagePNG(image) { if (!image) return null; if (image.getContext) return canvasBlob(image); const canvas = makeCanvas(image.width || image.videoWidth, image.height || image.videoHeight); canvas.getContext('2d').drawImage(image, 0, 0); return canvasBlob(canvas); }
async function imageAlphaPNG(image) { const canvas = makeCanvas(image.width, image.height), ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height); for (let p = 0; p < pixels.data.length; p += 4) { pixels.data[p] = pixels.data[p + 1] = pixels.data[p + 2] = pixels.data[p + 3]; pixels.data[p + 3] = 255; } ctx.putImageData(pixels, 0, 0); return canvasBlob(canvas); }
function materialColor(material) { return material?.color ? [material.color.r, material.color.g, material.color.b] : [1, 1, 1]; }
function combinedMaterialMap(material) {
  const roughness = material?.roughnessMap?.image, metalness = material?.metalnessMap?.image;
  if (!roughness && !metalness) return null;
  const width = Math.max(roughness?.width || 1, metalness?.width || 1), height = Math.max(roughness?.height || 1, metalness?.height || 1);
  const canvas = makeCanvas(width, height), ctx = canvas.getContext('2d'), image = ctx.createImageData(width, height), rough = roughness ? pixelsFor(roughness, width, height) : null, metal = metalness ? pixelsFor(metalness, width, height) : null;
  for (let p = 0; p < image.data.length; p += 4) { image.data[p] = 255; image.data[p + 1] = rough ? rough[p + 1] : 255; image.data[p + 2] = metal ? metal[p + 2] : 255; image.data[p + 3] = 255; }
  ctx.putImageData(image, 0, 0); return canvas;
}

export async function createOBJ(payload) {
  const meshes = meshesFrom(payload), obj = ['# Quelec Estudio · malla de estudio aproximada, sin escala antropométrica certificada', 'mtllib materiales.mtl'], mtl = [], files = {}; let vertexOffset = 1, uvOffset = 1;
  for (let m = 0; m < meshes.length; m++) {
    const mesh = meshes[m], geometry = mesh.geometry, positions = geometry.attributes.position, uv = geometry.attributes.uv, material = firstMaterial(mesh), materialName = `material_${m}`;
    obj.push(`o ${safeName(mesh.name, `malla_${m}`)}`, `usemtl ${materialName}`);
    for (let i = 0; i < positions.count; i++) obj.push(`v ${transformedPosition(positions, i, mesh.matrixWorld?.elements).map(n => n.toFixed(7)).join(' ')}`);
    if (uv) for (let i = 0; i < uv.count; i++) obj.push(`vt ${uv.getX(i).toFixed(7)} ${uv.getY(i).toFixed(7)}`);
    const count = geometry.index?.count || positions.count;
    for (let i = 0; i + 2 < count; i += 3) {
      const ids = [0, 1, 2].map(j => geometry.index ? geometry.index.getX(i + j) : i + j);
      obj.push(`f ${ids.map(id => uv ? `${vertexOffset + id}/${uvOffset + id}` : vertexOffset + id).join(' ')}`);
    }
    const color = materialColor(material); mtl.push(`newmtl ${materialName}`, `Kd ${color.join(' ')}`, `d ${material?.opacity ?? 1}`, `Pr ${material?.roughness ?? .65}`, `Pm ${material?.metalness ?? 0}`, 'illum 2');
    const texture = await imagePNG(material?.map?.image);
    if (texture) { const name = `textura_${m}.png`; files[name] = texture; mtl.push(`map_Kd ${name}`); if (material?.alphaTest > 0 || material?.transparent) { const opacityName = `opacidad_${m}.png`; files[opacityName] = await imageAlphaPNG(material.map.image); mtl.push(`map_d ${opacityName}`); } }
    for (const [key, directive] of [['roughnessMap', 'map_Pr'], ['metalnessMap', 'map_Pm'], ['emissiveMap', 'map_Ke']]) {
      const map = await imagePNG(material?.[key]?.image);
      if (map) { const name = `${key}_${m}.png`; files[name] = map; mtl.push(`${directive} ${name}`); }
    }
    mtl.push(''); vertexOffset += positions.count; if (uv) uvOffset += uv.count;
  }
  files['rostro.obj'] = obj.join('\n'); files['materiales.mtl'] = mtl.join('\n');
  files['LEEME.txt'] = 'Quelec Estudio\nMalla de estudio aproximada; no es un escaneo ni una medición antropométrica.\nMantén OBJ, MTL y PNG en la misma carpeta. Las coordenadas UV enlazan los materiales con la malla.\nLos mapas PBR usan las extensiones MTL map_Pr/map_Pm/map_Ke; su soporte depende del programa. Usa GLB para una transferencia PBR más consistente.\nLos acabados de maquillaje son aproximaciones visuales; el aspecto puede variar según la iluminación y el programa.\n';
  return createZIP(files);
}

export async function createGLB(payload) {
  const meshes = meshesFrom(payload), chunks = [], gltf = { asset: { version: '2.0', generator: 'Quelec Estudio', extras: { note: 'Malla de estudio aproximada; no es un escaneo ni una medición antropométrica certificada.' } }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [], buffers: [{ byteLength: 0 }], bufferViews: [], accessors: [] }; let byteOffset = 0;
  function addBuffer(bytes, target) { bytes = align(new Uint8Array(bytes.buffer || bytes, bytes.byteOffset || 0, bytes.byteLength)); const index = gltf.bufferViews.length; gltf.bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.length, ...(target ? { target } : {}) }); chunks.push(bytes); byteOffset += bytes.length; return index; }
  function accessor(array, type, componentType, target, min, max) { const index = gltf.accessors.length; gltf.accessors.push({ bufferView: addBuffer(array, target), componentType, count: array.length / ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[type]), type, ...(min ? { min, max } : {}) }); return index; }
  async function addTexture(image) {
    const texture = await imagePNG(image);
    if (!texture) return null;
    gltf.images ||= []; gltf.textures ||= []; gltf.samplers ||= [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }];
    const imageIndex = gltf.images.length;
    gltf.images.push({ bufferView: addBuffer(new Uint8Array(await texture.arrayBuffer())), mimeType: 'image/png' });
    const textureIndex = gltf.textures.length; gltf.textures.push({ source: imageIndex, sampler: 0 });
    return { index: textureIndex };
  }
  for (const mesh of meshes) {
    const geometry = mesh.geometry, position = geometry.attributes.position, uv = geometry.attributes.uv, normal = geometry.attributes.normal, material = firstMaterial(mesh), positions = new Float32Array(position.count * 3), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < position.count; i++) { const p = transformedPosition(position, i, mesh.matrixWorld?.elements); positions.set(p, i * 3); p.forEach((n, j) => { min[j] = Math.min(min[j], n); max[j] = Math.max(max[j], n); }); }
    const attributes = { POSITION: accessor(positions, 'VEC3', 5126, 34962, min, max) };
    if (uv) { const data = new Float32Array(uv.count * 2); for (let i = 0; i < uv.count; i++) data.set([uv.getX(i), 1 - uv.getY(i)], i * 2); attributes.TEXCOORD_0 = accessor(data, 'VEC2', 5126, 34962); }
    if (normal) {
      const data = new Float32Array(normal.count * 3), matrix = mesh.matrixWorld?.elements;
      // Cross products of the world basis form the inverse transpose, including nonuniform scale.
      const a = matrix ? [matrix[0], matrix[1], matrix[2]] : [1, 0, 0], b = matrix ? [matrix[4], matrix[5], matrix[6]] : [0, 1, 0], c = matrix ? [matrix[8], matrix[9], matrix[10]] : [0, 0, 1];
      const cross = (x, y) => [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]], ab = cross(b, c), bc = cross(c, a), ca = cross(a, b), determinant = a.reduce((n, x, j) => n + x * ab[j], 0), orientation = determinant < 0 ? -1 : 1;
      for (let i = 0; i < normal.count; i++) { const x = normal.getX(i), y = normal.getY(i), z = normal.getZ(i), n = [0, 1, 2].map(j => orientation * (ab[j] * x + bc[j] * y + ca[j] * z)), length = Math.hypot(...n) || 1; data.set(n.map(x => x / length), i * 3); }
      attributes.NORMAL = accessor(data, 'VEC3', 5126, 34962);
    }
    const count = geometry.index?.count || position.count, indices = new Uint32Array(count); for (let i = 0; i < count; i++) indices[i] = geometry.index ? geometry.index.getX(i) : i;
    const materialIndex = gltf.materials.length, pbr = { baseColorFactor: [...materialColor(material), material?.opacity ?? 1], metallicFactor: material?.metalness ?? 0, roughnessFactor: material?.roughness ?? .65 };
    const texture = await addTexture(material?.map?.image);
    if (texture) pbr.baseColorTexture = texture;
    const combined = combinedMaterialMap(material);
    if (combined) pbr.metallicRoughnessTexture = await addTexture(combined);
    const gltfMaterial = { name: material?.name || `Material ${materialIndex + 1}`, pbrMetallicRoughness: pbr, doubleSided: material?.side === 2, ...(material?.alphaTest > 0 ? { alphaMode: 'MASK', alphaCutoff: material.alphaTest } : material?.transparent ? { alphaMode: 'BLEND' } : {}) };
    const emissive = await addTexture(material?.emissiveMap?.image);
    if (emissive) {
      gltfMaterial.emissiveTexture = emissive;
      const strength = material.emissiveIntensity ?? 1;
      gltfMaterial.emissiveFactor = material.emissive ? [material.emissive.r, material.emissive.g, material.emissive.b].map(n => Math.max(0, Math.min(1, n * Math.min(1, strength)))) : [0, 0, 0];
      if (strength > 1) { gltf.extensionsUsed ||= []; if (!gltf.extensionsUsed.includes('KHR_materials_emissive_strength')) gltf.extensionsUsed.push('KHR_materials_emissive_strength'); gltfMaterial.extensions = { KHR_materials_emissive_strength: { emissiveStrength: strength } }; }
    }
    gltf.materials.push(gltfMaterial);
    const meshIndex = gltf.meshes.length; gltf.meshes.push({ name: mesh.name || `Malla ${meshIndex + 1}`, primitives: [{ attributes, indices: accessor(indices, 'SCALAR', 5125, 34963), material: materialIndex }] });
    gltf.scenes[0].nodes.push(gltf.nodes.length); gltf.nodes.push({ name: mesh.name || `Malla ${meshIndex + 1}`, mesh: meshIndex });
  }
  gltf.buffers[0].byteLength = byteOffset;
  const json = align(ascii(JSON.stringify(gltf)), 4, 32), bin = concat(...chunks), length = 12 + 8 + json.length + 8 + bin.length;
  return new Blob([le32(0x46546c67), le32(2), le32(length), le32(json.length), le32(0x4e4f534a), json, le32(bin.length), le32(0x004e4942), bin], { type: 'model/gltf-binary' });
}

export async function exportModel(studio, format = 'glb', options = {}) {
  await studio.hairReady;
  const payload = await studio.getExportScene();
  const name = safeName(options.title || studio.subject?.name || 'Quelec-rostro'); let blob, extension;
  if (format === 'glb') { blob = await createGLB(payload); extension = 'glb'; }
  else if (format === 'obj') { blob = await createOBJ(payload); extension = 'zip'; }
  else if (format === 'texture') {
    const canvas = payload.textureCanvas || studio.textureCanvas;
    if (!canvas?.getContext) throw new Error('La textura todavía no está lista.');
    blob = await canvasBlob(canvas); extension = 'png';
  } else if (format === 'materials') {
    const files = {}, base = payload.baseCanvas || studio.baseCanvas, composite = payload.textureCanvas || studio.textureCanvas, layers = payload.layers || studio.layers || [];
    if (!composite?.getContext) throw new Error('La textura todavía no está lista.');
    files['textura-compuesta.png'] = await canvasBlob(composite);
    if (base?.getContext) files['piel-base.png'] = await canvasBlob(base);
    const meshes = meshesFrom(payload), material = meshes.map(firstMaterial).find(material => material?.map?.image === composite) || firstMaterial(meshes[0]);
    const ocularMesh = meshes.find(mesh => mesh.userData?.anatomicalEyeAsset), ocularMaterial = ocularMesh && firstMaterial(ocularMesh), ocular = await imagePNG(ocularMaterial?.map?.image);
    if (ocular) {
      files['ocular.png'] = ocular;
      files['ocular.json'] = JSON.stringify({ mesh: ocularMesh.name, texture: 'ocular.png', uv: 'Atlas ocular independiente; usar en la malla de ojos del GLB u OBJ, nunca en la piel.', fittedToHead: !!ocularMesh.userData.fittedToHead, semanticOcularFit: !!ocularMesh.userData.semanticOcularFit, photographicIris: !!ocularMesh.userData.photographicIris, approximateIris: !!ocularMesh.userData.approximateIris, color: materialColor(ocularMaterial), roughness: ocularMaterial.roughness ?? .34 }, null, 2);
    }
    for (const [key, name] of [['roughnessMap', 'rugosidad.png'], ['metalnessMap', 'metalico.png'], ['emissiveMap', 'emision.png']]) {
      const map = await imagePNG(material?.[key]?.image); if (map) files[name] = map;
    }
    const packed = combinedMaterialMap(material); if (packed) files['metalico-rugosidad-GLTF.png'] = await canvasBlob(packed);
    for (let i = 0; i < layers.length; i++) if (layers[i].canvas?.getContext) files[`capas/${String(i + 1).padStart(2, '0')}-${safeName(layers[i].name, 'Capa')}.png`] = await canvasBlob(layers[i].canvas);
    files['capas.json'] = JSON.stringify({ width: composite.width, height: composite.height, layers: layers.map(({ id, name, visible, opacity, blend, finish }) => ({ id, name, visible, opacity, blend, finish })) }, null, 2);
    files['LEEME.txt'] = 'Texturas UV del modelo de Quelec Estudio.\nLa textura compuesta incorpora la base y las capas visibles.\nLos PNG de capas conservan transparencia. capas.json conserva orden, opacidad, modo de fusión y acabado.\nSi se incluye ocular.png, corresponde sólo a la malla ocular independiente del GLB u OBJ. ocular.json indica si el iris es fotográfico o aproximado. No aplicar este atlas sobre la piel.\nUsa estas texturas en la misma malla exportada; no son universales para cualquier rostro.\n';
    blob = await createZIP(files); extension = 'zip';
  } else throw new Error('Formato 3D no disponible.');
  return downloadBlob(blob, `${name}-${format}.${extension}`);
}
