import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DURATION,OBJECTS_DURATION,chapters,jump,shapeAt,envelope,ramp } from './timeline.mjs';

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
