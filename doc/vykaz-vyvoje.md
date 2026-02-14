# Výkaz vývoje FaktAI (z Git commitů)

## Metodika výpočtu času
Tato metodika je závazná pro další průběžné doplňování tabulky.

1. Zdroj dat jsou všechny commity v repozitáři (`git log`), den se bere podle data commitu (`YYYY-MM-DD`).
2. Pro každý commit vznikne interval práce `[čas_commitu - 15 minut, čas_commitu]`.
3. Intervaly v rámci stejného dne se sloučí, pokud se překrývají nebo navazují.
4. Prakticky to znamená: pokud je rozdíl mezi dvěma sousedními commity `<= 15 minut`, jde o souvislou práci.
5. Čas za den je součet délek sloučených intervalů.
6. Ve výkazu jsou jen dny, kdy existuje alespoň jeden commit.

## Jak výpočet zopakovat
1. Vytáhni historii commitů s časy:
   - `git log --reverse --date=iso --pretty=format:'%ad|%s'`
2. Aplikuj výše uvedený algoritmus (15 minut před commitem + slučování intervalů).
3. Aktualizuj tabulku níže o nové dny.

## Denní přehled (od začátku projektu do teď)
| Datum | Čas | Co se naprogramovalo |
|---|---:|---|
| 2026-02-13 | 6h 39m | Proběhl kompletní základ projektu: monorepo, auth/session, onboarding subjektu, seznam a editor faktur, PDF export a první DPH/XML exporty. Následně velká série UX a UI iterací (hlavička, layout, seznam faktur, detail/editace, akce, filtry, landing/onboarding). V závěru dne se řešely i první branding a procesní úpravy. |
| 2026-02-14 | 4h 51m | Den byl hlavně o dokončení produktu do provozu: landing grafika, CapRover deployment podklady, CORS/deploy fixy a rebranding na FaktAI včetně log. Dále proběhly změny ve fakturaci (číslování, custom čísla, copy flow), FU XML mapování, kontakty pro FÚ a práce s datem úhrady. Nakonec fix regrese číselné řady bez děr u neuložené nové faktury. |

## Součet
- Celkem: **11h 30m**
