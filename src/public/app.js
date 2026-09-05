// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', (e) => {
    const tabName = e.target.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    e.target.classList.add('active');
  });
});

// Fetch and render products
async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Failed to fetch products');
    const products = await response.json();
    renderProductsList(products);
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function renderProductsList(products) {
  const list = document.getElementById('products-list');
  if (products.length === 0) {
    list.innerHTML = '<p>No products yet. Add one to get started!</p>';
    return;
  }

  list.innerHTML = products.map(product => `
    <div class="product-item">
      <div class="product-header">
        <span class="product-name">${escapeHtml(product.name)}</span>
        <div class="product-actions">
          <button class="edit-btn" onclick="editProduct('${product.id}')">Edit</button>
          <button class="delete-btn" onclick="deleteProduct('${product.id}')">Delete</button>
        </div>
      </div>
      <div class="properties-section" id="properties-${product.id}" style="display: none;">
        ${product.properties && product.properties.length > 0 ? `
          <div class="properties-list">
            ${product.properties.map(prop => `
              <div class="property-item">
                <span>${escapeHtml(prop.name)}</span>
                <button class="delete-btn" onclick="deleteProperty('${prop.id}')">Delete</button>
                ${prop.values && prop.values.length > 0 ? `
                  <div class="values-list">
                    ${prop.values.map(v => `
                      <div class="value-item">${escapeHtml(v.value)}</div>
                    `).join('')}
                  </div>
                ` : '<p>No values yet</p>'}
              </div>
            `).join('')}
          </div>
        ` : '<p>No properties yet</p>'}
        <button class="add-btn" onclick="addProperty('${product.id}')">+ Add Property</button>
      </div>
      <button class="toggle-btn" onclick="toggleProperties('${product.id}')">Show Properties</button>
    </div>
  `).join('');
}

function toggleProperties(productId) {
  const section = document.getElementById(`properties-${productId}`);
  const btn = event.target;
  if (section.style.display === 'none') {
    section.style.display = 'block';
    btn.textContent = 'Hide Properties';
  } else {
    section.style.display = 'none';
    btn.textContent = 'Show Properties';
  }
}

// Add product
document.getElementById('add-product-btn').addEventListener('click', async () => {
  const nameInput = document.getElementById('product-name');
  const errorDiv = document.getElementById('product-error');
  const name = nameInput.value.trim();

  errorDiv.textContent = '';

  if (!name) {
    errorDiv.textContent = 'Product name is required';
    return;
  }

  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      const error = await response.json();
      errorDiv.textContent = error.error || 'Failed to create product';
      return;
    }

    nameInput.value = '';
    await loadProducts();
  } catch (error) {
    console.error('Error creating product:', error);
    errorDiv.textContent = 'Error creating product';
  }
});

// Edit product
async function editProduct(productId) {
  const newName = prompt('Enter new product name:');
  if (!newName) return;

  try {
    const response = await fetch(`/api/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Failed to update product');
      return;
    }

    await loadProducts();
  } catch (error) {
    console.error('Error updating product:', error);
    alert('Error updating product');
  }
}

// Delete product
async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    const response = await fetch(`/api/products/${productId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Failed to delete product');
      return;
    }

    await loadProducts();
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Error deleting product');
  }
}

// Add property (placeholder)
function addProperty(productId) {
  alert('Property management UI coming soon');
}

// Delete property (placeholder)
function deleteProperty(propertyId) {
  alert('Property deletion coming soon');
}

// Utility: escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load products on page load
loadProducts();
