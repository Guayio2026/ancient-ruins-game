/* 王冠终结：预测与实际命中共用同一份拆分/舍入规则；纯 Canvas 图标光芒。 */
(function(root){
  'use strict';
  const weights=[.15,.20,.35,.30];
  function bossMultiplier(b,window){
    if(b.state!=='stagger')return 1;
    return b.frameIndex>=window[0]&&b.frameIndex<=window[1]?1.2:.55;
  }
  function strike(base,attack,index,hp,deferred=0,resistance=1){
    const requested=Math.round(base*weights[index]*attack)+(index===3?deferred:0);
    const actual=Math.max(1,Math.round(requested*resistance));
    const damage=index<3?Math.min(actual,Math.max(0,Math.floor(hp-1))):actual;
    return {damage,input:damage/(attack*resistance),
      deferred:index<3?deferred+(actual-damage)/resistance:0};
  }
  function predict(b,base,attack,window){
    const sim={...b};let deferred=0;
    for(let i=0;i<weights.length&&sim.hp>0;i++){
      const hit=strike(base,attack,i,sim.hp,deferred,bossMultiplier(sim,window));
      sim.hp=Math.max(0,sim.hp-hit.damage);deferred=hit.deferred;
      // Living Bosses are held during this cinematic. A hit may still break
      // poise, which changes the resistance of the following three strikes.
      if(hit.damage>0&&sim.poiseImmuneT<=0&&sim.state!=='stagger'){
        sim.poise+=hit.input;
        if(sim.poise>=sim.maxPoise){sim.state='stagger';sim.frameIndex=0;sim.poiseImmuneT=2;}
      }
    }
    return {lethal:sim.hp<=0,damage:b.hp-sim.hp,remaining:sim.hp};
  }
  function drawIcon(c,time,age,reduced){
    c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,220,220);c.save();c.translate(110,106);
    const pulse=reduced?1:.82+.18*Math.sin(time*5.4);
    // Keep the centre transparent: light sits on the five edges and beyond.
    function pentagon(r){c.beginPath();for(let j=0;j<5;j++){const a=-Math.PI/2+j*Math.PI*2/5,x=Math.cos(a)*r,y=Math.sin(a)*r;if(j)c.lineTo(x,y);else c.moveTo(x,y);}c.closePath();}
    c.lineJoin='round';c.shadowColor='#67dfff';c.shadowBlur=18*pulse;c.strokeStyle='rgba(92,214,255,.85)';c.lineWidth=6;pentagon(53);c.stroke();
    c.shadowBlur=7;c.strokeStyle='#efffff';c.lineWidth=1.7;pentagon(53);c.stroke();c.shadowBlur=0;
    for(let i=0;i<15;i++){
      const a=-Math.PI/2+i*Math.PI*2/15,inner=48+(i%3)*4,len=(i%3===0?21:10)*pulse;
      const x=Math.cos(a),y=Math.sin(a);c.beginPath();c.moveTo(x*inner-y*2,y*inner+x*2);c.lineTo(x*(inner+len),y*(inner+len));c.lineTo(x*inner+y*2,y*inner-x*2);c.closePath();
      c.fillStyle=i%3===0?'#d8fcff':'#64cfff';c.globalAlpha=.72;c.fill();
    }
    const n=reduced?12:38;
    for(let i=0;i<n;i++){
      const u=reduced?.38:((time*(.55+i%4*.08)+i*.618)%1),a=i*2.39996,r=52+u*(28+i%5*4),x=Math.cos(a)*r,y=Math.sin(a)*r,size=1+i%3*.6;
      c.globalAlpha=(1-u)*pulse;c.fillStyle='#edffff';c.beginPath();c.moveTo(x,y-size*2);c.lineTo(x+size,y);c.lineTo(x,y+size*2);c.lineTo(x-size,y);c.closePath();c.fill();
      if(i%6===0){c.strokeStyle='#9eefff';c.lineWidth=.7;c.beginPath();c.moveTo(x-4,y);c.lineTo(x+4,y);c.stroke();}
    }
    if(!reduced&&age<.8){const u=age/.8;c.globalAlpha=(1-u)*.85;c.strokeStyle='#e4ffff';c.lineWidth=2.5*(1-u);pentagon(54+u*43);c.stroke();}
    c.restore();
  }
  const api={bossMultiplier,strike,predict,drawIcon};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FrostCrownFinisher=api;
})(typeof window==='object'?window:globalThis);
