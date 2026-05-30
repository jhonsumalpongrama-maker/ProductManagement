<?php

define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('UPLOAD_URL', 'backend/uploads/');

if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);

/* ── Response Helpers ────────────────────────────────────────────────── */
function json_out($data, int $code = 200, string $msg = 'Success'): void {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code($code);
    echo json_encode(['status' => 'success', 'message' => $msg, 'data' => $data]);
    exit();
}

function err(string $msg, int $code = 400): void {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $msg, 'data' => null]);
    exit();
}

/* ── Image Upload Handler ────────────────────────────────────────────── */
function handleUpload(): string {
    if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) return '';
    $allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($_FILES['image']['type'], $allowed))
        err('Invalid image type. Use JPG, PNG, GIF, or WEBP.');
    if ($_FILES['image']['size'] > 5 * 1024 * 1024)
        err('Image must be under 5MB.');
    $ext  = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
    $name = uniqid('img_', true) . '.' . $ext;
    move_uploaded_file($_FILES['image']['tmp_name'], UPLOAD_DIR . $name);
    return UPLOAD_URL . $name;
}

/* ── Image Deletion Helper ───────────────────────────────────────────── */
function deleteOldImage(string $url): void {
    if (!$url || str_starts_with($url, 'http')) return;
    $path = __DIR__ . '/../../' . $url;
    if (file_exists($path)) unlink($path);
}
