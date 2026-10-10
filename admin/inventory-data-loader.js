/**
 * INVENTORY DATA LOADER - Dummy stock data
 */

const DEMO_INVENTORY_DATA = [
    {
        id: 1,
        product_name: 'Kopi Susu Jago',
        category: 'Coffee',
        current_stock: 50,
        min_stock: 10,
        unit: 'cup',
        last_restock: '2026-10-08',
        status: 'available'
    },
    {
        id: 2,
        product_name: 'Jago Black Coffee',
        category: 'Coffee',
        current_stock: 45,
        min_stock: 10,
        unit: 'cup',
        last_restock: '2026-10-08',
        status: 'available'
    },
    {
        id: 3,
        product_name: 'Citrus Cold Brew',
        category: 'Coffee',
        current_stock: 30,
        min_stock: 10,
        unit: 'cup',
        last_restock: '2026-10-07',
        status: 'available'
    },
    {
        id: 4,
        product_name: 'Caramel Macchiato',
        category: 'Coffee',
        current_stock: 35,
        min_stock: 10,
        unit: 'cup',
        last_restock: '2026-10-07',
        status: 'available'
    },
    {
        id: 5,
        product_name: 'Vanilla Latte',
        category: 'Coffee',
        current_stock: 40,
        min_stock: 10,
        unit: 'cup',
        last_restock: '2026-10-08',
        status: 'available'
    },
    {
        id: 6,
        product_name: 'Hazelnut Coffee',
        category: 'Coffee',
        current_stock: 8,
        min_stock: 10,
        unit: 'cup',
        last_restock: '2026-10-05',
        status: 'low_stock'
    },
    {
        id: 7,
        product_name: 'Matcha Latte',
        category: 'Non-Coffee',
        current_stock: 30,
        min_stock: 10,
        unit: 'cup',
        last_restock: '2026-10-08',
        status: 'available'
    },
    {
        id: 8,
        product_name: 'Chocolate',
        category: 'Non-Coffee',
        current_stock: 35,
        min_stock: 10,
        unit: 'cup',
        last_restock: '2026-10-08',
        status: 'available'
    },
    {
        id: 9,
        product_name: 'Thai Tea',
        category: 'Non-Coffee',
        current_stock: 40,
        min_stock: 10,
        unit: 'cup',
        last_restock: '2026-10-08',
        status: 'available'
    },
    {
        id: 10,
        product_name: 'Lemon Tea',
        category: 'Non-Coffee',
        current_stock: 50,
        min_stock: 10,
        unit: 'cup',
        last_restock: '2026-10-08',
        status: 'available'
    },
    // Bahan baku
    {
        id: 11,
        product_name: 'Kopi Arabica (kg)',
        category: 'Raw Material',
        current_stock: 25,
        min_stock: 5,
        unit: 'kg',
        last_restock: '2026-10-06',
        status: 'available'
    },
    {
        id: 12,
        product_name: 'Susu Segar (liter)',
        category: 'Raw Material',
        current_stock: 40,
        min_stock: 10,
        unit: 'liter',
        last_restock: '2026-10-09',
        status: 'available'
    },
    {
        id: 13,
        product_name: 'Gula (kg)',
        category: 'Raw Material',
        current_stock: 15,
        min_stock: 5,
        unit: 'kg',
        last_restock: '2026-10-07',
        status: 'available'
    },
    {
        id: 14,
        product_name: 'Cup Plastik (pcs)',
        category: 'Packaging',
        current_stock: 500,
        min_stock: 100,
        unit: 'pcs',
        last_restock: '2026-10-05',
        status: 'available'
    },
    {
        id: 15,
        product_name: 'Sedotan (pcs)',
        category: 'Packaging',
        current_stock: 450,
        min_stock: 100,
        unit: 'pcs',
        last_restock: '2026-10-05',
        status: 'available'
    }
];

async function loadInventoryWithFallback() {
    try {
        const response = await kjRequest('inventory', { method: 'GET' });
        
        if (response.data && response.data.length > 0) {
            console.log('[Inventory] Loaded from API:', response.data.length, 'items');
            return response.data;
        }
        
        throw new Error('No inventory data from API');
    } catch (error) {
        console.warn('[Inventory] API failed, using demo data:', error.message);
        return DEMO_INVENTORY_DATA;
    }
}

if (typeof window !== 'undefined') {
    window.loadInventoryWithFallback = loadInventoryWithFallback;
    window.DEMO_INVENTORY_DATA = DEMO_INVENTORY_DATA;
}
