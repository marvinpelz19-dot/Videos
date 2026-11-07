# Und du, Paula? – Chorus Reel (Version 2)

Gebaut nach dem Skill `bs-hyperframes-agent-chorus-reel`, übertragen auf den Axtwurf-Gutschein.
Format 1080x1920 (9:16), 30 fps, 19,8 s, H.264 + AAC.

## Musik

- Track: Originalmusik aus `Axtwurf-Gutschein_final_NastelBom.mp4`
- Tempo: 105,45 BPM → 1 Beat = 0,569 s (`../beats.json`)
- Drop: **7,467 s (Frame 224)**, der Axt-Einschlag („Thunk!“), dort wird die Musik deutlich lauter

## Slots

| Slot | Wert |
| --- | --- |
| prompt | `Und du, Paula?` (nur einmal im Code als `PROMPT` deklariert) |
| surface_labels | Terminal · Panel · Dokument · Chat (neutrale eigene Oberflächen, keine fremden Marken) |
| reel_captions | keine |
| command | `› axtwerfen --mit paula` |

## Bewegungen

| Bewegung | Start | Ende | Inhalt |
| --- | --- | --- | --- |
| I · Prompt | 0,000 | 2,267 | Zeile allein, bis zum ersten Downbeat |
| II.1 Terminal | 2,267 | 4,000 | tippt mit 14 Zeichen/s |
| II.2 Panel | 4,000 | 5,367 | tippt mit 26 Zeichen/s |
| II.3 Dokument | 5,367 | 6,500 | „Und du,“ → vollständig |
| II.4 Chat | 6,500 | 7,467 | sofort vollständig |
| III · Reel | 7,467 | 16,000 | harte Schnitte im Beat-Raster |
| IV · Befehl | 16,000 | 19,800 | eine Zeile, danach Stillstand |

## Schnittraster (Drop + n Beats, auf Frames gerundet)

| # | Bild | Beat | Zeit |
| --- | --- | --- | --- |
| 1 | o01 Thunk | 0 | 7,467 |
| 2 | o02 Falsch gedacht | 2 | 8,600 |
| 3 | o05 Du wirfst selbst | 4 | 9,733 |
| 4 | o03 Gutschein für Jan | 5 | 10,300 |
| 5 | o06 Eine Axt | 6 | 10,867 |
| 6 | o04 Axt fliegt | 7 | 11,433 |
| 7 | o07 Eine Axt. Ein Ziel. | 8 | 12,033 |
| 8 | o08 Paula! | 9 | 12,600 |
| 9 | o10 Detail Paula-Axt | 10 | 13,167 |
| 10 | o11 Detail Axt-ion | 10,5 | 13,433 |
| 11 | o12 Detail Happy Birthday | 11 | 13,733 |
| 12 | o09 Und du, Paula? | 11,5 | 14,000 |
| 13 | final Gutschein | 12 (hält 3 Beats) | 14,300 |

Rhythmus: zuerst halbes Tempo, dann ein Schnitt pro Beat, die letzten vier im doppelten Tempo, am Ende ein gehaltenes Bild.

## Abweichungen vom Skill

- 9:16 statt 1920x1080 und 19,8 s statt 24–45 s, wie gewünscht passend zum Original.
- Gerendert mit einem eigenen deterministischen Renderer (`render.mjs`: Playwright + FFmpeg) statt mit der HyperFrames-CLI. `npx` für externe Pakete ist in dieser Sitzung blockiert. Darum gibt es auch keine `hyperframes check`-Ausgabe. Animiert ist alles in reinem JS statt mit GSAP.
- Das Reel zeigt keine Produkt-Outputs, sondern Bilder aus deinem eigenen Originalvideo.
- Ohne Tipp-Geräusche: Die Audiospur ist 1:1 aus dem Originalvideo übernommen (Stream-Kopie, MD5-identisch).
- Der Schlussbefehl ist ein augenzwinkernder Fake-Befehl, kein echter Befehl.

## Prüfung

Die Frame-Differenzen im fertigen MP4 zeigen jeden der 14 Schnitte genau auf seinem Raster-Frame (224, 258, 292, 309, 326, 343, 361, 378, 395, 403, 412, 420, 429, 480).
