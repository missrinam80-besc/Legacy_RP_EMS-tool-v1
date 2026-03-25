# Evaluatieformulier V3

Volledige evaluatietool voor EMS-medewerkers, opgebouwd als client-side webtool zonder database.

## Functionaliteiten

- Dynamische evaluatiecategorieën via `config.json`
- Score per onderdeel
- Kleurbadge per score
- Automatische gemiddelde score
- Automatische samenvattende feedback
- Eindbeoordeling en eindbesluit
- Secties voor sterktes, werkpunten en opvolgafspraken
- Kopiëren, downloaden en printen

## Bestanden

- `index.html`  
  Structuur van de tool en de UI

- `app.js`  
  Alle logica voor scores, feedback en output

- `config.json`  
  Instellingen, categorieën, scoremapping en besluitopties

- `README.md`  
  Korte documentatie

## Gebruik

1. Vul de algemene gegevens in
2. Geef per onderdeel een score en optionele opmerking
3. Vul sterktes, werkpunten en afspraken aan
4. Klik op **Verslag opbouwen**
5. Kopieer, download of print het resultaat

## Aanpassen

### Categorieën wijzigen
Pas in `config.json` de lijst onder `"categories"` aan.

### Evaluatietypes wijzigen
Pas in `config.json` de lijst onder `"evaluationTypes"` aan.

### Besluitopties wijzigen
Pas in `config.json` de lijst onder `"decisions"` aan.

### Scoresysteem wijzigen
Pas `"scores"` en `"scoreMap"` samen aan.

## Opmerking

Deze tool bewaart geen gegevens en werkt volledig in de browser.