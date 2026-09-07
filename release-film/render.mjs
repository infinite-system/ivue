import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { serve } from './serve.mjs';
import { writeScore } from './score.mjs';
import { DURATION,OBJECTS_DURATION,chapters } from './timeline.mjs';

const args=process.argv.slice(2);
const objects=args.includes('--objects');
const version=objects?'objects':'intro';
const duration=objects?OBJECTS_DURATION:DURATION;
const width=Number(args.find(arg=>arg.startsWith('--width='))?.split('=')[1]||1920);
const fps=Number(args.find(arg=>arg.startsWith('--fps='))?.split('=')[1]||30);
if(!Number.isInteger(width)||width<640||width%16!==0||![24,30,60].includes(fps))throw Error('Width must be >=640 and divisible by 16; fps must be 24,30,60.');
const output=fileURLToPath(new URL('./output/',import.meta.url));
await mkdir(output,{recursive:true});
const soundtrack=join(output,`${version}-soundtrack.wav`);
const audio=writeScore(soundtrack,duration,objects);
console.log(`Original score: ${soundtrack}`);
if(args.includes('--audio-only'))process.exit(0);
const server=await serve(0),port=server.address().port;
let browser,encoder;
const errors=[];
try {
  browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width,height:width*9/16},deviceScaleFactor:1,reducedMotion:'no-preference'});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?render&width=${width}${objects?'&version=objects':''}`);
  await page.waitForFunction(()=>window.film?.ready,{},{timeout:60000});
  const snapshots=objects?[1,2.1,2.4,2.7,3.6,5.1,5.6,5.9,6.2,7.4,10.2,14]:[3,8,14.5,19,21.5,28.5,34,37.5,44];
  for(const time of snapshots){
    await page.evaluate(time=>window.film.draw(time),time);
    await page.screenshot({path:join(output,`${version}-${String(time).replace('.','_')}.png`)});
  }
  if(args.includes('--stills')){console.log('Story frames rendered.');}
  else {
    const video=join(output,`ivue-${version}-${width===1920?'1080p':width+'w'}.mp4`);
    encoder=spawn('ffmpeg',['-hide_banner','-loglevel','warning','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-i',soundtrack,'-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-c:a','aac','-b:a','256k','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','48000','-movflags','+faststart','-t',String(duration),video],{stdio:['pipe','ignore','pipe']});
    let encoderError='';encoder.stderr.on('data',data=>{encoderError+=data;});
    const ended=once(encoder,'close');
    encoder.stdin.on('error',()=>{});
    const started=Date.now();
    for(let frame=0;frame<duration*fps;frame++){
      const data=await page.evaluate(time=>{window.film.draw(time);return document.querySelector('#type').toDataURL('image/jpeg',.96).split(',')[1];},frame/fps);
      if(encoder.exitCode!==null)throw Error(`Encoder exited early: ${encoderError}`);
      if(!encoder.stdin.write(Buffer.from(data,'base64')))await once(encoder.stdin,'drain');
      if(frame%(fps*2)===0)console.log(`${version}: ${(frame/fps).toFixed(0)} / ${duration}s · elapsed ${((Date.now()-started)/1000).toFixed(0)}s`);
    }
    encoder.stdin.end();
    const [code]=await ended;
    if(code!==0)throw Error(`Encoder failed: ${encoderError}`);
    console.log(`Rendered ${video}`);
  }
  if(errors.length)throw Error(`Browser errors: ${errors.join('\n')}`);
  await writeFile(join(output,`${version}-render.json`),JSON.stringify({version,width,height:width*9/16,fps,duration,audio,chapters:objects?undefined:chapters,browserErrors:errors,renderedAt:new Date().toISOString()},null,2));
} finally {
  if(encoder&&encoder.exitCode===null)encoder.kill('SIGTERM');
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
