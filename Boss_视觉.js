/* 缄默者：显示状态与玩法分离，所有动画使用游戏 dt，暂停时停止。 */
window.FrostBossVisual = function(ctx, reduced, windows){
  const clamp=v=>Math.max(0,Math.min(1,v));
  const state={owner:null,hp:1,trail:1,hold:0,hit:0,chipT:0,phase:0,time:0,breakT:0,phaseT:0,chargeAcc:0,effects:[]};
  function reset(){Object.assign(state,{owner:null,hp:1,trail:1,hold:0,hit:0,chipT:0,phase:0,time:0,breakT:0,phaseT:0,chargeAcc:0});state.effects.length=0;}
  function charging(b){const win=windows().charge;return b?.state==='atk_charge'&&b.frameIndex>=win[0]&&b.frameIndex<=win[1];}
  function emit(kind,b,core){
    const floor=b.y,dir=b.facing;
    if(kind==='break')state.breakT=.9;
    if(kind==='phase')state.phaseT=1.2;
    state.effects.push({kind,x:b.x,y:floor,cx:core?.x??b.x,cy:core?.y??floor-230,dir,t:0,life:kind==='slam'?1:kind==='sweep'?.32:.75});
    if(state.effects.length>40)state.effects.shift();
  }
  function update(b,dt){
    if(!b||b.removed){if(state.owner)reset();return;}
    const hp=clamp(b.hp/b.maxHp);
    if(state.owner!==b || state.phase!==b.phase){state.owner=b;state.phase=b.phase;state.hp=state.trail=hp;state.hold=state.hit=state.chipT=0;}
    if(hp<state.hp){state.trail=Math.max(state.trail,state.hp);state.hold=.2;state.hit=.18;state.chipT=.42;}
    if(hp>state.hp)state.trail=hp;
    state.hp=hp;
    const chase=Math.max(0,dt-state.hold);state.hold=Math.max(0,state.hold-dt);
    if(chase>0)state.trail=Math.max(hp,state.trail-chase*.65);
    state.hit=Math.max(0,state.hit-dt);state.breakT=Math.max(0,state.breakT-dt);state.phaseT=Math.max(0,state.phaseT-dt);state.time+=dt;
    state.chipT=Math.max(0,state.chipT-dt);
    for(let i=state.effects.length-1;i>=0;i--){state.effects[i].t+=dt;if(state.effects[i].t>=state.effects[i].life)state.effects.splice(i,1);}
    if(charging(b)&&dt>0){
      state.chargeAcc+=dt;
      for(let count=0;state.chargeAcc>=.065&&count<4;count++){state.chargeAcc-=.065;emit('chargeDust',b);}
    }else state.chargeAcc=0;
  }
  function diamond(x,y,r,fill){ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.stroke();}
  function hud(h,W){
    if(!h.visible)return;
    const w=Math.min(560,W*.46),x=(W-w)/2,y=65,hot=h.phase===1,cold='#a6cbd7',gold='#d5b477',accent=hot?'#eda76a':cold;
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    const shade=ctx.createLinearGradient(0,y-38,0,y+49);shade.addColorStop(0,'rgba(5,12,18,0)');shade.addColorStop(.45,'rgba(5,12,18,.78)');shade.addColorStop(1,'rgba(5,12,18,0)');
    ctx.fillStyle=shade;ctx.fillRect(x-60,y-38,w+120,87);
    ctx.font='600 19px "Microsoft YaHei",sans-serif';
    const titleWidth=ctx.measureText(h.name).width,base=hot?'#edc68d':'#e0d4ba';
    const shineTime=state.time%7,shineX=W/2-titleWidth/2-45+(shineTime/.9)*(titleWidth+90);
    if(!reduced()&&shineTime<.9){
      const shine=ctx.createLinearGradient(shineX-36,0,shineX+36,0);
      shine.addColorStop(0,base);shine.addColorStop(.35,base);shine.addColorStop(.5,'#fff9dc');shine.addColorStop(.65,base);shine.addColorStop(1,base);ctx.fillStyle=shine;
    }else ctx.fillStyle=base;
    ctx.strokeStyle='rgba(4,10,16,.85)';ctx.lineWidth=3;ctx.strokeText(h.name,W/2,y-23);ctx.fillText(h.name,W/2,y-23);
    // 名字两侧的短封印刻纹，主线固定，仅状态变化时提亮。
    const sealLight=Math.max(state.breakT,state.phaseT*.7),wing=Math.min(70,(w-titleWidth)/2-40);
    ctx.save();ctx.strokeStyle=sealLight>0?'#f7d79b':'#a28d64';ctx.lineWidth=1;
    for(const dir of [-1,1]){
      const start=W/2+dir*(titleWidth/2+15),end=start+dir*wing;
      ctx.beginPath();ctx.moveTo(start,y-23);ctx.lineTo(end,y-23);ctx.moveTo(start+dir*12,y-19);ctx.lineTo(end-dir*13,y-19);ctx.stroke();
      diamond(end,y-23,2.5,sealLight>0?'#f7d79b':'#a28d64');
    }ctx.restore();
    ctx.strokeStyle=gold;ctx.lineWidth=1;
    for(let i=0;i<2;i++){
      const dx=x+w-22+i*19,dy=y-24,broken=i<h.phase;
      if(broken){ctx.beginPath();ctx.moveTo(dx-5,dy-6);ctx.lineTo(dx-1,dy-2);ctx.lineTo(dx-4,dy+4);ctx.moveTo(dx+4,dy-4);ctx.lineTo(dx+1,dy+2);ctx.lineTo(dx+5,dy+6);ctx.stroke();}
      else diamond(dx,dy,4.5,i===h.phase?gold:'#343a3c');
    }
    // 带切角的深石底槽，端点封印作为装饰，内槽清楚显示血量。
    ctx.fillStyle='#101b23';ctx.beginPath();ctx.moveTo(x-7,y-6);ctx.lineTo(x+w+7,y-6);ctx.lineTo(x+w+13,y+8);ctx.lineTo(x+w+7,y+22);ctx.lineTo(x-7,y+22);ctx.lineTo(x-13,y+8);ctx.closePath();ctx.fill();ctx.strokeStyle='#8c8066';ctx.stroke();
    ctx.fillStyle='#050d12';ctx.fillRect(x,y,w,16);
    ctx.fillStyle='#e1bb79';ctx.fillRect(x,y,w*clamp(Math.max(h.hp,state.trail)),16);
    const g=ctx.createLinearGradient(0,y,0,y+16);g.addColorStop(0,hot?'#e8ba7e':'#b7d4d7');g.addColorStop(.35,hot?'#be733f':'#649baa');g.addColorStop(1,hot?'#673b2d':'#2e5668');
    ctx.fillStyle=g;ctx.fillRect(x,y,w*clamp(h.hp),16);
    ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(x,y,w*clamp(h.hp),1);
    if(!reduced()&&h.hp>0){
      ctx.save();ctx.beginPath();ctx.rect(x,y,w*clamp(h.hp),16);ctx.clip();
      const flowX=x-65+((state.time%6)/6)*(w+130),flow=ctx.createLinearGradient(flowX-40,0,flowX+40,0);
      flow.addColorStop(0,'rgba(255,235,188,0)');flow.addColorStop(.5,'rgba(255,235,188,.18)');flow.addColorStop(1,'rgba(255,235,188,0)');
      ctx.fillStyle=flow;ctx.fillRect(flowX-40,y,80,16);
      ctx.strokeStyle=hot?'rgba(255,210,143,.25)':'rgba(217,243,242,.22)';ctx.lineWidth=.7;
      for(let i=0;i<12;i++){const rx=x+18+i*48;ctx.beginPath();ctx.moveTo(rx,y+13);ctx.lineTo(rx+5,y+7);ctx.lineTo(rx+3,y+3);ctx.stroke();}
      ctx.restore();
    }
    if(state.hit>0){ctx.fillStyle='rgba(255,244,213,'+(state.hit/.18*.35)+')';ctx.fillRect(x,y,w*clamp(h.hp),16);}
    ctx.strokeStyle=gold;diamond(x-14,y+8,4,gold);diamond(x+w+14,y+8,4,gold);
    // 细刻线只叠在槽内，避免造成两条命分段的误读。
    ctx.fillStyle='rgba(5,13,18,.28)';for(let i=1;i<10;i++)ctx.fillRect(x+w*i/10,y+11,1,5);
    // 命中时沿外框短暂发亮，碎金屑从当前血量断口散开。
    const rim=Math.max(state.hit/.18,state.breakT*.7,state.phaseT*.55);
    if(rim>0){ctx.save();ctx.globalAlpha=Math.min(1,rim)*.85;ctx.strokeStyle='#ffe6a8';ctx.lineWidth=1.5;ctx.strokeRect(x-4,y-4,w+8,24);ctx.restore();}
    if(state.chipT>0&&!reduced()){
      const age=.42-state.chipT,tip=x+w*clamp(h.hp);
      ctx.save();ctx.fillStyle='#f3d69b';ctx.globalAlpha=state.chipT/.42*.8;
      for(let i=0;i<6;i++){
        const px=tip+Math.sin(i*2.399)*age*55,py=y+8+(i%2?1:-1)*(12+age*45)+age*age*50;
        ctx.save();ctx.translate(px,py);ctx.rotate(i+age*3);ctx.fillRect(-1,-2,2,4);ctx.restore();
      }ctx.restore();
    }
    const health=Math.max(0,Math.ceil(h.hpAbs??h.hp*h.maxHp)),maximum=Math.max(1,Math.ceil(h.maxHp));
    const healthLabel=health+'/'+maximum;
    ctx.font='600 12px Consolas,"Microsoft YaHei",monospace';ctx.textAlign='center';ctx.lineWidth=3;
    ctx.strokeStyle='rgba(5,12,18,.95)';ctx.strokeText(healthLabel,W/2,y+8);
    ctx.fillStyle='#fff5dc';ctx.fillText(healthLabel,W/2,y+8);
    const py=y+28,p=clamp(h.poise),immune=h.poiseImmune&&!h.staggered;
    ctx.fillStyle='#0b151c';ctx.fillRect(x,py,w,4);
    ctx.fillStyle=immune?'#53646b':h.staggered?'#fff1bc':'#c99b57';ctx.fillRect(x,py,w*p,4);
    ctx.font='11px "Microsoft YaHei",sans-serif';ctx.fillStyle=immune?'#9caeb4':'#d2c3a7';ctx.textAlign='left';ctx.fillText(h.staggered?'封印破裂 · 破防':immune?'韧性恢复中':'破防积累',x,py+15);
    ctx.textAlign='right';ctx.fillStyle=accent;ctx.fillText(h.dying?(h.phase===0?'封印正在崩解':'守门人倒下'):h.phase===0?'第一封印':'破甲形态',x+w,py+15);
    ctx.restore();
  }
  function ground(b,cameraX,size){
    if(!b||b.removed||b.state==='death')return;
    const hot=b.phase===1,r=Math.min(155,size.dw*.45),x=b.x-cameraX,y=b.y-2;
    ctx.save();ctx.translate(x,y);ctx.scale(1,.27);ctx.globalAlpha=(b.alpha??1)*(.22+(reduced()?0:.04*Math.sin(state.time*1.8)));
    ctx.strokeStyle=hot?'#d99659':'#b8b5a0';ctx.lineWidth=2;
    for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.arc(0,0,r,a+.09,a+.7);ctx.stroke();ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.83,Math.sin(a)*r*.83);ctx.lineTo(Math.cos(a)*r*1.08,Math.sin(a)*r*1.08);ctx.stroke();}
    ctx.restore();
    if(charging(b)){
      // 实际冲锋全程可见的定向速度带，位于身体后方。
      ctx.save();ctx.translate(x,b.y-155);ctx.scale(b.facing,1);
      const n=reduced()?3:8;
      for(let i=0;i<n;i++){
        const yy=(i/(n-1)-.5)*170,phase=reduced()?0:(state.time*3+i*.137)%1;
        const end=-25-phase*35,start=end-90-(i%3)*38;
        const g=ctx.createLinearGradient(start,yy,end,yy);g.addColorStop(0,'rgba(220,192,144,0)');g.addColorStop(1,'rgba(242,218,174,.65)');
        ctx.strokeStyle=g;ctx.lineWidth=i%3===0?5:2;ctx.beginPath();ctx.moveTo(start,yy+8);ctx.quadraticCurveTo(start+45,yy,end,yy);ctx.stroke();
      }
      ctx.restore();
    }
  }
  function front(b,cameraX,core,hitFrames){
    ctx.save();ctx.lineJoin='round';
    if(b&&!b.removed&&charging(b)){
      ctx.save();ctx.translate(b.x-cameraX,b.y-160);ctx.scale(b.facing,.9);
      // 肩前压缩气浪与前向亮边，不盖住脸和胸核。
      for(let i=0;i<3;i++){
        ctx.strokeStyle=i===0?'rgba(255,234,194,.85)':'rgba(223,187,128,.28)';ctx.lineWidth=i===0?2:8;
        ctx.beginPath();ctx.ellipse(38+i*10,0,70+i*14,105+i*10,0,-1.15,1.15);ctx.stroke();
      }
      ctx.restore();
    }
    // 预警形状与既有判定窗口绑定，关闭时不残留。
    if(b&&!b.removed&&b.state.startsWith('atk_')){
      const kind=b.state.slice(4),win=hitFrames[kind],p=clamp(b.frameIndex/win[0]);
      if(b.frameIndex<win[0]){
        const x=b.x-cameraX,dir=b.facing;
        ctx.globalAlpha=.2+p*.35;ctx.strokeStyle='#ebba80';ctx.lineWidth=2;
        ctx.beginPath();
        if(kind==='charge'){
          const end=x+dir*280;ctx.moveTo(x,b.y-4);ctx.lineTo(end,b.y-4);ctx.moveTo(end-dir*16,b.y-13);ctx.lineTo(end,b.y-4);ctx.lineTo(end-dir*16,b.y+1);
        }else if(kind==='slam')ctx.ellipse(x+dir*60,b.y-2,100,17,0,0,Math.PI*2);
        else ctx.ellipse(x+dir*75,b.y-3,130,13,0,0,Math.PI*2);
        ctx.stroke();
      }
    }
    for(const e of state.effects){
      const k=e.t/e.life,x=e.x-cameraX;ctx.globalAlpha=(1-k)*(1-k);ctx.strokeStyle='#d8b47f';ctx.lineWidth=2;
      if(e.kind==='sweep'){
        ctx.save();ctx.translate(x,e.y-160);ctx.scale(e.dir, .52);
        // 三层短扇形拖尾，宽而透明的外层包住清晰刃线。
        for(let i=0;i<3;i++){ctx.strokeStyle=i===2?'#f1dbb4':'rgba(215,171,108,.22)';ctx.lineWidth=[24,12,2][i];ctx.beginPath();ctx.arc(0,0,160+k*50,-1.25+k*.65,.8+k*.65);ctx.stroke();}ctx.restore();
      }else if(e.kind==='chargeDust'){
        const px=x-e.dir*(50+k*110),py=e.y-12-k*22,r=24+k*46;
        ctx.globalAlpha=(1-k)*.44;
        const g=ctx.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'#c9b99e');g.addColorStop(1,'rgba(201,185,158,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(px,py,r,r*.55,0,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=(1-k)*.8;
        for(let i=0;i<(reduced()?2:5);i++){
          const t=e.t,vx=-e.dir*(85+i*23),yy=Math.min(e.y-2,e.y-8-(90+i*19)*t+350*t*t);
          ctx.fillStyle=i%2?'#bfb29c':'#77736a';ctx.save();ctx.translate(x-e.dir*45+vx*t,yy);ctx.rotate(i+t*5);ctx.fillRect(-3,-3,6+i,5);ctx.restore();
        }
      }else if(e.kind==='slam'){
        const ix=x+e.dir*60;
        // 外扩的压扁冲击锋、清晰短闪和地面分叉裂纹。
        const rr=35+270*(1-Math.pow(1-k,3));
        ctx.globalAlpha=(1-k)*.7;ctx.strokeStyle='#efcf9f';ctx.lineWidth=3+8*(1-k);
        ctx.beginPath();ctx.ellipse(ix,e.y-2,rr,rr*.19,0,0,Math.PI*2);ctx.stroke();
        if(e.t<.10&&!reduced()){
          ctx.globalAlpha=(1-e.t/.10)*.8;ctx.fillStyle='#ffe6b5';ctx.beginPath();ctx.ellipse(ix,e.y-5,85,22,0,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=(1-k)*.8;ctx.strokeStyle='#dfbb86';ctx.lineWidth=2.2;
        for(let i=0;i<9;i++){
          const side=i%2?1:-1,reach=side*(55+i*24)*Math.min(1,k*7);
          ctx.beginPath();ctx.moveTo(ix,e.y-2);ctx.lineTo(ix+reach*.55,e.y-7-(i%3)*5);ctx.lineTo(ix+reach,e.y-2+(i%2)*5);ctx.moveTo(ix+reach*.55,e.y-7-(i%3)*5);ctx.lineTo(ix+reach*.7,e.y-20-(i%3)*6);ctx.stroke();
        }
        for(let i=0;i<(reduced()?8:28);i++){
          const vx=Math.sin(i*2.399)*300,t=e.t,px=ix+vx*t,py=e.y-8-(160+(i%5)*30)*t+400*t*t;
          ctx.fillStyle=i%2?'#827b6f':'#c5b69b';ctx.save();ctx.translate(px,Math.min(e.y-1,py));ctx.rotate(i+t*4);ctx.fillRect(-4,-3,8+(i%4)*2,6+(i%3));ctx.restore();
        }
        ctx.globalAlpha=(1-k)*.5;
        for(const side of [-1,1]){const px=ix+side*k*240,py=e.y-20-k*20,r=35+k*80,g=ctx.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'#d4bfa1');g.addColorStop(1,'rgba(212,191,161,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(px,py,r,r*.55,0,0,Math.PI*2);ctx.fill();}
      }else if(e.kind==='break'||e.kind==='phase'){
        ctx.save();ctx.translate(e.cx-cameraX,e.cy);ctx.strokeStyle=e.kind==='phase'?'#dfb67d':'#f0ddb3';
        for(let i=0;i<(reduced()?4:9);i++){
          const a=i*2.399,rr=12+k*(70+i*7),px=Math.cos(a)*rr,py=Math.sin(a)*rr*.65+k*k*38;
          ctx.save();ctx.translate(px,py);ctx.rotate(a+k*(i%2?2:-2));ctx.fillStyle=i%2?'#726e62':'#ada58f';
          ctx.beginPath();ctx.moveTo(-3,-6);ctx.lineTo(5,-2);ctx.lineTo(2,5);ctx.lineTo(-4,2);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
        }ctx.restore();
      }
    }
    // 二阶段封印裂纹从当前胸核透光，跟随动作，不覆盖脸和全身。
    if(b&&!b.removed&&b.state!=='death'&&(b.phase===1||state.breakT>0)){
      ctx.globalAlpha=(b.alpha??1)*(b.phase===1?.55:state.breakT*.8);ctx.strokeStyle='#efc280';ctx.lineWidth=1.2;
      const x=core.x-cameraX,y=core.y,r=core.r;
      for(let i=0;i<5;i++){const a=i*1.256;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*.4,y+Math.sin(a)*r*.4);ctx.lineTo(x+Math.cos(a+.2)*r,y+Math.sin(a+.2)*r);ctx.lineTo(x+Math.cos(a)*r*1.7,y+Math.sin(a)*r*1.7);ctx.stroke();}
    }
    if(state.phaseT>0){ctx.globalAlpha=Math.min(1,state.phaseT*2);ctx.textAlign='center';ctx.font='600 23px "Microsoft YaHei",sans-serif';ctx.fillStyle='#f0d6ae';ctx.fillText('封印崩解 · 破甲',640,160);}
    ctx.restore();
  }
  return {state,reset,emit,update,hud,ground,front};
};
