'use strict';
/* ==================================================================
   CHARACTER & EQUIPMENT LOOK — พาเลตต์และสเปกชุดนักรบตามภาพอ้างอิง (Standing Left/Right & Running)
   ------------------------------------------------------------------
   • EQUIP_SPEC: พาเลตต์ชิ้นส่วนชุดของผู้เล่นตามเกราะที่สวมจริง (เกราะไหล่ซ้ายน้ำเงินเข้มปักลายฟ้า/ส้ม ·
     เกราะไหล่ขวาแดงหมุดทอง · เสื้อกั๊กเทาเข้มคาดสายหนังคู่ · สนับแขนสายรัด 2 เส้น · ผ้าคลุมเอวแดงผ่าหน้า-หลัง
     ขลิบขอบเงินตอกหมุด · กางเกงเทาอมเขียวไฮไลต์หน้าขา · บูทหนังรัดสาย 3 เส้นหัวเหล็ก · ดาบใหญ่สีเงินสะพายหลัง
     พร้อมกลไกล็อกมณีมรกต)
   ================================================================== */
const EQUIP_SPEC={
  // ชิ้นส่วนพื้นฐานที่ทุกชุดใช้ร่วมกัน (สนับแขน สายรัดบูท หัวเหล็ก กระเป๋าเข็มขัด กลไกล็อกดาบมณีมรกต)
  base:{
    bracer:'#382e28',bracerBands:['#9c6238','#b4aca4'],
    bootStraps:'#a45c30',toeCap:'#828c96',beltPouch:'#b87844',
    backGem:'#48ff98',backNodes:'#ff3838',backClamp:'#5a626e',
    bladeCol:'#eef2f8',bladeEdge:'#ffffff',bladeBevel:'#8c96a8'
  },
  armors:{
    a_cloth:{specId:'ARC-01 · Crimson Blade Coat',body:'#283038',lapel:'#c82428',chestStraps:'#8c522c',strapBuckle:'#d49450',
      pauldronR:'#c82428',pauldronRTrim:'#ffd060',pauldronL:'#243848',pauldronLStitch:['#38a8d8','#e06830'],coat:'#c82428',hemTrim:'#dce0e8',hemStuds:'#242028',belt:'#784826'},
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
  // ตั้งค่าเริ่มต้นของฮีโร่ให้เป็นผมทองทรงตั้งแหลม ตาสีน้ำเงินอมม่วง ชุดเกราะแดง-เทาเข้ม ตามภาพอ้างอิง
  Object.assign(DEFLOOK,{hair:'#eab044',skin:'#f4c4a0',eye:'#384888',hstyle:'spiky'});
  if(typeof G!=='undefined'&&G.look){
    if(G.look.hair==='#9a4a22')G.look.hair='#eab044';
    if(G.look.eye==='#1a1020')G.look.eye='#384888';
    if(G.look.hstyle==='short')G.look.hstyle='spiky';
  }
  if(BASES.a_cloth&&BASES.a_cloth.look)Object.assign(BASES.a_cloth.look,{body:'#283038',trim:'#c82428'});
  if(BASES.p_cloth&&BASES.p_cloth.look)Object.assign(BASES.p_cloth.look,{pants:'#38423c'});

  /* Equip.look(): เติมพาเลตต์ชุดละเอียดให้ "ผู้เล่น" เท่านั้น (NPC/ศัตรูใช้ palLook แยก ไม่โดนผลกระทบ) */
  const lookOrig=Equip.look;
  Equip.look=function(){
    const K=lookOrig.call(this),B=EQUIP_SPEC.base;
    const arm=G.eq&&G.eq.armor&&itemByUid(G.eq.armor);
    let key=arm&&EQUIP_SPEC.armors[arm.base]?arm.base:'a_cloth';
    const A=EQUIP_SPEC.armors[key];
    K.outfit=1;K.specArmor=key;K.specArmorId=A.specId;
    for(const p of SPEC_PARTS)if(A[p]!==undefined)K[p]=A[p];
    if(!G.eq||!G.eq.pants||key==='a_cloth')K.pants='#38423c';
    if(!G.eq||!G.eq.boots)K.boots='#342016';
    K.bracer=K.gloves||B.bracer;K.bracerBands=B.bracerBands;K.bootStraps=B.bootStraps;K.toeCap=B.toeCap;K.beltPouch=B.beltPouch;
    K.backGem=B.backGem;K.backNodes=B.backNodes;K.backClamp=B.backClamp;
    K.bladeCol=K.wcol||B.bladeCol;K.bladeEdge=B.bladeEdge;K.bladeBevel=B.bladeBevel;
    K.knee=shade(K.pants||'#38423c',1.65);
    return K;
  };
  if(typeof RCACHE!=='undefined')RCACHE.clear();
})();
