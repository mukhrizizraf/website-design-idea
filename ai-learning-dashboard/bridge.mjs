// A dependency-free MCP stdio adapter. Configure in a local MCP-capable client.
import { createInterface } from 'node:readline';
import { categories, normalizeLesson } from './public/model.js';
const server=(process.env.DASHBOARD_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const token=process.env.DASHBOARD_TOKEN||'';
const schema={type:'object',properties:{title:{type:'string'},category:{type:'string',enum:categories},source:{type:'string'},sourceUrl:{type:'string'},summary:{type:'string'},takeaways:{type:'array',items:{type:'string'}},actions:{type:'array',items:{type:'string'}},transcript:{type:'string'}},required:['title','category','summary'],additionalProperties:false};
const send=data=>process.stdout.write(JSON.stringify(data)+'\n');
const input=createInterface({input:process.stdin,crlfDelay:Infinity});
for await (const line of input){
  if(!line.trim())continue;let m;
  try{m=JSON.parse(line);}catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});continue;}
  if(m.id===undefined)continue;
  try{
    let result;
    if(m.method==='initialize')result={protocolVersion:['2024-11-05','2025-03-26','2025-06-18','2025-11-25'].includes(m.params?.protocolVersion)?m.params.protocolVersion:'2025-11-25',capabilities:{tools:{}},serverInfo:{name:'practice-lessons',version:'1.0.0'}};
    else if(m.method==='ping')result={};
    else if(m.method==='tools/list')result={tools:[{name:'save_lesson',description:'Save a learning lesson to the user’s AI LEARNING TOOLS dashboard. Only use after the user requests saving. Summarize only video/transcript content actually available to you; never guess inaccessible video content.',inputSchema:schema,annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true}}]};
    else if(m.method==='tools/call'){
      try{if(m.params?.name!=='save_lesson')throw Error('Unknown tool');if(token.length<24)throw Error('Configure DASHBOARD_TOKEN in the MCP client (at least 24 characters).');const url=new URL(server);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw Error('Use HTTPS for a remote dashboard.');const lesson=normalizeLesson(m.params.arguments);const response=await fetch(server+'/api/lessons',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(lesson),signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw Error(data.error||`Server returned ${response.status}`);result={content:[{type:'text',text:JSON.stringify({saved:true,id:data.lesson.id,title:data.lesson.title})}]};}catch(e){result={isError:true,content:[{type:'text',text:e.message}]};}
    }else{send({jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'Method not found'}});continue;}
    send({jsonrpc:'2.0',id:m.id,result});
  }catch(e){send({jsonrpc:'2.0',id:m.id,error:{code:-32603,message:e.message}});}
}
