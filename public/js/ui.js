'use strict';
/* ============================================================
   UI — every screen reads/writes the live systems (no mockups)
   ============================================================ */
const pn=$('#pn'),ov=$('#ov');
// รวมราคาของที่เลือกไว้ในหน้าขาย (อุปกรณ์ = ทีละชิ้น, วัตถุดิบ = ทั้งกอง)
function sellSelValue(){let g=0,n=0;for(const k of UI.sellSel){const v=k.slice(2);if(k[0]==='i'){const it=itemByUid(+v);if(it&&!Equip.isEquipped(it)){g+=Inv.sellPrice(it);n++;}}else if(G.mats[v]>0){g+=Inv.matPrice(v)*G.mats[v];n++;}}return{g,n};}
const ATTR_HINT={str:'ATK +2/หน่วย · ทุก 10 = ต้านสถานะ +1%',agi:'ทุก 10 = หลบ +1%, DEF +3',int:'MP +10, ATK +2/หน่วย',vit:'HP +20/หน่วย',luk:'คริ +0.2%, ดาเมจคริ +1%/หน่วย'};
const MENU_SUB=['char','bag','equip','skills','quests','map','ency','settings','controls','debug'];   // หน้าที่เปิดจากเมนู Tab จะมีปุ่มกลับเมนูด้านบน
const pct=v=>(Math.round(v*1000)/10)+'%';
const rc=r=>`style="color:${RARC[r]}"`;
const matRar=k=>{const m=MATS[k];return m?(m.rar||(m.rareMat?'rare':m.manaPotion&&k==='mp_x'?'epic':m.manaPotion&&k==='mp_l'?'rare':'normal')):'normal';};
const rb=r=>`style="border-color:${RARC[r]}"`;
function statLines(s){return Object.keys(s).map(k=>`<div>${STATN2[k]||k} <b>${fmtStat(k,s[k])}</b></div>`).join('');}
const TIERC=['#b8bcc8','#5fd38d','#4fa8ff','#c88aff','#ffb347'];
const tierTag=t=>`<b style="color:${TIERC[t-1]};font-size:11px">T${t}</b>`;
/* ธาตุของอาวุธ = ป้ายดาเมจของท่าธรรมดา (จากชุดท่าของอาวุธ) */
const wElTag=baseId=>{const b=BASES[baseId];if(!b||b.type!=='weapon')return null;const el=(WEAPONS[b.wt]||{}).el||'phys';return typeof dmgTag==='function'?dmgTag({el,type:'phys'}):el;};
/* ธาตุของสกิล: ชิปสีตามธาตุ (สกิลที่ไม่มีดาเมจ เช่น บัฟ/พาสซีฟ แสดง 'ไม่มีธาตุ') */
const skEl=(s,big)=>!s?'':s.el==='weapon'?`<span class="dim" style="font-size:11px">⚔ ตามธาตุอาวุธ</span>`:s.el&&(s.coef||s.status||s.buff&&s.buff.fireShield)?elChip(s.el,big):'<span class="dim" style="font-size:11px">ไม่มีธาตุ</span>';
const elChip=(t,big)=>{const c=DMGCOL[t]||DMGCOL.phys;return`<span style="display:inline-flex;align-items:center;gap:3px;padding:${big?'2px 9px':'0 6px'};border-radius:999px;background:rgba(0,0,0,.45);border:1px solid ${c[0]}88;color:${c[0]};font-weight:800;font-size:${big?13:11}px;text-shadow:-1px -1px 0 ${c[1]},1px -1px 0 ${c[1]},-1px 1px 0 ${c[1]},1px 1px 0 ${c[1]}">${c[2]?c[2]+' ':''}${ELNAME[t]||t}</span>`;};
const RUNEC={rune_atk:'#ff6a5a',rune_matk:'#c88aff',rune_def:'#9fd0ff',rune_hp:'#6aff9a',rune_crit:'#ffd23a',rune_agi:'#7af0c0'};
const runeTxt=rk=>{const m=MATS[rk];return m?(m.desc||'').replace('ใส่ช่องรูน: ',''):'';};
function itemTip(it,cmp){
  /* การ์ดไอเทม: ธาตุ (อาวุธ) · ค่าฐาน × ระดับ × ตีบวก · ค่าความสามารถ + เทียร์ · ความสามารถเทพ · ช่องรูน */
  const b=BASES[it.base],R=RARITY[it.rar],s=itemStats(it),c=cmp?itemStats(cmp):null,wt=wElTag(it.base),cap=Equip.maxEnh(it);
  const dlt=(k,v)=>{if(!c)return'';const d=v-(c[k]||0);return Math.abs(d)>1e-6?` <span class="${d>0?'good':'bad'}">(${fmtStat(k,d)})</span>`:'';};
  let h=`<div class="tip" style="border-color:${RARC[it.rar]}"><div class="tn" ${rc(it.rar)}>${bIco(it.base,16)} ${itemName(it)}</div><div class="ts">${RARN[it.rar]} · ${CAT_N[b.cat]||SLOTN[b.type]}${wt?' · ธาตุ '+elChip(wt):''}</div>`;
  h+=`<div class="ts">ตีบวก <b>+${it.enh||0}</b> / +${cap}${cap<GEAR.enhMax?` <span class="dim">(เพดานแรงค์ · สูงสุด +${GEAR.enhMax})</span>`:''}${it.crafted?' · <span class="good">ของ craft</span>':''}${b.wt?' · ชุดท่า: '+WEAPONS[b.wt].n:''}</div>`;
  const em=1+GEAR.enhStep*(it.enh||0);
  if(b.atk)h+=`<div class="ts" style="font-size:15px">ATK <b>${s.watk||0}</b>${dlt('watk',s.watk||0)} <span class="dim" style="font-size:11px">(ฐาน ${b.atk} × ${R.mult} × ${em.toFixed(1)})</span></div>`;
  else if(b.def)h+=`<div class="ts" style="font-size:15px">DEF <b>${Math.round(b.def*R.mult*em)}</b> <span class="dim" style="font-size:11px">(ฐาน ${b.def} × ${R.mult} × ${em.toFixed(1)})</span></div>`;
  else h+=`<div class="ts dim">ไม่มีค่าฐาน (เครื่องประดับ)</div>`;
  const imp=[];if(b.edmg)for(const k in b.edmg)imp.push(`${STATN2['dmg_'+k]||'โบนัส'+k} ${fmtStat('dmg_'+k,b.edmg[k])}`);if(b.res)for(const k in b.res)imp.push(`${STATN2['res_'+k]||k} ${fmtStat('res_'+k,b.res[k])}`);
  if(b.implicit)for(const k in b.implicit)imp.push(`${STATN2[k]||k} ${fmtStat(k,b.implicit[k])}`);
  if(imp.length)h+=`<div class="ts">ค่าติดตัว: ${imp.join(' · ')}</div>`;
  const af=it.affixes||[];
  h+=`<div class="ts dim">ค่าความสามารถ (${af.length}/${R.affix})</div><div class="tl">`+(af.map(a=>`<div>${a.lock?'🔒 ':''}${Gear.label(a,it)} ${tierTag(a.t)}</div>`).join('')||'<div class="dim">—</div>')+'</div>';
  if(it.uniq&&PASSIVES.god[it.uniq]){const P=PASSIVES.god[it.uniq];h+=`<div class="tu">✦ ความสามารถเทพ · ${P.n}: ${P.d}</div>`;}
  else if(it.rar==='god')h+=`<div class="tu">✦ ความสามารถเทพ: —</div>`;
  const mx=R.sockets||0,socks=it.sockets||[];
  h+=`<div class="ts">ช่องรูน ${socks.length}/${mx}: `+(socks.length?socks.map(rk=>rk&&MATS[rk]?`<span style="color:${RUNEC[rk]||'#fff'}">[${MATS[rk].n}]</span>`:'<span class="dim">[ว่าง]</span>').join(' '):'<span class="dim">ยังไม่เจาะ (ใช้สว่านรูน)</span>')+`</div>`;
  if(c){const keys=[...new Set([...Object.keys(s),...Object.keys(c)])].filter(k=>k!=='watk'&&Math.abs((s[k]||0)-(c[k]||0))>1e-6);
    if(keys.length)h+=`<div class="ts dim">เทียบกับที่สวมอยู่ (${itemName(cmp)}): `+keys.map(k=>`${STATN2[k]||k}${dlt(k,s[k]||0)}`).join(' · ')+'</div>';}
  return h+'</div>';
}
const UI={
  cur:null,sel:null,filt:{type:'all',rar:'all',sort:'rarity'},
  open(name,arg){if(!this.cur)this._prevMode=G.mode==='title'?'title':null;if(name==='map'&&arg===undefined){this.mapSel=null;this.mapTab='continents';}this.cur=name;G.mode='menu';ov.classList.remove('hidden');this.render(arg);SFX.ui('open');},
  close(){const was=this.cur;if(this.cur)SFX.ui('cancel');ov.classList.add('hidden');this.cur=null;this.mapTab=null;this.talentSwitch=false;pvCtx=null;mapPinCtx=null;if(G.mode==='menu')G.mode=this._prevMode||'explore';this._prevMode=null;this.hud();if(typeof Net!=='undefined')Net.onUIClose();
    if(was==='skills'&&G.flags&&G.flags.pendingIntroCS&&!G.flags.introDone&&typeof Cutscene!=='undefined'){G.flags.pendingIntroCS=0;Cutscene.startIntro();}
    else if(was==='craft'&&G.flags&&G.flags.pendingBoroCraftDlg){G.flags.pendingBoroCraftDlg=0;G.flags.boroFirstCraftSay=1;if(typeof say==='function')say([['โบโร','นี่คือการคราฟต์ จงจำไว้ว่าการคราฟต์แต่ละครั้งมีความเสี่ยง — วัตถุดิบอาจสูญหายได้หากล้มเหลว'],['โบโร','และเวลาลงดันเจี้ยนอย่าลืมที่จะพก "คัมภีร์ทางออก" ไปด้วย เผื่อมีอุบัติเหตุจะได้ออกได้ทันที คัมภีร์หาได้จากร้านค้าในเมืองนะ!']]);}
    else if(was==='loot'&&G.flags&&G.flags.pendingBbqyWinDlg){G.flags.pendingBbqyWinDlg=0;if(typeof say==='function')say([['bbqy legendary','ในเมื่อเจ้าชนะข้าได้ งั้นก็สืบต่อพลังของข้าให้กับเจ้า']]);}},
  render(arg){const ae=document.activeElement,key=ae&&pn.contains(ae)?Nav.key(ae):null;const f=this['scr_'+this.cur];let html=f?f.call(this,arg):'';if(MENU_SUB.includes(this.cur)){const back=this._prevMode==='title'?`<button class="btn ghost sm" data-close="1">✕ ปิด</button>`:`<button class="btn ghost sm" data-open="menu">‹ กลับเมนู</button>`;html=`<div class="backbar">${back}</div>`+html;}pn.innerHTML=html;pvCtx=null;mapPinCtx=null;const pv=$('#pv');if(pv)pvCtx=pv.getContext('2d');const mp=$('#mapHeroCv');if(mp){mapPinCtx=mp.getContext('2d');drawMapHeroPin();}
    const af=pn.querySelector('[autofocus]');if(af)af.focus();else if(key){const el=Nav.items().find(e=>Nav.key(e)===key);if(el)el.focus();}},
  rerender(){if(this.cur)this.render();},
  hud(){
    if(!G.talent)return;const S=StatSync.get();G.hp=Math.min(G.hp,S.maxHP);
    const rk=typeof Guild!=='undefined'&&G.guildRank?Guild.info():null;
    const rkTag=rk?` <small style="color:${rk.col};border:1px solid ${rk.col}88;border-radius:3px;padding:0 4px">Rank ${rk.id}</small>`:'';
    $('#hudname').innerHTML=`Lv.${G.level}${rkTag} ${ico(TALENT_ICO[G.talent],14)} <small>${TALENTS[G.talent].th}</small>${G.points?` <span class="pts">+${G.points} แต้ม (C)</span>`:''} <small style="color:#ffd23a">⚡${Math.floor(G.ult||0)}</small>${G.bloodstain?' <small style="color:#ff5a4a">🩸'+G.bloodstain.gold+'g</small>':''}`;
    $('#hpb').style.width=(G.hp/S.maxHP*100)+'%';$('#hpt').textContent=`${G.hp}/${S.maxHP}`;
    $('#mpb').style.width=(G.mp/S.maxMP*100)+'%';$('#mpt').textContent=`${Math.floor(G.mp)}/${S.maxMP}`;
    $('#xpb').style.width=((!(typeof hasNoMaxLv==='function'&&hasNoMaxLv())&&G.level>=CONFIG.levelCap)?100:G.xp/CONFIG.xpNext(G.level)*100)+'%';$('#gold').textContent=G.gold;
    const hm=$('#hudmods');
    if(hm){
      const ms=(S.mods||[]).slice().sort((a,b)=>(a.kind==='debuff'?1:0)-(b.kind==='debuff'?1:0));
      hm.innerHTML=ms.map(m=>{const pct=Math.max(0,Math.min(100,Math.round(m.left/Math.max(1,m.max||m.left)*100)));
        return`<span class="stat-badge ${m.kind==='debuff'?'debuff':'buff'}">${m.kind==='debuff'?'▼':'▲'} ${esc(m.n||m.id)} <small>${(m.left/60).toFixed(0)}วิ</small><i class="sb-bar" style="width:${pct}%"></i></span>`;}).join('');
    }
    this.quest();
  },
  quest(){const q=Object.keys(QUESTS).filter(id=>G.q[id]&&G.q[id].active&&!G.q[id].done);
    const gq=(typeof GUILD_QUESTS!=='undefined'?GUILD_QUESTS:[]).filter(x=>G.guildQuests&&G.guildQuests[x.id]&&G.guildQuests[x.id].active);
    const lines=q.slice(0,2).map(id=>`<div class="t">◆ ${QUESTS[id].n}</div><div class="o">◇ ${QUESTS[id].steps[Math.min(G.q[id].step,QUESTS[id].steps.length-1)]}${id==='hunt'?` (${G.q.hunt.count}/3)`:''}</div>`)
      .concat(gq.slice(0,2).map(x=>{const st=G.guildQuests[x.id];return`<div class="t" style="color:#ffd23a">⚔️ [กิลด์] ${x.n}</div><div class="o">${st.count>=x.req?'✅ ครบแล้ว ส่งได้ที่กิลด์':`◇ ปราบ ${st.count}/${x.req}`}</div>`;}));
    $('#quest').innerHTML=lines.join('')||'<div class="o dim">ไม่มีเควสต์ค้าง</div>';},
  levelUp(n){SFX.level();toast(`⬆️ เลเวลอัป! Lv.${G.level} — ได้รับ ${n*CONFIG.levelPoints} แต้มค่าพลัง (กด C เพื่อแจก)`,3500);this.hud();},

  /* ---- talent selection (character creation) ---- */
  diffSel:'souls',
  scr_create(){const L=Object.assign({},DEFLOOK,G.look);
    const sw=(arr,key)=>arr.map(c=>`<button class="sw ${L[key]===c?'on':''}" data-lk="${key}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')+
      `<label class="sw pick" title="เลือกสีเอง"><input type="color" id="pc-${key}" value="${/^#[0-9a-f]{6}$/i.test(L[key]||'')?L[key]:'#888888'}"></label>`;
    return`<h2>${ico('brush',22)} สร้างตัวละคร</h2><div class="eqg"><div><canvas id="pv" width="220" height="270"></canvas></div><div class="cr">
      <h3>ชื่อ</h3><p><input id="pname" maxlength="12" placeholder="ตั้งชื่อตัวละคร (ไม่เกิน 12 ตัว)" value="${(L.name||'').replace(/"/g,'')}" style="width:260px"></p>
      <h3>เพศ &amp; เผ่า</h3><div class="swrow"><button class="btn sm ${L.sex==='m'?'':'ghost'}" data-sex="m">♂ ชาย</button><button class="btn sm ${L.sex==='f'?'':'ghost'}" data-sex="f">♀ หญิง</button><button class="btn sm ${L.elfEars?'':'ghost'}" data-elf="1">🧝 หูเอลฟ์</button></div>
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
        <div class="mlist">${R('char','status','สถานะตัวละคร',kbName('char'))}${R('bag','bag','ช่องเก็บของ',kbName('bag'))}${R('equip','equip','สวมใส่อุปกรณ์',kbName('equip'))}${R('skills','skill','สกิล',kbName('skills'))}${R('quests','scroll','เควสต์',kbName('quests'))}${R('map','map','แผนที่โลก',kbName('map'))}${R('ency','ency','สารานุกรมศัตรู',kbName('ency'))}</div>
        <div class="mlist sub">${A('save','save','บันทึกเกม','')}${A('load','load','โหลดเกม','')}${R('settings','gear',`ตั้งค่า (เสียง ${Math.round(SND.vol*100)}%)`,'')}${R('controls','controls','ปุ่มควบคุม','?')}${A('title','home','กลับหน้าหลัก (บันทึกก่อน)','')}${window.CF_WS?'':`<a class="mrow" href="balance.html" style="text-decoration:none"><span class="mi">${ico('controls')}</span><span class="ml">Balance Lab (ปรับค่าเกม)</span></a>`}</div>
      </div>
      <div class="emn-r"><div class="sumcard"><canvas id="pv" class="mport" width="220" height="270"></canvas>
        <div class="emn-head">${pname()}</div>
        <div class="sl">Lv.${G.level} · <b style="color:${(typeof Guild!=='undefined'&&Guild.registered()?Guild.info().col:'#99a')}">Rank ${typeof Guild!=='undefined'&&Guild.registered()?Guild.rank():'-'}</b> · ${TALENTS[G.talent].th}</div>
        <div class="sb"><span>HP</span>${bar(G.hp,S.maxHP,'#b8413a')}<b>${Math.round(G.hp)} / ${S.maxHP}</b></div>
        <div class="sb"><span>MP</span>${bar(G.mp,S.maxMP,'#3a7ac8')}<b>${Math.round(G.mp)} / ${S.maxMP}</b></div>
        <div class="sb"><span>XP</span>${bar(G.xp,CONFIG.xpNext(G.level),'#c8a464')}<b>${!(typeof hasNoMaxLv==='function'&&hasNoMaxLv())&&G.level>=CONFIG.levelCap?'เลเวลสูงสุด (Lv.'+CONFIG.levelCap+')':G.xp+' / '+CONFIG.xpNext(G.level)+(typeof hasNoMaxLv==='function'&&hasNoMaxLv()?' (∞)':'')}</b></div>
        <div class="sgold">${ico('coin',18)} ${G.gold}</div>
      </div>
</div></div>`;},
  scr_settings(){
    const row=(k,ic,title,desc,v)=>{const p=Math.round((v??1)*100);
      return`<div class="srow-vol"><div class="sv-hd"><span>${ic} <b>${title}</b> <small class="dim">${desc}</small></span><b id="sv_${k}" class="sv-pct">${p}%</b></div>
        <input class="vol-range" type="range" min="0" max="100" step="1" value="${p}" data-sndvol="${k}" aria-label="${title}"></div>`;};
    const fxOn=typeof FX!=='undefined'?FX.on:true;
    return`<h2>${ico('gear',22)} ตั้งค่า</h2>
      <div class="setcard"><h3>🔊 ระบบเสียง</h3>
        ${row('vol','🔊','เสียงหลัก (Master)','ปรับความดังรวมทุกเสียงในเกม',SND.vol)}
        <div class="acts" style="margin:2px 0 10px">
          <button class="btn sm ghost" data-setvol="0">🔇 ปิดเสียง</button>
          <button class="btn sm ghost" data-setvol="0.1">10%</button>
          <button class="btn sm ghost" data-setvol="0.4">40%</button>
          <button class="btn sm ghost" data-setvol="0.7">70%</button>
          <button class="btn sm ghost" data-setvol="1">100%</button>
          <button class="btn sm" data-testsnd="1">🔔 ทดสอบเสียง</button>
        </div>
        ${row('sfx','⚔️','เสียงเอฟเฟกต์ (SFX)','เสียงฟัน ป้องกัน สกิล และปุ่มกด',SND.sfxVol??1)}
        ${row('mus','🎵','เพลงประกอบ (Music)','เพลงเมือง และเพลงบอส',SND.musVol??1)}
        ${row('amb','🌿','เสียงบรรยากาศ (Ambient)','เสียงลม ถ้ำ ลาวา และธรรมชาติ',SND.ambVol??1)}
      </div>
      <div class="setcard"><h3>⚙️ ภาพและการควบคุม</h3>
        <div class="acts">
          <button class="btn sm ${fxOn?'':'ghost'}" data-togglefx="1">✨ แสงเงา HD-2D: ${fxOn?'เปิด':'ปิด'} [V]</button>
          <button class="btn sm ghost" data-open="controls">⌨️ ตั้งค่าปุ่มควบคุม</button>
        </div>
      </div>`;
  },
  scr_controls(){
    const grp=(g,t)=>`<div class="kbsec"><h3>${t}</h3>${KB_DEFS.filter(a=>a.g===g).map(a=>{const w=KB_WAIT===a.id;return`<div class="kbrow"><span>${a.n}</span><kbd class="kbk${w?' wait':''}">${w?'กดปุ่มใหม่… (Esc ยกเลิก)':kbName(a.id)}</kbd><button class="btn sm ghost" data-kbset="${a.id}">เปลี่ยน</button></div>`;}).join('')}</div>`;
    return`<h2>${ico('controls',22)} ปุ่มควบคุม</h2><div class="kbcols">${grp('move','เคลื่อนที่และพุ่งหลบ')}${grp('battle','ต่อสู้')}${grp('explore','สำรวจและเมนู')}</div>
      <p class="dim">ปุ่มคงที่: ลูกศรใช้เดิน กระโดด ย่อได้เสมอ · Enter / Space ยืนยันและคุย · Tab / Esc เปิดหรือปิดเมนู · V เปิดปิด HD-2D · แพดใช้ X / Y แทนต่อยและเตะ</p>
      <div class="acts"><button class="btn ghost" data-kbreset="1">คืนค่าเริ่มต้นทั้งหมด</button></div>`;
  },
  scr_talent(){const sw=this.talentSwitch;return(sw?`<h2>✨ พรสวรรค์แห่งการวิวัฒน์ — เลือกพรสวรรค์ใหม่</h2><p class="dim">คงเลเวล อุปกรณ์ และไอเทมเดิมทั้งหมด · ปัจจุบัน: <b>${TALENTS[G.talent].n}</b> <button class="btn ghost sm" data-close="1">ยกเลิก</button></p>`:`<h2>เลือกพรสวรรค์ (Unique Talent) — เลือกได้ 1 อย่างเท่านั้น</h2>`)+`<div class="tal">`+Object.entries(TALENTS).map(([k,t])=>{const sk=SKILLS[t.skill];
    return`<button class="talc" data-tal="${k}"><div class="ti">${ico(TALENT_ICO[k],34)}</div><b>${t.n}</b><div class="dim">${t.th}</div><p>${t.desc}</p><div class="sk">สกิลเฉพาะตัว: <b>${sk.n}</b><br><small>${sk.desc}</small></div></button>`;}).join('')+'</div><p class="dim">พรสวรรค์จะผนึกสกิลเฉพาะตัวลงช่องที่ 4 ให้อัตโนมัติหลังสร้างตัว</p>';},

  /* ---- หน้าค่าสถานะ: รายการเดียว ไม่แยกหมวด ---- */
  v2Stats(S){
    const tg=(t,txt)=>{const c=DMGCOL[t]||DMGCOL.phys;return`<span style="color:${c[0]};text-shadow:-1px -1px 0 ${c[1]},1px -1px 0 ${c[1]},-1px 1px 0 ${c[1]},1px 1px 0 ${c[1]};font-weight:800">${txt}</span>`;};
    const ic=t=>(DMGCOL[t]&&DMGCOL[t][2]?DMGCOL[t][2]+' ':'');
    const lv=G.level||1,K=armorK({level:lv}),arm=1-K/(K+S.def),wEl=(WEAPONS[Equip.weaponType()]||{}).el||'phys',wTag=dmgTag({el:wEl,type:'phys'});
    const TAGS=[['phys','กายภาพ'],['fire','ไฟ'],['ice','น้ำแข็ง'],['lightning','สายฟ้า'],['shadow','มืด'],['holy','แสง'],['magic','เวท']];
    const bon=TAGS.map(([t,n])=>{const v=((S.elDmg&&S.elDmg[t])||0)+(S.dmgPct||0);return`<div class="v2c${v?' on':''}">${tg(t,ic(t)+n)}<b>+${Math.round(v*1000)/10}%</b></div>`;}).join('');
    const RES=[['fire','ไฟ'],['ice','น้ำแข็ง'],['lightning','สายฟ้า'],['shadow','มืด'],['holy','แสง'],['arcane','เวท'],['poison','พิษ']];
    const res=RES.map(([k,n])=>{const v=(S.res&&S.res[k])||0,t=k==='arcane'?'magic':k;return`<div class="v2c${v?' on':''}">${tg(t,ic(t)+n)}<b>${Math.round(v*100)}%</b></div>`;}).join('');
    return`<style>.v2g{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:4px 8px;margin:4px 0 10px}.v2c{display:flex;justify-content:space-between;gap:6px;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.04);font-size:13px}.v2c.on{background:rgba(255,210,58,.10)}.v2c b{white-space:nowrap}</style>
      <h3>ค่าที่คำนวณได้</h3><div class="stat2">
      <span>HP สูงสุด</span><b>${S.maxHP}</b>
      <span>MP สูงสุด</span><b>${S.maxMP}</b>
      <span>พลังโจมตี (ATK)</span><b>${S.ap}</b>
      <span>ธาตุอาวุธ</span><b>${tg(wTag,ic(wTag)+(ELNAME[wTag]||wTag))}</b>
      <span>DEF</span><b>${S.def} <small class="dim">(กัน ${pct(arm)})</small></b>
      <span>ลดดาเมจ</span><b>${pct(S.dr)}</b>
      <span>อัตราคริติคอล</span><b>${pct(S.critRate)}</b>
      <span>ดาเมจคริติคอล</span><b>${pct(S.critDmg)}</b>
      <span>เจาะเกราะ %</span><b>${pct(S.apenPct)}</b>
      <span>เจาะเกราะ (คงที่)</span><b>${S.apen}</b>
      <span>หลบหลีก</span><b>${pct(S.evasion)}</b>
      <span>สตามินา</span><b>${S.maxSTA}</b>
      <span>โอกาสสร้างสถานะ</span><b>+${pct(S.statusChance||0)}</b>
      <span>ต้านสถานะผิดปกติ</span><b>${pct(S.statusRes)}</b>
      <span>ฟื้นฟูมานา</span><b>+${pct(S.mpRegen)}</b>
      <span>ลดค่ามานา</span><b>${pct(S.mpCost)}</b>
      <span>เกจท่าไม้ตาย</span><b>${Math.floor(G.ult||0)} / 100</b></div>
      <h3>โบนัสดาเมจธาตุ</h3><div class="v2g">${bon}</div>
      <h3>ต้านธาตุ <small class="dim">(สูงสุด ${Math.round(CONFIG.resCap*100)}%)</small></h3><div class="v2g">${res}</div>
`;
  },
  /* ---- character status ---- */
  scr_char(){
    const S=StatSync.get(),L=equipped();
    const attrs=Object.keys(ATTRN).map(k=>`<div class="arow"><span>${ATTRN[k]}</span><b>${S[k]}</b><small></small><button class="btn sm" data-al="${k}" ${G.points&&BASE_ATTR[k]+G.alloc[k]<CONFIG.attrMax?'':'disabled'}>${BASE_ATTR[k]+G.alloc[k]>=CONFIG.attrMax?'MAX':'+1'}</button></div>`).join('');
    const mast=Object.keys(WEAPONS).filter(w=>G.mastery[w]).map(w=>`<div>${WEAPONS[w].n}: Lv.${Prog.masteryLv(w)} </div>`).join('')||'<div class="dim">ยังไม่มี — ใช้อาวุธตีศัตรูเพื่อเพิ่ม</div>';
    const sets=activeSetBonuses(L).map(s=>`<div class="good">${SETS[s.set].n} ${s.n} ชิ้น: ${s.b.d||Object.keys(s.b).map(k=>(STATN2[k]||k)+' '+fmtStat(k,s.b[k])).join(', ')}</div>`).join('')||'<div class="dim">—</div>';
    const pas=[...S.passives].map(p=>{const P=PASSIVES.leg[p]||PASSIVES.god[p];return P?`<div>★ ${P.n}: ${P.d}</div>`:'';}).join('')||'<div class="dim">—</div>';
    const modsHtml=S.mods&&S.mods.length?'<div style="display:flex;flex-wrap:wrap;gap:6px">'+S.mods.slice().sort((a,b)=>(a.kind==='debuff'?1:0)-(b.kind==='debuff'?1:0)).map(m=>`<span class="stat-badge ${m.kind==='debuff'?'debuff':'buff'}">${m.kind==='debuff'?'▼':'▲'} ${esc(m.n||m.id)}: ${m.stat} ${m.op==='mul'?'×'+m.v:(m.v>0?'+':'')+m.v} <small>(เหลือ ${(m.left/60).toFixed(1)} วิ)</small></span>`).join('')+'</div>':'<div class="dim">ไม่มี</div>';
    const ago=StatSync.lastTickAt?Math.round((Date.now()-StatSync.lastTickAt)/1000):null;
    const syncLine=`<div class="ts dim">${ico('gear',14)} ทรัพยากร: HP ${Math.round(G.hp)}/${S.maxHP} · MP ${Math.round(G.mp)}/${S.maxMP} · สตามินา ${S.maxSTA}/${S.maxSTA}</div>`;
    return`<h2>${ico('status',22)} ค่าสถานะตัวละคร${G.look&&G.look.name?' — '+G.look.name.replace(/[<>&]/g,''):''}</h2><div class="eqg"><div><canvas id="pv" width="220" height="270"></canvas><p><button class="btn sm" data-open="create">🎨 แต่งตัวละคร</button></p>
      <div class="stat"><span>เลเวล</span><b>${G.level}</b><span>แรงค์กิลด์</span><b style="color:${(typeof Guild!=='undefined'&&Guild.registered()?Guild.info().col:'#a8b4c8')}">${typeof Guild!=='undefined'&&Guild.registered()?`Rank ${Guild.rank()} (${Guild.info().n})`:'ยังไม่สมัคร'}</b><span>XP</span><b>${!(typeof hasNoMaxLv==='function'&&hasNoMaxLv())&&G.level>=CONFIG.levelCap?'เลเวลสูงสุด (Lv.'+CONFIG.levelCap+')':G.xp+' / '+CONFIG.xpNext(G.level)+(typeof hasNoMaxLv==='function'&&hasNoMaxLv()?' (∞)':'')}</b><span>พรสวรรค์</span><b>${TALENTS[G.talent].ic} ${TALENTS[G.talent].th}</b><span>ทอง</span><b>${G.gold}</b></div></div>
    <div><h3>ค่าพลังหลัก — แต้มคงเหลือ <span class="pts">${G.points}</span> ${Inv.has('reset')?'<button class="btn ghost sm" data-use="reset">📜 ใช้คัมภีร์ล้างค่าพลัง</button>':''}</h3>${attrs}
      ${this.v2Stats(S)}
      ${S.uniq?`<div class="ts">พาสซีฟเฉพาะตัว: ${SKILLS[S.uniq.skill].n} (${S.uniq.id} ${pct(S.uniq.v)})</div>`:''}
      <h3>บัฟ / ดีบัฟที่ทำงานอยู่</h3>${modsHtml}${syncLine}
      <h3>พาสซีฟพิเศษ</h3>${pas}<h3>ความชำนาญอาวุธ</h3>${mast}</div></div>`;
  },

  /* ---- equipment + inventory ---- */
  itemDet(sel){
    let det='<div class="dim">—</div>';
    if(sel){const sl=Equip.slotFor(sel),cur=G.eq[sl]&&itemByUid(G.eq[sl]),eqd=Equip.isEquipped(sel),ec=Equip.enhanceCost(sel);
      det=itemTip(sel,!eqd&&cur?cur:null)+`<div class="acts">${eqd?`<button class="btn sm" data-uneq="${sel.uid}">ถอด</button>`:`<button class="btn sm" data-eq="${sel.uid}" ${Equip.canEquip(sel)?'':'disabled'}>สวมใส่</button>`}
        <span class="dim">ตีบวก +${sel.enh}/+${Equip.maxEnh(sel)} · ตีบวก / ปรับค่า / วิวัฒน์ / รูน ได้ที่โต๊ะตีเหล็ก (ข้างโบโร)</span>
        ${eqd?'':`<button class="btn ghost sm" data-salv="${sel.uid}">แยกชิ้นส่วน</button>`}${eqd?'':`<span class="dim" style="align-self:center">${ico('coin',14)} ขายได้ที่ร้านค้ามาร์คัสเท่านั้น</span>`}</div>`;}
    return det;
  },
  eqSlot:'weapon',
  scr_equip(){
    const S=StatSync.get(),sel=this.sel&&itemByUid(this.sel),slot=SLOTS.includes(this.eqSlot)?this.eqSlot:'weapon';
    const typ=slot.startsWith('ring')?'ring':slot,cur=G.eq[slot]&&itemByUid(G.eq[slot]);
    const rows=SLOTS.map(s=>{const it=G.eq[s]&&itemByUid(G.eq[s]);return`<button class="eqrow${s===slot?' on':''}" data-slot="${s}" ${it?rb(it.rar):''}><small>${SLOTN[s]}</small><span ${it?rc(it.rar):'class="dim"'}>${it?bIco(it.base,16)+' '+itemName(it):'— ว่าง —'}</span></button>`;}).join('');
    const A=[['พลังโจมตี',S.ap],['DEF',S.def+' (กัน '+pct(1-armorK({level:G.level})/(armorK({level:G.level})+S.def))+')'],['STR',S.str],['AGI',S.agi],['INT',S.int],['VIT',S.vit],['LUK',S.luk],['อัตราคริ',pct(S.critRate)],['HP สูงสุด',S.maxHP],['MP สูงสุด',S.maxMP]].map(([n,v])=>`<div class="eqa"><span>${n}</span><b>${v}</b></div>`).join('');
    const cands=G.bag.filter(it=>BASES[it.base].type===typ&&it.uid!==(cur&&cur.uid)),list=(cur?[cur]:[]).concat(cands).map(it=>`<button class="eqcand${sel&&sel.uid===it.uid?' on':''}" data-sel="${it.uid}" ${rb(it.rar)}>${cur&&it.uid===cur.uid?'<em>สวมอยู่</em>':''}<span ${rc(it.rar)}>${bIco(it.base,16)} ${itemName(it)}</span><b>${wElTag(it.base)?elChip(wElTag(it.base))+' ':''}${RARN[it.rar]} · +${it.enh||0}</b></button>`).join('')||'<div class="dim">ไม่มีอุปกรณ์ชนิดนี้ในช่องเก็บของ</div>';
    return`<h2>${ico('equip',22)} สวมใส่อุปกรณ์ <small class="gold-r">${ico('coin',16)} ${G.gold}</small></h2>
      <div class="eq4"><div class="eqc"><canvas id="pv" width="220" height="270"></canvas><div class="eqn">${pname()}</div><div class="dim">Lv.${G.level} · ${TALENTS[G.talent].th}</div>
          <div class="sb"><span>HP</span><div class="mbar"><i style="width:${Math.min(100,G.hp/Math.max(1,S.maxHP)*100)}%;background:#b8413a"></i></div><b>${Math.round(G.hp)}/${S.maxHP}</b></div>
          <div class="sb"><span>MP</span><div class="mbar"><i style="width:${Math.min(100,G.mp/Math.max(1,S.maxMP)*100)}%;background:#3a7ac8"></i></div><b>${Math.round(G.mp)}/${S.maxMP}</b></div></div>
        <div class="eqp"><h3>ค่าสถานะ</h3>${A}</div>
        <div class="eqp"><h3>อุปกรณ์</h3>${rows}<div class="acts"><button class="btn sm" data-open="bag">${ico('bag',14)} ช่องเก็บของ (${kbName('bag')})</button></div></div>
        <div class="eqp"><h3>เปลี่ยนเป็น · ${SLOTN[slot]}</h3><div class="eqlist">${list}</div><div class="detail">${this.itemDet(sel)}</div></div></div>`;
  },


  /* ---- ช่องเก็บของ (v0.2.5): แท็บแบบหน้า Items — Q/E สลับแท็บ ---- */
  bagTab:'use',selMat:null,
  BAGTABS:[['use','potion','ของใช้'],['weapon','sword','อาวุธ'],['armor','plate','เกราะ'],['acc','ring','เครื่องประดับ'],['mat','ore','วัตถุดิบ'],['key','key','ของสำคัญ']],
  bagItems(tab){
    const matIs=k=>{const m=MATS[k];return m.key?'key':(m.scroll||m.use||m.manaPotion)?'use':'mat';};
    if(tab==='use'||tab==='mat'||tab==='key')return Object.keys(G.mats).filter(k=>G.mats[k]>0&&matIs(k)===tab).map(k=>({mat:k}));
    const T={weapon:['weapon'],armor:['helmet','armor','pants','boots'],acc:['ring','necklace','belt','gloves']}[tab]||[];
    return Inv.sorted(G.bag.filter(it=>T.includes(BASES[it.base].type)),this.filt.sort).map(it=>({gear:it}));},
  bagStep(d){const ks=this.BAGTABS.map(t=>t[0]),i=ks.indexOf(this.bagTab);this.bagTab=ks[(i+d+ks.length)%ks.length];this.sel=null;this.selMat=null;SFX.ui('cursor');this.rerender();},
  matDet(k){
    if(!k||!MATS[k]||!(G.mats[k]>0))return'<div class="dim">คลิกเลือกรายการทางซ้ายเพื่อดูรายละเอียด</div>';
    const m=MATS[k],mr=matRar(k),usable=m.scroll||m.use||m.manaPotion;
    const cat=m.key?'ของสำคัญ':m.use==='learn'?'ตำราสกิล':m.scroll?'คัมภีร์สูตรตีเหล็ก':m.rune?'รูนสวมใส่':m.booster?'คริสตัลเสริมคราฟต์':m.use==='buff'?'ยาบัพ':m.manaPotion||m.use==='potion'?'ยาฟื้นฟู':m.use?'ไอเทมใช้งาน':'วัตถุดิบ';
    let lines=[];
    if(m.desc)lines.push(m.desc);
    if(m.manaPotion)lines.push(`ฟื้นฟู MP +${m.manaPotion} (ใช้จากกระเป๋า หรือกด [R] ในการต่อสู้ · คูลดาวน์ 10 วิ)`);
    if(m.use==='learn'&&m.skillBook&&SKILLS[m.skillBook]){
      const s=SKILLS[m.skillBook],cost=s.tier==='ultimate'?CONFIG.ult.cost+' เกจท่าไม้ตาย':s.type==='passive'?'พาสซีฟ':Mana.cost(m.skillBook,Stats.player())+' MP';
      lines.push(`<b>${s.n}</b> [${TIERN[s.tier]}] ${skEl(s)} · ใช้ ${cost} · คูลดาวน์ ${s.cd} วิ`);
      lines.push(s.desc);
      lines.push(G.skills.learned.has(m.skillBook)?'<span class="good">✔ เรียนสกิลนี้แล้ว</span>':'<span class="tu">ยังไม่ได้เรียน — กดใช้เพื่อเรียนรู้</span>');
    }
    if(m.scroll){
      const ids=[].concat(m.scroll);
      ids.forEach(rid=>{const r=RECIPES.find(x=>x.id===rid);if(r)lines.push(`ปลดล็อกเบาะแสสูตร: <b>${recipeName(r)}</b> (${r.clue}) ${Craft.clueKnown(r)?'<span class="good">✔ จดแล้ว</span>':''}`);});
    }
    if(m.use==='reset')lines.push('รีเซ็ตแต้มค่าพลังหลัก (STR / AGI / INT / VIT / LUK) ทั้งหมดคืนเป็นแต้มคงเหลือ');
    if(k==='ore'&&!m.desc)lines.push('ใช้สำหรับตีบวกอาวุธและอุปกรณ์ที่โต๊ะตีเหล็ก (เริ่มที่ 3 ก้อน/ครั้ง) และใช้คราฟต์ตามสูตร');
    if(!lines.length){
      const usedIn=RECIPES.filter(r=>r.mats[k]&&Craft.clueKnown(r)).map(r=>recipeName(r));
      lines.push(usedIn.length?`ใช้คราฟต์สูตร: ${usedIn.join(', ')}`:'วัตถุดิบสำหรับสร้างอุปกรณ์ที่โต๊ะตีเหล็ก');
    }
    const price=Inv.matPrice(k);
    return`<div class="tip"><div class="tn" ${rc(mr)}>${mIco(k,16)} ${m.n}</div>
      <div class="ts">${RARN[mr]} · ${cat} · มีอยู่ <b>×${G.mats[k]}</b></div>
      <div style="margin:8px 0;line-height:1.55">${lines.map(t=>`<div>${t}</div>`).join('')}</div>
      <div class="acts">${usable?`<button class="btn sm" data-use="${k}">ใช้</button>`:''}${price>0?`<span class="dim" style="align-self:center">${ico('coin',14)} ราคาขาย ${price} ทอง/ชิ้น (ร้านค้ามาร์คัส)</span>`:''}</div></div>`;
  },
  scr_bag(){
    const tab=this.bagTab,list=this.bagItems(tab),sel=this.sel&&itemByUid(this.sel),isGear=['weapon','armor','acc'].includes(tab);
    const tabs=this.BAGTABS.map(([k,ic,n])=>`<button class="bgt${k===tab?' on':''}" data-bagtab="${k}" title="${n}">${ico(ic,22)}${k===tab?`<span>${n}</span>`:''}<i>${this.bagItems(k).length||''}</i></button>`).join('');
    const rows=list.map(o=>{
      if(o.mat){const k=o.mat,m=MATS[k],mr=matRar(k);
        return`<button class="brow it${this.selMat===k?' sel':''}" data-selmat="${k}" style="border-color:${RARC[mr]};border-left-width:3px"><span class="bn">${mIco(k,20)} <span ${rc(mr)}>${m.n}</span></span><b class="bq">× ${G.mats[k]}</b></button>`;}
      const it=o.gear,eqd=Equip.isEquipped(it);
      return`<button class="brow it${this.sel===it.uid?' sel':''}" data-sel="${it.uid}" style="border-color:${RARC[it.rar]};border-left-width:3px"><span class="bn">${bIco(it.base,20)} <span ${rc(it.rar)}>${itemName(it)}</span></span><small class="bq">${wElTag(it.base)?elChip(wElTag(it.base))+' ':''}${RARN[it.rar]} · +${it.enh||0}${eqd?' · <b class="good">สวมอยู่</b>':''}</small></button>`;}).join('')||'<div class="dim" style="padding:14px">ไม่มีไอเท็มในหมวดนี้</div>';
    const eqCnt=`<span class="${G.bag.length>=LOOT_CONFIG.inventory.equipSlots?'bad':''}">${G.bag.length}/${LOOT_CONFIG.inventory.equipSlots}</span>`;
    const detail=isGear?this.itemDet(sel&&list.some(o=>o.gear===sel)?sel:null):this.matDet(list.some(o=>o.mat===this.selMat)?this.selMat:null);
    return`<h2>${ico('bag',22)} ช่องเก็บของ <small class="dim">ทอง ${G.gold} · ช่องอุปกรณ์ ${eqCnt}</small></h2>
      <div class="bgbar"><kbd>Q</kbd><span class="bgar">‹</span><div class="bgtabs">${tabs}</div><span class="bgar">›</span><kbd>E</kbd></div>
      <div class="bgbody two"><div class="blist">${rows}</div><div class="detail">${detail}</div></div>`;
  },
  /* ---- skills ---- */
  /* ---- skill rune sockets ---- */
  sk:{sel:0,modal:null,pick:null,cand:null},
  skStats(id){const s=SKILLS[id],sc=Skills.scale(id),lv=Skills.level(id);
    if(s.type==='passive')return`<div class="skst"><span>ผล <b>${s.desc.replace('พาสซีฟ: ','')}</b> ×${sc.coef.toFixed(2)}</span><span>ใช้ <b>ไม่ใช้ MP</b></span><span>เลเวล <b>${lv}</b></span></div>`;
    const dmg=s.coef?`${Math.round(s.coef*sc.coef*100)}% ATK${s.multi?` (${s.multi} ฮิต)`:''}`:'—';
    return`<div class="skst"><span>ธาตุ <b>${skEl(s)}</b></span><span>ดาเมจ <b>${dmg}</b></span><span>คูลดาวน์ <b>${(s.cd*sc.cd).toFixed(1)} วิ</b></span><span>ใช้ <b>${s.tier==='ultimate'?CONFIG.ult.cost+' เกจท่าไม้ตาย':s.type==='passive'?'ไม่ใช้ (พาสซีฟ)':Mana.cost(id,Stats.player())+' MP'+(s.hpCost?' + '+(s.hpCost*100)+'% HP':'')}</b></span>
      <span>ระยะ <b>${s.range}</b></span><span>ต่อคอมโบ <b>${s.combo?'ได้':'ไม่ได้'}</b></span><span>ท่า <b>${s.anim}</b></span><span>เลเวล <b>${lv}</b></span></div>`;},
  scr_skills(){
    /* หน้าสกิล (สไตล์หน้าสวมใส่อุปกรณ์): ช่องสกิล 5 ช่อง (1–3 ทั่วไป/หายาก · 4 เฉพาะตัว · 5 สุดยอด) */
    const K=G.skills,T=this.sk,S=StatSync.get();if(T.sel==null||T.sel<0||T.sel>4)T.sel=0;
    const i=T.sel,cur=K.slots[i],TC={common:'#a8c4e4',rare:'#52b8ff',unique:'#e27aff',ultimate:'#ffd98a'};
    const rows=K.slots.map((id,j)=>{const s=id&&SKILLS[id],lockd=j===3&&K.bound,up=id&&j===3&&Skills.upgradeInfo(id).can;
      return`<button class="eqrow skrow${j===i?' on':''}" data-ssock="${j}" style="border-left:3px solid ${s?TC[s.tier]:'rgba(255,255,255,.14)'}"><small>ช่อง ${j+1} · ${slotTierName(j)}</small><span ${s?`style="color:${TC[s.tier]}"`:'class="dim"'}>${s?sIco(s,16)+' '+s.n+(s.el&&s.coef?' '+skEl(s):'')+` <small class="dim">Lv.${Skills.level(id)}</small>`:(j===3&&!K.bound?'— ว่าง (รอผนึก) —':'— ว่าง —')}${lockd?' 🔒':''}${up?' <b class="good">⬆</b>':''}</span></button>`;}).join('');
    // รายการสกิลที่ใส่ช่องนี้ได้ (เฉพาะที่เรียนแล้ว)
    const cands=[...K.learned].filter(k=>skillUsable(k,'player')&&(i===3?SKILLS[k].tier==='unique':slotAccepts(i,k)))
      .sort((a,b)=>(b===cur)-(a===cur)||TIERS.indexOf(SKILLS[b].tier)-TIERS.indexOf(SKILLS[a].tier)||SKILLS[a].n.localeCompare(SKILLS[b].n));
    if(!T.cand||!cands.includes(T.cand))T.cand=cur&&cands.includes(cur)?cur:cands[0]||null;
    const list=cands.map(k=>{const s=SKILLS[k],o=K.slots.indexOf(k);
      return`<button class="eqcand${T.cand===k?' on':''}" data-skpick="${k}" style="border-left:3px solid ${TC[s.tier]}"><span style="color:${TC[s.tier]}">${sIco(s,16)} ${s.n} ${s.el&&s.coef?skEl(s):''} ${o===i?'<em style="white-space:nowrap">ใส่อยู่</em>':o>=0?`<em class="dim" style="white-space:nowrap">ช่อง ${o+1}</em>`:''}</span><b>${TIERN[s.tier]} · Lv.${Skills.level(k)}</b></button>`;}).join('')
      ||`<p class="dim">ยังไม่มีสกิลที่ใส่ช่องนี้ได้ — หาตำราสกิล (${slotTierName(i)}) จากการปราบมอนสเตอร์</p>`;
    // รายละเอียด + ปุ่มคำสั่งของสกิลที่เลือก
    let det='<p class="dim">เลือกสกิลจากรายการด้านบน</p>';const c=T.cand&&SKILLS[T.cand];
    if(c){const k=T.cand,o=K.slots.indexOf(k);let act='';
      if(i===3){
        if(!K.bound)act=`<button class="btn sm" data-skbind="${k}">🔒 ผนึกถาวร</button><div class="warn">⚠ สกิลเฉพาะตัวจะถูกผนึกกับตัวละครอย่างถาวร ถอดหรือเปลี่ยนไม่ได้ ยกเว้นใช้ 🗝️ ตราทำลายผนึกเฉพาะตัว</div>`;
        else if(k===K.bound){const u=Skills.upgradeInfo(k),L=u.req?SKILL_UPGRADE.levels[u.next]:null,C2=Skills.scale(k);
          act=`<div class="upbox"><h3>⬆ อัปเกรด <small class="dim">Lv.${Skills.level(k)} / ${SKILL_UPGRADE.maxLevel}</small></h3>
          ${u.max?'<div class="good">เลเวลสูงสุดแล้ว</div>':u.req?`<div>Lv.${u.next}: ดาเมจ ×${C2.coef.toFixed(2)} → <b class="good">×${L.coef.toFixed(2)}</b> · คูลดาวน์ ×${C2.cd.toFixed(2)} → <b class="good">×${L.cd.toFixed(2)}</b></div>
            <div>ใช้: ${Object.entries(u.req.mats).map(([m,q])=>`<span class="${(G.mats[m]||0)>=q?'good':'bad'}">${mIco(m,14)} ${MATS[m].n} ${G.mats[m]||0}/${q}</span>`).join(' · ')} · <span class="${u.goldShort?'bad':'good'}">🪙 ${G.gold}/${u.req.gold}</span></div>
            <button class="btn sm" data-skup="${k}" ${u.can?'':'disabled'}>⬆ อัปเกรดเป็น Lv.${u.next}</button>`:`<div class="dim">${u.reason}</div>`}</div>`;}
        else{const nb=G.mats[SEAL_BREAKER.item]||0;act=`<button class="btn ghost sm" data-skrep="${k}" ${nb?'':'disabled'}>🗝️ เปลี่ยนเป็นสกิลนี้ (ตรา ×${nb})</button>${nb?'':'<div class="dim">ต้องมีตราทำลายผนึกเฉพาะตัวจึงจะเปลี่ยนได้</div>'}`;}
      }else if(o===i)act=`<button class="btn ghost sm" data-skun="${i}">ถอดออก</button>`;
      else act=`<button class="btn sm" data-skeq="${k}" data-slot="${i}">${o>=0?`ย้ายจากช่อง ${o+1} มาช่องนี้`:cur?'แทนที่':'ติดตั้ง'}</button>`;
      det=`<h3 style="color:${TC[c.tier]}">${sIco(c,20)} ${c.n} <small class="dim">[${TIERN[c.tier]}]</small> ${skEl(c,true)}</h3><div class="dim">${c.desc}</div>${this.skStats(k)}<div class="acts">${act}</div>`
        +(i===4?'<div class="dim">สกิลสุดยอดใช้เกจท่าไม้ตาย 100 (ไม่ใช้ MP)</div>':'');}
    const panel=`<div class="eq4 sk2" style="grid-template-columns:minmax(280px,40%) 1fr">
        <div class="eqp"><h3>สกิลที่ติดตั้ง</h3>${rows}<div class="dim skhint">ช่อง 1–3 ใส่ได้ทั้งสกิลทั่วไปและหายาก · ช่อง 4 เฉพาะตัว · ช่อง 5 สุดยอด</div></div>
        <div class="eqp"><h3>เปลี่ยนเป็น · ช่อง ${i+1}</h3><div class="eqlist">${list}</div><div class="detail">${det}</div></div></div>`;
    let modal='';
    if(T.modal==='bind'){const s=SKILLS[T.pick];modal=`<div class="cmodal"><div class="cbox"><h3>🔒 ยืนยันการผนึกถาวร</h3><p>ผนึก <b>${sIco(s)} ${s.n}</b> เข้ากับตัวละครนี้ <b class="bad">อย่างถาวร</b></p>
      <p>หลังผนึก จะถอด เปลี่ยน หรือโอนสกิลนี้ไม่ได้ ยกเว้นใช้ 🗝️ ตราทำลายผนึกเฉพาะตัว — แต่ยังอัปเกรดได้ตลอด</p>
      <div class="acts"><button class="btn" data-skbindyes="1" autofocus>ยืนยัน ผนึกถาวร</button><button class="btn ghost" data-skno="1">ยกเลิก</button></div></div></div>`;}
    if(T.modal==='replace'){const s=SKILLS[T.pick],o=SKILLS[K.bound];modal=`<div class="cmodal"><div class="cbox"><h3>🗝️ ยืนยันการปลดผนึก</h3>
      <p>ใช้ 🗝️ ตราทำลายผนึกเฉพาะตัว ×1 เพื่อเปลี่ยน <b>${sIco(o)} ${o.n}</b> (Lv.${Skills.level(K.bound)}) → <b>${sIco(s)} ${s.n}</b> (Lv.${Skills.level(T.pick)})</p>
      <p>สกิลเดิมและเลเวลอัปเกรดจะถูกเก็บไว้ในคลัง · สกิลใหม่จะถูกผนึกถาวรทันที · ตราจะถูกใช้เมื่อกดยืนยันเท่านั้น</p>
      <div class="acts"><button class="btn" data-skrepyes="1" autofocus>ยืนยัน ใช้ตราและเปลี่ยน</button><button class="btn ghost" data-skno="1">ยกเลิก</button></div></div></div>`;}
    return`<h2>${ico('skill',22)} สกิล <small class="gold-r">${ico('coin',16)} ${G.gold}</small></h2>${panel}${modal}`;
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
        <div class="qrow"><button class="btn ghost sm" data-cq="${i}" data-d="-1" ${busy?'disabled':''} aria-label="ลด">−</button><span class="${(G.mats[s.id]||0)<this.csInSlots(s.id)?'bad':''}">×${s.q}</span><button class="btn ghost sm" data-cq="${i}" data-d="1" ${busy?'disabled':''} aria-label="เพิ่ม">+</button><button class="btn ghost sm" data-cq="${i}" data-d="5" ${busy?'disabled':''} aria-label="เพิ่ม 5">+5</button></div>
        <button class="cx" data-cx="${i}" ${busy?'disabled':''} aria-label="เอาออก">✕</button></div>`
      :`<div class="cslot"><span class="plus">+</span><small>ช่อง ${i+1}</small></div>`).join('');
    const boostKey=Craft.boosterId(C.boost),boostAmt=Craft.boostAmt(C.boost);
    const crystOpts=[['',`ไม่ใช้คริสตัล`,0,1],['cryst_durable',`${MATS.cryst_durable.n} (+10%)`,.10,G.mats.cryst_durable||0],['cryst_great',`${MATS.cryst_great.n} (+15%)`,.15,G.mats.cryst_great||0],['divine',`${MATS.divine.n} (+20%)`,.20,G.mats.divine||0]];
    if(boostKey&&(G.mats[boostKey]||0)<=0)C.boost=false;
    const boost=`<div class="cboost-row"><div class="dim" style="margin-bottom:4px">💎 คริสตัลเสริมโอกาสคราฟต์ (ใช้กับคราฟต์เท่านั้น):</div><div class="acts">`+crystOpts.map(([id,lbl,amt,cnt])=>{
      const on=(boostKey||'')===id;
      return`<button class="btn sm ${on?'':'ghost'}" data-boost="${id}" ${busy||(id&&cnt<=0)?'disabled':''}>${id?mIco(id,14)+' ':''}${lbl}${id?` (${cnt})`:''}</button>`;
    }).join('')+`</div></div>`;
    let prev;
    if(busy)prev=`<div class="cres forging"><div class="anvil">${ico('craft',36)}</div><div class="big">กำลังตีเหล็ก...</div></div>`;
    else if(C.phase==='success'){const x=C.res;prev=`<div class="cres win"><div class="big good">✨ ตีเหล็กสำเร็จ!</div><small class="dim">โอกาส ${pct(x.chance)} · สุ่มได้ ${x.roll.toFixed(3)}</small>${x.item?itemTip(x.item):`<div class="big">${mIco(x.mat,14)} ${MATS[x.mat].n} ×${x.q}</div>`}</div>`;}
    else if(C.phase==='fail'){const x=C.res;prev=`<div class="cres lose"><div class="big bad">💥 ตีเหล็กล้มเหลว</div><small class="dim">โอกาส ${pct(x.chance)} · สุ่มได้ ${x.roll.toFixed(3)}</small>
      <div>วัตถุดิบที่เสียไป: ${Object.entries(x.lost).map(([k,q])=>mIco(k,14)+' '+MATS[k].n+' ×'+q).join(', ')}</div><div class="dim">ไม่ได้อุปกรณ์</div></div>`;}
    else if(r){const base=Craft.base(r),fin=Craft.chance(r,C.boost),out=r.out.base?BASES[r.out.base]:MATS[r.out.mat];
      prev=`<div class="cres match" style="border-color:${RARC[r.rar]}"><div class="rico">${r.out.base?bIco(r.out.base,30):mIco(r.out.mat,30)}</div><div class="tn" ${rc(r.rar)}>${recipeName(r)} ${Craft.discovered(r)?'':'<span class="newr">สูตรใหม่!</span>'}</div>
        <div class="ts">ความหายาก <b ${rc(r.rar)}>${r.out.base&&!BASES[r.out.base].fixRar?`สุ่ม (${RARN[r.rar]} ขึ้นไป · สูงสุด ${RARN[CONFIG.maxRarity]})`:RARN[r.rar]}</b>${r.out.base?` · ${SLOTN[BASES[r.out.base].type]} ·  <span class="dim">เริ่ม +0 · ค่าความสามารถสุ่ม</span>`:''}</div>
        <div class="ts">ใช้: ${Object.entries(r.mats).map(([k,q])=>`<span class="${(G.mats[k]||0)>=q?'':'bad'}">${mIco(k,14)} ${MATS[k].n} ×${q} (มี ${G.mats[k]||0})</span>`).join(' · ')}${r.gold?` · <span class="${G.gold>=r.gold?'':'bad'}">🪙 ทอง ×${r.gold} (มี ${G.gold})</span>`:''}</div>
        <div class="chance"><span>โอกาสสำเร็จ</span><b>${pct(base)}</b>${boostKey?` <span class="good">+ ${mIco(boostKey,12)} ${pct(boostAmt)}</span> = <b class="good">${pct(fin)}</b>`:''}</div>
        <div class="bar2"><i style="width:${fin*100}%;background:${RARC[r.rar]}"></i></div>
        ${chk.short?`<div class="bad">ขาด: ${chk.short.map(x=>`${MATS[x.id].n} อีก ${x.need-x.have}`).join(', ')}</div>`:!chk.ok&&chk.err?`<div class="bad">${chk.err}</div>`:''}
        <div class="dim">ล้มเหลว = เสียวัตถุดิบทั้งหมด${boostKey?' และคริสตัล':''} และไม่ได้อุปกรณ์</div></div>`;}
    else if(!empty){const hs=Craft.hints(C.slots);prev=`<div class="cres none"><div class="big">❔ ส่วนผสมนี้ไม่ตรงกับสูตรใด</div>`+
      (hs.length?hs.slice(0,3).map(h=>`<div>ใกล้เคียง <b ${rc(h.r.rar)}>${recipeName(h.r)}</b> — ยังขาด ${h.missing.map(m=>mIco(m.id,14)+MATS[m.id].n+' ×'+m.q).join(', ')}</div>`).join(''):'<div class="dim">ลองปรับสัดส่วนวัตถุดิบดูใหม่อีกครั้ง</div>')+`</div>`;}
    else prev=`<div class="cres none"><div class="big dim">⚔️ ผลลัพธ์การคราฟต์</div><div class="dim">คลิกวัตถุดิบทางขวาเพื่อวางลงช่อง (ระดับของอุปกรณ์สุ่มตามสูตร · เพดานตามแรงค์กิลด์)</div></div>`;
    const bag=Object.keys(G.mats).filter(k=>!MATS[k].scroll&&!MATS[k].booster&&!MATS[k].use).map(k=>{const left=G.mats[k]-this.csInSlots(k),mr=matRar(k);
      return`<button class="it" data-cadd="${k}" ${left>0&&!busy?'':'disabled'} ${rb(mr)}><span class="ic">${mIco(k,14)}</span><span ${rc(mr)}>${MATS[k].n}</span><br><small>เหลือ ${left}/${G.mats[k]}${MATS[k].rareMat?' · <b class="tu">หายาก</b>':''}</small></button>`;}).join('')||'<div class="dim">ไม่มีวัตถุดิบ</div>';
    const can=chk.ok&&!busy;
    const T=this.craftTab||'make';
    const ctabs=`<div class="ctabs">`
      +`<button class="btn ${T==='make'?'':'ghost'} sm" data-ctab="make">${ico('craft',14)} คราฟต์</button>`
      +`<button class="btn ${T==='afx'?'':'ghost'} sm" data-ctab="afx">${ico('gem',14)} ปรับค่าความสามารถ</button>`
      +`<button class="btn ${T==='enh'?'':'ghost'} sm" data-ctab="enh">${ico('sword',14)} ตีบวก</button>`
      +`<button class="btn ${T==='evo'?'':'ghost'} sm" data-ctab="evo">${ico('crown',14)} วิวัฒน์</button>`
      +`<button class="btn ${T==='rune'?'':'ghost'} sm" data-ctab="rune">${ico('gem',14)} ใส่รูน</button>`
      +`</div>`;
    if(T==='afx')return`<h2>${ico('craft',22)} โต๊ะตีเหล็ก — ปรับค่าความสามารถ <small class="dim">${['rerollstone','philostone','pickstone','tierstone'].map(k=>`${MATS[k].n} ${G.mats[k]||0}`).join(' · ')} · ทอง ${G.gold}</small></h2>${ctabs}`+this.afxPanel();
    if(T==='enh')return`<h2>${ico('craft',22)} โต๊ะตีเหล็ก — ตีบวก <small class="dim">ทอง ${G.gold} · แร่เหล็ก ${G.mats.ore||0} · หินเสริมพลัง ${G.mats.exprock||0} · สูงสุด +${GEAR.enhMax}</small></h2>${ctabs}`+this.enhList();
    if(T==='evo')return`<h2>${ico('craft',22)} โต๊ะตีเหล็ก — วิวัฒน์อุปกรณ์ <small class="dim">หินวิวัฒน์ ${G.mats.evostone||0} ก้อน · ต้องตีบวก +${GEAR.enhMax}</small></h2>${ctabs}`+this.evoList();
    if(T==='rune')return`<h2>${ico('craft',22)} โต๊ะตีเหล็ก — รูน <small class="dim">สว่านรูน ${G.mats.runedrill||0} ชิ้น · เลือกรูนแล้วคลิกช่องที่เปิดแล้ว</small></h2>${ctabs}`+this.runeList();
    return`<h2>${ico('craft',22)} โต๊ะตีเหล็ก — คราฟต์ <small class="dim">สำเร็จ ${G.stats.craftOk}/${G.stats.crafts} ครั้ง · ทอง ${G.gold} · ระดับสุ่ม (เพดาน ${RARN[rarCap()]} ตามแรงค์)</small></h2>${ctabs}`+
    `<div class="cgrid"><div><div class="cslots">${slots}</div>${boost}<div class="carrow">↓</div>${prev}
      <div class="acts"><button class="btn" data-cgo="1" ${can?'':'disabled'}>⚒️ ${busy?'กำลังตีเหล็ก...':'เริ่มคราฟต์'+(chk.ok?` (${pct(chk.chance)})`:'')}</button>
        <button class="btn ghost" data-cclear="1" ${busy?'disabled':''}>ล้างช่อง</button><button class="btn ghost" data-ccancel="1" ${busy?'disabled':''}>ปิด</button></div></div>
    <div><h3>กระเป๋าวัตถุดิบ (คลิกเพื่อวาง)</h3><div class="inv craft-inv">${bag}</div></div></div>
    ${C.confirm&&chk.ok?`<div class="cmodal"><div class="cbox"><h3>ยืนยันการตีเหล็ก</h3><p>จะใช้: ${Object.entries(chk.recipe.mats).map(([k,q])=>`${mIco(k,14)} ${MATS[k].n} ×${q}${MATS[k].rareMat?' <b class="tu">(หายาก)</b>':''}`).join(', ')}${chk.recipe.gold?', 🪙 ทอง ×'+chk.recipe.gold:''}${boostKey?', '+mIco(boostKey,14)+' '+MATS[boostKey].n+' ×1':''}</p>
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
        if(G.stats.crafts===1&&!(G.flags&&G.flags.boroFirstCraftSay))G.flags.pendingBoroCraftDlg=1;
        if(r.item&&BASES[r.item.base].type==='weapon'&&G.q.main1.step===1){Quest.advance('main1',2);if(!G.eq.weapon)Equip.equip(r.item);}}
      else if(r.failed){C.phase='fail';C.res=r;SFX.fail();if(G.stats.crafts===1&&!(G.flags&&G.flags.boroFirstCraftSay))G.flags.pendingBoroCraftDlg=1;}
      else{C.phase='idle';toast(r.err);}
      if(this.cur==='craft')this.rerender();this.hud();},1100);
    return true;
  },
  /* ---- ร้านค้า (ซื้อ / ขาย) ---- */
  shopTab:'buy',bulkArm:null,sellSel:new Set(),
  scr_shop(){const T=this.shopTab==='sell'?'sell':'buy',tab=(k,l)=>`<button class="btn ${T===k?'':'ghost'} sm" data-shoptab="${k}">${l}</button>`;
    const isGuildShop = Z && Z.id === 'in_guild';
    const keeper = isGuildShop ? 'คลังเสบียงกิลด์ (ทริสตัน)' : 'ร้านค้ามาร์คัส';
    const quote = isGuildShop ? 'เตรียมยาและเสบียงให้พร้อมก่อนรับภารกิจจากกระดานเควสต์!' : 'ยินดีต้อนรับสู่ร้านค้าคอลลาวาร์รี ซื้อเสบียงหรือนำของจากถ้ำมาขายให้ข้าได้เลย!';
    const head=`<h2>${ico('coin',22)} ${keeper} <small class="dim">ทอง ${G.gold}</small></h2><p class="dim" style="margin:2px 0 8px">"${quote}"</p><div class="acts">${tab('buy','ซื้อ')}${tab('sell','ขาย')}</div>`;
    if(T==='buy'){const items=[['mp_s',50],['mp_m',90],['mp_l',170],['mp_x',340],['potion',150]];
      const spec=SPECIAL_SHOP.map(def=>{
        const id=def.id,st=SpecialShop.state(id),m=MATS[id]||{n:id,d:''},mr=matRar(id);
        const cdTxt=st.cdMs>0?` · รีสต็อก ${SpecialShop.fmtCD(st.cdMs)}`:'';
        return`<button class="it" data-sbuy="${id}" ${G.gold>=st.def.price&&st.left>0?'':'disabled'} ${rb(mr)}><span class="ic">${mIco(id,18)}</span><span ${rc(mr)}>${m.n}</span><br><small>${st.def.price} ทอง · คงเหลือ ${st.left}/${st.max}${cdTxt}</small></button>`;
      }).join('');
      return head+`<div class="inv">`+items.map(([k,c])=>{const mr=matRar(k);return`<button class="it" data-buy="${k}" data-cost="${c}" ${G.gold>=c?'':'disabled'} ${rb(mr)}><span class="ic">${mIco(k,18)}</span><span ${rc(mr)}>${MATS[k].n}</span><br><small>${c} ทอง · มี ${G.mats[k]||0}</small></button>`;}).join('')+`</div>`
        +`<h3 style="margin:12px 0 6px">สินค้าพิเศษ <small class="dim">(จำกัดจำนวน · รีสต็อกอัตโนมัติ · ไม่ดรอปจากมอนสเตอร์)</small></h3><div class="inv">${spec}</div>`
        +`<p class="dim">ยามานาใช้ในการต่อสู้ด้วยปุ่ม R (คูลดาวน์ 10 วินาที) · อาวุธและชุดเกราะซื้อได้ที่ร้านตีเหล็ก</p>`;}
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
    const rows=gear.map(it=>`<div class="srow sel${SS.has('i:'+it.uid)?' on':''}" ${rb(it.rar)}>${cb('i:'+it.uid)}<span class="ic" style="color:${RARC[it.rar]}">${bIco(it.base,18)}</span><span ${rc(it.rar)}>${itemName(it)}</span><small class="dim">${SLOTN[BASES[it.base].type]} · ${RARN[it.rar]} +${it.enh||0}</small><button class="btn sm" data-sell="${it.uid}">${this.sellArm===it.uid?'ยืนยันขาย':'ขาย'} ${Inv.sellPrice(it)} ทอง</button></div>`).join('')||'<div class="dim">ไม่มีอุปกรณ์ที่ขายได้ (ของที่สวมอยู่ขายไม่ได้)</div>';
    const mk=Object.keys(G.mats).filter(k=>MATS[k]&&Inv.matPrice(k)>0);
    const junk=mk.filter(k=>Inv.isJunkMat(k)),jsum=junk.reduce((s,k)=>s+Inv.matPrice(k)*G.mats[k],0);
    const mrows=mk.map(k=>`<div class="srow sel${SS.has('m:'+k)?' on':''}">${cb('m:'+k)}<span class="ic">${mIco(k,16)}</span><span>${MATS[k].n} <b>×${G.mats[k]}</b></span><small class="dim">${Inv.matPrice(k)} ทอง/ชิ้น</small><span><button class="btn ghost sm" data-sellmat="${k}" data-q="1">ขาย 1</button> <button class="btn ghost sm" data-sellmat="${k}" data-q="all">${arm('m:'+k,'ขายหมด')} ${Inv.matPrice(k)*G.mats[k]}</button></span></div>`).join('')||'<div class="dim">ไม่มีวัตถุดิบ</div>';
    return head+selBar+`<h3>อุปกรณ์ <small class="dim">ราคาขาย = ครึ่งหนึ่งของค่าแยกชิ้นส่วน · ต้องกดสองครั้งเพื่อยืนยัน</small></h3>${bulk}<div class="slist">${rows}</div>
      <h3>วัตถุดิบ / ของใช้</h3>${junk.length?`<div class="acts"><button class="btn sm" data-selljunk="1">${arm('junk','ขายวัตถุดิบทั่วไปทั้งหมด')} (${jsum} ทอง)</button> <small class="dim">ไม่รวมตำราสกิล ยา และวัตถุดิบหายาก</small></div>`:''}<div class="slist">${mrows}</div>`;},
  /* ---- ร้านตีเหล็ก ---- */
  smTab:'buy',
  SMITH_STOCK:[['be_rope',80],['w_club',60],['w_sword',150],['w_spear',150],['h_leather',60],['h_iron',140],['a_leather',120],['g_leather',60],['g_iron',140],['p_leather',80],['b_iron',140],['r_copper',100],['n_fang',100]],
  scr_smithy(){const T=this.smTab,tab=(k,l)=>`<button class="btn ${T===k?'':'ghost'} sm" data-smtab="${k}">${l}</button>`;
    const full=G.bag.length>=LOOT_CONFIG.inventory.equipSlots;
    const head=`<h2>${ico('craft',22)} ร้านตีเหล็กโบโร <small class="dim">ทอง ${G.gold} · แร่เหล็ก ${G.mats.ore||0} · กระเป๋า ${G.bag.length}/${LOOT_CONFIG.inventory.equipSlots}</small></h2>
      <div class="acts">${tab('buy','ซื้ออาวุธ / ชุดเกราะ')}<button class="btn ghost sm" data-ctab="enh">${ico('craft',14)} ตีบวก (โต๊ะตีเหล็ก)</button></div>`;
    if(T==='buy'||true)return head+`<div class="inv">`+this.SMITH_STOCK.map(([k,c])=>{const B=BASES[k],r=B.fixRar||'normal';return`<button class="it" data-buygear="${k}" data-cost="${c}" ${G.gold>=c&&!full?'':'disabled'} ${rb(r)}><span class="ic">${bIco(k,18)}</span><span ${rc(r)}>${B.n}</span><br><small>${SLOTN[B.type]} · ${c} ทอง${B.atk?' · ATK '+B.atk:''}${B.def?' · DEF '+B.def:''}</small></button>`;}).join('')+`</div><p class="dim">ของจากร้านเป็นระดับธรรมดา เลเวลเท่าตัวละคร ${full?'· <b class="bad">กระเป๋าเต็ม</b>':''}</p>`;
    return head;},
  runePick:null,
  gearList(){return[...SLOTS.map(s=>G.eq[s]&&itemByUid(G.eq[s])).filter(Boolean),...G.bag.filter(it=>!Equip.isEquipped(it))];},
  /* ---- ตีบวก (ใช้ทอง + แร่เหล็กเท่านั้น — ไม่ใช้คริสตัล) ---- */
  enhList(){
    const list=this.gearList(),cap=Equip.maxEnh(null),nx=Guild.next();
    return`<div class="dim" style="margin-bottom:8px">ตีบวกคือตัวโตหลักของอุปกรณ์ · ทุกขั้นเพิ่มค่าฐาน (ATK/DEF) และค่าความสามารถแบบตัวเลข ${GEAR.enhStep*100}% ของฐาน · เพดานตามแรงค์ <b>+${cap}</b>${nx&&cap<GEAR.enhMax?` (แรงค์ ${GUILD_RANKS.find(k=>k.enhMax>cap).id} ปลด +${GUILD_RANKS.find(k=>k.enhMax>cap).enhMax})`:''} · +${GEAR.enhRockFrom+1} ขึ้นไปใช้หินเสริมพลังเพิ่ม · <b>พลาดไม่ลดขั้น</b></div>
      <div class="flist">`+(list.map(it=>{const c=Equip.enhanceCost(it),e=it.enh||0,mx=e>=cap,R=RARITY[it.rar],b=BASES[it.base],st=b.atk?'ATK':b.def?'DEF':'',bv=b.atk||b.def||0,now=Math.round(bv*R.mult*(1+GEAR.enhStep*e)),nxt=Math.round(bv*R.mult*(1+GEAR.enhStep*(e+1)));
      return`<div class="frow" style="border-color:${RARC[it.rar]}66">
        <div class="frow-main"><span class="ic" style="color:${RARC[it.rar]}">${bIco(it.base,20)}</span>
          <div><div ${rc(it.rar)}><b>${itemName(it)}</b> ${wElTag(it.base)?elChip(wElTag(it.base)):''}${Equip.isEquipped(it)?' <span class="good">[สวมอยู่]</span>':''}</div>
            <div class="dim">${st?`${st} <b>${now}</b>${mx?'':` → <b class="good">${nxt}</b>`} · `:''}${mx?`เต็มเพดาน +${cap}${cap<GEAR.enhMax?' (เลื่อนแรงค์เพื่อตีต่อ)':''}`:`โอกาส <b style="color:#ffd98a">${pct(c.rate)}</b> · <b class="${G.gold>=c.gold?'':'bad'}">${c.gold} ทอง</b> · <b class="${(G.mats.ore||0)>=c.ore?'':'bad'}">แร่ ${G.mats.ore||0}/${c.ore}</b>${c.rock?` · <b class="${(G.mats.exprock||0)>=c.rock?'':'bad'}">หินเสริมพลัง ${G.mats.exprock||0}/${c.rock}</b>`:''}`}</div></div>
        </div>
        <div class="frow-act">${mx?`<span class="good">+${e}</span>`:`<button class="btn sm" data-enh="${it.uid}" ${Equip.canPay(c)?'':'disabled'}>✨ ตีบวก +${e+1}</button>`}</div>
      </div>`;
    }).join('')||'<div class="dim">ไม่มีอุปกรณ์</div>')+`</div>`;
  },
  /* ---- วิวัฒน์ (แยกออกจากใส่รูนชัดเจน ไม่บีบข้อความ) ---- */
  evoList(){
    const list=this.gearList(),stones=G.mats.evostone||0,g=GEAR.cost.evo.gold,cap=Equip.maxEnh(null);
    return`<div class="dim" style="margin-bottom:8px">ต้องตีบวกถึงเพดานแรงค์ <b>+${cap}</b> · ใช้หินวิวัฒน์ ${Object.entries(GEAR.evoCost).map(([r,n])=>RARN[r]+' '+n).join(' / ')} ก้อน + ${g} ทอง · ขึ้นระดับ 1 ขั้น (ไม่เกินเพดานแรงค์ ${RARN[rarCap()]}) · ได้ค่าความสามารถใหม่ 1 ค่า (ตำนาน → เทพ ได้ความสามารถเทพแทน) · ช่องรูนสูงสุดเพิ่ม · <b>ตีบวกคงเดิม</b></div><div class="flist">`+(list.map(it=>{
      const ri=RARS.indexOf(it.rar),nextR=ri<RARS.length-1?RARS[ri+1]:null,enh=it.enh||0,n=Equip.evoCost(it),enhOk=enh>=cap,rkOk=nextR&&Equip.evoAllowed(it),canEvo=Equip.canEvolve(it)&&stones>=n&&G.gold>=g;
      const evoBtn=nextR?`<button class="btn sm" data-evolve="${it.uid}" ${canEvo?'':'disabled'}>🌟 วิวัฒน์ → ${RARN[nextR]}</button>`:`<span class="good">ระดับสูงสุด (${RARN[it.rar]})</span>`;
      return`<div class="frow" style="border-color:${RARC[it.rar]}66">
          <div class="frow-main"><span class="ic" style="color:${RARC[it.rar]}">${bIco(it.base,20)}</span>
            <div><div ${rc(it.rar)}><b>${itemName(it)}</b> ${wElTag(it.base)?elChip(wElTag(it.base)):''}${Equip.isEquipped(it)?' <span class="good">[สวมอยู่]</span>':''}</div>
              <div class="dim">${nextR?`<span class="${enhOk?'good':'bad'}">ตีบวก +${enh}/+${cap}</span> · <span class="${stones>=n?'good':'bad'}">หินวิวัฒน์ ${stones}/${n}</span> · <span class="${G.gold>=g?'good':'bad'}">${g} ทอง</span>${rkOk?'':` · <span class="bad">ต้องเลื่อนแรงค์ก่อน</span>`}`:'เทพเป็นระดับสูงสุด'}</div></div>
          </div>
          <div class="frow-act">${evoBtn}</div>
      </div>`;
    }).join('')||'<div class="dim">ไม่มีอุปกรณ์</div>')+`</div>`;
  },
  /* ---- ปรับค่าความสามารถ: รีค่าทั้งหมด (+ล็อก) · เปลี่ยนค่าที่เลือก (เทียร์สุ่ม) · อัปเทียร์ ---- */
  afIt:null,afSel:-1,afFlash:-1,
  afxPanel(){
    const list=this.gearList();let it=this.afIt&&itemByUid(this.afIt);if(!it||!list.includes(it)){it=list[0]||null;this.afIt=it&&it.uid;this.afSel=-1;}
    if(!it)return'<div class="dim">ไม่มีอุปกรณ์</div>';
    const af=it.affixes||[];if(this.afSel>=af.length)this.afSel=-1;
    const sel=af[this.afSel],C=GEAR.cost,rc2=Gear.rerollCost(it),grpN={off:'⚔ โจมตี',def:'🛡 ป้องกัน',util:'✧ เสริม'},have=k=>G.mats[k]||0;
    const pick=list.map(x=>`<button class="eqcand${x===it?' on':''}" data-afit="${x.uid}" style="border-left:3px solid ${RARC[x.rar]}"><span ${rc(x.rar)}>${bIco(x.base,16)} ${itemName(x)}</span><b>${wElTag(x.base)?elChip(wElTag(x.base))+' ':''}${RARN[x.rar]} · ${(x.affixes||[]).length} ค่า${Equip.isEquipped(x)?' · สวมอยู่':''}</b></button>`).join('');
    const rows=af.map((a,i)=>{const on=i===this.afSel,fl=i===this.afFlash;return`<div class="frow" style="border-color:${on?'#ffe27a':fl?'#5fd38d':'rgba(255,255,255,.12)'}${on?';background:rgba(255,226,122,.08)':fl?';background:rgba(95,211,141,.10)':''}">
        <div class="frow-main" style="width:100%"><button class="btn sm ghost" data-aflock="${i}" title="${a.lock?'ปลดล็อก':'ล็อก: ไม่เปลี่ยนตอนรีค่าทั้งหมด'}">${a.lock?'🔒':'🔓'}</button><button class="eqcand${on?' on':''}" data-afsel="${i}" style="flex:1;margin:0" title="${on?'คลิกอีกครั้งเพื่อยกเลิกเลือก':'คลิกเพื่อเลือก'}"><span><b>${Gear.label(a,it)}</b> ${tierTag(a.t)}</span><b>${grpN[GAFX[a.k].g]}${on?' · ✓ เลือกอยู่':''}</b></button></div></div>`;}).join('')||'<div class="dim">ไม่มีค่าความสามารถ</div>';
    const used=new Set(af.filter((x,i)=>i!==this.afSel).map(x=>x.k));
    const rng=k=>{const A=GAFX[k],v=t=>A.pct?A.t[t]+'%':(A.lv?Math.round(A.t[t]*RARITY[it.rar].mult*(1+GEAR.enhStep*(it.enh||0))):A.t[t]);return`${v(0)}–${v(4)}`;};
    const opts=Gear.pool(it).filter(k=>!used.has(k)).map(k=>`<option value="${k}" ${sel&&sel.k===k?'selected':''}>${GAFX[k].n}${GAFX[k].pct?' %':''} (T1–T5: ${rng(k)})</option>`).join('');
    const why=[];const lacks=(k,n)=>have(k)<n;
    const rollWhy=rc2.locks>=af.length?'ล็อกครบทุกค่าแล้ว':lacks('rerollstone',1)?'หินรีค่าไม่พอ':rc2.locks&&lacks('philostone',rc2.locks)?'ตราล็อกไม่พอ':G.gold<C.reroll.gold?'ทองไม่พอ':'';
    const pickWhy=!sel?'เลือกค่าก่อน':sel.lock?'ค่านี้ถูกล็อก':lacks('pickstone',1)?'ศิลาเลือกค่าไม่พอ':G.gold<C.pick.gold?'ทองไม่พอ':'';
    const tierWhy=!sel?'เลือกค่าก่อน':sel.t>=5?'T5 สูงสุดแล้ว':lacks('tierstone',1)?'หินอัปเทียร์ไม่พอ':G.gold<C.tier.gold?'ทองไม่พอ':'';
    const cost=(k,n,g)=>`<span class="${have(k)>=n?'':'bad'}">${MATS[k].n} ${have(k)}/${n}</span> · <span class="${G.gold>=g?'':'bad'}">${g} ทอง</span>`;
    const btn=(attr,label,w)=>`<button class="btn sm" ${attr} ${w?`disabled title="${w}"`:''}>${label}</button>${w?` <span class="bad" style="font-size:12px">${w}</span>`:''}`;
    return`<div style="display:grid;grid-template-columns:minmax(200px,1fr) 2fr;gap:10px;align-items:start"><div class="eqp"><h3>เลือกอุปกรณ์</h3><div class="eqlist" style="max-height:360px;overflow:auto">${pick}</div></div>
      <div class="eqp"><h3>${itemName(it)} <small ${rc(it.rar)}>${RARN[it.rar]}</small> ${wElTag(it.base)?elChip(wElTag(it.base),1):''}</h3>
        <div class="dim" style="margin-bottom:6px">คลิกค่าเพื่อเลือก · คลิกซ้ำเพื่อยกเลิก · 🔒 = ไม่เปลี่ยนตอนรีค่าทั้งหมด · เทียร์ ${[1,2,3,4,5].map(tierTag).join(' ')}${sel?` · <button class="btn sm ghost" data-afclear="1">✕ ยกเลิกเลือก</button>`:''}</div>${rows}
        <div class="tset" style="margin-top:10px;padding:8px 10px">
          <div class="acts" style="margin:0 0 6px">${btn('data-afroll="1"','🎲 รีค่าทั้งหมด'+(rc2.locks?` (ล็อก ${rc2.locks})`:''),rollWhy)}</div>
          <div class="dim" style="margin-bottom:8px">ใช้ ${cost('rerollstone',1,C.reroll.gold)}${rc2.locks?` · <span class="${have('philostone')>=rc2.locks?'':'bad'}">ตราล็อก (${MATS.philostone.n}) ${have('philostone')}/${rc2.locks}</span>`:''}</div>
          <div class="acts" style="margin:0 0 6px"><select id="afPick" ${sel&&!sel.lock?'':'disabled'} style="max-width:320px">${opts}</select>${btn('data-afpick="1"','🎯 เปลี่ยนค่าที่เลือก',pickWhy)}</div>
          <div class="dim" style="margin-bottom:8px">เทียร์สุ่มใหม่ · ใช้ ${cost('pickstone',1,C.pick.gold)}</div>
          <div class="acts" style="margin:0 0 6px">${btn('data-aftier="1"','✦ อัปเทียร์'+(sel&&sel.t<5?` T${sel.t}→T${sel.t+1} (${Math.round(GEAR.tierUp[sel.t-1]*100)}%)`:''),tierWhy)}</div>
          <div class="dim">พลาดไม่ลด · ใช้ ${cost('tierstone',1,C.tier.gold)}</div>
        </div>
        <div class="detail" style="margin-top:8px">${itemTip(it)}</div></div></div>`;
  },
  /* ---- รูน: เลือกรูนจากคลัง → คลิกช่องที่เปิดแล้ว · ช่องที่ยังไม่เจาะแสดงเป็นแม่กุญแจพร้อมปุ่มเจาะ ---- */
  runeList(){
    const list=this.gearList(),ownedRunes=RUNES.filter(rk=>(G.mats[rk]||0)>0),dg=GEAR.cost.drill.gold,canDrill=(G.mats.runedrill||0)>=1&&G.gold>=dg;
    if(this.runePick&&!ownedRunes.includes(this.runePick))this.runePick=null;
    if(!this.runePick&&ownedRunes.length)this.runePick=ownedRunes[0];
    const css=`<style>.rbar{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:6px;margin:6px 0 10px}.rchip{display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;padding:6px 9px;border-radius:8px;background:rgba(6,16,44,.7);border:1px solid rgba(255,255,255,.14);cursor:pointer;color:inherit;font:inherit}.rchip.on{outline:2px solid #ffe27a;background:rgba(255,226,122,.10)}.rchip small{opacity:.8}.rcard{display:grid;grid-template-columns:minmax(220px,1fr) 2fr;gap:10px;align-items:center;padding:8px 10px;margin-bottom:6px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(6,16,44,.55)}.socks{display:flex;flex-wrap:wrap;gap:6px}.sock{width:118px;min-height:52px;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:600 12px Sarabun,sans-serif;cursor:pointer;color:inherit;padding:4px}.sock.empty{border:2px dashed rgba(255,226,122,.55);background:rgba(255,226,122,.05)}.sock.full{border:2px solid;background:rgba(0,0,0,.35)}.sock.lock{border:2px solid rgba(255,255,255,.08);background:rgba(0,0,0,.25);opacity:.6;cursor:default}.sock.drill{border:2px solid #ffb347;background:rgba(255,179,71,.12)}.sock:disabled{opacity:.45;cursor:not-allowed}</style>`;
    const bar=ownedRunes.length?ownedRunes.map(rk=>`<button class="rchip${this.runePick===rk?' on':''}" data-rpick="${rk}" style="border-color:${RUNEC[rk]}"><b style="color:${RUNEC[rk]}">${MATS[rk].ic||''} ${MATS[rk].n} ×${G.mats[rk]}</b><small>${runeTxt(rk)}</small></button>`).join(''):'<div class="dim">ยังไม่มีรูนในกระเป๋า — ได้จากการดรอปและร้าน</div>';
    const pk=this.runePick;
    const cards=list.map(it=>{const mx=RARITY[it.rar].sockets||0,socks=it.sockets||[];
      const slots=Array.from({length:mx},(_,i)=>{
        if(i<socks.length){const rk=socks[i];
          return rk&&MATS[rk]?`<button class="sock full" data-unsock="${it.uid}:${i}" style="border-color:${RUNEC[rk]}" title="คลิกเพื่อถอดคืนกระเป๋า (ไม่เสียรูน)"><b style="color:${RUNEC[rk]}">${MATS[rk].ic||''} ${MATS[rk].n}</b><small>${runeTxt(rk)}</small><small class="dim">✕ ถอด</small></button>`
            :`<button class="sock empty" data-sock="${it.uid}:${i}" ${pk?'':'disabled'} title="${pk?'ใส่ '+MATS[pk].n:'เลือกรูนด้านบนก่อน'}"><b>＋ ช่อง ${i+1}</b><small class="dim">${pk?'ใส่ '+MATS[pk].n:'เลือกรูนก่อน'}</small></button>`;}
        if(i===socks.length)return`<button class="sock drill" data-drill="${it.uid}" ${canDrill?'':'disabled'} title="สว่านรูน 1 + ${dg} ทอง"><b>🔩 เจาะช่อง ${i+1}</b><small class="${(G.mats.runedrill||0)>=1?'':'bad'}">สว่าน ${G.mats.runedrill||0}/1 · ${dg} ทอง</small></button>`;
        return`<div class="sock lock"><b>🔒</b><small>ช่อง ${i+1}</small></div>`;}).join('');
      return`<div class="rcard" style="border-left:3px solid ${RARC[it.rar]}"><div><div ${rc(it.rar)}><b>${bIco(it.base,18)} ${itemName(it)}</b></div>
        <div class="dim" style="font-size:12px">${wElTag(it.base)?elChip(wElTag(it.base))+' · ':''}${RARN[it.rar]} · เปิด ${socks.length}/${mx} · ใส่ ${socks.filter(Boolean).length}${Equip.isEquipped(it)?' · <span class="good">สวมอยู่</span>':''}</div></div>
        <div class="socks">${slots}</div></div>`;}).join('')||'<div class="dim">ไม่มีอุปกรณ์</div>';
    return css+`<div class="tset" style="padding:8px 10px"><b>คลังรูน</b> <small class="dim">เลือกรูน แล้วคลิกช่องว่างของอุปกรณ์ · คลิกรูนที่ใส่อยู่เพื่อถอดคืน · ช่องสูงสุดตามระดับ (ธรรมดา 1 … เทพ 5)</small><div class="rbar">${bar}</div></div>`+cards;
  },
  scr_reitem(){const rs=this.reRes||[],full=G.bag.length>=LOOT_CONFIG.inventory.equipSlots,can=G.gold>=REITEM.cost,done=!!this.reBought,buyOk=G.gold>=REITEM.buy;
    const slots=[0,1,2,3].map(i=>{const it=rs[i];if(!it)return`<div class="it"><span class="dim">ว่าง</span></div>`;
      const st=done?(this.reBought===it.uid?'<b class="good">ซื้อแล้ว</b>':'ปิดการขาย'):full?'กระเป๋าเต็ม':!buyOk?'เหรียญไม่พอ':`ซื้อ ${REITEM.buy} เหรียญ`;
      return`<button class="it" data-reclaim="${i}" ${done||full||!buyOk?'disabled':''} ${rb(it.rar)}><span class="ic" ${rc(it.rar)}>${bIco(it.base,18)}</span><span ${rc(it.rar)}>${itemName(it)}</span><br><small>${RARN[it.rar]} · ${st}</small></button>`;}).join('');
    return`<h2>${ico('gem',22)} ${Z&&Z.id==='city'?'เวสเพอร์':'เซเรน่า'} · แปรผลึกไอเทม</h2>
      <p class="dim">"หินเอเธอร์ทั้งแปดสั่นคลอน จนละอองพลังตกผลึกเป็นอุปกรณ์ล้ำค่า — สุ่มครั้งละ <b>${REITEM.cost}</b> เหรียญ เลือกซื้อได้ <b>1 ชิ้น</b> ชิ้นละ <b>${REITEM.buy}</b> เหรียญ"</p>
      <div class="inv">${slots}</div>
      <p class="dim">อัตรา: ${reitemOdds(true).map(([r,p])=>`${RARN[r]} ${p}%`).join(' · ')}</p>
      <div class="acts"><button class="btn" data-reroll="1" ${can?'':'disabled'}>${ico('craft',14)} สุ่มไอเทม — ${REITEM.cost} เหรียญ</button></div>
      <p class="dim">เหรียญของคุณ ${G.gold}</p>`;},
  scr_alchemy(){return`<h2>${ico('gem',22)} นักเล่นแร่แปรธาตุ — ปรับค่าความสามารถ</h2>
      <p class="dim">"เอาของมาให้ข้าดูสิ… หินรีค่า ศิลาเลือกค่า หินอัปเทียร์ — ข้าใช้ได้หมด ส่วน${MATS.philostone.n}ใช้ล็อกค่าที่ชอบไว้"</p>`+this.afxPanel();},
  scr_citygate(){
    const lk=hasLavaKey()?'':'🔒 ต้องมีกุญแจลาวา (ชนะคาเงะในถ้ำชีส) ก่อน · ';
    const dests=[
      {id:'dungeon',ic:'🧀',n:'ถ้ำชีส (ฝั่งซ้าย)',lv:'Lv.1–5',d:'ทางเข้าเริ่มต้นฝั่งซ้าย · แร่หิน · มินิบอส: คาเงะ (ดรอปกุญแจลาวา)'},
      {id:'lavadungeon',ic:'🌋',n:'เหมืองลาวา',lv:'Lv.11–13 (บอส 37)',d:lk+'แยกจากถ้ำชีส · บอส: ราชันย์ลาวา'},
      {id:'stonedungeon',ic:'🪨',n:'ถ้ำหินโกเลม',lv:'Lv.5–7 (บอส 35)',d:lk+'หุบผาศิลาตะวันตก · แร่เหล็ก · บอส: โกเลมหิน'},
      {id:'towerdungeon',ic:'🧪',n:'หอคอยนักแปรธาตุ',lv:'Lv.14–16 (บอส 38)',d:lk+'แหลมศิลาเหนือ · บอส: นักแปรธาตุที่บิดเบี้ยว'},
      {id:'icedungeon',ic:'❄️',n:'ถ้ำน้ำแข็ง & วิหารเซราฟ',lv:'Lv.18–20 (บอส 40)',d:lk+'ยอดเขาหิมะเหนือสุด · แร่เหล็กน้ำแข็ง · บอส: เซราฟตาเดียว'}
    ];
    return`<h2>🚪 ประตูเมือง Collawarrie</h2>
      <p class="dim">เลือกเส้นทางออกนอกเมืองเพื่อเดินทางไปยังดันเจี้ยน</p>
      <div class="tal" style="grid-template-columns:1fr 1fr">${dests.map(x=>`<button class="talc" data-cg="${x.id}"><div class="ti">${x.ic}</div><b>${x.n}</b> <small class="dim">${x.lv}</small><p>${x.d}</p></button>`).join('')}</div>
      <div style="text-align:right;margin-top:10px"><button class="btn ghost" data-close="1">อยู่ต่อในเมือง</button></div>`;},
  scr_southgate(){
    return`<h2>🛡️ อัศวินโรแลนด์ (ยามประตูใต้) — เมือง Collawarrie</h2>
      <div class="qb" style="margin-bottom:10px"><b>โรแลนด์:</b> "จะเดินทางไปไหนท่านผู้กล้า? เมืองหลวงบนเกาะเหนือถูกผนึกไว้แล้ว แต่หอคอยคริสตัล 5 ชั้น (Lv.50–95) กำลังส่องแสงอยู่ที่นั่น!"</div>
      <div class="tal" style="grid-template-columns:1fr 1fr">
        <button class="talc" data-owworld="town" autofocus><div class="ti">🚶</div><b>ออกเดินทางสู่แผนที่โลก (Overworld)</b><small class="good">เดินข้ามเมือง · เกาะใต้ ↔ เกาะกลาง ↔ เกาะเหนือ</small><p>ออกไปเดินบนถนน สะพานข้ามทะเล ไปจุดพักแรม และหอคอยคริสตัลบนเกาะทั้งสาม</p></button>
        <div class="talc dim"><div class="ti">🔒</div><b>เมืองหลวงออเรีย — ถูกผนึก</b><small class="bad">ไม่สามารถเข้าได้</small><p>ม่านพลังปิดกั้นทางเข้าเมืองหลวงไว้ เปลี่ยนปลายทางฝั่งเกาะเหนือเป็นหอคอยคริสตัลจอมเวทแทน</p></div>
      </div>
      <div style="text-align:right;margin-top:10px"><button class="btn ghost" data-close="1">ยังก่อน — อยู่ในเมืองต่อ</button></div>`;},
  scr_cityexit(){
    return`<h2>🛡️ อัศวินอัลดริก (ยามประตูเมืองหลวง) — City</h2>
      <div class="qb" style="margin-bottom:10px"><b>อัลดริก:</b> "ท่านจะเดินทางไปไหนต่อ? รอยแยกกลางเกาะกำลังเรียกร้องหินเอเธอร์ที่เหลืออยู่ ออกประตูนี้สู่แผนที่โลกเพื่อกลับเกาะกลางหรือเกาะใต้ได้"</div>
      <div class="tal" style="grid-template-columns:1fr 1fr">
        <button class="talc" data-owworld="city" autofocus><div class="ti">🚶</div><b>ออกสู่แผนที่โลก (Overworld)</b><small class="good">เดินข้ามเมืองบนแผนที่จริง</small><p>เดินกลับข้ามสะพานทะเลผ่านจุดพักแรมเกาะกลางและท่าเรือสู่ Collawarrie</p></button>
        <button class="talc" data-owgo="ow_town"><div class="ti">🏰</div><b>กลับเมือง Collawarrie ทันที</b><small class="good">Fast Travel · เกาะใต้</small><p>เดินทางกลับเมืองท่าทางใต้ทันที</p></button>
      </div>
      <div style="text-align:right;margin-top:10px"><button class="btn ghost" data-close="1">อยู่ในเมืองหลวงต่อ</button></div>`;},
  scr_arena(){return`<h2>🏟️ ลานประลอง Collawarrie</h2>
    <p class="dim">สู้กันแบบนักสู้ต่อนักสู้ ชนะ 2 ใน 3 ยก · <b>ใช้เลเวล ค่าพลัง อุปกรณ์ และสกิล 4 ช่องของตัวเอง</b> (ออนไลน์: ชุดของเพื่อนส่งไปตอนเข้าห้อง) · ไม่ใช้ยา · ชนะได้รางวัลสุ่ม 1 ชิ้น (อัตราเดียวกับร้านรีไอเทม) · ไม่ได้ EXP ไม่เสียอะไร</p>
    <div class="tal" style="grid-template-columns:1fr">
      <button class="talc" data-open="room"><div class="ti">🌐</div><b>ห้องออนไลน์ (เชิญเพื่อน)</b><p>สร้างห้อง ส่งรหัสให้เพื่อน แล้วสู้กันคนละเครื่อง</p>
        <div class="sk">ต้องให้เพื่อนเปิดเกมนี้อยู่พร้อมกัน</div></button></div>
    <div style="text-align:right;margin-top:10px"><button class="btn" data-close="1">ออก</button></div>`;},
  scr_colosseum(){
    const cur=Guild.rank(),ci=GUILD_RANKS.findIndex(r=>r.id===cur);
    const cards=GUILD_RANKS.map((r,i)=>{
      if(i===0)return`<div class="talc" style="border-color:${r.col}"><div class="ti" style="color:${r.col}">F</div><b>แรงค์ F · ${r.n}</b><small class="good">✓ แรงค์เริ่มต้น</small><p>ระดับพื้นฐานหลังสมัครกิลด์นักผจญภัย</p></div>`;
      const tr=(typeof COLOSSEUM_TRIALS!=='undefined'&&COLOSSEUM_TRIALS[r.id])||null;
      const cnt=tr?tr.foes.length:0,tlv=tr?tr.lv:r.lvReq,names=tr?tr.foes.map(k=>((FOES[k]&&FOES[k].n)||k).split(' (')[0]).join(' / '):'';
      const done=ci>=i||(r.promoQuest&&Guild.questDone(r.promoQuest)),prevOk=ci===i-1,lvOk=G.level>=r.lvReq,open=!done&&prevOk&&lvOk&&!!tr;
      const st=done?'<small class="good">✓ ผ่านบททดสอบแล้ว</small>':!prevOk?`<small class="bad">🔒 ต้องอยู่แรงค์ ${GUILD_RANKS[i-1].id} ก่อน</small>`:!lvOk?`<small class="bad">🔒 ต้องการ Lv.${r.lvReq}+ (ตอนนี้ Lv.${G.level})</small>`:open?`<small class="good">⚔️ พร้อมท้าทาย · Lv.${tlv} (${cnt} คู่ต่อสู้) · ห้ามใช้ยา</small>`:'<small class="dim">🚧 ด่านทดสอบแรงค์นี้เตรียมเปิดเร็วๆ นี้</small>';
      const descTxt=tr?`ผู้ท้าทาย ${cnt} คน (Lv.${tlv}): ${names} · เลือกลำดับสู้เองได้ · ห้ามใช้ยาฟื้นพลังและยามานา`:`เกณฑ์เลเวล: Lv.${r.lvReq}+`;
      if(open)return`<button class="talc" data-colenter="${r.id}" style="border-color:${r.col}"><div class="ti" style="color:${r.col}">${r.id}</div><b>บททดสอบเลื่อนขั้น → Rank ${r.id} (${r.n})</b>${st}<p>${descTxt}</p></button>`;
      return`<div class="talc dim" style="opacity:${done?.82:.6}"><div class="ti" style="color:${r.col}">${r.id}</div><b>บททดสอบ Rank ${r.id} (${r.n})</b>${st}<p>เกณฑ์เลเวล: Lv.${r.lvReq}+${tr?` · ผู้ท้าทาย ${cnt} คน (Lv.${tlv}): ${names}`:''}</p></div>`;
    }).join('');
    const trainCard=`<button class="talc" data-coltrain="1" style="border-color:#ffd23a"><div class="ti">🎯</div><b>โรงฝึกซ้อมโคลอสเซียม (Training Ground)</b><small class="good">✓ เปิดตลอดเวลา · ไม่จำกัดแรงค์</small><p>ซ้อมคอมโบ ทดสอบสกิล และวัดดาเมจกับ <b>หุ่นซ้อมอมตะ</b> ที่ยืนนิ่งเฉยๆ (กดออกฝึกได้ทันทีตลอดเวลา)</p></button>`;
    return`<h2>🏛️ โคลอสเซียมทดสอบแรงค์นักผจญภัย</h2>
      <p class="dim">แรงค์ปัจจุบัน: <b style="color:${Guild.info(cur).col}">Rank ${cur} (${Guild.info(cur).n})</b> · Lv.${G.level} · เงื่อนไขเลื่อนขั้น: ${GUILD_RANKS.map(r=>r.id+(r.lvReq>1?' (Lv.'+r.lvReq+')':'')).join(' → ')} · ต้นเกม F–D (ของสูงสุดหายาก) · กลางเกม C–B (มหากาพย์) · ท้ายเกม A–S (ตำนาน · วิวัฒน์เทพ)</p>
      <div class="tal" style="grid-template-columns:1fr 1fr">${trainCard}${cards}</div>
      <div style="text-align:right;margin-top:10px"><button class="btn ghost" data-close="1">ออกจากโคลอสเซียม</button></div>`;},
  vsResult(w,wins,net,names){this.cur='vsres';G.mode='menu';ov.classList.remove('hidden');SFX.loot('legendary');
    const again=net==='host'?'<button class="btn" data-net="again">⚔️ แก้มืออีกครั้ง</button>':net==='guest'?'<span class="dim">รอเจ้าของห้องเริ่มยกใหม่… </span>':'';
    const n1=(names&&names[0])||'P1',n2=(names&&names[1])||'P2',wn=w==='P1'?n1:n2;
    // ผู้ชนะได้รางวัลสุ่ม 1 ชิ้น ด้วยอัตราเดียวกับร้านรีไอเทม (ฝั่งใครฝั่งมัน)
    const me=net==='guest'?'P2':'P1';let rw='';
    if(net&&w===me){const it=reitemRoll(),full=G.bag.length>=LOOT_CONFIG.inventory.equipSlots;
      if(full){const g=Inv.sellPrice(it);G.gold+=g;rw=`<div class="big">🎁 รางวัลผู้ชนะ: <span ${rc(it.rar)}>${bIco(it.base,18)} ${itemName(it)}</span><br><small class="dim">กระเป๋าเต็ม — ขายให้อัตโนมัติ ได้ ${g} ทอง</small></div>`;}
      else{Inv.addItem(it);rw=`<div class="big">🎁 รางวัลผู้ชนะ: <span ${rc(it.rar)}>${bIco(it.base,18)} ${itemName(it)}</span> <small class="dim">(${RARN[it.rar]} · เข้ากระเป๋าแล้ว)</small></div>`;}
      if(it.rar!=='normal')SFX.loot(it.rar);try{Save.save();}catch(e){}UI.hud&&UI.hud();}
    else if(net)rw=`<div class="dim">แพ้ครั้งนี้ ชนะเพื่อรับรางวัลสุ่ม 1 ชิ้น</div>`;
    pn.innerHTML=`<h2>🏆 ${esc(wn)}${net?(w==='P1'?' (เจ้าของห้อง)':' (เพื่อน)'):''} ชนะการประลอง!</h2><div class="big" style="font-size:2em">${esc(n1)} ${wins[0]} — ${wins[1]} ${esc(n2)}</div>${rw}
      <div style="text-align:right;margin-top:14px">${again} <button class="btn" data-close="1">ออกจากลาน</button></div>`;},
  scr_room(){const L=Net.lobby,back='<div style="text-align:right;margin-top:10px"><button class="btn" data-net="leave">ยกเลิก / กลับ</button></div>';
    if(L.phase==='hosting')return`<h2>🌐 ห้องของคุณ</h2><div class="big" style="font-size:3em;letter-spacing:.3em;text-align:center;margin:10px 0">${Net.code}</div><p class="dim" style="text-align:center">ส่งรหัสนี้ให้เพื่อน แล้วให้เพื่อนเปิดเกมนี้ → ลานประลอง → ห้องออนไลน์ → เข้าห้อง<br>${Net.label()}</p>
      <div class="big" style="text-align:center">${L.peer?'✅ <b class="good">'+esc(L.peerName||'เพื่อน')+' เข้าห้องแล้ว</b>':'⏳ รอเพื่อนเข้าห้อง…'}</div>
      <div style="text-align:center;margin-top:12px"><button class="btn" data-net="start" ${L.peer?'':'disabled'}>⚔️ เริ่มสู้</button></div>${back}`;
    if(L.phase==='connecting')return`<h2>🌐 กำลังเชื่อมต่อระบบออนไลน์…</h2><p class="dim">อาจใช้เวลาถึง 10 วินาที</p>${back}`;
    if(L.phase==='joining')return`<h2>🌐 กำลังเข้าห้อง ${Net.code}…</h2><p class="dim">กำลังหาเจ้าของห้อง · ${Net.label()}</p>${back}`;
    if(L.phase==='joined')return`<h2>🌐 เข้าห้อง ${Net.code} แล้ว</h2><div class="big" style="text-align:center">✅ ${L.hostName?'ห้องของ <b>'+esc(L.hostName)+'</b> · ':''}รอเจ้าของห้องกดเริ่มสู้…</div><p class="dim" style="text-align:center">${Net.label()}<br>ปุ่มของคุณ: A/D หรือ ←/→ เดิน · W/↑ โดด · S/↓ ย่อ · J หรือ , ตี · K หรือ . เตะ · Space หรือ / พุ่งหลบ · 1-4 สกิล · L ท่าสุดยอด</p>${back}`;
    return`<h2>🌐 ห้องออนไลน์</h2><p class="dim">สู้กับเพื่อนคนละเครื่อง · เจ้าของห้องเป็นฝั่ง P1 ซ้าย เพื่อนเป็น P2 ขวา · ใช้เลเวล อุปกรณ์ และสกิลของแต่ละคน · ไม่เสียอะไร<br>เพื่อนต้องล็อกอิน Claude และเปิดเกมจากลิงก์ที่คุณแชร์ให้ (เชิญผ่านปุ่มแชร์ของ artifact) — คนที่ไม่ได้ล็อกอินเข้าห้องออนไลน์ไม่ได้</p>${L.err?'<p class="bad">⚠ '+esc(L.err)+'</p>':''}
      <div class="tal" style="grid-template-columns:1fr 1fr"><button class="talc" data-net="host"><div class="ti">➕</div><b>สร้างห้อง</b><p>ได้รหัส 4 ตัวไปส่งให้เพื่อน</p></button>
      <div class="talc"><div class="ti">🔑</div><b>เข้าห้องของเพื่อน</b><p><input id="roomCode" maxlength="4" placeholder="รหัส 4 ตัว" style="width:7em;text-transform:uppercase;font:inherit;font-size:1.3em;letter-spacing:.2em;text-align:center"></p><button class="btn" data-net="join">เข้าห้อง</button></div></div>
      <div style="text-align:right;margin-top:10px"><button class="btn" data-open="arena">กลับ</button></div>`;},
  scr_quests(){
    const ci=GUILD_RANKS.findIndex(r=>r.id===Guild.rank());
    const gqHtml=`<h3>⚔️ กระดานภารกิจกิลด์นักผจญภัย (แรงค์ ${Guild.rank()})</h3>`+(typeof GUILD_QUESTS!=='undefined'?GUILD_QUESTS:[]).map(q=>{
      const st=(G.guildQuests&&G.guildQuests[q.id])||{active:0,count:0,done:0};
      const ri=GUILD_RANKS.findIndex(r=>r.id===q.rankReq),rkOk=ci>=ri;
      const rw=`${q.reward.xp||0} XP · ${q.reward.gold||0} ทอง `+Object.keys(q.reward.mats||{}).map(k=>`${mIco(k,13)}${MATS[k].n}×${q.reward.mats[k]}`).join(' ');
      const act=!rkOk?`<button class="btn sm" disabled>🔒 ต้อง Rank ${q.rankReq}+</button>`:st.active?(st.count>=q.req?`<button class="btn sm" data-gqclaim="${q.id}">🎁 ส่งเควสต์รับรางวัล</button>`:`<span class="dim">กำลังทำ: ${st.count}/${q.req}</span>`):`<button class="btn sm" data-gqacc="${q.id}">📜 รับภารกิจ</button>`;
      return`<div class="qb" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b>[Rank ${q.rankReq}+] ${q.n}</b>${st.done?` <small class="good">(สำเร็จ ${st.done} ครั้ง)</small>`:''}<div>${q.desc}</div><small class="dim">รางวัล: ${rw}</small></div><div>${act}</div></div>`;
    }).join('');
    return`<h2>${ico('scroll',22)} กระดานกิลด์ & สมุดเควสต์</h2>`+gqHtml+`<h3>📖 เควสต์เนื้อเรื่อง & เควสต์รอง</h3>`+Object.entries(QUESTS).map(([id,q])=>{const s=G.q[id];if(!s.active&&!s.done)return`<div class="qb dim">❔ ยังไม่ได้รับเควสต์</div>`;
    return`<div class="qb"><b>${s.done?'✅':'◆'} [${q.type}] ${q.n}</b>`+q.steps.map((t,i)=>`<div class="${i<s.step?'done':i===s.step?'':'dim'}">${i<s.step?'☑':'☐'} ${t}${id==='hunt'?` (${s.count}/3)`:''}</div>`).join('')+
    `<small class="dim">รางวัล: ${q.reward.xp||0} XP ${q.reward.gold?q.reward.gold+' ทอง ':''}${Object.keys(q.reward.mats||{}).map(k=>mIco(k,14)+MATS[k].n).join(' ')}</small></div>`;}).join('');},

  mapSel:null,
  mapTab:null,
  scr_continentsMap(){
    const locs=(typeof OW_LOCATIONS!=='undefined'?OW_LOCATIONS:[]).filter(l=>l.kind!=='dungeon');
    const V=Object.assign({town:1,ow_town:1},G.visited||{});
    const coords={ow_spire:[16,53],ow_spire_s:[35,54],ow_forest:[27,63],ow_mine:[38,73],ow_town:[28,80],ow_port:[47,63],ow_outpost:[66,54.5],ow_spire_m:[70,47],ow_spire_w:[52,30],ow_spire_n:[67,29],ow_city:[40,27]};
    const spireLockedSvg='<svg viewBox="0 0 32 32"><path d="M12 28l1-15h6l1 15z" fill="#524d58" stroke="#1e1228" stroke-width="1.5"/><path d="M9 14l4-9 3 4 3-5 4 10z" fill="#6d4890" stroke="#241234" stroke-width="1.2"/><circle cx="16" cy="20" r="6" fill="rgba(220,40,60,.25)" stroke="#ff6b7a" stroke-width="1.3"/><rect x="14" y="18" width="4" height="4" fill="#ff7080"/></svg>';
    const icons={
      ow_spire_w:spireLockedSvg,ow_spire_s:'<svg viewBox="0 0 32 32"><path d="M12 28l1-15h6l1 15z" fill="#cbbd9a" stroke="#2c2212" stroke-width="1.6"/><path d="M9 14l4-9 3 4 3-5 4 10z" fill="#facc15" stroke="#5a400a" stroke-width="1.3"/><path d="M8 28l3-5 2 5M19 28l2-5 3 5" fill="#eab308"/><rect x="14" y="21" width="4" height="7" fill="#2c2212"/><circle cx="16" cy="17" r="2.2" fill="#fff9c4"/></svg>',ow_spire_m:spireLockedSvg,ow_spire_n:spireLockedSvg,
      ow_forest:'<svg viewBox="0 0 32 32"><path d="M16 5L7 19h5l-3 7h14l-3-7h5z" fill="#3b8c42" stroke="#18381c" stroke-width="1.6" stroke-linejoin="round"/><rect x="14" y="24" width="4" height="5" fill="#6b4423"/></svg>',
      ow_mine:'<svg viewBox="0 0 32 32"><path d="M4 26l4-14 8-5 8 5 4 14z" fill="#6d726a" stroke="#222420" stroke-width="1.6"/><path d="M11 26v-9a5 5 0 0 1 10 0v9z" fill="#1b1816"/><circle cx="21" cy="13" r="2" fill="#9fe8ff"/></svg>',
      ow_town:WM_ICONS.town,
      ow_port:'<svg viewBox="0 0 32 32"><path d="M16 5v18M11 11h10M7 18c0 5 4 9 9 9s9-4 9-9" fill="none" stroke="#7fe4ff" stroke-width="2.4" stroke-linecap="round"/><circle cx="16" cy="5" r="2.2" fill="#ffe082"/></svg>',
      ow_outpost:'<svg viewBox="0 0 32 32"><path d="M4 26L14 9l10 17z" fill="#d9a45b" stroke="#23170b" stroke-width="1.8" stroke-linejoin="round"/><path d="M11 26l3-8 3 8z" fill="#523018"/><path d="M24 26c-2-3 0-6 2-8 2 2 4 5 2 8z" fill="#ff8a32"/></svg>',
      ow_spire:'<svg viewBox="0 0 32 32"><path d="M12 28l1-15h6l1 15z" fill="#6b5e6e" stroke="#22122e" stroke-width="1.6"/><path d="M9 14l4-9 3 4 3-5 4 10z" fill="#d868ff" stroke="#30104a" stroke-width="1.3"/><path d="M8 28l3-5 2 5M19 28l2-5 3 5" fill="#b438e8"/><rect x="14" y="21" width="4" height="7" fill="#1e102c"/><circle cx="16" cy="17" r="2" fill="#7af0ff"/></svg>',
      ow_city:'<svg viewBox="0 0 32 32"><path d="M5 27V13l5-5 5 5v14zM13 27V9l5-5 5 5v18zM21 27V14l4-4 3 4v13z" fill="#8b96ab" stroke="#202430" stroke-width="1.6" stroke-linejoin="round"/><circle cx="16" cy="17" r="9" fill="rgba(220,40,60,.28)" stroke="#ff6b7a" stroke-width="1.6"/></svg>'
    };
    let hx=28,hy=80,curId='ow_town';
    if(Z&&Z.id==='overworld'){hx=clamp(P.x/(OW_COLS*16)*100,8,92);hy=clamp(P.y/(OW_ROWS*16)*100,10,90);curId='ow_town';}
    else if(Z&&Z.theme==='spire'){const spId=Z.tower==='aether'?'ow_spire_s':'ow_spire',[sx,sy]=coords[spId];hx=sx;hy=sy;curId=spId;}
    const sel=locs.find(l=>l.id===this.mapSel)||null;
    const Q=mapQuestInfo(),topQ=Q.top;
    const nodes=locs.map(l=>{
      const [px,py]=coords[l.id]||[50,50],act=this.mapSel===l.id,vis=!l.locked;
      const here=(Z&&Z.theme==='spire'&&l.id===curId)||((!Z||Z.id!=='overworld'&&Z.theme!=='spire')&&l.id==='ow_town');
      return`<button class="wm-node${here?' here':''}${act?' sel':''}${vis?'':' fog'}" data-mapnode="${l.id}" style="left:${px}%;top:${py}%" title="${l.n} (${l.lv})">
        <span class="wm-ico">${icons[l.id]||WM_ICONS.town}</span>
        <span class="wm-lbl"><span>${l.n}</span><small>${l.lv}</small></span>
      </button>`;
    }).join('');
    let drawer='';
    if(sel){
      const actBtn=sel.locked
        ?`<button class="btn sm" disabled>🔒 ${sel.kind==='city'?'เมืองหลวงถูกผนึกไว้ — ยังไม่สามารถเข้าได้':'หอคอยนี้ถูกผนึกไว้ — ยังไม่สามารถเข้าได้'}</button>`
        :sel.kind==='town'
        ?`<button class="btn sm" data-owgo="ow_town">🏰 เข้าเมือง Collawarrie</button>`
        :sel.kind==='spire'&&typeof Guild!=='undefined'&&!Guild.canEnterSpire()
        ?`<button class="btn sm" disabled>🔒 หอคอยคริสตัลปิดผนึก — ต้องมีแรงค์กิลด์ Rank D ขึ้นไป</button>`
        :(sel.kind==='spire'||sel.kind==='gather')
        ?`<button class="btn sm" data-owgo="${sel.id}">${sel.icon} เข้า${sel.n} (${sel.lv})</button>`
        :'';
      drawer=`<div class="wm-drawer">
        <div class="wm-dhead"><div><h3>${sel.icon} ${sel.n}</h3><small>${sel.lv}</small></div><button class="wm-dclose" data-mapclose="1" aria-label="ปิดรายละเอียด">✕</button></div>
        <div style="font-size:clamp(10px,1.1vw,12.5px);color:#4f381d;margin-bottom:9px;line-height:1.45">${sel.desc}</div>
        <div class="wm-flist"><div class="wm-fcard"><div class="wm-ftop"><span>ℹ️ เส้นทางและดันเจี้ยน</span></div><div class="wm-fmeta"><div>ประตูเมืองด้านเหนือ (ในเมือง) ใช้สำหรับเดินทางสู่ดันเจี้ยนทุกแห่ง · ประตูใต้ใช้ออกมาเดินข้ามเมืองบนแผนที่โลก</div></div></div></div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">${actBtn}<button class="btn ghost sm" data-owworld="${Z&&Z.id==='city'?'city':'town'}">🚶 ออกเดินบน Overworld</button></div>
      </div>`;
    }
    const qBanner=topQ
      ?`<button class="wm-quest" data-mapnode="ow_town"><span class="wm-qbadge">!</span><span class="wm-qtxt"><b>เควสต์${topQ.q.type} — ${esc(topQ.q.n)}</b><span>${esc(topQ.stepTxt)}</span></span></button>`
      :`<button class="wm-quest" data-mapnode="${curId}"><span class="wm-qbadge">✦</span><span class="wm-qtxt"><b>แผนที่โลก 3 เกาะ · ทางเดินข้ามเมือง</b><span>ดันเจี้ยนทั้งหมดเข้าทางประตูในเมือง (คลิกจุดเพื่อดูรายละเอียด)</span></span></button>`;
    return`<div class="wmap-screen">
      <svg class="wm-art" viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="nwSea" cx="50%" cy="48%" r="68%"><stop offset="0%" stop-color="#587788"/><stop offset="52%" stop-color="#3c5463"/><stop offset="100%" stop-color="#19252e"/></radialGradient>
          <linearGradient id="nwGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b4cb8e"/><stop offset="50%" stop-color="#8dae63"/><stop offset="100%" stop-color="#698b47"/></linearGradient>
          <linearGradient id="nwLava" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a8684d"/><stop offset="100%" stop-color="#6f3f2f"/></linearGradient>
          <radialGradient id="nwSnow" cx="65%" cy="38%" r="55%"><stop offset="0%" stop-color="#eef7fc"/><stop offset="65%" stop-color="#d2e6f2" stop-opacity=".75"/><stop offset="100%" stop-color="#8dae63" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="960" height="540" fill="url(#nwSea)"/>
        <!-- เส้นเดินเรือและเข็มทิศ -->
        <g stroke="rgba(235,222,192,.14)" stroke-width="1" fill="none">
          <circle cx="460" cy="280" r="130"/><circle cx="460" cy="280" r="260"/><circle cx="460" cy="280" r="390"/>
          <path d="M460 0v540M0 280h960M120 0l680 540M800 0L120 540M0 130l960 300M0 430L960 130"/>
        </g>
        <!-- แนวคลื่นทะเลรอบ 3 เกาะ -->
        <g fill="none" stroke="rgba(208,238,250,.22)" stroke-width="10">
          <path d="M126 254 C162 204,316 202,438 256 C490 286,496 368,448 424 C382 476,220 472,148 418 C100 374,98 298,126 254 Z"/>
          <path d="M568 254 C610 232,684 238,698 286 C690 330,618 338,570 314 Z"/>
          <path d="M372 138 C422 80,584 74,668 128 C714 176,684 226,608 228 C510 230,398 206,372 138 Z"/>
        </g>
        <!-- 1) เกาะใต้ -->
        <path d="M126 254 C162 204,316 202,438 256 C490 286,496 368,448 424 C382 476,220 472,148 418 C100 374,98 298,126 254 Z" fill="#d9c496" stroke="#473620" stroke-width="2.5"/>
        <path d="M134 258 C168 212,312 210,430 261 C478 289,484 364,440 416 C378 465,224 461,154 410 C110 370,108 300,134 258 Z" fill="url(#nwGreen)"/>
        <!-- แม่น้ำเกาะใต้ -->
        <path d="M242 268 C264 304,320 332,372 344" fill="none" stroke="#538398" stroke-width="5.5" stroke-linecap="round"/>
        <!-- ทิวเขาเกาะใต้ -->
        <g fill="#7d7262" stroke="#3f3223" stroke-width="1.3" stroke-linejoin="round">
          <path d="M192 252l14-20 14 20zM214 258l16-23 16 23zM330 272l14-20 14 20zM352 280l16-22 16 22z"/>
        </g>
        <!-- 2) เกาะกลาง (จุดพักแรม) -->
        <path d="M568 254 C610 232,684 238,698 286 C690 330,618 338,570 314 Z" fill="#cfab80" stroke="#4a3020" stroke-width="2.4"/>
        <path d="M574 258 C612 238,678 244,690 285 C684 323,620 330,576 309 Z" fill="url(#nwLava)"/>
        <path d="M604 268l13-18 13 18zM646 274l12-16 12 16z" fill="#5e3a2e" stroke="#381e15" stroke-width="1.2"/>
        <!-- 3) เกาะเหนือ (City + ยอดเขาหิมะ) -->
        <path d="M372 138 C422 80,584 74,668 128 C714 176,684 226,608 228 C510 230,398 206,372 138 Z" fill="#d9c496" stroke="#473620" stroke-width="2.5"/>
        <path d="M380 140 C426 88,580 82,660 132 C702 175,674 218,604 220 C512 222,404 198,380 140 Z" fill="url(#nwGreen)"/>
        <path d="M380 140 C426 88,580 82,660 132 C702 175,674 218,604 220 C512 222,404 198,380 140 Z" fill="url(#nwSnow)"/>
        <g fill="#7d9ab2" stroke="#2d3e4f" stroke-width="1.2" stroke-linejoin="round">
          <path d="M548 136l16-24 16 24zM576 144l18-28 18 28zM614 150l15-22 15 22z"/>
          <path d="M584 128l10-12 10 12z" fill="#f3faff" stroke="none"/>
        </g>
        <!-- เส้นทางเดินบนเกาะใต้ (สะพานข้ามเกาะถูกตัดออกทั้งหมด) -->
        <path d="M154 286 Q200 375 269 432 Q365 398 451 340" fill="none" stroke="rgba(255,244,205,.76)" stroke-width="2.5" stroke-dasharray="6 5"/>
        <!-- เข็มทิศทองมุมขวาล่าง -->
        <g transform="translate(868,452)">
          <circle cx="0" cy="0" r="30" fill="rgba(22,34,42,.55)" stroke="#d4aa5a" stroke-width="1.6"/>
          <path d="M0-34 L7-7 L34 0 L7 7 L0 34 L-7 7 L-34 0 L-7-7 Z" fill="#e8c878" stroke="#473620" stroke-width="1.2"/>
          <circle cx="0" cy="0" r="4" fill="#fff5d0"/>
        </g>
      </svg>
      ${qBanner}
      <div class="wm-title"><h2>โลกคอลลาวาร์รี · 3 เกาะ</h2><small>WORLD CONTINENTS</small></div>
      <span class="wm-heropin" style="left:${hx}%;top:${hy}%;right:auto;transform:translate(-50%,-115%) rotate(45deg)" title="${esc(pname())} อยู่ที่นี่"><canvas id="mapHeroCv" width="48" height="48"></canvas></span>
      ${nodes}
      ${drawer}
      <div class="wm-foot">
        ${Z&&Z.id==='overworld'?'<button class="wm-fbtn" data-close="1">🚶 กลับไปเดินบนแผนที่</button>':`<button class="wm-fbtn" data-owworld="${Z&&Z.id==='city'?'city':'town'}">🚶 ออกเดินบน Overworld</button>`}
        <button class="wm-fbtn" data-mapcur="${curId}"><kbd>G</kbd> ตำแหน่งปัจจุบัน</button>
        <button class="wm-fbtn" data-close="1"><kbd>Esc</kbd> ปิดแผนที่</button>
      </div>
    </div>`;
  },
  scr_map(){
    if(this.mapTab==='continents')return this.scr_continentsMap();
    const cur=Z.regionAt(Math.floor(P.x/16)),V=Object.assign({town:1},G.visited||{},{[cur]:1});
    const LMS=WORLD_LANDMARKS,curLm=(LMS.find(l=>l.floors.some(f=>f.id===cur))||LMS[0]).id;
    const Q=mapQuestInfo(),bs=G.bloodstain;
    const nodes=LMS.map(lm=>{
      const vis=lm.id==='town'||lm.floors.some(f=>V[f.id]),here=curLm===lm.id,sel=this.mapSel===lm.id;
      const qs=Q.byLm[lm.id]||[],hasBlood=bs&&lm.floors.some(f=>f.id===bs.zone);
      return`<button class="wm-node${here?' here':''}${sel?' sel':''}${vis?'':' fog'}${lm.danger?' danger':''}" data-mapnode="${lm.id}" style="left:${lm.x}%;top:${lm.y}%" title="${lm.n} (${lm.lv})">
        ${qs.length?`<span class="wm-qmark" title="เควสต์: ${esc(qs[0].q.n)}">!</span>`:''}
        ${hasBlood?`<span class="wm-blood" title="คราบเลือดของคุณตกอยู่ที่นี่">🩸</span>`:''}
        ${here?`<span class="wm-heropin" title="${esc(pname())} อยู่ที่นี่"><canvas id="mapHeroCv" width="48" height="48"></canvas></span>`:''}
        <span class="wm-ico">${WM_ICONS[lm.id]}</span>
        <span class="wm-lbl"><span>${vis?lm.n:lm.n}</span><small>${lm.lv}</small></span>
      </button>`;
    }).join('');
    let drawer='';
    if(this.mapSel){
      const lm=LMS.find(l=>l.id===this.mapSel);
      if(lm){
        const fcards=lm.floors.map(f=>{
          const z=ZONE_INFO[f.id]||{n:f.id,lv:1},v=!!V[f.id],here=cur===f.id,el=enemyLevel(z.lv,G.level);
          const fq=Q.byZone[f.id]||[],fblood=bs&&bs.zone===f.id;
          let bossTag='';
          if(f.boss&&FOES[f.boss]){
            const left=typeof bossLeft==='function'?bossLeft(f.boss):0;
            bossTag=`<div class="wm-tag boss">👑 บอส: ${FOES[f.boss].n} (Lv.${FOES[f.boss].fixedLv||el}) · ${left>0?`⏳ เกิดใหม่ใน ${fmtLeft(left)}`:'⚔️ พร้อมสู้'}</div>`;
          }else if(f.miniboss&&FOES[f.miniboss]){
            bossTag=`<div class="wm-tag boss">⚔️ มินิบอส: ${FOES[f.miniboss].n}${G.flags&&G.flags.kageDown?' (ปราบแล้ว)':''}</div>`;
          }
          const mons=(f.foe||[]).map(k=>{const d=FOES[k];if(!d)return'';const seen=G.ency&&G.ency[k];return seen||k==='duelist'?d.n:'???';}).filter(Boolean).join(', ');
          return`<div class="wm-fcard${here?' here':''}${v?'':' fog'}">
            <div class="wm-ftop"><span>${f.fl} — ${v?z.n:'??? (ยังไม่เคยสำรวจ)'}</span><span class="wm-flv">โซน Lv.${z.lv} · ศัตรู ~Lv.${el}</span></div>
            <div class="wm-fmeta">
              ${here?`<div class="wm-tag here">📍 คุณอยู่ที่ชั้นนี้ (${esc(pname())})</div>`:''}
              ${fq.map(x=>`<div class="wm-tag q">❗ [${x.q.type}] ${esc(x.q.n)}: ${esc(x.stepTxt)}</div>`).join('')}
              ${fblood?`<div class="wm-tag blood">🩸 คราบเลือดตกอยู่ที่ชั้นนี้ (${bs.gold} ทอง / ${bs.xp} EXP)</div>`:''}
              ${bossTag}
              ${mons?`<div>🐾 ศัตรูในพื้นที่: <b>${mons}</b></div>`:''}
              ${f.note?`<div style="opacity:.82">${f.note}</div>`:''}
            </div>
          </div>`;
        }).join('');
        drawer=`<div class="wm-drawer">
          <div class="wm-dhead"><div><h3>${lm.n}</h3><small>${lm.sub} · ${lm.lv}</small></div><button class="wm-dclose" data-mapclose="1" aria-label="ปิดรายละเอียด">✕</button></div>
          <div style="font-size:clamp(9.5px,1.05vw,12px);color:#4f381d;margin-bottom:7px;line-height:1.35">${lm.desc}</div>
          <div class="wm-flist">${fcards}</div>
          <div class="wm-dfoot">เลเวลศัตรู = เลเวลโซน + clamp(⌊(เลเวลผู้เล่น − เลเวลโซน) × 0.5⌋, −5, 10) · บอส +2 · มินิบอส +1</div>
        </div>`;
      }
    }
    const topQ=Q.top;
    const qBanner=topQ
      ?`<button class="wm-quest" data-mapnode="${topQ.lmId}" title="คลิกเพื่อดูตำแหน่งเควสต์บนแผนที่"><span class="wm-qbadge">!</span><span class="wm-qtxt"><b>เควสต์${topQ.q.type} — ${esc(topQ.q.n)}</b><span>${esc(topQ.stepTxt)}</span></span></button>`
      :`<button class="wm-quest" data-mapnode="${curLm}"><span class="wm-qbadge">✦</span><span class="wm-qtxt"><b>สำรวจอาณาจักรคอลลาวาร์รี</b><span>คลิกจุดแลนด์มาร์กบนเกาะเพื่อดูชั้นย่อย 1–3</span></span></button>`;
    return`<div class="wmap-screen">
      ${WM_ART_SVG}
      ${qBanner}
      <div class="wm-title"><h2>อาณาจักรคอลลาวาร์รี</h2><small>KINGDOM OF COLLAWARRIE</small></div>
      ${nodes}
      ${drawer}
      <div class="wm-foot">
        <button class="wm-fbtn" data-maptab="continents">🌍 แผนที่ทวีป (3 เกาะ)</button>
        <button class="wm-fbtn" data-mapcur="${curLm}"><kbd>G</kbd> ตำแหน่งปัจจุบัน</button>
        <button class="wm-fbtn" data-open="menu"><kbd>Esc</kbd> กลับเมนู</button>
      </div>
    </div>`;
  },

  scr_ency(){return'<h2>📖 สารานุกรมศัตรู</h2><div class="ency">'+Object.entries(FOES).map(([k,d])=>{const e=G.ency[k];
    if(!e)return`<div class="en dim"><b>???</b><small>ยังไม่เคยพบ</small></div>`;
    const L=LOOT_TABLES[d.loot]||{guaranteed:[]};const drops=e.kills>=3?(L.guaranteed||[]).map(f=>f.gold?'🪙 ทอง':MATS[f.mat]?mIco(f.mat,14)+MATS[f.mat].n:'?').join(', ')+' + สุ่มจากตารางของตัวเอง':'ปราบ 3 ครั้งเพื่อเปิดเผย';
    return`<div class="en"><b>${d.n}</b> ${d.boss?'👑 บอส':d.miniboss?'⚔ มินิบอส':''}<small>พบ ${e.seen} · ปราบ ${e.kills} · เลเวลสูงสุดที่เจอ ${e.maxLv}</small>
      <div>HP ฐาน ${d.base.hp} · ATK ${d.base.atk} · DEF ${d.base.def} · ต้านธาตุ ${Object.entries(d.res||{}).filter(([,v])=>v>0).map(([k,v])=>(ELNAME[k]||k)+Math.round(v*100)+'%').join(' ')||'—'}</div>
      ${e.kills>=1?`<div>ค่าพลัง: ${Object.keys(BASE_ATTR).map(k=>k.toUpperCase()+' '+((d.attr||{})[k]??BASE_ATTR[k])).join(' · ')}</div><div>สกิล: ${(d.skills||[]).filter(id=>skillUsable(id,'enemy')).map(id=>SKILLS[id].n+(SKILLS[id].el&&SKILLS[id].coef?' '+skEl(SKILLS[id]):'')).join(', ')||'—'}</div>`:''}
      ${d.reflect?`<div>สกิลติดตัว: สะท้อนดาเมจที่ได้รับ ${Math.round(d.reflect*100)}% กลับไปหาผู้โจมตี</div>`:''}${d.statusRes?`<div>ต้านสถานะ: ${Object.entries(d.statusRes).map(([s,v])=>STN[s]+' '+pct(v)).join(', ')}</div>`:''}${d.phases?`<div>เฟส: ${d.phases.length+1} · จุดอ่อน: หลังท่า "${d.weakPoint.after}"</div>`:''}<div>ดรอปตายตัว: ${drops}</div></div>`;}).join('')+'</div>';},

  lootPopup(out,title,xp=0,ups=0,newSk=[],eqInfo=null){
    this.cur='loot';G.mode='menu';ov.classList.remove('hidden');const best=(out.items||[]).reduce((a,it)=>Math.max(a,RARS.indexOf(it.rar)),0);SFX.loot(RARS[best]);
    const row=(l,v)=>`<div class="brow"><span>${l}</span><b>${v}</b></div>`,mats=Object.entries(out.mats||{}).map(([k,q])=>`${mIco(k,14)} ${MATS[k].n} ×${q}`).join(' · ');
    const items=(out.items||[]).map(it=>`<div class="lc" style="border-color:${RARC[it.rar]}">${itemTip(it)}</div>`).join('');
    const eqRow=eqInfo?(eqInfo.eqCnt?row(`EXP อุปกรณ์ที่สวม (${eqInfo.eqCnt} ชิ้น)`,`+${eqInfo.eqExp} EXP${eqInfo.eqUps?` <em class="good">อัปเลเวล +${eqInfo.eqUps} ขั้น!</em>`:''}`):row('EXP อุปกรณ์','<span class="dim">— (ยังไม่ได้สวมอุปกรณ์)</span>')):'';
    const rows=[xp?row('EXP ที่ได้รับ',`${xp} XP${ups?` <em class="good">เลเวลอัป! Lv.${G.level} (+${ups*CONFIG.levelPoints} แต้ม)</em>`:''}`):'',
      eqRow,
      out.gold?row('ทองที่ได้รับ',`${ico('coin',16)} ${out.gold}`):'',
      out.dropped!==undefined?row('ของตก',out.dropped?`${out.dropped} ชิ้นรอบจุดที่ศัตรูล้ม — กด E เก็บภายใน ${LOOT_CONFIG.ground.lifetime/60} วินาที`:'—'):'',
      mats?row('วัตถุดิบ',mats):'',
      newSk.length?row('สกิลใหม่',`<span class="good">${newSk.map(k=>SKILLS[k].n+(SKILLS[k].tier==='ultimate'?' (ใส่ช่องสุดยอดอัตโนมัติ)':'')).join(', ')}</span>`):''].join('');
    pn.innerHTML=`<h2>${title}<small class="gold-r">${ico('coin',16)} ${G.gold}</small></h2><div class="bres">${rows}${row('ไอเทมที่ได้รับ',items?'':'—')}${items?`<div class="loot">${items}</div>`:''}</div>
      <div class="bnext"><button class="btn" data-close="1">ถัดไป (Enter)</button></div>`;
    if(ups)this.levelUp(ups);
  },

  /* ---- debug tools ---- */
  scr_debug(){
    const log=G.dmgLog.map(l=>`<tr><td>${esc(l.from)}→${esc(l.to)}</td><td>${esc(l.move)}</td><td>${l.type}</td><td>${l.base}</td><td>${Math.round(l.defUsed)}</td><td>${l.crit?'✔':''}</td><td>${l.mods}</td><td>${pct(l.dr)}</td><td><b>${l.dmg}</b></td></tr>`).join('');
    return`<h2>🛠 เครื่องมือดีบัก</h2><div class="acts">
      <button class="btn sm" data-dbg="xp">+500 XP</button><button class="btn sm" data-dbg="gold">+1000 ทอง</button><button class="btn sm" data-dbg="mats">+วัตถุดิบทุกชนิด ×5</button>
      <button class="btn sm" data-dbg="skills">🎯 เรียนสกิลทั้งหมด + จัดช่อง (1–3 ทั่วไป · 4 เฉพาะตัว · 5 สุดยอด)</button><button class="btn sm" data-dbg="skclear">ล้างช่องสกิล</button><button class="btn sm" data-dbg="scrolls">ปลดล็อกทุกสูตร</button><button class="btn sm" data-dbg="items">สุ่มไอเท็มทุกระดับ</button><button class="btn sm" data-dbg="god">โหมดอมตะ: ${G.god?'เปิด':'ปิด'}</button><button class="btn sm" data-dbg="onehit">⚔️ ตีทีเดียวตาย: ${G.oneHit?'เปิด':'ปิด'}</button>
      <button class="btn sm" data-dbg="heal">ฟื้นเต็ม</button><button class="btn sm" data-dbg="lava">วาร์ปเหมืองลาวา</button><button class="btn sm" data-dbg="w_golem">🪨 วาร์ปบอสโกเลม</button><button class="btn sm" data-dbg="w_lavaking">🌋 วาร์ปบอสราชันย์ลาวา</button><button class="btn sm" data-dbg="w_homunculus">🧪 วาร์ปบอสหอคอย (นักแปรธาตุที่บิดเบี้ยว)</button><button class="btn sm" data-dbg="w_seraph">👁️ วาร์ปบอสเซราฟ</button><button class="btn sm" data-dbg="sp_1">🔮 วาร์ปบอสหอคอยชั้น 1</button><button class="btn sm" data-dbg="sp_2">🔮 วาร์ปบอสหอคอยชั้น 2</button><button class="btn sm" data-dbg="sp_3">🔮 วาร์ปบอสหอคอยชั้น 3</button><button class="btn sm" data-dbg="sp_4">🔮 วาร์ปบอสหอคอยชั้น 4</button><button class="btn sm" data-dbg="sp_5">🔮 วาร์ปบอสหอคอยชั้น 5</button><button class="btn sm" data-dbg="ap_1">☀️ วาร์ปบอสหอ Aether ชั้น 1</button><button class="btn sm" data-dbg="ap_2">☀️ วาร์ปบอสหอ Aether ชั้น 2</button><button class="btn sm" data-dbg="ap_3">☀️ วาร์ปบอสหอ Aether ชั้น 3</button><button class="btn sm" data-dbg="ap_4">☀️ วาร์ปบอสหอ Aether ชั้น 4</button><button class="btn sm" data-dbg="ap_5">☀️ วาร์ปบอสหอ Aether ชั้น 5</button><button class="btn sm" data-dbg="books">📚 ให้ตำราสกิลทุกเล่ม</button><button class="btn sm" data-dbg="seal">🗝️ +ตราทำลายผนึก & เรียนสกิลเฉพาะตัวทั้งหมด</button></div>
      <div class="filt">หน้าต่างคอมโบ <input type="range" min="4" max="30" value="${CONFIG.comboWindow}" data-cw> <b id="cwv">${CONFIG.comboWindow}</b> เฟรม</div>
      <h3>บันทึกดาเมจล่าสุด (สูตร: พลัง×สัมประสิทธิ์ − DEF หลังเจาะ × คริ × ตัวคูณ × (1−ลดดาเมจ))</h3>
      <table class="fd"><tr><th>ใคร</th><th>ท่า</th><th>ชนิด</th><th>ฐาน</th><th>DEF ใช้</th><th>คริ</th><th>ตัวคูณ</th><th>DR</th><th>ผล</th></tr>${log||'<tr><td colspan=9 class="dim">ยังไม่มี</td></tr>'}</table>
      <h3>Loot <button class="btn sm" data-dbg="pity">Pity บอส: ${LOOT_CONFIG.pity.enabled?'เปิด':'ปิด'}</button> <button class="btn sm" data-dbg="p2">จำลองของตกของ P2 ข้างตัว</button> <button class="btn sm" data-dbg="fill">เติมกระเป๋าให้เต็ม</button> <button class="btn sm" data-dbg="dropnow">สุ่มดรอปหนูตรงนี้</button></h3>
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
  if(d.bagtab){UI.bagTab=d.bagtab;UI.sel=null;UI.selMat=null;SFX.ui('cursor');UI.rerender();return;}
  if(d.selmat){UI.selMat=d.selmat;SFX.ui('cursor');UI.rerender();return;}
  if(d.kbset){KB_WAIT=d.kbset;UI.rerender();return;}if(d.kbreset){kbReset();UI.rerender();return;}
  if(d.cyf){UI.filt[d.cyf]=d.cyv;UI.rerender();return;}
  if(d.close){UI.close();return;}
  if(d.vol){SND.cycle();UI.rerender();return;}
  if(d.setvol!==undefined){initAudio();SND.setVol(+d.setvol);if(SND.vol>0)SFX.ui('confirm');UI.rerender();return;}
  if(d.testsnd){initAudio();SFX.ui('confirm');return;}
  if(d.togglefx&&typeof FX!=='undefined'){FX.on=!FX.on;toast(FX.on?'✨ HD-2D: เปิด':'HD-2D: ปิด',1400);UI.rerender();return;}
  if(d.save){saveNow();return;}
  if(d.title){if(Z&&Z.bossRoom&&!Z.cleared){toast('🔒 ออกจากห้องบอสไม่ได้ — ชนะหรือตายก่อน');return;}UI.close();if(!(Z&&Z.bossRoom&&!Z.cleared))Save.save();G.mode='title';StatSync.reset();$('#title').classList.remove('hidden');renderTitle();return;}
  if(d.load){UI.close();loadNow();return;}
  if(d.open){UI.open(d.open);return;}
  if(d.colenter){UI.close();enterColosseum(d.colenter);return;}
  if(d.coltrain){UI.close();enterTrainingGround();return;}
  if(d.gqacc){Guild.acceptQuest(d.gqacc);UI.rerender();return;}
  if(d.gqclaim){Guild.claimQuest(d.gqclaim);UI.rerender();return;}
  if(d.cg){UI.close();interact({type:d.cg,o:{}});return;}
  if(d.net){const a=d.net;if(a==='host')Net.host();else if(a==='join')Net.join(($('#roomCode')||{}).value);else if(a==='start'||a==='again')Net.beginHost();else if(a==='leave'){Net.leave();UI.open('arena');}return;}
  if(d.diff&&UI.cur==='talent'){UI.diffSel=d.diff;UI.rerender();return;}
  if(d.sex||d.hstyle||d.elf){G.look=Object.assign({},DEFLOOK,G.look);if(d.elf)G.look.elfEars=!G.look.elfEars;if(d.sex){G.look.sex=d.sex;if(UI.creating&&G.look.hstyle==='short'&&d.sex==='f')G.look.hstyle='ponytail';else if(UI.creating&&G.look.hstyle==='ponytail'&&d.sex==='m')G.look.hstyle='short';}if(d.hstyle)G.look.hstyle=d.hstyle;UI.rerender();return;}
  if(d.lk&&d.c){G.look=Object.assign({},DEFLOOK,G.look,{[d.lk]:d.c});UI.rerender();return;}
  if(d.lookrand){G.look=Object.assign({},DEFLOOK,G.look,{skin:pick(SKIN_TONES),hair:pick(HAIR_COLORS),eye:pick(EYE_COLORS),hstyle:pick(Object.keys(HAIR_STYLES))});UI.rerender();return;}
  if(d.lookreset){G.look=Object.assign({},DEFLOOK,{name:(G.look||{}).name||''});UI.rerender();return;}
  if(d.tal){if(UI.talentSwitch){UI.talentSwitch=false;if(d.tal===G.talent){toast('เป็นพรสวรรค์นี้อยู่แล้ว');UI.close();return;}
    if(!Inv.take('talentevo',1)){toast('ไม่มีไอเทม พรสวรรค์แห่งการวิวัฒน์');UI.close();return;}
    const oldSk=TALENTS[G.talent]&&TALENTS[G.talent].skill;if(oldSk){G.skills.learned.delete(oldSk);if(G.skills.slots[3]===oldSk)G.skills.slots[3]=null;if(G.skills.bound===oldSk)G.skills.bound=null;}
    G.talent=d.tal;const newSk=TALENTS[d.tal].skill;G.skills.learned.add(newSk);if(!G.skills.bound)Skills.bind(newSk);
    StatSync.invalidate('talent');UI.close();UI.hud();Save.save();SFX.level();toast(`✨ เปลี่ยนพรสวรรค์เป็น ${TALENTS[d.tal].n} แล้ว!`);return;}
    newGame(d.tal);return;}
  if(d.al){Prog.allocate(d.al);UI.rerender();UI.hud();return;}
  if(d.use){const r=Inv.use(d.use);if(r.ok){toast(r.msg);SFX.pick();}UI.rerender();UI.hud();return;}
  if(d.slot&&!d.sk&&!d.skeq){const it=G.eq[d.slot]&&itemByUid(G.eq[d.slot]);UI.eqSlot=d.slot;UI.sel=it?it.uid:null;UI.rerender();return;}
  if(d.sel){UI.sel=+d.sel;UI.rerender();return;}
  if(d.eq){const it=itemByUid(+d.eq);if(!Equip.equip(it))toast('เลเวลไม่ถึงที่ต้องการ');else SFX.pick();UI.rerender();return;}
  if(d.uneq){for(const s of SLOTS)if(G.eq[s]===+d.uneq)G.eq[s]=null;UI.rerender();return;}
  if(d.enh){const r=Equip.enhance(itemByUid(+d.enh));toast(r.msg);r.ok?SFX.craft():SFX.fail();UI.rerender();return;}
  if(d.afit){UI.afIt=+d.afit;UI.afSel=-1;UI.afFlash=-1;UI.rerender();return;}
  if(d.aflock!==undefined){Gear.toggleLock(itemByUid(UI.afIt),+d.aflock);SFX.pick();UI.rerender();return;}
  if(d.afsel!==undefined){const i=+d.afsel;UI.afSel=UI.afSel===i?-1:i;UI.afFlash=-1;SFX.ui&&SFX.ui('cursor');UI.rerender();return;}
  if(d.afclear){UI.afSel=-1;UI.rerender();return;}
  if(d.afroll){const r=Gear.reroll(itemByUid(UI.afIt));toast(r.msg);r.ok?SFX.craft():SFX.fail();if(r.ok){UI.afFlash=-1;Save.save();}UI.rerender();return;}
  if(d.afpick){const el=document.getElementById('afPick'),r=Gear.pick(itemByUid(UI.afIt),UI.afSel,el&&el.value);toast(r.msg);r.ok?SFX.craft():SFX.fail();if(r.ok){UI.afFlash=UI.afSel;Save.save();}UI.rerender();return;}
  if(d.aftier){const r=Gear.tierUp(itemByUid(UI.afIt),UI.afSel);toast(r.msg);r.ok?SFX.level():SFX.fail();UI.afFlash=r.ok?UI.afSel:-1;Save.save();UI.rerender();return;}
  if(d.drill){const r=Gear.drill(itemByUid(+d.drill));toast(r.msg);r.ok?SFX.craft():SFX.fail();if(r.ok)Save.save();UI.rerender();return;}
  if(d.evolve){const r=Equip.evolve(itemByUid(+d.evolve));toast(r.msg);r.ok?SFX.level():SFX.fail();UI.rerender();return;}
  if(d.rpick){UI.runePick=d.rpick;UI.rerender();return;}
  if(d.sock){const[u,idx]=d.sock.split(':');const r=Equip.socketRune(itemByUid(+u),+idx,UI.runePick);toast(r.msg);r.ok?SFX.craft():SFX.fail();UI.rerender();return;}
  if(d.unsock){const[u,idx]=d.unsock.split(':');const r=Equip.unsocketRune(itemByUid(+u),+idx);toast(r.msg);r.ok?SFX.pick():SFX.fail();UI.rerender();return;}
  if(d.sbuy){const r=SpecialShop.buy(d.sbuy);toast(r.msg);r.ok?SFX.pick():SFX.fail();UI.rerender();UI.hud();return;}
  if(d.salv){Inv.salvage(itemByUid(+d.salv));UI.sel=null;SFX.pick();UI.rerender();return;}
  if(d.sell&&UI.cur==='shop'){const it=itemByUid(+d.sell);if(!it){UI.sellArm=null;UI.rerender();return;}
    if(UI.sellArm!==it.uid){UI.sellArm=it.uid;UI.rerender();return;}   // กดสองครั้งเพื่อยืนยัน กันขายผิด
    const price=Inv.sellPrice(it);if(Inv.sell(it)){UI.sel=null;UI.sellArm=null;SFX.pick();toast('ขาย '+itemName(it)+' ได้ '+price+' ทอง');}else toast('สวมอยู่ ถอดก่อนจึงขายได้');UI.rerender();return;}
  if(d.ssock!==undefined){UI.sk.sel=+d.ssock;UI.sk.cand=null;UI.sk.modal=null;SFX.talk();UI.rerender();return;}
  if(d.skpick){UI.sk.cand=d.skpick;SFX.talk&&SFX.talk();UI.rerender();return;}
  if(d.skeq){const sl=+d.slot,o=G.skills.slots.indexOf(d.skeq),prev=G.skills.slots[sl];if(o>=0&&o!==sl&&o!==3)G.skills.slots[o]=null;const r=Skills.equip(sl,d.skeq);if(r.ok&&o>=0&&o!==sl&&o!==3&&prev&&slotAccepts(o,prev))G.skills.slots[o]=prev;   /* ย้ายระหว่างช่อง = สลับกัน */r.ok?SFX.pick():toast(r.err);UI.rerender();return;}
  if(d.skun!==undefined){const r=Skills.equip(+d.skun,null);if(!r.ok)toast(r.err);UI.rerender();return;}
  if(d.skbind){UI.sk.modal='bind';UI.sk.pick=d.skbind;UI.rerender();return;}
  if(d.skbindyes){const r=Skills.bind(UI.sk.pick);UI.sk.modal=null;if(r.ok){SFX.level();toast('🔒 ผนึก '+SKILLS[UI.sk.pick].n+' ถาวรแล้ว');Save.save();}else toast(r.err);UI.rerender();return;}
  if(d.skrep){UI.sk.modal='replace';UI.sk.pick=d.skrep;UI.rerender();return;}
  if(d.skrepyes){const r=Skills.replaceUnique(UI.sk.pick);UI.sk.modal=null;if(r.ok){SFX.level();toast('🗝️ ปลดผนึกแล้ว — ผนึก '+SKILLS[UI.sk.pick].n+' ถาวรแทน');Save.save();}else toast(r.err);UI.rerender();return;}
  if(d.skno){UI.sk.modal=null;UI.rerender();return;}
  if(d.skup){const r=Skills.upgrade(d.skup);if(r.ok){SFX.craft();toast('⬆ อัปเกรด '+SKILLS[d.skup].n+' เป็น Lv.'+r.lv);Save.save();}else toast(r.err);UI.rerender();UI.hud();return;}
  if(d.cadd){UI.csAdd(d.cadd);SFX.talk();UI.rerender();return;}
  if(d.cq!==undefined){const sl=UI.cs.slots[+d.cq];if(sl){if(+d.d>0){const room=(G.mats[sl.id]||0)-UI.csInSlots(sl.id);if(room>0)sl.q+=Math.min(+d.d,room);else toast('มี '+MATS[sl.id].n+' ไม่พอ');}else{sl.q+=+d.d;if(sl.q<=0)UI.cs.slots[+d.cq]=null;}}UI.cs.phase='idle';UI.rerender();return;}
  if(d.cx!==undefined){UI.cs.slots[+d.cx]=null;UI.cs.phase='idle';UI.rerender();return;}
  if(d.boost!==undefined){const k=d.boost||'';UI.cs.boost=(k&&Inv.has(k)&&(UI.cs.boost!==k))?k:false;UI.cs.phase='idle';UI.rerender();return;}
  if(d.cfill){const r=RECIPES.find(x=>x.id===d.cfill);if(r){UI.cs.slots.fill(null);let idx=0;for(const [k,q] of Object.entries(r.mats)){const have=G.mats[k]||0;if(have>0&&idx<6)UI.cs.slots[idx++]={id:k,q:Math.min(q,have)};}UI.cs.phase='idle';UI.rerender();}return;}
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
  if(d.reroll){if(G.gold<REITEM.cost){SFX.fail();toast('เหรียญไม่พอ');return;}G.gold-=REITEM.cost;UI.reRes=[0,1,2,3].map(()=>reitemRoll(true));UI.reBought=null;UI.rerender();UI.hud();Save.save();return;}
  if(d.reclaim!==undefined){const i=+d.reclaim,it=(UI.reRes||[])[i];if(!it||UI.reBought)return;   // ซื้อได้ชิ้นเดียวต่อการสุ่ม
    if(G.bag.length>=LOOT_CONFIG.inventory.equipSlots){SFX.fail();toast('🎒 กระเป๋าเต็ม');return;}if(G.gold<REITEM.buy){SFX.fail();toast('เหรียญไม่พอ');return;}
    G.gold-=REITEM.buy;Inv.addItem(it);UI.reBought=it.uid;SFX.pick();toast('ซื้อ '+itemName(it)+' แล้ว ('+REITEM.buy+' เหรียญ)');UI.rerender();UI.hud();Save.save();return;}
  if(d.sellall&&UI.cur==='shop'){const k='g:'+d.sellall;if(UI.bulkArm!==k){UI.bulkArm=k;UI.rerender();return;}UI.bulkArm=null;const r=Inv.sellAllGear(d.sellall==='all'?null:d.sellall);if(r.n){SFX.loot('rare');toast(`ขายอุปกรณ์ ${r.n} ชิ้น ได้ ${r.g} ทอง`);}UI.rerender();UI.hud();return;}
  if(d.selljunk&&UI.cur==='shop'){if(UI.bulkArm!=='junk'){UI.bulkArm='junk';UI.rerender();return;}UI.bulkArm=null;const r=Inv.sellAllJunk();if(r.n){SFX.pick();toast(`ขายวัตถุดิบ ${r.n} ชิ้น ได้ ${r.g} ทอง`);}UI.rerender();UI.hud();return;}
  if(d.sellmat&&UI.cur==='shop'){const k=d.sellmat;if(d.q==='all'){if(UI.bulkArm!=='m:'+k){UI.bulkArm='m:'+k;UI.rerender();return;}UI.bulkArm=null;}
    const g=Inv.sellMat(k,d.q==='all'?(G.mats[k]||0):1);if(g){SFX.pick();toast(`ขาย ${MATS[k].n} ได้ ${g} ทอง`);}UI.rerender();UI.hud();return;}
  if(d.buygear){const c=+d.cost;if(G.gold<c)return;if(G.bag.length>=LOOT_CONFIG.inventory.equipSlots){toast('กระเป๋าเต็ม');return;}G.gold-=c;const it=Inv.addItem(newItem(d.buygear,'normal',G.level));SFX.pick();toast('ซื้อ '+itemName(it)+' แล้ว');UI.rerender();UI.hud();return;}
  if(d.buy){const c=+d.cost;if(G.gold<c)return;if((G.mats[d.buy]||0)+1>LOOT_CONFIG.inventory.stackMax){toast('ช่องวัตถุดิบเต็ม');return;}G.gold-=c;Inv.add(d.buy,1);SFX.pick();UI.rerender();UI.hud();return;}
  if(d.maptab){UI.mapTab=d.maptab;UI.mapSel=null;SFX.ui('cursor');if(UI.cur!=='map')UI.open('map');else UI.rerender();return;}
  if(d.owworld){UI.close();typeof OW!=='undefined'&&OW.enter(d.owworld);return;}
  if(d.owgo){UI.close();if(typeof OW!=='undefined'){if(d.owgo==='ow_home')OW.enter('home');else if(d.owgo==='ow_town'||d.owgo==='ow_city'||d.owgo==='ow_spire'||d.owgo==='ow_spire_s'||d.owgo==='ow_forest'||d.owgo==='ow_mine'||(Z&&Z.id==='overworld'))OW.interact(d.owgo);else OW.enter(d.owgo);}return;}
  if(d.mapnode){UI.mapSel=UI.mapSel===d.mapnode?null:d.mapnode;SFX.ui('cursor');UI.rerender();return;}
  if(d.mapclose){UI.mapSel=null;SFX.ui('cancel');UI.rerender();return;}
  if(d.mapcur){UI.mapSel=d.mapcur;SFX.ui('cursor');UI.rerender();const el=pn.querySelector(`[data-mapnode="${d.mapcur}"]`);if(el)el.focus();return;}
  if(d.dbg)debugAction(d.dbg);
});
pn.addEventListener('change',e=>{
  const f=e.target.dataset.f;if(f){UI.filt[f]=e.target.value;UI.rerender();return;}
  const sv=e.target.dataset.sndvol;if(sv&&(sv==='vol'||sv==='sfx')){initAudio();if(SND.vol>0&&SND.sfxVol>0)SFX.ui('confirm');}});
pn.addEventListener('input',e=>{
  if(e.target.dataset.cw!==undefined){CONFIG.comboWindow=+e.target.value;$('#cwv').textContent=CONFIG.comboWindow;}
  const sv=e.target.dataset.sndvol;
  if(sv){const pctV=Math.max(0,Math.min(100,+e.target.value||0)),v=pctV/100;
    if(sv==='vol')SND.setVol(v);else SND.setChannel(sv,v);
    const lbl=$('#sv_'+sv);if(lbl)lbl.textContent=Math.round(v*100)+'%';}});
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
  if(a==='onehit'){G.oneHit=!G.oneHit;toast(G.oneHit?'⚔️ ตีทีเดียวตาย: เปิด (เฉพาะโหมดเนื้อเรื่อง ไม่มีผลกับ PvP)':'⚔️ ตีทีเดียวตาย: ปิด',2200);}
  if(a==='pity')LOOT_CONFIG.pity.enabled=!LOOT_CONFIG.pity.enabled;
  if(a==='diff'&&!CONFIG.diffLock){const ks=Object.keys(DIFFICULTY);G.diff=ks[(ks.indexOf(G.diff||'normal')+1)%ks.length];UI.hud();}
  if(a==='p2'){G.simPlayers={P2:{luk:10}};const r=LootManager.generate({tableId:'lavarat',cls:'elite',level:8,pid:'P2',luk:10});LootManager.spawn(Z,P.x+20,P.y,r);}
  if(a==='fill'){while(G.bag.length<LOOT_CONFIG.inventory.equipSlots)Inv.addItem(newItem('a_cloth','normal',1));}
  if(a==='dropnow'){const r=LootManager.rollForPlayers({tableId:'rat',cls:'elite',level:G.level,kind:'rat'});for(const x of r)LootManager.spawn(Z,P.x+16,P.y,x);}
  if(a==='books')for(const k in MATS)if(MATS[k].skillBook)Inv.add(k,1);
  if(a==='skills'){   // เรียนทุกสกิลที่ผู้เล่นใช้ได้ แล้วจัดช่องตามเลย์เอาต์ใหม่ (ทดสอบเร็ว)
    for(const k in SKILLS)if(skillUsable(k,'player')&&!SKILLS[k].bossOnly)G.skills.learned.add(k);
    G.skills.slots=[null,null,null,null,null];G.skills.slots[3]=G.skills.bound||null;
    const cr=Object.keys(SKILLS).filter(k=>skillUsable(k,'player')&&['common','rare'].includes(SKILLS[k].tier));
    [0,1,2].forEach((i,n)=>{if(cr[n])Skills.equip(i,cr[n]);});
    const ul=Object.keys(SKILLS).find(k=>skillUsable(k,'player')&&SKILLS[k].tier==='ultimate');if(ul)Skills.equip(4,ul);
    const uq=G.talent&&TALENTS[G.talent]&&TALENTS[G.talent].skill;if(uq&&!G.skills.bound)Skills.bind(uq);
    toast('เรียนสกิลแล้ว · ช่อง 1–3 ทั่วไป/หายาก · 4 เฉพาะตัว · 5 สุดยอด',2600);}
  if(a==='skclear'){G.skills.slots=[null,null,null,null,null];G.skills.slots[3]=G.skills.bound||null;}
  if(a==='seal'){Inv.add(SEAL_BREAKER.item,1);for(const k in SKILLS)if(SKILLS[k].tier==='unique')G.skills.learned.add(k);}
  if(a==='heal'){const S=StatSync.get();G.hp=S.maxHP;G.mp=S.maxMP;}
  if(a==='lava'){UI.close();enterDungeon(1);return;}
  if(a.startsWith('sp_')){const f=+a.slice(3);UI.close();if(!debugSpireBoss(f))toast('เข้าหอคอยไม่ได้',2000);return;}
  if(a.startsWith('ap_')){const f=+a.slice(3);UI.close();if(!debugSpireBoss(f,'aether'))toast('เข้าหอ Aether ไม่ได้',2000);return;}
  if(a.startsWith('w_')){const k=a.slice(2);UI.close();
    if(k==='golem'||k==='homunculus')enterBossRoom(k);
    else if(k==='lavaking')enterDungeon(3);else enterDungeon(3,'ice');
    const b=Z.foes.find(f=>f.kind===k);if(b){b.alive=true;b.cool=180;P.x=b.x-56;P.y=b.y;if(blocked(P.x,P.y))P.x=b.x-40;}
    CAM.snap=1;G.hp=StatSync.get().maxHP;G.mp=StatSync.get().maxMP;UI.hud();toast(`🛠 วาร์ปถึงบอส ${FOES[k].n} — เดินเข้าไปเพื่อเริ่มสู้`,2500);return;}
  if(a==='tests'){const r=runTests();UI.tres=`<div class="${r.fail?'bad':'good'} big">ผ่าน ${r.pass}/${r.pass+r.fail}</div>`+r.out.map(o=>`<div class="${o.ok?'good':'bad'}">${o.ok?'✔':'✘'} ${esc(o.name)} <small class="dim">${esc(o.info||'')}</small></div>`).join('');}
  UI.rerender();UI.hud();
}
let pvCtx=null,mapPinCtx=null;
function drawMapHeroPin(){
  if(!mapPinCtx)return;const c=mapPinCtx;c.clearRect(0,0,48,48);c.imageSmoothingEnabled=false;
  try{const K=Equip.look(),Pz=poseIdle(G.t||0),J=rigPoints(Pz),sc=3.4;
    drawRig(c,24-J.hd[0]*sc,25-J.hd[1]*sc,sc,1,Pz,K);}catch(e){}
}
function drawPreview(){
  if(mapPinCtx&&G.t%4===0)drawMapHeroPin();
  if(!pvCtx)return;const c=pvCtx;c.clearRect(0,0,220,270);c.imageSmoothingEnabled=false;
  c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(110,252,52,10,0,0,7);c.fill();
  const K=sheathed(Equip.look()),ph=G.t%300;
  const run=ph>=180,dir=(ph>=90&&ph<180)||ph>=240?-1:1;
  const Pz=owPose(G.t,run,(G.t*.26)%(Math.PI*2));
  drawRig(c,110,252,6,dir,Pz,K);
}
/* ---- ข้อมูลแลนด์มาร์กทั้ง 6 จุด และภาพวาดแผนที่เกาะคอลลาวาร์รี ---- */
const WORLD_LANDMARKS=[
  {id:'town',n:'เมือง Collawarrie',sub:'ศูนย์กลางนักผจญภัย · เขตปลอดภัย',lv:'Lv.1',x:50.5,y:68.5,
   desc:'เมืองท่ากลางหุบเขาแม่น้ำคอลลาวาร์รี มีกิลด์นักผจญภัย (กระดานเควสต์) โรงตีเหล็กโบโร ร้านค้ามาร์คัส สำนักแปรธาตุ น้ำพุศักดิ์สิทธิ์ และลานประลอง',
   floors:[{id:'town',fl:'เขตเมืองหลัก',foe:['duelist'],note:'กิลด์นักผจญภัย · โรงตีเหล็ก · ร้านค้า · แปรธาตุ · น้ำพุ · ลานประลอง · bbqy'}]},
  {id:'cave',n:'ถ้ำชีส & คริสตัล',sub:'รอยแยกแร่เอเธอร์ · ชั้น 1–2',lv:'Lv.1–5',x:52.5,y:52.0,
   desc:'โพรงถ้ำธรรมชาติใกล้รอยแยกเอเธอร์กลางเกาะ ชั้นนอกเป็นที่อยู่ของฝูงหนูถ้ำ ส่วนชั้นในเต็มไปด้วยผลึกคริสตัลและนักดาบเงา',
   floors:[
     {id:'outer',fl:'ชั้น 1',foe:['rat'],note:'แหล่งไม้ แร่เหล็ก ชีส และหีบสมบัติเริ่มต้น'},
     {id:'inner',fl:'ชั้น 2',foe:['kage'],miniboss:'kage',note:'ทุบหินถล่มเพื่อเปิดทาง · ชนะคาเงะเพื่อรับกุญแจเหมืองลาวา'}]},
  {id:'stone',n:'ถ้ำหินโกเลม',sub:'หุบผาศิลาตะวันตก · ชั้น 1–3',lv:'Lv.5–7 · บอส 35',x:43.0,y:44.5,danger:1,
   desc:'เหมืองศิลาทางเทือกเขาตะวันตกที่สั่นสะเทือนจากการตื่นของโกเลมหินยักษ์',
   floors:[
     {id:'stone1',fl:'ชั้น 1',foe:['rat','mudslime','rockling'],note:'ทางเดินศิลาโบราณและกับดักซ่อน'},
     {id:'stone2',fl:'ชั้น 2',foe:['mudslime','rockling'],note:'โถงหินชั้นลึกก่อนถึงห้องผนึก'},
     {id:'golemroom',fl:'ชั้น 3 (ห้องบอส)',foe:['golem'],boss:'golem',note:'ต้องชนะคาเงะในถ้ำคริสตัลก่อนจึงปลดผนึกเข้าสู้ได้'}]},
  {id:'lava',n:'เหมืองลาวา',sub:'ปล่องภูเขาไฟตะวันออก · ชั้น 1–3',lv:'Lv.11–13 · บอส 37',x:58.2,y:47.5,danger:1,
   desc:'เหมืองแร่ไฟใต้ปล่องภูเขาไฟทางตะวันออก เต็มไปด้วยบ่อแมกมาและเงาสาวก',
   floors:[
     {id:'lava1',fl:'ชั้น 1',foe:['lavarat','shade'],note:'เข้าทางประตูเหมืองในถ้ำคริสตัล (ใช้กุญแจจากคาเงะ)'},
     {id:'lava2',fl:'ชั้น 2',foe:['lavarat','shade'],note:'โถงแมกมาชั้นลึกและหีบสมบัติลับ'},
     {id:'lava3',fl:'ชั้น 3 (ห้องบอส)',foe:['lavaking','shade'],boss:'lavaking',note:'บัลลังก์เพลิงของราชันย์ลาวา'}]},
  {id:'tower',n:'หอคอยนักแปรธาตุ',sub:'แหลมศิลาเหนือ · ชั้น 1–3',lv:'Lv.14–16 · บอส 38',x:55.8,y:32.5,danger:1,
   desc:'หอคอยทดลองริมผาทางตะวันออกเฉียงเหนือ เต็มไปด้วยแอ่งน้ำยา 4 สี การ์กอยล์ศิลา และศิลานักปราชญ์',
   floors:[
     {id:'tower1',fl:'ชั้น 1',foe:['mslime','homunc'],note:'ห้องทดลองชั้นล่าง มีแอ่งน้ำยาพิษ เพลิง มานา และพลัง'},
     {id:'tower2',fl:'ชั้น 2',foe:['mslime','homunc','gargoyle'],note:'โถงการ์กอยล์ศิลาและสไลม์ปรอท'},
     {id:'towerroom',fl:'ชั้น 3 (ห้องบอส)',foe:['homunculus'],boss:'homunculus',note:'ห้องทดลองยอดหอของนักแปรธาตุที่บิดเบี้ยว'}]},
  {id:'ice',n:'ถ้ำน้ำแข็ง & วิหารเซราฟ',sub:'ยอดเขาหิมะเหนือสุด · ชั้น 1–3',lv:'Lv.18–20 · บอส 40',x:50.8,y:23.0,danger:1,
   desc:'ยอดเขาหิมะนิรันดร์ทางเหนือสุดของเกาะ ลึกเข้าไปคือวิหารศักดิ์สิทธิ์แห่งเซราฟตาเดียว',
   floors:[
     {id:'ice1',fl:'ชั้น 1',foe:['frostslime','frostwolf','iceknight'],note:'โพรงถ้ำน้ำแข็งชั้นนอก'},
     {id:'ice2',fl:'ชั้น 2',foe:['frostwolf','iceknight','icegolem'],note:'โถงเสาน้ำแข็งและโกเลมเหมันต์'},
     {id:'sanctum',fl:'ชั้น 3 (ห้องบอส)',foe:['seraph'],boss:'seraph',note:'วิหารน้ำแข็งดวงตาเทวทูต — บอสสูงสุดของเกาะ'}]}
];
function mapQuestInfo(){
  const byZone={},byLm={},all=[];
  const lmOf=zid=>(WORLD_LANDMARKS.find(l=>l.floors.some(f=>f.id===zid))||WORLD_LANDMARKS[0]).id;
  const targetZone=(id,step)=>{
    if(id==='main1')return step<=1?'town':step===2?'outer':step===3?'inner':'golemroom';
    if(id==='hunt')return 'outer';
    if(id==='pan')return 'inner';
    if(id==='lava')return step===0?'inner':step===1?'lava2':'lava3';
    return 'town';
  };
  for(const id of Object.keys(QUESTS)){
    const q=QUESTS[id],s=G.q&&G.q[id];if(!s||!s.active||s.done)continue;
    const step=Math.min(s.step||0,q.steps.length-1),zid=targetZone(id,step),lmId=lmOf(zid);
    const stepTxt=q.steps[step]+(id==='hunt'?` (${s.count||0}/3)`:'');
    const entry={id,q,step,stepTxt,zoneId:zid,lmId};
    (byZone[zid]=byZone[zid]||[]).push(entry);
    (byLm[lmId]=byLm[lmId]||[]).push(entry);
    all.push(entry);
  }
  all.sort((a,b)=>(a.q.type==='หลัก'?0:1)-(b.q.type==='หลัก'?0:1));
  return{byZone,byLm,top:all[0]||null};
}
const WM_ICONS={
  town:'<svg viewBox="0 0 32 32"><path d="M5 27V15l4-4 4 4v12zM13 27V11l5-6 5 6v16zM21 27V16l3-3 3 3v11z" fill="#f7f2e7" stroke="#23170b" stroke-width="1.8" stroke-linejoin="round"/><path d="M15.5 27v-6a2.5 2.5 0 0 1 5 0v6z" fill="#3a2410"/><rect x="16.8" y="13" width="2.4" height="3.2" fill="#3a2410"/><path d="M18 5V2l4 1.5-4 1.5" fill="#d94832" stroke="#23170b" stroke-width=".8"/></svg>',
  cave:'<svg viewBox="0 0 32 32"><path d="M4 26L10 9l6-3 7 4 5 16z" fill="#706255" stroke="#23170b" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 26c0-7 3-11 6-11s6 4 6 11z" fill="#18121e"/><path d="M16 7l3 5-3 7-3-7zM22 13l2 3-2 5-2-5zM10 14l2 3-2 4-2-4z" fill="#6ae2ff" stroke="#18364a" stroke-width="1"/></svg>',
  stone:'<svg viewBox="0 0 32 32"><path d="M5 26L8 10l8-4 8 4 3 16z" fill="#8d8273" stroke="#23170b" stroke-width="1.8" stroke-linejoin="round"/><path d="M11 26V15l5-3 5 3v11z" fill="#231d18"/><circle cx="13.5" cy="12" r="1.5" fill="#5fe0a0"/><circle cx="18.5" cy="12" r="1.5" fill="#5fe0a0"/></svg>',
  lava:'<svg viewBox="0 0 32 32"><path d="M4 26L11 8l5 3 5-3 7 18z" fill="#5c3428" stroke="#23170b" stroke-width="1.8" stroke-linejoin="round"/><path d="M11 8l5 3 5-3-2 6-3 2-3-2z" fill="#ff6a22"/><path d="M13 26c0-5 1.5-8 3-8s3 3 3 8z" fill="#ffae32"/></svg>',
  tower:'<svg viewBox="0 0 32 32"><path d="M11 27l1-15h8l1 15z" fill="#68587a" stroke="#23170b" stroke-width="1.8"/><path d="M9 12l7-8 7 8z" fill="#463659" stroke="#23170b" stroke-width="1.8" stroke-linejoin="round"/><circle cx="16" cy="16" r="2.4" fill="#7af0c0"/><path d="M14 27v-5h4v5z" fill="#22152e"/></svg>',
  ice:'<svg viewBox="0 0 32 32"><path d="M5 26l6-16 5-5 5 5 6 16z" fill="#b8e2f8" stroke="#1a2e42" stroke-width="1.8" stroke-linejoin="round"/><path d="M16 5l4 10-4 11-4-11z" fill="#eaf8ff"/><ellipse cx="16" cy="15" rx="4.2" ry="2.6" fill="#fff2a8" stroke="#23170b" stroke-width="1.2"/><circle cx="16" cy="15" r="1.3" fill="#2a5885"/></svg>'
};
const WM_ART_SVG=`<svg class="wm-art" viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="wmSea" cx="52%" cy="47%" r="65%">
      <stop offset="0%" stop-color="#5d7987"/>
      <stop offset="52%" stop-color="#435a67"/>
      <stop offset="88%" stop-color="#2b3d47"/>
      <stop offset="100%" stop-color="#1b2830"/>
    </radialGradient>
    <linearGradient id="wmIsle" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c6d69e"/>
      <stop offset="45%" stop-color="#9cb870"/>
      <stop offset="100%" stop-color="#769450"/>
    </linearGradient>
    <linearGradient id="wmSepia" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#dec79e"/>
      <stop offset="55%" stop-color="#ba9b6e"/>
      <stop offset="100%" stop-color="#8c6d45"/>
    </linearGradient>
    <linearGradient id="wmGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f5dea0"/>
      <stop offset="50%" stop-color="#c89e52"/>
      <stop offset="100%" stop-color="#7d5a24"/>
    </linearGradient>
    <radialGradient id="wmRift" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#7ce4ff" stop-opacity=".85"/>
      <stop offset="100%" stop-color="#2a8aff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- พื้นน้ำทะเลโบราณ -->
  <rect width="960" height="540" fill="url(#wmSea)"/>
  <!-- เส้นเข็มทิศเดินเรือ (Rhumb Lines) และวงกลมแผนที่ -->
  <g stroke="rgba(235,222,192,.14)" stroke-width="1" fill="none">
    <circle cx="290" cy="250" r="95"/><circle cx="290" cy="250" r="210"/><circle cx="290" cy="250" r="340"/>
    <circle cx="495" cy="270" r="190" stroke-dasharray="4 4"/>
    <path d="M290 0v540M0 250h960M40 0l500 540M540 0L40 540M0 110l960 320M0 390L960 110M160 0l260 540M420 0L160 540"/>
    <circle cx="725" cy="180" r="110"/>
    <path d="M725 0v540M480 180h480M550 5l350 350M900 5L550 355"/>
  </g>
  <!-- น้ำวนโบราณทางตะวันตกของเกาะ -->
  <g transform="translate(322,265)" stroke="rgba(240,235,220,.55)" fill="none" stroke-linecap="round">
    <path d="M0 0c4-4 10-2 11 4 1 8-7 13-15 11-10-2-15-13-12-22 4-12 18-17 29-12" stroke-width="1.6"/>
    <path d="M-4 -3c6-5 15-1 16 7 2 10-8 18-18 15" stroke-width="1.1" stroke-dasharray="3 2"/>
    <circle cx="0" cy="0" r="2.2" fill="#e8eef2"/>
  </g>
  <!-- ทวีปปริศนาสีซีเปียทางซ้ายล่าง (ดินแดนภายนอก) + สะพานเชื่อม -->
  <g>
    <path d="M18 280 C45 256,95 254,132 272 C164 287,188 265,220 264 C248 263,280 286,315 314 C302 346,272 375,268 408 C264 440,245 486,214 516 L18 516 Z" fill="rgba(20,15,10,.38)" transform="translate(4,6)"/>
    <path d="M18 280 C45 256,95 254,132 272 C164 287,188 265,220 264 C248 263,280 286,315 314 C302 346,272 375,268 408 C264 440,245 486,214 516 L18 516 Z" fill="url(#wmSepia)" stroke="#5c4428" stroke-width="2.2"/>
    <!-- ร่องน้ำและภูเขาในทวีปซีเปีย -->
    <path d="M128 355 C155 340,192 332,226 350 C205 378,195 425,180 495" fill="none" stroke="#4c3923" stroke-width="5" opacity=".65"/>
    <path d="M62 325l18-24 18 24M92 338l22-28 20 28M155 305l18-22 18 22M222 320l20-25 18 25M135 430l22-28 22 28M172 442l20-24 18 24" fill="#a38258" stroke="#5c4428" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- เกาะพักกลางช่องแคบ + สะพานไม้ 2 ช่วง -->
    <path d="M312 313 L340 296 M366 304 L412 324" stroke="#8c6742" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M312 313 L340 296 M366 304 L412 324" stroke="#d8b98a" stroke-width="2" stroke-dasharray="3 3"/>
    <path d="M336 293 C345 282,364 284,370 297 C368 310,348 314,336 302 Z" fill="#c7ba95" stroke="#574730" stroke-width="1.8"/>
    <path d="M345 297l8-11 8 11z" fill="#8f7e68" stroke="#4a3c2a" stroke-width="1.1"/>
  </g>
  <!-- เกาะหลัก: อาณาจักรคอลลาวาร์รี (ตรงกลาง) -->
  <g>
    <!-- เส้นคลื่นรอบชายฝั่ง -->
    <path d="M488 94 C515 96,536 124,552 152 C568 180,584 202,580 226 C576 242,554 246,564 260 C582 276,592 312,580 346 C568 378,538 394,528 424 C518 450,492 456,472 442 C450 426,442 390,426 356 C410 322,386 286,384 248 C382 212,398 178,424 152 C448 128,464 92,488 94 Z"
      fill="none" stroke="rgba(220,238,245,.22)" stroke-width="11"/>
    <path d="M488 94 C515 96,536 124,552 152 C568 180,584 202,580 226 C576 242,554 246,564 260 C582 276,592 312,580 346 C568 378,538 394,528 424 C518 450,492 456,472 442 C450 426,442 390,426 356 C410 322,386 286,384 248 C382 212,398 178,424 152 C448 128,464 92,488 94 Z"
      fill="none" stroke="rgba(235,245,250,.35)" stroke-width="4"/>
    <!-- เกาะเล็กทางตะวันออกเฉียงเหนือ -->
    <path d="M556 122 C566 112,582 116,584 130 C584 142,566 146,556 136 Z" fill="#b4c48a" stroke="#4b3d2a" stroke-width="1.8"/>
    <path d="M563 132l7-11 7 11z" fill="#8c7a62" stroke="#423424" stroke-width="1.1"/>
    <!-- แผ่นดินหลักของเกาะ -->
    <path d="M488 98 C513 100,533 126,548 154 C564 180,580 202,576 225 C572 240,550 245,560 260 C578 276,588 310,576 344 C564 374,535 390,525 420 C515 445,492 450,474 436 C453 420,445 386,430 354 C414 320,390 285,388 248 C386 214,402 180,426 155 C450 130,465 96,488 98 Z"
      fill="#d8c396" stroke="#473620" stroke-width="2.5"/>
    <path d="M488 103 C511 105,530 130,544 156 C559 181,574 202,570 224 C566 238,546 244,555 259 C572 274,581 308,570 340 C559 369,531 385,521 414 C512 438,491 443,475 430 C456 415,448 382,434 351 C419 318,396 284,394 248 C392 216,407 183,430 159 C452 135,466 101,488 103 Z"
      fill="url(#wmIsle)"/>
    <!-- เขตหิมะทางเหนือสุด (ถ้ำน้ำแข็ง & วิหารเซราฟ) -->
    <path d="M488 103 C510 105,528 128,539 150 C518 162,498 158,478 160 C460 162,445 154,438 148 C455 126,468 101,488 103 Z"
      fill="#dfeef7" opacity=".85"/>
    <!-- เขตภูเขาไฟทางตะวันออก (เหมืองลาวา) -->
    <path d="M532 232 C555 236,574 268,574 304 C572 332,555 352,535 352 C516 350,508 320,512 286 C515 256,520 230,532 232 Z"
      fill="#7a5442" opacity=".75"/>
    <!-- แม่น้ำสายเหนือและสายใต้ผ่ากลางเกาะ -->
    <path d="M466 184 C485 196,512 214,552 218 L575 218" fill="none" stroke="#3b5866" stroke-width="7" stroke-linecap="round"/>
    <path d="M466 184 C485 196,512 214,552 218 L575 218" fill="none" stroke="#688e9e" stroke-width="4" stroke-linecap="round"/>
    <path d="M484 266 C474 294,466 318,476 340 C488 362,508 372,516 406" fill="none" stroke="#3b5866" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M484 266 C474 294,466 318,476 340 C488 362,508 372,516 406" fill="none" stroke="#688e9e" stroke-width="3.8" stroke-linecap="round"/>
    <!-- สะพานข้ามแม่น้ำบนเกาะ -->
    <path d="M540 211 L548 225 M470 328 L482 328 M506 384 L518 380" stroke="#9e7446" stroke-width="4" stroke-linecap="round"/>
    <!-- เทือกเขาหินทางตะวันตก (ถ้ำหินโกเลม) -->
    <g stroke="#3e3022" stroke-width="1.4" stroke-linejoin="round">
      <polygon points="396,232 414,198 432,232" fill="#8c7a66"/><polygon points="414,198 432,232 421,232" fill="#cbb9a1"/>
      <polygon points="414,250 434,212 454,250" fill="#7d6b58"/><polygon points="434,212 454,250 442,250" fill="#c2af96"/>
      <polygon points="398,272 418,236 438,272" fill="#857360"/><polygon points="418,236 438,272 426,272" fill="#c7b59c"/>
      <polygon points="422,284 442,248 460,284" fill="#786654"/><polygon points="442,248 460,284 449,284" fill="#bda98e"/>
    </g>
    <!-- เทือกเขาหิมะทางเหนือ (ถ้ำน้ำแข็ง & วิหารเซราฟ) -->
    <g stroke="#2c3e50" stroke-width="1.4" stroke-linejoin="round">
      <polygon points="454,154 474,116 494,154" fill="#7b93a6"/><polygon points="474,116 494,154 482,154" fill="#eef7fc"/>
      <polygon points="482,146 502,108 522,146" fill="#6d8699"/><polygon points="502,108 522,146 510,146" fill="#ffffff"/>
      <polygon points="436,174 454,142 472,174" fill="#8399ab"/><polygon points="454,142 472,174 461,174" fill="#e6f2fa"/>
    </g>
    <!-- เทือกเขาไฟทางตะวันออก (เหมืองลาวา) -->
    <g stroke="#2e1812" stroke-width="1.4" stroke-linejoin="round">
      <polygon points="526,282 548,238 570,282" fill="#593328"/><polygon points="548,238 570,282 556,282" fill="#8c5240"/>
      <ellipse cx="548" cy="241" rx="5" ry="2.2" fill="#ff6a22"/>
      <polygon points="516,312 536,274 556,312" fill="#4f2d23"/><polygon points="536,274 556,312 545,312" fill="#7d4838"/>
      <polygon points="538,332 556,296 574,332" fill="#593328"/>
    </g>
    <!-- เส้นทางเดินเชื่อม 6 แลนด์มาร์กบนเกาะ -->
    <path d="M485 370 C492 335,500 305,504 280 M504 280 C475 266,445 256,418 242 M504 280 C526 272,545 266,558 258 M504 280 C516 235,528 205,536 176 M536 176 C522 154,504 138,488 126"
      fill="none" stroke="#61492c" stroke-width="2.4" stroke-dasharray="4 3" stroke-linecap="round"/>
    <!-- รอยแยกคริสตัลเอเธอร์กลางเกาะ (Aether Rift สีฟ้าสว่างเหมือนในภาพตัวอย่าง) -->
    <g transform="translate(486,268)">
      <circle cx="0" cy="0" r="32" fill="url(#wmRift)"/>
      <path d="M-24 -26 L24 26 M24 -26 L-24 26" stroke="#48c8ff" stroke-width="4.5" stroke-linecap="round" opacity=".75"/>
      <path d="M-20 -22 L20 22 M20 -22 L-20 22" stroke="#e8fbff" stroke-width="2" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="5" fill="#ffffff"/>
    </g>
  </g>
  <!-- กรอบทองและเสาประดับสไตล์แฟนตาซี JRPG รอบแผนที่ -->
  <g pointer-events="none">
    <!-- ม่านม้วนแผนที่ด้านบน -->
    <path d="M0 0h960v22C820 34,710 14,620 26C540 36,420 36,340 26C250 14,140 34,0 22Z" fill="#c9b186" stroke="#594122" stroke-width="1.8" opacity=".92"/>
    <!-- เสาประดับซ้าย-ขวา -->
    <rect x="0" y="0" width="18" height="540" fill="url(#wmGold)" stroke="#4a3314" stroke-width="1.5"/>
    <rect x="942" y="0" width="18" height="540" fill="url(#wmGold)" stroke="#4a3314" stroke-width="1.5"/>
    <!-- เมฆและตราสัญลักษณ์มุมซ้ายล่าง & ขวาล่าง -->
    <path d="M18 425 C48 422,68 442,74 462 C98 458,118 476,122 498 C144 496,158 512,162 526 L18 526 Z" fill="#cbb99c" stroke="#5e4930" stroke-width="1.6" opacity=".9"/>
    <path d="M942 425 C912 422,892 442,886 462 C862 458,842 476,838 498 C816 496,802 512,798 526 L942 526 Z" fill="#cbb99c" stroke="#5e4930" stroke-width="1.6" opacity=".9"/>
    <!-- เข็มทิศทองมุมขวาล่าง -->
    <g transform="translate(835,455)" stroke="#5c4018" stroke-width="1.2">
      <circle cx="0" cy="0" r="34" fill="rgba(26,20,12,.45)" stroke="url(#wmGold)" stroke-width="2.2"/>
      <circle cx="0" cy="0" r="24" fill="none" stroke="url(#wmGold)" stroke-dasharray="3 2"/>
      <polygon points="0,-44 7,-10 42,0 7,10 0,44 -7,10 -42,0 -7,-10" fill="url(#wmGold)"/>
      <circle cx="0" cy="0" r="6" fill="#fff1c2"/>
    </g>
    <!-- ขอบทองด้านล่างพร้อมตราโล่ -->
    <rect x="0" y="524" width="960" height="16" fill="url(#wmGold)" stroke="#4a3314" stroke-width="1.5"/>
    <path d="M462 524 l18 -16 l18 16 Z M310 524 l10 -10 l10 10 Z M630 524 l10 -10 l10 10 Z M190 524 l8 -8 l8 8 Z M754 524 l8 -8 l8 8 Z" fill="url(#wmGold)" stroke="#4a3314" stroke-width="1.2"/>
    <rect x="2" y="2" width="956" height="536" fill="none" stroke="url(#wmGold)" stroke-width="3.5"/>
  </g>
</svg>`;
/* ---- battle HUD (canvas · FINAL FANTASY RESONANCE) ---- */
function para(x,y,w,h,sk){D.beginPath();D.moveTo(x+sk,y);D.lineTo(x+w+sk,y);D.lineTo(x+w,y+h);D.lineTo(x,y+h);D.closePath();}
function portrait(f,x,y,w,h,flip){
  D.save();para(x,y,w,h,14);D.clip();
  const bg=D.createLinearGradient(x,y,x,y+h);bg.addColorStop(0,'#132e72');bg.addColorStop(1,'#050c22');D.fillStyle=bg;D.fillRect(x,y,w+20,h);
  const gr=D.createRadialGradient(x+w/2+6,y+h*.45,4,x+w/2+6,y+h*.45,w*.8);
  gr.addColorStop(0,f.isP?'rgba(100,210,255,.45)':f.elite?'rgba(255,215,110,.45)':'rgba(255,110,90,.35)');gr.addColorStop(1,'rgba(4,10,28,0)');
  D.fillStyle=gr;D.fillRect(x,y,w+20,h);
  if(f.rig){const Pz=poseIdle(0),J=rigPoints(Pz),ck=f.look&&f.look.custom,hm=ck==='skel_overlord'||ck==='blueflame_knight'||ck==='spire_knight'?1.26:ck==='skel_knight'?1.14:ck==='skel_warrior'?1.05:1,sc=hm>1.15?5.8:7,dir=flip?-1:1;drawRig(D,x+w/2+7-J.hd[0]*hm*sc*dir,y+h/2+6-J.hd[1]*hm*sc,sc,dir,Pz,f.look);}
  else{const d=f.def;{const pm=SPR[d.map]||GOLEM,rat=d.h<60;spr(D,pm,PAL[d.pal],x+w/2+8,y+h+(rat?4:d.map==='ANGEL'?70:83),rat?7:d.map==='ANGEL'?6:9,flip&&rat);}}
  D.restore();
  D.strokeStyle=f.isP?'rgba(122,216,255,.92)':f.elite?'rgba(255,217,138,.95)':'rgba(255,150,130,.85)';D.lineWidth=2;para(x,y,w,h,14);D.stroke();
  D.strokeStyle='rgba(255,255,255,.35)';D.lineWidth=1;para(x+2,y+2,w-4,h-4,12);D.stroke();
}
function statusIcons(f,x,y,right){
  const good=[],bad=[];
  const sg=(k,fb,fc)=>({gi:(typeof STATUS_GI!=='undefined'&&STATUS_GI[k]&&STATUS_GI[k][0])||null,col:(typeof STATUS_GI!=='undefined'&&STATUS_GI[k]&&STATUS_GI[k][1])||fc,ic:fb});
  const seenG=new Set();
  for(const m of f.mods||[]){
    if(m.grp){if(seenG.has(m.grp))continue;seenG.add(m.grp);}   // บัฟชุดเดียวกัน (เช่น Blink ทุกค่า +5%) แสดงป้ายเดียว
    const dk=m.kind==='debuff'?'modDebuff':'modBuff';
    const item=Object.assign(sg(dk,m.kind==='debuff'?'▼':'▲',m.kind==='debuff'?'#ff7a7a':'#5affb0'),{lbl:`${m.n||m.id} ${(m.ttl/60).toFixed(1)}วิ`,pct:clamp(m.ttl/Math.max(1,m.max||m.ttl),0,1)});
    (m.kind==='debuff'?bad:good).push(item);
  }
  if(f.kingAuraT>0)good.push(Object.assign(sg('kingAura','👑','#ffd23a'),{lbl:`ออร่าราชา ${(f.kingAuraT/60).toFixed(1)}วิ`,pct:clamp(f.kingAuraT/360,0,1)}));
  if(f.parryBuffT>0)good.push(Object.assign(sg('parryBuff','⚔','#d8f8ff'),{lbl:`True DMG ${(f.parryBuffT/60).toFixed(1)}วิ`,pct:clamp(f.parryBuffT/180,0,1)}));
  if(f.armorBuff>0)good.push(Object.assign(sg('armorBuff','🛡','#9fd0ff'),{lbl:`เกราะแข็ง ${(f.armorBuff/60).toFixed(1)}วิ`,pct:clamp(f.armorBuff/240,0,1)}));
  const iwDefM=f.mods&&f.mods.find(m=>m.id==='ironwall_def'&&m.ttl>0),iwMdefM=f.mods&&f.mods.find(m=>m.id==='ironwall_mdef'&&m.ttl>0);
  if(iwDefM)good.push(Object.assign(sg('armorBuff','🛡','#7ad8ff'),{lbl:`+${iwDefM.v} DEF ${(iwDefM.ttl/60).toFixed(1)}วิ`,pct:clamp(iwDefM.ttl/(iwDefM.max||720),0,1)}));
  if(f.buffT>0)good.push(Object.assign(sg('buff','✨','#a8ffca'),{lbl:`เสริมพลัง ${(f.buffT/60).toFixed(1)}วิ`,pct:clamp(f.buffT/240,0,1)}));
  if(f.vanishT>0)good.push(Object.assign(sg('vanish','💨','#bff0ff'),{lbl:`หายตัว ${(f.vanishT/60).toFixed(1)}วิ`,pct:clamp(f.vanishT/180,0,1)}));
  if(f.fireShieldT>0)good.push(Object.assign(sg('fireShield','🔥','#ff8a3a'),{lbl:`เกราะเพลิง ${(f.fireShieldT/60).toFixed(1)}วิ`,pct:clamp(f.fireShieldT/600,0,1)}));
  if(f.stunImm>0&&!(f.st8&&f.st8.stun))good.push(Object.assign(sg('stunImm','🔰','#7af0c0'),{lbl:`ต้านมึน ${(f.stunImm/60).toFixed(1)}วิ`,pct:clamp(f.stunImm/180,0,1)}));
  if(f.invuln>30||(f.reviveN||0)>0&&f.invuln>0)good.push(Object.assign(sg('armorBuff','🛡️','#ff9aff'),{lbl:`อมตะ ${(f.invuln/60).toFixed(1)}วิ`,pct:clamp(f.invuln/180,0,1)}));
  if(f.rootT>0)bad.push(Object.assign(sg('freeze','⛓️','#8ef2ff'),{lbl:`แช่ขยับไม่ได้ ${(f.rootT/60).toFixed(1)}วิ`,pct:clamp(f.rootT/240,0,1)}));

  for(const s of Status.list(f)){
    const extra=s.k==='freeze'?` ${s.hits||0}/5`:s.stacks>1?'×'+s.stacks:'';
    bad.push(Object.assign(sg(s.k,STI[s.k],STC[s.k]),{lbl:`${STN[s.k]}${extra} ${(s.t/60).toFixed(1)}วิ`,pct:clamp(s.t/(s.k==='freeze'?480:s.k==='chaos'?240:CONFIG.statusDur),0,1)}));
  }
  if(f.rootT>0)bad.push(Object.assign(sg('root','⛓','#ffd23a'),{lbl:`ล็อคขา ${(f.rootT/60).toFixed(1)}วิ`,pct:clamp(f.rootT/180,0,1)}));
  if(f.penalty>0)bad.push(Object.assign(sg('penalty','⚠','#ff9a5a'),{lbl:`เสียหลัก ${(f.penalty/60).toFixed(1)}วิ`,pct:clamp(f.penalty/120,0,1)}));
  if(f.guardBroken>0)bad.push(Object.assign(sg('guardBroken','💔','#ff5a5a'),{lbl:`การ์ดแตก ${(f.guardBroken/60).toFixed(1)}วิ`,pct:clamp(f.guardBroken/CONFIG.guard.breakT,0,1)}));

  const drawTier=(arr,ry,isBad)=>{
    if(!arr.length)return ry;
    const brd=isBad?'#ff5252':'#40eb7a',bgTop=isBad?'rgba(74,14,22,.94)':'rgba(12,58,30,.94)',bgBot=isBad?'rgba(32,6,12,.94)':'rgba(6,28,16,.94)',bar=isBad?'#ff7878':'#5aff90',tc=isBad?'#ffe4e4':'#dcffe8';
    D.save();D.font='700 10px Sarabun,sans-serif';D.textBaseline='middle';
    let cx=x;
    for(const it of arr){
      const im=it.gi&&typeof giImg==='function'?giImg(it.gi,it.col||tc):null,hasImg=im&&im.complete&&im.naturalWidth;
      const lblW=Math.ceil(D.measureText(it.lbl).width),icoW=hasImg?18:Math.ceil(D.measureText(it.ic+' ').width);
      const bw=Math.max(60,icoW+lblW+14),bx=right?cx-bw:cx;
      const gr=D.createLinearGradient(0,ry,0,ry+23);gr.addColorStop(0,bgTop);gr.addColorStop(1,bgBot);
      D.fillStyle=gr;rrect(bx,ry,bw,23,5);D.fill();
      D.strokeStyle=it.col||brd;D.lineWidth=1.4;D.stroke();
      if(hasImg){
        D.fillStyle='rgba(4,8,18,.78)';rrect(bx+3,ry+3,16,16,3);D.fill();
        D.drawImage(im,bx+4,ry+4,14,14);
        D.fillStyle=tc;D.textAlign='left';D.fillText(it.lbl,bx+23,ry+11);
      }else{
        D.fillStyle=it.col||tc;D.textAlign='left';D.fillText(it.ic,bx+6,ry+11);
        D.fillStyle=tc;D.fillText(it.lbl,bx+6+D.measureText(it.ic+' ').width,ry+11);
      }
      D.fillStyle=it.col||bar;D.fillRect(bx+2,ry+20,(bw-4)*it.pct,2);
      cx=right?bx-5:bx+bw+5;
    }
    D.restore();
    return ry+27;
  };
  let ny=y;
  ny=drawTier(good,ny,false);
  drawTier(bad,ny,true);
}
function hpBarB(f,right){
  D.save();if(right){D.translate(960,0);D.scale(-1,1);}
  const x=104,y=18,w=322,h=24,frac=clamp(f.hp/f.maxHp,0,1),dfrac=clamp(f.dhp/f.maxHp,0,1);
  para(x-4,y-4,w+10,h+8,12);D.fillStyle='rgba(5,12,34,.92)';D.fill();
  D.strokeStyle=f.elite&&!f.isP?'rgba(255,217,138,.78)':'rgba(130,202,255,.72)';D.lineWidth=1.4;D.stroke();
  para(x,y,w,h,10);D.fillStyle='#09132e';D.fill();
  D.save();para(x,y,w,h,10);D.clip();D.fillStyle='#e03630';D.fillRect(x,y,(w+12)*dfrac,h);
  const gr=D.createLinearGradient(x,0,x+w,0);
  if(frac>.3){gr.addColorStop(0,'#1cb898');gr.addColorStop(.55,'#5cf0b6');gr.addColorStop(1,'#ffe98a');}
  else{gr.addColorStop(0,'#c82626');gr.addColorStop(1,'#ff9444');}
  D.fillStyle=gr;D.fillRect(x,y,(w+12)*frac,h);
  D.fillStyle='rgba(255,255,255,.32)';D.fillRect(x,y,w+12,4);
  D.fillStyle='rgba(4,10,28,.35)';for(let t=1;t<=3;t++)D.fillRect(x+w*t*.25,y,1.2,h);
  D.restore();
  if(f.isP||f.isP2){const bars=[[f.mp/f.S.maxMP,'#2062d8','#8ee4ff'],[f.sta/f.S.maxSTA,'#249c48','#a8ff7c']];bars.forEach(([v,c1,c2],i)=>{const py=y+h+7+i*10;
    para(x+14,py,280,7,5);D.fillStyle='rgba(5,12,34,.92)';D.fill();D.strokeStyle='rgba(122,216,255,.35)';D.lineWidth=1;D.stroke();
    D.save();para(x+14,py,280,7,5);D.clip();const g2=D.createLinearGradient(x,0,x+300,0);g2.addColorStop(0,c1);g2.addColorStop(1,c2);D.fillStyle=g2;D.fillRect(x+14,py,290*clamp(v,0,1),7);D.restore();});
    const dcMax=CONFIG.dashMax||2,dc=clamp(f.dashCharges??dcMax,0,dcMax),cdTot=CONFIG.dashCD||120,dy=y+h+27,gap=6,sw=(280-gap*(dcMax-1))/dcMax;
    for(let i=0;i<dcMax;i++){const sx=x+14+i*(sw+gap),ready=i<dc,sf=ready?1:(i===dc&&f.dashCD>0?clamp(1-f.dashCD/cdTot,0,1):0);
      para(sx,dy,sw,8,5);D.fillStyle='rgba(5,12,34,.92)';D.fill();D.strokeStyle=ready?'rgba(142,242,255,.88)':'rgba(122,216,255,.32)';D.lineWidth=1;D.stroke();
      if(sf>0){D.save();para(sx,dy,sw,8,5);D.clip();const g3=D.createLinearGradient(sx,0,sx+sw,0);g3.addColorStop(0,ready?'#0ea5e9':'#0c4a6e');g3.addColorStop(1,ready?'#8ef2ff':'#38bdf8');D.fillStyle=g3;D.fillRect(sx,dy,(sw+6)*sf,8);D.restore();}}}
  D.restore();
  const tx=right?960-124:124,isMe=BT&&BT.vs?(BT.net==='guest'?f===BT.e:f===BT.p):f.isP;
  outlineText(`${Math.ceil(f.hp)} / ${f.maxHp}`,right?960-118:118,30,13,'#ffffff',right?'right':'left');
  if(f.isP||f.isP2){const dcMax=CONFIG.dashMax||2,dc=clamp(f.dashCharges??dcMax,0,dcMax),cdTxt=dc<dcMax&&f.dashCD>0?' · '+(f.dashCD/60).toFixed(1)+'s':'';
    outlineText(`DASH [Space] ${dc}/${dcMax}${cdTxt}`,right?960-258:258,73,9.5,dc>0?'#e6f8ff':'#ff9a8a');}
  if(f.isP&&!BT.vs){outlineText(`MP ${Math.floor(f.mp)}/${f.S.maxMP}`,396,52,10,'#9be0ff','right');outlineText(`STA ${Math.floor(f.sta)}`,396,62,10,'#a8ff8c','right');}
  outlineText(f.vsName?`Lv.${f.lv} ${f.vsName}${BT.net&&isMe?' (คุณ)':''} · ${WEAPONS[f.wpn].n}`:`Lv.${f.lv} ${f.isP?pname()+' · '+WEAPONS[f.wpn].n:f.name}`,tx,f.vsName?88:(f.isP?90:56),15,f.vsName?(isMe?'#7ad8ff':'#ff9a8a'):f.elite?'#ffd98a':'#eef6ff',right?'right':'left',D,undefined,295);
  if(!f.isP&&f.def&&f.def.phases)outlineText(`เฟส ${f.ph+1}/${f.def.phases.length+1}`,tx,76,12,'#ff9a8a','right');
  statusIcons(f,right?950:14,(f.isP||f.isP2)?104:94,right);
  if((f.isP||f.isP2)&&(!BT.net||isMe)){   // การ์ด: วางเหนือเกจท่าไม้ตายของจอใครจอมัน (โลคัล P2 อยู่มุมขวาล่าง)
    const putRight=BT.net?false:right,al=putRight?'right':'left',lx=putRight?946:14,gy=398;
    if(f.guardBroken>0){outlineText(`การ์ดแตก! ป้องกันไม่ได้ ${(f.guardBroken/60).toFixed(1)} วิ`,lx,gy,12,'#ff6a4a',al);}
    else{outlineText('การ์ด [E]',lx,gy,11,'#9fd8ff',al);const mg=typeof maxGuard==='function'?maxGuard(f):CONFIG.guard.max;for(let i=0;i<mg;i++){const bx=putRight?lx-62-i*16:lx+58+i*16;
      D.fillStyle=i<f.guardLeft?'#8ee4ff':'rgba(122,216,255,.16)';D.strokeStyle=i<f.guardLeft?'#ffd98a':'rgba(122,216,255,.35)';D.lineWidth=1;
      D.beginPath();D.moveTo(bx+6,gy-7);D.lineTo(bx+13,gy-1);D.lineTo(bx+6,gy+6);D.lineTo(bx-1,gy-1);D.closePath();D.fill();D.stroke();}}}
  portrait(f,right?960-92-14:6,8,86,62,right);
}
function drawBattleFlash(b){
  const f=b.flash.f,lft=f.x<BW/2;D.save();D.beginPath();D.moveTo(0,190);D.lineTo(960,150);D.lineTo(960,300);D.lineTo(0,340);D.closePath();
  const gr=D.createLinearGradient(0,0,960,0);gr.addColorStop(0,'rgba(10,8,20,.95)');gr.addColorStop(.5,ELC[b.flash.m.el]||'#ffd23a');gr.addColorStop(1,'rgba(10,8,20,.95)');D.fillStyle=gr;D.fill();D.clip();
  for(let i=0;i<24;i++){const y=150+hash(i,3)*190,xo=((G.t*30+hash(i,7)*960)%1200)-120;D.fillStyle='rgba(255,255,255,.35)';D.fillRect(lft?960-xo:xo,y,80,2);}
  const cx=lft?250:710;
  if(f.rig){const Pz=poseIdle(0),J=rigPoints(Pz),sc=16,dir=lft?1:-1;drawRig(D,cx-J.hd[0]*sc*dir,250-J.hd[1]*sc,sc,dir,Pz,f.look);}
  else if(f.def){const pm=SPR[f.def.map]||GOLEM;spr(D,pm,PAL[f.def.pal],cx,f.def.map==='ANGEL'?340:335,f.def.map==='ANGEL'?8:12,!lft);}
  D.restore();outlineText(b.flash.m.n,lft?620:340,250,36,'#fff');outlineText('ท่าไม้ตายสุดยอด!',lft?620:340,292,18,'#ffd23a');
}
function drawBottomHud(b,me){
  const ultV=Ult.val(me),slotTier=['common','rare','rare','unique','ultimate'];
  // skill bar — Crystal Materia Deck (ของฝั่งผู้เล่นบนหน้าจอนั้น)
  for(let i=0;i<5;i++){const id=(me.skillSet||G.skills.slots)[i],x=14+i*62,y=452,s=id&&SKILLS[id],defTier=slotTier[i]||'common';
    const sg=D.createLinearGradient(x,y,x,y+56);sg.addColorStop(0,'rgba(16,38,94,.88)');sg.addColorStop(1,'rgba(5,13,36,.94)');
    D.fillStyle=sg;rrect(x,y,56,56,6);D.fill();
    D.strokeStyle={common:'#a8c4e4',rare:'#52b8ff',unique:'#e27aff',ultimate:'#ffd98a'}[s?s.tier:defTier];D.lineWidth=2;D.stroke();
    D.strokeStyle='rgba(255,255,255,.22)';D.lineWidth=1;rrect(x+2,y+2,52,52,4);D.stroke();
    outlineText(String(i+1),x+9,y+10,11,'#ffd98a');
    if(s){{const im=skImg(id);if(im&&im.complete&&im.naturalWidth)D.drawImage(im,x+16,y+8,24,24);else{D.font='18px sans-serif';D.textAlign='center';D.textBaseline='middle';D.fillText(s.ic,x+28,y+24);}}outlineText(s.n.length>6?s.n.slice(0,6)+'…':s.n,x+28,y+40,10,'#fff');if(i===3&&G.skills.bound&&!me.skillSet)outlineText('🔒',x+47,y+10,10,'#ffd98a');const cd=cdLeftF(me,id),full=Skills.cdFrames(id,me.S);
      const ce=skillCastCheck(me,id),lack=ce&&!cd&&s.type!=='passive';if(lack){D.fillStyle='rgba(20,30,85,.58)';rrect(x,y,56,56,6);D.fill();}
      if(cd>0){D.fillStyle='rgba(2,8,24,.68)';D.beginPath();D.moveTo(x+28,y+28);D.arc(x+28,y+28,30,-Math.PI/2,-Math.PI/2+6.283*cd/full);D.closePath();D.fill();outlineText((cd/60).toFixed(1),x+28,y+30,16,'#fff');}
      outlineText(s.tier==='ultimate'?Math.floor(ultV)+'/100':s.type==='passive'?'พาสซีฟ':Mana.cost(id,me.S)+'MP',x+28,y+51,8,s.tier==='ultimate'?'#ffd98a':'#8ee4ff');}
    else{const tc={common:'#a8c4e4',rare:'#52b8ff',unique:'#e27aff',ultimate:'#ffd98a'}[defTier];D.save();D.globalAlpha=.34;D.strokeStyle=tc;D.lineWidth=1.5;D.beginPath();D.moveTo(x+28,y+14);D.lineTo(x+40,y+27);D.lineTo(x+28,y+40);D.lineTo(x+16,y+27);D.closePath();D.stroke();D.globalAlpha=.16;D.fillStyle=tc;D.fill();D.globalAlpha=.5;D.beginPath();D.arc(x+28,y+27,2.2,0,6.283);D.fillStyle=tc;D.fill();D.restore();outlineText('ว่าง',x+28,y+49,8,'#6c84ac');}}
  // ultimate resonance gauge + potions
  {const gx=14,gy=428,gw=240,v=clamp(ultV/CONFIG.ult.max,0,1);D.fillStyle='rgba(5,12,34,.9)';rrect(gx,gy,gw,14,4);D.fill();
   D.strokeStyle=v>=1?'#ffd98a':'rgba(122,216,255,.65)';D.lineWidth=1.3;rrect(gx,gy,gw,14,4);D.stroke();
   const gg=D.createLinearGradient(gx,0,gx+gw,0);gg.addColorStop(0,'#2eb8ff');gg.addColorStop(.55,'#ffe066');gg.addColorStop(1,'#ff942a');D.fillStyle=v>=1&&G.t%20<10?'#fff6b8':gg;rrect(gx+1.5,gy+1.5,(gw-3)*v,11,3);D.fill();
   outlineText('เกจท่าไม้ตาย '+Math.floor(ultV)+'/100'+(v>=1?'  [L] พร้อม!':''),gx+gw/2,gy+7,10.5,'#fff');
   if(!b.vs&&typeof Z!=='undefined'&&Z&&Z.noPotion){
     outlineText('🚫 โคลอสเซียม Rank '+(Z.colosseum||'D')+': ห้ามใช้ยาฟื้นพลัง / ยามานา',gx+gw*.55,gy-12,11,'#ff8a7a');
   }else if(b.vs){
     const f=me.flask||0,mu=me.mana||0,pcd=me.potCD||0;
     outlineText(`❤️ ขวดยา ${'◆'.repeat(f)}${'◇'.repeat(Math.max(0,FLASK.uses-f))} [Q]`,gx+gw*.25,gy-12,11,f?'#8aff9a':'#7888a8');
     outlineText(`🧪 ยามานา ${'◆'.repeat(mu)+'◇'.repeat(Math.max(0,FLASK.uses-mu))} [R]${pcd>0?' · '+(pcd/60).toFixed(1)+' วิ':''}`,gx+gw*.73,gy-12,11,pcd>0||mu===0?'#8898b8':'#8ee4ff');
   }else{
     const np=Mana.potionIds.reduce((a,k)=>a+(G.mats[k]||0),0),f=b.flask||0,mu=b.mana||0;
     outlineText(`❤️ ขวดยา ${'◆'.repeat(f)}${'◇'.repeat(Math.max(0,FLASK.uses-f))} [Q]`,gx+gw*.25,gy-12,11,f?'#8aff9a':'#7888a8');
     outlineText(`🧪 ยามานา ×${np} ${'◆'.repeat(mu)+'◇'.repeat(Math.max(0,FLASK.uses-mu))} [R]${G.potCD>0?' · '+(G.potCD/60).toFixed(1)+' วิ':''}`,gx+gw*.73,gy-12,11,G.potCD>0||mu===0?'#8898b8':'#8ee4ff');
   }}
  // bottom attack & combo timing frame bar (แสดงเฉพาะของเจ้าของจอนั้น)
  const lt=b.vs?(me.lastT||0):(b.lastT||0),lm=b.vs?me.lastMove:b.lastMove;
  const m=me.state==='attack'?me.move:(lt>0?lm:null);
  if(m&&!b.flash){const X=330,Y=486,Wd=300,tot=m.s+m.a+m.r,k=Wd/tot;D.globalAlpha=me.state==='attack'?.95:.4;
    D.fillStyle='rgba(0,0,0,.55)';D.fillRect(X-4,Y-4,Wd+8,18);D.fillStyle='#c79a2a';D.fillRect(X,Y,m.s*k,10);D.fillStyle='#e0473a';D.fillRect(X+m.s*k,Y,m.a*k,10);
    D.fillStyle='#3a6ad0';D.fillRect(X+(m.s+m.a)*k,Y,m.r*k,10);D.fillStyle=me.didHit?(G.t%8<4?'#ffe27a':'#fff6c8'):'rgba(255,226,122,.25)';D.fillRect(X+(m.s+m.a)*k,Y-2,Math.min(CONFIG.comboWindow,m.r)*k,14);
    if(me.state==='attack'){const el=me.phase==='startup'?me.pt:me.phase==='active'?m.s+me.pt:m.s+m.a+me.pt;D.fillStyle='#fff';D.fillRect(X+el*k-1.5,Y-5,3,20);}
    D.globalAlpha=1;outlineText(m.n,480,Y+26,15,'#fff');}
  const sm=b.vs?me.small:b.small;
  if(sm)outlineText(sm.t,bsx(me.x)*S,bsy(me.y-me.h-26)*S,15,'#9fe6ff');
}
function drawVSUI(b){
  const p=b.p,e=b.e,v=b.vs,need=CONFIG.arena.rounds,me=b.net==='guest'?e:p;
  for(let i=0;i<need;i++){outlineText(i<v.wins[0]?'◆':'◇',440-i*20,70,16,'#ffd98a');outlineText(i<v.wins[1]?'◆':'◇',520+i*20,70,16,'#ffd98a');}
  if(b.net){
    if(me.comboT>0&&me.comboShow>=2){const left=me===p;outlineText(me.comboShow+' HITS',left?110:850,180,36,'#ffd98a');outlineText('COMBO!',left?110:850,210,14,'#7ad8ff');}
    if(me.fullCombo)outlineText('✦ FULL COMBO: '+me.fullCombo.n+' ✦',480,150,28,'#ffd98a');
  }else{
    if(b.comboT>0&&b.comboShow>=2){const left=b.comboWho===p;outlineText(b.comboShow+' HITS',left?110:850,180,36,'#ffd98a');outlineText('COMBO!',left?110:850,210,14,'#7ad8ff');}
    if(b.fullCombo)outlineText('✦ FULL COMBO: '+b.fullCombo.n+' ✦',480,150,28,'#ffd98a');
  }
  for(const n of b.nums){D.globalAlpha=Math.min(1,n.t/15);const pop=n.t>47?1+(n.t-47)/8*.75:n.t>43?1-(47-n.t)*.02+.08:1;const by=n.bn?-Math.abs(Math.sin((55-n.t)*.3))*12*Math.max(0,n.t/55):0;outlineText(n.txt,bsx(n.x)*S,(bsy(n.y)+by)*S,Math.round(n.size*pop),n.col,'center',D,n.ol);}D.globalAlpha=1;
  drawBottomHud(b,me);
  if(b.flash)drawBattleFlash(b);
  if(b.intro>0){outlineText(b.intro>30?`ROUND ${v.round}`:'FIGHT!',480,250,b.intro>30?52:76,b.intro>30?'#eaf4ff':'#ffd98a');if(b.intro>30)outlineText(`${p.vsName||'P1'}  VS  ${e.vsName||'P2'}`,480,310,22,'#7ad8ff');}
  if(b.msg)outlineText(b.msg.t,480,250,b.msg.t==='K.O.'?96:64,b.msg.c);
  if(b.result&&b.end>0&&b.end<70)outlineText(b.result==='win'?`${p.vsName||'P1'} ชนะยกนี้!`:b.result==='lose'?`${e.vsName||'P2'} ชนะยกนี้!`:'เสมอ',480,330,32,'#ffd98a');
  if(b.white>0){D.fillStyle=`rgba(235,246,255,${Math.min(.24,b.white/36)})`;D.fillRect(0,0,960,540);}
}
function drawBattleUI(){
  const b=BT,p=b.p,e=b.e;
  hpBarB(p,false);hpBarB(e,true);
  {D.save();D.translate(480,34);D.beginPath();D.moveTo(-46,-26);D.lineTo(46,-26);D.lineTo(34,26);D.lineTo(-34,26);D.closePath();
    const cg=D.createLinearGradient(0,-26,0,26);cg.addColorStop(0,'rgba(16,40,98,.94)');cg.addColorStop(1,'rgba(5,12,34,.96)');
    D.fillStyle=cg;D.fill();D.strokeStyle='rgba(122,216,255,.85)';D.lineWidth=2.2;D.stroke();
    D.beginPath();D.moveTo(-41,-22);D.lineTo(41,-22);D.lineTo(30,22);D.lineTo(-30,22);D.closePath();
    D.strokeStyle='rgba(255,217,138,.4)';D.lineWidth=1;D.stroke();D.restore();}
  outlineText(String(Math.ceil(b.time/60)),480,30,30,'#fff');outlineText('TIME',480,52,11,'#7ad8ff');
  if(b.vs){drawVSUI(b);return;}
  if(b.comboT>0&&b.comboShow>=2){const left=b.comboWho===p;outlineText(b.comboShow+' HITS',left?110:850,180,36,'#ffd98a');outlineText('COMBO!',left?110:850,210,14,'#7ad8ff');}
  for(const n of b.nums){D.globalAlpha=Math.min(1,n.t/15);const pop=n.t>47?1+(n.t-47)/8*.75:n.t>43?1-(47-n.t)*.02+.08:1;const by=n.bn?-Math.abs(Math.sin((55-n.t)*.3))*12*Math.max(0,n.t/55):0;outlineText(n.txt,bsx(n.x)*S,(bsy(n.y)+by)*S,Math.round(n.size*pop),n.col,'center',D,n.ol);}D.globalAlpha=1;
  if(e.state==='attack'&&e.phase==='startup'&&!b.flash)outlineText('!',bsx(e.x)*S,bsy(e.y-e.h-14)*S,34,'#ff5a4a');
  if(b.fullCombo)outlineText('✦ FULL COMBO: '+b.fullCombo.n+' ✦',480,150,28,'#ffd23a');
  if(b.phaseMsg)outlineText(b.phaseMsg.t,480,200,30,'#ff6a5a');
  if(e.weakT>0)outlineText('จุดอ่อนเปิด '+(e.weakT/60).toFixed(1)+' วิ',bsx(e.x)*S,bsy(e.y-e.h-34)*S,15,'#5affb0');
  drawBottomHud(b,p);
  if(b.def&&b.def.immortal){
    const c=b.coach||{},tm=Math.floor((c.t||0)/330)%5;
    const tips=[
      '🎓 ครูฝึกแกรนท์ — การเคลื่อนไหว: [A/D] เดิน · [AA/DD] กลิ้งหลบระยะใกล้ · [Space] Dash 2 ชาร์จ (หลุดคอมโบได้)',
      '⚔️ คอมโบ: กด [J → J → J] ตามจังหวะแถบเหลืองทอง (HIT) ทำคอมโบครบชุด ฟื้น Stamina + เกจท่าไม้ตาย!',
      '🥊 โจมตี & กัน: [→+J] ฟันหนัก · [K] เตะ · [↓+K] กวาดขาล้ม · [E] ป้องกัน (ถูกจังหวะ = ปัดป้อง True DMG)',
      '✨ สกิล & ยา: [1-3] กดใช้สกิล · เกจเต็ม 100 กด [4/L] ท่าสุดยอด · [Q] ยา HP · [R] ยามานา',
      '🚪 ซ้อมจนคล่องแล้วกดปุ่ม [🚪 ออกฝึก] มุมขวาล่าง เพื่อเรียนรู้เรื่องอุปกรณ์ อาวุธ และระดับเทพต่อ!'
    ];
    D.save();D.fillStyle='rgba(8,18,44,.86)';rrect(155,70,650,48,7);D.fill();
    D.strokeStyle='rgba(255,217,138,.78)';D.lineWidth=1.5;rrect(155,70,650,48,7);D.stroke();
    outlineText(tips[tm],480,86,12.5,'#ffe694');
    const chk=(ok,lb)=>(ok?'✓ ':'○ ')+lb;
    outlineText(`${chk(c.jCombo,'คอมโบ')} · ${chk(c.heavy,'ตีหนัก')} · ${chk(c.kick,'เตะ')} · ${chk(c.dodge,'พุ่งหลบ')} · ${chk(c.guard,'กัน/ปัดป้อง')} · ${chk(c.skill,'สกิล')}`,480,105,11,'#a8ecff');
    D.restore();
  }
  if(b.flash)drawBattleFlash(b);
  if(b.intro>0){outlineText(b.intro>30?'ROUND 1':'FIGHT!',480,250,b.intro>30?52:76,b.intro>30?'#fff':'#ffd23a');if(b.intro>30)outlineText(`Lv.${p.lv} คุณ  VS  ${e.name} Lv.${e.lv}`,480,310,20,'#fff');}
  if(b.msg)outlineText(b.msg.t,480,250,b.msg.t==='K.O.'?96:64,b.msg.c);
  if(b.result&&b.end>0&&b.end<70)outlineText(b.result==='win'?'คุณชนะ!':'คุณแพ้...',480,330,32,b.result==='win'?'#ffd23a':'#ff8a7a');
  if(b.white>0){D.fillStyle=`rgba(255,244,218,${Math.min(.24,b.white/36)})`;D.fillRect(0,0,960,540);}
}

/* ---- keyboard / gamepad focus navigation for menus ---- */
const Nav={
  items(){return[...pn.querySelectorAll('button:not([disabled]),select,input')].filter(e=>e.offsetParent!==null);},
  key(e){return e.tagName+JSON.stringify(e.dataset)+e.textContent.slice(0,12);},
  move(dx,dy){const it=this.items();if(!it.length)return;SFX.ui('cursor');const cur=document.activeElement;if(!it.includes(cur)){it[0].focus();return;}
    const r0=cur.getBoundingClientRect(),cx=r0.x+r0.width/2,cy=r0.y+r0.height/2;let best=null,bd=1e9;
    for(const e of it){if(e===cur)continue;const r=e.getBoundingClientRect(),vx=r.x+r.width/2-cx,vy=r.y+r.height/2-cy,along=vx*dx+vy*dy;if(along<=4)continue;
      const d=along+Math.abs(vx*dy-vy*dx)*2.2;if(d<bd){bd=d;best=e;}}
    if(best){best.focus();best.scrollIntoView({block:'nearest'});}},
  activate(){const a=document.activeElement;if(a&&pn.contains(a)&&!a.disabled)a.click();else{const it=this.items();if(it[0])it[0].focus();}}
};

