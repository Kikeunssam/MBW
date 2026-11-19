'use strict';
const $=id=>document.getElementById(id), TAU=Math.PI*2;
const worlds=['bedroom','village','library','galaxy'], titles=['아늑한 침실','산타 마을','앤틱 서재','은하수의 밤'], en=['Cozy Bedroom','Santa Village','Antique Library','Milky Way'];
const scales=[[60,64,67,72],[60,62,64,67,69,72],[60,62,64,65,67,69,71,72],[60,61,62,63,64,65,66,67,68,69,70,71]], shortSteps=[8,12,16,24],names=['도','도♯','레','레♯','미','파','파♯','솔','솔♯','라','라♯','시'];
const note=n=>n===72?'높은 도':names[n%12], key='mbw.glass.workroom.1';
/* PHOTO_MODULE */
function fresh(){return {version:2,lengths:[...shortSteps],theme:0,level:0,tracks:shortSteps.map((s,l)=>scales[l].map((_,r)=>Array.from({length:s*2},(_,b)=>+(l===0&&[0,1,2,1,3,2,1,0][b]===r))))}}
function valid(v){const int=(x,n)=>Number.isInteger(x)&&x>=0&&x<n;return v&&validPhotos(v.photos)&&(v.version===1||(v.version===2&&Array.isArray(v.lengths)&&v.lengths.length===4&&v.lengths.every((n,i)=>n===shortSteps[i]||n===2*shortSteps[i])))&&(v.title===undefined||(typeof v.title==="string"&&v.title.length<=32))&&(v.desk===undefined||["walnut","leather","damask"].includes(v.desk))&&int(v.theme,5)&&(v.theme!==4||!!v.photo)&&(!v.photo||(typeof v.photo==="string"&&v.photo.length===60000&&!/[^A-Za-z0-9+/]/.test(v.photo)))&&int(v.level,4)&&v.tracks?.length===4&&v.tracks.every((t,i)=>Array.isArray(t)&&t.length===scales[i].length&&t.every(r=>Array.isArray(r)&&r.length===shortSteps[i]*(v.version===1?1:2)&&r.every(a=>a===0||a===1)))}
function readWork(v){
 const {version,theme,level,tracks,title,desk,photos}=v;
 if(version===1){
   return {version:2,theme:photos?.[theme]?4:theme,level,title,photo:photos?.[theme]||photos?.find(Boolean)||null,lengths:[...shortSteps],
     tracks:tracks.map(rows=>rows.map(row=>row.concat(Array(row.length).fill(0))))};
 }
 const photo=v.photo||photos?.[theme]||photos?.find(Boolean)||null;
 return {version,theme:photos?.[theme]?4:theme,level,tracks,title,photo,lengths:v.lengths};
}
const listening=location.hash.startsWith("#listen=");
let state=fresh();if(!listening)try{const s=JSON.parse(localStorage.getItem(key));if(valid(s))state=readWork(s)}catch{}
let tableView=false, playing=false, time=0, phase=0, ac, master, timer, session=0;
const images={}, C=$('globe').getContext('2d');let dirty=true;
function showIssue(text){
 $('issueText').textContent=text;
 if(!$('issueDialog').open)$('issueDialog').showModal();
}
function save(){if(listening)return;try{localStorage.setItem(key,JSON.stringify(state));}catch{showIssue('이 기기에 저장할 공간이 부족해요. 공유 링크로 작품을 보관하세요.')}}
// 실제 오르골 녹음 15음(A♭4~A♭6, CC0). 가장 가까운 샘플을 골라 재생 속도로 음높이를 맞춘다.
// 샘플을 아직 못 읽었거나 디코딩에 실패하면 아래 합성음으로 낸다.
const NOTE_SAMPLES=@@NOTE_SAMPLES@@;
const SAMPLE_LEVEL=1.5; // 합성음과 피크·RMS가 비슷해지도록 맞춘 배율 (오프라인 렌더로 측정)
let sampleBank=null,sampleLoad=null;
function loadSamples(){
 if(sampleLoad)return sampleLoad;
 const decode=b64=>new Promise((ok,fail)=>{const p=ac.decodeAudioData(Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer,ok,fail);if(p&&p.then)p.then(ok,fail)});
 sampleLoad=Promise.all(Object.entries(NOTE_SAMPLES).map(async([m,b])=>({midi:+m,buf:await decode(b)})))
  .then(list=>{sampleBank=list.sort((a,b)=>a.midi-b.midi)}).catch(()=>{sampleBank=null});
 return sampleLoad;
}
function voice(midi,at,volume=.12,bus=master){
 if(sampleBank){
  let s=sampleBank[0];for(const x of sampleBank)if(Math.abs(x.midi-midi)<Math.abs(s.midi-midi))s=x;
  const src=ac.createBufferSource(),amp=ac.createGain();
  src.buffer=s.buf;src.playbackRate.value=2**((midi-s.midi)/12);amp.gain.value=volume*SAMPLE_LEVEL;
  src.connect(amp).connect(bus);src.start(at);src.onended=()=>{src.disconnect();amp.disconnect()};return;
 }
 for(const [ratio,gain,length] of [[1,1,1.45],[2.01,.32,.58],[3.97,.14,.23]]){const osc=ac.createOscillator(),amp=ac.createGain();osc.frequency.value=440*2**((midi-69)/12)*ratio;amp.gain.setValueAtTime(.00001,at);amp.gain.exponentialRampToValueAtTime(volume*gain,at+.008);amp.gain.exponentialRampToValueAtTime(.00001,at+length);osc.connect(amp).connect(bus);osc.start(at);osc.stop(at+length+.01);osc.onended=()=>{osc.disconnect();amp.disconnect()}}}
async function sound(){if(!ac){ac=new AudioContext();master=ac.createGain();master.gain.value=.65;const comp=ac.createDynamicsCompressor();master.connect(comp).connect(ac.destination)}await ac.resume();await Promise.race([loadSamples(),new Promise(r=>setTimeout(r,400))])}
function toggle(r,b){if(listening)return;const l=state.level;state.tracks[l][r][b]^=1;if(state.tracks[l][r][b]&&!playing)sound().then(()=>{master.gain.setValueAtTime(.65,ac.currentTime);voice(scales[l][r]+12,ac.currentTime)}).catch(()=>{});save();board();dirty=true}
const radius=(r,l)=>54+(r+.5)*114/scales[l].length;
// Both measured sprite landmarks land on (0, 0) before the common
// perspective projection. The bracket stays fixed while only the disc rotates.
const fittings = {
  disc: {asset:'disc', x:198.5, y:196.5, width:400, height:400},
  roller: {asset:'roller', x:6.5, y:9.5, width:220, height:22}
};
function fittingImage(part){
  return '<image aria-hidden="true" pointer-events="none" href="'+ASSETS[part.asset]+'" x="'+(-part.x)+'" y="'+(-part.y)+'" width="'+part.width+'" height="'+part.height+'"/>';
}
const beatsPerMeasure = level => level === 1 ? 3 : 4;
// Enamel inlays follow pitch class, so both octaves share their colour.
const enamel = ['#c14c59','#e77872','#da8949','#efb65b','#eac955','#86aa5c',
               '#51a489','#589aba','#687dc1','#9375b7','#ae73a6','#c97698'];
function noteTable(level, tracks) {
 const beats=beatsPerMeasure(level), slots=state.lengths[level];
 const bars=Array.from({length:slots/beats},(_,i)=>
   '<th class="bar" scope="colgroup" colspan="'+beats+'">'+(i+1)+'마디</th>');
 const edge=b=>b%beats===0?' class="downbeat"':'';
 const beatsRow=Array.from({length:slots},(_,b)=>
   '<th scope="col" data-beat="'+b+'"'+edge(b)+'>'+(b%beats+1)+'</th>').join('');
 const rows=tracks.map((row,r)=>{
   const pitch=scales[level][r], label=note(pitch);
   const cells=row.map((on,b)=>{
     const position=(1+Math.floor(b/beats))+'마디 '+(1+b%beats)+'박';
     return '<td data-beat="'+b+'"'+edge(b)+'><button data-r="'+r+'" data-b="'+b+'" aria-label="'+label+' '+position+'" aria-pressed="'+!!on+'">'+(on?'◆':'·')+'</button></td>';
   }).join('');
   return '<tr style="--enamel:'+enamel[pitch%12]+'"><th scope="row" class="pitch"><i aria-hidden="true"></i>'+label+'</th>'+cells+'</tr>';
 }).reverse().join('');
 return '<table aria-label="마디별 음 편집"><colgroup></colgroup>'+bars.map(()=>'<colgroup span="'+beats+'"></colgroup>').join('')+
   '<thead><tr><th class="corner" rowspan="2">음／박</th>'+bars.join('')+'</tr><tr>'+beatsRow+'</tr></thead><tbody>'+rows+'</tbody></table>';
}
function measureEngravings(slots, beats){
 let lines='';
 for(let start=0;start<slots;start+=beats){
   const angle=(start-.5)*360/slots;
   lines+='<g class="barline" aria-hidden="true" pointer-events="none" transform="rotate('+angle+')">'+
     '<path d="M49 0H174" stroke="#794035" stroke-width="2.6"/>'+
     '<path d="M49 -0.65H174" stroke="#ffe09a" stroke-width="1.2"/>'+
     '<path d="M171 0l3 -2 3 2 -3 2z" fill="#ffe09a" stroke="#885039" stroke-width=".8"/></g>';
 }
 return lines;
}
function markTableBeat(){
 if(!tableView)return;
 const box=$('table'), n=state.lengths[state.level], beats=beatsPerMeasure(state.level);
 const b=playing&&ac.currentTime>=activeRun.start?Math.floor(currentDrive(ac.currentTime).position+1e-8)%n:-1;
 if(box.dataset.current===String(b))return;
 box.dataset.current=String(b);
 for(const el of box.querySelectorAll('.nowBeat'))el.classList.remove('nowBeat');
 const label=$('beatPosition');label.textContent=b<0?'':(Math.floor(b/beats)+1)+'마디 · '+(b%beats+1)+'박';
 if(b<0)return;
 const cells=box.querySelectorAll('[data-beat="'+b+'"]');
 for(const el of cells)el.classList.add('nowBeat');
 if(cells.length&&box.clientWidth){
   const left=cells[0].getBoundingClientRect().left-box.getBoundingClientRect().left;
   const margin=box.querySelector('.corner').offsetWidth+6;
   if(left<margin||left+cells[0].offsetWidth>box.clientWidth)box.scrollLeft+=left-margin;
 }
}
function board(){const l=state.level,n=state.lengths[l],t=state.tracks[l].map(row=>row.slice(0,n)),svg=$('plate');let html='<defs>'+['blank','punched','strike'].map(k=>'<image id="spr-'+k+'" href="'+ASSETS[k]+'" width="15" height="15"/>').join('')+'</defs><ellipse cy="5" rx="195" ry="196" fill="#241b27"/><g id="rotor">'+fittingImage(fittings.disc);
html+=measureEngravings(n,beatsPerMeasure(l));
for(let b=0;b<n;b++){const a=b*TAU/n,co=Math.cos(a),si=Math.sin(a);html+='<path d="M'+(co*50)+' '+(si*50)+'L'+(co*170)+' '+(si*170)+'" stroke="#8d6330" stroke-width=".6"/><text x="'+co*181+'" y="'+(si*181+4)+'" fill="#35251f" font-size="11" text-anchor="middle">'+(b+1)+'</text>'}
for(let r=0;r<t.length;r++){const rad=radius(r,l);html+='<circle r="'+rad+'" fill="none" stroke="#94682f" stroke-width=".8"/>';for(let b=0;b<n;b++){const a=b*TAU/n,x=rad*Math.cos(a),y=rad*Math.sin(a),on=t[r][b],sz=Math.min(9,42/t.length+1,rad*Math.sin(Math.PI/n)*.92);html+='<g class="hole" role="button" tabindex="'+(r===0&&b===0?'0':'-1')+'" aria-label="'+note(scales[l][r])+' '+(b+1)+'박" aria-pressed="'+!!on+'" data-r="'+r+'" data-b="'+b+'" transform="translate('+x+' '+y+')"><title>'+note(scales[l][r])+' · '+(b+1)+'박</title><circle r="'+Math.min(13,55/t.length,rad*Math.sin(Math.PI/n))+'" fill="transparent"/><use href="#spr-'+(on?'punched':'blank')+'" transform="translate('+(-sz)+' '+(-sz)+') scale('+sz*2/15+')"/></g>'}}
svg.innerHTML=html+'</g>'+fittingImage(fittings.roller)+'<g id="sparks" pointer-events="none" aria-hidden="true"></g>';cursor();
$('count').textContent=t.length+'음 × '+n+'칸 · '+t.flat().reduce((a,b)=>a+b,0)+'음 선택';$('rules').textContent=['안쪽부터 도·미·솔·높은 도예요. 동그라미를 눌러 음을 찍으세요.','6음으로 세 박씩 묶어 왈츠를 만들어요.','도부터 높은 도까지 선율을 만들어요.','반음을 포함한 열두 음으로 선율을 만들어요.'][l];document.querySelectorAll('#discLength input').forEach((input,i)=>{
 const length=shortSteps[l]*(i+1);
 input.value=length;input.checked=length===n;
 input.nextElementSibling.textContent=length+'칸 · '+length/beatsPerMeasure(l)+'마디';
});
document.querySelectorAll('#pitchCount input')[l].checked=true;$('table').hidden=!tableView;$('switchView').textContent=tableView?'편집 표 닫기':'표로 편집';
if(tableView){$('table').innerHTML=noteTable(l,t);delete $('table').dataset.current;markTableBeat()}
}
const flashes=[],contacts=[],wheelSteps=Array(12).fill(0);
let lastHit=-100,focusLane=0;
function cursor(){
 markTableBeat();
 const rotor=$('rotor');if(rotor)rotor.setAttribute('transform','rotate('+(-phase*360)+')');
 const now=ac?.currentTime||0, hits=[];
 while(contacts.length&&contacts[0].at<=now){const hit=contacts.shift();wheelSteps[hit.r]++;flashes.push(hit);hits.push(hit.r);focusLane=hit.r;lastHit=hit.at}
 if(hits.length)$('lastNotes').textContent=hits.map(r=>note(scales[state.level][r])).join(' · ')+' 울림';
 while(flashes.length&&now-flashes[0].at>.23)flashes.shift();
 const glow=$('sparks');
 if(glow){let marks='';for(const hit of flashes){
   const age=now-hit.at,rad=radius(hit.r,state.level),a=(hit.b/state.lengths[state.level]-phase)*TAU;
   const x=Math.round(rad*Math.cos(a)),y=Math.round(rad*Math.sin(a)),size=Math.min(16,100/scales[state.level].length);
   marks+='<g transform="translate('+x+' '+y+')"><use href="#spr-strike" transform="translate('+(-size/2)+' '+(-size/2)+') scale('+size/15+')"/>';
   if(age<.13)marks+='<path d="M-1 -12h2v7h-2z M-9 -4h5v2h-5z M4 -4h5v2h-5z" fill="#fff1c0" shape-rendering="crispEdges"/>';
   marks+='</g>';
 }if(glow.innerHTML||marks)glow.innerHTML=marks}
 if(!$('explain').open)return;
 const age=Math.max(0,now-lastHit), u=Math.min(1,age/.085),spin=(wheelSteps[focusLane]-(1-u)**2)*45;
 const vib=age<.45?4*Math.exp(-8*age)*Math.sin(age*104):0;
 const points=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,r=i%2?12:19;return (62+Math.sin(a)*r)+','+(37-Math.cos(a)*r)}).join(' ');
 const lugX=age<.22?62+age*135:97;
 $('sectionView').innerHTML='<path d="M5 13H160" stroke="#c59a5f" stroke-width="5"/><path d="M'+lugX+' 15v8l6-8" fill="#d3aa65"/><polygon points="'+points+'" transform="rotate('+spin+' 62 37)" fill="#bd9456" stroke="#684827"/><circle cx="62" cy="37" r="4" fill="#47372b"/><path d="M149 60Q112 60 72 '+(52+vib)+'" fill="none" stroke="#c1d6de" stroke-width="4"/><rect x="145" y="54" width="16" height="14" fill="#ad8656"/><text x="10" y="80">돌기 → 별바퀴 → 금속 빗살</text>';
}
function picture(name,...args){if(images[name]?.complete&&images[name].naturalWidth)C.drawImage(images[name],...args)}
function pixel(x,y,w,h,color){
 C.fillStyle=color; C.fillRect(Math.round(x),Math.round(y),w,h);
}
let brightLamp;
function shadeLight(t){
 const base=images.bedroom;
 if(!base?.naturalWidth)return;
 if(!brightLamp){
   brightLamp=document.createElement('canvas');
   brightLamp.width=48;brightLamp.height=39;
   const ctx=brightLamp.getContext('2d');
   ctx.drawImage(base,44,120,48,39,0,0,48,39);
   const patch=ctx.getImageData(0,0,48,39), d=patch.data;
   for(let i=0;i<d.length;i+=4){
     const x=i/4%48,y=Math.floor(i/4/48);
     if(((x-22)/20)**2+((y-18)/12)**2>1||d[i]<184||d[i+1]<115)continue;
     const rgb=d[i+1]>171?[255,240,190]:[255,214,119];
     d.set(rgb,i);
   }
   ctx.putImageData(patch,0,0);
 }
 if(Math.sin(t*1.24)>.05)C.drawImage(brightLamp,44,120);
}
function bedroom(t){
 const breath=Math.round((1+Math.sin(t*1.8))*.55);
 const x=218,y=182;
 for(let n=0;n<21;n++){
   const u=n/20, py=y+20+5*Math.sin(u*Math.PI)-u*u*(6+6*Math.sin(t*1.65));
   pixel(x+34+n,py,4,4,'#51303b');
   pixel(x+34+n,py,3,2,n%7<3?'#a75d3d':'#d58b57');
 }
 picture('cat',x,y-breath,42,26+breath);
 // Brighten only the illuminated pixels of the painted lamp.
 shadeLight(t);
}
let villagePanes;
function lightWindows(t){
 if(!images.village?.naturalWidth)return;
 if(!villagePanes){
   const groups=[[85,161,34,32],[164,192,45,29],[419,194,43,26],[494,198,39,24],[627,180,53,43],[687,175,39,41]];
   villagePanes=groups.map(([x,y,w,h])=>{
     const pane=document.createElement('canvas');pane.width=w;pane.height=h;
     const ctx=pane.getContext('2d');ctx.drawImage(images.village,x,y,w,h,0,0,w,h);
     const patch=ctx.getImageData(0,0,w,h),d=patch.data;
     for(let i=0;i<d.length;i+=4){
       if(d[i]>200&&d[i+1]>120&&d[i+1]>d[i+2]*1.3){d[i]=174;d[i+1]=96;d[i+2]=52}else d[i+3]=0;
     }
     ctx.putImageData(patch,0,0);return {pane,x,y};
   });
 }
 villagePanes.forEach(({pane,x,y},i)=>{C.globalAlpha=(1+Math.sin(t*1.35+i*2.3))*.39;C.drawImage(pane,x,y)});
 C.globalAlpha=1;
}
function village(t){
 lightWindows(t);
 // Fly at native sprite resolution across the strip of sky above the roofs.
 const progress = ((t + 4) % 21) / 18;
 if (progress >= 1 || !images.sleigh?.naturalWidth) return;
 const width = images.sleigh.naturalWidth;
 const x = Math.round(-width + (800 + width) * progress);
 // Dip toward the mountain ridge, then clear the clocktower on the right.
 const towerDistance = (progress - 0.71) / 0.14;
 const y = Math.round(52 + 16 * Math.sin(2 * Math.PI * progress)
                       - 15 * Math.exp(-towerDistance * towerDistance));
 picture('sleigh', x, y);
}
function libraryFire(t){
 const fx=425,fy=227, tick=Math.floor(t*9);
 // The iron grate stands on the hearth; two charred logs sit across its bars.
 for(let j=-6;j<=6;j++)pixel(fx+j*8,fy,3,7,'#575069');
 pixel(fx-56,fy+2,112,3,'#343148');
 for(let n=0;n<94;n++){
   const y=fy-4+Math.round(3*Math.sin(n/36));
   pixel(fx-47+n,y,1,6,'#51303b');
   if(n%11<7)pixel(fx-47+n,y+1,1,2,'#bd793e');
 }
 for(let j=0;j<11;j++){
   const cx=fx+(j-5)*7, h=12+Math.round(22*Math.sin(Math.PI*(j+1)/12)**2+7*Math.sin(tick*.49+j*2)+5*Math.sin(tick*.77+j));
   for(let dy=0;dy<h;dy++){
     const u=dy/h, w=Math.max(1,Math.round(14*(1-u)));
     const left=cx-w/2+Math.sin(j+tick*.36+u*4)*u*6;
     pixel(left,fy-dy,w,1,'#d47733');
     if(w>=3)pixel(left+1,fy-dy,w-2,1,u<.5?'#ffd677':'#ffa94c');
   }
 }
 for(let n=0;n<3;n++){
   const p=(t*.63+n/3)%1;
   pixel(fx+11*Math.sin(n*4+p*2),fy-22-p*27,1,1,p<.6?'#eab456':'#bd793e');
 }
}
function galaxy(t){
 for(const [x,y,phase] of [[222,28,1],[289,11,2],[326,26,3.5],[513,39,5],[727,15,4],[678,32,.4],[180,40,2.7],[404,53,.8],[610,73,1.5]]){
   const strength=Math.sin(t*1.6+phase);
   if(strength<.28)continue;
   pixel(x,y,1,1,'#fff0be');
   if(strength>.82){pixel(x-1,y,3,1,'#eee4d5');pixel(x,y-2,1,5,'#eee4d5')}
 }
 const n=Math.floor(t/8),f=(t%8-2)/.85;
 if(f<0||f>1)return;
 const ox=[671,488,368][n%3],oy=[18,31,12][n%3];
 for(let j=0;j<22;j++){
   const u=f-j*.0028;
   if(u<0)continue;
   pixel(ox-u*173,oy+u*79,j<3?3:2,j<3?2:1,j<3?'#fff0be':j<11?'#b8c9e4':'#7285b1');
 }
}
function render(){
 C.imageSmoothingEnabled=false;
 const photo=state.theme===4 && state.photo;
 if(photo)C.drawImage(photoCanvas(photo,state.theme),0,0,800,300);
 else {picture(worlds[state.theme],0,0,800,300);[bedroom,village,libraryFire,galaxy][state.theme](time)}
}
let last=performance.now();function frame(now){if(playing){time+=(now-last)/1000;const sample=currentDrive(ac.currentTime);phase=(sample.position/state.lengths[state.level])%1;cursor()}if(!playing&&flashes.length)cursor();if(playing||dirty){render();if(dirty)drawHandle();dirty=false}last=now;requestAnimationFrame(frame)}
function scenery(){
 const custom=state.photo, theme=state.theme;
 const labels=custom?[...titles,'내 사진']:titles;
 $('photoPick').textContent=custom?'사진 교체':'내 사진 넣기';
 $('restoreScene').textContent='사진 삭제';$('restoreScene').hidden=!custom;
 $('themes').replaceChildren(...labels.map((label,i)=>{
   const button=document.createElement('button');
   button.dataset.theme=i;button.setAttribute('aria-pressed',String(i===theme));
   const img=document.createElement('img');img.alt='';
   img.src=i===4?photoCanvas(custom,4).toDataURL():ASSETS[worlds[i]];
   button.append(img,document.createTextNode(label));return button;
 }));
 dirty=true;
}
$('workTitle').oninput=()=>{state.title=$('workTitle').value;save()};
function refresh(){board();scenery();$('workTitle').value=state.title||'';document.documentElement.style.setProperty('--desk-texture','url('+ASSETS.desk_walnut+')')}
$('discLength').onchange=e=>{stop();state.lengths[state.level]=Number(e.target.value);save();board()};
$('pitchCount').onchange=e=>{stop();state.level=Number(e.target.value);save();board()};
$('gridWind').onclick=()=>$('wind').click();
$('switchView').onclick=()=>{tableView=true;board();$('gridDialog').showModal()};
const wipeDialog = $('wipeDialog');
$('wipe').onclick = () => wipeDialog.showModal();
$('keepNotes').onclick = () => wipeDialog.close();
$('clearNotes').onclick = () => {
  state.tracks[state.level].forEach(row => row.fill(0, 0, state.lengths[state.level]));
  save();
  board();
  dirty = true;
  wipeDialog.close();
};


// Clicks inside the gap around a hole snap to the closest visible centre.
function closestHole(event){
  const rotor=$('rotor'),matrix=rotor.getScreenCTM();
  if(!matrix)return null;
  const local=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  const radial=Math.hypot(local.x,local.y);
  if(radial<52||radial>173)return null;
  let best=null,limit=event.pointerType==='touch'?22:14;
  const l=state.level;
  for(let r=0;r<scales[l].length;r++){
    for(let b=0;b<state.lengths[l];b++){
      const angle=b*TAU/state.lengths[l],rad=radius(r,l);
      const pt=new DOMPoint(rad*Math.cos(angle),rad*Math.sin(angle)).matrixTransform(matrix);
      const distance=Math.hypot(pt.x-event.clientX,pt.y-event.clientY);
      if(distance<limit){limit=distance;best={r,b}}
    }
  }
  return best;
}
for(const id of ['plate','table'])$(id).onclick=e=>{
  const target=e.target.closest('[data-r]');
  const hole=target?target.dataset:id==='plate'?closestHole(e):null;
  if(!hole)return;
  const r=Number(hole.r),b=Number(hole.b);
  toggle(r,b);
  $(id).querySelector('[data-r="'+r+'"][data-b="'+b+'"]')?.focus({preventScroll:true});
};
$('zoom').onclick=()=>{
  $('zoomSlot').append($('editor'));
  $('magnifier').showModal();
};
$('unzoom').onclick=()=>$('magnifier').close();
$('magnifier').onclose=()=>{
  document.querySelector('.winder').before($('editor'));
  $('zoom').focus({preventScroll:true});
};
$('plate').onkeydown=e=>{const g=e.target.closest('.hole');if(!g)return;let r=+g.dataset.r,b=+g.dataset.b;if([' ','Enter'].includes(e.key)){e.preventDefault();g.dispatchEvent(new MouseEvent('click',{bubbles:true}));return}const k=e.key;if(!k.startsWith('Arrow'))return;e.preventDefault();const n=state.lengths[state.level],rows=scales[state.level].length;r=(r+(k==='ArrowUp'?1:k==='ArrowDown'?-1:0)+rows)%rows;b=(b+(k==='ArrowRight'?1:k==='ArrowLeft'?-1:0)+n)%n;$('plate').querySelector('[data-r="'+r+'"][data-b="'+b+'"]').focus()};
$('themes').onclick=e=>{let btn=e.target.closest('[data-theme]');if(!btn)return;state.theme=+btn.dataset.theme;time=0;save();scenery()};
// Each space advances one beat. Joined digits sound together; a dash is a rest.
// Lane numbers run from the innermost ring (0) outwards, with a/b for lanes 10/11.
const examples=[
 [
  ['창가의 뻐꾸기','두 번 부르는 새소리 사이의 쉼을 들어 보세요.','2 1 - 0 2 1 - 03'],
  ['계단 위의 달빛','같은 가락이 두 번째에는 어디로 올라가는지 들어 보세요.','0 1 2 - 1 2 3 - 0 1 2 1 02 - 01 0']
 ],[
  ['고양이 발걸음','낮은 음을 따라 하나, 둘, 셋을 세어 보세요.','03 2 1 04 3 2 15 4 1 03 2 0'],
  ['유리창의 왈츠','처음 네 마디와 다음 네 마디의 끝을 비교해 보세요.','02 3 4 15 - 4 03 2 1 2 - - 02 3 4 15 4 3 12 1 3 05 - -']
 ],[
  ['종탑의 메아리','첫 가락에 더 높은 음이 대답하는 곳을 찾아보세요.','02 3 4 - 1 2 0 - 47 5 4 - 3 1 02 -'],
  ['호수 위의 편지','낮은 음과 높은 음이 함께 울리는 박을 찾아보세요.','02 - 4 5 13 3 2 - 24 5 6 7 35 - 4 - 02 - 4 5 13 3 1 - 46 5 3 1 07 - - -']
 ],[
  ['자정의 시계공','한 칸씩 반음으로 오르는 소리를 들어 보세요.','04 7 - 7 5 6 7 - 38 7 6 5 26 - 5 2 47 8 9 b 07 - - -'],
  ['별지도의 비밀','같은 도 위에서 미가 미♭로 내려갈 때의 색을 들어 보세요.','047 - 7 9 04 2 4 - 037 - 7 8 03 2 3 - 59 7 5 4 27 - 2 - 047 - 7 9 04 7 9 b 037 - 8 7 03 5 3 - 2b - 5 2 047 - - -']
 ]
];
let originalWork=null;
function hearExample(index){
 const level=originalWork.state.level;
 const [title,hint,score]=examples[level][index];
 const beats=score.split(' ');
 stop();state={...originalWork.state,lengths:[...originalWork.state.lengths],tracks:[...originalWork.state.tracks]};
 state.lengths[level]=beats.length;
 state.tracks[level]=scales[level].map((_,r)=>beats.map(cell=>Number(cell.includes(r.toString(16)))));
 board();$('exampleHint').textContent=hint;
 document.querySelectorAll('#exampleSongs button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
 reserve=beats.length;play();
}
$('showExamples').onclick=()=>{
 const sample=currentDrive(ac?.currentTime||0);
 originalWork={state,position:sample.position,reserve:sample.energy,wasPlaying:playing};
 stop();
 $('exampleHeading').textContent=scales[state.level].length+'음 · 연주 보기';
 $('exampleSongs').innerHTML=examples[state.level].map(([title,,score],i)=>
   '<button data-song="'+i+'">'+title+' <small>'+score.split(' ').length+'칸</small></button>').join('');
 $('exampleDisc').append($('editor'));$('exampleDialog').showModal();hearExample(0);
};
$('exampleSongs').onclick=e=>{const button=e.target.closest('[data-song]');if(button)hearExample(Number(button.dataset.song))};
$('closeExamples').onclick=()=>$('exampleDialog').close();
$('exampleDialog').onclose=()=>{
 const resume=originalWork.wasPlaying;stop();state=originalWork.state;position=originalWork.position;reserve=originalWork.reserve;originalWork=null;
 phase=position/state.lengths[state.level]%1;document.querySelector('.winder').before($('editor'));
 board();if(resume)play();$('showExamples').focus();
};
installPhotoControls();
for(const [k,src] of Object.entries(ASSETS)){const img=images[k]=new Image();img.onload=()=>{dirty=true};img.src=src}refresh();requestAnimationFrame(frame);

$('shell').src=ASSETS.cabinet;$('howButton').onclick=()=>{$('explain').showModal();cursor()};
$('creditsButton').onclick=()=>$('credits').showModal();

for(const k of ['night','button','panel'])document.documentElement.style.setProperty('--'+k,'url('+ASSETS[k]+')');attachWinder();
for(const [id,icon] of Object.entries({showExamples:'melody',switchView:'grid',wipe:'erase',zoom:'zoom',photoPick:'photo'})){
 $(id).style.setProperty('--icon','url('+ASSETS['ui_'+icon]+')');
}
