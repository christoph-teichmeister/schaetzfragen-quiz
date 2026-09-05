#!/usr/bin/env node
/**
 * Validiert alle Fragen-Sets unter questions/ gegen die Qualitätsregeln
 * aus dem Projektkontext (siehe README / Projektnotizen):
 *   1. Pflichtfelder vollständig
 *   2. Hint verrät die Antwort nicht (Heuristik)
 *   3. Keine doppelten Fragen-IDs innerhalb eines Sets
 *   4. index.json referenziert nur existierende Dateien
 *   5. Keine "verwaisten" Set-Dateien (nicht in index.json gelistet)
 *   6. Warnung bei identischem Fragetext across Sets (mögliches Duplikat)
 *
 * Exit code 1 bei Fehlern (bricht den Deploy ab), 0 bei nur Warnungen.
 */
const fs = require('fs');
const path = require('path');

const QUESTIONS_DIR = path.join(__dirname, '..', 'questions');
const errors = [];
const warnings = [];

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Akzente entfernen
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Satzzeichen entfernen
    .replace(/\s+/g, ' ')
    .trim();
}

// ── index.json laden ──
let indexList;
try {
  indexList = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, 'index.json'), 'utf8'));
} catch (e) {
  console.error('❌ questions/index.json konnte nicht gelesen/geparst werden:', e.message);
  process.exit(1);
}

if (!Array.isArray(indexList) || indexList.length === 0) {
  errors.push('questions/index.json ist kein nicht-leeres Array.');
}

// ── Verwaiste Dateien prüfen ──
const allJsonFiles = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
allJsonFiles.forEach(f => {
  if (!indexList.includes(f)) {
    warnings.push(`Datei "${f}" liegt in questions/, ist aber nicht in index.json eingetragen (wird nicht angezeigt).`);
  }
});

const seenQuestionTexts = new Map(); // normalizedText -> [setId, ...]

indexList.forEach(filename => {
  const filePath = path.join(QUESTIONS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    errors.push(`index.json referenziert "${filename}", aber die Datei existiert nicht.`);
    return;
  }

  let set;
  try {
    set = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    errors.push(`${filename}: ungültiges JSON (${e.message})`);
    return;
  }

  const ctx = `${filename} (${set.id || '??'})`;

  ['id', 'title', 'emoji', 'description', 'category'].forEach(field => {
    if (!set[field] || typeof set[field] !== 'string' || !set[field].trim()) {
      errors.push(`${ctx}: Pflichtfeld "${field}" fehlt oder ist leer.`);
    }
  });

  if (!Array.isArray(set.questions) || set.questions.length === 0) {
    errors.push(`${ctx}: "questions" fehlt oder ist ein leeres Array.`);
    return;
  }

  const seenIdsInSet = new Set();

  set.questions.forEach((q, i) => {
    const qCtx = `${ctx} → Frage #${q.id !== undefined ? q.id : i + 1}`;

    ['question', 'hint', 'answer', 'explanation'].forEach(field => {
      if (!q[field] || typeof q[field] !== 'string' || !q[field].trim()) {
        errors.push(`${qCtx}: Pflichtfeld "${field}" fehlt oder ist leer.`);
      }
    });

    if (q.id === undefined || q.id === null) {
      errors.push(`${qCtx}: Feld "id" fehlt.`);
    } else if (seenIdsInSet.has(q.id)) {
      errors.push(`${qCtx}: doppelte Frage-ID "${q.id}" innerhalb des Sets.`);
    } else {
      seenIdsInSet.add(q.id);
    }

    // Heuristik: verrät der Hint schon die Antwort?
    if (q.hint && q.answer) {
      const normAnswer = normalize(q.answer);
      const normHint = normalize(q.hint);
      // Nur bei aussagekräftiger Antwortlänge prüfen (kurze Zahlen/Wörter erzeugen sonst False Positives)
      if (normAnswer.length >= 4 && normHint.includes(normAnswer)) {
        errors.push(`${qCtx}: Hint scheint die Antwort direkt zu enthalten ("${q.hint}" vs. Antwort "${q.answer}").`);
      }
    }

    // Cross-Set Duplikat-Check (exakter Fragetext, normalisiert)
    if (q.question) {
      const normQ = normalize(q.question);
      if (normQ.length > 0) {
        if (seenQuestionTexts.has(normQ)) {
          const otherSets = seenQuestionTexts.get(normQ);
          warnings.push(`Frage "${q.question}" (${ctx}) ist textlich identisch mit einer Frage in: ${otherSets.join(', ')}.`);
          otherSets.push(ctx);
        } else {
          seenQuestionTexts.set(normQ, [ctx]);
        }
      }
    }
  });
});

// ── Ausgabe ──
if (warnings.length > 0) {
  console.log(`⚠️  ${warnings.length} Warnung(en):`);
  warnings.forEach(w => console.log('   - ' + w));
}

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} Fehler gefunden — Deploy wird abgebrochen:`);
  errors.forEach(e => console.error('   - ' + e));
  process.exit(1);
}

console.log(`\n✅ Alle ${indexList.length} Fragen-Sets sind gültig.`);
process.exit(0);
