/* 本地检查点：单次 IndexedDB 事务同时更新主档与上一份有效备份。 */
(() => {
  'use strict';
  const DB_NAME='frost-whisper-saves',STORE='checkpoints',VERSION=1;
  const chapters=[-1,0,1,2,3];
  const flags=['steleAwake','crystalSealed','altarAwake','grandmaTalked','loreRead','introSeen','cleared'];
  const copy=value=>JSON.parse(JSON.stringify(value));
  const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  function valid(record){
    if(!record||record.schemaVersion!==VERSION||typeof record.savedAt!=='string'||!Number.isFinite(Date.parse(record.savedAt)))return false;
    const p=record.checkpoint;
    if(!p||!chapters.includes(p.chapter)||!integer(p.xpLevel,1,10000)||!integer(p.xp,0,100+(p.xpLevel-1)*50-1))return false;
    if(p.energy!==undefined&&(!Number.isFinite(p.energy)||p.energy<0||p.energy>100))return false;
    if(p.novaCooldown!==undefined&&(!Number.isFinite(p.novaCooldown)||p.novaCooldown<0||p.novaCooldown>15))return false;
    if(typeof p.crownAcquired!=='boolean'||typeof p.endingSeen!=='boolean'||typeof p.crownThoughtSeen!=='boolean'||!p.levels)return false;
    if(p.endingCardSeen!==undefined&&typeof p.endingCardSeen!=='boolean')return false;
    return chapters.every(chapter=>{
      const s=p.levels[String(chapter)];
      return s&&flags.every(flag=>typeof s[flag]==='boolean')&&['healLeft','manaLeft'].every(key=>s[key]===undefined||integer(s[key],0,2))
        &&(s.bossDefeated===undefined||typeof s.bossDefeated==='boolean');
    });
  }
  function envelope(checkpoint){
    const record={schemaVersion:VERSION,savedAt:new Date().toISOString(),checkpoint:copy(checkpoint)};
    if(!valid(record))throw new Error('INVALID_CHECKPOINT');
    return record;
  }
  let connection=null,opening=null,queue=Promise.resolve();
  function open(){
    if(connection)return Promise.resolve(connection);
    if(opening)return opening;
    opening=new Promise((resolve,reject)=>{
      let request,done=false;
      const fail=error=>{if(done)return;done=true;clearTimeout(timer);reject(error);};
      const timer=setTimeout(()=>fail(new Error('STORAGE_TIMEOUT')),6000);
      try{request=indexedDB.open(DB_NAME,1);}catch(error){fail(error);return;}
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
      request.onerror=()=>fail(request.error||new Error('STORAGE_UNAVAILABLE'));
      request.onblocked=()=>fail(new Error('STORAGE_BLOCKED'));
      request.onsuccess=()=>{
        if(done){request.result.close();return;}
        done=true;clearTimeout(timer);connection=request.result;
        connection.onversionchange=()=>{connection.close();connection=null;opening=null;};
        resolve(connection);
      };
    }).catch(error=>{opening=null;throw error;});
    return opening;
  }
  async function load(){
    try{
      const db=await open();
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE);
        const primary=store.get('primary'),backup=store.get('backup');
        tx.oncomplete=()=>{
          const a=primary.result,b=backup.result;
          if(valid(a))resolve({status:'saved',record:copy(a),hasData:true});
          else if(valid(b))resolve({status:'recovered',record:copy(b),hasData:true});
          else resolve({status:a||b?'invalid':'empty',record:null,hasData:!!(a||b)});
        };
        tx.onerror=tx.onabort=()=>reject(tx.error||new Error('STORAGE_READ_FAILED'));
      });
    }catch(error){return {status:'unavailable',record:null,hasData:false,error:String(error.message||error)};}
  }
  function write(checkpoint){
    // Capture at request time, not later when this write reaches the queue.
    let record;
    try{record=envelope(checkpoint);}catch(error){return Promise.reject(error);}
    const task=queue.then(async()=>{
      const db=await open();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
        const read=store.get('primary');
        read.onsuccess=()=>{
          if(valid(read.result))store.put(read.result,'backup');
          store.put(record,'primary');
        };
        tx.oncomplete=resolve;
        tx.onerror=tx.onabort=()=>reject(tx.error||new Error('STORAGE_WRITE_FAILED'));
      });
      return copy(record);
    });
    queue=task.catch(()=>{});
    return task;
  }
  window.FrostSaveStore={load,write,valid,copy};
})();
