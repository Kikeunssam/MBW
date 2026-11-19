// A link contains only the displayed disc and its chosen scenery.
// 공유 링크는 지금 열린 사이트 주소로 만든다 (GitHub Pages든 다른 곳이든). 파일로 열었을 때만 기본 주소를 쓴다.
const publishedWorkroom=/^https?:$/.test(location.protocol)?location.href.split('#')[0]:'https://kikeunssam.github.io/MBW/';
function shareSnapshot(){
 const {level,theme,title,photo}=state,n=state.lengths[level];
 return {v:1,title:title||'',theme,level,n,notes:state.tracks[level].map(row=>row.slice(0,n).join('')),photo:theme===4?photo:null};
}
function decodeDisc(data){
 const work=fresh(),{level,theme,n,photo,title,notes}=data;
 if(data.v!==1||!Number.isInteger(level)||level<0||level>=4||
    ![shortSteps[level],shortSteps[level]*2].includes(n)||!Number.isInteger(theme)||theme<0||theme>4||
    typeof title!=='string'||title.length>32||!Array.isArray(notes)||notes.length!==scales[level].length||
    !notes.every(row=>typeof row==='string'&&row.length===n&&/^[01]+$/.test(row))||
    (theme===4?typeof photo!=='string'||photo.length!==60000||/[^A-Za-z0-9+/]/.test(photo):photo!==null))throw Error();
 Object.assign(work,{level,theme,title,photo});work.lengths[level]=n;
 work.tracks[level]=notes.map(row=>Array.from(row.padEnd(shortSteps[level]*2,'0'),Number));
 return work;
}
async function encodeLink(){
 const bytes=new TextEncoder().encode(JSON.stringify(shareSnapshot()));
 const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
 const packed=new Uint8Array(await new Response(stream).arrayBuffer());
 return publishedWorkroom+'#listen='+btoa(Array.from(packed,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
async function openListeningRoom(){
 document.body.classList.add('listening');
 const workspace=document.querySelector('.workspace');
 workspace.before(document.querySelector('.folio h1'));
 $('editor').inert=true;$('workTitle').readOnly=true;
 $('listenerActions').hidden=false;$('makeOwn').href=location.href.split('#')[0];
 $('wind').disabled=true;
 try{
   const encoded=location.hash.slice(8);
   if(!/^[\w-]{1,110000}$/.test(encoded))throw Error();
   const bytes=Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')),ch=>ch.charCodeAt(0));
   const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
   const decoder=new TextDecoder();let text='',size=0;
   while(true){const {done,value}=await reader.read();if(done)break;
     size+=value.length;if(size>65000){await reader.cancel();throw Error()}
     text+=decoder.decode(value,{stream:true});
   }
   state=decodeDisc(JSON.parse(text+decoder.decode()));refresh();
   $('wind').disabled=false;
 }catch{showIssue('감상 링크를 읽을 수 없어요. 보낸 사람에게 링크를 다시 받아 주세요.')}
}
$('shareWork').onclick=async()=>{
 try{
   $('shareUrl').value=await encodeLink();$('shareDialog').showModal();$('copyShare').focus();
 }catch{showIssue('공유 링크를 만들 수 없어요. 최신 브라우저에서 다시 열어 주세요.')}
};
$('shareClose').onclick=()=>$('shareDialog').close();
$('copyShare').onclick=async()=>{
 try{await navigator.clipboard.writeText($('shareUrl').value);$('shareDialog').close();}
 catch{$('shareUrl').select();$('shareUrl').focus()}
};
window.addEventListener('hashchange',()=>location.reload());
if(listening)openListeningRoom();
