// '사용 방법' popup: one slide per page. Arrow buttons, dots, keyboard arrows, and swipe left/right to change page.
(()=>{
 const dialog=$('guide'),slides=[...dialog.querySelectorAll('.guideSlide')],dots=$('guideDots');
 let index=0;
 dots.innerHTML=slides.map((_,i)=>'<button type="button" data-page="'+i+'" aria-label="'+(i+1)+'쪽"></button>').join('');
 function show(i){
  index=Math.max(0,Math.min(slides.length-1,i));
  slides.forEach((s,k)=>{s.hidden=k!==index});
  $('guidePage').textContent=(index+1)+' / '+slides.length;
  $('guidePrev').disabled=index===0;
  $('guideNext').textContent=index===slides.length-1?'다 봤어요':'다음 ▶';
  dots.querySelectorAll('button').forEach((d,k)=>d.setAttribute('aria-current',k===index?'step':'false'));
  dialog.querySelector('.guideSlides').scrollTop=0;
 }
 $('guideButton').onclick=()=>{show(0);dialog.showModal();$('guideNext').focus({preventScroll:true})};
 $('guideClose').onclick=()=>dialog.close();
 $('guidePrev').onclick=()=>show(index-1);
 $('guideNext').onclick=()=>index===slides.length-1?dialog.close():show(index+1);
 dots.onclick=e=>{const d=e.target.closest('[data-page]');if(d)show(+d.dataset.page)};
 dialog.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea'))return;
  if(e.key==='ArrowRight'){e.preventDefault();show(index+1)}
  else if(e.key==='ArrowLeft'){e.preventDefault();show(index-1)}
 });
 // Swipe sideways to change page (touch screens)
 let start=null;
 const area=dialog.querySelector('.guideSlides');
 area.addEventListener('touchstart',e=>{const t=e.touches[0];start={x:t.clientX,y:t.clientY}},{passive:true});
 area.addEventListener('touchend',e=>{
  if(!start)return;const t=e.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;start=null;
  if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)show(index+(dx<0?1:-1));
 },{passive:true});
 show(0);
})();
