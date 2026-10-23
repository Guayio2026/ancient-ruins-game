/* A defeat choice after the existing death clip; persistence stays with the journey. */
(()=>{
  'use strict';
  const dialog=document.createElement('dialog');
  dialog.id='deathScreen';
  dialog.setAttribute('aria-labelledby','deathScreenTitle');
  dialog.setAttribute('aria-describedby','deathScreenDescription');
  dialog.innerHTML='<div class="deathCopy"><div class="deathCrystal" aria-hidden="true">❄</div><p class="deathEyebrow">FROST WHISPER</p><h1 id="deathScreenTitle">旅途暂歇</h1><p id="deathScreenDescription">霜雪会记住你走过的路。</p><div class="deathActions"><button id="deathRetry" type="button" autofocus>重新开始本关</button><button id="deathMenu" type="button">返回主菜单</button></div><p class="deathKeys">R 重试 · Tab 切换 · Enter 确认</p><p id="deathScreenStatus" role="status" aria-live="polite"></p></div>';
  document.body.append(dialog);
  const retry=document.getElementById('deathRetry'),menu=document.getElementById('deathMenu');
  const description=document.getElementById('deathScreenDescription'),keys=dialog.querySelector('.deathKeys');
  const status=document.getElementById('deathScreenStatus');
  const pressed=new Set(),blockedUntilRelease=new Set();
  let actions=null,busy=false,generation=0;
  function begin(){
    if(!actions?.isDead())return;
    actions.clearInput();
    for(const code of pressed)blockedUntilRelease.add(code);
    document.body.classList.add('player-defeated');
  }
  function reset(){
    generation++;busy=false;
    retry.disabled=menu.disabled=false;
    if(dialog.open)dialog.close();
    document.body.classList.remove('player-defeated');
    status.textContent='';
  }
  function update(){
    if(!actions?.isDead()){if(dialog.open||document.body.classList.contains('player-defeated'))reset();return;}
    begin();
    if(dialog.open||!actions.isReady()||document.querySelector('dialog[open]'))return;
    const challenge=actions.isChallenge();
    retry.textContent=challenge?'返回旅途':'重新开始本关';
    description.textContent=challenge?'回响尚未完成。旅途进度与已获得的勋章仍然保留。':'霜雪会记住你走过的路。\n恢复生命，从本关起点再次启程。';
    keys.textContent=challenge?'R 返回旅途 · Tab 切换 · Enter 确认':'R 重试 · Tab 切换 · Enter 确认';
    status.textContent='';dialog.showModal();retry.focus({preventScroll:true});
  }
  function retryJourney(){
    if(busy||!dialog.open)return;
    actions.clearInput();
    actions.retry();
    reset();
  }
  async function returnToMenu(){
    if(busy||!dialog.open)return;
    busy=true;retry.disabled=menu.disabled=true;
    const token=generation;
    status.textContent='正在保留检查点…';
    try{
      const ok=await actions.returnToMenu();
      if(ok){reset();document.getElementById('continueJourney')?.focus({preventScroll:true});}
      else if(token===generation&&dialog.open)status.textContent='检查点保存未完成。请重试，或重新开始本关。';
    }catch(_){if(token===generation&&dialog.open)status.textContent='检查点保存未完成，请重试。';}
    finally{if(token===generation){busy=false;retry.disabled=menu.disabled=false;}}
  }
  retry.addEventListener('click',retryJourney);
  menu.addEventListener('click',returnToMenu);
  dialog.addEventListener('cancel',event=>event.preventDefault());
  dialog.addEventListener('close',()=>actions?.clearInput());
  const bypass=event=>event.ctrlKey||event.metaKey||event.altKey||/^F\d+$/.test(event.key);
  window.addEventListener('keydown',event=>{
    const code=event.code||event.key;
    pressed.add(code);
    const dead=actions?.isDead();
    if(!dead&&!blockedUntilRelease.has(code))return;
    if(bypass(event))return;
    blockedUntilRelease.add(code);
    if(dead&&dialog.open&&!busy){
      if(event.code==='Tab'){event.stopImmediatePropagation();return;}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){
        event.preventDefault();event.stopImmediatePropagation();
        (event.key==='Home'?retry:event.key==='End'?menu:document.activeElement===retry?menu:retry).focus();return;
      }
      if(['Enter','NumpadEnter','Space'].includes(event.code)&&event.target.closest('#deathScreen button')){
        event.stopImmediatePropagation();return; // Keep native button activation, isolate game input.
      }
      if(event.code==='KeyR'&&!event.repeat){event.preventDefault();event.stopImmediatePropagation();retryJourney();return;}
    }
    event.preventDefault();event.stopImmediatePropagation();
  },true);
  window.addEventListener('keyup',event=>{
    const code=event.code||event.key;
    pressed.delete(code);
    const blocked=blockedUntilRelease.delete(code),dead=actions?.isDead();
    if(!dead&&!blocked)return;
    if(bypass(event))return;
    const nativeButton=dialog.open&&['Enter','NumpadEnter','Space','Tab'].includes(event.code)&&event.target.closest('#deathScreen');
    if(!nativeButton)event.preventDefault();
    event.stopImmediatePropagation();
  },true);
  window.addEventListener('blur',()=>{pressed.clear();blockedUntilRelease.clear();});
  window.FrostDeathScreen={configure(callbacks){actions=callbacks;},begin,update,reset,isOpen:()=>dialog.open};
})();
