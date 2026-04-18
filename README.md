# 🏛️ Schätzfragen — Quiz App

Einfache, schlanke Quiz-App für Schätzfragen zu zweit oder in der Gruppe.  
Kein Backend, kein Build-Step — nur statische Files.

---

## 🚀 Lokal starten

```bash
npx serve .
# oder
python3 -m http.server 8080
```

Dann: `http://localhost:3000` (bzw. den angezeigten Port öffnen).

> ⚠️ Direkt als `file://` öffnen funktioniert nicht (CORS beim JSON-Laden).

---

## ➕ Neues Fragen-Set hinzufügen

### 1. JSON-Datei erstellen

Neue Datei in `questions/` anlegen, z.B. `questions/mein-thema.json`:

```json
{
  "id": "mein-thema",
  "title": "Mein Thema",
  "emoji": "🎯",
  "description": "Kurze Beschreibung des Sets",
  "questions": [
    {
      "id": 1,
      "question": "Wie viele...?",
      "hint": "Kleiner Hinweis für die Spieler",
      "answer": "42",
      "explanation": "Erklärung warum die Antwort stimmt und was interessant daran ist."
    }
  ]
}
```

### 2. Set registrieren

In `questions/index.json` den Dateinamen eintragen:

```json
[
  "athen-griechenland.json",
  "weltrekorde.json",
  "mein-thema.json"
]
```

Fertig — beim nächsten Laden erscheint das Set automatisch.

---

## 📁 Struktur

```
quiz-app/
├── index.html              # Die komplette App
├── questions/
│   ├── index.json          # Registry aller Sets
│   ├── athen-griechenland.json
│   ├── weltrekorde.json
│   └── dein-neues-set.json
└── README.md
```

---

## 🎮 Spielweise

1. Set auswählen
2. Frage laut vorlesen
3. Alle schätzen
4. **"Antwort aufdecken"** klicken
5. Punkte vergeben — wer am nächsten war, gewinnt die Runde

Fortschritt (gelöste Fragen) wird pro Session angezeigt.

---

## 🌐 Deployment

**GitHub Pages:**
1. Repo auf GitHub pushen
2. Settings → Pages → Branch: `main`, Folder: `/ (root)`
3. App ist unter `https://dein-name.github.io/quiz-app/` erreichbar

**Netlify / Vercel:** Einfach den Ordner droppen — läuft sofort.
