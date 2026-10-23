/* Full-screen X ultimate. Transparent animation over the real battlefield; live hit and WIN gates. */
window.FrostCrownUltimate={
 create(pending,hooks){
  'use strict';
  const spec=window.FrostCrownUltAssets,cache=new Map(),titles={};
  const state={active:false,time:0,win:false,kills:0,hits:0,combo:0,damage:0,lastHit:-100,idleTime:0,paused:false,waiting:false,error:null};
  let origin=null,started=false,chimed=false,impact=null,impactIndex=-1,featherImpact=null,screenBreak=null;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  const audios={voice:new Audio(spec.audio?.voice||'artwork/王冠终式_游戏_v3/配音.ogg'),sfx:new Audio(spec.audio?.sfx||'artwork/王冠终式_游戏_v3/特效.ogg'),win:new Audio(spec.audio?.win||'artwork/王冠终式_游戏_v3/胜利.ogg')};
  if(spec.audio?.music)audios.music=new Audio(spec.audio.music);
  if(spec.audio?.ambience)audios.ambience=new Audio(spec.audio.ambience);
  const timelineAudio=['voice','sfx',...(audios.music?['music']:[]),...(audios.ambience?['ambience']:[])];
  const spokenCues=[
   {key:'finishVoice',at:spec.finishVoiceAt||10.65,allowed:()=>state.win},
   {key:'winVoice',at:spec.winVoiceAt||14.70,allowed:()=>state.win},
   {key:'victoryLine',at:spec.victoryLineAt||15.90,allowed:()=>state.win},
   {key:'featherVoice',at:spec.featherVoiceAt||7.94,allowed:()=>true}
  ].filter(c=>spec.audio?.[c.key]);
  for(const c of spokenCues)audios[c.key]=new Audio(spec.audio[c.key]);
  const spokenPlayed=new Set(),spokenProgress=new Map();
  const hitTimes=spec.hitTimes||[2.96,3.82,7.35,9.25];
  const riftImages=(spec.rift?.pages||[]).map(path=>{const im=new Image();pending.push({im,path});return im;});
  // Presentation clock includes hit-stop and a moving victory hold. Footage stays
  // on its original clock, so no synthetic poses or repeated damage are needed.
  function recoveryClock(clock){
   const r=spec.tailClockExtension;if(!r||clock<=r.at)return clock;
   const span=r.oldEnd-r.at;
   return clock<r.oldEnd+r.extra?r.at+(clock-r.at)*span/(span+r.extra):clock-r.extra;
  }
  function beatTime(clock=state.time){
   clock=recoveryClock(clock);
   const hold=spec.swordPauseExtension;if(!hold||clock<hold.at)return clock;
   return clock<hold.at+hold.seconds?hold.at:clock-hold.seconds;
  }
  function sourceTime(clock){
   const stop=spec.featherHitStop;
   if(stop&&clock>=stop.at&&clock<stop.at+stop.duration)return stop.source;
   const swordStop=spec.swordHitStop;
   if(swordStop&&clock>=swordStop.at&&clock<swordStop.at+swordStop.duration)return swordStop.source;
   clock=beatTime(clock);
   const r=spec.retime;if(!r)return clock;
   if(clock<r.impactAt)return clock;
   if(clock<r.impactAt+r.impactExtra)return r.impactAt-.05;
   const t=clock-r.impactExtra;
   if(t<r.poseAt)return t;
   if(r.poseMode==='stretch'){
    const end=(spec.sourceCount||spec.count)/spec.fps;
    return r.poseAt+(t-r.poseAt)*(end-r.poseAt)/(end-r.poseAt+r.poseExtra);
   }
   if(t<r.poseAt+r.poseExtra)return r.poseAt-r.poseLoopSpan*(1-Math.cos((t-r.poseAt)*Math.PI*2))/2;
   return t-r.poseExtra;
  }
  const sourceIndex=clock=>Math.min((spec.sourceCount||spec.count)-1,Math.floor((sourceTime(clock)+1e-8)*spec.fps));
  Object.values(audios).forEach(a=>{a.preload='auto';});
  function load(index,queued=false){
   if(index<0||index>=spec.pages.length)return null;
   if(cache.has(index))return cache.get(index);
   const im=new Image();cache.set(index,im);
   if(queued)pending.push({im,path:spec.pages[index]});
   else{im.onerror=()=>{state.error='演出素材加载失败';if(state.active)finish(true);};im.src=spec.pages[index];}
   return im;
  }
  load(0,true);load(1,true);
  for(const name of ['finish','win']){titles[name]=new Image();pending.push({im:titles[name],path:spec[name]});}
  const cutGhostImage=spec.cutAfterimages?new Image():null;if(cutGhostImage)pending.push({im:cutGhostImage,path:spec.cutAfterimages.path});
  const winNativeImages=(spec.winNative?.pages||[]).map(path=>{const im=new Image();pending.push({im,path});return im;});
  const rootFeatherImages=(spec.rootFeather?.pages||[]).map(path=>{const im=new Image();pending.push({im,path});return im;});
  let rootFeatherAim=null;
  const rootFeatherCanvas=document.createElement('canvas');rootFeatherCanvas.width=1280;rootFeatherCanvas.height=720;const rootFeatherCtx=rootFeatherCanvas.getContext('2d');
  const sharpFrame=spec.sharpFrame?new Image():null;if(sharpFrame)pending.push({im:sharpFrame,path:spec.sharpFrame});
  const ready=im=>!!(im&&im.complete&&im.naturalWidth);
  function warm(page){for(let i=page;i<=page+2;i++)load(i);for(const [i] of cache)if(i>1&&(i<page-1||i>page+3))cache.delete(i);}
  function volume(){
   const a=window.FrostAudio?.status,settings=a?.settings||{master:.7,voice:.9,sfx:.8,music:.25};
   let speech=0;
   for(const [start,end] of spec.music?.voiceWindows||[])speech=Math.max(speech,ease((state.time-start)/.06)*ease((end-state.time)/.15));
   for(const cue of spokenCues){const offset=state.time-cue.at,duration=audios[cue.key].duration||2;if(cue.allowed()&&offset>=0&&offset<duration+.15)speech=Math.max(speech,ease(offset/.04)*ease((duration+.15-offset)/.15));}
   let impactDuck=1;
   for(const [start,end] of spec.music?.impactWindows||[])impactDuck=Math.min(impactDuck,1-.78*ease((state.time-start)/.06)*ease((end-state.time)/.12));
   for(const [key,el] of Object.entries(audios)){
    el.muted=!!a?.muted;
    el.volume=key==='ambience'?clamp(settings.master*settings.sfx*(spec.cinematicWeather?.ambienceGain??.24)*weatherEnvelope()*(1-speech*(1-(spec.cinematicWeather?.voiceDuck??.32)))*Math.max(.25,impactDuck)*(state.win&&state.time>=(spec.victoryHeroAt||14.55)?.6:1)):key==='music'?clamp(settings.master*(settings.music??.25)*(spec.music?.gain??.7)*(1-speech*(1-(spec.music?.voiceDuck??.35)))*impactDuck):clamp(settings.master*(['voice','finishVoice','winVoice','victoryLine','featherVoice'].includes(key)?settings.voice:settings.sfx)*1.25);
   }
  }
  function audioPause(){for(const c of spokenCues){const a=audios[c.key];if(spokenPlayed.has(c.key))spokenProgress.set(c.key,Math.max(spokenProgress.get(c.key)||0,a.currentTime));}for(const a of Object.values(audios))a.pause();}
  function syncAudioClock(){
   // Atlas upload or a slow first render can leave media ahead of the fixed-step
   // game clock. Correct only meaningful drift; never seek on every frame.
   for(const key of timelineAudio){
    const a=audios[key];if(!a.paused&&a.readyState>=2&&Math.abs(a.currentTime-state.time)>.15)a.currentTime=state.time;
   }
   // Spoken syllables must never be replayed to correct media drift. Only
   // catch up forwards; atlas waits and pauses retain the furthest heard point.
   for(const c of spokenCues){const a=audios[c.key],offset=state.time-c.at;if(!a.paused&&a.readyState>=2&&offset>=0){spokenProgress.set(c.key,Math.max(spokenProgress.get(c.key)||0,a.currentTime));if(offset-a.currentTime>.20)a.currentTime=offset;}}
  }
  function audioResume(){
   if(!state.active||state.paused||state.waiting)return;
   for(const key of timelineAudio){const a=audios[key];if(Math.abs(a.currentTime-state.time)>.14)a.currentTime=state.time;a.play().catch(()=>{});}
   if(chimed&&state.time<(spec.winChimeAt||14.70)+.95)audios.win.play().catch(()=>{});
   for(const c of spokenCues){const a=audios[c.key],offset=state.time-c.at,target=Math.max(offset,a.currentTime,spokenProgress.get(c.key)||0);if(spokenPlayed.has(c.key)&&c.allowed()&&offset>=0&&target<(a.duration||2)){if(target>a.currentTime+.04)a.currentTime=target;a.play().catch(()=>{});}}
  }
  function finish(failed=false){
   if(!state.active)return;
   state.active=false;rootFeatherAim=null;audioPause();window.FrostAudio?.cinematic(false);document.body.classList.remove('crown-ult-playing');hooks.finish(failed,state);if(failed)hooks.hint(state.error||'演出素材加载失败，请刷新后重试');impact=null;featherImpact=null;screenBreak=null;swordTearPanels=null;origin=null;
  }
  function start(info){
   if(state.active)return false;
   if(!ready(load(0))){hooks.hint('王冠终式素材准备中，请稍后按 X');return false;}
   Object.assign(state,{active:true,time:0,win:false,kills:0,hits:0,combo:0,damage:0,lastHit:-100,idleTime:0,paused:false,waiting:false,error:null});origin={...info};rootFeatherAim=null;chimed=false;spokenPlayed.clear();spokenProgress.clear();impact=null;featherImpact=null;screenBreak=null;swordTearPanels=null;impactIndex=-1;
   for(const a of Object.values(audios)){a.pause();a.currentTime=0;}warm(0);volume();window.FrostAudio?.cinematic(true);document.body.classList.add('crown-ult-playing');audioResume();return true;
  }
  function setPaused(value){
   value=!!value;if(value===state.paused)return;state.paused=value;if(value)audioPause();else audioResume();
  }
  function performanceDuration(){return state.win?spec.duration:(spec.nonWinDuration||spec.duration);}
  function update(dt){
   if(!state.active||state.paused)return;
   const next=Math.min(performanceDuration(),state.time+dt),page=Math.floor(sourceIndex(next)/spec.pageFrames);warm(page);
   if(!ready(load(page))){state.waiting=true;audioPause();return;}
   if(state.waiting){state.waiting=false;audioResume();}
   const previous=state.time;state.time=next;volume();syncAudioClock();
   for(const [i,t] of hitTimes.entries())if(previous<t&&next>=t){
    const result=hooks.hit(i)||{};state.hits++;state.kills+=result.kills||0;
    if(result.targets>0){state.combo+=result.targets;state.damage+=result.damage||0;state.lastHit=state.time;}
    if(i===hitTimes.length-1&&result.kills>0&&result.remaining===0)state.win=true;
   }
   hooks.animate(dt,state.time);
   state.idleTime=spec.returnGhost?Math.max(0,state.time-(spec.duration-.8)):0;
   if(state.win&&!chimed&&state.time>=(spec.winChimeAt||14.70)){chimed=true;audios.win.currentTime=0;audios.win.play().catch(()=>{});}
   for(const c of spokenCues)if(!spokenPlayed.has(c.key)&&state.time>=c.at){spokenPlayed.add(c.key);const a=audios[c.key],offset=state.time-c.at;if(c.allowed()&&offset<(a.duration||2)){a.currentTime=offset;a.play().catch(()=>{});}}
   if(state.time>=performanceDuration())finish();
  }
  function view(){
   const k=ease(state.time/.65)*ease((performanceDuration()-state.time)/1.05),z=1+.45*k,sx=origin.screenX;
   const desired=origin.facing<0?978:302;
   // Keep the rendered battlefield covering the viewport even at world boundaries.
   const x=clamp(sx+(desired-sx)*k,1280-1280*z+sx*z,sx*z),y=origin.y+(622-origin.y)*k;
   return {x,y,z,scale:origin.height/270*z,flip:origin.facing>0?-1:1};
  }
  function screenShake(){
   if(hooks.reduced())return {x:0,y:0};
   const beats=[hitTimes[0],hitTimes[1],spec.swordHitStop?.at||hitTimes[2],hitTimes[3]],powers=[2.5,3,4,5],lengths=[.18,.20,.24,.26];
   let x=0,y=0;
   for(let i=0;i<beats.length;i++){const age=state.time-beats[i];if(age<0||age>lengths[i])continue;const p=powers[i]*Math.pow(1-age/lengths[i],2);x+=Math.sin(age*115+1.3)*p;y+=Math.cos(age*93+.7)*p*.46;}
   for(const [i,stop] of [spec.swordHitStop,spec.featherHitStop].entries()){
    if(!stop)continue;const age=state.time-stop.at;
    if(age>=0&&age<stop.duration){const p=(i?1.1:.85)*(.45+.55*Math.exp(-age*2));x+=Math.sin(age*181+2.1)*p;y+=Math.cos(age*157+.6)*p*.55;}
   }
   return {x,y};
  }
  function beginWorld(ctx){if(!state.active)return;const v=view(),j=screenShake();ctx.save();ctx.translate(v.x+j.x,v.y+j.y);ctx.scale(v.z,v.z);ctx.translate(-origin.screenX,-origin.y);}
  function endWorld(ctx){if(state.active)ctx.restore();}
  function plane(ctx,fn){const v=view();ctx.save();ctx.translate(v.x,v.y);ctx.scale(v.scale*v.flip,v.scale);ctx.translate(-978,-622);fn();ctx.restore();}
  function actorPlane(ctx,fn,t){
   if(state.win&&spec.winLayout&&t>=spec.winActorStartSource){
    const p=spec.winLayout;ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.scale,p.scale);ctx.translate(-978,-622);fn();ctx.restore();
   }else plane(ctx,fn);
  }
  function title(ctx,name,opacity,scale=1){const im=titles[name];if(!ready(im))return;ctx.save();ctx.globalAlpha=opacity;const w=1100*scale,h=480*scale,y=name==='win'&&spec.winLayout?spec.winLayout.titleY:305;ctx.drawImage(im,640-w/2,y-h/2,w,h);ctx.restore();}
  const titleShine=new Map();
  function animatedTitle(ctx,name){
   const timing=spec.titleEffects?.[name];if(!timing)return;
   const clock=state.time,age=clock-timing.start,left=timing.end-clock,im=titles[name];
   if(age<=0||left<=0||!ready(im))return;
   const opacity=ease(age/.075)*ease(left/.12),enter=clamp(age/timing.enter),exit=clamp(1-left/timing.exit);
   if(hooks.reduced()){title(ctx,name,opacity);return;}
   const cy=name==='win'?(spec.winLayout?.titleY||205):305;
   const settle=1-Math.pow(1-enter,3),scale=1+(name==='finish'?.55:.38)*(1-settle);
   const w=1100*scale,h=480*scale,x=640-w/2,y=cy-h/2;
   ctx.save();
   // A short, visible ice shockwave precedes the readable title. It fades
   // before the steady hold, rather than leaving glare over the actor.
   if(enter<1){
    const pulse=Math.sin(Math.PI*enter)*opacity;
    const halo=ctx.createRadialGradient(640,cy,25,640,cy,570);
    halo.addColorStop(0,'rgba(202,253,255,.55)');halo.addColorStop(.46,'rgba(34,144,229,.35)');halo.addColorStop(1,'rgba(0,48,116,0)');
    ctx.globalAlpha=pulse;ctx.fillStyle=halo;ctx.fillRect(0,0,1280,720);
    ctx.strokeStyle='#c9faff';ctx.lineWidth=4;ctx.shadowColor='#5ad7ff';ctx.shadowBlur=18;
    ctx.beginPath();ctx.ellipse(640,cy,120+enter*480,25+enter*135,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
   }
   if(exit>0){
    // Separate the actual alpha image into ice-like slivers, preserving all
    // lettering. No pixel readback or new timer, so file:// and seeking work.
    for(let k=0;k<12;k++){
     const q=ease(clamp((exit-k%3*.05)/.9)),dx=(k-5.5)*39*q,dy=Math.sin(k*1.7)*85*q;
     ctx.shadowColor='#9decff';ctx.shadowBlur=15*(1-q);ctx.globalAlpha=opacity*(1-q);ctx.drawImage(im,k*im.naturalWidth/12,0,im.naturalWidth/12,im.naturalHeight,x+k*w/12+dx,y+dy,w/12+.25,h);
    }
    ctx.shadowBlur=0;
   }else{
    if(enter<.85)for(let k=4;k>=1;k--)title(ctx,name,opacity*(1-enter)*.22,scale+k*.055);
    ctx.save();const reveal=ease(age/(timing.enter*.62));ctx.beginPath();ctx.rect(640-w*reveal/2,0,w*reveal,720);ctx.clip();title(ctx,name,opacity,scale);ctx.restore();
    const sweep=(age-.08)/.60;
    if(sweep>0&&sweep<1){
     if(!titleShine.has(name)){
      const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const g=c.getContext('2d');g.drawImage(im,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);titleShine.set(name,c);
     }
     const sx=-150+sweep*1580;ctx.save();ctx.globalAlpha=opacity*Math.sin(sweep*Math.PI);ctx.shadowColor='#c1f8ff';ctx.shadowBlur=18;
     ctx.beginPath();ctx.moveTo(sx-80,cy-230);ctx.lineTo(sx+40,cy-230);ctx.lineTo(sx+220,cy+230);ctx.lineTo(sx+100,cy+230);ctx.closePath();ctx.clip();ctx.drawImage(titleShine.get(name),x,y,w,h);ctx.restore();
    }
   }
   const burst=age<.80?age/.80:exit>0?exit:-1;
   if(burst>=0){
    for(let k=0;k<42;k++){
     const side=k%2?1:-1,px=640+side*(230+noise(k+31)*240+burst*(80+noise(k+73)*160));
     const py=cy+(noise(k+150)-.5)*(150+burst*190);
     ctx.save();ctx.translate(px,py);iceShard(ctx,k+300,8+noise(k+101)*24,k+burst*2,k+burst*3,opacity*Math.sin(Math.PI*burst));ctx.restore();
    }
    ctx.globalAlpha=opacity*Math.sin(Math.PI*burst)*.9;ctx.strokeStyle='#d4faff';ctx.lineWidth=4;ctx.shadowColor='#74d9ff';ctx.shadowBlur=12;
    for(let side of [-1,1]){ctx.beginPath();ctx.moveTo(640+side*80,cy);ctx.lineTo(640+side*(260+burst*350),cy);ctx.stroke();}
   }
   ctx.restore();
  }
  const frozenTitle=document.createElement('canvas');frozenTitle.width=420;frozenTitle.height=105;
  {
   const c=frozenTitle.getContext('2d');c.font='900 46px Microsoft YaHei, sans-serif';c.textBaseline='alphabetic';
   const fill=c.createLinearGradient(0,12,0,78);fill.addColorStop(0,'#fff');fill.addColorStop(.28,'#e8ffff');fill.addColorStop(.58,'#66bde6');fill.addColorStop(.74,'#c9faff');fill.addColorStop(1,'#247db6');
   c.shadowColor='#60ccff';c.shadowBlur=14;c.strokeStyle='#0a4776';c.lineWidth=6;c.lineJoin='round';c.strokeText('王冠终式',16,66);
   c.fillStyle=fill;c.fillText('王冠终式',16,66);c.shadowBlur=0;c.strokeStyle='#e9ffff';c.lineWidth=1.2;c.strokeText('王冠终式',16,66);
   // Hairline fractures and snow specks are clipped to the four glyphs.
   c.globalCompositeOperation='source-atop';c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=.8;
   for(let k=0;k<12;k++){const x=22+k*15;c.beginPath();c.moveTo(x,16+k%4*4);c.lineTo(x+6,37);c.lineTo(x-2,44);c.lineTo(x+9,68);c.stroke();}
   for(let k=0;k<65;k++){c.fillStyle=k%3?'rgba(230,255,255,.5)':'rgba(40,130,190,.4)';c.fillRect(18+(k*47)%188,20+(k*29)%50,1+k%2,1);}
   c.globalCompositeOperation='source-over';
  }
  function icyCutInTitle(ctx,x,y){
   ctx.drawImage(frozenTitle,x-16,y-66);
   ctx.save();ctx.strokeStyle='rgba(198,246,255,.75)';ctx.lineWidth=1;
   for(let k=0;k<7;k++){const px=x+12+k*29,py=y+5+(k%3)*3;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+3,py+7);ctx.lineTo(px+6,py);ctx.stroke();}
   ctx.restore();
  }
  function iceBlock(ctx,x,y,size,angle,alpha){
   ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;
   ctx.shadowColor='#70caff';ctx.shadowBlur=7;ctx.strokeStyle='#e7fbff';ctx.lineWidth=1.5;
   ctx.fillStyle='#6ab6ed';ctx.beginPath();ctx.moveTo(-size*.7,-size*.4);ctx.lineTo(size*.3,-size);ctx.lineTo(size*.85,size*.12);ctx.lineTo(-size*.2,size*.8);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.shadowBlur=0;ctx.fillStyle='#c3f4ff';ctx.beginPath();ctx.moveTo(-size*.7,-size*.4);ctx.lineTo(size*.3,-size);ctx.lineTo(size*.15,size*.02);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#daf9ff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-size*.2,size*.8);ctx.lineTo(size*.15,size*.02);ctx.lineTo(size*.85,size*.12);ctx.stroke();ctx.restore();
  }
  function swordIce(ctx,t,landingAge=null){
   const motion=spec.swordMotion||{start:6.35,travelSeconds:.70};
   if(t>motion.start&&t<7.13){
    const p=Math.pow(clamp((t-motion.start)/motion.travelSeconds),1.45),cx=1120-730*p,cy=-280+660*p,fade=ease((t-motion.start)/.035);
    for(let k=0;k<32;k++){
     const along=(k/31-.5)*690,side=(k%2?1:-1)*(27+(k*19)%47),age=(t*2+k*.137)%1;
     const x=cx-.72*along+.69*side+age*28,y=cy+.69*along+.72*side-age*52;
     ctx.save();ctx.strokeStyle=`rgba(160,226,255,${fade*.35})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+22,y-27);ctx.lineTo(x,y);ctx.stroke();ctx.restore();
     iceBlock(ctx,x,y,7+(k*11)%15,k*.81+t*(k%2?2:-2),fade*(.48+.45*(1-age)));
    }
   }
   if(landingAge!==null&&landingAge>=0&&landingAge<.85){
    const age=landingAge,fade=clamp((.85-age)/.65);
    for(let k=0;k<34;k++){
     const a=-Math.PI+.12+(k/33)*(Math.PI-.24),speed=170+(k*47)%340;
     const x=150+Math.cos(a)*speed*age,y=610+Math.sin(a)*speed*age+230*age*age;
     iceBlock(ctx,x,y,10+(k*7)%19,k*.63+age*(k%2?4:-4),fade*.9);
    }
   }
  }
  function drawCombo(ctx,t){
   if(!state.combo||t>13.1)return;
   const fade=ease((13.1-t)/.35),age=state.time-state.lastHit,pop=1+.22*Math.exp(-Math.max(0,age)*15);
   ctx.save();ctx.translate(1214,255);ctx.scale(pop,pop);ctx.globalAlpha=fade;ctx.textAlign='right';
   ctx.shadowColor='#00112d';ctx.shadowBlur=10;ctx.lineJoin='round';ctx.strokeStyle='#082b50';ctx.lineWidth=5;
   ctx.font='bold 17px Georgia, serif';ctx.fillStyle='#75d4ff';ctx.strokeText('C O M B O',0,-53);ctx.fillText('C O M B O',0,-53);
   ctx.font='italic bold 70px Arial, sans-serif';
   const gradient=ctx.createLinearGradient(0,-48,0,5);gradient.addColorStop(0,'#75d4ff');gradient.addColorStop(.5,'#4ab8ff');gradient.addColorStop(1,'#258eea');
   ctx.fillStyle=t>=7.22&&t<7.35?'#75d4ff':gradient;ctx.strokeText(String(state.combo),0,10);ctx.fillText(String(state.combo),0,10);
   ctx.font='bold 17px Georgia, serif';ctx.fillStyle='#4ab8ff';const damage=Math.round(state.damage)+'  DAMAGE';ctx.strokeText(damage,0,42);ctx.fillText(damage,0,42);
   ctx.shadowBlur=0;ctx.strokeStyle='#a2e3ff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-160,54);ctx.lineTo(0,54);ctx.stroke();ctx.restore();
  }
  function cutAfterimage(ctx,t,front){
   const settings=spec.cutAfterimages;if(!settings)return;
   for(let j=0;j<settings.cuts.length;j++){
    const age=t-settings.cuts[j],duration=settings.duration||.34;
    if(age<0||age>=duration)continue;
    const q=age/duration,fade=Math.pow(1-q,1.4);
    ctx.save();
    if(!front&&ready(cutGhostImage)){
     const copies=hooks.reduced()?1:2;
     for(let k=copies;k>=1;k--){
      ctx.save();ctx.translate(k*(6+q*20),-q*6);ctx.globalAlpha=fade*(k===1?.30:.13);ctx.shadowColor='#63d9ff';ctx.shadowBlur=hooks.reduced()?0:8;
      ctx.drawImage(cutGhostImage,j*settings.width,0,settings.width,settings.height,0,0,1280,720);ctx.restore();
     }
    }
    if(front){
     const points=settings.seeds[j],count=hooks.reduced()?10:points.length;
     ctx.globalCompositeOperation='lighter';
     for(let k=0;k<count;k++){
      const p=points[k],life=.24+noise(k+j*100+31001)*.10,u=age/life;if(u>=1)continue;
      const x=p[0]+age*(24+noise(k+31101)*86),y=p[1]-age*(18+noise(k+31201)*55),size=.8+noise(k+31301)*1.8;
      ctx.globalAlpha=Math.pow(1-u,1.3)*.72;ctx.fillStyle=k%5?'#e4faff':'#83ddff';ctx.beginPath();
      if(k%5===0){ctx.moveTo(x,y-size*2.8);ctx.lineTo(x+size,y);ctx.lineTo(x,y+size*2.8);ctx.lineTo(x-size,y);ctx.closePath();}else ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();
     }
    }
    ctx.restore();
   }
  }
  function returnSnow(ctx,index,im,q){
   if(q<=0)return;
   const ghost=document.createElement('canvas');ghost.width=640;ghost.height=360;const gc=ghost.getContext('2d');
   gc.drawImage(im,index%spec.pageFrames%spec.cols*spec.frameWidth,Math.floor(index%spec.pageFrames/spec.cols)*spec.frameHeight,spec.frameWidth,spec.frameHeight,0,0,640,360);
   gc.globalCompositeOperation='source-atop';gc.fillStyle='#a4edff';gc.fillRect(0,0,640,360);
   plane(ctx,()=>{
    for(let k=1;k<=2;k++){ctx.save();ctx.translate((origin.facing>0?1:-1)*k*22*q,-k*9*q);ctx.globalAlpha=(1-q)*.28/k;ctx.drawImage(ghost,0,0,1280,720);ctx.restore();}
    for(let k=0;k<42;k++){
     const start=(k*.193)%1,age=clamp((q-start*.45)/.55),alpha=Math.sin(Math.PI*age);
     if(alpha<=0)continue;
     const x=955+(k*37)%110+age*(60+(k*13)%70),y=610-(k*43)%240-age*(30+k%5*12);
     ctx.save();ctx.globalAlpha=alpha*.8;ctx.strokeStyle='#dcfaff';ctx.lineWidth=1.3;const s=2+k%4;
     ctx.beginPath();ctx.moveTo(x-s,y);ctx.lineTo(x+s,y);ctx.moveTo(x,y-s);ctx.lineTo(x,y+s);ctx.stroke();ctx.restore();
    }
   });
  }
  const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  function iceShard(ctx,key,size,angle,turn,alpha){
   // Thin irregular plates: a bright rim and faint internal fractures, rather
   // than opaque chunks. Analytic motion also works when scrubbing backwards.
   const pts=[];
   for(let j=0;j<5;j++){const a=j*Math.PI*2/5,r=size*(.45+noise(key*9+j+30)*.65);pts.push([Math.cos(a)*r,Math.sin(a)*r]);}
   ctx.save();ctx.rotate(angle);ctx.scale(.08+.92*Math.abs(Math.cos(turn)),1);ctx.globalAlpha=alpha;
   const fill=ctx.createLinearGradient(-size,-size,size,size);
   fill.addColorStop(0,'rgba(226,255,255,.55)');fill.addColorStop(.43,'rgba(128,223,239,.08)');fill.addColorStop(.72,'rgba(191,253,255,.35)');fill.addColorStop(1,'rgba(71,175,203,.12)');
   ctx.fillStyle=fill;ctx.strokeStyle='#b9faff';ctx.lineWidth=1.1;ctx.shadowColor='#a6f7ff';ctx.shadowBlur=4;
   ctx.beginPath();pts.forEach((p,j)=>j?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
   ctx.strokeStyle='rgba(225,255,255,.65)';ctx.lineWidth=.65;
   ctx.beginPath();ctx.moveTo(...pts[0]);ctx.lineTo(size*.08,size*.04);ctx.lineTo(...pts[2]);ctx.moveTo(...pts[4]);ctx.lineTo(size*.08,size*.04);ctx.lineTo(...pts[1]);ctx.stroke();ctx.restore();
  }
  function slashFrost(ctx,t){
   for(const [which,hit] of [2.96,3.82].entries()){
    const age=t-hit;if(age<-.20||age>1.0)continue;
    const point=u=>({x:1080-985*u,y:which===0?615-530*u-165*Math.sin(Math.PI*u):90+535*u+155*Math.sin(Math.PI*u)});
    ctx.save();
    // A frost ribbon fills the swept region; its grain travels along the cut.
    const samples=64;
    for(let j=0;j<samples;j++){
     const u=(j+.5)/samples,local=age-(-.20+u*.34);
     if(local<0||local>.84)continue;
     const life=ease(local/.035)*(1-ease((local-.24)/.60));
     const p=point(u),prev=point(Math.max(0,u-.008)),next=point(Math.min(1,u+.008));
     const dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
     const width=(13+20*Math.pow(Math.sin(Math.PI*u),.6))*(.8+noise(j+which*400+610)*.4);
     const w0=width*(.8+noise(j+700)*.4),w1=width*(.8+noise(j+800)*.4);
     ctx.globalAlpha=life*(.16+noise(j+900)*.12);ctx.fillStyle=j%3?'#bcecff':'#f0fcff';
     ctx.beginPath();ctx.moveTo(prev.x+nx*w0,prev.y+ny*w0);ctx.lineTo(next.x+nx*w1,next.y+ny*w1);ctx.lineTo(next.x-nx*w1*.7,next.y-ny*w1*.7);ctx.lineTo(prev.x-nx*w0*.7,prev.y-ny*w0*.7);ctx.closePath();ctx.fill();
     if(j%3===0){
      ctx.globalAlpha=life*.55;ctx.strokeStyle='#e4faff';ctx.lineWidth=.9;
      ctx.beginPath();ctx.moveTo(p.x-nx*width*.7,p.y-ny*width*.7);ctx.lineTo(p.x+dx*1.6,p.y+dy*1.6);ctx.lineTo(p.x+nx*width,p.y+ny*width);ctx.stroke();
     }
    }
    if(!hooks.reduced())for(let j=0;j<34;j++){
     const u=(noise(j+which*100+2010)+(age+.20)*1.15)%1,local=age-(-.20+u*.34);
     if(local<0||local>.68)continue;
     const p=point(u),tail=point(Math.max(0,u-.018-noise(j+2201)*.025));
     const side=(noise(j+2301)-.5)*28,dx=p.x-tail.x,dy=p.y-tail.y,len=Math.hypot(dx,dy)||1;
     ctx.globalAlpha=(1-ease(local/.68))*.66;ctx.strokeStyle=j%3?'#f2fcff':'#8bd9f5';ctx.lineWidth=.8+noise(j+2501)*1.4;
     ctx.beginPath();ctx.moveTo(tail.x-dy/len*side,tail.y+dx/len*side);ctx.lineTo(p.x-dy/len*side,p.y+dx/len*side);ctx.stroke();
    }
    ctx.globalAlpha=1;
    const count=hooks.reduced()?16:62;
    for(let k=0;k<count;k++){
     const u=(k+.5)/count,born=-.18+u*.32,life=.32+noise(k+which*300)*.24,a=age-born;
     if(a<0||a>life)continue;
     const p=point(u),q=a/life,side=k%2?1:-1,spread=30+noise(k+321)*100;
     const x=p.x+side*a*spread,y=p.y+a*(22+noise(k+431)*110)+a*a*120;
     const alpha=ease(a/.025)*Math.pow(1-q,1.3)*.85;
     ctx.save();ctx.translate(x,y);
     if(k%3===0)iceShard(ctx,22000+which*200+k,3+noise(k+711)*7,k+a*side*4,k+a*3,alpha);
     else{ctx.globalAlpha=alpha;ctx.fillStyle='#e9fcff';ctx.beginPath();ctx.arc(0,0,.7+noise(k+813)*1.6,0,Math.PI*2);ctx.fill();}
     ctx.restore();
    }
    ctx.restore();
   }
  }
  function enemiesInFront(){const t=sourceTime(state.time);return state.active&&(t<2.3||(t>=7.35&&t<12.9));}
  function hitStopFractures(ctx){
   if(!spec.hitStopFractures||hooks.reduced())return;
   for(const [index,stop] of [spec.swordHitStop,spec.featherHitStop].entries()){
    if(!stop)continue;const age=state.time-stop.at;if(age<.08||age>=stop.duration)continue;
    const grow=ease((age-.08)/(stop.duration*.65)),cx=origin.facing>0?690:590,cy=390;
    ctx.save();ctx.globalAlpha=.24+.11*Math.sin(age*19);ctx.strokeStyle='#ddf7ff';ctx.lineWidth=1.1;
    for(let k=0;k<(index?8:5);k++){
     const a=k*Math.PI*2/(index?8:5)+.15,r=(230+noise(k+9211)*450)*grow;
     ctx.beginPath();ctx.moveTo(cx,cy);
     for(let j=1;j<=7;j++){const d=r*j/7,side=(noise(k*9+j+9331)-.5)*35;ctx.lineTo(cx+Math.cos(a)*d-Math.sin(a)*side,cy+Math.sin(a)*d*.7+Math.cos(a)*side);}
     ctx.stroke();
    }
    ctx.restore();
   }
  }
  let swordTearPanels=null;
  function swordScreenTear(ctx){
   const settings=spec.swordScreenTear;if(!settings)return;
   const age=state.time-settings.at,duration=settings.duration||.85;
   if(age<0||age>duration)return;
   const progress=ease(age/(settings.sweepDuration||.07)),front=-80+1440*progress;
   const points=[];for(let x=-80;x<=1360;x+=24)points.push([x,20+x*.53+(noise(x+631)-.5)*15]);
   if(!swordTearPanels){
    const source=impact||document.createElement('canvas');
    if(!impact){source.width=1280;source.height=720;source.getContext('2d').drawImage(ctx.canvas,0,0,1280,720);}
    const panels=[];
    for(const side of [-1,1]){
     const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
     g.beginPath();g.moveTo(-90,side<0?-90:810);g.lineTo(1370,side<0?-90:810);
     for(let i=points.length-1;i>=0;i--)g.lineTo(...points[i]);g.closePath();g.clip();g.drawImage(source,0,0);panels.push({side,image:c});
    }
    const chips=[];
    for(let k=0;k<24;k++){
     const x=35+k*53,y=20+x*.53,w=30+noise(k+441)*28,h=32+noise(k+481)*50,bx=Math.floor(x-w),by=Math.floor(y-h);
     const c=document.createElement('canvas');c.width=Math.ceil(w*2+3);c.height=Math.ceil(h*2+3);const g=c.getContext('2d');
     g.beginPath();g.moveTo(w*.12,0);g.lineTo(w*2,h*.7);g.lineTo(w*1.6,h*2);g.lineTo(0,h*1.2);g.closePath();g.save();g.clip();g.drawImage(source,bx,by,c.width,c.height,0,0,c.width,c.height);g.restore();g.strokeStyle='#c6f6ff';g.lineWidth=1.4;g.stroke();
     chips.push({image:c,x,y,bx,by,key:k,side:k%2?1:-1});
    }
    swordTearPanels={panels,chips};
   }
   const open=1-Math.pow(1-clamp((age-.02)/.58),3),fade=1-ease((age-.20)/.58),normal=[-.468,.884];
   ctx.save();
   if(!hooks.reduced())for(const panel of swordTearPanels.panels){
    const side=panel.side,distance=(settings.openPixels||390)*open;
    ctx.save();ctx.translate(640+normal[0]*side*distance,360+normal[1]*side*distance);ctx.rotate(side*open*.085);ctx.globalAlpha=fade;
    ctx.drawImage(panel.image,-640,-360);
    // The luminous torn edge stays attached to the moving image slab.
    ctx.translate(-640,-360);ctx.beginPath();ctx.rect(-100,-100,Math.max(0,front)+100,920);ctx.clip();
    ctx.shadowColor='#50caff';ctx.shadowBlur=18;ctx.strokeStyle='#8ee7ff';ctx.lineWidth=5;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle='#f1ffff';ctx.lineWidth=1.8;ctx.stroke();ctx.restore();
   }
   ctx.save();ctx.globalAlpha=(1-ease(age/.22))*.85;ctx.beginPath();ctx.rect(0,0,Math.max(0,front),720);ctx.clip();
   ctx.shadowColor='#36bfff';ctx.shadowBlur=24;ctx.strokeStyle='#b3f3ff';ctx.lineWidth=5;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.restore();
   if(!hooks.reduced())for(const p of swordTearPanels.chips){
    const u=Math.max(0,age-.035),side=p.side,speed=320+noise(p.key+711)*430;
    const dx=normal[0]*side*speed*u+Math.sin(p.key)*u*95,dy=normal[1]*side*speed*u+180*u*u;
    ctx.save();ctx.globalAlpha=1-ease((age-.28)/.52);ctx.translate(p.x+dx,p.y+dy);ctx.rotate(side*u*(1.1+noise(p.key+761)*2));ctx.scale(Math.max(.12,Math.abs(Math.cos(u*2.4))),1-u*.18);ctx.drawImage(p.image,p.bx-p.x,p.by-p.y);ctx.restore();
   }
   ctx.restore();
  }
  function wholeScreenShatter(ctx){
   const effect=spec.screenShatter;if(!effect)return;
   const age=state.time-effect.at;if(age<0||age>effect.duration)return;
   if(hooks.reduced()){if(featherImpact){ctx.save();ctx.globalAlpha=1-ease(age/.25);ctx.drawImage(featherImpact,0,0);ctx.restore();}return;}
   if(!screenBreak){
    const source=featherImpact||document.createElement('canvas');
    if(!featherImpact){source.width=1280;source.height=720;const g=source.getContext('2d');g.filter='grayscale(1) contrast(4)';g.drawImage(ctx.canvas,0,0,1280,720);}
    const cx=origin.facing>0?690:590,cy=390,seeds=[];
    for(let y=0;y<5;y++)for(let x=0;x<8;x++){const k=y*8+x;seeds.push([x*160+80+(noise(k+8201)-.5)*105,y*144+72+(noise(k+8301)-.5)*95]);}
    for(let k=0;k<12;k++){const a=k*Math.PI*2/12,r=40+noise(k+8501)*110;seeds.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}
    screenBreak=[];
    for(let k=0;k<seeds.length;k++){
     const p=seeds[k];let poly=[[0,24],[1280,24],[1280,696],[0,696]];
     for(let j=0;j<seeds.length&&poly.length;j++){
      if(j===k)continue;const q=seeds[j],a=q[0]-p[0],b=q[1]-p[1],c=(q[0]*q[0]+q[1]*q[1]-p[0]*p[0]-p[1]*p[1])/2,next=[];
      for(let i=0;i<poly.length;i++){
       const u=poly[i],v=poly[(i+1)%poly.length],du=a*u[0]+b*u[1]-c,dv=a*v[0]+b*v[1]-c;
       if(du<=0)next.push(u);
       if((du<=0)!==(dv<=0)){const f=du/(du-dv);next.push([u[0]+(v[0]-u[0])*f,u[1]+(v[1]-u[1])*f]);}
      }
      poly=next;
     }
     if(poly.length<3)continue;
     const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),bx=Math.floor(Math.min(...xs))-2,by=Math.floor(Math.min(...ys))-2,w=Math.ceil(Math.max(...xs))-bx+3,h=Math.ceil(Math.max(...ys))-by+3;
     const tile=document.createElement('canvas');tile.width=w;tile.height=h;const g=tile.getContext('2d');
     g.beginPath();poly.forEach((p,i)=>i?g.lineTo(p[0]-bx,p[1]-by):g.moveTo(p[0]-bx,p[1]-by));g.closePath();g.save();g.clip();g.drawImage(source,bx,by,w,h,0,0,w,h);g.restore();
     g.strokeStyle='#b4eeff';g.lineWidth=1.6;g.stroke();
     const x=xs.reduce((a,b)=>a+b)/xs.length,y=ys.reduce((a,b)=>a+b)/ys.length,r=Math.hypot(x-cx,y-cy)||1;
     screenBreak.push({tile,bx,by,x,y,r,ux:(x-cx)/r,uy:(y-cy)/r,key:k});
    }
   }
   for(const p of screenBreak){
    const k=p.key,u=Math.max(0,age-Math.min(.075,p.r/900*.075)),speed=160+noise(k+8701)*520;
    const dx=p.ux*speed*u*(1+u*.5),dy=p.uy*speed*u*.7+320*u*u;
    ctx.save();ctx.globalAlpha=1-ease((u-.22)/.65);ctx.translate(p.x+dx,p.y+dy);ctx.rotate((noise(k+8801)-.5)*u*2.6);
    ctx.scale(Math.max(.08,Math.abs(Math.cos(u*(1.2+noise(k+8901)*2.4)))),1-u*.15);ctx.drawImage(p.tile,p.bx-p.x,p.by-p.y);ctx.restore();
   }
  }
  function featherShatter(ctx){
   const stop=spec.featherHitStop;if(!stop)return;
   const age=state.time-stop.at-stop.duration;if(age<0||age>1.55)return;
   const fade=ease((1.55-age)/.55),cx=origin.facing>0?690:590,cy=390;
   const count=hooks.reduced()?64:150;
   for(let k=0;k<count;k++){
    const a=noise(k+901)*Math.PI*2,speed=180+noise(k+971)*750,r=40+speed*(1-Math.exp(-age*2.6));
    const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.6+age*age*85;
    const big=k<24,size=big?20+noise(k+812)*27:4+noise(k+812)*17;
    ctx.save();ctx.translate(x,y);
    if(age<.45){ctx.globalAlpha=fade*(1-age/.45)*.50;ctx.strokeStyle='#d2f7ff';ctx.lineWidth=big?2:1;ctx.beginPath();ctx.moveTo(-Math.cos(a)*size*2.7,-Math.sin(a)*size*1.6);ctx.lineTo(0,0);ctx.stroke();}
    iceShard(ctx,k+100,size,a+age*(noise(k+771)-.5)*5,k+age*4,fade*(.5+noise(k+633)*.4));ctx.restore();
   }
   ctx.save();ctx.fillStyle='#e6fcff';
   for(let k=0;k<(hooks.reduced()?40:110);k++){
    const a=noise(k+3101)*Math.PI*2,r=35+(220+noise(k+3903)*610)*(1-Math.exp(-age*3));
    const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.63+age*age*70;
    ctx.globalAlpha=fade*(.3+noise(k+3201)*.55);ctx.fillRect(x,y,1+noise(k+3501)*2,1+noise(k+3501)*2);
   }
   ctx.restore();
  }
  function inkImpactLines(ctx,cx,cy){
   ctx.save();ctx.strokeStyle='rgba(255,255,255,.72)';ctx.lineWidth=1.3;
   for(let k=0;k<27;k++){
    const a=k*Math.PI*2/27+.04,r1=95+noise(k+152)*85,r2=310+noise(k+205)*430;
    ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1*.7);
    ctx.lineTo(cx+Math.cos(a+.02)*r2*.65,cy+Math.sin(a+.02)*r2*.65*.7);
    ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2*.7);ctx.stroke();
   }
   ctx.restore();
  }
  function victoryBackdrop(ctx){
   if(!state.win)return 0;
   const clock=beatTime(),age=clock-13,opacity=ease(age/.35)*ease((spec.duration-state.time)/.8);
   if(opacity<=0)return 0;
   ctx.save();ctx.globalAlpha=opacity;
   const sky=ctx.createLinearGradient(0,0,0,720);sky.addColorStop(0,'#4c7687');sky.addColorStop(.58,'#8db3c0');sky.addColorStop(1,'#f1fcff');ctx.fillStyle=sky;ctx.fillRect(0,0,1280,720);
   const mist=ctx.createRadialGradient(700,730,30,700,730,750);mist.addColorStop(0,'rgba(255,255,255,.85)');mist.addColorStop(1,'rgba(227,250,255,0)');ctx.fillStyle=mist;ctx.fillRect(0,0,1280,720);
   for(let k=0;k<48;k++){
    const x=noise(k+1)*1380-50+Math.sin(age*.37+k)*38,y=((noise(k+71)*950-age*(8+noise(k+17)*17))%850+850)%850-60;
    const size=11+noise(k+31)*36;
    ctx.save();ctx.translate(x,y);
    iceShard(ctx,k,size,k*1.7+age*(.06+noise(k+48)*.13),age*.65+k,opacity*(.35+noise(k+22)*.35));ctx.restore();
   }
   ctx.restore();return opacity;
  }
  function victorySnow(ctx,opacity){
   if(opacity<=0)return;
   const age=beatTime()-13;
   ctx.save();ctx.fillStyle='#f5ffff';ctx.strokeStyle='#efffff';
   for(let k=0;k<100;k++){
    const depth=noise(k+200),size=1+depth*3,x=(noise(k+312)*1380+age*(8+depth*14)+Math.sin(age*.65+k)*20)%1380-50;
    const y=(noise(k+441)*850+age*(24+depth*48))%850-55;
    ctx.globalAlpha=opacity*(.22+depth*.52);ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();
    if(k%9===0){ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x-size*2,y);ctx.lineTo(x+size*2,y);ctx.moveTo(x,y-size*2);ctx.lineTo(x,y+size*2);ctx.stroke();}
   }
   ctx.restore();
  }
  function heroFrost(ctx,t,front){
   const intensity=ctx.globalAlpha*ease(state.time/.45)*ease((spec.duration-state.time)/.35);
   if(intensity<=0)return;
   ctx.save();
   // Independent short-lived flakes: no filled aura, orbit or continuous outline.
   const count=hooks.reduced()?8:26;
   for(let k=0;k<count;k++){
    if((k%3===0)!==!front)continue;
    const q=(noise(k+6301)+state.time*(.20+noise(k+6331)*.15))%1;
    const x=866+noise(k+6401)*190+q*(18+noise(k+6411)*35),y=331+q*290;
    if(x>947&&x<1007&&y<427)continue;
    ctx.globalAlpha=intensity*Math.sin(Math.PI*q)*(.22+noise(k+6501)*.32);
    ctx.fillStyle=k%4?'#effcff':'#b8eaff';ctx.shadowBlur=0;
    const size=.65+noise(k+6571)*1.25;
    ctx.beginPath();
    if(k%4===0){ctx.moveTo(x,y-size*2);ctx.lineTo(x+size,y);ctx.lineTo(x,y+size*2);ctx.lineTo(x-size,y);ctx.closePath();}
    else ctx.arc(x,y,size,0,Math.PI*2);
    ctx.fill();
   }
   if(front)for(let k=0;k<4;k++){
    const pulse=Math.pow(Math.max(0,Math.sin(state.time*3.6+k*2.3)),12),x=[959,1004,932,1016][k],y=[362,374,461,519][k];
    ctx.globalAlpha=intensity*pulse*.5;ctx.strokeStyle='#efffff';ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();
   }
   ctx.restore();
  }
  let iceCornerMist=null;
  function cornerFrostMist(ctx,opacity,hold){
   if(!iceCornerMist){
    iceCornerMist=document.createElement('canvas');iceCornerMist.width=320;iceCornerMist.height=230;
    const g=iceCornerMist.getContext('2d');g.save();g.scale(1.35,1);
    const frost=g.createRadialGradient(0,0,0,0,0,205);
    frost.addColorStop(0,'rgba(235,251,255,.67)');frost.addColorStop(.30,'rgba(219,245,255,.39)');frost.addColorStop(.68,'rgba(216,244,255,.12)');frost.addColorStop(1,'rgba(226,249,255,0)');g.fillStyle=frost;g.fillRect(0,0,238,230);g.restore();
    for(let k=0;k<16;k++){
     const x=15+noise(k+27001)*155,y=8+noise(k+27101)*110,r=22+noise(k+27201)*44;
     const cloud=g.createRadialGradient(x,y,0,x,y,r);cloud.addColorStop(0,'rgba(243,253,255,.09)');cloud.addColorStop(1,'rgba(235,251,255,0)');g.fillStyle=cloud;g.fillRect(x-r,y-r,r*2,r*2);
    }
    // Frozen grain is baked once: no scrolling noise or drifting cloud layer.
    for(let k=0;k<600;k++){
     const x=noise(k+27301)*285,y=noise(k+28001)*208,weight=Math.max(0,1-Math.hypot(x/280,y/208));
     if(weight<=0)continue;g.fillStyle=`rgba(246,255,255,${weight*weight*(.10+noise(k+29001)*.20)})`;g.beginPath();g.arc(x,y,.25+noise(k+30001)*.65,0,Math.PI*2);g.fill();
    }
   }
   ctx.save();ctx.globalAlpha=opacity*(.50+hold*.30);
   for(const [x,y,sx,sy] of [[0,24,1,1],[1280,24,-1,1],[1280,696,-1,-1],[0,696,1,-1]]){ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);ctx.drawImage(iceCornerMist,0,0);ctx.restore();}
   ctx.restore();
  }
  let iceBorderPaths=null,iceBorderCrystals=null;
  function iceVeinBorder(ctx,cue=null){
   const t=cue?.time??state.time;if(!spec.iceVeinBorder)return;
   const opacity=cue?.opacity??(ease(t/.65)*(1-ease((beatTime()-12.5)/.60)));if(opacity<=0)return;
   if(!iceBorderPaths){
    iceBorderPaths=[];iceBorderCrystals=[];
    const add=(points,tier=1)=>iceBorderPaths.push({points,tier});
    for(let corner=0;corner<4;corner++){
     const sx=corner===0||corner===3?1:-1,sy=corner<2?1:-1,cx=sx===1?18:1262,cy=sy===1?36:684;
     const world=p=>[cx+sx*p[0],cy+sy*p[1]];
     const leaders=[[[0,0],[32,3],[67,10],[103,6],[139,14],[177,12]],[[0,0],[4,27],[13,56],[8,85],[18,114],[15,145]],[[0,0],[16,15],[33,33],[51,45],[66,65],[84,79]]];
     leaders.forEach((leader,k)=>{
      const pts=leader.map((p,j)=>[p[0]+(j?(noise(corner*100+k*10+j+21001)-.5)*5:0),p[1]+(j?(noise(corner*100+k*10+j+21101)-.5)*5:0)]);
      add(pts.map(world),2);
      for(const j of [2,3,4]){
       const root=pts[j],key=corner*100+k*10+j,length=13+noise(key+21301)*20;
       const dx=k===0?length*.6:k===1?length:length*.85,dy=k===0?length:k===1?length*.45:-length*.4;
       const branch=[root,[root[0]+dx*.45,root[1]+dy*.60],[root[0]+dx,root[1]+dy]];
       add(branch.map(world),1);
       if(j!==3){const p=branch[1];add([p,[p[0]+(k===1?length*.4:-length*.20),p[1]+length*.42]].map(world),0);}
      }
     });
     for(let k=0;k<4;k++){const x=12+k*15,y=9+k*9;iceBorderCrystals.push({points:[[x,y-6],[x+5,y+1],[x+1,y+12],[x-4,y+3]].map(world)});}
    }
    // Deliberately sparse accents leave the middle of each edge open.
    for(const side of [0,1,2,3])for(let k=0;k<2;k++){
     const q=k?.73:.27,base=side%2?[[0,0],[5,12],[2,25],[9,37]]:[[0,0],[14,3],[26,0],[42,7]];
     const x=side===0?q*1280:side===1?1263:side===2?(1-q)*1280:17,y=side===0?34:side===1?q*720:side===2?686:(1-q)*720;
     add(base.map(([a,b])=>[x+(side===1?-a:a),y+(side===2?-b:b)]),0);
    }
   }
   const stops=[spec.swordHitStop,spec.featherHitStop];let hold=cue?.brightness??0;
   if(!cue)for(const stop of stops){if(!stop)continue;const age=t-stop.at;if(age>=0&&age<stop.duration+.18)hold=Math.max(hold,ease(age/.035)*ease((stop.duration+.18-age)/.18));}
   const monochrome=!cue&&stops.some(stop=>stop&&t>=stop.at&&t<stop.at+stop.duration);
   ctx.save();if(monochrome)ctx.filter='grayscale(1)';ctx.beginPath();ctx.rect(0,24,1280,672);ctx.clip();
   cornerFrostMist(ctx,opacity,hold);
   for(let tier=2;tier>=0;tier--){
    ctx.beginPath();for(const p of iceBorderPaths)if(p.tier===tier){ctx.moveTo(...p.points[0]);for(let j=1;j<p.points.length;j++)ctx.lineTo(...p.points[j]);}
    ctx.globalAlpha=opacity*(.13+hold*.52)*(tier===0?.62:1);ctx.strokeStyle='#63b9de';ctx.lineWidth=[1.8,2.6,4.0][tier]+hold*.8;ctx.shadowColor='#c3f7ff';ctx.shadowBlur=3+hold*11;ctx.stroke();
    ctx.shadowBlur=0;ctx.globalAlpha=opacity*(.28+hold*.66)*(tier===0?.55:1);ctx.strokeStyle=hold>.1?'#f2ffff':'#b4dce9';ctx.lineWidth=[.55,.75,1.1][tier]+hold*.25;ctx.stroke();
   }
   ctx.globalAlpha=opacity*(.07+hold*.24);ctx.fillStyle='#d9f7ff';ctx.strokeStyle='#d7f6ff';ctx.lineWidth=.6;
   for(const p of iceBorderCrystals){ctx.beginPath();ctx.moveTo(...p.points[0]);for(let j=1;j<p.points.length;j++)ctx.lineTo(...p.points[j]);ctx.closePath();ctx.fill();ctx.stroke();}
   ctx.restore();
  }
  function featherRoot(){
   const s=spec.rootFeather,v=view();
   if(!s.guardianAnchor)return s.screenRoot;
   const [x,y]=s.guardianAnchor;
   return [v.x+(x-978)*v.scale*v.flip,v.y+(y-622)*v.scale];
  }
  function rootFeather(target){
   const s=spec.rootFeather;if(!s||state.time<s.start||state.time>=s.shatterAt+s.shatterDuration)return;
   const root=featherRoot();
   if(state.time<s.peak||!rootFeatherAim){const p=hooks.featherTarget?.(view(),origin);if(p){const dx=p.x-root[0],dy=p.y-(s.aimLift||0)-root[1],len=Math.hypot(dx,dy)||1,beyond=Math.max(s.tipBeyondTarget||0,(s.minSpan||0)-len);rootFeatherAim={x:p.x+dx/len*beyond,y:p.y-(s.aimLift||0)+dy/len*beyond};}}
   if(!rootFeatherAim)return;
   const k=clamp((state.time-s.start)/(s.peak-s.start)),fi=Math.min(s.count-1,Math.floor(k*(s.count-1))),im=rootFeatherImages[Math.floor(fi/s.pageFrames)];if(!ready(im))return;
   const ctx=rootFeatherCtx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1280,720);
   const [rx,ry]=s.root,[tx,ty]=s.tip,[ox,oy]=root,vx=tx-rx,vy=ty-ry,l2=vx*vx+vy*vy;
   const dx=rootFeatherAim.x-ox,dy=rootFeatherAim.y-oy,width=s.widthFactor||1,a=(dx*vx+width*dy*vy)/l2,b=(dy*vx-width*dx*vy)/l2,c=(dx*vy-width*dy*vx)/l2,d=(dy*vy+width*dx*vx)/l2;
   const sx=fi%s.pageFrames%s.cols*s.width,sy=Math.floor(fi%s.pageFrames/s.cols)*s.height;
   ctx.save();ctx.transform(a,b,c,d,ox-a*rx-c*ry,oy-b*rx-d*ry);ctx.globalAlpha=.86*ease((state.time-s.start)/.10);
   if(state.time<s.shatterAt)ctx.drawImage(im,sx,sy,s.width,s.height,0,0,s.width,s.height);
   else{
    // Source-pattern fragments: tip-to-root breakup, then drift along the attack.
    for(let row=0;row<5;row++)for(let col=0;col<8;col++)for(let half=0;half<2;half++){
     const x=col*s.width/8,y=row*s.height/5,w=s.width/8,h=s.height/5,cx=x+w*.5,cy=y+h*.5;
     const project=clamp(((cx-rx)*vx+(cy-ry)*vy)/l2),delay=(1-project)*.28,age=Math.max(0,state.time-s.shatterAt-delay),q=clamp(age/.72);if(q>=1)continue;
     const seed=(row*17+col*13+half*7)%29,speed=25+seed*2;
     ctx.save();ctx.globalAlpha*=1-ease(q);ctx.translate(age*(speed+20),-age*(speed*.5+12));
     ctx.beginPath();ctx.moveTo(x,y);if(half===0){ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h);}else{ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);}ctx.closePath();ctx.clip();
     ctx.drawImage(im,sx,sy,s.width,s.height,0,0,s.width,s.height);ctx.restore();
    }
   }
   ctx.restore();
   // Feather foreground stays broad around the torso; keep the girl's face clear.
   const v=view(),cx=v.x,cy=v.y+(392-622)*v.scale;
   ctx.save();ctx.globalCompositeOperation='destination-out';ctx.translate(cx,cy);ctx.scale(1,1.18);
   const hole=ctx.createRadialGradient(0,0,15,0,0,44);hole.addColorStop(0,'rgba(0,0,0,1)');hole.addColorStop(.55,'rgba(0,0,0,.95)');hole.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=hole;ctx.fillRect(-45,-45,90,90);ctx.restore();
   target.drawImage(rootFeatherCanvas,0,0);
  }
  function weatherEnvelope(){return ease(state.time/.55)*ease((performanceDuration()-state.time)/.75);}
  function cinematicSnow(ctx,front){
   const settings=spec.cinematicWeather;if(!settings)return;
   const envelope=weatherEnvelope();if(envelope<=0)return;
   const reduced=hooks.reduced(),count=front?settings.frontCount:settings.backCount,limit=reduced?Math.ceil(count*.35):count;
   const t=state.time,winMix=state.win&&t>=(spec.victoryHeroAt||14.55)?.55:1;
   ctx.save();ctx.fillStyle='#f1fbff';ctx.strokeStyle='#e6f6ff';ctx.lineWidth=.65;
   for(let i=0;i<limit;i++){
    const seed=i+(front?14800:14100),q=noise(seed),speed=(front?62:32)+noise(seed+19)*(front?60:42);
    const x=(noise(seed+31)*1440+t*(settings.wind+noise(seed+47)*13)+Math.sin(t*.7+q*7)*(front?12:5))%1440-80;
    const y=(noise(seed+61)*840+t*speed)%840-60,r=(front?1.25:.6)+noise(seed+73)*(front?1.9:1.1);
    ctx.globalAlpha=envelope*winMix*(front?.34:.22)*( .65+noise(seed+97)*.65);
    if(front&&i%6===0){ctx.beginPath();ctx.moveTo(x-1.5,y-3);ctx.lineTo(x+1,y+3);ctx.stroke();}
    else{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
   }
   ctx.restore();
  }
  function cinematicDarkness(ctx){
   const settings=spec.cinematicWeather;if(!settings)return;
   const envelope=weatherEnvelope();if(envelope<=0)return;
   ctx.save();ctx.fillStyle='rgba(2,9,23,'+(settings.darkness*envelope)+')';ctx.fillRect(0,0,1280,720);ctx.restore();
  }
  function draw(ctx){
   if(!state.active)return;
   const jolt=screenShake();ctx.save();ctx.translate(jolt.x,jolt.y);
   const t=sourceTime(state.time),index=sourceIndex(state.time),page=Math.floor(index/spec.pageFrames),im=load(page);
   cinematicDarkness(ctx);
   const victoryOpacity=victoryBackdrop(ctx);
   cinematicSnow(ctx,false);
   const returnAge=spec.returnGhost?Math.max(0,state.time-(spec.duration-.8)):0,returnMix=ease(returnAge/.8);
   if(returnMix>0)hooks.idle?.(ctx,view(),origin,returnMix,returnAge);
   ctx.save();
   plane(ctx,()=>swordIce(ctx,t,state.time-hitTimes[2]));
   const heroOpacity=state.win&&beatTime()>=13.10?ease((state.time-(spec.victoryHeroAt||14.55))/.25):1;
   const winActorHidden=spec.winActorStartSource&&t>=spec.winActorStartSource&&!state.win;
   const winActorExit=state.win&&spec.winLayout&&t>=spec.winActorStartSource?ease((spec.duration-state.time)/.30):1;
   ctx.globalAlpha=(1-returnMix)*heroOpacity*winActorExit*(winActorHidden?0:1);
   if(ctx.globalAlpha>0)plane(ctx,()=>cutAfterimage(ctx,t,false));
   if(ctx.globalAlpha>0)actorPlane(ctx,()=>heroFrost(ctx,t,false),t);
   const wn=spec.winNative,wi=wn?Math.max(0,Math.min(wn.count-1,index-wn.startIndex)):0,wp=wn?winNativeImages[Math.floor(wi/wn.pageFrames)]:null;
   if(state.win&&wn&&t>=spec.winActorStartSource&&ready(wp))actorPlane(ctx,()=>ctx.drawImage(wp,wi%wn.pageFrames%wn.cols*wn.width,Math.floor(wi%wn.pageFrames/wn.cols)*wn.height,wn.width,wn.height,wn.x,wn.y,wn.width,wn.height),t);
   else if(index===spec.sharpFrameIndex&&ready(sharpFrame))plane(ctx,()=>ctx.drawImage(sharpFrame,0,0,1280,720));
   else if(ready(im))actorPlane(ctx,()=>ctx.drawImage(im,index%spec.pageFrames%spec.cols*spec.frameWidth,Math.floor(index%spec.pageFrames/spec.cols)*spec.frameHeight,spec.frameWidth,spec.frameHeight,0,0,1280,720),t);
   if(ctx.globalAlpha>0)actorPlane(ctx,()=>heroFrost(ctx,t,true),t);
   ctx.restore();
   plane(ctx,()=>cutAfterimage(ctx,t,true));
   plane(ctx,()=>slashFrost(ctx,t));
   rootFeather(ctx);
   if(enemiesInFront())hooks.foregroundEnemies?.(ctx,view(),origin);
   hooks.hitFeedback?.(ctx,view(),origin);
   cinematicSnow(ctx,true);
   if(returnMix>0&&ready(im))returnSnow(ctx,index,im,returnMix);
   if(spec.rift&&t>=spec.rift.start&&t<spec.rift.end){
    const ri=Math.min(spec.rift.count-1,Math.floor((t-spec.rift.start)*spec.fps)),rp=Math.floor(ri/spec.pageFrames),rim=riftImages[rp];
    if(ready(rim))ctx.drawImage(rim,ri%spec.pageFrames%spec.cols*spec.frameWidth,Math.floor(ri%spec.pageFrames/spec.cols)*spec.frameHeight,spec.frameWidth,spec.frameHeight,0,0,1280,720);
   }
   if(t>4.4&&t<5.99){
    ctx.save();ctx.globalAlpha=ease((t-4.4)/.2)*ease((5.99-t)/.15);
    const reveal=ease((t-4.18)/(spec.rift?.sweepDuration||.75)),front=-90+1460*reveal;
    ctx.beginPath();ctx.rect(0,0,Math.max(0,Math.min(1280,front)),720);ctx.clip();
    icyCutInTitle(ctx,74+40*(1-ease((t-4.4)/.3)),382);ctx.restore();
   }
   // Foreground-only hit-stop: actual enemies are added by the game hook at the landing beat.
   if(t>=7.13&&t<7.22){ctx.fillStyle='#000';ctx.fillRect(0,0,1280,720);}
   const swordStop=spec.swordHitStop||{at:7.22,duration:.33};
   if(state.time>=swordStop.at&&state.time<swordStop.at+swordStop.duration){
    if(!impact){
      const foreground=document.createElement('canvas');foreground.width=1280;foreground.height=720;const fc=foreground.getContext('2d');
      plane(fc,()=>{swordIce(fc,7.10);if(ready(sharpFrame))fc.drawImage(sharpFrame,0,0,1280,720);else if(ready(im))fc.drawImage(im,index%spec.pageFrames%spec.cols*spec.frameWidth,Math.floor(index%spec.pageFrames/spec.cols)*spec.frameHeight,spec.frameWidth,spec.frameHeight,0,0,1280,720);heroFrost(fc,7.10,true);});hooks.impact(fc,view(),origin);
      impact=document.createElement('canvas');impact.width=1280;impact.height=720;const c=impact.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,1280,720);
      inkImpactLines(c,origin.facing>0?930:350,410);
      // Draw-only compositor works for both file:// and HTTP. No origin-restricted pixel readback.
      c.filter='grayscale(1) contrast(5) brightness(1.7)';c.drawImage(foreground,0,0);c.filter='none';
    }
    ctx.save();if(state.time-swordStop.at<.045)ctx.filter='invert(1)';ctx.drawImage(impact,0,0);ctx.restore();
   }
   let flash=0;for(const [i,at] of hitTimes.entries())if(state.time>=at&&state.time<at+.13)flash=Math.max(flash,[.45,.50,.83,.32][i]*Math.exp(-(state.time-at)*24));
   if(flash){ctx.fillStyle=`rgba(225,249,255,${flash})`;ctx.fillRect(0,0,1280,720);}
   const stop=spec.featherHitStop;
   if(stop&&state.time>=stop.at&&state.time<stop.at+stop.duration){
    if(!featherImpact){
     const foreground=document.createElement('canvas');foreground.width=1280;foreground.height=720;const fc=foreground.getContext('2d');
     if(ready(im))plane(fc,()=>{fc.drawImage(im,index%spec.pageFrames%spec.cols*spec.frameWidth,Math.floor(index%spec.pageFrames/spec.cols)*spec.frameHeight,spec.frameWidth,spec.frameHeight,0,0,1280,720);heroFrost(fc,t,true);});
     rootFeather(fc);
     hooks.impact(fc,view(),origin);
     featherImpact=document.createElement('canvas');featherImpact.width=1280;featherImpact.height=720;const c=featherImpact.getContext('2d');
     c.fillStyle='#000';c.fillRect(0,0,1280,720);inkImpactLines(c,origin.facing>0?930:350,410);c.filter='grayscale(1) contrast(6) brightness(1.8)';c.drawImage(foreground,0,0);c.filter='none';
    }
    ctx.save();if(state.time-stop.at<.045)ctx.filter='invert(1)';ctx.drawImage(featherImpact,0,0);ctx.restore();
   }
   hitStopFractures(ctx);
   swordScreenTear(ctx);
   wholeScreenShatter(ctx);
   featherShatter(ctx);
   victorySnow(ctx,victoryOpacity);
   if(state.win){if(spec.titleEffects)animatedTitle(ctx,'finish');else if(t>10.35&&t<12.78)title(ctx,'finish',ease((t-10.35)/.25)*ease((12.78-t)/.25),1.08-.08*ease((t-10.35)/.3));}
   drawCombo(ctx,t);
   ctx.save();ctx.translate(-jolt.x,-jolt.y);iceVeinBorder(ctx);ctx.restore();
   const clock=beatTime(),white=state.win&&clock>12.75&&clock<14.30?(clock<13.40?ease((clock-12.75)/.35):1-ease((clock-13.40)/.90)):0;
   if(white){ctx.save();ctx.globalAlpha=white;ctx.fillStyle='#fff';ctx.fillRect(0,0,1280,720);ctx.restore();}
   if(state.win){if(spec.titleEffects)animatedTitle(ctx,'win');else if(clock>(spec.winRevealAt||14.55))title(ctx,'win',ease((clock-(spec.winRevealAt||14.55))/.45));}
   ctx.restore();ctx.fillStyle='#030813';ctx.fillRect(0,0,1280,24);ctx.fillRect(0,696,1280,24);
  }
  async function seek(time,preserveImpact=false){
   if(!state.active)return;const index=sourceIndex(time),page=Math.floor(index/spec.pageFrames);warm(page);const im=load(page);if(!ready(im))await new Promise((resolve,reject)=>{im.addEventListener('load',resolve,{once:true});im.addEventListener('error',reject,{once:true});});state.time=time;volume();audioPause();if(!preserveImpact){impact=null;featherImpact=null;screenBreak=null;swordTearPanels=null;}
  }
  window.addEventListener('blur',()=>setPaused(true));window.addEventListener('focus',()=>{if(state.active)setPaused(hooks.paused());});document.addEventListener('visibilitychange',()=>{if(state.active)setPaused(document.hidden||hooks.paused());});
  function drawReadyBorder(ctx,age,reduced=false){
   if(state.active)return;
   const wave=.5-.5*Math.cos(age*Math.PI*2/1.5);
   iceVeinBorder(ctx,{time:age,opacity:ease(age/.25),brightness:reduced?.65:.12+.88*wave*wave});
  }
  return {state,start,update,draw,drawReadyBorder,beginWorld,endWorld,setPaused,cancel:()=>finish(),seek,ready:()=>ready(load(0)),get enemiesInFront(){return enemiesInFront();},get active(){return state.active;},get time(){return state.time;},get sourceTime(){return sourceTime(state.time);}};
 }
};
