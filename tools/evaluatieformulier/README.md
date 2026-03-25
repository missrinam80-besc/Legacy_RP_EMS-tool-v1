# Evaluatieformulier – EMS Tools

## Doel van deze tool
Dit evaluatieformulier helpt leidinggevenden binnen de EMS om medewerkers op een gestructureerde en uniforme manier te evalueren. De tool bouwt automatisch een volledig evaluatieverslag op basis van ingevulde gegevens, scores en opmerkingen.

De tool is bedoeld voor gebruik in een EMS-omgeving binnen GTA RP, maar is technisch ook bruikbaar in andere gelijkaardige organisatiestructuren.

---

## Belangrijkste functies

- Selectie van een medewerker uit de personeelslijst
- Automatische invulling van:
  - naam
  - roepnummer
  - rang
- Selectie van een evaluator uit de personeelslijst
- Evaluator is beperkt tot leidinggevende rangen:
  - Lieutenant
  - Captain
  - Assistant Chief
  - Deputy Chief
  - Chief of EMS
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

Deze module bestaat minimaal uit de volgende bestanden:

- `index.html`
- `app.js`
- `config.json`
- `personeel.json`
- `README.md`

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

---

## Werking van de personeelskoppeling

De tool leest medewerkers in vanuit `personeel.json`.

### Medewerker
Bij selectie van een medewerker worden automatisch ingevuld:
- naam
- roepnummer
- rang

Deze velden zijn readonly en worden dus niet handmatig aangepast in het formulier.

### Evaluator
Bij selectie van een evaluator worden automatisch ingevuld:
- naam evaluator
- rang evaluator

De evaluator-dropdown toont enkel medewerkers met één van deze rangen:
- Lieutenant
- Captain
- Assistant Chief
- Deputy Chief
- Chief of EMS

In de dropdown zelf wordt enkel de naam getoond, zodat dit overzichtelijk blijft.

---

## Vereiste structuur van `personeel.json`

Elke medewerker in `personeel.json` moet minstens deze velden bevatten:

```json
{
  "name": "Lynn Wexler",
  "callSign": "200",
  "rank": "Chief of EMS"
}