# EMS Kostencalculator

Aparte module voor kostenbeheer in de EMS-toolset.

## Bestanden

- `index.html` → de losse kostentool
- `style.css` → styling van de kostentool
- `app.js` → logica voor berekening, breakdown en samenvatting
- `config.json` → tarieven, wondtypes, items, onderzoeken en afdelingsspecifieke extra kosten

## Doel

Deze module haalt het kostenstuk uit de behandeltool zodat je:

- tarieven centraal kunt beheren
- extra behandelkosten per afdeling kunt toevoegen
- dezelfde kostlogica later kunt hergebruiken in rapporten en behandelingstools
- de kostencalculator zelfstandig kunt openen, embedden of linken

## Wat zit erin?

- letselkosten op basis van wondtype + ernst
- optionele fractuurtoeslag
- kosten voor items / behandelingen
- kosten voor onderzoeken
- afdelingsspecifieke extra kosten
- vrije extra kosten
- totaal + detailoverzicht
- kopieerbare samenvatting

## Hoe uitbreiden?

### Nieuwe afdeling toevoegen
Voeg in `config.json` toe:

1. extra optie in `selectOptions.departments`
2. nieuwe sleutel in `departmentExtras`

### Nieuwe behandelkost toevoegen
Voeg in `departmentExtras.<afdeling>` een extra object toe:

```json
{ "code": "nieuwe_kost", "label": "Nieuwe behandeling", "amount": 65 }
```

### Nieuwe items of onderzoeken toevoegen
- items: `itemLabels` en `costs.items`
- onderzoeken: `costs.investigations`

## Integratie in andere tools

Je kunt later:

- deze module apart openen en de output kopiëren naar een rapport
- dezelfde `config.json` hergebruiken in andere modules
- de berekeningsfuncties uit `app.js` verplaatsen naar een gedeeld scriptbestand
