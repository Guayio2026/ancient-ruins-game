/* 屋顶火焰与远景共用坐标。环境时钟在独白期间继续，操作帮助暂停。 */
(() => {
  'use strict';
  const atlas = {cell:256, columns:10, frames:88, fps:20, base:.96875};
  const wideAtlas = {cellWidth:384,cellHeight:256,columns:10,frames:88,fps:20,base:.96875};
  // Each profile combines several independently timed plumes. This changes the
  // silhouette rather than stretching the same triangular flame at every roof.
  const profiles = {
    sheet:[[-.22,.80,1.15,0,.78],[.22,.78,.94,41,.68]],
    tower:[[0,.68,1,0,.75],[-.23,.39,.60,30,.48],[.23,.37,.51,63,.46]],
    split:[[-.27,.54,.94,7,.70],[.26,.52,.72,43,.73],[.02,.29,.37,72,.48]],
    low:[[-.22,.73,.71,11,.74],[.24,.70,.55,57,.72]],
  };
  const fires = [
    {x:95,y:445,w:300,h:235,profile:'sheet',phase:0,speed:.91,alpha:.82},
    {x:390,y:320,w:210,h:180,profile:'low',phase:15,speed:.77,alpha:.71},
    {x:650,y:535,w:390,h:300,profile:'split',phase:31,speed:1.09,alpha:.84},
    {x:985,y:350,w:250,h:275,profile:'tower',phase:47,speed:.86,alpha:.77},
    {x:1225,y:485,w:590,h:340,profile:'sheet',phase:9,speed:.96,alpha:.88},
    {x:1440,y:390,w:300,h:285,profile:'split',phase:58,speed:1.13,alpha:.78},
    {x:1295,y:685,w:350,h:395,profile:'tower',phase:70,speed:1.04,alpha:.85},
    {x:400,y:660,w:310,h:310,profile:'split',phase:38,speed:.83,alpha:.78},
    {x:1515,y:805,w:370,h:280,profile:'low',phase:23,speed:1.17,alpha:.82},
  ];
  function frameAt(time,phase,speed=1){
    const frame=((time*atlas.fps*speed+phase)%atlas.frames+atlas.frames)%atlas.frames;
    return {index:Math.floor(frame),next:(Math.floor(frame)+1)%atlas.frames,mix:frame%1};
  }
  function plume(ctx,image,frame,x,y,w,h,alpha,layout){
    const cw=layout.cellWidth||layout.cell,ch=layout.cellHeight||layout.cell;
    const draw=(index,weight)=>{
      if(weight<=0)return;
      ctx.globalAlpha=alpha*weight;
      ctx.drawImage(image,index%layout.columns*cw,Math.floor(index/layout.columns)*ch,
        cw,ch,x-w/2,y-h*layout.base,w,h);
    };
    // Interpolate source frames including 87 -> 0. Never stop at an atlas row
    // boundary or sample the unused cells at the end of the last row.
    draw(frame.index,1-frame.mix);
    draw(frame.next,frame.mix);
  }
  function draw(ctx,image,{wideImage,offsetX,offsetY,time,reducedMotion=false,width=1280}){
    if(!image.complete || !image.naturalWidth)return;
    const t=reducedMotion?0:time;
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    for(const fire of fires){
      const x=fire.x-Math.round(offsetX),y=fire.y+offsetY;
      if(x+fire.w/2<0 || x-fire.w/2>width)continue;
      const flicker=reducedMotion?1:.96+.04*Math.sin(t*4.7+fire.phase);
      const wide=(fire.profile==='sheet'||fire.profile==='low')&&wideImage?.complete&&wideImage.naturalWidth;
      const source=wide?wideImage:image,layout=wide?wideAtlas:atlas;
      for(const [offset,w,h,phase,opacity] of profiles[fire.profile]){
        const speed=fire.speed*(.94+(phase%11)*.013);
        const frame=frameAt(t,fire.phase+phase,speed);
        const breath=reducedMotion?1:1+.035*Math.sin(t*1.8+phase);
        plume(ctx,source,frame,x+offset*fire.w,y,fire.w*w,fire.h*h*breath,fire.alpha*opacity*flicker,layout);
      }
      if(reducedMotion)continue;
      // Few warm sparks. Their origins share the roof coordinate, never the foreground camera.
      for(let i=0;i<8;i++){
        const life=1.5+i*.19,age=(t+i*.39+fire.phase*.073)%life,p=age/life;
        const px=x+Math.sin(i*9.7+fire.phase)*fire.w*.25+Math.sin(age*2+i)*14;
        const py=y-25-age*(28+i*6);
        ctx.globalAlpha=fire.alpha*Math.sin(Math.PI*p)*.55;
        ctx.fillStyle=i%2?'#ff9a40':'#ffd082';
        ctx.fillRect(px,py,i%2?1:2,2);
      }
    }
    ctx.restore();
  }
  window.VillageFire=Object.freeze({draw,atlas,wideAtlas,fires,profiles,frameAt});
})();
