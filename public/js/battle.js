'use strict';
/* ============================================================
   BATTLE — fighting-game layer on top of the RPG systems
   ============================================================ */
let BT=null;
const maxGuard=f=>((f&&((f.isP&&!BT?.vs&&G.talent==='parryman')||f.talent==='parryman'))?TALENT_PASSIVE.parryman.guardMax:CONFIG.guard.max);
function mkF(o){const f=Object.assign({x:0,y:GY,vx:0,vy:0,dir:1,onGround:true,state:'idle',st:0,phase:null,pt:0,move:null,didHit:false,hitN:0,hitCD:0,
  flash:0,invuln:0,combo:0,hist:[],lastN:5,lastFT:-99,lastBT:-99,backPressT:-99,airUsed:0,jug:0,walkT:0,think:40,guard:0,aiChain:0,trail:[],gc:false,
  penalty:0,failedThis:false,cmb:null,fullMove:null,buffT:0,armorBuff:0,kingAuraT:0,parryBuffT:0,rootT:0,hits:0,weakT:0,ph:0},o);f.guardLeft=maxGuard(f);f.guardBroken=0;f.S0=f.S;f.mods=[];Status.init(f);return f;}
/* ฉากหลังการต่อสู้ — แยกตามคู่ต่อสู้ (สไตล์ Elden Ring: มืด มีหมอก เน้นแสงทองเล็กน้อย) */
const SCENE_OF={rat:'cave',shade:'cave',kage:'cave',lavarat:'lava',lavaking:'lava',rat2:'cave',
  golem:'stone',rockling:'stone',mudslime:'stone',seraph:'cathedral',mslime:'tower',homunc:'tower',gargoyle:'tower',homunculus:'tower',
  frostslime:'frost',frostwolf:'frost',iceknight:'frost',icegolem:'frost',arena:'arena',egel:'arena',rankg2:'arena',rankg3:'arena'};
const SCENE_PAL={
  cave:{sky:['#0c0a10','#1a1420'],wall:[58,50,64],wallD:[36,30,42],fog:'rgba(120,110,140,.18)',glow:'#e8c674',floor:[46,40,48]},
  stone:{sky:['#07090a','#161a18'],wall:[70,74,66],wallD:[40,44,38],fog:'rgba(170,190,160,.14)',glow:'#9fe6b8',floor:[52,56,50]},
  lava:{sky:['#120404','#2a0a06'],wall:[52,30,26],wallD:[30,16,14],fog:'rgba(255,120,60,.16)',glow:'#ff8a3a',floor:[40,22,18]},
  cathedral:{sky:['#0a0c14','#1a2236'],wall:[84,92,110],wallD:[46,52,66],fog:'rgba(210,225,255,.16)',glow:'#fff2b8',floor:[70,76,92]},
  frost:{sky:['#060b12','#12202e'],wall:[120,150,170],wallD:[70,92,112],fog:'rgba(200,230,255,.2)',glow:'#bfe4ff',floor:[110,140,160]},
  tower:{sky:['#08060c','#1a1226'],wall:[66,54,84],wallD:[38,30,52],fog:'rgba(140,240,190,.14)',glow:'#7af0c0',floor:[50,42,62]},
  arena:{sky:['#0b0a0c','#1c1714'],wall:[88,72,58],wallD:[52,42,34],fog:'rgba(200,170,120,.12)',glow:'#f3c969',floor:[96,74,52]}
};
function buildBattleBg(scene){
  if(typeof BT!=='undefined')buildBattleBg.last=scene;if(AS.bg(BB,scene))return;   // มีฉากหลังจาก AI → ใช้ภาพ
  if(typeof HDB!=='undefined'){HDB.build(BB,scene);return;}   // ฉากไดออรามา HD-2D
  const c=BB,P=SCENE_PAL[scene]||SCENE_PAL.cave,W2=W,H2=H;
  const gr=c.createLinearGradient(0,0,0,H2);gr.addColorStop(0,P.sky[0]);gr.addColorStop(1,P.sky[1]);c.fillStyle=gr;c.fillRect(0,0,W2,H2);
  // distant back wall with irregular blocks
  for(let y=30,row=0;y<200;y+=14,row++)for(let x=-(row%2)*12;x<W2;x+=24){const v=(hash(x,y)-.5)*16,b=row%3===0?P.wall:P.wallD;
    c.fillStyle=`rgb(${b[0]+v|0},${b[1]+v|0},${b[2]+v|0})`;c.fillRect(x+1,y+1,22,12);}
  // scene-specific set dressing
  if(scene==='cathedral'){for(const px of [70,410]){c.fillStyle='#2a3248';c.fillRect(px,20,34,210);c.fillStyle='rgba(255,240,200,.25)';c.fillRect(px+12,30,10,120);}
    c.fillStyle='rgba(255,242,184,.22)';for(let i=0;i<5;i++){c.beginPath();c.moveTo(150+i*36,0);c.lineTo(160+i*36,0);c.lineTo(160+i*36,70);c.lineTo(150+i*36,70);c.fill();}}
  if(scene==='stone'){for(const px of [78,372]){c.fillStyle='#3a403a';c.fillRect(px,18,36,214);c.fillStyle='#2a2e2a';c.fillRect(px+4,40,28,4);c.fillRect(px+8,110,20,3);c.fillStyle='rgba(159,230,184,.35)';c.fillRect(px+16,60,4,10);}
    c.fillStyle='rgba(159,230,184,.12)';c.beginPath();c.arc(240,96,40,0,7);c.fill();}
  if(scene==='lava'){c.fillStyle='rgba(255,122,58,.18)';c.beginPath();c.ellipse(240,120,160,70,0,0,7);c.fill();for(const px of [80,380]){c.fillStyle='#3a1e18';c.fillRect(px,14,30,216);c.fillStyle='#ff6a1a';c.fillRect(px+10,60,4,20);}}
  if(scene==='frost'){c.fillStyle='rgba(230,245,255,.5)';for(let i=0;i<14;i++){const x=(hash(i,3)*W2)|0,h=12+hash(i,7)*28|0;c.beginPath();c.moveTo(x,40);c.lineTo(x+6,40);c.lineTo(x+3,40+h);c.fill();}}
  if(scene==='cave'){c.fillStyle='#14101a';for(let i=0;i<12;i++){const x=(hash(i,11)*W2)|0,h=8+hash(i,13)*24|0;c.beginPath();c.moveTo(x,10);c.lineTo(x+7,10);c.lineTo(x+3,10+h);c.fill();}}
  if(scene==='arena'){for(let i=0;i<8;i++){c.fillStyle=i%2?'#7a1a1a':'#c8a040';c.fillRect(40+i*52,14,44,8);}c.fillStyle='rgba(243,201,105,.12)';c.beginPath();c.ellipse(240,240,220,38,0,0,7);c.fill();}
  // floor
  for(let y=220,row=0;y<H2;y+=10,row++){const f=P.floor;for(let x=-(row%2)*18;x<W2;x+=36){const v=(hash(x,y+9)-.5)*14;
    c.fillStyle=`rgb(${f[0]+v|0},${f[1]+v|0},${f[2]+v|0})`;c.fillRect(x+1,y+1,34,8);}}
  // light shaft from above + darkening (Elden Ring: แสงลอดมาจากด้านบนซ้ายขวา)
  c.globalCompositeOperation='source-over';c.fillStyle='rgba(6,4,8,.45)';c.fillRect(0,0,W2,H2);
  c.globalCompositeOperation='lighter';for(const sx of [150,300]){const lg=c.createLinearGradient(sx,0,sx+40,H2*.85);lg.addColorStop(0,P.glow+'40');lg.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=lg;c.beginPath();c.moveTo(sx-20,0);c.lineTo(sx+30,0);c.lineTo(sx+90,H2*.85);c.lineTo(sx-70,H2*.85);c.fill();}
  c.globalCompositeOperation='source-over';
  // ground light and soft fog bands (Elden Ring haze)
  const sh=c.createLinearGradient(0,200,0,240);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=sh;c.fillRect(0,200,W2,40);
  c.fillStyle=P.fog;for(let i=0;i<4;i++)c.fillRect(0,40+i*46,W2,14);
  const vg=c.createRadialGradient(W2/2,H2*.45,H2*.2,W2/2,H2*.5,H2*.85);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.7)');c.fillStyle=vg;c.fillRect(0,0,W2,H2);
  c.fillStyle=P.glow;c.globalAlpha=.06;c.fillRect(0,GY-2,W2,2);c.globalAlpha=1;
}
const FLASK={uses:3,heal:.30,frames:30};   // ขวดยาฟื้นพลัง: 3 ครั้งต่อการต่อสู้ ฟื้น 30% HP ระหว่างดื่มขยับไม่ได้ 0.5 วิ
const applyVampireCurse=t=>{const pct=(TALENT_PASSIVE.vampire&&TALENT_PASSIVE.vampire.cursePct)||.20,r=1-pct;
  t.maxHp=Math.max(1,Math.round(t.maxHp*r));t.hp=t.maxHp;t.dhp=t.maxHp;
  t.S.def=Math.max(0,Math.round(t.S.def*r));t.S.mdef=Math.max(0,Math.round(t.S.mdef*r));
  if(t.S0&&t.S0!==t.S){t.S0.def=t.S.def;t.S0.mdef=t.S.mdef;}};
function startBattle(e){G.mode='trans';G.tt=0;G.pendingFoe=e;SFX.hit(true);}
function setupBattle(e){
  const def=FOES[e.kind],zl=Z.levelAt(Math.floor(e.x/16)),lv=foeLevel(def,zl);
  buildBattleBg(SCENE_OF[e.kind]||(Z.biomeAt(Math.floor(e.x/16))==='lava'?'lava':Z.biomeAt(Math.floor(e.x/16))==='ice'?'frost':'cave'));
  const PS=StatSync.get(),hasOutMods=StatSync.mods&&StatSync.mods.length>0;   // ค่าสุดท้ายชุดเดียวกับที่ UI แสดง
  const PBASE=hasOutMods?StatSync.final(Stats.player(),[]):PS;
  const p=mkF({x:BW/2-160,dir:1,isP:true,rig:true,S:PBASE,hp:clamp(G.hp,1,PS.maxHP),maxHp:PS.maxHP,dhp:G.hp,mp:clamp(G.mp,0,PS.maxMP),sta:PS.maxSTA,
    look:Equip.look(),wpn:Equip.weaponType(),name:'คุณ',hw:14,h:100,revived:false,lv:G.level,mpAcc:G.mpAcc||0,ultKeys:new Set()});
  if(hasOutMods){p.mods=StatSync.mods.map(m=>Object.assign({},m));StatSync.recalc(p,'battleStart');p.maxHp=p.S.maxHP;p.hp=clamp(G.hp,1,p.S.maxHP);}
  const ES=Stats.enemy(def,lv,e.elite);
  const en=mkF({x:BW/2+160,dir:-1,kind:e.kind,def,S:ES,hp:ES.maxHP,maxHp:ES.maxHP,dhp:ES.maxHP,lv:def.fixedLv||lv,elite:e.elite,rig:def.kind==='rig',
    look:LOOK_BY_NAME[def.look]||null,wpn:def.wpn,hw:def.hw,h:def.kind==='rig'?(def.h||100):def.h,armor:!!def.armor,
    statusRes:def.statusRes||{},stunImmuneAfter:def.stunImmuneAfter,name:(e.elite?ELITE.prefix+' ':'')+def.n,moves:def.moves?def.moves.slice():null,cdMul:Diff.cur().aiCD,spdMul:Diff.cur().eSpd*aiCfg({kind:e.kind,def}).spdMul,think:def.boss?10:20,ultT:600});
  if(G.talent==='vampire'||(G.skills&&G.skills.slots&&G.skills.slots.includes('blooddrain')))applyVampireCurse(en);
  BT={flask:FLASK.uses,mana:FLASK.uses,foe:e,def,p,e:en,proj:[],parts:[],nums:[],bursts:[],bolts:[],pillars:[],moveFx:def.fog?[fogFx({area:{x:0,y:0,w:BW,h:GY+24},col:'#94e8ff'})]:[],hitstop:0,shake:0,intro:90,end:0,slow:0,result:null,msg:null,small:null,lastMove:null,lastT:0,
    comboT:0,comboShow:0,flash:null,time:99*60,white:0,fullCombo:null,phaseMsg:null,coach:def.immortal?{t:0}:null};
  if(def.fireShieldStart){en.fireShieldT=def.fireShieldStart;en.buffT=Math.max(en.buffT||0,def.fireShieldStart);StatSync.addMod(en,{id:'fireshield',n:'เกราะเพลิง',kind:'buff',stat:'buffDr',op:'add',v:.15,ttl:def.fireShieldStart});}
  if(def.bgm&&typeof SND!=='undefined'&&SND.booted)SND.music(def.bgm,.45);
  if(fleeBtn)fleeBtn.textContent=def.immortal?'🚪 ออกฝึก':'🏃 หนี';
  wrap.classList.add('battle');
}
function updTrans(){G.tt++;if(G.tt===22){if(G.vsPending){G.vsPending=false;setupVS([0,0],1);}else setupBattle(G.pendingFoe);}if(G.tt>=44)G.mode='battle';}
const actionable=f=>['idle','walk','crouch','block','cblock'].includes(f.state);
/* ปุ่มของแต่ละนักสู้: ปกติใช้ชุดของ P1 (WASD/ลูกศร + J K Space) — โหมดประลองแยกเป็น P1=WASD+J,K,Space / P2=ลูกศร+, . / */
const KDEF={get R(){return kb('right')},get L(){return kb('left')},get U(){return kb('up')},get D(){return kb('down')},get J(){return[...kb('punch'),'PadX']},get K(){return[...kb('kick'),'PadY']},get X(){return kb('dodge')},get B(){return kb('guard')},get F(){return[KB.flask]},get M(){return[KB.mana]}};   // ปุ่มผูกไว้ได้ที่เมนู ปุ่มควบคุม (B = ป้องกัน)
const VSK1={R:['KeyD'],L:['KeyA'],U:['KeyW'],D:['KeyS'],J:['KeyJ'],K:['KeyK'],X:['Space'],B:['KeyE']};
const skillKeys=i=>[KB['s'+(i+1)],'Numpad'+(i+1)].concat(i===3?[KB.ult]:[]);   // ปุ่มสกิลช่อง 1-4 (โหมดปกติ) ปรับได้
const VSS1=[['Digit1'],['Digit2'],['Digit3'],['Digit4','KeyL']];      // P1 ลานประลอง: เลข 1-4 บนแถวบน (L สำหรับช่อง 4)
const cdLeftF=(p,id)=>p.cd?(p.cd[id]||0):Skills.cdLeft(id);
const kk=f=>f.keys||KDEF;
function numDir(f){const k=kk(f),fw=down(...(f.dir>0?k.R:k.L)),bk=down(...(f.dir>0?k.L:k.R)),u=down(...k.U),dn=down(...k.D);
  if(dn)return bk?1:fw?3:2;if(u)return bk?7:fw?9:8;return bk?4:fw?6:5;}
function motion(f,type){
  const seqs={qcf:[[2,3,6],[2,6]],qcb:[[2,1,4],[2,4]],dp:[[6,2,3],[6,3,2,3],[6,5,2,3],[6,1,2,3]]};
  for(const seq of seqs[type]){let i=seq.length-1;for(let k=f.hist.length-1;k>=0&&i>=0;k--){const h=f.hist[k];if(G.t-h.t>24)break;if(h.n===seq[i])i--;}if(i<0)return true;}
  return false;
}
/* ---------- combo tracker (sequences, timing windows, failure, reward) ---------- */
const inWindow=p=>p.state==='attack'&&p.move&&p.didHit&&p.move.kind!=='ultimate'&&(p.phase==='active'||(p.phase==='recovery'&&p.pt<=CONFIG.comboWindow));
const Combo={
  start(p,m){const c=COMBOS.filter(x=>x.seq[0]===m.tok);p.cmb=c.length?{c,prog:1}:null;},
  advance(p,m){if(!p.cmb)return this.start(p,m);const c=p.cmb.c.filter(x=>x.seq[p.cmb.prog]===m.tok);if(!c.length)return this.start(p,m);
    p.cmb={c,prog:p.cmb.prog+1};const full=c.find(x=>x.seq.length===p.cmb.prog);
    if(full){p.fullMove=m;p.fullCombo={n:full.n,t:90};BT.fullCombo={n:full.n,t:90,who:p};if(!BT.vs)G.stats.fullCombos++;p.cmb=null;p.sta=Math.min(p.S.maxSTA,p.sta+20);Ult.gain(p,'combo',p.moveSeq);SFX.perfect();}},  // combo reward: stamina + Ultimate Gauge (never MP)
  fail(p,why){if(p.failedThis)return;p.failedThis=true;p.cmb=null;p.penalty=CONFIG.comboFailPenalty;num(p,'จังหวะพลาด! ('+why+')','#ff9a8a',15,-30);SFX.fail();}
};
function pickMove(f,btn){
  const w=WEAPONS[f.wpn];
  if(!f.onGround)return btn==='J'?UNI.apunch:UNI.akick;
  const k=kk(f);
  if(btn==='J'){if(!BT.vs){if(motion(f,'dp'))return{skill:1};if(motion(f,'qcf'))return{skill:0};}
    if(down(...(f.dir>0?k.R:k.L))&&!down(...k.D))return w.heavy;if(down(...k.D))return UNI.cjab;
    const i=(f.move&&f.move.kind==='light'&&f.move.idx+1<w.light.length&&inWindow(f))?f.move.idx+1:0;return w.light[i];}
  if(!BT.vs&&motion(f,'qcb'))return{skill:2};if(down(...k.D))return UNI.sweep;return UNI.kick;
}
function startAtk(f,m){f.moveSeq=(f.moveSeq||0)+1;f.state='attack';f.phase='startup';f.pt=0;if(f.fullMove!==m)f.fullMove=null;f.move=m;f.didHit=false;f.hitN=0;f.hitCD=0;f.penalty=0;f.failedThis=false;}
function applyMoveBuff(f,m){
  if(!m||!m.buff)return;
  if(m.buff.stunImm)f.stunImm=Math.max(f.stunImm||0,m.buff.stunImm);
  if(m.buff.statusImm){f.statusImm=Math.max(f.statusImm||0,m.buff.statusImm);StatSync.addMod(f,{id:'statusimm',n:'กันสถานะ',kind:'buff',stat:'statusImmune',op:'add',v:1,ttl:m.buff.statusImm});}
  f.buffT=m.buff.t;
  if(m.buff.dr){StatSync.addMod(f,{id:m.buff.fireShield?'fireshield':'ironwall',n:m.buff.fireShield?'เกราะเพลิง':'กำแพงเหล็ก',kind:'buff',stat:'buffDr',op:'add',v:m.buff.dr,ttl:m.buff.t});if(!m.buff.fireShield)num(f,'กำแพงเหล็ก!','#9fd0ff',18,-30);}
  if(m.buff.invuln||m.buff.armor||m.buff.dr){if(BT){BT.moveFx=BT.moveFx||[];BT.moveFx.push(shieldFx({actor:f,x:f.x,y:f.y,col:m.buff.col||(m.buff.fireShield?'#ff8a3a':m.buff.invuln?'#7af0c0':'#9fd0ff')}));}}
  if(m.buff.def){StatSync.addMod(f,{id:'ironwall_def',n:'กำแพงเหล็ก (+DEF)',kind:'buff',stat:'def',op:'add',v:m.buff.def,ttl:m.buff.defT||m.buff.t});}
  if(m.buff.mdef){StatSync.addMod(f,{id:'ironwall_mdef',n:'กำแพงเหล็ก (+M.DEF)',kind:'buff',stat:'mdef',op:'add',v:m.buff.mdef,ttl:m.buff.defT||m.buff.t});}
  if(m.buff.def||m.buff.mdef){const dt=Math.round((m.buff.defT||m.buff.t)/60);num(f,`🛡️ +${m.buff.def||0} DEF${m.buff.mdef?' / +'+m.buff.mdef+' M.DEF':''} (${dt} วิ)`,'#9fd0ff',15,-48);}
  if(m.buff.invuln){f.invuln=Math.max(f.invuln||0,m.buff.invuln);num(f,'บาเรีย!','#7af0c0',18,-36);}
  if(m.buff.vanish){f.vanishT=Math.max(f.vanishT||0,m.buff.vanish);f.invuln=Math.max(f.invuln||0,m.buff.vanish);num(f,'💨 หายตัว! ('+Math.round(m.buff.vanish/60)+' วิ)','#bff0ff',18,-36);}
  if(m.buff.fireShield){f.fireShieldT=Math.max(f.fireShieldT||0,m.buff.fireShield);num(f,'🔥 เกราะเพลิง! ('+Math.round(m.buff.fireShield/60)+' วิ)','#ff8a3a',18,-42);SFX.fire();}
  f.armorBuff=m.buff.armor?m.buff.t:0;
}
function movementFx(o){
  const kind=o.kind||'dash',f=o.actor,x0=o.x0??f.x,x1=o.x1??f.x,y=o.y??f.y,dir=o.dir||f.dir||1,fh=f.h||96;
  const maxT=kind==='blink'?24:16,pts=[];
  if(kind==='blink'){
    for(let i=0;i<30;i++)pts.push({x:x0+rnd(-12,12),y:y-rnd(6,fh*.94),vx:dir*rnd(1.2,4.6)+rnd(-1,1),vy:rnd(-1.6,.8),sz:i%4===0?3:2,c:i%3===0?'#ffffff':i%2?'#8ef2ff':'#38b6ff',k:'dissolve'});
    for(let i=0;i<14;i++)pts.push({x:x1+rnd(-18,18),y:y-rnd(8,fh*.9),vx:rnd(-.8,.8),vy:rnd(-2.2,-.3),sz:2,c:i%2?'#ffffff':'#9ef6ff',k:'arrive'});
  }else{
    for(let i=0;i<14;i++)pts.push({x:x0+rnd(-10,10),y:y-rnd(4,fh*.75),vx:-dir*rnd(1.5,3.8),vy:rnd(-1.1,.4),sz:2,c:i%3===0?'#ffffff':'#a8ecff',k:'dash'});
  }
  return{t:0,maxT,kind,actor:o.actor,x0,x1,y,dir,fh,pts,
    update(dt){this.t+=(dt||1/60)*60;for(const q of this.pts){q.x+=q.vx;q.y+=q.vy;if(q.k==='dissolve')q.vx*=.92;else q.vy*=.94;}},
    done(){return this.t>=this.maxT;},
    draw(frameOrG,layer){
      const gg=frameOrG||g,u=Math.max(0,1-this.t/this.maxT);if(u<=0)return;gg.save();
      if(layer==='back'){
        if(this.kind==='blink'){
          const minX=Math.min(this.x0,this.x1),span=Math.max(12,Math.abs(this.x1-this.x0));
          gg.globalAlpha=u*.42;gg.fillStyle='#5cd8ff';gg.fillRect(minX|0,(this.y-this.fh*.62)|0,span|0,Math.max(2,Math.round(this.fh*.28*u)));
          gg.globalAlpha=u*.85;gg.fillStyle='#ffffff';
          for(let i=0;i<5;i++){const ly=(this.y-14-i*(this.fh*.17))|0;gg.fillRect((minX+i*6)|0,ly,Math.max(8,(span-i*12))|0,i%2?1:2);}
          gg.globalAlpha=u*.6;gg.strokeStyle='#8ef2ff';gg.lineWidth=2;gg.beginPath();gg.ellipse(this.x0|0,GY-1,16*(1.4-u*.5),4,0,0,7);gg.stroke();
          gg.strokeStyle='#ffffff';gg.beginPath();gg.ellipse(this.x1|0,GY-1,20*(1.3-u*.4),5,0,0,7);gg.stroke();
        }else{
          gg.globalAlpha=u*.65;gg.fillStyle='#8ef2ff';
          for(let i=0;i<4;i++){const ly=(this.y-10-i*16)|0,lx=(this.x0-this.dir*(8+i*7))|0;gg.fillRect(Math.min(lx,lx-this.dir*24)|0,ly,26,2);}
        }
      }else{
        for(const q of this.pts){gg.globalAlpha=u*.92;gg.fillStyle=q.c;gg.fillRect(q.x|0,q.y|0,q.sz,q.sz);}
        if(this.kind==='blink'&&u>.35){
          const f2=(u-.35)/.65;gg.globalAlpha=f2;gg.fillStyle='#ffffff';
          for(const fx of[this.x0,this.x1]){const cy=(this.y-this.fh*.52)|0,sr=Math.round(11*f2);gg.fillRect((fx-sr)|0,cy,sr*2,2);gg.fillRect(fx|0,(cy-sr)|0,2,sr*2);}
        }
      }
      gg.restore();
    }
  };
}
function slashFx(o){
  const dir=o.dir||(o.actor&&o.actor.dir)||1,x=o.x??(o.actor?o.actor.x+dir*36:240),y=o.y??(o.actor?o.actor.y-54:180);
  const v=(o.variant||0)%4,maxT=16,r=44+(v===3?8:0);
  const arcs=[[-1.55,1.05],[1.15,-1.45],[-1.95,.65],[-1.25,1.35]][v];
  const sp=[],dust=[];
  for(let i=0;i<10;i++)sp.push({x:x+dir*rnd(-8,8),y:y-r*.45+rnd(-10,10),vx:-dir*rnd(2.2,4.8),vy:rnd(-1.4,1.6),c:i%3===0?'#ffffff':i%2?'#ffe875':'#ff7a2a',sz:i%4?2:3});
  for(let i=0;i<16;i++){const u=i/15,a=arcs[0]+(arcs[1]-arcs[0])*u;dust.push({x:x+Math.cos(dir>0?a:Math.PI-a)*(r+rnd(-8,10)),y:y+Math.sin(dir>0?a:Math.PI-a)*(r+rnd(-8,10)),vx:dir*rnd(.2,1.1),vy:rnd(-.5,.5),c:i%3===0?'#ffffff':i%2?'#8ef2ff':'#2a9df4',sz:i%4?2:3});}
  return{t:0,maxT,kind:'slash',actor:o.actor,v,x,y,dir,r,arcs,sp,dust,
    update(dt){this.t+=(dt||1/60)*60;for(const q of this.sp){q.x+=q.vx;q.y+=q.vy;q.vx*=.9;}for(const q of this.dust){q.x+=q.vx;q.y+=q.vy;}},
    done(){return this.t>=this.maxT;},
    draw(frameOrG,layer){
      const gg=frameOrG||g,p=Math.min(1,this.t/this.maxT),u=1-p;if(u<=0)return;gg.save();
      const sw=Math.min(1,p*2.6),aStart=this.arcs[0],aTip=aStart+(this.arcs[1]-aStart)*sw;
      const toAng=a=>this.dir>0?a:Math.PI-a,A0=toAng(aStart+(this.arcs[1]-aStart)*Math.max(0,p-.15)),A1=toAng(aTip),ccw=(this.dir>0)!==(this.arcs[1]>=this.arcs[0]);
      if(layer==='back'){
        gg.globalAlpha=u*.36;gg.fillStyle='#1068d8';gg.beginPath();gg.arc(this.x,this.y,this.r+8,A0,A1,ccw);gg.arc(this.x-this.dir*14,this.y,Math.max(6,this.r-14),A1,A0,!ccw);gg.closePath();gg.fill();
        gg.globalAlpha=u*.85;gg.fillStyle='#48d8ff';gg.beginPath();gg.arc(this.x,this.y,this.r+4,A0,A1,ccw);gg.arc(this.x-this.dir*9,this.y,Math.max(6,this.r-7),A1,A0,!ccw);gg.closePath();gg.fill();
        for(const q of this.dust){gg.globalAlpha=u*.78;gg.fillStyle=q.c;gg.fillRect(q.x|0,q.y|0,q.sz,q.sz);}
      }else{
        gg.globalAlpha=u*.96;gg.strokeStyle='#ffffff';gg.lineCap='round';gg.lineWidth=3.5;gg.beginPath();gg.arc(this.x,this.y,this.r+2,A0,A1,ccw);gg.stroke();
        const tx=this.x+Math.cos(A1)*(this.r+2),ty=this.y+Math.sin(A1)*(this.r+2),fs=Math.max(4,Math.round(12*u));
        gg.fillStyle='#ffffff';gg.fillRect((tx-fs)|0,(ty-1)|0,fs*2,2);gg.fillRect((tx-1)|0,(ty-fs)|0,2,fs*2);
        gg.fillStyle='#8ef2ff';gg.fillRect((tx-3)|0,(ty-3)|0,6,6);
        for(const q of this.sp){gg.globalAlpha=u*.95;gg.fillStyle=q.c;gg.fillRect(q.x|0,q.y|0,q.sz,q.sz);}
      }
      gg.restore();
    }
  };
}
function healFx(o){
  const kind=o.kind||'heal',x=o.x??(o.actor?o.actor.x:240),y=o.y??(o.actor?o.actor.y:240),isM=kind==='mana',maxT=38;
  const pal=isM?['#2a8af4','#5ab8ff','#d8f6ff']:['#22c858','#7aff9a','#e8fff0'],cols=[],pts=[];
  for(let i=0;i<8;i++)cols.push({ox:-18+i*5.2,h:28+(i*13)%34,spd:.7+(i%3)*.35,c:pal[i%2]});
  for(let i=0;i<16;i++)pts.push({ox:rnd(-20,20),oy:rnd(4,72),vy:rnd(-1.6,-.8),ph:rnd(0,6.28),c:pal[i%3],sz:i%3===0?3:2});
  return{t:0,maxT,kind:'heal',sub:kind,x,y,actor:o.actor,pal,cols,pts,
    update(dt){this.t+=(dt||1/60)*60;if(this.actor){this.x=this.actor.x;this.y=this.actor.y;}for(const q of this.pts){q.oy+=q.vy;q.ox+=Math.sin(this.t*.15+q.ph)*.35;}},
    done(){return this.t>=this.maxT;},
    draw(frameOrG,layer){
      const gg=frameOrG||g,u=Math.max(0,1-this.t/this.maxT);if(u<=0)return;gg.save();
      if(layer==='back'){
        const r=22+(1-u)*12;
        gg.globalAlpha=u*.58;gg.fillStyle=this.pal[0];gg.beginPath();gg.ellipse(this.x,this.y-1,r,7,0,0,7);gg.fill();
        gg.globalAlpha=u*.85;gg.strokeStyle=this.pal[1];gg.lineWidth=2;gg.beginPath();gg.ellipse(this.x,this.y-1,r,7,0,0,7);gg.stroke();
        gg.strokeStyle=this.pal[2];gg.lineWidth=1.2;gg.beginPath();gg.ellipse(this.x,this.y-1,r*.62,4.2,0,0,7);gg.stroke();
        const gr=gg.createLinearGradient(0,this.y-96,0,this.y);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.55,isM?'rgba(90,184,255,.26)':'rgba(122,255,154,.26)');gr.addColorStop(1,isM?'rgba(216,246,255,.4)':'rgba(232,255,240,.4)');
        gg.globalAlpha=u;gg.fillStyle=gr;gg.fillRect((this.x-20)|0,(this.y-96)|0,40,96);
        for(const c of this.cols){const cy=(this.y-8-((this.t*c.spd+c.h)%64))|0;gg.globalAlpha=u*.65;gg.fillStyle=c.c;gg.fillRect((this.x+c.ox)|0,cy,2,10);}
      }else{
        for(const q of this.pts){
          const px=(this.x+q.ox)|0,py=(this.y-Math.abs(q.oy))|0;gg.globalAlpha=u*.92;gg.fillStyle=q.c;
          if(isM){gg.fillRect(px-q.sz,py,q.sz*2+1,2);gg.fillRect(px,py-q.sz,2,q.sz*2+1);gg.fillStyle='#ffffff';gg.fillRect(px,py,2,2);}
          else{gg.fillRect(px-q.sz,py,q.sz*2+1,2);gg.fillRect(px,py-q.sz,2,q.sz*2+1);}
        }
      }
      gg.restore();
    }
  };
}
function shieldFx(o){
  const x=o.x??(o.actor?o.actor.x:240),y=o.y??(o.actor?o.actor.y:240),fh=(o.actor&&o.actor.h)||96,hw=(o.actor&&o.actor.hw)||16,col=o.col||'#7af0c0',maxT=26;
  const pts=[];for(let i=0;i<12;i++){const a=i/12*6.283;pts.push({a,r:hw+18,col:i%2?'#ffffff':col});}
  return{t:0,maxT,kind:'shield',x,y,actor:o.actor,fh,hw,col,pts,
    update(dt){this.t+=(dt||1/60)*60;if(this.actor){this.x=this.actor.x;this.y=this.actor.y;}},
    done(){return this.t>=this.maxT;},
    draw(frameOrG,layer){
      const gg=frameOrG||g,p=this.t/this.maxT,u=Math.max(0,1-p);if(u<=0)return;gg.save();
      const cx=this.x,cy=this.y-this.fh*.5,rx=(this.hw+15)*(.7+p*.45),ry=(this.fh*.56)*(.7+p*.45);
      if(layer==='back'){
        gg.globalAlpha=u*.24;gg.fillStyle=this.col;gg.beginPath();
        for(let i=0;i<6;i++){const a=i*Math.PI/3;gg[i?'lineTo':'moveTo'](cx+Math.cos(a)*rx,cy+Math.sin(a)*ry);}
        gg.closePath();gg.fill();
        gg.globalAlpha=u*.7;gg.strokeStyle=this.col;gg.lineWidth=1.8;gg.beginPath();gg.ellipse(cx,this.y-1,rx*1.15,6,0,0,7);gg.stroke();
      }else{
        gg.globalAlpha=u*.9;gg.strokeStyle=this.col;gg.lineWidth=2.4;gg.beginPath();
        for(let i=0;i<6;i++){const a=i*Math.PI/3;gg[i?'lineTo':'moveTo'](cx+Math.cos(a)*rx,cy+Math.sin(a)*ry);}
        gg.closePath();gg.stroke();
        gg.globalAlpha=u*.95;gg.strokeStyle='#ffffff';gg.lineWidth=1.6;gg.beginPath();gg.ellipse(cx,cy,rx*.9,ry*.9,0,-2.6,-1.1);gg.stroke();
        for(const q of this.pts){const px=cx+Math.cos(q.a+p*2.4)*rx,py=cy+Math.sin(q.a+p*2.4)*ry;gg.globalAlpha=u*.9;gg.fillStyle=q.col;gg.fillRect((px-1)|0,(py-1)|0,3,3);}
      }
      gg.restore();
    }
  };
}
function fogFx(o={}){
  const area=o.area||{x:0,y:0,w:BW,h:GY+24},col=o.col||'#94e8ff',backPuffs=[],frontPuffs=[];
  for(let i=0;i<14;i++)backPuffs.push({x:area.x+((i/14)*area.w),y:area.y+area.h*(.38+(i%5)*.13),rx:54+(i%3)*26,ry:16+(i%4)*5,vx:.22+(i%3)*.12,ph:i*1.3,a:.08+(i%3)*.03});
  for(let i=0;i<12;i++)frontPuffs.push({x:area.x+((i/12)*area.w),y:GY-6-(i%4)*14,rx:46+(i%4)*18,ry:11+(i%3)*4,vx:-(.35+(i%4)*.14),ph:i*1.9,a:.1+(i%3)*.035});
  return{t:0,kind:'fog',area,col,backPuffs,frontPuffs,
    update(dt){
      this.t+=(dt||1/60)*60;const aw=this.area.w+140,ax0=this.area.x-70;
      for(const q of this.backPuffs){q.x+=q.vx;if(q.x>ax0+aw)q.x=ax0;}
      for(const q of this.frontPuffs){q.x+=q.vx;if(q.x<ax0)q.x=ax0+aw;}
    },
    done(){return false;},
    draw(frameOrG,layer){
      const gg=frameOrG||g,isBack=layer==='back',list=isBack?this.backPuffs:this.frontPuffs;
      gg.save();
      for(const q of list){
        const sy=q.y+Math.sin(this.t*.025+q.ph)*3;
        gg.globalAlpha=q.a;gg.fillStyle=isBack?'#7bcce8':this.col;
        gg.beginPath();gg.ellipse(q.x,sy,q.rx,q.ry,0,0,7);gg.fill();
        gg.globalAlpha=q.a*.7;gg.fillStyle='#e2f9ff';
        gg.fillRect((q.x-q.rx*.5)|0,(sy-q.ry*.3)|0,(q.rx)|0,2);
      }
      if(!isBack){
        const gr=gg.createLinearGradient(0,GY-54,0,GY+20);
        gr.addColorStop(0,'rgba(148,232,255,0)');gr.addColorStop(1,'rgba(110,205,245,.16)');
        gg.fillStyle=gr;gg.fillRect(this.area.x,GY-54,this.area.w,74);
      }
      gg.restore();
    }
  };
}
const setSmall=(f,t,l=60)=>{const s={t,l};if(BT&&BT.vs&&f)f.small=s;else if(BT)BT.small=s;};
function spawnMoveFx(kind,actor,x0,x1,dir){if(!BT)return;BT.moveFx=BT.moveFx||[];BT.moveFx.push(movementFx({kind,actor,x0,x1,y:actor.y,dir}));}
function beginMove(f,m){
  if(!m)return false;
  if((f.isP||f.isP2)&&m.sta&&!m.skillId){const c=m.sta*(f.S.passives.has('swift')?.7:1);if(f.sta<c){setSmall(f,'สตามินาไม่พอ',50);return false;}f.sta-=c;}
  if(m.blink){
    const x0=f.x,dir=(f.isP||f.isP2)?(()=>{const k=kk(f),l=down(...k.L),rt=down(...k.R);return l&&!rt?-1:rt&&!l?1:f.dir;})():(Math.abs(clamp(x0+f.dir*m.blink,24,BW-24)-x0)<40?-f.dir:f.dir);
    const x1=clamp(x0+dir*m.blink,24,BW-24);
    f.dir=dir;f.x=x1;f.vx=dir*2.2;f.invuln=Math.max(f.invuln||0,18);
    f.state='dash';f.st=10;f.move=null;
    f.trail=[];const pSnap=f.rig?poseFor(f):null;
    if(pSnap)for(let i=0;i<5;i++)f.trail.push({x:x0+(x1-x0)*(i/5),y:f.y,P:pSnap,d:dir,c:'#8ef2ff'});
    spawnMoveFx('blink',f,x0,x1,dir);num(f,'⚡ Blink!','#9ef6ff',16,-36);SFX.dodge();return true;
  }
  startAtk(f,m);if(m.air)f.airUsed++;if(m.rise)f.airUsed=99;
  if(f.isP||f.isP2){f.lastMove=m;f.lastT=40;}if(f.isP){BT.lastMove=m;BT.lastT=40;}
  if(m.super){BT.flash={t:m.super===2?66:46,f,m};SFX.flash();BT.white=6;}
  if(m.hpCost)f.hp=Math.max(1,f.hp-Math.round(f.maxHp*m.hpCost));
  if(m.jackpot){f.jackpot=m.jackpot;f.jackpotPen=m.jackpotPen||0;num(f,'แจ็คพอต! คริติคอล '+m.jackpot+' ครั้ง','#ffd23a',18,-30);SFX.crit();}
  if(m.kingAura){f.kingAuraT=m.kingAura;num(f,'ออร่าราชา! (+25% ดาเมจ)','#ffd23a',18,-32);SFX.flash();}
  if(m.buff&&!m.buff.fireShield)applyMoveBuff(f,m);
  return true;
}
function attemptMove(p,m){
  if(!m)return false;
  if(actionable(p)||(p.state==='dash'&&!m.air)||(p.state==='air'&&m.air&&p.airUsed<2)||p.state==='land'&&!m.air){
    if(p.state==='dash')p.vx*=.5;if(!beginMove(p,m))return false;Combo.start(p,m);return true;}
  if(p.state==='attack'){
    if(inWindow(p)&&(m.combo||m.kind==='ultimate')&&(!!m.air===!p.onGround)){Combo.advance(p,m);if(!beginMove(p,m)){p.cmb=null;return false;}return true;}
    Combo.fail(p,p.didHit?'ช้าไป':'เร็วไป');
  }
  return false;
}
/* SkillComponent cast gate: socket → passive → cooldown → resource (MP or Ultimate Gauge). Nothing is paid unless the move actually starts. */
function skillCastCheck(p,id){
  const s=SKILLS[id];if(!s)return'ไม่มีสกิล';if(s.type==='passive')return s.n+' เป็นพาสซีฟ ทำงานอยู่แล้ว';
  if(cdLeftF(p,id)>0)return`${s.n} ยังคูลดาวน์ (${Math.ceil(cdLeftF(p,id)/60)} วิ)`;
  if(s.tier==='ultimate'){if(!Ult.ready(p))return`เกจสุดยอดไม่พอ (${Math.floor(Ult.val(p))}/${CONFIG.ult.cost})`;}
  else if(p.mp<Mana.cost(id,p.S))return`MP ไม่พอ (${Math.floor(p.mp)}/${Mana.cost(id,p.S)})`;
  return null;
}
function useSkill(p,slot,fromBuf){
  const id=(p.skillSet||G.skills.slots)[slot];if(!id){setSmall(p,'ช่องสกิล '+(slot+1)+' ว่าง (ตั้งได้ที่หน้าสกิล K)',70);return false;}
  if(p.isP&&!p.skillSet&&!skillUsable(id,'player')){setSmall(p,SKILLS[id].n+' — ศัตรูใช้ได้เท่านั้น',70);return false;}
  if(SKILLS[id].type==='passive'){setSmall(p,SKILLS[id].n+' เป็นสกิลพาสซีฟ — ทำงานอัตโนมัติ ไม่ต้องกด',80);return false;}
  const err=skillCastCheck(p,id);if(err){setSmall(p,err,60);return false;}
  const sk=SKILLS[id];
  if(sk.holdParry){if(!actionable(p))return false;p.state='holdparry';p.st=sk.holdParry;p.holdSlot=slot;p.vx=0;p.skBuf=null;
    p.mp-=Mana.cost(id,p.S);if(p.cd)p.cd[id]=Skills.cdFrames(id,p.S);else G.skills.cd[id]=Skills.cdFrames(id,p.S);
    num(p,'ตั้งรับปัดป้อง!','#d8f6ff',16,-28);SFX.block();return true;}
  const m=Skills.move(id,p.wpn,slot);
  if(!attemptMove(p,m)){   // กดตอนโดนตี/หลบ/กระโดด/ท่ายังไม่จบ → จำไว้สั้นๆ แล้วปล่อยทันทีที่ขยับได้
    if(!fromBuf&&!actionable(p))p.skBuf={slot,ttl:CONFIG.skillBuffer};return false;}
  p.skBuf=null;if(SKILLS[id].type==='magic'&&SFX.magic)SFX.magic(SKILLS[id].el);   // เสียงร่ายตามธาตุ
  if(SKILLS[id].tier==='ultimate')Ult.spend(p);else p.mp-=Mana.cost(id,p.S);
  if(p.cd)p.cd[id]=Skills.cdFrames(id,p.S);else G.skills.cd[id]=Skills.cdFrames(id,p.S);return true;
}
function cmdDir(p){const k=kk(p),F=p.dir>0?k.R:k.L,Bk=p.dir>0?k.L:k.R;return(down(...k.U)||!p.onGround)?'U':down(...k.D)?'D':down(...F)?'F':down(...Bk)?'B':'N';}
// ทิศตามปุ่มจริงบนคีย์บอร์ด (W/A/S/D) ไม่สนว่าหันซ้ายหรือขวา
function cmdKey(p){const k=kk(p);return(down(...k.U)||!p.onGround)?'W':down(...k.D)?'S':down(...k.L)?'A':down(...k.R)?'D':'N';}
function cmdCheck(p,btn){p.cmdBuf=p.cmdBuf||[];p.cmdBuf.push({c:cmdDir(p)+btn,l:cmdKey(p)+btn,t:G.t});if(p.cmdBuf.length>6)p.cmdBuf.shift();
  for(const C of CMD_COMBOS){const L=C.seq.length;if(p.cmdBuf.length<L)continue;const tail=p.cmdBuf.slice(-L);let ok=true;
    const lit=C.keys&&tail.every((x,i)=>x.l===C.keys[i]);for(let i=0;i<L;i++){if(!lit&&tail[i].c!==C.seq[i]){ok=false;break;}if(i&&tail[i].t-tail[i-1].t>C.window){ok=false;break;}}
    if(ok){p.cmdBuf=[];return C;}}return null;}
function pressAttack(p,btn){const C=cmdCheck(p,btn);
  if(C){const m=C.move;if(p.state==='attack'||p.state==='air')p.state='idle';if(beginMove(p,m)){p.fullCombo={n:C.n,t:90};BT.fullCombo={n:C.n,t:90,who:p};SFX.perfect();return true;}}
  const m=pickMove(p,btn);if(m&&m.skill!==undefined)return useSkill(p,m.skill);return attemptMove(p,m);}
function control(p,e){
  if(p.state==='ko'||BT.result)return;
  if(p.drinkT>0){p.drinkT--;p.hp=Math.min(p.S.maxHP,p.hp+p.drinkH);p.state='idle';p.vx*=.8;if(p.drinkT%6===0)BT.parts.push({x:p.x+rnd(-6,6),y:p.y-rnd(10,40),vx:0,vy:-.6,l:26,c:'#7aff9a',s:2});return;}   // กำลังดื่มยา: ขยับไม่ได้ชั่วครู่
  const frz=p.st8&&p.st8.freeze?.55:1,actTick=!p.st8||!p.st8.freeze||p.__frzAct;
  if(p.cd&&actTick)for(const k in p.cd)if(p.cd[k]>0)p.cd[k]--;if(actTick&&p.dashCD>0)p.dashCD--;if(actTick&&p.potCD>0)p.potCD--;
  const n=numDir(p);if(n!==p.lastN){p.hist.push({n,t:G.t});if(p.hist.length>14)p.hist.shift();p.lastN=n;}
  const K=kk(p),fwdK=p.dir>0?K.R:K.L,backK=p.dir>0?K.L:K.R,holdB=down(...backK),Dn=down(...K.D),Rt=down(...K.R),Lt=down(...K.L);
  const blk=down(...(K.B||[]));if(tap(...(K.B||[])))p.backPressT=G.t;   // กด E ตรงจังหวะ = ปัดป้อง
  if(p.skBuf){if(--p.skBuf.ttl<=0)p.skBuf=null;else if(actionable(p)||p.state==='land'){const s=p.skBuf.slot;p.skBuf=null;useSkill(p,s,true);}}
  for(let i=0;i<4;i++)if(tap(...(p.skk?p.skk[i]:skillKeys(i))))useSkill(p,i);
  if(tap(...(K.F||[]))){if(typeof Z!=='undefined'&&Z&&Z.noPotion){BT.small={t:'🚫 สนามทดสอบแรงค์ไม่อนุญาตให้ใช้ยาฟื้นพลัง!',l:70};SFX.fail();}else{const fc=BT.vs?p:BT;if(!(fc.flask>0))setSmall(p,'ขวดยาหมดแล้ว (ได้ 3 ครั้งต่อการต่อสู้)',60);else if(actionable(p)&&p.hp<p.S.maxHP){fc.flask--;const h=Math.round(p.S.maxHP*FLASK.heal);p.drinkT=FLASK.frames;p.drinkH=h/FLASK.frames;fxHeal(p);num(p,'+'+h+' HP','#7aff9a',18,-30);SFX.heal?SFX.heal():SFX.pick();}}}   // v0.2.0: ขวดยา 3 ครั้ง/ไฟต์
  if(tap(...(K.M||[]))){if(typeof Z!=='undefined'&&Z&&Z.noPotion){BT.small={t:'🚫 สนามทดสอบแรงค์ไม่อนุญาตให้ใช้ยามานา!',l:70};SFX.fail();}else if(BT.vs){   // อารีนา: ยามานาของแต่ละคน 3 ครั้ง/ยก ไม่กินของในกระเป๋า (แฟร์ทั้งสองฝั่ง)
      if(!(p.mana>0))setSmall(p,'ยามานาหมดแล้ว (ได้ 3 ครั้งต่อยก)',60);else if((p.potCD||0)>0)setSmall(p,'ยามานาคูลดาวน์ '+Math.ceil(p.potCD/60)+' วิ',50);
      else if(actionable(p)&&p.mp<p.S.maxMP){const g=Math.min(p.S.maxMP-p.mp,Math.round(p.S.maxMP*.35));p.mana--;p.mp+=g;p.potCD=CONFIG.potionCD;fxMana(p);num(p,'+'+g+' MP','#7ab8ff',18,-30);SFX.mana();}}
    else{const fc=BT;const id=Mana.bestPotion(p,p.S);if(!(fc.mana>0))BT.small={t:'ยามานาใช้ครบ 3 ครั้งแล้วในไฟต์นี้',l:60};else if(!id)BT.small={t:'ไม่มียามานา',l:50};else{const r=Mana.drink(p,p.S,id);if(r.ok){fc.mana--;fxMana(p);num(p,'+'+r.gained+' MP','#7ab8ff',18,-30);SFX.mana();}else BT.small={t:r.err,l:50};}}}
  if(!BT.vs&&(tap(KB.flee)||fleeTap)){fleeTap=false;tryFlee(p,e);if(BT.result)return;}
  if(tap(...K.J))pressAttack(p,'J');else if(tap(...K.K))pressAttack(p,'K');
  if(!actionable(p))return;
  if(p.rootT>0){
    const threat=(e.state==='attack'&&Math.abs(e.x-p.x)<170)||BT.proj.some(q=>q.o!==p&&Math.abs(q.x-p.x)<170&&Math.sign(p.x-q.x)===Math.sign(q.vx));
    if(blk&&p.guardBroken<=0){p.state=Dn?'cblock':'block';return;}
    if(Dn){p.state='crouch';return;}p.state='idle';return;
  }
  const spd=p.S.spd*frz,swift=p.S.passives.has('swift')?.7:1;
  if(tap(...K.X)){if((p.dashCD||0)>0)BT.small={t:'พุ่งหลบยังไม่พร้อม ('+(p.dashCD/60).toFixed(1)+' วิ)',l:30};   // พุ่งหลบ: อมตะตลอดท่า · คูลดาวน์ 1.5 วิ (ไม่ใช้สตามินา)
    else{const dd=holdB?-p.dir:p.dir;p.dashCD=CONFIG.dashCD;p.state=holdB?'backdash':'dash';p.st=CONFIG.dashFrames;p.invuln=CONFIG.dashFrames+4;p.dashV=dd*CONFIG.dashSpeed*frz;p.vx=p.dashV;spawnMoveFx('dash',p,p.x,p.x+dd*54,dd);SFX.dodge();return;}}
  if(tap(...fwdK)&&!Dn){if(G.t-p.lastFT<12&&p.sta>=CONFIG.staCost.dash*swift){p.sta-=CONFIG.staCost.dash*swift;p.state='dash';p.st=18;p.vx=p.dir*4.6*spd;spawnMoveFx('dash',p,p.x,p.x+p.dir*50,p.dir);SFX.dodge();return;}p.lastFT=G.t;}
  if(tap(...backK)&&!Dn){if(G.t-p.lastBT<12&&p.sta>=CONFIG.staCost.dash*swift){p.sta-=CONFIG.staCost.dash*swift;p.state='backdash';p.st=16;p.vx=-p.dir*4.2*frz;p.invuln=8;spawnMoveFx('dash',p,p.x,p.x-p.dir*45,-p.dir);SFX.dodge();return;}p.lastBT=G.t;}
  if(down(...K.U)){p.state='prejump';p.st=4;p.jumpVx=(Rt?1:Lt?-1:0)*2.4*spd;return;}
  const threat=(e.state==='attack'&&Math.abs(e.x-p.x)<170)||BT.proj.some(q=>q.o!==p&&Math.abs(q.x-p.x)<170&&Math.sign(p.x-q.x)===Math.sign(q.vx));
  if(blk&&p.guardBroken<=0){p.state=Dn?'cblock':'block';return;}   // ถือ E = ป้องกัน (ถือ E + S = ป้องกันต่ำ)
  if(Dn){p.state='crouch';return;}
  if(Rt||Lt){const mv=Rt?1:-1;p.x+=mv*(mv===p.dir?1.9:1.5)*spd;p.state='walk';p.walkT+=mv===p.dir?1:-1;}
  else p.state='idle';
}
/* ---------- test helper: one-button auto combo ---------- */
let fleeTap=false;const fleeBtn=$('#fleeBtn');fleeBtn.addEventListener('pointerdown',e=>{e.preventDefault();fleeTap=true;initAudio();});
/* หลบหนี: ทอยครั้งเดียวต่อการกด (สุ่มด้วย rand() จึงทดสอบแบบ seed ได้) — ล้มเหลวจะเซและติดคูลดาวน์ จึงกดรัวจนสำเร็จไม่ได้ */
function fleeCheck(p){const F=CONFIG.flee;if(!BT||BT.result)return'ตอนนี้หนีไม่ได้';if(BT.def&&BT.def.immortal)return null;if(BT.def.boss&&!F.allowBoss)return'หนีจากบอสไม่ได้!';
  if(BT.fleeCD>0)return`ยังหนีไม่ได้ (${Math.ceil(BT.fleeCD/60)} วิ)`;if(!actionable(p))return'ต้องอยู่ในท่าพร้อมก่อน';return null;}
function tryFlee(p,e){const err=fleeCheck(p);if(err){BT.small={t:err,l:50};return{ok:false,err};}
  if(BT.def&&BT.def.immortal){BT.result='flee';BT.msg={t:'ออกจากการฝึกซ้อม',c:'#ffd23a'};BT.end=20;p.state='idle';return{ok:true,roll:0};}
  const F=CONFIG.flee,roll=rand(),ok=roll<F.chance;G.lootLog&&G.lootLog.unshift({flee:1,roll,chance:F.chance,ok});
  if(ok){BT.result='flee';BT.msg={t:'หนีสำเร็จ!',c:'#7ad8ff'};BT.end=45;p.state='dash';p.st=40;p.dir=p.x<e.x?-1:1;p.vx=p.dir*4;p.invuln=60;SFX.dodge();}
  else{BT.fleeCD=F.cooldown;p.state='hurt';p.st=F.failStagger;p.vx=0;BT.small={t:'หนีไม่สำเร็จ! (โอกาส '+Math.round(F.chance*100)+'%)',l:80};SFX.hit(false);}
  return{ok,roll};}
/* ---------- hit resolution (calls the central calcDamage) ---------- */
function playerGuard(t,m){
  if(t.guardBroken>0)return null;   // การ์ดแตก: ป้องกันไม่ได้
  if(!t.onGround||!['idle','walk','crouch','block','cblock'].includes(t.state))return null;
  const k=kk(t);if(!down(...(k.B||[])))return null;const cr=down(...k.D);if(m.low&&!cr)return null;if(m.over&&cr)return null;
  return G.t-t.backPressT<=8?'parry':'block';
}
const isCrouch=f=>f.state==='crouch'||f.state==='cblock'||(f.state==='gstun'&&f.gc)||(f.state==='attack'&&f.move&&f.move.crouch);
function inBox(f,o,m){
  if(o.state==='ko'||o.state==='down')return false;
  const dx=o.x-f.x;if(!(Math.sign(dx)===f.dir||Math.abs(dx)<12))return false;if(Math.abs(dx)-f.hw-o.hw>m.reach)return false;
  if(o.onGround&&o.h<60&&f.onGround)return true;
  const top=f.y-m.hy-m.hh/2,bot=f.y-m.hy+m.hh/2,th=o.h*(isCrouch(o)?.66:1);return bot>=o.y-th&&top<=o.y;
}
/* มังกรขาวตาฟ้า: โผล่หลังผู้ใช้ ปากอยู่ตรงจุดยิงลำแสง (mx,my) · d = ทิศหัน · a = ความทึบ · open = อ้าปาก 0-1 */
function drawDragon(g,mx,my,d,a,open,C){if(a<=0)return;g.save();g.globalAlpha=Math.min(1,a);
  const Z=1.7,R=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(d>0?mx+x*Z:mx-(x+w)*Z,my+y*Z,w*Z,h*Z);},jaw=Math.round(open*7),t=G.t;
  for(let i=0;i<9;i++){const u=i/8,x=-96+u*60,y=46-u*u*44+Math.sin(t*.12+i)*1.5;R(x,y,16,16,C.shade);R(x+1,y-1,14,12,C.body);if(i%2===0)R(x+4,y-6,6,6,C.mane);}   // คอยาว + แผงคอ
  R(-58,-26,4,12,C.shade);R(-62,-34,4,10,C.shade);R(-66,-40,4,7,'#e8eef6');R(-48,-24,4,10,C.shade);R(-52,-31,4,8,'#e8eef6');   // เขา
  R(-50,-18,42,22,C.shade);R(-48,-20,38,20,C.body);R(-12,-12,20,14,C.body);R(-12,-2,20,4,C.shade);R(4,-12,4,4,C.shade);   // หัว + จมูก
  R(-44,4+jaw,44,7,C.shade);R(-42,4+jaw,40,5,C.body);for(let k=0;k<5;k++){R(-6-k*7,2,2,3,'#ffffff');R(-4-k*7,4+jaw-2,2,3,'#ffffff');}   // กรามล่าง + ฟัน
  if(open>.2){R(-30,4,32,jaw,'#1a2a4a');R(-10,4,10,Math.max(1,jaw-2),C.eye);}   // ในปากเรืองฟ้า
  R(-30,-14,8,5,'#0a1a3a');R(-29,-14,6,4,C.eye);R(-27,-14,2,2,'#ffffff');   // ตาสีฟ้า
  g.globalAlpha=Math.min(1,a)*.35;g.fillStyle=C.eye;g.beginPath();g.arc(d>0?mx-26*Z:mx+26*Z,my-12*Z,(10+Math.sin(t*.3)*2)*Z,0,7);g.fill();
  g.restore();}
const beamHits=(f,o)=>Math.sign(o.x-f.x)===f.dir&&o.state!=='down'&&o.state!=='ko'&&o.y>=f.y-96&&o.y-o.h<=f.y;
function num(f,txt,col,size=20,dy=0){BT.nums.push({x:f.x+rnd(-8,8),y:f.y-f.h-6+dy,txt,col,size,t:55});}
function sparks(x,y,col,n){for(let i=0;i<n;i++){const a=rnd(0,6.28),s=rnd(1,4);BT.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,l:rnd(14,26)|0,c:col,s:rnd(1,3)|0||1});}}
function fxHeal(f){f.healFxT=36;if(BT){BT.moveFx=BT.moveFx||[];BT.moveFx.push(healFx({kind:'heal',actor:f,x:f.x,y:f.y}));}}
function fxMana(f){f.manaFxT=36;if(BT){BT.moveFx=BT.moveFx||[];BT.moveFx.push(healFx({kind:'mana',actor:f,x:f.x,y:f.y}));}}
function statusFx(t,type,res){
  if(res==='ok'){num(t,STI[type]+' '+STN[type]+(t.st8[type]&&t.st8[type].stacks?' ×'+t.st8[type].stacks:''),STC[type],14,-44);SFX.status();}
  else if(res==='resist'||res==='immune')num(t,STN[type]+': '+(res==='resist'?'ต้านทาน':'ภูมิคุ้มกัน'),'#aaa',13,-44);
}
function tryStatus(t,type,stacks,src,durSec){if(t.hp<=0)return;const before=t.st8[type]?(t.st8[type].stacks||1):0;const r=Status.apply(t,type,stacks,src,durSec);
  const after=t.st8[type]?(t.st8[type].stacks||1):0;if(r!=='ok'||after!==before)statusFx(t,type,r);}   // no text spam on pure refreshes
Status.onStun=f=>{if(BT&&(f===BT.p||f===BT.e)&&!['airhurt','down','ko'].includes(f.state)){f.state='stun';f.move=null;}};
Status.onStunEnd=f=>{if(BT&&f.state==='stun')f.state='idle';};
Status.onSynergy=(f,name,src)=>{if(!BT)return;
  if(name==='plasma'){const r=calcDamage(src.S,f.S,{coef:1.0,type:'magic',el:'lightning'});dealDamage(src,f,r.dmg,'#9fe6ff');num(f,'💥 ระเบิดพลาสมา!','#9fe6ff',20,-60);BT.bolts.push({x:f.x,t:12});SFX.crit();}
  if(name==='toxicfire')num(f,'☠🔥 ไอพิษลุกไหม้! พิษ +2','#c8ff5a',16,-60);};
function dealDamage(a,t,dmg,col){
  if(G.god&&t.isP)dmg=0;t.hp=Math.max(0,t.hp-dmg);
  if(t.def&&t.def.immortal){if(t.hp<=1){t.hp=t.maxHp;t.dhp=t.maxHp;num(t,'♾️ อมตะ!','#ffd23a',15,-48);}return;}
  const tal=BT&&BT.vs?t.talent:(t.isP?G.talent:null);   // อารีนา: พรสวรรค์เป็นของนักสู้แต่ละคน (ส่งมากับชุดต่อสู้)
  if((t.isP||t.isP2)&&t.hp<=0&&tal==='undying'&&(t.reviveN||0)<TALENT_PASSIVE.undying.revives){const invF=TALENT_PASSIVE.undying.reviveInvuln||180;t.revived=true;t.reviveN=(t.reviveN||0)+1;t.hp=Math.round(t.maxHp*TALENT_PASSIVE.undying.reviveHp);Status.cleanse(t);t.invuln=Math.max(t.invuln||0,invF);t.state='idle';t.onGround=t.y>=GY;
    if(BT){BT.moveFx=BT.moveFx||[];BT.moveFx.push(shieldFx({actor:t,x:t.x,y:t.y,col:'#ff6aff'}));}
    num(t,'💀 ฟื้นคืนชีพ! อมตะ '+Math.round(invF/60)+' วิ (THE UNDYING)','#ff6aff',20,-50);BT.white=10;SFX.level();return;}
  if(t.def&&t.def.revive&&t.hp<=0&&(t.reviveN||0)<t.def.revive){t.revived=true;t.reviveN=(t.reviveN||0)+1;t.hp=Math.round(t.maxHp*(t.def.reviveHp||.5));Status.cleanse(t);t.invuln=90;t.state='idle';t.move=null;t.y=GY;t.onGround=true;t.vy=0;t.vx=0;
    const rmsg=t.def.reviveMsg||'คืนชีพ!';num(t,'✨ '+rmsg+'!','#fff2a8',24,-58);BT.phaseMsg={t:t.name+' · '+rmsg+'!',l:110};BT.shake=6;BT.white=6;SFX.level();return;}
  if(t.hp<=0&&!BT.result){BT.result=a&&a.isP?'win':(t.isP?'lose':'win');BT.slow=80;BT.msg={t:'K.O.',c:'#ff4a3a'};SFX.ko();BT.white=8;
    if(t.state!=='airhurt'&&t.state!=='down'){t.state='airhurt';t.onGround=false;t.vy=-6;t.vx=(a?a.dir:-t.dir)*2.6;}}
}
function iceShatterFx(t){
  if(!BT||!t)return;
  const cx=t.x,cy=t.y-t.h*.5;
  for(let i=0;i<24;i++)BT.parts.push({x:cx+rnd(-12,12),y:cy+rnd(-22,12),vx:rnd(-4.5,4.5),vy:rnd(-5.5,-.8),l:rint(20,34),c:i%3===0?'#ffffff':i%2?'#8ef2ff':'#2a9df4',s:rint(2,4),grav:1});
  BT.bursts.push({x:cx,y:cy,t:0,col:'#8ef2ff',el:'ice',big:1,star:1,exp:0});
  BT.shake=Math.max(BT.shake,6);
  SFX.shatter?SFX.shatter():SFX.crit();
}
function applyHit(a,t,m,mul=1,px,py,isProj,projSeq){
  const seq=projSeq!==undefined?'P'+projSeq:a.moveSeq;
  const b=BT;if(t.invuln>0||t.state==='ko'||t.state==='down')return;if(!t.onGround&&t.jug>((t.isP||t.isP2)&&!a.isP&&!a.isP2?CONFIG.playerJuggleMax:6))return;   // ศัตรูไล่ตีผู้เล่นกลางอากาศได้ไม่เกิน 3 ฮิต (กันติดมุม)
  const hx=px??(t.x-a.dir*t.hw*.6),hy=py??clamp(a.y-m.hy,t.y-t.h+8,t.y-6);
  let gd=null;
  if(a.st8&&a.st8.blind){num(t,'พลาด! (ตาบอด)','#b08aff',14,-40);return;}   // ผู้โจมตีตาบอด: ตีไม่โดนทุกท่า
  if(t.S.evasion>0&&m.kind!=='ultimate'&&!m.beam&&rand()<t.S.evasion){   // หลบหลีก (สูงสุด 70%) — ท่าสุดยอด/ลำแสงหลบไม่ได้
    if(!t.__eva||t.__eva!==a.name+':'+seq){t.__eva=a.name+':'+seq;num(t,'หลบ!','#bfe8ff',16,-50);}a.didHit=true;return;}
  if(t.isP||t.isP2)gd=playerGuard(t,m);
  else if(['block','cblock'].includes(t.state)&&t.onGround){const cr=t.state==='cblock';if(!(m.low&&!cr)&&!(m.over&&cr))gd='block';}
  if(gd&&Math.sign(a.x-t.x)!==t.dir&&Math.abs(a.x-t.x)>6)gd=null;
  if(gd&&(m.unblockable||a.parryBuffT>0)){gd=null;num(t,'ทะลุการป้องกัน!','#ffb05a',16,-74);}   // Armor Breaker / True DMG: ทะลุ block/ปัดป้อง
  if(m.beam||m.rain&&false)gd=gd==='parry'?'block':gd;
  if(t.state==='holdparry'){
    t.state='idle';t.st=0;t.invuln=20;t.parryBuffT=180;t.guardLeft=maxGuard(t);
    sparks(t.x,t.y-50,'#e8fbff',30);b.bursts.push({x:t.x,y:t.y-50,t:0,col:'#7ad8ff',big:1});
    b.hitstop=14;b.shake=5;SFX.parry();num(t,'ปัดป้อง! True DMG 3 วิ','#e8fbff',22,-26);return;}
  if(gd==='parry'){t.guardLeft=maxGuard(t);Ult.gain(t,'perfectBlock',a.name+':'+seq);t.sta=Math.min(t.S.maxSTA,t.sta+30);b.hitstop=14;b.shake=4;if(!b.vs)G.stats.parries++;
    const isPM=(t.isP&&!BT?.vs&&G.talent==='parryman')||t.talent==='parryman'||(t.S&&t.S.passives&&t.S.passives.has('royalparry'));
    if(isPM){t.parryBuffT=180;num(t,'ปัดป้อง! True DMG 3 วิ','#e8fbff',22,-26);sparks(hx,hy,'#d8f8ff',26);b.bursts.push({x:hx,y:hy,t:0,col:'#7ad8ff',big:1});SFX.parry();return;}
    a.state='parried';a.st=50;a.move=null;a.vx=Math.sign(a.x-t.x)*3;
    num(t,'ปัดป้อง!','#f3c969',24);sparks(hx,hy,'#ffe27a',24);b.bursts.push({x:hx,y:hy,t:0,col:'#ffe27a',big:1});SFX.parry();return;}
  const lastHit=!m.multi||t.__lastHitCheck;
  const h={coef:(m.dmg/10)*mul,type:(a.def&&a.def.allMagic)?'magic':m.type||'phys',el:m.el||(a.rig?WEAPONS[a.wpn].el:(a.def&&a.def.el)||'phys'),ignoreDef:!!m.ignoreDef||a.parryBuffT>0,trueDmg:a.parryBuffT>0,
    forceCrit:!!(m.lastCrit&&a.hitN===m.multi-1)||(a.jackpot>0)||!!m.alwaysCrit||!!(a.def&&a.def.alwaysCrit),defPen:Math.max(a.jackpot>0?(a.jackpotPen||0):0,m.defPen||0),fullCombo:a.fullMove===m,weakPoint:t.weakT>0&&t.def&&t.def.weakPoint?t.def.weakPoint.mul:0,
    counter:(t.state==='attack'&&t.phase==='startup')||t.state==='parried',mastery:a.isP&&!BT.vs?Prog.masteryBonus(a.wpn):0,execute:a.S.passives.has('executioner')&&t.hp<t.maxHp*.3,stunned:!!t.st8.stun,berserk:a.S.uniq&&a.S.uniq.id==='berserker'&&a.hp<a.maxHp*.5?a.S.uniq.v:0,
    lvDiff:!BT.vs?(a.lv||1)-(t.lv||1):0,isP:!!a.isP};
  if(gd==='block'&&--t.guardLeft<=0){t.guardLeft=0;t.guardBroken=CONFIG.guard.breakT;num(t,'การ์ดแตก!','#ff6a4a',22,-60);sparks(hx,hy,'#ff8a5a',22);SFX.crit();b.shake=6;}   // บล็อกครั้งที่ 4 ยังกันได้ แล้วการ์ดแตก 8 วิ
  if(gd==='block'){const r=calcDamage(a.S,t.S,h),blkMul=((t.isP&&!BT?.vs&&G.talent==='parryman')||t.talent==='parryman')?.08:.1,chip=Math.max(1,Math.round(r.dmg*blkMul));dealDamage(a,t,chip);t.gc=(t.isP||t.isP2)?down(...kk(t).D):t.state==='cblock';t.state='gstun';
    t.st=Math.round(m.hs*.6)+2;t.vx=a.dir*(m.kb*.7+1.2);b.hitstop=5;sparks(hx,hy,'#9fd0ff',10);b.bursts.push({x:hx,y:hy,t:0,col:'#9fd0ff'});num(t,'กัน '+chip,'#9fd0ff',14);SFX.block();return;}
  const r=calcDamage(a.S,t.S,h);
  if(a.kingAuraT>0){r.dmg=Math.round(r.dmg*1.25);r.mods.kingAura=1.25;}
  if(a.st8&&a.st8.chaos){r.dmg*=2;r.mods.chaosOut=2;}if(t.st8&&t.st8.chaos){r.dmg*=2;r.mods.chaosIn=2;}   /* โกลาหล: ทำดาเมจ ×2 และโดนดาเมจ ×2 */
  let shattered=false;
  if(t.st8&&t.st8.freeze){
    t.st8.freeze.hits=(t.st8.freeze.hits||0)+1;
    if(t.st8.freeze.hits>=5){r.dmg*=2;r.mods.shatter=2;shattered=true;t.st8.freeze=null;}   /* น้ำแข็งแตกครบ 5 ที: ดาเมจ 2 เท่าในฮิตสุดท้าย */
  }
  G.dmgLog.unshift({from:a.name,to:t.name,move:m.n,...r,coef:h.coef.toFixed(2),el:h.el,type:h.type,mods:Object.keys(r.mods).map(k=>k+'×'+r.mods[k].toFixed(2)).join(' ')});G.dmgLog.length=Math.min(G.dmgLog.length,12);
  const wasStun=['hurt','airhurt','stun'].includes(t.state);
  const armored=(t.armor&&t.state==='attack'&&m.dmg<12&&!m.super)||t.armorBuff>0;
  dealDamage(a,t,r.dmg,shattered?'#8ef2ff':a.parryBuffT>0?'#d8f8ff':undefined);
  if(shattered){iceShatterFx(t);num(t,'💥❄️ น้ำแข็งแตก! ×2','#e8fbff',24,-56);}
  if(a.parryBuffT>0){sparks(hx,hy,'#ffffff',12);SFX.trueDmg();}
  if(t.def&&t.def.reflect&&t.hp>0&&a.hp>0&&!BT.result){const rf=Math.max(1,Math.round(r.dmg*t.def.reflect));dealDamage(t,a,rf,'#c8a0ff');num(a,'สะท้อน '+rf,'#c8a0ff',14,-30);}   /* สกิลติดตัว: สะท้อนดาเมจที่ได้รับ 20% */
  if(t.fireShieldT>0&&t.hp>0&&a.hp>0&&!BT.result){const rf=Math.max(1,Math.round(r.dmg*.20));dealDamage(t,a,rf,'#ff8a3a');num(a,'🔥 สะท้อน '+rf,'#ff8a3a',14,-36);tryStatus(a,'burn',1,t,3);}
  if(a.jackpot>0)a.jackpot--;                                   // แจ็คพอต: นับการโจมตีที่ติดคริ
  const lsPct=(m.lifesteal||0)+((a.def&&a.def.lifesteal)||0);
  if(lsPct>0&&a.hp>0){const heal=Math.max(1,Math.round(r.dmg*lsPct));a.hp=Math.min(a.maxHp,a.hp+heal);num(a,'+'+heal,'#7aff8a',14,-40);}
  if(((a.isP&&!BT?.vs&&G.talent==='vampire')||a.talent==='vampire')&&a.hp>0){const heal=Math.max(1,Math.round(r.dmg*TALENT_PASSIVE.vampire.lifesteal));a.hp=Math.min(a.maxHp,a.hp+heal);num(a,'+'+heal,'#ff5a7a',13,-34);}
  if((a.isP||a.isP2)&&m.kind!=='ultimate'){Ult.gain(a,'hit',seq);if(h.counter)Ult.gain(a,'counter',seq);}
  if(!a.isP&&!a.isP2&&m.kind!=='ultimate')a.ult=Math.min(100,(a.ult||0)+6);
  if(t.isP||t.isP2)Ult.gain(t,'beingHit',a.name+':'+seq);
  if(!t.isP&&!t.isP2)t.ult=Math.min(100,(t.ult||0)+8);
  if(a.S.uniq&&a.S.uniq.id==='vampiric'&&a.hp>0){const heal=Math.max(1,Math.round(r.dmg*a.S.uniq.v));a.hp=Math.min(a.maxHp,a.hp+heal);}
  if(t.revived&&t.invuln>100)return;
  a.hits++;
  if(t.hp>0){
    if(armored){t.flash=6;b.hitstop=4;}
    else if(t.st8.stun){t.flash=8;t.vx=a.dir*m.kb*.5;}
    else if(t.def&&t.def.boss){t.move=null;t.flash=8;t.state='hurt';t.st=Math.round(m.hs*.6);t.vx=a.dir*m.kb*.15;}   // บอส: ไม่ล้ม ไม่ลอย ไม่กระเด็น
    else{t.move=null;t.flash=8;const air=!t.onGround;
      if(m.launch||air||m.kd){t.state='airhurt';t.onGround=false;t.vy=m.launch?-7.4:air?-3.8:-3.6;t.vx=a.dir*(m.kd?2.4:1.3);t.jug++;}
      else{t.state='hurt';t.st=m.hs;t.vx=a.dir*m.kb;}}
  }
  a.combo=wasStun?a.combo+1:1;if(a.combo>=2){a.comboShow=a.combo;a.comboT=90;b.comboT=90;b.comboWho=a;b.comboShow=a.combo;}if(a.isP&&!b.vs)G.stats.maxCombo=Math.max(G.stats.maxCombo,a.combo);
  b.hitstop=Math.max(b.hitstop,m.super?3:r.crit?8:m.dmg>=12?8:m.dmg>=7?6:4);
  if(r.crit||a.parryBuffT>0||m.super)b.impFrame=m.super?3:2;
  const hc=a.parryBuffT>0?'#d8f8ff':(ELC[h.el]||'#ffe27a');
  b.bursts.push({x:hx,y:hy,t:0,col:hc,el:h.el,big:r.crit||m.dmg>=12||!!m.super,exp:!!(m.super||h.el==='fire'||m.quake||r.crit),star:!!(r.crit||a.parryBuffT>0||m.super),dome:!!(m.super||m.quake)});
  sparks(hx,hy,hc,r.crit||m.dmg>=12?16:10);
  if(h.type==='phys'){for(let i=0;i<(r.crit?10:6);i++)b.parts.push({x:hx,y:hy,vx:a.dir*rnd(1.2,4.2),vy:rnd(-3.2,.4),l:rnd(16,28)|0,c:i%3?'#d8283a':'#ff5a6a',s:rnd(2,3)|0,grav:1});}
  const mg=h.type==='magic',dc=a.parryBuffT>0?'#ffffff':mg?(r.crit?'#9a3aea':'#c88aff'):(r.crit?'#e6a800':'#ffe24a');   /* True=ขาว · เวท=ม่วง · กายภาพ=เหลือง */
  const pre=a.parryBuffT>0?'True ':'';
  if(r.crit){num(t,pre+r.dmg+' CRIT!',dc,30);SFX.crit();}else num(t,pre+r.dmg,dc,h.fullCombo?26:20);
  if(h.weakPoint)num(t,'จุดอ่อน! ×'+h.weakPoint,'#5affb0',16,-26);if(h.counter&&!armored)num(t,'COUNTER','#ff9a5a',14,-20);if(armored&&t.hp>0)num(t,'เกราะ!','#ffcf9a',13,-14);
  if(h.fullCombo&&(!m.multi||a.hitN===0))num(t,'FULL COMBO +20%','#ffd23a',18,-70);
  if(a.move===m)a.didHit=true;
  // statuses: skill-defined, element procs, unique passives, set passives
  if(m.status)for(const k in m.status)if(m.status[k]>0)tryStatus(t,k,m.status[k],a,m.statusDur);
  if(m.stunChance&&rand()<m.stunChance)tryStatus(t,'stun',1,a,m.stunDur||3);
  if(m.rootDur>0&&t.hp>0){t.rootT=Math.max(t.rootT||0,m.rootDur);num(t,(m.frostnova?'❄️ แช่ขยับไม่ได้! (':'🪽 ถูกล็อคขา! (')+Math.round(m.rootDur/60)+' วิ)',m.frostnova?'#8ef2ff':'#fff2a8',18,-42);SFX.root();}
  const chaosCh=(a.S&&a.S.chaosChance)||(a.def&&a.def.chaosChance)||0;
  if(chaosCh&&rand()<chaosCh)tryStatus(t,'chaos',1,a,4);
  if(a.S&&a.S.blindChance&&rand()<a.S.blindChance)tryStatus(t,'blind',1,a,5);   // ไลต์เลส: ตาบอด 5 วิ   // ค้อนศึก: โอกาสสตัน   // statusDur = ระยะเวลาสถานะของท่านี้ (วิ)   // 0 = ปิดสถานะนั้น
  if(m.armorBreak&&t.hp>0){StatSync.addMod(t,{id:'armorbreak',n:m.armorBreak.n||'เกราะแตก',kind:'debuff',stat:'def',op:'mul',v:m.armorBreak.def,ttl:m.armorBreak.t});num(t,(m.armorBreak.n||'เกราะแตก')+'!','#ff9a5a',16,-46);}
  const pr=ELEM_PROC[h.el];if(pr&&rand()<pr.c&&!(shattered&&pr.s==='freeze'))tryStatus(t,pr.s,1,a,pr.s==='freeze'?8:0);
  if(!shattered&&t.hp>0&&((a.def&&a.def.freezeChance)||m.freezeChance)&&h.el!=='ice'&&rand()<(m.freezeChance||a.def.freezeChance))tryStatus(t,'freeze',1,a,8);
  if(t.hp>0&&a.def&&a.def.burnChance&&rand()<a.def.burnChance)tryStatus(t,'burn',1,a,3);
  if(m.instantShatter&&t.hp>0&&(!m.multi||a.hitN===0)){if(!t.st8.freeze)Status.apply(t,'freeze',1,a,8);iceShatterFx(t);t.st8.freeze=null;if(!shattered)num(t,'💥❄️ น้ำแข็งแตก!','#e8fbff',24,-56);}
  const ps=a.S.passives;
  if(ps.has('bleeder')&&rand()<.15)tryStatus(t,'bleed',1,a);if(ps.has('venom')&&rand()<.15)tryStatus(t,'poison',1,a);
  if(ps.has('shadowBleed')&&rand()<.25)tryStatus(t,'bleed',1,a);if(ps.has('magmaBurn')&&rand()<.3)tryStatus(t,'burn',1,a);if(ps.has('phoenix'))tryStatus(t,'burn',1,a);
  if(ps.has('wrath')&&a.hits%5===0){tryStatus(t,'shock',1,a);b.bolts.push({x:t.x,t:12});}
  if(ps.has('vampire')&&r.crit){const heal=Math.round(a.maxHp*.02);a.hp=Math.min(a.maxHp,a.hp+heal);num(a,'+'+heal,'#6aff8a',14);}
  if(t.S.passives.has('thorns')&&!isProj){const ref=Math.max(1,Math.round(r.dmg*.1));dealDamage(t,a,ref);num(a,'หนาม '+ref,'#c8a0ff',13);}
  if(a.isP&&!BT.vs&&Prog.addMastery(a.wpn,1))num(a,'ความชำนาญอาวุธ Lv.'+Prog.masteryLv(a.wpn)+'!','#5affb0',15,-80);
  b.shake=Math.min(8,2+m.dmg*.25);const col=a.rig?WEAPONS[a.wpn].fx:'#ff6a5a';
  sparks(hx,hy,r.crit?'#ffb02a':col,10+Math.min(20,m.dmg));b.bursts.push({x:hx,y:hy,t:0,col:r.crit?'#ffb02a':col,big:r.crit||m.dmg>=12});
  SFX.hit(m.dmg>=12);
}
function spawnProj(f,m){
  const el=m.el||(f.rig?WEAPONS[f.wpn].el:'phys'),spMul=f.st8&&f.st8.freeze?.6:1;
  BT.proj.push({seq:f.isP?f.moveSeq:'e'+f.moveSeq,x:f.x+f.dir*24,y:f.y-Math.min(72,f.h*.52),vx:f.dir*m.proj.spd*spMul,o:f,m,r:m.proj.r,hits:m.proj.hits||1,cd:0,rock:m.proj.rock,wind:!!(m.proj.wind||m.windblade),col:(m.proj.wind||m.windblade)?'#9effcc':m.proj.rock?(el==='fire'?'#c4380e':'#8a7a6a'):ELC[el]||'#fff',life:150});
  if(el==='fire')SFX.fire();
}
function updAtk(f,o){
  const m=f.move;f.pt++;
  if(f.phase==='startup'){
    if(m.inv)f.invuln=Math.max(f.invuln,2);if(m.lunge)f.x+=f.dir*m.lunge*.3;
    if(f.pt>=atkStartup(f,m)){f.phase='active';f.pt=0;SFX.swing();
      if(m.lunge>=4)spawnMoveFx('dash',f,f.x,f.x+f.dir*60,f.dir);
      if(m.swap&&o){const nx=clamp(o.x+f.dir*34,24,BW-24);for(let i=0;i<14;i++)BT.parts.push({x:f.x,y:f.y-50+rnd(-20,20),vx:rnd(-1.5,1.5),vy:rnd(-1.5,1.5),l:20,c:'#c9a0ff',s:3});
        f.x=nx;f.dir=o.x>f.x?1:-1;for(let i=0;i<14;i++)BT.parts.push({x:f.x,y:f.y-50+rnd(-20,20),vx:rnd(-1.5,1.5),vy:rnd(-1.5,1.5),l:20,c:'#c9a0ff',s:3});}   // วาร์ปไปด้านหลังศัตรู
      if(m.rider){f.onGround=false;f.vy=f.y<GY-20?3.2:-3.5;BT.shake=4;}   // บนพื้น: เด้งขึ้นแล้วพุ่ง · กลางอากาศ: พุ่งดิ่งเฉียงลง
      if(m.proj)spawnProj(f,m);
      if(m.rise){f.vy=-m.rise;f.onGround=false;f.vx=f.dir*1.2;}
      if(m.strike){const dx=o.x-f.x,sx=Math.abs(dx)<=m.strike+o.hw&&Math.sign(dx)===f.dir?o.x:f.x+f.dir*m.strike;if(Math.sign(dx)===f.dir&&Math.abs(dx)<=m.strike+o.hw){applyHit(f,o,m,1,o.x,o.y-o.h*.6,true);}BT.bolts.push({x:sx,t:14});BT.pillars=BT.pillars||[];BT.pillars.push({x:sx,h:0,maxH:98,t:28,delay:0,el:m.el||'lightning',col:ELC[m.el||'lightning']});SFX.crit();}
      if(m.quake){BT.shake=8;for(let i=0;i<30;i++)BT.parts.push({x:f.x+f.dir*rnd(10,110),y:GY,vx:rnd(-1,1),vy:rnd(-3.5,-1),l:30,c:'#8a7a6a',s:3,grav:1});}
      if(m.frostnova){BT.pillars=BT.pillars||[];const nr=m.reach||240;for(const k of[-.88,-.62,-.38,-.16,.16,.38,.62,.88]){const ox=Math.round(nr*k),ak=Math.abs(k);BT.pillars.push({x:clamp(f.x+ox,20,BW-20),h:0,maxH:ak<.25?96:ak<.5?82:ak<.7?68:54,t:38,delay:ak>.75?6:ak>.5?4:ak>.25?2:0,el:'ice',col:'#5cd8ff',frostnova:1});}
        BT.shake=8;SFX.magic('ice');for(let i=0;i<36;i++)BT.parts.push({x:f.x+rnd(-nr*.92,nr*.92),y:GY-rnd(4,78),vx:rnd(-1.4,1.4),vy:rnd(-2.0,-.3),l:30,c:i%2?'#ffffff':'#8ef2ff',s:i%3?2:3});}
      if(m.buff&&m.buff.fireShield)applyMoveBuff(f,m);
      if(m.anim==='cast'&&!m.proj&&!m.buff&&!m.kingAura&&!m.rain&&!m.pillars&&!m.beam&&!m.strike&&!m.frostnova){BT.pillars=BT.pillars||[];BT.pillars.push({x:f.x+f.dir*Math.min(72,m.reach||54),h:0,maxH:94,t:34,delay:0,el:m.el||'fire',col:ELC[m.el||'fire']});}
      if(m.pillars){BT.pillars=BT.pillars||[];const dir=Math.sign(o.x-f.x)||f.dir,dist=Math.max(48,Math.abs(o.x-f.x)+20),cnt=Math.max(3,Math.ceil(dist/44));
        for(let i=0;i<cnt;i++){const px=f.x+dir*(28+i*44);BT.pillars.push({x:px,h:0,maxH:56+((i%2)*14),t:42,delay:i*3});}SFX.crit();}}
  }else if(f.phase==='active'){
    if(m.lunge&&(!m.multi||!o||Math.sign(o.x-f.x)!==f.dir||Math.abs(o.x-f.x)>28))f.x+=f.dir*m.lunge;if(f.hitCD>0)f.hitCD--;
    if(m.rain&&G.t%3===0){const rx=o.x+rnd(-56,56),rel=m.el||'fire',rc=ELC[rel]||'#ff8a3a';BT.parts.push({x:rx,y:rnd(10,50),vx:f.dir*1.4,vy:6.8,l:32,c:rc,s:5,meteor:1});if(G.t%6===0){BT.pillars=BT.pillars||[];BT.pillars.push({x:rx,h:0,maxH:86,t:28,delay:0,el:rel,col:rc});}}
    const n=m.multi||1;
    if(m.slashFx&&f.pt===1)f.__slN=0;
    if(m.slashFx&&(f.__slN||0)<n){const step=Math.max(2,Math.floor(m.a/n));if((f.pt-1)%step===0){BT.moveFx=BT.moveFx||[];BT.moveFx.push(slashFx({actor:f,x:f.x+f.dir*36,y:f.y-54,dir:f.dir,variant:f.__slN||0}));f.__slN=(f.__slN||0)+1;SFX.swing();}}
    if(!m.proj&&!m.strike&&!m.buff&&!m.jackpot&&f.hitN<n&&f.hitCD<=0&&(m.beam?beamHits(f,o):m.frostnova?(Math.abs(o.x-f.x)<=(m.reach||240)+o.hw&&o.y>=GY-130):(m.rain||m.pillars)?(o.onGround&&o.state!=='down'):inBox(f,o,m))){applyHit(f,o,m,1/n);f.hitN++;f.hitCD=Math.max(2,Math.floor(m.a/n));}
    if(f.pt>=m.a){f.phase='recovery';f.pt=0;}
  }else if(f.pt>=atkRecovery(f,m)+(f.penalty||0))endAtk(f);
}
function endAtk(f){
  const prev=f.move;
  if(!f.isP&&f.def&&f.def.weakPoint&&prev&&prev.n===f.def.weakPoint.after){f.weakT=f.def.weakPoint.t;num(f,'แกนเปิด! โจมตีจุดอ่อน','#5affb0',18,-30);}
  if(!f.onGround){f.state='air';f.move=null;return;}
  f.state=prev&&prev.crouch?'crouch':'idle';
  if(!f.isP&&f.aiChain>0&&f.didHit&&prev&&f.rig){f.aiChain--;const w=WEAPONS[f.wpn];let nm=null;
    if(prev.kind==='light'&&prev.idx+1<w.light.length)nm=w.light[prev.idx+1];else if(rand()<.5)nm=w.heavy;if(nm){startAtk(f,nm);return;}}
  f.move=null;
}
function land(f){
  f.y=GY;f.vy=0;f.onGround=true;f.airUsed=0;
  if(f.state==='airhurt'){f.state='down';f.st=f.hp<=0?999:36;f.invuln=44;f.vx*=.3;f.jug=0;BT.shake=Math.max(BT.shake,3);
    for(let i=0;i<10;i++)BT.parts.push({x:f.x+rnd(-14,14),y:GY,vx:rnd(-1.5,1.5),vy:rnd(-1.5,-.3),l:22,c:'rgba(200,180,150,.8)',s:2});}
  else if(f.state==='attack'){f.state='land';f.st=f.move&&f.move.rise?12:4;f.move=null;}
  else if(f.state==='air'){f.state='land';f.st=4;}
}
function stepF(f,o){
  if(f.flash>0)f.flash--;if(f.invuln>0&&f.state!=='down')f.invuln--;if(f.weakT>0)f.weakT--;
  if(f.buffT>0)f.buffT--;if(f.armorBuff>0)f.armorBuff--;if(f.kingAuraT>0)f.kingAuraT--;if(f.parryBuffT>0)f.parryBuffT--;
  if(f.vanishT>0){f.vanishT--;if(G.t%5===0)BT.parts.push({x:f.x+rnd(-14,14),y:f.y-rnd(10,f.h*.85),vx:rnd(-.6,.6),vy:-.4,l:14,c:'#bff0ff',s:2});}
  if(f.vanishCD>0)f.vanishCD--;
  if(f.def&&f.def.vanishPassive&&(f.vanishCD||0)<=0&&f.hp>0&&actionable(f)&&(f.hp<f.maxHp||f.hits>0||G.t>180)){
    const vp=f.def.vanishPassive;f.vanishT=vp.dur;f.invuln=Math.max(f.invuln||0,vp.dur);f.vanishCD=vp.cd;
    num(f,'💨 หายตัว! ('+Math.round(vp.dur/60)+' วิ)','#bff0ff',18,-36);for(let i=0;i<14;i++)BT.parts.push({x:f.x+rnd(-12,12),y:f.y-rnd(8,70),vx:rnd(-2,2),vy:rnd(-1.5,.5),l:20,c:'#d8f8ff',s:2});SFX.dodge();}
  if(f.fireShieldT>0){f.fireShieldT--;if(G.t%3===0)BT.parts.push({x:f.x+rnd(-16,16),y:f.y-rnd(8,f.h*.95),vx:rnd(-.4,.4),vy:rnd(-1.6,-.6),l:rint(14,22),c:G.t%6===0?'#ffd23a':'#ff6a18',s:G.t%9===0?3:2});}
  if(f.healFxT>0){f.healFxT--;if(G.t%4===0)BT.parts.push({x:f.x+rnd(-14,14),y:f.y-rnd(8,50),vx:0,vy:-1.1,l:18,c:'#7aff9a',s:2,cross:1});}
  if(f.manaFxT>0){f.manaFxT--;if(G.t%4===0)BT.parts.push({x:f.x+rnd(-14,14),y:f.y-rnd(8,50),vx:0,vy:-1.2,l:18,c:'#5ab8ff',s:2,orb:1});}
  if(f.rootT>0){f.rootT--;f.vx=0;if(f.state==='walk'||f.state==='dash'||f.state==='backdash')f.state='idle';}
  if(f.guardBroken>0&&--f.guardBroken===0){f.guardLeft=maxGuard(f);if(f.isP||f.isP2)num(f,'การ์ดกลับมา','#9fd0ff',14,-60);}
  const frzRate=f.st8&&f.st8.freeze?.55:1,actTick=!f.st8||!f.st8.freeze||f.__frzAct!==false;
  if(f.skcd&&actTick)for(const id in f.skcd)if(f.skcd[id]>0)f.skcd[id]--;   // คูลดาวน์สกิลของศัตรู (ช้าลงเมื่อถูกแช่แข็ง)
  if(f.rangedCD>0&&actTick)f.rangedCD--;
  StatSync.frame(f);   // นับเวลาบัฟ/ดีบัฟ หมดแล้วถอดและคำนวณใหม่ทันที
  f.dhp+=(f.hp-f.dhp)*.05;
  if(f.isP||f.isP2){const busy=f.state==='attack';f.sta=Math.min(f.S.maxSTA,f.sta+(busy?0:CONFIG.regen.sta/60*Diff.cur().staRegen*frzRate));if(actTick)Mana.regen(f,f.S,true);}
  if(G.t%60===0&&f.hp>0&&(f.S.hotPct||0)>0&&f.hp<f.maxHp){const hh=Math.max(1,Math.round(f.maxHp*f.S.hotPct));f.hp=Math.min(f.maxHp,f.hp+hh);num(f,'+'+hh,'#7aff9a',13,-34);f.healFxT=Math.max(f.healFxT||0,12);}
  if(f.hp>0)Status.update(f,(k,d)=>{const dmg=incoming(f.S,d);num(f,String(dmg),STC[k],14,-10);dealDamage(f===BT.p?BT.e:BT.p,f,dmg);});
  if(f.st8.stun&&!['airhurt','down','ko','stun'].includes(f.state)){f.state='stun';f.move=null;}
  if(f.st8.burn&&G.t%3===0)BT.parts.push({x:f.x+rnd(-10,10),y:f.y-rnd(6,f.h*.8),vx:0,vy:-.8,l:18,c:'#ff8a3a',s:2});
  if(f.st8.poison&&G.t%6===0)BT.parts.push({x:f.x+rnd(-10,10),y:f.y-rnd(6,f.h*.8),vx:0,vy:-.5,l:22,c:'#8aff5a',s:2});
  if(f.st8.bleed&&G.t%5===0)BT.parts.push({x:f.x+rnd(-8,8),y:f.y-rnd(20,f.h*.7),vx:rnd(-.5,.5),vy:.8,l:20,c:'#ff2a3a',s:2});
  if(f.st8.shock&&G.t%4===0)BT.parts.push({x:f.x+rnd(-12,12),y:f.y-rnd(6,f.h),vx:rnd(-2,2),vy:rnd(-2,2),l:6,c:'#cff4ff',s:2});
  if(f.st8.freeze&&G.t%4===0)BT.parts.push({x:f.x+rnd(-14,14),y:f.y-rnd(6,f.h*.9),vx:rnd(-.3,.3),vy:-.4,l:18,c:G.t%8?'#e8fbff':'#68d8ff',s:2});
  if(f.st8.chaos&&G.t%4===0)BT.parts.push({x:f.x+rnd(-14,14),y:f.y-rnd(6,f.h*.9),vx:rnd(-.6,.6),vy:-.9,l:18,c:G.t%8?'#ff5ad8':'#c88aff',s:2});
  if(f.look&&f.look.aura&&G.t%4===0)BT.parts.push({x:f.x+rnd(-14,14),y:f.y-rnd(10,90),vx:rnd(-.2,.2),vy:-.9,l:20,c:f.look.aura,s:2});
  if(f.elite&&G.t%3===0)BT.parts.push({x:f.x+rnd(-f.hw,f.hw),y:f.y-rnd(0,f.h),vx:0,vy:-.7,l:16,c:'#ffd23a',s:2});
  if(f.look&&f.look.trail&&['walk','dash','air'].includes(f.state)&&G.t%3===0)BT.parts.push({x:f.x-f.dir*6,y:f.y-rnd(0,8),vx:-f.dir*.6,vy:-.2,l:16,c:f.look.trail,s:2});
  if(f.dashV){if(f.state==='dash'||f.state==='backdash')f.vx=f.dashV;else{f.dashV=0;f.vx*=.3;}}   // พุ่งหลบ: ความเร็วคงที่ พุ่งทะลุตัวศัตรู
  if(!f.onGround){f.vy+=GRAV;f.y+=f.vy;f.x+=f.vx;if(f.y>=GY)land(f);}else{f.x+=f.vx;f.vx*=.8;if(Math.abs(f.vx)<.05)f.vx=0;}
  const lying=f.state==='down'||f.state==='ko';f.x=clamp(f.x,lying?46:20,lying?BW-46:BW-20);
  if(['dash','backdash'].includes(f.state)||(f.state==='attack'&&f.move&&(f.move.super||f.move.lunge))||f.state==='dodge'){if(G.t%2===0){f.trail.push({x:f.x,y:f.y,P:f.rig?poseFor(f):null,d:f.dir,c:'#8ef2ff'});if(f.trail.length>5)f.trail.shift();}}
  else if(f.trail.length&&G.t%2===0)f.trail.shift();
  switch(f.state){
    case'attack':if(actTick)updAtk(f,o);break;
    case'holdparry':{const held=f.isP&&!f.isP2?down(...skillKeys(f.holdSlot)):true;if(!held||(actTick&&--f.st<=0))f.state='idle';break;}
    case'prejump':if(actTick&&--f.st<=0){f.state='air';f.onGround=false;f.vy=-6.6*(frzRate<1?.76:1);f.vx=f.jumpVx||0;f.airUsed=0;SFX.jump();}break;
    case'hurt':case'gstun':case'parried':if(actTick&&--f.st<=0)f.state='idle';break;
    case'land':case'dash':case'backdash':case'dodge':case'getup':if(actTick&&--f.st<=0)f.state='idle';break;
    case'down':if(--f.st<=0){if(f.hp<=0)f.state='ko';else{f.state='getup';f.st=14;f.invuln=16;}}break;
  }
  if(actionable(f)||f.state==='land')f.dir=o.x>f.x?1:-1;
  if(!['hurt','airhurt','stun'].includes(o.state))f.combo=0;
  // boss phases
  if(f.def&&f.def.phases)f.def.phases.forEach((ph,i)=>{if(f.ph<=i&&f.hp>0&&f.hp/f.maxHp<=ph.at){f.ph=i+1;f.cdMul=ph.cdMul;f.spdMul=ph.spdMul*(f.def.boss?aiCfg(f).spdMul:MON_AI.spdMul);
    if(ph.addMove&&f.moves&&!f.moves.includes(EXTRA_MOVES[ph.addMove]))f.moves.push(EXTRA_MOVES[ph.addMove]);f.auraBurn=ph.aura==='burn';f.auraPoison=ph.aura==='poison';
    if(ph.heal){f.hp=Math.min(f.maxHp,f.hp+f.maxHp*ph.heal);num(f,'+'+Math.round(f.maxHp*ph.heal)+' HP','#7aff9a',18,-40);}
    if(ph.elemCycle){f.elemCycle=1;f.elT=0;}
    BT.phaseMsg={t:ph.n,l:120};BT.shake=8;BT.white=6;SFX.flash();Status.cleanse(f);}});
  if(f.auraBurn&&G.t%120===0&&Math.abs(o.x-f.x)<110)tryStatus(o,'burn',1,f);
  if(f.auraPoison&&G.t%120===0&&Math.abs(o.x-f.x)<110)tryStatus(o,'poison',1,f);
  if(f.elemCycle&&f.hp>0&&(f.elT=(f.elT||0)-1)<=0){f.elT=600;const E=['fire','ice','lightning'],e=E[(E.indexOf(f.curEl)+1)%3];f.curEl=e;   // เฟส 3: สลับธาตุที่ต้านทุก 10 วิ
    f.S.res=Object.assign({},f.S.res,{fire:0,ice:0,lightning:0,[e]:.7});if(f.S0)f.S0.res=Object.assign({},f.S.res);BT.phaseMsg={t:'ต้านธาตุ'+ELN[e]+' — เปลี่ยนวิธีโจมตี!',l:100};SFX.flash();}
}
/* ---------- AI ---------- */
/* ศัตรูใช้สกิล: อ่านจาก FOES[kind].skills — เคารพค่า user ของสกิล (ใช้ได้เฉพาะ 'all' หรือ 'enemy')
   ท่าสุดยอด: ใช้เมื่อ HP ต่ำกว่า 60% · ท่าระยะไกล: ระยะ > 110 · ท่าระยะประชิด: ระยะ < 100 · คูลดาวน์ตามสกิล */
const RANGED_SK=s=>s.type!=='buff'&&!!(s.proj||s.beam||s.rain||s.anim==='cast');
function enemyCast(e,p,dist){
  const list=(e.def&&e.def.skills||[]).filter(id=>skillUsable(id,'enemy'));if(!list.length)return false;
  e.skcd=e.skcd||{};
  const bz=e.def.boss?aiCfg(e):null,chance=bz?bz.rigSkillChance:.45;
  const ready=list.filter(id=>!(e.skcd[id]>0));if(!ready.length)return false;
  const ult=ready.find(id=>SKILLS[id].tier==='ultimate');
  let pick_=null;
  if(ult&&((e.ult||0)>=(SKILLS[ult].gauge||100)||((SKILLS[ult].gauge||100)>=100&&e.hp<e.maxHp*.6)))pick_=ult;
  else{const c=ready.filter(id=>{const sk=SKILLS[id];if(sk.tier==='ultimate')return false;if(sk.type==='buff')return sk.buff&&sk.buff.fireShield?!(e.fireShieldT>0):!(e.invuln>0);if(sk.frostnova)return dist<=(sk.reach||240);if(e.kind==='duelist'&&RANGED_SK(sk)&&(e.rangedCD||0)>0)return false;return RANGED_SK(sk)?dist>110:dist<100;});if(c.length&&rand()<chance)pick_=pick(c);}
  if(!pick_)return false;
  const s=SKILLS[pick_],m=Skills.move(pick_,e.wpn||'fist',Math.max(0,TIERS.indexOf(s.tier)));if(!m)return false;
  if(e.rig){if(!beginMove(e,m))return false;}else startAtk(e,m);
  if(s.tier==='ultimate'){e.ult=Math.max(0,(e.ult||0)-(s.gauge||100));if(!BT.flash){BT.flash={t:56,f:e,m};BT.white=6;SFX.flash();}}
  const ai=aiCfg(e),isDuelRanged=e.kind==='duelist'&&RANGED_SK(s)&&s.tier!=='ultimate';
  if(isDuelRanged)e.rangedCD=300;
  e.skcd[pick_]=Math.round((isDuelRanged?Math.max(6,s.cd||6):(s.cd||8))*60*(bz&&!s.bossOnly&&!isDuelRanged?bz.cdMul:1));e.think=Math.round((bz?rint(12,24):rint(24,42))*(e.cdMul||1)*ai.cdMul);
  num(e,s.n,s.tier==='ultimate'?'#ffd23a':'#ff9a8a',s.tier==='ultimate'?20:14,-70);if(s.tier==='ultimate'){BT.shake=6;SFX.flash();}
  return true;}
function aiRig(e,p){
  if(e.def&&e.def.passive){e.state='idle';e.vx=0;return;}
  if(e.state==='air'&&e.aiAir&&Math.abs(p.x-e.x)<70&&e.vy>-1.5&&e.airUsed<1){beginMove(e,UNI.akick);e.aiAir=0;return;}
  if(!actionable(e)||p.state==='ko')return;
  if(e.rootT>0){e.state='idle';return;}
  const dx=p.x-e.x,dist=Math.abs(dx),w=WEAPONS[e.wpn],act=!e.st8||!e.st8.freeze||e.__frzAct!==false;if(act){e.think--;if(e.ultT>0)e.ultT--;}
  const pThreat=(p.state==='attack'&&dist<120&&p.phase!=='recovery')||BT.proj.some(q=>q.o===p&&Math.abs(q.x-e.x)<120);
  const gRate=e.kind==='duelist'?.018:.045,gLen=e.kind==='duelist'?12:24;
  if(pThreat&&(e.guard>0||rand()<gRate*Diff.cur().guard)){e.guard=e.guard>0?e.guard-1:gLen;e.state=(p.move&&p.move.low)?'cblock':'block';return;}
  e.guard=0;
  if(!p.onGround&&dist<80&&p.vy>-3&&rand()<.06&&skillUsable('rising','enemy')){beginMove(e,Skills.move('rising',e.wpn,1));return;}
  if(e.think>0){const fm=(e.st8&&e.st8.freeze?.55:1);if(dist>80){e.x+=Math.sign(dx)*1.7*e.spdMul*fm;e.state='walk';e.walkT++;}else if(dist<40){e.x-=Math.sign(dx)*1.3*fm;e.state='walk';e.walkT--;}else e.state='idle';return;}
  const r=rand();
  if(enemyCast(e,p,dist))return;   // สกิลที่ศัตรูใส่ไว้ (FOES[x].skills)
  if(dist>150&&r<.55&&!(e.def&&e.def.noWave)&&!(e.skcd&&e.skcd.slashwave>0)&&!(e.rangedCD>0)&&skillUsable('slashwave','enemy')){if(beginMove(e,Skills.move('slashwave',e.wpn,0))){e.skcd=e.skcd||{};e.skcd.slashwave=Math.round((SKILLS.slashwave.cd||4)*60);if(e.kind==='duelist')e.rangedCD=300;}}
  else if(dist>90&&r<.75){e.state='prejump';e.st=4;e.jumpVx=Math.sign(dx)*2.6;e.aiAir=1;}
  else if(dist<75){if(r<.25)beginMove(e,UNI.sweep);else if(r<.35)beginMove(e,UNI.kick);else{e.aiChain=2;beginMove(e,w.light[0]);}}
  else{e.state='dash';e.st=14;e.vx=e.dir*4.2;}
  const ai=aiCfg(e);
  e.think=Math.round((e.def&&e.def.boss?rint(12,28):rint(22,52))*e.cdMul*ai.cdMul);
}
// มอนสเตอร์และบอสทุกตัว (ยกเว้น bbqy) ออกท่า/ฟื้นตัว/คูลดาวน์เร็วขึ้น: สตาร์ทอัปและฟื้นตัวสั้นลง คิดเร็วขึ้น เดินเร็วขึ้น
const BBQY_AI={cdMul:.70,atkMul:.85,spdMul:1.15,farChance:.75,specialChance:.55,rigUltCD:480,rigSkillChance:.65};
const BOSS_AI={cdMul:.35,atkMul:.45,spdMul:1.45,farChance:.88,specialChance:.65,rigUltCD:360,rigSkillChance:.82};
const MON_AI={cdMul:.65,atkMul:.65,spdMul:1.15};
const aiCfg=f=>(f&&f.def&&f.def.boss)?(f.kind==='duelist'?BBQY_AI:BOSS_AI):MON_AI;
const atkStartup=(f,m)=>f.isP||f.isP2?m.s:Math.max(2,Math.round(m.s*(f.def&&f.def.boss?aiCfg(f).atkMul:CONFIG.enemyStartupMul)));
const atkRecovery=(f,m)=>f.isP||f.isP2?m.r:Math.max(2,Math.round(m.r*(f.def&&f.def.boss?aiCfg(f).atkMul:CONFIG.enemyStartupMul)));
const isSpecialMove=m=>!!(m.beam||m.rain||m.quake||m.proj||m.multi||m.kd||m.lunge);
function aiMon(e,p){
  if(e.def&&e.def.passive){e.state='idle';e.vx=0;return;}
  if(!actionable(e)||p.state==='ko')return;
  const d=e.def,dx=p.x-e.x,dist=Math.abs(dx),ai=aiCfg(e),bz=d.boss?ai:null,cdm=e.cdMul*(e.elite?.85:1)*ai.cdMul,moves=e.moves||[];e.think--;
  if(e.rootT>0){e.state='idle';return;}
  if(e.think<=0&&enemyCast(e,p,dist))return;
  if(dist>d.range+p.hw+10){
    if(e.think<=0&&dist>150){const far=moves.find(m=>m.far);if(far&&rand()<(bz?bz.farChance:.5)){startAtk(e,far);e.think=rint(d.cd[0],d.cd[1])*cdm|0;return;}}
    e.state='walk';e.x+=Math.sign(dx)*d.spd*e.spdMul*(e.st8&&e.st8.freeze?.55:1);
  }else{e.state='idle';
    if(e.think<=0){const ms=moves.filter(m=>!m.far),sp=bz?ms.filter(isSpecialMove):[];if(ms.length){startAtk(e,sp.length&&rand()<bz.specialChance?pick(sp):pick(ms));e.think=rint(d.cd[0],d.cd[1])*cdm|0;}}
    else if(e.think>25&&dist<d.range*.6)e.x-=Math.sign(dx)*d.spd*.6;}
}
function updBattle(){
  if(BT.net==='guest'){Net.guestStep();return;}
  updBattleCore();if(BT&&BT.net==='host')Net.hostTick();
}
function updBattleCore(){
  const b=BT,p=b.p,e=b.e;
  for(const n of b.nums){n.t--;n.y-=.5;}b.nums=b.nums.filter(n=>n.t>0);
  for(const u of b.bursts)u.t++;b.bursts=b.bursts.filter(u=>u.t<14);for(const u of b.bolts)u.t--;b.bolts=b.bolts.filter(u=>u.t>0);
  if(b.moveFx)b.moveFx=b.moveFx.filter(fx=>{fx.update(1/60);return!fx.done();});
  if(b.white>0)b.white--;if(b.impFrame>0)b.impFrame--;if(b.fullCombo&&--b.fullCombo.t<=0)b.fullCombo=null;if(b.phaseMsg&&--b.phaseMsg.l<=0)b.phaseMsg=null;
  if(b.flash){b.flash.t--;if(G.t%2===0)b.parts.push({x:b.flash.f.x+rnd(-20,20),y:b.flash.f.y-rnd(0,100),vx:0,vy:-2,l:16,c:'#ffd23a',s:3});
    for(const q of b.parts){q.x+=q.vx;q.y+=q.vy;q.l--;}b.parts=b.parts.filter(q=>q.l>0);if(b.flash.t<=0)b.flash=null;return;}
  if(b.hitstop>0){b.hitstop--;return;}
  if(b.slow>0){b.slow--;if(b.slow%3!==0)return;if(b.slow===0)b.end=90;}
  if(b.shake>0){b.shake*=.85;if(b.shake<.3)b.shake=0;}
  for(const q of b.parts){q.x+=q.vx;q.y+=q.vy;if(q.grav)q.vy+=.15;q.l--;}b.parts=b.parts.filter(q=>q.l>0);
  if(b.comboT>0)b.comboT--;if(b.lastT>0&&p.state!=='attack')b.lastT--;if(b.small&&--b.small.l<=0)b.small=null;
  for(const f of[p,e]){if(f.comboT>0)f.comboT--;if(f.lastT>0&&f.state!=='attack')f.lastT--;if(f.fullCombo&&--f.fullCombo.t<=0)f.fullCombo=null;if(f.small&&--f.small.l<=0)f.small=null;}
  if(b.fleeCD>0)b.fleeCD--;fleeBtn.classList.toggle('cd',b.fleeCD>0);
  if(b.intro>0){b.intro--;if(b.intro===30)SFX.perfect();return;}
  const updFrz=f=>{const r=f.st8&&f.st8.freeze?.55:1;f.__frzRate=r;f.__frzAcc=(f.__frzAcc||0)+r;if(f.__frzAcc>=1){f.__frzAcc-=1;f.__frzAct=true;}else f.__frzAct=false;};
  updFrz(p);updFrz(e);
  if(p.__frzAct)Skills.tick();
  if(b.end>0){b.end--;stepF(p,e);stepF(e,p);if(b.end===0)finishBattle();return;}
  if(!b.result&&--b.time<=0){b.result=b.vs?(p.hp/p.maxHp===e.hp/e.maxHp?'draw':p.hp/p.maxHp>e.hp/e.maxHp?'win':'lose'):(p.hp/p.maxHp>=e.hp/e.maxHp?'win':'lose');b.msg={t:'TIME OVER',c:'#fff'};b.end=110;SFX.ko();}
  control(p,e);
  if(b.coach){const c=b.coach;c.t++;if(p.combo>=3||b.fullCombo)c.jCombo=1;if(p.state==='attack'&&p.move){const an=p.move.anim;if(an==='heavyslash')c.heavy=1;if(an==='kick'||an==='sweep')c.kick=1;if(p.move.skillId)c.skill=1;}if(p.state==='dodge'||p.state==='dash'||p.state==='backdash')c.dodge=1;if(['block','cblock','holdparry','parried','gstun'].includes(p.state))c.guard=1;}
  if(!b.result){if(b.vs)control(e,p);else if(e.rig)aiRig(e,p);else aiMon(e,p);}
  stepF(p,e);stepF(e,p);
  for(const pr of b.proj){pr.x+=pr.vx;pr.life--;if(pr.cd>0)pr.cd--;const t=pr.o===p?e:p;
    if(G.t%2===0)b.parts.push({x:pr.x-Math.sign(pr.vx)*pr.r,y:pr.y+rnd(-pr.r,pr.r)*.6,vx:-pr.vx*.2,vy:rnd(-.3,.3),l:14,c:pr.col,s:2});
    for(const q of b.proj)if(q!==pr&&q.o!==pr.o&&q.life>0&&Math.abs(q.x-pr.x)<q.r+pr.r){q.life=0;pr.life=0;sparks(pr.x,pr.y,'#fff',20);b.bursts.push({x:pr.x,y:pr.y,t:0,col:'#fff',big:1});SFX.hit(true);}
    if(pr.life>0&&pr.cd<=0&&Math.abs(pr.x-t.x)<t.hw+pr.r&&((t.onGround&&t.h<60)||(pr.y+pr.r>=t.y-t.h*(isCrouch(t)?.66:1)&&pr.y-pr.r<=t.y))&&t.state!=='down'&&t.state!=='ko'&&t.invuln<=0){
      applyHit(pr.o,t,pr.m,1/pr.hits,pr.x,pr.y,true,pr.seq);pr.hits--;pr.cd=8;if(pr.hits<=0)pr.life=0;}}
  b.proj=b.proj.filter(q=>q.life>0&&q.x>-30&&q.x<BW+30);
  const dx=e.x-p.x,min=p.hw+e.hw-8;
  // แยกตัวละครที่ซ้อนกัน — ถ้ามีคนติดผนัง ให้ดันอีกฝ่ายออกเต็มระยะ (กันติดมุม ตีไม่ได้/ออกไม่ได้) ทำงานแม้ลอยอยู่กลางอากาศ
  const WL=20,WR=BW-20,cornered=Math.abs(dx)<min&&[p.x,e.x].some(x=>x<=WL+3||x>=WR-3);
  if(Math.abs(dx)<min&&p.state!=='ko'&&e.state!=='ko'&&(cornered||(p.onGround&&e.onGround&&p.invuln<=0&&e.invuln<=0))){
    let s=Math.sign(dx);if(!s)s=p.x<BW/2?1:-1;   // ทับกันพอดี: ศัตรูไปฝั่งที่มีที่ว่าง
    const push=min-Math.abs(dx);let pp=push/2,ep=push/2;
    if(p.x-s*pp<WL||p.x-s*pp>WR){ep=push;pp=0;}else if(e.x+s*ep<WL||e.x+s*ep>WR){pp=push;ep=0;}
    p.x=clamp(p.x-s*pp,WL,WR);e.x=clamp(e.x+s*ep,WL,WR);}
}
function finishBattle(){
  if(BT.vs){finishVS();return;}
  if(typeof SND!=='undefined'&&(SND.musicName==='bgm_silva'||SND.musicName==='bgm_bbqy'||(BT.def&&BT.def.bgm&&SND.musicName===BT.def.bgm)))SND.music(null);
  const b=BT,foe=b.foe,d=b.def;wrap.classList.remove('battle');
  StatSync.mods=(b.p.mods||[]).filter(m=>m.ttl>0&&(m.id.startsWith('pot_')||m.id==='elixir'||m.id==='elixir2')).map(m=>Object.assign({},m));
  StatSync.invalidate('battleEnd');
  G.hp=Math.max(1,Math.round(b.p.hp));G.mp=b.p.mp;G.mpAcc=b.p.mpAcc;
  if(b.result==='flee'){
    foe.cool=d.immortal?60:CONFIG.flee.safeFrames;const dx=P.x-foe.x,dy=P.y-foe.y,dl=Math.hypot(dx,dy)||1;foe.x-=dx/dl*20;foe.y-=dy/dl*20;
    if(fleeBtn)fleeBtn.textContent='🏃 หนี';
    BT=null;G.mode='explore';
    if(d.immortal&&typeof onTrainingFinished==='function'&&onTrainingFinished()){}
    else setTimeout(()=>toast(d.immortal?'🚪 ออกจากโรงฝึกซ้อม — เดินเข้าหาหุ่นซ้อมได้ใหม่ทุกเมื่อ':'🏃 หนีสำเร็จ — ไม่ได้ EXP/ของ ศัตรูจะไม่ไล่ 4 วินาที'),50);
  }else if(b.result==='win'){
    if(fleeBtn)fleeBtn.textContent='🏃 หนี';
    foe.alive=false;if(foe.respawnable)foe.respawn=CONFIG.respawnFrames;Ency.kill(foe.kind);
    if(typeof Guild!=='undefined'&&Guild.onKill)Guild.onKill(foe.kind);
    const xp=Math.round(d.xp*(1+.15*(b.e.lv-1))*Prog.xpScale(b.e.lv)*(foe.elite?ELITE.xp:1)*Diff.cur().xp),cls=LootManager.classOf(d,foe.elite);
    const noRankDrop=(Z&&Z.colosseum)||(d.challenge&&foe.kind!=='duelist');
    // individual loot: one independent roll per player, spawned on the ground at the enemy's position, owned by that player
    const results=noRankDrop?[]:LootManager.rollForPlayers({tableId:d.loot,cls,level:b.e.lv,kind:foe.kind});
    if(d.boss&&!noRankDrop)for(const r of results)r.drops.push(...LootManager.pity(r.pid,foe.kind));
    for(const r of results)for(const dr of r.drops)if(dr.kind==='gold')dr.q=Math.max(1,Math.round(dr.q*Diff.cur().gold));
    let dropped=0;for(const r of results){const sp=LootManager.spawn(Z,foe.x,foe.y,r);if(r.pid==='P1')dropped+=sp.length;}
    const out={gold:0,mats:{},items:[],dropped};
    const ups=Prog.gainXP(xp);
    const eqExpK=d.boss||d.miniboss?CONFIG.equipExp.kill.boss:foe.elite?CONFIG.equipExp.kill.elite:CONFIG.equipExp.kill.normal;
    const eqExp=Math.round(rint(eqExpK[0],eqExpK[1])*(1+.12*Math.max(0,b.e.lv-1))*Diff.cur().xp),eqList=equipped();let eqUps=0;
    for(const eqIt of eqList)eqUps+=Equip.gainExp(eqIt,eqExp);
    const eqExpShown=Math.round(eqExp*(1+((G.talent&&TALENT_PASSIVE[G.talent]&&TALENT_PASSIVE[G.talent].eqXpMul)||0)));
    if(eqUps)setTimeout(()=>toast(`⚒️ อุปกรณ์ที่สวมใส่อัปเลเวล (+${eqExpShown} EXP)!`,2400),600);
    if(foe.kind==='rat'){const h=G.q.hunt;if(h.active&&!h.done){h.count++;if(h.count>=QUESTS.hunt.count)Quest.complete('hunt');else toast(`กำจัดหนูถ้ำ ${h.count}/3`);}}
    if(foe.kind==='kage'){G.flags.kageDown=1;G.flags.keyEra=1;Quest.advance('main1',4);setTimeout(()=>toast('🪨 ผนึกห้องบอสใน "ถ้ำหินโกเลม" (ทางใต้สุดของเมือง) คลายแล้ว',4500),1200);}
    if(foe.kind==='golem'){G.flags.golemDown=1;Quest.advance('main1',5);Quest.activate('lava');}
    if(foe.kind==='lavaking'){G.flags.lavaDown=1;Quest.advance('lava',3);for(const pt of Z.props)if(pt.k==='portal'||pt.k==='stairs')pt.locked=0;}
    if(foe.kind==='seraph')G.flags.seraphDown=1;
    if(Z&&Z.colosseum){foe.alive=false;foe.respawnable=false;
      if(Z.colosseum==='G'&&!Z.foes.some(f=>f.alive)){G.guildPromo=G.guildPromo||{};G.guildPromo.promo_g=1;setTimeout(()=>toast('🏆 เอาชนะผู้ท้าทาย Rank G ครบทั้ง 3 คนแล้ว! กลับไปเลื่อนเป็นแรงค์ G ที่กิลด์ได้เลย!',5000),800);}}
    if(foe.kind==='duelist'){const sw=Inv.addItem(newItem('w_bbqy','legendary',Math.max(1,G.level)));out.items.push(sw);G.flags.duelWon=1;G.flags.pendingBbqyWinDlg=1;foe.alive=false;G.skills.learned.add('bluejudge');setTimeout(()=>toast('🐉 ได้รับท่าสุดยอด: คำพิพากษาตาคราม — ตั้งช่อง 4 ที่หน้าสกิล (K)',5000),1500);}
    if(d.boss)setBossCD(foe.kind);
    if(Z.bossRoom&&d.boss){Z.cleared=1;for(const pt of Z.props)if(pt.k==='portal'||pt.k==='exitdoor')pt.locked=0;setTimeout(()=>toast('🔓 ผนึกห้องบอสคลายแล้ว — เก็บของแล้วออกทางประตูหรือพอร์ทัลได้',3500),400);}
    const newSk=Skills.check();
    BT=null;G.mode='explore';UI.lootPopup(out,`ชนะ! ${d.n} Lv.${b.e.lv}${foe.elite?' (หัวหน้า)':''}`,xp,ups,newSk,{eqExp:eqExpShown,eqUps,eqCnt:eqList.length});
  }else{
    const S=StatSync.get();G.hp=S.maxHP;G.mp=S.maxMP;foe.cool=200;if(foe.home){foe.x=foe.home.x;foe.y=foe.home.y;}
    const souls=Diff.cur().death==='bloodstain',pen=Diff.onDeath(Z.id,P.x,P.y);
    loadZone(TOWN);   // respawn in the safe town
    BT=null;G.mode='explore';setTimeout(()=>toast(souls?'💀 YOU DIED — '+(pen||'ไม่มีอะไรให้เสีย'):'พ่ายแพ้... ฟื้นที่เมือง Collawarrie (HP เต็ม)'+(pen?' · '+pen:''),5000),100);
  }
  Save.save();UI.hud();
}
/* ---------- ลานประลอง (VS 2 คนบนเครื่องเดียวกัน) ---------- */
function startVS(){G.vsPending=true;G.mode='trans';G.tt=0;SFX.hit(true);UI.close();G.mode='trans';}
function setupVS(wins,round){
  buildBattleBg('arena');
  // ทุกคนใช้ของของตัวเอง (อุปกรณ์ + สกิล + เลเวล) — ออนไลน์: ชุดของเพื่อนมาทาง G.vsOther
  const net=G.vsNet||null,rawMine=((G.look&&G.look.name)||'').trim();
  const mine=vsLoadout(),other=G.vsOther||null,defA=Stats.arena();
  const lo1=net==='guest'?other:mine, lo2=net?(net==='guest'?mine:other):null;   // โลคัล: P2 ใช้ชุดตั้งต้นของกลาง
  const n1=(lo1&&lo1.name)||(net==='guest'?(typeof Net!=='undefined'&&Net.lobby&&Net.lobby.hostName):rawMine)||(net?'เจ้าของห้อง':'P1');
  const n2=(lo2&&lo2.name)||(net==='host'?(typeof Net!=='undefined'&&Net.lobby&&Net.lobby.peerName):net==='guest'?rawMine:'P2')||(net?'เพื่อน':'P2');
  const nm=[n1,n2];
  const pack=(lo,defLook)=>lo?{S:vsLoadoutToS(lo),look:Object.assign({},lo.look,{weapon:lo.wpn}),wpn:lo.wpn,lv:lo.level,skills:lo.skills,talent:lo.talent||null}
    :{S:defA,look:Object.assign({},defLook,{weapon:CONFIG.arena.weapon}),wpn:CONFIG.arena.weapon,lv:defA.level,skills:CONFIG.arena.skills,talent:null};
  const A1=pack(lo1,Equip.look()),A2=pack(lo2,KAGE_LOOK);
  const mk=(X,o)=>mkF(Object.assign({rig:true,S:Object.assign({},X.S,{res:Object.assign({},X.S.res)}),hp:X.S.maxHP,maxHp:X.S.maxHP,dhp:X.S.maxHP,mp:0,sta:X.S.maxSTA,wpn:X.wpn,hw:14,h:100,lv:X.lv,ult:0,ultKeys:new Set(),flask:FLASK.uses,mana:FLASK.uses,comboShow:0,comboT:0,lastMove:null,lastT:0,fullCombo:null,small:null,talent:X.talent||null,moves:null,cdMul:1,spdMul:1},o));
  const p=mk(A1,{x:BW/2-160,dir:1,isP:true,keys:VSKN1,look:A1.look,name:'P1',vsName:nm[0],skillSet:A1.skills,skk:VSS1,cd:{},mp:A1.S.maxMP});
  const e=mk(A2,{x:BW/2+160,dir:-1,isP2:true,keys:VSKN2,look:A2.look,name:'P2',vsName:nm[1],skillSet:A2.skills,skk:VSKN2_SK,cd:{},mp:A2.S.maxMP});
  if(p.talent==='vampire'||(p.skillSet&&p.skillSet.includes('blooddrain')))applyVampireCurse(e);
  if(e.talent==='vampire'||(e.skillSet&&e.skillSet.includes('blooddrain')))applyVampireCurse(p);
  BT={net:G.vsNet||null,vs:{wins:wins.slice(),round},foe:null,def:{},p,e,proj:[],parts:[],nums:[],bursts:[],bolts:[],pillars:[],moveFx:[],hitstop:0,shake:0,intro:90,end:0,slow:0,result:null,msg:null,small:null,lastMove:null,lastT:0,
    comboT:0,comboShow:0,flash:null,time:99*60,white:0,fullCombo:null,phaseMsg:null,fleeCD:0};
  wrap.classList.add('battle','vs');G.mode='battle';
}
function finishVS(){
  const b=BT,v=b.vs;wrap.classList.remove('battle','vs');
  if(b.result==='win')v.wins[0]++;else if(b.result==='lose')v.wins[1]++;
  const need=CONFIG.arena.rounds,done=v.wins[0]>=need||v.wins[1]>=need;
  const net=b.net,names=[b.p.vsName||'P1',b.e.vsName||'P2'];
  if(!done){if(net==='host'){Net.rid++;Net.tx({t:'round',rid:Net.rid,wins:v.wins,round:v.round+1});}setupVS(v.wins,v.round+1);return;}   // ยกต่อไป
  const w=v.wins[0]>v.wins[1]?'P1':'P2';
  if(net==='host'){Net.tx({t:'end',w,wins:v.wins,names});Net.endBattle();}
  BT=null;G.mode='menu';UI.vsResult(w,v.wins,net,names);
}
/* ---------- poses ---------- */
function poseFor(f){
  const P=poseIdle(G.t+(f.isP?0:40)),lp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],ln=(a,b,t)=>a+(b-a)*t;
  const W0=WEAPONS[f.wpn];if(W0&&W0.thrust)P.wa=-.25;
  switch(f.state){
    case'walk':{const ph=f.walkT*.22;P.ff=[3+4*Math.sin(ph),-Math.max(0,Math.cos(ph))*2.5];P.bf=[-2-4*Math.sin(ph),-Math.max(0,-Math.cos(ph))*2.5];P.hip=-14-Math.abs(Math.sin(ph))*.6;break;}
    case'crouch':case'getup':P.hip=-9;P.lean=.3;P.ff=[6,0];P.bf=[-5,0];P.fh=[7,2];P.bh=[3,5];break;
    case'cblock':P.hip=-9;P.lean=.2;P.ff=[6,0];P.bf=[-5,0];P.fh=[6,-3];P.bh=[5,-1];P.wa=-1.5;break;
    case'block':case'holdparry':P.lean=-.12;P.fh=[5,-4];P.bh=[4,-1];P.wa=-1.5;break;
    case'gstun':if(f.gc){P.hip=-9;P.lean=.15;P.ff=[6,0];P.bf=[-5,0];}else P.lean=-.2;P.fh=[5,-3];P.bh=[4,-1];P.wa=-1.5;break;
    case'prejump':case'land':P.hip=-10;P.lean=.2;P.ff=[5,0];P.bf=[-5,0];break;
    case'air':if(f.vy<0){P.ff=[4,-6];P.bf=[-3,-2];P.fh=[5,-3];P.bh=[-3,1];}else{P.ff=[4,-3];P.bf=[-4,-1];P.fh=[6,0];P.bh=[-2,3];}break;
    case'dash':P.lean=.55;P.hip=-12;P.ff=[9,0];P.bf=[-8,-2];P.fh=[3,7];P.bh=[-7,4];P.wa=2.6;break;
    case'backdash':P.lean=-.3;P.ff=[3,-3];P.bf=[-6,0];P.fh=[3,4];break;
    case'dodge':P.lean=1.1;P.hip=-7;P.ff=[5,-1];P.bf=[-2,-2];P.fh=[5,6];P.bh=[3,7];break;
    case'hurt':case'parried':P.lean=-.4;P.fh=[-2,7];P.bh=[-5,5];P.head=-.3;P.ff=[4,0];P.bf=[-5,0];P.wa=2;break;
    case'stun':P.lean=-.25+Math.sin(G.t*.12)*.15;P.hip=-12;P.fh=[0,8];P.bh=[-3,8];P.head=.35;P.wa=2;break;
    case'airhurt':P.lean=-1.1;P.hip=-12;P.fh=[-6,2];P.bh=[-8,-1];P.ff=[7,-6];P.bf=[5,-2];P.head=-.3;P.wa=2.4;break;
    case'down':case'ko':P.lean=-1.5;P.hip=-3;P.ff=[11,0];P.bf=[9,0];P.fh=[-1,3];P.bh=[2,3];P.wa=1.6;break;
    case'attack':{
      const m=f.move,ph=f.phase,Sx=ph==='startup',A=ph==='active',u=Sx?Math.min(1,f.pt/Math.max(1,atkStartup(f,m))):A?f.pt/Math.max(1,m.a):f.pt/Math.max(1,atkRecovery(f,m));
      if(!f.onGround){P.hip=-14;P.ff=[4,-5];P.bf=[-3,-3];}
      switch(m.anim){
        case'jab':case'cjab':if(m.anim==='cjab'){P.hip=-9;P.lean=.3;P.ff=[6,0];P.bf=[-5,0];}P.lean+=.1;P.fh=Sx?[4,1]:A?[11,0]:lp([11,0],[6,1],u);break;
        case'straight':P.lean=Sx?.05:A?.35:ln(.35,.08,u);P.bh=Sx?[-2,4]:A?[11,-.5]:lp([11,-.5],[2,5],u);P.fh=[3,5];P.ff=[7,0];break;
        case'upper':P.hip=Sx?-11:A?-15.5:-14;P.lean=A?-.15:.1;P.fh=Sx?[2,6]:A?[3,-10]:lp([3,-10],[6,1],u);P.wa=-1.6;break;
        case'kick':P.lean=Sx?-.1:A?-.45:ln(-.45,.08,u);P.bf=[-3,0];P.ff=Sx?lp([5,0],[4,-6],u):A?[14,-13]:lp([14,-13],[5,0],u);P.fh=[-1,5];P.bh=[-6,2];break;
        case'sweep':P.hip=-7;P.lean=.4;P.bf=[-4,0];P.ff=Sx?[4,-1]:A?[16,0]:lp([16,0],[6,0],u);P.fh=[5,9];P.bh=[1,9];break;
        case'airpunch':P.fh=Sx?[3,2]:A?[10,5]:[5,-2];P.lean=.2;break;
        case'airkick':P.lean=.25;P.ff=Sx?[3,-5]:A?[11,1]:[6,-3];P.bf=[-3,-4];P.fh=[-2,3];break;
        case'slash':case'slash2':{const rv=m.anim==='slash2',a0=rv?1:-2.2,a1=rv?-1.9:1,h0=rv?[9,3]:[-1,-6],h1=rv?[2,-6]:[9,3];
          P.lean=A?.22:.1;P.wa=Sx?a0:A?ln(a0,a1,u):a1;P.fh=Sx?h0:A?lp(h0,h1,u):h1;P.ff=[7,0];break;}
        case'thrust':P.lean=A?.4:.15;P.wa=0;P.fh=Sx?[0,3]:A?[12,0]:lp([12,0],[5,2],u);P.ff=[8,0];break;
        case'heavyslash':P.lean=Sx?-.2:A?ln(-.2,.45,u):.45;P.wa=Sx?-2.7:A?ln(-2.7,1.4,u):1.4;P.fh=Sx?[1,-10]:A?lp([1,-10],[10,5],u):[10,5];P.bh=[4,4];P.ff=[8,0];if(A)P.hip=-12;break;
        case'cast':P.lean=Sx?-.1:.25;P.fh=Sx?[-3,8]:[11,0];P.bh=Sx?[-4,9]:[10,1];P.ff=[7,0];P.bf=[-6,0];P.wa=Sx?2.2:.1;break;
        case'rising':P.lean=A?-.1:0;P.fh=Sx?[2,6]:[3,-11];P.bh=[-2,5];if(!Sx){P.ff=[3,-6];P.bf=[-2,-2];}P.hip=Sx?-10:-14;P.wa=-1.6;break;
        case'rush':{P.lean=.55;P.hip=-12;P.ff=[10,0];P.bf=[-9,0];const alt=(f.pt>>2)%2;if(m.kicks&&A){P.ff=alt?[15,-10]:[13,-4];P.fh=[2,5];break;}
          if(m.skillId==='luckyseven'){P.fh=A&&alt?[12,0]:[6,1];P.bh=A&&!alt?[10,2]:[2,5];P.wa=0;break;}
          if(m.skillId==='slashcut'){P.wa=alt?1.1:-2.0;P.fh=alt?[10,3]:[3,-6];P.bh=[2,5];break;}
          P.fh=(A&&alt)?[11,0]:[3,4];P.bh=(A&&!alt)?[11,1]:[1,6];P.wa=alt?0:-.5;break;}
        case'block':P.lean=-.1;P.fh=[5,-4];P.bh=[4,-1];P.wa=-1.5;break;
        case'beam':P.lean=Sx?-.15:.3;P.fh=Sx?[-3,8]:[11,0];P.bh=Sx?[-4,9]:[10,1];P.ff=[9,0];P.bf=[-8,0];P.hip=Sx?-12:-13;P.wa=Sx?2.2:.1;break;
      }
    }
  }
  return P;
}
/* ---------- draw ---------- */
function drawMon(f,tint){
  const d=f.def,sc=d.sc,map=SPR[d.map]||GOLEM,pal=PAL[d.pal],nf=d.noFlip||(map===GOLEM&&!(typeof RIG_HD!=='undefined'&&RIG_HD.on));let x=f.x,y=f.y;
  if(d.hover&&f.state!=='down'&&f.state!=='ko')y-=14+Math.round(Math.sin(G.t*.07)*3);
  if(f.state==='attack'){if(f.phase==='startup')x-=f.dir*3;else if(f.phase==='active')x+=f.dir*6;}
  if(f.state==='hurt')x+=rnd(-1.5,1.5);if(f.state==='walk')y-=Math.round(Math.abs(Math.sin(G.t*.25))*2);if(f.state==='stun')x+=Math.sin(G.t*.3)*1.5;
  const lying=f.state==='down'||f.state==='ko'||f.state==='airhurt';
  const ai=AS.has('mon_'+f.kind),mh=ai?Math.max(map.length*sc,d.boss?110:48):map.length*sc,sq=f.state==='attack'&&f.phase==='startup'?1.06:1;
  const dm=(X,Y)=>ai?AS.mon(g,f.kind,X,Y,mh*sq,f.dir<0&&!nf,tint):spr(g,map,pal,X,Y,sc,f.dir<0&&!nf,tint,f);
  if(lying){g.save();g.translate(x,y);g.rotate(-f.dir*(f.state==='airhurt'?.6:1.3));dm(0,0);g.restore();}
  else dm(x,y);
  if(f.weakT>0&&d.weakPoint&&!lying){const p=(Math.sin(G.t*.3)+1)/2;g.fillStyle=`rgba(90,255,176,${.38+p*.32})`;g.beginPath();g.arc(x,y-sc*(d.weakY||6.5),sc*2.2+p*3,0,7);g.fill();}
  if(f.state==='attack'&&f.phase==='active'&&!f.move.proj&&!f.move.quake&&!f.move.rain&&!f.move.beam){const m=f.move,cx=f.x+f.dir*f.hw*.5,cy=f.y-m.hy,r=Math.max(16,m.reach*.6),a0=f.dir>0?-1:Math.PI-.7,a1=f.dir>0?.7:Math.PI+1;
    g.save();g.strokeStyle=ELC[m.el||(d&&d.el)]||'#ff886a';g.globalAlpha=.32;g.lineWidth=7;g.beginPath();g.arc(cx,cy,r,a0,a1);g.stroke();
    g.strokeStyle='#ffe6d8';g.globalAlpha=.58;g.lineWidth=2.5;g.beginPath();g.arc(cx,cy,r-1.5,a0,a1);g.stroke();g.restore();}
}
/* วงเวทย์รูนเอเธอร์ใต้เท้าเวลาใช้สกิล/ร่ายเวท (โทนสีนุ่ม ไม่แสบตา) */
function drawSkillCircle(f,m,col){
  const u=f.phase==='startup'?Math.min(1,f.pt/Math.max(1,m.s)):f.phase==='active'?1:Math.max(0,1-f.pt/Math.max(1,m.r));
  if(u<=.04)return;
  const rx=(m.super?38:28)*(.65+.35*u),ry=rx*.32,rot=G.t*.045*(f.dir||1),al=(m.super?.46:.38)*u;
  g.save();g.translate(f.x,GY);
  // รัศมีพื้นนุ่มๆ
  const gr=g.createRadialGradient(0,0,2,0,0,rx*1.25);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');
  g.globalAlpha=al*.42;g.fillStyle=gr;g.beginPath();g.ellipse(0,0,rx*1.25,ry*1.25,0,0,7);g.fill();
  // วงแหวนรูน 2 ชั้น + ดาวหกแฉกหมุนในระนาบพื้น
  g.strokeStyle=col;g.globalAlpha=al;g.lineWidth=1.4;
  g.beginPath();g.ellipse(0,0,rx,ry,0,0,7);g.stroke();
  g.globalAlpha=al*.72;g.lineWidth=1;
  g.beginPath();g.ellipse(0,0,rx*.68,ry*.68,0,0,7);g.stroke();
  g.beginPath();
  for(let t=0;t<2;t++){for(let i=0;i<=3;i++){const a=rot+t*Math.PI/3+i*Math.PI*2/3,px=Math.cos(a)*rx*.86,py=Math.sin(a)*ry*.86;if(i===0)g.moveTo(px,py);else g.lineTo(px,py);}}
  g.stroke();
  // ละอองรูนลอยขึ้นรอบวงเวทย์
  for(let i=0;i<4;i++){const a=rot*1.3+i*1.57,lift=((G.t*.4+i*7)%18),px=Math.cos(a)*rx*.82,py=Math.sin(a)*ry*.82-lift;
    g.globalAlpha=al*(1-lift/18)*.85;g.fillStyle='#fff4d8';g.fillRect(px-.8,py-.8,1.6,1.6);}
  g.restore();
}
const hasChaosBlade=f=>!!(f&&(f.wpn==='bbqysword'||(f.look&&f.look.wshape==='chaosblade')||f.kind==='duelist'));
const hasLightless=f=>!!(f&&f.look&&f.look.wfxKind==='lightless');
function drawFighterB(f){
  const hgt=Math.max(0,GY-f.y),shR=(f.kind==='golem'||f.kind==='lavaking'||f.kind==='seraph'?48:f.kind==='icegolem'?40:f.h<60?26:20)*Math.max(.38,1-hgt/150);
  g.save();g.fillStyle='rgba(4,2,10,.28)';g.beginPath();g.ellipse(f.x,GY+1,shR*1.25,shR*.28,0,0,7);g.fill();
  g.fillStyle='rgba(4,2,10,.52)';g.beginPath();g.ellipse(f.x,GY,shR*.85,shR*.19,0,0,7);g.fill();g.restore();
  if(hasLightless(f)){
    // Lightless Aura: วงแหวนพื้นสีดำ-ขาว (เงาดำกลืนแสงตัดกับเส้นรัศมีสีขาว)
    const ang=(G.t*.065)%6.283;g.save();
    g.globalAlpha=.42;g.fillStyle='#060609';g.beginPath();g.ellipse(f.x,GY-1,33,10.5,0,0,7);g.fill();
    g.globalAlpha=.72;
    for(let i=-1;i<=1;i++){const sx=f.x+i*12+Math.sin(G.t*.09+i)*2.5,sy=GY-2-Math.abs(Math.cos(G.t*.11+i*2))*3;
      g.fillStyle=i===0?'#ffffff':'#0c0c12';g.beginPath();g.arc(sx,sy,5.2+Math.sin(G.t*.1+i),0,7);g.fill();
      g.strokeStyle=i===0?'#0a0a0f':'#ffffff';g.lineWidth=1.2;g.stroke();}
    g.translate(f.x,GY-4);g.rotate(-.22);
    g.globalAlpha=.68;g.strokeStyle='#08080c';g.lineWidth=5.5;g.beginPath();g.ellipse(0,0,30,9.5,0,0,7);g.stroke();
    g.globalAlpha=.94;g.strokeStyle='#ffffff';g.lineWidth=3;g.beginPath();g.ellipse(0,0,30,9.5,0,ang,ang+3.1);g.stroke();
    g.globalAlpha=.85;g.strokeStyle='#14141c';g.lineWidth=2;g.beginPath();g.ellipse(0,0,30,9.5,0,ang+Math.PI,ang+Math.PI+2.4);g.stroke();
    g.globalAlpha=.84;g.strokeStyle='#ffffff';g.lineWidth=1.3;g.setLineDash([4,4]);
    g.beginPath();g.ellipse(0,0,22,6.8,0,-ang,-ang+6.283);g.stroke();g.setLineDash([]);
    g.restore();
    if(G.t%4===0)BT.parts.push({x:f.x+rnd(-26,26),y:GY-rnd(1,10),vx:rnd(-.3,.3),vy:-.75,l:18,c:G.t%8?'#ffffff':'#14141a',s:2});
  }
  if(hasChaosBlade(f)){
    // Chaos Blade Aura: วงแหวนเอียงสีม่วง-ชมพู + วงจรปะสีฟ้าไซอัน + ควันไฟและละอองพลังงาน
    const ang=(G.t*.065)%6.283;g.save();
    g.globalAlpha=.18;g.fillStyle='#b45cff';g.beginPath();g.ellipse(f.x,GY-1,33,10.5,0,0,7);g.fill();
    g.globalAlpha=.36;g.fillStyle='#5a1fa8';
    for(let i=-1;i<=1;i++){const sx=f.x+i*12+Math.sin(G.t*.09+i)*2.5,sy=GY-2-Math.abs(Math.cos(G.t*.11+i*2))*3;
      g.beginPath();g.arc(sx,sy,5.5+Math.sin(G.t*.1+i),0,7);g.fill();}
    g.translate(f.x,GY-4);g.rotate(-.22);
    g.globalAlpha=.38;g.strokeStyle='#3b1d73';g.lineWidth=5.5;g.beginPath();g.ellipse(0,0,30,9.5,0,0,7);g.stroke();
    g.globalAlpha=.72;g.strokeStyle='#a64df0';g.lineWidth=3;g.beginPath();g.ellipse(0,0,30,9.5,0,ang,ang+3.1);g.stroke();
    g.globalAlpha=.92;g.strokeStyle='#ffd6ff';g.lineWidth=1.8;g.beginPath();g.ellipse(0,0,30,9.5,0,ang+.25,ang+1.45);g.stroke();
    g.globalAlpha=.72;g.strokeStyle='#35d6e6';g.lineWidth=1.3;g.setLineDash([4,4]);
    g.beginPath();g.ellipse(0,0,22,6.8,0,-ang,-ang+6.283);g.stroke();g.setLineDash([]);
    g.restore();
    if(G.t%4===0)BT.parts.push({x:f.x+rnd(-26,26),y:GY-rnd(1,10),vx:rnd(-.3,.3),vy:-.75,l:18,c:G.t%8?'#e2b3ff':'#5ff0ff',s:2});
  }
  const m=f.move,wCol=f.rig&&WEAPONS[f.wpn]?WEAPONS[f.wpn].fx:'#ff8a6a',skCol=(m&&ELC[m.el])||wCol||'#7ad8ff';
  // วาดวงเวทย์เอเธอร์บนพื้นเมื่อกดสกิล / ร่ายเวท / ท่าไม้ตาย / บัฟ
  if(f.state==='attack'&&m&&(m.skillId||m.anim==='cast'||m.beam||m.super||m.rain||m.quake||m.strike||m.buff))drawSkillCircle(f,m,skCol);
  const drawDome=(col,fillCol,lw,rx,ry)=>{const cx=f.x,cy=f.y-f.h*.5,sh=Math.sin(G.t*.15)*.12;g.save();
    g.fillStyle=fillCol;g.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;g[i?'lineTo':'moveTo'](cx+Math.cos(a)*rx,cy+Math.sin(a)*ry);}g.closePath();g.fill();
    g.strokeStyle=col;g.lineWidth=lw;g.stroke();
    g.strokeStyle='rgba(255,255,255,.78)';g.lineWidth=1.5;g.beginPath();g.ellipse(cx,cy,rx*.86,ry*.86,0,-2.6+sh,-1.0+sh);g.stroke();
    g.fillStyle='#ffffff';const ga=G.t*.07;g.fillRect((cx+Math.cos(ga)*rx)|0,(cy+Math.sin(ga)*ry)|0,3,3);g.fillRect((cx+Math.cos(ga+3.14)*rx)|0,(cy+Math.sin(ga+3.14)*ry)|0,3,3);g.restore();};
  if(f.invuln>0&&f.buffT>0)drawDome('rgba(122,240,192,.82)','rgba(122,240,192,.14)',2.2,f.hw+15,f.h*.56);
  if(f.armorBuff>0&&!(f.invuln>0&&f.buffT>0))drawDome('rgba(159,208,255,.72)','rgba(120,185,255,.12)',2,f.hw+14,f.h*.55);
  if(f.kingAuraT>0){g.save();g.strokeStyle='rgba(180,90,255,.7)';g.lineWidth=2;g.beginPath();g.ellipse(f.x,GY-1,26+Math.sin(G.t*.18)*3,7,0,0,7);g.stroke();g.restore();}
  if(f.state==='holdparry'||f.parryBuffT>0)drawDome(f.state==='holdparry'?'rgba(220,248,255,.92)':'rgba(122,216,255,.6)','rgba(200,244,255,.16)',2.4,f.hw+13,f.h*.54);
  if(f.rootT>0){g.save();g.strokeStyle='#fff2a8';g.fillStyle='rgba(255,242,168,.22)';g.lineWidth=2;g.beginPath();g.ellipse(f.x,GY-3,22,7,0,0,7);g.fill();g.stroke();g.beginPath();g.ellipse(f.x,GY-12,18,5,0,0,7);g.stroke();g.restore();}
  if(f.state==='attack'&&m&&m.frostnova){
    const u=f.phase==='startup'?Math.min(1,f.pt/Math.max(1,m.s)):f.phase==='active'?1:Math.max(0,1-f.pt/Math.max(1,m.r));
    if(u>.05){const rMax=(m.reach||240)*.94,rx=rMax*u,ry=Math.round(rMax*.18)*u;g.save();
      g.globalAlpha=.26*u;g.fillStyle='#5cd8ff';g.beginPath();g.ellipse(f.x,GY-1,rx,ry,0,0,7);g.fill();
      g.globalAlpha=.72*u;g.strokeStyle='#8ef2ff';g.lineWidth=2.5;g.beginPath();g.ellipse(f.x,GY-1,rx,ry,0,0,7);g.stroke();
      g.globalAlpha=.9*u;g.strokeStyle='#ffffff';g.lineWidth=1.4;g.beginPath();g.ellipse(f.x,GY-1,rx*.78,ry*.78,0,0,7);g.stroke();
      for(let i=0;i<12;i++){const a=i*Math.PI/6+G.t*.02;g.strokeStyle='#bfefff';g.lineWidth=1.2;g.beginPath();g.moveTo(f.x+Math.cos(a)*rx*.28,GY-1+Math.sin(a)*ry*.28);g.lineTo(f.x+Math.cos(a)*rx,GY-1+Math.sin(a)*ry);g.stroke();}
      g.restore();}
  }
  let tint=null;
  if(f.flash>0&&f.flash%2)tint='rgba(255,244,220,.85)';
  else if(f.st8&&f.st8.freeze)tint='rgba(128,224,255,.45)';
  else if(!f.isP&&!f.isP2&&f.state==='attack'&&f.phase==='startup'&&G.t%8<2)tint='#ff6a5a';
  else if(f.state==='stun'&&G.t%14<3)tint='#ffe27a';
  else if((f.isP||f.isP2)&&inWindow(f)&&G.t%4<2)tint='#ffe27a';
  const ghost=f.invuln>0&&['dodge','backdash','getup','idle','walk'].includes(f.state);
  const drawFireAura=(layer)=>{if(!(f.fireShieldT>0))return;const fh=f.h||96,t=G.t;g.save();
    if(layer==='back'){
      const gr=g.createRadialGradient(f.x,f.y-fh*.5,8,f.x,f.y-fh*.5,56);gr.addColorStop(0,'rgba(255,140,30,.48)');gr.addColorStop(.6,'rgba(220,50,10,.22)');gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr;g.beginPath();g.arc(f.x,f.y-fh*.5,56,0,7);g.fill();
      for(let i=0;i<8;i++){const a=i*.785+Math.sin(t*.12+i)*.3,rx=f.x+Math.sin(a+t*.05)*18,ry=f.y-12-((i*11+t*2.4)%Math.round(fh*.92)),sz=4+((i+Math.floor(t/4))%4)*2;
        g.fillStyle=i%3===0?'#b82208':i%2?'#ff5a14':'#ffaa22';g.fillRect((rx-sz)|0,(ry-sz)|0,sz*2,sz*2);
        g.fillStyle='#ffd84a';g.fillRect((rx-sz/2)|0,(ry-sz/2)|0,sz,sz);}
    }else{
      for(let i=0;i<7;i++){const u=(t*.06+i*1.37)%1,rx=f.x+Math.sin(t*.14+i*2.1)*(12+(i%3)*5),ry=f.y-6-u*fh*1.02,sz=Math.max(2,Math.round(6*(1-u*.7)));
        g.globalAlpha=.9*(1-u*.5);g.fillStyle=u<.25?'#fff6d0':u<.6?'#ffaa22':'#e83a10';g.fillRect((rx-sz/2)|0,(ry-sz/2)|0,sz,sz);
        if(u<.55){g.fillStyle='#ff6a18';g.fillRect((rx-sz)|0,(ry)|0,sz*2,2);}}
    }
    g.restore();};
  if(f.fireShieldT>0)drawFireAura('back');
  if(f.rig){const tc=WEAPONS[f.wpn]?ELC[WEAPONS[f.wpn].el]:'#fff',rsc=(f.def&&f.def.sc)||3;
    f.trail.forEach((tr,i)=>{if(!tr.P)return;g.globalAlpha=.14+i*.07;drawRig(g,tr.x,tr.y,rsc,tr.d||f.dir,tr.P,f.look,tr.c||tc);});g.globalAlpha=f.vanishT>0?.14:ghost?.5:1;
    drawRig(g,f.x,f.y,rsc,f.dir,poseFor(f),f.look,tint);g.globalAlpha=1;
    if(f.fireShieldT>0)drawFireAura('front');
    // เอฟเฟกต์คลื่นดาบและกระบวนท่าโจมตีแบบหลายเลเยอร์ (นุ่มนวล มีมิติ ไม่แสบตา)
    if(f.state==='attack'&&m&&f.phase==='active'&&!m.proj&&!m.beam){
      const cx=f.x+f.dir*8,cy=f.y-64,rv=m.anim==='slash2',big=m.anim==='heavyslash'||m.super,wLen=(WEAPONS[f.wpn]&&WEAPONS[f.wpn].len)||0;
      if(wLen&&['slash','slash2','heavyslash'].includes(m.anim)){
        const r=(big?30:24)+wLen*2.4,a0=f.dir>0?(rv?-.45:-2.1):(rv?Math.PI-1.35:Math.PI-1.15),a1=f.dir>0?(rv?1.75:1.15):(rv?Math.PI+.45:Math.PI+2.1);
        g.save();g.lineCap='round';
        if(hasLightless(f)){
    // Lightless Aura: วงแหวนพื้นสีดำ-ขาว (เงาดำกลืนแสงตัดกับเส้นรัศมีสีขาว)
    const ang=(G.t*.065)%6.283;g.save();
    g.globalAlpha=.42;g.fillStyle='#060609';g.beginPath();g.ellipse(f.x,GY-1,33,10.5,0,0,7);g.fill();
    g.globalAlpha=.72;
    for(let i=-1;i<=1;i++){const sx=f.x+i*12+Math.sin(G.t*.09+i)*2.5,sy=GY-2-Math.abs(Math.cos(G.t*.11+i*2))*3;
      g.fillStyle=i===0?'#ffffff':'#0c0c12';g.beginPath();g.arc(sx,sy,5.2+Math.sin(G.t*.1+i),0,7);g.fill();
      g.strokeStyle=i===0?'#0a0a0f':'#ffffff';g.lineWidth=1.2;g.stroke();}
    g.translate(f.x,GY-4);g.rotate(-.22);
    g.globalAlpha=.68;g.strokeStyle='#08080c';g.lineWidth=5.5;g.beginPath();g.ellipse(0,0,30,9.5,0,0,7);g.stroke();
    g.globalAlpha=.94;g.strokeStyle='#ffffff';g.lineWidth=3;g.beginPath();g.ellipse(0,0,30,9.5,0,ang,ang+3.1);g.stroke();
    g.globalAlpha=.85;g.strokeStyle='#14141c';g.lineWidth=2;g.beginPath();g.ellipse(0,0,30,9.5,0,ang+Math.PI,ang+Math.PI+2.4);g.stroke();
    g.globalAlpha=.84;g.strokeStyle='#ffffff';g.lineWidth=1.3;g.setLineDash([4,4]);
    g.beginPath();g.ellipse(0,0,22,6.8,0,-ang,-ang+6.283);g.stroke();g.setLineDash([]);
    g.restore();
    if(G.t%4===0)BT.parts.push({x:f.x+rnd(-26,26),y:GY-rnd(1,10),vx:rnd(-.3,.3),vy:-.75,l:18,c:G.t%8?'#ffffff':'#14141a',s:2});
  }
  if(hasChaosBlade(f)){
          // Chaos Blade Slash: คมดาบเสี้ยวม่วง-ขาว (#7a2bd6 -> #d28bff -> #ffffff) + ประกายสายฟ้าไซอัน
          const off=f.dir*(big?15:11);
          g.fillStyle='rgba(122,43,214,.62)';g.beginPath();g.arc(cx,cy,r+7,a0,a1);g.arc(cx-off*1.3,cy,Math.max(4,r-15),a1,a0,true);g.closePath();g.fill();
          g.fillStyle='rgba(210,139,255,.84)';g.beginPath();g.arc(cx,cy,r+4,a0+.06,a1-.06);g.arc(cx-off,cy,Math.max(4,r-9),a1-.06,a0+.06,true);g.closePath();g.fill();
          g.fillStyle='rgba(255,214,255,.92)';g.beginPath();g.arc(cx,cy,r+2,a0+.14,a1-.08);g.arc(cx-off*.55,cy,Math.max(4,r-4),a1-.08,a0+.14,true);g.closePath();g.fill();
          g.strokeStyle='#ffffff';g.globalAlpha=.98;g.lineWidth=big?4:3;g.beginPath();g.arc(cx,cy,r+1,a0+.18,a1-.08);g.stroke();
          for(let i=0;i<7;i++){const a=a0+(a1-a0)*(i+.2)/7;g.fillStyle=i%3===0?'#5ff0ff':i%2?'#ffffff':'#e2b3ff';g.fillRect((cx+Math.cos(a)*(r+6))|0,(cy+Math.sin(a)*(r+6))|0,3,3);}
        }else{
          // Smear Crescent Slash (ไล่จากคมขาวจ้าไปหางสีธาตุ + เส้นสปีดไลน์)
          const off=f.dir*(big?10:7);
          g.fillStyle='rgba(8,5,16,.38)';g.beginPath();g.arc(cx-f.dir*2,cy+3,r+5,a0,a1);g.arc(cx-off-f.dir*2,cy+3,Math.max(4,r-10),a1,a0,true);g.closePath();g.fill();
          g.fillStyle=skCol;g.globalAlpha=.42;g.beginPath();g.arc(cx,cy,r+4,a0,a1);g.arc(cx-off,cy,Math.max(4,r-11),a1,a0,true);g.closePath();g.fill();
          g.fillStyle=wCol;g.globalAlpha=.72;g.beginPath();g.arc(cx,cy,r+1,a0+.08,a1-.08);g.arc(cx-off*.7,cy,Math.max(4,r-6),a1-.08,a0+.08,true);g.closePath();g.fill();
          g.strokeStyle='#ffffff';g.globalAlpha=.88;g.lineWidth=big?3:2;g.beginPath();g.arc(cx,cy,r-1,a0+.15,a1-.1);g.stroke();
          for(let i=0;i<7;i++){const u=i/6,a=a0+(a1-a0)*u,sz=Math.max(2,Math.round((big?8:6)*u));g.globalAlpha=.35+u*.55;g.fillStyle=i>=5?'#ffffff':i>=3?wCol:skCol;g.fillRect((cx+Math.cos(a)*r-sz/2)|0,(cy+Math.sin(a)*r-sz/2)|0,sz,sz);}
          for(let i=0;i<5;i++){const a=a0+(a1-a0)*(i+.25)/5,px=cx+Math.cos(a)*(r+4),py=cy+Math.sin(a)*(r+4);g.globalAlpha=.55;g.strokeStyle='#fff6d8';g.lineWidth=1.5;g.beginPath();g.moveTo(px,py);g.lineTo(px-f.dir*14,py);g.stroke();}
        }
        if(big){g.strokeStyle=skCol;g.globalAlpha=.42;g.lineWidth=2;g.beginPath();g.ellipse(f.x+f.dir*(22+wLen*1.4),GY-1,18+wLen*.9,6,0,0,7);g.stroke();}
        g.restore();
      }else if(['thrust','rush','jab','straight'].includes(m.anim)){
        const tx=f.x+f.dir*18,ty=f.y-(m.anim==='cjab'?42:62),len=m.anim==='thrust'||m.anim==='rush'?22+wLen*2.6:24+wLen*1.2;
        g.save();g.strokeStyle=skCol;g.globalAlpha=.38;g.lineWidth=2;
        for(let k=0;k<2;k++){g.beginPath();g.ellipse(tx+f.dir*(10+k*12),ty,3.5,9-k*2,0,0,7);g.stroke();}
        const gr=g.createLinearGradient(tx,ty,tx+f.dir*len,ty);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.6,skCol);gr.addColorStop(1,'#fff8e6');
        g.fillStyle=gr;g.globalAlpha=.46;g.beginPath();g.moveTo(tx,ty-5);g.lineTo(tx+f.dir*len,ty);g.lineTo(tx,ty+5);g.closePath();g.fill();
        g.restore();
      }else if(['rising','upper'].includes(m.anim)){
        g.save();g.strokeStyle=skCol;g.lineWidth=2.5;
        for(let k=0;k<3;k++){const yy=f.y-18-k*22;g.globalAlpha=.42-k*.09;g.beginPath();g.ellipse(f.x+f.dir*6,yy,18-k*2,5,f.dir*-.18,0,Math.PI*1.35);g.stroke();}
        g.restore();
      }else if(['kick','sweep','airkick'].includes(m.anim)){
        const ky=m.anim==='sweep'?GY-4:f.y-54,kr=m.anim==='sweep'?34:28;
        g.save();g.strokeStyle=skCol;g.globalAlpha=.38;g.lineWidth=4;g.beginPath();
        if(m.anim==='sweep')g.ellipse(f.x+f.dir*10,ky,kr,8,0,f.dir>0?-.4:Math.PI-.8,f.dir>0?1.2:Math.PI+.4);
        else if(f.dir>0)g.arc(f.x+8,ky,kr,-1.2,.6);else g.arc(f.x-8,ky,kr,Math.PI-.6,Math.PI+1.2);
        g.stroke();g.restore();
      }
    }
    // คลื่นกระแทกพื้น (Quake) และฝนดาวตกเอเธอร์ (Rain)
    if(f.state==='attack'&&m&&f.phase==='active'&&m.quake){
      const u=f.pt/Math.max(1,m.a);g.save();g.strokeStyle=skCol;g.globalAlpha=(1-u)*.48;g.lineWidth=2.5;
      g.beginPath();g.ellipse(f.x+f.dir*42,GY-1,16+u*56,4+u*12,0,0,7);g.stroke();g.restore();
    }
    if(f.state==='attack'&&m&&m.beam&&m.dragon){const hx=f.x+f.dir*30,hy=f.y-70,
      u=f.phase==='startup'?f.pt/Math.max(1,m.s):f.phase==='active'?1:1-f.pt/Math.max(1,m.r);drawDragon(g,hx,hy-(f.phase==='startup'?(1-u)*30:0),f.dir,u,f.phase==='active'?1:u*.4,m.dragon);}
    if(f.state==='attack'&&m&&m.beam&&f.phase!=='recovery'){const el=m.beamCol||ELC[m.el]||'#7ad8ff',ey=f.def&&f.def.eye,dg=!!m.dragon,sp=!!m.spiritBeam,hx=dg?f.x+f.dir*30:f.x+f.dir*(ey?ey[0]+14:32),hy=dg?f.y-70:f.y-(ey?ey[1]-(f.def.hover?14:0):58);
      if(f.phase==='startup'){const u=f.pt/Math.max(1,m.s),r=4+u*(sp?16:11);g.save();g.fillStyle=el;g.globalAlpha=.48;g.beginPath();g.arc(hx,hy,r*1.45,0,7);g.fill();
        g.strokeStyle=el;g.globalAlpha=.65;g.lineWidth=sp?2:1.2;g.beginPath();g.arc(hx,hy,(sp?26:18)-u*12,0,7);g.stroke();
        g.fillStyle='#fff6e0';g.globalAlpha=.8;g.beginPath();g.arc(hx,hy,r*.48,0,7);g.fill();g.restore();}
      else{const w=(sp?30:19)+Math.sin(G.t*.65)*(sp?4:2.5),ex=f.dir>0?BW+20:-20,x0=Math.min(hx,ex),bw=Math.abs(ex-hx);
        g.save();
        if(sp){
          g.globalAlpha=.22;g.fillStyle='#1b82c4';g.fillRect(x0,hy-w*1.5,bw,w*3.0);
          g.globalAlpha=.42;g.fillStyle=el;g.beginPath();g.moveTo(hx,hy-w*.5);g.lineTo(ex,hy-w*1.35);g.lineTo(ex,hy+w*1.35);g.lineTo(hx,hy+w*.5);g.closePath();g.fill();
          g.globalAlpha=.76;g.fillStyle='#bffaff';g.fillRect(x0,hy-w*.55,bw,w*1.1);
          g.globalAlpha=.92;g.fillStyle='#ffffff';g.fillRect(x0,hy-w*.26,bw,w*.52);
          for(let si=0;si<10;si++){const spx=hx+f.dir*(((G.t*11+si*58)%Math.max(40,bw))),spy=hy+Math.sin(si*2.3+G.t*.2)*w*1.1;
            g.fillStyle=si%3===0?'#1f2c3d':si%2?'#42e8ff':'#e8ffff';g.globalAlpha=.82;
            g.beginPath();g.moveTo(spx+f.dir*7,spy);g.lineTo(spx-f.dir*5,spy-3);g.lineTo(spx-f.dir*3,spy+3);g.closePath();g.fill();}
          g.strokeStyle='#ffffff';g.globalAlpha=.55;g.lineWidth=2;g.beginPath();g.ellipse(hx+f.dir*8,hy,7,w*1.2,0,0,7);g.stroke();
        }else{
          g.globalAlpha=.24;g.fillStyle=el;g.fillRect(x0,hy-w*1.35,bw,w*2.7);
          g.globalAlpha=.48;g.fillStyle=el;g.fillRect(x0,hy-w*.8,bw,w*1.6);
          g.globalAlpha=.62;g.fillStyle='#fff8e8';g.fillRect(x0,hy-w*.32,bw,w*.64);
          g.strokeStyle='#fff8e8';g.globalAlpha=.36;g.lineWidth=1.4;
          for(let rx=((G.t*6)%36);rx<bw;rx+=36){const px=hx+f.dir*rx;g.beginPath();g.ellipse(px,hy,4,w*.95,0,0,7);g.stroke();}
        }
        g.globalAlpha=.58;g.fillStyle=el;g.beginPath();g.arc(hx,hy,w*(dg?.6:1.15),0,7);g.fill();g.restore();}}
    if(f.buffT>0||f.drinkT>0){
      const bc=f.drinkT>0?'rgba(130,240,165,.42)':'rgba(155,208,255,.42)',t=G.t*.08;
      g.save();g.strokeStyle=bc;g.lineWidth=1.6;g.beginPath();g.ellipse(f.x,GY-1,20,6,0,0,7);g.stroke();
      for(let k=0;k<2;k++){g.beginPath();for(let y=0;y<=72;y+=6){const a=t+k*3.14+y*.08,px=f.x+Math.cos(a)*16,py=f.y-8-y;if(y===0)g.moveTo(px,py);else g.lineTo(px,py);}g.stroke();}
      g.restore();
    }
  }else{
    if(f.state==='attack'&&m&&(m.beam||m.rain||m.quake||m.skillId))drawSkillCircle(f,m,skCol);
    // ปีกแสงศักดิ์สิทธิ์กางเมื่อร่ายสกิลธาตุแสง (Holy Wings)
    if(f.state==='attack'&&m&&(m.el==='holy'||f.kind==='seraph')){
      const sp=1+.25*Math.sin(G.t*.2),wy=f.y-f.h*.58;g.save();g.globalAlpha=.52;
      for(const sd of[-1,1]){
        g.fillStyle='#fff2a8';g.beginPath();g.moveTo(f.x,wy);g.quadraticCurveTo(f.x+sd*64*sp,wy-54,f.x+sd*96*sp,wy-12);g.quadraticCurveTo(f.x+sd*62*sp,wy+14,f.x,wy+14);g.closePath();g.fill();
        g.strokeStyle='#ffffff';g.lineWidth=1.8;g.stroke();
      }g.restore();
    }
    g.globalAlpha=f.vanishT>0?.14:ghost?.5:1;drawMon(f,tint);g.globalAlpha=1;if(f.fireShieldT>0)drawFireAura('front');
  }
  if(['block','cblock','gstun'].includes(f.state)){const fresh=f.isP&&G.t-f.backPressT<=8,cy=f.y-(isCrouch(f)?36:56);
    g.save();g.strokeStyle=fresh?'rgba(248,220,128,.78)':'rgba(140,200,255,.48)';g.lineWidth=fresh?3.5:2;
    g.beginPath();if(f.dir>0)g.arc(f.x+6,cy,34,-1.1,1.1);else g.arc(f.x-6,cy,34,Math.PI-1.1,Math.PI+1.1);g.stroke();
    g.strokeStyle=fresh?'rgba(255,244,195,.35)':'rgba(140,200,255,.22)';g.lineWidth=1.2;
    g.beginPath();if(f.dir>0)g.arc(f.x+4,cy,30,-.85,.85);else g.arc(f.x-4,cy,30,Math.PI-.85,Math.PI+.85);g.stroke();g.restore();}
  if(f.st8&&f.st8.freeze){
    const fx=f.x,fy=f.y,fh=f.h||96,fw=f.hw||16,pts=[
      [fx-fw*1.25,fy-2,fx-fw*1.9,fy-fh*.36,fx-fw*.6,fy-fh*.28],
      [fx+fw*1.25,fy-2,fx+fw*1.9,fy-fh*.34,fx+fw*.6,fy-fh*.28],
      [fx-fw*.9,fy-fh*.38,fx-fw*1.55,fy-fh*.88,fx-fw*.25,fy-fh*.68],
      [fx+fw*.9,fy-fh*.38,fx+fw*1.55,fy-fh*.86,fx+fw*.25,fy-fh*.68],
      [fx-fw*.55,fy-fh*.7,fx,fy-fh*1.12,fx+fw*.55,fy-fh*.7]
    ];
    g.save();
    for(const[x1,y1,x2,y2,x3,y3]of pts){
      g.globalAlpha=.72;g.fillStyle='#2a94e8';g.strokeStyle='#154888';g.lineWidth=1.5;
      g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.lineTo(x3,y3);g.closePath();g.fill();g.stroke();
      g.globalAlpha=.85;g.fillStyle='#8ef2ff';
      g.beginPath();g.moveTo((x1+x3)/2,(y1+y3)/2);g.lineTo(x2,y2);g.lineTo(x3,y3);g.closePath();g.fill();
      g.fillStyle='#ffffff';g.fillRect((x2-1)|0,(y2-1)|0,3,3);
    }
    for(let i=0;i<4;i++){const sx=fx+Math.sin(G.t*.1+i*1.9)*fw*1.5,sy=fy-fh*(.2+.2*i);g.globalAlpha=.95;g.fillStyle='#ffffff';g.fillRect((sx-3)|0,sy|0,7,1.5);g.fillRect(sx|0,(sy-3)|0,1.5,7);}
    g.restore();
    g.save();g.font='700 11px Sarabun,sans-serif';g.textAlign='center';g.fillStyle='#0a2238';g.fillText(`❄️ ${f.st8.freeze.hits||0}/5`,fx+1,fy-fh-13);g.fillStyle='#bff6ff';g.fillText(`❄️ ${f.st8.freeze.hits||0}/5`,fx,fy-fh-14);g.restore();
  }
  if(f.state==='stun'||f.state==='parried')for(let i=0;i<3;i++){const a=G.t*.12+i*2.1;g.fillStyle='#ffe27a';g.fillRect(f.x+Math.cos(a)*14,f.y-f.h-8+Math.sin(a)*3,3,3);}
}
function drawBurst(u){const k=u.t/14,r=(u.big?40:24)*(.35+k);g.save();
  // 1) Dome Shockwave
  if(u.dome){
    const dr=r*1.5,dy=Math.min(GY,u.y+22);
    g.globalAlpha=(1-k)*.22;g.fillStyle=u.col;g.beginPath();g.arc(u.x,dy,dr,Math.PI,0);g.closePath();g.fill();
    g.globalAlpha=(1-k)*.6;g.strokeStyle='#ffffff';g.lineWidth=2;g.beginPath();g.arc(u.x,dy,dr,Math.PI,0);g.stroke();
    g.globalAlpha=(1-k)*.5;g.strokeStyle=u.col;g.lineWidth=2.5;g.beginPath();g.ellipse(u.x,dy,dr,dr*.22,0,0,7);g.stroke();
  }
  // 2) Explosion Puffs
  if(u.exp){
    const puffs=[[-10,-8,11],[9,-5,10],[0,-13,12],[-4,4,8],[6,3,8]];
    for(const[ox,oy,pr]of puffs){
      const px=(u.x+ox*(.45+k*1.25))|0,py=(u.y+oy*(.45+k*1.25))|0,sz=Math.max(2,Math.round(pr*(1-k*.72)));
      g.globalAlpha=(1-k)*.76;g.fillStyle=k<.22?'#ffffff':k<.5?'#ffe25a':k<.78?'#ff6a2a':'#4a2220';
      g.fillRect(px-sz,py-sz,sz*2,sz*2);
      if(k<.5){g.fillStyle='#ffffff';g.fillRect(px-(sz>>1),py-(sz>>1),sz,sz);}
    }
    g.globalAlpha=(1-k)*.48;g.strokeStyle='#ffb05a';g.lineWidth=2.5;g.beginPath();g.ellipse(u.x,Math.min(GY,u.y+18),r*1.28,r*.32,0,0,7);g.stroke();
  }
  // 3) Pixel Starburst (ช่วงต้น k<0.45) + Ring of 6 Elemental Sub-Bursts (k>=0.2 ตามแบบสไปรต์ชีต)
  if(u.star||k<.45){
    const sr=r*(u.star?1.45:1.05),sw=Math.max(2,(1-k)*(u.star?8:5));g.globalAlpha=(1-k)*.92;g.fillStyle='#ffffff';
    g.beginPath();g.moveTo(u.x-sr,u.y);g.lineTo(u.x,u.y-sw);g.lineTo(u.x+sr,u.y);g.lineTo(u.x,u.y+sw);g.closePath();g.fill();
    g.beginPath();g.moveTo(u.x,u.y-sr*.85);g.lineTo(u.x+sw,u.y);g.lineTo(u.x,u.y+sr*.85);g.lineTo(u.x-sw,u.y);g.closePath();g.fill();
  }
  if(k>=.2){
    const rk=r*.88,n=6;
    for(let i=0;i<n;i++){
      const a=i/n*6.283+u.t*.08,bx=(u.x+Math.cos(a)*rk)|0,by=(u.y+Math.sin(a)*rk)|0,bs=Math.max(2,Math.round((u.big?7:5)*(1-k)));
      g.globalAlpha=(1-k)*.9;g.fillStyle=u.col;
      g.fillRect(bx-bs,by-1,bs*2+1,3);g.fillRect(bx-1,by-bs,3,bs*2+1);
      g.fillStyle='#ffffff';g.fillRect(bx-1,by-1,3,3);
    }
  }
  g.globalAlpha=(1-k)*.6;g.strokeStyle=u.col;g.lineWidth=u.big?3:2;
  g.beginPath();g.arc(u.x|0,u.y|0,r*.9,0,7);g.stroke();
  g.globalAlpha=(1-k)*.82;g.lineWidth=u.big?2.4:1.6;g.beginPath();
  for(let i=0;i<8;i++){const a=i/8*6.283+u.t*.06;g.moveTo((u.x+Math.cos(a)*r*.28)|0,(u.y+Math.sin(a)*r*.28)|0);g.lineTo((u.x+Math.cos(a)*r)|0,(u.y+Math.sin(a)*r)|0);}g.stroke();
  g.restore();}
function drawBattle(){
  const b=BT;g.save();if(b.shake)g.translate(rnd(-b.shake,b.shake)|0,rnd(-b.shake,b.shake)|0);
  g.drawImage(bbC,0,0,W,H);drawTorch(g,62,86,2);drawTorch(g,418,86,2);if(FX.on)HD.atmos(g,buildBattleBg.last||'cave',G.t*.5,0);
  if(b.impFrame>0){g.save();g.globalCompositeOperation=b.impFrame%2?'difference':'screen';g.fillStyle=b.impFrame%2?'rgba(255,255,255,.35)':'rgba(255,245,210,.25)';g.fillRect(0,0,W,H);g.restore();}
  if(b.flash){g.fillStyle='rgba(6,5,16,.62)';g.fillRect(0,0,W,H);for(let i=0;i<10;i++){g.fillStyle='rgba(255,240,205,.08)';g.fillRect(0,(hash(i,G.t>>1)*H)|0,W,1);}}
  g.save();g.translate(0,GY*(1-BZ));g.scale(BZ,BZ);   // กล้องซูมออก: ตัวละคร/เอฟเฟกต์ทั้งหมดอยู่ในพิกัดโลก 0..BW
  if(b.moveFx)for(const fx of b.moveFx)fx.draw(g,'back');
  (b.p.state==='attack'?[b.e,b.p]:[b.p,b.e]).forEach(drawFighterB);
  if(b.moveFx)for(const fx of b.moveFx)fx.draw(g,'front');
  for(const pr of b.proj){
    g.save();g.fillStyle='rgba(4,2,10,.32)';g.beginPath();g.ellipse(pr.x,GY,pr.r*1.1,Math.max(2,pr.r*.28),0,0,7);g.fill();g.restore();
    if(pr.rock){g.fillStyle=pr.col;g.beginPath();g.arc(pr.x,pr.y,pr.r,0,7);g.fill();g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.arc(pr.x-3,pr.y-3,pr.r*.5,0,7);g.fill();continue;}
    const wob=Math.sin(G.t*.5)*1.2,d=Math.sign(pr.vx)||1,pel=pr.m&&pr.m.el;g.save();
    // Elemental Wisp Ribbon Trail + Pixel Projectile (ตรงตาม 5 ธาตุในสไปรต์ชีต)
    g.strokeStyle=pr.col;g.globalAlpha=.48;g.lineWidth=pr.r*.85;g.lineCap='round';g.beginPath();g.moveTo(pr.x,pr.y);
    for(let i=1;i<=5;i++)g.lineTo(pr.x-d*i*pr.r*.8,pr.y+Math.sin(G.t*.45+i*1.1)*pr.r*.45);g.stroke();
    g.strokeStyle='#ffffff';g.globalAlpha=.6;g.lineWidth=Math.max(1.5,pr.r*.3);g.beginPath();g.moveTo(pr.x,pr.y);
    for(let i=1;i<=4;i++)g.lineTo(pr.x-d*i*pr.r*.65,pr.y+Math.sin(G.t*.45+i*1.1)*pr.r*.3);g.stroke();
    if(pr.wind){
      g.fillStyle='rgba(80,255,180,.35)';g.beginPath();g.arc(pr.x,pr.y,pr.r*1.5,d>0?-1.35:Math.PI-1.35,d>0?1.35:Math.PI+1.35);g.lineTo(pr.x-d*pr.r*.5,pr.y);g.closePath();g.fill();
      g.fillStyle='#a8ffd8';g.beginPath();g.arc(pr.x+d*3,pr.y,pr.r*1.2,d>0?-1.25:Math.PI-1.25,d>0?1.25:Math.PI+1.25);g.lineTo(pr.x-d*pr.r*.2,pr.y);g.closePath();g.fill();
      g.strokeStyle='#ffffff';g.lineWidth=2.5;g.beginPath();g.arc(pr.x+d*4,pr.y,pr.r*1.25,d>0?-1.2:Math.PI-1.2,d>0?1.2:Math.PI+1.2);g.stroke();
    }else if(pel==='poison'){
      g.fillStyle=pr.col;g.globalAlpha=.92;g.beginPath();g.arc(pr.x,pr.y,pr.r*1.15,d>0?-1.3:Math.PI-1.3,d>0?1.3:Math.PI+1.3);g.lineTo(pr.x-d*pr.r*.3,pr.y);g.closePath();g.fill();
      g.strokeStyle='#e8fff0';g.lineWidth=2;g.beginPath();g.arc(pr.x+d*2,pr.y,pr.r*.95,d>0?-1.1:Math.PI-1.1,d>0?1.1:Math.PI+1.1);g.stroke();
    }else if(pel==='holy'||pel==='phys'){
      g.fillStyle=pr.col;g.globalAlpha=.92;g.beginPath();g.moveTo(pr.x+d*pr.r*1.5,pr.y);g.lineTo(pr.x-d*pr.r*.8,pr.y-pr.r*.95);g.lineTo(pr.x-d*pr.r*.3,pr.y);g.lineTo(pr.x-d*pr.r*.8,pr.y+pr.r*.95);g.closePath();g.fill();
      g.fillStyle='#ffffff';g.fillRect((pr.x+d*pr.r*.2-2)|0,(pr.y-2)|0,4,4);
    }else{
      g.fillStyle=pr.col;g.globalAlpha=.3;g.beginPath();g.ellipse(pr.x-d*pr.r*.8,pr.y,pr.r*2.1+wob,pr.r*1.15,0,0,7);g.fill();
      g.globalAlpha=.75;g.beginPath();g.arc(pr.x,pr.y,pr.r+wob*.4,0,7);g.fill();
      if(pel==='lightning'||pel==='shadow'||pel==='arcane'){g.strokeStyle='#ffffff';g.lineWidth=1.5;g.beginPath();g.moveTo(pr.x-pr.r,pr.y-pr.r*.6);g.lineTo(pr.x,pr.y+pr.r*.4);g.lineTo(pr.x+pr.r,pr.y-pr.r*.5);g.stroke();}
      g.fillStyle='#fff8e6';g.globalAlpha=.85;g.beginPath();g.arc(pr.x+d*pr.r*.2,pr.y,pr.r*.48,0,7);g.fill();
    }
    g.restore();}
  for(const u of b.bolts){
    const al=u.t/14;g.save();
    // สายฟ้า 2 เลเยอร์ (รัศมีฟ้านุ่มด้านนอก + แกนกลางสีครีมสว่างพอดี ไม่จ้า) + วงแหวนจุดตกกระทบพื้น
    const pts=[[u.x,0]];let y=0,x=u.x;while(y<GY){y+=22;x+=Math.sin(y*.3+u.t)*7;pts.push([x,Math.min(GY,y)]);}
    g.strokeStyle='#6ad2ff';g.lineWidth=6;g.globalAlpha=al*.28;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();
    g.strokeStyle='#eef8ff';g.lineWidth=2;g.globalAlpha=al*.68;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();
    g.strokeStyle='#8ae0ff';g.lineWidth=1.5;g.globalAlpha=al*.45;g.beginPath();g.ellipse(x,GY-1,18*(1.2-al*.5),5*(1.2-al*.5),0,0,7);g.stroke();
    g.restore();
  }
  for(const q of b.parts){g.globalAlpha=Math.min(.85,q.l/14);g.fillStyle=q.c;const x=q.x|0,y=q.y|0,sz=q.s||2;
    if(q.cross){g.fillRect(x-sz,y,sz*3,sz);g.fillRect(x,y-sz,sz,sz*3);}
    else if(q.orb){g.fillRect(x-sz,y,sz*3,sz);g.fillRect(x,y-sz,sz,sz*3);g.fillStyle='#ffffff';g.fillRect(x,y,sz,sz);}
    else if(q.meteor){g.beginPath();g.moveTo(x,y);g.lineTo(x-q.vx*4,y-q.vy*4);g.strokeStyle=q.c;g.lineWidth=sz;g.stroke();g.fillStyle='#ffffff';g.fillRect(x-2,y-2,5,5);}
    else g.fillRect(x,y,sz,sz);}g.globalAlpha=1;
  for(const pl of b.pillars||[]){if(pl.delay>0){pl.delay--;continue;}pl.t--;pl.h=Math.min(pl.maxH,pl.h+14);
    const al=Math.min(1,pl.t/12),w=26,x=pl.x-w/2,y=GY-pl.h,pc=pl.col||'#5e564c',pel=pl.el;
    g.save();g.globalAlpha=al;
    if(pel==='fire'){
      // เสาเปลวไฟพิกเซลลุกโชติช่วง (ขาว → เหลือง → ส้ม)
      g.fillStyle='#ff5a1a';g.beginPath();g.moveTo(x-4,GY);g.quadraticCurveTo(x-6,y+pl.h*.4,pl.x+Math.sin(G.t*.4)*5,y);g.quadraticCurveTo(x+w+6,y+pl.h*.4,x+w+4,GY);g.closePath();g.fill();
      g.fillStyle='#ffd23a';g.beginPath();g.moveTo(x+3,GY);g.lineTo(pl.x+Math.cos(G.t*.5)*3,y+12);g.lineTo(x+w-3,GY);g.closePath();g.fill();
      g.fillStyle='#ffffff';g.fillRect(pl.x-3,GY-pl.h*.45,6,pl.h*.45);
    }else if(pel==='lightning'||pel==='shadow'||pel==='arcane'){
      // เสาพลังสายฟ้า/อาคมสีม่วงชมพู + แกนสว่าง
      g.strokeStyle=pc;g.lineWidth=8;g.globalAlpha=al*.4;g.beginPath();g.moveTo(pl.x,GY);for(let sy=GY;sy>=y;sy-=14)g.lineTo(pl.x+Math.sin(sy*.2+G.t*.6)*8,sy);g.stroke();
      g.strokeStyle='#ffffff';g.lineWidth=3;g.globalAlpha=al*.9;g.beginPath();g.moveTo(pl.x,GY);for(let sy=GY;sy>=y;sy-=14)g.lineTo(pl.x+Math.sin(sy*.2+G.t*.6)*6,sy);g.stroke();
      g.fillStyle=pc;g.fillRect(pl.x-5,y-3,10,6);
    }else if(pel==='ice'){
      // หอกน้ำแข็งผลึกแหลมหลายเหลี่ยม (สไตล์ Sprite Fusion: ขอบน้ำเงินเข้ม -> แกนไซอัน -> สันขาวจ้า + ประกายกากบาท)
      const hw=w*.56;
      g.fillStyle='#1964ad';g.strokeStyle='#0d3464';g.lineWidth=1.8;
      g.beginPath();g.moveTo(pl.x-hw,GY);g.lineTo(pl.x-hw*.55,y+pl.h*.34);g.lineTo(pl.x,y);g.lineTo(pl.x+hw*.55,y+pl.h*.34);g.lineTo(pl.x+hw,GY);g.closePath();g.fill();g.stroke();
      g.fillStyle='#4ed0ff';
      g.beginPath();g.moveTo(pl.x-hw*.2,GY);g.lineTo(pl.x,y);g.lineTo(pl.x+hw*.48,y+pl.h*.38);g.lineTo(pl.x+hw*.72,GY);g.closePath();g.fill();
      g.fillStyle='#ffffff';
      g.beginPath();g.moveTo(pl.x-2,GY-8);g.lineTo(pl.x,y+2);g.lineTo(pl.x+5,y+18);g.lineTo(pl.x+3,GY-8);g.closePath();g.fill();
      g.fillRect((pl.x-3)|0,(y-3)|0,6,2);g.fillRect((pl.x-1)|0,(y-5)|0,2,6);
    }else if(pel==='poison'){
      // พายุหมุนเกลียวสีเขียวพิษ
      g.strokeStyle=pc;g.lineWidth=3;
      for(let sy=0;sy<pl.h;sy+=10){const u=sy/Math.max(1,pl.h),rw=8+u*16;g.beginPath();g.ellipse(pl.x+Math.sin(G.t*.4+sy)*3,GY-sy,rw,4,0,0,7);g.stroke();}
      g.strokeStyle='#ffffff';g.lineWidth=1.2;g.beginPath();g.ellipse(pl.x,y+6,14,4,0,0,7);g.stroke();
    }else{
      g.fillStyle=pc;g.strokeStyle=pl.col?'#ffffff':'#2a241e';g.lineWidth=2;
      g.beginPath();g.moveTo(x,GY);g.lineTo(x+4,y+10);g.lineTo(pl.x,y);g.lineTo(x+w-4,y+10);g.lineTo(x+w,GY);g.closePath();g.fill();g.stroke();
      g.fillStyle=pl.col?'#ffffff':'#8a7f70';g.fillRect(pl.x-3,y+8,4,Math.max(0,pl.h-10));
    }
    g.strokeStyle=pc;g.globalAlpha=al*.65;g.lineWidth=2;g.beginPath();g.ellipse(pl.x,GY,22,6,0,0,7);g.stroke();g.restore();}
  b.pillars=(b.pillars||[]).filter(pl=>pl.t>0);
  b.bursts.forEach(drawBurst);g.restore();g.restore();
  const fl=()=>Math.sin(G.t*.22)*3+rnd(-1.5,1.5),wl=(x,y,r,c)=>({x:bsx(x),y:bsy(y),r:r*BZ,c});
  const ls=[{x:62,y:90,r:140+fl(),c:'rgba(255,145,65,.15)'},{x:418,y:90,r:140+fl(),c:'rgba(255,145,65,.15)'},wl(b.p.x,b.p.y-50,110),wl(b.e.x,b.e.y-50,110),{x:240,y:150,r:200}];
  for(const pr of b.proj)if(!pr.rock)ls.push(wl(pr.x,pr.y,68,pr.col+'55'));
  for(const u of b.bolts)ls.push(wl(u.x,150,120,'rgba(180,230,255,.32)'));
  for(const f of [b.p,b.e]){
    if(f.state==='attack'&&f.phase==='active'&&f.move){
      const ec=ELC[f.move.el]||'#ffe6b0';
      if(f.move.beam)ls.push({x:240,y:bsy(f.y-62),r:240,c:ec+'40'});
      else ls.push(wl(f.x+f.dir*36,f.y-56,95,ec+'36'));
    }
  }
  lighting(ls,'rgba(6,4,14,.46)');
}
