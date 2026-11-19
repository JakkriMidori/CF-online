'use strict';
/* ==================================================================
   CHARACTER & EQUIPMENT LOOK (v0.2.1, UI ของสเปกถูกลบใน v0.2.2) — ปรับจาก charspec.js ที่ผู้ใช้ส่งมา
   ------------------------------------------------------------------
   • EQUIP_SPEC: พาเลตต์ชิ้นส่วนชุดของผู้เล่นตามเกราะที่สวมจริง (เกราะไหล่ซ้าย/ขวา สายคาดอก
     สนับแขน ผ้าคลุมเอวผ่าหน้า-หลัง ขอบ/หมุด สายรัดบูท หัวเหล็ก) — ตัววาดอยู่ใน core.js
     (drawChibi / drawChibiFB เมื่อ K.outfit) จึงใช้ทรงผม 13 แบบ หน้าตา และอาวุธเดิมของเกมได้ครบ
   • v0.2.2: ลบหน้าแสดงสเปกโมเดล 4 ทิศ/Spec Sheet และปุ่มเข้าหน้าดังกล่าวทั้งหมดแล้ว
     เหลือเฉพาะการแต่งชุดเกราะให้ผู้เล่น (Equip.look) ซึ่งเป็นค่าที่แสดงในเกม
   • ไม่บังคับหน้าตาผู้เล่น: ผม ผิว ตา ทรงผม ยังเป็นค่าที่ผู้เล่นเลือกเองในหน้าสร้างตัวละคร
   ================================================================== */
const EQUIP_SPEC={
  // ชิ้นส่วนพื้นฐานที่ทุกชุดใช้ร่วมกัน (สนับแขน สายรัดบูท หัวเหล็ก กระเป๋าเข็มขัด)
  base:{bracer:'#4a3628',bracerBands:['#8a6a48','#b0a898'],bootStraps:'#8a5a34',toeCap:'#8a929a',beltPouch:'#a07850'},
  armors:{
    a_cloth:{specId:'ARC-01 · Wayfarer Field Coat',body:'#5a4632',lapel:'#e8dcc0',chestStraps:'#3a2a1c',strapBuckle:'#c8a050',
      pauldronR:'#7a6a58',pauldronRTrim:'#d8b070',pauldronL:'#4a5a50',pauldronLStitch:['#a8d0a0','#e0b060'],coat:'#3e6a5a',hemTrim:'#e0d0a8',hemStuds:'#2a2018',belt:'#5a3a20'},
    a_leather:{specId:'ARC-02 · Ranger Hunter Cuirass',body:'#4a3220',lapel:'#8a5632',chestStraps:'#a87442',strapBuckle:'#e0b868',
      pauldronR:'#7a4a2a',pauldronRTrim:'#e0b868',pauldronL:'#2e4832',pauldronLStitch:['#7ad08a','#e0a848'],coat:'#2e4e34',hemTrim:'#d8b870',hemStuds:'#3a2414',belt:'#5a381e'},
    a_shadow:{specId:'ARC-03 · Twilight Shinobi Vest',body:'#1c1e2e',lapel:'#c93848',chestStraps:'#483a58',strapBuckle:'#c8ccd8',
      pauldronR:'#9a2232',pauldronRTrim:'#e0dce8',pauldronL:'#181a28',pauldronLStitch:['#b06aff','#ff4a6a'],coat:'#281e3a',hemTrim:'#c93848',hemStuds:'#120e1c',belt:'#2a2438'},
    a_dragon:{specId:'ARC-04 · Crimson Dragonscale Mail',body:'#581614',lapel:'#f3c969',chestStraps:'#b88628',strapBuckle:'#ffe888',
      pauldronR:'#b8241c',pauldronRTrim:'#ffe070',pauldronL:'#7a1812',pauldronLStitch:['#ffd23a','#ff6a2a'],coat:'#a81e1a',hemTrim:'#f3c969',hemStuds:'#4a0e0c',belt:'#6a3a18'},
    a_golem:{specId:'ARC-05 · Monolith Runic Plate',body:'#4e4840',lapel:'#5fe0a0',chestStraps:'#787064',strapBuckle:'#5fe0a0',
      pauldronR:'#6e6458',pauldronRTrim:'#5fe0a0',pauldronL:'#524a42',pauldronLStitch:['#5fe0a0','#ffd34a'],coat:'#5a5248',hemTrim:'#5fe0a0',hemStuds:'#2a2420',belt:'#463e36'},
    a_seraph:{specId:'ARC-06 · Dawn Seraph Vestments',body:'#d8d0b8',lapel:'#ffd868',chestStraps:'#8aa89a',strapBuckle:'#fff2a8',
      pauldronR:'#f0e8d0',pauldronRTrim:'#ffd868',pauldronL:'#9ab8c8',pauldronLStitch:['#ffffff','#ffd868'],coat:'#e8e0c4',hemTrim:'#ffd868',hemStuds:'#6a7a72',belt:'#a89874'},
    a_magma:{specId:'ARC-07 · Molten Core Obsidian Plate',body:'#281412',lapel:'#ff7a1a',chestStraps:'#8a3818',strapBuckle:'#ffd04a',
      pauldronR:'#5a1e14',pauldronRTrim:'#ff9a2a',pauldronL:'#381410',pauldronLStitch:['#ff7a1a','#ffe06a'],coat:'#7a2014',hemTrim:'#ff8a2a',hemStuds:'#220a08',belt:'#4a1c12'},
    a_boss:{specId:'ARC-08 · Imperial Warlord Plate',body:'#2a1420',lapel:'#ffd23a',chestStraps:'#9a7020',strapBuckle:'#ffe878',
      pauldronR:'#7a1828',pauldronRTrim:'#ffd23a',pauldronL:'#3a1628',pauldronLStitch:['#ffd23a','#ff4a6a'],coat:'#7a1626',hemTrim:'#ffd23a',hemStuds:'#240a12',belt:'#5a3818'},
    a_mage:{specId:'ARC-09 · Astral Scholar Battlerobe',body:'#281e4c',lapel:'#d88aff',chestStraps:'#6848a8',strapBuckle:'#f0c8ff',
      pauldronR:'#4a2e84',pauldronRTrim:'#e0a8ff',pauldronL:'#241848',pauldronLStitch:['#9fe8ff','#e08aff'],coat:'#382468',hemTrim:'#d88aff',hemStuds:'#1a1034',belt:'#4a3078'},
    a_alch:{specId:'ARC-10 · Philosopher Alchemist Coat',body:'#1e362a',lapel:'#7af0c0',chestStraps:'#6a4e32',strapBuckle:'#7af0c0',
      pauldronR:'#2c5240',pauldronRTrim:'#7af0c0',pauldronL:'#1c3028',pauldronLStitch:['#7af0c0','#ffd87a'],coat:'#264838',hemTrim:'#7af0c0',hemStuds:'#12241c',belt:'#5a3e24'}
  }
};
const SPEC_PARTS=['body','lapel','chestStraps','strapBuckle','pauldronR','pauldronRTrim','pauldronL','pauldronLStitch','coat','hemTrim','hemStuds','belt'];

(function initCharSpec(){
  /* 1) Equip.look(): เติมพาเลตต์ชุดละเอียดให้ "ผู้เล่น" เท่านั้น (NPC/ศัตรูใช้ palLook แยก ไม่โดนผลกระทบ) */
  const lookOrig=Equip.look;
  Equip.look=function(){
    const K=lookOrig.call(this),B=EQUIP_SPEC.base;
    const arm=G.eq&&G.eq.armor&&itemByUid(G.eq.armor);
    let key=arm&&EQUIP_SPEC.armors[arm.base]?arm.base:'a_cloth';
    const A=EQUIP_SPEC.armors[key];
    K.outfit=1;K.specArmor=key;K.specArmorId=A.specId;
    for(const p of SPEC_PARTS)if(A[p]!==undefined)K[p]=A[p];
    K.bracer=K.gloves||B.bracer;K.bracerBands=B.bracerBands;K.bootStraps=B.bootStraps;K.toeCap=B.toeCap;K.beltPouch=B.beltPouch;
    K.knee=shade(K.pants||'#3a3a44',1.6);
    return K;
  };

})();
