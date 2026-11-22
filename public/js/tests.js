'use strict';
/* ============================================================
   AUTOMATED TESTS — damage, critical, caps, stacking, crafting
   Run from the debug panel (`) or window.runTests()
   ============================================================ */
function runTests(){
  const out=[];let pass=0,fail=0;
  const T=(name,fn)=>{try{const r=fn();const ok=r===true||(r&&r.ok);out.push({name,ok,info:r&&r.info});ok?pass++:fail++;}catch(e){out.push({name,ok:false,info:'error: '+e.message});fail++;}};
  const near=(a,b,eps=1e-6)=>Math.abs(a-b)<=eps;
  const A=(o={})=>Object.assign({ap:100,mpow:100,critRate:0,critDmg:1.5,apen:0,mdefShred:0},o);
  const Tg=(o={})=>Object.assign({def:0,mdef:0,dr:0,res:{}},o);
  const ph=(o={})=>Object.assign({coef:1,type:'phys',el:'phys'},o);
  const saveRNG=RNG,saveG={mats:G.mats,known:G.known,found:G.found,bag:G.bag,stats:G.stats,uid:G.uid};
  const dummy=(o={})=>{const f=Object.assign({statusRes:{}},o);Status.init(f);return f;};
  const prevHooks=[Status.onStun,Status.onStunEnd,Status.onSynergy];Status.onStun=Status.onStunEnd=Status.onSynergy=null;

  T('V2 เกราะโค้ง: ATK100 DEF50 ผู้ตี Lv1 → 100×K/(K+50), K=42.5 → 46 · ไม่จมเหลือ 1',()=>{const r=calcDamage(A(),Tg({def:50}),ph());return{ok:r.dmg===46&&near(r.K,42.5),info:r.dmg+' K '+r.K};});
  T('V2 DEF สูงมากยังเข้าดาเมจตามสัดส่วน (DEF 9999 → ≥1) · K โตตามเลเวลผู้ตี (Lv35 → K 127.5)',()=>{const a=calcDamage(A(),Tg({def:9999}),ph()),b=calcDamage(A({level:35}),Tg({def:127.5}),ph());return{ok:a.dmg>=1&&b.dmg===50&&near(b.K,127.5),info:a.dmg+' / '+b.dmg};});
  T('V2 เจาะเกราะ: % ก่อนแล้วคงที่ (DEF 100, 50% + 30 → 20) · ไม่ติดลบ',()=>{const a=calcDamage(A({apenPct:.5,apen:30}),Tg({def:100}),ph()),b=calcDamage(A({apen:999}),Tg({def:50}),ph());return{ok:a.defUsed===20&&b.defUsed===0&&b.dmg===100,info:a.defUsed+' / '+b.defUsed};});
  T('V2 ATK ค่าเดียว: สกิลเวทใช้ ATK (ไม่ใช้ mpow) · ไม่มีธาตุ → ป้ายเวท · พิษ/อาคม ตีตรง → ป้ายเวท',()=>{const a=calcDamage(A({ap:100,mpow:999}),Tg(),ph({type:'magic',el:'phys'})),b=calcDamage(A(),Tg(),ph({el:'poison'})),c=calcDamage(A(),Tg(),ph({el:'arcane'}));return{ok:a.dmg===100&&a.tag==='magic'&&b.tag==='magic'&&c.tag==='magic',info:a.dmg+' '+a.tag+' '+b.tag};});
  T('V2 ลำดับ: ATK → เกราะ → ค่าต้าน → โบนัสธาตุ(บวกรวม) → คริ → สถานการณ์ → DR: 200×(42.5/52.5)×0.5×1.5×2×1.2×0.5 = 146',()=>{const r=calcDamage(A({ap:200,critDmg:2,dmgPct:.2,elDmg:{fire:.3}}),Tg({def:10,res:{fire:.5},dr:.5}),ph({el:'fire',forceCrit:1,stunned:1}));return{ok:r.dmg===146,info:'= '+r.dmg};});
  T('V2 กายภาพไม่มีค่าต้าน (ค่าต้าน phys ของมอนไม่ใช้) · คำสาปมืดลดค่าต้าน',()=>{const a=calcDamage(A(),Tg({res:{phys:.5}}),ph()),b=calcDamage(A(),Tg({res:{fire:.3},resDown:.15}),ph({el:'fire'}));return{ok:a.dmg===100&&b.dmg===85,info:a.dmg+' / '+b.dmg};});
  T('คริติคอล = ดาเมจปกติ × ตัวคูณคริ',()=>({ok:calcDamage(A({critDmg:2}),Tg(),ph({forceCrit:1})).dmg===200}));
  T('เพดานอัตราคริ 75% และดาเมจคริ 350%',()=>{const S=Stats.derive({str:10,agi:10,int:10,vit:10,luk:999},{},1,null,new Set());return{ok:S.critRate===.75&&S.critDmg===3.5,info:`${S.critRate} / ${S.critDmg}`};});
  T('สูตรคริจาก LUK: 5%+LUK×0.2%, 150%+LUK×1%',()=>{const S=Stats.derive({str:10,agi:10,int:10,vit:10,luk:10},{},1,null,new Set());return{ok:near(S.critRate,.07)&&near(S.critDmg,1.6),info:`${S.critRate} / ${S.critDmg}`};});
  T('THE LUCKY ONE: +20% คริ +40% ดาเมจคริ (ค่าคงที่) แต่อัตรายังไม่เกิน 75%',()=>{const a=Stats.derive({str:10,agi:10,int:10,vit:10,luk:10},{},1,'lucky',new Set()),b=Stats.derive({str:10,agi:10,int:10,vit:10,luk:300},{},1,'lucky',new Set());
    return{ok:near(a.critRate,.27)&&near(a.critDmg,2.0)&&b.critRate===.75,info:`${a.critRate}, ${a.critDmg}, ${b.critRate}`};});
  T('MaxHP = 500+VIT×20+Lv×50, MaxMP = 100+INT×10',()=>{const S=Stats.derive({str:10,agi:10,int:12,vit:15,luk:10},{},3,null,new Set());return{ok:S.maxHP===950&&S.maxMP===220,info:`${S.maxHP} / ${S.maxMP}`};});
  T('THE PIERCER: ไม่สนเกราะ 25% + เจาะเกราะ +20',()=>{const S=Stats.derive(BASE_ATTR,{},1,'piercer',new Set());return{ok:S.apen===20&&near(S.apenPct,.25)};});
  T('THE ENDURER 25% ใช้เพดานลดดาเมจรวม 75%',()=>{const S=Stats.derive(BASE_ATTR,{dr:.6},1,'endurer',new Set());const r=calcDamage(A(),Tg({dr:S.dr,buffDr:.3}),ph());return{ok:S.dr===.75&&r.dmg===25,info:`DR ${S.dr}, ดาเมจ ${r.dmg}`};});
  T('มึนงง: รับดาเมจเพิ่ม 20%',()=>({ok:calcDamage(A(),Tg(),ph({stunned:1})).dmg===120}));
  T('คอมโบครบชุด +20% และตัวคูณไม่ถูกคูณซ้ำ',()=>{const r=calcDamage(A(),Tg(),ph({fullCombo:1,stunned:1}));return{ok:r.dmg===144&&Object.keys(r.mods).length===2,info:'ได้ '+r.dmg};});
  T('ลดดาเมจขาเข้า: Final = Incoming × (1 − DR)',()=>({ok:incoming({dr:.25},100)===75}));
  T('ค่าต้านธาตุ: ลดดาเมจหลังหัก DEF (ไฟ 50% → 50) · ไม่มีแพ้ธาตุ (ติดลบ = 0) · กายภาพไม่โดนค่าต้านไฟ',()=>{const a=calcDamage(A(),Tg({res:{fire:.5}}),ph({el:'fire'})),b=calcDamage(A(),Tg({res:{shadow:-.5}}),ph({el:'shadow'})),c=calcDamage(A(),Tg({res:{fire:.5}}),ph({el:'phys'}));return{ok:a.dmg===50&&a.tag==='fire'&&b.dmg===100&&c.dmg===100&&c.tag==='phys',info:`${a.dmg} / ${b.dmg} / ${c.dmg}`};});
  T('ดาเมจจริงข้ามค่าต้านธาตุ · ค่าต้านมีเพดาน 75% · el:weapon ไม่นับเป็นธาตุ',()=>{const a=calcDamage(A(),Tg({res:{fire:.5}}),ph({el:'fire',trueDmg:1})),b=calcDamage(A(),Tg({res:{fire:.99}}),ph({el:'fire'})),c=calcDamage(A(),Tg(),ph({el:'weapon'}));return{ok:a.dmg===100&&a.tag==='true'&&b.dmg===25&&c.tag==='phys',info:`${a.dmg} / ${b.dmg} / ${c.tag}`};});
  T('เกราะธาตุ: res_fire จากอุปกรณ์ → S.res.fire (cap 75%) · mdef รวมเข้า DEF ×0.5',()=>{const S=Stats.derive(BASE_ATTR,{res_fire:.3,res_ice:2,mdef:20,def:5},1,null,new Set()),S0=Stats.derive(BASE_ATTR,{},1,null,new Set());return{ok:near(S.res.fire,.3)&&S.res.ice===.75&&S.def===S0.def+5+10&&S.mdef===S.def,info:`fire ${S.res.fire} ice ${S.res.ice} def ${S.def}/${S0.def}`};});
  T('V2 DoT = ATKมาตรฐาน(เลเวลผู้ใส่) × % × สแตก — ไม่ขึ้นกับ ATK จริง: Lv35 พิษ 3 สแตก = 222.5×3%×3 = 20',()=>{const f=dummy();Status.apply(f,'poison',3,{S:{level:35,ap:99999}});const d=Status.tickOf('poison',f.st8.poison,f);return{ok:d===20,info:'tick '+d};});
  T('ค่าต้านสถานะ 100% = ภูมิคุ้มกัน · ลดโอกาสติด',()=>{const f=dummy();f.statusRes={poison:1};const r1=Status.apply(f,'poison');const g=dummy();g.statusRes={poison:.4};return{ok:r1==='immune'&&near(Status.chance(null,g,'poison'),.6),info:r1+' / '+Status.chance(null,g,'poison')};});

  T('V2 พิษ สูงสุด 10 สแตก (Lv35 = 67/วิ) · สแตกที่ 11 ไม่เพิ่ม',()=>{const f=dummy(),src={S:{level:35}};for(let i=0;i<10;i++)Status.apply(f,'poison',1,src);const r=Status.apply(f,'poison',1,src);return{ok:f.st8.poison.stacks===10&&Status.dps(f)===67&&r==='capped',info:`สแตก ${f.st8.poison.stacks}, DPS ${Status.dps(f)}, ${r}`};});
  T('พิษ: สแตกใหม่ที่ถูกต้องรีเฟรชเวลาเป็น 3 วิ',()=>{const f=dummy();Status.apply(f,'poison');for(let i=0;i<60;i++)Status.update(f);Status.apply(f,'poison');return{ok:f.st8.poison.t===180&&f.st8.poison.stacks===2};});
  T('V2 เลือดไหล: ไม่มีค่าต้านธาตุ · Lv35 1 สแตก 8 → 10 สแตก 78',()=>{const f=dummy({S:{res:{fire:.75}}}),src={S:{level:35}};Status.apply(f,'bleed',1,src);const a=Status.dps(f);Status.apply(f,'bleed',14,src);return{ok:a===8&&Status.dps(f)===78&&f.st8.bleed.stacks===10,info:`${a} → ${Status.dps(f)}`};});
  T('V2 ไฟเผา 20% ไม่สแตก · ถูกลดด้วยค่าต้านไฟ (Lv35, ต้าน 50% → 22)',()=>{const f=dummy({S:{res:{fire:.5}}}),src={S:{level:35}};Status.apply(f,'burn',1,src);Status.apply(f,'burn',1,src);return{ok:Status.dps(f)===22&&!f.st8.burn.stacks,info:'dps '+Status.dps(f)};});
  T('DoT ทำงานวินาทีละครั้ง: พิษ 1 สแตก 3 วิ = 3 ครั้ง',()=>{const f=dummy();Status.apply(f,'poison',1,{S:{level:35}});let sum=0,n=0;for(let i=0;i<200;i++)Status.update(f,(k,d)=>{sum+=d;n++;});return{ok:n===3&&sum===21&&!f.st8.poison,info:`${n} ครั้ง รวม ${sum}`};});
  T('DoT หลายชนิดอยู่พร้อมกันได้ (พิษ+เลือดไหล+ไฟเผา)',()=>{const f=dummy(),s={S:{level:35}};Status.apply(f,'poison',1,s);Status.apply(f,'bleed',1,s);Status.apply(f,'burn',1,s);return{ok:!!(f.st8.poison&&f.st8.bleed&&f.st8.burn)&&Status.dps(f)===20+8+45,info:'(ไฟ+พิษ → พิษ +2 สแตก) dps '+Status.dps(f)};});
  T('ช็อก 12% และทำให้มึนงง 3 วิ',()=>{const f=dummy();Status.apply(f,'shock',1,{S:{level:35}});return{ok:!!f.st8.stun&&f.st8.stun.t===180&&Status.dps(f)===27,info:'dps '+Status.dps(f)};});
  T('V2 แสงเผาผลาญ: 15% · ฟื้น HP ครึ่งเดียว · คำสาปมืด: 5 สแตก ลดค่าต้าน 15%',()=>{const f=dummy({S:{}}),s={S:{level:35}};Status.apply(f,'radiance',1,s);const g=dummy({S:{}});Status.apply(g,'curse',9,s);Status.update(g);return{ok:Status.dps(f)===33&&Status.healMul(f)===.5&&g.st8.curse.stacks===5&&near(g.S.resDown,.15),info:Status.dps(f)+' '+g.st8.curse.stacks+' '+g.S.resDown};});
  T('V2 น้ำแข็งกัด: ช้าลง 6%/สแตก · ครบ 5 สแตก → แช่แข็ง แล้วล้างสแตก',()=>{const f=dummy(),s={S:{level:35}};Status.apply(f,'frostbite',2,s);const sl=Status.slowMul(f);Status.apply(f,'frostbite',3,s);return{ok:near(sl,.88)&&!f.st8.frostbite&&!!f.st8.freeze,info:sl+' '+!!f.st8.freeze};});
  T('V2 ปฏิกิริยา: ไฟเผา+น้ำแข็งกัด = ละลาย · แสง+มืด = สุริยคราส (ล้างทั้งคู่)',()=>{const got=[];const o=Status.onSynergy;Status.onSynergy=(f,n)=>got.push(n);const f=dummy(),g=dummy(),s={S:{level:35}};Status.apply(f,'frostbite',1,s);Status.apply(f,'burn',1,s);Status.apply(g,'radiance',1,s);Status.apply(g,'curse',1,s);Status.onSynergy=o;return{ok:got.join()==='melt,eclipse'&&!f.st8.burn&&!f.st8.frostbite&&!g.st8.radiance&&!g.st8.curse,info:got.join()};});
  T('V2 ค่าต้านสถานะลดระยะเวลาครึ่งหนึ่งของค่า (ต้าน 40% → 3 วิ × 0.8)',()=>{const f=dummy({statusRes:{burn:.4}});RNG.seed&&0;let ok=false;for(let i=0;i<40&&!ok;i++){Status.cleanse(f);if(Status.apply(f,'burn',1,{S:{level:1}})==='ok')ok=f.st8.burn.t===144;}return{ok,info:f.st8.burn&&f.st8.burn.t};});
  T('มึนงงไม่สแตก + ภูมิคุ้มกันหลังหมด (กันติด CC วนลูป)',()=>{const f=dummy();const a=Status.apply(f,'stun');const b=Status.apply(f,'stun');for(let i=0;i<181;i++)Status.update(f);const c=Status.apply(f,'stun');
    return{ok:a==='ok'&&b==='stunned'&&c==='immune'&&f.stunImm>0,info:`${a}, ${b}, ${c}`};});
  T('บอสตั้งค่าต้านทาน/ภูมิคุ้มกันสถานะได้',()=>{const f=dummy({statusRes:{stun:1,burn:1}});return{ok:Status.apply(f,'stun')==='immune'&&Status.apply(f,'burn')==='immune'};});

  T('เลเวลศัตรูคงที่ตามโซน ไม่ขยับตามเลเวลผู้เล่น',()=>{const c=[[4,1,4],[1,20,1],[15,30,15],[23,1,23]];const bad=c.filter(([z,p,e])=>enemyLevel(z,p)!==e);return{ok:!bad.length&&foeLevel(FOES.rat,7)===7&&foeLevel(FOES.golem,7)===35,info:bad.length?'ผิด: '+JSON.stringify(bad):'4 กรณี'};});
  T('คอมโบเหลือแค่พื้นฐาน (J J J) · ไม่มีคอมโบคำสั่ง/คอมโบพิเศษ',()=>({ok:COMBOS.length===1&&COMBOS[0].id==='basic'&&CMD_COMBOS.length===0}));
  T('AR1) ชนะลานประลองออนไลน์ได้รางวัลสุ่ม 1 ชิ้น ส่วนคนแพ้ไม่ได้',()=>{const sv={bag:G.bag,mode:G.mode,cur:UI.cur};G.bag=[];UI.vsResult('P2',[1,2],'guest');const won=G.bag.length;UI.vsResult('P2',[1,2],'host');const lost=G.bag.length-won;
    G.bag=sv.bag;UI.close();G.mode=sv.mode;return{ok:won===1&&lost===0&&RARS.indexOf(G.bag===sv.bag?'normal':'x')>=0,info:'ชนะได้ '+won+' · แพ้ได้ '+lost};});
  T('2H) ดาบใหญ่/ค้อนศึก: 3 ระดับตายตัว ถือ 2 มือ ช้ากว่าดาบแต่แรงกว่า ค้อนมีโอกาสสตัน 3 วิ',()=>{const ks=['w_gs1','w_gs2','w_gs3','w_wh1','w_wh2','w_wh3'],r=ks.map(k=>newItem(k,'normal',5).rar).join(),sw=WEAPONS.sword.light[0],gs=WEAPONS.gsword.light[0],hm=WEAPONS.ghammer;
    return{ok:r==='normal,rare,epic,normal,rare,epic'&&WEAPONS.gsword.twoHand&&hm.twoHand&&(gs.s+gs.a+gs.r)>(sw.s+sw.a+sw.r)&&gs.dmg>sw.dmg&&hm.heavy.stunChance>0&&hm.light.every(m=>m.stunChance>0&&m.stunDur===3)&&['gs1','gs2','gs3','wh1','wh2','wh3'].every(id=>RECIPES.some(x=>x.id===id)),info:r};});
  T('RI1) ร้านสุ่ม: สุ่ม 20000 ซื้อ 10000 ซื้อได้ชิ้นเดียวต่อการสุ่ม',()=>{const sv={bag:G.bag,gold:G.gold};G.bag=[];G.gold=35000;UI.open('reitem');document.querySelector('[data-reroll]').click();const g1=G.gold;
    document.querySelector('[data-reclaim="0"]').click();const g2=G.gold,b1=G.bag.length;const b=document.querySelector('[data-reclaim="1"]');if(b)b.click();const b2=G.bag.length;
    G.bag=sv.bag;G.gold=sv.gold;UI.close();return{ok:g1===15000&&g2===5000&&b1===1&&b2===1&&b&&b.disabled,info:`${g1} → ${g2} · ซื้อ ${b2} ชิ้น`};});
  T('AL1) ปรับค่าความสามารถ: รีค่าทั้งหมดเก็บค่าที่ล็อก · เปลี่ยนค่าที่เลือก (ไม่ซ้ำ) · อัปเทียร์ไม่ลด · ใช้วัตถุดิบถูกต้อง',()=>{const gm=JSON.stringify(G.mats),gg=G.gold;
    try{G.gold=1e6;G.mats.rerollstone=5;G.mats.philostone=5;G.mats.pickstone=2;G.mats.tierstone=3;
      const it=newItem('w_sword','epic',10);it.affixes[0].lock=true;const keep=JSON.stringify(it.affixes[0]);
      const r1=Gear.reroll(it),kept=JSON.stringify(it.affixes[0])===keep,uniq=new Set(it.affixes.map(a=>a.k)).size===it.affixes.length,inPool=it.affixes.every(a=>GPOOL.weapon.includes(a.k));
      const used=G.mats.rerollstone===4&&G.mats.philostone===4;
      const want=GPOOL.weapon.find(k=>!it.affixes.some(a=>a.k===k)),r2=Gear.pick(it,1,want),dup=Gear.pick(it,2,it.affixes[1].k),lockedPick=Gear.pick(it,0,want);
      it.affixes[1].t=Math.min(it.affixes[1].t,3);/* กันสุ่มได้ T5 อยู่แล้ว (อัปไม่ได้ → หินไม่ถูกใช้) */const t0=it.affixes[1].t;const r3=Gear.tierUp(it,1),tierOk=it.affixes[1].t===t0+(r3.ok?1:0);
      return{ok:r1.ok&&kept&&uniq&&inPool&&used&&r2.ok&&it.affixes[1].k===want&&!dup.ok&&!lockedPick.ok&&tierOk&&G.mats.pickstone===1&&G.mats.tierstone===2,info:`reroll=${r1.ok} kept=${kept} pick=${r2.ok} tier=${t0}->${it.affixes[1].t}`};
    }finally{G.mats=JSON.parse(gm);G.gold=gg;}});
  T('TW1) หอคอยนักแปรธาตุ: ประตูในเมือง 2 ชั้น + ห้องบอส Lv.38 · ศัตรู 3 ชนิด · แอ่งน้ำยา · ตารางดรอปครบ',()=>{const t=makeTown(),g=t.props.find(o=>o.inter==='citygate'),a=makeDungeon(1,'tower'),b=makeDungeon(2,'tower'),r=makeBossRoom('homunculus');
    const kinds=new Set([...a.foes,...b.foes].map(f=>f.kind));return{ok:!!g&&a.id==='tower1'&&b.id==='tower2'&&[...kinds].every(k=>['mslime','homunc','gargoyle'].includes(k))&&Object.keys(a.puddles).length>0&&r.foes[0].kind==='homunculus'&&FOES.homunculus.fixedLv===38&&THEME_BOSS.tower==='homunculus'&&!!LOOT_TABLES.tower&&!!LOOT_TABLES.homunculus&&!LootManager.validateAll().some(x=>/tower|homunc/.test(x)),info:[...kinds].join(',')};});
  T('TW2) ชุดนักแปรธาตุ: โบนัสเซ็ตปิดอยู่ · DoT ไม่มีโบนัส · มีตราล็อก (ศิลานักแปรธาตุ)',()=>{const L=[...['h_alch','a_alch','g_alch','b_alch'].map(k=>newItem(k,'normal',1))],sb=activeSetBonuses(L);const f={st8:{},S:{statusRes:0},statusRes:{}};Status.init(f);Status.apply(f,'burn',1,{S:{dotPct:.3}});
    return{ok:sb.length===0 /* ปิดระบบเซ็ตไว้ก่อน */&&Status.dps(f)===Math.round(Status.stdATK(1)*CONFIG.dot2.burn.pct)&&!!MATS.philostone,info:'DoT '+Status.dps(f)};});
  T('HX1) Hexweaver ติดซ้ำ = เวลาต่อท้ายไม่มีเพดาน (สายอื่นรีเฟรช) · พุ่งหลบคูลดาวน์ 2 วิ · บอสไม่ล้ม',()=>{const H=Stats.derive(Object.assign({},BASE_ATTR),{},1,'hexweaver',new Set()),N=Stats.derive(Object.assign({},BASE_ATTR),{},1,'lucky',new Set());
    const mk=()=>{const f={st8:{},S:{statusRes:0},statusRes:{}};Status.init(f);return f;},a=mk(),b=mk();for(let i=0;i<12;i++){Status.apply(a,'burn',1,{S:H});Status.apply(b,'burn',1,{S:N});}
    return{ok:a.st8.burn.t>b.st8.burn.t*10&&b.st8.burn.t===CONFIG.statusDur&&CONFIG.dashCD===120,info:(a.st8.burn.t/60).toFixed(1)+' วิ vs '+(b.st8.burn.t/60).toFixed(1)+' วิ'};});
  T('BQ1) bbqy: ATK 2700 และทุกการโจมตีเป็นเวท (ใช้ M.DEF หัก)',()=>{const d=FOES.duelist,E=Stats.enemy(d,100,false);G.mode='explore';BT=null;const sv=Z;
    setupBattle(mkFoe('duelist',{x:300,y:150}));const b=BT;b.intro=0;let typ=null;const o=G.dmgLog.length;for(let i=0;i<8&&G.dmgLog.length===o;i++){b.p.state='idle';b.p.invuln=0;b.p.guardLeft=0;applyHit(b.e,b.p,WEAPONS.sword.light[0],1);}typ=G.dmgLog[0]&&G.dmgLog[0].type;BT=null;G.mode='explore';
    return{ok:d.base.atk===2700&&E.ap===2700&&E.mpow===2700&&d.allMagic&&typ==='magic',info:'ATK '+E.ap+' · '+typ};});
  T('LG1) ไลต์เลส (ตำนาน): ไม่สนเกราะ 20% + ตาบอด 5 วิ = ตีไม่โดน · แหวนปฐมกาล ค่าพลัง +10 ทุกอย่าง · สร้างได้จากของบอส โอกาส 10%',()=>{const w=newItem('w_lightless','normal',9),r=newItem('r_primal','normal',9),sw=itemStats(Object.assign({},w,{affixes:[]})),sr=itemStats(Object.assign({},r,{affixes:[]}));   /* ตรวจเฉพาะค่าติดตัว (ค่าความสามารถสุ่มแยก) */
    const f={st8:{},S:{statusRes:0},statusRes:{}};Status.init(f);Status.apply(f,'blind',1,null,5);const R1=RECIPES.find(x=>x.id==='lightless'),R2=RECIPES.find(x=>x.id==='primal');
    return{ok:w.rar==='legendary'&&r.rar==='legendary'&&sw.apenPct===.2&&sw.blindChance===.2&&['str','agi','int','vit','luk'].every(k=>sr[k]>=10)&&f.st8.blind.t===300&&Craft.base(R1)===.1&&R1.mats.bossfrag===10&&R2.mats.bossfrag===10&&R1.gold===10&&R2.gold===10&&LOOT_TABLES.seraph.guaranteed.some(g=>g.mat==='bossfrag'),info:w.rar+'/'+r.rar};});
  T('LV1) เลเวลตันที่ Lv.150 — XP ส่วนเกินไม่ทำให้เกินเพดาน',()=>{const sv={level:G.level,xp:G.xp,points:G.points};G.level=149;G.xp=0;Prog.gainXP(9e9);const ok=G.level===CONFIG.levelCap&&CONFIG.levelCap===150&&G.xp===0&&Prog.gainXP(5000)===0&&G.level===150;Object.assign(G,sv);return{ok,info:'Lv.'+CONFIG.levelCap};});
  T('AE1) หินเอเธอร์: มีในวัตถุดิบ · บอสหอคอยชั้น 5 เท่านั้นที่ให้ · ไม่มีในตารางดรอป/สูตร/ร้านอื่น',()=>{
    const inLoot=Object.entries(LOOT_TABLES).filter(([id,t])=>JSON.stringify(t).includes("'aether'")||JSON.stringify(t).includes('"aether"')).map(x=>x[0]);
    const inRec=RECIPES.some(r=>JSON.stringify(r).includes('"aether"')),inShop=SPECIAL_SHOP.some(x=>x.id==='aether');
    return{ok:!!MATS.aether&&FOES.spire_b5.loot==='spireboss5'&&!inLoot.length&&!inRec&&!inShop&&typeof debugSpireBoss==='function',info:inLoot.join(',')||'ok'};});
  T('LV2) บอสเมืองแรกเลเวลตายตัว 35 / 37 / 40 (โซน +1..2) และใช้ค่า base เป็นค่าจริง',()=>{const L=[FOES.golem.fixedLv,FOES.lavaking.fixedLv,FOES.seraph.fixedLv],D=Diff.cur(),E=Stats.enemy(FOES.golem,35,false);
    return{ok:L.join()==='35,37,40'&&foeLevel(FOES.golem,1)===35&&E.maxHP===Math.round(FOES.golem.base.hp*D.eHP)&&E.ap===Math.round(FOES.golem.base.atk*D.eATK),info:L.join(' / ')+' · HP '+E.maxHP};});
  T('LV3) ไอเทมสูงสุดตามแรงค์กิลด์ (F = หายาก) · ร้านรีข้ามเพดานได้',()=>{const gr=G.guildRank;G.guildRank='F';const a=newItem('w_sword','god',5),b=newItem('w_sword','legendary',5),c=newItem('w_sword','epic',5);const rs=reitemOdds().map(x=>x[0]),rsU=reitemOdds(true).map(x=>x[0]);G.guildRank=gr;
    return{ok:a.rar==='rare'&&b.rar==='rare'&&c.rar==='rare'&&!rs.includes('epic')&&rsU.includes('god'),info:rs.join('/')};});
  T('เลเวลอัปได้ 2 แต้มค่าพลัง',()=>{const s={level:G.level,xp:G.xp,points:G.points,hp:G.hp,mp:G.mp};G.level=1;G.xp=0;G.points=0;Prog.gainXP(CONFIG.xpNext(1));const ok=G.level===2&&G.points===CONFIG.levelPoints&&CONFIG.levelPoints===2;Object.assign(G,s);return ok;});

  RNG=mulberry32(12345);
  T('ระดับไอเทม: ค่าความสามารถ 2/3/4/5/5 · ช่องรูนสูงสุด 1-5 (เริ่ม 0 ช่อง) · เทพมีความสามารถเทพ · ค่าไม่ซ้ำและอยู่ในรายการของประเภท',()=>{const mr=CONFIG.maxRarity,gr=G.guildRank;CONFIG.maxRarity='god';G.guildRank='S';const rc0=GUILD_RANKS.find(x=>x.id==='S').maxRar;GUILD_RANKS.find(x=>x.id==='S').maxRar='god';const it={};let ok=true;const N=[2,3,4,5,5];
    for(let i=0;i<RARS.length;i++){const r=RARS[i],x=newItem('w_sword',r,5);it[r]=x;const R=RARITY[r];
      if(x.affixes.length!==N[i]||R.sockets!==i+1||x.sockets.length!==0||(!!R.uniq!==!!x.uniq)||new Set(x.affixes.map(a=>a.k)).size!==x.affixes.length||!x.affixes.every(a=>GPOOL.weapon.includes(a.k)&&a.t>=1&&a.t<=5))ok=false;}
    const h=newItem('h_iron','epic',5),g=newItem('g_iron','epic',5);
    const cat=h.affixes.every(a=>GPOOL.armor.includes(a.k))&&gearCat('gloves')==='acc'&&!BASES.g_iron.def&&!BASES.r_copper.atk;
    const gp=it.god.uniq in PASSIVES.god;CONFIG.maxRarity=mr;G.guildRank=gr;GUILD_RANKS.find(x=>x.id==='S').maxRar=rc0;return{ok:ok&&gp&&cat&&!!g,info:RARS.map(r=>`${r}:${it[r].affixes.length}/${RARITY[r].sockets}`).join(' ')};});
  /* ---- slot-based crafting ---- */
  const _gr0=G.guildRank;G.guildRank='S';   // ทดสอบอัตราคราฟต์ทุกระดับ: ใช้แรงค์สูงสุด (ไม่ติดเพดานแรงค์)
  const SL=(...pairs)=>{const o=Array(6).fill(null);pairs.forEach((p,i)=>o[i]={id:p[0],q:p[1]});return o;};
  const resetCraft=m=>{G.mats=Object.assign({},m);G.bag=[];G.stats={crafts:0,craftOk:0};G.found=new Set();G.known=new Set();Craft.busy=false;};
  T('อัตราพื้นฐาน: ธรรมดา 50% หายาก 30% ตำนาน 20% เทพ 10%',()=>({ok:CONFIG.craftRates.normal===.5&&CONFIG.craftRates.rare===.3&&CONFIG.craftRates.legendary===.2&&CONFIG.craftRates.god===.1}));
  const trials=20000,sample={normal:['club',SL(['wood',2])],rare:['flame',SL(['ore',2],['fire',1],['wood',1])],legendary:['kage',SL(['cloth',3],['ore',3],['core',1])],god:['god',SL(['essence',1],['lavaore',5],['fire',2])]};
  for(const rar of RARS.filter(r=>sample[r])){const[id,slots]=sample[rar];
    T(`คราฟต์ ${RARN[rar]} (${id}): ได้จริงใกล้ ${CONFIG.craftRates[RECIPES.find(x=>x.id===id).rar]*100}% จาก ${trials} ครั้ง`,()=>{RNG=mulberry32(900+rar.length);
      const r=RECIPES.find(x=>x.id===id),m={};for(const k in r.mats)m[k]=r.mats[k]*trials;resetCraft(m);let ok=0;
      for(let i=0;i<trials;i++){const res=Craft.attempt(slots,false);if(res.ok)ok++;else if(!res.failed)return{ok:false,info:res.err};}
      const rate=ok/trials;return{ok:Math.abs(rate-CONFIG.craftRates[r.rar])<.012&&G.bag.length===(r.out.base?ok:0),info:'ได้จริง '+(rate*100).toFixed(2)+'%'};});}
  T('คริสตัลศักดิ์สิทธิ์: +20 จุด (ธรรมดา 70%, เทพ 30%) และไม่เกิน 100%',()=>{const n=RECIPES.find(x=>x.id==='club'),g=RECIPES.find(x=>x.id==='god');
    const a=Craft.chance(n,true),b=Craft.chance(g,true);const save=CONFIG.craftRates.normal;CONFIG.craftRates.normal=.95;const c=Craft.chance(n,true);CONFIG.craftRates.normal=save;
    return{ok:near(a,.7)&&near(b,CONFIG.craftRates[g.rar]+.2)&&c===1,info:`${a} / ${b} / cap ${c}`};});
  T('คริสตัลศักดิ์สิทธิ์ (สุ่มจริง 20000 ครั้ง ระดับเทพ ≈ 30%)',()=>{RNG=mulberry32(31337);resetCraft({essence:trials,lavaore:trials*5,fire:trials*2,divine:trials});let ok=0;
    for(let i=0;i<trials;i++)if(Craft.attempt(sample.god[1],true).ok)ok++;const rate=ok/trials;return{ok:Math.abs(rate-(CONFIG.craftRates[RECIPES.find(x=>x.id==='god').rar]+.2))<.012&&!G.mats.divine,info:(rate*100).toFixed(2)+'% · ใช้คริสตัลครั้งละ 1 (เหลือ '+(G.mats.divine||0)+')'};});
  T('ใช้คริสตัลได้ครั้งละชิ้นเดียว แม้มีหลายชิ้น',()=>{RNG=()=>.5;resetCraft({wood:2,divine:5});const r=Craft.attempt(SL(['wood',2]),true);return{ok:G.mats.divine===4&&near(r.chance,.7),info:'เหลือ '+G.mats.divine};});
  T('ไม่เลือกใช้คริสตัล = ไม่ถูกหัก',()=>{RNG=()=>.1;resetCraft({wood:2,divine:2});Craft.attempt(SL(['wood',2]),false);return{ok:G.mats.divine===2};});
  T('ลำดับวัตถุดิบไม่มีผล และแยกจำนวนหลายช่องได้',()=>{const a=Craft.match(SL(['ore',1],['wood',1])),b=Craft.match(SL(['wood',1],['ore',1])),c=Craft.match(SL(['wood',1],['wood',1]));
    return{ok:a&&b&&a.id==='sword'&&b.id==='sword'&&c&&c.id==='club'};});
  T('สูตรไม่ถูกต้อง: ไม่ตรงสูตร / ของเกิน / จำนวนผิด → คราฟต์ไม่ได้และไม่เสียของ',()=>{resetCraft({wood:5,ore:5,fang:5});
    const r1=Craft.attempt(SL(['fang',3]),false),r2=Craft.attempt(SL(['wood',1],['ore',1],['fang',1]),false),r3=Craft.attempt(SL(['wood',3]),false);
    return{ok:!r1.ok&&!r1.failed&&!r2.ok&&!r2.failed&&!r3.ok&&!r3.failed&&G.mats.wood===5&&G.mats.ore===5&&G.mats.fang===5&&G.stats.crafts===0,info:r1.err};});
  T('จำนวนในกระเป๋าไม่พอ → ตรวจซ้ำตอนยืนยันและไม่เสียของ',()=>{resetCraft({wood:1});const r=Craft.attempt(SL(['wood',2]),false);return{ok:!r.ok&&!r.failed&&r.short&&r.short[0].have===1&&G.mats.wood===1};});
  T('ใช้คริสตัลแต่ไม่มีคริสตัล → คราฟต์ไม่ได้',()=>{resetCraft({wood:2});const r=Craft.attempt(SL(['wood',2]),true);return{ok:!r.ok&&!r.failed&&G.mats.wood===2};});
  T('สำเร็จ: หักวัตถุดิบ + ได้อุปกรณ์ตามความหายากเข้ากระเป๋า',()=>{RNG=()=>.01;resetCraft({cloth:3,ore:3,core:1});const r=Craft.attempt(sample.legendary[1],false);
    return{ok:r.ok&&!G.mats.cloth&&!G.mats.ore&&!G.mats.core&&G.bag.length===1&&G.bag[0].rar===RECIPES.find(x=>x.id==='kage').rar&&G.bag[0].base==='w_kage'};});
  T('ล้มเหลว: เสียวัตถุดิบทั้งหมด + คริสตัล และไม่ได้อุปกรณ์',()=>{RNG=()=>.99;resetCraft({wood:1,ore:1,divine:1});const r=Craft.attempt(SL(['wood',1],['ore',1]),true);
    return{ok:r.failed&&!G.mats.wood&&!G.mats.ore&&!G.mats.divine&&G.bag.length===0&&r.lost.divine===1};});
  T('กันกดซ้ำ: ระหว่างกำลังคราฟต์ เรียกซ้ำไม่ทำงาน',()=>{resetCraft({wood:4});Craft.busy=true;const r=Craft.attempt(SL(['wood',2]),false);Craft.busy=false;return{ok:r.err==='busy'&&G.mats.wood===4};});
  T('ไม่มีระบบ pity: หลังพลาด 5 ครั้งติด โอกาสยังเท่าเดิม (เทพ 10%)',()=>{RNG=mulberry32(4242);resetCraft({essence:60000,lavaore:300000,fire:120000});let streak=0,after=0,afterOk=0;
    for(let i=0;i<60000;i++){const res=Craft.attempt(sample.god[1],false).ok;if(streak>=5){after++;if(res)afterOk++;}streak=res?0:streak+1;}
    const p=afterOk/after,ex=CONFIG.craftRates[RECIPES.find(x=>x.id==='god').rar];return{ok:Math.abs(p-ex)<.015,info:`${(p*100).toFixed(2)}% จาก ${after} ครั้ง`};});
  T('คัมภีร์ให้เบาะแสสูตร แต่ไม่เปลี่ยนโอกาสสำเร็จ',()=>{const r=RECIPES.find(x=>x.id==='god');resetCraft({sc_god:1});const before=Craft.clueKnown(r),c=Craft.chance(r,false);Inv.use('sc_god');
    return{ok:!before&&Craft.clueKnown(r)&&Craft.chance(r,false)===c&&c===CONFIG.craftRates[r.rar]};});
  G.guildRank=_gr0;
  /* ---- skill rune sockets ---- */
  const skSave=Skills.toSave(),skTal=G.talent,goldSave=G.gold;
  const freshSk=()=>{G.talent='lucky';Skills.init('lucky');G.mats={};G.gold=0;Skills.cache={};};
  /* ผู้เล่นยังไม่มีสกิลสุดยอด (ช่อง 5 เว้นว่าง) — ทดสอบกลไกช่อง 5 ด้วยสกิลศัตรู 2 ตัวชั่วคราว */
  const ULT_T=['starfall','moonfall'],ULT_U=ULT_T.map(k=>SKILLS[k].user);ULT_T.forEach(k=>SKILLS[k].user='all');
  T('เริ่มเกม: เรียนเฉพาะสกิลเฉพาะตัว และยังไม่ผนึก (ต้องยืนยันก่อน)',()=>{freshSk();return{ok:G.skills.learned.size===1&&G.skills.learned.has('luckyseven')&&!G.skills.bound&&G.skills.slots.every(x=>!x)};});
  T('ติดตั้ง/แทนที่/ถอด สกิลทั่วไปและหายาก',()=>{freshSk();['slashcut','poisondart','fireshield','poisondart'].forEach(k=>G.skills.learned.add(k));
    const a=Skills.equip(0,'slashcut').ok,b=Skills.equip(0,'poisondart').ok&&G.skills.slots[0]==='poisondart',c=Skills.equip(1,'fireshield').ok,d=Skills.equip(0,null).ok&&!G.skills.slots[0];return{ok:a&&b&&c&&d};});
  T('ตรวจประเภทสกิลกับช่อง + กันใส่ซ้ำ + กันสกิลที่ยังไม่เรียน',()=>{freshSk();['slashcut','fireshield'].forEach(k=>G.skills.learned.add(k));
    G.skills.learned.add('starfall');const a=Skills.equip(0,'fireshield').ok,b=Skills.equip(1,'slashcut').ok,c=!Skills.equip(0,'cuttingwind').ok,d=!Skills.equip(3,'slashcut').ok,e=!Skills.equip(2,'luckyseven').ok,f=!Skills.equip(0,'starfall').ok,g=!Skills.equip(1,'luckyseven').ok;return{ok:a&&b&&c&&d&&e&&f&&g,info:'ช่อง 1–2 รับทั่วไป+หายาก'};});
  T('ถอดแล้วใส่ใหม่ เลเวลสกิลยังอยู่',()=>{freshSk();G.skills.learned.add('slashcut');G.skills.lv.slashcut=3;Skills.equip(0,'slashcut');Skills.equip(0,null);Skills.equip(0,'slashcut');return{ok:Skills.level('slashcut')===3};});
  T('ผนึกสกิลเฉพาะตัว: ถาวร ถอด/แทนที่/ผนึกซ้ำไม่ได้',()=>{freshSk();const a=Skills.bind('luckyseven').ok;G.skills.learned.add('ironwall');
    const b=!Skills.equip(3,null).ok,c=!Skills.equip(3,'ironwall').ok,d=!Skills.bind('ironwall').ok,e=!Skills.replaceUnique('ironwall').ok;
    return{ok:a&&b&&c&&d&&e&&G.skills.bound==='luckyseven'&&G.skills.slots[3]==='luckyseven'};});
  T('ผนึกได้เฉพาะสกิลเฉพาะตัวที่เรียนแล้ว',()=>{freshSk();G.skills.learned.add('slashcut');return{ok:!Skills.bind('slashcut').ok&&!Skills.bind('ironwall').ok&&!G.skills.bound};});
  T('ตราทำลายผนึก: ใช้ 1 ชิ้นเมื่อยืนยัน สกิลใหม่ผนึกต่อ สกิลเก่า+เลเวลเก็บไว้',()=>{freshSk();Skills.bind('luckyseven');G.skills.lv.luckyseven=4;G.skills.learned.add('ironwall');Inv.add('sealbreaker',2);
    const r=Skills.replaceUnique('ironwall');return{ok:r.ok&&G.mats.sealbreaker===1&&G.skills.bound==='ironwall'&&G.skills.slots[3]==='ironwall'&&G.skills.learned.has('luckyseven')&&Skills.level('luckyseven')===4&&!Skills.equip(2,'luckyseven').ok};});
  T('อัปเกรด: ต้องผนึกก่อน, ของไม่พอไม่หักอะไร, พอแล้วหักและเลเวลขึ้น, ดาเมจ/คูลดาวน์ปรับตามตาราง',()=>{freshSk();G.talent='piercer';Skills.init('piercer');const a=!Skills.upgrade('piercestrike').ok;Skills.bind('piercestrike');
    const b=!Skills.upgrade('piercestrike').ok&&G.gold===0;const req=SKILL_UPGRADE.levels[2];for(const k in req.mats)Inv.add(k,req.mats[k]);G.gold=req.gold;
    const m1=Skills.move('piercestrike','fist',2).dmg;const c=Skills.upgrade('piercestrike').ok;const m2=Skills.move('piercestrike','fist',2).dmg;
    return{ok:a&&b&&c&&Skills.level('piercestrike')===2&&G.gold===0&&!Object.keys(req.mats).some(k=>G.mats[k])&&near(m2/m1,req.coef,1e-9),info:`ดาเมจ ${m1.toFixed(1)}→${m2.toFixed(1)}`};});
  T('อัปเกรดไม่เกินเลเวลสูงสุด',()=>{freshSk();Skills.bind('luckyseven');G.skills.lv.luckyseven=SKILL_UPGRADE.maxLevel;G.gold=1e6;for(const k in MATS)G.mats[k]=99;const r=Skills.upgrade('luckyseven');return{ok:!r.ok&&Skills.level('luckyseven')===SKILL_UPGRADE.maxLevel};});
  T('ช่องสกิลเรียงใหม่: ช่อง 3 รับทั่วไป/หายาก, ช่อง 4 เฉพาะตัว, ช่อง 5 สุดยอด และเซฟ-โหลดได้ 5 ช่อง',()=>{freshSk();['slashcut','starfall'].forEach(k=>G.skills.learned.add(k));const a=Skills.equip(2,'slashcut').ok&&G.skills.slots[2]==='slashcut',b=!Skills.equip(4,'slashcut').ok,c=!Skills.equip(3,'slashcut').ok,d=Skills.equip(4,'starfall').ok&&G.skills.slots[4]==='starfall';const sv=Skills.toSave();const e=sv.slots.length===5&&sv.slots[2]==='slashcut'&&sv.slots[4]==='starfall';Skills.fromSave({learned:['slashcut'],slots:[null,null,'slashcut',null,null]});const f=G.skills.slots.length===5&&G.skills.slots[2]==='slashcut';
    const svSel=UI.sk.sel;['luckyseven','slashcut','starfall'].forEach(k=>G.skills.learned.add(k));Skills.bind('luckyseven');Skills.equip(2,'slashcut');Skills.equip(4,'starfall');
    UI.sk.sel=2;const h3=UI.scr_skills();UI.sk.sel=3;const h4=UI.scr_skills();UI.sk.sel=4;const h5=UI.scr_skills();UI.sk.sel=svSel;
    const m2=h3.match(/data-ssock="2"[\s\S]*?<\/button>/),m3=h3.match(/data-ssock="3"[\s\S]*?<\/button>/);
    const uiOk=h3.includes('ช่อง 1–3')&&!h3.includes('ช่อง 1–2 และช่อง 5')&&!!m2&&!m2[0].includes('🔒')&&!!m3&&m3[0].includes('🔒')&&h4.includes('อัปเกรด')&&h5.includes('เกจท่าไม้ตาย 100');
    return{ok:a&&b&&c&&d&&e&&f&&uiOk,info:`uiOk=${uiOk}`};});
  T('สกิลสุดยอด: ติดตั้ง แทนที่ และถอดออกได้',()=>{freshSk();['starfall','moonfall'].forEach(k=>G.skills.learned.add(k));const a=Skills.equip(4,'starfall').ok,b=Skills.equip(4,'moonfall').ok&&G.skills.slots[4]==='moonfall',c=Skills.equip(4,null).ok&&!G.skills.slots[4];return{ok:a&&b&&c};});
  T('เซฟ/โหลด: เก็บการผนึก เลเวลอัปเกรด และช่องสกิล',()=>{freshSk();G.skills.learned.add('slashcut');Skills.equip(0,'slashcut');Skills.bind('luckyseven');G.skills.lv.luckyseven=3;
    const d=JSON.parse(JSON.stringify(Skills.toSave()));Skills.init('lucky');Skills.fromSave(d);
    return{ok:G.skills.bound==='luckyseven'&&Skills.level('luckyseven')===3&&G.skills.slots[0]==='slashcut'&&G.skills.slots[3]==='luckyseven'&&G.skills.learned.has('slashcut')};});
  T('เซฟรุ่นเก่า (ก่อนมีระบบผนึก): สกิลเฉพาะตัวที่ใส่อยู่ถือว่าผนึกแล้ว',()=>{Skills.fromSave({learned:['luckyseven','slashcut'],slots:['slashcut',null,'luckyseven',null]});return{ok:G.skills.bound==='luckyseven'&&!G.skills.lv.luckyseven};});
  T('ตราทำลายผนึก: ใช้จากกระเป๋าโดยตรงไม่ได้ (กันกดพลาด)',()=>{freshSk();Skills.bind('luckyseven');Inv.add('sealbreaker',1);const r=Inv.use('sealbreaker');return{ok:!r.ok&&G.mats.sealbreaker===1&&G.skills.bound==='luckyseven'};});
  T('เลเวลอัป/เควสต์ไม่ปลดล็อกสกิล (ได้จากดรอปเท่านั้น)',()=>{freshSk();G.flags=Object.assign({},G.flags,{kageDown:1});const sv={level:G.level};G.level=20;const got=Skills.check();G.level=sv.level;return{ok:!got.length&&G.skills.learned.size===1};});
  T('ตำราสกิลทุกระดับ (ทั่วไป/หายาก/สุดยอด) อยู่ในตารางดรอป',()=>{const tiers=new Set();for(const t in LOOT_TABLES)for(const e of LOOT_TABLES[t].entries)if(e.book)tiers.add(e.book);return{ok:['common','rare','ultimate'].every(x=>tiers.has(x))};});
  T('อ่านตำราสกิล: เรียนสกิล + ใช้ตำรา 1 เล่ม + ใส่ช่องว่างอัตโนมัติ, เรียนซ้ำไม่เสียตำรา',()=>{freshSk();Inv.add('sk_fireshield',2);const a=Inv.use('sk_fireshield').ok,b=!Inv.use('sk_fireshield').ok;
    return{ok:a&&b&&G.skills.learned.has('fireshield')&&G.skills.slots[1]==='fireshield'&&G.mats.sk_fireshield===1};});
  /* ---- v3: skill database, mana, potions, ultimate gauge, equipment caps, combo cancel ---- */
  T('ฐานข้อมูลสกิล (ปรับใหม่): ผู้เล่นใช้ได้เฉพาะสกิลเฉพาะตัว + ทั่วไป 9 / หายาก 9 · ไม่มีสกิลสุดยอดของผู้เล่น · ทุกพรสวรรค์มีสกิลเฉพาะตัว',()=>{const pl=Object.keys(SKILLS).filter(k=>skillUsable(k,'player')&&!ULT_T.includes(k));
    const nonU=pl.filter(k=>SKILLS[k].tier!=='unique').sort(),tal=Object.values(TALENTS).every(t=>SKILLS[t.skill]&&SKILLS[t.skill].tier==='unique'&&skillUsable(t.skill,'player'));
    const want=[...PLAYER_SKILLS].sort(),tierN=t2=>nonU.filter(k=>SKILLS[k].tier===t2).length;
    return{ok:nonU.join()===want.join()&&tierN('common')===9&&tierN('rare')===9&&!pl.some(k=>SKILLS[k].tier==='ultimate')&&tal,info:nonU.join(',')};});
  T('ค่ามานา: ทั่วไป 5-50, หายาก 15-100, เฉพาะตัวแอ็กทีฟ 30-60, พาสซีฟ 0, สุดยอด = เกจ 100 ไม่ใช้ MP',()=>{const bad=Object.entries(SKILLS).filter(([k,s])=>{if(s.user==='enemy'||s.bossOnly)return false;
      if(s.tier==='common')return!(s.mp>=5&&s.mp<=50);if(s.tier==='rare')return!(s.mp>=15&&s.mp<=100);
      if(s.tier==='unique')return s.type==='passive'?!!s.mp:s.mpPct?!(s.mpPct===.2):!(s.mp>=30&&s.mp<=60);return s.gauge!==100||!!s.mp;}).map(([k])=>k);return{ok:!bad.length,info:bad.join(',')||'ครบทุกสกิล'};});
  T('MP ไม่พอ → ใช้สกิลไม่ได้ และ MP ไม่ถูกหัก',()=>{freshSk();G.skills.learned.add('slashcut');const p={mp:10,S:{maxMP:200,mpCost:0}};const e=skillCastCheck(p,'slashcut');return{ok:!!e&&p.mp===10,info:e};});
  T('คูลดาวน์สกิล: ระหว่างคูลดาวน์ใช้ไม่ได้ หมดแล้วใช้ได้',()=>{freshSk();const p={mp:999,S:{maxMP:999,mpCost:0}};G.skills.cd.slashcut=60;const a=!!skillCastCheck(p,'slashcut');for(let i=0;i<60;i++)Skills.tick();return{ok:a&&!skillCastCheck(p,'slashcut')};});
  T('สกิลพาสซีฟกดใช้ไม่ได้ (ทำงานอัตโนมัติ)',()=>({ok:!!skillCastCheck({mp:999,S:{maxMP:999}},'focus')&&Skills.move('focus','fist',2)===null}));
  T('ฟื้น MP: ในการต่อสู้ 1/3 วิ, นอกการต่อสู้ 1/1.5 วิ, ไม่เกิน Max MP',()=>{const S={maxMP:100,mpRegen:0},a={mp:0},b={mp:0},c={mp:99};
    for(let i=0;i<540;i++){Mana.regen(a,S,true);Mana.regen(b,S,false);Mana.regen(c,S,false);}return{ok:a.mp===3&&b.mp===6&&c.mp===100,info:`9 วิ: ต่อสู้ ${a.mp}, นอก ${b.mp}, เพดาน ${c.mp}`};});
  T('โบนัสฟื้นฟูมานา/ลดค่ามานาจากอุปกรณ์ ติดเพดาน 30%',()=>{const S=Stats.derive(BASE_ATTR,{mpRegen:.9,mpCost:.5,statusRes:.2},1,null,new Set());
    const o={mp:0};for(let i=0;i<1800;i++)Mana.regen(o,Object.assign({},S,{maxMP:999}),true);return{ok:S.mpRegen===.3&&S.mpCost===.3&&near(S.statusRes,.2+Math.floor(BASE_ATTR.str/10)*CONFIG.derived.strPer10Res)&&o.mp===13&&Mana.cost('cuttingwind',S)===Math.round(SKILLS.cuttingwind.mp*(1-.3)),info:`30 วิ: ${o.mp} MP, ค่าคลื่นดาบ ${Mana.cost('cuttingwind',S)}`};});
  T('อุปกรณ์เพิ่ม Max MP / คริ / เจาะเกราะ ได้',()=>{const S=Stats.derive(BASE_ATTR,{mp:50,critRate:.05,critDmg:.2,apen:12},1,null,new Set());return{ok:S.maxMP===250&&near(S.critRate,.12)&&near(S.critDmg,1.8)&&S.apen===12};});
  T('ยามานา: 100/250/500/1000, ไม่เกิน Max MP, คูลดาวน์ 10 วิ',()=>{const sv=G.potCD;G.potCD=0;G.mats={mp_s:1,mp_m:1,mp_l:1,mp_x:1};const S={maxMP:2000},o={mp:0};
    const a=Mana.drink(o,S,'mp_s');const blocked=!Mana.drink(o,S,'mp_m').ok;G.potCD=0;Mana.drink(o,S,'mp_m');G.potCD=0;Mana.drink(o,S,'mp_l');G.potCD=0;const x=Mana.drink(o,S,'mp_x');
    const capS={maxMP:300},c={mp:250};G.mats.mp_x=1;G.potCD=0;Mana.drink(c,capS,'mp_x');const cd=G.potCD;G.potCD=sv;
    return{ok:a.gained===100&&blocked&&o.mp===1850&&x.gained===1000&&c.mp===300&&cd===600,info:`รวม ${o.mp}, เต็ม ${c.mp}`};});
  T('เกจท่าไม้ตาย: ตีโดน +2, คอมโบ +5, ปัดป้อง +8, สวนกลับ +5, โดนตี +1, สูงสุด 100',()=>{const sv=G.ult;G.ult=0;const f={isP:true};
    Ult.gain(f,'hit',1);Ult.gain(f,'combo',1);Ult.gain(f,'perfectBlock','a');Ult.gain(f,'counter',1);Ult.gain(f,'beingHit','b');const v=G.ult;
    for(let i=0;i<200;i++)Ult.gain(f,'hit','x'+i);const cap=G.ult;G.ult=sv;return{ok:v===21&&cap===100,info:`${v} → เพดาน ${cap}`};});
  T('เกจท่าไม้ตาย: เหตุการณ์ซ้ำ (ท่าหลายฮิตเดียวกัน) ได้แค่ครั้งเดียว',()=>{const sv=G.ult;G.ult=0;const f={isP:true};for(let i=0;i<12;i++)Ult.gain(f,'hit',7);const v=G.ult;G.ult=sv;return{ok:v===2};});
  T('สกิลสุดยอดใช้เกจ 100 (ไม่ใช้ MP)',()=>{const sv=G.ult;freshSk();const p={mp:0,S:{maxMP:100}};G.ult=99;const a=!!skillCastCheck(p,'starfall');G.ult=100;const b=!skillCastCheck(p,'starfall');Ult.spend();const c=G.ult;G.ult=sv;return{ok:a&&b&&c===0};});
  T('Combo Cancel: ยกเลิกได้เฉพาะในหน้าต่างหลังตีโดน',()=>{const m={kind:'light'},f=o=>Object.assign({state:'attack',move:m,didHit:true,phase:'recovery',pt:3},o);
    return{ok:inWindow(f())&&inWindow(f({phase:'active',pt:1}))&&!inWindow(f({didHit:false}))&&!inWindow(f({pt:CONFIG.comboWindow+1}))&&!inWindow(f({move:{kind:'ultimate'}}))};});
  T('ต้านสถานะจากอุปกรณ์ทำงาน (ต้าน 100% = ภูมิคุ้มกัน)',()=>{const f=dummy({S:{statusRes:1}});return{ok:Status.apply(f,'poison')==='immune'};});
  T('พาสซีฟเฉพาะตัว: จิตแน่วแน่ +10% คริ (ไม่เกิน 75%) เมื่อผนึก',()=>{freshSk();G.skills.learned.add('focus');G.skills.bound='focus';G.skills.slots[3]='focus';const p=Skills.passiveOf();
    return{ok:p&&p.id==='focus'&&near(p.v,.1)};});
  /* ---- ปรับสกิลใหม่ 2026-11 ---- */
  T('SK1) ลบสกิลที่ไม่มีใครใช้ + ไม่มีตำราสกิลค้างในตารางดรอป/หีบ',()=>{const gone=['dragonstorm','galeblade','hyperbeam','polarisnova','rockthrow','rushkick','shadowstep','spiritpalm','titanfist','toxicworld','windvanish'].filter(k=>SKILLS[k]);
    const bad=[];for(const n in LOOT_TABLES){const T2=LOOT_TABLES[n];for(const e of [...(T2.guaranteed||[]),...(T2.entries||[])])if(e.mat&&e.mat.startsWith('sk_')&&!MATS[e.mat])bad.push(n+':'+e.mat);}
    for(const k of [...CHEST_SKILLS,...RARE_COLO_SKILLS])if(!MATS[k])bad.push(k);
    const used=new Set();for(const d of Object.values(FOES))for(const s of d.skills||[])used.add(s);const miss=[...used].filter(s=>!SKILLS[s]);
    return{ok:!gone.length&&!bad.length&&!miss.length,info:[...gone,...bad,...miss].join(',')||'สะอาด'};});
  T('SK2) สกิลศัตรูเท่านั้น: judge/beam/barrier ทั้งหมด + สกิลที่ศัตรูใช้ ผู้เล่นเรียนไม่ได้และไม่มีตำรา',()=>{const ids=['bluejudge','eyejudge','lightjudge','aether_sovereign','silvabeam','alchbarrier','bbqybarrier','silvabarrier','orb','thunderclap'];
    const bad=ids.filter(k=>!SKILLS[k]||skillUsable(k,'player')||MATS['sk_'+k]||Skills.learn(k).ok);return{ok:!bad.length,info:bad.join(',')||'ok'};});
  T('SK3) บาลานซ์อัลติบอส: ดาเมจรวม ≤45% HP ผู้เล่นเลเวลเดียวกัน (เกราะปกติ)',()=>{const out=[];
    for(const[k,d]of Object.entries(FOES))for(const s of d.skills||[]){const S=SKILLS[s];if(!S||S.tier!=='ultimate'||!['bluejudge','eyejudge','lightjudge','aether_sovereign','silvabeam'].includes(s))continue;
      const lv=d.fixedLv||40,E=Stats.enemy(d,lv),hp=700+70*lv,K=40+2.5*lv,arm=K/(K+10+lv),p=E.ap*S.coef*arm*(S.alwaysCrit?1.5:1)/hp;out.push([k+'/'+s,Math.round(p*100)]);}
    return{ok:out.length>=3&&out.every(x=>x[1]<=45),info:out.map(x=>x.join(' ')+'%').join(' · ')};});
  T('SK4) เซฟเก่า: สกิลที่ถูกลบ/เป็นของศัตรู หายจากช่อง+รายการเรียน ส่วนสกิลที่เก็บไว้ยังอยู่',()=>{const sv=G.mats;G.mats={sk_orb:2,sk_slashcut:1};
    Skills.fromSave({learned:['luckyseven','orb','hyperbeam','slashcut'],slots:['orb','slashcut',null,'luckyseven','hyperbeam'],bound:'luckyseven'});
    const ok=!G.skills.learned.has('orb')&&!G.skills.learned.has('hyperbeam')&&G.skills.learned.has('slashcut')&&G.skills.slots[0]===null&&G.skills.slots[1]==='slashcut'&&G.skills.slots[4]===null&&G.skills.bound==='luckyseven'&&!G.mats.sk_orb&&G.mats.sk_slashcut===1;G.mats=sv;return{ok};});
  T('SK5) หน้าสกิล/ตำรา แสดงธาตุของสกิล',()=>{freshSk();G.skills.learned.add('poisondart');Skills.equip(0,'poisondart');const sv=UI.sk.sel;UI.sk.sel=0;UI.sk.cand='poisondart';const h=UI.scr_skills();UI.sk.sel=sv;
    return{ok:h.includes(ELNAME.poison)&&UI.skStats('cuttingwind').includes(ELNAME.phys)&&typeof skEl==='function'};});
  T('SK6) เอฟเฟกต์ใหม่ (pixelfx): ดาบแสงตกลงปัก + ใบมีดลม + มหันตภัยเพลิงน้ำแข็งสีฟ้า + เพลิงพายุมรกต สร้างและเล่นจนจบได้',()=>{const okL=typeof PXFX!=='undefined'&&['sword-rain','wind-blades','frostfire-cataclysm','emerald-firestorm'].every(n=>{const fx=PXFX[n]({x:400,y:300,facing:-1});let i=0;for(;i<400&&!fx.done();i++)fx.update(1/60);return i>20&&fx.done();});
    return{ok:okL&&SKILLS.lightjudge.lightJudge===1};});
  T('SK7) สกิลใหม่ 12 ตัว: มีธาตุ ไอคอน ตำรา คำอธิบาย และบาลานซ์ตามระดับ (ทั่วไป 100–160% · หายาก 180–240%)',()=>{const N=['frostshard','embersweep','voltstep','shadowfang','holyspark','earthspike','meteorstrike','chainlightning','glacialprison','shadowreap','holyrain','venomfang'];
    const bad=N.filter(k=>{const s=SKILLS[k];if(!s||!MATS['sk_'+k]||!SKILL_GI[k]||!GI[SKILL_GI[k]]||!s.el||!ELNAME[s.el]||!s.desc)return true;const r=s.tier==='common'?[1,1.6]:[1.8,2.4];return s.coef<r[0]||s.coef>r[1]||!Skills.move(k,'sword',0);});
    const els=new Set(N.map(k=>SKILLS[k].el));return{ok:!bad.length&&els.size>=6,info:bad.join(',')||('ธาตุ '+[...els].join(','))};});
  T('SK8) Blink: พุ่ง + อมตะ + บัฟทุกค่า +5% นาน 1.2 วิ แล้วหายเอง · แสดงเป็นป้ายเดียว',()=>{const sv=G.mode;loadZone(makeDungeon(1,'stone'));const e=mkFoe('rat',{x:P.x+200,y:P.y});Z.foes.push(e);setupBattle(e);G.mode='battle';BT.intro=0;
    const f=BT.p,ap0=f.S.ap,x0=f.x,m=Skills.move('blink','sword',1);beginMove(f,m);const chips=(f.S.mods||[]).filter(x=>x.grp==='blink').length,raw=f.mods.filter(x=>x.grp==='blink').length;const ap1=f.S.ap,cr=f.S.critRate,moved=Math.abs(f.x-x0)>100,inv=f.invuln>0;
    for(let i=0;i<80;i++)StatSync.frame(f);const ap2=f.S.ap;BT=null;G.mode=sv||'explore';
    return{ok:moved&&inv&&ap1>ap0&&ap1<=Math.ceil(ap0*1.05)&&cr>0&&near(ap2,ap0,1e-6)&&SKILLS.blink.blinkBuff.t===72&&chips===1&&raw===6,info:`ATK ${ap0}→${ap1.toFixed(2)}→${ap2} · ป้าย ${chips}/${raw}`};});
  T('SK9) อัลติขัดไม่ได้: โดนตี/มึนระหว่างออกท่าไม่หลุดท่า · พุ่งหลบยังหลบอัลติได้',()=>{const sv=G.mode;loadZone(makeDungeon(1,'stone'));const e=mkFoe('aether_king',{x:P.x+90,y:P.y});Z.foes.push(e);setupBattle(e);G.mode='battle';BT.intro=0;
    const E=BT.e,Pp=BT.p,mv=Skills.move('lightjudge','aethersword',3);E.state='attack';E.phase='active';E.pt=0;E.move=mv;E.invuln=0;
    const hit=Skills.move('slashcut','sword',0);applyHit(Pp,E,hit,1,E.x,E.y-50);const keep1=E.state==='attack'&&E.move===mv;
    E.stunImm=0;E.st8.stun=null;Status.apply(E,'stun',1,Pp,2);prevHooks[0](E);const keep2=E.state==='attack'&&E.move===mv;
    Pp.invuln=10;const hp0=Pp.hp;applyHit(E,Pp,mv,1,Pp.x,Pp.y-50);const dodged=Pp.hp===hp0;
    const nm=Skills.move('slashcut','sword',0);E.move=nm;E.state='attack';E.phase='active';applyHit(Pp,E,hit,1,E.x,E.y-50);const normalCancel=E.move!==nm||E.state!=='attack';
    BT=null;G.mode=sv||'explore';return{ok:keep1&&keep2&&dodged,info:`hit=${keep1} stun=${keep2} dash=${dodged} normal=${normalCancel}`};});
  T('SK10) Frostnova บาลานซ์ใหม่ + ผู้เล่นเรียนได้',()=>{const s=SKILLS.frostnova;return{ok:skillUsable('frostnova','player')&&!!MATS.sk_frostnova&&s.coef<=1.8&&s.rootDur<=120&&s.cd>=12&&s.reach<=180};});
  T('SK11) มังกรคำพิพากษาตาคราม: วาดเต็มตัว (ลำตัว+ขา+หาง) ได้โดยไม่ error',()=>{const c=document.createElement('canvas');c.width=800;c.height=500;const g2=c.getContext('2d');
    drawDragon(g2,500,300,-1,1,1,SKILLS.bluejudge.dragon,1);drawDragon(g2,300,300,1,.5,.2,SKILLS.bluejudge.dragon,.3);
    const d=g2.getImageData(0,0,800,500).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return{ok:n>12000,info:n+' px'};});
  T('SK12) กระสุนหลายฮิต: ดาเมจรวม = 100% ของสกิล (แบ่งเท่ากันทุกฮิต)',()=>{const sv=G.mode;loadZone(makeDungeon(1,'stone'));const e=mkFoe('rat',{x:P.x+200,y:P.y});Z.foes.push(e);setupBattle(e);G.mode='battle';BT.intro=0;
    const muls=[],orig=applyHit;window.applyHit=function(a,t2,m,mul,...r){muls.push(mul);};
    try{const m=Skills.move('chainlightning','sword',0),E=BT.e;BT.proj.push({seq:'t',x:E.x,y:E.y-40,vx:0,o:BT.p,m,r:40,hits:3,cd:0,life:200});
      for(let i=0;i<60&&BT.proj.length;i++){E.invuln=0;updBattleCore();}}finally{window.applyHit=orig;BT=null;G.mode=sv||'explore';}
    const tot=muls.reduce((s,v)=>s+v,0);return{ok:muls.length===3&&near(tot,1,1e-9),info:muls.map(v=>v.toFixed(3)).join('+')+'='+tot.toFixed(3)};});
  ULT_T.forEach((k,i)=>SKILLS[k].user=ULT_U[i]);
  G.talent=skTal;Skills.fromSave(skSave);G.gold=goldSave;Skills.cache={};
  /* ---- Loot & Drop system (spec 14 cases + extras) ---- */
  const lsv={bag:G.bag,mats:G.mats,gold:G.gold,t:G.t,pity:G.pity,log:G.lootLog,pe:LOOT_CONFIG.pity.enabled};
  const Zt={ground:[]};const gen=(o)=>LootManager.generate(Object.assign({tableId:'rat',cls:'normal',level:5,luk:10,pid:'P1'},o));
  const ids=r=>r.drops.filter(d=>!d.guaranteed).map(d=>d.kind==='item'?d.item.base:d.mat);
  T('1) ศัตรูปกติดรอปของได้ (สุ่มผ่าน 40%)',()=>{RNG=mulberry32(1);let n=0;for(let i=0;i<200;i++)if(ids(gen()).length)n++;return{ok:n>0,info:`${n}/200 ครั้งมีของสุ่ม`};});
  T('2) ศัตรูไม่ดรอปของสุ่ม (ทองตายตัวยังได้)',()=>{RNG=()=>.999;const r=gen();return{ok:ids(r).length===0&&r.drops.some(d=>d.kind==='gold')};});
  T('อัตราดรอปจริงศัตรูปกติ ≈ ค่าที่ตั้งไว้ (LOOT_CONFIG.classes.normal.chance)',()=>{RNG=mulberry32(5);let n=0;const N=20000;for(let i=0;i<N;i++)if(ids(gen()).length)n++;return{ok:Math.abs(n/N-LOOT_CONFIG.classes.normal.chance)<.012,info:(n/N*100).toFixed(1)+'%'};});
  T('3) ศัตรูหัวหน้าดรอปหลายชิ้น (ตาม qty ของ elite)',()=>{RNG=mulberry32(9);const[lo,hi]=LOOT_CONFIG.classes.elite.qty;let ok=true,seen=new Set();for(let i=0;i<300;i++){const r=gen({cls:'elite'});const n=ids(r).length;if(n){seen.add(n);if(n<lo||n>hi)ok=false;}}return{ok:ok&&lo>=2&&seen.has(lo)&&seen.has(hi),info:'จำนวนที่พบ '+[...seen].sort()};});
  const tableIds=t=>new Set(LOOT_TABLES[t].entries.flatMap(e=>e.base?[e.base]:e.mat?[e.mat]:[]));
  T('4) บอสดรอปจากตารางของตัวเอง ตามจำนวนที่ตั้งไว้ (qty ของ boss)',()=>{RNG=mulberry32(11);const[lo,hi]=LOOT_CONFIG.classes.boss.qty;let ok=true;for(let i=0;i<300;i++){const r=gen({tableId:'golem',cls:'boss',level:6});const n=ids(r).length;if(n&&(n<lo||n>hi))ok=false;if(!n&&LOOT_CONFIG.classes.boss.chance>=1)ok=false;}return{ok,info:lo+'-'+hi+' ชิ้น · โอกาสดรอป '+LOOT_CONFIG.classes.boss.chance};});
  T('5) บอสไม่ดรอปของจากตารางบอสอื่น',()=>{RNG=mulberry32(12);const kingOnly=['h_crown','essence','mp_x'];let leak=0;for(let i=0;i<2000;i++)for(const id of ids(gen({tableId:'golem',cls:'boss',level:9})))if(kingOnly.includes(id))leak++;return{ok:leak===0,info:'รั่ว '+leak};});
  T('บอสเซราฟ: ข้อมูลครบ (สไปรต์/พาเลท/ท่า/ตารางดรอป/โซน/ตายเกิด 1 ครั้ง)',()=>{const d=FOES.seraph;return{ok:!!(d&&SPR[d.map]&&PAL[d.pal]&&d.moves.some(m=>m.beam)&&d.moves.some(m=>m.proj)&&LOOT_TABLES[d.loot]&&ZONE_INFO.sanctum&&BIOME.sanctum&&d.revive===1&&!d.phases&&ELC.holy&&SKILLS.eyejudge&&SKILLS.eyejudge.user==='enemy'&&!MATS.sk_eyejudge&&SETS.seraph&&['h_halo','a_seraph','g_seraph','p_seraph','w_seraph'].every(k=>BASES[k]))};});
  T('ลานเซราฟ: สร้างโซน/บอส/ประตูกลับล็อกอยู่ และปลดล็อกเมื่อชนะ',()=>{const z=makeSanctum();const pt=z.props.find(o=>o.k==='portal');const b=z.foes[0];return{ok:b.kind==='seraph'&&pt.locked===1&&z.grid.length===17&&!!z.props.find(o=>o.k==='exitdoor')&&!['#','^','T'].includes(z.grid[9][2])};});
  T('ถ้ำน้ำแข็ง: ชั้น 1-2 สร้างได้ มีบันได/ประตูออก และประตูเมืองบนขวาเดินถึงได้',()=>{const a=makeDungeon(1,'ice'),b=makeDungeon(2,'ice');const t=makeTown();const gp=t.props.find(o=>o.k==='citygate');const gx=Math.floor(t.gate.x/16),gy=Math.floor(t.gate.y/16);
    return{ok:a.id==='ice1'&&b.id==='ice2'&&a.theme==='ice'&&a.props.some(o=>o.k==='stairs')&&a.props.some(o=>o.k==='exitdoor')&&a.foes.every(f=>['frostslime','frostwolf','iceknight','icegolem'].includes(f.kind))&&!FOES.icerat&&makeSanctum().foes.length===1&&a.lavaTiles.length===0&&!!gp&&gp.x>t.cols*16*.6&&gp.y<100&&!'#^TRLW'.includes(t.grid[gy][gx])&&['frostslime','frostwolf','iceknight','icegolem'].every(k=>FOES[k]&&(FOES[k].kind==='rig'||SPR[FOES[k].map])&&PAL[FOES[k].pal])&&!!LOOT_TABLES.icecave&&ZONE_INFO.ice1&&BIOME.ice};});
  T('ลานประลอง: สกิลชุดเดียวกัน 4 ช่อง และรองรับปุ่มสกิลครบ 5 ช่อง (รวมท่าสุดยอด)',()=>{const s=CONFIG.arena.skills;return{ok:s.length===4&&s.every(id=>SKILLS[id]&&['common','rare'].includes(SKILLS[id].tier)&&SKILLS[id].type!=='passive')&&!!NETBITS.find(b=>b[0]==='S4')&&!!NETBITS.find(b=>b[0]==='S5')&&VSS1.length===5&&VSKN2_SK.length===5};});
  T('ห้องบอสแยกทุกตัว: ประตูออก/พอร์ทัลล็อก มีบอสตัวเดียว หนีจากบอสไม่ได้',()=>{const ok=['golem','lavaking','seraph'].every(k=>{const z=makeBossRoom(k);return z.foes.length===1&&z.foes[0].kind===k&&z.props.filter(o=>o.k==='exitdoor'||o.k==='portal').every(o=>o.locked===1)&&ZONE_INFO[z.id];});
    const c=makeCave(),tw=makeTown(),cg=tw.props.find(o=>o.k==='citygate'),s1=makeDungeon(1,'stone'),s2=makeDungeon(2,'stone');return{ok:ok&&!c.foes.some(f=>f.kind==='golem')&&!!cg&&!tw.props.some(o=>o.k==='stonegate'||o.k==='cavegate'||o.k==='icegate'||o.k==='towergate')&&s1.id==='stone1'&&s2.props.some(o=>o.k==='stairs')&&s1.props.some(o=>o.k==='exitdoor')&&s1.foes.every(f=>['rat','mudslime','rockling'].includes(f.kind))&&s1.lavaTiles.length===0&&!!LOOT_TABLES.stonecave&&CONFIG.flee.allowBoss===false};});
  T('บอสไม่การันตีอุปกรณ์ (มีแต่ทอง/ไอเท็มเดินเรื่อง)',()=>({ok:['kage','golem','lavaking','seraph'].every(t=>LOOT_TABLES[t].guaranteed.every(g=>g.gold||(g.mat&&!BASES[g.mat])))}));
  T('CR1) คราฟต์: ไม่มีสูตรกระทะของพ่อ · สูตรมหากาพย์ทุกสูตรต้องใช้วัตถุดิบบอส (โกเลม/ราชันย์ลาวา/นักแปรธาตุ/เซราฟ) · ส่วนผสมไม่ซ้ำกัน',()=>{const BOSS=['core','essence','philostone','bossfrag'];
    const noPan=!RECIPES.some(r=>r.id==='firepan'||r.mats.pan)&&!MATS.sc_firepan&&!(QUESTS.pan&&JSON.stringify(QUESTS.pan.reward).includes('sc_firepan'));
    const bad=RECIPES.filter(r=>r.out.base&&RARS.indexOf(r.rar)>=RARS.indexOf('epic')&&!Object.keys(r.mats).some(k=>BOSS.includes(k))).map(r=>r.id);
    const sig=RECIPES.map(r=>Object.entries(r.mats).sort().join('|')),dup=sig.length-new Set(sig).size;
    return{ok:noPan&&!bad.length&&!dup,info:`pan=${noPan} ไม่มีของบอส=${bad.join(',')||'-'} ซ้ำ=${dup}`};});
  T('RS1) กันปั๊มทรัพยากร: จุดเก็บ/ขุดเก็บได้ครั้งเดียวต่อ 5 นาที · น้ำพุฟื้นเลือดทุกครั้งแต่ฟื้นศัตรู/ทรัพยากร 5 นาทีครั้ง · ดันเจี้ยนเข้าซ้ำภายใน 5 นาทีได้ห้องเดิม',()=>{
    const sf=JSON.stringify(G.flags||{}),gm=JSON.stringify(G.mats),dn=Respawn.now;let T0=1e12;Respawn.now=()=>T0;
    try{G.flags={};G.mats={};const node={x:100,y:200,inter:'gather_hide'};interact({type:'gather_hide',o:node});const a=G.mats.hide||0;interact({type:'gather_hide',o:node});const b=G.mats.hide||0;
      T0+=RESPAWN_MS+1000;interact({type:'gather_hide',o:node});const c=G.mats.hide||0;
      interact({type:'fountain',o:{x:0,y:0}});const f1=Respawn.fountainLeft();T0+=60000;G.hp=1;interact({type:'fountain',o:{x:0,y:0}});const healed=G.hp>1,f2=Respawn.fountainLeft();
      enterDungeon(1,'stone');const z1=Z;z1.foes.forEach(e=>e.alive=false);loadZone(makeTown());enterDungeon(1,'stone');const same=Z===z1&&Z.foes.every(e=>!e.alive);T0+=RESPAWN_MS+1;loadZone(makeTown());enterDungeon(1,'stone');const fresh=Z!==z1;
      return{ok:a===1&&b===1&&c===2&&f1===RESPAWN_MS&&f2===RESPAWN_MS-60000&&healed&&same&&fresh,info:`hide ${a}/${b}/${c} · fountain ${f1}/${f2} · dun same=${same} fresh=${fresh}`};
    }finally{Respawn.now=dn;G.flags=JSON.parse(sf);G.mats=JSON.parse(gm);loadZone(makeTown());}});
  T('RS2) ของบนพื้น: เก็บแล้วหาย · เข้าโซนใหม่/กดน้ำพุไม่ทำให้เกิดใหม่ · ครบ 5 นาทีหลังเก็บจึงกลับมา',()=>{const sf=JSON.stringify(G.flags||{}),gm=JSON.stringify(G.mats),dn=Respawn.now;let T0=2e12;Respawn.now=()=>T0;
    try{G.flags={};enterMineCaveZone();const it=Z.items.find(i=>!i.taken);if(!it)return{ok:false,info:'ไม่มีของบนพื้น'};interact({type:'item',o:it});
      loadZone(makeTown());enterMineCaveZone();const still=it.taken;const fo=Z.props.find(p=>p.k==='fountain');if(fo)interact({type:'fountain',o:fo});const still2=it.taken;
      T0+=RESPAWN_MS-1000;Respawn.refreshItems(Z);const still3=it.taken;T0+=2000;Respawn.refreshItems(Z);const back=!it.taken;
      return{ok:still&&still2&&still3&&back,info:`reenter=${still} fountain=${still2} 4:59=${still3} 5:01=${back}`};
    }finally{Respawn.now=dn;G.flags=JSON.parse(sf);G.mats=JSON.parse(gm);loadZone(makeTown());}});
  T('STY1) เนื้อเรื่อง: บอสทุกตัวตั้งแต่คาเงะถึงราชาอัศวินแสงมีบทพูดก่อนสู้+หลังแพ้ · บทพูดชี้กลับเนื้อเรื่อง (หินเอเธอร์/นิกซ์/โอเรเลียน)',()=>{
    const path=['kage','golem','lavaking','homunculus','seraph','spire_b1','spire_b2','spire_b3','spire_b4','spire_b5','aspire_b1','aspire_b2','aspire_b3','aspire_b4','aether_king'];
    const miss=path.filter(k=>!FOES[k]||!BOSS_LINES[k]||!BOSS_LINES[k].intro||!BOSS_LINES[k].win||!BOSS_LINES[k].re);
    const lore=path.filter(k=>/หิน|นิกซ์|โอเรเลียน|ผู้กล้า|รอยแยก/.test(JSON.stringify(BOSS_LINES[k]))).length;
    const allBoss=Object.keys(FOES).filter(k=>FOES[k].boss&&!FOES[k].challenge).filter(k=>!BOSS_LINES[k]);
    const scenes=['prologue','ch1','afterKage','ch2','ch3','ch4','ch5','crystalEnter','ch6','aetherEnter','epilogue'].filter(s=>!STORY_SCENES[s]);
    return{ok:!miss.length&&lore>=13&&!allBoss.length&&!scenes.length&&STORY_STONES.length===8,info:`ขาด ${miss.join(',')||'-'} · บอสไม่มีบท ${allBoss.join(',')||'-'} · ฉาก ${scenes.join(',')||'ครบ'} · อ้างเนื้อเรื่อง ${lore}/${path.length}`};});
  T('STY2) ก่อนสู้บอส: ขึ้นบทพูดก่อนแล้วจึงเข้าฉากต่อสู้ · ครั้งที่สองพูดสั้น · หลังชนะ: บทพูดแพ้ → คัตซีนบทถัดไป (ครั้งเดียว)',()=>{const sf=JSON.stringify(G.flags||{});
    try{G.flags={};Story.queue=[];Story.active=null;Story.cine(false);loadZone(makeDungeon(1,'stone'));const e=mkFoe('golem',{x:P.x+60,y:P.y});Z.foes.push(e);
      startBattle(e);const introOK=G.mode==='dialog'&&DLG&&DLG.lines.length===BOSS_LINES.golem.intro.length;while(DLG)nextLine();const toBattle=G.mode==='trans';
      G.mode='explore';e._storyIntro=0;startBattle(e);const reShort=DLG&&DLG.lines.length===1;while(DLG)nextLine();G.mode='explore';
      UI.close&&UI.close();G.mode='explore';Story.bossWin('golem');Story.flush();const winSay=DLG&&DLG.lines[0][1]===Story.fmt(BOSS_LINES.golem.win[0][1]);while(DLG)nextLine();
      const card=Story.active&&Story.active.id==='ch2'&&G.mode==='story';Story._cardT=99;Story.next();while(DLG)nextLine();const done=!Story.active&&G.flags.story.scene.ch2===1;
      Story.bossWin('golem');Story.flush();const once=!DLG&&!Story.active;
      return{ok:introOK&&toBattle&&reShort&&winSay&&card&&done&&once,info:`intro=${introOK} battle=${toBattle} re=${reShort} win=${winSay} card=${card} done=${done} once=${once}`};
    }finally{if(typeof BT!=='undefined')BT=null;G.mode='explore';Story.active=null;Story.queue=[];Story.cine(false);G.flags=JSON.parse(sf);loadZone(makeTown());}});
  T('STY3) บทนำเล่นก่อนคัตซีนเปิดเกม · จบกิลด์แล้วเข้าบทที่ 1 · เข้าหอคอยครั้งแรกขึ้นการ์ดบท',()=>{const sf=JSON.stringify(G.flags||{});
    try{G.flags={};Story.queue=[];Story.active=null;Cutscene.startIntro();const pro=Story.active&&Story.active.id==='prologue';Story._cardT=99;Story.next();while(DLG)nextLine();const intro=Cutscene.active==='intro';
      Cutscene.skip();Story.flush();const ch1=Story.active&&Story.active.id==='ch1';Story.skip();
      G.guildRank='S';enterSpire(1,'mage');G.mode='explore';UI.close&&UI.close();Story.flush();const tw=Story.active&&Story.active.id==='crystalEnter';Story.skip();
      return{ok:pro&&intro&&ch1&&tw,info:`prologue=${pro} intro=${intro} ch1=${ch1} tower=${tw}`};
    }finally{Cutscene.abort();Story.active=null;Story.queue=[];Story.cine(false);G.flags=JSON.parse(sf);G.mode='explore';loadZone(makeTown());}});
  T('WP1) วาร์ปจากแผนที่ (M): ไปได้เฉพาะน้ำพุที่เคยแตะ · ในดันเจี้ยนวาร์ปไม่ได้ · แผนที่แสดงปุ่มวาร์ป',()=>{const sf=JSON.stringify(G.flags||{});
    try{G.flags={};loadZone(makeTown());const notYet=!Warp.go('forest').ok;
      if(!FOREST_ZONE)FOREST_ZONE=makeForestZone();loadZone(FOREST_ZONE);const fo=FOREST_ZONE.props.find(p=>p.k==='fountain');interact({type:'fountain',o:fo});const unlocked=!!Warp.list().forest;
      loadZone(makeTown());const r1=Warp.go('forest'),inForest=Z.id==='forest';
      enterDungeon(1,'stone');UI.mapTab='kingdom';const h=UI.scr_map(),r2=Warp.go('town'),stay=Z.theme==='stone';
      return{ok:notYet&&unlocked&&r1.ok&&inForest&&!r2.ok&&stay&&h.includes('data-warp')&&h.includes('วาร์ปไม่ได้'),info:`unlock=${unlocked} go=${r1.ok}/${inForest} dun=${r2.ok}`};
    }finally{G.flags=JSON.parse(sf);loadZone(makeTown());}});
  T('RN1) รูน ธรรมดา 8 · หายาก 8 · ค่าเบา (ATK ≤+4 / % ≤5) · ดรอปจากมอน/บอส',()=>{const n=RUNE_TIER.normal,r=RUNE_TIER.rare;
    const light=RUNES.every(k=>{const R=MATS[k].rune;return Object.entries(R).every(([s,v])=>['atk','def','sta'].includes(s)?v<=8:s==='hp'?v<=50:s==='mp'?v<=25:v<=.08);});
    const drop=['rat','stonecave','icecave'].every(tb=>LOOT_TABLES[tb].entries.some(e=>e.rune==='normal'))&&['golem','seraph','spireboss'].every(tb=>LOOT_TABLES[tb].entries.some(e=>e.rune==='rare'));
    return{ok:n.length===8&&r.length===8&&light&&drop&&!MATS.rune_matk,info:n.length+'/'+r.length};});
  T('RN2) นักเล่นแร่แปรธาตุ: ซื้อรูนสุ่ม · หลอมรูนธรรมดา ×3 → รูนหายาก · ใส่/ถอดรูนเพิ่มค่าจริง · หน้าจอไม่มีปรับค่าความสามารถแล้ว',()=>{const gm=JSON.stringify(G.mats),gg=G.gold,bag=G.bag;
    try{G.gold=5000;G.mats={};const b=RuneShop.buy(),boughtN=b.ok&&MATS[b.rune].rar==='normal'&&G.gold===5000-RUNE_SHOP.buy;
      G.mats={rune_atk:3};const f=RuneShop.fuse('rune_atk'),fused=f.ok&&!G.mats.rune_atk&&MATS[f.rune].rar==='rare'&&(G.mats[f.rune]||0)===1;
      const no=!RuneShop.fuse('rune_atk').ok;G.mats.rune_def=1;G.bag=[];const it=Inv.addItem(newItem('w_sword','normal',5));it.sockets=[null];const a0=itemStats(it).def||0;Equip.socketRune(it,0,'rune_def');const a1=itemStats(it).def||0;
      UI.runePick=null;const h=UI.scr_alchemy();
      return{ok:boughtN&&fused&&no&&a1-a0===4&&h.includes('ใส่รูน')&&h.includes('data-rbuy')&&!h.includes('data-afroll')&&!UI.scr_craft.toString().includes('data-ctab="rune"')};
    }finally{G.mats=JSON.parse(gm);G.gold=gg;G.bag=bag;}});
  T('6) ผู้เล่นแต่ละคนได้ผลสุ่มแยกกัน',()=>{RNG=mulberry32(77);G.simPlayers={P2:{luk:10}};let diff=0;for(let i=0;i<50;i++){const[a,b]=LootManager.rollForPlayers({tableId:'golem',cls:'boss',level:6},['P1','P2']);
      if(a.pid!=='P1'||b.pid!=='P2'||a.drops===b.drops||a.drops.some(d=>b.drops.includes(d)))return{ok:false,info:'แชร์ผลกัน'};if(JSON.stringify(ids(a))!==JSON.stringify(ids(b)))diff++;}return{ok:diff>30,info:`ต่างกัน ${diff}/50 ครั้ง`};});
  T('7) ผู้เล่นอื่นเก็บของที่ไม่ใช่ของตัวเองไม่ได้',()=>{G.bag=[];G.mats={};Zt.ground=[];const[gi]=LootManager.spawn(Zt,100,100,{pid:'P1',drops:[{kind:'mat',mat:'wood',q:1,rar:'normal'}]});
      const r=LootManager.pickup(Zt,gi,'P2');return{ok:!r.ok&&r.reason==='owner'&&Zt.ground.length===1&&!G.mats.wood};});
  T('8) กระเป๋าเต็ม → เก็บไม่ได้ และของยังอยู่บนพื้น',()=>{G.bag=[];Zt.ground=[];for(let i=0;i<LOOT_CONFIG.inventory.equipSlots;i++)G.bag.push({uid:-i,base:'a_cloth',rar:'normal'});
      const[gi]=LootManager.spawn(Zt,0,0,{pid:'P1',drops:[{kind:'item',item:newItem('w_sword','rare',1),rar:'rare'}]});G.mats={hide:LOOT_CONFIG.inventory.stackMax};const[gm]=LootManager.spawn(Zt,0,0,{pid:'P1',drops:[{kind:'mat',mat:'hide',q:1,rar:'normal'}]});
      const r=LootManager.pickup(Zt,gi,'P1'),r2=LootManager.pickup(Zt,gm,'P1');return{ok:!r.ok&&r.reason==='full'&&!r2.ok&&Zt.ground.length===2&&G.bag.length===LOOT_CONFIG.inventory.equipSlots};});
  T('9) เก็บสำเร็จ → เข้ากระเป๋าและของบนพื้นหายไป, เก็บซ้ำไม่ได้ (กันของซ้ำ)',()=>{G.bag=[];G.mats={};G.gold=0;Zt.ground=[];const sp=LootManager.spawn(Zt,0,0,{pid:'P1',drops:[{kind:'item',item:newItem('w_sword','rare',1),rar:'rare'},{kind:'gold',q:50,rar:'normal'}]});
      const a=LootManager.pickup(Zt,sp[0],'P1'),b=LootManager.pickup(Zt,sp[0],'P1'),c=LootManager.pickup(Zt,sp[1],'P1');return{ok:a.ok&&!b.ok&&c.ok&&G.bag.length===1&&G.gold===50&&Zt.ground.length===0};});
  T('10) ของหมดอายุ (120 วิ) ถูกลบ และเก็บไม่ได้',()=>{G.mats={};Zt.ground=[];const t0=G.t;const[gi]=LootManager.spawn(Zt,0,0,{pid:'P1',drops:[{kind:'mat',mat:'wood',q:1,rar:'normal'}]});
      const life=gi.expire-gi.born;G.t=t0+LOOT_CONFIG.ground.lifetime-1;const alive=LootManager.cleanup(Zt)===0;G.t=t0+LOOT_CONFIG.ground.lifetime;const r=LootManager.pickup(Zt,gi,'P1');const gone=Zt.ground.length===0;G.t=t0;
      return{ok:life===7200&&alive&&!r.ok&&r.reason==='expired'&&gone&&!G.mats.wood};});
  T('11) อ้างอิงไอเท็มผิด/ไม่มีตาราง → ไม่พัง ข้ามอย่างปลอดภัย',()=>{RNG=()=>.01;LOOT_TABLES.__bad={guaranteed:[{mat:'nope'},{gold:[1,1]}],entries:[{base:'nope',w:5,rar:'any'},{mat:'nope2',w:5},{w:3}]};
      const a=LootManager.generate({tableId:'__bad',cls:'boss',level:1,luk:10,pid:'P1'}),b=LootManager.generate({tableId:'__missing',pid:'P1'});delete LOOT_TABLES.__bad;
      const bad=LootManager.validateAll();return{ok:a.drops.length===1&&a.drops[0].kind==='gold'&&b.drops.length===0&&bad.some(x=>x.includes('template')),info:`ตรวจพบอ้างอิงผิด ${bad.length} รายการ`};});
  T('12) Luck เพิ่มโอกาสดรอปแบบสัมพัทธ์ เพดาน +50% และไม่กระทบของตายตัว',()=>{const a=LootManager.dropChance('normal',10),b=LootManager.dropChance('normal',30),c=LootManager.dropChance('normal',999),d=LootManager.dropChance('elite',999),e=LootManager.dropChance('normal',0);
      RNG=()=>.999;const r=gen({luk:999});const N=LOOT_CONFIG.classes.normal.chance,E=LOOT_CONFIG.classes.elite.chance;return{ok:near(a,N)&&near(b,N*1.2)&&near(c,N*1.5)&&near(d,Math.min(1,E*1.5))&&near(e,N)&&ids(r).length===0&&r.drops.some(x=>x.guaranteed),info:`${a} / ${b} / ${c} / elite ${d}`};});
  T('Luck ไม่เปลี่ยนน้ำหนักความหายาก',()=>{RNG=mulberry32(3);const cnt=l=>{let g=0,t=0;for(let i=0;i<40000;i++){const r=gen({cls:'boss',tableId:'golem',level:9,luk:l});const rd=r.drops.filter(d=>!d.guaranteed&&d.rar);t+=rd.length;g+=rd.filter(d=>d.rar==='epic').length;}return g/Math.max(1,t);};const a=cnt(10),b=cnt(999);return{ok:Math.abs(a-b)/a<.15,info:`สัดส่วนของมหากาพย์ ${(a*100).toFixed(1)}% vs ${(b*100).toFixed(1)}%`};});
  T('13) การกระจายความหายาก (ศัตรูปกติ / หัวหน้า / บอส) ตรงตามน้ำหนัก',()=>{RNG=mulberry32(2024);const N=200000,out=[];let ok=true;
      for(const cls of ['normal','elite','boss']){const W=LootManager.weights(cls),tot=Object.values(W).reduce((a,b)=>a+b,0),c={};for(let i=0;i<N;i++){const r=weighted(W);c[r]=(c[r]||0)+1;}
        for(const r of RARS){const exp=W[r]/tot,got=(c[r]||0)/N;if(Math.abs(exp-got)>Math.max(.003,exp*.08))ok=false;}out.push(cls+': '+RARS.map(r=>((c[r]||0)/N*100).toFixed(1)).join('/'));}return{ok,info:out.join(' · ')};});
  T('น้ำหนักความหายากของบอสใช้ร่วมกับมินิบอส และตั้งค่าได้',()=>({ok:LootManager.weights('miniboss')===LOOT_CONFIG.classes.boss.rar&&LOOT_CONFIG.classes.normal.rar.epic<=10&&LOOT_CONFIG.classes.normal.rar.legendary===0.002&&LOOT_CONFIG.classes.normal.rar.god===0.0001}));
  T('Pity บอส: ปิดเป็นค่าเริ่มต้น / เปิดแล้วได้เศษวิญญาณที่ครั้งที่ 10 และ 20 แยกตามบอสและผู้เล่น',()=>{G.pity={};LOOT_CONFIG.pity.enabled=false;const off=LootManager.pity('P1','golem').length;LOOT_CONFIG.pity.enabled=true;let got=[];
      for(let i=1;i<=20;i++){const x=LootManager.pity('P1','golem');if(x.length)got.push(i);}const other=G.pity.P1.lavaking===undefined&&!G.pity.P2;return{ok:off===0&&got.join()==='10,20'&&other,info:'ได้ที่ครั้ง '+got};});
  T('14) เซฟ/โหลด เก็บกระเป๋า จำนวนวัตถุดิบ อุปกรณ์ และ Pity ครบ',()=>{const mr=CONFIG.maxRarity,gr=G.guildRank;CONFIG.maxRarity='god';G.guildRank='A';G.bag=[newItem('w_sword','legendary',5)];CONFIG.maxRarity=mr;G.guildRank=gr;G.mats={wood:7,mp_s:3};G.pity={P1:{golem:4}};const d=JSON.parse(JSON.stringify(Save.data()));
      return{ok:d.bag.length===1&&d.bag[0].rar==='legendary'&&d.bag[0].affixes.length===G.bag[0].affixes.length&&d.mats.wood===7&&d.mats.mp_s===3&&d.pity.P1.golem===4&&'eq' in d&&!('ground' in d.world)};});
  Object.assign(G,{bag:lsv.bag,mats:lsv.mats,gold:lsv.gold,t:lsv.t,pity:lsv.pity,lootLog:lsv.log});LOOT_CONFIG.pity.enabled=lsv.pe;delete G.simPlayers;
  /* ---- หลบหนี + ประตูออก ---- */
  const fleeSim=(seed,n)=>{RNG=mulberry32(seed);let ok=0;for(let i=0;i<n;i++)if(rand()<CONFIG.flee.chance)ok++;return ok/n;};
  T('หลบหนี: โอกาสสำเร็จตั้งไว้ 50% และสุ่มจริงได้ ≈ 50%',()=>{const r=fleeSim(42,20000);return{ok:CONFIG.flee.chance===.5&&Math.abs(r-.5)<.012,info:(r*100).toFixed(1)+'%'};});
  T('หลบหนี: ล้มเหลวแล้วติดคูลดาวน์ กดรัวไม่ได้ / สำเร็จแล้วจบการต่อสู้โดยไม่ได้ EXP',()=>{const sv=BT,f={state:'idle',st:0,x:100,dir:1,vx:0,onGround:true,move:null};
      BT={result:null,def:{boss:0},fleeCD:0,small:null,msg:null,end:0};RNG=()=>.9;const a=tryFlee(f,{x:200});const b=fleeCheck({...f,state:'idle'});const cd=BT.fleeCD;
      BT={result:null,def:{boss:0},fleeCD:0};RNG=()=>.1;f.state='idle';f.st=0;const c=tryFlee(f,{x:200});const res=BT.result;BT=sv;
      return{ok:!a.ok&&cd===CONFIG.flee.cooldown&&b&&b.includes('ยังหนีไม่ได้')&&c.ok&&res==='flee',info:b};});
  T('ทุกชั้นดันเจียนมีประตูออกกลับเมือง',()=>{const zs=[makeCave(),makeDungeon(1),makeDungeon(2),makeDungeon(3)];return{ok:zs.every(z=>z.props.some(o=>o.k==='exitdoor'&&o.inter==='town'&&[-2,6,14].every(d=>z.grid[Math.floor((o.y+d)/16)][Math.floor(o.x/16)]==='.')))};});
  /* ---- ห้องออนไลน์ (จำลองสายตรงระหว่าง Net 2 ตัวในหน้าเดียว) ---- */
  {const sv={BT,mode:G.mode,vsNet:G.vsNet,keys:{...keys}};
  const mkPair=()=>{const a=new NetCore(),b=new NetCore();a.tx=m=>{m.from=a.id;b.rx(JSON.parse(JSON.stringify(m)));};b.tx=m=>{m.from=b.id;a.rx(JSON.parse(JSON.stringify(m)));};a.refresh=b.refresh=()=>{};return[a,b];};
  T('ออนไลน์: เข้าห้อง→ต้อนรับ→เจ้าของห้องเห็นเพื่อน และคนที่ 3 ถูกปฏิเสธ',()=>{const[a,b]=mkPair();a.role='host';b.role='guest';b.tx({t:'join',name:'เพื่อน'});
      const ok=a.lobby.peer&&b.hostId===a.id&&b.lobby.phase==='joined';const c=new NetCore();let got=null;c.role='guest';c.tx=m=>{m.from=c.id;if(m.t==='join')a.rx(m);};a.tx=m=>{m.from=a.id;got=m.t;};c.tx({t:'join'});
      return{ok:ok&&got==='full'&&a.peerId===b.id};});
  T('ออนไลน์: ปุ่มของเพื่อนถูกส่งเป็นบิตและกลายเป็นปุ่มเสมือนฝั่งโฮสต์ (ไม่ปนกับปุ่มของโฮสต์)',()=>{const[a,b]=mkPair();a.role='host';b.role='guest';b.tx({t:'join'});
      keys.KeyD=false;keys.ArrowLeft=true;keys.Comma=true;b.guestInput();delete keys.ArrowLeft;delete keys.Comma;
      const r=keys.NetL===true&&keys.NetJ===true&&keys.NetR===false&&!keys.KeyA&&!keys.KeyJ;b.tx({t:'inp',m:0,tp:0});return{ok:r&&keys.NetL===false,info:'ตัวอย่างบิต L,J'};});
  T('ออนไลน์: โฮสต์คำนวณ P2 จากปุ่มเครือข่าย — เพื่อนกดซ้ายแล้ว P2 เดินซ้าย',()=>{G.vsNet='host';setupVS([0,0],1);const e=BT.e,p=BT.p,x0=e.x;e.state='idle';keys.NetL=true;control(e,p);keys.NetL=false;
      const moved=e.x<x0&&e.keys===VSKN2;const px=p.x;keys.NetL=true;control(p,e);keys.NetL=false;return{ok:moved&&p.x===px};});
  T('ออนไลน์: ภาพสถานะจากโฮสต์ถูกนำไปแสดงฝั่งเพื่อนครบ (ตำแหน่ง ท่า HP เอฟเฟกต์ตัวเลข)',()=>{const[a,b]=mkPair();a.role='host';b.role='guest';b.tx({t:'join'});a.rid=b.rid=7;
      G.vsNet='host';setupVS([0,0],1);const H=BT;H.intro=0;H.p.x=205;H.e.x=262;H.e.hp=333;H.p.state='attack';H.p.phase='active';H.p.move=WEAPONS[H.p.wpn].heavy;H.comboShow=3;H.comboT=60;H.comboWho=H.p;
      H.nums.push({x:250,y:100,txt:'42',col:'#fff',size:20,t:55});const s=JSON.parse(JSON.stringify(a.snap()));
      G.vsNet='guest';setupVS([0,0],1);const Gst=BT;b.applySnap(s);b.lastRx=0;b.guestStep();
      return{ok:Math.abs(Gst.p.x-205)<30&&Gst.e.hp===333&&Gst.p.state==='attack'&&Gst.p.move&&Gst.p.move.n===WEAPONS[Gst.p.wpn].heavy.n&&Gst.nums.some(n=>n.txt==='42')&&Gst.comboShow===3&&Gst.intro===0,info:'x='+Gst.p.x.toFixed(0)};});
  T('ออนไลน์: ภาพสถานะของยก/แมตช์เก่า (rid ไม่ตรง) ถูกทิ้ง',()=>{const[a,b]=mkPair();a.role='host';b.role='guest';a.rid=3;b.rid=4;G.vsNet='host';setupVS([0,0],1);const s=JSON.parse(JSON.stringify(a.snap()));G.vsNet='guest';setupVS([0,0],1);b.applySnap(s);return{ok:!b.pend};});
  BT=sv.BT;G.mode=sv.mode;G.vsNet=sv.vsNet;wrap.classList.remove('battle','vs');for(const k of ['NetL','NetR','NetU','NetD','NetJ','NetK','NetX'])delete keys[k];}
  /* ---- ลานประลอง ---- */
  T('ลานประลอง: ค่าพลังมาตรฐาน ไม่ขึ้นกับเลเวล/อุปกรณ์ของผู้เล่นจริง',()=>{const l=G.level,a=G.alloc.str;const A=Stats.arena();G.level=50;G.alloc.str=99;const B=Stats.arena();G.level=l;G.alloc.str=a;
      return{ok:A.ap===B.ap&&A.maxHP===CONFIG.arena.hp&&A.maxHP===B.maxHP&&A.level===CONFIG.arena.level&&A.passives.size===0};});
  T('ลานประลอง: มีประตู/ลานกลางเมือง และปุ่มของ P1/P2 ไม่ซ้ำกัน',()=>{const t=makeTown(),o=t.props.find(p=>p.k==='arena');const k1=Object.values(VSK1).flat(),k2=Object.values(VSKN2).flat();
      return{ok:!!o&&o.inter==='arena'&&Math.abs(o.x-384)<=16&&Math.abs(o.y-288)<=16&&k1.every(k=>!k2.includes(k))&&[':'].includes(t.grid[Math.floor(o.y/16)][Math.floor(o.x/16)])&&k1.every(k=>!k2.includes(k))};});
  /* ---- ระดับความยาก / ดาร์กโซล ---- */
  {const lockSv=CONFIG.diffLock;CONFIG.diffLock=null;const dsv={diff:G.diff,gold:G.gold,xp:G.xp,level:G.level,points:G.points,bs:G.bloodstain};
  const st=k=>{G.diff=k;return Stats.enemy(FOES.rat,5,false);};
  T('ความยาก: ปกติไม่เปลี่ยนค่าศัตรู / ดาร์กโซล HP และ ATK ตามตาราง',()=>{const n=st('normal'),s=st('souls'),e=st('easy');
      return{ok:Math.abs(s.maxHP/n.maxHP-DIFFICULTY.souls.eHP)<.02&&Math.abs(s.ap/n.ap-DIFFICULTY.souls.eATK)<.05&&e.ap<n.ap,info:`ATK ง่าย ${e.ap} / ปกติ ${n.ap} / โซล ${s.ap}`};});
  T('ความยาก: ทุกระดับมีค่าครบ และไล่จากง่าย→โหด',()=>{const K=['eHP','eATK','eSpd','aiCD','guard','staRegen','xp','gold','death'];const D=DIFFICULTY;
      return{ok:Object.values(D).every(d=>K.every(k=>k in d))&&D.easy.eATK<D.normal.eATK&&D.normal.eATK<D.hard.eATK&&D.hard.eATK<D.souls.eATK&&D.souls.aiCD<D.hard.aiCD};});
  T('ยาก: ตายแล้วเสียทองครึ่งหนึ่ง',()=>{G.diff='hard';G.gold=101;Diff.onDeath('cave',10,10);return{ok:G.gold===51};});
  T('ดาร์กโซล: ตายแล้วทอง+EXP ตกที่จุดตาย, เก็บคืนได้ครั้งเดียว',()=>{G.diff='souls';G.bloodstain=null;G.gold=300;G.xp=40;Diff.onDeath('cave',120,90);
      const dropped=G.gold===0&&G.xp===0&&G.bloodstain&&G.bloodstain.gold===300&&G.bloodstain.xp===40&&G.bloodstain.x===120;
      const r=Diff.recover(),r2=Diff.recover();return{ok:dropped&&r.gold===300&&G.gold===300&&r2===null&&!G.bloodstain};});
  T('ดาร์กโซล: ตายซ้ำก่อนเก็บ = คราบเก่าหายถาวร',()=>{G.diff='souls';G.bloodstain=null;G.gold=500;G.xp=0;Diff.onDeath('cave',1,1);G.gold=20;const msg=Diff.onDeath('lava1',2,2);
      return{ok:G.bloodstain.gold===20&&G.bloodstain.zone==='lava1'&&msg.includes('หายถาวร')};});
  T('ดาร์กโซล: เซฟ/โหลดเก็บความยากและคราบเลือด',()=>{G.diff='souls';G.bloodstain={zone:'cave',x:5,y:6,gold:7,xp:8};const d=JSON.parse(JSON.stringify(Save.data()));return{ok:d.diff==='souls'&&d.bloodstain.gold===7};});
  T('คอมโบอัตโนมัติถูกตัดออกแล้ว',()=>({ok:typeof autoStep==='undefined'&&!document.getElementById('autoBtn')}));
  Object.assign(G,{diff:dsv.diff,gold:dsv.gold,xp:dsv.xp,level:dsv.level,points:dsv.points,bloodstain:dsv.bs});CONFIG.diffLock=lockSv;}
  T('ความยากล็อกที่ดาร์กโซล: เซฟเก่าที่เป็นความยากอื่นถูกบังคับเป็นดาร์กโซล',()=>{G.diff='easy';
    const svLock=CONFIG.diffLock,svGdiff=G.diff;CONFIG.diffLock=null;G.diff='invalid';const dft=Diff.cur()===DIFFICULTY.souls;CONFIG.diffLock=svLock;G.diff=svGdiff;
    const hT=UI.scr_talent(),noUi=!hT.includes('ระดับความยาก')&&(!G.talent||(!UI.scr_menu().includes(DIFFICULTY.souls.n)&&!UI.scr_char().includes('ความยาก')));
    return{ok:CONFIG.diffLock==='souls'&&Diff.cur()===DIFFICULTY.souls&&dft&&noUi,info:`dft=${dft} noUi=${noUi}`};});
  T('bbqy legendary: บอสเลเวล 100 HP 80000 ATK 2700 ท้าได้ และสกิลสุดยอดปลดหลังชนะเท่านั้น',()=>{const d=FOES.duelist;return{ok:d.kind==='rig'&&d.boss===1&&d.challenge===1&&d.base.hp===80000&&d.base.atk===2700&&!SKILLS.bluejudge.talent&&SKILLS.bluejudge.bossOnly===1&&!!LOOK_BY_NAME.DUELIST};});
  /* ===== UNIQUE TALENT SYSTEM ===== */
  {const base=()=>Stats.derive(Object.assign({},BASE_ATTR),{},1,null,new Set()),tal=k=>Stats.derive(Object.assign({},BASE_ATTR),{},1,k,new Set());
  T('TL1) มีพรสวรรค์ 12 แบบ (เพิ่ม Stormborn / Phoenix / Shadowstalker) แต่ละแบบมีพาสซีฟและสกิลเฉพาะตัวแยกกัน',()=>{const ks=Object.keys(TALENTS);return{ok:ks.join()==='piercer,lucky,endurer,undying,hexweaver,archmage,sololeveling,parryman,vampire,stormborn,phoenix,shadowstalker'&&ks.every(k=>TALENT_PASSIVE[k]&&SKILLS[TALENTS[k].skill]&&SKILLS[TALENTS[k].skill].talent===k&&SKILLS[TALENTS[k].skill].tier==='unique'),info:ks.length+' แบบ'};});
  T('TL2) ค่าพาสซีฟคงที่ตามสเปกใหม่ (Piercer/Lucky/Endurer/Archmage) — ไม่มี M.ATK/M.DEF',()=>{const b=base(),P=tal('piercer'),L=tal('lucky'),E=tal('endurer'),A=tal('archmage');
    const ok=P.apen-b.apen===20&&near(P.apenPct-b.apenPct,.25)&&near(L.critRate-b.critRate,.2)&&near(L.critDmg-b.critDmg,.4)&&near(E.dr-b.dr,.15)&&E.def===Math.round(b.def*1.2)&&near(E.statusRes-b.statusRes,.3)&&A.ap===Math.round(b.ap*1.15)&&A.maxMP===Math.round(b.maxMP*1.2)&&near(A.elDmg.fire,.1)&&!A.elDmg.phys&&A.mcritDmg===0;
    return{ok,info:`เจาะ+${P.apen} · คริ+${(L.critRate-b.critRate).toFixed(2)} · DR ${E.dr} · ATK ${b.ap}→${A.ap} · MP ${b.maxMP}→${A.maxMP}`};});
  T('TL3) Hexweaver: โอกาสติด = 100% + 25% − ค่าต้าน และทุก 1% นานขึ้น 0.05 วิ',()=>{const tgt={S:{statusRes:.3},statusRes:{}},hex={S:tal('hexweaver')},nor={S:base()};
    const ch=Status.chance(hex,tgt,'poison'),cn=Status.chance(nor,tgt,'poison');const f=dummy();Status.apply(f,'poison',1,hex);
    return{ok:near(ch,.95)&&near(cn,.7)&&f.st8.poison.t===Math.round(CONFIG.statusDur+25*.05*60)&&TALENT_PASSIVE.hexweaver.statusDurMul===undefined&&CONFIG.statusChanceDur===.05,info:`โอกาส ${ch} vs ปกติ ${cn} · เวลา ${f.st8.poison.t} เฟรม`};});
  T('TL4) Endurer + Iron Wall: ลดดาเมจรวมไม่เกิน 75%',()=>{const f={S0:Object.assign({},tal('endurer'),{dr:.6}),mods:[]};StatSync.addMod(f,{id:'ironwall',stat:'buffDr',op:'add',v:SKILLS.ironwall.buff.dr,ttl:240});
    const r=calcDamage(A(),f.S,{coef:1,type:'phys',el:'phys'});return{ok:near(r.dr,.75)&&SKILLS.ironwall.buff.statusImm===480,info:'DR ที่ใช้จริง '+r.dr};});
  T('TL5) Arcane Burst: 280% พลังเวท, ใช้ MP 20% ของ MP สูงสุด, คูลดาวน์ 16 วิ',()=>{const S=tal('archmage'),s=SKILLS.arcaneburst;return{ok:s.coef===2.8&&s.type==='magic'&&!s.ignoreDef&&Mana.cost('arcaneburst',S)===Math.round(S.maxMP*.2)&&s.cd===16,info:'MP '+Mana.cost('arcaneburst',S)+'/'+S.maxMP};});
  T('TL6) Blood Pact / Toxic Curse ใส่สแตกได้อย่างน้อย 10 (ถูกจำกัดที่ maxStacks), Jackpot แทง 5 ครั้งคริ 100% ไม่สนเกราะ 20%, Undying ฟื้น 2 ครั้ง',()=>({ok:SKILLS.bloodpact.status.bleed>=10&&SKILLS.bloodpact.lifesteal===.15&&SKILLS.toxiccurse.status.poison>=10&&SKILLS.luckyseven.multi===5&&SKILLS.luckyseven.alwaysCrit&&SKILLS.luckyseven.defPen===.2&&TALENT_PASSIVE.undying.revives===2&&CONFIG.maxStacks>=10}));
  T('TL9) คลาสใหม่: Stormborn สายฟ้า+20% คริ+10% · Phoenix ไฟ+20% ฟื้น 1%/วิ ต้านไฟ · Shadowstalker มืด+15% หลบ+10% ไม่สนเกราะ 10%',()=>{const b=base(),S=tal('stormborn'),F=tal('phoenix'),D=tal('shadowstalker');
    const ok=near(S.elDmg.lightning,.2)&&near(S.critRate-b.critRate,.1)&&near(F.elDmg.fire,.2)&&near(F.hotPct,.01)&&near(F.res.fire,.2)&&near(D.elDmg.shadow,.15)&&near(D.evasion-b.evasion,.1)&&near(D.apenPct,.1)
      &&SKILLS.nightreaver.talent==='shadowstalker'&&Skills.move('nightreaver','sword',3).swap===1&&GI[GI_MAP[TALENT_ICO.phoenix]]&&GI[GI_MAP[TALENT_ICO.stormborn]]&&GI[GI_MAP[TALENT_ICO.shadowstalker]];
    return{ok:!!ok};});
  T('TL10) คำอธิบายคลาส/สกิลเฉพาะตัว ไม่มี M.DEF / M.ATK / พลังเวท แล้ว',()=>{const bad=[...Object.entries(TALENTS).map(([k,t])=>[k,t.desc]),...Object.values(TALENTS).map(t=>[t.skill,SKILLS[t.skill].desc])].filter(([k,d])=>/M\.DEF|M\.ATK|พลังเวท|ป้ายเวท/.test(d)).map(x=>x[0]);return{ok:!bad.length,info:bad.join(',')||'ok'};});
  T('TL7) คำนวณซ้ำไม่ทบโบนัสพรสวรรค์',()=>{const a=JSON.stringify(tal('lucky')),b=[...Array(20)].map(()=>JSON.stringify(tal('lucky')));return{ok:b.every(x=>x===a)};});
  T('TL8) พรสวรรค์ถูกบันทึกในข้อมูลตัวละครและผนึกสกิลสายที่เลือกในช่อง 4 อัตโนมัติหลังสร้างตัว',()=>{const d=Save.data();return{ok:d.talent===G.talent&&!!TALENTS[d.talent]&&G.skills.bound===TALENTS[G.talent].skill&&G.skills.slots[3]===TALENTS[G.talent].skill,info:`${d.talent} -> bound=${G.skills.bound}`};});}
  /* ===== ค่ารองจากค่าพลัง (ทุกๆ 10 หน่วย) ===== */
  T('AT1) ไม่มีต้านคริ/ความเร็ว · AGI ทุก 10 = หลบ 1% + DEF 3 · STR ทุก 10 = ต้านสถานะ 1%',()=>{const d=a=>Stats.derive(Object.assign({str:10,agi:10,int:10,vit:10,luk:10},a),{},1,null,new Set());
    const b=d({}),g=d({agi:50}),s2=d({str:40}),def=d({}),hi=Stats.derive(Object.assign({},BASE_ATTR),{def:90},1,null,new Set());
    return{ok:near(b.evasion,.01)&&b.def===13&&near(g.evasion,.05)&&g.def===25&&near(s2.statusRes,.04)&&hi.pcritRes===0&&hi.spd===1&&g.spd===1,info:`AGI10: หลบ ${b.evasion} DEF ${b.def} · AGI50: หลบ ${g.evasion} DEF ${g.def} · DEF ${hi.def} → ต้านคริ ${hi.pcritRes}`};});
  T('AT2) หลบหลีกไม่เกิน 70% และค่าพลังไม่เกิน 99',()=>{const S=Stats.derive(Object.assign({},BASE_ATTR,{agi:99}),{evasion:.9},1,null,new Set());const pts=G.points,al=Object.assign({},G.alloc);G.points=500;G.alloc.str=CONFIG.attrMax-BASE_ATTR.str;const r=Prog.allocate('str');G.points=pts;Object.assign(G.alloc,al);
    return{ok:S.evasion===.7&&r===false&&CONFIG.attrMax===99,info:'หลบ '+S.evasion};});
  /* ===== ศัตรู: ค่าพลังแบบผู้เล่น + สกิล ===== */
  T('EN1) ศัตรูคำนวณค่ารองจากค่าพลังด้วยสูตรเดียวกับผู้เล่น',()=>{const save=Diff.cur;Diff.cur=()=>DIFFICULTY.normal;const d=FOES.duelist,E=Stats.enemy(d,10,false),P=Stats.derive(Object.assign({},BASE_ATTR,d.attr),{},10,null,new Set());Diff.cur=save;
    return{ok:E.evasion===P.evasion&&E.critDmg===P.critDmg&&E.statusRes===P.statusRes&&E.agi===d.attr.agi&&E.pcritRes===0,info:`หลบ ${E.evasion} คริ ${E.critRate} ต้านสถานะ ${E.statusRes} DEF ${E.def}`};});
  T('EN2) สกิลมีค่าผู้ใช้ (all/player/enemy) และบังคับใช้ทั้งสองฝั่ง',()=>{const ok1=Object.values(SKILLS).every(s=>['all','player','enemy'].includes(s.user));const tal=Object.values(TALENTS).every(t=>SKILLS[t.skill].user==='player');
    const sv=SKILLS.orb.user;SKILLS.orb.user='enemy';const learned=G.skills.learned.has('orb');G.skills.learned.delete('orb');const r=Skills.learn('orb');SKILLS.orb.user=sv;if(learned)G.skills.learned.add('orb');
    const foeOk=Object.values(FOES).every(f=>(f.skills||[]).every(id=>SKILLS[id]));return{ok:ok1&&tal&&!r.ok&&foeOk&&!skillUsable('luckyseven','enemy'),info:r.err};});
  T('TL9) Armor Breaker: ไม่สน DEF · ทะลุการป้องกัน · ติดดีบัฟ Armor Breaker',()=>{const s=SKILLS.piercestrike,m=Skills.move('piercestrike','sword',2);return{ok:s.ignoreDef&&s.unblockable&&m.unblockable&&m.armorBreak&&m.armorBreak.n==='Armor Breaker'&&m.armorBreak.def===.6};});
  T('BC1) ไม่มีต้านคริ: บอสและมอนทุกตัว pcritRes = 0 · คริขึ้นกับอัตราคริของผู้ตีอย่างเดียว',()=>{const all=Object.keys(FOES).every(k=>Stats.enemy(FOES[k],5,false).pcritRes===0);let c=0;for(let j=0;j<200;j++)if(calcDamage({ap:100,critRate:.75,critDmg:2,level:1},{def:0,pcritRes:.9,res:{}},{coef:1,el:'phys'}).crit)c++;return{ok:all&&c>100,info:'crit '+c+'/200'};});
  T('SD1) ระยะเวลาสถานะต่อสกิล (statusDur วิ) แทนค่าเริ่มต้นได้',()=>{const f=dummy();Status.apply(f,'burn',1,null,6);const g=dummy();Status.apply(g,'burn',1,null);return{ok:f.st8.burn.t===360&&g.st8.burn.t===CONFIG.statusDur,info:f.st8.burn.t+' vs '+g.st8.burn.t};});
  /* ===== 15. TESTING — AUTO STATUS UPDATE SYSTEM ===== */
  {const ssSave={mods:StatSync.mods.slice(),eq:Object.assign({},G.eq),bag:G.bag,timer:StatSync.timer,alloc:Object.assign({},G.alloc),level:G.level,points:G.points};
  const keyStats=S=>JSON.stringify(['ap','mpow','critRate','critDmg','apen','apenPct','def','mdef','pcritRes','mcritRes','dr','maxHP','maxMP','maxSTA','str','agi','int','vit','luk'].map(k=>S[k]));
  StatSync.mods.length=0;StatSync.invalidate('test');
  T('ST1) อัปเดตอัตโนมัติทุก 5 วินาที: ตั้ง 5000ms และ tick() ทำงาน',()=>{const t0=StatSync.ticks;StatSync.tick();return{ok:StatSync.INTERVAL===5000&&StatSync.ticks===t0+1&&!!StatSync.timer,info:'interval '+StatSync.INTERVAL+'ms · timer '+(StatSync.timer?'on':'off')};});
  T('ST2) เปลี่ยนอุปกรณ์ → ค่าสถานะอัปเดตทันที (ไม่ต้องรอรอบ 5 วิ)',()=>{const before=StatSync.get().def,t0=StatSync.ticks;const it=Inv.addItem(newItem('h_iron','normal',1));Equip.equip(it,'helmet');const on=StatSync.get().def;Equip.unequip('helmet');const off=StatSync.get().def;G.bag.splice(G.bag.indexOf(it),1);
    return{ok:on>before&&off===before&&StatSync.ticks===t0,info:`DEF ${before} → ${on} → ${off}`};});
  T('ST3) บัฟเพิ่มค่าสถานะที่เกี่ยวข้องถูกต้อง',()=>{const b=StatSync.get().ap;StatSync.addMod('P',{id:'t_buff',n:'ทดสอบ',stat:'ap',op:'add',v:50,ttl:600});const a=StatSync.get().ap;StatSync.removeMod('P','t_buff');return{ok:a===b+50&&StatSync.get().ap===b,info:`ATK ${b} → ${a} → ${StatSync.get().ap}`};});
  T('ST4) ดีบัฟหมดเวลา → ค่ากลับเป็นค่าที่ถูกต้อง',()=>{const f={S0:Object.assign({},StatSync.get()),mods:[]};StatSync.recalc(f);const b=f.S.mpow;
    StatSync.addMod(f,{id:'t_weak',kind:'debuff',stat:'mpow',op:'mul',v:.5,ttl:30});const mid=f.S.mpow;for(let i=0;i<30;i++)StatSync.frame(f);
    return{ok:mid===Math.round(b*.5)&&f.S.mpow===b&&f.mods.length===0,info:`พลังเวท ${b} → ${mid} → ${f.S.mpow}`};});
  T('ST5) เกราะแตก (Armor Break) หมดเวลา → DEF กลับเป็นค่าเดิม',()=>{const f={S0:Object.assign({},StatSync.get(),{def:50}),mods:[]};StatSync.recalc(f);const b=f.S.def,ab=SKILLS.guardbreak.armorBreak;
    StatSync.addMod(f,{id:'armorbreak',kind:'debuff',stat:'def',op:'mul',v:ab.def,ttl:ab.t});const mid=f.S.def;for(let i=0;i<ab.t;i++)StatSync.frame(f);
    return{ok:b===50&&mid===30&&f.S.def===50,info:`DEF ${b} → ${mid} (เกราะแตก) → ${f.S.def}`};});
  T('ST6) คำนวณซ้ำหลายรอบ/ใส่บัฟซ้ำ ค่าไม่ทบเพิ่ม',()=>{StatSync.addMod('P',{id:'t_stack',stat:'def',op:'add',v:10});StatSync.addMod('P',{id:'t_stack',stat:'def',op:'add',v:10});const one=keyStats(StatSync.get());
    for(let i=0;i<50;i++){StatSync.tick();StatSync.recalc('P','test');StatSync.invalidate('test');}const many=keyStats(StatSync.get());const n=StatSync.mods.filter(m=>m.id==='t_stack').length;StatSync.removeMod('P','t_stack');
    const f={S0:Object.assign({},StatSync.get()),mods:[]};StatSync.addMod(f,{id:'x',stat:'ap',op:'mul',v:2});for(let i=0;i<50;i++)StatSync.recalc(f);
    return{ok:one===many&&n===1&&f.S.ap===Math.round(f.S0.ap*2),info:`บัฟ id ซ้ำ ${n} ชิ้น · ATK คูณ 2 หลัง 50 รอบ = ${f.S.ap}`};});
  T('ST7) UI และระบบต่อสู้ใช้ค่าสถานะชุดเดียวกัน',()=>{const S=StatSync.get(),f=mkF({S});const html=UI.scr_char();
    return{ok:f.S0===S&&keyStats(f.S)===keyStats(S)&&html.includes(`<b>${S.def} <small`)&&html.includes(`<b>${S.maxHP}</b>`),info:'DEF '+S.def+' · HP '+S.maxHP};});
  T('ST8) ไม่สร้างตัวจับเวลาซ้ำ และหยุดได้เมื่อตัวละครถูกทำลาย',()=>{const id=StatSync.timer;const again=StatSync.start();const same=StatSync.timer===id;StatSync.stop();const stopped=StatSync.timer===null;StatSync.start();
    return{ok:again===false&&same&&stopped&&!!StatSync.timer,info:'start ซ้ำ → '+again};});
  T('ST9) ประสิทธิภาพ: ไม่คำนวณใหม่เมื่อไม่มีอะไรเปลี่ยน',()=>{StatSync.get();const r0=StatSync.recalcs,t=performance.now();for(let i=0;i<20000;i++)StatSync.get();for(let i=0;i<20;i++)StatSync.tick();const ms=performance.now()-t;
    return{ok:StatSync.recalcs===r0&&ms<50,info:`get() 20,000 ครั้ง + tick 20 รอบ = ${ms.toFixed(1)}ms · คำนวณใหม่ ${StatSync.recalcs-r0} ครั้ง`};});
  StatSync.mods.length=0;ssSave.mods.forEach(m=>StatSync.mods.push(m));Object.assign(G.eq,ssSave.eq);G.bag=ssSave.bag;StatSync.invalidate('test-end');}

  // ===== v0.2.0: ดันกว้าง · กับดัก · มอนซ่อน · ขวดยา · บอสเกิดใหม่ · อาวุธบนหลังในเมือง =====
  {const z0=Z,px0=P.x,py0=P.y,hp0=G.hp,mode0=G.mode,cd0=G.flags.bossCD,pf0=G.pendingFoe,rng0=RNG;RNG=saveRNG;   // ใช้สุ่มจริง (เทสก่อนหน้าอาจล็อกค่าสุ่มไว้)
  try{
  T('V2-1) ดันเจียนกว้างขึ้น: 52 ช่อง (เดิม 30) บันไดอยู่ขวาสุด',()=>{const z=makeDungeon(1,'stone'),st=z.props.find(o=>o.k==='stairs');return{ok:z.grid[0].length===52&&st&&st.x>48*16,info:`กว้าง ${z.grid[0].length} ช่อง · บันได x=${st&&st.x}`};});
  T('V2-2) กับดักไม่อยู่ใกล้ประตู/บันได และหลุมไม่อยู่บนทางเดินหลัก',()=>{let bad=0,n=0;for(let i=0;i<20;i++){const z=makeDungeon(1+(i%2),['stone','ice','lava','tower'][i%4]);for(const t of z.traps){n++;const x=t.tx*16+8,y=t.ty*16+8;
      if(z.props.some(o=>o.inter&&Math.hypot(o.x-x,o.y-y)<TRAP.near))bad++;if(t.type==='pit'&&(t.ty===8||t.ty===9))bad++;if(z.grid[t.ty][t.tx]!=='.')bad++;}}return{ok:bad===0&&n>40,info:`กับดัก ${n} จุดใน 20 ด่าน · ผิดกติกา ${bad}`};});
  T('V2-3) มอนทั่วไปซ่อนอยู่ ไม่อยู่ใกล้ประตูหรือจุดเกิด · บอส/ตัวละครเนื้อเรื่องไม่ซ่อน',()=>{let bad=0,hid=0;for(let i=0;i<10;i++){loadZone(makeDungeon(1,['stone','ice','lava','tower'][i%4]));
      for(const e of Z.foes){const d=FOES[e.kind];if(d.kind==='mon'&&!d.boss&&!d.miniboss){if(!e.hidden)bad++;hid++;if(Math.hypot(e.x-Z.spawn.x,e.y-Z.spawn.y)<TRAP.near*1.3)bad++;
        if(Z.props.some(o=>(o.k==='exitdoor'||o.k==='stairs')&&Math.hypot(o.x-e.x,o.y-e.y)<TRAP.near))bad++;}}}
    loadZone(makeCave());const kage=Z.foes.find(e=>e.kind==='kage');return{ok:bad===0&&hid>10&&kage&&!kage.hidden,info:`ซ่อน ${hid} ตัว · ผิด ${bad} · คาเงะแสดงอยู่ ${!!kage&&!kage.hidden}`};});
  T('V2-4) เดินเข้าจุดที่มอนซ่อน = เข้าไฟต์ (แบบ RPG Maker)',()=>{loadZone(makeDungeon(1,'stone'));const e=Z.foes.find(f=>f.hidden&&f.alive);G.mode='explore';e.cool=0;P.x=e.x;P.y=e.y;G.pendingFoe=null;
    const blk=blocked;updExplore();return{ok:G.mode==='trans'&&G.pendingFoe===e,info:'mode='+G.mode};});
  T('V2-5) กับดักหนามลด HP 10% แต่ไม่ทำให้ตาย',()=>{loadZone(makeDungeon(1,'stone'));const S=StatSync.get();Z.traps=[{tx:Math.floor(P.x/16),ty:Math.floor((P.y-2)/16),type:'spike',seen:0,cd:0}];
    G.hp=S.maxHP;checkTraps();const a=G.hp;G.hp=3;Z.traps[0].cd=0;checkTraps();return{ok:a===S.maxHP-Math.round(S.maxHP*TRAP.spikeDmg)&&G.hp===1&&Z.traps[0].seen===1,info:`HP ${S.maxHP} → ${a} · ถ้าเหลือ 3 → ${G.hp}`};});
  T('V2-6) ตกหลุมชั้น 1 → ร่วงลงชั้น 2',()=>{loadZone(makeDungeon(1,'stone'));Z.traps=[{tx:Math.floor(P.x/16),ty:Math.floor((P.y-2)/16),type:'pit',seen:0,cd:0}];checkTraps();return{ok:Z.floor===2&&Z.id==='stone2',info:'อยู่ที่ '+Z.id};});
  T('V2-7) บอสเกิดใหม่ตามเวลา: ระหว่างรอห้องว่างและประตูเปิด · หมดเวลาแล้วบอสกลับมา',()=>{G.flags.bossCD={};setBossCD('golem');const r1=makeBossRoom('golem');G.flags.bossCD.golem=Date.now()-1;const r2=makeBossRoom('golem');
    return{ok:r1.foes.length===0&&r1.props.every(p=>!p.locked)&&r1.bossWait==='golem'&&r2.foes.length===1&&fmtLeft(BOSS_RESPAWN.min*60000)==='05:00',info:`รอ: มอน ${r1.foes.length} · หมดเวลา: มอน ${r2.foes.length}`};});
  T('V2-8) ในเมืองอาวุธสะพายหลัง (ใช้ตัวแปรแยก ไม่กระทบตอนสู้)',()=>{const K={weapon:'sword',hair:'#000'},k=sheathed(K);return{ok:k.sheathe===1&&!K.sheathe&&sheathed(K)===k,info:'sheathe='+k.sheathe};});
  T('V2-9) ขวดยา 3 ครั้งต่อการต่อสู้: ฟื้น 30% HP ครั้งที่ 4 ใช้ไม่ได้',()=>{loadZone(makeDungeon(1,'stone'));const e=mkFoe('rat',{x:P.x+40,y:P.y});Z.foes.push(e);setupBattle(e);G.mode='battle';BT.intro=0;const p=BT.p,mx=p.S.maxHP;
    const drink=()=>{p.hp=mx*.2;p.state='idle';p.drinkT=0;const h0=p.hp,k=BT.flask;pressed.KeyQ=true;keys.KeyQ=true;try{control(p,BT.e);}finally{keys.KeyQ=false;pressed.KeyQ=false;}for(let i=0;i<FLASK.frames+2;i++){if(p.drinkT>0){p.drinkT--;p.hp=Math.min(mx,p.hp+p.drinkH);}}return[k,BT.flask,Math.round(p.hp-h0)];};
    const r=[drink(),drink(),drink(),drink()];const ok=BT.flask===0&&r[0][2]===Math.round(mx*FLASK.heal)&&r[3][2]===0&&r[0][0]===3;BT=null;G.mode='explore';return{ok,info:r.map(x=>x.join('→')).join(' | ')};});
  // ===== v0.2.1 =====
  T('V21-1) ถ้ำชีสมีทางออกเดียว',()=>{const z=makeCave(),ex=z.props.filter(o=>o.inter==='town');return{ok:ex.length===1,info:'ทางออก '+ex.length+' จุด'};});
  T('V21-2) ประตูเหมืองลาวาล็อกจนกว่าจะมีกุญแจจากคาเงะ',()=>{const f0=Object.assign({},G.flags),k0=G.mats.key_lava||0;G.flags.kageDown=1;G.flags.keyEra=1;G.mats.key_lava=0;const a=hasLavaKey();G.mats.key_lava=1;const b=hasLavaKey();
    G.flags={kageDown:1};G.mats.key_lava=0;const old=hasLavaKey();G.flags=f0;G.mats.key_lava=k0;return{ok:!a&&b&&old,info:`ไม่มีกุญแจ=${a} · มีกุญแจ=${b} · เซฟเก่าที่ชนะแล้ว=${old}`};});
  T('V21-3) คาเงะดรอปแค่กุญแจ และกุญแจไม่หายจากพื้น',()=>{const r=LootManager.generate({tableId:'kage',cls:'miniboss',level:6});const z={ground:[]};const gi=LootManager.spawn(z,0,0,r);
    return{ok:r.drops.length===1&&r.drops[0].mat==='key_lava'&&gi[0].expire===Infinity,info:r.drops.map(d=>d.mat||d.kind).join(',')};});
  T('V21-4) คาเงะปรับสมดุลใหม่ให้ท้าทาย (HP 520 ATK 80)',()=>({ok:FOES.kage.base.hp===520&&FOES.kage.base.atk===80,info:`HP ${FOES.kage.base.hp} ATK ${FOES.kage.base.atk}`}));
  T('V21-5) ยามานาใช้ได้ 3 ครั้งต่อไฟต์',()=>{loadZone(makeDungeon(1,'stone'));const e=mkFoe('rat',{x:P.x+40,y:P.y});Z.foes.push(e);setupBattle(e);G.mode='battle';BT.intro=0;const p=BT.p,m0=G.mats.mp_s||0;G.mats.mp_s=9;G.potCD=0;
    const used=[];for(let i=0;i<4;i++){p.mp=0;G.potCD=0;p.state='idle';pressed.KeyR=true;keys.KeyR=true;try{control(p,BT.e);}finally{pressed.KeyR=false;keys.KeyR=false;}used.push(p.mp>0?1:0);}
    const left=BT.mana;BT=null;G.mode='explore';G.mats.mp_s=m0;return{ok:used.join('')==='1110'&&left===0,info:'ดื่มสำเร็จ '+used.join('')};});
  T('V21-6) ชุดละเอียดใช้กับผู้เล่นเท่านั้น (NPC ไม่โดน) และไม่มีหน้าสเปกแล้ว',()=>{const K=Equip.look(),N=palLook(PAL.smith||Object.values(PAL)[0],'smith');
    return{ok:K.outfit===1&&!!K.pauldronR&&!N.outfit&&!UI.scr_spec&&!document.getElementById('specCv'),info:'ชุด '+K.specArmorId};});
  T('V22-1) ปุ่มควบคุมผูกใหม่ได้ และสลับกับปุ่มเดิมในกลุ่มเดียวกัน',()=>{const old=KB.flask,oldM=KB.mana;
    try{kbSet('flask','KeyX');const a=KB.flask==='KeyX';kbSet('mana','KeyX');const b=KB.mana==='KeyX'&&KB.flask===oldM;
      return{ok:a&&b&&kb('left').includes('ArrowLeft'),info:'flask='+KB.flask+' mana='+KB.mana};}
    finally{kbReset();}});
  T('V22-2) ปุ่มระบบ (Esc/Tab/Enter) ผูกไม่ได้ และค่าเริ่มต้นคืนได้',()=>{try{const before=KB.flee;const ok1=kbSet('flee','Escape');
      kbReset();return{ok:ok1===false&&before==='KeyF'&&KB.flee==='KeyF',info:'flee='+KB.flee};}finally{kbReset();}});
  T('V22-3) ตัวจับเวลาฟื้นศัตรูคงอยู่หลังบันทึก/โหลด (ไม่ค้างตาย)',()=>{const cv=CAVE;const r=cv.foes.find(f=>f.respawnable);
    const sv=[r.alive,r.respawn];try{r.alive=false;r.respawn=600;const d=World.serialize();const idx=cv.foes.indexOf(r);
      World.restore(JSON.parse(JSON.stringify(d)));const r2=CAVE.foes[idx];
      const kept=r2.alive===false&&r2.respawn===600;
      // บันทึกรุ่นเก่า (ไม่มี respawn): ศัตรูที่ตายแล้วต้องได้เวลาฟื้นคืนเต็ม ไม่ค้างตลอดไป
      const old=JSON.parse(JSON.stringify(d));old.foes[idx]={alive:false,elite:false};World.restore(old);
      const legacy=CAVE.foes[idx].respawn===CONFIG.respawnFrames;
      return{ok:kept&&legacy,info:'kept='+kept+' legacy='+legacy};}
    finally{r.alive=sv[0];r.respawn=sv[1];}});
  T('WM-1) แผนที่โลกเกาะคอลลาวาร์รี: 6 จุดแลนด์มาร์ก ครอบคลุมครบ 15 โซน มีหมุดผู้เล่น เครื่องหมายเควสต์ และหน้าต่างชั้นย่อย',()=>{
    const fids=WORLD_LANDMARKS.flatMap(l=>l.floors.map(f=>f.id)),allZones=Object.keys(ZONE_INFO);
    UI.mapSel=null;const h0=UI.scr_map();
    UI.mapSel='lava';const h1=UI.scr_map();UI.mapSel=null;
    const q=mapQuestInfo();
    return{ok:WORLD_LANDMARKS.length===6&&allZones.every(z=>fids.includes(z))&&h0.includes('wm-heropin')&&h0.includes('wm-quest')&&!h0.includes('wm-drawer')&&h1.includes('wm-drawer')&&h1.includes('ราชันย์ลาวา')&&!!q,
      info:`6 จุด · ${fids.length}/${allZones.length} โซน`};});
  T('V25-1) อารีนา: พรสวรรค์ฟื้นชีพเป็นของนักสู้แต่ละคน · ยามานาไม่กินของ · สถานะส่งค่า MP/ยา',()=>{const g0=G.talent,m0=G.mats.mp_s,vn=G.vsNet;
    try{G.talent='undying';G.vsNet=null;G.mats.mp_s=2;setupVS([0,0],1);const b=BT,p=b.p,e=b.e;BT.intro=0;
      p.hp=3;dealDamage(e,p,50,'#fff');const a=(p.reviveN||0)===1;
      e.talent=null;e.hp=3;dealDamage(p,e,50,'#fff');const c=e.hp===0;
      BT.result=null;p.hp=300;p.mp=10;p.state='idle';p.mana=3;pressed.KeyR=true;keys.KeyR=true;try{control(p,e);}finally{pressed.KeyR=false;keys.KeyR=false;}
      const d=p.mana===2&&p.mp>10&&G.mats.mp_s===2;G.vsNet='host';const s=Net.snap();const f=s.p.mp===Math.round(p.mp)&&s.p.fk===3&&s.p.mn===2;
      BT=null;G.mode='explore';return{ok:a&&c&&d&&f,info:`revive=${a} noTalent=${c} mana=${d} snap=${f}`};}
    finally{G.talent=g0;G.mats.mp_s=m0;G.vsNet=vn;if(BT&&BT.vs){BT=null;G.mode='explore';}}});
  T('V25-2) ตีบวก +15 (+30% ค่าฐาน/ขั้น · พลาดไม่ลด · +11 ขึ้นไปใช้หินเสริมพลัง) · เพดานตามแรงค์ (+5/+10/+15) · วิวัฒน์ (ถึงเพดาน, หินตามระดับ, ตีบวกคงเดิม) · สว่านรูน · ร้านค้าพิเศษ',()=>{const gr=G.guildRank;
    const it=newItem('w_sword','normal',5),gm=JSON.stringify(G.mats),gg=G.gold,gs=JSON.stringify(G.shopCD||{}),rng=RNG;
    try{G.guildRank='F';const t5=newItem('w_sword','normal',5);G.mats.ore=999;G.gold=1e7;RNG=()=>0;for(let i=0;i<8;i++)Equip.enhance(t5);const capF=t5.enh===5;G.guildRank='S';
      G.mats.ore=999;G.mats.exprock=10;G.mats.evostone=3;G.mats.rune_atk=1;G.mats.runedrill=3;G.gold=1e7;G.shopCD={};
      const a0=itemStats(it).watk,t2=newItem('w_sword','normal',5);t2.enh=6;RNG=()=>0.999;const fail=Equip.enhance(t2),noDrop=!fail.ok&&t2.enh===6;   // บังคับพลาด: ขั้นไม่ลด
      RNG=()=>0;for(let i=0;i<15;i++)Equip.enhance(it);const a15=itemStats(it).watk,usedRock=G.mats.exprock===5;
      const capOk=it.enh===15&&!Equip.enhance(it).ok&&Math.abs(a15/a0-5.5)<.1;
      const n0=it.affixes.length,evo=Equip.evolve(it),evoOk=evo.ok&&it.rar==='rare'&&it.enh===15&&it.affixes.length===n0+1&&G.mats.evostone===2;
      const d1=Gear.drill(it),d2=Gear.drill(it),d3=Gear.drill(it),drillOk=d1.ok&&d2.ok&&!d3.ok&&it.sockets.length===2;
      const sockRes=Equip.socketRune(it,0,'rune_atk'),st=itemStats(it),unsockRes=Equip.unsocketRune(it,0);
      const shopRes=SpecialShop.buy('rerollstone');
      return{ok:capF&&noDrop&&capOk&&usedRock&&evoOk&&drillOk&&sockRes.ok&&st.atk>0&&unsockRes.ok&&G.mats.rune_atk===1&&shopRes.ok,
        info:`capF=${capF} noDrop=${noDrop} +15=${capOk} (${a0}→${a15}) rock=${usedRock} evo=${evoOk} drill=${drillOk} shop=${shopRes.ok}`};
    }finally{RNG=rng;G.mats=JSON.parse(gm);G.gold=gg;G.shopCD=JSON.parse(gs);G.guildRank=gr;}});
  T('V25-5) ไม่มีเลเวลไอเทม/เลเวลสวมใส่: ใส่ได้ทุกเลเวล · ค่าตัวเลขของค่าความสามารถโตตามระดับ × ตีบวก',()=>{const lv=G.level;G.level=1;const it=newItem('w_sword','rare',99),ok1=!('ilvl' in it)&&!('req' in it)&&Equip.canEquip(it);
    it.affixes=[{k:'atkFlat',t:5,lock:false}];const v0=Gear.val(it.affixes[0],it);it.enh=10;const v10=Gear.val(it.affixes[0],it);G.level=lv;
    return{ok:ok1&&v0===Math.round(28*1.25)&&v10===Math.round(28*1.25*4),info:`${v0}→${v10}`};});
  T('V25-3) เซฟเก่า (v2) โหลดแล้วล้างอุปกรณ์ · เลเวลเหลือ 5 · +5,000 ทอง · วัตถุดิบยังอยู่',()=>{const sv=JSON.parse(JSON.stringify(Save.data()));
    try{const old=JSON.parse(JSON.stringify(sv));old.v=2;old.level=30;old.gold=100;old.mats={wood:7};old.bag=[{uid:999,base:'w_sword',rar:'rare',ilvl:20,req:20,lv:30,exp:5,enh:4,affixes:[{k:'atk',v:12}],sockets:[null,null]}];old.eq=Object.assign({},old.eq,{weapon:999});
      Save.apply(old);const ok=G.bag.length===0&&!G.eq.weapon&&G.level===5&&G.gold===5100&&G.mats.wood===7&&G.points===(5-1)*CONFIG.levelPoints&&G.flags.gearWipeNotice===1&&'belt' in G.eq;
      return{ok,info:`bag=${G.bag.length} lv=${G.level} gold=${G.gold}`};}finally{Save.apply(sv);delete G.flags.gearWipeNotice;}});
  T('V25-4) คราฟต์สุ่มระดับ: ไม่ต่ำกว่าระดับของสูตร ไม่เกินเพดานแรงค์ (C = มหากาพย์)',()=>{const gr=G.guildRank;G.guildRank='C';const rs=new Set(),r=RECIPES.find(x=>x.id==='sword'),rr=RECIPES.find(x=>x.id==='flame');let lowOk=true;
    for(let i=0;i<400;i++){rs.add(Craft.rollRar(r));if(RARS.indexOf(Craft.rollRar(rr))<RARS.indexOf(rr.rar))lowOk=false;}
    G.guildRank=gr;return{ok:rs.has('normal')&&rs.has('rare')&&rs.has('epic')&&!rs.has('legendary')&&lowOk,info:[...rs].join('/')};});
  T('RK1) แรงค์กิลด์ 3 ช่วง: F/E/D Lv.1/15/30 (หายาก) · C/B 50/75 (มหากาพย์) · A/S 100/130 (ตำนาน) · คุมคราฟต์/ดรอป/วิวัฒน์ · หอคอยต้อง D · เพดาน Lv.150',()=>{const gr=G.guildRank,gm=JSON.stringify(G.mats),gg=G.gold;
    try{const ids=GUILD_RANKS.map(r=>r.id+r.lvReq+r.maxRar[0]).join(',');G.guildRank='F';const a=newItem('w_sword','epic',5).rar==='rare',sp1=!Guild.canEnterSpire();
      const rr=RECIPES.find(x=>x.id==='gs3'),ck=Craft.check([{id:'ore',q:4},{id:'cloth',q:2},{id:'core',q:1}]),lock=!ck.ok&&/แรงค์/.test(ck.err||'');
      const it=newItem('w_sword','rare',5);it.enh=15;G.mats.evostone=9;G.gold=1e6;const ev=!Equip.evolve(it).ok&&it.rar==='rare';
      G.guildRank='D';const sp2=Guild.canEnterSpire();G.guildRank='C';const b=newItem('w_sword','epic',5).rar==='epic';G.guildRank='A';const c=newItem('w_sword','god',5).rar==='legendary';
      return{ok:ids==='F1r,E15r,D30r,C50e,B75e,A100l,S130l'&&a&&b&&c&&sp1&&sp2&&lock&&ev&&CONFIG.levelCap===150&&!!rr,info:ids+` lock=${lock} evo=${ev}`};
    }finally{G.guildRank=gr;G.mats=JSON.parse(gm);G.gold=gg;}});
  T('SET0) ปิดระบบเซ็ตไว้ก่อน: ไม่มีไอเทมผูกเซ็ต · ไม่มีโบนัสเซ็ต · ดรอปแบบเซ็ตยังได้ของชุดเดิม',()=>({ok:!Object.values(BASES).some(b=>b.set)&&activeSetBonuses([newItem('h_alch','normal',5),newItem('a_alch','normal',5),newItem('g_alch','normal',5),newItem('b_alch','normal',5)]).length===0&&LootManager.resolve({set:'ice'},'rare',5)!==null}));
  T('V26-1) bbqy: สะท้อน 20% · ดาบ bbqy ตำนาน +ทุกสเตต 10 · โอกาสโกลาหล 20% · โกลาหล 4 วิ ติดซ้ำไม่ได้',()=>{
    const it=newItem('w_bbqy','legendary',5),st=itemStats(it),f={st8:{},S:{statusRes:0},statusRes:{}};Status.init(f);
    const r1=Status.apply(f,'chaos',1,null,4),t0=f.st8.chaos.t,r2=Status.apply(f,'chaos',1,null,4);
    const ok=FOES.duelist.reflect===.2&&it.rar==='legendary'&&['str','agi','int','vit','luk'].every(k=>st[k]>=10)&&Math.abs(st.chaosChance-.2)<1e-9&&r1==='ok'&&t0===240&&r2==='capped'&&STN.chaos&&STI.chaos;
    return{ok,info:JSON.stringify(st)};});
  T('V26-2) ชนะ bbqy ได้ดาบ · โกลาหลคูณดาเมจ ×2 ทั้งสองทาง · สะท้อนกลับ 20%',()=>{
    const snap=JSON.stringify(G.bag.length);let ok=false,info='';
    try{G.flags.duelWon=0;encounter(Z.foes.find(f=>f.kind==='duelist')||mkFoe('duelist',{x:100,y:100,w:8,h:6}));}catch(e){info='skip:'+e.message;return{ok:true,info};}
    const b=BT;if(!b||!b.e||b.e.kind!=='duelist'){return{ok:true,info:'no battle'};}
    b.intro=0;const A=b.p,E=b.e,m=WEAPONS[A.wpn].light[0];
    const hp0=A.hp,eh0=E.hp;E.invuln=0;E.state='idle';E.onGround=true;A.hp=A.maxHp;E.hp=E.maxHp;
    applyHit(A,E,m,1);const dealt=E.maxHp-E.hp,refl=A.maxHp-A.hp;
    ok=dealt>0&&refl===Math.max(1,Math.round(dealt*.2));info=`dealt=${dealt} reflect=${refl}`;
    A.hp=A.maxHp;E.hp=E.maxHp;E.invuln=0;E.state='idle';E.st8.chaos={t:240,tk:0};
    applyHit(A,E,m,1);const d2=E.maxHp-E.hp;info+=` chaosDealt=${d2}`;ok=ok&&d2>=dealt*3;
    BT=null;G.mode='explore';return{ok,info};});
  T('V27-1) เลเวลละ 2 แต้ม · เลเวลสูงสุด 200 · XP เลเวลเกิน 30 ชันขึ้น · มอนต่ำกว่ามาก XP ลด · เจาะเวทเดิมรวมเข้าเจาะเกราะ',()=>{
    const A={mpow:100,ap:100,critRate:0,critDmg:1.5},T={def:50,res:{}},h={coef:1,type:'magic',el:'phys'};const S1=Stats.derive(BASE_ATTR,{mpen:20,mpenPct:.5},1,null,new Set()),S0=Stats.derive(BASE_ATTR,{},1,null,new Set());
    const base=calcDamage(A,T,h).dmg,pc=calcDamage(Object.assign({apenPct:S1.apenPct},A),T,h).dmg,fl=calcDamage(Object.assign({apen:S1.apen-S0.apen},A),T,h).dmg;
    const lv0=G.level;G.level=20;const full=Prog.xpScale(20),low=Prog.xpScale(1);G.level=lv0;
    const ok=CONFIG.levelPoints===2&&CONFIG.levelCap===150&&CONFIG.xpNext(31)>Math.round(50*Math.pow(31,1.3))&&CONFIG.xpNext(30)===Math.round(50*Math.pow(30,1.3))&&pc>base&&fl>base&&full===1&&low<.5;
    return{ok,info:`base=${base} pct=${pc} flat=${fl} xpLow=${low.toFixed(2)}`};});
  T('V25-3) ดรอปไม่มีคริสตัลศักดิ์สิทธิ์ (ขายร้านพิเศษ) · อัตราดรอปตำนาน 0.002% เทพ 0.0001% · ร้านรีข้ามเพดานได้ (อารีนาไม่ได้)',()=>{
    const W=LOOT_CONFIG.classes,wOk=['normal','elite','boss'].every(c=>W[c].rar.legendary===0.002&&W[c].rar.god===0.0001);
    let books=0,divine=0,n=0;const bossT=Object.keys(LOOT_TABLES);
    for(let i=0;i<1500;i++){for(const tid of bossT){for(const cls of['normal','elite','boss']){const r=LootManager.generate({tableId:tid,cls,level:20,luk:10});
      for(const d of r.drops){n++;if(d.mat&&d.mat.startsWith('sk_'))books++;if(d.mat==='divine')divine++;}}}}
    const o=REITEM.odds;let shopOk=false,arenaCap=false;
    try{REITEM.odds=[['god',100]];const s=reitemRoll(true),a2=reitemRoll();shopOk=s.rar==='god';arenaCap=a2.rar===rarCap();
      REITEM.odds=[['legendary',100]];shopOk=shopOk&&reitemRoll(true).rar==='legendary';}finally{REITEM.odds=o;}
    const shown=reitemOdds(true).map(x=>x[0]).join(',');const tot=REITEM.odds.reduce((a,b)=>a+b[1],0);
    return{ok:wOk&&n>0&&books>0&&divine===0&&shopOk&&arenaCap&&Math.abs(tot-100)<1e-9&&shown.includes('legendary')&&shown.includes('god'),info:`weights=${wOk} drops=${n} books=${books} divine=${divine} shop=${shopOk} arenaCap=${arenaCap} sum=${tot}`};});
  T('V28-1) ไม่มีสกิล "ปราณ" · กด Space หลุดจากคอมโบศัตรู/ตัดท่าตัวเองได้ · ไม่มีหลุมปิดตาย',()=>{
    const noPran=!Object.entries(SKILLS).some(([k,s])=>/ปราณ|ปราน/.test(s.n+s.desc)||/^rose_|^thunder_(flash|sixfold|swarm|distant|godspeed|domain)$/.test(k))&&!!SKILLS.aether_sovereign;
    const noPit=typeof makePitRoom==='undefined';
    loadZone(makeDungeon(1,'stone'));const e=mkFoe('rat',{x:P.x+40,y:P.y});Z.foes.push(e);setupBattle(e);G.mode='battle';BT.intro=0;const p=BT.p;
    let escHurt=false,escAir=false,escAtk=false;
    const hitSpace=()=>{pressed.Space=true;keys.Space=true;try{control(p,BT.e);}finally{keys.Space=false;pressed.Space=false;}};
    p.state='hurt';p.st=20;p.dashCD=0;p.dashCharges=2;hitSpace();escHurt=p.state==='dash'&&p.invuln>0;
    p.state='airhurt';p.onGround=false;p.y=GY-40;p.vy=2;p.dashCD=0;hitSpace();escAir=p.state==='dash'&&p.vy===0&&p.invuln>0;
    p.onGround=true;p.y=GY;p.state='attack';p.move={kind:'light',dmg:5,s:4,a:6,r:8};p.cmb={c:[COMBOS[0]],prog:1};p.dashCD=0;p.dashCharges=2;hitSpace();escAtk=p.state==='dash'&&!p.move&&!p.cmb;
    BT=null;G.mode='explore';
    return{ok:noPran&&noPit&&escHurt&&escAir&&escAtk,info:`noPran=${noPran} noPit=${noPit} escHurt=${escHurt} escAir=${escAir} escAtk=${escAtk}`};});
  T('V28-2) Dash มี 2 ชาร์จ CD 2 วิ · กด AA/DD กลิ้งหลบระยะใกล้ได้ปกติโดยไม่กินชาร์จ Dash',()=>{
    loadZone(makeDungeon(1,'stone'));const e=mkFoe('rat',{x:P.x+80,y:P.y});Z.foes.push(e);setupBattle(e);G.mode='battle';BT.intro=0;const p=BT.p,gt0=G.t;
    const tapK=k=>{pressed[k]=true;keys[k]=true;try{control(p,BT.e);}finally{keys[k]=false;pressed[k]=false;}};
    p.dashCharges=2;p.dashCD=0;
    tapK('Space');const c1=p.dashCharges,cd1=p.dashCD,spDist=Math.abs(p.dashV)*CONFIG.dashFrames;
    p.state='idle';p.st=0;tapK('Space');const c2=p.dashCharges,cd2=p.dashCD;
    p.state='idle';p.st=0;tapK('Space');const blocked=p.dashCharges===0&&p.state!=='dash';
    p.state='idle';p.st=0;p.dashCD=120;for(let i=0;i<120;i++)control(p,BT.e);const r1=p.dashCharges,rcd=p.dashCD;
    for(let i=0;i<120;i++)control(p,BT.e);const r2=p.dashCharges,rcd2=p.dashCD;
    p.state='idle';p.st=0;p.sta=100;p.dashCharges=2;G.t=100;tapK('KeyD');p.state='idle';G.t=106;tapK('KeyD');
    const ddOk=p.state==='dodge'&&p.dashV>0&&p.invuln>=10&&p.dashCharges===2&&Math.abs(p.dashV)*p.st<spDist;
    p.state='idle';p.st=0;p.dashV=0;G.t=130;tapK('KeyA');p.state='idle';G.t=136;tapK('KeyA');
    const aaOk=p.state==='dodge'&&p.dashV<0&&p.invuln>=10&&p.dashCharges===2&&Math.abs(p.dashV)*p.st<spDist;
    G.t=gt0;BT=null;G.mode='explore';
    return{ok:CONFIG.dashMax===2&&CONFIG.dashCD===120&&c1===1&&cd1===120&&c2===0&&cd2>0&&blocked&&r1===1&&rcd===120&&r2===2&&rcd2===0&&ddOk&&aaOk,
      info:`c=${c1}→${c2},cd=${cd1},blocked=${blocked},regen=${r1}→${r2},dd=${ddOk},aa=${aaOk}`};});
  T('V28-3) มอนสเตอร์/บอสที่พุ่งได้ใช้ Dash (คูลดาวน์ 5 วิ = 300 เฟรม) ยกเว้นหุ่นซ้อมและกลุ่มสไลม์/โกเลม/หมา/หนู',()=>{
    loadZone(makeDungeon(1,'stone'));const m=mkFoe('kage',{x:P.x+160,y:P.y});Z.foes.push(m);setupBattle(m);G.mode='battle';BT.intro=0;
    const e1=BT.e,mDash=enemyDash(e1,e1.dir),mCd=e1.dashCD,mBlocked=!enemyDash(e1,e1.dir);
    for(let i=0;i<300;i++)stepF(e1,BT.p);
    const mReady=e1.dashCD===0&&enemyDash(e1,e1.dir);
    const bk=mkFoe('aether_king',{x:P.x+180,y:P.y});Z.foes.push(bk);setupBattle(bk);BT.intro=0;
    const b1=BT.e,bDash=enemyDash(b1,-b1.dir),bState=b1.state==='backdash',bCd=b1.dashCD;
    const dm=mkFoe('dummy',{x:P.x+100,y:P.y});Z.foes.push(dm);setupBattle(dm);BT.intro=0;
    const dmNoDash=!enemyDash(BT.e,1);
    BT=null;G.mode='explore';
    return{ok:CONFIG.enemyDashCD===300&&mDash&&mCd===300&&mBlocked&&mReady&&bDash&&bState&&bCd===300&&dmNoDash,
      info:`cd=${CONFIG.enemyDashCD},mon=${mDash}/${mBlocked}/${mReady},boss=${bDash}(${bState}),dummyNoDash=${dmNoDash}`};});
  T('V29-1) บอสเมือง 4 ตัวปรับเป็น Lv.35–40 และ bbqy สมกับเป็น Lv.100',()=>{
    const lvs=[FOES.golem.fixedLv,FOES.lavaking.fixedLv,FOES.homunculus.fixedLv,FOES.seraph.fixedLv];
    const E1=Stats.enemy(FOES.golem,35,false),E4=Stats.enemy(FOES.seraph,40,false),QB=Stats.enemy(FOES.duelist,100,false),A7=Stats.enemy(FOES.aether_king,97,false);
    const lvOk=lvs.every(v=>v>=35&&v<=40)&&E1.maxHP>=10000&&E4.maxHP>=15000&&E4.ap>=700;
    const qbOk=QB.level===100&&QB.maxHP>=70000&&QB.ap>A7.ap&&QB.def>=A7.def;
    return{ok:lvOk&&qbOk,info:`lvs=${lvs.join('/')} golemHP=${E1.maxHP} seraphATK=${E4.ap} bbqy=${QB.maxHP}/${QB.ap}`};});
  T('V29-2) ศัตรูคน (rig) ไม่บล็อคหลังเพิ่งตีเราจบ · สุ่มบล็อคแค่ครั้งเดียวต่อท่า · มีคูลดาวน์หลังบล็อค',()=>{
    loadZone(makeDungeon(1,'stone'));const e=mkFoe('kage',{x:P.x+80,y:P.y});Z.foes.push(e);setupBattle(e);G.mode='battle';BT.intro=0;
    const p=BT.p,fe=BT.e,oldR=RNG;
    try{
      RNG=()=>0; // แม้สุ่มได้ 0 เสมอ (ชัวร์ว่าถ้าเปิดให้บล็อคได้จะต้องบล็อค)
      fe.x=p.x+60;fe.dir=-1;p.dir=1;p.state='attack';p.phase='active';p.move=WEAPONS.sword.light[0];p.moveSeq=1;
      // 1) หลังศัตรูออกท่าจบ (endAtk) ต้องห้ามบล็อคทันที
      fe.move=WEAPONS.sword.light[0];fe.state='attack';endAtk(fe);
      aiRig(fe,p);const blockedAfterAtk=['block','cblock'].includes(fe.state);const ng=fe.noGuardT;
      // 2) ในสถานะปกติ สุ่มบล็อคติดแล้วต้องค้างแค่สั้นๆ และติด guardCD ห้ามบล็อคต่อรัวๆ
      fe.noGuardT=0;fe.guardCD=0;fe.guard=0;fe._blkRollSeq=-1;fe.state='idle';fe.S.evasion=0;
      aiRig(fe,p);const blkFirst=fe.state==='block';
      p.state='idle';p.invuln=0;fe.state='block';applyHit(p,fe,WEAPONS.sword.light[0],1);
      const cdSet=fe.guardCD>=180&&fe.guard===0;
      fe.state='idle';fe.st=0;p.state='attack';p.phase='active';p.moveSeq=2;
      aiRig(fe,p);const blockedOnCD=['block','cblock'].includes(fe.state);
      // 3) แม้ไม่โดนตี ถ้ารอดพลาด 1 ท่า (moveSeq ซ้ำ) จะไม่สุ่มซ้ำ 60fps
      fe.guardCD=0;fe.noGuardT=0;fe.guard=0;fe.state='idle';RNG=()=>0.99;aiRig(fe,p);
      RNG=()=>0;aiRig(fe,p);const rerolledSameSwing=['block','cblock'].includes(fe.state);
      return{ok:!blockedAfterAtk&&ng>0&&blkFirst&&cdSet&&!blockedOnCD&&!rerolledSameSwing,
        info:`afterAtk=${blockedAfterAtk} ng=${ng} first=${blkFirst} cd=${fe.guardCD} onCD=${blockedOnCD} reroll=${rerolledSameSwing}`};
    }finally{RNG=oldR;BT=null;G.mode='explore';}});
  T('V30-1) บอสหอคอยชั้น 1-4 มีท่าสุดยอด 1 สกิล / ชั้น 5 มี 2 สกิล และมอน/บอสโครงกระดูกชั้น 3 หอคอยซ้าย',()=>{
    const ultCnt=k=>FOES[k].skills.filter(id=>SKILLS[id]&&SKILLS[id].tier==='ultimate').length;
    const f14=[ultCnt('spire_b1'),ultCnt('spire_b2'),ultCnt('spire_b3'),ultCnt('spire_b4'),ultCnt('aspire_b1'),ultCnt('aspire_b2'),ultCnt('aspire_b3'),ultCnt('aspire_b4')];
    const f5=[ultCnt('spire_b5'),ultCnt('aether_king')];
    const z3=makeSpireFloor(3,'mage');
    const kinds=z3.foes.map(f=>f.kind);
    let renOk=true;
    try{
      loadZone(z3,z3.spawn);drawExplore();
      for(const sk of['spire3_mob','spire3_leader','spire_b3']){
        const fe=mkFoe(sk,{x:P.x+80,y:P.y});setupBattle(fe);BT.intro=0;
        BT.e.state='attack';BT.e.move=WEAPONS[BT.e.wpn].light[0];BT.e.phase='active';
        render();portrait(BT.e,10,10,60,60,true);
      }
    }catch(ex){renOk=false;}
    BT=null;G.mode='explore';
    return{ok:f14.every(c=>c===1)&&f5.every(c=>c===2)&&kinds.includes('spire3_mob')&&kinds.includes('spire3_leader')&&kinds.includes('spire_b3')
      &&FOES.spire_b3.look==='SPIRE_B3'&&SPIRE_B3.custom==='skel_overlord'&&SPIRE3_MOB.custom==='skel_warrior'&&SPIRE3_LEADER.custom==='skel_knight'&&renOk,
      info:`f1-4=${f14.join('/')} f5=${f5.join('/')} b3=${FOES.spire_b3.n} ren=${renOk}`};});
  T('V30-2) ดาบราชาอัศวินแสงระดับตำนาน + สกิล Light Judgement ดาบแสงตกลงปัก + ระบบธาตุและเงาถูกถอดออก',()=>{
    const w=newItem('w_aetherking','legendary',100),ws=itemStats(w);
    const swOk=BASES.w_aetherking.n==='ดาบราชาอัศวินแสง'&&BASES.w_aetherking.fixRar==='legendary'&&w.rar==='legendary'&&ws.watk<2000 /* matk เดิมรวมเข้า ATK แล้ว */&&LOOT_TABLES.aspire_king.guaranteed.some(g=>g.base==='w_aetherking'&&g.rar==='legendary')&&!LOOT_TABLES.aspire_king.guaranteed.some(g=>g.mat==='sk_lightjudge')&&SKILLS.lightjudge.user==='enemy';
    const mv=Skills.move('lightjudge','aethersword',3);
    loadZone(makeDungeon(1,'stone'));const e=mkFoe('kage',{x:P.x+90,y:P.y});Z.foes.push(e);setupBattle(e);G.mode='battle';BT.intro=0;
    const hp0=BT.e.hp;BT.e.invuln=0;BT.e.guardLeft=0;
    BT.p.state='attack';BT.p.phase='startup';BT.p.pt=0;BT.p.move=mv;
    for(let i=0;i<=atkStartup(BT.p,mv)+2;i++){updAtk(BT.p,BT.e);render();}
    const hasSky=(BT.pillars||[]).some(p=>p.skyJudge===1&&p.telegraph<=0&&p.h>0)||VFX.SP.b.some(f=>f._n==='sword-rain');   /* ดาบแสงตกลงปัก (pixelfx) หรือเสาแสงเดิมเมื่อปิดเอฟเฟกต์ */
    const dealt=BT.e.hp<hp0;
    BT=null;G.mode='explore';
    const noElem=Object.keys(ELEM_PROC).length===0&&Object.keys(Stats.player().res).length===0&&!AFFIX.resShadow&&!AFFIX.resFire;
    const tip=itemTip(w),ch=G.talent?UI.scr_char():'',skH=UI.skStats('lightjudge');
    const noUiElem=tip.includes('ธาตุ') /* แสดงธาตุอาวุธในการ์ดไอเทม */&&!ch.includes('เงา')&&!ch.includes('ต้านทาน:')&&skH.includes('ธาตุ') /* หน้าสกิลแสดงธาตุแล้ว */;
    return{ok:swOk&&!!mv&&mv.lightJudge===1&&hasSky&&dealt&&noElem&&noUiElem,info:`sw=${w.rar}/${ws.watk} sky=${hasSky} dealt=${dealt} noElem=${noElem} noUi=${noUiElem}`};});
  T('V31-1) เข้าดันเจี้ยนหอคอยนักแปรธาตุเข้าชั้น 1 ทันที · หอคอยคริสตัล/Aether เข้าโถงเสาแสงทางเข้าก่อนเข้าชั้น 1 และมีประตูออก Overworld ด้านล่าง',()=>{
    const lku=G.flags.lavaKeyUsed,rk0=G.guildRank;
    G.flags.lavaKeyUsed=1;G.guildRank='D';
    interact({type:'towerdungeon',o:{}});const idAlch=Z&&Z.id,alchEx=(Z.props||[]).find(o=>o.k==='exitdoor')?.inter;
    OW.interact('ow_spire');const idMageHall=Z&&Z.id;
    interact({type:'spire_enter_dungeon',o:{tower:'mage'}});const idMage=Z&&Z.id;
    interact({type:'ow_spire_exit',o:{}});const mageExZ=Z&&Z.id;
    OW.interact('ow_spire_s');const idAetherHall=Z&&Z.id;
    interact({type:'spire_enter_dungeon',o:{tower:'aether'}});const idAether=Z&&Z.id;
    G.flags.lavaKeyUsed=lku;G.guildRank=rk0;
    return{ok:idAlch==='tower1'&&alchEx==='town'&&idMageHall==='spire_hall_mage'&&idMage==='spire1'&&mageExZ==='overworld'&&idAetherHall==='spire_hall_aether'&&idAether==='aspire1',
      info:`alch=${idAlch}/${alchEx} mage=${idMageHall}->${idMage}->${mageExZ} aether=${idAetherHall}->${idAether}`};});
  T('V31-2) สไลม์/โกเลม/หมา/หนู Dash ไม่ได้ · ราชันย์ลาวา & เซราฟ Dash อยู่กับที่เพื่อหลุดคอมโบ',()=>{
    loadZone(makeDungeon(1,'stone'));
    const noDashKinds=['rat','lavarat','frostslime','mudslime','mslime','frostwolf','icegolem','rockling','golem'];
    const blockedAll=noDashKinds.every(k=>{const f=mkFoe(k,{x:P.x+140,y:P.y});Z.foes.push(f);setupBattle(f);BT.intro=0;return !enemyDash(BT.e,1);});
    const inPlaceOk=['lavaking','seraph'].every(k=>{
      const f=mkFoe(k,{x:P.x+160,y:P.y});Z.foes.push(f);setupBattle(f);BT.intro=0;
      const e=BT.e;
      e.state='idle';e.think=0;e.dashCD=0;aiMon(e,BT.p);const savedIdle=e.dashCD===0&&e.state!=='dash';
      const x0=e.x;e.vx=0;e.state='hurt';e.st=12;e.dashCD=0;BT.p.combo=2;aiMon(e,BT.p);
      const esc=e.state==='dash'&&e.dashV===0&&e.vx===0&&e.invuln>0&&e.dashCD===300;
      for(let i=0;i<CONFIG.dashFrames;i++)stepF(e,BT.p);
      return savedIdle&&esc&&e.x===x0;
    });
    BT=null;G.mode='explore';
    return{ok:blockedAll&&inPlaceOk,info:`blocked=${blockedAll} inPlace=${inPlaceOk}`};});
  T('V31-3) บอสชั้น 5 (อัศวินวิญญาณเพลิงคราม): โมเดลเกราะดำเพลิงคราม + ดาบเงารูน + ไฟสีฟ้าเพลิงน้ำแข็ง/น้ำแข็ง + blink/bbqybarrier + อัลติใหม่ 2 ท่า',()=>{
    const d=FOES.spire_b5,sk=d.skills||[],ults=sk.filter(id=>SKILLS[id]&&SKILLS[id].tier==='ultimate');
    const lookOk=SPIRE_B5.custom==='blueflame_knight'&&d.wpn==='runeblade'&&!!WEAPONS.runeblade&&ults.length===2&&sk.includes('blink')&&sk.includes('bbqybarrier')&&sk.includes('frostfirecataclysm')&&sk.includes('frostfireoblivion')&&!!SKILLS.spectralcleave&&!!SKILLS.spectralambush&&!!SKILLS.blueflametempest&&!!SKILLS.runicoblivion;
    const z5=makeSpireFloor(5,'mage');
    let renOk=true,bfPillars=false,beamHit=false;
    try{
      loadZone(z5,z5.spawn);drawExplore();
      const fe=z5.foes.find(f=>f.kind==='spire_b5')||mkFoe('spire_b5',{x:P.x+90,y:P.y});
      setupBattle(fe);G.mode='battle';BT.intro=0;
      const rst=()=>{BT.p.hp=BT.p.maxHp=99999;BT.p.state='idle';BT.p.onGround=true;BT.p.y=GY;BT.p.invuln=0;BT.p.guardLeft=0;BT.e.dir=Math.sign(BT.p.x-BT.e.x)||-1;};
      rst();
      const m1=Skills.move('frostfirecataclysm',d.wpn,3);
      BT.e.state='attack';BT.e.phase='active';BT.e.pt=0;BT.e.move=m1;
      for(let i=0;i<12;i++){G.t++;updAtk(BT.e,BT.p);render();}
      bfPillars=(BT.pillars||[]).some(pl=>pl.blueFlame||pl.el==='blueflame');
      rst();const hp0=BT.p.hp,m2=Skills.move('frostfireoblivion',d.wpn,3);
      BT.e.state='attack';BT.e.phase='startup';BT.e.pt=0;BT.e.hitN=0;BT.e.hitCD=0;BT.e.move=m2;
      for(let i=0;i<=atkStartup(BT.e,m2)+6;i++){G.t++;updAtk(BT.e,BT.p);render();}
      beamHit=BT.p.hp<hp0;
      portrait(BT.e,10,10,60,60,true);
    }catch(ex){renOk=false;}
    BT=null;G.mode='explore';
    return{ok:lookOk&&renOk&&bfPillars&&beamHit,info:`look=${lookOk} ren=${renOk} bf=${bfPillars} beam=${beamHit}`};});
  T('V32-1) หอคอยคริสตัลชั้น 1–5: ธีมธาตุ/สถานะ · อัลติใหม่ · blink/bbqybarrier · โมเดลบอสชั้น 3–5 ครบตามสเปก',()=>{
    const b1=FOES.spire_b1,b2=FOES.spire_b2,b3=FOES.spire_b3,b4=FOES.spire_b4,b5=FOES.spire_b5;
    const f1Ok=b1.el==='ice'&&b1.wpn==='frostsword'&&b1.skills.includes('silvabeam')&&b1.skills.includes('frostnova')&&!!(SKILLS.silvabeam.status&&SKILLS.silvabeam.status.freeze);
    const f2Ok=b2.el==='poison'&&b2.allMagic===1&&b2.skills.includes('nyxvenomstorm')&&b2.skills.includes('blink')&&SKILLS.nyxvenomstorm.tier==='ultimate'&&!!(SKILLS.nyxvenomstorm.status&&SKILLS.nyxvenomstorm.status.poison);
    const f3Ok=b3.el==='fire'&&b3.skills.includes('emeraldhellfire')&&b3.skills.includes('necrogreenwave')&&b3.skills.includes('bbqybarrier')&&SPIRE_B3.custom==='skel_overlord'&&SPIRE_B3.trim==='#4aff7a'&&!!(SKILLS.emeraldhellfire.status&&SKILLS.emeraldhellfire.status.burn&&SKILLS.emeraldhellfire.status.poison);
    const f4Ok=b4.el==='arcane'&&b4.allMagic===1&&b4.wpn==='spear'&&SPIRE_B4.sex==='f'&&SPIRE_B4.kweapon==='bloodspear'&&b4.skills.includes('crimsonvalkyrie')&&b4.skills.includes('blink')&&!!(SKILLS.crimsonvalkyrie.status&&SKILLS.crimsonvalkyrie.status.bleed);
    const f5Ok=b5.el==='ice'&&b5.skills.includes('frostfirecataclysm')&&b5.skills.includes('frostfireoblivion')&&b5.skills.includes('blink')&&b5.skills.includes('bbqybarrier');
    let renAll=true;
    try{
      for(let fl=1;fl<=5;fl++){
        const zf=makeSpireFloor(fl,'mage');loadZone(zf,zf.spawn);
        const fe=mkFoe('spire_b'+fl,{x:P.x+85,y:P.y});setupBattle(fe);G.mode='battle';BT.intro=0;
        const ultId=FOES['spire_b'+fl].skills.find(id=>SKILLS[id]&&SKILLS[id].tier==='ultimate');
        BT.e.state='attack';BT.e.phase='active';BT.e.pt=0;BT.e.move=Skills.move(ultId,BT.e.wpn,3);
        for(let i=0;i<6;i++){G.t++;updAtk(BT.e,BT.p);render();}
        portrait(BT.e,10,10,60,60,true);
      }
    }catch(ex){renAll=false;}
    BT=null;G.mode='explore';
    return{ok:f1Ok&&f2Ok&&f3Ok&&f4Ok&&f5Ok&&renAll,info:`f1=${f1Ok} f2=${f2Ok} f3=${f3Ok} f4=${f4Ok} f5=${f5Ok} ren=${renAll}`};});
  T('เมนูตั้งค่าเสียง: มีแถบเลื่อน 4 ช่อง ปรับค่า 0..1 ได้ และเปิดจากหน้า Title แล้วปิดกลับมาที่ Title ได้',()=>{
    const sv={v:SND.vol,s:SND.sfxVol,m:SND.musVol,a:SND.ambVol,gm:G.mode,cur:UI.cur,pm:UI._prevMode};
    SND.setVol(.65);SND.setChannel('sfx',.5);SND.setChannel('mus',.25);SND.setChannel('amb',1.5);
    const clampOk=near(SND.vol,.65)&&near(SND.sfxVol,.5)&&near(SND.musVol,.25)&&SND.ambVol===1;
    const hSet=UI.scr_settings(),sliders=['vol','sfx','mus','amb'].every(k=>hSet.includes(`data-sndvol="${k}"`)&&hSet.includes(`type="range"`));
    const hMenu=G.talent?UI.scr_menu():'data-open="settings"';
    G.mode='title';UI.cur=null;UI.open('settings');const opened=G.mode==='menu'&&UI.cur==='settings';UI.close();const titleRestored=G.mode==='title'&&!UI.cur;
    SND.setVol(sv.v);SND.setChannel('sfx',sv.s);SND.setChannel('mus',sv.m);SND.setChannel('amb',sv.a);G.mode=sv.gm;UI.cur=sv.cur;UI._prevMode=sv.pm;
    return{ok:clampOk&&sliders&&hMenu.includes('data-open="settings"')&&opened&&titleRestored,info:`clamp=${clampOk} sliders=${sliders} title=${opened&&titleRestored}`};});
  T('V33-1) โคลอสเซียมทดสอบแรงค์: Rank E มีผู้ท้าทาย 2 คน (Lv.15) · Rank D 3 คน (Lv.30) · C/B/A/S ครบตามเกณฑ์เลเวล',()=>{
    const exp={E:[15,2],D:[30,3],C:[50,3],B:[75,3],A:[100,4],S:[130,4]};
    let ok=typeof COLOSSEUM_TRIALS!=='undefined';
    for(const[rk,[lv,cnt]]of Object.entries(exp)){
      const tr=COLOSSEUM_TRIALS&&COLOSSEUM_TRIALS[rk],gr=GUILD_RANKS.find(r=>r.id===rk),z=makeColosseumZone(rk);
      if(!tr||!gr||tr.lv!==lv||gr.lvReq!==lv||gr.promoQuest!==tr.promo||tr.foes.length!==cnt||z.foes.length!==cnt||z.levelAt(0)!==lv){ok=false;break;}
      for(const fk of tr.foes){
        const d=FOES[fk];
        if(!d||d.fixedLv!==lv||!d.challenge||!LOOK_BY_NAME[d.look]||!WEAPONS[d.wpn]||!(d.skills||[]).every(s=>skillUsable(s,'enemy'))){ok=false;break;}
      }
    }
    const svLv=G.level,svRk=G.guildRank;
    G.guildRank='F';G.level=15;const hE=UI.scr_colosseum();
    G.level=svLv;G.guildRank=svRk;
    return{ok:ok&&hE.includes('data-colenter="E"')&&hE.includes('ผู้ท้าทาย 2 คน (Lv.15)'),info:`ok=${ok} colE=${hE.includes('data-colenter="E"')}`};});
  T('V34-1) ป่าเก็บไม้&หนัง · ถ้ำขุดหิน&แร่เหล็ก&ไม้ · น้ำพุและเสาแสงโถงหอคอยทั้ง 2 บันทึกจุดเกิดเมื่อตายได้',()=>{
    const rk0=G.guildRank,rp0=G.flags.respawnPoint,m0=JSON.stringify(G.mats);
    G.guildRank='D';
    let ok=true;
    try{
      // 1) ป่าไม้คอลลาวาร์รี: ไม่มีมอน มีต้นไม้เก็บไม้ หนัง น้ำพุบันทึกจุดเกิด
      OW.interact('ow_forest');drawExplore();
      const fOk=Z&&Z.id==='forest'&&Z.foes.length===0&&Z.props.some(p=>p.inter==='gather_wood')&&Z.props.some(p=>p.inter==='gather_hide')&&Z.props.some(p=>p.inter==='fountain')&&Z.items.some(i=>i.it==='hide')&&Z.items.some(i=>i.it==='wood');
      const w0=G.mats.wood||0,h0=G.mats.hide||0;
      interact({type:'gather_wood',o:Z.props.find(p=>p.inter==='gather_wood')});
      interact({type:'gather_hide',o:Z.props.find(p=>p.inter==='gather_hide')});
      const fGather=(G.mats.wood||0)===w0+1&&(G.mats.hide||0)===h0+1;
      interact({type:'fountain',o:Z.props.find(p=>p.inter==='fountain')});
      const fResp=G.flags.respawnPoint&&G.flags.respawnPoint.zoneId==='forest';
      // 2) ถ้ำขุดแร่คอลลาวาร์รี: ขุดหิน แร่เหล็ก เก็บไม้ น้ำพุบันทึกจุดเกิด
      OW.interact('ow_mine');drawExplore();
      const mOk=Z&&Z.id==='minecave'&&Z.foes.length===0&&Z.props.some(p=>p.inter==='mine_stone')&&Z.props.some(p=>p.inter==='mine_iron')&&Z.props.some(p=>p.inter==='gather_wood')&&Z.props.some(p=>p.inter==='fountain');
      const st0=G.mats.stoneore||0,or0=G.mats.ore||0;
      interact({type:'mine_stone',o:Z.props.find(p=>p.inter==='mine_stone')});
      interact({type:'mine_iron',o:Z.props.find(p=>p.inter==='mine_iron')});
      const mGather=(G.mats.stoneore||0)===st0+1&&(G.mats.ore||0)===or0+1;
      // 3) โถงเสาแสงหอคอยทั้ง 2: กดเสาแสงแล้วตายเกิดที่เสาแสงนั้น + ประตูออก Overworld อยู่ด้านล่าง
      OW.interact('ow_spire');drawExplore();
      const lp=Z.props.find(p=>p.inter==='light_pillar'),ex=Z.props.find(p=>p.inter==='ow_spire_exit'),gt=Z.props.find(p=>p.inter==='spire_enter_dungeon');
      const posOk=lp&&ex&&gt&&gt.y<lp.y&&ex.y>lp.y;
      interact({type:'light_pillar',o:lp});
      enterSpire(1,'mage');
      respawnAtSavedPoint();
      const spResp=Z&&Z.id==='spire_hall_mage';
      ok=fOk&&fGather&&fResp&&mOk&&mGather&&posOk&&spResp;
    }catch(e){ok=false;}
    finally{G.guildRank=rk0;G.flags.respawnPoint=rp0;G.mats=JSON.parse(m0);}
    return{ok,info:`ok=${ok}`};});
  T('V35-1) ลบคราฟต์กระทะของพ่อ · คราฟต์สินค้าพิเศษร้านมาร์คัส 16 ชิ้นและรูน 6 ชนิดได้ครบ · สูตรคราฟต์ไม่ชนกัน · ดันเจี้ยนต้นเกม 5 แห่งดรอปเฉพาะ ทั่วไป/หายาก',()=>{
    const noPan=!BASES.w_firepan&&!MATS.pan&&!MATS.sc_firepan&&!QUESTS.pan&&!RECIPES.some(r=>r.id==='firepan'||r.out.base==='w_firepan'||r.mats.pan);
    const shopCraft=['mp_l','mp_x','exitscroll','pot_regen','pot_def','pot_mdef','pot_m150','pot_quad','cryst_durable','cryst_great','divine','rerollstone','tierstone','pickstone','runedrill','talentevo',...RUNES];
    const allShopCraft=shopCraft.every(k=>RECIPES.some(r=>r.out.mat===k));
    const sigs=new Set();let noCollide=true;
    for(const r of RECIPES){
      const s=Object.keys(r.mats).sort().map(k=>k+':'+r.mats[k]).join(',');
      if(sigs.has(s)){noCollide=false;break;}
      sigs.add(s);
    }
    const rk0=G.guildRank,b0=G.bag.slice(),z0s=Z;
    G.guildRank='S';
    let earlyNoEpic=true,spireHasEpic=false;
    for(const tid of EARLY_DUNGEON_TABLES){
      for(let i=0;i<120;i++){
        const res=LootManager.generate({tableId:tid,cls:'boss',level:35,luk:30});
        for(const d of res.drops)if(d.kind==='item'&&RARS.indexOf(d.rar)>RARS.indexOf('rare'))earlyNoEpic=false;
      }
    }
    loadZone(makeDungeon(1,'stone'));
    for(let i=0;i<30;i++){
      const n0=G.bag.length;
      grantChest({content:{loot:'stonecave',skill:0}});
      for(let j=n0;j<G.bag.length;j++)if(RARS.indexOf(G.bag[j].rar)>RARS.indexOf('rare'))earlyNoEpic=false;
    }
    for(let i=0;i<150;i++){
      const res=LootManager.generate({tableId:'spireboss',cls:'boss',level:60,luk:30});
      for(const d of res.drops)if(d.kind==='item'&&d.rar==='epic')spireHasEpic=true;
    }
    G.guildRank=rk0;G.bag=b0;Z=z0s;
    const lo=vsLoadout(),arenaOk=lo&&lo.skills.length===5&&!!lo.guildRank&&lo.S&&!lo.S.base&&!lo.S.flat&&Skills.move('piercestrike','sword',3,{skLv:{piercestrike:3}}).dmg>Skills.move('piercestrike','sword',3,{skLv:{piercestrike:1}}).dmg;
    return{ok:noPan&&allShopCraft&&noCollide&&earlyNoEpic&&spireHasEpic&&arenaOk,info:`noPan=${noPan} shopCraft=${allShopCraft} noCollide=${noCollide} earlyNoEpic=${earlyNoEpic} spireEpic=${spireHasEpic} arena=${arenaOk}`};});
  }finally{RNG=rng0;Z=z0;P.x=px0;P.y=py0;G.hp=hp0;G.mode=mode0;G.flags.bossCD=cd0;G.pendingFoe=pf0;try{buildBg();}catch(e){}}}
  RNG=saveRNG;Object.assign(G,saveG);[Status.onStun,Status.onStunEnd,Status.onSynergy]=prevHooks;
  window.__testResults={pass,fail,out};return{pass,fail,out};
}
window.runTests=runTests;
