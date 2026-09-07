import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync,writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const report={media:[],preview:[]};
for(const [version,duration,frames] of [['intro',48,1440],['objects',16,480]]) {
  const file=fileURLToPath(new URL(`./output/ivue-${version}-1080p.mp4`,import.meta.url));
  const metadata=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
  const video=metadata.streams.find(stream=>stream.codec_type==='video'),audio=metadata.streams.find(stream=>stream.codec_type==='audio');
  assert.equal(video.width,1920);assert.equal(video.height,1080);assert.equal(video.codec_name,'h264');
  assert.equal(video.pix_fmt,'yuv420p');assert.equal(video.avg_frame_rate,'30/1');assert.equal(Number(video.nb_read_frames),frames);
  assert.ok(Math.abs(Number(metadata.format.duration)-duration)<.1);
  assert.equal(audio.codec_name,'aac');assert.equal(audio.channels,2);assert.equal(Number(audio.sample_rate),48000);
  const rendered=JSON.parse(readFileSync(new URL(`./output/${version}-render.json`,import.meta.url)));
  assert.deepEqual(rendered.browserErrors,[]);
  execFileSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{stdio:'pipe'});
  report.media.push({version,duration,frames,width:video.width,height:video.height,codec:video.codec_name,bytes:Number(metadata.format.size),decode:'passed'});
}
const server=await serve(0),port=server.address().port;
let browser;
try {
  browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
  for(const [version,width,height] of [['intro',1280,800],['objects',375,812]]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    const errors=[],requests=[];page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>requests.push(request.url()));
    await page.goto(`http://127.0.0.1:${port}/?width=640${version==='objects'?'&version=objects':''}`);
    await page.waitForFunction(()=>window.film?.ready);
    const initial=await page.locator('#seek').inputValue();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('#seek').inputValue(),initial,'preview must not autoplay');
    await page.locator('#seek').evaluate(element=>{element.value='5';element.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.equal(await page.locator('#seek').inputValue(),'5');
    const deterministic=await page.evaluate(()=>{
      window.film.draw(3.3);const first=document.querySelector('#type').toDataURL();
      window.film.draw(10);window.film.draw(3.3);return first===document.querySelector('#type').toDataURL();
    });
    assert.ok(deterministic,'scrubbing cannot alter frame content');
    await page.locator('#play').click();
    await page.waitForFunction(()=>document.querySelector('#play').textContent==='Pause');
    await page.waitForTimeout(600);
    assert.ok(Number(await page.locator('#seek').inputValue())>3.3,'play must advance time');
    await page.locator('#play').click();
    assert.equal(await page.locator('#play').textContent(),'Play with sound');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
    assert.deepEqual(errors,[]);
    assert.ok(requests.every(url=>url.startsWith(`http://127.0.0.1:${port}/`)),'preview is offline-capable');
    report.preview.push({version,width,height,noAutoplay:true,scrub:true,deterministic:true,playPause:true,overflow:false,browserErrors:errors,externalRequests:0});
    await page.close();
  }
} finally {
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
writeFileSync(new URL('./output/verification.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
