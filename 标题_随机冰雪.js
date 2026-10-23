/* 每个按钮独立的雪粒、冰晶和光晕；粒子重生时重新抽样，避免同步平铺。 */
(() => {
  const title=document.getElementById('titleScreen');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const video=document.getElementById('titleBackgroundVideo');
  const dialogs=[...document.querySelectorAll('dialog')];
  let overlayOpen=dialogs.some(d=>d.open),focused=document.hasFocus(),playTicket=0;
  video.muted=true;
  // 素材末尾附有与开头相同的0.6秒接播段；只有隐藏层才会回到开头。
  const spareVideo=video.cloneNode(true);
  spareVideo.id='titleBackgroundVideoNext';spareVideo.muted=true;
  spareVideo.style.opacity='0';spareVideo.style.zIndex='-3';
  video.after(spareVideo);
  const backgroundVideos=[video,spareVideo],blendDuration=Number(video.dataset.loopOverlap)||.6;
  let front=video,back=spareVideo,blending=false,backgroundRunning=false,retryAfter=0;
  const presented=new Map(backgroundVideos.map(layer=>[layer,{time:0,ready:false,callback:0}]));
  function watchFrames(layer){
    if(typeof layer.requestVideoFrameCallback!=='function')return;
    const state=presented.get(layer);
    if(state.callback)return;
    state.callback=layer.requestVideoFrameCallback((now,metadata)=>{
      state.callback=0;state.time=metadata.mediaTime;state.ready=true;
      if(backgroundRunning)watchFrames(layer);
    });
  }
  function frameTime(layer){
    const state=presented.get(layer);
    return typeof layer.requestVideoFrameCallback==='function'?(state.ready?state.time:0):layer.currentTime;
  }
  for(const layer of backgroundVideos)layer.addEventListener('seeking',()=>{
    presented.get(layer).ready=false;
  });
  function playBackgroundLayer(layer){
    const ticket=playTicket;
    layer.play().catch(()=>{
      if(ticket!==playTicket||!backgroundRunning)return;
      // 保留已经解码的画面；下一次恢复活动时重试播放。
      if(layer===back){
        blending=false;back.style.opacity='0';front.style.zIndex='-2';
        back.pause();back.currentTime=0;retryAfter=performance.now()+1000;
      }
    });
  }
  function syncBackground(active){
    backgroundRunning=active;
    for(const layer of backgroundVideos){
      layer.style.visibility=reduced.matches?'hidden':'visible';
      if(!active){
        layer.pause();
        const state=presented.get(layer);
        if(state.callback){layer.cancelVideoFrameCallback(state.callback);state.callback=0;}
      }else{
        if(layer.preload!=='auto')layer.preload='auto';
        watchFrames(layer);
      }
    }
    if(active){if(!front.ended)playBackgroundLayer(front);if(blending)playBackgroundLayer(back);}
  }
  function updateBackground(){
    if(!backgroundRunning)return;
    if(!blending&&performance.now()>=retryAfter&&Number.isFinite(front.duration)&&frameTime(front)+.0001>=front.duration-blendDuration&&back.readyState>=2&&!back.seeking){
      blending=true;front.style.zIndex='-3';back.style.zIndex='-2';
      playBackgroundLayer(back);
    }
    if(!blending)return;
    // 按已提交合成的帧推进，不能把currentTime推进当作新画面已经出现。
    const progress=Math.min(1,frameTime(back)/blendDuration);
    back.style.opacity=String(progress*progress*(3-2*progress));
    if(progress<1)return;
    const old=front;front=back;back=old;blending=false;
    front.style.opacity='1';back.style.opacity='0';
    back.pause();presented.get(back).ready=false;back.currentTime=0;
  }
  const range=(a,b)=>a+Math.random()*(b-a);
  const fields=[...title.querySelectorAll('.titleMenu button')].map(button=>{
    const canvas=document.createElement('canvas');canvas.className='menuFrost';
    canvas.setAttribute('aria-hidden','true');button.prepend(canvas);
    const field={button,canvas,ctx:canvas.getContext('2d'),w:1,h:1,time:range(0,100),focus:1,
      speed:range(.65,1.35),wind:range(-5,5),phase:range(0,Math.PI*2),
      glowX:range(.12,.88),glowY:Math.random()<.5?.08:.92,
      period:range(4.5,9),particles:[],crystals:[]};
    const updateFocus=()=>{field.focus=button.matches(':hover,:focus-visible')?1.4:1;};
    for(const event of ['pointerenter','pointerleave','focus','blur'])button.addEventListener(event,updateFocus);
    return field;
  });
  function particle(f,initial=false){return {x:range(0,f.w),y:initial?range(0,f.h):range(-12,-2),
    r:range(.5,1.6),speed:range(5,14)*f.speed,phase:range(0,6.28),sway:range(1,5),alpha:range(.2,.65)};}
  function crystal(f){return {x:range(8,f.w-8),y:Math.random()<.5?range(3,11):range(f.h-11,f.h-3),
    r:range(3,7),age:0,life:range(4,9),rotation:range(0,Math.PI),alpha:range(.15,.4)};}
  function resize(f){
    const r=f.button.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
    f.w=Math.max(1,r.width);f.h=Math.max(1,r.height);
    f.canvas.width=Math.round(f.w*d);f.canvas.height=Math.round(f.h*d);
    f.ctx.setTransform(d,0,0,d,0,0);
    f.particles=Array.from({length:Math.round(range(9,16))},()=>particle(f,true));
    f.crystals=Array.from({length:Math.round(range(2,4))},()=>{const c=crystal(f);c.age=range(0,c.life);return c;});
    draw(f,0);
  }
  function draw(f,dt){
    const c=f.ctx;f.time+=dt;c.clearRect(0,0,f.w,f.h);
    const focus=f.focus;
    const pulse=reduced.matches?.6:.45+.3*Math.sin(f.time/f.period*6.28+f.phase);
    const x=f.w*f.glowX,y=f.h*f.glowY;
    const g=c.createRadialGradient(x,y,0,x,y,f.w*.55);
    g.addColorStop(0,`rgba(104,215,250,${.18*pulse*focus})`);g.addColorStop(1,'rgba(100,210,250,0)');
    c.fillStyle=g;c.fillRect(0,0,f.w,f.h);
    for(let i=0;i<f.particles.length;i++){
      let p=f.particles[i];p.y+=p.speed*dt;p.x+=f.wind*dt;
      if(p.y>f.h+4||p.x< -8||p.x>f.w+8)p=f.particles[i]=particle(f);
      c.globalAlpha=p.alpha*focus;c.fillStyle='#c4f3ff';c.beginPath();
      c.arc(p.x+Math.sin(f.time*.7+p.phase)*p.sway,p.y,p.r,0,Math.PI*2);c.fill();
    }
    for(let i=0;i<f.crystals.length;i++){
      let p=f.crystals[i];p.age+=dt;if(p.age>p.life)p=f.crystals[i]=crystal(f);
      c.save();c.translate(p.x,p.y);c.rotate(p.rotation);
      c.globalAlpha=p.alpha*(reduced.matches?.65:Math.sin(Math.PI*p.age/p.life))*focus;
      c.strokeStyle='#a6e8ff';c.lineWidth=.7;c.beginPath();
      for(let arm=0;arm<6;arm++){
        const a=arm*Math.PI/3,ex=Math.cos(a)*p.r,ey=Math.sin(a)*p.r;
        c.moveTo(0,0);c.lineTo(ex,ey);
        for(const side of [-1,1]){c.moveTo(ex*.62,ey*.62);c.lineTo(ex*.62-Math.cos(a+side*.75)*p.r*.28,ey*.62-Math.sin(a+side*.75)*p.r*.28);}
      }
      c.stroke();c.restore();
    }
    c.globalAlpha=1;
  }
  let raf=0,last=0;
  function visible(){return !document.hidden&&!overlayOpen&&title.style.display!=='none'&&!title.classList.contains('hide');}
  window.FrostTitleMotion={isActive:visible};
  function tick(now){
    raf=0;if(!visible()||reduced.matches){syncBackground(false);return;}
    updateBackground();
    if(!last||now-last>=1000/30){const dt=last?Math.min((now-last)/1000,.08):0;last=now;fields.forEach(f=>draw(f,dt));}
    raf=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(raf);raf=0;last=0;
    const active=visible()&&!reduced.matches,wasActive=document.documentElement.classList.contains('titleMotion');
    ++playTicket;
    document.documentElement.classList.toggle('titleMotion',active);
    syncBackground(active);
    if(visible()){fields.forEach(f=>draw(f,0));if(!reduced.matches)raf=requestAnimationFrame(tick);}
    if(active!==wasActive)window.dispatchEvent(new Event('frost-title-motion-change'));
  }
  const ro=new ResizeObserver(entries=>{for(const e of entries){const f=fields.find(f=>f.button===e.target);if(f)resize(f);}});
  fields.forEach(f=>{resize(f);ro.observe(f.button);});
  new MutationObserver(sync).observe(title,{attributes:true,attributeFilter:['class','style']});
  const modalObserver=new MutationObserver(()=>{overlayOpen=dialogs.some(d=>d.open);sync();});
  dialogs.forEach(d=>modalObserver.observe(d,{attributes:true,attributeFilter:['open']}));
  window.addEventListener('blur',()=>{focused=false;sync();});
  window.addEventListener('focus',()=>{focused=true;sync();});
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);sync();
})();
