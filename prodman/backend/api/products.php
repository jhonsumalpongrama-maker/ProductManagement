<?php
require_once __DIR__ . '/../config/database.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
    http_response_code(200); 
    exit(); 
}

define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('UPLOAD_URL', 'backend/uploads/');

if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);

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

function deleteOldImage(string $url): void {
    if (!$url || str_starts_with($url, 'http')) return;
    $path = __DIR__ . '/../../' . $url;
    if (file_exists($path)) unlink($path);
}

try {
    $db     = getDB();
    $method = $_SERVER['REQUEST_METHOD'];
    $id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

    $override = strtoupper($_GET['_method'] ?? '');
    if ($method === 'POST' && in_array($override, ['PUT', 'DELETE'])) {
        $method = $override;
    }

    match ($method) {
        'GET'    => $id ? getOne($db, $id) : getAll($db),
        'POST'   => create($db),
        'PUT'    => $id ? update($db, $id) : err('ID required'),
        'DELETE' => $id ? remove($db, $id) : err('ID required'),
        default  => err('Method not allowed', 405),
    };

} catch (PDOException $e) {
    err('Database error: ' . $e->getMessage(), 500);
}

function getAll(PDO $db): void {
    json_out($db->query('SELECT * FROM products ORDER BY created_at DESC')->fetchAll());
}

function getOne(PDO $db, int $id): void {
    $s = $db->prepare('SELECT * FROM products WHERE id = :id LIMIT 1');
    $s->execute([':id' => $id]);
    $row = $s->fetch();
    $row ? json_out($row) : err('Product not found', 404);
}

function create(PDO $db): void {
    $b = $_POST;
    foreach (['name', 'description', 'price', 'stock', 'category'] as $f)
        if (!isset($b[$f]) || trim((string) $b[$f]) === '')
            err("Field '$f' is required", 422);

    $imageUrl = handleUpload();
    if (!$imageUrl) $imageUrl = trim($b['image_url'] ?? '');

    $s = $db->prepare('INSERT INTO products (name, description, price, stock, category, image_url)
                       VALUES (:name, :description, :price, :stock, :category, :image_url)');
    $s->execute([
        ':name'        => trim($b['name']),
        ':description' => trim($b['description']),
        ':price'       => (float) $b['price'],
        ':stock'       => (int)   $b['stock'],
        ':category'    => trim($b['category']),
        ':image_url'   => $imageUrl,
    ]);

    $new = $db->prepare('SELECT * FROM products WHERE id = :id');
    $new->execute([':id' => $db->lastInsertId()]);
    json_out($new->fetch(), 201, 'Product created');
}

function update(PDO $db, int $id): void {
    $chk = $db->prepare('SELECT * FROM products WHERE id = :id');
    $chk->execute([':id' => $id]);
    $old = $chk->fetch();
    if (!$old) err('Product not found', 404);

    $b = $_POST;
    if (empty($b)) err('No data provided', 422);

    $sets   = [];
    $params = [':id' => $id];
    $fields = ['name', 'description', 'price', 'stock', 'category'];

    foreach ($fields as $f) {
        if (isset($b[$f]) && trim((string) $b[$f]) !== '') {
            $sets[]       = "$f = :$f";
            $params[":$f"] = $b[$f];
        }
    }

    if (!empty($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        deleteOldImage($old['image_url']);
        $sets[]               = 'image_url = :image_url';
        $params[':image_url'] = handleUpload();
    } elseif (array_key_exists('image_url', $b)) {
        $sets[]               = 'image_url = :image_url';
        $params[':image_url'] = trim($b['image_url']);
    }

    if (empty($sets)) err('No valid fields to update', 422);

    $db->prepare('UPDATE products SET ' . implode(', ', $sets) . ' WHERE id = :id')
       ->execute($params);

    $s = $db->prepare('SELECT * FROM products WHERE id = :id');
    $s->execute([':id' => $id]);
    json_out($s->fetch(), 200, 'Product updated');
}

function remove(PDO $db, int $id): void {
    $chk = $db->prepare('SELECT * FROM products WHERE id = :id');
    $chk->execute([':id' => $id]);
    $row = $chk->fetch();
    if (!$row) err('Product not found', 404);

    deleteOldImage($row['image_url']);
    
    $del = $db->prepare('DELETE FROM products WHERE id = :id');
    $del->execute([':id' => $id]);
    
    json_out(['id' => $id], 200, 'Product deleted successfully');
}