'use strict';
/* ============================================================
   CORE — canvas, input, sound, RNG, pixel sprites, character rig
   ============================================================ */
const $=s=>document.querySelector(s);
const wrap=$('#wrap'),cv=$('#c'),D=cv.getContext('2d');
const W=480,H=270,S=2,GY=236,GRAV=.34,FPS=60;
const mk=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
const low=mk(),g=low.getContext('2d'),lc=mk(),L=lc.getContext('2d'),bgC=mk(),B=bgC.getContext('2d'),bbC=mk(),BB=bbC.getContext('2d');
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
function tone(f,d,type='square',v=.06,slide=1){if(!AC)return;try{const t=AC.currentTime,o=AC.createOscillator(),gn=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide!==1)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+d);gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gn);gn.connect(AC.destination);o.start(t);o.stop(t+d+.02);}catch(e){}}
function noise(d,v=.12,hp=800){if(!AC)return;try{if(!NB){NB=AC.createBuffer(1,AC.sampleRate*.5|0,AC.sampleRate);const a=NB.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;}
  const t=AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),gn=AC.createGain();s.buffer=NB;f.type='highpass';f.frequency.value=hp;gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(gn);gn.connect(AC.destination);s.start(t);s.stop(t+d+.02);}catch(e){}}
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
function shadow(ctx,x,y,rx){ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(x,y,rx,rx*.3,0,0,7);ctx.fill();}
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
function drawRig(ctx,x,y,sc,dir,P,K,tint){
  const J=rigPoints(P);
  {const W2=K.weapon&&WEAPONS[K.weapon];if(W2&&W2.twoHand){const h=J.fe.end,a=P.wa||0;J.be=ik(J.bs,[h[0]-Math.cos(a)*3.5,h[1]-Math.sin(a)*3.5],5.5,5.5,0);}}   // อาวุธสองมือ: มือหลังจับด้าม
  const R=(lx,ly,w,h,col)=>{const X=Math.round(lx),Y=Math.round(ly);ctx.fillStyle=col;ctx.fillRect(dir>0?x+X*sc:x-(X+w)*sc,y+Y*sc,w*sc,h*sc);};
  const blk=(cx,cy,w,h,col)=>R(cx-w/2,cy-h/2,w,h,col);
  const seg=(a,b,w,col)=>{const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.max(1,Math.ceil(Math.hypot(dx,dy)*1.6));for(let i=0;i<=n;i++)blk(a[0]+dx*i/n,a[1]+dy*i/n,w,w,col);};
  const wv=Math.sin(G.t*.16),Wp=K.weapon&&WEAPONS[K.weapon]&&(WEAPONS[K.weapon].len||WEAPONS[K.weapon].shape)?WEAPONS[K.weapon]:null,Hd=J.hd;
  for(let pass=0;pass<2;pass++){
    const O=pass===0,o=O?2:0,C=c=>O?'#0e0810':(tint||c),dk=c=>O?'#0e0810':(tint||shade(c,.72));
    if(K.cape)for(let k=0;k<4;k++){const a=Math.PI*.6+k*.11+wv*.07*(k+1)-P.lean*.6;seg([J.sh[0]-1.5,J.sh[1]+1],[J.sh[0]-1.5+Math.cos(a)*17,J.sh[1]+1+Math.sin(a)*17],3+o,C(k%2?K.cape.col2:K.cape.col));}
    if(K.scarf){seg([J.sh[0]-1,J.sh[1]],[J.sh[0]-10,J.sh[1]+2+wv*2.5],2+o,C(K.scarf));seg([J.sh[0]-1,J.sh[1]+1],[J.sh[0]-8,J.sh[1]+5+wv*2],2+o,C(K.scarf));}
    seg(J.bs,J.be.j,2+o,dk(K.sleeve||K.body));seg(J.be.j,J.be.end,2+o,dk(K.gloves||K.skin));blk(J.be.end[0],J.be.end[1],3+o,3+o,dk(K.gloves||K.skin));
    seg(J.bhp,J.bk.j,3+o,dk(K.pants));seg(J.bk.j,J.bk.end,3+o,dk(K.pants));blk(J.bk.end[0]+1,J.bk.end[1]-1,5+o,3+o,dk(K.boots));
    seg(J.hip,J.sh,(K.sex==='f'?6:7)+o,C(K.body));
    if(K.sex==='f'&&!K.plate){const t2=.68,cx=J.hip[0]+(J.sh[0]-J.hip[0])*t2,cy=J.hip[1]+(J.sh[1]-J.hip[1])*t2;blk(cx+2.6,cy+.4,2.4+o,2.6+o,C(K.body));   // ทรงอกเล็กน้อยให้แยกเพศได้
      const hx=J.hip[0]+(J.sh[0]-J.hip[0])*.08,hy=J.hip[1]+(J.sh[1]-J.hip[1])*.08;blk(hx,hy,7.4+o,2+o,C(K.body));}   // สะโพกกว้างกว่าเอวเล็กน้อย
    seg(J.fhp,J.fk.j,3+o,C(K.pants));seg(J.fk.j,J.fk.end,3+o,C(K.pants));blk(J.fk.end[0]+1,J.fk.end[1]-1,5+o,3+o,C(K.boots));
    if(K.robe)for(let k=0;k<9;k++){const ww=7+k*.55;blk(J.hip[0]+.3+k*.08,J.hip[1]+k,ww+o,1.2+o,C(k===8?(K.trim||K.robe):K.robe));}   // เสื้อคลุมยาวคลุมขา
    blk(Hd[0],Hd[1],8+o,8+o,C(K.skin));
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
  if(K.head==='halo'){const hy=Hd[1]-10+Math.sin(G.t*.1)*.6;blk(Hd[0],hy,10,1,K.hc);blk(Hd[0]-5,hy+.5,1,1,K.hc);blk(Hd[0]+5,hy+.5,1,1,K.hc);}
  if(K.neck){blk(J.sh[0]+.5,J.sh[1]+1,4,1,'#d8b050');blk(J.sh[0]+1.5,J.sh[1]+2.5,2,2,K.neck);if(G.t%40<6)blk(J.sh[0]+1,J.sh[1]+2,1,1,'#ffffff');}
  if(K.ring){blk(J.fe.end[0]+1,J.fe.end[1]-.5,1,1,K.ring);}
  if(K.head==='helm'){R(Hd[0]+1,Hd[1]-1,4,2,K.hc2);R(Hd[0]+3,Hd[1]-1,1,1,'#7fe0ff');}
  else{if(K.sex==='f'){R(Hd[0]+3,Hd[1]-2,1,1,'#1a1020');R(Hd[0]+1,Hd[1]-2,1,1,'#1a1020');}   // ขนตา
    R(Hd[0]+1,Hd[1]-1,2,2,K.eyec||'#1a1020');if(K.eyec&&K.eyec!=='#1a1020')R(Hd[0]+1,Hd[1],1,1,'#1a1020');R(Hd[0]+2,Hd[1]-1,1,1,K.eye||'#ffffff');R(Hd[0]+2,Hd[1]+2,1,1,K.sex==='f'?'#d0607a':'#b0706a');
    if(K.head==='band')R(Hd[0]+1,Hd[1]-3.5,3,2,K.hc2);if(K.head==='horns')R(Hd[0]-1,Hd[1]-4.5,3,1,K.hc2);if(K.head==='crown')R(Hd[0]-.5,Hd[1]-5,2,1,K.hc2);}
  if(K.mask)blk(Hd[0]+1.5,Hd[1]+2.5,5,3,'#1a1a24');
}
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
