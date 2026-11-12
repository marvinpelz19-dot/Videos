# Nova Squadron

3D-Weltraum-Shooter im Browser (three.js). Handelsverband gegen Unternehmerverband: der Krieg um das Essen-System.

- Sechs Einsätze mit mehreren Phasen (Abfangen, Bojenjagd im Asteroidengürtel, Geleitschutz, Kreuzer, Elitestaffel, Flaggschiff) und ein Endlos-Gefecht
- Fünf Waffen, sieben Upgrades, drei Schiffe, Flügelleute
- Unendlich Munition und unendlich Leben: fällt der Schild auf null, zündet ein Notschild, der Einsatz läuft weiter
- Steuerung: Maus oder WASD, Leertaste/Maustaste feuert, Umschalt Schub, Q/E Rolle, F Nova-Welle, 1–5 Waffe; auf dem Handy linker Daumen und Tasten rechts

## Starten

    node serve.mjs        # http://127.0.0.1:8188/

`page.html` ist die Quelle (auch für die Artifact-Fassung), `node build.mjs` erzeugt daraus `index.html`.

## Herkunft

- Code, Schiffsmodelle (prozedural), Musik und Effekte: eigens für dieses Spiel geschrieben
- Himmel, Planeten und Titelbild: mit Higgscheap (GPT Image 2) erzeugt, `assets/`
- three.js r170 (MIT) in `vendor/`, jsfxr 1.4.1 (Unlicense, https://github.com/chr15m/jsfxr) in `vendor/jsfxr/`
- Eigene Entwürfe und Namen; keine Schiffe, Figuren oder Marken aus Filmen übernommen
