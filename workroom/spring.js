// Charge is the remaining angular travel measured in beats. Above the knee a
// governor limits speed. Below it the remaining travel decays quadratically.
const spring = {
  get capacity(){return Math.max(32,state.lengths[state.level])}, knee:8, rate:1.65, beatsPerTurn:8,
  duration(q){
    if(q<=this.knee)return 2*Math.sqrt(this.knee*Math.max(0,q))/this.rate;
    return (q+this.knee)/this.rate;
  },
  remaining(seconds){
    if(seconds<=0)return 0;
    if(seconds<=this.duration(this.knee))return (seconds*this.rate)**2/(4*this.knee);
    return seconds*this.rate-this.knee;
  }
};
let reserve=0, position=0, windingAngle=0, gesture=null, activeRun=null, runBus=null;
function currentDrive(now){
  if(!activeRun)return {energy:reserve,position};
  const run=activeRun,elapsed=Math.max(0,now-run.start);
  const energy=spring.remaining(Math.max(0,spring.duration(run.energy)-elapsed));
  return {energy,position:run.position+run.energy-energy};
}
function playBeat(b,at){
  const l=state.level;
  state.tracks[l].forEach((row,r)=>{
    if(row[b]){voice(scales[l][r]+12,at,.12,runBus);contacts.push({r,b,at})}
  });

}
function halt(preserve=true,natural=false){
  ++session;
  if(playing){
    const sample=currentDrive(ac.currentTime);reserve=sample.energy;position=sample.position;
    if(!natural){runBus.gain.cancelScheduledValues(ac.currentTime);runBus.gain.setTargetAtTime(0,ac.currentTime,.006)}
    const bus=runBus;setTimeout(()=>bus.disconnect(),1800);
  }
  clearInterval(timer);playing=false;activeRun=null;runBus=null;contacts.length=0;
  if(!preserve){position=0;reserve=0;wheelSteps.fill(0)}
  if(!natural){lastHit=-100;flashes.length=0;$('lastNotes').textContent='원판 아래 단면'}
  phase=(position/state.lengths[state.level])%1;dirty=true;cursor();
}
function stop(){halt(false)}
async function play(){
  if(playing)return
  if(reserve<.001){return}
  const id=++session;
  try{await sound()}catch{showIssue('브라우저에서 소리를 켠 뒤 다시 연주해 주세요.');return}
  if(id!==session)return;
  const run=activeRun={start:ac.currentTime+.035,position,energy:reserve};
  let next=Math.ceil(position-1e-8);
  runBus=ac.createGain();runBus.connect(master);playing=true;
  const duration=spring.duration(run.energy);
  function tick(){
    if(activeRun!==run)return;
    const now=ac.currentTime,end=run.position+run.energy;
    while(next<end-1e-8){
      const at=run.start+duration-spring.duration(end-next);
      if(at>now+.085)break;
      if(at>=now-.045)playBeat(next%state.lengths[state.level],Math.max(now,at));
      next++;
    }
    if(now>=run.start+duration){cursor();halt(true,true);}
  }
  tick();timer=setInterval(tick,20);
}
function drawHandle(){
  const ctx=$('handle').getContext('2d');
  ctx.clearRect(0,0,350,256);
  ctx.imageSmoothingEnabled=false;
  const mechanism=images.through_shaft;
  if(!mechanism?.naturalWidth)return;
  ctx.drawImage(mechanism,0,78);
  // Only the outboard grip rocks. Both journals and the concealed axle stay fixed.
  const grip=images.wood_grip;
  if(!grip?.naturalWidth)return;
  const end=128+Math.round(handleOffset);
  const top=Math.min(128,end),height=Math.max(6,Math.abs(end-128));
  for(const [x,w,color] of [[185,10,'#553033'],[186,7,'#b88040'],[187,2,'#f2cf86']]){
    ctx.fillStyle=color;ctx.fillRect(x,top,w,height);
  }
  ctx.fillStyle='#bd8849';ctx.fillRect(179,125,14,7);ctx.fillRect(185,end-4,24,9);
  ctx.drawImage(grip,204,end-24);
}
let handleOffset=81;
let clickBuffer,clickLoad,lastClick=-1;
function loadWinding(){
  if(!clickLoad)clickLoad=ac.decodeAudioData(Uint8Array.from(atob('@@WINDER_AUDIO@@'),c=>c.charCodeAt(0)).buffer).then(b=>clickBuffer=b).catch(()=>{clickLoad=null});
  return clickLoad;
}
function ratchet(){
  if(!clickBuffer||ac.currentTime-lastClick<.065)return;
  lastClick=ac.currentTime;
  const src=ac.createBufferSource(),gain=ac.createGain();
  src.buffer=clickBuffer;gain.gain.value=.55;src.connect(gain).connect(master);
  const length=Math.min(.10,clickBuffer.duration);
  gain.gain.setTargetAtTime(0,lastClick+length*.65,.009);
  src.start(lastClick,0,length);src.onended=()=>{src.disconnect();gain.disconnect()};
}
function windBy(delta){
  if(delta<=0)return;
  windingAngle=(windingAngle+delta)%TAU;
  reserve=Math.min(spring.capacity,reserve+delta/TAU*spring.beatsPerTurn);drawHandle();
}
function attachWinder(){
  const el=$('wind');
  el.onpointerdown=e=>{
    if(gesture||e.button!==0)return;
    e.preventDefault();sound().then(loadWinding).catch(()=>{});el.setPointerCapture(e.pointerId);
    gesture={id:e.pointerId,lastY:e.clientY,pixels:0,added:0};
  };
  el.onpointermove=e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const dy=e.clientY-gesture.lastY,distance=Math.abs(dy);
    handleOffset=Math.max(-84,Math.min(84,handleOffset+dy*350/$('handle').getBoundingClientRect().width));
    const room=Math.max(0,spring.capacity-currentDrive(ac?.currentTime||0).energy-gesture.added);
    const gained=Math.min(room,distance*spring.beatsPerTurn/160);
    gesture.pixels+=gained*160/spring.beatsPerTurn;
    if(gesture.pixels>=9){gesture.pixels%=9;ratchet()}
    gesture.lastY=e.clientY;
    gesture.added+=gained;
    drawHandle();
  };
  function release(e){
    if(!gesture||gesture.id!==e.pointerId)return;
    const added=gesture.added;gesture=null;
    if(added>0){halt();windBy(added*TAU/spring.beatsPerTurn);play()}
  }
  el.onpointerup=el.onpointercancel=el.onlostpointercapture=release;
  el.onclick=e=>{if(e.detail===0&&!gesture&&currentDrive(ac?.currentTime||0).energy<spring.capacity-.001){halt();handleOffset=handleOffset>0?-81:81;windBy(TAU/2);sound().then(loadWinding).then(ratchet).catch(()=>{});play()}};
  drawHandle();
}
