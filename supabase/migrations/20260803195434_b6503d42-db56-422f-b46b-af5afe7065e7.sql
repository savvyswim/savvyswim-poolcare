UPDATE public.cleaning_plans
SET name = 'Savvy Annual',
    price = 'Custom quote',
    cadence = 'billed monthly',
    blurb = 'Annual agreement with 4 complimentary cleanings included.',
    items = ARRAY['4 complimentary cleanings per year','Weekly service visits','Full chemical package included','Filter pressure & equipment checks','Photo report after every clean','Priority scheduling']
WHERE name ILIKE '%Weekly Crystal%';