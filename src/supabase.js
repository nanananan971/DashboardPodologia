import { createClient } from '@supabase/supabase-js'

// Antes las llaves estaban escritas directamente en el código (hardcodeadas).
// Ahora se leen desde variables de entorno (.env), que es la forma correcta
// de manejarlas: así no quedan visibles en el repositorio de Git ni se
// suben por accidente a GitHub. Revisa el archivo `.env.example` incluido.
//
// La "anon key" de Supabase es pública por diseño (se usa en el navegador),
// pero de todas formas es buena práctica no dejarla escrita en el código
// fuente y depender de RLS (Row Level Security) para proteger los datos
// reales. Revisa `supabase/schema_setup.sql` para la configuración de RLS.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ydskauniiggmkkdrlzcl.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_g7H6HLdYKsOPUhB42O9MJA_Fdiaxr8r'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Revisa tu archivo .env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
