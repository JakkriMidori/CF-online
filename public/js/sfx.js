/* ===================== เสียงเอฟเฟกต์ + เสียงบรรยากาศ =====================
   - ไฟล์เสียงใน assets/sfx/*.mp3 (สร้างเองด้วย tools/gen_sfx.py + เสียง UI ของ Kenney แบบ CC0)
   - ถ้าโหลดไฟล์ไม่ได้ จะกลับไปใช้เสียงสังเคราะห์เดิมใน core.js อัตโนมัติ
   - SND.vol = ระดับเสียงหลัก (เมนูหยุดเกม → "เสียง") · เปิดเกมใหม่ทุกครั้งเริ่มที่ 10%
   ===================================================================== */
const _loadVol=(k,def)=>{try{const v=localStorage.getItem(k);return v!==null&&v!==''&&!isNaN(+v)?Math.max(0,Math.min(1,+v)):def;}catch(e){return def;}};
const SND={
  vol:_loadVol('cf_vol',.1),   // ค่าเริ่มต้นเสียงหลัก 10% (จำค่าที่ผู้เล่นปรับล่าสุดในเมนูตั้งค่า)
  sfxVol:_loadVol('cf_sfx',1),musVol:_loadVol('cf_mus',1),ambVol:_loadVol('cf_amb',1),
  buf:{},master:null,amb:null,ambName:'',_ambLv:.55,_musLv:.4,booted:false,last:{},
  files:['swing','swing_heavy','dodge','hit','hit_big','crit','block','parry','perfect','jump','land','ko','smash','flash','fire','ice','thunder','cast','heal','status',
    'pick','loot_normal','loot_rare','loot_epic','loot_legendary','loot_god','craft','craft_ok','fail','talk','coin','door','step_grass','step_stone','win','level',
    'ui_cursor','ui_confirm','ui_open','ui_cancel','ui_error','amb_town','amb_cave','amb_lava','amb_ice','amb_tower','bgm_town','bgm_boss','bgm_silva','bgm_bbqy','bgm_aether'],
  out(){return this.master||(AC&&AC.destination);},
  boot(){if(this.booted||!AC)return;this.booted=true;this.master=AC.createGain();this.master.gain.value=this.vol;this.master.connect(AC.destination);
    for(const n of this.files)fetch('assets/sfx/'+n+'.mp3').then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status)).then(b=>AC.decodeAudioData(b)).then(d=>{this.buf[n]=d;}).catch(()=>{});},
  play(n,o={}){if(!AC||!this.buf[n]||this.vol<=0||this.sfxVol<=0)return false;const now=AC.currentTime;if(o.gap&&this.last[n]&&now-this.last[n]<o.gap)return true;this.last[n]=now;
    try{const s=AC.createBufferSource(),gn=AC.createGain();s.buffer=this.buf[n];s.playbackRate.value=(o.rate||1)*(1+(Math.random()-.5)*(o.vary??.08));
      gn.gain.value=(o.vol??1)*this.sfxVol;s.connect(gn);gn.connect(this.out());s.start(now+(o.delay||0));}catch(e){return false;}return true;},
  setVol(v){this.vol=Math.max(0,Math.min(1,+v||0));try{localStorage.setItem('cf_vol',String(this.vol));}catch(e){}if(this.master&&AC)this.master.gain.setTargetAtTime(this.vol,AC.currentTime,.05);},
  setChannel(ch,v){if(!['sfx','mus','amb'].includes(ch))return;const val=Math.max(0,Math.min(1,+v||0));this[ch+'Vol']=val;try{localStorage.setItem('cf_'+ch,String(val));}catch(e){}
    if(ch==='amb'&&this.amb&&this.amb.g&&AC)this.amb.g.gain.setTargetAtTime(this._ambLv*val,AC.currentTime,.05);
    if(ch==='mus'&&this.mus&&this.mus.g&&AC)this.mus.g.gain.setTargetAtTime(this._musLv*val,AC.currentTime,.05);},
  cycle(){const st=[1,.7,.4,.1,0],i=st.findIndex(v=>Math.abs(v-this.vol)<.05);this.setVol(st[(i+1)%st.length]);this.play('ui_confirm');},
  ambient(n,level=.55){this._ambLv=level;if(!AC||n===this.ambName&&this.amb)return;if(!this.buf[n]&&n)return;const now=AC.currentTime;
    if(this.amb){const a=this.amb;a.g.gain.setTargetAtTime(0,now,.4);setTimeout(()=>{try{a.s.stop();}catch(e){}},2500);this.amb=null;}
    this.ambName=n;if(!n)return;
    const s=AC.createBufferSource(),g=AC.createGain();s.buffer=this.buf[n];s.loop=true;s.loopStart=.06;s.loopEnd=s.buffer.duration-.03;
    g.gain.value=0;g.gain.setTargetAtTime(level*this.ambVol,now,.8);s.connect(g);g.connect(this.out());s.start(now,.06);this.amb={s,g};},
  // เพลงประกอบ (วนซ้ำ) แยกช่องจากเสียงบรรยากาศ: bgm_town = ในเมือง · bgm_boss = สู้บอส/ห้องบอส
  musicName:'',mus:null,
  music(n,level=.4){this._musLv=level;if(!AC||(n===this.musicName&&this.mus))return;if(n&&!this.buf[n])return;const now=AC.currentTime;
    if(this.mus){const m=this.mus;m.g.gain.setTargetAtTime(0,now,.5);setTimeout(()=>{try{m.s.stop();}catch(e){}},3000);this.mus=null;}
    this.musicName=n;if(!n)return;
    const s=AC.createBufferSource(),g=AC.createGain();s.buffer=this.buf[n];s.loop=true;
    g.gain.value=0;g.gain.setTargetAtTime(level*this.musVol,now,.8);s.connect(g);g.connect(this.out());s.start(now);this.mus={s,g};}
};
/* เปิดเกมด้วยการดับเบิลคลิก index.html (file://): เบราว์เซอร์บล็อก fetch ไฟล์เสียง
   → ใช้ <audio> แทน (เล่นไฟล์ในเครื่องได้) ทั้งเสียงเอฟเฟกต์ เสียงบรรยากาศ และเพลง */
if(location.protocol==='file:'){
  const vc=v=>Math.max(0,Math.min(1,v));
  Object.assign(SND,{el:{},
    boot(){if(this.booted)return;this.booted=true;
      for(const n of this.files){const a=new Audio();a.preload='auto';a.src='assets/sfx/'+n+'.mp3';
        a.addEventListener('canplaythrough',()=>{this.buf[n]=a;},{once:true});a.load();this.el[n]=a;}},
    play(n,o={}){const a=this.buf[n];if(!a||this.vol<=0||this.sfxVol<=0)return false;const now=performance.now()/1000;
      if(o.gap&&this.last[n]&&now-this.last[n]<o.gap)return true;this.last[n]=now;
      try{const c=a.cloneNode();c.volume=vc(this.vol*this.sfxVol*(o.vol??1));c.playbackRate=(o.rate||1)*(1+(Math.random()-.5)*(o.vary??.08));
        const go=()=>c.play().catch(()=>{});o.delay?setTimeout(go,o.delay*1000):go();}catch(e){return false;}return true;},
    _loop(slot,nameKey,ch,n,level){if(n===this[nameKey]&&this[slot])return;if(n&&!this.buf[n])return;
      const old=this[slot];if(old){const t0=old.a.volume;let k=0;const iv=setInterval(()=>{k++;old.a.volume=vc(t0*(1-k/10));if(k>=10){clearInterval(iv);old.a.pause();}},150);this[slot]=null;}
      this[nameKey]=n;if(!n)return;const a=this.buf[n].cloneNode();a.loop=true;a.volume=0;a.play().catch(()=>{});
      const L={a,level,ch};this[slot]=L;let k=0;const iv=setInterval(()=>{k++;if(this[slot]!==L){clearInterval(iv);return;}a.volume=vc(this.vol*(this[ch+'Vol']??1)*level*k/10);if(k>=10)clearInterval(iv);},120);},
    ambient(n,level=.55){this._loop('amb','ambName','amb',n,level);},
    music(n,level=.4){this._loop('mus','musicName','mus',n,level);},
    _syncEl(){for(const L of [this.amb,this.mus])if(L)L.a.volume=vc(this.vol*(this[L.ch+'Vol']??1)*L.level);},
    setVol(v){this.vol=vc(+v||0);try{localStorage.setItem('cf_vol',String(this.vol));}catch(e){}this._syncEl();},
    setChannel(ch,v){if(!['sfx','mus','amb'].includes(ch))return;const val=vc(+v||0);this[ch+'Vol']=val;try{localStorage.setItem('cf_'+ch,String(val));}catch(e){}this._syncEl();}
  });
}
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
(()=>{const SEL='.mrow,.btn,.talc,.diffc,.it,.eslot,.rcp,.rune,.cslot,.sw,.cb,.mnode,.wm-node,.wm-quest,.wm-fbtn,.wm-dclose,#fleeBtn,.tbtns button';let lastEl=null;
  document.addEventListener('pointerover',e=>{const el=e.target.closest&&e.target.closest(SEL);if(el&&el!==lastEl&&!el.disabled){lastEl=el;SFX.ui('cursor');}if(!el)lastEl=null;});
  document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest(SEL);if(el&&!el.disabled)SFX.ui('confirm');},true);})();
// เสียงบรรยากาศตามโซน
const AMB_OF={town:'amb_town',arena:'amb_town',cave:'amb_cave',stone:'amb_cave',crystal:'amb_cave',lava:'amb_lava',lavaboss:'amb_lava',ice:'amb_ice',frost:'amb_ice',tower:'amb_tower',sanctum:'amb_tower',cathedral:'amb_tower'};
function sndTick(){if(!SND.booted||G.t%30)return;let n='amb_town',lv=.4;
  try{if(G.mode==='title')lv=.25;else{const inB=BT&&(G.mode==='battle'||G.mode==='trans');n=(!inB&&Z&&Z.theme==='spire')?'amb_tower':(AMB_OF[fxBiome(inB)]||'amb_cave');if(inB)lv=.3;}}catch(e){}
  if(n!==SND.ambName)SND.ambient(n,lv);
  let m=null;try{const inB=G.mode==='battle'||G.mode==='trans';
    if(inB&&BT&&((BT.def&&BT.def.bgm)||(BT.e&&BT.e.kind==='spire_b1')))m=(BT.def&&BT.def.bgm)||'bgm_silva';
    else if((inB&&BT&&BT.def&&BT.def.boss)||(Z&&Z.bossRoom))m='bgm_boss';else if(!inB&&Z&&Z.id==='town')m='bgm_town';}catch(e){}
  SND.music(m,(m==='bgm_silva'||m==='bgm_bbqy'||m==='bgm_aether')?.45:.4);}
