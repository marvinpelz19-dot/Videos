window.STORYBOARD={
 "meta": {
  "fps": 30,
  "bpm": 105.45,
  "title": "Zeit für Axt-ion! – Gutschein für Paula",
  "product": "Axtwurf-Gutschein",
  "source": "Originalvideo Axtwurf-Gutschein"
 },
 "theme": {
  "accent": "#e0562a",
  "canvas": "#f6f2ec"
 },
 "brand": {
  "name": "Axtwurf"
 },
 "scenes": [
  {
   "type": "sentence",
   "id": "eilmeldung",
   "bg": "night",
   "steps": [
    {
     "at": 0.05,
     "text": "@icon:megaphone [Eilmeldung]",
     "size": 104,
     "weight": 600,
     "enter": "fade"
    }
   ],
   "dur": 1.138
  },
  {
   "type": "sentence",
   "id": "jan",
   "defaults": {
    "size": 100
   },
   "steps": [
    {
     "at": 0,
     "text": "Jan",
     "size": 420,
     "enter": "blur"
    },
    {
     "at": 0.45,
     "text": "Jan"
    },
    {
     "at": 0.7,
     "text": "Jan hat zum | Geburtstag"
    },
    {
     "at": 1.15,
     "text": "Jan hat zum | Geburtstag | einen Gutschein | fürs [Axtwerfen] | bekommen."
    }
   ],
   "dur": 2.833
  },
  {
   "type": "ui",
   "id": "gutschein-jan",
   "src": "assets/voucher-jan-26b65afb.png",
   "frame": "bare",
   "radius": 28,
   "width": 900,
   "y": 90,
   "camera": [
    {
     "at": 0,
     "zoom": 1
    },
    {
     "at": 0.6,
     "zoom": 1
    },
    {
     "at": 1.6,
     "zoom": 1.25,
     "focus": [
      0.62,
      0.3
     ]
    }
   ],
   "caption": {
    "steps": [
     {
      "at": 0.2,
      "text": "Für"
     },
     {
      "at": 0.4,
      "text": "Für [Jan.]"
     }
    ],
    "defaults": {
     "size": 96,
     "y": 300,
     "weight": 600
    }
   },
   "dur": 2.24
  },
  {
   "type": "sentence",
   "id": "und-du",
   "steps": [
    {
     "at": 0,
     "text": "Und du,",
     "size": 170,
     "weight": 600
    },
    {
     "at": 0.5,
     "text": "Und du, | [Paula?]",
     "size": 170,
     "weight": 600
    }
   ],
   "dur": 1.707
  },
  {
   "type": "chat",
   "id": "gedanken",
   "x": 60,
   "maxWidth": 900,
   "size": 74,
   "anchor": 1500,
   "bubbles": [
    {
     "at": 0.15,
     "who": "Du dachtest bestimmt …",
     "text": "„Die gehen ja nur mit Jan.“"
    },
    {
     "at": 1.4,
     "text": "Dann bin ich allein zu Hause und ess Snacks."
    }
   ],
   "dur": 2.821
  },
  {
   "type": "sentence",
   "id": "falsch",
   "bg": "night",
   "steps": [
    {
     "at": 0,
     "text": "[Thunk!]",
     "size": 220,
     "weight": 700,
     "enter": "pop"
    },
    {
     "at": 0.55,
     "text": "Falsch | [gedacht.]",
     "size": 180,
     "weight": 600
    }
   ],
   "dur": 1.695
  },
  {
   "type": "sentence",
   "id": "selbst",
   "steps": [
    {
     "at": 0,
     "text": "Du",
     "size": 460,
     "enter": "blur"
    },
    {
     "at": 0.4,
     "text": "Du",
     "size": 160,
     "weight": 600
    },
    {
     "at": 0.6,
     "text": "Du wirfst | [selbst!]",
     "size": 160,
     "weight": 600
    }
   ],
   "deco": [
    {
     "at": 1.2,
     "kind": "underline",
     "word": "selbst!"
    }
   ],
   "dur": 2.264
  },
  {
   "type": "burst",
   "id": "alles-gute",
   "pillSize": 84,
   "burstAt": 1.1,
   "tilt": -6,
   "pillSteps": [
    {
     "at": 0,
     "text": "Alles Gute,"
    },
    {
     "at": 0.4,
     "text": "Alles Gute, Paula!"
    }
   ],
   "items": [
    {
     "shape": "star",
     "color": "#f5b82e",
     "eyes": true
    },
    {
     "shape": "heart",
     "color": "#e0562a",
     "eyes": true
    },
    {
     "shape": "circle",
     "color": "#6b3f26",
     "eyes": true
    },
    {
     "shape": "triangle",
     "color": "#f08a4b",
     "eyes": true
    }
   ],
   "count": 14,
   "itemSize": 170,
   "dur": 2.264
  },
  {
   "type": "ui",
   "id": "gutschein-paula",
   "src": "assets/voucher-paula-e9f0b242.png",
   "frame": "bare",
   "radius": 28,
   "width": 960,
   "y": 110,
   "camera": [
    {
     "at": 0,
     "zoom": 1
    },
    {
     "at": 3.4,
     "zoom": 1.04
    }
   ],
   "caption": {
    "steps": [
     {
      "at": 0.3,
      "text": "Zwei Geburtstagskinder."
     },
     {
      "at": 1,
      "text": "Zwei Geburtstagskinder. | [Ein Axtwurf-Abenteuer.]"
     }
    ],
    "defaults": {
     "size": 70,
     "y": 250,
     "weight": 600
    }
   },
   "dur": 2.845
  }
 ]
};
