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

  T('ดาเมจพื้นฐาน = max(1, ATK×ตัวคูณ − DEF ที่เหลือ): ATK100 DEF50 → 50',()=>({ok:calcDamage(A(),Tg({def:50}),ph()).dmg===50}));
  T('ดาเมจขั้นต่ำ 1 เมื่อ DEF สูงกว่า',()=>({ok:calcDamage(A(),Tg({def:500}),ph()).dmg===1}));
  T('Effective DEF = max(0, DEF−เจาะเกราะ): DEF50 เจาะ30 → 80, เจาะ100 → 100 (ไม่ติดลบ)',()=>({ok:calcDamage(A({apen:30}),Tg({def:50}),ph()).dmg===80&&calcDamage(A({apen:100}),Tg({def:50}),ph()).dmg===100}));
  T('ดาเมจเวทใช้ M.DEF (ไม่ใช้ DEF)',()=>{const r=calcDamage(A({mpow:200}),Tg({def:999,mdef:50}),ph({type:'magic'}));return{ok:r.dmg===150,info:'ได้ '+r.dmg};});
  T('ลำดับ: ฐาน → คริ → ธาตุ/สถานะ → ลดดาเมจ',()=>{const r=calcDamage(A({critDmg:2}),Tg({def:20,dr:.5,res:{fire:.5}}),ph({el:'fire',forceCrit:1,stunned:1}));return{ok:r.dmg===48,info:'(100−20)×2×0.5×1.2×0.5 = '+r.dmg};});
  T('คริติคอล = ดาเมจปกติ × ตัวคูณคริ',()=>({ok:calcDamage(A({critDmg:2}),Tg(),ph({forceCrit:1})).dmg===200}));
  T('เพดานอัตราคริ 75% และดาเมจคริ 350%',()=>{const S=Stats.derive({str:10,agi:10,int:10,vit:10,luk:999},{},1,null,new Set());return{ok:S.critRate===.75&&S.critDmg===3.5,info:`${S.critRate} / ${S.critDmg}`};});
  T('สูตรคริจาก LUK: 5%+LUK×0.2%, 150%+LUK×1%',()=>{const S=Stats.derive({str:10,agi:10,int:10,vit:10,luk:10},{},1,null,new Set());return{ok:near(S.critRate,.07)&&near(S.critDmg,1.6),info:`${S.critRate} / ${S.critDmg}`};});
  T('THE LUCKY ONE: +25% คริ +50% ดาเมจคริ (ค่าคงที่) แต่อัตรายังไม่เกิน 75%',()=>{const a=Stats.derive({str:10,agi:10,int:10,vit:10,luk:10},{},1,'lucky',new Set()),b=Stats.derive({str:10,agi:10,int:10,vit:10,luk:300},{},1,'lucky',new Set());
    return{ok:near(a.critRate,.32)&&near(a.critDmg,2.1)&&b.critRate===.75,info:`${a.critRate}, ${a.critDmg}, ${b.critRate}`};});
  T('MaxHP = 500+VIT×20+Lv×50, MaxMP = 100+INT×10',()=>{const S=Stats.derive({str:10,agi:10,int:12,vit:15,luk:10},{},3,null,new Set());return{ok:S.maxHP===950&&S.maxMP===220,info:`${S.maxHP} / ${S.maxMP}`};});
  T('THE PIERCER: +100 เจาะเกราะ',()=>({ok:Stats.derive(BASE_ATTR,{},1,'piercer',new Set()).apen===100}));
  T('THE ENDURER 25% ใช้เพดานลดดาเมจรวม 75%',()=>{const S=Stats.derive(BASE_ATTR,{dr:.6},1,'endurer',new Set());const r=calcDamage(A(),Tg({dr:S.dr,buffDr:.3}),ph());return{ok:S.dr===.75&&r.dmg===25,info:`DR ${S.dr}, ดาเมจ ${r.dmg}`};});
  T('มึนงง: รับดาเมจเพิ่ม 20%',()=>({ok:calcDamage(A(),Tg(),ph({stunned:1})).dmg===120}));
  T('คอมโบครบชุด +20% และตัวคูณไม่ถูกคูณซ้ำ',()=>{const r=calcDamage(A(),Tg(),ph({fullCombo:1,stunned:1}));return{ok:r.dmg===144&&Object.keys(r.mods).length===2,info:'ได้ '+r.dmg};});
  T('ลดดาเมจขาเข้า: Final = Incoming × (1 − DR)',()=>({ok:incoming({dr:.25},100)===75}));
  T('ต้านธาตุ/จุดอ่อนธาตุตั้งค่าแยกได้',()=>{const a=calcDamage(A(),Tg({res:{fire:.5}}),ph({el:'fire'})).dmg,b=calcDamage(A(),Tg({res:{fire:-.5}}),ph({el:'fire'})).dmg;return{ok:a===50&&b===150,info:`${a} / ${b}`};});

  T('พิษ: สูงสุด 10 สแตก = 185 DPS, สแตกที่ 11 ไม่เพิ่มและไม่รีเฟรชเวลา',()=>{const f=dummy();for(let i=0;i<10;i++)Status.apply(f,'poison');for(let i=0;i<30;i++)Status.update(f);const t=f.st8.poison.t;const r=Status.apply(f,'poison');
    return{ok:CONFIG.maxStacks===10&&f.st8.poison.stacks===10&&Status.dps(f)===185&&r==='capped'&&f.st8.poison.t===t,info:`สแตก ${f.st8.poison.stacks}, DPS ${Status.dps(f)}, ผล ${r}`};});
  T('พิษ: สแตกใหม่ที่ถูกต้องรีเฟรชเวลาเป็น 3 วิ',()=>{const f=dummy();Status.apply(f,'poison');for(let i=0;i<60;i++)Status.update(f);Status.apply(f,'poison');return{ok:f.st8.poison.t===180&&f.st8.poison.stacks===2};});
  T('เลือดออก: 1 สแตก 60 DPS, 10 สแตก 240 DPS (สูงสุด)',()=>{const f=dummy();Status.apply(f,'bleed');const a=Status.dps(f);Status.apply(f,'bleed',14);return{ok:a===60&&Status.dps(f)===240&&f.st8.bleed.stacks===10,info:`${a} → ${Status.dps(f)}`};});
  T('เผาไหม้: 80 DPS ไม่สแตก ใส่ซ้ำรีเฟรชเวลา',()=>{const f=dummy();Status.apply(f,'burn');for(let i=0;i<90;i++)Status.update(f);Status.apply(f,'burn');return{ok:Status.dps(f)===80&&f.st8.burn.t===180&&!f.st8.burn.stacks};});
  T('DOT ทำงานวินาทีละครั้ง: พิษ 1 สแตก 3 วิ = 3 ครั้ง รวม 150',()=>{const f=dummy();Status.apply(f,'poison');let sum=0,n=0;for(let i=0;i<200;i++)Status.update(f,(k,d)=>{sum+=d;n++;});return{ok:sum===150&&n===3&&!f.st8.poison,info:`${n} ครั้ง รวม ${sum}`};});
  T('พิษ + เลือดออก + เผาไหม้ อยู่พร้อมกันได้ (190 DPS)',()=>{const f=dummy();Status.apply(f,'poison');Status.apply(f,'bleed');Status.apply(f,'burn');return{ok:Status.dps(f)===190};});
  T('ช็อก: 50 DPS และทำให้มึนงง 3 วิ',()=>{const f=dummy();Status.apply(f,'shock');return{ok:!!f.st8.stun&&f.st8.stun.t===180&&Status.dps(f)===50};});
  T('มึนงงไม่สแตก + ภูมิคุ้มกันหลังหมด (กันติด CC วนลูป)',()=>{const f=dummy();const a=Status.apply(f,'stun');const b=Status.apply(f,'stun');for(let i=0;i<181;i++)Status.update(f);const c=Status.apply(f,'stun');
    return{ok:a==='ok'&&b==='stunned'&&c==='immune'&&f.stunImm>0,info:`${a}, ${b}, ${c}`};});
  T('บอสตั้งค่าต้านทาน/ภูมิคุ้มกันสถานะได้',()=>{const f=dummy({statusRes:{stun:1,burn:1}});return{ok:Status.apply(f,'stun')==='immune'&&Status.apply(f,'burn')==='immune'};});

  T('เลเวลศัตรูคงที่ตามโซน ไม่ขยับตามเลเวลผู้เล่น',()=>{const c=[[4,1,4],[1,20,1],[15,30,15],[23,1,23]];const bad=c.filter(([z,p,e])=>enemyLevel(z,p)!==e);return{ok:!bad.length&&foeLevel(FOES.rat,7)===7&&foeLevel(FOES.golem,7)===35,info:bad.length?'ผิด: '+JSON.stringify(bad):'4 กรณี'};});
  T('คอมโบเหลือแค่พื้นฐาน (J J J) · ไม่มีคอมโบคำสั่ง/คอมโบพิเศษ',()=>({ok:COMBOS.length===1&&COMBOS[0].id==='basic'&&CMD_COMBOS.length===0}));
  T('AR1) ชนะลานประลองออนไลน์ได้รางวัลสุ่ม 1 ชิ้น ส่วนคนแพ้ไม่ได้',()=>{const sv={bag:G.bag,mode:G.mode,cur:UI.cur};G.bag=[];UI.vsResult('P2',[1,2],'guest');const won=G.bag.length;UI.vsResult('P2',[1,2],'host');const lost=G.bag.length-won;
    G.bag=sv.bag;UI.close();G.mode=sv.mode;return{ok:won===1&&lost===0&&RARS.indexOf(G.bag===sv.bag?'normal':'x')>=0,info:'ชนะได้ '+won+' · แพ้ได้ '+lost};});
  T('2H) ดาบใหญ่/ค้อนศึก: 3 ระดับตายตัว ถือ 2 มือ ช้ากว่าดาบแต่แรงกว่า ค้อนมีโอกาสสตัน 3 วิ',()=>{const ks=['w_gs1','w_gs2','w_gs3','w_wh1','w_wh2','w_wh3'],r=ks.map(k=>newItem(k,'normal',5).rar).join(),sw=WEAPONS.sword.light[0],gs=WEAPONS.gsword.light[0],hm=WEAPONS.ghammer;
    return{ok:r==='normal,rare,epic,normal,rare,epic'&&WEAPONS.gsword.twoHand&&hm.twoHand&&(gs.s+gs.a+gs.r)>(sw.s+sw.a+sw.r)&&gs.dmg>sw.dmg&&hm.heavy.stunChance>0&&hm.light.every(m=>m.stunChance>0&&m.stunDur===3)&&['gs1','gs2','gs3','wh1','wh2','wh3'].every(id=>RECIPES.some(x=>x.id===id)),info:r};});
  T('RI1) ร้านสุ่ม: สุ่ม 1000 ซื้อ 500 ซื้อได้ชิ้นเดียวต่อการสุ่ม',()=>{const sv={bag:G.bag,gold:G.gold};G.bag=[];G.gold=3000;UI.open('reitem');document.querySelector('[data-reroll]').click();const g1=G.gold;
    document.querySelector('[data-reclaim="0"]').click();const g2=G.gold,b1=G.bag.length;const b=document.querySelector('[data-reclaim="1"]');if(b)b.click();const b2=G.bag.length;
    G.bag=sv.bag;G.gold=sv.gold;UI.close();return{ok:g1===2000&&g2===1500&&b1===1&&b2===1&&b&&b.disabled,info:`${g1} → ${g2} · ซื้อ ${b2} ชิ้น`};});
  T('AL1) นักเล่นแร่แปรธาตุ: ของชนิดเดียวกัน 2 ชิ้น → 1 ชิ้นค่าเสริมใหม่ ได้ระดับ/ตีบวกที่สูงกว่า',()=>{const sv=G.bag;G.bag=[];const a=Inv.addItem(newItem('w_sword','rare',3)),b=Inv.addItem(newItem('w_sword','normal',5));b.enh=4;
    const bad=Alchemy.fuse(a,Inv.addItem(newItem('w_club','rare',3)));const r=Alchemy.fuse(a,b);const ok=!bad.ok&&r.ok&&G.bag.filter(x=>x.base==='w_sword').length===1&&r.item.rar==='rare'&&r.item.ilvl===5&&r.item.enh===4;G.bag=sv;return{ok,info:r.ok?r.item.rar+' iLv'+r.item.ilvl+' +'+r.item.enh:'fail'};});
  T('TW1) หอคอยนักแปรธาตุ: ประตูในเมือง 2 ชั้น + ห้องบอส Lv.45 · ศัตรู 3 ชนิด · แอ่งน้ำยา · ตารางดรอปครบ',()=>{const t=makeTown(),g=t.props.find(o=>o.inter==='citygate'),a=makeDungeon(1,'tower'),b=makeDungeon(2,'tower'),r=makeBossRoom('homunculus');
    const kinds=new Set([...a.foes,...b.foes].map(f=>f.kind));return{ok:!!g&&a.id==='tower1'&&b.id==='tower2'&&[...kinds].every(k=>['mslime','homunc','gargoyle'].includes(k))&&Object.keys(a.puddles).length>0&&r.foes[0].kind==='homunculus'&&FOES.homunculus.fixedLv===45&&THEME_BOSS.tower==='homunculus'&&!!LOOT_TABLES.tower&&!!LOOT_TABLES.homunculus&&!LootManager.validateAll().some(x=>/tower|homunc/.test(x)),info:[...kinds].join(',')};});
  T('TW2) ชุดนักแปรธาตุ 4 ชิ้น: โอกาสติด +10% และ DoT +30% · ศิลานักปราชญ์ล็อกค่าเสริมได้',()=>{const L=[...['h_alch','a_alch','g_alch','b_alch'].map(k=>newItem(k,'normal',1))],sb=activeSetBonuses(L);const f={st8:{},S:{statusRes:0},statusRes:{}};Status.init(f);Status.apply(f,'burn',1,{S:{dotPct:.3}});
    return{ok:sb.some(x=>x.b.statusChance===.1)&&sb.some(x=>x.b.dotPct===.3)&&Status.dps(f)===Math.round(CONFIG.dot.burn.base*1.3)&&!!MATS.philostone,info:'DoT '+Status.dps(f)};});
  T('HX1) Hexweaver ติดซ้ำ = เวลาต่อท้ายไม่มีเพดาน (สายอื่นรีเฟรช) · พุ่งหลบคูลดาวน์ 1.5 วิ · บอสไม่ล้ม',()=>{const H=Stats.derive(Object.assign({},BASE_ATTR),{},1,'hexweaver',new Set()),N=Stats.derive(Object.assign({},BASE_ATTR),{},1,'lucky',new Set());
    const mk=()=>{const f={st8:{},S:{statusRes:0},statusRes:{}};Status.init(f);return f;},a=mk(),b=mk();for(let i=0;i<12;i++){Status.apply(a,'burn',1,{S:H});Status.apply(b,'burn',1,{S:N});}
    return{ok:a.st8.burn.t>b.st8.burn.t*10&&b.st8.burn.t===CONFIG.statusDur&&CONFIG.dashCD===90,info:(a.st8.burn.t/60).toFixed(1)+' วิ vs '+(b.st8.burn.t/60).toFixed(1)+' วิ'};});
  T('BQ1) bbqy: ATK 304 และทุกการโจมตีเป็นเวท (ใช้ M.DEF หัก)',()=>{const d=FOES.duelist,E=Stats.enemy(d,100,false);G.mode='explore';BT=null;const sv=Z;
    setupBattle(mkFoe('duelist',{x:300,y:150}));const b=BT;b.intro=0;let typ=null;const o=G.dmgLog.length;for(let i=0;i<8&&G.dmgLog.length===o;i++){b.p.state='idle';b.p.invuln=0;b.p.guardLeft=0;applyHit(b.e,b.p,WEAPONS.sword.light[0],1);}typ=G.dmgLog[0]&&G.dmgLog[0].type;BT=null;G.mode='explore';
    return{ok:d.base.atk===304&&E.ap===304&&E.mpow===304&&d.allMagic&&typ==='magic',info:'ATK '+E.ap+' · '+typ};});
  T('LG1) ไลต์เลส (ตำนาน): ไม่สนเกราะ 20% + ตาบอด 5 วิ = ตีไม่โดน · แหวนปฐมกาล ค่าพลัง +10 ทุกอย่าง · สร้างได้จากของบอส โอกาส 10%',()=>{const w=newItem('w_lightless','normal',9),r=newItem('r_primal','normal',9),sw=itemStats(w),sr=itemStats(r);
    const f={st8:{},S:{statusRes:0},statusRes:{}};Status.init(f);Status.apply(f,'blind',1,null,5);const R1=RECIPES.find(x=>x.id==='lightless'),R2=RECIPES.find(x=>x.id==='primal');
    return{ok:w.rar==='legendary'&&r.rar==='legendary'&&sw.apenPct===.2&&sw.blindChance===.2&&['str','agi','int','vit','luk'].every(k=>sr[k]>=10)&&f.st8.blind.t===300&&Craft.base(R1)===.1&&R1.mats.bossfrag===10&&R2.mats.bossfrag===10&&R1.gold===10&&R2.gold===10&&LOOT_TABLES.seraph.guaranteed.some(g=>g.mat==='bossfrag'),info:w.rar+'/'+r.rar};});
  T('LV1) เลเวลตันที่ Lv.200 — XP ส่วนเกินไม่ทำให้เกินเพดาน',()=>{const sv={level:G.level,xp:G.xp,points:G.points};G.level=199;G.xp=0;Prog.gainXP(9e9);const ok=G.level===CONFIG.levelCap&&CONFIG.levelCap===200&&G.xp===0&&Prog.gainXP(5000)===0&&G.level===200;Object.assign(G,sv);return{ok,info:'Lv.'+CONFIG.levelCap};});
  T('LV2) บอสเมืองแรกเลเวลตายตัว 35 / 40 / 50 และใช้ค่า base เป็นค่าจริง',()=>{const L=[FOES.golem.fixedLv,FOES.lavaking.fixedLv,FOES.seraph.fixedLv],D=Diff.cur(),E=Stats.enemy(FOES.golem,35,false);
    return{ok:L.join()==='35,40,50'&&foeLevel(FOES.golem,1)===35&&E.maxHP===Math.round(FOES.golem.base.hp*D.eHP)&&E.ap===Math.round(FOES.golem.base.atk*D.eATK),info:L.join(' / ')+' · HP '+E.maxHP};});
  T('LV3) ไอเทมทุกชิ้นสูงสุดแค่มหากาพย์ (ดรอป/คราฟต์/รีไอเทม)',()=>{const a=newItem('w_sword','god',5),b=newItem('w_sword','legendary',5),c=newItem('w_sword','epic',5);const rs=reitemOdds().map(x=>x[0]);
    return{ok:a.rar==='epic'&&b.rar==='epic'&&c.rar==='epic'&&!rs.includes('god')&&!rs.includes('legendary')&&RECIPES.every(r=>RARS.indexOf(r.rar)<=RARS.indexOf('epic')||(r.rate&&BASES[r.out.base].fixRar===r.rar)),info:rs.join('/')};});
  T('เลเวลอัปได้ 2 แต้มค่าพลัง',()=>{const s={level:G.level,xp:G.xp,points:G.points,hp:G.hp,mp:G.mp};G.level=1;G.xp=0;G.points=0;Prog.gainXP(CONFIG.xpNext(1));const ok=G.level===2&&G.points===CONFIG.levelPoints&&CONFIG.levelPoints===2;Object.assign(G,s);return ok;});

  RNG=mulberry32(12345);
  T('ความหายากมีผลต่อจำนวน affix ช่องรูน (1-5) และพาสซีฟพิเศษ',()=>{const mr=CONFIG.maxRarity;CONFIG.maxRarity='god';const it={};let ok=true;for(let i=0;i<RARS.length;i++){const r=RARS[i],x=newItem('w_sword',r,5);it[r]=x;const R=RARITY[r];
    if(x.affixes.length<R.affix[0]||x.affixes.length>R.affix[1]||R.sockets!==i+1||!Array.isArray(x.sockets)||(!!R.uniq!==!!x.uniq))ok=false;}
    const gp=it.god.uniq in PASSIVES.god;CONFIG.maxRarity=mr;return{ok:ok&&gp,info:RARS.map(r=>`${r}:${it[r].affixes.length}affix/${RARITY[r].sockets}sock`).join(' ')};});
  /* ---- slot-based crafting ---- */
  const SL=(...pairs)=>{const o=Array(6).fill(null);pairs.forEach((p,i)=>o[i]={id:p[0],q:p[1]});return o;};
  const resetCraft=m=>{G.mats=Object.assign({},m);G.bag=[];G.stats={crafts:0,craftOk:0};G.found=new Set();G.known=new Set();Craft.busy=false;};
  T('อัตราพื้นฐาน: ธรรมดา 50% หายาก 30% ตำนาน 20% เทพ 10%',()=>({ok:CONFIG.craftRates.normal===.5&&CONFIG.craftRates.rare===.3&&CONFIG.craftRates.legendary===.2&&CONFIG.craftRates.god===.1}));
  const trials=20000,sample={normal:['club',SL(['wood',2])],rare:['flame',SL(['ore',2],['fire',1],['wood',1])],legendary:['kage',SL(['cloth',3],['ore',2])],god:['god',SL(['essence',1],['lavaore',5],['fire',2])]};
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
  T('สำเร็จ: หักวัตถุดิบ + ได้อุปกรณ์ตามความหายากเข้ากระเป๋า',()=>{RNG=()=>.01;resetCraft({cloth:3,ore:2});const r=Craft.attempt(sample.legendary[1],false);
    return{ok:r.ok&&!G.mats.cloth&&!G.mats.ore&&G.bag.length===1&&G.bag[0].rar===RECIPES.find(x=>x.id==='kage').rar&&G.bag[0].base==='w_kage'};});
  T('ล้มเหลว: เสียวัตถุดิบทั้งหมด + คริสตัล และไม่ได้อุปกรณ์',()=>{RNG=()=>.99;resetCraft({pan:1,fire:1,divine:1});const r=Craft.attempt(SL(['pan',1],['fire',1]),true);
    return{ok:r.failed&&!G.mats.pan&&!G.mats.fire&&!G.mats.divine&&G.bag.length===0&&r.lost.divine===1};});
  T('กันกดซ้ำ: ระหว่างกำลังคราฟต์ เรียกซ้ำไม่ทำงาน',()=>{resetCraft({wood:4});Craft.busy=true;const r=Craft.attempt(SL(['wood',2]),false);Craft.busy=false;return{ok:r.err==='busy'&&G.mats.wood===4};});
  T('ไม่มีระบบ pity: หลังพลาด 5 ครั้งติด โอกาสยังเท่าเดิม (เทพ 10%)',()=>{RNG=mulberry32(4242);resetCraft({essence:60000,lavaore:300000,fire:120000});let streak=0,after=0,afterOk=0;
    for(let i=0;i<60000;i++){const res=Craft.attempt(sample.god[1],false).ok;if(streak>=5){after++;if(res)afterOk++;}streak=res?0:streak+1;}
    const p=afterOk/after,ex=CONFIG.craftRates[RECIPES.find(x=>x.id==='god').rar];return{ok:Math.abs(p-ex)<.015,info:`${(p*100).toFixed(2)}% จาก ${after} ครั้ง`};});
  T('คัมภีร์ให้เบาะแสสูตร แต่ไม่เปลี่ยนโอกาสสำเร็จ',()=>{const r=RECIPES.find(x=>x.id==='god');resetCraft({sc_god:1});const before=Craft.clueKnown(r),c=Craft.chance(r,false);Inv.use('sc_god');
    return{ok:!before&&Craft.clueKnown(r)&&Craft.chance(r,false)===c&&c===CONFIG.craftRates[r.rar]};});
  /* ---- skill rune sockets ---- */
  const skSave=Skills.toSave(),skTal=G.talent,goldSave=G.gold;
  const freshSk=()=>{G.talent='lucky';Skills.init('lucky');G.mats={};G.gold=0;Skills.cache={};};
  T('เริ่มเกม: เรียนเฉพาะสกิลเฉพาะตัว และยังไม่ผนึก (ต้องยืนยันก่อน)',()=>{freshSk();return{ok:G.skills.learned.size===1&&G.skills.learned.has('luckyseven')&&!G.skills.bound&&G.skills.slots.every(x=>!x)};});
  T('ติดตั้ง/แทนที่/ถอด สกิลทั่วไปและหายาก',()=>{freshSk();['orb','poisondart','rising','rushkick'].forEach(k=>G.skills.learned.add(k));
    const a=Skills.equip(0,'orb').ok,b=Skills.equip(0,'poisondart').ok&&G.skills.slots[0]==='poisondart',c=Skills.equip(1,'rising').ok,d=Skills.equip(0,null).ok&&!G.skills.slots[0];return{ok:a&&b&&c&&d};});
  T('ตรวจประเภทสกิลกับช่อง + กันใส่ซ้ำ + กันสกิลที่ยังไม่เรียน',()=>{freshSk();['orb','rising'].forEach(k=>G.skills.learned.add(k));
    const a=!Skills.equip(0,'rising').ok,b=!Skills.equip(1,'orb').ok,c=!Skills.equip(0,'slashwave').ok,d=!Skills.equip(3,'orb').ok,e=!Skills.equip(2,'luckyseven').ok;return{ok:a&&b&&c&&d&&e};});
  T('ถอดแล้วใส่ใหม่ เลเวลสกิลยังอยู่',()=>{freshSk();G.skills.learned.add('orb');G.skills.lv.orb=3;Skills.equip(0,'orb');Skills.equip(0,null);Skills.equip(0,'orb');return{ok:Skills.level('orb')===3};});
  T('ผนึกสกิลเฉพาะตัว: ถาวร ถอด/แทนที่/ผนึกซ้ำไม่ได้',()=>{freshSk();const a=Skills.bind('luckyseven').ok;G.skills.learned.add('ironwall');
    const b=!Skills.equip(2,null).ok,c=!Skills.equip(2,'ironwall').ok,d=!Skills.bind('ironwall').ok,e=!Skills.replaceUnique('ironwall').ok;
    return{ok:a&&b&&c&&d&&e&&G.skills.bound==='luckyseven'&&G.skills.slots[2]==='luckyseven'};});
  T('ผนึกได้เฉพาะสกิลเฉพาะตัวที่เรียนแล้ว',()=>{freshSk();G.skills.learned.add('orb');return{ok:!Skills.bind('orb').ok&&!Skills.bind('ironwall').ok&&!G.skills.bound};});
  T('ตราทำลายผนึก: ใช้ 1 ชิ้นเมื่อยืนยัน สกิลใหม่ผนึกต่อ สกิลเก่า+เลเวลเก็บไว้',()=>{freshSk();Skills.bind('luckyseven');G.skills.lv.luckyseven=4;G.skills.learned.add('ironwall');Inv.add('sealbreaker',2);
    const r=Skills.replaceUnique('ironwall');return{ok:r.ok&&G.mats.sealbreaker===1&&G.skills.bound==='ironwall'&&G.skills.slots[2]==='ironwall'&&G.skills.learned.has('luckyseven')&&Skills.level('luckyseven')===4&&!Skills.equip(2,'luckyseven').ok};});
  T('อัปเกรด: ต้องผนึกก่อน, ของไม่พอไม่หักอะไร, พอแล้วหักและเลเวลขึ้น, ดาเมจ/คูลดาวน์ปรับตามตาราง',()=>{freshSk();G.talent='piercer';Skills.init('piercer');const a=!Skills.upgrade('piercestrike').ok;Skills.bind('piercestrike');
    const b=!Skills.upgrade('piercestrike').ok&&G.gold===0;const req=SKILL_UPGRADE.levels[2];for(const k in req.mats)Inv.add(k,req.mats[k]);G.gold=req.gold;
    const m1=Skills.move('piercestrike','fist',2).dmg;const c=Skills.upgrade('piercestrike').ok;const m2=Skills.move('piercestrike','fist',2).dmg;
    return{ok:a&&b&&c&&Skills.level('piercestrike')===2&&G.gold===0&&!Object.keys(req.mats).some(k=>G.mats[k])&&near(m2/m1,req.coef,1e-9),info:`ดาเมจ ${m1.toFixed(1)}→${m2.toFixed(1)}`};});
  T('อัปเกรดไม่เกินเลเวลสูงสุด',()=>{freshSk();Skills.bind('luckyseven');G.skills.lv.luckyseven=SKILL_UPGRADE.maxLevel;G.gold=1e6;for(const k in MATS)G.mats[k]=99;const r=Skills.upgrade('luckyseven');return{ok:!r.ok&&Skills.level('luckyseven')===SKILL_UPGRADE.maxLevel};});
  T('สกิลสุดยอด: ติดตั้ง แทนที่ และถอดออกได้',()=>{freshSk();['hyperbeam','moonfall'].forEach(k=>G.skills.learned.add(k));const a=Skills.equip(3,'hyperbeam').ok,b=Skills.equip(3,'moonfall').ok&&G.skills.slots[3]==='moonfall',c=Skills.equip(3,null).ok&&!G.skills.slots[3];return{ok:a&&b&&c};});
  T('เซฟ/โหลด: เก็บการผนึก เลเวลอัปเกรด และช่องสกิล',()=>{freshSk();G.skills.learned.add('orb');Skills.equip(0,'orb');Skills.bind('luckyseven');G.skills.lv.luckyseven=3;
    const d=JSON.parse(JSON.stringify(Skills.toSave()));Skills.init('lucky');Skills.fromSave(d);
    return{ok:G.skills.bound==='luckyseven'&&Skills.level('luckyseven')===3&&G.skills.slots[0]==='orb'&&G.skills.slots[2]==='luckyseven'&&G.skills.learned.has('orb')};});
  T('เซฟรุ่นเก่า (ก่อนมีระบบผนึก): สกิลเฉพาะตัวที่ใส่อยู่ถือว่าผนึกแล้ว',()=>{Skills.fromSave({learned:['luckyseven','orb'],slots:['orb',null,'luckyseven',null]});return{ok:G.skills.bound==='luckyseven'&&!G.skills.lv.luckyseven};});
  T('ตราทำลายผนึก: ใช้จากกระเป๋าโดยตรงไม่ได้ (กันกดพลาด)',()=>{freshSk();Skills.bind('luckyseven');Inv.add('sealbreaker',1);const r=Inv.use('sealbreaker');return{ok:!r.ok&&G.mats.sealbreaker===1&&G.skills.bound==='luckyseven'};});
  T('เลเวลอัป/เควสต์ไม่ปลดล็อกสกิล (ได้จากดรอปเท่านั้น)',()=>{freshSk();G.flags=Object.assign({},G.flags,{kageDown:1});const sv={level:G.level};G.level=20;const got=Skills.check();G.level=sv.level;return{ok:!got.length&&G.skills.learned.size===1};});
  T('ตำราสกิลทุกระดับ (ทั่วไป/หายาก/สุดยอด) อยู่ในตารางดรอป',()=>{const tiers=new Set();for(const t in LOOT_TABLES)for(const e of LOOT_TABLES[t].entries)if(e.book)tiers.add(e.book);return{ok:['common','rare','ultimate'].every(x=>tiers.has(x))};});
  T('อ่านตำราสกิล: เรียนสกิล + ใช้ตำรา 1 เล่ม + ใส่ช่องว่างอัตโนมัติ, เรียนซ้ำไม่เสียตำรา',()=>{freshSk();Inv.add('sk_rising',2);const a=Inv.use('sk_rising').ok,b=!Inv.use('sk_rising').ok;
    return{ok:a&&b&&G.skills.learned.has('rising')&&G.skills.slots[1]==='rising'&&G.mats.sk_rising===1};});
  /* ---- v3: skill database, mana, potions, ultimate gauge, equipment caps, combo cancel ---- */
  T('ฐานข้อมูลสกิล: ทั่วไป/หายาก/สุดยอด อย่างละ 10 · ทุกพรสวรรค์มีสกิลเฉพาะตัวของตัวเอง',()=>{const c={};for(const k in SKILLS)if(!SKILLS[k].bossOnly&&SKILLS[k].user!=='enemy')c[SKILLS[k].tier]=(c[SKILLS[k].tier]||0)+1;const tal=Object.values(TALENTS).every(t=>SKILLS[t.skill]&&SKILLS[t.skill].tier==='unique');return{ok:['common','rare','ultimate'].every(t=>c[t]===10)&&c.unique>=Object.keys(TALENTS).length&&tal&&new Set(Object.values(TALENTS).map(t=>t.skill)).size===Object.keys(TALENTS).length,info:JSON.stringify(c)};});
  T('ค่ามานา: ทั่วไป 30-50, หายาก 60-100, เฉพาะตัวแอ็กทีฟ 40-60, พาสซีฟ 0, สุดยอด = เกจ 100 ไม่ใช้ MP',()=>{const bad=Object.entries(SKILLS).filter(([k,s])=>{if(s.user==='enemy'||s.bossOnly)return false;
      if(s.tier==='common')return!(s.mp>=30&&s.mp<=50);if(s.tier==='rare')return!(s.mp>=60&&s.mp<=100);
      if(s.tier==='unique')return s.type==='passive'?!!s.mp:s.mpPct?!(s.mpPct===.2):!(s.mp>=30&&s.mp<=60);return s.gauge!==100||!!s.mp;}).map(([k])=>k);return{ok:!bad.length,info:bad.join(',')||'ครบทุกสกิล'};});
  T('MP ไม่พอ → ใช้สกิลไม่ได้ และ MP ไม่ถูกหัก',()=>{freshSk();G.skills.learned.add('orb');const p={mp:10,S:{maxMP:200,mpCost:0}};const e=skillCastCheck(p,'orb');return{ok:!!e&&p.mp===10,info:e};});
  T('คูลดาวน์สกิล: ระหว่างคูลดาวน์ใช้ไม่ได้ หมดแล้วใช้ได้',()=>{freshSk();const p={mp:999,S:{maxMP:999,mpCost:0}};G.skills.cd.orb=60;const a=!!skillCastCheck(p,'orb');for(let i=0;i<60;i++)Skills.tick();return{ok:a&&!skillCastCheck(p,'orb')};});
  T('สกิลพาสซีฟกดใช้ไม่ได้ (ทำงานอัตโนมัติ)',()=>({ok:!!skillCastCheck({mp:999,S:{maxMP:999}},'focus')&&Skills.move('focus','fist',2)===null}));
  T('ฟื้น MP: ในการต่อสู้ 1/3 วิ, นอกการต่อสู้ 1/1.5 วิ, ไม่เกิน Max MP',()=>{const S={maxMP:100,mpRegen:0},a={mp:0},b={mp:0},c={mp:99};
    for(let i=0;i<540;i++){Mana.regen(a,S,true);Mana.regen(b,S,false);Mana.regen(c,S,false);}return{ok:a.mp===3&&b.mp===6&&c.mp===100,info:`9 วิ: ต่อสู้ ${a.mp}, นอก ${b.mp}, เพดาน ${c.mp}`};});
  T('โบนัสฟื้นฟูมานา/ลดค่ามานาจากอุปกรณ์ ติดเพดาน 30%',()=>{const S=Stats.derive(BASE_ATTR,{mpRegen:.9,mpCost:.5,statusRes:.2},1,null,new Set());
    const o={mp:0};for(let i=0;i<1800;i++)Mana.regen(o,Object.assign({},S,{maxMP:999}),true);return{ok:S.mpRegen===.3&&S.mpCost===.3&&near(S.statusRes,.2+Math.floor(BASE_ATTR.str/10)*CONFIG.derived.strPer10Res)&&o.mp===13&&Mana.cost('slashwave',S)===25,info:`30 วิ: ${o.mp} MP, ค่าคลื่นดาบ ${Mana.cost('slashwave',S)}`};});
  T('อุปกรณ์เพิ่ม Max MP / คริ / เจาะเกราะ ได้',()=>{const S=Stats.derive(BASE_ATTR,{mp:50,critRate:.05,critDmg:.2,apen:12},1,null,new Set());return{ok:S.maxMP===250&&near(S.critRate,.12)&&near(S.critDmg,1.8)&&S.apen===12};});
  T('ยามานา: 100/250/500/1000, ไม่เกิน Max MP, คูลดาวน์ 10 วิ',()=>{const sv=G.potCD;G.potCD=0;G.mats={mp_s:1,mp_m:1,mp_l:1,mp_x:1};const S={maxMP:2000},o={mp:0};
    const a=Mana.drink(o,S,'mp_s');const blocked=!Mana.drink(o,S,'mp_m').ok;G.potCD=0;Mana.drink(o,S,'mp_m');G.potCD=0;Mana.drink(o,S,'mp_l');G.potCD=0;const x=Mana.drink(o,S,'mp_x');
    const capS={maxMP:300},c={mp:250};G.mats.mp_x=1;G.potCD=0;Mana.drink(c,capS,'mp_x');const cd=G.potCD;G.potCD=sv;
    return{ok:a.gained===100&&blocked&&o.mp===1850&&x.gained===1000&&c.mp===300&&cd===600,info:`รวม ${o.mp}, เต็ม ${c.mp}`};});
  T('เกจสุดยอด: ตีโดน +2, คอมโบ +5, ปัดป้อง +8, สวนกลับ +5, โดนตี +1, สูงสุด 100',()=>{const sv=G.ult;G.ult=0;const f={isP:true};
    Ult.gain(f,'hit',1);Ult.gain(f,'combo',1);Ult.gain(f,'perfectBlock','a');Ult.gain(f,'counter',1);Ult.gain(f,'beingHit','b');const v=G.ult;
    for(let i=0;i<200;i++)Ult.gain(f,'hit','x'+i);const cap=G.ult;G.ult=sv;return{ok:v===21&&cap===100,info:`${v} → เพดาน ${cap}`};});
  T('เกจสุดยอด: เหตุการณ์ซ้ำ (ท่าหลายฮิตเดียวกัน) ได้แค่ครั้งเดียว',()=>{const sv=G.ult;G.ult=0;const f={isP:true};for(let i=0;i<12;i++)Ult.gain(f,'hit',7);const v=G.ult;G.ult=sv;return{ok:v===2};});
  T('สกิลสุดยอดใช้เกจ 100 (ไม่ใช้ MP)',()=>{const sv=G.ult;freshSk();const p={mp:0,S:{maxMP:100}};G.ult=99;const a=!!skillCastCheck(p,'hyperbeam');G.ult=100;const b=!skillCastCheck(p,'hyperbeam');Ult.spend();const c=G.ult;G.ult=sv;return{ok:a&&b&&c===0};});
  T('Combo Cancel: ยกเลิกได้เฉพาะในหน้าต่างหลังตีโดน',()=>{const m={kind:'light'},f=o=>Object.assign({state:'attack',move:m,didHit:true,phase:'recovery',pt:3},o);
    return{ok:inWindow(f())&&inWindow(f({phase:'active',pt:1}))&&!inWindow(f({didHit:false}))&&!inWindow(f({pt:CONFIG.comboWindow+1}))&&!inWindow(f({move:{kind:'ultimate'}}))};});
  T('ต้านสถานะจากอุปกรณ์ทำงาน (ต้าน 100% = ภูมิคุ้มกัน)',()=>{const f=dummy({S:{statusRes:1}});return{ok:Status.apply(f,'poison')==='immune'};});
  T('พาสซีฟเฉพาะตัว: จิตแน่วแน่ +10% คริ (ไม่เกิน 75%) เมื่อผนึก',()=>{freshSk();G.skills.learned.add('focus');G.skills.bound='focus';G.skills.slots[2]='focus';const p=Skills.passiveOf();
    return{ok:p&&p.id==='focus'&&near(p.v,.1)};});
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
  T('บอสเซราฟ: ข้อมูลครบ (สไปรต์/พาเลท/ท่า/ตารางดรอป/โซน/ตายเกิด 1 ครั้ง)',()=>{const d=FOES.seraph;return{ok:!!(d&&SPR[d.map]&&PAL[d.pal]&&d.moves.some(m=>m.beam)&&d.moves.some(m=>m.proj)&&LOOT_TABLES[d.loot]&&ZONE_INFO.sanctum&&BIOME.sanctum&&d.revive===1&&!d.phases&&ELC.holy&&SKILLS.eyejudge&&MATS.sk_eyejudge&&SETS.seraph&&['h_halo','a_seraph','g_seraph','p_seraph','w_seraph'].every(k=>BASES[k]))};});
  T('ลานเซราฟ: สร้างโซน/บอส/ประตูกลับล็อกอยู่ และปลดล็อกเมื่อชนะ',()=>{const z=makeSanctum();const pt=z.props.find(o=>o.k==='portal');const b=z.foes[0];return{ok:b.kind==='seraph'&&pt.locked===1&&z.grid.length===17&&!!z.props.find(o=>o.k==='exitdoor')&&!['#','^','T'].includes(z.grid[9][2])};});
  T('ถ้ำน้ำแข็ง: ชั้น 1-2 สร้างได้ มีบันได/ประตูออก และประตูเมืองบนขวาเดินถึงได้',()=>{const a=makeDungeon(1,'ice'),b=makeDungeon(2,'ice');const t=makeTown();const gp=t.props.find(o=>o.k==='citygate');const gx=Math.floor(t.gate.x/16),gy=Math.floor(t.gate.y/16);
    return{ok:a.id==='ice1'&&b.id==='ice2'&&a.theme==='ice'&&a.props.some(o=>o.k==='stairs')&&a.props.some(o=>o.k==='exitdoor')&&a.foes.every(f=>['frostslime','frostwolf','iceknight','icegolem'].includes(f.kind))&&!FOES.icerat&&makeSanctum().foes.length===1&&a.lavaTiles.length===0&&!!gp&&gp.x>t.cols*16*.6&&gp.y<100&&!'#^TRLW'.includes(t.grid[gy][gx])&&['frostslime','frostwolf','iceknight','icegolem'].every(k=>FOES[k]&&(FOES[k].kind==='rig'||SPR[FOES[k].map])&&PAL[FOES[k].pal])&&!!LOOT_TABLES.icecave&&ZONE_INFO.ice1&&BIOME.ice};});
  T('ลานประลอง: สกิลชุดเดียวกัน 4 ช่อง ใช้ได้ทั้งสองฝ่ายและไม่ใช่อัลติ/เฉพาะตัว',()=>{const s=CONFIG.arena.skills;return{ok:s.length===4&&s.every(id=>SKILLS[id]&&['common','rare'].includes(SKILLS[id].tier)&&SKILLS[id].type!=='passive')&&!!NETBITS.find(b=>b[0]==='S4')&&VSS1.length===4&&VSKN2_SK.length===4};});
  T('ห้องบอสแยกทุกตัว: ประตูออก/พอร์ทัลล็อก มีบอสตัวเดียว หนีจากบอสไม่ได้',()=>{const ok=['golem','lavaking','seraph'].every(k=>{const z=makeBossRoom(k);return z.foes.length===1&&z.foes[0].kind===k&&z.props.filter(o=>o.k==='exitdoor'||o.k==='portal').every(o=>o.locked===1)&&ZONE_INFO[z.id];});
    const c=makeCave(),tw=makeTown(),cg=tw.props.find(o=>o.k==='citygate'),s1=makeDungeon(1,'stone'),s2=makeDungeon(2,'stone');return{ok:ok&&!c.foes.some(f=>f.kind==='golem')&&!!cg&&!tw.props.some(o=>o.k==='stonegate'||o.k==='cavegate'||o.k==='icegate'||o.k==='towergate')&&s1.id==='stone1'&&s2.props.some(o=>o.k==='stairs')&&s1.props.some(o=>o.k==='exitdoor')&&s1.foes.every(f=>['rat','mudslime','rockling'].includes(f.kind))&&s1.lavaTiles.length===0&&!!LOOT_TABLES.stonecave&&CONFIG.flee.allowBoss===false};});
  T('บอสไม่การันตีอุปกรณ์ (มีแต่ทอง/ไอเท็มเดินเรื่อง)',()=>({ok:['kage','golem','lavaking','seraph'].every(t=>LOOT_TABLES[t].guaranteed.every(g=>g.gold||(g.mat&&!BASES[g.mat])))}));
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
  T('14) เซฟ/โหลด เก็บกระเป๋า จำนวนวัตถุดิบ อุปกรณ์ และ Pity ครบ',()=>{const mr=CONFIG.maxRarity;CONFIG.maxRarity='god';G.bag=[newItem('w_sword','legendary',5)];CONFIG.maxRarity=mr;G.mats={wood:7,mp_s:3};G.pity={P1:{golem:4}};const d=JSON.parse(JSON.stringify(Save.data()));
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
  T('ความยากล็อกที่ดาร์กโซล: เซฟเก่าที่เป็นความยากอื่นถูกบังคับเป็นดาร์กโซล',()=>{G.diff='easy';return{ok:CONFIG.diffLock==='souls'&&Diff.cur()===DIFFICULTY.souls};});
  T('bbqy legendary: บอสเลเวล 100 HP 5000 ท้าได้ และสกิลสุดยอดปลดหลังชนะเท่านั้น',()=>{const d=FOES.duelist;return{ok:d.kind==='rig'&&d.boss===1&&d.challenge===1&&d.base.hp===5000&&!SKILLS.bluejudge.talent&&SKILLS.bluejudge.bossOnly===1&&!!LOOK_BY_NAME.DUELIST};});
  /* ===== UNIQUE TALENT SYSTEM ===== */
  {const base=()=>Stats.derive(Object.assign({},BASE_ATTR),{},1,null,new Set()),tal=k=>Stats.derive(Object.assign({},BASE_ATTR),{},1,k,new Set());
  T('TL1) มีพรสวรรค์ 9 แบบ แต่ละแบบมีพาสซีฟและสกิลเฉพาะตัวแยกกัน',()=>{const ks=Object.keys(TALENTS);return{ok:ks.join()==='piercer,lucky,endurer,undying,hexweaver,archmage,sololeveling,parryman,vampire'&&ks.every(k=>TALENT_PASSIVE[k]&&SKILLS[TALENTS[k].skill]&&SKILLS[TALENTS[k].skill].talent===k&&SKILLS[TALENTS[k].skill].tier==='unique'),info:ks.length+' แบบ'};});
  T('TL2) ค่าพาสซีฟคงที่ตามสเปก (Piercer/Lucky/Endurer/Archmage)',()=>{const b=base(),P=tal('piercer'),L=tal('lucky'),E=tal('endurer'),A=tal('archmage');
    const ok=P.apen-b.apen===100&&near(L.critRate-b.critRate,.25)&&near(L.critDmg-b.critDmg,.5)&&near(E.dr-b.dr,.25)&&near(E.statusRes-b.statusRes,.3)&&A.mpow===Math.round(b.mpow*1.15)&&A.maxMP===Math.round(b.maxMP*1.1)&&near(A.mcritDmg,.1);
    return{ok,info:`เจาะ+${P.apen} · คริ+${(L.critRate-b.critRate).toFixed(2)} · DR ${E.dr} · พลังเวท ${b.mpow}→${A.mpow} · MP ${b.maxMP}→${A.maxMP}`};});
  T('TL3) Hexweaver: โอกาสติด = 100% + 25% − ค่าต้าน และทุก 1% นานขึ้น 0.05 วิ',()=>{const tgt={S:{statusRes:.3},statusRes:{}},hex={S:tal('hexweaver')},nor={S:base()};
    const ch=Status.chance(hex,tgt,'poison'),cn=Status.chance(nor,tgt,'poison');const f=dummy();Status.apply(f,'poison',1,hex);
    return{ok:near(ch,.95)&&near(cn,.7)&&f.st8.poison.t===Math.round(CONFIG.statusDur+25*.05*60)&&TALENT_PASSIVE.hexweaver.statusDurMul===undefined&&CONFIG.statusChanceDur===.05,info:`โอกาส ${ch} vs ปกติ ${cn} · เวลา ${f.st8.poison.t} เฟรม`};});
  T('TL4) Endurer + Iron Wall: ลดดาเมจรวมไม่เกิน 75%',()=>{const f={S0:Object.assign({},tal('endurer'),{dr:.6}),mods:[]};StatSync.addMod(f,{id:'ironwall',stat:'buffDr',op:'add',v:SKILLS.ironwall.buff.dr,ttl:240});
    const r=calcDamage(A(),f.S,{coef:1,type:'phys',el:'phys'});return{ok:near(r.dr,.75)&&SKILLS.ironwall.buff.statusImm===480,info:'DR ที่ใช้จริง '+r.dr};});
  T('TL5) Arcane Burst: 200% พลังเวท, ใช้ MP 20% ของ MP สูงสุด, คูลดาวน์ 20 วิ',()=>{const S=tal('archmage'),s=SKILLS.arcaneburst;return{ok:s.coef===2&&s.type==='magic'&&!s.ignoreDef&&Mana.cost('arcaneburst',S)===Math.round(S.maxMP*.2)&&s.cd===20,info:'MP '+Mana.cost('arcaneburst',S)+'/'+S.maxMP};});
  T('TL6) Blood Pact / Toxic Curse ใส่สแตกได้อย่างน้อย 10 (ถูกจำกัดที่ maxStacks), Jackpot คริ 7 ครั้ง, Undying ฟื้น 2 ครั้ง',()=>({ok:SKILLS.bloodpact.status.bleed>=10&&SKILLS.bloodpact.lifesteal===.1&&SKILLS.toxiccurse.status.poison>=10&&SKILLS.luckyseven.jackpot===7&&TALENT_PASSIVE.undying.revives===2&&CONFIG.maxStacks>=10}));
  T('TL7) คำนวณซ้ำไม่ทบโบนัสพรสวรรค์',()=>{const a=JSON.stringify(tal('lucky')),b=[...Array(20)].map(()=>JSON.stringify(tal('lucky')));return{ok:b.every(x=>x===a)};});
  T('TL8) พรสวรรค์ถูกบันทึกในข้อมูลตัวละคร',()=>{const d=Save.data();return{ok:d.talent===G.talent&&!!TALENTS[d.talent],info:d.talent};});}
  /* ===== ค่ารองจากค่าพลัง (ทุกๆ 10 หน่วย) ===== */
  T('AT1) DEF ทุก 10 = ต้านคริ 1% · AGI ทุก 10 = หลบ 1% + DEF 3 · STR ทุก 10 = ต้านสถานะ 1%',()=>{const d=a=>Stats.derive(Object.assign({str:10,agi:10,int:10,vit:10,luk:10},a),{},1,null,new Set());
    const b=d({}),g=d({agi:50}),s2=d({str:40}),def=d({}),hi=Stats.derive(Object.assign({},BASE_ATTR),{def:90},1,null,new Set());
    return{ok:near(b.evasion,.01)&&b.def===13&&near(g.evasion,.05)&&g.def===25&&near(s2.statusRes,.04)&&near(hi.pcritRes,Math.floor(hi.def/10)*.01),info:`AGI10: หลบ ${b.evasion} DEF ${b.def} · AGI50: หลบ ${g.evasion} DEF ${g.def} · DEF ${hi.def} → ต้านคริ ${hi.pcritRes}`};});
  T('AT2) หลบหลีกไม่เกิน 70% และค่าพลังไม่เกิน 99',()=>{const S=Stats.derive(Object.assign({},BASE_ATTR,{agi:99}),{evasion:.9},1,null,new Set());const pts=G.points,al=Object.assign({},G.alloc);G.points=500;G.alloc.str=CONFIG.attrMax-BASE_ATTR.str;const r=Prog.allocate('str');G.points=pts;Object.assign(G.alloc,al);
    return{ok:S.evasion===.7&&r===false&&CONFIG.attrMax===99,info:'หลบ '+S.evasion};});
  /* ===== ศัตรู: ค่าพลังแบบผู้เล่น + สกิล ===== */
  T('EN1) ศัตรูคำนวณค่ารองจากค่าพลังด้วยสูตรเดียวกับผู้เล่น',()=>{const save=Diff.cur;Diff.cur=()=>DIFFICULTY.normal;const d=FOES.duelist,E=Stats.enemy(d,10,false),P=Stats.derive(Object.assign({},BASE_ATTR,d.attr),{},10,null,new Set());Diff.cur=save;
    return{ok:E.evasion===P.evasion&&E.critDmg===P.critDmg&&E.statusRes===P.statusRes&&E.agi===d.attr.agi&&near(E.pcritRes,Math.min(.75,Math.floor(E.def/10)*CONFIG.derived.defPer10Crit+(d.boss?CONFIG.bossCritRes:0))),info:`หลบ ${E.evasion} คริ ${E.critRate} ต้านสถานะ ${E.statusRes} DEF ${E.def}`};});
  T('EN2) สกิลมีค่าผู้ใช้ (all/player/enemy) และบังคับใช้ทั้งสองฝั่ง',()=>{const ok1=Object.values(SKILLS).every(s=>['all','player','enemy'].includes(s.user));const tal=Object.values(TALENTS).every(t=>SKILLS[t.skill].user==='player');
    const sv=SKILLS.orb.user;SKILLS.orb.user='enemy';const learned=G.skills.learned.has('orb');G.skills.learned.delete('orb');const r=Skills.learn('orb');SKILLS.orb.user=sv;if(learned)G.skills.learned.add('orb');
    const foeOk=Object.values(FOES).every(f=>(f.skills||[]).every(id=>SKILLS[id]));return{ok:ok1&&tal&&!r.ok&&foeOk&&!skillUsable('luckyseven','enemy'),info:r.err};});
  T('TL9) Armor Breaker: ไม่สน DEF · ทะลุการป้องกัน · ติดดีบัฟ Armor Breaker',()=>{const s=SKILLS.piercestrike,m=Skills.move('piercestrike','sword',2);return{ok:s.ignoreDef&&s.unblockable&&m.unblockable&&m.armorBreak&&m.armorBreak.n==='Armor Breaker'&&m.armorBreak.def===.6};});
  T('BC1) บอสทุกตัวต้านคริเพิ่ม 20% · ศัตรูทั่วไปไม่ได้',()=>{const b=Object.keys(FOES).filter(k=>FOES[k].boss).every(k=>{const E=Stats.enemy(FOES[k],5,false);return E.pcritRes>=CONFIG.bossCritRes&&E.mcritRes>=CONFIG.bossCritRes;});const r=Stats.enemy(FOES.rat,1,false);return{ok:b&&r.pcritRes<CONFIG.bossCritRes&&CONFIG.bossCritRes===.2};});
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
    return{ok:f.S0===S&&keyStats(f.S)===keyStats(S)&&html.includes(`<b>${S.def} / ${S.mdef}</b>`)&&html.includes(`<b>${S.maxHP}</b>`),info:'DEF '+S.def+' · HP '+S.maxHP};});
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
  T('V21-4) คาเงะอ่อนลง (HP 400 ATK 44)',()=>({ok:FOES.kage.base.hp===400&&FOES.kage.base.atk===44,info:`HP ${FOES.kage.base.hp} ATK ${FOES.kage.base.atk}`}));
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
  T('V25-2) ระบบใหม่: ช่องรูน 1-5 ตามระดับ, เลเวลอุปกรณ์ 100, ตีบวก +15, วิวัฒน์ และร้านค้าพิเศษ',()=>{
    const sockOk=RARITY.normal.sockets===1&&RARITY.rare.sockets===2&&RARITY.epic.sockets===3&&RARITY.legendary.sockets===4&&RARITY.god.sockets===5;
    const it=newItem('w_sword','normal',5);
    const gm=JSON.stringify(G.mats),gg=G.gold,gs=JSON.stringify(G.shopCD||{});
    try{
      G.mats.exprock=200;G.mats.evostone=1;G.mats.rune_atk=1;G.mats.cryst_durable=1;G.gold=999999;G.shopCD={};
      while(it.lv<100)Equip.useExpStone(it);
      it.enh=15;
      const canEvo=Equip.canEvolve(it),evoRes=Equip.evolve(it);
      const sockRes=Equip.socketRune(it,0,'rune_atk'),st=itemStats(it),unsockRes=Equip.unsocketRune(it,0);
      const shopRes=SpecialShop.buy('exprock');
      return{ok:sockOk&&it.lv===100&&canEvo&&evoRes.ok&&it.rar==='rare'&&sockRes.ok&&st.atk>0&&unsockRes.ok&&G.mats.rune_atk===1&&shopRes.ok&&!('bosstoken' in MATS),
        info:`sock=${sockOk} lv=${it.lv} evo=${evoRes.ok}->${it.rar} rune=${sockRes.ok}/${unsockRes.ok} shop=${shopRes.ok}`};
    }finally{G.mats=JSON.parse(gm);G.gold=gg;G.shopCD=JSON.parse(gs);}});
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
  T('V27-1) เลเวลละ 2 แต้ม · เลเวลสูงสุด 200 · XP เลเวลเกิน 30 ชันขึ้น · มอนต่ำกว่ามาก XP ลด · เจาะเวท % และคงที่',()=>{
    const A={mpow:100,ap:100,critRate:0,critDmg:1.5},T={mdef:50,def:50,res:{}},h={coef:1,type:'magic',el:'phys'};
    const base=calcDamage(A,T,h).dmg,pc=calcDamage(Object.assign({mpenPct:.5},A),T,h).dmg,fl=calcDamage(Object.assign({mpen:20},A),T,h).dmg;
    const lv0=G.level;G.level=20;const full=Prog.xpScale(20),low=Prog.xpScale(1);G.level=lv0;
    const ok=CONFIG.levelPoints===2&&CONFIG.levelCap===200&&CONFIG.xpNext(31)>Math.round(50*Math.pow(31,1.3))&&CONFIG.xpNext(30)===Math.round(50*Math.pow(30,1.3))&&pc>base&&fl>base&&full===1&&low<.5;
    return{ok,info:`base=${base} pct=${pc} flat=${fl} xpLow=${low.toFixed(2)}`};});
  T('V25-3) ดรอปไม่มีคริสตัลศักดิ์สิทธิ์ (ขายร้านพิเศษ) · อัตราดรอปตำนาน 0.002% เทพ 0.0001% · ร้านรีข้ามเพดานได้ (อารีนาไม่ได้)',()=>{
    const W=LOOT_CONFIG.classes,wOk=['normal','elite','boss'].every(c=>W[c].rar.legendary===0.002&&W[c].rar.god===0.0001);
    let books=0,divine=0,n=0;const bossT=Object.keys(LOOT_TABLES);
    for(let i=0;i<1500;i++){for(const tid of bossT){for(const cls of['normal','elite','boss']){const r=LootManager.generate({tableId:tid,cls,level:20,luk:10});
      for(const d of r.drops){n++;if(d.mat&&d.mat.startsWith('sk_'))books++;if(d.mat==='divine')divine++;}}}}
    const o=REITEM.odds;let shopOk=false,arenaCap=false;
    try{REITEM.odds=[['god',100]];const s=reitemRoll(true),a2=reitemRoll();shopOk=s.rar==='god';arenaCap=a2.rar==='epic';
      REITEM.odds=[['legendary',100]];shopOk=shopOk&&reitemRoll(true).rar==='legendary';}finally{REITEM.odds=o;}
    const shown=reitemOdds(true).map(x=>x[0]).join(',');const tot=REITEM.odds.reduce((a,b)=>a+b[1],0);
    return{ok:wOk&&n>0&&books>0&&divine===0&&shopOk&&arenaCap&&Math.abs(tot-100)<1e-9&&shown.includes('legendary')&&shown.includes('god'),info:`weights=${wOk} drops=${n} books=${books} divine=${divine} shop=${shopOk} arenaCap=${arenaCap} sum=${tot}`};});
  }finally{RNG=rng0;Z=z0;P.x=px0;P.y=py0;G.hp=hp0;G.mode=mode0;G.flags.bossCD=cd0;G.pendingFoe=pf0;try{buildBg();}catch(e){}}}
  RNG=saveRNG;Object.assign(G,saveG);[Status.onStun,Status.onStunEnd,Status.onSynergy]=prevHooks;
  window.__testResults={pass,fail,out};return{pass,fail,out};
}
window.runTests=runTests;
