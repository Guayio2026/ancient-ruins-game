// Start the title music before loading the game's images or voice packs.
(() => {
  if(window.FROST_AUDIO_PREVIEW)return;
  const audio=new Audio(new URL('../音乐/Unexplored - TAD/Unexplored short ver.mp3',document.currentScript.src).href);
  audio.preload='auto';audio.loop=true;
  let master=.7,music=.25;
  try{const s=JSON.parse(localStorage.getItem('frost-audio-v1'));if(Number.isFinite(s?.master))master=Math.max(0,Math.min(1,s.master));if(Number.isFinite(s?.music))music=Math.max(0,Math.min(1,s.music));}catch(_){}
  audio.volume=master*music*.7;
  window.FROST_BACKGROUND_TRACK=audio;
  const play=()=>{if(!document.hidden&&audio.paused)audio.play().catch(()=>{});};
  play();
  // Cover gestures made while the rest of the game scripts are still loading.
  for(const name of ['pointerdown','keydown'])window.addEventListener(name,()=>{if(!window.FrostAudio)play();},true);
})();
