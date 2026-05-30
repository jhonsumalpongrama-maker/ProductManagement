<?php
/* ── GET /api/products (List All) ──────────────────────────────────────── */

json_out($db->query('SELECT * FROM products ORDER BY created_at DESC')->fetchAll());
