import * as THREE from './vendor/three.module.js';
import {buildHair} from './hair.js';

const SIZE=1024;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const makeCanvas=(w=SIZE,h=SIZE)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const blendModes={normal:'source-over',multiply:'multiply',screen:'screen',overlay:'overlay',softlight:'soft-light','soft-light':'soft-light',color:'color',lighten:'lighten',darken:'darken',add:'lighter',difference:'difference'};
function decode(s,T){return new T(Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer);}
function flatten(a){return Array.isArray(a?.[0])?a.flat():a;}
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('No se pudo cargar la textura del rostro.'));im.src=src;});}
function material(map,extra={}){return new THREE.MeshStandardMaterial({map,roughness:.88,metalness:0,...extra});}

/** Paint is stored in UV space, never in screen coordinates. */
export class FaceStudio {
  constructor({container,onPaint=()=>{},onStatus=()=>{},onViewChange=()=>{}}){
    this.container=container;this.onPaint=onPaint;this.onStatus=onStatus;this.onViewChange=onViewChange;
    this.layers=[];this.activeId=null;this.tool='brush';this.photoMode=true;
    this.brush={color:'#bc5b67',size:25,opacity:.7,hardness:.6,finish:'matte',symmetry:true,flow:.65,scatter:.12,grain:.2,stabilization:.2};
    this.baseCanvas=makeCanvas();this.textureCanvas=makeCanvas();this.finishCanvas=makeCanvas();this.roughCanvas=makeCanvas();this.emissiveCanvas=makeCanvas();this.finishScratch=makeCanvas();
    this.baseCanvas.getContext('2d').fillStyle='#cba58e';this.baseCanvas.getContext('2d').fillRect(0,0,SIZE,SIZE);
    this.texture=new THREE.CanvasTexture(this.textureCanvas);this.texture.colorSpace=THREE.SRGBColorSpace;
    this.roughTexture=new THREE.CanvasTexture(this.roughCanvas);this.metalTexture=new THREE.CanvasTexture(this.finishCanvas);this.emissiveTexture=new THREE.CanvasTexture(this.emissiveCanvas);this.emissiveTexture.colorSpace=THREE.SRGBColorSpace;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#171b20');
    this.camera=new THREE.PerspectiveCamera(32,1,.05,100);this.target=new THREE.Vector3(0,.15,0);this.yaw=0;this.pitch=0;this.distance=6.1;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.02;
    this.renderer.domElement.className='face-canvas';this.renderer.domElement.setAttribute('aria-label','Rostro tridimensional. Selecciona Girar para rotar; usa la rueda o dos dedos para acercar.');this.renderer.domElement.style.touchAction='none';container.append(this.renderer.domElement);
    this.headGroup=new THREE.Group();this.scene.add(this.headGroup);this.hairGroup=new THREE.Group();this.headGroup.add(this.hairGroup);this.selectionLines=new THREE.Group();this.scene.add(this.selectionLines);
    this.ambient=new THREE.HemisphereLight(0xffffff,0xb6a18f,2.0);this.scene.add(this.ambient);
    this.lights=[];for(const [x,y,z,p] of [[-3,2.5,4,1.7],[3,2.5,4,1.7],[-2,-1,3,.7],[2,-1,3,.7],[0,3,-2,.65]]){const l=new THREE.DirectionalLight(0xffffff,p);l.position.set(x,y,z);this.scene.add(l);this.lights.push(l);}
    this.key=new THREE.SpotLight(0xffffff,35,20,Math.PI/5,.7,1.6);this.key.position.set(3,3,4);this.scene.add(this.key);this.scene.add(this.key.target);this.key.visible=false;
    this.raycaster=new THREE.Raycaster();this.ndc=new THREE.Vector2();this.pointers=new Map();this.paintTargets=[];this.meshes=[];this.originals=new Map();this.selection=null;this.dirty=false;
    this.listeners=[];this.bindEvents();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();this.updateCamera();this.refreshTexture();
    this.ready=this.loadAnatomy();
  }
  async loadAnatomy(){
    const paths=['assets/anatomy/human.json','assets/personas/human.json'];let data;
    for(const path of paths){try{const r=await fetch(path);if(r.ok){data=await r.json();this.anatomyPath=path.slice(0,path.lastIndexOf('/')+1);break;}}catch{}}
    if(!data)throw Error('Falta la anatomía MakeHuman necesaria para los rostros.');
    this.anatomy=data;const [skin,base]=await Promise.all([loadImage(this.anatomyPath+'skin.jpg'),fetch(this.anatomyPath+'base-head.json')]);if(!base.ok)throw Error('No se pudo cargar la cabeza anatómica continua.');this.skinImage=skin;this.baseHeadData=await base.json();
    try{this.eyeImage=await loadImage(this.anatomyPath+'eyes.png');}catch{}try{this.hairImage=await loadImage(this.anatomyPath+'hair.png');}catch{}
    return data;
  }
  makeAnatomyGeometry(kind='skin'){
    const source=this.anatomy.meshes.find(m=>m.name===kind);if(!source)return null;
    const p=decode(source.position,Float32Array),uv=decode(source.uv,Float32Array),ind=decode(source.index,Uint32Array),positions=[],coords=[],oldUV=[],indices=[],mapping=new Map();
    for(let i=0;i<ind.length;i+=3){const ids=[ind[i],ind[i+1],ind[i+2]];
      if(kind==='skin'&&(!ids.some(j=>p[j*3+1]>1.415)||!ids.every(j=>Math.abs(p[j*3])<.19)))continue;
      for(const j of ids){if(!mapping.has(j)){mapping.set(j,positions.length/3);const x=p[j*3]*10,y=(p[j*3+1]-1.58)*10,z=(p[j*3+2]-.065)*10;positions.push(x,y,z);coords.push(uv[j*2],uv[j*2+1]);oldUV.push(uv[j*2],uv[j*2+1]);}indices.push(mapping.get(j));}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(coords,2));g.setAttribute('sourceUV',new THREE.Float32BufferAttribute(oldUV,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return kind==='skin'?this.clipBottom(g,-1.65):g;
  }
  clipBottom(g,limit){
    const positions=[],uv=[],sourceUV=[],p=g.attributes.position,tx=g.attributes.uv,suv=g.attributes.sourceUV,ids=g.index.array;
    for(let i=0;i<ids.length;i+=3){let polygon=[ids[i],ids[i+1],ids[i+2]].map(j=>({p:[p.getX(j),p.getY(j),p.getZ(j)],uv:[tx.getX(j),tx.getY(j)],suv:[suv.getX(j),suv.getY(j)]})),out=[];
      for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],ai=a.p[1]>=limit,bi=b.p[1]>=limit;if(ai)out.push(a);if(ai!==bi){const t=(limit-a.p[1])/(b.p[1]-a.p[1]),mix=(q,r)=>q.map((v,k)=>v+(r[k]-v)*t);out.push({p:mix(a.p,b.p),uv:mix(a.uv,b.uv),suv:mix(a.suv,b.suv)});}}
      for(let j=1;j<out.length-1;j++)for(const v of [out[0],out[j],out[j+1]]){positions.push(...v.p);uv.push(...v.uv);sourceUV.push(...v.suv);}
    }const welded=new Map(),wp=[],wu=[],ws=[],wi=[];for(let j=0;j<positions.length/3;j++){const key=[...positions.slice(j*3,j*3+3),...uv.slice(j*2,j*2+2)].map(n=>Math.round(n*1e5)).join(',');if(!welded.has(key)){welded.set(key,wp.length/3);wp.push(...positions.slice(j*3,j*3+3));wu.push(...uv.slice(j*2,j*2+2));ws.push(...sourceUV.slice(j*2,j*2+2));}wi.push(welded.get(key));}const clipped=new THREE.BufferGeometry();clipped.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));clipped.setAttribute('uv',new THREE.Float32BufferAttribute(wu,2));clipped.setAttribute('sourceUV',new THREE.Float32BufferAttribute(ws,2));clipped.setIndex(wi);clipped.computeVertexNormals();g.dispose();return clipped;
  }
  meshFromData(data){
    const positions=flatten(data.positions||data.points||data.vertices),uv=flatten(data.uv||data.uvs),indices=flatten(data.triangles||data.indices||data.faces);
    if(!positions?.length||!indices?.length)throw Error('El archivo del rostro no contiene geometría válida.');
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    if(uv?.length===positions.length/3*2)g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));else{const coords=[];for(let i=0;i<positions.length;i+=3)coords.push(.5+positions[i]/2.5,(positions[i+1]+1.5)/3);g.setAttribute('uv',new THREE.Float32BufferAttribute(coords,2));}
    g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
  }
  buildMirrorLookup(geometry){
    const p=geometry.attributes.position.array,uv=geometry.attributes.uv.array,count=p.length/3,indices=geometry.index.array,mirrors=new Uint32Array(count),reference=this.baseHeadData?.positions?.length===p.length?this.baseHeadData.positions:p;
    const parent=new Int32Array(count);for(let i=0;i<count;i++)parent[i]=i;const find=i=>parent[i]===i?i:parent[i]=find(parent[i]);for(let t=0;t<indices.length;t+=3){parent[find(indices[t+1])]=find(indices[t]);parent[find(indices[t+2])]=find(indices[t]);}
    const components=new Map(),componentOf=new Int32Array(count);for(let i=0;i<count;i++){const root=find(i);componentOf[i]=root;if(!components.has(root))components.set(root,{vertices:[],center:[0,0,0]});const c=components.get(root);c.vertices.push(i);for(let k=0;k<3;k++)c.center[k]+=reference[i*3+k];}for(const c of components.values())c.center=c.center.map(n=>n/c.vertices.length);
    const mirroredComponents=new Map();for(const [id,c]of components){let best=id,distance=Infinity;for(const [j,d]of components){const score=(c.center[0]+d.center[0])**2+(c.center[1]-d.center[1])**2+(c.center[2]-d.center[2])**2+.05*Math.abs(Math.log(c.vertices.length/d.vertices.length));if(score<distance){distance=score;best=j;}}mirroredComponents.set(id,best);}
    for(let i=0;i<count;i++){const x=-reference[i*3],y=reference[i*3+1],z=reference[i*3+2],candidates=components.get(mirroredComponents.get(componentOf[i])).vertices;let distance=Infinity,best=candidates[0];for(const j of candidates){const dx=reference[j*3]-x,dy=reference[j*3+1]-y,dz=reference[j*3+2]-z,d=dx*dx+dy*dy+dz*dz;if(d<distance){distance=d;best=j;}}mirrors[i]=best;}
    const size=256,map=new Float32Array(size*size*2),metric=new Float32Array(size*size*2);map.fill(-1);
    for(let t=0;t<indices.length;t+=3){const ids=[indices[t],indices[t+1],indices[t+2]],a=ids[0],b=ids[1],c=ids[2],ax=uv[a*2]*(size-1),ay=(1-uv[a*2+1])*(size-1),bx=uv[b*2]*(size-1),by=(1-uv[b*2+1])*(size-1),cx=uv[c*2]*(size-1),cy=(1-uv[c*2+1])*(size-1),den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<1e-7)continue;
      const du1=uv[b*2]-uv[a*2],dv1=uv[b*2+1]-uv[a*2+1],du2=uv[c*2]-uv[a*2],dv2=uv[c*2+1]-uv[a*2+1],det=du1*dv2-du2*dv1,e1=[p[b*3]-p[a*3],p[b*3+1]-p[a*3+1],p[b*3+2]-p[a*3+2]],e2=[p[c*3]-p[a*3],p[c*3+1]-p[a*3+1],p[c*3+2]-p[a*3+2]],uLength=clamp(Math.hypot(...e1.map((n,k)=>(n*dv2-e2[k]*dv1)/det)),.1,100),vLength=clamp(Math.hypot(...e1.map((n,k)=>(-n*du2+e2[k]*du1)/det)),.1,100);
      const left=clamp(Math.floor(Math.min(ax,bx,cx)),0,size-1),right=clamp(Math.ceil(Math.max(ax,bx,cx)),0,size-1),top=clamp(Math.floor(Math.min(ay,by,cy)),0,size-1),bottom=clamp(Math.ceil(Math.max(ay,by,cy)),0,size-1),target=ids.map(j=>[uv[mirrors[j]*2],uv[mirrors[j]*2+1]]);
      for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){const aa=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/den,bb=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/den,cc=1-aa-bb;if(aa<-.015||bb<-.015||cc<-.015)continue;const at=(y*size+x)*2;map[at]=aa*target[0][0]+bb*target[1][0]+cc*target[2][0];map[at+1]=aa*target[0][1]+bb*target[1][1]+cc*target[2][1];metric[at]=uLength;metric[at+1]=vLength;}
    }this.mirrorLookup={size,map,metric};this.mirrorIndices=mirrors;
  }
  mirrorUV(u,v){
    const lookup=this.mirrorLookup;if(!lookup)return null;const {size,map}=lookup,x=clamp(u,0,1)*(size-1),y=(1-clamp(v,0,1))*(size-1),ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;let su=0,sv=0,weight=0,first=null;
    for(const [dx,dy,w]of [[0,0,(1-fx)*(1-fy)],[1,0,fx*(1-fy)],[0,1,(1-fx)*fy],[1,1,fx*fy]]){if(!w)continue;const at=(Math.min(size-1,iy+dy)*size+Math.min(size-1,ix+dx))*2,mu=map[at],mv=map[at+1];if(mu<0||mv<0)continue;if(first&&Math.hypot(mu-first[0],mv-first[1])>.2)continue;first||=[mu,mv];su+=mu*w;sv+=mv*w;weight+=w;}
    if(!weight){for(let r=1;r<=3&&!weight;r++)for(let dy=-r;dy<=r&&!weight;dy++)for(let dx=-r;dx<=r;dx++){const at=(clamp(Math.round(y)+dy,0,size-1)*size+clamp(Math.round(x)+dx,0,size-1))*2;if(map[at]>=0&&map[at+1]>=0){su=map[at];sv=map[at+1];weight=1;break;}}}
    if(!weight)return null;const mu=clamp(su/weight,0,1),mv=clamp(sv/weight,0,1);return{u:mu,v:mv,x:mu*SIZE,y:(1-mv)*SIZE};
  }
  brushRadii(point,pressure=.5){
    const lookup=this.mirrorLookup,size=lookup?.size||256,metric=lookup?.metric,x=clamp(Math.round(point.x/SIZE*(size-1)),0,size-1),y=clamp(Math.round(point.y/SIZE*(size-1)),0,size-1);let mu=0,mv=0;
    if(metric){for(let r=0;r<=2&&!mu;r++)for(let dy=-r;dy<=r&&!mu;dy++)for(let dx=-r;dx<=r;dx++){const at=(clamp(y+dy,0,size-1)*size+clamp(x+dx,0,size-1))*2;if(metric[at]>0&&metric[at+1]>0){mu=metric[at];mv=metric[at+1];break;}}}
    const diameter=this.brush.size*(.65+pressure*.7)*(this.tool==='liner'?.00045:this.tool==='sfumato'||this.tool==='airbrush'?.0024:this.tool==='sponge'?.0019:.0015),radius=diameter*.5;
    return{rx:clamp(radius/(mu||9)*SIZE,.3,120),ry:clamp(radius/(mv||3.3)*SIZE,.3,120)};
  }
  mirrorPaintCanvas(canvas){
    if(!this.brush.symmetry)return canvas;const source=canvas.getContext('2d').getImageData(0,0,SIZE,SIZE),out=new ImageData(new Uint8ClampedArray(source.data),SIZE,SIZE),data=source.data;
    const lookup=this.mirrorLookup;if(!lookup)return canvas;const {size,map}=lookup,factor=(size-1)/(SIZE-1);for(let y=0;y<SIZE;y++){const row=Math.round(y*factor)*size;for(let x=0;x<SIZE;x++){const at=(row+Math.round(x*factor))*2,mu=map[at],mv=map[at+1];if(mu<0||mv<0)continue;const a=(y*SIZE+x)*4,b=(clamp(Math.round((1-mv)*(SIZE-1)),0,SIZE-1)*SIZE+clamp(Math.round(mu*(SIZE-1)),0,SIZE-1))*4;if(data[b+3]>out.data[a+3]){out.data[a]=data[b];out.data[a+1]=data[b+1];out.data[a+2]=data[b+2];out.data[a+3]=data[b+3];}}}
    const result=makeCanvas();result.getContext('2d').putImageData(out,0,0);return result;
  }
  fitEyeGeometry(eyeGeometry,headGeometry){
    const reference=this.baseHeadData?.positions,head=headGeometry.attributes.position.array,eye=eyeGeometry.attributes.position.array;
    if(!reference||reference.length!==head.length)return eyeGeometry;
    for(let i=0;i<eye.length;i+=3){const x=eye[i],y=eye[i+1],z=eye[i+2],nearest=[];
      for(let j=0;j<reference.length;j+=3){if(reference[j]*x<0||reference[j+1]<-.12||reference[j+1]>.4||reference[j+2]<.35)continue;const dx=reference[j]-x,dy=reference[j+1]-y,dz=reference[j+2]-z,d=dx*dx+dy*dy+dz*dz;if(nearest.length<12||d<nearest.at(-1).d){nearest.push({j,d});nearest.sort((a,b)=>a.d-b.d);if(nearest.length>12)nearest.pop();}}
      let weight=0,dx=0,dy=0,dz=0;for(const q of nearest){const w=1/(q.d+.0025);weight+=w;dx+=(head[q.j]-reference[q.j])*w;dy+=(head[q.j+1]-reference[q.j+1])*w;dz+=(head[q.j+2]-reference[q.j+2])*w;}
      if(weight){eye[i]+=dx/weight;eye[i+1]+=dy/weight;eye[i+2]+=dz/weight+.002;}
    }eyeGeometry.attributes.position.needsUpdate=true;eyeGeometry.computeVertexNormals();eyeGeometry.computeBoundingSphere();return eyeGeometry;
  }
  async setSubject(subject){
    const token=Symbol();this.subjectToken=token;this.projectionToken=Symbol();this.hairToken=Symbol();await this.ready;if(this.subjectToken!==token)return;
    let meshData=subject.mesh;if(typeof meshData==='string'){const r=await fetch(meshData);if(!r.ok)throw Error('No se pudo cargar el modelo facial.');meshData=await r.json();}
    let photo=null;if(subject.texture){try{photo=await loadImage(subject.texture);}catch(e){this.onStatus(e.message);}}
    let eyeFit=subject.eyeFit;if(typeof eyeFit==='string'){const r=await fetch(eyeFit);if(!r.ok)throw Error('No se pudo cargar el ajuste ocular del intérprete.');eyeFit=await r.json();}
    const photographicEyes=subject.eyeTexture?await loadImage(subject.eyeTexture):null;
    if(this.subjectToken!==token)return;
    for(const mesh of this.meshes){this.headGroup.remove(mesh);mesh.geometry.dispose();mesh.material?.dispose();}
    this.subjectEyeTexture?.dispose();this.subjectEyeTexture=null;this.meshes=[];this.originals.clear();this.paintTargets=[];this.subject=subject;this.isGeneric=!meshData;this.photoImage=photo;this.projectedBase=null;this.projectedImage=null;
    this.genericBase=makeCanvas();this.genericBase.getContext('2d').drawImage(this.skinImage,0,0,SIZE,SIZE);
    const skinM=material(this.texture,{roughness:1,metalness:1,roughnessMap:this.roughTexture,metalnessMap:this.metalTexture,emissiveMap:this.emissiveTexture,emissive:0xffffff,emissiveIntensity:.2,side:THREE.FrontSide});
    const faceG=this.meshFromData(meshData||this.baseHeadData);
    this.buildMirrorLookup(faceG);this.face=new THREE.Mesh(faceG,skinM);this.face.name=(subject.name||'Rostro')+' · cabeza y cuello continuos';this.face.userData={subjectId:subject.id,approximate:true,meshKind:'head',continuousSkin:true};this.headGroup.add(this.face);this.meshes.push(this.face);this.paintTargets=[this.face];this.originals.set(this.face,faceG.attributes.position.array.slice());
    const eyeG=eyeFit?this.meshFromData(eyeFit):this.makeAnatomyGeometry('eyes');if(eyeG){if(!eyeFit){eyeG.setAttribute('uv',eyeG.attributes.sourceUV.clone());this.fitEyeGeometry(eyeG,faceG);}if(this.eyeImage&&!this.eyeTexture){this.eyeTexture=new THREE.Texture(this.eyeImage);this.eyeTexture.needsUpdate=true;this.eyeTexture.colorSpace=THREE.SRGBColorSpace;}if(photographicEyes){this.subjectEyeTexture=new THREE.Texture(photographicEyes);this.subjectEyeTexture.needsUpdate=true;this.subjectEyeTexture.colorSpace=THREE.SRGBColorSpace;}this.eyes=new THREE.Mesh(eyeG,material(this.subjectEyeTexture||this.eyeTexture||null,{color:0xffffff,roughness:.34}));this.eyes.name='Ojos anatómicos · MakeHuman CC0';this.eyes.userData={anatomicalEyeAsset:true,fittedToHead:true,semanticOcularFit:!!eyeFit,photographicIris:!!photographicEyes,approximateIris:!photographicEyes};this.headGroup.add(this.eyes);this.meshes.push(this.eyes);this.originals.set(this.eyes,eyeG.attributes.position.array.slice());}
    this.morphs={};this.setMorphs(subject.morphs||{});this.selection=null;this.drawSelection([]);this.setHair({style:'reference'});this.applyBase();this.resetView();
    this.onStatus(meshData?'Cabeza continua aproximada, contrastable con las cinco fotografías.':'Anatomía genérica editable · MakeHuman CC0.');
  }
  applyBase(){
    const c=this.baseCanvas.getContext('2d');c.clearRect(0,0,SIZE,SIZE);
    if(this.photoMode&&this.projectedBase)c.drawImage(this.projectedBase,0,0);else if(this.photoMode&&this.photoImage)c.drawImage(this.photoImage,0,0,SIZE,SIZE);else if(this.genericBase)c.drawImage(this.genericBase,0,0);else{c.fillStyle='#cba58e';c.fillRect(0,0,SIZE,SIZE);}
    this.refreshTexture();
  }
  async setProjectedPhoto(url,{scale=2.3,offsetX=0,offsetY=-.08}={}){
    const subjectAtStart=this.subjectToken,token=Symbol();this.projectionToken=token;await this.ready;
    const image=(url===this.projectedURL&&this.projectedImage)?this.projectedImage:await loadImage(url);if(this.subjectToken!==subjectAtStart||this.projectionToken!==token)return;this.projectedImage=image;this.projectedURL=url;this.projection={scale:clamp(Number(scale),.2,10),offsetX:Number(offsetX),offsetY:Number(offsetY)};
    if(!this.face)return;
    const canvas=makeCanvas(),ctx=canvas.getContext('2d');ctx.drawImage(this.genericBase||this.baseCanvas,0,0);
    const g=this.face.geometry,p=g.attributes.position.array,dst=g.attributes.uv.array,ids=g.index.array,sc=this.projection.scale,ox=this.projection.offsetX,oy=this.projection.offsetY;
    // Planar projection is deliberately approximate; it does not infer unseen depth.
    for(let i=0;i<ids.length;i+=3){const js=[ids[i],ids[i+1],ids[i+2]],meanZ=js.reduce((a,j)=>a+p[j*3+2],0)/3,meanY=js.reduce((a,j)=>a+p[j*3+1],0)/3;
      if(meanZ<.3||meanY<-.98||meanY>1.23)continue;
      const us=js.map(j=>dst[j*2]);if(Math.max(...us)-Math.min(...us)>.5)continue;
      const source=js.map(j=>[(.5+p[j*3]/(1.7*sc)+ox)*image.width,(.5-(p[j*3+1]-.05)/(1.7*sc)*(image.width/image.height)+oy)*image.height]);
      const dest=js.map(j=>[dst[j*2]*SIZE,(1-dst[j*2+1])*SIZE]);const den=source[0][0]*(source[1][1]-source[2][1])+source[1][0]*(source[2][1]-source[0][1])+source[2][0]*(source[0][1]-source[1][1]);if(Math.abs(den)<.0001)continue;
      const coefficient=k=>[(dest[0][k]*(source[1][1]-source[2][1])+dest[1][k]*(source[2][1]-source[0][1])+dest[2][k]*(source[0][1]-source[1][1]))/den,(dest[0][k]*(source[2][0]-source[1][0])+dest[1][k]*(source[0][0]-source[2][0])+dest[2][k]*(source[1][0]-source[0][0]))/den,(dest[0][k]*(source[1][0]*source[2][1]-source[2][0]*source[1][1])+dest[1][k]*(source[2][0]*source[0][1]-source[0][0]*source[2][1])+dest[2][k]*(source[0][0]*source[1][1]-source[1][0]*source[0][1]))/den];const a=coefficient(0),b=coefficient(1);
      ctx.save();ctx.beginPath();ctx.moveTo(...dest[0]);ctx.lineTo(...dest[1]);ctx.lineTo(...dest[2]);ctx.closePath();ctx.clip();ctx.setTransform(a[0],b[0],a[1],b[1],a[2],b[2]);ctx.drawImage(image,0,0);ctx.restore();
      if(i%2400===0){await new Promise(resolve=>requestAnimationFrame(resolve));if(this.projectionToken!==token)return;}
    }
    if(this.subjectToken!==subjectAtStart||this.projectionToken!==token)return;this.projectedBase=canvas;this.photoMode=true;this.applyBase();this.onStatus('Foto proyectada sobre anatomía genérica. Ajusta la alineación; los perfiles siguen siendo aproximados.');
  }
  clearProjectedPhoto(){this.projectionToken=Symbol();this.projectedBase=null;this.projectedImage=null;this.projectedURL=null;this.projection=null;this.applyBase();}
  setPhotoMode(value){this.photoMode=!!value;this.applyBase();}
  setLayers(layers,activeId){this.layers=layers;this.activeId=activeId||layers.at(-1)?.id;this.refreshTexture();}
  setBrush(values){Object.assign(this.brush,values);this.brush.opacity=clamp(Number(this.brush.opacity),0,1);this.brush.size=clamp(Number(this.brush.size),1,200);for(const k of ['flow','scatter','grain','stabilization'])this.brush[k]=clamp(Number(this.brush[k]??0),0,1);}
  setTool(tool){this.tool=tool;this.renderer.domElement.style.cursor=['rotate','orbit','move','hand'].includes(tool)?'grab':'crosshair';}
  refreshTexture(){
    const c=this.textureCanvas.getContext('2d'),r=this.roughCanvas.getContext('2d'),m=this.finishCanvas.getContext('2d'),e=this.emissiveCanvas.getContext('2d');
    c.clearRect(0,0,SIZE,SIZE);c.drawImage(this.baseCanvas,0,0);r.fillStyle='#e3e3e3';r.fillRect(0,0,SIZE,SIZE);m.fillStyle='#000';m.fillRect(0,0,SIZE,SIZE);e.fillStyle='#000';e.fillRect(0,0,SIZE,SIZE);
    for(const layer of this.layers){if(layer.visible===false||!layer.canvas)continue;const alpha=clamp(Number(layer.opacity??1),0,1);c.save();c.globalAlpha=alpha;c.globalCompositeOperation=blendModes[layer.blend]||layer.blend||'source-over';c.drawImage(layer.canvas,0,0);c.restore();
      const finish=layer.finish||'matte',rough=finish==='metallic'||finish==='metal'?80:finish==='satin'||finish==='satinado'?126:finish==='glossy'?58:220,metal=finish==='metallic'||finish==='metal'?215:finish==='satin'||finish==='satinado'?35:0;
      for(const [ctx,color] of [[r,`rgb(${rough},${rough},${rough})`],[m,`rgb(${metal},${metal},${metal})`]]){const tmp=this.finishScratch;const tx=tmp.getContext('2d');tx.globalCompositeOperation='source-over';tx.clearRect(0,0,SIZE,SIZE);tx.drawImage(layer.canvas,0,0);tx.globalCompositeOperation='source-in';tx.fillStyle=color;tx.fillRect(0,0,SIZE,SIZE);ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(tmp,0,0);ctx.restore();}
      if(['fluorescent','neon','fluorescente'].includes(finish)){e.save();e.globalAlpha=alpha;e.drawImage(layer.canvas,0,0);e.restore();}
    }
    this.texture.needsUpdate=this.roughTexture.needsUpdate=this.metalTexture.needsUpdate=this.emissiveTexture.needsUpdate=true;this.requestRender();
  }
  setMorphs(values){
    this.morphs={...this.morphs,...values};
    const read=(...keys)=>{for(const k of keys)if(this.morphs[k]!==undefined)return Number(this.morphs[k]);return 0;};
    const scaleValue=n=>Math.abs(n)>2?n/100:n;
    const nose=scaleValue(read('noseWidth','nose','nariz')),eyes=scaleValue(read('eyeSize','eyes','ojos')),brow=scaleValue(read('browHeight','brow','cejas')),lipW=scaleValue(read('lipWidth','mouthWidth','lips')),lipH=scaleValue(read('lipHeight','mouthHeight')),jaw=scaleValue(read('jawWidth','jaw','mandibula')),faceW=scaleValue(read('faceWidth','width')),faceH=scaleValue(read('faceHeight','height'));
    for(const mesh of this.meshes){const original=this.originals.get(mesh);if(!original)continue;const a=mesh.geometry.attributes.position.array;
      for(let i=0;i<a.length;i+=3){let x=original[i],y=original[i+1],z=original[i+2];const front=clamp((z-.15)*2,0,1),gauss=(cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2))*front;
        x*=1+faceW*.16;y*=1+faceH*.13;const n=gauss(0,.03,.24,.42);x+=x*n*nose*.6;z+=n*nose*.04;
        for(const sign of [-1,1]){const ey=gauss(sign*.31,.15,.27,.2);x+=(x-sign*.31)*ey*eyes*.4;y+=(y-.15)*ey*eyes*.4;y+=gauss(sign*.31,.38,.3,.18)*brow*.16;z+=gauss(sign*.31,.38,.3,.18)*brow*.045;}
        const mouth=gauss(0,-.49,.4,.19);x+=x*mouth*lipW*.42;y+=(y+.49)*mouth*lipH*.6;x+=x*gauss(0,-.8,.8,.45)*jaw*.2;
        if(this.isGeneric&&(this.subject?.gender==='female'||this.subject?.gender==='f')){const jawMask=clamp((-y-.2)*1.3,0,.8);x*=1-jawMask*.065;}
        a[i]=x;a[i+1]=y;a[i+2]=z;
      }mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
    }let refittedHair=false;for(const group of this.hairGroup.children){if(typeof group.userData?.refit==='function'){group.userData.refit(this.face.geometry);refittedHair=true;}}if(!refittedHair&&this.hairState&&!['none','reference'].includes(this.hairState.style))this.setHair(this.hairState);if(this.selection?.length)this.drawSelection(this.selection,true);this.requestRender();
  }
  setLight({mode='dressing',intensity=1,azimuth=35,color='#ffffff'}={}){
    this.lightState={mode,intensity,azimuth,color};const spot=['spot','stage','escena','spots'].includes(mode);this.ambient.intensity=(spot?.35:2)*intensity;this.lights.forEach((l,i)=>{l.visible=!spot||i===4;l.intensity=(!spot?[1.7,1.7,.7,.7,.65][i]:.8)*intensity;});this.key.visible=spot;this.key.color.set(color);this.key.intensity=35*intensity;const angle=azimuth*Math.PI/180;this.key.position.set(Math.sin(angle)*4,2.4,Math.cos(angle)*4);this.key.target.position.set(0,.1,0);this.requestRender();
  }
  setBackground(color){this.scene.background.set(color);this.requestRender();}
  setView(name){const angles={front:0,frontal:0,left:Math.PI/2,right:-Math.PI/2,'profile-left':Math.PI/2,'profile-right':-Math.PI/2,profileLeft:Math.PI/2,profileRight:-Math.PI/2,threeLeft:Math.PI/4,threeRight:-Math.PI/4,'three-left':Math.PI/4,'three-right':-Math.PI/4,left34:Math.PI/4,right34:-Math.PI/4,back:Math.PI};this.yaw=angles[name]??0;this.pitch=0;this.updateCamera();}
  zoom(delta){this.distance=clamp(this.distance*Math.exp(Number(delta)*.35),2.3,25);this.updateCamera();}
  async fitHairView(){await this.hairReady;const box=new THREE.Box3().setFromObject(this.headGroup);if(box.isEmpty())return;const size=box.getSize(new THREE.Vector3()),vertical=Math.tan(this.camera.fov*Math.PI/360),height=size.y/(2*vertical),width=Math.max(size.x,size.z)/(2*vertical*Math.max(.2,this.camera.aspect));this.target.copy(box.getCenter(new THREE.Vector3()));this.distance=clamp(Math.max(height,width)*1.12+Math.max(size.x,size.z)*.55,2.3,25);this.updateCamera();}
  resetView(){this.yaw=0;this.pitch=0;this.distance=6.1;this.target.set(0,.15,0);this.updateCamera();}
  getCameraState(){return{yaw:this.yaw,pitch:this.pitch,distance:this.distance,target:this.target.toArray()};}
  setCameraState(camera){if(!camera)return;for(const key of ['yaw','pitch','distance'])if(Number.isFinite(camera[key]))this[key]=camera[key];this.pitch=clamp(this.pitch,-.68,.68);this.distance=clamp(this.distance,2.3,25);if(Array.isArray(camera.target)&&camera.target.length===3&&camera.target.every(Number.isFinite))this.target.fromArray(camera.target);this.updateCamera();}
  updateCamera(){this.camera.position.set(this.target.x+Math.sin(this.yaw)*Math.cos(this.pitch)*this.distance,this.target.y+Math.sin(this.pitch)*this.distance,this.target.z+Math.cos(this.yaw)*Math.cos(this.pitch)*this.distance);this.camera.lookAt(this.target);this.requestRender();}
  setHair({style='reference',color='#3e302c'}={}){
    this.hairState={style,color};const token=Symbol();this.hairToken=token;
    const clear=()=>{while(this.hairGroup.children.length){const child=this.hairGroup.children[0];this.hairGroup.remove(child);child.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});}};
    clear();this.hairGroup.scale.set(1,1,1);
    this.hairReady=(async()=>{if(!this.face||['none','reference'].includes(style)){this.requestRender();return;}
      try{const hair=await buildHair({THREE,geometry:this.face.geometry,style,color,sourceHairImage:this.hairImage,subject:this.subject});if(this.hairToken!==token||this.disposed){hair?.traverse?.(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});return;}if(hair){this.hairGroup.add(hair);this.requestRender();}}
      catch(error){if(this.hairToken===token){this.onStatus('No se pudo cargar esta propuesta de cabello: '+error.message);this.requestRender();}}
    })();return this.hairReady;
  }
  resize(){const {width,height}=this.container.getBoundingClientRect();if(!width||!height)return;this.renderer.setSize(Math.round(width),Math.round(height),false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.requestRender();}
  requestRender(){if(this.dirty||this.disposed)return;this.dirty=true;requestAnimationFrame(()=>{this.dirty=false;if(!this.disposed)this.renderer.render(this.scene,this.camera);});}
  hit(event){const r=this.renderer.domElement.getBoundingClientRect();this.ndc.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.ndc,this.camera);const hit=this.raycaster.intersectObjects(this.paintTargets,false)[0],eyeHit=this.eyes&&this.raycaster.intersectObject(this.eyes,false)[0];if(eyeHit&&(!hit||eyeHit.distance<hit.distance-.001))return null;return hit?.uv?{u:hit.uv.x,v:hit.uv.y,x:hit.uv.x*SIZE,y:(1-hit.uv.y)*SIZE,point:hit.point,normal:hit.face?.normal}:null;}
  activeLayer(){return this.layers.find(l=>l.id===this.activeId);}
  notifyPaint(phase){this.onPaint({phase,layerId:this.activeId,tool:this.tool});}
  bindEvents(){
    const el=this.renderer.domElement,listen=(name,fn,opts)=>{el.addEventListener(name,fn,opts);this.listeners.push([name,fn,opts]);};
    listen('contextmenu',e=>e.preventDefault());
    listen('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;el.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(this.pointers.size===2){const ps=[...this.pointers.values()];this.pinchDistance=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);if(this.drawing)this.finishStroke();return;}
      this.lastScreen={x:e.clientX,y:e.clientY};this.rotating=['rotate','orbit','move','hand'].includes(this.tool)||e.button===2||e.altKey;
      if(this.rotating){el.style.cursor='grabbing';return;}const hit=this.hit(e);if(!hit)return;
      if(this.tool==='select'||this.tool==='lasso'){this.selectionDraft=[hit];this.drawSelection(this.selectionDraft,false);this.onStatus('Rodea el área; después elige Degradado o una brocha.');return;}
      const layer=this.activeLayer();if(!layer||layer.locked){this.onStatus('Selecciona una capa editable para maquillar.');return;}this.notifyPaint('start');this.drawing=true;this.lastUV=hit;this.strokeStart=hit;
      if(['tone','base','foundation','base-tone'].includes(this.tool)){this.fillTone();this.finishStroke();}else if(this.tool!=='gradient')this.dab(hit,e.pressure||.5);
    });
    listen('pointermove',e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(this.pointers.size===2){const ps=[...this.pointers.values()],d=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);if(this.pinchDistance)this.distance=clamp(this.distance*this.pinchDistance/Math.max(d,1),2.3,25);this.pinchDistance=d;this.updateCamera();return;}
      if(this.rotating&&this.lastScreen){const dx=e.clientX-this.lastScreen.x,dy=e.clientY-this.lastScreen.y;if(dx||dy){this.yaw-=dx*.009;this.pitch=clamp(this.pitch+dy*.007,-.68,.68);this.viewGesture=true;this.updateCamera();this.onViewChange({view:'free',phase:'change',camera:this.getCameraState()});}this.lastScreen={x:e.clientX,y:e.clientY};return;}
      let hit=this.hit(e);if(!hit){this.lastUV=null;return;}if(this.drawing&&this.lastUV&&this.tool!=='gradient'&&this.brush.stabilization){const keep=this.brush.stabilization*.74;hit={...hit,x:hit.x*(1-keep)+this.lastUV.x*keep,y:hit.y*(1-keep)+this.lastUV.y*keep};}if(this.selectionDraft){const prev=this.selectionDraft.at(-1);if(Math.hypot(hit.x-prev.x,hit.y-prev.y)>3){this.selectionDraft.push(hit);this.drawSelection(this.selectionDraft,false);}return;}
      if(!this.drawing)return;if(this.tool==='gradient'){this.lastUV=hit;return;}if(this.lastUV){const d=Math.hypot(hit.x-this.lastUV.x,hit.y-this.lastUV.y);if(d<SIZE*.35){const radii=this.brushRadii(hit,e.pressure||.5),n=Math.ceil(d/Math.max(.6,Math.min(radii.rx,radii.ry)*.5));for(let i=1;i<=n;i++){const t=i/n;this.dab({x:this.lastUV.x+(hit.x-this.lastUV.x)*t,y:this.lastUV.y+(hit.y-this.lastUV.y)*t},e.pressure||.5,false);}}else this.dab(hit,e.pressure||.5,false);}else this.dab(hit,e.pressure||.5,false);this.lastUV=hit;this.refreshTexture();
    });
    const end=e=>{this.pointers.delete(e.pointerId);if(this.selectionDraft){if(this.selectionDraft.length>2){this.selection=this.selectionDraft;this.drawSelection(this.selection,true);this.onStatus('Área seleccionada. Las brochas y el degradado quedan limitados a ella.');}this.selectionDraft=null;}
      if(this.drawing){if(this.tool==='gradient')this.gradient(this.strokeStart,this.lastUV||this.strokeStart);this.finishStroke();}if(this.viewGesture){this.onViewChange({view:'free',phase:'end',camera:this.getCameraState()});this.viewGesture=false;}this.rotating=false;this.lastScreen=null;this.pinchDistance=null;this.setTool(this.tool);};
    listen('pointerup',end);listen('pointercancel',end);listen('lostpointercapture',e=>{if(this.pointers.has(e.pointerId))end(e);});
    listen('wheel',e=>{e.preventDefault();this.zoom(e.deltaY*.006);},{passive:false});
  }
  uvPoint(u,v){
    if(!this.face)return null;const g=this.face.geometry,uv=g.attributes.uv,p=g.attributes.position,n=g.attributes.normal,ids=g.index.array;
    for(let i=0;i<ids.length;i+=3){const a=ids[i],b=ids[i+1],c=ids[i+2],ax=uv.getX(a),ay=uv.getY(a),bx=uv.getX(b),by=uv.getY(b),cx=uv.getX(c),cy=uv.getY(c),den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<1e-9)continue;const aa=((by-cy)*(u-cx)+(cx-bx)*(v-cy))/den,bb=((cy-ay)*(u-cx)+(ax-cx)*(v-cy))/den,cc=1-aa-bb;if(aa<-.001||bb<-.001||cc<-.001)continue;const q=new THREE.Vector3(),normal=new THREE.Vector3();for(const [j,w]of [[a,aa],[b,bb],[c,cc]]){q.addScaledVector(new THREE.Vector3().fromBufferAttribute(p,j),w);normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(n,j),w);}return q.addScaledVector(normal.normalize(),.006);}
    return null;
  }
  drawSelection(points,closed=true){
    while(this.selectionLines.children.length){const line=this.selectionLines.children.pop();line.geometry.dispose();line.material.dispose();}if(points.length<2){this.requestRender();return;}
    for(const mirror of (this.brush.symmetry?[false,true]:[false])){const vertices=points.map(p=>mirror?this.mirrorUV(p.u,p.v):p).filter(Boolean).map(p=>this.uvPoint(p.u,p.v)).filter(Boolean);if(vertices.length<2)continue;const line=new (closed?THREE.LineLoop:THREE.Line)(new THREE.BufferGeometry().setFromPoints(vertices),new THREE.LineBasicMaterial({color:'#72ecd4',transparent:true,opacity:.96,depthTest:false}));line.renderOrder=1000;this.selectionLines.add(line);}this.requestRender();
  }
  withSelection(ctx,fn,mirrorSelection=this.brush.symmetry){ctx.save();if(this.selection?.length){ctx.beginPath();this.selection.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(mirrorSelection){const ps=[...this.selection].reverse().map(p=>this.mirrorUV(p.u,p.v)).filter(Boolean);if(ps.length>2){ctx.moveTo(ps[0].x,ps[0].y);for(const p of ps.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();}}ctx.clip();}fn();ctx.restore();}
  dab(point,pressure=.5,update=true){
    const layer=this.activeLayer();if(!layer?.canvas)return;const ctx=layer.canvas.getContext('2d');
    const paint=(x,y)=>{const {rx,ry}=this.brushRadii({x,y},pressure);this.withSelection(ctx,()=>{ctx.globalCompositeOperation=['eraser','erase'].includes(this.tool)?'destination-out':'source-over';ctx.globalAlpha=this.brush.opacity*(.2+this.brush.flow*.8)*(this.tool==='liner'?.95:.38);ctx.fillStyle=this.brush.color;
      if(['sponge','espuma','stipple'].includes(this.tool)){const count=Math.max(8,Math.sqrt(rx*ry)*3);for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*(.55+this.brush.scatter*.9),dot=.15+Math.random()*(.25+this.brush.grain*.6);ctx.globalAlpha=this.brush.opacity*(.08+Math.random()*.18);ctx.beginPath();ctx.ellipse(x+Math.cos(a)*r*rx,y+Math.sin(a)*r*ry,dot,dot*ry/rx,0,0,Math.PI*2);ctx.fill();}}
      else{const soft=['sfumato','airbrush','blur','soft'].includes(this.tool),hard=this.tool==='liner'?.94:soft?.02:clamp(this.brush.hardness,0,.98);ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const gradient=ctx.createRadialGradient(0,0,hard,0,0,1);gradient.addColorStop(0,this.brush.color);gradient.addColorStop(1,this.hexAlpha(this.brush.color,0));ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();}
    });};paint(point.x,point.y);if(this.brush.symmetry){const mirrored=this.mirrorUV(point.x/SIZE,1-point.y/SIZE),radii=this.brushRadii(point,pressure);if(mirrored&&Math.hypot(mirrored.x-point.x,mirrored.y-point.y)>Math.min(radii.rx,radii.ry)*.2)paint(mirrored.x,mirrored.y);}if(update)this.refreshTexture();
  }
  hexAlpha(color,a){const c=new THREE.Color(color).convertLinearToSRGB();return `rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},${a})`;}
  fillTone(){const layer=this.activeLayer();if(!layer?.canvas)return;const c=layer.canvas.getContext('2d');this.withSelection(c,()=>{c.globalAlpha=this.brush.opacity;c.fillStyle=this.brush.color;c.fillRect(0,0,SIZE,SIZE);});this.refreshTexture();}
  gradient(start,end){
    const layer=this.activeLayer();if(!layer?.canvas)return;const temp=makeCanvas(),c=temp.getContext('2d');this.withSelection(c,()=>{const e=Math.hypot(end.x-start.x,end.y-start.y)<3?{x:start.x,y:start.y+this.brush.size*3}:end,g=c.createLinearGradient(start.x,start.y,e.x,e.y);g.addColorStop(0,this.brush.color);g.addColorStop(1,this.hexAlpha(this.brush.color,0));c.fillStyle=g;c.globalAlpha=this.brush.opacity;if(this.selection)c.fillRect(0,0,SIZE,SIZE);else{c.beginPath();c.ellipse((start.x+e.x)/2,(start.y+e.y)/2,Math.max(this.brush.size,Math.abs(e.x-start.x)),Math.max(this.brush.size,Math.abs(e.y-start.y)),0,0,Math.PI*2);c.fill();}},false);layer.canvas.getContext('2d').drawImage(this.mirrorPaintCanvas(temp),0,0);this.refreshTexture();
  }
  finishStroke(){if(!this.drawing)return;this.drawing=false;this.refreshTexture();this.notifyPaint('end');this.lastUV=null;}
  clearSelection(){this.selection=null;this.drawSelection([]);this.onStatus('Selección desactivada.');}
  renderCapture({withoutMakeup=false,width=1200,height=1400}={}){
    const oldSize=this.renderer.getSize(new THREE.Vector2()),oldRatio=this.renderer.getPixelRatio(),oldAspect=this.camera.aspect,oldMap=this.face?.material.map;
    const selectionVisible=this.selectionLines.visible;this.selectionLines.visible=false;let baseTexture;if(withoutMakeup&&this.face){baseTexture=new THREE.CanvasTexture(this.baseCanvas);baseTexture.colorSpace=THREE.SRGBColorSpace;this.face.material.map=baseTexture;this.face.material.roughnessMap=null;this.face.material.metalnessMap=null;this.face.material.roughness=.88;this.face.material.metalness=0;this.face.material.emissiveMap=null;this.face.material.needsUpdate=true;}
    this.renderer.setPixelRatio(1);this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.render(this.scene,this.camera);const result=makeCanvas(width,height);result.getContext('2d').drawImage(this.renderer.domElement,0,0);
    if(withoutMakeup&&this.face){this.face.material.map=oldMap;this.face.material.roughnessMap=this.roughTexture;this.face.material.metalnessMap=this.metalTexture;this.face.material.roughness=1;this.face.material.metalness=1;this.face.material.emissiveMap=this.emissiveTexture;this.face.material.needsUpdate=true;baseTexture.dispose();}
    this.renderer.setPixelRatio(oldRatio);this.renderer.setSize(oldSize.x,oldSize.y,false);this.camera.aspect=oldAspect;this.camera.updateProjectionMatrix();this.selectionLines.visible=selectionVisible;this.renderer.render(this.scene,this.camera);return result;
  }
  getExportScene(){const group=this.headGroup.clone(true);group.name='Estudio Quelec · modelo aproximado';return{scene:group,textureCanvas:this.textureCanvas,baseCanvas:this.baseCanvas,layers:this.layers};}
  getState(){return{view:{yaw:this.yaw,pitch:this.pitch,distance:this.distance},morphs:{...this.morphs},hair:{...this.hairState},light:{...this.lightState},photoMode:this.photoMode,projection:this.projection?{...this.projection}:null};}
  dispose(){this.disposed=true;this.resizeObserver.disconnect();for(const [name,fn,opts]of this.listeners)this.renderer.domElement.removeEventListener(name,fn,opts);this.scene.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});this.subjectEyeTexture?.dispose();this.eyeTexture?.dispose();this.texture.dispose();this.roughTexture.dispose();this.metalTexture.dispose();this.emissiveTexture.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
