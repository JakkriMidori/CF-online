/* =====================================================================
   UPDATER — บังคับรีเว็บเมื่อมีเวอร์ชันใหม่
   · เซิร์ฟเวอร์ (server.js) ใส่ window.CF_BUILD = รหัสรุ่นที่ deploy อยู่ และมี /version บอกรุ่นล่าสุด
   · ตรวจทุก 60 วิ และทุกครั้งที่กลับมาที่แท็บ — ถ้ารุ่นเปลี่ยน: ขึ้นแถบแจ้ง → บันทึกเกม → รีโหลด
   · ไม่ตัดกลางการต่อสู้/คัตซีน: รอจนอยู่ในโหมดปลอดภัย (เดินสำรวจ/หน้าเมนู/หน้าแรก) ก่อน
   · เปิดเกมจากไฟล์ในเครื่อง หรือบน claude.ai (ไม่มี CF_BUILD) → ไม่ทำอะไร
   ===================================================================== */
const Updater={
  cur:(typeof window!=='undefined'&&window.CF_BUILD)||null,next:null,el:null,left:0,timer:null,
  enabled(){return!!this.cur&&/^https?:$/.test(location.protocol);},
  check(){if(!this.enabled()||this.next)return;
    fetch('/version?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.text():'').then(v=>{v=String(v||'').trim();
      if(v&&v!==this.cur&&/^[\w.-]{3,40}$/.test(v)){this.next=v;this.notify();}}).catch(()=>{});},
  safe(){if(typeof G==='undefined')return true;if(typeof BT!=='undefined'&&BT)return false;
    if(typeof Story!=='undefined'&&Story.active)return false;if(typeof Cutscene!=='undefined'&&Cutscene.active)return false;
    return['explore','menu','title','dialog'].includes(G.mode)&&!(typeof Craft!=='undefined'&&Craft.busy);},
  notify(){const w=document.getElementById('wrap')||document.body;const b=document.createElement('div');b.id='updBar';
    b.innerHTML='<span>🔄 มีเกมเวอร์ชันใหม่ — <b id="updMsg">กำลังเตรียมรีโหลด</b></span><button id="updNow">รีโหลดเลย</button>';
    w.appendChild(b);this.el=b;b.querySelector('#updNow').onclick=()=>this.reload(true);
    this.left=8;this.timer=setInterval(()=>this.tick(),1000);this.tick();},
  tick(){const m=this.el&&this.el.querySelector('#updMsg');if(!m)return;
    if(!this.safe()){m.textContent='จะรีโหลดหลังจบการต่อสู้/คัตซีน (บันทึกเกมให้อัตโนมัติ)';return;}
    this.left--;m.textContent=`บันทึกเกมแล้ว · รีโหลดอัตโนมัติใน ${Math.max(0,this.left)} วิ`;if(this.left<=0)this.reload(false);},
  reload(force){if(!force&&!this.safe())return;clearInterval(this.timer);
    try{if(typeof Save!=='undefined'&&typeof G!=='undefined'&&G.talent&&!(typeof BT!=='undefined'&&BT))Save.save();}catch(e){}
    const u=new URL(location.href);u.searchParams.set('v',this.next||Date.now());location.replace(u.toString());}
};
if(Updater.enabled()){setTimeout(()=>Updater.check(),8000);setInterval(()=>Updater.check(),60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)Updater.check();});}
