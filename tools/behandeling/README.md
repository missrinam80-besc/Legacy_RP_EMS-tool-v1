# EMS Behandeltool v1

## Doel
Deze tool helpt EMS-medewerkers om op basis van:
- algemene toestand
- vitale functies
- bloedverlies
- pijn
- letsels per lichaamsdeel
- vermoedelijke fracturen

een eerste behandeladvies op te bouwen.

De tool is ondersteunend en werkt volledig client-side.

---

## Bestandsstructuur

- `index.html`  
  De HTML-structuur van de tool

- `app.js`  
  De logica van de tool:
  - config laden
  - invoervelden opbouwen
  - behandeladvies berekenen
  - rapporttekst genereren

- `config.json`  
  Centrale configuratie voor:
  - lichaamsdelen
  - wondtypes
  - select-opties
  - itemlabels
  - wondregels
  - tekstmapping

- `assets/styles/behandeling.css`  
  Tool-specifieke styling

---

## Centrale CSS

Deze tool gebruikt ook de bestaande centrale stylesheets:

- `assets/styles/base.css`
- `assets/styles/components.css`
- `assets/styles/layout.css`
- `assets/styles/theme.css`
- `assets/styles/utilities.css`

---

## Werking

1. Vul patiëntgegevens in
2. Kies de algemene toestand
3. Voeg letsels toe per lichaamsdeel
4. Duid fracturen aan waar nodig
5. Klik op **Genereer advies**
6. Lees:
   - prioriteit
   - handelingen
   - aanbevolen items
   - aandachtspunten
   - korte rapportsamenvatting

---

## Aanpassen van wondtypes of regels

Pas `config.json` aan.

### Nieuwe wond toevoegen
Voeg toe in:
- `woundOptions`
- `woundRules`

### Nieuw item toevoegen
Voeg toe in:
- `itemLabels`

### Nieuw lichaamsdeel toevoegen
Voeg toe in:
- `bodyParts`

---

## Belangrijke opmerking

Deze tool bewaart niets in een database.
Alles gebeurt lokaal in de browser.

---

## Mogelijke uitbreidingen voor v2

- meerdere wonden per lichaamsdeel
- RX/scan-advies
- afdelingsweergaves
- behandelingen per afdeling
- export naar rapporttool
- kostenkoppeling