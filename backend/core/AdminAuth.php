<?php

/**
 * Admin Authentication Helper
 * Two-role architecture: only customer and admin exist
 * Role values: 'customer' (1), 'admin' (2)
 */

final class AdminAuth {
    /**
     * Get authenticated user
     * @return array
     */
    public static function user(): ?array {
        return Auth::user();
    }

    /**
     * Require valid authentication
     * @param array $roles Allowed roles
     * @return array
     */
    public static function require(array $roles = []): array {
        $u = Auth::user();
        if (!$u) Response::error('Authentication required', 401);
        
        if ($roles && !in_array($u['role'], $roles, true)) {
            Response::error('Forbidden', 403);
        }
        
        return $u;
    }

    /**
     * Require admin role specifically
     * @return array
     */
    public static function requireAdmin(): array {
        return self::require(['admin']);
    }

    /**
     * Require customer role specifically
     * @return array
     */
    public static function requireCustomer(): array {
        return self::require(['customer']);
    }

    /**
     * Verify admin user
     * @return bool
     */
    public static function isAdmin(): bool {
        $u = self::user();
        return $u !== null && $u['role'] === 'admin';
    }

    /**
     * Verify customer user
     * @return bool
     */
    public static function isCustomer(): bool {
        $u = self::user();
        return $u !== null && $u['role'] === 'customer';
    }
}
