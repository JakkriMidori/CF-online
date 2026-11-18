'use strict';
/* ==================================================================
   BALANCE LIVE — รับค่าบาลานซ์จากหน้า balance.html (Balance Lab) แล้วใส่ลงเกมทันที
   ------------------------------------------------------------------
   • ค่าที่แก้เก็บเป็น { "FOES.golem.base.hp": 2500, ... } (path → ค่าใหม่)
   • แหล่งที่มา: ฐานข้อมูลของเกม (db: balance/live) ให้ผู้เล่นทุกคนได้ค่าเดียวกัน
     ถ้าไม่ได้ล็อกอิน/ไม่มี db → ใช้ค่าที่บันทึกในเบราว์เซอร์นี้ (localStorage)
   • ใส่ทับค่าในตารางเกมโดยตรง และจำค่าเดิมไว้ เพื่อถอดออก/คืนค่าได้
   ================================================================== */
const BAL_ROOTS={CONFIG,FOES,SKILLS,BASES,SETS,RARITY,LOOT_CONFIG,DIFFICULTY,TALENT_PASSIVE,ELITE,WEAPONS,SKILL_UPGRADE};
const BAL_KEY='cf_balance_live';
const Balance={
  orig:{},          // path → ค่าเดิมก่อนถูกทับ
  live:{},          // ค่าที่ใช้อยู่ตอนนี้
  at:0,src:'none',
  _ref(path,create){const ks=path.split('.'),root=BAL_ROOTS[ks[0]];if(!root||ks.length<2)return null;let o=root;
    for(let i=1;i<ks.length-1;i++){if(o==null||typeof o!=='object')return null;if(o[ks[i]]==null&&create){if(i===1)return null;o[ks[i]]={};}o=o[ks[i]];}   // ไม่สร้างศัตรู/สกิลใหม่ แต่สร้างกลุ่มย่อย (เช่น attr, res) ได้
    return o&&typeof o==='object'?{o,k:ks[ks.length-1]}:null;},
  _set(path,v){const r=this._ref(path,true);if(!r)return false;if(!(path in this.orig))this.orig[path]=JSON.parse(JSON.stringify(r.o[r.k]??null));r.o[r.k]=v;return true;},
  /* ใส่ชุดค่าใหม่ทั้งชุด: คืนค่าเดิมของ path ที่ไม่อยู่ในชุดใหม่ก่อน แล้วค่อยใส่ */
  apply(edits,src,at){edits=edits||{};let n=0;
    for(const p in this.orig)if(!(p in edits)){const r=this._ref(p);if(r)r.o[r.k]=this.orig[p];delete this.orig[p];}
    for(const p in edits)if(this._set(p,edits[p]))n++;
    this.live=Object.assign({},edits);this.src=src||'local';this.at=at||Date.now();
    if(typeof Skills!=='undefined')Skills.cache={};                 // ท่าสกิลสร้างใหม่ตาม coef/cd ใหม่
    for(const id in SKILLS)if(!['all','player','enemy'].includes(SKILLS[id].user))SKILLS[id].user='all';
    if(typeof StatSync!=='undefined'&&typeof G!=='undefined'&&G.talent)StatSync.invalidate('balance');
    return n;},
  fromLocal(){try{const d=JSON.parse(localStorage.getItem(BAL_KEY)||'null');if(d&&d.edits)this.apply(d.edits,'local',d.at);}catch(e){}},
  saveLocal(edits,at){try{localStorage.setItem(BAL_KEY,JSON.stringify({edits,at}));}catch(e){}},
  /* ฐานข้อมูลของเกม: อ่านครั้งแรก + ฟังการเปลี่ยนแปลง (Lab กดอัปเดต → เกมที่เปิดอยู่ได้ค่าใหม่ทันที) */
  async connect(){
    try{if(!window.claude||!claude.use)return;const db=await claude.use('db');if(!db)return;this.db=db;
      const ref=db.doc('balance/live');
      const take=snap=>{if(snap&&snap.exists===false){if(this.src==='db'||Object.keys(this.live).length){this.apply({},'db',0);this.saveLocal({},0);}return;}const d=snap&&snap.data&&snap.data();if(!d)return;let edits={};try{edits=JSON.parse(d.edits||'{}');}catch(e){return;}
        if(d.at===this.at&&this.src==='db')return;const n=this.apply(edits,'db',d.at);this.saveLocal(edits,d.at);
        if(typeof toast==='function'&&typeof G!=='undefined'&&G.mode!=='title'&&n)toast(`อัปเดตค่าบาลานซ์ล่าสุดแล้ว (${n} ค่า)`);};
      if(ref.onSnapshot)ref.onSnapshot(take,()=>{});else take(await ref.get());
    }catch(e){/* ไม่มี db / ไม่ได้ล็อกอิน → ใช้ค่าในเบราว์เซอร์ */}
  },
};
Balance.fromLocal();
Balance.connect();
