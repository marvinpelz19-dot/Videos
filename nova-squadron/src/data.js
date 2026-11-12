// Spieldaten: Waffen, Upgrades, Schiffe, Gegner, Missionen. Eigenes Universum: Handelsverband gegen Unternehmerverband.

export const WEAPONS = [
  { id: 'laser', name: 'Zwillingslaser', short: 'LASER', color: [4.0, 0.5, 0.35], rate: 10, dmg: 10, speed: 460, desc: 'Schnelle Salven aus beiden Flügelkanonen.', unlock: 0 },
  { id: 'spread', name: 'Ionenfächer', short: 'FÄCHER', color: [0.4, 3.2, 1.2], rate: 3.2, dmg: 8, speed: 400, desc: 'Sieben Bolzen im Fächer. Stark auf kurze Distanz.', unlock: 1 },
  { id: 'missile', name: 'Schwarmraketen', short: 'RAKETEN', color: [4.0, 2.2, 0.4], rate: 2.4, dmg: 34, speed: 210, desc: 'Zielsuchend. Zwei Raketen pro Salve.', unlock: 2 },
  { id: 'beam', name: 'Plasmalanze', short: 'LANZE', color: [1.0, 2.2, 5.0], rate: 0, dmg: 150, speed: 0, desc: 'Dauerstrahl, der alles auf der Ziellinie durchschneidet.', unlock: 3 },
  { id: 'orb', name: 'Nova-Kanone', short: 'NOVA-K.', color: [3.4, 0.8, 4.2], rate: 1.1, dmg: 90, speed: 240, desc: 'Schwere Plasmakugel mit Flächenschaden.', unlock: 4 },
];

export const UPGRADES = [
  { id: 'dmg', name: 'Fokuskristalle', desc: '+20 % Schaden aller Waffen', max: 5 },
  { id: 'rate', name: 'Schnellladespulen', desc: '+12 % Feuerrate', max: 5 },
  { id: 'multi', name: 'Zusatzläufe', desc: 'Mehr Bolzen pro Salve', max: 3 },
  { id: 'engine', name: 'Triebwerk', desc: '+8 % Tempo und Wendigkeit', max: 5 },
  { id: 'shield', name: 'Schildgenerator', desc: '+25 Schild, schnellere Aufladung', max: 5 },
  { id: 'wing', name: 'Flügelleute', desc: 'Ein weiterer Jäger der Nova Squadron fliegt mit', max: 4 },
  { id: 'nova', name: 'Nova-Kern', desc: 'Nova-Welle lädt schneller und trifft härter', max: 3 },
];
export const upgradeCost = (lvl) => [400, 900, 1700, 2900, 4500][lvl] ?? 99999;

export const SHIPS = [
  { id: 'pfeil', name: 'HV-7 Pfeil', role: 'Allrounder', speed: 1, turn: 1, dmg: 1, shield: 1, unlock: 0, desc: 'Der Standardjäger des Handelsverbands. Ausgewogen in allem.' },
  { id: 'wespe', name: 'HV-9 Wespe', role: 'Abfangjäger', speed: 1.22, turn: 1.3, dmg: 0.85, shield: 0.8, unlock: 2, desc: 'Leicht, sehr wendig, sehr schnell. Weniger Schild.' },
  { id: 'bastion', name: 'HV-4 Bastion', role: 'Schwerer Jäger', speed: 0.86, turn: 0.82, dmg: 1.4, shield: 1.6, unlock: 4, desc: 'Vier Kanonen und dicke Schilde. Träge in der Kurve.' },
];

// hp, Tempo, Wenderate (rad/s), Radius, Credits, Punkte
export const ENEMIES = {
  drone: { name: 'Heuschrecke', hp: 55, speed: 62, turn: 1.5, r: 5, credit: 25, score: 100, fire: 1.5, dmg: 5 },
  inter: { name: 'Kurshai', hp: 40, speed: 92, turn: 2.1, r: 4.5, credit: 40, score: 150, fire: 1.1, dmg: 4 },
  bomber: { name: 'Abmahner', hp: 230, speed: 40, turn: 0.9, r: 8, credit: 70, score: 250, fire: 2.6, dmg: 14 },
  ace: { name: 'Liquidator', hp: 900, speed: 84, turn: 2.0, r: 6.5, credit: 350, score: 1500, fire: 0.5, dmg: 6 },
  turret: { name: 'Geschützturm', hp: 170, speed: 0, turn: 0, r: 8, credit: 50, score: 200, fire: 1.5, dmg: 6 },
  gen: { name: 'Schildgenerator', hp: 600, speed: 0, turn: 0, r: 14, credit: 200, score: 800, fire: 0, dmg: 0 },
  buoy: { name: 'Werbeboje', hp: 240, speed: 0, turn: 0, r: 10, credit: 150, score: 600, fire: 0, dmg: 0 },
  corvette: { name: 'Korvette Vollstrecker', hp: 2400, speed: 30, turn: 0.32, r: 26, credit: 500, score: 3500, fire: 0.3, dmg: 6, big: true },
  kami: { name: 'Spekulant', hp: 14, speed: 108, turn: 2.3, r: 4, credit: 30, score: 120, fire: 0, dmg: 0 },
  hauler: { name: 'Goldtransporter', big: true, hp: 1500, speed: 24, turn: 0, r: 24, credit: 600, score: 2500, fire: 0.9, dmg: 6, static: true },
  target: { name: 'Übungsziel', hp: 40, speed: 0, turn: 0, r: 10, credit: 10, score: 50, fire: 0, dmg: 0 },
  core: { name: 'Tresorkern', hp: 3000, speed: 0, turn: 0, r: 20, credit: 1500, score: 6000, fire: 0, dmg: 0 },
};

export const ENVS = {
  kerasis: { sky: 'sky_crimson', planet: 'planet_desert', planetPos: [-0.55, -0.32, 0.77], planetSize: 0.62, atmo: [1.0, 0.55, 0.3], sun: [0.7, 0.45, 0.55], sunCol: [1.0, 0.86, 0.7], ambient: 0x553344, asteroids: 0 },
  belt: { sky: 'sky_teal', planet: 'planet_gas', planetPos: [0.6, 0.18, 0.78], planetSize: 0.8, ring: true, atmo: [0.4, 0.8, 1.0], sun: [-0.6, 0.5, 0.6], sunCol: [0.8, 0.92, 1.0], ambient: 0x223a55, asteroids: 70 },
  pyra: { sky: 'sky_gold', planet: 'planet_lava', planetPos: [0.1, -0.62, 0.78], planetSize: 0.9, atmo: [1.0, 0.35, 0.1], sun: [0.3, 0.7, -0.6], sunCol: [1.0, 0.75, 0.5], ambient: 0x4a2a22, asteroids: 14, glow: true },
  deep: { sky: 'sky_gold', planet: 'planet_gas', planetPos: [-0.7, 0.3, -0.64], planetSize: 0.45, ring: true, atmo: [0.7, 0.5, 1.0], sun: [0.5, 0.4, 0.75], sunCol: [1.0, 0.8, 0.95], ambient: 0x3a2a55, asteroids: 0 },
  nebula: { sky: 'sky_teal', planet: 'planet_desert', planetPos: [0.75, -0.25, -0.6], planetSize: 0.4, atmo: [0.5, 0.9, 1.0], sun: [-0.4, 0.6, 0.7], sunCol: [0.85, 0.95, 1.0], ambient: 0x2a3a4a, asteroids: 24 },
};

// Die Geschichte: Im Essen-System (alle Orte tragen Namen aus Essen) will der Unternehmerverband die Wirtschaft der
// Galaxis an sich reißen. Die Nova Squadron fliegt für den Handelsverband. Am Ende führt der Handelsverband alle Verbände.
// Phasen: spawn = [Typ, Anzahl]. Ziel ist immer: alle Ziel-Objekte der Phase zerstören.
export const STORY = {
  intro: 'Das Essen-System ist das Herz des galaktischen Handels. Der Unternehmerverband will es ganz für sich: jede Route, jeden Markt, jede Station. Nur der Handelsverband stellt sich ihm entgegen. Du fliegst seine beste Staffel.',
  cards: [
    ['Das Essen-System', 'Zwischen Rüttenscheid, dem Trümmergürtel Zollverein und dem Hellweg fließt der Handel der halben Galaxis. Wer Essen hält, bestimmt, was die Dinge kosten.'],
    ['Der Unternehmerverband', 'Generaldirektor Kord will keinen Markt mehr, sondern einen Besitzer. Seine Heuschrecken-Drohnen besetzen Stationen, seine Liquidatoren wickeln ab, wer sich wehrt. Über Essen Prime wartet sein Flaggschiff Monopol.'],
    ['Die Nova Squadron', 'Der Handelsverband hat nur eine Staffel, aber die beste. Du fliegst als Nova Eins. Erst die Flugschule, dann sechs Einsätze: Schwarm abfangen, Funk befreien, Konvoi schützen, den Kreuzer Rendite versenken, die Elite schlagen, die Monopol vernichten. Danach führt der Handelsverband alle Verbände.'],
  ],
  outro: 'Das Flaggschiff Monopol ist Geschichte, Generaldirektor Kord hat kapituliert. Alle Verbände des Systems haben den Handelsverband zu ihrem Vorsitz gewählt. Essen gehört dem Handel.',
};
export const MISSIONS = [
  {
    id: 'm0', aim: 'Lerne dein Schiff zu beherrschen', why: 'Der Handelsverband schickt niemanden unvorbereitet gegen Kords Flotte.', station: true, n: 0, tutorial: true, name: 'Flugschule', place: 'Übungsraum über Essen Prime', env: 'kerasis',
    brief: 'Bevor du gegen den Unternehmerverband fliegst, zeigt dir der Verbandschef dein Schiff: schießen, rollen, Schub und Bremse, Looping, Wende, Waffenwechsel und die Nova-Welle. Zum Üben sind alle fünf Waffen freigeschaltet.',
    phases: [
      { label: 'Drei Übungsziele zerstören', hint: 'Maus oder WASD steuern · Leertaste feuert', hintTouch: 'Linker Daumen steuert · Fadenkreuz-Taste halten', spawn: [['target', 3]], comms: [['Verbandschef', 'Willkommen in der Nova Squadron. Zeig mir zuerst, dass du triffst.']] },
      { label: 'Eine Ausweichrolle fliegen', task: 'roll', hint: 'Taste Q oder E', hintTouch: 'Taste mit dem Kreispfeil', comms: [['Verbandschef', 'In der Rolle trifft dich nichts. Merk dir das.']] },
      { label: 'Schub geben, dann bremsen', task: 'speed', hint: 'Umschalt = Schub · C = Bremse', hintTouch: 'Pfeile hoch halten, dann Pfeile runter halten', comms: [['Vex', 'Mit der Bremse drehst du enger. Mit Schub entkommst du.']] },
      { label: 'Ein Looping fliegen', task: 'loop', hint: 'Taste R', hintTouch: 'Taste mit der Schleife', comms: [['Vex', 'Sitzt dir einer im Nacken? Looping, und du sitzt hinter ihm.']] },
      { label: 'Die Wende fliegen', task: 'turn', hint: 'Taste X', hintTouch: 'Taste mit dem Umkehrpfeil', comms: [['Verbandschef', 'Die Wende dreht dich in einer Sekunde um. Halber Looping, halbe Rolle.']] },
      { label: 'Die Waffe wechseln', task: 'weapon', hint: 'Tasten 1 bis 5 oder Mausrad', hintTouch: 'Waffensymbol unten antippen', comms: [['Vex', 'Fünf Waffen, alle ohne Munitionsgrenze. Probier sie durch.']] },
      { label: 'Die Nova-Welle zünden', task: 'nova', hint: 'Taste F', hintTouch: 'Taste mit den Ringen', comms: [['Verbandschef', 'Die Nova-Welle räumt alles um dich herum ab. Sie lädt sich von selbst wieder auf.']] },
      { label: 'Ernstfall: Heuschrecken abschießen', spawn: [['drone', 4]], comms: [['Verbandschef', 'Kein Übungsziel mehr. Der Unternehmerverband hat uns gefunden. Zeig, was du gelernt hast.']] },
    ],
  },
  {
    id: 'm1', aim: 'Verteidige die Marktstation Rüttenscheid und zerstöre die Korvette Vollstrecker', why: 'Wer die Marktstation hält, setzt die Preise im ganzen Sektor. Fällt sie an den Unternehmerverband, zahlen alle Händler seinen Zoll.', station: true, n: 1, name: 'Feuertaufe über Rüttenscheid', place: 'Orbit von Rüttenscheid', env: 'kerasis',
    brief: 'Der Unternehmerverband schickt Heuschrecken-Drohnen gegen die Marktstation über Rüttenscheid. Wer sie besetzt, diktiert dort die Preise. Fang den Schwarm ab.',
    phases: [
      { label: 'Heuschrecken abfangen', spawn: [['drone', 6]], comms: [['Verbandschef', 'Nova Eins, hier spricht der Handelsverband. Der Schwarm ist da. Waffen frei.']] },
      { label: 'Zweite Welle zerstören', spawn: [['drone', 8]], comms: [['Vex', 'Die wollen die Marktstation. Ich bleibe an deinem Flügel.']] },
      { label: 'Kurshaie ausschalten', spawn: [['drone', 5], ['inter', 4]], comms: [['Verbandschef', 'Schnelle Signaturen. Das sind Kurshaie. Halt sie dir vom Heck.']] },
      { label: 'Korvette Vollstrecker zerstören', spawn: [['corvette', 1], ['drone', 4]], comms: [['Verbandschef', 'Da kommt ihr Führungsschiff: die Korvette Vollstrecker. Sechs Geschütze, dicke Panzerung. Bleib in Bewegung und nimm sie auseinander.']] },
    ],
  },
  {
    id: 'm2', aim: 'Zerstöre alle fünf Werbebojen und den Liquidator, der sie bewacht', why: 'Solange die Bojen senden, kann der Handelsverband seine Frachter nicht warnen.', n: 2, name: 'Zeche Zollverein', place: 'Trümmergürtel Zollverein', env: 'belt',
    brief: 'Im alten Bergbaugürtel Zollverein senden Werbebojen des Unternehmerverbands auf allen Kanälen und legen unseren Funk lahm. Zerstöre alle fünf. Ein Liquidator bewacht sie.',
    phases: [
      { label: 'Werbebojen zerstören', spawn: [['buoy', 5], ['drone', 6]], comms: [['Verbandschef', 'Fünf Bojen zwischen den Felsen. Achte auf die Asteroiden.']] },
      { label: 'Verstärkung abwehren', spawn: [['inter', 5], ['drone', 5], ['kami', 6]], comms: [['Vex', 'Funk ist wieder da. Die Verstärkung des Verbands leider auch.']] },
      { label: 'Den Liquidator stellen', spawn: [['ace', 1], ['drone', 4]], comms: [['Liquidator', 'Ein einzelner Händler? Ich wickle dich ab wie jede andere Firma.']] },
    ],
  },
  {
    id: 'm3', aim: 'Bring die drei Frachter heil zum Sprungtor Kettwig', why: 'Ohne diese Lieferung stehen die Märkte von Essen leer, und Kord verkauft als Einziger.', n: 3, name: 'Geleit auf dem Hellweg', place: 'Handelsroute Hellweg', env: 'nebula', convoy: 3,
    brief: 'Drei Frachter bringen Waren für die Märkte von Essen über den Hellweg. Abmahner-Bomber des Unternehmerverbands wollen die Lieferung stoppen. Je heiler die Frachter ankommen, desto besser die Wertung.',
    phases: [
      { label: 'Abmahner abfangen', spawn: [['bomber', 4], ['drone', 4]], comms: [['Frachter Ruhrperle', 'Nova Squadron, Bomber auf dem Schirm. Wir haben Ware für halb Essen an Bord.']] },
      { label: 'Zweiten Angriff abwehren', spawn: [['bomber', 5], ['inter', 4], ['kami', 5]], comms: [['Vex', 'Sie kommen von beiden Seiten. Nimm die Abmahner zuerst.']] },
      { label: 'Korvette und letzte Welle zerstören', spawn: [['corvette', 1], ['bomber', 5], ['drone', 5]], comms: [['Frachter Ruhrperle', 'Sprungtor Kettwig in Sicht. Nur noch diese Welle.']] },
    ],
  },
  {
    id: 'm4', aim: 'Versenke den Kreuzer Rendite: Türme, Schildgeneratoren, Tresorkern', why: 'Die Rendite deckt jede Besetzung des Unternehmerverbands. Ohne sie sind seine Stationen schutzlos.', station: true, n: 4, name: 'Kreuzer Rendite', place: 'Werft Borbeck', env: 'deep',
    brief: 'Der Kreuzer Rendite liegt ohne Eskorte vor der Werft Borbeck. Zerstöre seine Türme, dann die Schildgeneratoren auf dem Rücken. Erst danach liegt der Tresorkern am Heck frei.',
    phases: [
      { label: 'Geschütztürme zerstören', spawn: [['cruiser', 1], ['drone', 6]], goal: 'turret', comms: [['Verbandschef', 'Das ist die Rendite. Vierhundert Meter Stahl. Fang mit den Türmen an.']] },
      { label: 'Schildgeneratoren zerstören', spawn: [['inter', 5]], goal: 'gen', comms: [['Vex', 'Türme sind still. Die Kuppeln auf dem Rücken speisen den Kernschild.']] },
      { label: 'Tresorkern am Heck zerstören', spawn: [['drone', 6]], goal: 'core', comms: [['Verbandschef', 'Schild ist unten! Der Tresorkern am Heck liegt frei. Alles drauf!']] },
    ],
  },
  {
    id: 'm5', aim: 'Kapere Kords Gold und schlage seine drei Liquidatoren', why: 'Mit dem Gold bezahlt Kord seine Flotte, mit den Liquidatoren führt er sie. Beides verliert er heute.', n: 5, name: 'Sturm über Hochofen', place: 'Lavawelt Hochofen', env: 'pyra',
    brief: 'Über der Lavawelt Hochofen sammelt der Unternehmerverband seine Elite. Drei Liquidatoren führen sie an. Brich ihnen das Rückgrat, dann steht das Flaggschiff allein.',
    phases: [
      { label: 'Vorhut zerschlagen', spawn: [['corvette', 1], ['inter', 6], ['drone', 6]], comms: [['Verbandschef', 'Viele Kontakte. Bleib in Bewegung, Nova Eins.']] },
      { label: 'Goldtransporter abfangen', spawn: [['hauler', 2], ['drone', 6], ['kami', 4]], comms: [['Vex', 'Zwei Goldtransporter! Damit bezahlt Kord seine Flotte. Hol sie dir, das gibt fette Prämie.']] },
      { label: 'Ersten Liquidator stellen', spawn: [['ace', 1], ['inter', 6]], comms: [['Liquidator', 'Du hast meinen Partner in Zollverein abgeschrieben. Das wird teuer.']] },
      { label: 'Die Doppelspitze brechen', spawn: [['ace', 2], ['drone', 8], ['bomber', 2]], comms: [['Vex', 'Zwei auf einmal. Ich nehme dir die Kleinen ab.']] },
    ],
  },
  {
    id: 'm6', aim: 'Vernichte das Flaggschiff Monopol', why: 'Fällt die Monopol, kapituliert der Unternehmerverband. Dann führt der Handelsverband alle Verbände von Essen.', n: 6, name: 'Flaggschiff Monopol', place: 'Über Essen Prime', env: 'deep', boss: true,
    brief: 'Die Monopol ist das Flaggschiff von Generaldirektor Kord. Ihr Hauptgeschütz zeichnet vor dem Schuss eine rote Linie: Flieg sofort aus ihr heraus. Türme, Generatoren, Kern. Fällt die Monopol, führt der Handelsverband alle Verbände.',
    phases: [
      { label: 'Türme der Monopol zerstören', spawn: [['dread', 1], ['drone', 8]], goal: 'turret', comms: [['Verbandschef', 'Alle Staffeln, das ist der Tag. Nova Eins führt den Angriff. Für Essen!']] },
      { label: 'Drei Schildgeneratoren zerstören', spawn: [['inter', 8], ['ace', 1]], goal: 'gen', comms: [['Generaldirektor Kord', 'Ihr kratzt an einem Konzern. Hauptgeschütz laden.']] },
      { label: 'Kern der Monopol vernichten', spawn: [['drone', 8], ['inter', 6]], goal: 'core', comms: [['Vex', 'Der Kern liegt frei! Unter dem Rumpf, in der Mitte!']] },
    ],
  },
];

export const ENDLESS = { station: true, aim: 'Halte so viele Wellen durch wie möglich', why: 'Jede Welle, die hier scheitert, erreicht die Handelsstationen nicht.', id: 'endless', name: 'Endlos-Gefecht', place: 'Baldeney-Nebel', env: 'nebula', endless: true,
  brief: 'Der Unternehmerverband gibt nicht auf. Welle um Welle, ohne Ende. Jede fünfte Welle führt ein Liquidator an. Wie weit kommst du?' };

export function endlessPhase(n) {
  const spawn = [['drone', 4 + Math.min(10, n)]];
  if (n >= 2) spawn.push(['inter', Math.min(8, 1 + (n >> 1))]);
  if (n >= 2 && n % 2 === 0) spawn.push(['kami', Math.min(10, 2 + n)]);
  if (n % 4 === 0) spawn.push(['hauler', 1]);
  if (n % 3 === 0) spawn.push(['corvette', Math.min(3, n / 3)]);
  if (n >= 3 && n % 2 === 1) spawn.push(['bomber', Math.min(5, 1 + (n >> 2))]);
  if (n % 5 === 0) spawn.push(['ace', Math.min(3, n / 5)]);
  return { label: `Welle ${n} zerstören`, spawn, comms: n % 5 === 0 ? [['Verbandschef', 'Liquidator im Anflug!']] : [] };
}
