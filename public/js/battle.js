'use strict';
/* ============================================================
   BATTLE — fighting-game layer on top of the RPG systems
   ============================================================ */
let BT=null;
function mkF(o){const f=Object.assign({x:0,y:GY,vx:0,vy:0,dir:1,onGround:true,state:'idle',st:0,phase:null,pt:0,move:null,didHit:false,hitN:0,hitCD:0,
  flash:0,invuln:0,combo:0,hist:[],lastN:5,lastFT:-99,lastBT:-99,backPressT:-99,airUsed:0,jug:0,walkT:0,think:40,guard:0,aiChain:0,trail:[],gc:false,
  penalty:0,failedThis:false,cmb:null,fullMove:null,buffT:0,armorBuff:0,hits:0,weakT:0,ph:0},o);f.guardLeft=CONFIG.guard.max;f.guardBroken=0;f.S0=f.S;f.mods=[];Status.init(f);return f;}
/* ฉากหลังการต่อสู้ — แยกตามคู่ต่อสู้ (สไตล์ Elden Ring: มืด มีหมอก เน้นแสงทองเล็กน้อย) */
const SCENE_OF={rat:'cave',shade:'cave',kage:'cave',lavarat:'lava',lavaking:'lava',rat2:'cave',
  golem:'stone',rockling:'stone',mudslime:'stone',seraph:'cathedral',mslime:'tower',homunc:'tower',gargoyle:'tower',homunculus:'tower',
  frostslime:'frost',frostwolf:'frost',iceknight:'frost',icegolem:'frost',arena:'arena'};
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
function startBattle(e){G.mode='trans';G.tt=0;G.pendingFoe=e;SFX.hit(true);}
function setupBattle(e){
  const def=FOES[e.kind],zl=Z.levelAt(Math.floor(e.x/16)),lv=foeLevel(def,zl);
  buildBattleBg(SCENE_OF[e.kind]||(Z.biomeAt(Math.floor(e.x/16))==='lava'?'lava':Z.biomeAt(Math.floor(e.x/16))==='ice'?'frost':'cave'));
  const PS=StatSync.get();   // ค่าสุดท้ายชุดเดียวกับที่ UI แสดง
  const p=mkF({x:140,dir:1,isP:true,rig:true,S:PS,hp:clamp(G.hp,1,PS.maxHP),maxHp:PS.maxHP,dhp:G.hp,mp:clamp(G.mp,0,PS.maxMP),sta:PS.maxSTA,
    look:Equip.look(),wpn:Equip.weaponType(),name:'คุณ',hw:14,h:100,revived:false,lv:G.level,mpAcc:G.mpAcc||0,ultKeys:new Set()});
  const ES=Stats.enemy(def,lv,e.elite);
  const en=mkF({x:340,dir:-1,kind:e.kind,def,S:ES,hp:ES.maxHP,maxHp:ES.maxHP,dhp:ES.maxHP,lv:def.fixedLv||lv,elite:e.elite,rig:def.kind==='rig',
    look:LOOK_BY_NAME[def.look]||null,wpn:def.wpn,hw:def.hw,h:def.kind==='rig'?100:def.h,armor:!!def.armor,
    statusRes:def.statusRes||{},stunImmuneAfter:def.stunImmuneAfter,name:(e.elite?ELITE.prefix+' ':'')+def.n,moves:def.moves?def.moves.slice():null,cdMul:Diff.cur().aiCD,spdMul:Diff.cur().eSpd,ultT:600});
  BT={flask:FLASK.uses,mana:FLASK.uses,foe:e,def,p,e:en,proj:[],parts:[],nums:[],bursts:[],bolts:[],hitstop:0,shake:0,intro:90,end:0,slow:0,result:null,msg:null,small:null,lastMove:null,lastT:0,
    comboT:0,comboShow:0,flash:null,time:99*60,white:0,fullCombo:null,phaseMsg:null};
  wrap.classList.add('battle');
}
function updTrans(){G.tt++;if(G.tt===22){if(G.vsPending){G.vsPending=false;setupVS([0,0],1);}else setupBattle(G.pendingFoe);}if(G.tt>=44)G.mode='battle';}
const actionable=f=>['idle','walk','crouch','block','cblock'].includes(f.state);
/* ปุ่มของแต่ละนักสู้: ปกติใช้ชุดของ P1 (WASD/ลูกศร + J K Space) — โหมดประลองแยกเป็น P1=WASD+J,K,Space / P2=ลูกศร+, . / */
const KDEF={get R(){return kb('right')},get L(){return kb('left')},get U(){return kb('up')},get D(){return kb('down')},get J(){return[...kb('punch'),'PadX']},get K(){return[...kb('kick'),'PadY']},get X(){return kb('dodge')},get B(){return kb('guard')}};   // ปุ่มผูกไว้ได้ที่เมนู ปุ่มควบคุม (B = ป้องกัน)
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
    if(full){p.fullMove=m;BT.fullCombo={n:full.n,t:90};if(!BT.vs)G.stats.fullCombos++;p.cmb=null;p.sta=Math.min(p.S.maxSTA,p.sta+20);Ult.gain(p,'combo',p.moveSeq);SFX.perfect();}},  // combo reward: stamina + Ultimate Gauge (never MP)
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
function beginMove(f,m){
  if(!m)return false;
  if((f.isP||f.isP2)&&m.sta&&!m.skillId){const c=m.sta*(f.S.passives.has('swift')?.7:1);if(f.sta<c){BT.small={t:'สตามินาไม่พอ',l:50};return false;}f.sta-=c;}
  startAtk(f,m);if(m.air)f.airUsed++;if(m.rise)f.airUsed=99;
  if(f.isP){BT.lastMove=m;BT.lastT=40;}
  if(m.super){BT.flash={t:m.super===2?66:46,f,m};SFX.flash();BT.white=6;}
  if(m.hpCost)f.hp=Math.max(1,f.hp-Math.round(f.maxHp*m.hpCost));
  if(m.jackpot){f.jackpot=m.jackpot;f.jackpotPen=m.jackpotPen||0;num(f,'แจ็คพอต! คริติคอล '+m.jackpot+' ครั้ง','#ffd23a',18,-30);SFX.crit();}
  if(m.buff){if(m.buff.stunImm)f.stunImm=Math.max(f.stunImm||0,m.buff.stunImm);if(m.buff.statusImm){f.statusImm=Math.max(f.statusImm||0,m.buff.statusImm);StatSync.addMod(f,{id:'statusimm',n:'กันสถานะ',kind:'buff',stat:'statusImmune',op:'add',v:1,ttl:m.buff.statusImm});}f.buffT=m.buff.t;StatSync.addMod(f,{id:'ironwall',n:'กำแพงเหล็ก',kind:'buff',stat:'buffDr',op:'add',v:m.buff.dr,ttl:m.buff.t});f.armorBuff=m.buff.armor?m.buff.t:0;num(f,'กำแพงเหล็ก!','#9fd0ff',18,-30);}
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
  if(s.tier==='ultimate'){if(!Ult.ready())return`เกจสุดยอดไม่พอ (${Math.floor(G.ult||0)}/${CONFIG.ult.cost})`;}
  else if(p.mp<Mana.cost(id,p.S))return`MP ไม่พอ (${Math.floor(p.mp)}/${Mana.cost(id,p.S)})`;
  return null;
}
function useSkill(p,slot,fromBuf){
  const id=(p.skillSet||G.skills.slots)[slot];if(!id){BT.small={t:'ช่องสกิล '+(slot+1)+' ว่าง (ตั้งได้ที่หน้าสกิล K)',l:70};return false;}
  if(p.isP&&!p.skillSet&&!skillUsable(id,'player')){BT.small={t:SKILLS[id].n+' — ศัตรูใช้ได้เท่านั้น',l:70};return false;}
  if(SKILLS[id].type==='passive'){BT.small={t:SKILLS[id].n+' เป็นสกิลพาสซีฟ — ทำงานอัตโนมัติ ไม่ต้องกด',l:80};return false;}
  const err=skillCastCheck(p,id);if(err){BT.small={t:err,l:60};return false;}
  const m=Skills.move(id,p.wpn,slot);
  if(!attemptMove(p,m)){   // กดตอนโดนตี/หลบ/กระโดด/ท่ายังไม่จบ → จำไว้สั้นๆ แล้วปล่อยทันทีที่ขยับได้
    if(!fromBuf&&!actionable(p))p.skBuf={slot,ttl:CONFIG.skillBuffer};return false;}
  p.skBuf=null;if(SKILLS[id].type==='magic'&&SFX.magic)SFX.magic(SKILLS[id].el);   // เสียงร่ายตามธาตุ
  if(SKILLS[id].tier==='ultimate')Ult.spend();else p.mp-=Mana.cost(id,p.S);
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
  if(C){const m=C.move;if(p.state==='attack'||p.state==='air')p.state='idle';if(beginMove(p,m)){BT.fullCombo={n:C.n,t:90};SFX.perfect();return true;}}
  const m=pickMove(p,btn);if(m&&m.skill!==undefined)return useSkill(p,m.skill);return attemptMove(p,m);}
function control(p,e){
  if(p.state==='ko'||BT.result)return;
  if(p.drinkT>0){p.drinkT--;p.hp=Math.min(p.S.maxHP,p.hp+p.drinkH);p.state='idle';p.vx*=.8;if(p.drinkT%6===0)BT.parts.push({x:p.x+rnd(-6,6),y:p.y-rnd(10,40),vx:0,vy:-.6,l:26,c:'#7aff9a',s:2});return;}   // กำลังดื่มยา: ขยับไม่ได้ชั่วครู่
  if(p.cd)for(const k in p.cd)if(p.cd[k]>0)p.cd[k]--;if(p.dashCD>0)p.dashCD--;
  const n=numDir(p);if(n!==p.lastN){p.hist.push({n,t:G.t});if(p.hist.length>14)p.hist.shift();p.lastN=n;}
  const K=kk(p),fwdK=p.dir>0?K.R:K.L,backK=p.dir>0?K.L:K.R,holdB=down(...backK),Dn=down(...K.D),Rt=down(...K.R),Lt=down(...K.L);
  const blk=down(...(K.B||[]));if(tap(...(K.B||[])))p.backPressT=G.t;   // กด E ตรงจังหวะ = ปัดป้อง
  if(p.skBuf){if(--p.skBuf.ttl<=0)p.skBuf=null;else if(actionable(p)||p.state==='land'){const s=p.skBuf.slot;p.skBuf=null;useSkill(p,s,true);}}
  for(let i=0;i<4;i++)if(tap(...(p.skk?p.skk[i]:skillKeys(i))))useSkill(p,i);
  if(!BT.vs&&tap(KB.flask)){if(!(BT.flask>0))BT.small={t:'ขวดยาหมดแล้ว (ได้ 3 ครั้งต่อการต่อสู้)',l:60};else if(actionable(p)&&p.hp<p.S.maxHP){BT.flask--;const h=Math.round(p.S.maxHP*FLASK.heal);p.drinkT=FLASK.frames;p.drinkH=h/FLASK.frames;num(p,'+'+h+' HP','#7aff9a',18,-30);SFX.heal?SFX.heal():SFX.pick();}}   // v0.2.0: ขวดยา 3 ครั้ง/ไฟต์
  if(!BT.vs&&tap(KB.mana)){const id=Mana.bestPotion(p,p.S);if(!(BT.mana>0))BT.small={t:'ยามานาใช้ครบ 3 ครั้งแล้วในไฟต์นี้',l:60};else if(!id)BT.small={t:'ไม่มียามานา',l:50};else{const r=Mana.drink(p,p.S,id);if(r.ok){BT.mana--;num(p,'+'+r.gained+' MP','#7ab8ff',18,-30);SFX.pick();}else BT.small={t:r.err,l:50};}}
  if(!BT.vs&&(tap(KB.flee)||fleeTap)){fleeTap=false;tryFlee(p,e);if(BT.result)return;}
  if(tap(...K.J))pressAttack(p,'J');else if(tap(...K.K))pressAttack(p,'K');
  if(!actionable(p))return;
  const spd=p.S.spd,swift=p.S.passives.has('swift')?.7:1;
  if(tap(...K.X)){if((p.dashCD||0)>0)BT.small={t:'พุ่งหลบยังไม่พร้อม ('+(p.dashCD/60).toFixed(1)+' วิ)',l:30};   // พุ่งหลบ: อมตะตลอดท่า · คูลดาวน์ 1.5 วิ (ไม่ใช้สตามินา)
    else{p.dashCD=CONFIG.dashCD;p.state=holdB?'backdash':'dash';p.st=CONFIG.dashFrames;p.invuln=CONFIG.dashFrames+4;p.dashV=(holdB?-1:1)*p.dir*CONFIG.dashSpeed;p.vx=p.dashV;SFX.dodge();return;}}
  if(tap(...fwdK)&&!Dn){if(G.t-p.lastFT<12&&p.sta>=CONFIG.staCost.dash*swift){p.sta-=CONFIG.staCost.dash*swift;p.state='dash';p.st=18;p.vx=p.dir*4.6*spd;SFX.dodge();return;}p.lastFT=G.t;}
  if(tap(...backK)&&!Dn){if(G.t-p.lastBT<12&&p.sta>=CONFIG.staCost.dash*swift){p.sta-=CONFIG.staCost.dash*swift;p.state='backdash';p.st=16;p.vx=-p.dir*4.2;p.invuln=8;SFX.dodge();return;}p.lastBT=G.t;}
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
function fleeCheck(p){const F=CONFIG.flee;if(!BT||BT.result)return'ตอนนี้หนีไม่ได้';if(BT.def.boss&&!F.allowBoss)return'หนีจากบอสไม่ได้!';
  if(BT.fleeCD>0)return`ยังหนีไม่ได้ (${Math.ceil(BT.fleeCD/60)} วิ)`;if(!actionable(p))return'ต้องอยู่ในท่าพร้อมก่อน';return null;}
function tryFlee(p,e){const err=fleeCheck(p);if(err){BT.small={t:err,l:50};return{ok:false,err};}
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
  const dx=o.x-f.x;if(!(Math.sign(dx)===f.dir||Math.abs(dx)<8))return false;if(Math.abs(dx)-o.hw>m.reach)return false;
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
  if(t.isP&&!BT.vs&&t.hp<=0&&G.talent==='undying'&&(t.reviveN||0)<TALENT_PASSIVE.undying.revives){t.revived=true;t.reviveN=(t.reviveN||0)+1;t.hp=Math.round(t.maxHp*TALENT_PASSIVE.undying.reviveHp);Status.cleanse(t);t.invuln=120;t.state='idle';t.onGround=t.y>=GY;
    num(t,'💀 ฟื้นคืนชีพ! (THE UNDYING)','#ff6aff',22,-50);BT.white=10;SFX.level();return;}
  if(t.hp<=0&&!BT.result){BT.result=a&&a.isP?'win':(t.isP?'lose':'win');BT.slow=80;BT.msg={t:'K.O.',c:'#ff4a3a'};SFX.ko();BT.white=8;
    if(t.state!=='airhurt'&&t.state!=='down'){t.state='airhurt';t.onGround=false;t.vy=-6;t.vx=(a?a.dir:-t.dir)*2.6;}}
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
  if(gd&&m.unblockable){gd=null;num(t,'ทะลุการป้องกัน!','#ffb05a',16,-74);}   // Armor Breaker: ทะลุ block/ปัดป้อง
  if(m.beam||m.rain&&false)gd=gd==='parry'?'block':gd;
  if(gd==='parry'){t.guardLeft=CONFIG.guard.max;Ult.gain(t,'perfectBlock',a.name+':'+seq);a.state='parried';a.st=50;a.move=null;a.vx=Math.sign(a.x-t.x)*3;t.sta=Math.min(t.S.maxSTA,t.sta+30);b.hitstop=14;b.shake=4;if(!b.vs)G.stats.parries++;
    num(t,'ปัดป้อง!','#f3c969',24);sparks(hx,hy,'#ffe27a',24);b.bursts.push({x:hx,y:hy,t:0,col:'#ffe27a',big:1});SFX.parry();return;}
  const lastHit=!m.multi||t.__lastHitCheck;
  const h={coef:(m.dmg/10)*mul,type:(a.def&&a.def.allMagic)?'magic':m.type||'phys',el:m.el||(a.rig?WEAPONS[a.wpn].el:(a.def&&a.def.el)||'phys'),ignoreDef:!!m.ignoreDef,
    forceCrit:!!(m.lastCrit&&a.hitN===m.multi-1)||(a.jackpot>0),defPen:a.jackpot>0?(a.jackpotPen||0):0,fullCombo:a.fullMove===m,weakPoint:t.weakT>0&&t.def&&t.def.weakPoint?t.def.weakPoint.mul:0,
    counter:(t.state==='attack'&&t.phase==='startup')||t.state==='parried',mastery:a.isP&&!BT.vs?Prog.masteryBonus(a.wpn):0,execute:a.S.passives.has('executioner')&&t.hp<t.maxHp*.3,stunned:!!t.st8.stun,berserk:a.S.uniq&&a.S.uniq.id==='berserker'&&a.hp<a.maxHp*.5?a.S.uniq.v:0};
  if(gd==='block'&&--t.guardLeft<=0){t.guardLeft=0;t.guardBroken=CONFIG.guard.breakT;num(t,'การ์ดแตก!','#ff6a4a',22,-60);sparks(hx,hy,'#ff8a5a',22);SFX.crit();b.shake=6;}   // บล็อกครั้งที่ 4 ยังกันได้ แล้วการ์ดแตก 8 วิ
  if(gd==='block'){const r=calcDamage(a.S,t.S,h),chip=Math.max(1,Math.round(r.dmg*.1));dealDamage(a,t,chip);t.gc=(t.isP||t.isP2)?down(...kk(t).D):t.state==='cblock';t.state='gstun';
    t.st=Math.round(m.hs*.6)+2;t.vx=a.dir*(m.kb*.7+1.2);b.hitstop=5;sparks(hx,hy,'#9fd0ff',10);b.bursts.push({x:hx,y:hy,t:0,col:'#9fd0ff'});num(t,'กัน '+chip,'#9fd0ff',14);SFX.block();return;}
  const r=calcDamage(a.S,t.S,h);
  G.dmgLog.unshift({from:a.name,to:t.name,move:m.n,...r,coef:h.coef.toFixed(2),el:h.el,type:h.type,mods:Object.keys(r.mods).map(k=>k+'×'+r.mods[k].toFixed(2)).join(' ')});G.dmgLog.length=Math.min(G.dmgLog.length,12);
  const wasStun=['hurt','airhurt','stun'].includes(t.state);
  const armored=(t.armor&&t.state==='attack'&&m.dmg<12&&!m.super)||t.armorBuff>0;
  dealDamage(a,t,r.dmg);
  if(a.jackpot>0)a.jackpot--;                                   // แจ็คพอต: นับการโจมตีที่ติดคริ
  if(m.lifesteal&&a.hp>0){const heal=Math.max(1,Math.round(r.dmg*m.lifesteal));a.hp=Math.min(a.maxHp,a.hp+heal);num(a,'+'+heal,'#7aff8a',14,-40);}
  if(a.isP&&m.kind!=='ultimate'){Ult.gain(a,'hit',seq);if(h.counter)Ult.gain(a,'counter',seq);}
  if(t.isP)Ult.gain(t,'beingHit',a.name+':'+seq);
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
  a.combo=wasStun?a.combo+1:1;if(a.combo>=2){b.comboT=90;b.comboWho=a;b.comboShow=a.combo;}if(a.isP&&!b.vs)G.stats.maxCombo=Math.max(G.stats.maxCombo,a.combo);
  b.hitstop=Math.max(b.hitstop,m.super?3:r.crit?8:m.dmg>=12?8:m.dmg>=7?6:4);
  if(r.crit){num(t,r.dmg+' CRIT!','#ff9a2a',30);SFX.crit();}else num(t,String(r.dmg),h.fullCombo?'#ffd23a':(a.isP?'#ffffff':'#ff8a7a'),h.fullCombo?26:20);
  if(h.weakPoint)num(t,'จุดอ่อน! ×'+h.weakPoint,'#5affb0',16,-26);if(h.counter&&!armored)num(t,'COUNTER','#ff9a5a',14,-20);if(armored&&t.hp>0)num(t,'เกราะ!','#ffcf9a',13,-14);
  if(h.fullCombo&&(!m.multi||a.hitN===0))num(t,'FULL COMBO +20%','#ffd23a',18,-70);
  if(a.move===m)a.didHit=true;
  // statuses: skill-defined, element procs, unique passives, set passives
  if(m.status)for(const k in m.status)if(m.status[k]>0)tryStatus(t,k,m.status[k],a,m.statusDur);
  if(m.stunChance&&rand()<m.stunChance)tryStatus(t,'stun',1,a,m.stunDur||3);
  if(a.S&&a.S.blindChance&&rand()<a.S.blindChance)tryStatus(t,'blind',1,a,5);   // ไลต์เลส: ตาบอด 5 วิ   // ค้อนศึก: โอกาสสตัน   // statusDur = ระยะเวลาสถานะของท่านี้ (วิ)   // 0 = ปิดสถานะนั้น
  if(m.armorBreak&&t.hp>0){StatSync.addMod(t,{id:'armorbreak',n:m.armorBreak.n||'เกราะแตก',kind:'debuff',stat:'def',op:'mul',v:m.armorBreak.def,ttl:m.armorBreak.t});num(t,(m.armorBreak.n||'เกราะแตก')+'!','#ff9a5a',16,-46);}
  const pr=ELEM_PROC[h.el];if(pr&&rand()<pr.c)tryStatus(t,pr.s,1,a);
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
  const el=m.el||(f.rig?WEAPONS[f.wpn].el:'phys');
  BT.proj.push({seq:f.isP?f.moveSeq:'e'+f.moveSeq,x:f.x+f.dir*24,y:f.y-(f.rig?64:f.h*.6),vx:f.dir*m.proj.spd,o:f,m,r:m.proj.r,hits:m.proj.hits||1,cd:0,rock:m.proj.rock,col:m.proj.rock?(el==='fire'?'#c4380e':'#8a7a6a'):ELC[el]||'#fff',life:150});
  if(el==='fire')SFX.fire();
}
function updAtk(f,o){
  const m=f.move;f.pt++;
  if(f.phase==='startup'){
    if(m.inv)f.invuln=Math.max(f.invuln,2);if(m.lunge)f.x+=f.dir*m.lunge*.3;
    if(f.pt>=(f.isP||f.isP2||m.skillId?m.s:Math.round(m.s*CONFIG.enemyStartupMul))){f.phase='active';f.pt=0;SFX.swing();
      if(m.swap&&o){const nx=clamp(o.x+f.dir*34,24,W-24);for(let i=0;i<14;i++)BT.parts.push({x:f.x,y:f.y-50+rnd(-20,20),vx:rnd(-1.5,1.5),vy:rnd(-1.5,1.5),l:20,c:'#c9a0ff',s:3});
        f.x=nx;f.dir=o.x>f.x?1:-1;for(let i=0;i<14;i++)BT.parts.push({x:f.x,y:f.y-50+rnd(-20,20),vx:rnd(-1.5,1.5),vy:rnd(-1.5,1.5),l:20,c:'#c9a0ff',s:3});}   // วาร์ปไปด้านหลังศัตรู
      if(m.rider){f.onGround=false;f.vy=f.y<GY-20?3.2:-3.5;BT.shake=4;}   // บนพื้น: เด้งขึ้นแล้วพุ่ง · กลางอากาศ: พุ่งดิ่งเฉียงลง
      if(m.proj)spawnProj(f,m);
      if(m.rise){f.vy=-m.rise;f.onGround=false;f.vx=f.dir*1.2;}
      if(m.strike){const dx=o.x-f.x;if(Math.sign(dx)===f.dir&&Math.abs(dx)<=m.strike+o.hw){applyHit(f,o,m,1,o.x,o.y-o.h*.6,true);}BT.bolts.push({x:Math.abs(dx)<=m.strike+o.hw&&Math.sign(dx)===f.dir?o.x:f.x+f.dir*m.strike,t:14});SFX.crit();}
      if(m.quake){BT.shake=8;for(let i=0;i<30;i++)BT.parts.push({x:f.x+f.dir*rnd(10,110),y:GY,vx:rnd(-1,1),vy:rnd(-3.5,-1),l:30,c:'#8a7a6a',s:3,grav:1});}}
  }else if(f.phase==='active'){
    if(m.lunge)f.x+=f.dir*m.lunge;if(f.hitCD>0)f.hitCD--;
    if(m.rain&&G.t%3===0)BT.parts.push({x:o.x+rnd(-50,50),y:rnd(30,80),vx:0,vy:5,l:34,c:'#8a7a6a',s:5});
    const n=m.multi||1;
    if(!m.proj&&!m.strike&&!m.buff&&!m.jackpot&&f.hitN<n&&f.hitCD<=0&&(m.beam?beamHits(f,o):m.rain?(o.onGround&&o.state!=='down'):inBox(f,o,m))){applyHit(f,o,m,1/n);f.hitN++;f.hitCD=Math.max(2,Math.floor(m.a/n));}
    if(f.pt>=m.a){f.phase='recovery';f.pt=0;}
  }else if(f.pt>=m.r+(f.penalty||0))endAtk(f);
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
  if(f.buffT>0)f.buffT--;if(f.armorBuff>0)f.armorBuff--;
  if(f.guardBroken>0&&--f.guardBroken===0){f.guardLeft=CONFIG.guard.max;if(f.isP||f.isP2)num(f,'การ์ดกลับมา','#9fd0ff',14,-60);}
  if(f.skcd)for(const id in f.skcd)if(f.skcd[id]>0)f.skcd[id]--;   // คูลดาวน์สกิลของศัตรู
  StatSync.frame(f);   // นับเวลาบัฟ/ดีบัฟ หมดแล้วถอดและคำนวณใหม่ทันที
  f.dhp+=(f.hp-f.dhp)*.05;
  if(f.isP||f.isP2){const busy=f.state==='attack';f.sta=Math.min(f.S.maxSTA,f.sta+(busy?0:CONFIG.regen.sta/60*Diff.cur().staRegen));Mana.regen(f,f.S,true);}
  if(f.hp>0)Status.update(f,(k,d)=>{const dmg=incoming(f.S,d);num(f,String(dmg),STC[k],14,-10);dealDamage(f===BT.p?BT.e:BT.p,f,dmg);});
  if(f.st8.stun&&!['airhurt','down','ko','stun'].includes(f.state)){f.state='stun';f.move=null;}
  if(f.st8.burn&&G.t%3===0)BT.parts.push({x:f.x+rnd(-10,10),y:f.y-rnd(6,f.h*.8),vx:0,vy:-.8,l:18,c:'#ff8a3a',s:2});
  if(f.st8.poison&&G.t%6===0)BT.parts.push({x:f.x+rnd(-10,10),y:f.y-rnd(6,f.h*.8),vx:0,vy:-.5,l:22,c:'#8aff5a',s:2});
  if(f.st8.bleed&&G.t%5===0)BT.parts.push({x:f.x+rnd(-8,8),y:f.y-rnd(20,f.h*.7),vx:rnd(-.5,.5),vy:.8,l:20,c:'#ff2a3a',s:2});
  if(f.st8.shock&&G.t%4===0)BT.parts.push({x:f.x+rnd(-12,12),y:f.y-rnd(6,f.h),vx:rnd(-2,2),vy:rnd(-2,2),l:6,c:'#cff4ff',s:2});
  if(f.look&&f.look.aura&&G.t%4===0)BT.parts.push({x:f.x+rnd(-14,14),y:f.y-rnd(10,90),vx:rnd(-.2,.2),vy:-.9,l:20,c:f.look.aura,s:2});
  if(f.elite&&G.t%3===0)BT.parts.push({x:f.x+rnd(-f.hw,f.hw),y:f.y-rnd(0,f.h),vx:0,vy:-.7,l:16,c:'#ffd23a',s:2});
  if(f.look&&f.look.trail&&['walk','dash','air'].includes(f.state)&&G.t%3===0)BT.parts.push({x:f.x-f.dir*6,y:f.y-rnd(0,8),vx:-f.dir*.6,vy:-.2,l:16,c:f.look.trail,s:2});
  if(f.dashV){if(f.state==='dash'||f.state==='backdash')f.vx=f.dashV;else{f.dashV=0;f.vx*=.3;}}   // พุ่งหลบ: ความเร็วคงที่ พุ่งทะลุตัวศัตรู
  if(!f.onGround){f.vy+=GRAV;f.y+=f.vy;f.x+=f.vx;if(f.y>=GY)land(f);}else{f.x+=f.vx;f.vx*=.8;if(Math.abs(f.vx)<.05)f.vx=0;}
  const lying=f.state==='down'||f.state==='ko';f.x=clamp(f.x,lying?46:20,lying?W-46:W-20);
  if(['dash'].includes(f.state)||(f.state==='attack'&&f.move&&(f.move.super||f.move.lunge))||f.state==='dodge'){if(G.t%2===0){f.trail.push({x:f.x,y:f.y,P:f.rig?poseFor(f):null});if(f.trail.length>4)f.trail.shift();}}
  else if(f.trail.length&&G.t%2===0)f.trail.shift();
  switch(f.state){
    case'attack':updAtk(f,o);break;
    case'prejump':if(--f.st<=0){f.state='air';f.onGround=false;f.vy=-6.6;f.vx=f.jumpVx||0;f.airUsed=0;SFX.jump();}break;
    case'hurt':case'gstun':case'parried':if(--f.st<=0)f.state='idle';break;
    case'land':case'dash':case'backdash':case'dodge':case'getup':if(--f.st<=0)f.state='idle';break;
    case'down':if(--f.st<=0){if(f.hp<=0)f.state='ko';else{f.state='getup';f.st=14;f.invuln=16;}}break;
  }
  if(actionable(f)||f.state==='land')f.dir=o.x>f.x?1:-1;
  if(!['hurt','airhurt','stun'].includes(o.state))f.combo=0;
  // boss phases
  if(f.def&&f.def.phases)f.def.phases.forEach((ph,i)=>{if(f.ph<=i&&f.hp>0&&f.hp/f.maxHp<=ph.at){f.ph=i+1;f.cdMul=ph.cdMul;f.spdMul=ph.spdMul;
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
const RANGED_SK=s=>!!(s.proj||s.beam||s.rain||s.anim==='cast');
function enemyCast(e,p,dist){
  const list=(e.def&&e.def.skills||[]).filter(id=>skillUsable(id,'enemy'));if(!list.length)return false;
  e.skcd=e.skcd||{};
  const bz=e.def.boss?BOSS_AI:null,chance=bz?BOSS_AI.rigSkillChance:.35;
  const ready=list.filter(id=>!(e.skcd[id]>0));if(!ready.length)return false;
  const ult=ready.find(id=>SKILLS[id].tier==='ultimate');
  let pick_=null;
  if(ult&&e.hp<e.maxHp*.6)pick_=ult;
  else{const c=ready.filter(id=>SKILLS[id].tier!=='ultimate'&&(RANGED_SK(SKILLS[id])?dist>110:dist<100));if(c.length&&rand()<chance)pick_=pick(c);}
  if(!pick_)return false;
  const s=SKILLS[pick_],m=Skills.move(pick_,e.wpn||'fist',Math.max(0,TIERS.indexOf(s.tier)));if(!m)return false;
  if(e.rig){if(!beginMove(e,m))return false;}else startAtk(e,m);
  e.skcd[pick_]=Math.round((s.cd||8)*60*(bz?BOSS_AI.cdMul:1));e.think=Math.round(rint(30,50)*(e.cdMul||1));
  num(e,s.n,s.tier==='ultimate'?'#ffd23a':'#ff9a8a',s.tier==='ultimate'?20:14,-70);if(s.tier==='ultimate'){BT.shake=6;SFX.flash();}
  return true;}
function aiRig(e,p){
  if(e.state==='air'&&e.aiAir&&Math.abs(p.x-e.x)<70&&e.vy>-1.5&&e.airUsed<1){beginMove(e,UNI.akick);e.aiAir=0;return;}
  if(!actionable(e)||p.state==='ko')return;
  const dx=p.x-e.x,dist=Math.abs(dx),w=WEAPONS[e.wpn];e.think--;if(e.ultT>0)e.ultT--;
  const pThreat=(p.state==='attack'&&dist<120&&p.phase!=='recovery')||BT.proj.some(q=>q.o===p&&Math.abs(q.x-e.x)<120);
  if(pThreat&&(e.guard>0||rand()<.045*Diff.cur().guard)){e.guard=e.guard>0?e.guard-1:24;e.state=(p.move&&p.move.low)?'cblock':'block';return;}
  e.guard=0;
  if(!p.onGround&&dist<80&&p.vy>-3&&rand()<.06&&skillUsable('rising','enemy')){beginMove(e,Skills.move('rising',e.wpn,1));return;}
  if(e.think>0){if(dist>80){e.x+=Math.sign(dx)*1.7*e.spdMul;e.state='walk';e.walkT++;}else if(dist<40){e.x-=Math.sign(dx)*1.3;e.state='walk';e.walkT--;}else e.state='idle';return;}
  const r=rand();
  if(enemyCast(e,p,dist))return;   // สกิลที่ศัตรูใส่ไว้ (FOES[x].skills)
  if(dist>150&&r<.55&&skillUsable('slashwave','enemy'))beginMove(e,Skills.move('slashwave',e.wpn,0));
  else if(dist>90&&r<.75){e.state='prejump';e.st=4;e.jumpVx=Math.sign(dx)*2.6;e.aiAir=1;}
  else if(dist<75){if(r<.25)beginMove(e,UNI.sweep);else if(r<.35)beginMove(e,UNI.kick);else{e.aiChain=2;beginMove(e,w.light[0]);}}
  else{e.state='dash';e.st=14;e.vx=e.dir*4.2;}
  e.think=Math.round(rint(22,58)*e.cdMul*(e.def&&e.def.boss?BOSS_AI.cdMul:1));
}
// บอสออกสกิลบ่อยขึ้น: คิดเร็วขึ้น ใช้ท่าระยะไกล/ท่าพิเศษบ่อยขึ้น
const BOSS_AI={cdMul:.7,farChance:.8,specialChance:.5,rigUltCD:600,rigSkillChance:.65};
const isSpecialMove=m=>!!(m.beam||m.rain||m.quake||m.proj||m.multi||m.kd||m.lunge);
function aiMon(e,p){
  if(!actionable(e)||p.state==='ko')return;
  const d=e.def,dx=p.x-e.x,dist=Math.abs(dx),bz=d.boss?BOSS_AI:null,cdm=e.cdMul*(e.elite?.85:1)*(bz?bz.cdMul:1);e.think--;
  if(e.think<=0&&enemyCast(e,p,dist))return;
  if(dist>d.range+p.hw+10){
    if(e.think<=0&&dist>150){const far=e.moves.find(m=>m.far);if(far&&rand()<(bz?bz.farChance:.5)){startAtk(e,far);e.think=rint(d.cd[0],d.cd[1])*cdm|0;return;}}
    e.state='walk';e.x+=Math.sign(dx)*d.spd*e.spdMul;
  }else{e.state='idle';
    if(e.think<=0){const ms=e.moves.filter(m=>!m.far),sp=bz?ms.filter(isSpecialMove):[];startAtk(e,sp.length&&rand()<bz.specialChance?pick(sp):pick(ms));e.think=rint(d.cd[0],d.cd[1])*cdm|0;}
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
  if(b.white>0)b.white--;if(b.fullCombo&&--b.fullCombo.t<=0)b.fullCombo=null;if(b.phaseMsg&&--b.phaseMsg.l<=0)b.phaseMsg=null;
  if(b.flash){b.flash.t--;if(G.t%2===0)b.parts.push({x:b.flash.f.x+rnd(-20,20),y:b.flash.f.y-rnd(0,100),vx:0,vy:-2,l:16,c:'#ffd23a',s:3});
    for(const q of b.parts){q.x+=q.vx;q.y+=q.vy;q.l--;}b.parts=b.parts.filter(q=>q.l>0);if(b.flash.t<=0)b.flash=null;return;}
  if(b.hitstop>0){b.hitstop--;return;}
  if(b.slow>0){b.slow--;if(b.slow%3!==0)return;if(b.slow===0)b.end=90;}
  if(b.shake>0){b.shake*=.85;if(b.shake<.3)b.shake=0;}
  for(const q of b.parts){q.x+=q.vx;q.y+=q.vy;if(q.grav)q.vy+=.15;q.l--;}b.parts=b.parts.filter(q=>q.l>0);
  if(b.comboT>0)b.comboT--;if(b.lastT>0&&p.state!=='attack')b.lastT--;if(b.small&&--b.small.l<=0)b.small=null;
  if(b.fleeCD>0)b.fleeCD--;fleeBtn.classList.toggle('cd',b.fleeCD>0);
  if(b.intro>0){b.intro--;if(b.intro===30)SFX.perfect();return;}
  Skills.tick();
  if(b.end>0){b.end--;stepF(p,e);stepF(e,p);if(b.end===0)finishBattle();return;}
  if(!b.result&&--b.time<=0){b.result=b.vs?(p.hp/p.maxHp===e.hp/e.maxHp?'draw':p.hp/p.maxHp>e.hp/e.maxHp?'win':'lose'):(p.hp/p.maxHp>=e.hp/e.maxHp?'win':'lose');b.msg={t:'TIME OVER',c:'#fff'};b.end=110;SFX.ko();}
  control(p,e);
  if(!b.result){if(b.vs)control(e,p);else if(e.rig)aiRig(e,p);else aiMon(e,p);}
  stepF(p,e);stepF(e,p);
  for(const pr of b.proj){pr.x+=pr.vx;pr.life--;if(pr.cd>0)pr.cd--;const t=pr.o===p?e:p;
    if(G.t%2===0)b.parts.push({x:pr.x-Math.sign(pr.vx)*pr.r,y:pr.y+rnd(-pr.r,pr.r)*.6,vx:-pr.vx*.2,vy:rnd(-.3,.3),l:14,c:pr.col,s:2});
    for(const q of b.proj)if(q!==pr&&q.o!==pr.o&&q.life>0&&Math.abs(q.x-pr.x)<q.r+pr.r){q.life=0;pr.life=0;sparks(pr.x,pr.y,'#fff',20);b.bursts.push({x:pr.x,y:pr.y,t:0,col:'#fff',big:1});SFX.hit(true);}
    if(pr.life>0&&pr.cd<=0&&Math.abs(pr.x-t.x)<t.hw+pr.r&&((t.onGround&&t.h<60)||(pr.y+pr.r>=t.y-t.h*(isCrouch(t)?.66:1)&&pr.y-pr.r<=t.y))&&t.state!=='down'&&t.state!=='ko'&&t.invuln<=0){
      applyHit(pr.o,t,pr.m,1/pr.hits,pr.x,pr.y,true,pr.seq);pr.hits--;pr.cd=8;if(pr.hits<=0)pr.life=0;}}
  b.proj=b.proj.filter(q=>q.life>0&&q.x>-30&&q.x<W+30);
  const dx=e.x-p.x,min=p.hw+e.hw-8;
  // แยกตัวละครที่ซ้อนกัน — ถ้ามีคนติดผนัง ให้ดันอีกฝ่ายออกเต็มระยะ (กันติดมุม ตีไม่ได้/ออกไม่ได้) ทำงานแม้ลอยอยู่กลางอากาศ
  const WL=20,WR=W-20,cornered=Math.abs(dx)<min&&[p.x,e.x].some(x=>x<=WL+3||x>=WR-3);
  if(Math.abs(dx)<min&&p.state!=='ko'&&e.state!=='ko'&&(cornered||(p.onGround&&e.onGround&&p.invuln<=0&&e.invuln<=0))){
    let s=Math.sign(dx);if(!s)s=p.x<W/2?1:-1;   // ทับกันพอดี: ศัตรูไปฝั่งที่มีที่ว่าง
    const push=min-Math.abs(dx);let pp=push/2,ep=push/2;
    if(p.x-s*pp<WL||p.x-s*pp>WR){ep=push;pp=0;}else if(e.x+s*ep<WL||e.x+s*ep>WR){pp=push;ep=0;}
    p.x=clamp(p.x-s*pp,WL,WR);e.x=clamp(e.x+s*ep,WL,WR);}
}
function finishBattle(){
  if(BT.vs){finishVS();return;}
  const b=BT,foe=b.foe,d=b.def;wrap.classList.remove('battle');
  G.hp=Math.max(1,Math.round(b.p.hp));G.mp=b.p.mp;G.mpAcc=b.p.mpAcc;
  if(b.result==='flee'){
    foe.cool=CONFIG.flee.safeFrames;const dx=P.x-foe.x,dy=P.y-foe.y,dl=Math.hypot(dx,dy)||1;foe.x-=dx/dl*20;foe.y-=dy/dl*20;
    BT=null;G.mode='explore';setTimeout(()=>toast('🏃 หนีสำเร็จ — ไม่ได้ EXP/ของ ศัตรูจะไม่ไล่ 4 วินาที'),50);
  }else if(b.result==='win'){
    foe.alive=false;if(foe.respawnable)foe.respawn=CONFIG.respawnFrames;Ency.kill(foe.kind);
    const xp=Math.round(d.xp*(1+.15*(b.e.lv-1))*(foe.elite?ELITE.xp:1)*Diff.cur().xp),cls=LootManager.classOf(d,foe.elite);
    // individual loot: one independent roll per player, spawned on the ground at the enemy's position, owned by that player
    const results=LootManager.rollForPlayers({tableId:d.loot,cls,level:b.e.lv,kind:foe.kind});
    if(d.boss)for(const r of results)r.drops.push(...LootManager.pity(r.pid,foe.kind));
    for(const r of results)for(const dr of r.drops)if(dr.kind==='gold')dr.q=Math.max(1,Math.round(dr.q*Diff.cur().gold));
    let dropped=0;for(const r of results){const sp=LootManager.spawn(Z,foe.x,foe.y,r);if(r.pid==='P1')dropped+=sp.length;}
    const out={gold:0,mats:{},items:[],dropped};
    const ups=Prog.gainXP(xp);
    if(foe.kind==='rat'){const h=G.q.hunt;if(h.active&&!h.done){h.count++;if(h.count>=QUESTS.hunt.count)Quest.complete('hunt');else toast(`กำจัดหนูถ้ำ ${h.count}/3`);}}
    if(foe.kind==='kage'){G.flags.kageDown=1;G.flags.keyEra=1;Quest.advance('main1',4);setTimeout(()=>toast('🪨 ผนึกห้องบอสใน "ถ้ำหินโกเลม" (ทางใต้สุดของเมือง) คลายแล้ว',4500),1200);}
    if(foe.kind==='golem'){G.flags.golemDown=1;Quest.advance('main1',5);Quest.activate('lava');}
    if(foe.kind==='lavaking'){G.flags.lavaDown=1;Quest.advance('lava',3);for(const pt of Z.props)if(pt.k==='portal'||pt.k==='stairs')pt.locked=0;}
    if(foe.kind==='seraph')G.flags.seraphDown=1;
    if(foe.kind==='duelist'){G.flags.duelWon=1;foe.alive=false;G.skills.learned.add('bluejudge');setTimeout(()=>toast('🐉 ได้รับท่าสุดยอด: คำพิพากษาตาคราม — ตั้งช่อง 4 ที่หน้าสกิล (K)',5000),1500);}
    if(d.boss)setBossCD(foe.kind);
    if(Z.bossRoom&&d.boss){Z.cleared=1;for(const pt of Z.props)if(pt.k==='portal'||pt.k==='exitdoor')pt.locked=0;setTimeout(()=>toast('🔓 ผนึกห้องบอสคลายแล้ว — เก็บของแล้วออกทางประตูหรือพอร์ทัลได้',3500),400);}
    const newSk=Skills.check();
    BT=null;G.mode='explore';UI.lootPopup(out,`ชนะ! ${d.n} Lv.${b.e.lv}${foe.elite?' (หัวหน้า)':''}`,xp,ups,newSk);
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
  const net=G.vsNet||null,nm=net?(net==='host'?['P1 · เจ้าของห้อง','P2 · เพื่อน']:['P1 · เจ้าของห้อง','P2 · คุณ']):['P1','P2'];
  const mine=vsLoadout(),other=G.vsOther||null,defA=Stats.arena();
  const lo1=net==='guest'?other:mine, lo2=net?(net==='guest'?mine:other):null;   // โลคัล: P2 ใช้ชุดตั้งต้นของกลาง
  const pack=(lo,defLook)=>lo?{S:vsLoadoutToS(lo),look:Object.assign({},lo.look,{weapon:lo.wpn}),wpn:lo.wpn,lv:lo.level,skills:lo.skills}
    :{S:defA,look:Object.assign({},defLook,{weapon:CONFIG.arena.weapon}),wpn:CONFIG.arena.weapon,lv:defA.level,skills:CONFIG.arena.skills};
  const A1=pack(lo1,Equip.look()),A2=pack(lo2,KAGE_LOOK);
  const mk=(X,o)=>mkF(Object.assign({rig:true,S:Object.assign({},X.S,{res:Object.assign({},X.S.res)}),hp:X.S.maxHP,maxHp:X.S.maxHP,dhp:X.S.maxHP,mp:0,sta:X.S.maxSTA,wpn:X.wpn,hw:14,h:100,lv:X.lv,ultKeys:new Set(),moves:null,cdMul:1,spdMul:1},o));
  const p=mk(A1,{x:140,dir:1,isP:true,keys:VSKN1,look:A1.look,name:'P1',vsName:nm[0],skillSet:A1.skills,skk:VSS1,cd:{},mp:A1.S.maxMP});
  const e=mk(A2,{x:340,dir:-1,isP2:true,keys:VSKN2,look:A2.look,name:'P2',vsName:nm[1],skillSet:A2.skills,skk:VSKN2_SK,cd:{},mp:A2.S.maxMP});
  BT={net:G.vsNet||null,vs:{wins:wins.slice(),round},foe:null,def:{},p,e,proj:[],parts:[],nums:[],bursts:[],bolts:[],hitstop:0,shake:0,intro:90,end:0,slow:0,result:null,msg:null,small:null,lastMove:null,lastT:0,
    comboT:0,comboShow:0,flash:null,time:99*60,white:0,fullCombo:null,phaseMsg:null,fleeCD:0};
  wrap.classList.add('battle','vs');G.mode='battle';
}
function finishVS(){
  const b=BT,v=b.vs;wrap.classList.remove('battle','vs');
  if(b.result==='win')v.wins[0]++;else if(b.result==='lose')v.wins[1]++;
  const need=CONFIG.arena.rounds,done=v.wins[0]>=need||v.wins[1]>=need;
  const net=b.net;
  if(!done){if(net==='host'){Net.rid++;Net.tx({t:'round',rid:Net.rid,wins:v.wins,round:v.round+1});}setupVS(v.wins,v.round+1);return;}   // ยกต่อไป
  const w=v.wins[0]>v.wins[1]?'P1':'P2';
  if(net==='host'){Net.tx({t:'end',w,wins:v.wins});Net.endBattle();}
  BT=null;G.mode='menu';UI.vsResult(w,v.wins,net);
}
/* ---------- poses ---------- */
function poseFor(f){
  const P=poseIdle(G.t+(f.isP?0:40)),lp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],ln=(a,b,t)=>a+(b-a)*t;
  const W0=WEAPONS[f.wpn];if(W0&&W0.thrust)P.wa=-.25;
  switch(f.state){
    case'walk':{const ph=f.walkT*.22;P.ff=[3+4*Math.sin(ph),-Math.max(0,Math.cos(ph))*2.5];P.bf=[-2-4*Math.sin(ph),-Math.max(0,-Math.cos(ph))*2.5];P.hip=-14-Math.abs(Math.sin(ph))*.6;break;}
    case'crouch':case'getup':P.hip=-9;P.lean=.3;P.ff=[6,0];P.bf=[-5,0];P.fh=[7,2];P.bh=[3,5];break;
    case'cblock':P.hip=-9;P.lean=.2;P.ff=[6,0];P.bf=[-5,0];P.fh=[6,-3];P.bh=[5,-1];P.wa=-1.5;break;
    case'block':P.lean=-.12;P.fh=[5,-4];P.bh=[4,-1];P.wa=-1.5;break;
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
      const m=f.move,ph=f.phase,Sx=ph==='startup',A=ph==='active',u=Sx?Math.min(1,f.pt/Math.max(1,f.isP||f.isP2||m.skillId?m.s:Math.round(m.s*CONFIG.enemyStartupMul))):A?f.pt/Math.max(1,m.a):f.pt/Math.max(1,m.r);
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
  const d=f.def,sc=d.sc,map=SPR[d.map]||GOLEM,pal=PAL[d.pal],nf=d.noFlip||map===GOLEM;let x=f.x,y=f.y;
  if(d.hover&&f.state!=='down'&&f.state!=='ko')y-=14+Math.round(Math.sin(G.t*.07)*3);
  if(f.state==='attack'){if(f.phase==='startup')x-=f.dir*3;else if(f.phase==='active')x+=f.dir*6;}
  if(f.state==='hurt')x+=rnd(-1.5,1.5);if(f.state==='walk')y-=Math.round(Math.abs(Math.sin(G.t*.25))*2);if(f.state==='stun')x+=Math.sin(G.t*.3)*1.5;
  const lying=f.state==='down'||f.state==='ko'||f.state==='airhurt';
  const ai=AS.has('mon_'+f.kind),mh=ai?Math.max(map.length*sc,d.boss?110:48):map.length*sc,sq=f.state==='attack'&&f.phase==='startup'?1.06:1;
  const dm=(X,Y)=>ai?AS.mon(g,f.kind,X,Y,mh*sq,f.dir<0&&!nf,tint):spr(g,map,pal,X,Y,sc,f.dir<0&&!nf,tint);
  if(lying){g.save();g.translate(x,y);g.rotate(-f.dir*(f.state==='airhurt'?.6:1.3));dm(0,0);g.restore();}
  else dm(x,y);
  if(f.weakT>0&&d.weakPoint&&!lying){const p=(Math.sin(G.t*.3)+1)/2;g.fillStyle=`rgba(90,255,176,${.5+p*.5})`;g.beginPath();g.arc(x,y-sc*(d.weakY||6.5),sc*2.2+p*3,0,7);g.fill();}
  if(f.state==='attack'&&f.phase==='active'&&!f.move.proj&&!f.move.quake&&!f.move.rain&&!f.move.beam){const m=f.move;g.strokeStyle='rgba(255,110,80,.85)';g.lineWidth=4;g.beginPath();
    g.arc(f.x+f.dir*f.hw*.5,f.y-m.hy,Math.max(16,m.reach*.6),f.dir>0?-1:Math.PI-.7,f.dir>0?.7:Math.PI+1);g.stroke();}
}
function drawFighterB(f){
  const hgt=Math.max(0,GY-f.y);shadow(g,f.x,GY,(f.kind==='golem'||f.kind==='lavaking'||f.kind==='seraph'?46:f.kind==='icegolem'?38:f.h<60?24:18)*Math.max(.4,1-hgt/140));
  let tint=null;
  if(f.flash>0&&f.flash%2)tint='#ffffff';
  else if(!f.isP&&!f.isP2&&f.state==='attack'&&f.phase==='startup'&&G.t%8<2)tint='#ff6a5a';
  else if(f.state==='stun'&&G.t%14<3)tint='#ffe27a';
  else if((f.isP||f.isP2)&&inWindow(f)&&G.t%4<2)tint='#ffe27a';
  const ghost=f.invuln>0&&['dodge','backdash','getup','idle','walk'].includes(f.state);
  if(f.rig){const tc=WEAPONS[f.wpn]?ELC[WEAPONS[f.wpn].el]:'#fff';
    f.trail.forEach((tr,i)=>{if(!tr.P)return;g.globalAlpha=.12+i*.06;drawRig(g,tr.x,tr.y,3,f.dir,tr.P,f.look,tc);});g.globalAlpha=ghost?.5:1;
    drawRig(g,f.x,f.y,3,f.dir,poseFor(f),f.look,tint);g.globalAlpha=1;const m=f.move;
    if(f.state==='attack'&&m&&f.phase==='active'&&!m.proj&&!m.beam&&WEAPONS[f.wpn].len&&['slash','slash2','heavyslash'].includes(m.anim)){
      g.strokeStyle=WEAPONS[f.wpn].fx;g.globalAlpha=.55;g.lineWidth=6;g.beginPath();const cx=f.x+f.dir*6,cy=f.y-66;
      if(f.dir>0)g.arc(cx,cy,48,-1.9,1.2);else g.arc(cx,cy,48,Math.PI-1.2,Math.PI+1.9);g.stroke();g.globalAlpha=1;}
    if(f.state==='attack'&&m&&m.beam&&m.dragon){const hx=f.x+f.dir*30,hy=f.y-70,
      u=f.phase==='startup'?f.pt/Math.max(1,m.s):f.phase==='active'?1:1-f.pt/Math.max(1,m.r);drawDragon(g,hx,hy-(f.phase==='startup'?(1-u)*30:0),f.dir,u,f.phase==='active'?1:u*.4,m.dragon);}
    if(f.state==='attack'&&m&&m.beam&&f.phase!=='recovery'){const el=ELC[m.el]||'#fff',ey=f.def&&f.def.eye,dg=!!m.dragon,hx=dg?f.x+f.dir*30:f.x+f.dir*(ey?ey[0]+14:36),hy=dg?f.y-70:f.y-(ey?ey[1]-(f.def.hover?14:0):62);
      if(f.phase==='startup'){const r=4+f.pt/m.s*12;g.fillStyle=el;g.globalAlpha=.8;g.beginPath();g.arc(hx,hy,r,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(hx,hy,r*.5,0,7);g.fill();g.globalAlpha=1;}
      else{const w=22+Math.sin(G.t*.8)*3,ex=f.dir>0?W+20:-20;g.globalAlpha=.85;g.fillStyle=el;g.fillRect(Math.min(hx,ex),hy-w,Math.abs(ex-hx),w*2);
        g.fillStyle='#fff';g.fillRect(Math.min(hx,ex),hy-w*.45,Math.abs(ex-hx),w*.9);g.globalAlpha=1;g.fillStyle=el;g.beginPath();g.arc(hx,hy,w*(dg?.6:1.3),0,7);g.fill();}}
    if(f.buffT>0){g.strokeStyle='rgba(160,210,255,.6)';g.lineWidth=2;g.beginPath();g.ellipse(f.x,f.y-50,26,56,0,0,7);g.stroke();}
  }else{g.globalAlpha=ghost?.5:1;drawMon(f,tint);g.globalAlpha=1;}
  if(['block','cblock','gstun'].includes(f.state)){const fresh=f.isP&&G.t-f.backPressT<=8;g.strokeStyle=fresh?'rgba(255,226,122,.95)':'rgba(140,200,255,.6)';g.lineWidth=fresh?4:2;
    const cy=f.y-(isCrouch(f)?36:56);g.beginPath();if(f.dir>0)g.arc(f.x+6,cy,34,-1.1,1.1);else g.arc(f.x-6,cy,34,Math.PI-1.1,Math.PI+1.1);g.stroke();}
  if(f.state==='stun'||f.state==='parried')for(let i=0;i<3;i++){const a=G.t*.12+i*2.1;g.fillStyle='#ffe27a';g.fillRect(f.x+Math.cos(a)*14,f.y-f.h-8+Math.sin(a)*3,3,3);}
}
function drawBurst(u){const k=u.t/14,r=(u.big?30:18)*(.4+k);g.globalAlpha=1-k;g.strokeStyle=u.col;g.lineWidth=u.big?3:2;g.beginPath();
  for(let i=0;i<8;i++){const a=i/8*6.283+u.t*.05;g.moveTo(u.x+Math.cos(a)*r*.35,u.y+Math.sin(a)*r*.35);g.lineTo(u.x+Math.cos(a)*r,u.y+Math.sin(a)*r);}g.stroke();
  g.fillStyle='#fff';g.beginPath();g.arc(u.x,u.y,(u.big?9:6)*(1-k),0,7);g.fill();g.globalAlpha=1;}
function drawBattle(){
  const b=BT;g.save();if(b.shake)g.translate(rnd(-b.shake,b.shake)|0,rnd(-b.shake,b.shake)|0);
  g.drawImage(bbC,0,0,W,H);drawTorch(g,62,86,2);drawTorch(g,418,86,2);if(FX.on)HD.atmos(g,buildBattleBg.last||'cave',G.t*.5,0);
  if(b.flash){g.fillStyle='rgba(0,0,10,.72)';g.fillRect(0,0,W,H);for(let i=0;i<14;i++){g.fillStyle='rgba(255,255,255,.12)';g.fillRect(0,(hash(i,G.t>>1)*H)|0,W,1);}}
  (b.p.state==='attack'?[b.e,b.p]:[b.p,b.e]).forEach(drawFighterB);
  for(const pr of b.proj){if(pr.rock){g.fillStyle=pr.col;g.beginPath();g.arc(pr.x,pr.y,pr.r,0,7);g.fill();g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.arc(pr.x-3,pr.y-3,pr.r*.5,0,7);g.fill();continue;}
    const wob=Math.sin(G.t*.6)*1.5;g.fillStyle=pr.col;g.globalAlpha=.5;g.beginPath();g.ellipse(pr.x-Math.sign(pr.vx)*pr.r*.6,pr.y,pr.r*1.8+wob,pr.r*1.1,0,0,7);g.fill();g.globalAlpha=1;
    g.beginPath();g.arc(pr.x,pr.y,pr.r+wob*.5,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(pr.x,pr.y,pr.r*.5,0,7);g.fill();}
  for(const u of b.bolts){g.strokeStyle='#e8fbff';g.lineWidth=3;g.globalAlpha=u.t/14;g.beginPath();let y=0,x=u.x;g.moveTo(x,y);while(y<GY){y+=20;x+=rnd(-10,10);g.lineTo(x,y);}g.stroke();g.globalAlpha=1;}
  for(const q of b.parts){g.globalAlpha=Math.min(1,q.l/12);g.fillStyle=q.c;g.fillRect(q.x|0,q.y|0,q.s||2,q.s||2);}g.globalAlpha=1;
  b.bursts.forEach(drawBurst);g.restore();
  const fl=()=>Math.sin(G.t*.25)*4+rnd(-2,2);
  const ls=[{x:62,y:90,r:140+fl(),c:'rgba(255,140,60,.18)'},{x:418,y:90,r:140+fl(),c:'rgba(255,140,60,.18)'},{x:b.p.x,y:b.p.y-50,r:110},{x:b.e.x,y:b.e.y-50,r:110},{x:240,y:150,r:200}];
  for(const pr of b.proj)if(!pr.rock)ls.push({x:pr.x,y:pr.y,r:60,c:pr.col+'66'});
  for(const u of b.bolts)ls.push({x:u.x,y:150,r:120,c:'rgba(200,240,255,.4)'});
  for(const f of [b.p,b.e])if(f.state==='attack'&&f.move&&f.move.beam&&f.phase==='active')ls.push({x:240,y:f.y-62,r:260,c:(ELC[f.move.el]||'#ffffff')+'55'});
  lighting(ls,'rgba(8,5,16,.42)');
}
