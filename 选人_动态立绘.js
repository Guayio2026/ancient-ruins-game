/* 离线抠绿的透明图集：仅播放当前卡面，后台/关闭/减弱动态时停止。 */
(() => {
  const dialog=document.getElementById('characterSelect');if(!dialog)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clips=new Map();let raf=0,last=0,lastPaint=0,current=null;
  const sources={hat:'artwork/选人卡面动画_法帽_5秒_v1/卡面循环_透明图集.webp',crown:'artwork/选人卡面动画_王冠_5秒_v1/卡面循环_透明图集.webp'};
  function paint(clip){
    const index=reduced.matches?24:Math.floor(clip.time*15)%69;
    if(index===clip.frame)return;
    clip.ctx.clearRect(0,0,384,560);
    clip.ctx.drawImage(clip.image,index%10*384,Math.floor(index/10)*560,384,560,0,0,384,560);
    clip.frame=index;clip.canvas.dataset.frame=String(index);
  }
  function tick(now){
    if(!current)return;
    current.time+=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
    if(now-lastPaint>=1000/30){paint(current);lastPaint=now;}
    raf=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(raf);raf=0;
    const active=dialog.open&&!document.hidden;
    const card=active?dialog.querySelector('.selectCard.isCurrent'):null;
    current=card?clips.get(card.dataset.form):null;
    if(current){paint(current);if(!reduced.matches){last=performance.now();lastPaint=0;raf=requestAnimationFrame(tick);}}
  }
  for(const [form,src] of Object.entries(sources)){
    const card=dialog.querySelector(`[data-form="${form}"]`),image=new Image();
    image.onload=()=>{
      const canvas=document.createElement('canvas');canvas.className='selectMotionPortrait';canvas.width=384;canvas.height=560;canvas.setAttribute('aria-hidden','true');
      card.querySelector('.selectArt').append(canvas);
      const clip={image,canvas,ctx:canvas.getContext('2d'),time:0,frame:-1};clips.set(form,clip);paint(clip);
      card.classList.add('motionReady');sync();
    };
    image.src=src;
  }
  new MutationObserver(sync).observe(dialog,{attributes:true,subtree:true,attributeFilter:['open','class']});
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
  dialog.addEventListener('close',sync);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);raf=0;current=null;});
  window.addEventListener('pageshow',sync);
})();
