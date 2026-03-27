# EMS Behandeltool v2

## Nieuw in v2

- meerdere letsels per lichaamsdeel
- ernst per letsel
- luchtweg en ademhaling toegevoegd
- beeldvorming / onderzoeken
- afdelingen-tags
- stappenplan
- uitgebreidere rapportsamenvatting

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
3. Voeg per lichaamsdeel één of meerdere letsels toe
4. Duid fractuur en/of beeldvorming aan indien nodig
5. Genereer advies
6. Lees:
   - prioriteit
   - afdelingen
   - stappenplan
   - handelingen
   - items
   - onderzoeken
   - aandachtspunten
   - rapportsamenvatting

## Config

De meeste inhoud zit in `config.json`:
- lichaamsdelen
- wondtypes
- selecties
- letselregels
- itemlabels
- tekstmapping

## Volgende versie

Mogelijke uitbreidingen voor v3:
- kostberekening
- export naar rapportmodule
- filters per afdeling
- standaardprocedures per letseltype
- opvolg-/nazorgadvies