# EMS Behandeltool v5

## Locatie

- `tools/behandeling/index.html`
- `tools/behandeling/app.js`
- `tools/behandeling/config.json`
- `tools/behandeling/README.md`

## Gebruikte styles

- `../../assets/styles/base.css`
- `../../assets/styles/components.css`
- `../../assets/styles/layout.css`
- `../../assets/styles/theme.css`
- `../../assets/styles/utilities.css`
- `../../assets/styles/behandeling.css`

## Nieuw in v5

- banner-header bovenaan
- titel onder de banner
- toelichting in een uitklapbaar veld
- 2 afdelingsviews:
  - Spoed/Ambulance
  - Chirurgie
- waarschuwingsblok bovenaan
- operatie-indicatie
- klinische indruk / vitals-interpretatie
- beeldvorming apart gestructureerd
- patiëntgerichte nazorg
- afsluitstatus patiënt
- compacte modus
- filter “toon alleen relevante info”

## Medische logica

### Spoed/Ambulance
Voor:
- basis wondzorg
- stabilisatie
- immobilisatie
- pijnstilling
- beeldvorming aanvragen
- eenvoudige wondsluiting

### Chirurgie
Voor:
- schotwonden
- ernstige penetrerende letsels
- complexe avulsies
- verpletteringsletsels
- ernstig romptrauma
- intern letsel
- duidelijke operatie-indicatie

## Werking

1. Vul patiëntgegevens in
2. Kies de afdelingsview
3. Kies eventueel een display-filter
4. Kies volledige of compacte modus
5. Voeg letsels toe per lichaamsdeel
6. Duid fractuur en/of beeldvorming aan
7. Genereer advies
8. Lees:
   - waarschuwingen
   - prioriteit
   - operatie-indicatie
   - klinische indruk
   - afdelingen
   - stappenplan
   - handelingen
   - items
   - beeldvorming
   - nazorg
   - afsluitstatus
   - kosten
   - rapportsamenvatting

## Toekomstige nice to have

- exportprofielen
  - korte RP-samenvatting
  - medisch verslag
  - chirurgische samenvatting
  - opnameadvies
  - ontslagadvies