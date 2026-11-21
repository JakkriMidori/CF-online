'use strict';
/* ============================================================
   CORE — canvas, input, sound, RNG, pixel sprites, character rig
   ============================================================ */
const $=s=>document.querySelector(s);
const wrap=$('#wrap'),cv=$('#c'),D=cv.getContext('2d');
const W=480,H=270,S=2,GY=236,GRAV=.34,FPS=60;
const BZ=.56,BW=Math.round(W/BZ);   // กล้องฉากต่อสู้: ซูมออก (สเกล 0.56) → พื้นที่ต่อสู้กว้างขึ้นเป็น ~857
const bsx=x=>x*BZ,bsy=y=>GY+(y-GY)*BZ;   // แปลงพิกัดโลกการต่อสู้ → พิกัดจอ
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
  if(KB_WAIT){e.preventDefault();const id=KB_WAIT;KB_WAIT=null;if(e.code!=='Escape')kbSet(id,e.code);if(typeof UI!=='undefined')UI.rerender();return;}
  const k=e.code;if(!keys[k])pressed[k]=true;keys[k]=true;
  if(e.target&&e.target.tagName==='BUTTON'&&(k==='Space'||k==='Enter'))return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Backquote','PageUp','Tab'].includes(k))e.preventDefault();initAudio();});
addEventListener('keyup',e=>{keys[e.code]=false;});
/* ปุ่มควบคุม — ปรับได้จากเมนู "ปุ่มควบคุม" (บันทึกใน localStorage 'cf_keys') */
const KB_DEFS=[
  {g:'move',id:'left',n:'เดินซ้าย',def:'KeyA'},{g:'move',id:'right',n:'เดินขวา',def:'KeyD'},
  {g:'move',id:'up',n:'กระโดด / มองขึ้น',def:'KeyW'},{g:'move',id:'down',n:'ย่อตัว',def:'KeyS'},
  {g:'move',id:'dodge',n:'พุ่งหลบ',def:'Space'},
  {g:'battle',id:'punch',n:'ต่อย',def:'KeyJ'},{g:'battle',id:'kick',n:'เตะ',def:'KeyK'},
  {g:'battle',id:'guard',n:'ป้องกัน (ถือค้าง)',def:'KeyE'},
  {g:'battle',id:'s1',n:'สกิลช่อง 1',def:'Digit1'},{g:'battle',id:'s2',n:'สกิลช่อง 2',def:'Digit2'},
  {g:'battle',id:'s3',n:'สกิลช่อง 3',def:'Digit3'},{g:'battle',id:'s4',n:'สกิลช่อง 4',def:'Digit4'},
  {g:'battle',id:'ult',n:'ท่าสุดยอด (ช่อง 4)',def:'KeyL'},
  {g:'battle',id:'flask',n:'ขวดยา',def:'KeyQ'},{g:'battle',id:'mana',n:'ยามานา',def:'KeyR'},
  {g:'battle',id:'flee',n:'หลบหนี',def:'KeyF'},
  {g:'explore',id:'interact',n:'คุย / เก็บ / เปิด / ตีเหล็ก',def:'KeyE'},
  {g:'explore',id:'bag',n:'ช่องเก็บของ',def:'KeyI'},{g:'explore',id:'equip',n:'สวมใส่อุปกรณ์',def:'KeyU'},{g:'explore',id:'char',n:'สถานะตัวละคร',def:'KeyC'},
  {g:'explore',id:'skills',n:'สกิล',def:'KeyK'},{g:'explore',id:'quests',n:'เควสต์',def:'KeyQ'},
  {g:'explore',id:'map',n:'แผนที่โลก',def:'KeyM'},{g:'explore',id:'ency',n:'สารานุกรม',def:'KeyB'},
  {g:'explore',id:'mini',n:'ซ่อน / แสดงแผนที่เล็ก',def:'KeyN'}];
const KB={};for(const a of KB_DEFS)KB[a.id]=a.def;
try{const sv=JSON.parse(localStorage.getItem('cf_keys')||'null');if(sv){for(const a of KB_DEFS)if(typeof sv[a.id]==='string')KB[a.id]=sv[a.id];if(sv.equip==='KeyI'&&!sv.bag)KB.equip='KeyU';} /* เซฟเก่า: I เป็นช่องเก็บของ */}catch(e){}
const KB_ALT={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown'};   // ลูกศรใช้แทนการเดิน/กระโดด/ย่อเสมอ
const KB_RESERVED=['Escape','Tab','Backquote','PageUp','Enter','NumpadEnter'];                  // ปุ่มระบบ ห้ามผูก
let KB_WAIT=null;                                                                       // id ที่กำลังรอปุ่มใหม่
const kb=id=>KB_ALT[id]?[KB[id],KB_ALT[id]]:[KB[id]];
function kbSet(id,code){const a=KB_DEFS.find(x=>x.id===id);if(!a||KB_RESERVED.includes(code))return false;
  const old=KB[id];for(const b of KB_DEFS)if(b.g===a.g&&b.id!==id&&KB[b.id]===code)KB[b.id]=old;   // ซ้ำในกลุ่มเดียวกัน = สลับกัน
  KB[id]=code;try{localStorage.setItem('cf_keys',JSON.stringify(KB));}catch(e){}return true;}
function kbReset(){for(const a of KB_DEFS)KB[a.id]=a.def;try{localStorage.removeItem('cf_keys');}catch(e){}}
const kbLabel=c=>({ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Space:'Space',Backquote:'`'}[c]||(c||'').replace(/^Key/,'').replace(/^Digit/,'').replace(/^Numpad/,'Num '));
const kbName=id=>kbLabel(KB[id]);
// เมาส์ในฉากต่อสู้: คลิกซ้าย = ต่อย · คลิกขวา = เตะ (ตามปุ่มที่ผูกไว้)
const MOUSE_ACT={0:'punch',2:'kick'};
cv.addEventListener('mousedown',e=>{if(typeof G==='undefined'||G.mode!=='battle')return;const id=MOUSE_ACT[e.button];if(!id)return;const k=KB[id];e.preventDefault();if(!keys[k])pressed[k]=true;keys[k]=true;initAudio();});
addEventListener('mouseup',e=>{const id=MOUSE_ACT[e.button];if(id)keys[KB[id]]=false;});
cv.addEventListener('contextmenu',e=>{if(typeof G!=='undefined'&&G.mode==='battle')e.preventDefault();});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
const padKeys={};
const down=(...ks)=>ks.some(k=>keys[k]||padKeys[k]);
/* GAMEPAD — d-pad/stick → arrows, A → confirm/interact, B → back, X → J, Y → K, LB/RB → skills 1/2 */
const PADMAP={12:'ArrowUp',13:'ArrowDown',14:'ArrowLeft',15:'ArrowRight',0:'PadA',1:'Escape',2:'PadX',3:'PadY',4:'Digit1',5:'Digit2',9:'Enter'};   // X/Y = ต่อย/เตะ (ควบคู่กับปุ่มที่ผูกไว้)
const padPrev={};
function pollPad(){
  const gp=navigator.getGamepads?[...navigator.getGamepads()].find(Boolean):null;if(!gp)return;
  const st={};for(const b in PADMAP)st[PADMAP[b]]=!!(gp.buttons[b]&&gp.buttons[b].pressed);
  const ax=gp.axes||[];if(ax[0]<-.5)st.ArrowLeft=true;if(ax[0]>.5)st.ArrowRight=true;if(ax[1]<-.5)st.ArrowUp=true;if(ax[1]>.5)st.ArrowDown=true;
  for(const k in st){if(st[k]&&!padPrev[k])pressed[k]=true;padKeys[k]=st[k];padPrev[k]=st[k];}
}
const tap=(...ks)=>ks.some(k=>pressed[k]);

/* SOUND */
let AC=null,NB=null;
function initAudio(){try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();}catch(e){AC=null;}}
const _dst=()=>(typeof SND!=='undefined'&&SND.master)||AC.destination;   // ผ่านปุ่มปรับเสียงหลัก
function tone(f,d,type='square',v=.06,slide=1){if(!AC||(typeof SND!=='undefined'&&SND.vol<=0))return;try{const t=AC.currentTime,o=AC.createOscillator(),gn=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide!==1)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+d);gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gn);gn.connect(_dst());o.start(t);o.stop(t+d+.02);}catch(e){}}
function noise(d,v=.12,hp=800){if(!AC||(typeof SND!=='undefined'&&SND.vol<=0))return;try{if(!NB){NB=AC.createBuffer(1,AC.sampleRate*.5|0,AC.sampleRate);const a=NB.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;}
  const t=AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),gn=AC.createGain();s.buffer=NB;f.type='highpass';f.frequency.value=hp;gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(gn);gn.connect(_dst());s.start(t);s.stop(t+d+.02);}catch(e){}}
const SFX={
  swing:()=>{noise(.07,.06,2200);tone(280,.06,'triangle',.03,.6);},
  hit:big=>{noise(big?.22:.11,big?.24:.15,350);tone(big?85:145,big?.22:.13,'square',.08,.45);if(big)tone(55,.26,'sine',.09,.5);},
  crit:()=>{noise(.24,.24,260);tone(75,.28,'sawtooth',.09,.35);tone(1320,.09,'triangle',.05,1.2);setTimeout(()=>tone(1760,.12,'sine',.04),35);},
  trueDmg:()=>{tone(1046,.12,'triangle',.07,1.4);tone(1568,.18,'sine',.06);noise(.14,.12,2400);},
  block:()=>{tone(680,.07,'square',.06,.75);tone(340,.08,'triangle',.04,.8);noise(.06,.08,3200);},
  parry:()=>{tone(1180,.16,'triangle',.11,1.5);tone(1760,.24,'sine',.08,1.1);setTimeout(()=>tone(2350,.22,'sine',.05),40);},
  perfect:()=>{tone(880,.07,'square',.05);setTimeout(()=>tone(1320,.12,'triangle',.06),55);},
  pick:()=>{tone(660,.07,'square',.05);setTimeout(()=>tone(990,.1,'triangle',.05),65);},
  craft:()=>[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.12,'triangle',.07),i*70)),
  fail:()=>tone(170,.25,'sawtooth',.05,.6),
  dodge:()=>{noise(.13,.07,1400);tone(440,.09,'sine',.04,1.6);},
  jump:()=>tone(300,.12,'square',.04,2),
  talk:()=>tone(520+Math.random()*80,.03,'square',.025),
  ko:()=>{tone(220,.85,'sawtooth',.09,.22);tone(110,.9,'sine',.08,.3);noise(.55,.18,180);},
  win:()=>[523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>tone(f,.18,'triangle',.06),i*90)),
  level:()=>[392,523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>tone(f,.15,'triangle',.07),i*80)),
  smash:()=>{noise(.38,.24,180);tone(65,.38,'square',.09,.45);tone(48,.42,'sine',.08,.5);},
  explosion:()=>{noise(.36,.26,160);tone(95,.34,'sawtooth',.09,.3);tone(55,.42,'sine',.1,.4);},
  flash:()=>{tone(220,.55,'sawtooth',.07,3.8);tone(440,.45,'triangle',.05,2.2);noise(.42,.12,1200);},
  beam:()=>{tone(180,.4,'sawtooth',.06,2.2);tone(720,.45,'sine',.05,.9);noise(.35,.1,1800);},
  fire:()=>{tone(380,.22,'sawtooth',.05,.4);noise(.22,.09,900);},
  heal:()=>[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.14,'sine',.06,1.08),i*55)),
  mana:()=>[587,740,880,1175].forEach((f,i)=>setTimeout(()=>tone(f,.14,'triangle',.055,1.1),i*50)),
  root:()=>{tone(988,.15,'triangle',.06,.7);setTimeout(()=>tone(659,.22,'sine',.05,.8),60);},
  spire:()=>{[392,523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>setTimeout(()=>{tone(f,.42,'sine',.055,1.02);tone(f*1.5,.28,'triangle',.025);},i*65));noise(.35,.06,2800);},
  magic:el=>{
    if(el==='fire'){tone(340,.22,'sawtooth',.05,.5);noise(.18,.08,800);}
    else if(el==='lightning'){tone(920,.12,'square',.05,.4);noise(.14,.1,3200);}
    else if(el==='ice'){tone(1200,.16,'sine',.05,1.3);tone(1600,.14,'triangle',.04,.8);}
    else if(el==='holy'){tone(784,.18,'sine',.06,1.25);setTimeout(()=>tone(1175,.2,'triangle',.05),45);}
    else if(el==='shadow'||el==='poison'){tone(240,.22,'sawtooth',.05,.65);tone(160,.24,'sine',.05,.5);}
    else{tone(520,.16,'triangle',.05,1.4);tone(780,.14,'sine',.04);}
  },
  status:()=>tone(300,.1,'triangle',.05,1.6),
  shatter:()=>{noise(.28,.22,2600);tone(1480,.08,'triangle',.08,.7);setTimeout(()=>tone(2200,.14,'sine',.07,.6),35);setTimeout(()=>tone(960,.18,'triangle',.06,.5),70);},
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
  girl:{h:'#bfa688',s:'#fbe0c8',e:'#2b3a4a',c:'#f4f7f8',b:'#10767e',p:'#f2ebe2',f:'#3e2824'},
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
const DUMMY=["......oooo......",".....ohhhho.....",".....ohssho.....","......oooo......","..oooowttwoooo..",".ohhhhtrrthhhho.",".ohssstrwtsssho.","..oooowttwoooo..","......owwo......","......owwo......","......owwo......","....oowwwwoo...."];
PAL.dummy={o:'#2a1c12',h:'#e8c878',s:'#c89a42',w:'#8a5628',t:'#f2f2f2',r:'#e03a3a'};
const SPR={RAT,GOLEM,ANGEL,SLIME,WOLF,DUMMY};
function spr(ctx,map,pal,x,y,sc,flip,tint,f){
  if(map===GOLEM&&typeof RIG_HD!=='undefined'&&RIG_HD.on)return drawGolemHD(ctx,pal,x,y,sc,flip,tint,f);
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
  let dx=t[0]-a[0],dy=t[1]-a[1],d=Math.hypot(dx,dy)||.001;const mx=l1+l2-.0001;if(d>mx){dx*=mx/d;dy*=mx/d;d=mx;}
  const base=Math.atan2(dy,dx),off=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));
  const c1=[a[0]+Math.cos(base+off)*l1,a[1]+Math.sin(base+off)*l1],c2=[a[0]+Math.cos(base-off)*l1,a[1]+Math.sin(base-off)*l1];
  return{j:leg?(c1[0]>c2[0]?c1:c2):c1,end:[a[0]+dx,a[1]+dy]};
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
    case'chaosblade':grip(4,'#0b0714');B(-2.2,0,1.1,2.1,'#4a2a80');B(-.8,0,1.1,2.1,'#4a2a80');
      B(-4.8,0,3.4,3.8,'#07040d');B(-4.8,0,2.2,2.4,'#7a3fd0');B(-4.8,0,1.2,1.2,glow?'#e2b3ff':'#a64df0');
      S(0,-5.4,0,5.4,2.8,'#07040d');S(.3,-4.8,.3,4.8,1,'#7a3fd0');
      B(.6,-3.8,3.4,3.2,'#07040d');B(.6,3.8,3.4,3.2,'#07040d');B(.6,-3.8,1.8,1.8,'#7a3fd0');B(.6,3.8,1.8,1.8,'#7a3fd0');
      B(.6,0,2.4,2.4,'#7a3fd0');B(.6,0,1.2,1.2,'#e2b3ff');
      S(1.8,0,L-2.5,0,4.2,'#0a0610');S(L-2.5,0,L+1.8,0,2.2,'#0a0610');
      S(1.8,0,L-2.5,0,3.2,'#28144a');S(1.8,0,L-4,0,2.2,'#3a2268');S(L-2.5,0,L+1.2,0,1.4,'#150b27');
      if(glow){S(2.4,-1.1,L-2.4,-.9,.55,'#c77dff');
        S(2,0,5,.45,.9,'#a64df0');S(5,.45,8,-.45,.9,'#c77dff');S(8,-.45,11,.35,.9,'#c77dff');S(11,.35,L-1.5,0,.85,'#e2b3ff');
        for(const u of[4.5,8.5,12.5]){S(u,0,u+2,-1.6,.85,'#5ff0ff');S(u+1.2,0,u+3.2,1.6,.85,'#35d6e6');}
        B(6,-2.3+Math.sin(t*.4)*.5,1.5,1.5,'#5ff0ff');B(11,2.3-Math.cos(t*.4)*.5,1.5,1.5,'#e2b3ff');
      }else S(2,0,L-1.5,0,.9,'#a64df0');break;
    case'aethersword':grip(4,'#141620');B(-4.4,0,2.8,3.2,'#e2c088');B(-4.4,0,1.4,1.6,'#40a8ff');   // ด้ามจับ + ทับทิมสีฟ้า
      S(0,-4.8,0,4.8,2.4,'#d8ae58');S(.4,-4,.4,4,1,'#fff4cc');B(.5,0,2.4,2.4,'#40a8ff');B(.5,0,1.1,1.1,'#ffffff');   // กระบังดาบทองคำ + แกนเอเธอร์ฟ้า
      S(1.6,0,L-3,0,3.8,'#181b26');S(1.8,-1.1,L-1.8,-1.1,1.5,'#e2c088');S(L-3,0,L+1.4,0,2,'#fff0b0');   // ใบดาบเหล็กดำขลิบทองปลายแสง
      if(glow){S(2.2,1.2,L-1.2,1.2,1,'#ffd866');S(2.4,0,L-2,0,.7,'#ffffff');
        const sy=Math.sin(t*.3)*.6;B(L*.55,-2.2+sy,2.2,.6,'#fff4c0');B(L*.55,-2.2+sy,.6,2.2,'#fff4c0');}break;
    case'scythe':S(-8,0,L,0,1.5,'#3a2a3a');S(L-8,0,L-8,2.5,1,'#6a4a5a');   // ด้าม + มือจับรอง
      for(let k=0;k<=12;k++){const tt=k/12,u=L-.5-4.5*tt*tt,v=1+11*tt,w=tt<.4?3:tt<.8?2:1;B(u,v,w,w,col);}
      if(glow)for(let k=1;k<=11;k+=2){const tt=k/12;B(L-1.5-4.5*tt*tt,1+11*tt,1,1,fx);}break;
    case'axe':grip(5,'#4a3020');S(-5,0,L-1,0,1.8,'#3a4858');B(L-3,0,4,3,'#2a3a4a');
      S(L-3,-4.5,L,-1.5,3,col);S(L-3,4.5,L,1.5,3,col);B(L-1,-4.5,2,5,col);B(L-1,4.5,2,5,col);
      if(glow){S(L-2,-5.5,L+1.2,-2,1,fx);S(L-2,5.5,L+1.2,2,1,fx);}break;
    case'gaunt':B(.5,0,4,4,col);B(2,-1.5,1,1,'#d8f6ff');B(2,1.5,1,1,'#d8f6ff');if(glow&&t%10<5){B(3.5,-3,1,2,fx);B(4.5,2.5,1,2,fx);}break;
    default:grip(2.5);S(0,-2.5,0,2.5,1,'#8a8f9a');S(1,0,L-2,0,2,col);S(L-2,0,L,0,1,col);shine(2,L-2);
  }
}
function drawRigRaw(ctx,x,y,sc,dir,P,K,tint){
  if(K&&K.custom){drawCustomChibi(ctx,x,y,sc,dir,P,K,tint,null);ctx.setTransform(1,0,0,1,0,0);return;}
  const J=rigPoints(P);
  {const W2=K.weapon&&WEAPONS[K.weapon];if(W2&&W2.twoHand&&!K.sheathe){const h=J.fe.end,a=P.wa||0;J.be=ik(J.bs,[h[0]-Math.cos(a)*3.5,h[1]-Math.sin(a)*3.5],5.5,5.5,0);}}   // อาวุธสองมือ: มือหลังจับด้าม
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
    seg(J.hip,J.sh,(K.sex==='f'?5.6:7)+o,C(K.body));
    if(K.sex==='f'){const t2=.68,cx=J.hip[0]+(J.sh[0]-J.hip[0])*t2,cy=J.hip[1]+(J.sh[1]-J.hip[1])*t2;blk(cx+3.4,cy+.3,3.6+o,3.4+o,C(K.body));   // เพิ่มทรงอกผู้หญิงทั้งหมดให้ชัดเจน
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
  if(K.sex==='f'){const b2=tor(.68);blk(b2[0]+2.7,b2[1]-.6,4.2,2.2,shade(K.body,1.3));blk(b2[0]+2.9,b2[1]+1.2,3.8,1.1,shade(K.body,.58));blk(b2[0]+.4,tor(.3)[1],4.5,1,shade(K.body,.8));}   // เงาอก + เอวคอด
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
function drawCustomChibi(ctx,ox,oy,px,dir,P,K,tint,view){
  const kind=K&&K.custom;if(!kind)return false;
  const back=view==='up',d=view?-1:dir;
  ctx.setTransform(px*d,0,0,px,ox,oy);ctx.lineJoin='round';
  const T=!!tint,C=c=>tint||c,Dk=(c,m)=>tint||shade(c,m),lw=1/px,wv=Math.sin(G.t*.16),bob=Math.sin(G.t*.1)*1.1;
  const fill=(col,edge)=>{ctx.fillStyle=col;ctx.fill();if(edge&&!T){ctx.strokeStyle=edge;ctx.lineWidth=lw;ctx.stroke();}};
  const poly=(pts,col,edge)=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);ctx.closePath();fill(col,edge);};
  const ell=(cx,cy,rx,ry,col,edge,rot=0)=>{ctx.beginPath();ctx.ellipse(cx,cy,Math.max(.1,rx),Math.max(.1,ry),rot,0,7);fill(col,edge);};
  const cap=(a,b,r1,r2,col,edge)=>{const dx=b[0]-a[0],dy=b[1]-a[1],an=Math.atan2(dy,dx),H=Math.PI/2;ctx.beginPath();ctx.arc(a[0],a[1],r1,an+H,an+3*H);ctx.arc(b[0],b[1],r2,an-H,an+H);ctx.closePath();fill(col,edge);};
  const lean=(P.lean||0)*4,hb=bob+(P.hip?-Math.abs(P.hip+14)*.4:0);
  if(kind==='skel_wraith'){
    // ภาพที่ 1: วิญญาณโครงกระดูกคลุมผ้าสีเลือดหมูถือคบเพลิงลุกโชติ
    const r0=C('#6d1122'),r1=C('#961b32'),rd=Dk('#6d1122',.52),bn=C('#8e6e4a'),bd=Dk('#8e6e4a',.62),fc=C('#e8d298');
    // หางผ้าคลุมขาดลอยกลางอากาศ + เศษวิญญาณแดงลอยปลิว
    poly([[-4+lean,-15+hb],[4.5+lean,-15+hb],[3.2,-6+bob],[1,-1+bob],[-1.2,-5+bob],[-2.4,-2+bob],[-3.8,-8+bob]],Dk('#6d1122',.7),rd);
    poly([[-6+lean,-22+hb],[6.5+lean,-22+hb],[7+lean,-13+hb],[2+lean,-11+hb],[-2+lean,-12+hb],[-7.5+wv*.6,-13+hb]],r0,rd);
    if(!T){ctx.fillStyle=r1;ctx.fillRect(-3.5+lean,-20+hb,4,2.5);ctx.fillRect(-7.5+wv,-17+hb,1.2,1.2);ctx.fillRect(-9+wv,-21+hb,1,1);}
    // แขนโครงกระดูกหลัง
    cap([-3.5+lean,-20+hb],[-5.5,-13+hb],1.05,.9,bn,bd);ell(-5.5,-12+hb,1.4,1.3,bn,bd);
    // หัวกะโหลกใต้ฮู้ดแดงคลุมปาก
    poly([[-5.8+lean,-21+hb],[-5.4+lean,-31+hb],[0+lean,-35+hb],[5.2+lean,-31+hb],[4.8+lean,-21+hb]],r0,rd);
    poly([[-5.4+lean,-31+hb],[-7.6+wv*.7,-33.5+hb],[-5+lean,-29+hb]],r1,rd);
    if(!back){
      ell(0.6+lean,-26.5+hb,3.4,3.4,bn,bd);
      poly([[-2.4+lean,-25+hb],[3.4+lean,-25+hb],[3+lean,-21.5+hb],[-2.6+lean,-21.5+hb]],r1,rd);
      if(!T){ctx.fillStyle='#0c080a';ctx.fillRect(-.4+lean,-28.2+hb,1.5,1.6);ctx.fillRect(2.1+lean,-28.2+hb,1.4,1.6);ctx.fillStyle=fc;ctx.fillRect(1.1+lean,-26.4+hb,.9,.9);}
    }
    // แขนหน้าถือคบเพลิงลุกโชติช่วง
    const hx=6.8+lean,hy=-19.5+hb;
    cap([3.5+lean,-20+hb],[hx,hy],1.15,.95,r1,rd);ell(hx,hy,1.3,1.2,bn,bd);
    cap([hx-1.2,hy+2],[hx+3.8,hy-7],1.0,1.25,C('#6e4828'),Dk('#6e4828',.55));
    const tx=hx+4.2,ty=hy-7.8,fl=Math.sin(G.t*.32)*.8;
    poly([[tx-2.6,ty+1],[tx-1.6,ty-4],[tx+fl*.5,ty-8.5-fl],[tx+2.2,ty-3.5],[tx+2.4,ty+1]],C('#ff6a18'),Dk('#ff6a18',.6));
    poly([[tx-1.4,ty],[tx-.4,ty-4.5],[tx+1.4,ty]],C('#ffd23a'));
    if(!T){ctx.fillStyle='#fff6b8';ctx.fillRect(tx-.5,ty-2.5,1.3,2);ctx.fillStyle='#ff8a18';ctx.fillRect(tx+fl,ty-10,1.1,1.1);}
  }else if(kind==='skel_shaman'){
    // ภาพที่ 2: นักบวชโครงกระดูกหัวโตตาเขียว ถือคทากะโหลก + ไฟเขียวเนโครแมนซี
    const bn=C('#cfc6ae'),bm=C('#9e947c'),bd=Dk('#9e947c',.5),gr=C('#9eff00'),gd=C('#50a600');
    // ขากระดูกย่อเข่า + เชิงกราน
    cap([-2.5,-9],[-4,-5],1.2,1,bm,bd);cap([-4,-5],[-3.5,-.8],1,1.1,bm,bd);ell(-2.5,-.6,2,.9,bn,bd);
    cap([2.5,-9],[4,-5],1.2,1,bm,bd);cap([4,-5],[3.5,-.8],1,1.1,bm,bd);ell(4.5,-.6,2,.9,bn,bd);
    poly([[-3.4,-11],[3.4,-11],[2.4,-8],[-2.4,-8]],bm,bd);
    // ซี่โครงและกระดูกสันหลัง
    poly([[-3.2,-20+lean*.2],[3.2,-20+lean*.2],[2.6,-11],[-2.6,-11]],Dk('#585042',.7),bd);
    if(!T){ctx.fillStyle=bn;for(const ry of[-18.5,-16,-13.5])ctx.fillRect(-3.1,ry,6.2,1.3);}
    // มือหลัง + เปลวไฟเขียวลุกโชติ
    cap([-3.2,-18.5],[-7.5,-17],1.1,.9,bm,bd);ell(-8.4,-16.8,1.5,1.3,bn,bd);
    const fx=-8.6,fy=-17.5,fl=Math.sin(G.t*.28)*.9;
    poly([[fx-2.2,fy+1],[fx-1.5,fy-5],[fx+fl*.5,fy-10-fl],[fx+1.8,fy-4],[fx+2,fy+1]],gd);
    poly([[fx-1.1,fy],[fx+fl*.3,fy-6.8],[fx+1.1,fy]],gr);
    if(!T){ctx.fillStyle='#ffffff';ctx.fillRect(fx-.6,fy-2.4,1.2,1.8);}
    // หัวกะโหลกใหญ่ + ตาเขียวเรืองแสงและกรามเรืองแสง
    const hy=-25.5;
    if(!back){
      ell(.5+lean,hy,6.2,5.3,bn,bd);ell(-1+lean,hy-1.8,3.6,2.4,Dk('#cfc6ae',1.18));
      poly([[-2.8+lean,hy+3.4],[4.8+lean,hy+3.4],[4.2+lean,hy+6.4],[-2.2+lean,hy+6.2]],bm,bd);
      if(!T){ctx.fillStyle='#10120c';ctx.fillRect(-1.4+lean,hy-.6,2.8,2.8);ctx.fillRect(2.6+lean,hy-.6,2.8,2.8);ctx.fillRect(1.1+lean,hy+1.9,1.2,1.2);
        ctx.fillStyle=gr;ctx.fillRect(-1+lean,hy+.4,2.1,1.3);ctx.fillRect(2.9+lean,hy+.4,2.1,1.3);
        ctx.fillRect(-.8+lean,hy+3.7,4.2,1.2);ctx.fillStyle='#fff';ctx.fillRect(-.4+lean,hy+.6,.7,.7);ctx.fillRect(3.4+lean,hy+.6,.7,.7);}
    }else{ell(0,hy,6.2,5.3,bm,bd);}
    // มือหน้า + คทากะโหลกสูง
    const sx=6.6+lean;
    cap([3,-18.5],[sx-1,-16],1.1,.9,bm,bd);ell(sx-1,-16,1.4,1.3,bn,bd);
    cap([sx,-30],[sx,-.8],1.05,1.05,C('#5c4c38'),Dk('#5c4c38',.5));
    ell(sx-.3,-32.5,3.0,2.8,bn,bd);
    if(!T&&!back){ctx.fillStyle='#10120c';ctx.fillRect(sx-1.7,-33,1.3,1.2);ctx.fillRect(sx+.5,-33,1.3,1.2);ctx.fillStyle=gr;ctx.fillRect(sx-1.5,-32.8,1,.8);ctx.fillRect(sx+.7,-32.8,1,.8);}
  }else if(kind==='spire_knight'){
    /* บอสหอคอยชั้น 3–5 (โมเดลใหม่): นักรบหญิงสูงเพรียว ชุดรัดรูปเข้ม + เกราะขาวงาช้าง · หน้ากากตาเรืองแสง · อาวุธยาวประจำตัว
       ใช้ข้อต่อจาก rigPoints จึงขยับแขน/ขา/อาวุธตามท่าโจมตีจริง */
    ctx.scale(1.16,1.16);const S2=1.1,J0=rigPoints(P),j=q=>[q[0],q[1]*S2],J={hip:j(J0.hip),sh:j(J0.sh),hd:j(J0.hd),fs:j(J0.fs),bs:j(J0.bs),fe:{j:j(J0.fe.j),end:j(J0.fe.end)},be:{j:j(J0.be.j),end:j(J0.be.end)},fhp:j(J0.fhp),bhp:j(J0.bhp),fk:{j:j(J0.fk.j),end:j(J0.fk.end)},bk:{j:j(J0.bk.j),end:j(J0.bk.end)}};
    const ac=C(K.acc||'#c858ff'),acl=C(K.acc2||'#f4c8ff'),ad2=Dk(K.acc||'#c858ff',.55),su=C(K.suit||'#1c1a26'),sud=Dk(K.suit||'#1c1a26',.6),ar=C(K.armor||'#ece6d8'),ard=Dk(K.armor||'#ece6d8',.72),arl=C('#ffffff'),hc=C(K.hair||'#eef0f4'),hcd=Dk(K.hair||'#eef0f4',.7),sk=C(K.skin||'#f2ece4'),gl=C(K.glow||K.acc||'#c858ff');
    const t=G.t,a=P.wa==null?-.9:P.wa,hx=J.fe.end[0],hy=J.fe.end[1];
    const H=[J.sh[0]+.7,J.sh[1]-4.6],hs=K.khair||'bob',sw2=Math.sin(t*.08)*1.1;
    // ---- ผมด้านหลัง (หางม้า/ผมยาว) วาดก่อนลำตัว ----
    if(hs==='ponytail'){cap([H[0]-1.8,H[1]-2.4],[H[0]-6+sw2,H[1]+9],1.5,.6,hc,hcd);cap([H[0]-6+sw2,H[1]+9],[H[0]-4.6+sw2*1.3,H[1]+17],.7,.3,hc,hcd);}
    if(hs==='long'){poly([[H[0]-3.4,H[1]-2],[H[0]+1.2,H[1]-2.6],[H[0]-.6,H[1]+8],[H[0]-2.2+sw2*.4,H[1]+15],[H[0]-4.6+sw2*.6,H[1]+14],[H[0]-4.4,H[1]+4]],hc,hcd);}
    // ---- ผ้าคลุม/ชายเสื้อด้านหลัง ----
    if(K.cape){const cc=C(K.cape),cd2=Dk(K.cape,.55),ci=C(K.capeIn||K.cape),sw=Math.sin(t*.07)*1.6;
      poly([[J.bs[0]-.5,J.bs[1]],[J.fs[0]+.5,J.fs[1]],[J.hip[0]-2,J.hip[1]+4],[-7+sw,-1],[-12+sw*1.4,-.5],[-9+sw,-12],[J.bs[0]-3,J.bs[1]+5]],cc,cd2);
      if(!T){poly([[J.bs[0]-1.5,J.bs[1]+3],[-9.5+sw*1.2,-2],[-11.5+sw*1.4,-1],[-8.5+sw,-11]],ci);}}
    // ---- ขาหลัง ----
    cap(J.bhp,J.bk.j,1.35,1.1,sud,sud);cap(J.bk.j,J.bk.end,1.15,.95,ard,Dk(K.armor||'#ece6d8',.5));ell(J.bk.end[0]+.6,J.bk.end[1]-.4,1.6,.8,ard);
    // ---- แขนหลัง ----
    cap(J.bs,J.be.j,1.05,.9,sud,sud);cap(J.be.j,J.be.end,1.0,.9,ard,ard);ell(J.be.end[0],J.be.end[1],1.0,1.0,ard);
    // ---- อาวุธ (ด้ามยาว หมุนตามมุมอาวุธของท่า) ----
    const W=K.kweapon||'scythe',ca=Math.cos(a),sa=Math.sin(a),pt=(l,o=0)=>[hx+ca*l-sa*o,hy+sa*l+ca*o];
    const shaftC=C(K.shaft||'#3a2a44');
    const drawWeapon=()=>{
      cap(pt(-11),pt(K.wlen||26),.55,.55,shaftC,Dk(K.shaft||'#3a2a44',.5));
      const L=K.wlen||26;
      if(W==='scythe'){   // ใบเคียวโค้งไล่สีเพลิงอเมทิสต์
        const b0=pt(L-1,0),b1=pt(L+1.5,-1.2),b2=pt(L-3,-8),b3=pt(L-10,-11.5),b4=pt(L-5,-6.5),b5=pt(L-1.5,-3);
        poly([b0,b1,b2,b3,b4,b5],ac,ad2);if(!T){poly([pt(L-.5,-1),pt(L-3.2,-7.2),pt(L-8.5,-10.4),pt(L-4.2,-6.2)],acl);
          ctx.fillStyle=C('#ffb24a');ctx.fillRect(pt(L-9,-10.6)[0]-.5,pt(L-9,-10.6)[1]-.5,1.2,1.2);}
        ell(pt(-11)[0],pt(-11)[1],1.1,1.1,ac,ad2);
      }else if(W==='halberd'){   // ทวนผลึกน้ำแข็ง + ขวานข้าง
        poly([pt(L,0),pt(L+3,-1.6),pt(L+9,0),pt(L+3,1.6)],ac,ad2);if(!T)poly([pt(L+1,0),pt(L+3,-.8),pt(L+7,0)],acl);
        poly([pt(L-1,.4),pt(L-1,4.5),pt(L-4.5,5.5),pt(L-4,.4)],ar,ard);
        if(!T){ctx.fillStyle=gl;const g1=pt(L-2.2,2.6);ctx.fillRect(g1[0]-.5,g1[1]-.5,1,1);}
        for(const q of[-6,-8.5]){const r=pt(q,0);ell(r[0],r[1],.9,.9,ac);}
      }else if(W==='starstaff'){   // ไม้เท้าดาวสี่แฉกทอง + ผลึกห้อย
        const c0=pt(L+2),gold=C('#ffd858'),gd2=Dk('#ffd858',.55),sp=4.6+Math.sin(t*.12)*.5;
        if(!T){ctx.globalAlpha*=.35;ell(c0[0],c0[1],sp*1.3,sp*1.3,gl);ctx.globalAlpha/=.35;}
        poly([[c0[0],c0[1]-sp*1.5],[c0[0]+1.2,c0[1]-1.2],[c0[0]+sp*1.5,c0[1]],[c0[0]+1.2,c0[1]+1.2],[c0[0],c0[1]+sp*1.5],[c0[0]-1.2,c0[1]+1.2],[c0[0]-sp*1.5,c0[1]],[c0[0]-1.2,c0[1]-1.2]],gold,gd2);
        ell(c0[0],c0[1],1.4,1.4,ac,acl);
        const hg=pt(L-4,2.5+Math.sin(t*.1));poly([[hg[0],hg[1]-1.8],[hg[0]+1,hg[1]],[hg[0],hg[1]+2.2],[hg[0]-1,hg[1]]],acl,ad2);
      }};
    if(W==='scythe')drawWeapon();
    // ---- ลำตัว: ชุดรัดรูป + เกราะอก + กระโปรงเกราะ ----
    const sx=J.sh[0],sy=J.sh[1],hpx=J.hip[0],hpy=J.hip[1];
    poly([[hpx-2.6,hpy+1],[hpx+2.6,hpy+1],[sx+2.9,sy+.5],[sx-2.7,sy+.5]],su,sud);
    poly([[sx-2.4,sy+.6],[sx+3.1,sy+.6],[sx+2.6,sy+5.2],[sx+.3,sy+6.6],[sx-2.0,sy+5.0]],ar,ard);
    if(!T){ctx.fillStyle=ac;ctx.fillRect(sx-.2,sy+2,1.2,2.2);ctx.fillStyle=arl;ctx.fillRect(sx+1.2,sy+1.1,1.2,.8);}
    poly([[hpx-2.8,hpy-.6],[hpx+2.9,hpy-.6],[hpx+2.6,hpy+.6],[hpx-2.6,hpy+.6]],ac,ad2);   // เข็มขัดสีประจำตัว
    poly([[hpx-3.0,hpy+.4],[hpx-.2,hpy+.4],[hpx-1.2,hpy+4.4],[hpx-3.6,hpy+3.4]],ar,ard);
    poly([[hpx+.2,hpy+.4],[hpx+3.2,hpy+.4],[hpx+3.8,hpy+3.6],[hpx+1.4,hpy+4.6]],ar,ard);
    if(K.skirt){const kc=C(K.skirt),kd=Dk(K.skirt,.55);poly([[hpx-3.4,hpy+.8],[hpx+3.6,hpy+.8],[hpx+5.4,hpy+8+Math.sin(t*.09)*.4],[hpx-5.2,hpy+7.6]],kc,kd);}
    // ---- ขาหน้า (ต้นขาชุดเข้ม · หน้าแข้งเกราะขาว) ----
    cap(J.fhp,J.fk.j,1.4,1.15,su,sud);cap(J.fk.j,J.fk.end,1.2,1.0,ar,ard);
    ell(J.fk.j[0]+.3,J.fk.j[1],1.25,1.1,arl,ard);ell(J.fk.end[0]+.8,J.fk.end[1]-.4,1.8,.85,ar,ard);
    // ---- ศีรษะ: หน้ากากตาเรืองแสง + ทรงผม ----
    cap([J.sh[0]+.3,J.sh[1]+.5],[H[0],H[1]+2.4],1.0,.9,sk,Dk(K.skin||'#f2ece4',.7));   // คอ
    ell(H[0],H[1],3.2,3.5,sk,Dk(K.skin||'#f2ece4',.7));
    poly([[H[0]-3.5,H[1]-.6],[H[0]-3.2,H[1]-3.6],[H[0]-.4,H[1]-4.6],[H[0]+2.8,H[1]-3.4],[H[0]+3.5,H[1]-1.2],[H[0]+1.4,H[1]-2.2],[H[0]-.6,H[1]-1.2],[H[0]-1.6,H[1]+2.6],[H[0]-3.6,H[1]+2.2]],hc,hcd);
    if(hs==='bob'){poly([[H[0]-3.6,H[1]-1],[H[0]-2.4,H[1]+3.4],[H[0]-.8,H[1]+3.2],[H[0]-1.4,H[1]]],hc,hcd);poly([[H[0]+3.2,H[1]-1],[H[0]+3.6,H[1]+2.6],[H[0]+2.4,H[1]+2.4]],hc,hcd);}
    if(!back&&!T){ctx.fillStyle=gl;ctx.fillRect(H[0]+.4,H[1]+.1,2.9,.75);ctx.fillStyle='#ffffff';ctx.fillRect(H[0]+2.2,H[1]+.1,.8,.75);
      ctx.globalAlpha*=.4;ctx.fillStyle=gl;ctx.fillRect(H[0]+.1,H[1]-.3,3.6,1.5);ctx.globalAlpha/=.4;}
    if(K.horn){poly([[H[0]-.8,H[1]-4.2],[H[0]-2.6,H[1]-8.4],[H[0]+.4,H[1]-4.6]],ac,ad2);poly([[H[0]+1.6,H[1]-3.8],[H[0]+2.6,H[1]-7.6],[H[0]+2.8,H[1]-3.4]],ac,ad2);}
    if(K.crownK){const gold=C('#ffd858');poly([[H[0]-2.6,H[1]-3.8],[H[0]-2.2,H[1]-6.8],[H[0]-1,H[1]-5],[H[0]+.4,H[1]-8.2],[H[0]+1.6,H[1]-5],[H[0]+2.8,H[1]-6.8],[H[0]+2.8,H[1]-3.6]],gold,Dk('#ffd858',.55));if(!T){ctx.fillStyle=ac;ctx.fillRect(H[0]-.1,H[1]-5.6,1,1);}}
    if(K.haloK&&!T){ctx.strokeStyle=gl;ctx.lineWidth=lw*1.6;ctx.globalAlpha*=.85;ctx.beginPath();ctx.ellipse(H[0]-.5,H[1]-6.5+Math.sin(t*.09)*.4,4.2,1.3,-.15,0,7);ctx.stroke();ctx.globalAlpha/=.85;}
    // ---- แขนหน้า + บ่าเกราะ ----
    cap(J.fs,J.fe.j,1.1,.95,su,sud);cap(J.fe.j,J.fe.end,1.05,.95,ar,ard);ell(hx,hy,1.1,1.1,ar,ard);
    ell(J.fs[0]+.2,J.fs[1]+.4,2.2,1.6,ar,ard,-.3);if(!T){ctx.fillStyle=ac;ctx.fillRect(J.fs[0]-.6,J.fs[1]+1.2,1.6,.6);}
    if(W!=='scythe')drawWeapon();
    // ---- อนุภาคประจำตัว (ถ่าน/เกล็ดน้ำแข็ง/ประกายดาว) ----
    if(!T)for(let i=0;i<7;i++){const u=((t*.012+i*.143)%1),px2=Math.sin(i*2.3+t*.03)*9,py2=-2-u*38;ctx.globalAlpha=Math.max(0,1-u)*.9;ctx.fillStyle=i%2?gl:acl;ctx.fillRect(px2,py2,i%3?.8:1.2,i%3?.8:1.2);}
    ctx.globalAlpha=1;
  }else if(kind==='void_witch'){
    // ภาพที่ 3: นิกซ์ แม่มดสุญญตา (หมวกแม่มด + วงแหวนทอง + ดวงตาสี่ดวง + หนวดเงาม่วง + ผ้าคลุมเทาขลิบทอง)
    const ch=C('#3e3c4c'),cd=C('#1a1824'),gd=C('#d4bd88'),pu=C('#a838ff'),pl=C('#efb4ff'),vd=C('#0b0710');
    const hb2=bob-3.2; // ลอยเหนือพื้น
    // ขาลอยปลายแหลมพันแถบทองดำ
    poly([[-2.8,-11+hb2],[-.4,-11+hb2],[-1.5,-1+hb2]],gd,cd);
    poly([[.4,-11+hb2],[2.8,-11+hb2],[1.5,-1+hb2]],gd,cd);
    if(!T){ctx.fillStyle=pu;ctx.fillRect(-2.1,-8+hb2,1.2,4);ctx.fillRect(.9,-8+hb2,1.2,4);}
    // หนวดเงาม่วงด้านหลังปลิวสะบัด
    for(let i=-1;i<=1;i++){const tw=Math.sin(G.t*.14+i*1.7)*1.8;
      poly([[i*3.4,-25+hb2],[i*5.8+tw,-20+hb2],[i*7.6+tw,-13+hb2],[i*5.2+tw,-14+hb2],[i*3.8,-22+hb2]],vd,pu);}
    // เสื้อคลุมยาวสีเทาขลิบทองลายจุดมืด
    poly([[-4.5,-24+hb2],[4.5,-24+hb2],[8.8,-5+hb2],[4.2,-2+hb2],[-4.2,-2+hb2],[-8.8,-5+hb2]],ch,cd);
    if(!T){ctx.strokeStyle=gd;ctx.lineWidth=lw*1.2;ctx.beginPath();ctx.moveTo(-4.4,-24+hb2);ctx.lineTo(-8.8,-5+hb2);ctx.lineTo(-4.2,-2+hb2);ctx.moveTo(4.4,-24+hb2);ctx.lineTo(8.8,-5+hb2);ctx.lineTo(4.2,-2+hb2);ctx.stroke();
      ctx.fillStyle=cd;ell(-4.5,-11+hb2,1.4,1.6,cd);ell(4.8,-12+hb2,1.5,1.7,cd);ell(0,-16+hb2,1.1,1.3,cd);}
    // คอปกเกราะสูงประดับลูกแก้วม่วง 3 ดวง
    poly([[-4.8,-24+hb2],[4.8,-24+hb2],[5.5,-20.5+hb2],[0,-19.5+hb2],[-5.5,-20.5+hb2]],C('#524f64'),cd);
    if(!T){for(const gx of[-3.3,0,3.3]){ell(gx,-22.2+hb2,1.25,1.25,pu,gd);ctx.fillStyle=pl;ctx.fillRect(gx-.4,-22.7+hb2,.7,.7);}}
    // ใบหน้าสีดำมืด + ดวงตาม่วง 4 ดวง (ใหญ่ 2 + เล็กบน 2)
    ell(.4+lean,-26.6+hb2,4.2,4.0,vd);
    if(!back&&!T){
      ctx.fillStyle=pu;ctx.fillRect(-1.1+lean,-26.6+hb2,1.5,1.1);ctx.fillRect(1.5+lean,-26.6+hb2,1.5,1.1);
      ctx.fillStyle=pl;ctx.fillRect(-.4+lean,-28.3+hb2,.9,.8);ctx.fillRect(1.3+lean,-28.3+hb2,.9,.8);
      ctx.fillStyle='#ffffff';ctx.fillRect(-.7+lean,-26.4+hb2,.6,.6);ctx.fillRect(1.9+lean,-26.4+hb2,.6,.6);
    }
    // หนวดเงาห้อยใต้ปีกหมวก
    for(const sx of[-5.8,5.8]){const tw=Math.cos(G.t*.15+sx)*1.2;poly([[sx,-29+hb2],[sx*1.35+tw,-23+hb2],[sx*1.15+tw,-18+hb2],[sx*.8,-23+hb2]],vd,pu);}
    // หมวกแม่มดปีกกว้าง + วงแหวนดาราศาสตร์สีทอง + ลูกแก้วม่วงกลางหมวก
    poly([[-11+lean,-29+hb2],[11+lean,-29+hb2],[6+lean,-31.5+hb2],[-6+lean,-31.5+hb2]],ch,cd);
    poly([[-5.4+lean,-31.2+hb2],[5.4+lean,-31.2+hb2],[1.4+lean,-40+hb2],[-3.2+wv*.4+lean,-42.5+hb2],[-2.6+lean,-37.5+hb2]],ch,cd);
    if(!T){ctx.strokeStyle=gd;ctx.lineWidth=lw*1.2;ctx.beginPath();ctx.moveTo(-11+lean,-29+hb2);ctx.lineTo(11+lean,-29+hb2);ctx.stroke();
      ctx.strokeStyle=gd;ctx.lineWidth=lw*1.3;ctx.beginPath();ctx.arc(.5+lean,-33.5+hb2,4.2,Math.PI,0);ctx.stroke();
      ctx.beginPath();ctx.moveTo(.5+lean,-39.5+hb2);ctx.lineTo(.5+lean,-32+hb2);ctx.stroke();
      ell(.5+lean,-33.2+hb2,1.8,1.8,pu,gd);ctx.fillStyle=pl;ctx.fillRect(lean,-33.8+hb2,.9,.9);}
    // ไม้เท้าหัวตะขอทอง + ลูกพลังหนวดเงาม่วงข้างตัว
    const cx=5.5+lean;
    cap([cx,-22+hb2],[cx,-1+hb2],.85,.85,gd,cd);
    if(!T){ctx.strokeStyle=gd;ctx.lineWidth=lw*1.8;ctx.beginPath();ctx.arc(cx-1.3,-22.5+hb2,1.8,Math.PI,0);ctx.stroke();}
    const ox=-6.8+lean,oy2=-16+hb2+wv*.6;
    ell(ox,oy2,2.4,2.4,pu,pl);if(!T){ctx.strokeStyle=vd;ctx.lineWidth=lw*1.4;ctx.beginPath();ctx.moveTo(ox-3,oy2-1);ctx.quadraticCurveTo(ox,oy2+3,ox+3,oy2-2);ctx.stroke();}
  }else if(kind==='skel_warrior'||kind==='skel_knight'||kind==='skel_overlord'){
    /* มอนและบอสโครงกระดูกหอคอยชั้น 3: 1) นักรบโครงกระดูกเกราะฟ้า (Warrior) 2) อัศวินโครงกระดูกเกราะดำไฟเขียว (Elite Knight) 3) จักรพรรดิโครงกระดูกเคียวเพลิงมรณะ (Skeleton Overlord Boss) */
    const isBoss=kind==='skel_overlord',isKnight=kind==='skel_knight';
    const scK=isBoss?1.24:isKnight?1.12:1.04;ctx.scale(scK,scK);
    const J=rigPoints(P),a=P.wa==null?(isBoss?-1.05:-.85):P.wa,hx=J.fe.end[0],hy=J.fe.end[1],t=G.t;
    const pal=isBoss?{bn:C('#c8b4a8'),bd:Dk('#c8b4a8',.5),ar:C('#2a1424'),ad:Dk('#2a1424',.5),ah:C('#8a2648'),gl:C('#ff9428'),gl2:C('#ffd866'),sk:C('#481224'),aur:'#7e2ae8'}
      :isKnight?{bn:C('#bcb8ac'),bd:Dk('#bcb8ac',.52),ar:C('#24292e'),ad:Dk('#24292e',.5),ah:C('#48545c'),gl:C('#5eff7a'),gl2:C('#ccffd6'),sk:C('#1a2822'),aur:'#5eff7a'}
      :{bn:C('#d8d4ca'),bd:Dk('#d8d4ca',.55),ar:C('#566270'),ad:Dk('#566270',.52),ah:C('#8fa4ba'),gl:C('#5ef0ff'),gl2:C('#d8fbff'),sk:C('#2e343e'),aur:null};
    // 1) ออร่าควันมืด/เปลวไฟด้านหลังสำหรับอัศวินและจอมทัพ
    if(!T&&pal.aur){
      ctx.globalAlpha*=.35;
      for(let i=0;i<(isBoss?5:3);i++){const ph=t*.08+i*1.3,wx=Math.sin(ph)*7-(isBoss?2:1),wy=-10-(i*5)+Math.cos(ph*1.2)*2;
        ell(wx,wy,isBoss?6.5:4.5,isBoss?4.2:2.8,pal.aur);}
      if(isBoss)for(let i=0;i<3;i++){const tw=Math.sin(t*.12+i)*1.8;poly([[J.sh[0]-2,J.sh[1]],[-9+tw,-2],[-12+tw*1.2,-12],[J.bs[0]-2,J.bs[1]]],Dk('#361248',.6),pal.ah);}
      ctx.globalAlpha/=.35;
    }
    // 2) ขาหลัง + แขนหลัง (กระดูก + สนับเกราะ)
    cap(J.bhp,J.bk.j,1.15,1.0,pal.bd,pal.ad);cap(J.bk.j,J.bk.end,1.25,1.05,pal.ar,pal.ad);ell(J.bk.end[0]+.6,J.bk.end[1]-.4,1.7,.85,pal.ad);
    cap(J.bs,J.be.j,.95,.85,pal.bd,pal.ad);cap(J.be.j,J.be.end,.95,.85,pal.ar,pal.ad);
    // 3) ผ้าคลุมเอวขาดริ้ว/เกราะสะโพกหนาม
    const Hp=J.hip,Sh=J.sh,fl=Math.sin(t*.11)*.9;
    poly([[Hp[0]-3.4,Hp[1]],[Hp[0]+3.4,Hp[1]],[Hp[0]+4.4+fl*.4,Hp[1]+8.5],[Hp[0]+1.8,Hp[1]+6],[Hp[0]-.2,Hp[1]+9],[Hp[0]-2.4,Hp[1]+6.2],[Hp[0]-4.6+fl,Hp[1]+8.5]],pal.sk,pal.ad);
    if(!T&&(isKnight||isBoss))poly([[Hp[0]-3.6,Hp[1]+.2],[Hp[0]+3.6,Hp[1]+.2],[Hp[0]+4.0,Hp[1]+3.5],[Hp[0]+1.4,Hp[1]+4.5],[Hp[0]-1.2,Hp[1]+4.5],[Hp[0]-3.8,Hp[1]+3.2]],pal.ar,pal.ah);
    // 4) โครงอก + ซี่โครงเรืองแสงธาตุประจำตัว (ฟ้า / เขียว / ไฟส้ม)
    poly([[Hp[0]-2.6,Hp[1]+.4],[Hp[0]+2.6,Hp[1]+.4],[Sh[0]+3.5,Sh[1]+.2],[Sh[0]-3.2,Sh[1]+.2]],pal.ar,pal.ad);
    if(!T){
      poly([[Hp[0]-1.8,Hp[1]],[Hp[0]+1.8,Hp[1]],[Sh[0]+2.2,Sh[1]+1.2],[Sh[0]-2.0,Sh[1]+1.2]],Dk(pal.gl,.45));
      ctx.fillStyle=pal.gl;for(const u2 of[.28,.5,.72]){const ry=Hp[1]+(Sh[1]-Hp[1])*u2,rx=Hp[0]+(Sh[0]-Hp[0])*u2;ctx.fillRect(rx-2.1,ry-.5,4.2,1.1);}
      ctx.fillStyle=pal.gl2;ctx.fillRect(Sh[0]-.8,Sh[1]+3,.6,4);
    }
    poly([[Sh[0]-3.4,Sh[1]+.4],[Sh[0]+3.6,Sh[1]+.4],[Sh[0]+2.6,Sh[1]+3.0],[Sh[0]-2.6,Sh[1]+3.0]],pal.ah,pal.ad);
    // 5) ขาหน้า + สนับแข้งมีหนาม
    cap(J.fhp,J.fk.j,1.2,1.0,pal.bn,pal.ad);cap(J.fk.j,J.fk.end,1.35,1.1,pal.ar,pal.ad);ell(J.fk.j[0]+.2,J.fk.j[1],1.2,1.1,pal.ah,pal.ad);ell(J.fk.end[0]+.8,J.fk.end[1]-.4,1.9,.9,pal.ar,pal.ad);
    // 6) หัวกะโหลก / หมวกหนาม / เขาจอมทัพ
    const H=[Sh[0]+.5,Sh[1]-4.2];
    cap([Sh[0],Sh[1]+.4],[H[0],H[1]+2.2],.85,.75,pal.bd);
    ell(H[0],H[1]-.4,3.4,3.4,pal.bn,pal.bd);
    poly([[H[0]-2.1,H[1]+1.5],[H[0]+2.3,H[1]+1.5],[H[0]+1.9,H[1]+3.6],[H[0]-1.7,H[1]+3.6]],pal.bn,pal.bd);   // กราม
    if(!T&&!back){
      ctx.fillStyle='#100c12';ctx.fillRect(H[0]+.1,H[1]-1.2,1.5,1.4);ctx.fillRect(H[0]+2.0,H[1]-1.2,1.4,1.4);
      ctx.fillStyle=pal.gl;ctx.fillRect(H[0]+.4,H[1]-.9,.95,.9);ctx.fillRect(H[0]+2.2,H[1]-.9,.9,.9);
      ctx.fillStyle='#18141a';ctx.fillRect(H[0]-.8,H[1]+2.2,2.6,.7);
    }
    if(isKnight||isBoss){
      // หมวกเหล็กมีหนาม/เขาสำหรับอัศวินชั้นยอดและจักรพรรดิโครงกระดูก
      poly([[H[0]-3.8,H[1]-.8],[H[0]-3.2,H[1]-4.4],[H[0]-1.4,H[1]-6.2],[H[0]+.2,H[1]-4.2],[H[0]+1.8,H[1]-6.4],[H[0]+3.6,H[1]-3.2],[H[0]+3.2,H[1]-1.2],[H[0]+.6,H[1]-2.2]],pal.ar,pal.ah);
      if(isBoss){poly([[H[0]-1.8,H[1]-4.2],[H[0]-4.6,H[1]-9.4],[H[0]-.4,H[1]-5.2]],pal.ah,pal.ad);poly([[H[0]+1.6,H[1]-4.2],[H[0]+4.4,H[1]-9.6],[H[0]+2.6,H[1]-4.6]],pal.ah,pal.ad);}
    }
    // 7) แขนหน้า + เกราะไหล่ + อาวุธประจำตัว (หมุนตาม P.wa ของท่าโจมตี)
    cap(J.fs,J.fe.j,1.0,.9,pal.bn,pal.ad);cap(J.fe.j,J.fe.end,1.15,1.0,pal.ar,pal.ad);ell(hx,hy,1.15,1.1,pal.ar,pal.ad);
    poly([[Sh[0]-1.2,Sh[1]+1.5],[Sh[0]+.8,Sh[1]-1.4],[Sh[0]+3.6,Sh[1]+.2],[Sh[0]+2.6,Sh[1]+2.4]],pal.ar,pal.ah);
    if(isKnight||isBoss)poly([[Sh[0]+.2,Sh[1]-1.2],[Sh[0]-1.4,Sh[1]-4.2],[Sh[0]+1.8,Sh[1]-2.0]],pal.ah,pal.ad);
    const ca=Math.cos(a),sa=Math.sin(a),pt=(l,o=0)=>[hx+ca*l-sa*o,hy+sa*l+ca*o];
    if(isBoss){
      // เคียวยักษ์จักรพรรดิโครงกระดูก (ม่วงแดง + เปลวพลังงาน)
      cap(pt(-10),pt(23),.6,.6,C('#3a1c2e'),pal.ad);
      const L=23;
      poly([pt(L-1,0),pt(L+2,-1.6),pt(L-3.5,-9.5),pt(L-11,-13),pt(L-5.5,-7.2),pt(L-1.5,-3)],C('#c8387a'),pal.ad);
      if(!T){poly([pt(L-.6,-1),pt(L-3.5,-8.2),pt(L-9.4,-11.6),pt(L-4.6,-6.8)],pal.gl);ctx.fillStyle=pal.gl2;ctx.fillRect(pt(L-9.8,-11.8)[0]-.6,pt(L-9.8,-11.8)[1]-.6,1.3,1.3);}
    }else if(isKnight){
      // ค้อนหนามอัศวินโครงกระดูก (หัวหนามเรืองแสงเขียว)
      cap(pt(-5),pt(14),.55,.55,pal.ar,pal.ad);
      const m0=pt(14.5);ell(m0[0],m0[1],2.8,2.8,pal.ar,pal.gl);
      if(!T){for(const ang2 of[0,1.57,3.14,4.71])ell(m0[0]+Math.cos(ang2)*2.9,m0[1]+Math.sin(ang2)*2.9,.8,.8,pal.gl);ell(m0[0],m0[1],1.1,1.1,pal.gl2);}
    }else{
      // ดาบยาวนักรบโครงกระดูก (อักขระฟ้าเรืองแสง)
      cap(pt(-4),pt(1.5),.5,.5,pal.ar,pal.ad);
      poly([pt(1,-1.5),pt(2,-1.5),pt(2,1.5),pt(1,1.5)],pal.ah,pal.ad);
      poly([pt(2,-1.1),pt(14,-1.0),pt(17.5,0),pt(14,1.0),pt(2,1.1)],C('#a8b8c8'),pal.ad);
      if(!T){ctx.strokeStyle=pal.gl;ctx.lineWidth=lw*1.2;ctx.beginPath();ctx.moveTo(...pt(2.5,0));ctx.lineTo(...pt(14.5,0));ctx.stroke();}
    }
  }
  ctx.setTransform(1,0,0,1,0,0);return true;
}
function drawChibi(ctx,ox,oy,px,dir,P,K,tint){
  if(K&&K.custom&&drawCustomChibi(ctx,ox,oy,px,dir,P,K,tint,null)){ctx.setTransform(1,0,0,1,0,0);return;}
  const J=rigPoints(P);
  {const W2=K.weapon&&WEAPONS[K.weapon];if(W2&&W2.twoHand&&!K.sheathe){const h=J.fe.end,a=P.wa||0;J.be=ik(J.bs,[h[0]-Math.cos(a)*3.5,h[1]-Math.sin(a)*3.5],5.5,5.5,0);}}
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
  const OF=K.outfit&&!T;   // ชุดละเอียดของผู้เล่น (สายรัดบูท หัวเหล็ก สายคาดอก สนับแขน เกราะไหล่ ผ้าคลุมเอว ดาบสะพายหลัง)
  const WpS=K.sheathe&&K.weapon&&WEAPONS[K.weapon]&&(WEAPONS[K.weapon].len||WEAPONS[K.weapon].shape)?WEAPONS[K.weapon]:null;
  if(K.sheathe&&K.outfit){
    const bCol=C(K.bladeCol||'#eef2f8'),bEdge=C(K.bladeEdge||'#ffffff'),bBev=C(K.bladeBevel||'#8c96a8'),bOut=C('#222634');
    if(P.run){
      // ท่าวิ่ง: ใบดาบสีขาวเงินพาดเฉียงตามแผ่นหลังอย่างสมดุล ไม่ยื่นไปด้านหลังมากเกินไป
      const sx0=J.sh[0]-1.2,sy0=J.sh[1]-.2,ex0=J.hip[0]-6.4,ey0=J.hip[1]+7.8;
      poly([[sx0,sy0-1.1],[sx0+1.4,sy0+.4],[ex0+1.6,ey0+.4],[ex0-.7,ey0+.9],[ex0+.3,ey0-1.5]],bCol,bOut);
      if(!T){
        ctx.strokeStyle=bEdge;ctx.lineWidth=lw*1.3;ctx.beginPath();ctx.moveTo(sx0+.2,sy0-.7);ctx.lineTo(ex0+.2,ey0-.7);ctx.stroke();
        ctx.strokeStyle=bBev;ctx.lineWidth=lw*1.1;ctx.beginPath();ctx.moveTo(sx0-.4,sy0+.4);ctx.lineTo(ex0-.9,ey0+.5);ctx.stroke();
      }
    }else if(dir>0){
      // ท่ายืนหันขวา (Image 1): เห็นด้ามดาบพันผ้าสีเข้มและหัวด้ามเพชรชี้เฉียงขึ้นด้านหลัง + กลไกล็อกฝังมณีสีเขียวมรกตและจุดแดง
      const hx=J.sh[0]-2.4,hy=J.sh[1]+.6;
      poly([[hx-.6,hy+.6],[hx-5.0,hy-4.2],[hx-3.9,hy-5.2],[hx+.5,hy-.4]],C('#343842'),bOut);
      if(!T){
        ctx.fillStyle='#dce2ec';
        for(const t2 of[.28,.55,.82])ctx.fillRect(hx-4.6*t2-.4,hy-4.2*t2-.4,.9,.9);
      }
      poly([[hx-4.8,hy-4.4],[hx-6.2,hy-5.9],[hx-4.5,hy-6.2],[hx-4.0,hy-4.8]],bCol,bOut);
      // กลไกล็อกฝักดาบด้านหลัง ประดับมณีมรกต (#48ff98) และหมุดแดง (#ff3838)
      const cx0=J.sh[0]-4.1,cy0=J.sh[1]+3.3;
      poly([[cx0-1.6,cy0-2.3],[cx0+1.5,cy0-1.8],[cx0+1.5,cy0+2.5],[cx0-1.6,cy0+2.0]],C(K.backClamp||'#5a626e'),bOut);
      if(!T){
        ctx.fillStyle=K.backNodes||'#ff3838';ctx.fillRect(cx0-1.3,cy0-1.7,.9,.9);ctx.fillRect(cx0-1.3,cy0+.8,.9,.9);
        ctx.fillStyle=K.backGem||'#48ff98';ctx.fillRect(cx0-.6,cy0-.5,1.2,1.3);
      }
    }else{
      // ท่ายืนหันซ้าย (Image 2): เห็นคมใบดาบสีขาวเงินโผล่ด้านหลังแขนซ้าย และปลายดาบโผล่พ้นชายเสื้อคลุมเอวด้านล่างหลัง
      poly([[J.sh[0]-2.2,J.sh[1]+2.6],[J.sh[0]-3.9,J.sh[1]+3.8],[J.hip[0]-5.4,J.hip[1]+8.4],[J.hip[0]-3.4,J.hip[1]+7.8]],bCol,bOut);
      if(!T){ctx.strokeStyle=bEdge;ctx.lineWidth=lw*1.2;ctx.beginPath();ctx.moveTo(J.sh[0]-3.5,J.sh[1]+3.6);ctx.lineTo(J.hip[0]-5.0,J.hip[1]+8.1);ctx.stroke();}
    }
  }else if(WpS){const bU=(cx,cy,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(cx-w/2,cy-h/2,w,h);},sU=(a,b,w,col)=>{const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.max(1,Math.ceil(Math.hypot(dx,dy)*2.4));for(let k=0;k<=n;k++)bU(a[0]+dx*k/n,a[1]+dy*k/n,w,w,col);};
    drawWeaponShape(WpS,[J.sh[0]-1.2,J.sh[1]-1.6],Math.PI/2+.78,0,false,C,sU,bU,tint,K);}   // NPC ในเมือง: อาวุธสะพายหลัง
  // ---- แขน/ขาหลัง ----
  const limbB=(a,j,e,r1,r2,r3,col)=>{cap(a,j,r1,r2,col,Dk(col,.6));cap(j,e,r2,r3,col,Dk(col,.6));};
  const armSkinB=K.outfit&&!K.robe&&!K.sleeve?Dk(K.skin,.75):Dk(K.sleeve||K.body,.72);
  limbB(J.bs,J.be.j,J.be.end,1.25,1.05,.95,armSkinB);cap(J.be.j,J.be.end,1.05,.95,Dk(K.bracer||K.gloves||K.skin,.72));ell(J.be.end[0],J.be.end[1],1.3,1.3,Dk(K.skin,.72));
  const boot=(e,col)=>{const th=OF?4.8:(K.arch==='elf_knight'||K.arch==='sash'?5.2:3.4);
    poly([ad(e,-1.5,-th),ad(e,1.3,-th),ad(e,1.5,-1.7),ad(e,3.3,-1.1),ad(e,3.6,.4),ad(e,-1.7,.4)],col,Dk(col,.55));
    if(K.cuffCol&&!T){poly([ad(e,-1.9,-th-.7),ad(e,1.7,-th-.7),ad(e,1.6,-th+1.1),ad(e,-1.8,-th+1.1)],C(K.cuffCol),Dk(K.cuffCol,.55));}
    if(OF){ctx.fillStyle=K.bootStraps;for(const sy of[-4.2,-3,-1.8])ctx.fillRect(e[0]-1.4,e[1]+sy,2.8,.62);poly([ad(e,1.4,-1.3),ad(e,3.3,-1.1),ad(e,3.6,.4),ad(e,1.2,.4)],K.toeCap,shade(K.toeCap,.55));}
    if(!T){ctx.fillStyle=shade(col,.5);ctx.fillRect(e[0]-1.7,e[1]-.15,5.3,.55);ctx.fillStyle=shade(col,1.35);ctx.fillRect(e[0]-1.2,e[1]-3.3,2.2,.45);}};
  const leg=(hipP,kn,ft,col,bc,front)=>{cap(hipP,kn,1.75,1.45,col,Dk(col,.6));if(OF&&front)ell((hipP[0]+kn[0])/2+.5,(hipP[1]+kn[1])/2,.9,1.55,K.knee);cap(kn,ad(ft,0,-1.8),1.45,1.15,col,Dk(col,.6));boot(ft,bc);};
  leg(J.bhp,J.bk.j,J.bk.end,Dk(K.pants,.74),Dk(K.boots,.74));
  const cw=P.run?(-1.8+Math.sin((P.ph||0)*2)*.45):(wv*.18-(P.lean||0)*1.2);
  if(OF&&!K.robe){
    if(P.run){
      // ท่าวิ่ง: ชายผ้าคลุมเอวสีแดง 2 แฉกด้านหลังปลิวสะบัดพอดีกับลำตัวที่ตั้งตรงขึ้น
      const H=J.hip,fl=Math.sin((P.ph||0)*2)*.45;
      poly([[H[0]-1.8,H[1]+.6],[H[0]-7.6+fl,H[1]+1.2],[H[0]-5.8+fl,H[1]+3.5],[H[0]-2.0,H[1]+3.0]],shade(K.coat,.88),shade(K.coat,.48));
      poly([[H[0]-6.4+fl,H[1]+1.1],[H[0]-8.2+fl,H[1]+.8],[H[0]-6.8+fl,H[1]+2.6]],K.hemTrim,shade(K.hemTrim,.55));
      poly([[H[0]-2.0,H[1]+2.4],[H[0]-7.2-fl*.5,H[1]+4.8],[H[0]-5.0-fl*.5,H[1]+6.4],[H[0]-2.0,H[1]+5.0]],shade(K.coat,.68),shade(K.coat,.42));
      poly([[H[0]-6.0-fl*.5,H[1]+4.7],[H[0]-7.8-fl*.5,H[1]+4.5],[H[0]-5.8-fl*.5,H[1]+6.0]],K.hemTrim,shade(K.hemTrim,.55));
    }else{
      poly([tp(.05,-.8),tp(.05,-3),[J.hip[0]-5.8+cw,J.hip[1]+6.2],[J.hip[0]-2.0+cw*.5,J.hip[1]+8],tp(-.1,.5)],shade(K.coat,.6),shade(K.coat,.45));
    }
  }
  leg(J.fhp,J.fk.j,J.fk.end,C(K.pants),C(K.boots),1);
  // ---- ลำตัว ----
  const bw=F?[3.1,2.05,3.2,2.45]:[2.9,2.7,3.3,2.7],bc=C(K.body),bd=Dk(K.body,.6);
  poly([tp(-.05,bw[0]),tp(.38,bw[1]),tp(.66,F?bw[2]+2.0:bw[2]),tp(.78,F?bw[2]+1.8:bw[2]),tp(1.02,bw[3]),tp(1.08,0),tp(1.02,-bw[3]),tp(.72,-bw[2]),tp(.38,-bw[1]),tp(-.05,-bw[0])],bc,bd);
  if(!T){if(F){const bcol=K.arch==='knight'&&K.plateCol?C(K.plateCol):K.plate?shade(K.body,1.18):bc,q=tp(.68,2.95),qb=tp(.57,2.85),qh=tp(.75,3.1);
      ell(q[0],q[1],1.85,1.55,bcol,Dk(bcol,.58),Math.atan2(v[1],v[0]));
      ell(qb[0],qb[1],1.6,.55,shade(bcol,.62),null,Math.atan2(v[1],v[0]));
      ell(qh[0],qh[1],1.1,.42,shade(bcol,1.32),null,Math.atan2(v[1],v[0]));}
    const q=tp(.78,.9);ell(q[0],q[1],1.1,1.8,shade(K.body,1.22),null,Math.atan2(u[1],u[0]));}
  // ชายเสื้อ/เสื้อคลุม
  if(K.robe){const fy=Math.max(J.fk.end[1],J.bk.end[1])-1.2;poly([tp(.15,3.1),[J.hip[0]+5.6,fy],[J.hip[0]+2,fy+.6+wv*.3],[J.hip[0]-2,fy+.4],[J.hip[0]-5.4,fy-.2],tp(.15,-3.1)],C(K.robe),Dk(K.robe,.6));
    if(!T){ctx.fillStyle=K.trim||shade(K.robe,1.4);ctx.fillRect(J.hip[0]-5.2,fy-1,10.6,.7);ctx.fillStyle=shade(K.robe,.75);ctx.fillRect(J.hip[0]+.2,J.hip[1]+1,.5,fy-J.hip[1]-1.5);}}
  else if(OF){
    const H=J.hip;
    if(P.run){
      // ท่าวิ่ง: ผ้าคลุมเอวแผ่นหลักโค้งพริ้วไปด้านหลังอย่างสมดุล
      const fl=Math.sin((P.ph||0)*2)*.35;
      poly([tp(.05,1.8),tp(.05,-2.4),[H[0]-5.8+fl,H[1]+5.8],[H[0]-1.8+fl,H[1]+8.4],[H[0]+.8,H[1]+6.6],[H[0]+1.8,H[1]+4.2]],K.coat,shade(K.coat,.55));
      poly([tp(0,-.2),tp(0,-1.2),[H[0]-3.6+fl,H[1]+7.0],[H[0]-2.0+fl,H[1]+7.9]],shade(K.coat,.62));
      poly([tp(0,.9),tp(0,.1),[H[0]-1.2+fl,H[1]+7.6],[H[0]+.2,H[1]+6.5]],shade(K.coat,1.22));
      poly([[H[0]-5.8+fl,H[1]+5.6],[H[0]-1.8+fl,H[1]+8.4],[H[0]+.8,H[1]+6.6],[H[0]+.5,H[1]+5.2],[H[0]-1.7+fl,H[1]+6.8],[H[0]-5.0+fl,H[1]+4.5]],K.hemTrim,shade(K.hemTrim,.52));
      ctx.fillStyle=K.hemStuds;
      for(let k=0;k<4;k++){const u2=(k+.35)/4;ctx.fillRect(H[0]-4.8+fl+u2*4.8-.4,H[1]+5.4+Math.sin(u2*Math.PI)*1.5-.4,.8,.8);}
    }else{
      // ท่ายืนซ้าย/ขวา (Images 1 & 2): ผ้าคลุมเอวทิ้งตัวสวยคลุมสะโพก ขลิบขอบเงินตอกหมุด
      poly([tp(.04,2.5),tp(.04,-2.5),[H[0]-5.0+cw,H[1]+6.4],[H[0]-.9+cw*.5,H[1]+8.2],[H[0]+1.6,H[1]+6.6],[H[0]+3.5,H[1]+5.6]],K.coat,shade(K.coat,.58));
      poly([tp(0,-.4),tp(0,-1.4),[H[0]-3.0+cw*.6,H[1]+7.4],[H[0]-1.6+cw*.5,H[1]+7.9]],shade(K.coat,.6));
      poly([[H[0]-5.0+cw,H[1]+6.1],[H[0]-.9+cw*.5,H[1]+8.2],[H[0]+1.6,H[1]+6.6],[H[0]+1.3,H[1]+5.3],[H[0]-.9+cw*.5,H[1]+6.7],[H[0]-4.3+cw,H[1]+4.9]],K.hemTrim,shade(K.hemTrim,.55));
      ctx.fillStyle=K.hemStuds;for(let k=0;k<4;k++){const u2=(k+.4)/4;ctx.fillRect(H[0]-4.1+cw*(1-u2)+u2*5.0-.4,H[1]+5.9+Math.sin(u2*Math.PI)*1.3-.4,.8,.8);}
    }
  }
  else if(K.arch==='furcoat'){
    const H=J.hip,co=C(K.coatCol||'#ba241d'),cd=Dk(K.coatCol||'#ba241d',.58);
    if(K.shoulderFur&&!T){const fc=C(K.furCol||'#eef3f8'),fd=Dk(K.furCol||'#eef3f8',.68),S0=J.sh;
      poly([[S0[0]-1,S0[1]-1],[S0[0]-6.5,S0[1]+1.5],[S0[0]-7.8+wv*.4,S0[1]+10],[S0[0]-4.2+wv*.3,S0[1]+12],[S0[0]-1.2,S0[1]+6]],fc,fd);}
    poly([tp(.1,2.6),tp(.1,-2.2),[H[0]-6.4+cw,H[1]+8.4],[H[0]-1.8+cw*.4,H[1]+9.8],[H[0]+4.2,H[1]+8.4],[H[0]+2.6,H[1]+1.5]],co,cd);
    if(!T){poly([[H[0]-3.6+cw*.5,H[1]+8.8],[H[0]-2.0+cw*.4,H[1]+9.4],[H[0]-1.4,H[1]+1.8]],Dk(co,.75));
      if(K.coatTrim){ctx.strokeStyle=C(K.coatTrim);ctx.lineWidth=lw*1.4;ctx.beginPath();ctx.moveTo(...tp(.85,2.4));ctx.lineTo(H[0]+4.0,H[1]+8.2);ctx.lineTo(H[0]-6.0+cw,H[1]+8.2);ctx.stroke();}
      ctx.fillStyle=cd;ctx.fillRect(H[0]+.8,H[1]+3.5,2.4,2.4);
      if(K.furCol&&!K.shoulderFur)poly([tp(.88,3.2),tp(1.06,1.2),tp(1.06,-2.4),tp(.84,-3.2),tp(.72,0)],C(K.furCol),Dk(K.furCol,.62));}
  }else if(K.arch==='sash'){
    const H=J.hip,sc=C(K.sashCol||'#c83424'),sd2=Dk(K.sashCol||'#c83424',.58);
    poly([tp(.12,bw[0]+.1),tp(-.26,bw[0]+.8),tp(-.22,-bw[0]-.8),tp(.12,-bw[0]-.1)],Dk(K.body,.86),bd);
    if(!T){poly([tp(.96,-1.4),tp(1.02,-2.4),tp(.12,2.4),tp(.18,1.3)],sc,sd2);
      poly([[H[0]+.8,H[1]+.6],[H[0]+2.2,H[1]+.6],[H[0]+2.5,H[1]+7.6],[H[0]+1.1,H[1]+7.6]],sc,sd2);
      ctx.fillStyle='#f0a838';ctx.fillRect(H[0]+1.2,H[1]+1.6,1.0,5.2);
      poly([[H[0]-2.4,H[1]+.8],[H[0]-6.2+cw,H[1]+5.2],[H[0]-4.6+cw,H[1]+6.4],[H[0]-1.6,H[1]+2.2]],sd2,Dk(sc,.45));}
  }else if(K.arch==='elf_knight'){
    const H=J.hip,co=C(K.coatCol||'#522428'),oc=C(K.obiCol||'#1b6a6c');
    poly([tp(.02,2.6),tp(.02,-2.6),[H[0]-5.2+cw,H[1]+7.4],[H[0]-1.2,H[1]+8.4],[H[0]+1.2,H[1]+4.2]],co,Dk(co,.55));
    poly([tp(.04,bw[0]+.3),tp(.36,bw[1]+.5),tp(.36,-bw[1]-.5),tp(.04,-bw[0]-.3)],oc,Dk(oc,.55));
  }else if(K.arch==='elf_cleric'){
    const H=J.hip,co=C(K.coatCol||'#10767e'),cd=Dk(K.coatCol||'#10767e',.56);
    poly([tp(.08,1.8),tp(.08,-2.8),[H[0]-5.8+cw,H[1]+10.2],[H[0]-1.4+cw*.4,H[1]+11.2],[H[0]+1.8,H[1]+9.2],[H[0]+2.4,H[1]+1.4]],co,cd);
    if(!T){ctx.fillStyle=Dk(co,1.35);ctx.fillRect(H[0]+1.1,H[1]+2,1.1,6.5);}
  }else if(K.arch==='knight'){
    const H=J.hip,co=C(K.coatCol||'#6a788c'),pl=C(K.plateCol||'#b8c4d4');
    poly([tp(.1,2.6),tp(.1,-2.6),[H[0]-5.2+cw,H[1]+6.6],[H[0]-1.0,H[1]+7.2],[H[0]+3.8,H[1]+5.2]],co,Dk(co,.55));
    poly([tp(.36,2.8),tp(.94,3.0),tp(.98,0),tp(.94,-1.4),tp(.36,-1.2)],pl,Dk(pl,.55));
    if(!T){ctx.fillStyle='rgba(255,255,255,.6)';ctx.fillRect(tp(.75,1.8)[0]-.5,tp(.75,1.8)[1]-1,.8,2.6);}
  }else if(K.arch==='mage_dress'){
    const H=J.hip,co=C(K.coatCol||'#3a78c8'),cd=Dk(co,.56);
    poly([tp(.12,2.8),tp(.12,-2.6),[H[0]-6.4+cw,H[1]+8.4],[H[0]-2.8+cw*.5,H[1]+9.8],[H[0]+3.6,H[1]+4.2]],co,cd);
    poly([tp(.08,3.2),[H[0]+4.2,H[1]+4.2],[H[0]-1.5,H[1]+4.6],tp(.08,-2.6)],bc,bd);
    if(!T){ctx.fillStyle='#f2d070';ctx.fillRect(H[0]-1.2,H[1]+2.2,3.4,.8);}
  }else poly([tp(.12,bw[0]+.1),tp(-.32,bw[0]+1.2),tp(-.4,1.2),tp(-.28,0),tp(-.4,-1.4),tp(-.32,-bw[0]-1),tp(.12,-bw[0]-.1)],Dk(K.body,.86),bd);
  // เข็มขัด เกราะอก
  if(OF){poly([tp(.96,2.4),tp(1.08,.8),tp(.82,.6),tp(.78,2.6)],K.lapel,shade(K.lapel,.55));for(const t2 of[.52,.74]){poly([tp(t2,-1.8),tp(t2,3.1),tp(t2+.1,3.1),tp(t2+.1,-1.8)],K.chestStraps);const q=tp(t2+.05,1.8);ctx.fillStyle=K.strapBuckle;ctx.fillRect(q[0]-.55,q[1]-.42,1.1,.84);}}   // ปกเสื้อ + สายหนังคาดอก 2 เส้น
  if(!T){const bl=K.belt||K.trim;if(bl){poly([tp(.05,bw[0]+.15),tp(.19,bw[1]+.4),tp(.19,-bw[1]-.4),tp(.05,-bw[0]-.15)],bl,shade(bl,.55));const q=tp(.12,1.3);ctx.fillStyle='#e8c060';ctx.fillRect(q[0]-.5,q[1]-.55,1.1,1.1);}
    if(K.plate){poly([tp(.36,2.7),tp(.92,2.9),tp(.98,0),tp(.92,-1.2),tp(.36,-1)],shade(K.body,1.3),shade(K.body,.6));const a=tp(.85,1.6),b=tp(.5,2.2);ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=lw*1.2;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
    if(K.scales)for(const t2 of[.32,.5,.68])for(const s2 of[-1.4,.4,2.1]){const q=tp(t2,s2);ell(q[0],q[1],.8,.5,K.scales,shade(K.scales,.6));}
    if(K.glowTrim&&G.t%30<20){const q=tp(.78,.9);ell(q[0],q[1],.6,1.5,'#ffb03a');}
    if(F){const bcol=K.arch==='knight'?C(K.plateCol||K.armor||K.body):K.plate?shade(K.body,1.2):bc,b2=tp(.69,3.2),bs=tp(.57,3.0),bh=tp(.76,3.35);
      ell(b2[0],b2[1],1.8,1.55,bcol,Dk(bcol,.58),Math.atan2(v[1],v[0]));
      ell(bs[0],bs[1],1.6,.52,shade(bcol,.58),null,Math.atan2(v[1],v[0]));
      ell(bh[0],bh[1],1.15,.4,shade(bcol,1.28),null,Math.atan2(v[1],v[0]));}
    const nk=tp(1.02,0);if(K.scarf)ell(nk[0]+.4,nk[1]+.2,2.6,1.3,K.scarf,shade(K.scarf,.6));else if(K.trim)poly([tp(.98,2.4),tp(1.1,1),tp(1.1,-1),tp(.98,-2.4),tp(.92,0)],K.trim,shade(K.trim,.6));
    if(K.neck){ctx.fillStyle='#d8b050';ctx.fillRect(nk[0]-.3,nk[1]+.6,2.8,.4);ell(nk[0]+1.6,nk[1]+1.9,.75,.85,K.neck,'#6a4a20');}}
  // ---- หัว ----
  cap(ad(J.sh,0,0),ad(Hc,0,3),1.05,1.05,skd);   // คอ
  const notBald=!helm&&hs!=='bald'&&hs!=='mohawk';
  if(notBald){ell(Hc[0]-1.2,Hc[1]-.9,5.3,5.1,hc,hcd);if(hs==='bob'||hs==='hime')poly([hp(-6.2,-1),hp(-1,0),hp(-.6,4.6),hp(-5.6,4.4)],hc,hcd);}
  ell(Hc[0],Hc[1],4.5,4.6,skin,skd);poly([hp(-2,2),hp(4.4,1),hp(3.4,4.2),hp(1.4,5.1),hp(-1.6,4.4)],skin);
  if(!T){ctx.strokeStyle=skd;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(...hp(4.4,1));ctx.lineTo(...hp(3.4,4.2));ctx.lineTo(...hp(1.4,5.1));ctx.stroke();}
  if(notBald)poly([hp(-5.6,-2.6),hp(-1.8,-4.8),hp(-.9,-1.4),hp(-1.1,1.8),hp(-2.4,3.8),hp(-4.8,3.6),hp(-6,.6)],hc,hcd);   // ผมด้านหลังศีรษะ (มุมสามส่วนสี่)
  if(!T&&!helm){if(K.elfEars)poly([hp(-1.4,.9),hp(-6.0,-.4),hp(-2.0,2.2)],skin,skd);else ell(Hc[0]-1.25,Hc[1]+1.3,.62,.95,shade(K.skin,.9),skd);}   // หู (ปกติ หรือ หูเอลฟ์แหลม)
  // ใบหน้า
  if(!T&&!helm){const ec=K.eyec&&K.eyec!=='#1a1020'?K.eyec:'#3a5a9a',E1=hp(1.9,.9),E2=hp(4.05,.9);
    ell(E1[0],E1[1],.78,1.2,'#1a1020');ell(E1[0]+.05,E1[1]+.3,.55,.78,ec);ell(E1[0]+.05,E1[1]+.65,.4,.35,shade(ec,1.6));ctx.fillStyle='#fff';ctx.fillRect(E1[0]-.45,E1[1]-.75,.5,.5);
    ell(E2[0],E2[1],.42,1.05,'#1a1020');ell(E2[0]+.05,E2[1]+.3,.28,.65,ec);ctx.fillStyle='#fff';ctx.fillRect(E2[0]-.25,E2[1]-.6,.35,.35);
    ctx.fillStyle='#1a1020';ctx.fillRect(E1[0]-1,E1[1]-1.45,2,.5);ctx.fillRect(E2[0]-.5,E2[1]-1.35,1,.45);if(F){ctx.fillRect(E1[0]-1.35,E1[1]-1.65,.6,.45);}
    ctx.fillStyle=F?'#c05a6a':'#9a5a52';ctx.fillRect(Hc[0]+3,Hc[1]+3.1,.9,.4);ctx.fillStyle='rgba(255,110,110,.35)';ctx.fillRect(Hc[0]+.9,Hc[1]+2.1,1.4,.5);
    if(K.eyepatch){ctx.strokeStyle='#1c1e26';ctx.lineWidth=lw*1.2;ctx.beginPath();ctx.moveTo(...hp(-3.4,-.6));ctx.lineTo(...hp(4.3,1.3));ctx.stroke();ell(E1[0],E1[1],1.35,1.45,'#181a24','#0c0d12');ctx.fillStyle='#2a2e3c';ctx.fillRect(E1[0]-.5,E1[1]-.7,.9,.4);}
    if(K.beard){const bc=C(K.beard),bd2=Dk(K.beard,.62);poly([hp(-.4,2.8),hp(4.2,2.4),hp(4.3,4.8),hp(2.2,6.4),hp(-.4,5.0),hp(-1.1,3.6)],bc,bd2);poly([hp(.9,2.4),hp(4.6,2.2),hp(4.9,3.3),hp(2.8,3.6),hp(.8,3.3)],shade(K.beard,1.12),bd2);}
    if(K.mask)poly([hp(.6,2),hp(4.6,1.6),hp(3.6,4.4),hp(1.2,5.2),hp(-.6,3.8)],'#1a1a24','#000');}
  // ผมหน้า + ปลายผมแหลม + ปอยผมโค้ง Ahoge ด้านบน (ตามภาพที่ 1, 2, 3)
  if(!helm&&hs!=='bald'){
    if(hs==='mohawk'){for(let k=0;k<5;k++){const b=hp(-3.6+k*1.6,-4);poly([ad(b,-.9,.6),ad(b,-.2-k*.2,-2.6-(k===2?1.2:k%2?.8:0)),ad(b,.9,.6)],hc,hcd);}}
    else{const spk=hs==='spiky'?[[-150,P.run?5.2:4.6],[-125,P.run?5.1:4.8],[-100,4.4],[-75,3.8],[-170,P.run?4.5:3.6],[-200,P.run?3.8:3]]:hs==='curly'?[]:hs==='short'||hs==='sidebang'?[[-140,2.6],[-110,2.4],[-165,2.2]]:[[-150,1.6],[-115,1.4]];
      const cr=hp(-1.2,-1.6);for(const[a,l]of spk){const r=a*Math.PI/180,b=[cr[0]+Math.cos(r)*3.6,cr[1]+Math.sin(r)*3.6],tip=[cr[0]+Math.cos(r)*(3.6+l),cr[1]+Math.sin(r)*(3.6+l)+(a<-160?wv*.3:0)],n=[-Math.sin(r)*1.5,Math.cos(r)*1.5];
        poly([ad(b,n[0],n[1]),tip,ad(b,-n[0],-n[1])],hc,hcd);}
      // ปอยผมโค้งด้านบน (Curved Ahoge ตามภาพที่ 1, 2, 3)
      if(hs==='spiky'||hs==='short'||K.ahoge)poly([hp(.2,-5.1),hp(2.6,-6.8),hp(4.4,-5.4),hp(2.5,-5.0),hp(1.0,-4.2)],hcl,hcd);
      if(hs==='curly')for(let k=0;k<9;k++){const a=Math.PI*(1.0+k/8*1.05),q=[Hc[0]-1+Math.cos(a)*5,Hc[1]-1+Math.sin(a)*4.8];ell(q[0],q[1],1.5,1.4,k%2?hc:hcd,hcd);}
      if(hs==='bun'){const q=hp(-2.2,-6);ell(q[0],q[1],2.2,1.9,hc,hcd);}
      // หน้าม้า: ปอยแหลมห้อยลงมาถึงระดับตา
      const fr=hs==='hime'?[[-4.6,-1.4],[-1,-1.4],[1.4,-1.5],[3.6,-1.4],[4.8,-1.6]]:[[-4.6,-.6],[-2,-2.4],[0,-1.2],[1.3,-2.6],[2.9,-.9],[3.9,-2.5],[4.9,-1.2]];
      const bang=[hp(-4.8,-3.4),hp(-2,-5.4),hp(2.5,-5.4),hp(5,-3.4)];for(const[fx,fy]of fr)bang.push(hp(fx,fy));
      poly([bang[0],bang[1],bang[2],bang[3],...bang.slice(4).reverse()],hc,hcd);
      poly([hp(-.4,-2.2),hp(.8,-2),hp(.4,3.4),hp(-.5,3.8),hp(-.9,1.0)],hc,hcd);   // ปอยจอนข้างแก้มหน้าใบหู
      if(hs==='sidebang')poly([hp(1.2,-3.4),hp(4.6,-3.2),hp(3.6,1.6),hp(2.4,.4)],hc,hcd);
      if(!T){ell(Hc[0]-.6,Hc[1]-3.3,3.2,1.4,hcl);ctx.strokeStyle=hcl;ctx.lineWidth=lw*1.3;ctx.beginPath();ctx.moveTo(...hp(-3.4,-4.2));ctx.quadraticCurveTo(...hp(-1,-5.2),...hp(1.4,-4.6));ctx.stroke();
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
    else if(K.head==='cowl'){poly([hp(-5.4,1.8),hp(-5.5,-3.6),hp(-1.8,-6.2),hp(3.2,-5.6),hp(5.2,-2.4),hp(1.8,-2.2),hp(-1.4,-.6),hp(-1.6,2.8),hp(-4.4,3.2)],hc1,Dk(K.hc,.58));poly([hp(-5.2,.8),hp(-8.2,1.6+wv*.7),hp(-7.2,3.2+wv*.6),hp(-4.6,2.4)],hc2,Dk(K.hc2||K.hc,.55));if(!T){ctx.fillStyle=hc2;ctx.fillRect(Hc[0]-4.6,Hc[1]-4.2,1.4,1.4);}}
    else if(K.head==='horns'){for(const sd of[-1,1])poly([hp(sd*1.6-.6,-4.2),hp(sd*3.6-.6,-10),hp(sd*2.6+.6,-3.8)],sd>0?hc1:Dk(K.hc,.75),Dk(K.hc,.55));}
    else if(K.head==='cap'){poly([hp(-5,-1.6),hp(-4.4,-5),hp(0,-6.6),hp(4.2,-4.8),hp(4.6,-2.4)],hc1,Dk(K.hc,.6));poly([hp(3,-2.6),hp(7.4,-2),hp(7.2,-1.2),hp(3.2,-1.6)],hc2,Dk(K.hc2||K.hc,.6));}
    else if(K.head==='wizard'){poly([hp(-7,-2.2),hp(7,-2.8),hp(6,-1.6),hp(-6.4,-1.2)],hc1,Dk(K.hc,.6));poly([hp(-4,-2.4),hp(4,-2.6),hp(0,-8),hp(-4.2+wv*.4,-12),hp(-6.4+wv*.6,-11.4),hp(-3,-8)],hc1,Dk(K.hc,.6));if(!T){ctx.fillStyle=hc2;ctx.fillRect(Hc[0]-3.8,Hc[1]-3.6,7.6,.8);}}
    else if(K.head==='halo'){ctx.strokeStyle=hc1;ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(Hc[0],Hc[1]-7.4+Math.sin(G.t*.1)*.5,4,1.1,0,0,7);ctx.stroke();}
    else if(K.head==='crown'){poly([hp(-3.6,-4.4),hp(-3.8,-7.4),hp(-2,-5.8),hp(0,-8),hp(2,-5.8),hp(3.6,-7.4),hp(3.4,-4.4)],hc1,Dk(K.hc,.55));if(!T){ctx.fillStyle=hc2;ctx.fillRect(Hc[0]-.5,Hc[1]-5.6,1,1);}}}
  // ---- แขนหน้า + สนับแขน Bracers + เกราะไหล่ไม่สมมาตร + อาวุธ ----
  if(OF&&!K.robe&&!K.sleeve){
    // ต้นแขนเปลือยกล้ามเนื้อ + ปลอกสนับแขนสายรัด 2 เส้น + หมัด (ตามภาพที่ 1, 2, 3)
    cap(J.fs,J.fe.j,1.4,1.2,skin,skd);
    cap(J.fe.j,J.fe.end,1.2,1.08,C(K.bracer||'#382e28'),Dk(K.bracer||'#382e28',.55));
  }else{
    const sl2=K.arch==='furcoat'?C(K.coatCol||'#ba241d'):C(K.sleeve||K.body),gl=C(K.gloves||K.skin);
    cap(J.fs,J.fe.j,K.arch==='elf_cleric'?1.55:1.3,1.1,sl2,Dk(sl2,.6));
    if(K.arch==='sash')cap(J.fe.j,J.fe.end,1.05,.95,skin,skd);
    else cap(J.fe.j,J.fe.end,1.1,1,K.gloves?gl:sl2,Dk(K.gloves||sl2,.6));
    if(!K.gloves&&!T&&K.arch!=='sash'){const m=[(J.fe.j[0]*.35+J.fe.end[0]*.65),(J.fe.j[1]*.35+J.fe.end[1]*.65)];cap(m,J.fe.end,1,.95,skin,skd);}
  }
  const Wp=K.weapon&&WEAPONS[K.weapon]&&(WEAPONS[K.weapon].len||WEAPONS[K.weapon].shape)?WEAPONS[K.weapon]:null;
  if(Wp&&!K.sheathe){const blkU=(cx,cy,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(cx-w/2,cy-h/2,w,h);},segU=(a,b,w,col)=>{const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.max(1,Math.ceil(Math.hypot(dx,dy)*2.4));for(let k=0;k<=n;k++)blkU(a[0]+dx*k/n,a[1]+dy*k/n,w,w,col);};
    drawWeaponShape(Wp,J.fe.end,P.wa,0,false,C,segU,blkU,tint,K);}
  ell(J.fe.end[0],J.fe.end[1],1.4,1.32,C(K.gloves||K.skin),Dk(K.gloves||K.skin,.6));
  if(!T&&K.orbCol&&!Wp){const ox2=J.fe.end[0]+1.8,oy2=J.fe.end[1]-4.2+wv*.7;
    ell(ox2,oy2,2.1,2.2,C(K.orbCol),Dk(K.orbCol,.6));ell(ox2-.2,oy2-1.8,1.1,1.3,'#ffd84a');ell(ox2,oy2,.9,.9,'#fffbe6');}
  if(OF){
    const fdx=J.fe.end[0]-J.fe.j[0],fdy=J.fe.end[1]-J.fe.j[1],fa=Math.atan2(fdy,fdx)+Math.PI/2;
    const m1=[J.fe.j[0]*.62+J.fe.end[0]*.38,J.fe.j[1]*.62+J.fe.end[1]*.38],m2=[J.fe.j[0]*.32+J.fe.end[0]*.68,J.fe.j[1]*.32+J.fe.end[1]*.68];
    ell(m1[0],m1[1],1.2,.48,K.bracerBands[0],null,fa);ell(m2[0],m2[1],1.15,.45,K.bracerBands[1],null,fa);   // สายรัดสนับแขนหมุนตั้งฉากตามแนวแขนท่อนล่าง (ทั้งท่ายืนและท่าวิ่ง!)
    const R2=dir>0,pc=R2?K.pauldronR:K.pauldronL,q=ad(J.sh,.5,.8);ell(q[0],q[1],2.75,2.05,pc,shade(pc,.52));ell(q[0]+.2,q[1]-.7,1.4,.5,shade(pc,1.4));
    if(R2){ctx.fillStyle=K.pauldronRTrim;ctx.fillRect(q[0]+.7,q[1]-.2,.85,.85);ctx.fillRect(q[0]-1.3,q[1]+.1,.7,.7);}else{ctx.fillStyle=K.pauldronLStitch[0];ctx.fillRect(q[0]-.9,q[1]-.3,1,.8);ctx.fillStyle=K.pauldronLStitch[1];ctx.fillRect(q[0]+.4,q[1]+.1,1,.8);}}
  else if(K.pads&&!T){const q=ad(J.sh,.4,.7);ell(q[0],q[1],K.plate?2.9:2.4,K.plate?2.1:1.7,K.trim||'#8a8f9a',shade(K.trim||'#8a8f9a',.5));ell(q[0]+.3,q[1]-.7,1.3,.5,shade(K.trim||'#8a8f9a',1.5));}
  if(K.ring&&!T){ctx.fillStyle=K.ring;ctx.fillRect(J.fe.end[0]+.6,J.fe.end[1]-.4,.6,.6);}
  if(K.aetherStar&&!T){const sx=J.fe.end[0]+1.8,sy=J.fe.end[1]-1.2+wv*.4,sp=2.6+Math.sin(G.t*.14)*.5;
    ctx.fillStyle='rgba(255,216,102,.32)';ctx.beginPath();ctx.arc(sx,sy,sp*1.5,0,7);ctx.fill();
    ctx.fillStyle='#ffe078';ctx.fillRect(sx-sp,sy-.45,sp*2,.9);ctx.fillRect(sx-.45,sy-sp,.9,sp*2);
    ctx.fillStyle='#ffffff';ctx.fillRect(sx-.6,sy-.6,1.2,1.2);}
  ctx.setTransform(1,0,0,1,0,0);
}
// ===== มุมหน้า/มุมหลัง (เดินลง = หันหน้าเข้ากล้อง · เดินขึ้น = เห็นแผ่นหลัง) สไตล์เดียวกับมุมข้าง =====
function drawChibiFB(ctx,ox,oy,px,view,ph,moving,K,tint,tt){
  if(K&&K.custom&&drawCustomChibi(ctx,ox,oy,px,1,owPose(tt,moving,ph),K,tint,view)){ctx.setTransform(1,0,0,1,0,0);return;}
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
  const Wp=K.weapon&&WEAPONS[K.weapon]&&(WEAPONS[K.weapon].len||WEAPONS[K.weapon].shape)?WEAPONS[K.weapon]:null,bigW=Wp&&((Wp.len||0)>12||K.sheathe);
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
  const leg=(sx,lift,col,bc)=>{const OFb=K.outfit&&!T,top=[sx*1.45,hipY+.6],ft=[sx*1.6,-1.3+lift],th=OFb?4.4:(K.arch==='elf_knight'||K.arch==='sash'?4.8:1.6);
    cap(top,ft,1.75,1.3,col,Dk(col,.6));
    if(OFb&&!back)ell(sx*1.6,hipY+2.6,.8,1.4,K.knee);
    poly([[ft[0]-1.6,ft[1]-th],[ft[0]+1.6,ft[1]-th],[ft[0]+1.8,ft[1]+1.3],[ft[0]-1.8,ft[1]+1.3]],bc,Dk(bc,.55));
    if(K.cuffCol&&!T){poly([[ft[0]-2.0,ft[1]-th-.5],[ft[0]+2.0,ft[1]-th-.5],[ft[0]+1.9,ft[1]-th+1.0],[ft[0]-1.9,ft[1]-th+1.0]],C(K.cuffCol),Dk(K.cuffCol,.55));}
    if(OFb){ctx.fillStyle=K.bootStraps;for(const sy of[-3.8,-2.6,-1.4])ctx.fillRect(ft[0]-1.6,ft[1]+sy,3.2,.62);if(!back)poly([[ft[0]-1.75,ft[1]+.1],[ft[0]+1.75,ft[1]+.1],[ft[0]+1.85,ft[1]+1.3],[ft[0]-1.85,ft[1]+1.3]],K.toeCap,shade(K.toeCap,.55));}
    if(!T){ctx.fillStyle=shade(bc,.5);ctx.fillRect(ft[0]-1.8,ft[1]+.9,3.6,.5);ctx.fillStyle=shade(bc,1.35);ctx.fillRect(ft[0]-1,ft[1]-1.5,1.4,.45);}};
  leg(-1,lL,C(K.pants),C(K.boots));leg(1,lR,Dk(K.pants,.9),Dk(K.boots,.9));
  // ---- แขน (หลังลำตัวเล็กน้อย) ----
  const arm=(sx,swing,sleeve,hand)=>{const a=[sx*3.3,shY+1],e=[sx*3.45,shY+4.5+swing*.4],h=[sx*3.5,shY+7.8+swing],sCol=K.arch==='furcoat'?C(K.coatCol||'#ba241d'):sleeve;
    cap(a,e,K.arch==='elf_cleric'?1.6:1.3,1.1,sCol,Dk(sCol,.6));
    if(K.arch==='sash')cap(e,h,1.05,.95,skin,skd);else cap(e,h,1.1,1,K.gloves?hand:sCol,Dk(K.gloves||sCol,.6));
    if(K.outfit&&!T){ctx.fillStyle=K.bracerBands[0];ctx.fillRect(e[0]-1.1,e[1]+.4,2.2,.65);ctx.fillStyle=K.bracerBands[1];ctx.fillRect(e[0]-1.1,e[1]+1.4,2.2,.55);}ell(h[0],h[1],1.3,1.25,hand,Dk(K.gloves||K.skin,.6));
    if(K.outfit&&!T){const R2=back?sx>0:sx<0,pc=R2?K.pauldronR:K.pauldronL;ell(sx*3.7,shY+1.1,2.3,1.8,pc,shade(pc,.55),sx*.18);ell(sx*3.55,shY+.5,1.15,.5,shade(pc,1.4));if(R2){ctx.fillStyle=K.pauldronRTrim;ctx.fillRect(sx*4.2-.42,shY+1.1,.85,.85);}else{ctx.fillStyle=K.pauldronLStitch[0];ctx.fillRect(sx*3.5-.5,shY+.7,1,.75);ctx.fillStyle=K.pauldronLStitch[1];ctx.fillRect(sx*4.2-.4,shY+1.3,.8,.75);}}return h;};
  // ---- ลำตัว ----
  const bc=C(K.body),bd=Dk(K.body,.6),wst=F?2.05:2.7,chs=F?3.35:3.4;
  const torso=()=>{poly([[-2.9,hipY+.2],[-wst,hipY-3.6],[-chs,shY+2.2],[-2.9,shY],[0,shY-.6],[2.9,shY],[chs,shY+2.2],[wst,hipY-3.6],[2.9,hipY+.2]],bc,bd);
    if(K.robe)poly([[-3.1,hipY-1],[3.1,hipY-1],[5,-1.2],[-5,-1.2]],C(K.robe),Dk(K.robe,.6));
    else if(K.outfit&&!T){const co=K.coat,cd=shade(co,.58),hm=K.hemTrim,w2=wv*.25;
      if(!back)for(const sd of[-1,1]){poly([[sd*1.8,hipY-.4],[sd*3.6,hipY-.2],[sd*(6.2+w2),hipY+6.2],[sd*(5.4+w2),hipY+8.2],[sd*2.2,hipY+7]],co,cd);poly([[sd*2.6,hipY+.4],[sd*3.3,hipY+.4],[sd*(4.5+w2),hipY+7.2],[sd*(3.6+w2),hipY+7]],cd);
        poly([[sd*(6.2+w2),hipY+6],[sd*(5.4+w2),hipY+8.3],[sd*2.2,hipY+7.1],[sd*2.4,hipY+5.8]],hm,shade(hm,.55));ctx.fillStyle=K.hemStuds;for(let k=0;k<3;k++){const t2=(k+.5)/3;ctx.fillRect(sd*(2.5+t2*3.3)-.4,hipY+6.4+t2*1.1-.4,.8,.8);}}
      else{poly([[-3.1,hipY],[3.1,hipY],[5.6+w2,hipY+7.6],[3.5,hipY+9.3],[1.6,hipY+8.8],[0,hipY+9.4],[-1.6,hipY+8.8],[-3.5,hipY+9.3],[-5.6+w2,hipY+7.6]],co,cd);
        poly([[-1.6,hipY+.3],[-.6,hipY+.3],[-.9,hipY+8.6],[-1.9,hipY+8.6]],cd);poly([[.6,hipY+.3],[1.6,hipY+.3],[1.9,hipY+8.6],[.9,hipY+8.6]],cd);
        ctx.fillStyle=K.hemStuds;ctx.fillRect(-2.6,hipY+5.2,.8,1.2);ctx.fillRect(1.8,hipY+5.2,.8,1.2);
        for(const sd of[-1,1]){poly([[sd*5.5,hipY+7.2],[sd*3.7,hipY+8.2],[sd*4.5,hipY+6.1]],hm,shade(hm,.6));poly([[sd*3.2,hipY+8.2],[sd*2.1,hipY+9.6],[sd*1.1,hipY+8.2]],hm,shade(hm,.6));}}}
    else if(K.arch==='furcoat'){
      const co=C(K.coatCol||'#ba241d'),cd=Dk(co,.58),w2=wv*.25;
      poly([[-2.7,hipY-1],[2.7,hipY-1],[3.4,hipY+4.5],[-3.4,hipY+4.5]],bc,bd);
      if(!back)for(const sd of[-1,1]){poly([[sd*1.6,shY+1],[sd*3.4,shY+1],[sd*(6.2+w2),hipY+8.4],[sd*2.1,hipY+8.8]],co,cd);
        if(!T){ctx.fillStyle=cd;ctx.fillRect(sd*3.2-1,hipY+3,2,2.2);if(K.coatTrim){ctx.strokeStyle=C(K.coatTrim);ctx.lineWidth=lw*1.2;ctx.beginPath();ctx.moveTo(sd*1.7,shY+1);ctx.lineTo(sd*2.1,hipY+8.7);ctx.stroke();}}}
      else poly([[-3.1,shY+1],[3.1,shY+1],[6.2+w2,hipY+8.8],[-6.2+w2,hipY+8.8]],co,cd);
      if(K.shoulderFur&&!T){poly([[-2.5,shY-1],[-6.4,shY+1],[-7.2+w2,shY+10],[-3.8+w2,shY+11],[-2.2,shY+4]],C(K.furCol||'#eef3f8'),Dk(K.furCol||'#eef3f8',.62));}
      else if(K.furCol&&!T)poly([[-3.5,shY+.4],[3.5,shY+.4],[2.8,shY+2.4],[-2.8,shY+2.4]],C(K.furCol),Dk(K.furCol,.62));
    }else if(K.arch==='sash'){
      const sc=C(K.sashCol||'#c83424'),sd2=Dk(sc,.58);
      if(!T){poly([[-2.7,shY+.2],[-1.7,shY+.2],[2.6,hipY-1],[1.6,hipY-1]],sc,sd2);
        if(!back)for(const sx of[-1.6,1.6]){poly([[sx-.7,hipY-.4],[sx+.7,hipY-.4],[sx+.8,hipY+6.8],[sx-.8,hipY+6.8]],sc,sd2);ctx.fillStyle='#f0a838';ctx.fillRect(sx-.35,hipY+.6,.7,5.2);}
        else poly([[1.5,hipY],[3.5,hipY+5.2],[2.2,hipY+6.2],[.8,hipY+.4]],sd2,Dk(sc,.45));}
    }else if(K.arch==='elf_knight'){
      const co=C(K.coatCol||'#522428'),oc=C(K.obiCol||'#1b6a6c');
      poly([[-3.0,hipY-3.2],[3.0,hipY-3.2],[3.2,hipY+.6],[-3.2,hipY+.6]],oc,Dk(oc,.55));
      if(!back)poly([[-3.3,hipY-.4],[-1.5,hipY-.2],[-1.8,hipY+7.6],[-4.4,hipY+6.8]],co,Dk(co,.55));
      else poly([[-3.3,hipY-.4],[3.3,hipY-.4],[4.6,hipY+7.2],[-4.6,hipY+7.2]],co,Dk(co,.55));
    }else if(K.arch==='elf_cleric'){
      const co=C(K.coatCol||'#10767e'),cd=Dk(co,.56),w2=wv*.28;
      poly([[-2.6,hipY-1],[2.6,hipY-1],[3.6,hipY+4.2],[-3.6,hipY+4.2]],bc,bd);
      if(!back)for(const sd of[-1,1]){poly([[sd*1.8,hipY-.4],[sd*3.4,hipY-.2],[sd*(6.4+w2),hipY+10.5],[sd*2.8,hipY+10.2],[sd*2.0,hipY+1.6]],co,cd);}
      else poly([[-3.2,hipY-.4],[3.2,hipY-.4],[6.4+w2,hipY+10.6],[-6.4+w2,hipY+10.6]],co,cd);
    }else if(K.arch==='knight'){
      const co=C(K.coatCol||'#243e78'),cd=Dk(co,.55),tm=C(K.trim||'#d8b050');
      poly([[-3.1,shY+.4],[3.1,shY+.4],[2.6,hipY-.6],[-2.6,hipY-.6]],bc,bd);
      for(const sd of[-1,1])poly([[sd*2.6,shY],[sd*5.0,shY+.6],[sd*4.6,shY+2.6],[sd*2.8,shY+2]],C(K.armor||K.body),bd);
      poly([[-3.3,hipY-.4],[3.3,hipY-.4],[4.2,hipY+4.8],[-4.2,hipY+4.8]],co,cd);
      if(!T&&!back){ctx.fillStyle=tm;ctx.fillRect(-.7,shY+1.2,1.4,4.2);ctx.fillRect(-3.1,hipY-1.1,6.2,1.1);}
    }else if(K.arch==='mage_dress'){
      const co=C(K.coatCol||'#2d6fb8'),cd=Dk(co,.56),tm=C(K.trim||'#e2d4a0'),w2=wv*.3;
      poly([[-2.7,hipY-.6],[2.7,hipY-.6],[5.2,hipY+5.2],[-5.2,hipY+5.2]],co,cd);
      if(!back)for(const sd of[-1,1])poly([[sd*2.2,hipY-.2],[sd*3.6,hipY],[sd*(6.0+w2),hipY+8.8],[sd*3.4,hipY+8.6]],Dk(co,.82),cd);
      else poly([[-3.6,hipY-.2],[3.6,hipY-.2],[6.2+w2,hipY+9.2],[-6.2+w2,hipY+9.2]],Dk(co,.82),cd);
      if(!T){ctx.fillStyle=tm;ctx.fillRect(-4.6,hipY+4.2,9.2,.9);}
    }else poly([[-3,hipY-.6],[3,hipY-.6],[3.8,hipY+2.6],[1,hipY+2.2],[0,hipY+2.8],[-1,hipY+2.2],[-3.8,hipY+2.6]],Dk(K.body,.86),bd);
    if(T)return;
    if(K.robe){ctx.fillStyle=K.trim||shade(K.robe,1.4);ctx.fillRect(-4.9,-2.2,9.8,.7);ctx.fillStyle=shade(K.robe,.78);ctx.fillRect(-.25,hipY,.5,hipY*-1-2.5);}
    const bl=K.belt||K.trim;if(bl){ctx.fillStyle=bl;ctx.fillRect(-2.95,hipY-1.4,5.9,1.2);if(!back){ctx.fillStyle='#e8c060';ctx.fillRect(-.55,hipY-1.5,1.1,1.4);}}
    if(K.outfit){if(!back){poly([[-2.7,shY+.1],[-1.1,shY-.2],[-1.4,shY+3.2],[-2.8,shY+2.2]],K.lapel,shade(K.lapel,.55));poly([[2.7,shY+.1],[1.1,shY-.2],[1.4,shY+3.2],[2.8,shY+2.2]],K.lapel,shade(K.lapel,.55));
        for(const sy of[shY+2.6,shY+4.6]){ctx.fillStyle=K.chestStraps;ctx.fillRect(-2.6,sy,5.2,1.05);ctx.fillStyle=K.strapBuckle;ctx.fillRect(-1.5,sy+.12,1,.8);ctx.fillRect(.5,sy+.12,1,.8);}
        ctx.fillStyle=K.beltPouch;ctx.fillRect(-2.4,hipY-1.2,1.2,1.1);ctx.fillRect(1.2,hipY-1.2,1.2,1.1);}
      else{ctx.strokeStyle=K.chestStraps;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(2.7,shY+.6);ctx.lineTo(-2.5,hipY-1.4);ctx.stroke();}}
    if(back){ctx.fillStyle=shade(K.body,.8);ctx.fillRect(-.25,shY+1,.5,hipY-shY-3);}
    else{if(K.plate){poly([[-2.6,shY+1.4],[2.6,shY+1.4],[2.2,hipY-3],[0,hipY-2.2],[-2.2,hipY-3]],shade(K.body,1.3),shade(K.body,.6));ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(-1.6,shY+2.2,.5,3);}
      if(K.scales)for(const yy of[shY+3,shY+5,shY+7])for(const xx of[-1.4,0,1.4])ell(xx,yy,.75,.45,K.scales,shade(K.scales,.6));
      if(K.glowTrim&&G.t%30<20)ell(0,shY+4,.6,1.4,'#ffb03a');
      if(F){const bcol=K.arch==='knight'?C(K.armor||K.body):K.plate?shade(K.body,1.25):bc;for(const sx of[-1,1]){ell(sx*1.5,shY+3.1,1.42,1.15,shade(bcol,1.16),Dk(bcol,.62));ell(sx*1.5,shY+4.15,1.45,.58,shade(bcol,.58));}}
      if(K.scarf)ell(0,shY+.5,2.9,1.3,K.scarf,shade(K.scarf,.6));else if(K.trim)poly([[-2.6,shY+.2],[0,shY+2.2],[2.6,shY+.2],[0,shY-.6]],K.trim,shade(K.trim,.6));
      if(K.neck){ctx.fillStyle='#d8b050';ctx.fillRect(-1.4,shY+1.2,2.8,.4);ell(0,shY+2.6,.75,.85,K.neck,'#6a4a20');}}};
  const sl=C(K.sleeve||K.body),hd=C(K.gloves||K.skin);
  if(back){torso();arm(-1,-sw*1.2,sl,hd);arm(1,sw*1.2,sl,hd);
    if(K.cape)poly([[-3.2,shY+.2],[3.2,shY+.2],[4.6+wv*.4,shY+15.5],[0,shY+16.4+wv*.3],[-4.6+wv*.4,shY+15.5]],C(K.cape.col),Dk(K.cape.col,.6));
    if(K.scarf){ell(0,shY+.4,2.8,1.2,C(K.scarf),Dk(K.scarf,.6));poly([[-.4,shY+1],[.8,shY+1],[1.6+wv,shY+6],[.2+wv,shY+6.4]],Dk(K.scarf,.8),Dk(K.scarf,.55));}
    if(Wp&&bigW)onBack();}
  else{arm(-1,sw*1.2,sl,hd);const hR=arm(1,-sw*1.2,Dk(K.sleeve||K.body,.92),Dk(K.gloves||K.skin,.92));torso();
    if(Wp&&!bigW){const up=['staff','wand','spear','scythe'].includes(Wp.shape);drawWeaponShape(Wp,[-4.3,shY+7.6+sw*1.2],up?-Math.PI/2-.18:Math.PI/2+.32,0,false,C,segU,blkU,tint,K);}   // ไม้เท้า/หอก ถือตั้งขึ้น · ดาบสั้นถือลง
    {const h=[-4.3,shY+7.6+sw*1.2];ell(h[0],h[1],1.3,1.25,hd,Dk(K.gloves||K.skin,.6));}
    if(!T&&K.aetherStar){const sx=4.6,sy=shY+6.6-sw*.8,sp=2.4+Math.sin(tt*.14)*.45;ctx.fillStyle='rgba(255,216,102,.32)';ctx.beginPath();ctx.arc(sx,sy,sp*1.5,0,7);ctx.fill();ctx.fillStyle='#ffe078';ctx.fillRect(sx-sp,sy-.45,sp*2,.9);ctx.fillRect(sx-.45,sy-sp,.9,sp*2);ctx.fillStyle='#ffffff';ctx.fillRect(sx-.55,sy-.55,1.1,1.1);}
    if(!T&&K.orbCol&&!Wp){const ox2=5.8,oy2=shY+3.6+wv*.7;ell(ox2,oy2,2.0,2.2,C(K.orbCol),Dk(K.orbCol,.6));ell(ox2,oy2-1.8,1.0,1.2,'#ffd84a');ell(ox2,oy2,.85,.85,'#fffbe6');}}
  if(K.pads&&!T&&!K.outfit){const pc=K.trim||'#8a8f9a';for(const sx of[-1,1]){ell(sx*3.5,shY+.9,K.plate?2.3:1.9,K.plate?1.7:1.4,pc,shade(pc,.5));ell(sx*3.5-.3,shY+.3,1,.4,shade(pc,1.5));}}
  // ---- หัว ----
  cap([0,shY+.4],[0,Hc[1]+3.2],1.05,1.05,skd);
  const notBald=hair!=='none'&&hair!=='bald'&&hair!=='mohawk';
  if(notBald)ell(Hc[0],Hc[1]-.9,5.4,5.1,hc,hcd);
  if(back){
    if(notBald){ell(Hc[0],Hc[1]-.4,5.2,5.2,hc,hcd);poly([hp(-5,0),hp(5,0),hp(4.2,4.2),hp(2,3.6),hp(0,4.6),hp(-2,3.6),hp(-4.2,4.2)],hc,hcd);}
    else if(hair!=='none'){ell(Hc[0],Hc[1],4.5,4.6,skin,skd);}
    if(!T&&K.elfEars&&!helm)both([hp(-4.2,.1),hp(-7.2,-.6),hp(-4.4,1.9)],skin,skd);
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
      if(K.elfEars&&!helm)both([hp(-4.2,.1),hp(-7.2,-.6),hp(-4.4,1.9)],skin,skd);else for(const sx of[-1,1])ell(...hp(sx*4.5,1),.6,1,shade(K.skin,.9),skd);}
    if(!T&&!helm){const ec=K.eyec&&K.eyec!=='#1a1020'?K.eyec:'#3a5a9a';
      for(const sx of[-1,1]){const E=hp(sx*1.8,.9);ell(E[0],E[1],.72,1.15,'#1a1020');ell(E[0],E[1]+.3,.52,.75,ec);ell(E[0],E[1]+.62,.38,.32,shade(ec,1.6));ctx.fillStyle='#fff';ctx.fillRect(E[0]-.45,E[1]-.7,.45,.45);
        ctx.fillStyle='#1a1020';ctx.fillRect(E[0]-.9,E[1]-1.42,1.8,.5);if(F)ctx.fillRect(E[0]+sx*.7,E[1]-1.65,.55,.45);}
      ctx.fillStyle=F?'#c05a6a':'#9a5a52';ctx.fillRect(Hc[0]-.45,Hc[1]+3.1,.9,.4);ctx.fillStyle='rgba(255,110,110,.32)';ctx.fillRect(Hc[0]-3.4,Hc[1]+2.1,1.3,.5);ctx.fillRect(Hc[0]+2.1,Hc[1]+2.1,1.3,.5);
      if(K.eyepatch){const EP1=hp(1.8,.9);ctx.strokeStyle='#1c1e26';ctx.lineWidth=lw*1.2;ctx.beginPath();ctx.moveTo(...hp(-4.4,-1.0));ctx.lineTo(...hp(4.4,1.9));ctx.stroke();ell(EP1[0],EP1[1],1.3,1.4,'#181a24','#0c0d12');ctx.fillStyle='#2a2e3c';ctx.fillRect(EP1[0]-.5,EP1[1]-.6,.9,.4);}
      if(K.beard){const bc=C(K.beard),bd2=Dk(K.beard,.62);poly([hp(-3.1,2.2),hp(3.1,2.2),hp(2.7,4.9),hp(0,6.6),hp(-2.7,4.9)],bc,bd2);poly([hp(-2.9,2.2),hp(2.9,2.2),hp(2.2,3.4),hp(0,3.0),hp(-2.2,3.4)],shade(K.beard,1.12),bd2);}
      if(K.mask)poly([hp(-3.4,1.8),hp(3.4,1.8),hp(2.4,4.6),hp(0,5.4),hp(-2.4,4.6)],'#1a1a24','#000');}
    if(hair!=='none'&&hair!=='bald'){
      if(hair==='mohawk'){for(let k=0;k<4;k++){const b=hp(0,-4.4);poly([[b[0]-1,b[1]+.4],[b[0]+(k-1.5)*.6,b[1]-2.4-k%2],[b[0]+1,b[1]+.4]],hc,hcd);}}
      else{const spk=hair==='spiky'?[[-140,4.4],[-112,4.8],[-90,4.4],[-68,4.8],[-40,4.4],[-165,3.2],[-15,3.2]]:hair==='curly'?[]:hair==='short'||hair==='sidebang'?[[-130,2.4],[-90,2.2],[-50,2.4]]:[[-120,1.4],[-60,1.4]];
        for(const[a,l]of spk){const r=a*Math.PI/180,b=[Hc[0]+Math.cos(r)*4.2,Hc[1]-1.4+Math.sin(r)*4.2],tip=[Hc[0]+Math.cos(r)*(4.2+l),Hc[1]-1.4+Math.sin(r)*(4.2+l)],n=[-Math.sin(r)*1.5,Math.cos(r)*1.5];poly([[b[0]+n[0],b[1]+n[1]],tip,[b[0]-n[0],b[1]-n[1]]],hc,hcd);}
        if(hair==='curly')for(let k=0;k<9;k++){const a=Math.PI*(1.0+k/8),q=[Hc[0]+Math.cos(a)*5,Hc[1]-1+Math.sin(a)*4.8];ell(q[0],q[1],1.5,1.4,k%2?hc:hcd,hcd);}
        if(hair==='bun')ell(...hp(0,-6.2),2.2,1.9,hc,hcd);
        if(K.ahoge)poly([hp(-1.4,-5.1),hp(0,-7.4),hp(1.8,-6.0),hp(.2,-5.0)],hcl,hcd);
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
    else if(K.head==='cowl'){poly([hp(-5.6,2.2),hp(-5.5,-3.8),hp(0,-6.4),hp(5.5,-3.8),hp(5.6,2.2),...(back?[hp(4,3.6),hp(-4,3.6)]:[hp(4,-1.8),hp(0,-3),hp(-4,-1.8)])],h1,hd1);if(back)poly([hp(-2.2,1.8),hp(2.2,1.8),hp(1.2+wv*.6,5.2),hp(-1.2+wv*.6,5.2)],h2,Dk(K.hc2||K.hc,.55));}
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

/* ===== โมเดลโกเลม HD-2D ใหม่ (โกเลมหิน · ราชันย์ลาวา · ยักษ์น้ำแข็ง · หินเดินได้) =====
   วาดแบบแยกชิ้นส่วนมีมิติ (เกราะศิลาหลายชั้น · รอยแยกพลังงาน · แกนเอเธอร์กลางอก · สนับหมัดยักษ์ · มงกุฎลาวา/ผลึกน้ำแข็ง/มอสโบราณ)
   ผ่าน rigShade ให้ได้เส้นขอบและแรเงาพิกเซลอาร์ต HD-2D เข้าชุดกับตัวละคร */
function drawGolemChibi(ctx,ox,oy,px,dir,pal,P,tint){
  ctx.setTransform(px*dir,0,0,px,ox,oy);ctx.lineJoin='round';
  const T=!!tint,C=c=>tint||c,Dk=(c,m)=>tint||shade(c,m),lw=1/px;
  const r0=pal.r||'#6e6458',r1=pal.R||'#8f8474',ey=pal.y||'#ffd34a',em=pal.m||'#5fe0a0';
  const rDk=Dk(r0,.56),rMd=C(r0),rLt=C(r1),rHi=Dk(r1,1.22),cEm=C(em),cEy=C(ey),cCore=T?tint:'#fff8e0';
  const isLava=em==='#ff7a1a',isIce=em==='#4ab8ff',isMini=r0==='#5e564c';
  const fill=(col,edge)=>{ctx.fillStyle=col;ctx.fill();if(edge&&!T){ctx.strokeStyle=edge;ctx.lineWidth=lw;ctx.stroke();}};
  const poly=(pts,col,edge)=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);ctx.closePath();fill(col,edge);};
  const ell=(cx,cy,rx,ry,col,edge,rot=0)=>{ctx.beginPath();ctx.ellipse(cx,cy,Math.max(.1,rx),Math.max(.1,ry),rot,0,7);fill(col,edge);};
  const cap=(a,b,ra,rb,col,edge)=>{const dx=b[0]-a[0],dy=b[1]-a[1],an=Math.atan2(dy,dx),H=Math.PI/2;ctx.beginPath();ctx.arc(a[0],a[1],ra,an+H,an+3*H);ctx.arc(b[0],b[1],rb,an-H,an+H);ctx.closePath();fill(col,edge);};

  const br=P.br||0,wk=P.wk||0,atk=P.atk||0,qk=P.qk||0,wkOpen=P.weak?1.0:0;
  const ty=br*.3+(atk===1?(qk?-.7:-.3):atk===2?(qk?1.3:.5):0);
  const tx=atk===1?-.4:atk===2?(qk?.3:1.1):0;
  const lLift=Math.max(0,wk)*.9,rLift=Math.max(0,-wk)*.9;

  // 1) หนามหิน/ผลึกน้ำแข็ง/ปล่องแมกมาด้านหลังไหล่
  if(!isMini){
    const spCol=isIce?rHi:isLava?rDk:rMd,tipCol=isIce?'#e8fbff':isLava?cEm:'#5a8a48';
    for(const[sx,sy,ang,h]of[[-5.4,-12.5+ty,-.38,3.6],[4.8,-12.7+ty,.34,3.8],[-3.0,-14.0+ty,-.18,3.0],[2.8,-14.1+ty,.18,3.1]]){
      const tx0=sx+Math.sin(ang)*h,ty0=sy-Math.cos(ang)*h;
      poly([[sx-1.3,sy+.5],[tx0,ty0],[sx+1.3,sy+.5]],spCol,rDk);
      poly([[sx-.6,sy-.6],[tx0,ty0],[sx+.6,sy-.5]],tipCol);
    }
  }

  // 2) แขนหลัง (ฝั่งไกลตัว) พร้อมข้อต่อพลังงานและสนับหมัดหินยักษ์
  const bSh=[tx-5.4,ty-11.2],bEl=atk===1&&qk?[tx-6.8,ty-14.2]:atk===2&&qk?[tx-3.8,-3.5]:[tx-6.6-wk*.7,ty-7.4+wk*.4];
  const bHd=atk===1&&qk?[tx-5.8,ty-16.4]:atk===2&&qk?[tx-2.6,-.8]:[tx-6.4-wk*1.1,ty-3.4+wk*.5];
  cap(bSh,bEl,1.9,1.5,rDk,Dk(r0,.38));
  ell(bEl[0],bEl[1],1.15,1.15,cEm,rDk);
  cap(bEl,bHd,2.1,2.3,Dk(r0,.72),rDk);
  poly([[bHd[0]-2.2,bHd[1]-1.5],[bHd[0]+1.8,bHd[1]-1.5],[bHd[0]+2.1,bHd[1]+1.5],[bHd[0]-2.0,bHd[1]+1.6]],Dk(r1,.78),rDk);
  if(!T){ctx.fillStyle=cEm;ctx.fillRect(bHd[0]-1.4,bHd[1]-.4,2.4,.55);}

  // 3) ขาเสาศิลาคู่ + สนับเข่ารูน + เท้าหินสามเล็บ
  const drawLeg=(lx,lift,dark)=>{
    const cM=dark?Dk(r0,.78):rMd,cL=dark?Dk(r1,.78):rLt,fy=-lift;
    // ต้นขาและสนับเข่า
    poly([[lx-1.9,ty-5.8],[lx+1.9,ty-5.8],[lx+2.2,fy-2.8],[lx-2.1,fy-2.8]],cM,rDk);
    poly([[lx-2.3,fy-2.5],[lx+2.4,fy-2.5],[lx+2.7,fy-.4],[lx-2.5,fy-.4]],cL,rDk);
    poly([[lx-1.4,fy-3.5],[lx,fy-4.2],[lx+1.4,fy-3.5],[lx,fy-2.3]],rHi,rDk);
    if(!T){ctx.fillStyle=cEm;ctx.fillRect(lx-.45,fy-3.5,.9,.9);}
    // ฐานเท้าศิลา
    poly([[lx-2.7,fy-.8],[lx+2.9,fy-.8],[lx+3.3,fy],[lx-3.0,fy]],rDk,Dk(r0,.35));
    for(const cx0 of[-1.8,0,1.8])poly([[lx+cx0-.6,fy-.7],[lx+cx0,fy-1.4],[lx+cx0+.6,fy-.7]],cL);
  };
  drawLeg(-3.2,lLift,true);
  drawLeg(2.8,rLift,false);

  // 4) เชิงกรานศิลาและป้ายผ้าเตี่ยวหินสลักรูน
  poly([[tx-4.6,ty-6.6],[tx+4.8,ty-6.6],[tx+3.8,ty-4.6],[tx-3.8,ty-4.6]],rDk,Dk(r0,.35));
  poly([[tx-1.8,ty-6.2],[tx+2.0,ty-6.2],[tx+1.4,ty-2.5],[tx+.1,ty-1.8],[tx-1.3,ty-2.5]],rMd,rDk);
  if(!T){
    ctx.strokeStyle=cEm;ctx.lineWidth=lw*1.2;
    ctx.beginPath();ctx.moveTo(tx+.1,ty-5.6);ctx.lineTo(tx+.1,ty-2.7);ctx.moveTo(tx-.8,ty-4.3);ctx.lineTo(tx+1.0,ty-4.3);ctx.stroke();
  }

  // 5) ลำตัวเกราะศิลาขนาดมหึมา + รอยแยกพลังงาน + แกนเอเธอร์ (Aether Reactor Core)
  poly([[tx-5.0,ty-6.0],[tx-6.6,ty-11.8],[tx-3.6,ty-13.6],[tx+4.0,ty-13.6],[tx+6.8,ty-11.8],[tx+5.0,ty-6.0]],rMd,rDk);
  // แผ่นเกราะอกซ้าย-ขวา (แยกออกเมื่อจุดอ่อนแกนกลางเปิด!)
  const sp=wkOpen*.85;
  poly([[tx-5.8-sp,ty-11.4],[tx-.5-sp,ty-12.8],[tx-.4-sp,ty-6.4],[tx-4.6-sp,ty-6.3]],rLt,rDk);
  poly([[tx+.7+sp,ty-12.8],[tx+6.0+sp,ty-11.4],[tx+4.8+sp,ty-6.3],[tx+.6+sp,ty-6.4]],rLt,rDk);
  // ไฮไลต์สันหินด้านบนอก
  poly([[tx-5.4-sp,ty-11.3],[tx-.8-sp,ty-12.5],[tx-1.2-sp,ty-11.4],[tx-4.8-sp,ty-10.3]],rHi);
  poly([[tx+1.0+sp,ty-12.5],[tx+5.6+sp,ty-11.3],[tx+5.0+sp,ty-10.3],[tx+1.4+sp,ty-11.4]],rHi);
  // รอยร้าวพลังงานวิ่งจากแกนกลางอกไปยังไหล่ทั้งสองข้าง
  if(!T){
    ctx.strokeStyle=cEm;ctx.lineWidth=lw*1.25;
    ctx.beginPath();
    ctx.moveTo(tx-1.6,ty-8.5);ctx.lineTo(tx-3.8,ty-10.2);ctx.lineTo(tx-4.8,ty-9.6);
    ctx.moveTo(tx+1.8,ty-8.5);ctx.lineTo(tx+4.0,ty-10.2);ctx.lineTo(tx+5.0,ty-9.6);
    ctx.moveTo(tx-1.2,ty-7.2);ctx.lineTo(tx-3.4,ty-6.8);
    ctx.moveTo(tx+1.4,ty-7.2);ctx.lineTo(tx+3.6,ty-6.8);
    ctx.stroke();
  }
  // เบ้าแกนพลังงานเอเธอร์กลางอก (y ≈ -8.2)
  const cxC=tx+.2,cyC=ty-8.4,cr=1.85+wkOpen*.45+Math.sin(G.t*.12)*.12;
  poly([[cxC-2.3,cyC],[cxC,cyC-2.2],[cxC+2.3,cyC],[cxC,cyC+2.2]],'#18121a',rDk);
  poly([[cxC-cr,cyC],[cxC,cyC-cr],[cxC+cr,cyC],[cxC,cyC+cr]],cEm,rDk);
  poly([[cxC-cr*.52,cyC],[cxC,cyC-cr*.52],[cxC+cr*.52,cyC],[cxC,cyC+cr*.52]],cCore);
  // ซี่เกราะหินล็อกแกนกลาง (กางออกเมื่อแกนเปิด)
  if(!P.weak){
    poly([[cxC-2.3,cyC-.9],[cxC-.7,cyC-.5],[cxC-.7,cyC+.5],[cxC-2.3,cyC+.9]],rDk);
    poly([[cxC+2.3,cyC-.9],[cxC+.7,cyC-.5],[cxC+.7,cyC+.5],[cxC+2.3,cyC+.9]],rDk);
  }

  // 6) เกราะไหล่หินผาขนาดใหญ่ (ซ้าย-ขวา) + มอส/น้ำแข็ง/แมกมาปกคลุม
  for(const sd of[-1,1]){
    const px0=tx+sd*6.0,py0=ty-11.2+(sd>0?-.2:0);
    poly([[px0-2.4,py0+1.6],[px0-2.7,py0-1.6],[px0,py0-2.8],[px0+2.7,py0-1.4],[px0+2.3,py0+1.6]],rLt,rDk);
    poly([[px0-2.1,py0-1.3],[px0,py0-2.6],[px0+2.1,py0-1.2],[px0,py0-.6]],isLava?cEm:isIce?'#e8fbff':'#5a8a48');
    if(!T){
      ctx.strokeStyle=cEm;ctx.lineWidth=lw*1.1;
      ctx.beginPath();ctx.moveTo(px0-1.1,py0-.4);ctx.lineTo(px0,py0+.9);ctx.lineTo(px0+1.1,py0-.4);ctx.stroke();
    }
  }

  // 7) ศีรษะศิลาฝังในเกราะอก + กระบังหน้าเงามืด + ดวงตาเรืองแสง + มงกุฎตามธาตุ
  const hx=tx+.3,hy=ty-12.7;
  poly([[hx-3.1,hy+1.6],[hx-3.4,hy-1.4],[hx-1.8,hy-2.8],[hx+2.0,hy-2.8],[hx+3.5,hy-1.4],[hx+3.1,hy+1.6]],rLt,rDk);
  // ช่องกระบังหน้าลึกสีเข้มและดวงตาเรืองแสงคู่
  poly([[hx-2.6,hy-.7],[hx+2.8,hy-.7],[hx+2.3,hy+.7],[hx-2.2,hy+.7]],'#140e16');
  poly([[hx-2.1,hy-.35],[hx-.6,hy-.15],[hx-.8,hy+.45],[hx-2.0,hy+.35]],cEy);
  poly([[hx+.8,hy-.15],[hx+2.3,hy-.35],[hx+2.2,hy+.35],[hx+1.0,hy+.45]],cEy);
  if(!T){ctx.fillStyle='#ffffff';ctx.fillRect(hx-1.5,hy-.2,.5,.4);ctx.fillRect(hx+1.3,hy-.2,.5,.4);}
  // คิ้วศิลาทรงดุดันและกรามล่างพร้อมช่องระบายพลังงาน
  poly([[hx-3.2,hy-1.2],[hx+.1,hy-.4],[hx+3.3,hy-1.2],[hx+2.6,hy-1.9],[hx+.1,hy-1.2],[hx-2.5,hy-1.9]],rHi,rDk);
  poly([[hx-2.4,hy+.7],[hx+2.6,hy+.7],[hx+2.0,hy+1.9],[hx-1.8,hy+1.9]],rDk);
  if(!T){ctx.fillStyle=cEm;for(const vx of[-1.0,0,1.0])ctx.fillRect(hx+vx-.2,hy+.95,.4,.65);}
  // ยอดมงกุฎ/หงอนศิลาบนศีรษะ
  if(isLava){
    // ราชันย์ลาวา: มงกุฎหินออบซิเดียน 3 ยอดเพลิงทอง
    for(const[cx0,h0]of[[-1.8,2.2],[.1,3.1],[2.0,2.2]]){
      poly([[hx+cx0-.9,hy-2.4],[hx+cx0,hy-2.4-h0],[hx+cx0+.9,hy-2.4]],'#2a1412',rDk);
      poly([[hx+cx0-.45,hy-2.5],[hx+cx0,hy-2.2-h0*.85],[hx+cx0+.45,hy-2.5]],cx0===.1?cEy:cEm);
    }
  }else if(isIce){
    // ยักษ์น้ำแข็ง: มงกุฎผลึกน้ำแข็ง 3 แฉก
    for(const[cx0,h0]of[[-1.6,2.0],[.1,2.9],[1.8,2.0]]){
      poly([[hx+cx0-.8,hy-2.4],[hx+cx0,hy-2.4-h0],[hx+cx0+.8,hy-2.4]],'#e8fbff',rDk);
      poly([[hx+cx0-.35,hy-2.5],[hx+cx0,hy-2.2-h0*.8],[hx+cx0+.35,hy-2.5]],cEm);
    }
  }else{
    // โกเลมหิน / หินเดินได้: แท่นศิลารูนโบราณปกคลุมด้วยมอสและอักขระมรกต
    poly([[hx-2.0,hy-2.5],[hx-1.3,hy-4.1],[hx+1.5,hy-4.1],[hx+2.1,hy-2.5]],rMd,rDk);
    poly([[hx-1.5,hy-3.8],[hx+1.6,hy-3.8],[hx+1.9,hy-2.9],[hx-1.7,hy-2.9]],'#5a8a48');
    if(!T){ctx.fillStyle=cEm;ctx.fillRect(hx-.35,hy-3.6,.9,1.1);}
  }

  // 8) แขนหน้า (สนับหมัดศิลาบดขยี้ขนาดยักษ์ + นิ้วหิน 3 ข้อ)
  const fSh=[tx+5.6,ty-10.8];
  const fEl=atk===1?(qk?[tx+6.6,ty-14.0]:[tx+3.6,ty-8.2]):atk===2?(qk?[tx+5.0,-3.5]:[tx+7.4,ty-8.0]):[tx+6.6+wk*.7,ty-7.0-wk*.4];
  const fHd=atk===1?(qk?[tx+5.4,ty-16.2]:[tx+2.4,ty-5.2]):atk===2?(qk?[tx+3.8,-.6]:[tx+9.2,ty-7.2]):[tx+6.8+wk*1.1,ty-2.8-wk*.5];
  cap(fSh,fEl,2.0,1.65,rMd,rDk);
  ell(fEl[0],fEl[1],1.25,1.25,cEm,rDk);
  cap(fEl,fHd,2.3,2.6,rLt,rDk);
  // สนับเกราะหมัดหินยักษ์ + แถบรูนเรืองแสง + สันหมัด 3 นิ้ว
  poly([[fHd[0]-2.4,fHd[1]-2.0],[fHd[0]+2.4,fHd[1]-2.0],[fHd[0]+2.7,fHd[1]+1.8],[fHd[0]-2.2,fHd[1]+1.9]],rHi,rDk);
  poly([[fHd[0]-2.2,fHd[1]-.4],[fHd[0]+2.4,fHd[1]-.4],[fHd[0]+2.4,fHd[1]+1.8],[fHd[0]-2.1,fHd[1]+1.8]],rLt,rDk);
  if(!T){
    ctx.fillStyle=cEm;ctx.fillRect(fHd[0]-1.7,fHd[1]-1.1,3.4,.7);
    ctx.fillStyle=rDk;for(const fx0 of[-.9,.5])ctx.fillRect(fHd[0]+fx0,fHd[1]+.2,.45,1.5);
  }
  ctx.setTransform(1,0,0,1,0,0);
}
function drawGolemHD(ctx,pal,x,y,sc,flip,tint,f){
  const px=sc>=4?4:3,ox=135,oy=210,k=(sc/px)*(sc>=8?1:1.36),dir=flip?-1:1;
  const t=(typeof G!=='undefined'&&G.t)||0;
  const P={
    br:Math.round(Math.sin(t*.08)*3)/3,
    wk:f&&f.state==='walk'?Math.round(Math.sin(t*.25)*3)/3:0,
    atk:f&&f.state==='attack'?(f.phase==='startup'?1:f.phase==='active'?2:3):0,
    qk:f&&f.state==='attack'&&f.move&&f.move.quake?1:0,
    weak:f&&f.weakT>0?1:0
  };
  let key=null;
  if(!tint){
    key='GOL|'+(pal.r||'')+(pal.m||'')+'|'+dir+'|'+P.br+','+P.wk+','+P.atk+','+P.qk+','+P.weak+'|'+px;
    const hit=RCACHE.get(key);
    if(hit){ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(hit.c,Math.round(x+hit.dx*k),Math.round(y+hit.dy*k),Math.round(hit.c.width*k),Math.round(hit.c.height*k));ctx.restore();return;}
  }
  const bx=ox-14*px,by=oy-21*px,bw=28*px,bh=Math.min(230-by,23*px);
  RX.setTransform(1,0,0,1,0,0);RX.clearRect(bx,by,bw,bh);
  drawGolemChibi(RX,ox,oy,px,dir,pal,P,tint);
  const bb=rigShade(bx,by,bw,bh,dir,!!tint);if(!bb)return;
  const cx0=bx+bb[0],cy0=by+bb[1],cw=bb[2]-bb[0]+1,ch=bb[3]-bb[1]+1;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(RIGC,cx0,cy0,cw,ch,Math.round(x+(cx0-ox)*k),Math.round(y+(cy0-oy)*k),Math.round(cw*k),Math.round(ch*k));
  ctx.restore();
  if(key){if(RCACHE.size>700)RCACHE.clear();const c=document.createElement('canvas');c.width=cw;c.height=ch;c.getContext('2d').drawImage(RIGC,cx0,cy0,cw,ch,0,0,cw,ch);RCACHE.set(key,{c,dx:cx0-ox,dy:cy0-oy});}
}

/* ===== โมเดลเซราฟตาเดียว HD-2D ใหม่ (Seraph · บอสวิหารศักดิ์สิทธิ์) =====
   ปีกเทวทูตซ้อน 2 คู่ (6 แฉกขนนกไล่ระดับ) · อาภรณ์วิหารขลิบทอง · วงรัศมีศักดิ์สิทธิ์ · ดวงตาเทวทูตกลางศีรษะ */
function drawSeraphChibi(ctx,ox,oy,px,pal,P,tint){
  ctx.setTransform(px,0,0,px,ox,oy);ctx.lineJoin='round';
  const T=!!tint,C=c=>tint||c,Dk=(c,m)=>tint||shade(c,m),lw=1/px;
  const cIv=C(pal.c||'#f1ead0'),cCr=C(pal.C||'#d8cfae'),cSh=C(pal.D||'#b8ac98'),cOut=C(pal.o||'#1a1630');
  const cWg=C(pal.w||'#f4f0e0'),cWgM=C(pal.W||'#b9b6c4'),cWgD=C(pal.V||'#8a879c');
  const cIr=C(pal.i||'#7a9a8c'),cIrL=C(pal.I||'#b8d0c0'),cPup=C(pal.p||'#0e0c20'),cSkin=C(pal.k||'#c08a70');
  const cGold=C('#e8c468'),cGoldD=Dk('#e8c468',.62);
  const fill=(col,edge)=>{ctx.fillStyle=col;ctx.fill();if(edge&&!T){ctx.strokeStyle=edge;ctx.lineWidth=lw;ctx.stroke();}};
  const poly=(pts,col,edge)=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);ctx.closePath();fill(col,edge);};
  const ell=(cx,cy,rx,ry,col,edge,rot=0)=>{ctx.beginPath();ctx.ellipse(cx,cy,Math.max(.1,rx),Math.max(.1,ry),rot,0,7);fill(col,edge);};
  const cap=(a,b,ra,rb,col,edge)=>{const dx=b[0]-a[0],dy=b[1]-a[1],an=Math.atan2(dy,dx),H=Math.PI/2;ctx.beginPath();ctx.arc(a[0],a[1],ra,an+H,an+3*H);ctx.arc(b[0],b[1],rb,an-H,an+H);ctx.closePath();fill(col,edge);};

  const wg=P.wg||0,atk=P.atk||0,beam=P.beam||0,weak=P.weak||0,dir=P.dir||-1;
  const spread=atk===1?1.12:atk===2?1.2:1.0,flap=wg*.6;

  // 1) ปีกขนนกคู่ใหญ่โค้งด้านข้าง (ตามภาพต้นแบบ: ปีกเดียวโค้งสูงข้างศีรษะและไล่ชั้นขนนก)
  for(const sd of[-1,1]){
    const wx=sd*4.2,wy=-15.5;
    const topX=sd*(11.2*spread),topY=-22.5-flap*.8;
    const outX=sd*(14.5*spread),outY=-12.0-flap*.4;
    const botX=sd*(12.2*spread),botY=-4.2+flap*.3;
    poly([[wx,wy],[sd*7.6,-21.8-flap*.6],[topX,topY],[outX,outY],[botX,botY],[sd*7.2,-6.5],[wx,wy+5.0]],cWgD,cOut);
    poly([[wx,wy+.5],[sd*7.4,-20.8-flap*.6],[topX-sd*.9,topY+1.1],[outX-sd*1.2,outY-.4],[botX-sd*1.2,botY-.9],[sd*6.8,-7.4]],cWgM);
    poly([[wx+.2*sd,wy+1.0],[sd*7.0,-19.2-flap*.5],[topX-sd*2.0,topY+2.4],[outX-sd*2.6,outY-.6],[sd*9.2*spread,-8.2],[sd*6.0,-8.8]],cWg);
    for(let i=0;i<5;i++){
      const fy=-19.8+i*3.0-flap*(1-i*.15),fx=sd*(12.8-i*.35)*spread;
      poly([[fx-sd*2.4,fy],[fx+sd*1.0,fy-.7],[fx+sd*.2,fy+1.5]],i%2?cWg:cWgM,cOut);
    }
  }

  // 2) เสื้อคลุมยาวสีครีม (ทรงเอ-ไลน์ เรียบ มีสาบเสื้อกลางและกระดุม 2 เม็ด)
  const rSway=wg*.4;
  poly([[-3.8,-14.2],[3.8,-14.2],[5.8,-5.0],[6.4+rSway,-.4],[3.2,.3],[0,-.2],[-3.2,.3],[-6.4+rSway,-.4],[-5.8,-5.0]],cIv,cOut);
  poly([[-5.5,-5.2],[-3.8,-14.0],[-2.5,-14.0],[-3.6,-5.2],[-4.6,-.2],[-6.1+rSway,-.5]],cCr);
  poly([[5.5,-5.2],[3.8,-14.0],[2.5,-14.0],[3.6,-5.2],[4.6,-.2],[6.1+rSway,-.5]],cSh);
  if(!T){
    // สาบเสื้อกลาง + กระดุม 2 เม็ดด้านขวาของสาบ
    ctx.strokeStyle=cSh;ctx.lineWidth=lw*.95;
    ctx.beginPath();ctx.moveTo(0,-13.4);ctx.lineTo(0,-.3);ctx.stroke();
    for(const by of[-10.4,-7.0]){
      ell(1.3,by,.75,.75,cIv,cOut);
    }
  }

  // ปกคอเสื้อทรงกลม
  poly([[-4.2,-14.6],[0,-15.2],[4.2,-14.6],[4.0,-13.0],[0,-12.5],[-4.0,-13.0]],cCr,cOut);
  poly([[-3.6,-14.3],[0,-14.8],[3.6,-14.3],[3.4,-13.4],[0,-13.0],[-3.4,-13.4]],cIv);

  // 3) แขนเสื้อยาวและมือสีเนื้อโผล่ปลายแขน
  for(const sd of[-1,1]){
    const sh=[sd*3.9,-12.8];
    const hd=atk===1?[sd*6.5,-14.8]:atk===2?[sd*7.5,-9.6]:[sd*6.2,-6.5+wg*.3];
    ell(hd[0],hd[1]+1.1,1.15,1.15,cSkin,cOut);
    cap(sh,hd,1.55,1.85,cIv,cOut);
    if(!T&&(atk===1||beam)){
      ell(hd[0],hd[1]+1.1,1.5,1.5,'rgba(255,242,168,.4)');
    }
  }

  // 4) ศีรษะกลมและดวงตาขนาดใหญ่กลางศีรษะ (ไม่มีรัศมีหรือมงกุฎ)
  const hy=-19.4;
  ell(0,hy,5.2,5.0,cIv,cOut);
  if(!T){
    ctx.fillStyle=cCr;ctx.beginPath();ctx.ellipse(.8,hy+.8,4.1,3.9,0,0,7);ctx.fill();
    ctx.fillStyle=cIv;ctx.beginPath();ctx.ellipse(-.4,hy-.4,4.2,4.0,0,0,7);ctx.fill();
  }
  ell(0,hy,3.35,3.45,'#e8e6dc',cOut);
  ell(0,hy,2.75,2.85,weak?'#7af0c0':cIr,cOut);
  ell(0,hy-.15,2.05,2.15,weak?'#c8fff0':cIrL);
  const pxOff=dir*.2,pw=beam?1.15:.8,ph=beam?2.2:2.0;
  ell(pxOff,hy,pw,ph,cPup);
  if(!T){
    ctx.fillStyle='#ffffff';
    ctx.fillRect(-1.4,hy-1.6,1.1,1.1);
    ctx.fillRect(.8,hy+.9,.45,.45);
    if(beam||atk===1){
      ell(pxOff,hy,.45,1.1,'#e8fbff');
    }
  }
  ctx.setTransform(1,0,0,1,0,0);
}
function drawSeraphHD(ctx,pal,x,y,sc,flip,tint,f){
  const px=sc>=4?4:3,ox=135,oy=212,k=(sc/px)*(sc>=8?1:1.18),dir=f&&f.dir?f.dir:1;
  const t=(typeof G!=='undefined'&&G.t)||0;
  const P={
    wg:Math.round(Math.sin(t*.08)*3)/3,
    atk:f&&f.state==='attack'?(f.phase==='startup'?1:f.phase==='active'?2:3):0,
    beam:f&&f.state==='attack'&&f.move&&f.move.beam?1:0,
    weak:f&&f.weakT>0?1:0,
    dir
  };
  let key=null;
  if(!tint){
    key='SER|'+dir+'|'+P.wg+','+P.atk+','+P.beam+','+P.weak+'|'+px;
    const hit=RCACHE.get(key);
    if(hit){ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(hit.c,Math.round(x+hit.dx*k),Math.round(y+hit.dy*k),Math.round(hit.c.width*k),Math.round(hit.c.height*k));ctx.restore();return;}
  }
  const bx=ox-19*px,by=oy-31*px,bw=38*px,bh=Math.min(230-by,33*px);
  RX.setTransform(1,0,0,1,0,0);RX.clearRect(bx,by,bw,bh);
  drawSeraphChibi(RX,ox,oy,px,pal,P,tint);
  const bb=rigShade(bx,by,bw,bh,-1,!!tint);if(!bb)return;
  const cx0=bx+bb[0],cy0=by+bb[1],cw=bb[2]-bb[0]+1,ch=bb[3]-bb[1]+1;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(RIGC,cx0,cy0,cw,ch,Math.round(x+(cx0-ox)*k),Math.round(y+(cy0-oy)*k),Math.round(cw*k),Math.round(ch*k));
  ctx.restore();
  if(key){if(RCACHE.size>700)RCACHE.clear();const c=document.createElement('canvas');c.width=cw;c.height=ch;c.getContext('2d').drawImage(RIGC,cx0,cy0,cw,ch,0,0,cw,ch);RCACHE.set(key,{c,dx:cx0-ox,dy:cy0-oy});}
}
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
function pill(x,y,txt,col='#7ad8ff'){
  D.font='700 14px Kanit,Sarabun,sans-serif';const w=D.measureText(txt).width+22;x=Math.max(w/2+4,Math.min(D.canvas.width-w/2-4,x));
  const pg=D.createLinearGradient(0,y-13,0,y+13);pg.addColorStop(0,'rgba(18,44,104,.94)');pg.addColorStop(1,'rgba(6,15,44,.96)');
  D.fillStyle=pg;rrect(x-w/2,y-12,w,24,4);D.fill();
  D.strokeStyle=col;D.lineWidth=1.4;rrect(x-w/2,y-12,w,24,4);D.stroke();
  D.strokeStyle='rgba(255,217,138,.35)';D.lineWidth=1;rrect(x-w/2+2,y-10,w-4,20,3);D.stroke();
  D.fillStyle='#f4f9ff';D.textAlign='center';D.textBaseline='middle';D.fillText(txt,x,y+1);
}
function lighting(ls,dark){
  L.globalCompositeOperation='source-over';L.clearRect(0,0,W,H);L.fillStyle=dark;L.fillRect(0,0,W,H);
  L.globalCompositeOperation='destination-out';
  for(const l of ls){const gr=L.createRadialGradient(l.x,l.y,0,l.x,l.y,l.r);gr.addColorStop(0,'rgba(0,0,0,.92)');gr.addColorStop(.5,'rgba(0,0,0,.65)');gr.addColorStop(1,'rgba(0,0,0,0)');L.fillStyle=gr;L.fillRect(l.x-l.r,l.y-l.r,l.r*2,l.r*2);}
  L.globalCompositeOperation='source-over';g.drawImage(lc,0,0);
  g.globalCompositeOperation='screen';g.globalAlpha=.18;   /* แสงสีแบบนุ่มนวล สบายตา ไม่แสบตา */
  for(const l of ls)if(l.c){const gr=g.createRadialGradient(l.x,l.y,0,l.x,l.y,l.r*.85);gr.addColorStop(0,l.c);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(l.x-l.r,l.y-l.r,l.r*2,l.r*2);}
  g.globalCompositeOperation='source-over';g.globalAlpha=1;
}
function drawTorch(ctx,x,y,s=1){
  const t=G.t,sw=Math.sin(t*.22+x)*s*.7,fl=.85+Math.sin(t*.31+x*.7)*.15;
  ctx.save();
  // โคมเหล็กติดผนังและด้ามคบเพลิง
  ctx.fillStyle='#261c16';ctx.fillRect(x-1.2*s,y+.5*s,2.4*s,4.8*s);
  ctx.fillStyle='#5c4838';ctx.fillRect(x-1.8*s,y,3.6*s,1.2*s);ctx.fillRect(x-1.4*s,y+3.6*s,2.8*s,.9*s);
  // รัศมีแสงอุ่นนุ่มๆ รอบเปลวไฟ (ความทึบต่ำ สบายตา)
  const hr=9*s*fl,gr=ctx.createRadialGradient(x+sw*.3,y-2.2*s,0,x,y-2*s,hr);
  gr.addColorStop(0,'rgba(255,180,85,.24)');gr.addColorStop(.55,'rgba(255,120,45,.10)');gr.addColorStop(1,'rgba(255,100,30,0)');
  ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y-2*s,hr,0,7);ctx.fill();
  // เปลวไฟ 3 ชั้นทรงหยดน้ำพริ้วตามลม
  ctx.fillStyle='rgba(235,105,35,.82)';ctx.beginPath();ctx.ellipse(x+sw*.35,y-2.1*s,2.1*s*fl,3.0*s*fl,sw*.08,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,185,80,.88)';ctx.beginPath();ctx.ellipse(x+sw*.25,y-1.8*s,1.35*s*fl,2.1*s*fl,sw*.06,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,238,185,.85)';ctx.beginPath();ctx.ellipse(x+sw*.15,y-1.3*s,.75*s,1.2*s,0,0,7);ctx.fill();
  // ประกายสะเก็ดไฟลอยขึ้นเบาๆ
  for(let i=0;i<2;i++){const p=((t*.04+i*.5+x*.13)%1),ex=x+Math.sin(t*.12+i*3+x)*2.2*s,ey=y-2.5*s-p*7*s;
    ctx.globalAlpha=(1-p)*.55;ctx.fillStyle=i?'#ffb85a':'#ffe29a';ctx.fillRect(ex,ey,s*.9,s*.9);}
  ctx.restore();
}
const toastEl=$('#toast');let toastT=null;
function toast(t,ms=2400){toastEl.innerHTML=t;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>toastEl.classList.remove('on'),ms);}
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
