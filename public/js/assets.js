/* ===================== ASSETS: ภาพจาก AI (ไม่บังคับ) =====================
   วางไฟล์ PNG ไว้ในโฟลเดอร์ assets/ ข้าง index.html ตามชื่อในรายการด้านล่าง
   ไฟล์ไหนมี เกมใช้ภาพนั้น · ไฟล์ไหนไม่มี เกมวาดแบบเดิมให้อัตโนมัติ
   ขนาดในตาราง = ขนาดบนจอเกม (พิกเซลเกม 480×270) ภาพต้นฉบับใหญ่แค่ไหนก็ได้ เกมย่อให้เอง        */
const ASSET_SPEC={
  // พื้นผิวแบบต่อกันไร้รอยต่อ (seamless) — ย่อเหลือ 128×128 พิกเซลเกม แล้วปูซ้ำ
  tex:{town:'tex_grass',road:'tex_road',water:'tex_water',cave:'tex_cave',crystal:'tex_crystal',lava:'tex_lava',ice:'tex_ice',tower:'tex_tower',sanctum:'tex_sanctum',
       wall_town:'tex_wall_town',wall_cave:'tex_wall_cave',wall_crystal:'tex_wall_crystal',wall_lava:'tex_wall_lava',wall_ice:'tex_wall_ice',wall_tower:'tex_wall_tower',wall_sanctum:'tex_wall_sanctum'},
  // ของประกอบฉาก (พื้นหลังโปร่งใส) — กำหนดความกว้าง w หรือความสูง h เป็นพิกเซลเกม · จุดยึด = กึ่งกลางล่าง
  prop:{house_1:{w:68},house_2:{w:68},house_3:{w:68},house_4:{w:68},tree:{w:34},fountain:{w:40},stall:{w:46},board:{w:22},lamp:{h:30},
        cavegate:{w:38},icegate:{w:38},stonegate:{w:42},towergate:{w:40},arena:{w:104},duelpost:{h:36},anvil:{w:30},pot:{w:22},barrel:{h:16},
        cheese:{w:18},crystal:{h:18},chest:{w:16},chest_open:{w:16},bossdoor:{w:34},exitdoor:{w:20},gate:{w:24},portal:{h:24},exitup:{w:16},stairs:{w:16}},
  // มอนสเตอร์ (พื้นหลังโปร่งใส หันขวา) — สูงตามขนาดในเกม
  mon:['rat','lavarat','frostslime','mudslime','mslime','frostwolf','rockling','icegolem','golem','lavaking','seraph'],
  // ฉากหลังการต่อสู้ 16:9 — พื้นที่ยืนอยู่ราว 13% ล่างสุดของภาพ
  bg:['cave','stone','lava','cathedral','frost','tower','arena'],
  // sprite sheet ตัวละครเดิน 4 ทิศ แบบ RPG Maker: 3 คอลัมน์ (ก้าวซ้าย · ยืน · ก้าวขวา) × 4 แถว (หน้า · ซ้าย · ขวา · หลัง)
  sheet:['char_player','npc_smith','npc_girl','npc_reitem','folk_1','folk_2','folk_3','folk_4'],
  sheetH:34   // ความสูงตัวละครในเกม (พิกเซลเกม)
};
const AS={img:{},fit:{},tint:{},loaded:0,tried:0,
  names(){const n=[...Object.values(ASSET_SPEC.tex),...Object.keys(ASSET_SPEC.prop).map(k=>'prop_'+k),...ASSET_SPEC.mon.map(k=>'mon_'+k),...ASSET_SPEC.bg.map(k=>'bg_'+k),...ASSET_SPEC.sheet];return n;},
  // อ่านรายชื่อจาก assets/list.json ก่อน (เซิร์ฟเวอร์ Render สร้างให้อัตโนมัติ) แล้วโหลดเฉพาะไฟล์ที่มีจริง — ไม่มีรายชื่อ = ใช้ภาพวาดเดิมทั้งหมด
  load(){if(typeof document==='undefined'||typeof fetch==='undefined'||(typeof location!=='undefined'&&location.protocol==='file:'))return;const base=(window.CF_ASSETS||'assets/'),want=new Set(this.names());
    fetch(base+'list.json',{cache:'no-cache'}).then(r=>r.ok?r.json():[]).catch(()=>[]).then(list=>{this.list=list;
      for(const n of list){if(!want.has(n))continue;const im=new Image();im.onload=()=>{this.img[n]=im;this.loaded++;this.changed();};im.onerror=()=>{this.tried++;};im.src=base+n+'.png';}});},
  _t:0,changed(){clearTimeout(this._t);this._t=setTimeout(()=>{try{if(typeof Z!=='undefined'&&Z&&typeof buildBg==='function')buildBg();if(typeof BT!=='undefined'&&BT&&typeof buildBattleBg==='function'&&buildBattleBg.last)buildBattleBg(buildBattleBg.last);}catch(e){console.warn(e);}},120);},
  has(n){return !!this.img[n];},
  // ย่อภาพแบบหลายขั้น (คมกว่าย่อครั้งเดียว) → แคนวาสขนาด w×h พิกเซลเกม × RES
  get(n,w,h){const im=this.img[n];if(!im)return null;const R=typeof RES!=='undefined'?RES:1,key=n+'|'+w+'x'+h;if(this.fit[key])return this.fit[key];
    const tw=Math.max(1,Math.round(w*R)),th=Math.max(1,Math.round(h*R));let src=im,sw=im.naturalWidth,sh=im.naturalHeight;
    while(sw/2>tw&&sh/2>th){const c=document.createElement('canvas');c.width=Math.round(sw/2);c.height=Math.round(sh/2);const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,0,0,c.width,c.height);src=c;sw=c.width;sh=c.height;}
    const c=document.createElement('canvas');c.width=tw;c.height=th;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,0,0,tw,th);return this.fit[key]=c;},
  size(n,spec){const im=this.img[n];if(!im)return null;const a=im.naturalHeight/im.naturalWidth;return spec.w?[spec.w,Math.round(spec.w*a)]:[Math.round(spec.h/a),spec.h];},
  tinted(c,col){const key=col;let m=this.tint[key];if(!m)m=this.tint[key]=new WeakMap();let t=m.get(c);if(t)return t;
    t=document.createElement('canvas');t.width=c.width;t.height=c.height;const x=t.getContext('2d');x.drawImage(c,0,0);x.globalCompositeOperation='source-atop';x.fillStyle=col;x.fillRect(0,0,t.width,t.height);m.set(c,t);return t;},
  // วาดภาพกึ่งกลางล่างที่ (x,y) สูง hgt พิกเซลเกม
  drawAt(ctx,n,x,y,w,h,flip,tint){const c0=this.get(n,w,h);if(!c0)return false;const c=tint?this.tinted(c0,tint):c0;
    ctx.save();ctx.imageSmoothingEnabled=true;if(flip){ctx.translate(Math.round(x),0);ctx.scale(-1,1);ctx.drawImage(c,-w/2,Math.round(y)-h,w,h);}else ctx.drawImage(c,Math.round(x)-w/2,Math.round(y)-h,w,h);ctx.restore();return true;},
  // ---- จุดเชื่อมกับเกม ----
  tex(key){const n=ASSET_SPEC.tex[key];return n&&this.has(n)?this.get(n,128,128):null;},
  tile(ctx,key,px,py){const t=this.tex(key);if(!t)return false;const R=t.width/128;ctx.drawImage(t,(px%128)*R,(py%128)*R,16*R,16*R,px,py,16,16);return true;},
  propName(o){if(o.k==='house'){const map={'#a8382a':0,'#2a5aa8':1,'#3a8a4a':2,'#8a5a2a':0,'#7a3a8a':3,'#2a8a8a':1};let i=map[o.roof];if(i==null)i=Math.abs(((o.x|0)*7+(o.y|0)*3))%4;return 'house_'+(i+1);}
    if(o.k==='chest')return o.opened?'chest_open':'chest';return o.k;},
  prop(ctx,o){const k=this.propName(o),spec=ASSET_SPEC.prop[k];if(!spec||!this.has('prop_'+k))return false;const sz=this.size('prop_'+k,spec);
    if(o.k!=='arena')shadow(ctx,o.x,o.y,Math.max(5,sz[0]*.42));return this.drawAt(ctx,'prop_'+k,o.x,o.y+(o.k==='arena'?sz[1]*.45:0),sz[0],sz[1],false,null);},
  mon(ctx,kind,x,y,hgt,flip,tint){const n='mon_'+kind;if(!this.has(n))return false;const im=this.img[n],w=Math.round(hgt*im.naturalWidth/im.naturalHeight);return this.drawAt(ctx,n,x,y,w,hgt,flip,tint);},
  // ตัดเฟรมจาก sheet (แคชต่อเฟรม) แล้ววาดกึ่งกลางล่าง · dir: down/left/right/up · step: 0..3 (วงจร ยืน-ก้าว-ยืน-ก้าว)
  sheetFrame(n,row,col,h){const im=this.img[n];if(!im)return null;const key=n+'#'+row+','+col+'|'+h;if(this.fit[key])return this.fit[key];
    const cw=im.naturalWidth/3,ch=im.naturalHeight/4,R=typeof RES!=='undefined'?RES:1,w=Math.round(h*cw/ch);
    const cut=document.createElement('canvas');cut.width=Math.round(cw);cut.height=Math.round(ch);cut.getContext('2d').drawImage(im,col*cw,row*ch,cw,ch,0,0,cut.width,cut.height);
    this.img[key+'_c']=cut;cut.naturalWidth=cut.width;cut.naturalHeight=cut.height;const c=this.get(key+'_c',w,h);c._w=w;return this.fit[key]=c;},
  walker(ctx,n,x,y,dir,moving,ph,tint){if(!this.has(n))return false;const row={down:0,left:1,right:2,up:3}[dir]??0,col=moving?[1,0,1,2][Math.floor(ph)&3]:1,h=ASSET_SPEC.sheetH;
    const c0=this.sheetFrame(n,row,col,h);if(!c0)return false;const c=tint?this.tinted(c0,tint):c0;shadow(ctx,x,y,7);
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(c,Math.round(x)-c0._w/2,Math.round(y)-h+2,c0._w,h);ctx.restore();return true;},
  bg(ctx,scene){const n='bg_'+scene;if(!this.has(n))return false;ctx.drawImage(this.get(n,W,H),0,0,W,H);return true;}
};
AS.load();
