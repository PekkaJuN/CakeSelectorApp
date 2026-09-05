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

// ============ ORDER BUILDER ============

let cart = []; // In-memory cart

// Initialize order builder on tab switch
document.addEventListener('DOMContentLoaded', () => {
  const orderBuilderTab = document.getElementById('order-builder-tab');
  if (orderBuilderTab) {
    initOrderBuilder();
  }
});

async function initOrderBuilder() {
  // Populate product dropdown
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Failed to fetch products');
    const products = await response.json();

    const productSelect = document.getElementById('product-select');
    products.forEach(product => {
      const option = document.createElement('option');
      option.value = product.id;
      option.textContent = product.name;
      productSelect.appendChild(option);
    });

    // Product selection handler
    productSelect.addEventListener('change', async (e) => {
      const productId = e.target.value;
      const propertiesContainer = document.getElementById('properties-container');

      if (!productId) {
        propertiesContainer.style.display = 'none';
        propertiesContainer.innerHTML = '';
        return;
      }

      // Fetch properties for selected product
      try {
        const propResponse = await fetch(`/api/products/${productId}/properties`);
        if (!propResponse.ok) throw new Error('Failed to fetch properties');
        const properties = await propResponse.json();

        if (properties.length === 0) {
          propertiesContainer.style.display = 'none';
          propertiesContainer.innerHTML = '';
          return;
        }

        propertiesContainer.style.display = 'block';
        propertiesContainer.innerHTML = '';

        for (const property of properties) {
          const group = document.createElement('div');
          group.className = 'form-group';

          const label = document.createElement('label');
          label.textContent = property.name + ':';
          label.htmlFor = `prop-${property.id}`;

          const select = document.createElement('select');
          select.id = `prop-${property.id}`;
          select.dataset.propertyId = property.id;
          select.dataset.propertyName = property.name;

          const defaultOption = document.createElement('option');
          defaultOption.value = '';
          defaultOption.textContent = `-- Select ${property.name} --`;
          select.appendChild(defaultOption);

          // Fetch values for property
          const valuesResponse = await fetch(`/api/properties/${property.id}/values`);
          if (valuesResponse.ok) {
            const values = await valuesResponse.json();
            values.forEach(v => {
              const option = document.createElement('option');
              option.value = v.id;
              option.textContent = v.value;
              select.appendChild(option);
            });
          }

          group.appendChild(label);
          group.appendChild(select);
          propertiesContainer.appendChild(group);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
      }
    });
  } catch (error) {
    console.error('Error initializing order builder:', error);
  }
}

// Add item to cart
document.getElementById('add-item-btn').addEventListener('click', () => {
  const productSelect = document.getElementById('product-select');
  const productId = productSelect.value;
  const errorDiv = document.getElementById('order-error');

  errorDiv.textContent = '';

  if (!productId) {
    errorDiv.textContent = 'Product is required';
    return;
  }

  // Get property selections
  const propertySelects = document.querySelectorAll('#properties-container select');
  const selections = {};
  let isValid = true;

  propertySelects.forEach(select => {
    const propertyId = select.dataset.propertyId;
    const value = select.value;

    if (!value) {
      isValid = false;
      const productName = productSelect.options[productSelect.selectedIndex].text;
      errorDiv.textContent = `All properties must be selected for ${productName}`;
    }

    selections[propertyId] = select.value;
  });

  if (!isValid) return;

  // Add to cart
  const item = {
    id: uuidv4(),
    productId,
    productName: productSelect.options[productSelect.selectedIndex].text,
    selections
  };

  cart.push(item);
  updateCartDisplay();
  productSelect.value = '';
  document.getElementById('properties-container').style.display = 'none';
  document.getElementById('properties-container').innerHTML = '';
});

function updateCartDisplay() {
  const cartDiv = document.getElementById('cart-items');
  const clearBtn = document.getElementById('clear-cart-btn');
  const saveBtn = document.getElementById('save-order-btn');

  if (cart.length === 0) {
    cartDiv.innerHTML = '<p>No items in cart. Add a product to get started.</p>';
    clearBtn.disabled = true;
    saveBtn.disabled = true;
    return;
  }

  clearBtn.disabled = false;
  saveBtn.disabled = false;

  cartDiv.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <div class="item-details">
        <strong>${escapeHtml(item.productName)}</strong>
        <div class="item-selections">
          ${Object.entries(item.selections).map(([propId, valueId]) => {
            // Find property and value names from the dropdown data
            const select = document.querySelector(`select[data-property-id="${propId}"]`);
            const option = select?.querySelector(`option[value="${valueId}"]`);
            const valueName = option?.textContent || valueId;
            const propName = select?.dataset.propertyName || propId;
            return `<span>${propName}: ${escapeHtml(valueName)}</span>`;
          }).join(' | ')}
        </div>
      </div>
      <div class="item-actions">
        <button class="edit-btn" onclick="editCartItem(${index})">Edit</button>
        <button class="delete-btn" onclick="removeCartItem(${index})">Remove</button>
      </div>
    </div>
  `).join('');
}

function removeCartItem(index) {
  cart.splice(index, 1);
  updateCartDisplay();
}

function editCartItem(index) {
  alert('Edit item coming soon');
}

// Clear cart
document.getElementById('clear-cart-btn').addEventListener('click', () => {
  if (confirm('Clear all items from cart?')) {
    cart = [];
    document.getElementById('customer-name').value = '';
    updateCartDisplay();
  }
});

// Save order
document.getElementById('save-order-btn').addEventListener('click', async () => {
  const customerName = document.getElementById('customer-name').value.trim();
  const errorDiv = document.getElementById('order-error');

  errorDiv.textContent = '';

  if (!customerName) {
    errorDiv.textContent = 'Customer name is required';
    return;
  }

  if (cart.length === 0) {
    errorDiv.textContent = 'Order must contain at least one item';
    return;
  }

  try {
    const orderData = {
      customerName,
      items: cart.map(item => ({
        productId: item.productId,
        selections: item.selections
      }))
    };

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json();
      errorDiv.textContent = error.error || 'Failed to save order';
      return;
    }

    const order = await response.json();
    alert(`Order saved successfully! Order ID: ${order.id}`);

    // Clear form
    cart = [];
    document.getElementById('customer-name').value = '';
    updateCartDisplay();
  } catch (error) {
    console.error('Error saving order:', error);
    errorDiv.textContent = 'Error saving order';
  }
});

// UUID generator (simple)
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============ ORDER EDITING ============

let editingOrderId = null;
let editCart = []; // In-memory cart for edit modal

// Open order edit modal (called from Order History - placeholder for now)
async function openOrderEditModal(orderId) {
  editingOrderId = orderId;
  editCart = [];
  const errorDiv = document.getElementById('edit-order-error');
  errorDiv.textContent = '';

  try {
    // Fetch order
    const response = await fetch(`/api/orders/${orderId}`);
    if (!response.ok) throw new Error('Failed to fetch order');
    const order = await response.json();

    // Populate customer name
    document.getElementById('edit-customer-name').value = order.customerName;

    // Populate current items
    editCart = (order.items || []).map(item => ({
      id: item.id, // Keep existing id
      productId: item.productId,
      productName: order.productName || `Product ${item.productId}`, // Fetch product name if needed
      selections: item.selections
    }));

    // Fetch product names for display
    const productsResponse = await fetch('/api/products');
    if (productsResponse.ok) {
      const products = await productsResponse.json();
      const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));
      editCart.forEach(item => {
        item.productName = productMap[item.productId] || `Product ${item.productId}`;
      });
    }

    updateEditCartDisplay();

    // Populate product dropdown
    const editProductSelect = document.getElementById('edit-product-select');
    editProductSelect.innerHTML = '<option value="">-- Select a product --</option>';
    if (productsResponse.ok) {
      const products = await productsResponse.json();
      products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        editProductSelect.appendChild(option);
      });
    }

    // Setup product selection handler
    editProductSelect.onchange = handleEditProductSelect;

    // Open modal
    document.getElementById('edit-order-modal').style.display = 'block';
  } catch (error) {
    console.error('Error opening order edit modal:', error);
    errorDiv.textContent = 'Error loading order';
  }
}

function closeOrderEditModal() {
  document.getElementById('edit-order-modal').style.display = 'none';
  editingOrderId = null;
  editCart = [];
}

async function handleEditProductSelect(e) {
  const productId = e.target.value;
  const propertiesContainer = document.getElementById('edit-properties-container');

  if (!productId) {
    propertiesContainer.style.display = 'none';
    propertiesContainer.innerHTML = '';
    return;
  }

  try {
    const propResponse = await fetch(`/api/products/${productId}/properties`);
    if (!propResponse.ok) throw new Error('Failed to fetch properties');
    const properties = await propResponse.json();

    if (properties.length === 0) {
      propertiesContainer.style.display = 'none';
      propertiesContainer.innerHTML = '';
      return;
    }

    propertiesContainer.style.display = 'block';
    propertiesContainer.innerHTML = '';

    for (const property of properties) {
      const group = document.createElement('div');
      group.className = 'form-group';

      const label = document.createElement('label');
      label.textContent = property.name + ':';
      label.htmlFor = `edit-prop-${property.id}`;

      const select = document.createElement('select');
      select.id = `edit-prop-${property.id}`;
      select.dataset.propertyId = property.id;
      select.dataset.propertyName = property.name;

      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = `-- Select ${property.name} --`;
      select.appendChild(defaultOption);

      const valuesResponse = await fetch(`/api/properties/${property.id}/values`);
      if (valuesResponse.ok) {
        const values = await valuesResponse.json();
        values.forEach(v => {
          const option = document.createElement('option');
          option.value = v.id;
          option.textContent = v.value;
          select.appendChild(option);
        });
      }

      group.appendChild(label);
      group.appendChild(select);
      propertiesContainer.appendChild(group);
    }
  } catch (error) {
    console.error('Error fetching properties:', error);
  }
}

document.getElementById('edit-add-item-btn').addEventListener('click', () => {
  const productSelect = document.getElementById('edit-product-select');
  const productId = productSelect.value;
  const errorDiv = document.getElementById('edit-order-error');

  errorDiv.textContent = '';

  if (!productId) {
    errorDiv.textContent = 'Product is required';
    return;
  }

  const propertySelects = document.querySelectorAll('#edit-properties-container select');
  const selections = {};
  let isValid = true;

  propertySelects.forEach(select => {
    const propertyId = select.dataset.propertyId;
    const value = select.value;

    if (!value) {
      isValid = false;
      const productName = productSelect.options[productSelect.selectedIndex].text;
      errorDiv.textContent = `All properties must be selected for ${productName}`;
    }

    selections[propertyId] = select.value;
  });

  if (!isValid) return;

  const item = {
    id: uuidv4(),
    productId,
    productName: productSelect.options[productSelect.selectedIndex].text,
    selections
  };

  editCart.push(item);
  updateEditCartDisplay();
  productSelect.value = '';
  document.getElementById('edit-properties-container').style.display = 'none';
  document.getElementById('edit-properties-container').innerHTML = '';
});

function updateEditCartDisplay() {
  const cartDiv = document.getElementById('edit-cart-items');

  if (editCart.length === 0) {
    cartDiv.innerHTML = '<p>No items in this order.</p>';
    return;
  }

  cartDiv.innerHTML = editCart.map((item, index) => `
    <div class="cart-item">
      <div class="item-details">
        <strong>${escapeHtml(item.productName)}</strong>
        <div class="item-selections">
          ${Object.entries(item.selections).map(([propId, valueId]) => {
            const select = document.querySelector(`select[data-property-id="${propId}"]`);
            const option = select?.querySelector(`option[value="${valueId}"]`);
            const valueName = option?.textContent || valueId;
            const propName = select?.dataset.propertyName || propId;
            return `<span>${propName}: ${escapeHtml(valueName)}</span>`;
          }).join(' | ')}
        </div>
      </div>
      <div class="item-actions">
        <button class="delete-btn" onclick="removeEditCartItem(${index})" ${editCart.length === 1 ? 'disabled' : ''}>Remove</button>
      </div>
    </div>
  `).join('');
}

function removeEditCartItem(index) {
  if (editCart.length <= 1) {
    document.getElementById('edit-order-error').textContent = 'Order must contain at least one item';
    return;
  }
  editCart.splice(index, 1);
  updateEditCartDisplay();
  document.getElementById('edit-order-error').textContent = '';
}

document.getElementById('save-order-changes-btn').addEventListener('click', async () => {
  const customerName = document.getElementById('edit-customer-name').value.trim();
  const errorDiv = document.getElementById('edit-order-error');

  errorDiv.textContent = '';

  if (!customerName) {
    errorDiv.textContent = 'Customer name is required';
    return;
  }

  if (editCart.length === 0) {
    errorDiv.textContent = 'Order must contain at least one item';
    return;
  }

  try {
    const updateData = {
      customerName,
      items: editCart.map(item => ({
        productId: item.productId,
        selections: item.selections
      }))
    };

    const response = await fetch(`/api/orders/${editingOrderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const error = await response.json();
      errorDiv.textContent = error.error || 'Failed to save order';
      return;
    }

    alert('Order updated successfully!');
    closeOrderEditModal();
  } catch (error) {
    console.error('Error saving order:', error);
    errorDiv.textContent = 'Error saving order';
  }
});
