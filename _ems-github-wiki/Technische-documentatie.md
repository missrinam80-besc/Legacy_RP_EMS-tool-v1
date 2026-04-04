# Technische documentatie

## Doel

Deze pagina beschrijft de technische basisstructuur die over de volledige toolset gebruikt wordt.

---

## Basisonderdelen per module

### `index.html`
Bevat:

- pagina-opbouw
- invoervelden
- knoppen
- resultaatblokken
- koppelingen naar CSS en JavaScript

### `app.js` of `script.js`
Bevat:

- initialisatie
- event listeners
- validatie
- logica
- opbouw van output
- UI-acties

### `config.json`
Bevat waar nuttig:

- labels
- keuzelijsten
- mappings
- templates
- instellingen

### `README.md`
Bevat:

- uitleg over doel en werking
- bestandsstructuur
- configuratie
- gekende beperkingen

---

## Centrale styles

Typische centrale styles:

- `base.css`
- `components.css`
- `layout.css`
- `theme.css`
- `utilities.css`

Deze zorgen voor consistentie tussen modules.

---

## Tool-specifieke styles

Wanneer een module eigen layout of specifieke componenten heeft, krijgt ze een extra CSS-bestand.

Voorbeelden:

- `behandeling.css`
- `operatie.css`
- `trauma.css`

---

## Best practice voor scripts

- scheid input, validatie, logica en output in duidelijke functies
- vermijd één groot script zonder structuur
- documenteer functies
- controleer of DOM-elementen bestaan voor gebruik
- gebruik voorspelbare id’s en selectors

---

## Import en export

Afhankelijk van de module kunnen volgende functies voorzien worden:

- kopiëren naar klembord
- resetten van formulier
- importeren van JSON of tool-output
- exporteren van tekst of JSON
- printweergave

---

## Onderhoudsprincipe

Wijzigingen aan centrale assets kunnen impact hebben op meerdere modules. Controleer daarom na elke wijziging:

- layout
- knoppen en componenten
- responsive gedrag
- scriptfunctionaliteit
