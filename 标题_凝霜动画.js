/* 与 AE 凝霜 v2 使用相同笔画路径；透明定稿作为字形，网页实时绘制出场遮罩。 */
window.FrostIntro = (() => {
  const canvas=document.getElementById('introArtwork'),ctx=canvas.getContext('2d');
  const image=new Image(),mask=document.createElement('canvas'),ink=document.createElement('canvas');
  mask.width=ink.width=1000;mask.height=ink.height=440;
  const m=mask.getContext('2d'),p=ink.getContext('2d');
  const strokes=[
    [[318,103],[459,103]],[[324,117],[319,139],[307,145]],[[325,124],[473,124],[467,142]],
    [[390,104],[390,167]],[[334,144],[363,148]],[[334,161],[363,164]],[[411,144],[443,148]],[[411,161],[443,164]],
    [[302,200],[380,200]],[[344,180],[344,270]],[[340,204],[325,235],[300,257]],[[352,212],[369,226],[373,238]],
    [[401,183],[401,268]],[[402,189],[458,189],[458,267]],[[408,211],[451,211]],[[408,234],[451,234]],[[408,258],[451,258]],
    [[535,94],[552,114]],[[519,144],[551,144],[551,247],[575,226]],[[583,104],[690,104]],
    [[626,107],[613,174]],[[584,139],[668,139],[668,178]],[[575,181],[700,181]],
    [[600,205],[600,266]],[[601,205],[672,205],[672,266]],[[603,261],[672,261]]
  ];
  const clamp=v=>Math.max(0,Math.min(1,v));
  const title=document.getElementById('titleScreen'),badge=title.querySelector('.iceBadge');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let started=0,time=0,done=false,raf=0,loaded=false,resolvePlayback=null,playback=null,playing=false;
  function partial(c,points,fraction,width,color){
    let total=0;for(let i=1;i<points.length;i++)total+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);
    let left=total*clamp(fraction);if(left<=0)return;
    c.beginPath();c.moveTo(...points[0]);c.lineWidth=width;c.strokeStyle=color;c.lineCap='round';c.lineJoin='round';
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const k=Math.min(1,left/length);c.lineTo(a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k);left-=length;if(left<=0)break;
    }c.stroke();
  }
  function resize(){
    const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));
    if(loaded)draw(time);
  }
  function draw(t){
    ctx.setTransform(canvas.width/1000,0,0,canvas.height/440,0,0);ctx.clearRect(0,0,1000,440);
    // 徽记先出场0.3秒，之后第一笔立即凝结；保留原有整段3.5秒节拍。
    const stageTime=t;if(t<.3)return;t+=.12;
    ctx.imageSmoothingQuality='high';
    m.clearRect(0,0,1000,440);
    for(let i=0;i<strokes.length;i++){
      const start=i<17?.42+i*.067:1.35+(i-17)*.105;
      partial(m,strokes[i],(t-start)/.22,32,'#fff');
    }
    m.globalAlpha=clamp((t-2.56)/.2);m.fillStyle='#fff';m.fillRect(0,0,1000,300);m.globalAlpha=1;
    p.clearRect(0,0,1000,440);p.globalCompositeOperation='source-over';
    p.drawImage(image,0,0,1000,300,0,0,1000,300);p.globalCompositeOperation='destination-in';p.drawImage(mask,0,0);p.globalCompositeOperation='source-over';
    ctx.drawImage(ink,0,0);
    // 紧跟凝霜前缘的短冰光，仍然裁切在字形内。
    p.clearRect(0,0,1000,440);p.shadowColor='#8ceaff';p.shadowBlur=8;
    for(let i=0;i<strokes.length;i++){
      const start=i<17?.42+i*.067:1.35+(i-17)*.105,age=t-start;
      if(age>0 && age<.35){p.globalAlpha=1-clamp((age-.16)/.19);partial(p,strokes[i],age/.22,2.5,'#ccfaff');}
    }
    p.globalAlpha=1;p.shadowBlur=0;p.globalCompositeOperation='destination-in';p.drawImage(image,0,0);p.globalCompositeOperation='source-over';ctx.drawImage(ink,0,0);
    if(t>2.45 && t<3.3){
      p.clearRect(0,0,1000,440);
      for(const points of [[[320,95],[342,135],[326,163],[351,198],[339,255]],[[578,95],[565,133],[591,165],[577,200],[602,256]]])partial(p,points,1,1.5,'#b9f5ff');
      p.globalCompositeOperation='destination-in';p.drawImage(image,0,0);p.globalCompositeOperation='source-over';
      ctx.globalAlpha=Math.sin(clamp((t-2.45)/.85)*Math.PI)*.75;ctx.drawImage(ink,0,0);ctx.globalAlpha=1;
    }
    for(let i=0;i<24;i++){
      const start=i<17?.48+i*.067:1.41+(i-17)*.105,age=t-start;
      if(age<0 || age>.55)continue;
      const point=strokes[i][0];ctx.globalAlpha=(1-age/.55)*.65;ctx.fillStyle='#b7efff';
      ctx.beginPath();const x=point[0]+(i%2?1:-1)*(8+i%7)*age/.55,y=point[1]+(12+i%9)*age/.55;
      ctx.moveTo(x,y-2);ctx.lineTo(x+1.5,y);ctx.lineTo(x,y+3);ctx.lineTo(x-1,y);ctx.closePath();ctx.fill();
    }
    ctx.globalAlpha=clamp((t-2.65)/.5);ctx.drawImage(image,340,295,320,65,340,295,320,65);
    const extent=86*clamp((t-2.8)/.45);ctx.globalAlpha=clamp((t-2.8)/.4);
    if(extent>0){ctx.drawImage(image,338-extent,310,extent,20,338-extent,310,extent,20);ctx.drawImage(image,662,310,extent,20,662,310,extent,20);}
    ctx.globalAlpha=1;
  }
  function finish(){
    if(done)return;
    time=3.5;done=true;playing=false;cancelAnimationFrame(raf);if(playback)playback.kill();
    if(window.gsap&&badge)gsap.set(badge,{autoAlpha:1});
    if(loaded)draw(time);title.classList.add('written');
    if(resolvePlayback){resolvePlayback();resolvePlayback=null;}
  }
  function tick(now){
    time=(now-started)/1000;draw(time);
    if(time>=3.5)finish();else raf=requestAnimationFrame(tick);
  }
  image.addEventListener('load',()=>{loaded=true;time=.3;resize();});
  function syncPlayback(){
    if(!playing||done)return;
    if(reduced.matches){finish();return;}
    const active=window.FrostTitleMotion?window.FrostTitleMotion.isActive():!document.hidden;
    if(playback){if(active)playback.resume();else playback.pause();}
    else{cancelAnimationFrame(raf);if(active){started=performance.now()-time*1000;raf=requestAnimationFrame(tick);}}
  }
  function play(){
    return new Promise(resolve=>{
      if(playback)playback.kill();playback=null;cancelAnimationFrame(raf);
      resolvePlayback=resolve;done=false;playing=true;time=0;
      title.classList.remove('written','introStarted');
      resize(); // 加载完成才展示标题，此时重新取得真实显示尺寸。
      title.classList.add('introStarted');
      if(reduced.matches)finish();
      else{
        if(window.gsap&&badge){
          const clock={time:0};
          playback=gsap.timeline({paused:true,onComplete:finish})
            .addLabel('emblem',0)
            .fromTo(badge,{autoAlpha:0},{autoAlpha:1,duration:.4,ease:'power1.out'},'emblem')
            .to(clock,{time:3.5,duration:3.5,ease:'none',onUpdate:()=>{time=clock.time;if(loaded)draw(time);}},'emblem');
        }
        syncPlayback();
      }
    });
  }
  window.addEventListener('frost-title-motion-change',syncPlayback);
  document.addEventListener('visibilitychange',syncPlayback);reduced.addEventListener('change',syncPlayback);
  window.addEventListener('resize',resize);resize();
  return {image,play,finish,isDone:()=>done};
})();
