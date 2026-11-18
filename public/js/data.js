'use strict';
/* ============================================================
   DATA — every gameplay number lives here (Data Table equivalents)
   ============================================================ */
const CONFIG={
  statusDur:180,            // 3 s (frames @60fps) — default duration for all statuses
  dotTick:60,               // DOT ticks once per second
  maxStacks:10,   // พิษ/เลือดออก ซ้อนได้สูงสุด 10 (สกิล Blood Pact / Toxic Curse ใส่ 10 สแตก)
  stunImmuneAfter:300,      // CC-loop guard: stun immunity after a stun ends (frames)
  critCap:.75, critDmgCap:3.5, drCap:.75 /* spec v3: 75% (was 70%) */, stunBonus:.20,
  comboWindow:14,           // frames after hit-confirm (into recovery) that accept the next combo step
  comboFailPenalty:14,      // extra recovery frames on a mistimed combo input
  fullComboBonus:.20,
  levelPoints:5,
  levelCap:30,              // เลเวลสูงสุดของเมืองแรก (ปราบบอสครบแล้วไม่เกิน Lv.30)
  craftRates:{normal:.50,rare:.30,epic:.20,legendary:.20,god:.10},
  maxRarity:'epic',         // ระดับไอเทมสูงสุดที่สร้าง/ดรอปได้ตอนนี้ (ตำนาน/เทพ จะเพิ่มภายหลัง)  // base success (fixed)
  craftBoost:.20,           // Divine Crafting Crystal: +20 percentage points, max one per attempt, final chance capped at 100%
  craftSlots:6,
  enhanceRates:[1,1,1,1,1,.85,.75,.65,.55,.45, .4,.35,.3,.25,.2, .15,.12,.1,.08,.06],  // โอกาสสำเร็จจาก +n ไป +n+1 (n=0..19) · +16 ขึ้นไปเฉพาะของ craft
  regen:{sta:24},           // stamina per second
  mana:{combatEvery:180,outEvery:90,recoveryCap:.30,costCap:.30},   // 1 MP / 3 s in combat, 1 MP / 1.5 s outside; gear bonus caps 30%
  potionCD:600,             // 10 s shared mana-potion cooldown
  ult:{max:100,hit:2,combo:5,perfectBlock:8,counter:5,beingHit:1,cost:100},
  staCost:{dash:10,dodge:20,heavy:10},
  xpNext:l=>Math.round(50*Math.pow(l,1.3)),   // เส้นทางเมืองแรก: เคลียร์ครบ 1 รอบ ≈ Lv.28 (เพดาน 30)
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
const ELEM_PROC={fire:{s:'burn',c:.25},lightning:{s:'shock',c:.12},poison:{s:'poison',c:.35},shadow:{s:'bleed',c:.25}};
const ELN={phys:'กายภาพ',fire:'ไฟ',lightning:'สายฟ้า',poison:'พิษ',shadow:'เงา',holy:'แสง',arcane:'อาคม',ice:'น้ำแข็ง'};
const ELC={phys:'#dddddd',fire:'#ff7a2a',lightning:'#9fe6ff',poison:'#8aff5a',shadow:'#b08aff',holy:'#fff2a8',arcane:'#d88aff',ice:'#bff0ff'};
const STN={poison:'พิษ',bleed:'เลือดออก',burn:'เผาไหม้',shock:'ช็อก',stun:'มึนงง'};
const STI={poison:'☠',bleed:'🩸',burn:'🔥',shock:'⚡',stun:'💫'};
const STC={poison:'#8aff5a',bleed:'#ff4a5a',burn:'#ff8a3a',shock:'#9fe6ff',stun:'#ffe27a'};

/* ---------- moves (frame data). dmg = power coefficient ×10 ---------- */
function M(n,s,a,r,dmg,reach,kb,hs,o={}){return Object.assign({n,s,a,r,dmg,reach,kb,hs,hy:62,hh:56},o);}
const WEAPONS={
  fist:{n:'มือเปล่า',col:'#f2c9a0',fx:'#ffffff',len:0,el:'phys',
    light:[M('หมัดซ้าย',4,2,9,4,38,1,14,{anim:'jab'}),M('หมัดขวา',5,2,10,5,44,1,15,{anim:'straight'}),M('อัปเปอร์คัต',6,3,16,7,36,2,22,{anim:'upper',hy:80,hh:80,launch:1})],
    heavy:M('หมัดทะลวง',11,3,18,11,46,4,24,{anim:'straight',kd:1})},
  club:{n:'กระบองรากไม้',col:'#8a5a32',fx:'#e8c89a',len:10,el:'phys',
    light:[M('ฟาดซ้าย',6,3,12,6,48,2,16,{anim:'slash'}),M('ฟาดขวา',6,3,14,7,48,2,18,{anim:'slash2'})],
    heavy:M('ทุบลงพื้น',14,4,22,14,50,5,28,{anim:'heavyslash',kd:1})},
  sword:{n:'ดาบเหล็กโบโร',col:'#d8dde6',fx:'#ffffff',len:13,el:'phys',
    light:[M('ฟันเฉียง',5,3,10,5,54,1,15,{anim:'slash'}),M('ฟันกลับ',5,3,10,5,54,1,15,{anim:'slash2'}),M('แทงตรง',6,3,15,8,60,3,22,{anim:'thrust',launch:1})],
    heavy:M('ฟันผ่าหิน',13,4,20,14,58,5,28,{anim:'heavyslash',kd:1})},
  spear:{n:'หอกเขี้ยวถ้ำ',col:'#e8dcc0',fx:'#fff4d0',len:18,thrust:1,el:'poison',
    light:[M('แทงเร็ว',4,2,9,4,68,1,13,{anim:'thrust'}),M('แทงคู่',4,2,9,4,68,1,13,{anim:'thrust'}),M('แทงงัด',6,3,14,6,66,2,20,{anim:'thrust',launch:1})],
    heavy:M('แทงพุ่ง',10,6,22,12,70,5,26,{anim:'thrust',lunge:3,kd:1})},
  flame:{n:'ดาบถ่านแดง',col:'#ff8a3a',fx:'#ffb060',len:14,el:'fire',
    light:[M('ฟันเพลิง',5,3,10,6,56,1,15,{anim:'slash'}),M('ฟันเพลิงกลับ',5,3,10,6,56,1,15,{anim:'slash2'}),M('จุดระเบิด',7,3,15,9,60,3,22,{anim:'thrust',launch:1})],
    heavy:M('เปลวพิฆาต',13,5,20,16,60,5,28,{anim:'heavyslash',kd:1})},
  gaunt:{n:'สนับมือฟ้าคำราม',col:'#7fd8ff',fx:'#c8f2ff',len:0,el:'lightning',
    light:[M('หมัดสายฟ้า 1',3,2,7,3,38,0,12,{anim:'jab'}),M('หมัดสายฟ้า 2',3,2,7,3,40,0,12,{anim:'straight'}),M('หมัดสายฟ้า 3',3,2,7,3,38,0,12,{anim:'jab'}),M('ฟ้าผ่าเปิด',5,3,14,7,38,2,22,{anim:'upper',hy:80,hh:80,launch:1})],
    heavy:M('หมัดฟ้าคำราม',9,4,16,12,40,3,26,{anim:'upper',hy:80,hh:80,launch:1})},
  firepan:{n:'กระทะเพลิงมรดกพ่อ',col:'#3a3a40',fx:'#ff9a3a',len:10,pan:1,el:'fire',
    light:[M('ฟาดกระทะ',7,3,12,9,50,3,20,{anim:'slash'}),M('พลิกกระทะ',7,3,14,10,50,3,22,{anim:'slash2',launch:1})],
    heavy:M('โป๊ก!',12,4,20,20,52,6,34,{anim:'heavyslash',kd:1})},
  hammer:{n:'ค้อนชีสหินผา',col:'#8a5a32',fx:'#ffe58a',len:11,hammer:1,el:'phys',
    light:[M('ทุบชีส',8,4,14,8,52,3,20,{anim:'slash'}),M('ทุบชีสซ้ำ',8,4,16,9,52,3,22,{anim:'slash2'})],
    heavy:M('ชีสถล่ม',16,5,24,20,56,6,34,{anim:'heavyslash',kd:1})},
  kageblade:{n:'ดาบเงาจันทร์มืด',col:'#4a4a5e',fx:'#b08aff',len:14,el:'shadow',
    light:[M('ฟันเงา',5,3,11,5,54,1,15,{anim:'slash'}),M('ฟันเงากลับ',5,3,11,5,54,1,15,{anim:'slash2'}),M('แทงเงา',7,3,16,8,60,3,22,{anim:'thrust'})],
    heavy:M('ผ่าเงา',14,4,22,13,58,5,28,{anim:'heavyslash',kd:1})},
  lavablade:{n:'ดาบหัวใจภูเขาไฟ',col:'#ff5a1a',fx:'#ffe06a',len:16,el:'fire',
    light:[M('ฟันลาวา',5,3,10,6,60,1,15,{anim:'slash'}),M('ฟันลาวากลับ',5,3,10,6,60,1,15,{anim:'slash2'}),M('ปะทุ',6,3,14,9,64,3,22,{anim:'thrust',launch:1})],
    heavy:M('ภูเขาไฟระเบิด',13,5,20,18,64,5,28,{anim:'heavyslash',kd:1})},
  mswd:{n:'ดาบมนตรา',col:'#b08aff',fx:'#e0c8ff',len:14,el:'arcane',
    light:[M('ฟันเวท',5,3,10,6,54,1,15,{anim:'slash'}),M('ฟันเวทกลับ',5,3,10,6,54,1,15,{anim:'slash2'})],
    heavy:M('คลื่นพลังเวท',12,4,18,12,0,2,20,{anim:'heavyslash',type:'magic',proj:{spd:5,r:12,hits:1}})},
  mstaff:{n:'คทาดาราจักร',col:'#7a5ad8',fx:'#d8c0ff',len:0,el:'arcane',
    light:[M('ลูกบอลเวท',6,3,12,8,0,1,14,{anim:'thrust',type:'magic',proj:{spd:6,r:8,hits:1}}),M('ลูกบอลเวทซ้ำ',6,3,12,8,0,1,14,{anim:'thrust',type:'magic',proj:{spd:6,r:8,hits:1}})],
    heavy:M('ลำแสงเวททะลุ',14,6,20,16,0,2,24,{anim:'thrust',type:'magic',proj:{spd:8,r:10,hits:3}})},
  adagger:{n:'กริชอาคมพราย',col:'#9a6ad0',fx:'#e0c8ff',len:9,el:'arcane',
    light:[M('กรีดเร็ว',3,2,6,4,40,0,10,{anim:'thrust'}),M('กรีดเร็ว 2',3,2,6,4,40,0,10,{anim:'thrust'}),M('กรีดเร็ว 3',3,2,7,5,42,1,12,{anim:'thrust'})],
    heavy:M('กรีดอาคม',6,3,12,10,46,2,22,{anim:'slash'})},
  wand_fire:{n:'ไม้เท้าเปลวอัคคี',col:'#ff6a2a',fx:'#ffb060',len:0,el:'fire',
    light:[M('ลูกไฟ',5,3,10,7,0,1,14,{anim:'thrust',type:'magic',proj:{spd:6,r:8,hits:1}})],
    heavy:M('ระเบิดเพลิง',12,5,18,14,0,3,24,{anim:'thrust',type:'magic',proj:{spd:4.5,r:14,hits:1}})},
  wand_ice:{n:'ไม้เท้าเกล็ดหิมะ',col:'#9fe8ff',fx:'#e0f8ff',len:0,el:'ice',
    light:[M('ลูกน้ำแข็ง',5,3,10,7,0,1,14,{anim:'thrust',type:'magic',proj:{spd:6,r:8,hits:1}})],
    heavy:M('พายุหิมะ',12,5,18,14,0,3,24,{anim:'thrust',type:'magic',proj:{spd:4.5,r:14,hits:1}})},
  wand_lightning:{n:'ไม้เท้าอสนีบาต',col:'#9fe6ff',fx:'#e8f8ff',len:0,el:'lightning',
    light:[M('ลูกสายฟ้า',4,2,9,7,0,1,14,{anim:'thrust',type:'magic',proj:{spd:8,r:6,hits:1}})],
    heavy:M('สายฟ้าแตกกระจาย',12,5,18,14,0,3,24,{anim:'thrust',type:'magic',proj:{spd:7,r:10,hits:2}})},
  scythe:{n:'เคียวสุญญตา',col:'#2a1a3a',fx:'#9a7ad8',len:16,el:'shadow',
    light:[M('ฟันความว่าง',6,4,12,8,60,2,18,{anim:'heavyslash'}),M('ฟันความว่างกลับ',6,4,12,8,60,2,18,{anim:'slash2'})],
    heavy:M('เคียวกลืนเงา',14,5,22,18,64,5,28,{anim:'heavyslash',kd:1})}
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
  // ---- Rare (MP 60-100) ----
  rising:{ic:'🐉',n:'หมัดมังกรฟ้า',tier:'rare',type:'phys',el:'phys',coef:1.8,cd:6,mp:60,range:'ใกล้ (36)',anim:'rising',reach:36,hy:72,hh:96,launch:1,rise:6.6,inv:1,combo:1,desc:'อัปเปอร์คัตกระโดด อมตะช่วงเริ่ม ตีลอย'},
  rushkick:{ic:'🦶',n:'ลูกเตะพายุ',tier:'rare',type:'phys',el:'phys',coef:2.1,multi:3,cd:7,mp:65,range:'ใกล้ (44) พุ่ง',anim:'rush',kicks:1,lunge:3.2,reach:44,combo:1,desc:'พุ่งเตะต่อเนื่อง 3 ครั้ง'},
  thunderclap:{ic:'⚡',n:'สายฟ้าฟาด',tier:'rare',type:'magic',el:'lightning',coef:1.6,cd:10,mp:80,range:'กลาง (100)',anim:'cast',strike:100,status:{shock:1},combo:1,desc:'สายฟ้าผ่าเป้าหมายด้านหน้า ทำให้ช็อก + มึน 3 วินาที'},
  flamepillar:{ic:'🌋',n:'เสาเพลิง',tier:'rare',type:'magic',el:'fire',coef:2.0,cd:9,mp:75,range:'กลาง (90)',anim:'cast',strike:90,status:{burn:1},combo:1,desc:'เสาไฟพุ่งจากพื้นใต้เป้าหมาย'},
  bloodmoon:{ic:'🩸',n:'จันทร์โลหิต',tier:'rare',type:'phys',el:'shadow',coef:2.2,cd:9,mp:80,range:'ใกล้ (60)',anim:'heavyslash',reach:60,status:{bleed:3},combo:1,desc:'ฟันจันทร์เสี้ยว เลือดออก 3 สแตก'},
  toxiccloud:{ic:'☠️',n:'หมอกพิษ',tier:'rare',type:'magic',el:'poison',coef:1.6,multi:4,cd:10,mp:85,range:'ทั้งพื้นที่ (พื้นดิน)',anim:'cast',rain:1,status:{poison:2},combo:1,desc:'หมอกพิษปกคลุมพื้น 4 ฮิต'},
  twinfang:{ic:'🐺',n:'เขี้ยวคู่',tier:'rare',type:'phys',el:'phys',coef:2.4,multi:4,cd:8,mp:70,range:'พุ่ง (46)',anim:'rush',lunge:2.2,reach:46,status:{bleed:1},combo:1,desc:'จู่โจมต่อเนื่อง 4 ครั้ง'},
  earthshatter:{ic:'💥',n:'ธรณีแยก',tier:'rare',type:'phys',el:'phys',coef:2.4,cd:9,mp:90,range:'ใกล้ (70) ต่ำ',anim:'heavyslash',reach:70,hy:8,hh:20,low:1,kd:1,combo:1,desc:'ทุบพื้น ต้องย่อจึงกันได้ ล้มลง'},
  galeblade:{ic:'🌪️',n:'ดาบพายุ',tier:'rare',type:'phys',el:'weapon',coef:2.2,cd:9,mp:85,range:'ไกล (กระสุน 3 ฮิต)',anim:'heavyslash',proj:{spd:4,r:14,hits:3},combo:1,desc:'พายุหมุนพุ่งไปข้างหน้า'},
  guardbreak:{ic:'🛡️',n:'ทลายโล่',tier:'rare',type:'phys',el:'phys',coef:2.0,cd:12,mp:100,range:'ใกล้ (56)',anim:'thrust',reach:56,status:{stun:1},armorBreak:{def:.6,t:300},combo:1,desc:'แทงทะลวงโล่ ทำให้มึน 3 วินาที'},
  // ---- Unique (Active MP 40-60, Passive 0) — bound permanently ----
  piercestrike:{ic:'🗡️',n:'ทลายเกราะ (Armor Breaker)',tier:'unique',talent:'piercer',type:'phys',el:'phys',coef:2.4,cd:8,mp:40,range:'ใกล้ (64)',anim:'thrust',reach:64,ignoreDef:1,unblockable:1,armorBreak:{def:.6,t:300,n:'Armor Breaker'},combo:1,desc:'ไม่สนค่า DEF ของเป้าหมาย · ทะลุการป้องกัน (block) · ติดดีบัฟ Armor Breaker: DEF เป้าหมาย −40% นาน 5 วิ'},
  luckyseven:{ic:'🍀',n:'แจ็คพอต (Jackpot)',tier:'unique',talent:'lucky',type:'buff',cd:12,mp:50,range:'ตัวเอง',anim:'block',jackpot:7,jackpotPen:.2,desc:'การโจมตี 7 ครั้งถัดไปติดคริติคอลแน่นอน และไม่สนเกราะ 20%'},
  ironwall:{ic:'🧱',n:'กำแพงเหล็ก (Iron Wall)',tier:'unique',talent:'endurer',type:'buff',cd:15,mp:45,range:'ตัวเอง',anim:'block',buff:{dr:.3,armor:1,t:240,statusImm:480},desc:'ลดดาเมจเพิ่ม 30% (รวมไม่เกิน 75%) 4 วินาที และกันสถานะผิดปกติทุกชนิด 8 วินาที'},
  bloodpact:{ic:'🩸',n:'สัญญาโลหิต (Blood Pact)',tier:'unique',talent:'undying',type:'phys',el:'shadow',coef:2.6,cd:9,mp:40,range:'ใกล้ (54)',anim:'heavyslash',reach:54,lifesteal:.1,multi:1,status:{bleed:50},combo:1,desc:'ฟื้น HP เท่ากับ 10% ของดาเมจที่ทำ และติดเลือดออก 10 สแตก'},
  toxiccurse:{ic:'🕸️',n:'คำสาปพิษ (Toxic Curse)',tier:'unique',talent:'hexweaver',type:'magic',el:'poison',coef:1.2,cd:10,mp:50,range:'ไกล (กระสุน)',anim:'cast',proj:{spd:5,r:10,hits:1},multi:1,status:{poison:50},desc:'ยิงคำสาปใส่เป้าหมาย ติดพิษ 10 สแตก'},
  arcaneburst:{ic:'🔮',n:'ระเบิดอาคม (Arcane Burst)',tier:'unique',talent:'archmage',type:'magic',el:'arcane',coef:2,cd:20,mpPct:.2,range:'ไกล (กระสุน)',anim:'cast',proj:{spd:6,r:12,hits:1},status:{shock:20,burn:20,stun:2},desc:'ดาเมจเวท 200% ของพลังเวท (หัก M.DEF ปกติ) · ใช้ MP 20% ของ MP สูงสุด · คูลดาวน์ 20 วิ'},
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
  bluejudge:{bossOnly:1,ic:'🐉',n:'คำพิพากษาตาคราม',tier:'ultimate',type:'magic',el:'lightning',coef:3,cd:10,range:'ทั้งจอ',anim:'beam',beam:1,multi:3,status:{shock:1},desc:'มังกรขาวยักษ์ตาสีฟ้า ปล่อยลำแสงสายฟ้า 300% ATK'},
  eyejudge:{bossOnly:1,ic:'👁️',n:'ดวงตาพิพากษา',tier:'ultimate',type:'magic',el:'holy',coef:7.5,multi:10,cd:10,range:'ทั้งจอ',anim:'beam',beam:1,desc:'ลำแสงศักดิ์สิทธิ์ทะลุทั้งจอ 10 ฮิต'},
  thousandcuts:{ic:'⚔️',n:'พันคมดาบ',tier:'ultimate',type:'phys',el:'weapon',coef:7.5,multi:12,cd:10,range:'พุ่ง (52)',anim:'rush',lunge:1.8,reach:52,desc:'ฟันรัว 12 ครั้ง'},
  toxicworld:{ic:'🧪',n:'โลกพิษ',tier:'ultimate',type:'magic',el:'poison',coef:6,multi:6,cd:10,range:'ทั้งพื้นที่ (พื้นดิน)',anim:'cast',rain:1,status:{poison:3},desc:'ฝนพิษ 6 ระลอก พิษ 3 สแตก'},
  titanfist:{ic:'👊',n:'หมัดไททัน',tier:'ultimate',type:'phys',el:'phys',coef:8,cd:10,range:'ใกล้ (50)',anim:'straight',reach:50,kd:1,desc:'หมัดเดียวแรงที่สุด กระแทกล้ม'},
  starfall:{ic:'🌟',n:'ดาวตก',tier:'ultimate',type:'magic',el:'weapon',coef:7,cd:10,range:'ไกล (กระสุน 5 ฮิต)',anim:'cast',proj:{spd:5,r:16,hits:5},desc:'ดาวตกพุ่งทะลวง 5 ฮิต'}
};
for(const k in SKILLS)if(SKILLS[k].tier==='ultimate'){SKILLS[k].gauge=100;delete SKILLS[k].mp;}
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
  {id:'basic',n:'คอมโบพื้นฐาน',seq:['L1','L2','L3']},
  {id:'launch',n:'ส่งขึ้นฟ้า',seq:['L1','L2','S2']},
  {id:'arcane',n:'เวทต่อเนื่อง',seq:['L1','L2','S1']},
  {id:'breaker',n:'ทลายการ์ด',seq:['L1','K','H']},
  {id:'sweep',n:'กวาดล้าง',seq:['D','K','S2']},
  {id:'finisher',n:'ปิดฉาก',seq:['L1','L2','H','S3']},
  {id:'aerial',n:'คอมโบกลางอากาศ',seq:['AJ','AJ','AK']},   // กระโดด → J → J → K (ตีโดนแล้วกดต่อ)
  {id:'lowcombo',n:'คอมโบตีต่ำ',seq:['C','C','D']}           // ↓J → ↓J → ↓K
];
const TOKN={L1:'J',L2:'J',L3:'J',L4:'J',H:'→J',K:'K',D:'↓K',C:'↓J',S1:'1',S2:'2',S3:'3',S4:'4',AJ:'อากาศJ',AK:'อากาศK'};

/* ---------- talents ---------- */
const TALENTS={
  piercer:{n:'THE PIERCER',th:'ผู้ทะลวง',ic:'🗡️',desc:'+100 เจาะเกราะ (Armor Penetration) แบบคงที่',skill:'piercestrike'},
  lucky:{n:'THE LUCKY ONE',th:'ผู้โชคดี',ic:'🍀',desc:'+25% อัตราคริติคอล และ +50% ดาเมจคริติคอล (ค่าคงที่)',skill:'luckyseven'},
  endurer:{n:'THE ENDURER',th:'ผู้ทนทาน',ic:'🛡️',desc:'ลดดาเมจที่ได้รับ 25% และ +30% ต้านสถานะผิดปกติ (ค่าคงที่)',skill:'ironwall'},
  undying:{n:'THE UNDYING',th:'ผู้ไม่มีวันตาย',ic:'💀',desc:'ฟื้นคืนชีพได้ 2 ครั้งต่อการต่อสู้ ด้วย HP 30% และล้างสถานะผิดปกติทั้งหมด',skill:'bloodpact'},
  hexweaver:{n:'THE HEXWEAVER',th:'ผู้ถักคำสาป',ic:'🕸️',desc:'+25% โอกาสติดสถานะผิดปกติ (หักลบกับค่าต้านของเป้าหมาย) · เฉพาะ Hexweaver: โอกาสติดสถานะทุก 1% ทำให้สถานะที่ติดนานขึ้น 0.05 วิ (+25% = +1.25 วิ)',skill:'toxiccurse'},
  archmage:{n:'THE ARCHMAGE',th:'จอมเวท',ic:'🔮',desc:'+15% พลังเวท · +10% MP สูงสุด · +10% ดาเมจคริติคอลเวท (ค่าคงที่)',skill:'arcaneburst'}
};
/* ค่าพาสซีฟของพรสวรรค์ (ค่าคงที่ตามสเปก) — Stats.derive อ่านจากตารางนี้ที่เดียว คำนวณใหม่จากฐานทุกครั้ง จึงไม่ทบซ้ำ */
const TALENT_PASSIVE={
  piercer:{apen:100},
  lucky:{critRate:.25,critDmg:.5},
  endurer:{dr:.25,statusRes:.30},                 // DR รวมไม่เกิน CONFIG.drCap (75%)
  undying:{revives:2,reviveHp:.30},
  hexweaver:{statusChance:.25},   // โอกาสติดสถานะทุก 1% → สถานะนานขึ้น CONFIG.statusChanceDur วิ
  archmage:{mpowPct:.15,maxMPPct:.10,mcritDmg:.10},
};

/* ---------- items ---------- */
const RARS=['normal','rare','epic','legendary','god'];
const RARN={normal:'ธรรมดา',rare:'หายาก',epic:'มหากาพย์',legendary:'ตำนาน',god:'เทพ'};
const RARC={normal:'#a8a8a8',rare:'#4aa8ff',epic:'#b45aff',legendary:'#ffd23a',god:'#ff7a1a'};   // เทา / น้ำเงิน / ม่วง (มหากาพย์) / ทอง (ตำนาน) / ส้ม (เทพ)
const RARITY={ // rarity changes affix count, affix quality, sockets and unique passives — not just stats
  normal:{affix:[0,1],q:[.6,.9],mult:1,sockets:0,uniq:null},
  rare:{affix:[2,2],q:[.8,1.1],mult:1.15,sockets:1,uniq:null},
  epic:{affix:[3,3],q:[.95,1.2],mult:1.2,sockets:1,uniq:null},
  legendary:{affix:[3,3],q:[1,1.3],mult:1.3,sockets:2,uniq:'leg'},
  god:{affix:[4,4],q:[1.3,1.6],mult:1.6,sockets:3,uniq:'god'}
};
const SLOTS=['weapon','helmet','armor','gloves','pants','boots','ring1','ring2','necklace'];
const SLOTN={weapon:'อาวุธหลัก',helmet:'หมวก',armor:'เกราะ',gloves:'ถุงมือ',pants:'กางเกง',boots:'รองเท้า',ring1:'แหวน 1',ring2:'แหวน 2',necklace:'สร้อยคอ',ring:'แหวน'};
const slotType=s=>s.startsWith('ring')?'ring':s;
const BASES={
  w_club:{n:'กระบองรากไม้',type:'weapon',wt:'club',atk:16,matk:4,ic:'🏏'},
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
  w_scythe:{n:'เคียวสุญญตา',type:'weapon',wt:'scythe',atk:34,matk:12,ic:'🌑',fixRar:'epic'},
  h_mage:{n:'หมวกปลายแหลมนักปราชญ์',type:'helmet',def:4,mdef:9,ic:'🎩',set:'mage',look:{head:'band',hc:'#4a2a8a',hc2:'#d88aff'}},
  a_mage:{n:'เสื้อคลุมนักปราชญ์',type:'armor',def:8,mdef:12,ic:'🧥',set:'mage',look:{body:'#3a2a6a',trim:'#d88aff'}},
  p_mage:{n:'กางเกงนักปราชญ์',type:'pants',def:4,mdef:6,ic:'👖',set:'mage',look:{pants:'#2a2050'}},
  b_mage:{n:'รองเท้านักปราชญ์',type:'boots',def:3,mdef:5,ic:'🥾',set:'mage',look:{boots:'#2a2050',trail:'#d88aff'}},
  h_boss:{n:'หมวกเขาจอมทัพ',type:'helmet',def:9,mdef:6,ic:'👹',set:'boss',look:{head:'horns',hc:'#3a1a2a',hc2:'#ffd23a'}},
  a_boss:{n:'เกราะจอมทัพ',type:'armor',def:16,mdef:8,ic:'🛡️',set:'boss',look:{body:'#3a1a2a',trim:'#ffd23a'}},
  g_boss:{n:'ถุงมือจอมทัพ',type:'gloves',def:5,mdef:3,ic:'🧤',set:'boss',look:{gloves:'#3a1a2a'}},
  b_boss:{n:'รองเท้าจอมทัพ',type:'boots',def:6,mdef:3,ic:'🥾',set:'boss',look:{boots:'#2a1420',trail:'#ffd23a'}},
  h_leather:{n:'หมวกหนังนักเดินทาง',type:'helmet',def:4,mdef:2,ic:'🪖',look:{head:'helm',hc:'#7a4a2a',hc2:'#3a2414'}},
  h_iron:{n:'หมวกเหล็กทหารยาม',type:'helmet',def:8,mdef:3,ic:'⛑️',look:{head:'helm',hc:'#9aa0ae',hc2:'#3a3f4e'}},
  h_band:{n:'ผ้าคาดผากนักสู้',type:'helmet',def:3,mdef:5,ic:'🎗️',look:{head:'band',hc:'#2a3a8a',hc2:'#d8dce8'}},
  h_shadow:{n:'ผ้าคาดผากสนธยา',type:'helmet',def:5,mdef:6,ic:'🥷',set:'shadow',look:{head:'band',hc:'#c94a3a',hc2:'#c8ccd8'}},
  h_horns:{n:'มงกุฎเขาอสูร',type:'helmet',def:6,mdef:8,ic:'😈',look:{head:'horns',hc:'#ece4d4',hc2:'#c41a3a'}},
  h_halo:{n:'วงรัศมีรุ่งอรุณ',type:'helmet',def:9,mdef:14,ic:'😇',set:'seraph',look:{head:'crown',hc:'#fff2a8',hc2:'#f4f0e0'}},
  h_crown:{n:'มงกุฎแมกมา',type:'helmet',def:10,mdef:10,ic:'👑',set:'magma',look:{head:'crown',hc:'#ffb03a',hc2:'#ff3a2a'}},
  a_cloth:{n:'เสื้อป่านชาวบ้าน',type:'armor',def:5,mdef:3,ic:'👕',look:{body:'#5a7a5a',trim:'#3a2a1a'}},
  a_leather:{n:'เกราะหนังพราน',type:'armor',def:9,mdef:4,ic:'🦺',look:{body:'#7a4a2a',trim:'#c89a5a',pads:1,sleeve:'#5a3a22'}},
  a_shadow:{n:'ชุดนินจาสนธยา',type:'armor',def:10,mdef:8,ic:'🥷',set:'shadow',look:{body:'#262a3a',trim:'#c94a3a',scarf:'#c94a3a',sleeve:'#1c1c2a'}},
  a_dragon:{n:'เกราะเกล็ดมังกรแดง',type:'armor',def:16,mdef:10,ic:'🐉',look:{body:'#a42a1a',trim:'#f3c969',pads:1,sleeve:'#7a1a10',cape:{col:'#b0262a',col2:'#6a1018'}}},
  a_golem:{n:'เกราะศิลาโกเลม',type:'armor',def:20,mdef:6,ic:'🪨',set:'golem',look:{body:'#6e6458',trim:'#5fe0a0',pads:1,sleeve:'#5a5248'}},
  a_seraph:{n:'เสื้อคลุมรุ่งอรุณ',type:'armor',def:18,mdef:20,ic:'🪽',set:'seraph',look:{body:'#e8e0c4',trim:'#8aa89a',pads:1,sleeve:'#cfc6a8',cape:{col:'#f4f0e0',col2:'#b9b6c4'},aura:'#fff2a8'}},
  a_magma:{n:'เกราะแมกมาเดือด',type:'armor',def:22,mdef:14,ic:'🌋',set:'magma',look:{body:'#3a1a14',trim:'#ff7a1a',pads:1,sleeve:'#2a1210',cape:{col:'#ff5a1a',col2:'#7a1a0a'},aura:'#ff8a3a'}},
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
  n_god:{n:'อามูเลตห้าธาตุ',type:'necklace',ic:'🧿',implicit:{str:2,agi:2,int:2,vit:2,luk:2}}
};
const AFFIX={
  str:{n:'STR',r:[1,3],per:.25},agi:{n:'AGI',r:[1,3],per:.25},int:{n:'INT',r:[1,3],per:.25},vit:{n:'VIT',r:[1,3],per:.25},luk:{n:'LUK',r:[1,3],per:.25},
  atk:{n:'พลังโจมตี',r:[3,8],per:1},matk:{n:'พลังเวท',r:[3,8],per:1},def:{n:'DEF',r:[2,6],per:.8},mdef:{n:'M.DEF',r:[2,6],per:.8},
  hp:{n:'HP',r:[20,60],per:8},mp:{n:'MP',r:[10,25],per:3},
  critRate:{n:'อัตราคริติคอล',r:[.01,.03],per:.002,pct:1},critDmg:{n:'ดาเมจคริติคอล',r:[.05,.15],per:.01,pct:1},
  apen:{n:'เจาะเกราะ',r:[2,6],per:.8},dr:{n:'ลดดาเมจ',r:[.01,.03],per:.001,pct:1},
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
  boss:{n:'ชุดจอมทัพ',b:{2:{def:10},4:{dmgPct:.2,d:'ดาเมจ +20%'}}}
};
const MATS={
  wood:{n:'ไม้',ic:'🪵'},ore:{n:'แร่เหล็ก',ic:'🪨'},fire:{n:'คริสตัลไฟ',ic:'🔥'},thunder:{n:'หินสายฟ้า',ic:'⚡'},fang:{n:'เขี้ยวหนู',ic:'🦷'},
  hide:{n:'หนังสัตว์',ic:'🟫'},cheese:{n:'ชีสแข็งโป๊ก',ic:'🧀'},pan:{n:'กระทะของพ่อ',ic:'🍳',rareMat:1},cloth:{n:'ผ้าเงา',ic:'🧵'},core:{n:'แกนโกเลม',ic:'💠',rareMat:1},
  lavaore:{n:'แร่ลาวา',ic:'🟧'},essence:{n:'แก่นลาวาเทพ',ic:'🌟',rareMat:1},
  rune_str:{n:'รูนพลัง',ic:'🔴',rune:{str:6}},rune_crit:{n:'รูนคม',ic:'🟡',rune:{critRate:.03}},rune_vit:{n:'รูนอึด',ic:'🟢',rune:{vit:6}},rune_fire:{n:'รูนเพลิง',ic:'🟠',rune:{resFire:.15,atk:4}},
  potion:{n:'ยาฟื้น HP',ic:'❤️',use:'potion',desc:'ฟื้น HP 40%'},
  mp_s:{n:'ยามานา (เล็ก)',ic:'🧪',manaPotion:100},mp_m:{n:'ยามานา (กลาง)',ic:'🧪',manaPotion:250},
  mp_l:{n:'ยามานา (ใหญ่)',ic:'🧪',manaPotion:500},mp_x:{n:'ยามานา (สูงสุด)',ic:'🧪',manaPotion:1000},
  sealbreaker:{n:'ตราทำลายผนึกเฉพาะตัว',ic:'🗝️',rareMat:1,use:'sealbreak',desc:'หายากที่สุด — ปลดผนึกสกิลเฉพาะตัวเพื่อเปลี่ยนเป็นสกิลเฉพาะตัวอื่น (ใช้ที่หน้าสกิล)'},
  bossfrag:{n:'เศษวิญญาณบอส',ic:'🔶',rareMat:1,desc:'รางวัล Pity จากการปราบบอส'},bosstoken:{n:'เหรียญเลือกรางวัลบอส',ic:'🏅',rareMat:1,desc:'รางวัล Pity ครบ 30 ครั้ง (ระบบเลือกรางวัลอยู่ในแผนอนาคต)'},
  divine:{n:'คริสตัลตีเหล็กศักดิ์สิทธิ์',ic:'💎',booster:1,rareMat:1,desc:'หายากมาก — เพิ่มโอกาสตีเหล็กสำเร็จ +20% (ใช้ได้ 1 ชิ้นต่อครั้ง)'},reset:{n:'คัมภีร์ล้างค่าพลัง',ic:'📜',use:'reset'},
  sc_flame:{n:'คัมภีร์สูตร: ดาบถ่านแดง',ic:'📘',scroll:'flame'},sc_gaunt:{n:'คัมภีร์สูตร: สนับมือฟ้าคำราม',ic:'📘',scroll:'gaunt'},
  sc_hammer:{n:'คัมภีร์สูตร: ค้อนชีสหินผา',ic:'📘',scroll:'hammer'},sc_runes:{n:'คัมภีร์สูตร: รูนทั้ง 4',ic:'📘',scroll:['rune_str','rune_crit','rune_vit','rune_fire']},
  sc_reset:{n:'คัมภีร์สูตร: ล้างค่าพลัง',ic:'📘',scroll:'reset'},sc_dragon:{n:'คัมภีร์สูตร: เกราะเกล็ดมังกรแดง',ic:'📙',scroll:'dragon'},
  sc_firepan:{n:'คัมภีร์สูตร: กระทะเพลิงมรดกพ่อ',ic:'📙',scroll:'firepan'},sc_kage:{n:'คัมภีร์สูตร: ดาบเงาจันทร์มืด',ic:'📙',scroll:'kage'},
  sc_golem:{n:'คัมภีร์สูตร: ชุดศิลาโกเลม',ic:'📙',scroll:['golemarmor','golemgloves','golempants']},sc_magma:{n:'คัมภีร์สูตร: เกราะแมกมาเดือด',ic:'📙',scroll:'magma'},
  sc_god:{n:'คัมภีร์สูตรโบราณ: ดาบหัวใจภูเขาไฟ',ic:'📕',scroll:'god'}
};
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
  {id:'sword',out:{base:'w_sword'},rar:'normal',mats:{wood:1,ore:1},known:1,clue:'โบโรเล่า: "ด้ามไม้หนึ่ง ใบแร่เหล็กหนึ่ง — นั่นแหละดาบของช่างฝึกหัด"'},
  {id:'spear',out:{base:'w_spear'},rar:'normal',mats:{wood:1,fang:1},known:1,clue:'โบโรเล่า: "เอาเขี้ยวหนูหนึ่งซี่ผูกปลายไม้ จะได้หอกแหลมเปี๊ยบ"'},
  {id:'hhelm',out:{base:'h_leather'},rar:'normal',mats:{hide:2,wood:1},known:1,clue:'โบโรเล่า: "หนังสัตว์สองผืน ไม้หนึ่งชิ้นทำโครง ได้หมวกหนัง"'},
  {id:'hpants',out:{base:'p_leather'},rar:'normal',mats:{hide:2},known:1,clue:'โบโรเล่า: "หนังสัตว์สองผืนเย็บรวม ใส่เป็นกางเกงได้"'},
  {id:'iboots',out:{base:'b_iron'},rar:'normal',mats:{ore:2},known:1,clue:'โบโรเล่า: "แร่เหล็กสองก้อนตีแผ่ เป็นรองเท้าเหล็กพอดีเท้า"'},
  {id:'potion',out:{mat:'potion',q:3},rar:'normal',mats:{cheese:1,hide:1},known:1,clue:'มิลินกระซิบ: "ชีสหนึ่งก้อนห่อหนังสัตว์หนึ่งผืน ต้มแล้วได้ยาสามขวด"'},
  {id:'rune_str',out:{mat:'rune_str',q:1},rar:'normal',mats:{ore:3},clue:'จารึกรูน: "แร่เหล็กสามก้อนหลอมรวม เกิดรูนแห่งพลัง"'},
  {id:'rune_crit',out:{mat:'rune_crit',q:1},rar:'normal',mats:{fang:2,ore:1},clue:'จารึกรูน: "เขี้ยวสองซี่ฝังในแร่หนึ่ง คมกริบดั่งรูนคม"'},
  {id:'rune_vit',out:{mat:'rune_vit',q:1},rar:'normal',mats:{hide:3},clue:'จารึกรูน: "หนังสามชั้นซ้อนกัน ทนทานดั่งรูนอึด"'},
  {id:'rune_fire',out:{mat:'rune_fire',q:1},rar:'normal',mats:{fire:1,lavaore:1},clue:'จารึกรูน: "คริสตัลไฟหนึ่งจุ่มแร่ลาวาหนึ่ง ลุกเป็นรูนเพลิง"'},
  {id:'flame',out:{base:'w_flame'},rar:'rare',mats:{ore:2,fire:1,wood:1},clue:'คัมภีร์ดาบเพลิง: "แร่สอง ไม้หนึ่ง และหัวใจไฟหนึ่งดวง"'},
  {id:'gaunt',out:{base:'w_gaunt'},rar:'rare',mats:{ore:1,thunder:1,hide:1},clue:'คัมภีร์สนับมือ: "แร่หนึ่ง หินสายฟ้าหนึ่ง พันด้วยหนังหนึ่งผืน"'},
  {id:'hammer',out:{base:'w_hammer'},rar:'rare',mats:{cheese:1,wood:2},clue:'โน้ตลายมือเด็ก: "ชีสแข็งโป๊กหนึ่งก้อน เสียบไม้สองท่อน = ค้อน!!"'},
  {id:'reset',out:{mat:'reset',q:1},rar:'rare',mats:{cheese:1,fang:2},clue:'คัมภีร์ล้างค่าพลัง: "ชีสหนึ่ง เขี้ยวสอง เขียนอักขระลบความทรงจำ"'},
  {id:'dragon',out:{base:'a_dragon'},rar:'epic',mats:{hide:3,fire:2,ore:2},clue:'ตำรามังกร: "หนังสาม ไฟสอง เหล็กสอง หลอมเป็นเกล็ดมังกร"'},
  {id:'firepan',out:{base:'w_firepan'},rar:'epic',mats:{pan:1,fire:1},clue:'จดหมายของพ่อ: "กระทะของพ่อ กับคริสตัลไฟหนึ่งดวง... ระวัง กระทะมีใบเดียวนะลูก"'},
  {id:'kage',out:{base:'w_kage'},rar:'epic',mats:{cloth:3,ore:2},clue:'ม้วนลับของคาเงะ: "ผ้าเงาสามผืน พันแร่เหล็กสองก้อน ได้ดาบเงา"'},
  {id:'golemarmor',out:{base:'a_golem'},rar:'epic',mats:{core:1,ore:3},clue:'ศิลาจารึกโกเลม: "แกนหนึ่ง เหล็กสาม = เกราะหิน"'},
  {id:'golemgloves',out:{base:'g_golem'},rar:'rare',mats:{core:1,ore:1},clue:'ศิลาจารึกโกเลม: "แกนหนึ่ง เหล็กหนึ่ง = ถุงมือหิน"'},
  {id:'golempants',out:{base:'p_golem'},rar:'rare',mats:{core:1,hide:2},clue:'ศิลาจารึกโกเลม: "แกนหนึ่ง หนังสอง = สนับขาหิน"'},
  {id:'magma',out:{base:'a_magma'},rar:'epic',mats:{lavaore:4,core:1},clue:'บันทึกคนงานเหมือง: "แร่ลาวาสี่ก้อนรอบแกนโกเลมหนึ่ง กลายเป็นเกราะแมกมา"'},
  {id:'god',out:{base:'w_god'},rar:'epic',mats:{essence:1,lavaore:5,fire:2},clue:'คัมภีร์เทพ: "แก่นลาวาเทพหนึ่ง แร่ลาวาห้า คริสตัลไฟสอง — ดาบแห่งภูเขาไฟ"'}
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
  frostslime:{n:'สไลม์เยือกแข็ง',kind:'mon',map:'SLIME',pal:'frostslime',sc:4,hw:22,h:34,spd:1.1,range:32,cd:[26,58],el:'phys',
    base:{hp:340,atk:58,def:12,mdef:4},res:{fire:-.5,phys:.2,poison:.5},xp:55,loot:'icecave',statusRes:{bleed:.6},
    moves:[M('กระแทกเยือก',10,4,18,12,34,3,16,{hy:18,hh:32}),M('เด้งทับ',18,8,22,16,30,4,22,{hy:18,hh:40,lunge:2.6,kd:1})]},
  frostwolf:{n:'หมาป่าหิมะ',kind:'mon',map:'WOLF',pal:'frostwolf',sc:4,hw:30,h:44,spd:2,range:36,cd:[18,40],el:'phys',
    base:{hp:280,atk:70,def:8,mdef:6},res:{fire:-.3,lightning:.2},xp:65,loot:'icecave',
    moves:[M('งับ',7,3,14,11,38,2,14,{hy:22,hh:30}),M('กระโจน',14,10,20,15,36,4,20,{hy:30,hh:44,lunge:3.8}),M('ข่วนต่ำ',9,3,16,10,36,2,18,{hy:6,hh:16,low:1})]},
  iceknight:{n:'อัศวินน้ำแข็ง',kind:'rig',look:'ICEKNIGHT',pal:'iceknight',wpn:'sword',hw:14,h:100,el:'phys',
    attr:{str:25,agi:15,int:10,vit:25,luk:10},skills:['cuttingwind'],base:{hp:420,atk:66,def:14,mdef:8},res:{fire:-.3,phys:.15},statusRes:{stun:.2},xp:110,loot:'icecave',meterStart:0},
  icegolem:{n:'ยักษ์น้ำแข็ง',kind:'mon',map:'GOLEM',pal:'icegolem',sc:5,hw:34,h:80,spd:.8,range:44,cd:[36,74],armor:1,el:'phys',
    base:{hp:800,atk:85,def:18,mdef:6},res:{fire:-.4,phys:.2,lightning:.1},xp:220,loot:'icecave',statusRes:{stun:.4,bleed:.4},
    moves:[M('หมัดน้ำแข็ง',16,4,22,13,56,4,22,{hy:56,hh:46}),M('ทุบพื้นเยือก',26,6,30,15,90,6,30,{hy:6,hh:16,low:1,quake:1,kd:1}),M('ขว้างก้อนน้ำแข็ง',20,3,26,10,0,4,22,{proj:{spd:3.8,r:10,hits:1,rock:1},far:1})]},
  mudslime:{n:'สไลม์โคลน',kind:'mon',map:'SLIME',pal:'mudslime',sc:4,hw:22,h:34,spd:1,range:32,cd:[28,62],el:'phys',
    base:{hp:220,atk:42,def:6,mdef:3},res:{fire:-.3,phys:.15,poison:.4},xp:32,loot:'stonecave',
    moves:[M('พ่นโคลน',10,4,18,10,34,3,16,{hy:18,hh:32}),M('เด้งทับ',18,8,22,14,30,4,22,{hy:18,hh:40,lunge:2.4,kd:1})]},
  rockling:{n:'หินเดินได้',kind:'mon',map:'GOLEM',pal:'rockling',sc:3,hw:24,h:50,spd:.9,range:34,cd:[30,64],armor:1,el:'phys',
    base:{hp:320,atk:48,def:10,mdef:2},res:{phys:.15,lightning:-.4,fire:.2},xp:48,loot:'stonecave',statusRes:{bleed:.5},
    moves:[M('หมัดหิน',12,4,20,12,40,3,18,{hy:30,hh:36}),M('กลิ้งชน',18,12,24,14,30,4,22,{hy:30,hh:44,lunge:2.8,kd:1})]},
  duelist:{n:'bbqy legendary',kind:'rig',fixedLv:100,look:'DUELIST',wpn:'sword',hw:14,h:100,el:'lightning',boss:1,challenge:1,
    attr:{str:30,agi:40,int:20,vit:20,luk:50},skills:['bluejudge','orb','slashwave'],base:{hp:5000,atk:198,def:60,mdef:60},res:{lightning:.2,shadow:-.2},statusRes:{stun:.5,bleed:.5,shock:.4},xp:2200,loot:'duelist',meterStart:0},
  kage:{n:'คาเงะ นักดาบเงา',kind:'rig',look:'KAGE',wpn:'kageblade',hw:14,h:100,el:'shadow',miniboss:1,
    attr:{str:20,agi:40,int:10,vit:12,luk:30},skills:['moonfall','slashwave'],base:{hp:520,atk:60,def:16,mdef:10,critRate:.08},res:{shadow:.5,fire:-.2},statusRes:{stun:.3},xp:180,loot:'kage',meterStart:40},
  shade:{n:'เงาสาวก',kind:'rig',look:'SHADE',wpn:'kageblade',hw:14,h:100,el:'shadow',
    attr:{str:14,agi:30,int:10,vit:10,luk:20},skills:['venomslash'],base:{hp:300,atk:55,def:12,mdef:6},res:{shadow:.5,lightning:-.25},xp:70,loot:'shade',meterStart:0},
  golem:{n:'โกเลมหิน',kind:'mon',map:'GOLEM',pal:'golem',sc:6,hw:40,h:96,spd:.8,range:44,cd:[32,70],boss:1,fixedLv:35,armor:1,el:'phys',
    attr:{str:40,agi:5,int:5,vit:40,luk:5},skills:['earthshatter'],base:{hp:2450,atk:180,def:38,mdef:20},res:{phys:.1,fire:.3,lightning:-.5},xp:216,loot:'golem',
    statusRes:{stun:.5,bleed:.5,burn:.3,shock:.3},stunImmuneAfter:480,
    phases:[{at:.5,n:'โกเลมคลั่ง! (เฟส 2)',cdMul:.6,spdMul:1.3,addMove:'rockrain'}],weakPoint:{after:'ทุบพื้น',t:150,mul:1.5},
    moves:[M('หมัดหิน',16,4,22,11,58,4,22,{hy:60,hh:50}),M('ทุบพื้น',26,6,30,15,90,6,30,{hy:6,hh:16,low:1,quake:1,kd:1}),
      M('พุ่งชน',22,14,28,12,44,6,26,{hy:50,hh:80,lunge:2.6,kd:1}),M('ขว้างหิน',20,3,26,10,0,4,22,{proj:{spd:3.6,r:10,hits:1,rock:1},far:1})]},
  lavaking:{n:'ราชันย์ลาวา',kind:'mon',map:'GOLEM',pal:'lavaking',sc:6,hw:40,h:96,spd:.9,range:44,cd:[28,60],boss:1,fixedLv:40,armor:1,el:'fire',
    attr:{str:35,agi:10,int:20,vit:35,luk:10},skills:['flamepillar','meteorfall'],base:{hp:5000,atk:260,def:51,mdef:38},res:{fire:.8,shadow:-.3,poison:-.2},xp:745,loot:'lavaking',
    statusRes:{stun:.6,burn:1,shock:.4,bleed:.3},stunImmuneAfter:600,
    phases:[{at:.6,n:'ราชันย์ลาวาปะทุ! (เฟส 2)',cdMul:.7,spdMul:1.2,addMove:'rockrain'},{at:.3,n:'แกนลาวาเปิด! (เฟส 3)',cdMul:.5,spdMul:1.4,aura:'burn'}],
    weakPoint:{after:'ทุบลาวา',t:150,mul:1.5},
    moves:[M('หมัดแมกมา',16,4,22,12,58,4,22,{hy:60,hh:50,el:'fire'}),M('ทุบลาวา',24,6,30,16,100,6,30,{hy:6,hh:16,low:1,quake:1,kd:1,el:'fire'}),
      M('พุ่งชนเพลิง',22,14,28,13,44,6,26,{hy:50,hh:80,lunge:2.8,kd:1,el:'fire'}),M('ขว้างหินเพลิง',18,3,24,11,0,4,22,{proj:{spd:4,r:11,hits:1,rock:1},far:1,el:'fire'})]},
  seraph:{n:'เซราฟตาเดียว',kind:'mon',map:'ANGEL',pal:'angel',sc:4,hw:30,h:112,spd:1,range:56,cd:[26,56],boss:1,fixedLv:50,armor:1,el:'holy',noFlip:1,hover:1,eye:[0,80],weakY:20,
    attr:{str:15,agi:25,int:45,vit:30,luk:20},skills:['thunderclap'],base:{hp:7400,atk:425,def:64,mdef:69},res:{holy:.6,shadow:-.3,lightning:-.2,fire:.1},xp:1928,loot:'seraph',
    statusRes:{stun:.6,burn:.4,shock:.4,bleed:.4,poison:.5},stunImmuneAfter:600,
    phases:[{at:.6,n:'เซราฟลืมตา! (เฟส 2)',cdMul:.75,spdMul:1.15,addMove:'featherrain'},{at:.3,n:'ดวงตาแห่งการพิพากษา! (เฟส 3)',cdMul:.5,spdMul:1.35,aura:'burn'}],
    weakPoint:{after:'จ้องมองพิพากษา',t:150,mul:1.5},
    moves:[M('ปีกฟาด',14,4,22,13,66,4,22,{hy:60,hh:80,el:'holy'}),M('โฉบจากฟ้า',22,12,26,15,50,6,26,{hy:60,hh:90,lunge:2.8,kd:1,el:'holy'}),
      M('ขนนกศักดิ์สิทธิ์',18,3,24,10,0,4,22,{proj:{spd:4.4,r:9,hits:1},far:1,el:'holy'}),
      M('จ้องมองพิพากษา',38,30,34,16,0,5,20,{beam:1,multi:6,hy:80,el:'holy'})]}
};
const EXTRA_MOVES={rockrain:M('ฝนหิน',20,40,24,6,0,3,18,{rain:1,multi:4,hy:60,hh:120}),featherrain:M('ฝนขนนก',20,44,24,7,0,3,18,{rain:1,multi:5,hy:60,hh:120,el:'holy'})};
const KAGE_LOOK={hair:'#24243a',skin:'#e6bfa0',body:'#2a2240',trim:'#c94a3a',pants:'#1a1626',boots:'#111018',gloves:'#2a2a3a',head:'band',hc:'#c94a3a',hc2:'#c8ccd8',scarf:'#c94a3a',mask:1,weapon:'kageblade',sleeve:'#1e1830',eye:'#ff6a5a'};
const ICEKNIGHT_LOOK={hair:'#d8e8f8',skin:'#e6d8d0',body:'#5a7a9a',trim:'#cfe8ff',pants:'#2a3a52',boots:'#1a2232',gloves:'#9ac8e8',head:'helm',hc:'#9ac8e8',hc2:'#e8fbff',pads:1,sleeve:'#3a5a7a',weapon:'sword',eye:'#4ab8ff'};
const DUELIST_LOOK={hair:'#16161a',skin:'#e6c4a4',body:'#1f3440',trim:'#d8b050',pants:'#1a1f28',boots:'#101418',gloves:'#16161a',head:null,hc:'#d8b050',hc2:'#7ad8ff',sleeve:'#243e4c',scarf:'#f2f2f2',pads:1,cape:{col:'#1f3440',col2:'#0e1a22'},weapon:'sword',eye:'#7ad8ff'};
const SHADE_LOOK={hair:'#3a1a4a',skin:'#c8a8c0',body:'#2a1030',trim:'#9a3aff',pants:'#1a0a20',boots:'#0a0410',gloves:'#2a1a3a',head:'band',hc:'#9a3aff',hc2:'#ff4af0',scarf:'#9a3aff',mask:1,weapon:'kageblade',wcol:'#6a3a9a',sleeve:'#1a0a20',eye:'#ff4af0'};
const SKIN_TONES=['#fbe0c8','#f2c9a0','#e0a878','#c68a5a','#9a6440','#6a4430'];
const HAIR_COLORS=['#2a1c14','#5a3820','#9a4a22','#d8a040','#e8d890','#c8c8d4','#d84a5a','#4a7ad8','#4ab88a','#9a5ad8'];
const HAIR_STYLES={short:'สั้น',spiky:'ตั้งแหลม',long:'ยาวสลวย',ponytail:'หางม้า',bun:'มวยผม',twin:'ไว้เปียคู่',bald:'ไม่มีผม'};
const LOOK_BY_NAME={KAGE:KAGE_LOOK,SHADE:SHADE_LOOK,ICEKNIGHT:ICEKNIGHT_LOOK,DUELIST:DUELIST_LOOK};
const DEFLOOK={hair:'#9a4a22',skin:'#f2c9a0',hstyle:'short',sex:'m',name:''};
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
    normal:  {chance:.28,qty:[1,2],rar:{normal:78.5,rare:18,epic:1.5,legendary:1.8,god:.2}},   // ปรับให้ดรอปยากขึ้น (เดิม 40%)
    elite:   {chance:.60,qty:[2,3],rar:{normal:47.2,rare:36,epic:6,legendary:10.5,god:.3}},   // เดิม 80%, 2-4 ชิ้น → 60%, 2-3 ชิ้น
    miniboss:{chance:.99,qty:[3,5],rar:'boss'},          // spec gives no mini-boss weights → uses Boss weights
    boss:    {chance:.63,qty:[1,2],rar:{normal:28,rare:36,epic:10,legendary:24,god:2}}},   // เดิม 3-6 ชิ้น, เทพ 15%
  godMinLevel:8,          // kept from previous design: God rolls below this enemy level are lowered to Legendary (0 = off)
  luck:{base:10,perPoint:.01,cap:.50},   // relative bonus to RANDOM drop chance only: +1% per LUK above 10, max +50%
  ground:{lifetime:7200,radius:26,pickupRange:22,nameRange:44},   // 120 s @60fps
  inventory:{equipSlots:40,stackMax:999},
  players:['P1'],         // single-player today; generation already loops per player
  pity:{enabled:false,fragment:'bossfrag',thresholds:[{kills:10,reward:{mat:'bossfrag',q:1}},{kills:20,reward:{mat:'bossfrag',q:1}},{kills:30,reward:{mat:'bosstoken',q:1},selectable:true}]}
};
/* ST_LootEntry: {base|mat|gear|set|book, min,max, w (weight), rar:'any' | [allowed rarities] (default ['normal']), unique, onlyKinds:[enemy kinds]} */
const LOOT_TABLES={
  rat:{guaranteed:[{gold:[5,12]}],entries:[
    {mat:'fang',min:1,max:2,w:30},{mat:'hide',w:25},{mat:'cheese',w:8},{mat:'mp_s',w:12},{mat:'potion',w:8},
    {mat:'rune_str',w:4,rar:['rare']},{gear:'any',w:20,rar:'any'},{book:'common',w:6,rar:['rare']},{book:'rare',w:3,rar:['legendary']},{mat:'divine',w:1,rar:['god']}]},
  stonecave:{guaranteed:[{gold:[8,18]}],entries:[
    {mat:'ore',min:1,max:2,w:30},{mat:'wood',w:15},{mat:'hide',w:15},{mat:'thunder',w:8},{mat:'mp_s',w:12},{mat:'potion',w:8},
    {mat:'rune_str',w:4,rar:['rare']},{gear:'any',w:22,rar:'any'},{book:'common',w:6,rar:['rare']},{book:'rare',w:3,rar:['legendary']},{mat:'divine',w:1,rar:['god']}]},
  duelist:{guaranteed:[{gold:[500,700]},{mat:'essence',q:1}],entries:[
    {gear:'any',w:30,rar:'any'},{book:'rare',w:12,rar:['legendary']},{book:'ultimate',w:12,rar:['legendary','god']},{mat:'divine',w:6,rar:['god']},{mat:'mp_x',w:10}]},
  icecave:{guaranteed:[{gold:[25,45]}],entries:[
    {mat:'ore',min:1,max:2,w:30},{mat:'hide',w:15},{mat:'thunder',w:15},{mat:'mp_m',w:12},{mat:'potion',w:8},
    {mat:'rune_fire',w:4,rar:['rare']},{gear:'any',w:25,rar:'any'},{book:'common',w:6,rar:['rare']},{book:'rare',w:5,rar:['legendary']},{book:'ultimate',w:1,rar:['god']},{mat:'divine',w:2,rar:['god']}]},
  lavarat:{guaranteed:[{gold:[15,30]}],entries:[
    {mat:'lavaore',min:1,max:2,w:30},{mat:'hide',w:15},{mat:'fire',w:15},{mat:'mp_m',w:12},{mat:'potion',w:8},
    {mat:'rune_fire',w:4,rar:['rare']},{gear:'any',w:25,rar:'any'},{book:'common',w:6,rar:['rare']},{book:'rare',w:4,rar:['legendary']},{book:'ultimate',w:1,rar:['god']},{mat:'divine',w:2,rar:['god']}]},
  shade:{guaranteed:[{gold:[20,40]}],entries:[
    {mat:'cloth',w:25},{mat:'mp_m',w:12},{mat:'potion',w:10},{gear:'any',w:25,rar:'any'},{set:'shadow',w:12,rar:'any'},
    {book:'common',w:6,rar:['rare']},{book:'rare',w:5,rar:['legendary']},{book:'ultimate',w:2,rar:['god']},{mat:'divine',w:2,rar:['god']}]},
  kage:{guaranteed:[{gold:[60,90]},{mat:'cloth',q:3},{mat:'sc_kage',q:1}],entries:[
    {base:'a_shadow',w:10,rar:'any',unique:1},{set:'shadow',w:20,rar:'any'},{gear:'any',w:20,rar:'any'},{mat:'mp_m',w:10},
    {book:'rare',w:12,rar:['rare','legendary']},{book:'ultimate',w:5,rar:['legendary','god']},{mat:'divine',w:3,rar:['god']}]},
  golem:{guaranteed:[{gold:[150,200]},{mat:'core',q:2},{mat:'sc_golem',q:1}],entries:[
    {base:'h_horns',w:10,rar:'any',unique:1},{base:'a_golem',w:8,rar:'any',unique:1},{gear:'any',w:25,rar:'any'},{mat:'mp_l',w:10},
    {book:'rare',w:12,rar:['rare','legendary']},{book:'ultimate',w:6,rar:['legendary','god']},{mat:'divine',w:4,rar:['god']}]},
  seraph:{guaranteed:[{gold:[700,900]},{mat:'essence',q:1}],entries:[
    {base:'h_halo',w:10,rar:'any',unique:1},{base:'w_seraph',w:8,rar:'any',unique:1},{set:'seraph',w:18,rar:'any'},{mat:'sk_eyejudge',w:10},{gear:'any',w:16,rar:'any'},{mat:'mp_x',w:8},
    {book:'ultimate',w:10,rar:['legendary','god']},{mat:'divine',w:8,rar:['god']}]},
  lavaking:{guaranteed:[{gold:[400,600]},{mat:'essence',q:1}],entries:[
    {base:'h_crown',w:10,rar:'any',unique:1},{set:'magma',w:20,rar:'any'},{gear:'any',w:20,rar:'any'},{mat:'mp_x',w:8},
    {book:'rare',w:10,rar:['rare','legendary']},{book:'ultimate',w:10,rar:['legendary','god']},{mat:'divine',w:6,rar:['god']}]}
};
/* Example tables from the design spec — NOT assigned to any enemy yet; their item IDs do not exist so the validator lists them. */
const LOOT_TABLE_TEMPLATES={
  slime:['sticky_gel','slime_core','poison_sac','slime_ring'],skeleton:['bone_fragment','ancient_bone','rusty_blade','skeleton_armor'],
  fire_demon:['burning_ash','flame_core','infernal_crystal','infernal_sword'],thunder_wolf:['thunder_fang','lightning_core','storm_essence','thunder_ring'],
  flame_dragon:['dragon_heart','infernal_armor'],thunder_king:['thunder_core','storm_blade'],blood_reaper:['blood_essence','reaper_scythe'],
  void_emperor:['void_fragment','void_robe'],ancient_guardian:['guardian_soul','guardian_shield']};
const BASE_BY_TYPE=t=>Object.keys(BASES).filter(k=>BASES[k].type===t&&k!=='w_god'&&k!=='n_god'&&k!=='h_crown'&&!(BASES[k].set&&BASES[k].set!=='shadow'&&false));

/* ---------- zones & quests ---------- */
const ZONE_INFO={town:{n:'เมือง Collawarrie',lv:1,biome:'town',safe:1},outer:{n:'ถ้ำชีสชั้นนอก',lv:1,biome:'cave'},inner:{n:'ถ้ำคริสตัล',lv:5,biome:'crystal'},lava1:{n:'เหมืองลาวา ชั้น 1',lv:11,biome:'lava',danger:1},
  lava2:{n:'เหมืองลาวา ชั้น 2',lv:13,biome:'lava',danger:1},lava3:{n:'เหมืองลาวา ชั้น 3 (บอส)',lv:19,biome:'lava',danger:1},
  ice1:{n:'ถ้ำน้ำแข็ง ชั้น 1',lv:18,biome:'ice',danger:1},ice2:{n:'ถ้ำน้ำแข็ง ชั้น 2',lv:20,biome:'ice',danger:1},
  stone1:{n:'ถ้ำหินโกเลม ชั้น 1',lv:5,biome:'cave',danger:1},stone2:{n:'ถ้ำหินโกเลม ชั้น 2',lv:7,biome:'cave',danger:1},
  golemroom:{n:'ห้องบอส: โกเลมหิน',lv:7,biome:'crystal',danger:1},
  sanctum:{n:'วิหารน้ำแข็งดวงตาเทวทูต (บอส)',lv:25,biome:'sanctum',danger:1}};
const QUESTS={
  main1:{n:'ผู้บุกรุกในถ้ำชีส',type:'หลัก',steps:['คุยกับช่างตีเหล็กโบโร','สร้างอาวุธที่โต๊ะตีเหล็ก','ทุบหินเปิดทางถ้ำชั้นใน','ผ่านด่านคาเงะ นักดาบเงา','ปราบโกเลมหิน'],reward:{xp:300,gold:100,mats:{sc_dragon:1}}},
  hunt:{n:'กำจัดหนูถ้ำ',type:'รอง',steps:['ปราบหนูถ้ำ 3 ตัว'],count:3,reward:{xp:120,mats:{sc_runes:1,potion:3}}},
  pan:{n:'กระทะของพ่อ',type:'รอง',steps:['หากระทะของพ่อในถ้ำคริสตัล'],reward:{xp:100,mats:{sc_firepan:1}}},
  lava:{n:'เหมืองลาวาร้าง',type:'หลัก',steps:['เข้าประตูเหมืองลาวาในถ้ำคริสตัล','ลงไปถึงชั้น 3','ปราบราชันย์ลาวา'],reward:{xp:1500,gold:500}}
};
