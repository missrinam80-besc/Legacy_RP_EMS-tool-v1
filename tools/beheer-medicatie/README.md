# Beheer medicatie & hulpmiddelen v1

## Doel
Centrale beheermodule voor medicatie, hulpmiddelen, verbruiksartikelen en ingreepkits binnen de EMS suite.

Deze module beheert:
- medicatie
- hulpmiddelen
- wondzorg en verbruik
- chirurgische of procedurele kits
- afdelingsspecifieke inzetbaarheid
- waarschuwingen, indicaties en prijsinformatie

## Opslag
- Default data: `../../data/admin/default-medication.json`
- Local storage key: `ems_admin_medication`

## Functies
- items oplijsten
- zoeken en filteren
- toevoegen en bewerken
- verwijderen
- importeren en exporteren als JSON
- reset naar standaarddata
- preview van gebruik in tools en rapporten

## Koppeling
Deze module is bedoeld als centrale bron voor:
- behandeltools
- operatie-tool
- revalidatie-tool
- psychologietool
- rapporten met materiaal- of medicatieverbruik

In v1 staat vooral het beheerscherm klaar. Verdere automatische koppelingen naar de medische tools kunnen hier later op aansluiten.
