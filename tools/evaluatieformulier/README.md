# Evaluatieformulier V6 – EMS Tools

## Doel van deze tool

Dit evaluatieformulier helpt leidinggevenden binnen de EMS om medewerkers op een gestructureerde en uniforme manier te evalueren. De tool bouwt automatisch een volledig evaluatieverslag op basis van ingevulde gegevens, scores en opmerkingen.

De tool gebruikt de centrale personeelsbron via `ems-staff-service.js` en de bestaande Apps Script API van de personeelslijst.

---

## Belangrijkste functies

- Selectie van een medewerker uit de centrale personeelslijst
- Automatische invulling van:
  - naam
  - roepnummer
  - rang
- Selectie van een evaluator uit de centrale personeelslijst
- Evaluator beperkt tot configureerbare leidinggevende rangen
- Automatische invulling van:
  - naam evaluator
  - rang evaluator
- Beoordeling per onderdeel met score en opmerking
- Automatische berekening van een gemiddeld scorebeeld
- Automatische samenvattende feedback
- Generatie van een volledig evaluatieverslag
- Kopiëren van de output
- Download als `.txt`
- Printvriendelijke versie

---

## Bestandsstructuur

- `index.html`
- `app.js`
- `config.json`
- `README.md`
- `ems-staff-service.js`

Daarnaast gebruikt deze tool gedeelde styles en scripts uit de centrale assets-map:

- `../../assets/styles/theme.css`
- `../../assets/styles/base.css`
- `../../assets/styles/layout.css`
- `../../assets/styles/components.css`
- `../../assets/styles/utilities.css`
- `../../assets/styles/evaluation.css`
- `../../assets/scripts/core.js`
- `../../assets/scripts/ui.js`
- `../../assets/scripts/export.js`
- `../../assets/scripts/ems-staff-service.js`

---

## Configuratie

In `config.json` moet je deze waarde invullen:

```json
"staffApiUrl": "https://script.google.com/macros/s/AKfycbxh-7nXpT8A7D4KCQJsvA3rS_fWbFZUPsxC6zjbiLuN5Cp2y8AZ35NrrtgwGhgX8KffRA/exec"