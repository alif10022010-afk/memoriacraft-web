// --- 1. TAMPILKAN KATALOG PRODUK ---
async function loadCatalog() {
  const container = document.getElementById('product-list');
  if (!container) return;

  const { data: products, error } = await _supabase
    .from('products')
    .select('*')
    .eq('active', true);

  if (error || !products) {
    container.innerHTML = '<p>Gagal memuat produk.</p>';
    return;
  }

  container.innerHTML = products.map(prod => `
    <div class="card">
      <img src="${prod.image_url || 'https://via.placeholder.com/400'}" alt="${prod.name}">
      <h3>${prod.name}</h3>
      <p class="price">Rp ${Number(prod.price).toLocaleString('id-ID')}</p>
      <a href="product.html?slug=${prod.slug}" class="btn">Lihat Detail</a>
    </div>
  `).join('');
}

// --- 2. PENANGKAP REFERRAL & RENDER DETAIL PRODUK ---
let currentProduct = null;
let currentSales = null;

async function initProductPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');
  const ref = urlParams.get('ref');

  // Simpan referral ke localStorage jika ada di URL
  if (ref) {
    localStorage.setItem('memoriacraft_ref', ref.toUpperCase());
  }

  const savedRef = localStorage.getItem('memoriacraft_ref') || '';
  const container = document.getElementById('product-detail');

  if (!slug) {
    container.innerHTML = '<p>Produk tidak ditemukan.</p>';
    return;
  }

  // Ambil data produk
  const { data: product } = await _supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!product) {
    container.innerHTML = '<p>Produk tidak ditemukan.</p>';
    return;
  }

  currentProduct = product;

  // Jika ada referral, cari data sales & diskonnya
  if (savedRef) {
    const { data: salesData } = await _supabase
      .from('sales')
      .select('*')
      .eq('referral_code', savedRef)
      .eq('active', true)
      .single();

    if (salesData) {
      currentSales = salesData;
    }
  }

  const discountRate = currentSales ? (currentSales.discount_rate || 0) : 0;

  // Ganti render HTML Form dengan yang ini:
  container.innerHTML = `
    <img src="${product.image_url || 'https://via.placeholder.com/400'}" style="width:100%; max-height:300px; object-fit:cover; border-radius:8px;">
    <h2 style="margin-top:15px;">${product.name}</h2>
    <p class="price" style="font-size:20px;">Rp ${Number(product.price).toLocaleString('id-ID')}</p>
    <p style="margin-bottom:20px; color:#666;">${product.description || ''}</p>
    
    ${currentSales ? `
      <div class="ref-badge">
        Spesial Promo Sales: <strong>${currentSales.name} (${currentSales.referral_code})</strong><br>
        ${discountRate > 0 ? `Anda mendapat Diskon Tambahan ${discountRate}%!` : 'Link Referral Aktif'}
      </div>
    ` : ''}

    <hr style="margin: 20px 0;"><br>

    <h3>Formulir Pemesanan Custom</h3><br>
    <form id="orderForm" onsubmit="handleOrderSubmit(event)">
      <div class="form-group">
        <label>Nama Lengkap</label>
        <input type="text" id="custName" required placeholder="Contoh: Budi Santoso">
      </div>
      <div class="form-group">
        <label>Nomor WhatsApp</label>
        <input type="tel" id="custWA" required placeholder="Contoh: 081234567890">
      </div>
      <div class="form-group">
        <label>Wilayah Pengiriman (J&T)</label>
        <select id="shippingZone" required onchange="calculatePrice()" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px; font-size:14px;">
          <option value="15000">Jawa & Jabodetabek (Rp 15.000)</option>
          <option value="25000">Sumatera & Bali (Rp 25.000)</option>
          <option value="35000">Kalimantan & Sulawesi (Rp 35.000)</option>
          <option value="45000">Papua & Nusa Tenggara (Rp 45.000)</option>
        </select>
      </div>
      <div class="form-group" style="margin-top: 15px;">
        <label>Alamat Pengiriman Lengkap (Jalan, RT/RW, Kec, Kota/Kab, Kode Pos)</label>
        <textarea id="custAddress" required rows="3" placeholder="Jl. Mawar No. 12, RT 01/02, Kec. Menteng, Jakarta Pusat, 10310"></textarea>
      </div>
      <div class="form-group">
        <label>Jumlah (Pcs)</label>
        <input type="number" id="custQty" value="1" min="1" required onchange="calculatePrice()">
      </div>
      <div class="form-group">
        <label>Detail Custom Kenangan</label>
        <textarea id="custDetails" required rows="3" placeholder="Tema ucapan, warna, tulisan custom..."></textarea>
      </div>

      <!-- Ringkasan Harga -->
      <div class="price-summary" id="priceSummary">
        <!-- Diisi otomatis oleh JavaScript -->
      </div>

      <button type="submit" class="btn">Lanjut ke WhatsApp Admin &rarr;</button>
    </form>
  `;

  calculatePrice();
}

// --- 3. KALKULASI HARGA, DISKON, DAN KOMISI ---
function calculatePrice() {
  const qtyInput = document.getElementById('custQty');
  const shippingSelect = document.getElementById('shippingZone');
  if (!qtyInput || !currentProduct) return;

  const qty = parseInt(qtyInput.value) || 1;
  const baseShippingRate = parseInt(shippingSelect ? shippingSelect.value : 0);
  
  // 1. Ambil berat produk dari Supabase (default 500 gram jika belum diisi)
  const productWeight = currentProduct.weight || 500; 
  const totalWeightGram = productWeight * qty;
  
  // 2. Hitung berat dalam KG (Pembulatan ke atas, min. 1 kg)
  // Contoh: 1300 gram -> 1.3 kg -> dibulatkan jadi 2 kg
  const weightInKg = Math.max(1, Math.ceil(totalWeightGram / 1000));

  // 3. Total Ongkir = Tarif Dasar Wilayah x Berat (Kg)
  const totalShippingFee = baseShippingRate * weightInKg;

  const rawTotal = currentProduct.price * qty;
  
  // Hitung diskon sales
  const discountRate = currentSales ? (currentSales.discount_rate || 0) : 0;
  const discountAmount = (rawTotal * discountRate) / 100;
  const productFinalTotal = rawTotal - discountAmount;
  
  // Total Keseluruhan
  const grandTotal = productFinalTotal + totalShippingFee;

  const summaryContainer = document.getElementById('priceSummary');
  summaryContainer.innerHTML = `
    <div><span>Harga Satuan:</span> <span>Rp ${Number(currentProduct.price).toLocaleString('id-ID')}</span></div>
    <div><span>Jumlah:</span> <span>${qty} pcs (${totalWeightGram} gr / ~${weightInKg} kg)</span></div>
    ${discountAmount > 0 ? `<div style="color:green;"><span>Diskon Sales (${discountRate}%):</span> <span>-Rp ${Number(discountAmount).toLocaleString('id-ID')}</span></div>` : ''}
    <div><span>Ongkos Kirim (${weightInKg} kg):</span> <span>Rp ${Number(totalShippingFee).toLocaleString('id-ID')}</span></div>
    <div class="total"><span>Total Bayar:</span> <span>Rp ${Number(grandTotal).toLocaleString('id-ID')}</span></div>
  `;
}

// --- 4. SUBMIT ORDER KE SUPABASE & REDIRECT WA ---
async function handleOrderSubmit(event) {
  event.preventDefault();

  const name = document.getElementById('custName').value;
  const wa = document.getElementById('custWA').value;
  const address = document.getElementById('custAddress').value;
  const qty = parseInt(document.getElementById('custQty').value);
  const details = document.getElementById('custDetails').value;

  const orderId = 'MC-' + Math.floor(1000 + Math.random() * 9000);

  // --- LOGIKA BARU: HITUNG BERAT & ONGKIR DINAMIS ---
  const productWeight = currentProduct.weight || 500;
  const totalWeightGram = productWeight * qty;
  const weightInKg = Math.max(1, Math.ceil(totalWeightGram / 1000));
  const baseShippingRate = parseInt(document.getElementById('shippingZone').value);
  const totalShippingFee = baseShippingRate * weightInKg;

  // --- HITUNG DISKON & TOTAL BAYAR ---
  const rawTotal = currentProduct.price * qty;
  const discountRate = currentSales ? (currentSales.discount_rate || 0) : 0;
  const discountAmount = (rawTotal * discountRate) / 100;
  const grandTotal = (rawTotal - discountAmount) + totalShippingFee;

  // --- HITUNG KOMISI BERSIH SALES ---
  const baseCommissionTotal = (currentProduct.commission || 0) * qty;
  const netCommission = Math.max(0, baseCommissionTotal - discountAmount);

  // Simpan data transaksi ke Supabase
  const { error } = await _supabase.from('orders').insert([
    {
      id: orderId,
      customer_name: name,
      customer_wa: wa,
      shipping_address: address,
      product_id: currentProduct.id,
      sales_id: currentSales ? currentSales.id : null,
      referral_code: currentSales ? currentSales.referral_code : null,
      quantity: qty,
      price_per_item: currentProduct.price,
      discount_amount: discountAmount,
      total_price: grandTotal,
      sales_commission_amount: netCommission,
      custom_details: details,
      payment_status: 'PENDING',
      order_status: 'PENDING'
    }
  ]);

  if (error) {
    alert('Gagal membuat pesanan. Coba lagi.');
    console.error(error);
    return;
  }

  // Format Pesanan untuk Admin WhatsApp
  const waMessage = `Halo Admin Memoriacraft, saya ingin melakukan order.

*Order ID:* ${orderId}
*Nama:* ${name}
*WhatsApp:* ${wa}
*Alamat:* ${address}

*Produk:* ${currentProduct.name}
*Jumlah:* ${qty} Pcs (${totalWeightGram} gr / ~${weightInKg} kg)
${discountAmount > 0 ? `*Diskon:* Rp ${discountAmount.toLocaleString('id-ID')}\n` : ''}*Ongkir (${weightInKg} kg):* Rp ${totalShippingFee.toLocaleString('id-ID')}
*Total Bayar:* Rp ${grandTotal.toLocaleString('id-ID')}
*Detail Custom:* ${details}

*Referral Code:* ${currentSales ? currentSales.referral_code : '-'}

Mohon dibantu untuk konfirmasi pesanan dan instruksi pembayaran QRIS. Terima kasih.`;

  window.location.href = `https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent(waMessage)}`;
}