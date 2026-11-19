// One character per palette index keeps a full set of four pictures portable.
const photoWidth=400, photoHeight=150, photoAlphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const photoPalette=@@PHOTO_PALETTE@@.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
const photoCache=new Map();
let photoVersion=0;
function validPhotos(photos){
 return photos===undefined || (Array.isArray(photos)&&photos.length===4&&photos.every(value=>
   value===null || (typeof value==='string' && value.length===photoWidth*photoHeight && !/[^A-Za-z0-9+/]/.test(value))));
}
function photoCanvas(encoded, theme){
 const cached=photoCache.get(theme);
 if(cached?.encoded===encoded)return cached.canvas;
 const canvas=document.createElement('canvas');
 canvas.width=photoWidth;canvas.height=photoHeight;
 const ctx=canvas.getContext('2d'), image=ctx.createImageData(photoWidth,photoHeight);
 for(let i=0;i<encoded.length;i++){
   const rgb=photoPalette[photoAlphabet.indexOf(encoded[i])], j=i*4;
   image.data[j]=rgb[0];image.data[j+1]=rgb[1];image.data[j+2]=rgb[2];image.data[j+3]=255;
 }
 ctx.putImageData(image,0,0);
 photoCache.set(theme,{encoded,canvas});
 return canvas;
}
function photoGeometry(img, fit, zoom){
 const sx=photoWidth/img.naturalWidth,sy=photoHeight/img.naturalHeight;
 const scale=(fit==='contain'?Math.min(sx,sy):Math.max(sx,sy))*zoom;
 return {dw:img.naturalWidth*scale,dh:img.naturalHeight*scale};
}
function antiquePixels(img, edit){
 const w=photoWidth,h=photoHeight;
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#302329';ctx.fillRect(0,0,w,h);
 ctx.imageSmoothingQuality='high';
 const {dw,dh}=photoGeometry(img,edit.fit,edit.zoom);
 ctx.drawImage(img,(w-dw)/2+edit.x,(h-dh)/2+edit.y,dw,dh);
 const pixels=ctx.getImageData(0,0,w,h).data,cache=new Map(),result=[];
 const candidates=edit.tone==='mono'?[0,35,36,37,38,39,9]:photoPalette.map((_,i)=>i);
 for(let i=0;i<pixels.length;i+=4){
   const lum=.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2];
   let r=Math.min(255,Math.round(.85*pixels[i]+.15*lum+8));
   let g=Math.round(.86*pixels[i+1]+.14*lum);
   let b=Math.max(0,Math.round(.81*pixels[i+2]+.19*lum+5-lum*.078));
   if(edit.tone==='mono') r=g=b=lum;
   if(edit.tone==='light'){r+=.27*(255-r);g+=.27*(255-g);b+=.27*(255-b)}
   if(edit.tone==='dark'){r*=.70;g*=.70;b*=.70}
   const key=(r>>3)<<10|(g>>3)<<5|(b>>3);
   let best=cache.get(key);
   if(best===undefined){
     let distance=Infinity;
     for(const j of candidates){
       const [pr,pg,pb]=photoPalette[j],d=2*(pr-r)**2+3*(pg-g)**2+(pb-b)**2;
       if(d<distance){distance=d;best=j}
     }
     cache.set(key,best);
   }
   result.push(photoAlphabet[best]);
 }
 return result.join('');
}
function installPhotoControls(){
 const input=$('photoFile');
 const dialog=$('photoDialog'), preview=$('photoPreview');
 let edit=null, drag=null, pending=0;
 function clampPosition(){
   const {dw,dh}=photoGeometry(edit.img,edit.fit,edit.zoom);
   const limitX=Math.abs(photoWidth-dw)/2,limitY=Math.abs(photoHeight-dh)/2;
   edit.x=Math.max(-limitX,Math.min(limitX,edit.x));edit.y=Math.max(-limitY,Math.min(limitY,edit.y));
 }
 function paint(){
   cancelAnimationFrame(pending);pending=0;
   if(!edit)return;
   clampPosition();
   edit.encoded=antiquePixels(edit.img,edit);
   preview.getContext('2d').drawImage(photoCanvas(edit.encoded,'preview'),0,0);
 }
 function schedule(){if(!pending)pending=requestAnimationFrame(paint)}
 dialog.oninput=e=>{
   if(!edit)return;
   if(e.target.name==='photoFit'){edit.fit=e.target.value;edit.x=edit.y=0}
   if(e.target.name==='photoTone')edit.tone=e.target.value;
   if(e.target.id==='photoZoom'){edit.zoom=Number(e.target.value)/100;$('photoPercent').textContent=e.target.value+'%'}
   clampPosition();schedule();
 };
 function move(dx,dy){edit.x+=dx;edit.y+=dy;clampPosition();schedule()}
 preview.onpointerdown=e=>{
   if(!edit||drag||e.button!==0)return;
   preview.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY};
 };
 preview.onpointermove=e=>{
   if(!drag||drag.id!==e.pointerId)return;
   const box=preview.getBoundingClientRect();
   move((e.clientX-drag.x)*photoWidth/box.width,(e.clientY-drag.y)*photoHeight/box.height);
   drag.x=e.clientX;drag.y=e.clientY;
 };
 preview.onlostpointercapture=()=>{drag=null};
 preview.onkeydown=e=>{
   const delta={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]}[e.key];
   if(delta&&edit){e.preventDefault();move(...delta)}
 };
 $('cancelPhoto').onclick=()=>dialog.close();
 dialog.onclose=()=>{edit=null;drag=null;cancelAnimationFrame(pending);pending=0;photoCache.delete('preview')};
 $('applyPhoto').onclick=()=>{
   if(edit&&state===edit.owner&&state.theme===edit.theme&&photoVersion===edit.version){
     if(pending)paint();
     state.photo=edit.encoded;state.theme=4;scenery();save();
   }
   dialog.close();
 };
 $('photoPick').onclick=()=>input.click();
 input.onchange=async ()=>{
   const file=input.files[0];input.value='';
   if(!file)return;
   const theme=state.theme, owner=state, version=++photoVersion;
   if(file.size>32*1024*1024){showIssue('32MB 이하의 사진을 골라 주세요.');return}
   const url=URL.createObjectURL(file);
   try{
     const img=new Image();img.src=url;await img.decode();
     if(state!==owner||state.theme!==theme||photoVersion!==version)return;
     edit={img,owner,theme,version,fit:'cover',tone:'antique',zoom:1,x:0,y:0};
     dialog.querySelector('[value=cover]').checked=true;dialog.querySelector('[value=antique]').checked=true;
     $('photoZoom').value=100;$('photoPercent').textContent='100%';
     paint();dialog.showModal();preview.focus();
   }catch{showIssue('사진을 읽을 수 없어요. JPG, PNG 또는 WebP 사진을 골라 주세요.')}
   finally{URL.revokeObjectURL(url)}
 };
 $('restoreScene').onclick=()=>{
   const theme=state.theme;
   photoVersion++;state.photo=null;if(theme===4)state.theme=0;photoCache.delete(4);scenery();save();
 };
}
