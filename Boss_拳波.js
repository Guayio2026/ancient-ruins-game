/* 石质封印的远程拳芒。位置/碰撞由主战斗循环持有，这里仅绘制。 */
window.FrostBossPunchFx={
  draw(ctx,w,cameraX,reduced){
    const fade=Math.min(1,w.t/.065,w.life/.18),grow=Math.min(1,w.t/.1);
    ctx.save();ctx.translate(w.x-cameraX,w.y);ctx.scale(w.dir,1);ctx.rotate(Math.atan(w.slope));ctx.globalAlpha=fade;
    const h=(52+grow*15)*(w.hot?1.08:1),tail=120+grow*60;
    // 拳芒的中央压力带：尾部透明、前缘收紧，保留角色和场景的细节。
    const g=ctx.createLinearGradient(-tail,0,25,0);
    g.addColorStop(0,'rgba(210,173,106,0)');g.addColorStop(.6,'rgba(221,183,115,.15)');
    g.addColorStop(.94,w.hot?'rgba(255,180,91,.42)':'rgba(255,219,150,.32)');g.addColorStop(1,'rgba(255,241,198,.05)');
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-tail,-h*.25);ctx.bezierCurveTo(-60,-h*.25,-15,-h*.75,2,-h);
    ctx.bezierCurveTo(42,-h*.7,42,h*.7,2,h);ctx.bezierCurveTo(-15,h*.75,-60,h*.25,-tail,h*.25);ctx.closePath();ctx.fill();
    // 三道弧形压缩气浪，前缘亮、后缘淡，避免变成一枚实心光球。
    for(let i=2;i>=0;i--){
      ctx.globalAlpha=fade*(i===0?1:.23/(i*.5+1));
      ctx.strokeStyle=i===0?'#fff0c0':w.hot?'#efa65d':'#d9b879';ctx.lineWidth=i===0?2.5:7;
      ctx.beginPath();ctx.ellipse(-i*23,0,29,h*(1-i*.08),0,-1.42,1.42);ctx.stroke();
    }
    // 细长流线与旋转岩屑均由游戏时间计算，暂停时不漂移。
    for(let i=0;i<(reduced?3:7);i++){
      const yy=Math.sin(i*2.399)*h*.72,phase=reduced?0:(w.t*3+i*.19)%1;
      const end=-12-phase*55,start=end-55-(i%3)*22;
      ctx.globalAlpha=fade*.65;ctx.strokeStyle='#e5c48c';ctx.lineWidth=1+(i%2);
      ctx.beginPath();ctx.moveTo(start,yy+5);ctx.quadraticCurveTo(start+24,yy,end,yy);ctx.stroke();
    }
    for(let i=0;i<(reduced?4:11);i++){
      const xx=-35-i*12,yy=Math.sin(i*2.399+w.t*3)*h*(.45+(i%3)*.13);
      ctx.save();ctx.translate(xx,yy);ctx.rotate(i*2.399+w.t*(i%2?4:-4));ctx.globalAlpha=fade*(.85-i*.045);
      ctx.fillStyle=i%2?'#b6a78a':'#766d5b';ctx.strokeStyle='#e7c58b';ctx.lineWidth=.8;
      ctx.beginPath();ctx.moveTo(-3,-5);ctx.lineTo(5,-2);ctx.lineTo(3,4);ctx.lineTo(-4,2);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    }
    ctx.restore();
    // 出拳位置保留一个很短的扩散气圈，与飞出去的主体分离。
    if(w.t<.2){
      ctx.save();ctx.globalAlpha=(1-w.t/.2)*.65;ctx.strokeStyle='#f1d3a0';ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(w.origin-cameraX,w.originY,10+w.t*85,18+w.t*170,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
  }
};
