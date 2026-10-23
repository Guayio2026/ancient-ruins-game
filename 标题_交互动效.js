/* GSAP：菜单错峰入场与有限粒子池的冰雪鼠标拖尾。离开标题即清理。 */
(() => {
  const g=window.gsap,title=document.getElementById('titleScreen');
  if(!g||!title)return;
  const buttons=[...title.querySelectorAll('.titleMenu button')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const visible=()=>window.FrostTitleMotion?window.FrostTitleMotion.isActive():!document.hidden&&title.style.display!=='none'&&!title.classList.contains('hide');
  let entrance=null,entered=false,resetTrail=()=>{};
  title.classList.add('titleGsap');
  function sync(){
    if(visible()&&title.classList.contains('ready')){
      if(!entered){
        entered=true;
        if(!reduced.matches){
          entrance=g.timeline({defaults:{duration:.65,ease:'power2.out'}})
            .addLabel('ornaments',0)
            .fromTo(buttons,{autoAlpha:0,x:-12},{autoAlpha:1,x:0,stagger:.09,clearProps:'transform,opacity,visibility'},'ornaments+=0.35')
            .fromTo([title.querySelector('.t-line'),title.querySelector('.titleEdition')],
              {autoAlpha:0,y:4},{autoAlpha:1,y:0,duration:.5,stagger:.1,clearProps:'transform,opacity,visibility'},'ornaments+=0.75');
        }
      }else if(entrance&&!reduced.matches)entrance.resume();
    }else{if(entrance)entrance.pause();resetTrail();}
    if(reduced.matches&&entrance)entrance.progress(1);
  }
  new MutationObserver(sync).observe(title,{attributes:true,attributeFilter:['class','style']});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('frost-title-motion-change',sync);
  reduced.addEventListener('change',sync);
  sync();

  // 冰光沿牌匾边框走一圈，图标轻抬；鼠标与键盘焦点使用相同反馈。
  const outline='M29 3H147L153 6H187L193 3H311L318 10H328L334 21V26L338 34L334 42V47L328 58H318L311 65H193L187 62H153L147 65H29L22 58H12L6 47V42L2 34L6 26V21L12 10H22Z';
  for(const button of buttons){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 340 68');svg.setAttribute('preserveAspectRatio','none');
    svg.setAttribute('aria-hidden','true');svg.classList.add('menuIceTrace');
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',outline);path.setAttribute('pathLength','1');svg.append(path);button.append(svg);
    const icon=button.querySelector('span'),lift=g.quickTo(icon,'y',{duration:.25,ease:'power2.out'});
    let hoverTween=null;
    function feedback(){
      if(hoverTween)hoverTween.kill();
      if(reduced.matches){g.set(path,{autoAlpha:0});lift(0);return;}
      const highlighted=button.matches(':hover,:focus-visible');
      lift(highlighted?-2:0);
      hoverTween=highlighted?g.fromTo(path,{strokeDashoffset:1,autoAlpha:.7},{strokeDashoffset:0,autoAlpha:1,duration:.7,ease:'power2.out'}):g.to(path,{autoAlpha:0,duration:.22});
    }
    for(const e of ['pointerenter','pointerleave','focus','blur'])button.addEventListener(e,feedback);
    reduced.addEventListener('change',feedback);
    const release=()=>g.to(button,{scale:1,duration:reduced.matches?0:.22,ease:'power2.out',overwrite:'auto'});
    button.addEventListener('pointerdown',()=>g.to(button,{scale:reduced.matches?1:.975,duration:.1,overwrite:'auto'}));
    for(const e of ['pointerup','pointercancel','pointerleave','blur'])button.addEventListener(e,release);
    button.addEventListener('click',()=>{
      window.FrostAudio?.uiClick?.();
      if(!reduced.matches)g.fromTo(button,{scale:.975},{scale:1,duration:.25,ease:'power2.out',overwrite:'auto'});
    },true);
  }

  // 在雾幕完全覆盖时切换场景，避免看到空画布或HUD突然出现。
  const frostTransition=(swapScene,{stage,cover,reveal})=>new Promise(resolve=>{
    const curtain=document.createElement('div');curtain.id='frostGateTransition';curtain.setAttribute('aria-hidden','true');
    curtain.dataset.stage=stage;
    const wisps=Array.from({length:3},()=>{const el=document.createElement('i');curtain.append(el);return el;});
    document.body.append(curtain);g.set(curtain,{autoAlpha:0});
    const duration=reduced.matches?.08:cover,fadeOut=reduced.matches?.1:reveal,total=duration+.05+fadeOut;
    const tl=g.timeline({onComplete:()=>{curtain.remove();resolve();}})
      .to(curtain,{autoAlpha:1,duration,ease:'sine.inOut'},0)
      .call(()=>{swapScene();curtain.dataset.swapped='true';},[],duration)
      .to(curtain,{autoAlpha:0,duration:fadeOut,ease:'sine.inOut'},duration+.05);
    if(!reduced.matches)tl.fromTo(wisps,{xPercent:-5,scale:1.1},{xPercent:5,scale:1.2,duration:total-.05,ease:'sine.inOut',stagger:.025},0);
  });
  window.FrostMenuTransition=swap=>frostTransition(swap,{stage:'title-game',cover:.5,reveal:.7});
  window.FrostLoadingTransition=swap=>frostTransition(swap,{stage:'loading-title',cover:.22,reveal:.32});

  const mm=g.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference) and (any-hover: hover) and (any-pointer: fine)',()=>{
    const layer=document.createElement('div');layer.id='frostPointerTrail';layer.setAttribute('aria-hidden','true');
    const glow=document.createElement('i');glow.className='frostPointerGlow';layer.append(glow);
    // 48个元素反复使用，移动时间再长也不会累积DOM节点。
    const pool=Array.from({length:48},(_,i)=>{
      const el=document.createElement('i');el.className='frostPointerParticle '+(i%4===0?'snowCrystal':i%3===0?'iceShard':'snowDust');
      layer.append(el);return {el,tween:null};
    });
    document.body.append(layer);
    g.set([glow,...pool.map(p=>p.el)],{autoAlpha:0});
    const xTo=g.quickTo(glow,'x',{duration:.12,ease:'power2.out'});
    const yTo=g.quickTo(glow,'y',{duration:.12,ease:'power2.out'});
    const fadeGlow=g.to(glow,{autoAlpha:0,duration:.45,paused:true});
    const idle=g.delayedCall(.12,()=>fadeGlow.restart()).pause();
    let previous=null,lastEmit=0,index=0;
    const rand=g.utils.random;
    function emit(x,y,dx,dy){
      const slot=pool[index++%pool.length],el=slot.el;
      if(slot.tween)slot.tween.kill();
      el.classList.add('isActive');
      g.set(el,{x:x-5+rand(-3,3),y:y-5+rand(-3,3),rotation:rand(0,180),scale:rand(.7,1.15),autoAlpha:rand(.75,.95)});
      slot.tween=g.to(el,{
        x:'+='+(-dx*.06+rand(-12,12)),y:'+='+(-dy*.04+rand(12,30)),
        rotation:'+='+rand(-55,55),scale:.15,autoAlpha:0,duration:rand(.65,.95),ease:'power1.in',
        onComplete:()=>{slot.tween=null;el.classList.remove('isActive');}
      });
    }
    function reset(){
      previous=null;lastEmit=0;idle.pause();fadeGlow.pause();xTo.tween.pause();yTo.tween.pause();
      for(const p of pool){if(p.tween)p.tween.kill();p.tween=null;p.el.classList.remove('isActive');}
      g.set([glow,...pool.map(p=>p.el)],{autoAlpha:0});
    }
    resetTrail=reset;
    function move(e){
      if(e.pointerType!=='mouse'||!visible())return;
      const x=e.clientX,y=e.clientY;
      if(!previous){g.set(glow,{x,y});previous={x,y};}
      fadeGlow.pause();g.set(glow,{autoAlpha:1});xTo(x);yTo(y);idle.restart(true);
      if(e.timeStamp-lastEmit<16)return;
      const dx=x-previous.x,dy=y-previous.y,d=Math.hypot(dx,dy);
      if(d<6)return;
      // 窗口间跳转、瞬移时不在整屏画出一条粒子带。
      if(d<180){
        const count=Math.min(6,Math.ceil(d/10));
        for(let i=1;i<=count;i++)emit(previous.x+dx*i/count,previous.y+dy*i/count,dx,dy);
      }
      previous={x,y};lastEmit=e.timeStamp;
    }
    window.addEventListener('pointermove',move,{passive:true});
    document.documentElement.addEventListener('pointerleave',reset);
    window.addEventListener('blur',reset);
    window.addEventListener('pagehide',reset);
    return ()=>{
      reset();resetTrail=()=>{};idle.kill();fadeGlow.kill();xTo.tween.kill();yTo.tween.kill();
      window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',reset);
      window.removeEventListener('blur',reset);window.removeEventListener('pagehide',reset);layer.remove();
    };
  });
})();
