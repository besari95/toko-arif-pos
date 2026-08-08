// ============================================
// SCRIPT.JS - TOKO ARIF POS
// ============================================

// ============ VARIABLES ============
let cart = [];
let produkList = [];
let currentTransaksi = null;
let selectedFile = null;
let editProdukId = null;

// ============ CHECK LOGIN ============
function checkLogin() {
    if (!localStorage.getItem('isLoggedIn')) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// ============ LOGOUT ============
function logout() {
    if (confirm('Yakin ingin logout?')) {
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'index.html';
    }
}

// ============ FORMAT RUPIAH ============
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID').format(number);
}

// ============ LOAD PRODUK ============
async function loadProduk() {
    try {
        const { data, error } = await supabaseClient
            .from('produk')
            .select('*')
            .order('nama');
        
        if (error) throw error;
        produkList = data || [];
        renderProduk(data || []);
        return data || [];
    } catch (error) {
        console.error('Error loading produk:', error);
        const container = document.getElementById('produkList');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-circle text-4xl mb-2"></i>
                    <p>Gagal memuat produk: ${error.message}</p>
                    <button onclick="loadProduk()" class="mt-2 bg-violet-600 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-sync mr-2"></i>Coba Lagi
                    </button>
                </div>
            `;
        }
        return [];
    }
}

// ============ RENDER PRODUK ============
function renderProduk(produk) {
    const container = document.getElementById('produkList');
    if (!container) return;

    if (!produk || produk.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-400">
                <i class="fas fa-box-open text-4xl mb-2"></i>
                <p>Belum ada produk</p>
                <button onclick="openTambahProduk()" class="mt-2 bg-violet-600 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>Tambah Produk
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = produk.map(p => `
        <div class="product-card bg-gray-50 rounded-lg p-3 cursor-pointer" onclick="tambahKeKeranjang('${p.id}')">
            ${p.gambar ? 
                `<img src="${p.gambar}" alt="${p.nama}" class="w-full h-32 object-cover rounded-lg mb-2">` : 
                `<div class="w-full h-32 bg-violet-100 rounded-lg flex items-center justify-center mb-2">
                    <i class="fas fa-box text-4xl text-violet-300"></i>
                </div>`
            }
            <h3 class="font-semibold text-gray-800 truncate">${p.nama}</h3>
            <p class="text-sm text-gray-500">${p.kategori} | Stok: ${p.stok} ${p.satuan || 'pcs'}</p>
            <p class="text-violet-600 font-bold">Rp ${formatRupiah(p.harga_jual)}</p>
            ${p.stok <= 5 && p.stok > 0 ? 
                `<span class="text-xs text-red-500 stok-menipis"><i class="fas fa-exclamation-triangle"></i> Stok menipis!</span>` : 
                p.stok <= 0 ? 
                `<span class="text-xs text-red-600 font-bold"><i class="fas fa-times-circle"></i> Stok habis!</span>` : 
                ''
            }
            <div class="flex gap-2 mt-2">
                <button onclick="event.stopPropagation(); editProduk('${p.id}')" 
                    class="flex-1 bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-200">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="event.stopPropagation(); hapusProduk('${p.id}')" 
                    class="flex-1 bg-red-100 text-red-600 px-2 py-1 rounded text-xs hover:bg-red-200">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// ============ TAMBAH KE KERANJANG ============
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
            stok: produk.stok,
            gambar: produk.gambar
        });
    }
    updateCartUI();
}

// ============ UPDATE KERANJANG ============
function updateCartUI() {
    const container = document.getElementById('cartItems');
    const totalItems = document.getElementById('totalItems');
    const totalHarga = document.getElementById('totalHarga');
    const bayarInput = document.getElementById('bayar');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-shopping-basket text-4xl mb-2"></i>
                <p>Keranjang kosong</p>
            </div>
        `;
        if (totalItems) totalItems.textContent = '0';
        if (totalHarga) totalHarga.textContent = 'Rp 0';
        if (document.getElementById('kembalian')) {
            document.getElementById('kembalian').textContent = 'Rp 0';
        }
        return;
    }

    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item flex justify-between items-center bg-gray-50 p-2 rounded-lg">
            <div class="flex-1 min-w-0">
                <p class="font-medium text-sm truncate">${item.nama}</p>
                <p class="text-xs text-gray-500">${item.jumlah} x Rp ${formatRupiah(item.harga)}</p>
            </div>
            <div class="flex items-center space-x-1 ml-2">
                <button onclick="ubahJumlah('${item.id}', -1)" class="w-7 h-7 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm">-</button>
                <span class="w-8 text-center text-sm">${item.jumlah}</span>
                <button onclick="ubahJumlah('${item.id}', 1)" class="w-7 h-7 bg-green-100 text-green-600 rounded hover:bg-green-200 text-sm">+</button>
                <button onclick="hapusDariKeranjang('${item.id}')" class="text-red-500 hover:text-red-700 ml-1">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.harga * item.jumlah), 0);
    if (totalItems) totalItems.textContent = cart.reduce((sum, item) => sum + item.jumlah, 0);
    if (totalHarga) totalHarga.textContent = `Rp ${formatRupiah(total)}`;
    
    // Update kembalian
    const bayar = parseFloat(bayarInput?.value) || 0;
    const kembalian = bayar - total;
    const kembalianEl = document.getElementById('kembalian');
    if (kembalianEl) {
        kembalianEl.textContent = `Rp ${formatRupiah(kembalian > 0 ? kembalian : 0)}`;
        kembalianEl.className = `font-semibold ${kembalian >= 0 ? 'text-green-600' : 'text-red-600'}`;
    }
}

// ============ UBAH JUMLAH ============
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

// ============ HAPUS DARI KERANJANG ============
function hapusDariKeranjang(produkId) {
    cart = cart.filter(item => item.id !== produkId);
    updateCartUI();
}

// ============ KOSONGKAN KERANJANG ============
function clearCart() {
    if (cart.length === 0) return;
    if (confirm('Yakin ingin mengosongkan keranjang?')) {
        cart = [];
        updateCartUI();
    }
}

// ============ PROSES TRANSAKSI ============
async function prosesTransaksi() {
    if (cart.length === 0) {
        alert('Keranjang kosong!');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.harga * item.jumlah), 0);
    const bayarInput = document.getElementById('bayar');
    const bayar = parseFloat(bayarInput?.value) || 0;
    
    if (bayar < total) {
        alert('Jumlah bayar kurang dari total!');
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
            const produk = produkList.find(p => p.id === item.id);
            if (produk) {
                const newStok = produk.stok - item.jumlah;
                const { error: stokError } = await supabaseClient
                    .from('produk')
                    .update({ stok: newStok })
                    .eq('id', item.id);
                
                if (stokError) throw stokError;
            }
        }

        // Tampilkan struk
        currentTransaksi = {
            ...transaksiData,
            details: details,
            items: [...cart]
        };
        tampilkanStruk(currentTransaksi);
        
        // Reset keranjang
        cart = [];
        updateCartUI();
        if (bayarInput) bayarInput.value = '';
        loadProduk();

    } catch (error) {
        console.error('Error:', error);
        alert('Gagal memproses transaksi: ' + error.message);
    }
}

// ============ STRUK ============
async function tampilkanStruk(transaksi) {
    const container = document.getElementById('strukContent');
    if (!container) return;
    
    try {
        // Ambil data toko
        const { data, error } = await supabaseClient
            .from('pengaturan')
            .select('*');
        
        if (error) throw error;
        
        const toko = {};
        data.forEach(item => {
            toko[item.key] = item.value;
        });

        const html = `
            <div class="struk-container">
                <div class="text-center border-b border-dashed pb-3">
                    <h2 class="font-bold text-lg">${toko.nama_toko || 'Toko Arif'}</h2>
                    <p class="text-xs text-gray-600">${toko.alamat || ''}</p>
                    <p class="text-xs text-gray-600">WA: ${toko.wa || ''}</p>
                    <p class="text-xs text-gray-600">Email: ${toko.email || ''}</p>
                    <p class="text-xs text-gray-600">${toko.pemilik || ''}</p>
                </div>
                <div class="py-2 border-b border-dashed text-xs">
                    <p>No. Transaksi: ${transaksi.nomor_transaksi}</p>
                    <p>Tanggal: ${new Date(transaksi.created_at).toLocaleString('id-ID')}</p>
                </div>
                <div class="py-2 border-b border-dashed">
                    ${transaksi.details.map(d => `
                        <div class="flex justify-between text-sm">
                            <span>${d.nama_produk} x ${d.jumlah}</span>
                            <span>Rp ${formatRupiah(d.subtotal)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="py-2 border-b border-dashed">
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
                <div class="text-center text-xs text-gray-500 pt-2">
                    <p>Terima kasih telah berbelanja!</p>
                    <p class="text-[10px]">${new Date().toLocaleString('id-ID')}</p>
                </div>
            </div>
        `;
        container.innerHTML = html;
        document.getElementById('strukModal')?.classList.remove('hidden');
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menampilkan struk: ' + error.message);
    }
}

// ============ CETAK STRUK ============
function cetakStruk() {
    const content = document.getElementById('strukContent');
    if (!content) return;
    
    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`
        <html><head><title>Struk Pembayaran</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 350px; margin: 0 auto; }
            .text-center { text-align: center; }
            .border-b { border-bottom: 1px dashed #ccc; padding: 8px 0; }
            .border-dashed { border-bottom: 1px dashed #ccc; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .font-bold { font-weight: bold; }
            .text-sm { font-size: 14px; }
            .text-xs { font-size: 12px; }
            .text-[10px] { font-size: 10px; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-green-600 { color: #059669; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .pt-2 { padding-top: 8px; }
            .pb-3 { padding-bottom: 12px; }
        </style>
        </head><body>
        ${content.innerHTML}
        </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// ============ DOWNLOAD PDF ============
function downloadPDF() {
    const content = document.getElementById('strukContent');
    if (!content) return;
    
    html2canvas(content, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`struk-${Date.now()}.pdf`);
    }).catch(error => {
        console.error('Error generating PDF:', error);
        alert('Gagal membuat PDF: ' + error.message);
    });
}

// ============ DOWNLOAD GAMBAR ============
function downloadImage() {
    const content = document.getElementById('strukContent');
    if (!content) return;
    
    html2canvas(content, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `struk-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(error => {
        console.error('Error generating image:', error);
        alert('Gagal membuat gambar: ' + error.message);
    });
}

// ============ TUTUP STRUK ============
function tutupStruk() {
    document.getElementById('strukModal')?.classList.add('hidden');
}

// ============ UPLOAD GAMBAR ============
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        selectedFile = file;
        const namaFileEl = document.getElementById('namaFile');
        if (namaFileEl) namaFileEl.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('gambarPreview');
            const previewContainer = document.getElementById('previewGambar');
            if (preview) {
                preview.src = e.target.result;
                if (previewContainer) previewContainer.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
}

function ambilFoto() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = function(e) {
            if (e.target.files[0]) {
                selectedFile = e.target.files[0];
                const namaFileEl = document.getElementById('namaFile');
                if (namaFileEl) namaFileEl.textContent = selectedFile.name;
                
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('gambarPreview');
                    const previewContainer = document.getElementById('previewGambar');
                    if (preview) {
                        preview.src = event.target.result;
                        if (previewContainer) previewContainer.classList.remove('hidden');
                    }
                };
                reader.readAsDataURL(selectedFile);
            }
        };
        input.click();
    } else {
        alert('Perangkat tidak mendukung kamera!');
    }
}

async function uploadGambarProduk(file, namaProduk) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${namaProduk.replace(/\s/g, '-')}.${fileExt}`;
        const filePath = `produk/${fileName}`;
        
        const { data, error } = await supabaseClient
            .storage
            .from('produk-images')
            .upload(filePath, file);
        
        if (error) throw error;
        
        const { data: urlData } = await supabaseClient
            .storage
            .from('produk-images')
            .getPublicUrl(filePath);
        
        return urlData.publicUrl;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

// ============ CRUD PRODUK ============
function openTambahProduk() {
    editProdukId = null;
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-plus-circle text-violet-600 mr-2"></i>Tambah Produk';
    }
    const form = document.getElementById('formProduk');
    if (form) form.reset();
    
    const previewContainer = document.getElementById('previewGambar');
    if (previewContainer) previewContainer.classList.add('hidden');
    
    const namaFileEl = document.getElementById('namaFile');
    if (namaFileEl) namaFileEl.textContent = 'Tidak ada file dipilih';
    
    selectedFile = null;
    const modal = document.getElementById('modalProduk');
    if (modal) modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('modalProduk');
    if (modal) modal.classList.add('hidden');
}

async function saveProduk(event) {
    event.preventDefault();
    
    const form = document.getElementById('formProduk');
    if (!form) return;
    
    const formData = new FormData(form);
    
    try {
        let gambarUrl = null;
        
        if (selectedFile) {
            gambarUrl = await uploadGambarProduk(selectedFile, formData.get('nama'));
        }
        
        const data = {
            nama: formData.get('nama'),
            kategori: formData.get('kategori'),
            harga_jual: parseFloat(formData.get('harga_jual')),
            harga_modal: parseFloat(formData.get('harga_modal')),
            stok: parseInt(formData.get('stok')),
            satuan: formData.get('satuan') || 'pcs',
            gambar: gambarUrl
        };
        
        let error;
        if (editProdukId) {
            const { error: updateError } = await supabaseClient
                .from('produk')
                .update(data)
                .eq('id', editProdukId);
            error = updateError;
        } else {
            const { error: insertError } = await supabaseClient
                .from('produk')
                .insert([data]);
            error = insertError;
        }
        
        if (error) throw error;
        
        alert(editProdukId ? 'Produk berhasil diupdate!' : 'Produk berhasil ditambahkan!');
        closeModal();
        loadProduk();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan produk: ' + error.message);
    }
}

async function editProduk(id) {
    try {
        const { data, error } = await supabaseClient
            .from('produk')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        editProdukId = id;
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-edit text-violet-600 mr-2"></i>Edit Produk';
        }
        
        document.getElementById('namaProduk').value = data.nama;
        document.getElementById('kategoriProduk').value = data.kategori;
        document.getElementById('hargaJual').value = data.harga_jual;
        document.getElementById('hargaModal').value = data.harga_modal;
        document.getElementById('stokProduk').value = data.stok;
        document.getElementById('satuanProduk').value = data.satuan || 'pcs';
        
        if (data.gambar) {
            const preview = document.getElementById('gambarPreview');
            const previewContainer = document.getElementById('previewGambar');
            if (preview) {
                preview.src = data.gambar;
                if (previewContainer) previewContainer.classList.remove('hidden');
            }
            const namaFileEl = document.getElementById('namaFile');
            if (namaFileEl) namaFileEl.textContent = 'Gambar sudah ada';
        }
        
        const modal = document.getElementById('modalProduk');
        if (modal) modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal memuat data produk');
    }
}

async function hapusProduk(id) {
    if (!confirm('Yakin ingin menghapus produk ini?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('produk')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        alert('Produk berhasil dihapus!');
        loadProduk();
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menghapus produk: ' + error.message);
    }
}

// ============ PENGELUARAN ============
async function loadPengeluaran() {
    try {
        const { data, error } = await supabaseClient
            .from('pengeluaran')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        renderPengeluaran(data || []);
        return data || [];
    } catch (error) {
        console.error('Error loading pengeluaran:', error);
        return [];
    }
}

function renderPengeluaran(data) {
    const container = document.getElementById('daftarPengeluaran');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-inbox text-4xl mb-2"></i>
                <p>Belum ada pengeluaran</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = data.map(item => `
        <div class="flex justify-between items-center bg-white p-3 rounded-lg border hover:shadow-md transition">
            <div>
                <p class="font-medium">${item.deskripsi}</p>
                <p class="text-sm text-gray-500">
                    ${item.kategori} • ${new Date(item.created_at).toLocaleDateString('id-ID')}
                </p>
            </div>
            <div class="flex items-center space-x-3">
                <span class="font-bold text-red-600">Rp ${formatRupiah(item.nominal)}</span>
                <button onclick="hapusPengeluaran('${item.id}')" class="text-red-400 hover:text-red-600">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function tambahPengeluaran(event) {
    event.preventDefault();
    
    const deskripsi = document.getElementById('deskripsiPengeluaran')?.value;
    const nominal = parseFloat(document.getElementById('nominalPengeluaran')?.value);
    const kategori = document.getElementById('kategoriPengeluaran')?.value;
    
    if (!deskripsi || !nominal) {
        alert('Mohon isi semua field!');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('pengeluaran')
            .insert([{ deskripsi, nominal, kategori }]);
        
        if (error) throw error;
        
        alert('Pengeluaran berhasil ditambahkan!');
        const form = document.getElementById('formPengeluaran');
        if (form) form.reset();
        loadPengeluaran();
        hitungLabaRugi();
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menambahkan pengeluaran: ' + error.message);
    }
}

async function hapusPengeluaran(id) {
    if (!confirm('Yakin ingin menghapus pengeluaran ini?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('pengeluaran')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        loadPengeluaran();
        hitungLabaRugi();
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menghapus pengeluaran: ' + error.message);
    }
}

// ============ LABA RUGI ============
async function hitungLabaRugi() {
    try {
        // Ambil data transaksi
        const { data: transaksi, error: tError } = await supabaseClient
            .from('transaksi')
            .select('*');
        
        if (tError) throw tError;
        
        // Ambil detail transaksi
        const { data: details, error: dError } = await supabaseClient
            .from('detail_transaksi')
            .select('*');
        
        if (dError) throw dError;
        
        // Ambil pengeluaran
        const { data: pengeluaran, error: pError } = await supabaseClient
            .from('pengeluaran')
            .select('*');
        
        if (pError) throw pError;
        
        // Hitung total omzet
        const totalOmzet = (transaksi || []).reduce((sum, t) => sum + t.total, 0);
        
        // Hitung total modal
        let totalModal = 0;
        for (const detail of (details || [])) {
            const { data: produk } = await supabaseClient
                .from('produk')
                .select('harga_modal')
                .eq('id', detail.produk_id)
                .single();
            
            if (produk) {
                totalModal += produk.harga_modal * detail.jumlah;
            }
        }
        
        const totalPengeluaran = (pengeluaran || []).reduce((sum, p) => sum + p.nominal, 0);
        const labaBersih = totalOmzet - totalModal - totalPengeluaran;
        
        // Update UI
        const totalOmzetEl = document.getElementById('totalOmzet');
        const totalModalEl = document.getElementById('totalModal');
        const totalPengeluaranEl = document.getElementById('totalPengeluaran');
        const labaBersihEl = document.getElementById('labaBersih');
        
        if (totalOmzetEl) totalOmzetEl.textContent = `Rp ${formatRupiah(totalOmzet)}`;
        if (totalModalEl) totalModalEl.textContent = `Rp ${formatRupiah(totalModal)}`;
        if (totalPengeluaranEl) totalPengeluaranEl.textContent = `Rp ${formatRupiah(totalPengeluaran)}`;
        if (labaBersihEl) {
            labaBersihEl.textContent = `Rp ${formatRupiah(labaBersih)}`;
            labaBersihEl.className = `text-2xl font-bold ${labaBersih >= 0 ? 'text-violet-600' : 'text-red-600'}`;
        }
        
    } catch (error) {
        console.error('Error hitung laba rugi:', error);
    }
}

// ============ EVENT LISTENERS ============
document.addEventListener('DOMContentLoaded', function() {
    // Check login
    if (!checkLogin()) return;
    
    console.log('✅ POS Toko Arif loaded');
    
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
    
    // Bayar input
    const bayarInput = document.getElementById('bayar');
    if (bayarInput) {
        bayarInput.addEventListener('input', updateCartUI);
    }
    
    // Form pengeluaran
    const formPengeluaran = document.getElementById('formPengeluaran');
    if (formPengeluaran) {
        formPengeluaran.addEventListener('submit', tambahPengeluaran);
        loadPengeluaran();
        hitungLabaRugi();
    }
    
    // Check if on laporan page
    if (document.getElementById('daftarPengeluaran')) {
        loadPengeluaran();
        hitungLabaRugi();
    }
});

// ============ EXPORT FUNCTIONS FOR GLOBAL ACCESS ============
window.tambahKeKeranjang = tambahKeKeranjang;
window.ubahJumlah = ubahJumlah;
window.hapusDariKeranjang = hapusDariKeranjang;
window.clearCart = clearCart;
window.prosesTransaksi = prosesTransaksi;
window.cetakStruk = cetakStruk;
window.downloadPDF = downloadPDF;
window.downloadImage = downloadImage;
window.tutupStruk = tutupStruk;
window.loadProduk = loadProduk;
window.openTambahProduk = openTambahProduk;
window.closeModal = closeModal;
window.saveProduk = saveProduk;
window.editProduk = editProduk;
window.hapusProduk = hapusProduk;
window.handleFileSelect = handleFileSelect;
window.ambilFoto = ambilFoto;
window.logout = logout;
window.loadPengeluaran = loadPengeluaran;
window.tambahPengeluaran = tambahPengeluaran;
window.hapusPengeluaran = hapusPengeluaran;
window.hitungLabaRugi = hitungLabaRugi;