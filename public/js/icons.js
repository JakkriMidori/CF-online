// ไอคอนเส้นวาดเอง (SVG) ใช้แทน emoji ในเมนูและหน้าต่าง UI
// ทุกไอคอนวาดใน viewBox 24×24 ใช้ currentColor จึงเปลี่ยนสีตามข้อความได้
const ICO_PATHS={
  equip:'<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 9l6 6M15 9l-6 6"/>',
  craft:'<path d="M3 9h13l3-2v4h-2v2h-2v4h-6v2h-4v-2H6v-3H3z"/>',
  bag:'<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  status:'<circle cx="12" cy="7" r="3.5"/><path d="M5 21c0-4 3-6 7-6s7 2 7 6"/>',
  skill:'<path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>',
  quest:'<path d="M7 4h11v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 3-2z"/><path d="M9 9h6M9 13h6"/>',
  map:'<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  ency:'<path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 0-2 2z"/><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 1 2 2z"/>',
  save:'<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>',
  load:'<path d="M3 6h7l2 2h9v11H3z"/><path d="M12 18v-5M10 15l2-2 2 2"/>',
  controls:'<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h1M10 10h1M14 10h1M18 10h1M7 14h10"/>',
  home:'<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  brush:'<path d="M14 4l6 6-8 8H6v-6z"/><path d="M4 20c2-1 3-2 4-4"/>',
  scroll:'<path d="M7 4h11v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 3-2z"/><path d="M9 9h6M9 13h6"/>',
  sword:'<path d="M5 19L17 7M14 4l6 6"/><path d="M4 16l4 4M7 13l4 4"/>',
  helm:'<path d="M5 14a7 7 0 0 1 14 0v2H5z"/><path d="M5 16h14M12 7v3"/>',
  chest:'<path d="M8 4l-4 3 2 4 2-1v10h8V10l2 1 2-4-4-3-2 2h-4z"/>',
  glove:'<path d="M7 11V5a1.5 1.5 0 0 1 3 0v5M10 10V3.5a1.5 1.5 0 0 1 3 0V10M13 10V4.5a1.5 1.5 0 0 1 3 0V13"/><path d="M16 11.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L7 13"/>',
  pants:'<path d="M6 3h12l-1 18h-4l-1-10-1 10H7z"/>',
  boot:'<path d="M8 3h5v9l5 3v4H6z"/>',
  ring:'<circle cx="12" cy="14" r="6"/><path d="M9 8l3-4 3 4z"/>',
  amulet:'<path d="M6 3l6 5 6-5"/><path d="M12 11a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"/>',
  gem:'<path d="M7 4h10l4 6-9 11L3 10z"/><path d="M3 10h18M9 4l3 6 3-6"/>',
  coin:'<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  clover:'<circle cx="9" cy="9" r="3.2"/><circle cx="15" cy="9" r="3.2"/><circle cx="9" cy="15" r="3.2"/><circle cx="15" cy="15" r="3.2"/><path d="M12 12l5 9"/>',
  skull:'<path d="M5 11a7 7 0 0 1 14 0v4l-2 1v3H7v-3l-2-1z"/><circle cx="9.5" cy="12" r="1.6"/><circle cx="14.5" cy="12" r="1.6"/><path d="M11 19v-2M13 19v-2"/>',
  web:'<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/><path d="M12 7l3.5 1.5L17 12l-1.5 3.5L12 17l-3.5-1.5L7 12l1.5-3.5z"/>',
  orb:'<circle cx="12" cy="10" r="6"/><path d="M9 8.5a3 3 0 0 1 3-2"/><path d="M7 19h10M9 16l-1 3M15 16l1 3"/>',
  // ---- อาวุธ ----
  club:'<path d="M5 20l3-3"/><path d="M8 17l7-10a3.2 3.2 0 0 1 4.5 4.5L9.5 18.5z"/><path d="M14 9l1.5 1.5"/>',
  spear:'<path d="M4 20L15 9"/><path d="M15 9l1-6 5 5-6 1z"/><path d="M7 14.5l2.5 2.5"/>',
  flameblade:'<path d="M5 19L16 8M13 5l6 6"/><path d="M4 16l4 4"/><path d="M18 2c.5 1.5 2.5 2.5 2 4.5-.4 1.4-2 1.6-2.6.6"/>',
  gauntlet:'<path d="M6 11h11a2 2 0 0 1 2 2v2a5 5 0 0 1-5 5H9a3 3 0 0 1-3-3z"/><path d="M9 11V8M12 11V7M15 11V8"/><path d="M11 2l-2 3h3l-2 3"/>',
  pan:'<circle cx="10" cy="10" r="6.5"/><path d="M14.6 14.6L21 21"/><path d="M7 8.5a3.5 3.5 0 0 1 3-2"/>',
  hammer:'<path d="M4 8l6-4 4 6-6 4z"/><path d="M11 11l9 10"/>',
  katana:'<path d="M5 19C10 15 15 9 20 3"/><path d="M4 15l5 5"/><path d="M3 21l2.5-2.5"/>',
  featherblade:'<path d="M5 19L16 8M13 5l6 6M4 16l4 4"/><path d="M19 13c-3 0-6 3-6 7 3-1 5-3 6-7z"/>',
  greatsword:'<path d="M12 2l3 4v10H9V6z"/><path d="M6 16h12M12 16v6"/><path d="M12 6v8"/>',
  magicsword:'<path d="M5 19L16 8M13 5l6 6M4 16l4 4"/><path d="M18.5 14l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z"/>',
  staff:'<circle cx="16" cy="7" r="3.5"/><path d="M13.5 9.5L4 20"/><path d="M16 1.8v1.6M21.2 7h-1.6M19.7 3.3l-1.1 1.1"/>',
  dagger:'<path d="M6 18l9-9 4-5-5 4-9 9"/><path d="M4 15l5 5"/><path d="M3 21l2-2"/>',
  wand:'<path d="M4 20L14 10"/><path d="M17 3l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z"/>',
  scythe:'<path d="M8 21L15 3"/><path d="M15 3C10 2 5 4 3 9c3-2 7-2.4 11-1.4"/>',
  // ---- หมวก / เกราะ / รองเท้า / เครื่องประดับ ----
  cap:'<path d="M4 15a8 8 0 0 1 16 0z"/><path d="M2.5 15h19"/><path d="M12 7v3"/>',
  band:'<path d="M3 10c6-2 12-2 18 0v3.5c-6-2-12-2-18 0z"/><path d="M18 13l3 6M16.5 12.6l-.5 6"/>',
  horns:'<path d="M6 17a6 6 0 0 1 12 0v3H6z"/><path d="M7 13C5 10 5 6 6.5 3c.8 3 2.5 5 4 7M17 13c2-3 2-7 .5-10-.8 3-2.5 5-4 7"/>',
  halo:'<ellipse cx="12" cy="5.5" rx="7" ry="2.4"/><circle cx="12" cy="13" r="3"/><path d="M7 21a5 5 0 0 1 10 0"/>',
  crown:'<path d="M4 17L3 7l5 4 4-6 4 6 5-4-1 10z"/><path d="M4 20.5h16"/><circle cx="12" cy="13" r="1.2"/>',
  wizardhat:'<path d="M12 2l5 14H7z"/><path d="M3 18c4-2.5 14-2.5 18 0"/><path d="M10.5 9l1.5-1 1.5 1"/>',
  robe:'<path d="M9 3h6l2 4-2 2 3 12H6l3-12-2-2z"/><path d="M12 9v12M10 6h4"/>',
  plate:'<path d="M5 6l4-2h6l4 2v5l-2 1v8H7v-8l-2-1z"/><path d="M9 10h6M9 14h6M12 4v6"/>',
  wingboot:'<path d="M8 3h5v9l5 3v4H6z"/><path d="M14 7l6-3-1.5 3 3-.5-2.5 3"/>',
  fangneck:'<path d="M4 3c2 5.5 14 5.5 16 0"/><path d="M12 8.5l-2.4 6 2.4 6 2.4-6z"/>',
  // ---- วัตถุดิบ ----
  log:'<rect x="2.5" y="8.5" width="15" height="7.5" rx="3.7"/><ellipse cx="18" cy="12.25" rx="3" ry="3.75"/><path d="M18 11v2.5"/>',
  ore:'<path d="M4 17l2.5-8L13 5l6 4 1.5 7.5L14 21H8z"/><path d="M9 11l3 2.5M14.5 9l.8 4"/>',
  crystal:'<path d="M12 2l5 7-5 13-5-13z"/><path d="M7 9h10M12 2v20"/>',
  bolt:'<path d="M13.5 2L6 13h5.5L10 22l8-12h-5.5z"/>',
  fang:'<path d="M7 4h10c0 6-2 11.5-5 16C9 15.5 7 10 7 4z"/><path d="M10 7c0 3 .7 6 2 8.5"/>',
  hide:'<path d="M6 4l3 2h6l3-2 2 5-2 3 1 8-5-2h-4l-5 2 1-8-2-3z"/>',
  cheese:'<path d="M3 17L18 7.5l3 3V17z"/><path d="M3 17h18"/><circle cx="12.5" cy="13.5" r="1.1"/><circle cx="17" cy="12" r=".9"/>',
  spool:'<path d="M6 3.5h12M6 20.5h12"/><rect x="8" y="3.5" width="8" height="17"/><path d="M8 8l8 4M8 12.5l8 4"/>',
  core:'<path d="M12 2.5l7.5 9.5-7.5 9.5L4.5 12z"/><circle cx="12" cy="12" r="2.7"/>',
  star:'<path d="M12 2l2.6 6.4 6.9.6-5.2 4.5 1.6 6.8L12 16.6l-5.9 3.7 1.6-6.8L2.5 9l6.9-.6z"/>',
  rune:'<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5v11M8.5 9l7 6M15.5 9l-7 6"/>',
  potion:'<path d="M9 2.5h6M10 2.5v5.5L5 17a3 3 0 0 0 2.7 4.5h8.6A3 3 0 0 0 19 17l-5-9V2.5"/><path d="M6.5 14h11"/>',
  key:'<circle cx="7.5" cy="7.5" r="4.5"/><path d="M10.7 10.7L21 21M17.5 17.5l2.5-2.5M15 20l2.5-2.5"/>',
  shard:'<path d="M9 2.5l8 4.5-2.5 14.5-8-6.5z"/><path d="M9 2.5l1.5 9 4 10"/>',
  medal:'<circle cx="12" cy="15" r="6"/><path d="M8 2.5l4 6.5 4-6.5"/><path d="M12 12l1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L9 14.3l2-.3z"/>',
  recipe:'<path d="M6 4h12v14a3 3 0 0 1-3 3H6"/><path d="M6 4a2 2 0 0 0 0 4h3M6 21a2 2 0 0 1 0-4h9"/><path d="M10.5 9.5h5M10.5 13h5"/>',
  book:'<path d="M5 4h11a3 3 0 0 1 3 3v13.5H8a3 3 0 0 1-3-3z"/><path d="M5 17.5a3 3 0 0 1 3-3h11"/><path d="M12 6l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z"/>',
};
// ตัวจับคู่ประเภทไอเทม (type) → ไอคอน
const TYPE_ICO={weapon:'sword',helmet:'helm',armor:'chest',gloves:'glove',pants:'pants',boots:'boot',ring:'ring',ring1:'ring',ring2:'ring',necklace:'amulet'};
const TALENT_ICO={piercer:'sword',lucky:'clover',endurer:'equip',undying:'skull',hexweaver:'web',archmage:'orb'};
function ico(name,size=20){
  const p=ICO_PATHS[name]||ICO_PATHS.gem;
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

// ไอคอนประจำไอเทมแต่ละชิ้น: [รูปทรง, สี] — วาดเอง ไม่ใช้ emoji
const BASE_ICO={
  w_club:['club','#c8925a'],w_sword:['sword','#d8dde6'],w_spear:['spear','#f0e2c0'],w_flame:['flameblade','#ff8a3a'],w_gaunt:['gauntlet','#7fd8ff'],
  w_firepan:['pan','#ff9a3a'],w_hammer:['hammer','#ffd56a'],w_kage:['katana','#b08aff'],w_seraph:['featherblade','#fff2a8'],w_god:['greatsword','#ff5a1a'],
  w_mswd:['magicsword','#c9a0ff'],w_mstaff:['staff','#a98aff'],w_adagger:['dagger','#d88aff'],w_wand_fire:['wand','#ff7a2a'],w_wand_ice:['wand','#bff0ff'],
  w_wand_lightning:['wand','#9fe6ff'],w_scythe:['scythe','#9a7ad8'],
  h_mage:['wizardhat','#b58aff'],a_mage:['robe','#b58aff'],p_mage:['pants','#b58aff'],b_mage:['boot','#b58aff'],
  h_boss:['horns','#ffd23a'],a_boss:['plate','#ffd23a'],g_boss:['glove','#ffd23a'],b_boss:['boot','#ffd23a'],
  h_leather:['cap','#c8925a'],h_iron:['helm','#b8bfcc'],h_band:['band','#6a8aff'],h_shadow:['band','#ff6a5a'],h_horns:['horns','#ff5a6a'],
  h_halo:['halo','#fff2a8'],h_crown:['crown','#ffb03a'],
  a_cloth:['chest','#8ab88a'],a_leather:['chest','#c8925a'],a_shadow:['chest','#9a8acc'],a_dragon:['plate','#ff6a4a'],a_golem:['plate','#5fe0a0'],
  a_seraph:['robe','#fff2a8'],a_magma:['plate','#ff8a3a'],
  g_leather:['glove','#c8925a'],g_iron:['glove','#b8bfcc'],g_shadow:['glove','#9a8acc'],g_seraph:['glove','#fff2a8'],g_golem:['glove','#5fe0a0'],
  p_cloth:['pants','#7a9ad0'],p_leather:['pants','#c8925a'],p_shadow:['pants','#9a8acc'],p_seraph:['pants','#fff2a8'],p_golem:['pants','#5fe0a0'],
  b_wind:['wingboot','#6ae0a0'],b_iron:['boot','#b8bfcc'],b_shadow:['boot','#9a8acc'],b_magma:['boot','#ff8a3a'],
  r_copper:['ring','#e0925a'],r_ruby:['ring','#ff4a6a'],r_luck:['clover','#6ae07a'],
  n_fang:['fangneck','#f0e2c0'],n_crystal:['amulet','#7fd8ff'],n_god:['amulet','#ffd23a']
};
const MAT_ICO={
  wood:['log','#c8925a'],ore:['ore','#b8bfcc'],fire:['crystal','#ff7a2a'],thunder:['bolt','#9fe6ff'],fang:['fang','#f0e2c0'],hide:['hide','#c8925a'],
  cheese:['cheese','#ffd56a'],pan:['pan','#ff9a3a'],cloth:['spool','#9a8acc'],core:['core','#5fe0a0'],lavaore:['ore','#ff7a2a'],essence:['star','#ffb03a'],
  rune_str:['rune','#ff5a5a'],rune_crit:['rune','#ffd23a'],rune_vit:['rune','#6ae07a'],rune_fire:['rune','#ff8a3a'],
  potion:['potion','#ff5a6a'],mp_s:['potion','#7ab8ff'],mp_m:['potion','#5a9aff'],mp_l:['potion','#4a7aff'],mp_x:['potion','#b58aff'],
  sealbreaker:['key','#ffd23a'],bossfrag:['shard','#ffb03a'],bosstoken:['medal','#ffd23a'],divine:['gem','#9ff0ff'],reset:['scroll','#e8d8b0']
};
const _icoc=(name,col,size)=>`<span class="iic" style="color:${col}">${ico(name,size)}</span>`;
function bIco(id,size=18){const e=BASE_ICO[id]||[TYPE_ICO[(typeof BASES!=='undefined'&&BASES[id]&&BASES[id].type)]||'gem','#d8dde6'];return _icoc(e[0],e[1],size);}
function mIco(id,size=16){const e=MAT_ICO[id]||(/^sc_/.test(id)?['recipe','#f3c969']:/^sk_/.test(id)?['book','#c9a0ff']:/^rune_/.test(id)?['rune','#d8dde6']:['gem','#d8dde6']);return _icoc(e[0],e[1],size);}
