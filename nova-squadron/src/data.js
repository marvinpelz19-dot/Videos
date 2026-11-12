// Spieldaten: Waffen, Upgrades, Schiffe, Gegner, Missionen. Eigenes Universum: Handelsverband gegen Unternehmerverband.

export const WEAPONS = [
  { id: 'laser', name: 'Zwillingslaser', short: 'LASER', color: [0.5, 1.7, 4.6], rate: 10, dmg: 10, speed: 460, desc: 'Schnelle Salven aus beiden Flügelkanonen.', unlock: 0 },
  { id: 'spread', name: 'Ionenfächer', short: 'FÄCHER', color: [0.7, 2.9, 3.4], rate: 3.2, dmg: 8, speed: 400, desc: 'Sieben Bolzen im Fächer. Stark auf kurze Distanz.', unlock: 0 },
  { id: 'missile', name: 'Schwarmraketen', short: 'RAKETEN', color: [4.0, 2.2, 0.4], rate: 2.4, dmg: 34, speed: 210, desc: 'Suchen nur Ziele, die du im Visier hast. Zwei Raketen pro Salve.', unlock: 0 },
  { id: 'beam', name: 'Plasmalanze', short: 'LANZE', color: [1.0, 2.2, 5.0], rate: 0, dmg: 150, speed: 0, desc: 'Dauerstrahl, der alles auf der Ziellinie durchschneidet.', unlock: 0 },
  { id: 'orb', name: 'Nova-Kanone', short: 'NOVA-K.', color: [3.4, 0.8, 4.2], rate: 1.1, dmg: 90, speed: 240, desc: 'Schwere Plasmakugel mit Flächenschaden.', unlock: 0 },
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
  drone: { name: 'Heuschrecke', hp: 55, speed: 54, turn: 1.5, r: 5, credit: 25, score: 100, fire: 1.5, dmg: 5 },
  inter: { name: 'Kurshai', hp: 40, speed: 84, turn: 2.1, r: 4.5, credit: 40, score: 150, fire: 1.1, dmg: 4 },
  bomber: { name: 'Abmahner', hp: 230, speed: 40, turn: 0.9, r: 8, credit: 70, score: 250, fire: 2.6, dmg: 14 },
  ace: { name: 'Liquidator', hp: 900, speed: 78, turn: 2.0, r: 6.5, credit: 350, score: 1500, fire: 0.5, dmg: 6 },
  turret: { name: 'Geschützturm', hp: 170, speed: 0, turn: 0, r: 8, credit: 50, score: 200, fire: 1.5, dmg: 6 },
  gen: { name: 'Schildgenerator', hp: 600, speed: 0, turn: 0, r: 14, credit: 200, score: 800, fire: 0, dmg: 0 },
  buoy: { name: 'Werbeboje', hp: 240, speed: 0, turn: 0, r: 10, credit: 150, score: 600, fire: 0, dmg: 0 },
  corvette: { name: 'Korvette Vollstrecker', hp: 2400, speed: 30, turn: 0.32, r: 26, credit: 500, score: 3500, fire: 0.3, dmg: 6, big: true },
  jammer: { name: 'Störer', hp: 70, speed: 66, turn: 1.6, r: 5, credit: 90, score: 400, fire: 3.4, dmg: 0 },
  shielder: { name: 'Schildträger', hp: 170, speed: 46, turn: 1.0, r: 7, credit: 110, score: 500, fire: 0, dmg: 0 },
  kami: { name: 'Spekulant', hp: 14, speed: 98, turn: 2.3, r: 4, credit: 30, score: 120, fire: 0, dmg: 0 },
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
  intro: 'Du bist Marc Heistermann, Kommandant der Nova Squadron und Stimme des Handelsverbands. An Bord: Co-Pilot Mini und Sicherheitschef Charlie. Im Essen-System greift der Unternehmerverband nach jedem Markt und jeder Station.',
  outro: 'Das Flaggschiff Monopol ist Geschichte, Hauptgeschäftsführer Kanders hat kapituliert. Alle Verbände des Systems haben Marc Heistermann und den Handelsverband zu ihrem Vorsitz gewählt. Essen gehört dem Handel.',
};
// Comic zum Durchklicken: vor jedem Einsatz (pre) und nach dem Sieg (post). Jedes Bild hat einen Erzählkasten (cap),
// Sprechblasen, die nacheinander aufploppen (lines: [Sprecher, Text]), und manchmal ein Geräuschwort (fx). Bilder: assets/c_*.jpg und n_*.jpg.
export const COMICS = {
  intro: { title: 'Trade Force · Der Krieg um Essen', pre: [
    { img: 'x_c0_1', cap: 'Es begab sich im Essen-System, gleich hinter dem Ruhrnebel …', lines: [['Erzähler', 'Hier schlug das Herz des Handels. Märkte, Arkaden, Buden. Und ein Mann, der sie alle kannte.']] },
    { img: 'x_desk', cap: 'Marc Heistermann vom Handelsverband. Gegner Nummer eins: der Formularstapel.', lines: [['Marc Heistermann', 'Antrag auf Genehmigung eines Antrags. In dreifacher Ausfertigung. Klar.'], ['Marc Heistermann', 'Und dann noch eine Rede für das nächste Händlertreffen schreiben.'], ['Marc Heistermann', 'Wenigstens ist der Kaffee noch heiß. Und ich habe meinen Rote-Bete-Saft.'], ['Charlie', 'Zzz …']] },
    { img: 'y_charlie', cap: 'Sein wichtigster Mitarbeiter: Charlie, Chihuahua-Dackel, Sicherheitschef. Zuständig für Alarm. Bezahlung: Käseleckerlis.', lines: [['Charlie', 'Wuff.'], ['Erzähler', 'Übersetzung: „Wir gehen jetzt spazieren.“ Niemand hat sich je getraut, das zu hinterfragen.']] },
    { img: 'n_baustelle', cap: 'Gegner Nummer zwei: die Baustelle auf dem Hellweg und in ganz Essen-Rüttenscheid. Fertig: demnächst.', fx: 'STAU!', lines: [['Marc Heistermann', 'Seit drei Jahren steht da derselbe Bagger und macht nur Mist. Ich habe ihm einen Namen gegeben.'], ['Marc Heistermann', 'Iversen.']] },
    { img: 'f_pool', cap: 'Gegner Nummer drei: das überfüllte Schwimmbad.', lines: [['Marc Heistermann', 'Dabei bin ich schon um sechs Uhr morgens hier …'], ['Charlie', 'Wuff.']] },
    { img: 'n_sunday', cap: 'Und trotzdem: An einem verkaufsoffenen Sonntag war Essen der schönste Ort der Galaxis.', lines: [['Marc Heistermann', 'Dafür mache ich das alles.']] },
    { img: 'n_kord_screen', cap: 'Dann kam Gegner Nummer vier.', lines: [['Hauptgeschäftsführer Kanders', 'Bürger von Essen! Der Unternehmerverband hat eine frohe Botschaft: Ich kaufe alles.'], ['Hauptgeschäftsführer Kanders', 'Auch das, was nicht zu verkaufen ist.']] },
    { img: 'n_baker', cap: 'Kanders’ Heuschrecken-Drohnen arbeiteten schnell.', fx: 'RATSCH!', lines: [['Bäcker Bolle', 'Der hat meinen Stand gekauft, während ich noch Brötchen verkauft habe!'], ['Kunde', 'Darf ich das hier noch aufessen?']] },
    { img: 'x_coffee', cap: 'Am Abend kam Post.', fx: 'PRUUUST!', lines: [['Marc Heistermann', '„Wettbewerb wird zum Monatsende abgeschafft. Mit freundlichen Grüßen, Kanders.“'], ['Marc Heistermann', 'MIT FREUNDLICHEN GRÜSSEN?!'], ['Charlie', 'WAFF?!']] },
    { img: 'f_dinner', cap: 'Noch am selben Abend: Krisensitzung. Am Küchentisch, wo bei Heistermanns alles Wichtige entschieden wird.', lines: [['Astrid', 'Kanders will den Wettbewerb abschaffen? Nicht mit mir und nicht mit uns.'], ['Nick', 'Ich fliege mit. Linker Flügel.'], ['Marina', 'Dann nehme ich den rechten. Einer muss ja treffen.'], ['Jan', 'Ich schraube. Paula navigiert.'], ['Paula', 'Sonst landet ihr am Ende noch in Bottrop.']] },
    { img: 'f_dinner', cap: 'Bleibt noch ein Tagesordnungspunkt.', lines: [['Marvin', 'Ich hätte da eine Idee …'], ['Marina', 'Marvin, dein Kanu, dein Paddel und dein Ball helfen uns hier im Weltraum nicht.'], ['Marc Heistermann', 'Einstimmig. Charlie kriegt ein Käseleckerli. Und dann fliegen wir los.']] },
    { img: 'f_astrid', cap: 'Astrid Heistermann übernimmt die Leitstelle. Ab jetzt hört die ganze Staffel auf ihr Kommando. Marc übrigens auch.', lines: [['Astrid', 'Leitstelle an alle: Wer zu spät zum Start kommt, räumt die Spülmaschine aus.'], ['Charlie', 'Wuff.'], ['Astrid', 'Du nicht, Charlie. Du hast Bereitschaft.']] },
    { img: 'x_vex', cap: 'Im Hangar der Nova Squadron wartete Verstärkung.', lines: [['Mini', 'Mini, ehemals Vorführwagen. Ich habe eine klemmende Hecktür und zu allem eine Meinung.'], ['Marc Heistermann', 'Perfekt. Du bist mein Co-Pilot.'], ['Charlie', 'Grrr.'], ['Mini', 'Er mag meine Hecktür nicht. Niemand mag meine Hecktür.']] },
  ] },
  m0: { title: 'Kapitel 1 · Der Kommandant steigt ein', pre: [
    { img: 'c_m0_1', cap: 'Die Arkaden der Kernstadt. Laden um Laden schließt.', lines: [['Mini', 'Hier stand ich früher und wurde angeboten. Es gab Probefahrten.'], ['Marc Heistermann', 'Dann wird das heute deine längste Probefahrt, Mini.']] },
    { img: 'x_m0_2', cap: 'Hangar. Die HV-7 „Pfeil“ steht bereit.', lines: [['Marc Heistermann', 'Ich habe lange genug nur geredet. Jetzt fliege ich selbst.'], ['Mini', 'Darf ich erinnern, dass dein letzter Urlaub, ich meine natürlich Flug, nur innerhalb Deutschlands war?'], ['Charlie', 'Wuff!'], ['Marc Heistermann', 'Kein Kommentar, bitte.']] },
    { img: 'f_hangar', cap: 'Jan und Marvin machen die Pfeil startklar.', fx: 'BRZZL!', lines: [['Jan', 'Triebwerk läuft. Das Klappern ist neu, das gehört so.'], ['Marvin', 'Ich habe noch ein Kanupolo-Tor ans Heck geschraubt. Für die Aerodynamik.'], ['Marina', 'Im All gibt es keine Luft, Marvin. Ich mache einen Raketenhalter daraus.'], ['Marvin', 'Das war Plan B.']] },
  ], post: [
    { img: 'x_m0_post', cap: 'Flugschule bestanden.', lines: [['Mini', 'Sieben von zehn. Der Looping war eine Vier, die Landung war ein Parkversuch.'], ['Marc Heistermann', 'Ich nehme die Sieben.'], ['Mini', 'Charlie gibt eine Zwei. Er ist strenger als ich.']] },
  ] },
  m1: { title: 'Kapitel 2 · Feuertaufe über Rüttenscheid', pre: [
    { img: 'c_m1_1', cap: 'Die Marktstation Rüttenscheid. Wer sie hält, setzt die Preise.', lines: [['Astrid', 'Heuschrecken-Drohnen im Anflug! Hunderte!']] },
    { img: 'f_wing', cap: 'An Marcs Flügeln: Nick links, Marina rechts.', lines: [['Nick', 'Wer die meisten Drohnen holt, sucht heute Abend den Film aus!'], ['Marina', 'Dann such dir schon mal was Schönes aus. Für mich.'], ['Marc Heistermann', 'Kinder. Konzentration.'], ['Astrid', 'Das gilt auch für dich, Marc.']] },
    { img: 'n_m1_mid', cap: 'Die Händler wehren sich mit allem, was die Auslage hergibt.', fx: 'KLATSCH!', lines: [['Fischhändlerin', 'Die Surimi und die Lachspastete sind von heute Morgen! Die halten schon noch was aus!']] },
    { img: 'c_m1_2', cap: 'Hinter dem Schwarm: die Korvette Vollstrecker.', lines: [['Marc Heistermann', 'Sechs Geschütze? Gut. Dann weiß ich, wohin ich zielen muss.'], ['Mini', 'Ich wüsste gern, wohin ich mich ducken muss.']] },
  ], post: [
    { img: 'x_m1_post', cap: 'Rüttenscheid ist frei. Das Frittenwerk hat wieder geöffnet.', lines: [['Händler', 'Geht aufs Haus, Kommandant. Doppelte Pommes, Currywurst, ohne Zwiebeln.'], ['Charlie', 'Wuff! Wuff!'], ['Marc Heistermann', 'Die Currywurst ist für mich, Charlie. Für dich habe ich Käseleckerlis dabei.'], ['Charlie', 'WUFF!']] },
  ] },
  m2: { title: 'Kapitel 3 · Zeche Zollverein', pre: [
    { img: 'c_m2_1', cap: 'Der alte Bergbaugürtel. Kanders’ Werbebojen senden auf allen Kanälen.', lines: [['Astrid', 'Komm… krrz… alles muss raus… krrz… nur heute…']] },
    { img: 'f_paula', cap: 'Paula lotst die Staffel durch den Bergbaugürtel.', lines: [['Paula', 'Hinter dem dritten Förderturm links. Dann immer dem Schacht nach.'], ['Jan', 'Und bitte keine Kratzer. Ich habe gerade poliert.'], ['Charlie', 'Wuff.'], ['Paula', 'Charlie sagt rechts. Charlie hat immer recht. Ich habe mich wohl vertan.']] },
    { img: 'x_m2_mid', cap: 'Im Cockpit.', fx: 'DÜDELDÜ!', lines: [['Marc Heistermann', 'Mini, kannst du die Werbung wegklicken?'], ['Mini', 'Ich habe es versucht. Jetzt habe ich drei Zeitschriften abonniert. 10,99 € im Monat.'], ['Mini', 'Das ist mehr, als der Oura-Ring im Monat kosten würde.'], ['Charlie', 'Auuuuuuuuu!']] },
    { img: 'c_m2_2', cap: 'Zwischen den Fördertürmen wartet einer, der Firmen abwickelt wie andere Leute Post.', lines: [['Der Liquidator', 'Heistermann. Ich wickle Sie ab. Sachlich, aber endgültig.'], ['Marina', 'Ohne Gesellschafterbeschluss? Das ficht jedes Erstsemester an.']] },
  ], post: [
    { img: 'n_m2_post', cap: 'Funkstille. Die gute Sorte.', lines: [['Mini', 'Tschüss! Und denken Sie an die Belege!'], ['Der Liquidator', '… ich hasse Außentermine.']] },
  ] },
  m3: { title: 'Kapitel 4 · Geleit auf dem Hellweg', pre: [
    { img: 'c_m3_1', cap: 'Der Hellweg, älteste Handelsroute des Systems. Drei Frachter mit Ware für die Läden von Essen.', lines: [['Astrid', 'Konvoi vollzählig. Baustelle umflogen. Ein Wunder.']] },
    { img: 'n_m3_mid', cap: 'Brücke der „Ruhrperle“. Kapitänin Erna Kowalski, vierzig Dienstjahre.', fx: 'KLICKER-KLACKER', lines: [['Käpt’n Erna', 'Bomber auf dem Schirm, Jungchen. Mach hin, ich bin gleich an der Ferse.']] },
    { img: 'c_m3_2', cap: 'Kanders schickt seine Abmahner.', lines: [['Marc Heistermann', 'Niemand mahnt meine Frachter ab!'], ['Marina', 'Juristisch ist das Unsinn, Papa. Aber es klingt gut.']] },
  ], post: [
    { img: 'x_m3_post', cap: 'Sprungtor Kettwig. Die Regale füllen sich.', lines: [['Käpt’n Erna', 'Der Schal ist für Charlie. Im All zieht’s.'], ['Marc Heistermann', 'Und ich, Erna?'], ['Käpt’n Erna', 'Du kriegst Kaffee, Jungchen.']] },
  ] },
  m3b: { title: 'Kapitel 5 · Die Geisterarkaden', pre: [
    { img: 'c_m4_1', cap: 'Limbecker Ring. Das größte Kaufhaus des Systems treibt dunkel im All.', lines: [['Mini', 'Früher hat man hier einen ganzen Tag verbummelt.']] },
    { img: 'x_m4_mid', cap: 'Drinnen.', fx: 'KNARZ …', lines: [['Mini', 'Die Puppe da hat sich bewegt.'], ['Marc Heistermann', 'Das ist eine Schaufensterpuppe, Mini.'], ['Mini', 'Sie trägt eine Drohne als Hut, Marc!'], ['Charlie', 'GRRRR-WUFF!'], ['Marc Heistermann', 'Siehst du. Charlie klärt das.']] },
    { img: 'c_m4_2', cap: 'Störer decken den Abzug. Goldtransporter schaffen die letzten Werte fort.', lines: [['Marc Heistermann', 'Leerstand ist kein Schicksal. Wir holen die Arkaden zurück.']] },
  ], post: [
    { img: 'x_m4_post', cap: 'Die Rollläden gehen hoch. Zum ersten Mal seit Jahren. Charlie hält das Band.', fx: 'SCHNIPP!', lines: [['Marc Heistermann', 'Hiermit eröffne ich … alles.'], ['Mini', 'Gang sieben, die Autoabteilung. Endlich bin ich wieder zu Hause.']] },
  ] },
  m4: { title: 'Kapitel 6 · Kreuzer Rendite', pre: [
    { img: 'c_m5_1', cap: 'Werft Borbeck. Hier liegt, was jede Besetzung deckt: der Kreuzer Rendite.', lines: [['Astrid', 'Vierhundert Meter Stahl, Marc. Heute ohne Eskorte.']] },
    { img: 'x_m5_mid', cap: 'Einsatzbesprechung. Die ganze Staffel ist da.', lines: [['Marc Heistermann', 'Erst die Türme. Dann die Schildkuppeln. Dann der Tresorkern am Heck.'], ['Nick', 'Papa, ist das ein Dentalstick?'], ['Marc Heistermann', 'Der Zeigestock steckt in der Baustelle fest. Und Charlie: nein. Erst nach dem Einsatz.'], ['Marina', 'Ob ein Dentalstick ein Zeigestock ist? Es kommt darauf an.']] },
    { img: 'c_m5_2', cap: 'Tiefflug über den Rücken der Rendite.', lines: [['Marc Heistermann', 'Auch die größte Rendite hat ein Heck.']] },
  ], post: [
    { img: 'n_m5_post', cap: 'Unternehmerverband, Chefetage.', fx: 'KRACKS!', lines: [['Hauptgeschäftsführer Kanders', 'Die Rendite ist … NEGATIV?!'], ['Assistent', 'Wir könnten es „Wachstumspause“ nennen, Herr Hauptgeschäftsführer.']] },
  ] },
  m5: { title: 'Kapitel 7 · Sturm über Hochofen', pre: [
    { img: 'c_m6_1', cap: 'Über der Lavawelt Hochofen sammelt Kanders seine Elite.', lines: [['Astrid', 'Drei Liquidatoren. Und sie sind nachtragend.']] },
    { img: 'f_marvin', cap: 'In der Werkstatt. Marvin hat etwas gebaut. Aus seiner Kanupolo-Ausrüstung.', fx: 'BZZZT!', lines: [['Marvin', 'Die Nova-Welle 2.0! Paddel, Ball, Helm. Ein Ring aus purer Energie. Theoretisch.'], ['Marina', 'Und praktisch?'], ['Marvin', 'Praktisch paddelt sie im Kreis.'], ['Marina', 'Gib her. Paddel umdrehen, Ball als Kondensator. So. Jetzt geht sie.'], ['Marc Heistermann', 'Bau es ein. Also das von Marina.']] },
    { img: 'c_m6_2', cap: 'Auf der Brücke des Flaggschiffs.', lines: [['Hauptgeschäftsführer Kanders', 'Heistermann. Immer wieder Heistermann. Beendet das.']] },
    { img: 'x_m6_mid', cap: 'Im Cockpit.', lines: [['Mini', 'Drei Liquidatoren, eine Korvette, zwei Goldtransporter. Und meine Hecktür klemmt immer noch.'], ['Marc Heistermann', 'Dann steigen wir halt vorne aus.'], ['Mini', 'Und Charlie döst. Im Anflug auf drei Liquidatoren. Ich will seine Nerven.']] },
  ], post: [
    { img: 'n_m6_post', cap: 'Die Elite. Ordentlich verschnürt.', lines: [['Mini', 'Drei Stück, frisch abgewickelt. Mit Schleife.'], ['Liquidator', 'Das wird ein Nachspiel haben. Schriftlich.'], ['Marina', 'Gern. Frist zwei Wochen, dreifache Ausfertigung.']] },
  ] },
  m6: { title: 'Kapitel 8 · Flaggschiff Monopol', pre: [
    { img: 'c_m7_1', cap: 'Über Essen Prime. Das Hauptgeschütz der Monopol lädt.', lines: [['Hauptgeschäftsführer Kanders', 'Ein Markt braucht keinen Wettbewerb. Er braucht einen Besitzer.'], ['Marina', 'Das Kartellamt sieht das anders. Und wir auch.']] },
    { img: 'n_m7_mid', cap: 'Brücke der Monopol.', lines: [['Hauptgeschäftsführer Kanders', 'Noch einen Espresso. Dann drücke ich den Knopf.'], ['Offizier', 'Herr Hauptgeschäftsführer, da kommt ein einzelner Jäger.'], ['Hauptgeschäftsführer Kanders', 'Lassen Sie mich raten.']] },
    { img: 'y_m7_charlie', cap: 'Im Cockpit der Pfeil.', fx: 'WUFF!', lines: [['Charlie', 'WUFF! WUFF! WUFF!'], ['Mini', 'Er sagt: Kern voraus. Oder er will einen Dentalstick. Die Betonung ist dieselbe.']] },
    { img: 'c_m7_2', cap: 'Ein einzelner Jäger unter dem Rumpf.', lines: [['Marc Heistermann', 'Ein Markt braucht Händler, Kanders. Viele. Und jetzt halt dich fest.'], ['Mini', 'Ich halte mich schon seit Kapitel 2 fest!']] },
  ], post: [
    { img: 'c_out_1', cap: 'Die Monopol zerbricht.', fx: 'KAWUMMS!', lines: [['Mini', 'Das war sie, Marc! Die ganze Flotte!']] },
    { img: 'y_out_mid', cap: 'Kanders kapituliert. Der Handelsverband hat eine Stelle frei.', lines: [['Mini', 'Der Ausstellungsraum muss gefegt werden. Die Schürze steht Ihnen.'], ['Marina', 'Die Kapitulation bitte schriftlich. Mündliche Nebenabreden gelten nicht.'], ['Charlie', 'Grrr.'], ['Hauptgeschäftsführer Kanders', '… mit freundlichen Grüßen.']] },
    { img: 'x_out_2', cap: 'Alle Verbände wählen den Handelsverband zu ihrem Vorsitz. Die Läden öffnen wieder. Sogar sonntags. Familie Heistermann steht auf dem Balkon. Charlie bekommt einen Orden. Und einen Dentalstick.', lines: [['Marc Heistermann', 'Dann machen wir Essen wieder auf. Alle zusammen.'], ['Astrid', 'Und sonntags wird trotzdem zu Hause gefrühstückt.'], ['Marvin', 'Ich hätte da übrigens noch eine Idee. Mit einem Kajak …'], ['Alle', 'NEIN, MARVIN!'], ['Charlie', 'WUFF!']] },
  ] },
};
export const MISSIONS = [
  {
    id: 'm0', aim: 'Lerne dein Schiff zu beherrschen', why: 'Der Handelsverband schickt niemanden unvorbereitet gegen Kanders’ Flotte.', station: true, n: 0, tutorial: true, name: 'Flugschule', place: 'Übungsraum über Essen Prime', env: 'kerasis',
    brief: 'Bevor du gegen den Unternehmerverband fliegst, frischst du mit der Leitstelle deine Flugkünste auf: schießen, rollen, Schub und Bremse, Looping, Wende, Waffenwechsel und die Nova-Welle. Zum Üben sind alle fünf Waffen freigeschaltet.',
    phases: [
      { label: 'Drei Übungsziele zerstören', hint: 'Maus oder WASD steuern · Leertaste feuert', hintTouch: 'Linker Daumen steuert · Fadenkreuz-Taste halten', spawn: [['target', 3]], comms: [['Astrid', 'Willkommen zurück im Cockpit, Kommandant Heistermann. Erst mal die Übungsziele.']] },
      { label: 'Eine Ausweichrolle fliegen', task: 'roll', hint: 'Taste Q oder E', hintTouch: 'Taste mit dem Kreispfeil', comms: [['Astrid', 'In der Rolle trifft dich nichts. Merk dir das.']] },
      { label: 'Schub geben, dann bremsen', task: 'speed', hint: 'Umschalt = Schub · C = Bremse', hintTouch: 'Pfeile hoch halten, dann Pfeile runter halten', comms: [['Mini', 'Mit der Bremse drehst du enger. Mit Schub entkommst du.']] },
      { label: 'Ein Looping fliegen', task: 'loop', hint: 'Taste R', hintTouch: 'Taste mit der Schleife', comms: [['Mini', 'Sitzt dir einer im Nacken? Looping, und du sitzt hinter ihm.']] },
      { label: 'Die Wende fliegen', task: 'turn', hint: 'Taste X', hintTouch: 'Taste mit dem Umkehrpfeil', comms: [['Astrid', 'Die Wende dreht dich in einer Sekunde um. Halber Looping, halbe Rolle.']] },
      { label: 'Die Waffe wechseln', task: 'weapon', hint: 'Tasten 1 bis 5 oder Mausrad', hintTouch: 'Waffensymbol unten antippen', comms: [['Mini', 'Fünf Waffen, alle ohne Munitionsgrenze. Probier sie durch.']] },
      { label: 'Die Nova-Welle zünden', task: 'nova', hint: 'Taste F', hintTouch: 'Taste mit den Ringen', comms: [['Astrid', 'Die Nova-Welle räumt alles um dich herum ab. Sie lädt sich von selbst wieder auf.']] },
      { label: 'Ernstfall: Heuschrecken abschießen', spawn: [['drone', 4]], comms: [['Astrid', 'Kein Übungsziel mehr. Der Unternehmerverband hat uns gefunden. Zeig, was du gelernt hast.']] },
    ],
  },
  {
    id: 'm1', aim: 'Verteidige die Marktstation Rüttenscheid und zerstöre die Korvette Vollstrecker', why: 'Wer die Marktstation hält, setzt die Preise im ganzen Sektor. Fällt sie an den Unternehmerverband, zahlen alle Händler seinen Zoll.', station: true, n: 1, name: 'Feuertaufe über Rüttenscheid', place: 'Orbit von Rüttenscheid', env: 'kerasis',
    brief: 'Der Unternehmerverband schickt Heuschrecken-Drohnen gegen die Marktstation über Rüttenscheid. Wer sie besetzt, diktiert dort die Preise. Fang den Schwarm ab.',
    phases: [
      { label: 'Heuschrecken abfangen', spawn: [['drone', 6]], comms: [['Astrid', 'Marc, der Schwarm ist da. Waffen frei. Und pass auf dich auf.']] },
      { label: 'Zweite Welle zerstören', spawn: [['drone', 8]], comms: [['Mini', 'Die wollen die Marktstation. Ich bleibe an deinem Flügel.']] },
      { label: 'Kurshaie ausschalten', spawn: [['drone', 5], ['inter', 4]], comms: [['Astrid', 'Schnelle Signaturen. Das sind Kurshaie. Halt sie dir vom Heck.']] },
      { label: 'Korvette Vollstrecker zerstören', spawn: [['corvette', 1], ['drone', 4]], comms: [['Astrid', 'Da kommt ihr Führungsschiff: die Korvette Vollstrecker. Sechs Geschütze, dicke Panzerung. Bleib in Bewegung und nimm sie auseinander.']] },
    ],
  },
  {
    id: 'm2', aim: 'Zerstöre alle fünf Werbebojen und den Liquidator, der sie bewacht', why: 'Solange die Bojen senden, kann der Handelsverband seine Frachter nicht warnen.', n: 2, name: 'Zeche Zollverein', place: 'Trümmergürtel Zollverein', env: 'belt',
    brief: 'Im alten Bergbaugürtel Zollverein senden Werbebojen des Unternehmerverbands auf allen Kanälen und legen unseren Funk lahm. Zerstöre alle fünf. Ein Liquidator bewacht sie.',
    phases: [
      { label: 'Werbebojen zerstören', spawn: [['buoy', 5], ['drone', 6]], comms: [['Astrid', 'Fünf Bojen zwischen den Felsen. Achte auf die Asteroiden.']] },
      { label: 'Verstärkung abwehren', spawn: [['inter', 5], ['drone', 5], ['kami', 6]], comms: [['Mini', 'Funk ist wieder da. Die Verstärkung des Verbands leider auch.']] },
      { label: 'Den Liquidator stellen', spawn: [['ace', 1], ['drone', 4]], comms: [['Liquidator', 'Ein einzelner Händler? Ich wickle dich ab wie jede andere Firma.']] },
    ],
  },
  {
    id: 'm3', aim: 'Bring die drei Frachter heil zum Sprungtor Kettwig', why: 'Ohne diese Lieferung stehen die Märkte von Essen leer, und Kanders verkauft als Einziger.', n: 3, name: 'Geleit auf dem Hellweg', place: 'Handelsroute Hellweg', env: 'nebula', convoy: 3,
    brief: 'Drei Frachter bringen Waren für die Märkte von Essen über den Hellweg. Abmahner-Bomber des Unternehmerverbands wollen die Lieferung stoppen. Je heiler die Frachter ankommen, desto besser die Wertung.',
    phases: [
      { label: 'Abmahner abfangen', spawn: [['bomber', 4], ['drone', 4]], comms: [['Frachter Ruhrperle', 'Nova Squadron, Bomber auf dem Schirm. Wir haben Ware für halb Essen an Bord.']] },
      { label: 'Zweiten Angriff abwehren', spawn: [['bomber', 5], ['inter', 4], ['kami', 5]], comms: [['Mini', 'Sie kommen von beiden Seiten. Nimm die Abmahner zuerst.']] },
      { label: 'Korvette und letzte Welle zerstören', spawn: [['corvette', 1], ['bomber', 5], ['drone', 5]], comms: [['Frachter Ruhrperle', 'Sprungtor Kettwig in Sicht. Nur noch diese Welle.']] },
    ],
  },
  {
    id: 'm3b', aim: 'Vertreibe die Besatzer aus den Geisterarkaden und stoppe die Goldtransporter', why: 'Kanders kauft leere Arkaden auf und lässt sie verfallen, damit dort niemand mehr handeln kann. Sind die Besatzer weg, ziehen wieder Händler ein.', station: true, n: 4, name: 'Die Geisterarkaden', place: 'Limbecker Ring', env: 'deep',
    brief: 'Am Limbecker Ring treibt das größte Kaufhaus des Systems dunkel im All. Störer und Schildträger des Unternehmerverbands halten es besetzt, Goldtransporter schaffen die letzten Werte fort. Hol die Arkaden zurück.',
    phases: [
      { label: 'Störer ausschalten', spawn: [['jammer', 3], ['drone', 5]], comms: [['Astrid', 'Störer voraus. Ihre violetten Kugeln legen deine Waffe lahm. Weich aus oder wechsle die Waffe.']] },
      { label: 'Schildträger und Abmahner zerstören', spawn: [['shielder', 2], ['bomber', 4], ['inter', 3]], comms: [['Mini', 'Die Schildträger decken alles um sich herum. Die zuerst, Marc!']] },
      { label: 'Goldtransporter stoppen', spawn: [['hauler', 2], ['kami', 5], ['drone', 4]], comms: [['Astrid', 'Zwei Transporter legen ab. Da drin steckt, was den Händlern gehört.']] },
    ],
  },
  {
    id: 'm4', aim: 'Versenke den Kreuzer Rendite: Türme, Schildgeneratoren, Tresorkern', why: 'Die Rendite deckt jede Besetzung des Unternehmerverbands. Ohne sie sind seine Stationen schutzlos.', station: true, n: 5, name: 'Kreuzer Rendite', place: 'Werft Borbeck', env: 'deep',
    brief: 'Der Kreuzer Rendite liegt ohne Eskorte vor der Werft Borbeck. Zerstöre seine Türme, dann die Schildgeneratoren auf dem Rücken. Erst danach liegt der Tresorkern am Heck frei.',
    phases: [
      { label: 'Geschütztürme zerstören', spawn: [['cruiser', 1], ['drone', 6]], goal: 'turret', comms: [['Astrid', 'Das ist die Rendite. Vierhundert Meter Stahl. Fang mit den Türmen an.']] },
      { label: 'Schildgeneratoren zerstören', spawn: [['inter', 5]], goal: 'gen', comms: [['Mini', 'Türme sind still. Die Kuppeln auf dem Rücken speisen den Kernschild.']] },
      { label: 'Tresorkern am Heck zerstören', spawn: [['drone', 6]], goal: 'core', comms: [['Astrid', 'Schild ist unten! Der Tresorkern am Heck liegt frei. Alles drauf!']] },
    ],
  },
  {
    id: 'm5', aim: 'Kapere Kanders’ Gold und schlage seine drei Liquidatoren', why: 'Mit dem Gold bezahlt Kanders seine Flotte, mit den Liquidatoren führt er sie. Beides verliert er heute.', n: 6, name: 'Sturm über Hochofen', place: 'Lavawelt Hochofen', env: 'pyra',
    brief: 'Über der Lavawelt Hochofen sammelt der Unternehmerverband seine Elite. Drei Liquidatoren führen sie an. Brich ihnen das Rückgrat, dann steht das Flaggschiff allein.',
    phases: [
      { label: 'Vorhut zerschlagen', spawn: [['corvette', 1], ['inter', 6], ['drone', 6]], comms: [['Astrid', 'Viele Kontakte. Bleib in Bewegung, Nova Eins.']] },
      { label: 'Goldtransporter abfangen', spawn: [['hauler', 2], ['drone', 6], ['kami', 4]], comms: [['Mini', 'Zwei Goldtransporter! Damit bezahlt Kanders seine Flotte. Hol sie dir, das gibt fette Prämie.']] },
      { label: 'Ersten Liquidator stellen', spawn: [['ace', 1], ['inter', 6]], comms: [['Liquidator', 'Du hast meinen Partner in Zollverein abgeschrieben. Das wird teuer.']] },
      { label: 'Die Doppelspitze brechen', spawn: [['ace', 2], ['drone', 8], ['bomber', 2]], comms: [['Mini', 'Zwei auf einmal. Ich nehme dir die Kleinen ab.']] },
    ],
  },
  {
    id: 'm6', aim: 'Vernichte das Flaggschiff Monopol', why: 'Fällt die Monopol, kapituliert der Unternehmerverband. Dann führt der Handelsverband alle Verbände von Essen.', n: 7, name: 'Flaggschiff Monopol', place: 'Über Essen Prime', env: 'deep', boss: true,
    brief: 'Die Monopol ist das Flaggschiff von Hauptgeschäftsführer Kanders. Ihr Hauptgeschütz zeichnet vor dem Schuss eine rote Linie: Flieg sofort aus ihr heraus. Türme, Generatoren, Kern. Fällt die Monopol, führt der Handelsverband alle Verbände.',
    phases: [
      { label: 'Türme der Monopol zerstören', spawn: [['dread', 1], ['drone', 8]], goal: 'turret', comms: [['Astrid', 'Alle Staffeln, das ist der Tag. Nova Eins führt den Angriff. Für Essen!']] },
      { label: 'Drei Schildgeneratoren zerstören', spawn: [['inter', 8], ['ace', 1]], goal: 'gen', comms: [['Hauptgeschäftsführer Kanders', 'Ihr kratzt an einem Konzern. Hauptgeschütz laden.']] },
      { label: 'Kern der Monopol vernichten', spawn: [['drone', 8], ['inter', 6]], goal: 'core', comms: [['Mini', 'Der Kern liegt frei! Unter dem Rumpf, in der Mitte!']] },
    ],
  },
];

// ---------- Wellen-Gefecht: Welle um Welle, nach jeder Welle eines von zwei Upgrades, jede fünfte Welle ein Boss ----------
export const ENDLESS = { id: 'endless', waves: true, endless: true, station: true, name: 'Wellen-Gefecht', place: 'Freier Raum über Essen', env: 'nebula',
  aim: 'Überstehe Welle um Welle und baue dein Schiff aus', why: 'Nach jeder Welle wählst du eines von zwei Upgrades. Jede fünfte Welle wartet ein Boss mit Sonderbelohnung.',
  brief: 'Der Unternehmerverband schickt alles, was er hat. Du startest nur mit dem Zwillingslaser. Nach jeder geschafften Welle wählst du eines von zwei Upgrades: Partnerschiff, neue Waffe, Schnellfeuer, Kettenblitz und mehr. Jede fünfte Welle führt ein Boss an, der mehr aushält und ein Sonder-Upgrade freischaltet.' };
export const RUN_UPS = [
  { id: 'weapon', name: 'Neue Waffe', desc: 'Schaltet die nächste Waffe frei', max: 4, icon: 'missile' },
  { id: 'wing', name: 'Partnerschiff', desc: 'Ein weiterer Jäger fliegt an deiner Seite', max: 4, icon: 'wing' },
  { id: 'rate', name: 'Schnellfeuer', desc: '+12 % Feuerrate für alle Waffen', max: 6, icon: 'laser' },
  { id: 'dmg', name: 'Fokuskristalle', desc: '+20 % Schaden für alle Waffen', max: 8, icon: 'orb' },
  { id: 'multi', name: 'Zusatzläufe', desc: 'Mehr Bolzen und Raketen pro Salve', max: 3, icon: 'spread' },
  { id: 'engine', name: 'Nachbrenner', desc: '+8 % Tempo und Wendigkeit', max: 5, icon: 'boost' },
  { id: 'shield', name: 'Schildgenerator', desc: '+25 Schild, lädt schneller', max: 5, icon: 'shield' },
  { id: 'nova', name: 'Nova-Kern', desc: 'Nova-Welle lädt schneller und trifft härter', max: 3, icon: 'nova' },
  { id: 'chain', name: 'Kettenblitz', desc: 'Lasertreffer springen auf einen zweiten Gegner über', max: 3, icon: 'chain' },
  { id: 'shrap', name: 'Splitterladung', desc: 'Zerstörte Gegner schleudern Bolzen in alle Richtungen', max: 3, icon: 'shrap' },
  { id: 'tail', name: 'Heckgeschütz', desc: 'Feuert selbstständig auf Verfolger', max: 3, icon: 'turn' },
  { id: 'lock', name: 'Zielcomputer', desc: 'Raketen erfassen zwei Ziele mehr im Visier', max: 2, icon: 'fire' },
  { id: 'stab', name: 'Trägheitsdämpfer', desc: 'Treffer bremsen dich deutlich weniger', max: 2, icon: 'brake' },
];
export const BOSS_UPS = [
  { id: 'over', name: 'Überladung', desc: '+60 % Schaden für alle Waffen', icon: 'orb' },
  { id: 'squad', name: 'Geschwader', desc: 'Zwei Partnerschiffe auf einmal', icon: 'wing' },
  { id: 'super', name: 'Supernova', desc: 'Nova-Welle reicht doppelt so weit und lädt doppelt so schnell', icon: 'nova' },
  { id: 'aegis', name: 'Aegis-Schild', desc: '+100 Schild, jeder Abschuss lädt ihn sofort nach', icon: 'shield' },
  { id: 'arsenal', name: 'Arsenal', desc: 'Alle fünf Waffen sofort freigeschaltet', icon: 'missile' },
];
export function wavePhase(n) {
  const k = 1 + n * 0.09, c = (x) => Math.max(1, Math.round(x * k));
  if (n % 5 === 0) {
    const b = (n / 5 - 1) % 4, tier = Math.floor(n / 20);
    if (b === 0) return { boss: true, label: 'Boss: Korvette Vollstrecker', spawn: [['corvette', 1 + tier], ['drone', c(3)]], comms: [['Astrid', 'Bosswelle! Eine Korvette führt sie an. Sechs Geschütze, bleib in Bewegung.']] };
    if (b === 1) return { boss: true, label: 'Boss: Die Liquidatoren', spawn: [['ace', 2 + tier], ['jammer', 1], ['inter', c(2)]], comms: [['Liquidator', 'Du hast genug Wellen überlebt. Jetzt wickeln wir dich persönlich ab.']] };
    if (b === 2) return { boss: true, goal: 'core', label: 'Boss: Kreuzer Rendite · Generatoren, dann Kern', spawn: [['cruiser', 1], ['drone', c(3)]], comms: [['Astrid', 'Ein Kreuzer! Zerstöre die Schildgeneratoren auf dem Rücken, dann den Kern am Heck.']] };
    return { boss: true, goal: 'core', label: 'Boss: Flaggschiff Monopol · Generatoren, dann Kern', spawn: [['dread', 1], ['inter', c(3)]], comms: [['Hauptgeschäftsführer Kanders', 'Genug gespielt. Die Monopol beendet das.']] };
  }
  const themes = [
    ['Heuschrecken-Schwarm', [['drone', c(4)]], 'Langsam, aber viele. Gute Übung.'],
    ['Schnelle Kurshaie', [['inter', c(3)], ['drone', c(2)]], 'Die Kurshaie sind schnell. Nutz die Bremse, um hinter sie zu kommen.'],
    ['Spekulanten im Sturzflug', [['kami', c(5)], ['drone', c(2)]], 'Rammdrohnen! Schieß sie ab, bevor sie dich erreichen, oder roll weg.'],
    ['Abmahner mit Schildträger', [['bomber', c(2)], ['shielder', 1], ['drone', c(2)]], 'Der Schildträger schützt alle um sich herum. Nimm ihn zuerst.'],
    ['Störer und Eskorte', [['jammer', c(1)], ['inter', c(3)]], 'Die violetten Kugeln der Störer legen deine Waffe lahm. Ausweichen oder Waffe wechseln.'],
    ['Goldtransporter abfangen', [['hauler', 1], ['drone', c(3)], ['kami', c(2)]], 'Ein Goldtransporter. Zäh, aber fette Prämie.'],
    ['Gemischter Verband', [['drone', c(3)], ['inter', c(2)], ['shielder', 1], ['jammer', 1]], 'Von allem etwas. Schildträger und Störer zuerst.'],
  ];
  const [name, spawn, tip] = themes[n <= 4 ? n - 1 : (n * 3 + (n >> 2)) % themes.length];
  return { label: `Welle ${n}: ${name}`, spawn, comms: n <= 9 || n % 3 === 0 ? [['Mini', tip]] : [] };
}
