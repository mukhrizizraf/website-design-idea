import http from 'node:http';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { normalizeLesson } from './public/model.js';

const root=dirname(fileURLToPath(import.meta.url));
export function createServer({token=process.env.DASHBOARD_TOKEN||'', dataDir=process.env.DATA_DIR||join(root,'data'),allowedOrigin=process.env.ALLOWED_ORIGIN||''}={}) {
  let queue=Promise.resolve();
  const db=join(dataDir,'lessons.json');
  const read=async()=>{try{return JSON.parse(await readFile(db,'utf8'));}catch(e){if(e.code==='ENOENT')return [];throw e;}};
  const authorized=req=>{const actual=Buffer.from(req.headers.authorization||'');const expected=Buffer.from(`Bearer ${token}`);return token.length>=24&&actual.length===expected.length&&timingSafeEqual(actual,expected);};
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    try {
      const url=new URL(req.url,'http://localhost');
      if(url.pathname.startsWith('/api/')){
        const origin=req.headers.origin;
        const ownOrigin=origin&&(()=>{try{return new URL(origin).host===req.headers.host;}catch{return false;}})();
        if(origin&&!ownOrigin&&origin!==allowedOrigin)return json(403,{error:'Origin not allowed. Set ALLOWED_ORIGIN to the exact dashboard origin.'});
        if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
        if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'});return res.end();}
        if(url.pathname==='/api/health')return json(200,{ok:true,bridgeEnabled:token.length>=24});
        if(url.pathname!=='/api/lessons')return json(404,{error:'Not found'});
        if(!authorized(req))return json(401,{error:'A connection token of at least 24 characters must be configured and supplied.'});
        if(req.method==='GET')return json(200,{lessons:await read()});
        if(req.method!=='POST')return json(405,{error:'Use GET or POST.'});
        if(!req.headers['content-type']?.includes('application/json'))return json(415,{error:'Send application/json.'});
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>1024*1024){json(413,{error:'Lesson must be under 1 MB.'});return;}chunks.push(chunk);}
        let lesson;try{lesson=normalizeLesson(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch(e){return json(400,{error:e.message});}
        const entry={...lesson,id:randomUUID(),createdAt:new Date().toISOString()};
        const save=queue.then(async()=>{const entries=await read();if(entries.length>=10000)throw new Error('Inbox capacity reached. Archive server data before adding more lessons.');entries.unshift(entry);await mkdir(dataDir,{recursive:true});await writeFile(db+'.tmp',JSON.stringify(entries,null,2),'utf8');await rename(db+'.tmp',db);});
        queue=save.catch(()=>{});await save;return json(201,{lesson:entry});
      }
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
      const files={'/':'index.html','/index.html':'index.html','/home.css':'home.css','/pop.css':'pop.css','/og.png':'og.png','/shelf.html':'shelf.html','/shelf.css':'shelf.css','/shelf.js':'shelf.js','/skills.js':'skills.js','/showcase.js':'showcase.js','/showcase.css':'showcase.css','/skill-shelf-icons.png':'skill-shelf-icons.png','/room.jpg':'room.jpg','/model.js':'model.js','/favicon.svg':'favicon.svg','/README.md':'../README.md'};
      const file=files[url.pathname];if(!file){res.writeHead(404);return res.end('Not found');}
      const bytes=await readFile(resolve(root,'public',file));const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',svg:'image/svg+xml',jpg:'image/jpeg',png:'image/png',md:'text/plain; charset=utf-8'};
      res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; media-src 'self' blob:; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
      res.writeHead(200,{'Content-Type':types[file.split('.').pop()]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);
    }catch(e){console.error('Request failed:',e.message);if(!res.headersSent)json(500,{error:'The server could not complete this request. Check storage availability and server logs.'});else res.end();}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1';
  createServer().listen(port,host,()=>{console.log(`AI LEARNING TOOLS dashboard: http://${host}:${port}`);console.log(process.env.DASHBOARD_TOKEN?.length>=24?'Lesson bridge enabled.':'Personal mode. Set DASHBOARD_TOKEN (24+ characters) to enable incoming lessons.');});
}
