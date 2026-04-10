require('dotenv').config({path: '.env'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const run = async () => {
    const { data } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(5);
    console.log(data.find(m => m.role === 'assistant' && (m.content.includes('artifact:presentacion') || m.content.includes('artifact'))).content);
};
run();
