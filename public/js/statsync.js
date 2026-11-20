'use strict';
/* ==================================================================
   AUTO STATUS UPDATE SYSTEM (ระบบอัปเดตค่าสถานะอัตโนมัติ)
   ------------------------------------------------------------------
   • ค่าสุดท้าย = คำนวณใหม่จาก "ค่าพื้นฐาน" ทุกครั้ง + ตัวปรับที่ยังทำงานอยู่
     (ไม่เคยใช้ค่าที่คำนวณไปแล้วเป็นฐาน → ไม่มีการทบซ้ำ)
   • ค่าพื้นฐานของผู้เล่น = Stats.player() ซึ่งรวม ค่าตั้งต้น + เลเวล + ค่าพลัง + อุปกรณ์ + สกิล
   • ตัวปรับ (บัฟ / ดีบัฟ / ผลชั่วคราว) เก็บเป็นรายการ ระบุด้วย id — ใส่ id เดิมซ้ำ = รีเฟรชเวลา ไม่ซ้อน
   • ตัวจับเวลา 5 วินาทีมีตัวเดียว (start() กันสร้างซ้ำ) + อัปเดตทันทีเมื่อมีเหตุการณ์ (event-driven)
   • UI และระบบต่อสู้อ่านค่าจากออบเจ็กต์เดียวกัน (StatSync.get() นอกการต่อสู้ / fighter.S ในการต่อสู้)
   ================================================================== */
const StatSync={
  INTERVAL:5000,
  timer:null,          // ตัวจับเวลาเดียวของทั้งระบบ
  ticks:0,             // จำนวนรอบ 5 วินาทีที่ทำงานแล้ว
  recalcs:0,           // จำนวนครั้งที่คำนวณใหม่จริง (ใช้ตรวจว่าไม่คำนวณเกินจำเป็น)
  lastTickAt:0,
  cur:null,            // ค่าสุดท้ายของผู้เล่น (นอกการต่อสู้)
  sigCache:null,       // ลายเซ็นของแหล่งที่มาทั้งหมด ณ ครั้งล่าสุดที่คำนวณ
  dirty:true,
  mods:[],             // ตัวปรับของผู้เล่นนอกการต่อสู้

  /* ---------- ตัวปรับ (Buff / Debuff / Temporary Effect) ----------
     mod = {id, n(ชื่อ), kind:'buff'|'debuff', stat, op:'add'|'mul', v, ttl(เฟรม 60/วิ)} */
  addMod(owner,mod){
    const L=this.listOf(owner);const m=Object.assign({kind:'buff',op:'add',ttl:300},mod);m.max=m.ttl;
    const i=L.findIndex(x=>x.id===m.id);if(i>=0)L[i]=m;else L.push(m);   // id ซ้ำ = แทนที่/รีเฟรช ไม่ซ้อน
    this.recalc(owner,'mod+'+m.id);return m;},
  removeMod(owner,id){const L=this.listOf(owner),i=L.findIndex(x=>x.id===id);if(i<0)return false;L.splice(i,1);this.recalc(owner,'mod-'+id);return true;},
  hasMod(owner,id){return this.listOf(owner).some(x=>x.id===id);},
  listOf(owner){if(!owner||owner==='P')return this.mods;if(!owner.mods)owner.mods=[];return owner.mods;},
  /* นับถอยหลังทุกเฟรมของเกม (หยุดเมื่อเกมหยุด) — หมดเวลาแล้วถอดออกและคำนวณใหม่ทันที */
  frame(owner){const L=this.listOf(owner);if(!L.length)return;let gone=false;
    for(let i=L.length-1;i>=0;i--)if(--L[i].ttl<=0){L.splice(i,1);gone=true;}
    if(gone)this.recalc(owner,'expire');},

  /* ---------- คำนวณ: เริ่มจากค่าพื้นฐานเสมอ ---------- */
  final(base,mods){
    const S=Object.assign({},base);S.res=Object.assign({},base.res||{});S.base=base;
    for(const m of mods||[]){if(!(m.stat in S)&&m.op==='mul')continue;
      if(m.op==='mul')S[m.stat]=(S[m.stat]||0)*m.v;else S[m.stat]=(S[m.stat]||0)+m.v;}
    // เพดาน/พื้น หลังรวมตัวปรับ
    S.def=Math.max(0,Math.round(S.def));S.mdef=Math.max(0,Math.round(S.mdef));
    S.ap=Math.max(0,Math.round(S.ap));S.mpow=Math.max(0,Math.round(S.mpow));
    S.critRate=clamp(S.critRate,0,CONFIG.critCap);S.critDmg=Math.min(CONFIG.critDmgCap,S.critDmg);
    S.dr=clamp(S.dr||0,0,CONFIG.drCap);S.apenPct=clamp(S.apenPct||0,0,1);S.mpenPct=clamp(S.mpenPct||0,0,1);
    S.pcritRes=clamp(S.pcritRes||0,0,.75);S.evasion=clamp(S.evasion||0,0,CONFIG.derived.evaCap);S.mcritRes=clamp(S.mcritRes||0,0,.75);
    S.mods=(mods||[]).map(m=>({id:m.id,n:m.n,kind:m.kind,stat:m.stat,op:m.op,v:m.v,left:m.ttl,max:m.max||m.ttl}));
    return S;},
  /* ลายเซ็นของทุกแหล่งที่มีผลต่อค่าสถานะผู้เล่น — ไม่เปลี่ยน = ไม่ต้องคำนวณใหม่ */
  sig(){
    if(typeof G==='undefined'||!G.talent)return'';
    const eq=SLOTS.map(s=>{const it=G.eq[s]&&itemByUid(G.eq[s]);return it?[it.uid,it.base,it.rar,it.enh,it.sockets.join('|'),it.uniq||''].join(':'):'-';}).join(',');
    const sk=G.skills?[G.skills.bound||'',G.skills.bound?Skills.level(G.skills.bound):0].join(':'):'';
    return[G.level,G.talent,JSON.stringify(G.alloc),eq,sk,this.mods.map(m=>m.id+'@'+m.v).join(',')].join('#');},
  recalc(owner,reason){
    if(owner&&owner!=='P'){   // นักสู้ในฉากต่อสู้
      if(!owner.S0)return null;owner.S=this.final(owner.S0,owner.mods);this.recalcs++;this.lastReason=reason;return owner.S;}
    if(typeof G==='undefined'||!G.talent)return null;
    const base=Stats.player();this.cur=this.final(base,this.mods);this.sigCache=this.sig();this.dirty=false;this.recalcs++;this.lastReason=reason;
    if(G.hp>this.cur.maxHP)G.hp=this.cur.maxHP;if(G.mp>this.cur.maxMP)G.mp=this.cur.maxMP;
    return this.cur;},
  /* อัปเดตทันที (event-driven) */
  invalidate(reason){this.dirty=true;const S=this.recalc('P',reason||'event');this.syncUI();return S;},
  /* ค่าสุดท้ายของผู้เล่น — UI และการเริ่มต่อสู้ใช้ตัวนี้ */
  get(){if(this.dirty||!this.cur)this.recalc('P','lazy');return this.cur;},

  /* ---------- รอบ 5 วินาที ---------- */
  tick(){
    this.ticks++;this.lastTickAt=Date.now();
    if(typeof G==='undefined'||!G.talent)return;
    if(this.sig()!==this.sigCache)this.recalc('P','tick');          // ข้ามถ้าไม่มีอะไรเปลี่ยน
    if(typeof BT!=='undefined'&&BT&&G.mode==='battle')for(const f of[BT.p,BT.e])if(f&&f.S0)this.recalc(f,'tick');
    this.syncUI();},
  start(){if(this.timer)return false;this.timer=setInterval(()=>this.tick(),this.INTERVAL);return true;},   // กันสร้างตัวจับเวลาซ้ำ
  stop(){if(this.timer){clearInterval(this.timer);this.timer=null;}},
  /* ตัวละครถูกทำลาย / กลับหน้าหลัก: หยุดอัปเดตและล้างค่า */
  reset(){this.stop();this.cur=null;this.sigCache=null;this.dirty=true;this.mods.length=0;},
  syncUI(){if(typeof UI==='undefined'||G.mode==='title')return;UI.hud();if(UI.cur==='char'||UI.cur==='menu')UI.rerender();},
};

/* ---------- ผูกเหตุการณ์: ทุกฟังก์ชันที่เปลี่ยนค่าสถานะ → อัปเดตทันที ---------- */
(function hookEvents(){
  const wrap=(obj,name,reason)=>{const fn=obj[name];if(typeof fn!=='function'||fn.__ss)return;
    const w=function(){const r=fn.apply(this,arguments);StatSync.invalidate(reason);return r;};w.__ss=1;obj[name]=w;};
  wrap(Equip,'equip','equip');wrap(Equip,'unequip','unequip');wrap(Equip,'enhance','enhance');
  
  wrap(Prog,'gainXP','level');wrap(Prog,'allocate','attribute');
  wrap(Inv,'use','item');
  wrap(Skills,'bind','skill');wrap(Skills,'replaceUnique','skill');wrap(Skills,'upgrade','skill');
  wrap(Save,'apply','load');
})();
addEventListener('pagehide',()=>StatSync.stop());   // ปิดเกม → หยุดตัวจับเวลา
