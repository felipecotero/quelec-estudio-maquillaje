const loaded = new Map();
let referencePromise;
const decode = (value, Type) => typeof value === 'string' ? new Type(Uint8Array.from(atob(value), char => char.charCodeAt(0)).buffer) : new Type(value);

export const HAIR_ASSETS = {
  short01: { name: 'Corto con frontal elevado', thumb: 'assets/hair/short01/thumb.jpg' },
  short02: { name: 'Corto ondulado', thumb: 'assets/hair/short02/thumb.jpg' },
  short03: { name: 'Media melena con raya lateral', thumb: 'assets/hair/short03/thumb.jpg' },
  short04: { name: 'Corto peinado hacia atrás', thumb: 'assets/hair/short04/thumb.jpg' },
  afro01: { name: 'Trenzado compacto', thumb: 'assets/hair/afro01/thumb.jpg' },
  bob01: { name: 'Melena bob', thumb: 'assets/hair/bob01/thumb.jpg' },
  bob02: { name: 'Bob con mechón lateral', thumb: 'assets/hair/bob02/thumb.jpg' },
  braid01: { name: 'Trenza recogida', thumb: 'assets/hair/braid01/thumb.jpg' },
  ponytail01: { name: 'Cola recogida', thumb: 'assets/hair/ponytail01/thumb.jpg' },
  long01: { name: 'Cabello largo hasta la cintura', thumb: 'assets/hair/long01/thumb.jpg' }
};

async function asset(id) {
  if (!loaded.has(id)) loaded.set(id, fetch(`assets/hair/${id}/mesh.json`).then(response => {
    if (!response.ok) throw new Error(`El recurso de cabello ${id} aún no está disponible.`);
    return response.json();
  }).catch(error => { loaded.delete(id); throw error; }));
  return loaded.get(id);
}

async function reference() {
  if (!referencePromise) referencePromise = fetch('assets/hair/fit-reference.json').then(response => {
    if (!response.ok) throw new Error('Falta la referencia anatómica para ajustar el cabello.');
    return response.json();
  }).catch(error => { referencePromise = null; throw error; });
  return referencePromise;
}

function tintTexture(THREE, image, color) {
  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height), rgb = /^#[\da-f]{6}$/i.test(color) ? [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16)) : [64, 53, 45];
  for (let p = 0; p < pixels.data.length; p += 4) {
    const luminance = pixels.data[p] * .2126 + pixels.data[p + 1] * .7152 + pixels.data[p + 2] * .0722;
    const brightness = Math.max(.32, Math.min(1.65, .35 + luminance / 112));
    for (let channel = 0; channel < 3; channel++) pixels.data[p + channel] = Math.min(255, rgb[channel] * brightness);
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}

function fitFunction(source, reference, hairGeometry) {
  const original = decode(source.position, Float32Array), nearest = decode(source.fitIndex, Uint16Array), weights = decode(source.fitWeight, Float32Array);
  const base = reference.positions, baseUV = reference.uv, target = hairGeometry.attributes.position.array;
  let currentGeometry, mapping;
  const key = (u, v) => `${Math.round(u * 100000)},${Math.round(v * 100000)}`;
  return geometry => {
    const actual = geometry.attributes.position, uv = geometry.attributes.uv;
    if (geometry !== currentGeometry) {
      const lookup = new Map();
      if (uv) for (let i = 0; i < uv.count; i++) lookup.set(key(uv.getX(i), uv.getY(i)), i);
      mapping = new Int32Array(base.length / 3).fill(-1);
      let unmatched = 0;
      for (let i = 0; i < mapping.length; i++) {
        const sameUV = uv && i < uv.count && Math.abs(uv.getX(i) - baseUV[i * 2]) < .00002 && Math.abs(uv.getY(i) - baseUV[i * 2 + 1]) < .00002;
        const index = sameUV ? i : lookup.get(key(baseUV[i * 2], baseUV[i * 2 + 1]));
        if (index !== undefined && index < actual.count) mapping[i] = index;
        else unmatched++;
      }
      // A different atlas cannot establish safe correspondence. It is not a fitting fallback.
      if (unmatched > mapping.length * .1) throw new Error('La cabeza y el cabello utilizan referencias anatómicas diferentes. Vuelve a cargar el estudio actualizado.');
      currentGeometry = geometry;
    }
    for (let vertex = 0; vertex < original.length / 3; vertex++) {
      const displacement = [0, 0, 0];
      for (let support = 0; support < 3; support++) {
        const offset = vertex * 3 + support, sourceIndex = nearest[offset], actualIndex = mapping[sourceIndex];
        if (actualIndex < 0) continue;
        const weight = weights[offset];
        displacement[0] += (actual.getX(actualIndex) - base[sourceIndex * 3]) * weight;
        displacement[1] += (actual.getY(actualIndex) - base[sourceIndex * 3 + 1]) * weight;
        displacement[2] += (actual.getZ(actualIndex) - base[sourceIndex * 3 + 2]) * weight;
      }
      for (let axis = 0; axis < 3; axis++) target[vertex * 3 + axis] = original[vertex * 3 + axis] + displacement[axis];
    }
    hairGeometry.attributes.position.needsUpdate = true;
    hairGeometry.computeVertexNormals(); hairGeometry.computeBoundingSphere(); hairGeometry.computeBoundingBox();
  };
}

/** Uses authored MakeHuman CC0 hair meshes; never generates substitute volumes. */
export async function buildHair({ THREE, geometry, style = 'reference', color = '#40352d' }) {
  const group = new THREE.Group();
  group.name = 'Cabello · malla MakeHuman CC0';
  if (['none', 'reference', 'natural', ''].includes(style)) return group;
  if (!HAIR_ASSETS[style]) throw new Error('Este peinado necesita una malla de cabello real. Escoge uno de los recursos disponibles.');
  const [source, headReference] = await Promise.all([asset(style), reference()]);
  if (!geometry?.attributes?.position) throw new Error('Falta la cabeza para ajustar el cabello.');
  if (source.baseVertices !== headReference.vertices) throw new Error('La actualización del cabello está incompleta. Vuelve a cargar cuando termine la preparación de recursos.');
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(decode(source.position, Float32Array), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(decode(source.uv, Float32Array), 2));
  g.setIndex(new THREE.BufferAttribute(decode(source.index, Uint32Array), 1));
  g.computeVertexNormals();
  const refit = fitFunction(source, headReference, g); refit(geometry);
  const sourceTexture = await new THREE.TextureLoader().loadAsync(`assets/hair/${style}/texture.png`);
  const texture = tintTexture(THREE, sourceTexture.image, color); sourceTexture.dispose();
  const material = new THREE.MeshStandardMaterial({ map: texture, color: '#ffffff', roughness: .76, metalness: 0, alphaTest: .28, alphaToCoverage: true, transparent: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, material);
  mesh.name = HAIR_ASSETS[style].name;
  mesh.userData = { hairAsset: style, license: 'CC0-1.0', authoredMesh: true, fit: 'MakeHuman barycentric asset plus canonical-head displacement', sourceSHA256: source.sourceSHA256 };
  group.add(mesh);
  group.userData = { hairAsset: style, styleRequested: style, license: 'CC0-1.0', refit };
  return group;
}
