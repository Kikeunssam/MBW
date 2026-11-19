# 오르골당 · Music Box Workroom

A web app for primary school pupils to make their own disc music box tunes.
Place notes on the brass disc, wind the key, and the disc turns and plays.

**Site:** https://mbworkroom-75288.web.app (Firebase Hosting) · backup: https://kikeunssam.github.io/MBW/ (GitHub Pages)

## What you can do

- **Make music:** choose 4, 6, 8 or 12 notes and a 2-bar (8-step) or 4-bar (16-step) disc. Tap the circles on the disc to place notes, or use the table view to edit.
- **Wind the key:** drag the wooden handle up and down (or press the space bar) to play.
- **Decorate the box:** pick a scene for the lid (cosy bedroom, Santa village, antique library, Milky Way night) or use your own photo.
- **Share:** create a link that contains the disc and its scenery. Anyone who opens the link can listen.
- **Lesson material:** the "수업자료 받기" (download lesson material) button downloads the activity sheet PDF.

## Structure

```
index.html          The site itself. Images, fonts, sound and the lesson PDF are all embedded (a single file)
workroom/           Source files for index.html
  page.html         Page skeleton (contains @@…@@ placeholders that are filled at build time)
  room.css          Styles
  workshop.js       Disc editing, playback, saving
  spring.js         Winding the key
  share.js          Share links
  photo.js          Use your own photo
  stage/            Images embedded into the page
  music_box_lesson.pdf
assets/fonts/       Galmuri font (SIL OFL 1.1)
assets/palette.json Colour palette (used when converting photos)
sounds/             Music box sound samples (CC0, see sounds/CREDITS.md)
```

## Building

After changing the source, regenerate `index.html` (Python 3, no extra packages):

```bash
python3 workroom/build.py
```

## Deploying

```bash
sh tools/deploy.sh      # build index.html → copy to public/ → deploy to Firebase Hosting (mbworkroom-75288)
git push                # GitHub Pages (backup address) updates automatically from main
```

## Lesson worksheet

Print `workroom/lesson/worksheet.html` to PDF with Chrome as `workroom/music_box_lesson.pdf`; the build puts it behind the '수업자료 받기' (download lesson material) button.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --print-to-pdf=workroom/music_box_lesson.pdf "file://$PWD/workroom/lesson/worksheet.html"
```

## Licences

- Galmuri font: SIL Open Font License 1.1 (https://galmuri.quiple.dev/)
- Winding sound and music box samples: BigSoundBank, CC0 (`sounds/CREDITS.md`)
- Everything else: © 2026 Kikeunssam. All rights reserved.
