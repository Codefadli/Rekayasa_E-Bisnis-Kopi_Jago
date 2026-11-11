#!/bin/bash
# Set environment variables for Kopi Jago
# Source this file before running PHP/Apache: source set_env.sh

export KOPI_JAGO_DB_HOST=127.0.0.1
export KOPI_JAGO_DB_PORT=3306
export KOPI_JAGO_DB_NAME=kopi_jago_db
export KOPI_JAGO_DB_USER=kopi_jago_user
export KOPI_JAGO_DB_PASS=$(cat /tmp/kj_newpass.tmp 2>/dev/null || echo "SET_YOUR_PASSWORD_HERE")
export KOPI_JAGO_ENV=production
export KOPI_JAGO_DEBUG=false
export KOPI_JAGO_ALLOWED_ORIGINS=http://localhost

echo "Environment variables set for Kopi Jago"
echo "User: $KOPI_JAGO_DB_USER"
echo "Password: *** (hidden)"
