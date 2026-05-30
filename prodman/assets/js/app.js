'use strict';

const API  = 'backend/api/products.php';
const CATS = ['All','Electronics','Footwear','Accessories','Appliances','Clothing','Food','Other'];

let allProducts = [];
let filtered    = [];
let activeCat   = 'All';
let editingId   = null;
let deleteId    = null;

document.addEventListener('DOMContentLoaded', () => {
  buildPills();
  loadProducts();
  bindOverlayClose();
  bindDeleteBtn();

  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.target.value = ''; applyFilters(); }
  });

  const zone = document.getElementById('uploadZone');
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', ()  => zone.classList.remove('drag'));
  zone.addEventListener('drop',      handleDrop);
});

function bindOverlayClose() {
  ['formOv','detOv','confOv'].forEach(id => {
    document.getElementById(id).addEventListener('click', function(e) {
      if (e.target !== this) return;
      if (id === 'formOv') closeForm();
      else if (id === 'detOv') closeDet();
      else closeConf();
    });
  });
}

// Bind delete button ONCE at startup — avoids stale onclick overwrites
function bindDeleteBtn() {
  document.getElementById('btnDel').addEventListener('click', doDelete);
}

async function apiFetch(method, body, id) {
  let url = API;
  const params = new URLSearchParams();
  if (id) params.set('id', id);

  let httpMethod = method;
  if (method === 'PUT' || method === 'DELETE') {
    httpMethod = 'POST';
    params.set('_method', method);
  }

  if (params.toString()) url += '?' + params.toString();

  const opts = { method: httpMethod };

  if (body instanceof FormData) {
    opts.body = body;
  } else if (body && typeof body === 'object') {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body    = JSON.stringify(body);
  } else if (method === 'DELETE') {
    opts.body = new FormData();
  }

  const r = await fetch(url, opts);
  const j = await r.json();
  if (j.status === 'error') throw new Error(j.message);
  return j.data;
}

async function loadProducts() {
  setGrid(`<div class="state"><div class="spinner"></div></div>`);
  try {
    allProducts = await apiFetch('GET');
    applyFilters();
  } catch (e) {
    setGrid(`<div class="state"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg><p class="state-t">Cannot connect</p><p class="state-s">Make sure XAMPP is running</p><button class="btn-save" style="margin-top:8px;max-width:140px;padding:10px" onclick="loadProducts()">Retry</button></div>`);
  }
}

function setGrid(html) { document.getElementById('grid').innerHTML = html; }

function applyFilters() {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  filtered = allProducts.filter(p => {
    const ms = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    const mc = activeCat === 'All' || p.category === activeCat;
    return ms && mc;
  });
  renderGrid();
  document.getElementById('sumCt').textContent = `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;
  document.getElementById('clrBtn').style.display = (q || activeCat !== 'All') ? 'inline' : 'none';
}

function clearFilters() {
  document.getElementById('searchInput').value = '';
  activeCat = 'All';
  buildPills();
  applyFilters();
}

function buildPills() {
  document.getElementById('catPills').innerHTML = CATS.map(c =>
    `<button class="pill${c === activeCat ? ' active' : ''}" onclick="setCat('${c}')">${c}</button>`
  ).join('');
}

function setCat(c) { activeCat = c; buildPills(); applyFilters(); }

function renderGrid() {
  if (!filtered.length) {
    setGrid(`<div class="state"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z"/></svg><p class="state-t">No products found</p><p class="state-s">Try a different keyword or filter.</p></div>`);
    return;
  }
  document.getElementById('grid').innerHTML = filtered.map(cardHTML).join('');
}

function cardHTML(p) {
  const src   = p.image_url || '';
  const stock = parseInt(p.stock);
  const [sc, sl] = stock === 0 ? ['so', 'Out of stock'] : stock <= 5 ? ['sl', 'Low: ' + stock] : ['si', stock + ' in stock'];

  const imgBlock = src
    ? `<div class="card-img-inner"><img src="${esc(src)}" alt="${esc(p.name)}" loading="lazy" onerror="imgFallback(this)"/></div>`
    : `<div class="card-img-inner"><div class="card-img-ph"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg><span>No image</span></div></div>`;

  // Use data-id attribute instead of inline JS with JSON.stringify to avoid apostrophe bugs
  return `<article class="card" onclick="openDet(${p.id})">
    <div class="card-img">${imgBlock}</div>
    <div class="card-body">
      <div class="card-top">
        <span class="cat-tag cat-${esc(p.category)}">${esc(p.category)}</span>
        <span class="sbadge ${sc}">${sl}</span>
      </div>
      <h3 class="card-name">${esc(p.name)}</h3>
      <p class="card-desc">${esc(p.description)}</p>
      <div class="card-price">₱${(+p.price).toLocaleString('en-PH',{minimumFractionDigits:2})}</div>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="btn-e" onclick="openEdit(${p.id})">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          Edit
        </button>
        <button class="btn-d" data-id="${p.id}" onclick="askDel(this)">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          Delete
        </button>
      </div>
    </div>
  </article>`;
}

function imgFallback(img) {
  const inner = img.closest('.card-img-inner');
  if (!inner) return;
  const ph = document.createElement('div');
  ph.className = 'card-img-ph';
  ph.innerHTML = `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909"/></svg><span>Image unavailable</span>`;
  img.replaceWith(ph);
}

/* ─── Image Upload Zone ─────────────────────────────────── */

function onFileSelected(input) {
  const file = input.files[0];
  if (!file) return;
  showImagePreview(URL.createObjectURL(file), file.name);
}

function showImagePreview(src, name) {
  const preview   = document.getElementById('imgPreview');
  const ph        = document.getElementById('uploadPh');
  const removeBar = document.getElementById('imgRemoveBar');
  const imgNameEl = document.getElementById('imgName');

  preview.src             = src;
  preview.style.display   = 'block';
  ph.style.display        = 'none';
  removeBar.style.display = 'flex';
  if (imgNameEl) imgNameEl.textContent = name || '';
}

function clearImage() {
  const preview   = document.getElementById('imgPreview');
  const ph        = document.getElementById('uploadPh');
  const removeBar = document.getElementById('imgRemoveBar');
  const fileInput = document.getElementById('imgFile');

  preview.src             = '';
  preview.style.display   = 'none';
  ph.style.display        = 'flex';
  removeBar.style.display = 'none';
  fileInput.value         = '';
  document.getElementById('fImgUrl').value = '';
}

function resetUploadZone(url) {
  const preview   = document.getElementById('imgPreview');
  const ph        = document.getElementById('uploadPh');
  const removeBar = document.getElementById('imgRemoveBar');

  document.getElementById('imgFile').value = '';
  document.getElementById('fImgUrl').value = url || '';

  if (url) {
    showImagePreview(url, 'Current image');
  } else {
    preview.src             = '';
    preview.style.display   = 'none';
    ph.style.display        = 'flex';
    removeBar.style.display = 'none';
  }
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('drag');
  const files = e.dataTransfer.files;
  if (!files.length) return;
  const dt = new DataTransfer();
  dt.items.add(files[0]);
  const input = document.getElementById('imgFile');
  input.files = dt.files;
  onFileSelected(input);
}

/* ─── Form Open/Close ───────────────────────────────────── */

function openAdd() {
  editingId = null;
  setFormMode(false);
  clearFormFields();
  document.getElementById('formOv').classList.add('open');
}

function openEdit(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  setFormMode(true);
  fillFormFields(p);
  document.getElementById('formOv').classList.add('open');
}

function closeForm() {
  document.getElementById('formOv').classList.remove('open');
  clearErrors();
}

function setFormMode(isEdit) {
  document.getElementById('mtitle').textContent  = isEdit ? 'Edit Product' : 'Add Product';
  document.getElementById('btnSave').textContent = isEdit ? 'Save Changes' : 'Add Product';
  const ic = document.getElementById('micon');
  ic.className = 'micon ' + (isEdit ? 'edit' : 'add');
  ic.innerHTML = isEdit
    ? `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`
    : `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 4v16m8-8H4"/></svg>`;
}

function clearFormFields() {
  ['fName','fDesc','fPrice','fStock'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fCat').value = '';
  resetUploadZone('');
}

function fillFormFields(p) {
  document.getElementById('fName').value  = p.name;
  document.getElementById('fDesc').value  = p.description;
  document.getElementById('fPrice').value = (+p.price).toFixed(2);
  document.getElementById('fStock').value = p.stock;
  document.getElementById('fCat').value   = p.category;
  resetUploadZone(p.image_url || '');
}

function clearErrors() {
  [['fName','eName'],['fDesc','eDesc'],['fPrice','ePrice'],['fStock','eStock'],['fCat','eCat']].forEach(([fi, ei]) => {
    document.getElementById(ei).textContent = '';
    document.getElementById(fi).classList.remove('err');
  });
}

function validate() {
  clearErrors();
  let ok = true;
  [['fName','eName','Name'],['fDesc','eDesc','Description'],['fPrice','ePrice','Price'],['fStock','eStock','Stock'],['fCat','eCat','Category']].forEach(([fi, ei, lbl]) => {
    if (!document.getElementById(fi).value.trim()) {
      document.getElementById(ei).textContent = `${lbl} is required`;
      document.getElementById(fi).classList.add('err');
      ok = false;
    }
  });
  return ok;
}

async function submitForm() {
  if (!validate()) return;
  const btn = document.getElementById('btnSave');
  btn.disabled    = true;
  btn.textContent = 'Saving…';

  try {
    const fd = new FormData();
    fd.append('name',        document.getElementById('fName').value.trim());
    fd.append('description', document.getElementById('fDesc').value.trim());
    fd.append('price',       document.getElementById('fPrice').value);
    fd.append('stock',       document.getElementById('fStock').value);
    fd.append('category',    document.getElementById('fCat').value);

    const imgFile = document.getElementById('imgFile').files[0];
    if (imgFile) {
      fd.append('image', imgFile);
    } else {
      fd.append('image_url', document.getElementById('fImgUrl').value);
    }

    if (editingId) {
      await apiFetch('PUT', fd, editingId);
      toast('Product updated successfully!', 'success');
    } else {
      await apiFetch('POST', fd);
      toast('Product added successfully!', 'success');
    }

    closeForm();
    await loadProducts();
  } catch (e) {
    toast(e.message || 'Something went wrong.', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = editingId ? 'Save Changes' : 'Add Product';
  }
}

/* ─── Detail Modal ──────────────────────────────────────── */

function openDet(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;

  const stock = parseInt(p.stock);
  const [sc, sl] = stock === 0 ? ['so','Out of stock'] : stock <= 5 ? ['sl','Low stock: '+stock] : ['si', stock + ' in stock'];

  const src = p.image_url || '';
  const imgSection = src
    ? `<div class="det-img-wrap"><img src="${esc(src)}" alt="${esc(p.name)}" onerror="this.style.display='none'"/></div>`
    : `<div class="det-img-wrap"><div class="det-img-ph"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"/></svg></div></div>`;

  document.getElementById('detBody').innerHTML = `${imgSection}
    <div class="det-meta">
      <span class="cat-tag cat-${esc(p.category)}">${esc(p.category)}</span>
      <span style="font-size:12px;color:var(--text3)">ID #${p.id}</span>
    </div>
    <h2 class="det-name">${esc(p.name)}</h2>
    <p class="det-desc">${esc(p.description)}</p>
    <div class="det-stats">
      <div class="det-stat"><label>Price</label><div class="dval price">₱${(+p.price).toLocaleString('en-PH',{minimumFractionDigits:2})}</div></div>
      <div class="det-stat"><label>Stock</label><div style="margin-top:4px"><span class="sbadge ${sc}" style="font-size:13px;padding:5px 14px">${sl}</span></div></div>
    </div>`;

  document.getElementById('detEdit').onclick = () => { closeDet(); openEdit(id); };
  document.getElementById('detOv').classList.add('open');
}

function closeDet() { document.getElementById('detOv').classList.remove('open'); }

/* ─── Delete Confirm ────────────────────────────────────── */

// Called from card button — reads id from data-id attribute
function askDel(btn) {
  deleteId = parseInt(btn.dataset.id);
  const p = allProducts.find(x => x.id === deleteId);
  document.getElementById('confTxt').textContent = `"${p ? p.name : 'This product'}" will be permanently deleted.`;
  document.getElementById('confOv').classList.add('open');
}

function closeConf() { document.getElementById('confOv').classList.remove('open'); }

async function doDelete() {
  if (!deleteId) return;
  const btn = document.getElementById('btnDel');
  btn.disabled    = true;
  btn.textContent = 'Deleting…';
  try {
    await apiFetch('DELETE', null, deleteId);
    closeConf();
    deleteId = null;
    toast('Product deleted.', 'success');
    await loadProducts();
  } catch (e) {
    toast(e.message || 'Delete failed.', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Yes, Delete';
  }
}

/* ─── Toast ─────────────────────────────────────────────── */

function toast(msg, type = 'success') {
  const icons = {
    success: `<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M5 13l4 4L19 7"/></svg>`,
    error:   `<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icons[type] || ''}<span>${esc(msg)}</span>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}