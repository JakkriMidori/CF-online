'use strict';
/* ============================================================
   NET — ห้องออนไลน์ (โฮสต์เป็นผู้คำนวณการต่อสู้ทั้งหมด, เพื่อนส่งแค่ปุ่มที่กด และรับภาพสถานะกลับมาแสดง)
   ช่องทางส่งข้อความ: 1) ความสามารถ `room` ของ artifact (คนละเครื่อง)  2) BroadcastChannel (แท็บอื่นในเบราว์เซอร์เดียวกัน — ใช้ทดสอบ)
   ============================================================ */
const NET_LETTERS='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const VSKN1={R:['KeyD','ArrowRight'],L:['KeyA','ArrowLeft'],U:['KeyW','ArrowUp'],D:['KeyS','ArrowDown'],J:['KeyJ','Comma'],K:['KeyK','Period'],X:['Space','Slash'],B:['KeyE','Quote']};   // โฮสต์ใช้ได้ทั้ง WASD และลูกศร
const VSKN2={R:['NetR'],L:['NetL'],U:['NetU'],D:['NetD'],J:['NetJ'],K:['NetK'],X:['NetX'],B:['NetB']};                                                               // ปุ่มเสมือนของเพื่อน (มาจากเครือข่าย)
const NETBITS=[['R','NetR',1],['L','NetL',2],['U','NetU',4],['D','NetD',8],['J','NetJ',16],['K','NetK',32],['X','NetX',64],['S1','NetS1',128],['S2','NetS2',256],['S3','NetS3',512],['S4','NetS4',1024],['B','NetB',2048]];
const VSKN2_SK=[['NetS1'],['NetS2'],['NetS3'],['NetS4']];   // สกิลช่อง 1-4 ของเพื่อน (ส่งมาทางเครือข่าย)
const NETIN={R:['KeyD','ArrowRight'],L:['KeyA','ArrowLeft'],U:['KeyW','ArrowUp'],D:['KeyS','ArrowDown'],J:['KeyJ','Comma'],K:['KeyK','Period'],X:['Space','Slash'],B:['KeyE','Quote'],S1:['Digit1','Numpad1'],S2:['Digit2','Numpad2'],S3:['Digit3','Numpad3'],S4:['Digit4','Numpad4','KeyL']};
const MOVEMAPS={};
// หาท่าจากชื่อ ตามอาวุธและสกิลของนักสู้คนนั้น (ใช้ฝั่งเพื่อนตอนวาดภาพจาก snapshot)
function moveByName(n,f){if(!n)return null;const wt=(f&&f.wpn)||CONFIG.arena.weapon,sk=(f&&f.skillSet)||CONFIG.arena.skills,key=wt+'|'+sk.join(',');
  let M=MOVEMAPS[key];if(!M){M=MOVEMAPS[key]={};const W=WEAPONS[wt]||WEAPONS.sword;for(const m of[...W.light,W.heavy,...Object.values(UNI)])if(m&&m.n)M[m.n]=m;
    sk.forEach((id,i)=>{if(!id||!SKILLS[id])return;const m=Skills.move(id,wt,i);if(m&&m.n)M[m.n]=m;});for(const C of CMD_COMBOS)M[C.move.n]=C.move;}
  return M[n]||null;}
// เริ่มขอความสามารถ room ตั้งแต่โหลดหน้า (อาจใช้เวลาถึง ~10 วิ)
// ขอความสามารถ room แบบหน่วง: window.claude อาจถูกใส่เข้ามาหลังสคริปต์โหลดแล้ว จึงไม่ล็อกผลไว้ตอนโหลดหน้า
let ROOM_P=null,ROOM_DIAG='';
function roomCap(){if(ROOM_P)return ROOM_P;const c=typeof window!=='undefined'&&window.claude;
  if(c&&typeof c.use==='function')ROOM_P=c.use('room').then(r=>{if(!r)ROOM_DIAG='ระบบห้องไม่เปิดให้หน้านี้ (use=null)';return r||null;}).catch(e=>{ROOM_DIAG='ขอระบบห้องไม่ได้ ('+((e&&e.code)||e)+')';return null;});
  return ROOM_P;}
if(typeof window!=='undefined'){let n=0;const iv=setInterval(()=>{if(roomCap()||++n>60)clearInterval(iv);},250);}   // เริ่มขอไว้ล่วงหน้า
const SFX_HOOKS=['swing','hit','crit','block','parry','perfect','dodge','jump','land','ko','flash','fail'];
class NetCore{
  constructor(){this.id=Math.random().toString(36).slice(2,8);this.reset();}
  reset(){G.vsOther=null;this.ws=null;this.kind=null;this.room=null;this.bc=null;this.pres=null;this.seen={};this.qk=0;this.unsub=null;this.inK=0;this.tapK=0;this.taps=[];this.lastTap=0;this.evK=0;this.evRing=[];this.lastEv=0;this.snapK=0;this.role=null;this.code=null;this.lobby={phase:'menu',peer:false,err:''};this.rid=0;this.inBattle=false;this.lastRx=0;this.evq=[];this.tpAcc=0;this.lastM=-1;this.joinTimer=null;this.sfxOrig=null;}
  newCode(){let c='';for(let i=0;i<4;i++)c+=NET_LETTERS[Math.floor(Math.random()*NET_LETTERS.length)];return c;}
  now(){return typeof performance!=='undefined'?performance.now():Date.now();}
  label(){return this.kind==='ws'?'🌐 เชื่อมต่อเซิร์ฟเวอร์ Ray of Aether แล้ว — เล่นข้ามเครื่องได้':this.kind==='claude'?'🌐 เชื่อมต่อออนไลน์แล้ว — เล่นข้ามเครื่องได้':this.kind==='local'?'⚠ ต่อระบบออนไลน์ไม่ได้'+(this.why?' ('+this.why+')':'')+' — ตอนนี้เล่นได้แค่แท็บอื่นในเบราว์เซอร์เดียวกัน':'ยังไม่ได้เชื่อมต่อ';}
  /* เซิร์ฟเวอร์ของตัวเอง: เมื่อเกมถูกเปิดจากเซิร์ฟเวอร์ Cave Forge (ไม่ใช่ claude.ai) ใช้ WebSocket ที่ /ws ของโดเมนเดียวกัน */
  wsURL(){if(typeof window==='undefined'||!window.CF_WS||typeof location==='undefined'||!/^https?:$/.test(location.protocol))return null;   // CF_WS ใส่มาโดยเซิร์ฟเวอร์ Cave Forge เท่านั้น
    
    return (location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';}
  connectWS(code){const url=this.wsURL();if(!url||typeof WebSocket==='undefined')return Promise.resolve(false);
    return new Promise(res=>{let done=false;const fin=v=>{if(!done){done=true;res(v);}};let ws;
      try{ws=new WebSocket(url);}catch(e){fin(false);return;}
      const to=setTimeout(()=>{try{ws.close();}catch(e){}this.why='ต่อเซิร์ฟเวอร์ไม่ได้ (เซิร์ฟเวอร์ฟรีอาจกำลังตื่น รอสักครู่แล้วลองใหม่)';fin(false);},15000);
      ws.onopen=()=>{clearTimeout(to);ws.send(JSON.stringify({t:'hello',room:code}));this.ws=ws;this.kind='ws';fin(true);};
      ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch(x){return;}this.lastRx=this.now();this.rx(m);};
      ws.onclose=()=>{clearTimeout(to);if(this.ws===ws){this.ws=null;if(this.role)this.dropped('การเชื่อมต่อเซิร์ฟเวอร์ขาด');}fin(false);};
      ws.onerror=()=>{};});}
  async connect(code){
    this.code=code;let r=null;
    this.why='';
    if(this.wsURL()){if(await this.connectWS(code))return true;}
    for(let i=0;i<20&&!roomCap();i++)await new Promise(res=>setTimeout(res,250));   // รอ window.claude สูงสุด 5 วิ
    const P=roomCap();let timedOut=false;
    if(P){try{r=await Promise.race([P,new Promise(res=>setTimeout(()=>{timedOut=true;res(null);},10500))]);}catch(e){r=null;}}
    if(!r)this.why=!P?'ไม่พบ window.claude — เปิดเกมผ่าน claude.ai หรือไม่':timedOut?'ระบบห้องไม่ตอบใน 10 วิ':(ROOM_DIAG||'ระบบห้องไม่เปิดให้หน้านี้');
    if(r){try{this.room=await r.join('cf-'+code.toLowerCase());this.kind='claude';
        this.pres={id:this.id,q:[]};this.room.presence({cf:this.pres}).catch(()=>{});
        this.unsub=this.room.onPeers(ch=>this.onPeers(ch),e=>{if(this.kind==='claude'&&this.role)this.dropped('การเชื่อมต่อออนไลน์ขาด ('+e.code+')');});
        return true;}catch(e){this.room=null;this.why=({not_permitted:'บัญชีนี้ใช้ห้องออนไลน์ไม่ได้',not_granted:'บัญชีนี้ใช้ห้องออนไลน์ไม่ได้',limit_reached:'ห้องเต็ม ลองใหม่',upstream_error:'เซิร์ฟเวอร์ไม่ตอบ ลองใหม่'})[e&&e.code]||'เข้าห้องไม่ได้';}}
    if(typeof BroadcastChannel!=='undefined'){this.bc=new BroadcastChannel('cf-'+code);this.bc.onmessage=e=>this.rx(e.data);this.kind='local';return true;}
    return false;
  }
  tx(m){m.from=this.id;try{
    if(this.kind==='ws'&&this.ws){if(this.ws.readyState===1)this.ws.send(JSON.stringify(m));return;}
    if(this.kind==='claude'&&this.room){const P=this.pres;
      if(m.t==='snap')P.s=m;else if(m.t==='inp')P.i=m;else if(m.t==='lo'){P.lo=m.lo;P.lk=(P.lk||0)+1;}
      else{m.k=++this.qk;P.q.push(m);if(P.q.length>10)P.q.shift();}
      this.flush();}
    else if(this.bc)this.bc.postMessage(m);}catch(e){}}
  /* ส่ง presence ทั้งก้อน (ไม่เกิน 4 KiB) — ทุกคนที่เข้าห้องส่งได้ แม้สิทธิ์แค่ดู */
  flush(){const P=this.pres;let j=JSON.stringify({cf:P});
    while(j.length>3900&&P.s&&P.s.ev&&P.s.ev.length){P.s.ev.shift();j=JSON.stringify({cf:P});}
    while(j.length>3900&&P.q.length>2){P.q.shift();j=JSON.stringify({cf:P});}
    this.room.presence({cf:P}).catch(()=>{});}
  onPeers(ch){if(this.kind!=='claude')return;
    for(const p of[...ch.joined,...ch.updated]){if(p.sameTab)continue;const c=p.presence&&p.presence.cf;if(!c||!c.id||c.id===this.id)continue;
      const S=this.seen[c.id]||(this.seen[c.id]={q:0,i:-1,s:-1,lk:0,peer:p.peer});S.peer=p.peer;this.lastRx=this.now();
      if(c.lo&&c.lk!==S.lk){S.lk=c.lk;this.rx({t:'lo',lo:c.lo,from:c.id});}
      for(const m of c.q||[])if(m.k>S.q){S.q=m.k;this.rx(m);}
      if(c.i&&c.i.k!==S.i){S.i=c.i.k;this.rx(c.i);}
      if(c.s&&c.s.k!==S.s){S.s=c.s.k;this.rx(c.s);}}
    for(const p of ch.left){for(const id in this.seen)if(this.seen[id].peer===p.peer&&(id===this.peerId||id===this.hostId))this.rx({t:'bye',from:id});}}
  rx(m){if(m&&m.data&&!m.t)m=m.data;if(!m||!m.t||m.from===this.id)return;this.lastRx=this.now();
    switch(m.t){
      case'join':if(this.role!=='host')return;if(this.peerId&&this.peerId!==m.from){this.tx({t:'full'});return;}
        this.peerId=m.from;this.lobby.peer=true;this.lobby.peerName=m.name||'เพื่อน';this.tx({t:'welcome',to:m.from});this.refresh();break;
      case'welcome':if(this.role!=='guest'||m.to!==this.id)return;this.hostId=m.from;this.lobby.phase='joined';clearInterval(this.joinTimer);this.tx({t:'lo',lo:vsLoadout()});this.refresh();break;
      case'lo':if(!this.role||(m.from!==this.peerId&&m.from!==this.hostId))return;G.vsOther=m.lo;break;
      case'full':if(this.role==='guest'&&!this.hostId){this.lobby.err='ห้องนี้เต็มแล้ว';this.leave(true);}break;
      case'start':if(this.role!=='guest'||m.from!==this.hostId)return;this.rid=m.rid;this.startGuest();break;
      case'inp':if(this.role!=='host'||m.from!==this.peerId)return;for(const[,nm,bit]of NETBITS)keys[nm]=!!(m.m&bit);
        for(const[k,bits]of m.taps||[])if(k>this.lastTap){this.lastTap=k;for(const[,nm,bit]of NETBITS)if(bits&bit)pressed[nm]=true;}break;
      case'snap':if(this.role==='guest'&&m.from===this.hostId)this.applySnap(m);break;
      case'round':if(this.role!=='guest'||m.from!==this.hostId)return;this.rid=m.rid;setupVS(m.wins,m.round);break;
      case'end':if(this.role!=='guest'||m.from!==this.hostId)return;this.endBattle();UI.vsResult(m.w,m.wins,'guest');break;
      case'bye':if(m.from===this.peerId||m.from===this.hostId)this.peerLeft();break;
    }}
  refresh(){if(typeof UI!=='undefined'&&UI.cur==='room')UI.rerender();}
  async host(){const c=this.newCode();this.role='host';this.peerId=null;this.lobby={phase:'connecting',peer:false,err:''};this.refresh();const ok=await this.connect(c);if(!ok){this.lobby={phase:'menu',peer:false,err:'เชื่อมต่อระบบห้องไม่ได้'};this.role=null;this.refresh();return;}
    this.lobby={phase:'hosting',peer:false,err:''};this.refresh();}
  async join(code){code=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length!==4){this.lobby.err='รหัสต้องมี 4 ตัว';this.refresh();return;}
    this.role='guest';this.hostId=null;this.lobby={phase:'connecting',peer:false,err:''};this.refresh();const ok=await this.connect(code);if(!ok){this.lobby={phase:'menu',peer:false,err:'เชื่อมต่อระบบห้องไม่ได้'};this.role=null;this.refresh();return;}
    this.lobby={phase:'joining',peer:false,err:''};this.refresh();
    const ask=()=>this.tx({t:'join',name:'เพื่อน'});ask();let n=0;this.joinTimer=setInterval(()=>{if(this.hostId||++n>8){clearInterval(this.joinTimer);if(!this.hostId&&this.role==='guest'){this.lobby={phase:'menu',peer:false,err:'ไม่พบห้อง '+code+' (เจ้าของห้องต้องเปิดเกมค้างไว้)'};this.leave(true);}return;}ask();},1000);}
  leave(keepErr){const err=keepErr?this.lobby.err:'';try{this.tx({t:'bye'});}catch(e){}clearInterval(this.joinTimer);try{if(this.ws){const w=this.ws;this.ws=null;setTimeout(()=>{try{w.close();}catch(e){}},100);}if(this.bc)this.bc.close();if(this.unsub)this.unsub();if(this.room&&this.room.leave){this.room.presence({cf:null}).catch(()=>{});this.room.leave().catch(()=>{});}}catch(e){}
    this.unhookSfx();const wasBattle=this.inBattle;this.reset();this.lobby.err=err;this.refresh();return wasBattle;}
  peerLeft(){if(this.inBattle){this.endBattle();toast('🔌 เพื่อนออกจากห้องแล้ว',3000);G.mode='explore';this.lobby={phase:'menu',peer:false,err:''};this.role=null;this.leave();}else{this.lobby.peer=false;this.peerId=null;this.refresh();}}
  onUIClose(){if(this.role&&!this.inBattle)this.leave();}
  /* ---- เริ่มการต่อสู้ ---- */
  beginHost(){if(this.role!=='host'||!this.lobby.peer)return;this.rid++;this.tx({t:'lo',lo:vsLoadout()});this.tx({t:'start',rid:this.rid});G.vsNet='host';this.inBattle=true;this.hookSfx();startVS();}
  startGuest(){G.vsNet='guest';this.inBattle=true;this.tx({t:'lo',lo:vsLoadout()});UI.close();G.vsPending=true;G.mode='trans';G.tt=0;}
  endBattle(){this.inBattle=false;this.unhookSfx();G.vsNet=null;wrap.classList.remove('battle','vs');BT=null;}
  /* ---- โฮสต์: เก็บเสียง/เอฟเฟกต์ส่งให้เพื่อน ---- */
  hookSfx(){if(this.sfxOrig)return;this.sfxOrig={};for(const n of SFX_HOOKS){const o=SFX[n];if(typeof o!=='function')continue;this.sfxOrig[n]=o;SFX[n]=(...a)=>{o(...a);this.evq.push({e:'s',n,a});};}}
  unhookSfx(){if(!this.sfxOrig)return;for(const n in this.sfxOrig)SFX[n]=this.sfxOrig[n];this.sfxOrig=null;}
  snap(){const b=BT,F=f=>({x:+f.x.toFixed(1),y:+f.y.toFixed(1),vy:+f.vy.toFixed(2),d:f.dir,s:f.state,ph:f.phase,pt:f.pt,h:Math.round(f.hp*10)/10,sta:Math.round(f.sta),iv:f.invuln,fl:f.flash,og:f.onGround?1:0,w:f.walkT,gc:f.gc?1:0,dh:f.didHit?1:0,mv:f.move?f.move.n:null,ms:f.moveSeq});
    for(const n of b.nums)if(!n._s){n._s=1;this.evq.push({e:'n',x:Math.round(n.x),y:Math.round(n.y),t:n.txt,c:n.col,z:n.size});}
    for(const u of b.bursts)if(!u._s){u._s=1;this.evq.push({e:'b',x:Math.round(u.x),y:Math.round(u.y),c:u.col,g:u.big?1:0});}
    for(const u of b.bolts)if(!u._s){u._s=1;this.evq.push({e:'z',x:Math.round(u.x),t:u.t});}
    for(const ev of this.evq.splice(0)){ev.k=++this.evK;this.evRing.push(ev);}if(this.evRing.length>14)this.evRing.splice(0,this.evRing.length-14);
    if(b.fullCombo&&!b.fullCombo._s){b.fullCombo._s=1;this.evq.push({e:'fc',n:b.fullCombo.n});}
    return{t:'snap',rid:this.rid,p:F(b.p),e:F(b.e),tm:b.time,it:b.intro,en:b.end,sh:+b.shake.toFixed(1),hs:b.hitstop,wh:b.white,ms:b.msg,rs:b.result,
      cb:{n:b.comboShow,w:b.comboWho===b.e?1:0,t:b.comboT},k:++this.snapK,ev:this.evRing.slice(),
      pj:b.proj.map(q=>[Math.round(q.x),Math.round(q.y),q.r,q.col,q.vx>0?1:-1,q.rock?1:0])};}
  hostTick(){if(!BT||!BT.vs||this.role!=='host')return;
    if(this.now()-this.lastRx>6000&&this.lastRx){this.dropped('เพื่อนหลุดการเชื่อมต่อ');return;}
    if(G.t%2===0)this.tx(this.snap());}
  dropped(msg){this.endBattle();G.mode='explore';toast('🔌 '+msg,4000);this.leave();}
  /* ---- เพื่อน: ส่งปุ่มที่กด / รับสถานะ ---- */
  guestInput(){let m=0,tp=0;for(const[k,,bit]of NETBITS){if(down(...NETIN[k]))m|=bit;if(tap(...NETIN[k]))tp|=bit;}
    if(tp){this.taps.push([++this.tapK,tp]);if(this.taps.length>8)this.taps.shift();}   // ปุ่มที่แตะ เก็บย้อนหลัง 8 ครั้ง กันหล่นระหว่างทาง
    if(m!==this.lastM||tp||G.t%10===0){this.tx({t:'inp',m,k:++this.inK,taps:this.taps.slice()});this.lastM=m;}}
  applySnap(s){if(!BT||!BT.vs||s.rid!==this.rid)return;this.pend=s;}
  guestStep(){const b=BT,s=this.pend;
    if(this.now()-this.lastRx>6000&&this.lastRx){this.dropped('เจ้าของห้องหลุดการเชื่อมต่อ');return;}
    this.guestInput();
    if(s){this.pend=null;
      for(const[f,d]of[[b.p,s.p],[b.e,s.e]]){const far=Math.abs(d.x-f.x)>60;f.tx=d.x;if(far)f.x=d.x;f.y=d.y;f.vy=d.vy;f.dir=d.d;f.state=d.s;f.phase=d.ph;f.pt=d.pt;f.hp=d.h;f.sta=d.sta;f.invuln=d.iv;f.flash=d.fl;f.onGround=!!d.og;f.walkT=d.w;f.gc=!!d.gc;f.didHit=!!d.dh;f.move=moveByName(d.mv,f);f.moveSeq=d.ms;}
      b.time=s.tm;b.intro=s.it;b.end=s.en;b.msg=s.ms;b.result=s.rs;b.comboT=s.cb.t;b.comboShow=s.cb.n;b.comboWho=s.cb.w?b.e:b.p;if(s.sh>b.shake)b.shake=s.sh;b.hitstop=s.hs;if(s.wh>b.white)b.white=s.wh;
      b.proj=(s.pj||[]).map(a=>({x:a[0],y:a[1],r:a[2],col:a[3],vx:a[4],rock:a[5],life:2,o:null}));
      for(const ev of s.ev){if(ev.k&&ev.k<=this.lastEv)continue;if(ev.k)this.lastEv=ev.k;if(ev.e==='z')b.bolts.push({x:ev.x,t:ev.t||14});else if(ev.e==='n')b.nums.push({x:ev.x,y:ev.y,txt:ev.t,col:ev.c,size:ev.z,t:55});
        else if(ev.e==='b'){b.bursts.push({x:ev.x,y:ev.y,t:0,col:ev.c,big:ev.g});sparks(ev.x,ev.y,ev.c,ev.g?20:10);}
        else if(ev.e==='fc')b.fullCombo={n:ev.n,t:90};
        else if(ev.e==='s'&&SFX[ev.n])SFX[ev.n](...ev.a);}}
    for(const f of[b.p,b.e]){if(f.tx!==undefined)f.x+=(f.tx-f.x)*.55;f.dhp+=(f.hp-f.dhp)*.05;
      if(['dash','backdash','dodge'].includes(f.state)||(f.state==='attack'&&f.move&&(f.move.lunge))){if(G.t%2===0){f.trail.push({x:f.x,y:f.y,P:f.rig?poseFor(f):null});if(f.trail.length>4)f.trail.shift();}}else if(f.trail.length&&G.t%2===0)f.trail.shift();}
    for(const n of b.nums){n.t--;n.y-=.5;}b.nums=b.nums.filter(n=>n.t>0);for(const u of b.bursts)u.t++;b.bursts=b.bursts.filter(u=>u.t<14);for(const u of b.bolts)u.t--;b.bolts=b.bolts.filter(u=>u.t>0);
    if(b.white>0)b.white--;if(b.fullCombo&&--b.fullCombo.t<=0)b.fullCombo=null;if(b.shake>0){b.shake*=.85;if(b.shake<.3)b.shake=0;}
    for(const q of b.parts){q.x+=q.vx;q.y+=q.vy;if(q.grav)q.vy+=.15;q.l--;}b.parts=b.parts.filter(q=>q.l>0);if(b.comboT>0)b.comboT--;}
}
const Net=new NetCore();
