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
    props:[{k:'exitup',...T(2,10,8,12),hw:6,inter:'town'},{k:'exitdoor',...T(2,3,8,14),hw:7,inter:'town'},{k:'exitdoor',...T(27,3,8,14),hw:7,inter:'town'},
      {k:'cheese',...T(16,3,8,15),hw:9},{k:'cheese',...T(17,3,10,15),hw:9},{k:'barrel',...T(2,14,8,12),hw:6},{k:'barrel',...T(17,14,8,12),hw:6},{k:'barrel',...T(18,14,6,12),hw:6},
      {k:'crystal',...T(22,13,8,12),hw:5},{k:'crystal',...T(27,5,8,12),hw:5},{k:'crystal',...T(28,12,4,12),hw:5},
      {k:'chest',...T(5,14,8,12),hw:7,inter:'chest',content:{base:'a_leather',rar:'normal',mat2:'sk_orb'}},
      {k:'chest',...T(11,7,8,12),hw:7,inter:'chest',content:{mat:'sc_hammer',mat2:'sk_poisondart'},hidden:1},
      {k:'chest',...T(16,12,8,12),hw:7,inter:'chest',content:{base:'b_wind',rar:'rare',mat2:'sk_rising'}},
      {k:'chest',...T(21,14,8,12),hw:7,inter:'chest',content:{base:'h_iron',rar:'rare',mat:'sc_reset'}},
      {k:'chest',...T(28,7,8,12),hw:7,inter:'chest',content:{base:'r_luck',rar:'rare',mat:'rune_crit'}},
      {k:'gate',...T(23,3,8,14),hw:9,inter:'gate'}],
    items:[{it:'wood',...T(11,13)},{it:'wood',...T(4,9)},{it:'wood',...T(12,4)},{it:'wood',...T(7,14)},
      {it:'ore',...T(15,8)},{it:'ore',...T(8,12)},{it:'ore',...T(18,6)},{it:'ore',...T(6,10)},
      {it:'fire',...T(17,10)},{it:'cheese',...T(15,4)},{it:'fire',...T(23,7)},{it:'pan',...T(27,14)},{it:'thunder',...T(26,13)}],
    npcs:[],
    foes:[mkFoe('rat',T(10,9),{respawnable:1,bound:19*16-6}),mkFoe('rat',T(14,6),{respawnable:1,bound:19*16-6}),mkFoe('rat',T(6,12),{respawnable:1,bound:19*16-6}),
      mkFoe('kage',T(21,9,8,0))]};
}
/* ----- TOWN (safe hub): NPCs, forge, fountain, shop, quest board, dungeon entrance ----- */
/* เมือง Collawarrie (48×32 ช่อง — กล้องเลื่อนตามตัวละคร) ถนน : คลอง W สะพาน B ถ้ำชีสอยู่ขวาสุด ถ้ำน้ำแข็งอยู่ซ้ายสุด ลานประลองอยู่กลางสี่แยก */
const TOWN_COLS=48,TOWN_ROWS=32;
function makeTownGrid(){
  const C=TOWN_COLS,R=TOWN_ROWS,gr=[];
  for(let y=0;y<R;y++){const row=Array(C).fill('.');
    if(y<2||y>=R-2)row.fill('#');else if(y===2)for(let x=0;x<C;x++)row[x]=(x%8===3)?'T':'^';
    row[0]=row[C-1]='#';gr.push(row);}
  const fill=(x0,y0,x1,y1,ch)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)gr[y][x]=ch;};
  fill(1,17,C-2,18,':');fill(1,9,C-2,10,':');                     // ถนนใหญ่แนวนอน 2 สาย
  for(const x of[10,23,36])fill(x,3,x+1,R-3,':');                  // ถนนแนวตั้ง 3 สาย (สายกลางคือถนนใหญ่)
  fill(1,23,C-2,24,'W');                                          // คลอง
  for(const x of[10,23,36])fill(x,23,x+1,24,'B');                   // สะพานไม้
  fill(40,4,44,6,'W');                                            // สระน้ำมุมขวาบน
  return gr;
}
function makeTown(){
  const grid=makeTownGrid(),water=[];
  for(let y=0;y<grid.length;y++)for(let x=0;x<grid[0].length;x++)if(grid[y][x]==='W')water.push({x,y});
  const roofs=['#a8382a','#2a5aa8','#3a8a4a','#8a5a2a','#7a3a8a','#2a8a8a'];let ri=0;const H=(tx,ty)=>({k:'house',...T(tx,ty,8,14),hw:26,roof:roofs[ri++%roofs.length]});
  return{id:'town',grid,cols:TOWN_COLS,rows:TOWN_ROWS,water,spawn:T(23,21,16,8),gate:T(45,17,8,12),icegate:T(4,19,8,12),stonegate:T(23,28,16,14),safe:1,levelAt:()=>1,regionAt:()=>'town',biomeAt:()=>'town',
    props:[H(5,7),H(17,7),Object.assign(H(30,7),{sign:'store',inter:'store'}),H(5,15),Object.assign(H(17,15),{sign:'smith',inter:'smithy'}),H(17,22),H(42,22),H(5,28),H(17,28),H(30,28),H(42,28),
      {k:'anvil',...T(26,15,8,14),hw:10,inter:'craft'},{k:'fountain',...T(31,13,8,14),hw:14,inter:'fountain'},
      {k:'stall',...T(32,20,8,14),hw:18,inter:'shop'},{k:'board',...T(34,15,8,14),hw:8,inter:'board'},
      {k:'cavegate',...T(46,17,8,12),hw:10,inter:'dungeon'},{k:'duelpost',...T(38,10,8,14),hw:8,inter:'duel'},{k:'icegate',...T(2,17,8,12),hw:10,inter:'icedungeon'},{k:'stonegate',...T(23,29,16,12),hw:12,inter:'stonedungeon'},{k:'arena',...T(23,17,16,16),hw:10,inter:'arena'},
      ...[[3,3],[14,3],[20,3],[27,3],[33,3],[46,4],[2,12],[46,12],[2,26],[46,26],[13,26],[27,26],[34,26],[20,12],[14,20],[39,20]].map(([x,y])=>({k:'tree',...T(x,y,10,14),hw:6})),
      ...[[21,6],[26,6],[21,13],[26,13],[21,20],[26,20],[8,13],[13,13],[35,6],[38,6]].map(([x,y])=>({k:'lamp',...T(x,y,8,4),hw:3}))],
    items:[],npcs:[{id:'smith',name:'โบโร',...T(25,15),pal:'smith',face:1,hw:5},{id:'reitem',name:'Re-Item Master',...T(20,21),pal:'kage',face:1,hw:5},{id:'girl',name:'มิลิน',...T(28,12),pal:'girl',face:-1,hw:5},
      {id:'merchant',name:'ลุงชาย',...T(31,19),pal:'smith',face:1,hw:5},{id:'guard',name:'ทหารยาม',...T(44,15),pal:'kage',face:-1,hw:5}],foes:[Object.assign(mkFoe('duelist',T(38,13,8,6)),{challenge:1,alive:!G.flags.duelWon})],ground:[]};
}
let TOWN=null;
/* ----- modular dungeon: 10×12 room chunks assembled into a 30×17 floor ----- */
const CHUNKS=[
 ["..........","..##...M..","..##......","......LL..",".E....LL..","..........","..........","..M....E..","...LL.....","...LL..##.",".C.....##.",".........."],
 ["..........",".LLL..LLL.",".L.E...ML.",".L......L.","..........","..........","..........","....##....",".E..##..C.","....##....","..M.......",".........."],
 ["...M......","..........",".##....##.",".##.E..##.","..........","..........","..........","LLL....LLL","LLL.M..LLL","..........","..E....C..",".........."],
 ["..........","..M..LL...",".....LL.E.","..........","LL........","..........","..........","........LL","..E.......","...##.....",".C.##..M..",".........."]];
const BOSS_CHUNK=["....................","..LL............LL..","..LL............LL..","....................","....................","....................","....................","....................","..LL............LL..","..LL............LL..","....................","...................."];
function makeDungeon(floor,theme){
  const th=theme||'lava',ice=th==='ice',stone=th==='stone',lava=th==='lava',id=th+floor,info=ZONE_INFO[id],grid=[];
  for(let y=0;y<17;y++)grid.push(Array(30).fill('#'));
  for(let x=1;x<29;x++)grid[2][x]=x%6===3?'T':'^';
  const parts=floor===3&&lava?[pick(CHUNKS),BOSS_CHUNK]:[pick(CHUNKS),pick(CHUNKS),pick(CHUNKS)];
  const props=[],items=[],foes=[];let cx=0;
  const lavaTiles=[];
  for(const ch of parts){const w=ch[0].length;
    for(let r=0;r<12;r++)for(let c=0;c<w;c++){const tx=cx+c,ty=3+r;if(tx<1||tx>28)continue;let s=ch[r][c];
      if(r===5||r===6)s=s==='L'||s==='#'?'.':s;   // guaranteed corridor
      grid[ty][tx]=s==='#'||(s==='L'&&stone)?'#':s==='L'&&lava?'L':'.';
      if(s==='L'&&lava)lavaTiles.push({x:tx*16+8,y:ty*16+8});
      if(s==='E')foes.push(mkFoe(stone?(floor===2&&rand()<.2?'rockling':pick(['rat','rat','mudslime','mudslime','rockling'])):ice?(floor===2&&rand()<.15?'icegolem':pick(['frostslime','frostslime','frostwolf','frostwolf','iceknight'])):rand()<.65?'lavarat':'shade',T(tx,ty,8,8)));
      if(s==='M')items.push({it:pick(stone?['ore','ore','wood','hide','thunder']:['lavaore','lavaore','fire','ore','hide']),...T(tx,ty)});
      if(s==='C')props.push({k:'chest',...T(tx,ty,8,12),hw:7,inter:'chest',content:{loot:stone?'stonecave':ice?'icecave':'lavarat',skill:.25}});}
    cx+=w;}
  for(let x=1;x<29;x++)grid[15][x]='.';
  if(floor===2&&lava)props.push({k:'chest',...T(2,15,8,12),hw:7,inter:'chest',content:{mat:'sc_god',mat2:'divine'},hidden:1});
  for(let y=3;y<=9;y++)for(let x=1;x<=3;x++)grid[y][x]='.';   // clear path from spawn to the exit door
  for(let i=lavaTiles.length-1;i>=0;i--){const l=lavaTiles[i];if(l.x<64&&l.y<10*16)lavaTiles.splice(i,1);}props.push({k:'exitdoor',...T(2,3,8,14),hw:7,inter:'town'});
  if(floor<3)props.push({k:'stairs',...T(28,9,8,10),hw:6,inter:'stairs'});
  if(floor===3&&lava){foes.length=0;foes.push(mkFoe('lavaking',T(22,9,8,6)),mkFoe('shade',T(14,6,8,8)),mkFoe('shade',T(14,12,8,8)));
    props.push({k:'portal',...T(27,9,8,10),hw:6,inter:'portal',locked:1});}
  return{id,grid,spawn:T(1,9),levelAt:()=>info.lv,regionAt:()=>id,biomeAt:()=>stone?'cave':ice?'ice':'lava',props,items,npcs:[],foes,lavaTiles,floor,theme:th};
}
/* ห้องบอสแยก — เข้าแล้วออกไม่ได้ (ประตูออก/พอร์ทัลล็อก) จนกว่าจะชนะ หรือตาย */
const BOSS_ROOMS={golem:{id:'golemroom',biome:'crystal',theme:'stone'},lavaking:{id:'lava3',biome:'lava',theme:'lava'},seraph:{id:'sanctum',biome:'sanctum',theme:'ice'}};
function makeBossRoom(kind){
  const R=BOSS_ROOMS[kind],grid=[];for(let y=0;y<17;y++)grid.push(Array(30).fill('#'));
  for(let x=1;x<29;x++)grid[2][x]=x%6===3?'T':'^';
  for(let y=3;y<16;y++)for(let x=1;x<29;x++)grid[y][x]='.';
  for(const [x,y] of [[7,5],[7,13],[14,5],[14,13],[21,4],[21,14]])grid[y][x]='#';
  const need='🔒 ผนึกบอส — ต้องปราบ '+FOES[kind].n+' ก่อนจึงจะออกได้';
  const props=[{k:'exitdoor',...T(2,3,8,14),hw:7,inter:'town',locked:1,need},{k:'portal',...T(27,9,8,10),hw:6,inter:'portal',locked:1,need}];
  return{id:R.id,grid,spawn:T(2,9),levelAt:()=>ZONE_INFO[R.id].lv,regionAt:()=>R.id,biomeAt:()=>R.biome,props,items:[],npcs:[],foes:[mkFoe(kind,T(22,9,8,6),{cool:100})],lavaTiles:[],floor:3,theme:R.theme,bossRoom:kind,cleared:0};
}
function makeSanctum(){return makeBossRoom('seraph');}
function enterBossRoom(kind){loadZone(makeBossRoom(kind));G.shake=6;SFX.hit(true);toast(`⚔️ ${ZONE_INFO[BOSS_ROOMS[kind].id].n} — ประตูถูกผนึก! ชนะหรือตายเท่านั้น`,3500);}
function bossConfirm(o,kind,go){
  if(o.confirm&&G.t-o.confirm<900){o.confirm=0;go();return;}
  say([['','⚠️ ด้านหน้าคือห้องบอส: '+FOES[kind].n+' — เข้าแล้วจะออกไม่ได้ และหนีไม่ได้ จนกว่าจะชนะหรือตาย'],['','กด E อีกครั้งภายใน 15 วินาทีเพื่อเข้า (ตอนนี้เลเวล '+G.level+')']],()=>{o.confirm=G.t;});
}
let CAVE=null;
const CHEST_SKILLS=['sk_orb','sk_poisondart','sk_rising','sk_slashwave','sk_rushkick','sk_thunderclap'];  // dungeon random chests roll from this list
const CAM={x:0,y:0,rx:0,ry:0,snap:1,zone:null};
function loadZone(z,spawn){Z=z;const sp=spawn||z.spawn;P.x=sp.x;P.y=sp.y;{const bs=G.bloodstain;if(bs&&bs.zone===z.id&&blocked(bs.x,bs.y)){bs.x=z.spawn.x+24;bs.y=z.spawn.y;}}Z.cols=Z.grid[0].length;Z.rows=Z.grid.length;CAM.snap=1;Z.torches=[];Z.grid[2].forEach((c,i)=>{if(c==='T')Z.torches.push({x:i*16+8,y:2*16+8});});
  for(const f of Z.foes)if(f.alive)Ency.see(f.kind,foeLevel(FOES[f.kind],Z.levelAt(Math.floor(f.x/16))));
  if(z.id==='town'&&!z.folk)z.folk=makeFolk();
  buildBg();G.visited=G.visited||{};G.visited[Z.regionAt(Math.floor(P.x/16))]=1;}
const World={
  serialize(){const c=CAVE;return{rubble:c.rubbleOpen,items:c.items.map(i=>!!i.taken),chests:c.props.map(p=>!!p.opened),
    foes:c.foes.map(f=>({alive:f.alive,elite:f.elite})),zone:Z&&(Z.id==='town'||Z.bossRoom)?'town':'cave',pos:Z&&Z.bossRoom?{x:TOWN.gate.x,y:TOWN.gate.y}:Z&&(Z.id==='cave'||Z.id==='town')?{x:P.x,y:P.y}:T(23,4,8,14),visited:G.visited||{}};},   // ground items intentionally not saved
  restore(d){CAVE=makeCave();TOWN=makeTown();if(d){CAVE.rubbleOpen=d.rubble;if(d.rubble){CAVE.grid[8][19]='.';CAVE.grid[9][19]='.';}
    d.items.forEach((t,i)=>{if(CAVE.items[i])CAVE.items[i].taken=t;});d.chests.forEach((o,i)=>{if(CAVE.props[i])CAVE.props[i].opened=o;});
    d.foes.forEach((f,i)=>{if(CAVE.foes[i]){CAVE.foes[i].alive=f.alive;CAVE.foes[i].elite=f.elite;}});G.visited=d.visited||{};}
    if(d&&d.zone==='town'){loadZone(TOWN,d.pos);if(blocked(P.x,P.y)||P.x>=TOWN_COLS*16||P.y>=TOWN_ROWS*16){P.x=TOWN.spawn.x;P.y=TOWN.spawn.y;}}else if(d)loadZone(CAVE,d.pos);else loadZone(TOWN);}
};

/* ----- background ----- */
const BIOME={town:{floor:[92,132,72],line:'rgba(30,60,20,.25)',top:'#1e3a1a',face:['#9a9488','#6a665c'],road:[150,138,118]},cave:{floor:[114,92,70],line:'rgba(40,25,16,.55)',top:'#1c1311',face:['#5c3e2a','#3a2618']},
  crystal:{floor:[70,72,94],line:'rgba(20,20,40,.55)',top:'#16141e',face:['#3e3a4c','#2a2836']},
  lava:{floor:[74,52,46],line:'rgba(30,10,8,.6)',top:'#140c0a',face:['#4a2a20','#2a1612']},
  ice:{floor:[150,184,204],line:'rgba(30,60,90,.45)',top:'#34506a',face:['#8ab0c8','#5a7e98']},
  sanctum:{floor:[84,104,98],line:'rgba(10,24,24,.5)',top:'#141c24',face:['#4a6a64','#2a403c']}};
function buildBg(){
  const grid=Z.grid,C=Z.cols,Rw=Z.rows;bgC.width=Math.max(W,C*16);bgC.height=Math.max(H,Rw*16);B.fillStyle='#0d0808';B.fillRect(0,0,bgC.width,bgC.height);
  for(let ty=0;ty<Rw;ty++)for(let tx=0;tx<C;tx++){
    const ch=grid[ty][tx],px=tx*16,py=ty*16,bi=BIOME[Z.biomeAt(tx,ty)],h=hash(tx+(Z.floor||0)*7,ty);
    if(ch==='.'||ch==='R'||ch==='L'||ch===':'){
      const v=(h-.5)*18,b=ch===':'&&bi.road?bi.road:bi.floor;B.fillStyle=`rgb(${b[0]+v|0},${b[1]+v|0},${b[2]+v|0})`;B.fillRect(px,py,16,16);
      B.fillStyle=bi.line;B.fillRect(px,py,16,1);B.fillRect(px+(ty%2?0:8),py,1,16);
      B.fillStyle='rgba(255,240,210,.07)';B.fillRect(px+1,py+1,14,1);
      for(let i=0;i<3;i++){B.fillStyle='rgba(0,0,0,.2)';B.fillRect(px+(hash(tx*3+i,ty*7)*15|0),py+(hash(tx*5,ty*3+i)*15|0),1,1);}
      if(h>.88){B.fillStyle='rgba(0,0,0,.28)';B.fillRect(px+4,py+7,5,1);B.fillRect(px+8,py+8,3,1);}
      if(ty>0&&'^T#'.includes(grid[ty-1][tx])){const gr=B.createLinearGradient(0,py,0,py+8);gr.addColorStop(0,'rgba(0,0,0,.6)');gr.addColorStop(1,'rgba(0,0,0,0)');B.fillStyle=gr;B.fillRect(px,py,16,8);}
      if(tx>0&&grid[ty][tx-1]==='#'){B.fillStyle='rgba(0,0,0,.3)';B.fillRect(px,py,4,16);}
      if(ch==='L'){B.fillStyle='#c4380e';B.fillRect(px,py,16,16);B.fillStyle='#ff7a1a';B.fillRect(px+2,py+3,12,10);B.fillStyle='#ffd04a';
        B.fillRect(px+3+(h*6|0),py+5,4,2);B.fillRect(px+8,py+9+(h*2|0),5,2);B.fillStyle='rgba(0,0,0,.35)';B.fillRect(px,py,16,2);}
      if(ch==='R'){for(let i=0;i<7;i++){const rx=px+2+hash(px+i,py)*12,ry=py+2+hash(py+i,px)*12,r=3+hash(i,px+py)*3;
        B.fillStyle='#4b4038';B.beginPath();B.arc(rx,ry,r,0,7);B.fill();B.fillStyle='#7a6a5c';B.beginPath();B.arc(rx-1,ry-1,r*.5,0,7);B.fill();}}
    }else if(ch==='#'){B.fillStyle=bi.top;B.fillRect(px,py,16,16);for(let i=0;i<4;i++){B.fillStyle='rgba(255,255,255,.05)';B.fillRect(px+(hash(tx+i,ty)*14|0),py+(hash(ty+i,tx)*14|0),2,1);}
      if(ty>2&&ty<Rw-1&&grid[ty+1]&&grid[ty+1][tx]!=='#'){B.fillStyle=bi.face[1];B.fillRect(px,py+12,16,4);}}
    else if(ch==='W'||ch==='B'){const v=(h-.5)*14;B.fillStyle=`rgb(${48+v|0},${112+v|0},${170+v|0})`;B.fillRect(px,py,16,16);B.fillStyle='rgba(20,60,110,.35)';B.fillRect(px,py+(ty%2?8:0),16,1);
      B.fillStyle='rgba(255,255,255,.10)';B.fillRect(px+(h*10|0),py+3+(h*8|0),4,1);
      if(ty>0&&grid[ty-1][tx]!=='W'&&grid[ty-1][tx]!=='B'){B.fillStyle='rgba(0,0,0,.28)';B.fillRect(px,py,16,3);}
      if(ch==='B'){B.fillStyle='#7a5530';B.fillRect(px,py,16,16);for(let i=0;i<4;i++){B.fillStyle=i%2?'#8a6238':'#6a4826';B.fillRect(px,py+i*4,16,4);B.fillStyle='rgba(0,0,0,.35)';B.fillRect(px,py+i*4+3,16,1);}
        B.fillStyle='#4a3018';B.fillRect(px,py,16,2);B.fillRect(px,py+14,16,2);B.fillStyle='rgba(255,230,170,.18)';B.fillRect(px,py+2,16,1);}}
    else{const gr=B.createLinearGradient(0,py,0,py+16);gr.addColorStop(0,bi.face[0]);gr.addColorStop(1,bi.face[1]);
      B.fillStyle=gr;B.fillRect(px,py,16,16);B.fillStyle='rgba(0,0,0,.35)';
      B.fillRect(px,py+5,16,1);B.fillRect(px,py+11,16,1);B.fillRect(px+(tx%2?4:11),py,1,5);B.fillRect(px+(tx%2?9:2),py+6,1,5);B.fillRect(px+(tx%2?5:12),py+12,1,4);
      B.fillStyle='rgba(255,220,180,.08)';B.fillRect(px,py,16,1);}
  }
  if(Z.id==='cave')for(const sx of [6*16+1,14*16+1]){const sy=2*16+1;B.fillStyle='#4a2e1a';B.fillRect(sx,sy,30,15);B.fillStyle='#2a1a10';B.fillRect(sx+2,sy+2,26,11);
    B.fillStyle='#6b4428';B.fillRect(sx,sy+7,30,1);B.fillRect(sx,sy+14,30,1);for(let i=0;i<5;i++){B.fillStyle=i%2?'#e3b448':'#c9473a';B.fillRect(sx+3+i*5,sy+3,4,4);B.fillRect(sx+3+i*5,sy+10,4,4);}}
}

/* ----- exploration ----- */
const hitBox=(o,x,y)=>Math.abs(o.x-x)<o.hw+4&&y>o.y-6&&y-3<o.y;
const SOLID_PROP=new Set(['anvil','pot','cheese','barrel','chest','gate','house','fountain','stall','board','tree','cavegate','icegate','bossdoor','stonegate','duelpost']);
function blocked(x,y,self,tilesOnly){
  for(const[px,py] of [[x-4,y-3],[x+4,y-3],[x-4,y],[x+4,y]]){const tx=Math.floor(px/16),ty=Math.floor(py/16);
    if(ty<0||ty>=Z.rows||tx<0||tx>=Z.cols)return true;if('#^TRLW'.includes(Z.grid[ty][tx]))return true;}
  if(tilesOnly)return false;
  for(const o of Z.props)if(SOLID_PROP.has(o.k)&&hitBox(o,x,y))return true;
  for(const o of Z.npcs)if(o!==self&&hitBox(o,x,y))return true;
  return false;
}
const LABEL={store:'เข้าร้านค้า (ซื้อ / ขาย)',smithy:'เข้าร้านตีเหล็ก',duel:'⚔️ ท้าดวล bbqy legendary',stonedungeon:'ลงดันเจี้ยน: ถ้ำหินโกเลม',bossroom:'⚔️ ประตูบอส (เข้าแล้วออกไม่ได้)',icedungeon:'ลงดันเจี้ยน: ถ้ำน้ำแข็ง',folk:'ทักทาย',ground:'เก็บ',fountain:'ดื่มน้ำพุ (ฟื้นเต็ม)',shop:'ร้านค้า',board:'กระดานเควสต์',dungeon:'ลงดันเจี้ยน: ถ้ำชีส',town:'ออกจากดันเจียน → เมือง',arena:'ลานประลอง (สู้ 2 คน)',bloodstain:'เก็บคราบเลือด (ทอง/EXP)',npc:'คุย',craft:'ตีเหล็ก / ตีบวก',pot:'กินซุป (ฟื้นเต็ม)',rubble:'ทุบหิน',chest:'เปิดหีบ',gate:'เข้าเหมืองลาวา (Lv.8+)',stairs:'ลงชั้นต่อไป',portal:'กลับถ้ำ'};
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
  if(ct.loot){const out=Loot.roll(ct.loot,Z.levelAt(0),false);if(ct.skill&&rand()<ct.skill){const k=pick(CHEST_SKILLS);out.mats[k]=(out.mats[k]||0)+1;}out.items.length||out.items.push(newItem(pick(BASE_BY_TYPE(pick(ALLTYPES))),'rare',Z.levelAt(0)));
    Loot.grant(out);UI.lootPopup(out,'หีบสมบัติ');return;}
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
    say([['bbqy legendary','ข้าคือนักดวลไพ่ที่แข็งแกร่งที่สุดในโลก!'],['bbqy legendary','มังกรตาคราม ไม่ใช่แค่สัตว์เลี้ยง มันคือพลังสูงสุดของข้า'],['','กด E อีกครั้งเพื่อท้าดวล']],()=>{startBattle(f);});}
  else if(n.type==='folk'){const sv=o.face;o.face=P.x<o.x?-1:1;o.wait=240;o.tx=null;say([[o.name,pick(FOLK_LINES)]]);}
  else if(n.type==='craft')UI.open('craft');
  else if(n.type==='pot'){const S=StatSync.get();G.hp=S.maxHP;G.mp=S.maxMP;say([['หม้อซุปชีส','ซุปชีสร้อน ๆ หอมกรุ่น... HP และ MP ฟื้นเต็ม!']]);}
  else if(n.type==='rubble'){
    if(!G.eq.weapon)say([['','หินถล่มขวางทางอยู่ ต้องถืออาวุธก่อนถึงจะทุบเปิดได้']]);
    else{Z.rubbleOpen=true;Z.grid[8][19]='.';Z.grid[9][19]='.';buildBg();G.shake=8;SFX.smash();Quest.advance('main1',3);
      for(let i=0;i<30;i++)EP.push({x:19*16+8+rnd(-6,6),y:9*16+rnd(-14,6),vx:rnd(-2,2),vy:rnd(-2.5,-.5),l:40,c:'#7a6a5c',grav:1});}
  }
  else if(n.type==='gate'){
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
  else if(n.type==='board')UI.open('quests');
  else if(n.type==='stonedungeon'){enterDungeon(1,'stone');Save.save();}
  else if(n.type==='icedungeon'){enterDungeon(1,'ice');Save.save();}
  else if(n.type==='dungeon'){loadZone(CAVE,T(3,11));G.shake=3;toast('⬇️ ลงสู่ถ้ำชีส (ดันเจี้ยน Lv.1-5)');Save.save();}
  else if(n.type==='town'){loadZone(TOWN,TOWN[{ice:'icegate',stone:'stonegate'}[Z.theme]]||TOWN.gate);toast('⬆️ กลับเมือง Collawarrie (เขตปลอดภัย)');Save.save();}
  else if(n.type==='portal'){if(o.locked){toast(o.need||'ต้องปราบราชันย์ลาวาก่อน');return;}loadZone(TOWN,TOWN[{ice:'icegate',stone:'stonegate'}[Z.theme]]||TOWN.gate);toast('กลับสู่เมือง Collawarrie');Save.save();}
}
const THEME_BOSS={lava:'lavaking',ice:'seraph',stone:'golem'};
function enterDungeon(floor,theme){
  const th=theme||'lava';
  if(th==='lava'){Quest.activate('lava');if(floor===1)Quest.advance('lava',1);if(floor===3)Quest.advance('lava',2);}
  if(floor>=3){enterBossRoom(THEME_BOSS[th]);return;}
  const zid=th+floor;loadZone(makeDungeon(floor,th));G.shake=4;toast(`${ZONE_INFO[zid].n} — ศัตรู Lv.${enemyLevel(ZONE_INFO[zid].lv,G.level)} โดยประมาณ`,3000);
}
const FOLK_NAMES=['ป้าสมศรี','ลุงทอง','น้องฝน','พี่ชาย','ลุงแดง','น้าหนู','เด็กชายเก่ง','ยายมะลิ','พ่อค้าจ่อย','ช่างไม้บุญ','น้องมิ้นท์','ลุงสิงห์'];
const FOLK_LINES=['อากาศดีจังเลยวันนี้ ถ้ำชีสเขาว่าอันตรายนะ ระวังตัวด้วย','ได้ยินว่ามีสังเวียนกลางเมือง ใครอยากประลองก็ไปได้เลย','ข้าเห็นราชันย์ลาวาในฝันเมื่อคืน… ขนลุกเลย','โบโรตีเหล็กเก่งที่สุดในเมืองนี้แล้วนะ','น้ำพุกลางเมืองดื่มแล้วหายเหนื่อยเลย','ว่ากันว่ามีดวงตาใหญ่ลอยอยู่ในถ้ำน้ำแข็งทางตะวันตก…','กลับมาเป็นหรือเปล่า? ครั้งก่อนคนที่ลงถ้ำไม่เคยกลับมา','ขอให้โชคดีนะนักผจญภัย','สะพานข้ามคลองสวยดีใช่ไหมล่ะ','หนูในถ้ำเริ่มเยอะขึ้นแล้วนะช่วงนี้'];
function makeFolk(){
  const out=[],cl=['#b04a3a','#3a7ab0','#4a9a5a','#c8a040','#8a5ab0','#d8d0c0','#7a5a3a','#c85a8a'];
  for(let i=0,tries=0;i<12&&tries<400;tries++){const x=rnd(40,TOWN_COLS*16-40),y=rnd(60,TOWN_ROWS*16-40);if(blocked(x,y)||Math.hypot(x-P.x,y-P.y)<40)continue;
    out.push({id:'folk'+i,name:FOLK_NAMES[i%FOLK_NAMES.length],x,y,face:1,hw:4,mv:0,wait:rand()*120|0,tx:null,ty:null,
      pal:{h:pick(HAIR_COLORS),s:pick(SKIN_TONES),e:'#1a1020',c:pick(cl),b:pick(cl),p:pick(['#3a3040','#4a4a5a','#5a4632','#2c3a52']),f:'#3a2a1e'}});i++;}
  return out;
}
function updFolk(){
  if(!Z.folk)return;
  for(const f of Z.folk){
    if(f.wait>0){f.wait--;f.mv=0;continue;}
    if(f.tx===null||f.tx===undefined){const nx=f.x+rnd(-90,90),ny=f.y+rnd(-60,60);if(nx<24||ny<40||nx>Z.cols*16-24||ny>Z.rows*16-24||blocked(nx,ny)){f.wait=20;continue;}f.tx=nx;f.ty=ny;}
    const dx=f.tx-f.x,dy=f.ty-f.y,d=Math.hypot(dx,dy);
    if(d<2){f.tx=null;f.wait=60+rand()*220|0;f.mv=0;continue;}
    const sp=.32,sx=dx/d*sp,sy=dy/d*sp;
    if(blocked(f.x+sx,f.y+sy)||Math.hypot(f.x+sx-P.x,f.y+sy-P.y)<8){f.tx=null;f.wait=30;f.mv=0;continue;}
    f.x+=sx;f.y+=sy;f.mv=1;if(Math.abs(sx)>.05)f.face=sx>0?1:-1;
  }
}
function updExplore(){
  StatSync.frame('P');   // นับเวลาบัฟ/ดีบัฟนอกการต่อสู้
  updFolk();
  if(tap('KeyI'))return UI.open('equip');if(tap('KeyC'))return UI.open('char');if(tap('KeyK'))return UI.open('skills');
  if(tap('KeyQ'))return UI.open('quests');if(tap('KeyM'))return UI.open('map');if(tap('KeyB'))return UI.open('ency');
  if(tap('KeyN')){G.miniOff=!G.miniOff;toast(G.miniOff?'ซ่อนแผนที่เล็กแล้ว (N เพื่อแสดง)':'แสดงแผนที่เล็กแล้ว');}
  let dx=(down(...KR)?1:0)-(down(...KL)?1:0),dy=(down(...KD)?1:0)-(down(...KU)?1:0);
  if(dx&&dy){dx*=.707;dy*=.707;}const S=StatSync.get(),sp=1.3*S.spd;P.moving=!!(dx||dy);if(dx)P.face=dx>0?1:-1;
  // ถ้าผู้เล่นซ้อนอยู่ในวัตถุ/NPC อยู่แล้ว (ติด) ให้เดินออกได้ — ชนแค่กำแพง/น้ำ จนกว่าจะหลุด
  const stuck=blocked(P.x,P.y);
  if(!blocked(P.x+dx*sp,P.y,null,stuck))P.x+=dx*sp;if(!blocked(P.x,P.y+dy*sp,null,stuck))P.y+=dy*sp;
  if(P.moving){P.anim+=.2;if(G.t%12===0)EP.push({x:P.x,y:P.y,vx:rnd(-.3,.3),vy:-.2,l:20,c:Equip.look().trail||'rgba(200,180,150,.6)'});}
  const reg=Z.regionAt(Math.floor(P.x/16));if(G.visited&&!G.visited[reg]){G.visited[reg]=1;toast(`📍 ${ZONE_INFO[reg].n} (โซน Lv.${ZONE_INFO[reg].lv})`);}
  // regen out of combat
  Mana.regen(G,S,false);if(G.t%60===0)G.hp=Math.min(S.maxHP,G.hp+Math.round(S.maxHP*.01));
  for(const e of Z.foes){
    if(!e.alive){if(e.respawnable&&e.respawn>0&&--e.respawn===0){e.alive=true;e.x=e.home.x;e.y=e.home.y;e.elite=rand()<ELITE.chance;e.cool=120;}continue;}
    if(e.cool>0)e.cool--;const dist=Math.hypot(e.x-P.x,e.y-P.y),d=FOES[e.kind];
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
  if(G.t%30===0)LootManager.cleanup(Z);   // event-style sweep, not per-item tick
  NEAR=findNear();
  if(tap('KeyE','Enter','PadA')&&NEAR)interact(NEAR);
}
function drawProp(o){
  if(['house','fountain','stall','board','tree','lamp','cavegate','icegate','stonegate','duelpost','exitup','exitdoor','arena'].includes(o.k))return drawTownProp(o);
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
      if(o.sign==='store'){g.beginPath();g.arc(x,y-33,3.5,0,7);g.fill();g.fillStyle='#6a4426';g.fillRect(x-.5,y-35,1,4);}
      else{g.fillStyle='#c8ccd4';g.fillRect(x-6,y-34,9,3);g.fillRect(x-3,y-31,3,2);g.fillRect(x-5,y-29,7,1);g.fillStyle='#8a5a2a';g.fillRect(x+2,y-37,2,6);}}
    return;}
  if(o.k==='fountain'){shadow(g,x,y,16);g.fillStyle='#8a8478';g.beginPath();g.ellipse(x,y-5,16,7,0,0,7);g.fill();g.fillStyle='#4a9ad8';g.beginPath();g.ellipse(x,y-6,13,5,0,0,7);g.fill();
    g.fillStyle='#9a9488';g.fillRect(x-2,y-20,4,14);g.fillStyle='#bfe8ff';const k=(G.t>>3)%3;g.fillRect(x-1,y-24-k,2,4);g.fillRect(x-5+k,y-18,1,3);g.fillRect(x+4-k,y-18,1,3);
    if(G.t%6===0)EP.push({x:x+rnd(-3,3),y:y-22,vx:rnd(-.4,.4),vy:-.2,l:20,c:'rgba(190,230,255,.7)'});return;}
  if(o.k==='stall'){shadow(g,x,y,20);g.fillStyle='#6b4428';g.fillRect(x-18,y-12,36,12);g.fillStyle='#ffd27a';for(let i=0;i<5;i++)g.fillRect(x-15+i*7,y-14,4,3);
    for(let i=0;i<6;i++){g.fillStyle=i%2?'#e8e0d0':'#c9473a';g.fillRect(x-20+i*7,y-26,7,6);}g.fillStyle='#3a2414';g.fillRect(x-19,y-20,2,8);g.fillRect(x+17,y-20,2,8);return;}
  if(o.k==='board'){shadow(g,x,y,8);g.fillStyle='#5a3a22';g.fillRect(x-1,y-6,2,6);g.fillStyle='#8a5a32';g.fillRect(x-9,y-20,18,14);g.fillStyle='#e8dcc0';g.fillRect(x-7,y-18,6,5);g.fillRect(x+1,y-17,6,6);g.fillRect(x-6,y-12,5,4);return;}
  if(o.k==='tree'){shadow(g,x,y,10);g.fillStyle='#5a3a22';g.fillRect(x-2,y-10,4,10);g.fillStyle='#2a6a2a';g.beginPath();g.arc(x,y-18,10,0,7);g.fill();g.fillStyle='#3a8a3a';g.beginPath();g.arc(x-3,y-21,6,0,7);g.fill();return;}
  if(o.k==='lamp'){g.fillStyle='#2a2a30';g.fillRect(x-1,y-20,2,20);g.fillStyle='#ffd27a';g.fillRect(x-3,y-24,6,5);return;}
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
    case'ore':case'lavaore':g.fillStyle=o.it==='ore'?'#6a6c78':'#7a3a20';g.fillRect(x-4,y-8,8,6);g.fillRect(x-5,y-6,10,3);g.fillStyle=o.it==='ore'?'#e0a050':'#ffb02a';g.fillRect(x-2,y-7,1,1);g.fillRect(x+2,y-5,1,1);break;
    case'fire':g.fillStyle='#ff5a1a';g.beginPath();g.moveTo(x,y-11);g.lineTo(x+4,y-6);g.lineTo(x,y-1);g.lineTo(x-4,y-6);g.fill();g.fillStyle='#ffe08a';g.fillRect(x-1,y-8,2,4);break;
    case'thunder':g.fillStyle='#4a7aa0';g.fillRect(x-4,y-7,8,6);g.fillStyle='#9fe6ff';g.fillRect(x-1,y-8,2,3);g.fillRect(x,y-5,2,3);break;
    case'cheese':g.fillStyle='#f2c94c';g.beginPath();g.moveTo(x-5,y-2);g.lineTo(x+5,y-2);g.lineTo(x+5,y-8);g.fill();break;
    case'pan':g.fillStyle='#2a2a30';g.beginPath();g.ellipse(x-2,y-4,5,3,0,0,7);g.fill();g.fillStyle='#5a3a22';g.fillRect(x+3,y-5,6,2);break;
    case'hide':g.fillStyle='#8a6a4a';g.fillRect(x-5,y-6,10,5);g.fillStyle='#6a4a2a';g.fillRect(x-3,y-5,6,1);break;
  }
  if((G.t+o.x*7)%70<10){g.fillStyle='#fff';g.fillRect(x+4,y-11,1,3);g.fillRect(x+3,y-10,3,1);}
}
function heroPal(K){return{h:K.head==='helm'||K.head==='crown'?K.hc:K.hair,s:K.skin,e:'#1a1020',c:K.body,b:K.cape?K.cape.col:K.trim,p:K.pants,f:K.boots};}
function drawExplore(){
  {const mxc=Math.max(0,Z.cols*16-W),myc=Z.rows>17?Math.max(0,Z.rows*16-H):0,tx=clamp(P.x-W/2,0,mxc),ty=clamp(P.y-H/2+14,0,myc);
   if(CAM.snap||CAM.zone!==Z.id){CAM.x=tx;CAM.y=ty;CAM.snap=0;CAM.zone=Z.id;}else{CAM.x+=(tx-CAM.x)*.14;CAM.y+=(ty-CAM.y)*.14;}CAM.rx=Math.round(CAM.x);CAM.ry=Math.round(CAM.y);}
  const cx=CAM.rx,cy=CAM.ry;
  g.save();if(G.shake>0)g.translate(rnd(-G.shake,G.shake)|0,rnd(-G.shake,G.shake)|0);
  g.drawImage(bgC,cx,cy,W,H,0,0,W,H);g.translate(-cx,-cy);for(const t of Z.torches)if(t.x>cx-20&&t.x<cx+W+20)drawTorch(g,t.x,t.y);
  if(Z.water){const x0=cx>>4,x1=(cx+W>>4)+1,y0=cy>>4,y1=(cy+H>>4)+1;for(const w of Z.water){if(w.x<x0||w.x>x1||w.y<y0||w.y>y1)continue;const q=hash(w.x*3+(G.t>>4),w.y*5);if(q>.82){g.fillStyle='rgba(255,255,255,.35)';g.fillRect(w.x*16+3+(q*9|0),w.y*16+4+((q*97|0)%8),4,1);}}}
  if(Z.lavaTiles&&G.t%6===0){const l=pick(Z.lavaTiles);if(l)EP.push({x:l.x+rnd(-6,6),y:l.y,vx:0,vy:-.4,l:30,c:'#ffb03a'});}
  const list=[],K=Equip.look();
  for(const o of Z.props)list.push({y:o.y,f:()=>drawProp(o)});
  for(const o of Z.items)if(!o.taken)list.push({y:o.y,f:()=>drawItem(o)});
  for(const gi of Z.ground||[])if(!gi.picked)list.push({y:gi.y,f:()=>drawGround(gi)});
  const bs=G.bloodstain;if(bs&&bs.zone===Z.id)list.push({y:bs.y-6,f:()=>{const x=bs.x|0,y=bs.y|0,p=Math.sin(G.t*.08);
    g.fillStyle='rgba(120,0,0,.75)';g.beginPath();g.ellipse(x,y,8,3.5,0,0,7);g.fill();g.fillStyle='rgba(200,20,20,.9)';g.fillRect(x-3,y-1,2,2);g.fillRect(x+2,y,3,1);
    g.fillStyle=`rgba(255,60,40,${.35+p*.2})`;g.fillRect(x-1,y-14-p*2,2,12);if(G.t%6===0)EP.push({x:x+rnd(-5,5),y:y-2,vx:0,vy:-.4,l:30,c:'#ff4a3a'});}});
  for(const n of Z.folk||[])list.push({y:n.y,f:()=>{shadow(g,n.x,n.y,5);spr(g,HERO,n.pal,n.x,n.y-(n.mv?Math.round(Math.abs(Math.sin(G.t*.25))):0),1,n.face<0);}});
  for(const n of Z.npcs)list.push({y:n.y,f:()=>{shadow(g,n.x,n.y,5);n.face=P.x<n.x?-1:1;spr(g,HERO,PAL[n.pal],n.x,n.y,1,n.face<0);}});
  for(const e of Z.foes)if(e.alive)list.push({y:e.y,f:()=>{const d=FOES[e.kind];
    if(e.elite&&G.t%4===0)EP.push({x:e.x+rnd(-6,6),y:e.y-rnd(2,12),vx:0,vy:-.3,l:16,c:'#ffd23a'});
    if(d.h<60){shadow(g,e.x,e.y,6);spr(g,SPR[d.map]||RAT,PAL[d.pal],e.x,e.y+1-(Math.abs(Math.sin(G.t*.3))*(e.vx||e.vy?1:0)|0),1,e.face<0,e.cool>0&&G.t%8<4?'rgba(255,255,255,.6)':null);}
    else if(d.kind==='rig'){shadow(g,e.x,e.y,5);spr(g,HERO,d.look?heroPal(LOOK_BY_NAME[d.look]):PAL[d.pal||(e.kind==='kage'?'kage':'shade')],e.x,e.y,1,e.face<0);g.fillStyle='#4a4a5e';g.fillRect(e.face<0?e.x+5:e.x-7,e.y-15,2,11);}
    else{shadow(g,e.x,e.y,16);spr(g,SPR[d.map]||GOLEM,PAL[d.pal],e.x,e.y+Math.round(Math.sin(G.t*.04))-(d.hover?4:0),d.map==='ANGEL'?1.6:d.boss?2:1.4,false);}}});
  list.push({y:P.y,f:()=>{shadow(g,P.x,P.y,5);spr(g,HERO,heroPal(K),P.x,P.y-(P.moving?Math.abs(Math.sin(P.anim))*1.5:0)|0,1,P.face<0);
    const w=WEAPONS[K.weapon];if(w&&w.len){g.fillStyle=w.pan||w.hammer?'#8a5a32':w.col;g.fillRect(P.face>0?P.x-7:P.x+5,P.y-14,2,Math.min(11,w.len*.7+3));}}});
  list.sort((a,b)=>a.y-b.y).forEach(o=>o.f());
  for(const p of EP){g.globalAlpha=Math.min(1,p.l/20);g.fillStyle=p.c;g.fillRect(p.x|0,p.y|0,p.grav?2:1,p.grav?2:1);}g.globalAlpha=1;
  for(const m of MOTES){g.fillStyle=`rgba(255,230,180,${m.a*.5})`;g.fillRect((m.x+cx)|0,(m.y+cy)|0,1,1);}
  g.restore();
  const fl=()=>Math.sin(G.t*.25)*3+rnd(-1.5,1.5),ls=Z.torches.map(t=>({x:t.x,y:t.y+6,r:72+fl(),c:'rgba(255,140,60,.22)'}));
  ls.push({x:P.x,y:P.y-8,r:50});
  for(const o of Z.props){if(o.k==='pot')ls.push({x:o.x,y:o.y-6,r:50+fl(),c:'rgba(255,120,40,.25)'});if(o.k==='anvil')ls.push({x:o.x-8,y:o.y-10,r:42+fl(),c:'rgba(255,120,40,.25)'});
    if(o.k==='crystal')ls.push({x:o.x,y:o.y-8,r:44,c:'rgba(80,200,255,.22)'});if(o.k==='chest'&&!o.opened)ls.push({x:o.x,y:o.y-6,r:20,c:'rgba(255,220,120,.18)'});
    if(o.k==='gate')ls.push({x:o.x,y:o.y-12,r:46+fl(),c:'rgba(255,100,30,.35)'});if(o.k==='bossdoor')ls.push({x:o.x,y:o.y-14,r:44,c:'rgba(255,60,60,.3)'});if(o.k==='portal'||o.k==='stairs')ls.push({x:o.x,y:o.y-8,r:36,c:'rgba(120,220,255,.25)'});if(o.k==='exitdoor')ls.push({x:o.x,y:o.y-14,r:40,c:'rgba(120,255,140,.28)'});}
  if(Z.lavaTiles)for(let i=0;i<Z.lavaTiles.length;i+=2){const l=Z.lavaTiles[i];ls.push({x:l.x,y:l.y,r:34,c:'rgba(255,90,20,.2)'});}
  for(const o of Z.items)if(!o.taken&&o.it==='fire')ls.push({x:o.x,y:o.y-6,r:22,c:'rgba(255,100,40,.3)'});
  for(const n of Z.npcs)ls.push({x:n.x,y:n.y-8,r:24});
  for(const e of Z.foes)if(e.alive&&FOES[e.kind].boss)ls.push({x:e.x,y:e.y-22,r:34,c:'rgba(255,210,80,.15)'});
  for(const gi of Z.ground||[])if(!gi.picked){const r=RARS.indexOf(gi.drop.rar);ls.push({x:gi.x,y:gi.y-6,r:16+r*8,c:RARC[gi.drop.rar]+'66'});}
  for(const o of Z.props)if(o.k==='lamp')ls.push({x:o.x,y:o.y-18,r:70,c:'rgba(255,200,120,.2)'});else if(o.k==='fountain')ls.push({x:o.x,y:o.y-8,r:50,c:'rgba(120,200,255,.15)'});else if(o.k==='exitdoor')ls.push({x:o.x,y:o.y-14,r:34,c:'rgba(120,255,140,.18)'});else if(o.k==='arena')ls.push({x:o.x,y:o.y-8,r:62,c:'rgba(255,200,120,.22)'});else if(o.k==='cavegate')ls.push({x:o.x,y:o.y-10,r:40,c:'rgba(255,160,80,.15)'});
  for(const l of ls){l.x-=cx;l.y-=cy;}
  lighting(ls,Z.biomeAt(0)==='lava'?'rgba(10,4,6,.66)':Z.id==='town'?'rgba(20,14,40,.38)':'rgba(8,5,16,.72)');
}
function drawExploreUI(){
  for(const n of Z.npcs){const has=(n.id==='smith'&&G.q.main1.step<2)||(n.id==='girl'&&!G.flags.girlGave);if(!has)continue;
    const bx=(n.x-CAM.rx)*S,by=(n.y-CAM.ry-24+Math.sin(G.t*.08)*1.5)*S;D.fillStyle='#f4ead8';rrect(bx-14,by-10,28,18,6);D.fill();
    D.beginPath();D.moveTo(bx-4,by+8);D.lineTo(bx,by+14);D.lineTo(bx+4,by+8);D.fill();D.fillStyle='#2a1a20';D.font='800 16px Sarabun,sans-serif';D.textAlign='center';D.textBaseline='middle';D.fillText(n.id==='smith'?'!':'…',bx,by);}
  for(const e of Z.foes)if(e.alive){const d=FOES[e.kind],lv=foeLevel(d,Z.levelAt(Math.floor(e.x/16))),dy=d.boss?48:d.kind==='rig'?24:14;
    const col=lv>=G.level+3?'#ff5a4a':lv>=G.level+1?'#ffb03a':'#d8f0ff';
    outlineText(`${e.elite?'★ ':''}Lv.${lv}${d.boss?' 👑':''}`,(e.x-CAM.rx)*S,(e.y-CAM.ry-dy)*S,12,e.elite?'#ffd23a':col);}
  (Z.ground||[]).filter(gi=>!gi.picked&&Math.hypot(gi.x-P.x,gi.y-P.y)<LOOT_CONFIG.ground.nameRange&&!(NEAR&&NEAR.o===gi)).sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y)).slice(0,3).forEach((gi,i)=>{
    outlineText((gi.owner!=='P1'?'🔒 ':'')+LootManager.name(gi.drop),(gi.x-CAM.rx)*S,(gi.y-CAM.ry-16)*S-i*14,12,gi.owner!=='P1'?'#777':RARC[gi.drop.rar]);});
  if(NEAR&&G.mode==='explore'){const o=NEAR.o;const lab=NEAR.type==='item'?'เก็บ '+MATS[o.it].n:NEAR.type==='ground'?'เก็บ '+LootManager.name(o.drop):LABEL[NEAR.type];pill((o.x-CAM.rx)*S,(o.y-CAM.ry-(NEAR.type==='npc'?30:26))*S,'[E] '+lab);}
  if(!G.miniOff)drawMinimap();
}
function drawMinimap(){
  const sc=Math.min(4,170/Z.cols),mx=960-Z.cols*sc-14,my=540-Z.rows*sc-14;D.save();D.globalAlpha=.88;D.fillStyle='rgba(0,0,0,.6)';D.fillRect(mx-4,my-18,Z.cols*sc+8,Z.rows*sc+22);
  for(let y=0;y<Z.rows;y++)for(let x=0;x<Z.cols;x++){const c=Z.grid[y][x];D.fillStyle=c==='W'?'#3a78b8':c==='B'?'#8a6238':c===':'?'#8a826e':c==='.'?(Z.id==='town'?'#3a6a32':'#5a5048'):c==='L'?'#ff6a1a':c==='R'?'#8a7a6a':'#1a1414';D.fillRect(mx+x*sc,my+y*sc,Math.ceil(sc),Math.ceil(sc));}
  const dot=(x,y,c,r=2.5)=>{D.fillStyle=c;D.beginPath();D.arc(mx+x/16*sc,my+y/16*sc,r,0,7);D.fill();};
  for(const o of Z.props){if(o.k==='chest'&&!o.opened)dot(o.x,o.y,'#ffd23a',1.8);if(['gate','stairs','portal'].includes(o.k))dot(o.x,o.y,'#5ae0ff',2.5);if(o.k==='bossdoor')dot(o.x,o.y,'#ff4a4a',2.8);if(o.k==='exitdoor'||o.k==='exitup')dot(o.x,o.y,'#5aff7a',2.5);if(o.k==='anvil')dot(o.x,o.y,'#ff9a3a',2);}if(G.bloodstain&&G.bloodstain.zone===Z.id&&G.t%30<20)dot(G.bloodstain.x,G.bloodstain.y,'#ff2a2a',3);
  for(const n of Z.npcs)dot(n.x,n.y,'#6aff8a');
  for(const e of Z.foes)if(e.alive)dot(e.x,e.y,FOES[e.kind].boss?'#ff4af0':e.elite?'#ffd23a':'#ff4a4a',FOES[e.kind].boss?3.5:2.2);
  for(const gi of Z.ground||[])if(!gi.picked&&gi.owner==='P1')dot(gi.x,gi.y,RARC[gi.drop.rar],1.6);
  dot(P.x,P.y,'#fff',3);D.globalAlpha=1;
  outlineText((ZONE_INFO[Z.regionAt(Math.floor(P.x/16))]||{n:''}).n,mx+Z.cols*sc/2,my-9,11,'#ffe3a0');
  {const vw=W/16*sc,vh=H/16*sc;D.strokeStyle='rgba(255,255,255,.55)';D.lineWidth=1;D.strokeRect(mx+CAM.rx/16*sc,my+CAM.ry/16*sc,vw,vh);}D.restore();
}

/* ----- NPC dialog ----- */
const dlgEl=$('#dialog'),dWho=dlgEl.querySelector('.who'),dTx=dlgEl.querySelector('.tx');let DLG=null;
function say(lines,done){DLG={lines,i:0,done};G.mode='dialog';dlgEl.classList.remove('hidden');showLine();}
function showLine(){const[w,t]=DLG.lines[DLG.i];dWho.textContent=w;dWho.style.display=w?'':'none';dTx.textContent=t;SFX.talk();}
function nextLine(){if(!DLG)return;DLG.i++;if(DLG.i>=DLG.lines.length){const d=DLG.done;DLG=null;dlgEl.classList.add('hidden');G.mode='explore';d&&d();}else showLine();}
dlgEl.addEventListener('click',nextLine);
function talk(id){
  const q=G.q.main1;
  if(id==='merchant'){UI.open('shop');return;}
  if(id==='guard'){say([['ทหารยาม','ทางลงถ้ำชีสอยู่ตรงนี้ ข้างในมีหนูกับของมีค่า ศัตรูที่ล้มจะทำของตกไว้บนพื้น ของใครของมัน เก็บภายใน 2 นาทีนะ'],['ทหารยาม','ไอเท็มสีม่วงคือระดับตำนาน สีทองคือระดับเทพ ถ้าเห็นแสงพุ่งขึ้นฟ้า รีบไปเก็บเลย']]);return;}
  if(id==='smith'){
    if(q.step===0)say([['โบโร','เฮ้ เจ้าหนู! โกเลมหินตื่นขึ้นมาแล้ว แถมมีนักดาบเงาชื่อคาเงะเฝ้าทางเข้าอีก!'],
      ['โบโร','ไปเก็บวัตถุดิบในถ้ำมา แล้วใช้โต๊ะตีเหล็กข้างข้า สูตรพื้นฐานเจ้ารู้อยู่แล้ว สูตรขั้นสูงต้องหาคัมภีร์สูตร'],
      ['โบโร','วางวัตถุดิบลงช่องบนโต๊ะ ถ้าตรงสูตรมันจะบอกเอง สูตรพื้นฐานข้าจดไว้ให้ในสมุดแล้ว สูตรอื่นต้องหาจากคัมภีร์ จดหมาย หรือคนในถ้ำ'],['โบโร','ของธรรมดาสำเร็จครึ่งต่อครึ่ง ของหายากยิ่งยาก ถ้าพลาด วัตถุดิบหายหมดนะ ถ้าเจอคริสตัลศักดิ์สิทธิ์ 💎 จะช่วยได้อีก 20%'],
      ['โบโร','กด C ดูค่าสถานะ, I ดูอุปกรณ์, K ตั้งสกิล, Q ดูเควสต์ แล้วไปเถอะ!']],()=>{Quest.advance('main1',1);});
    else if(q.step===1)say([['โบโร','ยังไม่มีอาวุธรึ? วางไม้ 1 กับแร่เหล็ก 1 ลงช่องบนโต๊ะ จะได้ดาบเหล็ก (สำเร็จ 50% ถ้าพลาดลองใหม่)']]);
    else if(!G.flags.gotGauntScroll){G.flags.gotGauntScroll=1;Inv.add('sc_gaunt');say([['โบโร','ได้อาวุธแล้วสินะ เอาคัมภีร์นี่ไป สูตรสนับมือสายฟ้า'],['โบโร','ทางถ้ำชั้นในโดนหินถล่มปิดอยู่ทางขวา ทุบเปิดซะ']]);}
    else if(!G.flags.golemDown)say([['โบโร','คาเงะป้องกันเก่ง ลองท่ากวาดขา (↓+K) หรือสกิลที่ทำให้มึน ส่วนโกเลม หลังมันทุบพื้น แกนกลางจะเปิด — ตีตอนนั้นแรงขึ้น 50%']]);
    else say([['โบโร','เจ้าทำได้! ถ้ายังไม่พอใจ ประตูเหมืองลาวาในถ้ำคริสตัลเปิดอยู่ ข้างในอันตรายกว่ามาก']]);
  }else{
    if(!G.flags.girlGave)say([['มิลิน','นี่ ๆ ฉันเจอหินประหลาดกับคัมภีร์เก่าเล่มนี้ ให้เธอเลย'],['มิลิน','แล้วช่วยไล่หนูถ้ำ 3 ตัวให้หน่อยได้ไหม มันมากัดชีสทุกคืน']],
      ()=>{G.flags.girlGave=1;Inv.add('thunder');Inv.add('sc_flame');Quest.activate('hunt');toast('ได้รับ ⚡ หินสายฟ้า และ 📘 คัมภีร์สูตร: ดาบเพลิง (ใช้ในหน้ากระเป๋า)');SFX.pick();});
    else{const tips=['สถานะพิษกับเลือดออกซ้อนได้ 5 สแตก แต่ถ้าเต็มแล้วจะไม่รีเซ็ตเวลานะ','ถ้าเป้าหมายกำลังเผาไหม้แล้วโดนช็อก จะเกิดระเบิดพลาสมาเลย!',
      'ศัตรูที่มีดาว ★ คือหัวหน้า เลือดเยอะ แต่ดรอปของหายากแน่นอน','คอมโบที่ทำครบชุดจะแรงขึ้น 20% ดูรายการคอมโบได้ในหน้าสกิล (K)'];say([['มิลิน',tips[(G.flags.tip=(G.flags.tip||0)+1)%tips.length]]]);}
  }
}
