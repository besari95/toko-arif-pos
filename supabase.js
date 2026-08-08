// supabase.js
const SUPABASE_URL = 'toko-arif-pos.vercel.app';
const SUPABASE_ANON_KEY = 'YOUReyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZWJ1amFrbGZuc25oc2ZoY2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTU4NDYsImV4cCI6MjEwMTc3MTg0Nn0.WrIFHAt5SvTQ-PDKDXNqub1gH9wXS8l2359XspMJH8I_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simpan instance supabase ke global
window.supabaseClient = supabase;

// Fungsi helper
async function getTokoInfo() {
    const { data, error } = await supabaseClient
        .from('pengaturan')
        .select('*');
    
    if (error) throw error;
    
    // Konversi array ke object
    const toko = {};
    data.forEach(item => {
        toko[item.key] = item.value;
    });
    return toko;
}

async function updateTokoInfo(data) {
    const updates = Object.keys(data).map(key => ({
        key: key,
        value: data[key]
    }));
    
    for (const item of updates) {
        const { error } = await supabaseClient
            .from('pengaturan')
            .upsert({ key: item.key, value: item.value });
        
        if (error) throw error;
    }
}