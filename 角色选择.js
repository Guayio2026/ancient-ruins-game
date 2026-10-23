/* CardSwap 风格的原生 GSAP 翻页；图鉴解锁不改变剧情中的战斗形态。 */
(() => {
  const dialog=document.getElementById('characterSelect');
  if(!dialog)return;
  const cards=[...dialog.querySelectorAll('.selectCard')],dots=[...dialog.querySelectorAll('[data-page]')];
  const confirm=document.getElementById('characterConfirm'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  // 有限雪粒层：只在当前卡片、打开的图鉴中播放。
  cards.forEach((card)=>{
    const snow=document.createElement('div');snow.className='selectFallingSnow';snow.setAttribute('aria-hidden','true');
    for(let i=0;i<28;i++){
      const flake=document.createElement('i');
      const size=i%7===0?4:1+i%3;
      flake.style.cssText=`left:${(i*37+11)%100}%;width:${size}px;height:${size}px;--snow-drift:${(i*19)%65-32}px;animation-duration:${6+i%7}s;animation-delay:-${(i*1.73)%12}s;opacity:${.22+(i%5)*.12}`;
      snow.append(flake);
    }
    card.prepend(snow);
  });
  const outerSnow=document.createElement('div');
  outerSnow.className='selectOuterSnow';outerSnow.setAttribute('aria-hidden','true');
  for(let i=0;i<32;i++){
    const flake=document.createElement('i');
    flake.textContent=i%5===0?'❄':'';
    flake.style.cssText=`left:${(i*43+7)%100}%;--snow-drift:${(i*17)%61-30}px;animation-duration:${11+i%8}s;animation-delay:-${(i*2.37)%19}s;opacity:${.15+(i%5)*.065}`;
    outerSnow.append(flake);
  }
  dialog.prepend(outerSnow);
  const syncSnow=()=>dialog.classList.toggle('selectSnowActive',dialog.open&&!document.hidden);
  document.addEventListener('visibilitychange',syncSnow);
  let index=0,turn=null,busy=false;
  const text=(id,value)=>{document.getElementById(id).textContent=value;};
  // 独立光泽层，不改变卡片本体变换，避免与翻页动画争用。
  const glossControls=cards.map(card=>{
    const film=document.createElement('div');film.className='selectCardGloss';film.setAttribute('aria-hidden','true');
    const sweep=document.createElement('i');sweep.className='selectGlossSweep';
    const spot=document.createElement('i');spot.className='selectGlossSpot';film.append(sweep,spot);card.append(film);
    const g=window.gsap;
    const control=g?{spot,x:g.quickTo(spot,'xPercent',{duration:.45,ease:'power2.out'}),y:g.quickTo(spot,'yPercent',{duration:.45,ease:'power2.out'}),alpha:g.quickTo(spot,'opacity',{duration:.35,ease:'sine.out'})}:null;
    card.addEventListener('pointermove',e=>{
      if(!control||e.pointerType!=='mouse'||busy||reduced.matches||!dialog.open||!card.classList.contains('isCurrent'))return;
      const rect=card.getBoundingClientRect();
      control.x(((e.clientX-rect.left)/rect.width-.5)*48);
      control.y(((e.clientY-rect.top)/rect.height-.5)*38);
      control.alpha(.65);
    },{passive:true});
    card.addEventListener('pointerleave',()=>{if(control){control.x(0);control.y(0);control.alpha(0);}});
    return control;
  });
  function resetGloss(){
    glossControls.forEach(control=>{
      if(!control)return;
      control.x.tween.pause();control.y.tween.pause();control.alpha.tween.pause();
      window.gsap.set(control.spot,{xPercent:0,yPercent:0,opacity:0});
    });
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetGloss();});
  function refresh(){
    const crown=index===1,locked=crown;
    dialog.classList.add('crownLocked');dialog.dataset.page=crown?'crown':'hat';
    dialog.querySelector('.selectFormSnowflake').setAttribute('aria-label',crown?'王冠形态，雪花已亮':'法帽形态，雪花未亮');
    cards[1].setAttribute('aria-label','王冠形态，仅供展示，局内第二关获得王冠后变身');
    cards[1].querySelector('.selectCardCaption p').textContent='局内第二关获得王冠后变身';
    text('characterPageNumber',`0${index+1} / 02`);
    text('characterAnnouncement',`${crown?'王冠形态':'法帽形态'}，第 ${index+1} 页，共 2 页。${locked?'仅供展示，局内第二关获得王冠后变身。':''}`);
    confirm.disabled=busy||locked;confirm.textContent=locked?'❄ 仅在局内变身':'以法帽形态启程 →';
    dots.forEach((dot,i)=>{if(i===index)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');});
  }
  function settle(){
    if(turn){turn.kill();turn=null;}
    resetGloss();busy=false;dialog.removeAttribute('aria-busy');
    cards.forEach((card,i)=>{card.classList.toggle('isCurrent',i===index);card.inert=i!==index;card.setAttribute('aria-hidden',String(i!==index));card.style.cssText='';});
    refresh();
  }
  function goTo(next,direction=1){
    if(!dialog.open||busy||next===index)return;
    resetGloss();const old=cards[index],incoming=cards[next];window.FrostAudio?.uiClick?.();index=next;
    if(reduced.matches||!window.gsap){settle();return;}
    const g=window.gsap;busy=true;dialog.setAttribute('aria-busy','true');refresh();
    old.inert=true;old.setAttribute('aria-hidden','true');incoming.inert=false;incoming.setAttribute('aria-hidden','false');
    old.style.zIndex='3';incoming.style.zIndex='2';old.style.willChange=incoming.style.willChange='transform,opacity';
    g.set(incoming,{autoAlpha:1,rotationY:direction*12,x:direction*32,scale:.96,transformOrigin:direction>0?'0% 50%':'100% 50%'});
    turn=g.timeline({defaults:{ease:'power2.inOut'},onComplete:settle})
      .to(old,{rotationY:-direction*78,x:-direction*75,autoAlpha:0,scale:.97,transformOrigin:direction>0?'0% 50%':'100% 50%',duration:.48},0)
      .to(incoming,{rotationY:0,x:0,scale:1,duration:.58},.1);
  }
  document.getElementById('characterPrev').addEventListener('click',()=>goTo(1-index,-1));
  document.getElementById('characterNext').addEventListener('click',()=>goTo(1-index,1));
  dots.forEach((dot,i)=>dot.addEventListener('click',()=>goTo(i,i>index?1:-1)));
  dialog.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.key==='Home')goTo(0,-1);else if(e.key==='End')goTo(1,1);else goTo(1-index,e.key==='ArrowRight'?1:-1);}});
  const deck=dialog.querySelector('.selectDeck');let gesture=null;
  deck.addEventListener('pointerdown',e=>{if(e.isPrimary&&e.button===0)gesture={id:e.pointerId,x:e.clientX,y:e.clientY};});
  deck.addEventListener('pointerup',e=>{if(!gesture||e.pointerId!==gesture.id)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3)goTo(1-index,dx<0?1:-1);});
  deck.addEventListener('pointercancel',()=>{gesture=null;});
  dialog.addEventListener('close',()=>{gesture=null;settle();syncSnow();});
  reduced.addEventListener('change',()=>{if(reduced.matches)settle();});
  window.FrostCharacterSelect={
    open(){index=0;settle();dialog.showModal();syncSnow();document.getElementById('characterNext').focus({preventScroll:true});},
    canDepart:()=>dialog.open&&!busy&&index===0
  };
  settle();
})();
