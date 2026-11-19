from PIL import Image
from pathlib import Path
import json,shutil
p=Path(__file__).resolve().parent
out=p/'stage'
def generated(prefix):return Image.open(next((p.parent/'generated_images').glob('exec-'+prefix+'*'))).convert('RGBA')
colors=[bytes.fromhex(c['hex'][1:]) for c in json.loads((p.parent/'assets/palette.json').read_text())['colors']]
pal=Image.new('P',(1,1));pal.putpalette(b''.join(colors))
def write(im,name,size):
 im=im.resize(size,Image.Resampling.NEAREST);a=im.getchannel('A').point(lambda x:255 if x>=128 else 0);im=im.convert('RGB').quantize(palette=pal,dither=Image.Dither.NONE).convert('RGBA');im.putalpha(a);im.save(out/(name+'.png'),optimize=True)
im=generated('2dbdcc');w,h=im.size
for i,n in enumerate(['bedroom','village','library','galaxy']):write(im.crop((0,round(i*h/4)+2,w,round((i+1)*h/4)-2)),n,(960,240))
im=generated('90f81');w,h=im.size
for i in range(12):
 x=i%4;y=i//4;s=im.crop((round(x*w/4),round(y*h/3),round((x+1)*w/4),round((y+1)*h/3)));s=s.crop(s.getchannel('A').point(lambda v:255 if v>=128 else 0).getbbox());s.thumbnail((92,92),Image.Resampling.NEAREST);write(s,'prop'+str(i),s.size)
write(Image.open(p.parent/'mechanism_refs/disc.png').convert('RGBA'),'disc',(400,400))
for n in ['sleigh','cat']:shutil.copy(p/'img'/(n+'.png'),out/(n+'.png'))
for n,fn in [('frame','lid_frame'),('box','interior_housing_back'),('lip','interior_front_lip')]:shutil.copy(p.parent/'assets/musicbox'/(fn+'.png'),out/(n+'.png'))
