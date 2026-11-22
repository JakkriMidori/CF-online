'use strict';
/* =====================================================================
   VFX bridge — เชื่อมเอฟเฟกต์ Sprite Fusion (SFVFX, MIT © 2026 Hugo Duprez) เข้ากับ Ray of Aether
   • เรนเดอร์ลงบัฟเฟอร์พิกเซลขนาดจอตรรกะ 480×270 (1 พิกเซลเอฟเฟกต์ = 1 พิกเซลเกม) → คมชัดตรงกริดพิกเซลอาร์ต
     สีปกติวาดทับ, ชั้นแสง (light) บวกแบบ 'lighter' → เข้ากับ bloom ของ HD-2D
   • หน่วยพิกัดของเอฟเฟกต์ = 2 × พิกเซลจอ (PX=2 ตามต้นฉบับ)
   • เกี่ยวเข้ากับเกมด้วยการห่อฟังก์ชันเดิม (ไม่แก้ตรรกะเกม): applyHit · tryStatus · fxHeal/fxMana · spawnMoveFx
     · LootManager.pickup · Prog.gainXP · drawFighterB/drawBattle/drawExplore
   • ปิด/เปิด: VFX.on (กด V ปิดเอฟเฟกต์ HD-2D ก็ปิดตามด้วย)
   ===================================================================== */
const VFX=(()=>{
  const SP={b:[],e:[]},last={b:-1,e:-1},BUF={};let frameDone=-1;
  const hex=h=>{const v=parseInt(String(h).replace('#',''),16);return((255<<24)|((v&255)<<16)|(((v>>8)&255)<<8)|((v>>16)&255))|0;};
  const RAMP={   /* สีไล่ 7 ระดับ (สว่าง→มืด) ต่อธาตุ ใช้กับรอยฟัน/สะเก็ด */
    phys:['#ffffff','#e8f1ff','#b8c9e8','#62c8f4','#3a8bd8','#2c58aa','#212f6b'],
    fire:['#ffffff','#fff3a6','#ffd23a','#ff8a2a','#e2461d','#a8281a','#5a1410'],
    ice:['#ffffff','#e8fbff','#a6ecff','#62c8f4','#3a8bd8','#2c58aa','#212f6b'],
    lightning:['#ffffff','#fdfbe0','#fff38a','#ffd84a','#d8a020','#9a6a10','#4a3408'],
    poison:['#ffffff','#f6ffc2','#cfff63','#8eea3f','#55b92f','#318232','#173320'],
    shadow:['#ffffff','#f0d8ff','#c88aff','#9a48e8','#6a24b0','#40166e','#200a38'],
    arcane:['#ffffff','#ffd8f5','#ff9ee4','#ff5fd0','#d43cc4','#8a2bb0','#4b1a6a'],
    holy:['#ffffff','#fffbe2','#fff0a6','#ffd862','#f6aa3c','#cf722b','#7e3c1f']};
  const rampOf=el=>(RAMP[el]||RAMP.phys).map(hex);
  const energyCol=el=>el==='holy'||el==='lightning'||el==='fire'?'gold':el==='shadow'||el==='arcane'||el==='poison'?'pink':'cyan';
  const on=()=>VFX.on&&(typeof FX==='undefined'||FX.on);
  // ---- บัฟเฟอร์ ----
  function buf(){if(BUF.cv)return BUF;const mk=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');const im=x.createImageData(W,H);return{c,x,im,u:new Uint32Array(im.data.buffer)};};
    BUF.cv=mk();BUF.lt=mk();BUF.frame={w:W,h:H,ox:0,oy:0,color:BUF.cv.u,light:BUF.lt.u};return BUF;}
  // ---- เงาตัวละคร (มาสก์รูปแคปซูล) ให้ไฟ/ร่างเงาเกาะตามรูปร่าง ----
  const silC={};
  function silMask(w,h){w=Math.max(4,Math.round(w));h=Math.max(6,Math.round(h));const k=w+'x'+h;if(silC[k])return silC[k];const d=new Uint32Array(w*h),r=w/2;
    for(let y=0;y<h;y++){const hy=y<r?r-y:0,hw=y<r?Math.sqrt(Math.max(0,r*r-hy*hy)):r*(y>h*.82?.72:y>h*.5?.86:1);for(let x=0;x<w;x++)if(Math.abs(x+.5-r)<=hw)d[y*w+x]=0xff000000|0;}
    return silC[k]={w,h,d};}
  // ---- ผู้แสดง (actor) ----
  function actorB(f){return{feet:()=>[bsx(f.x)*2,bsy(f.y)*2],
    hand:()=>({x:bsx(f.x+f.dir*22)*2,y:bsy(f.y-(f.h||100)*.6)*2,a:f.dir>0?0:Math.PI}),
    silhouette:()=>{const m=silMask((f.hw||15)*2*BZ,(f.h||100)*BZ);return{x:Math.round(bsx(f.x)-m.w/2),y:Math.round(bsy(f.y)-m.h),w:m.w,h:m.h,data:m.d};}};}
  function actorE(){return{feet:()=>{const q=PJ.pt(P.x,P.y);return[q.x*2,q.y*2];},
    hand:()=>{const q=PJ.pt(P.x+(P.face||1)*6,P.y-14);return{x:q.x*2,y:q.y*2,a:(P.face||1)>0?0:Math.PI};},
    silhouette:()=>{const q=PJ.pt(P.x,P.y),m=silMask(14*q.s,30*q.s);return{x:Math.round(q.x-m.w/2),y:Math.round(q.y-m.h),w:m.w,h:m.h,data:m.d};}};}
  const shake=k=>{if(BT)BT.shake=Math.max(BT.shake||0,Math.min(6,k*10));else if(typeof G!=='undefined')G.shake=Math.max(G.shake||0,Math.min(4,k*8));};
  // ---- สร้าง / อัปเดต / วาด ----
  const MAXT={sparkle:1.1,pickup:1.6,impact:1,slash:.8,'muzzle-flash':.6};   /* อายุสูงสุด (วิ) กันเอฟเฟกต์ค้าง */
  const HEAVY=new Set(['sword-rain','lightning','holy-light','shield','black-hole','ice','power-up','explosion','energy']);
  const PX=n=>typeof PXFX!=='undefined'&&PXFX[n];   /* เอฟเฟกต์ pixelfx (js/pxfx.js) ใช้ผ่านสะพานเดียวกัน */
  function add(space,name,o){const MK=(typeof SFVFX!=='undefined'&&SFVFX[name])||PX(name);if(!on()||!MK)return null;const L=SP[space];if(L.length>=24)return null;
    if(HEAVY.has(name)&&L.filter(f=>HEAVY.has(f._n)).length>=5)return null;   /* งบประสิทธิภาพ: เอฟเฟกต์หนักพร้อมกันไม่เกิน 5 */
    try{const fx=MK(Object.assign({seed:(Math.random()*1e9)|0,shake},o));fx._n=name;fx._t=0;fx._max=o&&o._max||MAXT[name]||4;L.push(fx);return fx;}catch(e){console.warn('VFX',name,e);return null;}}
  function tick(space){const L=SP[space],gt=typeof G!=='undefined'?G.t:0;let n=last[space]<0?1:gt-last[space];last[space]=gt;if(n<=0||!L.length)return;n=Math.min(n,4);
    for(let i=L.length-1;i>=0;i--){const fx=L[i];try{for(let k=0;k<n;k++)fx.update(1/60);fx._t+=n/60;if(fx.done()||fx._kill||fx._t>fx._max){L.splice(i,1);if(fx._owner&&fx._owner._vfx)for(const t in fx._owner._vfx)if(fx._owner._vfx[t]===fx)delete fx._owner._vfx[t];}}catch(e){L.splice(i,1);}}}
  function render(space,layer){const L=SP[space];if(!L.length)return;const B=buf(),LA=space==='e'?.28:.42,CA=space==='e'?.9:.82;B.cv.u.fill(0);B.lt.u.fill(0);
    for(const fx of L){try{if(layer)fx.draw(B.frame,layer);else{fx.draw(B.frame,'back');fx.draw(B.frame,'front');}}catch(e){fx._kill=1;}}
    B.cv.x.putImageData(B.cv.im,0,0);B.lt.x.putImageData(B.lt.im,0,0);
    g.save();g.setTransform(RES,0,0,RES,0,0);g.imageSmoothingEnabled=false;g.globalAlpha=CA;g.globalCompositeOperation='source-over';g.drawImage(B.cv.c,0,0);
    g.globalCompositeOperation='lighter';g.globalAlpha=LA;g.drawImage(B.lt.c,0,0);g.restore();}
  function clear(space){if(space)SP[space].length=0;else{SP.b.length=0;SP.e.length=0;}}
  // ---- ตัวช่วยเฉพาะฉากต่อสู้ ----
  const bx=x=>bsx(x)*2,by=y=>bsy(y)*2,GND=()=>GY*2;
  function attach(f,type,name,o){f._vfx=f._vfx||{};const cur=f._vfx[type];if(cur&&SP.b.includes(cur))return cur;const fx=add('b',name,Object.assign({actor:actorB(f),ground:GND()},o));if(fx){fx._owner=f;f._vfx[type]=fx;}return fx;}
  function onActive(f,m){const o=f===BT.p?BT.e:BT.p,el=m.el&&m.el!=='weapon'?m.el:(f.rig&&WEAPONS[f.wpn]?WEAPONS[f.wpn].el:(f.def&&f.def.el))||'phys';
    const tx=()=>{if(!o)return f.x+f.dir*80;const dx=o.x-f.x;return m.strike&&!(Math.sign(dx)===f.dir&&Math.abs(dx)<=m.strike+o.hw)?f.x+f.dir*m.strike:o.x;};
    if(m.skillId==='frostfirecataclysm'){
      const cx=o?(f.x+o.x)*.5:f.x+f.dir*70,bfPal=['#ffffff','#e8ffff','#8ef2ff','#38d8ff','#1884ec','#0e4a9e','#092658','#05122e'],bfRamp=['#ffffff','#e0fcff','#7ff3ff','#28b8ff','#1468d8','#0d388a','#081844'].map(hex);
      add('b','frostfire-cataclysm',{x:bx(cx),y:by(GY),count:m.multi||6,spread:Math.round(92*BZ),_max:2.3});
      add('b','ice',{kind:'nova',x:bx(f.x),ground:GND(),charge:.06,hold:.52,size:.52,reach:Math.min(220,(m.reach||220)*BZ*2*.44),palette:bfPal});
      add('b','ice',{kind:'spikes',x:bx(f.x),dir:f.dir,count:6,spacing:34,size:.48,ground:GND(),palette:bfPal});
      if(o){add('b','ice',{kind:'crystals',x:bx(o.x),ground:GND(),size:.52,hold:.75,end:'shatter',palette:bfPal});
        add('b','fire',{box:[bx(o.x)-38,GND()-36,76,36],size:.62,wind:f.dir*18,duration:1.35,ramp:bfRamp});}
      return;}
    if(m.skillId==='emeraldhellfire'||(m.greenFlame&&m.rain)){
      const tx0=o?o.x:f.x+f.dir*80,gfRamp=['#ffffff','#e8ffea','#9effa8','#4aff7a','#16a34a','#0e642c','#062e14'].map(hex);
      add('b','emerald-firestorm',{x:bx(tx0),y:by(GY),count:m.multi||6,spread:Math.round(90*BZ),_max:2.4});
      add('b','fire',{box:[bx(tx0)-46,GND()-38,92,38],size:.68,wind:f.dir*38,duration:1.5,ramp:gfRamp});
      add('b','poison',{kind:'cloud',x:bx(tx0),ground:GND(),size:.54,from:[bx(f.x),by(f.y-60)]});
      return;}
    if(m.frostnova){add('b','ice',{kind:'nova',x:bx(f.x),ground:GND(),size:.5,reach:Math.min(220,(m.reach||240)*BZ*2*.42)});return;}
    if(m.lightJudge){const X=f._ljX??(o?o.x:f.x+f.dir*80);add('b','holy-light',{x:bx(X),ground:GND(),width:.65,hold:.55});return;}
    if(m.strike){const X=tx();
      if(el==='lightning')add('b','lightning',{kind:'strike',x:bx(X),ground:GND(),size:.52,clouds:false});
      else if(el==='ice')add('b','ice',{kind:'spikes',x:bx(X)-f.dir*30,dir:f.dir,count:2,spacing:34,size:.48,ground:GND()});
      else if(el==='fire')add('b','explosion',{x:bx(X),ground:GND(),size:.45,earth:.25,chunks:.25,scorch:.35});
      else if(el==='holy')add('b','holy-light',{x:bx(X),ground:GND(),width:.42,hold:.38});
      else if(el==='shadow'||el==='arcane')add('b','black-hole',{x:bx(X),y:by(GY-60),radius:12,life:1.0});
      else if(el==='poison')add('b','poison',{kind:'puddle',x:bx(X),ground:GND(),size:.48});
      return;}
    if(m.rain&&o){const xs=[-34,34];
      if(el==='holy')xs.forEach((d,i)=>setTimeout(()=>add('b','holy-light',{x:bx(o.x+d),ground:GND(),width:.4,hold:.28}),i*240));
      else if(el==='fire')xs.forEach((d,i)=>setTimeout(()=>add('b','explosion',{x:bx(o.x+d),ground:GND(),size:.42,earth:.2,chunks:.2}),i*280));
      else if(el==='ice')add('b','ice',{kind:'crystals',x:bx(o.x),ground:GND(),size:.46});
      else if(el==='poison')add('b','poison',{kind:'cloud',x:bx(o.x),ground:GND(),size:.52,from:[bx(f.x),by(f.y-60)]});
      else if(el==='lightning')xs.forEach((d,i)=>setTimeout(()=>add('b','lightning',{kind:'strike',x:bx(o.x+d),ground:GND(),size:.42,clouds:false}),i*220));
      return;}
    if(m.beam&&o){if(el==='shadow'||el==='arcane')add('b','black-hole',{x:bx(o.x),y:by(o.y-55),radius:16,life:1.2});
      else if(el==='holy')add('b','holy-light',{x:bx(o.x),ground:GND(),width:.55,hold:.6});
      else if(el==='lightning')add('b','lightning',{kind:'arc',from:[bx(f.x+f.dir*24),by(f.y-60)],to:[[bx(o.x),by(o.y-50)]],duration:.45});
      else{const h=actorB(f).hand();add('b','energy',{kind:'bolt',x:h.x,y:h.y,to:[bx(o.x),by(o.y-50)],colors:energyCol(el),charge:.08,speed:900,ground:GND()});}
      return;}
    if(m.proj){const h=actorB(f).hand();add('b','muzzle-flash',{x:h.x,y:h.y,angle:h.a,size:.36,casing:false,smoke:false,sparks:2,ground:GND()});return;}
    if(m.buff){attach(f,'buff','power-up',{size:.5});return;}
    if(['slash','slash2','heavyslash'].includes(m.anim)){const big=m.anim==='heavyslash'||m.super,rv=m.anim==='slash2';
      add('b','slash',{x:bx(f.x+f.dir*14),y:by(f.y-56),facing:f.dir,size:big?.68:.52,from:rv?.95:-2.55,to:rv?-2.55:.95,ramp:rampOf(el),ground:GND(),sparks:big?5:3});}}
  // ตรวจ "เริ่มช่วงโจมตีจริง" ของทั้งสองฝ่ายทุกเฟรม (ไม่ต้องแก้ battle.js)
  function scanBattle(){if(!BT||!on())return;for(const f of [BT.p,BT.e]){if(!f)continue;const m=f.move;
      if(f.state==='attack'&&f.phase==='active'&&m){if(f._vfxMv!==m||f._vfxSeq!==f.moveSeq){f._vfxMv=m;f._vfxSeq=f.moveSeq;try{onActive(f,m);}catch(e){}}}else if(f.state!=='attack')f._vfxMv=null;}
    if(BT.phaseMsg&&BT.phaseMsg!==BT._vfxPh){BT._vfxPh=BT.phaseMsg;const f=BT.e&&BT.e.hp>0?BT.e:BT.p;attach(f,'pw','power-up',{size:.6});}
    if(BT.flash&&BT.flash!==BT._vfxFl){BT._vfxFl=BT.flash;if(BT.flash.f)attach(BT.flash.f,'pw','power-up',{size:.68});}}
  function onBursts(a,t,n0){const B=BT&&BT.bursts;if(!B)return;for(let i=n0;i<B.length;i++){const u=B[i],ang=a&&a.dir<0?Math.PI:0;
      add('b','impact',{kind:'hit',x:bx(u.x),y:by(u.y),angle:ang,normal:ang+Math.PI,size:u.crit?.52:u.big?.4:.32,ramp:rampOf(u.el||'phys'),ground:GND()});
}
    const last=BT.nums&&BT.nums[BT.nums.length-1];if(t&&last&&/^กัน /.test(last.txt||'')&&!(t._vfxShT>G.t)){t._vfxShT=G.t+40;attach(t,'shield','shield',{radius:Math.round((t.h||100)*BZ*.68),hold:.35,hits:[]});}}
  // ---- ฉากเดินสำรวจ: ประกายบนของตก / หีบ ----
  function scanExplore(){}   /* ประกายบนของตก/หีบ: ใช้แบบเดิมของเกม (ไม่ใช้ sparkle ของ Sprite Fusion) */
  return{on:true,add,attach,clear,tick,render,actorB,actorE,rampOf,hex,SP,
    frameBattleBack(){if(frameDone===G.t)return;frameDone=G.t;tick('b');scanBattle();render('b','back');},
    frameBattleFront(){render('b','front');},
    frameExplore(){tick('e');scanExplore();render('e');},
    onBursts};
})();
/* ---------- ห่อฟังก์ชันเดิมของเกม (โหลดหลัง battle/world/systems/ui) ---------- */
(()=>{
  if(typeof applyHit==='function'){const _ah=applyHit;applyHit=function(a,t){const n0=BT&&BT.bursts?BT.bursts.length:0;const r=_ah.apply(this,arguments);try{if(BT&&!BT.vs?.noFx)VFX.onBursts(a,t,n0);}catch(e){}return r;};}
  if(typeof tryStatus==='function'){const _ts=tryStatus;tryStatus=function(t,type,stacks,src,durSec){const had=!!(t&&t.st8&&t.st8[type]);const r=_ts.apply(this,arguments);
    try{if(BT&&t&&t.st8&&t.st8[type]&&!had){const d=Math.max(1,durSec||CONFIG.statusDur/60);
      if(type==='burn')VFX.attach(t,'burn','fire',{size:.42,duration:d});
      else if(type==='poison')VFX.attach(t,'poison','poison',{kind:'aura',size:.46});
      else if(type==='shock')VFX.attach(t,'shock','lightning',{kind:'crackle',duration:Math.min(3,d),radius:22});}}catch(e){}return r;};}
  if(typeof fxHeal==='function'){const _h=fxHeal;fxHeal=function(f){const r=_h.apply(this,arguments);try{if(BT)VFX.attach(f,'heal','heal',{kind:'heal',count:7});}catch(e){}return r;};}
  if(typeof fxMana==='function'){const _m=fxMana;fxMana=function(f){const r=_m.apply(this,arguments);try{if(BT)VFX.attach(f,'mana','heal',{kind:'mana',count:6});}catch(e){}return r;};}
  if(typeof spawnMoveFx==='function'){const _mv=spawnMoveFx;spawnMoveFx=function(kind,actor,x0,x1,dir){const r=_mv.apply(this,arguments);
    try{if(BT&&actor){const d=dir||actor.dir||1;VFX.add('b','movement',{kind:kind==='blink'?'blink':'dash',actor:VFX.actorB(actor),x:bsx(x0)*2,facing:d,distance:Math.abs((x1-x0)*BZ*2)||90,time:.18,ground:GY*2});}}catch(e){}return r;};}
  if(typeof drawFighterB==='function'){const _df=drawFighterB;drawFighterB=function(){try{VFX.frameBattleBack();}catch(e){}return _df.apply(this,arguments);};}
  if(typeof drawBattle==='function'){const _db=drawBattle;drawBattle=function(){const r=_db.apply(this,arguments);try{VFX.frameBattleBack();VFX.frameBattleFront();}catch(e){}return r;};}
  if(typeof drawExplore==='function'){const _de=drawExplore;drawExplore=function(){const r=_de.apply(this,arguments);try{VFX.frameExplore();}catch(e){}return r;};}
  if(typeof startBattle==='function'){const _sb=startBattle;startBattle=function(){VFX.clear('b');return _sb.apply(this,arguments);};}
  if(typeof LootManager!=='undefined'&&LootManager.pickup){const _pk=LootManager.pickup;LootManager.pickup=function(zone,gi){const r=_pk.apply(this,arguments);
    try{if(r&&r.ok&&gi&&!BT){const q=PJ.pt(gi.x,gi.y),rar=gi.drop&&gi.drop.rar,it=gi.drop&&gi.drop.kind==='gold'?'coin':(rar==='epic'||rar==='legendary'||rar==='god')?'orb':'gem';
      VFX.add('e','pickup',{x:q.x*2,y:q.y*2-8,item:it,actor:VFX.actorE(),magnet:true,wait:.05,palette:rar&&typeof RARC!=='undefined'&&RARC[rar]?['#ffffff',RARC[rar],'#1a1020']:undefined});}}catch(e){}return r;};}
  if(typeof Prog!=='undefined'&&Prog.gainXP){const _gx=Prog.gainXP;Prog.gainXP=function(){const ups=_gx.apply(this,arguments);try{if(ups>0){if(BT&&BT.p)VFX.attach(BT.p,'lv','power-up',{size:.65});else VFX.add('e','power-up',{actor:VFX.actorE(),size:.58});}}catch(e){}return ups;};}
})();
