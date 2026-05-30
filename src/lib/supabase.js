import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

const missing = !supabaseUrl || !supabaseAnonKey

export const supabase = missing
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })

export const configError = missing
  ? !supabaseUrl && !supabaseAnonKey
    ? 'Faltan PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY'
    : !supabaseUrl
      ? 'Falta PUBLIC_SUPABASE_URL'
      : 'Falta PUBLIC_SUPABASE_ANON_KEY'
  : null
