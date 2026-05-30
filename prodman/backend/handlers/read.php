<?php
/* ── GET /api/products?id=X (Read Single) ──────────────────────────────── */

$s = $db->prepare('SELECT * FROM products WHERE id = :id LIMIT 1');
$s->execute([':id' => $id]);
$row = $s->fetch();
$row ? json_out($row) : err('Product not found', 404);
