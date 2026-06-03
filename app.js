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
let cashierSearchQuery = "";
let cashierCategoryFilter = "Semua";
let productSearchQuery = "";
let productCategoryFilter = "all";
let productStockFilter = "all";
let productSortMode = "name-asc";
let productViewMode = "grid";
let productPage = 1;

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
const isManualCartItem = item => !item.productId && productCategory(item).toLowerCase() === "manual";
const manualCartNote = item => {
  const note = String(item.note || "").trim();
  const name = String(item.productName || "").trim();
  if(note && note.toLowerCase() !== "manual") return note;
  if(name && name.toLowerCase() !== "manual") return name;
  return "Keterangan manual";
};
const cartItemTitle = item => isManualCartItem(item) ? rupiah(item.sellPrice) : item.productName;
const cartItemSubtitle = item => isManualCartItem(item) ? manualCartNote(item) : (item.note || productCategory(item));

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

function addProductToCart(productId, note=""){
  const p = products.find(product=>product.id===productId);
  if(!p){
    setSaleMessage("Produk tidak ditemukan.", "#dc2626");
    return;
  }
  if(availableStock(p)<=0){
    setSaleMessage("Stok tidak cukup.", "#dc2626");
    return;
  }

  addCartItem({
    id:uid("cart"),
    productId:p.id,
    productName:p.name,
    category:productCategory(p),
    note,
    qty:1,
    costPrice:Number(p.costPrice),
    sellPrice:Number(p.sellPrice)
  });
  setSaleMessage(`${p.name} ditambahkan ke keranjang.`, "#16a34a");
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
  renderCashierCategories();
  if(products.length===0){
    grid.innerHTML = '<div class="empty-state">Belum ada produk. Tambahkan produk lebih dulu.</div>';
    refreshSelectedProduct();
    return;
  }

  const query = cashierSearchQuery.trim().toLowerCase();
  const visibleProducts = products.filter(p=>{
    const matchCategory = cashierCategoryFilter==="Semua" || productCategory(p)===cashierCategoryFilter;
    const matchSearch = !query || `${p.name} ${productCategory(p)} ${p.sellPrice}`.toLowerCase().includes(query);
    return matchCategory && matchSearch;
  });

  if(visibleProducts.length===0){
    grid.innerHTML = '<div class="empty-state">Produk tidak ditemukan.</div>';
    refreshSelectedProduct();
    return;
  }

  grid.innerHTML = visibleProducts.map(p=>{
    const isActive = p.id === currentId;
    const remaining = availableStock(p);
    return `<button class="product-tile ${isActive ? "active" : ""}" type="button" data-product-id="${escapeHtml(p.id)}" ${remaining<=0 ? "disabled" : ""}>
      <span class="product-tile-image"><img src="${productImage(p)}" alt="${escapeHtml(p.name)}" onerror="this.src='${fallbackImage(p.name)}'" /></span>
      <span class="product-name">${escapeHtml(p.name)}</span>
      <strong>${rupiah(p.sellPrice)}</strong>
      <small>Stok: ${remaining}</small>
    </button>`;
  }).join("");

  refreshSelectedProduct();
}

function renderCashierCategories(){
  const box = document.getElementById("cashierCategories");
  if(!box) return;
  const categories = ["Semua",...[...new Set(products.map(productCategory))].sort((a,b)=>a.localeCompare(b,"id"))];
  if(!categories.includes(cashierCategoryFilter)) cashierCategoryFilter = "Semua";
  box.innerHTML = categories.map(category=>`<button class="cashier-category ${category===cashierCategoryFilter ? "active" : ""}" type="button" data-cashier-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("");
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

function productStockStatus(product){
  const remaining = stockEnd(product);
  if(remaining<=0) return {key:"empty",label:"Habis",tone:"empty"};
  if(remaining<=3) return {key:"critical",label:"Hampir Habis",tone:"critical"};
  if(remaining<=8) return {key:"low",label:"Rendah",tone:"low"};
  return {key:"safe",label:"Aman",tone:"safe"};
}

function productMarginPercent(product){
  const sellPrice = Number(product.sellPrice||0);
  if(sellPrice<=0) return 0;
  return Math.max(0,Math.round((profitPerItem(product)/sellPrice)*100));
}

function renderProductSummary(){
  const lowStockCount = products.filter(product=>["empty","critical","low"].includes(productStockStatus(product).key)).length;
  const stockValue = products.reduce((sum,product)=>sum+(Math.max(0,stockEnd(product))*Number(product.sellPrice||0)),0);
  const averageMargin = products.length
    ? Math.round(products.reduce((sum,product)=>sum+productMarginPercent(product),0)/products.length)
    : 0;
  document.getElementById("productTotalCount").textContent = products.length;
  document.getElementById("productLowStockCount").textContent = lowStockCount;
  document.getElementById("productStockValue").textContent = rupiah(stockValue);
  document.getElementById("productAverageMargin").textContent = `${averageMargin}%`;
}

function renderProductFilterOptions(){
  const select = document.getElementById("productCategoryFilter");
  const categories = [...new Set(products.map(productCategory))].sort((a,b)=>a.localeCompare(b,"id"));
  if(productCategoryFilter!=="all" && !categories.includes(productCategoryFilter)) productCategoryFilter = "all";
  select.innerHTML = `<option value="all">Semua Kategori</option>${categories.map(category=>`<option value="${escapeHtml(category)}" ${category===productCategoryFilter ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}`;
}

function filteredProducts(){
  const query = productSearchQuery.trim().toLowerCase();
  const visible = products.filter(product=>{
    const status = productStockStatus(product).key;
    const matchesQuery = !query || `${product.name} ${productCategory(product)} ${product.sellPrice} ${product.costPrice}`.toLowerCase().includes(query);
    const matchesCategory = productCategoryFilter==="all" || productCategory(product)===productCategoryFilter;
    const matchesStatus = productStockFilter==="all" || status===productStockFilter;
    return matchesQuery && matchesCategory && matchesStatus;
  });
  return visible.sort((a,b)=>{
    if(productSortMode==="name-desc") return b.name.localeCompare(a.name,"id");
    if(productSortMode==="stock-asc") return stockEnd(a)-stockEnd(b) || a.name.localeCompare(b.name,"id");
    if(productSortMode==="stock-desc") return stockEnd(b)-stockEnd(a) || a.name.localeCompare(b.name,"id");
    if(productSortMode==="price-asc") return Number(a.sellPrice)-Number(b.sellPrice) || a.name.localeCompare(b.name,"id");
    if(productSortMode==="price-desc") return Number(b.sellPrice)-Number(a.sellPrice) || a.name.localeCompare(b.name,"id");
    return a.name.localeCompare(b.name,"id");
  });
}

function productCard(product){
  const remaining = stockEnd(product);
  const status = productStockStatus(product);
  return `<article class="product-manage-card status-${status.tone}">
    <div class="product-card-main">
      <img class="product-card-image" src="${productImage(product)}" alt="${escapeHtml(product.name)}" onerror="this.src='${fallbackImage(product.name)}'" />
      <div class="product-card-copy">
        <strong>${escapeHtml(product.name)}</strong>
        <span>${escapeHtml(productCategory(product))}</span>
        <b>${rupiah(product.sellPrice)}</b>
      </div>
    </div>
    <div class="product-stock-row">
      <span>Stok <strong>${remaining}</strong></span>
      <em>${escapeHtml(status.label)}</em>
    </div>
    <div class="product-card-meta">
      <span>Modal ${rupiah(product.costPrice)}</span>
      <span>Margin ${productMarginPercent(product)}%</span>
    </div>
    <div class="product-card-actions">
      <button type="button" data-edit-product="${escapeHtml(product.id)}">${resetIcon("edit")}Edit</button>
      <button type="button" data-edit-product="${escapeHtml(product.id)}">${resetIcon("cube")}Stok</button>
      <button type="button" data-delete-product="${escapeHtml(product.id)}" aria-label="Hapus ${escapeHtml(product.name)}">${resetIcon("trash")}</button>
    </div>
  </article>`;
}

function renderProducts(){
  const body = document.getElementById("productTable");
  const pageSize = 8;
  const visible = filteredProducts();
  const pageCount = Math.max(1,Math.ceil(visible.length/pageSize));
  if(productPage>pageCount) productPage = pageCount;
  if(productPage<1) productPage = 1;
  const start = (productPage-1)*pageSize;
  const pageItems = visible.slice(start,start+pageSize);

  renderProductSummary();
  renderProductFilterOptions();
  document.getElementById("productStockFilter").value = productStockFilter;
  document.getElementById("productSortSelect").value = productSortMode;
  body.classList.toggle("list-view",productViewMode==="list");
  body.innerHTML = pageItems.length
    ? pageItems.map(productCard).join("")
    : '<div class="product-empty-state">Tidak ada produk yang cocok.</div>';

  const from = visible.length ? start+1 : 0;
  const to = Math.min(start+pageSize,visible.length);
  document.getElementById("productPaginationInfo").textContent = `Menampilkan ${from} - ${to} dari ${visible.length} produk`;
  document.getElementById("productPaginationControls").innerHTML = `<button type="button" data-product-page="${productPage-1}" ${productPage<=1 ? "disabled" : ""}>${resetIcon("chevronLeft")}</button>
    ${Array.from({length:pageCount},(_,index)=>`<button class="${index+1===productPage ? "active" : ""}" type="button" data-product-page="${index+1}">${index+1}</button>`).join("")}
    <button type="button" data-product-page="${productPage+1}" ${productPage>=pageCount ? "disabled" : ""}>${resetIcon("chevronRight")}</button>`;

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
  const cashReceivedInput = document.getElementById("cashReceived");
  const cashChange = document.getElementById("cashChange");
  if(!cashReceivedInput || !cashChange) return;
  const received = moneyValue(cashReceivedInput.value);
  cashChange.textContent = rupiah(Math.max(0,received-cartTotal()));
}

function renderPaymentDetails(){
  const cashPayment = document.getElementById("cashPayment");
  if(cashPayment) cashPayment.hidden = true;
  document.querySelectorAll("[data-payment-option]").forEach(button=>{
    button.classList.toggle("active", button.dataset.paymentOption===document.getElementById("paymentMethod").value);
  });
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
  const total = cartTotal();
  const totalQty = cart.reduce((sum,item)=>sum+Number(item.qty||0),0);
  document.getElementById("cartTotal").textContent = rupiah(total);
  document.getElementById("cartSubtotal").textContent = rupiah(total);
  document.getElementById("checkoutTotal").textContent = rupiah(total);
  document.getElementById("cartItemCount").textContent = `${totalQty} item`;
  renderCashChange();

  if(cart.length===0){
    body.innerHTML = '<div class="empty-state">Keranjang masih kosong.</div>';
    return;
  }

  body.innerHTML = cart.map(item=>{
    const product = item.productId ? products.find(p=>p.id===item.productId) : null;
    const title = cartItemTitle(item);
    const subtitle = cartItemSubtitle(item);
    const image = product ? productImage(product) : fallbackImage(title);
    return `<div class="cart-item">
    <img class="cart-item-image" src="${image}" alt="${escapeHtml(title)}" onerror="this.src='${fallbackImage(title)}'" />
    <div class="cart-item-info">
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(subtitle)}</small>
    </div>
    <div class="cart-item-actions">
      <button type="button" data-cart-minus="${escapeHtml(item.id)}" aria-label="Kurangi jumlah">-</button>
      <b>${item.qty}</b>
      <button type="button" data-cart-plus="${escapeHtml(item.id)}" aria-label="Tambah jumlah">+</button>
    </div>
    <strong class="cart-item-total">${rupiah(item.sellPrice*item.qty)}</strong>
    <button class="remove-cart" type="button" data-cart-remove="${escapeHtml(item.id)}" aria-label="Hapus item">${resetIcon("trash")}</button>
  </div>`;
  }).join("");
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
    const product = products.find(p=>p.id===key);
    const current = totals.get(key) || {id:key,name:s.productName,qty:0,revenue:0,image:product ? productImage(product) : fallbackImage(s.productName)};
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
  list.innerHTML = topProducts.map((item,index)=>`<li class="top-product-row">
    <span class="top-product-rank">${index+1}</span>
    <img src="${item.image}" alt="${escapeHtml(item.name)}" onerror="this.src='${fallbackImage(item.name)}'" />
    <span class="top-product-name">${escapeHtml(item.name)}</span>
    <strong>${item.qty} item</strong>
  </li>`).join("");
}

function renderLowStockAlerts(){
  const alerts = products
    .map(p=>({name:p.name,remaining:stockEnd(p),image:productImage(p)}))
    .filter(p=>p.remaining<=5)
    .sort((a,b)=>a.remaining-b.remaining || a.name.localeCompare(b.name,"id"));
  const box = document.getElementById("lowStockAlerts");
  if(alerts.length===0){
    box.innerHTML = '<div class="dashboard-empty">Stok produk masih aman.</div>';
    return;
  }
  box.innerHTML = alerts.slice(0,3).map(item=>`<div class="stock-alert">
    <img src="${item.image}" alt="${escapeHtml(item.name)}" onerror="this.src='${fallbackImage(item.name)}'" />
    <span class="stock-alert-copy">
      <strong>${escapeHtml(item.name)}</strong>
      <small>Stok tersisa</small>
    </span>
    <b>${item.remaining}</b>
  </div>`).join("");
}

function renderSalesChart(){
  const range = Number(document.getElementById("dashboardRange")?.value || 5);
  const metric = document.getElementById("dashboardChartMetric")?.value || "revenue";
  const days = [];
  for(let offset=range-1;offset>=0;offset--){
    const date = new Date();
    date.setHours(0,0,0,0);
    date.setDate(date.getDate()-offset);
    days.push({date,key:localDateKey(date),revenue:0,profit:0,qty:0});
  }

  const dayByKey = new Map(days.map(day=>[day.key,day]));
  sales.forEach(s=>{
    const date = new Date(s.date);
    if(Number.isNaN(date.getTime())) return;
    const day = dayByKey.get(localDateKey(date));
    if(day){
      day.revenue += Number(s.revenue||0);
      day.profit += Number(s.profit||0);
      day.qty += Number(s.qty||0);
    }
  });

  const values = days.map(day=>day[metric]);
  const maxValue = Math.max(...values,0);
  const minValue = Math.min(...values,0);
  const width = 720;
  const height = 260;
  const pad = {left:54,right:34,top:24,bottom:42};
  const innerWidth = width-pad.left-pad.right;
  const innerHeight = height-pad.top-pad.bottom;
  const scaleY = value => pad.top + innerHeight - ((value-minValue) / Math.max(1,maxValue-minValue)) * innerHeight;
  const pointX = index => pad.left + (days.length===1 ? innerWidth : (innerWidth/(days.length-1))*index);
  const points = days.map((day,index)=>({x:pointX(index),y:scaleY(day[metric]),value:day[metric],date:day.date}));
  const line = points.map(point=>`${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${pad.left},${pad.top+innerHeight} ${line} ${pad.left+innerWidth},${pad.top+innerHeight}`;
  const metricLabel = metric==="qty" ? "Qty" : metric==="profit" ? "Laba" : "Omzet";
  const valueLabel = value => metric==="qty" ? `${value} item` : rupiah(value);
  const ySteps = [1,.75,.5,.25,0].map(ratio=>{
    const value = Math.round((maxValue*ratio)/1000)*1000;
    const label = metric==="qty" ? Math.round(maxValue*ratio) : value ? `${Math.round(value/1000)}K` : "0";
    const y = pad.top + innerHeight*(1-ratio);
    return `<g><line x1="${pad.left}" y1="${y}" x2="${pad.left+innerWidth}" y2="${y}" class="chart-grid-line"/><text x="12" y="${y+4}" class="chart-axis-label">${label}</text></g>`;
  }).join("");
  const highlight = points.at(-1);
  const lastDate = highlight.date.toLocaleDateString("id-ID",{day:"numeric",month:"short"});

  document.getElementById("salesChart").innerHTML = `<svg class="dashboard-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafik ${metricLabel} ${range} hari terakhir">
    <defs>
      <linearGradient id="salesAreaGradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#4f7d28" stop-opacity=".28"/>
        <stop offset="100%" stop-color="#4f7d28" stop-opacity=".02"/>
      </linearGradient>
    </defs>
    ${ySteps}
    <polygon points="${area}" fill="url(#salesAreaGradient)"/>
    <polyline points="${line}" fill="none" class="chart-line"/>
    ${points.map(point=>`<circle cx="${point.x}" cy="${point.y}" r="4" class="chart-point"><title>${point.date.toLocaleDateString("id-ID")} - ${valueLabel(point.value)}</title></circle>`).join("")}
    ${days.map((day,index)=>`<text x="${pointX(index)}" y="${height-12}" class="chart-date-label ${index===days.length-1 ? "active" : ""}">${day.date.toLocaleDateString("id-ID",{day:"numeric",month:"short"})}</text>`).join("")}
    <g class="chart-tooltip" transform="translate(${Math.min(highlight.x-42,width-120)} ${Math.max(10,highlight.y-58)})">
      <rect width="94" height="44" rx="6"/>
      <text x="10" y="17">${escapeHtml(lastDate)}</text>
      <text x="10" y="34">${escapeHtml(valueLabel(highlight.value))}</text>
    </g>
  </svg>`;
}

function percentChange(current, previous){
  if(previous<=0) return current>0 ? "↑ Baru hari ini" : "↑ 0% dari kemarin";
  const percent = ((current-previous)/previous)*100;
  const arrow = percent>=0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(percent).toFixed(1)}% dari kemarin`;
}

function renderPaymentSummary(today){
  const box = document.getElementById("paymentSummary");
  const paymentColors = {
    QRIS:"#55a83b",
    Cash:"#fb8c2f",
    Transfer:"#8e50d6",
    "E-Wallet":"#3f7fd7",
    Lainnya:"#d9a441"
  };
  const totals = new Map();
  today.forEach(sale=>{
    const method = salePayment(sale);
    const normalized = method==="QRIS" || method==="Cash" || method==="Transfer" ? method : method==="Lainnya" ? "Lainnya" : method;
    totals.set(normalized,(totals.get(normalized)||0)+Number(sale.revenue||0));
  });
  const total = [...totals.values()].reduce((sum,value)=>sum+value,0);
  const entries = [...totals.entries()].sort((a,b)=>b[1]-a[1]);

  let cursor = 0;
  const segments = entries.map(([method,value])=>{
    const start = cursor;
    const end = cursor + (total ? (value/total)*100 : 0);
    cursor = end;
    return `${paymentColors[method] || paymentColors.Lainnya} ${start}% ${end}%`;
  });
  const gradient = segments.length ? segments.join(",") : "#edf1e8 0% 100%";

  box.innerHTML = `<div class="payment-donut" style="--payment-chart:${gradient}">
    <div>
      <span>Total</span>
      <strong>${rupiah(total)}</strong>
    </div>
  </div>
  <div class="payment-method-list">${entries.length ? entries.map(([method,value])=>{
    const percent = total ? (value/total)*100 : 0;
    const color = paymentColors[method] || paymentColors.Lainnya;
    return `<div class="payment-method-row">
      <span class="payment-method-name">
        <span class="payment-dot" style="background:${color}"></span>
        <strong>${escapeHtml(method)}</strong>
      </span>
      <span class="payment-method-value">
        <strong>${rupiah(value)}</strong>
        <small>${percent.toFixed(1)}%</small>
      </span>
    </div>`;
  }).join("") : '<div class="dashboard-empty">Belum ada pembayaran hari ini.</div>'}</div>`;
}

function renderTodaySummary(today){
  const transactionCount = new Set(today.map(s=>transactionKey(s))).size;
  const qtyTotal = today.reduce((sum,sale)=>sum+Number(sale.qty||0),0);
  const revenueTotal = today.reduce((sum,sale)=>sum+Number(sale.revenue||0),0);
  const profitTotal = today.reduce((sum,sale)=>sum+Number(sale.profit||0),0);
  const averageTransaction = transactionCount ? Math.round(revenueTotal/transactionCount) : 0;
  const itemPerTransaction = transactionCount ? qtyTotal/transactionCount : 0;
  document.getElementById("todaySummary").innerHTML = `<div class="today-summary-row">
    <span>${resetIcon("list")}</span>
    <strong>Total Transaksi</strong>
    <b>${transactionCount}</b>
  </div>
  <div class="today-summary-row">
    <span>${resetIcon("calendar")}</span>
    <strong>Rata-rata Transaksi</strong>
    <b>${rupiah(averageTransaction)}</b>
  </div>
  <div class="today-summary-row">
    <span>${resetIcon("cart")}</span>
    <strong>Item per Transaksi</strong>
    <b>${itemPerTransaction.toFixed(2)}</b>
  </div>
  <div class="today-summary-row">
    <span>${resetIcon("trend")}</span>
    <strong>Total Laba Hari Ini</strong>
    <b>${rupiah(profitTotal)}</b>
  </div>`;
}

function renderDashboard(){
  const today = filterSales("daily");
  const yesterday = sales.filter(s=>{
    const date = new Date(s.date);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate()-1);
    return !Number.isNaN(date.getTime()) && localDateKey(date)===localDateKey(yesterdayDate);
  });
  const todayRevenue = today.reduce((a,b)=>a+Number(b.revenue||0),0);
  const todayProfit = today.reduce((a,b)=>a+Number(b.profit||0),0);
  const todayQty = today.reduce((a,b)=>a+Number(b.qty||0),0);
  const yesterdayRevenue = yesterday.reduce((a,b)=>a+Number(b.revenue||0),0);
  const yesterdayProfit = yesterday.reduce((a,b)=>a+Number(b.profit||0),0);
  const yesterdayQty = yesterday.reduce((a,b)=>a+Number(b.qty||0),0);
  const todayDate = new Date();
  document.getElementById("dashboardToolbarDate").textContent = todayDate.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});
  document.getElementById("dashOmzet").textContent = rupiah(todayRevenue);
  document.getElementById("dashProfit").textContent = rupiah(todayProfit);
  document.getElementById("dashQty").textContent = todayQty;
  document.getElementById("dashOmzetChange").textContent = percentChange(todayRevenue,yesterdayRevenue);
  document.getElementById("dashProfitChange").textContent = percentChange(todayProfit,yesterdayProfit);
  document.getElementById("dashQtyChange").textContent = percentChange(todayQty,yesterdayQty);
  renderTopProducts(today);
  renderLowStockAlerts();
  renderSalesChart();
  renderPaymentSummary(today);
  renderTodaySummary(today);

  const recent = document.getElementById("recentSales");
  if(!recent) return;
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
  const transactionCount = new Set(data.map(s=>s.transactionId || s.id)).size;
  const qtyTotal = data.reduce((a,b)=>a+Number(b.qty||0),0);
  const revenueTotal = data.reduce((a,b)=>a+Number(b.revenue||0),0);
  const profitTotal = data.reduce((a,b)=>a+Number(b.profit||0),0);
  const periodLabels = {daily:"Daily",weekly:"Weekly",monthly:"Monthly"};
  const today = new Date();
  document.getElementById("reportTrx").textContent = transactionCount;
  document.getElementById("reportQty").textContent = qtyTotal;
  document.getElementById("reportRevenue").textContent = rupiah(revenueTotal);
  document.getElementById("reportProfit").textContent = rupiah(profitTotal);
  document.getElementById("reportTrxCaption").textContent = `${transactionCount} transaksi`;
  document.getElementById("reportQtyCaption").textContent = `${qtyTotal} item`;
  document.getElementById("reportPeriodLabel").textContent = periodLabels[type] || "Daily";
  document.getElementById("reportToolbarDate").textContent = today.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});

  const body = document.getElementById("reportTable");
  body.innerHTML = "";
  if(data.length===0){
    body.innerHTML = `<tr class="report-empty-row"><td colspan="10">
      <div class="report-empty-state">
        <span class="report-empty-icon">${resetIcon("clipboardSearch")}</span>
        <strong>Belum ada transaksi pada periode ini.</strong>
        <p>Tidak ada data transaksi untuk periode yang dipilih. Coba ubah periode laporan atau lakukan transaksi terlebih dahulu.</p>
        <button class="report-empty-action" type="button" data-report-focus>
          ${resetIcon("calendar")}
          Pilih Periode Lain
        </button>
      </div>
    </td></tr>`;
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
  openProductForm("edit");
  document.getElementById("editId").value = p.id;
  document.getElementById("productName").value = p.name;
  document.getElementById("productCategory").value = productCategory(p);
  document.getElementById("costPrice").value = formatMoneyInput(p.costPrice);
  document.getElementById("sellPrice").value = formatMoneyInput(p.sellPrice);
  document.getElementById("imageUrl").value = p.imageUrl && !p.imageUrl.startsWith("data:") ? p.imageUrl : "";
  document.getElementById("stockStart").value = p.stockStart;
  document.querySelector('[data-page="produk"]').click();
  document.getElementById("productFormCard").scrollIntoView({behavior:"smooth",block:"start"});
}

function deleteProduct(id){
  if(!confirm("Hapus produk dari katalog? Riwayat transaksi tetap tersimpan.")) return;
  products = products.filter(p=>p.id!==id);
  cart = cart.filter(item=>item.productId!==id);
  save();
  renderAll();
}

function openProductForm(mode="add"){
  document.getElementById("productFormCard").hidden = false;
  document.getElementById("productFormTitle").textContent = mode==="edit" ? "Edit Produk" : "Tambah Produk";
  if(mode==="add"){
    document.getElementById("productForm").reset();
    document.getElementById("editId").value = "";
  }
}

function closeProductForm(){
  document.getElementById("productForm").reset();
  document.getElementById("editId").value = "";
  document.getElementById("productFormCard").hidden = true;
  document.getElementById("productFormTitle").textContent = "Tambah Produk";
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
  addProductToCart(tile.dataset.productId);
};

document.getElementById("cashierProductSearch").oninput = e => {
  cashierSearchQuery = e.target.value;
  renderCashierProducts();
};

document.getElementById("cashierCategories").onclick = e => {
  const button = e.target.closest("[data-cashier-category]");
  if(!button) return;
  cashierCategoryFilter = button.dataset.cashierCategory;
  renderCashierProducts();
};

document.getElementById("productTable").onclick = e => {
  const editButton = e.target.closest("[data-edit-product]");
  const deleteButton = e.target.closest("[data-delete-product]");
  if(editButton) editProduct(editButton.dataset.editProduct);
  if(deleteButton) deleteProduct(deleteButton.dataset.deleteProduct);
};

document.getElementById("openProductForm").onclick = () => {
  openProductForm("add");
  document.getElementById("productFormCard").scrollIntoView({behavior:"smooth",block:"start"});
};
document.getElementById("closeProductForm").onclick = closeProductForm;
document.getElementById("cancelProductForm").onclick = closeProductForm;
document.getElementById("productSearchInput").oninput = e => {
  productSearchQuery = e.target.value;
  productPage = 1;
  renderProducts();
};
document.getElementById("productCategoryFilter").onchange = e => {
  productCategoryFilter = e.target.value;
  productPage = 1;
  renderProducts();
};
document.getElementById("productStockFilter").onchange = e => {
  productStockFilter = e.target.value;
  productPage = 1;
  renderProducts();
};
document.getElementById("productSortSelect").onchange = e => {
  productSortMode = e.target.value;
  productPage = 1;
  renderProducts();
};
document.querySelectorAll("[data-product-view]").forEach(button=>{
  button.onclick = () => {
    productViewMode = button.dataset.productView;
    document.querySelectorAll("[data-product-view]").forEach(item=>item.classList.toggle("active",item===button));
    renderProducts();
  };
});
document.getElementById("productPaginationControls").onclick = e => {
  const button = e.target.closest("[data-product-page]");
  if(!button || button.disabled) return;
  productPage = Number(button.dataset.productPage);
  renderProducts();
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

const recentSalesTable = document.getElementById("recentSales");
if(recentSalesTable) recentSalesTable.onclick = handleReceiptAction;
document.getElementById("reportTable").onclick = e => {
  const focusButton = e.target.closest("[data-report-focus]");
  if(focusButton){
    document.getElementById("reportType").focus();
    return;
  }
  handleReceiptAction(e);
};
document.getElementById("refreshReport").onclick = renderReport;
document.getElementById("dashboardRange").onchange = renderDashboard;
document.getElementById("dashboardChartMetric").onchange = renderSalesChart;
document.getElementById("refreshDashboard").onclick = renderDashboard;
document.querySelectorAll("[data-dashboard-products]").forEach(button=>{
  button.onclick = () => document.querySelector('[data-page="produk"]').click();
});
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
  document.getElementById("productFormCard").hidden = true;
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
    productName:rupiah(amount),
    category:"Manual",
    note,
    qty:1,
    costPrice:0,
    sellPrice:amount
  });
  setSaleMessage(`${rupiah(amount)} ditambahkan ke keranjang.`, "#16a34a");
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
  const cashReceived = 0;
  const change = 0;

  const transactionId = createTransactionId();
  cart.forEach(item=>{
    const revenue = item.sellPrice * item.qty;
    const profit = revenue - (item.costPrice * item.qty);
    const productName = cartItemTitle(item);
    const note = isManualCartItem(item) ? cartItemSubtitle(item) : item.note;
    sales.push({
      id:uid("sale"),
      transactionId,
      productId:item.productId,
      productName,
      category:item.category,
      note,
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
  const cashReceivedInput = document.getElementById("cashReceived");
  if(cashReceivedInput) cashReceivedInput.value = "";
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
document.querySelectorAll("[data-payment-option]").forEach(button=>{
  button.onclick = () => {
    document.getElementById("paymentMethod").value = button.dataset.paymentOption;
    renderPaymentDetails();
  };
});

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
const resetDialog = document.getElementById("resetDialog");
let activeResetType = "products";

const resetMeta = {
  products:{
    title:"Produk",
    help:"Pilih produk tertentu yang ingin dihapus dari katalog.",
    searchPlaceholder:"Cari produk...",
    listId:"resetProductsList",
    countId:"resetProductsCount"
  },
  transactions:{
    title:"Transaksi",
    help:"Pilih nomor transaksi tertentu. Satu nomor transaksi akan menghapus semua item di struk itu.",
    searchPlaceholder:"Cari no invoice, produk, atau metode pembayaran...",
    listId:"resetTransactionsList",
    countId:"resetTransactionsCount"
  },
  cart:{
    title:"Keranjang",
    help:"Pilih item keranjang tertentu yang ingin dihapus.",
    searchPlaceholder:"Cari keranjang...",
    listId:"resetCartList",
    countId:"resetCartCount"
  }
};

document.getElementById("addCartNote").onclick = () => {
  if(cart.length===0){
    setSaleMessage("Keranjang masih kosong.", "#dc2626");
    return;
  }
  const item = cart.at(-1);
  const note = prompt("Tambahkan catatan untuk item terakhir:", item.note || "");
  if(note===null) return;
  item.note = note.trim();
  save();
  renderAll();
};

function resetIcon(name){
  const icons = {
    trash:'<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
    cube:'<svg viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5"/><path d="M12 12v9"/><path d="M8 5.3l8 4.5"/></svg>',
    receipt:'<svg viewBox="0 0 24 24"><path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>',
    cart:'<svg viewBox="0 0 24 24"><path d="M4 5h2l2 10h9l2-7H8"/><path d="M10 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/><path d="M17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>',
    search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>',
    check:'<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/><path d="M4 4h16v16H4z"/></svg>',
    calendar:'<svg viewBox="0 0 24 24"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>',
    qris:'<svg viewBox="0 0 24 24"><path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M14 14h2v2h-2z"/><path d="M18 14h2v6h-6v-2"/><path d="M14 18h2"/></svg>',
    cash:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01"/><path d="M18 15h.01"/></svg>',
    bank:'<svg viewBox="0 0 24 24"><path d="M3 10h18"/><path d="M5 10l7-5 7 5"/><path d="M6 10v8"/><path d="M10 10v8"/><path d="M14 10v8"/><path d="M18 10v8"/><path d="M4 18h16"/></svg>',
    wallet:'<svg viewBox="0 0 24 24"><path d="M4 7h16v12H4z"/><path d="M4 7l3-3h13"/><path d="M16 13h4"/></svg>',
    more:'<svg viewBox="0 0 24 24"><path d="M5 12h.01"/><path d="M12 12h.01"/><path d="M19 12h.01"/></svg>',
    database:'<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
    download:'<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
    upload:'<svg viewBox="0 0 24 24"><path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 3h14"/></svg>',
    sheet:'<svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>',
    shield:'<svg viewBox="0 0 24 24"><path d="M12 3l8 4v5c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/></svg>',
    lock:'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg>',
    list:'<svg viewBox="0 0 24 24"><path d="M8 6h12"/><path d="M8 12h12"/><path d="M8 18h12"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/></svg>',
    trend:'<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 7-8"/><path d="M15 7h5v5"/></svg>',
    bag:'<svg viewBox="0 0 24 24"><path d="M6 8h12l1 13H5L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/><path d="M9 13h.01"/><path d="M15 13h.01"/></svg>',
    refresh:'<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-15.5 6.2"/><path d="M3 12A9 9 0 0 1 18.5 5.8"/><path d="M18 3v4h-4"/><path d="M6 21v-4h4"/></svg>',
    bulb:'<svg viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 14a6 6 0 1 1 8 0c-.8.7-1 1.5-1 2H9c0-.5-.2-1.3-1-2z"/></svg>',
    clipboardSearch:'<svg viewBox="0 0 24 24"><path d="M9 4h6l1 2h3v15H5V6h3l1-2z"/><path d="M9 4h6"/><path d="M9 11h4"/><path d="M9 15h2"/><circle cx="16" cy="15" r="3"/><path d="M18.5 17.5L21 20"/></svg>',
    user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    chevronRight:'<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
    chevronLeft:'<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
    walletCards:'<svg viewBox="0 0 24 24"><path d="M4 8h16v11H4z"/><path d="M7 8V5h12v3"/><path d="M8 13h4"/><path d="M16 15h.01"/></svg>',
    plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    edit:'<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    filter:'<svg viewBox="0 0 24 24"><path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>',
    sort:'<svg viewBox="0 0 24 24"><path d="M7 4v16"/><path d="M4 7l3-3 3 3"/><path d="M17 20V4"/><path d="M14 17l3 3 3-3"/></svg>',
    grid:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>'
  };
  return icons[name] || "";
}

function setupResetIcons(){
  document.getElementById("dataToolsHeaderIcon").innerHTML = resetIcon("database");
  document.getElementById("backupDataIcon").innerHTML = resetIcon("download");
  document.getElementById("restoreDataIcon").innerHTML = resetIcon("upload");
  document.getElementById("exportAllExcelIcon").innerHTML = resetIcon("sheet");
  document.getElementById("adminPinHeaderIcon").innerHTML = resetIcon("shield");
  document.getElementById("currentPinIcon").innerHTML = resetIcon("lock");
  document.getElementById("newPinIcon").innerHTML = resetIcon("lock");
  document.getElementById("confirmPinIcon").innerHTML = resetIcon("lock");
  document.getElementById("resetHeaderIcon").innerHTML = resetIcon("trash");
  document.querySelector('[data-reset-tab-icon="products"]').innerHTML = resetIcon("cube");
  document.querySelector('[data-reset-tab-icon="transactions"]').innerHTML = resetIcon("receipt");
  document.querySelector('[data-reset-tab-icon="cart"]').innerHTML = resetIcon("cart");
  document.getElementById("resetSearchIcon").innerHTML = resetIcon("search");
  document.getElementById("resetCalendarIcon").innerHTML = resetIcon("calendar");
  document.getElementById("resetSelectIcon").innerHTML = resetIcon("check");
  document.getElementById("resetLockIcon").innerHTML = resetIcon("lock");
  document.getElementById("resetFooterIcon").innerHTML = resetIcon("list");
  document.getElementById("resetDeleteIcon").innerHTML = resetIcon("trash");
  document.getElementById("cashierSearchIcon").innerHTML = resetIcon("search");
  document.querySelector('[data-payment-icon="cash"]').innerHTML = resetIcon("cash");
  document.querySelector('[data-payment-icon="qris"]').innerHTML = resetIcon("qris");
  document.querySelector('[data-payment-icon="transfer"]').innerHTML = resetIcon("bank");
  document.querySelector('[data-payment-icon="more"]').innerHTML = resetIcon("more");
  document.getElementById("saveTransactionIcon").innerHTML = resetIcon("receipt");
  document.getElementById("clearCartIcon").innerHTML = resetIcon("trash");
  document.getElementById("reportToolbarCalendarIcon").innerHTML = resetIcon("calendar");
  document.getElementById("reportRefreshIcon").innerHTML = resetIcon("refresh");
  document.getElementById("reportPeriodIcon").innerHTML = resetIcon("calendar");
  document.getElementById("reportTrxIcon").innerHTML = resetIcon("receipt");
  document.getElementById("reportQtyIcon").innerHTML = resetIcon("bag");
  document.getElementById("reportRevenueIcon").innerHTML = resetIcon("cash");
  document.getElementById("reportProfitIcon").innerHTML = resetIcon("trend");
  document.getElementById("reportExportIcon").innerHTML = resetIcon("sheet");
  document.getElementById("reportHintIcon").innerHTML = resetIcon("bulb");
  document.getElementById("dashboardCalendarIcon").innerHTML = resetIcon("calendar");
  document.getElementById("dashboardRefreshIcon").innerHTML = resetIcon("refresh");
  document.getElementById("dashOmzetIcon").innerHTML = resetIcon("walletCards");
  document.getElementById("dashProfitIcon").innerHTML = resetIcon("cash");
  document.getElementById("dashQtyIcon").innerHTML = resetIcon("bag");
  document.getElementById("dashProductIcon").innerHTML = resetIcon("cube");
  document.getElementById("dashboardInventoryIcon").innerHTML = resetIcon("database");
  document.getElementById("dashboardChevronIcon").innerHTML = resetIcon("chevronRight");
  document.getElementById("dashboardGoodNewsIcon").innerHTML = resetIcon("trend");
  document.getElementById("productExportIcon").innerHTML = resetIcon("sheet");
  document.getElementById("productAddIcon").innerHTML = resetIcon("plus");
  document.getElementById("productTotalIcon").innerHTML = resetIcon("cube");
  document.getElementById("productLowStockIcon").innerHTML = resetIcon("filter");
  document.getElementById("productStockValueIcon").innerHTML = resetIcon("cash");
  document.getElementById("productMarginIcon").innerHTML = resetIcon("trend");
  document.getElementById("productSearchIcon").innerHTML = resetIcon("search");
  document.getElementById("productCategoryIcon").innerHTML = resetIcon("filter");
  document.getElementById("productStatusIcon").innerHTML = resetIcon("list");
  document.getElementById("productSortIcon").innerHTML = resetIcon("sort");
  document.getElementById("productGridIcon").innerHTML = resetIcon("grid");
  document.getElementById("productListIcon").innerHTML = resetIcon("list");
}

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

function openResetDialog(){
  if(!adminPinHash){
    alert("Buat PIN Admin terlebih dahulu sebelum menggunakan menu reset.");
    openAdminPinSettings();
    return;
  }
  document.getElementById("resetDataForm").reset();
  setPinMessage("resetDataMessage","","");
  document.getElementById("resetSearchInput").value = "";
  activeResetType = "products";
  renderResetLists();
  resetDialog.showModal();
}

const finishReset = message => {
  save();
  renderAll();
  resetDialog.close();
  alert(message);
};

function transactionSummaries(){
  const byId = new Map();
  sales.forEach(sale=>{
    const id = transactionKey(sale);
    const current = byId.get(id) || {
      id,
      date:sale.date,
      paymentMethod:salePayment(sale),
      itemCount:0,
      qty:0,
      total:0,
      profit:0,
      names:[]
    };
    current.itemCount += 1;
    current.qty += Number(sale.qty||0);
    current.total += Number(sale.revenue||0);
    current.profit += Number(sale.profit||0);
    if(current.names.length<3) current.names.push(sale.productName);
    if(new Date(sale.date) < new Date(current.date)) current.date = sale.date;
    byId.set(id,current);
  });
  return [...byId.values()].sort((a,b)=>new Date(b.date)-new Date(a.date));
}

function paymentKind(method){
  const value = String(method||"").toLowerCase();
  if(value.includes("qris")) return "qris";
  if(value.includes("cash")) return "cash";
  if(value.includes("transfer")) return "transfer";
  if(value.includes("wallet") || value.includes("e-wallet")) return "wallet";
  return "other";
}

function paymentIcon(method){
  const kind = paymentKind(method);
  if(kind==="qris") return resetIcon("qris");
  if(kind==="cash") return resetIcon("cash");
  if(kind==="transfer") return resetIcon("bank");
  if(kind==="wallet") return resetIcon("wallet");
  return resetIcon("receipt");
}

function transactionPeriodMatches(dateValue){
  const filter = document.getElementById("resetTransactionFilter").value;
  if(filter==="all") return true;
  const date = new Date(dateValue);
  if(Number.isNaN(date.getTime())) return false;
  const now = new Date();
  if(filter==="today") return localDateKey(date) === localDateKey(now);
  if(filter==="week"){
    const start = new Date();
    start.setHours(0,0,0,0);
    start.setDate(start.getDate()-6);
    return date >= start && date <= now;
  }
  if(filter==="month") return date.getMonth()===now.getMonth() && date.getFullYear()===now.getFullYear();
  return true;
}

function transactionDateLabel(dateValue){
  const date = new Date(dateValue);
  if(Number.isNaN(date.getTime())) return "-";
  return `${date.toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})} • ${date.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}`;
}

function resetItemInputs(type){
  return [...document.querySelectorAll(`[data-reset-item="${type}"]`)];
}

function visibleResetInputs(type){
  return resetItemInputs(type).filter(input=>!input.closest(".reset-item").hidden);
}

function updateResetCounts(){
  Object.keys(resetMeta).forEach(type=>{
    const items = resetItemInputs(type);
    const checkedCount = items.filter(input=>input.checked).length;
    const count = checkedCount ? `${checkedCount}/${items.length}` : items.length;
    document.getElementById(resetMeta[type].countId).textContent = count;
  });
  updateResetSummary();
}

function updateResetSummary(){
  const totalSelected = Object.keys(resetMeta).reduce((sum,type)=>sum+selectedResetValues(type).length,0);
  const selectedTransactionIds = new Set(selectedResetValues("transactions"));
  const selectedTransactions = transactionSummaries().filter(transaction=>selectedTransactionIds.has(transaction.id));
  const transactionRevenue = selectedTransactions.reduce((sum,transaction)=>sum+transaction.total,0);
  const transactionProfit = selectedTransactions.reduce((sum,transaction)=>sum+transaction.profit,0);
  const transactionCount = selectedTransactions.length;
  const isTransactionTab = activeResetType==="transactions";
  document.getElementById("resetSelectedSummary").textContent = isTransactionTab
    ? `${transactionCount} transaksi dipilih`
    : `${totalSelected} item dipilih`;
  document.querySelector("#resetRevenueSummary strong").textContent = rupiah(transactionRevenue);
  document.querySelector("#resetProfitSummary strong").textContent = rupiah(transactionProfit);
  document.getElementById("resetRevenueSummary").hidden = !isTransactionTab;
  document.getElementById("resetProfitSummary").hidden = !isTransactionTab;
  document.getElementById("resetDeleteButton").querySelector("strong").textContent = isTransactionTab && transactionCount
    ? `Hapus ${transactionCount} Transaksi Terpilih`
    : "Hapus Data Terpilih";
}

function updateResetToolbar(){
  const meta = resetMeta[activeResetType];
  const items = visibleResetInputs(activeResetType);
  const checkedCount = items.filter(input=>input.checked).length;
  const selectButton = document.getElementById("resetSelectVisible");
  const selectText = selectButton.querySelector("strong");
  const periodFilter = document.getElementById("resetPeriodFilterWrap");
  document.getElementById("resetListTitle").textContent = meta.title;
  document.getElementById("resetListHelp").textContent = meta.help;
  document.getElementById("resetSearchInput").placeholder = meta.searchPlaceholder;
  periodFilter.hidden = activeResetType!=="transactions";
  selectButton.disabled = items.length===0;
  selectText.textContent = items.length>0 && checkedCount===items.length ? "Bersihkan" : "Pilih Semua";
  updateResetSummary();
}

function setActiveResetType(type){
  activeResetType = resetMeta[type] ? type : "products";
  document.querySelectorAll("[data-reset-tab]").forEach(button=>{
    button.classList.toggle("active",button.dataset.resetTab===activeResetType);
  });
  Object.entries(resetMeta).forEach(([type,meta])=>{
    document.getElementById(meta.listId).classList.toggle("active",type===activeResetType);
  });
  updateResetToolbar();
}

function applyResetSearch(){
  const query = document.getElementById("resetSearchInput").value.trim().toLowerCase();
  Object.keys(resetMeta).forEach(type=>{
    const rows = [...document.querySelectorAll(`[data-reset-row="${type}"]`)];
    let visibleCount = 0;
    rows.forEach(row=>{
      const matchedQuery = !query || row.dataset.resetSearch.toLowerCase().includes(query);
      const matchedPeriod = type!=="transactions" || transactionPeriodMatches(row.dataset.resetDate);
      const matched = matchedQuery && matchedPeriod;
      row.hidden = !matched;
      if(matched) visibleCount += 1;
    });
    const empty = document.querySelector(`[data-reset-empty="${type}"]`);
    if(empty) empty.hidden = rows.length===0 || visibleCount>0;
  });
  updateResetToolbar();
}

function renderResetList(type, containerId, records, emptyText, rowHtml){
  const container = document.getElementById(containerId);
  if(records.length===0){
    container.innerHTML = `<div class="reset-empty">${emptyText}</div>`;
  } else {
    container.innerHTML = `${records.map(rowHtml).join("")}<div class="reset-empty" data-reset-empty="${type}" hidden>Tidak ada data yang cocok.</div>`;
  }
}

function renderResetLists(){
  renderResetList("products","resetProductsList",products,"Belum ada produk yang bisa dipilih.",product=>`<label class="reset-item reset-product-item" data-reset-row="products" data-reset-search="${escapeHtml(`${product.name} ${productCategory(product)} ${product.sellPrice}`)}">
    <input type="checkbox" data-reset-item="products" value="${escapeHtml(product.id)}" />
    <img class="reset-item-image" src="${productImage(product)}" alt="${escapeHtml(product.name)}" onerror="this.src='${fallbackImage(product.name)}'" />
    <span class="reset-item-main">
      <strong>${escapeHtml(product.name)}</strong>
      <small>Kategori <b>:</b> ${escapeHtml(productCategory(product))}</small>
      <small>Stok <b>:</b> ${stockEnd(product)}</small>
    </span>
    <span class="reset-item-side">
      <strong>${rupiah(product.sellPrice)}</strong>
      <small>Stok tersedia</small>
    </span>
  </label>`);

  renderResetList("transactions","resetTransactionsList",transactionSummaries(),"Belum ada transaksi yang bisa dipilih.",transaction=>`<label class="reset-item reset-transaction-item payment-${paymentKind(transaction.paymentMethod)}" data-reset-row="transactions" data-reset-date="${escapeHtml(transaction.date)}" data-reset-search="${escapeHtml(`${transaction.id} ${transaction.names.join(" ")} ${transaction.paymentMethod} ${new Date(transaction.date).toLocaleString("id-ID")} ${transaction.total}`)}">
    <input type="checkbox" data-reset-item="transactions" value="${escapeHtml(transaction.id)}" />
    <span class="reset-item-symbol">${resetIcon("receipt")}</span>
    <span class="reset-item-main">
      <strong>${escapeHtml(transaction.id)}</strong>
      <small class="reset-transaction-date">${resetIcon("calendar")}${escapeHtml(transactionDateLabel(transaction.date))}</small>
      <small>${transaction.itemCount} Item</small>
    </span>
    <span class="reset-payment-badge">${paymentIcon(transaction.paymentMethod)}${escapeHtml(transaction.paymentMethod)}</span>
    <span class="reset-transaction-metric">
      <small>Omzet</small>
      <strong>${rupiah(transaction.total)}</strong>
    </span>
    <span class="reset-transaction-metric">
      <small>Laba</small>
      <strong>${rupiah(transaction.profit)}</strong>
    </span>
    <span class="reset-transaction-more">${resetIcon("more")}</span>
  </label>`);

  renderResetList("cart","resetCartList",cart,"Keranjang sedang kosong.",item=>`<label class="reset-item reset-data-item" data-reset-row="cart" data-reset-search="${escapeHtml(`${item.productName} ${item.category} ${item.sellPrice}`)}">
    <input type="checkbox" data-reset-item="cart" value="${escapeHtml(item.id)}" />
    <span class="reset-item-symbol">${resetIcon("cart")}</span>
    <span class="reset-item-main">
      <strong>${escapeHtml(item.productName)}</strong>
      <small>${escapeHtml(item.category)} | ${item.qty} x ${rupiah(item.sellPrice)} = ${rupiah(item.qty*item.sellPrice)}</small>
    </span>
  </label>`);

  updateResetCounts();
  setActiveResetType(activeResetType);
  applyResetSearch();
}

function selectedResetValues(type){
  return [...document.querySelectorAll(`[data-reset-item="${type}"]:checked`)].map(input=>input.value);
}

function selectedResetOptions(){
  return {
    productIds:selectedResetValues("products"),
    transactionIds:selectedResetValues("transactions"),
    cartItemIds:selectedResetValues("cart")
  };
}

function resetLabels(options){
  return [
    options.productIds.length ? `${options.productIds.length} produk` : "",
    options.transactionIds.length ? `${options.transactionIds.length} transaksi` : "",
    options.cartItemIds.length ? `${options.cartItemIds.length} item keranjang` : ""
  ].filter(Boolean);
}

document.getElementById("openAdminPinDialog").onclick = openAdminPinSettings;
document.getElementById("closeAdminPinDialog").onclick = closeAdminPinSettings;
document.getElementById("cancelAdminPin").onclick = closeAdminPinSettings;
setupResetIcons();
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

document.getElementById("openResetDialog").onclick = openResetDialog;
document.getElementById("closeResetDialog").onclick = () => resetDialog.close();
document.getElementById("cancelResetData").onclick = () => resetDialog.close();
document.getElementById("resetSelectVisible").onclick = () => {
  const items = visibleResetInputs(activeResetType);
  const allChecked = items.length>0 && items.every(input=>input.checked);
  items.forEach(input=>{
    input.checked = !allChecked;
  });
  updateResetCounts();
  updateResetToolbar();
  setPinMessage("resetDataMessage","","");
};
document.getElementById("resetSearchInput").oninput = () => {
  applyResetSearch();
  setPinMessage("resetDataMessage","","");
};
document.getElementById("resetTransactionFilter").onchange = () => {
  applyResetSearch();
  setPinMessage("resetDataMessage","","");
};
resetDialog.onclick = e => {
  if(e.target===resetDialog) resetDialog.close();
  const tab = e.target.closest("[data-reset-tab]");
  if(tab){
    setActiveResetType(tab.dataset.resetTab);
    setPinMessage("resetDataMessage","","");
  }
};
resetDialog.onchange = e => {
  const resetItem = e.target.closest("[data-reset-item]");
  if(resetItem){
    updateResetCounts();
    updateResetToolbar();
  }
  setPinMessage("resetDataMessage","","");
};

document.getElementById("resetDataForm").onsubmit = async e => {
  e.preventDefault();
  const options = selectedResetOptions();
  const labels = resetLabels(options);
  if(labels.length===0){
    setPinMessage("resetDataMessage","Pilih minimal satu data yang ingin dihapus.","#dc2626");
    return;
  }

  try {
    if(!await verifyAdminPin(document.getElementById("resetAdminPin").value)){
      setPinMessage("resetDataMessage","PIN Admin salah.","#dc2626");
      return;
    }
  } catch {
    setPinMessage("resetDataMessage","PIN gagal diverifikasi pada browser ini.","#dc2626");
    return;
  }

  if(!confirm(`Yakin hapus data ${labels.join(", ")}? Data yang tidak dipilih tetap tersimpan.`)) return;

  const productIds = new Set(options.productIds);
  const transactionIds = new Set(options.transactionIds);
  const cartItemIds = new Set(options.cartItemIds);

  if(cartItemIds.size) cart = cart.filter(item=>!cartItemIds.has(item.id));
  if(productIds.size){
    products = products.filter(product=>!productIds.has(product.id));
    cart = cart.map(item=>productIds.has(item.productId) ? {...item,productId:null} : item);
  }
  if(transactionIds.size) sales = sales.filter(sale=>!transactionIds.has(transactionKey(sale)));

  finishReset(`Data ${labels.join(", ")} berhasil dihapus.`);
};

renderAll();
// setTimeout(downloadBackup,0);
