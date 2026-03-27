# Integratienotities voor de bestaande behandeltool

De huidige behandeltool bevat al een ingebouwd kostenblok. Als je de kostencalculator volledig wilt loskoppelen, haal dan deze delen uit de behandeltool:

## 1. Uit `index.html` verwijderen

Verwijder het volledige blok:

- `<details id="costBlock" ...>`

Daarin zitten:
- `costInjuries`
- `costItems`
- `costInvestigations`
- `costTotal`
- `costBreakdownList`

## 2. Uit `app.js` verwijderen

### DOM references
Verwijder:
- `const costInjuries = ...`
- `const costItems = ...`
- `const costInvestigations = ...`
- `const costTotal = ...`
- `const costBreakdownList = ...`

### BLOCKS map
Verwijder:
- `costs: document.getElementById("costBlock")`

### In `buildTreatmentAdvice()`
Verwijder:
- de volledige `costState`
- `addInjuryCost(...)`
- `addItemCosts(...)`
- `addInvestigationCosts(...)`
- de volledige `costs` return property
- `addCostLine(...)`

### Functies volledig verwijderen
Verwijder deze functies:
- `addInjuryCost`
- `addItemCosts`
- `addInvestigationCosts`
- `addCostLine`
- `renderCosts`
- `formatCurrency` (alleen als je ze nergens anders meer gebruikt)

### In `renderResult(result)`
Verwijder:
- `renderCosts(result.costs);`

### In `handleReset()`
Verwijder:
- `renderCosts({ injuries: 0, items: 0, investigations: 0, total: 0, breakdown: [] });`

## 3. Uit `config.json`
Je kunt de bestaande `costs`-sectie laten staan als je die nog wilt hergebruiken.
Wil je volledige scheiding, verplaats dan de hele `costs`-sectie naar de aparte kostencalculator-config.

## 4. Aanbevolen vervolgstructuur

- `tools/kosten/index.html`
- `tools/kosten/app.js`
- `tools/kosten/config.json`
- `tools/kosten/style.css`

En later eventueel:

- gedeeld `costs.json`
- gedeeld `departments.json`

Zo kun je meerdere modules op dezelfde kostbasis laten werken zonder alles dubbel te beheren.
