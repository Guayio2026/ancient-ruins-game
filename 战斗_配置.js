/* 战斗数值的唯一配置入口。伤害为 Lv.1 基础值；等级倍率在命中结算时只应用一次。 */
(function(root){
  'use strict';
  const wave=(at,...enemies)=>({at,enemies});
  const stats=(hp,damage,cooldown)=>({hp,damage,cooldown});
  const config={
    maxLevel:5,
    player:{baseHp:100,hpPerLevel:5,attackPerLevel:.05,
      combo:[20,24,36],beam:[0,28,45,70],beamFreeze:.5,
      bladeDamage:60,bladeCooldown:8,stormDamage:25,stormCooldown:10,
      ultDamage:100,novaCooldown:15,crownUltDamage:250,ultKill:15,ultHit:1,ultRegen:1,
      enchantMultiplier:1.15,enchantBurst:20},
    levels:[
      {maxEnemies:2,clearXp:0,stats:{minotaur:stats(90,10,1.4)},
        waves:[wave(.04,'minotaur'),wave(.35,'minotaur'),wave(.68,'minotaur','minotaur')]},
      {maxEnemies:2,clearXp:0,stats:{shieldGuard:stats(130,12,1.4),wraith:stats(75,10,2)},
        waves:[wave(.04,'shieldGuard'),wave(.24,'wraith'),wave(.46,'shieldGuard','wraith'),wave(.71,'shieldGuard','wraith')]},
      {maxEnemies:3,clearXp:0,stats:{breachGuard:stats(165,22,1.5),waterworks:stats(190,18,2.5),shieldGuard:stats(155,14,1.4),wraith:stats(90,12,2)},
        waves:[wave(.03,'breachGuard'),wave(.22,'waterworks'),wave(.43,'breachGuard','shieldGuard','wraith'),wave(.73,'waterworks','shieldGuard','wraith')]},
      {maxEnemies:3,clearXp:100,stats:{runeCarver:stats(120,21,2.4),breachGuard:stats(195,26,1.5),shieldGuard:stats(185,17,1.4)},
        waves:[wave(.02,'runeCarver'),wave(.24,'breachGuard','runeCarver'),wave(.52,'shieldGuard','breachGuard','runeCarver')]},
      {maxEnemies:2,clearXp:0,stats:{shieldGuard:stats(210,20,1.4),waterworks:stats(250,25,2.5),elite:{...stats(500,28,1.8),heavyDamage:36}},
        waves:[wave(.02,'shieldGuard','waterworks'),wave(.49,'elite')]}
    ],
    levelStats(level){
      const lv=Math.max(1,Math.min(this.maxLevel,Math.floor(level)||1));
      return {level:lv,maxHp:this.player.baseHp+(lv-1)*this.player.hpPerLevel,
        attackMultiplier:1+(lv-1)*this.player.attackPerLevel};
    },
    quota(index){return this.levels[index].waves.reduce((n,w)=>n+w.enemies.length,0);}
  };
  // 统一扩大生命与固定伤害；冷却、能量、百分比不参与换算。
  config.numberScale=10;
  // 小怪小幅增强；倍率在统一数值缩放前只应用一次。
  config.enemyTuning={hp:1.12,damage:1.08};
  for(const level of config.levels)for(const stat of Object.values(level.stats)){
    stat.hp=Math.round(stat.hp*config.enemyTuning.hp);
    for(const key of ['damage','heavyDamage'])if(typeof stat[key]==='number')stat[key]=+(stat[key]*config.enemyTuning.damage).toFixed(1);
  }
  for(const key of ['baseHp','hpPerLevel','bladeDamage','stormDamage','ultDamage','crownUltDamage','enchantBurst']) config.player[key]*=config.numberScale;
  for(const key of ['combo','beam']) config.player[key]=config.player[key].map(n=>n*config.numberScale);
  for(const level of config.levels) for(const stat of Object.values(level.stats))
    for(const key of ['hp','damage','heavyDamage']) if(typeof stat[key]==='number') stat[key]*=config.numberScale;
  if(typeof module==='object'&&module.exports)module.exports=config;
  else root.FrostBalance=config;
})(typeof window==='object'?window:globalThis);
