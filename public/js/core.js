'use strict';
/* ============================================================
   CORE — canvas, input, sound, RNG, pixel sprites, character rig
   ============================================================ */
const $=s=>document.querySelector(s);
const wrap=$('#wrap'),cv=$('#c'),D=cv.getContext('2d');
const W=480,H=270,S=2,GY=236,GRAV=.34,FPS=60;
const mk=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
const RES=2,mkR=()=>{const c=document.createElement('canvas');c.width=W*RES;c.height=H*RES;return c;};   // บัฟเฟอร์ความละเอียด 2 เท่า (ภาพ AI คมขึ้น) · โค้ดวาดยังใช้พิกัด 480×270 เหมือนเดิม
const low=mkR(),g=low.getContext('2d'),lc=mk(),L=lc.getContext('2d'),bgC=mkR(),B=bgC.getContext('2d'),bbC=mkR(),BB=bbC.getContext('2d');
g.setTransform(RES,0,0,RES,0,0);BB.setTransform(RES,0,0,RES,0,0);
const canFilter=typeof D.filter==='string';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);};

/* RNG: one shared source so tests can seed it */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let RNG=Math.random;
const rand=()=>RNG();
const rnd=(a,b)=>a+Math.random()*(b-a);          // visual-only randomness
const rint=(a,b)=>a+Math.floor(rand()*(b-a+1));  // gameplay randomness
const pick=a=>a[Math.floor(rand()*a.length)];
function weighted(obj){let tot=0;for(const k in obj)tot+=obj[k];let r=rand()*tot;for(const k in obj){r-=obj[k];if(r<0)return k;}return Object.keys(obj)[0];}

/* INPUT — e.code so a Thai keyboard layout still works */
const keys={},pressed={};
addEventListener('keydown',e=>{
  if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'))return;
  const k=e.code;if(!keys[k])pressed[k]=true;keys[k]=true;
  if(e.target&&e.target.tagName==='BUTTON'&&(k==='Space'||k==='Enter'))return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Backquote','Tab'].includes(k))e.preventDefault();initAudio();});
addEventListener('keyup',e=>{keys[e.code]=false;});
// เมาส์ในฉากต่อสู้: คลิกซ้าย = ต่อย (J) · คลิกขวา = เตะ (K)
const MOUSE_KEY={0:'KeyJ',2:'KeyK'};
cv.addEventListener('mousedown',e=>{if(typeof G==='undefined'||G.mode!=='battle')return;const k=MOUSE_KEY[e.button];if(!k)return;e.preventDefault();if(!keys[k])pressed[k]=true;keys[k]=true;initAudio();});
addEventListener('mouseup',e=>{const k=MOUSE_KEY[e.button];if(k)keys[k]=false;});
cv.addEventListener('contextmenu',e=>{if(typeof G!=='undefined'&&G.mode==='battle')e.preventDefault();});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
const padKeys={};
const down=(...ks)=>ks.some(k=>keys[k]||padKeys[k]);
/* GAMEPAD — d-pad/stick → arrows, A → confirm/interact, B → back, X → J, Y → K, LB/RB → skills 1/2 */
const PADMAP={12:'ArrowUp',13:'ArrowDown',14:'ArrowLeft',15:'ArrowRight',0:'PadA',1:'Escape',2:'KeyJ',3:'KeyK',4:'Digit1',5:'Digit2',9:'Enter'};
const padPrev={};
function pollPad(){
  const gp=navigator.getGamepads?[...navigator.getGamepads()].find(Boolean):null;if(!gp)return;
  const st={};for(const b in PADMAP)st[PADMAP[b]]=!!(gp.buttons[b]&&gp.buttons[b].pressed);
  const ax=gp.axes||[];if(ax[0]<-.5)st.ArrowLeft=true;if(ax[0]>.5)st.ArrowRight=true;if(ax[1]<-.5)st.ArrowUp=true;if(ax[1]>.5)st.ArrowDown=true;
  for(const k in st){if(st[k]&&!padPrev[k])pressed[k]=true;padKeys[k]=st[k];padPrev[k]=st[k];}
}
const tap=(...ks)=>ks.some(k=>pressed[k]);
const KR=['KeyD','ArrowRight'],KL=['KeyA','ArrowLeft'],KU=['KeyW','ArrowUp'],KD=['KeyS','ArrowDown'];

/* SOUND */
let AC=null,NB=null;
function initAudio(){try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();}catch(e){AC=null;}}
const _dst=()=>(typeof SND!=='undefined'&&SND.master)||AC.destination;   // ผ่านปุ่มปรับเสียงหลัก
function tone(f,d,type='square',v=.06,slide=1){if(!AC||(typeof SND!=='undefined'&&SND.vol<=0))return;try{const t=AC.currentTime,o=AC.createOscillator(),gn=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide!==1)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+d);gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gn);gn.connect(_dst());o.start(t);o.stop(t+d+.02);}catch(e){}}
function noise(d,v=.12,hp=800){if(!AC||(typeof SND!=='undefined'&&SND.vol<=0))return;try{if(!NB){NB=AC.createBuffer(1,AC.sampleRate*.5|0,AC.sampleRate);const a=NB.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;}
  const t=AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),gn=AC.createGain();s.buffer=NB;f.type='highpass';f.frequency.value=hp;gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(gn);gn.connect(_dst());s.start(t);s.stop(t+d+.02);}catch(e){}}
const SFX={
  swing:()=>noise(.08,.05,2500),
  hit:big=>{noise(big?.18:.1,big?.2:.13,400);tone(big?90:150,big?.2:.12,'square',.07,.5);},
  crit:()=>{noise(.2,.2,300);tone(80,.25,'square',.09,.4);tone(1400,.08,'square',.04);},
  block:()=>{tone(700,.06,'square',.05,.8);noise(.05,.06,3000);},
  parry:()=>{tone(1200,.15,'triangle',.1,1.5);tone(1800,.22,'sine',.06);},
  perfect:()=>{tone(880,.07,'square',.05);setTimeout(()=>tone(1320,.12,'square',.05),60);},
  pick:()=>{tone(660,.07,'square',.05);setTimeout(()=>tone(990,.1,'square',.05),70);},
  craft:()=>[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.12,'triangle',.07),i*70)),
  fail:()=>tone(170,.25,'sawtooth',.05,.6),
  dodge:()=>noise(.12,.05,1500),
  jump:()=>tone(300,.12,'square',.04,2),
  talk:()=>tone(520+Math.random()*80,.03,'square',.025),
  ko:()=>{tone(220,.8,'sawtooth',.08,.25);noise(.5,.15,200);},
  win:()=>[523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>tone(f,.18,'square',.05),i*90)),
  level:()=>[392,523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>tone(f,.15,'triangle',.07),i*80)),
  smash:()=>{noise(.35,.2,200);tone(70,.35,'square',.08,.5);},
  flash:()=>{tone(200,.5,'sawtooth',.06,4);noise(.4,.1,1200);},
  fire:()=>{tone(400,.2,'square',.05,.4);noise(.2,.07,900);},
  status:()=>tone(300,.1,'triangle',.05,1.6),
  loot:r=>{const n={normal:1,rare:2,legendary:3,god:5}[r]||1;for(let i=0;i<n;i++)setTimeout(()=>tone(700+i*200,.1,'triangle',.06),i*70);}
};

/* PIXEL SPRITES */
const HERO=["...hhhhh....","..hhhhhhh...","..hhsssss...","..hssesse...","..hsssss....","...ssss.....",
"..cccccc....",".bccccccc...",".bcccccccs..",".bbcccccss..","..bbbbbb....","..pppppp....",
"..ppp.ppp...","..pp...pp...","..pp...pp...",".fff...fff.."];
const ANGEL=["...........ooccccoo...........", "..........occcccccco..........", "....ooo..occcccccccco..ooo....", "...owwwooccccDccDDcccoowwwo...", "..oWwWwwoccccIIIIcDccowwWwWo..", ".oWwwwWwcccDIhipiIccccwWwwwWo.", ".oVwWwwwcccchhpppiIDccwwwWwVo.", "oWWwwWwWccDIiipppiIcccWwWwwWWo", "oVWWwwwwCcDIiipppiIccCwwwwWWVo", "oWWwWwWwCCcciipppiiDCCwWwWwWWo", "oWVwwwwWCCcDiiipiiccCCWwwwwVWo", "oWWWwWwwwDCcciiiicDCDwwwWwWWWo", "oVWwwwWwWwDCcDccDDCDwWwWwwwWVo", "oWVwWwwwwWoDCCCCCCDoWwwwwWwVWo", "oWWwwWwWwwcccDDDDcccwwWwWwwWWo", "oVWWwwwwWVCCCCCCCCCCVWwwwwWWVo", "oVWwWwWwwVccCccsccCccCwWwWwWVo", "oVVWWWWVWccCcccsccCCccCWWWWVVo", ".oVVWVWWVccCcccscbBCccCWVWVVo.", ".oVWWWVWccCccccscBCCoccCWWWVo.", "..oVVVVVccCccccsccCCoccCVVVo..", "...oVVVccCcccccscccCooccCVo...", "....oooccCcccccscbBCooccCo....", "....okkooccccccscBcCCookko....", ".....okooccccccsCCCCCooko.....", "......o.occccccsCCCCCo.o......", "........occccccsCCCCCo........", "........occccccsCCCCCo........"];
const RAT=["..............","....gggggg....","..gggggggggg..",".gggggggggeggn","tggggggggggggg",".gggggggggggg.","..dd.dd..dd.dd",".............."];
const GOLEM=["......rrrrrr......","....rrrrrrrrrr....","...rrrRRRRRRrrr...","...rrRyyRRyyRrr...","...rrRRRRRRRRrr...","....rrrrrrrrrr....",
"..rrrrrrrrrrrrrr..",".rrrrRRRRRRRRrrrr.","rrr.rRRRRRRRRr.rrr","rrr.rRRRmmRRRr.rrr","rrr.rRRRRRRRRr.rrr","RRR.rrrrrrrrrr.RRR",
"....rrrrrrrrrr....","....rrrr..rrrr....","....rrrr..rrrr....","...RRRRR..RRRRR..."];
const PAL={
  smith:{h:'#cfcfd4',s:'#e0b088',e:'#1a1020',c:'#6b3d22',b:'#3a2a20',p:'#3a3040',f:'#2a1e16'},
  girl:{h:'#e87aa0',s:'#f6d2b2',e:'#1a1020',c:'#4f9a6a',b:'#e8d8a0',p:'#3a5a48',f:'#5a3a2a'},
  kage:{h:'#24243a',s:'#e6bfa0',e:'#c94a3a',c:'#2a2240',b:'#c94a3a',p:'#1a1626',f:'#111018'},
  shade:{h:'#3a1a4a',s:'#c8a8c0',e:'#ff4af0',c:'#2a1030',b:'#9a3aff',p:'#1a0a20',f:'#0a0410'},
  rat:{g:'#8d8a96',d:'#5a5866',e:'#ff4060',n:'#f0a0b0',t:'#c09098'},
  lavarat:{g:'#7a3020',d:'#4a1810',e:'#ffd040',n:'#ff8a3a',t:'#ff6a2a'},
  golem:{r:'#6e6458',R:'#8f8474',y:'#ffd34a',m:'#5fe0a0'},
  lavaking:{r:'#4a2a26',R:'#7a3a2a',y:'#fff07a',m:'#ff7a1a'},
  mudslime:{o:'#1e140c',l:'#8a6a44',m:'#5e4630',h:'#c8a878',e:'#140c08'},
  rockling:{r:'#5e564c',R:'#857a6c',y:'#ffd34a',m:'#5fe0a0'},
  mslime:{o:'#2a2a34',l:'#c8ccd8',m:'#8a90a0',h:'#ffffff',e:'#1a1a24'},
  frostslime:{o:'#1a2a40',l:'#8ad0f0',m:'#5aa0d8',h:'#e8f8ff',e:'#0a1a30'},
  frostwolf:{o:'#1a1e2a',w:'#d8e4f0',d:'#8aa0b8',e:'#3ab8ff',n:'#2a2a3a'},
  icegolem:{r:'#5a7a98',R:'#9ac8e8',y:'#e8fbff',m:'#4ab8ff'},
  iceknight:{h:'#9ac8e8',s:'#e6d8d0',e:'#4ab8ff',c:'#5a7a9a',b:'#cfe8ff',p:'#2a3a52',f:'#1a2232'},
  angel:{o:'#1a1630',c:'#f1ead0',C:'#d8cfae',D:'#b8ac98',w:'#f4f0e0',W:'#b9b6c4',V:'#8a879c',i:'#7a9a8c',I:'#b8d0c0',p:'#0e0c20',h:'#ffffff',b:'#cfc6b0',B:'#8c806c',s:'#b8ac98',k:'#c08a70'}
};
const SLIME=["....oooooo....", "..oohhllllo...", ".ohhllllllloo.", ".ohlllllllllo.", "olllllllleello", "olllllllleelmo", "ollllllllllmmo", "ommmmmmmmmmmmo", ".oooooooooooo."];
const WOLF=["..............o.o.", ".............owow.", "............owwwwo", "o..........owwwewo", "wo.oooooooowwwwwnn", ".owwwwwwwwwwwwwwo.", ".owwwwwwwwwwwwdo..", ".odwwwwwwwwwwwdo..", "..odddddddddddo...", "..ow.ow....ow.ow..", "..ow.ow....ow.ow..", "..oo.oo....oo.oo.."];
const SPR={RAT,GOLEM,ANGEL,SLIME,WOLF};
function spr(ctx,map,pal,x,y,sc,flip,tint){
  const h=map.length,w=map[0].length,ox=Math.round(x-w*sc/2),oy=Math.round(y-h*sc);
  for(let r=0;r<h;r++){const row=map[r];for(let c=0;c<w;c++){const ch=row[c];if(ch==='.')continue;
    ctx.fillStyle=tint||pal[ch]||'#f0f';ctx.fillRect(ox+(flip?w-1-c:c)*sc,oy+r*sc,sc,sc);}}
}
function shadow(ctx,x,y,rx){const r=rx*1.25,gr=ctx.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(0,0,0,.5)');gr.addColorStop(.55,'rgba(0,0,0,.3)');gr.addColorStop(1,'rgba(0,0,0,0)');   // เงานุ่มแบบ HD-2D
  ctx.save();ctx.fillStyle=gr;ctx.translate(x,y);ctx.scale(1,.32);ctx.translate(-x,-y);ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();ctx.restore();}
const shadeMemo={};
function shade(c,k){const key=c+k;if(shadeMemo[key])return shadeMemo[key];if(!c||c[0]!=='#'||c.length!==7)return c;
  const n=parseInt(c.slice(1),16);let r=n>>16,gg=n>>8&255,b=n&255;r=clamp(r*k|0,0,255);gg=clamp(gg*k|0,0,255);b=clamp(b*k|0,0,255);
  return shadeMemo[key]='#'+((1<<24)+(r<<16)+(gg<<8)+b).toString(16).slice(1);}

/* CHARACTER RIG — pixel paper-doll so equipment changes the look */
function ik(a,t,l1,l2,leg){
  let dx=t[0]-a[0],dy=t[1]-a[1],d=Math.hypot(dx,dy)||.001;const mx=l1+l2-.01;if(d>mx){dx*=mx/d;dy*=mx/d;d=mx;}
  const base=Math.atan2(dy,dx),off=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));
  const c1=[a[0]+Math.cos(base+off)*l1,a[1]+Math.sin(base+off)*l1],c2=[a[0]+Math.cos(base-off)*l1,a[1]+Math.sin(base-off)*l1];
  return{j:leg?(c1[0]>c2[0]?c1:c2):(c1[1]>c2[1]?c1:c2),end:[a[0]+dx,a[1]+dy]};
}
function rigPoints(P){
  const hip=[0,P.hip],ln=P.lean,sh=[Math.sin(ln)*11,P.hip-Math.cos(ln)*11],hl=ln+(P.head||0);
  const hd=[sh[0]+Math.sin(hl)*5.5,sh[1]-Math.cos(hl)*5.5],fs=[sh[0]+.5,sh[1]+1],bs=[sh[0]-1.5,sh[1]+1];
  return{hip,sh,hd,fs,bs,fe:ik(fs,[fs[0]+P.fh[0],fs[1]+P.fh[1]],5.5,5.5,0),be:ik(bs,[bs[0]+P.bh[0],bs[1]+P.bh[1]],5.5,5.5,0),
    fhp:[1,P.hip],bhp:[-1,P.hip],fk:ik([1,P.hip],P.ff,7.5,7.5,1),bk:ik([-1,P.hip],P.bf,7.5,7.5,1)};
}
/* อาวุธแต่ละชนิดวาดเป็นพิกเซลตามรูปทรงจริง — u = ตามแนวอาวุธ, v = ตั้งฉาก (ฝั่งหน้า) */
function drawWeaponShape(Wp,h,a,o,O,C,seg,blk,tint,K){
  const ca=Math.cos(a),sa=Math.sin(a),pt=(u,v=0)=>[h[0]+ca*u-sa*v,h[1]+sa*u+ca*v],L=Wp.len||0,col=K.wcol||Wp.col,fx=Wp.fx||'#fff';
  const S=(u1,v1,u2,v2,w,c)=>seg(pt(u1,v1),pt(u2,v2),w+o,C(c)),B=(u,v,w,hh,c)=>{const q=pt(u,v);blk(q[0],q[1],w+o,hh+o,C(c));};
  const glow=!O&&!tint,t=G.t,shine=(u1,u2,v=-.5)=>{if(glow)seg(pt(u1,v),pt(u2,v),1,'rgba(255,255,255,.55)');};
  const grip=(n,c='#5a3a22')=>S(-n,0,0,0,2,c);
  switch(Wp.shape||'sword'){
    case'club':grip(2.5);S(0,0,L*.45,0,2,'#6a4426');S(L*.45,0,L,0,3,col);B(L,0,4,4,col);if(glow){B(L*.6,1,1,1,'#4a2e18');B(L*.85,-1,1,1,'#4a2e18');}break;
    case'spear':S(-6,0,L-3,0,1,'#7a5a3a');B(L-2.5,0,3,3,col);B(L-.5,0,2,2,col);B(L+1,0,1,1,col);B(L-4,1.5,1,3,'#c94a3a');shine(L-3,L);break;
    case'hammer':S(-2.5,0,L-1,0,2,'#6a4426');S(L,-3.5,L,3.5,4,'#f2c94c');if(glow){B(L+1.5,-2,1,1,'#fff6c0');B(L-1,1.5,1,1,'#c8962a');}break;
    case'pan':S(-2.5,0,L-5,0,2,'#2a2a30');B(L-1,0,8,7,'#2a2a30');if(glow){B(L-1,0,6,5,'#4a4a52');if(t%8<4){B(L-1,-4,2,2,'#ff9a3a');B(L+1,-4.5,1,2,'#ffd23a');}}break;
    case'katana':grip(4,'#2a2240');B(.5,0,3,3,'#c94a3a');for(let k=1;k<=L;k+=1)B(k,-.02*k*k,k<L-1?2:1,k<L-1?2:1,col);if(glow)for(let k=2;k<L-1;k+=2)B(k,-.02*k*k-.6,1,1,'rgba(255,255,255,.5)');break;
    case'greatsword':grip(Wp.twoHand?6:4);S(0,-4,0,4,2,'#d8b050');S(1,0,L-3,0,4,col);S(L-3,0,L-1,0,2,col);B(L,0,1,1,col);if(glow)S(2,0,L-4,0,1,K.wfx||(Wp.twoHand?'rgba(255,255,255,.6)':'#ffd06a'));break;
    case'warhammer':S(-6,0,L-2,0,2,'#5a3a22');S(L,-5,L,5,5,col);S(L+2.5,-1.5,L+2.5,1.5,2,col);B(L-2.5,0,2,3,'#3a3a44');
      if(glow){S(L-1.5,-4.5,L-1.5,4.5,1,K.wfx||'rgba(255,255,255,.5)');B(L+1,-5,1,1,'#ffffff');}break;
    case'magicsword':grip(3,'#3a2a5a');S(0,-3,0,3,1,'#d8b050');B(0,0,2,2,'#e0a0ff');S(1,0,L-2,0,2,col);S(L-2,0,L,0,1,col);shine(2,L-2);
      if(glow){const k=(t*.25)%L;B(k,-2,1,1,fx);B((k+L*.5)%L,2,1,1,fx);}break;
    case'flame':grip(2.5);S(0,-2.5,0,2.5,1,'#8a5a32');S(1,0,L-2,0,2,col);S(L-2,0,L,0,1,col);
      if(glow)for(let k=0;k<4;k++){const f=Math.sin(t*.4+k*1.7);B(3+k*3,-2-Math.abs(f)*1.5,1,2,k%2?'#ffd23a':'#ff6a1a');}break;
    case'dagger':grip(2,'#3a2a5a');S(0,-1.5,0,1.5,1,'#d8b050');S(1,0,L-2,0,1.5,col);B(L-1,0,1,1,col);if(glow&&t%20<10)B(L-2,-1.5,1,1,fx);break;
    case'staff':S(-7,0,L,0,1.5,'#4a3060');S(L-1,-2.5,L+2,-2.5,1,'#d8b050');S(L-1,2.5,L+2,2.5,1,'#d8b050');
      if(glow){const r=3+Math.sin(t*.15),q=pt(L+2.5);blk(q[0],q[1],r+4,r,'rgba(190,150,255,.3)');blk(q[0],q[1],r,r+4,'rgba(190,150,255,.3)');}B(L+2.5,0,4,4,col);if(glow)B(L+2,-1,1,1,'#ffffff');break;
    case'wand':S(-2.5,0,L-2,0,1.5,'#6a4426');B(L-1.5,0,2,3,'#d8b050');B(L,0,3,3,col);B(L+1.5,0,1,1,col);
      if(glow){B(L,-.5,1,1,'#ffffff');if(t%24<12)B(L+2,-2.5,1,1,fx);else B(L+1,2.5,1,1,fx);}break;
    case'scythe':S(-8,0,L,0,1.5,'#3a2a3a');S(L-8,0,L-8,2.5,1,'#6a4a5a');   // ด้าม + มือจับรอง
      for(let k=0;k<=12;k++){const tt=k/12,u=L-.5-4.5*tt*tt,v=1+11*tt,w=tt<.4?3:tt<.8?2:1;B(u,v,w,w,col);}
      if(glow)for(let k=1;k<=11;k+=2){const tt=k/12;B(L-1.5-4.5*tt*tt,1+11*tt,1,1,fx);}break;
    case'gaunt':B(.5,0,4,4,col);B(2,-1.5,1,1,'#d8f6ff');B(2,1.5,1,1,'#d8f6ff');if(glow&&t%10<5){B(3.5,-3,1,2,fx);B(4.5,2.5,1,2,fx);}break;
    default:grip(2.5);S(0,-2.5,0,2.5,1,'#8a8f9a');S(1,0,L-2,0,2,col);S(L-2,0,L,0,1,col);shine(2,L-2);
  }
}
function drawRigRaw(ctx,x,y,sc,dir,P,K,tint){
  const J=rigPoints(P);
  {const W2=K.weapon&&WEAPONS[K.weapon];if(W2&&W2.twoHand){const h=J.fe.end,a=P.wa||0;J.be=ik(J.bs,[h[0]-Math.cos(a)*3.5,h[1]-Math.sin(a)*3.5],5.5,5.5,0);}}   // อาวุธสองมือ: มือหลังจับด้าม
  const rd=RIG_HR?v=>Math.round(v*2)/2:Math.round;
  const R=(lx,ly,w,h,col)=>{const X=rd(lx),Y=rd(ly),px=dir>0?x+X*sc:x-(X+w)*sc,py=y+Y*sc;ctx.fillStyle=col;ctx.fillRect(px,py,w*sc,h*sc);
    if(RIG_HR){if(px<RB[0])RB[0]=px;if(py<RB[1])RB[1]=py;if(px+w*sc>RB[2])RB[2]=px+w*sc;if(py+h*sc>RB[3])RB[3]=py+h*sc;}};
  const B0=(cx,cy,w,h,col)=>R(cx-w/2,cy-h/2,w,h,col);let blk=B0;
  const seg=(a,b,w,col)=>{const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.max(1,Math.ceil(Math.hypot(dx,dy)*1.6));for(let i=0;i<=n;i++)blk(a[0]+dx*i/n,a[1]+dy*i/n,w,w,col);};
  const Hd0=rigPoints(P).hd,HK=RIG_HR?1.3:1,HL=RIG_HR?1.1:0,hp=(px,py)=>[Hd0[0]+(px-Hd0[0])*HK,Hd0[1]+(py-Hd0[1])*HK-HL];   // หัวใหญ่แบบจิบิ (โหมดภาพละเอียด)
  const HB=(cx,cy,w,h,col)=>{const q=hp(cx,cy);B0(q[0],q[1],w*HK,h*HK,col);},RH=(lx,ly,w,h,col)=>{const q=hp(lx,ly);R(q[0],q[1],w*HK,h*HK,col);};
  const wv=Math.sin(G.t*.16),Wp=K.weapon&&WEAPONS[K.weapon]&&(WEAPONS[K.weapon].len||WEAPONS[K.weapon].shape)?WEAPONS[K.weapon]:null,Hd=J.hd;
  for(let pass=0;pass<2;pass++){
    const O=pass===0,o=O?(RIG_HR?1:2):0,C=c=>O?'#0e0810':(tint||c),dk=c=>O?'#0e0810':(tint||shade(c,.72));
    if(K.cape)for(let k=0;k<4;k++){const a=Math.PI*.6+k*.11+wv*.07*(k+1)-P.lean*.6;seg([J.sh[0]-1.5,J.sh[1]+1],[J.sh[0]-1.5+Math.cos(a)*17,J.sh[1]+1+Math.sin(a)*17],3+o,C(k%2?K.cape.col2:K.cape.col));}
    if(K.scarf){seg([J.sh[0]-1,J.sh[1]],[J.sh[0]-10,J.sh[1]+2+wv*2.5],2+o,C(K.scarf));seg([J.sh[0]-1,J.sh[1]+1],[J.sh[0]-8,J.sh[1]+5+wv*2],2+o,C(K.scarf));}
    seg(J.bs,J.be.j,2+o,dk(K.sleeve||K.body));seg(J.be.j,J.be.end,2+o,dk(K.gloves||K.skin));blk(J.be.end[0],J.be.end[1],3+o,3+o,dk(K.gloves||K.skin));
    seg(J.bhp,J.bk.j,3+o,dk(K.pants));seg(J.bk.j,J.bk.end,3+o,dk(K.pants));blk(J.bk.end[0]+1,J.bk.end[1]-1,5+o,3+o,dk(K.boots));
    seg(J.hip,J.sh,(K.sex==='f'?6:7)+o,C(K.body));
    if(K.sex==='f'&&!K.plate){const t2=.68,cx=J.hip[0]+(J.sh[0]-J.hip[0])*t2,cy=J.hip[1]+(J.sh[1]-J.hip[1])*t2;blk(cx+2.6,cy+.4,2.4+o,2.6+o,C(K.body));   // ทรงอกเล็กน้อยให้แยกเพศได้
      const hx=J.hip[0]+(J.sh[0]-J.hip[0])*.08,hy=J.hip[1]+(J.sh[1]-J.hip[1])*.08;blk(hx,hy,7.4+o,2+o,C(K.body));}   // สะโพกกว้างกว่าเอวเล็กน้อย
    seg(J.fhp,J.fk.j,3+o,C(K.pants));seg(J.fk.j,J.fk.end,3+o,C(K.pants));blk(J.fk.end[0]+1,J.fk.end[1]-1,5+o,3+o,C(K.boots));
    if(K.robe)for(let k=0;k<9;k++){const ww=7+k*.55;blk(J.hip[0]+.3+k*.08,J.hip[1]+k,ww+o,1.2+o,C(k===8?(K.trim||K.robe):K.robe));}   // เสื้อคลุมยาวคลุมขา
    blk=HB;blk(Hd[0],Hd[1],8+o,8+o,C(K.skin));
    if(K.head==='helm'){if(K.plume){seg([Hd[0],Hd[1]-6],[Hd[0]-5,Hd[1]-7+wv],2+o,C(K.plume));seg([Hd[0]-5,Hd[1]-7+wv],[Hd[0]-8,Hd[1]-3+wv*1.5],2+o,C(K.plume));}
      blk(Hd[0],Hd[1]-2,10+o,6+o,C(K.hc));blk(Hd[0],Hd[1]-5.5,2+o,3+o,C(K.hc2));
      if(K.horns){seg([Hd[0]+3,Hd[1]-4],[Hd[0]+6,Hd[1]-9],2+o,C(K.horns));seg([Hd[0]-3,Hd[1]-4],[Hd[0]-6,Hd[1]-9],2+o,C(K.horns));}}
    else{const hc=C(K.hair),hs=K.hstyle||'short',hb=hs==='bald'||hs==='mohawk'?()=>{}:blk;hb(Hd[0]-.5,Hd[1]-3.5,9+o,3+o,hc);hb(Hd[0]-3.5,Hd[1]-.5,3+o,6+o,hc);hb(Hd[0]-4,Hd[1]-5.5,3+o,2+o,hc);
      hb(Hd[0]-1,Hd[1]-6.5,3+o,2+o,hc);hb(Hd[0]+2,Hd[1]-5.5,3+o,2+o,hc);hb(Hd[0]+4,Hd[1]-3,2+o,3+o,hc);
      if(hs==='long'){blk(Hd[0]-4,Hd[1]+4,3+o,10+o,hc);blk(Hd[0]+2.5,Hd[1]+3,2+o,5+o,hc);}
      if(hs==='ponytail'){seg([Hd[0]-4,Hd[1]-3],[Hd[0]-8.5,Hd[1]+1],2+o,hc);seg([Hd[0]-8.5,Hd[1]+1],[Hd[0]-8,Hd[1]+7+wv*1.5],2+o,hc);}
      if(hs==='bun'){blk(Hd[0]-1,Hd[1]-8.5,5+o,4+o,hc);}
      if(hs==='bob'){blk(Hd[0]-3.5,Hd[1]+2,3+o,5+o,hc);blk(Hd[0]+4,Hd[1]+.5,1.5+o,4+o,hc);blk(Hd[0]+2,Hd[1]-2.5,4+o,1.5+o,hc);}
      if(hs==='hime'){blk(Hd[0]-4,Hd[1]+4,3+o,11+o,hc);blk(Hd[0]+4,Hd[1]+2,1.5+o,7+o,hc);blk(Hd[0]+1.5,Hd[1]-2.5,6+o,1.5+o,hc);}
      if(hs==='braid'){for(let k=0;k<6;k++)blk(Hd[0]-4.5-k*.25+(k%2?.6:-.3),Hd[1]+2+k*1.7,2.5+o,2+o,hc);blk(Hd[0]-6,Hd[1]+12.5,2+o,1.5+o,C('#c94a3a'));}
      if(hs==='curly'){blk(Hd[0]-1,Hd[1]-5,11+o,4+o,hc);blk(Hd[0]-5,Hd[1]-1.5,3+o,5+o,hc);blk(Hd[0]-2,Hd[1]-7.5,7+o,2+o,hc);blk(Hd[0]+4.5,Hd[1]-3.5,2+o,3+o,hc);blk(Hd[0]-5.5,Hd[1]+3,2+o,2+o,hc);}
      if(hs==='sidebang'){blk(Hd[0]+3,Hd[1]-2,3+o,3.5+o,hc);blk(Hd[0]+4,Hd[1]+1.5,1.5+o,2+o,hc);blk(Hd[0]-3.5,Hd[1]+2,2+o,3+o,hc);}
      if(hs==='mohawk'){for(let k=0;k<5;k++)blk(Hd[0]-4+k*1.6,Hd[1]-5.5-(k===2?1.5:k===1||k===3?1:0),2+o,3+o,hc);}
      if(hs==='spiky'){blk(Hd[0]-3,Hd[1]-8,2+o,3+o,hc);blk(Hd[0]+1,Hd[1]-9,2+o,4+o,hc);blk(Hd[0]+4,Hd[1]-7,2+o,3+o,hc);}
      if(hs==='twin'){seg([Hd[0]-4,Hd[1]-1],[Hd[0]-6,Hd[1]+7],2+o,hc);seg([Hd[0]+3,Hd[1]-1],[Hd[0]+4.5,Hd[1]+6],2+o,hc);}
      if(K.head==='band'||K.head==='hood'){blk(Hd[0],Hd[1]-2.5,9+o,2+o,C(K.hc));seg([Hd[0]-4.5,Hd[1]-2.5],[Hd[0]-10,Hd[1]-1+wv*1.5],1+o,C(K.hc));seg([Hd[0]-4.5,Hd[1]-2],[Hd[0]-9,Hd[1]+1.5+wv],1+o,C(K.hc));}
      if(K.head==='horns'){seg([Hd[0]+1,Hd[1]-4],[Hd[0]+4,Hd[1]-9.5],2+o,C(K.hc));seg([Hd[0]-2,Hd[1]-4],[Hd[0]-5,Hd[1]-9.5],2+o,C(K.hc));}
      if(K.head==='cap'){blk(Hd[0]-.5,Hd[1]-4,10+o,4+o,C(K.hc));blk(Hd[0]+4,Hd[1]-2.5,4+o,1+o,C(K.hc2));blk(Hd[0]-1,Hd[1]-6.5,6+o,2+o,C(K.hc));}
      if(K.head==='wizard'){blk(Hd[0]+.5,Hd[1]-4,13+o,2+o,C(K.hc));blk(Hd[0]-.5,Hd[1]-6.5,7+o,3+o,C(K.hc));blk(Hd[0]-2,Hd[1]-9,5+o,3+o,C(K.hc));
        blk(Hd[0]-3.5,Hd[1]-11,3+o,2+o,C(K.hc));blk(Hd[0]-5.5+wv*.5,Hd[1]-12,2+o,2+o,C(K.hc));blk(Hd[0]-.5,Hd[1]-5.2,7+o,1+o,C(K.hc2));}
      if(K.head==='halo'){blk(Hd[0],Hd[1]-4.5,8+o,1+o,C(K.hc2));}
      if(K.head==='crown'){blk(Hd[0],Hd[1]-4.5,8+o,2+o,C(K.hc));blk(Hd[0]-3,Hd[1]-6,2+o,2+o,C(K.hc));blk(Hd[0],Hd[1]-6.5,2+o,2+o,C(K.hc));blk(Hd[0]+3,Hd[1]-6,2+o,2+o,C(K.hc));}}
    if(RIG_HR&&!O&&!(K.head==='helm')&&K.hstyle!=='bald')hairShine(K,Hd,HB,wv);blk=B0;   // ไฮไลต์เส้นผม
    seg(J.fs,J.fe.j,2+o,C(K.sleeve||K.body));seg(J.fe.j,J.fe.end,2+o,C(K.gloves||K.skin));
    if(Wp)drawWeaponShape(Wp,J.fe.end,P.wa,o,O,C,seg,blk,tint,K);
    blk(J.fe.end[0],J.fe.end[1],3+o,3+o,C(K.gloves||K.skin));
  }
  if(tint)return;
  const tor=t=>[J.hip[0]+(J.sh[0]-J.hip[0])*t,J.hip[1]+(J.sh[1]-J.hip[1])*t],bt=tor(.12),ch=tor(.62);
  blk(bt[0],bt[1],7,2,K.trim);
  if(K.sex==='f'&&!K.plate){const b2=tor(.68);blk(b2[0]+2,b2[1]-.5,3.5,2,shade(K.body,1.3));blk(b2[0]+2.3,b2[1]+1,3,1,shade(K.body,.62));blk(b2[0]+.5,tor(.3)[1],5,1,shade(K.body,.8));}   // เงาอก + เอวคอด
  else blk(ch[0]+1.5,ch[1],2,4,shade(K.body,1.25));
  if(K.pads)blk(J.sh[0]+.5,J.sh[1]+.5,K.plate?6:5,K.plate?4:3,K.trim);
  if(K.plate){const c2=tor(.45);blk(c2[0]+.5,c2[1],6,5,shade(K.body,1.35));blk(c2[0]+.5,c2[1]+1.5,4,1,shade(K.body,.8));blk(J.sh[0]+2.5,J.sh[1]+.5,1,1,'#ffffff');}
  if(K.scales)for(const t2 of[.3,.5,.7])for(const dx of[-1.5,1.5]){const q=tor(t2);blk(q[0]+dx+(t2===.5?1:0),q[1],2,1,K.scales);}
  if(K.belt){blk(bt[0],bt[1],7,2,K.belt);blk(bt[0]+1.5,bt[1],2,2,'#d8b050');}
  if(K.glowTrim&&G.t%30<20){blk(ch[0]+1.5,ch[1],2,4,'#ffb03a');blk(bt[0],bt[1],7,1,'#ff7a1a');}
  if(K.head==='halo'){const hy=Hd[1]-10+Math.sin(G.t*.1)*.6;HB(Hd[0],hy,10,1,K.hc);HB(Hd[0]-5,hy+.5,1,1,K.hc);HB(Hd[0]+5,hy+.5,1,1,K.hc);}
  if(K.neck){blk(J.sh[0]+.5,J.sh[1]+1,4,1,'#d8b050');blk(J.sh[0]+1.5,J.sh[1]+2.5,2,2,K.neck);if(G.t%40<6)blk(J.sh[0]+1,J.sh[1]+2,1,1,'#ffffff');}
  if(K.ring){blk(J.fe.end[0]+1,J.fe.end[1]-.5,1,1,K.ring);}
  if(K.head==='helm'){RH(Hd[0]+1,Hd[1]-1,4,2,K.hc2);RH(Hd[0]+3,Hd[1]-1,1,1,'#7fe0ff');}
  else if(RIG_HR){const ec=K.eyec&&K.eyec!=='#1a1020'?K.eyec:'#3a5a9a',sk=K.skin;   // ใบหน้าแบบอนิเมะ: ตาใหญ่ มีประกาย
    RH(Hd[0]+.5,Hd[1]-3,4,.5,shade(sk,.78));RH(Hd[0]+.5,Hd[1]-2,2.5,.5,'#1a1020');RH(Hd[0]+3.5,Hd[1]-2,1,.5,'#1a1020');
    RH(Hd[0]+1,Hd[1]-1.5,1.5,3,'#1a1020');RH(Hd[0]+1,Hd[1]-.5,1.5,1.5,ec);RH(Hd[0]+1,Hd[1]+.5,1.5,.5,shade(ec,1.5));RH(Hd[0]+1,Hd[1]-1.5,.5,.5,'#ffffff');
    RH(Hd[0]+3.5,Hd[1]-1.5,1,3,'#1a1020');RH(Hd[0]+3.5,Hd[1]-.5,1,1.5,ec);RH(Hd[0]+3.5,Hd[1]-1.5,.5,.5,'#ffffff');
    if(K.sex==='f')RH(Hd[0]+.5,Hd[1]-2.5,1,.5,'#1a1020');
    RH(Hd[0]+3,Hd[1]+2.5,1,.5,K.sex==='f'?'#c05a6a':'#9a5a52');RH(Hd[0]+.5,Hd[1]+1.5,1,.5,'rgba(255,120,120,.35)');
    if(K.head==='band')RH(Hd[0]+1,Hd[1]-3.5,3,2,K.hc2);if(K.head==='horns')RH(Hd[0]-1,Hd[1]-4.5,3,1,K.hc2);if(K.head==='crown')RH(Hd[0]-.5,Hd[1]-5,2,1,K.hc2);}
  else{if(K.sex==='f'){RH(Hd[0]+3,Hd[1]-2,1,1,'#1a1020');RH(Hd[0]+1,Hd[1]-2,1,1,'#1a1020');}   // ขนตา
    RH(Hd[0]+1,Hd[1]-1,2,2,K.eyec||'#1a1020');if(K.eyec&&K.eyec!=='#1a1020')RH(Hd[0]+1,Hd[1],1,1,'#1a1020');RH(Hd[0]+2,Hd[1]-1,1,1,K.eye||'#ffffff');RH(Hd[0]+2,Hd[1]+2,1,1,K.sex==='f'?'#d0607a':'#b0706a');
    if(K.head==='band')RH(Hd[0]+1,Hd[1]-3.5,3,2,K.hc2);if(K.head==='horns')RH(Hd[0]-1,Hd[1]-4.5,3,1,K.hc2);if(K.head==='crown')RH(Hd[0]-.5,Hd[1]-5,2,1,K.hc2);}
  if(K.mask)HB(Hd[0]+1.5,Hd[1]+2.5,5,3,'#1a1a24');
}
// ===== ตัวละครแบบจิบิละเอียด (สไตล์ HD-2D): วาดเป็นรูปทรงโค้ง → แปลงเป็นพิกเซล + เส้นขอบ + แรเงาอัตโนมัติ =====
// ใช้โครงกระดูก/ท่าทางเดิม (rigPoints, pose*) ทั้งหมด เปลี่ยนเฉพาะวิธีวาด · ปิดได้ด้วย RIG_HD.on=false (กลับเป็นแบบบล็อกเดิม)
let RIG_HR=false;const RB=[0,0,0,0],RIGC=document.createElement('canvas'),RX=RIGC.getContext('2d',{willReadFrequently:true});RIGC.width=270;RIGC.height=230;
const RIG_HD={on:(()=>{try{return localStorage.getItem('cf_righd')!=='0';}catch(e){return true;}})()};
function drawChibi(ctx,ox,oy,px,dir,P,K,tint){
  const J=rigPoints(P);
  {const W2=K.weapon&&WEAPONS[K.weapon];if(W2&&W2.twoHand){const h=J.fe.end,a=P.wa||0;J.be=ik(J.bs,[h[0]-Math.cos(a)*3.5,h[1]-Math.sin(a)*3.5],5.5,5.5,0);}}
  ctx.setTransform(px*dir,0,0,px,ox,oy);ctx.lineJoin='round';
  const C=c=>tint||c,Dk=(c,m)=>tint||shade(c,m),lw=1/px,wv=Math.sin(G.t*.16),F=K.sex==='f',T=!!tint;
  const fill=(col,edge)=>{ctx.fillStyle=col;ctx.fill();if(edge&&!T){ctx.strokeStyle=edge;ctx.lineWidth=lw;ctx.stroke();}};
  const ell=(cx,cy,rx,ry,col,edge,rot=0)=>{ctx.beginPath();ctx.ellipse(cx,cy,Math.max(.1,rx),Math.max(.1,ry),rot,0,7);fill(col,edge);};
  const poly=(pts,col,edge)=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);ctx.closePath();fill(col,edge);};
  const cap=(a,b,r1,r2,col,edge)=>{const dx=b[0]-a[0],dy=b[1]-a[1],an=Math.atan2(dy,dx),H=Math.PI/2;ctx.beginPath();ctx.arc(a[0],a[1],r1,an+H,an+3*H);ctx.arc(b[0],b[1],r2,an-H,an+H);ctx.closePath();fill(col,edge);};
  const ad=(p,dx,dy)=>[p[0]+dx,p[1]+dy];
  // ---- โครงลำตัว ----
  const sx=J.sh[0]-J.hip[0],sy=J.sh[1]-J.hip[1],sl=Math.hypot(sx,sy)||1,u=[sx/sl,sy/sl],v=[-u[1],u[0]];   // u ขึ้นตามสันหลัง · v ไปด้านหน้า
  const tp=(t,s)=>[J.hip[0]+u[0]*sl*t+v[0]*s,J.hip[1]+u[1]*sl*t+v[1]*s];
  const Hc=[J.hd[0]+.3,J.hd[1]-1.7],hp=(dx,dy)=>[Hc[0]+dx,Hc[1]+dy],hc=C(K.hair),hcd=Dk(K.hair,.62),hcl=Dk(K.hair,1.45),hs=K.helmOnly?'bald':(K.hstyle||'short'),helm=K.head==='helm';
  const skin=C(K.skin),skd=Dk(K.skin,.72);
  // ---- ผมยาว/หางม้า (อยู่หลังสุด) ----
  if(!helm){
    if(hs==='long'||hs==='hime')poly([hp(-5.4,-1),hp(-1,-2),hp(1.5,3),hp(.5,9+wv*.4),hp(-2.5,11.5+wv*.6),hp(-6,9.5+wv*.5),hp(-6.4,3)],hc,hcd);
    if(hs==='ponytail'){poly([hp(-4.2,-3.4),hp(-3,-1.2),hp(-6,4),hp(-7.2,10+wv),hp(-8.8,7+wv*.8),hp(-8.6,1)],hc,hcd);ell(hp(-4.6,-2.6)[0],hp(-4.6,-2.6)[1],1,1,C(K.trim||'#c94a3a'));}
    if(hs==='twin')for(const sd of[-1,1]){const r=hp(sd<0?-4.6:2.8,-1.5);poly([r,ad(r,1.6,.4),ad(r,sd*1.2+.6,8+wv),ad(r,sd*1.8-.6,9.5+wv*.8),ad(r,-1.2,4)],sd<0?hc:hcd,hcd);}
    if(hs==='braid'){for(let k=0;k<6;k++){const q=hp(-4.6-k*.35+(k%2?.4:-.2),1.6+k*1.6);ell(q[0],q[1],1.25,1,k%2?hcd:hc,hcd);}const q=hp(-6.6,11.4);ell(q[0],q[1],.8,.6,C('#c94a3a'));}}
  // ---- ผ้าคลุม ----
  if(K.cape){const S=ad(J.sh,-1.4,.6),w2=wv*1.3-P.lean*4;poly([ad(S,2.2,-.6),ad(S,-6.5+w2*.6,8),ad(S,-8.5+w2,15.5),ad(S,-4.5+w2*.8,17.5),ad(S,-.5+w2*.4,16),ad(S,1.6,6)],C(K.cape.col),Dk(K.cape.col,.6));
    poly([ad(S,-1,1),ad(S,-6+w2*.6,9),ad(S,-7.8+w2,15.4),ad(S,-6.6+w2,15.8),ad(S,-4.8+w2*.6,9.4)],C(K.cape.col2||shade(K.cape.col,1.2)));}
  if(K.scarf){const S=ad(J.sh,-.8,-.4);poly([S,ad(S,-6,1.2+wv*1.5),ad(S,-10,2.6+wv*2.5),ad(S,-9.4,4+wv*2.3),ad(S,-5.4,2.8+wv),ad(S,-.4,1.4)],Dk(K.scarf,.8),Dk(K.scarf,.55));}
  // ---- แขน/ขาหลัง ----
  const limbB=(a,j,e,r1,r2,r3,col)=>{cap(a,j,r1,r2,col,Dk(col,.6));cap(j,e,r2,r3,col,Dk(col,.6));};
  limbB(J.bs,J.be.j,J.be.end,1.25,1.05,.95,Dk(K.sleeve||K.body,.72));cap(J.be.j,J.be.end,1.05,.95,Dk(K.gloves||K.skin,.72));ell(J.be.end[0],J.be.end[1],1.3,1.3,Dk(K.gloves||K.skin,.7));
  const boot=(e,col)=>{poly([ad(e,-1.5,-3.4),ad(e,1.3,-3.4),ad(e,1.5,-1.7),ad(e,3.3,-1.1),ad(e,3.6,.4),ad(e,-1.7,.4)],col,Dk(col,.55));if(!T){ctx.fillStyle=shade(col,.5);ctx.fillRect(e[0]-1.7,e[1]-.15,5.3,.55);ctx.fillStyle=shade(col,1.35);ctx.fillRect(e[0]-1.2,e[1]-3.3,2.2,.45);}};
  const leg=(hipP,kn,ft,col,bc)=>{cap(hipP,kn,1.75,1.45,col,Dk(col,.6));cap(kn,ad(ft,0,-1.8),1.45,1.15,col,Dk(col,.6));boot(ft,bc);};
  leg(J.bhp,J.bk.j,J.bk.end,Dk(K.pants,.74),Dk(K.boots,.74));
  leg(J.fhp,J.fk.j,J.fk.end,C(K.pants),C(K.boots));
  // ---- ลำตัว ----
  const bw=F?[3.05,2.3,3.0,2.5]:[2.9,2.7,3.3,2.7],bc=C(K.body),bd=Dk(K.body,.6);
  poly([tp(-.05,bw[0]),tp(.38,bw[1]),tp(.72,F&&!K.plate?bw[2]+.6:bw[2]),tp(1.02,bw[3]),tp(1.08,0),tp(1.02,-bw[3]),tp(.72,-bw[2]),tp(.38,-bw[1]),tp(-.05,-bw[0])],bc,bd);
  if(!T){if(F&&!K.plate){const q=tp(.66,1.9);ell(q[0],q[1],1.5,.55,shade(K.body,.7),null,Math.atan2(v[1],v[0]));}
    const q=tp(.78,.9);ell(q[0],q[1],1.1,1.8,shade(K.body,1.22),null,Math.atan2(u[1],u[0]));}
  // ชายเสื้อ/เสื้อคลุม
  if(K.robe){const fy=Math.max(J.fk.end[1],J.bk.end[1])-1.2;poly([tp(.15,3.1),[J.hip[0]+5.6,fy],[J.hip[0]+2,fy+.6+wv*.3],[J.hip[0]-2,fy+.4],[J.hip[0]-5.4,fy-.2],tp(.15,-3.1)],C(K.robe),Dk(K.robe,.6));
    if(!T){ctx.fillStyle=K.trim||shade(K.robe,1.4);ctx.fillRect(J.hip[0]-5.2,fy-1,10.6,.7);ctx.fillStyle=shade(K.robe,.75);ctx.fillRect(J.hip[0]+.2,J.hip[1]+1,.5,fy-J.hip[1]-1.5);}}
  else poly([tp(.12,bw[0]+.1),tp(-.32,bw[0]+1.2),tp(-.4,1.2),tp(-.28,0),tp(-.4,-1.4),tp(-.32,-bw[0]-1),tp(.12,-bw[0]-.1)],Dk(K.body,.86),bd);
  // เข็มขัด เกราะอก
  if(!T){const bl=K.belt||K.trim;if(bl){poly([tp(.05,bw[0]+.15),tp(.19,bw[1]+.4),tp(.19,-bw[1]-.4),tp(.05,-bw[0]-.15)],bl,shade(bl,.55));const q=tp(.12,1.3);ctx.fillStyle='#e8c060';ctx.fillRect(q[0]-.5,q[1]-.55,1.1,1.1);}
    if(K.plate){poly([tp(.36,2.7),tp(.92,2.9),tp(.98,0),tp(.92,-1.2),tp(.36,-1)],shade(K.body,1.3),shade(K.body,.6));const a=tp(.85,1.6),b=tp(.5,2.2);ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=lw*1.2;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
    if(K.scales)for(const t2 of[.32,.5,.68])for(const s2 of[-1.4,.4,2.1]){const q=tp(t2,s2);ell(q[0],q[1],.8,.5,K.scales,shade(K.scales,.6));}
    if(K.glowTrim&&G.t%30<20){const q=tp(.78,.9);ell(q[0],q[1],.6,1.5,'#ffb03a');}
    const nk=tp(1.02,0);if(K.scarf)ell(nk[0]+.4,nk[1]+.2,2.6,1.3,K.scarf,shade(K.scarf,.6));else if(K.trim)poly([tp(.98,2.4),tp(1.1,1),tp(1.1,-1),tp(.98,-2.4),tp(.92,0)],K.trim,shade(K.trim,.6));
    if(K.neck){ctx.fillStyle='#d8b050';ctx.fillRect(nk[0]-.3,nk[1]+.6,2.8,.4);ell(nk[0]+1.6,nk[1]+1.9,.75,.85,K.neck,'#6a4a20');}}
  // ---- หัว ----
  cap(ad(J.sh,0,0),ad(Hc,0,3),1.05,1.05,skd);   // คอ
  const notBald=!helm&&hs!=='bald'&&hs!=='mohawk';
  if(notBald){ell(Hc[0]-1.2,Hc[1]-.9,5.3,5.1,hc,hcd);if(hs==='bob'||hs==='hime')poly([hp(-6.2,-1),hp(-1,0),hp(-.6,4.6),hp(-5.6,4.4)],hc,hcd);}
  ell(Hc[0],Hc[1],4.5,4.6,skin,skd);poly([hp(-2,2),hp(4.4,1),hp(3.4,4.2),hp(1.4,5.1),hp(-1.6,4.4)],skin);
  if(!T){ctx.strokeStyle=skd;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(...hp(4.4,1));ctx.lineTo(...hp(3.4,4.2));ctx.lineTo(...hp(1.4,5.1));ctx.stroke();}
  if(notBald)poly([hp(-5.6,-2.6),hp(-1.8,-4.8),hp(-.9,-1.4),hp(-1.1,1.8),hp(-2.4,3.8),hp(-4.8,3.6),hp(-6,.6)],hc,hcd);   // ผมด้านหลังศีรษะ (มุมสามส่วนสี่)
  if(!T&&!helm)ell(Hc[0]-1.25,Hc[1]+1.3,.62,.95,shade(K.skin,.9),skd);   // หู
  // ใบหน้า
  if(!T&&!helm){const ec=K.eyec&&K.eyec!=='#1a1020'?K.eyec:'#3a5a9a',E1=hp(1.9,.9),E2=hp(4.05,.9);
    ell(E1[0],E1[1],.78,1.2,'#1a1020');ell(E1[0]+.05,E1[1]+.3,.55,.78,ec);ell(E1[0]+.05,E1[1]+.65,.4,.35,shade(ec,1.6));ctx.fillStyle='#fff';ctx.fillRect(E1[0]-.45,E1[1]-.75,.5,.5);
    ell(E2[0],E2[1],.42,1.05,'#1a1020');ell(E2[0]+.05,E2[1]+.3,.28,.65,ec);ctx.fillStyle='#fff';ctx.fillRect(E2[0]-.25,E2[1]-.6,.35,.35);
    ctx.fillStyle='#1a1020';ctx.fillRect(E1[0]-1,E1[1]-1.45,2,.5);ctx.fillRect(E2[0]-.5,E2[1]-1.35,1,.45);if(F){ctx.fillRect(E1[0]-1.35,E1[1]-1.65,.6,.45);}
    ctx.fillStyle=F?'#c05a6a':'#9a5a52';ctx.fillRect(Hc[0]+3,Hc[1]+3.1,.9,.4);ctx.fillStyle='rgba(255,110,110,.35)';ctx.fillRect(Hc[0]+.9,Hc[1]+2.1,1.4,.5);
    if(K.mask)poly([hp(.6,2),hp(4.6,1.6),hp(3.6,4.4),hp(1.2,5.2),hp(-.6,3.8)],'#1a1a24','#000');}
  // ผมหน้า + ปลายผมแหลม
  if(!helm&&hs!=='bald'){
    if(hs==='mohawk'){for(let k=0;k<5;k++){const b=hp(-3.6+k*1.6,-4);poly([ad(b,-.9,.6),ad(b,-.2-k*.2,-2.6-(k===2?1.2:k%2?.8:0)),ad(b,.9,.6)],hc,hcd);}}
    else{const spk=hs==='spiky'?[[-150,4.6],[-125,4.8],[-100,4.4],[-75,3.8],[-170,3.6],[-200,3]]:hs==='curly'?[]:hs==='short'||hs==='sidebang'?[[-140,2.6],[-110,2.4],[-165,2.2]]:[[-150,1.6],[-115,1.4]];
      const cr=hp(-1.2,-1.6);for(const[a,l]of spk){const r=a*Math.PI/180,b=[cr[0]+Math.cos(r)*3.6,cr[1]+Math.sin(r)*3.6],tip=[cr[0]+Math.cos(r)*(3.6+l),cr[1]+Math.sin(r)*(3.6+l)+(a<-160?wv*.3:0)],n=[-Math.sin(r)*1.5,Math.cos(r)*1.5];
        poly([ad(b,n[0],n[1]),tip,ad(b,-n[0],-n[1])],hc,hcd);}
      if(hs==='curly')for(let k=0;k<9;k++){const a=Math.PI*(1.0+k/8*1.05),q=[Hc[0]-1+Math.cos(a)*5,Hc[1]-1+Math.sin(a)*4.8];ell(q[0],q[1],1.5,1.4,k%2?hc:hcd,hcd);}
      if(hs==='bun'){const q=hp(-2.2,-6);ell(q[0],q[1],2.2,1.9,hc,hcd);}
      // หน้าม้า: ปอยแหลมห้อยลงมาถึงระดับตา
      const fr=hs==='hime'?[[-4.6,-1.4],[-1,-1.4],[1.4,-1.5],[3.6,-1.4],[4.8,-1.6]]:[[-4.6,-.6],[-2,-2.4],[0,-1.2],[1.3,-2.6],[2.9,-.9],[3.9,-2.5],[4.9,-1.2]];
      const bang=[hp(-4.8,-3.4),hp(-2,-5.4),hp(2.5,-5.4),hp(5,-3.4)];for(const[fx,fy]of fr)bang.push(hp(fx,fy));
      poly([bang[0],bang[1],bang[2],bang[3],...bang.slice(4).reverse()],hc,hcd);
      poly([hp(-.4,-2.2),hp(.6,-2),hp(-.2,1.6),hp(-.8,.6)],hc,hcd);   // ปอยข้างหู
      if(hs==='sidebang')poly([hp(1.2,-3.4),hp(4.6,-3.2),hp(3.6,1.6),hp(2.4,.4)],hc,hcd);
      if(!T){ctx.strokeStyle=hcl;ctx.lineWidth=lw*1.3;ctx.beginPath();ctx.moveTo(...hp(-3.4,-4.2));ctx.quadraticCurveTo(...hp(-1,-5.2),...hp(1.4,-4.6));ctx.stroke();
        ctx.beginPath();ctx.moveTo(...hp(-4.8,-2));ctx.lineTo(...hp(-5.4,.4));ctx.stroke();ctx.beginPath();ctx.moveTo(...hp(2.2,-4.4));ctx.lineTo(...hp(3.3,-3.2));ctx.stroke();}}}
  // หมวก/เครื่องประดับศีรษะ
  if(K.head&&K.head!=='none'){const hc1=C(K.hc||'#8a8f9a'),hc2=C(K.hc2||K.hc||'#d8b050');
    if(helm){ell(Hc[0]-.2,Hc[1]-.6,5.2,5.1,hc1,Dk(K.hc||'#8a8f9a',.55));poly([hp(.4,-.6),hp(5.3,-.9),hp(5.3,1.6),hp(.6,1.8)],Dk(K.hc||'#8a8f9a',.7),'#1a1020');
      if(!T){ctx.fillStyle='#7fe0ff';ctx.fillRect(Hc[0]+2.2,Hc[1]+.1,2.4,.6);ctx.fillStyle=shade(K.hc||'#8a8f9a',1.5);ctx.fillRect(Hc[0]-2.6,Hc[1]-4.4,3.2,.6);}
      poly([hp(-1,-5.4),hp(.4,-7.2),hp(1.4,-5.2)],hc2);
      if(K.plume){poly([hp(0,-6),hp(-5,-8+wv),hp(-9,-4+wv*1.5),hp(-6.5,-5.5+wv),hp(-1,-4.6)],C(K.plume),Dk(K.plume,.6));}
      if(K.horns)for(const sd of[-1,1])poly([hp(sd*2.6,-3.6),hp(sd*5.6,-8.4),hp(sd*4.2,-3.2)],C(K.horns),Dk(K.horns,.6));}
    else if(K.head==='band'||K.head==='hood'){poly([hp(-4.8,-3.2),hp(4.7,-3.2),hp(4.7,-2.1),hp(-4.8,-2)],hc1,Dk(K.hc,.6));poly([hp(-4.6,-3),hp(-10,-1.6+wv*1.5),hp(-9.4,-.6+wv*1.4),hp(-4.6,-2)],hc1);poly([hp(-4.6,-2.6),hp(-8.6,1+wv),hp(-8,1.8+wv),hp(-4.4,-1.8)],Dk(K.hc,.8));
      if(!T){ctx.fillStyle=hc2;ctx.fillRect(Hc[0]+1.4,Hc[1]-3.1,1.6,.9);}}
    else if(K.head==='horns'){for(const sd of[-1,1])poly([hp(sd*1.6-.6,-4.2),hp(sd*3.6-.6,-10),hp(sd*2.6+.6,-3.8)],sd>0?hc1:Dk(K.hc,.75),Dk(K.hc,.55));}
    else if(K.head==='cap'){poly([hp(-5,-1.6),hp(-4.4,-5),hp(0,-6.6),hp(4.2,-4.8),hp(4.6,-2.4)],hc1,Dk(K.hc,.6));poly([hp(3,-2.6),hp(7.4,-2),hp(7.2,-1.2),hp(3.2,-1.6)],hc2,Dk(K.hc2||K.hc,.6));}
    else if(K.head==='wizard'){poly([hp(-7,-2.2),hp(7,-2.8),hp(6,-1.6),hp(-6.4,-1.2)],hc1,Dk(K.hc,.6));poly([hp(-4,-2.4),hp(4,-2.6),hp(0,-8),hp(-4.2+wv*.4,-12),hp(-6.4+wv*.6,-11.4),hp(-3,-8)],hc1,Dk(K.hc,.6));if(!T){ctx.fillStyle=hc2;ctx.fillRect(Hc[0]-3.8,Hc[1]-3.6,7.6,.8);}}
    else if(K.head==='halo'){ctx.strokeStyle=hc1;ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(Hc[0],Hc[1]-7.4+Math.sin(G.t*.1)*.5,4,1.1,0,0,7);ctx.stroke();}
    else if(K.head==='crown'){poly([hp(-3.6,-4.4),hp(-3.8,-7.4),hp(-2,-5.8),hp(0,-8),hp(2,-5.8),hp(3.6,-7.4),hp(3.4,-4.4)],hc1,Dk(K.hc,.55));if(!T){ctx.fillStyle=hc2;ctx.fillRect(Hc[0]-.5,Hc[1]-5.6,1,1);}}}
  // ---- แขนหน้า + อาวุธ ----
  const sl2=C(K.sleeve||K.body),gl=C(K.gloves||K.skin);
  cap(J.fs,J.fe.j,1.3,1.1,sl2,Dk(K.sleeve||K.body,.6));cap(J.fe.j,J.fe.end,1.1,1,K.gloves?gl:sl2,Dk(K.gloves||K.sleeve||K.body,.6));
  if(!K.gloves&&!T){const m=[(J.fe.j[0]*.35+J.fe.end[0]*.65),(J.fe.j[1]*.35+J.fe.end[1]*.65)];cap(m,J.fe.end,1,.95,skin,skd);}
  const Wp=K.weapon&&WEAPONS[K.weapon]&&(WEAPONS[K.weapon].len||WEAPONS[K.weapon].shape)?WEAPONS[K.weapon]:null;
  if(Wp){const blkU=(cx,cy,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(cx-w/2,cy-h/2,w,h);},segU=(a,b,w,col)=>{const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.max(1,Math.ceil(Math.hypot(dx,dy)*2.4));for(let k=0;k<=n;k++)blkU(a[0]+dx*k/n,a[1]+dy*k/n,w,w,col);};
    drawWeaponShape(Wp,J.fe.end,P.wa,0,false,C,segU,blkU,tint,K);}
  ell(J.fe.end[0],J.fe.end[1],1.35,1.3,gl,Dk(K.gloves||K.skin,.6));
  if(K.pads&&!T){const q=ad(J.sh,.4,.7);ell(q[0],q[1],K.plate?2.9:2.4,K.plate?2.1:1.7,K.trim||'#8a8f9a',shade(K.trim||'#8a8f9a',.5));ell(q[0]+.3,q[1]-.7,1.3,.5,shade(K.trim||'#8a8f9a',1.5));}
  if(K.ring&&!T){ctx.fillStyle=K.ring;ctx.fillRect(J.fe.end[0]+.6,J.fe.end[1]-.4,.6,.6);}
  ctx.setTransform(1,0,0,1,0,0);
}
// ===== มุมหน้า/มุมหลัง (เดินลง = หันหน้าเข้ากล้อง · เดินขึ้น = เห็นแผ่นหลัง) สไตล์เดียวกับมุมข้าง =====
function drawChibiFB(ctx,ox,oy,px,view,ph,moving,K,tint,tt){
  ctx.setTransform(px,0,0,px,ox,oy);ctx.lineJoin='round';
  const C=c=>tint||c,Dk=(c,m)=>tint||shade(c,m),lw=1/px,T=!!tint,F=K.sex==='f',back=view==='up',wv=Math.round(Math.sin(tt*.16)*4)/4;
  const fill=(col,edge)=>{ctx.fillStyle=col;ctx.fill();if(edge&&!T){ctx.strokeStyle=edge;ctx.lineWidth=lw;ctx.stroke();}};
  const ell=(cx,cy,rx,ry,col,edge,rot=0)=>{ctx.beginPath();ctx.ellipse(cx,cy,Math.max(.1,rx),Math.max(.1,ry),rot,0,7);fill(col,edge);};
  const poly=(pts,col,edge)=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);ctx.closePath();fill(col,edge);};
  const cap=(a,b,r1,r2,col,edge)=>{const dx=b[0]-a[0],dy=b[1]-a[1],an=Math.atan2(dy,dx),H=Math.PI/2;ctx.beginPath();ctx.arc(a[0],a[1],r1,an+H,an+3*H);ctx.arc(b[0],b[1],r2,an-H,an+H);ctx.closePath();fill(col,edge);};
  const sw=moving?Math.round(Math.sin(ph)*4)/4:0,bob=moving?-Math.abs(sw)*.6:Math.round(Math.sin(tt*.09)*2)/2*.3;
  const lL=-Math.max(0,sw)*1.6,lR=-Math.max(0,-sw)*1.6,hipY=-11.6+bob,shY=-20.8+bob,Hc=[0,-26.6+bob];
  const hs=K.hstyle||'short',helm=K.head==='helm',hc=C(K.hair),hcd=Dk(K.hair,.62),hcl=Dk(K.hair,1.45),skin=C(K.skin),skd=Dk(K.skin,.72);
  const hp=(dx,dy)=>[Hc[0]+dx,Hc[1]+dy],M=pts=>pts.map(q=>[-q[0],q[1]]),both=(pts,col,edge)=>{poly(pts,col,edge);poly(M(pts),col,edge);};
  const Wp=K.weapon&&WEAPONS[K.weapon]&&(WEAPONS[K.weapon].len||WEAPONS[K.weapon].shape)?WEAPONS[K.weapon]:null,bigW=Wp&&(Wp.len||0)>12;
  const blkU=(cx,cy,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(cx-w/2,cy-h/2,w,h);},segU=(a,b,w,col)=>{const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.max(1,Math.ceil(Math.hypot(dx,dy)*2.4));for(let k=0;k<=n;k++)blkU(a[0]+dx*k/n,a[1]+dy*k/n,w,w,col);};
  const onBack=()=>drawWeaponShape(Wp,back?[3.4,shY-1.6]:[-3.4,shY-1.6],back?Math.PI/2+.62:Math.PI/2-.62,0,false,C,segU,blkU,tint,K);
  const hair=K.head==='helm'?'none':hs;
  // ---- ชั้นหลังสุด: ผมยาว/หางม้า/ผ้าคลุม/อาวุธบนหลัง (มุมหน้า) ----
  if(!back){if(Wp&&bigW)onBack();
    if(K.cape){both([[2.6,shY+.4],[4.8+wv*.3,shY+8],[5.2+wv*.4,shY+15.5],[3,shY+15]],C(K.cape.col),Dk(K.cape.col,.6));}
    if(hair==='long'||hair==='hime')poly([hp(-5.6,-1),hp(5.6,-1),hp(6,9.5),hp(-6,9.5)],hcd,hcd);
    if(hair==='ponytail')poly([hp(3.6,-4),hp(6.4,-3),hp(7,5+wv*.4),hp(5.4,6+wv*.4),hp(4.6,0)],hcd,hcd);
    if(hair==='twin')both([hp(4.2,-2.4),hp(7.4,1),hp(7.6,8+wv*.5),hp(5.8,8.6+wv*.5),hp(4.8,2)],hc,hcd);
  }
  // ---- ขา + รองเท้า ----
  const leg=(sx,lift,col,bc)=>{const top=[sx*1.45,hipY+.6],ft=[sx*1.6,-1.3+lift];cap(top,ft,1.75,1.3,col,Dk(col,.6));
    poly([[ft[0]-1.6,ft[1]-1.6],[ft[0]+1.6,ft[1]-1.6],[ft[0]+1.8,ft[1]+1.3],[ft[0]-1.8,ft[1]+1.3]],bc,Dk(bc,.55));
    if(!T){ctx.fillStyle=shade(bc,.5);ctx.fillRect(ft[0]-1.8,ft[1]+.9,3.6,.5);ctx.fillStyle=shade(bc,1.35);ctx.fillRect(ft[0]-1,ft[1]-1.5,1.4,.45);}};
  leg(-1,lL,C(K.pants),C(K.boots));leg(1,lR,Dk(K.pants,.9),Dk(K.boots,.9));
  // ---- แขน (หลังลำตัวเล็กน้อย) ----
  const arm=(sx,swing,sleeve,hand)=>{const a=[sx*3.3,shY+1],e=[sx*4.1,shY+4.6+swing*.4],h=[sx*4.3,shY+7.6+swing];cap(a,e,1.3,1.1,sleeve,Dk(K.sleeve||K.body,.6));cap(e,h,1.1,1,K.gloves?hand:sleeve,Dk(K.gloves||K.sleeve||K.body,.6));ell(h[0],h[1],1.3,1.25,hand,Dk(K.gloves||K.skin,.6));return h;};
  // ---- ลำตัว ----
  const bc=C(K.body),bd=Dk(K.body,.6),wst=F?2.3:2.7,chs=F?3.1:3.4;
  const torso=()=>{poly([[-2.9,hipY+.2],[-wst,hipY-3.6],[-chs,shY+2.2],[-2.9,shY],[0,shY-.6],[2.9,shY],[chs,shY+2.2],[wst,hipY-3.6],[2.9,hipY+.2]],bc,bd);
    if(K.robe)poly([[-3.1,hipY-1],[3.1,hipY-1],[5,-1.2],[-5,-1.2]],C(K.robe),Dk(K.robe,.6));
    else poly([[-3,hipY-.6],[3,hipY-.6],[3.8,hipY+2.6],[1,hipY+2.2],[0,hipY+2.8],[-1,hipY+2.2],[-3.8,hipY+2.6]],Dk(K.body,.86),bd);
    if(T)return;
    if(K.robe){ctx.fillStyle=K.trim||shade(K.robe,1.4);ctx.fillRect(-4.9,-2.2,9.8,.7);ctx.fillStyle=shade(K.robe,.78);ctx.fillRect(-.25,hipY,.5,hipY*-1-2.5);}
    const bl=K.belt||K.trim;if(bl){ctx.fillStyle=bl;ctx.fillRect(-2.95,hipY-1.4,5.9,1.2);if(!back){ctx.fillStyle='#e8c060';ctx.fillRect(-.55,hipY-1.5,1.1,1.4);}}
    if(back){ctx.fillStyle=shade(K.body,.8);ctx.fillRect(-.25,shY+1,.5,hipY-shY-3);}
    else{if(F&&!K.plate){ell(-1.4,shY+3.6,1.3,.5,shade(K.body,.72));ell(1.4,shY+3.6,1.3,.5,shade(K.body,.72));}
      if(K.plate){poly([[-2.6,shY+1.4],[2.6,shY+1.4],[2.2,hipY-3],[0,hipY-2.2],[-2.2,hipY-3]],shade(K.body,1.3),shade(K.body,.6));ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(-1.6,shY+2.2,.5,3);}
      if(K.scales)for(const yy of[shY+3,shY+5,shY+7])for(const xx of[-1.4,0,1.4])ell(xx,yy,.75,.45,K.scales,shade(K.scales,.6));
      if(K.glowTrim&&G.t%30<20)ell(0,shY+4,.6,1.4,'#ffb03a');
      if(K.scarf)ell(0,shY+.5,2.9,1.3,K.scarf,shade(K.scarf,.6));else if(K.trim)poly([[-2.6,shY+.2],[0,shY+2.2],[2.6,shY+.2],[0,shY-.6]],K.trim,shade(K.trim,.6));
      if(K.neck){ctx.fillStyle='#d8b050';ctx.fillRect(-1.4,shY+1.2,2.8,.4);ell(0,shY+2.6,.75,.85,K.neck,'#6a4a20');}}};
  const sl=C(K.sleeve||K.body),hd=C(K.gloves||K.skin);
  if(back){torso();arm(-1,-sw*1.2,sl,hd);arm(1,sw*1.2,sl,hd);
    if(K.cape)poly([[-3.2,shY+.2],[3.2,shY+.2],[4.6+wv*.4,shY+15.5],[0,shY+16.4+wv*.3],[-4.6+wv*.4,shY+15.5]],C(K.cape.col),Dk(K.cape.col,.6));
    if(K.scarf){ell(0,shY+.4,2.8,1.2,C(K.scarf),Dk(K.scarf,.6));poly([[-.4,shY+1],[.8,shY+1],[1.6+wv,shY+6],[.2+wv,shY+6.4]],Dk(K.scarf,.8),Dk(K.scarf,.55));}
    if(Wp&&bigW)onBack();}
  else{arm(-1,sw*1.2,sl,hd);const hR=arm(1,-sw*1.2,Dk(K.sleeve||K.body,.92),Dk(K.gloves||K.skin,.92));torso();
    if(Wp&&!bigW){const up=['staff','wand','spear','scythe'].includes(Wp.shape);drawWeaponShape(Wp,[-4.3,shY+7.6+sw*1.2],up?-Math.PI/2-.18:Math.PI/2+.32,0,false,C,segU,blkU,tint,K);}   // ไม้เท้า/หอก ถือตั้งขึ้น · ดาบสั้นถือลง
    {const h=[-4.3,shY+7.6+sw*1.2];ell(h[0],h[1],1.3,1.25,hd,Dk(K.gloves||K.skin,.6));}}
  if(K.pads&&!T){const pc=K.trim||'#8a8f9a';for(const sx of[-1,1]){ell(sx*3.5,shY+.9,K.plate?2.3:1.9,K.plate?1.7:1.4,pc,shade(pc,.5));ell(sx*3.5-.3,shY+.3,1,.4,shade(pc,1.5));}}
  // ---- หัว ----
  cap([0,shY+.4],[0,Hc[1]+3.2],1.05,1.05,skd);
  const notBald=hair!=='none'&&hair!=='bald'&&hair!=='mohawk';
  if(notBald)ell(Hc[0],Hc[1]-.9,5.4,5.1,hc,hcd);
  if(back){
    if(notBald){ell(Hc[0],Hc[1]-.4,5.2,5.2,hc,hcd);poly([hp(-5,0),hp(5,0),hp(4.2,4.2),hp(2,3.6),hp(0,4.6),hp(-2,3.6),hp(-4.2,4.2)],hc,hcd);}
    else if(hair!=='none'){ell(Hc[0],Hc[1],4.5,4.6,skin,skd);}
    if(!T&&notBald){ctx.strokeStyle=hcl;ctx.lineWidth=lw*1.3;for(const sx of[-2.6,0,2.4]){ctx.beginPath();ctx.moveTo(...hp(sx*.6,-5));ctx.quadraticCurveTo(...hp(sx,-2),...hp(sx*1.1,1.5));ctx.stroke();}}
    if(hair==='long'||hair==='hime')poly([hp(-5.4,1),hp(5.4,1),hp(5.8,10),hp(0,11),hp(-5.8,10)],hc,hcd);
    if(hair==='ponytail'){ell(...hp(0,-2),1,1,C(K.trim||'#c94a3a'));poly([hp(-1.2,-1.4),hp(1.2,-1.4),hp(1.6+wv*.4,8),hp(-.4+wv*.4,9)],hc,hcd);}
    if(hair==='twin')both([hp(3.8,-2),hp(6.8,1),hp(7,8.6+wv*.5),hp(5.2,9+wv*.5),hp(4.6,2)],hc,hcd);
    if(hair==='braid'){for(let k=0;k<6;k++){const q=hp((k%2?.4:-.4),3+k*1.6);ell(q[0],q[1],1.25,1,k%2?hcd:hc,hcd);}}
    if(hair==='bun')ell(...hp(0,-5.6),2.2,1.9,hc,hcd);
    if(hair==='mohawk')for(let k=0;k<5;k++)ell(...hp(0,-5.4+k*1.8),1.1,1.2,hc,hcd);
    if(hair==='curly')for(let k=0;k<9;k++){const a=Math.PI*(.9+k/8*1.2),q=[Hc[0]+Math.cos(a)*5,Hc[1]-.6+Math.sin(a)*4.8];ell(q[0],q[1],1.5,1.4,k%2?hc:hcd,hcd);}
    if(hair==='spiky'||hair==='short'||hair==='sidebang'){const L=hair==='spiky'?[[-110,4.2],[-80,4.6],[-55,3.8],[-130,3.6],[-160,2.6],[-20,2.6]]:[[-115,2.4],[-70,2.4],[-150,2],[-35,2]];
      for(const[a,l]of L){const r=a*Math.PI/180,b=[Hc[0]+Math.cos(r)*4.2,Hc[1]-.8+Math.sin(r)*4.2],tip=[Hc[0]+Math.cos(r)*(4.2+l),Hc[1]-.8+Math.sin(r)*(4.2+l)],n=[-Math.sin(r)*1.5,Math.cos(r)*1.5];poly([[b[0]+n[0],b[1]+n[1]],tip,[b[0]-n[0],b[1]-n[1]]],hc,hcd);}}
  }else{
    ell(Hc[0],Hc[1],4.5,4.6,skin,skd);poly([hp(-3.6,1.4),hp(3.6,1.4),hp(2.4,4.4),hp(0,5.2),hp(-2.4,4.4)],skin);
    if(!T){ctx.strokeStyle=skd;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(...hp(-3.6,1.6));ctx.lineTo(...hp(-2.4,4.4));ctx.lineTo(...hp(0,5.2));ctx.lineTo(...hp(2.4,4.4));ctx.lineTo(...hp(3.6,1.6));ctx.stroke();
      for(const sx of[-1,1])ell(...hp(sx*4.5,1),.6,1,shade(K.skin,.9),skd);}
    if(!T&&!helm){const ec=K.eyec&&K.eyec!=='#1a1020'?K.eyec:'#3a5a9a';
      for(const sx of[-1,1]){const E=hp(sx*1.8,.9);ell(E[0],E[1],.72,1.15,'#1a1020');ell(E[0],E[1]+.3,.52,.75,ec);ell(E[0],E[1]+.62,.38,.32,shade(ec,1.6));ctx.fillStyle='#fff';ctx.fillRect(E[0]-.45,E[1]-.7,.45,.45);
        ctx.fillStyle='#1a1020';ctx.fillRect(E[0]-.9,E[1]-1.42,1.8,.5);if(F)ctx.fillRect(E[0]+sx*.7,E[1]-1.65,.55,.45);}
      ctx.fillStyle=F?'#c05a6a':'#9a5a52';ctx.fillRect(Hc[0]-.45,Hc[1]+3.1,.9,.4);ctx.fillStyle='rgba(255,110,110,.32)';ctx.fillRect(Hc[0]-3.4,Hc[1]+2.1,1.3,.5);ctx.fillRect(Hc[0]+2.1,Hc[1]+2.1,1.3,.5);
      if(K.mask)poly([hp(-3.4,1.8),hp(3.4,1.8),hp(2.4,4.6),hp(0,5.4),hp(-2.4,4.6)],'#1a1a24','#000');}
    if(hair!=='none'&&hair!=='bald'){
      if(hair==='mohawk'){for(let k=0;k<4;k++){const b=hp(0,-4.4);poly([[b[0]-1,b[1]+.4],[b[0]+(k-1.5)*.6,b[1]-2.4-k%2],[b[0]+1,b[1]+.4]],hc,hcd);}}
      else{const spk=hair==='spiky'?[[-140,4.4],[-112,4.8],[-90,4.4],[-68,4.8],[-40,4.4],[-165,3.2],[-15,3.2]]:hair==='curly'?[]:hair==='short'||hair==='sidebang'?[[-130,2.4],[-90,2.2],[-50,2.4]]:[[-120,1.4],[-60,1.4]];
        for(const[a,l]of spk){const r=a*Math.PI/180,b=[Hc[0]+Math.cos(r)*4.2,Hc[1]-1.4+Math.sin(r)*4.2],tip=[Hc[0]+Math.cos(r)*(4.2+l),Hc[1]-1.4+Math.sin(r)*(4.2+l)],n=[-Math.sin(r)*1.5,Math.cos(r)*1.5];poly([[b[0]+n[0],b[1]+n[1]],tip,[b[0]-n[0],b[1]-n[1]]],hc,hcd);}
        if(hair==='curly')for(let k=0;k<9;k++){const a=Math.PI*(1.0+k/8),q=[Hc[0]+Math.cos(a)*5,Hc[1]-1+Math.sin(a)*4.8];ell(q[0],q[1],1.5,1.4,k%2?hc:hcd,hcd);}
        if(hair==='bun')ell(...hp(0,-6.2),2.2,1.9,hc,hcd);
        const fr=hair==='hime'?[[-4.8,-1.2],[-2.4,-1.4],[0,-1.3],[2.4,-1.4],[4.8,-1.2]]:[[-4.9,-.4],[-3.4,-2.6],[-2,-1],[-.8,-2.8],[.4,-1.2],[1.8,-2.6],[3,-1],[4.2,-2.6],[4.9,-.4]];
        poly([hp(-5,-3.6),hp(-2.2,-5.6),hp(2.2,-5.6),hp(5,-3.6),...fr.slice().reverse().map(([a,b])=>hp(a,b))],hc,hcd);
        const side=hair==='bob'||hair==='hime'||hair==='long'?4.6:hair==='twin'||hair==='braid'||hair==='ponytail'?2.4:1.8;
        both([hp(-5.2,-2.6),hp(-3.8,-2.4),hp(-4,side),hp(-5,side-.8)],hc,hcd);
        if(hair==='sidebang')poly([hp(-1,-3.6),hp(3,-3.4),hp(1.4,2),hp(.4,.6)],hc,hcd);
        if(!T){ctx.strokeStyle=hcl;ctx.lineWidth=lw*1.3;ctx.beginPath();ctx.moveTo(...hp(-3.4,-4.4));ctx.quadraticCurveTo(...hp(0,-5.6),...hp(2.6,-4.6));ctx.stroke();
          ctx.beginPath();ctx.moveTo(...hp(-1.6,-4.8));ctx.lineTo(...hp(-2.2,-3.2));ctx.stroke();ctx.beginPath();ctx.moveTo(...hp(1.8,-4.9));ctx.lineTo(...hp(2.4,-3.4));ctx.stroke();}}}
  }
  // ---- หมวก/เครื่องประดับศีรษะ ----
  if(K.head&&K.head!=='none'){const h1=C(K.hc||'#8a8f9a'),h2=C(K.hc2||K.hc||'#d8b050'),hd1=Dk(K.hc||'#8a8f9a',.55);
    if(helm){ell(Hc[0],Hc[1]-.6,5.3,5.2,h1,hd1);if(!back){poly([hp(-4.4,-.4),hp(4.4,-.4),hp(4,2.2),hp(-4,2.2)],Dk(K.hc||'#8a8f9a',.7),'#1a1020');if(!T){ctx.fillStyle='#7fe0ff';ctx.fillRect(Hc[0]-3,Hc[1]+.3,6,.6);}}
      if(!T){ctx.fillStyle=shade(K.hc||'#8a8f9a',1.5);ctx.fillRect(Hc[0]-2.4,Hc[1]-4.6,2.6,.6);}poly([hp(-.7,-5.4),hp(0,-7.4),hp(.7,-5.4)],h2);
      if(K.plume)poly([hp(-.6,-5.6),hp(.6,-5.6),hp(1.8+wv,-9),hp(-1+wv,-9.6)],C(K.plume),Dk(K.plume,.6));
      if(K.horns)both([hp(-3,-3.4),hp(-6,-8.4),hp(-4.6,-3)],C(K.horns),Dk(K.horns,.6));}
    else if(K.head==='band'||K.head==='hood'){poly([hp(-5,-3.3),hp(5,-3.3),hp(5,-2.1),hp(-5,-2.1)],h1,hd1);if(back){poly([hp(-.4,-2.8),hp(.6,-2.8),hp(2.6+wv,3),hp(1.4+wv,3.4)],h1);poly([hp(-.6,-2.6),hp(.4,-2.6),hp(-1.6+wv,2.6),hp(-2.6+wv,2.2)],Dk(K.hc,.8));}else if(!T){ctx.fillStyle=h2;ctx.fillRect(Hc[0]-.9,Hc[1]-3.2,1.8,1);}}
    else if(K.head==='horns')both([hp(-2.4,-4),hp(-4.4,-10),hp(-1.2,-4.2)],h1,hd1);
    else if(K.head==='cap'){poly([hp(-5,-1.8),hp(-4.4,-5),hp(0,-6.6),hp(4.4,-5),hp(5,-1.8)],h1,hd1);if(!back)poly([hp(-4.2,-2.2),hp(4.2,-2.2),hp(3.6,-.8),hp(-3.6,-.8)],h2,Dk(K.hc2||K.hc,.6));}
    else if(K.head==='wizard'){poly([hp(-7,-2.4),hp(7,-2.4),hp(6,-1.2),hp(-6,-1.2)],h1,hd1);poly([hp(-4,-2.4),hp(4,-2.4),hp(1,-8),hp(-1.6+wv*.5,-12),hp(-3.2+wv*.6,-11.4),hp(-1.4,-8)],h1,hd1);if(!T){ctx.fillStyle=h2;ctx.fillRect(Hc[0]-3.8,Hc[1]-3.6,7.6,.8);}}
    else if(K.head==='halo'){ctx.strokeStyle=h1;ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(Hc[0],Hc[1]-7.6+Math.sin(G.t*.1)*.5,4,1.1,0,0,7);ctx.stroke();}
    else if(K.head==='crown'){poly([hp(-3.6,-4.4),hp(-3.8,-7.4),hp(-2,-5.8),hp(0,-8),hp(2,-5.8),hp(3.6,-7.4),hp(3.4,-4.4)],h1,hd1);if(!T&&!back){ctx.fillStyle=h2;ctx.fillRect(Hc[0]-.5,Hc[1]-5.6,1,1);}}}
  ctx.setTransform(1,0,0,1,0,0);
}
function drawRigFB(ctx,x,y,sc,view,ph,moving,K,tint,tt){
  const px=sc>=2.4?3:2,ox=135,oy=196,k=sc/px;let key=null;
  if(!tint){key=ksig(K)+view+(moving?'m'+Math.round(Math.sin(ph)*4):'i'+Math.round(Math.sin(tt*.09)*2))+'w'+Math.round(Math.sin(tt*.16)*4)+'p'+px;const hit=RCACHE.get(key);
    if(hit){ctx.save();ctx.imageSmoothingEnabled=k<1;ctx.drawImage(hit.c,x+hit.dx*k,y+hit.dy*k,hit.c.width*k,hit.c.height*k);ctx.restore();return;}}
  const bx=ox-34*px,by=oy-56*px,bw=68*px,bh=Math.min(230-by,62*px);
  RX.setTransform(1,0,0,1,0,0);RX.clearRect(bx,by,bw,bh);drawChibiFB(RX,ox,oy,px,view,ph,moving,K,tint,tt);
  const bb=rigShade(bx,by,bw,bh,-1,!!tint);if(!bb)return;
  const cx0=bx+bb[0],cy0=by+bb[1],cw=bb[2]-bb[0]+1,ch=bb[3]-bb[1]+1;
  ctx.save();ctx.imageSmoothingEnabled=k<1;ctx.drawImage(RIGC,cx0,cy0,cw,ch,x+(cx0-ox)*k,y+(cy0-oy)*k,cw*k,ch*k);ctx.restore();
  if(key){if(RCACHE.size>700)RCACHE.clear();const c=document.createElement('canvas');c.width=cw;c.height=ch;c.getContext('2d').drawImage(RIGC,cx0,cy0,cw,ch,0,0,cw,ch);RCACHE.set(key,{c,dx:cx0-ox,dy:cy0-oy});}}
const RCACHE=new Map(),KSIG=new WeakMap();
function ksig(K){let s=KSIG.get(K);if(!s){s=JSON.stringify(K);KSIG.set(K,s);}return s;}
function drawRig(ctx,x,y,sc,dir,P,K,tint){
  if(!RIG_HD.on)return drawRigRaw(ctx,x,y,sc,dir,P,K,tint);
  const px=sc>=2.4?3:2,ox=135,oy=196,k=sc/px;let key=null;
  // ภาพขนาดเล็ก (ฉากเดินสำรวจ): แคชเฟรมตามท่าทางที่ปัดเป็นพิกเซล — คนเยอะแค่ไหนก็ไม่หนักเครื่อง
  if(px===2&&!tint){const pk=[];for(const n in P){const v=P[n];if(Array.isArray(v))pk.push(Math.round(v[0]*2),Math.round(v[1]*2));else if(typeof v==='number')pk.push(Math.round(v*(n==='hip'?2:40)));}
    key=ksig(K)+dir+pk.join(',')+'w'+Math.round(Math.sin(G.t*.16)*4);const hit=RCACHE.get(key);
    if(hit){ctx.save();ctx.imageSmoothingEnabled=k<1;ctx.drawImage(hit.c,x+hit.dx*k,y+hit.dy*k,hit.c.width*k,hit.c.height*k);ctx.restore();return;}}
  const bx=ox-34*px,by=oy-56*px,bw=68*px,bh=Math.min(230-by,62*px);
  RX.setTransform(1,0,0,1,0,0);RX.clearRect(bx,by,bw,bh);drawChibi(RX,ox,oy,px,dir,P,K,tint);
  const bb=rigShade(bx,by,bw,bh,dir,!!tint);if(!bb)return;
  const cx0=bx+bb[0],cy0=by+bb[1],cw=bb[2]-bb[0]+1,ch=bb[3]-bb[1]+1;
  ctx.save();ctx.imageSmoothingEnabled=k<1;ctx.drawImage(RIGC,cx0,cy0,cw,ch,x+(cx0-ox)*k,y+(cy0-oy)*k,cw*k,ch*k);ctx.restore();
  if(key){if(RCACHE.size>700)RCACHE.clear();const c=document.createElement('canvas');c.width=cw;c.height=ch;c.getContext('2d').drawImage(RIGC,cx0,cy0,cw,ch,0,0,cw,ch);RCACHE.set(key,{c,dx:cx0-ox,dy:cy0-oy});}}
// แปลงเป็นพิกเซลอาร์ต: ตัดขอบเบลอ → แรเงา (บนสว่าง ล่าง/หลังมืด) → เส้นขอบ 1 พิกเซลสีเข้มของชิ้นที่ติดกัน (sel-out)
function rigShade(bx,by,w,h,dir,flat){const im=RX.getImageData(bx,by,w,h),d=im.data,n=w*h,op=new Uint8Array(n);
  for(let i=0;i<n;i++){const a=d[i*4+3];if(a>=110){op[i]=1;if(a<255){const f=255/a;d[i*4]=Math.min(255,d[i*4]*f);d[i*4+1]=Math.min(255,d[i*4+1]*f);d[i*4+2]=Math.min(255,d[i*4+2]*f);}d[i*4+3]=255;}else d[i*4+3]=0;}
  if(!flat){const src=new Uint8ClampedArray(d);const O=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&op[y*w+x];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(op[i]){let m=1;
        if(!O(x,y-1))m=1.3;else if(!O(x,y+1))m=.68;else if(!O(x,y-2)&&O(x+dir,y))m=1.12;else if(!O(x-dir,y))m=.8;else if(!O(x,y+2))m=.86;
        if(m!==1){const j=i*4,ad=m>1?16:0;d[j]=Math.min(255,src[j]*m+ad);d[j+1]=Math.min(255,src[j+1]*m+ad*.8);d[j+2]=Math.min(255,src[j+2]*m+ad*.5);}}
      else{let r=0,g2=0,b=0,c=0;for(const[dx,dy]of[[0,-1],[0,1],[-1,0],[1,0]])if(O(x+dx,y+dy)){const j=((y+dy)*w+x+dx)*4;r+=src[j];g2+=src[j+1];b+=src[j+2];c++;}
        if(c){const j=i*4;d[j]=r/c*.28+8;d[j+1]=g2/c*.24+5;d[j+2]=b/c*.3+12;d[j+3]=255;}}}}
  let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0)return null;RX.putImageData(im,bx,by,x0,y0,x1-x0+1,y1-y0+1);return[x0,y0,x1,y1];}
function poseIdle(t){const br=Math.sin(t*.09)*.6;return{lean:.08,hip:-14+br*.5,ff:[5,0],bf:[-4,0],fh:[6,1-br*.3],bh:[2,5],wa:-.9,head:0};}

/* drawing helpers on the hi-res canvas */
function rrect(x,y,w,h,r){D.beginPath();if(D.roundRect)D.roundRect(x,y,w,h,r);else D.rect(x,y,w,h);}
function outlineText(t,x,y,size,col,align='center',ctx=D){ctx.font=`800 ${size}px Sarabun,sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.lineWidth=Math.max(3,size/6);ctx.lineJoin='round';ctx.strokeStyle='rgba(0,0,0,.9)';ctx.strokeText(t,x,y);ctx.fillStyle=col;ctx.fillText(t,x,y);}
function pill(x,y,txt,col='#f3c969'){
  D.font='700 15px Sarabun,sans-serif';const w=D.measureText(txt).width+16;x=Math.max(w/2+4,Math.min(D.canvas.width-w/2-4,x));D.fillStyle='rgba(15,10,18,.85)';D.strokeStyle=col;D.lineWidth=1.5;
  rrect(x-w/2,y-12,w,24,12);D.fill();D.stroke();D.fillStyle='#fff';D.textAlign='center';D.textBaseline='middle';D.fillText(txt,x,y+1);
}
function lighting(ls,dark){
  L.globalCompositeOperation='source-over';L.clearRect(0,0,W,H);L.fillStyle=dark;L.fillRect(0,0,W,H);
  L.globalCompositeOperation='destination-out';
  for(const l of ls){const gr=L.createRadialGradient(l.x,l.y,0,l.x,l.y,l.r);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.45,'rgba(0,0,0,.75)');gr.addColorStop(1,'rgba(0,0,0,0)');L.fillStyle=gr;L.fillRect(l.x-l.r,l.y-l.r,l.r*2,l.r*2);}
  L.globalCompositeOperation='source-over';g.drawImage(lc,0,0);
  g.globalCompositeOperation='lighter';
  for(const l of ls)if(l.c){const gr=g.createRadialGradient(l.x,l.y,0,l.x,l.y,l.r*.8);gr.addColorStop(0,l.c);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(l.x-l.r,l.y-l.r,l.r*2,l.r*2);}
  g.globalCompositeOperation='source-over';
}
function drawTorch(ctx,x,y,s=1){ctx.fillStyle='#3a2a1e';ctx.fillRect(x-s,y,2*s,5*s);const f=Math.round(Math.sin(G.t*.3+x)*s);
  ctx.fillStyle='#ff6a1a';ctx.fillRect(x-2*s,y-4*s+f,4*s,4*s);ctx.fillStyle='#ffd27a';ctx.fillRect(x-s,y-3*s+f,2*s,3*s);}
const toastEl=$('#toast');let toastT=null;
function toast(t,ms=2400){toastEl.innerHTML=t;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>toastEl.classList.remove('on'),ms);}
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
