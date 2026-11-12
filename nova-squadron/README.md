# Nova Squadron

3D-Weltraum-Shooter im Browser (three.js). Handelsverband gegen Unternehmerverband: der Krieg um das Essen-System.

- Story-Einstieg und Flugschule (Rolle, Schub und Bremse, Looping, Wende, Waffenwechsel, Nova-Welle)
- Sechs Einsätze mit mehreren Phasen (Abfangen, Bojenjagd im Asteroidengürtel, Geleitschutz, Kreuzer, Elitestaffel, Flaggschiff) und ein Endlos-Gefecht
- Fünf Waffen, sieben Upgrades, drei Schiffe, Flügelleute
- Unendlich Munition und unendlich Leben: fällt der Schild auf null, zündet ein Notschild, der Einsatz läuft weiter
- Steuerung: Maus oder WASD, Leertaste/Maustaste feuert, Umschalt Schub, C Bremse, Q/E Rolle, R Looping, X Wende, F Nova-Welle, 1–5 Waffe; auf dem Handy linker Daumen und Tasten rechts

## Starten

    node serve.mjs        # http://127.0.0.1:8188/

Zum Spielen ohne Server: `dist/Nova-Squadron.html` (eine Datei, erzeugt mit `node build-standalone.mjs`, braucht esbuild).

`page.html` ist die Quelle (auch für die Artifact-Fassung), `node build.mjs` erzeugt daraus `index.html`.

## Herkunft

- Code, Schiffsmodelle (prozedural), Musik und Effekte: eigens für dieses Spiel geschrieben
- Himmel, Planeten und Titelbild: mit Higgscheap (GPT Image 2) erzeugt, `assets/`
- three.js r170 (MIT) in `vendor/`, jsfxr 1.4.1 (Unlicense, https://github.com/chr15m/jsfxr) in `vendor/jsfxr/`
- Zwei Aufnahmen (Explosion, schwerer Laser) aus „Sci-Fi Sounds“ von Kenney (kenney.nl, CC0 1.0), eingebettet in `src/samples.js`
- Eigene Entwürfe und Namen; keine Schiffe, Figuren oder Marken aus Filmen übernommen
