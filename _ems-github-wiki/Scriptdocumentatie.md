# Scriptdocumentatie

## Doel

Scripts moeten intern gedocumenteerd worden zodat ze later sneller gelezen, aangepast en uitgebreid kunnen worden.

---

## Blokcommentaar bovenaan elk script

Elk scriptbestand krijgt bovenaan een blokcommentaar met:

- naam van de module
- doel van het script
- globale werking
- bijzonderheden

Voorbeeld:

```js
/**
 * Trauma rapport module
 * Verwerkt formulierinvoer en bouwt een gestructureerd rapport op.
 * Werkt zonder backend of database.
 */
```

---

## Commentaar per functie

Documenteer belangrijke functies.

Voorbeeld:

```js
/**
 * Bouwt de uiteindelijke rapporttekst op uit genormaliseerde formulierdata.
 * @param {Object} formData
 * @returns {string}
 */
function buildReport(formData) {
  // ...
}
```

---

## Secties in scripts

Verdeel scripts in logische blokken.

Voorbeeld:

```js
// =========================
// DOM REFERENCES
// =========================

// =========================
// INITIALISATIE
// =========================

// =========================
// DATA NORMALISATIE
// =========================

// =========================
// RAPPORTOPBOUW
// =========================

// =========================
// UI ACTIES
// =========================
```

---

## Wat zeker gedocumenteerd moet worden

- kernfuncties
- complexe logica
- mappings en uitzonderingen
- validatie
- imports of exports
- afhankelijkheden van configuratie

---

## Wat beter niet gebeurt

- overcommenten van evidente code
- comments die niet overeenkomen met de echte werking
- comments die verouderen en niet bijgewerkt worden

---

## Praktische regel

Elke functie die niet in één oogopslag vanzelfsprekend is, moet een korte uitleg krijgen.
