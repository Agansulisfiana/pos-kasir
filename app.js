const rupiah = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0);
let products = JSON.parse(localStorage.getItem("pos_products")) || [];
let sales = JSON.parse(localStorage.getItem("pos_sales")) || [];

const save = () => {
  localStorage.setItem("pos_products", JSON.stringify(products));
  localStorage.setItem("pos_sales", JSON.stringify(sales));
};

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#039;"
}[char]));

const soldQty = id => sales.filter(s=>s.productId===id).reduce((a,b)=>a+b.qty,0);
const stockEnd = p => p.stockStart - soldQty(p.id);
const profitPerItem = p => p.sellPrice - p.costPrice;

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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" rx="18" fill="#fff1e8"/><circle cx="45" cy="36" r="22" fill="#ff7a3d" opacity=".22"/><circle cx="112" cy="80" r="30" fill="#14b8a6" opacity=".2"/><text x="80" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#ff5a1f">${initials}</text></svg>`;
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
  box.textContent = `${selected.name} - ${rupiah(selected.sellPrice)} - Stok ${stockEnd(selected)}`;
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
    const remaining = stockEnd(p);
    return `<button class="product-tile ${isActive ? "active" : ""}" type="button" data-product-id="${escapeHtml(p.id)}">
      <img src="${productImage(p)}" alt="${escapeHtml(p.name)}" onerror="this.src='${fallbackImage(p.name)}'" />
      <span class="product-name">${escapeHtml(p.name)}</span>
      <strong>${rupiah(p.sellPrice)}</strong>
      <small>Stok ${remaining}</small>
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
      const week = new Date(); week.setDate(now.getDate()-7);
      return d >= week && d <= now;
    }
    if(type==="monthly") return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    return true;
  });
}

function renderProducts(){
  const body = document.getElementById("productTable");
  body.innerHTML = "";

  if(products.length===0){
    body.innerHTML = '<tr><td colspan="9">Belum ada produk.</td></tr>';
  }

  products.forEach(p=>{
    body.innerHTML += `<tr>
      <td><img class="table-image" src="${productImage(p)}" alt="${escapeHtml(p.name)}" onerror="this.src='${fallbackImage(p.name)}'" /></td>
      <td>${escapeHtml(p.name)}</td>
      <td>${rupiah(p.costPrice)}</td>
      <td>${rupiah(p.sellPrice)}</td>
      <td>${rupiah(profitPerItem(p))}</td>
      <td>${p.stockStart}</td>
      <td>${soldQty(p.id)}</td>
      <td><b>${stockEnd(p)}</b></td>
      <td><div class="action">
        <button class="btn edit" onclick="editProduct('${p.id}')">Edit</button>
        <button class="btn delete" onclick="deleteProduct('${p.id}')">Hapus</button>
      </div></td>
    </tr>`;
  });

  const selected = products.find(p=>p.id===selectedProductId());
  if(!selected) document.getElementById("saleProduct").value = "";

  document.getElementById("dashProduct").textContent = products.length;
  renderCashierProducts();
}

function renderDashboard(){
  const today = filterSales("daily");
  document.getElementById("dashOmzet").textContent = rupiah(today.reduce((a,b)=>a+b.revenue,0));
  document.getElementById("dashProfit").textContent = rupiah(today.reduce((a,b)=>a+b.profit,0));
  document.getElementById("dashQty").textContent = today.reduce((a,b)=>a+b.qty,0);

  const recent = document.getElementById("recentSales");
  recent.innerHTML = "";
  sales.slice().reverse().slice(0,8).forEach(s=>{
    recent.innerHTML += `<tr>
      <td>${new Date(s.date).toLocaleString("id-ID")}</td>
      <td>${escapeHtml(s.productName)}</td>
      <td>${escapeHtml(s.note || "-")}</td>
      <td>${s.qty}</td>
      <td>${rupiah(s.revenue)}</td>
      <td>${rupiah(s.profit)}</td>
    </tr>`;
  });
  if(sales.length===0) recent.innerHTML = '<tr><td colspan="6">Belum ada transaksi.</td></tr>';
}

function renderReport(){
  const type = document.getElementById("reportType").value;
  const data = filterSales(type);
  document.getElementById("reportTrx").textContent = data.length;
  document.getElementById("reportQty").textContent = data.reduce((a,b)=>a+b.qty,0);
  document.getElementById("reportRevenue").textContent = rupiah(data.reduce((a,b)=>a+b.revenue,0));
  document.getElementById("reportProfit").textContent = rupiah(data.reduce((a,b)=>a+b.profit,0));

  const body = document.getElementById("reportTable");
  body.innerHTML = "";
  if(data.length===0){
    body.innerHTML = '<tr><td colspan="8">Belum ada transaksi pada periode ini.</td></tr>';
    return;
  }
  data.slice().reverse().forEach(s=>{
    body.innerHTML += `<tr>
      <td>${new Date(s.date).toLocaleString("id-ID")}</td>
      <td>${escapeHtml(s.productName)}</td>
      <td>${escapeHtml(s.note || "-")}</td>
      <td>${s.qty}</td>
      <td>${rupiah(s.costPrice)}</td>
      <td>${rupiah(s.sellPrice)}</td>
      <td>${rupiah(s.revenue)}</td>
      <td>${rupiah(s.profit)}</td>
    </tr>`;
  });
}

function renderAll(){
  renderProducts();
  renderDashboard();
  renderReport();
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

document.getElementById("productForm").onsubmit = async e => {
  e.preventDefault();
  const id = document.getElementById("editId").value;
  const name = document.getElementById("productName").value.trim();
  const costPrice = Number(document.getElementById("costPrice").value);
  const sellPrice = Number(document.getElementById("sellPrice").value);
  const imageUrlInput = document.getElementById("imageUrl").value.trim();
  const imageFile = document.getElementById("imageFile").files[0];
  const uploadedImage = await readImageFile(imageFile);
  const stockStart = Number(document.getElementById("stockStart").value);

  if(id){
    const p = products.find(x=>x.id===id);
    const imageUrl = uploadedImage || imageUrlInput || p.imageUrl || "";
    Object.assign(p,{name,costPrice,sellPrice,imageUrl,stockStart});
  } else {
    const imageUrl = uploadedImage || imageUrlInput;
    products.push({id:Date.now().toString(),name,costPrice,sellPrice,imageUrl,stockStart});
  }

  e.target.reset();
  document.getElementById("editId").value = "";
  save(); renderAll();
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

  if(qty > stockEnd(p)){
    setSaleMessage("Stok tidak cukup.", "#dc2626");
    return;
  }

  const revenue = p.sellPrice * qty;
  const costTotal = p.costPrice * qty;
  const profit = revenue - costTotal;

  sales.push({
    id:Date.now().toString(),
    productId:p.id,
    productName:p.name,
    note,
    qty,
    costPrice:p.costPrice,
    sellPrice:p.sellPrice,
    revenue,
    profit,
    date:new Date().toISOString()
  });

  setSaleMessage(`Transaksi berhasil. Total ${rupiah(revenue)}, laba ${rupiah(profit)}.`, "#16a34a");
  document.getElementById("saleQty").value = 1;
  document.getElementById("saleNote").value = "";
  save(); renderAll();
};

document.getElementById("manualForm").onsubmit = e => {
  e.preventDefault();
  const amount = Number(document.getElementById("manualAmount").value);
  const note = document.getElementById("manualNote").value.trim();

  if(amount <= 0 || !note){
    setSaleMessage("Nominal dan keterangan manual wajib diisi.", "#dc2626");
    return;
  }

  sales.push({
    id:Date.now().toString(),
    productId:null,
    productName:"Nominal Manual",
    note,
    qty:1,
    costPrice:0,
    sellPrice:amount,
    revenue:amount,
    profit:amount,
    date:new Date().toISOString()
  });

  setSaleMessage(`Nominal manual berhasil ditambahkan. Total ${rupiah(amount)}.`, "#16a34a");
  e.target.reset();
  save(); renderAll();
};

function editProduct(id){
  const p = products.find(x=>x.id===id);
  document.getElementById("editId").value = p.id;
  document.getElementById("productName").value = p.name;
  document.getElementById("costPrice").value = p.costPrice;
  document.getElementById("sellPrice").value = p.sellPrice;
  document.getElementById("imageUrl").value = p.imageUrl && !p.imageUrl.startsWith("data:") ? p.imageUrl : "";
  document.getElementById("stockStart").value = p.stockStart;
  document.querySelector('[data-page="produk"]').click();
}

function deleteProduct(id){
  if(!confirm("Hapus produk dan transaksi terkait?")) return;
  products = products.filter(p=>p.id!==id);
  sales = sales.filter(s=>s.productId!==id);
  save(); renderAll();
}

function exportCSV(filename, rows){
  const csv = rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("exportProduct").onclick = () => {
  const rows = [["Produk","Harga Modal","Harga Jual","Margin","Stok Awal","Terjual","Stok Akhir"]];
  products.forEach(p=>rows.push([p.name,p.costPrice,p.sellPrice,profitPerItem(p),p.stockStart,soldQty(p.id),stockEnd(p)]));
  exportCSV("produk-pos.csv", rows);
};

document.getElementById("exportReport").onclick = () => {
  const data = filterSales(document.getElementById("reportType").value);
  const rows = [["Tanggal","Produk","Keterangan","Qty","Modal","Jual","Omzet","Laba"]];
  data.forEach(s=>rows.push([new Date(s.date).toLocaleString("id-ID"),s.productName,s.note || "-",s.qty,s.costPrice,s.sellPrice,s.revenue,s.profit]));
  exportCSV("laporan-penjualan.csv", rows);
};

document.getElementById("reportType").onchange = renderReport;

document.getElementById("resetData").onclick = () => {
  if(confirm("Yakin hapus semua data?")){
    products=[]; sales=[]; save(); renderAll();
  }
};

renderAll();
