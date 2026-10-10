/**
 * JAGOANS/OUTLETS DATA LOADER - Seller/outlet data
 */

const DEMO_JAGOANS_DATA = [
    {
        id: 3,
        outlet_name: 'Jago Bandung Pusat',
        outlet_address: 'Jl. Braga No. 15, Bandung',
        outlet_phone: '0812-3456-7890',
        outlet_email: 'braga@kopijago.com',
        outlet_hours: 'Senin-Minggu 08:00-22:00',
        last_latitude: -6.9175,
        last_longitude: 107.6191,
        max_delivery_km: 5,
        delivery_fee_per_km: 0,
        status: 'available',
        jagoan_name: 'Ahmad Rizky',
        jagoan_phone: '0812-3456-7890',
        vehicle_type: 'Motor',
        vehicle_number: 'D 1234 ABC',
        joined_date: '2025-01-15',
        total_orders: 156,
        rating: 4.8
    },
    {
        id: 4,
        outlet_name: 'Jago Dago',
        outlet_address: 'Jl. Ir. H. Djuanda No. 100, Bandung',
        outlet_phone: '0812-3456-7891',
        outlet_email: 'dago@kopijago.com',
        outlet_hours: 'Senin-Minggu 08:00-22:00',
        last_latitude: -6.8700,
        last_longitude: 107.6140,
        max_delivery_km: 5,
        delivery_fee_per_km: 0,
        status: 'available',
        jagoan_name: 'Budi Santoso',
        jagoan_phone: '0812-3456-7891',
        vehicle_type: 'Motor',
        vehicle_number: 'D 5678 DEF',
        joined_date: '2025-02-10',
        total_orders: 142,
        rating: 4.7
    },
    {
        id: 5,
        outlet_name: 'Jago Pasteur',
        outlet_address: 'Jl. Dr. Djunjunan No. 50, Bandung',
        outlet_phone: '0812-3456-7892',
        outlet_email: 'pasteur@kopijago.com',
        outlet_hours: 'Senin-Minggu 08:00-22:00',
        last_latitude: -6.8950,
        last_longitude: 107.5760,
        max_delivery_km: 5,
        delivery_fee_per_km: 0,
        status: 'available',
        jagoan_name: 'Citra Dewi',
        jagoan_phone: '0812-3456-7892',
        vehicle_type: 'Motor',
        vehicle_number: 'D 9012 GHI',
        joined_date: '2025-03-05',
        total_orders: 128,
        rating: 4.9
    },
    {
        id: 6,
        outlet_name: 'Jago Cihampelas',
        outlet_address: 'Jl. Cihampelas No. 88, Bandung',
        outlet_phone: '0812-3456-7893',
        outlet_email: 'cihampelas@kopijago.com',
        outlet_hours: 'Senin-Minggu 08:00-22:00',
        last_latitude: -6.8950,
        last_longitude: 107.6050,
        max_delivery_km: 5,
        delivery_fee_per_km: 0,
        status: 'available',
        jagoan_name: 'Dedi Kurniawan',
        jagoan_phone: '0812-3456-7893',
        vehicle_type: 'Motor',
        vehicle_number: 'D 3456 JKL',
        joined_date: '2025-04-20',
        total_orders: 95,
        rating: 4.6
    },
    {
        id: 7,
        outlet_name: 'Jago Dipatiukur',
        outlet_address: 'Jl. Dipatiukur No. 25, Bandung',
        outlet_phone: '0812-3456-7894',
        outlet_email: 'dipatiukur@kopijago.com',
        outlet_hours: 'Senin-Minggu 08:00-22:00',
        last_latitude: -6.8850,
        last_longitude: 107.6100,
        max_delivery_km: 5,
        delivery_fee_per_km: 0,
        status: 'busy',
        jagoan_name: 'Eka Pratama',
        jagoan_phone: '0812-3456-7894',
        vehicle_type: 'Motor',
        vehicle_number: 'D 7890 MNO',
        joined_date: '2025-05-12',
        total_orders: 87,
        rating: 4.5
    },
    {
        id: 8,
        outlet_name: 'Jago Buah Batu',
        outlet_address: 'Jl. Buah Batu No. 120, Bandung',
        outlet_phone: '0812-3456-7895',
        outlet_email: 'buahbatu@kopijago.com',
        outlet_hours: 'Senin-Minggu 08:00-22:00',
        last_latitude: -6.9450,
        last_longitude: 107.6350,
        max_delivery_km: 5,
        delivery_fee_per_km: 0,
        status: 'offline',
        jagoan_name: 'Fajar Hidayat',
        jagoan_phone: '0812-3456-7895',
        vehicle_type: 'Motor',
        vehicle_number: 'D 2468 PQR',
        joined_date: '2025-06-08',
        total_orders: 73,
        rating: 4.4
    }
];

async function loadJagoansWithFallback() {
    try {
        const response = await kjRequest('sellers', { method: 'GET' });
        
        if (response.data && response.data.length > 0) {
            console.log('[Jagoans] Loaded from API:', response.data.length, 'outlets');
            return response.data;
        }
        
        throw new Error('No jagoans data from API');
    } catch (error) {
        console.warn('[Jagoans] API failed, using demo data:', error.message);
        return DEMO_JAGOANS_DATA;
    }
}

if (typeof window !== 'undefined') {
    window.loadJagoansWithFallback = loadJagoansWithFallback;
    window.DEMO_JAGOANS_DATA = DEMO_JAGOANS_DATA;
}
