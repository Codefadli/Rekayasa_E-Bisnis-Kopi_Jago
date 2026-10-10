// Demo Seller Data with Photos
// This file provides demo seller data for Find Jagoan and tracking features

const DEMO_SELLERS = [
    {
        id: 'demo-1',
        name: 'Jagoan Demo 01',
        photo: '../seller1.jpeg',
        status: 'available',
        vehicle_type: 'sepeda',
        stock_items: [
            { name: 'Kopi Susu Jago', stock: 15 },
            { name: 'Jago Americano', stock: 12 },
            { name: 'Matcha Latte', stock: 10 }
        ]
    },
    {
        id: 'demo-2',
        name: 'Jagoan Demo 02',
        photo: '../seller2.jpeg',
        status: 'available',
        vehicle_type: 'sepeda_listrik',
        stock_items: [
            { name: 'Pink Coco', stock: 8 },
            { name: 'Citrus Cold Brew', stock: 14 },
            { name: 'Jago Chocolate', stock: 11 }
        ]
    },
    {
        id: 'demo-3',
        name: 'Jagoan Demo 03',
        photo: '../seller3.jpeg',
        status: 'available',
        vehicle_type: 'sepeda',
        stock_items: [
            { name: 'Earl Grey Milk Tea', stock: 9 },
            { name: 'Mont Blanc Shake', stock: 7 },
            { name: 'Salted Caramel Latte', stock: 13 }
        ]
    },
    {
        id: 'demo-4',
        name: 'Jagoan Demo 04',
        photo: '../seller4.jpeg',
        status: 'busy',
        vehicle_type: 'sepeda_listrik',
        stock_items: [
            { name: 'Hojicha Lychee Tea', stock: 6 },
            { name: 'Kopi Susu Jago', stock: 10 },
            { name: 'Jago Black Coffee', stock: 15 }
        ]
    }
];

// Generate demo cart positions around a center point
function generateDemoCartPositions(centerLat, centerLng) {
    // Offsets in degrees (roughly 500m-2km radius)
    const offsets = [
        { lat: 0.008, lng: 0.012 },   // NE
        { lat: -0.010, lng: 0.008 },  // SE
        { lat: -0.012, lng: -0.009 }, // SW
        { lat: 0.009, lng: -0.011 }   // NW
    ];
    
    return DEMO_SELLERS.map((seller, index) => ({
        ...seller,
        last_latitude: centerLat + offsets[index].lat,
        last_longitude: centerLng + offsets[index].lng,
        outlet_name: `${seller.name} - Outlet`,
        outlet_address: 'Lokasi Demo (Simulasi)',
        outlet_phone: '021-XXXXXXXX',
        outlet_hours: '07:00-22:00',
        is_demo: true
    }));
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEMO_SELLERS, generateDemoCartPositions, calculateDistance };
}
