<?php
/**
 * Midtrans Integration Helper
 * Simple PHP wrapper for Midtrans Snap API (no external dependencies)
 */

class Midtrans {
    private $serverKey;
    private $isProduction;
    private $apiUrl;

    public function __construct($serverKey, $isProduction = false) {
        $this->serverKey = $serverKey;
        $this->isProduction = $isProduction;
        $this->apiUrl = $isProduction 
            ? 'https://api.midtrans.com/v2' 
            : 'https://api.sandbox.midtrans.com/v2';
    }

    /**
     * Create Snap transaction
     * @param array $params Transaction parameters
     * @return array Response with snap_token, redirect_url, etc
     */
    public function createTransaction($params) {
        $url = str_replace('/v2', '', $this->apiUrl) . '/snap/v1/transactions';
        
        $payload = json_encode($params);
        $auth = base64_encode($this->serverKey . ':');
        
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Basic ' . $auth
            ]
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 201 && $httpCode !== 200) {
            $error = json_decode($response, true);
            throw new Exception($error['error_messages'][0] ?? 'Failed to create transaction');
        }
        
        return json_decode($response, true);
    }

    /**
     * Create direct charge (for bank_transfer, echannel, etc)
     * @param array $params Charge parameters
     * @return array Response with transaction details
     */
    public function charge($params) {
        $url = $this->apiUrl . '/charge';
        
        $payload = json_encode($params);
        $auth = base64_encode($this->serverKey . ':');
        
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Basic ' . $auth
            ]
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 201 && $httpCode !== 200) {
            $error = json_decode($response, true);
            throw new Exception($error['status_message'] ?? 'Charge failed');
        }
        
        return json_decode($response, true);
    }

    /**
     * Get transaction status
     * @param string $orderId Order ID
     * @return array Transaction status
     */
    public function status($orderId) {
        $url = $this->apiUrl . '/' . $orderId . '/status';
        $auth = base64_encode($this->serverKey . ':');
        
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Basic ' . $auth
            ]
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception('Failed to get transaction status');
        }
        
        return json_decode($response, true);
    }

    /**
     * Verify notification signature
     * @param array $notification Notification data from webhook
     * @return bool Is valid signature
     */
    public function verifySignature($notification) {
        $orderId = $notification['order_id'] ?? '';
        $statusCode = $notification['status_code'] ?? '';
        $grossAmount = $notification['gross_amount'] ?? '';
        
        $signatureKey = $notification['signature_key'] ?? '';
        
        $expectedSignature = hash('sha512', $orderId . $statusCode . $grossAmount . $this->serverKey);
        
        return hash_equals($expectedSignature, $signatureKey);
    }

    /**
     * Map Midtrans transaction_status to our payment_status
     * @param string $transactionStatus Midtrans status
     * @param string $fraudStatus Fraud status (if any)
     * @return string Our payment_status
     */
    public static function mapStatus($transactionStatus, $fraudStatus = null) {
        // Fraud check
        if ($fraudStatus === 'deny') {
            return 'failed';
        }
        
        // Status mapping
        switch ($transactionStatus) {
            case 'capture':
            case 'settlement':
                return 'paid';
            case 'pending':
                return 'pending';
            case 'deny':
            case 'cancel':
            case 'expire':
                return 'failed';
            case 'refund':
            case 'partial_refund':
                return 'refunded';
            default:
                return 'pending';
        }
    }
}
