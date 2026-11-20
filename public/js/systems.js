'use strict';
/* ============================================================
   SYSTEMS — Stats · Combat · Status · Items/Equipment/Inventory ·
   Crafting · Loot · Skills · Progression · Encyclopedia · Quests · Save
   (each maps 1:1 to a BP_*Component in the Unreal spec)
   ============================================================ */
const G={miniOff:true,lootLog:[],pity:{},shopCD:{},gidSeq:0,mode:'title',t:0,shake:0,tt:0,talent:null,level:1,xp:0,points:0,alloc:{str:0,agi:0,int:0,vit:0,luk:0},
  hp:0,mp:0,bag:[],mats:{},gold:0,eq:{weapon:null,helmet:null,armor:null,gloves:null,pants:null,boots:null,ring1:null,ring2:null,necklace:null},
  known:new Set(),found:new Set(),skills:{learned:new Set(),slots:[null,null,null,null],cd:{},bound:null,lv:{}},mastery:{},ency:{},q:{},flags:{},uid:1,
  stats:{maxCombo:0,parries:0,fullCombos:0,crafts:0,craftOk:0},dmgLog:[],god:false};

/* ---------------- CharacterStats ---------------- */
const BASE_ATTR={str:10,agi:10,int:10,vit:10,luk:10};
const ATTRN={str:'STR',agi:'AGI',int:'INT',vit:'VIT',luk:'LUK'};
const itemByUid=u=>G.bag.find(i=>i.uid===u);
const equipped=()=>SLOTS.map(s=>G.eq[s]&&itemByUid(G.eq[s])).filter(Boolean);
function itemStats(it){
  const b=BASES[it.base],R=RARITY[it.rar],lm=1+.1*(it.ilvl-1),lvm=1+.0075*((it.lv||1)-1),legm=it.rar==='legendary'?1+.15*((it.legLv||1)-1):1,s={};
  const add=(k,v)=>s[k]=(s[k]||0)+v;
  if(b.atk)add('watk',Math.round(b.atk*R.mult*lm*lvm*legm));if(b.matk)add('wmatk',Math.round(b.matk*R.mult*lm*lvm*legm));
  if(b.def)add('def',Math.round(b.def*R.mult*lm*lvm*legm));if(b.mdef)add('mdef',Math.round(b.mdef*R.mult*lm*lvm*legm));
  if(b.implicit)for(const k in b.implicit)add(k,b.implicit[k]*(b.implicitRaw||(AFFIX[k]&&AFFIX[k].pct)?1:Math.round(R.mult*lm)));   // implicitRaw = ค่าคงที่ ไม่คูณระดับ
  for(const a of it.affixes)add(a.k,a.v);
  // ตีบวก: ทุกค่าของไอเทม (ค่าหลัก + ค่าติดตัว + affix) — ค่าแบบหน่วย +1.5 ต่อขั้น · ค่าแบบ % +1.5% ของค่านั้นต่อขั้น (ไม่รวมรูน)
  const n=it.enh||0;if(n)for(const k in s){const pc=(AFFIX[k]&&AFFIX[k].pct)||k.endsWith('Pct')||k.endsWith('Chance');s[k]=pc?Math.round(s[k]*(1+CONFIG.enhPct*n)*10000)/10000:Math.round((s[k]+CONFIG.enhFlat*n)*10)/10;}
  for(const rk of it.sockets||[]){const m=rk&&MATS[rk];if(m&&m.rune)for(const k in m.rune)add(k,m.rune[k]);}
  return s;
}
function setCounts(list){const c={};for(const it of list){const st=BASES[it.base].set;if(st)c[st]=(c[st]||0)+1;}return c;}
function activeSetBonuses(list){const out=[];const c=setCounts(list);for(const id in c)for(const n in SETS[id].b)if(c[id]>=+n)out.push({set:id,n:+n,b:SETS[id].b[n]});return out;}
/* ลานประลอง PvP: ชุดของแต่ละคน (เลเวล ค่าพลัง อุปกรณ์ สกิล) ส่งเป็น JSON ได้ */
function vsLoadout(){
  const S=(typeof StatSync!=='undefined'&&StatSync.get())||Stats.player();
  return{name:((G.look&&G.look.name)||'').trim(),S:Object.assign({},S,{passives:[...(S.passives||[])],flat:undefined}),level:G.level,talent:G.talent||null,
    look:Equip.look(),wpn:Equip.weaponType(),
    skills:G.skills.slots.slice(0,4).map(id=>(id&&SKILLS[id]&&!SKILLS[id].bossOnly)?id:null)};}
function vsLoadoutToS(lo){return Object.assign({},lo.S,{passives:new Set(lo.S.passives||[]),res:Object.assign({},lo.S.res||{})});}
const Stats={
  derive(attr,flat,lv,talent,passives){
    const S={level:lv,...attr};
    S.maxHP=500+attr.vit*20+lv*50+(flat.hp||0);
    const TP=TALENT_PASSIVE[talent]||{};
    S.maxMP=Math.round((100+attr.int*10+(flat.mp||0))*(1+(TP.maxMPPct||0)));
    S.maxSTA=100+(attr.agi-10)*2;
    S.critRate=Math.min(CONFIG.critCap,.05+attr.luk*.002+(flat.critRate||0)+(TP.critRate||0));
    S.critDmg=Math.min(CONFIG.critDmgCap,1.5+attr.luk*.01+(flat.critDmg||0)+(TP.critDmg||0));
    S.mcritDmg=TP.mcritDmg||0;                                     // ดาเมจคริติคอลเวทเพิ่ม (บวกกับ critDmg เฉพาะเวท)
    const DV=CONFIG.derived,t10=v=>Math.floor((v||0)/10);
    S.def=10+(flat.def||0)+t10(attr.agi)*DV.agiPer10Def;S.mdef=10+(flat.mdef||0);
    S.evasion=Math.min(DV.evaCap,t10(attr.agi)*DV.agiPer10Eva+(flat.evasion||0));
    S.apen=(flat.apen||0)+(TP.apen||0)+(passives.has('void')?50:0);
    S.mdefShred=passives.has('void')?.2:0;S.mpen=(flat.mpen||0)+(TP.mpen||0);S.mpenPct=Math.min(1,flat.mpenPct||0);   /* เจาะเวท: % ก่อน แล้วหักค่าคงที่ (หลักการเดียวกับเจาะเกราะ) */
    S.apenPct=Math.min(1,flat.apenPct||0);S.blindChance=flat.blindChance||0;S.chaosChance=flat.chaosChance||0;                       // เจาะเกราะ % (คิดก่อนเจาะเกราะแบบค่าคงที่)
    S.pcritRes=Math.min(.75,(flat.pcritRes||0)+t10(S.def)*DV.defPer10Crit);S.mcritRes=Math.min(.75,(flat.mcritRes||0)+t10(S.mdef)*DV.defPer10Crit);   // ต้านคริติคอลกายภาพ / เวท
    S.dr=Math.min(CONFIG.drCap,(flat.dr||0)+(TP.dr||0));
    S.watk=flat.watk||10;S.ap=Math.round(S.watk+attr.str*2+(flat.atk||0));
    S.mpow=Math.round(((flat.wmatk||0)+attr.int*3+(flat.matk||0))*(1+(TP.mpowPct||0)+(flat.mpowPct||0)));S.dmgPct=flat.dmgPct||0;
    S.res={fire:flat.resFire||0,lightning:flat.resLightning||0,poison:flat.resPoison||0,shadow:flat.resShadow||0};
    S.spd=1+(attr.agi-10)*.01;S.passives=passives;
    S.mpRegen=Math.min(CONFIG.mana.recoveryCap,flat.mpRegen||0);S.mpCost=Math.min(CONFIG.mana.costCap,flat.mpCost||0);S.statusRes=Math.min(.75,(flat.statusRes||0)+(TP.statusRes||0)+t10(attr.str)*DV.strPer10Res);
    S.statusChance=(TP.statusChance||0)+(flat.statusChance||0);S.dotPct=flat.dotPct||0;S.talent=talent||null;   // ชุดนักแปรธาตุ: +โอกาสติด / +DoT
    return S;
  },
  player(){
    const list=equipped(),flat={},passives=new Set();
    for(const it of list){const s=itemStats(it);for(const k in s)flat[k]=(flat[k]||0)+s[k];if(it.uniq)passives.add(it.uniq);}
    for(const sb of activeSetBonuses(list))for(const k in sb.b){if(k==='passive')passives.add(sb.b.passive);else if(k!=='d')flat[k]=(flat[k]||0)+sb.b[k];}
    const attr={};for(const k in BASE_ATTR)attr[k]=Math.min(CONFIG.attrMax,BASE_ATTR[k]+G.alloc[k]+(flat[k]||0));
    const S=this.derive(attr,flat,G.level,G.talent,passives);S.flat=flat;
    if(passives.has('phoenix'))S.immuneBurn=1;
    const up=Skills.passiveOf();   // bound Unique passive (scaled by upgrade level)
    if(up){S.uniq=up;if(up.id==='focus')S.critRate=Math.min(CONFIG.critCap,S.critRate+up.v);if(up.id==='manaheart')S.maxMP=Math.round(S.maxMP*(1+up.v));}
    return S;
  },
  /* ลานประลอง: ค่าพลังมาตรฐานเท่ากันทั้งสองฝ่าย ไม่เอาเลเวล/อุปกรณ์/พรสวรรค์จริงมาคิด */
  arena(){const A=CONFIG.arena,attr={};for(const k in BASE_ATTR)attr[k]=BASE_ATTR[k]+A.alloc;const S=this.derive(attr,{},A.level,null,new Set());S.flat={};S.maxHP=A.hp;S.def=A.def;S.mdef=A.def;return S;},
  enemy(def,lv,elite){
    const b=def.base,k=lv-1,em=elite?ELITE:null,D=Diff.cur();
    const out=this.enemyCore(def,lv,elite,b,k,em,D);
    // ค่ารองแบบเดียวกับผู้เล่น: คำนวณจากค่าพลัง (STR/AGI/INT/VIT/LUK) ของศัตรู ด้วย Stats.derive
    const attr=Object.assign({},BASE_ATTR,def.attr||{});for(const a in attr)attr[a]=Math.min(CONFIG.attrMax,attr[a]);
    const P=this.derive(attr,{},lv,null,new Set()),DV=CONFIG.derived,t10=v=>Math.floor((v||0)/10);
    Object.assign(out,attr,{critRate:b.critRate!=null?b.critRate:P.critRate,critDmg:P.critDmg,evasion:P.evasion,statusRes:P.statusRes,spd:P.spd});
    out.def+=t10(attr.agi)*DV.agiPer10Def;
    const bc=def.boss?CONFIG.bossCritRes:0;   // บอสทุกตัวต้านคริเพิ่ม 20%
    if(def.fixedLv){   // บอสเลเวลตายตัว: ค่าใน base คือค่าจริง (บอสท้าประลองไม่คูณความยาก)
      const c=def.challenge;out.maxHP=Math.round(b.hp*(c?1:D.eHP));out.ap=out.mpow=Math.round(b.atk*(c?1:D.eATK));
      if(!c){out.def=b.def+t10(attr.agi)*DV.agiPer10Def;out.mdef=b.mdef;}}
    out.pcritRes=Math.min(.75,t10(out.def)*DV.defPer10Crit+bc);out.mcritRes=Math.min(.75,t10(out.mdef)*DV.defPer10Crit+bc);
    out.chaosChance=def.chaosChance||0;
    return out;
  },
  enemyCore(def,lv,elite,b,k,em,D){
    return{level:lv,maxHP:Math.round(b.hp*(1+.12*k)*(em?em.hp:1)*D.eHP),ap:Math.round(b.atk*(1+.10*k)*(em?em.atk:1)*D.eATK),mpow:Math.round(b.atk*(1+.10*k)*(em?em.atk:1)*D.eATK),
      def:Math.round(b.def+1*k),mdef:Math.round(b.mdef+.8*k),pcritRes:Math.min(.75,Math.floor((b.def+1*k)/10)*CONFIG.derived.defPer10Crit),mcritRes:Math.min(.75,Math.floor((b.mdef+.8*k)/10)*CONFIG.derived.defPer10Crit),evasion:0,critRate:b.critRate||.05,critDmg:1.5,apen:0,mdefShred:0,dr:0,res:Object.assign({},def.res||{}),passives:new Set(),spd:1};
  }
};
/* ---- Difficulty + death penalty (Dark Souls-style bloodstain) ---- */
const Diff={
  cur(){return DIFFICULTY[CONFIG.diffLock||G.diff]||DIFFICULTY.normal;},
  /* called on defeat; returns a message describing what was lost. zone/x/y = where the player fell */
  onDeath(zoneId,x,y){const D=this.cur();
    if(D.death==='gold50'){const lost=Math.floor(G.gold/2);G.gold-=lost;return lost?`เสียทอง ${lost}`:'';}
    if(D.death==='bloodstain'){let msg='';
      if(G.bloodstain)msg=`คราบเลือดเก่าหายถาวร (ทอง ${G.bloodstain.gold} · EXP ${G.bloodstain.xp}) · `;
      const gold=G.gold,xp=G.xp;G.gold=0;G.xp=0;
      G.bloodstain=gold||xp?{zone:zoneId,x,y,gold,xp}:null;
      return msg+(G.bloodstain?`ทอง ${gold} และ EXP ${xp} ตกอยู่ที่จุดตาย — ไปเก็บคืนก่อนตายอีกครั้ง`:'');}
    return'';},
  recover(){const b=G.bloodstain;if(!b)return null;G.bloodstain=null;G.gold+=b.gold;const ups=Prog.gainXP(b.xp);return{gold:b.gold,xp:b.xp,ups};}
};
const enemyLevel=(zoneLv,pl)=>Math.max(1,zoneLv);   // เลเวลมอนคงที่ตามโซน (ไม่ขยับตามเลเวลผู้เล่น)
// เลเวลจริงของศัตรูตัวหนึ่ง: บอสเลเวลตายตัว (fixedLv) ใช้ค่านั้นเลย ไม่งั้นคิดจากโซน (+2 บอส, +1 มินิบอส)
const foeLevel=(def,zoneLv)=>def.fixedLv||enemyLevel(zoneLv,G.level)+(def.boss?2:def.miniboss?1:0);

/* ---------------- Combat (central damage calculation) ----------------
   Order (fixed): 1) Effective DEF = max(0, DEF − ArmorPen)   [magic: M.DEF]
                  2) Base = max(1, Power × Multiplier − EffectiveDEF)
                  3) × Critical Damage (if crit; rate cap 75%)
                  4) × elemental resistance, then status/situational modifiers (stun +20%, full combo, weak point …) — each by name, never twice
                  5) × (1 − Damage Reduction), DR cap 75%
   h:{coef,type:'phys'|'magic',el,ignoreDef,forceCrit,fullCombo,weakPoint,counter,mastery,execute,stunned,berserk} */
function calcDamage(A,T,h){
  const pow=h.type==='magic'?A.mpow:A.ap;
  const defUsed=h.ignoreDef?0:h.type==='magic'?Math.max(0,(T.mdef||0)*(1-Math.min(1,(A.mdefShred||0)+(A.mpenPct||0)+(h.defPen||0)))-(A.mpen||0)):Math.max(0,(T.def||0)*(1-Math.min(1,(A.apenPct||0)+(h.defPen||0)))-(A.apen||0));
  const base=Math.max(1,pow*h.coef-defUsed);let dmg=base*(1+(A.dmgPct||0));
  const crit=!!h.forceCrit||rand()<Math.max(0,Math.min(CONFIG.critCap,A.critRate)-((h.type==='magic'?T.mcritRes:T.pcritRes)||0));
  if(crit)dmg*=Math.min(CONFIG.critDmgCap,A.critDmg+(h.type==='magic'?(A.mcritDmg||0):0));
  const res=h.trueDmg?0:clamp((T.res&&T.res[h.el])||0,-1,.95);dmg*=1-res;
  const mods={};
  if(h.stunned)mods.stun=1+CONFIG.stunBonus;
  if(h.fullCombo)mods.fullCombo=1+CONFIG.fullComboBonus;
  if(h.weakPoint)mods.weakPoint=h.weakPoint;
  if(h.counter)mods.counter=1.1;
  if(h.mastery)mods.mastery=1+h.mastery;
  if(h.execute)mods.execute=1.3;
  if(h.berserk)mods.berserk=1+h.berserk;
  if(h.lvDiff&&Math.abs(h.lvDiff)>=5){const gap=Math.abs(h.lvDiff);
    const lm=h.lvDiff<0?Math.max(h.isP?.05:.15,1/(1+Math.pow((gap-4)/14,1.6))):(h.isP?Math.min(1.80,1+(gap-4)/18*.30):Math.min(3.00,1+(gap-4)/18*.45));
    mods.lvDiff=Math.round(lm*1000)/1000;
  }
  for(const k in mods)dmg*=mods[k];
  const dr=h.trueDmg?0:Math.min(CONFIG.drCap,(T.dr||0)+(T.buffDr||0));dmg*=1-dr;
  return{dmg:Math.max(1,Math.round(dmg)),crit,mods,dr,res,defUsed,base:Math.round(base)};
}
const incoming=(T,amount)=>Math.max(1,Math.round(amount*(1-Math.min(CONFIG.drCap,(T.dr||0)+(T.buffDr||0)))));

/* ---------------- ManaComponent (single centralized regen) ---------------- */
const Mana={
  rateBonus(S){return Math.min(CONFIG.mana.recoveryCap,(S&&S.mpRegen)||0);},
  /* call once per frame for an owner {mp,mpAcc}; normal attacks never restore MP */
  regen(o,S,inCombat){const every=inCombat?CONFIG.mana.combatEvery:CONFIG.mana.outEvery;o.mpAcc=(o.mpAcc||0)+(1+this.rateBonus(S))/every;
    const n=Math.floor(o.mpAcc+1e-9);if(n>=1){o.mpAcc=Math.max(0,o.mpAcc-n);o.mp=Math.min(S.maxMP,o.mp+n);}if(o.mp>=S.maxMP){o.mp=S.maxMP;o.mpAcc=0;}},
  cost(id,S){const s=SKILLS[id];if(s&&s.mpPct)return Math.max(1,Math.round(((S&&S.maxMP)||0)*s.mpPct));if(!s||!s.mp)return 0;return Math.max(0,Math.round(s.mp*(1-Math.min(CONFIG.mana.costCap,(S&&S.mpCost)||0))));},
  potionIds:['mp_s','mp_m','mp_l','mp_x'],
  /* restores MP from a mana potion; shared 10 s cooldown; never exceeds Max MP */
  drink(o,S,id){const m=MATS[id];if(typeof Z!=='undefined'&&Z&&Z.noPotion)return{ok:false,err:'🚫 สนามทดสอบแรงค์ไม่อนุญาตให้ใช้ยา!'};if(!m||!m.manaPotion)return{ok:false,err:'ไม่ใช่ยามานา'};if(!Inv.has(id))return{ok:false,err:'ไม่มี'+m.n};
    if((G.potCD||0)>0)return{ok:false,err:`ยามานาคูลดาวน์ ${Math.ceil(G.potCD/60)} วิ`};if(o.mp>=S.maxMP)return{ok:false,err:'MP เต็มแล้ว'};
    const before=o.mp;o.mp=Math.min(S.maxMP,o.mp+m.manaPotion);Inv.take(id);G.potCD=CONFIG.potionCD;return{ok:true,gained:o.mp-before};},
  bestPotion(o,S){const miss=S.maxMP-o.mp,have=this.potionIds.filter(k=>Inv.has(k));if(!have.length)return null;return have.find(k=>MATS[k].manaPotion>=miss)||have[have.length-1];}
};
/* ---------------- UltimateComponent ---------------- */
const Ult={
  val(f){return(typeof BT!=='undefined'&&BT&&BT.vs&&f)?(f.ult||0):(G.ult||0);},
  /* every gain is keyed by the event that caused it, so one move / one parry can only ever pay out once */
  gain(f,type,key){if(!f)return 0;const vs=typeof BT!=='undefined'&&BT&&BT.vs;if(vs?(!f.isP&&!f.isP2):!f.isP)return 0;
    f.ultKeys=f.ultKeys||new Set();const k=type+':'+key;if(f.ultKeys.has(k))return 0;f.ultKeys.add(k);
    if(vs){const before=f.ult||0;f.ult=Math.min(CONFIG.ult.max,before+CONFIG.ult[type]);return f.ult-before;}
    const before=G.ult||0;G.ult=Math.min(CONFIG.ult.max,before+CONFIG.ult[type]);return G.ult-before;},
  ready(f){return this.val(f)>=CONFIG.ult.cost;},
  spend(f){if(!this.ready(f))return false;if(typeof BT!=='undefined'&&BT&&BT.vs&&f)f.ult-=CONFIG.ult.cost;else G.ult-=CONFIG.ult.cost;return true;}
};
/* ---------------- StatusEffect ---------------- */
const Status={
  init(f){f.st8={poison:null,bleed:null,burn:null,shock:null,stun:null,blind:null,chaos:null,freeze:null};f.stunImm=0;},
  /* โอกาสติดสถานะสุดท้าย = 100% + โบนัสโอกาสติดของผู้ใช้ (Hexweaver +25%) − ค่าต้านของเป้าหมาย (จำกัด 0–100%) */
  chance(src,f,type){const R=Math.min(1,((f.statusRes||{})[type]||0)+((f.S&&f.S.statusRes)||0)),bonus=(src&&src.S&&src.S.statusChance)||0;return clamp(1+bonus-R,0,1);},
  /* returns 'ok' | 'capped' | 'resist' | 'immune' | 'stunned' */
  apply(f,type,stacks=1,src=null,durSec=0){
    const s=f.st8,SS=src&&src.S,rawSec=durSec>0?durSec:(type==='freeze'?8:CONFIG.statusDur/60),adjSec=(src&&src.kind==='duelist'&&(type==='shock'||type==='stun'))?Math.max(.5,rawSec-1.5):rawSec,baseFr=Math.round(adjSec*60),Dur=Math.round(baseFr+(SS&&SS.talent==='hexweaver'?(SS.statusChance||0)*100*CONFIG.statusChanceDur*60:0)),   // เฉพาะ Hexweaver: +0.05 วิ ต่อโอกาสติดสถานะ 1% · freeze เริ่มต้น 8 วิ (480 เฟรม) · bbqy ลดเวลาช็อก/สตั้นลง 1.5 วิ
      R=Math.min(1,((f.statusRes||{})[type]||0)+((f.S&&f.S.statusRes)||0));
    if(R>=1||(type==='burn'&&f.S&&f.S.immuneBurn)||f.statusImm>0)return'immune';   // Iron Wall: กันสถานะทุกชนิด
    const chance=Status.chance(src,f,type);                 // คำนวณใหม่ทุกครั้งที่ติดสถานะ
    if(chance<1&&rand()>=chance)return'resist';
    const mul=1+((SS&&SS.dotPct)||0),hex=SS&&SS.talent==='hexweaver',T=o=>hex&&o?o.t+Dur:Dur;   // Hexweaver: ติดซ้ำ = เวลาต่อท้าย ไม่มีเพดาน · คนอื่นรีเฟรชเป็นค่าเดิม
    if(type==='poison'||type==='bleed'){
      let any=false;
      for(let i=0;i<stacks;i++){const c=s[type];if(!c){s[type]={stacks:1,t:Dur,tk:0,mul};any=true;}else if(c.stacks<CONFIG.maxStacks){c.stacks++;c.t=T(c);c.mul=Math.max(c.mul||1,mul);any=true;}else if(hex){c.t=T(c);any=true;}}
      return any?'ok':'capped';
    }
    if(type==='burn'){const hadPoison=!!s.poison;s.burn=s.burn?Object.assign(s.burn,{t:T(s.burn),mul:Math.max(s.burn.mul||1,mul)}):{t:Dur,tk:0,mul};
      if(hadPoison&&src){this.apply(f,'poison',2,null);Status.onSynergy&&Status.onSynergy(f,'toxicfire',src);}return'ok';}
    if(type==='shock'){const hadBurn=!!s.burn;s.shock=s.shock?Object.assign(s.shock,{t:T(s.shock),mul:Math.max(s.shock.mul||1,mul)}):{t:Dur,tk:0,mul};
      if(hadBurn&&src){s.burn=null;Status.onSynergy&&Status.onSynergy(f,'plasma',src);}
      this.apply(f,'stun',1,src,durSec);return'ok';}
    if(type==='blind'){s.blind=s.blind?Object.assign(s.blind,{t:T(s.blind)}):{t:Dur,tk:0};return'ok';}   // ตาบอด: โจมตีไม่โดน
    if(type==='chaos'){if(s.chaos)return'capped';s.chaos={t:240,tk:0};return'ok';}   /* โกลาหล: 4 วิ ติดซ้ำไม่ได้ขณะยังมีผล */
    if(type==='freeze'){if(s.freeze){s.freeze.t=Math.max(s.freeze.t,Dur);return'ok';}s.freeze={t:Dur,hits:0,tk:0};return'ok';}   /* แช่แข็ง: 3 วิ · ครบ 5 ฮิตจะน้ำแข็งแตก 2× */
    if(type==='stun'){if(s.stun)return'stunned';if(f.stunImm>0)return'immune';s.stun={t:Dur,tk:0};Status.onStun&&Status.onStun(f);return'ok';}
    return'ok';
  },
  dps(f){let d=0;for(const k in f.st8)if(f.st8[k])d+=this.tickOf(k,f.st8[k]);return d;},
  tickOf(type,o){const c=CONFIG.dot[type];return c?Math.round((c.base+c.per*(((o&&o.stacks)||1)-1))*((o&&o.mul)||1)):0;},   // ตั้งค่าได้ที่ CONFIG.dot
  update(f,onTick){
    const s=f.st8;if(f.stunImm>0)f.stunImm--;if(f.statusImm>0)f.statusImm--;
    for(const k in s){const o=s[k];if(!o)continue;o.t--;o.tk++;
      if(o.tk>=CONFIG.dotTick){o.tk=0;const d=this.tickOf(k,o);if(d&&onTick)onTick(k,d);}
      if(o.t<=0){s[k]=null;if(k==='stun'){f.stunImm=f.stunImmuneAfter||CONFIG.stunImmuneAfter;Status.onStunEnd&&Status.onStunEnd(f);}}}
  },
  cleanse(f){for(const k in f.st8)f.st8[k]=null;},
  list(f){return Object.keys(f.st8).filter(k=>f.st8[k]).map(k=>({k,stacks:f.st8[k].stacks||0,hits:f.st8[k].hits||0,t:f.st8[k].t}));}
};

/* ---------------- Items / Equipment / Inventory ---------------- */
// ไอเทมระดับตายตัว (fixRar) สุ่มได้เฉพาะตอนสุ่มได้ระดับนั้นพอดี
const rarPool=(pool,rar,uncap)=>{const r=uncap?rar:capRar(rar),f=pool.filter(k=>!BASES[k].fixRar||BASES[k].fixRar===r);return f.length?f:pool.filter(k=>!BASES[k].fixRar);};
const capRar=r=>RARS.indexOf(r)>RARS.indexOf(CONFIG.maxRarity)?CONFIG.maxRarity:r;   // ตัดระดับไอเทมไม่ให้เกิน CONFIG.maxRarity
function newItem(baseId,rar,ilvl,uncap){   /* uncap=true: ใช้เฉพาะร้านรีไอเทม (ข้ามเพดาน maxRarity) */
  rar=BASES[baseId].fixRar||(uncap?rar:capRar(rar));const b=BASES[baseId],R=RARITY[rar];ilvl=Math.max(1,ilvl|0);   // ของระดับตายตัว (เช่น ตำนานจากสูตรพิเศษ) ไม่ถูกตัดเพดาน
  const it={uid:G.uid++,base:baseId,rar,ilvl,req:ilvl,lv:1,exp:0,enh:0,affixes:[],sockets:Array(R.sockets).fill(null),uniq:null};
  const n=rint(R.affix[0],R.affix[1]);
  for(let i=0;i<n;i++){const pool=Object.keys(AFFIX).filter(k=>!it.affixes.some(a=>a.k===k));const k=pick(pool),A=AFFIX[k];
    const q=R.q[0]+rand()*(R.q[1]-R.q[0]);let v=(A.r[0]+rand()*(A.r[1]-A.r[0])+A.per*(ilvl-1))*q;
    v=A.pct?Math.round(v*1000)/1000:Math.max(1,Math.round(v));it.affixes.push({k,v});}
  if(R.uniq)it.uniq=pick(Object.keys(PASSIVES[R.uniq]));
  return it;
}
const itemName=it=>(it.rar==='god'?'✦ ':'')+BASES[it.base].n+(it.enh?` +${it.enh}`:'');
const fmtStat=(k,v)=>{const pct=(AFFIX[k]&&AFFIX[k].pct)||['statusChance','dotPct','mpowPct','dmgPct','apenPct','mpenPct','blindChance','chaosChance'].includes(k)||k==='critRate'||k==='critDmg'||k==='dr'||k.startsWith('res');return pct?`${v>0?'+':''}${Math.round(v*1000)/10}%`:`${v>0?'+':''}${Math.round(v)}`;};
const STATN2=Object.assign({apenPct:'ไม่สนเกราะ',mpenPct:'ไม่สนเวทป้องกัน',blindChance:'โอกาสทำให้ตาบอด 5 วิ',chaosChance:'โอกาสสร้างโกลาหล 4 วิ',watk:'พลังอาวุธ',wmatk:'พลังเวทอาวุธ',def:'DEF',mdef:'M.DEF',statusChance:'โอกาสติดสถานะ',dotPct:'ดาเมจสถานะ',mpowPct:'พลังเวท %',dmgPct:'ดาเมจ %'},STATN);
const hasNoMaxLv=()=>!!(typeof G!=='undefined'&&G.talent&&TALENT_PASSIVE[G.talent]&&TALENT_PASSIVE[G.talent].noMaxLv);
const Equip={
  canEquip(it){return G.level>=it.req;},
  slotFor(it){const t=BASES[it.base].type;if(t!=='ring')return t;if(!G.eq.ring1)return'ring1';if(!G.eq.ring2)return'ring2';return'ring1';},
  equip(it,slot){if(!this.canEquip(it))return false;slot=slot||this.slotFor(it);
    for(const s of SLOTS)if(G.eq[s]===it.uid)G.eq[s]=null;G.eq[slot]=it.uid;return true;},
  unequip(slot){G.eq[slot]=null;},
  isEquipped(it){return SLOTS.some(s=>G.eq[s]===it.uid);},
  weaponType(){const w=G.eq.weapon&&itemByUid(G.eq.weapon);return w?BASES[w.base].wt:'fist';},
  enhanceCost(it){const r=RARS.indexOf(it.rar)+1;return{gold:40*(it.enh+1)*r,ore:3+it.enh,rate:CONFIG.enhanceRates[it.enh]??0};},
  maxEnh(it){return CONFIG.enhanceMax;},   // ตีบวกได้สูงสุด +15 ทุกระดับ (ต้องวิวัฒน์ก่อน)
  enhance(it){if(it.enh>=this.maxEnh(it))return{ok:false,msg:'ตีบวกสูงสุดแล้ว (+'+this.maxEnh(it)+')'};const c=this.enhanceCost(it);
    if(G.gold<c.gold||(G.mats.ore||0)<c.ore)return{ok:false,msg:'ทองหรือแร่เหล็กไม่พอ'};
    G.gold-=c.gold;Inv.take('ore',c.ore);
    const rate=c.rate,ok=rand()<rate,prev=it.enh;
    if(ok)it.enh++;else if(it.enh>0)it.enh--;
    if(typeof StatSync!=='undefined')StatSync.invalidate('enh');
    return{ok,rate,msg:ok?`ตีบวกสำเร็จ! → +${it.enh}`:(prev>0?`ตีบวกล้มเหลว! ระดับลดลง 1 → +${it.enh}`:'ตีบวกล้มเหลว (ยังคง +0 · เสียทองและแร่)')};},
  capLv(it){return(CONFIG.equipExp.maxByRar&&it&&CONFIG.equipExp.maxByRar[it.rar])||CONFIG.equipExp.maxLv;},
  maxLv(it){return hasNoMaxLv()?Infinity:this.capLv(it);},
  expNext(lv,it){lv=lv||1;const cap=it?this.capLv(it):CONFIG.equipExp.maxLv;if(lv>=cap)return hasNoMaxLv()?CONFIG.equipExp.next(lv,Infinity):0;return CONFIG.equipExp.next(lv,cap);},
  gainExp(it,amt){if(!it)return 0;it.lv=Math.max(1,Number(it.lv)||1);it.exp=Math.max(0,Number(it.exp)||0);const mx=this.maxLv(it);if(it.lv>=mx)return 0;
    const mul=1+((G.talent&&TALENT_PASSIVE[G.talent]&&TALENT_PASSIVE[G.talent].eqXpMul)||0);
    it.exp+=Math.round(amt*mul);let ups=0;while(it.lv<mx&&it.exp>=this.expNext(it.lv,it)){const n=this.expNext(it.lv,it);if(n<=0)break;it.exp-=n;it.lv++;ups++;}
    if(it.lv>=mx)it.exp=0;if(ups&&typeof StatSync!=='undefined')StatSync.invalidate('equipLv');return ups;},
  useExpStone(it){if(!it)return{ok:false,msg:'ไม่พบอุปกรณ์'};const mx=this.maxLv(it);if(mx!==Infinity&&(it.lv||1)>=mx)return{ok:false,msg:`อุปกรณ์เลเวลเต็ม Lv.${mx} แล้ว`};
    if(!Inv.has('exprock',1))return{ok:false,msg:'ไม่มีหินเสริมพลังอุปกรณ์'};Inv.take('exprock',1);
    const ups=this.gainExp(it,CONFIG.equipExp.stone);return{ok:true,ups,msg:`+${CONFIG.equipExp.stone} EXP${ups?` → อัปเป็น Lv.${it.lv}!`:''}`};},
  canEvolve(it){return!!it&&(it.lv||1)>=this.capLv(it)&&(it.enh||0)>=CONFIG.enhanceMax&&RARS.indexOf(it.rar)<RARS.length-1;},
  evolve(it){if(!it)return{ok:false,msg:'ไม่พบอุปกรณ์'};
    const ri=RARS.indexOf(it.rar);if(ri<0||ri>=RARS.length-1)return{ok:false,msg:'ระดับความหายากสูงสุดแล้ว (God)'};
    const reqLv=this.capLv(it);
    if((it.lv||1)<reqLv||(it.enh||0)<CONFIG.enhanceMax)return{ok:false,msg:`ต้องเลเวลอุปกรณ์ Lv.${reqLv} และตีบวก +15 ก่อนวิวัฒน์`};
    if(!Inv.has('evostone',1))return{ok:false,msg:'ต้องใช้หินแห่งการวิวัฒน์ 1 ก้อน'};
    Inv.take('evostone',1);const nextRar=RARS[ri+1];it.rar=nextRar;it.lv=Math.max(it.lv||1,reqLv);it.enh=CONFIG.enhanceMax;
    const targetS=RARITY[nextRar].sockets;it.sockets=Array.isArray(it.sockets)?it.sockets.slice(0,targetS):[];while(it.sockets.length<targetS)it.sockets.push(null);
    if(RARITY[nextRar].uniq&&!it.uniq)it.uniq=pick(Object.keys(PASSIVES[RARITY[nextRar].uniq]));
    if(typeof StatSync!=='undefined')StatSync.invalidate('evolve');return{ok:true,rar:nextRar,msg:`✨ วิวัฒน์สำเร็จ! → ระดับ ${RARN[nextRar]} (ปลดล็อกช่องรูน ${targetS} ช่อง)`};},
  socketRune(it,idx,runeId){if(!it||!Array.isArray(it.sockets)||idx<0||idx>=it.sockets.length)return{ok:false,msg:'ไม่พบช่องรูน'};
    const m=MATS[runeId];if(!m||!m.rune||!Inv.has(runeId,1))return{ok:false,msg:'ไม่มีรูนนี้ในกระเป๋า'};
    if(it.sockets[idx])Inv.add(it.sockets[idx],1);Inv.take(runeId,1);it.sockets[idx]=runeId;
    if(typeof StatSync!=='undefined')StatSync.invalidate('rune');return{ok:true,msg:`ใส่ ${m.n} ในช่องที่ ${idx+1} แล้ว`};},
  unsocketRune(it,idx){if(!it||!Array.isArray(it.sockets)||!it.sockets[idx])return{ok:false,msg:'ช่องรูนว่างอยู่'};
    const rk=it.sockets[idx];it.sockets[idx]=null;Inv.add(rk,1);
    if(typeof StatSync!=='undefined')StatSync.invalidate('rune');return{ok:true,msg:`ถอด ${MATS[rk].n} คืนกระเป๋าแล้ว (ไม่สูญหาย)`};},
  legUpgradeCost(it){if(!it||it.rar!=='legendary')return null;const lv=it.legLv||1;if(lv>=5)return null;return{lv,next:lv+1,q:lv,mats:['philostone','essence','bossfrag','core']};},
  legUpgrade(it){const c=this.legUpgradeCost(it);if(!c)return{ok:false,msg:it&&it.rar==='legendary'?'ตำนานเลเวลสูงสุดแล้ว (LV.5/5)':'ใช้ได้เฉพาะอุปกรณ์ระดับตำนานเท่านั้น'};
    for(const mk of c.mats)if(!Inv.has(mk,c.q))return{ok:false,msg:`วัตถุดิบไม่พอ (ต้องใช้ ${c.mats.map(k=>MATS[k].n+' ×'+c.q).join(', ')})`};
    for(const mk of c.mats)Inv.take(mk,c.q);it.legLv=c.next;if(typeof StatSync!=='undefined')StatSync.invalidate('legUp');Save.save();
    return{ok:true,lv:it.legLv,msg:`✨ อัปเกรดตำนานสำเร็จ! → LV.${it.legLv}/5 (+${(it.legLv-1)*15}% พลังพื้นฐาน)`};},
  upgradeGear(uid1,uid2){const a=itemByUid(uid1),b=itemByUid(uid2);
    if(!a||!b||a===b||this.isEquipped(a)||this.isEquipped(b))return{ok:false,msg:'ต้องเลือกอุปกรณ์ 2 ชิ้นที่ไม่ได้สวมใส่อยู่'};
    const ca=BASES[a.base].cat,cb=BASES[b.base].cat;if(ca!==cb||a.rar!==b.rar)return{ok:false,msg:'ต้องเป็นอุปกรณ์ประเภทเดียวกันและระดับความหายากเดียวกัน'};
    const ri=RARS.indexOf(a.rar);if(ri<0||ri>=RARS.length-1)return{ok:false,msg:'ระดับสูงสุดแล้ว'};
    const nextRar=RARS[ri+1],ni=newItem(a.base,nextRar,Math.max(a.ilvl,b.ilvl,G.level),true);ni.crafted=1;
    Inv.remove(a);Inv.remove(b);Inv.addItem(ni);return{ok:true,item:ni,msg:`✨ หลอมเลื่อนระดับสำเร็จ! ได้รับ ${itemName(ni)} (${RARN[nextRar]})`};},
  look(){
    const LK=Object.assign({},DEFLOOK,G.look),K={hair:LK.hair,skin:LK.skin,eyec:LK.eye,hstyle:LK.hstyle,sex:LK.sex,elfEars:!!LK.elfEars,body:'#3d5f94',trim:'#8a5a32',pants:'#2c2a3a',boots:'#4a2e1e',gloves:null,head:null,hc:null,hc2:null,cape:null,scarf:null,pads:0,aura:null,trail:null,mask:0,sleeve:null,weapon:this.weaponType()};
    for(const it of equipped()){const b=BASES[it.base];if(b.look)Object.assign(K,b.look);const ic=typeof BASE_ICO!=='undefined'&&BASE_ICO[it.base];if(b.type==='necklace'&&ic)K.neck=ic[1];if(b.type==='ring'&&ic)K.ring=ic[1];if(it.rar==='god'&&!K.aura)K.aura='#ff4af0';}
    if(K.weapon==='gaunt'&&!K.gloves)K.gloves='#7fd8ff';return K;
  }
};
CONFIG.enhanceMax=15;        // ตีบวกสูงสุด +15 ทุกระดับ (ต้องวิวัฒน์เพื่อเพิ่มระดับความหายากต่อ)
CONFIG.enhanceMaxCraft=15;   // สูงสุด +15 เช่นเดียวกัน
CONFIG.enhFlat=1.5;          // ต่อขั้น: ค่าแบบหน่วยทุกค่า +1.5
CONFIG.enhPct=.015;          // ต่อขั้น: ค่าแบบ % ทุกค่า +1.5% ของค่าเดิม
CONFIG.craftEnh=5;
CONFIG.craftEnhMin=5;
CONFIG.craftEnhMax=9;
const Inv={
  has(id,q=1){return(G.mats[id]||0)>=q;},
  add(id,q=1){G.mats[id]=(G.mats[id]||0)+q;},
  take(id,q=1){G.mats[id]=(G.mats[id]||0)-q;if(G.mats[id]<=0)delete G.mats[id];},
  addItem(it){G.bag.push(it);return it;},
  remove(it){for(const s of SLOTS)if(G.eq[s]===it.uid)G.eq[s]=null;G.bag=G.bag.filter(x=>x!==it);},
  // ราคาขาย: ครึ่งหนึ่งของค่าแยกชิ้นส่วนทอง (ขายเฉพาะไอเทมที่ไม่ได้สวมอยู่)
  sellPrice(it){const r=RARS.indexOf(it.rar);return Math.max(1,Math.round(5*(r+1)*it.ilvl*(1+.2*(it.enh||0))));},
  matPrice(k){const m=MATS[k];if(!m)return 0;if(k.startsWith('sk_'))return 80;if(m.rareMat)return 60;if(k==='divine')return 150;if(k.startsWith('pot_'))return 120;if(k.startsWith('mp_')||k==='potion')return 10;return 5;},
  isJunkMat(k){const m=MATS[k];return !!m&&!m.rareMat&&!m.scroll&&!m.use&&!m.manaPotion&&!k.startsWith('sk_')&&!k.startsWith('mp_')&&k!=='potion'&&k!=='divine'&&k!=='ore';},   // แร่เหล็กเก็บไว้ใช้ตีบวก
  sellMat(k,q){q=Math.min(q,G.mats[k]||0);if(q<=0)return 0;const g=this.matPrice(k)*q;this.take(k,q);G.gold+=g;return g;},
  sellAllGear(rar){let g=0,n=0;for(const it of G.bag.slice()){if(Equip.isEquipped(it)||(rar&&it.rar!==rar))continue;g+=this.sellPrice(it);this.sell(it);n++;}return{g,n};},
  sellAllJunk(){let g=0,n=0;for(const k of Object.keys(G.mats))if(this.isJunkMat(k)){n+=G.mats[k];g+=this.sellMat(k,G.mats[k]);}return{g,n};},
  sell(it){if(Equip.isEquipped(it))return false;G.gold+=this.sellPrice(it);this.remove(it);return true;},
  salvage(it){if(Equip.isEquipped(it))return false;const r=RARS.indexOf(it.rar);this.remove(it);this.add('ore',1+r);G.gold+=10*(r+1)*it.ilvl;return true;},
  use(id){const m=MATS[id];if(!m||!this.has(id))return{ok:false};
    if(m.scroll){const ids=[].concat(m.scroll);ids.forEach(r=>G.known.add(r));this.take(id);return{ok:true,msg:`📖 อ่านแล้ว — จดเบาะแสสูตร ${ids.map(r=>recipeName(RECIPES.find(x=>x.id===r))).join(', ')} ลงสมุดจดสูตรที่โต๊ะตีเหล็ก`};}
    if(m.use==='reset'){let n=0;for(const k in G.alloc){n+=G.alloc[k];G.alloc[k]=0;}G.points+=n;this.take(id);return{ok:true,msg:`คืนแต้มค่าพลัง ${n} แต้ม`};}
    if(m.use==='learn'){const r=Skills.learn(m.skillBook);if(!r.ok)return{ok:false,msg:r.err+' (ไม่เสียตำรา)'};this.take(id);return{ok:true,msg:`📖 เรียนสกิล ${SKILLS[m.skillBook].ic} ${SKILLS[m.skillBook].n} แล้ว — จัดช่องได้ที่หน้าสกิล (K)`};}
    if(m.use==='sealbreak')return{ok:false,msg:'ตราทำลายผนึกใช้ได้ที่หน้าสกิล (K) เท่านั้น'};
    if(m.use==='potion'){if(typeof Z!=='undefined'&&Z&&Z.noPotion)return{ok:false,msg:'🚫 สนามทดสอบแรงค์ไม่อนุญาตให้ใช้ยา!'};const S=Stats.player();G.hp=Math.min(S.maxHP,G.hp+Math.round(S.maxHP*.4));this.take(id);return{ok:true,msg:'ฟื้น HP 40%'};}
    if(m.use==='buff'&&m.buff){if(typeof Z!=='undefined'&&Z&&Z.noPotion)return{ok:false,msg:'🚫 สนามทดสอบแรงค์ไม่อนุญาตให้ใช้ยา!'};
      this.take(id);const ttl=(m.buff.dur||20)*60;
      for(const bm of m.buff.mods||[]){StatSync.addMod('P',Object.assign({},bm,{ttl}));if(typeof BT!=='undefined'&&BT&&G.mode==='battle'&&BT.p)StatSync.addMod(BT.p,Object.assign({},bm,{ttl}));}
      return{ok:true,msg:`🧪 ดื่ม ${m.n} (แสดงผล ${m.buff.dur||20} วิ)!`};}
    if(m.use==='talent'){if(typeof UI!=='undefined'){UI.talentSwitch=true;UI.open('talent');return{ok:true,msg:'✨ เลือกพรสวรรค์ใหม่ได้เลย'};}return{ok:false,msg:'เปิดหน้าเลือกพรสวรรค์ไม่ได้'};}
    if(m.use==='exit'){if(typeof Z==='undefined'||!Z||Z.safe)return{ok:false,msg:'ใช้คัมภีร์ทางออกได้เฉพาะในดันเจี้ยนเท่านั้น'};if(Z.bossRoom&&!Z.cleared)return{ok:false,msg:'🔒 ห้องบอสถูกผนึก — ต้องปราบบอสก่อนจึงจะใช้คัมภีร์ทางออกได้'};
      if(typeof P!=='undefined'&&P&&P.castExit>0)return{ok:false,msg:'กำลังร่ายคัมภีร์ทางออกอยู่แล้ว'};
      this.take(id);if(typeof UI!=='undefined'&&UI.cur)UI.close();
      if(typeof P!=='undefined'&&P){P.castExit=180;P.moving=false;if(typeof SFX!=='undefined')SFX.flash();}
      else if(typeof loadZone==='function'&&typeof TOWN!=='undefined'&&TOWN){loadZone(TOWN,TOWN.gate);Save.save();}
      return{ok:true,msg:'📜 กำลังร่ายคัมภีร์ทางออก (3 วินาที)...'};}
    if(m.manaPotion){const S=Stats.player(),o={mp:G.mp},r=Mana.drink(o,S,id);if(!r.ok)return{ok:false,msg:r.err};G.mp=o.mp;return{ok:true,msg:`ฟื้น MP +${r.gained}`};}
    return{ok:false};
  },
  sorted(list,by){const ri=it=>RARS.indexOf(it.rar);const f={rarity:(a,b)=>ri(b)-ri(a)||b.ilvl-a.ilvl,level:(a,b)=>b.ilvl-a.ilvl||ri(b)-ri(a),
    type:(a,b)=>ALLTYPES.indexOf(BASES[a.base].type)-ALLTYPES.indexOf(BASES[b.base].type)||ri(b)-ri(a),name:(a,b)=>BASES[a.base].n.localeCompare(BASES[b.base].n,'th')};
    return list.slice().sort(f[by]||f.rarity);}
};

/* ---------------- Crafting component (slot-based, centralized validation + odds) ----------------
   slots: array of {id,q}|null (max CONFIG.craftSlots). Order never matters; duplicate ids are merged. */
const recipeName=r=>r.out.base?BASES[r.out.base].n:MATS[r.out.mat].n+(r.out.q>1?` ×${r.out.q}`:'');
const Craft={
  busy:false,
  combine(slots){const m={};for(const s of slots||[])if(s&&s.id&&s.q>0)m[s.id]=(m[s.id]||0)+s.q;return m;},
  match(slots){const m=this.combine(slots),ks=Object.keys(m);if(!ks.length)return null;
    return RECIPES.find(r=>{const rk=Object.keys(r.mats);return rk.length===ks.length&&rk.every(k=>m[k]===r.mats[k]);})||null;},
  clueKnown(r){return!!r.known||G.known.has(r.id);},
  discovered(r){return G.found&&G.found.has(r.id);},
  boosterId(boost){return boost===true?'divine':(boost&&MATS[boost]&&MATS[boost].booster?boost:null);},
  boostAmt(boost){const k=this.boosterId(boost);return k?((MATS[k]&&MATS[k].craftBoost)||CONFIG.craftBoost):0;},
  base(r){return r.rate!=null?r.rate:CONFIG.craftRates[r.rar];},   // สูตรพิเศษกำหนดโอกาสเองได้
  chance(r,boost){if(r&&r.id==='stonesword'&&(G.stats.crafts||0)===0&&!(G.flags&&G.flags.boroFirstCraftSay))return 1;return Math.min(1,this.base(r)+this.boostAmt(boost));},
  shortage(slots){const m=this.combine(slots),out=[];for(const k in m)if((G.mats[k]||0)<m[k])out.push({id:k,need:m[k],have:G.mats[k]||0});return out;},
  /* recipes the player has a written clue for that the current slots are heading toward */
  hints(slots){const m=this.combine(slots),ks=Object.keys(m);if(!ks.length)return[];
    return RECIPES.filter(r=>this.clueKnown(r)&&ks.every(k=>r.mats[k]&&m[k]<=r.mats[k])).map(r=>({r,missing:Object.keys(r.mats).filter(k=>(m[k]||0)<r.mats[k]).map(k=>({id:k,q:r.mats[k]-(m[k]||0)}))})).filter(h=>h.missing.length);},
  isRareCraft(r,boost){return !!this.boosterId(boost)||r.rar==='epic'||r.rar==='legendary'||r.rar==='god'||Object.keys(r.mats).some(k=>MATS[k].rareMat);},
  check(slots,boost){
    const r=this.match(slots);if(!r)return{ok:false,err:'ส่วนผสมนี้ไม่ตรงกับสูตรใด'};
    const short=this.shortage(slots);if(short.length)return{ok:false,recipe:r,short,err:'วัตถุดิบในกระเป๋าไม่พอ'};
    if(r.gold&&G.gold<r.gold)return{ok:false,recipe:r,err:'ทองไม่พอ (ต้องการ '+r.gold+' ทอง)'};
    const bk=this.boosterId(boost);if(bk&&!Inv.has(bk))return{ok:false,recipe:r,err:'ไม่มี '+MATS[bk].n};
    return{ok:true,recipe:r,chance:this.chance(r,boost)};
  },
  /* the only place that consumes materials and rolls the dice; re-validates everything */
  attempt(slots,boost,_locked){
    if(this.busy&&!_locked)return{ok:false,err:'busy'};
    const c=this.check(slots,boost);if(!c.ok)return c;
    const r=c.recipe,roll=rand(),ok=roll<c.chance,bk=this.boosterId(boost);
    for(const k in r.mats)Inv.take(k,r.mats[k]);if(r.gold)G.gold-=r.gold;if(bk)Inv.take(bk,1);
    G.stats.crafts++;if(G.found)G.found.add(r.id);G.known.add(r.id);
    if(!ok)return{ok:false,failed:true,recipe:r,roll,chance:c.chance,lost:Object.assign({},r.mats,bk?{[bk]:1}:{})};
    G.stats.craftOk++;
    if(r.out.base){const ni=newItem(r.out.base,r.rar,Math.max(RECIPE_ILVL[r.rar],G.level));ni.enh=rint(CONFIG.craftEnhMin,CONFIG.craftEnhMax);ni.crafted=1;const it=Inv.addItem(ni);return{ok:true,recipe:r,item:it,roll,chance:c.chance};}
    Inv.add(r.out.mat,r.out.q||1);return{ok:true,recipe:r,mat:r.out.mat,q:r.out.q||1,roll,chance:c.chance};
  }
};
/* ---------------- LootManager (BP_LootManager + BPC_LootDrop) ----------------
   One place for: drop class, Luck, rarity roll, entry pick, per-player generation, ground spawn, ownership, pickup, expiry, pity. */
const LootManager={
  log(o){o.t=G.t;G.lootLog=G.lootLog||[];G.lootLog.unshift(o);if(G.lootLog.length>40)G.lootLog.length=40;},
  classOf(def,elite){return def.boss?'boss':def.miniboss?'miniboss':elite?'elite':'normal';},
  weights(cls){let r=LOOT_CONFIG.classes[cls].rar;if(typeof r==='string')r=LOOT_CONFIG.classes[r].rar;return r;},
  luckBonus(luk){const L=LOOT_CONFIG.luck;return clamp(((luk||0)-L.base)*L.perPoint,0,L.cap);},
  /* Luck applied exactly once here, relative, then clamped to [0,1]. Guaranteed rewards never call this. */
  dropChance(cls,luk){return clamp(LOOT_CONFIG.classes[cls].chance*(1+this.luckBonus(luk)),0,1);},
  validEntry(e){if(!e)return false;if(e.base)return!!BASES[e.base];if(e.mat)return!!MATS[e.mat];if(e.gear)return e.gear==='any'||ALLTYPES.includes(e.gear);
    if(e.set)return!!SETS[e.set];if(e.book)return['common','rare','ultimate'].includes(e.book);return false;},
  allows(e,rar){const a=e.rar||['normal'];return a==='any'||a.includes(rar);},
  label(e){return e.base||e.mat||(e.gear?'gear:'+e.gear:e.set?'set:'+e.set:'book:'+e.book);},
  pickEntry(entries,rar,used,kind){const el=entries.filter(e=>this.allows(e,rar)&&!(e.unique&&used.has(e))&&(!e.onlyKinds||e.onlyKinds.includes(kind)));
    if(!el.length)return null;let tot=el.reduce((a,e)=>a+e.w,0),r=rand()*tot;for(const e of el){r-=e.w;if(r<0)return e;}return el[el.length-1];},
  resolve(e,rar,lv){
    const q=rint(e.min||1,e.max||e.min||1);
    if(e.mat)return{kind:'mat',mat:e.mat,q,rar};
    if(e.book){const pool=Object.keys(SKILLS).filter(k=>SKILLS[k].tier===e.book&&!SKILLS[k].bossOnly&&skillUsable(k,'player'));const k='sk_'+pick(pool);return MATS[k]?{kind:'mat',mat:k,q:1,rar}:null;}
    let base=e.base;
    if(e.gear)base=pick(rarPool(e.gear==='any'?ALLTYPES.flatMap(t=>BASE_BY_TYPE(t)):BASE_BY_TYPE(e.gear),rar));
    if(e.set)base=pick(Object.keys(BASES).filter(k=>BASES[k].set===e.set));
    if(!base||!BASES[base])return null;
    return{kind:'item',item:newItem(base,rar,lv),rar};
  },
  /* ST_DropResult[] for ONE player. Never shared between players. */
  generate({tableId,cls='normal',level=1,luk=10,pid='P1',kind=tableId}){
    const T=LOOT_TABLES[tableId],res={pid,drops:[]};
    if(!T){this.log({pid,tableId,warn:'ไม่พบตาราง Loot'});return res;}
    for(const g of T.guaranteed||[]){
      if(g.chance!==undefined&&rand()>=g.chance)continue;
      if(g.gold){res.drops.push({kind:'gold',q:Math.round(rint(g.gold[0],g.gold[1])*(1+.1*(level-1))),rar:'normal',guaranteed:1});continue;}
      if(g.mat&&MATS[g.mat]){res.drops.push({kind:'mat',mat:g.mat,q:g.q||1,rar:g.rar||MATS[g.mat].rar||'normal',guaranteed:1});continue;}
      this.log({pid,tableId,warn:'รางวัลตายตัวอ้างอิงไอเท็มไม่ถูกต้อง: '+JSON.stringify(g)});
    }
    const C=LOOT_CONFIG.classes[cls]||LOOT_CONFIG.classes.normal,chance=this.dropChance(cls,luk),roll=rand(),entries=(T.entries||[]).filter(e=>{const ok=this.validEntry(e);if(!ok)this.log({pid,tableId,warn:'ข้ามรายการที่อ้างอิงไม่ถูกต้อง: '+JSON.stringify(e)});return ok;});
    const L={pid,tableId,cls,level,luk,luckBonus:this.luckBonus(luk),base:C.chance,chance,roll,picks:[]};
    if(roll<chance&&entries.length){
      const n=rint(C.qty[0],C.qty[1]),W=this.weights(cls),used=new Set();L.qty=n;
      for(let i=0;i<n;i++){
        let rar=weighted(W);const rolled=rar;if(rar==='god'&&level<LOOT_CONFIG.godMinLevel)rar='legendary';
        let e=null,r=rar;while(r){e=this.pickEntry(entries,r,used,kind);if(e)break;r=RARS[RARS.indexOf(r)-1];}
        if(!e){L.picks.push({rolled,none:1});continue;}
        if(e.unique)used.add(e);const d=this.resolve(e,r,level);if(d){res.drops.push(d);L.picks.push({rolled,rar:r,entry:this.label(e),q:d.q||1});}
      }
    }
    this.log(L);return res;
  },
  luckOf(pid){return pid==='P1'?StatSync.get().luk:((G.simPlayers||{})[pid]||{luk:10}).luk;},
  /* every player gets an independent roll */
  rollForPlayers(params,pids=LOOT_CONFIG.players){return pids.map(pid=>this.generate(Object.assign({},params,{pid,luk:this.luckOf(pid)})));},
  /* ---- pity (optional, off by default, per player & boss type) ---- */
  pity(pid,kind){const P=LOOT_CONFIG.pity,out=[];if(!P.enabled)return out;G.pity=G.pity||{};const m=G.pity[pid]||(G.pity[pid]={});m[kind]=(m[kind]||0)+1;
    for(const th of P.thresholds)if(m[kind]===th.kills)out.push({kind:'mat',mat:th.reward.mat,q:th.reward.q,rar:'epic',pity:th.kills});
    if(out.length)this.log({pid,pity:kind,kills:m[kind],extra:out.map(d=>d.mat)});return out;},
  /* ---- BP_GroundItem ---- */
  spawn(zone,x,y,result){zone.ground=zone.ground||[];const R=LOOT_CONFIG.ground.radius,out=[];
    result.drops.forEach((d,i)=>{let px=x,py=y;for(let k=0;k<8;k++){const a=rand()*6.283,r=6+rand()*R;px=x+Math.cos(a)*r;py=y+Math.sin(a)*r*.6;if(!blocked||!blocked(px,py))break;px=x;py=y;}
      const gi={gid:(G.gidSeq=(G.gidSeq||0)+1),owner:result.pid,drop:d,x:px,y:py,born:G.t,expire:d.kind==='mat'&&MATS[d.mat]&&MATS[d.mat].key?Infinity:G.t+LOOT_CONFIG.ground.lifetime,picked:false};/* กุญแจไม่หายจากพื้น */zone.ground.push(gi);out.push(gi);});
    return out;},
  name(d){return d.kind==='gold'?`${d.q} ทอง`:d.kind==='mat'?MATS[d.mat].n+(d.q>1?' ×'+d.q:''):itemName(d.item);},
  icon(d){return '';},   // ป้ายบนแคนวาส: ไม่ใช้ emoji
  iconHtml(d){return d.kind==='gold'?ico('coin',14):d.kind==='mat'?mIco(d.mat,14):bIco(d.item.base,14);},
  canStore(d){const I=LOOT_CONFIG.inventory;if(d.kind==='gold')return true;if(d.kind==='item')return G.bag.length<I.equipSlots;return(G.mats[d.mat]||0)+d.q<=I.stackMax;},
  store(d){if(d.kind==='gold')G.gold+=d.q;else if(d.kind==='mat')Inv.add(d.mat,d.q);else Inv.addItem(d.item);},
  /* returns {ok, reason}. Order: exists → not already taken → owner → not expired → capacity → insert → remove actor */
  pickup(zone,gi,pid){
    const list=zone&&zone.ground||[];if(!gi||!list.includes(gi))return this.fail(gi,pid,'gone');
    if(gi.picked)return this.fail(gi,pid,'gone');
    if(gi.owner!==pid)return this.fail(gi,pid,'owner');
    if(G.t>=gi.expire){this.cleanup(zone);return this.fail(gi,pid,'expired');}
    if(!this.canStore(gi.drop))return this.fail(gi,pid,'full');
    gi.picked=true;this.store(gi.drop);zone.ground=list.filter(x=>x!==gi);
    this.log({pid,pickup:gi.gid,item:this.name(gi.drop),ok:1});return{ok:true};
  },
  fail(gi,pid,reason){this.log({pid,pickup:gi&&gi.gid,fail:reason});return{ok:false,reason};},
  cleanup(zone){if(!zone||!zone.ground)return 0;const before=zone.ground.length;zone.ground=zone.ground.filter(g=>!g.picked&&G.t<g.expire);return before-zone.ground.length;},
  /* report invalid references in all tables (startup / debug) */
  validateAll(){const bad=[];for(const t in LOOT_TABLES)for(const e of LOOT_TABLES[t].entries)if(!this.validEntry(e))bad.push(t+':'+this.label(e));
    for(const t in LOOT_TABLE_TEMPLATES)for(const id of LOOT_TABLE_TEMPLATES[t])if(!BASES[id]&&!MATS[id])bad.push('template '+t+':'+id);return bad;}
};
/* legacy wrapper for chests (direct-to-inventory, unchanged behaviour) */
const Loot={
  roll(tid,lv,elite){const r=LootManager.generate({tableId:tid,cls:elite?'elite':'normal',level:lv,luk:LootManager.luckOf('P1')}),out={gold:0,mats:{},items:[]};
    for(const d of r.drops){if(d.kind==='gold')out.gold+=d.q;else if(d.kind==='mat')out.mats[d.mat]=(out.mats[d.mat]||0)+d.q;else out.items.push(d.item);}return out;},
  grant(out){G.gold+=out.gold;for(const k in out.mats)Inv.add(k,out.mats[k]);for(const it of out.items)Inv.addItem(it);}
};

/* ---------------- Skills ---------------- */
const Skills={
  init(talent){G.skills={learned:new Set([TALENTS[talent].skill]),slots:[null,null,null,null],cd:{},bound:null,lv:{}};},  // Unique must be bound by the player (explicit confirm)
  learnable(id){const s=SKILLS[id];return!!s.talent&&s.talent===G.talent;},   // สกิลบอส (bossOnly) ได้จากการชนะบอสเท่านั้น   // only the talent Unique is innate; everything else comes from skill books
  check(){const got=[];for(const id in SKILLS){if(!G.skills.learned.has(id)&&this.learnable(id)){G.skills.learned.add(id);got.push(id);}}return got;},
  learn(id){if(!SKILLS[id])return{ok:false,err:'ไม่มีสกิลนี้'};if(!skillUsable(id,'player'))return{ok:false,err:'สกิลนี้ศัตรูใช้ได้เท่านั้น'};if(G.skills.learned.has(id))return{ok:false,err:'เรียนสกิลนี้แล้ว'};
    G.skills.learned.add(id);const sl=TIERS.indexOf(SKILLS[id].tier);if(sl!==2&&!G.skills.slots[sl])G.skills.slots[sl]=id;return{ok:true};},   // auto-fill empty non-Unique socket
  passiveOf(){const id=G.skills&&G.skills.bound,s=id&&SKILLS[id];if(!s||s.type!=='passive')return null;return{id:s.passive.id,v:s.passive.v*this.scale(id).coef,skill:id};},
  level(id){return G.skills.lv[id]||1;},
  /* equip / replace / remove for Common, Rare, Ultimate. Unique socket only changes via bind()/replaceUnique(). */
  equip(slot,id){
    if(slot<0||slot>3)return{ok:false,err:'ช่องไม่ถูกต้อง'};
    if(slot===2)return{ok:false,err:'ช่องเฉพาะตัวต้องผนึกผ่านปุ่มผนึกเท่านั้น'};
    if(!id){G.skills.slots[slot]=null;return{ok:true};}   // Common / Rare / Ultimate are removable (spec v3)
    if(!SKILLS[id]||!G.skills.learned.has(id))return{ok:false,err:'ยังไม่ได้เรียนสกิลนี้'};
    if(!skillUsable(id,'player'))return{ok:false,err:'สกิลนี้ศัตรูใช้ได้เท่านั้น'};
    if(SKILLS[id].tier!==TIERS[slot])return{ok:false,err:'ประเภทสกิลไม่ตรงกับช่อง'};
    if(G.skills.slots.some((x,i)=>x===id&&i!==slot))return{ok:false,err:'สกิลนี้อยู่ในช่องอื่นแล้ว'};
    G.skills.slots[slot]=id;return{ok:true};
  },
  bind(id){ // first (permanent) binding — caller must have obtained explicit confirmation
    if(G.skills.bound)return{ok:false,err:'มีสกิลเฉพาะตัวถูกผนึกอยู่แล้ว'};
    if(!SKILLS[id]||SKILLS[id].tier!=='unique'||!G.skills.learned.has(id))return{ok:false,err:'ผนึกได้เฉพาะสกิลเฉพาะตัวที่เรียนแล้ว'};
    G.skills.bound=id;G.skills.slots[2]=id;return{ok:true};
  },
  canBreakSeal(){return!!G.skills.bound&&Inv.has(SEAL_BREAKER.item,SEAL_BREAKER.perUse);},
  replaceUnique(newId){ // requires Unique Seal Breaker; consumed only here (after confirmation in UI)
    if(!G.skills.bound)return{ok:false,err:'ยังไม่มีสกิลที่ผนึกอยู่'};
    if(!Inv.has(SEAL_BREAKER.item,SEAL_BREAKER.perUse))return{ok:false,err:'ต้องใช้ตราทำลายผนึกเฉพาะตัว'};
    if(newId===G.skills.bound)return{ok:false,err:'เป็นสกิลเดิมอยู่แล้ว'};
    if(!SKILLS[newId]||SKILLS[newId].tier!=='unique'||!G.skills.learned.has(newId))return{ok:false,err:'ต้องเป็นสกิลเฉพาะตัวที่เรียนแล้ว'};
    const old=G.skills.bound;Inv.take(SEAL_BREAKER.item,SEAL_BREAKER.perUse);G.skills.bound=newId;G.skills.slots[2]=newId;  // old skill + its level stay in learned/lv (storage)
    return{ok:true,old};
  },
  upgradeInfo(id){const s=SKILLS[id],lv=this.level(id),U=SKILL_UPGRADE;
    if(!s||!U.appliesTo.includes(s.tier))return{can:false,reason:'อัปเกรดได้เฉพาะสกิลเฉพาะตัว'};
    if(G.skills.bound!==id)return{can:false,reason:'ต้องผนึกก่อนจึงอัปเกรดได้'};
    if(lv>=U.maxLevel||!U.levels[lv+1])return{can:false,max:true,reason:'เลเวลสูงสุดแล้ว'};
    const req=U.levels[lv+1],miss=Object.keys(req.mats).filter(k=>(G.mats[k]||0)<req.mats[k]);
    return{can:!miss.length&&G.gold>=req.gold,req,next:lv+1,miss,goldShort:G.gold<req.gold};},
  upgrade(id){const u=this.upgradeInfo(id);if(!u.can)return{ok:false,err:u.reason||'วัตถุดิบหรือทองไม่พอ'};
    for(const k in u.req.mats)Inv.take(k,u.req.mats[k]);G.gold-=u.req.gold;G.skills.lv[id]=u.next;return{ok:true,lv:u.next};},
  scale(id){const lv=this.level(id),L=SKILL_UPGRADE.levels[lv];return L?{coef:L.coef,cd:L.cd}:{coef:1,cd:1};},
  cdFrames(id,S){return Math.round(SKILLS[id].cd*this.scale(id).cd*60*this.cdMul(S));},
  toSave(){const k=G.skills;return{learned:[...k.learned],slots:k.slots.slice(),bound:k.bound,lv:Object.assign({},k.lv)};},
  fromSave(d){const slots=(d.slots||[null,null,null,null]).slice(0,4);
    // v2 saves before binding existed: an equipped Unique counts as already bound
    const bound=d.bound!==undefined?d.bound:(slots[2]||null);
    G.skills={learned:new Set(d.learned||[]),slots,cd:{},bound,lv:Object.assign({},d.lv||{})};
    if(bound)G.skills.slots[2]=bound;else G.skills.slots[2]=null;},
  cdMul(S){return S.passives.has('arcane')?.8:1;},
  cdLeft(id){return G.skills.cd[id]||0;},
  tick(){for(const k in G.skills.cd)if(G.skills.cd[k]>0)G.skills.cd[k]--;},
  cache:{},
  move(id,wt,slot){
    if(SKILLS[id].type==='passive')return null;
    const lvl=this.level(id),key=id+'|'+wt+'|'+slot+'|'+lvl;if(this.cache[key])return this.cache[key];
    const s=SKILLS[id],fr=SKILL_FRAMES[s.anim]||[10,4,18],a=s.active||(s.anim==='rush'?(s.multi||3)*4+4:s.rain?(s.multi||3)*7:fr[1]);
    const el=s.el==='weapon'?(WEAPONS[wt]||WEAPONS.fist).el:(s.el||'phys');
    const m=M(s.n,s.startup||fr[0],a,fr[2],(s.coef||0)*10*this.scale(id).coef,s.reach||0,3,22,{anim:s.anim,kind:s.tier==='ultimate'?'ultimate':'skill',tok:'S'+(slot+1),combo:!!s.combo,
      type:s.type,el,skillId:id,hy:s.hy||62,hh:s.hh||60});
    for(const k of ['multi','proj','beam','beamCol','spiritBeam','launch','rise','inv','lunge','kicks','status','statusDur','armorBreak','unblockable','jackpotPen','jackpot','alwaysCrit','defPen','lifesteal','ignoreDef','lastCrit','strike','buff','hpCost','rain','kd','low','dragon','kingAura','holdParry','rootDur','pillars','frostnova','instantShatter','windblade','blink','slashFx'])if(s[k]!==undefined)m[k]=s[k];
    if(s.tier==='ultimate')m.super=2;
    return this.cache[key]=m;
  }
};

/* ---------------- Progression ---------------- */
const Prog={
  xpScale(mlv){const diff=G.level-(mlv||1);return diff>5?Math.max(.1,1-.08*(diff-5)):1;},   /* เลเวลสูงกว่ามอน >5 ขั้น ได้ XP ลดลง (ต่ำสุด 10%) */
  gainXP(n){const cap=hasNoMaxLv()?Infinity:CONFIG.levelCap;if(G.level>=cap){G.xp=0;return 0;}const mul=1+((G.talent&&TALENT_PASSIVE[G.talent]&&TALENT_PASSIVE[G.talent].xpMul)||0);G.xp+=Math.round(n*mul);let ups=0;while(G.level<cap&&G.xp>=CONFIG.xpNext(G.level)){G.xp-=CONFIG.xpNext(G.level);G.level++;G.points+=CONFIG.levelPoints;ups++;}if(G.level>=cap)G.xp=0;
    if(ups){const S=Stats.player();G.hp=S.maxHP;G.mp=S.maxMP;}return ups;},
  allocate(k){if(G.points<=0||!(k in G.alloc)||BASE_ATTR[k]+G.alloc[k]>=CONFIG.attrMax)return false;G.points--;G.alloc[k]++;return true;},
  masteryLv(wt){return Math.min(10,Math.floor(Math.sqrt((G.mastery[wt]||0)/15)));},
  masteryBonus(wt){return this.masteryLv(wt)*.02;},
  addMastery(wt,n){const before=this.masteryLv(wt);G.mastery[wt]=(G.mastery[wt]||0)+n;return this.masteryLv(wt)>before;}
};
const Ency={
  see(kind,lv){const e=G.ency[kind]||(G.ency[kind]={seen:0,kills:0,maxLv:0});e.seen++;e.maxLv=Math.max(e.maxLv,lv);},
  kill(kind){const e=G.ency[kind]||(G.ency[kind]={seen:1,kills:0,maxLv:0});e.kills++;}
};
const Quest={
  init(){G.q={main1:{step:0,done:0,active:1},hunt:{step:0,count:0,done:0,active:0},pan:{step:0,done:0,active:0},lava:{step:0,done:0,active:0}};G.guildQuests={};},
  activate(id){if(!G.q[id].active){G.q[id].active=1;toast(`📜 รับเควสต์: ${QUESTS[id].n}`);}},
  advance(id,step){const q=G.q[id];if(q.done||!q.active)return;if(step<=q.step)return;q.step=step;
    if(step>=QUESTS[id].steps.length)this.complete(id);else toast(`เควสต์อัปเดต: ${QUESTS[id].steps[step]}`);UI.quest();},
  complete(id){const q=G.q[id];if(q.done)return;q.done=1;q.step=QUESTS[id].steps.length;const r=QUESTS[id].reward;
    if(r.gold)G.gold+=r.gold;for(const k in r.mats||{})Inv.add(k,r.mats[k]);const ups=r.xp?Prog.gainXP(r.xp):0;
    toast(`✅ เควสต์สำเร็จ: ${QUESTS[id].n} — รางวัล ${r.xp?r.xp+' XP ':''}${r.gold?r.gold+' ทอง ':''}${Object.keys(r.mats||{}).map(k=>mIco(k,14)+MATS[k].n).join(' ')}`,4000);
    if(ups)UI.levelUp(ups);UI.quest();}
};
const Guild={
  list:GUILD_RANKS,
  rank(){return G.guildRank||'F';},
  registered(){return !!G.guildRank;},
  info(id=G.guildRank||'F'){return GUILD_RANKS.find(r=>r.id===id)||GUILD_RANKS[0];},
  next(id=G.guildRank||'F'){const i=GUILD_RANKS.findIndex(r=>r.id===id);return i>=0&&i+1<GUILD_RANKS.length?GUILD_RANKS[i+1]:null;},
  questDone(qid){return !qid||!!(G.guildPromo&&G.guildPromo[qid])||!!(G.q&&G.q[qid]&&G.q[qid].done);},
  canPromote(){
    const cur=this.info(),nxt=this.next(cur.id);
    if(!nxt)return{ok:false,cur,next:null,reason:'อยู่ในแรงค์สูงสุด (Rank S) แล้ว'};
    const lvOk=G.level>=nxt.lvReq,qOk=this.questDone(nxt.promoQuest);
    return{ok:lvOk&&qOk,cur,next:nxt,lvOk,qOk,reason:!lvOk&&!qOk?`ต้อง Lv.${nxt.lvReq}+ และสำเร็จเควสต์เลื่อนขั้น Rank ${nxt.id}`:!lvOk?`ต้องเลเวล Lv.${nxt.lvReq}+ (ปัจจุบัน Lv.${G.level})`:`ต้องสำเร็จเควสต์เลื่อนขั้น Rank ${nxt.id} ก่อน`};
  },
  promote(){
    const r=this.canPromote();if(!r.ok)return r;
    G.guildRank=r.next.id;SFX.level();
    toast(`🎖️ เลื่อนแรงค์กิลด์เป็น Rank ${r.next.id} — ${r.next.n}!`,3500);
    Save.save();UI.hud&&UI.hud();
    return{ok:true,next:r.next};
  },
  canEnterSpire(){return this.registered()&&GUILD_RANKS.findIndex(r=>r.id===this.rank())>0;},
  acceptQuest(id){
    const q=GUILD_QUESTS.find(x=>x.id===id);if(!q)return{ok:false,err:'ไม่พบเควสต์'};
    const ci=GUILD_RANKS.findIndex(r=>r.id===this.rank()),ri=GUILD_RANKS.findIndex(r=>r.id===q.rankReq);
    if(ci<ri)return{ok:false,err:`ต้องอยู่แรงค์ ${q.rankReq} ขึ้นไป`};
    G.guildQuests=G.guildQuests||{};
    const st=G.guildQuests[id]||(G.guildQuests[id]={active:0,count:0,done:0});
    if(st.active)return{ok:false,err:'รับเควสต์นี้แล้ว'};
    st.active=1;st.count=0;SFX.pick&&SFX.pick();
    toast(`📜 รับภารกิจกิลด์: ${q.n}`,2600);UI.quest();Save.save();return{ok:true};
  },
  onKill(kind){
    if(!G.guildQuests)return;let chg=0;
    for(const q of GUILD_QUESTS){
      const st=G.guildQuests[q.id];if(!st||!st.active||st.count>=q.req)continue;
      if(q.targets.includes(kind)){st.count++;chg=1;
        if(st.count>=q.req)toast(`✅ ภารกิจกิลด์ "${q.n}" ครบแล้ว! ส่งได้ที่กระดานกิลด์`,3400);
        else toast(`⚔️ ${q.n}: ${st.count}/${q.req}`,1800);}
    }
    if(chg)UI.quest();
  },
  claimQuest(id){
    const q=GUILD_QUESTS.find(x=>x.id===id);if(!q||!G.guildQuests||!G.guildQuests[id])return{ok:false};
    const st=G.guildQuests[id];if(!st.active||st.count<q.req)return{ok:false,err:'ยังไม่ครบเงื่อนไข'};
    st.active=0;st.count=0;st.done=(st.done||0)+1;
    const r=q.reward;if(r.gold)G.gold+=r.gold;for(const k in r.mats||{})Inv.add(k,r.mats[k]);
    const ups=r.xp?Prog.gainXP(r.xp):0;SFX.level();
    toast(`🎖️ ส่งภารกิจกิลด์สำเร็จ: ${q.n} (+${r.xp||0} XP · +${r.gold||0} ทอง)`,3800);
    if(ups)UI.levelUp(ups);UI.quest();UI.hud();Save.save();return{ok:true};
  }
};

/* ---------------- Save / Load (SaveGame) ---------------- */
const SAVE_KEY='caveforge_save',SAVE_VER=2;
const Save={
  data(){return{v:SAVE_VER,savedAt:Date.now(),talent:G.talent,level:G.level,xp:G.xp,points:G.points,alloc:G.alloc,hp:G.hp,mp:G.mp,bag:G.bag,mats:G.mats,gold:G.gold,eq:G.eq,
    known:[...G.known],found:[...G.found],skills:Skills.toSave(),mastery:G.mastery,ency:G.ency,q:G.q,flags:G.flags,uid:G.uid,stats:G.stats,ult:G.ult||0,pity:G.pity||{},shopCD:G.shopCD||{},diff:G.diff||'normal',bloodstain:G.bloodstain||null,look:G.look||null,guildRank:G.guildRank||'F',guildPromo:G.guildPromo||{},guildQuests:G.guildQuests||{},world:World.serialize()};},
  save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.data()));return true;}catch(e){return false;}},
  exists(){try{return!!localStorage.getItem(SAVE_KEY);}catch(e){return false;}},
  apply(d){
    if(!d||!d.v)return false;if(d.v<2)return false; // v1 (old demo) had no compatible progression data
    Object.assign(G,{talent:d.talent,level:d.level,xp:d.xp,points:d.points,alloc:d.alloc,hp:d.hp,mp:d.mp,bag:d.bag,mats:d.mats,gold:d.gold,eq:d.eq,
      known:new Set(d.known),found:new Set(d.found||[]),mastery:d.mastery||{},ency:d.ency||{},q:d.q,flags:d.flags||{},uid:d.uid,stats:Object.assign(G.stats,d.stats||{}),ult:d.ult||0,pity:d.pity||{},shopCD:d.shopCD||{},diff:CONFIG.diffLock||(DIFFICULTY[d.diff]?d.diff:'normal'),bloodstain:d.bloodstain||null,look:d.look||null,guildRank:d.guildRank||'F',guildPromo:d.guildPromo||{},guildQuests:d.guildQuests||{}});
    Skills.fromSave(d.skills||{});
    for(const it of G.bag||[]){it.lv=it.lv||1;it.exp=it.exp||0;const ts=(RARITY[it.rar]||RARITY.normal).sockets;it.sockets=Array.isArray(it.sockets)?it.sockets.slice(0,ts):[];while(it.sockets.length<ts)it.sockets.push(null);}
    for(const s of SLOTS)if(!(s in G.eq))G.eq[s]=null;  // forward-compat for new slots
    World.restore(d.world);return true;
  },
  peek(){try{const raw=localStorage.getItem(SAVE_KEY);return raw?JSON.parse(raw):null;}catch(e){return null;}},
  load(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;return this.apply(JSON.parse(raw));}catch(e){return false;}}
};

/* ---- Re-Item (NPC รีไอเทม): รีครั้งละ 500 เหรียญ สุ่มไอเทม 4 ช่อง ---- */
const REITEM={cost:1000,buy:500,odds:[['normal',69.9989],['rare',20],['epic',10],['legendary',.001],['god',.0001]]}   /* หน่วยเป็น % — ตำนาน/เทพ ได้จากร้านรีเท่านั้น (ดรอปไม่มีแล้ว) */;
function reitemRarity(uncap){let x=rand()*100;for(const [r,p] of REITEM.odds){if(x<p)return uncap?r:capRar(r);x-=p;}return 'normal';}
function reitemOdds(uncap){const o={};for(const [r,p] of REITEM.odds){const c=uncap?r:capRar(r);o[c]=Math.round(((o[c]||0)+p)*1e6)/1e6;}return Object.entries(o);}
function reitemRoll(uncap){const pool=Object.keys(BASES).filter(k=>BASES[k].type&&!BASES[k].set&&!/_god$|^h_crown$/.test(k)),r=reitemRarity(uncap);
  return newItem(pick(rarPool(pool,r,uncap)),r,Math.max(1,G.level),uncap);}   /* ร้านรี = reitemRoll(true) · รางวัลอารีนา = reitemRoll() ติดเพดาน */

/* ---- นักเล่นแร่แปรธาตุ: ใช้อุปกรณ์ชนิดเดียวกัน 2 ชิ้น → ได้ชิ้นเดิม 1 ชิ้นที่สุ่มค่า (affix) ใหม่ ----
   ระดับ = ระดับที่สูงกว่า · iLv = สูงกว่า · ตีบวก = สูงกว่า */
const Alchemy={
  canFuse(a,b){return!!a&&!!b&&a!==b&&a.base===b.base&&!Equip.isEquipped(a)&&!Equip.isEquipped(b);},
  fuse(a,b,lock){if(!this.canFuse(a,b))return{ok:false,err:'ต้องเป็นอุปกรณ์ชนิดเดียวกัน 2 ชิ้น และไม่ได้สวมอยู่'};
    const keep=lock?[...a.affixes,...b.affixes].find(x=>x.k===lock.k&&x.v===lock.v):null;
    if(lock&&(!keep||(G.mats.philostone||0)<1))return{ok:false,err:'ต้องมีศิลานักปราชญ์ 1 ก้อนเพื่อล็อกค่า'};
    const rar=RARS.indexOf(a.rar)>=RARS.indexOf(b.rar)?a.rar:b.rar,ni=newItem(a.base,rar,Math.max(a.ilvl,b.ilvl));
    if(keep){Inv.take('philostone',1);ni.affixes=ni.affixes.filter(x=>x.k!==keep.k);if(ni.affixes.length>=Math.max(1,RARITY[ni.rar].affix[1]))ni.affixes.shift();ni.affixes.unshift({k:keep.k,v:keep.v,locked:1});}
    ni.enh=Math.max(a.enh||0,b.enh||0);if(a.crafted||b.crafted)ni.crafted=1;ni.enh=Math.min(ni.enh,Equip.maxEnh(ni));
    Inv.remove(a);Inv.remove(b);Inv.addItem(ni);return{ok:true,item:ni};}
};

/* ---- ร้านค้าพิเศษ: สต็อกและเวลารีสต็อกแยกตามรายชิ้น (ไม่ดรอปจากมอนสเตอร์/บอส) ---- */
const SpecialShop={
  state(id){
    const def=SPECIAL_SHOP.find(x=>x.id===id);if(!def)return null;
    G.shopCD=G.shopCD||{};let s=G.shopCD[id];const now=Date.now();
    if(!s||typeof s.left!=='number'||(s.resetAt&&now>=s.resetAt)){s=G.shopCD[id]={left:def.max,resetAt:0};}
    if(s.left>def.max)s.left=def.max;
    if(s.resetAt&&s.resetAt-now>def.cdH*3600000)s.resetAt=now+def.cdH*3600000;
    const cdMs=s.left<def.max&&s.resetAt?Math.max(0,s.resetAt-now):0;
    return{def,left:s.left,max:def.max,cdMs};
  },
  buy(id){
    const st=this.state(id);if(!st)return{ok:false,msg:'ไม่พบสินค้า'};
    if(st.left<=0)return{ok:false,msg:'สินค้าหมด — รอรีสต็อก'};
    if(G.gold<st.def.price)return{ok:false,msg:'ทองไม่พอ'};
    G.gold-=st.def.price;Inv.add(id,1);
    const s=G.shopCD[id];s.left--;if(!s.resetAt)s.resetAt=Date.now()+st.def.cdH*3600000;
    Save.save();return{ok:true,msg:`ซื้อ ${MATS[id].n} แล้ว (${st.def.price} ทอง)`};
  },
  fmtCD(ms){if(ms<=0)return'';const s=Math.ceil(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;
    return h>0?`${h} ชม. ${m} น.`:`${m}:${String(sc).padStart(2,'0')}`;}
};
