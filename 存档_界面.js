/* 正式存档 UI：成功提示由 IndexedDB 事务完成事件驱动。 */
(() => {
  'use strict';
  const title=document.getElementById('titleScreen'),button=document.getElementById('continueJourney');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const icon='<svg class="saveBookmark" viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M10 5h19l4 5v32L21 35 9 42V10Z" fill="#8ed5ee12" stroke="currentColor" stroke-width="1.2"/><path d="M13 8h14l3 4v24l-9-5-9 5V12M15 6v-2h11v2" stroke="currentColor" stroke-width=".65" opacity=".55"/><path d="m21 13 5 8-5 8-5-8Z" fill="#a1dff72b" stroke="currentColor"/><path d="M21 10v22m-8-11h16m-13-5 10 10m0-10L16 26m2-13 3 3 3-3m-6 16 3-3 3 3" stroke="currentColor" stroke-width=".8" stroke-linecap="round"/><circle cx="21" cy="21" r="1.5" fill="#efffff"/><path d="m33 1 1.2 3.8L38 6l-3.8 1.2L33 11l-1.2-3.8L28 6l3.8-1.2Z" fill="currentColor" opacity=".8"/></svg>';
  button.querySelector('.continueIcon').innerHTML=icon;
  const notice=document.getElementById('saveLoadNotice');
  const dialog=document.getElementById('newJourneyDialog');
  const exitDialog=document.getElementById('saveExitDialog'),exitButton=document.getElementById('saveExitButton');
  const exitConfirm=document.getElementById('confirmSaveExit'),exitCancel=document.getElementById('cancelSaveExit');
  const exitStatus=document.getElementById('saveExitStatus'),exitDescription=document.getElementById('saveExitDescription');
  let exitBusy=false;
  const syncExitSnow=()=>exitDialog.classList.toggle('exitSnowActive',exitDialog.open&&!document.hidden&&document.hasFocus());
  new MutationObserver(syncExitSnow).observe(exitDialog,{attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',syncExitSnow);
  window.addEventListener('focus',syncExitSnow);
  window.addEventListener('blur',()=>exitDialog.classList.remove('exitSnowActive'));
  const toast=document.createElement('div');toast.id='saveMemoryToast';
  toast.innerHTML=icon+'<div class="memoryCopy"><div class="memoryStatus" role="status" aria-live="polite" aria-atomic="true"><div class="memoryTitle"></div><div class="memoryDetail"></div></div><button class="saveRetry" type="button" hidden>重试保存</button></div><i class="memorySpark" aria-hidden="true"></i>';
  document.body.append(toast);
  const message=toast.querySelector('.memoryTitle'),detail=toast.querySelector('.memoryDetail'),retry=toast.querySelector('.saveRetry');
  let actions=null,current=null,hasData=false,tween=null,timer=0,pending=null,confirmResolve=null;
  function animate(visible){
    if(tween)tween.kill();
    if(window.gsap)tween=gsap.to(toast,{autoAlpha:visible?1:0,y:visible?0:-6,duration:reduced.matches?0:visible?.3:.4,ease:'power2.out',overwrite:true});
    else{toast.style.opacity=visible?'1':'0';toast.style.visibility=visible?'visible':'hidden';}
  }
  function paint(){
    if(!pending||document.hidden||document.querySelector('dialog[open]'))return;
    clearTimeout(timer);message.textContent=pending.message;detail.textContent=pending.detail;
    retry.hidden=pending.kind!=='error';toast.classList.toggle('saveFailed',pending.kind==='error');
    animate(true);
    if(pending.kind==='success')timer=setTimeout(()=>{animate(false);pending=null;},2200);
  }
  function status(kind,text){
    clearTimeout(timer);
    pending={kind,message:kind==='saving'?'正在封存记忆':kind==='error'?'保存未完成':'记忆已封存',detail:text};
    paint();
  }
  function setSave(result){
    current=result.record;hasData=result.hasData;
    button.hidden=!current;title.classList.toggle('hasSave',!!current);
    const small=title.querySelector('.t-press small');small.textContent=hasData?'重新启程':'开始旅程';
    if(current){
      const p=current.checkpoint,name=actions?.chapterName(p.chapter)||'旅途检查点';
      const time=new Date(current.savedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
      button.querySelector('.continueMeta').textContent=name+' · Lv.'+p.xpLevel+' · '+time;
      button.title='从最近检查点继续，生命恢复，战斗动作重新初始化';
    }
    const notes={recovered:'主存档异常，已找到上一份有效备份，可继续旅途。',invalid:'存档损坏或版本不兼容，原数据已保留。重新启程前会再次确认。',unavailable:'无法访问本地存档。仍可游玩，保存成功前请勿关闭页面。'};
    notice.textContent=notes[result.status]||'';notice.hidden=!notice.textContent;
  }
  async function confirmNew(){
    if(!hasData)return true;
    if(confirmResolve)return false;
    return new Promise(resolve=>{confirmResolve=resolve;dialog.showModal();document.getElementById('cancelNewJourney').focus();});
  }
  function answer(ok){if(!confirmResolve)return;const resolve=confirmResolve;confirmResolve=null;dialog.close();resolve(ok);}
  document.getElementById('cancelNewJourney').addEventListener('click',()=>answer(false));
  document.getElementById('confirmNewJourney').addEventListener('click',()=>answer(true));
  dialog.addEventListener('cancel',event=>{event.preventDefault();answer(false);});
  button.addEventListener('click',()=>actions?.continueJourney(current));
  retry.addEventListener('click',()=>actions?.retry());
  function openExit(){
    if(exitBusy||!document.body.classList.contains('playing')||document.body.classList.contains('entering-game')||document.querySelector('dialog[open]'))return;
    actions?.clearInput();exitStatus.textContent='';exitConfirm.textContent='保存并退出';
    exitDescription.textContent=actions?.isDemo()
      ?'当前是开发试演。将保留正式旅途的最近检查点并返回主菜单，不保存跳关进度。'
      :'保存最近检查点并返回主菜单。尚未完成的战斗，下次将从检查点重新开始。';
    exitDialog.showModal();exitCancel.focus();
  }
  exitButton.addEventListener('click',openExit);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||event.repeat||!document.body.classList.contains('playing')||document.querySelector('dialog[open]'))return;
    event.preventDefault();event.stopImmediatePropagation();openExit();
  },true);
  exitCancel.addEventListener('click',()=>{if(!exitBusy)exitDialog.close();});
  exitDialog.addEventListener('cancel',event=>{if(exitBusy)event.preventDefault();});
  exitDialog.addEventListener('close',()=>actions?.clearInput());
  exitConfirm.addEventListener('click',async()=>{
    if(exitBusy||!actions)return;
    exitBusy=true;exitConfirm.disabled=exitCancel.disabled=true;exitStatus.textContent='正在保存，请稍候…';
    try{
      const saved=await actions.saveAndExit();
      if(saved){exitDialog.close();button.focus({preventScroll:true});}
      else{exitStatus.textContent='保存失败，尚未退出。请重试，或继续游戏。';exitConfirm.textContent='重试保存并退出';}
    }catch(_){exitStatus.textContent='保存未完成，尚未退出。请重试。';exitConfirm.textContent='重试保存并退出';}
    finally{exitBusy=false;exitConfirm.disabled=exitCancel.disabled=false;}
  });
  const refreshToast=()=>{if(document.hidden){clearTimeout(timer);animate(false);}else paint();};
  document.addEventListener('visibilitychange',refreshToast);
  document.addEventListener('close',()=>{queueMicrotask(paint);},true);
  new MutationObserver(()=>{if(!document.body.classList.contains('entering-game'))paint();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',()=>{if(tween)tween.progress(1);});
  window.FrostSaveUI={
    configure(callbacks){actions=callbacks;},setSave,confirmNew,
    status,clear(){pending=null;clearTimeout(timer);animate(false);},
    isPaused:()=>dialog.open||exitDialog.open,
    returnToMenu:()=>actions?.saveAndExit()??Promise.resolve(false),
    get hasData(){return hasData;}
  };
})();
