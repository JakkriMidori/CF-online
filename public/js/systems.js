'use strict';
/* ============================================================
   SYSTEMS — Stats · Combat · Status · Items/Equipment/Inventory ·
   Crafting · Loot · Skills · Progression · Encyclopedia · Quests · Save
   (each maps 1:1 to a BP_*Component in the Unreal spec)
   ============================================================ */
const G={miniOff:true,diff:'souls',lootLog:[],pity:{},shopCD:{},gidSeq:0,mode:'title',t:0,shake:0,tt:0,talent:null,level:1,xp:0,points:0,alloc:{str:0,agi:0,int:0,vit:0,luk:0},
  hp:0,mp:0,bag:[],mats:{},gold:0,eq:{weapon:null,helmet:null,armor:null,gloves:null,pants:null,boots:null,ring1:null,ring2:null,necklace:null},
  known:new Set(),found:new Set(),skills:{learned:new Set(),slots:[null,null,null,null],cd:{},bound:null,lv:{}},mastery:{},ency:{},q:{},flags:{},uid:1,
  stats:{maxCombo:0,parries:0,fullCombos:0,crafts:0,craftOk:0},dmgLog:[],god:false};

/* ---------------- CharacterStats ---------------- */
const BASE_ATTR={str:10,agi:10,int:10,vit:10,luk:10};
const ATTRN={str:'STR',agi:'AGI',int:'INT',vit:'VIT',luk:'LUK'};
const itemByUid=u=>G.bag.find(i=>i.uid===u);
const equipped=()=>SLOTS.map(s=>G.eq[s]&&itemByUid(G.eq[s])).filter(Boolean);
function itemStats(it){
  /* ระบบไอเทมใหม่: ค่าฐาน (ATK อาวุธ / DEF ชุดเกราะ) × ระดับ × iLv × ตีบวก · ค่าความสามารถตามเทียร์ · ค่าติดตัวของฐาน · รูน */
  const b=BASES[it.base],R=RARITY[it.rar]||RARITY.normal,em=1+GEAR.enhStep*(it.enh||0),s={};   /* ไม่มีเลเวลไอเทมแล้ว: ค่าฐาน × ระดับ × ตีบวก */
  const add=(k,v)=>s[k]=(s[k]||0)+v;
  if(b.atk)add('watk',Math.round(b.atk*R.mult*em));
  if(b.def)add('def',Math.round(b.def*R.mult*em));
  const impOn=implicitOn(it.rar);
  if(impOn&&b.edmg)for(const k in b.edmg)add('dmg_'+k,b.edmg[k]);   /* โบนัสดาเมจธาตุติดตัวของอาวุธ (ไม่กินช่องค่าความสามารถ) */
  if(impOn&&b.res)for(const k in b.res)add('res_'+k,b.res[k]);      /* ค่าต้านธาตุติดตัวของเกราะ */
  if(impOn&&b.implicit)for(const k in b.implicit)add(k,b.implicit[k]);   /* ค่าติดตัวตายตัว (ไม่คูณระดับ) */
  for(const a of it.affixes||[]){const v=Gear.val(a,it);if(v)add(GAFX[a.k].stat,v);}
  for(const rk of it.sockets||[]){const m=rk&&MATS[rk];if(m&&m.rune)for(const k in m.rune)add(k,m.rune[k]);}
  return s;
}
/* โบนัสเซ็ต: นับเฉพาะชิ้นที่เป็นระดับ "หายาก" (rare) · ใช้ขั้นสูงสุดที่ถึง (ค่าในตารางเป็นค่ารวม) */
function setCounts(list){const c={};for(const it of list){const b=BASES[it.base],st=b&&b.setTag;if(st&&it.rar==='rare'&&SETS[st]&&Object.keys(SETS[st].b).length)c[st]=(c[st]||0)+1;}return c;}
function activeSetBonuses(list){const out=[];const c=setCounts(list);for(const id in c){const ns=Object.keys(SETS[id].b).map(Number).filter(n=>c[id]>=n);if(ns.length){const n=Math.max(...ns);out.push({set:id,n,b:SETS[id].b[n]});}}return out;}
/* ลานประลอง PvP: ชุดของแต่ละคน (เลเวล ค่าพลัง อุปกรณ์ สกิล) ส่งเป็น JSON ได้ */
function vsLoadout(){
  const S=Stats.player();
  return{name:((G.look&&G.look.name)||'').trim(),S:Object.assign({},S,{passives:[...(S.passives||[])],flat:undefined,base:undefined}),level:G.level,guildRank:Guild.rank(),talent:G.talent||null,
    look:Equip.look(),wpn:Equip.weaponType(),bound:G.skills.bound||null,skLv:Object.assign({},G.skills.lv||{}),
    skills:G.skills.slots.slice(0,5).map(id=>(id&&SKILLS[id]&&!SKILLS[id].bossOnly)?id:null)};}
function vsLoadoutToS(lo){return Object.assign({},lo.S,{passives:new Set(lo.S.passives||[]),res:Object.assign({},lo.S.res||{}),mods:[]});}
const Stats={
  derive(attr,flat,lv,talent,passives){
    const S={level:lv,...attr};
    S.maxHP=Math.round((500+attr.vit*20+lv*50+(flat.hp||0))*(1+(flat.hpPct||0)));
    const TP=TALENT_PASSIVE[talent]||{};
    S.maxMP=Math.round((100+attr.int*10+(flat.mp||0))*(1+(TP.maxMPPct||0)));
    S.maxSTA=100+(attr.agi-10)*2+(flat.sta||0);
    S.critRate=Math.min(CONFIG.critCap,.05+attr.luk*.002+(flat.critRate||0)+(TP.critRate||0));
    S.critDmg=Math.min(CONFIG.critDmgCap,1.5+attr.luk*.01+(flat.critDmg||0)+(TP.critDmg||0));
    S.mcritDmg=0;   /* ตัดคริป้ายเวทออก (ระบบใหม่) */
    const DV=CONFIG.derived,t10=v=>Math.floor((v||0)/10);
    S.def=Math.round((10+(flat.def||0)+Math.round((flat.mdef||0)*CONFIG.mdefFold)+t10(attr.agi)*DV.agiPer10Def)*(1+(flat.defPct||0)+(TP.defPct||0)));S.mdef=S.def;   /* ไม่มี M.DEF: ค่า mdef ของอุปกรณ์เดิมรวมเข้า DEF ตามสัดส่วน CONFIG.mdefFold */
    S.evasion=Math.min(DV.evaCap,t10(attr.agi)*DV.agiPer10Eva+(flat.evasion||0)+(TP.evasion||0));
    S.apen=(flat.apen||0)+(TP.apen||0)+(flat.mpen||0)+(TP.mpen||0)+(passives.has('void')?50:0);   /* เจาะเวทเดิมรวมเข้าเจาะเกราะ */
    S.mdefShred=passives.has('void')?.2:0;S.mpen=(flat.mpen||0)+(TP.mpen||0);S.mpenPct=Math.min(1,flat.mpenPct||0);   /* เจาะเวท: % ก่อน แล้วหักค่าคงที่ (หลักการเดียวกับเจาะเกราะ) */
    S.apenPct=Math.min(1,(flat.apenPct||0)+(flat.mpenPct||0)+(TP.apenPct||0));S.blindChance=flat.blindChance||0;S.chaosChance=flat.chaosChance||0;                       // เจาะเกราะ % (คิดก่อนเจาะเกราะแบบค่าคงที่)
    S.pcritRes=0;S.mcritRes=0;   /* ตัดต้านคริออก (ไม่ใช้คำนวณ) */   // ต้านคริติคอลกายภาพ / เวท
    S.dr=Math.min(CONFIG.drCap,(flat.dr||0)+(TP.dr||0));
    S.watk=flat.watk||10;   /* ATK ค่าเดียว: อาวุธ (กายภาพ+เวทเดิม) + STR×2 + INT×2 + ATK/M.ATK จากอุปกรณ์ × (1 + โบนัส ATK%) */
    S.ap=Math.round((S.watk+(flat.wmatk||0)+attr.str*2+attr.int*2+(flat.atk||0)+(flat.matk||0))*(1+(TP.atkPct||0)+(TP.mpowPct||0)+(flat.mpowPct||0)+(flat.atkPct||0)));S.mpow=S.ap;S.dmgPct=flat.dmgPct||0;
    S.elDmg={};for(const k of ['phys','fire','ice','lightning','shadow','holy','magic']){const v=(flat['dmg_'+k]||0)+((TP.elDmg&&TP.elDmg[k])||0)+(k!=='phys'?(TP.elDmgAll||0):0);if(v)S.elDmg[k]=v;}   /* + โบนัสธาตุจากคลาส */   /* โบนัสดาเมจตามป้าย */
    S.res={};for(const k of ELEMS){const v=(flat['res_'+k]||0)+((TP.res&&TP.res[k])||0);if(v>0)S.res[k]=Math.min(CONFIG.resCap,v);}
    S.hotPct=(TP.hotPct||0)+(flat.hotPct||0);S.magicDmg=flat.magicDmg||0;S.reflect=Math.min(.3,flat.reflect||0);   /* ฟื้น HP ต่อวินาทีจากคลาส (เช่น Phoenix 1%) */   /* ค่าต้านธาตุจากอุปกรณ์ (res_fire …) */
    S.spd=1;S.passives=passives;   /* ตัดค่าความเร็วออก (ความเร็วคงที่) */
    S.mpRegen=Math.min(CONFIG.mana.recoveryCap,flat.mpRegen||0);S.mpCost=Math.min(CONFIG.mana.costCap,flat.mpCost||0);S.statusRes=Math.min(.75,(flat.statusRes||0)+(TP.statusRes||0)+t10(attr.str)*DV.strPer10Res);
    S.statusChance=(TP.statusChance||0)+(flat.statusChance||0);S.dotPct=0;   /* ตัดโบนัส DoT ออก */S.talent=talent||null;   // ชุดนักแปรธาตุ: +โอกาสติด / +DoT
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
      out.def=b.def+t10(attr.agi)*DV.agiPer10Def;out.mdef=b.mdef;}
    out.apenPct=def.immortal?0:(def.challenge?Math.min(.32,.04+lv*.002):Math.min(.28,lv*.002+(def.boss?.08:0)));
    out.pcritRes=0;out.mcritRes=0;
    out.chaosChance=def.chaosChance||0;
    return out;
  },
  enemyCore(def,lv,elite,b,k,em,D){
    return{level:lv,maxHP:Math.round(b.hp*(1+.16*k)*(em?em.hp:1)*D.eHP),ap:Math.round(b.atk*(1+.115*k)*(em?em.atk:1)*D.eATK),mpow:Math.round(b.atk*(1+.115*k)*(em?em.atk:1)*D.eATK),
      def:Math.round((b.def*(1+.035*k)+2.0*k)*(em?1.18:1)*(def.boss?1.12:1)),mdef:Math.round(b.mdef*(1+.035*k)+1.8*k),pcritRes:0,mcritRes:Math.min(.75,Math.floor((b.mdef+.8*k)/10)*CONFIG.derived.defPer10Crit),evasion:0,critRate:b.critRate||.05,critDmg:1.5,apen:0,mdefShred:0,dr:0,res:Object.assign({},def.res||{}),passives:new Set(),spd:1};
  }
};
/* ---- Difficulty + death penalty (Dark Souls-style bloodstain) ---- */
const Diff={
  cur(){return DIFFICULTY[CONFIG.diffLock||G.diff]||DIFFICULTY.souls;},
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

/* ---------------- Combat (central damage calculation) — ระบบต่อสู้ใหม่ (combatV2) ----------------
   แผนภาพ: ATK → ป้ายดาเมจ 1 ป้าย → เกราะ → ค่าต้าน → โบนัสดาเมจธาตุ → คริ → (ถ้ามี) โบนัสสถานการณ์ → DR
   ป้าย: phys(กายภาพ) | holy(แสง) | shadow(มืด) | fire | ice | lightning | magic(เวท = ไม่มีธาตุแต่ใช้เวท / อาคม / พิษตีตรง) | true(ดาเมจจริง)
   1) raw = ATK × coef                              — ATK ค่าเดียว (ไม่มี MAG)
   2) × K/(K+DEFeff), K = armorK0 + armorKper×เลเวลผู้ตี, DEFeff = max(0, DEF×(1−เจาะ%) − เจาะคงที่)
   3) × (1 − ค่าต้าน[ป้าย])  0…75% (กายภาพไม่มีค่าต้าน — DEF ทำหน้าที่นี้) · คำสาปมืดลดค่าต้านของเป้า
   4) × (1 + โบนัสทุกดาเมจ + โบนัสดาเมจ[ป้าย])  — บวกรวมก่อน คูณครั้งเดียว
   5) คริ  6) โบนัสสถานการณ์ (แต่ละชื่อครั้งเดียว)  7) × (1 − DR) cap 75% · ดาเมจจริงข้ามขั้น 2, 3, 7 */
const dmgTag=h=>{if(h.trueDmg)return'true';const e=h.el;
  if(!e||e==='phys'||e==='weapon')return h.type==='magic'?'magic':'phys';
  return(e==='arcane'||e==='poison'||e==='magic')?'magic':e;};
const resKey=t=>t==='magic'?'arcane':t;
const armorK=A=>CONFIG.armorK0+CONFIG.armorKper*Math.max(1,A.level||A.lv||1);
function calcDamage(A,T,h){
  const tag=dmgTag(h),tru=tag==='true';
  const defUsed=tru||h.ignoreDef?0:Math.max(0,(T.def||0)*(1-Math.min(1,(A.apenPct||0)+(A.mdefShred||0)+(h.defPen||0)))-(A.apen||0));
  const raw=Math.max(1,(A.ap||0)*h.coef),K=armorK(A),armor=K/(K+defUsed);
  let dmg=raw*armor;const base=dmg;
  let res=0;if(!tru&&!h.ignoreRes&&tag!=='phys'){res=((T.res&&T.res[resKey(tag)])||0)-(T.resDown||0);res=Math.max(CONFIG.allowWeak?-.5:0,Math.min(CONFIG.resCap,res));}
  dmg*=1-res;
  dmg*=1+(A.dmgPct||0)+((A.elDmg&&A.elDmg[tag])||0)+(h.type==='magic'?(A.magicDmg||0):0);   /* ชุดนักปราชญ์: ดาเมจเวท (ทุกท่าประเภทเวท) */
  const crit=!!h.forceCrit||rand()<Math.max(0,Math.min(CONFIG.critCap,A.critRate));   /* ไม่มีต้านคริ */
  if(crit)dmg*=Math.min(CONFIG.critDmgCap,A.critDmg+(tag==='magic'?(A.mcritDmg||0):0));
  const mods={};
  if(h.stunned)mods.stun=1+CONFIG.stunBonus;
  if(h.fullCombo)mods.fullCombo=1+CONFIG.fullComboBonus;
  if(h.weakPoint)mods.weakPoint=h.weakPoint;
  if(h.counter)mods.counter=1.1;
  if(h.mastery)mods.mastery=1+h.mastery;
  if(h.execute)mods.execute=1.3;
  if(h.berserk)mods.berserk=1+h.berserk;
  for(const k in mods)dmg*=mods[k];
  const dr=tru?0:Math.min(CONFIG.drCap,(T.dr||0)+(T.buffDr||0));dmg*=1-dr;
  return{dmg:Math.max(1,Math.round(dmg)),crit,mods,dr,res,tag,defUsed,armor,K,base:Math.round(base)};
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
  init(f){f.st8={poison:null,bleed:null,burn:null,shock:null,stun:null,blind:null,chaos:null,freeze:null,radiance:null,curse:null,frostbite:null,arcaneburn:null};f.stunImm=0;},
  /* ATK มาตรฐานตามเลเวล — ฐานของ DoT (ไม่ขึ้นกับ ATK/อุปกรณ์ขณะนั้น) */
  stdATK(lv){const c=CONFIG.dot2;return c.atkBase+c.atkPer*Math.max(1,lv||1);},
  srcLv(src,f){return(src&&src.S&&src.S.level)||(src&&src.lv)||(f&&f.S&&f.S.level)||(f&&f.lv)||1;},
  /* โอกาสติดสถานะสุดท้าย = 100% + โบนัสโอกาสติดของผู้ใช้ (Hexweaver +25%) − ค่าต้านของเป้าหมาย (จำกัด 0–100%) */
  chance(src,f,type){const R=Math.min(1,((f.statusRes||{})[type]||0)+((f.S&&f.S.statusRes)||0)),bonus=(src&&src.S&&src.S.statusChance)||0;return clamp(1+bonus-R,0,1);},
  /* returns 'ok' | 'capped' | 'resist' | 'immune' | 'stunned' */
  apply(f,type,stacks=1,src=null,durSec=0){
    const s=f.st8,SS=src&&src.S,rawSec=durSec>0?durSec:(type==='freeze'?8:CONFIG.statusDur/60),adjSec=(src&&src.kind==='duelist'&&(type==='shock'||type==='stun'))?Math.max(.5,rawSec-1.5):rawSec,baseFr=Math.round(adjSec*60*(1-.5*Math.min(1,((f.statusRes||{})[type]||0)+((f.S&&f.S.statusRes)||0)))),Dur=Math.round(baseFr+(SS&&SS.talent==='hexweaver'?(SS.statusChance||0)*100*CONFIG.statusChanceDur*60:0)),   // เฉพาะ Hexweaver: +0.05 วิ ต่อโอกาสติดสถานะ 1% · freeze เริ่มต้น 8 วิ (480 เฟรม) · bbqy ลดเวลาช็อก/สตั้นลง 1.5 วิ
      R=Math.min(1,((f.statusRes||{})[type]||0)+((f.S&&f.S.statusRes)||0));
    if(R>=1||(type==='burn'&&f.S&&f.S.immuneBurn)||f.statusImm>0)return'immune';   // Iron Wall: กันสถานะทุกชนิด
    const chance=Status.chance(src,f,type);                 // คำนวณใหม่ทุกครั้งที่ติดสถานะ
    if(chance<1&&rand()>=chance)return'resist';
    const mul=1,hex=SS&&SS.talent==='hexweaver',T=o=>hex&&o?o.t+Dur:Dur;   // Hexweaver: ติดซ้ำ = เวลาต่อท้าย ไม่มีเพดาน · คนอื่นรีเฟรชเป็นค่าเดิม
    const lv=Status.srcLv(src,f);
    if(type==='poison'||type==='bleed'||type==='curse'||type==='frostbite'||type==='arcaneburn'){
      if(type==='frostbite'&&s.burn&&src){s.burn=null;s.frostbite=null;Status.onSynergy&&Status.onSynergy(f,'melt',src);return'ok';}   /* ละลาย */
      if(type==='curse'&&s.radiance&&src){s.radiance=null;s.curse=null;Status.onSynergy&&Status.onSynergy(f,'eclipse',src);return'ok';}   /* สุริยคราส */
      const mx=(CONFIG.dot2[type]&&CONFIG.dot2[type].max)||CONFIG.maxStacks;let any=false;
      for(let i=0;i<stacks;i++){const c=s[type];if(!c){s[type]={stacks:1,t:Dur,tk:0,mul,lv};any=true;}else if(c.stacks<mx){c.stacks++;c.t=T(c);c.mul=Math.max(c.mul||1,mul);c.lv=Math.max(c.lv||1,lv);any=true;}else if(hex){c.t=T(c);any=true;}}
      if(type==='frostbite'&&s.frostbite&&s.frostbite.stacks>=mx){s.frostbite=null;this.apply(f,'freeze',1,src,CONFIG.dot2.frostbite.freezeSec);}   /* ครบ 5 สแตก → แช่แข็ง */
      return any?'ok':'capped';
    }
    if(type==='radiance'){if(s.curse&&src){s.radiance=null;s.curse=null;Status.onSynergy&&Status.onSynergy(f,'eclipse',src);return'ok';}
      s.radiance=s.radiance?Object.assign(s.radiance,{t:T(s.radiance),mul:Math.max(s.radiance.mul||1,mul),lv:Math.max(s.radiance.lv||1,lv)}):{t:Dur,tk:0,mul,lv};return'ok';}
    if(type==='burn'&&s.frostbite&&src){s.frostbite=null;s.burn=null;Status.onSynergy&&Status.onSynergy(f,'melt',src);return'ok';}   /* ละลาย */
    if(type==='burn'){const hadPoison=!!s.poison;s.burn=s.burn?Object.assign(s.burn,{t:T(s.burn),mul:Math.max(s.burn.mul||1,mul),lv:Math.max(s.burn.lv||1,lv)}):{t:Dur,tk:0,mul,lv};
      if(hadPoison&&src){this.apply(f,'poison',2,null);Status.onSynergy&&Status.onSynergy(f,'toxicfire',src);}return'ok';}
    if(type==='shock'){const hadBurn=!!s.burn;s.shock=s.shock?Object.assign(s.shock,{t:T(s.shock),mul:Math.max(s.shock.mul||1,mul),lv:Math.max(s.shock.lv||1,lv)}):{t:Dur,tk:0,mul,lv};
      if(hadBurn&&src){s.burn=null;Status.onSynergy&&Status.onSynergy(f,'plasma',src);}
      this.apply(f,'stun',1,src,durSec);return'ok';}
    if(type==='blind'){s.blind=s.blind?Object.assign(s.blind,{t:T(s.blind)}):{t:Dur,tk:0};return'ok';}   // ตาบอด: โจมตีไม่โดน
    if(type==='chaos'){if(s.chaos)return'capped';s.chaos={t:240,tk:0};return'ok';}   /* โกลาหล: 4 วิ ติดซ้ำไม่ได้ขณะยังมีผล */
    if(type==='freeze'){if(s.freeze){s.freeze.t=Math.max(s.freeze.t,Dur);return'ok';}s.freeze={t:Dur,hits:0,tk:0};return'ok';}   /* แช่แข็ง: 3 วิ · ครบ 5 ฮิตจะน้ำแข็งแตก 2× */
    if(type==='stun'){if(s.stun)return'stunned';if(f.stunImm>0)return'immune';s.stun={t:Dur,tk:0};Status.onStun&&Status.onStun(f);return'ok';}
    return'ok';
  },
  dps(f){let d=0;for(const k in f.st8)if(f.st8[k])d+=this.tickOf(k,f.st8[k],f);return d;},
  /* DoT/วิ = ATKมาตรฐาน(เลเวลผู้ใส่) × %ต่อสแตก × สแตก × (1+โบนัส DoT) × (1 − ค่าต้านธาตุของ DoT) — ไม่โดน DEF · DR หักตอน tick (incoming) */
  tickOf(type,o,f){const c=CONFIG.dot2[type];if(!c)return 0;const T=f&&f.S,r=c.el&&T?Math.max(0,Math.min(CONFIG.resCap,((T.res&&T.res[c.el])||0)-(T.resDown||0))):0;
    return Math.max(1,Math.round(this.stdATK((o&&o.lv)||1)*c.pct*((o&&o.stacks)||1)*((o&&o.mul)||1)*(1-r)));},
  healMul(f){return f&&f.st8&&f.st8.radiance?1-CONFIG.dot2.radiance.healCut:1;},   /* แสงเผาผลาญ: ฟื้น HP ได้ครึ่งเดียว */
  slowMul(f){const o=f&&f.st8&&f.st8.frostbite;return o?Math.max(.4,1-o.stacks*CONFIG.dot2.frostbite.slow):1;},   /* น้ำแข็งกัด: ช้าลงทุกสแตก */
  update(f,onTick){
    const s=f.st8;if(f.stunImm>0)f.stunImm--;if(f.statusImm>0)f.statusImm--;
    for(const k in s){const o=s[k];if(!o)continue;o.t--;o.tk++;
      if(o.tk>=CONFIG.dotTick){o.tk=0;const d=this.tickOf(k,o,f);if(d&&onTick)onTick(k,d);}
      if(o.t<=0){s[k]=null;if(k==='stun'){f.stunImm=f.stunImmuneAfter||CONFIG.stunImmuneAfter;Status.onStunEnd&&Status.onStunEnd(f);}}}
    if(f.S)f.S.resDown=s.curse?s.curse.stacks*CONFIG.dot2.curse.resDown:0;   /* คำสาปมืด: ลดค่าต้านธาตุทุกธาตุ */
  },
  cleanse(f){for(const k in f.st8)f.st8[k]=null;},
  list(f){return Object.keys(f.st8).filter(k=>f.st8[k]).map(k=>({k,stacks:f.st8[k].stacks||0,hits:f.st8[k].hits||0,t:f.st8[k].t}));}
};

/* ---------------- Items / Equipment / Inventory ---------------- */
// ไอเทมระดับตายตัว (fixRar) สุ่มได้เฉพาะตอนสุ่มได้ระดับนั้นพอดี
const rarPool=(pool,rar,uncap)=>{const r=uncap?rar:capRar(rar),f=pool.filter(k=>!BASES[k].fixRar||BASES[k].fixRar===r);return f.length?f:pool.filter(k=>!BASES[k].fixRar);};
const rarCap=()=>{const g=typeof Guild!=='undefined'&&G&&G.guildRank?Guild.info().maxRar:'rare',m=CONFIG.maxRarity;return RARS.indexOf(g)<RARS.indexOf(m)?g:m;};   // เพดานระดับไอเทมตามแรงค์กิลด์
const capRar=r=>RARS.indexOf(r)>RARS.indexOf(rarCap())?rarCap():r;   // ตัดระดับไอเทมไม่ให้เกิน CONFIG.maxRarity
function newItem(baseId,rar,ilvl,uncap){   /* uncap=true: ใช้เฉพาะร้านรีไอเทม (ข้ามเพดาน maxRarity) */
  rar=BASES[baseId].fixRar||(uncap?rar:capRar(rar));ilvl=Math.max(1,ilvl|0);
  if(rar==='legendary'&&!LEGEND_OK.has(baseId)&&uncap!=='debug')rar='epic';   /* ตำนานมีได้แค่ดาบ bbqy / ดาบราชาอัศวินแสง */   // ของระดับตายตัวไม่ถูกตัดเพดาน
  const it={uid:G.uid++,base:baseId,rar,enh:0,affixes:[],sockets:[],uniq:null};   // ไม่มีเลเวลไอเทม / เลเวลสวมใส่   // ช่องรูนเริ่ม 0 ช่อง (เจาะเพิ่มด้วยสว่านรูน)
  for(let i=0;i<RARITY[rar].affix;i++)it.affixes.push(Gear.roll(it));
  if(RARITY[rar].uniq)it.uniq=pick(Object.keys(PASSIVES[RARITY[rar].uniq]));   // ช่องความสามารถเทพ
  return it;
}
const itemName=it=>(it.rar==='god'?'✦ ':'')+BASES[it.base].n+(it.enh?` +${it.enh}`:'');
const fmtStat=(k,v)=>{const pct=(AFFIX[k]&&AFFIX[k].pct)||['atkPct','defPct','hpPct','evasion','statusChance','dotPct','mpowPct','dmgPct','apenPct','mpenPct','blindChance','chaosChance','magicDmg','reflect','hotPct'].includes(k)||k==='critRate'||k==='critDmg'||k==='dr'||k.startsWith('res')||k.startsWith('dmg_');return pct?`${v>0?'+':''}${Math.round(v*1000)/10}%`:`${v>0?'+':''}${Math.round(v)}`;};
const STATN2=Object.assign({magicDmg:'ดาเมจเวท',reflect:'สะท้อนดาเมจ',hotPct:'ฟื้น HP/วิ',apenPct:'ไม่สนเกราะ',mpenPct:'ไม่สนเกราะ (เวท)',blindChance:'โอกาสทำให้ตาบอด 5 วิ',chaosChance:'โอกาสสร้างโกลาหล 4 วิ',watk:'พลังอาวุธ',wmatk:'พลังเวทอาวุธ',def:'DEF',mdef:'DEF (เวทเดิม)',statusChance:'โอกาสสร้างสถานะ',dotPct:'ดาเมจสถานะ',mpowPct:'พลังเวท %',dmgPct:'ดาเมจทุกชนิด',atkPct:'ATK %',defPct:'DEF %',hpPct:'HP %',evasion:'หลบหลีก',sta:'สตามินา'},STATN);
const hasNoMaxLv=()=>!!(typeof G!=='undefined'&&G.talent&&TALENT_PASSIVE[G.talent]&&TALENT_PASSIVE[G.talent].noMaxLv);
const Equip={
  canEquip(it){return!!it;},   // ไม่มีเงื่อนไขเลเวลสวมใส่ (แรงค์กิลด์คุมระดับไอเทมแทน)
  slotFor(it){const t=BASES[it.base].type;if(t!=='ring')return t;if(!G.eq.ring1)return'ring1';if(!G.eq.ring2)return'ring2';return'ring1';},
  equip(it,slot){if(!this.canEquip(it))return false;slot=slot||this.slotFor(it);
    for(const s of SLOTS)if(G.eq[s]===it.uid)G.eq[s]=null;G.eq[slot]=it.uid;return true;},
  unequip(slot){G.eq[slot]=null;},
  isEquipped(it){return SLOTS.some(s=>G.eq[s]===it.uid);},
  weaponType(){const w=G.eq.weapon&&itemByUid(G.eq.weapon);return w?BASES[w.base].wt:'fist';},
  /* ---- ตีบวก +0..+15: เพิ่มค่าฐาน 5%/ขั้น · พลาดไม่ลดขั้น (เสียทองและวัตถุดิบ) · +11 ขึ้นไปใช้หินเสริมพลังเพิ่ม 1 ก้อน ---- */
  enhanceCost(it){const r=RARS.indexOf(it.rar)+1,n=it.enh||0,bonus=(G.talent&&TALENT_PASSIVE[G.talent]&&TALENT_PASSIVE[G.talent].enhBonus)||0;
    return{gold:40*(n+1)*r,ore:3+n,rock:n>=GEAR.enhRockFrom?1:0,rate:Math.min(1,(GEAR.enhRates[n]??0)+(n<GEAR.enhMax?bonus:0))};},
  maxEnh(it){const k=typeof Guild!=='undefined'&&G.guildRank?Guild.info().enhMax:GUILD_RANKS[0].enhMax;return Math.min(GEAR.enhMax,k||GEAR.enhMax);},   // เพดานตีบวกตามแรงค์ (+5 / +10 / +15)
  canPay(c){return G.gold>=c.gold&&(G.mats.ore||0)>=c.ore&&(!c.rock||(G.mats.exprock||0)>=c.rock);},
  enhance(it){if(!it)return{ok:false,msg:'ไม่พบอุปกรณ์'};if((it.enh||0)>=this.maxEnh(it))return{ok:false,msg:(it.enh||0)>=GEAR.enhMax?'ตีบวกสูงสุดแล้ว (+'+GEAR.enhMax+')':`ตีบวกเต็มเพดานแรงค์แล้ว (+${this.maxEnh(it)}) — เลื่อนแรงค์เพื่อปลดเพดาน`};const c=this.enhanceCost(it);
    if(!this.canPay(c))return{ok:false,msg:c.rock?'ทอง แร่เหล็ก หรือหินเสริมพลังไม่พอ':'ทองหรือแร่เหล็กไม่พอ'};
    G.gold-=c.gold;Inv.take('ore',c.ore);if(c.rock)Inv.take('exprock',c.rock);
    const ok=rand()<c.rate;if(ok)it.enh=(it.enh||0)+1;
    if(typeof StatSync!=='undefined')StatSync.invalidate('enh');
    return{ok,rate:c.rate,msg:ok?`ตีบวกสำเร็จ! → +${it.enh}`:`ตีบวก +${(it.enh||0)+1} ล้มเหลว (ขั้นไม่ลด · เสียทองและวัตถุดิบ)`};},
  /* ---- วิวัฒน์: ต้องตีบวกถึงเพดานแรงค์ · ใช้หินวิวัฒน์ตามระดับ · ขึ้นระดับ 1 ขั้น · ได้ค่าความสามารถใหม่ 1 ค่า (ตำนาน→เทพ ได้ความสามารถเทพแทน) · ตีบวกคงเดิม ---- */
  evoCost(it){return it&&GEAR.evoCost[it.rar]||0;},
  evoAllowed(it){const n=RARS[RARS.indexOf(it.rar)+1],cap=rarCap();if(n==='legendary'&&!LEGEND_OK.has(it.base))return false;return!!n&&(RARS.indexOf(n)<=RARS.indexOf(cap)||(n==='god'&&cap==='legendary'));},   // วิวัฒน์ได้ไม่เกินเพดานแรงค์ (เทพ: แรงค์ A ขึ้นไป)
  canEvolve(it){return!!it&&(it.enh||0)>=this.maxEnh(it)&&RARS.indexOf(it.rar)<RARS.length-1&&this.evoAllowed(it);},
  evolve(it){if(!it)return{ok:false,msg:'ไม่พบอุปกรณ์'};
    const ri=RARS.indexOf(it.rar);if(ri<0||ri>=RARS.length-1)return{ok:false,msg:'ระดับสูงสุดแล้ว (เทพ)'};
    if((it.enh||0)<this.maxEnh(it))return{ok:false,msg:`ต้องตีบวกถึง +${this.maxEnh(it)} (เพดานแรงค์) ก่อนวิวัฒน์`};
    if(RARS[ri+1]==='legendary'&&!LEGEND_OK.has(it.base))return{ok:false,msg:'อุปกรณ์ระดับมหากาพย์วิวัฒน์ต่อไม่ได้ — ระดับตำนานมีเฉพาะดาบ bbqy และดาบราชาอัศวินแสง'};
    if(!this.evoAllowed(it)){const n=RARS[ri+1],need=GUILD_RANKS.find(k=>RARS.indexOf(k.maxRar)>=RARS.indexOf(n==='god'?'legendary':n));return{ok:false,msg:`วิวัฒน์เป็น${RARN[n]}ต้องมีแรงค์กิลด์ ${need?need.id:'สูงขึ้น'} ขึ้นไป`};}
    const n=this.evoCost(it),g=GEAR.cost.evo.gold;
    if(!Inv.has('evostone',n))return{ok:false,msg:`ต้องใช้หินแห่งการวิวัฒน์ ${n} ก้อน`};if(G.gold<g)return{ok:false,msg:`ต้องใช้ ${g} ทอง`};
    Inv.take('evostone',n);G.gold-=g;const nextRar=RARS[ri+1];it.rar=nextRar;let gain='';
    if((it.affixes||[]).length<RARITY[nextRar].affix){const a=Gear.roll(it);it.affixes.push(a);gain=` · ได้ค่าใหม่ ${Gear.label(a,it)} [T${a.t}]`;}
    if(RARITY[nextRar].uniq&&!it.uniq){it.uniq=pick(Object.keys(PASSIVES[RARITY[nextRar].uniq]));gain=` · ได้ความสามารถเทพ ${PASSIVES.god[it.uniq].n}`;}
    if(typeof StatSync!=='undefined')StatSync.invalidate('evolve');
    return{ok:true,rar:nextRar,msg:`✨ วิวัฒน์สำเร็จ! → ${RARN[nextRar]}${gain} · ตีบวกคงเดิม +${it.enh}`};},
  /* ใส่/ถอดรูน: ใส่ได้เฉพาะช่องที่เจาะเปิดแล้ว · ถอดคืนกระเป๋าไม่เสียรูน */
  socketRune(it,idx,runeId){if(!it||!Array.isArray(it.sockets)||idx<0||idx>=it.sockets.length)return{ok:false,msg:'ไม่พบช่องรูน (เจาะด้วยสว่านรูนก่อน)'};
    const m=MATS[runeId];if(!m||!m.rune||!Inv.has(runeId,1))return{ok:false,msg:'ไม่มีรูนนี้ในกระเป๋า'};
    if(it.sockets[idx])Inv.add(it.sockets[idx],1);Inv.take(runeId,1);it.sockets[idx]=runeId;
    if(typeof StatSync!=='undefined')StatSync.invalidate('rune');return{ok:true,msg:`ใส่ ${m.n} ในช่องที่ ${idx+1} แล้ว`};},
  unsocketRune(it,idx){if(!it||!Array.isArray(it.sockets)||!it.sockets[idx])return{ok:false,msg:'ช่องรูนว่างอยู่'};
    const rk=it.sockets[idx];it.sockets[idx]=null;Inv.add(rk,1);
    if(typeof StatSync!=='undefined')StatSync.invalidate('rune');return{ok:true,msg:`ถอด ${MATS[rk].n} คืนกระเป๋าแล้ว (ไม่สูญหาย)`};},
  look(){
    const LK=Object.assign({},DEFLOOK,G.look),K={hair:LK.hair,skin:LK.skin,eyec:LK.eye,hstyle:LK.hstyle,sex:LK.sex,elfEars:!!LK.elfEars,body:'#3d5f94',trim:'#8a5a32',pants:'#2c2a3a',boots:'#4a2e1e',gloves:null,head:null,hc:null,hc2:null,cape:null,scarf:null,pads:0,aura:null,trail:null,mask:0,sleeve:null,weapon:this.weaponType()};
    for(const it of equipped()){const b=BASES[it.base];if(b.look)Object.assign(K,b.look);const ic=typeof BASE_ICO!=='undefined'&&BASE_ICO[it.base];if(b.type==='necklace'&&ic)K.neck=ic[1];if(b.type==='ring'&&ic)K.ring=ic[1];if(it.rar==='god'&&!K.aura)K.aura='#ff4af0';}
    if(K.weapon==='gaunt'&&!K.gloves)K.gloves='#7fd8ff';return K;
  }
};
CONFIG.enhanceMax=GEAR.enhMax;   // ตีบวกสูงสุด +15
/* ---- ค่าความสามารถ (affix): {k, t, lock} · ค่าอ่านจาก GAFX ตามเทียร์ ---- */
const Gear={
  pool(it){return GPOOL[gearCat(BASES[it.base].type)];},
  val(a,it){const A=GAFX[a.k];if(!A)return 0;let v=A.t[Math.max(1,Math.min(5,a.t))-1];if(A.pct)v/=100;else if(A.lv&&it)v=Math.round(v*GEAR.flatScale*((RARITY[it.rar]||RARITY.normal).mult)*(1+GEAR.enhStep*(it.enh||0)));return v;},
  label(a,it){const A=GAFX[a.k];if(!A)return a.k;const v=this.val(a,it);return (a.k==='manaCost'?'−':'+')+(A.pct?Math.round(v*1000)/10+'%':v)+' '+A.n;},
  tier(){let x=rand()*GEAR.tierW.reduce((p,q)=>p+q,0);for(let i=0;i<5;i++){x-=GEAR.tierW[i];if(x<0)return i+1;}return 1;},
  roll(it,except){const used=new Set((it.affixes||[]).map(a=>a.k).concat(except||[])),p=this.pool(it).filter(k=>!used.has(k));return{k:pick(p),t:this.tier(),lock:false};},
  has(m,q){return(G.mats[m]||0)>=(q||1);},
  /* รีค่าทั้งหมด (ยกเว้นที่ล็อก) · หินรีค่า 1 + ตราล็อก 1 ต่อค่าที่ล็อก */
  rerollCost(it){const L=(it.affixes||[]).filter(a=>a.lock).length;return{gold:GEAR.cost.reroll.gold,stone:1,locks:L};},
  reroll(it){if(!it)return{ok:false,msg:'ไม่พบอุปกรณ์'};const c=this.rerollCost(it);
    if(c.locks>=it.affixes.length)return{ok:false,msg:'ล็อกครบทุกค่าแล้ว ไม่มีอะไรให้รี'};
    if(!this.has('rerollstone',1))return{ok:false,msg:'ต้องใช้หินรีค่า 1 ก้อน'};if(c.locks&&!this.has('philostone',c.locks))return{ok:false,msg:`ต้องใช้ตราล็อก (ศิลานักแปรธาตุ) ${c.locks} ก้อน`};
    if(G.gold<c.gold)return{ok:false,msg:`ต้องใช้ ${c.gold} ทอง`};
    Inv.take('rerollstone',1);if(c.locks)Inv.take('philostone',c.locks);G.gold-=c.gold;
    const keep=it.affixes.map(a=>a.lock?a:null),out=[];
    for(const a of keep)out.push(a||this.roll({base:it.base,affixes:out.concat(keep.filter(Boolean))}));
    it.affixes=out;StatSync.invalidate('reroll');return{ok:true,msg:`🎲 รีค่าแล้ว (ล็อก ${c.locks} ค่า)`};},
  toggleLock(it,i){const a=it&&it.affixes[i];if(!a)return false;a.lock=!a.lock;return true;},
  /* เปลี่ยนค่าที่เลือกเป็นค่าที่ต้องการ · เทียร์สุ่ม · ศิลาเลือกค่า 1 */
  pick(it,i,k){const a=it&&it.affixes[i];if(!a)return{ok:false,msg:'เลือกค่าก่อน'};if(a.lock)return{ok:false,msg:'ค่านี้ถูกล็อกอยู่'};
    if(!this.pool(it).includes(k))return{ok:false,msg:'ค่านี้ใส่ในอุปกรณ์ชนิดนี้ไม่ได้'};if(it.affixes.some((x,j)=>j!==i&&x.k===k))return{ok:false,msg:'มีค่านี้อยู่แล้ว'};
    if(!this.has('pickstone',1))return{ok:false,msg:'ต้องใช้ศิลาเลือกค่า 1 ก้อน'};if(G.gold<GEAR.cost.pick.gold)return{ok:false,msg:`ต้องใช้ ${GEAR.cost.pick.gold} ทอง`};
    Inv.take('pickstone',1);G.gold-=GEAR.cost.pick.gold;a.k=k;a.t=this.tier();StatSync.invalidate('pick');return{ok:true,msg:`🎯 เปลี่ยนเป็น ${this.label(a,it)} [T${a.t}]`};},
  /* อัปเทียร์ 1 ขั้น · พลาดไม่ลด · หินอัปเทียร์ 1 */
  tierUp(it,i){const a=it&&it.affixes[i];if(!a)return{ok:false,msg:'เลือกค่าก่อน'};if(a.t>=5)return{ok:false,msg:'เทียร์สูงสุดแล้ว (T5)'};
    if(!this.has('tierstone',1))return{ok:false,msg:'ต้องใช้หินอัปเทียร์ 1 ก้อน'};if(G.gold<GEAR.cost.tier.gold)return{ok:false,msg:`ต้องใช้ ${GEAR.cost.tier.gold} ทอง`};
    Inv.take('tierstone',1);G.gold-=GEAR.cost.tier.gold;const p=GEAR.tierUp[a.t-1],ok=rand()<p;if(ok)a.t++;StatSync.invalidate('tier');
    return{ok,msg:ok?`✦ อัปเทียร์สำเร็จ → T${a.t} (${this.label(a,it)})`:`✦ อัปเทียร์ T${a.t+1} ล้มเหลว (โอกาส ${Math.round(p*100)}% · เทียร์ไม่ลด)`};},
  /* สว่านรูน: เปิดช่องรูนเพิ่ม 1 ช่อง จนถึงสูงสุดของระดับ */
  drill(it){if(!it)return{ok:false,msg:'ไม่พบอุปกรณ์'};const mx=RARITY[it.rar].sockets;it.sockets=it.sockets||[];if(it.sockets.length>=mx)return{ok:false,msg:`ช่องรูนเต็มแล้ว (${mx}/${mx})`};
    if(!this.has('runedrill',1))return{ok:false,msg:'ต้องใช้สว่านรูน 1 ชิ้น'};if(G.gold<GEAR.cost.drill.gold)return{ok:false,msg:`ต้องใช้ ${GEAR.cost.drill.gold} ทอง`};
    Inv.take('runedrill',1);G.gold-=GEAR.cost.drill.gold;it.sockets.push(null);return{ok:true,msg:`🔩 เจาะช่องรูน ${it.sockets.length}/${mx}`};}
};
const Inv={
  has(id,q=1){return(G.mats[id]||0)>=q;},
  add(id,q=1){G.mats[id]=(G.mats[id]||0)+q;},
  take(id,q=1){G.mats[id]=(G.mats[id]||0)-q;if(G.mats[id]<=0)delete G.mats[id];},
  addItem(it){G.bag.push(it);return it;},
  remove(it){for(const s of SLOTS)if(G.eq[s]===it.uid)G.eq[s]=null;G.bag=G.bag.filter(x=>x!==it);},
  // ราคาขาย: ครึ่งหนึ่งของค่าแยกชิ้นส่วนทอง (ขายเฉพาะไอเทมที่ไม่ได้สวมอยู่)
  sellPrice(it){const r=RARS.indexOf(it.rar);return Math.max(1,Math.round(25*(r+1)*(r+1)*(1+.2*(it.enh||0))));},
  matPrice(k){const m=MATS[k];if(!m||m.key)return 0;if(k.startsWith('sk_'))return 80;if(m.rareMat)return 60;if(k==='divine')return 150;if(k.startsWith('pot_'))return 120;if(k.startsWith('mp_')||k==='potion')return 10;return 5;},
  isJunkMat(k){const m=MATS[k];return !!m&&!m.key&&!m.rareMat&&!m.scroll&&!m.use&&!m.manaPotion&&!k.startsWith('sk_')&&!k.startsWith('mp_')&&k!=='potion'&&k!=='divine'&&k!=='ore';},   // แร่เหล็กเก็บไว้ใช้ตีบวก · ของสำคัญขายไม่ได้
  sellMat(k,q){const m=MATS[k];if(!m||m.key)return 0;q=Math.min(q,G.mats[k]||0);if(q<=0)return 0;const g=this.matPrice(k)*q;this.take(k,q);G.gold+=g;return g;},
  sellAllGear(rar){let g=0,n=0;for(const it of G.bag.slice()){if(Equip.isEquipped(it)||(rar&&it.rar!==rar))continue;g+=this.sellPrice(it);this.sell(it);n++;}return{g,n};},
  sellAllJunk(){let g=0,n=0;for(const k of Object.keys(G.mats))if(this.isJunkMat(k)){n+=G.mats[k];g+=this.sellMat(k,G.mats[k]);}return{g,n};},
  sell(it){if(Equip.isEquipped(it))return false;G.gold+=this.sellPrice(it);this.remove(it);return true;},
  salvage(it){if(Equip.isEquipped(it))return false;const r=RARS.indexOf(it.rar);this.remove(it);this.add('ore',1+r);G.gold+=50*(r+1)*(r+1);if(r>=1&&rand()<[0,.3,.5,.8,1][r])this.add('rerollstone',1);return true;},   // ย่อยของ: ระดับหายากขึ้นไปมีโอกาสได้หินรีค่า
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
  sorted(list,by){const ri=it=>RARS.indexOf(it.rar);const f={rarity:(a,b)=>ri(b)-ri(a)||(b.enh||0)-(a.enh||0),level:(a,b)=>(b.enh||0)-(a.enh||0)||ri(b)-ri(a),
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
    const outR=r.out.base?(BASES[r.out.base].fixRar||r.rar):null;if(outR&&RARS.indexOf(outR)>RARS.indexOf(rarCap())){const need=GUILD_RANKS.find(k=>RARS.indexOf(k.maxRar)>=RARS.indexOf(outR));return{ok:false,recipe:r,err:`ของระดับ${RARN[outR]}ต้องมีแรงค์กิลด์ ${need?need.id:'สูงขึ้น'} ขึ้นไป`};}
    const short=this.shortage(slots);if(short.length)return{ok:false,recipe:r,short,err:'วัตถุดิบในกระเป๋าไม่พอ'};
    if(r.gold&&G.gold<r.gold)return{ok:false,recipe:r,err:'ทองไม่พอ (ต้องการ '+r.gold+' ทอง)'};
    const bk=this.boosterId(boost);if(bk&&!Inv.has(bk))return{ok:false,recipe:r,err:'ไม่มี '+MATS[bk].n};
    return{ok:true,recipe:r,chance:this.chance(r,boost)};
  },
  /* ระบบไอเทมใหม่: คราฟต์สุ่มระดับ ไม่ต่ำกว่าระดับของสูตร และไม่เกิน CONFIG.maxRarity (ของระดับตายตัวใช้ระดับของมันเอง) */
  rollRar(r){const lo=RARS.indexOf(r.rar),hi=RARS.indexOf(rarCap()),ok=RARS.filter((x,i)=>i>=lo&&i<=Math.max(lo,hi));
    let t=ok.reduce((a,x)=>a+GEAR.craftRarW[x],0)*rand();for(const x of ok){t-=GEAR.craftRarW[x];if(t<0)return x;}return ok[0];},
  /* the only place that consumes materials and rolls the dice; re-validates everything */
  attempt(slots,boost,_locked){
    if(this.busy&&!_locked)return{ok:false,err:'busy'};
    const c=this.check(slots,boost);if(!c.ok)return c;
    const r=c.recipe,roll=rand(),ok=roll<c.chance,bk=this.boosterId(boost);
    for(const k in r.mats)Inv.take(k,r.mats[k]);if(r.gold)G.gold-=r.gold;if(bk)Inv.take(bk,1);
    G.stats.crafts++;if(G.found)G.found.add(r.id);G.known.add(r.id);
    if(!ok)return{ok:false,failed:true,recipe:r,roll,chance:c.chance,lost:Object.assign({},r.mats,bk?{[bk]:1}:{})};
    G.stats.craftOk++;
    if(r.out.base){const ni=newItem(r.out.base,this.rollRar(r));ni.crafted=1;const it=Inv.addItem(ni);return{ok:true,recipe:r,item:it,roll,chance:c.chance};}
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
    if(e.set)return!!SETS[e.set];if(e.book)return['common','rare','ultimate'].includes(e.book);if(e.rune)return!!(RUNE_TIER[e.rune]&&RUNE_TIER[e.rune].length);return false;},
  allows(e,rar){const a=e.rar||['normal'];return a==='any'||a.includes(rar);},
  label(e){return e.base||e.mat||(e.rune?'rune:'+e.rune:'')||(e.gear?'gear:'+e.gear:e.set?'set:'+e.set:'book:'+e.book);},
  pickEntry(entries,rar,used,kind){const el=entries.filter(e=>this.allows(e,rar)&&!(e.unique&&used.has(e))&&(!e.onlyKinds||e.onlyKinds.includes(kind)));
    if(!el.length)return null;let tot=el.reduce((a,e)=>a+e.w,0),r=rand()*tot;for(const e of el){r-=e.w;if(r<0)return e;}return el[el.length-1];},
  resolve(e,rar,lv,earlyCap){
    const q=rint(e.min||1,e.max||e.min||1);
    if(e.mat)return{kind:'mat',mat:e.mat,q,rar};
    if(e.rune)return{kind:'mat',mat:pick(RUNE_TIER[e.rune]),q:1,rar};   // รูนสุ่มตามระดับ
    if(e.book){const pool=Object.keys(SKILLS).filter(k=>SKILLS[k].tier===e.book&&!SKILLS[k].bossOnly&&skillUsable(k,'player'));const k='sk_'+pick(pool);return MATS[k]?{kind:'mat',mat:k,q:1,rar}:null;}
    const eqRar=earlyCap&&RARS.indexOf(rar)>RARS.indexOf('rare')?'rare':rar;
    let base=e.base;
    if(e.gear)base=pick(rarPool(e.gear==='any'?ALLTYPES.flatMap(t=>BASE_BY_TYPE(t)):BASE_BY_TYPE(e.gear),eqRar));
    if(e.set)base=pick(Object.keys(BASES).filter(k=>BASES[k].setTag===e.set&&(!earlyCap||!BASES[k].fixRar||RARS.indexOf(BASES[k].fixRar)<=RARS.indexOf('rare'))));
    if(!base||!BASES[base])return null;
    const it=newItem(base,eqRar,lv);
    if(earlyCap&&RARS.indexOf(it.rar)>RARS.indexOf('rare'))return newItem(pick(rarPool(BASE_BY_TYPE(BASES[base].type||'weapon'),'rare')),'rare',lv)?{kind:'item',item:newItem(pick(rarPool(BASE_BY_TYPE(BASES[base].type||'weapon'),'rare')),'rare',lv),rar:'rare'}:null;
    return{kind:'item',item:it,rar:it.rar};
  },
  /* ST_DropResult[] for ONE player. Never shared between players. */
  generate({tableId,cls='normal',level=1,luk=10,pid='P1',kind=tableId}){
    const T=LOOT_TABLES[tableId],res={pid,drops:[]},earlyCap=typeof EARLY_DUNGEON_TABLES!=='undefined'&&EARLY_DUNGEON_TABLES.has(tableId);
    if(!T){this.log({pid,tableId,warn:'ไม่พบตาราง Loot'});return res;}
    for(const g of T.guaranteed||[]){
      if(g.chance!==undefined&&rand()>=g.chance)continue;
      if(g.gold){res.drops.push({kind:'gold',q:Math.round(rint(g.gold[0],g.gold[1])*(1+.1*(level-1))),rar:'normal',guaranteed:1});continue;}
      if(g.mat&&MATS[g.mat]){res.drops.push({kind:'mat',mat:g.mat,q:g.q||1,rar:g.rar||MATS[g.mat].rar||'normal',guaranteed:1});continue;}
      if(g.base&&BASES[g.base]){const r0=g.rar||BASES[g.base].fixRar||'epic',r=earlyCap&&RARS.indexOf(r0)>RARS.indexOf('rare')?'rare':r0;res.drops.push({kind:'item',item:newItem(g.base,r,level),rar:r,guaranteed:1});continue;}
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
        if(e.unique)used.add(e);const d=this.resolve(e,r,level,earlyCap);if(d){res.drops.push(d);L.picks.push({rolled,rar:d.rar,entry:this.label(e),q:d.q||1});}
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
/* ประเภทสกิลที่ใส่ได้ในแต่ละช่อง: ช่อง 1–3 ใส่ได้ทั้งทั่วไปและหายาก · ช่อง 4 เฉพาะตัว · ช่อง 5 สุดยอด */
const SLOT_TIERS=[['common','rare'],['common','rare'],['common','rare'],['unique'],['ultimate']];
const slotAccepts=(slot,id)=>!!(SKILLS[id]&&SLOT_TIERS[slot]&&SLOT_TIERS[slot].includes(SKILLS[id].tier));
const slotTierName=i=>SLOT_TIERS[i].map(t=>TIERN[t]).join('/');
const Skills={
  init(talent){G.skills={learned:new Set([TALENTS[talent].skill]),slots:[null,null,null,null,null],cd:{},bound:null,lv:{}};},  // Unique must be bound by the player (explicit confirm)
  learnable(id){const s=SKILLS[id];return!!s.talent&&s.talent===G.talent;},   // สกิลบอส (bossOnly) ได้จากการชนะบอสเท่านั้น   // only the talent Unique is innate; everything else comes from skill books
  check(){const got=[];for(const id in SKILLS){if(!G.skills.learned.has(id)&&this.learnable(id)){G.skills.learned.add(id);got.push(id);}}return got;},
  learn(id){if(!SKILLS[id])return{ok:false,err:'ไม่มีสกิลนี้'};if(!skillUsable(id,'player'))return{ok:false,err:'สกิลนี้ศัตรูใช้ได้เท่านั้น'};if(G.skills.learned.has(id))return{ok:false,err:'เรียนสกิลนี้แล้ว'};
    G.skills.learned.add(id);const sl=(SKILLS[id].tier==='rare'?[1,0,2]:[0,1,2]).find(i=>slotAccepts(i,id)&&!G.skills.slots[i]);if(sl!==undefined)G.skills.slots[sl]=id;return{ok:true};},   // ใส่ช่องว่างแรกที่รับประเภทนี้ (ไม่รวมช่องเฉพาะตัว)   // auto-fill empty non-Unique socket
  passiveOf(){const id=G.skills&&G.skills.bound,s=id&&SKILLS[id];if(!s||s.type!=='passive')return null;return{id:s.passive.id,v:s.passive.v*this.scale(id).coef,skill:id};},
  level(id,f){return(f&&f.skLv&&f.skLv[id])||G.skills.lv[id]||1;},
  /* equip / replace / remove for Common, Rare, Ultimate. Unique socket only changes via bind()/replaceUnique(). */
  equip(slot,id){
    if(slot<0||slot>4)return{ok:false,err:'ช่องไม่ถูกต้อง'};
    if(slot===3)return{ok:false,err:'ช่องเฉพาะตัวต้องผนึกผ่านปุ่มผนึกเท่านั้น'};
    if(!id){G.skills.slots[slot]=null;return{ok:true};}   // Common / Rare / Ultimate are removable (spec v3)
    if(!SKILLS[id]||!G.skills.learned.has(id))return{ok:false,err:'ยังไม่ได้เรียนสกิลนี้'};
    if(!skillUsable(id,'player'))return{ok:false,err:'สกิลนี้ศัตรูใช้ได้เท่านั้น'};
    if(!slotAccepts(slot,id))return{ok:false,err:'ประเภทสกิลไม่ตรงกับช่อง (ช่อง '+(slot+1)+' ใส่ได้: '+slotTierName(slot)+')'};
    if(G.skills.slots.some((x,i)=>x===id&&i!==slot))return{ok:false,err:'สกิลนี้อยู่ในช่องอื่นแล้ว'};
    G.skills.slots[slot]=id;return{ok:true};
  },
  bind(id){ // first (permanent) binding — caller must have obtained explicit confirmation
    if(G.skills.bound)return{ok:false,err:'มีสกิลเฉพาะตัวถูกผนึกอยู่แล้ว'};
    if(!SKILLS[id]||SKILLS[id].tier!=='unique'||!G.skills.learned.has(id))return{ok:false,err:'ผนึกได้เฉพาะสกิลเฉพาะตัวที่เรียนแล้ว'};
    G.skills.bound=id;G.skills.slots[3]=id;return{ok:true};
  },
  canBreakSeal(){return!!G.skills.bound&&Inv.has(SEAL_BREAKER.item,SEAL_BREAKER.perUse);},
  replaceUnique(newId){ // requires Unique Seal Breaker; consumed only here (after confirmation in UI)
    if(!G.skills.bound)return{ok:false,err:'ยังไม่มีสกิลที่ผนึกอยู่'};
    if(!Inv.has(SEAL_BREAKER.item,SEAL_BREAKER.perUse))return{ok:false,err:'ต้องใช้ตราทำลายผนึกเฉพาะตัว'};
    if(newId===G.skills.bound)return{ok:false,err:'เป็นสกิลเดิมอยู่แล้ว'};
    if(!SKILLS[newId]||SKILLS[newId].tier!=='unique'||!G.skills.learned.has(newId))return{ok:false,err:'ต้องเป็นสกิลเฉพาะตัวที่เรียนแล้ว'};
    const old=G.skills.bound;Inv.take(SEAL_BREAKER.item,SEAL_BREAKER.perUse);G.skills.bound=newId;G.skills.slots[3]=newId;  // old skill + its level stay in learned/lv (storage)
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
  scale(id,f){const lv=this.level(id,f),L=SKILL_UPGRADE.levels[lv];return L?{coef:L.coef,cd:L.cd}:{coef:1,cd:1};},
  cdFrames(id,S,f){return Math.round(SKILLS[id].cd*this.scale(id,f).cd*60*this.cdMul(S));},
  toSave(){const k=G.skills;return{learned:[...k.learned],slots:k.slots.slice(),bound:k.bound,lv:Object.assign({},k.lv)};},
  fromSave(d){let slots=(d.slots||[]).slice(0,5);while(slots.length<5)slots.push(null);
    // เซฟเลย์เอาต์เก่า (เฉพาะตัวช่อง 3, สุดยอดช่อง 4, ช่อง 5 ทั่วไป/หายาก): ย้ายมาเป็นเลย์เอาต์ใหม่
    const TR=id=>SKILLS[id]?SKILLS[id].tier:null,legacy=TR(slots[2])==='unique'||TR(slots[3])==='ultimate';
    // เซฟรุ่นก่อนมีระบบผนึก: สกิลเฉพาะตัวที่ใส่อยู่ถือว่าผนึกแล้ว
    const bound=d.bound!==undefined?d.bound:((legacy?slots[2]:slots[3])||null);
    if(legacy)slots=[slots[0],slots[1],slots[4],slots[2],slots[3]];
    // ปรับสกิลใหม่: ทิ้งสกิลที่ถูกลบ/กลายเป็นสกิลศัตรูออกจากเซฟ (เรียนแล้ว · ช่อง · ตำราในกระเป๋า)
    const ok=id=>skillUsable(id,'player');slots=slots.map(id=>id&&ok(id)?id:null);
    G.skills={learned:new Set((d.learned||[]).filter(ok)),slots,cd:{},bound:bound&&ok(bound)?bound:null,lv:Object.assign({},d.lv||{})};
    G.skills.slots[3]=G.skills.bound||null;
    if(G.mats)for(const k in G.mats)if(k.startsWith('sk_')&&!MATS[k])delete G.mats[k];},
  cdMul(S){return S.passives.has('arcane')?.8:1;},
  cdLeft(id){return G.skills.cd[id]||0;},
  tick(){for(const k in G.skills.cd)if(G.skills.cd[k]>0)G.skills.cd[k]--;},
  cache:{},
  move(id,wt,slot,f){
    if(SKILLS[id].type==='passive')return null;
    const lvl=this.level(id,f),key=id+'|'+wt+'|'+slot+'|'+lvl;if(this.cache[key])return this.cache[key];
    const s=SKILLS[id],fr=SKILL_FRAMES[s.anim]||[10,4,18],a=s.active||(s.anim==='rush'?(s.multi||3)*4+4:s.rain?(s.multi||3)*7:fr[1]);
    const el=s.el==='weapon'?(WEAPONS[wt]||WEAPONS.fist).el:(s.el||'phys');
    const ad=adaptSkillAnim(s,wt);
    const m=M(s.n,s.startup||fr[0],a,fr[2],(s.coef||0)*10*this.scale(id,f).coef,s.reach||0,3,22,{anim:ad.anim,kind:s.tier==='ultimate'?'ultimate':'skill',tok:'S'+(slot+1),combo:!!s.combo,
      type:s.type,el,skillId:id,hy:s.hy||62,hh:s.hh||60});
    for(const k of ['multi','proj','beam','beamCol','spiritBeam','blueFlame','greenFlame','swap','launch','rise','inv','lunge','kicks','status','statusDur','armorBreak','unblockable','jackpotPen','jackpot','alwaysCrit','defPen','lifesteal','ignoreDef','lastCrit','strike','buff','hpCost','rain','kd','low','dragon','kingAura','holdParry','rootDur','pillars','frostnova','instantShatter','windblade','blink','blinkBuff','slashFx','vfx','lightJudge'])if(s[k]!==undefined)m[k]=s[k];
    if(ad.style){m.slashFx=0;m.weaponStyle=ad.style;}   /* ท่าถูกปรับตามอาวุธ: ไม่ใช้รอยฟันดาบ */
    if(s.el==='weapon'&&typeof EL_STATUS!=='undefined'&&EL_STATUS[el]){const sk=EL_STATUS[el];m.status=Object.assign({},m.status||{});if(!m.status[sk]&&!(el==='ice'&&m.status.freeze))m.status[sk]=1;}
    if(s.tier==='ultimate')m.super=2;
    return this.cache[key]=m;
  }
};

/* ---------------- Progression ---------------- */
const Prog={
  xpScale(mlv){const diff=G.level-(mlv||1);return diff>8?Math.max(.25,1-.06*(diff-8)):1;},   /* เลเวลสูงกว่ามอน >8 ขั้น ได้ XP ลดลง 6%/เลเวล (ต่ำสุด 25%) */
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
  init(){G.q={main1:{step:0,done:0,active:1},hunt:{step:0,count:0,done:0,active:0},lava:{step:0,done:0,active:0}};G.guildQuests={};},
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
    return{ok:lvOk&&qOk,cur,next:nxt,lvOk,qOk,reason:!lvOk&&!qOk?`ต้อง Lv.${nxt.lvReq}+ และผ่านการทดสอบโคลอสเซียม Rank ${nxt.id}`:!lvOk?`ต้องเลเวล Lv.${nxt.lvReq}+ (ปัจจุบัน Lv.${G.level})`:`ต้องผ่านการทดสอบโคลอสเซียม Rank ${nxt.id} ก่อน`};
  },
  promote(){
    const r=this.canPromote();if(!r.ok)return r;
    G.guildRank=r.next.id;SFX.level();
    toast(`🎖️ เลื่อนแรงค์กิลด์เป็น Rank ${r.next.id} — ${r.next.n}!`,3500);
    Save.save();UI.hud&&UI.hud();
    return{ok:true,next:r.next};
  },
  canEnterSpire(){return this.registered()&&GUILD_RANKS.findIndex(r=>r.id===this.rank())>=GUILD_RANKS.findIndex(r=>r.id==='D');},   // หอคอยคริสตัล: แรงค์ D ขึ้นไป
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
const SAVE_KEY='caveforge_save',SAVE_VER=3;   // v3 = ระบบไอเทมใหม่ (ล้างอุปกรณ์เซฟเก่า)
const GEAR_WIPE={level:5,gold:5000};   // ชดเชยเมื่อล้างอุปกรณ์ของเซฟก่อน v3
const Save={
  data(){return{v:SAVE_VER,savedAt:Date.now(),talent:G.talent,level:G.level,xp:G.xp,points:G.points,alloc:G.alloc,hp:G.hp,mp:G.mp,bag:G.bag,mats:G.mats,gold:G.gold,eq:G.eq,
    known:[...G.known],found:[...G.found],skills:Skills.toSave(),mastery:G.mastery,ency:G.ency,q:G.q,flags:G.flags,uid:G.uid,stats:G.stats,ult:G.ult||0,pity:G.pity||{},shopCD:G.shopCD||{},diff:G.diff||'souls',bloodstain:G.bloodstain||null,look:G.look||null,guildRank:G.guildRank||'F',guildPromo:G.guildPromo||{},guildQuests:G.guildQuests||{},world:World.serialize()};},
  save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.data()));return true;}catch(e){return false;}},
  exists(){try{return!!localStorage.getItem(SAVE_KEY);}catch(e){return false;}},
  apply(d){
    if(!d||!d.v)return false;if(d.v<2)return false; // v1 (old demo) had no compatible progression data
    Object.assign(G,{talent:d.talent,level:d.level,xp:d.xp,points:d.points,alloc:d.alloc,hp:d.hp,mp:d.mp,bag:d.bag,mats:d.mats,gold:d.gold,eq:d.eq,
      known:new Set(d.known),found:new Set(d.found||[]),mastery:d.mastery||{},ency:d.ency||{},q:d.q,flags:d.flags||{},uid:d.uid,stats:Object.assign(G.stats,d.stats||{}),ult:d.ult||0,pity:d.pity||{},shopCD:d.shopCD||{},diff:CONFIG.diffLock||(DIFFICULTY[d.diff]?d.diff:'souls'),bloodstain:d.bloodstain||null,look:d.look||null,guildRank:d.guildRank||'F',guildPromo:d.guildPromo||{},guildQuests:d.guildQuests||{}});
    Skills.fromSave(d.skills||{});
    if(d.v<3)this.gearWipe();
    if(G.guildRank==='G')G.guildRank='D';   // แรงค์ G เดิม (Lv.30 + โคลอสเซียม) = แรงค์ D ใหม่   // เซฟก่อนระบบไอเทมใหม่: ล้างอุปกรณ์ทั้งหมด · เลเวลเหลือ 5 · ชดเชยทอง
    for(const it of G.bag||[]){const ts=(RARITY[it.rar]||RARITY.normal).sockets;it.sockets=Array.isArray(it.sockets)?it.sockets.slice(0,ts).map(rk=>rk==='rune_matk'?'rune_atk':rk&&MATS[rk]&&MATS[rk].rune?rk:null):[];it.affixes=(it.affixes||[]).filter(a=>a&&GAFX[a.k]);}
    G.bag=(G.bag||[]).filter(it=>it&&BASES[it.base]);   // ไอเท็มที่ถูกลบออกจากเกม (เช่น แหวนปฐมกาล) หายจากเซฟเก่า
    for(const s of Object.keys(G.eq||{}))if(G.eq[s]!=null&&!G.bag.some(i=>i.uid===G.eq[s]))G.eq[s]=null;
    for(const it of G.bag||[]){if(!BASES[it.base]||gearCat(BASES[it.base].type)!=='armor')continue;   // เกราะไม่มีอัตราคริแล้ว: เปลี่ยนเป็นค่าอื่นของเกราะ (เทียร์เดิม)
      for(const a of it.affixes||[])if(a.k==='critRate'){const pool=GPOOL.armor.filter(k=>!it.affixes.some(x=>x.k===k));if(pool.length)a.k=pool[Math.floor(rand()*pool.length)];}}
    if(G.mats&&G.mats.rune_matk){G.mats.rune_atk=(G.mats.rune_atk||0)+G.mats.rune_matk;delete G.mats.rune_matk;}   // รูนพลังเวท (ระบบเก่า) → รูนพลัง
    for(const s of SLOTS)if(!(s in G.eq))G.eq[s]=null;  // forward-compat for new slots
    for(const s of Object.keys(G.eq))if(!SLOTS.includes(s))delete G.eq[s];
    World.restore(d.world);return true;
  },
  /* ล้างอุปกรณ์ของเซฟเก่า: กระเป๋าและที่สวมอยู่หายหมด · เลเวล 5 (คืนแต้มค่าพลังตามเลเวลใหม่) · +5,000 ทอง · วัตถุดิบ เควสต์ สกิล เก็บไว้ */
  gearWipe(){G.bag=[];G.eq={};for(const s of SLOTS)G.eq[s]=null;
    G.level=GEAR_WIPE.level;G.xp=0;for(const k in G.alloc)G.alloc[k]=0;G.points=(GEAR_WIPE.level-1)*CONFIG.levelPoints;G.gold=(G.gold||0)+GEAR_WIPE.gold;
    G.flags=G.flags||{};G.flags.gearWipeNotice=1;},
  peek(){try{const raw=localStorage.getItem(SAVE_KEY);return raw?JSON.parse(raw):null;}catch(e){return null;}},
  load(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;return this.apply(JSON.parse(raw));}catch(e){return false;}}
};

/* ---- Re-Item (NPC รีไอเทม): สุ่มครั้งละ 20,000 เหรียญ ซื้อชิ้นละ 10,000 เหรียญ ---- */
const REITEM={cost:20000,buy:10000,odds:[['normal',69.9999],['rare',20],['epic',10],['god',.0001]]}   /* หน่วยเป็น % — ตำนาน/เทพ ได้จากร้านรีเท่านั้น (ดรอปไม่มีแล้ว) */;
function reitemRarity(uncap){let x=rand()*100;for(const [r,p] of REITEM.odds){if(x<p)return uncap?r:capRar(r);x-=p;}return 'normal';}
function reitemOdds(uncap){const o={};for(const [r,p] of REITEM.odds){const c=uncap?r:capRar(r);o[c]=Math.round(((o[c]||0)+p)*1e6)/1e6;}return Object.entries(o);}
function reitemRoll(uncap){const pool=Object.keys(BASES).filter(k=>BASES[k].type&&!BASES[k].setTag&&!/_god$|^h_crown$/.test(k)),r=reitemRarity(uncap);
  return newItem(pick(rarPool(pool,r,uncap)),r,Math.max(1,G.level),uncap);}   /* ร้านรี = reitemRoll(true) · รางวัลอารีนา = reitemRoll() ติดเพดาน */

/* นักเล่นแร่แปรธาตุ: ใช้หน้าปรับค่าความสามารถ (Gear.reroll / pick / tierUp) แทนการหลอมเดิม */

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
/* ---- ร้านรูนของนักเล่นแร่แปรธาตุ: ซื้อรูนธรรมดาสุ่ม · หลอมรูนธรรมดาชนิดเดียวกัน 3 ก้อน → รูนหายากสุ่ม 1 ก้อน ---- */
const RuneShop={
  buy(){if(G.gold<RUNE_SHOP.buy)return{ok:false,msg:'ทองไม่พอ'};G.gold-=RUNE_SHOP.buy;const k=pick(RUNE_TIER.normal);Inv.add(k,1);return{ok:true,rune:k,msg:`ได้ ${MATS[k].n} (${runeDesc(k)})`};},
  canFuse(k){return!!(k&&MATS[k]&&MATS[k].rar==='normal'&&(G.mats[k]||0)>=RUNE_SHOP.fuseN&&G.gold>=RUNE_SHOP.fuseGold);},
  fuse(k){if(!k||!MATS[k]||MATS[k].rar!=='normal')return{ok:false,msg:'เลือกรูนธรรมดาก่อน'};if((G.mats[k]||0)<RUNE_SHOP.fuseN)return{ok:false,msg:`ต้องมี ${MATS[k].n} ${RUNE_SHOP.fuseN} ก้อน`};
    if(G.gold<RUNE_SHOP.fuseGold)return{ok:false,msg:'ทองไม่พอ'};Inv.take(k,RUNE_SHOP.fuseN);G.gold-=RUNE_SHOP.fuseGold;const r=pick(RUNE_TIER.rare);Inv.add(r,1);return{ok:true,rune:r,msg:`หลอมสำเร็จ! ได้ ${MATS[r].n} (${runeDesc(r)})`};}
};
function runeDesc(k){const m=MATS[k];return m?(m.desc||'').replace('ใส่ช่องรูน: ',''):'';}
