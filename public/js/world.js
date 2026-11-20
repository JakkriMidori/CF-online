'use strict';
/* ============================================================
   WORLD — zones, modular dungeon generator, exploration, minimap
   ============================================================ */
const T=(tx,ty,ox=8,oy=8)=>({x:tx*16+ox,y:ty*16+oy});
let Z=null;           // current zone
const P={x:0,y:0,face:1,moving:false,anim:0};
const EP=[];
const MOTES=Array.from({length:45},()=>({x:rnd(0,W),y:rnd(40,H),vx:rnd(-.08,.08),vy:rnd(-.12,-.02),a:rnd(.2,.7)}));

const CAVE_MAP=["##############################","##############################","#^^^T^^^^^^^T^^^^^^#^^^^T^^^^#",
"#..................#.........#","#..................#.........#","#..................#.........#","#..................#.........#","#..................#.........#",
"#..................R.........#","#..................R.........#",
"#..................#.........#","#..................#.........#","#..................#.........#","#..................#.........#","#..................#.........#","#..................#.........#",
"##############################"];
function mkFoe(kind,pos,extra={}){const d=FOES[kind];return Object.assign({kind,...pos,home:{...pos},t:0,vx:0,vy:0,face:-1,cool:0,alive:true,
  elite:!d.boss&&!d.miniboss&&rand()<ELITE.chance,respawn:0},extra);}
function makeCave(){
  return{id:'cave',grid:CAVE_MAP.map(r=>r.split('')),spawn:T(3,12),rubbleOpen:false,
    levelAt:tx=>tx>=20?ZONE_INFO.inner.lv:ZONE_INFO.outer.lv,regionAt:tx=>tx>=20?'inner':'outer',biomeAt:tx=>tx>=20?'crystal':'cave',
    props:[{k:'exitdoor',...T(2,3,8,14),hw:7,inter:'town'},   // v0.2.1: ทางออกเหลือประตูเดียว
      {k:'cheese',...T(16,3,8,15),hw:9},{k:'cheese',...T(17,3,10,15),hw:9},{k:'barrel',...T(2,14,8,12),hw:6},{k:'barrel',...T(17,14,8,12),hw:6},{k:'barrel',...T(18,14,6,12),hw:6},
      {k:'crystal',...T(22,13,8,12),hw:5},{k:'crystal',...T(27,5,8,12),hw:5},{k:'crystal',...T(28,12,4,12),hw:5},
      {k:'chest',...T(5,14,8,12),hw:7,inter:'chest',content:{base:'a_leather',rar:'normal',mat2:'sk_orb'}},
      {k:'chest',...T(11,7,8,12),hw:7,inter:'chest',content:{mat:'sc_hammer',mat2:'sk_poisondart'},hidden:1},
      {k:'chest',...T(16,12,8,12),hw:7,inter:'chest',content:{base:'b_wind',rar:'rare',mat2:'sk_rising'}},
      {k:'chest',...T(21,14,8,12),hw:7,inter:'chest',content:{base:'h_iron',rar:'rare',mat:'sc_reset'}},
      {k:'chest',...T(28,7,8,12),hw:7,inter:'chest',content:{base:'r_luck',rar:'rare',mat:'potion'}}],
    items:[{it:'wood',...T(11,13)},{it:'wood',...T(4,9)},{it:'wood',...T(12,4)},{it:'wood',...T(7,14)},
      {it:'stoneore',...T(15,8)},{it:'stoneore',...T(8,12)},{it:'stoneore',...T(18,6)},{it:'stoneore',...T(6,10)},
      {it:'fire',...T(17,10)},{it:'cheese',...T(15,4)},{it:'fire',...T(23,7)},{it:'pan',...T(27,14)},{it:'thunder',...T(26,13)}],
    npcs:[],
    foes:[mkFoe('rat',T(10,9),{respawnable:1,bound:19*16-6}),mkFoe('rat',T(14,6),{respawnable:1,bound:19*16-6}),mkFoe('rat',T(6,12),{respawnable:1,bound:19*16-6}),
      mkFoe('kage',T(21,9,8,0))]};
}
/* ----- TOWN (safe hub): NPCs, forge, fountain, shop, quest board, dungeon entrance ----- */
/* เมือง Collawarrie (48×32 ช่อง — กล้องเลื่อนตามตัวละคร) ถนน : คลอง W สะพาน B ประตูเมือง (ทางออกสู่ดันเจี้ยน) อยู่บนขวา · ลานประลองอยู่กลางสี่แยก */
const TOWN_COLS=48,TOWN_ROWS=32;
function makeTownGrid(){
  const C=TOWN_COLS,R=TOWN_ROWS,gr=[];
  for(let y=0;y<R;y++){const row=Array(C).fill('.');
    if(y<=2||y>=R-2)row.fill('#');
    row[0]=row[C-1]='#';gr.push(row);}
  const fill=(x0,y0,x1,y1,ch)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)gr[y][x]=ch;};
  fill(1,17,C-2,18,':');fill(1,9,C-2,10,':');                     // ถนนใหญ่แนวนอน 2 สาย
  for(const x of[10,23,36])fill(x,3,x+1,R-3,':');                  // ถนนแนวตั้ง 3 สาย (สายขวาสุดนำไปสู่ประตูเมืองบนขวา)
  fill(36,0,37,2,':');                                             // เปิดช่องประตูเมืองบนขวาให้ทางเดินทะลุออกไปได้
  fill(23,R-2,24,R-1,':');                                         // เปิดช่องประตูเมืองด้านล่างสุด (ตรงจากลานประลอง)
  fill(38,3,45,3,':');                                             // ทางเดินหินเชื่อมประตูเมืองบนขวา -> สระน้ำมุมขวาบน
  fill(1,23,C-2,24,'W');                                          // คลอง
  for(const x of[10,23,36])fill(x,23,x+1,24,'B');                   // สะพานไม้
  fill(40,4,44,6,'W');                                            // สระน้ำมุมขวาบน
  fill(42,16,42,16,':');                                          // ทางเดินเข้ากิลด์นักผจญภัย
  return gr;
}
function makeTown(){
  const grid=makeTownGrid(),water=[];
  for(let y=0;y<grid.length;y++)for(let x=0;x<grid[0].length;x++)if(grid[y][x]==='W')water.push({x,y});
  const roofs=['#a8382a','#2a5aa8','#3a8a4a','#8a5a2a','#7a3a8a','#2a8a8a'];let ri=0;const H=(tx,ty)=>({k:'house',...T(tx,ty,8,14),hw:26,roof:roofs[ri++%roofs.length]});
  return{id:'town',grid,cols:TOWN_COLS,rows:TOWN_ROWS,water,spawn:T(23,21,16,8),gate:T(36,5,16,8),southGateSpawn:T(23,TOWN_ROWS-4,16,8),safe:1,levelAt:()=>1,regionAt:()=>'town',biomeAt:()=>'town',
    props:[H(5,7),Object.assign(H(17,7),{sign:'alchemy',inter:'in_alchemy'}),Object.assign(H(30,7),{sign:'store',inter:'in_store'}),H(5,15),Object.assign(H(17,15),{sign:'smith',inter:'in_smithy'}),
      Object.assign(H(42,15),{roof:'#9c2e28',sign:'guild',inter:'in_guild'}),
      H(17,22),H(42,22),H(5,28),H(17,28),H(30,28),H(42,28),
      {k:'fountain',...T(31,13,8,14),hw:14,inter:'fountain'},
      {k:'citygate',...T(36,3,16,1),hw:18,inter:'citygate'},{k:'southgate',...T(23,TOWN_ROWS-2,16,14),hw:18,inter:'southgate'},{k:'duelpost',...T(38,10,8,14),hw:8,inter:'duel'},{k:'arena',...T(23,17,16,16),hw:10,inter:'arena'},
      ...[[3,3],[14,3],[20,3],[27,3],[33,3],[41,3],[46,4],[2,12],[46,12],[2,26],[46,26],[13,26],[27,26],[34,26],[20,12],[14,20],[39,20]].map(([x,y])=>({k:'tree',...T(x,y,10,14),hw:6})),
      ...[[21,6],[26,6],[21,13],[26,13],[21,20],[26,20],[8,13],[13,13],[35,4],[38,4],[44,3],[39,14],[45,14]].map(([x,y])=>({k:'lamp',...T(x,y,8,4),hw:3}))],
    items:[],npcs:[{id:'girl',name:'ไลร่า',...T(28,12),pal:'girl',face:-1,hw:5},
      {id:'guard',name:'กาเรธ',...T(35,5,8,8),pal:'kage',face:1,hw:5},{id:'southguard',name:'โรแลนด์',...T(22,TOWN_ROWS-3,8,6),pal:'kage',face:1,hw:5}],foes:[Object.assign(mkFoe('duelist',T(38,13,8,6)),{challenge:1,alive:!G.flags.duelWon})],ground:[]};
}
let TOWN=null;
/* ----- modular dungeon: 10×12 room chunks assembled into a 30×17 floor ----- */
const CHUNKS=[
 ["..........","..##...M..","..##......","......LL..",".E....LL..","..........","..........","..M....E..","...LL.....","...LL..##.",".C.....##.",".........."],
 ["..........",".LLL..LLL.",".L.E...ML.",".L......L.","..........","..........","..........","....##....",".E..##..C.","....##....","..M.......",".........."],
 ["...M......","..........",".##....##.",".##.E..##.","..........","..........","..........","LLL....LLL","LLL.M..LLL","..........","..E....C..",".........."],
 ["..........","..M..LL...",".....LL.E.","..........","LL........","..........","..........","........LL","..E.......","...##.....",".C.##..M..",".........."]];
CHUNKS.push(
 ["..........",".#......#.","...E..M...","..........","..LL..LL..","..........","..........","..LL..LL..","..........","...M..E...",".#..C...#.",".........."],
 ["..##..##..","..........","E...LL...M","....LL....","..........","..........","..........","..#....#..","..#.E..#..","..........","M...C.....","..##..##.."]);
const BOSS_CHUNK=["....................","..LL............LL..","..LL............LL..","....................","....................","....................","....................","....................","..LL............LL..","..LL............LL..","....................","...................."];
/* ===== v0.2.0: กับดักซ่อน (หลุม / หนาม / สัญญาณเตือน) =====
   - หลุม: ไม่อยู่บนทางเดินหลัก (แถว 8-9) มีรอยร้าวจาง ๆ ให้สังเกต · ชั้น 1 ร่วงลงชั้น 2 · ชั้น 2 กลับจุดเริ่ม
   - หนาม: มองไม่เห็นจนกว่าจะเหยียบ ลด HP 10% (ไม่ตาย) · สัญญาณเตือน: เรียกศัตรูที่ซ่อนอยู่มาสู้ทันที
   - ไม่วางใกล้ประตู/บันได/จุดเกิด (ห่างอย่างน้อย 4 ช่อง) */
const TRAP={near:64,pitDmg:.08,spikeDmg:.10,spikeCD:90};
function makeTraps(grid,props,items,floor){const out=[],rows=grid.length,cols=grid[0].length,n=Math.round(cols/2.4);
  const far=(x,y)=>props.every(o=>Math.hypot(o.x-(x*16+8),o.y-(y*16+8))>(o.inter?TRAP.near:24))&&items.every(i=>Math.hypot(i.x-(x*16+8),i.y-(y*16+8))>20)&&Math.hypot(x*16-16,y*16-9*16)>TRAP.near*1.5;
  for(let k=0,tries=0;k<n&&tries<1500;tries++){const x=rint(6,cols-6),y=rint(4,14);if(grid[y][x]!=='.'||!far(x,y)||out.some(t=>Math.abs(t.tx-x)+Math.abs(t.ty-y)<3))continue;
    const r=rand(),type=r<.45&&y!==8&&y!==9?'pit':r<.82?'spike':'alarm';out.push({tx:x,ty:y,type,seen:0,cd:0});k++;}
  return out;}
function hideFoe(e){const d=FOES[e.kind];return d&&d.kind==='mon'&&!d.boss&&!d.miniboss&&!e.challenge;}
// ย้ายศัตรูที่ซ่อนอยู่/ไม่ใช่บอส ให้ห่างประตู ทางออก บันได และจุดเกิด (แก้ปัญหามอนดักหน้าประตู)
function keepFromDoors(z){const doors=(z.props||[]).filter(o=>/exit|stairs|portal|gate|bossroom|door/.test(o.k||'')||o.inter==='town'||o.inter==='stairs'),sp=z.spawn,R=TRAP.near;
  const bad=(x,y)=>doors.some(o=>Math.hypot(o.x-x,o.y-y)<R)||(sp&&Math.hypot(sp.x-x,sp.y-y)<R*1.3);
  for(const e of z.foes){if(!e.hidden||!bad(e.x,e.y))continue;
    for(let t=0;t<80;t++){const tx=rint(1,z.grid[0].length-2),ty=rint(3,z.grid.length-2),x=tx*16+8,y=ty*16+8;
      if(z.grid[ty][tx]!=='.'||bad(x,y))continue;e.x=x;e.y=y;e.home={x,y};break;}}}
function makeDungeon(floor,theme){
  const th=theme||'lava',ice=th==='ice',stone=th==='stone',lava=th==='lava',tower=th==='tower',puddles={},id=th+floor,info=ZONE_INFO[id],grid=[];
  const NCH=5,COLS=NCH*10+2;   // v0.2.0: ดันเจียนกว้างขึ้น 5 ห้องต่อชั้น (เดิม 3)
  for(let y=0;y<17;y++)grid.push(Array(COLS).fill('#'));
  for(let x=1;x<COLS-1;x++)grid[2][x]=x%6===3?'T':'^';
  const parts=[];{const bag=CHUNKS.slice();for(let i=0;i<NCH;i++){if(!bag.length)bag.push(...CHUNKS);parts.push(bag.splice(rint(0,bag.length-1),1)[0]);}}
  const props=[],items=[],foes=[];let cx=0;
  const lavaTiles=[];
  for(const ch of parts){const w=ch[0].length;
    for(let r=0;r<12;r++)for(let c=0;c<w;c++){const tx=cx+c,ty=3+r;if(tx<1||tx>COLS-2)continue;let s=ch[r][c];
      if(r===5||r===6)s=s==='L'||s==='#'?'.':s;   // guaranteed corridor
      grid[ty][tx]=s==='#'||(s==='L'&&stone)?'#':s==='L'&&lava?'L':s==='L'&&tower?'P':'.';
      if(s==='L'&&tower)puddles[tx+','+ty]=pick(['poison','poison','burn','mana','power']);   // แอ่งน้ำยาสี
      if(s==='L'&&lava)lavaTiles.push({x:tx*16+8,y:ty*16+8});
      if(s==='E')foes.push(tower?(floor===2&&rand()<.2?mkFoe('gargoyle',T(tx,ty,8,8),{elite:1}):mkFoe(pick(['mslime','mslime','homunc','homunc']),T(tx,ty,8,8))):mkFoe(stone?(floor===2&&rand()<.2?'rockling':pick(['rat','rat','mudslime','mudslime','rockling'])):ice?(floor===2&&rand()<.15?'icegolem':pick(['frostslime','frostslime','frostwolf','frostwolf','iceknight'])):rand()<.65?'lavarat':'shade',T(tx,ty,8,8)));
      if(s==='M')items.push({it:pick(tower?['mercury','mercury','ore','thunder','fire']:stone?['ore','ore','wood','hide','thunder']:ice?['iceore','iceore','hide']:['lavaore','lavaore','fire','ore','hide']),...T(tx,ty)});
      if(s==='C')props.push({k:'chest',...T(tx,ty,8,12),hw:7,inter:'chest',content:{loot:tower?'tower':stone?'stonecave':ice?'icecave':'lavarat',skill:.25}});}
    cx+=w;}
  for(let x=1;x<COLS-1;x++)grid[15][x]='.';
  if(floor===2&&lava)props.push({k:'chest',...T(2,15,8,12),hw:7,inter:'chest',content:{mat:'sc_god',mat2:'divine'},hidden:1});
  for(let y=3;y<=9;y++)for(let x=1;x<=3;x++)grid[y][x]='.';   // clear path from spawn to the exit door
  for(let i=lavaTiles.length-1;i>=0;i--){const l=lavaTiles[i];if(l.x<64&&l.y<10*16)lavaTiles.splice(i,1);}props.push({k:'exitdoor',...T(2,3,8,14),hw:7,inter:'town'});
  if(floor<3)props.push({k:'stairs',...T(COLS-2,9,8,10),hw:6,inter:'stairs'});
  if(floor===3&&lava){foes.length=0;foes.push(mkFoe('lavaking',T(22,9,8,6)),mkFoe('shade',T(14,6,8,8)),mkFoe('shade',T(14,12,8,8)));
    props.push({k:'portal',...T(27,9,8,10),hw:6,inter:'portal',locked:1});}
  const traps=makeTraps(grid,props,items,floor);
  return{id,grid,traps,spawn:T(1,9),levelAt:()=>info.lv,regionAt:()=>id,biomeAt:()=>tower?'tower':stone?'cave':ice?'ice':'lava',props,items,npcs:[],foes,lavaTiles,puddles,floor,theme:th};
}
/* ห้องบอสแยก — เข้าแล้วออกไม่ได้ (ประตูออก/พอร์ทัลล็อก) จนกว่าจะชนะ หรือตาย */
const BOSS_ROOMS={golem:{id:'golemroom',biome:'crystal',theme:'stone'},lavaking:{id:'lava3',biome:'lava',theme:'lava'},seraph:{id:'sanctum',biome:'sanctum',theme:'ice'},homunculus:{id:'towerroom',biome:'tower',theme:'tower'}};
/* v0.2.0: บอสเกิดใหม่ตามเวลา (นับเวลาจริง เก็บในเซฟ) — ระหว่างรอ ห้องบอสว่าง ประตูเปิด และมีตัวนับถอยหลัง */
const BOSS_RESPAWN={min:5};
const bossLeft=k=>{const t=((G.flags||{}).bossCD||{})[k]||0;return Math.max(0,t-Date.now());};
const fmtLeft=ms=>{const s=Math.ceil(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
function setBossCD(k){G.flags.bossCD=G.flags.bossCD||{};G.flags.bossCD[k]=Date.now()+BOSS_RESPAWN.min*60000;}
function makeBossRoom(kind){
  const R=BOSS_ROOMS[kind],grid=[];for(let y=0;y<17;y++)grid.push(Array(30).fill('#'));
  for(let x=1;x<29;x++)grid[2][x]=x%6===3?'T':'^';
  for(let y=3;y<16;y++)for(let x=1;x<29;x++)grid[y][x]='.';
  for(const [x,y] of [[7,5],[7,13],[14,5],[14,13],[21,4],[21,14]])grid[y][x]='#';
  const need='🔒 ผนึกบอส — ต้องปราบ '+FOES[kind].n+' ก่อนจึงจะออกได้';
  const props=[{k:'exitdoor',...T(2,3,8,14),hw:7,inter:'town',locked:1,need},{k:'portal',...T(27,9,8,10),hw:6,inter:'portal',locked:1,need}];
  const wait=bossLeft(kind)>0;if(wait)for(const pr of props)pr.locked=0;
  return{id:R.id,grid,spawn:T(2,9),levelAt:()=>ZONE_INFO[R.id].lv,regionAt:()=>R.id,biomeAt:()=>R.biome,props,items:[],npcs:[],foes:wait?[]:[mkFoe(kind,T(22,9,8,6),{cool:100})],lavaTiles:[],floor:3,theme:R.theme,bossRoom:kind,cleared:wait?1:0,bossWait:wait?kind:null};
}
function makeSanctum(){return makeBossRoom('seraph');}
function enterBossRoom(kind){if(bossLeft(kind)>0){loadZone(makeBossRoom(kind));toast(`⏳ ${FOES[kind].n} ยังไม่เกิดใหม่ — อีก ${fmtLeft(bossLeft(kind))}`,3000);return;}loadZone(makeBossRoom(kind));G.shake=6;SFX.hit(true);toast(`⚔️ ${ZONE_INFO[BOSS_ROOMS[kind].id].n} — ประตูถูกผนึก! ชนะหรือตายเท่านั้น`,3500);}
function bossConfirm(o,kind,go){
  if(bossLeft(kind)>0){toast(`⏳ ${FOES[kind].n} จะเกิดใหม่ในอีก ${fmtLeft(bossLeft(kind))} — เข้าไปได้แต่ห้องยังว่าง`,3200);go();return;}
  if(o.confirm&&G.t-o.confirm<900){o.confirm=0;go();return;}
  say([['','⚠️ ด้านหน้าคือห้องบอส: '+FOES[kind].n+' — เข้าแล้วจะออกไม่ได้ และหนีไม่ได้ จนกว่าจะชนะหรือตาย'],['','กด E อีกครั้งภายใน 15 วินาทีเพื่อเข้า (ตอนนี้เลเวล '+G.level+')']],()=>{o.confirm=G.t;});
}
let CAVE=null;
const CHEST_SKILLS=['sk_orb','sk_poisondart','sk_rising','sk_slashwave','sk_rushkick','sk_thunderclap'];  // dungeon random chests roll from this list
const CAM={x:0,y:0,rx:0,ry:0,snap:1,zone:null};
function loadZone(z,spawn){if(typeof Cutscene!=='undefined'&&Cutscene.active&&!Cutscene._internal)Cutscene.abort();Z=z;const sp=spawn||z.spawn;P.x=sp.x;P.y=sp.y;{const bs=G.bloodstain;if(bs&&bs.zone===z.id&&blocked(bs.x,bs.y)){bs.x=z.spawn.x+24;bs.y=z.spawn.y;}}Z.cols=Z.grid[0].length;Z.rows=Z.grid.length;CAM.snap=1;Z.torches=[];if(Z.id!=='overworld'){Z.grid[2].forEach((c,i)=>{if(c==='T')Z.torches.push({x:i*16+8,y:2*16+8});});if(Z.id==='town')for(let i=3;i<Z.cols-2;i+=8)if(i<35||i>38)Z.torches.push({x:i*16+8,y:44});}
  if(!Z.safe&&Z.id!=='overworld'){for(const f of Z.foes)f.hidden=hideFoe(f)?1:0;keepFromDoors(Z);}   // v0.2.0: มอนทั่วไปซ่อนอยู่ (แบบ RPG Maker)
  for(const f of Z.foes)if(f.alive&&!f.hidden)Ency.see(f.kind,foeLevel(FOES[f.kind],Z.levelAt(Math.floor(f.x/16))));
  if((z.id==='town'||z.id==='city')&&!z.folk)z.folk=makeFolk(z);
  buildBg();G.visited=G.visited||{};G.visited[Z.regionAt(Math.floor(P.x/16))]=1;}
/* ----- อาคารภายในทั้ง 4 แห่ง: กิลด์นักผจญภัย · โรงตีเหล็ก · ร้านค้า · สำนักแปรธาตุ ----- */
const INDOOR_TITLES={in_smithy:'🔨 โรงตีเหล็กโบโร',in_store:'🪙 ร้านค้ามาร์คัส',in_alchemy:'🧪 สำนักเล่นแร่แปรธาตุ',in_guild:'⚔️ กิลด์นักผจญภัยคอลลาวาร์รี'};
const INDOOR_CARPETS={in_smithy:'#8f4420',in_store:'#266e56',in_alchemy:'#442c78',in_guild:'#96262a'};
const mkPatron=(pi,pos,line)=>{const pr=FOLK_PROFILES[pi%FOLK_PROFILES.length];return{id:'folk'+pi,name:pr.name,sex:pr.look.sex,...pos,face:1,hw:4,mv:0,wait:90,tx:null,ty:null,line,pal:{h:pr.look.hair,s:pr.look.skin,e:pr.look.eyec,c:pr.look.body,b:pr.look.trim,p:pr.look.pants,f:pr.look.boots}};};
function makeInterior(kind,retZone,retPos){
  const C=30,R=17,gr=Array.from({length:R},(_,y)=>Array.from({length:C},(_,x)=>(x<7||x>22||y<3||y>13)?'#':'.'));
  const rug=(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)gr[y][x]=':';};
  rug(14,10,15,13);gr[14][14]=':';gr[14][15]=':';
  const exit={k:'exitdoor',...T(15,14,0,14),hw:12,inter:'exit_interior'};
  const props=[exit,{k:'plant',...T(12,13,10,12),hw:5},{k:'plant',...T(17,13,6,12),hw:5}],npcs=[],folk=[],torches=[T(9,4),T(20,4),T(11,12),T(18,12)];
  const chairPair=(tx,ty)=>[{k:'chair',...T(tx-1,ty,4,12),hw:4},{k:'chair',...T(tx+1,ty,12,12),hw:4}];
  if(kind==='in_smithy'){
    rug(12,6,17,9);
    props.push(
      {k:'furnace',...T(15,3,0,14),hw:14,inter:'craft'},
      {k:'banner',col:'#b55228',...T(11,3,8,10),hw:4},{k:'banner',col:'#b55228',...T(18,3,8,10),hw:4},
      {k:'counter',...T(10,6,8,14),hw:18,inter:'smithy'},
      {k:'anvil',...T(18,6,8,14),hw:12,inter:'craft'},
      {k:'rack',...T(8,4,4,14),hw:10},{k:'rack',...T(21,4,12,14),hw:10},
      {k:'barrel',...T(8,12,4,12),hw:7},{k:'barrel',...T(21,12,12,12),hw:7},
      {k:'table',...T(19,10,8,14),hw:12},...chairPair(19,10)
    );
    npcs.push({id:'smith',name:'โบโร',...T(10,5,8,8),pal:'smith',face:1,hw:5});
    folk.push(mkPatron(1,T(12,10),'เหล็กของโบโรแข็งแกร่งพอต้านสัตว์ประหลาดจากรอยแยกได้สบาย ลองเลือกซื้ออาวุธหรือตีบวกที่ทั่งได้เลย!'),
      mkPatron(9,T(18,12),'ข้ามาลับดาบเตรียมมุ่งหน้าสู่ถ้ำหินโกเลม ว่ากันว่าหินเอเธอร์หัวใจศิลารออยู่ที่นั่น'));
  }else if(kind==='in_store'){
    rug(12,6,17,9);
    props.push(
      {k:'fireplace',...T(10,3,8,14),hw:12},{k:'shelf',...T(15,3,0,14),hw:14},{k:'shelf',...T(20,3,8,14),hw:12},
      {k:'banner',col:'#26785c',...T(8,3,4,10),hw:4},{k:'banner',col:'#26785c',...T(22,3,4,10),hw:4},
      {k:'counter',...T(15,6,0,14),hw:24,inter:'shop'},
      {k:'shelf',...T(8,5,4,14),hw:11},{k:'shelf',...T(21,5,12,14),hw:11},
      {k:'table',...T(10,10,8,14),hw:12},...chairPair(10,10),
      {k:'table',...T(19,10,8,14),hw:12},...chairPair(19,10),
      {k:'barrel',...T(8,13,4,12),hw:7},{k:'barrel',...T(21,13,12,12),hw:7}
    );
    npcs.push({id:'shopkeeper',name:'มาร์คัส',...T(15,5,0,4),pal:'smith',face:1,hw:5});
    folk.push(mkPatron(2,T(9,8),'ยาฟื้นมานากับยาฟื้นพลังของร้านมาร์คัสช่วยชีวิตข้าไว้ในถ้ำชีสหลายรอบแล้ว!'),
      mkPatron(6,T(18,8),'ได้ของดรอปจากมอนสเตอร์มาก็ขายให้มาร์คัสได้หมดเลยนะ ราคายุติธรรมดีทีเดียว'),
      mkPatron(13,T(11,12),'ร้านตกแต่งใหม่ดูอบอุ่นน่านั่งมาก! เตรียมเสบียงให้พร้อมก่อนลุยรอยแยกกันเถอะ'));
  }else if(kind==='in_alchemy'){
    rug(12,5,17,9);
    props.push(
      {k:'shelf',...T(11,3,8,14),hw:12},{k:'shelf',...T(18,3,8,14),hw:12},
      {k:'banner',col:'#5c3298',...T(8,3,4,10),hw:4},{k:'banner',col:'#5c3298',...T(21,3,12,10),hw:4},
      {k:'cauldron',...T(13,6,8,14),hw:12,inter:'alchemy'},
      {k:'counter',...T(19,6,8,14),hw:16,inter:'reitem'},
      {k:'crystal',...T(8,5,6,14),hw:6},{k:'crystal',...T(21,12,10,14),hw:6},
      {k:'table',...T(9,10,8,14),hw:12},...chairPair(9,10)
    );
    npcs.push({id:'alchemist',name:'วาเลเรีย',...T(11,5,8,8),pal:'girl',face:1,hw:5},{id:'reitem',name:'เซเรน่า',...T(19,5,8,6),pal:'kage',face:1,hw:5});
    folk.push(mkPatron(7,T(11,12),'วาเลเรียสามารถหลอมอุปกรณ์ซ้ำ 2 ชิ้นให้กลายเป็นชิ้นใหม่ที่แกร่งกว่าเดิมได้ ลองคุยกับนางดูสิ!'),
      mkPatron(8,T(19,11),'หินเอเธอร์แต่ละก้อนมีพลังบริสุทธิ์มหาศาล เซเรน่าใช้ละอองของมันแปรผลึกไอเทมหายากได้ด้วย'));
  }else{
    rug(12,5,17,9);
    props.push(
      {k:'board',...T(15,4,0,10),hw:11,inter:'board'},
      {k:'fireplace',...T(11,3,8,14),hw:12},{k:'shelf',...T(19,3,8,14),hw:12},
      {k:'banner',col:'#a6242a',...T(13,3,4,10),hw:4},{k:'banner',col:'#a6242a',...T(17,3,4,10),hw:4},
      {k:'counter',...T(10,6,8,14),hw:18,inter:'guildmaster'},
      {k:'counter',...T(20,6,8,14),hw:16,inter:'shop'},
      {k:'rack',...T(8,4,4,14),hw:10},{k:'shelf',...T(21,4,12,14),hw:11},
      {k:'pillar',...T(11,8,8,14),hw:6},{k:'pillar',...T(18,8,8,14),hw:6},
      {k:'table',...T(9,11,8,14),hw:12},...chairPair(9,11),
      {k:'table',...T(20,11,8,14),hw:12},...chairPair(20,11)
    );
    npcs.push({id:'guildmaster',name:'อิริส',...T(10,5,8,6),pal:'girl',face:1,hw:5},{id:'guildshop',name:'ทริสตัน',...T(20,5,8,6),pal:'smith',face:1,hw:5});
    folk.push(mkPatron(3,T(8,9),'ยินดีต้อนรับสู่กิลด์! ดูภารกิจบนกระดานเควสต์ตรงกลางได้เลย — ถึงเราจะเป็นคนธรรมดา แต่ทุกคนที่นี่กำลังปกป้องคอลลาวาร์รี'),
      mkPatron(5,T(11,13),'กลุ่มนักล่าค่าหัวกับสาวกเงาออกเดินทางล่วงหน้าไปตามหาหินเอเธอร์ทั้งแปดแล้ว เจ้าต้องรีบหน่อยนะ!'),
      mkPatron(11,T(18,13),'ซื้อยาจากทริสตันฝั่งขวาได้ตลอดเลย ก่อนลงถ้ำชีสหรือถ้ำโกเลมอย่าลืมพกโพชั่นติดตัว'),
      mkPatron(12,T(21,9),'อยากรู้ว่าเก่งแค่ไหน ลองท้าดวล bbqy ที่ลานประลองข้างนอกดูสิ — แต่ระวังความเสียหายสะท้อนด้วยล่ะ'));
  }
  return{id:kind,title:INDOOR_TITLES[kind]||kind,interior:1,carpet:INDOOR_CARPETS[kind]||'#8e2c26',retZone,retPos,grid:gr,cols:C,rows:R,
    spawn:T(15,13,0,4),safe:1,levelAt:()=>1,regionAt:()=>kind,biomeAt:()=>'interior',props,items:[],npcs,folk,foes:[],ground:[],torches};
}
function enterInterior(kind){
  const rz=Z||TOWN,rp={x:P.x,y:P.y+6};
  loadZone(makeInterior(kind,rz,rp));
  toast(Z.title,2200);
}
/* ----- หอคอยคริสตัลจอมเวท 5 ชั้น (Lv.50 -> 60 -> 70 -> 80 -> 90+ · 3 ห้อง/ชั้น + ปริศนา) ----- */
const SPIRE_RUNE_NAMES=['🔴 ศิลาทับทิม (แดง)','🔵 ศิลาไพลิน (ฟ้า)','🟣 ศิลาอเมทิสต์ (ม่วง)'];
const SPIRE_RUNE_COLS=['#ff5a6a','#5ac8ff','#c864ff'];
const SPIRE_RIDDLES=[
  {seq:[0,1,2],clue:'จารึกชั้น 1: "เปลวไฟลุกก่อน (แดง) → สายน้ำดับร้อน (ฟ้า) → ตกผลึกเป็นอเมทิสต์ (ม่วง)"'},
  {seq:[2,0,1],clue:'จารึกชั้น 2: "รากแห่งอเมทิสต์ (ม่วง) → จุดประกายเพลิง (แดง) → สงบด้วยวารี (ฟ้า)"'},
  {seq:[1,2,0],clue:'จารึกชั้น 3: "หยาดน้ำฟ้า (ฟ้า) → หล่อเลี้ยงผลึกม่วง (ม่วง) → ปะทุเป็นเปลวไฟ (แดง)"'},
  {seq:[2,1,0],clue:'จารึกชั้น 4: "ย้อนรอยธาตุทั้งสาม: อเมทิสต์ (ม่วง) → วารี (ฟ้า) → อัคคี (แดง)"'},
  {seq:[1,0,2],clue:'จารึกชั้น 5 (อาร์คเมจ): "เยือกเย็นดั่งฟ้า (ฟ้า) → ร้อนแรงดั่งแดง (แดง) → เป็นนิรันดร์ดั่งม่วง (ม่วง)"'}
];
function makeSpireFloor(floor=1){
  const C=48,R=17,gr=Array.from({length:R},()=>Array(C).fill('#'));
  for(let x=1;x<C-1;x++)gr[2][x]=x%6===3?'T':'^';
  for(let y=3;y<16;y++)for(let x=1;x<C-1;x++)gr[y][x]=(x===16||x===32)?((y===8||y===9)?':':'#'):'.';
  for(const cx of[7,12,21,27,37,42]){gr[5][cx]='#';gr[12][cx]='#';}
  const baseLv=50+(floor-1)*10,zid='spire'+floor,rd=SPIRE_RIDDLES[(floor-1)%SPIRE_RIDDLES.length];
  const puzzle={seq:rd.seq.slice(),lit:[],solved:false,clue:rd.clue};
  const props=[
    {k:'exitdoor',...T(2,3,8,14),hw:7,inter:'ow_spire_exit'},
    {k:'puzzle_clue',...T(5,6,8,12),hw:8,inter:'puzzle_clue'},
    {k:'chest',...T(13,4,8,12),hw:7,inter:'chest',content:{loot:'spire',skill:.35}},
    {k:'chest',...T(28,13,8,12),hw:7,inter:'chest',content:{loot:'spireboss',skill:.45}},
    {k:'puzzle_rune',ri:0,rc:SPIRE_RUNE_COLS[0],rn:SPIRE_RUNE_NAMES[0],...T(35,5,8,12),hw:8,inter:'puzzle_rune'},
    {k:'puzzle_rune',ri:1,rc:SPIRE_RUNE_COLS[1],rn:SPIRE_RUNE_NAMES[1],...T(35,13,8,12),hw:8,inter:'puzzle_rune'},
    {k:'puzzle_rune',ri:2,rc:SPIRE_RUNE_COLS[2],rn:SPIRE_RUNE_NAMES[2],...T(42,5,8,12),hw:8,inter:'puzzle_rune'}
  ];
  if(floor<5)props.push({k:'stairs',...T(45,9,8,10),hw:7,inter:'spire_stairs'});
  else props.push({k:'portal',...T(45,9,8,10),hw:7,inter:'spire_clear'});
  const bk='spire_b'+floor;
  const foes=[
    mkFoe('spiremob',T(8,8),{room:1}),mkFoe('spiremob',T(11,11),{room:1}),mkFoe('spiremob',T(14,7),{room:1}),
    mkFoe('spireleader',T(24,9),{room:2}),mkFoe('spiremob',T(22,6),{room:2,elite:1}),mkFoe('spiremob',T(26,12),{room:2}),
    mkFoe(bk,T(40,9,8,6),{room:3,cool:100})
  ];
  return{id:zid,theme:'spire',spireFloor:floor,title:`🔮 หอคอยคริสตัล ชั้น ${floor}/5`,grid:gr,traps:[],spawn:T(2,9),
    levelAt:tx=>baseLv+(tx>=33?3:tx>=17?1:0),
    regionAt:()=>zid,biomeAt:()=>floor===5?'sanctum':'crystal',roomAt:tx=>tx>=33?'ห้อง 3: บอส & ปริศนา':tx>=17?'ห้อง 2: ระดับหัวหน้า':'ห้อง 1: ทั่วไป',
    props,items:[],npcs:[],foes,lavaTiles:[],puddles:{},puzzle,floor};
}
function enterSpire(floor=1){
  const f=Math.max(1,Math.min(5,floor|0)),z=makeSpireFloor(f);
  loadZone(z,z.spawn);
  for(const e of Z.foes)e.hidden=0;   // เห็นระดับมอน หัวหน้า และบอสแต่ละห้องชัดเจน
  G.shake=4;
  toast(`🔮 หอคอยคริสตัล ชั้น ${f}/5 (เริ่มต้น Lv.${50+(f-1)*10}) · ปราบบอสและแก้ปริศนาคริสตัล`,3200);
  Save.save&&Save.save();
}
const World={
  serialize(){const c=CAVE,inInt=Z&&Z.interior,inSp=Z&&Z.theme==='spire',rz=inInt?(Z.retZone&&Z.retZone.id==='city'?'city':'town'):null,rp=inInt?(Z.retPos||TOWN.spawn):null;
    return{rubble:c.rubbleOpen,items:c.items.map(i=>!!i.taken),chests:c.props.map(p=>!!p.opened),
    foes:c.foes.map(f=>({alive:f.alive,elite:f.elite,respawn:f.respawn||0})),zone:inSp?'overworld':inInt?rz:Z&&(Z.id==='town'||Z.bossRoom)?'town':Z&&Z.id==='overworld'?'overworld':Z&&Z.id==='city'?'city':'cave',pos:inSp?T(36,15,8,8):inInt?rp:Z&&Z.bossRoom?{x:TOWN.gate.x,y:TOWN.gate.y}:Z&&(Z.id==='cave'||Z.id==='town'||Z.id==='overworld'||Z.id==='city')?{x:P.x,y:P.y}:T(23,4,8,14),visited:G.visited||{}};},   // ground items intentionally not saved
  restore(d){CAVE=makeCave();TOWN=makeTown();if(typeof OW!=='undefined'){OVERWORLD=OW.make();CITY=OW.makeCity();}if(d){CAVE.rubbleOpen=d.rubble;if(d.rubble){CAVE.grid[8][19]='.';CAVE.grid[9][19]='.';}
    d.items.forEach((t,i)=>{if(CAVE.items[i])CAVE.items[i].taken=t;});d.chests.forEach((o,i)=>{if(CAVE.props[i])CAVE.props[i].opened=o;});
    d.foes.forEach((f,i)=>{const e=CAVE.foes[i];if(e){e.alive=f.alive;e.elite=f.elite;e.respawn=f.respawn||0;if(!e.alive&&e.respawnable&&!e.respawn)e.respawn=CONFIG.respawnFrames;}});G.visited=d.visited||{};}
    if(d&&d.zone==='overworld'&&OVERWORLD){loadZone(OVERWORLD,d.pos);if(blocked(P.x,P.y)){P.x=OVERWORLD.spawn.x;P.y=OVERWORLD.spawn.y;}}
    else if(d&&d.zone==='city'&&CITY){loadZone(CITY,d.pos);if(blocked(P.x,P.y)){P.x=CITY.spawn.x;P.y=CITY.spawn.y;}}
    else if(d&&d.zone==='town'){loadZone(TOWN,d.pos);if(blocked(P.x,P.y)||P.x>=TOWN_COLS*16||P.y>=TOWN_ROWS*16){P.x=TOWN.spawn.x;P.y=TOWN.spawn.y;}}else if(d)loadZone(CAVE,d.pos);else loadZone(TOWN);}
};

/* ----- background ----- */
const BIOME={town:{floor:[92,132,72],line:'rgba(30,60,20,.25)',top:'#141a2b',face:['#8a8376','#575249'],road:[150,138,118]},cave:{floor:[114,92,70],line:'rgba(40,25,16,.55)',top:'#1c1311',face:['#5c3e2a','#3a2618']},
  crystal:{floor:[70,72,94],line:'rgba(20,20,40,.55)',top:'#16141e',face:['#3e3a4c','#2a2836']},
  lava:{floor:[74,52,46],line:'rgba(30,10,8,.6)',top:'#140c0a',face:['#4a2a20','#2a1612']},
  ice:{floor:[150,184,204],line:'rgba(30,60,90,.45)',top:'#34506a',face:['#8ab0c8','#5a7e98']},
  tower:{floor:[64,56,80],line:'rgba(20,10,30,.55)',top:'#140f1c',face:['#4a3a5a','#2a2036']},
  sanctum:{floor:[84,104,98],line:'rgba(10,24,24,.5)',top:'#141c24',face:['#4a6a64','#2a403c']},
  interior:{floor:[118,84,54],line:'rgba(35,20,10,.45)',top:'#18110c',face:['#785e46','#4e3a28'],road:[140,46,42]}};
/* ----- กำแพงหินของเมือง: ผนังอิฐสลับแถว + หลังกำแพงปูแผ่นหิน + ขอบสว่าง/เงา/มอส ----- */
const _hx=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const _tint=(h,k)=>'rgb('+_hx(h).map(v=>Math.max(0,Math.min(255,v*k|0))).join(',')+')';
const WALL_BASE='#9a9080',WALL_CAP='#b3ab9a';
function townWall(B,px,py,tx,ty,grid,Rw,C){
  const isW=(x,y)=>y<0||x<0||y>=Rw||x>=C||grid[y][x]==='#';                              // นอกแผนที่นับเป็นกำแพง
  const isFace=(x,y)=>y>=0&&y<Rw&&x>=0&&x<C&&grid[y][x]==='#'&&y+1<Rw&&grid[y+1][x]!=='#';  // แถวที่หันหน้าเข้าหาพื้น = ผนังอิฐ
  if(isFace(tx,ty)){
    B.fillStyle=_tint(WALL_BASE,.4);B.fillRect(px,py,16,16);                              // รอยปูน
    for(let r=0;r<4;r++){const gy=ty*4+r,off=(gy&1)*4,y=py+r*4;                          // อิฐ 4 ชั้น สลับแถวต่อเนื่องข้ามช่อง
      for(let k=-1;k<3;k++){const x0=px+off+k*8,xa=Math.max(x0,px),xb=Math.min(x0+8,px+16);if(xb<=xa)continue;
        const v=hash(tx*2+k,gy),w=xb-xa-(xb===x0+8?1:0);if(w<=0)continue;
        B.fillStyle=_tint(WALL_BASE,.95+v*.3);B.fillRect(xa,y,w,3);
        B.fillStyle='rgba(255,255,255,.14)';B.fillRect(xa,y,w,1);
        if(v>.82){B.fillStyle='rgba(0,0,0,.22)';B.fillRect(xa+1,y+1,Math.min(2,w-1),1);}}}
    const gr=B.createLinearGradient(0,py,0,py+6);gr.addColorStop(0,'rgba(0,0,0,.24)');gr.addColorStop(1,'rgba(0,0,0,0)');B.fillStyle=gr;B.fillRect(px,py,16,6);   // เงาใต้ขอบกำแพง
    B.fillStyle='rgba(0,0,0,.16)';B.fillRect(px,py+13,16,3);                              // เงาโคนกำแพง
    if(hash(tx,ty+11)>.5)for(let i=0;i<4;i++){B.fillStyle='rgba(88,134,58,.75)';B.fillRect(px+(hash(tx+i,ty+5)*14|0),py+12+(hash(ty+i,tx+3)*3|0),2,1+(i&1));}   // มอสที่โคน
  }else{
    B.fillStyle=_tint(WALL_CAP,.62);B.fillRect(px,py,16,16);                              // รอยต่อแผ่นหิน
    for(let r=0;r<2;r++){const gy=ty*2+r,off=(gy&1)*8,y=py+r*8;
      for(let k=-1;k<2;k++){const x0=px+off+k*16,xa=Math.max(x0,px),xb=Math.min(x0+16,px+16);if(xb<=xa)continue;
        const w=xb-xa-(xb===x0+16?1:0);if(w<=0)continue;
        B.fillStyle=_tint(WALL_CAP,.92+hash(tx+k,gy)*.16);B.fillRect(xa,y,w,7);}}
    if(!isW(tx,ty-1)){B.fillStyle=_tint(WALL_CAP,1.22);B.fillRect(px,py,16,2);}           // ขอบบนรับแสง
    if(isFace(tx,ty+1)){B.fillStyle=_tint(WALL_CAP,1.18);B.fillRect(px,py+12,16,2);B.fillStyle=_tint(WALL_CAP,.5);B.fillRect(px,py+14,16,2);}   // บัวกำแพงเหนือผนังอิฐ
    if(!isW(tx+1,ty)){B.fillStyle=_tint(WALL_CAP,.55);B.fillRect(px+13,py,3,16);}         // ด้านข้างกำแพง (ช่องประตู)
    if(!isW(tx-1,ty)){B.fillStyle=_tint(WALL_CAP,.78);B.fillRect(px,py,2,16);}
  }
}
function buildBg(){
  const grid=Z.grid,C=Z.cols,Rw=Z.rows;bgC.width=Math.max(W,C*16)*RES;bgC.height=Math.max(H,Rw*16)*RES;B.setTransform(RES,0,0,RES,0,0);B.fillStyle='#0d0808';B.fillRect(0,0,bgC.width,bgC.height);
  if(Z.id==='overworld'&&typeof OW!=='undefined'){OW.buildBg(B);return;}
  for(let ty=0;ty<Rw;ty++)for(let tx=0;tx<C;tx++){
    const ch=grid[ty][tx],px=tx*16,py=ty*16,bi=BIOME[Z.biomeAt(tx,ty)],h=hash(tx+(Z.floor||0)*7,ty);
    if(ch==='.'||ch==='R'||ch==='L'||ch===':'||ch==='P'){
      if(Z.interior){
        if(ch===':'){const cc=Z.carpet||'#8e2c26';B.fillStyle=cc;B.fillRect(px,py,16,16);
          const L=grid[ty][tx-1]!==':',Rt=grid[ty][tx+1]!==':',U=grid[ty-1][tx]!==':',Dn=grid[ty+1][tx]!==':';
          B.fillStyle='#e2be64';if(L)B.fillRect(px,py,2,16);if(Rt)B.fillRect(px+14,py,2,16);if(U)B.fillRect(px,py,16,2);if(Dn)B.fillRect(px,py+14,16,2);
          B.fillStyle='rgba(255,235,190,.09)';if((tx+ty)&1)B.fillRect(px+3,py+3,10,10);B.fillStyle='rgba(255,215,120,.14)';if(tx>=13&&tx<=16&&ty>=6&&ty<=8)B.fillRect(px+5,py+5,6,6);}
        else{B.fillStyle='#785032';B.fillRect(px,py,16,16);for(let r=0;r<4;r++){B.fillStyle=(r+tx)&1?'#845a38':'#6e482c';B.fillRect(px,py+r*4,16,3.5);B.fillStyle='rgba(28,14,4,.35)';B.fillRect(px,py+r*4+3.2,16,.8);}B.fillStyle='rgba(28,14,4,.22)';B.fillRect(px+((ty&1)*8),py,1,16);}
      }else{
      const bn=Z.biomeAt(tx,ty);if(!AS.tile(B,ch===':'&&bi.road?'road':bn,px,py)){   // มีภาพพื้นผิวจาก AI → ใช้ภาพ
      HD.floor(B,px,py,tx,ty,bn,ch===':'&&bi.road?bi.road:bi.floor,ch===':'&&!!bi.road);}}
      if(ty>0&&'^T#'.includes(grid[ty-1][tx])){const gr=B.createLinearGradient(0,py,0,py+8);gr.addColorStop(0,'rgba(0,0,0,.6)');gr.addColorStop(1,'rgba(0,0,0,0)');B.fillStyle=gr;B.fillRect(px,py,16,8);}
      if(tx>0&&grid[ty][tx-1]==='#'){B.fillStyle='rgba(0,0,0,.3)';B.fillRect(px,py,4,16);}
      if(ch==='P'){const ty2=(Z.puddles||{})[tx+','+ty]||'poison',PC={poison:['#2a8a3a','#4ad86a'],burn:['#a8380e','#ff7a2a'],mana:['#1a4a9a','#4a9aff'],power:['#9a7a0a','#ffd23a']}[ty2];
        B.fillStyle=PC[0];B.beginPath();B.ellipse(px+8,py+9,7,5,0,0,7);B.fill();B.fillStyle=PC[1];B.beginPath();B.ellipse(px+7,py+8,5,3,0,0,7);B.fill();B.fillStyle='rgba(255,255,255,.5)';B.fillRect(px+5,py+6,2,1);}
      if(ch==='L'){B.fillStyle='#c4380e';B.fillRect(px,py,16,16);B.fillStyle='#ff7a1a';B.fillRect(px+2,py+3,12,10);B.fillStyle='#ffd04a';
        B.fillRect(px+3+(h*6|0),py+5,4,2);B.fillRect(px+8,py+9+(h*2|0),5,2);B.fillStyle='rgba(0,0,0,.35)';B.fillRect(px,py,16,2);}
      if(ch==='R'){for(let i=0;i<7;i++){const rx=px+2+hash(px+i,py)*12,ry=py+2+hash(py+i,px)*12,r=3+hash(i,px+py)*3;
        B.fillStyle='#4b4038';B.beginPath();B.arc(rx,ry,r,0,7);B.fill();B.fillStyle='#7a6a5c';B.beginPath();B.arc(rx-1,ry-1,r*.5,0,7);B.fill();}}
    }else if(ch==='#'&&Z.interior){
      if(ty>=1&&ty<=2&&tx>=7&&tx<=22){
        B.fillStyle=ty===1?'#b8a68a':'#c6b496';B.fillRect(px,py,16,16);
        if(ty===2){B.fillStyle='#5c3a22';B.fillRect(px,py+9,16,7);B.fillStyle='#3f2614';B.fillRect(px,py+8,16,2);
          if(tx%3===0){B.fillStyle='#3a2212';B.fillRect(px+3,py+1,10,6);B.fillStyle='#ffdf9a';B.fillRect(px+4,py+2,8,4);B.fillStyle='#5c3a22';B.fillRect(px+7.5,py+2,1,4);}}
        else{B.fillStyle='#4a2d18';B.fillRect(px,py+13,16,3);B.fillStyle='#382010';B.fillRect(px,py,16,2);}
        if(tx%4===3){B.fillStyle='#4a2c18';B.fillRect(px+6,py,4,16);}
      }else{B.fillStyle='#140e09';B.fillRect(px,py,16,16);
        if(ty>=2&&ty<=13&&(tx===6||tx===23)){B.fillStyle='#4a2d18';B.fillRect(tx===6?px+11:px,py,5,16);B.fillStyle='#6c4424';B.fillRect(tx===6?px+11:px+4,py,1,16);}
        if(ty===14&&tx>=7&&tx<=22&&tx!==14&&tx!==15){B.fillStyle='#3e2514';B.fillRect(px,py,16,4);}}
    }else if(ch==='#'&&Z.biomeAt(tx,ty)==='town'){townWall(B,px,py,tx,ty,grid,Rw,C);   // กำแพงเมือง: ใช้ลายอิฐใหม่ (ไม่ใช้ภาพ wall_town)
    }else if(ch==='#'){if(!AS.tile(B,'wall_'+Z.biomeAt(tx,ty),px,py)){B.fillStyle=bi.top;B.fillRect(px,py,16,16);for(let i=0;i<4;i++){B.fillStyle='rgba(255,255,255,.05)';B.fillRect(px+(hash(tx+i,ty)*14|0),py+(hash(ty+i,tx)*14|0),2,1);}}
      if(ty>2&&ty<Rw-1&&grid[ty+1]&&grid[ty+1][tx]!=='#'){B.fillStyle=bi.face[1];B.fillRect(px,py+12,16,4);}}
    else if(ch==='W'||ch==='B'){const v=(h-.5)*14;if(!AS.tile(B,'water',px,py)){HD.water(B,px,py,tx,ty);}
      if(ty>0&&grid[ty-1][tx]!=='W'&&grid[ty-1][tx]!=='B'){B.fillStyle='rgba(0,0,0,.28)';B.fillRect(px,py,16,3);}
      if(ch==='B'){B.fillStyle='#7a5530';B.fillRect(px,py,16,16);for(let i=0;i<4;i++){B.fillStyle=i%2?'#8a6238':'#6a4826';B.fillRect(px,py+i*4,16,4);B.fillStyle='rgba(0,0,0,.35)';B.fillRect(px,py+i*4+3,16,1);}
        B.fillStyle='#4a3018';B.fillRect(px,py,16,2);B.fillRect(px,py+14,16,2);B.fillStyle='rgba(255,230,170,.18)';B.fillRect(px,py+2,16,1);}}
    else HD.face(B,px,py,tx,ty,bi);
  }
  if(Z.id==='cave')for(const sx of [6*16+1,14*16+1]){const sy=2*16+1;B.fillStyle='#4a2e1a';B.fillRect(sx,sy,30,15);B.fillStyle='#2a1a10';B.fillRect(sx+2,sy+2,26,11);
    B.fillStyle='#6b4428';B.fillRect(sx,sy+7,30,1);B.fillRect(sx,sy+14,30,1);for(let i=0;i<5;i++){B.fillStyle=i%2?'#e3b448':'#c9473a';B.fillRect(sx+3+i*5,sy+3,4,4);B.fillRect(sx+3+i*5,sy+10,4,4);}}
  HD.detail(B,bgC.width/RES,bgC.height/RES);   // ผิวสัมผัสละเอียดแบบ HD-2D
}

/* ----- exploration ----- */
const hitBox=(o,x,y)=>Math.abs(o.x-x)<o.hw+4&&y>o.y-6&&y-3<o.y;
const SOLID_PROP=new Set(['anvil','pot','cheese','barrel','chest','gate','house','fountain','stall','board','tree','cavegate','icegate','bossdoor','stonegate','duelpost','towergate','counter','shelf','table','cauldron','rack','puzzle_clue','puzzle_rune','fireplace','furnace','chair','plant','pillar']);
function blocked(x,y,self,tilesOnly){
  for(const[px,py] of [[x-4,y-3],[x+4,y-3],[x-4,y],[x+4,y]]){const tx=Math.floor(px/16),ty=Math.floor(py/16);
    if(ty<0||ty>=Z.rows||tx<0||tx>=Z.cols)return true;if('#^TRLW'.includes(Z.grid[ty][tx]))return true;}
  if(tilesOnly)return false;
  for(const o of Z.props)if(SOLID_PROP.has(o.k)&&hitBox(o,x,y))return true;
  for(const o of Z.npcs)if(o!==self&&hitBox(o,x,y))return true;
  return false;
}
const LABEL={ow_spire:'🔮 เข้าหอคอยคริสตัลจอมเวท (5 ชั้น Lv.50–95)',ow_spire_exit:'🚪 ออกจากหอคอย → กลับแผนที่โลก',puzzle_clue:'📜 อ่านศิลาคำใบ้ปริศนาคริสตัล',puzzle_rune:'🔮 จุดเสาผลึกปริศนา',spire_stairs:'✨ บันไดเวทขึ้นชั้นถัดไป (ปราบบอส + แก้ปริศนา)',spire_clear:'👑 แท่นพิชิตยอดหอคอย (รับรางวัล & ออก)',in_smithy:'🔨 เข้าโรงตีเหล็กโบโร',in_store:'🪙 เข้าร้านค้ามาร์คัส',in_alchemy:'🧪 เข้าสำนักเล่นแร่แปรธาตุ',in_guild:'⚔️ เข้ากิลด์นักผจญภัยคอลลาวาร์รี',exit_interior:'🚪 ออกจากอาคาร → กลับสู่เมือง',reitem:'🔮 แปรผลึกไอเทม (เซเรน่า)',guildmaster:'📜 คุยกับหัวหน้ากิลด์ / รับเควสต์',citygate:'🚪 ประตูเมือง — ออกเดินทางสู่ดันเจี้ยน',southgate:'🗺️ ประตูใต้ — ออกจากเมืองสู่แผนที่โลก (Overworld)',cityexit:'🗺️ ประตูเมืองหลวง — ออกสู่แผนที่โลก',ow_town:'🏰 เข้าเมือง Collawarrie',ow_city:'🏛️ เข้า City — เมืองหลวงออเรีย',ow_home:'🏠 พักผ่อนที่บ้านของเรา (ME)',ow_port:'⚓ ท่าเรือเกาะใต้',ow_outpost:'⛺ พักแรมฟื้นพลัง (จุดพักเกาะกลาง)',towerdungeon:'ลงดันเจี้ยน: หอคอยนักแปรธาตุ (Lv.14-16)',alchemy:'นักเล่นแร่แปรธาตุ (รีค่าอุปกรณ์)',store:'เข้าร้านค้า (ซื้อ / ขาย)',smithy:'ซื้อขายอาวุธ / เกราะ (โบโร)',duel:'⚔️ ท้าดวล bbqy legendary',stonedungeon:'ลงดันเจี้ยน: ถ้ำหินโกเลม',bossroom:'⚔️ ประตูบอส (เข้าแล้วออกไม่ได้)',icedungeon:'ลงดันเจี้ยน: ถ้ำน้ำแข็ง',folk:'ทักทาย',ground:'เก็บ',fountain:'ดื่มน้ำพุ (ฟื้นเต็ม)',shop:'ซื้อ / ขายสินค้า',board:'กระดานเควสต์กิลด์',dungeon:'ลงดันเจี้ยน: ถ้ำชีส',town:'ออกจากดันเจียน → เมือง',arena:'ลานประลอง (สู้ 2 คน)',bloodstain:'เก็บคราบเลือด (ทอง/EXP)',npc:'คุย',craft:'ตีเหล็ก / ตีบวก',pot:'กินซุป (ฟื้นเต็ม)',rubble:'ทุบหิน',chest:'เปิดหีบ',gate:'เข้าเหมืองลาวา (Lv.8+)',stairs:'ลงชั้นต่อไป',portal:'กลับถ้ำ'};
let NEAR=null;
function findNear(){
  let best=null,bd=22;const c=(o,type)=>{const d=Math.hypot(o.x-P.x,(o.y-P.y)*1.2);if(d<bd){bd=d;best={o,type};}};
  for(const o of Z.props)if(o.inter&&!o.opened)c(o,o.inter);for(const o of Z.npcs)c(o,'npc');for(const o of Z.folk||[])c(o,'folk');for(const o of Z.items)if(!o.taken)c(o,'item');
  for(const o of Z.ground||[])if(!o.picked&&o.owner==='P1')c(o,'ground');   // only the owner can interact
  const bs=G.bloodstain;if(bs&&bs.zone===Z.id)c(bs,'bloodstain');
  if(Z.id==='cave'&&!Z.rubbleOpen&&G.q.main1.step>=1)c({x:19*16+8,y:9*16+2},'rubble');return best;
}
function grantChest(o){
  const ct=o.content,got=[];
  if(ct.base){const it=Inv.addItem(newItem(ct.base,ct.rar,Z.levelAt(Math.floor(o.x/16))));got.push(`<span style="color:${RARC[it.rar]}">${bIco(it.base,14)} ${itemName(it)}</span>`);}
  for(const k of [ct.mat,ct.mat2])if(k){Inv.add(k,1);got.push(mIco(k,14)+' '+MATS[k].n);}
  if(ct.loot){
    const out=Loot.roll(ct.loot,Z.levelAt(0),false);
    if(ct.skill&&rand()<ct.skill){const k=pick(CHEST_SKILLS);out.mats[k]=(out.mats[k]||0)+1;}
    out.items.length||out.items.push(newItem(pick(BASE_BY_TYPE(pick(ALLTYPES))),'rare',Z.levelAt(0)));
    Loot.grant(out);
    for(const it of out.items)got.push(`<span style="color:${RARC[it.rar]}">${bIco(it.base,14)} ${itemName(it)}</span>`);
    for(const k in out.mats){const q=out.mats[k];got.push(mIco(k,14)+' '+MATS[k].n+(q>1?' ×'+q:''));}
    if(out.gold)got.push(`${ico('coin',14)} ${out.gold} ทอง`);
  }
  toast(`${o.hidden?'🗝️ สมบัติลับ! ':'เปิดหีบ! '}ได้รับ ${got.join(', ')}`,3200);
}
function interact(n){
  const o=n.o;
  if(o&&o.locked&&o.need){toast(o.need);return;}
  if(n.type==='item'){o.taken=true;Inv.add(o.it);SFX.pick();toast(`ได้รับ ${mIco(o.it,14)} ${MATS[o.it].n}`);
    if(o.it==='pan'){Quest.activate('pan');Quest.advance('pan',1);}
    for(let i=0;i<8;i++)EP.push({x:o.x,y:o.y-4,vx:rnd(-1,1),vy:rnd(-1.5,-.3),l:30,c:'#fff3b0'});}
  else if(n.type==='chest'){o.opened=true;SFX.craft();grantChest(o);for(let i=0;i<16;i++)EP.push({x:o.x,y:o.y-8,vx:rnd(-1.2,1.2),vy:rnd(-2,-.5),l:40,c:'#ffe27a'});}
  else if(n.type==='npc'){if(o.id==='reitem')UI.open('reitem');else talk(o.id);}
  else if(n.type==='duel'){const f=Z.foes.find(x=>x.challenge&&x.alive);if(!f){toast('bbqy legendary พ่ายแพ้แล้ว');return;}
    say([['bbqy legendary','ข้า bbqy นักดวลไพ่ที่แข็งแกร่งที่สุดในโลก!'],['bbqy legendary','ข้าไม่สนหินเอเธอร์หรือประตูรอยแยก — ถ้าเจ้าอยากเป็นผู้กล้า จงเอาดาบ Chaos Blade ของข้าไปให้ได้ก่อน'],['','กด E อีกครั้งเพื่อท้าดวล']],()=>{startBattle(f);});}
  else if(n.type==='folk'){const sv=o.face;o.face=P.x<o.x?-1:1;o.wait=240;o.tx=null;say([[o.name,o.line||pick(FOLK_LINES)]]);}
  else if(n.type==='in_smithy'||n.type==='in_store'||n.type==='in_alchemy'||n.type==='in_guild'){enterInterior(n.type);}
  else if(n.type==='exit_interior'){const rz=Z.retZone||TOWN,rp=Z.retPos||TOWN.spawn;loadZone(rz,rp);toast('🏛️ กลับสู่เขตเมือง');}
  else if(n.type==='reitem'){UI.open('reitem');}
  else if(n.type==='guildmaster'){talk('guildmaster');}
  else if(n.type==='ow_spire_exit'){if(typeof OW!=='undefined')OW.enter('spire');else loadZone(TOWN,TOWN.spawn);}
  else if(n.type==='puzzle_clue'&&Z.puzzle){say([['📜 ศิลาจารึกปริศนาหอคอย',Z.puzzle.clue],['คำแนะนำ','ไปที่ห้องบอส (ห้อง 3) แล้วจุดเสาผลึก 3 สีตามลำดับที่ระบุในคำใบ้ให้ถูกต้อง']]);}
  else if(n.type==='puzzle_rune'&&Z.puzzle){
    const pz=Z.puzzle,ri=o.ri;
    if(pz.solved){toast('✨ ปริศนาคริสตัลชั้นนี้คลี่คลายแล้ว!',2000);return;}
    if(pz.lit.includes(ri)){toast(`${o.rn} สว่างอยู่แล้ว`,1500);return;}
    const exp=pz.seq[pz.lit.length];
    if(ri===exp){
      pz.lit.push(ri);SFX.pick();
      for(let i=0;i<14;i++)EP.push({x:o.x,y:o.y-12,vx:rnd(-1.4,1.4),vy:rnd(-2,-.4),l:28,c:o.rc});
      if(pz.lit.length>=pz.seq.length){pz.solved=true;SFX.level();toast('✨ แก้ปริศนาคริสตัลสำเร็จ! (ปราบบอสประจำชั้นด้วยเพื่อขึ้นชั้นถัดไป)',3400);}
      else toast(`🔮 จุด ${o.rn} ถูกต้อง (${pz.lit.length}/${pz.seq.length})`,2000);
    }else{
      pz.lit=[];SFX.ui&&SFX.ui('error');G.shake=4;
      toast(`❌ ลำดับผิด! เสาผลึกดับลงแล้ว (${pz.clue})`,3400);
    }
  }
  else if(n.type==='spire_stairs'||n.type==='spire_clear'){
    const bossAlive=Z.foes.some(e=>e.alive&&FOES[e.kind]&&FOES[e.kind].boss);
    if(bossAlive){toast('🔒 ทางขึ้นชั้นถัดไปถูกผนึก — ต้องปราบบอสประจำชั้นในห้อง 3 ก่อน!',3000);SFX.ui&&SFX.ui('error');return;}
    if(Z.puzzle&&!Z.puzzle.solved){toast('🔮 ผนึกปริศนายังไม่คลาย — จุดเสาผลึก 3 สีในห้องบอสตามลำดับก่อน!',3200);SFX.ui&&SFX.ui('error');return;}
    if(n.type==='spire_clear'){
      const first=!G.flags.spireCleared;G.flags.spireCleared=1;G.gold+=first?2000:500;Inv.add('divine',first?2:1);Inv.add('evostone',first?2:1);SFX.level();
      say([['👑 อาร์คเมจแห่งหอคอยคริสตัล','ยอดเยี่ยมมาก... เจ้าพิชิตหอคอยคริสตัลครบทั้ง 5 ชั้นและผ่านทุกบททดสอบแล้ว!']],[].length?undefined:()=>{toast('🏆 พิชิตหอคอยคริสตัลครบ 5 ชั้น! ได้รับรางวัลใหญ่ + กลับสู่แผนที่โลก',4200);if(typeof OW!=='undefined')OW.enter('spire');});
      return;
    }
    enterSpire((Z.spireFloor||1)+1);
  }
  else if(n.type==='craft')UI.open('craft');
  else if(n.type==='pot'){const S=StatSync.get();G.hp=S.maxHP;G.mp=S.maxMP;say([['หม้อซุปชีส','ซุปชีสร้อน ๆ หอมกรุ่น... HP และ MP ฟื้นเต็ม!']]);}
  else if(n.type==='rubble'){
    if(!G.eq.weapon)say([['','หินถล่มขวางทางอยู่ ต้องถืออาวุธก่อนถึงจะทุบเปิดได้']]);
    else{Z.rubbleOpen=true;Z.grid[8][19]='.';Z.grid[9][19]='.';buildBg();G.shake=8;SFX.smash();Quest.advance('main1',3);
      for(let i=0;i<30;i++)EP.push({x:19*16+8+rnd(-6,6),y:9*16+rnd(-14,6),vx:rnd(-2,2),vy:rnd(-2.5,-.5),l:40,c:'#7a6a5c',grav:1});}
  }
  else if(n.type==='gate'){
    if(!hasLavaKey()){toast('🔒 ประตูเหมืองลาวาถูกล็อก — ต้องชนะคาเงะ นักดาบเงา แล้วเก็บกุญแจที่เขาทำตก',3200);SFX.ui&&SFX.ui('error');return;}
    if(o.confirm&&G.t-o.confirm<900){o.confirm=0;enterDungeon(1);return;}
    say([['','ประตูเหมืองลาวาร้าง — ศัตรูเลเวล 11-13 อันตรายมาก! ห้องในเหมืองประกอบแบบสุ่มทุกครั้งที่เข้า'],['','กด E ที่ประตูอีกครั้งภายใน 15 วินาทีเพื่อเข้า (ตอนนี้เลเวล '+G.level+')']],()=>{o.confirm=G.t;});
  }
  else if(n.type==='stairs'){if(o.locked){toast('ประตูถูกผนึก');return;}if(Z.floor===2){const th=Z.theme||'lava',bk=THEME_BOSS[th];if(bk==='golem'&&!G.flags.kageDown){toast('🔒 ผนึกหิน — ต้องชนะคาเงะ นักดาบเงา ในถ้ำคริสตัลก่อน');return;}bossConfirm(o,bk,()=>enterDungeon(3,th));return;}enterDungeon(Z.floor+1,Z.theme||'lava');}
  else if(n.type==='bossroom'){if(o.boss==='golem'&&!G.flags.kageDown){toast('คาเงะ นักดาบเงา ขวางทางอยู่ — ต้องชนะเขาก่อน');return;}bossConfirm(o,o.boss,()=>enterBossRoom(o.boss));}
  else if(n.type==='ground'){const r=LootManager.pickup(Z,o,'P1');
    if(r.ok){SFX.pick();toast(`ได้รับ <span style="color:${RARC[o.drop.rar]}">${LootManager.iconHtml(o.drop)} ${LootManager.name(o.drop)}</span>`);for(let i=0;i<8;i++)EP.push({x:o.x,y:o.y-4,vx:rnd(-1,1),vy:rnd(-1.5,-.3),l:24,c:RARC[o.drop.rar]});}
    else if(r.reason==='full'){SFX.fail();toast('🎒 กระเป๋าเต็ม — ของยังอยู่บนพื้น เก็บได้ภายหลัง');}
    else if(r.reason==='owner')toast('ของชิ้นนี้เป็นของผู้เล่นอื่น');else if(r.reason==='expired')toast('ของหายไปแล้ว');}
  else if(n.type==='fountain'){const S=StatSync.get();G.hp=S.maxHP;G.mp=S.maxMP;SFX.level();let extra='';
    if(Diff.cur().restRespawn&&CAVE){let k=0;for(const e of CAVE.foes)if(!e.alive&&!FOES[e.kind].boss&&!FOES[e.kind].miniboss){e.alive=true;e.x=e.home.x;e.y=e.home.y;e.respawn=0;e.cool=120;k++;}if(k)extra=` · 🔥 ศัตรูในถ้ำฟื้นคืน ${k} ตัว`;}
    toast('💧 น้ำพุศักดิ์สิทธิ์ — HP และ MP ฟื้นเต็ม'+extra,3000);}
  else if(n.type==='arena'){UI.open('arena');}
  else if(n.type==='bloodstain'){const r=Diff.recover();if(r){SFX.level();toast(`🩸 เก็บคราบเลือดคืน — ทอง +${r.gold} · EXP +${r.xp}`,3000);if(r.ups)UI.levelUp(r.ups);UI.hud();Save.save();}}
  else if(n.type==='shop'||n.type==='store')UI.open('shop');
  else if(n.type==='smithy')UI.open('smithy');
  else if(n.type==='alchemy'){UI.alSel=[];UI.alRes=null;UI.open('alchemy');}
  else if(n.type==='board')UI.open('quests');
  else if(typeof OW!=='undefined'&&OW.interact(n.type))return;
  else if(n.type==='citygate'){UI.open('citygate');}
  else if(n.type==='stonedungeon'||n.type==='lavadungeon'||n.type==='icedungeon'||n.type==='towerdungeon'){
    if(!hasLavaKey()){toast('🔒 ต้องมีกุญแจลาวาจากคาเงะในถ้ำชีสก่อน');return;}
    const th=n.type==='stonedungeon'?'stone':n.type==='lavadungeon'?'lava':n.type==='icedungeon'?'ice':'tower';
    enterDungeon(1,th);Save.save();
  }
  else if(n.type==='dungeon'){loadZone(CAVE,T(3,11));G.shake=3;toast('⬇️ ลงสู่ถ้ำชีส (ดันเจี้ยน Lv.1-5)');Save.save();}
  else if(n.type==='town'){loadZone(TOWN,TOWN.gate);toast('⬆️ กลับเมือง Collawarrie (เขตปลอดภัย)');Save.save();}
  else if(n.type==='portal'){if(o.locked){toast(o.need||'ต้องปราบราชันย์ลาวาก่อน');return;}loadZone(TOWN,TOWN.gate);toast('กลับสู่เมือง Collawarrie');Save.save();}
}
const THEME_BOSS={lava:'lavaking',ice:'seraph',stone:'golem',tower:'homunculus'};
function enterDungeon(floor,theme){
  const th=theme||'lava';
  if(th==='lava'){Quest.activate('lava');if(floor===1)Quest.advance('lava',1);if(floor===3)Quest.advance('lava',2);}
  if(floor>=3){enterBossRoom(THEME_BOSS[th]);return;}
  const zid=th+floor;loadZone(makeDungeon(floor,th));G.shake=4;toast(`${ZONE_INFO[zid].n} — ศัตรู Lv.${enemyLevel(ZONE_INFO[zid].lv,G.level)} โดยประมาณ`,3000);
}
const ENC={rad:15};
// กุญแจลงเหมืองลาวา: ได้จากคาเงะเท่านั้น (เซฟเก่าที่ชนะคาเงะไปแล้วเข้าได้เลย)
const hasLavaKey=()=>Inv.has('key_lava')||!!G.flags.kageDown&&!G.flags.keyEra||!!G.flags.lavaKeyUsed;
function encounter(e){Ency.see(e.kind,foeLevel(FOES[e.kind],Z.levelAt(Math.floor(e.x/16))));e.x=P.x+(P.face||1)*20;e.y=P.y;G.encBang=40;SFX.ui&&SFX.ui('error');startBattle(e);}
function checkTraps(){const tx=Math.floor(P.x/16),ty=Math.floor((P.y-2)/16),S=StatSync.get();
  for(const t of Z.traps){if(t.cd>0)t.cd--;if(t.tx!==tx||t.ty!==ty||t.cd>0)continue;
    if(t.type==='spike'){t.seen=1;t.cd=TRAP.spikeCD;const dm=Math.round(S.maxHP*TRAP.spikeDmg);G.hp=Math.max(1,G.hp-dm);G.shake=5;SFX.hit(false);EP.push({x:P.x,y:P.y-14,vx:0,vy:-.4,l:40,c:'#ff6a5a'});toast(`🗡️ กับดักหนาม! -${dm} HP`,1800);return false;}
    if(t.type==='alarm'){t.seen=1;t.cd=99999;const pool=Z.foes.filter(f=>f.alive&&f.hidden);toast('🔔 เหยียบแผ่นสัญญาณ — ศัตรูได้ยินเสียง!',2200);if(pool.length){encounter(pick(pool));return true;}return false;}
    if(t.type==='pit'){t.seen=1;t.cd=99999;const dm=Math.round(S.maxHP*TRAP.pitDmg);G.hp=Math.max(1,G.hp-dm);G.shake=8;SFX.hit(true);
      if(Z.floor===1&&!Z.bossRoom){const th=Z.theme||'lava';enterDungeon(2,th);setTimeout(()=>toast(`🕳️ ตกหลุม! ร่วงลงมาชั้น 2 (-${dm} HP)`,3000),60);}
      else{loadZone(Z);setTimeout(()=>toast(`🕳️ ตกหลุมลึก! ปีนกลับขึ้นมาที่จุดเริ่ม (-${dm} HP)`,3000),60);}return true;}}
  return false;}
// วาดกับดัก: หลุมที่ยังไม่ตกมีรอยร้าวจาง ๆ · หลุม/หนาม/แผ่นสัญญาณที่เจอแล้วแสดงชัด
function drawTrap(t){const x=t.tx*16+8,y=t.ty*16+9;g.save();
  if(t.type==='pit'){if(t.seen){g.fillStyle='#050304';g.beginPath();g.ellipse(x,y,7.5,5,0,0,7);g.fill();g.strokeStyle='rgba(120,100,80,.8)';g.lineWidth=1;g.beginPath();g.ellipse(x,y-.5,7.8,5.2,0,Math.PI,0);g.stroke();}
    else{g.strokeStyle='rgba(20,14,10,.42)';g.lineWidth=.7;g.beginPath();g.moveTo(x-6,y-1);g.lineTo(x-2,y+1);g.lineTo(x+1,y-2);g.lineTo(x+6,y+1);g.moveTo(x-2,y+1);g.lineTo(x-3,y+4);g.moveTo(x+1,y-2);g.lineTo(x+2,y-4);g.stroke();}}
  else if(t.seen&&t.type==='spike'){g.fillStyle='rgba(30,26,30,.6)';g.fillRect(x-7,y-4,14,8);for(let i=0;i<4;i++)for(let j=0;j<2;j++){const sx=x-5+i*3.4,sy=y-1+j*3.5;g.fillStyle='#b8bcc8';g.beginPath();g.moveTo(sx-1.2,sy);g.lineTo(sx,sy-3.5);g.lineTo(sx+1.2,sy);g.fill();g.fillStyle='#5a5e6a';g.fillRect(sx,sy-3,1,3);}}
  else if(t.seen&&t.type==='alarm'){g.fillStyle='#5a4a3a';g.fillRect(x-6,y-3,12,6);g.fillStyle='#c8a050';g.fillRect(x-4,y-2,8,4);}
  g.restore();}
const FOLK_LINES=[
  'เมื่อแสงเอเธอร์สั่น ประตูใต้รอยแยกก็แง้มออก... ทุกครั้งที่แผ่นดินสะเทือน มอนสเตอร์ก็จะหลุดออกมาอีก',
  'ตำนานว่าผู้ปิดผนึกยุคแรกใช้หินเอเธอร์ทั้งแปดค้ำโลกไว้ แต่ตอนนี้หินถูกพรากไปจากที่เดิมแล้ว',
  'ผู้คนหนีออกจากคอลลาวาร์รีกันเกือบหมด มีเพียงคนอย่างเจ้าที่ยังยืนหยัดอยู่ตรงนี้ — พิสูจน์ให้โลกเห็นเถอะว่าคนธรรมดาก็เป็นผู้กล้าได้',
  'ในถ้ำชีสและคริสตัลมีหินก้อนแรก "แสงแห่งรอยแยก" แต่ได้ยินว่านักดาบเงาคาเงะยึดทางเข้าไว้ก่อนแล้ว',
  'หินไม่ได้ถูกขโมยไปเปล่า ๆ หรอก... มีคนบอกว่าหินเอเธอร์กำลังถูก "เรียก" จากปลายทางทั้งแปด',
  'ระวังสาวกเงาให้ดี พวกมันเชื่อว่าประตูควรเปิดออก เพื่อให้ความว่างเปล่าที่หิวโหยสร้างโลกขึ้นมาใหม่',
  'ไม่ได้มีแค่เจ้าที่ตามหาหิน — ทั้งนักล่าค่าหัว นักแปรธาตุ และยอดนักดวลต่างก็มุ่งหน้าไปที่รอยแยกเช่นกัน',
  'ภูเขาไฟทางเกาะกลางสั่นไหวตลอดคืน เสียงลือว่าหิน "เปลวแก่น" กำลังปลุกราชันย์ลาวาขึ้นมา',
  'ทางหุบผาศิลาตะวันตกโกเลมหินตื่นขึ้นมาแล้ว ว่ากันว่าหิน "หัวใจศิลา" ฝังอยู่ในแกนกลางของมัน',
  'หอคอยนักแปรธาตุทางเหนือกำลังทดลองสร้างประตูรอยแยกจำลอง... แม้แต่นักปราชญ์ก็ยอมแลกทุกอย่างเพื่อหินเอเธอร์',
  'ทางวิหารน้ำแข็งเกาะเหนือมีเซราฟตาเดียวคอยเฝ้าอยู่ แสงของหินทำให้แม้แต่อดีตผู้ปิดผนึกยังจำศัตรูผิดพลาด',
  'เห็นนักดวลชุดดำตรงลานประลองไหม? นั่นแหละ bbqy ผู้ถือหิน "ไพ่ทมิฬ" — เขาไม่สนชะตาโลก สนแค่คนที่กล้าเรียกตัวเองว่าผู้กล้า',
  'โบโรยังคงตีเหล็กไม่หยุดเพื่อส่งดาบให้คนธรรมดาอย่างเจ้าได้ก้าวเดินต่อ',
  'น้ำพุกลางคอลลาวาร์รียังหลงเหลือละอองแสงเอเธอร์อยู่ ดื่มแล้วช่วยให้จิตใจสงบและฟื้นพลังได้เต็มเปี่ยม'
];
function makeFolk(z){
  const out=[];
  const C=(z?z.cols:TOWN_COLS)*16-40,R=(z?z.rows:TOWN_ROWS)*16-40,cnt=z&&z.id==='city'?8:12;
  for(let i=0,tries=0;i<cnt&&tries<400;tries++){const x=rnd(40,C),y=rnd(60,R);if(blocked(x,y)||Math.hypot(x-P.x,y-P.y)<40)continue;
    const prof=FOLK_PROFILES[i%FOLK_PROFILES.length];
    out.push({id:'folk'+i,name:prof.name,sex:prof.look.sex,x,y,face:1,hw:4,mv:0,wait:rand()*120|0,tx:null,ty:null,
      pal:{h:prof.look.hair,s:prof.look.skin,e:prof.look.eyec,c:prof.look.body,b:prof.look.trim,p:prof.look.pants,f:prof.look.boots}});i++;}
  return out;
}
function updFolk(){
  if(!Z.folk)return;
  for(const f of Z.folk){
    if(f.wait>0){f.wait--;f.mv=0;continue;}
    if(f.tx===null||f.tx===undefined){const nx=f.x+rnd(-90,90),ny=f.y+rnd(-60,60);if(nx<24||ny<40||nx>Z.cols*16-24||ny>Z.rows*16-24||blocked(nx,ny)){f.wait=20;continue;}f.tx=nx;f.ty=ny;}
    const dx=f.tx-f.x,dy=f.ty-f.y,d=Math.hypot(dx,dy);
    if(d<2){f.tx=null;f.wait=60+rand()*220|0;f.mv=0;continue;}
    const sp=.32,sx=dx/d*sp,sy=dy/d*sp;f.vx=sx;f.vy=sy;
    if(blocked(f.x+sx,f.y+sy)||Math.hypot(f.x+sx-P.x,f.y+sy-P.y)<8){f.tx=null;f.wait=30;f.mv=0;continue;}
    f.x+=sx;f.y+=sy;f.mv=1;if(Math.abs(sx)>.05)f.face=sx>0?1:-1;
  }
}
function updExplore(){
  StatSync.frame('P');   // นับเวลาบัฟ/ดีบัฟนอกการต่อสู้
  if(Z.puddles&&G.t%30===0){const k=Math.floor(P.x/16)+','+Math.floor((P.y-2)/16),t=Z.puddles[k];   // แอ่งน้ำยาในหอคอย
    if(t){const S=StatSync.get();if(t==='poison'){G.hp=Math.max(1,G.hp-Math.round(S.maxHP*.03));toast('🧪 แอ่งพิษ — HP ลดลง',900);}
      else if(t==='burn'){G.hp=Math.max(1,G.hp-Math.round(S.maxHP*.05));toast('🔥 แอ่งเพลิง — HP ลดลง',900);}
      else if(t==='mana'){G.mp=Math.min(S.maxMP,G.mp+Math.round(S.maxMP*.08));toast('💧 แอ่งมานา — ฟื้น MP',900);}
      else if(t==='power'&&!StatSync.hasMod('P','elixir')){StatSync.addMod('P',{id:'elixir',n:'ยาพลัง',kind:'buff',stat:'ap',op:'mul',v:1.15,ttl:1800});StatSync.addMod('P',{id:'elixir2',n:'ยาพลังเวท',kind:'buff',stat:'mpow',op:'mul',v:1.15,ttl:1800});toast('✨ แอ่งยาพลัง — พลังโจมตี +15% (30 วิ)',2000);}
      UI.hud&&UI.hud();}}
  updFolk();
  if(tap(KB.bag))return UI.open('bag');if(tap(KB.equip))return UI.open('equip');if(tap(KB.char))return UI.open('char');if(tap(KB.skills))return UI.open('skills');
  if(tap(KB.quests))return UI.open('quests');if(tap(KB.map))return UI.open('map');if(tap(KB.ency))return UI.open('ency');
  if(tap(KB.mini)){G.miniOff=!G.miniOff;toast(G.miniOff?'ซ่อนแผนที่เล็กแล้ว ('+kbName('mini')+' เพื่อแสดง)':'แสดงแผนที่เล็กแล้ว');}
  let dx=(down(...kb('right'))?1:0)-(down(...kb('left'))?1:0),dy=(down(...kb('down'))?1:0)-(down(...kb('up'))?1:0);
  if(P.castExit>0){
    P.castExit--;P.moving=false;dx=0;dy=0;
    if(G.t%3===0){const a=G.t*.25;EP.push({x:P.x+Math.cos(a)*10,y:P.y-2+Math.sin(a)*4,vx:0,vy:-.55,l:24,c:G.t%6===0?'#7af0ff':'#ffe27a'});}
    if(P.castExit<=0){loadZone(TOWN,TOWN.gate);toast('✨ วาร์ปกลับสู่เมือง Collawarrie แล้ว');SFX.level();Save.save();return;}
  }
  if(dx&&dy){dx*=.707;dy*=.707;}const S=StatSync.get(),sp=1.3*S.spd;P.moving=!!(dx||dy);if(dx)P.face=dx>0?1:-1;if(P.moving)P.dir4=Math.abs(dy)>Math.abs(dx)?(dy>0?'down':'up'):(dx>0?'right':'left');
  // ถ้าผู้เล่นซ้อนอยู่ในวัตถุ/NPC อยู่แล้ว (ติด) ให้เดินออกได้ — ชนแค่กำแพง/น้ำ จนกว่าจะหลุด
  const stuck=blocked(P.x,P.y);
  if(!blocked(P.x+dx*sp,P.y,null,stuck))P.x+=dx*sp;if(!blocked(P.x,P.y+dy*sp,null,stuck))P.y+=dy*sp;
  if(P.moving){P.anim+=.2;if(G.t%12===0)EP.push({x:P.x,y:P.y,vx:rnd(-.3,.3),vy:-.2,l:20,c:Equip.look().trail||'rgba(200,180,150,.6)'});}
  const reg=Z.regionAt(Math.floor(P.x/16));if(G.visited&&!G.visited[reg]){G.visited[reg]=1;toast(`📍 ${ZONE_INFO[reg].n} (โซน Lv.${ZONE_INFO[reg].lv})`);}
  // regen out of combat
  Mana.regen(G,S,false);if(G.t%60===0)G.hp=Math.min(S.maxHP,G.hp+Math.round(S.maxHP*.01));
  for(const e of Z.foes){
    if(!e.alive){if(e.respawnable&&e.respawn>0&&--e.respawn===0){e.alive=true;e.x=e.home.x;e.y=e.home.y;e.elite=rand()<ELITE.chance;e.cool=120;e.hidden=hideFoe(e)?1:0;}continue;}
    if(e.cool>0)e.cool--;const dist=Math.hypot(e.x-P.x,e.y-P.y),d=FOES[e.kind];
    if(e.hidden){if(e.cool<=0&&dist<ENC.rad){encounter(e);return;}continue;}   // ซ่อนอยู่: ไม่เดิน ไม่แสดง · เดินเข้าใกล้ = เข้าไฟต์
    if(d.kind==='mon'&&!d.boss){
      if(dist<64&&e.cool<=0){e.vx=(P.x-e.x)/dist*.75;e.vy=(P.y-e.y)/dist*.75;}
      else if(--e.t<=0){e.t=rint(40,120);const a=rand()*6.28;if(rand()<.35){e.vx=e.vy=0;}else{e.vx=Math.cos(a)*.45;e.vy=Math.sin(a)*.45;}}
      const nx=e.x+e.vx,ny=e.y+e.vy;
      if((!e.bound||nx<e.bound)&&!blocked(nx,e.y))e.x=nx;else e.vx*=-1;
      if(!blocked(e.x,ny))e.y=ny;else e.vy*=-1;if(e.vx)e.face=Math.sign(e.vx);
    }else e.face=P.x<e.x?-1:1;
    // บอสในห้องผนึกจะเดินเข้าหาผู้เล่นเอง (หลังช่วงเริ่มสั้น ๆ) จนชนแล้วเริ่มสู้
    if(Z.bossRoom&&e.kind===Z.bossRoom&&e.alive&&e.cool<=0&&dist>18){const sp=(d.spd||1)*1.1;
      const nx=e.x+(P.x-e.x)/dist*sp,ny=e.y+(P.y-e.y)/dist*sp;if(!blocked(nx,e.y))e.x=nx;if(!blocked(e.x,ny))e.y=ny;e.face=P.x<e.x?-1:1;e.walk=1;}
    const rad=d.boss?22:d.kind==='rig'?16:12;
    if(e.kind==='golem'&&Z.foes.some(f=>f.kind==='kage'&&f.alive))continue;
    if(e.challenge)continue;   // นักดวลรอให้ผู้เล่นมาท้าเอง
    if(e.cool<=0&&dist<rad){startBattle(e);return;}
  }
  if(Z.traps&&checkTraps())return;
  if(G.t%30===0)LootManager.cleanup(Z);   // event-style sweep, not per-item tick
  NEAR=findNear();
  if(Z.id==='town'&&G.mode==='explore'&&Math.abs(P.x-(36*16+16))<18&&P.y<3*16+6){P.y=3*16+14;UI.open('citygate');return;}   // เดินออกทางประตูเมืองบนขวา
  if(Z.id==='town'&&G.mode==='explore'&&Math.abs(P.x-(23*16+16))<18&&P.y>(TOWN_ROWS-2)*16-2){P.y=(TOWN_ROWS-2)*16-10;UI.open('southgate');return;}   // เดินออกทางประตูใต้ -> ทหารยามถามจะเดินทางไปไหน -> Overworld
  if(Z.id==='city'&&G.mode==='explore'&&Math.abs(P.x-(17*16+16))<18&&P.y<3*16+6){P.y=3*16+14;UI.open('citygate');return;}   // ประตูเหนือเมืองหลวง -> เข้าดันเจี้ยน
  if(Z.id==='city'&&G.mode==='explore'&&Math.abs(P.x-(17*16+16))<18&&P.y>(Z.rows-2)*16-2){P.y=(Z.rows-2)*16-10;UI.open('cityexit');return;}   // ออกจากเมืองหลวงกลับ Overworld
  if(tap(KB.interact,'Enter','PadA')&&NEAR)interact(NEAR);
}
function drawProp(o){
  if(Z.id==='overworld'&&typeof OW!=='undefined'&&OW.drawProp(o))return;
  if(AS.prop(g,o))return;   // มีภาพจาก AI → ใช้ภาพ
  if(HDP[o.k]){HDP[o.k](o);return;}   // ฉากประกอบรายละเอียดสูง (HD-2D)
  if(['house','fountain','stall','board','tree','lamp','citygate','southgate','cavegate','icegate','stonegate','towergate','duelpost','exitup','exitdoor','arena','counter','shelf','table','cauldron','rack','puzzle_clue','puzzle_rune','fireplace','furnace','chair','plant','banner','pillar'].includes(o.k))return drawTownProp(o);
  const x=o.x|0,y=o.y|0;if(o.k!=='stairs'&&o.k!=='portal')shadow(g,x,y,o.hw+2);
  if(o.k==='anvil'){g.fillStyle='#3a3036';g.fillRect(x-13,y-11,10,11);g.fillStyle='#ff7a1a';g.fillRect(x-12,y-13,8,3);
    g.fillStyle=G.t%12<6?'#ffd27a':'#ff9a3a';g.fillRect(x-11+((G.t>>3)%5),y-14,2,2);
    g.fillStyle='#2b2b33';g.fillRect(x-1,y-8,13,3);g.fillRect(x+2,y-5,7,4);g.fillRect(x,y-1,11,1);g.fillStyle='#6a6a7a';g.fillRect(x-1,y-9,13,1);g.fillRect(x-4,y-8,3,2);}
  else if(o.k==='pot'){g.fillStyle='#3a2a1a';g.fillRect(x-8,y-2,16,2);g.fillStyle='#ff7a1a';g.fillRect(x-5,y-5,10,3);g.fillStyle='#ffd27a';g.fillRect(x-2,y-6+((G.t>>2)%2),4,2);
    g.fillStyle='#1e1a1e';g.beginPath();g.ellipse(x,y-10,9,6,0,0,7);g.fill();g.fillStyle='#e8c35a';g.beginPath();g.ellipse(x,y-14,7,2,0,0,7);g.fill();
    if(G.t%14===0)EP.push({x:x+rnd(-4,4),y:y-15,vx:rnd(-.1,.1),vy:-.35,l:50,c:'rgba(230,230,240,.35)'});}
  else if(o.k==='cheese'){for(let i=0;i<4;i++){const wy=y-2-i*4;g.fillStyle=i%2?'#c9473a':'#e3b448';g.fillRect(x-8,wy-4,16,4);g.fillStyle=i%2?'#e06a5a':'#f5d27a';g.fillRect(x-8,wy-4,16,1);}}
  else if(o.k==='barrel'){g.fillStyle='#6b4428';g.fillRect(x-6,y-14,12,14);g.fillStyle='#3a2414';g.fillRect(x-6,y-11,12,1);g.fillRect(x-6,y-4,12,1);g.fillStyle='#8a5a34';g.fillRect(x-6,y-14,12,2);}
  else if(o.k==='crystal'){g.fillStyle='#2a8ac0';g.beginPath();g.moveTo(x+5,y-9);g.lineTo(x+8,y-1);g.lineTo(x+2,y-1);g.fill();
    g.fillStyle='#4fd0ff';g.beginPath();g.moveTo(x,y-16);g.lineTo(x+4,y-1);g.lineTo(x-4,y-1);g.fill();g.fillStyle='#d8f6ff';g.fillRect(x-1,y-12,1,7);}
  else if(o.k==='chest'){g.fillStyle=o.hidden?'#3a2a4a':'#5a3418';g.fillRect(x-7,y-8,14,8);g.fillStyle='#c9973a';g.fillRect(x-7,y-5,14,1);g.fillRect(x-1,y-6,2,3);
    if(o.opened){g.fillStyle='#3a2010';g.fillRect(x-7,y-13,14,4);g.fillStyle='#1a0e06';g.fillRect(x-6,y-9,12,2);}
    else{g.fillStyle=o.hidden?'#5a3a7a':'#7a4a22';g.fillRect(x-7,y-11,14,4);g.fillStyle='#c9973a';g.fillRect(x-7,y-11,14,1);if((G.t+x)%80<10){g.fillStyle='#fff';g.fillRect(x+5,y-14,1,3);g.fillRect(x+4,y-13,3,1);}}}
  else if(o.k==='bossdoor'){const p=(Math.sin(G.t*.08)+1)/2;g.fillStyle='#2a2430';g.fillRect(x-14,y-30,28,30);g.fillStyle='#4a4250';g.fillRect(x-16,y-32,32,4);g.fillRect(x-16,y-32,4,32);g.fillRect(x+12,y-32,4,32);
    g.fillStyle='#120c14';g.fillRect(x-10,y-26,20,26);g.fillStyle=`rgba(255,60,60,${.5+p*.5})`;g.fillRect(x-1,y-20,2,12);g.fillRect(x-5,y-15,10,2);
    g.fillStyle='#c8b878';g.fillRect(x-4,y-38,8,6);g.fillStyle='#120c14';g.fillRect(x-3,y-36,2,2);g.fillRect(x+1,y-36,2,2);}
  else if(o.k==='duelpost'){shadow(g,x,y,10);g.fillStyle='#2a2a33';g.fillRect(x-7,y-30,14,30);g.fillStyle='#d8b050';g.fillRect(x-9,y-32,18,3);
    const p=(Math.sin(G.t*.07)+1)/2;g.fillStyle=`rgba(122,216,255,${.5+p*.5})`;g.fillRect(x-4,y-22,8,10);g.fillStyle='#fff';g.fillRect(x-2,y-20,4,6);}
  else if(o.k==='gate'){g.fillStyle='#1a0a08';g.fillRect(x-9,y-26,18,26);g.fillStyle='#3a1a10';g.fillRect(x-11,y-28,22,3);g.fillRect(x-11,y-28,3,28);g.fillRect(x+8,y-28,3,28);
    const p=(Math.sin(G.t*.08)+1)/2;g.fillStyle=`rgba(255,${90+p*60|0},30,.8)`;g.fillRect(x-7,y-22,14,20);g.fillStyle='#ffd04a';g.fillRect(x-2,y-16+p*4,4,4);}
  else if(o.k==='stairs'){for(let i=0;i<4;i++){g.fillStyle=i%2?'#2a1a14':'#3a2a20';g.fillRect(x-8+i,y-12+i*3,16-i*2,3);}g.fillStyle='#000';g.fillRect(x-4,y,8,2);}
  else if(o.k==='portal'){const p=G.t*.1;g.fillStyle=o.locked?'rgba(120,120,140,.5)':'rgba(120,220,255,.85)';g.beginPath();g.ellipse(x,y-10,7+Math.sin(p)*1,11,0,0,7);g.fill();
    g.fillStyle='#fff';g.beginPath();g.ellipse(x,y-10,3,6,0,0,7);g.fill();}
}
function drawGround(gi){
  const d=gi.drop,col=RARC[d.rar],r=RARS.indexOf(d.rar),x=gi.x|0,bob=Math.sin(G.t*.08+gi.gid)*1.5,y=(gi.y+bob)|0,left=gi.expire-G.t,mine=gi.owner==='P1';
  if(left<600&&G.t%20<8)return;   // blink during the last 10 s
  g.globalAlpha=mine?1:.35;
  if(r>=2){g.fillStyle=col;g.globalAlpha=(mine?.35:.15)+Math.sin(G.t*.1)*.1;g.fillRect(x-2,y-60,4,58);g.globalAlpha=mine?1:.35;}
  g.fillStyle=col;g.globalAlpha*=.5;g.beginPath();g.ellipse(x,gi.y+1,7+r,3,0,0,7);g.fill();g.globalAlpha=mine?1:.35;
  if(d.kind==='gold'){g.fillStyle='#ffd23a';g.beginPath();g.arc(x,y-4,3.5,0,7);g.fill();g.fillStyle='#a87a10';g.fillRect(x-1,y-5,2,2);}
  else if(d.kind==='item'){g.fillStyle='#5a3a22';g.fillRect(x-4,y-8,8,7);g.fillStyle=col;g.fillRect(x-4,y-8,8,2);g.fillRect(x-1,y-6,2,3);}
  else{g.fillStyle=col;g.beginPath();g.moveTo(x,y-9);g.lineTo(x+4,y-4);g.lineTo(x,y);g.lineTo(x-4,y-4);g.fill();g.fillStyle='#fff';g.fillRect(x-1,y-7,1,2);}
  if((G.t+gi.gid*13)%50<6){g.fillStyle='#fff';g.fillRect(x+4,y-11,1,3);g.fillRect(x+3,y-10,3,1);}
  g.globalAlpha=1;
}
function drawTownProp(o){
  const x=o.x|0,y=o.y|0;
  if(o.k==='house'){shadow(g,x,y,30);g.fillStyle='#d8c8a8';g.fillRect(x-26,y-26,52,26);g.fillStyle='#b0a080';g.fillRect(x-26,y-4,52,4);
    g.fillStyle=o.roof;g.beginPath();g.moveTo(x-32,y-24);g.lineTo(x,y-46);g.lineTo(x+32,y-24);g.fill();g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x-32,y-26,64,3);
    g.fillStyle='#5a3a22';g.fillRect(x-5,y-16,10,16);g.fillStyle='#ffd27a';g.fillRect(x-20,y-20,8,7);g.fillRect(x+12,y-20,8,7);g.fillStyle='#5a3a22';g.fillRect(x-17,y-20,1,7);g.fillRect(x+15,y-20,1,7);
    if(o.sign){// ป้ายร้าน: กระดานไม้แขวน + สัญลักษณ์วาดเอง
      g.fillStyle='#3a2414';g.fillRect(x-1,y-30,2,4);g.fillStyle='#6a4426';g.fillRect(x-13,y-38,26,10);g.fillStyle='#c8a464';g.fillRect(x-13,y-38,26,1);g.fillRect(x-13,y-29,26,1);
      g.fillStyle='#ffd87a';
      if(o.sign==='alchemy'){g.fillStyle='#c9a0ff';g.fillRect(x-3,y-37,2,3);g.beginPath();g.arc(x-2,y-32,3.5,0,7);g.fill();g.fillStyle='#7af0c0';g.beginPath();g.arc(x-2,y-31.5,2,0,7);g.fill();g.fillStyle='#ffd87a';g.fillRect(x+4,y-36,1,1);g.fillRect(x+6,y-33,1,1);}
      else if(o.sign==='store'){g.beginPath();g.arc(x,y-33,3.5,0,7);g.fill();g.fillStyle='#6a4426';g.fillRect(x-.5,y-35,1,4);}
      else if(o.sign==='guild'){g.fillStyle='#c93a32';g.fillRect(x-4,y-37,8,6);g.strokeStyle='#ffd86a';g.lineWidth=1;g.strokeRect(x-4,y-37,8,6);g.beginPath();g.moveTo(x-7,y-37);g.lineTo(x+7,y-30);g.moveTo(x+7,y-37);g.lineTo(x-7,y-30);g.stroke();}
      else{g.fillStyle='#c8ccd4';g.fillRect(x-6,y-34,9,3);g.fillRect(x-3,y-31,3,2);g.fillRect(x-5,y-29,7,1);g.fillStyle='#8a5a2a';g.fillRect(x+2,y-37,2,6);}}
    return;}
  if(o.k==='counter'){const w=Math.max(26,(o.hw||16)*2);shadow(g,x,y,w*.54);g.fillStyle='#4e2d16';g.fillRect(x-w/2,y-13,w,13);g.fillStyle='#6c4223';g.fillRect(x-w/2+2,y-10,w-4,8);g.fillStyle='#9a6438';g.fillRect(x-w/2-2,y-15,w+4,4);g.fillStyle='#d8b062';g.fillRect(x-w/2-1,y-15,w+2,1);g.fillStyle='#3a2210';g.fillRect(x-w/2,y-11,w,1);
    g.fillStyle='#ffd25a';g.fillRect(x-w/2+4,y-19,3,4);g.fillStyle='#e8dcc0';g.fillRect(x-2,y-17,6,2);
    if(o.inter==='shop'||o.inter==='smithy'){g.fillStyle='#ffd23a';g.fillRect(x-8,y-17,4,2);g.fillStyle='#60d8ff';g.fillRect(x+6,y-19,3,4);g.fillStyle='#ff6a6a';g.fillRect(x+10,y-18,2,3);}return;}
  if(o.k==='shelf'){shadow(g,x,y,14);g.fillStyle='#4a2b16';g.fillRect(x-13,y-26,26,26);g.fillStyle='#2b180b';g.fillRect(x-11,y-24,22,7);g.fillRect(x-11,y-15,22,7);g.fillRect(x-11,y-6,22,5);
    g.fillStyle='#784a28';g.fillRect(x-13,y-27,26,2);g.fillRect(x-12,y-17,24,2);g.fillRect(x-12,y-8,24,2);
    for(let i=0;i<5;i++){g.fillStyle=['#e85a5a','#58b8ff','#7ae088','#ffd24a','#c884ff'][i];g.fillRect(x-10+i*4.2,y-22,3.2,5);g.fillStyle=['#d8b878','#58b8ff','#e85a5a','#c884ff','#7ae088'][(i+2)%5];g.fillRect(x-10+i*4.2,y-13,3.2,5);}return;}
  if(o.k==='rack'){shadow(g,x,y,11);g.fillStyle='#5a361d';g.fillRect(x-11,y-22,2,22);g.fillRect(x+9,y-22,2,22);g.fillRect(x-12,y-20,24,2.5);g.fillRect(x-11,y-8,22,2);
    for(const sx of[-6,0,6]){g.fillStyle='#d2dce8';g.fillRect(x+sx-1,y-18,2,12);g.fillStyle='#e0b44c';g.fillRect(x+sx-2.5,y-7,5,1.5);g.fillStyle='#8c2e28';g.fillRect(x+sx-1,y-5.5,2,2.5);}return;}
  if(o.k==='table'){shadow(g,x,y,14);g.fillStyle='#5a361d';g.fillRect(x-11,y-8,3,8);g.fillRect(x+8,y-8,3,8);g.fillStyle='#8d5a34';g.fillRect(x-14,y-13,28,6);g.fillStyle='#b27848';g.fillRect(x-13,y-13,26,2);
    g.fillStyle='#d8ccb4';g.fillRect(x-6,y-15,6,2);g.fillStyle='#c88844';g.fillRect(x+6,y-16,4,3);g.fillStyle='#ffd25a';g.fillRect(x,y-18,2,5);if(G.t%12<6){g.fillStyle='#fff4b8';g.fillRect(x,y-19,2,2);}return;}
  if(o.k==='chair'){shadow(g,x,y,5);g.fillStyle='#6a4022';g.fillRect(x-4,y-7,8,3);g.fillRect(x-3,y-4,2,4);g.fillRect(x+1,y-4,2,4);g.fillStyle='#8c5630';g.fillRect(x-4,y-12,8,5);return;}
  if(o.k==='plant'){shadow(g,x,y,6);g.fillStyle='#964e30';g.fillRect(x-5,y-7,10,7);g.fillStyle='#b86842';g.fillRect(x-6,y-8,12,2);g.fillStyle='#2f7e38';g.beginPath();g.arc(x,y-13,6,0,7);g.fill();g.fillStyle='#58b45a';g.beginPath();g.arc(x-2,y-15,4,0,7);g.fill();return;}
  if(o.k==='banner'){g.fillStyle='#d8b050';g.fillRect(x-6,y-22,12,2);g.fillStyle=o.col||'#9c2e28';g.beginPath();g.moveTo(x-5,y-20);g.lineTo(x+5,y-20);g.lineTo(x+5,y-6);g.lineTo(x,y-2);g.lineTo(x-5,y-6);g.closePath();g.fill();g.fillStyle='#ffe28a';g.fillRect(x-2,y-16,4,4);return;}
  if(o.k==='pillar'){shadow(g,x,y,7);g.fillStyle='#52321b';g.fillRect(x-5,y-30,10,30);g.fillStyle='#784c2a';g.fillRect(x-4,y-30,3,30);g.fillStyle='#ffd87a';g.fillRect(x-2,y-18,4,5);return;}
  if(o.k==='fireplace'||o.k==='furnace'){const sm=o.k==='furnace';shadow(g,x,y,15);g.fillStyle=sm?'#443c44':'#685e54';g.fillRect(x-13,y-26,26,26);g.fillStyle=sm?'#625860':'#887c6e';g.fillRect(x-15,y-28,30,4);g.fillRect(x-12,y-18,24,2);
    g.fillStyle='#180c0a';g.fillRect(x-8,y-15,16,15);const p=Math.sin(G.t*.22);g.fillStyle='#ff581a';g.beginPath();g.ellipse(x,y-4,6,5+p*.8,0,0,7);g.fill();g.fillStyle='#ffd85a';g.beginPath();g.ellipse(x,y-3,3.5,3+p*.5,0,0,7);g.fill();
    if(G.t%8===0)EP.push({x:x+rnd(-4,4),y:y-8,vx:rnd(-.08,.08),vy:-.3,l:22,c:'#ffa040'});return;}
  if(o.k==='cauldron'){shadow(g,x,y,11);g.fillStyle='#2a2634';g.beginPath();g.ellipse(x,y-8,10,7,0,0,7);g.fill();g.fillStyle='#3c364a';g.fillRect(x-9,y-14,18,3);const bl=Math.sin(G.t*.1);g.fillStyle='#5cf0b0';g.beginPath();g.ellipse(x,y-14,7,2,0,0,7);g.fill();if(G.t%10===0)EP.push({x:x+rnd(-4,4),y:y-15,vx:0,vy:-.3,l:24,c:'rgba(110,255,190,.7)'});g.fillStyle=`rgba(110,255,190,${.4+bl*.15})`;g.fillRect(x-2,y-18,3,2);return;}
  if(o.k==='puzzle_clue'){shadow(g,x,y,9);g.fillStyle='#4a3e58';g.fillRect(x-7,y-22,14,22);g.fillStyle='#72608a';g.fillRect(x-6,y-21,12,18);g.fillStyle='#e2b4ff';g.fillRect(x-4,y-17,8,2);g.fillRect(x-4,y-13,6,1.5);g.fillRect(x-4,y-9,7,1.5);return;}
  if(o.k==='puzzle_rune'){const on=Z.puzzle&&(Z.puzzle.solved||Z.puzzle.lit.includes(o.ri));shadow(g,x,y,9);g.fillStyle='#3c3448';g.fillRect(x-6,y-20,12,20);g.fillStyle=on?o.rc:'#584a6a';g.beginPath();g.moveTo(x-4,y-20);g.lineTo(x,y-30);g.lineTo(x+4,y-20);g.fill();g.fillStyle=o.rc;g.globalAlpha=on?1:.45;g.beginPath();g.arc(x,y-14,3.5,0,7);g.fill();g.globalAlpha=1;if(on&&G.t%8===0)EP.push({x:x+rnd(-3,3),y:y-24,vx:0,vy:-.35,l:20,c:o.rc});return;}
  if(o.k==='fountain'){shadow(g,x,y,16);g.fillStyle='#8a8478';g.beginPath();g.ellipse(x,y-5,16,7,0,0,7);g.fill();g.fillStyle='#4a9ad8';g.beginPath();g.ellipse(x,y-6,13,5,0,0,7);g.fill();
    g.fillStyle='#9a9488';g.fillRect(x-2,y-20,4,14);g.fillStyle='#bfe8ff';const k=(G.t>>3)%3;g.fillRect(x-1,y-24-k,2,4);g.fillRect(x-5+k,y-18,1,3);g.fillRect(x+4-k,y-18,1,3);
    if(G.t%6===0)EP.push({x:x+rnd(-3,3),y:y-22,vx:rnd(-.4,.4),vy:-.2,l:20,c:'rgba(190,230,255,.7)'});return;}
  if(o.k==='stall'){shadow(g,x,y,20);g.fillStyle='#6b4428';g.fillRect(x-18,y-12,36,12);g.fillStyle='#ffd27a';for(let i=0;i<5;i++)g.fillRect(x-15+i*7,y-14,4,3);
    for(let i=0;i<6;i++){g.fillStyle=i%2?'#e8e0d0':'#c9473a';g.fillRect(x-20+i*7,y-26,7,6);}g.fillStyle='#3a2414';g.fillRect(x-19,y-20,2,8);g.fillRect(x+17,y-20,2,8);return;}
  if(o.k==='board'){shadow(g,x,y,8);g.fillStyle='#5a3a22';g.fillRect(x-1,y-6,2,6);g.fillStyle='#8a5a32';g.fillRect(x-9,y-20,18,14);g.fillStyle='#e8dcc0';g.fillRect(x-7,y-18,6,5);g.fillRect(x+1,y-17,6,6);g.fillRect(x-6,y-12,5,4);return;}
  if(o.k==='tree'){shadow(g,x,y,10);g.fillStyle='#5a3a22';g.fillRect(x-2,y-10,4,10);g.fillStyle='#2a6a2a';g.beginPath();g.arc(x,y-18,10,0,7);g.fill();g.fillStyle='#3a8a3a';g.beginPath();g.arc(x-3,y-21,6,0,7);g.fill();return;}
  if(o.k==='lamp'){g.fillStyle='#2a2a30';g.fillRect(x-1,y-20,2,20);g.fillStyle='#ffd27a';g.fillRect(x-3,y-24,6,5);return;}
  if(o.k==='citygate'||o.k==='southgate'){shadow(g,x,y,24);
    // ซุ้มประตูเมืองหินใหญ่ (ประตูเมือง Collawarrie ทางออกสู่โลกภายนอก/ดันเจี้ยน)
    g.fillStyle='#5c564c';g.fillRect(x-26,y-38,14,38);g.fillRect(x+12,y-38,14,38);
    g.fillStyle='#7c7468';g.fillRect(x-24,y-36,10,34);g.fillRect(x+14,y-36,10,34);
    // เชิงเทินด้านบนหอคอยและซุ้มโค้งตรงกลาง
    g.fillStyle='#6a6258';g.fillRect(x-28,y-43,56,7);g.fillRect(x-16,y-36,32,10);
    g.fillStyle='#8c8476';for(let bx=-27;bx<=22;bx+=9)g.fillRect(x+bx,y-47,6,4);
    // ช่องทางเดินออกสู่ภายนอก + ประตูเหล็กยกขึ้น
    g.fillStyle='#1d241c';g.beginPath();g.ellipse(x,y-14,13,13,0,Math.PI,0);g.fill();g.fillRect(x-13,y-14,26,14);
    g.fillStyle='rgba(255,228,160,.22)';g.beginPath();g.ellipse(x,y-12,10,10,0,Math.PI,0);g.fill();g.fillRect(x-10,y-12,20,12);
    g.fillStyle='#3a3a44';for(let gx=-10;gx<=10;gx+=4)g.fillRect(x+gx,y-25,1,8);g.fillRect(x-12,y-20,24,1.5);
    // ธงอาณาจักรและโคมไฟหน้าประตู
    const ban=o.k==='southgate'?'#b53b2e':'#2a5aa8';
    for(const sd of[-1,1]){g.fillStyle=ban;g.fillRect(x+sd*19-3,y-32,6,14);g.fillStyle='#ffd23a';g.fillRect(x+sd*19-2,y-30,4,2);g.fillRect(x+sd*19-1,y-27,2,6);
      g.fillStyle='#ffd884';g.fillRect(x+sd*15-1.5,y-18,3,4);}
    return;}
  if(o.k==='towergate'){shadow(g,x,y,16);g.fillStyle='#4a3a5c';g.fillRect(x-15,y-36,30,36);g.fillStyle='#7a6a8e';g.fillRect(x-13,y-34,26,3);g.fillRect(x-17,y-40,34,5);g.fillStyle='#2a1e36';g.fillRect(x-15,y-36,2,36);g.fillRect(x+13,y-36,2,36);g.fillStyle='#7af0c0';g.fillRect(x-9,y-44,2,4);g.fillRect(x+8,y-44,2,4);
    g.fillStyle='#120a1a';g.beginPath();g.ellipse(x,y-12,8,10,0,Math.PI,0);g.fill();g.fillRect(x-8,y-12,16,12);g.fillStyle=G.t%40<20?'#7af0c0':'#4ad8a0';g.fillRect(x-1,y-30,3,3);g.fillRect(x-10,y-26,2,2);g.fillRect(x+9,y-26,2,2);return;}
  if(o.k==='icegate'){shadow(g,x,y,14);g.fillStyle='#6a8aa4';g.beginPath();g.ellipse(x,y-12,16,16,0,Math.PI,0);g.fill();g.fillRect(x-16,y-12,32,12);g.fillStyle='#bfe4f6';g.beginPath();g.ellipse(x,y-12,12,12,0,Math.PI,0);g.fill();g.fillRect(x-12,y-12,24,12);
    g.fillStyle='#0c1a2a';g.beginPath();g.ellipse(x,y-9,8,10,0,Math.PI,0);g.fill();g.fillRect(x-8,y-9,16,9);g.fillStyle='#eaf8ff';for(const [ix,iy,ih] of [[-14,-14,8],[-8,-24,6],[9,-23,7],[14,-13,9]]){g.beginPath();g.moveTo(x+ix-2,y+iy);g.lineTo(x+ix+2,y+iy);g.lineTo(x+ix,y+iy+ih);g.fill();}return;}
  if(o.k==='stonegate'){shadow(g,x,y,16);g.fillStyle='#5a5046';g.beginPath();g.ellipse(x,y-12,18,18,0,Math.PI,0);g.fill();g.fillRect(x-18,y-12,36,12);g.fillStyle='#7a6e60';g.beginPath();g.ellipse(x,y-12,14,14,0,Math.PI,0);g.fill();g.fillRect(x-14,y-12,28,12);
    g.fillStyle='#120c0a';g.beginPath();g.ellipse(x,y-9,9,11,0,Math.PI,0);g.fill();g.fillRect(x-9,y-9,18,9);const p=(Math.sin(G.t*.06)+1)/2;g.fillStyle=`rgba(95,224,160,${.5+p*.5})`;g.fillRect(x-5,y-12,3,2);g.fillRect(x+2,y-12,3,2);
    g.fillStyle='#8f8474';for(const [rx,ry] of [[-17,-2],[15,-3],[-12,-26],[10,-27]])g.fillRect(x+rx,y+ry,4,3);return;}
  if(o.k==='cavegate'){shadow(g,x,y,14);g.fillStyle='#4a4038';g.beginPath();g.ellipse(x,y-12,16,16,0,Math.PI,0);g.fill();g.fillRect(x-16,y-12,32,12);
    g.fillStyle='#0a0606';g.beginPath();g.ellipse(x,y-8,9,11,0,Math.PI,0);g.fill();g.fillRect(x-9,y-8,18,8);g.fillStyle='#ffb03a';g.fillRect(x-1,y-30,2,4);return;}
  if(o.k==='arena'){const p=Math.sin(G.t*.07);   // ลานหินวงกลม + เสาธง 4 ต้น (เดินผ่านได้)
    g.fillStyle='#4a4438';g.beginPath();g.ellipse(x,y+2,50,19,0,0,7);g.fill();g.fillStyle='#8a8472';g.beginPath();g.ellipse(x,y,48,17,0,0,7);g.fill();
    g.fillStyle='#c8b080';g.beginPath();g.ellipse(x,y,40,13,0,0,7);g.fill();g.strokeStyle='rgba(90,60,30,.5)';g.lineWidth=1;g.beginPath();g.ellipse(x,y,28,9,0,0,7);g.stroke();
    g.strokeStyle='#7a2a20';g.lineWidth=2;g.beginPath();g.moveTo(x-9,y-4);g.lineTo(x+9,y+4);g.moveTo(x+9,y-4);g.lineTo(x-9,y+4);g.stroke();
    for(const[ox,oy]of[[-46,-2],[46,-2],[-24,-14],[24,-14]]){g.fillStyle='#5a4a3a';g.fillRect(x+ox-1,y+oy-20,2,22);g.fillStyle=ox<0?'#3a7ad8':'#d8402a';g.fillRect(x+ox+1,y+oy-20,8+p*1.5,5);g.fillStyle='#ffd27a';g.fillRect(x+ox-2,y+oy-23,4,3);}
    g.fillStyle='#ffe3a0';g.fillRect(x-1,y-30-p,2,4);return;}
  if(o.k==='exitdoor'){g.fillStyle='#2a1c12';g.fillRect(x-9,y-24,18,24);g.beginPath();g.ellipse(x,y-24,9,7,0,Math.PI,0);g.fill();
    g.fillStyle='#7a4a24';g.fillRect(x-7,y-22,14,22);g.beginPath();g.ellipse(x,y-22,7,5,0,Math.PI,0);g.fill();g.fillStyle='#5a3418';g.fillRect(x-1,y-26,2,26);
    g.fillStyle='#ffd23a';g.fillRect(x+3,y-11,2,2);g.fillStyle='#3aa04a';g.fillRect(x-8,y-36,16,7);g.fillStyle='#fff';g.fillRect(x-6,y-34,3,3);g.fillRect(x-2,y-34,2,3);g.fillRect(x+2,y-34,4,1);g.fillRect(x+3,y-34,1,3);
    g.fillStyle=`rgba(140,255,160,${.18+Math.sin(G.t*.08)*.08})`;g.fillRect(x-8,y-2,16,3);return;}
  if(o.k==='exitup'){for(let i=0;i<4;i++){g.fillStyle=i%2?'#6a5a4a':'#8a7a6a';g.fillRect(x-7+i,y-14+i*3,14-i*2,3);}g.fillStyle='#bfe8ff';g.fillRect(x-1,y-20+Math.sin(G.t*.1)*2,2,4);return;}
}
function drawItem(o){
  const x=o.x|0,y=(o.y+Math.sin(G.t*.06+o.x)*1.5)|0;shadow(g,o.x,o.y+1,4);
  switch(o.it){
    case'wood':g.fillStyle='#9a6a3a';g.fillRect(x-5,y-6,10,4);g.fillStyle='#d8b07a';g.fillRect(x-5,y-6,2,4);break;
    case'ore':case'stoneore':case'iceore':case'lavaore':g.fillStyle=o.it==='iceore'?'#7ac8f0':o.it==='stoneore'?'#7a7870':o.it==='ore'?'#6a6c78':'#7a3a20';g.fillRect(x-4,y-8,8,6);g.fillRect(x-5,y-6,10,3);g.fillStyle=o.it==='iceore'?'#e8fbff':o.it==='stoneore'?'#b8b4a8':o.it==='ore'?'#e0a050':'#ffb02a';g.fillRect(x-2,y-7,1,1);g.fillRect(x+2,y-5,1,1);break;
    case'fire':g.fillStyle='#ff5a1a';g.beginPath();g.moveTo(x,y-11);g.lineTo(x+4,y-6);g.lineTo(x,y-1);g.lineTo(x-4,y-6);g.fill();g.fillStyle='#ffe08a';g.fillRect(x-1,y-8,2,4);break;
    case'thunder':g.fillStyle='#4a7aa0';g.fillRect(x-4,y-7,8,6);g.fillStyle='#9fe6ff';g.fillRect(x-1,y-8,2,3);g.fillRect(x,y-5,2,3);break;
    case'cheese':g.fillStyle='#f2c94c';g.beginPath();g.moveTo(x-5,y-2);g.lineTo(x+5,y-2);g.lineTo(x+5,y-8);g.fill();break;
    case'pan':g.fillStyle='#2a2a30';g.beginPath();g.ellipse(x-2,y-4,5,3,0,0,7);g.fill();g.fillStyle='#5a3a22';g.fillRect(x+3,y-5,6,2);break;
    case'hide':g.fillStyle='#8a6a4a';g.fillRect(x-5,y-6,10,5);g.fillStyle='#6a4a2a';g.fillRect(x-3,y-5,6,1);break;
  }
  if((G.t+o.x*7)%70<10){g.fillStyle='#fff';g.fillRect(x+4,y-11,1,3);g.fillRect(x+3,y-10,3,1);}
}
function heroPal(K){return{h:K.head==='helm'||K.head==='crown'?K.hc:K.hair,s:K.skin,e:'#1a1020',c:K.body,b:K.cape?K.cape.col:K.trim,p:K.pants,f:K.boots};}
// ── โมเดลตัวละครแบบฉากต่อสู้ ในเมือง/ดันเจี้ยน (สเกลเล็กลง) ──
const OW_SC=.8;
const FOLK_PROFILES=[
  // 0 [F] จอมเวทสาวโค้ทแดงคอเฟอร์ + ลูกไฟเวท
  {name:'รูบี้',look:{arch:'furcoat',sex:'f',hstyle:'bun',hair:'#b82428',eyec:'#c84020',skin:'#fbe0c8',body:'#dcd4be',coatCol:'#ba241d',furCol:'#e4d8bd',trim:'#2f2422',pants:'#2b2832',boots:'#4e1820',cuffCol:'#6b3838',orbCol:'#ff7b1c',head:'none',gloves:null,sleeve:null}},
  // 1 [M] นักดาบหนุ่มอัศวินเกราะเงิน-น้ำเงิน + ดาบยาว
  {name:'เคเดน',look:{arch:'knight',sex:'m',hstyle:'short',hair:'#7a6448',eyec:'#2a4c78',skin:'#f4c4a0',body:'#8d98a8',armor:'#aab5c6',coatCol:'#243d70',trim:'#d8b050',pants:'#2f3644',boots:'#3e2e24',cape:'#203868',weapon:'sword',head:'none',gloves:'#5a606c',sleeve:null}},
  // 2 [F] นักเวทหญิงชุดเดรสฟ้าเปิดไหล่ + คทาเวท + มงกุฎฟ้า
  {name:'เซเลส',look:{arch:'mage_dress',sex:'f',hstyle:'long',hair:'#ecd26a',eyec:'#c83848',skin:'#fce4d0',body:'#9cd4f0',coatCol:'#2b6cb8',trim:'#dff2ff',pants:'#fbe8dc',boots:'#1b4e78',head:'band',hc:'#6cc0f0',hc2:'#e8f8ff',orbCol:'#58d8ff',gloves:null,sleeve:null}},
  // 3 [M] หนุ่มนักผจญภัยผมแดง เสื้อขาว สายสะพายเฉียง
  {name:'ไคร์ส',look:{arch:'sash',sex:'m',hstyle:'spiky',hair:'#c83824',eyec:'#2a948a',skin:'#f4c4a0',body:'#f2ecdc',sashCol:'#c83424',trim:'#c83424',pants:'#265456',boots:'#4a2e22',cuffCol:'#b85a4a',head:'none',gloves:null,sleeve:null}},
  // 4 [M] อัศวินเกราะเต็มตัวหมวกเหล็กพู่แดง + ดาบใหญ่
  {name:'วาลดอร์',look:{arch:'knight',sex:'m',hstyle:'short',hair:'#3e2c22',eyec:'#5a3820',skin:'#ecc098',body:'#949ca8',armor:'#b8c2d0',coatCol:'#6e2020',trim:'#d8b050',pants:'#323640',boots:'#3a2e28',head:'helm',hc:'#9ca6b4',hc2:'#d8b050',plume:'#d03028',weapon:'sword',gloves:'#6e7684',sleeve:null}},
  // 5 [F] นักบวชสาวผ้าคลุมหัวขาว-ดำ
  {name:'คลาเรีย',look:{arch:'mage_dress',sex:'f',hstyle:'bob',hair:'#e4c668',eyec:'#5a3468',skin:'#fbe0c8',body:'#20202a',coatCol:'#e8ecf4',trim:'#282834',pants:'#f5d8c8',boots:'#1c1c24',head:'cowl',hc:'#f2f4f8',hc2:'#d8b050',gloves:'#24242e',sleeve:null}},
  // 6 [M] หนุ่มนักเดินทางหมวกแก๊ปเขียว + สายสะพายหนัง
  {name:'โรแวน',look:{arch:'sash',sex:'m',hstyle:'sidebang',hair:'#4b3525',eyec:'#2e6840',skin:'#f6cca6',body:'#e8e0cc',sashCol:'#2f7a4a',trim:'#b8843a',pants:'#364838',boots:'#463022',cuffCol:'#3f7c4c',head:'cap',hc:'#2f7a4a',hc2:'#e0b850',gloves:null,sleeve:null}},
  // 7 [F] นักเล่นแร่แปรธาตุหมวกแม่มดม่วง + คทาเวท
  {name:'มอร์กาน่า',look:{arch:'furcoat',sex:'f',hstyle:'braid',hair:'#c6ccd8',eyec:'#6e3c9c',skin:'#fae0cc',body:'#d8d0e4',coatCol:'#56287c',furCol:'#e4d8f2',trim:'#d8b050',pants:'#2c243a',boots:'#3a2244',head:'wizard',hc:'#4a226c',hc2:'#e8c058',orbCol:'#b46eff',gloves:null,sleeve:null}},
  // 8 [M] พ่อค้าหนุ่มเสื้อกั๊กทอง-น้ำตาล + ผ้าคาดเอว
  {name:'คาร์โล',look:{arch:'sash',sex:'m',hstyle:'short',hair:'#2c2628',eyec:'#4a3820',skin:'#ecc098',body:'#c88836',sashCol:'#6b3822',trim:'#e8c058',pants:'#362c28',boots:'#2e2018',cuffCol:'#784426',head:'band',hc:'#266680',hc2:'#f0c858',gloves:null,sleeve:null}},
  // 9 [F] อัศวินหญิงเอลฟ์ผมเงิน ชุดขาวคาดเอวมรกต + ดาบ
  {name:'เอเลน่า',look:{arch:'elf_knight',elfEars:1,sex:'f',hstyle:'ponytail',hair:'#cad2de',eyec:'#2b5c6e',skin:'#fbe0c8',body:'#edf2f6',obiCol:'#1b6a6c',coatCol:'#264c5c',trim:'#c8a44a',pants:'#eaeef2',boots:'#283440',weapon:'sword',head:'none',gloves:'#242028',sleeve:null}},
  // 10 [M] ช่างฝีมือผ้าโพกหัว + เสื้อแขนพับสายคาดน้ำเงิน
  {name:'บราม',look:{arch:'sash',sex:'m',hstyle:'curly',hair:'#684028',eyec:'#3c281c',skin:'#e4b084',body:'#e6dfd0',sashCol:'#2a5a96',trim:'#8a5228',pants:'#3e342c',boots:'#422a1c',cuffCol:'#3e669a',head:'hood',hc:'#8a3028',hc2:'#e0b050',gloves:null,sleeve:null}},
  // 11 [F] ซัมมอนเนอร์สาวเขาทอง + ชุดเวทเขียวมรกต
  {name:'ซิลเวีย',look:{arch:'mage_dress',sex:'f',hstyle:'twin',hair:'#eed066',eyec:'#308458',skin:'#fce4d0',body:'#789c4e',coatCol:'#2c7848',trim:'#e8c058',pants:'#f4e2ce',boots:'#4a2c1c',head:'horns',hc:'#e0b448',hc2:'#80e888',orbCol:'#66e680',gloves:null,sleeve:null}},
  // 13 [F] นักบวชเอลฟ์หญิงชุดกุหลาบแดง-ขาว (ไม่มีมงกุฎ)
  {name:'โรซาเลีย',look:{arch:'mage_dress',elfEars:1,sex:'f',hstyle:'long',hair:'#e690a8',eyec:'#9c2444',skin:'#fce4d0',body:'#f8eef2',coatCol:'#9e1e36',trim:'#f0c860',pants:'#2a222c',boots:'#4a1826',head:'none',gloves:null,sleeve:null}},
  // 14 [M] อัศวินทมิฬเกราะดำติดเขา + ดาบ
  {name:'ดราเวน',look:{arch:'knight',sex:'m',hstyle:'spiky',hair:'#242838',eyec:'#4cc2ff',skin:'#f0c4a0',body:'#363c4c',armor:'#485064',coatCol:'#1e2438',trim:'#70d8ff',pants:'#1c202c',boots:'#222634',cape:'#202840',head:'horns',hc:'#70d8ff',weapon:'sword',gloves:'#303848',sleeve:null}},
  // 15 [F] จอมเวทหญิงผมทรงฮิเมะดำ โค้ทน้ำเงินเข้มขนเฟอร์
  {name:'วิเวียน',look:{arch:'furcoat',sex:'f',hstyle:'hime',hair:'#262234',eyec:'#3c84e8',skin:'#fce4d0',body:'#e8ecf6',coatCol:'#1a509c',furCol:'#e8f0fa',trim:'#a0c8ff',pants:'#202638',boots:'#1c2848',orbCol:'#56b8ff',head:'none',gloves:null,sleeve:null}}
];
function palLook(pal,id){
  // ไลร่า (ตัวละครหลักหญิง): เอลฟ์ผมบลอนด์หม่น เสื้อขาว + กระโปรงคลุมเขียวมรกตเฉพาะตัว
  if(id==='girl')return{arch:'elf_cleric',elfEars:1,ahoge:1,sex:'f',hstyle:'long',hair:'#bfa688',eyec:'#2b3a4a',skin:'#fbe0c8',body:'#f4f7f8',coatCol:'#10767e',belt:'#5c3224',trim:'#10767e',pants:'#f2ebe2',boots:'#3e2824',cuffCol:'#246868',head:'none',gloves:null,sleeve:null};
  // Re-Item Master: นักปราชญ์หญิงผ้าคลุมหัวขาว-ม่วง + ลูกแก้วฟ้า (ไม่ซ้ำชาวบ้าน)
  if(id==='reitem')return{arch:'mage_dress',sex:'f',hstyle:'long',hair:'#d6d2e8',eyec:'#70d8ff',skin:'#fce4d0',body:'#4a2c68',coatCol:'#6e2e8c',trim:'#e8c860',pants:'#261e38',boots:'#381e52',head:'cowl',hc:'#f4f2fc',hc2:'#88e8ff',orbCol:'#6ae2ff',gloves:null,sleeve:null};
  // ทหารยามประตูเมือง & ยามประตูใต้: อัศวินชายเต็มยศ เกราะเหล็ก + ดาบ + ผ้าคลุมราชอาณาจักร
  if(id==='guard')return{arch:'knight',sex:'m',hstyle:'spiky',hair:'#2e4064',eyec:'#3c90e0',skin:'#f2c098',body:'#8d98a8',armor:'#adb8ca',coatCol:'#1e3d78',trim:'#e2bc58',pants:'#283040',boots:'#362820',cape:'#1c366c',weapon:'sword',head:'band',hc:'#22488a',hc2:'#f0d060',gloves:'#5c6472',sleeve:null};
  if(id==='southguard')return{arch:'knight',sex:'m',hstyle:'short',hair:'#5a3e28',eyec:'#d05028',skin:'#eec098',body:'#9ca4b4',armor:'#bcc6d8',coatCol:'#7a2228',trim:'#e8c45c',pants:'#2c2e38',boots:'#38241e',cape:'#7a2228',weapon:'sword',head:'helm',hc:'#a6b0c0',hc2:'#e8c45c',plume:'#d83428',gloves:'#687080',sleeve:null};
  // ช่างตีเหล็กโบโร & พ่อค้ามาร์คัส & เจ้าของร้าน / กิลด์: แยกโมเดลชัดเจน
  if(id==='smith')return{arch:'sash',sex:'m',hstyle:'spiky',hair:pal.h||'#c8ccd4',skin:pal.s||'#ecc098',eyec:pal.e||'#382820',body:pal.c||'#b84a32',sashCol:'#5a3420',trim:'#d8a048',pants:pal.p||'#2c2420',boots:pal.f||'#3e281e',cuffCol:'#6e3a26',head:'band',hc:'#8a3024',hc2:'#e0b050',gloves:null,sleeve:null};
  if(id==='shopkeeper'||id==='merchant')return{arch:'sash',sex:'m',hstyle:'short',hair:'#4a3222',eyec:'#2a4c6e',skin:'#f0c4a0',body:'#2b6c94',sashCol:'#c89036',trim:'#e8c058',pants:'#2e3440',boots:'#3e281e',cuffCol:'#2e5c78',head:'none',gloves:null,sleeve:null};
  if(id==='alchemist')return{arch:'furcoat',sex:'f',hstyle:'long',hair:'#dcd8f0',eyec:'#48e0a8',skin:'#fce4d0',body:'#362452',coatCol:'#4a2878',furCol:'#e4dcf8',trim:'#e8c458',pants:'#261c3a',boots:'#341d48',head:'wizard',hc:'#3c2064',hc2:'#6cf0c0',orbCol:'#5cf0b8',gloves:null,sleeve:null};
  if(id==='guildmaster')return{arch:'elf_knight',elfEars:1,sex:'f',hstyle:'braid',hair:'#e8dcb8',eyec:'#c83848',skin:'#fce4d0',body:'#f4f6fa',obiCol:'#c89e38',coatCol:'#7a1e28',trim:'#e8c058',pants:'#eaeef4',boots:'#3e2422',head:'none',gloves:'#4a2026',sleeve:null};
  if(id==='guildshop')return{arch:'knight',sex:'m',hstyle:'sidebang',hair:'#4e3624',eyec:'#306c9a',skin:'#f2c098',body:'#2c4e74',armor:'#7a889e',coatCol:'#244868',trim:'#d8b050',pants:'#28303e',boots:'#3a2a20',head:'none',gloves:'#5a6270',sleeve:null};
  if(String(id).startsWith('folk')){const idx=(parseInt(String(id).replace(/\D/g,''))||0)%FOLK_PROFILES.length;return Object.assign({},FOLK_PROFILES[idx].look);}
  const h=hash((id||'').length*7+((pal.h||'').charCodeAt(2)||0),(pal.c||'').charCodeAt(3)||0),HS=Object.keys(HAIR_STYLES).filter(k=>k!=='bald'),st=HS[(h*HS.length)|0];
  return{hair:pal.h,skin:pal.s,eyec:pal.e,body:pal.c,trim:pal.b,pants:pal.p,boots:pal.f,hstyle:st||'short',sex:h>.5?'f':'m',gloves:null,sleeve:null};}
function owPose(t,moving,ph){
  if(!moving){
    const br=Math.sin(t*.08)*.3;
    return{lean:0,hip:-14.5+br*.2,ff:[.8,0],bf:[-1.0,-.3],fh:[0,11],bh:[0,11],wa:-.9,head:0,run:0};
  }
  const s=Math.sin(ph),c=Math.cos(ph),aS=-s;
  return{
    lean:.10+Math.sin(ph*2)*.015,
    hip:-14.1-Math.abs(s)*.55,
    head:-.05,
    ff:[.2+3.4*s,-Math.max(0,c)*1.7],
    bf:[-.2-3.4*s,-.3-Math.max(0,-c)*1.7],
    fh:[.3+2.4*aS,10.2-.4*Math.abs(aS)],
    bh:[-.3-2.4*aS,10.2-.4*Math.abs(aS)],
    wa:-.9,run:1,ph:Math.round(ph*4)/4
  };
}
const SHEATH=new WeakMap();function sheathed(K){let k=SHEATH.get(K);if(!k){k=Object.assign({},K,{sheathe:1});SHEATH.set(K,k);}return k;}
function drawExploreWpnFx(x,y,K,sheet){
  if(!K||(sheet&&sheet!=='char_player'))return;
  const Wp=K.weapon&&WEAPONS[K.weapon];
  const isChaos=K.weapon==='bbqysword'||K.wshape==='chaosblade';
  if(isChaos){
    const ang=(G.t*.065)%6.283;g.save();
    g.globalAlpha=.22;g.fillStyle='#b45cff';g.beginPath();g.ellipse(x,y,13,4.4,0,0,7);g.fill();
    g.globalAlpha=.38;g.fillStyle='#5a1fa8';
    for(let i=-1;i<=1;i++){const sx=x+i*4.5+Math.sin(G.t*.09+i)*1.2,sy=y-1-Math.abs(Math.cos(G.t*.11+i*2))*1.2;
      g.beginPath();g.arc(sx,sy,2.2,0,7);g.fill();}
    g.translate(x,y-1);g.rotate(-.22);
    g.globalAlpha=.44;g.strokeStyle='#3b1d73';g.lineWidth=2.2;g.beginPath();g.ellipse(0,0,12,4,0,0,7);g.stroke();
    g.globalAlpha=.8;g.strokeStyle='#a64df0';g.lineWidth=1.4;g.beginPath();g.ellipse(0,0,12,4,0,ang,ang+3.1);g.stroke();
    g.globalAlpha=.95;g.strokeStyle='#ffd6ff';g.lineWidth=.9;g.beginPath();g.ellipse(0,0,12,4,0,ang+.25,ang+1.45);g.stroke();
    g.globalAlpha=.75;g.strokeStyle='#35d6e6';g.lineWidth=.8;g.setLineDash([2.2,2.2]);
    g.beginPath();g.ellipse(0,0,8.5,2.8,0,-ang,-ang+6.283);g.stroke();g.setLineDash([]);
    g.restore();
    if(G.t%5===0)EP.push({x:x+rnd(-10,10),y:y-rnd(1,16),vx:rnd(-.12,.12),vy:-.35,l:20,c:G.t%10?'#e2b3ff':'#5ff0ff'});
    return;
  }
  const col=K.wfx||(Wp&&Wp.el!=='phys'&&Wp.fx)||K.aura;
  if(!col)return;
  const ang=(G.t*.05)%6.283;g.save();
  g.globalAlpha=.16;g.fillStyle=col;g.beginPath();g.ellipse(x,y,10.5,3.5,0,0,7);g.fill();
  g.globalAlpha=.58;g.strokeStyle=col;g.lineWidth=1;g.beginPath();g.ellipse(x,y,10,3.3,0,ang,ang+2.6);g.stroke();
  g.restore();
  if(G.t%7===0)EP.push({x:x+rnd(-8,8),y:y-rnd(2,14),vx:rnd(-.1,.1),vy:-.3,l:18,c:col});
}
function drawWalker(x,y,face,K,moving,ph,seed,tint,sheet,dir){drawExploreWpnFx(x,y,K,sheet);if(sheet&&AS.walker(g,sheet,x,y,dir||(face<0?'left':'right'),moving,ph,tint))return;shadow(g,x,y,6);if(K&&((Z&&Z.safe&&K.weapon)||K.outfit))K=sheathed(K);   // สำรวจ/ในเมือง: เก็บอาวุธสะพายหลังเสมอ
  if(RIG_HD.on&&(dir==='up'||dir==='down')){drawRigFB(g,Math.round(x),Math.round(y),OW_SC,dir,ph,moving,K,tint,G.t+(seed||0));return;}   // มุมหน้า/หลัง
  drawRig(g,Math.round(x),Math.round(y),OW_SC,face<0?-1:1,owPose(G.t+(seed||0),moving,ph),K,tint);}
function drawExplore(){
  {const mxc=Math.max(0,Z.cols*16-W),myc=Z.rows>17?Math.max(0,Z.rows*16-H):0,tx=clamp(P.x-W/2,0,mxc),ty=clamp(P.y-H/2+14,0,myc);
   if(CAM.snap||CAM.zone!==Z.id){CAM.x=tx;CAM.y=ty;CAM.snap=0;CAM.zone=Z.id;}else{CAM.x+=(tx-CAM.x)*.14;CAM.y+=(ty-CAM.y)*.14;}CAM.rx=Math.round(CAM.x);CAM.ry=Math.round(CAM.y);}
  const cx=CAM.rx,cy=CAM.ry;
  g.save();if(G.shake>0)g.translate(rnd(-G.shake,G.shake)|0,rnd(-G.shake,G.shake)|0);
  PJ.set(cx,cy);HD.ground(g,cx,cy,HD.voidCol());for(const t of Z.torches)if(t.x>cx-90&&t.x<cx+W+90)HD.bb(g,t.x,t.y,()=>drawTorch(g,t.x,t.y));   // HD-2D: พื้นมุมเอียง + วัตถุตั้งตรง
  if(Z.water){const x0=cx-90>>4,x1=(cx+W+90>>4)+1,y0=cy-30>>4,y1=(cy+H>>4)+1,t=G.t;
    for(const w of Z.water){if(w.x<x0||w.x>x1||w.y<y0||w.y>y1)continue;
      const gx=w.x*16,gy=w.y*16,fl=((t*.22+w.x*3.7+hash(w.x,w.y)*16)%16);
      const q=hash(w.x*5+(t>>4),w.y*7),wv=Math.sin(t*.06+w.x*.8+w.y*.5);
      // คลื่นน้ำไหลแนวนอนและแสงสะท้อนผิวน้ำ
      const p1=PJ.pt(gx+((fl)|0),gy+4+((w.x*7+w.y*3)%7)+wv*.8);
      g.strokeStyle='rgba(195,236,255,.32)';g.lineWidth=Math.max(.7,p1.s*.85);
      g.beginPath();g.moveTo(p1.x-2.5*p1.s,p1.y);g.quadraticCurveTo(p1.x,p1.y-1.1*p1.s,p1.x+3*p1.s,p1.y);g.stroke();
      // ฟองคลื่นริมฝั่งด้านบน/ล่างของคลองและสระน้ำ
      if(Z.grid[w.y-1]&&Z.grid[w.y-1][w.x]!=='W'){const ps=PJ.pt(gx+8,gy+1.5);g.fillStyle=`rgba(215,245,255,${.22+Math.sin(t*.05+w.x)*.08})`;g.fillRect(ps.x-7*ps.s,ps.y,14*ps.s,1*ps.s);
        if(Z.id==='town'&&w.y<=6){g.fillStyle='#5c564c';g.fillRect(ps.x-8*ps.s,ps.y-2*ps.s,16*ps.s,2*ps.s);}}
      if(Z.id==='town'&&w.x>=40&&w.x<=44&&w.y===5&&w.x%2===0){const lp=PJ.pt(gx+8,gy+8+Math.sin(t*.04+w.x)*.6);
        g.fillStyle='#2c7442';g.beginPath();g.ellipse(lp.x,lp.y,3.5*lp.s,2*lp.s,0,0,7);g.fill();
        if(w.x===42){g.fillStyle='#ffb4cc';g.fillRect(lp.x-1*lp.s,lp.y-1*lp.s,2*lp.s,2*lp.s);}}
      if(q>.62){const ps=PJ.pt(gx+3+(q*10|0),gy+3+((q*83|0)%10));g.fillStyle='rgba(235,250,255,.55)';g.fillRect(ps.x,ps.y,1.4*ps.s,1*ps.s);}
    }
    // ปลาแหวกว่ายในสระและคลองเมือง
    if(Z.id==='town'){
      for(let i=0;i<3;i++){const fx=665+Math.sin(t*.02+i*2.1)*26,fy=80+Math.cos(t*.026+i*1.7)*14,pf=PJ.pt(fx,fy);
        if(fx>cx-20&&fx<cx+W+20&&fy>cy-20&&fy<cy+H+20){g.fillStyle=i%2?'rgba(255,148,88,.72)':'rgba(255,220,120,.68)';g.beginPath();g.ellipse(pf.x,pf.y,2.2*pf.s,.9*pf.s,Math.cos(t*.02+i*2.1)*.4,0,7);g.fill();}}
      for(let i=0;i<4;i++){const fx=((i*190+t*.32)%(Z.cols*16-32))+16,fy=23.5*16+Math.sin(t*.04+i)*6,pf=PJ.pt(fx,fy);
        if(fx>cx-20&&fx<cx+W+20&&fy>cy-20&&fy<cy+H+20){g.fillStyle='rgba(180,232,255,.45)';g.beginPath();g.ellipse(pf.x,pf.y,2*pf.s,.8*pf.s,0,0,7);g.fill();}}
    }
  }
  if(Z.lavaTiles&&G.t%6===0){const l=pick(Z.lavaTiles);if(l)EP.push({x:l.x+rnd(-6,6),y:l.y,vx:rnd(-.15,.15),vy:-.35,l:32,c:'rgba(245,152,68,.65)'});}
  if(P.moving&&G.t%7===0){
    const bio=Z.biomeAt?Z.biomeAt(Math.floor(P.x/16)):'town';
    const fc=bio==='town'?'rgba(195,180,140,.42)':bio==='ice'?'rgba(215,238,255,.45)':bio==='lava'?'rgba(235,140,70,.42)':bio==='tower'?'rgba(135,225,190,.38)':'rgba(165,158,142,.38)';
    EP.push({x:P.x-P.face*3+rnd(-2,2),y:P.y+rnd(-1,1),vx:-P.face*rnd(.1,.28),vy:-rnd(.12,.26),l:16,c:fc});
  }
  const list=[],K=Equip.look();
  // หญ้าและดอกไม้ไหวตามลม + ผีเสื้อในเมือง
  if((Z.id==='town'||Z.id==='city')&&Z.grid){
    const gx0=Math.max(1,(cx-40)>>4),gx1=Math.min(Z.cols-2,(cx+W+40)>>4),gy0=Math.max(2,(cy-20)>>4),gy1=Math.min(Z.rows-3,(cy+H+20)>>4),t=G.t;
    for(let ty=gy0;ty<=gy1;ty++)for(let tx=gx0;tx<=gx1;tx++){
      if(Z.grid[ty][tx]!=='.')continue;const h=hash(tx*17,ty*29);if(h<.56)continue;
      const wx=tx*16+4+hash(tx,ty*7)*8,wy=ty*16+5+hash(ty,tx*3)*8,sw=Math.sin(t*.048+tx*.45+ty*.32)*1.6,fl=h>.87;
      list.push({x:wx,y:wy,f:()=>{
        g.strokeStyle='rgba(74,140,56,.78)';g.lineWidth=1;
        for(let b=-1;b<=1;b++){g.beginPath();g.moveTo(wx+b*1.7,wy);g.quadraticCurveTo(wx+b*1.7+sw*.5,wy-2.4,wx+b*2.1+sw,wy-4.2-(b===0?1:0));g.stroke();}
        if(fl){g.fillStyle=['#ffe87a','#ff9ec0','#9fd8ff','#ffffff'][(tx+ty)&3];g.fillRect(wx+sw-.8,wy-5.5,1.8,1.8);}
      }});
    }
    for(let i=0;i<5;i++){const bx=120+i*140+Math.sin(t*.028+i*1.9)*28,by=110+(i%3)*120+Math.cos(t*.035+i)*18,flp=Math.sin(t*.35+i)*1.2;
      if(bx>cx-30&&bx<cx+W+30&&by>cy-30&&by<cy+H+30)list.push({x:bx,y:by,f:()=>{g.fillStyle=i%2?'#ffe680':'#b8ecff';g.fillRect(bx-1.5,by-10,1.4+flp*.3,1.4);g.fillRect(bx+.3,by-10,1.4+flp*.3,1.4);}});}
  }
  if(Z.id==='overworld'&&typeof OW!=='undefined')OW.pushEnv(list,cx,cy);
  for(const o of Z.props)list.push({x:o.x,y:o.y,f:()=>{
    if(['portal','stairs','bossdoor','exitdoor','arena'].includes(o.k)){
      const t=G.t,p=.5+Math.sin(t*.06+o.x)*.2,col=o.k==='bossdoor'?'235,90,85':o.k==='exitdoor'?'120,230,150':o.k==='arena'?'235,195,105':'115,210,245';
      g.strokeStyle=`rgba(${col},${.22+p*.15})`;g.lineWidth=.9;g.beginPath();g.ellipse(o.x,o.y-1,11+p*2,4+p*.7,0,0,7);g.stroke();
      for(let i=0;i<2;i++){const a=t*.045+i*3.14+o.x;g.fillStyle=`rgba(${col},.52)`;g.fillRect(o.x+Math.cos(a)*9,o.y-4+Math.sin(a)*3,1.2,1.2);}
    }
    drawProp(o);
  }});
  for(const o of Z.items)if(!o.taken)list.push({x:o.x,y:o.y,f:()=>drawItem(o)});
  for(const gi of Z.ground||[])if(!gi.picked)list.push({x:gi.x,y:gi.y,f:()=>drawGround(gi)});
  const bs=G.bloodstain;if(bs&&bs.zone===Z.id)list.push({x:bs.x,y:bs.y-6,f:()=>{const x=bs.x|0,y=bs.y|0,p=Math.sin(G.t*.08);
    g.fillStyle='rgba(120,0,0,.75)';g.beginPath();g.ellipse(x,y,8,3.5,0,0,7);g.fill();g.fillStyle='rgba(200,20,20,.9)';g.fillRect(x-3,y-1,2,2);g.fillRect(x+2,y,3,1);
    g.fillStyle=`rgba(255,60,40,${.35+p*.2})`;g.fillRect(x-1,y-14-p*2,2,12);if(G.t%6===0)EP.push({x:x+rnd(-5,5),y:y-2,vx:0,vy:-.4,l:30,c:'#ff4a3a'});}});
  for(const n of Z.folk||[])list.push({x:n.x,y:n.y,f:()=>{n._K=n._K||palLook(n.pal,n.id);drawWalker(n.x,n.y,n.face,n._K,n.mv,G.t*.22,n.x|0,null,'folk_'+((parseInt(String(n.id).replace(/\D/g,''))||0)%4+1),n.mv?(Math.abs(n.vy||0)>Math.abs(n.vx||0)?(n.vy>0?'down':'up'):(n.face<0?'left':'right')):'down');}});
  for(const n of Z.npcs)list.push({x:n.x,y:n.y,f:()=>{n.face=P.x<n.x?-1:1;n._K=n._K||palLook(PAL[n.pal],n.id);drawWalker(n.x,n.y,n.face,n._K,0,0,n.x|0,null,'npc_'+n.id,Math.abs(P.y-n.y)>Math.abs(P.x-n.x)?(P.y>n.y?'down':'up'):(n.face<0?'left':'right'));}});
  for(const t of Z.traps||[])if(t.seen||t.type==='pit')list.push({x:t.tx*16+8,y:t.ty*16+1,f:()=>drawTrap(t)});
  for(const e of Z.foes)if(e.alive&&!e.hidden)list.push({x:e.x,y:e.y,f:()=>{const d=FOES[e.kind];
    if(e.elite&&G.t%4===0)EP.push({x:e.x+rnd(-6,6),y:e.y-rnd(2,12),vx:0,vy:-.3,l:16,c:'#ffd23a'});
    const mh=(SPR[d.map]||GOLEM).length,mt=e.cool>0&&G.t%8<4?'#ffffff':null;
    if(AS.has('mon_'+e.kind)){shadow(g,e.x,e.y,d.boss?16:7);AS.mon(g,e.kind,e.x,e.y+Math.round(Math.sin(G.t*.08+e.x)*1)-(d.hover?4:0),d.boss?mh*2.2:Math.max(16,mh*1.8),e.face<0,mt);}
    else if(d.h<60){shadow(g,e.x,e.y,6);spr(g,SPR[d.map]||RAT,PAL[d.pal],e.x,e.y+1-(Math.abs(Math.sin(G.t*.3))*(e.vx||e.vy?1:0)|0),1,e.face<0,e.cool>0&&G.t%8<4?'rgba(255,255,255,.6)':null);}
    else if(d.kind==='rig'){const K=d.look?LOOK_BY_NAME[d.look]:(e._K=e._K||Object.assign(palLook(PAL[d.pal||(e.kind==='kage'?'kage':'shade')],e.kind),{weapon:d.wpn||'sword'}));drawWalker(e.x,e.y,e.face,K,e.vx||e.vy,G.t*.22,e.x|0,e.cool>0&&G.t%8<4?'rgba(255,255,255,.6)':null);}
    else{shadow(g,e.x,e.y,16);spr(g,SPR[d.map]||GOLEM,PAL[d.pal],e.x,e.y+Math.round(Math.sin(G.t*.04))-(d.hover?4:0),d.map==='ANGEL'?1.6:d.boss?2:1.4,e.face<0&&!d.noFlip,null,e);}}});
  list.push({x:P.x,y:P.y,f:()=>{
    if(P.castExit>0){const pr=1-P.castExit/180,al=.35+Math.sin(G.t*.25)*.15;
      g.save();g.strokeStyle=`rgba(122,240,255,${.7+pr*.3})`;g.lineWidth=1.2;g.beginPath();g.ellipse(P.x,P.y,11+pr*4,4.5+pr*1.5,0,0,7);g.stroke();
      g.fillStyle=`rgba(122,240,255,${al*.45})`;g.fillRect(P.x-7-pr*2,P.y-36,14+pr*4,36);g.restore();}
    if(Z.id==='overworld'){g.save();g.translate(P.x,P.y);g.scale(.76,.76);g.translate(-P.x,-P.y);drawWalker(P.x,P.y,P.face,K,P.moving,P.anim*1.4,0,null,'char_player',P.dir4||'down');g.restore();}
    else drawWalker(P.x,P.y,P.face,K,P.moving,P.anim*1.4,0,null,'char_player',P.dir4||'down');
  }});
  if(!Z.interior){HDD.push(list,cx);   // ของตกแต่งพื้น: กองหิน คริสตัล กอหญ้า ตอเสา (เฉพาะกลางแจ้ง/ดันเจี้ยน ไม่เกิดในบ้าน/ร้าน)
  HD.walls(list,cx,cy);}
  list.sort((a,b)=>a.y-b.y).forEach(o=>o.raw?o.f():HD.bb(g,o.x,o.y,o.f));
  for(const p of EP){const q=PJ.pt(p.x,p.y),z=(p.grav?2:1)*q.s;g.globalAlpha=Math.min(1,p.l/20);g.fillStyle=p.c;g.fillRect(q.x,q.y,z,z);}g.globalAlpha=1;
  for(const m of MOTES){g.fillStyle=`rgba(255,230,180,${m.a*.5})`;g.fillRect(m.x|0,m.y|0,1,1);}
  g.restore();
  const fl=()=>Math.sin(G.t*.25)*3+rnd(-1.5,1.5),ls=Z.torches.map(t=>({x:t.x,y:t.y+6,r:Z.interior?95+fl():72+fl(),c:Z.interior?'rgba(255,180,100,.28)':'rgba(255,140,60,.22)'}));
  ls.push({x:P.x,y:P.y-8,r:P.castExit>0?55+(180-P.castExit)*.25:Z.interior?70:50,c:P.castExit>0?'rgba(122,240,255,.38)':undefined});
  for(const o of Z.props){if(o.k==='pot'||o.k==='fireplace'||o.k==='furnace')ls.push({x:o.x,y:o.y-6,r:76+fl(),c:'rgba(255,140,60,.32)'});if(o.k==='pillar'||o.k==='table')ls.push({x:o.x,y:o.y-14,r:56+fl(),c:'rgba(255,195,110,.22)'});if(o.k==='anvil')ls.push({x:o.x-8,y:o.y-10,r:42+fl(),c:'rgba(255,120,40,.25)'});if(o.k==='cauldron')ls.push({x:o.x,y:o.y-10,r:52,c:'rgba(90,245,180,.28)'});
    if(o.k==='crystal')ls.push({x:o.x,y:o.y-8,r:44,c:'rgba(80,200,255,.22)'});if(o.k==='chest'&&!o.opened)ls.push({x:o.x,y:o.y-6,r:20,c:'rgba(255,220,120,.18)'});
    if(o.k==='gate')ls.push({x:o.x,y:o.y-12,r:46+fl(),c:'rgba(255,100,30,.35)'});if(o.k==='bossdoor')ls.push({x:o.x,y:o.y-14,r:44,c:'rgba(255,60,60,.3)'});if(o.k==='portal'||o.k==='stairs')ls.push({x:o.x,y:o.y-8,r:36,c:'rgba(120,220,255,.25)'});if(o.k==='exitdoor')ls.push({x:o.x,y:o.y-14,r:40,c:'rgba(120,255,140,.28)'});}
  if(Z.lavaTiles)for(let i=0;i<Z.lavaTiles.length;i+=2){const l=Z.lavaTiles[i];ls.push({x:l.x,y:l.y,r:34,c:'rgba(255,90,20,.2)'});}
  for(const o of Z.items)if(!o.taken&&o.it==='fire')ls.push({x:o.x,y:o.y-6,r:22,c:'rgba(255,100,40,.3)'});
  for(const n of Z.npcs)ls.push({x:n.x,y:n.y-8,r:24});
  for(const e of Z.foes)if(e.alive&&FOES[e.kind].boss)ls.push({x:e.x,y:e.y-22,r:34,c:'rgba(255,210,80,.15)'});
  for(const gi of Z.ground||[])if(!gi.picked){const r=RARS.indexOf(gi.drop.rar);ls.push({x:gi.x,y:gi.y-6,r:16+r*8,c:RARC[gi.drop.rar]+'66'});}
  for(const o of Z.props)if(o.k==='lamp')ls.push({x:o.x,y:o.y-18,r:70,c:'rgba(255,200,120,.2)'});else if(o.k==='citygate')ls.push({x:o.x,y:o.y-16,r:76,c:'rgba(255,205,130,.24)'});else if(o.k==='fountain')ls.push({x:o.x,y:o.y-8,r:50,c:'rgba(120,200,255,.15)'});else if(o.k==='exitdoor')ls.push({x:o.x,y:o.y-14,r:34,c:'rgba(120,255,140,.18)'});else if(o.k==='arena')ls.push({x:o.x,y:o.y-8,r:62,c:'rgba(255,200,120,.22)'});else if(o.k==='cavegate')ls.push({x:o.x,y:o.y-10,r:40,c:'rgba(255,160,80,.15)'});
  HDD.lights(ls);
  for(const l of ls){const q=PJ.pt(l.x,l.y);l.x=q.x;l.y=q.y;l.r*=q.s;}
  {const bio=fxBiome(false);lighting(ls,HD.dark(bio));HD.atmos(g,bio,cx,cy);}
}
function drawExploreUI(){
  {const bk=Z.bossRoom||(Z.floor===2?THEME_BOSS[Z.theme||'lava']:null),left=bk?bossLeft(bk):0;   // ตัวนับถอยหลังบอสเกิดใหม่
    if(left>0){const st=Z.bossRoom?null:Z.props.find(o=>o.k==='stairs');const txt=`⏳ ${FOES[bk].n} เกิดใหม่ใน ${fmtLeft(left)}`;
      if(st){const q=PJ.pt(st.x,st.y);outlineText(txt,clamp(q.x*S,150,810),(q.y-30*q.s)*S,13,'#ffd9a0');}else outlineText(txt,480,96,16,'#ffd9a0');}}
  for(const n of Z.npcs){const has=(n.id==='smith'&&G.q.main1.step<2)||(n.id==='girl'&&!G.flags.girlGave);if(!has)continue;
    const q=PJ.pt(n.x,n.y),bx=q.x*S,by=(q.y+(-24+Math.sin(G.t*.08)*1.5)*q.s)*S;D.fillStyle='#f4ead8';rrect(bx-14,by-10,28,18,6);D.fill();
    D.beginPath();D.moveTo(bx-4,by+8);D.lineTo(bx,by+14);D.lineTo(bx+4,by+8);D.fill();D.fillStyle='#2a1a20';D.font='800 16px Sarabun,sans-serif';D.textAlign='center';D.textBaseline='middle';D.fillText(n.id==='smith'?'!':'…',bx,by);}
  if(Z.id==='town'&&G.q.main1.step<2){const sm=Z.props.find(o=>o.inter==='in_smithy');if(sm){const q=PJ.pt(sm.x,sm.y-20),bx=q.x*S,by=(q.y+Math.sin(G.t*.08)*1.5)*S;D.fillStyle='#f4ead8';rrect(bx-14,by-10,28,18,6);D.fill();D.beginPath();D.moveTo(bx-4,by+8);D.lineTo(bx,by+14);D.lineTo(bx+4,by+8);D.fill();D.fillStyle='#b83228';D.font='800 16px Sarabun,sans-serif';D.textAlign='center';D.textBaseline='middle';D.fillText('!',bx,by);}}
  for(const e of Z.foes)if(e.alive&&!e.hidden){const d=FOES[e.kind],lv=foeLevel(d,Z.levelAt(Math.floor(e.x/16))),dy=d.boss?48:d.kind==='rig'?24:14;
    const col=lv>=G.level+3?'#ff5a4a':lv>=G.level+1?'#ffb03a':'#d8f0ff';
    outlineText(`${e.elite?'★ ':''}Lv.${lv}${d.boss?' 👑':''}`,PJ.pt(e.x,e.y).x*S,(PJ.pt(e.x,e.y).y-dy*PJ.pt(e.x,e.y).s)*S,12,e.elite?'#ffd23a':col);}
  (Z.ground||[]).filter(gi=>!gi.picked&&Math.hypot(gi.x-P.x,gi.y-P.y)<LOOT_CONFIG.ground.nameRange&&!(NEAR&&NEAR.o===gi)).sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y)).slice(0,3).forEach((gi,i)=>{
    outlineText((gi.owner!=='P1'?'🔒 ':'')+LootManager.name(gi.drop),PJ.pt(gi.x,gi.y).x*S,(PJ.pt(gi.x,gi.y).y-16*PJ.pt(gi.x,gi.y).s)*S-i*14,12,gi.owner!=='P1'?'#777':RARC[gi.drop.rar]);});
  if(P.castExit>0&&G.mode==='explore'){const q=PJ.pt(P.x,P.y);pill(q.x*S,(q.y-30*q.s)*S,`📜 กำลังร่ายวาร์ป... ${Math.ceil(P.castExit/60)} วิ`,'#7af0ff');}
  if(Z.id==='overworld'&&typeof OW!=='undefined')OW.drawUI();
  if(Z.theme==='spire'&&Z.puzzle){
    const rm=Z.roomAt?Z.roomAt(Math.floor(P.x/16)):'',bDead=!Z.foes.some(e=>e.alive&&FOES[e.kind]&&FOES[e.kind].boss),pzOk=Z.puzzle.solved;
    D.save();D.fillStyle='rgba(26,12,48,.82)';rrect(14,12,350,42,6);D.fill();D.strokeStyle='rgba(210,120,255,.65)';D.lineWidth=1;rrect(14,12,350,42,6);D.stroke();
    outlineText(`${Z.title} · ${rm}`,24,25,12,'#f2c4ff','left');
    outlineText(`บอสประจำชั้น: ${bDead?'✓ พิชิตแล้ว':'✕ ยังอยู่'} · ปริศนาผลึก: ${pzOk?'✓ ปลดล็อก':Z.puzzle.lit.length+'/3'}`,24,42,10.5,bDead&&pzOk?'#8affb8':'#ffd88a','left');
    D.restore();
  }
  if(NEAR&&G.mode==='explore'){const o=NEAR.o;const lab=NEAR.type==='item'?'เก็บ '+MATS[o.it].n:NEAR.type==='ground'?'เก็บ '+LootManager.name(o.drop):NEAR.type==='puzzle_rune'?`จุด${o.rn}`:LABEL[NEAR.type];{const q=PJ.pt(o.x,o.y);pill(q.x*S,(q.y-(NEAR.type==='npc'?30:26)*q.s)*S,'[E] '+lab);}}
  if(!G.miniOff)drawMinimap();
}
function drawMinimap(){
  if(Z.id==='overworld'&&typeof OW!=='undefined'){OW.drawMinimap();return;}
  const sc=Math.min(4,170/Z.cols),mx=960-Z.cols*sc-26,my=38;D.save();   // มินิแมปมุมขวาบน สไตล์ Final Fantasy Resonance
  {const fw=Z.cols*sc+16,fh=Z.rows*sc+32,fx=mx-8,fy=my-24;
    const mg=D.createLinearGradient(0,fy,0,fy+fh);mg.addColorStop(0,'rgba(12,30,78,.86)');mg.addColorStop(1,'rgba(4,12,34,.9)');
    D.fillStyle=mg;rrect(fx,fy,fw,fh,4);D.fill();
    D.strokeStyle='rgba(122,216,255,.72)';D.lineWidth=1.2;rrect(fx+.5,fy+.5,fw-1,fh-1,4);D.stroke();
    D.strokeStyle='rgba(255,217,138,.28)';D.lineWidth=1;rrect(fx+3,fy+3,fw-6,fh-6,3);D.stroke();
    D.fillStyle='rgba(255,217,138,.75)';D.fillRect(fx-1,fy+16,fw+2,1);}D.globalAlpha=.92;
  for(let y=0;y<Z.rows;y++)for(let x=0;x<Z.cols;x++){const c=Z.grid[y][x];D.fillStyle=c==='W'?'#3a78b8':c==='B'?'#8a6238':c===':'?'#8a826e':c==='.'?(Z.id==='town'?'#3a6a32':'#5a5048'):c==='L'?'#ff6a1a':c==='P'?'#4ad86a':c==='R'?'#8a7a6a':'#1a1414';D.fillRect(mx+x*sc,my+y*sc,Math.ceil(sc),Math.ceil(sc));}
  const dot=(x,y,c,r=2.5)=>{D.fillStyle=c;D.beginPath();D.arc(mx+x/16*sc,my+y/16*sc,r,0,7);D.fill();};
  for(const o of Z.props){if(o.k==='chest'&&!o.opened)dot(o.x,o.y,'#ffd23a',1.8);if(['gate','stairs','portal','citygate'].includes(o.k))dot(o.x,o.y,'#5ae0ff',2.5);if(o.k==='bossdoor')dot(o.x,o.y,'#ff4a4a',2.8);if(o.k==='exitdoor'||o.k==='exitup')dot(o.x,o.y,'#5aff7a',2.5);if(o.k==='anvil')dot(o.x,o.y,'#ff9a3a',2);}if(G.bloodstain&&G.bloodstain.zone===Z.id&&G.t%30<20)dot(G.bloodstain.x,G.bloodstain.y,'#ff2a2a',3);
  for(const n of Z.npcs)dot(n.x,n.y,'#6aff8a');
  for(const e of Z.foes)if(e.alive&&!e.hidden)dot(e.x,e.y,FOES[e.kind].boss?'#ff4af0':e.elite?'#ffd23a':'#ff4a4a',FOES[e.kind].boss?3.5:2.2);
  for(const gi of Z.ground||[])if(!gi.picked&&gi.owner==='P1')dot(gi.x,gi.y,RARC[gi.drop.rar],1.6);
  dot(P.x,P.y,'#fff',3);D.globalAlpha=1;
  {const rid=Z.regionAt(Math.floor(P.x/16)),zi=ZONE_INFO[rid]||(typeof SPIRE_ZONE_META!=='undefined'&&SPIRE_ZONE_META[rid])||(typeof OW!=='undefined'&&OW.zoneInfo(rid))||{n:Z.title||''};outlineText(zi.n,mx+Z.cols*sc/2,my-9,11,'#ffe3a0');}
  {const vw=W/16*sc,vh=H/16*sc;D.strokeStyle='rgba(255,255,255,.55)';D.lineWidth=1;D.strokeRect(mx+CAM.rx/16*sc,my+CAM.ry/16*sc,vw,vh);}D.restore();
}

/* ----- NPC dialog ----- */
const dlgEl=$('#dialog'),dWho=dlgEl.querySelector('.who'),dTx=dlgEl.querySelector('.tx');let DLG=null;
function say(lines,done){DLG={lines,i:0,done};G.mode='dialog';dlgEl.classList.remove('hidden');showLine();}
const dPt=dlgEl.querySelector('.pt');
// หาโมเดลของผู้พูด: NPC ในฉากที่ชื่อตรงกัน · ผู้เล่น · หรือ NPC ที่กำลังคุยด้วย
function speakerLook(w){if(!w)return null;try{const pn=(G.look&&G.look.name)||'';if(w==='คุณ'||(pn&&w===pn))return Equip.look();
  const n=(Z.npcs||[]).find(n=>n.name===w)||(Z.folk||[]).find(n=>n.name===w)||(NEAR&&(NEAR.type==='npc'||NEAR.type==='folk')&&NEAR.o&&DLG&&DLG.lines[0]&&DLG.lines[0][0]===w?NEAR.o:null);
  return n?(n._K=n._K||palLook(PAL[n.pal]||n.pal,n.id)):null;}catch(e){return null;}}
function drawSpeaker(K){const c=dPt.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,dPt.width,dPt.height);if(!K){dlgEl.classList.remove('hasPt');dPt.style.display='none';return;}
  dPt.style.display='';dlgEl.classList.add('hasPt');const Pz=poseIdle(0),J=rigPoints(Pz),sc=5.2;c.imageSmoothingEnabled=false;
  const gl=c.createRadialGradient(60,70,4,60,70,70);gl.addColorStop(0,'rgba(150,200,255,.35)');gl.addColorStop(1,'rgba(150,200,255,0)');c.fillStyle=gl;c.fillRect(0,0,120,160);
  try{drawRig(c,60-J.hd[0]*sc,52-J.hd[1]*sc,sc,1,Pz,K);}catch(e){dlgEl.classList.remove('hasPt');dPt.style.display='none';}}
function showLine(){const[w,t]=DLG.lines[DLG.i];dWho.textContent=w;dWho.style.display=w?'':'none';dTx.textContent=t;drawSpeaker(speakerLook(w));SFX.talk();}
/* ----- Cutscene เปิดเกม: เดินจากประตูเข้ากลางเมือง -> พูดกับตัวเอง -> เดินไปกิลด์ -> จอดำตัดเข้ากิลด์ -> สมัครกิลด์รับ Rank F ----- */
const Cutscene={
  active:null,fade:0,step:0,t:0,_internal:false,
  startIntro(){
    this.active='intro';this.step=0;this.t=0;this.fade=1;this._internal=true;
    if(!TOWN)TOWN=makeTown();
    loadZone(TOWN,T(23,29,8,8));
    this._internal=false;
    P.dir4='up';P.face=1;P.moving=false;G.mode='cutscene';
  },
  abort(){this.active=null;this.fade=0;this.step=0;P.moving=false;DLG=null;dlgEl&&dlgEl.classList.add('hidden');},
  walkTo(tx,ty,spd=1.35){
    const dx=tx-P.x,dy=ty-P.y,d=Math.hypot(dx,dy);
    if(d<=spd){P.x=tx;P.y=ty;P.moving=false;return true;}
    P.x+=dx/d*spd;P.y+=dy/d*spd;P.moving=true;P.anim+=.16;
    if(Math.abs(dx)>=Math.abs(dy)){P.face=dx>0?1:-1;P.dir4=dx>0?'right':'left';}
    else P.dir4=dy>0?'down':'up';
    return false;
  },
  skip(){
    if(!this.active)return;
    DLG=null;dlgEl&&dlgEl.classList.add('hidden');
    this._internal=true;
    if(!Z||Z.id!=='in_guild')enterInterior('in_guild');
    const desk=T(10,7,8,14);P.x=desk.x;P.y=desk.y;P.dir4='up';P.moving=false;
    this._internal=false;
    this.finish();
  },
  finish(){
    this.active=null;this.fade=0;this.step=0;P.moving=false;
    G.guildRank='F';G.guildPromo=G.guildPromo||{};G.flags.introDone=1;G.flags.pendingIntroCS=0;
    G.mode='explore';
    UI.hud&&UI.hud();SFX.level&&SFX.level();
    toast('🎖️ สมัครกิลด์นักผจญภัยสำเร็จ! ได้รับแรงค์เริ่มต้น: Rank F',3800);
    Save.save&&Save.save();
  },
  tick(){
    if(!this.active)return;
    if(tap('Escape')){this.skip();return;}
    updFolk();
    this.t++;
    const pn=pname(),fem=G.look&&G.look.sex==='f',pol=fem?'ค่ะ':'ครับ';
    switch(this.step){
      case 0: // เฟดเข้าจากจอดำที่ประตูเมืองด้านใต้
        this.fade=Math.max(0,this.fade-1/24);
        if(this.fade<=0&&this.t>=28){this.step=1;this.t=0;}
        break;
      case 1: // เดินจากประตูเมืองเข้ามายังใจกลางเมือง
        if(this.walkTo(23*16+8,19*16+8,1.35)){this.step=2;this.t=0;}
        break;
      case 2: // หยุดกลางเมือง แล้วหันซ้าย - หันขวา
        P.moving=false;
        if(this.t===6){P.dir4='left';P.face=-1;}
        else if(this.t===34){P.dir4='right';P.face=1;}
        else if(this.t===62){P.dir4='down';}
        else if(this.t>=76){
          this.step=3;this.t=0;
          say([[pn,'นี่คือการเริ่มต้นการผจญภัยของฉัน...'],
            [pn,'ว่าแต่ฉันต้องทำอะไรในตอนแรกนี้กันนะ?'],
            [pn,'อ๋อ ใช่สิ! การที่เราจะเริ่มผจญภัยได้ เราต้องมีกิลด์ผจญภัยก่อน'],
            [pn,'เอาล่ะ ไปสมัครกิลด์ผจญภัยดีกว่า! งั้นเดินไปที่กิลด์กัน']],()=>{this.step=4;this.t=0;});
        }
        break;
      case 4: // เดินขึ้นถนนหลักแล้วเลี้ยวขวาตรงไปประตูหน้ากิลด์นักผจญภัย
        if(this.walkTo(23*16+8,17*16+8,1.4)){this.step=5;this.t=0;}
        break;
      case 5:
        if(this.walkTo(42*16+8,17*16+8,1.5)){this.step=6;this.t=0;}
        break;
      case 6:
        if(this.walkTo(42*16+8,16*16+4,1.35)){this.step=7;this.t=0;P.dir4='up';}
        break;
      case 7: // แอนิเมชันจอดำ ตัดเข้าภายในกิลด์นักผจญภัย
        this.fade=Math.min(1,this.fade+1/24);
        if(this.fade>=1&&this.t>=30){
          this._internal=true;enterInterior('in_guild');this._internal=false;
          P.dir4='up';P.moving=false;this.step=8;this.t=0;
        }
        break;
      case 8: // เฟดสว่างภายในกิลด์
        this.fade=Math.max(0,this.fade-1/24);
        if(this.fade<=0&&this.t>=24){this.step=9;this.t=0;}
        break;
      case 9: // เดินจากประตูหน้ากิลด์ขึ้นพรมแดงแล้วไปหน้าเคาน์เตอร์พนักงานต้อนรับ
        if(this.walkTo(15*16,7*16+14,1.3)){this.step=10;this.t=0;}
        break;
      case 10:
        if(this.walkTo(10*16+8,7*16+14,1.25)){this.step=11;this.t=0;P.dir4='up';}
        break;
      case 11: // คุยกับพนักงานต้อนรับอิริสเพื่อสมัครเข้ากิลด์ -> รับแรงค์ F
        if(this.t>=12){
          this.step=12;this.t=0;
          say([[pn,`ขอโทษนะ${pol} ฉันอยากมาสมัครเป็นนักผจญภัยเข้ากิลด์ ต้องทำยังไงบ้าง${pol}?`],
            ['อิริส','ยินดีต้อนรับสู่กิลด์นักผจญภัยคอลลาวาร์รีค่ะ! ยิ่งช่วงนี้แสงเอเธอร์สั่นคลอน เรายินดีรับนักผจญภัยหน้าใหม่เสมอค่ะ'],
            ['อิริส','กรอกข้อมูลเรียบร้อยแล้วค่ะ! ตั้งแต่วันนี้คุณเป็นสมาชิกกิลด์อย่างเป็นทางการ — ได้รับแรงค์เริ่มต้น [Rank F] ค่ะ'],
            ['อิริส','แรงค์กิลด์มีทั้งหมด 7 ขั้น ได้แก่ F → G → D → C → B → A → S เมื่อเลเวลถึงเกณฑ์และทำเควสต์เลื่อนขั้นสำเร็จ มาเลื่อนขั้นกับฉันได้เลยค่ะ'],
            ['อิริส','ลองตรวจดูกระดานเควสต์ตรงกลางโถง และแวะหาช่างตีเหล็กโบโรที่โรงตีเหล็กในเมืองเพื่อเตรียมอาวุธด้วยนะคะ ขอให้โชคดีในการผจญภัย!']],()=>this.finish());
        }
        break;
    }
  }
};
function nextLine(){if(!DLG)return;DLG.i++;if(DLG.i>=DLG.lines.length){const d=DLG.done;DLG=null;dlgEl.classList.add('hidden');G.mode=typeof Cutscene!=='undefined'&&Cutscene.active?'cutscene':'explore';d&&d();}else showLine();}
dlgEl.addEventListener('click',nextLine);
function talk(id){
  const q=G.q.main1,nm=((Z.npcs||[]).find(n=>n.id===id)||{}).name;
  if(id==='merchant'||id==='shopkeeper'||id==='guildshop'){UI.open('shop');return;}
  if(id==='alchemist'){UI.alSel=[];UI.alRes=null;UI.open('alchemy');return;}
  if(id==='guildmaster'){
    const gm=nm||'อิริส';
    if(!G.guildRank){G.guildRank='F';G.flags.introDone=1;UI.hud&&UI.hud();}
    const cur=Guild.info(),nxt=Guild.next(),pr=Guild.canPromote();
    if(pr.ok){
      say([[gm,`ยินดีด้วยค่ะ! คุณมีคุณสมบัติครบสำหรับเลื่อนขึ้นเป็น [Rank ${nxt.id} — ${nxt.n}] แล้ว!`]],()=>Guild.promote());
      return;
    }
    const rankLine=nxt
      ?`แรงค์ปัจจุบันของคุณคือ [Rank ${cur.id} — ${cur.n}] ค่ะ (กิลด์มี 7 ขั้น: F → G → D → C → B → A → S) · ขั้นถัดไป Rank ${nxt.id}: ${pr.reason}`
      :`สุดยอดมากค่ะ! คุณขึ้นถึงจุดสูงสุดของกิลด์ [Rank S — ${cur.n}] แล้ว!`;
    say([[gm,'ยินดีต้อนรับสู่กิลด์นักผจญภัยคอลลาวาร์รี! กระดานเควสต์ตรงกลางโถงรวบรวมภารกิจปราบสัตว์ประหลาดจากรอยแยกไว้ทั้งหมดแล้ว'],
      [gm,rankLine],
      [gm,'แวะเติมยาที่เคาน์เตอร์ของทริสตันฝั่งขวา แล้วตรวจดูกระดานเควสต์ได้ตลอดเวลา — แม้แต่คนธรรมดาก็พิสูจน์ตัวเป็นผู้กล้าได้นะคะ!']]);
    return;
  }
  if(id==='southguard'){UI.open(Z.id==='city'?'cityexit':'southgate');return;}
  if(id==='guard'){const g=nm||'กาเรธ';say([[g,'แสงเอเธอร์บนฟ้าสั่นไหวไม่หยุด ประตูใต้รอยแยกเริ่มแง้มออกจนฝูงมอนสเตอร์ทะลักเข้าถ้ำชีส — เจ้าพร้อมจะพิสูจน์ตัวหรือยัง?'],[g,'ศัตรูที่ล้มลงจะทิ้งไอเท็มไว้บนพื้น รีบเก็บภายใน 2 นาทีล่ะ สีม่วงคือระดับตำนาน สีทองคือระดับเทพ!']]);return;}
  if(id==='smith'){const s=nm||'โบโร';
    if(q.step===0)say([[s,'เมื่อแสงเอเธอร์สั่น ประตูใต้รอยแยกก็ขยับ... หินเอเธอร์ทั้งแปดหายไป และความว่างเปล่าที่หิวโหยกำลังส่งสัตว์ประหลาดออกมา'],
      [s,'คนอื่นหนีออกจากคอลลาวาร์รีไปหมดแล้ว เหลือแค่คนธรรมดาอย่างเจ้าที่ยังยืนอยู่ตรงนี้ — พิสูจน์ให้โลกเห็นด้วยดาบเหล็กจากทั่งของข้า!'],
      [s,'ลงถ้ำชีสหาวัตถุดิบแล้วมาตีอาวุธที่โต๊ะตีเหล็กข้างข้า มีค้างคาเงาชื่อ "คาเงะ" และโกเลมหินขวางทางหินเอเธอร์ก้อนแรกอยู่'],
      [s,'วางวัตถุดิบลงช่องบนโต๊ะ สูตรพื้นฐานข้าจดไว้ให้แล้ว ส่วนสูตรขั้นสูงหาได้จากคัมภีร์และผู้คน · ถ้ามีคริสตัลศักดิ์สิทธิ์ 💎 โอกาสสำเร็จจะเพิ่มอีก 20%'],
      [s,'กด C ดูค่าพลัง, I ดูอุปกรณ์, K ตั้งสกิล, Q ดูเควสต์ — ออกไปนำหินเอเธอร์กลับมาเถอะ!']],()=>{Quest.advance('main1',1);});
    else if(q.step===1)say([[s,'ยังไม่มีดาบรึ? วางไม้ 1 กับแร่เหล็ก 1 ลงช่องบนโต๊ะ จะได้ดาบเหล็กโบโรไว้รับมือฝูงสัตว์จากรอยแยก']]);
    else if(!G.flags.gotGauntScroll){G.flags.gotGauntScroll=1;Inv.add('sc_gaunt');say([[s,'ถือดาบไว้แล้วสินะ! นี่คือคัมภีร์สูตรสนับมือสายฟ้า — แม้แต่คนธรรมดาก็โค่นผู้พิทักษ์ได้ด้วยฝีมือ'],[s,'หินถล่มทางขวาของถ้ำชั้นในปิดเส้นทางสู่หินแห่งรอยแยกอยู่ ทุบมันเปิดซะ']]);}
    else if(!G.flags.golemDown)say([[s,'คาเงะเป็นผู้พิทักษ์ที่ถูกแสงหินบิดเบือน มันป้องกันเก่ง ใช้ท่ากวาดขา (↓+K) ให้เสียหลัก ส่วนโกเลมศิลา หลังทุบพื้นแกนกลางจะเปิดออก!']]);
    else say([[s,'หินก้อนแรกกลับมาอยู่ในมือเจ้าแล้ว! แต่ประตูรอยแยกยังไม่ปิดจนกว่าหินทั้งแปดจะครบ — ประตูเหมืองลาวาในถ้ำคริสตัลรอเจ้าอยู่']]);
  }else{const l=nm||'ไลร่า';
    if(!G.flags.girlGave)say([[l,'ตั้งแต่หินเอเธอร์หายไป ประตูใต้รอยแยกก็แง้มออก... ฝูงหนูถ้ำหนีความว่างเปล่าขึ้นมาอาละวาดทุกคืนเลย'],[l,'ฉันเก็บหินประหลาดกับคัมภีร์เก่าเล่มนี้ไว้ได้ แต่เธอคงใช้มันปกป้องเมืองได้ดีกว่า ฝากจัดการหนูถ้ำ 3 ตัวทีนะ']],
      ()=>{G.flags.girlGave=1;Inv.add('thunder');Inv.add('sc_flame');Quest.activate('hunt');toast('ได้รับ ⚡ หินสายฟ้า และ 📘 คัมภีร์สูตร: ดาบเพลิง (ใช้ในหน้ากระเป๋า)');SFX.pick();});
    else{const tips=['ไม่ได้มีแค่เราที่ออกตามหาหินเอเธอร์ ทั้งนักล่าค่าหัว สาวกเงา และนักแปรธาตุต่างก็เคลื่อนไหวแล้ว ระวังตัวด้วยนะ','ถ้าเป้าหมายกำลังเผาไหม้แล้วโดนช็อก จะเกิดระเบิดพลาสมา — ใช้รับมือมอนสเตอร์ที่กลายพันธุ์จากรอยแยกได้ดีมาก',
      'ศัตรูที่มีดาว ★ คือผู้พิทักษ์ที่ถูกแสงหินบิดเบือน จนจำศัตรูและมิตรไม่ได้แล้ว','คอมโบที่ทำครบชุดจะแรงขึ้น 20% หมั่นฝึกในหน้าสกิล (K) เพื่อพิสูจน์ว่าคนธรรมดาก็เป็นผู้กล้าได้'];say([[l,tips[(G.flags.tip=(G.flags.tip||0)+1)%tips.length]]]);}
  }
}
