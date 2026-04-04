# Architectuur

## Overzicht

De EMS Tool is opgezet als een **statische, modulaire webtoolset**. Elke module functioneert zelfstandig en bestaat uit een beperkte set bestanden.

Een typische module bevat:

- `index.html`
- `app.js` of `script.js`
- `config.json`
- een tool-specifieke CSS
- `README.md`

---

## Waarom geen backend of database

Er is bewust gekozen om geen backend of database te gebruiken. Daardoor blijft de tool:

- licht
- snel
- makkelijk te hosten
- eenvoudig te verplaatsen
- overzichtelijk in beheer

De focus ligt op:

- invoer via formulieren
- verwerking in JavaScript
- output als rapport, advies, samenvatting of berekening

Niet op:

- centrale opslag
- login-structuren
- realtime samenwerking
- dossierbeheer over meerdere gebruikers heen

---

## Modulaire opbouw

Elke tool wordt gezien als een zelfstandige mini-webapp.

Voorbeeldstructuur:

```text
/tools/
  /rapport-trauma/
    index.html
    app.js
    config.json
    README.md
  /rapport-operatie/
    index.html
    app.js
    config.json
    README.md
/assets/
  /styles/
    base.css
    components.css
    layout.css
    theme.css
```

---

## Centrale en lokale bestanden

### Centrale bestanden
Worden gedeeld over meerdere modules.

Voorbeelden:

- `base.css`
- `components.css`
- `layout.css`
- `theme.css`

### Lokale bestanden
Zijn specifiek voor één module.

Voorbeelden:

- `operatie.css`
- `behandeling.css`
- `config.json` van een specifieke tool
- tool-specifieke logica in `app.js`

---

## Rol van HTML, CSS, JavaScript en JSON

### HTML
Bepaalt de structuur van de pagina en de invoervelden.

### CSS
Stuurt layout, stijl, leesbaarheid en responsiveness.

### JavaScript
Verwerkt de invoer, bouwt output op, valideert gegevens en beheert interactie.

### JSON
Bevat configuratie, labels, standaardopties, mappings, teksten of templates.

---

## Hosting

De tool is bedoeld om te werken via GitHub en GitHub Pages.

Voordelen:

- eenvoudige publicatie
- versiebeheer
- centraal beheer van code
- makkelijk te delen via link

---

## Gebruik in Google Sites

De tools kunnen:

- via een link geopend worden
- of waar mogelijk ingesloten worden in Google Sites

Voor complexere tools is een directe link meestal betrouwbaarder dan een embed.
