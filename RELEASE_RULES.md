# VAJAGMAN – Release notes (iekšējās darba piezīmes)

Šis fails ir domāts **izstrādei un uzturēšanai**, nevis lietotājiem.
Mērķis: lai, mainot čatu / kontekstu, būtu viena vieta, kur atcerēties projekta darba noteikumus.

## 1) Patiesība un offline-first
- **DB (Google Sheets) ir galvenā patiesība.**
- Lokālais kešs ir darba buferis.
- Konfliktā **DB uzvar**, bet lokālās izmaiņas nedrīkst pazust (paliek ar ⚠️ katalogā).

## 2) Versionēšanas noteikumi (OBLIGĀTI)
Versijai ir jābūt **vienādai šajās vietās**:
1. `app.js` – `APP_VERSION` un `APP_DATE` (to redz UI)
2. `index.html` – `#verText` (fallback, ja JS neielādējas)
3. `service-worker.js` – `CACHE_NAME` (PWA keša atjaunošana)
4. ZIP faila nosaukums: `vajagman_<APP_VERSION>_<APP_DATE>.zip`

Ja kaut kas nesakrīt, rodas “spoku” kļūdas:
- UI rāda vienu versiju, bet pārlūks vēl servē vecos failus no keša.

## 3) UI disciplīna
- **KARTE** šķirklis ir etalons vertikālajām atstarpēm.
- Pārējos šķirkļos atstarpes pielāgo KARTE ritmam (nevis “katram savs”).

## 4) Drošības piezīme
- Neieliec tehniskus tekstus lietotāja skatā.
- Admin diagnostika ir paslēpta (5 tap uz versijas) un paredzēta tikai adminam.
