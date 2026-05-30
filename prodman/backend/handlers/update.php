<?php
/* ── PUT /api/products?id=X (Update) ──────────────────────────────────── */

// Fetch existing row
$chk = $db->prepare('SELECT * FROM products WHERE id = :id');
$chk->execute([':id' => $id]);
$old = $chk->fetch();
if (!$old) err('Product not found', 404);

// $_POST is populated because JS sends this as a real multipart POST
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

// Image: new file upload wins, else keep image_url field value
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
