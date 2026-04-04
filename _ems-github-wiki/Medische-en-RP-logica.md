# Medische en RP-logica

## Doel

Deze pagina beschrijft de functionele basislogica die over meerdere tools heen gebruikt wordt. De precieze medische details zijn afgestemd op de RP-context, maar worden gestructureerd en consequent toegepast om rapporten, behandeladviezen en aanvragen logisch op te bouwen.

---

## Basisflow

De meeste tools volgen deze flow:

```text
Input
→ Analyse
→ Behandeladvies of rapportlogica
→ Output
```

Meer concreet:

```text
Vitals + verwondingen + observaties
→ interpretatie
→ behandelingen / samenvatting / rapport
```

---

## Vitals

Typische vitals die in meerdere tools terugkomen:

- bewustzijn
- pols
- bloeddruk
- temperatuur
- pijnniveau
- bloedverlies

Deze dienen als basis voor:

- prioriteit
- ernstinschatting
- rapportering
- behandeladviezen

---

## Verwondingen

Verwondingen worden idealiter geregistreerd per lichaamszone.

Standaard lichaamszones:

- hoofd
- romp
- linkerarm
- rechterarm
- linkerbeen
- rechterbeen

Per verwonding kunnen volgende eigenschappen relevant zijn:

- type
- ernst
- bloeding
- pijnimpact
- nood aan hechten
- mobiliteitsimpact

---

## Fracturen

Fracturen worden behandeld als een aparte categorie met eigen gevolgen.

Belangrijke aspecten:

- locatie van de breuk
- ernst of type breuk
- mobiliteitsbeperking
- nood aan stabilisatie
- opvolging of nazorg

---

## Triage

Triage kan gebruikt worden om urgentie of prioriteit aan te duiden.

Voorbeeldniveaus:

- niet urgent
- urgent
- kritiek
- overleden

Niet elke module moet deze niveaus volledig gebruiken, maar de logica moet consequent blijven.

---

## Prioriteiten in behandeling

De globale behandelvolgorde volgt meestal deze principes:

1. stabiliseren
2. bloeding aanpakken
3. bewustzijn en algemene toestand beoordelen
4. fracturen of ernstige letsels stabiliseren
5. verdere behandeling uitvoeren
6. nazorg of vervolgacties bepalen

---

## Behandelingen

Veelvoorkomende behandelingen in de toolset:

- verband
- hechten
- spalk of gips
- medicatie
- infuus of vloeistof
- observatie
- transport
- opname
- operatie

De exacte logica kan per tool verschillen, maar de terminologie moet gelijk blijven.

---

## Rapportlogica

Veel rapporten volgen een vergelijkbare vaste structuur:

1. patiëntgegevens
2. situatiegegevens
3. observaties
4. vitals
5. verwondingen
6. behandelingen
7. resultaat of status
8. nazorg of vervolg

---

## RP-context

De tool ondersteunt een fictieve RP-context. Dat betekent:

- de logica moet bruikbaar, duidelijk en intern consistent zijn
- het systeem moet praktisch blijven voor spelers en staff
- de inhoud mag geïnspireerd zijn op realistische structuren, maar blijft afgestemd op gameplay en roleplay

---

## Richtlijn voor nieuwe modules

Nieuwe modules moeten steeds aansluiten op:

- de vaste terminologie
- de standaard lichaamszones
- de basisflow van input naar output
- de algemene rapportstructuur waar relevant
