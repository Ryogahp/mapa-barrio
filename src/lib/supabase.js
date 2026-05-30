import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wrkuvdszvscpnlkpilot.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indya3V2ZHN6dnNjcG5sa3BpbG90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzcwNDUsImV4cCI6MjA5NTY1MzA0NX0.QsLWNOg0SVEssTYRduHEfwj9qmasmrkBS530SDuO3F0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
})
