'use strict';
/* ============================================================
   UI — every screen reads/writes the live systems (no mockups)
   ============================================================ */
const pn=$('#pn'),ov=$('#ov');
// รวมราคาของที่เลือกไว้ในหน้าขาย (อุปกรณ์ = ทีละชิ้น, วัตถุดิบ = ทั้งกอง)
function sellSelValue(){let g=0,n=0;for(const k of UI.sellSel){const v=k.slice(2);if(k[0]==='i'){const it=itemByUid(+v);if(it&&!Equip.isEquipped(it)){g+=Inv.sellPrice(it);n++;}}else if(G.mats[v]>0){g+=Inv.matPrice(v)*G.mats[v];n++;}}return{g,n};}
const ATTR_HINT={str:'ATK +2/หน่วย · ทุก 10 = ต้านสถานะ +1%',agi:'ความเร็ว · ทุก 10 = หลบ +1%, DEF +3',int:'MP +10, พลังเวท +3/หน่วย',vit:'HP +20/หน่วย',luk:'คริ +0.2%, ดาเมจคริ +1%/หน่วย'};
const MENU_SUB=['char','equip','skills','quests','map','ency','controls','debug'];   // หน้าที่เปิดจากเมนู Tab จะมีปุ่มกลับเมนูด้านบน
const pct=v=>(Math.round(v*1000)/10)+'%';
const rc=r=>`style="color:${RARC[r]}"`;
function statLines(s){return Object.keys(s).map(k=>`<div>${STATN2[k]||k} <b>${fmtStat(k,s[k])}</b></div>`).join('');}
function itemTip(it,cmp){
  const b=BASES[it.base],s=itemStats(it),c=cmp?itemStats(cmp):null;
  let h=`<div class="tip"><div class="tn" ${rc(it.rar)}>${bIco(it.base,16)} ${itemName(it)}</div><div class="ts">${RARN[it.rar]} · ${SLOTN[b.type]} · iLv.${it.ilvl} · ต้องการ Lv.${it.req}${G.level<it.req?' <span class="bad">(เลเวลไม่พอ)</span>':''}</div>`;
  h+=`<div class="ts">ตีบวก <b>+${it.enh||0}</b> / +${Equip.maxEnh(it)}${it.crafted?' · <span class="good">ของ craft</span>':''} · ทุกขั้น: ค่าแบบหน่วย +${CONFIG.enhFlat} · ค่า % +${CONFIG.enhPct*100}%</div>`;
  if(b.wt)h+=`<div class="ts">ชุดท่า: ${WEAPONS[b.wt].n} · ธาตุ <span style="color:${ELC[WEAPONS[b.wt].el]}">${ELN[WEAPONS[b.wt].el]}</span></div>`;
  const keys=new Set([...Object.keys(s),...(c?Object.keys(c):[])]);
  h+='<div class="tl">'+[...keys].map(k=>{const v=s[k]||0,d=c?v-(c[k]||0):0;return`<div>${STATN2[k]||k} <b>${fmtStat(k,v)}</b>${c&&Math.abs(d)>1e-6?` <span class="${d>0?'good':'bad'}">(${fmtStat(k,d)})</span>`:''}</div>`;}).join('')+'</div>';
  if(it.uniq){const P=PASSIVES.leg[it.uniq]||PASSIVES.god[it.uniq];h+=`<div class="tu">★ ${P.n}: ${P.d}</div>`;}
  if(b.set){const S=SETS[b.set],cnt=setCounts(equipped())[b.set]||0;h+=`<div class="tset">ชุด: ${S.n} (${cnt} ชิ้น)`+Object.entries(S.b).map(([n,bb])=>`<div class="${cnt>=n?'good':'dim'}">${n} ชิ้น: ${bb.d||Object.keys(bb).map(k=>(STATN2[k]||k)+' '+fmtStat(k,bb[k])).join(', ')}</div>`).join('')+'</div>';}
  if(it.sockets.length)h+=`<div class="ts">ช่องรูน: ${it.sockets.map(r=>r?mIco(r,14)+MATS[r].n:'◯ ว่าง').join(' · ')}</div>`;
  if(c)h+=`<div class="ts dim">เทียบกับที่สวมอยู่: ${itemName(cmp)}</div>`;
  return h+'</div>';
}
const UI={
  cur:null,sel:null,filt:{type:'all',rar:'all',sort:'rarity'},
  open(name,arg){this.cur=name;G.mode='menu';ov.classList.remove('hidden');this.render(arg);SFX.talk();},
  close(){ov.classList.add('hidden');this.cur=null;pvCtx=null;if(G.mode==='menu')G.mode='explore';this.hud();if(typeof Net!=='undefined')Net.onUIClose();},
  render(arg){const ae=document.activeElement,key=ae&&pn.contains(ae)?Nav.key(ae):null;const f=this['scr_'+this.cur];let html=f?f.call(this,arg):'';if(MENU_SUB.includes(this.cur))html=`<div class="backbar"><button class="btn ghost sm" data-open="menu">‹ กลับเมนู</button></div>`+html;pn.innerHTML=html;pvCtx=null;const pv=$('#pv');if(pv)pvCtx=pv.getContext('2d');
    const af=pn.querySelector('[autofocus]');if(af)af.focus();else if(key){const el=Nav.items().find(e=>Nav.key(e)===key);if(el)el.focus();}},
  rerender(){if(this.cur)this.render();},
  hud(){
    if(!G.talent)return;const S=StatSync.get();G.hp=Math.min(G.hp,S.maxHP);
    $('#hudname').innerHTML=`Lv.${G.level} ${ico(TALENT_ICO[G.talent],14)} <small>${TALENTS[G.talent].th}</small>${G.points?` <span class="pts">+${G.points} แต้ม (C)</span>`:''} <small style="color:#ffd23a">⚡${Math.floor(G.ult||0)}</small> <small title="ระดับความยาก">${Diff.cur().ic}</small>${G.bloodstain?' <small style="color:#ff5a4a">🩸'+G.bloodstain.gold+'g</small>':''}`;
    $('#hpb').style.width=(G.hp/S.maxHP*100)+'%';$('#hpt').textContent=`${G.hp}/${S.maxHP}`;
    $('#mpb').style.width=(G.mp/S.maxMP*100)+'%';$('#mpt').textContent=`${Math.floor(G.mp)}/${S.maxMP}`;
    $('#xpb').style.width=(G.level>=CONFIG.levelCap?100:G.xp/CONFIG.xpNext(G.level)*100)+'%';$('#gold').textContent=G.gold;
    this.quest();
  },
  quest(){const q=Object.keys(QUESTS).filter(id=>G.q[id]&&G.q[id].active&&!G.q[id].done);
    $('#quest').innerHTML=q.slice(0,2).map(id=>`<div class="t">◆ ${QUESTS[id].n}</div><div class="o">◇ ${QUESTS[id].steps[Math.min(G.q[id].step,QUESTS[id].steps.length-1)]}${id==='hunt'?` (${G.q.hunt.count}/3)`:''}</div>`).join('')||'<div class="o dim">ไม่มีเควสต์ค้าง</div>';},
  levelUp(n){SFX.level();toast(`⬆️ เลเวลอัป! Lv.${G.level} — ได้รับ ${n*CONFIG.levelPoints} แต้มค่าพลัง (กด C เพื่อแจก)`,3500);this.hud();},

  /* ---- talent selection (character creation) ---- */
  diffSel:'normal',
  scr_create(){const L=Object.assign({},DEFLOOK,G.look);
    const sw=(arr,key)=>arr.map(c=>`<button class="sw ${L[key]===c?'on':''}" data-lk="${key}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')+
      `<label class="sw pick" title="เลือกสีเอง"><input type="color" id="pc-${key}" value="${/^#[0-9a-f]{6}$/i.test(L[key]||'')?L[key]:'#888888'}"></label>`;
    return`<h2>${ico('brush',22)} สร้างตัวละคร</h2><div class="eqg"><div><canvas id="pv" width="220" height="270"></canvas></div><div class="cr">
      <h3>ชื่อ</h3><p><input id="pname" maxlength="12" placeholder="ตั้งชื่อตัวละคร (ไม่เกิน 12 ตัว)" value="${(L.name||'').replace(/"/g,'')}" style="width:260px"></p>
      <h3>เพศ</h3><div class="swrow"><button class="btn sm ${L.sex==='m'?'':'ghost'}" data-sex="m">♂ ชาย</button><button class="btn sm ${L.sex==='f'?'':'ghost'}" data-sex="f">♀ หญิง</button></div>
      <h3>ทรงผม</h3><div class="swrow">${Object.entries(HAIR_STYLES).map(([k,n])=>`<button class="btn sm ${L.hstyle===k?'':'ghost'}" data-hstyle="${k}">${n}</button>`).join('')}</div>
      <h3>สีผิว</h3><div class="swrow">${sw(SKIN_TONES,'skin')}</div><h3>สีผม</h3><div class="swrow">${sw(HAIR_COLORS,'hair')}</div><h3>สีตา</h3><div class="swrow">${sw(EYE_COLORS,'eye')}</div>
      <p><button class="btn sm" data-lookrand="1">🎲 สุ่ม</button> <button class="btn sm ghost" data-lookreset="1">รีเซ็ต</button></p>
      <p class="dim">${UI.creating?'เลือกรูปลักษณ์ก่อนเริ่มผจญภัย ขั้นต่อไปคือเลือกพรสวรรค์':'เปลี่ยนรูปลักษณ์ได้ทุกเมื่อ (ไม่เสียค่าใช้จ่าย)'}</p>
      <p>${UI.creating?'<button class="btn" data-open="talent">ต่อไป: เลือกพรสวรรค์ ▶</button>':'<button class="btn" data-close="1">เสร็จ</button>'}</p></div></div>`;},
  scr_menu(){
    const R=(o,ic,l,k)=>`<button class="mrow" data-open="${o}"><span class="mi">${ico(ic)}</span><span class="ml">${l}</span><kbd>${k}</kbd></button>`;
    const A=(a,ic,l,k)=>`<button class="mrow" data-${a}="1"><span class="mi">${ico(ic)}</span><span class="ml">${l}</span>${k?`<kbd>${k}</kbd>`:''}</button>`;
    const S=StatSync.get(),bar=(v,m,c)=>`<div class="mbar"><i style="width:${Math.max(0,Math.min(100,v/Math.max(1,m)*100))}%;background:${c}"></i></div>`;
    return`<div class="emenu"><div class="emn-l">
        <div class="mlist">${R('char','status','สถานะตัวละคร','C')}${R('equip','equip','อุปกรณ์และกระเป๋า','I')}${R('skills','skill','สกิล','K')}${R('quests','scroll','เควสต์','Q')}${R('map','map','แผนที่โลก','M')}${R('ency','ency','สารานุกรมศัตรู','B')}</div>
        <div class="mlist sub">${A('save','save','บันทึกเกม','')}${A('load','load','โหลดเกม','')}${R('controls','controls','ปุ่มควบคุม','?')}${A('title','home','กลับหน้าหลัก (บันทึกก่อน)','')}${R('debug','gear','เครื่องมือดีบัก','`')}${window.CF_WS?'':`<a class="mrow" href="balance.html" style="text-decoration:none"><span class="mi">${ico('controls')}</span><span class="ml">Balance Lab (ปรับค่าเกม)</span></a>`}</div>
      </div>
      <div class="emn-r"><div class="sumcard">
        <div class="emn-head">${pname()}</div>
        <div class="sl">Lv.${G.level} · ${TALENTS[G.talent].th} · ${Diff.cur().n}</div>
        <div class="sb"><span>HP</span>${bar(G.hp,S.maxHP,'#b8413a')}<b>${Math.round(G.hp)} / ${S.maxHP}</b></div>
        <div class="sb"><span>MP</span>${bar(G.mp,S.maxMP,'#3a7ac8')}<b>${Math.round(G.mp)} / ${S.maxMP}</b></div>
        <div class="sb"><span>XP</span>${bar(G.xp,CONFIG.xpNext(G.level),'#c8a464')}<b>${G.level>=CONFIG.levelCap?'เลเวลสูงสุด (Lv.'+CONFIG.levelCap+')':G.xp+' / '+CONFIG.xpNext(G.level)}</b></div>
        <div class="sgold">${ico('coin',18)} ${G.gold}</div>
      </div>
      <p class="dim hint">Tab หรือ Esc เพื่อปิด · N ซ่อน/แสดงแผนที่เล็ก</p></div></div>`;},
  scr_controls(){return`<h2>ปุ่มควบคุม</h2>${document.getElementById('help').innerHTML}`;},
  scr_talent(){return`<h2>ระดับความยาก${CONFIG.diffLock?' <small class="dim">(ล็อกไว้ที่ดาร์กโซล)</small>':''}</h2><div class="diffrow">${Object.entries(DIFFICULTY).filter(([k])=>!CONFIG.diffLock||k===CONFIG.diffLock).map(([k,d])=>`<button class="diffc ${k} on" ${CONFIG.diffLock?'disabled style="grid-column:1/-1;cursor:default"':`data-diff="${k}"`}><b>${d.ic} ${d.n}</b><small>${d.desc}</small></button>`).join('')}</div><h2>เลือกพรสวรรค์ (Unique Talent) — เลือกได้ 1 อย่างเท่านั้น</h2><div class="tal">`+Object.entries(TALENTS).map(([k,t])=>{const sk=SKILLS[t.skill];
    return`<button class="talc" data-tal="${k}"><div class="ti">${ico(TALENT_ICO[k],34)}</div><b>${t.n}</b><div class="dim">${t.th}</div><p>${t.desc}</p><div class="sk">สกิลเฉพาะตัว: <b>${sk.n}</b><br><small>${sk.desc}</small></div></button>`;}).join('')+'</div><p class="dim">พรสวรรค์เลือกครั้งเดียวตอนสร้างตัวละคร และกำหนดสกิลช่องที่ 3 (เฉพาะตัว)</p>';},

  /* ---- character status ---- */
  scr_char(){
    const S=StatSync.get(),L=equipped();
    const attrs=Object.keys(ATTRN).map(k=>`<div class="arow"><span>${ATTRN[k]}</span><b>${S[k]}</b><small class="dim">(พื้นฐาน ${BASE_ATTR[k]} + แจก ${G.alloc[k]} + อุปกรณ์ ${S[k]-BASE_ATTR[k]-G.alloc[k]}) · สูงสุด ${CONFIG.attrMax} · ${ATTR_HINT[k]}</small><button class="btn sm" data-al="${k}" ${G.points&&BASE_ATTR[k]+G.alloc[k]<CONFIG.attrMax?'':'disabled'}>${BASE_ATTR[k]+G.alloc[k]>=CONFIG.attrMax?'MAX':'+1'}</button></div>`).join('');
    const mast=Object.keys(WEAPONS).filter(w=>G.mastery[w]).map(w=>`<div>${WEAPONS[w].n}: Lv.${Prog.masteryLv(w)} <small class="dim">(+${Prog.masteryLv(w)*2}% ดาเมจ, ${G.mastery[w]} XP)</small></div>`).join('')||'<div class="dim">ยังไม่มี — ใช้อาวุธตีศัตรูเพื่อเพิ่ม</div>';
    const sets=activeSetBonuses(L).map(s=>`<div class="good">${SETS[s.set].n} ${s.n} ชิ้น: ${s.b.d||Object.keys(s.b).map(k=>(STATN2[k]||k)+' '+fmtStat(k,s.b[k])).join(', ')}</div>`).join('')||'<div class="dim">—</div>';
    const pas=[...S.passives].map(p=>{const P=PASSIVES.leg[p]||PASSIVES.god[p];return P?`<div>★ ${P.n}: ${P.d}</div>`:'';}).join('')||'<div class="dim">—</div>';
    const modsHtml=S.mods&&S.mods.length?S.mods.map(m=>`<div class="${m.kind==='debuff'?'bad':'good'}">${m.kind==='debuff'?'▼':'▲'} ${m.n||m.id}: ${m.stat} ${m.op==='mul'?'×'+m.v:(m.v>0?'+':'')+m.v} <small class="dim">(เหลือ ${(m.left/60).toFixed(1)} วิ)</small></div>`).join(''):'<div class="dim">ไม่มี</div>';
    const ago=StatSync.lastTickAt?Math.round((Date.now()-StatSync.lastTickAt)/1000):null;
    const syncLine=`<div class="ts dim">${ico('gear',14)} อัปเดตค่าสถานะอัตโนมัติทุก 5 วินาที${ago!==null?` · รอบล่าสุด ${ago} วิที่แล้ว`:''} · ทรัพยากร: HP ${Math.round(G.hp)}/${S.maxHP} · MP ${Math.round(G.mp)}/${S.maxMP} · สตามินา ${S.maxSTA}/${S.maxSTA}</div>`;
    return`<h2>${ico('status',22)} ค่าสถานะตัวละคร${G.look&&G.look.name?' — '+G.look.name.replace(/[<>&]/g,''):''}</h2><div class="eqg"><div><canvas id="pv" width="220" height="270"></canvas><p><button class="btn sm" data-open="create">🎨 แต่งตัวละคร</button></p>
      <div class="stat"><span>เลเวล</span><b>${G.level}</b><span>XP</span><b>${G.level>=CONFIG.levelCap?'เลเวลสูงสุด (Lv.'+CONFIG.levelCap+')':G.xp+' / '+CONFIG.xpNext(G.level)}</b><span>พรสวรรค์</span><b>${TALENTS[G.talent].ic} ${TALENTS[G.talent].th}</b><span>ความยาก</span><b>${Diff.cur().ic} ${Diff.cur().n}</b><span>ทอง</span><b>${G.gold}</b></div></div>
    <div><h3>ค่าพลังหลัก — แต้มคงเหลือ <span class="pts">${G.points}</span> ${Inv.has('reset')?'<button class="btn ghost sm" data-use="reset">📜 ใช้คัมภีร์ล้างค่าพลัง</button>':''}</h3>${attrs}
      <h3>ค่าที่คำนวณได้</h3><div class="stat2">
      <span>HP สูงสุด</span><b>${S.maxHP}</b><small>500 + VIT×20 + Lv×50</small>
      <span>MP สูงสุด</span><b>${S.maxMP}</b><small>100 + INT×10</small>
      <span>สตามินา</span><b>${S.maxSTA}</b><small>100 + (AGI−10)×2</small>
      <span>พลังโจมตี</span><b>${S.ap}</b><small>อาวุธ + STR×2</small>
      <span>พลังเวท</span><b>${S.mpow}</b><small>อาวุธ + INT×3</small>
      <span>DEF / M.DEF</span><b>${S.def} / ${S.mdef}</b><small>10 + อุปกรณ์ + AGI ทุก 10 = +3 DEF</small>
      <span>อัตราคริติคอล</span><b>${pct(S.critRate)}</b><small>5% + LUK×0.2% (เพดาน 75%)</small>
      <span>ดาเมจคริติคอล</span><b>${pct(S.critDmg)}</b><small>150% + LUK×1% (เพดาน 350%)</small>
      <span>เจาะเกราะ %</span><b>${pct(S.apenPct)}</b><small>ลด DEF ศัตรูตามสัดส่วน (คิดก่อนแบบค่าคงที่)</small>
      <span>เจาะเกราะ (คงที่)</span><b>${S.apen}</b><small></small>
      <span>ต้านคริติคอลกายภาพ</span><b>${pct(S.pcritRes)}</b><small>DEF ทุก 10 = +1%</small>
      <span>ต้านคริติคอลเวท</span><b>${pct(S.mcritRes)}</b><small>M.DEF ทุก 10 = +1%</small>
      <span>หลบหลีก</span><b>${pct(S.evasion)}</b><small>AGI ทุก 10 = +1% (เพดาน 70%) · ท่าสุดยอด/ลำแสงหลบไม่ได้</small>
      <span>ลดดาเมจ</span><b>${pct(S.dr)}</b><small>เพดาน 75%</small>
      <span>ความเร็ว</span><b>${pct(S.spd)}</b><small>AGI</small>
      <span>ฟื้นฟูมานา</span><b>+${pct(S.mpRegen)}</b><small>1 MP/3 วิ ในการต่อสู้ · 1 MP/1.5 วิ นอกการต่อสู้ (โบนัสเพดาน 30%)</small>
      <span>ลดค่ามานา</span><b>${pct(S.mpCost)}</b><small>เพดาน 30%</small>
      <span>ต้านสถานะผิดปกติ</span><b>${pct(S.statusRes)}</b><small>STR ทุก 10 = +1% (เพดาน 75%)</small>
      <span>เกจสุดยอด</span><b>${Math.floor(G.ult||0)} / 100</b><small>ตีโดน +2 · คอมโบครบ +5 · ปัดป้อง +8 · สวนกลับ +5 · โดนตี +1</small></div>
      ${S.uniq?`<div class="ts">พาสซีฟเฉพาะตัว: ${SKILLS[S.uniq.skill].n} (${S.uniq.id} ${pct(S.uniq.v)})</div>`:''}<div class="ts">ต้านทาน: ${Object.entries(S.res).map(([k,v])=>`<span style="color:${ELC[k]}">${ELN[k]} ${pct(v)}</span>`).join(' · ')}</div>
      <h3>บัฟ / ดีบัฟที่ทำงานอยู่</h3>${modsHtml}${syncLine}
      <h3>โบนัสเซ็ต</h3>${sets}<h3>พาสซีฟพิเศษ</h3>${pas}<h3>ความชำนาญอาวุธ</h3>${mast}</div></div>`;
  },

  /* ---- equipment + inventory ---- */
  scr_equip(){
    const sel=this.sel&&itemByUid(this.sel);const F=this.filt;
    const slots=SLOTS.map(s=>{const it=G.eq[s]&&itemByUid(G.eq[s]);return`<button class="eslot" data-slot="${s}" ${it?rc(it.rar):''}><small>${SLOTN[s]}</small><span>${it?bIco(it.base,16)+' '+itemName(it):'—'}</span></button>`;}).join('');
    let list=G.bag.filter(it=>(F.type==='all'||BASES[it.base].type===F.type)&&(F.rar==='all'||it.rar===F.rar));list=Inv.sorted(list,F.sort);
    const opts=(arr,cur,lab)=>arr.map(([v,n])=>`<option value="${v}" ${cur===v?'selected':''}>${n}</option>`).join('');
    const items=list.map(it=>`<button class="it${this.sel===it.uid?' eq':''}" data-sel="${it.uid}" style="border-color:${RARC[it.rar]}88"><span class="ic">${bIco(it.base,18)}</span><span ${rc(it.rar)}>${itemName(it)}</span><br><small>${SLOTN[BASES[it.base].type]} · Lv.${it.req}${Equip.isEquipped(it)?' · <b class="good">สวมอยู่</b>':''}</small></button>`).join('')||'<div class="dim">ไม่มีไอเท็มตามตัวกรอง</div>';
    let det='<div class="dim">เลือกไอเท็มเพื่อดูรายละเอียด เปรียบเทียบ ตีบวก และใส่รูน</div>';
    if(sel){const sl=Equip.slotFor(sel),cur=G.eq[sl]&&itemByUid(G.eq[sl]),eqd=Equip.isEquipped(sel),ec=Equip.enhanceCost(sel);
      const runes=Object.keys(G.mats).filter(k=>MATS[k].rune);
      det=itemTip(sel,!eqd&&cur?cur:null)+`<div class="acts">${eqd?`<button class="btn sm" data-uneq="${sel.uid}">ถอด</button>`:`<button class="btn sm" data-eq="${sel.uid}" ${Equip.canEquip(sel)?'':'disabled'}>สวมใส่</button>`}
        <span class="dim">ตีบวก +${sel.enh}/+${Equip.maxEnh(sel)} · ตีบวกได้ที่โต๊ะตีเหล็ก (ข้างโบโร)</span>
        ${eqd?'':`<button class="btn ghost sm" data-salv="${sel.uid}">แยกชิ้นส่วน</button>`}${eqd?'':`<span class="dim" style="align-self:center">${ico('coin',14)} ขายได้ที่ร้านค้าลุงชายเท่านั้น</span>`}</div>`+
        (sel.sockets.length?`<div class="acts">`+sel.sockets.map((r,i)=>r?`<button class="btn ghost sm" data-unsock="${i}">${mIco(r,14)} ถอดรูน (รูนจะแตก)</button>`:
          (runes.length?runes.map(k=>`<button class="btn ghost sm" data-sock="${i}" data-rune="${k}">ใส่ ${mIco(k,14)}${MATS[k].n} ช่อง ${i+1}</button>`).join(''):`<span class="dim">ช่อง ${i+1} ว่าง (ไม่มีรูน)</span>`)).join('')+'</div>':'');}
    const mats=Object.keys(G.mats).map(k=>{const m=MATS[k];return`<span class="mat">${mIco(k,14)} ${m.n} ×${G.mats[k]}${m.scroll||m.use||m.manaPotion?` <button class="btn sm" data-use="${k}">ใช้</button>`:''}</span>`;}).join('')||'<span class="dim">—</span>';
    return`<h2>${ico('bag',22)} อุปกรณ์ & กระเป๋า <small class="dim">ทอง ${G.gold} · ช่องอุปกรณ์ <span class="${G.bag.length>=LOOT_CONFIG.inventory.equipSlots?'bad':''}">${G.bag.length}/${LOOT_CONFIG.inventory.equipSlots}</span> · วัตถุดิบซ้อนได้ ${LOOT_CONFIG.inventory.stackMax}</small></h2><div class="eqg"><div><canvas id="pv" width="220" height="270"></canvas><div class="slots9">${slots}</div></div>
      <div><div class="filt">ประเภท <select data-f="type">${opts([['all','ทั้งหมด'],...ALLTYPES.map(t=>[t,SLOTN[t]])],F.type)}</select>
        ความหายาก <select data-f="rar">${opts([['all','ทั้งหมด'],...RARS.map(r=>[r,RARN[r]])],F.rar)}</select>
        เรียง <select data-f="sort">${opts([['rarity','ความหายาก'],['level','เลเวล'],['type','ประเภท'],['name','ชื่อ']],F.sort)}</select> <small class="dim">${list.length}/${G.bag.length} ชิ้น</small></div>
        <div class="inv">${items}</div><div class="detail">${det}</div><h3>วัตถุดิบ / ของใช้</h3><div class="mats">${mats}</div></div></div>`;
  },

  /* ---- skills ---- */
  /* ---- skill rune sockets ---- */
  sk:{sel:null,modal:null,pick:null},
  skStats(id){const s=SKILLS[id],sc=Skills.scale(id),lv=Skills.level(id);
    if(s.type==='passive')return`<div class="skst"><span>ผล <b>${s.desc.replace('พาสซีฟ: ','')}</b> ×${sc.coef.toFixed(2)}</span><span>ใช้ <b>ไม่ใช้ MP</b></span><span>เลเวล <b>${lv}</b></span></div>`;
    const dmg=s.coef?`${Math.round(s.coef*sc.coef*100)}% ${s.type==='magic'?'พลังเวท':'พลังโจมตี'}${s.multi?` (${s.multi} ฮิต)`:''}`:'—';
    const el=s.el==='weapon'?'ตามอาวุธ':ELN[s.el]||'—';
    return`<div class="skst"><span>ดาเมจ <b>${dmg}</b></span><span>คูลดาวน์ <b>${(s.cd*sc.cd).toFixed(1)} วิ</b></span><span>ใช้ <b>${s.tier==='ultimate'?CONFIG.ult.cost+' เกจสุดยอด':s.type==='passive'?'ไม่ใช้ (พาสซีฟ)':Mana.cost(id,Stats.player())+' MP'+(s.hpCost?' + '+(s.hpCost*100)+'% HP':'')}</b></span>
      <span>ระยะ <b>${s.range}</b></span><span>ธาตุ <b>${el}</b></span><span>ต่อคอมโบ <b>${s.combo?'ได้':'ไม่ได้'}</b></span><span>ท่า <b>${s.anim}</b></span><span>เลเวล <b>${lv}</b></span></div>`;},
  scr_skills(){
    const K=G.skills,T=this.sk;
    const sockets=K.slots.map((id,i)=>{const s=id&&SKILLS[id],tier=TIERS[i],lockd=i===2&&K.bound,up=id&&i===2&&Skills.upgradeInfo(id).can;
      const state=!id?(i===2&&!K.bound?'ว่าง — รอผนึก':'ว่าง'):lockd?'ผนึกถาวร':'ติดตั้งแล้ว';
      return`<button class="rune r-${tier}${T.sel===i?' sel':''}${id?'':' empty'}${lockd?' locked':''}" data-ssock="${i}">
        <span class="gem"><span class="gi">${s?s.ic:'◇'}</span>${lockd?'<span class="lk" title="ผนึกถาวร">🔒</span>':''}${up?'<span class="upb" title="อัปเกรดได้">⬆</span>':''}</span>
        <small class="rt">ช่อง ${i+1} · ${TIERN[tier]}</small><b>${s?s.n:'—'}</b><small>${s?'Lv.'+Skills.level(id)+' · ':''}${state}</small></button>`;}).join('');
    let panel='<p class="dim">คลิกซ็อกเก็ตเพื่อเลือกสกิลที่ใส่ได้</p>';
    if(T.sel!==null){const i=T.sel,tier=TIERS[i],cur=K.slots[i];
      const all=Object.keys(SKILLS).filter(k=>SKILLS[k].tier===tier&&K.learned.has(k)&&skillUsable(k,'player'));   // only skills the player owns
      if(i===2&&K.bound){const id=K.bound,u=Skills.upgradeInfo(id),nb=G.mats[SEAL_BREAKER.item]||0,others=[...K.learned].filter(k=>SKILLS[k].tier==='unique'&&k!==id);
        const L=u.req?SKILL_UPGRADE.levels[u.next]:null,C=Skills.scale(id);
        panel=`<h3 class="t-unique">🔒 ${SKILLS[id].ic} ${SKILLS[id].n} — ผนึกถาวรกับตัวละครนี้</h3><div class="dim">${SKILLS[id].desc}</div>${this.skStats(id)}
          <div class="upbox"><h3>⬆ อัปเกรดสกิลเฉพาะตัว <small class="dim">Lv.${Skills.level(id)} / ${SKILL_UPGRADE.maxLevel}</small></h3>
          ${u.max?'<div class="good">เลเวลสูงสุดแล้ว</div>':u.req?`<div>Lv.${u.next}: ดาเมจ ×${C.coef.toFixed(2)} → <b class="good">×${L.coef.toFixed(2)}</b> · คูลดาวน์ ×${C.cd.toFixed(2)} → <b class="good">×${L.cd.toFixed(2)}</b></div>
            <div>ใช้: ${Object.entries(u.req.mats).map(([k,q])=>`<span class="${(G.mats[k]||0)>=q?'good':'bad'}">${mIco(k,14)} ${MATS[k].n} ${G.mats[k]||0}/${q}</span>`).join(' · ')} · <span class="${u.goldShort?'bad':'good'}">🪙 ${G.gold}/${u.req.gold}</span></div>
            <button class="btn" data-skup="${id}" ${u.can?'':'disabled'}>⬆ อัปเกรดเป็น Lv.${u.next}</button>`:`<div class="dim">${u.reason}</div>`}
          <div class="dim">ค่าวัสดุและตัวคูณตั้งค่าได้ในตาราง SKILL_UPGRADE (ค่าปัจจุบันเป็นค่าตั้งต้นสำหรับทดสอบ)</div></div>
          <div class="sealbox"><h3>🗝️ ปลดผนึก <small class="dim">ตราทำลายผนึกเฉพาะตัว ×${nb}</small></h3>
          ${others.length?others.map(k=>`<div class="skr"><div><b>${SKILLS[k].ic} ${SKILLS[k].n}</b> <small>Lv.${Skills.level(k)} (เก็บไว้ในคลัง)</small><div class="dim">${SKILLS[k].desc}</div></div>
            <button class="btn ghost sm" data-skrep="${k}" ${nb?'':'disabled'}>เปลี่ยนเป็นสกิลนี้</button></div>`).join(''):'<div class="dim">ยังไม่มีสกิลเฉพาะตัวอื่นในคลัง — สกิลที่ถูกเปลี่ยนออกจะถูกเก็บไว้ที่นี่พร้อมเลเวลอัปเกรด</div>'}
          ${nb?'':'<div class="dim">ไม่มีตราทำลายผนึก — เปลี่ยนสกิลเฉพาะตัวไม่ได้</div>'}</div>`;}
      else panel=`<h3 class="t-${tier}">ช่อง ${i+1} · ${TIERN[tier]} — สกิลที่มี</h3>`+(all.length?'':'<p class="dim">ยังไม่มีสกิลประเภทนี้</p>')+all.map(k=>{const s=SKILLS[k],L=K.learned.has(k),on=cur===k;
        let act;if(i===2)act=`<button class="btn sm" data-skbind="${k}">🔒 ผนึกถาวร</button>`;
        else if(on)act=`<button class="btn ghost sm" data-skun="${i}">ถอดออก</button>`;
        else act=`<button class="btn sm" data-skeq="${k}" data-slot="${i}">${cur?'แทนที่':'ติดตั้ง'}</button>`;
        return`<div class="skr ${L?'':'locked'}${on?' on':''}"><div><b>${s.ic} ${s.n}</b> <small>[${TIERN[s.tier]}]</small>${on?' <b class="good">● ติดตั้งอยู่</b>':''}<div class="dim">${s.desc}</div>${this.skStats(k)}</div>${act}</div>`;}).join('')
        +(i===2?'<div class="warn">⚠ สกิลเฉพาะตัวจะถูกผนึกกับตัวละครอย่างถาวร ถอดหรือเปลี่ยนไม่ได้ ยกเว้นใช้ไอเท็มหายากที่สุด 🗝️ ตราทำลายผนึกเฉพาะตัว</div>':'')
        +(i===3?'<div class="dim">สกิลสุดยอดใช้เกจสุดยอด 100 (ไม่ใช้ MP)</div>':'');}
    let modal='';
    if(T.modal==='bind'){const s=SKILLS[T.pick];modal=`<div class="cmodal"><div class="cbox"><h3>🔒 ยืนยันการผนึกถาวร</h3><p>ผนึก <b>${s.ic} ${s.n}</b> เข้ากับตัวละครนี้ <b class="bad">อย่างถาวร</b></p>
      <p>หลังผนึก จะถอด เปลี่ยน หรือโอนสกิลนี้ไม่ได้ ยกเว้นใช้ 🗝️ ตราทำลายผนึกเฉพาะตัว — แต่ยังอัปเกรดได้ตลอด</p>
      <div class="acts"><button class="btn" data-skbindyes="1" autofocus>ยืนยัน ผนึกถาวร</button><button class="btn ghost" data-skno="1">ยกเลิก</button></div></div></div>`;}
    if(T.modal==='replace'){const s=SKILLS[T.pick],o=SKILLS[K.bound];modal=`<div class="cmodal"><div class="cbox"><h3>🗝️ ยืนยันการปลดผนึก</h3>
      <p>ใช้ 🗝️ ตราทำลายผนึกเฉพาะตัว ×1 เพื่อเปลี่ยน <b>${o.ic} ${o.n}</b> (Lv.${Skills.level(K.bound)}) → <b>${s.ic} ${s.n}</b> (Lv.${Skills.level(T.pick)})</p>
      <p>สกิลเดิมและเลเวลอัปเกรดจะถูกเก็บไว้ในคลัง · สกิลใหม่จะถูกผนึกถาวรทันที · ตราจะถูกใช้เมื่อกดยืนยันเท่านั้น</p>
      <div class="acts"><button class="btn" data-skrepyes="1" autofocus>ยืนยัน ใช้ตราและเปลี่ยน</button><button class="btn ghost" data-skno="1">ยกเลิก</button></div></div></div>`;}
    return`<h2>✨ ซ็อกเก็ตรูนสกิล</h2><div class="runes">${sockets}</div>
      <p class="dim">ในการต่อสู้: กด <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> ใช้สกิลในช่องนั้น · <kbd>L</kbd> = ท่าสุดยอด (เกจ 100) · โจมตีปกติใช้ <kbd>คลิกซ้าย</kbd> ต่อย / <kbd>คลิกขวา</kbd> เตะ</p>
      <div class="skpanel">${panel}</div>
      ${modal}`;
  },
  /* ---- crafting: 6 ingredient slots, recipe recognised from exact ids + quantities ---- */
  cs:{slots:Array(6).fill(null),boost:false,phase:'idle',res:null,confirm:false},
  csInSlots(id){return this.cs.slots.reduce((a,s)=>a+(s&&s.id===id?s.q:0),0);},
  csAdd(id){const S=this.cs.slots;if(this.csInSlots(id)>=(G.mats[id]||0)){toast('มี '+MATS[id].n+' ไม่พอ');return;}
    const ex=S.findIndex(s=>s&&s.id===id);if(ex>=0)S[ex].q++;else{const e=S.findIndex(s=>!s);if(e<0){toast('ช่องเต็มแล้ว (6 ช่อง)');return;}S[e]={id,q:1};}
    this.cs.phase='idle';},
  scr_craft(){
    const C=this.cs,chk=Craft.check(C.slots,C.boost),r=chk.recipe||Craft.match(C.slots),empty=!C.slots.some(Boolean),busy=C.phase==='forging';
    const slots=C.slots.map((s,i)=>s?`<div class="cslot full"><span class="ci">${mIco(s.id,14)}</span><b>${MATS[s.id].n}</b>
        <div class="qrow"><button class="btn ghost sm" data-cq="${i}" data-d="-1" ${busy?'disabled':''} aria-label="ลด">−</button><span class="${(G.mats[s.id]||0)<this.csInSlots(s.id)?'bad':''}">×${s.q}</span><button class="btn ghost sm" data-cq="${i}" data-d="1" ${busy?'disabled':''} aria-label="เพิ่ม">+</button></div>
        <button class="cx" data-cx="${i}" ${busy?'disabled':''} aria-label="เอาออก">✕</button></div>`
      :`<div class="cslot"><span class="plus">+</span><small>ช่อง ${i+1}</small></div>`).join('');
    const nd=G.mats.divine||0;
    const boost=`<button class="cboost${C.boost?' on':''}" data-boost="1" ${nd&&!busy?'':'disabled'}>${mIco('divine',14)} คริสตัลตีเหล็กศักดิ์สิทธิ์ ×${nd} — ${C.boost?'<b>ใช้อยู่ (+20%)</b>':nd?'คลิกเพื่อใช้ (+20%)':'ไม่มี (หายากมาก)'}</button>`;
    let prev;
    if(busy)prev=`<div class="cres forging"><div class="anvil">⚒️</div><div class="big">กำลังตีเหล็ก...</div></div>`;
    else if(C.phase==='success'){const x=C.res;prev=`<div class="cres win"><div class="big good">✨ ตีเหล็กสำเร็จ!</div><small class="dim">โอกาส ${pct(x.chance)} · สุ่มได้ ${x.roll.toFixed(3)}</small>${x.item?itemTip(x.item):`<div class="big">${mIco(x.mat,14)} ${MATS[x.mat].n} ×${x.q}</div>`}</div>`;}
    else if(C.phase==='fail'){const x=C.res;prev=`<div class="cres lose"><div class="big bad">💥 ตีเหล็กล้มเหลว</div><small class="dim">โอกาส ${pct(x.chance)} · สุ่มได้ ${x.roll.toFixed(3)}</small>
      <div>วัตถุดิบที่เสียไป: ${Object.entries(x.lost).map(([k,q])=>mIco(k,14)+' '+MATS[k].n+' ×'+q).join(', ')}</div><div class="dim">ไม่ได้อุปกรณ์</div></div>`;}
    else if(r){const base=Craft.base(r),fin=Craft.chance(r,C.boost),out=r.out.base?BASES[r.out.base]:MATS[r.out.mat];
      prev=`<div class="cres match" style="border-color:${RARC[r.rar]}"><div class="rico">${r.out.base?bIco(r.out.base,30):mIco(r.out.mat,30)}</div><div class="tn" ${rc(r.rar)}>${recipeName(r)} ${Craft.discovered(r)?'':'<span class="newr">สูตรใหม่!</span>'}</div>
        <div class="ts">ความหายาก <b ${rc(r.rar)}>${RARN[r.rar]}</b>${r.out.base?` · ${SLOTN[BASES[r.out.base].type]} · iLv.${Math.max(RECIPE_ILVL[r.rar],G.level)} (ค่าเสริมสุ่ม)`:''}</div>
        <div class="ts">ใช้: ${Object.entries(r.mats).map(([k,q])=>`<span class="${(G.mats[k]||0)>=q?'':'bad'}">${mIco(k,14)} ${MATS[k].n} ×${q} (มี ${G.mats[k]||0})</span>`).join(' · ')}</div>
        <div class="chance"><span>โอกาสสำเร็จ</span><b>${pct(base)}</b>${C.boost?` <span class="good">+ ${mIco('divine',12)} ${pct(CONFIG.craftBoost)}</span> = <b class="good">${pct(fin)}</b>`:''}</div>
        <div class="bar2"><i style="width:${fin*100}%;background:${RARC[r.rar]}"></i></div>
        ${chk.short?`<div class="bad">ขาด: ${chk.short.map(x=>`${MATS[x.id].n} อีก ${x.need-x.have}`).join(', ')}</div>`:''}
        <div class="dim">ล้มเหลว = เสียวัตถุดิบทั้งหมด${C.boost?' และคริสตัล':''} และไม่ได้อุปกรณ์</div></div>`;}
    else if(!empty){const hs=Craft.hints(C.slots);prev=`<div class="cres none"><div class="big">❔ ส่วนผสมนี้ไม่ตรงกับสูตรใด</div>`+
      (hs.length?hs.slice(0,3).map(h=>`<div>ใกล้เคียง <b ${rc(h.r.rar)}>${recipeName(h.r)}</b> — ยังขาด ${h.missing.map(m=>mIco(m.id,14)+MATS[m.id].n+' ×'+m.q).join(', ')}</div>`).join(''):'<div class="dim">ลองอ่านเบาะแสในสมุดจดสูตรด้านขวา</div>')+`</div>`;}
    else prev=`<div class="cres none"><div class="big dim">⚔️ ผลลัพธ์การคราฟต์</div><div class="dim">คลิกวัตถุดิบในกระเป๋าเพื่อวางลงช่อง ลำดับไม่สำคัญ</div></div>`;
    const bag=Object.keys(G.mats).filter(k=>!MATS[k].scroll&&!MATS[k].booster&&!MATS[k].use).map(k=>{const left=G.mats[k]-this.csInSlots(k);
      return`<button class="it" data-cadd="${k}" ${left>0&&!busy?'':'disabled'}><span class="ic">${mIco(k,14)}</span>${MATS[k].n}<br><small>เหลือ ${left}/${G.mats[k]}${MATS[k].rareMat?' · <b class="tu">หายาก</b>':''}</small></button>`;}).join('')||'<div class="dim">ไม่มีวัตถุดิบ</div>';
    const clues=RECIPES.filter(x=>Craft.clueKnown(x)).map(x=>`<p>${Craft.discovered(x)?'✔':'•'} ${x.clue}</p>`).join('');
    const can=chk.ok&&!busy;
    const ctabs=`<div class="acts"><button class="btn ${this.craftTab==='enh'?'ghost':''} sm" data-ctab="make">${ico('craft',14)} สร้างอุปกรณ์</button><button class="btn ${this.craftTab==='enh'?'':'ghost'} sm" data-ctab="enh">${ico('gem',14)} ตีบวกอุปกรณ์</button></div>`;
    if(this.craftTab==='enh')return`<h2>${ico('craft',22)} โต๊ะตีเหล็ก — ตีบวก <small class="dim">ทอง ${G.gold} · แร่เหล็ก ${G.mats.ore||0} · ทั่วไปสูงสุด +${CONFIG.enhanceMax} · ของ craft สูงสุด +${CONFIG.enhanceMaxCraft}</small></h2>${ctabs}`+this.enhList();
    return`<h2>⚒️ ระบบตีเหล็ก <small class="dim">สำเร็จ ${G.stats.craftOk}/${G.stats.crafts} ครั้ง · ${RARS.filter(r=>RARS.indexOf(r)<=RARS.indexOf(CONFIG.maxRarity)).map(r=>RARN[r]+' '+pct(CONFIG.craftRates[r])).join(' · ')}</small></h2>${ctabs}
    <div class="cgrid"><div><div class="cslots">${slots}</div>${boost}<div class="carrow">↓</div>${prev}
      <div class="acts"><button class="btn" data-cgo="1" ${can?'':'disabled'}>⚒️ ${busy?'กำลังตีเหล็ก...':'เริ่มคราฟต์'+(chk.ok?` (${pct(chk.chance)})`:'')}</button>
        <button class="btn ghost" data-cclear="1" ${busy?'disabled':''}>ล้างทั้งหมด</button><button class="btn ghost" data-ccancel="1" ${busy?'disabled':''}>ยกเลิก</button></div></div>
    <div><h3>กระเป๋าวัตถุดิบ (คลิกเพื่อวาง)</h3><div class="inv">${bag}</div>
      <h3>📔 สมุดจดสูตร <small class="dim">— เบาะแสจากคัมภีร์ จดหมาย และคนในถ้ำ</small></h3><div class="clues">${clues||'<p class="dim">ยังไม่มี</p>'}</div>
      <p class="dim">ตีบวกและใส่รูนได้ที่หน้ากระเป๋า (I)</p></div></div>
    ${C.confirm&&chk.ok?`<div class="cmodal"><div class="cbox"><h3>ยืนยันการตีเหล็ก</h3><p>จะใช้: ${Object.entries(chk.recipe.mats).map(([k,q])=>`${mIco(k,14)} ${MATS[k].n} ×${q}${MATS[k].rareMat?' <b class="tu">(หายาก)</b>':''}`).join(', ')}${C.boost?', '+mIco('divine',14)+' คริสตัลศักดิ์สิทธิ์ ×1':''}</p>
      <p>โอกาสสำเร็จ <b>${pct(chk.chance)}</b> — ถ้าล้มเหลว <b class="bad">วัตถุดิบทั้งหมดจะหายไป</b></p>
      <div class="acts"><button class="btn" data-cyes="1" autofocus>ยืนยัน ตีเลย</button><button class="btn ghost" data-cno="1">ไม่ใช่ตอนนี้</button></div></div></div>`:''}`;
  },
  craftStart(){
    const C=this.cs;if(Craft.busy||C.phase==='forging')return false;   // guard against double execution
    const chk=Craft.check(C.slots,C.boost);if(!chk.ok){toast(chk.err);return false;}
    Craft.busy=true;C.phase='forging';C.confirm=false;this.rerender();SFX.swing();
    const slots=C.slots.map(s=>s&&{...s}),boost=C.boost;
    setTimeout(()=>{const r=Craft.attempt(slots,boost,true);Craft.busy=false;C.boost=false;
      if(r.ok){C.phase='success';C.res=r;SFX.craft();
        if(r.item&&BASES[r.item.base].type==='weapon'&&G.q.main1.step===1){Quest.advance('main1',2);if(!G.eq.weapon)Equip.equip(r.item);}}
      else if(r.failed){C.phase='fail';C.res=r;SFX.fail();}
      else{C.phase='idle';toast(r.err);}
      if(this.cur==='craft')this.rerender();this.hud();},1100);
    return true;
  },
  /* ---- ร้านค้า (ซื้อ / ขาย) ---- */
  shopTab:'buy',bulkArm:null,sellSel:new Set(),
  scr_shop(){const T=this.shopTab,tab=(k,l)=>`<button class="btn ${T===k?'':'ghost'} sm" data-shoptab="${k}">${l}</button>`;
    const head=`<h2>${ico('coin',22)} ร้านค้าลุงชาย <small class="dim">ทอง ${G.gold}</small></h2><div class="acts">${tab('buy','ซื้อ')}${tab('sell','ขาย')}</div>`;
    if(T==='buy'){const items=[['mp_s',30],['mp_m',70],['mp_l',150],['mp_x',320],['potion',40]];
      return head+`<div class="inv">`+items.map(([k,c])=>`<button class="it" data-buy="${k}" data-cost="${c}" ${G.gold>=c?'':'disabled'}><span class="ic">${mIco(k,18)}</span>${MATS[k].n}<br><small>${c} ทอง · มี ${G.mats[k]||0}</small></button>`).join('')+`</div><p class="dim">ยามานาใช้ในการต่อสู้ด้วยปุ่ม R (คูลดาวน์ 10 วินาที) · อาวุธและชุดเกราะซื้อได้ที่ร้านตีเหล็ก</p>`;}
    const A=this.bulkArm,arm=(k,l)=>A===k?`ยืนยัน: ${l}`:l;
    const gear=G.bag.filter(it=>!Equip.isEquipped(it));
    const SS=this.sellSel;for(const k of [...SS]){const[t,v]=[k[0],k.slice(2)];if(t==='i'?!gear.some(it=>String(it.uid)===v):!(G.mats[v]>0))SS.delete(k);}
    const selVal=sellSelValue(),cb=k=>`<button class="cb${SS.has(k)?' on':''}" data-ssel="${k}" aria-label="เลือก"></button>`;
    const selBar=`<div class="selbar"><span>${ico('bag',16)} เลือกไว้ <b>${selVal.n}</b> รายการ · รวม <b class="good">${selVal.g}</b> ทอง</span>
      <button class="btn ghost sm" data-sselall="gear">เลือกอุปกรณ์ทั้งหมด</button><button class="btn ghost sm" data-sselall="mats">เลือกวัตถุดิบทั้งหมด</button><button class="btn ghost sm" data-sselall="none" ${SS.size?'':'disabled'}>ล้างที่เลือก</button>
      <button class="btn sm" data-sellsel="1" ${SS.size?'':'disabled'}>${arm('sel','ขายที่เลือก')}</button></div>`;
    const gsum=r=>gear.filter(it=>!r||it.rar===r).reduce((s,it)=>s+Inv.sellPrice(it),0);
    const bulk=`<div class="acts">`+[['all','ขายอุปกรณ์ทั้งหมด'],...RARS.map(r=>[r,'ขายระดับ'+RARN[r]+'ทั้งหมด'])].map(([r,l])=>{const n=gear.filter(it=>r==='all'||it.rar===r).length;
        return n?`<button class="btn ${r==='all'?'':'ghost'} sm" data-sellall="${r}">${arm('g:'+r,l)} (${n} ชิ้น · ${gsum(r==='all'?null:r)} ทอง)</button>`:'';}).join('')+`</div>`;
    const rows=gear.map(it=>`<div class="srow sel${SS.has('i:'+it.uid)?' on':''}">${cb('i:'+it.uid)}<span class="ic" style="color:${RARC[it.rar]}">${bIco(it.base,18)}</span><span ${rc(it.rar)}>${itemName(it)}</span><small class="dim">${SLOTN[BASES[it.base].type]} · Lv.${it.req}</small><button class="btn sm" data-sell="${it.uid}">${this.sellArm===it.uid?'ยืนยันขาย':'ขาย'} ${Inv.sellPrice(it)} ทอง</button></div>`).join('')||'<div class="dim">ไม่มีอุปกรณ์ที่ขายได้ (ของที่สวมอยู่ขายไม่ได้)</div>';
    const mk=Object.keys(G.mats).filter(k=>MATS[k]&&Inv.matPrice(k)>0);
    const junk=mk.filter(k=>Inv.isJunkMat(k)),jsum=junk.reduce((s,k)=>s+Inv.matPrice(k)*G.mats[k],0);
    const mrows=mk.map(k=>`<div class="srow sel${SS.has('m:'+k)?' on':''}">${cb('m:'+k)}<span class="ic">${mIco(k,16)}</span><span>${MATS[k].n} <b>×${G.mats[k]}</b></span><small class="dim">${Inv.matPrice(k)} ทอง/ชิ้น</small><span><button class="btn ghost sm" data-sellmat="${k}" data-q="1">ขาย 1</button> <button class="btn ghost sm" data-sellmat="${k}" data-q="all">${arm('m:'+k,'ขายหมด')} ${Inv.matPrice(k)*G.mats[k]}</button></span></div>`).join('')||'<div class="dim">ไม่มีวัตถุดิบ</div>';
    return head+selBar+`<h3>อุปกรณ์ <small class="dim">ราคาขาย = ครึ่งหนึ่งของค่าแยกชิ้นส่วน · ต้องกดสองครั้งเพื่อยืนยัน</small></h3>${bulk}<div class="slist">${rows}</div>
      <h3>วัตถุดิบ / ของใช้</h3>${junk.length?`<div class="acts"><button class="btn sm" data-selljunk="1">${arm('junk','ขายวัตถุดิบทั่วไปทั้งหมด')} (${jsum} ทอง)</button> <small class="dim">ไม่รวมรูน ตำราสกิล ยา และวัตถุดิบหายาก</small></div>`:''}<div class="slist">${mrows}</div>`;},
  /* ---- ร้านตีเหล็ก ---- */
  smTab:'buy',
  SMITH_STOCK:[['w_club',60],['w_sword',150],['w_spear',150],['h_leather',60],['h_iron',140],['a_leather',120],['g_leather',60],['g_iron',140],['p_leather',80],['b_iron',140],['r_copper',100],['n_fang',100]],
  scr_smithy(){const T=this.smTab,tab=(k,l)=>`<button class="btn ${T===k?'':'ghost'} sm" data-smtab="${k}">${l}</button>`;
    const full=G.bag.length>=LOOT_CONFIG.inventory.equipSlots;
    const head=`<h2>${ico('craft',22)} ร้านตีเหล็กโบโร <small class="dim">ทอง ${G.gold} · แร่เหล็ก ${G.mats.ore||0} · กระเป๋า ${G.bag.length}/${LOOT_CONFIG.inventory.equipSlots}</small></h2>
      <div class="acts">${tab('buy','ซื้ออาวุธ / ชุดเกราะ')}<button class="btn ghost sm" data-ctab="enh">${ico('craft',14)} ตีบวก (โต๊ะตีเหล็ก)</button><button class="btn ghost sm" data-ctab="make">${ico('craft',14)} โต๊ะตีเหล็ก (สร้างของ ได้ +${CONFIG.craftEnh} ทันที)</button></div>`;
    if(T==='buy'||true)return head+`<div class="inv">`+this.SMITH_STOCK.map(([k,c])=>{const B=BASES[k];return`<button class="it" data-buygear="${k}" data-cost="${c}" ${G.gold>=c&&!full?'':'disabled'}><span class="ic">${bIco(k,18)}</span>${B.n}<br><small>${SLOTN[B.type]} · ${c} ทอง${B.atk?' · ATK '+B.atk:''}${B.def?' · DEF '+B.def:''}</small></button>`;}).join('')+`</div><p class="dim">ของจากร้านเป็นระดับธรรมดา เลเวลเท่าตัวละคร ${full?'· <b class="bad">กระเป๋าเต็ม</b>':''}</p>`;
    return head;},
  /* ---- ตีบวก (ทำได้ที่โต๊ะตีเหล็กเท่านั้น) ---- */
  enhList(){    const list=[...SLOTS.map(s=>G.eq[s]&&itemByUid(G.eq[s])).filter(Boolean),...G.bag.filter(it=>!Equip.isEquipped(it))];
    return`<div class="slist">`+(list.map(it=>{const c=Equip.enhanceCost(it),mx=it.enh>=Equip.maxEnh(it);
      return`<div class="srow"><span class="ic" style="color:${RARC[it.rar]}">${bIco(it.base,18)}</span><span ${rc(it.rar)}>${itemName(it)}${Equip.isEquipped(it)?' <b class="good">สวมอยู่</b>':''}</span><small class="dim">${mx?'สูงสุด':`โอกาส ${pct(c.rate)} · ${c.gold} ทอง + แร่ ${c.ore}`}</small>${mx?'<span></span>':`<button class="btn sm" data-enh="${it.uid}" ${G.gold>=c.gold&&(G.mats.ore||0)>=c.ore?'':'disabled'}>ตีบวก +${it.enh+1}</button>`}</div>`;}).join('')||'<div class="dim">ไม่มีอุปกรณ์</div>')+`</div>`;},
  scr_reitem(){const rs=this.reRes||[],full=G.bag.length>=LOOT_CONFIG.inventory.equipSlots,can=G.gold>=REITEM.cost,done=!!this.reBought,buyOk=G.gold>=REITEM.buy;
    const slots=[0,1,2,3].map(i=>{const it=rs[i];if(!it)return`<div class="it"><span class="dim">ว่าง</span></div>`;
      const st=done?(this.reBought===it.uid?'<b class="good">ซื้อแล้ว</b>':'ปิดการขาย'):full?'กระเป๋าเต็ม':!buyOk?'เหรียญไม่พอ':`ซื้อ ${REITEM.buy} เหรียญ`;
      return`<button class="it" data-reclaim="${i}" ${done||full||!buyOk?'disabled':''}><span class="ic" ${rc(it.rar)}>${bIco(it.base,18)}</span><span ${rc(it.rar)}>${itemName(it)}</span><br><small>${RARN[it.rar]} · ${st}</small></button>`;}).join('');
    return`<h2>${ico('gem',22)} Re-Item Master</h2>
      <p class="dim">สุ่มไอเทม 4 ช่อง ครั้งละ <b>${REITEM.cost}</b> เหรียญ · ซื้อได้ <b>1 ชิ้นต่อการสุ่ม</b> ชิ้นละ <b>${REITEM.buy}</b> เหรียญ · สุ่มใหม่แล้วของเดิมหาย</p>
      <div class="inv">${slots}</div>
      <p class="dim">อัตรา: ${reitemOdds().map(([r,p])=>`${RARN[r]} ${p}%`).join(' · ')}</p>
      <div class="acts"><button class="btn" data-reroll="1" ${can?'':'disabled'}>${ico('craft',14)} สุ่มไอเทม — ${REITEM.cost} เหรียญ</button></div>
      <p class="dim">เหรียญของคุณ ${G.gold}</p>`;},
  scr_alchemy(){const sel=(this.alSel||[]).map(itemByUid).filter(Boolean),first=sel[0];
    const list=G.bag.filter(it=>!Equip.isEquipped(it)),cnt={};for(const it of list)cnt[it.base]=(cnt[it.base]||0)+1;
    const pool=list.filter(it=>cnt[it.base]>=2).sort((a,b)=>a.base<b.base?-1:a.base>b.base?1:RARS.indexOf(b.rar)-RARS.indexOf(a.rar));
    const chip=it=>{const on=sel.includes(it),dis=first&&!on&&(it.base!==first.base||sel.length>=2);
      return`<button class="it${on?' on':''}" data-alsel="${it.uid}" ${dis?'disabled':''} style="border-color:${on?'#ffe27a':RARC[it.rar]+'88'}"><span class="ic">${bIco(it.base,18)}</span><span ${rc(it.rar)}>${itemName(it)}</span><br><small>${RARN[it.rar]} · ${it.affixes.map(x=>AFFIX[x.k]?AFFIX[x.k].n:x.k).join(', ')||'ไม่มีค่าเสริม'}</small></button>`;};
    const ok=sel.length===2&&Alchemy.canFuse(sel[0],sel[1]),ps=G.mats.philostone||0,L=this.alLock;
    const lockRow=ok&&ps?`<div class="tset">${mIco('philostone',14)} ศิลานักปราชญ์ ×${ps} — เลือกค่าเสริม 1 ค่าที่จะ<b>ล็อกไว้</b> (ใช้ 1 ก้อน) หรือไม่ล็อกก็ได้:<div class="acts">`+
      [...sel[0].affixes,...sel[1].affixes].map(x=>{const on=L&&L.k===x.k&&L.v===x.v;return`<button class="btn sm ${on?'':'ghost'}" data-allock="${x.k}|${x.v}">${on?'🔒 ':''}${STATN2[x.k]||x.k} ${fmtStat(x.k,x.v)}</button>`;}).join('')+`</div></div>`:'';
    return`<h2>${ico('gem',22)} นักเล่นแร่แปรธาตุ</h2>
      <p class="dim">"อาจารย์ของข้าหายไปในหอคอยทางเหนือ… ถ้าเจอศิลานักปราชญ์ เอามาให้ข้า จะล็อกค่าที่ชอบไว้ให้"</p><p class="dim">เลือกอุปกรณ์ <b>ชนิดเดียวกัน 2 ชิ้น</b> แล้วหลอมรวม → ได้ชิ้นเดิม 1 ชิ้นที่ <b>สุ่มค่าเสริมใหม่ทั้งหมด</b> · ได้ระดับ / iLv / ตีบวก ของชิ้นที่สูงกว่า · รูนที่ใส่ไว้จะหาย · ของที่สวมอยู่ใช้ไม่ได้</p>
      ${this.alRes?`<div class="cres win"><div class="big good">✨ แปรธาตุสำเร็จ!</div>${itemTip(this.alRes)}</div>`:''}
      ${pool.length?`<div class="inv">${pool.map(chip).join('')}</div>`:'<p class="dim">ยังไม่มีอุปกรณ์ชนิดเดียวกันซ้ำ 2 ชิ้นในกระเป๋า</p>'}
      ${lockRow}<div class="acts"><button class="btn" data-alfuse="1" ${ok?'':'disabled'}>${ico('craft',14)} หลอมรวม (${sel.length}/2)${L?' + ล็อก 1 ค่า':''}</button> <button class="btn ghost" data-alclear="1">ล้างที่เลือก</button></div>`;},
  scr_arena(){return`<h2>🏟️ ลานประลอง Collawarrie</h2>
    <p class="dim">สู้กันแบบนักสู้ต่อนักสู้ ชนะ 2 ใน 3 ยก · <b>ใช้เลเวล ค่าพลัง อุปกรณ์ และสกิล 4 ช่องของตัวเอง</b> (ออนไลน์: ชุดของเพื่อนส่งไปตอนเข้าห้อง) · ไม่ใช้ยา · ชนะได้รางวัลสุ่ม 1 ชิ้น (อัตราเดียวกับร้านรีไอเทม) · ไม่ได้ EXP ไม่เสียอะไร</p>
    <div class="tal" style="grid-template-columns:1fr">
      <button class="talc" data-open="room"><div class="ti">🌐</div><b>ห้องออนไลน์ (เชิญเพื่อน)</b><p>สร้างห้อง ส่งรหัสให้เพื่อน แล้วสู้กันคนละเครื่อง</p>
        <div class="sk">ต้องให้เพื่อนเปิดเกมนี้อยู่พร้อมกัน</div></button></div>
    <div style="text-align:right;margin-top:10px"><button class="btn" data-close="1">ออก</button></div>`;},
  vsResult(w,wins,net){this.cur='vsres';G.mode='menu';ov.classList.remove('hidden');SFX.loot('legendary');
    const again=net==='host'?'<button class="btn" data-net="again">⚔️ แก้มืออีกครั้ง</button>':net==='guest'?'<span class="dim">รอเจ้าของห้องเริ่มยกใหม่… </span>':'';
    // ผู้ชนะได้รางวัลสุ่ม 1 ชิ้น ด้วยอัตราเดียวกับร้านรีไอเทม (ฝั่งใครฝั่งมัน)
    const me=net==='guest'?'P2':'P1';let rw='';
    if(net&&w===me){const it=reitemRoll(),full=G.bag.length>=LOOT_CONFIG.inventory.equipSlots;
      if(full){const g=Inv.sellPrice(it);G.gold+=g;rw=`<div class="big">🎁 รางวัลผู้ชนะ: <span ${rc(it.rar)}>${bIco(it.base,18)} ${itemName(it)}</span><br><small class="dim">กระเป๋าเต็ม — ขายให้อัตโนมัติ ได้ ${g} ทอง</small></div>`;}
      else{Inv.addItem(it);rw=`<div class="big">🎁 รางวัลผู้ชนะ: <span ${rc(it.rar)}>${bIco(it.base,18)} ${itemName(it)}</span> <small class="dim">(${RARN[it.rar]} · เข้ากระเป๋าแล้ว)</small></div>`;}
      if(it.rar!=='normal')SFX.loot(it.rar);try{Save.save();}catch(e){}UI.hud&&UI.hud();}
    else if(net)rw=`<div class="dim">แพ้ครั้งนี้ ชนะเพื่อรับรางวัลสุ่ม 1 ชิ้น</div>`;
    pn.innerHTML=`<h2>🏆 ${w}${net?(w==='P1'?' (เจ้าของห้อง)':' (เพื่อน)'):''} ชนะการประลอง!</h2><div class="big" style="font-size:2em">P1 ${wins[0]} — ${wins[1]} P2</div>${rw}
      <div style="text-align:right;margin-top:14px">${again} <button class="btn" data-close="1">ออกจากลาน</button></div>`;},
  scr_room(){const L=Net.lobby,back='<div style="text-align:right;margin-top:10px"><button class="btn" data-net="leave">ยกเลิก / กลับ</button></div>';
    if(L.phase==='hosting')return`<h2>🌐 ห้องของคุณ</h2><div class="big" style="font-size:3em;letter-spacing:.3em;text-align:center;margin:10px 0">${Net.code}</div><p class="dim" style="text-align:center">ส่งรหัสนี้ให้เพื่อน แล้วให้เพื่อนเปิดเกมนี้ → ลานประลอง → ห้องออนไลน์ → เข้าห้อง<br>${Net.label()}</p>
      <div class="big" style="text-align:center">${L.peer?'✅ <b class="good">'+esc(L.peerName||'เพื่อน')+' เข้าห้องแล้ว</b>':'⏳ รอเพื่อนเข้าห้อง…'}</div>
      <div style="text-align:center;margin-top:12px"><button class="btn" data-net="start" ${L.peer?'':'disabled'}>⚔️ เริ่มสู้</button></div>${back}`;
    if(L.phase==='connecting')return`<h2>🌐 กำลังเชื่อมต่อระบบออนไลน์…</h2><p class="dim">อาจใช้เวลาถึง 10 วินาที</p>${back}`;
    if(L.phase==='joining')return`<h2>🌐 กำลังเข้าห้อง ${Net.code}…</h2><p class="dim">กำลังหาเจ้าของห้อง · ${Net.label()}</p>${back}`;
    if(L.phase==='joined')return`<h2>🌐 เข้าห้อง ${Net.code} แล้ว</h2><div class="big" style="text-align:center">✅ รอเจ้าของห้องกดเริ่มสู้…</div><p class="dim" style="text-align:center">${Net.label()}<br>ปุ่มของคุณ: A/D หรือ ←/→ เดิน · W/↑ โดด · S/↓ ย่อ · J หรือ , ตี · K หรือ . เตะ · Space หรือ / พุ่งหลบ</p>${back}`;
    return`<h2>🌐 ห้องออนไลน์</h2><p class="dim">สู้กับเพื่อนคนละเครื่อง · เจ้าของห้องเป็นฝั่ง P1 ซ้าย เพื่อนเป็น P2 ขวา · ใช้เลเวล อุปกรณ์ และสกิลของแต่ละคน · ไม่เสียอะไร<br>เพื่อนต้องล็อกอิน Claude และเปิดเกมจากลิงก์ที่คุณแชร์ให้ (เชิญผ่านปุ่มแชร์ของ artifact) — คนที่ไม่ได้ล็อกอินเข้าห้องออนไลน์ไม่ได้</p>${L.err?'<p class="bad">⚠ '+esc(L.err)+'</p>':''}
      <div class="tal" style="grid-template-columns:1fr 1fr"><button class="talc" data-net="host"><div class="ti">➕</div><b>สร้างห้อง</b><p>ได้รหัส 4 ตัวไปส่งให้เพื่อน</p></button>
      <div class="talc"><div class="ti">🔑</div><b>เข้าห้องของเพื่อน</b><p><input id="roomCode" maxlength="4" placeholder="รหัส 4 ตัว" style="width:7em;text-transform:uppercase;font:inherit;font-size:1.3em;letter-spacing:.2em;text-align:center"></p><button class="btn" data-net="join">เข้าห้อง</button></div></div>
      <div style="text-align:right;margin-top:10px"><button class="btn" data-open="arena">กลับ</button></div>`;},
  scr_quests(){return`<h2>${ico('scroll',22)} สมุดเควสต์</h2>`+Object.entries(QUESTS).map(([id,q])=>{const s=G.q[id];if(!s.active&&!s.done)return`<div class="qb dim">❔ ยังไม่ได้รับเควสต์</div>`;
    return`<div class="qb"><b>${s.done?'✅':'◆'} [${q.type}] ${q.n}</b>`+q.steps.map((t,i)=>`<div class="${i<s.step?'done':i===s.step?'':'dim'}">${i<s.step?'☑':'☐'} ${t}${id==='hunt'?` (${s.count}/3)`:''}</div>`).join('')+
    `<small class="dim">รางวัล: ${q.reward.xp||0} XP ${q.reward.gold?q.reward.gold+' ทอง ':''}${Object.keys(q.reward.mats||{}).map(k=>mIco(k,14)+MATS[k].n).join(' ')}</small></div>`;}).join('');},

  scr_map(){const cur=Z.regionAt(Math.floor(P.x/16)),V=G.visited||{};
    const node=(id,x,y)=>{const z=ZONE_INFO[id],v=V[id],here=cur===id,el=enemyLevel(z.lv,G.level);
      return`<div class="mnode ${here?'here':''} ${v?'':'fog'} ${z.danger?'danger':''}" style="left:${x}%;top:${y}%"><b>${v?z.n:'???'}</b><small>โซน Lv.${z.lv} · ศัตรู ~Lv.${el}</small>${here?'<span>📍 คุณอยู่ที่นี่</span>':''}</div>`;};
    return`<h2>🗺️ แผนที่โลก</h2><div class="wmap"><svg viewBox="0 0 100 60" preserveAspectRatio="none"><path d="M12 10 L12 30 L38 30 L62 30 L70 14 L84 14 L84 46" stroke="#6a5a4a" stroke-width=".8" fill="none" stroke-dasharray="2 1"/></svg>
      ${node('town',1,2)}${node('outer',1,42)}${node('inner',26,42)}${node('lava1',51,42)}${node('lava2',62,2)}${node('lava3',75,70)}${node('ice1',1,70)}${node('ice2',26,70)}${node('sanctum',51,70)}</div>
      <p class="dim">เลเวลศัตรู = เลเวลโซน + clamp(⌊(เลเวลผู้เล่น − เลเวลโซน) × 0.5⌋, −5, 10) — ศัตรูไม่ได้ปรับตามเลเวลผู้เล่นแบบเท่ากันทุกตัว บอส +2 · มินิบอส +1</p>`;},

  scr_ency(){return'<h2>📖 สารานุกรมศัตรู</h2><div class="ency">'+Object.entries(FOES).map(([k,d])=>{const e=G.ency[k];
    if(!e)return`<div class="en dim"><b>???</b><small>ยังไม่เคยพบ</small></div>`;
    const res=e.kills>=1?Object.entries(d.res||{}).map(([el,v])=>`<span class="${v<0?'good':'bad'}">${ELN[el]} ${v<0?'อ่อน':'ต้าน'} ${pct(Math.abs(v))}</span>`).join(' · ')||'—':'ปราบ 1 ครั้งเพื่อเปิดเผย';
    const L=LOOT_TABLES[d.loot]||{guaranteed:[]};const drops=e.kills>=3?(L.guaranteed||[]).map(f=>f.gold?'🪙 ทอง':MATS[f.mat]?mIco(f.mat,14)+MATS[f.mat].n:'?').join(', ')+' + สุ่มจากตารางของตัวเอง':'ปราบ 3 ครั้งเพื่อเปิดเผย';
    return`<div class="en"><b>${d.n}</b> ${d.boss?'👑 บอส':d.miniboss?'⚔ มินิบอส':''}<small>พบ ${e.seen} · ปราบ ${e.kills} · เลเวลสูงสุดที่เจอ ${e.maxLv}</small>
      <div>HP ฐาน ${d.base.hp} · ATK ${d.base.atk} · DEF ${d.base.def} · M.DEF ${d.base.mdef}</div><div>ธาตุ: ${res}</div>
      ${e.kills>=1?`<div>ค่าพลัง: ${Object.keys(BASE_ATTR).map(k=>k.toUpperCase()+' '+((d.attr||{})[k]??BASE_ATTR[k])).join(' · ')}</div><div>สกิล: ${(d.skills||[]).filter(id=>skillUsable(id,'enemy')).map(id=>SKILLS[id].n).join(', ')||'—'}</div>`:''}
      ${d.statusRes?`<div>ต้านสถานะ: ${Object.entries(d.statusRes).map(([s,v])=>STN[s]+' '+pct(v)).join(', ')}</div>`:''}${d.phases?`<div>เฟส: ${d.phases.length+1} · จุดอ่อน: หลังท่า "${d.weakPoint.after}"</div>`:''}<div>ดรอปตายตัว: ${drops}</div></div>`;}).join('')+'</div>';},

  lootPopup(out,title,xp=0,ups=0,newSk=[]){
    this.cur='loot';G.mode='menu';ov.classList.remove('hidden');const best=(out.items||[]).reduce((a,it)=>Math.max(a,RARS.indexOf(it.rar)),0);SFX.loot(RARS[best]);
    pn.innerHTML=`<h2>🏆 ${title}</h2>${xp?`<div class="big">+${xp} XP${ups?` · <b class="good">เลเวลอัปเป็น Lv.${G.level}! (+${ups*CONFIG.levelPoints} แต้ม)</b>`:''}</div>`:''}
      ${out.dropped!==undefined?`<div class="big">${out.dropped?`💰 ของตก ${out.dropped} ชิ้นรอบจุดที่ศัตรูล้ม — เดินไปกด E เก็บภายใน ${LOOT_CONFIG.ground.lifetime/60} วินาที (ของคุณคนเดียว)`:'ไม่มีของตก'}</div>`:`<div>🪙 +${out.gold} ทอง ${Object.entries(out.mats).map(([k,q])=>`· ${mIco(k,14)} ${MATS[k].n} ×${q}`).join(' ')}</div>
      <div class="loot">${out.items.map(it=>`<div class="lc" style="border-color:${RARC[it.rar]}">${itemTip(it)}</div>`).join('')||'<div class="dim">ไม่มีอุปกรณ์ดรอป</div>'}</div>`}
      ${newSk.length?`<div class="good big">✨ ปลดล็อกสกิลใหม่: ${newSk.map(k=>SKILLS[k].n+(SKILLS[k].tier==='ultimate'?' (ใส่ช่องสุดยอดอัตโนมัติ)':'')).join(', ')}</div>`:''}
      <div style="text-align:right;margin-top:10px"><button class="btn" data-close="1">ตกลง (Enter)</button></div>`;
    if(ups)this.levelUp(ups);
  },

  /* ---- debug tools ---- */
  scr_debug(){
    const log=G.dmgLog.map(l=>`<tr><td>${esc(l.from)}→${esc(l.to)}</td><td>${esc(l.move)}</td><td>${l.type}/${ELN[l.el]||l.el}</td><td>${l.base}</td><td>${Math.round(l.defUsed)}</td><td>${pct(l.res)}</td><td>${l.crit?'✔':''}</td><td>${l.mods}</td><td>${pct(l.dr)}</td><td><b>${l.dmg}</b></td></tr>`).join('');
    return`<h2>🛠 เครื่องมือดีบัก</h2><div class="acts">
      <button class="btn sm" data-dbg="xp">+500 XP</button><button class="btn sm" data-dbg="gold">+1000 ทอง</button><button class="btn sm" data-dbg="mats">+วัตถุดิบทุกชนิด ×5</button>
      <button class="btn sm" data-dbg="scrolls">ปลดล็อกทุกสูตร</button><button class="btn sm" data-dbg="items">สุ่มไอเท็มทุกระดับ</button><button class="btn sm" data-dbg="god">โหมดอมตะ: ${G.god?'เปิด':'ปิด'}</button>
      <button class="btn sm" data-dbg="heal">ฟื้นเต็ม</button><button class="btn sm" data-dbg="lava">วาร์ปเหมืองลาวา</button><button class="btn sm" data-dbg="w_golem">🪨 วาร์ปบอสโกเลม</button><button class="btn sm" data-dbg="w_lavaking">🌋 วาร์ปบอสราชันย์ลาวา</button><button class="btn sm" data-dbg="w_seraph">👁️ วาร์ปบอสเซราฟ</button><button class="btn sm" data-dbg="books">📚 ให้ตำราสกิลทุกเล่ม</button><button class="btn sm" data-dbg="seal">🗝️ +ตราทำลายผนึก & เรียนสกิลเฉพาะตัวทั้งหมด</button></div>
      <div class="filt">หน้าต่างคอมโบ <input type="range" min="4" max="30" value="${CONFIG.comboWindow}" data-cw> <b id="cwv">${CONFIG.comboWindow}</b> เฟรม</div>
      <h3>บันทึกดาเมจล่าสุด (สูตร: พลัง×สัมประสิทธิ์×100/(100+DEF หลังเจาะ) × (1−ต้านธาตุ) × คริ × ตัวคูณ × (1−ลดดาเมจ))</h3>
      <table class="fd"><tr><th>ใคร</th><th>ท่า</th><th>ชนิด</th><th>ฐาน</th><th>DEF ใช้</th><th>ต้าน</th><th>คริ</th><th>ตัวคูณ</th><th>DR</th><th>ผล</th></tr>${log||'<tr><td colspan=10 class="dim">ยังไม่มี</td></tr>'}</table>
      <h3>Loot <button class="btn sm" data-dbg="diff" ${CONFIG.diffLock?'disabled':''}>ความยาก: ${Diff.cur().ic} ${Diff.cur().n}${CONFIG.diffLock?' 🔒':''}</button> <button class="btn sm" data-dbg="pity">Pity บอส: ${LOOT_CONFIG.pity.enabled?'เปิด':'ปิด'}</button> <button class="btn sm" data-dbg="p2">จำลองของตกของ P2 ข้างตัว</button> <button class="btn sm" data-dbg="fill">เติมกระเป๋าให้เต็ม</button> <button class="btn sm" data-dbg="dropnow">สุ่มดรอปหนูตรงนี้</button></h3>
      <div class="dim">${LootManager.validateAll().length} รายการอ้างอิงไม่ถูกต้อง (รวมตารางตัวอย่างที่ยังไม่มีไอเท็ม)</div>
      <table class="fd"><tr><th>ผู้เล่น</th><th>ตาราง/เหตุการณ์</th><th>คลาส</th><th>โอกาส (ฐาน→Luck)</th><th>สุ่มได้</th><th>ผล</th></tr>${(G.lootLog||[]).slice(0,10).map(l=>`<tr><td>${l.pid||''}</td><td>${l.tableId||l.pity||('pickup #'+(l.pickup??''))}</td><td>${l.cls||''}</td>
        <td>${l.base!==undefined?pct(l.base)+' → '+pct(l.chance)+' (+'+pct(l.luckBonus)+')':''}</td><td>${l.roll!==undefined?l.roll.toFixed(3):''}</td>
        <td>${l.warn?'<span class="bad">'+esc(l.warn)+'</span>':l.fail?'<span class="bad">ล้มเหลว: '+l.fail+'</span>':l.ok?'<span class="good">เก็บ '+esc(l.item)+'</span>':l.picks?(l.picks.map(p=>p.none?'—':`<span style="color:${RARC[p.rar]}">${p.entry}${p.q>1?'×'+p.q:''}</span>`).join(', ')||'ไม่ดรอป'):l.extra?'pity: '+l.extra.join(','):''}</td></tr>`).join('')}</table>
      <h3>เทสต์อัตโนมัติ</h3><button class="btn" data-dbg="tests">▶ รันเทสต์ทั้งหมด</button><div id="tres">${this.tres||''}</div>`;
  }
};
/* ---- event wiring ---- */
pn.addEventListener('input',e=>{if(e.target.id==='pname'){G.look=Object.assign({},DEFLOOK,G.look,{name:e.target.value.slice(0,12)});}
  const m=/^pc-(skin|hair|eye)$/.exec(e.target.id||'');if(m&&/^#[0-9a-f]{6}$/i.test(e.target.value)){G.look=Object.assign({},DEFLOOK,G.look,{[m[1]]:e.target.value});}});   // ตัวอย่างวาดใหม่ทุกเฟรม จึงเห็นสีทันที
pn.addEventListener('click',e=>{
  if(!e.target.closest('button')){const row=e.target.closest('.srow.sel');const c=row&&row.querySelector('[data-ssel]');if(c){c.click();return;}}   // คลิกทั้งแถวเพื่อเลือก
  const t=e.target.closest('button');if(!t)return;const d=t.dataset;
  if(d.close){UI.close();return;}
  if(d.save){saveNow();return;}
  if(d.title){if(Z&&Z.bossRoom&&!Z.cleared){toast('🔒 ออกจากห้องบอสไม่ได้ — ชนะหรือตายก่อน');return;}UI.close();if(!(Z&&Z.bossRoom&&!Z.cleared))Save.save();G.mode='title';StatSync.reset();$('#title').classList.remove('hidden');renderTitle();return;}
  if(d.load){UI.close();loadNow();return;}
  if(d.open){UI.open(d.open);return;}
  if(d.net){const a=d.net;if(a==='host')Net.host();else if(a==='join')Net.join(($('#roomCode')||{}).value);else if(a==='start'||a==='again')Net.beginHost();else if(a==='leave'){Net.leave();UI.open('arena');}return;}
  if(d.diff&&UI.cur==='talent'){UI.diffSel=d.diff;UI.rerender();return;}
  if(d.sex||d.hstyle){G.look=Object.assign({},DEFLOOK,G.look);if(d.sex){G.look.sex=d.sex;if(UI.creating&&G.look.hstyle==='short'&&d.sex==='f')G.look.hstyle='ponytail';else if(UI.creating&&G.look.hstyle==='ponytail'&&d.sex==='m')G.look.hstyle='short';}if(d.hstyle)G.look.hstyle=d.hstyle;UI.rerender();return;}
  if(d.lk&&d.c){G.look=Object.assign({},DEFLOOK,G.look,{[d.lk]:d.c});UI.rerender();return;}
  if(d.lookrand){G.look=Object.assign({},DEFLOOK,G.look,{skin:pick(SKIN_TONES),hair:pick(HAIR_COLORS),eye:pick(EYE_COLORS),hstyle:pick(Object.keys(HAIR_STYLES))});UI.rerender();return;}
  if(d.lookreset){G.look=Object.assign({},DEFLOOK,{name:(G.look||{}).name||''});UI.rerender();return;}
  if(d.tal){newGame(d.tal);return;}
  if(d.al){Prog.allocate(d.al);UI.rerender();UI.hud();return;}
  if(d.use){const r=Inv.use(d.use);if(r.ok){toast(r.msg);SFX.pick();}UI.rerender();UI.hud();return;}
  if(d.slot&&!d.sk&&!d.skeq){const it=G.eq[d.slot]&&itemByUid(G.eq[d.slot]);if(it)UI.sel=it.uid;UI.rerender();return;}
  if(d.sel){UI.sel=+d.sel;UI.rerender();return;}
  if(d.eq){const it=itemByUid(+d.eq);if(!Equip.equip(it))toast('เลเวลไม่ถึงที่ต้องการ');else SFX.pick();UI.rerender();return;}
  if(d.uneq){for(const s of SLOTS)if(G.eq[s]===+d.uneq)G.eq[s]=null;UI.rerender();return;}
  if(d.enh){const r=Equip.enhance(itemByUid(+d.enh));toast(r.msg);r.ok?SFX.craft():SFX.fail();UI.rerender();return;}
  if(d.salv){Inv.salvage(itemByUid(+d.salv));UI.sel=null;SFX.pick();UI.rerender();return;}
  if(d.sell&&UI.cur==='shop'){const it=itemByUid(+d.sell);if(!it){UI.sellArm=null;UI.rerender();return;}
    if(UI.sellArm!==it.uid){UI.sellArm=it.uid;UI.rerender();return;}   // กดสองครั้งเพื่อยืนยัน กันขายผิด
    const price=Inv.sellPrice(it);if(Inv.sell(it)){UI.sel=null;UI.sellArm=null;SFX.pick();toast('ขาย '+itemName(it)+' ได้ '+price+' ทอง');}else toast('สวมอยู่ ถอดก่อนจึงขายได้');UI.rerender();return;}
  if(d.sock!==undefined&&d.rune){Equip.socket(UI.sel&&itemByUid(UI.sel),+d.sock,d.rune);SFX.pick();UI.rerender();return;}
  if(d.unsock!==undefined){Equip.unsocket(itemByUid(UI.sel),+d.unsock);UI.rerender();return;}
  if(d.ssock!==undefined){UI.sk.sel=+d.ssock;UI.sk.modal=null;SFX.talk();UI.rerender();return;}
  if(d.skeq){const r=Skills.equip(+d.slot,d.skeq);r.ok?SFX.pick():toast(r.err);UI.rerender();return;}
  if(d.skun!==undefined){const r=Skills.equip(+d.skun,null);if(!r.ok)toast(r.err);UI.rerender();return;}
  if(d.skbind){UI.sk.modal='bind';UI.sk.pick=d.skbind;UI.rerender();return;}
  if(d.skbindyes){const r=Skills.bind(UI.sk.pick);UI.sk.modal=null;if(r.ok){SFX.level();toast('🔒 ผนึก '+SKILLS[UI.sk.pick].n+' ถาวรแล้ว');Save.save();}else toast(r.err);UI.rerender();return;}
  if(d.skrep){UI.sk.modal='replace';UI.sk.pick=d.skrep;UI.rerender();return;}
  if(d.skrepyes){const r=Skills.replaceUnique(UI.sk.pick);UI.sk.modal=null;if(r.ok){SFX.level();toast('🗝️ ปลดผนึกแล้ว — ผนึก '+SKILLS[UI.sk.pick].n+' ถาวรแทน');Save.save();}else toast(r.err);UI.rerender();return;}
  if(d.skno){UI.sk.modal=null;UI.rerender();return;}
  if(d.skup){const r=Skills.upgrade(d.skup);if(r.ok){SFX.craft();toast('⬆ อัปเกรด '+SKILLS[d.skup].n+' เป็น Lv.'+r.lv);Save.save();}else toast(r.err);UI.rerender();UI.hud();return;}
  if(d.cadd){UI.csAdd(d.cadd);SFX.talk();UI.rerender();return;}
  if(d.cq!==undefined){const sl=UI.cs.slots[+d.cq];if(sl){if(+d.d>0){if(UI.csInSlots(sl.id)<(G.mats[sl.id]||0))sl.q++;else toast('มี '+MATS[sl.id].n+' ไม่พอ');}else{sl.q--;if(sl.q<=0)UI.cs.slots[+d.cq]=null;}}UI.cs.phase='idle';UI.rerender();return;}
  if(d.cx!==undefined){UI.cs.slots[+d.cx]=null;UI.cs.phase='idle';UI.rerender();return;}
  if(d.boost){UI.cs.boost=!UI.cs.boost&&Inv.has('divine');UI.cs.phase='idle';UI.rerender();return;}
  if(d.cclear){UI.cs.slots.fill(null);UI.cs.boost=false;UI.cs.phase='idle';UI.rerender();return;}
  if(d.ccancel){UI.cs.slots.fill(null);UI.cs.boost=false;UI.cs.phase='idle';UI.close();return;}
  if(d.cgo){const c=Craft.check(UI.cs.slots,UI.cs.boost);if(c.ok&&Craft.isRareCraft(c.recipe,UI.cs.boost)){UI.cs.confirm=true;UI.rerender();}else UI.craftStart();return;}
  if(d.cyes){UI.craftStart();return;}
  if(d.cno){UI.cs.confirm=false;UI.rerender();return;}
  if(d.shoptab){UI.shopTab=d.shoptab;UI.bulkArm=null;UI.sellArm=null;UI.sellSel.clear();UI.rerender();return;}
  if(d.ssel){const S=UI.sellSel;S.has(d.ssel)?S.delete(d.ssel):S.add(d.ssel);UI.bulkArm=null;UI.rerender();return;}
  if(d.sselall){const S=UI.sellSel;if(d.sselall==='none')S.clear();else if(d.sselall==='gear')G.bag.filter(it=>!Equip.isEquipped(it)).forEach(it=>S.add('i:'+it.uid));else Object.keys(G.mats).filter(k=>Inv.matPrice(k)>0).forEach(k=>S.add('m:'+k));UI.bulkArm=null;UI.rerender();return;}
  if(d.sellsel&&UI.cur==='shop'){if(UI.bulkArm!=='sel'){UI.bulkArm='sel';UI.rerender();return;}UI.bulkArm=null;let g=0,n=0;
    for(const k of [...UI.sellSel]){const v=k.slice(2);if(k[0]==='i'){const it=itemByUid(+v);if(it&&!Equip.isEquipped(it)){g+=Inv.sellPrice(it);Inv.sell(it);n++;}}else if(G.mats[v]>0){n+=G.mats[v];g+=Inv.sellMat(v,G.mats[v]);}}
    UI.sellSel.clear();if(n){SFX.loot('rare');toast(`ขาย ${n} ชิ้น ได้ ${g} ทอง`);}UI.rerender();UI.hud();return;}
  if(d.ctab){UI.craftTab=d.ctab;if(UI.cur!=='craft')UI.open('craft');else UI.rerender();return;}
  if(d.smtab){UI.smTab=d.smtab;UI.rerender();return;}
  if(d.alsel){UI.alLock=null;const u=+d.alsel,S=UI.alSel=UI.alSel||[];const i=S.indexOf(u);if(i>=0)S.splice(i,1);else if(S.length<2)S.push(u);UI.alRes=null;UI.rerender();return;}
  if(d.alclear){UI.alSel=[];UI.alRes=null;UI.alLock=null;UI.rerender();return;}
  if(d.allock){const [k,v]=d.allock.split('|');const L=UI.alLock;UI.alLock=L&&L.k===k&&String(L.v)===v?null:{k,v:+v};UI.rerender();return;}
  if(d.alfuse){const [a,b]=(UI.alSel||[]).map(itemByUid);const r=Alchemy.fuse(a,b,UI.alLock);UI.alLock=null;if(!r.ok){SFX.fail();toast(r.err);return;}UI.alSel=[];UI.alRes=r.item;SFX.loot(r.item.rar);StatSync.invalidate('alchemy');Save.save();UI.rerender();return;}
  if(d.reroll){if(G.gold<REITEM.cost){SFX.fail();toast('เหรียญไม่พอ');return;}G.gold-=REITEM.cost;UI.reRes=[0,1,2,3].map(()=>reitemRoll());UI.reBought=null;UI.rerender();UI.hud();Save.save();return;}
  if(d.reclaim!==undefined){const i=+d.reclaim,it=(UI.reRes||[])[i];if(!it||UI.reBought)return;   // ซื้อได้ชิ้นเดียวต่อการสุ่ม
    if(G.bag.length>=LOOT_CONFIG.inventory.equipSlots){SFX.fail();toast('🎒 กระเป๋าเต็ม');return;}if(G.gold<REITEM.buy){SFX.fail();toast('เหรียญไม่พอ');return;}
    G.gold-=REITEM.buy;Inv.addItem(it);UI.reBought=it.uid;SFX.pick();toast('ซื้อ '+itemName(it)+' แล้ว ('+REITEM.buy+' เหรียญ)');UI.rerender();UI.hud();Save.save();return;}
  if(d.sellall&&UI.cur==='shop'){const k='g:'+d.sellall;if(UI.bulkArm!==k){UI.bulkArm=k;UI.rerender();return;}UI.bulkArm=null;const r=Inv.sellAllGear(d.sellall==='all'?null:d.sellall);if(r.n){SFX.loot('rare');toast(`ขายอุปกรณ์ ${r.n} ชิ้น ได้ ${r.g} ทอง`);}UI.rerender();UI.hud();return;}
  if(d.selljunk&&UI.cur==='shop'){if(UI.bulkArm!=='junk'){UI.bulkArm='junk';UI.rerender();return;}UI.bulkArm=null;const r=Inv.sellAllJunk();if(r.n){SFX.pick();toast(`ขายวัตถุดิบ ${r.n} ชิ้น ได้ ${r.g} ทอง`);}UI.rerender();UI.hud();return;}
  if(d.sellmat&&UI.cur==='shop'){const k=d.sellmat;if(d.q==='all'){if(UI.bulkArm!=='m:'+k){UI.bulkArm='m:'+k;UI.rerender();return;}UI.bulkArm=null;}
    const g=Inv.sellMat(k,d.q==='all'?(G.mats[k]||0):1);if(g){SFX.pick();toast(`ขาย ${MATS[k].n} ได้ ${g} ทอง`);}UI.rerender();UI.hud();return;}
  if(d.buygear){const c=+d.cost;if(G.gold<c)return;if(G.bag.length>=LOOT_CONFIG.inventory.equipSlots){toast('กระเป๋าเต็ม');return;}G.gold-=c;const it=Inv.addItem(newItem(d.buygear,'normal',G.level));SFX.pick();toast('ซื้อ '+itemName(it)+' แล้ว');UI.rerender();UI.hud();return;}
  if(d.buy){const c=+d.cost;if(G.gold<c)return;if((G.mats[d.buy]||0)+1>LOOT_CONFIG.inventory.stackMax){toast('ช่องวัตถุดิบเต็ม');return;}G.gold-=c;Inv.add(d.buy,1);SFX.pick();UI.rerender();UI.hud();return;}
  if(d.dbg)debugAction(d.dbg);
});
pn.addEventListener('change',e=>{const f=e.target.dataset.f;if(f){UI.filt[f]=e.target.value;UI.rerender();}});
pn.addEventListener('input',e=>{if(e.target.dataset.cw!==undefined){CONFIG.comboWindow=+e.target.value;$('#cwv').textContent=CONFIG.comboWindow;}});
document.querySelectorAll('#menu [data-open]').forEach(b=>b.onclick=()=>{if(G.mode==='explore')UI.open(b.dataset.open);});
const saveNow=()=>{if(Z&&Z.bossRoom&&!Z.cleared){toast('🔒 บันทึกไม่ได้ระหว่างอยู่ในห้องบอส');return;}toast(Save.save()?'💾 บันทึกเกมแล้ว (เก็บในเบราว์เซอร์นี้)':'บันทึกไม่ได้ — เบราว์เซอร์ไม่อนุญาตให้เก็บข้อมูล');};
const loadNow=()=>{if(G.mode!=='explore')return;if(Z&&Z.bossRoom&&!Z.cleared){toast('🔒 โหลดไม่ได้ระหว่างอยู่ในห้องบอส — ชนะหรือตายเท่านั้น');return;}if(Save.load()){toast('📂 โหลดเกมแล้ว');UI.hud();}else toast('ไม่พบเซฟ');};
function debugAction(a){
  if(a==='xp'){const u=Prog.gainXP(500);if(u)UI.levelUp(u);Skills.check();}
  if(a==='gold')G.gold+=1000;
  if(a==='mats')for(const k in MATS)if(!MATS[k].scroll)Inv.add(k,5);
  if(a==='scrolls'){RECIPES.forEach(r=>G.known.add(r.id));Inv.add('divine',3);}
  if(a==='items')for(const r of RARS)Inv.addItem(newItem(pick(Object.keys(BASES)),r,Math.max(G.level,r==='god'?9:1)));
  if(a==='god')G.god=!G.god;
  if(a==='pity')LOOT_CONFIG.pity.enabled=!LOOT_CONFIG.pity.enabled;
  if(a==='diff'&&!CONFIG.diffLock){const ks=Object.keys(DIFFICULTY);G.diff=ks[(ks.indexOf(G.diff||'normal')+1)%ks.length];UI.hud();}
  if(a==='p2'){G.simPlayers={P2:{luk:10}};const r=LootManager.generate({tableId:'lavarat',cls:'elite',level:8,pid:'P2',luk:10});LootManager.spawn(Z,P.x+20,P.y,r);}
  if(a==='fill'){while(G.bag.length<LOOT_CONFIG.inventory.equipSlots)Inv.addItem(newItem('a_cloth','normal',1));}
  if(a==='dropnow'){const r=LootManager.rollForPlayers({tableId:'rat',cls:'elite',level:G.level,kind:'rat'});for(const x of r)LootManager.spawn(Z,P.x+16,P.y,x);}
  if(a==='books')for(const k in MATS)if(MATS[k].skillBook)Inv.add(k,1);
  if(a==='seal'){Inv.add(SEAL_BREAKER.item,1);for(const k in SKILLS)if(SKILLS[k].tier==='unique')G.skills.learned.add(k);}
  if(a==='heal'){const S=StatSync.get();G.hp=S.maxHP;G.mp=S.maxMP;}
  if(a==='lava'){UI.close();enterDungeon(1);return;}
  if(a.startsWith('w_')){const k=a.slice(2);UI.close();
    if(k==='golem')enterBossRoom('golem');
    else if(k==='lavaking')enterDungeon(3);else enterDungeon(3,'ice');
    const b=Z.foes.find(f=>f.kind===k);if(b){b.alive=true;b.cool=180;P.x=b.x-56;P.y=b.y;if(blocked(P.x,P.y))P.x=b.x-40;}
    CAM.snap=1;G.hp=StatSync.get().maxHP;G.mp=StatSync.get().maxMP;UI.hud();toast(`🛠 วาร์ปถึงบอส ${FOES[k].n} — เดินเข้าไปเพื่อเริ่มสู้`,2500);return;}
  if(a==='tests'){const r=runTests();UI.tres=`<div class="${r.fail?'bad':'good'} big">ผ่าน ${r.pass}/${r.pass+r.fail}</div>`+r.out.map(o=>`<div class="${o.ok?'good':'bad'}">${o.ok?'✔':'✘'} ${esc(o.name)} <small class="dim">${esc(o.info||'')}</small></div>`).join('');}
  UI.rerender();UI.hud();
}
let pvCtx=null;
function drawPreview(){
  if(!pvCtx)return;const c=pvCtx;c.clearRect(0,0,220,270);c.imageSmoothingEnabled=false;
  c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(110,252,52,10,0,0,7);c.fill();
  const K=Equip.look(),ph=G.t%240;const Pz=poseIdle(G.t);
  if(ph>170&&ph<200){const u=(ph-170)/30;Pz.lean=.22;Pz.fh=[9+u*2,2-u*4];Pz.wa=-2+u*3;Pz.ff=[7,0];}
  drawRig(c,110,252,6,1,Pz,K);
}
/* ---- battle HUD (canvas) ---- */
function para(x,y,w,h,sk){D.beginPath();D.moveTo(x+sk,y);D.lineTo(x+w+sk,y);D.lineTo(x+w,y+h);D.lineTo(x,y+h);D.closePath();}
function portrait(f,x,y,w,h,flip){
  D.save();para(x,y,w,h,14);D.clip();
  const gr=D.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,f.isP?'#ff3ad0':f.elite?'#ffd23a':'#ff7a3a');gr.addColorStop(1,f.isP?'#3ad8ff':'#ffd23a');D.fillStyle=gr;D.fillRect(x,y,w+20,h);
  D.fillStyle='rgba(10,8,20,.55)';D.fillRect(x,y,w+20,h);
  if(f.rig){const Pz=poseIdle(0),J=rigPoints(Pz),sc=7,dir=flip?-1:1;drawRig(D,x+w/2+7-J.hd[0]*sc*dir,y+h/2+6-J.hd[1]*sc,sc,dir,Pz,f.look);}
  else{const d=f.def;{const pm=SPR[d.map]||GOLEM,rat=d.h<60;spr(D,pm,PAL[d.pal],x+w/2+8,y+h+(rat?4:d.map==='ANGEL'?70:83),rat?7:d.map==='ANGEL'?6:9,flip&&rat);}}
  D.restore();D.strokeStyle='#fff';D.lineWidth=2;para(x,y,w,h,14);D.stroke();
}
function statusIcons(f,x,y,right){
  const L=Status.list(f);let i=0;
  for(const s of L){const bx=right?x-i*40-36:x+i*40;D.fillStyle='rgba(0,0,0,.7)';rrect(bx,y,36,24,5);D.fill();D.strokeStyle=STC[s.k];D.lineWidth=1.5;D.stroke();
    D.font='14px sans-serif';D.textAlign='left';D.textBaseline='middle';D.fillText(STI[s.k],bx+3,y+12);
    outlineText((s.stacks>1?'×'+s.stacks:'')+'',bx+26,y+8,11,'#fff');outlineText((s.t/60).toFixed(1),bx+26,y+18,10,STC[s.k]);
    D.fillStyle=STC[s.k];D.fillRect(bx,y+22,36*(s.t/CONFIG.statusDur),2);i++;}
  if(f.stunImm>0&&!f.st8.stun){const bx=right?x-i*40-36:x+i*40;outlineText('🛡💫 '+(f.stunImm/60).toFixed(1),bx+18,y+12,11,'#ccc');}
}
function hpBarB(f,right){
  D.save();if(right){D.translate(960,0);D.scale(-1,1);}
  const x=104,y=18,w=322,h=24,frac=clamp(f.hp/f.maxHp,0,1),dfrac=clamp(f.dhp/f.maxHp,0,1);
  para(x-4,y-4,w+10,h+8,12);D.fillStyle='#0a0a16';D.fill();para(x,y,w,h,10);D.fillStyle='#2a0a0a';D.fill();
  D.save();para(x,y,w,h,10);D.clip();D.fillStyle='#ff3a2a';D.fillRect(x,y,(w+12)*dfrac,h);
  const gr=D.createLinearGradient(x,0,x+w,0);gr.addColorStop(0,frac>.3?'#3ae8ff':'#ff6a3a');gr.addColorStop(1,frac>.3?'#ffe84a':'#ffb03a');D.fillStyle=gr;D.fillRect(x,y,(w+12)*frac,h);
  D.fillStyle='rgba(255,255,255,.35)';D.fillRect(x,y,w+12,4);D.restore();
  if(f.isP||f.isP2){const bars=(BT.vs?[[f.sta/f.S.maxSTA,'#3aa04a','#b0ff7a']]:[[f.mp/f.S.maxMP,'#3a8aff','#9fd8ff'],[f.sta/f.S.maxSTA,'#3aa04a','#b0ff7a']]);bars.forEach(([v,c1,c2],i)=>{const py=y+h+7+i*10;
    para(x+14,py,280,7,5);D.fillStyle='#0a0a16';D.fill();D.save();para(x+14,py,280,7,5);D.clip();const g2=D.createLinearGradient(x,0,x+300,0);g2.addColorStop(0,c1);g2.addColorStop(1,c2);D.fillStyle=g2;D.fillRect(x+14,py,290*clamp(v,0,1),7);D.restore();});}
  D.restore();
  const tx=right?960-124:124;
  outlineText(`${Math.ceil(f.hp)} / ${f.maxHp}`,right?960-118:118,30,13,'#fff',right?'right':'left');
  if(f.isP&&!BT.vs){outlineText(`MP ${Math.floor(f.mp)}/${f.S.maxMP}`,right?0:448,52,10,'#9fd8ff','left');outlineText(`STA ${Math.floor(f.sta)}`,448,62,10,'#b0ff7a','left');}
  outlineText(f.vsName?`${f.vsName} · ${WEAPONS[f.wpn].n}`:`Lv.${f.lv} ${f.isP?pname()+' · '+WEAPONS[f.wpn].n:f.name}`,tx,f.vsName?66:(f.isP?82:56),15,f.vsName?(f.isP?'#7ad8ff':'#ff9a8a'):f.elite?'#ffd23a':'#fff',right?'right':'left');
  if(!f.isP&&f.def&&f.def.phases)outlineText(`เฟส ${f.ph+1}/${f.def.phases.length+1}`,tx,76,12,'#ff9a8a','right');
  statusIcons(f,right?950:14,94,right);
  if(f.isP||f.isP2){   // การ์ด: วางเหนือเกจสุดยอด (ซ้าย) / มุมขวาล่างสำหรับ P2
    const al=right?'right':'left',lx=right?946:14,gy=402;
    if(f.guardBroken>0){outlineText(`การ์ดแตก! ป้องกันไม่ได้ ${(f.guardBroken/60).toFixed(1)} วิ`,lx,gy,12,'#ff6a4a',al);}
    else{outlineText('การ์ด [E]',lx,gy,11,'#9fd0ff',al);for(let i=0;i<CONFIG.guard.max;i++){const bx=right?lx-62-i*16:lx+58+i*16;D.fillStyle=i<f.guardLeft?'#9fd0ff':'rgba(159,208,255,.15)';D.beginPath();D.moveTo(bx,gy-6);D.lineTo(bx+12,gy-6);D.lineTo(bx+12,gy+1);D.lineTo(bx+6,gy+6);D.lineTo(bx,gy+1);D.closePath();D.fill();}}}
  // บัฟ/ดีบัฟจากระบบค่าสถานะ (StatSync) พร้อมเวลาที่เหลือ
  if(f.mods&&f.mods.length)f.mods.forEach((m,i)=>outlineText(`${m.kind==='debuff'?'▼':'▲'} ${m.n||m.id} ${(m.ttl/60).toFixed(1)}วิ`,tx,(f.isP?100:(f.def&&f.def.phases?92:76))+i*14,11,m.kind==='debuff'?'#ff9a5a':'#9fe8a0',right?'right':'left'));
  portrait(f,right?960-92-14:6,8,86,62,right);
}
function drawVSUI(b){
  const p=b.p,e=b.e,v=b.vs,need=CONFIG.arena.rounds;
  for(let i=0;i<need;i++){outlineText(i<v.wins[0]?'●':'○',440-i*20,70,16,'#ffd23a');outlineText(i<v.wins[1]?'●':'○',520+i*20,70,16,'#ffd23a');}
  if(b.comboT>0&&b.comboShow>=2){const left=b.comboWho===p;outlineText(b.comboShow+' HITS',left?110:850,180,36,'#ffd23a');}
  if(b.fullCombo)outlineText('✦ FULL COMBO: '+b.fullCombo.n+' ✦',480,150,28,'#ffd23a');
  // (คำแนะนำคอมโบ VS ถูกนำออก)
  if(b.net){outlineText(b.net==='guest'?'คุณคือ P2 (ขวา) · A/D หรือ ←/→ เดิน · W/↑ โดด · S/↓ ย่อ · J หรือ , ตี · K หรือ . เตะ · Space หรือ / พุ่งหลบ · ถือ E=กัน':'คุณคือ P1 (ซ้าย) · A/D หรือ ←/→ เดิน · W/↑ โดด · S/↓ ย่อ · J ตี · K เตะ · Space พุ่งหลบ · ถือ E=กัน',480,520,12,'rgba(122,216,255,.9)');}else{
  outlineText('P1: A/D เดิน · W กระโดด · S ย่อ · คลิกซ้าย ต่อย · คลิกขวา เตะ · Space พุ่งหลบ · ถือ E กัน',240,520,11,'rgba(122,216,255,.85)');
  outlineText('P2: ←/→ เดิน · ↑ กระโดด · ↓ ย่อ · , ตี · . เตะ · / พุ่งหลบ · ถือ \' =กัน',720,520,11,'rgba(255,154,138,.85)');}
  outlineText('เดินหน้า+คลิกซ้าย = ท่าหนัก · ลานประลองใช้เลเวล อุปกรณ์ และสกิลของแต่ละคน ไม่ใช้ยา',480,536,11,'rgba(255,255,255,.5)');
  if(b.intro>0){outlineText(b.intro>30?`ROUND ${v.round}`:'FIGHT!',480,250,b.intro>30?52:76,b.intro>30?'#fff':'#ffd23a');if(b.intro>30)outlineText('P1  VS  P2',480,310,22,'#fff');}
  if(b.msg)outlineText(b.msg.t,480,250,b.msg.t==='K.O.'?96:64,b.msg.c);
  if(b.result&&b.end>0&&b.end<70)outlineText(b.result==='win'?'P1 ชนะยกนี้!':b.result==='lose'?'P2 ชนะยกนี้!':'เสมอ',480,330,32,'#ffd23a');
  for(const n of b.nums){D.globalAlpha=Math.min(1,n.t/15);outlineText(n.txt,n.x*S,n.y*S,n.size,n.col);}D.globalAlpha=1;
  if(b.white>0){D.fillStyle=`rgba(255,255,255,${b.white/10})`;D.fillRect(0,0,960,540);}
}
function drawBattleUI(){
  const b=BT,p=b.p,e=b.e;
  hpBarB(p,false);hpBarB(e,true);
  if(b.vs){D.save();D.translate(480,34);D.beginPath();D.moveTo(-46,-26);D.lineTo(46,-26);D.lineTo(34,26);D.lineTo(-34,26);D.closePath();D.fillStyle='#0a0a16';D.fill();D.strokeStyle='#cfd6e8';D.lineWidth=3;D.stroke();D.restore();outlineText(String(Math.ceil(b.time/60)),480,30,30,'#fff');outlineText('TIME',480,52,11,'#3ad8ff');drawVSUI(b);return;}
  D.save();D.translate(480,34);D.beginPath();D.moveTo(-46,-26);D.lineTo(46,-26);D.lineTo(34,26);D.lineTo(-34,26);D.closePath();D.fillStyle='#0a0a16';D.fill();D.strokeStyle='#cfd6e8';D.lineWidth=3;D.stroke();D.restore();
  outlineText(String(Math.ceil(b.time/60)),480,30,30,'#fff');outlineText('TIME',480,52,11,'#3ad8ff');
  if(b.comboT>0&&b.comboShow>=2){const left=b.comboWho===p;outlineText(b.comboShow+' HITS',left?110:850,180,36,'#ffd23a');outlineText('COMBO!',left?110:850,210,15,'#fff');}
  for(const n of b.nums){D.globalAlpha=Math.min(1,n.t/15);outlineText(n.txt,n.x*S,n.y*S,n.size,n.col);}D.globalAlpha=1;
  if(e.state==='attack'&&e.phase==='startup'&&!b.flash)outlineText('!',e.x*S,(e.y-e.h-14)*S,34,'#ff5a4a');
  // skill bar
  for(let i=0;i<4;i++){const id=(p.skillSet||G.skills.slots)[i],x=14+i*62,y=452,s=id&&SKILLS[id];
    D.fillStyle='rgba(0,0,0,.65)';rrect(x,y,56,56,8);D.fill();D.strokeStyle={common:'#bbb',rare:'#4aa8ff',unique:'#ff6aff',ultimate:'#ffd23a'}[TIERS[i]];D.lineWidth=2;D.stroke();
    outlineText(String(i+1),x+8,y+9,12,'#fff');
    if(s){D.font='18px sans-serif';D.textAlign='center';D.textBaseline='middle';D.fillText(s.ic,x+28,y+24);outlineText(s.n.length>6?s.n.slice(0,6)+'…':s.n,x+28,y+40,10,'#fff');if(i===2&&G.skills.bound&&!p.skillSet)outlineText('🔒',x+48,y+9,10,'#fff');const cd=cdLeftF(p,id),full=Skills.cdFrames(id,p.S);
      const ce=skillCastCheck(p,id),lack=ce&&!Skills.cdLeft(id)&&s.type!=='passive';if(lack){D.fillStyle='rgba(40,40,120,.5)';rrect(x,y,56,56,8);D.fill();}
      if(cd>0){D.fillStyle='rgba(0,0,0,.6)';D.beginPath();D.moveTo(x+28,y+28);D.arc(x+28,y+28,30,-Math.PI/2,-Math.PI/2+6.283*cd/full);D.closePath();D.fill();outlineText((cd/60).toFixed(1),x+28,y+30,16,'#fff');}
      outlineText(s.tier==='ultimate'?Math.floor(G.ult||0)+'/100':s.type==='passive'?'พาสซีฟ':Mana.cost(id,p.S)+'MP',x+28,y+51,8,s.tier==='ultimate'?'#ffd23a':'#9fd8ff');}
    else outlineText('—',x+28,y+30,14,'#666');}
  // ultimate gauge + mana potion
  {const gx=14,gy=428,gw=240,v=(G.ult||0)/CONFIG.ult.max;D.fillStyle='rgba(0,0,0,.65)';rrect(gx,gy,gw,14,7);D.fill();
   const gg=D.createLinearGradient(gx,0,gx+gw,0);gg.addColorStop(0,'#ff7a1a');gg.addColorStop(1,'#ffd23a');D.fillStyle=v>=1&&G.t%20<10?'#fff6a0':gg;rrect(gx,gy,gw*v,14,7);D.fill();
   outlineText('เกจสุดยอด '+Math.floor(G.ult||0)+'/100'+(v>=1?'  [L] พร้อม!':''),gx+gw/2,gy+7,11,'#fff');
   const np=Mana.potionIds.reduce((a,k)=>a+(G.mats[k]||0),0);outlineText(`🧪 ยามานา ×${np} [R]${G.potCD>0?' · '+(G.potCD/60).toFixed(1)+' วิ':''}`,gx+gw/2,gy-12,11,G.potCD>0?'#999':'#9fd8ff');}
  // combo route
  // (คำแนะนำคอมโบกลางจอถูกนำออก)
  if(b.fullCombo)outlineText('✦ FULL COMBO: '+b.fullCombo.n+' ✦',480,150,28,'#ffd23a');
  if(b.phaseMsg)outlineText(b.phaseMsg.t,480,200,30,'#ff6a5a');
  if(e.weakT>0)outlineText('จุดอ่อนเปิด '+(e.weakT/60).toFixed(1)+' วิ',e.x*S,(e.y-e.h-34)*S,15,'#5affb0');
  const m=p.state==='attack'?p.move:(b.lastT>0?b.lastMove:null);
  if(m&&!b.flash){const X=330,Y=486,Wd=300,tot=m.s+m.a+m.r,k=Wd/tot;D.globalAlpha=p.state==='attack'?.95:.4;
    D.fillStyle='rgba(0,0,0,.55)';D.fillRect(X-4,Y-4,Wd+8,18);D.fillStyle='#c79a2a';D.fillRect(X,Y,m.s*k,10);D.fillStyle='#e0473a';D.fillRect(X+m.s*k,Y,m.a*k,10);
    D.fillStyle='#3a6ad0';D.fillRect(X+(m.s+m.a)*k,Y,m.r*k,10);D.fillStyle=p.didHit?(G.t%8<4?'#ffe27a':'#fff6c8'):'rgba(255,226,122,.25)';D.fillRect(X+(m.s+m.a)*k,Y-2,Math.min(CONFIG.comboWindow,m.r)*k,14);
    if(p.state==='attack'){const el=p.phase==='startup'?p.pt:p.phase==='active'?m.s+p.pt:m.s+m.a+p.pt;D.fillStyle='#fff';D.fillRect(X+el*k-1.5,Y-5,3,20);}
    D.globalAlpha=1;outlineText(m.n,480,Y+26,15,'#fff');}
  outlineText('คลิกซ้าย ต่อย · เดินหน้า+คลิกซ้าย หนัก · คลิกขวา เตะ · S+คลิกขวา กวาดขา · ถือ E กัน · 1-4 สกิล · L สุดยอด · R ยามานา · Space พุ่งหลบ · W กระโดด · F หนี',480,530,12,'rgba(255,255,255,.6)');
  if(b.small)outlineText(b.small.t,p.x*S,(p.y-p.h-26)*S,15,'#9fe6ff');
  if(b.flash){const f=b.flash.f,lft=f.x<240;D.save();D.beginPath();D.moveTo(0,190);D.lineTo(960,150);D.lineTo(960,300);D.lineTo(0,340);D.closePath();
    const gr=D.createLinearGradient(0,0,960,0);gr.addColorStop(0,'rgba(10,8,20,.95)');gr.addColorStop(.5,ELC[b.flash.m.el]||'#ffd23a');gr.addColorStop(1,'rgba(10,8,20,.95)');D.fillStyle=gr;D.fill();D.clip();
    for(let i=0;i<24;i++){const y=150+hash(i,3)*190,xo=((G.t*30+hash(i,7)*960)%1200)-120;D.fillStyle='rgba(255,255,255,.35)';D.fillRect(lft?960-xo:xo,y,80,2);}
    if(f.rig){const Pz=poseIdle(0),J=rigPoints(Pz),sc=16,dir=lft?1:-1,cx=lft?250:710;drawRig(D,cx-J.hd[0]*sc*dir,250-J.hd[1]*sc,sc,dir,Pz,f.look);}
    D.restore();outlineText(b.flash.m.n,lft?620:340,250,36,'#fff');outlineText('ท่าไม้ตายสุดยอด!',lft?620:340,292,18,'#ffd23a');}
  if(b.intro>0){outlineText(b.intro>30?'ROUND 1':'FIGHT!',480,250,b.intro>30?52:76,b.intro>30?'#fff':'#ffd23a');if(b.intro>30)outlineText(`Lv.${p.lv} คุณ  VS  ${e.name} Lv.${e.lv}`,480,310,20,'#fff');}
  if(b.msg)outlineText(b.msg.t,480,250,b.msg.t==='K.O.'?96:64,b.msg.c);
  if(b.result&&b.end>0&&b.end<70)outlineText(b.result==='win'?'คุณชนะ!':'คุณแพ้...',480,330,32,b.result==='win'?'#ffd23a':'#ff8a7a');
  if(b.white>0){D.fillStyle=`rgba(255,255,255,${b.white/10})`;D.fillRect(0,0,960,540);}
}

/* ---- keyboard / gamepad focus navigation for menus ---- */
const Nav={
  items(){return[...pn.querySelectorAll('button:not([disabled]),select,input')].filter(e=>e.offsetParent!==null);},
  key(e){return e.tagName+JSON.stringify(e.dataset)+e.textContent.slice(0,12);},
  move(dx,dy){const it=this.items();if(!it.length)return;const cur=document.activeElement;if(!it.includes(cur)){it[0].focus();return;}
    const r0=cur.getBoundingClientRect(),cx=r0.x+r0.width/2,cy=r0.y+r0.height/2;let best=null,bd=1e9;
    for(const e of it){if(e===cur)continue;const r=e.getBoundingClientRect(),vx=r.x+r.width/2-cx,vy=r.y+r.height/2-cy,along=vx*dx+vy*dy;if(along<=4)continue;
      const d=along+Math.abs(vx*dy-vy*dx)*2.2;if(d<bd){bd=d;best=e;}}
    if(best){best.focus();best.scrollIntoView({block:'nearest'});}},
  activate(){const a=document.activeElement;if(a&&pn.contains(a)&&!a.disabled)a.click();else{const it=this.items();if(it[0])it[0].focus();}}
};
