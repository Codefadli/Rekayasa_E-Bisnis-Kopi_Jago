<?php
final class Response {
    public static function json(mixed $data,int $status=200,?string $message=null): never {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        $response=['success'=>$status<400];
        if ($message !== null) $response['message']=$message;
        $response['data']=$data;
        echo json_encode($response,JSON_UNESCAPED_UNICODE);
        exit;
    }
    public static function error(string $message,int $status=400): never { self::json(['message'=>$message],$status,$message); }
}
