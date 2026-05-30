<?php
/* ── DELETE /api/products?id=X (Delete) ─────────────────────────────────── */

// Check if product exists
$chk = $db->prepare('SELECT * FROM products WHERE id = :id');
$chk->execute([':id' => $id]);
$row = $chk->fetch();

if (!$row) {
    err('Product not found', 404);
}

// Delete the old image if it exists
deleteOldImage($row['image_url']);

// Delete the product from database
$del = $db->prepare('DELETE FROM products WHERE id = :id');
$result = $del->execute([':id' => $id]);

if (!$result) {
    err('Failed to delete product', 500);
}

// Check if deletion was successful
if ($del->rowCount() === 0) {
    err('Product not found or already deleted', 404);
}

json_out(['id' => $id], 200, 'Product deleted successfully');