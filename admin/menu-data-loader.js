/**
 * MENU DATA LOADER - Load menu from customer data or create dummy
 * This ensures admin Menu & Products always has data to display
 */

// Demo menu data (same as customer sees)
const DEMO_MENU_DATA = [
    {
        id: 1,
        name: 'Kopi Susu Jago',
        category: 'Coffee',
        description: '100% Arabica dengan susu segar',
        price: 15000,
        image: '../kopsu jago.jfif',
        is_available: 1,
        is_featured: 1,
        stock: 50
    },
    {
        id: 2,
        name: 'Jago Black Coffee',
        category: 'Coffee',
        description: 'Pure Arabica tanpa gula',
        price: 12000,
        image: '../kopi hitam.jfif',
        is_available: 1,
        is_featured: 1,
        stock: 45
    },
    {
        id: 3,
        name: 'Citrus Cold Brew',
        category: 'Coffee',
        description: 'Cold brew dengan twist jeruk segar',
        price: 18000,
        image: '../Citrus Cold Brew.jfif',
        is_available: 1,
        is_featured: 0,
        stock: 30
    },
    {
        id: 4,
        name: 'Caramel Macchiato',
        category: 'Coffee',
        description: 'Espresso dengan caramel dan susu',
        price: 20000,
        image: '../caramel macchiato.jfif',
        is_available: 1,
        is_featured: 0,
        stock: 35
    },
    {
        id: 5,
        name: 'Vanilla Latte',
        category: 'Coffee',
        description: 'Latte dengan vanilla premium',
        price: 18000,
        image: '../vanilla latte.jfif',
        is_available: 1,
        is_featured: 0,
        stock: 40
    },
    {
        id: 6,
        name: 'Hazelnut Coffee',
        category: 'Coffee',
        description: 'Kopi dengan hazelnut aroma',
        price: 19000,
        image: '../hazelnut.jfif',
        is_available: 1,
        is_featured: 0,
        stock: 25
    },
    {
        id: 7,
        name: 'Matcha Latte',
        category: 'Non-Coffee',
        description: 'Matcha premium dengan susu',
        price: 20000,
        image: '../matcha.jfif',
        is_available: 1,
        is_featured: 1,
        stock: 30
    },
    {
        id: 8,
        name: 'Chocolate',
        category: 'Non-Coffee',
        description: 'Cokelat Belgium hangat',
        price: 17000,
        image: '../chocolate.jfif',
        is_available: 1,
        is_featured: 0,
        stock: 35
    },
    {
        id: 9,
        name: 'Thai Tea',
        category: 'Non-Coffee',
        description: 'Thai tea original dengan susu',
        price: 16000,
        image: '../thai tea.jfif',
        is_available: 1,
        is_featured: 0,
        stock: 40
    },
    {
        id: 10,
        name: 'Lemon Tea',
        category: 'Non-Coffee',
        description: 'Teh segar dengan lemon',
        price: 12000,
        image: '../lemon tea.jfif',
        is_available: 1,
        is_featured: 0,
        stock: 50
    }
];

/**
 * Load menu with fallback to demo data
 */
async function loadMenuWithFallback() {
    try {
        // Try to load from API first
        const response = await kjRequest('menu', { method: 'GET' });
        
        if (response.data && response.data.length > 0) {
            console.log('[Menu] Loaded from API:', response.data.length, 'items');
            return response.data;
        }
        
        throw new Error('No menu data from API');
    } catch (error) {
        console.warn('[Menu] API failed, using demo data:', error.message);
        
        // Use demo data
        return DEMO_MENU_DATA;
    }
}

// Export for use in admin pages
if (typeof window !== 'undefined') {
    window.loadMenuWithFallback = loadMenuWithFallback;
    window.DEMO_MENU_DATA = DEMO_MENU_DATA;
}
