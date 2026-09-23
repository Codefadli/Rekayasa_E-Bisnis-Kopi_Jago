<?php
final class Database {
    private static ?PDO $pdo = null;
    public static function connection(): PDO {
        if (!self::$pdo) { $c = require __DIR__.'/../config/config.php'; self::$pdo = new PDO($c['dsn'],$c['user'],$c['pass'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]); }
        return self::$pdo;
    }
}
