/* 寒焰：普通透明混合保留青蓝层次，只有细节高光使用加法。 */
(() => {
  'use strict';
  const strands = [
    {x:-39,h:203,w:23,phase:1.1}, {x:30,h:235,w:25,phase:3.7},
    {x:-12,h:294,w:30,phase:.3}, {x:46,h:163,w:17,phase:5.2},
    {x:-53,h:143,w:16,phase:2.6}
  ];
  function draw(ctx,{x,y,time,reducedMotion=false}) {
    const t=reducedMotion?0:time;
    ctx.save();
    ctx.translate(x,y);
    ctx.globalCompositeOperation='source-over';
    // Restrict the halo to the altar, keeping the background architecture visible.
    const halo=ctx.createRadialGradient(0,-75,6,0,-75,180);
    halo.addColorStop(0,'rgba(12,97,171,.19)');
    halo.addColorStop(.55,'rgba(19,112,190,.09)');
    halo.addColorStop(1,'rgba(14,88,160,0)');
    ctx.fillStyle=halo;ctx.fillRect(-180,-255,360,360);
    for(const s of strands){
      const height=s.h*(1+.045*Math.sin(t*1.7+s.phase));
      const points=[];
      for(let i=0;i<=26;i++){
        const u=i/26;
        const sway=Math.sin(u*7-t*1.65+s.phase)* (7+u*14)
          +Math.sin(u*13-t*2.1+s.phase)*5*u;
        const center=s.x*(1-u*.66)+sway;
        const width=s.w*Math.pow(1-u,.8)*(.78+.22*Math.sin(u*10-t*2+s.phase));
        points.push({x:center,y:-u*height,w:width});
      }
      const shape=()=>{
        ctx.beginPath();
        points.forEach((p,i)=>i?ctx.lineTo(p.x-p.w,p.y):ctx.moveTo(p.x-p.w,p.y));
        for(let i=points.length-1;i>=0;i--){const p=points[i];ctx.lineTo(p.x+p.w,p.y);}
        ctx.closePath();
      };
      const color=ctx.createLinearGradient(0,0,0,-height);
      color.addColorStop(0,'rgba(12,92,186,0)');
      color.addColorStop(.13,'rgba(18,112,211,.61)');
      color.addColorStop(.43,'rgba(35,163,235,.56)');
      color.addColorStop(.75,'rgba(98,225,249,.38)');
      color.addColorStop(1,'rgba(149,241,255,0)');
      shape();ctx.fillStyle=color;ctx.fill();
      // A narrow, interrupted luminous filament leaves space between the tongues.
      ctx.beginPath();
      points.forEach((p,i)=>i?ctx.lineTo(p.x+p.w*.22,p.y):ctx.moveTo(p.x+p.w*.22,p.y));
      const edge=ctx.createLinearGradient(0,0,0,-height);
      edge.addColorStop(0,'rgba(81,207,255,0)');
      edge.addColorStop(.3,'rgba(96,222,255,.52)');
      edge.addColorStop(.7,'rgba(173,246,255,.65)');
      edge.addColorStop(1,'rgba(161,240,255,0)');
      ctx.strokeStyle=edge;ctx.lineWidth=1.4;ctx.stroke();
    }
    // Low elliptical seal reads as part of the stone surface, not a portal.
    ctx.save();ctx.scale(1,.24);
    ctx.strokeStyle='rgba(86,208,247,.42)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,67,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='rgba(92,212,255,.23)';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(0,0,77,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      ctx.save();ctx.rotate(a);
      ctx.beginPath();ctx.moveTo(58,-3);ctx.lineTo(62,2);ctx.lineTo(57,7);
      ctx.stroke();ctx.restore();
    }
    ctx.restore();
    ctx.globalCompositeOperation='lighter';
    const base=ctx.createRadialGradient(0,-5,0,0,-5,64);
    base.addColorStop(0,'rgba(81,198,255,.17)');base.addColorStop(1,'rgba(23,131,255,0)');
    ctx.fillStyle=base;ctx.beginPath();ctx.ellipse(0,-5,64,17,0,0,Math.PI*2);ctx.fill();
    for(let i=0;i<18;i++){
      const life=((t*(.11+(i%4)*.018)+i*.61803398875)%1+1)%1;
      const px=Math.sin(i*13.7)*66+Math.sin(t*.65+i)*10;
      const py=-18-life*(190+(i%5)*23);
      const a=Math.sin(life*Math.PI)*.53;
      const r=i%4===0?3:1.4;
      ctx.fillStyle=`rgba(132,224,255,${a})`;
      ctx.beginPath();ctx.moveTo(px,py-r*1.7);ctx.lineTo(px+r,py);
      ctx.lineTo(px,py+r*1.7);ctx.lineTo(px-r,py);ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }
  window.AltarFrostFlame={draw};
})();
