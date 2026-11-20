'use strict';
/* ============================================================
   OVERWORLD — 3-Island World Map (Town-to-Town Travel Only)
   * ดันเจี้ยนทั้งหมดเข้าทางประตูในเมือง ไม่ปรากฏบนแผนที่โลก *
   ============================================================ */
const OW_COLS = 72, OW_ROWS = 48;

const OW_LOCATIONS = [
  { id:'ow_home',    k:'ow_home',    kind:'home',    tx:9,  ty:27, icon:'🏠', tag:'ME', n:'บ้านของเรา (ME)',           lv:'จุดเริ่มต้น · พักผ่อน',     island:'south', dest:'home',    desc:'บ้านไม้แสนอบอุ่นริมแหลมตะวันตก พักฟื้น HP และ MP เต็ม 100%' },
  { id:'ow_town',    k:'ow_town',    kind:'town',    tx:20, ty:40, icon:'🏰', tag:'1',  n:'เมือง Collawarrie',         lv:'เมืองหลัก · เขตปลอดภัย',    island:'south', dest:'town',    desc:'เมืองท่ากลางหุบเขา ร้านค้า ตีเหล็ก ลานประลอง และประตูสู่ดันเจี้ยนทั้งหมด' },
  { id:'ow_port',    k:'ow_port',    kind:'port',    tx:34, ty:31, icon:'⚓', tag:'⚓', n:'ท่าเรือเกาะใต้',            lv:'ทางข้ามเกาะ',               island:'south', dest:'port',    desc:'ท่าเรือริมฝั่งตะวันออก มีสะพานไม้ยาวเชื่อมข้ามทะเลไปยังเกาะกลางและเกาะเหนือ' },
  { id:'ow_outpost', k:'ow_outpost', kind:'outpost', tx:50, ty:26, icon:'⛺', tag:'2',  n:'จุดพักแรมเกาะกลาง',        lv:'จุดพักกลางทาง · ฟื้นพลัง',  island:'mid',   dest:'outpost', desc:'ค่ายพักนักเดินทางบนเกาะหินแดง เชื่อมสะพานระหว่างเกาะใต้และเกาะเหนือ' },
  { id:'ow_spire',   k:'ow_spire',   kind:'spire',   tx:36, ty:14, icon:'🔮', tag:'T',  n:'หอคอยคริสตัลจอมเวท',       lv:'Lv.50–95 · 5 ชั้น (มีปริศนา)', island:'north', dest:'spire',   desc:'หอคอยอเมทิสต์ 5 ชั้น บนเกาะเหนือ (แทนทางเข้าเมืองหลวงเดิม) มีห้องทั่วไป · หัวหน้า · บอส ต้องแก้ปริศนาคริสตัลเพื่อขึ้นชั้นถัดไป' },
  { id:'ow_city',    k:'ow_city',    kind:'city',    tx:29, ty:14, icon:'🔒', tag:'C',  n:'เมืองหลวงออเรีย (ถูกผนึก)', lv:'🔒 ถูกล็อค · เข้าไม่ได้',    island:'north', dest:'city',    locked:1, desc:'ประตูเมืองหลวงบนเกาะเหนือถูกม่านพลังผนึกไว้แน่นหนา ยังไม่สามารถเดินทางเข้าไปได้' }
];

const OW_ZONE_META = {
  overworld: { n:'แผนที่โลก · ทางเดินข้ามเมือง', lv:1, biome:'town', safe:1 },
  ow_south:  { n:'เกาะใต้ · ถนนสู่เมือง Collawarrie', lv:1, biome:'town', safe:1 },
  ow_mid:    { n:'เกาะกลาง · ช่องแคบจุดพักแรม', lv:1, biome:'lava', safe:1 },
  ow_north:  { n:'เกาะเหนือ · หอคอยคริสตัลจอมเวท', lv:50, biome:'ice', safe:1 },
  city:      { n:'เมืองหลวงออเรีย (ถูกผนึก)', lv:1, biome:'town', safe:1 }
};

let OVERWORLD = null, CITY = null;

const OW = {
  zoneInfo(id) { return OW_ZONE_META[id] || null; },

  islandAt(tx, ty) {
    if (tx >= 43 && tx <= 58 && ty >= 20 && ty <= 33) return 'ow_mid';
    if (ty <= 19) return 'ow_north';
    return 'ow_south';
  },

  biomeAt(tx, ty) {
    if (!Z || Z.id !== 'overworld') return 'town';
    const r = Z.grid[ty], ch = r ? r[tx] : '.';
    if (ch === 'V') return 'lava';
    if (ch === 'N') return 'ice';
    return 'town';
  },

  make() {
    const C = OW_COLS, R = OW_ROWS;
    const gr = Array.from({ length: R }, () => Array(C).fill('W'));
    const ell = (cx, cy, rx, ry, ch) => {
      for (let y = Math.max(1, Math.floor(cy - ry)); y <= Math.min(R - 2, Math.ceil(cy + ry)); y++) {
        for (let x = Math.max(1, Math.floor(cx - rx)); x <= Math.min(C - 2, Math.ceil(cx + rx)); x++) {
          const n = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (hash(x, y) - .5) * .16;
          if (n <= 1) gr[y][x] = ch;
        }
      }
    };
    const paint = (x, y, ch) => { if (x > 0 && y > 0 && x < C - 1 && y < R - 1) gr[y][x] = ch; };
    const road = (x0, y0, x1, y1) => {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
      let lx = x0, ly = y0;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, px = Math.round(x0 + (x1 - x0) * t), py = Math.round(y0 + (y1 - y0) * t);
        if (px !== lx && py !== ly && gr[ly] && gr[ly][px] !== 'W') gr[ly][px] = ':';
        if (px > 1 && py > 1 && px < C - 2 && py < R - 2 && gr[py][px] !== 'W') gr[py][px] = ':';
        lx = px; ly = py;
      }
    };

    // 1) เกาะใต้ (South Island)
    ell(14, 31, 9.5, 8.2, '.');
    ell(21, 39, 10.5, 6.2, '.');
    ell(29, 35, 11.5, 8.5, '.');
    ell(25, 29, 7.5, 5.0, '.');

    // 2) เกาะกลาง (Middle Volcanic Ridge Island — ทางผ่านข้ามทะเล)
    ell(50, 26, 6.6, 5.2, 'V');

    // 3) เกาะเหนือ (North Island — เมืองหลวง City + ทุ่งหิมะทางเหนือ)
    ell(35, 14, 11.5, 6.4, '.');
    ell(48, 12, 13.0, 7.2, '.');
    ell(54, 13, 10.5, 6.6, 'N');
    ell(49, 9, 8.5, 4.5, 'N');

    // สะพานไม้กว้าง 2 ช่อง เชื่อม 3 เกาะเข้าด้วยกัน
    for (let x = 34; x <= 47; x++) { paint(x, 29, 'B'); paint(x, 30, 'B'); }
    for (let y = 17; y <= 23; y++) { paint(47, y, 'B'); paint(48, y, 'B'); }

    // ถนนดินเชื่อมระหว่างเมือง / บ้าน / ท่าเรือ / จุดพักแรม (ไม่มีทางเข้าดันเจี้ยนบนแผนที่)
    road(9, 27, 14, 34);    // บ้านของเรา -> ทางแยกตะวันตก
    road(14, 34, 20, 40);   // ทางแยกตะวันตก -> เมือง Collawarrie
    road(20, 40, 29, 37);   // เมือง Collawarrie -> ท้องทุ่งตะวันออก
    road(29, 37, 34, 31);   // ท้องทุ่งตะวันออก -> ท่าเรือเกาะใต้
    road(14, 34, 25, 31);   // ทางลัดสายเหนือของเกาะใต้ -> ท่าเรือเกาะใต้
    road(25, 31, 34, 31);
    road(34, 31, 35, 30);   // ท่าเรือ -> สะพานข้ามเกาะกลาง
    road(47, 29, 50, 26);   // สะพาน -> จุดพักแรมเกาะกลาง
    road(50, 26, 48, 23);   // จุดพักแรม -> สะพานไปเกาะเหนือ
    road(47, 17, 41, 15);   // ขึ้นฝั่งเกาะเหนือ -> หอคอยคริสตัล
    road(41, 15, 36, 14);
    road(36, 14, 29, 14);   // หอคอย -> ประตูเมืองหลวงที่ถูกผนึก

    // ทิวเขาและป่าไม้ประดับฉาก
    const mtns = [
      [12,24],[15,24],[23,25],[26,25],[28,26],[37,34],[38,37],
      [48,24],[52,23],[54,26],[53,28],
      [28,11],[31,10],[38,10],[44,9],[49,8],[55,9],[59,13],[57,16]
    ];
    for (const [mx, my] of mtns) {
      if (gr[my] && gr[my][mx] && gr[my][mx] !== 'W' && gr[my][mx] !== ':' && gr[my][mx] !== 'B') gr[my][mx] = '^';
    }
    const trees = [
      [7,25],[11,26],[7,29],[12,30],[11,35],[16,38],[17,41],[23,37],[24,41],[30,40],[33,39],
      [19,32],[22,30],[29,31],[31,34],[26,15],[29,14],[31,16],[40,13],[44,12],[52,13],[55,14]
    ];
    for (const [tx, ty] of trees) {
      if (gr[ty] && gr[ty][tx] && gr[ty][tx] !== 'W' && gr[ty][tx] !== ':' && gr[ty][tx] !== 'B') gr[ty][tx] = 'T';
    }

    const props = OW_LOCATIONS.map(l => ({
      k: l.k, x: l.tx * 16 + 8, y: l.ty * 16 + 10, hw: 11, inter: l.k, loc: l
    }));
    const water = [];
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      if (gr[y][x] === 'W' && ((gr[y - 1] && gr[y - 1][x] !== 'W') || (gr[y + 1] && gr[y + 1][x] !== 'W') ||
        gr[y][x - 1] !== 'W' || gr[y][x + 1] !== 'W' || ((x + y) % 5 === 0 && hash(x, y) > .65))) water.push({ x, y });
    }

    return {
      id: 'overworld', grid: gr, cols: C, rows: R, water, safe: 1,
      spawn: T(20, 41, 8, 8), props, items: [], npcs: [], foes: [], ground: [], torches: [],
      levelAt: () => 1,
      regionAt: tx => OW.islandAt(tx, Math.floor(P.y / 16)),
      biomeAt: (tx, ty) => OW.biomeAt(tx, ty === undefined ? Math.floor(P.y / 16) : ty)
    };
  },

  makeCity() {
    const C = 36, R = 24, gr = [];
    for (let y = 0; y < R; y++) {
      const row = Array(C).fill('.');
      if (y <= 2 || y >= R - 2) row.fill('#');
      row[0] = row[C - 1] = '#';
      gr.push(row);
    }
    const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) gr[y][x] = ch; };
    fill(3, 9, C - 4, 10, ':');
    fill(17, 3, 18, R - 3, ':');
    fill(17, R - 2, 18, R - 1, ':');
    fill(17, 0, 18, 2, ':');
    fill(9, 14, 13, 18, 'W');
    fill(23, 14, 27, 18, 'W');
    const water = [];
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) if (gr[y][x] === 'W') water.push({ x, y });
    const H = (tx, ty, rf = '#2a5aa8') => ({ k: 'house', ...T(tx, ty, 8, 14), hw: 26, roof: rf });
    const props = [
      Object.assign(H(7, 7, '#2a5aa8'), { sign: 'store', inter: 'in_store' }),
      Object.assign(H(28, 7, '#4c3f78'), { sign: 'alchemy', inter: 'in_alchemy' }),
      { k: 'citygate', ...T(17, 3, 16, 1), hw: 18, inter: 'citygate' },
      { k: 'anvil', ...T(22, 8, 8, 14), hw: 10, inter: 'craft' },
      { k: 'fountain', ...T(18, 12, 8, 14), hw: 14, inter: 'fountain' },
      { k: 'board', ...T(15, 11, 8, 14), hw: 8, inter: 'board' },
      { k: 'southgate', ...T(17, R - 2, 16, 14), hw: 18, inter: 'cityexit' },
      ...[4, 13, 22, 31].map(x => ({ k: 'tree', ...T(x, 4, 10, 14), hw: 6 })),
      ...[[15, 13], [20, 13], [15, 19], [20, 19], [8, 11], [27, 11]].map(([x, y]) => ({ k: 'lamp', ...T(x, y, 8, 4), hw: 3 }))
    ];
    const npcs = [
      { id: 'reitem', name: 'เวสเพอร์', ...T(13, 10), pal: 'kage', face: 1, hw: 5 },
      { id: 'smith', name: 'ดอรัน', ...T(21, 8), pal: 'smith', face: 1, hw: 5 },
      { id: 'southguard', name: 'อัลดริก', ...T(16, R - 3, 8, 6), pal: 'kage', face: 1, hw: 5 }
    ];
    return {
      id: 'city', grid: gr, cols: C, rows: R, water, safe: 1,
      spawn: T(17, R - 4, 16, 8), gate: T(17, 5, 16, 8),
      props, items: [], npcs, foes: [], ground: [], torches: [],
      levelAt: () => 1, regionAt: () => 'city', biomeAt: () => 'town'
    };
  },

  buildBg(B) {
    const gr = Z.grid, C = Z.cols, Rw = Z.rows;
    const isLand = (x, y) => x >= 0 && y >= 0 && x < C && y < Rw && gr[y][x] !== 'W';
    B.fillStyle = '#133e63'; B.fillRect(0, 0, C * 16, Rw * 16);

    for (let ty = 0; ty < Rw; ty++) for (let tx = 0; tx < C; tx++) {
      const px = tx * 16, py = ty * 16;
      if (gr[ty][tx] === 'W') {
        const near = isLand(tx - 1, ty) || isLand(tx + 1, ty) || isLand(tx, ty - 1) || isLand(tx, ty + 1);
        const near2 = isLand(tx - 2, ty) || isLand(tx + 2, ty) || isLand(tx, ty - 2) || isLand(tx, ty + 2);
        B.fillStyle = near ? '#329ac2' : near2 ? '#1f648e' : ((tx + ty) & 1 ? '#15446b' : '#123d60');
        B.fillRect(px, py, 16, 16);
        if (near) {
          B.fillStyle = 'rgba(205,245,255,.35)';
          if (isLand(tx, ty - 1)) B.fillRect(px, py, 16, 2);
          if (isLand(tx, ty + 1)) B.fillRect(px, py + 14, 16, 2);
          if (isLand(tx - 1, ty)) B.fillRect(px, py, 2, 16);
          if (isLand(tx + 1, ty)) B.fillRect(px + 14, py, 2, 16);
        }
        continue;
      }
      const c = gr[ty][tx], v = hash(tx * 5, ty * 7);
      if (c === 'B') {
        B.fillStyle = '#25769c'; B.fillRect(px, py, 16, 16);
        B.fillStyle = '#5a3a1e'; B.fillRect(px, py + 1, 16, 14);
        B.fillStyle = '#8b5e35';
        for (let k = 0; k < 4; k++) B.fillRect(px + k * 4, py + 2, 3, 12);
        B.fillStyle = '#402712'; B.fillRect(px, py + 1, 16, 1.5); B.fillRect(px, py + 13.5, 16, 1.5);
      } else {
        let col = c === 'N' ? (v > .5 ? '#ddecf7' : '#cce0f0') : c === 'V' ? (v > .5 ? '#5c4138' : '#4a322a') : (v > .62 ? '#619e49' : v > .28 ? '#538d40' : '#457b35');
        B.fillStyle = col; B.fillRect(px, py, 16, 16);
        if (c === ':') {
          B.fillStyle = '#a4793c'; B.fillRect(px + 1, py + 1, 14, 14);
          B.fillStyle = '#c89e5a'; B.fillRect(px + 2, py + 2, 12, 12);
          if (v > .5) { B.fillStyle = '#b48848'; B.fillRect(px + 5, py + 5, 3, 2); }
        }
        if (!isLand(tx, ty + 1)) {
          B.fillStyle = c === 'N' ? '#8ea8bd' : c === 'V' ? '#2c1916' : '#8d8372';
          B.fillRect(px, py + 12, 16, 4);
        }
        if (!isLand(tx, ty - 1)) {
          B.fillStyle = 'rgba(235,215,170,.45)'; B.fillRect(px, py, 16, 1.5);
        }
      }
    }
    HD.detail(B, C * 16, Rw * 16);
  },

  pushEnv(list, cx, cy) {
    if (!Z || Z.id !== 'overworld') return;
    const x0 = Math.max(0, (cx - 48) >> 4), x1 = Math.min(Z.cols - 1, (cx + W + 48) >> 4);
    const y0 = Math.max(0, (cy - 40) >> 4), y1 = Math.min(Z.rows - 1, (cy + H + 48) >> 4);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const ch = Z.grid[ty][tx];
      if (ch !== '^' && ch !== 'T') continue;
      const wx = tx * 16 + 8, wy = ty * 16 + 13;
      if (ch === '^') {
        const bio = Z.biomeAt(tx, ty);
        list.push({
          x: wx, y: wy, f: () => {
            g.fillStyle = 'rgba(10,18,28,.25)'; g.beginPath(); g.ellipse(wx + 2, wy, 10, 3.5, 0, 0, 7); g.fill();
            g.fillStyle = bio === 'ice' ? '#7b99b2' : bio === 'lava' ? '#5e3c32' : '#6f746d';
            g.beginPath(); g.moveTo(wx - 11, wy); g.lineTo(wx, wy - 20); g.lineTo(wx + 11, wy); g.closePath(); g.fill();
            g.fillStyle = bio === 'ice' ? '#9bb8cf' : bio === 'lava' ? '#7a5244' : '#8b9086';
            g.beginPath(); g.moveTo(wx - 11, wy); g.lineTo(wx, wy - 20); g.lineTo(wx + 1, wy); g.closePath(); g.fill();
            if (bio === 'ice') {
              g.fillStyle = '#eff8ff';
              g.beginPath(); g.moveTo(wx - 5, wy - 11); g.lineTo(wx, wy - 20); g.lineTo(wx + 5, wy - 11); g.lineTo(wx, wy - 9); g.closePath(); g.fill();
            }
          }
        });
      } else {
        const sw = Math.sin(G.t * .035 + tx + ty) * .7;
        list.push({
          x: wx, y: wy, f: () => {
            g.fillStyle = 'rgba(10,20,10,.24)'; g.beginPath(); g.ellipse(wx, wy, 7, 2.5, 0, 0, 7); g.fill();
            g.fillStyle = '#4e3522'; g.fillRect(wx - 1, wy - 5, 2, 5);
            for (const [dx, dy, r, c] of [[-3, -7, 4.5, '#2b6b33'], [3, -7, 4.5, '#2b6b33'], [0, -11, 5.5, '#3b8c42']]) {
              g.fillStyle = c; g.beginPath(); g.arc(wx + dx + sw * .5, wy + dy, r, 0, 7); g.fill();
            }
          }
        });
      }
    }
  },

  drawProp(o) {
    const x = o.x | 0, y = o.y | 0, k = o.k;
    if (k === 'ow_town' || k === 'ow_city') {
      const cap = k === 'ow_city', roof = cap ? '#485268' : '#b83d2e', wall = cap ? '#a8b0be' : '#e6dac4';
      shadow(g, x, y, 22);
      g.fillStyle = '#6f695e'; g.fillRect(x - 19, y - 9, 38, 9);
      for (const [hx, hy, rw] of [[-12, -13, 10], [4, -14, 11], [-4, -17, 12]]) {
        g.fillStyle = wall; g.fillRect(x + hx, y + hy, rw, 8);
        g.fillStyle = roof; g.beginPath(); g.moveTo(x + hx - 2, y + hy); g.lineTo(x + hx + rw / 2, y + hy - 6); g.lineTo(x + hx + rw + 2, y + hy); g.closePath(); g.fill();
      }
      if (cap) {
        g.strokeStyle = 'rgba(255,80,90,.72)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(x, y - 10, 21, 13, 0, 0, 7); g.stroke();
        g.fillStyle = '#d84040'; g.fillRect(x - 4, y - 24, 8, 7); g.strokeStyle = '#ffd27a'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y - 24, 3, Math.PI, 0); g.stroke();
        return true;
      }
      const wx = x - 18, wy = y - 8;
      g.fillStyle = '#c8b496'; g.fillRect(wx - 2.5, wy - 12, 5, 12);
      g.fillStyle = roof; g.beginPath(); g.moveTo(wx - 3.5, wy - 12); g.lineTo(wx, wy - 16); g.lineTo(wx + 3.5, wy - 12); g.closePath(); g.fill();
      const ang = G.t * .03;
      g.strokeStyle = '#f5ebd8'; g.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        const a = ang + i * Math.PI / 2;
        g.beginPath(); g.moveTo(wx, wy - 10); g.lineTo(wx + Math.cos(a) * 7, wy - 10 + Math.sin(a) * 7); g.stroke();
      }
      return true;
    }
    if (k === 'ow_spire') {
      const p = .5 + Math.sin(G.t * .08) * .35;
      shadow(g, x, y, 22);
      // เนินหินและฐานผลึกอเมทิสต์
      g.fillStyle = '#4e5c42'; g.beginPath(); g.ellipse(x, y - 2, 20, 7, 0, 0, 7); g.fill();
      g.fillStyle = '#5c545e'; g.fillRect(x - 10, y - 42, 20, 40);
      g.fillStyle = '#423a46'; g.fillRect(x + 2, y - 42, 8, 40);
      // ทางเดินเวียนเกลียวพันรอบหอคอย (ตามภาพต้นแบบ)
      g.strokeStyle = '#8b808e'; g.lineWidth = 2.6;
      for (const yy of [-10, -22, -33]) { g.beginPath(); g.moveTo(x - 13, yy + 3 + y); g.quadraticCurveTo(x, yy + y, x + 13, yy - 3 + y); g.stroke(); }
      // ประตูหิน + มงกุฎคริสตัลม่วงเรืองแสงบนยอดและฐาน
      g.fillStyle = '#1e102c'; g.fillRect(x - 4, y - 10, 8, 9); g.fillStyle = '#7af0d8'; g.fillRect(x - 1, y - 8, 2, 5);
      for (const [cx2, cy2, w2, h2] of [[-11, -11, 4, 8], [-6, -13, 4, 10], [6, -13, 4, 9], [11, -11, 4, 7]]) {
        g.fillStyle = '#a838e8'; g.beginPath(); g.moveTo(x + cx2 - w2 / 2, y + cy2 + h2); g.lineTo(x + cx2, y + cy2); g.lineTo(x + cx2 + w2 / 2, y + cy2 + h2); g.fill();
      }
      for (const [cx2, cy2, w2, h2, col] of [[-8, -48, 5, 11, '#9a28d8'], [-3, -55, 6, 16, '#c858ff'], [2, -57, 6, 18, '#f0a8ff'], [8, -51, 5, 13, '#b842f0']]) {
        g.fillStyle = col; g.beginPath(); g.moveTo(x + cx2 - w2 / 2, y + cy2 + h2); g.lineTo(x + cx2, y + cy2); g.lineTo(x + cx2 + w2 / 2, y + cy2 + h2); g.fill();
      }
      g.fillStyle = `rgba(218,120,255,${p * .45})`; g.beginPath(); g.arc(x, y - 47, 13, 0, 7); g.fill();
      if (G.t % 10 === 0) EP.push({ x: x + rnd(-10, 10), y: y - rnd(12, 54), vx: rnd(-.06, .06), vy: -.25, l: 24, c: '#e49aff' });
      return true;
    }
    if (k === 'ow_home') {
      shadow(g, x, y, 12);
      g.fillStyle = '#d4b88c'; g.fillRect(x - 8, y - 9, 16, 9);
      g.fillStyle = '#a84a2a'; g.beginPath(); g.moveTo(x - 10, y - 9); g.lineTo(x, y - 16); g.lineTo(x + 10, y - 9); g.closePath(); g.fill();
      g.fillStyle = '#ffe28a'; g.fillRect(x + 2, y - 6, 3, 3);
      g.fillStyle = '#5c3c24'; g.fillRect(x - 4, y - 5, 4, 5);
      if (G.t % 18 === 0) EP.push({ x: x - 5, y: y - 16, vx: .1, vy: -.25, l: 36, c: 'rgba(240,240,245,.4)' });
      return true;
    }
    if (k === 'ow_outpost') {
      shadow(g, x, y, 12);
      g.fillStyle = '#c89a5a'; g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x - 2, y - 12); g.lineTo(x + 8, y); g.closePath(); g.fill();
      g.fillStyle = '#7a4b24'; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x - 2, y - 6); g.lineTo(x + 2, y); g.closePath(); g.fill();
      // กองไฟแคมป์
      g.fillStyle = G.t % 12 < 6 ? '#ff943a' : '#ffd25a'; g.fillRect(x + 7, y - 4, 3, 4);
      if (G.t % 14 === 0) EP.push({ x: x + 8, y: y - 5, vx: rnd(-.08, .08), vy: -.28, l: 24, c: '#ffb45a' });
      return true;
    }
    if (k === 'ow_port') {
      shadow(g, x, y, 12);
      g.fillStyle = '#7a5230'; g.fillRect(x - 8, y - 5, 22, 5);
      const bob = Math.sin(G.t * .06) * 1.2;
      g.fillStyle = '#5a381e'; g.beginPath(); g.moveTo(x + 7, y - 7 + bob); g.lineTo(x + 19, y - 7 + bob); g.lineTo(x + 16, y - 3 + bob); g.lineTo(x + 9, y - 3 + bob); g.closePath(); g.fill();
      g.fillStyle = '#f5efe0'; g.beginPath(); g.moveTo(x + 13, y - 19 + bob); g.lineTo(x + 18, y - 8 + bob); g.lineTo(x + 13, y - 8 + bob); g.closePath(); g.fill();
      return true;
    }
    return false;
  },

  drawUI() {
    if (!Z || Z.id !== 'overworld') return;
    const reg = OW_ZONE_META[Z.regionAt(Math.floor(P.x / 16))] || OW_ZONE_META.overworld;
    D.save();
    D.fillStyle = 'rgba(8,18,44,.78)'; rrect(14, 12, 310, 44, 6); D.fill();
    D.strokeStyle = 'rgba(130,208,255,.55)'; D.lineWidth = 1; rrect(14, 12, 310, 44, 6); D.stroke();
    outlineText(`🌍 ${reg.n}`, 26, 26, 13, '#ffe3a0', 'left');
    outlineText('เดินข้ามเมืองบนแผนที่โลก · กด E เมื่อถึงเมืองหรือจุดพัก', 26, 44, 10.5, '#d8eeff', 'left');
    D.restore();

    for (const o of Z.props) {
      if (!o.loc) continue;
      const dist = Math.hypot(o.x - P.x, o.y - P.y);
      if (dist < 42 && !(NEAR && NEAR.o === o)) {
        const q = PJ.pt(o.x, o.y);
        outlineText(o.loc.icon + ' ' + o.loc.n, q.x * S, (q.y - 20 * q.s) * S, 11, '#fff3c8');
      }
    }
  },

  drawMinimap() {
    const sc = 2.5, mw = OW_COLS * sc, mh = OW_ROWS * sc, mx = 960 - mw - 22, my = 38;
    D.save();
    D.fillStyle = 'rgba(8,20,48,.86)'; rrect(mx - 6, my - 22, mw + 12, mh + 28, 6); D.fill();
    D.strokeStyle = 'rgba(122,216,255,.72)'; D.lineWidth = 1.2; rrect(mx - 6, my - 22, mw + 12, mh + 28, 6); D.stroke();
    for (let y = 0; y < OW_ROWS; y++) for (let x = 0; x < OW_COLS; x++) {
      const c = Z.grid[y][x];
      D.fillStyle = c === 'W' ? '#163f66' : c === 'B' ? '#9e6f3d' : c === ':' ? '#cfa86b' : c === 'N' ? '#cbe0f0' : c === 'V' ? '#6b473a' : c === '^' ? '#6d756b' : '#4d8a42';
      D.fillRect(mx + x * sc, my + y * sc, sc + .4, sc + .4);
    }
    for (const l of OW_LOCATIONS) {
      D.fillStyle = l.locked ? '#ff5a6a' : l.kind === 'spire' ? '#d870ff' : l.kind === 'town' ? '#ffe066' : l.kind === 'home' ? '#7dff9a' : l.kind === 'outpost' ? '#ffb85a' : '#7ce2ff';
      D.beginPath(); D.arc(mx + (l.tx + .5) * sc, my + (l.ty + .5) * sc, 3, 0, 7); D.fill();
    }
    D.fillStyle = '#ffffff'; D.strokeStyle = '#ff3838'; D.lineWidth = 1.4;
    D.beginPath(); D.arc(mx + P.x / 16 * sc, my + P.y / 16 * sc, 3.3, 0, 7); D.fill(); D.stroke();
    outlineText('WORLD MAP · เมืองและเส้นทาง', mx + mw / 2, my - 10, 11, '#ffe3a0');
    D.restore();
  },

  enter(fromId = 'town') {
    if (!OVERWORLD) OVERWORLD = OW.make();
    const loc = OW_LOCATIONS.find(l => l.dest === fromId) || OW_LOCATIONS.find(l => l.id === fromId) || OW_LOCATIONS[1];
    const sp = T(loc.tx, loc.ty + 1, 8, 8);
    if (blockedFor(sp.x, sp.y)) { sp.x = loc.tx * 16 + 8; sp.y = loc.ty * 16 + 10; }
    loadZone(OVERWORLD, sp);
    P.x = loc.tx * 16 + 8;
    P.y = (loc.ty + 1 < OW_ROWS && OVERWORLD.grid[loc.ty + 1][loc.tx] !== 'W') ? (loc.ty + 1) * 16 + 6 : loc.ty * 16 + 8;
    G.visited = G.visited || {};
    G.visited.overworld = 1;
    toast('🌍 ออกสู่แผนที่โลก (Overworld) — เดินข้ามเมืองได้อิสระ', 2600);
    Save.save();
  },

  enterCity() {
    toast('🔒 ประตูเมืองหลวงออเรียถูกผนึกไว้ — ยังไม่สามารถเดินทางเข้าไปได้ในขณะนี้', 2800);
    SFX.ui && SFX.ui('error');
    return false;
  },

  interact(type) {
    if (type === 'ow_town') { loadZone(TOWN, TOWN.southGateSpawn || TOWN.spawn); toast('🏰 เข้าสู่เมือง Collawarrie'); Save.save(); return true; }
    if (type === 'ow_city') { OW.enterCity(); return true; }
    if (type === 'ow_spire') { if (typeof enterSpire === 'function') enterSpire(1); return true; }
    if (type === 'ow_home') {
      const S = StatSync.get(); G.hp = S.maxHP; G.mp = S.maxMP; SFX.level();
      say([['🏠 บ้านของเรา (ME)', 'กลับถึงบ้านแล้ว... พักผ่อนจน HP และ MP ฟื้นเต็ม 100%!']], () => Save.save());
      return true;
    }
    if (type === 'ow_outpost') {
      const S = StatSync.get(); G.hp = S.maxHP; G.mp = S.maxMP; SFX.level();
      say([['⛺ จุดพักแรมเกาะกลาง', 'แวะผิงไฟพักเหนื่อยกลางทางข้ามทะเล — HP และ MP ฟื้นเต็ม 100%!']], () => Save.save());
      return true;
    }
    if (type === 'ow_port') {
      say([['⚓ ท่าเรือเกาะใต้', 'สะพานไม้ยาวตรงนี้เชื่อมข้ามไปจุดพักแรมเกาะกลางและเมืองหลวงออเรีย (City) บนเกาะเหนือ เดินข้ามไปได้เลย!']]);
      return true;
    }
    if (type === 'southgate' || type === 'cityexit') {
      UI.open(type === 'cityexit' ? 'cityexit' : 'southgate');
      return true;
    }
    return false;
  }
};

function blockedFor(x, y) {
  if (!OVERWORLD) return false;
  const tx = Math.floor(x / 16), ty = Math.floor(y / 16);
  if (ty < 0 || tx < 0 || ty >= OW_ROWS || tx >= OW_COLS) return true;
  return '#^TW'.includes(OVERWORLD.grid[ty][tx]);
}
