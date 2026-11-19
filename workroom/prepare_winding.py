from pathlib import Path
from PIL import Image,ImageDraw
import json,shutil
p=Path(__file__).resolve().parent;root=p.parent;out=p/'stage'
colors={c['name']:c['hex'] for c in json.loads((root/'assets/palette.json').read_text())['colors']}
palette=Image.new('P',(1,1));palette.putpalette(b''.join(bytes.fromhex(v[1:]) for v in colors.values()))
source=Image.open(next((root/'generated_images').glob('exec-65d40f5b*'))).convert('RGBA')
w,h=source.size
for name,crop,size in [('crank',(0,0,w,h//2),(62,14)),('roller',(0,h//2,w,h),(220,22))]:
 s=source.crop(crop);s=s.crop(s.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()).resize(size,Image.Resampling.NEAREST)
 a=s.getchannel('A').point(lambda x:255 if x>=128 else 0);q=s.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');q.putalpha(a);q.save(out/(name+'.png'))
for name in ['blank','punched','strike']:
 s=Image.new('RGBA',(15,15));d=ImageDraw.Draw(s)
 def ring(box,color):d.ellipse(box,fill=colors[color])
 ring((1,2,13,14),'brass_pale' if name!='blank' else 'brass_mid')
 ring((1,1,13,12),'bronze_0' if name!='blank' else 'bronze_2')
 ring((2,2,12,11),'brass_mid' if name=='blank' else 'wood_0')
 ring((3,3,11,10),{'blank':'brass_2','punched':'night_0','strike':'light_3'}[name]);d.line((4,2,8,2),fill=colors['bronze_1'])
 if name=='strike':d.line((5,6,10,6),fill=colors['light_4']);d.line((7,4,7,8),fill=colors['light_4'])
 s.save(out/(name+'.png'))
for src,n in [('ui/panel_medium','panel'),('bg/night_tile','night')]:shutil.copy(root/('assets/'+src+'.png'),out/(n+'.png'))
s=Image.open(root/'assets/ui/button_medium.png');s.crop((0,0,128,48)).save(out/'button.png')
