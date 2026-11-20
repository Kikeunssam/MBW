from pathlib import Path
import base64,json,re
p=Path(__file__).resolve().parent
def uri(file,typ):return 'data:'+typ+';base64,'+base64.b64encode(file.read_bytes()).decode()
css=(p/'room.css').read_text().replace('@@FONT@@',uri(p.parent/'assets/fonts/galmuri11.woff2','font/woff2'))
samples=(p.parent/'sounds/musicbox-samples.js').read_text().split('  wind: [',1)[1]
wind_sample=re.search(r'"([A-Za-z0-9+/=]+)"',samples).group(1)
page=(p/'page.html').read_text().replace('@@CSS@@',css).replace('@@JS@@',(p/'spring.js').read_text()+'\n'+(p/'workshop.js').read_text()+'\n'+(p/'share.js').read_text()+'\n'+(p/'guide.js').read_text()).replace('@@ASSETS@@',json.dumps({f.stem:uri(f,'image/png') for f in (p/'stage').glob('*.png') if not f.stem.startswith('nav_')}))
for icon in (p/'stage').glob('nav_*.png'):
    page=page.replace('@@NAV_'+icon.stem[4:]+'@@',uri(icon,'image/png'))
# 수업 활동지는 페이지에 넣지 않고 index.html 옆의 별도 파일로 둔다 (첫 화면을 가볍게)
import shutil
shutil.copyfile(p/'music_box_lesson.pdf', p.parent/'music_box_lesson.pdf')
page=page.replace('@@LOADER_BG@@',uri(p/'loader/walnut.jpg','image/jpeg')).replace('@@LOADER_LOGO@@',uri(p/'loader/logo.png','image/png'))
page=page.replace('@@LESSON@@','music_box_lesson.pdf').replace('@@FAVICON@@',uri(p/'favicon.png','image/png'))
# '사용 방법' 그림 (workroom/guide/*.png, tools: workroom/make_guide_images.py)
for shot in (p/'guide').glob('*.png'):
    page=page.replace('@@GUIDE_'+shot.stem+'@@',uri(shot,'image/png'))
page=re.sub(r'@@GUIDE_[a-z_]+@@','data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',page)
palette=json.loads((p.parent/'assets/palette.json').read_text())['colors']
photo=(p/'photo.js').read_text().replace('@@PHOTO_PALETTE@@',json.dumps([c['hex'] for c in palette]))
page=page.replace('/* PHOTO_MODULE */',photo).replace('@@WINDER_AUDIO@@',wind_sample)
# 실제 오르골 한 음 샘플 (BigSoundBank CC0, sounds/CREDITS.md) — MIDI 번호 → base64 AAC
note_block=(p.parent/'sounds/musicbox-samples.js').read_text().split('  notes: {',1)[1].split('  },',1)[0]
notes={int(m):b for m,b in re.findall(r'(\d+): "([A-Za-z0-9+/=]+)"',note_block)}
page=page.replace('@@NOTE_SAMPLES@@',json.dumps(notes))
lic=(p.parent/'assets/fonts/license.txt').read_text()
(p.parent/'index.html').write_text(page.replace('</html>','<!-- Galmuri license\n'+lic.replace('--','—')+'\n--></html>'))
