import * as THREE from './vendor/three.module.min.js';
import { DURATION, OBJECTS_DURATION, clamp, smooth, mix, ramp, envelope, jump, shapeAt, objectFlip } from './timeline.mjs';
import { objectVertex } from './object-morph.mjs';

const query = new URLSearchParams(location.search);
const objectsVersion = query.get('version') === 'objects';
const duration = objectsVersion ? OBJECTS_DURATION : DURATION;
const exporting = query.has('render');
if (exporting) document.body.classList.add('render');
const WIDTH = Number(query.get('width') || 1920);
const HEIGHT = WIDTH * 9 / 16;
const output = document.querySelector('#type');
output.width = WIDTH;
output.height = HEIGHT;
const ink = output.getContext('2d', { alpha: false });
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#picture'), alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 90);
camera.position.set(0, 0, 10);

// A photographic light stage, generated locally: no HDR download or external assets.
const studio = new THREE.Scene();
studio.background = new THREE.Color(0x151c2b);
for (const [x,y,z,width,height,color,intensity] of [
  [-4,5,2,5,8,0xc4d9ff,5], [4,1,3,2,8,0x6cffd3,4],
  [0,6,-3,8,3,0xffffff,7], [-6,0,-1,2,6,0x7269ff,5],
]) {
  const card = new THREE.Mesh(new THREE.PlaneGeometry(width,height), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  card.material.color.multiplyScalar(intensity);
  card.position.set(x,y,z); card.lookAt(0,0,0); studio.add(card);
}
const pmrem = new THREE.PMREMGenerator(renderer);
const environment = pmrem.fromScene(studio, 0.05, 0.1, 40);
scene.environment = environment.texture;
pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xc1d7ff, 0x070b20, 2.4));
const key = new THREE.DirectionalLight(0xffffff, 3.2);
key.position.set(-3,5,6); scene.add(key);
const rim = new THREE.DirectionalLight(0x5affc4, 2.6);
rim.position.set(5,1,-2); scene.add(rim);

function radius(shape, angle) {
  if (shape === 'circle' || shape === 'sphere') return 1.03;
  if (shape === 'triangle') {
    // Smooth intersection of three half-planes rounds the corners continuously.
    const normals=[-Math.PI/2,Math.PI/6,5*Math.PI/6];
    return .65/(Math.log(normals.reduce((sum,normal)=>sum+Math.exp(10*Math.cos(angle-normal)),0))/10);
  }
  return Math.pow(Math.pow(Math.abs(Math.cos(angle)), 4.8) + Math.pow(Math.abs(Math.sin(angle)), 4.8), -1 / 4.8);
}

function makeGeometry(shape) {
  const rings = Array.from({length:41},(_,index)=>{
    const angle=index/40*Math.PI;
    return [Math.sin(angle),shape==='sphere'?1.03*Math.cos(angle):.27*Math.tanh(12*Math.cos(angle))];
  });
  const positions = [], colors = [], indices = [];
  const purple = new THREE.Color('#6366f1'), green = new THREE.Color('#34d399');
  for (let ring=0; ring<rings.length; ring++) {
    for (let segment=0; segment<=96; segment++) {
      const angle = segment / 96 * Math.PI * 2;
      const rad = radius(shape, angle) * rings[ring][0];
      const x = Math.cos(angle) * rad, y = Math.sin(angle) * rad;
      positions.push(x,y,rings[ring][1]);
      const color = purple.clone().lerp(green, clamp((x-y+2.3)/4.6));
      colors.push(color.r,color.g,color.b);
      if (ring<rings.length-1 && segment<96) {
        const current=ring*97+segment, next=current+97;
        indices.push(current,next,current+1,next,next+1,current+1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const normals=geometry.attributes.normal;
  if(shape==='sphere') {
    for(let index=0;index<positions.length/3;index++) {
      normals.setXYZ(index,positions[index*3]/1.03,positions[index*3+1]/1.03,positions[index*3+2]/1.03);
    }
  } else {
    for(let ring=0;ring<rings.length;ring++) {
      const first=ring*97,last=first+96;
      const normal=new THREE.Vector3(normals.getX(first)+normals.getX(last),normals.getY(first)+normals.getY(last),normals.getZ(first)+normals.getZ(last)).normalize();
      normals.setXYZ(first,normal.x,normal.y,normal.z);normals.setXYZ(last,normal.x,normal.y,normal.z);
    }
  }
  return geometry;
}
const brickGeometry=makeGeometry('brick');
const triangleGeometry=makeGeometry('triangle'), circleGeometry=makeGeometry('circle');
const sphereGeometry=makeGeometry('sphere');
brickGeometry.morphAttributes.position=[triangleGeometry.attributes.position,circleGeometry.attributes.position,sphereGeometry.attributes.position];
brickGeometry.morphAttributes.normal=[triangleGeometry.attributes.normal,circleGeometry.attributes.normal,sphereGeometry.attributes.normal];
const metal = new THREE.MeshPhysicalMaterial({ vertexColors:true, metalness:.58, roughness:.26, clearcoat:1, clearcoatRoughness:.19, envMapIntensity:1.15, side:THREE.DoubleSide });

// The four cubic segments are taken verbatim from docs_v2/public/logo.svg.
const segments = [
  [[10.6,24],[10.6,17.6],[19,17],[24,24]],
  [[24,24],[29,31],[37.4,30.4],[37.4,24]],
  [[37.4,24],[37.4,17.6],[29,17],[24,24]],
  [[24,24],[19,31],[10.6,30.4],[10.6,24]],
];
const infinityPath = new THREE.CurvePath();
for (const controls of segments) {
  infinityPath.add(new THREE.CubicBezierCurve3(...controls.map(([x,y]) => new THREE.Vector3((x-24)/23, (24-y)/23, .286))));
}
const infinityGeometry = new THREE.TubeGeometry(infinityPath, 128, 1.6/23, 10, true);
const sphereSign=infinityGeometry.clone();
for(let index=0;index<sphereSign.attributes.position.count;index++) {
  const positions=sphereSign.attributes.position,x=positions.getX(index),y=positions.getY(index);
  positions.setZ(index,Math.sqrt(1.03**2-x*x-y*y)+positions.getZ(index)-.286+.025);
}
sphereSign.computeVertexNormals();
infinityGeometry.morphAttributes.position=[sphereSign.attributes.position];
infinityGeometry.morphAttributes.normal=[sphereSign.attributes.normal];
const porcelain = new THREE.MeshPhysicalMaterial({ color:0xe0f6ff, emissive:0x82d9ff, emissiveIntensity:.28, metalness:.3, roughness:.2, clearcoat:1 });
function makeBlock() {
  const group=new THREE.Group();
  const body=new THREE.Mesh(brickGeometry.clone(),metal.clone());
  const sign=new THREE.Mesh(infinityGeometry,porcelain);
  group.add(body,sign); group.userData={body,sign};
  return group;
}
const main=makeBlock(); scene.add(main);
const companions=[makeBlock(),makeBlock()]; companions.forEach(block=>scene.add(block));

const layerGeometry = new THREE.EdgesGeometry(makeGeometry('brick'), 32);
const layers=[];
for(let index=0;index<5;index++) {
  const line=new THREE.LineSegments(layerGeometry,new THREE.LineBasicMaterial({color:index%2?0x72e8c7:0x949cff,transparent:true,opacity:.45}));
  scene.add(line); layers.push(line);
}
const floorTexture = document.createElement('canvas'); floorTexture.width=floorTexture.height=128;
const shadowInk=floorTexture.getContext('2d');
const gradient=shadowInk.createRadialGradient(64,64,0,64,64,64);
gradient.addColorStop(0,'rgba(54,156,165,0.24)');gradient.addColorStop(.5,'rgba(45,100,150,0.09)');gradient.addColorStop(1,'rgba(0,0,0,0)');
shadowInk.fillStyle=gradient;shadowInk.fillRect(0,0,128,128);
const shadows=Array.from({length:3},()=>{
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4.2,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(floorTexture),transparent:true,depthWrite:false}));
  scene.add(mesh);return mesh;
});

const COUNT=600;
const cells=new THREE.InstancedMesh(new THREE.BoxGeometry(.073,.073,.073), new THREE.MeshStandardMaterial({color:0xffffff,roughness:.35,metalness:.5,emissive:0x15372f,emissiveIntensity:.6}),COUNT);
scene.add(cells);
const transform=new THREE.Object3D();
const activeColor=new THREE.Color('#62f5cf'), asleepColor=new THREE.Color('#27354c');
const constellation=[];
for(let index=0;index<COUNT;index++) {
  const row=Math.floor(index/30),column=index%30;
  constellation.push(new THREE.Vector3((column-14.5)*.22,(row-9.5)*.22,Math.sin(column*.6)*.18));
}

const sparkPositions=[];
for(let index=0;index<220;index++) {
  const value=Math.sin(index*127.1+43.7)*43758.5453;
  const fraction=value-Math.floor(value);
  sparkPositions.push((fraction-.5)*22, (Math.sin(index*14.7)*.5)*13, -5-(index%13));
}
const sparks=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(sparkPositions,3)), new THREE.PointsMaterial({color:0x8598c4,size:.018,transparent:true,opacity:.32,depthWrite:false}));
scene.add(sparks);

const lockup=new Image();lockup.src='./assets/brand-lockup-dark.png';
await Promise.all([lockup.decode(),document.fonts.load('700 100px Geist')]);

function morph(block, state) {
  const influence={brick:0,triangle:0,circle:0,sphere:0};
  influence[state.from]+=1-state.amount; influence[state.to]+=state.amount;
  block.userData.body.morphTargetInfluences[0]=influence.triangle;
  block.userData.body.morphTargetInfluences[1]=influence.circle;
  block.userData.body.morphTargetInfluences[2]=influence.sphere;
  // Lift the original mark onto the sphere's front, without burying it in the mesh.
  block.userData.sign.morphTargetInfluences[0]=influence.sphere;
  block.userData.sign.scale.setScalar(mix(1,.85,influence.triangle));
}
function text(value,x,y,size=80,color='#eff6ff',weight=650,align='left') {
  ink.font=`${weight} ${size}px Geist`;ink.fillStyle=color;ink.textAlign=align;ink.textBaseline='alphabetic';
  ink.fillText(value,x,y);
}
function tracked(value,x,y,size=18,spacing=5,color='#8aa5b8') {
  ink.font=`500 ${size}px Geist`;ink.fillStyle=color;ink.textAlign='left';
  for(const letter of value){ink.fillText(letter,x,y);x+=ink.measureText(letter).width+spacing;}
}
function title(lines,time,start,end,{x=142,y=444,size=100,accent=-1,eyebrow='',sub='',align='left',weight=680}={}) {
  const alpha=envelope(time,start,end,.65); if(alpha<=0)return;
  ink.save();ink.globalAlpha=alpha;ink.translate(0,24*(1-ramp(time,start,start+.85)));
  if(eyebrow)tracked(eyebrow,x,y-size*.9-28,16,4);
  lines.forEach((line,index)=>text(line,x,y+index*size*1.08,size,index===accent?'#80e7cf':'#f0f5ff',weight,align));
  if(sub)text(sub,x,y+lines.length*size*1.08+40,24,'#a0b1c7',400);
  ink.restore();
}
function line(x1,y1,x2,y2,alpha=.2,color='#86b6bc') {
  ink.strokeStyle=color;ink.globalAlpha*=alpha;ink.lineWidth=1;ink.beginPath();ink.moveTo(x1,y1);ink.lineTo(x2,y2);ink.stroke();ink.globalAlpha/=alpha;
}
function background(time) {
  ink.fillStyle='#03060c';ink.fillRect(0,0,1920,1080);
  const ambient=ink.createRadialGradient(1320,480,10,1320,480,1050);
  ambient.addColorStop(0,'#102231');ambient.addColorStop(.42,'#090f20');ambient.addColorStop(1,'#03060c');
  ink.fillStyle=ambient;ink.fillRect(0,0,1920,1080);
  // Studio cyclorama: a restrained horizon, with room for the object's contact pool.
  const pool=ink.createRadialGradient(1200,835,0,1200,835,820);
  pool.addColorStop(0,'rgba(36,112,123,.09)');pool.addColorStop(1,'rgba(0,0,0,0)');
  ink.fillStyle=pool;ink.fillRect(0,620,1920,460);
  ink.save();ink.globalAlpha=.3;line(100,950,1820,950,.3);ink.restore();
  tracked('IVUE  /  INFINITE VUE',110,94,15,3,'#7e91aa');
text(objectsVersion?'OBJECTS ARE BACK':'INFINITE BY DESIGN',1810,94,15,'#7e91aa',500,'right');
}

function objectAtmosphere(time) {
  const state=objectFlip(time);
  const colors={brick:[91,146,242],triangle:[255,176,104],sphere:[194,115,242]};
  const color=colors[state.from].map((channel,index)=>Math.round(mix(channel,colors[state.to][index],state.amount)));
  const pulse=Math.sin(state.amount*Math.PI);
  const glow=ink.createRadialGradient(960,555,20,960,555,510);
  glow.addColorStop(0,`rgba(${color},${.12+pulse*.12})`);
  glow.addColorStop(.5,`rgba(${color},.045)`);glow.addColorStop(1,`rgba(${color},0)`);
  ink.fillStyle=glow;ink.fillRect(0,0,1920,1080);
  ink.save();ink.translate(960,750);ink.scale(1,.19);
  for(let index=0;index<3;index++) {
    const radius=275+index*48+pulse*30;
    ink.strokeStyle=`rgba(${color},${.16-index*.035+pulse*.1})`;ink.lineWidth=2;
    ink.beginPath();ink.arc(0,0,radius,time*.25+index*2,time*.25+index*2+Math.PI*1.35);ink.stroke();
  }
  ink.restore();
  // A traveling highlight accents the quarter-turn's instant of transformation.
  ink.save();ink.globalAlpha=pulse*.5;ink.fillStyle=`rgb(${color})`;
  for(let index=0;index<18;index++) {
    const angle=index/18*Math.PI*2+time*.4;
    const radius=230+pulse*90;
    ink.beginPath();ink.arc(960+Math.cos(angle)*radius,550+Math.sin(angle)*radius*.65,1.7,0,Math.PI*2);ink.fill();
  }
  ink.restore();
}

function renderScene(time) {
  const filmTime=objectsVersion?18+time:time;
  const objectScene=objectsVersion||filmTime>=18&&filmTime<25;
  main.visible=true;main.scale.setScalar(1);main.rotation.set(0,0,0);main.position.set(2.45,0,0);
  morph(main,{from:'brick',to:'brick',amount:0});
  companions.forEach(block=>{block.visible=false;block.scale.setScalar(1);});
  layers.forEach(layer=>layer.visible=false);shadows.forEach(shadow=>shadow.visible=false);cells.visible=false;
  camera.position.set(0,0,10);camera.lookAt(0,0,0);
  porcelain.emissiveIntensity=.25;
  sparks.rotation.z=time*.002;
  if(objectScene) {
    if(objectsVersion) {
      const state=objectFlip(time);
      morph(main,state);
      // One persistent mesh: vertex positions change during the turn itself.
      main.userData.body.morphTargetInfluences.fill(0);
      const geometry=main.userData.body.geometry;
      const positions=geometry.attributes.position;
      const brick=brickGeometry.attributes.position,sphere=sphereGeometry.attributes.position;
      let bottom=0;
      for(let index=0;index<positions.count;index++) {
        const point=objectVertex(
          [brick.getX(index),brick.getY(index),brick.getZ(index)],
          [sphere.getX(index),sphere.getY(index),sphere.getZ(index)],state.stage,state.progress);
        positions.setXYZ(index,...point);bottom=Math.max(bottom,-point[1]);
      }
      positions.needsUpdate=true;
      geometry.computeVertexNormals();
      // Join the duplicate angular seam, including the sphere's smooth highlight.
      const normals=geometry.attributes.normal;
      for(let ring=0;ring<41;ring++) {
        const first=ring*97,last=first+96;
        const normal=new THREE.Vector3(normals.getX(first)+normals.getX(last),normals.getY(first)+normals.getY(last),normals.getZ(first)+normals.getZ(last)).normalize();
        normals.setXYZ(first,normal.x,normal.y,normal.z);normals.setXYZ(last,normal.x,normal.y,normal.z);
      }
      normals.needsUpdate=true;
      const palettes={brick:['#6366f1','#34d399'],triangle:['#ff8d66','#ffd17e'],sphere:['#b15bff','#f18bde']};
      const left=new THREE.Color(palettes[state.from][0]).lerp(new THREE.Color(palettes[state.to][0]),state.amount);
      const right=new THREE.Color(palettes[state.from][1]).lerp(new THREE.Color(palettes[state.to][1]),state.amount);
      const colors=geometry.attributes.color;
      const color=new THREE.Color();
      for(let index=0;index<colors.count;index++) {
        const x=positions.getX(index),y=positions.getY(index);
        color.copy(left).lerp(right,clamp((x-y+2.3)/4.6));
        colors.setXYZ(index,color.r,color.g,color.b);
      }
      colors.needsUpdate=true;
      const size=1.12*ramp(time,0,.65);
      main.position.set(0,-1.15+size*bottom+state.height*.08,0);
      main.scale.setScalar(size);
      main.rotation.set(0,0,0);
      main.userData.sign.rotation.z=0;
      const triangleWeight=state.from==='triangle'?1-state.amount:state.to==='triangle'?state.amount:0;
      main.userData.sign.position.y=-.25*triangleWeight;
      shadows[0].visible=true;shadows[0].position.set(0,-1.15,-.2);
      shadows[0].scale.setScalar(1.15+state.height*.3);
      shadows[0].material.opacity=1-state.height*.3;
    } else {
    const local=objectsVersion?time:filmTime-18;
    const reveal=objectsVersion?ramp(time,0,1):ramp(local,0,.8);
    const blocks=[companions[0],main,companions[1]];
    for(let index=0;index<3;index++) {
      const block=blocks[index],offset=[.8,0,1.6][index],motion=jump(local,offset);
      block.visible=true;
      const blockTime=local+offset;
      morph(block,shapeAt(blockTime));
      const scale=.77*reveal;
      block.scale.set(scale*(2-motion.squash),scale*motion.squash,scale);
      block.position.set((index-1)*2.55,-1.15+motion.height*.88,0);
      block.rotation.set(-.12+Math.sin(blockTime*1.8)*.12, Math.sin(blockTime*1.1)*.38, Math.sin(motion.airborne*Math.PI)*.12*(index%2?1:-1));
      shadows[index].visible=true;shadows[index].position.set(block.position.x,-2.02,-.1);
      shadows[index].scale.setScalar(1+motion.height*.3);
      shadows[index].material.opacity=1-motion.height*.25;
    }
    }
  } else if(filmTime<6) {
    const reveal=ramp(filmTime,.5,6);
    main.scale.setScalar(mix(3.2,1.4,reveal));
    main.rotation.set(mix(.7,.12,reveal),mix(-1.44,-.34,reveal),mix(-.3,-.1,reveal));
    main.position.set(mix(4.8,2.5,reveal),mix(-.8,0,reveal),0);
  } else if(filmTime<12) {
    main.scale.setScalar(1.42);
    main.rotation.set(.12+Math.sin(filmTime)*.04,-.35+Math.sin(filmTime*.45)*.2,-.08);
    main.position.y=Math.sin(filmTime*.7)*.1;
  } else if(filmTime<18) {
    const local=filmTime-12,open=envelope(local,.1,6,.8);
    main.rotation.set(.34,-.58,-.12);main.scale.setScalar(1.12);
    main.position.set(3.05,.35,0);
    layers.forEach((layer,index)=>{
      layer.visible=true;layer.rotation.copy(main.rotation);layer.scale.setScalar(1.12);
      layer.position.copy(main.position).add(new THREE.Vector3(-.26,-.32,-.13).multiplyScalar((index+1)*open));
      layer.material.opacity=.48*open;
    });
  } else if(filmTime<32) {
    const local=filmTime-25,spread=ramp(local,0,1.5);
    main.scale.setScalar(mix(1,.3,spread));main.position.set(2.6,1.5,0);main.rotation.set(.1,-.2,-.05);
    cells.visible=true;
    for(let index=0;index<COUNT;index++) {
      const point=constellation[index];
      transform.position.copy(point).multiplyScalar(spread*.83).add(new THREE.Vector3(2.65,-.35,-1.2));
      transform.rotation.set(.2,.3,.1);
      const distance=Math.hypot(point.x+.8,point.y-.25);
      const touched=local>1.2 && distance<(local-1.2)*.6 && distance>Math.max(0,(local-4)*.9);
      transform.scale.setScalar(touched?1.55:1);transform.updateMatrix();cells.setMatrixAt(index,transform.matrix);
      cells.setColorAt(index,touched?activeColor:asleepColor);
    }
    cells.instanceMatrix.needsUpdate=true;cells.instanceColor.needsUpdate=true;
  } else if(filmTime<39) {
    const local=filmTime-32;
    main.position.set(2.7,0,0);main.rotation.set(.15,-.35+local*.09,-.08);
    main.scale.setScalar(mix(1.45,.95,ramp(local,0,6)));
    for(let index=0;index<5;index++) {
      const layer=layers[index];layer.visible=local<2.2;layer.rotation.copy(main.rotation);
      const shrink=1-ramp(local,0,2.2);layer.scale.setScalar(1+index*.3*shrink);
      layer.position.copy(main.position);layer.position.z=-index*.18;layer.material.opacity=shrink*.3;
    }
  } else {
    const local=filmTime-39;
    const settle=ramp(local,0,2.5);
    main.position.set(mix(2.7,-1.27,settle),mix(0,.88,settle),0);
    main.rotation.set(.15*(1-settle), .28*(1-settle),-.08*(1-settle));
    main.scale.setScalar(mix(.95,.675,settle));
    main.visible=local<3.2;
  }
  renderer.render(scene,camera);
}

function draw(time) {
  time=Math.max(0,Math.min(duration,time));
  renderScene(time);
  ink.setTransform(WIDTH/1920,0,0,HEIGHT/1080,0,0);ink.globalAlpha=1;
  background(time);
  if(objectsVersion)objectAtmosphere(time);
  ink.globalAlpha=objectsVersion?1:1-ramp(time,41,42.2);
  ink.drawImage(renderer.domElement,0,0,1920,1080);ink.globalAlpha=1;
  if(objectsVersion) {
    title(['Objects are back.'],time,.1,12,{x:960,y:210,size:62,align:'center',weight:500});
    if(time>12) {
      const alpha=ramp(time,12,13);ink.globalAlpha=alpha;
      ink.drawImage(lockup,805,115,310,120);ink.globalAlpha=1;
      text('Plain classes. Full reactivity.',960,292,28,'#c4d3e4',450,'center');
    }
    ink.save();ink.globalAlpha=envelope(time,.6,15.8);
    tracked('NATIVE TYPESCRIPT OBJECTS',140,1005,15,3);
    text('ivue.dev',1780,1005,23,'#80e7cf',600,'right');ink.restore();
  } else {
    title(['What if scale','began with less?'],time,.4,6,{size:91,accent:1,eyebrow:'A SMALLER IDEA. A BIGGER WORLD.'});
    title(['Plain classes.','Full reactivity.'],time,6,12,{size:96,accent:1,eyebrow:'MEET IVUE',sub:'Native TypeScript. Powered by Vue 3.'});
    title(['Behavior.','Shared once.'],time,12,18,{size:99,accent:1,eyebrow:'THE PROTOTYPE CARRIES IT',sub:'Native inheritance. No proxy per instance.'});
    title(['One foundation. Different forms.'],time,18,25,{x:180,y:247,size:72,eyebrow:'YOUR OBJECTS. YOUR ARCHITECTURE.'});
    title(['State.','On first touch.'],time,25,32,{size:98,accent:1,eyebrow:'NOTHING PAID UNTIL FIRST ACCESS',sub:'Only the state you access comes alive.'});
    title(['Less machinery.','More possibility.'],time,32,35.8,{size:88,accent:1});
    title(['1.1 kB'],time,35.8,39.5,{y:536,size:180,eyebrow:'THE CORE · GZIPPED',sub:'Plain classes. Full Vue 3 reactivity.'});
    const finale=ramp(time,41,42.2);
    if(finale>0) {
      ink.save();ink.globalAlpha=finale;
      ink.drawImage(lockup,614,260,692,268);
      text('Infinite by design.',960,665,78,'#f1f6ff',650,'center');
      text('Build without the weight.',960,730,32,'#9cacc5',400,'center');
      ink.globalAlpha*=ramp(time,42.6,43.2);
      text('npm i ivue',960,844,28,'#8ae6d1',500,'center');
      text('ivue.dev',960,907,25,'#d2ddee',500,'center');
      ink.restore();
    }
    if(time<39) {
      ink.save();ink.globalAlpha=envelope(time,1,39);
      tracked('TYPESCRIPT  ×  VUE 3',110,1005,15,3);
      text('ivue.dev',1810,1005,20,'#96b8c2',500,'right');ink.restore();
    }
  }
  // Gentle opening / tail handles, not flashes. Keeps lettering readable through the final beat.
  const black=1-ramp(time,0,.55)+ramp(time,duration-.65,duration);
  ink.globalAlpha=clamp(black);ink.fillStyle='#03060c';ink.fillRect(0,0,1920,1080);ink.globalAlpha=1;
  return time;
}

const play=document.querySelector('#play'),seek=document.querySelector('#seek'),clock=document.querySelector('#clock');
seek.max=duration;
document.querySelector('#version').textContent=objectsVersion?'Full release film ↗':'Objects are back ↗';
document.querySelector('#version').href=objectsVersion?'./':'?version=objects';
const score=new Audio(`./output/${objectsVersion?'objects':'intro'}-soundtrack.wav`);score.preload='none';
let playing=false,position=0,origin=0,frame=0,soundReady=false;
const stamp=value=>`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`;
function display(time) { position=draw(time);seek.value=position;clock.textContent=`${stamp(position)} / ${stamp(duration)}`; }
function stop() { playing=false;cancelAnimationFrame(frame);score.pause();play.textContent='Play with sound'; }
function tick(now) {
  if(!playing)return;
  const next=soundReady&&!score.paused?score.currentTime:(now-origin)/1000;
  display(next);
  if(next>=duration-.01){stop();return;}
  frame=requestAnimationFrame(tick);
}
async function start() {
  if(position>=duration-.02)position=0;
  origin=performance.now()-position*1000;
  score.currentTime=position;
  try{await score.play();soundReady=true;}catch{soundReady=false;document.querySelector('#status').textContent='Silent preview. Render the soundtrack with node release-film/render.mjs --audio-only.';}
  playing=true;play.textContent='Pause';frame=requestAnimationFrame(tick);
}
play.addEventListener('click',()=>playing?stop():start());
document.querySelector('#restart').addEventListener('click',()=>{stop();display(0);start();});
seek.addEventListener('input',()=>{stop();score.currentTime=Number(seek.value);display(Number(seek.value));});
document.addEventListener('keydown',event=>{if(event.code==='Space'&&event.target===document.body){event.preventDefault();playing?stop():start();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',()=>{stop();renderer.dispose();environment.dispose();});
window.film={draw:display,duration,ready:true,version:objectsVersion?'objects':'intro',renderer:renderer.info};
if(exporting)display(0);
else {
  // A representative poster is visible, but playback begins at the actual opening.
  draw(objectsVersion?3.6:8);position=0;seek.value=0;
  clock.textContent=`0:00 / ${stamp(duration)}`;
}
document.querySelector('#status').textContent='Original 3D animation + original score. Press play to begin. Space pauses; the timeline scrubs. Motion starts only when requested.';
