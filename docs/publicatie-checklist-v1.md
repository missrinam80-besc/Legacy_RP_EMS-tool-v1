# EMS Tool – publicatiecheck v1

## Fase 12.1 – Basisversie
Deze basisversie hoort zichtbaar en bruikbaar te zijn:
- medewerker homepage
- command homepage
- portalen per afdeling
- personeelslijst
- afwezigheid
- feedback / training / specialisatie
- kostencalculator
- hoofd-behandeltool
- rapporten
- beheer modules / prijzen / medicatie / personeel / thema

## Fase 12.2 – Go-live check
Controleer voor publicatie:
1. Home medewerker laadt modulekaarten correct.
2. Command laadt modulekaarten correct.
3. Alle portalen tonen minstens tools / rapporten / aanvragen.
4. Links uit modulekaarten openen correct vanaf root én portalen.
5. Banner en thema laden uit centrale config of lokale fallback.
6. Kostencalculator laadt prijzen.
7. Behandeltool laadt centrale medicatie / letsels / behandelregels.
8. Rapporten openen zonder console errors.
9. Aanvragen genereren output zonder ontbrekende velden.
10. Personeelslijst laadt zonder API-fout of toont fallbackmelding.

## Aanbevolen publicatiestap
- eerst testen via GitHub Pages preview
- daarna Apps Script endpoint controleren
- daarna pas definitief publiceren
