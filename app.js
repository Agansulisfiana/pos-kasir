const rupiah = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0);

function readStorage(key, fallback){
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

const readArrayStorage = key => {
  const value = readStorage(key, []);
  return Array.isArray(value) ? value : [];
};
const normalizeQrisImage = value => typeof value === "string" && value.startsWith("data:image/") ? value : "";
const normalizePinHash = value => typeof value === "string" && value.startsWith("sha256-") ? value : "";
const numberOrZero = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const nonNegative = value => Math.max(0,numberOrZero(value));
const moneyValue = value => nonNegative(String(value??"").replace(/\D/g,""));
const formatMoneyInput = value => {
  const digits = String(value??"").replace(/\D/g,"").replace(/^0+(?=\d)/,"");
  return digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "";
};
const isRecord = value => value && typeof value === "object" && !Array.isArray(value);
const normalizeProduct = p => ({
  ...p,
  id:String(p.id),
  name:String(p.name || "Produk"),
  category:String(p.category || "Umum"),
  costPrice:nonNegative(p.costPrice),
  sellPrice:nonNegative(p.sellPrice),
  stockStart:nonNegative(p.stockStart),
  imageUrl:typeof p.imageUrl === "string" ? p.imageUrl : ""
});
const normalizeSale = sale => ({
  ...sale,
  id:String(sale.id),
  transactionId:sale.transactionId ? String(sale.transactionId) : "",
  productId:sale.productId ? String(sale.productId) : null,
  productName:String(sale.productName || "Produk"),
  category:String(sale.category || "Umum"),
  note:String(sale.note || ""),
  qty:nonNegative(sale.qty),
  costPrice:nonNegative(sale.costPrice),
  sellPrice:nonNegative(sale.sellPrice),
  revenue:nonNegative(sale.revenue),
  profit:numberOrZero(sale.profit),
  paymentMethod:String(sale.paymentMethod || "-"),
  cashReceived:nonNegative(sale.cashReceived),
  change:nonNegative(sale.change),
  date:typeof sale.date === "string" ? sale.date : new Date().toISOString()
});
const normalizeCartItem = item => ({
  ...item,
  id:String(item.id),
  productId:item.productId ? String(item.productId) : null,
  productName:String(item.productName || "Produk"),
  category:String(item.category || "Umum"),
  note:String(item.note || ""),
  qty:Math.max(1,nonNegative(item.qty)),
  costPrice:nonNegative(item.costPrice),
  sellPrice:nonNegative(item.sellPrice)
});

let products = readArrayStorage("pos_products").filter(isRecord).map(normalizeProduct);
let sales = readArrayStorage("pos_sales").filter(isRecord).map(normalizeSale);
let cart = readArrayStorage("pos_cart").filter(isRecord).map(normalizeCartItem);
let qrisImage = normalizeQrisImage(readStorage("pos_qris_image",""));
let adminPinHash = normalizePinHash(readStorage("pos_admin_pin_hash",""));

const save = () => {
  localStorage.setItem("pos_products", JSON.stringify(products));
  localStorage.setItem("pos_sales", JSON.stringify(sales));
  localStorage.setItem("pos_cart", JSON.stringify(cart));
  localStorage.setItem("pos_qris_image", JSON.stringify(qrisImage));
  localStorage.setItem("pos_admin_pin_hash", JSON.stringify(adminPinHash));
};

const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#039;"
}[char]));
const xmlEscape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&apos;"
}[char]));

const productCategory = p => p.category || "Umum";
const salePayment = sale => sale.paymentMethod || "-";
const transactionKey = sale => sale.transactionId || sale.id;
const soldQty = id => sales.filter(s=>s.productId===id).reduce((a,b)=>a+Number(b.qty||0),0);
const stockEnd = p => Number(p.stockStart||0) - soldQty(p.id);
const cartQty = id => cart.filter(item=>item.productId===id).reduce((a,b)=>a+Number(b.qty||0),0);
const availableStock = p => stockEnd(p) - cartQty(p.id);
const profitPerItem = p => Number(p.sellPrice||0) - Number(p.costPrice||0);
const validAdminPin = pin => /^[0-9]{4,8}$/.test(pin);

function createTransactionId(){
  const now = new Date();
  const date = localDateKey(now).replaceAll("-","");
  const time = [now.getHours(),now.getMinutes(),now.getSeconds()].map(value=>String(value).padStart(2,"0")).join("");
  const suffix = Math.random().toString(36).slice(2,5).toUpperCase();
  return `TRX-${date}-${time}-${suffix}`;
}

async function hashAdminPin(pin){
  if(!globalThis.crypto?.subtle) throw new Error("Web Crypto tidak tersedia");
  const bytes = new TextEncoder().encode(`daily-kopi-pos:${pin}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256",bytes);
  return `sha256-${[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("")}`;
}

async function verifyAdminPin(pin){
  return Boolean(adminPinHash) && await hashAdminPin(pin) === adminPinHash;
}

function productInitials(name){
  return String(name || "P")
    .split(" ")
    .filter(Boolean)
    .slice(0,2)
    .map(word=>word[0].toUpperCase())
    .join("") || "P";
}

function fallbackImage(name){
  const initials = productInitials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" rx="18" fill="#f3eadc"/><circle cx="45" cy="36" r="22" fill="#8b5e34" opacity=".2"/><circle cx="112" cy="80" r="30" fill="#8ea15a" opacity=".24"/><text x="80" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#6f4e37">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function productImage(p){
  return p.imageUrl ? escapeHtml(p.imageUrl) : fallbackImage(p.name);
}

function setSaleMessage(text, color){
  const msg = document.getElementById("saleMessage");
  msg.textContent = text;
  msg.style.color = color;
}

function readImageFile(file){
  return new Promise((resolve, reject) => {
    if(!file){
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function selectedProductId(){
  return document.getElementById("saleProduct").value;
}

function selectProduct(id){
  document.getElementById("saleProduct").value = id;
  refreshSelectedProduct();
  renderCashierProducts();
}

function refreshSelectedProduct(){
  const selected = products.find(p=>p.id===selectedProductId());
  const box = document.getElementById("selectedProduct");
  if(!selected){
    box.textContent = "Belum ada produk dipilih";
    box.classList.remove("filled");
    return;
  }
  box.textContent = `${selected.name} - ${rupiah(selected.sellPrice)} - Tersedia ${availableStock(selected)}`;
  box.classList.add("filled");
}

function renderCashierProducts(){
  const grid = document.getElementById("cashierProducts");
  if(!grid) return;

  const currentId = selectedProductId();
  if(products.length===0){
    grid.innerHTML = '<div class="empty-state">Belum ada produk. Tambahkan produk lebih dulu.</div>';
    refreshSelectedProduct();
    return;
  }

  grid.innerHTML = products.map(p=>{
    const isActive = p.id === currentId;
    const remaining = availableStock(p);
    const inCart = cartQty(p.id);
    return `<button class="product-tile ${isActive ? "active" : ""}" type="button" data-product-id="${escapeHtml(p.id)}" ${remaining<=0 ? "disabled" : ""}>
      <img src="${productImage(p)}" alt="${escapeHtml(p.name)}" onerror="this.src='${fallbackImage(p.name)}'" />
      <span class="product-name">${escapeHtml(p.name)}</span>
      <strong>${rupiah(p.sellPrice)}</strong>
      <small>Tersedia ${remaining}${inCart ? ` | Cart ${inCart}` : ""}</small>
    </button>`;
  }).join("");

  refreshSelectedProduct();
}

function filterSales(type){
  const now = new Date();
  return sales.filter(s=>{
    const d = new Date(s.date);
    if(type==="daily") return d.toDateString() === now.toDateString();
    if(type==="weekly"){
      const week = new Date();
      week.setDate(now.getDate()-7);
      return d >= week && d <= now;
    }
    if(type==="monthly") return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    return true;
  });
}

function renderCategories(){
  const categories = [...new Set(products.map(productCategory))].sort((a,b)=>a.localeCompare(b,"id"));
  document.getElementById("categoryList").innerHTML = categories.map(category=>`<option value="${escapeHtml(category)}"></option>`).join("");
}

function renderProducts(){
  const body = document.getElementById("productTable");
  body.innerHTML = "";

  if(products.length===0){
    body.innerHTML = '<tr><td colspan="10">Belum ada produk.</td></tr>';
  }

  products.forEach(p=>{
    body.innerHTML += `<tr>
      <td><img class="table-image" src="${productImage(p)}" alt="${escapeHtml(p.name)}" onerror="this.src='${fallbackImage(p.name)}'" /></td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(productCategory(p))}</td>
      <td>${rupiah(p.costPrice)}</td>
      <td>${rupiah(p.sellPrice)}</td>
      <td>${rupiah(profitPerItem(p))}</td>
      <td>${p.stockStart}</td>
      <td>${soldQty(p.id)}</td>
      <td><b>${stockEnd(p)}</b></td>
      <td><div class="action">
        <button class="btn edit" type="button" data-edit-product="${escapeHtml(p.id)}">Edit</button>
        <button class="btn delete" type="button" data-delete-product="${escapeHtml(p.id)}">Hapus</button>
      </div></td>
    </tr>`;
  });

  const selected = products.find(p=>p.id===selectedProductId());
  if(!selected) document.getElementById("saleProduct").value = "";

  document.getElementById("dashProduct").textContent = products.length;
  renderCategories();
  renderCashierProducts();
}

function cartTotal(){
  return cart.reduce((sum,item)=>sum+(Number(item.sellPrice||0)*Number(item.qty||0)),0);
}

function renderCashChange(){
  const received = moneyValue(document.getElementById("cashReceived").value);
  document.getElementById("cashChange").textContent = rupiah(Math.max(0,received-cartTotal()));
}

function renderPaymentDetails(){
  const isCash = document.getElementById("paymentMethod").value === "Cash";
  document.getElementById("cashPayment").hidden = !isCash;
  renderQrisPayment();
  renderCashChange();
}

let currentReceiptTransactionId = "";

function latestTransactionId(){
  const latestSale = sales.at(-1);
  return latestSale ? transactionKey(latestSale) : "";
}

function receiptAction(transactionId){
  return `<button class="btn receipt-button" type="button" data-print-transaction="${escapeHtml(transactionId)}">Cetak</button>`;
}

function renderLastReceiptButton(){
  document.getElementById("printLastReceipt").disabled = !latestTransactionId();
}

function renderReceipt(transactionId){
  const items = sales.filter(s=>transactionKey(s)===transactionId);
  if(items.length===0) return false;

  const first = items[0];
  const total = items.reduce((sum,item)=>sum+Number(item.revenue||0),0);
  const cashDetails = salePayment(first)==="Cash" ? `<div class="receipt-rule"></div>
    <div class="receipt-row"><span>Uang diterima</span><strong>${rupiah(first.cashReceived||total)}</strong></div>
    <div class="receipt-row"><span>Kembalian</span><strong>${rupiah(first.change||0)}</strong></div>` : "";

  document.getElementById("receiptPrintArea").innerHTML = `<div class="receipt-store">
    <strong>☕ DAILY KOPI TOGO</strong>
    <span>Kasir &amp; Penjualan</span>
  </div>
  <div class="receipt-rule"></div>
  <div class="receipt-meta">
    <span>No. Transaksi:</span><strong>${escapeHtml(transactionId)}</strong>
    <span>Tanggal:</span><strong>${escapeHtml(new Date(first.date).toLocaleString("id-ID"))}</strong>
    <span>Metode Bayar:</span><strong>${escapeHtml(salePayment(first))}</strong>
  </div>
  <div class="receipt-rule"></div>
  <strong class="receipt-section-title">Detail Pesanan</strong>
  <div class="receipt-items">${items.map((item,index)=>`<div class="receipt-item">
    <strong>${index+1}. ${escapeHtml(item.productName)}</strong>
    <div class="receipt-row"><span>${item.qty} x ${rupiah(item.sellPrice)}</span><span>${rupiah(item.revenue)}</span></div>
    ${item.note ? `<small>Catatan: ${escapeHtml(item.note)}</small>` : ""}
  </div>`).join("")}</div>
  <div class="receipt-rule"></div>
  <div class="receipt-row"><span>Subtotal</span><span>${rupiah(total)}</span></div>
  <div class="receipt-row"><span>Diskon</span><span>${rupiah(0)}</span></div>
  <div class="receipt-row"><span>PPN</span><span>${rupiah(0)}</span></div>
  <div class="receipt-rule"></div>
  <div class="receipt-row receipt-total"><strong>TOTAL</strong><strong>${rupiah(total)}</strong></div>
  ${cashDetails}
  <div class="receipt-rule"></div>
  <div class="receipt-footer">
    <span>Terima kasih sudah membeli 🙏</span>
    <span>☕ Waktunya #DailyKopiToGo</span>
    <span>📷 IG: @dailykopitogo</span>
  </div>`;
  currentReceiptTransactionId = transactionId;
  return true;
}

function openReceipt(transactionId){
  if(!renderReceipt(transactionId)) return;
  document.getElementById("receiptCustomerWhatsapp").value = "";
  setPinMessage("receiptWhatsappMessage","","");
  document.getElementById("receiptDialog").showModal();
}

function receiptWhatsappText(transactionId){
  const items = sales.filter(s=>transactionKey(s)===transactionId);
  if(items.length===0) return "";

  const first = items[0];
  const total = items.reduce((sum,item)=>sum+Number(item.revenue||0),0);
  const itemLines = items.flatMap((item,index)=>[
    `${index+1}. ${item.productName}`,
    `   ${item.qty} x ${rupiah(item.sellPrice)} = ${rupiah(item.revenue)}`,
    ...(item.note ? [`   Catatan: ${item.note}`] : []),
    ""
  ]);
  const cashLines = salePayment(first)==="Cash"
    ? [`Uang diterima: ${rupiah(first.cashReceived||total)}`,`Kembalian: ${rupiah(first.change||0)}`]
    : [];

  return [
    "☕ *DAILY KOPI TOGO*",
    "Kasir & Penjualan",
    "",
    `No. Transaksi: ${transactionId}`,
    `Tanggal: ${new Date(first.date).toLocaleString("id-ID")}`,
    `Metode Bayar: ${salePayment(first)}`,
    "",
    "---",
    "",
    "*Detail Pesanan*",
    "",
    ...itemLines,
    "---",
    "",
    `Subtotal: ${rupiah(total)}`,
    `Diskon: ${rupiah(0)}`,
    `PPN: ${rupiah(0)}`,
    "",
    `*TOTAL: ${rupiah(total)}*`,
    ...cashLines,
    "",
    "---",
    "",
    "Terima kasih sudah membeli 🙏",
    "",
    "☕ Waktunya #DailyKopiToGo",
    "📷 IG: @dailykopitogo"
  ].join("\n");
}

function normalizeWhatsappNumber(value){
  const digits = String(value||"").replace(/\D/g,"");
  if(digits.startsWith("62")) return digits;
  if(digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits ? `62${digits}` : "";
}

function whatsappCurrentReceipt(){
  const whatsappNumber = normalizeWhatsappNumber(document.getElementById("receiptCustomerWhatsapp").value);
  if(!/^62[0-9]{8,13}$/.test(whatsappNumber)){
    setPinMessage("receiptWhatsappMessage","Masukkan nomor WhatsApp customer yang valid.","#dc2626");
    return;
  }
  const text = receiptWhatsappText(currentReceiptTransactionId);
  if(!text){
    setPinMessage("receiptWhatsappMessage","Data struk tidak ditemukan.","#dc2626");
    return;
  }
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`,"_blank","noopener");
  setPinMessage("receiptWhatsappMessage","WhatsApp dibuka. Silakan periksa lalu kirim struk.","#16a34a");
}

function renderCart(){
  const body = document.getElementById("cartItems");
  document.getElementById("cartTotal").textContent = rupiah(cartTotal());
  renderCashChange();

  if(cart.length===0){
    body.innerHTML = '<div class="empty-state">Keranjang masih kosong.</div>';
    return;
  }

  body.innerHTML = cart.map(item=>`<div class="cart-item">
    <div class="cart-item-info">
      <strong>${escapeHtml(item.productName)}</strong>
      <small>${rupiah(item.sellPrice)} x ${item.qty} = ${rupiah(item.sellPrice*item.qty)}</small>
    </div>
    <div class="cart-item-actions">
      <button type="button" data-cart-minus="${escapeHtml(item.id)}" aria-label="Kurangi jumlah">-</button>
      <b>${item.qty}</b>
      <button type="button" data-cart-plus="${escapeHtml(item.id)}" aria-label="Tambah jumlah">+</button>
      <button class="remove-cart" type="button" data-cart-remove="${escapeHtml(item.id)}" aria-label="Hapus item">x</button>
    </div>
  </div>`).join("");
}

function renderQrisPayment(){
  const isQris = document.getElementById("paymentMethod").value === "QRIS";
  const panel = document.getElementById("qrisPayment");
  const preview = document.getElementById("qrisPreview");
  panel.hidden = !isQris;
  if(!isQris) return;

  if(!qrisImage){
    preview.innerHTML = '<div class="empty-state">Upload barcode QRIS Anda agar dapat ditampilkan saat pembayaran.</div>';
    document.getElementById("removeQrisImage").hidden = true;
    return;
  }
  preview.innerHTML = `<img src="${escapeHtml(qrisImage)}" alt="Barcode QRIS pembayaran" />`;
  document.getElementById("removeQrisImage").hidden = false;
}

function localDateKey(date){
  const year = date.getFullYear();
  const month = String(date.getMonth()+1).padStart(2,"0");
  const day = String(date.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
}

function renderTopProducts(today){
  const totals = new Map();
  today.filter(s=>s.productId).forEach(s=>{
    const key = s.productId;
    const current = totals.get(key) || {name:s.productName,qty:0,revenue:0};
    current.qty += Number(s.qty||0);
    current.revenue += Number(s.revenue||0);
    totals.set(key,current);
  });

  const topProducts = [...totals.values()]
    .sort((a,b)=>b.qty-a.qty || b.revenue-a.revenue || a.name.localeCompare(b.name,"id"))
    .slice(0,5);
  const list = document.getElementById("topProducts");
  if(topProducts.length===0){
    list.innerHTML = '<li class="dashboard-empty">Belum ada produk terjual hari ini.</li>';
    return;
  }
  list.innerHTML = topProducts.map(item=>`<li>
    <span>${escapeHtml(item.name)}</span>
    <strong>${item.qty} item</strong>
  </li>`).join("");
}

function renderLowStockAlerts(){
  const alerts = products
    .map(p=>({name:p.name,remaining:stockEnd(p)}))
    .filter(p=>p.remaining<=5)
    .sort((a,b)=>a.remaining-b.remaining || a.name.localeCompare(b.name,"id"));
  const box = document.getElementById("lowStockAlerts");
  if(alerts.length===0){
    box.innerHTML = '<div class="dashboard-empty">Stok produk masih aman.</div>';
    return;
  }
  box.innerHTML = alerts.map(item=>`<div class="stock-alert">
    <span class="stock-alert-icon">&#9888;</span>
    <span><strong>${escapeHtml(item.name)}</strong> tersisa ${item.remaining}</span>
  </div>`).join("");
}

function renderSalesChart(){
  const days = [];
  for(let offset=6;offset>=0;offset--){
    const date = new Date();
    date.setHours(0,0,0,0);
    date.setDate(date.getDate()-offset);
    days.push({date,key:localDateKey(date),revenue:0});
  }

  const dayByKey = new Map(days.map(day=>[day.key,day]));
  sales.forEach(s=>{
    const date = new Date(s.date);
    if(Number.isNaN(date.getTime())) return;
    const day = dayByKey.get(localDateKey(date));
    if(day) day.revenue += Number(s.revenue||0);
  });

  const maxRevenue = Math.max(...days.map(day=>day.revenue),0);
  document.getElementById("salesChart").innerHTML = days.map(day=>{
    const barHeight = maxRevenue ? Math.max(6,Math.round((day.revenue/maxRevenue)*100)) : 0;
    const label = day.date.toLocaleDateString("id-ID",{weekday:"short"});
    const dateLabel = day.date.toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit"});
    return `<div class="sales-chart-day">
      <div class="sales-chart-value">${day.revenue ? rupiah(day.revenue) : "Rp0"}</div>
      <div class="sales-chart-track" title="${escapeHtml(`${dateLabel}: ${rupiah(day.revenue)}`)}">
        <div class="sales-chart-bar" style="height:${barHeight}%"></div>
      </div>
      <strong>${escapeHtml(label)}</strong>
      <small>${escapeHtml(dateLabel)}</small>
    </div>`;
  }).join("");
}

function renderDashboard(){
  const today = filterSales("daily");
  document.getElementById("dashOmzet").textContent = rupiah(today.reduce((a,b)=>a+Number(b.revenue||0),0));
  document.getElementById("dashProfit").textContent = rupiah(today.reduce((a,b)=>a+Number(b.profit||0),0));
  document.getElementById("dashQty").textContent = today.reduce((a,b)=>a+Number(b.qty||0),0);
  renderTopProducts(today);
  renderLowStockAlerts();
  renderSalesChart();

  const recent = document.getElementById("recentSales");
  recent.innerHTML = "";
  const receiptButtons = new Set();
  sales.slice().reverse().slice(0,8).forEach(s=>{
    const receiptId = transactionKey(s);
    const action = receiptButtons.has(receiptId) ? "" : receiptAction(receiptId);
    receiptButtons.add(receiptId);
    recent.innerHTML += `<tr>
      <td>${new Date(s.date).toLocaleString("id-ID")}</td>
      <td>${escapeHtml(s.productName)}</td>
      <td>${escapeHtml(s.note || "-")}</td>
      <td>${escapeHtml(salePayment(s))}</td>
      <td>${s.qty}</td>
      <td>${rupiah(s.revenue)}</td>
      <td>${rupiah(s.profit)}</td>
      <td>${action}</td>
    </tr>`;
  });
  if(sales.length===0) recent.innerHTML = '<tr><td colspan="8">Belum ada transaksi.</td></tr>';
}

function renderReport(){
  const type = document.getElementById("reportType").value;
  const data = filterSales(type);
  document.getElementById("reportTrx").textContent = new Set(data.map(s=>s.transactionId || s.id)).size;
  document.getElementById("reportQty").textContent = data.reduce((a,b)=>a+Number(b.qty||0),0);
  document.getElementById("reportRevenue").textContent = rupiah(data.reduce((a,b)=>a+Number(b.revenue||0),0));
  document.getElementById("reportProfit").textContent = rupiah(data.reduce((a,b)=>a+Number(b.profit||0),0));

  const body = document.getElementById("reportTable");
  body.innerHTML = "";
  if(data.length===0){
    body.innerHTML = '<tr><td colspan="10">Belum ada transaksi pada periode ini.</td></tr>';
    return;
  }
  const receiptButtons = new Set();
  data.slice().reverse().forEach(s=>{
    const receiptId = transactionKey(s);
    const action = receiptButtons.has(receiptId) ? "" : receiptAction(receiptId);
    receiptButtons.add(receiptId);
    body.innerHTML += `<tr>
      <td>${new Date(s.date).toLocaleString("id-ID")}</td>
      <td>${escapeHtml(s.productName)}</td>
      <td>${escapeHtml(s.note || "-")}</td>
      <td>${escapeHtml(salePayment(s))}</td>
      <td>${s.qty}</td>
      <td>${rupiah(s.costPrice)}</td>
      <td>${rupiah(s.sellPrice)}</td>
      <td>${rupiah(s.revenue)}</td>
      <td>${rupiah(s.profit)}</td>
      <td>${action}</td>
    </tr>`;
  });
}

function renderAll(){
  renderProducts();
  renderCart();
  renderPaymentDetails();
  renderLastReceiptButton();
  renderDashboard();
  renderReport();
}

function addCartItem(item){
  const existing = cart.find(entry=>
    entry.productId &&
    entry.productId===item.productId &&
    entry.note===item.note &&
    entry.costPrice===item.costPrice &&
    entry.sellPrice===item.sellPrice
  );
  if(existing){
    existing.qty += item.qty;
  } else {
    cart.push(item);
  }
  save();
  renderAll();
}

function changeCartItem(id, difference){
  const item = cart.find(entry=>entry.id===id);
  if(!item) return;

  if(difference > 0 && item.productId){
    const product = products.find(p=>p.id===item.productId);
    if(!product || availableStock(product)<=0){
      setSaleMessage("Stok tidak cukup untuk menambah item.", "#dc2626");
      return;
    }
  }

  item.qty += difference;
  if(item.qty<=0) cart = cart.filter(entry=>entry.id!==id);
  save();
  renderAll();
}

function editProduct(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;
  document.getElementById("editId").value = p.id;
  document.getElementById("productName").value = p.name;
  document.getElementById("productCategory").value = productCategory(p);
  document.getElementById("costPrice").value = formatMoneyInput(p.costPrice);
  document.getElementById("sellPrice").value = formatMoneyInput(p.sellPrice);
  document.getElementById("imageUrl").value = p.imageUrl && !p.imageUrl.startsWith("data:") ? p.imageUrl : "";
  document.getElementById("stockStart").value = p.stockStart;
  document.querySelector('[data-page="produk"]').click();
}

function deleteProduct(id){
  if(!confirm("Hapus produk dari katalog? Riwayat transaksi tetap tersimpan.")) return;
  products = products.filter(p=>p.id!==id);
  cart = cart.filter(item=>item.productId!==id);
  save();
  renderAll();
}

function downloadBlob(filename, contents, type){
  const blob = new Blob([contents],{type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function backupFilename(){
  return `backup-${localDateKey(new Date())}.json`;
}

function downloadBackup(){
  const backup = JSON.stringify({version:1,exportedAt:new Date().toISOString(),products,sales,cart,qrisImage},null,2);
  downloadBlob(backupFilename(),backup,"application/json");
}

function excelCell(value){
  const isNumber = typeof value === "number" && Number.isFinite(value);
  return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${xmlEscape(value)}</Data></Cell>`;
}

function exportExcel(filename, sheetName, rows){
  const table = rows.map(row=>`<Row>${row.map(excelCell).join("")}</Row>`).join("");
  const workbook = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${xmlEscape(sheetName.slice(0,31))}"><Table>${table}</Table></Worksheet></Workbook>`;
  downloadBlob(filename, `\ufeff${workbook}`, "application/vnd.ms-excel;charset=utf-8");
}

document.getElementById("todayText").textContent = new Date().toLocaleDateString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric"});

document.querySelectorAll(".nav").forEach(btn=>{
  btn.onclick = () => {
    document.querySelectorAll(".nav,.page").forEach(el=>el.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.page).classList.add("active");
    document.getElementById("pageTitle").textContent = btn.textContent;
  };
});

document.getElementById("cashierProducts").onclick = e => {
  const tile = e.target.closest(".product-tile");
  if(!tile) return;
  selectProduct(tile.dataset.productId);
};

document.getElementById("productTable").onclick = e => {
  const editButton = e.target.closest("[data-edit-product]");
  const deleteButton = e.target.closest("[data-delete-product]");
  if(editButton) editProduct(editButton.dataset.editProduct);
  if(deleteButton) deleteProduct(deleteButton.dataset.deleteProduct);
};

document.getElementById("cartItems").onclick = e => {
  const minusButton = e.target.closest("[data-cart-minus]");
  const plusButton = e.target.closest("[data-cart-plus]");
  const removeButton = e.target.closest("[data-cart-remove]");
  if(minusButton) changeCartItem(minusButton.dataset.cartMinus,-1);
  if(plusButton) changeCartItem(plusButton.dataset.cartPlus,1);
  if(removeButton){
    cart = cart.filter(item=>item.id!==removeButton.dataset.cartRemove);
    save();
    renderAll();
  }
};

function handleReceiptAction(e){
  const button = e.target.closest("[data-print-transaction]");
  if(button) openReceipt(button.dataset.printTransaction);
}

document.getElementById("recentSales").onclick = handleReceiptAction;
document.getElementById("reportTable").onclick = handleReceiptAction;
document.getElementById("printLastReceipt").onclick = () => openReceipt(latestTransactionId());
document.getElementById("printReceipt").onclick = () => window.print();
document.getElementById("whatsappReceipt").onclick = whatsappCurrentReceipt;
document.getElementById("closeReceiptDialog").onclick = () => document.getElementById("receiptDialog").close();
document.getElementById("closeReceiptButton").onclick = () => document.getElementById("receiptDialog").close();
document.getElementById("receiptDialog").onclick = e => {
  if(e.target===document.getElementById("receiptDialog")) e.target.close();
};

document.querySelectorAll(".money-input").forEach(input=>{
  input.oninput = () => {
    input.value = formatMoneyInput(input.value);
    if(input.id==="cashReceived") renderCashChange();
  };
});

document.getElementById("productForm").onsubmit = async e => {
  e.preventDefault();
  const id = document.getElementById("editId").value;
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value.trim() || "Umum";
  const costPrice = moneyValue(document.getElementById("costPrice").value);
  const sellPrice = moneyValue(document.getElementById("sellPrice").value);
  const imageUrlInput = document.getElementById("imageUrl").value.trim();
  const imageFile = document.getElementById("imageFile").files[0];
  const uploadedImage = await readImageFile(imageFile);
  const stockStart = Number(document.getElementById("stockStart").value);

  if(id){
    const p = products.find(x=>x.id===id);
    if(!p) return;
    const imageUrl = uploadedImage || imageUrlInput || p.imageUrl || "";
    Object.assign(p,{name,category,costPrice,sellPrice,imageUrl,stockStart});
  } else {
    const imageUrl = uploadedImage || imageUrlInput;
    products.push({id:uid("product"),name,category,costPrice,sellPrice,imageUrl,stockStart});
  }

  e.target.reset();
  document.getElementById("editId").value = "";
  save();
  renderAll();
};

document.getElementById("saleForm").onsubmit = e => {
  e.preventDefault();
  const productId = selectedProductId();
  const qty = Number(document.getElementById("saleQty").value);
  const note = document.getElementById("saleNote").value.trim();
  const p = products.find(x=>x.id===productId);
  if(!p){
    setSaleMessage("Pilih produk dulu.", "#dc2626");
    return;
  }
  if(qty<=0 || qty > availableStock(p)){
    setSaleMessage("Stok tidak cukup.", "#dc2626");
    return;
  }

  addCartItem({
    id:uid("cart"),
    productId:p.id,
    productName:p.name,
    category:productCategory(p),
    note,
    qty,
    costPrice:Number(p.costPrice),
    sellPrice:Number(p.sellPrice)
  });
  setSaleMessage(`${p.name} ditambahkan ke keranjang.`, "#16a34a");
  document.getElementById("saleQty").value = 1;
  document.getElementById("saleNote").value = "";
};

document.getElementById("manualForm").onsubmit = e => {
  e.preventDefault();
  const amount = moneyValue(document.getElementById("manualAmount").value);
  const note = document.getElementById("manualNote").value.trim();
  if(amount <= 0 || !note){
    setSaleMessage("Nominal dan keterangan manual wajib diisi.", "#dc2626");
    return;
  }

  addCartItem({
    id:uid("cart"),
    productId:null,
    productName:note,
    category:"Manual",
    note:"",
    qty:1,
    costPrice:0,
    sellPrice:amount
  });
  setSaleMessage(`${note} ditambahkan ke keranjang.`, "#16a34a");
  e.target.reset();
};

document.getElementById("checkoutCart").onclick = () => {
  if(cart.length===0){
    setSaleMessage("Keranjang masih kosong.", "#dc2626");
    return;
  }

  const unavailable = cart.find(item=>{
    if(!item.productId) return false;
    const p = products.find(product=>product.id===item.productId);
    return !p || cartQty(item.productId) > stockEnd(p);
  });
  if(unavailable){
    setSaleMessage(`Stok ${unavailable.productName} tidak cukup. Periksa keranjang.`, "#dc2626");
    return;
  }

  const paymentMethod = document.getElementById("paymentMethod").value;
  const date = new Date().toISOString();
  const total = cartTotal();
  const cashReceived = paymentMethod==="Cash" ? moneyValue(document.getElementById("cashReceived").value) : 0;
  const change = paymentMethod==="Cash" ? cashReceived-total : 0;
  if(paymentMethod==="Cash" && cashReceived<total){
    setSaleMessage("Uang diterima kurang dari total pembayaran.", "#dc2626");
    return;
  }

  const transactionId = createTransactionId();
  cart.forEach(item=>{
    const revenue = item.sellPrice * item.qty;
    const profit = revenue - (item.costPrice * item.qty);
    sales.push({
      id:uid("sale"),
      transactionId,
      productId:item.productId,
      productName:item.productName,
      category:item.category,
      note:item.note,
      qty:item.qty,
      costPrice:item.costPrice,
      sellPrice:item.sellPrice,
      revenue,
      profit,
      paymentMethod,
      cashReceived,
      change,
      date
    });
  });
  cart = [];
  save();
  document.getElementById("cashReceived").value = "";
  renderAll();
  setSaleMessage(`Checkout ${paymentMethod} berhasil. Total ${rupiah(total)}.`, "#16a34a");
  openReceipt(transactionId);
};

document.getElementById("clearCart").onclick = () => {
  if(cart.length===0 || !confirm("Kosongkan seluruh keranjang?")) return;
  cart = [];
  save();
  renderAll();
};

document.getElementById("paymentMethod").onchange = renderPaymentDetails;

document.getElementById("qrisImageFile").onchange = async e => {
  const file = e.target.files[0];
  if(!file) return;
  try {
    qrisImage = normalizeQrisImage(await readImageFile(file));
    if(!qrisImage) throw new Error("Format gambar tidak valid");
    save();
    renderQrisPayment();
    setSaleMessage("Barcode QRIS berhasil disimpan.", "#16a34a");
  } catch {
    setSaleMessage("Barcode QRIS gagal disimpan. Pilih file gambar yang valid.", "#dc2626");
  } finally {
    e.target.value = "";
  }
};

document.getElementById("removeQrisImage").onclick = () => {
  if(!qrisImage || !confirm("Hapus barcode QRIS yang tersimpan?")) return;
  qrisImage = "";
  save();
  renderQrisPayment();
  setSaleMessage("Barcode QRIS berhasil dihapus.", "#16a34a");
};

document.getElementById("exportProduct").onclick = () => {
  const rows = [["Produk","Kategori","Harga Modal","Harga Jual","Margin","Stok Awal","Terjual","Stok Akhir"]];
  products.forEach(p=>rows.push([p.name,productCategory(p),Number(p.costPrice),Number(p.sellPrice),profitPerItem(p),Number(p.stockStart),soldQty(p.id),stockEnd(p)]));
  exportExcel("produk-pos.xls","Produk",rows);
};

document.getElementById("exportReport").onclick = () => {
  const data = filterSales(document.getElementById("reportType").value);
  const rows = [["Tanggal","ID Transaksi","Produk","Kategori","Keterangan","Pembayaran","Qty","Modal","Jual","Omzet","Laba"]];
  data.forEach(s=>rows.push([new Date(s.date).toLocaleString("id-ID"),s.transactionId||s.id,s.productName,s.category||"Umum",s.note||"-",salePayment(s),Number(s.qty),Number(s.costPrice),Number(s.sellPrice),Number(s.revenue),Number(s.profit)]));
  exportExcel("laporan-penjualan.xls","Laporan Penjualan",rows);
};

const dataToolsDialog = document.getElementById("dataToolsDialog");
document.getElementById("openDataToolsDialog").onclick = () => dataToolsDialog.showModal();
document.getElementById("closeDataToolsDialog").onclick = () => dataToolsDialog.close();
dataToolsDialog.onclick = e => {
  if(e.target===dataToolsDialog) dataToolsDialog.close();
};

document.getElementById("backupData").onclick = () => {
  downloadBackup();
  dataToolsDialog.close();
};

document.getElementById("restoreData").onclick = () => {
  document.getElementById("restoreFile").click();
};

document.getElementById("exportAllExcel").onclick = () => {
  const rows = [["Tanggal","ID Transaksi","Produk","Kategori","Keterangan","Pembayaran","Qty","Modal","Jual","Omzet","Laba"]];
  sales.forEach(s=>rows.push([new Date(s.date).toLocaleString("id-ID"),s.transactionId||s.id,s.productName,s.category||"Umum",s.note||"-",salePayment(s),Number(s.qty),Number(s.costPrice),Number(s.sellPrice),Number(s.revenue),Number(s.profit)]));
  exportExcel("seluruh-penjualan.xls","Seluruh Penjualan",rows);
  dataToolsDialog.close();
};

document.getElementById("restoreFile").onchange = async e => {
  const file = e.target.files[0];
  if(!file) return;
  try {
    const data = JSON.parse(await file.text());
    const validProducts = Array.isArray(data.products) && data.products.every(p=>isRecord(p) && typeof p.id==="string" && typeof p.name==="string");
    const validSales = Array.isArray(data.sales) && data.sales.every(s=>isRecord(s) && typeof s.id==="string" && typeof s.productName==="string");
    const validCart = data.cart===undefined || (Array.isArray(data.cart) && data.cart.every(item=>isRecord(item) && typeof item.id==="string" && typeof item.productName==="string"));
    const validQrisImage = data.qrisImage===undefined || data.qrisImage==="" || normalizeQrisImage(data.qrisImage);
    if(!validProducts || !validSales || !validCart || !validQrisImage){
      throw new Error("Format backup tidak valid");
    }
    if(!confirm("Restore akan mengganti data saat ini. Lanjutkan?")) return;
    products = data.products.map(normalizeProduct);
    sales = data.sales.map(normalizeSale);
    cart = Array.isArray(data.cart) ? data.cart.map(normalizeCartItem) : [];
    qrisImage = normalizeQrisImage(data.qrisImage);
    save();
    renderAll();
    dataToolsDialog.close();
    alert("Restore data berhasil.");
  } catch {
    alert("File backup tidak valid.");
  } finally {
    e.target.value = "";
  }
};

document.getElementById("reportType").onchange = renderReport;

const adminPinDialog = document.getElementById("adminPinDialog");
const resetAuthDialog = document.getElementById("resetAuthDialog");
const resetDialog = document.getElementById("resetDialog");
let resetUnlocked = false;

function setPinMessage(id,text,color){
  const message = document.getElementById(id);
  message.textContent = text;
  message.style.color = color;
}

function openAdminPinSettings(){
  document.getElementById("adminPinForm").reset();
  document.getElementById("currentPinField").hidden = !adminPinHash;
  document.getElementById("currentAdminPin").required = Boolean(adminPinHash);
  document.getElementById("adminPinTitle").textContent = adminPinHash ? "Ubah PIN Admin" : "Buat PIN Admin";
  document.getElementById("adminPinHelp").textContent = adminPinHash
    ? "Masukkan PIN saat ini sebelum membuat PIN baru."
    : "Buat PIN 4 sampai 8 angka untuk melindungi menu reset data.";
  setPinMessage("adminPinMessage","","");
  adminPinDialog.showModal();
}

function closeAdminPinSettings(){
  adminPinDialog.close();
}

function openResetAuth(){
  if(!adminPinHash){
    alert("Buat PIN Admin terlebih dahulu sebelum menggunakan menu reset.");
    openAdminPinSettings();
    return;
  }
  document.getElementById("resetAuthForm").reset();
  setPinMessage("resetAuthMessage","","");
  resetAuthDialog.showModal();
}

function lockAndCloseReset(){
  resetUnlocked = false;
  resetDialog.close();
}

function requireResetUnlock(){
  if(resetUnlocked) return true;
  lockAndCloseReset();
  openResetAuth();
  return false;
}

const finishReset = message => {
  save();
  renderAll();
  lockAndCloseReset();
  alert(message);
};

document.getElementById("openAdminPinDialog").onclick = openAdminPinSettings;
document.getElementById("closeAdminPinDialog").onclick = closeAdminPinSettings;
document.getElementById("cancelAdminPin").onclick = closeAdminPinSettings;
adminPinDialog.onclick = e => {
  if(e.target===adminPinDialog) closeAdminPinSettings();
};

document.getElementById("adminPinForm").onsubmit = async e => {
  e.preventDefault();
  const currentPin = document.getElementById("currentAdminPin").value;
  const newPin = document.getElementById("newAdminPin").value;
  const confirmPin = document.getElementById("confirmAdminPin").value;
  if(!validAdminPin(newPin)){
    setPinMessage("adminPinMessage","PIN baru harus terdiri dari 4 sampai 8 angka.","#dc2626");
    return;
  }
  if(newPin!==confirmPin){
    setPinMessage("adminPinMessage","Konfirmasi PIN baru tidak sama.","#dc2626");
    return;
  }
  try {
    if(adminPinHash && !await verifyAdminPin(currentPin)){
      setPinMessage("adminPinMessage","PIN saat ini salah.","#dc2626");
      return;
    }
    adminPinHash = await hashAdminPin(newPin);
    save();
    closeAdminPinSettings();
    alert("PIN Admin berhasil disimpan.");
  } catch {
    setPinMessage("adminPinMessage","PIN gagal disimpan pada browser ini.","#dc2626");
  }
};

document.getElementById("openResetDialog").onclick = openResetAuth;
document.getElementById("closeResetAuthDialog").onclick = () => resetAuthDialog.close();
document.getElementById("cancelResetAuth").onclick = () => resetAuthDialog.close();
resetAuthDialog.onclick = e => {
  if(e.target===resetAuthDialog) resetAuthDialog.close();
};
document.getElementById("resetAuthForm").onsubmit = async e => {
  e.preventDefault();
  try {
    if(!await verifyAdminPin(document.getElementById("resetAdminPin").value)){
      setPinMessage("resetAuthMessage","PIN Admin salah.","#dc2626");
      return;
    }
    resetUnlocked = true;
    resetAuthDialog.close();
    resetDialog.showModal();
  } catch {
    setPinMessage("resetAuthMessage","PIN gagal diverifikasi pada browser ini.","#dc2626");
  }
};

document.getElementById("closeResetDialog").onclick = lockAndCloseReset;
resetDialog.onclose = () => {
  resetUnlocked = false;
};
resetDialog.onclick = e => {
  if(e.target===resetDialog) lockAndCloseReset();
};

document.getElementById("resetProducts").onclick = () => {
  if(!requireResetUnlock()) return;
  if(!confirm("Hapus seluruh katalog produk? Dashboard dan laporan transaksi tetap tersimpan.")) return;
  products = [];
  cart = cart.filter(item=>!item.productId);
  finishReset("Produk berhasil direset. Riwayat dashboard dan laporan tetap tersimpan.");
};

document.getElementById("resetTransactions").onclick = () => {
  if(!requireResetUnlock()) return;
  if(!confirm("Hapus seluruh riwayat transaksi pada dashboard dan laporan?")) return;
  sales = [];
  finishReset("Riwayat transaksi berhasil direset. Produk dan keranjang tetap tersimpan.");
};

document.getElementById("resetCart").onclick = () => {
  if(!requireResetUnlock()) return;
  if(!confirm("Kosongkan seluruh keranjang kasir?")) return;
  cart = [];
  finishReset("Keranjang kasir berhasil dikosongkan.");
};

document.getElementById("resetAllData").onclick = () => {
  if(!requireResetUnlock()) return;
  if(!confirm("Yakin hapus semua produk, transaksi, keranjang, dan barcode QRIS?")) return;
  products = [];
  sales = [];
  cart = [];
  qrisImage = "";
  finishReset("Semua data berhasil direset.");
};

renderAll();
setTimeout(downloadBackup,0);
