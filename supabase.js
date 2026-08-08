// supabase.js
const SUPABASE_URL = 'https://YOUR_PROJECT_URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

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