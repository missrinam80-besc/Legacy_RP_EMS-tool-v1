# Beheer en onderhoud

## Doel

Deze pagina beschrijft hoe de toolset beheerd, aangepast en uitgebreid wordt.

---

## Nieuwe module toevoegen

1. maak een nieuwe map aan
2. voeg basisbestanden toe
3. gebruik de standaardstructuur
4. koppel centrale styles
5. documenteer de module in README
6. voeg de module toe aan de wiki
7. test lokaal en na publicatie

---

## Bestaande module aanpassen

Bij wijzigingen controleer je:

- functioneert de bestaande invoer nog correct
- wordt output nog correct opgebouwd
- zijn selectors of id’s niet gebroken
- blijft layout bruikbaar op verschillende schermgroottes
- zijn README en wiki nog correct

---

## Refactoren

Bij refactors is het belangrijk om:

- logica op te splitsen zonder gedrag te breken
- centrale assets zorgvuldig aan te passen
- bestaande modules te testen op regressies

---

## Testchecklist

Voor publicatie of oplevering:

- laadt de pagina correct
- werken alle knoppen
- zijn er geen console errors
- zijn null-risico’s afgevangen
- klopt de outputtekst
- werkt layout op kleinere schermen
- is de README nog actueel

---

## Onderhoudsregel

Documentatie hoort mee te evolueren met de code. Een wijziging aan logica, structuur of configuratie vraagt vaak ook een aanpassing aan:

- README
- wiki
- comments in script
