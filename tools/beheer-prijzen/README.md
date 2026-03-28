# Beheer prijzen v1

## Doel
Centrale beheermodule voor prijsregels binnen de EMS suite.

Deze module beheert:
- consultkosten
- behandelingen
- ingrepen
- opname- en nazorgkosten
- zichtbaarheid per documenttype
- zichtbaarheid in kostencalculator en rapporten

## Opslag
- Default data: `../../data/admin/default-prices.json`
- Local storage key: `ems_admin_prices`

## Functies
- prijsregels oplijsten
- zoeken en filteren
- toevoegen en bewerken
- verwijderen
- importeren en exporteren als JSON
- reset naar standaarddata

## Koppeling
De kostencalculator leest deze data uit wanneer er aangepaste prijsregels in localStorage bestaan. Daardoor kan je prijzen centraal beheren zonder de calculator handmatig aan te passen.
