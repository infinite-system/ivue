import { writeFileSync } from 'node:fs';

// An original, deterministic score. Every oscillator, envelope and echo is local.
// No sampled recordings, third-party music, voice model, or licensing dependency.
export function writeScore(path,duration,objects=false) {
  const rate=48000,length=Math.round(duration*rate);
  const left=new Float32Array(length),right=new Float32Array(length);
  const tau=Math.PI*2;
  let seed=74191;
  function noise(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;}
  function add(start,seconds,sample,pan=0) {
    const first=Math.max(0,Math.floor(start*rate)),last=Math.min(length,Math.floor((start+seconds)*rate));
    const l=Math.sqrt((1-pan)/2),r=Math.sqrt((1+pan)/2);
    for(let index=first;index<last;index++){
      const value=sample((index-first)/rate,seconds);
      left[index]+=value*l;right[index]+=value*r;
    }
  }
  function bell(start,frequency,volume=.12,pan=0) {
    add(start,3,(time)=>volume*(1-Math.exp(-time*200))*Math.exp(-time*2.2)*(
      Math.sin(tau*frequency*time)+.28*Math.sin(tau*frequency*2.003*time)*Math.exp(-time*5)+.08*Math.sin(tau*frequency*4.01*time)*Math.exp(-time*12)),pan);
  }
  function impact(start,volume=.35) {
    add(start,1.8,time=>volume*(1-Math.exp(-time*250))*Math.exp(-time*4)*Math.sin(tau*(42*time+42*(1-Math.exp(-time*12))/12)));
    add(start,.3,time=>noise()*.035*Math.exp(-time*30));
  }
  const chords=[[55,82.4069,110,164.8138],[43.6535,65.4064,110,130.8128],[65.4064,98,130.8128,196],[48.9994,73.4162,123.4708,146.8324]];
  for(let bar=0;bar<Math.ceil(duration/4.8);bar++) {
    const start=bar*4.8;
    for(let voice=0;voice<4;voice++) {
      const frequency=chords[bar%4][voice];
      add(start,6.4,(time,span)=>{
        const envelope=Math.min(1,time/1.6)*Math.min(1,(span-time)/2.4);
        return envelope*.043*(Math.sin(tau*frequency*time)+.35*Math.sin(tau*(frequency*1.002)*time)+.16*Math.sin(tau*frequency*2*time));
      },(voice-1.5)*.35);
    }
  }
  for(let beat=0;beat<duration/.6;beat++) {
    const start=beat*.6;
    const frequencies=[220,329.6276,440,493.8833,659.2551,440,329.6276,293.6648];
    const active=objects||start>12;
    if(active)bell(start,frequencies[beat%8],objects?.08:.045+(start>25&&start<39?.035:0),Math.sin(beat*1.7)*.65);
    if((objects||start>=18&&start<39)&&beat%2===0) {
      impact(start,.10);
      add(start+.3,.1,time=>noise()*.022*Math.exp(-time*48),beat%4===0?-.5:.5);
    }
  }
  const accents=objects?[.5,2.4,4.8,7.2,9.6,12]:[.4,6,12,18,25,32,35.8,41.5];
  for(const start of accents) {
    impact(start,.3);bell(start+.07,659.255,.13,-.4);bell(start+.12,987.767,.07,.4);
    if(start>2)add(start-1.5,1.5,(time,span)=>{
      const envelope=Math.pow(time/span,3)*.045;
      return envelope*(noise()*.55+Math.sin(tau*(120*time+160*time*time))*.45);
    });
  }
  if(objects)for(const landing of [3.3,6.8,10.3])impact(landing,.28);
  // Cross-channel delay creates a spacious tail without opaque reverb assets.
  for(const [seconds,gain] of [[.225,.17],[.45,.11],[.9,.07]]) {
    const delay=Math.round(seconds*rate);
    for(let index=length-1;index>=delay;index--){left[index]+=right[index-delay]*gain;right[index]+=left[index-delay]*gain;}
  }
  let peak=0;
  for(let index=0;index<length;index++) {
    const time=index/rate,fade=Math.min(1,time/.25,(duration-time)/1.5);
    left[index]*=fade;right[index]*=fade;peak=Math.max(peak,Math.abs(left[index]),Math.abs(right[index]));
  }
  const gain=.88/Math.max(.01,peak),pcm=Buffer.alloc(44+length*4);
  pcm.write('RIFF',0);pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(2,22);pcm.writeUInt32LE(rate,24);pcm.writeUInt32LE(rate*4,28);pcm.writeUInt16LE(4,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(length*4,40);
  for(let index=0;index<length;index++){
    pcm.writeInt16LE(Math.round(left[index]*gain*32767),44+index*4);
    pcm.writeInt16LE(Math.round(right[index]*gain*32767),46+index*4);
  }
  writeFileSync(path,pcm);
  return {duration,rate,channels:2,peak:.88};
}
