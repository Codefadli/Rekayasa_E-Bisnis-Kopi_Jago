// Admin Products Management - Jago Coffee
// Full product management with CRUD operations

let allProducts = [];

async function loadProducts() {
    try {
        KJComponents.showLoading('products-table-content');
        const response = await kjRequest('products', { method: 'GET' });
        allProducts = response.data || [];
        renderProducts();
        updateProductsCount();
        KJComponents.hideLoading('products-table-content');
    } catch (error) {
        console.error('[Products] Failed to load:', error);
        document.getElementById('products-table-content').innerHTML = `
            <div class="admin-empty">
                <h3>Failed to Load Products</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadProducts()">Retry</button>
            </div>
        `;
    }
}

function renderProducts() {
    const container = document.getElementById('products-table-content');
    if (!container) return;
    
    const filtered = allProducts.filter(p => 
        currentFilter === 'all' || 
        (currentFilter === 'active' && p.is_active) || 
        (currentFilter === 'inactive' && !p.is_active)
    );
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                <h3>No Products Found</h3>
                <p>No products match the selected filter.</p>
            </div>
        `;
        return;
    }
    
    const rows = filtered.map(product => `
        <tr>
            <td>${escapeHtml(product.name)}</td>
            <td>${product.category}</td>
            <td>${product.price}</td>
            <td>${product.stock}</td>
            <td>${product.is_active ? '✅ Aktif' : '❌ Tidak Aktif'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewProduct(${product.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">Delete</button>
            </td>
        </tr>
    `).join('');
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nama Produk</th>
                    <th>Kategori</th>
                    <th>Harga</th>
                    <th>Stok</th>
                    <th>Status</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

async function viewProduct(productId) {
    try {
        const response = await kjRequest(`products/${productId}`, { method: 'GET' });
        const product = response.data;
        
        document.getElementById('modal-content').innerHTML = `
            <div class="modal-header">
                <h2 style="margin: 0;">Edit Produk: ${escapeHtml(product.name)}</h2>
                <button class="modal-close" onclick="closeProductModal()">×</button>
            </div>
            
            <form id="product-form">
                <div class="form-group">
                    <label>Nama Produk</label>
                    <input type="text" name="name" value="${escapeHtml(product.name)}" required class="input-field">
                </div>
                
                <div class="form-group">
                    <label>Kategori</label>
                    <input type="text" name="category" value="${escapeHtml(product.category)}" class="input-field">
                </div>
                
                <div class="form-group">
                    <label>Harga</label>
                    <input type="number" name="price" value="${product.price}" required class="input-field">
                </div>
                
                <div class="form-group">
                    <label>Stok Awal</label>
                    <input type="number" name="stock" value="${product.stock}" required class="input-field">
                </div>
                
                <div class="form-group">
                    <label>Status</label>
                    <select name="is_active" ${product.is_active ? 'disabled' : ''}>
                        <option value="true" ${product.is_active ? 'selected' : ''}>Aktif</option>
                        <option value="false" ${product.is_active ? '' : 'selected'}>Tidak Aktif</option>
                    </select>
                </div>
                
                <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
                <button type="button" class="btn btn-secondary" onclick="closeProductModal()">Batal</button>
            </form>
        `;
        document.getElementById('modal').classList.add('show');
    } catch (error) {
        console.error('[Products] Failed to load product:', error);
        KJToast.error('Gagal memuat detail produk');
    }
}

async function saveProduct(formData) {
    try {
        const product = {
            id: formData.id || null,
            name: formData.name,
            category: formData.category,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
            is_active: formData.is_active === 'true',
            // Additional fields could be added here
        };
        
        if (formData.id) {
            await kjRequest(`products/${formData.id}`, { 
                method: 'PUT', 
                body: JSON.stringify(product) 
            });
        } else {
            await kjRequest('products', { 
                method: 'POST', 
                body: JSON.stringify(product) 
            });
        }
        
        const msg = formData.id ? 'Produk berhasil diupdate!' : 'Produk berhasil dibuat!';
        KJToast.success(msg);
        await loadProducts();
        closeProductModal();
    } catch (error) {
        console.error('[Products] Save failed:', error);
        KJToast.error('Gagal menyimpan produk');
    }
}

function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            kjRequest(`products/${productId}`, { 
                method: 'DELETE' 
            });
            KJToast.success('Produk dihapus!');
            loadProducts();
        } catch (error) {
            console.error('[Products] Delete failed:', error);
            KJToast.error('Gagal menghapus produk');
        }
    }
}

function updateProductsCount() {
    const filtered = allProducts.filter(p => 
        currentFilter === 'all' || 
        (currentFilter === 'active' && p.is_active) || 
        (currentFilter === 'inactive' && !p.is_active)
    );
    const countEl = document.getElementById('products-count');
    if (countEl) {
        countEl.textContent = `${filtered.length} produk${filtered.length !== 1 ? 's' : ''}`;
    }
}

function initFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Re-render
            renderProducts();
            updateProductsCount();
        });
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initFilterButtons();
    loadProducts();
});

// Escape HTML for security
function escapeHtml(text) {
    const map = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#039;'
    };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

// Close product modal
function closeProductModal() {
    document.getElementById('modal').classList.remove('show');
    document.getElementById('product-form').reset();
}