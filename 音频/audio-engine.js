/* Frost Ruins audio. Original procedural sound design; voice supplied by user.
 * No network dependency: the voice sprite is loaded as a local script. */
window.FrostAudio = (() => {
  'use strict';
  let ctx, master, wet, reverb, voiceBuffer, cloneBuffer, enchantBuffer, voiceNode, voiceGain, voiceName, ambient, music, guard;
  let active = false, hidden = false, muted = false, lastVoice = -100, level = 0, pendingStart = false;
  let cinematicPlayback=false;
  // A media element also plays local OGG files when the game is opened via file://.
  const musicURL=new URL('../音乐/Unexplored - TAD/Unexplored short ver.mp3',document.currentScript.src).href;
  const battleMusicURL=new URL('../音乐/Heartfelt Battle - request/heartfelt-battle_loop.ogg',document.currentScript.src).href;
  const bossMusicURL=new URL('../音乐/Epic Boss Battle - Juhani Junkala/epic-boss-battle_loop.ogg',document.currentScript.src).href;
  let bossTrack=null,bossMix=0,bossWanted=false;
  let backgroundTrack=null, musicLevel=.7;
  let menuMusic=false;
  function title(){hidden=document.hidden;menuMusic=true;battleWanted=bossWanted=false;battleMix=bossMix=combatHold=0;musicLevel=.7;if(battleTrack)battleTrack.pause();if(bossTrack)bossTrack.pause();playTrack();}
  let battleTrack=null, battleMix=0, combatHold=0, battleWanted=false;
  const pendingMusic=new WeakSet();
  function track(){
    if(!backgroundTrack){backgroundTrack=window.FROST_BACKGROUND_TRACK||new Audio(musicURL);backgroundTrack.loop=true;backgroundTrack.preload='auto';}
    return backgroundTrack;
  }
  function syncTrack(){
    const volume=muted||hidden?0:Math.max(0,Math.min(1,settings.master*settings.music*musicLevel*(bossRoars.size?.4:1)*(cinematicPlayback ? 0 : voiceNode ? .05 : 1)));
    if(backgroundTrack)backgroundTrack.volume=volume*(1-battleMix)*(1-bossMix);
    if(battleTrack)battleTrack.volume=volume*battleMix*(1-bossMix);
    if(bossTrack)bossTrack.volume=volume*bossMix;
  }
  function ensureBattleTrack(){
    if(!battleTrack){battleTrack=new Audio(battleMusicURL);battleTrack.loop=true;battleTrack.preload='auto';battleTrack.volume=0;}
    return battleTrack;
  }
  function ensureBossTrack(){
    if(!bossTrack){bossTrack=new Audio(bossMusicURL);bossTrack.loop=true;bossTrack.preload='auto';bossTrack.volume=0;}
    return bossTrack;
  }
  function playMusicElement(audio){
    if(audio.paused&&!audio.error&&!pendingMusic.has(audio)){
      pendingMusic.add(audio);audio.play().catch(()=>{}).finally(()=>pendingMusic.delete(audio));
    }
  }
  function playTrack(){
    if(window.FROST_AUDIO_PREVIEW||(!active&&!menuMusic)||hidden)return;
    track();syncTrack();
    if(battleMix<1&&bossMix<1)playMusicElement(backgroundTrack);else backgroundTrack.pause();
    if((battleWanted||battleMix>0)&&bossMix<1)playMusicElement(ensureBattleTrack());else if(battleTrack)battleTrack.pause();
    if(bossWanted||bossMix>0)playMusicElement(ensureBossTrack());else if(bossTrack)bossTrack.pause();
  }
  function updateBattleMusic(dt,p,enemyList,transitioning){
    // Hold combat music through short gaps between nearby enemies.
    const bossPresent=!transitioning&&p.hp>0&&enemyList.some(e=>e.isBoss&&!e.removed&&(e.phase===0||e.hp>0));
    const threat=!transitioning&&p.hp>0&&enemyList.some(e=>(!e.isBoss||bossTrack?.error)&&!e.removed&&e.state!=='dead'&&(e.hp==null||e.hp>0)&&Math.abs(e.x-p.x)<950);
    if(!cinematicPlayback){
      bossWanted=bossPresent&&!bossTrack?.error;
      combatHold=threat?5:Math.max(0,combatHold-dt);
      battleWanted=!bossWanted&&p.hp>0&&combatHold>0&&!battleTrack?.error;
    }
    if(bossWanted)ensureBossTrack();
    if(battleWanted)ensureBattleTrack();
    // Keep exploration audible while the battle file is still loading.
    const target=battleWanted&&battleTrack?.readyState>=2&&!battleTrack.paused?1:0;
    const step=dt/1.2;
    battleMix=target>battleMix?Math.min(target,battleMix+step):Math.max(target,battleMix-step);
    const bossTarget=bossWanted&&bossTrack?.readyState>=2&&!bossTrack.paused?1:0;
    bossMix=bossTarget>bossMix?Math.min(bossTarget,bossMix+step):Math.max(bossTarget,bossMix-step);
    syncTrack();
  }
  let lastVoiceContext='event';
  const clonePack=window.FROST_CLONE_VOICES || {lines:{}};
  const enchantPack=window.FROST_ENCHANT_VOICES || {lines:{}};
  let lastEnchantLine='';
  let narrationName=null,narrationOffset=0,narrationStarted=0,narrationPlaying=false,narrationPaused=false;
  let pendingGreeting=false,pendingReborn=false,beamVoicePlayed=false,lastBeamLine='';
  const skillTurns={};
  const buses = {}, cache = new Map(), recent = new Map(), sources = new Set();
  const bossSources=new Set(),bossRoars=new Set(),bossSoundEvents=[];
  let bossChargeNode=null,bossSoundPaused=false,bossSamplesReady=false,bossSamplesErrors=[];
  const bossVolumes={roar_intro:.9,roar_phase:1,step_0:.62,step_1:.62,step_2:.62,swing:.72,punch_air:.6,slam:.95,charge_start:.7,charge_loop:.35,break:.8,armor_hit:.5,death:.9};
  let menuSoundsReady=Promise.resolve(),lastMenuSound=-100;
  let settings = {master: .7, sfx: .8, voice: .9, music: .25, amb: .45};
  try { const saved = JSON.parse(localStorage.getItem('frost-audio-v1'));
    for (const k in settings) if (saved && Number.isFinite(saved[k])) settings[k] = Math.max(0, Math.min(1, saved[k]));
  } catch (_) {}
  const lines = {
  "start": [
    0,
    1.82,
    "来吧，去试试看"
  ],
  "hurt": [
    2.12,
    1.3099773242630386,
    "受击短声（哎）"
  ],
  "relief": [
    3.7299773242630385,
    1.8,
    "好险"
  ],
  "portal": [
    5.829977324263038,
    2.6699773242630385,
    "看来很值得期待呢"
  ],
  "clear": [
    8.799954648526077,
    1.62,
    "恭喜你"
  ],
  "retort": [
    10.719954648526077,
    2.16,
    "可不想被你这么说"
  ],
  "cast": [
    13.179954648526078,
    3.31,
    "潺潺清流在此显现"
  ],
  "failure": [
    16.789954648526077,
    3.03,
    "一上来就搞砸了"
  ],
  "safe": [
    20.119954648526075,
    2.31,
    "你看，没事吧"
  ],
  "idleConcern": [
    22.72995464852608,
    2.91,
    "怎么了，还害怕吗"
  ],
  "magicAttack": [
    25.939954648526076,
    1.22,
    "攻击魔法"
  ],
  "magicHeal": [
    27.45995464852608,
    1.08,
    "治愈魔法"
  ],
  "magicSummon": [
    28.839954648526078,
    1.3,
    "召唤魔法"
  ],
  "danger": [
    30.439954648526076,
    2.39,
    "那…那可大事不妙"
  ],
  "confident": [
    33.12995464852608,
    2.11,
    "这不当然的吗"
  ],
  "regret": [
    35.53995464852608,
    1.05,
    "很遗憾…"
  ],
  "reaction": [
    36.88995464852608,
    1.34,
    "是吗"
  ],
  "tutorial": [
    38.52995464852608,
    1.51,
    "你先照着做一遍"
  ],
  "healing": [
    40.339954648526074,
    8.77,
    "治愈咏唱（长段）"
  ],
  "chuckle": [
    49.409954648526075,
    0.55,
    "轻笑（哼哼）"
  ],
  "tease": [
    50.259954648526076,
    2.14,
    "看来是害怕了呢"
  ],
  "water": [
    52.699954648526074,
    4.07,
    "伟大的水之加护"
  ],
  "repeat": [
    57.06995464852608,
    1.63,
    "那就再说一次吧"
  ]
};
  Object.assign(lines,clonePack.lines);
  Object.assign(lines,enchantPack.lines);
  function save(){ try {localStorage.setItem('frost-audio-v1', JSON.stringify(settings));} catch (_) {} }
  function syncMusic(fade=.25){
    syncTrack();
    if(!ctx || !buses.music)return;
    const t=ctx.currentTime, gain=buses.music.gain;
    gain.cancelScheduledValues(t);
    gain.setTargetAtTime(settings.music*(voiceNode||cinematicPlayback ? .05:1),t,fade);
  }
  function gains(){ if (!ctx) return;if(muted||settings.sfx<=0)stopBossSounds(); const t = ctx.currentTime;
    master.gain.setTargetAtTime(muted || hidden ? 0 : settings.master, t, .06);
    for(const k in buses) if(k!=='music')buses[k].gain.setTargetAtTime(settings[k], t, .08);
    syncMusic(.08);
  }
  function makeBuffer(seconds, fn){
    const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = b.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = fn(i / ctx.sampleRate, i, seconds);
    return b;
  }
  function init(){
    if(ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
    ctx = new AC(); master = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -12;
    limiter.knee.value = 12; limiter.ratio.value = 8; limiter.attack.value = .003; limiter.release.value = .2;
    master.connect(limiter); limiter.connect(ctx.destination);
    for(const k of ['sfx','voice','music','amb']){ buses[k] = ctx.createGain(); buses[k].connect(master); }
    reverb = ctx.createConvolver();
    const ir = ctx.createBuffer(2, ctx.sampleRate * 2.8, ctx.sampleRate);
    for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3)*.25;}
    reverb.buffer=ir; wet=ctx.createGain(); wet.gain.value=.19; reverb.connect(wet); wet.connect(buses.sfx);
    gains();
    menuSoundsReady=Promise.all(Object.entries(window.FROST_MENU_SOUNDS||{}).map(async([key,base64])=>{
      try{const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));cache.set('menu-'+key,await ctx.decodeAudioData(bytes.buffer));}
      catch(e){console.warn('菜单音效解码失败',key,e);}
    }));
    Promise.all(Object.entries(window.FROST_BOSS_SOUNDS||{}).map(async([key,base64])=>{
      try{const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));cache.set('boss-'+key,await ctx.decodeAudioData(bytes.buffer));}
      catch(e){bossSamplesErrors.push(key);console.warn('Boss音效解码失败',key,e);}
    })).then(()=>{bossSamplesReady=Object.keys(window.FROST_BOSS_SOUNDS||{}).length>0&&bossSamplesErrors.length===0;});
    // decodeAudioData works under file:// because the bytes arrive via script.
    if(window.FROST_VOICE_BASE64){
      const bytes = Uint8Array.from(atob(window.FROST_VOICE_BASE64), c => c.charCodeAt(0));
      ctx.decodeAudioData(bytes.buffer).then(b => {voiceBuffer=b;if(pendingStart){pendingStart=false;if(!narrationName)voice('start');}}).catch(e => console.warn('人物语音解码失败',e));
    }
    if(clonePack.base64){
      const bytes=Uint8Array.from(atob(clonePack.base64),c=>c.charCodeAt(0));
      ctx.decodeAudioData(bytes.buffer).then(b=>{cloneBuffer=b;resumeNarration();}).catch(e=>console.warn('日语配音解码失败',e));
    }
    if(enchantPack.base64){
      const bytes=Uint8Array.from(atob(enchantPack.base64),c=>c.charCodeAt(0));
      ctx.decodeAudioData(bytes.buffer).then(b=>{enchantBuffer=b;}).catch(e=>console.warn('K附魔配音解码失败',e));
    }
  }
  function unlock(){
    // Embedded browsers can emit blur without a matching focus on the next click.
    hidden=document.hidden;
    try { init(); if(ctx && ctx.state !== 'running') ctx.resume().catch(()=>{}); } catch(e){console.warn('音频初始化失败',e);}
    gains();
    if(menuMusic)playTrack();
  }
  function route(buffer, bus, volume, x, rate=1, loop=false){
    if(!ctx || hidden || ctx.state !== 'running' || sources.size >= 40) return null;
    const src=ctx.createBufferSource(), gain=ctx.createGain(), pan=ctx.createStereoPanner();
    src.buffer=buffer; src.playbackRate.value=rate; src.loop=loop;
    gain.gain.value=volume; pan.pan.value=Math.max(-.85,Math.min(.85,x||0));
    src.connect(gain); gain.connect(pan); pan.connect(buses[bus]);
    if(bus==='sfx') {const send=ctx.createGain(); send.gain.value=.22+level*.1; pan.connect(send); send.connect(reverb);
      src.addEventListener('ended',()=>send.disconnect(),{once:true});}
    sources.add(src); src.onended=()=>{sources.delete(src);src.disconnect();gain.disconnect();pan.disconnect();};
    src.start(); return {src,gain};
  }
  const specs = {
    step:[.10,1500,.32,0], run:[.12,1200,.42,0], land:[.28,360,.65,95], jump:[.22,1600,.25,0],
    slash1:[.28,2100,.42,740], slash2:[.24,2500,.44,880], slash3:[.65,1900,.55,1100],
    charge:[.48,3200,.22,990], fire:[.22,2200,.48,1240], icehit:[.34,3100,.48,1550],
    block:[.72,1700,.8,840], blockRelease:[.30,1900,.4,760], blockhit:[.48,650,.85,220], hurt:[.27,580,.55,0],
    interrupt:[.32,1800,.45,440], nova:[1.4,1300,.75,180], freeze:[.5,2700,.30,1650],
    storm:[.8,2200,.28,880], crack:[.45,2300,.4,1300], enemyStep:[.22,260,.6,65],
    cloth:[.32,2100,.13,0], staff:[.72,1700,.11,1220],
    windup:[.7,370,.45,82], axe:[.4,480,.65,60], enemyHit:[.3,570,.45,105],
    enemyDeath:[1.2,400,.7,60], portal:[1.6,1800,.4,660], death:[2.6,650,.6,147], drip:[1.1,2400,.12,1500],
    bossSlam:[.9,650,.95,58], bossCharge:[1.1,1000,.7,78]
  };
  function sample(name){
    if(cache.has(name)) return cache.get(name);
    if(name==='bossSlam'){
      let low=0,phase=0;
      const b=makeBuffer(.9,t=>{
        const n=Math.random()*2-1;low+=(n-low)*.075;
        phase+=2*Math.PI*(42+65*Math.exp(-t*22))/ctx.sampleRate;
        return Math.max(-.9,Math.min(.9,Math.sin(phase)*.65*Math.exp(-t*8)+low*.85*Math.exp(-t*5)+(n-low)*.18*Math.exp(-t*35)))*Math.min(1,t/.004);
      });cache.set(name,b);return b;
    }
    if(name==='menuClick'){
      const b=makeBuffer(.24,t=>{
        const env=Math.min(1,t/.006)*Math.exp(-t*22);
        return (Math.sin(t*2*Math.PI*1760)*.32+Math.sin(t*2*Math.PI*2640)*.12+Math.sin(t*2*Math.PI*3520)*.055)*env;
      });cache.set(name,b);return b;
    }
    if(name==='block'){
      let low=0;
      const b=makeBuffer(.72,t=>{
        const noise=Math.random()*2-1;low+=(noise-low)*.11;
        const env=Math.min(1,t/.012)*Math.exp(-t*5.8);
        const air=(noise-low)*.2*Math.exp(-t*13);
        const wood=Math.sin(2*Math.PI*155*t)*.24*Math.exp(-t*16);
        const ice=(Math.sin(2*Math.PI*840*t)+.38*Math.sin(2*Math.PI*1260*t))*.27*(1-Math.exp(-t*40));
        return (air+wood+ice)*env;
      });cache.set(name,b);return b;
    }
    const [dur,cut,amp,freq]=specs[name] || specs.icehit;
    let low=0, phase=0;
    const rising=['charge','storm','windup'].includes(name);
    const b=makeBuffer(dur,(t,i)=>{
      const u=t/dur, attack=Math.min(1,t/.012), env=attack*Math.pow(1-u,rising?.65:2.7)*(rising?u+.1:1);
      const noise=Math.random()*2-1; low+=(noise-low)*(1-Math.exp(-2*Math.PI*cut/ctx.sampleRate));
      phase+=2*Math.PI*freq*(rising?.65+u:1-.35*u)/ctx.sampleRate;
      const glass=Math.sin(phase)*.18+Math.sin(phase*2.756)*.07+Math.sin(phase*4.12)*.025;
      const rubble=name==='enemyDeath' ? .45+.55*Math.pow(Math.sin(t*23),8) : 1;
      return Math.max(-.95,Math.min(.95,(low*.85+(freq?glass:0))*env*amp*rubble));
    }); cache.set(name,b); return b;
  }
  function uiClick(){
    unlock();if(!ctx||hidden||muted)return;
    const play=async()=>{
      await menuSoundsReady;if(hidden||muted||ctx.state!=='running')return;
      if(ctx.currentTime-(recent.get('menuClick')??-100)<.1)return;
      recent.set('menuClick',ctx.currentTime);lastMenuSound=ctx.currentTime;
      route(cache.get('menu-confirm')||sample('menuClick'),'sfx',.32,0);
    };
    if(ctx.state==='running')play();else ctx.resume().then(play).catch(()=>{});
  }
  function uiSelect(){
    // Hover must not initialize/unlock audio before the first user gesture.
    if(!ctx||ctx.state!=='running'||hidden||muted||ctx.currentTime-lastMenuSound<.09)return;
    const buffer=cache.get('menu-hover');if(!buffer)return;
    lastMenuSound=ctx.currentTime;route(buffer,'sfx',.16,0);
  }
  function sfx(name,x,volume=1){
    if(!ctx || !active || hidden) return;
    const now=ctx.currentTime;
    if(now-(recent.get(name)??-100)<.045) return;
    recent.set(name,now);
    const dist=x==null?0:Math.abs(x), gain=volume*Math.max(0,1-dist/1000);
    if(gain<.015) return;
    return route(sample(name),'sfx',gain,x==null?0:x/700,.94+Math.random()*.12);
  }
  function bossCue(name,x=0,volume=1){
    if(!ctx||!active||hidden||muted||settings.sfx<=0||bossSoundPaused||cinematicPlayback||ctx.state!=='running')return null;
    const now=ctx.currentTime,minGap=name==='armor_hit'?.10:.075;
    if(now-(recent.get('boss-'+name)??-100)<minGap)return null;
    const buffer=cache.get('boss-'+name);
    if(!buffer){if(name==='slam')return sfx('bossSlam',x,volume);return null;}
    const attenuation=Math.max(.08,1-Math.abs(x)/1500),gain=(bossVolumes[name]??.6)*volume*attenuation;
    const rate=name.startsWith('step_')?.97+Math.random()*.06:1;
    const node=route(buffer,'sfx',gain,x/850,rate,false);if(!node)return null;
    recent.set('boss-'+name,now);bossSources.add(node.src);
    bossSoundEvents.push({id:name,time:now,x,volume:gain,rate});if(bossSoundEvents.length>192)bossSoundEvents.shift();
    if(name.startsWith('roar_')){bossRoars.add(node.src);syncTrack();}
    node.src.addEventListener('ended',()=>{bossSources.delete(node.src);if(bossRoars.delete(node.src))syncTrack();},{once:true});
    return node;
  }
  function stopBossCharge(){
    if(!bossChargeNode)return;
    const node=bossChargeNode;bossChargeNode=null;
    try{node.gain.gain.setTargetAtTime(0,ctx.currentTime,.015);node.src.stop(ctx.currentTime+.05);}catch(_){}
  }
  function bossMotion(charging,x=0){
    if(!charging||!active||hidden||muted||settings.sfx<=0||bossSoundPaused||cinematicPlayback){stopBossCharge();return;}
    const buffer=cache.get('boss-charge_loop');
    if(!bossChargeNode&&buffer){
      const node=route(buffer,'sfx',.01,x/850,1,true);
      if(node){bossChargeNode=node;bossSources.add(node.src);node.src.addEventListener('ended',()=>{bossSources.delete(node.src);if(bossChargeNode===node)bossChargeNode=null;},{once:true});}
    }
    if(bossChargeNode)bossChargeNode.gain.gain.setTargetAtTime(.35*Math.max(.08,1-Math.abs(x)/1500),ctx.currentTime,.04);
  }
  function stopBossSounds(){
    stopBossCharge();for(const source of [...bossSources]){try{source.stop();}catch(_){}}
    bossSources.clear();bossRoars.clear();syncTrack();
  }
  function bossPause(value){
    value=!!value;if(value===bossSoundPaused)return;
    bossSoundPaused=value;if(value)stopBossSounds();
  }
  function stopVoice(){
    const source=voiceNode, gain=voiceGain;
    if(narrationPlaying){narrationOffset+=Math.max(0,ctx.currentTime-narrationStarted);narrationPlaying=false;}
    voiceNode=null;voiceGain=null;voiceName=null;
    if(source){try{source.stop();}catch(_){}}
    if(gain)gain.disconnect();
    syncMusic();
  }
  const combatCloneNames=['frostBlade','frostBeam','frostStorm','frostEnchant','frostUltimate',...Object.keys(enchantPack.lines)];
  function voice(name,force=false,volume=.85,cooldown=14,context='event',startAt=0){
    const buffer=enchantPack.lines[name]?enchantBuffer:clonePack.lines[name]?cloneBuffer:voiceBuffer;
    if(!ctx || !active || !buffer || hidden || !lines[name] || (narrationName && context!=='story')) return false;
    const t=ctx.currentTime;
    // A real injury may interrupt a chant; the pain voice remains exclusive to damagePlayer.
    const interruptCast=name==='hurt' && ['cast','magicAttack','magicSummon','water','healing',...combatCloneNames].includes(voiceName);
    // Exploration must not consume the first real combat response or its cooldown.
    const interruptExplore=context==='event' && lastVoiceContext==='explore' &&
      ['hurt','relief','cast','magicAttack','magicSummon','water',...combatCloneNames].includes(name);
    if(!force && !interruptCast && !interruptExplore && (voiceNode || t-lastVoice<cooldown)) return false;
    stopVoice(); lastVoice=t;lastVoiceContext=context;
    const [offset,fullDuration]=lines[name], duration=fullDuration-startAt;
    if(duration<=.01)return false;
    const s=ctx.createBufferSource(),g=ctx.createGain(),short=duration<.6;
    s.buffer=buffer;s.connect(g);g.connect(buses.voice);
    const fadeIn=Math.min(short?.004:.025,duration/4),fadeOut=Math.min(short?.015:.06,duration/4);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+fadeIn);
    g.gain.setValueAtTime(volume,t+duration-fadeOut);g.gain.linearRampToValueAtTime(0,t+duration);
    voiceNode=s;voiceGain=g;voiceName=name;
    syncMusic(.06);
    if(context==='story'){narrationStarted=t;narrationPlaying=true;}
    s.onended=()=>{s.disconnect();g.disconnect();if(voiceNode===s){voiceNode=null;voiceGain=null;voiceName=null;if(context==='story'){narrationPlaying=false;narrationOffset=fullDuration;}syncMusic();}};
    s.start(t,offset+startAt,duration);
    return true;
  }
  function narrate(name){
    stopVoice();pendingStart=false;
    narrationName=clonePack.lines[name]?name:null;narrationOffset=0;
    narrationPaused=!!document.getElementById('controlsDialog')?.open;
    return resumeNarration();
  }
  function resumeNarration(){
    if(!narrationName || narrationPaused || narrationPlaying || !active || !ctx || ctx.state!=='running')return false;
    return voice(narrationName,true,.86,0,'story',narrationOffset);
  }
  function endNarration(discard=false){
    if(narrationPlaying || lastVoiceContext==='story')stopVoice();
    narrationName=null;narrationOffset=0;narrationPaused=false;
    const greet=pendingGreeting,heal=pendingReborn;
    pendingGreeting=false;pendingReborn=false;
    if(discard)return;
    if(heal)reborn();
    else if(greet){if(voiceBuffer)voice('start',true,.85);else pendingStart=true;}
  }
  function pauseNarration(paused){
    narrationPaused=paused;
    if(paused && narrationPlaying)stopVoice();
    else if(!paused)resumeNarration();
  }
  // The effort shout is reserved for a future ultimate; ordinary melee stays unvoiced.
  function attack(){return false;}
  function skill(name){
    if(name==='enchant'&&enchantBuffer){
      let pool=Object.keys(enchantPack.lines);if(pool.length>1)pool=pool.filter(key=>key!==lastEnchantLine);
      if(pool.length){const key=pool[Math.floor(Math.random()*pool.length)];if(voice(key,true,.88,0)){lastEnchantLine=key;return true;}return false;}
    }
    const key={blade:'frostBlade',beam:'frostBeam',storm:'frostStorm',enchant:'frostEnchant',ultimate:'frostUltimate'}[name];
    return key?voice(key,true,.88):false;
  }
  function skillOrOriginal(name,original,force,volume,cooldown=14){
    if(!cloneBuffer)return voice(original,force,volume,cooldown);
    const turn=skillTurns[name]||0;skillTurns[name]=turn+1;
    return turn%2?voice(original,force,volume,cooldown):skill(name);
  }
  function randomBeamVoice(){
    let pool=['cast','magicAttack','frostBeam'].filter(key=>lines[key]&&(clonePack.lines[key]?cloneBuffer:voiceBuffer));
    if(pool.length>1)pool=pool.filter(key=>key!==lastBeamLine);
    if(!pool.length)return false;
    const key=pool[Math.floor(Math.random()*pool.length)];
    if(!voice(key,true,.84,0))return false;
    lastBeamLine=key;return true;
  }
  function loops(){
    if(window.FROST_AUDIO_PREVIEW) return;
    if(!ctx || !active || hidden || ctx.state!=='running') return;
    playTrack();
    if(ambient || music) return;
    let low=0;
    const wind=cache.get('ambient-loop') || makeBuffer(12,(t,i,d)=>{low+=(Math.random()*2-1-low)*.018;
      // Fade the noise at the seam; a periodic bed keeps the join quiet.
      const edge=Math.min(1,t/.5,(d-t)/.5);
      return low*.28*edge+Math.sin(t*Math.PI*2*48)*.008;});
    cache.set('ambient-loop',wind);ambient=route(wind,'amb',.55,0,1,true);
  }
  function stopGuard(){
    if(!guard) return;
    const n=guard;guard=null;
    n.gain.gain.cancelScheduledValues(ctx.currentTime);
    n.gain.gain.setValueAtTime(n.gain.gain.value,ctx.currentTime);
    n.gain.gain.linearRampToValueAtTime(0,ctx.currentTime+.08);
    try{n.src.stop(ctx.currentTime+.09);}catch(_){}
  }
  function defense(p,transitioning){
    if(transitioning || p.state!=='block' || p.hp<=0){stopGuard();return;}
    if(guard) return;
    let buffer=cache.get('guard-loop');
    if(!buffer){
      let low=0;
      buffer=makeBuffer(2,(t,i,d)=>{
        low+=(Math.random()*2-1-low)*.025;
        const edge=Math.min(1,t/.025,(d-t)/.025);
        const pulse=.85+.15*Math.cos(Math.PI*t);
        return (Math.sin(2*Math.PI*528*t)*.031+Math.sin(2*Math.PI*792*t)*.012+Math.sin(2*Math.PI*1320*t)*.006)*pulse+low*.014*edge;
      });cache.set('guard-loop',buffer);
    }
    guard=route(buffer,'sfx',0,0,1,true);
    if(guard)guard.gain.gain.setTargetAtTime(.82,ctx.currentTime,.07);
  }
  function stopLoops(){for(const audio of [backgroundTrack,battleTrack,bossTrack])if(audio)audio.pause();stopGuard();for(const n of [ambient,music]) if(n) try{n.src.stop();}catch(_){} ambient=music=null;}
  function stopPlayback(){
    stopBossSounds();
    stopVoice();stopLoops();
    // Suspended contexts retain unfinished effects; discard them before returning.
    for(const source of [...sources]){try{source.stop();}catch(_){}}
    sources.clear();
  }
  function start(){menuMusic=false;active=true;unlock();if(ctx)ctx.resume().then(()=>{loops();resumeNarration();}).catch(()=>{});if(!window.FROST_AUDIO_PREVIEW){if(narrationName)pendingGreeting=true;else if(voiceBuffer)voice('start');else pendingStart=true;}}
  function stop(){menuMusic=false;active=false;pendingStart=pendingGreeting=pendingReborn=false;endNarration(true);stopPlayback();for(const audio of [backgroundTrack,battleTrack,bossTrack])if(audio)audio.currentTime=0;battleWanted=bossWanted=false;battleMix=bossMix=combatHold=0;gains();}
  let envT=0, dripT=4, portalT=0, chargeT=0;
  let castAttempted=false, battleVoiceUntil=-100, battleCalmT=0, battleSpoken=false;
  let lowHealthSpoken=false, guardVoiceT=0, guardVoiced=false, lastWater=-100;
  let deathVariant=0, helpSeen=false, lastHelpVoice=-100, lastReborn=-100;
  function help(){
    if(!active || !ctx || hidden)return false;
    if(narrationName){pauseNarration(true);return false;}
    stopGuard();
    if(ctx.currentTime-lastHelpVoice<3)return false;
    const key=helpSeen?'repeat':'tutorial';
    if(!voice(key,true,.78))return false;
    helpSeen=true;lastHelpVoice=ctx.currentTime;return true;
  }
  function reborn(){
    if(!active || !ctx || hidden || ctx.currentTime-lastReborn<12)return false;
    if(narrationName){pendingReborn=true;return false;}
    if(!voice('healing',true,.76))return false;
    lastReborn=ctx.currentTime;return true;
  }
  function eventVoices(dt,p,enemyList,transitioning){
    if(transitioning || p.hp<=0){battleVoiceUntil=-100;battleCalmT=0;castAttempted=false;guardVoiceT=0;guardVoiced=false;return;}
    if(p.hp>(p.maxHp||100)*.3)lowHealthSpoken=false;
    else if(!lowHealthSpoken && !voiceNode && ctx.currentTime-lastVoice>=3){
      if(voice('danger',false,.8,3))lowHealthSpoken=true;
    }
    if(p.state==='block'){
      guardVoiceT+=dt;
      if(guardVoiceT>=1.2 && !guardVoiced && ctx.currentTime-lastWater>=30 && voice('water',false,.74,8)){
        guardVoiced=true;lastWater=ctx.currentTime;
      }
    } else {guardVoiceT=0;guardVoiced=false;}
    if(p.state!=='beamCharge')castAttempted=false;
    else if((p.beamT||0)>=.30 && !castAttempted){
      castAttempted=true;
      // Pick once per hold; releasing must not replace or repeat its line.
      beamVoicePlayed=randomBeamVoice();
    }
    if(battleSpoken || ctx.currentTime>battleVoiceUntil){battleCalmT=0;return;}
    const threat=enemyList.some(e=>!e.removed && e.state!=='dead' && Math.abs(e.x-p.x)<750);
    const calm=p.onGround && p.hp>(p.maxHp||100)*.3 && ['idle','walk','run'].includes(p.state);
    battleCalmT=calm && !threat?battleCalmT+dt:0;
    if(battleCalmT>=3.5 && !voiceNode && ctx.currentTime-lastVoice>=14){
      battleVoiceUntil=-100;
      if(Math.random()<.6){
        const pool=['safe','confident','chuckle'];
        if(voice(pool[Math.floor(Math.random()*pool.length)],false,.72))battleSpoken=true;
      }
    }
  }
  function tick(dt,p,enemyList,index,portalGlow,transitioning=false){
    if(!active || hidden || !ctx) return;
    level=index; loops();envT+=dt;dripT-=dt;portalT-=dt;chargeT-=dt;
    updateBattleMusic(dt,p,enemyList,transitioning);
    if(ambient) ambient.gain.gain.setTargetAtTime(.45+index*.12,ctx.currentTime,.8);
    musicLevel+=( (p.state==='dead'?0:.7)-musicLevel)*Math.min(1,dt/.4);syncTrack();
    if(dripT<=0){dripT=4+Math.random()*8;sfx(index===3?'crack':'drip',(Math.random()-.5)*1200,index===3?.12:.4);}
    if(portalGlow>.1 && portalT<=0){portalT=1.8;sfx('portal',0,portalGlow*.16);}
    defense(p,transitioning);
    eventVoices(dt,p,enemyList,transitioning);
    if(p.state==='beamCharge' && chargeT<=0){chargeT=.32;sfx('charge',0,.30+Math.min(p.beamT||0,1)*.4);}
    footsteps(p,dt,0);
    for(const e of enemyList) footsteps(e,dt,e.x-p.x,true);
    explore(dt,p,enemyList,transitioning);
  }
  // Exploration is gated by nearby live enemies, not by whether an attack key is held.
  // Chance rolls happen on timed opportunities, never on every animation frame.
  let quietT=0, moveT=0, idleT=0, foleyT=3, dailyT=6, dailySpoken=new Set(), magicRecent=new Map(), flavorRecent=new Map(), exploreRecent=new Map(), lastIdleLine='', lastExploreLine='';
  function resetExplore(){quietT=0;moveT=0;idleT=0;foleyT=3;dailyT=6;dailySpoken.clear();magicRecent.clear();flavorRecent.clear();exploreRecent.clear();lastIdleLine='';lastExploreLine='';}
  function exploreVoice(key){
    if(!voice(key,false,.68,14,'explore'))return false;
    if(['magicAttack','magicHeal','magicSummon'].includes(key))magicRecent.set(key,ctx.currentTime);
    else if(['chuckle','reaction','tease'].includes(key))flavorRecent.set(key,ctx.currentTime);
    else dailySpoken.add(key);
    exploreRecent.set(key,ctx.currentTime);
    lastExploreLine=key;
    return true;
  }
  function magicCandidates(){
    return ['magicAttack','magicHeal','magicSummon']
      .filter(key=>ctx.currentTime-(magicRecent.get(key)??-100)>=60)
      .sort((a,b)=>(magicRecent.get(a)??-100)-(magicRecent.get(b)??-100));
  }
  function flavorCandidates(moving){
    return (moving?['chuckle']:['chuckle','reaction','tease'])
      .filter(key=>ctx.currentTime-(flavorRecent.get(key)??-100)>=90);
  }
  function sortExplore(keys){return keys.sort((a,b)=>(exploreRecent.get(a)??-100)-(exploreRecent.get(b)??-100));}
  function explore(dt,p,enemyList,transitioning){
    const threat=enemyList.some(e=>!e.removed && e.state!=='dead' && Math.abs(e.x-p.x)<750);
    const calm=p.hp>0 && p.onGround && ['idle','walk','run'].includes(p.state);
    if(transitioning || threat || !calm){quietT=0;moveT=0;idleT=0;foleyT=3;dailyT=6;return;}
    quietT+=dt;
    if(quietT<6) return;
    const moving=p.state!=='idle' && Math.abs(p.vx)>12;
    moveT=moving?moveT+dt:0;idleT=moving?0:idleT+dt;foleyT-=dt;
    if(foleyT<=0){
      if(!moving || Math.random()<.6)sfx(Math.random()<(moving?.8:.55)?'cloth':'staff',0,moving?.42:.28);
      foleyT=moving?3+Math.random()*2:7+Math.random()*5;
    }
    if(moving){
      dailyT-=dt;
      if(dailyT>0 || moveT<2) return;
      dailyT=6+Math.random()*4;
      // Walking and running both have a 45% chance per opportunity, with a shared 30s voice gap.
      if(Math.random()>=.45 || voiceNode || ctx.currentTime-lastVoice<30) return;
      let candidates=sortExplore(['portal','retort'].filter(key=>!dailySpoken.has(key)).concat(magicCandidates(),flavorCandidates(true)));
      if(candidates.length>1)candidates=candidates.filter(key=>key!==lastExploreLine);
      if(candidates.length){
        const key=candidates[Math.floor(Math.random()*candidates.length)];
        exploreVoice(key);
      }
    } else if(!voiceNode && ctx.currentTime-lastVoice>=30 && idleT>=10 && !dailySpoken.has('portal')){
      exploreVoice('portal');
    } else if(idleT>=30){
      dailyT-=dt;
      if(dailyT<=0){
        dailyT=10;
        if(!voiceNode && ctx.currentTime-lastVoice>=45 && Math.random()<.35){
          let candidates=sortExplore(['idleConcern',...magicCandidates(),...flavorCandidates(false)]);
          if(candidates.length>1)candidates=candidates.filter(key=>key!==lastIdleLine);
          const key=candidates[Math.floor(Math.random()*candidates.length)];
          if(exploreVoice(key))lastIdleLine=key;
        }
      }
    }
  }
  const feet=new WeakMap();
  function footsteps(a,dt,x,enemy=false){
    if(!a.onGround || Math.abs(a.vx)<12 || !['walk','run'].includes(a.state)){feet.delete(a);return;}
    let t=(feet.get(a)||0)+dt;
    const interval=enemy?.48:a.state==='run'?.26:.40;
    if(t>=interval){sfx(enemy?'enemyStep':a.state==='run'?'run':'step',x,enemy?.65:.55);t%=interval;}
    feet.set(a,t);
  }
  function state(isPlayer,name,old,x){
    if(!active) return;
    if(isPlayer){
      if(name!=='block')stopGuard();
      const map={jump:'jump',attack:'charge',beamCharge:'charge',ultCharge:'charge',storm:'storm',block:'block',dead:'death'};
      if(map[name]) sfx(map[name]);
      if(old==='block' && name==='blockRelease')sfx('blockRelease',0,.85);
      if(name==='dead'){stopVoice();voice((deathVariant++%2)?'regret':'failure',true,.78);}
      if(name==='storm')skillOrOriginal('storm','magicSummon',false,.82,6);
      if(name==='blade')skillOrOriginal('blade','magicAttack',true,.82);
      if(name==='ultCharge')skillOrOriginal('ultimate','cast',true,.88);
      if(name==='beamFire'){if(!beamVoicePlayed)randomBeamVoice();beamVoicePlayed=false;}
      if(name==='beamCharge'){castAttempted=false;beamVoicePlayed=false;}
      if(name==='enchantCharge'&&old!=='enchantCharge')skill('enchant');
      if(name==='hit' && ['cast','magicAttack','magicSummon','water','healing',...combatCloneNames].includes(voiceName))stopVoice();
      if(name==='hit' && ['beamCharge','storm','attack'].includes(old)) sfx('interrupt');
    } else {if(name==='attack')sfx('windup',x);if(name==='dead'){sfx('enemyDeath',x);if(Math.abs(x)<750 && !battleSpoken){battleVoiceUntil=ctx.currentTime+20;battleCalmT=0;}}}
  }
  function reset(){
    bossSoundPaused=false;stopBossSounds();bossSoundEvents.length=0;
    musicLevel=.7;
    battleWanted=bossWanted=false;battleMix=bossMix=combatHold=0;if(battleTrack)battleTrack.currentTime=0;if(bossTrack)bossTrack.currentTime=0;
    endNarration(true);beamVoicePlayed=false;pendingStart=false;stopVoice();for(const s of [...sources]){try{s.stop();}catch(_){}}sources.clear();stopLoops();recent.clear();
    lastVoice=-100;lastVoiceContext='event';portalT=0;chargeT=0;dripT=4;castAttempted=false;battleVoiceUntil=-100;battleCalmT=0;battleSpoken=false;lastBeamLine='';lastEnchantLine='';lowHealthSpoken=false;guardVoiceT=0;guardVoiced=false;lastWater=-100;resetExplore();loops();
  }
  function mount(){
    const menu=document.querySelector('#titleScreen .titleMenu');
    if(menu)for(const button of menu.querySelectorAll('button')){
      button.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!button.disabled)uiSelect();});
      button.addEventListener('focus',()=>{if(button.matches(':focus-visible')&&!button.disabled)uiSelect();});
    }
    const style=document.createElement('style');style.textContent='#audioPanel{position:fixed;right:12px;bottom:48px;z-index:40;color:#c8e6f5;background:#09131fe8;border:1px solid #74bbdf55;border-radius:8px;padding:8px 12px;font:12px "Microsoft YaHei",sans-serif}#audioPanel summary{cursor:pointer}#audioPanel label{display:flex;align-items:center;gap:8px;margin:9px 0}#audioPanel input{width:100px;accent-color:#8ad7ff}#audioPanel button{color:#c8e6f5;background:#152c40;border:1px solid #74bbdf55;border-radius:4px;padding:4px 9px}';document.head.appendChild(style);
    const panel=document.createElement('details');panel.id='audioPanel';
    panel.innerHTML='<summary>声音设置 · M 静音</summary><button type="button" id="audioMute">静音</button>';
    const names={master:'总音量',sfx:'音效',voice:'人物语音',music:'音乐',amb:'环境'};
    for(const k in settings){
      const row=document.createElement('div');row.className='audioVolumeRow';
      const name=document.createElement('span');name.textContent=names[k];row.appendChild(name);
      const down=document.createElement('button');down.type='button';down.textContent='−';down.setAttribute('aria-label','降低'+names[k]);
      const value=document.createElement('output');value.setAttribute('aria-label',names[k]);value.setAttribute('aria-live','polite');
      const up=document.createElement('button');up.type='button';up.textContent='+';up.setAttribute('aria-label','提高'+names[k]);
      const refresh=()=>{const pct=Math.round(settings[k]*100);value.textContent=pct+'%';down.disabled=pct===0;up.disabled=pct===100;};
      const adjust=step=>{settings[k]=Math.max(0,Math.min(100,Math.round(settings[k]*100)+step))/100;gains();save();refresh();};
      down.onclick=()=>adjust(-5);up.onclick=()=>adjust(5);refresh();
      row.append(down,value,up);panel.appendChild(row);
    }
    panel.addEventListener('keydown',e=>e.stopPropagation());
    for(const event of ['mousedown','touchstart','pointerdown'])panel.addEventListener(event,e=>{e.stopPropagation();unlock();});
    document.body.appendChild(panel);
    const helpDialog=document.getElementById('controlsDialog');
    if(helpDialog)new MutationObserver(()=>pauseNarration(helpDialog.open)).observe(helpDialog,{attributes:true,attributeFilter:['open']});
    document.getElementById('audioMute').onclick=toggle;
  }
  function toggle(){muted=!muted;gains();const b=document.getElementById('audioMute');if(b)b.textContent=muted?'开启声音':'静音';}
  const resumeAudio=()=>{playTrack();loops();resumeNarration();};
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden){stopPlayback();if(ctx)ctx.suspend().catch(()=>{});}else if(active||menuMusic){playTrack();if(ctx)ctx.resume().then(resumeAudio).catch(()=>{});}gains();});
  window.addEventListener('blur',()=>{hidden=true;stopPlayback();gains();if(ctx)ctx.suspend().catch(()=>{});});
  window.addEventListener('focus',()=>{hidden=document.hidden;gains();if(!hidden&&(active||menuMusic)){playTrack();if(ctx)ctx.resume().then(resumeAudio).catch(()=>{});}});
  window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='m'&&!e.repeat)toggle();unlock();});
  window.addEventListener('pointerdown',unlock,true);
  if(window.FROST_BACKGROUND_TRACK)title();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);else mount();
  return {unlock,title,start,stop,sfx,bossCue,bossMotion,bossPause,bossStop:stopBossSounds,uiClick,voice,attack,skill,narrate,endNarration,tick,state,reset,help,reborn,lines,cinematic(value){cinematicPlayback=!!value;if(cinematicPlayback)stopBossSounds();syncMusic(.15);}, get status(){return {active,muted,state:ctx&&ctx.state,voiceReady:!!voiceBuffer,cloneReady:!!cloneBuffer,enchantReady:!!enchantBuffer,voiceName,narrationName,narrationOffset:narrationOffset+(narrationPlaying?Math.max(0,ctx.currentTime-narrationStarted):0),narrationPaused,sources:sources.size,settings:{...settings},bossAudio:{ready:bossSamplesReady,errors:[...bossSamplesErrors],voices:bossSources.size,roaring:bossRoars.size>0,chargeLoop:!!bossChargeNode,paused:bossSoundPaused,events:bossSoundEvents.slice(-96)},battleMusic:battleTrack?{paused:battleTrack.paused,time:battleTrack.currentTime,duration:battleTrack.duration,volume:battleTrack.volume,loop:battleTrack.loop,error:battleTrack.error?.code||null}:null,bossMusic:bossTrack?{paused:bossTrack.paused,time:bossTrack.currentTime,duration:bossTrack.duration,volume:bossTrack.volume,loop:bossTrack.loop,error:bossTrack.error?.code||null}:null,musicMode:bossWanted?'boss':battleWanted?'battle':'explore',bossMix,battleMix,music:backgroundTrack?{paused:backgroundTrack.paused,time:backgroundTrack.currentTime,duration:backgroundTrack.duration,volume:backgroundTrack.volume,loop:backgroundTrack.loop,error:backgroundTrack.error?.code||null}:null};}};
})();
