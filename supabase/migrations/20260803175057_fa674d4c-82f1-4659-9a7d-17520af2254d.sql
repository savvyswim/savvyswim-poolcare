UPDATE public.cleaning_plans
SET price = '$89.99',
    cadence = '/ month',
    price_small = 89.99,
    price_medium = 89.99,
    price_large = 89.99,
    items = ARRAY['Weekly visits (4 per month)','Skim, brush & vacuum','Basket & skimmer cleanout','Water chemistry balance','Digital service report']
WHERE id = '4f139316-6925-4ca2-8e83-f1b70ea3b2b3';