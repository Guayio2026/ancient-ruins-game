/* 原生适配 CardSwap 的透视翻页思路；只翻展示层，剧情由原对话逻辑提交。 */
(() => {
  function createBook(dialog){
  const layout=dialog?.querySelector('.npcDialogueLayout');
  if(!layout)return null;
  const snow=document.createElement('div');snow.className='dialogueSnow';snow.setAttribute('aria-hidden','true');
  for(let i=0;i<25;i++){
    const flake=document.createElement('i');flake.textContent=i%6===0?'❄':'';
    flake.style.cssText=`left:${(i*37+13)%100}%;--book-snow-drift:${(i*17)%51-25}px;animation-duration:${8+i%7}s;animation-delay:-${(i*2.13)%14}s;opacity:${.18+(i%4)*.07}`;
    snow.append(flake);
  }
  layout.prepend(snow);
  const syncSnow=()=>dialog.classList.toggle('bookSnowActive',dialog.open&&!document.hidden);
  new MutationObserver(syncSnow).observe(dialog,{attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',syncSnow);
  syncSnow();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let animation=null,leaf=null,turnLayer=null,busy=false;
  function cancel(){
    animation?.kill();animation=null;turnLayer?.remove();turnLayer=null;leaf=null;busy=false;
    dialog.removeAttribute('aria-busy');dialog.classList.remove('dialogueTurning');
  }
  const controller={
    get busy(){return busy;},cancel,
    turn(commit){
      if(busy)return;
      if(reduced.matches||!window.gsap){commit();return;}
      const content=dialog.querySelector('.npcDialogueContent');
      const bounds=layout.getBoundingClientRect(),page=content.getBoundingClientRect();
      turnLayer=document.createElement('div');turnLayer.className='dialogueTurnViewport';turnLayer.setAttribute('aria-hidden','true');
      leaf=document.createElement('div');leaf.className='dialogueTurnLeaf';leaf.setAttribute('aria-hidden','true');leaf.inert=true;
      leaf.style.cssText=`left:${page.left-bounds.left-18}px;top:10px;width:${page.width+37}px;height:${bounds.height-20}px`;
      const front=document.createElement('div');front.className='dialogueLeafFront';
      const speaker=document.createElement('div');speaker.className='dialogueLeafSpeaker';speaker.textContent=dialog.querySelector('.npcDialogueHeader h2').textContent;
      const words=document.createElement('p');words.className='dialogueLeafWords';words.textContent=dialog.querySelector('.npcDialogueBody p').textContent;
      const back=document.createElement('div');back.className='dialogueLeafBack';
      front.append(speaker,words);leaf.append(front,back);turnLayer.append(leaf);layout.append(turnLayer);
      busy=true;dialog.setAttribute('aria-busy','true');dialog.classList.add('dialogueTurning');
      try{commit();}catch(error){cancel();throw error;}
      const landingScale=Math.max(.04,Math.min(1,(page.left-bounds.left-28)/(page.width+37)));
      animation=window.gsap.timeline({defaults:{ease:'power2.inOut'},onComplete:cancel})
        .fromTo(leaf,{rotationY:0,rotationZ:0,scaleX:1,scaleY:1,z:0},
          {rotationY:-86,scaleX:.7,scaleY:.92,z:-70,duration:.32},0)
        .to(leaf,{rotationY:-166,rotationZ:0,scaleX:landingScale,scaleY:.92,z:-15,duration:.36},.32)
        .to(leaf,{autoAlpha:0,duration:.13},.55);
    }
  };
  dialog.addEventListener('close',cancel);
  new MutationObserver(()=>{if(!dialog.open)cancel();}).observe(dialog,{attributes:true,attributeFilter:['open']});
  reduced.addEventListener('change',()=>{if(reduced.matches)cancel();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
  window.addEventListener('resize',cancel);
  return controller;
  }
  window.FrostBookTurn={create:createBook};
  window.FrostDialogueBook=createBook(document.getElementById('npcDialogue'));
})();
