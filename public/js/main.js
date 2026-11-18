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

const MENU_KEYS={KeyI:'equip',KeyC:'char',KeyK:'skills',KeyQ:'quests',KeyM:'map',KeyB:'ency',Backquote:'debug'};   // ทางลัดยังใช้ได้ แต่ไม่มีแถบปุ่มแสดงแล้ว
function update(){
  G.t++;pollPad();if(G.potCD>0&&G.mode!=='menu')G.potCD--;
  switch(G.mode){
    case'title':if(tap('Enter'))startFromTitle(Save.exists());break;
    case'explore':if(tap('Backquote')){UI.open('debug');break;}if(tap('Tab')){UI.open('menu');break;}Skills.tick();updExplore();break;
    case'dialog':if(tap('KeyE','Enter','Space','PadA'))nextLine();break;
    case'menu':{
      if(tap('ArrowUp'))Nav.move(0,-1);if(tap('ArrowDown'))Nav.move(0,1);if(tap('ArrowLeft'))Nav.move(-1,0);if(tap('ArrowRight'))Nav.move(1,0);
      if(tap('PadA'))Nav.activate();
      if(UI.cur==='talent')break;
      if(UI.cur==='craft'&&UI.cs.confirm&&tap('Escape')){UI.cs.confirm=false;UI.rerender();break;}
      if(UI.cur==='skills'&&UI.sk.modal&&tap('Escape')){UI.sk.modal=null;UI.rerender();break;}
      if(UI.cur==='craft'&&Craft.busy)break;if(UI.cur==='loot'&&tap('Enter','Escape','KeyE')){UI.close();break;}
      if(tap('Escape')||tap('Tab')){UI.close();break;}for(const k in MENU_KEYS)if(tap(k)){if(MENU_KEYS[k]===UI.cur)UI.close();else UI.open(MENU_KEYS[k]);break;}break;}
    case'trans':updTrans();break;
    case'battle':updBattle();break;
  }
  if(G.shake>0){G.shake*=.85;if(G.shake<.3)G.shake=0;}
  for(const p of EP){p.x+=p.vx;p.y+=p.vy;if(p.grav)p.vy+=.12;p.l--;}for(let i=EP.length-1;i>=0;i--)if(EP[i].l<=0)EP.splice(i,1);
  for(const m of MOTES){m.x+=m.vx;m.y+=m.vy;if(m.y<36){m.y=H;m.x=rnd(0,W);}}
  if(G.t%20===0&&G.talent&&G.mode!=='battle')UI.hud();
  if(G.t%3600===0&&G.talent&&G.mode==='explore')Save.save();
}
let vig=null;
function present(){
  D.imageSmoothingEnabled=false;D.globalCompositeOperation='source-over';D.drawImage(low,0,0,W*S,H*S);
  if(canFilter){D.save();D.filter='blur(7px)';D.globalCompositeOperation='lighter';D.globalAlpha=.2;D.drawImage(low,0,0,W*S,H*S);D.restore();}
  if(!vig){vig=D.createRadialGradient(480,270,260,480,270,620);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.6)');}
  D.fillStyle=vig;D.fillRect(0,0,960,540);
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
  try{render();}catch(err){console.error(err);}
  requestAnimationFrame(frame);}
let started=false;const go=()=>{if(started)return;started=true;requestAnimationFrame(frame);};
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(go);setTimeout(go,1500);
