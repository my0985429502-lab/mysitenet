<?php
// TEST MODE: change this key before publishing the site.
const ADMIN_KEY = 'CHANGE-THIS-TO-A-LONG-RANDOM-SECRET';
const DATA_DIR = __DIR__ . '/private_data';
const DATA_FILE = DATA_DIR . '/visitors.json';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function reply($code, $data) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function load_rows() { if (!is_file(DATA_FILE)) return []; $v=json_decode(file_get_contents(DATA_FILE), true); return is_array($v) ? $v : []; }
function save_rows($rows) { if (!is_dir(DATA_DIR) && !mkdir(DATA_DIR, 0700, true)) reply(500,['ok'=>false,'error'=>'Cannot create data directory']); if (file_put_contents(DATA_FILE, json_encode($rows, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), LOCK_EX)===false) reply(500,['ok'=>false,'error'=>'Cannot save database']); }
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $body=json_decode(file_get_contents('php://input'), true);
  if (!is_array($body)) reply(400,['ok'=>false,'error'=>'Invalid JSON']);
  $id=$body['visitor_id'] ?? '';
  if (!is_string($id) || !preg_match('/^[a-zA-Z0-9-]{10,80}$/',$id)) reply(400,['ok'=>false,'error'=>'Invalid visitor ID']);
  $rows=load_rows(); $now=gmdate('c'); $found=false;
  foreach ($rows as &$row) { if (($row['visitor_id'] ?? '') === $id) { $row['last_seen']=$now; $row['visits']=(int)($row['visits'] ?? 0)+1; $row['language']=substr((string)($body['language'] ?? ''),0,24); $found=true; break; } } unset($row);
  if (!$found) $rows[]=['visitor_id'=>$id,'first_seen'=>$now,'last_seen'=>$now,'visits'=>1,'language'=>substr((string)($body['language'] ?? ''),0,24)];
  save_rows($rows); reply(200,['ok'=>true,'visitor_id'=>$id]);
}
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'list') {
  $key=(string)($_GET['key'] ?? '');
  if (ADMIN_KEY === 'CHANGE-THIS-TO-A-LONG-RANDOM-SECRET' || !hash_equals(ADMIN_KEY,$key)) reply(403,['ok'=>false,'error'=>'Невірний ключ адміністратора. Спочатку змініть ADMIN_KEY у visitors.php']);
  $rows=load_rows(); usort($rows, fn($a,$b)=>strcmp($b['last_seen']??'', $a['last_seen']??'')); reply(200,['ok'=>true,'visitors'=>$rows]);
}
reply(405,['ok'=>false,'error'=>'Method not allowed']);
?>