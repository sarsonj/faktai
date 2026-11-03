-- CR-0051: datumy dokladů jsou kalendářní dny uložené jako UTC půlnoc.
-- Starší záznamy mohly vzniknout jako lokální půlnoc Europe/Prague (22:00/23:00 UTC
-- předchozího dne) nebo jako okamžik s časem (paidAt). Převedeme je na pražský
-- kalendářní den uložený jako UTC půlnoc. Hodnoty už zarovnané na půlnoc se nemění.

UPDATE "Invoice"
SET "issueDate" = date_trunc('day', ("issueDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Prague')
WHERE "issueDate" <> date_trunc('day', "issueDate");

UPDATE "Invoice"
SET "taxableSupplyDate" = date_trunc('day', ("taxableSupplyDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Prague')
WHERE "taxableSupplyDate" <> date_trunc('day', "taxableSupplyDate");

UPDATE "Invoice"
SET "dueDate" = date_trunc('day', ("dueDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Prague')
WHERE "dueDate" <> date_trunc('day', "dueDate");

UPDATE "Invoice"
SET "paidAt" = date_trunc('day', ("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Prague')
WHERE "paidAt" IS NOT NULL AND "paidAt" <> date_trunc('day', "paidAt");
