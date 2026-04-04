# EMS Tool Wiki

Welkom in de wiki van de **EMS Tool**. Deze wiki documenteert de volledige opbouw, werking, afspraken en onderhoudsrichtlijnen van de modulaire EMS-toolset.

De tool is ontworpen als een **lichte, statische en modulaire webtoolset** zonder backend of database. Elke module werkt zelfstandig en bestaat uit HTML, CSS, JavaScript en JSON. Dit maakt de tool eenvoudig te beheren, uit te breiden, te hosten via GitHub Pages en te gebruiken binnen Google Sites of via directe links.

---

## Inhoud

### 1. Project en visie
- [[Introductie]]
- [[Architectuur]]
- [[Projectstandaarden]]

### 2. Functionele logica
- [[Medische-en-RP-logica]]
- [[Modules-overzicht]]

### 3. Module-documentatie
- [[Trauma-rapport]]
- [[Opnamerapport]]
- [[Operatierapport]]
- [[Coma-rapport]]
- [[Forensisch-rapport]]
- [[Labo-aanvraag]]
- [[Labo-resultaten-en-attesten]]
- [[Kostencalculator]]
- [[Behandeltool-spoed-en-ambulance]]
- [[Chirurgie-tool]]
- [[Psychologie-tool]]
- [[Ortho-en-revalidatie-tool]]

### 4. Technische documentatie
- [[Technische-documentatie]]
- [[README-richtlijnen]]
- [[Scriptdocumentatie]]
- [[Data-en-configuratie]]
- [[Frontend-en-interface]]

### 5. Beheer en onderhoud
- [[Beheer-en-onderhoud]]
- [[Roadmap]]
- [[Bijlagen]]

---

## Doel van deze wiki

Deze wiki heeft vier functies:

1. **Overzicht geven** van de volledige EMS-toolset.
2. **Standaarden vastleggen** voor code, bestandsstructuur, README’s en documentatie.
3. **Functionele logica documenteren** zodat medische en RP-logica consequent gebruikt wordt.
4. **Onderhoud en uitbreiding vereenvoudigen** voor huidige en toekomstige modules.

---

## Basisprincipes van het project

- **Modulair**: elke tool staat op zichzelf.
- **Statisch**: geen backend, geen database, geen server-side opslag.
- **Leesbaar**: scripts bevatten duidelijke comments en secties.
- **Beheerbaar**: elke module heeft een eigen README.
- **Herbruikbaar**: logica en structuur worden zo veel mogelijk gestandaardiseerd.
- **Praktisch**: focus op invoer, verwerking en output, niet op centrale opslag.

---

## Aanbevolen leesvolgorde

Voor nieuwe medewerkers of ontwikkelaars:

1. [[Introductie]]
2. [[Architectuur]]
3. [[Projectstandaarden]]
4. [[Medische-en-RP-logica]]
5. [[Modules-overzicht]]
6. [[Technische-documentatie]]
7. [[README-richtlijnen]]
8. [[Scriptdocumentatie]]

---

## Snelle navigatie per doel

### Ik wil begrijpen hoe het systeem werkt
Ga naar [[Introductie]], [[Architectuur]] en [[Modules-overzicht]].

### Ik wil een module aanpassen
Ga naar [[Projectstandaarden]], [[Technische-documentatie]] en de pagina van de betreffende module.

### Ik wil een nieuwe module maken
Ga naar [[Architectuur]], [[Projectstandaarden]], [[README-richtlijnen]] en [[Beheer-en-onderhoud]].

### Ik wil de medische of RP-logica begrijpen
Ga naar [[Medische-en-RP-logica]].

### Ik wil scripts beter documenteren
Ga naar [[Scriptdocumentatie]].

---

## Huidige scope

Deze wiki dekt:

- rapportmodules
- behandelmodules
- aanvraagmodules
- calculatie- en generator-tools
- technische standaarden
- onderhoudsrichtlijnen
- uitbreidingsrichtingen

---

## Opmerking

Deze wiki is geschreven voor een GitHub-gebaseerde toolstructuur. Alle voorbeelden, afspraken en richtlijnen zijn afgestemd op een omgeving met:

- HTML
- CSS
- JavaScript
- JSON
- GitHub
- GitHub Pages
- optioneel Google Sites als frontend-portaal
