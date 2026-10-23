/* Approved video portraits: transparent atlases, game-time playback, no video decoders. */
(() => {
  'use strict';
  const SIZE = 192, COLUMNS = 12, FRAMES = 138, FPS = 30;
  const OUTPUT_SIZE=320, PAD_X=64, PAD_Y=99;
  const TRANSITION_SECONDS = .18;
  const LOW_HEALTH_RATIO = .3;

  function keyFor(levelIndex, hp, maxHp) {
    const style = levelIndex === 0 ? 'hat' : levelIndex === 1 ? 'bare' : 'crown';
    const low = maxHp > 0 && hp / maxHp <= LOW_HEALTH_RATIO;
    return style + (low ? '_low' : '_normal');
  }

  function create(pending) {
    const assets = {};
    for (const style of ['hat', 'bare', 'crown']) {
      for (const health of ['normal', 'low']) {
        const key = style + '_' + health;
        const image = new Image();
        assets[key] = image;
        pending.push({im: image, path: 'artwork/动态头像_v1/' + key + '.webp'});
      }
    }
    let activeKey = '', previousKey = '', changedAt = 0;
    const blendCanvas = document.createElement('canvas');
    blendCanvas.width = blendCanvas.height = OUTPUT_SIZE;
    const blendCtx = blendCanvas.getContext('2d');

    function reset() {
      activeKey = previousKey = '';
      changedAt = 0;
    }

    // 以无头饰版本的脸部尺寸、眼线为基准；帽尖允许超出头像画布。
    function drawAlignedFrame(target,image,key,x,y){
      const style=key.split('_')[0];
      const source={hat:{zoom:.175,eyeX:112,eyeY:110},bare:{zoom:.28,eyeX:110,eyeY:91},crown:{zoom:.205,eyeX:110,eyeY:110}}[style];
      const scale=.28/source.zoom;
      target.drawImage(image,x,y,SIZE,SIZE,PAD_X+110-source.eyeX*scale,PAD_Y+91-source.eyeY*scale,SIZE*scale,SIZE*scale);
    }
    function draw(ctx, {levelIndex, hp, maxHp, time, reducedMotion = false, dead = false}) {
      const key = keyFor(levelIndex, hp, maxHp);
      const image = assets[key];
      if (!image.complete || !image.naturalWidth) return false;
      if (key !== activeKey) {
        // Only blend health changes within the same chapter appearance.
        previousKey = activeKey.split('_')[0] === key.split('_')[0] ? activeKey : '';
        activeKey = key;
        changedAt = time;
      }
      const frame = reducedMotion || dead ? 120 : Math.floor(Math.max(0, time) * FPS) % FRAMES;
      const x = frame % COLUMNS * SIZE, y = Math.floor(frame / COLUMNS) * SIZE;
      const progress = reducedMotion ? 1 : Math.min(1, Math.max(0, (time - changedAt) / TRANSITION_SECONDS));
      const oldImage = assets[previousKey];
      if (oldImage && progress < 1 && oldImage.complete && oldImage.naturalWidth) {
        // Add weighted premultiplied layers so opaque facial pixels stay opaque mid-fade.
        blendCtx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        blendCtx.globalCompositeOperation = 'source-over';
        blendCtx.globalAlpha = 1 - progress;
        drawAlignedFrame(blendCtx,oldImage,previousKey,x,y);
        blendCtx.globalCompositeOperation = 'lighter';
        blendCtx.globalAlpha = progress;
        drawAlignedFrame(blendCtx,image,key,x,y);
        blendCtx.globalAlpha = 1;
        blendCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(blendCanvas,6-PAD_X*98/SIZE,12-PAD_Y*98/SIZE,OUTPUT_SIZE*98/SIZE,OUTPUT_SIZE*98/SIZE);
      } else {
        blendCtx.clearRect(0,0,OUTPUT_SIZE,OUTPUT_SIZE);
        blendCtx.globalAlpha=1;blendCtx.globalCompositeOperation='source-over';
        drawAlignedFrame(blendCtx,image,key,x,y);
        ctx.drawImage(blendCanvas,6-PAD_X*98/SIZE,12-PAD_Y*98/SIZE,OUTPUT_SIZE*98/SIZE,OUTPUT_SIZE*98/SIZE);
      }
      if (progress >= 1) previousKey = '';
      return true;
    }

    return {draw, reset, assets};
  }

  window.FrostPortraits = {create, keyFor};
})();
