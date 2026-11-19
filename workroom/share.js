// A link contains only the displayed disc and its chosen scenery.
// 공유 링크는 지금 열린 사이트 주소로 만든다 (GitHub Pages든 다른 곳이든). 파일로 열었을 때만 기본 주소를 쓴다.
const publishedWorkroom=/^https?:$/.test(location.protocol)?location.href.split('#')[0]:'https://mbworkroom-75288.web.app/';
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
// 작품 → gzip → base64url 문자열 (짧은 링크에는 이 문자열을 저장하고, 예전 긴 링크에는 주소에 그대로 붙인다)
async function packWork(){
 const bytes=new TextEncoder().encode(JSON.stringify(shareSnapshot()));
 const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
 const packed=new Uint8Array(await new Response(stream).arrayBuffer());
 return btoa(Array.from(packed,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}

// 짧은 공유 링크: 작품을 Firestore(works/8자코드)에 24시간 동안 저장하고 '#w=코드' 링크를 만든다.
// 보안 규칙(firestore.rules)이 24시간이 지난 작품은 열지 못하게 막고, TTL이 나중에 지운다.
const FIRESTORE='https://firestore.googleapis.com/v1/projects/mbworkroom-75288/databases/(default)/documents';
const SHARE_HOURS=24;
// 오래된 브라우저(iOS 15 이하 등)에는 AbortSignal.timeout이 없어서 직접 만든다
function timeoutSignal(ms){
 if(AbortSignal.timeout)return AbortSignal.timeout(ms);
 const c=new AbortController();setTimeout(()=>c.abort(),ms);return c.signal;
}
const CODE_CHARS='abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode(){
 const r=crypto.getRandomValues(new Uint8Array(8));
 return Array.from(r,v=>CODE_CHARS[v%CODE_CHARS.length]).join('');
}
async function saveShort(packed){
 for(let attempt=0;attempt<3;attempt++){
  const code=newCode(),expire=new Date(Date.now()+SHARE_HOURS*3600e3).toISOString();
  const res=await fetch(FIRESTORE+':commit',{method:'POST',headers:{'Content-Type':'application/json'},signal:timeoutSignal(8000),
   body:JSON.stringify({writes:[{
    update:{name:'projects/mbworkroom-75288/databases/(default)/documents/works/'+code,fields:{d:{stringValue:packed},e:{timestampValue:expire}}},
    updateTransforms:[{fieldPath:'t',setToServerValue:'REQUEST_TIME'}],
    currentDocument:{exists:false}}]})});
  if(res.ok)return code;
  if(res.status!==409)throw Error('save '+res.status);   // 409 = 같은 코드가 이미 있음 → 새 코드로 다시
 }
 throw Error('code');
}
let lastLinkShort=false;
async function encodeLink(){
 const packed=await packWork();
 if(/^https?:$/.test(location.protocol)){
  try{const code=await saveShort(packed);lastLinkShort=true;return publishedWorkroom+'#w='+code}catch{}
 }
 lastLinkShort=false;                                    // 저장에 실패하면(인터넷 문제 등) 예전처럼 긴 링크
 return publishedWorkroom+'#listen='+packed;
}
async function unpackWork(encoded){
 if(!/^[\w-]{1,110000}$/.test(encoded))throw Error();
 const bytes=Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')),ch=>ch.charCodeAt(0));
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
 const decoder=new TextDecoder();let text='',size=0;
 while(true){const {done,value}=await reader.read();if(done)break;
   size+=value.length;if(size>65000){await reader.cancel();throw Error()}
   text+=decoder.decode(value,{stream:true});
 }
 return decodeDisc(JSON.parse(text+decoder.decode()));
}
async function openListeningRoom(){
 document.body.classList.add('listening');
 const workspace=document.querySelector('.workspace');
 workspace.before(document.querySelector('.folio h1'));
 $('editor').inert=true;$('workTitle').readOnly=true;$('workTitle').placeholder='';
 $('listenerActions').hidden=false;$('makeOwn').href=location.href.split('#')[0];
 $('wind').disabled=true;
 try{
   let encoded;
   if(location.hash.startsWith('#w=')){
     const code=location.hash.slice(3);
     if(!/^[A-Za-z0-9]{8}$/.test(code))throw Error();
     const res=await fetch(FIRESTORE+'/works/'+code,{signal:timeoutSignal(10000)});
     if(res.status===403||res.status===404){showIssue('이 공유 링크는 열 수 있는 기간(24시간)이 지났거나 없는 링크예요. 보낸 사람에게 새 링크를 받아 주세요.');return}
     if(!res.ok)throw Error();
     encoded=(await res.json()).fields.d.stringValue;
   }else encoded=location.hash.slice(8);
   state=await unpackWork(encoded);refresh();
   $('wind').disabled=false;
 }catch{showIssue('감상 링크를 읽을 수 없어요. 보낸 사람에게 링크를 다시 받아 주세요.')}
}
$('shareWork').onclick=async()=>{
 const btn=$('shareWork');if(btn.disabled)return;
 const label=btn.textContent;btn.disabled=true;btn.textContent='링크 만드는 중…';
 try{
   $('shareUrl').value=await encodeLink();
   $('shareNote').textContent=lastLinkShort?'이 링크를 열면 태엽을 감아 작품을 들을 수 있어요. 링크는 24시간 동안 열 수 있어요.':'이 링크를 열면 태엽을 감아 작품을 들을 수 있어요.';
   $('shareDialog').showModal();$('copyShare').focus();
 }catch{showIssue('공유 링크를 만들 수 없어요. 최신 브라우저에서 다시 열어 주세요.')}
 finally{btn.disabled=false;btn.textContent=label}
};
$('shareClose').onclick=()=>$('shareDialog').close();
$('copyShare').onclick=async()=>{
 try{await navigator.clipboard.writeText($('shareUrl').value);$('shareDialog').close();}
 catch{$('shareUrl').select();$('shareUrl').focus()}
};
window.addEventListener('hashchange',()=>location.reload());
if(listening)openListeningRoom();
