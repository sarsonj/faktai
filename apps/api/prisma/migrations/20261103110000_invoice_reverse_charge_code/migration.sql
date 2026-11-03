-- CR-0053: kód předmětu plnění pro režim přenesení daňové povinnosti (KH oddíl A.1)
ALTER TABLE "Invoice" ADD COLUMN "reverseChargeCode" VARCHAR(4);
