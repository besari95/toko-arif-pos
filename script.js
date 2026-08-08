// script.js - Main JavaScript

let cart = [];
let produkList = [];
let currentTransaksi = null;

// ============ FUNGSI UTAMA ============

// Load produk dari Supabase
async function loadProduk() {
    try {
        const { data, error } = await supabaseClient
            .from('produk')
            .select('*')
            .order('nama');
        
        if (error) throw error;
        produkList = data;
        renderProduk(data);
        return data;
    } catch (error) {
        console.error('Error loading produk:', error);
        return [];
    }
}

// Render produk ke UI
function renderProduk(produk) {
    const container = document.getElementById('produkList');
    if (!produk || produk.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-400">
                <i class="fas fa-box-open text-4xl mb-2"></i>
                <p>Belum ada produk</p>
            </div>
        `;
        return;
    }

    container.innerHTML = produk.map(p => `
        <div class="bg-gray-50 rounded-lg p-3 hover:shadow-md transition cursor-pointer" onclick="tambahKeKeranjang('${p.id}')">
            ${p.gambar ? `<img src="${p.gambar}" alt="${p.nama}" class="w-full h-32 object-cover rounded-lg mb-2">` : 
                `<div class="w-full h-32 bg-violet-100 rounded-lg flex items-center justify-center mb-2">
                    <i class="fas fa-box text-4xl text-violet-300"></i>
                </div>`}
            <h3 class="font-semibold text-gray-800 truncate">${p.nama}</h3>
            <p class="text-sm text-gray-500">${p.kategori} | Stok: ${p.stok}</p>
            <p class="text-violet-600 font-bold">Rp ${formatRupiah(p.harga_jual)}</p>
            ${p.stok <= 5 ? `<span class="text-xs text-red-500"><i class="fas fa-exclamation-triangle"></i> Stok menipis!</span>` : ''}
        </div>
    `).join('');
}

// Tambah ke keranjang
function tambahKeKeranjang(produkId) {
    const produk = produkList.find(p => p.id === produkId);
    if (!produk) return;
    if (produk.stok <= 0) {
        alert('Stok produk ini habis!');
        return;
    }

    const existing = cart.find(item => item.id === produkId);
    if (existing) {
        if (existing.jumlah >= produk.stok) {
            alert('Stok tidak mencukupi!');
            return;
        }
        existing.jumlah++;
    } else {
        cart.push({
            id: produk.id,
            nama: produk.nama,
            harga: produk.harga_jual,
            jumlah: 1,
            stok: produk.stok
        });
    }
    updateCartUI();
}

// Update UI keranjang
function updateCartUI() {
    const container = document.getElementById('cartItems');
    const totalItems = document.getElementById('totalItems');
    const totalHarga = document.getElementById('totalHarga');
    const bayarInput = document.getElementById('bayar');

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-shopping-basket text-4xl mb-2"></i>
                <p>Keranjang kosong</p>
            </div>
        `;
        totalItems.textContent = '0';
        totalHarga.textContent = 'Rp 0';
        return;
    }

    container.innerHTML = cart.map((item, index) => `
        <div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
            <div class="flex-1">
                <p class="font-medium text-sm">${item.nama}</p>
                <p class="text-xs text-gray-500">${item.jumlah} x Rp ${formatRupiah(item.harga)}</p>
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="ubahJumlah('${item.id}', -1)" class="w-6 h-6 bg-red-100 text-red-600 rounded hover:bg-red-200">-</button>
                <span class="w-8 text-center">${item.jumlah}</span>
                <button onclick="ubahJumlah('${item.id}', 1)" class="w-6 h-6 bg-green-100 text-green-600 rounded hover:bg-green-200">+</button>
                <button onclick="hapusDariKeranjang('${item.id}')" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.harga * item.jumlah), 0);
    totalItems.textContent = cart.reduce((sum, item) => sum + item.jumlah, 0);
    totalHarga.textContent = `Rp ${formatRupiah(total)}`;
    
    // Update kembalian
    const bayar = parseFloat(bayarInput.value) || 0;
    const kembalian = bayar - total;
    document.getElementById('kembalian').textContent = `Rp ${formatRupiah(kembalian > 0 ? kembalian : 0)}`;
}

// Ubah jumlah item di keranjang
function ubahJumlah(produkId, delta) {
    const item = cart.find(i => i.id === produkId);
    if (!item) return;
    
    const produk = produkList.find(p => p.id === produkId);
    const newJumlah = item.jumlah + delta;
    
    if (newJumlah <= 0) {
        hapusDariKeranjang(produkId);
        return;
    }
    
    if (produk && newJumlah > produk.stok) {
        alert('Stok tidak mencukupi!');
        return;
    }
    
    item.jumlah = newJumlah;
    updateCartUI();
}

// Hapus dari keranjang
function hapusDariKeranjang(produkId) {
    cart = cart.filter(item => item.id !== produkId);
    updateCartUI();
}

// Kosongkan keranjang
function clearCart() {
    if (cart.length === 0) return;
    if (confirm('Yakin ingin mengosongkan keranjang?')) {
        cart = [];
        updateCartUI();
    }
}

// Format Rupiah
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID').format(number);
}

// ============ PROSES TRANSAKSI ============

async function prosesTransaksi() {
    if (cart.length === 0) {
        alert('Keranjang kosong!');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.harga * item.jumlah), 0);
    const bayar = parseFloat(document.getElementById('bayar').value) || 0;
    
    if (bayar < total) {
        alert('Jumlah bayar kurang!');
        return;
    }

    const kembalian = bayar - total;

    try {
        // Generate nomor transaksi
        const now = new Date();
        const noTransaksi = `TRX-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-6)}`;

        // Simpan transaksi
        const { data: transaksiData, error: transaksiError } = await supabaseClient
            .from('transaksi')
            .insert([{
                nomor_transaksi: noTransaksi,
                total: total,
                bayar: bayar,
                kembalian: kembalian
            }])
            .select()
            .single();

        if (transaksiError) throw transaksiError;

        // Simpan detail transaksi
        const details = cart.map(item => ({
            transaksi_id: transaksiData.id,
            produk_id: item.id,
            nama_produk: item.nama,
            harga: item.harga,
            jumlah: item.jumlah,
            subtotal: item.harga * item.jumlah
        }));

        const { error: detailError } = await supabaseClient
            .from('detail_transaksi')
            .insert(details);

        if (detailError) throw detailError;

        // Kurangi stok
        for (const item of cart) {
            const { error: stokError } = await supabaseClient
                .from('produk')
                .update({ stok: supabaseClient.rpc('decrement_stok', { row_id: item.id, amount: item.jumlah }) })
                .eq('id', item.id);
            
            if (stokError) throw stokError;
        }

        // Tampilkan struk
        currentTransaksi = {
            ...transaksiData,
            details: details,
            items: cart
        };
        tampilkanStruk(currentTransaksi);
        
        // Reset keranjang
        cart = [];
        updateCartUI();
        document.getElementById('bayar').value = '';
        loadProduk();

    } catch (error) {
        console.error('Error:', error);
        alert('Gagal memproses transaksi: ' + error.message);
    }
}

// ============ STRUK ============

function tampilkanStruk(transaksi) {
    const container = document.getElementById('strukContent');
    
    // Ambil data toko
    getTokoInfo().then(toko => {
        const html = `
            <div class="text-center border-b pb-4">
                <h2 class="font-bold text-xl">${toko.nama_toko || 'Toko Arif'}</h2>
                <p class="text-sm text-gray-600">${toko.alamat || ''}</p>
                <p class="text-sm text-gray-600">WA: ${toko.wa || ''}</p>
                <p class="text-sm text-gray-600">Email: ${toko.email || ''}</p>
                <p class="text-sm text-gray-600">${toko.pemilik || ''}</p>
            </div>
            <div class="py-2 border-b text-sm">
                <p>No. Transaksi: ${transaksi.nomor_transaksi}</p>
                <p>Tanggal: ${new Date(transaksi.created_at).toLocaleString('id-ID')}</p>
            </div>
            <div class="py-2 border-b">
                ${transaksi.details.map(d => `
                    <div class="flex justify-between text-sm">
                        <span>${d.nama_produk} x ${d.jumlah}</span>
                        <span>Rp ${formatRupiah(d.subtotal)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="py-2 border-b">
                <div class="flex justify-between font-bold">
                    <span>Total</span>
                    <span>Rp ${formatRupiah(transaksi.total)}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span>Bayar</span>
                    <span>Rp ${formatRupiah(transaksi.bayar)}</span>
                </div>
                <div class="flex justify-between text-sm text-green-600 font-bold">
                    <span>Kembalian</span>
                    <span>Rp ${formatRupiah(transaksi.kembalian)}</span>
                </div>
            </div>
            <div class="text-center text-sm text-gray-500 pt-2">
                <p>Terima kasih telah berbelanja!</p>
                <p class="text-xs">${new Date().toLocaleString('id-ID')}</p>
            </div>
        `;
        container.innerHTML = html;
        document.getElementById('strukModal').classList.remove('hidden');
    });
}

// Fungsi cetak struk
function cetakStruk() {
    const content = document.getElementById('strukContent');
    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`
        <html><head><title>Struk</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .text-center { text-align: center; }
            .border-b { border-bottom: 1px dashed #ccc; padding: 8px 0; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .font-bold { font-weight: bold; }
            .text-sm { font-size: 14px; }
            .text-xs { font-size: 12px; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-green-600 { color: #059669; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .pt-2 { padding-top: 8px; }
            .pb-4 { padding-bottom: 16px; }
        </style>
        </head><body>
        ${content.innerHTML}
        </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Download PDF
function downloadPDF() {
    const content = document.getElementById('strukContent');
    html2canvas(content, {
        scale: 2,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`struk-${Date.now()}.pdf`);
    });
}

// Download Gambar
function downloadImage() {
    const content = document.getElementById('strukContent');
    html2canvas(content, {
        scale: 2,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `struk-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

// Tutup struk
function tutupStruk() {
    document.getElementById('strukModal').classList.add('hidden');
}

// ============ EVENT LISTENER ============

// Event listener untuk bayar
document.addEventListener('DOMContentLoaded', function() {
    const bayarInput = document.getElementById('bayar');
    if (bayarInput) {
        bayarInput.addEventListener('input', updateCartUI);
    }
    
    // Load produk
    loadProduk();
    
    // Search produk
    const searchInput = document.getElementById('searchProduk');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const keyword = this.value.toLowerCase();
            const filtered = produkList.filter(p => 
                p.nama.toLowerCase().includes(keyword) ||
                p.kategori.toLowerCase().includes(keyword)
            );
            renderProduk(filtered);
        });
    }
    
    // Filter kategori
    const filterKategori = document.getElementById('filterKategori');
    if (filterKategori) {
        filterKategori.addEventListener('change', function() {
            const kategori = this.value;
            const filtered = kategori ? 
                produkList.filter(p => p.kategori === kategori) : 
                produkList;
            renderProduk(filtered);
        });
    }
});

// ============ UTILITY FUNCTIONS ============

// Logout
function logout() {
    if (confirm('Yakin ingin logout?')) {
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'index.html';
    }
}

// Check login status
function checkLogin() {
    if (!localStorage.getItem('isLoggedIn')) {
        window.location.href = 'index.html';
    }
}

// Auto check login
checkLogin();

// Load data toko untuk struk
async function getTokoInfo() {
    try {
        const { data, error } = await supabaseClient
            .from('pengaturan')
            .select('*');
        
        if (error) throw error;
        
        const toko = {};
        data.forEach(item => {
            toko[item.key] = item.value;
        });
        return toko;
    } catch (error) {
        console.error('Error loading toko info:', error);
        return {};
    }
}