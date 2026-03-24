# Legacy_RP_EMS-tool-v1

Verzameling van losse EMS-webtools in één GitHub-repository.

## Doel

Deze repo bevat meerdere onafhankelijke tools:
- zonder database
- zonder backend
- in HTML/CSS/JS/JSON
- geschikt voor GitHub Pages

Elke tool staat in een eigen map en werkt volledig zelfstandig.

## Structuur

- `index.html` → centrale startpagina
- `assets/` → gedeelde styles en afbeeldingen
- `tools/` → aparte toolmappen

## Tools

- `tools/trauma-report/`
- `tools/labo-report/`
- `tools/opname-report/`
- `tools/operatie-report/`

## GitHub Pages

Publiceer de root van deze repository via GitHub Pages.
De hub staat dan op de hoofd-URL en elke tool op een subpad.

Voorbeeld:
- `/` → hub
- `/tools/trauma-report/`
- `/tools/labo-report/`
- `/tools/opname-report/`
- `/tools/operatie-report/`

## Belangrijk

Elke tool gebruikt een eigen `localStorage`-sleutel zodat data van tools niet gemengd wordt.
