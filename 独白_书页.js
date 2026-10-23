/* 开场心声与 NPC 交谈共用书页外观及翻页控制器。 */
(() => {
  const dialog=document.getElementById('monologueBook');
  if(!dialog)return;
  const book=window.FrostBookTurn.create(dialog);
  const words=document.getElementById('monologueBookText'),full=document.getElementById('monologueBookFullText');
  const count=document.getElementById('monologueBookCount'),next=document.getElementById('monologueBookNext');
  let advance=()=>{},skip=()=>{};
  dialog.querySelector('.npcDialogueBody').addEventListener('click',()=>advance());
  next.addEventListener('click',()=>advance());
  document.getElementById('monologueBookClose').addEventListener('click',()=>skip());
  dialog.addEventListener('cancel',event=>{event.preventDefault();skip();});
  window.FrostMonologueBook={
    open(onAdvance,onSkip,caption='旅途手记'){dialog.querySelector('.npcDialoguePlace').textContent=caption;advance=onAdvance;skip=onSkip;book.cancel();words.textContent='';full.textContent='';if(!dialog.open)dialog.showModal();},
    sync(text,visible,line,total){
      const shown=text.slice(0,visible);if(words.textContent!==shown)words.textContent=shown;
      if(full.textContent!==text)full.textContent=text;
      const label=`${line+1} / ${total}`;if(count.textContent!==label)count.textContent=label;
      const action=visible<text.length?'显示全文':line===total-1?'合上手记':'翻至下一页';
      if(next.textContent!==action)next.textContent=action;
    },
    turn:callback=>book.turn(callback),
    get busy(){return book.busy;},
    close(){book.cancel();if(dialog.open)dialog.close();}
  };
})();
