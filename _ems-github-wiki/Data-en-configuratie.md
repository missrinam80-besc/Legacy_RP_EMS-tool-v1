# Data en configuratie

## Doel

Deze pagina beschrijft welke gegevens in configuratiebestanden thuishoren en hoe die best gestructureerd worden.

---

## Wanneer JSON gebruiken

Gebruik JSON voor data die:

- regelmatig aangepast kan worden
- geen code hoeft te zijn
- herbruikbaar moet zijn
- beter leesbaar is buiten JavaScript

Voorbeelden:

- labels
- dropdown-opties
- standaardteksten
- mappings
- kostenregels
- lijstjes met types of categorieën

---

## Wat beter in JavaScript blijft

Hou logica in JavaScript wanneer het gaat om:

- berekeningen
- validatie
- conditionele output
- dynamische interactie
- event handling

---

## Richtlijnen voor JSON-structuur

- groepeer logisch
- gebruik duidelijke sleutelnaamgeving
- werk consistent
- vermijd onnodige nesting
- documenteer indien nodig in README of wiki

---

## Voorbeeld

```json
{
  "appTitle": "Trauma rapport",
  "injuryOptions": ["Schaafwonde", "Breuk", "Brandwonde"],
  "painLevels": ["Licht", "Gemiddeld", "Hoog", "Extreem"]
}
```

---

## Versiebeheer van configuratie

Wanneer configuratie een impact heeft op de werking:

- pas README aan indien nodig
- controleer of de UI nog correct werkt
- controleer of mappings of labels niet breken in scripts
