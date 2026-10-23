/* Full-game ending card. Its artwork/video is separate from the combat WIN. */
(()=>{
 'use strict';
 const dialog=document.createElement('dialog');dialog.id='endingScreen';dialog.setAttribute('aria-labelledby','endingScreenTitle');
 dialog.innerHTML='<img class="endingArt" src="artwork/通关纪念_v1/归途_戴冠少女_雪落村庄_v1.png" alt="戴冠少女回到飘雪的村口，远处余烬渐息"><video class="endingVideo" muted playsinline loop preload="none" poster="artwork/通关纪念_v1/归途_戴冠少女_雪落村庄_v1.png" aria-hidden="true"></video><canvas class="endingSnow" aria-hidden="true"></canvas><div class="endingCopy"><p class="endingEyebrow">FROST WHISPER · 旅途终章</p><h1 id="endingScreenTitle">霜雪终归宁静</h1><p class="endingLines">他们没有忘记回家的路。<br>只是一直守在那里。</p><p class="endingAfterword">王冠的霜光未曾熄灭。<br>接下来的路，是和留下的人一起走回家。</p><div class="endingAchievements" aria-label="旅途勋章"></div><div class="endingActions"><button type="button" class="endingExplore">继续探索</button><button type="button" class="endingMenu">返回主菜单</button></div><p class="endingStatus" role="status"></p></div>';
 document.body.append(dialog);
 const video=dialog.querySelector('video'),canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let raf=0,last=0,time=0,source='';
 function snow(now){
  if(!dialog.open)return;
  if(last&&!reduced.matches)time+=Math.min(.05,(now-last)/1000);last=now;
  const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
  for(let i=0;i<(reduced.matches?18:62);i++){
   const x=((i*157.31+Math.sin(time*.4+i)*18+time*(5+i%7))%w+w)%w,y=(i*73.19+time*(15+i%9*3))%h;
   ctx.globalAlpha=.18+i%5*.1;ctx.fillStyle='#ebfaff';ctx.beginPath();ctx.arc(x,y,.7+i%3*.5,0,Math.PI*2);ctx.fill();
  }
  if(!reduced.matches)raf=requestAnimationFrame(snow);
 }
 function size(){canvas.width=innerWidth;canvas.height=innerHeight;if(dialog.open&&reduced.matches)snow(performance.now())}
 function close(){if(dialog.open)dialog.close()}
 dialog.addEventListener('close',()=>{cancelAnimationFrame(raf);raf=0;last=0;video.pause();window.FrostJourney?.clearInput();});
 dialog.addEventListener('cancel',()=>window.FrostJourney?.clearInput());
 dialog.querySelector('.endingExplore').onclick=()=>{const inGame=document.body.classList.contains('playing');close();if(!inGame)document.getElementById('continueJourney')?.click();};
 dialog.querySelector('.endingMenu').onclick=async()=>{
  const button=dialog.querySelector('.endingMenu'),status=dialog.querySelector('.endingStatus');
  if(!document.body.classList.contains('playing')){close();return;}
  button.disabled=true;status.textContent='正在封存旅途…';
  try{if(await window.FrostSaveUI?.returnToMenu()){close();status.textContent='';}else status.textContent='保存未完成，请重试或继续探索。';}
  catch(_){status.textContent='保存未完成，请重试或继续探索。';}finally{button.disabled=false;}
 };
 window.addEventListener('resize',size);
 document.addEventListener('visibilitychange',()=>{last=0;if(dialog.open&&!reduced.matches&&source){if(document.hidden)video.pause();else video.play().catch(()=>{});}});
 window.FrostEndingScreen={
  open(records={}){
   if(dialog.open)return;window.FrostJourney?.clearInput();
   const row=dialog.querySelector('.endingAchievements');row.replaceChildren();
   for(const [kind,key] of [['完成','complete'],['限时','fast'],['无伤','clean']]){
    const n=Object.values(records).filter(r=>key==='complete'||r[key]).length,figure=document.createElement('figure'),img=new Image(),label=document.createElement('figcaption');
    img.src='技能图标/徽章_'+kind+'_王冠_v1.png';img.alt=kind+'勋章';label.textContent=kind+' '+n+'/5';figure.className=n?'':'locked';figure.append(img,label);row.append(figure);
   }
   dialog.querySelector('.endingStatus').textContent='';dialog.showModal();size();last=0;raf=requestAnimationFrame(snow);
   if(source&&!reduced.matches)video.play().catch(()=>{});
  },close,isOpen:()=>dialog.open,
  setVideo(path){source=path;video.src=path;video.onloadeddata=()=>{video.classList.add('ready');if(dialog.open&&!reduced.matches)video.play().catch(()=>{});};video.onerror=()=>video.classList.remove('ready');video.load();}
 };
 window.FrostEndingScreen.setVideo('artwork/通关纪念_v1/归途_雪落循环_网页_v1.mp4');
})();
