/* ===================== เสียงเอฟเฟกต์ + เสียงบรรยากาศ =====================
   - ไฟล์เสียงใน assets/sfx/*.mp3 (สร้างเองด้วย tools/gen_sfx.py + เสียง UI ของ Kenney แบบ CC0)
   - ถ้าโหลดไฟล์ไม่ได้ จะกลับไปใช้เสียงสังเคราะห์เดิมใน core.js อัตโนมัติ
   - SND.vol = ระดับเสียงหลัก (เมนูหยุดเกม → "เสียง") · เปิดเกมใหม่ทุกครั้งเริ่มที่ 10%
   ===================================================================== */
const SND={
  vol:.1,   // เปิดเกมทุกครั้ง เริ่มที่เสียง 10% อัตโนมัติ (ปรับเพิ่มได้ในเมนู → เสียง)
  buf:{},master:null,amb:null,ambName:'',booted:false,last:{},
  files:['swing','swing_heavy','dodge','hit','hit_big','crit','block','parry','perfect','jump','land','ko','smash','flash','fire','ice','thunder','cast','heal','status',
    'pick','loot_normal','loot_rare','loot_epic','loot_legendary','loot_god','craft','craft_ok','fail','talk','coin','door','step_grass','step_stone','win','level',
    'ui_cursor','ui_confirm','ui_open','ui_cancel','ui_error','amb_town','amb_cave','amb_lava','amb_ice','amb_tower'],
  out(){return this.master||(AC&&AC.destination);},
  boot(){if(this.booted||!AC)return;this.booted=true;this.master=AC.createGain();this.master.gain.value=this.vol;this.master.connect(AC.destination);
    for(const n of this.files)fetch('assets/sfx/'+n+'.mp3').then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status)).then(b=>AC.decodeAudioData(b)).then(d=>{this.buf[n]=d;}).catch(()=>{});},
  play(n,o={}){if(!AC||!this.buf[n]||this.vol<=0)return false;const now=AC.currentTime;if(o.gap&&this.last[n]&&now-this.last[n]<o.gap)return true;this.last[n]=now;
    try{const s=AC.createBufferSource(),gn=AC.createGain();s.buffer=this.buf[n];s.playbackRate.value=(o.rate||1)*(1+(Math.random()-.5)*(o.vary??.08));
      gn.gain.value=o.vol??1;s.connect(gn);gn.connect(this.out());s.start(now+(o.delay||0));}catch(e){return false;}return true;},
  setVol(v){this.vol=Math.max(0,Math.min(1,v));try{localStorage.setItem('cf_vol',String(this.vol));}catch(e){}if(this.master)this.master.gain.setTargetAtTime(this.vol,AC.currentTime,.05);},
  cycle(){const st=[1,.7,.4,.1,0],i=st.findIndex(v=>Math.abs(v-this.vol)<.05);this.setVol(st[(i+1)%st.length]);this.play('ui_confirm');},
  ambient(n,level=.55){if(!AC||n===this.ambName&&this.amb)return;if(!this.buf[n]&&n)return;const now=AC.currentTime;
    if(this.amb){const a=this.amb;a.g.gain.setTargetAtTime(0,now,.4);setTimeout(()=>{try{a.s.stop();}catch(e){}},2500);this.amb=null;}
    this.ambName=n;if(!n)return;
    const s=AC.createBufferSource(),g=AC.createGain();s.buffer=this.buf[n];s.loop=true;s.loopStart=.06;s.loopEnd=s.buffer.duration-.03;
    g.gain.value=0;g.gain.setTargetAtTime(level,now,.8);s.connect(g);g.connect(this.out());s.start(now,.06);this.amb={s,g};}
};
{const _init=initAudio;initAudio=function(){_init();SND.boot();};}
document.addEventListener('pointerdown',()=>initAudio(),{capture:true});
// แทนที่เสียงเดิมด้วยไฟล์เสียง (ถ้าไฟล์ยังไม่พร้อมใช้เสียงสังเคราะห์เดิม)
{const old=Object.assign({},SFX),P=(n,o)=>SND.play(n,o);
  const map={swing:()=>P('swing',{vol:.7,gap:.04}),crit:()=>P('crit'),block:()=>P('block',{vol:.85}),parry:()=>P('parry'),perfect:()=>P('perfect',{vol:.8}),
    pick:()=>P('pick',{vol:.8}),fail:()=>P('fail',{vol:.8}),dodge:()=>P('dodge',{vol:.75}),jump:()=>P('jump',{vol:.6}),talk:()=>P('talk',{vol:.35,gap:.05,vary:.25}),
    ko:()=>P('ko'),win:()=>P('win',{vary:0}),level:()=>P('level',{vary:0}),smash:()=>P('smash'),flash:()=>P('flash',{vol:.85}),fire:()=>P('fire',{vol:.85}),status:()=>P('status',{vol:.7}),
    craft:()=>{P('craft',{vol:.8});return P('craft_ok',{delay:.42,vary:0});},
    hit:big=>P(big?'hit_big':'hit',{vol:big?1:.85}),
    loot:r=>P('loot_'+({normal:'normal',rare:'rare',epic:'epic',legendary:'legendary',god:'god',unique:'legendary'}[r]||'normal'),{vary:0})};
  for(const k in map){const f=map[k];SFX[k]=(...a)=>{if(!f(...a)&&old[k])old[k](...a);};}
  SFX.ui=k=>P('ui_'+k,{vol:k==='cursor'?.45:.7,gap:k==='cursor'?.05:.02,vary:.04});
  SFX.step=bio=>P(bio==='town'?'step_grass':'step_stone',{vol:.28,vary:.3});
  SFX.magic=el=>P({fire:'fire',lightning:'thunder',ice:'ice',poison:'cast',shadow:'cast',weapon:'cast'}[el]||'cast',{vol:.8});
  SFX.heal=()=>P('heal',{vol:.8});SFX.coin=()=>P('coin',{vol:.7});SFX.door=()=>P('door',{vol:.8});SFX.land=()=>P('land',{vol:.6});}
// เสียง UI: ชี้ = ติ๊ก · คลิก = กริ๊ง
(()=>{const SEL='.mrow,.btn,.talc,.diffc,.it,.eslot,.rcp,.rune,.cslot,.sw,.cb,.mnode,#fleeBtn,.tbtns button';let lastEl=null;
  document.addEventListener('pointerover',e=>{const el=e.target.closest&&e.target.closest(SEL);if(el&&el!==lastEl&&!el.disabled){lastEl=el;SFX.ui('cursor');}if(!el)lastEl=null;});
  document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest(SEL);if(el&&!el.disabled)SFX.ui('confirm');},true);})();
// เสียงบรรยากาศตามโซน
const AMB_OF={town:'amb_town',arena:'amb_town',cave:'amb_cave',stone:'amb_cave',crystal:'amb_cave',lava:'amb_lava',lavaboss:'amb_lava',ice:'amb_ice',frost:'amb_ice',tower:'amb_tower',sanctum:'amb_tower',cathedral:'amb_tower'};
function sndTick(){if(!AC||!SND.booted||G.t%30)return;let n='amb_town',lv=.4;
  try{if(G.mode==='title')lv=.25;else{const inB=BT&&(G.mode==='battle'||G.mode==='trans');n=AMB_OF[fxBiome(inB)]||'amb_cave';if(inB)lv=.3;}}catch(e){}
  if(n!==SND.ambName)SND.ambient(n,lv);}
