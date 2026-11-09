-- I millesimi appartengono all'unità immobiliare, non alla persona.
-- Rimuove eventuali valori legacy dai dati JSON dei condòmini senza modificare
-- alcun altro dato anagrafico o il collegamento con l'unità.
update public.condominium_members
set data = coalesce(data, '{}'::jsonb) - 'millesimi'
where data ? 'millesimi';