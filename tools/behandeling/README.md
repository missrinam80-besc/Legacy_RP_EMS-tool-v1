# EMS Behandeltool v3

## Nieuw in v3

- afdelingsfilter:
  - Alles
  - Ambulance
  - Spoed
  - Chirurgie
- kostenraming:
  - letsels
  - items
  - onderzoeken
  - totaal
- nazorg / opvolging
- afdeling-specifieke filtering van advies

## Structuur

- `tools/behandeling/index.html`
- `tools/behandeling/app.js`
- `tools/behandeling/config.json`
- `tools/behandeling/README.md`

## Centrale styles

- `../../assets/styles/base.css`
- `../../assets/styles/components.css`
- `../../assets/styles/layout.css`
- `../../assets/styles/theme.css`
- `../../assets/styles/utilities.css`
- `../../assets/styles/behandeling.css`

## Werking

1. Vul patiëntgegevens in
2. Kies algemene toestand
3. Kies eventueel een afdelingsfilter
4. Voeg per lichaamsdeel één of meerdere letsels toe
5. Duid fractuur en/of beeldvorming aan
6. Genereer advies
7. Lees:
   - prioriteit
   - afdelingen
   - stappenplan
   - handelingen
   - items
   - onderzoeken
   - nazorg
   - kosten
   - rapportsamenvatting

## Config

De meeste inhoud zit in `config.json`:
- lichaamsdelen
- wondtypes
- selecties
- letselregels
- follow-up
- itemlabels
- tekstmapping
- kosten

## Belangrijke noot

De kosten zijn een eenvoudige raming voor RP-gebruik.
Je kan ze volledig aanpassen in `config.json`.

## Mogelijke uitbreidingen voor v4

- export richting rapportmodule
- aparte views per afdeling
- checkboxen voor uitgevoerde behandelingen
- status "behandeling voltooid / in uitvoering"
- automatische samenvatting per afdeling