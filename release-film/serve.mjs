import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function serve(port = 5198) {
  const root=fileURLToPath(new URL('.',import.meta.url));
  const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.mp4':'video/mp4'};
  const server=createServer(async(request,response)=>{
    try {
      const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      const file=resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
      if(!file.startsWith(root.endsWith(sep)?root:root+sep)){response.writeHead(403);response.end();return;}
      const body=await readFile(file);
      response.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});response.end(body);
    } catch { response.writeHead(404);response.end('Not found'); }
  });
  await new Promise((accept,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',accept);});
  return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const port=Number(process.argv[2]||5198);
  await serve(port);console.log(`Release film: http://127.0.0.1:${port}`);
}
