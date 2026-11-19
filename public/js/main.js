'use strict';
/* ============================================================
   MAIN — game modes and loop
   ============================================================ */
function newGame(talent){
  Object.assign(G,{diff:CONFIG.diffLock||UI.diffSel||'normal',bloodstain:null,talent,level:1,xp:0,points:0,alloc:{str:0,agi:0,int:0,vit:0,luk:0},bag:[],mats:{potion:2,mp_s:3},gold:30,ult:0,mpAcc:0,potCD:0,known:new Set(),found:new Set(),mastery:{},ency:{},flags:{},uid:1,visited:{}});
  for(const s of SLOTS)G.eq[s]=null;
  Skills.init(talent);Quest.init();
  const a=Inv.addItem(newItem('a_cloth','normal',1)),p=Inv.addItem(newItem('p_cloth','normal',1));Equip.equip(a);Equip.equip(p);
  CAVE=makeCave();TOWN=makeTown();loadZone(TOWN);G.lootLog=[];G.pity={};const S=StatSync.invalidate('new')||Stats.player();G.hp=S.maxHP;G.mp=S.maxMP;
  UI.creating=0;UI.close();G.mode='explore';UI.hud();
  UI.sk.sel=2;UI.sk.modal=null;UI.open('skills');
  setTimeout(()=>toast(`${Diff.cur().ic} ${Diff.cur().n} · ${TALENTS[talent].ic} ${TALENTS[talent].n} — ผนึกสกิลเฉพาะตัวของคุณในช่อง 3 ก่อนออกผจญภัย`,3500),300);
}
function startFromTitle(cont){
  initAudio();$('#title').classList.add('hidden');StatSync.reset();StatSync.start();   // ตัวจับเวลา 5 วิ ตัวเดียว
  if(cont&&Save.load()){G.miniOff=true;G.mode='explore';UI.hud();toast('📂 โหลดเกมที่บันทึกไว้');return;}
  UI.creating=1;G.look=Object.assign({},DEFLOOK);UI.open('create');
}
let newArmed=false;
function renderTitle(){
  const d=Save.peek(),has=!!d&&!!d.v;
  $('#contBtn').classList.toggle('hidden',!has);$('#delBtn').classList.toggle('hidden',!has);
  $('#saveCard').classList.toggle('hidden',!has);
  $('#newBtn').textContent=newArmed?'กดอีกครั้งเพื่อเขียนทับเซฟ':(has?'เริ่มเกมใหม่':'เริ่มเกมใหม่');
  if(has){
    const zone=d.world&&d.world.zone==='town'?'เมือง Collawarrie':'ถ้ำชีส';
    const diff=(DIFFICULTY[d.diff]||{n:'ปกติ'}).n;const tal=(TALENTS[d.talent]||{n:'-'}).n;
    const when=d.savedAt?new Date(d.savedAt).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}):'-';
    const nm=(d.look&&d.look.name)||'ไม่มีชื่อ';
    $('#saveInfo').innerHTML=`<b>${nm}</b> · Lv.${d.level} · ${tal}<br>ความยาก: ${diff} · ${zone}<br><span class="dim">บันทึกเมื่อ ${when}</span>`;
  }
  $('#title').classList.contains('hidden')||$('#contBtn').focus();
}
$('#contBtn').onclick=()=>{if(Save.exists())startFromTitle(true);};
$('#newBtn').onclick=()=>{
  if(Save.exists()&&!newArmed){newArmed=true;renderTitle();return;}
  newArmed=false;startFromTitle(false);renderTitle();};
$('#delBtn').onclick=()=>{
  if(!newArmed){newArmed=true;$('#delBtn').textContent='กดอีกครั้งเพื่อลบ';return;}
  try{localStorage.removeItem(SAVE_KEY);}catch(e){}newArmed=false;$('#delBtn').textContent='ลบเซฟ';renderTitle();toast('🗑️ ลบเซฟแล้ว');};
renderTitle();
ov.addEventListener('click',e=>{if(e.target===ov&&UI.cur!=='talent')UI.close();});

const menuKeys=()=>({[KB.equip]:'equip',[KB.char]:'char',[KB.skills]:'skills',[KB.quests]:'quests',[KB.map]:'map',[KB.ency]:'ency',Backquote:'debug'});   // ทางลัดเมนู (ปรับได้จากปุ่มควบคุม)
function update(){
  if((G.mode==='explore'||G.mode==='battle')&&tap('KeyV')){FX.on=!FX.on;try{localStorage.setItem('cf_fx',FX.on?'1':'0');}catch(e){}toast(FX.on?'✨ ภาพ HD-2D: เปิด (กด V ปิด)':'ภาพ HD-2D: ปิด (กด V เปิด)',1600);}
  G.t++;pollPad();if(G.potCD>0&&G.mode!=='menu')G.potCD--;
  switch(G.mode){
    case'title':if(tap('Enter'))startFromTitle(Save.exists());break;
    case'explore':if(tap('Backquote')){UI.open('debug');break;}if(tap('Tab')){UI.open('menu');break;}Skills.tick();updExplore();if(P.moving&&G.t%15===0)SFX.step(Z.biomeAt(Math.floor(P.x/16)));break;
    case'dialog':if(tap(KB.interact,'Enter','Space','PadA'))nextLine();break;
    case'menu':{
      if(tap('ArrowUp'))Nav.move(0,-1);if(tap('ArrowDown'))Nav.move(0,1);if(tap('ArrowLeft'))Nav.move(-1,0);if(tap('ArrowRight'))Nav.move(1,0);
      if(tap('PadA'))Nav.activate();
      if(UI.cur==='talent')break;
      if(UI.cur==='craft'&&UI.cs.confirm&&tap('Escape')){UI.cs.confirm=false;UI.rerender();break;}
      if(UI.cur==='skills'&&UI.sk.modal&&tap('Escape')){UI.sk.modal=null;UI.rerender();break;}
      if(UI.cur==='craft'&&Craft.busy)break;if(UI.cur==='loot'&&tap('Enter','Escape',KB.interact)){UI.close();break;}
      if(tap('Escape')||tap('Tab')){UI.close();break;}const MK=menuKeys();for(const k in MK)if(tap(k)){if(MK[k]===UI.cur)UI.close();else UI.open(MK[k]);break;}break;}
    case'trans':updTrans();break;
    case'battle':updBattle();break;
  }
  sndTick();
  if(G.shake>0){G.shake*=.85;if(G.shake<.3)G.shake=0;}
  for(const p of EP){p.x+=p.vx;p.y+=p.vy;if(p.grav)p.vy+=.12;p.l--;}for(let i=EP.length-1;i>=0;i--)if(EP[i].l<=0)EP.splice(i,1);
  for(const m of MOTES){m.x+=m.vx;m.y+=m.vy;if(m.y<36){m.y=H;m.x=rnd(0,W);}}
  if(G.t%20===0&&G.talent&&G.mode!=='battle')UI.hud();
  if(G.t%3600===0&&G.talent&&G.mode==='explore')Save.save();
}
/* ---------- HD-2D post-process: tilt-shift · bloom · color grade · light shafts · dust motes · vignette ----------
   กด V เปิด/ปิด (จำค่าไว้) */
const FX={on:(()=>{try{return localStorage.getItem('cf_fx')!=='0';}catch(e){return true;}})(),motes:[]};
const fxC=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const tiltC=fxC(W/2,H/2),TX=tiltC.getContext('2d'),tilt2C=fxC(W/2,H/2),TX2=tilt2C.getContext('2d'),bloomC=fxC(W/4,H/4),BX=bloomC.getContext('2d'),blurC=fxC(W/4,H/4),BL=blurC.getContext('2d');   // เบลอบนภาพเล็ก = เร็ว
const GRADE={town:'rgba(255,196,120,.30)',cave:'rgba(255,170,90,.26)',crystal:'rgba(140,120,255,.28)',lava:'rgba(255,110,40,.34)',ice:'rgba(120,200,255,.32)',
  sanctum:'rgba(170,230,255,.30)',tower:'rgba(120,255,190,.24)',lavaboss:'rgba(255,90,30,.34)',cathedral:'rgba(190,230,255,.30)',frost:'rgba(120,200,255,.32)',stone:'rgba(255,190,120,.24)',arena:'rgba(255,200,130,.30)'};
let vig=null,tiltMask=null;
function fxBiome(inB){try{if(inB)return (typeof SCENE_OF!=='undefined'&&BT&&BT.e&&SCENE_OF[BT.e.kind])||(Z.biomeAt?Z.biomeAt(Math.floor(BT.e.x/16)):'cave');return Z.biomeAt?Z.biomeAt(Math.floor(P.x/16)):'town';}catch(e){return 'town';}}
function present(){
  D.imageSmoothingEnabled=false;D.globalCompositeOperation='source-over';D.drawImage(low,0,0,W*S,H*S);if(FX.on){D.globalCompositeOperation='soft-light';D.globalAlpha=.32;D.drawImage(low,0,0,W*S,H*S);D.globalAlpha=1;D.globalCompositeOperation='source-over';}   // เพิ่มคอนทราสต์+สีสด (ถูกกว่า filter)
  if(!vig){vig=D.createRadialGradient(480,270,230,480,270,640);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.66)');}
  if(!canFilter||!FX.on){if(canFilter){D.save();D.filter='blur(7px)';D.globalCompositeOperation='lighter';D.globalAlpha=.2;D.drawImage(low,0,0,W*S,H*S);D.restore();}D.fillStyle=vig;D.fillRect(0,0,960,540);return;}
  const inB=BT&&(G.mode==='battle'||G.mode==='trans'),bio=fxBiome(inB);
  // 1) ระยะชัดลึก (depth of field): ไกล (ขอบบน) เบลอมาก · ใกล้ (ขอบล่าง) เบลอน้อย
  if(!tiltMask){const m=(c,stops)=>{const gr=c.createLinearGradient(0,0,0,H);for(const[o,a]of stops)gr.addColorStop(o,`rgba(0,0,0,${a})`);return gr;};
    tiltMask={far:m(TX,[[0,1],[.2,.75],[.42,0],[1,0]]),near:m(TX2,[[0,0],[.8,0],[1,1]]),bfar:m(TX,[[0,1],[.5,.5],[.7,0],[1,0]])};}
  const dof=(X,C,blur,mask)=>{X.globalCompositeOperation='source-over';X.clearRect(0,0,W/2,H/2);X.filter=`blur(${blur/2}px)`;X.drawImage(low,0,0,W/2,H/2);X.filter='none';
    X.globalCompositeOperation='destination-in';X.save();X.scale(.5,.5);X.fillStyle=mask;X.fillRect(0,0,W,H);X.restore();X.globalCompositeOperation='source-over';D.drawImage(C,0,0,960,540);};
  D.imageSmoothingEnabled=true;dof(TX,tiltC,inB?1.6:2.4,inB?tiltMask.bfar:tiltMask.far);dof(TX2,tilt2C,inB?.9:1.3,tiltMask.near);
  // 2) bloom: เฉพาะส่วนสว่างฟุ้งออก
  BX.clearRect(0,0,W/4,H/4);BX.filter='brightness(.78) contrast(2.8) saturate(1.3)';BX.drawImage(low,0,0,W/4,H/4);BX.filter='none';
  BL.clearRect(0,0,W/4,H/4);BL.filter='blur(2px)';BL.drawImage(bloomC,0,0);BL.filter='none';
  D.save();D.globalCompositeOperation='screen';D.globalAlpha=.26;D.drawImage(blurC,0,0,960,540);D.globalAlpha=.07;D.drawImage(bloomC,0,0,960,540);D.restore();
  // 3) color grade ตามโซน
  D.save();D.globalCompositeOperation='soft-light';D.fillStyle=GRADE[bio]||GRADE.town;D.fillRect(0,0,960,540);D.restore();
  // 4) แสงส่องเฉียงจากด้านบน ตามโซน (ถ้ำก็มีแสงจากช่องเพดาน)
  HD.rays(D,bio);
  // 5) ฝุ่นลอยในแสง
  if(FX.motes.length<26)FX.motes.push({x:Math.random()*960,y:Math.random()*540,vx:(Math.random()-.5)*.25,vy:-.12-Math.random()*.2,p:Math.random()*7});
  D.save();D.globalCompositeOperation='lighter';const mc=bio==='lava'||bio==='lavaboss'?'255,150,70':bio==='ice'||bio==='frost'||bio==='sanctum'?'200,235,255':bio==='tower'?'150,255,200':'255,230,180';
  for(const m of FX.motes){m.x+=m.vx;m.y+=m.vy;m.p+=.03;if(m.y<-6){m.y=546;m.x=Math.random()*960;}const a=.11+Math.sin(m.p)*.09;D.fillStyle=`rgba(${mc},${Math.max(0,a)})`;D.fillRect(m.x,m.y,2,2);}D.restore();
  // 6) ขอบจอมืด
  D.fillStyle=vig;D.fillRect(0,0,960,540);D.imageSmoothingEnabled=false;
}
function render(){
  if(!Z){D.fillStyle='#07050a';D.fillRect(0,0,960,540);return;}
  const inBattle=BT&&(G.mode==='battle'||G.mode==='trans');
  if(inBattle)drawBattle();else drawExplore();
  present();
  if(inBattle)drawBattleUI();else drawExploreUI();
  if(G.mode==='trans'){const a=G.tt<22?G.tt/22:(44-G.tt)/22;D.fillStyle=`rgba(0,0,0,${clamp(a,0,1)})`;D.fillRect(0,0,960,540);
    for(let i=0;i<8;i++){const w=clamp(a*1.4,0,1)*960;D.fillStyle='#000';D.fillRect(i%2?960-w:0,i*68,w,68);}}
  if(G.mode==='menu')drawPreview();
}
CAVE=makeCave();TOWN=makeTown();Quest.init();loadZone(TOWN);
let last=performance.now(),acc=0;const STEP=1000/60;
function frame(now){acc+=Math.min(100,now-last);last=now;
  while(acc>=STEP){try{update();}catch(err){console.error(err);}acc-=STEP;for(const k in pressed)delete pressed[k];}
  try{g.setTransform(RES,0,0,RES,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';render();}catch(err){console.error(err);}
  requestAnimationFrame(frame);}
let started=false;const go=()=>{if(started)return;started=true;requestAnimationFrame(frame);};
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(go);setTimeout(go,1500);
