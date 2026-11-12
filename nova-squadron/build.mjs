// Erzeugt index.html (lokal spielbar) aus page.html (Artifact-Fassung ohne Dokumentgerüst).
import fs from 'node:fs';
const page = fs.readFileSync(new URL('./page.html', import.meta.url), 'utf8');
fs.writeFileSync(new URL('./index.html', import.meta.url), `<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n<link rel="icon" href="data:,">\n</head>\n<body style="margin:0">\n${page}</body>\n</html>\n`);
