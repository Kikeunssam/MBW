// Takes screenshots of the 오르골당 app with headless Chrome over CDP and saves element positions.
// node capture.mjs <outDir>
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const PORT = 9333;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${out}/profile`,
  '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', '--mute-audio', 'about:blank',
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let targets;
for (let i = 0; i < 50; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets.length) break; } catch {}
  await sleep(200);
}
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const waiting = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJS = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
const shot = async (name, clip) => {
  const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
  writeFileSync(`${out}/${name}.png`, Buffer.from(r.result.data, 'base64'));
};
const rects = {};
const rect = async (key, sel) => { rects[key] = await evalJS(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()`); };

async function open(w, h, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: !!mobile, maxTouchPoints: mobile ? 5 : 0 });
  if (mobile) await send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
  await send('Page.navigate', { url: 'http://localhost:8765/' });
  await sleep(2500);
}

// A sample piece: 4 notes (도 미 솔 높은도), 16 steps, a simple tune
const setup = `(async()=>{
  localStorage.clear();
  document.querySelector('#pitchCount input[value="0"]').click();
  await new Promise(r=>setTimeout(r,200));
  document.querySelector('#discLength input[value="16"]').click();
  await new Promise(r=>setTimeout(r,200));
  const tune=[0,1,2,1, 0,1,2,3, 2,1,0,1, 2,2,2,3];
  const t=state.tracks[state.level];
  t.forEach(row=>row.fill(0));
  tune.forEach((r,b)=>{t[r][b]=1});
  t[0][15]=1;
  $('workTitle').value='우리 반 첫 오르골';$('workTitle').dispatchEvent(new Event('input',{bubbles:true}));
  state.title='우리 반 첫 오르골';
  save();board();dirty=true;
  await new Promise(r=>setTimeout(r,600));
  return state.level;
})()`;

const W = 1440, H = 860;
await send('Page.enable');
await open(W, H);
await evalJS(setup);
await sleep(800);
await shot('desk_full');
for (const [k, s] of Object.entries({
  instrument: '.instrument', editor: '#editor', winder: '.winder', nameplate: '.nameplate', folio: '.folio',
  music: '#music', pitch: '#pitchCount', length: '#discLength', actions: '.actionRack', examples: '#showExamples',
  table: '#switchView', wipe: '#wipe', zoom: '#zoom', decor: '#decor', themes: '#themes', photo: '#photoPick',
  share: '#shareWork', nav: '.workLinks', picture: '#pictureOpening', rules: '#rules', count: '#count',
})) await rect(k, s);
rects.holes = await evalJS(`[...document.querySelectorAll('#plate [data-r]')].slice(0,400).map(e=>{const r=e.getBoundingClientRect();return {r:+e.dataset.r,b:+e.dataset.b,x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,on:e.classList.contains('on')||e.getAttribute('aria-pressed')==='true'}})`);

// Table editing
await evalJS(`$('switchView').click()`); await sleep(700);
await rect('gridDialog', '#gridDialog'); await shot('desk_table');
await evalJS(`$('gridDialog').close()`); await sleep(300);
// Disc zoom
await evalJS(`$('zoom').click()`); await sleep(700);
await rect('magnifier', '#magnifier'); await shot('desk_zoom');
await evalJS(`$('magnifier').close()`); await sleep(300);
// Example songs (연주 보기)
await evalJS(`$('showExamples').click()`); await sleep(1200);
await rect('exampleDialog', '#exampleDialog'); await shot('desk_examples');
await evalJS(`$('exampleDialog').close()`); await sleep(400);
// Wipe notes confirmation
await evalJS(`$('wipe').click()`); await sleep(500);
await rect('wipeDialog', '#wipeDialog'); await shot('desk_wipe');
await evalJS(`$('wipeDialog').close()`); await sleep(300);
// Share
await evalJS(`$('shareWork').click()`); await sleep(1200);
await rect('shareDialog', '#shareDialog'); await shot('desk_share');
await evalJS(`$('shareDialog').close()`); await sleep(300);
// Second theme (Santa village)
await evalJS(`document.querySelectorAll('#themes [data-theme]')[1].click()`); await sleep(900);
await shot('desk_theme');

// Phone landscape
await open(812, 375, true);
await evalJS(setup); await sleep(800);
await shot('phone_full');
rects.phone = {};
for (const [k, s] of Object.entries({ instrument: '.instrument', editor: '#editor', folio: '.folio', zoom: '#zoom', table: '#switchView', nav: '.workLinks' })) {
  rects.phone[k] = await evalJS(`(()=>{const r=document.querySelector(${JSON.stringify(s)}).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()`);
}

writeFileSync(`${out}/rects.json`, JSON.stringify(rects, null, 1));
ws.close(); chrome.kill();
console.log('done', Object.keys(rects).length);
