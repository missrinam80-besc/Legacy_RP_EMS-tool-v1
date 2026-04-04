# Projectstandaarden

## Doel van deze standaarden

Deze standaarden zorgen voor:

- consistente structuur
- sneller onderhoud
- duidelijkere documentatie
- herbruikbare patronen
- minder fouten bij uitbreiding

---

## Naamgeving

### Mappen
Gebruik duidelijke, korte en voorspelbare namen.

Voorbeelden:

- `rapport-trauma`
- `rapport-operatie`
- `labo-aanvraag`
- `kostencalculator`

### Bestanden
Gebruik vaste en herkenbare bestandsnamen.

Voorbeelden:

- `index.html`
- `app.js`
- `config.json`
- `README.md`

Tool-specifieke CSS mag beschrijvend zijn:

- `trauma.css`
- `operatie.css`
- `psychologie.css`

---

## Standaardstructuur per module

```text
/module-naam/
  index.html
  app.js
  config.json
  README.md
```

Indien nodig:

```text
/module-naam/
  index.html
  app.js
  config.json
  README.md
  extra-data.json
```

---

## Scriptstructuur

Scripts worden bij voorkeur opgedeeld in duidelijke secties:

```js
// =========================
// INITIALISATIE
// =========================

// =========================
// FORMULIERINVOER
// =========================

// =========================
// VALIDATIE
// =========================

// =========================
// RAPPORTOPBOUW
// =========================

// =========================
// UI ACTIES
// =========================
```

---

## Commentaarstijl

Elke belangrijke file krijgt bovenaan een blokcommentaar met:

- naam van de module
- doel van het bestand
- globale werking
- bijzonderheden

Elke belangrijke functie krijgt een korte beschrijving met:

- wat de functie doet
- welke input verwacht wordt
- wat teruggegeven wordt

---

## README-standaard

Elke module krijgt een eigen README met minstens:

1. Doel van de module
2. Functionaliteiten
3. Bestandsstructuur
4. Werking
5. Configuratie
6. Bekende beperkingen
7. Toekomstige uitbreidingen

---

## JSON-afspraken

Gebruik JSON voor:

- labels
- keuzelijsten
- templates
- mappings
- kostenstructuren
- configuratie-opties

Houd JSON:

- logisch gegroepeerd
- leesbaar benoemd
- consistent qua sleutelnaamgeving

---

## UI/UX-richtlijnen

- werk met duidelijke secties
- gebruik uitklapbare blokken waar nuttig
- hou formulieren logisch gegroepeerd
- toon output overzichtelijk rechts of onderaan
- vermijd overbodige visuele drukte
- kies voor leesbare titels en labels

---

## Validatie en foutafhandeling

- controleer op ontbrekende velden
- vermijd null errors
- geef duidelijke foutmeldingen
- gebruik veilige defaults waar mogelijk

---

## Versiebeheer

Bij grotere wijzigingen:

- noteer wat aangepast werd
- werk README en wiki bij indien nodig
- controleer of oude modules niet breken door gedeelde assets of gedeelde scripts
