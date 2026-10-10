<?php
/**
 * GENERATE PASSWORD HASHES FOR ADMIN & SELLER
 * Run this to generate proper bcrypt hashes
 */

$adminPassword = 'AdminJago@2026!';
$sellerPassword = 'SellerJago@2026!';

$adminHash = password_hash($adminPassword, PASSWORD_DEFAULT);
$sellerHash = password_hash($sellerPassword, PASSWORD_DEFAULT);

echo "========================================\n";
echo "PASSWORD HASHES - JAGO COFFEE\n";
echo "========================================\n\n";

echo "ADMIN:\n";
echo "Email: admin@kopijago.local\n";
echo "Password: {$adminPassword}\n";
echo "Hash: {$adminHash}\n\n";

echo "SELLER:\n";
echo "Email: seller@kopijago.local\n";
echo "Password: {$sellerPassword}\n";
echo "Hash: {$sellerHash}\n\n";

echo "========================================\n";
echo "Copy these hashes to seed_admin_seller.sql\n";
echo "========================================\n";
