import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DURATION,OBJECTS_DURATION,chapters,jump,shapeAt,envelope,ramp,objectFlip } from './timeline.mjs';
import { objectVertex,pinchTop } from './object-morph.mjs';

test('chapters cover the whole release film with no gaps or overlaps',()=>{
  assert.equal(chapters[0].start,0);
  for(let index=1;index<chapters.length;index++)assert.equal(chapters[index].start,chapters[index-1].end);
  assert.equal(chapters.at(-1).end,DURATION);
  assert.equal(DURATION*30,1440);
  assert.equal(OBJECTS_DURATION*30,480);
});
test('a jump rises, lands on the ground, compresses, and repeats',()=>{
  assert.equal(jump(0).height,0);
  assert.ok(jump(1.13).height>1.44);
  assert.equal(jump(1.94).height,0);
  assert.ok(jump(1.94).squash<.85);
  assert.ok(Math.abs(jump(1.1).height-jump(3.5).height)<1e-12);
});
test('shape changes complete during flight and cycle through all three objects',()=>{
  assert.deepEqual(shapeAt(0),{from:'brick',to:'triangle',amount:0});
  assert.equal(shapeAt(1.5).amount,1);
  assert.equal(shapeAt(2.5).from,'triangle');
  assert.equal(shapeAt(5).from,'circle');
  assert.equal(shapeAt(7.3).from,'brick');
  for(let time=0;time<48;time+=1/30){
    const state=shapeAt(time),motion=jump(time);
    assert.ok(Number.isFinite(motion.height)&&motion.height>=0);
    assert.ok(state.amount>=0&&state.amount<=1);
    if(state.amount>0&&state.amount<1)assert.ok(motion.height>0,'morphing occurs above the floor');
  }
});
test('title envelopes have bounded fades and never linger outside their cue',()=>{
  assert.equal(envelope(5,6,12),0);assert.equal(envelope(13,6,12),0);
  assert.equal(envelope(8,6,12),1);
  assert.equal(ramp(-1,0,1),0);assert.equal(ramp(2,0,1),1);
});
test('the release film preserves both official brand assets byte for byte',()=>{
  for(const asset of ['logo.svg','brand-lockup-dark.png']){
    assert.deepEqual(readFileSync(new URL(`./assets/${asset}`,import.meta.url)),readFileSync(new URL(`../docs_v2/public/${asset}`,import.meta.url)));
  }
});

test('objects flip clockwise through triangle and sphere, then hold the original brick',()=>{
  assert.equal(objectFlip(0).from,'brick');
  assert.equal(objectFlip(3.4).to,'triangle');
  assert.equal(objectFlip(7).to,'sphere');
  assert.equal(objectFlip(12).to,'brick');assert.equal(objectFlip(12).amount,1);
  let previous=0;
  for(let time=0;time<16;time+=1/30){
    const state=objectFlip(time);
    assert.ok(state.rotation<=previous+1e-10);previous=state.rotation;
    if(state.amount>0&&state.amount<1)assert.ok(state.height>0);
  }
  assert.ok(Math.abs(objectFlip(15).rotation+5*Math.PI/3)<1e-12);
  for(const start of [1.5,5,8.5]) {
    const halfway=objectFlip(start+.9);
    assert.ok(Math.abs(halfway.amount-.5)<1e-12,'deformation and turning share the same progress');
    assert.equal(objectFlip(start+1.8).amount,1);
  }
  assert.ok(Math.abs(objectFlip(3.3).rotation+Math.PI/2)<1e-12);
  assert.ok(Math.abs(objectFlip(6.8).rotation-objectFlip(5).rotation+2*Math.PI/3)<1e-12,'triangle rolls over one 120-degree side');
});

test('pinching the top keeps every lower-edge point and rounds the tip',()=>{
  for(const amount of [0,.25,.5,.75,1])for(const x of [-1,-.5,0,.5,1]) {
    assert.deepEqual(pinchTop([x,-1,.27],amount),[x,-1,.27]);
  }
  assert.ok(Math.abs(pinchTop([1,1,.27],1)[0]-.08)<1e-12);
  assert.equal(pinchTop([1,0,.27],.5)[0],.77);
});

test('one mesh is continuous at both morph boundaries and returns exactly to the brick',()=>{
  const brick=[.8,-.4,.27],sphere=[.6,-.3,.87];
  for(const stage of [0,1]) {
    const end=objectVertex(brick,sphere,stage,1),next=objectVertex(brick,sphere,stage+1,0);
    end.forEach((value,index)=>assert.ok(Math.abs(value-next[index])<1e-12));
  }
  assert.deepEqual(objectVertex(brick,sphere,0,0),brick);
  assert.deepEqual(objectVertex(brick,sphere,2,1),brick);
});
