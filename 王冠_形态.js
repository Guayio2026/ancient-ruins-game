/* 王冠只替换视觉；逻辑动画、命中帧、蓄力时间和存档仍由原状态机管理。 */
window.FrostCrown = {
  create(pending, specs) {
    const clips = {};
    for (const s of specs) {
      const frames = Array.from({length:s.n}, (_,i) => {
        const im = new Image();
        pending.push({im,path:`artwork/王冠运行_v1/${s.dir}/f_${String(i+1).padStart(4,'0')}.webp`});
        return im;
      });
      clips[s.key] = {...s,frames,count:s.n,crown:true};
      // 新待机为人物比例基准；持剑/法阵片段的头部约大6%，不能按画布等高冒充同尺度。
      if(s.key==='iceIdle' || s.key==='spellHold') clips[s.key].hMul/=1.06;
    }
    const frame = (key, t, phase=false) => {
      const clip=clips[key];
      const index=phase ? Math.min(clip.count-1,Math.floor(Math.max(0,t)*clip.count))
        : clip.loop ? Math.floor(Math.max(0,t)*clip.fps)%clip.count
        : Math.min(clip.count-1,Math.floor(Math.max(0,t)*clip.fps));
      return {clip,index,img:clip.frames[index]};
    };
    clips.iceIdle.bladeAxes=[[110, 193.0, 213, 193.0], [110, 192.0, 213, 192.0], [110, 193.0, 213, 192.0], [110, 193.0, 213, 192.0], [110, 192.0, 213, 192.0], [110, 192.0, 213, 191.0], [110, 192.0, 213, 191.0], [110, 191.0, 214, 191.0], [110, 191.0, 213, 190.0], [110, 191.0, 214, 190.0], [110, 191.0, 212, 190.0], [110, 191.0, 214, 189.0], [110, 191.0, 214, 189.0], [110, 190.0, 214, 189.0], [110, 190.0, 214, 189.0], [110, 189.0, 215, 187.0], [110, 189.0, 216, 187.0], [110, 189.0, 216, 187.0], [110, 189.0, 215, 187.0], [110, 189.0, 217, 187.0], [110, 189.0, 216, 187.0], [110, 189.0, 217, 187.0], [110, 189.0, 216, 187.0], [110, 188.0, 215, 186.0], [110, 188.0, 217, 186.0], [110, 188.0, 217, 186.0], [110, 188.0, 217, 186.0], [110, 188.0, 217, 186.0], [110, 188.0, 218, 186.0], [110, 188.0, 217, 186.0], [110, 188.0, 217, 185.0], [110, 188.0, 217, 185.0], [110, 188.0, 218, 186.0], [110, 188.0, 218, 185.0], [110, 188.0, 216, 186.0], [110, 188.0, 216, 186.0], [110, 188.0, 216, 185.0], [110, 188.0, 216, 186.0], [110, 188.0, 216, 186.0], [110, 189.0, 216, 187.0], [110, 189.0, 215, 187.0], [110, 189.0, 215, 187.0], [110, 189.0, 215, 187.0], [110, 189.0, 215, 187.0], [110, 189.0, 216, 188.0], [110, 190.0, 215, 188.5], [110, 190.0, 215, 189.0], [110, 190.0, 214, 188.0], [110, 190.0, 214, 188.0], [110, 191.0, 213, 190.0], [110, 191.0, 213, 189.0], [110, 191.0, 214, 190.0], [110, 191.0, 215, 191.0], [110, 191.0, 214, 190.0], [110, 192.0, 213, 191.0], [110, 192.0, 212, 192.0], [110, 193.0, 213, 192.0], [110, 192.0, 213, 192.0], [110, 192.0, 213, 193.0], [110, 193.0, 213, 193.0], [110, 193.0, 211, 194.0], [110, 194.0, 212, 194.0], [110, 194.0, 212, 194.0], [110, 195.0, 212, 195.0], [110, 195.0, 212, 195.0]];
    // Match the hat's 40-sample airborne schedule: tuck on ascent,
    // extend on descent; retain existing crown pixels without generated poses.
    const jumpSamples=[...Array.from({length:20},(_,i)=>18+Math.round(i*8/19)),...Array.from({length:20},(_,i)=>27+Math.round(i*7/19))];
    clips.jumpMatched={...clips.jumpRise,key:'jumpMatched',frames:jumpSamples.map(i=>clips.jumpRise.frames[i]),count:40};
    clips.jumpMatched.sinkFn=(index,scale=1)=>{
      const c=clips.jumpMatched,h=c.frames[index]?.naturalHeight||382,q=Math.max(0,Math.min(1,(index-20)/19)),ease=q*q*(3-2*q);
      return ((h-359)*185*c.hMul/h-3.6)*ease*scale;
    };
    // Keep the contact foot on the platform while the knees absorb landing.
    const landingFeet=[345,332,330,328,324,319,317,318,320,323,328,334,339,342,345,349,355,358,360,361,364,366,367,369,370,371,372,373,373,374,374,375,375,375,376];
    clips.jumpLand.sinkFn=(index,scale=1)=>{
      const c=clips.jumpLand,h=c.frames[index]?.naturalHeight||382;
      return ((h-landingFeet[Math.min(index,34)])*185*c.hMul/h-3.6)*scale;
    };
    clips.jumpAir.sinkFn=(index,scale=1)=>{
      const c=clips.jumpAir,h=c.frames[index]?.naturalHeight||382,q=Math.max(0,Math.min(1,(index-10)/9)),ease=q*q*(3-2*q);
      return ((h-351)*185*c.hMul/h-3.6)*ease*scale;
    };
    return {
      clips,
      visual(p, guard) {
        const logical=p.clips[p.clip];
        const u=Math.min(1,p.animTime*logical.fps/logical.count);
        if(guard) return frame('iceIdle',p.enchantAnimTime);
        switch(p.clip) {
          case 'idle': case 'walk': case 'run': return frame(p.clip,p.animTime);
          case 'jump': {
            const time=p.jumpFxT>=0?p.jumpFxT:p.animTime;
            const duration=p.clips.jump.count/p.clips.jump.fps;
            return frame('jumpMatched',Math.min(1,time/duration),true);
          }
          case 'jumpLand': return frame('jumpLand',u,true);
          // 长按判定的0.16秒准备期就保持平剑，避免先闪上挑姿态再跳回蓄力。
          case 'combo1': return p.enchantCandidate ? frame('iceIdle',0) : frame('slashUp',u*.38,true);
          case 'combo2': return frame('slashUp',.38+u*.62,true);
          case 'combo3': return frame('slashDown3',u,true);
          case 'bladeSlash': return frame('slashDown3',u,true);
          case 'combo2rec': return frame('staffSpin',u,true);
          case 'enchantCharge':
            return frame('iceIdle',p.enchantAnimTime);
          // 10号法阵只有保持段；08号转杖承担起手，不能用满态法阵冒充成形。
          case 'block': return frame('defenseRaise',u,true);
          case 'blockHold': return frame('chargeHold',p.animTime);
          // Q与法帽同样复用举杖吟唱，按原0.8秒节奏播放，不硬插满态法阵。
          case 'beamCharge': case 'ultCharge': case 'storm':
            return frame('staffSpin',u,true);
          case 'beamHold': return frame('spellHold',p.animTime);
          case 'blockRelease': return frame('defenseRaise',1-u,true);
          case 'beamFire':
            if(p.beamTier===1 && p.crownTapPose){
              const pose=p.crownTapPose;
              if(pose.key==='staffSpin'){
                const from=pose.index/clips.staffSpin.count;
                return frame('staffSpin',from+(1-from)*u,true);
              }
              // 已举好杖的短按只保留少量自然摆动，不压缩播放整段法阵视频。
              return frame(pose.key,(pose.index+Math.min(3,Math.floor(u*4)))/clips[pose.key].count,true);
            }
            return u<.2 ? frame('staffSpin',u/.2,true) : frame('spellHold',(u-.2)/.8,true);
          case 'ranged': case 'ult':
            return u<.2 ? frame('staffSpin',u/.2,true) : frame('spellHold',(u-.2)/.8,true);
          case 'dead': return frame('dead',u,true);
          case 'hit': return frame('idle',0);
          default: return frame('idle',p.animTime);
        }
      }
    };
  }
};
