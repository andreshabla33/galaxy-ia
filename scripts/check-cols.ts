import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Try inserting a dummy row to see what columns exist from the error
async function main() {
  const { data, error } = await s.from('tareas_programadas').insert({ titulo: '__test__' }).select()
  if (error) {
    console.log('INSERT ERROR:', error.message, error.details, error.hint)
  } else {
    console.log('INSERTED:', JSON.stringify(data))
    // Clean up
    if (data?.[0]?.id) {
      await s.from('tareas_programadas').delete().eq('id', data[0].id)
    }
  }
}

main()
