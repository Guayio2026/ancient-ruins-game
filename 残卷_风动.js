/* 参考 SVG turbulence/displacement + GSAP 思路，原创低幅度卷面风动。
 * https://github.com/Cuberto/svg-distortion-effect-demo
 * 只扭曲纸面，不将可读正文栅格化或施加位移滤镜。 */
(() => {
  const dialog=document.getElementById('loreDialog'),g=window.gsap;
  if(!dialog||!g)return;
  const article=dialog.querySelector('.frostScroll');
  const wrap=document.createElement('div');wrap.className='loreWindWrap';
  article.before(wrap);wrap.append(article);
  const defs=document.createElementNS('http://www.w3.org/2000/svg','svg');
  defs.classList.add('loreWindDefs');defs.setAttribute('aria-hidden','true');
  defs.innerHTML='<defs><filter id="lorePaperWind" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.0045 0.011" numOctaves="1" seed="8" stitchTiles="stitch" result="wind"/><feDisplacementMap in="SourceGraphic" in2="wind" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter></defs>';
  dialog.prepend(defs);
  const warp=document.createElement('div');warp.className='lorePaperWarp';warp.setAttribute('aria-hidden','true');
  const paper=document.createElement('div');paper.className='lorePaperSurface';
  const fold=document.createElement('div');fold.className='loreWindFold';
  paper.append(fold);warp.append(paper);wrap.prepend(warp);
  const noise=defs.querySelector('feTurbulence'),displacement=defs.querySelector('feDisplacementMap');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const float=g.timeline({paused:true,repeat:-1,defaults:{ease:'sine.inOut'}})
    .fromTo(wrap,{x:0,y:0,rotation:0,rotationX:0,rotationY:0},
      {x:3,y:-5,rotation:.28,rotationX:.55,rotationY:-.8,duration:1.9},0)
    .to(wrap,{x:-2,y:2,rotation:-.22,rotationX:-.35,rotationY:.65,duration:2.3})
    .to(wrap,{x:0,y:0,rotation:0,rotationX:0,rotationY:0,duration:2.05});
  const ripple=g.timeline({paused:true,repeat:-1,yoyo:true,defaults:{ease:'sine.inOut'}})
    .to(noise,{attr:{baseFrequency:'0.006 0.015'},duration:2.6},0)
    .to(displacement,{attr:{scale:13},duration:2.6},0)
    .fromTo(fold,{xPercent:-9,opacity:.3},{xPercent:12,opacity:.5,duration:2.6},0);
  let running=false;
  function sync(){
    const active=dialog.open&&!document.hidden&&!reduced.matches;
    if(active===running)return;
    running=active;
    dialog.classList.toggle('loreWindActive',active);
    if(active){float.play();ripple.play();}
    else{float.pause();ripple.pause();}
  }
  function reset(){
    float.pause(0);ripple.pause(0);running=false;
    dialog.classList.remove('loreWindActive');
    g.set(wrap,{clearProps:'transform'});
    displacement.setAttribute('scale','7');
    noise.setAttribute('baseFrequency','0.0045 0.011');
  }
  new MutationObserver(()=>{if(!dialog.open)reset();else article.scrollTop=0;sync();}).observe(dialog,{attributes:true,attributeFilter:['open']});
  dialog.addEventListener('close',()=>{if(!dialog.open)reset();});
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',()=>{if(reduced.matches)reset();sync();});
  window.addEventListener('pagehide',()=>{float.pause();ripple.pause();running=false;dialog.classList.remove('loreWindActive');});
  window.addEventListener('pageshow',sync);
  sync();
})();
