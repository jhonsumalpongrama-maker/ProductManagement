<?php
// para create ug product endpoint

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

