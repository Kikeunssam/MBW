# Sound sources

All sounds are from **BigSoundBank** (recordist Joseph Sardin) and released under **CC0 1.0 (Public Domain Dedication)**.
They can be used, modified, published and used commercially without attribution.
- License: https://bigsoundbank.com/licenses.html

## Music box notes (15)

These are separate recordings of each note of one music box's A♭ major scale (A♭4–A♭6).

| File (original ID) | Title | Measured pitch |
| --- | --- | --- |
| s1865 | Music box, G# #1 | A♭4 (MIDI 68) |
| s1866 | Music box, A# #1 | B♭4 (70) |
| s1867 | Music box, C #1 | C5 (72) |
| s1868 | Music box, C# #1 | D♭5 (73) |
| s1869 | Music box, D# #1 | E♭5 (75) |
| s1870 | Music box, F #1 | F5 (77) |
| s1871 | Music box, G #1 | G5 (79) |
| s1872 | Music box, G# #2 | A♭5 (80) |
| s1873 | Music box, A# #2 | B♭5 (82) |
| s1874 | Music box, C #2 | C6 (84) |
| s1875 | Music box, C# #2 | D♭6 (85) |
| s1876 | Music box, D# #2 | E♭6 (87) |
| s1877 | Music box, F #2 | F6 (89) |
| s1878 | Music box, G #2 | G6 (91) |
| s1879 | Music box, G# #3 | A♭6 (92) |

Page URL format: `https://bigsoundbank.com/music-box-c-1-s1867.html` (one per ID)

The app (audio.js) picks the nearest sample and matches the pitch with playback speed (±1 semitone; the low notes C4–G4 use the A♭4 sample played slower).

## Winding sound

- s1674 **Winder #1** — winding a music box a few turns by hand with a small key (https://bigsoundbank.com/winder-1-s1674.html)
- s1675 **Winder #2** (https://bigsoundbank.com/winder-2-s1675.html)

From these two recordings I cut out 7 one-turn pieces (one ratchet turn each). The app plays one piece per tap on the key and plays them in sequence while you drag to wind.

## Processing

1. Downloaded the original WAVs (48 kHz / 24-bit) → macOS `afconvert` to 44.1 kHz mono 16-bit.
2. Notes: start 4 ms before the attack, keep up to 2.6 s, normalize peak to 0.9, fade out over the last 0.35 s.
   Pitches measured with Goertzel (all within ±20 cents).
3. Encode to AAC 96 kbps (`afconvert -f m4af -d aac`) → base64 into `musicbox-samples.js` (so it works from file://).
