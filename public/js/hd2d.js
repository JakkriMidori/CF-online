/* ===================== HD-2D renderer =====================
   ทำให้ฉากเดินสำรวจดูเป็นสไตล์ HD-2D (พื้น 3 มิติ + ตัวละครพิกเซลตั้งตรง)
   - PJ   : กล้องเอียง — แถวบนของจอไกลกว่า (เล็กลง) แถวล่างใกล้กว่า (ใหญ่ขึ้น)
   - HD.ground  : วาดพื้น (bgC) ผ่านมุมกล้องเอียง แคชไว้ถ้ากล้องไม่ขยับ
   - HD.bb      : วาดวัตถุ/ตัวละครแบบตั้งตรง (billboard) ตามขนาดระยะ
   - HD.floor / HD.face / HD.detail : ลายพื้นหิน หญ้า ผนัง แบบละเอียด (สร้างด้วยโค้ด)
   - HD.atmos   : หมอกระยะไกล หมอกลอย ตามโซน
   ตรรกะเกมยังใช้พิกัดโลก 2D เดิมทั้งหมด เปลี่ยนเฉพาะการวาด
   ========================================================== */
const PJ={k:.0016,yr:150,cx:0,cy:0,
  set(cx,cy){this.cx=cx;this.cy=cy;this.k=.0016;},
  s(ys){return 1+this.k*(ys-this.yr);},
  wy(ys){return this.k?this.cy+this.yr+Math.log(this.s(ys))/this.k:this.cy+ys;},
  uz:1,vw:0,   /* uz = ตัวคูณซูมของจอจริง (ดันเจียนซูมออก) · vw = ความกว้างพื้นที่มองเห็นตอนไม่ได้วาดในโหมดซูม */
  pt(wx,wy){const u=this.uz||1;if(!this.k)return{x:(wx-this.cx)*u,y:(wy-this.cy)*u,s:u};const vw=this.vw||W,s=Math.exp(this.k*(wy-this.cy-this.yr));return{x:(vw/2+(wx-this.cx-vw/2)*s)*u,y:(this.yr+(s-1)/this.k)*u,s:s*u};}
};

const HD=(()=>{
  const cv=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  // ---------- noise ----------
  function lattice(per,seed){const v=new Float32Array(per*per);let s=(seed*7919+13)%233280;for(let i=0;i<v.length;i++){s=(s*9301+49297)%233280;v[i]=s/233280;}
    const sm=t=>t*t*(3-2*t),at=(x,y)=>v[(((y%per)+per)%per)*per+(((x%per)+per)%per)];
    return(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=sm(x-xi),yf=sm(y-yi),a=at(xi,yi),b=at(xi+1,yi),c=at(xi,yi+1),d=at(xi+1,yi+1);return a+(b-a)*xf+(c-a)*yf+(a-b-c+d)*xf*yf;};}
  function fbmCanvas(size,base,oct,seed,map){const c=cv(size,size),x=c.getContext('2d'),id=x.createImageData(size,size),ns=[];
    for(let o=0;o<oct;o++)ns.push(lattice(base<<o,seed+o*17));
    for(let j=0;j<size;j++)for(let i=0;i<size;i++){let v=0,a=.5,t=0;for(let o=0;o<oct;o++){const f=(base<<o)/size;v+=ns[o](i*f,j*f)*a;t+=a;a*=.5;}v/=t;
      const k=(j*size+i)*4,r=map(v);id.data[k]=r[0];id.data[k+1]=r[1];id.data[k+2]=r[2];id.data[k+3]=r[3];}
    x.putImageData(id,0,0);return c;}
  const LF=lattice(64,7),MOSS=lattice(64,31);              // สีพื้นเปลี่ยนช้า ๆ / จุดมอส (พิกัดโลก/32)
  const lf=(x,y)=>LF(x/40,y/40),moss=(x,y)=>MOSS(x/36,y/36);
  let noiseC=null,grainC=null;const wisps={};
  function tex(){if(noiseC)return;
    noiseC=fbmCanvas(256,4,5,3,v=>{const g=v*255|0;return[g,g,g,255];});
    grainC=cv(128,128);{const x=grainC.getContext('2d'),id=x.createImageData(128,128);for(let i=0;i<id.data.length;i+=4){const g=110+Math.random()*36|0;id.data[i]=id.data[i+1]=id.data[i+2]=g;id.data[i+3]=255;}x.putImageData(id,0,0);}}
  function wispC(col){if(wisps[col])return wisps[col];const[r,g,b]=col.split(',').map(Number);
    return wisps[col]=fbmCanvas(256,3,5,11,v=>{const a=Math.max(0,Math.min(1,(v-.42)/.36));return[r,g,b,a*a*(3-2*a)*255|0];});}
  const rgb=(c,m=1,add=0)=>`rgb(${Math.max(0,Math.min(255,c[0]*m+add))|0},${Math.max(0,Math.min(255,c[1]*m+add))|0},${Math.max(0,Math.min(255,c[2]*m+add))|0})`;

  // ---------- ลายพื้น ----------
  const KIND={town:'grass',dragon:'grass',cave:'slab',crystal:'slab',lava:'basalt',ice:'ice',tower:'slab',sanctum:'slab'};
  const MOSSY={cave:.52,tower:.6,sanctum:.5,town:.55,dragon:.42,crystal:2,lava:2,ice:2};
  function grass(B,px,py,tx,ty,base){
    const v=.86+lf(px,py)*.28;B.fillStyle=rgb(base,v);B.fillRect(px,py,16,16);
    for(let i=0;i<34;i++){const hx=hash(tx*31+i,ty*17+i*3),hy=hash(ty*29+i,tx*13-i),sh=hash(i*7,tx+ty*3);
      B.fillStyle=sh>.55?`rgba(190,230,120,${.18+sh*.2})`:`rgba(20,50,15,${.2+sh*.25})`;B.fillRect(px+hx*16,py+hy*16,.5,1+sh*1.6);}
    if(hash(tx*7+3,ty*11)>.86){const cols=['#f4e27a','#ffffff','#f08ab0','#9ac8ff'],c=cols[hash(tx,ty*5)*4|0];
      for(let i=0;i<3;i++){B.fillStyle=c;B.fillRect(px+2+hash(tx+i,ty)*12,py+2+hash(ty+i,tx)*12,1,1);}}
    if(lf(px*3,py*3)>.66){B.fillStyle='rgba(60,40,20,.10)';B.beginPath();B.ellipse(px+8,py+8,7,5,0,0,7);B.fill();}
  }
  function slabs(B,px,py,tx,ty,base,kind,bn){
    const RH=kind==='ice'?14:11,mort=kind==='basalt'?.35:.5;
    B.fillStyle=rgb(base,mort);B.fillRect(px,py,16,16);
    B.save();B.beginPath();B.rect(px,py,16,16);B.clip();
    const r0=Math.floor(py/RH),r1=Math.floor((py+15.9)/RH);
    for(let r=r0;r<=r1;r++){const y0=r*RH,y1=y0+RH,off=(r&1)*11,bx=i=>i*22+off+(hash(i,r*3+1)-.5)*10;
      const i0=Math.floor((px-off)/22)-1,i1=Math.ceil((px+16-off)/22)+1;
      for(let i=i0;i<i1;i++){const x0=bx(i),x1=bx(i+1);if(x1<px||x0>px+16)continue;
        const hv=hash(i*3+7,r*5+11),c=.82+hv*.26+(lf(x0,y0)-.5)*.3;
        B.fillStyle=rgb(base,c);B.fillRect(x0+.5,y0+.5,x1-x0-1,RH-1);
        B.fillStyle='rgba(255,244,224,.11)';B.fillRect(x0+.5,y0+.5,x1-x0-1,.5);B.fillRect(x0+.5,y0+.5,.5,RH-1);
        B.fillStyle='rgba(0,0,0,.22)';B.fillRect(x0+.5,y1-1,x1-x0-1,.5);B.fillRect(x1-1,y0+.5,.5,RH-1);
        if(hv>.78){B.strokeStyle=kind==='basalt'?'rgba(255,110,30,.55)':'rgba(0,0,0,.3)';B.lineWidth=.5;B.beginPath();const cx=x0+(x1-x0)*hash(i,r),cy=y0+2;B.moveTo(cx,cy);B.lineTo(cx+2,cy+3);B.lineTo(cx+1,cy+6);B.lineTo(cx+3,cy+8);B.stroke();}
        if(kind==='ice'&&hv>.4){B.fillStyle='rgba(255,255,255,.35)';B.fillRect(x0+2,y0+2,Math.min(5,x1-x0-4),.5);}}}
    for(let i=0;i<6;i++){B.fillStyle=hash(i,tx*ty+i)>.5?'rgba(0,0,0,.22)':'rgba(255,240,220,.10)';B.fillRect(px+hash(tx*3+i,ty*7)*16,py+hash(tx*5,ty*3+i)*16,.5,.5);}
    const m=moss(px+8,py+8),th=MOSSY[bn]||1;
    if(m>th){const a=Math.min(1,(m-th)*5);for(let i=0;i<16;i++){const mx=px+hash(tx*13+i,ty*7)*16,my=py+hash(ty*11+i,tx*5)*16,rr=.8+hash(i,tx+ty)*2.2;
      B.fillStyle=`rgba(${74+i%3*10},${104+i%4*8},44,${(.25+hash(i*3,tx)*.35)*a})`;B.beginPath();B.ellipse(mx,my,rr,rr*.7,0,0,7);B.fill();}}
    if(kind==='ice'&&hash(tx,ty*9)>.7){B.fillStyle='rgba(255,255,255,.5)';for(let i=0;i<4;i++)B.fillRect(px+hash(i,tx)*15,py+hash(ty,i)*15,.5,.5);}
    B.restore();
  }
  function dirtPath(B,px,py,tx,ty,base){
    const v=.88+lf(px,py)*.22;B.fillStyle=rgb(base,v);B.fillRect(px,py,16,16);
    for(let i=0;i<18;i++){const hx=hash(tx*23+i,ty*19+i*3),hy=hash(ty*31+i,tx*11-i),sh=hash(i*5,tx+ty*7);
      B.fillStyle=sh>.6?'rgba(175,148,108,.36)':'rgba(64,46,28,.24)';B.fillRect(px+hx*15,py+hy*15,1.2,1.0);}
    if(hash(tx*11+3,ty*17)>.58){B.fillStyle='rgba(148,136,118,.65)';B.beginPath();B.ellipse(px+4+hash(tx,ty)*8,py+4+hash(ty,tx)*8,1.8,1.2,0,0,7);B.fill();}
    if(hash(tx*7,ty*13)>.72){B.fillStyle='rgba(66,104,48,.38)';B.beginPath();B.ellipse(px+2+hash(ty,tx*2)*12,py+2+hash(tx*2,ty)*12,2.4,1.4,0,0,7);B.fill();}
  }
  function floor(B,px,py,tx,ty,bn,base,isRoad){
    if(bn==='dragon'&&isRoad){dirtPath(B,px,py,tx,ty,base);return;}
    const k=isRoad?'slab':(KIND[bn]||'slab');
    if(k==='grass')grass(B,px,py,tx,ty,base);else slabs(B,px,py,tx,ty,base,k,isRoad?'town':bn);
  }
  // ผนังด้านหน้า: ก้อนหินเรียงพร้อมขอบนูน + เงาโคนผนัง
  function face(B,px,py,tx,ty,bi){
    const gr=B.createLinearGradient(0,py,0,py+16);gr.addColorStop(0,bi.face[0]);gr.addColorStop(1,bi.face[1]);B.fillStyle=gr;B.fillRect(px,py,16,16);
    for(let r=0;r<3;r++){const y0=py+r*5.4,off=((ty*3+r)&1)*5;for(let i=-1;i<3;i++){const x0=px+i*9+off+(hash(tx*4+i,ty*3+r)-.5)*2,w=8.4;
      B.fillStyle=`rgba(255,235,210,${.04+hash(i+tx,r+ty)*.07})`;B.fillRect(x0+.5,y0+.5,w-1,4.4);
      B.fillStyle='rgba(255,240,220,.12)';B.fillRect(x0+.5,y0+.5,w-1,.5);B.fillStyle='rgba(0,0,0,.32)';B.fillRect(x0+.5,y0+4.9,w-1,.5);B.fillRect(x0+w-.5,y0+.5,.5,4.4);}}
    const ao=B.createLinearGradient(0,py+10,0,py+16);ao.addColorStop(0,'rgba(0,0,0,0)');ao.addColorStop(1,'rgba(0,0,0,.35)');B.fillStyle=ao;B.fillRect(px,py+10,16,6);
    B.fillStyle='rgba(255,230,190,.16)';B.fillRect(px,py,16,.5);
  }
  // ผิวสัมผัสรวมทั้งฉาก: สีเปลี่ยนเป็นหย่อม ๆ + เกรนละเอียด
  let bgVer=0;
  function detail(B,w,h){tex();bgVer++;
    B.save();B.globalCompositeOperation='soft-light';B.globalAlpha=.55;for(let y=0;y<h;y+=384)for(let x=0;x<w;x+=384)B.drawImage(noiseC,x,y,384,384);
    B.globalCompositeOperation='overlay';B.globalAlpha=.16;for(let y=0;y<h;y+=64)for(let x=0;x<w;x+=64)B.drawImage(grainC,x,y,64,64);B.restore();}

  // ---------- พื้นมุมกล้องเอียง ----------
  const gC=cv(W*RES,H*RES),GC=gC.getContext('2d');let gKey='';
  function ground(ctx,cx,cy,fill){
    {const gw=Math.round(W*RES),gh=Math.round(H*RES);if(gC.width!==gw||gC.height!==gh){gC.width=gw;gC.height=gh;gKey='';}}   /* ซูมออก: บัฟเฟอร์พื้นกว้างขึ้นตามพื้นที่วาด */
    const key=cx+','+cy+','+PJ.k+','+bgVer+','+bgC.width;
    if(key!==gKey){gKey=key;GC.setTransform(1,0,0,1,0,0);GC.fillStyle=fill;GC.fillRect(0,0,gC.width,gC.height);
      if(!PJ.k)GC.drawImage(bgC,cx*RES,cy*RES,W*RES,H*RES,0,0,gC.width,gC.height);
      else{GC.imageSmoothingEnabled=true;GC.imageSmoothingQuality='medium';const n=H,bw=bgC.width,bh=bgC.height,sh=RES;   // แถวละ 1 หน่วยเกม (2 พิกเซลจริง) เร็วขึ้นครึ่งหนึ่ง
        for(let i=0;i<n;i++){const y0=i,y1=i+1,w0=PJ.wy(y0)*RES,w1=PJ.wy(y1)*RES;if(w1<=0||w0>=bh)continue;
          const s=PJ.s((y0+y1)/2),hw=W/2/s*RES,sx=(cx+W/2)*RES-hw;let dx=0,dw=gC.width,ssx=sx,ssw=2*hw;
          if(ssx<0){dx=-ssx/(2*hw)*gC.width;ssw+=ssx;ssx=0;}if(ssx+ssw>bw){ssw=bw-ssx;}if(ssw<=0)continue;dw=ssw/(2*hw)*gC.width;
          GC.drawImage(bgC,ssx,Math.max(0,w0),ssw,Math.max(.5,Math.min(bh,w1)-Math.max(0,w0)),dx,i*sh,dw,sh);}}}
    ctx.drawImage(gC,0,0,W,H);
  }
  function bb(ctx,wx,wy,fn){const p=PJ.pt(wx,wy);if(p.y<-60||p.y>H+80||p.x<-120||p.x>W+120)return;ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.s,p.s);ctx.translate(-wx,-wy);fn();ctx.restore();}

  // ---------- บรรยากาศตามโซน ----------
  // fog = หมอกระยะไกล (ขอบบนจอ) · wisp = หมอกลอย · dark = ความมืดรอบแสง · ray = แสงส่องเฉียง
  const ATM={
    town:{fog:'16,22,40',fa:.05,wisp:'185,210,255',wa:.01,dark:'rgba(14,18,34,.22)',ray:.008,rayC:'255,216,145'},
    cave:{fog:'92,92,62',fa:.14,wisp:'190,184,140',wa:.05,dark:'rgba(22,18,10,.46)',ray:.018,rayC:'255,226,150'},
    stone:{fog:'92,92,62',fa:.14,wisp:'190,184,140',wa:.05,dark:'rgba(22,18,10,.46)',ray:.018,rayC:'255,226,150'},
    crystal:{fog:'70,70,120',fa:.16,wisp:'150,160,255',wa:.06,dark:'rgba(10,8,30,.50)',ray:.015,rayC:'190,200,255'},
    lava:{fog:'110,40,16',fa:.16,wisp:'255,140,70',wa:.05,dark:'rgba(20,6,4,.50)',ray:.012,rayC:'255,150,80'},
    dragon:{fog:'46,78,52',fa:.10,wisp:'215,242,205',wa:.025,dark:'rgba(14,22,16,.18)',ray:.022,rayC:'255,228,162'},
    lavaboss:{fog:'110,40,16',fa:.22,wisp:'255,140,70',wa:.06,dark:'rgba(20,6,4,.50)',ray:.012,rayC:'255,150,80'},
    ice:{fog:'170,205,232',fa:.14,wisp:'235,248,255',wa:.04,dark:'rgba(20,34,60,.30)',ray:.02,rayC:'225,245,255'},
    frost:{fog:'170,205,232',fa:.14,wisp:'235,248,255',wa:.04,dark:'rgba(20,34,60,.30)',ray:.02,rayC:'225,245,255'},
    tower:{fog:'64,96,84',fa:.13,wisp:'170,240,210',wa:.05,dark:'rgba(8,18,16,.46)',ray:.018,rayC:'200,255,225'},
    sanctum:{fog:'150,190,190',fa:.18,wisp:'220,250,250',wa:.06,dark:'rgba(10,24,30,.32)',ray:.022,rayC:'220,250,255'},
    cathedral:{fog:'190,210,230',fa:.18,wisp:'240,248,255',wa:.06,dark:'rgba(20,24,40,.28)',ray:.022,rayC:'240,248,255'},
    arena:{fog:'226,206,170',fa:.12,wisp:'255,240,210',wa:.03,dark:'rgba(40,24,20,.24)',ray:.022,rayC:'255,236,190'},
    interior:{fog:'48,28,16',fa:.02,wisp:'255,220,170',wa:.005,dark:'rgba(24,14,8,.16)',ray:.010,rayC:'255,225,170'}};
  const atm=bio=>ATM[bio]||ATM.cave;
  const wC=cv(240,135),WX=wC.getContext('2d');
  // อนุภาคสภาพแวดล้อมตามไบโอม (ใบไม้ปลิว · สปอร์เรืองแสง · หิมะ/เกล็ดน้ำแข็ง · ละอองเถ้าลาวา · ฟองแปรธาตุ) — โทนสีนุ่มไม่แสบตา
  function envParticles(ctx,bio,cx,cy){
    const t=G.t;ctx.save();
    if(bio==='interior'){
      for(let i=0;i<10;i++){
        const wx=((hash(i,17)*W*2+Math.sin(t*.02+i)*6-cx*.4)%(W+20)+W+20)%(W+20)-10;
        const wy=((hash(i,23)*H*1.5-t*(.06+(i%2)*.03)-cy*.4)%(H+20)+H+20)%(H+20)-10;
        ctx.fillStyle=`rgba(255,228,165,${.14+Math.sin(t*.04+i)*.06})`;ctx.fillRect(wx,wy,1.2,1.2);
      }
    }else if(bio==='town'||bio==='arena'){
      // ใบไม้และเกสรแสงอาทิตย์ลอยเอื่อยตามสายลม
      const cols=['rgba(228,196,120,.38)','rgba(218,142,108,.34)','rgba(156,204,124,.34)'];
      for(let i=0;i<14;i++){
        const sp=.22+(i%3)*.08,wx=((hash(i,19)*W*2+t*sp-cx*.65)%(W+40)+W+40)%(W+40)-20;
        const wy=((hash(i,31)*H*1.5+t*(.14+(i%2)*.05)+Math.sin(t*.03+i)*8-cy*.5)%(H+20)+H+20)%(H+20)-10;
        const ang=t*.04+i*1.3;ctx.fillStyle=cols[i%3];
        ctx.beginPath();ctx.ellipse(wx,wy,2.1,1.0,ang,0,7);ctx.fill();
      }
    }else if(bio==='ice'||bio==='frost'||bio==='sanctum'||bio==='cathedral'){
      // แสงเหนือจางๆ ด้านบน + เกล็ดหิมะโปรยเฉียงลงอย่างนุ่มนวล
      const ag=ctx.createLinearGradient(0,0,W,70);
      const s1=.07+Math.sin(t*.015)*.025,s2=.06+Math.cos(t*.018)*.02;
      ag.addColorStop(0,'rgba(120,210,235,0)');ag.addColorStop(.35,`rgba(130,225,220,${s1})`);
      ag.addColorStop(.7,`rgba(165,195,245,${s2})`);ag.addColorStop(1,'rgba(140,200,240,0)');
      ctx.fillStyle=ag;ctx.fillRect(0,0,W,75);
      for(let i=0;i<22;i++){
        const wx=((hash(i,41)*W*2-t*(.18+(i%3)*.06)+Math.sin(t*.025+i)*6-cx*.55)%(W+20)+W+20)%(W+20)-10;
        const wy=((hash(i,53)*H*2+t*(.32+(i%4)*.08)-cy*.55)%(H+20)+H+20)%(H+20)-10;
        const r=(i%3===0)?1.5:1.0,al=.22+(i%4)*.05;
        ctx.fillStyle=`rgba(228,244,255,${al})`;ctx.beginPath();ctx.arc(wx,wy,r,0,7);ctx.fill();
      }
    }else if(bio==='dragon'){
      // ป่าแถวภูเขาดินแดนมังกร: ใบไม้สนและใบไม้ร่วงปลิวตามลม + ละอองแสงทองลอดยอดไม้
      const cols=['rgba(128,196,92,.44)','rgba(218,170,84,.40)','rgba(216,112,68,.36)'];
      for(let i=0;i<16;i++){
        const sp=.24+(i%3)*.09,wx=((hash(i,19)*W*2+t*sp-cx*.65)%(W+40)+W+40)%(W+40)-20;
        const wy=((hash(i,31)*H*1.5+t*(.16+(i%2)*.06)+Math.sin(t*.03+i)*9-cy*.5)%(H+20)+H+20)%(H+20)-10;
        const ang=t*.045+i*1.3;ctx.fillStyle=cols[i%3];
        ctx.beginPath();ctx.ellipse(wx,wy,2.2,1.0,ang,0,7);ctx.fill();
      }
      for(let i=0;i<8;i++){
        const gx=((hash(i,61)*W*2+Math.sin(t*.025+i*2)*8-cx*.55)%(W+20)+W+20)%(W+20)-10;
        const gy=((hash(i,73)*H*1.6-t*(.18+(i%2)*.06)-cy*.55)%(H+20)+H+20)%(H+20)-10;
        ctx.fillStyle=`rgba(255,212,120,${.18+Math.sin(t*.07+i)*.10})`;
        ctx.beginPath();ctx.arc(gx,gy,1.2,0,7);ctx.fill();
      }
    }else if(bio==='lava'||bio==='lavaboss'){
      // ละอองเถ้าถ่านและสะเก็ดไฟอุ่นลอยวนขึ้นช้าๆ (ความทึบต่ำ ไม่จ้า)
      for(let i=0;i<18;i++){
        const wx=((hash(i,61)*W*2+Math.sin(t*.03+i*2)*10-cx*.6)%(W+20)+W+20)%(W+20)-10;
        const wy=((hash(i,73)*H*2-t*(.28+(i%3)*.09)-cy*.6)%(H+20)+H+20)%(H+20)-10;
        const ash=i%3===0,al=ash?.28:(.22+Math.sin(t*.08+i)*.10);
        ctx.fillStyle=ash?`rgba(82,64,58,${al})`:`rgba(245,148,72,${al})`;
        ctx.beginPath();ctx.arc(wx,wy,ash?1.4:1.1,0,7);ctx.fill();
      }
    }else if(bio==='tower'){
      // ฟองเวทแปรธาตุและอักขระเพชรลอยขึ้นเบาๆ
      for(let i=0;i<15;i++){
        const wx=((hash(i,83)*W*2+Math.sin(t*.025+i)*7-cx*.55)%(W+20)+W+20)%(W+20)-10;
        const wy=((hash(i,97)*H*2-t*(.20+(i%3)*.06)-cy*.55)%(H+20)+H+20)%(H+20)-10;
        const al=.18+Math.sin(t*.06+i)*.08;
        ctx.strokeStyle=i%2?`rgba(130,232,192,${al+.08})`:`rgba(188,156,245,${al+.08})`;
        ctx.lineWidth=.8;ctx.beginPath();ctx.arc(wx,wy,1.4+(i%2)*.7,0,7);ctx.stroke();
      }
    }else{
      // ถ้ำชีส / ถ้ำคริสตัล / ถ้ำหินโกเลม: สปอร์เอเธอร์เรืองแสงนุ่มๆ + วงหยดน้ำบนพื้นถ้ำ
      for(let i=0;i<16;i++){
        const wx=((hash(i,101)*W*2+Math.sin(t*.02+i*1.7)*8-cx*.55)%(W+20)+W+20)%(W+20)-10;
        const wy=((hash(i,113)*H*2-t*(.12+(i%3)*.04)-cy*.55)%(H+20)+H+20)%(H+20)-10;
        const al=.16+Math.sin(t*.05+i*2)*.09;
        ctx.fillStyle=bio==='crystal'?`rgba(162,178,248,${al})`:`rgba(148,220,188,${al})`;
        ctx.beginPath();ctx.arc(wx,wy,1.3,0,7);ctx.fill();
      }
      for(let i=0;i<3;i++){
        const ph=((t*.018+i*.33)%1),rx=((hash(i,127)*W*1.4-cx*.85)%W+W)%W,ry=110+((hash(i,139)*130-cy*.85)%130+130)%130;
        ctx.strokeStyle=`rgba(185,220,235,${(1-ph)*.24})`;ctx.lineWidth=.7;
        ctx.beginPath();ctx.ellipse(rx,ry,1+ph*7,.4+ph*2.4,0,0,7);ctx.stroke();
      }
    }
    ctx.restore();
  }
  function atmos(ctx,bio,cx,cy){tex();const a=atm(bio);
    const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,`rgba(${a.fog},${a.fa*.5})`);gr.addColorStop(.18,`rgba(${a.fog},${a.fa*.18})`);gr.addColorStop(.38,`rgba(${a.fog},0)`);
    ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
    const wc=wispC(a.wisp),t=G.t*.12;WX.globalCompositeOperation='source-over';WX.clearRect(0,0,240,135);
    for(const L of [{p:.55,v:1,sz:200,oy:-20},{p:.8,v:-.7,sz:150,oy:30}]){const ox=-((((cx*L.p+t*L.v)/2)%L.sz)+L.sz)%L.sz,oy=-((((cy*L.p)/2+L.oy)%L.sz)+L.sz)%L.sz;
      for(let y=oy;y<135;y+=L.sz)for(let x=ox;x<240;x+=L.sz)WX.drawImage(wc,x,y,L.sz,L.sz);}
    const m=WX.createLinearGradient(0,0,0,135);m.addColorStop(0,'rgba(0,0,0,.7)');m.addColorStop(.4,'rgba(0,0,0,.35)');m.addColorStop(.75,'rgba(0,0,0,.08)');m.addColorStop(1,'rgba(0,0,0,.02)');
    WX.globalCompositeOperation='destination-in';WX.fillStyle=m;WX.fillRect(0,0,240,135);
    ctx.save();ctx.globalAlpha=a.wa*.16;ctx.globalCompositeOperation='screen';ctx.imageSmoothingEnabled=true;ctx.drawImage(wC,0,0,W,H);ctx.restore();
    envParticles(ctx,bio,cx,cy);
  }
  // แสงส่องเฉียงจากด้านบน (จางนุ่ม ไม่แยงตา)
  function rays(D,bio){const a=atm(bio);if(!a.ray)return;const t=G.t*.004;D.save();D.globalCompositeOperation='screen';
    for(let k=0;k<3;k++){const x0=((k*380+Math.sin(t+k*1.9)*45)%1280)-160,w=46+((k*29)%50),al=a.ray*.08*(.6+.4*Math.sin(t*1.3+k*2.1));
      const gr=D.createLinearGradient(x0,0,x0+180,440);gr.addColorStop(0,`rgba(${a.rayC},${al})`);gr.addColorStop(.45,`rgba(${a.rayC},${al*.24})`);gr.addColorStop(.85,`rgba(${a.rayC},0)`);
      D.fillStyle=gr;D.beginPath();D.moveTo(x0,0);D.lineTo(x0+w,0);D.lineTo(x0+w+220,440);D.lineTo(x0+120,440);D.closePath();D.fill();}D.restore();}
  // เสาหิน/ผนังกลางห้อง: ยกขึ้นเป็นกล่อง 3 มิติ (หน้าผนังตั้งตรง + ฝาบน) เรียงความลึกกับตัวละคร
  const WH=18,faceCache={};
  function faceTex(bn){if(faceCache[bn])return faceCache[bn];const c=cv(16*RES,32*RES),x=c.getContext('2d'),bi=BIOME[bn]||BIOME.cave;x.setTransform(RES,0,0,RES,0,0);face(x,0,0,0,0,bi);face(x,0,16,1,1,bi);x.fillStyle='rgba(0,0,0,.22)';x.fillRect(0,0,16,32);return faceCache[bn]=c;}
  const capCache={};
  function capTex(bn,v){const k=bn+v;if(capCache[k])return capCache[k];const c=cv(16*RES,16*RES),x=c.getContext('2d'),bi=BIOME[bn]||BIOME.cave;x.setTransform(RES,0,0,RES,0,0);
    const n=parseInt(bi.face[0].slice(1),16),base=[(n>>16&255)*1.12,(n>>8&255)*1.12,(n&255)*1.12];slabs(x,0,0,v*5+1,v*3+2,base,bn==='ice'?'ice':bn==='lava'?'basalt':'slab',bn);
    x.fillStyle='rgba(0,0,0,.25)';x.fillRect(0,0,16,.6);x.fillRect(0,0,.6,16);x.fillRect(15.4,0,.6,16);return capCache[k]=c;}
  function water(B,px,py,tx,ty){const v=lf(px,py),t=[30+v*18,80+v*26,112+v*24];
    B.fillStyle=`rgb(${t[0]|0},${t[1]|0},${t[2]|0})`;B.fillRect(px,py,16,16);
    for(let i=0;i<5;i++){const yy=py+1+hash(tx*9+i,ty*5)*14,xx=px+hash(ty*3+i,tx)*12;B.strokeStyle=`rgba(200,236,255,${.12+hash(i,tx+ty)*.18})`;B.lineWidth=.5;B.beginPath();B.moveTo(xx,yy);B.quadraticCurveTo(xx+2,yy-1,xx+4,yy);B.quadraticCurveTo(xx+6,yy+1,xx+8,yy);B.stroke();}
    B.fillStyle='rgba(10,30,60,.18)';B.fillRect(px,py+12,16,4);}
  function walls(list,cx,cy){if(!PJ.k||!Z||!Z.grid||Z.id==='overworld')return;const gr=Z.grid,isTown=Z.id==='town'||Z.id==='city',x0=Math.max(0,(cx-90)>>4),x1=Math.min(Z.cols-1,(cx+W+90)>>4),y0=Math.max(0,(cy-40)>>4),y1=Math.min(isTown?Z.rows-1:Z.rows-2,(cy+H)>>4);
    const poly=(pts,fill)=>{g.fillStyle=fill;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();g.fill();};
    for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){const c=gr[ty][tx];
      if(isTown&&(tx===0||tx===Z.cols-1)&&ty===22){const bx=tx*16,by=(ty+1)*16;
        list.push({x:bx+8,y:by+2,raw:1,f:()=>{const L=PJ.pt(bx,by),R=PJ.pt(bx+16,by),fh=WH*1.25*L.s,w=R.x-L.x;
          g.fillStyle='#46423b';g.fillRect(L.x,L.y-fh,w,fh);g.fillStyle='#0d1e30';g.beginPath();g.ellipse(L.x+w/2,L.y,w*.4,fh*.42,0,Math.PI,0);g.fill();
          g.fillStyle='#242830';for(let gx=-1;gx<=1;gx++)g.fillRect(L.x+w/2+gx*3*L.s,L.y-fh*.38,Math.max(1,L.s*.7),fh*.38);
          g.fillStyle='#686258';g.fillRect(L.x,L.y-fh,w,3*L.s);}});continue;}
      if(c!=='#')continue;const b=gr[ty+1]?gr[ty+1][tx]:'.',isPerim=isTown&&(tx===0||tx===Z.cols-1||ty<=2||ty>=Z.rows-2),sideWall=isTown&&(tx===0||tx===Z.cols-1)&&ty>2&&ty<Z.rows-2;
      if(!sideWall&&(b==='#'||b==='^'||b==='T'))continue;
      let top=ty;while(top>0&&gr[top-1][tx]==='#'&&ty-top<2)top--;const bx=tx*16,by=(ty+1)*16,ft=faceTex(Z.biomeAt(tx,ty));
      list.push({x:bx+8,y:by,raw:1,f:()=>{const L=PJ.pt(bx,by),R=PJ.pt(bx+16,by),fh=WH*L.s,w=R.x-L.x;
        if(sideWall){
          const tL=PJ.pt(bx,ty*16),tR=PJ.pt(bx+16,ty*16),bL=L,bR=R,inX=tx===0?tR:tL,inB=tx===0?bR:bL;
          // ผนังด้านข้างเรียงตามเส้น Perspective ต่อเนื่องไม่เป็นขั้นบันได
          poly([[tL.x,tL.y-WH*tL.s],[tR.x,tR.y-WH*tR.s],[bR.x,bR.y-WH*bR.s],[bL.x,bL.y-WH*bL.s]],(ty&1)?'#787166':'#6d665b');
          poly([[inX.x,inX.y-WH*inX.s],[inB.x,inB.y-WH*inB.s],[inB.x,inB.y],[inX.x,inX.y]],tx===0?'#4b463f':'#423d37');
          if(ty&1){const mx0=tx===0?tL.x:tL.x+(tR.x-tL.x)*.48,mx1=tx===0?bL.x:bL.x+(bR.x-bL.x)*.48,mw=w*.46,mh=3.8*L.s;
            poly([[mx0,tL.y-WH*tL.s-mh],[mx0+mw,tL.y-WH*tL.s-mh],[mx1+mw,bL.y-WH*bL.s-mh],[mx1,bL.y-WH*bL.s-mh]],'#8e8679');
            poly([[mx0,tL.y-WH*tL.s-mh],[mx1,bL.y-WH*bL.s-mh],[mx1,bL.y-WH*bL.s],[mx0,tL.y-WH*tL.s]],'#5d574e');}
          return;
        }
        g.drawImage(ft,0,0,16*RES,WH*RES,L.x,L.y-fh,w,fh);
        for(let ry=top;ry<=ty;ry++){const tL=PJ.pt(bx,ry*16),tR=PJ.pt(bx+16,ry*16),bL=PJ.pt(bx,(ry+1)*16),bR=PJ.pt(bx+16,(ry+1)*16);
          poly([[tL.x,tL.y-WH*tL.s],[tR.x,tR.y-WH*tR.s],[bR.x,bR.y-WH*bR.s],[bL.x,bL.y-WH*bL.s]],(tx+ry)&1?(isPerim?'#787166':'#59554e'):(isPerim?'#6d665b':'#504c46'));
          g.fillStyle='rgba(0,0,0,.22)';g.fillRect(bL.x,bL.y-WH*bL.s-.7,bR.x-bL.x,.7);}
        if(isPerim){
          // เงาโคนกำแพงบนพื้นหญ้า
          g.fillStyle='rgba(8,10,18,.32)';g.fillRect(L.x,L.y,w,4.5*L.s);
          const isCorner=(tx===0||tx===Z.cols-1)&&(ty<=2||ty===Z.rows-1);
          const capY=PJ.pt(bx,top*16).y-WH*L.s;
          g.fillStyle='rgba(0,0,0,.38)';g.fillRect(L.x,L.y-fh,w,2*L.s);
          if(isCorner){
            const tw=w*1.18,th=11*L.s,tx0=L.x-(tw-w)/2;
            g.fillStyle='#5c564c';g.fillRect(tx0,capY-th,tw,th+5*L.s);
            g.fillStyle='#787166';g.fillRect(tx0,capY-th,tw,3.5*L.s);
            for(let m=0;m<3;m++){g.fillStyle='#8e8679';g.fillRect(tx0+m*(tw/2.6),capY-th-3.5*L.s,tw*.28,3.5*L.s);}
            g.fillStyle='rgba(255,212,115,.9)';g.fillRect(tx0+tw*.38,capY-th*.56,tw*.24,th*.32);
          }else if(tx&1){
            const mw=w*.58,mx=L.x+(w-mw)/2,mh=4.8*L.s;
            g.fillStyle='#847c6f';g.fillRect(mx,capY-mh,mw,mh);
            g.fillStyle='#5a544b';g.fillRect(mx,capY-1.5*L.s,mw,1.5*L.s);
            g.fillStyle='rgba(255,240,210,.32)';g.fillRect(mx,capY-mh,mw,.9*L.s);
          }
          if(ty===2&&tx%8===4&&tx>2&&tx<Z.cols-3){
            g.fillStyle='#1f4788';g.fillRect(L.x+w*.3,L.y-fh*.78,w*.4,fh*.46);
            g.fillStyle='#ffd24a';g.fillRect(L.x+w*.42,L.y-fh*.68,w*.16,fh*.22);
          }
        }
        g.fillStyle='rgba(255,232,195,.22)';g.fillRect(L.x,L.y-fh-.6,w,.6);}});}}
  function voidCol(){try{const bi=BIOME[Z.biomeAt(Math.floor(P.x/16))];return bi?bi.top:'#0d0808';}catch(e){return '#0d0808';}}
  return{floor,face,detail,ground,bb,atmos,rays,voidCol,walls,water,atm,dark:bio=>atm(bio).dark,get bgVer(){return bgVer;}};
})();

/* ---------- ฉากประกอบรายละเอียดสูง (บ้าน ต้นไม้ แผง โคม หีบ คริสตัล ถัง) ----------
   วาดครั้งเดียวลงแคช แล้วแปะทุกเฟรม — ดูละเอียดขึ้นแต่ไม่หนักเครื่อง */
const HDP=(()=>{
  const cache={};
  function spr(key,w,h,ax,ay,draw){let s=cache[key];if(!s){const c=document.createElement('canvas');c.width=w*RES;c.height=h*RES;const x=c.getContext('2d');x.setTransform(RES,0,0,RES,0,0);draw(x,ax,ay);s=cache[key]={c,w,h,ax,ay};}return s;}
  const put=(s,x,y)=>g.drawImage(s.c,Math.round(x-s.ax),Math.round(y-s.ay),s.w,s.h);
  const lin=(x,x0,y0,x1,y1,st)=>{const gr=x.createLinearGradient(x0,y0,x1,y1);st.forEach(([o,c])=>gr.addColorStop(o,c));return gr;};
  const rad=(x,cx,cy,r,st)=>{const gr=x.createRadialGradient(cx,cy,0,cx,cy,r);st.forEach(([o,c])=>gr.addColorStop(o,c));return gr;};
  const shade=(hex,m)=>{const n=parseInt(hex.slice(1),16),r=n>>16&255,gg=n>>8&255,b=n&255;return`rgb(${Math.min(255,r*m)|0},${Math.min(255,gg*m)|0},${Math.min(255,b*m)|0})`;};
  function colosseum(o){const s=spr('colosseum_hd',116,88,58,80,(x,cx,cy)=>{
      // ฐานศิลาและบันไดทางเข้า
      x.fillStyle='#5c5448';x.fillRect(cx-51,cy-7,102,7);
      for(let i=0;i<12;i++){x.fillStyle=i%2?'#766c5c':'#544c40';x.fillRect(cx-50+i*8.4,cy-7,7.8,3.2);x.fillRect(cx-46+i*8.4,cy-3.5,7.8,3);}
      // ผนังหินทรายทรงโค้ง 2 ชั้น (Colosseum)
      x.fillStyle=lin(x,0,cy-46,0,cy-7,[[0,'#dfd0b2'],[.5,'#c6b28e'],[1,'#9e8864']]);
      x.beginPath();x.ellipse(cx,cy-42,48,10,0,Math.PI,0);x.lineTo(cx+48,cy-7);x.lineTo(cx-48,cy-7);x.closePath();x.fill();
      for(let i=0;i<110;i++){x.fillStyle=`rgba(${i%2?'255,250,235':'80,60,35'},.13)`;x.fillRect(cx-46+hash(i,5)*92,cy-44+hash(11,i)*37,1.2,.6);}
      // คิ้วบัวหิน + เชิงเทินด้านบนสุด
      x.fillStyle='#8c7a5c';x.fillRect(cx-49,cy-29,98,3);x.fillRect(cx-50,cy-45,100,4);
      x.fillStyle='#ece0c4';for(let bx=-45;bx<=41;bx+=10)x.fillRect(cx+bx,cy-49,6.5,4.2);
      // ช่องซุ้มโค้งชั้นบน-ล่าง
      for(const ay of[cy-40,cy-22])for(const ax of[-38,-25,25,38]){
        x.fillStyle='#4a3622';x.beginPath();x.ellipse(cx+ax,ay,4.2,4.8,0,Math.PI,0);x.fill();x.fillRect(cx+ax-4.2,ay,8.4,10);
        x.fillStyle='#241812';x.beginPath();x.ellipse(cx+ax,ay+.8,3,3.6,0,Math.PI,0);x.fill();x.fillRect(cx+ax-3,ay+.8,6,9);}
      // ซุ้มประตูอารีนาตรงกลาง + ลูกกรงเหล็ก + บันไดหิน
      x.fillStyle='#4a3826';x.beginPath();x.ellipse(cx,cy-22,12,11,0,Math.PI,0);x.fill();x.fillRect(cx-12,cy-22,24,15);
      x.fillStyle='#1c120d';x.beginPath();x.ellipse(cx,cy-21,9.5,9,0,Math.PI,0);x.fill();x.fillRect(cx-9.5,cy-21,19,14);
      x.fillStyle='#3c3c48';for(let gx=-7;gx<=7;gx+=3.5)x.fillRect(cx+gx,cy-27,1,8);x.fillRect(cx-9,cy-22,18,1);
      x.fillStyle='#a89a82';x.fillRect(cx-14,cy-7,28,3);x.fillRect(cx-16,cy-4,32,2.5);
      // ธงคู่หน้าโคลอสเซียม + ป้ายดาบไขว้ทอง
      for(const sd of[-1,1]){x.fillStyle='#3a2414';x.fillRect(cx+sd*17-.8,cy-35,1.6,28);
        x.fillStyle='#b82828';x.beginPath();x.moveTo(cx+sd*14,cy-34);x.lineTo(cx+sd*20,cy-34);x.lineTo(cx+sd*20,cy-18);x.lineTo(cx+sd*17,cy-15);x.lineTo(cx+sd*14,cy-18);x.closePath();x.fill();
        x.fillStyle='#ffd86a';x.fillRect(cx+sd*17-1.5,cy-31,3,5);}
      x.fillStyle=lin(x,0,cy-47,0,cy-34,[[0,'#7a4c28'],[1,'#4a2c14']]);x.fillRect(cx-15,cy-46,30,11);
      x.strokeStyle='#ffd86a';x.lineWidth=1;x.strokeRect(cx-14.5,cy-45.5,29,10);
      x.strokeStyle='#ffd86a';x.lineWidth=1.5;x.beginPath();x.moveTo(cx-7,cy-43.5);x.lineTo(cx+7,cy-37.5);x.moveTo(cx+7,cy-43.5);x.lineTo(cx-7,cy-37.5);x.stroke();
      x.fillStyle='#c93a32';x.beginPath();x.arc(cx,cy-40.5,3,0,7);x.fill();x.strokeStyle='#ffd86a';x.lineWidth=.9;x.stroke();});
    shadow(g,o.x,o.y,50);put(s,o.x,o.y);}
  function house(o){const s=spr('house2_'+o.roof+(o.sign||''),116,90,58,82,(x,cx,cy)=>{
      x.fillStyle='#665c50';x.fillRect(cx-47,cy-7,94,7);for(let i=0;i<11;i++){x.fillStyle=i%2?'#7a7062':'#5a5248';x.fillRect(cx-46+i*8.4,cy-7,7.8,3);x.fillRect(cx-42+i*8.4,cy-3.5,7.8,3);}
      x.fillStyle=lin(x,0,cy-34,0,cy-7,[[0,'#f4e8ce'],[1,'#cbb68e']]);x.fillRect(cx-44,cy-34,88,27);
      for(let i=0;i<90;i++){x.fillStyle=`rgba(${i%2?'255,255,255':'90,70,40'},.12)`;x.fillRect(cx-44+hash(i,3)*88,cy-34+hash(7,i)*27,1,.5);}
      x.fillStyle='#5a3a22';for(const bx of[-44,-14,12,42])x.fillRect(cx+bx,cy-34,2.5,27);x.fillRect(cx-44,cy-20,88,1.8);
      x.strokeStyle='#5a3a22';x.lineWidth=1.6;x.beginPath();x.moveTo(cx-42,cy-20);x.lineTo(cx-15,cy-33);x.moveTo(cx+14,cy-33);x.lineTo(cx+42,cy-20);x.stroke();
      for(const wx of[-37,21]){x.fillStyle='#3a2414';x.fillRect(cx+wx-1.5,cy-31,17,12);x.fillStyle=lin(x,0,cy-30,0,cy-20,[[0,'#fff3c0'],[1,'#ffb050']]);x.fillRect(cx+wx,cy-30,14,10);
        x.fillStyle='#3a2414';x.fillRect(cx+wx+4.3,cy-30,1,10);x.fillRect(cx+wx+9.2,cy-30,1,10);x.fillRect(cx+wx,cy-25.5,14,1);x.fillStyle='#e8d8b8';x.fillRect(cx+wx-2,cy-19.5,18,1.5);
        for(let i=0;i<7;i++){x.fillStyle=['#e85a6a','#ffd23a','#f8f8f8','#ff8ab0','#7ad06a'][(i+wx)&3];x.fillRect(cx+wx+i*2,cy-18.3,1.4,1.4);}}
      x.fillStyle='#3a2414';x.beginPath();x.moveTo(cx-9,cy-7);x.lineTo(cx-9,cy-19);x.quadraticCurveTo(cx,cy-28,cx+9,cy-19);x.lineTo(cx+9,cy-7);x.fill();
      x.fillStyle=lin(x,cx-7,0,cx+7,0,[[0,'#8a5a32'],[1,'#5e3a1e']]);x.beginPath();x.moveTo(cx-7,cy-7);x.lineTo(cx-7,cy-18.5);x.quadraticCurveTo(cx,cy-25.5,cx+7,cy-18.5);x.lineTo(cx+7,cy-7);x.fill();
      x.fillStyle='rgba(0,0,0,.3)';for(const dx of[-2.6,2])x.fillRect(cx+dx,cy-23,.7,16);x.fillStyle='#ffd23a';x.fillRect(cx+3.6,cy-13,1.6,1.6);
      x.fillStyle='#8a8070';x.fillRect(cx-11,cy-7,22,2.5);x.fillStyle=lin(x,0,cy-35,0,cy-28,[[0,'rgba(0,0,0,.45)'],[1,'rgba(0,0,0,0)']]);x.fillRect(cx-44,cy-34,88,7);
      x.fillStyle='#6f665a';x.fillRect(cx+24,cy-68,9,20);x.fillStyle='#8a8070';x.fillRect(cx+23,cy-71,11,3.5);x.fillStyle='rgba(0,0,0,.35)';x.fillRect(cx+29,cy-68,4,20);
      x.save();x.beginPath();x.moveTo(cx-54,cy-30);x.lineTo(cx,cy-65);x.lineTo(cx+54,cy-30);x.closePath();x.fillStyle=lin(x,0,cy-65,0,cy-30,[[0,shade(o.roof,1.18)],[1,shade(o.roof,.82)]]);x.fill();x.clip();
      for(let r=0;r<10;r++){const yy=cy-63+r*3.6;x.fillStyle='rgba(0,0,0,.28)';x.fillRect(cx-56,yy+2.8,112,.8);x.fillStyle='rgba(255,255,255,.12)';x.fillRect(cx-56,yy,112,.5);
        for(let i=-14;i<14;i++){x.fillStyle='rgba(0,0,0,.18)';x.fillRect(cx+i*5+(r&1)*2.5,yy,.6,3);}}
      x.fillStyle='rgba(0,0,0,.2)';x.beginPath();x.moveTo(cx,cy-65);x.lineTo(cx+56,cy-29);x.lineTo(cx,cy-29);x.fill();x.restore();
      x.strokeStyle=shade(o.roof,.6);x.lineWidth=1.4;x.beginPath();x.moveTo(cx-54,cy-30);x.lineTo(cx,cy-65);x.lineTo(cx+54,cy-30);x.stroke();
      x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=.7;x.beginPath();x.moveTo(cx-53,cy-30.6);x.lineTo(cx,cy-64);x.stroke();
      if(o.sign){x.fillStyle='#3a2414';x.fillRect(cx-1,cy-37,2,5);x.fillStyle=lin(x,0,cy-49,0,cy-35,[[0,'#8a5a32'],[1,'#5a3a1e']]);x.fillRect(cx-16,cy-49,32,12);x.strokeStyle='#c8a464';x.lineWidth=.9;x.strokeRect(cx-15.6,cy-48.6,31.2,11.2);
        if(o.sign==='alchemy'){x.fillStyle='#c9a0ff';x.fillRect(cx-3.5,cy-47,2.2,3.5);x.beginPath();x.arc(cx-2.2,cy-41.8,3.6,0,7);x.fill();x.fillStyle='#7af0c0';x.beginPath();x.arc(cx-2.2,cy-41.2,2.2,0,7);x.fill();x.fillStyle='#ffd87a';x.fillRect(cx+5,cy-45.5,1.2,1.2);x.fillRect(cx+7.5,cy-42,1.2,1.2);}
        else if(o.sign==='store'){x.fillStyle='#ffd87a';x.beginPath();x.arc(cx,cy-43,4,0,7);x.fill();x.fillStyle='#6a4426';x.fillRect(cx-.6,cy-45.4,1.2,4.8);}
        else if(o.sign==='guild'){x.fillStyle='#c93a32';x.beginPath();x.moveTo(cx-5,cy-47);x.lineTo(cx+5,cy-47);x.lineTo(cx+5,cy-41.5);x.lineTo(cx,cy-38);x.lineTo(cx-5,cy-41.5);x.closePath();x.fill();x.strokeStyle='#ffd86a';x.lineWidth=1.1;x.stroke();x.beginPath();x.moveTo(cx-8.5,cy-46.5);x.lineTo(cx+8.5,cy-38.5);x.moveTo(cx+8.5,cy-46.5);x.lineTo(cx-8.5,cy-38.5);x.stroke();}
        else{x.fillStyle='#d8dce4';x.fillRect(cx-7,cy-44.5,11,3.5);x.fillRect(cx-3.5,cy-41,3.5,2.2);x.fillRect(cx-6,cy-39,8.5,1.2);x.fillStyle='#8a5a2a';x.fillRect(cx+2.5,cy-47.5,2.4,7);}}});
    shadow(g,o.x,o.y,48);put(s,o.x,o.y);
    if(G.t%18===0&&FX.on)EP.push({x:o.x+27+rnd(-1,1),y:o.y-69,vx:rnd(.05,.25),vy:-.3,l:70,c:'rgba(230,230,235,.35)'});}
  function tree(o){const v=(o.x*7+o.y*3)%3|0,s=spr('tree'+v,48,56,24,53,(x,cx,cy)=>{
      x.fillStyle=lin(x,cx-3,0,cx+3,0,[[0,'#7a5232'],[.6,'#5a3a22'],[1,'#3a2414']]);x.beginPath();x.moveTo(cx-3.5,cy);x.lineTo(cx-2,cy-18);x.lineTo(cx+2,cy-18);x.lineTo(cx+3.5,cy);x.fill();
      x.fillStyle='#4a2e1a';x.fillRect(cx-6,cy-1.5,4,1.5);x.fillRect(cx+2,cy-1.2,5,1.2);
      const pts=[];for(let i=0;i<16;i++){const a=i/16*Math.PI*2+v,r=7+hash(i,v)*6;pts.push([cx+Math.cos(a)*r*1.15,cy-27+Math.sin(a)*r*.9,6+hash(v,i)*3]);}pts.push([cx,cy-28,8],[cx-4,cy-32,6],[cx+4,cy-25,6]);
      pts.sort((a,b)=>a[1]-b[1]);
      for(const[px,py,r]of pts){x.fillStyle='#1e4220';x.beginPath();x.arc(px+1,py+1.5,r,0,7);x.fill();}
      for(const[px,py,r]of pts){x.fillStyle=rad(x,px-r*.35,py-r*.4,r*1.2,[[0,'#7cc04a'],[.45,'#3f8a34'],[1,'#24562a']]);x.beginPath();x.arc(px,py,r,0,7);x.fill();}
      for(let i=0;i<70;i++){const px=cx+(hash(i,v*3)-.5)*30,py=cy-28+(hash(v*5,i)-.5)*24;x.fillStyle=hash(i*3,v)>.6?'rgba(190,240,120,.55)':'rgba(10,40,10,.35)';x.fillRect(px,py,1,.8);}});
    shadow(g,o.x,o.y,14);const sw=Math.sin(G.t*.02+o.x)*.4;g.save();g.translate(o.x,o.y);g.transform(1,0,sw*.02,1,0,0);g.translate(-o.x,-o.y);put(s,o.x,o.y);g.restore();}
  function lamp(o){const x=o.x,y=o.y,t=G.t,f=.86+Math.sin(t*.12+x)*.08;g.fillStyle='#22222a';g.fillRect(x-.8,y-22,1.6,22);g.fillRect(x-2.5,y-1.5,5,1.5);g.fillRect(x-.8,y-22,5,1);
    g.fillStyle='#2a2a32';g.fillRect(x+2.5,y-23,5,1.2);g.fillStyle=`rgba(255,${202*f|0},126,.92)`;g.fillRect(x+3,y-21.5,4,5);g.fillStyle='#2a2a32';g.fillRect(x+4.6,y-21.5,.8,5);
    g.fillStyle=rad(g,x+5,y-19,10,[[0,`rgba(255,216,138,${.36*f})`],[1,'rgba(255,200,120,0)']]);g.fillRect(x-6,y-29,22,22);
    // หิ่งห้อย/ละอองแสงบินวนรอบโคมไฟ
    for(let i=0;i<2;i++){const a=t*.04+i*3.1+x,mx=x+5+Math.cos(a)*4.5,my=y-19+Math.sin(a*1.3)*2.5;
      g.fillStyle='rgba(255,232,165,.48)';g.fillRect(mx,my,1,1);}}
  function stall(o){const s=spr('stall',50,36,25,32,(x,cx,cy)=>{
      x.fillStyle=lin(x,0,cy-12,0,cy,[[0,'#8a5a32'],[1,'#5a3a1e']]);x.fillRect(cx-19,cy-12,38,12);for(let i=0;i<4;i++){x.fillStyle='rgba(0,0,0,.25)';x.fillRect(cx-19,cy-9+i*3,38,.5);}
      const fr=['#e8462e','#ffcc33','#7ac04a','#ff8a2a','#c860d8'];for(let i=0;i<9;i++){x.fillStyle=fr[i%5];x.beginPath();x.arc(cx-16+i*4,cy-13,1.8,0,7);x.fill();x.fillStyle='rgba(255,255,255,.5)';x.fillRect(cx-16.6+i*4,cy-14.4,.8,.8);}
      x.fillStyle='#3a2414';x.fillRect(cx-19,cy-26,2,14);x.fillRect(cx+17,cy-26,2,14);
      for(let i=0;i<7;i++){x.fillStyle=i%2?'#f2ead8':'#c9473a';x.beginPath();x.moveTo(cx-22+i*6.3,cy-28);x.lineTo(cx-22+(i+1)*6.3,cy-28);x.lineTo(cx-22+(i+1)*6.3,cy-21);x.quadraticCurveTo(cx-22+(i+.5)*6.3,cy-19,cx-22+i*6.3,cy-21);x.fill();}
      x.fillStyle='rgba(0,0,0,.18)';x.fillRect(cx-22,cy-24,44,3);x.fillStyle='rgba(255,255,255,.25)';x.fillRect(cx-22,cy-28,44,.6);});
    shadow(g,o.x,o.y,22);put(s,o.x,o.y);}
  function fountain(o){const s=spr('fount',40,30,20,26,(x,cx,cy)=>{
      x.fillStyle='#5e584c';x.beginPath();x.ellipse(cx,cy-4,17,7.5,0,0,7);x.fill();x.fillStyle=lin(x,0,cy-12,0,cy-2,[[0,'#bdb5a2'],[1,'#8a8272']]);x.beginPath();x.ellipse(cx,cy-6,16.5,7,0,0,7);x.fill();
      x.fillStyle=lin(x,0,cy-10,0,cy-3,[[0,'#2f78b8'],[1,'#5ab4e8']]);x.beginPath();x.ellipse(cx,cy-6.5,13.5,5,0,0,7);x.fill();
      x.fillStyle='#a8a090';x.fillRect(cx-2.2,cy-20,4.4,14);x.fillStyle='rgba(255,255,255,.3)';x.fillRect(cx-2.2,cy-20,1,14);x.fillStyle='#c8c0ae';x.beginPath();x.ellipse(cx,cy-20,5,2,0,0,7);x.fill();});
    shadow(g,o.x,o.y,18);put(s,o.x,o.y);const t=G.t;
    // วงคลื่นน้ำในอ่างน้ำพุ + ละอองไอน้ำศักดิ์สิทธิ์ลอยนุ่มๆ
    for(let i=0;i<2;i++){const ph=((t*.02+i*.5)%1);g.strokeStyle=`rgba(210,242,255,${(1-ph)*.38})`;g.lineWidth=.7;g.beginPath();g.ellipse(o.x,o.y-6.5,2+ph*10,.8+ph*3.2,0,0,7);g.stroke();}
    g.fillStyle='rgba(215,242,255,.78)';const k=(t>>2)%4;g.fillRect(o.x-.6,o.y-25-k*.5,1.2,5);
    for(const d of[-1,1]){g.beginPath();g.strokeStyle='rgba(195,234,255,.62)';g.lineWidth=.8;g.moveTo(o.x,o.y-20);g.quadraticCurveTo(o.x+d*6,o.y-22,o.x+d*9,o.y-8);g.stroke();}
    g.fillStyle='rgba(255,255,255,.45)';g.fillRect(o.x-8+((t>>3)%16),o.y-7,2,.6);
    if(G.t%6===0)EP.push({x:o.x+rnd(-4,4),y:o.y-21,vx:rnd(-.35,.35),vy:-.22,l:22,c:'rgba(185,228,255,.55)'});}
  function chest(o){const k='chest'+(o.opened?1:0)+(o.hidden?1:0),s=spr(k,22,20,11,18,(x,cx,cy)=>{
      const wood=o.hidden?['#5a3a7a','#3a2a4a']:['#9a5e2a','#5e3416'],band='#d8b050';
      x.fillStyle=lin(x,0,cy-9,0,cy,[[0,wood[0]],[1,wood[1]]]);x.fillRect(cx-8,cy-9,16,9);
      if(o.opened){x.fillStyle='#2a1408';x.fillRect(cx-7,cy-10,14,2);x.fillStyle=lin(x,0,cy-16,0,cy-10,[[0,wood[0]],[1,wood[1]]]);x.fillRect(cx-8,cy-16,16,5);x.fillStyle='rgba(255,220,120,.6)';x.fillRect(cx-6,cy-10,12,1);}
      else{x.fillStyle=lin(x,0,cy-15,0,cy-9,[[0,shade(wood[0],1.2)],[1,wood[0]]]);x.beginPath();x.moveTo(cx-8,cy-9);x.lineTo(cx-8,cy-12);x.quadraticCurveTo(cx,cy-16.5,cx+8,cy-12);x.lineTo(cx+8,cy-9);x.fill();}
      x.fillStyle=band;x.fillRect(cx-8,cy-9.5,16,1.2);x.fillRect(cx-5.5,cy-(o.opened?16:14),1.4,(o.opened?16:14));x.fillRect(cx+4.1,cy-(o.opened?16:14),1.4,(o.opened?16:14));
      x.fillStyle='#ffe58a';x.fillRect(cx-1.2,cy-10,2.4,3);x.fillStyle='#3a2414';x.fillRect(cx-.3,cy-8.8,.6,1.2);x.fillStyle='rgba(255,255,255,.3)';x.fillRect(cx-8,cy-9,16,.5);});
    shadow(g,o.x,o.y,9);put(s,o.x,o.y);if(!o.opened&&(G.t+o.x)%90<12){g.fillStyle='rgba(255,245,200,.8)';g.fillRect(o.x+5,o.y-16,.8,3);g.fillRect(o.x+4,o.y-15,3,.8);}}
  function crystal(o){const s=spr('crys',22,24,11,22,(x,cx,cy)=>{
      const sh=(pts,c1,c2)=>{x.fillStyle=lin(x,pts[0][0],pts[0][1],pts[2][0],pts[2][1],[[0,c1],[1,c2]]);x.beginPath();x.moveTo(...pts[0]);for(const p of pts.slice(1))x.lineTo(...p);x.closePath();x.fill();};
      sh([[cx+5,cy-10],[cx+9,cy],[cx+2,cy]],'#bff0ff','#2a7ab8');sh([[cx-6,cy-8],[cx-2,cy],[cx-9,cy]],'#9ae0ff','#1f5f98');
      sh([[cx,cy-19],[cx+4.5,cy-6],[cx+3,cy],[cx-3,cy],[cx-4.5,cy-6]],'#e8fbff','#3a9ad8');x.fillStyle='rgba(255,255,255,.75)';x.fillRect(cx-1.2,cy-15,1,8);x.fillStyle='rgba(0,40,90,.3)';x.beginPath();x.moveTo(cx,cy-19);x.lineTo(cx+4.5,cy-6);x.lineTo(cx+3,cy);x.lineTo(cx,cy);x.fill();});
    shadow(g,o.x,o.y,9);const t=G.t,p=.5+Math.sin(t*.05+o.x)*.2;
    g.strokeStyle=`rgba(130,218,255,${.22*p})`;g.lineWidth=.8;g.beginPath();g.ellipse(o.x,o.y-1,9+p*2,3.2+p*.6,0,0,7);g.stroke();
    g.fillStyle=rad(g,o.x,o.y-9,16,[[0,`rgba(120,220,255,${.28*p})`],[1,'rgba(120,220,255,0)']]);g.fillRect(o.x-16,o.y-25,32,32);put(s,o.x,o.y);
    for(let i=0;i<2;i++){const a=t*.04+i*3.14+o.x,mx=o.x+Math.cos(a)*7,my=o.y-8+Math.sin(a*1.4)*4;g.fillStyle='rgba(195,240,255,.55)';g.fillRect(mx,my,1.1,1.1);}}
  function barrel(o){const s=spr('barrel',16,18,8,16,(x,cx,cy)=>{x.fillStyle=lin(x,cx-6,0,cx+6,0,[[0,'#5e3a1e'],[.35,'#a06a3a'],[1,'#4a2c16']]);x.beginPath();x.moveTo(cx-5.5,cy);x.quadraticCurveTo(cx-7.5,cy-7,cx-5.5,cy-14);x.lineTo(cx+5.5,cy-14);x.quadraticCurveTo(cx+7.5,cy-7,cx+5.5,cy);x.fill();
      x.fillStyle='#3a3a40';x.fillRect(cx-6.6,cy-11,13.2,1.2);x.fillRect(cx-6.6,cy-4,13.2,1.2);x.fillStyle='#c0925a';x.beginPath();x.ellipse(cx,cy-14,5.5,1.8,0,0,7);x.fill();x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.ellipse(cx,cy-14,4,1.1,0,0,7);x.fill();});
    shadow(g,o.x,o.y,7);put(s,o.x,o.y);}
  return{house,colosseum,tree,lamp,stall,fountain,chest,crystal,barrel};
})();

/* ---------- ฉากต่อสู้แบบไดออรามา: ผนังไกล (เบลอ+หมอก) · พื้นมุมเอียง · เสาหน้ากล้อง (เบลอ) ---------- */
const HDB=(()=>{
  const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w*RES;c.height=h*RES;const x=c.getContext('2d');x.setTransform(RES,0,0,RES,0,0);return[c,x];};
  const FLOORB={cave:'cave',stone:'cave',lava:'lava',dragon:'dragon',cathedral:'sanctum',frost:'ice',tower:'tower',arena:'cave',rose:'tower',aether:'sanctum'};
  const mul=(a,m)=>a.map(v=>Math.min(255,v*m));
  const col=(a,m=1,al=1)=>`rgba(${Math.min(255,a[0]*m)|0},${Math.min(255,a[1]*m)|0},${Math.min(255,a[2]*m)|0},${al})`;
  function wall(x,P,scene){
    if(scene==='dragon'){
      // ฉากต่อสู้ป่าแถวภูเขา: ทิวเขาสลับซับซ้อน + หมอกหุบเขา + แนวป่าสนหลายชั้น
      const sky=x.createLinearGradient(0,0,0,206);sky.addColorStop(0,'#172d38');sky.addColorStop(.55,'#2e5148');sky.addColorStop(1,'#4d7356');x.fillStyle=sky;x.fillRect(0,0,W,206);
      const ridge=(pts,c1,c2)=>{x.fillStyle=c1;x.beginPath();x.moveTo(0,206);for(const[px,py]of pts)x.lineTo(px,py);x.lineTo(W,206);x.closePath();x.fill();
        x.fillStyle=c2;for(let i=0;i<pts.length-1;i+=2){const[ax,ay]=pts[i],[bx,by]=pts[i+1]||[W,206];x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.lineTo(ax+(bx-ax)*.3,206);x.closePath();x.fill();}};
      ridge([[0,126],[52,62],[112,118],[178,44],[246,104],[318,38],[392,106],[446,60],[480,118]],'#273e44','#345258');
      ridge([[0,152],[40,108],[92,144],[144,88],[208,138],[274,84],[338,140],[404,92],[462,136],[480,126]],'#1f372d','#2b4c39');
      x.fillStyle='rgba(200,235,205,.18)';x.fillRect(0,132,W,26);
      // ป่าสนระยะกลาง-ใกล้ริมขอบผา
      for(let i=0;i<34;i++){const tx=i*15+(hash(i,9)-.5)*8,th=26+hash(i,17)*32,by=206,colT=i%3===0?'#152e1e':i%3===1?'#1e4228':'#275232';
        x.fillStyle='#2a1d14';x.fillRect(tx-1.5,by-10,3,10);x.fillStyle=colT;
        for(let t2=0;t2<3;t2++){const w2=(14-t2*3),y2=by-8-t2*(th*.26);x.beginPath();x.moveTo(tx-w2,y2);x.lineTo(tx,y2-th*.38);x.lineTo(tx+w2,y2);x.closePath();x.fill();}}
      return;
    }
    for(let y=0,r=0;y<206;y+=16,r++){let xx=-(r%2)*14;while(xx<W){const w=26+hash(xx,r*7)*20,v=.85+hash(r,xx)*.35,b=r%3===0?P.wall:P.wallD;
      x.fillStyle=col(b,v*1.35);x.fillRect(xx+.5,y+.5,w-1,15);x.fillStyle='rgba(255,240,220,.10)';x.fillRect(xx+.5,y+.5,w-1,.8);x.fillStyle='rgba(0,0,0,.35)';x.fillRect(xx+.5,y+14.5,w-1,1);
      if(hash(xx*3,r)>.8){x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=.6;x.beginPath();x.moveTo(xx+w*.3,y+2);x.lineTo(xx+w*.4,y+8);x.lineTo(xx+w*.35,y+14);x.stroke();}xx+=w;}}
    for(const ax of [120,240,360]){const aw=ax===240?70:50,top=ax===240?40:70;
      x.fillStyle=col(P.wallD,.9);x.fillRect(ax-aw/2-7,top-8,aw+14,206-top+8);
      const gr=x.createLinearGradient(0,top,0,206);gr.addColorStop(0,'rgba(0,0,0,.92)');gr.addColorStop(1,'rgba(0,0,0,.6)');x.fillStyle=gr;
      x.beginPath();x.moveTo(ax-aw/2,206);x.lineTo(ax-aw/2,top+aw/2);x.arc(ax,top+aw/2,aw/2,Math.PI,0);x.lineTo(ax+aw/2,206);x.fill();
      const gl=x.createRadialGradient(ax,150,4,ax,150,aw*.9);gl.addColorStop(0,P.glow+'33');gl.addColorStop(1,P.glow+'00');x.fillStyle=gl;x.fillRect(ax-aw,top,aw*2,206-top);
      for(let k=0;k<9;k++){const a=Math.PI+k/8*Math.PI,r=aw/2+4;x.fillStyle=col(P.wall,1.5);x.save();x.translate(ax+Math.cos(a)*r,top+aw/2+Math.sin(a)*r);x.rotate(a+Math.PI/2);x.fillRect(-3.5,-3,7,6);x.fillStyle='rgba(0,0,0,.3)';x.fillRect(-3.5,2,7,1);x.restore();}}
    if(scene==='cave'||scene==='stone'){x.fillStyle='rgba(10,8,8,.85)';for(let i=0;i<18;i++){const sx=hash(i,11)*W,h=10+hash(i,13)*34;x.beginPath();x.moveTo(sx-5,0);x.lineTo(sx+5,0);x.lineTo(sx,h);x.fill();}
      for(let i=0;i<26;i++){const sx=hash(i,5)*W,len=20+hash(5,i)*90;x.strokeStyle=`rgba(${70+i%3*12},${110+i%4*10},50,.7)`;x.lineWidth=.8+hash(i,i)*1.2;x.beginPath();x.moveTo(sx,0);x.bezierCurveTo(sx+6,len*.3,sx-6,len*.6,sx+2,len);x.stroke();
        for(let k=0;k<4;k++){x.fillStyle='rgba(90,140,60,.7)';x.fillRect(sx+(hash(i,k)-.5)*5,len*(k+1)/5,2,1.4);}}}
    if(scene==='lava'){for(const lx of [240]){const lg=x.createLinearGradient(lx-20,0,lx+20,0);lg.addColorStop(0,'rgba(255,90,20,0)');lg.addColorStop(.5,'rgba(255,170,60,.95)');lg.addColorStop(1,'rgba(255,90,20,0)');x.fillStyle=lg;x.fillRect(lx-22,70,44,136);}
      x.strokeStyle='rgba(255,120,40,.7)';x.lineWidth=.8;for(let i=0;i<20;i++){const sx=hash(i,3)*W,sy=20+hash(3,i)*170;x.beginPath();x.moveTo(sx,sy);x.lineTo(sx+4,sy+6);x.lineTo(sx+1,sy+12);x.stroke();}}
    if(scene==='frost'){for(let i=0;i<40;i++){const sx=hash(i,7)*W,h=6+hash(7,i)*26;x.fillStyle='rgba(225,245,255,.85)';x.beginPath();x.moveTo(sx-3,0);x.lineTo(sx+3,0);x.lineTo(sx,h);x.fill();}
      for(let y=16;y<206;y+=48){x.fillStyle='rgba(240,250,255,.55)';x.fillRect(0,y-1,W,2);}}
    if(scene==='cathedral'||scene==='aether'){const cx=240,top=40,aw=70;const cols=scene==='aether'?['#ffe878','#fff6c0','#7af0ff','#ffd23a','#ffffff']:['#ff6a6a','#ffd26a','#6ab4ff','#9aff9a','#c89aff'];
      for(let i=0;i<24;i++){x.fillStyle=cols[i%5]+'cc';x.fillRect(cx-28+(i%6)*9.5,top+20+(i/6|0)*20,8,18);}x.fillStyle='rgba(255,250,230,.5)';x.beginPath();x.arc(cx,top+aw/2,18,0,7);x.fill();
      for(const bx of [60,420]){x.fillStyle=scene==='aether'?'#1a2440':'#7a1a2a';x.fillRect(bx-8,20,16,70);x.fillStyle='#d8b050';x.fillRect(bx-8,20,16,3);x.beginPath();x.moveTo(bx-8,90);x.lineTo(bx,82);x.lineTo(bx+8,90);x.fillStyle=scene==='aether'?'#1a2440':'#7a1a2a';x.fill();}}
    if(scene==='tower'){x.font='10px serif';for(let i=0;i<30;i++){const sx=hash(i,9)*W,sy=10+hash(9,i)*180;x.fillStyle=`rgba(122,240,192,${.25+hash(i,2)*.5})`;x.fillText('ᚠᚢᚦᚨᚱᚲᚷᚹ'[i%8],sx,sy);}}
    if(scene==='arena'){for(let r=0;r<5;r++)for(let i=0;i<70;i++){const sx=i*7+(r%2)*3,sy=16+r*12;x.fillStyle=`rgba(${20+hash(i,r)*40|0},${16+hash(r,i)*30|0},${14},.9)`;x.beginPath();x.arc(sx,sy,2.6,0,7);x.fill();x.fillRect(sx-3,sy+2,6,6);}
      for(let i=0;i<8;i++){x.fillStyle=i%2?'#8a1a1a':'#c8a040';x.fillRect(30+i*56,78,30,24);x.beginPath();x.moveTo(30+i*56,102);x.lineTo(45+i*56,110);x.lineTo(60+i*56,102);x.fill();}}
  }
  function floor(P,scene){const[c,x]=mk(640,128),bn=FLOORB[scene]||'cave',base=mul(P.floor,scene==='arena'?1.5:1.65);
    for(let ty=0;ty<8;ty++)for(let tx=0;tx<40;tx++)HD.floor(x,tx*16,ty*16,tx+60,ty+40,bn,scene==='arena'?[150,124,90]:base,scene==='arena');HD.detail(x,640,128);return c;}
  function build(c,scene){const P=SCENE_PAL[scene]||SCENE_PAL.cave;
    const gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,P.sky[0]);gr.addColorStop(1,P.sky[1]);c.fillStyle=gr;c.fillRect(0,0,W,H);
    const[wc,wx]=mk(W,210);wall(wx,P,scene);c.save();c.filter='blur(1.1px)';c.drawImage(wc,0,0,W,210);c.restore();
    const fg=c.createLinearGradient(0,0,0,206);const fc=(P.fog.match(/\d+,\s*\d+,\s*\d+/)||['150,150,150'])[0];fg.addColorStop(0,`rgba(${fc},.42)`);fg.addColorStop(.6,`rgba(${fc},.12)`);fg.addColorStop(1,`rgba(${fc},.22)`);c.fillStyle=fg;c.fillRect(0,0,W,206);
    // พื้นมุมเอียง: แถวหลังเล็ก แถวหน้าใหญ่
    const ft=floor(P,scene),yT=196,yB=H,s0=.78,s1=1.4,k=(s1-s0)/(yB-yT);let acc=0;c.save();c.imageSmoothingEnabled=true;
    for(let y=yT;y<yB;y+=.5){const s=s0+k*(y-yT),rows=.5/s,hw=W/2/s;c.drawImage(ft,(320-hw)*RES,acc*RES,2*hw*RES,Math.max(.5,rows*RES),0,y,W,.5);acc+=rows;}c.restore();
    const ao=c.createLinearGradient(0,190,0,214);ao.addColorStop(0,'rgba(0,0,0,.6)');ao.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=ao;c.fillRect(0,190,W,24);
    c.save();c.globalCompositeOperation='lighter';const pool=c.createRadialGradient(240,238,10,240,238,190);pool.addColorStop(0,P.glow+'26');pool.addColorStop(1,P.glow+'00');c.fillStyle=pool;c.save();c.translate(240,238);c.scale(1,.3);c.translate(-240,-238);c.fillRect(40,100,400,300);c.restore();c.restore();
    for(const[px,w]of[[-14,46],[448,46]]){const[pc,px2]=mk(60,H);
      if(scene==='dragon'){
        // ลำต้นสนยักษ์และพุ่มไม้ขอบฉากหน้า
        const tg=px2.createLinearGradient(0,0,60,0);tg.addColorStop(0,'#140d09');tg.addColorStop(.5,'#3d281a');tg.addColorStop(1,'#140d09');px2.fillStyle=tg;px2.fillRect(10,0,w-8,H);
        px2.fillStyle='#19381f';for(let k=0;k<4;k++){px2.beginPath();px2.arc(30,24+k*24,22,0,7);px2.fill();}
      }else{
        const pg=px2.createLinearGradient(0,0,60,0);pg.addColorStop(0,'#08060a');pg.addColorStop(.5,col(P.wallD,.7));pg.addColorStop(1,'#08060a');px2.fillStyle=pg;px2.fillRect(7,0,w,H);
        for(let y=0;y<H;y+=18){px2.fillStyle='rgba(0,0,0,.4)';px2.fillRect(7,y,w,1.2);px2.fillStyle='rgba(255,230,200,.06)';px2.fillRect(7,y+1.2,w,.8);}
      }
      c.save();c.filter='blur(2.2px)';c.drawImage(pc,px-7,0,60,H);c.restore();}
    const vg=c.createRadialGradient(W/2,H*.5,H*.3,W/2,H*.5,H*.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=vg;c.fillRect(0,0,W,H);
    c.fillStyle=P.glow;c.globalAlpha=.06;c.fillRect(0,GY-2,W,2);c.globalAlpha=1;}
  return{build};
})();

/* ---------- ของตกแต่งพื้นดันเจียน (สไตล์ HD-2D: กองหิน คริสตัลเรืองแสง กอหญ้า ตอเสาหัก) ----------
   - วางอัตโนมัติตามช่องพื้นที่ติดผนัง (สุ่มแบบคงที่ต่อโซน ไม่เปลี่ยนทุกครั้งที่วาด)
   - เป็นแค่ภาพ ไม่กันทางเดิน · วาดลงแคชครั้งเดียวแล้วแปะตามมุมกล้อง
   - คริสตัลส่งแสงเข้าระบบแสงของฉาก (HDD.lights) */
const HDD=(()=>{
  const COL={cave:['#ffb04a','#fff0c0','#a8521a'],ice:['#9fe8ff','#ffffff','#2a78b8'],lava:['#ff6a2a','#ffe0a0','#8a1a08'],dragon:['#ffa840','#fff2c0','#a84414'],tower:['#7af0c0','#efffff','#1a8a6a'],frost:['#9fe8ff','#ffffff','#2a78b8'],stone:['#ffb04a','#fff0c0','#a8521a']};
  const ROCK={cave:['#6e6458','#4a4238','#958a7a'],ice:['#8aa8bc','#5a7488','#d8eef8'],lava:['#3a3030','#221a1a','#5a4a44'],dragon:['#687064','#424840','#949c8e'],tower:['#56625e','#38423e','#7e8a84'],frost:['#8aa8bc','#5a7488','#d8eef8'],stone:['#6e6458','#4a4238','#958a7a']};
  const SC=3,cache={};let zk=null,items=[];
  function cv(w,h){const c=document.createElement('canvas');c.width=w*SC;c.height=h*SC;const x=c.getContext('2d');x.setTransform(SC,0,0,SC,0,0);return[c,x];}
  function rubble(x,bio,v){const R=ROCK[bio]||ROCK.cave;
    x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(24,35,15,4,0,0,7);x.fill();
    const n=5+(v*3|0);for(let i=0;i<n;i++){const px=12+hash(i,v*9+1)*24,py=33-hash(v*7,i)*7,r=2+hash(i*3,v)*4.5;
      x.fillStyle=R[1];x.beginPath();x.moveTo(px-r,py);x.lineTo(px-r*.6,py-r*.9);x.lineTo(px+r*.5,py-r);x.lineTo(px+r,py-r*.2);x.lineTo(px+r*.7,py+r*.3);x.lineTo(px-r*.8,py+r*.3);x.closePath();x.fill();
      x.fillStyle=R[0];x.beginPath();x.moveTo(px-r*.6,py-r*.9);x.lineTo(px+r*.5,py-r);x.lineTo(px+r*.8,py-r*.3);x.lineTo(px-r*.4,py-r*.3);x.closePath();x.fill();
      x.fillStyle=R[2];x.fillRect(px-r*.4,py-r*.95,r*.6,.5);}
    for(let i=0;i<9;i++){x.fillStyle=hash(i,v)>.5?R[1]:R[0];x.fillRect(8+hash(i*5,v)*32,32+hash(v,i*7)*4,1,.8);}}
  function crystal(x,bio,v){const C=COL[bio]||COL.cave,R=ROCK[bio]||ROCK.cave;
    const gl=x.createRadialGradient(24,28,1,24,28,18);gl.addColorStop(0,C[0]+'66');gl.addColorStop(1,C[0]+'00');x.fillStyle=gl;x.fillRect(0,6,48,34);
    x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(24,35,11,3,0,0,7);x.fill();
    for(let i=0;i<4;i++){x.fillStyle=i&1?R[1]:R[0];x.beginPath();x.arc(15+i*6+hash(i,v)*3,34,2.6,Math.PI,0);x.fill();}
    const n=3+(v*3|0);
    for(let i=0;i<n;i++){const bx=17+hash(i,v*5+2)*14,h=6+hash(v*3,i)*10*(i===1?1.35:1),w=1.6+hash(i*7,v)*1.6,lean=(hash(i,v*11)-.5)*.7;
      x.save();x.translate(bx,34);x.rotate(lean);
      const gr=x.createLinearGradient(-w,0,w,0);gr.addColorStop(0,C[2]);gr.addColorStop(.45,C[0]);gr.addColorStop(.55,C[1]);gr.addColorStop(1,C[0]);
      x.fillStyle=gr;x.beginPath();x.moveTo(-w,0);x.lineTo(-w*.8,-h*.75);x.lineTo(0,-h);x.lineTo(w*.8,-h*.75);x.lineTo(w,0);x.closePath();x.fill();
      x.fillStyle='rgba(255,255,255,.55)';x.beginPath();x.moveTo(-w*.1,-h*.95);x.lineTo(w*.25,-h*.7);x.lineTo(w*.15,-h*.15);x.lineTo(-w*.15,-h*.2);x.closePath();x.fill();x.restore();}}
  function tuft(x,bio,v){
    if(bio==='ice'||bio==='frost'){x.fillStyle='rgba(0,0,0,.2)';x.beginPath();x.ellipse(24,35,13,3.2,0,0,7);x.fill();
      x.fillStyle='#dcefff';x.beginPath();x.ellipse(24,32.5,12,4.5,0,Math.PI,0);x.fill();x.fillStyle='#ffffff';x.beginPath();x.ellipse(22,30.5,7,2.4,0,Math.PI,0);x.fill();
      for(let i=0;i<5;i++){x.fillStyle='rgba(255,255,255,.9)';x.fillRect(14+hash(i,v)*20,29+hash(v,i)*4,.6,.6);}return;}
    if(bio==='lava'){for(let i=0;i<6;i++){const px=14+hash(i,v)*20,py=34-hash(v,i)*4,r=1.6+hash(i*3,v)*2.4;x.fillStyle='#241a18';x.beginPath();x.arc(px,py,r,0,7);x.fill();
      x.fillStyle=hash(i,v*3)>.5?'#ff7a2a':'#ffb84a';x.fillRect(px-r*.4,py-r*.2,r*.7,.6);x.fillRect(px,py-r*.6,.6,r*.5);}return;}
    const G=bio==='tower'?['#3a6a5a','#5aa080','#9ae0b8']:bio==='dragon'?['#2c5824','#4a8834','#96cc58']:['#3a5a22','#5a8a32','#a8d060'];
    x.fillStyle='rgba(20,30,10,.35)';x.beginPath();x.ellipse(24,35,12,3,0,0,7);x.fill();
    for(let i=0;i<22;i++){const bx=14+hash(i,v*13)*20,h=4+hash(v,i*5)*9,c=G[(hash(i*7,v)*3)|0];x.strokeStyle=c;x.lineWidth=.9;x.beginPath();x.moveTo(bx,35);x.quadraticCurveTo(bx+(hash(i,v)-.5)*3,35-h*.6,bx+(hash(i*3,v)-.5)*6,35-h);x.stroke();}
    if(hash(v,99)>.5)for(let i=0;i<3;i++){x.fillStyle=['#f4e27a','#ffffff','#f08ab0'][i];x.beginPath();x.arc(16+hash(i,v*3)*16,26+hash(v*5,i)*5,1,0,7);x.fill();}}
  function stump(x,bio,v){const R=ROCK[bio]||ROCK.cave,h=10+v*10;
    x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(24,35,12,3.6,0,0,7);x.fill();
    const gr=x.createLinearGradient(15,0,33,0);gr.addColorStop(0,R[1]);gr.addColorStop(.35,R[2]);gr.addColorStop(.6,R[0]);gr.addColorStop(1,R[1]);
    x.fillStyle=R[1];x.fillRect(13,31,22,4);x.fillStyle=R[0];x.fillRect(13,30,22,1.4);
    x.fillStyle=gr;x.beginPath();x.moveTo(16,31);x.lineTo(16,31-h);x.lineTo(19,31-h-2);x.lineTo(23,31-h+1);x.lineTo(27,31-h-3);x.lineTo(32,31-h);x.lineTo(32,31);x.closePath();x.fill();
    for(let k=19;k<32;k+=4){x.fillStyle='rgba(0,0,0,.18)';x.fillRect(k,31-h+2,.8,h-2);}
    x.fillStyle='rgba(0,0,0,.25)';x.fillRect(16,31-h*.55,16,.6);
    if(bio!=='lava'){x.fillStyle=bio==='ice'?'rgba(240,250,255,.85)':'rgba(90,140,60,.85)';for(let i=0;i<10;i++)x.fillRect(16+hash(i,v)*15,31-h+hash(v,i)*h*.5,1.4,.9);}
    for(let i=0;i<3;i++){x.fillStyle=R[1];x.beginPath();x.arc(10+i*14+hash(i,v)*4,34,1.8,Math.PI,0);x.fill();}}
  const DRAW={rubble,crystal,tuft,stump};
  function sprite(k,bio,v){const key=k+bio+v;if(cache[key])return cache[key];const[c,x]=cv(48,40);DRAW[k](x,bio,v/3);return cache[key]=c;}
  function gen(){if(!Z||!Z.grid||Z.id==='town'||Z.id==='arena')return[];const key=Z.id+':'+Z.grid.length+':'+(Z.floor||0);if(key===zk)return items;zk=key;items=[];
    const gr=Z.grid,rows=gr.length,cols=gr[0].length,used=new Set(),seed=(Z.id||'').length*31+(Z.floor||0)*7+(hash(Z.grid[5].join('').length,rows)*999|0);
    const near=(x,y)=>(Z.props||[]).some(o=>Math.abs(o.x-(x*16+8))<22&&Math.abs(o.y-(y*16+8))<22)||Math.abs(x*16+8-(Z.spawn?Z.spawn.x:0))<28&&Math.abs(y*16+8-(Z.spawn?Z.spawn.y:0))<28;
    for(let y=3;y<rows-1;y++)for(let x=1;x<cols-1;x++){if(gr[y][x]!=='.')continue;
      const wall=(gr[y][x-1]==='#')+(gr[y][x+1]==='#')+(gr[y-1][x]==='#'||gr[y-1][x]==='^')+(gr[y+1][x]==='#');const r=hash(x*17+seed,y*31+seed);
      if(r<(wall?.7:.96)||used.has(x+','+y)||near(x,y))continue;used.add(x+','+y);
      const bio=(Z.biomeAt?Z.biomeAt(x,y):'cave')||'cave',q=hash(y*7+seed,x*3);
      const k=wall?(q<.36?'rubble':q<.5?'crystal':q<.86?'tuft':'stump'):(q<.6?'tuft':q<.92?'rubble':'crystal');
      items.push({k,bio,v:(hash(x,y*5+seed)*3)|0,x:x*16+8+(hash(y,x)-.5)*8,y:y*16+11+(hash(x*3,y)-.5)*5});}
    return items;}
  function push(list,cx){if(typeof FX!=='undefined'&&!FX.on)return;for(const d of gen())if(d.x>cx-60&&d.x<cx+W+60)list.push({x:d.x,y:d.y-3,f:()=>{
    g.drawImage(sprite(d.k,d.bio,d.v),d.x-24,d.y-35,48,40);
    if(d.k==='crystal'&&(G.t+d.x*3|0)%120<2)EP.push({x:d.x+rnd(-6,6),y:d.y-rnd(4,14),vx:0,vy:-.25,l:40,c:(COL[d.bio]||COL.cave)[1]});}});}
  function lights(ls){if(typeof FX!=='undefined'&&!FX.on)return;for(const d of gen())if(d.k==='crystal')ls.push({x:d.x,y:d.y-8,r:38+Math.sin(G.t*.05+d.x)*3,c:(COL[d.bio]||COL.cave)[0]+'22'});}
  return{gen,push,lights,reset(){zk=null;}};
})();
