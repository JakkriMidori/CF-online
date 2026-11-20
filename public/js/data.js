'use strict';
/* ============================================================
   DATA — every gameplay number lives here (Data Table equivalents)
   ============================================================ */
const CONFIG={
  statusDur:180,            // 3 s (frames @60fps) — default duration for all statuses
  dotTick:60,               // DOT ticks once per second
  dot:{poison:{base:50,per:15},bleed:{base:60,per:20},burn:{base:80,per:0},shock:{base:50,per:0}},   // ดาเมจต่อวินาที: base + per × (สแตก−1) · พิษ 50→185 · เลือดออก 60→240 · เผาไหม้ 80 · ช็อต 50
  maxStacks:10,   // พิษ/เลือดออก ซ้อนได้สูงสุด 10 (สกิล Blood Pact / Toxic Curse ใส่ 10 สแตก)
  stunImmuneAfter:300,      // CC-loop guard: stun immunity after a stun ends (frames)
  critCap:.75, critDmgCap:3.5, drCap:.75 /* spec v3: 75% (was 70%) */, stunBonus:.20,
  comboWindow:14,           // frames after hit-confirm (into recovery) that accept the next combo step
  comboFailPenalty:14,      // extra recovery frames on a mistimed combo input
  fullComboBonus:.20,
  dashCD:90,dashFrames:16,dashSpeed:7,   // พุ่ง 16 เฟรม × 7 = ~110 พิกเซล ทะลุตัวศัตรูได้
    // พุ่งหลบ (Space): คูลดาวน์ 1.5 วิ · อมตะตลอด 18 เฟรม
  levelPoints:2,             // แต้มค่าพลังต่อเลเวล
  enemyStartupMul:.65,       // มอนสเตอร์ทั่วไป/หัวหน้า (ยกเว้น bbqy): ออกท่าและฟื้นตัวเร็วขึ้น 35%
  levelCap:200,             // เลเวลสูงสุด 200 (เมืองแรกจบที่ราว Lv.28-30 หลังจากนั้นเลเวลขึ้นช้าลงเรื่อย ๆ)
  craftRates:{normal:.50,rare:.30,epic:.20,legendary:.20,god:.10},
  maxRarity:'epic',         // ระดับไอเทมสูงสุดที่สร้าง/ดรอปได้ตอนนี้ (ตำนาน/เทพ จะเพิ่มภายหลัง)  // base success (fixed)
  craftBoost:.20,           // Divine Crafting Crystal: +20 percentage points, max one per attempt, final chance capped at 100%
  craftSlots:6,
  enhanceRates:[1,.95,.90,.85,.80,.75,.70,.65,.60,.55,.50,.47,.44,.42,.40],  // โอกาสสำเร็จจาก +n ไป +n+1 (n=0..14) สูงสุด +15 · ลดลงเรื่อย ๆ ต่ำสุด 40%
  equipExp:{maxLv:100,kill:{normal:[100,150],elite:[280,420],boss:[1000,1500]},stone:1000,
    next(lv){if(lv>=100)return 0;if(lv<=20)return Math.round(100+(lv-1)*(200/19));if(lv<=40)return Math.round(350+(lv-21)*(250/19));if(lv<=60)return Math.round(650+(lv-41)*(350/19));if(lv<=80)return Math.round(1100+(lv-61)*(400/19));return Math.round(1600+(lv-81)*(600/18));}},
  regen:{sta:24},           // stamina per second
  mana:{combatEvery:180,outEvery:90,recoveryCap:.30,costCap:.30},   // 1 MP / 3 s in combat, 1 MP / 1.5 s outside; gear bonus caps 30%
  potionCD:600,             // 10 s shared mana-potion cooldown
  ult:{max:100,hit:2,combo:5,perfectBlock:8,counter:5,beingHit:1,cost:100},
  staCost:{dash:10,dodge:20,heavy:10},
  xpNext:l=>Math.round(50*Math.pow(l,1.3)*(l>30?1+(l-30)*.05:1)),   // เส้นทางเมืองแรก: เคลียร์ครบ 1 รอบ ≈ Lv.28 (เพดาน 30)
  respawnFrames:3600,
  // ค่าพลังหลัก & ค่ารอง (ทุกๆ 10 หน่วย)
  attrMax:99,                  // STR/AGI/INT/VIT/LUK สูงสุด 99
  derived:{defPer10Crit:.01,   // DEF ทุก 10 → ต้านคริติคอลกายภาพ +1% (M.DEF ทุก 10 → ต้านคริเวท +1%)
           agiPer10Eva:.01,    // AGI ทุก 10 → หลบหลีก +1%
           agiPer10Def:3,      // AGI ทุก 10 → DEF +3
           strPer10Res:.01,    // STR ทุก 10 → ต้านสถานะผิดปกติ +1%
           evaCap:.70},        // หลบหลีกสูงสุด 70%
  statusChanceDur:.05,         // โอกาสติดสถานะทุก 1% → สถานะที่ใส่นานขึ้น 0.05 วิ
  guard:{max:4,breakT:480},
  playerJuggleMax:3,
  bossCritRes:.20,             // บอสทุกตัว: ต้านคริติคอล (กาย/เวท) เพิ่ม 20%           // ศัตรูตีผู้เล่นลอยกลางอากาศได้สูงสุดกี่ฮิต   // ป้องกันได้ 4 ครั้ง ครั้งที่ 4 การ์ดแตก ป้องกันไม่ได้ 8 วิ · ปัดป้องติด = รีเซ็ตกลับเป็น 4
  skillBuffer:24,   // เฟรมที่จำการกดสกิลไว้ ถ้ากดตอนยังขยับไม่ได้ (0.4 วิ)
  arena:{level:10,alloc:6,hp:400,def:12,rounds:2,weapon:'sword',skills:['cuttingwind','thunderclap','guardbreak','flamepillar']},   // ตัวเลือก B: สกิล 4 ช่องเท่ากันทั้งสองฝ่าย (ไม่ใช้สกิลเฉพาะตัว)
     // ลานประลอง: ค่าพลังเท่ากันทั้งสองฝ่าย (แข่งกันที่ฝีมือ) — ชนะ 2 ใน 3 ยก
  diffLock:'souls',   // ล็อกความยากไว้ที่ดาร์กโซลเท่านั้น (ตั้งเป็น null เพื่อให้เลือกได้อีก)
  flee:{chance:.50,cooldown:180,failStagger:36,safeFrames:240,allowBoss:false}   // หลบหนี: โอกาส 50%, ล้มเหลว = เซ 0.6 วิ + รอ 3 วิ, สำเร็จ = ศัตรูไม่ไล่ 4 วิ
};
const ELEM_PROC={fire:{s:'burn',c:.25},lightning:{s:'shock',c:.12},poison:{s:'poison',c:.35},shadow:{s:'bleed',c:.25},ice:{s:'freeze',c:.25}};
const ELN={phys:'กายภาพ',fire:'ไฟ',lightning:'สายฟ้า',poison:'พิษ',shadow:'เงา',holy:'แสง',arcane:'อาคม',ice:'น้ำแข็ง'};
const ELC={phys:'#dddddd',fire:'#ff7a2a',lightning:'#9fe6ff',poison:'#8aff5a',shadow:'#b08aff',holy:'#fff2a8',arcane:'#d88aff',ice:'#bff0ff'};
const STN={poison:'พิษ',bleed:'เลือดออก',burn:'เผาไหม้',shock:'ช็อก',stun:'มึนงง',blind:'ตาบอด',chaos:'โกลาหล',freeze:'แช่แข็ง'};
const STI={poison:'☠',bleed:'🩸',burn:'🔥',shock:'⚡',stun:'💫',blind:'🌑',chaos:'🌀',freeze:'❄️'};
const STC={poison:'#8aff5a',bleed:'#ff4a5a',burn:'#ff8a3a',shock:'#9fe6ff',stun:'#ffe27a',blind:'#b08aff',chaos:'#ff5ad8',freeze:'#8ef2ff'};

/* ---------- moves (frame data). dmg = power coefficient ×10 ---------- */
function M(n,s,a,r,dmg,reach,kb,hs,o={}){return Object.assign({n,s,a,r,dmg,reach,kb,hs,hy:62,hh:56},o);}
const WEAPONS={
  fist:{n:'มือเปล่า',col:'#f2c9a0',fx:'#ffffff',len:0,el:'phys',
    light:[M('หมัดซ้าย',4,2,9,4,34,1,14,{anim:'jab'}),M('หมัดขวา',5,2,10,5,38,1,15,{anim:'straight'}),M('อัปเปอร์คัต',6,3,16,7,34,2,22,{anim:'upper',hy:80,hh:80,launch:1})],
    heavy:M('หมัดทะลวง',11,3,18,11,40,4,24,{anim:'straight',kd:1})},
  club:{n:'กระบองรากไม้',col:'#8a5a32',fx:'#e8c89a',len:10,shape:'club',el:'phys',
    light:[M('ฟาดซ้าย',6,3,12,6,50,2,16,{anim:'slash'}),M('ฟาดขวา',6,3,14,7,50,2,18,{anim:'slash2'})],
    heavy:M('ทุบลงพื้น',14,4,22,14,54,5,28,{anim:'heavyslash',kd:1})},
  sword:{n:'ดาบเหล็กโบโร',col:'#d8dde6',fx:'#ffffff',len:13,shape:'sword',el:'phys',
    light:[M('ฟันเฉียง',5,3,10,5,58,1,15,{anim:'slash'}),M('ฟันกลับ',5,3,10,5,58,1,15,{anim:'slash2'}),M('แทงตรง',6,3,15,8,64,3,22,{anim:'thrust',launch:1})],
    heavy:M('ฟันผ่าหิน',13,4,20,14,62,5,28,{anim:'heavyslash',kd:1})},
  woodsword:{n:'ดาบไม้ฝึกหัด',col:'#9c6a38',fx:'#e8c89a',len:13,shape:'sword',el:'phys',
    light:[M('ฟันเฉียง',5,3,10,5,58,1,15,{anim:'slash'}),M('ฟันกลับ',5,3,10,5,58,1,15,{anim:'slash2'}),M('แทงตรง',6,3,15,8,64,3,22,{anim:'thrust',launch:1})],
    heavy:M('ฟันผ่าหิน',13,4,20,14,62,5,28,{anim:'heavyslash',kd:1})},
  stonesword:{n:'ดาบหิน',col:'#8a867e',fx:'#d8d4ca',len:13,shape:'sword',el:'phys',
    light:[M('ฟันหิน',5,3,10,5,58,1,15,{anim:'slash'}),M('ฟันกลับ',5,3,10,5,58,1,15,{anim:'slash2'}),M('แทงตรง',6,3,15,8,64,3,22,{anim:'thrust',launch:1})],
    heavy:M('ฟันผ่าหิน',13,4,20,14,62,5,28,{anim:'heavyslash',kd:1})},
  bbqysword:{n:'Chaos Blade Legendary Sword',col:'#28144a',fx:'#a64df0',len:17,shape:'chaosblade',el:'lightning',
    light:[M('ฟันเฉียง',5,3,10,5,60,1,15,{anim:'slash'}),M('ฟันกลับ',5,3,10,5,60,1,15,{anim:'slash2'}),M('แทงตรง',6,3,15,8,66,3,22,{anim:'thrust',launch:1})],
    heavy:M('ฟันผ่าหิน',13,4,20,14,64,5,28,{anim:'heavyslash',kd:1})},
  spear:{n:'หอกเขี้ยวถ้ำ',col:'#e8dcc0',fx:'#fff4d0',len:18,shape:'spear',thrust:1,el:'poison',
    light:[M('แทงเร็ว',4,2,9,4,76,1,13,{anim:'thrust'}),M('แทงคู่',4,2,9,4,76,1,13,{anim:'thrust'}),M('แทงงัด',6,3,14,6,74,2,20,{anim:'thrust',launch:1})],
    heavy:M('แทงพุ่ง',10,6,22,12,82,5,26,{anim:'thrust',lunge:3,kd:1})},
  flame:{n:'ดาบถ่านแดง',col:'#ff8a3a',fx:'#ffb060',len:14,shape:'flame',el:'fire',
    light:[M('ฟันเพลิง',5,3,10,6,60,1,15,{anim:'slash'}),M('ฟันเพลิงกลับ',5,3,10,6,60,1,15,{anim:'slash2'}),M('จุดระเบิด',7,3,15,9,66,3,22,{anim:'thrust',launch:1})],
    heavy:M('เปลวพิฆาต',13,5,20,16,64,5,28,{anim:'heavyslash',kd:1})},
  gaunt:{n:'สนับมือฟ้าคำราม',col:'#7fd8ff',fx:'#c8f2ff',len:0,shape:'gaunt',el:'lightning',
    light:[M('หมัดสายฟ้า 1',3,2,7,3,34,0,12,{anim:'jab'}),M('หมัดสายฟ้า 2',3,2,7,3,36,0,12,{anim:'straight'}),M('หมัดสายฟ้า 3',3,2,7,3,34,0,12,{anim:'jab'}),M('ฟ้าผ่าเปิด',5,3,14,7,36,2,22,{anim:'upper',hy:80,hh:80,launch:1})],
    heavy:M('หมัดฟ้าคำราม',9,4,16,12,38,3,26,{anim:'upper',hy:80,hh:80,launch:1})},
  firepan:{n:'กระทะเพลิงมรดกพ่อ',col:'#3a3a40',fx:'#ff9a3a',len:10,shape:'pan',pan:1,el:'fire',
    light:[M('ฟาดกระทะ',7,3,12,9,50,3,20,{anim:'slash'}),M('พลิกกระทะ',7,3,14,10,50,3,22,{anim:'slash2',launch:1})],
    heavy:M('โป๊ก!',12,4,20,20,54,6,34,{anim:'heavyslash',kd:1})},
  hammer:{n:'ค้อนชีสหินผา',col:'#8a5a32',fx:'#ffe58a',len:11,shape:'hammer',hammer:1,el:'phys',
    light:[M('ทุบชีส',8,4,14,8,52,3,20,{anim:'slash'}),M('ทุบชีสซ้ำ',8,4,16,9,52,3,22,{anim:'slash2'})],
    heavy:M('ชีสถล่ม',16,5,24,20,58,6,34,{anim:'heavyslash',kd:1})},
  kageblade:{n:'ดาบเงาจันทร์มืด',col:'#4a4a5e',fx:'#b08aff',len:14,shape:'katana',el:'shadow',
    light:[M('ฟันเงา',5,3,11,5,60,1,15,{anim:'slash'}),M('ฟันเงากลับ',5,3,11,5,60,1,15,{anim:'slash2'}),M('แทงเงา',7,3,16,8,66,3,22,{anim:'thrust'})],
    heavy:M('ผ่าเงา',14,4,22,13,64,5,28,{anim:'heavyslash',kd:1})},
  lavablade:{n:'ดาบหัวใจภูเขาไฟ',col:'#ff5a1a',fx:'#ffe06a',len:16,shape:'greatsword',el:'fire',
    light:[M('ฟันลาวา',5,3,10,6,66,1,15,{anim:'slash'}),M('ฟันลาวากลับ',5,3,10,6,66,1,15,{anim:'slash2'}),M('ปะทุ',6,3,14,9,72,3,22,{anim:'thrust',launch:1})],
    heavy:M('ภูเขาไฟระเบิด',13,5,20,18,70,5,28,{anim:'heavyslash',kd:1})},
  mswd:{n:'ดาบมนตรา',col:'#b08aff',fx:'#e0c8ff',len:14,shape:'magicsword',el:'arcane',
    light:[M('ฟันเวท',5,3,10,6,60,1,15,{anim:'slash'}),M('ฟันเวทกลับ',5,3,10,6,60,1,15,{anim:'slash2'})],
    heavy:M('คลื่นพลังเวท',12,4,18,12,0,2,20,{anim:'heavyslash',type:'magic',proj:{spd:5,r:12,hits:1}})},
  mstaff:{n:'คทาดาราจักร',col:'#7a5ad8',fx:'#d8c0ff',len:15,shape:'staff',el:'arcane',
    light:[M('ลูกบอลเวท',6,3,12,8,0,1,14,{anim:'thrust',type:'magic',proj:{spd:6,r:8,hits:1}}),M('ลูกบอลเวทซ้ำ',6,3,12,8,0,1,14,{anim:'thrust',type:'magic',proj:{spd:6,r:8,hits:1}})],
    heavy:M('ลำแสงเวททะลุ',14,6,20,16,0,2,24,{anim:'thrust',type:'magic',proj:{spd:8,r:10,hits:3}})},
  adagger:{n:'กริชอาคมพราย',col:'#9a6ad0',fx:'#e0c8ff',len:9,shape:'dagger',el:'arcane',
    light:[M('กรีดเร็ว',3,2,6,4,46,0,10,{anim:'thrust'}),M('กรีดเร็ว 2',3,2,6,4,46,0,10,{anim:'thrust'}),M('กรีดเร็ว 3',3,2,7,5,48,1,12,{anim:'thrust'})],
    heavy:M('กรีดอาคม',6,3,12,10,50,2,22,{anim:'slash'})},
  wand_fire:{n:'ไม้เท้าเปลวอัคคี',col:'#ff6a2a',fx:'#ffb060',len:9,shape:'wand',el:'fire',
    light:[M('ลูกไฟ',5,3,10,7,0,1,14,{anim:'thrust',type:'magic',proj:{spd:6,r:8,hits:1}})],
    heavy:M('ระเบิดเพลิง',12,5,18,14,0,3,24,{anim:'thrust',type:'magic',proj:{spd:4.5,r:14,hits:1}})},
  wand_ice:{n:'ไม้เท้าเกล็ดหิมะ',col:'#9fe8ff',fx:'#e0f8ff',len:9,shape:'wand',el:'ice',
    light:[M('ลูกน้ำแข็ง',5,3,10,7,0,1,14,{anim:'thrust',type:'magic',proj:{spd:6,r:8,hits:1}})],
    heavy:M('พายุหิมะ',12,5,18,14,0,3,24,{anim:'thrust',type:'magic',proj:{spd:4.5,r:14,hits:1}})},
  wand_lightning:{n:'ไม้เท้าอสนีบาต',col:'#9fe6ff',fx:'#e8f8ff',len:9,shape:'wand',el:'lightning',
    light:[M('ลูกสายฟ้า',4,2,9,7,0,1,14,{anim:'thrust',type:'magic',proj:{spd:8,r:6,hits:1}})],
    heavy:M('สายฟ้าแตกกระจาย',12,5,18,14,0,3,24,{anim:'thrust',type:'magic',proj:{spd:7,r:10,hits:2}})},
  scythe:{n:'เคียวสุญญตา',col:'#cfc8e8',fx:'#9a7ad8',len:16,shape:'scythe',el:'shadow',
    light:[M('ฟันความว่าง',6,4,12,8,66,2,18,{anim:'heavyslash'}),M('ฟันความว่างกลับ',6,4,12,8,66,2,18,{anim:'slash2'})],
    heavy:M('เคียวกลืนเงา',14,5,22,18,72,5,28,{anim:'heavyslash',kd:1})},
  gsword:{n:'ดาบใหญ่สองมือ',col:'#c8ccd8',fx:'#ffffff',len:19,shape:'greatsword',twoHand:1,el:'phys',   // ถือ 2 มือ: ช้าแต่แรง
    light:[M('ฟันกวาด',10,4,18,12,76,3,22,{anim:'slash'}),M('ฟันกวาดกลับ',11,4,20,14,76,3,24,{anim:'slash2'})],
    heavy:M('ผ่าปฐพี',18,6,26,24,82,6,34,{anim:'heavyslash',kd:1})},
  ghammer:{n:'ค้อนศึกสองมือ',col:'#9aa0ae',fx:'#ffe58a',len:17,shape:'warhammer',twoHand:1,el:'phys',  // ถือ 2 มือ: ช้าแต่แรง + มีโอกาสสตัน 3 วิ
    light:[M('ทุบเหวี่ยง',11,4,20,13,68,4,24,{anim:'slash',stunChance:.2,stunDur:3}),M('ทุบเหวี่ยงกลับ',12,4,22,15,68,4,26,{anim:'slash2',stunChance:.2,stunDur:3})],
    heavy:M('ทุบสะเทือนพื้น',20,6,28,26,74,7,36,{anim:'heavyslash',kd:1,stunChance:.35,stunDur:3})},
  wand_poison:{n:'ไม้เท้าปรอท',col:'#9ae8b0',fx:'#d0ffe0',len:10,shape:'wand',el:'poison',
    light:[M('ลูกปรอท',5,3,10,7,0,1,14,{anim:'thrust',type:'magic',proj:{spd:6,r:8,hits:1},status:{poison:1}})],
    heavy:M('หมอกปรอท',12,5,18,14,0,3,24,{anim:'thrust',type:'magic',proj:{spd:4,r:14,hits:2},status:{poison:2}})},
  frostsword:{n:'ดาบเกล็ดน้ำแข็ง',col:'#8ee4ff',fx:'#e8fbff',len:14,shape:'sword',el:'ice',
    light:[M('ฟันเยือกแข็ง',5,3,10,6,60,1,15,{anim:'slash'}),M('ฟันสะท้อนน้ำแข็ง',5,3,10,6,60,1,15,{anim:'slash2'}),M('แทงทะลุน้ำแข็ง',6,3,15,9,66,3,22,{anim:'thrust',launch:1})],
    heavy:M('ผ่าหิมะ',13,5,20,16,64,5,28,{anim:'heavyslash',kd:1})},
  frostaxe:{n:'ขวานศึกเหมันต์',col:'#7ad8ff',fx:'#ffffff',len:16,shape:'axe',twoHand:1,el:'ice',
    light:[M('ฟันขวานน้ำแข็ง',9,4,16,11,70,3,22,{anim:'slash'}),M('เหวี่ยงขวานย้อน',10,4,18,13,70,3,24,{anim:'slash2'})],
    heavy:M('ทุบพสุธาน้ำแข็ง',17,6,24,23,76,6,34,{anim:'heavyslash',kd:1})}
};
const UNI={
  cjab:M('หมัดต่ำ',4,2,8,3,36,1,12,{anim:'cjab',hy:40,hh:34,crouch:1}),
  kick:M('เตะสูง',8,3,14,7,50,3,18,{anim:'kick',hy:66,hh:44}),
  sweep:M('กวาดขา',7,3,17,6,52,2,20,{anim:'sweep',hy:8,hh:18,low:1,kd:1,crouch:1}),
  apunch:M('หมัดกลางอากาศ',4,5,8,5,38,2,14,{anim:'airpunch',hy:36,hh:56,air:1,over:1}),
  akick:M('ถีบดิ่ง',6,7,8,7,42,3,16,{anim:'airkick',hy:12,hh:46,air:1,over:1})
};
for(const w of Object.values(WEAPONS)){w.light.forEach((m,i)=>{m.kind='light';m.idx=i;m.tok='L'+(i+1);m.combo=1;});w.heavy.kind='heavy';w.heavy.tok='H';w.heavy.combo=1;w.heavy.sta=CONFIG.staCost.heavy;}
UNI.cjab.kind='light';UNI.cjab.idx=99;UNI.cjab.tok='C';UNI.kick.kind='kick';UNI.kick.tok='K';UNI.sweep.kind='kick';UNI.sweep.tok='D';
UNI.apunch.kind='light';UNI.apunch.tok='AJ';UNI.akick.kind='kick';UNI.akick.tok='AK';for(const m of Object.values(UNI))m.combo=1;
const RANK={light:0,kick:1,heavy:1,skill:2,ultimate:3};

/* ---------- skills: 4 slots (Common / Rare / Unique / Ultimate) ---------- */
const TIERS=['common','rare','unique','ultimate'];
const TIERN={common:'ทั่วไป',rare:'หายาก',unique:'เฉพาะตัว',ultimate:'สุดยอด'};
/* SKILL DATABASE — 10 per tier.
   ⚠ The spec referenced "approved skill definitions and values" that were not supplied, so every number below is a
   PLACEHOLDER within the spec's MP ranges (Common 30-50, Rare 60-100, Unique active 40-60, Unique passive 0,
   Ultimate = 100 Ultimate Gauge / 0 MP). Replace these rows with the approved table; no other code needs to change. */
const SKILLS={
  // ---- Common (MP 30-50) ----
  orb:{ic:'🔮',n:'ลูกพลังวิญญาณ',tier:'common',type:'magic',el:'weapon',coef:1.4,cd:3,mp:30,range:'ไกล (กระสุน)',anim:'cast',proj:{spd:4.6,r:8,hits:1},combo:1,desc:'ยิงลูกพลังตามธาตุของอาวุธ'},
  poisondart:{ic:'💉',n:'เข็มพิษ',tier:'common',type:'phys',el:'poison',coef:.6,cd:5,mp:30,range:'ไกล (กระสุนเร็ว)',anim:'jab',proj:{spd:7,r:4,hits:1},status:{poison:2},combo:1,desc:'ติดพิษ 2 สแตกทันที'},
  slashwave:{ic:'🌊',n:'คลื่นดาบ',tier:'common',type:'phys',el:'weapon',coef:1.2,cd:4,mp:35,range:'ไกล',anim:'heavyslash',proj:{spd:5.5,r:12,hits:1},combo:1,desc:'ฟันส่งคลื่นพุ่งตรง'},
  emberbolt:{ic:'🔥',n:'ลูกไฟถ่าน',tier:'common',type:'magic',el:'fire',coef:1.1,cd:4,mp:35,range:'ไกล (กระสุน)',anim:'cast',proj:{spd:4.2,r:9,hits:1},status:{burn:1},combo:1,desc:'ลูกไฟเล็ก ทำให้เผาไหม้'},
  sparkfist:{ic:'✨',n:'หมัดประกายไฟ',tier:'common',type:'phys',el:'lightning',coef:1.3,cd:4,mp:35,range:'ใกล้ (44)',anim:'straight',reach:44,combo:1,desc:'หมัดธาตุสายฟ้า มีโอกาสช็อกตามธาตุ'},
  shadowstep:{ic:'👣',n:'ก้าวเงา',tier:'common',type:'phys',el:'shadow',coef:1.4,multi:2,cd:5,mp:40,range:'พุ่ง (40)',anim:'rush',lunge:2.6,reach:40,combo:1,desc:'พุ่งทะลวง 2 ฮิต'},
  rockthrow:{ic:'🪨',n:'ขว้างศิลา',tier:'common',type:'phys',el:'phys',coef:1.5,cd:6,mp:40,range:'ไกล (กระสุนช้า)',anim:'cast',proj:{spd:3.4,r:10,hits:1},combo:1,desc:'ขว้างหินก้อนใหญ่ กระแทกแรง'},
  venomslash:{ic:'🐍',n:'ฟันอสรพิษ',tier:'common',type:'phys',el:'poison',coef:1.2,cd:5,mp:40,range:'ใกล้ (54)',anim:'heavyslash',reach:54,status:{poison:1},combo:1,desc:'ฟันหนัก ติดพิษ 1 สแตก'},
  cuttingwind:{ic:'🍃',n:'สายลมคมกริบ',tier:'common',type:'phys',el:'phys',coef:1.3,cd:5,mp:45,range:'ใกล้ (64)',anim:'thrust',reach:64,status:{bleed:1},combo:1,desc:'แทงไกล ทำให้เลือดออก 1 สแตก'},
  spiritpalm:{ic:'✋',n:'ฝ่ามือวิญญาณ',tier:'common',type:'magic',el:'weapon',coef:1.6,cd:6,mp:50,range:'ใกล้ (40)',anim:'cast',reach:40,kd:1,combo:1,desc:'ฝ่ามือพลังเวท กระแทกล้ม'},
  slashcut:{ic:'⚔️',n:'Slash',tier:'common',type:'phys',el:'phys',coef:1.8,multi:4,cd:8,mp:5,range:'ใกล้ (72) 4 ฮิต',anim:'rush',reach:72,lunge:1.1,slashFx:1,combo:1,desc:'ฟันเสี้ยวแสงพิกเซลต่อเนื่อง 4 ครั้งรวด (CD 8 วิ · 5 MP)'},
  // ---- Rare (MP 60-100) ----
  rising:{ic:'🐉',n:'หมัดมังกรฟ้า',tier:'rare',type:'phys',el:'phys',coef:1.8,cd:6,mp:60,range:'ใกล้ (36)',anim:'rising',reach:36,hy:72,hh:96,launch:1,rise:6.6,inv:1,combo:1,desc:'อัปเปอร์คัตกระโดด อมตะช่วงเริ่ม ตีลอย'},
  rushkick:{ic:'🦶',n:'ลูกเตะพายุ',tier:'rare',type:'phys',el:'phys',coef:2.1,multi:3,cd:7,mp:65,range:'ใกล้ (44) พุ่ง',anim:'rush',kicks:1,lunge:3.2,reach:44,combo:1,desc:'พุ่งเตะต่อเนื่อง 3 ครั้ง'},
  thunderclap:{ic:'⚡',n:'สายฟ้าฟาด',tier:'rare',type:'magic',el:'lightning',coef:1.6,cd:10,mp:80,range:'กลาง (100)',anim:'cast',strike:100,status:{shock:1},combo:1,desc:'สายฟ้าผ่าเป้าหมายด้านหน้า ทำให้ช็อก + มึน 3 วินาที'},
  flamepillar:{ic:'🌋',n:'เสาเพลิง',tier:'rare',type:'magic',el:'fire',coef:2.0,cd:9,mp:75,range:'กลาง (90)',anim:'cast',strike:90,status:{burn:1},combo:1,desc:'เสาไฟพุ่งจากพื้นใต้เป้าหมาย'},
  bloodmoon:{ic:'🩸',n:'จันทร์โลหิต',tier:'rare',type:'phys',el:'shadow',coef:2.2,cd:9,mp:80,range:'ใกล้ (60)',anim:'heavyslash',reach:60,status:{bleed:3},combo:1,desc:'ฟันจันทร์เสี้ยว เลือดออก 3 สแตก'},
  toxiccloud:{ic:'☠️',n:'หมอกพิษ',tier:'rare',type:'magic',el:'poison',coef:1.6,multi:4,cd:10,mp:85,range:'ทั้งพื้นที่ (พื้นดิน)',anim:'cast',rain:1,status:{poison:2},combo:1,desc:'หมอกพิษปกคลุมพื้น 4 ฮิต'},
  twinfang:{ic:'🐺',n:'เขี้ยวคู่',tier:'rare',type:'phys',el:'phys',coef:2.4,multi:4,cd:8,mp:70,range:'พุ่ง (46)',anim:'rush',lunge:2.2,reach:46,status:{bleed:1},combo:1,desc:'จู่โจมต่อเนื่อง 4 ครั้ง'},
  acidflask:{ic:'🧪',n:'ขวดกรด',tier:'common',type:'magic',el:'poison',coef:1.0,cd:4,mp:0,range:'ไกล',anim:'cast',proj:{spd:4.4,r:8,hits:1},status:{poison:2},user:'enemy',desc:'ขว้างขวดกรด ติดพิษ 2 สแตก'},
  fireflask:{ic:'🧪',n:'ขวดเพลิง',tier:'common',type:'magic',el:'fire',coef:1.1,cd:5,mp:0,range:'ไกล',anim:'cast',proj:{spd:4.4,r:9,hits:1},status:{burn:1},user:'enemy',desc:'ขว้างขวดเพลิง ติดเผาไหม้'},
  sparkflask:{ic:'🧪',n:'ขวดสายฟ้า',tier:'common',type:'magic',el:'lightning',coef:.9,cd:6,mp:0,range:'ไกล',anim:'cast',proj:{spd:5.2,r:7,hits:1},status:{shock:1},user:'enemy',desc:'ขว้างขวดประกายไฟ ติดช็อต'},
  earthshatter:{ic:'💥',n:'ธรณีแยก',tier:'rare',type:'phys',el:'phys',coef:2.4,cd:9,mp:90,range:'ใกล้ (70) ต่ำ',anim:'heavyslash',reach:70,hy:8,hh:20,low:1,kd:1,combo:1,desc:'ทุบพื้น ต้องย่อจึงกันได้ ล้มลง'},
  galeblade:{ic:'🌪️',n:'ดาบพายุ',tier:'rare',type:'phys',el:'weapon',coef:2.2,cd:9,mp:85,range:'ไกล (กระสุน 3 ฮิต)',anim:'heavyslash',proj:{spd:4,r:14,hits:3},combo:1,desc:'พายุหมุนพุ่งไปข้างหน้า'},
  guardbreak:{ic:'🛡️',n:'ทลายโล่',tier:'rare',type:'phys',el:'phys',coef:2.0,cd:12,mp:100,range:'ใกล้ (56)',anim:'thrust',reach:56,status:{stun:1},armorBreak:{def:.6,t:300},combo:1,desc:'แทงทะลวงโล่ ทำให้มึน 3 วินาที'},
  frostnova:{ic:'❄️',n:'Ice Spear Frostnova',tier:'rare',type:'phys',el:'ice',coef:2.0,multi:8,active:36,rootDur:240,cd:8,mp:38,range:'รอบตัวกว้างพิเศษ (240) · 8 ฮิต',anim:'cast',reach:240,frostnova:1,status:{freeze:1},statusDur:8,instantShatter:1,desc:'ระเบิดวงน้ำแข็งและหอกน้ำแข็งพุ่งรอบตัววงกว้าง 8 ฮิต 200% ATK (CD 8 วิ · 38 MP) ติดแช่แข็ง 8 วิ + แช่ขยับไม่ได้ 4 วิ และกระแทกน้ำแข็งแตกทันที'},
  windblade:{ic:'🌪️',n:'วายุอันแหลมคม',tier:'rare',type:'phys',el:'phys',coef:2.0,cd:8,mp:38,range:'ไกล (คลื่นดาบ)',anim:'heavyslash',windblade:1,proj:{spd:6.4,r:16,hits:1,wind:1},status:{bleed:10},statusDur:5,combo:1,desc:'ฟันอากาศส่งคลื่นดาบลมพุ่งใส่ศัตรู 200% ATK (CD 8 วิ · 38 MP) ติดเลือดไหล 10 สแตก นาน 5 วิ'},
  windvanish:{ic:'💨',n:'พรางตัวสายลม',tier:'rare',type:'buff',el:'phys',cd:20,mp:35,range:'ตัวเอง',anim:'cast',buff:{t:180,vanish:180},desc:'หายตัวกลืนไปกับสายลม 3 วิ ไม่โดนการโจมตีใดๆ (CD 20 วิ · 35 MP)'},
  fireshield:{ic:'🔥',n:'เกราะเพลิง',tier:'rare',type:'buff',el:'fire',cd:20,mp:38,startup:60,range:'ตัวเอง (ร่าย 1 วิ)',anim:'cast',buff:{t:600,dr:.15,fireShield:600},desc:'ยืนร่าย 1 วิ สร้างเกราะเพลิง 10 วิ (CD 20 วิ · 38 MP) ลดดาเมจที่ได้รับ 15% + สะท้อน 20% + เผาไหม้ผู้โจมตี 3 วิ'},
  blink:{ic:'⚡',n:'Blink',tier:'rare',type:'buff',el:'lightning',cd:8,mp:15,range:'พุ่งระยะไกลมาก (280)',anim:'dash',blink:280,desc:'พริบตาพุ่งระยะไกลมาก แตกตัวเป็นแสงและทิ้งเงาติดตา (CD 8 วิ · 15 MP)'},
  // ---- Unique (Active MP 40-60, Passive 0) — bound permanently ----
  piercestrike:{ic:'🗡️',n:'ทลายเกราะ (Armor Breaker)',tier:'unique',talent:'piercer',type:'phys',el:'phys',coef:2.4,cd:8,mp:40,range:'พุ่งแทง (64+)',anim:'thrust',reach:64,active:10,lunge:6.5,ignoreDef:1,unblockable:1,armorBreak:{def:.6,t:300,n:'Armor Breaker'},combo:1,desc:'พุ่งเข้าไปแทงทะลวงเกราะ ไม่สนค่า DEF ของเป้าหมาย · ทะลุการป้องกัน (block) · ติดดีบัฟ Armor Breaker: DEF เป้าหมาย −40% นาน 5 วิ'},
  luckyseven:{ic:'🍀',n:'แจ็คพอต (Jackpot)',tier:'unique',talent:'lucky',type:'phys',el:'phys',coef:3.5,multi:5,cd:12,mp:50,range:'พุ่งแทงต่อเนื่อง 5 ครั้ง (66)',anim:'rush',reach:66,lunge:1.5,alwaysCrit:1,defPen:.2,combo:1,desc:'พุ่งแทงต่อเนื่อง 5 ครั้ง ติดคริติคอลแน่นอน 100% และไม่สนเกราะ 20% ทุกฮิต'},
  ironwall:{ic:'🧱',n:'กำแพงเหล็ก (Iron Wall)',tier:'unique',talent:'endurer',type:'buff',cd:16,mp:45,range:'ตัวเอง',anim:'block',buff:{dr:.3,armor:1,t:240,statusImm:480,def:300,mdef:300,defT:720},desc:'เพิ่ม DEF / M.DEF +300 นาน 12 วิ, ลดดาเมจเพิ่ม 30% (รวมไม่เกิน 75%) 4 วิ และกันสถานะผิดปกติทุกชนิด 8 วิ (CD 16 วิ)'},
  bloodpact:{ic:'🩸',n:'สัญญาโลหิต (Blood Pact)',tier:'unique',talent:'undying',type:'phys',el:'shadow',coef:2.6,cd:9,mp:40,range:'ใกล้ (54)',anim:'heavyslash',reach:54,lifesteal:.1,multi:1,status:{bleed:50},combo:1,desc:'ฟื้น HP เท่ากับ 10% ของดาเมจที่ทำ และติดเลือดออก 10 สแตก'},
  toxiccurse:{ic:'🕸️',n:'คำสาปพิษ (Toxic Curse)',tier:'unique',talent:'hexweaver',type:'magic',el:'poison',coef:1.2,cd:10,mp:50,range:'ไกล (กระสุน)',anim:'cast',proj:{spd:5,r:10,hits:1},multi:1,status:{poison:50},desc:'ยิงคำสาปใส่เป้าหมาย ติดพิษ 10 สแตก'},
  arcaneburst:{ic:'🔮',n:'ระเบิดอาคม (Arcane Burst)',tier:'unique',talent:'archmage',type:'magic',el:'arcane',coef:2,cd:20,mpPct:.2,range:'ไกล (กระสุน)',anim:'cast',proj:{spd:6,r:12,hits:1},status:{shock:20,burn:20,stun:2},desc:'ดาเมจเวท 200% ของพลังเวท (หัก M.DEF ปกติ) · ใช้ MP 20% ของ MP สูงสุด · คูลดาวน์ 20 วิ'},
  kingaura:{ic:'👑',n:'ออร่าราชา (Monarch\'s Aura)',tier:'unique',talent:'sololeveling',type:'buff',cd:15,mp:45,range:'ทั้งฉาก',anim:'cast',kingAura:600,desc:'ปลดปล่อยออร่าราชา 10 วิ: ฝ่ายตรงข้ามได้รับดาเมจจากเราแรงขึ้น 25% (คูลดาวน์ 15 วิ · 45 MP)'},
  royalparry:{ic:'🛡️',n:'ยืนหยัดปัดป้อง (Royal Parry)',tier:'unique',talent:'parryman',type:'passive',passive:{id:'royalparry',v:1},range:'พาสซีฟ',anim:'-',desc:'พาสซีฟ (กดใช้ไม่ได้): เมื่อกดกัน [E] แล้วติดป้องกันสมบูรณ์ (Perfect Block) แทนที่การสตันศัตรู จะเกิดแสงขาว-ฟ้าและได้รับบัฟปัดป้อง 3 วิ (โจมตีเป็น True Damage)'},
  blooddrain:{ic:'🩸',n:'คำสาปสูบโลหิต (Crimson Curse)',tier:'unique',talent:'vampire',type:'passive',passive:{id:'blooddrain',v:.20,defRed:.20},range:'พาสซีฟ',anim:'-',desc:'พาสซีฟ: ลด Max HP, DEF และ M.DEF ฝ่ายตรงข้ามลง 20% ตลอดการต่อสู้'},
  phoenixdive:{ic:'🐦',n:'ฟีนิกซ์โฉบ',tier:'unique',type:'magic',el:'fire',coef:2.6,multi:3,cd:10,mp:60,range:'พุ่ง (50)',anim:'rush',lunge:3,reach:50,status:{burn:50},combo:1,desc:'โฉบเปลวไฟ 3 ฮิต เผาไหม้'},
  stormcall:{ic:'🌩️',n:'เรียกพายุ',tier:'unique',type:'magic',el:'lightning',coef:2.2,cd:12,mp:60,range:'กลาง (110)',anim:'cast',strike:110,status:{shock:1},combo:1,desc:'เรียกสายฟ้าใหญ่ ช็อกและมึน'},
  berserker:{ic:'😤',n:'คลั่งศึก',tier:'unique',type:'passive',passive:{id:'berserker',v:.15},range:'พาสซีฟ',anim:'-',desc:'พาสซีฟ: ดาเมจ +15% เมื่อ HP ต่ำกว่า 50%'},
  manaheart:{ic:'💙',n:'หัวใจมานา',tier:'unique',type:'passive',passive:{id:'manaheart',v:.20},range:'พาสซีฟ',anim:'-',desc:'พาสซีฟ: MP สูงสุด +20%'},
  focus:{ic:'🎯',n:'จิตแน่วแน่',tier:'unique',type:'passive',passive:{id:'focus',v:.10},range:'พาสซีฟ',anim:'-',desc:'พาสซีฟ: อัตราคริติคอล +10% (เพดาน 75%)'},
  vampiric:{ic:'🧛',n:'โลหิตผีดิบ',tier:'unique',type:'passive',passive:{id:'vampiric',v:.05},range:'พาสซีฟ',anim:'-',desc:'พาสซีฟ: ฟื้น HP 5% ของดาเมจที่ทำได้'},
  // ---- Ultimate (100 Ultimate Gauge, 0 MP) ----
  hyperbeam:{ic:'☄️',n:'ลำแสงวิญญาณขั้นสุด',tier:'ultimate',type:'magic',el:'weapon',coef:7.2,multi:12,cd:10,range:'ทั้งจอ',anim:'beam',beam:1,desc:'ลำแสงทะลุทั้งจอ 12 ฮิต'},
  moonfall:{ic:'🌑',n:'จันทร์ดับ',tier:'ultimate',type:'phys',el:'shadow',coef:6,multi:8,cd:10,range:'ใกล้-กลาง (56)',anim:'rush',lunge:2.4,reach:56,status:{bleed:2},desc:'พุ่งฟันเงา 8 ครั้ง ติดเลือดออก'},
  meteorfall:{ic:'🌠',n:'อุกกาบาตถล่ม',tier:'ultimate',type:'magic',el:'fire',coef:7,multi:6,cd:10,range:'ทั้งพื้นที่ (พื้นดิน)',anim:'cast',rain:1,status:{burn:1},desc:'อุกกาบาตเพลิงตกใส่พื้น 6 ลูก'},
  dragonstorm:{ic:'🐲',n:'พายุมังกร',tier:'ultimate',type:'magic',el:'fire',coef:7,cd:10,range:'ไกล (กระสุน 4 ฮิต)',anim:'cast',proj:{spd:3.6,r:22,hits:4},status:{burn:1},desc:'มังกรเพลิงพุ่งกลืนศัตรู'},
  thunderking:{ic:'👑',n:'ราชันย์อสนี',tier:'ultimate',type:'magic',el:'lightning',coef:6.5,multi:5,cd:10,range:'ทั้งพื้นที่ (พื้นดิน)',anim:'cast',rain:1,status:{shock:1},desc:'สายฟ้าผ่าลงซ้ำ 5 ครั้ง'},
  abyssgate:{ic:'🕳️',n:'ประตูนรก',tier:'ultimate',type:'magic',el:'shadow',coef:7,multi:10,cd:10,range:'ทั้งจอ',anim:'beam',beam:1,status:{bleed:2},desc:'ลำแสงเงา 10 ฮิต เลือดออก'},
  bluejudge:{bossOnly:1,ic:'🐉',n:'คำพิพากษาตาคราม',tier:'ultimate',type:'magic',el:'lightning',coef:3,cd:10,range:'ทั้งจอ',anim:'beam',beam:1,multi:8,status:{shock:1},dragon:{body:'#f4f6fa',shade:'#b8c4d4',eye:'#4ab8ff',mane:'#8ad8ff'},desc:'มังกรขาวยักษ์ตาสีฟ้า ปล่อยลำแสงสายฟ้า 8 ฮิต 300% ATK'},
  eyejudge:{bossOnly:1,ic:'👁️',n:'ดวงตาพิพากษา',tier:'ultimate',type:'magic',el:'holy',coef:7.5,multi:10,cd:10,range:'ทั้งจอ',anim:'beam',beam:1,desc:'ลำแสงศักดิ์สิทธิ์ทะลุทั้งจอ 10 ฮิต'},
  heavenwings:{bossOnly:1,ic:'🪽',n:'ปีกสวรรค์',tier:'ultimate',type:'magic',el:'holy',coef:4.5,multi:4,cd:25,gauge:50,range:'ทั้งพื้นที่ (พื้นดิน)',anim:'cast',rain:1,rootDur:240,desc:'ปล่อยขนนกศักดิ์สิทธิ์ 4 ระลอก ล็อคขาเป้าหมายขยับไม่ได้ 4 วิ · ใช้เกจ 50 · คูลดาวน์ 25 วิ'},
  magmaerupt:{bossOnly:1,ic:'🌋',n:'อุกกาบาตลาวาถล่ม',tier:'ultimate',type:'magic',el:'fire',coef:7,multi:6,cd:15,gauge:70,range:'ทั้งพื้นที่ (พื้นดิน)',anim:'cast',rain:1,status:{burn:1},desc:'อุกกาบาตเพลิง 6 ลูกถล่มทั้งพื้นที่ · ใช้เกจ 70 · คูลดาวน์ 15 วิ'},
  stonepillars:{bossOnly:1,ic:'🪨',n:'เสาศิลาทลาย',tier:'ultimate',type:'phys',el:'phys',coef:5.5,cd:20,gauge:70,range:'ทั้งพื้นที่ (พื้นดิน)',anim:'cast',quake:1,pillars:1,kd:1,desc:'ทุบพื้นปล่อยเสาหินพุ่งแทงต่อเนื่องจนถึงตัวเป้าหมาย · ใช้เกจ 70 · คูลดาวน์ 20 วิ'},
  alchcataclysm:{bossOnly:1,ic:'⚗️',n:'มหาแปรธาตุวิบัติ',tier:'ultimate',type:'magic',el:'poison',coef:6.8,multi:6,cd:15,gauge:60,range:'ทั้งพื้นที่ (พื้นดิน)',anim:'cast',rain:1,status:{poison:2,burn:1,shock:1},desc:'โปรยฝนน้ำยาแปรธาตุต้องห้าม 6 ระลอก (พิษ/เผาไหม้/ช็อก) · ใช้เกจ 60 · คูลดาวน์ 15 วิ'},
  alchbarrier:{bossOnly:1,ic:'🛡️',n:'บาเรียแปรธาตุ',tier:'rare',type:'buff',cd:15,mp:0,range:'ตนเอง',anim:'cast',buff:{t:300,invuln:300},desc:'สร้างบาเรียกันดาเมจทั้งหมด 5 วินาที (คูลดาวน์ 15 วิ)'},
  bbqybarrier:{bossOnly:1,ic:'🛡️',n:'บาเรียไร้พ่าย',tier:'rare',type:'buff',cd:9,mp:0,range:'ตนเอง',anim:'cast',buff:{t:120,invuln:120,col:'#c46aff'},desc:'สร้างบาเรียพลังโกลาหล อมตะไม่ได้รับดาเมจ 2 วินาที (คูลดาวน์ 9 วิ)'},
  silvabarrier:{bossOnly:1,ic:'🛡️',n:'บาเรียวิญญาณ',tier:'rare',type:'buff',cd:14,mp:0,range:'ตนเอง',anim:'cast',buff:{t:240,invuln:240},desc:'สร้างบาเรียจิตวิญญาณสีฟ้าอมตะ 4 วินาที (คูลดาวน์ 14 วิ)'},
  silvabeam:{bossOnly:1,ic:'💠',n:'ลำแสงจิตวิญญาณวารี',tier:'ultimate',type:'magic',el:'ice',coef:4.0,alwaysCrit:1,cd:15,gauge:80,range:'ทั้งจอ',anim:'beam',beam:1,multi:6,beamCol:'#42e8ff',spiritBeam:1,desc:'ปลดปล่อยลำแสงจิตวิญญาณขนาดยักษ์ 400% ATK · คริ 100% (CD 15 วิ · เกจ 80)'},
  thousandcuts:{ic:'⚔️',n:'พันคมดาบ',tier:'ultimate',type:'phys',el:'weapon',coef:7.5,multi:12,cd:10,range:'พุ่ง (52)',anim:'rush',lunge:1.8,reach:52,desc:'ฟันรัว 12 ครั้ง'},
  toxicworld:{ic:'🧪',n:'โลกพิษ',tier:'ultimate',type:'magic',el:'poison',coef:6,multi:6,cd:10,range:'ทั้งพื้นที่ (พื้นดิน)',anim:'cast',rain:1,status:{poison:3},desc:'ฝนพิษ 6 ระลอก พิษ 3 สแตก'},
  titanfist:{ic:'👊',n:'หมัดไททัน',tier:'ultimate',type:'phys',el:'phys',coef:8,cd:10,range:'ใกล้ (50)',anim:'straight',reach:50,kd:1,desc:'หมัดเดียวแรงที่สุด กระแทกล้ม'},
  starfall:{ic:'🌟',n:'ดาวตก',tier:'ultimate',type:'magic',el:'weapon',coef:7,cd:10,range:'ไกล (กระสุน 5 ฮิต)',anim:'cast',proj:{spd:5,r:16,hits:5},desc:'ดาวตกพุ่งทะลวง 5 ฮิต'}
};
for(const k in SKILLS)if(SKILLS[k].tier==='ultimate'){SKILLS[k].gauge=SKILLS[k].gauge||100;delete SKILLS[k].mp;}
/* Unique skill upgrade table — PLACEHOLDER values, tune here only (no costs are hard-coded elsewhere).
   levels[n] = requirement/effect to reach level n. coef/cd are cumulative multipliers vs. level 1. */
const SKILL_UPGRADE={
  appliesTo:['unique'],
  maxLevel:5,
  levels:[null,null,
    {mats:{core:1},gold:200,coef:1.15,cd:1.00},
    {mats:{core:1,cloth:2},gold:400,coef:1.30,cd:.95},
    {mats:{essence:1},gold:800,coef:1.50,cd:.90},
    {mats:{essence:1,divine:1},gold:1500,coef:1.75,cd:.85}]
};
/* Unique Seal Breaker — supported by the data model now; drop source intentionally empty (configure for future content). */
const SEAL_BREAKER={item:'sealbreaker',perUse:1,rarity:'god',dropSources:{} /* e.g. {lavaking:.01} */};
const SKILL_FRAMES={straight:[12,4,22],cast:[12,3,22],heavyslash:[13,4,20],jab:[6,2,14],rising:[3,12,22],rush:[10,0,18],thrust:[8,3,16],beam:[30,50,30],block:[6,2,10]};

/* ---------- combos ---------- */
const COMBOS=[
  {id:'basic',n:'คอมโบพื้นฐาน',seq:['L1','L2','L3']}   /* เหลือเฉพาะคอมโบพื้นฐาน (J J J) */
];
/* คอมโบคำสั่ง: กดปุ่มพร้อมทิศตามลำดับ (แต่ละครั้งห่างกันไม่เกิน window เฟรม) แล้วออกท่าพิเศษ
   D=↓(S)  B=ถอยหลัง  F=เดินหน้า  U=↑(W) หรืออยู่กลางอากาศ · J=ต่อย K=เตะ */
const CMD_COMBOS=[];   /* ลบคอมโบคำสั่งทั้งหมดแล้ว */
const TOKN={L1:'J',L2:'J',L3:'J',L4:'J',H:'→J',K:'K',D:'↓K',C:'↓J',S1:'1',S2:'2',S3:'3',S4:'4',AJ:'อากาศJ',AK:'อากาศK'};

/* ---------- talents ---------- */
const TALENTS={
  piercer:{n:'THE PIERCER',th:'ผู้ทะลวง',ic:'🗡️',desc:'+100 เจาะเกราะ (Armor Penetration) แบบคงที่',skill:'piercestrike'},
  lucky:{n:'THE LUCKY ONE',th:'ผู้โชคดี',ic:'🍀',desc:'+25% อัตราคริติคอล และ +50% ดาเมจคริติคอล (ค่าคงที่)',skill:'luckyseven'},
  endurer:{n:'THE ENDURER',th:'ผู้ทนทาน',ic:'🛡️',desc:'ลดดาเมจที่ได้รับ 25% และ +30% ต้านสถานะผิดปกติ (ค่าคงที่)',skill:'ironwall'},
  undying:{n:'THE UNDYING',th:'ผู้ไม่มีวันตาย',ic:'💀',desc:'ฟื้นคืนชีพได้ 2 ครั้งต่อการต่อสู้ ด้วย HP 30% ล้างสถานะผิดปกติทั้งหมด และเป็นอมตะ 3 วิทุกครั้งที่ฟื้น',skill:'bloodpact'},
  hexweaver:{n:'THE HEXWEAVER',th:'ผู้ถักคำสาป',ic:'🕸️',desc:'+25% โอกาสติดสถานะผิดปกติ (หักลบกับค่าต้านของเป้าหมาย) · เฉพาะ Hexweaver: โอกาสติดสถานะทุก 1% ทำให้สถานะที่ติดนานขึ้น 0.05 วิ (+25% = +1.25 วิ)',skill:'toxiccurse'},
  archmage:{n:'THE ARCHMAGE',th:'จอมเวท',ic:'🔮',desc:'+15% พลังเวท · +10% MP สูงสุด · +10% ดาเมจคริติคอลเวท (ค่าคงที่)',skill:'arcaneburst'},
  sololeveling:{n:'SOLO LEVELING',th:'ผู้เติบโตไร้ขีดจำกัด',ic:'👑',desc:'ได้รับ EXP ตัวละครและอุปกรณ์ +25% · ปลดเพดานเลเวลไม่มี LVL MAX (ทั้งตัวละครและอุปกรณ์)',skill:'kingaura'},
  parryman:{n:'THE PARRY MAN',th:'จ้าวแห่งการปัดป้อง',ic:'⚔️',desc:'เพิ่มจำนวนการบล็อกสูงสุดเป็น 5 ครั้ง และลดดาเมจขณะบล็อกลง 20%',skill:'royalparry'},
  vampire:{n:'VAMPIRE',th:'ลอร์ดโลหิต',ic:'🧛',desc:'โจมตีดูดเลือด 25% ของดาเมจที่ทำได้ เพื่อฟื้นฟู HP ตัวเอง',skill:'blooddrain'}
};
/* ค่าพาสซีฟของพรสวรรค์ (ค่าคงที่ตามสเปก) — Stats.derive อ่านจากตารางนี้ที่เดียว คำนวณใหม่จากฐานทุกครั้ง จึงไม่ทบซ้ำ */
const TALENT_PASSIVE={
  piercer:{apen:100},
  lucky:{critRate:.25,critDmg:.5},
  endurer:{dr:.25,statusRes:.30},                 // DR รวมไม่เกิน CONFIG.drCap (75%)
  undying:{revives:2,reviveHp:.30,reviveInvuln:180},
  hexweaver:{statusChance:.25},   // โอกาสติดสถานะทุก 1% → สถานะนานขึ้น CONFIG.statusChanceDur วิ
  archmage:{mpowPct:.15,maxMPPct:.10,mcritDmg:.10},
  sololeveling:{xpMul:.25,eqXpMul:.25,noMaxLv:1},
  parryman:{guardMax:5,blockDmgRed:.20},
  vampire:{lifesteal:.25,cursePct:.20}
};

/* ---------- items ---------- */
const RARS=['normal','rare','epic','legendary','god'];
const RARN={normal:'ธรรมดา',rare:'หายาก',epic:'มหากาพย์',legendary:'ตำนาน',god:'เทพ'};
const RARC={normal:'#a8a8a8',rare:'#4aa8ff',epic:'#b45aff',legendary:'#ffd23a',god:'#ff7a1a'};   // เทา / น้ำเงิน / ม่วง (มหากาพย์) / ทอง (ตำนาน) / ส้ม (เทพ)
const RARITY={ // rarity changes affix count, affix quality, rune sockets (1-5), base stat mult (100%-280%), and unique passives
  normal:{affix:[0,1],q:[.6,.9],mult:1.00,sockets:1,uniq:null},
  rare:{affix:[2,2],q:[.8,1.1],mult:1.25,sockets:2,uniq:null},
  epic:{affix:[3,3],q:[.95,1.2],mult:1.60,sockets:3,uniq:null},
  legendary:{affix:[3,3],q:[1,1.3],mult:2.10,sockets:4,uniq:'leg'},
  god:{affix:[4,4],q:[1.3,1.6],mult:2.80,sockets:5,uniq:'god'}
};
const CAT_N={sword:'ดาบ',gsword:'ดาบหนัก',hammer:'ค้อน',ghammer:'ค้อนหนัก',spear:'หอก',fist:'หมัด',staff:'ไม้เท้า',helmet:'หมวก',armor:'เกราะ',gloves:'ถุงมือ',pants:'กางเกง',boots:'รองเท้า',accessory:'เครื่องประดับ'};
const SLOTS=['weapon','helmet','armor','gloves','pants','boots','ring1','ring2','necklace'];
const SLOTN={weapon:'อาวุธหลัก',helmet:'หมวก',armor:'เกราะ',gloves:'ถุงมือ',pants:'กางเกง',boots:'รองเท้า',ring1:'แหวน 1',ring2:'แหวน 2',necklace:'สร้อยคอ',ring:'แหวน'};
const slotType=s=>s.startsWith('ring')?'ring':s;
const BASES={
  w_club:{n:'กระบองรากไม้',type:'weapon',wt:'club',atk:16,matk:4,ic:'🏏'},
  w_woodsword:{n:'ดาบไม้ฝึกหัด',type:'weapon',wt:'woodsword',atk:12,matk:2,ic:'🗡️',fixRar:'normal',look:{wcol:'#9c6a38',wfx:'#e8c89a'}},
  w_stonesword:{n:'ดาบหิน',type:'weapon',wt:'stonesword',atk:20,matk:2,ic:'🗡️',fixRar:'normal',look:{wcol:'#8a867e',wfx:'#d8d4ca'}},
  w_sword:{n:'ดาบเหล็กโบโร',type:'weapon',wt:'sword',atk:24,matk:4,ic:'🗡️'},
  w_spear:{n:'หอกเขี้ยวถ้ำ',type:'weapon',wt:'spear',atk:22,matk:4,ic:'🔱'},
  w_flame:{n:'ดาบถ่านแดง',type:'weapon',wt:'flame',atk:28,matk:12,ic:'⚔️'},
  w_gaunt:{n:'สนับมือฟ้าคำราม',type:'weapon',wt:'gaunt',atk:20,matk:16,ic:'🥊'},
  w_firepan:{n:'กระทะเพลิงมรดกพ่อ',type:'weapon',wt:'firepan',atk:30,matk:10,ic:'🍳'},
  w_hammer:{n:'ค้อนชีสหินผา',type:'weapon',wt:'hammer',atk:30,matk:2,ic:'🔨'},
  w_kage:{n:'ดาบเงาจันทร์มืด',type:'weapon',wt:'kageblade',atk:30,matk:8,ic:'🌑',set:'shadow'},
  w_seraph:{n:'ดาบขนนกรุ่งอรุณ',type:'weapon',wt:'sword',atk:34,matk:20,ic:'🪶',set:'seraph'},
  w_god:{n:'ดาบหัวใจภูเขาไฟ',type:'weapon',wt:'lavablade',atk:38,matk:18,ic:'🌋'},
  w_mswd:{n:'ดาบมนตรา',type:'weapon',wt:'mswd',atk:22,matk:18,ic:'🔮'},
  w_mstaff:{n:'คทาดาราจักร',type:'weapon',wt:'mstaff',atk:6,matk:28,ic:'🪄'},
  w_adagger:{n:'กริชอาคมพราย',type:'weapon',wt:'adagger',atk:22,matk:6,ic:'🗡️',implicit:{critRate:.08}},
  w_wand_fire:{n:'ไม้เท้าเปลวอัคคี',type:'weapon',wt:'wand_fire',atk:5,matk:24,ic:'🔥'},
  w_wand_ice:{n:'ไม้เท้าเกล็ดหิมะ',type:'weapon',wt:'wand_ice',atk:5,matk:24,ic:'❄️'},
  w_wand_lightning:{n:'ไม้เท้าอสนีบาต',type:'weapon',wt:'wand_lightning',atk:5,matk:24,ic:'⚡'},
  w_gs1:{n:'ดาบใหญ่เหล็กกล้า',type:'weapon',wt:'gsword',atk:30,matk:2,ic:'⚔️',fixRar:'normal',look:{wcol:'#c8ccd8'}},
  w_gs2:{n:'ดาบใหญ่ฟันมังกร',type:'weapon',wt:'gsword',atk:38,matk:4,ic:'⚔️',fixRar:'rare',look:{wcol:'#e8c070',wfx:'#ff8a3a'}},
  w_gs3:{n:'ดาบใหญ่ราตรีพิฆาต',type:'weapon',wt:'gsword',atk:46,matk:6,ic:'⚔️',fixRar:'epic',look:{wcol:'#6a5a8a',wfx:'#c9a0ff'}},
  w_wh1:{n:'ค้อนศึกเหล็ก',type:'weapon',wt:'ghammer',atk:32,matk:0,ic:'🔨',fixRar:'normal',look:{wcol:'#9aa0ae'}},
  w_wh2:{n:'ค้อนศึกศิลาฟ้า',type:'weapon',wt:'ghammer',atk:40,matk:2,ic:'🔨',fixRar:'rare',look:{wcol:'#7fb8d8',wfx:'#c8f2ff'}},
  w_wh3:{n:'ค้อนศึกธรณีกัมปนาท',type:'weapon',wt:'ghammer',atk:48,matk:4,ic:'🔨',fixRar:'epic',look:{wcol:'#c8962a',wfx:'#ffe58a'}},
  w_mercstaff:{n:'ไม้เท้าปรอท',type:'weapon',wt:'wand_poison',atk:5,matk:32,ic:'🪄',fixRar:'epic',look:{wcol:'#9ae8b0'}},
  h_alch:{n:'หมวกนักแปรธาตุ',type:'helmet',def:5,mdef:10,ic:'🎩',set:'alchemist',look:{head:'wizard',hc:'#2a4a3a',hc2:'#7af0c0'}},
  a_alch:{n:'เสื้อคลุมนักแปรธาตุ',type:'armor',def:9,mdef:14,ic:'🧥',set:'alchemist',look:{body:'#2a4a3a',trim:'#7af0c0',robe:'#23402f',sleeve:'#2a4a3a'}},
  g_alch:{n:'ถุงมือนักแปรธาตุ',type:'gloves',def:3,mdef:5,ic:'🧤',set:'alchemist',look:{gloves:'#3a6a4a'}},
  b_alch:{n:'รองเท้านักแปรธาตุ',type:'boots',def:3,mdef:5,ic:'🥾',set:'alchemist',look:{boots:'#2a3a30',trail:'#7af0c0'}},
  w_lightless:{n:'ไลต์เลส ดาบใหญ่ไร้แสง',type:'weapon',wt:'gsword',atk:56,matk:10,ic:'⚔️',fixRar:'legendary',implicitRaw:1,implicit:{apenPct:.2,blindChance:.2},look:{wcol:'#181820',wfx:'#ffffff',wfxKind:'lightless'}},   // ไม่สนเกราะ 20% · โอกาส 20% ทำให้ตาบอด 5 วิ · ออร่าพื้นสีดำขาว
  w_bbqy:{n:'Chaos Blade Legendary Sword (bbqy)',type:'weapon',wt:'bbqysword',atk:48,matk:12,ic:'🗡️',fixRar:'legendary',implicitRaw:1,implicit:{str:10,agi:10,int:10,vit:10,luk:10,chaosChance:.2},look:{wcol:'#28144a',wfx:'#a64df0',wshape:'chaosblade'}},   /* รางวัลชนะ bbqy: ค่าพลังทุกอย่าง +10 · โอกาส 20% ทำให้โกลาหล 4 วิ */
  r_primal:{n:'แหวนปฐมกาล',type:'ring',ic:'💍',fixRar:'legendary',implicitRaw:1,implicit:{str:10,agi:10,int:10,vit:10,luk:10}},   // ค่าพลังทุกอย่าง +10
  w_scythe:{n:'เคียวสุญญตา',type:'weapon',wt:'scythe',atk:34,matk:12,ic:'🌑',fixRar:'epic'},
  h_mage:{n:'หมวกปลายแหลมนักปราชญ์',type:'helmet',def:4,mdef:9,ic:'🎩',set:'mage',look:{head:'wizard',hc:'#4a2a8a',hc2:'#d88aff'}},
  a_mage:{n:'เสื้อคลุมนักปราชญ์',type:'armor',def:8,mdef:12,ic:'🧥',set:'mage',look:{body:'#3a2a6a',trim:'#d88aff',robe:'#2e2258',sleeve:'#3a2a6a'}},
  p_mage:{n:'กางเกงนักปราชญ์',type:'pants',def:4,mdef:6,ic:'👖',set:'mage',look:{pants:'#2a2050'}},
  b_mage:{n:'รองเท้านักปราชญ์',type:'boots',def:3,mdef:5,ic:'🥾',set:'mage',look:{boots:'#2a2050',trail:'#d88aff'}},
  h_boss:{n:'หมวกเขาจอมทัพ',type:'helmet',def:9,mdef:6,ic:'👹',set:'boss',look:{head:'helm',hc:'#3a1a2a',hc2:'#ffd23a',horns:'#ffd23a',plume:'#c41a3a'}},
  a_boss:{n:'เกราะจอมทัพ',type:'armor',def:16,mdef:8,ic:'🛡️',set:'boss',look:{body:'#3a1a2a',trim:'#ffd23a',plate:1,pads:1,sleeve:'#2a1420',cape:{col:'#7a1a2a',col2:'#3a0a14'}}},
  g_boss:{n:'ถุงมือจอมทัพ',type:'gloves',def:5,mdef:3,ic:'🧤',set:'boss',look:{gloves:'#3a1a2a'}},
  b_boss:{n:'รองเท้าจอมทัพ',type:'boots',def:6,mdef:3,ic:'🥾',set:'boss',look:{boots:'#2a1420',trail:'#ffd23a'}},
  h_leather:{n:'หมวกหนังนักเดินทาง',type:'helmet',def:4,mdef:2,ic:'🪖',look:{head:'cap',hc:'#7a4a2a',hc2:'#3a2414'}},
  h_iron:{n:'หมวกเหล็กทหารยาม',type:'helmet',def:8,mdef:3,ic:'⛑️',look:{head:'helm',hc:'#9aa0ae',hc2:'#3a3f4e',plume:'#c94a3a'}},
  h_band:{n:'ผ้าคาดผากนักสู้',type:'helmet',def:3,mdef:5,ic:'🎗️',look:{head:'band',hc:'#2a3a8a',hc2:'#d8dce8'}},
  h_shadow:{n:'ผ้าคาดผากสนธยา',type:'helmet',def:5,mdef:6,ic:'🥷',set:'shadow',look:{head:'band',hc:'#c94a3a',hc2:'#c8ccd8'}},
  h_horns:{n:'มงกุฎเขาอสูร',type:'helmet',def:6,mdef:8,ic:'😈',look:{head:'horns',hc:'#ece4d4',hc2:'#c41a3a'}},
  h_halo:{n:'วงรัศมีรุ่งอรุณ',type:'helmet',def:9,mdef:14,ic:'😇',set:'seraph',look:{head:'halo',hc:'#fff2a8',hc2:'#f4f0e0'}},
  h_crown:{n:'มงกุฎแมกมา',type:'helmet',def:10,mdef:10,ic:'👑',set:'magma',look:{head:'crown',hc:'#ffb03a',hc2:'#ff3a2a'}},
  a_cloth:{n:'เสื้อป่านชาวบ้าน',type:'armor',def:5,mdef:3,ic:'👕',look:{body:'#5a7a5a',trim:'#3a2a1a'}},
  a_leather:{n:'เกราะหนังพราน',type:'armor',def:9,mdef:4,ic:'🦺',look:{body:'#7a4a2a',trim:'#c89a5a',pads:1,belt:'#3a2414',sleeve:'#5a3a22'}},
  a_shadow:{n:'ชุดนินจาสนธยา',type:'armor',def:10,mdef:8,ic:'🥷',set:'shadow',look:{body:'#262a3a',trim:'#c94a3a',scarf:'#c94a3a',sleeve:'#1c1c2a'}},
  a_dragon:{n:'เกราะเกล็ดมังกรแดง',type:'armor',def:16,mdef:10,ic:'🐉',look:{body:'#a42a1a',trim:'#f3c969',pads:1,plate:1,scales:'#7a1a10',sleeve:'#7a1a10',cape:{col:'#b0262a',col2:'#6a1018'}}},
  a_golem:{n:'เกราะศิลาโกเลม',type:'armor',def:20,mdef:6,ic:'🪨',set:'golem',look:{body:'#6e6458',trim:'#5fe0a0',pads:1,plate:1,sleeve:'#5a5248'}},
  a_seraph:{n:'เสื้อคลุมรุ่งอรุณ',type:'armor',def:18,mdef:20,ic:'🪽',set:'seraph',look:{body:'#e8e0c4',trim:'#8aa89a',pads:1,robe:'#ddd4b4',sleeve:'#cfc6a8',cape:{col:'#f4f0e0',col2:'#b9b6c4'},aura:'#fff2a8'}},
  a_magma:{n:'เกราะแมกมาเดือด',type:'armor',def:22,mdef:14,ic:'🌋',set:'magma',look:{body:'#3a1a14',trim:'#ff7a1a',pads:1,plate:1,glowTrim:1,sleeve:'#2a1210',cape:{col:'#ff5a1a',col2:'#7a1a0a'},aura:'#ff8a3a'}},
  g_leather:{n:'ถุงมือหนังพราน',type:'gloves',def:2,mdef:1,ic:'🧤',look:{gloves:'#7a4a2a'}},
  g_iron:{n:'ถุงมือเหล็กทหาร',type:'gloves',def:4,mdef:1,ic:'🧤',look:{gloves:'#9aa0ae'}},
  g_shadow:{n:'ถุงมือสนธยา',type:'gloves',def:3,mdef:3,ic:'🧤',set:'shadow',look:{gloves:'#2a2a3a'}},
  g_seraph:{n:'ถุงมือรุ่งอรุณ',type:'gloves',def:4,mdef:5,ic:'🧤',set:'seraph',look:{gloves:'#f4f0e0'}},
  g_golem:{n:'ถุงมือศิลา',type:'gloves',def:6,mdef:1,ic:'🧤',set:'golem',look:{gloves:'#8f8474'}},
  p_cloth:{n:'กางเกงป่าน',type:'pants',def:3,mdef:2,ic:'👖',look:{pants:'#3a4a6a'}},
  p_leather:{n:'กางเกงหนังพราน',type:'pants',def:5,mdef:2,ic:'👖',look:{pants:'#5a3a22'}},
  p_shadow:{n:'กางเกงสนธยา',type:'pants',def:5,mdef:4,ic:'👖',set:'shadow',look:{pants:'#1c1c28'}},
  p_seraph:{n:'กางเกงรุ่งอรุณ',type:'pants',def:6,mdef:6,ic:'👖',set:'seraph',look:{pants:'#d8cfae'}},
  p_golem:{n:'สนับขาศิลา',type:'pants',def:8,mdef:2,ic:'👖',set:'golem',look:{pants:'#5a5248'}},
  b_wind:{n:'รองเท้าสายลม',type:'boots',def:2,mdef:2,ic:'👟',implicit:{agi:3},look:{boots:'#3aa06a',trail:'#9fffd0'}},
  b_iron:{n:'รองเท้าเหล็กทหาร',type:'boots',def:5,mdef:1,ic:'🥾',look:{boots:'#6a6e7a'}},
  b_shadow:{n:'รองเท้าสนธยา',type:'boots',def:3,mdef:3,ic:'🥾',set:'shadow',look:{boots:'#111018',trail:'#b08aff'}},
  b_magma:{n:'รองเท้าแมกมาเดือด',type:'boots',def:7,mdef:5,ic:'🥾',set:'magma',look:{boots:'#4a1a10',trail:'#ff8a3a'}},
  r_copper:{n:'แหวนทองแดงช่างฝีมือ',type:'ring',ic:'💍',implicit:{str:2}},
  r_ruby:{n:'แหวนทับทิมเลือด',type:'ring',ic:'💍',implicit:{critRate:.01,mpCost:.03}},
  r_luck:{n:'แหวนใบโคลเวอร์',type:'ring',ic:'💍',implicit:{luk:3}},
  n_fang:{n:'สร้อยเขี้ยวถ้ำ',type:'necklace',ic:'📿',implicit:{atk:4}},
  n_crystal:{n:'สร้อยคริสตัลมานา',type:'necklace',ic:'📿',implicit:{mp:30,matk:4,mpRegen:.05}},
  n_god:{n:'อามูเลตห้าธาตุ',type:'necklace',ic:'🧿',implicit:{str:2,agi:2,int:2,vit:2,luk:2}},
  w_icesword:{n:'ดาบเกล็ดน้ำแข็ง',type:'weapon',wt:'frostsword',atk:30,matk:12,ic:'❄️',fixRar:'rare',set:'ice',look:{wcol:'#8ee4ff',wfx:'#e8fbff'}},
  w_iceaxe:{n:'ขวานศึกเหมันต์',type:'weapon',wt:'frostaxe',atk:46,matk:8,ic:'🪓',fixRar:'epic',set:'ice',look:{wcol:'#7ad8ff',wfx:'#ffffff'}},
  b_ice:{n:'รองเท้าน้ำแข็ง',type:'boots',def:6,mdef:4,ic:'🥾',fixRar:'normal',set:'ice',implicit:{agi:3},look:{boots:'#4888b8',trail:'#aeeeff'}},
  h_ice:{n:'หมวกอัศวินน้ำแข็ง',type:'helmet',def:10,mdef:8,ic:'⛑️',fixRar:'rare',set:'ice',look:{head:'helm',hc:'#8ed8f8',hc2:'#2a4a6e',plume:'#e8fbff'}},
  a_ice:{n:'เกราะจักรพรรดิเหมันต์',type:'armor',def:24,mdef:18,ic:'🛡️',fixRar:'legendary',set:'ice',implicit:{dr:.05,resFire:.15},look:{body:'#264a72',trim:'#aeeeff',pads:1,plate:1,glowTrim:1,sleeve:'#1a3656',cape:{col:'#3a78b0',col2:'#183254'},aura:'#8ee4ff'}},
  g_ice:{n:'ถุงมือน้ำแข็ง',type:'gloves',def:5,mdef:4,ic:'🧤',fixRar:'rare',set:'ice',look:{gloves:'#6ac4ee'}},
  p_ice:{n:'สนับขาน้ำแข็ง',type:'pants',def:8,mdef:6,ic:'👖',fixRar:'rare',set:'ice',look:{pants:'#366898'}}
};
// แยกประเภทอุปกรณ์ตามรูปแบบการใช้งานจริง (ดาบ / ดาบหนัก / ค้อน / ค้อนหนัก / หอก / หมัด / ไม้เท้า / หมวก / เกราะ / ถุงมือ / กางเกง / รองเท้า / เครื่องประดับ)
const BASE_CAT={w_club:'hammer',w_hammer:'hammer',w_firepan:'hammer',w_woodsword:'sword',w_stonesword:'sword',w_sword:'sword',w_flame:'sword',w_kage:'sword',w_seraph:'sword',w_god:'sword',w_mswd:'sword',w_adagger:'sword',w_bbqy:'sword',w_icesword:'sword',
  w_spear:'spear',w_gaunt:'fist',w_gs1:'gsword',w_gs2:'gsword',w_gs3:'gsword',w_lightless:'gsword',w_scythe:'gsword',w_iceaxe:'gsword',
  w_wh1:'ghammer',w_wh2:'ghammer',w_wh3:'ghammer',w_mstaff:'staff',w_wand_fire:'staff',w_wand_ice:'staff',w_wand_lightning:'staff',w_mercstaff:'staff'};
for(const k in BASES){const b=BASES[k];b.cat=BASE_CAT[k]||(b.type==='ring'||b.type==='necklace'?'accessory':b.type);}
const AFFIX={
  str:{n:'STR',r:[1,3],per:.25},agi:{n:'AGI',r:[1,3],per:.25},int:{n:'INT',r:[1,3],per:.25},vit:{n:'VIT',r:[1,3],per:.25},luk:{n:'LUK',r:[1,3],per:.25},
  atk:{n:'พลังโจมตี',r:[3,8],per:1},matk:{n:'พลังเวท',r:[3,8],per:1},def:{n:'DEF',r:[2,6],per:.8},mdef:{n:'M.DEF',r:[2,6],per:.8},
  hp:{n:'HP',r:[20,60],per:8},mp:{n:'MP',r:[10,25],per:3},
  critRate:{n:'อัตราคริติคอล',r:[.01,.03],per:.002,pct:1},critDmg:{n:'ดาเมจคริติคอล',r:[.05,.15],per:.01,pct:1},
  apen:{n:'เจาะเกราะ',r:[2,6],per:.8},mpen:{n:'เจาะเวท',r:[2,6],per:.8},dr:{n:'ลดดาเมจ',r:[.01,.03],per:.001,pct:1},
  resFire:{n:'ต้านไฟ',r:[.05,.12],per:.005,pct:1},resLightning:{n:'ต้านสายฟ้า',r:[.05,.12],per:.005,pct:1},
  mpRegen:{n:'ฟื้นฟูมานา',r:[.03,.08],per:.003,pct:1},mpCost:{n:'ลดค่ามานา',r:[.03,.08],per:.003,pct:1},statusRes:{n:'ต้านสถานะผิดปกติ',r:[.03,.08],per:.003,pct:1},
  resPoison:{n:'ต้านพิษ',r:[.05,.12],per:.005,pct:1},resShadow:{n:'ต้านเงา',r:[.05,.12],per:.005,pct:1}
};
const STATN=Object.assign({},...Object.entries(AFFIX).map(([k,v])=>({[k]:v.n})));
const PASSIVES={
  leg:{bleeder:{n:'คมเลือด',d:'โจมตีมีโอกาส 15% ทำให้เลือดออก'},venom:{n:'เขี้ยวพิษ',d:'โจมตีมีโอกาส 15% ทำให้ติดพิษ'},
    vampire:{n:'ดูดเลือด',d:'คริติคอลแล้วฟื้น HP 2% ของ HP สูงสุด'},executioner:{n:'เพชฌฆาต',d:'ดาเมจ +30% ต่อเป้าหมายที่ HP ต่ำกว่า 30%'},
    thorns:{n:'หนามสะท้อน',d:'สะท้อนดาเมจระยะประชิด 10%'},swift:{n:'ว่องไว',d:'ใช้สตามินาน้อยลง 30%'},arcane:{n:'มนตรา',d:'คูลดาวน์สกิลลดลง 20%'}},
  god:{wrath:{n:'พิโรธเทพ',d:'ทุก 5 ฮิต ฟ้าผ่าเพิ่ม ทำให้ช็อก'},phoenix:{n:'ฟีนิกซ์',d:'ไม่ติดเผาไหม้ และทุกการโจมตีทำให้เผาไหม้'},void:{n:'ความว่างเปล่า',d:'เจาะเกราะ +50 และลด M.DEF ศัตรู 20%'}}
};
const SETS={
  seraph:{n:'ชุดรุ่งอรุณ',b:{2:{mdef:20,matk:15},4:{dr:.08,mdef:15}}},
  shadow:{n:'ชุดนินจาสนธยา',b:{2:{agi:8,critRate:.05},4:{passive:'shadowBleed',d:'โจมตีมีโอกาส 25% ทำให้เลือดออก'}}},
  golem:{n:'ชุดศิลาโกเลม',b:{2:{def:20},3:{dr:.10}}},
  magma:{n:'ชุดแมกมาเดือด',b:{2:{resFire:.3,atk:15},3:{passive:'magmaBurn',d:'โจมตีมีโอกาส 30% ทำให้เผาไหม้'}}},
  mage:{n:'ชุดนักปราชญ์ดารา',b:{2:{matk:12},4:{mpowPct:.2,d:'พลังเวท +20%'}}},
  alchemist:{n:'ชุดนักแปรธาตุ',b:{2:{statusChance:.10},4:{dotPct:.30,d:'ดาเมจสถานะ (DoT) ที่ทำ +30%'}}},
  boss:{n:'ชุดจอมทัพ',b:{2:{def:10},4:{dmgPct:.2,d:'ดาเมจ +20%'}}},
  ice:{n:'ชุดเกราะเหมันต์',b:{2:{def:16,mdef:16},4:{dmgPct:.15,dr:.08,d:'ดาเมจ +15%, ลดดาเมจ +8%'}}}
};
const MATS={
  wood:{n:'ไม้',ic:'🪵'},ore:{n:'แร่เหล็ก',ic:'🪨'},stoneore:{n:'แร่หิน',ic:'🪨'},iceore:{n:'แร่เหล็กน้ำแข็ง',ic:'🧊'},
  fire:{n:'คริสตัลไฟ',ic:'🔥'},thunder:{n:'หินสมมาตรขาว',ic:'💠'},fang:{n:'เขี้ยวหนู',ic:'🦷'},
  hide:{n:'หนังสัตว์',ic:'🟫'},cheese:{n:'ชีสแข็งโป๊ก',ic:'🧀'},pan:{n:'กระทะของพ่อ',ic:'🍳',rareMat:1},cloth:{n:'ผ้าเงา',ic:'🧵'},core:{n:'แก่นหินเทพ',ic:'💠',rareMat:1,rar:'epic',desc:'แก่นศิลาโบราณ (ดรอปเฉพาะจากบอสโกเลมหิน)'},
  lavaore:{n:'แร่ลาวา',ic:'🟧'},essence:{n:'แก่นลาวาเทพ',ic:'🌟',rareMat:1,rar:'epic',desc:'แก่นเพลิงบริสุทธิ์ (ดรอปเฉพาะจากบอสราชันย์ลาวา)'},
  potion:{n:'ยาฟื้น HP',ic:'❤️',use:'potion',desc:'ฟื้น HP 40%'},
  pot_regen:{n:'ยาฟื้นเลือดต่อเนื่อง',ic:'💖',use:'buff',rar:'rare',desc:'บัพ 20 วิ: ฟื้นฟู HP 3% ของ Max HP ทุก 1 วินาที',buff:{id:'pot_regen',dur:20,mods:[{id:'pot_regen',n:'ฟื้นเลือด 3%/วิ',kind:'buff',stat:'hotPct',op:'add',v:.03}]}},
  pot_def:{n:'ยาเพิ่มเกราะ',ic:'🛡️',use:'buff',rar:'rare',desc:'บัพ 20 วิ: เพิ่มเกราะกายภาพ (DEF) +50',buff:{id:'pot_def',dur:20,mods:[{id:'pot_def',n:'เกราะ +50',kind:'buff',stat:'def',op:'add',v:50}]}},
  pot_mdef:{n:'ยาเพิ่มเกราะเวท',ic:'🔮',use:'buff',rar:'rare',desc:'บัพ 20 วิ: เพิ่มเกราะเวท (M.DEF) +50',buff:{id:'pot_mdef',dur:20,mods:[{id:'pot_mdef',n:'เกราะเวท +50',kind:'buff',stat:'mdef',op:'add',v:50}]}},
  pot_m150:{n:'ยาเพิ่ม M150',ic:'⚡',use:'buff',rar:'epic',desc:'บัพ 20 วิ: คริ +20% · ดาเมจ +20% · DEF/M.DEF +20 · ลด Max HP 10%',buff:{id:'pot_m150',dur:20,mods:[{id:'pot_m150_cr',n:'M150 คริ +20%',kind:'buff',stat:'critRate',op:'add',v:.20},{id:'pot_m150_dm',n:'M150 ดาเมจ +20%',kind:'buff',stat:'dmgPct',op:'add',v:.20},{id:'pot_m150_df',n:'M150 DEF +20',kind:'buff',stat:'def',op:'add',v:20},{id:'pot_m150_md',n:'M150 M.DEF +20',kind:'buff',stat:'mdef',op:'add',v:20},{id:'pot_m150_hp',n:'M150 MaxHP -10%',kind:'debuff',stat:'maxHP',op:'mul',v:.90}]}},
  pot_quad:{n:'ยาเพิ่ม 4 อย่าง',ic:'🌟',use:'buff',rar:'epic',desc:'บัพ 20 วิ: เจาะเกราะ +20% · เจาะเวท +20% · คริ +20% · คริดาเมจ +20%',buff:{id:'pot_quad',dur:20,mods:[{id:'pot_quad_ap',n:'เจาะเกราะ +20%',kind:'buff',stat:'apenPct',op:'add',v:.20},{id:'pot_quad_mp',n:'เจาะเวท +20%',kind:'buff',stat:'mpenPct',op:'add',v:.20},{id:'pot_quad_cr',n:'คริ +20%',kind:'buff',stat:'critRate',op:'add',v:.20},{id:'pot_quad_cd',n:'คริดาเมจ +20%',kind:'buff',stat:'critDmg',op:'add',v:.20}]}},
  mercury:{n:'ปรอท',ic:'💧',desc:'โลหะเหลวจากสไลม์ปรอท ใช้ตีไม้เท้าปรอท'},philostone:{n:'ศิลานักแปรธาตุแปรปรวน',ic:'🔮',rareMat:1,rar:'epic',desc:'ใช้ที่นักเล่นแร่แปรธาตุ: ล็อกค่าเสริม 1 ค่าไว้ตอนหลอมรวม (ดรอปเฉพาะจากบอสนักแปรธาตุที่บิดเบี้ยว)'},
  sc_merc:{n:'คัมภีร์สูตร: ไม้เท้าปรอท',ic:'📙',scroll:'mercstaff'},
  mp_s:{n:'ยามานา (เล็ก)',ic:'🧪',manaPotion:100},mp_m:{n:'ยามานา (กลาง)',ic:'🧪',manaPotion:250},
  mp_l:{n:'ยามานา (ใหญ่)',ic:'🧪',manaPotion:500},mp_x:{n:'ยามานา (สูงสุด)',ic:'🧪',manaPotion:1000},
  sealbreaker:{n:'ตราทำลายผนึกเฉพาะตัว',ic:'🗝️',rareMat:1,use:'sealbreak',desc:'หายากที่สุด — ปลดผนึกสกิลเฉพาะตัวเพื่อเปลี่ยนเป็นสกิลเฉพาะตัวอื่น (ใช้ที่หน้าสกิล)'},
  bossfrag:{n:'ดวงตาศักดิ์สิทธิ์ของเซราฟ',ic:'👁️',rareMat:1,rar:'epic',desc:'ดวงตาเรืองแสงศักดิ์สิทธิ์ (ดรอปเฉพาะจากบอสเซราฟตาเดียว)'},
  cryst_durable:{n:'คริสตัลตีเหล็กคงทน',ic:'💠',booster:1,craftBoost:.10,rar:'rare',rareMat:1,shopOnly:1,desc:'เพิ่มโอกาสคราฟต์ +10% (ใช้ 1 ชิ้นต่อครั้ง · ใช้กับคราฟต์เท่านั้น)'},
  cryst_great:{n:'คริสตัลตีเหล็กดีเยี่ยม',ic:'🔷',booster:1,craftBoost:.15,rar:'epic',rareMat:1,shopOnly:1,desc:'เพิ่มโอกาสคราฟต์ +15% (ใช้ 1 ชิ้นต่อครั้ง · ใช้กับคราฟต์เท่านั้น)'},
  divine:{n:'คริสตัลตีเหล็กศักดิ์สิทธิ์',ic:'💎',booster:1,craftBoost:.20,rar:'legendary',rareMat:1,shopOnly:1,desc:'เพิ่มโอกาสคราฟต์ +20% (ใช้ 1 ชิ้นต่อครั้ง · ใช้กับคราฟต์เท่านั้น)'},
  evostone:{n:'หินแห่งการวิวัฒน์',ic:'🌟',rareMat:1,rar:'epic',desc:'ใช้วิวัฒน์อุปกรณ์ Lv.100 และ +15 เพื่อเลื่อนระดับความหายากขึ้น 1 ขั้น'},
  exitscroll:{n:'คัมภีร์ทางออก',ic:'📜',use:'exit',shopOnly:1,desc:'ใช้แล้วกลับเมืองทันที (ใช้ได้เฉพาะในดันเจี้ยน)'},
  exprock:{n:'หินเสริมพลังอุปกรณ์',ic:'🪨',rareMat:1,expVal:1000,shopOnly:1,desc:'เพิ่ม EXP อุปกรณ์ +1,000 (ใช้ในหน้าอัปเลเวลอุปกรณ์)'},
  talentevo:{n:'พรสวรรค์แห่งการวิวัฒน์',ic:'✨',rar:'legendary',rareMat:1,use:'talent',shopOnly:1,desc:'ใช้เปลี่ยนพรสวรรค์ประจำตัวใหม่ (คงเลเวลและอุปกรณ์เดิมทั้งหมด)'},
  rune_atk:{n:'รูนพลังโจมตี',ic:'🔴',rune:{atk:12},desc:'ใส่ช่องรูน: พลังโจมตี +12'},
  rune_matk:{n:'รูนพลังเวท',ic:'🟣',rune:{matk:14},desc:'ใส่ช่องรูน: พลังเวท +14'},
  rune_def:{n:'รูนศิลาป้องกัน',ic:'🛡️',rune:{def:10,mdef:8},desc:'ใส่ช่องรูน: DEF +10, M.DEF +8'},
  rune_hp:{n:'รูนพลังชีวิต',ic:'💚',rune:{hp:120},desc:'ใส่ช่องรูน: HP +120'},
  rune_crit:{n:'รูนคมกริบ',ic:'⚡',rune:{critRate:.04,critDmg:.15},desc:'ใส่ช่องรูน: คริ +4%, ดาเมจคริ +15%'},
  rune_agi:{n:'รูนสายลม',ic:'🍃',rune:{agi:5,mpRegen:.04},desc:'ใส่ช่องรูน: AGI +5, ฟื้นฟูมานา +4%'},
  reset:{n:'คัมภีร์ล้างค่าพลัง',ic:'📜',use:'reset'},
  sc_flame:{n:'คัมภีร์สูตร: ดาบถ่านแดง',ic:'📘',scroll:'flame'},sc_gaunt:{n:'คัมภีร์สูตร: สนับมือฟ้าคำราม',ic:'📘',scroll:'gaunt'},
  sc_hammer:{n:'คัมภีร์สูตร: ค้อนชีสหินผา',ic:'📘',scroll:'hammer'},
  sc_reset:{n:'คัมภีร์สูตร: ล้างค่าพลัง',ic:'📘',scroll:'reset'},sc_dragon:{n:'คัมภีร์สูตร: เกราะเกล็ดมังกรแดง',ic:'📙',scroll:'dragon'},
  sc_firepan:{n:'คัมภีร์สูตร: กระทะเพลิงมรดกพ่อ',ic:'📙',scroll:'firepan'},sc_kage:{n:'คัมภีร์สูตร: ดาบเงาจันทร์มืด',ic:'📙',scroll:'kage'},key_lava:{n:'กุญแจเหมืองลาวา',ic:'🗝️',key:1,desc:'ไขประตูเหมืองลาวาร้างในถ้ำชีส ได้จากคาเงะ นักดาบเงา'},
  sc_golem:{n:'คัมภีร์สูตร: ชุดศิลาโกเลม',ic:'📙',scroll:['golemarmor','golemgloves','golempants']},sc_magma:{n:'คัมภีร์สูตร: เกราะแมกมาเดือด',ic:'📙',scroll:'magma'},
  sc_god:{n:'คัมภีร์สูตรโบราณ: ดาบหัวใจภูเขาไฟ',ic:'📕',scroll:'god'}
};
const RUNES=['rune_atk','rune_matk','rune_def','rune_hp','rune_crit','rune_agi'];
const SPECIAL_SHOP=[
  {id:'divine',price:3000,max:1,cdH:6,tag:'Legendary · คราฟต์ +20%'},
  {id:'cryst_durable',price:600,max:10,cdH:3,tag:'Rare · คราฟต์ +10%'},
  {id:'cryst_great',price:1200,max:5,cdH:3,tag:'Epic · คราฟต์ +15%'},
  {id:'evostone',price:5000,max:5,cdH:3,tag:'Evolution · ใช้วิวัฒน์อุปกรณ์'},
  {id:'exitscroll',price:300,max:10,cdH:.5,tag:'ใช้งาน · กลับเมืองทันทีจากดันเจี้ยน'},
  {id:'exprock',price:800,max:50,cdH:.5,tag:'EXP Item · เพิ่ม EXP อาวุธ 1,000'},
  {id:'talentevo',price:3000,max:2,cdH:2.5,tag:'Legendary · เปลี่ยนพรสวรรค์'}
];
/* Skill Books — the ONLY way to learn Common / Rare / Ultimate skills (no level or quest unlocks).
   Sources are configured in LOOT (monster drops) and chest contents below. */
/* ผู้ใช้สกิล: 'all' = ทั้งผู้เล่นและศัตรู · 'player' = ผู้เล่นเท่านั้น · 'enemy' = ศัตรูเท่านั้น (ค่าเริ่มต้น all) */
const SKILL_USER={};   // ตั้งเฉพาะสกิลที่ไม่ใช่ 'all' เช่น SKILL_USER.luckyseven='player'
for(const id in SKILLS)SKILLS[id].user=SKILL_USER[id]||SKILLS[id].user||'all';
for(const id in SKILLS)if(SKILLS[id].talent)SKILLS[id].user='player';   // สกิลพรสวรรค์เป็นของผู้เล่น
const skillUsable=(id,who)=>{const s=SKILLS[id];return!!s&&(s.user==='all'||s.user===who);};
for(const id in SKILLS)if(SKILLS[id].tier!=='unique'&&SKILLS[id].user!=='enemy')MATS['sk_'+id]={n:'ตำราสกิล: '+SKILLS[id].n,ic:{common:'📗',rare:'📘',ultimate:'📙'}[SKILLS[id].tier],use:'learn',skillBook:id};
/* Recipe Data Table — validated by exact ingredient IDs + quantities (order does not matter).
   `clue` is the written hint the player reads in books / from NPCs; no recipe list is ever shown. */
const RECIPES=[
  {id:'club',out:{base:'w_club'},rar:'normal',mats:{wood:2},known:1,clue:'โบโรเล่า: "ไม้สองท่อนมัดรวมกัน ก็ได้กระบองตีหัวหนูแล้ว"'},
  {id:'stonesword',out:{base:'w_stonesword'},rar:'normal',mats:{stoneore:2,wood:1},known:1,clue:'โบโรเล่า: "แร่หินสองก้อนเหลาคมเข้าด้ามไม้หนึ่ง — ได้ดาบหินไว้ลุยถ้ำต้นเกมเลย"'},
  {id:'sword',out:{base:'w_sword'},rar:'normal',mats:{wood:1,ore:1},known:1,clue:'โบโรเล่า: "ด้ามไม้หนึ่ง ใบแร่เหล็กหนึ่ง — นั่นแหละดาบของช่างฝึกหัด"'},
  {id:'spear',out:{base:'w_spear'},rar:'normal',mats:{wood:1,fang:1},known:1,clue:'โบโรเล่า: "เอาเขี้ยวหนูหนึ่งซี่ผูกปลายไม้ จะได้หอกแหลมเปี๊ยบ"'},
  {id:'hhelm',out:{base:'h_leather'},rar:'normal',mats:{hide:2,wood:1},known:1,clue:'โบโรเล่า: "หนังสัตว์สองผืน ไม้หนึ่งชิ้นทำโครง ได้หมวกหนัง"'},
  {id:'hpants',out:{base:'p_leather'},rar:'normal',mats:{hide:2},known:1,clue:'โบโรเล่า: "หนังสัตว์สองผืนเย็บรวม ใส่เป็นกางเกงได้"'},
  {id:'iboots',out:{base:'b_iron'},rar:'normal',mats:{ore:2},known:1,clue:'โบโรเล่า: "แร่เหล็กสองก้อนตีแผ่ เป็นรองเท้าเหล็กพอดีเท้า"'},
  {id:'potion',out:{mat:'potion',q:3},rar:'normal',mats:{cheese:1,hide:1},known:1,clue:'ไลร่ากระซิบ: "ชีสหนึ่งก้อนห่อหนังสัตว์หนึ่งผืน ต้มแล้วได้ยาสามขวด"'},
  {id:'flame',out:{base:'w_flame'},rar:'rare',mats:{ore:2,fire:1,wood:1},clue:'คัมภีร์ดาบเพลิง: "แร่สอง ไม้หนึ่ง และหัวใจไฟหนึ่งดวง"'},
  {id:'gaunt',out:{base:'w_gaunt'},rar:'rare',mats:{ore:1,thunder:1,hide:1},clue:'คัมภีร์สนับมือ: "แร่หนึ่ง หินสมมาตรขาวหนึ่ง พันด้วยหนังหนึ่งผืน"'},
  {id:'hammer',out:{base:'w_hammer'},rar:'rare',mats:{cheese:1,wood:2},clue:'โน้ตลายมือเด็ก: "ชีสแข็งโป๊กหนึ่งก้อน เสียบไม้สองท่อน = ค้อน!!"'},
  {id:'reset',out:{mat:'reset',q:1},rar:'rare',mats:{cheese:1,fang:2},clue:'คัมภีร์ล้างค่าพลัง: "ชีสหนึ่ง เขี้ยวสอง เขียนอักขระลบความทรงจำ"'},
  {id:'dragon',out:{base:'a_dragon'},rar:'epic',mats:{hide:3,fire:2,ore:2},clue:'ตำรามังกร: "หนังสาม ไฟสอง เหล็กสอง หลอมเป็นเกล็ดมังกร"'},
  {id:'firepan',out:{base:'w_firepan'},rar:'epic',mats:{pan:1,fire:1},clue:'จดหมายของพ่อ: "กระทะของพ่อ กับคริสตัลไฟหนึ่งดวง... ระวัง กระทะมีใบเดียวนะลูก"'},
  {id:'kage',out:{base:'w_kage'},rar:'epic',mats:{cloth:3,ore:2},clue:'ม้วนลับของคาเงะ: "ผ้าเงาสามผืน พันแร่เหล็กสองก้อน ได้ดาบเงา"'},
  {id:'golemarmor',out:{base:'a_golem'},rar:'epic',mats:{ore:3},clue:'ศิลาจารึกโกเลม: "แร่เหล็กสามก้อน = เกราะหิน"'},
  {id:'golemgloves',out:{base:'g_golem'},rar:'rare',mats:{ore:1},clue:'ศิลาจารึกโกเลม: "แร่เหล็กหนึ่งก้อน = ถุงมือหิน"'},
  {id:'golempants',out:{base:'p_golem'},rar:'rare',mats:{hide:3},clue:'ศิลาจารึกโกเลม: "หนังสัตว์สามผืน = สนับขาศิลา"'},
  {id:'magma',out:{base:'a_magma'},rar:'epic',mats:{lavaore:4},clue:'บันทึกคนงานเหมือง: "แร่ลาวาสี่ก้อนหลอมรวม กลายเป็นเกราะแมกมา"'},
  {id:'gs1',out:{base:'w_gs1'},rar:'normal',mats:{ore:3,wood:1},known:1,clue:'โบโรเล่า: "แร่สามก้อนตีเป็นใบยาว ด้ามไม้หนึ่ง — ถือสองมือนะ หนักใช่เล่น"'},
  {id:'gs2',out:{base:'w_gs2'},rar:'rare',mats:{ore:4,fire:1,fang:2},known:1,clue:'โบโรเล่า: "แร่สี่ ไฟหนึ่ง เขี้ยวสอง ชุบใบดาบใหญ่ให้คมดั่งเขี้ยวมังกร"'},
  {id:'gs3',out:{base:'w_gs3'},rar:'epic',mats:{ore:4,cloth:2},known:1,clue:'โบโรเล่า: "ผ้าเงาสอง หลอมกับแร่สี่ — ดาบใหญ่แห่งราตรี"'},
  {id:'wh1',out:{base:'w_wh1'},rar:'normal',mats:{ore:3,wood:2},known:1,clue:'โบโรเล่า: "หัวค้อนแร่สามก้อน ด้ามไม้สองท่อน ทุบทีหัวมึนเลย"'},
  {id:'wh2',out:{base:'w_wh2'},rar:'rare',mats:{ore:4,thunder:1,hide:1},known:1,clue:'โบโรเล่า: "แร่สี่ หินสมมาตรขาวหนึ่ง พันด้ามด้วยหนัง — ค้อนศิลาฟ้า"'},
  {id:'wh3',out:{base:'w_wh3'},rar:'epic',mats:{lavaore:3,ore:2},known:1,clue:'โบโรเล่า: "แร่ลาวาสาม แร่เหล็กสอง — ทุบทีแผ่นดินสะเทือน"'},
  {id:'mercstaff',out:{base:'w_mercstaff'},rar:'epic',mats:{mercury:4,fire:1},clue:'บันทึกอาจารย์นักแปรธาตุ: "ปรอทสี่หยด จุดด้วยไฟหนึ่ง — ไม้เท้าที่ยิงหมอกพิษ"'},
  {id:'lightless',out:{base:'w_lightless'},rar:'legendary',rate:.10,mats:{bossfrag:10,ore:20,hide:2,wood:2},gold:10,known:1,clue:'จารึกดำในห้องบอส: "ดวงตาศักดิ์สิทธิ์ของเซราฟสิบ แร่เหล็กยี่สิบ หนังสอง ไม้สอง ทองสิบ — ดาบที่กลืนแสง"'},
  {id:'primal',out:{base:'r_primal'},rar:'legendary',rate:.10,mats:{bossfrag:10,ore:10},gold:10,known:1,clue:'บันทึกอาจารย์นักแปรธาตุ: "ดวงตาศักดิ์สิทธิ์ของเซราฟสิบ แร่เหล็กสิบ ทองสิบ — แหวนแห่งปฐมกาล"'},
  {id:'god',out:{base:'w_god'},rar:'epic',mats:{essence:1,lavaore:5,fire:2},clue:'คัมภีร์เทพ: "แก่นลาวาเทพหนึ่ง แร่ลาวาห้า คริสตัลไฟสอง — ดาบแห่งภูเขาไฟ"'},
  {id:'evostone',out:{mat:'evostone',q:1},rar:'epic',mats:{philostone:6,bossfrag:2,ore:20},known:1,clue:'ตำรานักแปรธาตุที่บิดเบี้ยว: "ศิลานักแปรธาตุแปรปรวนหก ดวงตาศักดิ์สิทธิ์สอง แร่เหล็กยี่สิบ — หินแห่งการวิวัฒน์"'},
  {id:'iceboots',out:{base:'b_ice'},rar:'normal',mats:{iceore:2,hide:1},known:1,clue:'ช่างถ้ำน้ำแข็ง: "แร่เหล็กน้ำแข็ง 2 ก้อน บุหนัง 1 ผืน — รองเท้าน้ำแข็งคล่องตัว"'},
  {id:'icesword',out:{base:'w_icesword'},rar:'rare',mats:{iceore:3,ore:2,wood:1},known:1,clue:'ช่างถ้ำน้ำแข็ง: "แร่เหล็กน้ำแข็ง 3 ก้อน แร่เหล็ก 2 ด้ามไม้ 1 — ดาบเกล็ดน้ำแข็ง"'},
  {id:'icehelm',out:{base:'h_ice'},rar:'rare',mats:{iceore:4,ore:2},known:1,clue:'ช่างถ้ำน้ำแข็ง: "แร่เหล็กน้ำแข็ง 4 ก้อน แร่เหล็ก 2 — หมวกอัศวินน้ำแข็ง"'},
  {id:'iceaxe',out:{base:'w_iceaxe'},rar:'epic',mats:{iceore:5,ore:3,hide:2},known:1,clue:'ช่างถ้ำน้ำแข็ง: "แร่เหล็กน้ำแข็ง 5 แร่เหล็ก 3 หนัง 2 — ขวานศึกเหมันต์สองมือ"'},
  {id:'icearmor',out:{base:'a_ice'},rar:'legendary',rate:.15,mats:{iceore:12,bossfrag:2,ore:6},gold:500,known:1,clue:'ตำราโบราณแห่งน้ำแข็ง: "แร่เหล็กน้ำแข็ง 12 ดวงตาเซราฟ 2 แร่เหล็ก 6 ทอง 500 — เกราะจักรพรรดิเหมันต์"'},
  {id:'icegloves',out:{base:'g_ice'},rar:'rare',mats:{iceore:2,cloth:1},known:1,clue:'ช่างถ้ำน้ำแข็ง: "แร่เหล็กน้ำแข็ง 2 ก้อน ผ้าเงา 1 — ถุงมือน้ำแข็ง"'},
  {id:'icepants',out:{base:'p_ice'},rar:'rare',mats:{iceore:3,hide:2},known:1,clue:'ช่างถ้ำน้ำแข็ง: "แร่เหล็กน้ำแข็ง 3 ก้อน หนัง 2 — สนับขาน้ำแข็ง"'},
  // ---- อาวุธเวท / กริช / ไม้เท้า / เคียว / ดาบรุ่งอรุณ ----
  {id:'mswd',out:{base:'w_mswd'},rar:'rare',mats:{ore:2,thunder:1,wood:2},known:1,clue:'คัมภีร์ช่างเวท: "แร่เหล็ก 2 หินสมมาตรขาว 1 ไม้ 2 — ดาบมนตรา"'},
  {id:'mstaff',out:{base:'w_mstaff'},rar:'epic',mats:{wood:2,thunder:2,mercury:1},known:1,clue:'คัมภีร์ช่างเวท: "ไม้ 2 หินสมมาตรขาว 2 ปรอท 1 — คทาดาราจักร"'},
  {id:'adagger',out:{base:'w_adagger'},rar:'rare',mats:{ore:1,fang:2,thunder:1},known:1,clue:'คัมภีร์ช่างเวท: "แร่เหล็ก 1 เขี้ยวหนู 2 หินสมมาตรขาว 1 — กริชอาคมพราย"'},
  {id:'wand_fire',out:{base:'w_wand_fire'},rar:'rare',mats:{wood:2,fire:2},known:1,clue:'คัมภีร์จอมเวท: "ไม้ 2 คริสตัลไฟ 2 — ไม้เท้าเปลวอัคคี"'},
  {id:'wand_ice',out:{base:'w_wand_ice'},rar:'rare',mats:{wood:2,iceore:2},known:1,clue:'คัมภีร์จอมเวท: "ไม้ 2 แร่เหล็กน้ำแข็ง 2 — ไม้เท้าเกล็ดหิมะ"'},
  {id:'wand_lightning',out:{base:'w_wand_lightning'},rar:'rare',mats:{wood:2,thunder:2},known:1,clue:'คัมภีร์จอมเวท: "ไม้ 2 หินสมมาตรขาว 2 — ไม้เท้าอสนีบาต"'},
  {id:'scythe',out:{base:'w_scythe'},rar:'epic',mats:{cloth:3,core:1,ore:2},known:1,clue:'บันทึกเงามืด: "ผ้าเงา 3 แก่นหินเทพ 1 แร่เหล็ก 2 — เคียวสุญญตา"'},
  {id:'wseraph',out:{base:'w_seraph'},rar:'epic',mats:{ore:4,bossfrag:1,fire:1},known:1,clue:'จารึกรุ่งอรุณ: "แร่เหล็ก 4 ดวงตาเซราฟ 1 คริสตัลไฟ 1 — ดาบขนนกรุ่งอรุณ"'},
  // ---- เครื่องประดับ ----
  {id:'rcopper',out:{base:'r_copper'},rar:'normal',mats:{ore:1,stoneore:1},known:1,clue:'โบโรเล่า: "แร่เหล็ก 1 แร่หิน 1 — แหวนทองแดงช่างฝีมือ"'},
  {id:'rruby',out:{base:'r_ruby'},rar:'rare',mats:{ore:2,fire:1,stoneore:1},known:1,clue:'ช่างอัญมณี: "แร่เหล็ก 2 คริสตัลไฟ 1 แร่หิน 1 — แหวนทับทิมเลือด"'},
  {id:'rluck',out:{base:'r_luck'},rar:'rare',mats:{ore:1,hide:2,cheese:1},known:1,clue:'ช่างอัญมณี: "แร่เหล็ก 1 หนัง 2 ชีส 1 — แหวนใบโคลเวอร์"'},
  {id:'nfang',out:{base:'n_fang'},rar:'normal',mats:{fang:2,hide:1},known:1,clue:'โบโรเล่า: "เขี้ยวหนู 2 หนัง 1 — สร้อยเขี้ยวถ้ำ"'},
  {id:'ncrystal',out:{base:'n_crystal'},rar:'rare',mats:{iceore:2,thunder:1},known:1,clue:'ช่างอัญมณี: "แร่เหล็กน้ำแข็ง 2 หินสมมาตรขาว 1 — สร้อยคริสตัลมานา"'},
  {id:'ngod',out:{base:'n_god'},rar:'epic',mats:{fire:1,thunder:1,iceore:1,lavaore:1,core:1},known:1,clue:'ตำราเบญจธาตุ: "ไฟ 1 หินสมมาตรขาว 1 น้ำแข็ง 1 ลาวา 1 แก่นหินเทพ 1 — อามูเลตห้าธาตุ"'},
  // ---- เกราะ / หมวก / ถุงมือ / กางเกง / รองเท้าทั่วไป ----
  {id:'acloth',out:{base:'a_cloth'},rar:'normal',mats:{wood:1,hide:1},known:1,clue:'โบโรเล่า: "ไม้ 1 หนัง 1 — เสื้อป่านชาวบ้าน"'},
  {id:'aleather',out:{base:'a_leather'},rar:'normal',mats:{hide:4},known:1,clue:'โบโรเล่า: "หนังสัตว์ 4 ผืน — เกราะหนังพราน"'},
  {id:'gleather',out:{base:'g_leather'},rar:'normal',mats:{hide:1,fang:1},known:1,clue:'โบโรเล่า: "หนัง 1 เขี้ยวหนู 1 — ถุงมือหนังพราน"'},
  {id:'pcloth',out:{base:'p_cloth'},rar:'normal',mats:{cloth:1,wood:1},known:1,clue:'โบโรเล่า: "ผ้าเงา 1 ไม้ 1 — กางเกงป่าน"'},
  {id:'hiron',out:{base:'h_iron'},rar:'normal',mats:{ore:2,stoneore:1},known:1,clue:'โบโรเล่า: "แร่เหล็ก 2 แร่หิน 1 — หมวกเหล็กทหารยาม"'},
  {id:'giron',out:{base:'g_iron'},rar:'normal',mats:{ore:1,stoneore:2},known:1,clue:'โบโรเล่า: "แร่เหล็ก 1 แร่หิน 2 — ถุงมือเหล็กทหาร"'},
  {id:'hband',out:{base:'h_band'},rar:'normal',mats:{cloth:2},known:1,clue:'นักสู้: "ผ้าเงา 2 ผืน — ผ้าคาดผากนักสู้"'},
  {id:'bwind',out:{base:'b_wind'},rar:'rare',mats:{hide:2,thunder:1},known:1,clue:'ช่างหนัง: "หนัง 2 หินสมมาตรขาว 1 — รองเท้าสายลม"'},
  {id:'hhorns',out:{base:'h_horns'},rar:'epic',mats:{fang:4,lavaore:2},known:1,clue:'บันทึกปีศาจ: "เขี้ยวหนู 4 แร่ลาวา 2 — มงกุฎเขาอสูร"'},
  // ---- ชุดนินจาสนธยา (Shadow) ----
  {id:'hshadow',out:{base:'h_shadow'},rar:'rare',mats:{cloth:2,hide:1},known:1,clue:'ม้วนสนธยา: "ผ้าเงา 2 หนัง 1 — ผ้าคาดผากสนธยา"'},
  {id:'ashadow',out:{base:'a_shadow'},rar:'epic',mats:{cloth:4,ore:1},known:1,clue:'ม้วนสนธยา: "ผ้าเงา 4 แร่เหล็ก 1 — ชุดนินจาสนธยา"'},
  {id:'gshadow',out:{base:'g_shadow'},rar:'rare',mats:{cloth:2,fang:1},known:1,clue:'ม้วนสนธยา: "ผ้าเงา 2 เขี้ยวหนู 1 — ถุงมือสนธยา"'},
  {id:'pshadow',out:{base:'p_shadow'},rar:'rare',mats:{cloth:2,stoneore:1},known:1,clue:'ม้วนสนธยา: "ผ้าเงา 2 แร่หิน 1 — กางเกงสนธยา"'},
  {id:'bshadow',out:{base:'b_shadow'},rar:'rare',mats:{cloth:2,wood:1},known:1,clue:'ม้วนสนธยา: "ผ้าเงา 2 ไม้ 1 — รองเท้าสนธยา"'},
  // ---- ชุดแมกมาเดือด (Magma) ----
  {id:'hcrown',out:{base:'h_crown'},rar:'epic',mats:{lavaore:3,fire:2},known:1,clue:'บันทึกคนงานเหมือง: "แร่ลาวา 3 คริสตัลไฟ 2 — มงกุฎแมกมา"'},
  {id:'bmagma',out:{base:'b_magma'},rar:'epic',mats:{lavaore:2,fire:1,ore:1},known:1,clue:'บันทึกคนงานเหมือง: "แร่ลาวา 2 คริสตัลไฟ 1 แร่เหล็ก 1 — รองเท้าแมกมาเดือด"'},
  // ---- ชุดนักแปรธาตุ (Alchemist) ----
  {id:'halch',out:{base:'h_alch'},rar:'epic',mats:{mercury:2,cloth:2},known:1,clue:'บันทึกนักแปรธาตุ: "ปรอท 2 ผ้าเงา 2 — หมวกนักแปรธาตุ"'},
  {id:'aalch',out:{base:'a_alch'},rar:'epic',mats:{mercury:3,hide:2,ore:1},known:1,clue:'บันทึกนักแปรธาตุ: "ปรอท 3 หนัง 2 แร่เหล็ก 1 — เสื้อคลุมนักแปรธาตุ"'},
  {id:'galch',out:{base:'g_alch'},rar:'rare',mats:{mercury:2,hide:1},known:1,clue:'บันทึกนักแปรธาตุ: "ปรอท 2 หนัง 1 — ถุงมือนักแปรธาตุ"'},
  {id:'balch',out:{base:'b_alch'},rar:'rare',mats:{mercury:2,stoneore:1},known:1,clue:'บันทึกนักแปรธาตุ: "ปรอท 2 แร่หิน 1 — รองเท้านักแปรธาตุ"'},
  // ---- ชุดนักปราชญ์ดารา (Mage) ----
  {id:'hmage',out:{base:'h_mage'},rar:'rare',mats:{cloth:2,thunder:1},known:1,clue:'ตำรานักปราชญ์: "ผ้าเงา 2 หินสมมาตรขาว 1 — หมวกปลายแหลมนักปราชญ์"'},
  {id:'amage',out:{base:'a_mage'},rar:'epic',mats:{cloth:3,thunder:1,ore:1},known:1,clue:'ตำรานักปราชญ์: "ผ้าเงา 3 หินสมมาตรขาว 1 แร่เหล็ก 1 — เสื้อคลุมนักปราชญ์"'},
  {id:'pmage',out:{base:'p_mage'},rar:'rare',mats:{cloth:2,iceore:1},known:1,clue:'ตำรานักปราชญ์: "ผ้าเงา 2 แร่เหล็กน้ำแข็ง 1 — กางเกงนักปราชญ์"'},
  {id:'bmage',out:{base:'b_mage'},rar:'rare',mats:{cloth:1,thunder:1,hide:1},known:1,clue:'ตำรานักปราชญ์: "ผ้าเงา 1 หินสมมาตรขาว 1 หนัง 1 — รองเท้านักปราชญ์"'},
  // ---- ชุดรุ่งอรุณ (Seraph) ----
  {id:'hhalo',out:{base:'h_halo'},rar:'epic',mats:{bossfrag:2,thunder:2},known:1,clue:'จารึกรุ่งอรุณ: "ดวงตาเซราฟ 2 หินสมมาตรขาว 2 — วงรัศมีรุ่งอรุณ"'},
  {id:'aseraph',out:{base:'a_seraph'},rar:'epic',mats:{bossfrag:3,cloth:3},known:1,clue:'จารึกรุ่งอรุณ: "ดวงตาเซราฟ 3 ผ้าเงา 3 — เสื้อคลุมรุ่งอรุณ"'},
  {id:'gseraph',out:{base:'g_seraph'},rar:'epic',mats:{bossfrag:1,cloth:2},known:1,clue:'จารึกรุ่งอรุณ: "ดวงตาเซราฟ 1 ผ้าเงา 2 — ถุงมือรุ่งอรุณ"'},
  {id:'pseraph',out:{base:'p_seraph'},rar:'epic',mats:{bossfrag:1,hide:2},known:1,clue:'จารึกรุ่งอรุณ: "ดวงตาเซราฟ 1 หนัง 2 — กางเกงรุ่งอรุณ"'},
  // ---- ชุดจอมทัพ (Boss) ----
  {id:'hboss',out:{base:'h_boss'},rar:'epic',mats:{core:1,essence:1,ore:2},known:1,clue:'บันทึกจอมทัพ: "แก่นหินเทพ 1 แก่นลาวาเทพ 1 แร่เหล็ก 2 — หมวกเขาจอมทัพ"'},
  {id:'aboss',out:{base:'a_boss'},rar:'epic',mats:{core:2,essence:1,lavaore:3},known:1,clue:'บันทึกจอมทัพ: "แก่นหินเทพ 2 แก่นลาวาเทพ 1 แร่ลาวา 3 — เกราะจอมทัพ"'},
  {id:'gboss',out:{base:'g_boss'},rar:'epic',mats:{core:1,ore:3,hide:1},known:1,clue:'บันทึกจอมทัพ: "แก่นหินเทพ 1 แร่เหล็ก 3 หนัง 1 — ถุงมือจอมทัพ"'},
  {id:'bboss',out:{base:'b_boss'},rar:'epic',mats:{essence:1,ore:3,hide:1},known:1,clue:'บันทึกจอมทัพ: "แก่นลาวาเทพ 1 แร่เหล็ก 3 หนัง 1 — รองเท้าจอมทัพ"'},
  // ---- ยา & หินเสริมพลัง ----
  {id:'mps',out:{mat:'mp_s',q:2},rar:'normal',mats:{iceore:1,wood:1},known:1,clue:'ไลร่ากระซิบ: "แร่เหล็กน้ำแข็ง 1 ไม้ 1 — ยามานา (เล็ก) ×2"'},
  {id:'mpm',out:{mat:'mp_m',q:2},rar:'rare',mats:{mercury:1,iceore:1},known:1,clue:'ไลร่ากระซิบ: "ปรอท 1 แร่เหล็กน้ำแข็ง 1 — ยามานา (กลาง) ×2"'},
  {id:'exprock',out:{mat:'exprock',q:1},rar:'rare',mats:{stoneore:4,ore:2},known:1,clue:'โบโรเล่า: "แร่หิน 4 แร่เหล็ก 2 — หินเสริมพลังอุปกรณ์"'}
];
const RECIPE_ILVL={normal:1,rare:5,epic:9,legendary:9,god:17};

/* ---------- enemies (base stats at level 1; scaled by level) ----------
   v3 retune: DEF lowered and ATK raised because damage is now subtractive (ATK×mult − DEF) instead of ATK×100/(100+DEF). */
const FOES={
  rat:{n:'หนูถ้ำ',kind:'mon',map:'RAT',pal:'rat',sc:4,hw:22,h:30,spd:1.5,range:30,cd:[26,60],el:'phys',
    base:{hp:180,atk:40,def:3,mdef:3},res:{fire:-.25},xp:25,loot:'rat',
    moves:[M('กัด',9,3,16,10,30,2,16,{hy:14,hh:26}),M('พุ่งกัด',14,10,20,14,30,3,20,{hy:14,hh:26,lunge:3.2})]},
  lavarat:{n:'หนูลาวา',kind:'mon',map:'RAT',pal:'lavarat',sc:4,hw:22,h:30,spd:1.7,range:30,cd:[22,50],el:'fire',
    base:{hp:220,atk:55,def:6,mdef:5},res:{fire:.6,poison:-.3},xp:40,loot:'lavarat',
    moves:[M('กัดไฟ',9,3,16,11,30,2,16,{hy:14,hh:26,el:'fire'}),M('พุ่งลาวา',14,10,20,15,30,3,20,{hy:14,hh:26,lunge:3.4,el:'fire'})]},
  frostslime:{n:'สไลม์เยือกแข็ง',kind:'mon',map:'SLIME',pal:'frostslime',sc:4,hw:22,h:34,spd:1.1,range:32,cd:[26,58],el:'phys',freezeChance:.25,
    base:{hp:340,atk:58,def:12,mdef:4},res:{fire:-.5,phys:.2,poison:.5},xp:55,loot:'icecave',statusRes:{bleed:.6},
    moves:[M('กระแทกเยือก',10,4,18,12,34,3,16,{hy:18,hh:32}),M('เด้งทับ',18,8,22,16,30,4,22,{hy:18,hh:40,lunge:2.6,kd:1})]},
  frostwolf:{n:'หมาป่าหิมะ',kind:'mon',map:'WOLF',pal:'frostwolf',sc:4,hw:30,h:44,spd:2,range:36,cd:[18,40],el:'phys',freezeChance:.25,
    base:{hp:280,atk:70,def:8,mdef:6},res:{fire:-.3,lightning:.2},xp:65,loot:'icecave',
    moves:[M('งับ',7,3,14,11,38,2,14,{hy:22,hh:30}),M('กระโจน',14,10,20,15,36,4,20,{hy:30,hh:44,lunge:3.8}),M('ข่วนต่ำ',9,3,16,10,36,2,18,{hy:6,hh:16,low:1})]},
  iceknight:{n:'อัศวินน้ำแข็ง',kind:'rig',look:'ICEKNIGHT',pal:'iceknight',wpn:'sword',hw:14,h:100,el:'phys',freezeChance:.25,
    attr:{str:25,agi:15,int:10,vit:25,luk:10},skills:['cuttingwind'],base:{hp:420,atk:66,def:14,mdef:8},res:{fire:-.3,phys:.15},statusRes:{stun:.2},xp:110,loot:'icecave',meterStart:0},
  icegolem:{n:'ยักษ์น้ำแข็ง',kind:'mon',map:'GOLEM',pal:'icegolem',sc:5,hw:34,h:80,spd:.8,range:44,cd:[36,74],armor:1,el:'phys',freezeChance:.25,
    base:{hp:800,atk:85,def:18,mdef:6},res:{fire:-.4,phys:.2,lightning:.1},xp:220,loot:'icecave',statusRes:{stun:.4,bleed:.4},
    moves:[M('หมัดน้ำแข็ง',16,4,22,13,56,4,22,{hy:56,hh:46}),M('ทุบพื้นเยือก',26,6,30,15,90,6,30,{hy:6,hh:16,low:1,quake:1,kd:1}),M('ขว้างก้อนน้ำแข็ง',20,3,26,10,0,4,22,{proj:{spd:3.8,r:10,hits:1,rock:1},far:1})]},
  mudslime:{n:'สไลม์โคลน',kind:'mon',map:'SLIME',pal:'mudslime',sc:4,hw:22,h:34,spd:1,range:32,cd:[28,62],el:'phys',
    base:{hp:220,atk:42,def:6,mdef:3},res:{fire:-.3,phys:.15,poison:.4},xp:32,loot:'stonecave',
    moves:[M('พ่นโคลน',10,4,18,10,34,3,16,{hy:18,hh:32}),M('เด้งทับ',18,8,22,14,30,4,22,{hy:18,hh:40,lunge:2.4,kd:1})]},
  rockling:{n:'หินเดินได้',kind:'mon',map:'GOLEM',pal:'rockling',sc:3,hw:24,h:50,spd:.9,range:34,cd:[30,64],armor:1,el:'phys',
    base:{hp:320,atk:48,def:10,mdef:2},res:{phys:.15,lightning:-.4,fire:.2},xp:48,loot:'stonecave',statusRes:{bleed:.5},
    moves:[M('หมัดหิน',12,4,20,12,40,3,18,{hy:30,hh:36}),M('กลิ้งชน',18,12,24,14,30,4,22,{hy:30,hh:44,lunge:2.8,kd:1})]},
  duelist:{n:'bbqy legendary',reflect:.2,lifesteal:.15,revive:2,reviveHp:.5,chaosChance:.2,kind:'rig',fixedLv:100,look:'DUELIST',wpn:'bbqysword',hw:14,h:100,el:'lightning',boss:1,challenge:1,allMagic:1,bgm:'bgm_bbqy',
    attr:{str:30,agi:40,int:20,vit:20,luk:50},skills:['bluejudge','orb','slashwave','bbqybarrier'],base:{hp:5000,atk:304,def:60,mdef:60},res:{lightning:.2,shadow:-.2},statusRes:{stun:.5,bleed:.5,shock:.4},xp:2200,loot:'duelist',meterStart:0},
  kage:{n:'คาเงะ นักดาบเงา',kind:'rig',look:'KAGE',wpn:'kageblade',hw:14,h:100,el:'shadow',miniboss:1,
    attr:{str:15,agi:30,int:10,vit:10,luk:20},skills:['moonfall','slashwave'],base:{hp:400,atk:44,def:12,mdef:8,critRate:.04},res:{shadow:.5,fire:-.2},statusRes:{stun:.15},xp:180,loot:'kage',meterStart:15},   // v0.2.1: อ่อนลง (HP 520→400 ATK 60→44 ความเร็ว/คริ/เกจเริ่มลดลง)
  shade:{n:'เงาสาวก',kind:'rig',look:'SHADE',wpn:'kageblade',hw:14,h:100,el:'shadow',
    attr:{str:14,agi:30,int:10,vit:10,luk:20},skills:['venomslash'],base:{hp:300,atk:55,def:12,mdef:6},res:{shadow:.5,lightning:-.25},xp:70,loot:'shade',meterStart:0},
  golem:{n:'โกเลมหิน',kind:'mon',map:'GOLEM',pal:'golem',sc:12,hw:66,h:192,spd:.8,range:44,cd:[32,70],boss:1,fixedLv:35,armor:1,el:'phys',
    attr:{str:40,agi:5,int:5,vit:40,luk:5},skills:['earthshatter','stonepillars'],base:{hp:2450,atk:180,def:52,mdef:32},res:{phys:.1,fire:.3,lightning:-.5},xp:216,loot:'golem',
    statusRes:{stun:1,bleed:.5,burn:.3,shock:.3},stunImmuneAfter:480,
    phases:[{at:.5,n:'โกเลมคลั่ง! (เฟส 2)',cdMul:.6,spdMul:1.3,addMove:'rockrain'}],weakPoint:{after:'ทุบพื้น',t:150,mul:1.5},
    moves:[M('หมัดหิน',16,4,22,11,58,4,22,{hy:60,hh:50}),M('ทุบพื้น',26,6,30,15,90,6,30,{hy:6,hh:16,low:1,quake:1,kd:1}),
      M('พุ่งชน',22,14,28,12,44,6,26,{hy:50,hh:80,lunge:2.6,kd:1}),M('ขว้างหิน',20,3,26,10,0,4,22,{proj:{spd:3.6,r:10,hits:1,rock:1},far:1})]},
  lavaking:{n:'ราชันย์ลาวา',kind:'mon',map:'GOLEM',pal:'lavaking',sc:12,hw:66,h:192,spd:.9,range:44,cd:[28,60],boss:1,fixedLv:40,armor:1,el:'fire',
    attr:{str:35,agi:10,int:20,vit:35,luk:10},skills:['flamepillar','magmaerupt'],base:{hp:5000,atk:260,def:51,mdef:38},res:{fire:.8,shadow:-.3,poison:-.2},xp:745,loot:'lavaking',
    statusRes:{stun:.6,burn:1,shock:.4,bleed:.3},stunImmuneAfter:600,
    phases:[{at:.6,n:'ราชันย์ลาวาปะทุ! (เฟส 2)',cdMul:.7,spdMul:1.2,addMove:'rockrain'},{at:.3,n:'แกนลาวาเปิด! (เฟส 3)',cdMul:.5,spdMul:1.4,aura:'burn'}],
    weakPoint:{after:'ทุบลาวา',t:150,mul:1.5},
    moves:[M('หมัดแมกมา',16,4,22,12,58,4,22,{hy:60,hh:50,el:'fire'}),M('ทุบลาวา',24,6,30,16,100,6,30,{hy:6,hh:16,low:1,quake:1,kd:1,el:'fire'}),
      M('พุ่งชนเพลิง',22,14,28,13,44,6,26,{hy:50,hh:80,lunge:2.8,kd:1,el:'fire'}),M('ขว้างหินเพลิง',18,3,24,11,0,4,22,{proj:{spd:4,r:11,hits:1,rock:1},far:1,el:'fire'})]},
  mslime:{n:'สไลม์ปรอท',kind:'mon',map:'SLIME',pal:'mslime',sc:4,hw:22,h:34,spd:1.1,range:32,cd:[26,56],el:'phys',
    attr:{str:20,agi:10,int:5,vit:30,luk:5},base:{hp:300,atk:58,def:14,mdef:6},res:{phys:.3,fire:-.4},xp:60,loot:'tower',
    phases:[{at:.4,n:'สไลม์ปรอทรวมร่างใหม่!',cdMul:.85,spdMul:1.1,heal:.25}],
    moves:[M('สาดปรอท',10,4,18,11,34,3,16,{hy:18,hh:32}),M('เด้งทับปรอท',18,8,22,15,30,4,22,{hy:18,hh:40,lunge:2.5,kd:1})]},   // ครั้งเดียว: ฟื้น HP 25%
  homunc:{n:'ฮอมุนคูลัสร่างทดลอง',kind:'rig',look:'HOMUNC',wpn:'adagger',hw:14,h:100,el:'poison',
    attr:{str:15,agi:25,int:35,vit:15,luk:10},skills:['acidflask','fireflask','sparkflask'],base:{hp:340,atk:62,def:12,mdef:16},res:{poison:.5,ice:-.3},xp:75,loot:'tower',meterStart:0},
  gargoyle:{n:'การ์กอยล์ศิลา',kind:'rig',look:'GARGOYLE',wpn:'ghammer',hw:16,h:100,el:'phys',
    attr:{str:28,agi:8,int:5,vit:24,luk:5},skills:['earthshatter'],base:{hp:380,atk:68,def:24,mdef:10},res:{phys:.2,lightning:-.4},statusRes:{stun:.4},xp:160,loot:'tower',meterStart:0},
  homunculus:{n:'นักแปรธาตุที่บิดเบี้ยว',kind:'rig',look:'HOMUNCULUS',wpn:'mstaff',sc:5.2,hw:24,h:175,el:'poison',boss:1,fixedLv:45,
    attr:{str:30,agi:30,int:60,vit:40,luk:20},skills:['acidflask','fireflask','sparkflask','alchbarrier','alchcataclysm'],base:{hp:6200,atk:340,def:58,mdef:55},res:{poison:.6},
    statusRes:{stun:.5,poison:.8,bleed:.3},xp:1250,loot:'homunculus',meterStart:0,
    phases:[{at:.6,n:'ดื่มยาแปลงร่าง! (เฟส 2)',cdMul:.7,spdMul:1.3,aura:'poison'},{at:.3,n:'ธาตุแปรปรวน! (เฟส 3)',cdMul:.55,spdMul:1.35,elemCycle:1}]},
  seraph:{n:'เซราฟตาเดียว',kind:'mon',map:'ANGEL',pal:'angel',sc:7.5,hw:48,h:210,spd:1,range:56,cd:[26,56],boss:1,fixedLv:50,armor:1,el:'holy',freezeChance:.25,noFlip:1,hover:1,eye:[0,80],weakY:20,
    attr:{str:15,agi:25,int:45,vit:30,luk:20},skills:['thunderclap','heavenwings'],base:{hp:7400,atk:490,def:64,mdef:69},res:{holy:.6,shadow:-.3,lightning:-.2,fire:.1},xp:1928,loot:'seraph',
    statusRes:{stun:.6,burn:.4,shock:.4,bleed:.4,poison:.5},stunImmuneAfter:600,revive:1,reviveHp:.5,
    weakPoint:{after:'จ้องมองพิพากษา',t:150,mul:1.5},
    moves:[M('ปีกฟาด',14,4,22,13,66,4,22,{hy:60,hh:80,el:'holy'}),M('โฉบจากฟ้า',22,12,26,15,50,6,26,{hy:60,hh:90,lunge:2.8,kd:1,el:'holy'}),
      M('ขนนกศักดิ์สิทธิ์',18,3,24,10,0,4,22,{proj:{spd:4.4,r:9,hits:1},far:1,el:'holy'}),
      M('จ้องมองพิพากษา',38,30,34,16,0,5,20,{beam:1,multi:6,hy:80,el:'holy'})]},
  // ---- หอคอยคริสตัล 5 ชั้น (Lv.50 -> 60 -> 70 -> 80 -> 90+ · 3 ห้อง/ชั้น: ทั่วไป -> หัวหน้า -> บอส) ----
  spire1_mob:{n:'จิตวิญญาณของศิษย์คริสตัล',kind:'rig',look:'SPIRE1_MOB',wpn:'mstaff',hw:14,h:100,el:'ice',
    attr:{str:18,agi:22,int:32,vit:22,luk:12},skills:['orb'],base:{hp:420,atk:78,def:18,mdef:18},res:{ice:.25,shadow:.15},xp:140,loot:'spire',meterStart:0},
  spire1_leader:{n:'จิตวิญญาณของหัวหน้าผู้คุมหอคอย',kind:'rig',look:'SPIRE1_LEADER',wpn:'kageblade',hw:15,h:105,el:'ice',miniboss:1,
    attr:{str:28,agi:26,int:24,vit:30,luk:18},skills:['slashwave','cuttingwind'],base:{hp:1150,atk:118,def:26,mdef:22},res:{ice:.3,phys:.15},statusRes:{stun:.3,bleed:.2},xp:380,loot:'spire',meterStart:10},
  spire2_mob:{n:'วิญญาณโครงกระดูกคบเพลิง',kind:'rig',look:'SPIRE2_MOB',wpn:'wand_fire',hw:15,h:104,el:'fire',
    attr:{str:22,agi:24,int:34,vit:26,luk:14},skills:['emberbolt','flamepillar'],base:{hp:580,atk:104,def:20,mdef:24},res:{fire:.35,shadow:.25},xp:220,loot:'spire',meterStart:0},
  spire2_leader:{n:'นักบวชโครงกระดูก',kind:'rig',look:'SPIRE2_LEADER',wpn:'wand_poison',hw:16,h:108,el:'poison',miniboss:1,
    attr:{str:26,agi:26,int:38,vit:32,luk:18},skills:['toxiccloud','acidflask','slashwave'],base:{hp:1520,atk:142,def:28,mdef:32},res:{poison:.5,shadow:.35,phys:.15},statusRes:{stun:.35,poison:.8},xp:520,loot:'spire',meterStart:15},
  spiremob:{n:'ศิษย์คริสตัลอเมทิสต์',kind:'rig',look:'SPIRE_MOB',wpn:'mstaff',hw:14,h:100,el:'lightning',
    attr:{str:18,agi:22,int:32,vit:22,luk:12},skills:['orb'],base:{hp:420,atk:78,def:18,mdef:18},res:{lightning:.25,shadow:.15},xp:140,loot:'spire',meterStart:0},
  spireleader:{n:'หัวหน้าผู้คุมหอคอย',kind:'rig',look:'SPIRE_LEADER',wpn:'kageblade',hw:15,h:105,el:'shadow',miniboss:1,
    attr:{str:28,agi:26,int:24,vit:30,luk:18},skills:['slashwave','cuttingwind'],base:{hp:1150,atk:118,def:26,mdef:22},res:{shadow:.35,phys:.15},statusRes:{stun:.3,bleed:.2},xp:380,loot:'spire',meterStart:10},
  spire_b1:{n:'จิตวิญญาณของซิลวา (บอสชั้น 1)',kind:'rig',look:'SPIRE_B1',wpn:'sword',hw:16,h:112,el:'ice',boss:1,fog:1,bgm:'bgm_silva',
    attr:{str:32,agi:26,int:34,vit:36,luk:18},skills:['silvabeam','blink','silvabarrier','slashcut'],base:{hp:2600,atk:152,def:30,mdef:28},res:{ice:.35,phys:.15},statusRes:{stun:.5,bleed:.3},xp:900,loot:'spireboss',meterStart:15},
  spire_b2:{n:'นิกซ์ แม่มดสุญญตา (บอสชั้น 2)',kind:'rig',look:'SPIRE_B2',wpn:'mstaff',hw:16,h:116,el:'shadow',boss:1,allMagic:1,hover:1,
    attr:{str:22,agi:36,int:48,vit:40,luk:26},skills:['abyssgate','orb','slashwave','blink'],base:{hp:3400,atk:185,def:32,mdef:40},res:{shadow:.5,poison:.3},statusRes:{stun:.5,bleed:.4},xp:1250,loot:'spireboss',meterStart:20},
  spire_b3:{n:'จอมเวทเพลิงอเมทิสต์ (บอสชั้น 3)',kind:'rig',look:'SPIRE_B3',wpn:'mstaff',hw:16,h:116,el:'fire',boss:1,
    attr:{str:26,agi:28,int:46,vit:40,luk:24},skills:['flamepillar','orb','fireflask'],base:{hp:4400,atk:225,def:36,mdef:36},res:{fire:.5},statusRes:{stun:.5,burn:.7},xp:1650,loot:'spireboss',meterStart:20},
  spire_b4:{n:'เทวทูตคริสตัลเหมันต์ (บอสชั้น 4)',kind:'rig',look:'SPIRE_B4',wpn:'mstaff',hw:16,h:118,el:'lightning',freezeChance:.25,boss:1,
    attr:{str:32,agi:34,int:50,vit:44,luk:26},skills:['thunderclap','heavenwings','orb'],base:{hp:5600,atk:270,def:42,mdef:42},res:{lightning:.4,holy:.3},statusRes:{stun:.6,shock:.5},xp:2200,loot:'spireboss',meterStart:20},
  spire_b5:{n:'อาร์คเมจแห่งหอคอยคริสตัล (บอสชั้น 5)',kind:'rig',look:'SPIRE_B5',wpn:'bbqysword',hw:17,h:122,el:'lightning',boss:1,allMagic:1,revive:1,reviveHp:.4,
    attr:{str:38,agi:40,int:60,vit:50,luk:32},skills:['bluejudge','orb','slashwave','alchcataclysm'],base:{hp:7200,atk:325,def:48,mdef:48},res:{lightning:.4,shadow:.3,fire:.2},statusRes:{stun:.7,bleed:.5,shock:.5},xp:3200,loot:'spireboss',meterStart:25},
  // ---- โคลอสเซียม Rank G (Lv.35 · 3 ผู้ท้าทาย) ----
  egel:{n:'เอเกล (จอมขวานเหมันต์)',kind:'rig',fixedLv:35,sc:3.25,look:'EGEL',wpn:'frostaxe',hw:16,h:106,el:'ice',freezeChance:.25,lifesteal:.10,noWave:1,revive:1,reviveHp:.5,reviveMsg:'ผู้ไม่ยอมแพ้',challenge:1,
    attr:{str:38,agi:22,int:16,vit:36,luk:14},skills:['frostnova'],base:{hp:1650,atk:112,def:26,mdef:18},res:{ice:.45,fire:-.25},statusRes:{stun:.35},xp:420,loot:'icecave',meterStart:0},
  rankg2:{n:'วาลิน (วายุอันแหลมคม)',kind:'rig',fixedLv:35,sc:3.0,look:'RANKG2',wpn:'sword',hw:14,h:100,el:'phys',alwaysCrit:1,noWave:1,vanishPassive:{dur:180,cd:1200},challenge:1,
    attr:{str:30,agi:34,int:16,vit:28,luk:30},skills:['windblade','guardbreak'],base:{hp:1380,atk:98,def:24,mdef:16},res:{phys:.1},statusRes:{stun:.2},xp:360,loot:'valin',meterStart:0},
  rankg3:{n:'เซเรส (จอมเวทเกราะเพลิง)',kind:'rig',fixedLv:35,sc:3.0,look:'RANKG3',wpn:'wand_fire',hw:14,h:100,el:'fire',noWave:1,allMagic:1,burnChance:.35,fireShieldStart:600,challenge:1,
    attr:{str:18,agi:28,int:46,vit:32,luk:24},skills:['fireshield','flamepillar','phoenixdive','meteorfall'],base:{hp:1680,atk:118,def:28,mdef:36},res:{fire:.6,ice:-.2,phys:.1},statusRes:{stun:.4,burn:1},xp:420,loot:'ceres',meterStart:25},
  dummy:{n:'หุ่นซ้อม (อมตะ)',kind:'mon',map:'DUMMY',pal:'dummy',sc:5.5,hw:22,h:76,fixedLv:1,xp:0,spd:0,range:40,cd:[999,999],passive:1,immortal:1,noKill:1,
    base:{hp:50000,atk:0,def:10,mdef:10},res:{},skills:[],loot:'dummy',moves:[],desc:'หุ่นฟางฝึกซ้อมในโรงฝึกโคลอสเซียม ยืนนิ่งเฉยๆ และเป็นอมตะ สำหรับฝึกคอมโบและทดสอบดาเมจ'}
};
const EXTRA_MOVES={rockrain:M('ฝนหิน',20,40,24,6,0,3,18,{rain:1,multi:4,hy:60,hh:120}),featherrain:M('ฝนขนนก',20,44,24,7,0,3,18,{rain:1,multi:5,hy:60,hh:120,el:'holy'})};
const KAGE_LOOK={hair:'#24243a',skin:'#e6bfa0',body:'#2a2240',trim:'#c94a3a',pants:'#1a1626',boots:'#111018',gloves:'#2a2a3a',head:'band',hc:'#c94a3a',hc2:'#c8ccd8',scarf:'#c94a3a',mask:1,weapon:'kageblade',sleeve:'#1e1830',eye:'#ff6a5a',arch:'sash',sashCol:'#c94a3a',cuffCol:'#6b2424'};
const ICEKNIGHT_LOOK={hair:'#d8e8f8',skin:'#e6d8d0',body:'#5a7a9a',trim:'#cfe8ff',pants:'#2a3a52',boots:'#1a2232',gloves:'#9ac8e8',head:'helm',hc:'#9ac8e8',hc2:'#e8fbff',pads:1,sleeve:'#3a5a7a',weapon:'sword',eye:'#4ab8ff',arch:'elf_knight',obiCol:'#2a5c84',coatCol:'#3e5f80',cuffCol:'#9ec4e0'};
const DUELIST_LOOK={hair:'#16161a',skin:'#e6c4a4',body:'#1f3440',trim:'#d8b050',pants:'#1a1f28',boots:'#101418',gloves:'#16161a',head:null,hc:'#d8b050',hc2:'#7ad8ff',sleeve:'#243e4c',scarf:'#f2f2f2',pads:1,cape:{col:'#1f3440',col2:'#0e1a22'},weapon:'bbqysword',wcol:'#28144a',wfx:'#a64df0',wshape:'chaosblade',eye:'#7ad8ff'};
const SHADE_LOOK={hair:'#3a1a4a',skin:'#c8a8c0',body:'#2a1030',trim:'#9a3aff',pants:'#1a0a20',boots:'#0a0410',gloves:'#2a1a3a',head:'band',hc:'#9a3aff',hc2:'#ff4af0',scarf:'#9a3aff',mask:1,weapon:'kageblade',wcol:'#6a3a9a',sleeve:'#1a0a20',eye:'#ff4af0',arch:'furcoat',coatCol:'#3a1c5c',furCol:'#6d5c84',orbCol:'#c47aff',cuffCol:'#4a2c6a'};
const SKIN_TONES=['#fbe0c8','#f2c9a0','#e0a878','#c68a5a','#9a6440','#6a4430'];
const HAIR_COLORS=['#2a1c14','#5a3820','#9a4a22','#d8a040','#e8d890','#c8c8d4','#d84a5a','#4a7ad8','#4ab88a','#9a5ad8'];
const HAIR_STYLES={short:'สั้น',spiky:'ตั้งแหลม',long:'ยาวสลวย',ponytail:'หางม้า',bun:'มวยผม',twin:'ไว้เปียคู่',bob:'บ๊อบ',hime:'เจ้าหญิงหน้าม้า',braid:'เปียเดี่ยว',curly:'หยิกฟู',sidebang:'ปัดปิดตา',mohawk:'โมฮอว์ก',bald:'ไม่มีผม'};
const EYE_COLORS=['#1a1020','#5a3820','#3a7ad8','#3ab8d8','#3ab86a','#e8b030','#d84a5a','#9a5ad8','#c8c8d4'];
const HOMUNC_LOOK={hair:'#3a3040',skin:'#9ad8a0',body:'#4a3a5a',trim:'#7af0c0',pants:'#2a2236',boots:'#1a1420',gloves:'#5a7a5a',head:'band',hc:'#7af0c0',hc2:'#e8fff0',sleeve:'#3a2a4a',weapon:'adagger'};
const GARGOYLE_LOOK={hair:'#4a4a52',skin:'#8a8a92',body:'#6a6a72',trim:'#3a3a42',pants:'#4a4a52',boots:'#2a2a32',gloves:'#5a5a62',head:'helm',hc:'#5a5a62',hc2:'#3a3a42',horns:'#c8c8d0',pads:1,plate:1,sleeve:'#5a5a62',weapon:'ghammer',wcol:'#7a7a84'};
const HOMUNCULUS_LOOK={hair:'#e8f0f0',hstyle:'long',skin:'#b8e8c0',body:'#4a2a6a',trim:'#7af0c0',pants:'#2a1a3a',boots:'#1a1024',gloves:'#7af0c0',head:'wizard',hc:'#2a1a4a',hc2:'#7af0c0',robe:'#3a1a5a',sleeve:'#4a2a6a',cape:{col:'#3a1a5a',col2:'#1a0a2a'},weapon:'mstaff',eye:'#7af0c0'};
const SPIRE1_MOB={arch:'mage_dress',sex:'f',hstyle:'long',hair:'#82e8ff',skin:'#eef6ff',body:'#245a8a',coatCol:'#3ca2e6',trim:'#bdf6ff',pants:'#1c3e64',boots:'#162c48',head:'halo',hc:'#7cf4ff',hc2:'#ffffff',orbCol:'#66ebff',weapon:'mstaff',eye:'#6aefff'};
const SPIRE1_LEADER={arch:'knight',sex:'m',hstyle:'spiky',hair:'#78e2ff',skin:'#e4f0fc',body:'#2c4e7c',armor:'#62b8ea',coatCol:'#1c3862',trim:'#a4f4ff',pants:'#1a2a48',boots:'#121d32',cape:'#2468a2',head:'helm',hc:'#4ca0d8',hc2:'#9ef6ff',plume:'#66ebff',weapon:'kageblade',eye:'#7ae8ff'};
const SPIRE_MOB={arch:'mage_dress',sex:'f',hstyle:'long',hair:'#c89cf0',skin:'#e8dce8',body:'#3e2860',coatCol:'#68349c',trim:'#e0a8ff',pants:'#26183a',boots:'#1b1028',head:'cowl',hc:'#52287e',hc2:'#f0b8ff',orbCol:'#d270ff',weapon:'mstaff',eye:'#e090ff'};
const SPIRE_LEADER={arch:'knight',sex:'m',hstyle:'spiky',hair:'#b88ce8',skin:'#dcccd8',body:'#4a3868',armor:'#7e649c',coatCol:'#382058',trim:'#f0c858',pants:'#241834',boots:'#1a1026',cape:'#4e2278',head:'helm',hc:'#6a4e8c',hc2:'#f0c858',plume:'#d058ff',weapon:'kageblade',eye:'#ffd258'};
const SPIRE2_MOB={custom:'skel_wraith',sex:'m',hair:'#6d1122',skin:'#8e6e4a',body:'#6d1122',trim:'#961b32',pants:'#2e0610',boots:'#1e040a',weapon:'wand_fire',eye:'#ff9030'};
const SPIRE2_LEADER={custom:'skel_shaman',sex:'m',hair:'#cfc6ae',skin:'#cfc6ae',body:'#585042',trim:'#9eff00',pants:'#585042',boots:'#3a342a',weapon:'wand_poison',eye:'#9eff00'};
const SPIRE_B1={arch:'mage_dress',sex:'f',hstyle:'long',hair:'#52e6ff',skin:'#f2f7ff',body:'#eef6fc',coatCol:'#1d86c8',sleeve:'#1d86c8',trim:'#1a2838',pants:'#e6f0f8',boots:'#283e54',gloves:'#f2f7ff',head:'halo',hc:'#7cf4ff',hc2:'#ffffff',orbCol:'#58e8ff',eyec:'#58e8ff',eye:'#58e8ff'};
const SPIRE_B2={custom:'void_witch',sex:'f',hair:'#a838ff',skin:'#0b0710',body:'#3e3c4c',trim:'#d4bd88',pants:'#1a1824',boots:'#d4bd88',weapon:'mstaff',eye:'#e068ff'};
const SPIRE_B3={arch:'furcoat',sex:'f',hstyle:'hime',hair:'#f05848',skin:'#fbe0d0',body:'#4e1828',coatCol:'#8a2238',furCol:'#f4b8c8',trim:'#ffd060',pants:'#2a101a',boots:'#381422',head:'wizard',hc:'#681834',hc2:'#ffd060',orbCol:'#ff7a30',weapon:'mstaff',eye:'#ffb84a'};
const SPIRE_B4={arch:'mage_dress',elfEars:1,sex:'f',hstyle:'long',hair:'#e4f2ff',skin:'#f4e8f0',body:'#426c9c',coatCol:'#5a90c8',trim:'#e8fbff',pants:'#263c5e',boots:'#1c2e4a',head:'halo',hc:'#c888ff',orbCol:'#80e8ff',weapon:'mstaff',eye:'#a8f0ff'};
const SPIRE_B5={arch:'furcoat',sex:'m',hstyle:'long',hair:'#f4e4ff',skin:'#ecdcf2',body:'#361858',coatCol:'#5e2098',furCol:'#e4b8ff',trim:'#ffe066',pants:'#201038',boots:'#160828',cape:{col:'#4c167e',col2:'#1c0836'},head:'crown',hc:'#ffd858',hc2:'#e058ff',orbCol:'#e068ff',weapon:'bbqysword',wcol:'#6220a8',wfx:'#e280ff',wshape:'chaosblade',eye:'#ff96ff'};
const EGEL_LOOK={arch:'knight',sex:'m',hstyle:'short',hair:'#a8b0bc',beard:'#9ca4b0',eyepatch:1,eyec:'#4ab8ff',skin:'#e2b898',body:'#365270',coatCol:'#263c58',trim:'#7ad8ff',pants:'#202c3c',boots:'#18202c',gloves:'#4a6480',pads:1,plate:1,head:'none',weapon:'frostaxe',wcol:'#7ad8ff',wfx:'#ffffff'};
const RANKG2_LOOK={arch:'elf_knight',sex:'m',hstyle:'spiky',hair:'#684830',eyec:'#d89040',skin:'#eec29c',body:'#5a687c',coatCol:'#2f4868',trim:'#6fd48c',pants:'#242a34',boots:'#1a1e24',gloves:'#444c58',pads:1,head:'band',hc:'#6fd48c',hc2:'#e8f8e0',weapon:'sword'};
const RANKG3_LOOK={arch:'mage_dress',sex:'f',hstyle:'ponytail',hair:'#c84848',eyec:'#ff9040',skin:'#fbe0c8',body:'#682632',coatCol:'#882e3c',trim:'#ffd27a',pants:'#2a1a22',boots:'#3a1c24',head:'none',orbCol:'#ff8030',weapon:'wand_fire'};
const LOOK_BY_NAME={HOMUNC:HOMUNC_LOOK,GARGOYLE:GARGOYLE_LOOK,HOMUNCULUS:HOMUNCULUS_LOOK,KAGE:KAGE_LOOK,SHADE:SHADE_LOOK,ICEKNIGHT:ICEKNIGHT_LOOK,DUELIST:DUELIST_LOOK,SPIRE1_MOB,SPIRE1_LEADER,SPIRE2_MOB,SPIRE2_LEADER,SPIRE_MOB,SPIRE_LEADER,SPIRE_B1,SPIRE_B2,SPIRE_B3,SPIRE_B4,SPIRE_B5,EGEL:EGEL_LOOK,RANKG2:RANKG2_LOOK,RANKG3:RANKG3_LOOK};
const DEFLOOK={hair:'#9a4a22',skin:'#f2c9a0',eye:'#1a1020',hstyle:'short',sex:'m',name:''};
const pname=()=>((G.look&&G.look.name)||'').trim()||'คุณ';
const ELITE={chance:.2,hp:2.5,atk:1.4,xp:3,prefix:'★ หัวหน้า'};

/* ---------- loot tables (fixed + random), fully configurable ---------- */
const ALLTYPES=['weapon','helmet','armor','gloves','pants','boots','ring','necklace'];
/* ================= LOOT (DA_LootConfig / DA_LootTable equivalents) =================
   Every number here is configuration — gameplay code only reads it. */
/* ระดับความยาก — ค่าทั้งหมดแก้ได้ที่นี่ (eHP/eATK = ตัวคูณพลังศัตรู, eSpd = ความเร็วศัตรู, aiCD = ช่วงพักระหว่างท่าของศัตรู (น้อย = ถี่), guard = ตัวคูณโอกาสศัตรูป้องกัน,
   staRegen = ตัวคูณฟื้นสตามินาผู้เล่น, xp/gold = ตัวคูณรางวัล, death = บทลงโทษเมื่อตาย, restRespawn = ดื่มน้ำพุแล้วศัตรูในถ้ำฟื้นกลับมา) */
const DIFFICULTY={
  easy:  {n:'ง่าย',ic:'🌱',desc:'ศัตรูอ่อนลงและตีเบา เหมาะกับการเล่นเนื้อเรื่อง',eHP:.75,eATK:.6,eSpd:.9,aiCD:1.3,guard:.5,staRegen:1.2,xp:1,gold:1,death:'none',restRespawn:0},
  normal:{n:'ปกติ',ic:'⚔️',desc:'สมดุลตามที่ออกแบบไว้ ตายแล้วไม่เสียอะไร',eHP:1,eATK:1,eSpd:1,aiCD:1,guard:1,staRegen:1,xp:1,gold:1,death:'none',restRespawn:0},
  hard:  {n:'ยาก',ic:'🔥',desc:'ศัตรูถึก ×1.3 ตีแรง ×1.4 โจมตีถี่ขึ้น · ตายแล้วเสียทองครึ่งหนึ่ง · รางวัล ×1.2',eHP:1.3,eATK:1.4,eSpd:1.1,aiCD:.8,guard:1.5,staRegen:.9,xp:1.2,gold:1.15,death:'gold50',restRespawn:0},
  souls: {n:'ดาร์กโซล',ic:'💀',desc:'ศัตรูตีแรง ×2 ถึก ×2 แทบไม่เว้นจังหวะ · สตามินาฟื้นช้า · ตายแล้วทองและ EXP ตกที่จุดตาย เก็บคืนได้ครั้งเดียว ตายซ้ำก่อนเก็บ = หายถาวร · ดื่มน้ำพุแล้วศัตรูฟื้นคืน · รางวัล ×1.5',
          eHP:2,eATK:2.0,eSpd:1.15,aiCD:.65,guard:2.2,staRegen:.75,xp:1.5,gold:1.3,death:'bloodstain',restRespawn:1}};
const LOOT_CONFIG={
  classes:{   // random drop chance, random item count, conditional rarity distribution (weights, given an item is selected)
    normal:  {chance:.10,qty:[1,1],rar:{normal:85,rare:12,epic:2.9979,legendary:.002,god:.0001}},
    elite:   {chance:.60,qty:[2,3],rar:{normal:70,rare:20,epic:9.9979,legendary:.002,god:.0001}},
    miniboss:{chance:.99,qty:[3,5],rar:'boss'},
    boss:    {chance:.63,qty:[1,2],rar:{normal:69.9979,rare:20,epic:10,legendary:.002,god:.0001}}},
  godMinLevel:0,
  luck:{base:10,perPoint:.01,cap:.50},
  ground:{lifetime:7200,radius:26,pickupRange:22,nameRange:44},
  inventory:{equipSlots:40,stackMax:999},
  players:['P1'],
  pity:{enabled:false,fragment:'bossfrag',thresholds:[{kills:10,reward:{mat:'bossfrag',q:1}},{kills:20,reward:{mat:'bossfrag',q:1}}]}
};
/* ST_LootEntry: {base|mat|gear|set|book, min,max, w (weight), rar:'any' | [allowed rarities] (default ['normal']), unique, onlyKinds:[enemy kinds]} */
const LOOT_TABLES={
  rat:{guaranteed:[{gold:[5,12]}],entries:[
    {mat:'fang',min:1,max:2,w:30},{mat:'hide',w:25},{mat:'stoneore',w:18},{mat:'cheese',w:8},{mat:'mp_s',w:12},{mat:'potion',w:8},
    {gear:'any',w:20,rar:'any'},{book:'common',w:1,rar:['rare']},{book:'rare',w:1,rar:['epic']}]},
  stonecave:{guaranteed:[{gold:[8,18]},{mat:'sk_windblade',q:1,rar:'rare',chance:.052}],entries:[
    {mat:'ore',min:1,max:2,w:30},{mat:'wood',w:15},{mat:'hide',w:15},{mat:'thunder',w:8},{mat:'mp_s',w:12},{mat:'potion',w:8},
    {gear:'any',w:22,rar:'any'},{book:'common',w:1,rar:['rare']},{book:'rare',w:1,rar:['epic']}]},
  duelist:{guaranteed:[{gold:[500,700]}],entries:[
    {gear:'any',w:30,rar:'any'},{book:'rare',w:3,rar:['epic']},{book:'ultimate',w:3,rar:['epic']},{mat:'mp_x',w:10}]},
  icecave:{guaranteed:[{gold:[25,45]},{mat:'sk_frostnova',q:1,rar:'rare',chance:.052}],entries:[
    {mat:'iceore',min:1,max:2,w:30},{mat:'hide',w:15},{mat:'mp_m',w:12},{mat:'potion',w:8},
    {gear:'any',w:25,rar:'any'},{book:'common',w:1,rar:['rare']},{book:'rare',w:1,rar:['epic']}]},
  lavarat:{guaranteed:[{gold:[15,30]},{mat:'sk_fireshield',q:1,rar:'rare',chance:.052}],entries:[
    {mat:'lavaore',min:1,max:2,w:30},{mat:'hide',w:15},{mat:'fire',w:15},{mat:'mp_m',w:12},{mat:'potion',w:8},
    {gear:'any',w:25,rar:'any'},{book:'common',w:1,rar:['rare']},{book:'rare',w:1,rar:['epic']}]},
  shade:{guaranteed:[{gold:[20,40]},{mat:'sk_windvanish',q:1,rar:'rare',chance:.052}],entries:[
    {mat:'cloth',w:25},{mat:'mp_m',w:12},{mat:'potion',w:10},{gear:'any',w:25,rar:'any'},{set:'shadow',w:12,rar:'any'},
    {book:'common',w:1,rar:['rare']},{book:'rare',w:1,rar:['epic']}]},
  kage:{guaranteed:[{mat:'key_lava',q:1}],entries:[]},   // v0.2.1: คาเงะดรอปแค่กุญแจลงเหมืองลาวา
  golem:{guaranteed:[{gold:[150,200]},{mat:'core',q:1,rar:'epic',chance:.25},{mat:'sc_golem',q:1}],entries:[
    {base:'h_horns',w:10,rar:'any',unique:1},{base:'a_golem',w:8,rar:'any',unique:1},{gear:'any',w:25,rar:'any'},{mat:'mp_l',w:10},
    {book:'rare',w:2,rar:['rare','epic']},{book:'ultimate',w:2,rar:['epic']}]},
  tower:{guaranteed:[{gold:[40,70]},{mat:'sk_blink',q:1,rar:'rare',chance:.052}],entries:[
    {mat:'mercury',w:30,min:1,max:2},{mat:'ore',w:15},{mat:'mp_m',w:10},{mat:'potion',w:8},{gear:'any',w:22,rar:'any'},{set:'alchemist',w:8,rar:'any'},
    {book:'common',w:1,rar:['rare']},{book:'rare',w:1,rar:['epic']}]},
  homunculus:{guaranteed:[{gold:[600,800]},{mat:'philostone',q:1,rar:'epic',chance:.25},{mat:'sc_merc',q:1},{mat:'mercury',q:3}],entries:[
    {set:'alchemist',w:30,rar:'any'},{base:'w_mercstaff',w:6,rar:'any',unique:1},{gear:'any',w:20,rar:'any'},{mat:'mp_x',w:8},
    {book:'rare',w:2,rar:['rare','epic']},{book:'ultimate',w:2,rar:['epic']}]},
  seraph:{guaranteed:[{gold:[700,900]},{mat:'bossfrag',q:1,rar:'epic',chance:.25}],entries:[
    {base:'h_halo',w:10,rar:'any',unique:1},{base:'w_seraph',w:8,rar:'any',unique:1},{set:'seraph',w:18,rar:'any'},{mat:'sk_eyejudge',w:4},{gear:'any',w:16,rar:'any'},{mat:'mp_x',w:8},
    {book:'ultimate',w:2,rar:['epic']}]},
  lavaking:{guaranteed:[{gold:[400,600]},{mat:'essence',q:1,rar:'epic',chance:.25}],entries:[
    {base:'h_crown',w:10,rar:'any',unique:1},{set:'magma',w:20,rar:'any'},{gear:'any',w:20,rar:'any'},{mat:'mp_x',w:8},
    {book:'rare',w:2,rar:['rare','epic']},{book:'ultimate',w:2,rar:['epic']}]},
  spire:{guaranteed:[{gold:[80,140]}],entries:[
    {mat:'mp_l',w:16},{mat:'mp_x',w:8},{mat:'potion',w:12},{mat:'exprock',w:10},{gear:'any',w:28,rar:'any'},
    {book:'rare',w:2,rar:['rare','epic']},{book:'ultimate',w:1,rar:['epic']}]},
  valin:{guaranteed:[{gold:[120,180]},{mat:'sk_windblade',q:1,rar:'rare',chance:.052},{mat:'sk_windvanish',q:1,rar:'rare',chance:.052}],entries:[
    {gear:'any',w:28,rar:'any'},{book:'rare',w:2,rar:['rare','epic']},{mat:'mp_l',w:10}]},
  ceres:{guaranteed:[{gold:[120,180]},{mat:'sk_fireshield',q:1,rar:'rare',chance:.052}],entries:[
    {gear:'any',w:28,rar:'any'},{book:'rare',w:2,rar:['rare','epic']},{mat:'mp_l',w:10}]},
  spireboss:{guaranteed:[{gold:[750,1100]},{mat:'exprock',q:2},{mat:'mp_x',q:2}],entries:[
    {mat:'evostone',w:12},{mat:'philostone',w:8},{gear:'any',w:30,rar:'any'},{book:'ultimate',w:3,rar:['epic']}]},
  dummy:{guaranteed:[],entries:[]}
};
/* Example tables from the design spec — NOT assigned to any enemy yet; their item IDs do not exist so the validator lists them. */
const LOOT_TABLE_TEMPLATES={
  slime:['sticky_gel','slime_core','poison_sac','slime_ring'],skeleton:['bone_fragment','ancient_bone','rusty_blade','skeleton_armor'],
  fire_demon:['burning_ash','flame_core','infernal_crystal','infernal_sword'],thunder_wolf:['thunder_fang','lightning_core','storm_essence','thunder_ring'],
  flame_dragon:['dragon_heart','infernal_armor'],thunder_king:['thunder_core','storm_blade'],blood_reaper:['blood_essence','reaper_scythe'],
  void_emperor:['void_fragment','void_robe'],ancient_guardian:['guardian_soul','guardian_shield']};
const BASE_BY_TYPE=t=>Object.keys(BASES).filter(k=>BASES[k].type===t&&k!=='w_god'&&k!=='n_god'&&k!=='h_crown'&&!['legendary','god'].includes(BASES[k].fixRar));

/* ---------- zones & quests ---------- */
const ZONE_INFO={town:{n:'เมือง Collawarrie',lv:1,biome:'town',safe:1},outer:{n:'ถ้ำชีสชั้นนอก',lv:1,biome:'cave'},inner:{n:'ถ้ำคริสตัล',lv:5,biome:'crystal'},lava1:{n:'เหมืองลาวา ชั้น 1',lv:11,biome:'lava',danger:1},
  lava2:{n:'เหมืองลาวา ชั้น 2',lv:13,biome:'lava',danger:1},lava3:{n:'เหมืองลาวา ชั้น 3 (บอส)',lv:19,biome:'lava',danger:1},
  ice1:{n:'ถ้ำน้ำแข็ง ชั้น 1',lv:18,biome:'ice',danger:1},ice2:{n:'ถ้ำน้ำแข็ง ชั้น 2',lv:20,biome:'ice',danger:1},
  stone1:{n:'ถ้ำหินโกเลม ชั้น 1',lv:5,biome:'cave',danger:1},stone2:{n:'ถ้ำหินโกเลม ชั้น 2',lv:7,biome:'cave',danger:1},
  golemroom:{n:'ห้องบอส: โกเลมหิน',lv:7,biome:'crystal',danger:1},
  tower1:{n:'หอคอยนักแปรธาตุ ชั้น 1',lv:14,biome:'tower',danger:1},tower2:{n:'หอคอยนักแปรธาตุ ชั้น 2',lv:16,biome:'tower',danger:1},
  towerroom:{n:'ห้องทดลองยอดหอ (บอส)',lv:17,biome:'tower',danger:1},
  sanctum:{n:'วิหารน้ำแข็งดวงตาเทวทูต (บอส)',lv:25,biome:'sanctum',danger:1}};
const SPIRE_ZONE_META={
  spire1:{n:'หอคอยคริสตัล ชั้น 1 (Lv.50)',lv:50,biome:'crystal',danger:1},
  spire2:{n:'หอคอยคริสตัล ชั้น 2 (Lv.60)',lv:60,biome:'crystal',danger:1},
  spire3:{n:'หอคอยคริสตัล ชั้น 3 (Lv.70)',lv:70,biome:'crystal',danger:1},
  spire4:{n:'หอคอยคริสตัล ชั้น 4 (Lv.80)',lv:80,biome:'crystal',danger:1},
  spire5:{n:'หอคอยคริสตัล ชั้น 5 ยอดหอคอย (Lv.90)',lv:90,biome:'sanctum',danger:1}
};
const QUESTS={
  main1:{n:'ผู้บุกรุกในถ้ำชีส',type:'หลัก',steps:['คุยกับช่างตีเหล็กโบโร','สร้างอาวุธที่โต๊ะตีเหล็ก','ทุบหินเปิดทางถ้ำชั้นใน','ผ่านด่านคาเงะ นักดาบเงา','ปราบโกเลมหิน'],reward:{xp:300,gold:100,mats:{sc_dragon:1}}},
  hunt:{n:'กำจัดหนูถ้ำ',type:'รอง',steps:['ปราบหนูถ้ำ 3 ตัว'],count:3,reward:{xp:120,mats:{potion:5}}},
  pan:{n:'กระทะของพ่อ',type:'รอง',steps:['หากระทะของพ่อในถ้ำคริสตัล'],reward:{xp:100,mats:{sc_firepan:1}}},
  lava:{n:'เหมืองลาวาร้าง',type:'หลัก',steps:['เข้าประตูเหมืองลาวาในถ้ำคริสตัล','ลงไปถึงชั้น 3','ปราบราชันย์ลาวา'],reward:{xp:1500,gold:500}}
};
const GUILD_QUESTS=[
  {id:'gq_slime',n:'ล่าสไลม์ในถ้ำชีส',rankReq:'F',targets:['mudslime','mslime','rat'],req:5,desc:'ปราบมอนสเตอร์ในถ้ำชีส/ถ้ำคริสตัล 5 ตัว',reward:{xp:200,gold:150,mats:{potion:2}}},
  {id:'gq_golem',n:'คำร้องปราบโกเลมศิลา',rankReq:'F',targets:['golem','rockling','stone','stonecave'],req:4,desc:'ปราบมอนสเตอร์หรือบอสในถ้ำหินโกเลม 4 ตัว',reward:{xp:450,gold:350,mats:{ore:4}}},
  {id:'gq_lava',n:'กวาดล้างเหมืองลาวา',rankReq:'F',targets:['lavarat','lizard','fireele','lavaking'],req:6,desc:'ปราบมอนสเตอร์ในเหมืองลาวา 6 ตัว',reward:{xp:750,gold:550,mats:{fire:3,mp_m:2}}},
  {id:'gq_ice',n:'สำรวจแดนเหมันต์',rankReq:'G',targets:['frostslime','frostwolf','iceknight','icegolem','seraph'],req:6,desc:'ปราบมอนสเตอร์ในถ้ำน้ำแข็ง 6 ตัว',reward:{xp:1400,gold:1000,mats:{iceore:4,mp_l:2}}},
  {id:'gq_spire',n:'พิทักษ์ยอดหอคอยคริสตัล',rankReq:'G',targets:['spire1_mob','spire1_leader','spire2_mob','spire2_leader','spiremob','spireleader','spire_b1','spire_b2','spire_b3','spire_b4','spire_b5'],req:8,desc:'ปราบศัตรูในหอคอยคริสตัลจอมเวท 8 ตัว',reward:{xp:3200,gold:2200,mats:{evostone:1}}}
];
// แรงค์กิลด์นักผจญภัย 7 ขั้น (F -> G -> D -> C -> B -> A -> S) : เลื่อนขั้นเมื่อเลเวลถึงเกณฑ์ + ผ่านเควสต์เลื่อนขั้น
const GUILD_RANKS=[
  {id:'F',n:'นักผจญภัยฝึกหัด',lvReq:1,col:'#a8b4c8',promoQuest:null,desc:'แรงค์เริ่มต้นหลังลงทะเบียนเข้ากิลด์นักผจญภัย'},
  {id:'G',n:'นักผจญภัยหน้าใหม่',lvReq:30,col:'#6fd48c',promoQuest:'promo_g',desc:'ต้องการ Lv.30+ และผ่านการทดสอบโคลอสเซียม Rank G'},
  {id:'D',n:'นักผจญภัยแนวหน้า',lvReq:60,col:'#58b8f0',promoQuest:'promo_d',desc:'ต้องการ Lv.60+ และผ่านการทดสอบโคลอสเซียม Rank D'},
  {id:'C',n:'นักล่าแห่งรอยแยก',lvReq:90,col:'#9c7cf4',promoQuest:'promo_c',desc:'ต้องการ Lv.90+ และผ่านการทดสอบโคลอสเซียม Rank C'},
  {id:'B',n:'ยอดฝีมือคอลลาวาร์รี',lvReq:120,col:'#f0a442',promoQuest:'promo_b',desc:'ต้องการ Lv.120+ และผ่านการทดสอบโคลอสเซียม Rank B'},
  {id:'A',n:'วีรชนแสงเอเธอร์',lvReq:150,col:'#f05c5c',promoQuest:'promo_a',desc:'ต้องการ Lv.150+ และผ่านการทดสอบโคลอสเซียม Rank A'},
  {id:'S',n:'ตำนานผู้ปิดประตู',lvReq:180,col:'#ffd84a',promoQuest:'promo_s',desc:'แรงค์สูงสุดของกิลด์ — ต้องการ Lv.180+ และผ่านการทดสอบโคลอสเซียม Rank S'}
];
