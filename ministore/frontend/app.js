/**
 * MiniStore - Vanilla JavaScript Application
 * 
 * Simple, beginner-friendly frontend logic:
 * 1. Checks backend health via GET /api/health
 * 2. Fetches product catalog via GET /api/products
 * 3. Manages shopping cart state in-memory
 * 4. Submits checkout payload via POST /api/orders
 */

// Application State
const state = {
  products: [],
  cart: {}, // Format: { [productId]: quantity }
};

// DOM Element References
const elements = {
  statusBulb: document.getElementById('status-bulb'),
  statusLabel: document.getElementById('status-label'),
  backendStatus: document.getElementById('backend-status'),
  cartBtn: document.getElementById('cart-btn'),
  cartCount: document.getElementById('cart-count'),
  cartDrawer: document.getElementById('cart-drawer'),
  cartBackdrop: document.getElementById('cart-backdrop'),
  closeCartBtn: document.getElementById('close-cart-btn'),
  cartEmpty: document.getElementById('cart-empty'),
  cartItems: document.getElementById('cart-items'),
  cartFooter: document.getElementById('cart-footer'),
  cartSubtotal: document.getElementById('cart-subtotal'),
  cartTotal: document.getElementById('cart-total'),
  checkoutForm: document.getElementById('checkout-form'),
  checkoutSubmitBtn: document.getElementById('checkout-submit-btn'),
  productsGrid: document.getElementById('products-grid'),
  loadingSpinner: document.getElementById('loading-spinner'),
  catalogError: document.getElementById('catalog-error'),
  catalogErrorMsg: document.getElementById('catalog-error-msg'),
  retryFetchBtn: document.getElementById('retry-fetch-btn'),
  refreshProductsBtn: document.getElementById('refresh-products-btn'),
  testHealthBtn: document.getElementById('test-health-btn'),
  orderModal: document.getElementById('order-modal'),
  modalBackdrop: document.getElementById('modal-backdrop'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  orderReceipt: document.getElementById('order-receipt'),
  toast: document.getElementById('toast'),
};

/**
 * Displays a non-intrusive floating toast notification.
 */
function showToast(message, duration = 3000) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');

  clearTimeout(elements.toast._timeout);
  elements.toast._timeout = setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, duration);
}

/**
 * Checks backend health and database connectivity.
 * Endpoint: GET /api/health
 */
async function checkHealth() {
  try {
    elements.statusLabel.textContent = 'Checking...';
    const response = await fetch('/api/health');
    const data = await response.json();

    if (response.ok && data.status === 'ok') {
      elements.statusBulb.className = 'status-indicator online';
      elements.statusLabel.textContent = 'API & DB Online';
      elements.backendStatus.title = `Service: ${data.service} | Database: ${data.database}`;
      return true;
    } else {
      elements.statusBulb.className = 'status-indicator offline';
      elements.statusLabel.textContent = 'Degraded';
      elements.backendStatus.title = data.error || 'Database unavailable';
      return false;
    }
  } catch (err) {
    elements.statusBulb.className = 'status-indicator offline';
    elements.statusLabel.textContent = 'Offline';
    elements.backendStatus.title = 'Cannot connect to /api/health';
    return false;
  }
}

/**
 * Fetches the list of products from the Flask backend.
 * Endpoint: GET /api/products
 */
async function fetchProducts() {
  // Show loading spinner
  elements.loadingSpinner.classList.remove('hidden');
  elements.productsGrid.classList.add('hidden');
  elements.catalogError.classList.add('hidden');

  try {
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const products = await response.json();
    state.products = products;
    renderProducts(products);

    // Hide loader, show grid
    elements.loadingSpinner.classList.add('hidden');
    elements.productsGrid.classList.remove('hidden');
  } catch (err) {
    console.error('Failed to load products:', err);
    elements.loadingSpinner.classList.add('hidden');
    elements.catalogError.classList.remove('hidden');
    elements.catalogErrorMsg.textContent = `Could not load catalog: ${err.message}. Ensure Nginx and the Flask backend are running.`;
  }
}

/**
 * Formats a numeric price into a currency string ($XX.XX).
 */
function formatPrice(price) {
  const num = typeof price === 'number' ? price : parseFloat(price);
  return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
}

/**
 * Renders product cards into the catalog grid.
 */
function renderProducts(products) {
  elements.productsGrid.innerHTML = '';

  if (!products || products.length === 0) {
    elements.productsGrid.innerHTML = '<p class="state-text">No products found in the database.</p>';
    return;
  }

  products.forEach((product) => {
    const card = document.createElement('article');
    card.className = 'product-card';

    const stock = Number(product.stock);
    const inCartQty = state.cart[product.id] || 0;
    const availableStock = Math.max(0, stock - inCartQty);
    const isOutOfStock = availableStock <= 0;

    let stockBadgeClass = '';
    let stockText = `${availableStock} in stock`;
    if (stock <= 0) {
      stockBadgeClass = 'out';
      stockText = 'Out of stock';
    } else if (availableStock <= 5) {
      stockBadgeClass = 'low';
      stockText = `Only ${availableStock} left`;
    }

    card.innerHTML = `
      <div class="card-top">
        <div class="product-meta">Item #${product.id}</div>
        <h3 class="product-title">${escapeHtml(product.name)}</h3>
        <p class="product-description">${escapeHtml(product.description || 'Quality cloud and engineering accessory.')}</p>
      </div>
      <div class="card-bottom">
        <div class="price-stock-info">
          <span class="product-price tabular-nums">${formatPrice(product.price)}</span>
          <span class="stock-indicator ${stockBadgeClass}">${stockText}</span>
        </div>
        <button 
          class="btn-add-cart" 
          data-id="${product.id}"
          ${isOutOfStock ? 'disabled' : ''}
        >
          ${isOutOfStock ? 'Sold Out' : 'Add to Cart'}
        </button>
      </div>
    `;

    // Wire Add to Cart click event
    const addBtn = card.querySelector('.btn-add-cart');
    if (addBtn && !isOutOfStock) {
      addBtn.addEventListener('click', () => {
        addToCart(product.id);
      });
    }

    elements.productsGrid.appendChild(card);
  });
}

/**
 * Escapes HTML characters to prevent XSS.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Adds a product to the cart state.
 */
function addToCart(productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  const currentQty = state.cart[productId] || 0;
  if (currentQty >= product.stock) {
    showToast(`Cannot add more: Only ${product.stock} available in stock.`);
    return;
  }

  state.cart[productId] = currentQty + 1;
  updateCartBadge();
  renderCart();
  renderProducts(state.products); // Refresh remaining stock labels
  showToast(`Added "${product.name}" to cart.`);
}

/**
 * Adjusts quantity of an item in the cart.
 */
function changeCartQuantity(productId, delta) {
  const currentQty = state.cart[productId] || 0;
  const product = state.products.find((p) => p.id === productId);
  const newQty = currentQty + delta;

  if (newQty <= 0) {
    delete state.cart[productId];
  } else if (product && newQty > product.stock) {
    showToast(`Maximum stock limit reached (${product.stock} available).`);
    return;
  } else {
    state.cart[productId] = newQty;
  }

  updateCartBadge();
  renderCart();
  renderProducts(state.products);
}

/**
 * Removes an item entirely from the cart.
 */
function removeFromCart(productId) {
  delete state.cart[productId];
  updateCartBadge();
  renderCart();
  renderProducts(state.products);
}

/**
 * Updates the cart badge count in the top navigation bar.
 */
function updateCartBadge() {
  const totalCount = Object.values(state.cart).reduce((sum, qty) => sum + qty, 0);
  elements.cartCount.textContent = totalCount;
}

/**
 * Renders the contents of the slide-over cart drawer.
 */
function renderCart() {
  const itemIds = Object.keys(state.cart).map(Number);

  if (itemIds.length === 0) {
    elements.cartEmpty.classList.remove('hidden');
    elements.cartItems.classList.add('hidden');
    elements.cartFooter.classList.add('hidden');
    return;
  }

  elements.cartEmpty.classList.add('hidden');
  elements.cartItems.classList.remove('hidden');
  elements.cartFooter.classList.remove('hidden');
  elements.cartItems.innerHTML = '';

  let subtotal = 0;

  itemIds.forEach((id) => {
    const product = state.products.find((p) => p.id === id);
    if (!product) return;

    const quantity = state.cart[id];
    const linePrice = product.price * quantity;
    subtotal += linePrice;

    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <div class="cart-item-info">
        <h4 class="cart-item-name" title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</h4>
        <div class="cart-item-price tabular-nums">${formatPrice(product.price)} each &middot; Total ${formatPrice(linePrice)}</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn btn-minus" data-id="${id}" aria-label="Decrease quantity">&minus;</button>
        <span class="cart-item-qty tabular-nums">${quantity}</span>
        <button class="qty-btn btn-plus" data-id="${id}" aria-label="Increase quantity" ${quantity >= product.stock ? 'disabled' : ''}>&#43;</button>
        <button class="remove-btn" data-id="${id}" aria-label="Remove item">Remove</button>
      </div>
    `;

    itemEl.querySelector('.btn-minus').addEventListener('click', () => changeCartQuantity(id, -1));
    itemEl.querySelector('.btn-plus').addEventListener('click', () => changeCartQuantity(id, 1));
    itemEl.querySelector('.remove-btn').addEventListener('click', () => removeFromCart(id));

    elements.cartItems.appendChild(itemEl);
  });

  elements.cartSubtotal.textContent = formatPrice(subtotal);
  elements.cartTotal.textContent = formatPrice(subtotal);
}

/**
 * Toggles visibility of the cart drawer.
 */
function toggleCart(open) {
  if (open) {
    elements.cartDrawer.classList.add('open');
    elements.cartBackdrop.classList.remove('hidden');
    elements.cartDrawer.setAttribute('aria-hidden', 'false');
  } else {
    elements.cartDrawer.classList.remove('open');
    elements.cartBackdrop.classList.add('hidden');
    elements.cartDrawer.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Handles order checkout submission.
 * Endpoint: POST /api/orders
 */
async function handleCheckout(event) {
  event.preventDefault();

  const itemIds = Object.keys(state.cart).map(Number);
  if (itemIds.length === 0) {
    showToast('Your shopping cart is empty.');
    return;
  }

  const nameInput = document.getElementById('cust-name');
  const emailInput = document.getElementById('cust-email');

  const customer_name = nameInput.value.trim();
  const customer_email = emailInput.value.trim();

  if (!customer_name || !customer_email) {
    showToast('Please provide your name and a valid email address.');
    return;
  }

  // Construct API payload
  const orderPayload = {
    customer_name: customer_name,
    customer_email: customer_email,
    items: itemIds.map((id) => ({
      product_id: id,
      quantity: state.cart[id],
    })),
  };

  try {
    elements.checkoutSubmitBtn.disabled = true;
    elements.checkoutSubmitBtn.textContent = 'Processing Order...';

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Checkout failed (HTTP ${response.status})`);
    }

    // Order Success!
    toggleCart(false);
    showOrderSuccessModal(result, orderPayload);

    // Clear cart and form
    state.cart = {};
    updateCartBadge();
    renderCart();
    nameInput.value = '';
    emailInput.value = '';

    // Re-fetch products to reflect updated inventory from PostgreSQL
    fetchProducts();
  } catch (err) {
    console.error('Order checkout error:', err);
    alert(`Order failed: ${err.message}`);
  } finally {
    elements.checkoutSubmitBtn.disabled = false;
    elements.checkoutSubmitBtn.textContent = 'Place Order (POST /api/orders)';
  }
}

/**
 * Shows the order confirmation receipt modal.
 */
function showOrderSuccessModal(orderData, payload) {
  elements.orderReceipt.innerHTML = `
    <div class="receipt-row">
      <span style="color: var(--color-text-muted);">Order Number</span>
      <span class="tabular-nums">#${orderData.order_id}</span>
    </div>
    <div class="receipt-row">
      <span style="color: var(--color-text-muted);">Customer</span>
      <span>${escapeHtml(orderData.customer_name)}</span>
    </div>
    <div class="receipt-row">
      <span style="color: var(--color-text-muted);">Confirmation Email</span>
      <span>${escapeHtml(orderData.customer_email)}</span>
    </div>
    <div class="receipt-row">
      <span style="color: var(--color-text-muted);">Status</span>
      <span style="color: var(--color-success); font-weight: 600;">Confirmed (PostgreSQL)</span>
    </div>
    <div class="receipt-row">
      <span>Total Paid</span>
      <span class="tabular-nums">${formatPrice(orderData.total_price)}</span>
    </div>
  `;

  elements.orderModal.classList.remove('hidden');
  elements.modalBackdrop.classList.remove('hidden');
}

function closeOrderModal() {
  elements.orderModal.classList.add('hidden');
  elements.modalBackdrop.classList.add('hidden');
}

/**
 * Event Listeners Registration
 */
function setupEventListeners() {
  // Cart Drawer open/close
  elements.cartBtn.addEventListener('click', () => toggleCart(true));
  elements.closeCartBtn.addEventListener('click', () => toggleCart(false));
  elements.cartBackdrop.addEventListener('click', () => toggleCart(false));

  // Modal close
  elements.modalCloseBtn.addEventListener('click', closeOrderModal);
  elements.modalBackdrop.addEventListener('click', closeOrderModal);

  // Checkout form submit
  elements.checkoutForm.addEventListener('submit', handleCheckout);

  // Catalog actions
  elements.refreshProductsBtn.addEventListener('click', () => {
    fetchProducts();
    checkHealth();
  });
  elements.retryFetchBtn.addEventListener('click', () => {
    fetchProducts();
    checkHealth();
  });

  // Test /api/health button
  elements.testHealthBtn.addEventListener('click', async () => {
    const isHealthy = await checkHealth();
    if (isHealthy) {
      showToast('GET /api/health succeeded! Backend and Database are healthy.');
    } else {
      showToast('GET /api/health reported degraded or unreachable.');
    }
  });

  // ESC key to close open overlays
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleCart(false);
      closeOrderModal();
    }
  });
}

// Application Initialization
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkHealth();
  fetchProducts();

  // Periodic health ping every 30 seconds
  setInterval(checkHealth, 30000);
});
