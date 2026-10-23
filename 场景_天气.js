/* 环境天气：固定种子的分层粒子，独立于战斗，不产生伤害或随机状态。 */
(() => {
  'use strict';
  const presets = Object.freeze({
    ruinsRain: {kind:'rain',count:145,speed:490,wind:-110,color:'#aec6e2',alpha:.30},
    crystalSnow: {kind:'snow',count:100,speed:30,wind:17,color:'#d1f3ff',alpha:.65},
    altarRain: {kind:'rain',count:185,speed:620,wind:-190,color:'#dbc4b2',alpha:.28},
    altarSnow: {kind:'snow',count:125,speed:32,wind:-15,color:'#dcefff',alpha:.68,size:1.35},
  });

  const mod=(v,n)=>((v%n)+n)%n;
  const seed=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
  function draw(ctx,{preset,time,width,height,ground,cameraX=0,reducedMotion=false,front=false}){
    const p=presets[preset];
    if(!p || width<=0 || height<=0)return;
    const t=reducedMotion?0:time;
    ctx.save();
    ctx.strokeStyle=p.color;ctx.fillStyle=p.color;ctx.lineCap='round';
    const count=reducedMotion?Math.ceil(p.count*.35):p.count;
    for(let i=0;i<count;i++){
      const near=i%4===0;
      if(near!==front)continue;
      const depth=near?1.15:.45+seed(i+9)*.4;
      const span=width+160;
      const x=mod(seed(i+1)*span+p.wind*t*depth-cameraX*(near?.32:.12),span)-80;
      const y=mod(seed(i+1000)*(height+80)+t*p.speed*depth,height+80)-40;
      ctx.globalAlpha=p.alpha*(near?.85:.5+seed(i+30)*.3);
      if(p.kind==='rain'){
        const len=(near?21:10)*(.7+seed(i+70)*.6);
        ctx.lineWidth=near?1.15:.65;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+p.wind/p.speed*len,y+len);ctx.stroke();
      }else{
        const sway=Math.sin(t*(.55+seed(i+40)*.3)+i*2.4)*(near?18:9);
        const r=(near?2.3:1)*(.5+seed(i+80)*.8)*(p.size||1);
        ctx.beginPath();ctx.arc(x+sway,y,r,0,Math.PI*2);ctx.fill();
        // 少量近景冰晶，避免整屏符号雪花遮住人物。
        if(near && i%12===0){
          ctx.lineWidth=.7;ctx.beginPath();
          for(let a=0;a<3;a++){
            const angle=a*Math.PI/3+t*.2,dx=Math.cos(angle)*r*2,dy=Math.sin(angle)*r*2;
            ctx.moveTo(x+sway-dx,y-dy);ctx.lineTo(x+sway+dx,y+dy);
          }
          ctx.stroke();
        }
      }
    }
    if(p.kind==='rain' && front && !reducedMotion){
      // 落点以世界坐标取样，与平台一起滚动，不在空中生成水花。
      for(let i=0;i<22;i++){
        const age=mod(t*(1.3+seed(i+300)) + seed(i+400),1);
        if(age>.32)continue;
        const x=mod(seed(i+500)*(width+160)-cameraX,width+160)-80;
        const y=ground+3+seed(i+600)*16;
        ctx.globalAlpha=(1-age/.32)*.22;ctx.lineWidth=.8;
        ctx.beginPath();ctx.ellipse(x,y,2+age*21,1+age*5,0,Math.PI,Math.PI*2);ctx.stroke();
      }
    }
    ctx.restore();
  }
  window.SceneWeather=Object.freeze({draw,presets});
})();

