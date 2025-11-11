// Initialize Supabase with your configuration
const supabaseUrl = 'https://qgayglybnnrhobcvftrs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYXlnbHlibm5yaG9iY3ZmdHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2ODQ5ODMsImV4cCI6MjA3ODI2MDk4M30.dqiEe-v1cro5N4tuawu7Y1x5klSyjINsLHd9-V40QjQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Initialize data structures
const sections = ['grill', 'wholesale', 'building', 'food'];
const sectionNames = {
    'grill': 'Grill',
    'wholesale': 'Wholesale',
    'building': 'Building Material',
    'food': 'Food Supplies'
};

// Initialize empty inventory for each section
const inventory = {
    'grill': [],
    'wholesale': [],
    'building': [],
    'food': []
};

// Initialize empty carts for each section
const carts = {
    'grill': [],
    'wholesale': [],
    'building': [],
    'food': []
};

// Initialize sales data with proper default values
const salesData = {
    'grill': { totalSales: 0, totalTransactions: 0, avgTransaction: 0, topItem: '-', dailySales: 0, dailyTransactions: 0, profit: 0, profitMargin: 0 },
    'wholesale': { totalSales: 0, totalTransactions: 0, avgTransaction: 0, topItem: '-', dailySales: 0, dailyTransactions: 0, profit: 0, profitMargin: 0 },
    'building': { totalSales: 0, totalTransactions: 0, avgTransaction: 0, topItem: '-', dailySales: 0, dailyTransactions: 0, profit: 0, profitMargin: 0 },
    'food': { totalSales: 0, totalTransactions: 0, avgTransaction: 0, topItem: '-', dailySales: 0, dailyTransactions: 0, profit: 0, profitMargin: 0 }
};

// Initialize purchase data with proper default values
const purchaseData = {
    'grill': { totalPurchases: 0, totalTransactions: 0, avgTransaction: 0, topSupplier: '-', dailyPurchases: 0, dailyTransactions: 0 },
    'wholesale': { totalPurchases: 0, totalTransactions: 0, avgTransaction: 0, topSupplier: '-', dailyPurchases: 0, dailyTransactions: 0 },
    'building': { totalPurchases: 0, totalTransactions: 0, avgTransaction: 0, topSupplier: '-', dailyPurchases: 0, dailyTransactions: 0 },
    'food': { totalPurchases: 0, totalTransactions: 0, avgTransaction: 0, topSupplier: '-', dailyPurchases: 0, dailyTransactions: 0 }
};

// Initialize user data with proper default values
const userData = {
    'grill': { transactions: 0, sales: 0, purchases: 0 },
    'wholesale': { transactions: 0, sales: 0, purchases: 0 },
    'building': { transactions: 0, sales: 0, purchases: 0 },
    'food': { transactions: 0, sales: 0, purchases: 0 }
};

// Initialize suppliers data
const suppliers = {
    'grill': [],
    'wholesale': [],
    'building': [],
    'food': []
};

// Initialize purchase orders
const purchaseOrders = {
    'grill': [],
    'wholesale': [],
    'building': [],
    'food': []
};

// Current section and view
let currentSection = 'grill';
let currentView = 'pos';
let currentFilter = 'all';
let currentUser = null;

// Load data from localStorage immediately
function loadDataFromLocalStorage() {
    sections.forEach(section => {
        // Load inventory
        const localInventory = loadFromLocalStorage(`inventory_${section}`, []);
        if (localInventory.length > 0) {
            inventory[section] = localInventory;
        }
        
        // Load sales data
        const localSalesData = loadFromLocalStorage(`salesData_${section}`);
        if (localSalesData) {
            salesData[section] = localSalesData;
        }
        
        // Load purchase data
        const localPurchaseData = loadFromLocalStorage(`purchaseData_${section}`);
        if (localPurchaseData) {
            purchaseData[section] = localPurchaseData;
        }
        
        // Load user data
        const localUserData = loadFromLocalStorage(`userData_${section}`);
        if (localUserData) {
            userData[section] = localUserData;
        }
        
        // Load cart
        const localCart = loadFromLocalStorage(`cart_${section}`, []);
        if (localCart.length > 0) {
            carts[section] = localCart;
        }
        
        // Load suppliers
        const localSuppliers = loadFromLocalStorage(`suppliers_${section}`, []);
        if (localSuppliers.length > 0) {
            suppliers[section] = localSuppliers;
        }
        
        // Load purchase orders
        const localPurchaseOrders = loadFromLocalStorage(`purchaseOrders_${section}`, []);
        if (localPurchaseOrders.length > 0) {
            purchaseOrders[section] = localPurchaseOrders;
        }
    });
}

// Call this immediately to load data from localStorage
loadDataFromLocalStorage();

// Generate unique ID for offline records
function generateOfflineId() {
    return 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Save data to local storage for offline use
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

// Load data from local storage
function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.error('Error loading from localStorage:', e);
        return defaultValue;
    }
}

// Check if a product is expired
function isExpired(expiryDate) {
    if (!expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    const expiry = new Date(expiryDate);
    return expiry < today;
}

// Check if a product is expiring soon (within 7 days)
function isExpiringSoon(expiryDate) {
    if (!expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffTime > 0 && diffDays <= 7;
}

// Get product status based on stock and expiry
function getProductStatus(item) {
    if (isExpired(item.expiry_date)) {
        return 'expired';
    } else if (isExpiringSoon(item.expiry_date)) {
        return 'expiring-soon';
    } else if (item.stock === 0) {
        return 'out-of-stock';
    } else if (item.stock < 10) {
        return 'low-stock';
    } else {
        return 'in-stock';
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Update category inventory summary
function updateCategoryInventorySummary(section) {
    let totalProducts = 0;
    let totalValue = 0;
    let totalCost = 0;
    let lowStockCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    
    inventory[section].forEach(item => {
        totalProducts++;
        totalValue += item.price * item.stock;
        totalCost += (item.cost || 0) * item.stock;
        
        const status = getProductStatus(item);
        if (status === 'low-stock') {
            lowStockCount++;
        } else if (status === 'expiring-soon') {
            expiringSoonCount++;
        } else if (status === 'expired') {
            expiredCount++;
        }
    });
    
    const totalProfit = totalValue - totalCost;
    const profitMargin = totalValue > 0 ? (totalProfit / totalValue) * 100 : 0;
    
    // Update the summary cards with null checks
    const totalProductsEl = document.getElementById(`${section}-total-products`);
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    
    const totalValueEl = document.getElementById(`${section}-total-value`);
    if (totalValueEl) totalValueEl.textContent = `₦${totalValue.toFixed(2)}`;
    
    const totalCostEl = document.getElementById(`${section}-total-cost`);
    if (totalCostEl) totalCostEl.textContent = `₦${totalCost.toFixed(2)}`;
    
    const totalProfitEl = document.getElementById(`${section}-total-profit`);
    if (totalProfitEl) totalProfitEl.textContent = `₦${totalProfit.toFixed(2)}`;
    
    const profitMarginEl = document.getElementById(`${section}-profit-margin`);
    if (profitMarginEl) profitMarginEl.textContent = `${profitMargin.toFixed(1)}%`;
    
    const lowStockCountEl = document.getElementById(`${section}-low-stock-count`);
    if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount;
    
    const expiringSoonCountEl = document.getElementById(`${section}-expiring-soon-count`);
    if (expiringSoonCountEl) expiringSoonCountEl.textContent = expiringSoonCount;
    
    const expiredCountEl = document.getElementById(`${section}-expired-count`);
    if (expiredCountEl) expiredCountEl.textContent = expiredCount;
}

// ===================================================================
// UPDATED FUNCTION: saveDataToSupabase
// ===================================================================
// FIXED: Enhanced saveDataToSupabase function with better data cleaning
async function saveDataToSupabase(table, data, id = null) {
    // Add timestamp and user info
    data.timestamp = new Date().toISOString();
    data.userId = currentUser ? currentUser.id : 'offline_user';
    
    // Save to local storage immediately for offline access
    const localKey = `${table}_${id || 'new'}`;
    saveToLocalStorage(localKey, data);
    
    // Update local data structures immediately
    if (table === 'inventory') {
        if (!id) {
            // New item - generate temporary ID
            id = generateOfflineId();
            data.id = id;
            data.isOffline = true; // This is for local tracking only
            inventory[data.section].push(data);
        } else {
            // Update existing item
            const index = inventory[data.section].findIndex(item => item.id === id);
            if (index !== -1) {
                inventory[data.section][index] = { ...inventory[data.section][index], ...data };
            }
        }
        // Save inventory to local storage immediately
        saveToLocalStorage(`inventory_${data.section}`, inventory[data.section]);
        loadInventoryTable(data.section);
        updateDepartmentStats(data.section);
        updateCategoryInventorySummary(data.section);
        updateTotalInventory();
    } else if (table === 'sales') {
        // Update sales data locally
        const section = data.section;
        const totalProfit = calculateSaleProfit(data.items);
        
        salesData[section].totalSales += data.total;
        salesData[section].totalTransactions += 1;
        salesData[section].avgTransaction = salesData[section].totalSales / salesData[section].totalTransactions;
        salesData[section].dailySales += data.total;
        salesData[section].dailyTransactions += 1;
        salesData[section].profit += totalProfit;
        salesData[section].profitMargin = salesData[section].totalSales > 0 ? 
            (salesData[section].profit / salesData[section].totalSales) * 100 : 0;
        
        userData[section].transactions += 1;
        userData[section].sales += data.total;
        
        // Save sales and user data to local storage immediately
        saveToLocalStorage(`salesData_${section}`, salesData[section]);
        saveToLocalStorage(`userData_${section}`, userData[section]);
        
        updateReports(section);
        updateUserStats(section);
        updateDepartmentStats(section);
    } else if (table === 'purchases') {
        // Update purchase data locally
        const section = data.section;
        
        purchaseData[section].totalPurchases += data.total;
        purchaseData[section].totalTransactions += 1;
        purchaseData[section].avgTransaction = purchaseData[section].totalPurchases / purchaseData[section].totalTransactions;
        purchaseData[section].dailyPurchases += data.total;
        purchaseData[section].dailyTransactions += 1;
        
        userData[section].purchases += data.total;
        
        // Save purchase and user data to local storage immediately
        saveToLocalStorage(`purchaseData_${section}`, purchaseData[section]);
        saveToLocalStorage(`userData_${section}`, userData[section]);
        
        updatePurchaseReports(section);
        updateUserStats(section);
        updateDepartmentStats(section);
    } else if (table === 'suppliers') {
        const section = data.section;
        if (!id) {
            // New supplier - generate temporary ID
            id = generateOfflineId();
            data.id = id;
            data.isOffline = true;
            suppliers[section].push(data);
        } else {
            // Update existing supplier
            const index = suppliers[section].findIndex(supplier => supplier.id === id);
            if (index !== -1) {
                suppliers[section][index] = { ...suppliers[section][index], ...data };
            }
        }
        // Save suppliers to local storage immediately
        saveToLocalStorage(`suppliers_${section}`, suppliers[section]);
        loadSuppliersTable(section);
    } else if (table === 'purchase_orders') {
        const section = data.section;
        if (!id) {
            // New purchase order - generate temporary ID
            id = generateOfflineId();
            data.id = id;
            data.isOffline = true;
            data.status = 'pending'; // Default status
            purchaseOrders[section].push(data);
        } else {
            // Update existing purchase order
            const index = purchaseOrders[section].findIndex(order => order.id === id);
            if (index !== -1) {
                purchaseOrders[section][index] = { ...purchaseOrders[section][index], ...data };
            }
        }
        // Save purchase orders to local storage immediately
        saveToLocalStorage(`purchaseOrders_${section}`, purchaseOrders[section]);
        loadPurchaseOrdersTable(section);
    } else if (table === 'sales_data') {
        const section = id;
        if (section && salesData[section]) {
            salesData[section] = { ...salesData[section], ...data };
            saveToLocalStorage(`salesData_${section}`, salesData[section]);
            updateReports(section);
            updateDepartmentStats(section);
        }
    } else if (table === 'purchase_data') {
        const section = id;
        if (section && purchaseData[section]) {
            purchaseData[section] = { ...purchaseData[section], ...data };
            saveToLocalStorage(`purchaseData_${section}`, purchaseData[section]);
            updatePurchaseReports(section);
            updateDepartmentStats(section);
        }
    } else if (table === 'user_data') {
        const section = id;
        if (section && userData[section]) {
            userData[section] = { ...userData[section], ...data };
            saveToLocalStorage(`userData_${section}`, userData[section]);
            updateUserStats(section);
        }
    }
    
    // If online, try to save to Supabase
    if (navigator.onLine) {
        try {
            console.log(`Saving to Supabase table: ${table}`);
            
            // Create a clean copy of the data for Supabase, removing client-only properties
            let dataForSupabase = { ...data };
            delete dataForSupabase.isOffline;
            delete dataForSupabase.timestamp;
            
            // For new items, let Supabase generate the ID. Remove our temporary one.
            if (!id || id.startsWith('offline_')) {
                delete dataForSupabase.id;
            }
            
            // Table-specific data cleaning
            if (table === 'inventory') {
                // Only include valid columns for inventory table
                const {
                    section, name, price, cost, stock, expiry_date,
                    description, status, created_by, created_at,
                    updated_by, updated_at, deleted, deleted_at
                } = dataForSupabase;
                
                dataForSupabase = {
                    section, name, price, cost, stock, expiry_date,
                    description, status, created_by, created_at,
                    updated_by, updated_at, deleted, deleted_at
                };
            } else if (table === 'sales') {
                // Only include valid columns for sales table
                const {
                    user_id, user_email, section, items, subtotal, total,
                    totalCost, totalProfit, profitMargin, payment_method,
                    customer_name, customer_phone, timestamp
                } = dataForSupabase;
                
                dataForSupabase = {
                    user_id, user_email, section, items, subtotal, total,
                    totalCost, totalProfit, profitMargin, payment_method,
                    customer_name, customer_phone, timestamp
                };
            } else if (table === 'suppliers') {
                // Only include valid columns for suppliers table
                const {
                    section, name, phone, email, address, products,
                    created_by, created_at, updated_by, updated_at,
                    deleted, deleted_at
                } = dataForSupabase;
                
                dataForSupabase = {
                    section, name, phone, email, address, products,
                    created_by, created_at, updated_by, updated_at,
                    deleted, deleted_at
                };
            } else if (table === 'purchase_orders') {
                // Only include valid columns for purchase_orders table
                const {
                    section, orderNumber, supplierId, supplierName,
                    productId, productName, quantity, cost, total,
                    orderDate, status, receivedDate, created_by, created_at,
                    updated_by, updated_at, deleted, deleted_at
                } = dataForSupabase;
                
                dataForSupabase = {
                    section, orderNumber, supplierId, supplierName,
                    productId, productName, quantity, cost, total,
                    orderDate, status, receivedDate, created_by, created_at,
                    updated_by, updated_at, deleted, deleted_at
                };
            }
            
            let result;
            
            if (id && !id.startsWith('offline_')) {
                // Update existing record
                console.log(`Updating record with ID: ${id}`);
                const { data: resultData, error } = await supabase
                    .from(table)
                    .update(dataForSupabase)
                    .eq('id', id)
                    .select();
                
                if (error) {
                    console.error(`Error updating ${table}:`, error);
                    throw error;
                }
                result = resultData[0];
            } else {
                // Insert new record
                console.log(`Inserting new record into ${table}`);
                const { data: resultData, error } = await supabase
                    .from(table)
                    .insert(dataForSupabase)
                    .select();
                
                if (error) {
                    console.error(`Error inserting into ${table}:`, error);
                    throw error;
                }
                result = resultData[0];
                
                // Update the local data with the real ID from Supabase
                if (table === 'inventory' || table === 'suppliers' || table === 'purchase_orders') {
                    const dataArray = table === 'inventory' ? inventory[data.section] : 
                                     table === 'suppliers' ? suppliers[data.section] : 
                                     purchaseOrders[data.section];
                    
                    const index = dataArray.findIndex(item => item.id === id);
                    if (index !== -1) {
                        dataArray[index].id = result.id;
                        dataArray[index].isOffline = false;
                        localStorage.removeItem(localKey);
                        saveToLocalStorage(`${table}_${data.section}`, dataArray);
                    }
                }
            }
            
            console.log(`Successfully saved to ${table}:`, result);
            return result;
        } catch (error) {
            console.error(`Error saving to ${table}:`, error);
            showNotification(`Error saving to ${table}: ${error.message}`, 'error');
            
            // Store for later sync
            const pendingChanges = loadFromLocalStorage('pendingChanges', {});
            if (!pendingChanges[table]) pendingChanges[table] = {};
            
            if (id && !id.startsWith('offline_')) {
                pendingChanges[table][id] = data;
            } else {
                if (!pendingChanges[table].new) pendingChanges[table].new = [];
                pendingChanges[table].new.push(data);
            }
            
            saveToLocalStorage('pendingChanges', pendingChanges);
            return { id };
        }
    } else {
        // Store for later sync
        const pendingChanges = loadFromLocalStorage('pendingChanges', {});
        if (!pendingChanges[table]) pendingChanges[table] = {};
        
        if (id && !id.startsWith('offline_')) {
            pendingChanges[table][id] = data;
        } else {
            if (!pendingChanges[table].new) pendingChanges[table].new = [];
            pendingChanges[table].new.push(data);
        }
        
        saveToLocalStorage('pendingChanges', pendingChanges);
        return { id };
    }
}

// Calculate profit from a sale
function calculateSaleProfit(items) {
    let totalCost = 0;
    items.forEach(item => {
        const inventoryItem = inventory[currentSection].find(invItem => invItem.id === item.id);
        if (inventoryItem) {
            totalCost += (inventoryItem.cost || 0) * item.quantity;
        }
    });
    return items.reduce((sum, item) => sum + item.total, 0) - totalCost;
}

// Listen for authentication state changes
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        updateUserInfo(session.user);
        loadDataFromSupabase();
        window.addEventListener('online', handleOnlineStatus);
        window.addEventListener('offline', handleOfflineStatus);
        initializeApp();
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
});

// Update user info in the UI
function updateUserInfo(user) {
    const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin User';
    const email = user.email || '';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = displayName;
    
    const userAvatarEl = document.getElementById('userAvatar');
    if (userAvatarEl) userAvatarEl.textContent = initials;
    
    sections.forEach(section => {
        const profileNameEl = document.getElementById(`${section}-profile-name`);
        if (profileNameEl) profileNameEl.textContent = displayName;
        
        const profileAvatarEl = document.getElementById(`${section}-profile-avatar`);
        if (profileAvatarEl) profileAvatarEl.textContent = initials;
        
        const emailEl = document.getElementById(`${section}-email`);
        if (emailEl) emailEl.value = email;
    });
}

// Handle online/offline status
function handleOnlineStatus() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    if (offlineIndicator) offlineIndicator.classList.remove('show');
    showNotification('Connection restored. Syncing data...', 'info');
    syncPendingChanges();
}

function handleOfflineStatus() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    if (offlineIndicator) offlineIndicator.classList.add('show');
    showNotification('You\'re now offline. Changes will be saved locally.', 'warning');
}

// FIXED: Enhanced syncPendingChanges function
async function syncPendingChanges() {
    if (!navigator.onLine) {
        console.log('Offline mode, skipping sync');
        return;
    }
    
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) syncStatus.classList.add('show');
    
    const pendingChanges = loadFromLocalStorage('pendingChanges', {});
    
    if (Object.keys(pendingChanges).length > 0) {
        console.log('Syncing pending changes:', pendingChanges);
        const promises = [];
        
        // Process each table with pending changes
        Object.keys(pendingChanges).forEach(table => {
            // Process new documents
            if (pendingChanges[table].new && pendingChanges[table].new.length > 0) {
                pendingChanges[table].new.forEach(data => {
                    // Create a clean copy of the data for Supabase
                    let dataForSupabase = { ...data };
                    delete dataForSupabase.isOffline;
                    delete dataForSupabase.timestamp;
                    delete dataForSupabase.id; // Let Supabase generate the ID
                    
                    // Table-specific data cleaning (same as in saveDataToSupabase)
                    if (table === 'inventory') {
                        const {
                            section, name, price, cost, stock, expiry_date,
                            description, status, created_by, created_at,
                            updated_by, updated_at, deleted, deleted_at
                        } = dataForSupabase;
                        
                        dataForSupabase = {
                            section, name, price, cost, stock, expiry_date,
                            description, status, created_by, created_at,
                            updated_by, updated_at, deleted, deleted_at
                        };
                    } else if (table === 'sales') {
                        const {
                            user_id, user_email, section, items, subtotal, total,
                            totalCost, totalProfit, profitMargin, payment_method,
                            customer_name, customer_phone, timestamp
                        } = dataForSupabase;
                        
                        dataForSupabase = {
                            user_id, user_email, section, items, subtotal, total,
                            totalCost, totalProfit, profitMargin, payment_method,
                            customer_name, customer_phone, timestamp
                        };
                    } else if (table === 'suppliers') {
                        const {
                            section, name, phone, email, address, products,
                            created_by, created_at, updated_by, updated_at,
                            deleted, deleted_at
                        } = dataForSupabase;
                        
                        dataForSupabase = {
                            section, name, phone, email, address, products,
                            created_by, created_at, updated_by, updated_at,
                            deleted, deleted_at
                        };
                    } else if (table === 'purchase_orders') {
                        const {
                            section, orderNumber, supplierId, supplierName,
                            productId, productName, quantity, cost, total,
                            orderDate, status, receivedDate, created_by, created_at,
                            updated_by, updated_at, deleted, deleted_at
                        } = dataForSupabase;
                        
                        dataForSupabase = {
                            section, orderNumber, supplierId, supplierName,
                            productId, productName, quantity, cost, total,
                            orderDate, status, receivedDate, created_by, created_at,
                            updated_by, updated_at, deleted, deleted_at
                        };
                    }
                    
                    promises.push(
                        supabase
                            .from(table)
                            .insert(dataForSupabase)
                            .select()
                            .then(({ data: result, error }) => {
                                if (error) {
                                    console.error(`Error syncing new ${table} record:`, error);
                                    throw error;
                                }
                                
                                console.log(`Successfully synced new ${table} record:`, result);
                                
                                // Update local data with real ID
                                if (table === 'inventory') {
                                    const index = inventory[data.section].findIndex(item => item.id === data.id);
                                    if (index !== -1) {
                                        inventory[data.section][index].id = result[0].id;
                                        inventory[data.section][index].isOffline = false;
                                        saveToLocalStorage(`inventory_${data.section}`, inventory[data.section]);
                                    }
                                } else if (table === 'suppliers') {
                                    const index = suppliers[data.section].findIndex(item => item.id === data.id);
                                    if (index !== -1) {
                                        suppliers[data.section][index].id = result[0].id;
                                        suppliers[data.section][index].isOffline = false;
                                        saveToLocalStorage(`suppliers_${data.section}`, suppliers[data.section]);
                                    }
                                } else if (table === 'purchase_orders') {
                                    const index = purchaseOrders[data.section].findIndex(item => item.id === data.id);
                                    if (index !== -1) {
                                        purchaseOrders[data.section][index].id = result[0].id;
                                        purchaseOrders[data.section][index].isOffline = false;
                                        saveToLocalStorage(`purchaseOrders_${data.section}`, purchaseOrders[data.section]);
                                    }
                                }
                                return result[0];
                            })
                    );
                });
            }
            
            // Process existing documents
            Object.keys(pendingChanges[table]).forEach(id => {
                if (id !== 'new' && pendingChanges[table][id]) {
                    const data = pendingChanges[table][id];
                    
                    // Create a clean copy of the data for Supabase
                    let dataForSupabase = { ...data };
                    delete dataForSupabase.isOffline;
                    delete dataForSupabase.timestamp;
                    
                    // Table-specific data cleaning (same as in saveDataToSupabase)
                    if (table === 'inventory') {
                        const {
                            section, name, price, cost, stock, expiry_date,
                            description, status, created_by, created_at,
                            updated_by, updated_at, deleted, deleted_at
                        } = dataForSupabase;
                        
                        dataForSupabase = {
                            section, name, price, cost, stock, expiry_date,
                            description, status, created_by, created_at,
                            updated_by, updated_at, deleted, deleted_at
                        };
                    } else if (table === 'sales') {
                        const {
                            user_id, user_email, section, items, subtotal, total,
                            totalCost, totalProfit, profitMargin, payment_method,
                            customer_name, customer_phone, timestamp
                        } = dataForSupabase;
                        
                        dataForSupabase = {
                            user_id, user_email, section, items, subtotal, total,
                            totalCost, totalProfit, profitMargin, payment_method,
                            customer_name, customer_phone, timestamp
                        };
                    } else if (table === 'suppliers') {
                        const {
                            section, name, phone, email, address, products,
                            created_by, created_at, updated_by, updated_at,
                            deleted, deleted_at
                        } = dataForSupabase;
                        
                        dataForSupabase = {
                            section, name, phone, email, address, products,
                            created_by, created_at, updated_by, updated_at,
                            deleted, deleted_at
                        };
                    } else if (table === 'purchase_orders') {
                        const {
                            section, orderNumber, supplierId, supplierName,
                            productId, productName, quantity, cost, total,
                            orderDate, status, receivedDate, created_by, created_at,
                            updated_by, updated_at, deleted, deleted_at
                        } = dataForSupabase;
                        
                        dataForSupabase = {
                            section, orderNumber, supplierId, supplierName,
                            productId, productName, quantity, cost, total,
                            orderDate, status, receivedDate, created_by, created_at,
                            updated_by, updated_at, deleted, deleted_at
                        };
                    }
                    
                    promises.push(
                        supabase
                            .from(table)
                            .update(dataForSupabase)
                            .eq('id', id)
                            .select()
                            .then(({ data: result, error }) => {
                                if (error) {
                                    console.error(`Error syncing ${table} record ${id}:`, error);
                                    throw error;
                                }
                                
                                console.log(`Successfully synced ${table} record ${id}:`, result);
                                return result[0];
                            })
                    );
                }
            });
        });
        
        try {
            await Promise.all(promises);
            localStorage.removeItem('pendingChanges');
            if (syncStatus) syncStatus.classList.remove('show');
            showNotification('All changes synced successfully', 'success');
            // Reload data to ensure UI is updated
            loadDataFromSupabase();
        } catch (error) {
            console.error('Error syncing changes:', error);
            if (syncStatus) syncStatus.classList.remove('show');
            showNotification('Error syncing changes. Please try again later.', 'error');
        }
    } else {
        if (syncStatus) syncStatus.classList.remove('show');
    }
}

// FIXED: Enhanced loadDataFromSupabase function with better data persistence
async function loadDataFromSupabase() {
    if (!navigator.onLine) {
        console.log('Offline mode, skipping Supabase load');
        return;
    }
    
    try {
        console.log('Loading data from Supabase...');
        
        // Load inventory
        sections.forEach(section => {
            supabase
                .from('inventory')
                .select('*')
                .eq('section', section)
                .then(({ data, error }) => {
                    if (error) {
                        console.error(`Error loading ${section} inventory:`, error);
                        showNotification(`Error loading ${section} inventory. Using cached data.`, 'warning');
                        return;
                    }
                    
                    console.log(`Loaded ${section} inventory:`, data);
                    inventory[section] = data || [];
                    saveToLocalStorage(`inventory_${section}`, inventory[section]);
                    loadInventoryTable(section);
                    updateDepartmentStats(section);
                    updateCategoryInventorySummary(section);
                    updateTotalInventory();
                });
        });
        
        // Load suppliers
        sections.forEach(section => {
            supabase
                .from('suppliers')
                .select('*')
                .eq('section', section)
                .then(({ data, error }) => {
                    if (error) {
                        console.error(`Error loading ${section} suppliers:`, error);
                        showNotification(`Error loading ${section} suppliers. Using cached data.`, 'warning');
                        return;
                    }
                    
                    console.log(`Loaded ${section} suppliers:`, data);
                    suppliers[section] = data || [];
                    saveToLocalStorage(`suppliers_${section}`, suppliers[section]);
                    loadSuppliersTable(section);
                });
        });
        
        // Load purchase orders
        sections.forEach(section => {
            supabase
                .from('purchase_orders')
                .select('*')
                .eq('section', section)
                .then(({ data, error }) => {
                    if (error) {
                        console.error(`Error loading ${section} purchase orders:`, error);
                        showNotification(`Error loading ${section} purchase orders. Using cached data.`, 'warning');
                        return;
                    }
                    
                    console.log(`Loaded ${section} purchase orders:`, data);
                    purchaseOrders[section] = data || [];
                    saveToLocalStorage(`purchaseOrders_${section}`, purchaseOrders[section]);
                    loadPurchaseOrdersTable(section);
                });
        });
        
        // Load sales data
        sections.forEach(section => {
            supabase
                .from('sales_data')
                .select('*')
                .eq('id', section)
                .single()
                .then(({ data, error }) => {
                    if (error && error.code !== 'PGRST116') { // Not found error
                        console.error(`Error loading ${section} sales data:`, error);
                        showNotification(`Error loading ${section} sales data. Using cached data.`, 'warning');
                        return;
                    }
                    
                    console.log(`Loaded ${section} sales data:`, data);
                    if (data) {
                        salesData[section] = {
                            totalSales: data.totalSales || 0,
                            totalTransactions: data.totalTransactions || 0,
                            avgTransaction: data.avgTransaction || 0,
                            topItem: data.topItem || '-',
                            dailySales: data.dailySales || 0,
                            dailyTransactions: data.dailyTransactions || 0,
                            profit: data.profit || 0,
                            profitMargin: data.profitMargin || 0
                        };
                        saveToLocalStorage(`salesData_${section}`, salesData[section]);
                        updateReports(section);
                        updateDepartmentStats(section);
                    } else {
                        // If no data exists, create initial record
                        const initialSalesData = {
                            id: section,
                            totalSales: 0,
                            totalTransactions: 0,
                            avgTransaction: 0,
                            topItem: '-',
                            dailySales: 0,
                            dailyTransactions: 0,
                            profit: 0,
                            profitMargin: 0
                        };
                        supabase
                            .from('sales_data')
                            .insert(initialSalesData)
                            .then(({ data, error }) => {
                                if (!error) {
                                    salesData[section] = initialSalesData;
                                    saveToLocalStorage(`salesData_${section}`, salesData[section]);
                                    updateReports(section);
                                    updateDepartmentStats(section);
                                }
                            });
                    }
                });
        });
        
        // Load purchase data
        sections.forEach(section => {
            supabase
                .from('purchase_data')
                .select('*')
                .eq('id', section)
                .single()
                .then(({ data, error }) => {
                    if (error && error.code !== 'PGRST116') { // Not found error
                        console.error(`Error loading ${section} purchase data:`, error);
                        showNotification(`Error loading ${section} purchase data. Using cached data.`, 'warning');
                        return;
                    }
                    
                    console.log(`Loaded ${section} purchase data:`, data);
                    if (data) {
                        purchaseData[section] = {
                            totalPurchases: data.totalPurchases || 0,
                            totalTransactions: data.totalTransactions || 0,
                            avgTransaction: data.avgTransaction || 0,
                            topSupplier: data.topSupplier || '-',
                            dailyPurchases: data.dailyPurchases || 0,
                            dailyTransactions: data.dailyTransactions || 0
                        };
                        saveToLocalStorage(`purchaseData_${section}`, purchaseData[section]);
                        updatePurchaseReports(section);
                        updateDepartmentStats(section);
                    } else {
                        // If no data exists, create initial record
                        const initialPurchaseData = {
                            id: section,
                            totalPurchases: 0,
                            totalTransactions: 0,
                            avgTransaction: 0,
                            topSupplier: '-',
                            dailyPurchases: 0,
                            dailyTransactions: 0
                        };
                        supabase
                            .from('purchase_data')
                            .insert(initialPurchaseData)
                            .then(({ data, error }) => {
                                if (!error) {
                                    purchaseData[section] = initialPurchaseData;
                                    saveToLocalStorage(`purchaseData_${section}`, purchaseData[section]);
                                    updatePurchaseReports(section);
                                    updateDepartmentStats(section);
                                }
                            });
                    }
                });
        });
        
        // Load user data
        sections.forEach(section => {
            supabase
                .from('user_data')
                .select('*')
                .eq('id', section)
                .single()
                .then(({ data, error }) => {
                    if (error && error.code !== 'PGRST116') { // Not found error
                        console.error(`Error loading ${section} user data:`, error);
                        showNotification(`Error loading ${section} user data. Using cached data.`, 'warning');
                        return;
                    }
                    
                    console.log(`Loaded ${section} user data:`, data);
                    if (data) {
                        userData[section] = {
                            transactions: data.transactions || 0,
                            sales: data.sales || 0,
                            purchases: data.purchases || 0
                        };
                        saveToLocalStorage(`userData_${section}`, userData[section]);
                        updateUserStats(section);
                    } else {
                        // If no data exists, create initial record
                        const initialUserData = {
                            id: section,
                            transactions: 0,
                            sales: 0,
                            purchases: 0
                        };
                        supabase
                            .from('user_data')
                            .insert(initialUserData)
                            .then(({ data, error }) => {
                                if (!error) {
                                    userData[section] = initialUserData;
                                    saveToLocalStorage(`userData_${section}`, userData[section]);
                                    updateUserStats(section);
                                }
                            });
                    }
                });
        });
    } catch (error) {
        console.error('Error loading data from Supabase:', error);
        showNotification('Error loading data from server. Using cached data.', 'warning');
    }
}

// --- EVENT LISTENERS (REFACTORED) ---
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            currentUser = session.user;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            updateUserInfo(session.user);
            
            // Initialize the app with already loaded data
            initializeApp();
            
            // Then try to sync with Supabase
            loadDataFromSupabase();
            
            // Set up online/offline listeners
            window.addEventListener('online', handleOnlineStatus);
            window.addEventListener('offline', handleOfflineStatus);
        } else {
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('mainApp').style.display = 'none';
        }
    });
    
    // Login form
    const emailLoginForm = document.getElementById('emailLoginForm');
    if (emailLoginForm) {
        emailLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorElement = document.getElementById('email-login-error');
            const loginBtn = document.getElementById('emailLoginBtn');
            
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.textContent = 'Signing In...';
            }
            
            supabase.auth.signInWithPassword({ email, password })
                .then(({ data, error }) => {
                    if (error) {
                        if (errorElement) errorElement.textContent = error.message;
                        if (loginBtn) {
                            loginBtn.disabled = false;
                            loginBtn.textContent = 'Sign In';
                        }
                    }
                })
                .catch(error => {
                    if (errorElement) errorElement.textContent = error.message;
                    if (loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.textContent = 'Sign In';
                    }
                });
        });
    }

    // Forgot password
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            const forgotPasswordModal = document.getElementById('forgotPasswordModal');
            if (forgotPasswordModal) forgotPasswordModal.classList.add('active');
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            supabase.auth.signOut();
        });
    }

    // Modal close buttons
    document.querySelectorAll('.js-modal-close').forEach(button => {
        button.addEventListener('click', () => {
            const targetModal = button.getAttribute('data-target');
            closeModal(targetModal);
        });
    });

    // Add item button
    document.querySelectorAll('.js-add-item-btn').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.getAttribute('data-section');
            showAddItemModal(section);
        });
    });

    // Add inventory button
    document.querySelectorAll('.js-add-inventory-btn').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.getAttribute('data-section');
            showAddInventoryModal(section);
        });
    });

    // Add supplier button
    document.querySelectorAll('.js-add-supplier-btn').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.getAttribute('data-section');
            showAddSupplierModal(section);
        });
    });

    // Add purchase order button
    document.querySelectorAll('.js-add-purchase-order-btn').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.getAttribute('data-section');
            showAddPurchaseOrderModal(section);
        });
    });

    // Checkout button
    document.querySelectorAll('.js-checkout-btn').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.getAttribute('data-section');
            processCheckout(section);
        });
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.getAttribute('data-section');
            const filter = button.getAttribute('data-filter');
            
            // Handle total inventory filter buttons (no section attribute)
            if (!section) {
                document.querySelectorAll('.filter-btn:not([data-section])').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentFilter = filter;
                loadTotalInventoryTable();
                return;
            }
            
            document.querySelectorAll(`[data-section="${section}"].filter-btn`).forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentFilter = filter;
            loadInventoryTable(section);
        });
    });

    // Total inventory search
    const totalInventorySearch = document.getElementById('total-inventory-search');
    if (totalInventorySearch) {
        totalInventorySearch.addEventListener('input', function() {
            filterTotalInventory(this.value);
        });
    }

    // Modal confirm buttons
    const addItemConfirmBtn = document.querySelector('.js-add-item-confirm-btn');
    if (addItemConfirmBtn) addItemConfirmBtn.addEventListener('click', addNewItem);
    
    const addInventoryConfirmBtn = document.querySelector('.js-add-inventory-confirm-btn');
    if (addInventoryConfirmBtn) addInventoryConfirmBtn.addEventListener('click', addNewInventory);
    
    const addSupplierConfirmBtn = document.querySelector('.js-add-supplier-confirm-btn');
    if (addSupplierConfirmBtn) addSupplierConfirmBtn.addEventListener('click', addNewSupplier);
    
    const addPurchaseOrderConfirmBtn = document.querySelector('.js-add-purchase-order-confirm-btn');
    if (addPurchaseOrderConfirmBtn) addPurchaseOrderConfirmBtn.addEventListener('click', addNewPurchaseOrder);
    
    const updateInventoryBtn = document.querySelector('.js-update-inventory-btn');
    if (updateInventoryBtn) updateInventoryBtn.addEventListener('click', updateInventoryItem);
    
    const updateSupplierBtn = document.querySelector('.js-update-supplier-btn');
    if (updateSupplierBtn) updateSupplierBtn.addEventListener('click', updateSupplier);
    
    const updatePurchaseOrderBtn = document.querySelector('.js-update-purchase-order-btn');
    if (updatePurchaseOrderBtn) updatePurchaseOrderBtn.addEventListener('click', updatePurchaseOrder);
    
    const completeCheckoutBtn = document.querySelector('.js-complete-checkout-btn');
    if (completeCheckoutBtn) completeCheckoutBtn.addEventListener('click', completeCheckout);
    
    const resetPasswordBtn = document.querySelector('.js-reset-password-btn');
    if (resetPasswordBtn) resetPasswordBtn.addEventListener('click', resetPassword);

    // Event Delegation for dynamic content
    setupEventDelegation();
});

function setupEventDelegation() {
    // Main nav tabs
    const navTabs = document.querySelector('.nav-tabs');
    if (navTabs) {
        navTabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.nav-tab');
            if (tab) {
                const section = tab.getAttribute('data-section');
                
                // Handle total inventory tab
                if (section === 'total-inventory') {
                    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    document.querySelectorAll('.section-container').forEach(s => s.classList.remove('active'));
                    const totalInventorySection = document.getElementById('total-inventory-section');
                    if (totalInventorySection) totalInventorySection.classList.add('active');
                    currentSection = 'total-inventory';
                    updateTotalInventory();
                    return;
                }
                
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.section-container').forEach(s => s.classList.remove('active'));
                const sectionElement = document.getElementById(`${section}-section`);
                if (sectionElement) sectionElement.classList.add('active');
                currentSection = section;
                resetToPOSView(section);
            }
        });
    }

    // Sub nav tabs
    document.querySelectorAll('.sub-nav').forEach(nav => {
        nav.addEventListener('click', (e) => {
            const item = e.target.closest('.sub-nav-item');
            if (item) {
                const view = item.getAttribute('data-view');
                const section = nav.closest('.section-container').id.replace('-section', '');
                
                document.querySelectorAll(`#${section}-section .sub-nav-item`).forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.querySelectorAll(`#${section}-section .view-content`).forEach(v => v.classList.remove('active'));
                
                const viewElement = document.getElementById(`${section}-${view}-view`);
                if (viewElement) viewElement.classList.add('active');
                
                currentView = view;
                if (view === 'inventory') {
                    loadInventoryTable(section);
                    updateCategoryInventorySummary(section);
                } else if (view === 'reports') {
                    updateReports(section);
                } else if (view === 'financial') {
                    updateFinancialReports(section);
                } else if (view === 'suppliers') {
                    loadSuppliersTable(section);
                } else if (view === 'purchase-orders') {
                    loadPurchaseOrdersTable(section);
                } else if (view === 'account') {
                    updateUserStats(section);
                }
            }
        });
    });

    // POS Search Results (Add to cart)
    document.querySelectorAll('.js-pos-search-results').forEach(container => {
        container.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.pos-search-result-item');
            if (resultItem) {
                const section = container.getAttribute('data-section');
                const itemId = resultItem.getAttribute('data-id');
                const item = inventory[section].find(invItem => invItem.id == itemId);
                if (item) {
                    addToCart(section, item);
                    const searchInput = document.querySelector(`.js-pos-search[data-section="${section}"]`);
                    if (searchInput) {
                        searchInput.value = '';
                        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-search"></i></div><h3 class="empty-state-title">Search for Products</h3><p class="empty-state-description">Type in the search box above to find products from your inventory.</p></div>`;
                    }
                }
            }
        });
    });

    // Cart Actions (Increment, Decrement, Remove)
    document.querySelectorAll('.js-pos-cart').forEach(cart => {
        cart.addEventListener('click', (e) => {
            const section = cart.getAttribute('data-section');
            if (e.target.closest('.quantity-btn')) {
                const btn = e.target.closest('.quantity-btn');
                const cartItem = btn.closest('.cart-item');
                const itemId = cartItem.getAttribute('data-item-id');
                if (btn.textContent === '+') incrementQuantity(section, itemId);
                else if (btn.textContent === '-') decrementQuantity(section, itemId);
            } else if (e.target.closest('.action-btn.delete')) {
                const btn = e.target.closest('.action-btn.delete');
                const cartItem = btn.closest('.cart-item');
                const itemId = cartItem.getAttribute('data-item-id');
                removeFromCart(section, itemId);
            }
        });
    });

    // Inventory Table Actions (Edit, Delete)
    document.querySelectorAll('.js-inventory-container').forEach(container => {
        container.addEventListener('click', (e) => {
            const section = container.getAttribute('data-section');
            if (e.target.closest('.action-btn')) {
                const btn = e.target.closest('.action-btn');
                const row = btn.closest('tr');
                const itemId = row.getAttribute('data-item-id');
                if (btn.classList.contains('delete')) {
                    deleteInventoryItem(section, itemId);
                } else {
                    editInventoryItem(section, itemId);
                }
            }
        });
    });

    // Suppliers Table Actions (Edit, Delete)
    document.querySelectorAll('.js-suppliers-container').forEach(container => {
        container.addEventListener('click', (e) => {
            const section = container.getAttribute('data-section');
            if (e.target.closest('.action-btn')) {
                const btn = e.target.closest('.action-btn');
                const row = btn.closest('tr');
                const itemId = row.getAttribute('data-item-id');
                if (btn.classList.contains('delete')) {
                    deleteSupplier(section, itemId);
                } else {
                    editSupplier(section, itemId);
                }
            }
        });
    });

    // Purchase Orders Table Actions (Edit, Delete, Receive)
    document.querySelectorAll('.js-purchase-orders-container').forEach(container => {
        container.addEventListener('click', (e) => {
            const section = container.getAttribute('data-section');
            if (e.target.closest('.action-btn')) {
                const btn = e.target.closest('.action-btn');
                const row = btn.closest('tr');
                const itemId = row.getAttribute('data-item-id');
                if (btn.classList.contains('delete')) {
                    deletePurchaseOrder(section, itemId);
                } else if (btn.classList.contains('receive')) {
                    receivePurchaseOrder(section, itemId);
                } else {
                    editPurchaseOrder(section, itemId);
                }
            }
        });
    });

    // Total Inventory Table Actions (Edit, Delete)
    const totalInventoryContainer = document.querySelector('.js-total-inventory-container');
    if (totalInventoryContainer) {
        totalInventoryContainer.addEventListener('click', (e) => {
            if (e.target.closest('.action-btn')) {
                const btn = e.target.closest('.action-btn');
                const row = btn.closest('tr');
                const itemId = row.getAttribute('data-item-id');
                const section = row.getAttribute('data-section');
                if (btn.classList.contains('delete')) {
                    deleteInventoryItem(section, itemId);
                } else {
                    editInventoryItem(section, itemId);
                }
            }
        });
    }
}

// --- FUNCTIONS (REFACTORED) ---
function initializeApp() {
    sections.forEach(section => {
        initializePOSSearch(section);
        updateCart(section);
        updateDepartmentStats(section);
        loadInventoryTable(section);
        updateReports(section);
        updatePurchaseReports(section);
        updateFinancialReports(section);
        loadSuppliersTable(section);
        loadPurchaseOrdersTable(section);
        updateUserStats(section);
        updateCategoryInventorySummary(section);
        
        const form = document.getElementById(`${section}-account-form`);
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                saveAccountInfo(section);
            });
        }
        
        const searchInput = document.querySelector(`.js-inventory-search[data-section="${section}"]`);
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                filterInventory(section, this.value);
            });
        }
    });
    
    // Initialize total inventory
    updateTotalInventory();
}

// CORRECTED: Complete POS Search Initialization
function initializePOSSearch(section) {
    const searchInput = document.querySelector(`.js-pos-search[data-section="${section}"]`);
    const searchResults = document.querySelector(`.js-pos-search-results[data-section="${section}"]`);
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.trim().toLowerCase();
            
            if (searchTerm.length === 0) {
                searchResults.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-search"></i>
                        </div>
                        <h3 class="empty-state-title">Search for Products</h3>
                        <p class="empty-state-description">Type in the search box above to find products from your inventory.</p>
                    </div>
                `;
                return;
            }
            
            const filteredItems = inventory[section].filter(item => 
                item.name.toLowerCase().includes(searchTerm)
            );
            
            if (filteredItems.length === 0) {
                searchResults.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-search"></i>
                        </div>
                        <h3 class="empty-state-title">No Products Found</h3>
                        <p class="empty-state-description">Try a different search term or add new products to your inventory.</p>
                    </div>
                `;
            } else {
                searchResults.innerHTML = '';
                filteredItems.forEach(item => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'pos-search-result-item';
                    resultItem.setAttribute('data-id', item.id);
                    
                    resultItem.innerHTML = `
                        <div class="pos-item-info">
                            <div class="pos-item-name">${item.name}</div>
                            <div class="pos-item-stock">Stock: ${item.stock}</div>
                        </div>
                        <div class="pos-item-price">₦${item.price.toFixed(2)}</div>
                    `;
                    
                    searchResults.appendChild(resultItem);
                });
            }
        });
    }
}

function updateCart(section) {
    const cartItemsContainer = document.querySelector(`.js-cart-items[data-section="${section}"]`);
    if (!cartItemsContainer) return;
    
    cartItemsContainer.innerHTML = '';
    let subtotal = 0;
    if (carts[section].length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <h3 class="empty-state-title">Your Cart is Empty</h3>
                <p class="empty-state-description">Search for products to add to your cart.</p>
            </div>
        `;
        const checkoutBtn = document.querySelector(`.js-checkout-btn[data-section="${section}"]`);
        if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
        carts[section].forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.setAttribute('data-item-id', item.id);
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-details">₦${item.price.toFixed(2)} × ${item.quantity}</div>
                </div>
                <div class="cart-item-actions">
                    <button class="quantity-btn">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn">+</button>
                    <button class="action-btn delete"><i class="fas fa-trash"></i></button>
                </div>
            `;
            cartItemsContainer.appendChild(cartItem);
        });
        const checkoutBtn = document.querySelector(`.js-checkout-btn[data-section="${section}"]`);
        if (checkoutBtn) checkoutBtn.disabled = false;
    }
    
    const subtotalEl = document.querySelector(`.js-subtotal[data-section="${section}"]`);
    if (subtotalEl) subtotalEl.textContent = `₦${subtotal.toFixed(2)}`;
    
    const totalEl = document.querySelector(`.js-total[data-section="${section}"]`);
    if (totalEl) totalEl.textContent = `₦${subtotal.toFixed(2)}`;
}

// CORRECTED: Complete loadInventoryTable function
function loadInventoryTable(section) {
    const inventoryContainer = document.querySelector(`.js-inventory-container[data-section="${section}"]`);
    if (!inventoryContainer) return;
    
    inventoryContainer.innerHTML = '';
    
    const searchInput = document.querySelector(`.js-inventory-search[data-section="${section}"]`);
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    let filteredItems = inventory[section];
    if (currentFilter !== 'all') {
        filteredItems = inventory[section].filter(item => {
            const status = getProductStatus(item);
            return status === currentFilter;
        });
    }
    
    if (searchTerm) {
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filteredItems.length === 0) {
        inventoryContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-warehouse"></i>
                </div>
                <h3 class="empty-state-title">${searchTerm ? 'No Products Found' : 'No Products in Inventory'}</h3>
                <p class="empty-state-description">${searchTerm ? 'Try a different search term or add new products.' : 'Start by adding products to your inventory. You can add details like name, price, stock quantity, and expiry date.'}</p>
                <button class="btn btn-primary js-add-inventory-btn" data-section="${section}">
                    <i class="fas fa-plus"></i> Add Your First Product
                </button>
            </div>
        `;
        return;
    }
    
    const inventoryTable = document.createElement('table');
    inventoryTable.className = 'inventory-table';
    
    const tableHeader = document.createElement('thead');
    tableHeader.innerHTML = `
        <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Cost</th>
            <th>Profit</th>
            <th>Stock</th>
            <th>Expiry Date</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    `;
    inventoryTable.appendChild(tableHeader);
    
    const tableBody = document.createElement('tbody');
    
    filteredItems.forEach(item => {
        const row = document.createElement('tr');
        row.setAttribute('data-item-id', item.id);
        
        const status = getProductStatus(item);
        let statusClass = '';
        let statusText = '';
        
        if (status === 'in-stock') {
            statusClass = 'status-in-stock';
            statusText = 'In Stock';
        } else if (status === 'low-stock') {
            statusClass = 'status-low-stock';
            statusText = 'Low Stock';
        } else if (status === 'out-of-stock') {
            statusClass = 'status-out-of-stock';
            statusText = 'Out of Stock';
        } else if (status === 'expired') {
            statusClass = 'status-expired';
            statusText = 'Expired';
        } else if (status === 'expiring-soon') {
            statusClass = 'status-expiring-soon';
            statusText = 'Expiring Soon';
        }
        
        const profit = item.price - (item.cost || 0);
        const profitMargin = item.price > 0 ? (profit / item.price) * 100 : 0;
        
        row.innerHTML = `
            <td>${item.name} ${item.isOffline ? '<i class="fas fa-wifi" style="color: #f39c12;" title="Pending sync"></i>' : ''}</td>
            <td>₦${item.price.toFixed(2)}</td>
            <td>₦${(item.cost || 0).toFixed(2)}</td>
            <td>₦${profit.toFixed(2)} (${profitMargin.toFixed(1)}%)</td>
            <td>${item.stock}</td>
            <td>${formatDate(item.expiry_date)}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <button class="action-btn"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete"><i class="fas fa-trash"></i></button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    inventoryTable.appendChild(tableBody);
    inventoryContainer.appendChild(inventoryTable);
}

// Load suppliers table
function loadSuppliersTable(section) {
    const suppliersContainer = document.querySelector(`.js-suppliers-container[data-section="${section}"]`);
    if (!suppliersContainer) return;
    
    suppliersContainer.innerHTML = '';
    
    if (suppliers[section].length === 0) {
        suppliersContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-truck"></i>
                </div>
                <h3 class="empty-state-title">No Suppliers Added</h3>
                <p class="empty-state-description">Start by adding suppliers to your department. You can add details like name, contact information, and products they supply.</p>
                <button class="btn btn-primary js-add-supplier-btn" data-section="${section}">
                    <i class="fas fa-plus"></i> Add Your First Supplier
                </button>
            </div>
        `;
        return;
    }
    
    const suppliersTable = document.createElement('table');
    suppliersTable.className = 'inventory-table';
    
    const tableHeader = document.createElement('thead');
    tableHeader.innerHTML = `
        <tr>
            <th>Supplier</th>
            <th>Contact</th>
            <th>Email</th>
            <th>Products</th>
            <th>Actions</th>
        </tr>
    `;
    suppliersTable.appendChild(tableHeader);
    
    const tableBody = document.createElement('tbody');
    
    suppliers[section].forEach(supplier => {
        const row = document.createElement('tr');
        row.setAttribute('data-item-id', supplier.id);
        
        row.innerHTML = `
            <td>${supplier.name} ${supplier.isOffline ? '<i class="fas fa-wifi" style="color: #f39c12;" title="Pending sync"></i>' : ''}</td>
            <td>${supplier.phone || 'N/A'}</td>
            <td>${supplier.email || 'N/A'}</td>
            <td>${supplier.products || 'N/A'}</td>
            <td>
                <button class="action-btn"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete"><i class="fas fa-trash"></i></button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    suppliersTable.appendChild(tableBody);
    suppliersContainer.appendChild(suppliersTable);
}

// Load purchase orders table
function loadPurchaseOrdersTable(section) {
    const purchaseOrdersContainer = document.querySelector(`.js-purchase-orders-container[data-section="${section}"]`);
    if (!purchaseOrdersContainer) return;
    
    purchaseOrdersContainer.innerHTML = '';
    
    if (purchaseOrders[section].length === 0) {
        purchaseOrdersContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-file-invoice"></i>
                </div>
                <h3 class="empty-state-title">No Purchase Orders</h3>
                <p class="empty-state-description">Start by creating purchase orders for your department. You can add items, quantities, and select suppliers.</p>
                <button class="btn btn-primary js-add-purchase-order-btn" data-section="${section}">
                    <i class="fas fa-plus"></i> Create Your First Purchase Order
                </button>
            </div>
        `;
        return;
    }
    
    const purchaseOrdersTable = document.createElement('table');
    purchaseOrdersTable.className = 'inventory-table';
    
    const tableHeader = document.createElement('thead');
    tableHeader.innerHTML = `
        <tr>
            <th>Order #</th>
            <th>Supplier</th>
            <th>Date</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    `;
    purchaseOrdersTable.appendChild(tableHeader);
    
    const tableBody = document.createElement('tbody');
    
    purchaseOrders[section].forEach(order => {
        const row = document.createElement('tr');
        row.setAttribute('data-item-id', order.id);
        
        let statusClass = '';
        let statusText = '';
        
        if (order.status === 'pending') {
            statusClass = 'status-pending';
            statusText = 'Pending';
        } else if (order.status === 'received') {
            statusClass = 'status-received';
            statusText = 'Received';
        } else if (order.status === 'cancelled') {
            statusClass = 'status-cancelled';
            statusText = 'Cancelled';
        }
        
        row.innerHTML = `
            <td>${order.orderNumber || order.id} ${order.isOffline ? '<i class="fas fa-wifi" style="color: #f39c12;" title="Pending sync"></i>' : ''}</td>
            <td>${order.supplierName || 'N/A'}</td>
            <td>${formatDate(order.orderDate)}</td>
            <td>₦${order.total.toFixed(2)}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <button class="action-btn"><i class="fas fa-edit"></i></button>
                ${order.status === 'pending' ? `<button class="action-btn receive"><i class="fas fa-check"></i></button>` : ''}
                <button class="action-btn delete"><i class="fas fa-trash"></i></button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    purchaseOrdersTable.appendChild(tableBody);
    purchaseOrdersContainer.appendChild(purchaseOrdersTable);
}

// Update total inventory view
function updateTotalInventory() {
    let totalProducts = 0;
    let totalValue = 0;
    let totalCost = 0;
    let totalExpired = 0;
    let totalExpiringSoon = 0;
    
    sections.forEach(section => {
        inventory[section].forEach(item => {
            totalProducts++;
            totalValue += item.price * item.stock;
            totalCost += (item.cost || 0) * item.stock;
            
            if (isExpired(item.expiry_date)) {
                totalExpired++;
            } else if (isExpiringSoon(item.expiry_date)) {
                totalExpiringSoon++;
            }
        });
    });
    
    const totalProfit = totalValue - totalCost;
    const profitMargin = totalValue > 0 ? (totalProfit / totalValue) * 100 : 0;
    
    const totalProductsEl = document.getElementById('total-products');
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    
    const totalValueEl = document.getElementById('total-value');
    if (totalValueEl) totalValueEl.textContent = `₦${totalValue.toFixed(2)}`;
    
    const totalCostEl = document.getElementById('total-cost');
    if (totalCostEl) totalCostEl.textContent = `₦${totalCost.toFixed(2)}`;
    
    const totalProfitEl = document.getElementById('total-profit');
    if (totalProfitEl) totalProfitEl.textContent = `₦${totalProfit.toFixed(2)}`;
    
    const profitMarginEl = document.getElementById('total-profit-margin');
    if (profitMarginEl) profitMarginEl.textContent = `${profitMargin.toFixed(1)}%`;
    
    const totalExpiredEl = document.getElementById('total-expired');
    if (totalExpiredEl) totalExpiredEl.textContent = totalExpired;
    
    const totalExpiringSoonEl = document.getElementById('total-expiring-soon');
    if (totalExpiringSoonEl) totalExpiringSoonEl.textContent = totalExpiringSoon;
    
    loadTotalInventoryTable();
}

// Load total inventory table
function loadTotalInventoryTable() {
    const inventoryContainer = document.querySelector('.js-total-inventory-container');
    if (!inventoryContainer) return;
    
    inventoryContainer.innerHTML = '';
    
    const searchInput = document.getElementById('total-inventory-search');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    // Combine all inventory items
    let allItems = [];
    sections.forEach(section => {
        inventory[section].forEach(item => {
            allItems.push({ ...item, section });
        });
    });
    
    // Filter items
    let filteredItems = allItems;
    if (currentFilter !== 'all') {
        filteredItems = allItems.filter(item => {
            const status = getProductStatus(item);
            return status === currentFilter;
        });
    }
    
    if (searchTerm) {
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filteredItems.length === 0) {
        inventoryContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-warehouse"></i>
                </div>
                <h3 class="empty-state-title">${searchTerm ? 'No Products Found' : 'No Products in Inventory'}</h3>
                <p class="empty-state-description">${searchTerm ? 'Try a different search term.' : 'Start by adding products to your inventory.'}</p>
            </div>
        `;
        return;
    }
    
    const inventoryTable = document.createElement('table');
    inventoryTable.className = 'inventory-table';
    
    const tableHeader = document.createElement('thead');
    tableHeader.innerHTML = `
        <tr>
            <th>Product</th>
            <th>Department</th>
            <th>Price</th>
            <th>Cost</th>
            <th>Profit</th>
            <th>Stock</th>
            <th>Expiry Date</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    `;
    inventoryTable.appendChild(tableHeader);
    
    const tableBody = document.createElement('tbody');
    
    filteredItems.forEach(item => {
        const row = document.createElement('tr');
        row.setAttribute('data-item-id', item.id);
        row.setAttribute('data-section', item.section);
        
        const status = getProductStatus(item);
        let statusClass = '';
        let statusText = '';
        
        if (status === 'in-stock') {
            statusClass = 'status-in-stock';
            statusText = 'In Stock';
        } else if (status === 'low-stock') {
            statusClass = 'status-low-stock';
            statusText = 'Low Stock';
        } else if (status === 'out-of-stock') {
            statusClass = 'status-out-of-stock';
            statusText = 'Out of Stock';
        } else if (status === 'expired') {
            statusClass = 'status-expired';
            statusText = 'Expired';
        } else if (status === 'expiring-soon') {
            statusClass = 'status-expiring-soon';
            statusText = 'Expiring Soon';
        }
        
        const profit = item.price - (item.cost || 0);
        const profitMargin = item.price > 0 ? (profit / item.price) * 100 : 0;
        
        let sectionColor = '';
        if (item.section === 'grill') sectionColor = 'var(--grill-color)';
        else if (item.section === 'wholesale') sectionColor = 'var(--wholesale-color)';
        else if (item.section === 'building') sectionColor = 'var(--building-color)';
        else if (item.section === 'food') sectionColor = 'var(--food-color)';
        
        row.innerHTML = `
            <td>${item.name} ${item.isOffline ? '<i class="fas fa-wifi" style="color: #f39c12;" title="Pending sync"></i>' : ''}</td>
            <td><span style="color: ${sectionColor}; font-weight: 600;">${sectionNames[item.section]}</span></td>
            <td>₦${item.price.toFixed(2)}</td>
            <td>₦${(item.cost || 0).toFixed(2)}</td>
            <td>₦${profit.toFixed(2)} (${profitMargin.toFixed(1)}%)</td>
            <td>${item.stock}</td>
            <td>${formatDate(item.expiry_date)}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <button class="action-btn"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete"><i class="fas fa-trash"></i></button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    inventoryTable.appendChild(tableBody);
    inventoryContainer.appendChild(inventoryTable);
}

// Filter total inventory
function filterTotalInventory(searchTerm) {
    loadTotalInventoryTable();
}

function resetPassword() {
    const email = document.getElementById('resetEmail').value;
    const errorElement = document.getElementById('reset-password-error');
    const successElement = document.getElementById('reset-password-success');
    
    supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
    })
    .then(({ data, error }) => {
        if (error) {
            if (errorElement) errorElement.textContent = error.message;
            if (successElement) successElement.textContent = '';
        } else {
            if (successElement) successElement.textContent = 'Password reset email sent. Check your inbox.';
            if (errorElement) errorElement.textContent = '';
        }
    });
}

function showAddItemModal(section) {
    const modal = document.getElementById('addItemModal');
    if (modal) {
        document.getElementById('addItemForm').reset();
        modal.setAttribute('data-section', section);
        modal.classList.add('active');
    }
}

function addNewItem() {
    const modal = document.getElementById('addItemModal');
    if (!modal) return;
    
    const section = modal.getAttribute('data-section');
    const name = document.getElementById('addItemName').value;
    const price = parseFloat(document.getElementById('addItemPrice').value);
    const cost = parseFloat(document.getElementById('addItemCost').value) || 0;
    const stock = parseInt(document.getElementById('addItemStock').value);
    const expiryDate = document.getElementById('addItemExpiry').value;
    const newItem = { 
        section, 
        name, 
        price, 
        cost,
        stock, 
        expiry_date: expiryDate,
        status: stock > 10 ? 'in-stock' : (stock > 0 ? 'low-stock' : 'out-of-stock'), 
        created_by: currentUser ? currentUser.id : 'offline_user',
        created_at: new Date().toISOString()
    };
    
    saveDataToSupabase('inventory', newItem).then(() => {
        modal.classList.remove('active');
        showNotification(`${name} added successfully${navigator.onLine ? '' : ' (will sync when online)'}`, 'success');
    }).catch(error => {
        console.error('Error adding item:', error);
        showNotification('Error adding item', 'error');
    });
}

function showAddInventoryModal(section) {
    const modal = document.getElementById('addInventoryModal');
    if (modal) {
        document.getElementById('addInventoryForm').reset();
        modal.setAttribute('data-section', section);
        modal.classList.add('active');
    }
}

function addNewInventory() {
    const modal = document.getElementById('addInventoryModal');
    if (!modal) return;
    
    const section = modal.getAttribute('data-section');
    const name = document.getElementById('addInventoryName').value;
    const price = parseFloat(document.getElementById('addInventoryPrice').value);
    const cost = parseFloat(document.getElementById('addInventoryCost').value) || 0;
    const stock = parseInt(document.getElementById('addInventoryStock').value);
    const expiryDate = document.getElementById('addInventoryExpiry').value;
    const description = document.getElementById('addInventoryDescription').value;
    const newItem = { 
        section, 
        name, 
        price, 
        cost,
        stock, 
        expiry_date: expiryDate,
        description, 
        status: stock > 10 ? 'in-stock' : (stock > 0 ? 'low-stock' : 'out-of-stock'), 
        created_by: currentUser ? currentUser.id : 'offline_user',
        created_at: new Date().toISOString()
    };
    
    saveDataToSupabase('inventory', newItem).then(() => {
        modal.classList.remove('active');
        showNotification(`${name} added successfully${navigator.onLine ? '' : ' (will sync when online)'}`, 'success');
    }).catch(error => {
        console.error('Error adding item:', error);
        showNotification('Error adding item', 'error');
    });
}

function showAddSupplierModal(section) {
    const modal = document.getElementById('addSupplierModal');
    if (modal) {
        document.getElementById('addSupplierForm').reset();
        modal.setAttribute('data-section', section);
        modal.classList.add('active');
    }
}

function addNewSupplier() {
    const modal = document.getElementById('addSupplierModal');
    if (!modal) return;
    
    const section = modal.getAttribute('data-section');
    const name = document.getElementById('addSupplierName').value;
    const phone = document.getElementById('addSupplierPhone').value;
    const email = document.getElementById('addSupplierEmail').value;
    const address = document.getElementById('addSupplierAddress').value;
    const products = document.getElementById('addSupplierProducts').value;
    const newSupplier = { 
        section, 
        name, 
        phone, 
        email,
        address,
        products,
        created_by: currentUser ? currentUser.id : 'offline_user',
        created_at: new Date().toISOString()
    };
    
    saveDataToSupabase('suppliers', newSupplier).then(() => {
        modal.classList.remove('active');
        showNotification(`${name} added successfully${navigator.onLine ? '' : ' (will sync when online)'}`, 'success');
    }).catch(error => {
        console.error('Error adding supplier:', error);
        showNotification('Error adding supplier', 'error');
    });
}

function showAddPurchaseOrderModal(section) {
    const modal = document.getElementById('addPurchaseOrderModal');
    if (modal) {
        document.getElementById('addPurchaseOrderForm').reset();
        
        // Populate supplier dropdown
        const supplierSelect = document.getElementById('addPurchaseOrderSupplier');
        if (supplierSelect) {
            supplierSelect.innerHTML = '<option value="">Select Supplier</option>';
            
            suppliers[section].forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.textContent = supplier.name;
                supplierSelect.appendChild(option);
            });
        }
        
        // Populate product dropdown
        const productSelect = document.getElementById('addPurchaseOrderProduct');
        if (productSelect) {
            productSelect.innerHTML = '<option value="">Select Product</option>';
            
            inventory[section].forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = `${item.name} (Current Stock: ${item.stock})`;
                productSelect.appendChild(option);
            });
        }
        
        modal.setAttribute('data-section', section);
        modal.classList.add('active');
    }
}

function addNewPurchaseOrder() {
    const modal = document.getElementById('addPurchaseOrderModal');
    if (!modal) return;
    
    const section = modal.getAttribute('data-section');
    const supplierId = document.getElementById('addPurchaseOrderSupplier').value;
    const productId = document.getElementById('addPurchaseOrderProduct').value;
    const quantity = parseInt(document.getElementById('addPurchaseOrderQuantity').value);
    const cost = parseFloat(document.getElementById('addPurchaseOrderCost').value);
    const orderDate = document.getElementById('addPurchaseOrderDate').value || new Date().toISOString().split('T')[0];
    
    const supplier = suppliers[section].find(s => s.id === supplierId);
    const product = inventory[section].find(p => p.id === productId);
    
    if (!supplier || !product) {
        showNotification('Please select a valid supplier and product', 'error');
        return;
    }
    
    const total = cost * quantity;
    const orderNumber = `PO-${Date.now()}`;
    
    const newPurchaseOrder = { 
        section, 
        orderNumber,
        supplierId,
        supplierName: supplier.name,
        productId,
        productName: product.name,
        quantity,
        cost,
        total,
        orderDate,
        status: 'pending',
        created_by: currentUser ? currentUser.id : 'offline_user',
        created_at: new Date().toISOString()
    };
    
    saveDataToSupabase('purchase_orders', newPurchaseOrder).then(() => {
        modal.classList.remove('active');
        showNotification(`Purchase order ${orderNumber} created successfully${navigator.onLine ? '' : ' (will sync when online)'}`, 'success');
    }).catch(error => {
        console.error('Error creating purchase order:', error);
        showNotification('Error creating purchase order', 'error');
    });
}

function editInventoryItem(section, itemId) {
    const item = inventory[section].find(invItem => invItem.id === itemId);
    if (!item) return;
    
    document.getElementById('editInventoryName').value = item.name;
    document.getElementById('editInventoryPrice').value = item.price;
    document.getElementById('editInventoryCost').value = item.cost || 0;
    document.getElementById('editInventoryStock').value = item.stock;
    document.getElementById('editInventoryExpiry').value = item.expiry_date || '';
    document.getElementById('editInventoryDescription').value = item.description || '';
    
    const editModal = document.getElementById('editInventoryModal');
    if (editModal) {
        editModal.setAttribute('data-section', section);
        editModal.setAttribute('data-item-id', itemId);
        editModal.classList.add('active');
    }
}

function updateInventoryItem() {
    const editModal = document.getElementById('editInventoryModal');
    if (!editModal) return;
    
    const section = editModal.getAttribute('data-section');
    const itemId = editModal.getAttribute('data-item-id');
    const name = document.getElementById('editInventoryName').value;
    const price = parseFloat(document.getElementById('editInventoryPrice').value);
    const cost = parseFloat(document.getElementById('editInventoryCost').value) || 0;
    const stock = parseInt(document.getElementById('editInventoryStock').value);
    const expiryDate = document.getElementById('editInventoryExpiry').value;
    const description = document.getElementById('editInventoryDescription').value;
    const item = inventory[section].find(invItem => invItem.id === itemId);
    
    if (!item) return;
    
    const updatedItem = {
        ...item,
        name, 
        price, 
        cost,
        stock, 
        expiry_date: expiryDate,
        description,
        status: stock > 10 ? 'in-stock' : (stock > 0 ? 'low-stock' : 'out-of-stock'),
        updated_by: currentUser ? currentUser.id : 'offline_user',
        updated_at: new Date().toISOString()
    };
    
    saveDataToSupabase('inventory', updatedItem, itemId).then(() => {
        editModal.classList.remove('active');
        showNotification(`${name} updated successfully${navigator.onLine ? '' : ' (will sync when online)'}`, 'success');
    }).catch(error => {
        console.error('Error updating item:', error);
        showNotification('Error updating item', 'error');
    });
}

function editSupplier(section, supplierId) {
    const supplier = suppliers[section].find(s => s.id === supplierId);
    if (!supplier) return;
    
    document.getElementById('editSupplierName').value = supplier.name;
    document.getElementById('editSupplierPhone').value = supplier.phone || '';
    document.getElementById('editSupplierEmail').value = supplier.email || '';
    document.getElementById('editSupplierAddress').value = supplier.address || '';
    document.getElementById('editSupplierProducts').value = supplier.products || '';
    
    const editModal = document.getElementById('editSupplierModal');
    if (editModal) {
        editModal.setAttribute('data-section', section);
        editModal.setAttribute('data-item-id', supplierId);
        editModal.classList.add('active');
    }
}

function updateSupplier() {
    const editModal = document.getElementById('editSupplierModal');
    if (!editModal) return;
    
    const section = editModal.getAttribute('data-section');
    const supplierId = editModal.getAttribute('data-item-id');
    const name = document.getElementById('editSupplierName').value;
    const phone = document.getElementById('editSupplierPhone').value;
    const email = document.getElementById('editSupplierEmail').value;
    const address = document.getElementById('editSupplierAddress').value;
    const products = document.getElementById('editSupplierProducts').value;
    const supplier = suppliers[section].find(s => s.id === supplierId);
    
    if (!supplier) return;
    
    const updatedSupplier = {
        ...supplier,
        name, 
        phone,
        email,
        address,
        products,
        updated_by: currentUser ? currentUser.id : 'offline_user',
        updated_at: new Date().toISOString()
    };
    
    saveDataToSupabase('suppliers', updatedSupplier, supplierId).then(() => {
        editModal.classList.remove('active');
        showNotification(`${name} updated successfully${navigator.onLine ? '' : ' (will sync when online)'}`, 'success');
    }).catch(error => {
        console.error('Error updating supplier:', error);
        showNotification('Error updating supplier', 'error');
    });
}

function editPurchaseOrder(section, orderId) {
    const order = purchaseOrders[section].find(o => o.id === orderId);
    if (!order) return;
    
    document.getElementById('editPurchaseOrderQuantity').value = order.quantity;
    document.getElementById('editPurchaseOrderCost').value = order.cost;
    document.getElementById('editPurchaseOrderStatus').value = order.status;
    
    const editModal = document.getElementById('editPurchaseOrderModal');
    if (editModal) {
        editModal.setAttribute('data-section', section);
        editModal.setAttribute('data-item-id', orderId);
        editModal.classList.add('active');
    }
}

function updatePurchaseOrder() {
    const editModal = document.getElementById('editPurchaseOrderModal');
    if (!editModal) return;
    
    const section = editModal.getAttribute('data-section');
    const orderId = editModal.getAttribute('data-item-id');
    const quantity = parseInt(document.getElementById('editPurchaseOrderQuantity').value);
    const cost = parseFloat(document.getElementById('editPurchaseOrderCost').value);
    const status = document.getElementById('editPurchaseOrderStatus').value;
    const order = purchaseOrders[section].find(o => o.id === orderId);
    
    if (!order) return;
    
    const total = cost * quantity;
    const updatedOrder = {
        ...order,
        quantity,
        cost,
        total,
        status,
        updated_by: currentUser ? currentUser.id : 'offline_user',
        updated_at: new Date().toISOString()
    };
    
    saveDataToSupabase('purchase_orders', updatedOrder, orderId).then(() => {
        editModal.classList.remove('active');
        showNotification(`Purchase order updated successfully${navigator.onLine ? '' : ' (will sync when online)'}`, 'success');
    }).catch(error => {
        console.error('Error updating purchase order:', error);
        showNotification('Error updating purchase order', 'error');
    });
}

function receivePurchaseOrder(section, orderId) {
    const order = purchaseOrders[section].find(o => o.id === orderId);
    if (!order) return;
    
    const product = inventory[section].find(p => p.id === order.productId);
    if (!product) return;
    
    // Update product stock and cost
    product.stock += order.quantity;
    product.cost = order.cost;
    product.status = getProductStatus(product);
    
    // Update order status
    order.status = 'received';
    order.receivedDate = new Date().toISOString().split('T')[0];
    
    // Save both changes
    Promise.all([
        saveDataToSupabase('inventory', product, product.id),
        saveDataToSupabase('purchase_orders', order, orderId)
    ]).then(() => {
        showNotification(`Purchase order received successfully. Stock updated for ${product.name}`, 'success');
    }).catch(error => {
        console.error('Error receiving purchase order:', error);
        showNotification('Error receiving purchase order', 'error');
    });
}

function deleteInventoryItem(section, itemId) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    const item = inventory[section].find(invItem => invItem.id === itemId);
    if (!item) return;
    
    // Mark as deleted locally
    item.deleted = true;
    item.deleted_at = new Date().toISOString();
    
    saveDataToSupabase('inventory', item, itemId).then(() => {
        inventory[section] = inventory[section].filter(invItem => invItem.id !== itemId);
        saveToLocalStorage(`inventory_${section}`, inventory[section]);
        loadInventoryTable(section);
        updateDepartmentStats(section);
        updateCategoryInventorySummary(section);
        updateTotalInventory();
        showNotification('Item deleted successfully', 'success');
    }).catch(error => {
        console.error('Error deleting item:', error);
        showNotification('Error deleting item', 'error');
    });
}

function deleteSupplier(section, supplierId) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    
    const supplier = suppliers[section].find(s => s.id === supplierId);
    if (!supplier) return;
    
    // Mark as deleted locally
    supplier.deleted = true;
    supplier.deleted_at = new Date().toISOString();
    
    saveDataToSupabase('suppliers', supplier, supplierId).then(() => {
        suppliers[section] = suppliers[section].filter(s => s.id !== supplierId);
        saveToLocalStorage(`suppliers_${section}`, suppliers[section]);
        loadSuppliersTable(section);
        showNotification('Supplier deleted successfully', 'success');
    }).catch(error => {
        console.error('Error deleting supplier:', error);
        showNotification('Error deleting supplier', 'error');
    });
}

function deletePurchaseOrder(section, orderId) {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;
    
    const order = purchaseOrders[section].find(o => o.id === orderId);
    if (!order) return;
    
    // Mark as deleted locally
    order.deleted = true;
    order.deleted_at = new Date().toISOString();
    
    saveDataToSupabase('purchase_orders', order, orderId).then(() => {
        purchaseOrders[section] = purchaseOrders[section].filter(o => o.id !== orderId);
        saveToLocalStorage(`purchaseOrders_${section}`, purchaseOrders[section]);
        loadPurchaseOrdersTable(section);
        showNotification('Purchase order deleted successfully', 'success');
    }).catch(error => {
        console.error('Error deleting purchase order:', error);
        showNotification('Error deleting purchase order', 'error');
    });
}

// FIXED: Enhanced cart functions to save to localStorage
function addToCart(section, item) {
    if (item.stock <= 0) { 
        showNotification(`${item.name} is out of stock`, 'error'); 
        return; 
    }
    
    const existingItem = carts[section].find(cartItem => cartItem.id === item.id);
    if (existingItem) {
        if (existingItem.quantity >= item.stock) { 
            showNotification(`Cannot add more ${item.name}. Only ${item.stock} in stock.`, 'warning'); 
            return; 
        }
        existingItem.quantity += 1;
    } else {
        carts[section].push({ id: item.id, name: item.name, price: item.price, quantity: 1 });
    }
    
    // Save cart to local storage
    saveToLocalStorage(`cart_${section}`, carts[section]);
    
    updateCart(section); 
    showNotification(`${item.name} added to cart`, 'success');
}

function incrementQuantity(section, itemId) {
    const item = carts[section].find(cartItem => cartItem.id === itemId);
    const inventoryItem = inventory[section].find(invItem => invItem.id === itemId);
    if (item && inventoryItem && item.quantity < inventoryItem.stock) { 
        item.quantity += 1; 
        
        // Save cart to local storage
        saveToLocalStorage(`cart_${section}`, carts[section]);
        
        updateCart(section); 
    }
    else if (item && inventoryItem) { 
        showNotification(`Cannot add more ${item.name}. Only ${inventoryItem.stock} in stock.`, 'warning'); 
    }
}

function decrementQuantity(section, itemId) {
    const item = carts[section].find(cartItem => cartItem.id === itemId);
    if (item && item.quantity > 1) { 
        item.quantity -= 1; 
        
        // Save cart to local storage
        saveToLocalStorage(`cart_${section}`, carts[section]);
        
        updateCart(section); 
    }
}

function removeFromCart(section, itemId) {
    carts[section] = carts[section].filter(cartItem => cartItem.id !== itemId);
    
    // Save cart to local storage
    saveToLocalStorage(`cart_${section}`, carts[section]);
    
    updateCart(section);
}

function processCheckout(section) {
    if (carts[section].length === 0) { 
        showNotification('Your cart is empty', 'error'); 
        return; 
    }
    const checkoutModal = document.getElementById('checkoutModal');
    if (!checkoutModal) return;
    
    const checkoutSummary = document.getElementById('checkout-summary');
    let subtotal = 0; 
    let totalCost = 0;
    let summaryHTML = '<table class="inventory-table">';
    carts[section].forEach(item => {
        const itemTotal = item.price * item.quantity; 
        subtotal += itemTotal;
        
        const inventoryItem = inventory[section].find(invItem => invItem.id === item.id);
        const itemCost = inventoryItem ? (inventoryItem.cost || 0) * item.quantity : 0;
        totalCost += itemCost;
        
        summaryHTML += `<tr><td>${item.name}</td><td>₦${item.price.toFixed(2)}</td><td>₦${(itemCost / item.quantity).toFixed(2)}</td><td>${item.quantity}</td><td>₦${itemTotal.toFixed(2)}</td></tr>`;
    });
    const totalProfit = subtotal - totalCost;
    const profitMargin = subtotal > 0 ? (totalProfit / subtotal) * 100 : 0;
    summaryHTML += `<tr><td colspan="4" class="total-label">Total</td><td>₦${subtotal.toFixed(2)}</td></tr>`;
    summaryHTML += `<tr><td colspan="4" class="total-label">Cost</td><td>₦${totalCost.toFixed(2)}</td></tr>`;
    summaryHTML += `<tr><td colspan="4" class="total-label">Profit</td><td>₦${totalProfit.toFixed(2)} (${profitMargin.toFixed(1)}%)</td></tr></table>`;
    checkoutSummary.innerHTML = summaryHTML;
    checkoutModal.setAttribute('data-section', section);
    checkoutModal.classList.add('active');
}

// FIXED: Enhanced completeCheckout function
function completeCheckout() {
    const checkoutModal = document.getElementById('checkoutModal');
    if (!checkoutModal) return;
    
    const section = checkoutModal.getAttribute('data-section');
    let subtotal = 0; 
    let totalCost = 0;
    const saleItems = [];
    
    carts[section].forEach(item => {
        const itemTotal = item.price * item.quantity; 
        subtotal += itemTotal;
        
        const inventoryItem = inventory[section].find(invItem => invItem.id === item.id);
        const itemCost = inventoryItem ? (inventoryItem.cost || 0) * item.quantity : 0;
        totalCost += itemCost;
        
        saleItems.push({ 
            id: item.id, 
            name: item.name, 
            price: item.price, 
            cost: inventoryItem ? inventoryItem.cost || 0 : 0,
            quantity: item.quantity, 
            total: itemTotal,
            itemCost: itemCost
        });
        
        if (inventoryItem) {
            inventoryItem.stock -= item.quantity;
            inventoryItem.status = getProductStatus(inventoryItem);
            saveToLocalStorage(`inventory_${section}`, inventory[section]);
            saveDataToSupabase('inventory', inventoryItem, inventoryItem.id).catch(error => console.error('Error updating inventory:', error));
        }
    });
    
    const totalProfit = subtotal - totalCost;
    const profitMargin = subtotal > 0 ? (totalProfit / subtotal) * 100 : 0;
    
    const saleRecord = {
        user_id: currentUser ? currentUser.id : 'offline_user', 
        user_email: currentUser ? currentUser.email : 'offline@example.com', 
        section, 
        items: saleItems, 
        subtotal, 
        total: subtotal,
        totalCost,
        totalProfit,
        profitMargin,
        payment_method: document.getElementById('paymentMethod').value,
        customer_name: document.getElementById('customerName').value,
        customer_phone: document.getElementById('customerPhone').value,
        timestamp: new Date().toISOString()
    };
    
    saveDataToSupabase('sales', saleRecord).then(() => {
        // Update sales data
        salesData[section].totalSales += subtotal; 
        salesData[section].totalTransactions += 1;
        salesData[section].avgTransaction = salesData[section].totalSales / salesData[section].totalTransactions;
        salesData[section].dailySales += subtotal; 
        salesData[section].dailyTransactions += 1;
        salesData[section].profit += totalProfit;
        salesData[section].profitMargin = salesData[section].totalSales > 0 ? 
            (salesData[section].profit / salesData[section].totalSales) * 100 : 0;
        
        userData[section].transactions += 1; 
        userData[section].sales += subtotal;
        
        // Save updated stats
        saveDataToSupabase('sales_data', salesData[section], section);
        saveDataToSupabase('user_data', userData[section], section);
        
        // Clear cart and remove from local storage
        carts[section] = [];
        saveToLocalStorage(`cart_${section}`, []);
        
        updateCart(section); 
        loadInventoryTable(section); 
        updateReports(section);
        updateFinancialReports(section);
        updateUserStats(section); 
        updateDepartmentStats(section);
        updateCategoryInventorySummary(section);
        updateTotalInventory();
        checkoutModal.classList.remove('active');
        showNotification(`Sale completed successfully${navigator.onLine ? '' : ' (will sync when online)'}`, 'success');
    }).catch(error => {
        console.error('Error saving sale:', error); 
        showNotification('Error saving sale. Please try again.', 'error');
    });
}

function filterInventory(section, searchTerm) { 
    loadInventoryTable(section); 
}

// FIXED: Added null checks to prevent toFixed() errors
function updateReports(section) {
    // Ensure all values exist and are numbers before calling toFixed()
    const totalSales = salesData[section]?.totalSales || 0;
    const avgTransaction = salesData[section]?.avgTransaction || 0;
    const profit = salesData[section]?.profit || 0;
    const profitMargin = salesData[section]?.profitMargin || 0;
    
    const totalSalesEl = document.getElementById(`${section}-total-sales`);
    if (totalSalesEl) totalSalesEl.textContent = `₦${totalSales.toFixed(2)}`;
    
    const totalTransactionsEl = document.getElementById(`${section}-total-transactions`);
    if (totalTransactionsEl) totalTransactionsEl.textContent = salesData[section]?.totalTransactions || 0;
    
    const avgTransactionEl = document.getElementById(`${section}-avg-transaction`);
    if (avgTransactionEl) avgTransactionEl.textContent = `₦${avgTransaction.toFixed(2)}`;
    
    const topItemEl = document.getElementById(`${section}-top-item`);
    if (topItemEl) topItemEl.textContent = salesData[section]?.topItem || '-';
    
    const totalProfitEl = document.getElementById(`${section}-total-profit`);
    if (totalProfitEl) totalProfitEl.textContent = `₦${profit.toFixed(2)}`;
    
    const profitMarginEl = document.getElementById(`${section}-profit-margin`);
    if (profitMarginEl) profitMarginEl.textContent = `${profitMargin.toFixed(1)}%`;
}

// FIXED: Added null checks to prevent toFixed() errors
function updatePurchaseReports(section) {
    // Ensure all values exist and are numbers before calling toFixed()
    const totalPurchases = purchaseData[section]?.totalPurchases || 0;
    const avgTransaction = purchaseData[section]?.avgTransaction || 0;
    
    const totalPurchasesEl = document.getElementById(`${section}-total-purchases`);
    if (totalPurchasesEl) totalPurchasesEl.textContent = `₦${totalPurchases.toFixed(2)}`;
    
    const totalTransactionsEl = document.getElementById(`${section}-total-purchase-transactions`);
    if (totalTransactionsEl) totalTransactionsEl.textContent = purchaseData[section]?.totalTransactions || 0;
    
    const avgTransactionEl = document.getElementById(`${section}-avg-purchase-transaction`);
    if (avgTransactionEl) avgTransactionEl.textContent = `₦${avgTransaction.toFixed(2)}`;
    
    const topSupplierEl = document.getElementById(`${section}-top-supplier`);
    if (topSupplierEl) topSupplierEl.textContent = purchaseData[section]?.topSupplier || '-';
}

// FIXED: Added null checks to prevent toFixed() errors
function updateFinancialReports(section) {
    // Calculate financial metrics
    const totalSales = salesData[section]?.totalSales || 0;
    const totalPurchases = purchaseData[section]?.totalPurchases || 0;
    const totalProfit = salesData[section]?.profit || 0;
    const profitMargin = salesData[section]?.profitMargin || 0;
    
    // Calculate inventory value and cost
    let inventoryValue = 0;
    let inventoryCost = 0;
    
    inventory[section].forEach(item => {
        inventoryValue += item.price * item.stock;
        inventoryCost += (item.cost || 0) * item.stock;
    });
    
    const inventoryProfit = inventoryValue - inventoryCost;
    const inventoryProfitMargin = inventoryValue > 0 ? (inventoryProfit / inventoryValue) * 100 : 0;
    
    // Update financial report elements
    const financialTotalSalesEl = document.getElementById(`${section}-financial-total-sales`);
    if (financialTotalSalesEl) financialTotalSalesEl.textContent = `₦${totalSales.toFixed(2)}`;
    
    const financialTotalPurchasesEl = document.getElementById(`${section}-financial-total-purchases`);
    if (financialTotalPurchasesEl) financialTotalPurchasesEl.textContent = `₦${totalPurchases.toFixed(2)}`;
    
    const financialTotalProfitEl = document.getElementById(`${section}-financial-total-profit`);
    if (financialTotalProfitEl) financialTotalProfitEl.textContent = `₦${totalProfit.toFixed(2)}`;
    
    const financialProfitMarginEl = document.getElementById(`${section}-financial-profit-margin`);
    if (financialProfitMarginEl) financialProfitMarginEl.textContent = `${profitMargin.toFixed(1)}%`;
    
    const financialInventoryValueEl = document.getElementById(`${section}-financial-inventory-value`);
    if (financialInventoryValueEl) financialInventoryValueEl.textContent = `₦${inventoryValue.toFixed(2)}`;
    
    const financialInventoryCostEl = document.getElementById(`${section}-financial-inventory-cost`);
    if (financialInventoryCostEl) financialInventoryCostEl.textContent = `₦${inventoryCost.toFixed(2)}`;
    
    const financialInventoryProfitEl = document.getElementById(`${section}-financial-inventory-profit`);
    if (financialInventoryProfitEl) financialInventoryProfitEl.textContent = `₦${inventoryProfit.toFixed(2)}`;
    
    const financialInventoryProfitMarginEl = document.getElementById(`${section}-financial-inventory-profit-margin`);
    if (financialInventoryProfitMarginEl) financialInventoryProfitMarginEl.textContent = `${inventoryProfitMargin.toFixed(1)}%`;
}

function updateUserStats(section) {
    // Ensure all values exist and are numbers before calling toFixed()
    const sales = userData[section]?.sales || 0;
    const purchases = userData[section]?.purchases || 0;
    
    const transactionsEl = document.getElementById(`${section}-user-transactions`);
    if (transactionsEl) transactionsEl.textContent = userData[section]?.transactions || 0;
    
    const salesEl = document.getElementById(`${section}-user-sales`);
    if (salesEl) salesEl.textContent = `₦${sales.toFixed(2)}`;
    
    const purchasesEl = document.getElementById(`${section}-user-purchases`);
    if (purchasesEl) purchasesEl.textContent = `₦${purchases.toFixed(2)}`;
    
    const netEl = document.getElementById(`${section}-user-net`);
    if (netEl) netEl.textContent = `₦${(sales - purchases).toFixed(2)}`;
}

// FIXED: Added null checks to prevent toFixed() errors
function updateDepartmentStats(section) {
    const lowStockItems = inventory[section].filter(item => {
        const status = getProductStatus(item);
        return status === 'low-stock';
    }).length;
    
    // Ensure all values exist and are numbers before calling toFixed()
    const dailySales = salesData[section]?.dailySales || 0;
    const dailyPurchases = purchaseData[section]?.dailyPurchases || 0;
    const dailyProfit = salesData[section]?.profit || 0;
    
    const dailySalesEl = document.getElementById(`${section}-daily-sales`);
    if (dailySalesEl) dailySalesEl.textContent = `₦${dailySales.toFixed(2)}`;
    
    const dailyPurchasesEl = document.getElementById(`${section}-daily-purchases`);
    if (dailyPurchasesEl) dailyPurchasesEl.textContent = `₦${dailyPurchases.toFixed(2)}`;
    
    const dailyProfitEl = document.getElementById(`${section}-daily-profit`);
    if (dailyProfitEl) dailyProfitEl.textContent = `₦${dailyProfit.toFixed(2)}`;
    
    const dailyTransactionsEl = document.getElementById(`${section}-daily-transactions`);
    if (dailyTransactionsEl) dailyTransactionsEl.textContent = salesData[section]?.dailyTransactions || 0;
    
    const dailyPurchaseTransactionsEl = document.getElementById(`${section}-daily-purchase-transactions`);
    if (dailyPurchaseTransactionsEl) dailyPurchaseTransactionsEl.textContent = purchaseData[section]?.dailyTransactions || 0;
    
    const lowStockEl = document.getElementById(`${section}-low-stock`);
    if (lowStockEl) lowStockEl.textContent = lowStockItems;
}

function resetToPOSView(section) {
    document.querySelectorAll(`#${section}-section .sub-nav-item`).forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-view') === 'pos') item.classList.add('active');
    });
    document.querySelectorAll(`#${section}-section .view-content`).forEach(view => {
        view.classList.remove('active');
        if (view.id === `${section}-pos-view`) view.classList.add('active');
    });
    currentView = 'pos';
}

function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message; 
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    setTimeout(() => { 
        notification.classList.remove('show'); 
    }, 3000);
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(function(err) {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}