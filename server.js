'use strict';
/* Cave Forge — เซิร์ฟเวอร์เดียวทำ 2 อย่าง
   1) เปิดหน้าเกม (ไฟล์ในโฟลเดอร์ public/)
   2) ห้องออนไลน์ที่ /ws: รับข้อความจากผู้เล่นในห้องแล้วส่งต่อให้อีกคนในห้องเดียวกัน
   เซิร์ฟเวอร์ไม่คำนวณเกมและไม่เก็บเซฟ — เจ้าของห้องคำนวณการต่อสู้ เซฟอยู่ในเบราว์เซอร์ของแต่ละคน */
const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer}=require('ws');
const PORT=process.env.PORT||3000,ROOT=path.join(__dirname,'public');
const MAX_PER_ROOM=2,MAX_MSG=16*1024;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json',
  '.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav'};

const server=http.createServer((req,res)=>{
  let p=decodeURIComponent((req.url||'/').split('?')[0]);
  if(p==='/health'){res.writeHead(200,{'content-type':'text/plain'});res.end('ok');return;}
  if(p==='/'||p==='')p='/index.html';
  const file=path.normalize(path.join(ROOT,p));
  if(!file.startsWith(ROOT)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,buf)=>{
    if(err){res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('ไม่พบไฟล์');return;}
    if(path.extname(file)==='.html')buf=Buffer.from(buf.toString('utf8').replace('<head>','<head><script>window.CF_WS=1</script>'),'utf8');   // บอกเกมว่ามีห้องออนไลน์ที่ /ws
    res.writeHead(200,{'content-type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','cache-control':'no-cache'});res.end(buf);});
});

const rooms=new Map();   // รหัสห้อง → Set ของผู้เล่น
const wss=new WebSocketServer({server,path:'/ws',maxPayload:MAX_MSG});
wss.on('connection',ws=>{
  ws.alive=true;ws.room=null;ws.pid=null;
  ws.on('pong',()=>{ws.alive=true;});
  ws.on('message',raw=>{
    let m;try{m=JSON.parse(raw.toString());}catch(e){return;}
    if(!m||typeof m.t!=='string')return;
    if(m.t==='hello'){                       // เข้าห้องด้วยรหัส 4 ตัว
      const code=String(m.room||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);if(!code)return;
      leaveRoom(ws);const set=rooms.get(code)||new Set();
      if(set.size>=MAX_PER_ROOM){ws.send(JSON.stringify({t:'full',from:'server'}));return;}
      set.add(ws);rooms.set(code,set);ws.room=code;return;}
    if(!ws.room)return;
    if(typeof m.from==='string')ws.pid=m.from;
    const out=JSON.stringify(m);
    for(const peer of rooms.get(ws.room)||[])if(peer!==ws&&peer.readyState===1)peer.send(out);
  });
  ws.on('close',()=>leaveRoom(ws));
  ws.on('error',()=>{});
});
function leaveRoom(ws){
  const set=ws.room&&rooms.get(ws.room);if(!set)return;set.delete(ws);
  if(ws.pid)for(const peer of set)if(peer.readyState===1)peer.send(JSON.stringify({t:'bye',from:ws.pid}));
  if(!set.size)rooms.delete(ws.room);ws.room=null;
}
// ตรวจการเชื่อมต่อค้างทุก 20 วิ (กันห้องผี และกันเซิร์ฟเวอร์คลาวด์ตัดการเชื่อมต่อที่เงียบ)
setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;try{ws.ping();}catch(e){}}},20000);

server.listen(PORT,()=>console.log(`Cave Forge พร้อมแล้ว → http://localhost:${PORT}  (ห้องออนไลน์ที่ /ws)`));
