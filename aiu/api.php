<?php
/*
 * AIU TOTEM - sync server, PHP edition (2.5.0: Docs files)
 *
 * Does exactly what api.cgi (Ruby) does, with the same files on disk, so you can use either one:
 * PHP runs on every WordPress / DirectAdmin host, Ruby CGI often doesn't. The app tries api.php first,
 * then api.cgi, and remembers whichever answers.
 *
 * It only: creates accounts, confirms email, resets passwords, and keeps each Totem as a private folder of
 * plain files (beside public_html, never inside it when the host allows), acting as the "mailbox" for devices.
 * One live copy of each Totem (no backups). Only "Delete my account" (password + typed phrase) removes it.
 *
 * 2.2.0: one account can hold several Aiu profiles (one Totem each). The first profile is the account folder
 * itself (exactly as before, so nothing moves). Every other profile is its own folder: accounts/<user>/totems/<id>/
 * with the same files (events.jsonl, meta.json, totem.json, journal/). profiles.json lists their names.
 */

// ------------------------------------------------------------------ SETTINGS (same names as api.cgi)
function envv($k, $d) { $v = getenv($k); return ($v === false || $v === '') ? $d : $v; }
define('APP_URL',   envv('AIU_APP_URL', 'https://kodna.net/aiu/'));            // where index.html lives (used in emails)
define('MAIL_FROM', envv('AIU_MAIL_FROM', 'Aiu Totem <noreply@kodna.net>'));
define('SENDMAIL',  envv('AIU_SENDMAIL', '/usr/sbin/sendmail'));
define('API_URL',   envv('AIU_API_URL', rtrim(APP_URL, '/') . '/api.php'));   // this file's web address (used in emails)
define('REQUIRE_EMAIL_CONFIRM', false); // 2.4.0: accounts are a username and a password. No email, no confirm link.
define('ALLOW_DEV', envv('AIU_ALLOW_DEV', '0') === '1');                      // 2.6.0: '1' only on a test server (lets the test growth button work)
define('SIGNUPS_OPEN', envv('AIU_SIGNUPS_OPEN', '1') === '1');                // '0' = nobody new can sign up
define('SHOP_DIR',  envv('AIU_SHOP_DIR', __DIR__ . '/shop'));
define('MAX_ACCOUNT_MB', (int) envv('AIU_MAX_ACCOUNT_MB', '50'));
define('FILES_MAX_MB', (int) envv('AIU_FILES_MAX_MB', '250'));              // 2.5.0: Files space for one account (all its profiles); 2.6.0: 250 MB
define('FILES_TOTAL_MB', (int) envv('AIU_FILES_TOTAL_MB', '5000'));         // 2.6.0: Files space for the whole server, every account together
// ---------------------------------------------------------------------------

define('API_VERSION', 1);
define('MAX_BODY', 4 * 1024 * 1024);
define('MAX_EVENTS_PER_PUSH', 1000);
define('MAX_EVENTS_PER_PULL', 3000);
define('MAX_EVENT_BYTES', 16000);
define('MAX_PROFILES', 24);
define('PIECE_MAX', 1024 * 1024 + 64);  // 2.5.0: one piece of a file
define('FILE_MAX_PIECES', 64);      // so one file is at most about 64 MB (the app keeps it to 25)      // Aiu profiles per account (2.2.0)
define('PBKDF_ITER', 60000);
define('RESET_TTL', 3600);
define('LOCK_AFTER', 10);
define('FUTURE_SLACK_MS', 10 * 60 * 1000);
define('MIN_T', 1577836800000);
define('JF', JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

// The private data folder: beside public_html (like api.cgi). If the host doesn't let PHP write there
// (open_basedir), it falls back to aiu/aiu_data with a "deny all" .htaccess, and ping says so.
function data_dir() {
  static $dir = null;
  if ($dir !== null) return $dir;
  $env = getenv('AIU_DATA_DIR');
  $cands = $env ? array($env) : array(dirname(__DIR__, 2) . '/aiu_data', __DIR__ . '/aiu_data');
  foreach ($cands as $c) {
    if (@is_dir($c) && @is_writable($c)) { $dir = $c; return $dir; }
    if (@mkdir($c, 0700, true)) { $dir = $c; return $dir; }
  }
  $dir = $cands[0];
  return $dir;
}

class ApiError extends Exception {
  public $status; public $code2;
  function __construct($status, $code, $msg) { parent::__construct($msg); $this->status = $status; $this->code2 = $code; }
}
function fail($status, $code, $msg) { throw new ApiError($status, $code, $msg); }
function now_ms() { return (int) floor(microtime(true) * 1000); }

function respond($status, $obj, $raw = null) {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  echo $raw !== null ? $raw : json_encode($obj, JF);
}
function respond_html($status, $title, $message) {
  $e = function ($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); };
  http_response_code($status);
  header('Content-Type: text/html; charset=utf-8');
  header('Cache-Control: no-store');
  echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    . '<title>' . $e($title) . '</title></head><body style="font-family:monospace;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5">'
    . '<h1 style="font-size:1.2rem;border-bottom:3px solid #000;padding-bottom:.5rem">AIU TOTEM</h1>'
    . '<p>' . $e($message) . '</p><p><a href="' . $e(APP_URL) . '">Open Aiu Totem</a></p></body></html>';
}

function sha256($s) { return hash('sha256', (string) $s); }
function pbkdf2($pw, $salt, $iter) { return hash_pbkdf2('sha256', (string) $pw, (string) $salt, (int) $iter, 64, false); }
function make_pw($pw) { $salt = bin2hex(random_bytes(16)); return array('salt' => $salt, 'iter' => PBKDF_ITER, 'hash' => pbkdf2($pw, $salt, PBKDF_ITER)); }
function check_pw($rec, $pw) {
  if (!is_array($rec) || empty($rec['salt']) || empty($rec['hash'])) return false;
  return hash_equals((string) $rec['hash'], pbkdf2((string) $pw, $rec['salt'], isset($rec['iter']) ? $rec['iter'] : PBKDF_ITER));
}
function rnd_hex($bytes) { return bin2hex(random_bytes($bytes)); }

function read_json($path, $default) {
  if (!is_file($path)) return $default;
  $j = json_decode(file_get_contents($path), true);
  return $j === null ? $default : $j;
}
// $asObject: write {} (not []) when empty, like tokens.json
function write_json($path, $obj, $asObject = false) {
  if ($asObject && is_array($obj) && !$obj) $obj = new stdClass();
  $tmp = $path . '.tmp' . getmypid();
  file_put_contents($tmp, json_encode($obj, JF | JSON_PRETTY_PRINT));
  @chmod($tmp, 0600);
  rename($tmp, $path);
}
function with_lock($path, $fn) {
  $f = fopen($path, 'c+');
  @chmod($path, 0600);
  flock($f, LOCK_EX);
  try { return $fn(); } finally { flock($f, LOCK_UN); fclose($f); }
}
function clean_user($u) {
  $u = strtolower(trim((string) $u));
  if (!preg_match('/\A[a-z0-9_-]{3,24}\z/', $u)) fail(400, 'bad_username', 'Usernames are 3-24 letters, numbers, - or _.');
  return $u;
}
function clean_email($e) {
  $e = trim((string) $e);
  if (!(strlen($e) <= 254 && preg_match('/\A[^@\s<>,;"]+@[^@\s<>,;"]+\.[^@\s<>,;"]+\z/u', $e))) fail(400, 'bad_email', 'That email address does not look right.');
  return $e;
}
function clean_pw($pw) {
  $pw = (string) $pw;
  if (mb_strlen($pw, 'UTF-8') < 8) fail(400, 'weak_password', 'Passwords need at least 8 characters.');
  if (strlen($pw) > 512) fail(400, 'bad_password', 'That password is too long.');
  return $pw;
}
function short_str($s, $max) { return mb_substr(preg_replace('/[\r\n\t]/', ' ', (string) $s), 0, $max, 'UTF-8'); }
function acct_dir($u) { return data_dir() . '/accounts/' . $u; }
// 2.2.0: profiles. '' = the first profile (the account folder itself); others look like t + 8-23 letters/numbers
function clean_tid($t) {
  $t = strtolower(trim((string) $t));
  if ($t === '' || $t === 'main') return '';
  if (!preg_match('/\At[a-z0-9]{5,23}\z/', $t)) fail(400, 'bad_profile', 'That profile id does not look right.');
  return $t;
}
function totem_dir($u, $tid) { return $tid === '' ? acct_dir($u) : acct_dir($u) . '/totems/' . $tid; }
function profiles_path($u) { return acct_dir($u) . '/profiles.json'; }
function read_profiles($u) { $p = read_json(profiles_path($u), array()); return is_array($p) ? $p : array(); }
function clean_kind($k) { return $k === 'business' ? 'business' : 'personal'; }
// makes the profile's folder the first time a device syncs it, and keeps its name and kind up to date
function ensure_profile($u, $tid, $name, $kind) {
  return with_lock(acct_dir($u) . '/.profiles.lock', function () use ($u, $tid, $name, $kind) {
    $all = read_profiles($u); $key = $tid === '' ? 'main' : $tid; $changed = false;
    if ($tid !== '' && !is_dir(totem_dir($u, $tid))) {
      $n = 0; foreach ($all as $k => $v) if ($k !== 'main' && empty($v['deleted'])) $n++;
      if ($n + 1 >= MAX_PROFILES) fail(413, 'too_many_profiles', 'This account has the most profiles it can hold (' . MAX_PROFILES . ').');
      mkdir(totem_dir($u, $tid), 0700, true);
      write_json(totem_dir($u, $tid) . '/meta.json', array('last_seq' => 0, 'count' => 0));
      touch(totem_dir($u, $tid) . '/events.jsonl'); @chmod(totem_dir($u, $tid) . '/events.jsonl', 0600);
    }
    $rec = isset($all[$key]) && is_array($all[$key]) ? $all[$key] : array('created' => now_ms());
    if (!empty($rec['deleted'])) fail(410, 'profile_deleted', 'That profile was deleted.');
    if ($name !== null && $name !== '' && (!isset($rec['name']) || $rec['name'] !== $name)) { $rec['name'] = $name; $changed = true; }
    if ($kind !== null && (!isset($rec['kind']) || $rec['kind'] !== $kind)) { $rec['kind'] = $kind; $changed = true; }
    if (!isset($all[$key])) $changed = true;
    if ($changed) { $all[$key] = $rec; write_json(profiles_path($u), $all, true); }
    return $rec;
  });
}
function setup_data_dir() {
  foreach (array('accounts', 'rate', 'outbox') as $d) { $p = data_dir() . '/' . $d; if (!is_dir($p)) @mkdir($p, 0700, true); }
  $ht = data_dir() . '/.htaccess';
  if (!is_file($ht)) @file_put_contents($ht, "Require all denied\nDeny from all\n");
}
function client_ip() { return isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : 'unknown'; }
function rate_limit($action, $max, $window) {
  $path = data_dir() . '/rate/' . substr(sha256(client_ip() . '|' . $action), 0, 20) . '.json';
  with_lock($path . '.lock', function () use ($path, $max, $window) {
    $now = time();
    $hits = array_values(array_filter(read_json($path, array()), function ($t) use ($now, $window) { return is_int($t) && $t > $now - $window; }));
    if (count($hits) >= $max) fail(429, 'slow_down', 'Too many tries. Please wait a while and try again.');
    $hits[] = $now;
    write_json($path, $hits);
  });
}
function send_mail($to, $subject, $body) {
  $msg = "From: " . MAIL_FROM . "\nTo: $to\nSubject: $subject\nMIME-Version: 1.0\nAuto-Submitted: auto-generated\nX-Auto-Response-Suppress: All\n"
    . "Content-Type: text/plain; charset=utf-8\n\n$body\n--\nThis is an automatic no-reply message from Aiu Totem. Replies are not read.\n";
  $sent = false;
  $envelope = preg_match('/<([^>]+)>/', MAIL_FROM, $m) ? $m[1] : MAIL_FROM;
  if (@is_executable(SENDMAIL) && function_exists('proc_open')) {
    $p = @proc_open(array(SENDMAIL, '-t', '-i', '-f', $envelope), array(0 => array('pipe', 'r'), 1 => array('pipe', 'w'), 2 => array('pipe', 'w')), $pipes);
    if (is_resource($p)) { fwrite($pipes[0], $msg); fclose($pipes[0]); @fclose($pipes[1]); @fclose($pipes[2]); $sent = proc_close($p) === 0; }
  }
  if (!$sent && function_exists('mail')) { // the host's own mail (most DirectAdmin servers)
    $sent = @mail($to, $subject, $body . "\n--\nThis is an automatic no-reply message from Aiu Totem. Replies are not read.\n",
      "From: " . MAIL_FROM . "\r\nMIME-Version: 1.0\r\nAuto-Submitted: auto-generated\r\nX-Auto-Response-Suppress: All\r\nContent-Type: text/plain; charset=utf-8", '-f' . $envelope);
  }
  // a copy for the server owner, so links can be found even if mail goes missing
  @file_put_contents(data_dir() . '/outbox/' . date('Ymd-His') . '-' . rnd_hex(3) . '.txt', 'sent=' . ($sent ? 'true' : 'false') . "\n" . $msg);
  return $sent;
}
function load_account($u) { $p = acct_dir($u) . '/account.json'; return is_file($p) ? read_json($p, null) : null; }
function save_account($u, $acct) { write_json(acct_dir($u) . '/account.json', $acct); }
function tokens_path($u) { return acct_dir($u) . '/tokens.json'; }
function auth($req) {
  $u = clean_user(isset($req->u) ? $req->u : '');
  $acct = load_account($u);
  if (!$acct) fail(401, 'login', 'Please log in again.');
  $tok = isset($req->token) ? (string) $req->token : '';
  if ($tok === '') fail(401, 'login', 'Please log in again.');
  $tokens = read_json(tokens_path($u), array());
  if (!isset($tokens[sha256($tok)])) fail(401, 'login', 'Please log in again.');
  return array($u, $acct, sha256($tok));
}
function touch_token($u, $th) {
  with_lock(acct_dir($u) . '/.tokens.lock', function () use ($u, $th) {
    $tokens = read_json(tokens_path($u), array());
    if (isset($tokens[$th])) { $tokens[$th]['last'] = now_ms(); write_json(tokens_path($u), $tokens, true); }
  });
}
function new_token($u, $dn) {
  $tok = rnd_hex(32);
  with_lock(acct_dir($u) . '/.tokens.lock', function () use ($u, $dn, $tok) {
    $tokens = read_json(tokens_path($u), array());
    $tokens[sha256($tok)] = array('dn' => short_str($dn, 40), 'created' => now_ms(), 'last' => now_ms());
    write_json(tokens_path($u), $tokens, true);
  });
  return $tok;
}
function send_confirm($u, &$acct) {
  $key = rnd_hex(24);
  $acct['confirm_key'] = sha256($key);
  save_account($u, $acct);
  $link = API_URL . "?a=confirm&u=$u&k=$key";
  return send_mail($acct['email'], 'Confirm your Aiu Totem account', "Hi $u,\n\nYour egg is waiting! Confirm your email by opening this link:\n\n$link\n\nIf you did not sign up for Aiu Totem, you can ignore this message.\n");
}
function g($o, $k, $d = null) { return is_object($o) && isset($o->$k) ? $o->$k : $d; }

// ------------------------------------------------------------------ events (the same lines as api.cgi writes)
define('LINE_RE', '/\A\{"seq":(\d+),"rt":\d+,"id":"([A-Za-z0-9_-]+)"/');
function clean_event($e, $now) {
  if (!is_object($e)) return null;
  $id = (string) g($e, 'id', ''); if (!preg_match('/\A[A-Za-z0-9_-]{8,64}\z/', $id)) return null;
  $type = (string) g($e, 'type', ''); if (!preg_match('/\A[a-z_]{2,24}\z/', $type)) return null;
  if ($type === 'dev_growth' && !ALLOW_DEV) return null; // 2.6.0: test growth only on a test server
  $t = g($e, 't'); if (!is_int($t) || $t < MIN_T) return null;
  $data = g($e, 'data'); if (!is_object($data)) $data = new stdClass();
  if (strlen(json_encode($data, JF)) > MAX_EVENT_BYTES) return null;
  $ev = array('seq' => 0, 'rt' => $now, 'id' => $id, 't' => $t, 'type' => $type);
  if ($t > $now + FUTURE_SLACK_MS) { $ev['t'] = $now; $ev['tf'] = 1; }
  $d = (string) g($e, 'd', ''); if (preg_match('/\A\d{4}-\d{2}-\d{2}\z/', $d)) $ev['d'] = $d;
  $h = (string) g($e, 'h', ''); if (preg_match('/\A\d{2}:\d{2}\z/', $h)) $ev['h'] = $h;
  $dev = (string) g($e, 'dev', ''); if (preg_match('/\A[A-Za-z0-9_-]{4,64}\z/', $dev)) $ev['dev'] = $dev;
  if (g($e, 'dn')) $ev['dn'] = short_str(g($e, 'dn'), 40);
  if (g($e, 'off') === 1) $ev['off'] = 1;
  if (g($e, 'imp') === 1) $ev['imp'] = 1; // 2.2.0: brought in from a capsule or a device-only Totem (its growth isn't an offline trip)
  $ev['data'] = $data;
  return $ev;
}
function mirror_journal($dir, $ev) {
  if (!($ev['type'] === 'journal' || $ev['type'] === 'journal_edit') || !isset($ev['data']->text) || !is_string($ev['data']->text)) return;
  $day = isset($ev['d']) ? $ev['d'] : date('Y-m-d', (int) floor($ev['t'] / 1000));
  $jdir = $dir . '/journal'; if (!is_dir($jdir)) @mkdir($jdir, 0700, true);
  $label = $ev['type'] === 'journal_edit' ? ' (edited an earlier page)' : '';
  @file_put_contents($jdir . '/' . substr($day, 0, 7) . '.md', '## ' . $day . ' ' . (isset($ev['h']) ? $ev['h'] : '') . ' (' . (isset($ev['dn']) ? $ev['dn'] : 'device') . ')' . $label . "\n\n" . trim($ev['data']->text) . "\n\n", FILE_APPEND);
}

// ------------------------------------------------------------------ actions
function act_ping() {
  $ok = false;
  try { setup_data_dir(); $t = data_dir() . '/.write_test'; $ok = @file_put_contents($t, 'ok') !== false; @unlink($t); } catch (Throwable $e) { $ok = false; }
  $inside = strpos(realpath(data_dir()) ?: data_dir(), realpath(__DIR__) . '/') === 0;
  $shop = 0; foreach (glob(SHOP_DIR . '/packs/*/item.json') ?: array() as $f) if (substr(basename(dirname($f)), 0, 1) !== '_') $shop++;
  return array('ok' => true, 'app' => 'aiu-totem', 'api' => API_VERSION, 'server' => 'php', 'version' => '2.7.0', 'profiles' => true, 'files' => true, 'files_max_mb' => FILES_MAX_MB, 'php' => PHP_VERSION, 'openssl' => function_exists('hash_pbkdf2'),
    'data_folder_ok' => $ok, 'data_folder_private' => !$inside, 'mail_program_found' => @is_executable(SENDMAIL) || function_exists('mail'),
    'shop_items' => $shop, 'email_confirm_required' => REQUIRE_EMAIL_CONFIRM, 'signups_open' => SIGNUPS_OPEN, 'now' => now_ms());
}
function act_signup($req) {
  if (!SIGNUPS_OPEN) fail(403, 'closed', 'New sign-ups are closed.');
  $u = clean_user(g($req, 'u')); $em0 = trim((string) g($req, 'email', '')); $email = $em0 === '' ? '' : clean_email($em0); $pw = clean_pw(g($req, 'pw')); // 2.4.0: email is optional
  rate_limit('signup', 6, 3600);
  $acct = with_lock(data_dir() . '/accounts/.signup.lock', function () use ($u, $email, $pw) {
    if (file_exists(acct_dir($u)) || file_exists(acct_dir($u) . '.reserved')) fail(409, 'taken', 'That username is taken. Try another.');
    mkdir(acct_dir($u), 0700, true);
    $acct = array('u' => $u, 'email' => $email, 'created' => now_ms(), 'confirmed' => !REQUIRE_EMAIL_CONFIRM, 'pw' => make_pw($pw), 'fails' => 0, 'lock_until' => 0);
    save_account($u, $acct);
    write_json(acct_dir($u) . '/meta.json', array('last_seq' => 0, 'count' => 0));
    touch(acct_dir($u) . '/events.jsonl'); @chmod(acct_dir($u) . '/events.jsonl', 0600);
    return $acct;
  });
  if (REQUIRE_EMAIL_CONFIRM) { $sent = send_confirm($u, $acct); return array('ok' => true, 'confirm_needed' => true, 'mail_sent' => $sent); }
  return array('ok' => true, 'confirm_needed' => false);
}
function act_resend($req) {
  $u = clean_user(g($req, 'u')); $email = strtolower(trim((string) g($req, 'email', '')));
  rate_limit('resend', 5, 3600);
  $acct = load_account($u);
  if ($acct && empty($acct['confirmed']) && strtolower((string) $acct['email']) === $email) send_confirm($u, $acct);
  return array('ok' => true);
}
function act_confirm($q) {
  $u = clean_user(isset($q['u']) ? $q['u'] : '');
  $acct = load_account($u);
  if ($acct && !empty($acct['confirmed'])) return array(200, 'Already confirmed', 'Your email is already confirmed. You can log in.');
  if ($acct && !empty($acct['confirm_key']) && hash_equals($acct['confirm_key'], sha256(isset($q['k']) ? $q['k'] : ''))) {
    $acct['confirmed'] = true; unset($acct['confirm_key']); save_account($u, $acct);
    return array(200, 'Email confirmed', 'Email confirmed! Go back to Aiu Totem and log in to meet your egg.');
  }
  return array(400, 'Link not valid', 'That confirm link is not valid. Try "Resend confirm email" in the app.');
}
function act_login($req) {
  $u = clean_user(g($req, 'u'));
  rate_limit('login', 30, 900);
  $acct = load_account($u);
  if (!$acct) fail(401, 'bad_login', 'Username or password is wrong.');
  if ((int) $acct['lock_until'] > now_ms()) fail(429, 'locked', 'Too many wrong passwords. Try again in 15 minutes.');
  if (!check_pw($acct['pw'], g($req, 'pw', ''))) {
    $acct['fails'] = (int) $acct['fails'] + 1;
    if ($acct['fails'] >= LOCK_AFTER) { $acct['lock_until'] = now_ms() + 15 * 60 * 1000; $acct['fails'] = 0; }
    save_account($u, $acct);
    fail(401, 'bad_login', 'Username or password is wrong.');
  }
  // 2.4.0: no email confirm (older accounts that never confirmed can log in now)
  if ((int) $acct['fails'] > 0) { $acct['fails'] = 0; save_account($u, $acct); }
  return array('ok' => true, 'u' => $u, 'email' => $acct['email'], 'token' => new_token($u, g($req, 'dn', '')));
}
function act_forgot($req) { fail(410, 'no_recovery', 'Passwords can\'t be reset: no one can get into an account without its password. Start a new account.'); } // 2.7.0
function act_reset($req) { fail(410, 'no_recovery', 'Passwords can\'t be reset: no one can get into an account without its password. Start a new account.'); } // 2.7.0
function act_sync($req) {
  list($u, $acct, $th) = auth($req);
  $tid = clean_tid(g($req, 'tid', ''));
  $pn = g($req, 'pname'); $pk = g($req, 'pkind');
  ensure_profile($u, $tid, $pn === null ? null : short_str($pn, 40), $pk === null ? null : clean_kind((string) $pk));
  $dir = totem_dir($u, $tid); $now = now_ms();
  $since = is_int(g($req, 'since')) ? g($req, 'since') : 0;
  $incoming = is_array(g($req, 'events')) ? g($req, 'events') : array();
  if (count($incoming) > MAX_EVENTS_PER_PUSH) fail(413, 'too_many', 'Too many events at once.');
  $raw = with_lock($dir . '/.events.lock', function () use ($dir, $now, $since, $incoming) {
    $meta = read_json($dir . '/meta.json', array('last_seq' => 0, 'count' => 0));
    $path = $dir . '/events.jsonl';
    if ($incoming && is_file($path) && filesize($path) > MAX_ACCOUNT_MB * 1024 * 1024) fail(413, 'full', 'This Totem reached the ' . MAX_ACCOUNT_MB . ' MB limit on the server. Ask the server owner to raise MAX_ACCOUNT_MB.');
    $seen = array();
    if ($incoming && is_file($path)) { $fh = fopen($path, 'r'); while (($line = fgets($fh)) !== false) if (preg_match(LINE_RE, $line, $m)) $seen[$m[2]] = (int) $m[1]; fclose($fh); }
    $rejected = 0; $known = new stdClass(); $accepted = 0; $out = '';
    foreach ($incoming as $r) {
      $ev = clean_event($r, $now);
      if ($ev === null) { $rejected++; continue; }
      if (isset($seen[$ev['id']])) { $known->{$ev['id']} = $seen[$ev['id']]; continue; }
      $meta['last_seq'] = (int) $meta['last_seq'] + 1; $meta['count'] = (int) $meta['count'] + 1;
      $ev['seq'] = $meta['last_seq']; $seen[$ev['id']] = $ev['seq'];
      $out .= json_encode($ev, JF) . "\n"; $accepted++;
      mirror_journal($dir, $ev);
    }
    if ($out !== '') { file_put_contents($path, $out, FILE_APPEND | LOCK_EX); @chmod($path, 0600); }
    write_json($dir . '/meta.json', $meta);
    // the pull: the stored lines go out as they are (no re-encoding, so {} stays {})
    $lines = array(); $more = false; $last = $since;
    if (is_file($path)) {
      $fh = fopen($path, 'r');
      while (($line = fgets($fh)) !== false) {
        if (!preg_match(LINE_RE, $line, $m) || (int) $m[1] <= $since) continue;
        if (count($lines) >= MAX_EVENTS_PER_PULL) { $more = true; break; }
        $lines[] = rtrim($line, "\r\n"); $last = (int) $m[1];
      }
      fclose($fh);
    }
    return '{"ok":true,"events":[' . implode(',', $lines) . '],"last_seq":' . $last . ',"server_last_seq":' . (int) $meta['last_seq']
      . ',"more":' . ($more ? 'true' : 'false') . ',"accepted":' . $accepted . ',"rejected":' . $rejected . ',"known":' . json_encode($known, JF) . ',"now":' . $now . '}';
  });
  $snap = g($req, 'snapshot');
  if (is_object($snap) && strlen(json_encode($snap, JF)) < 200000) { $snap->saved_at = $now; write_json($dir . '/totem.json', $snap); }
  touch_token($u, $th);
  return array('__raw' => $raw);
}
function act_me($req) {
  list($u, $acct, $th) = auth($req);
  $devices = array(); foreach (read_json(tokens_path($u), array()) as $r) $devices[] = array('dn' => isset($r['dn']) ? $r['dn'] : '', 'last' => isset($r['last']) ? $r['last'] : 0);
  return array('ok' => true, 'u' => $u, 'email' => $acct['email'], 'confirmed' => !empty($acct['confirmed']), 'created' => $acct['created'], 'devices' => $devices);
}
function act_password($req) {
  list($u, $acct, $th) = auth($req);
  if (!check_pw($acct['pw'], g($req, 'old', ''))) fail(401, 'bad_password', 'Your current password is wrong.');
  $acct['pw'] = make_pw(clean_pw(g($req, 'pw'))); save_account($u, $acct);
  with_lock(acct_dir($u) . '/.tokens.lock', function () use ($u, $th) { $t = read_json(tokens_path($u), array()); write_json(tokens_path($u), isset($t[$th]) ? array($th => $t[$th]) : array(), true); });
  return array('ok' => true);
}
function act_logout($req) {
  list($u, $acct, $th) = auth($req);
  with_lock(acct_dir($u) . '/.tokens.lock', function () use ($u, $th) { $t = read_json(tokens_path($u), array()); unset($t[$th]); write_json(tokens_path($u), $t, true); });
  return array('ok' => true);
}
function rm_rf($p) { if (is_dir($p) && !is_link($p)) { foreach (scandir($p) as $f) if ($f !== '.' && $f !== '..') rm_rf($p . '/' . $f); @rmdir($p); } else @unlink($p); }
function act_delete_account($req) {
  list($u, $acct, $th) = auth($req);
  if (!check_pw($acct['pw'], g($req, 'pw', ''))) fail(401, 'bad_password', 'Your password is wrong.');
  if ((string) g($req, 'phrase', '') !== 'DELETE ' . strtoupper($u)) fail(400, 'bad_phrase', 'Type the confirmation phrase exactly.');
  with_lock(data_dir() . '/accounts/.signup.lock', function () use ($u) { rm_rf(acct_dir($u)); });
  return array('ok' => true);
}
// 2.2.0: the account's profiles (name, kind, how far its Totem has grown)
function act_profiles($req) {
  list($u, $acct, $th) = auth($req);
  $all = read_profiles($u); if (!isset($all['main'])) $all['main'] = array('created' => $acct['created']);
  $out = array();
  foreach ($all as $k => $v) {
    if (!is_array($v) || !empty($v['deleted'])) continue;
    $tid = $k === 'main' ? '' : $k;
    if ($tid !== '' && !preg_match('/\At[a-z0-9]{5,23}\z/', $tid)) continue;
    $dir = totem_dir($u, $tid); if (!is_dir($dir)) continue;
    $snap = read_json($dir . '/totem.json', array()); $meta = read_json($dir . '/meta.json', array('count' => 0));
    $out[] = array('tid' => $tid, 'name' => isset($v['name']) ? $v['name'] : '', 'kind' => isset($v['kind']) ? $v['kind'] : 'personal', 'created' => isset($v['created']) ? $v['created'] : 0,
      'totem' => isset($snap['name']) ? $snap['name'] : '', 'stage' => isset($snap['stage_name']) ? $snap['stage_name'] : '', 'events' => isset($meta['count']) ? (int) $meta['count'] : 0);
  }
  return array('ok' => true, 'profiles' => $out);
}
function act_profile_set($req) {
  list($u, $acct, $th) = auth($req);
  $tid = clean_tid(g($req, 'tid', ''));
  $pn = g($req, 'pname'); $pk = g($req, 'pkind');
  $rec = ensure_profile($u, $tid, $pn === null ? null : short_str($pn, 40), $pk === null ? null : clean_kind((string) $pk));
  return array('ok' => true, 'profile' => $rec);
}
// deleting one profile (not the first one: that is the account itself) needs the password and a typed phrase
function act_profile_delete($req) {
  list($u, $acct, $th) = auth($req);
  $tid = clean_tid(g($req, 'tid', ''));
  if ($tid === '') fail(400, 'main_profile', 'The first profile is the account itself. Use Delete my account instead.');
  if (!check_pw($acct['pw'], g($req, 'pw', ''))) fail(401, 'bad_password', 'Your password is wrong.');
  if ((string) g($req, 'phrase', '') !== 'DELETE PROFILE') fail(400, 'bad_phrase', 'Type the confirmation phrase exactly.');
  with_lock(acct_dir($u) . '/.profiles.lock', function () use ($u, $tid) {
    $all = read_profiles($u);
    rm_rf(totem_dir($u, $tid));
    $all[$tid] = array('deleted' => now_ms());
    write_json(profiles_path($u), $all, true);
  });
  return array('ok' => true);
}
// ------------------------------------------------------------------ 2.5.0: Docs (your files). The app scrambles each file on your
// device (AES-GCM) before it uploads, so these folders hold only scrambled bytes. A file goes up in pieces of 1 MB or less
// (hosts often cap one request), and lives in <profile folder>/files/<id>/0.bin, 1.bin, ... with a small meta.json.
function blob_id($s) { $s = (string) $s; if (!preg_match('/\A[a-z0-9]{12,40}\z/', $s)) fail(400, 'bad_file', 'That file id does not look right.'); return $s; }
function blob_dir($u, $tid, $id) { return totem_dir($u, $tid) . '/files/' . $id; }
function dir_bytes($p) { $n = 0; if (!is_dir($p)) return 0; $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($p, FilesystemIterator::SKIP_DOTS)); foreach ($it as $f) if ($f->isFile()) $n += $f->getSize(); return $n; }
function files_total() { $n = 0; foreach (glob(data_dir() . '/accounts/*/files', GLOB_ONLYDIR) ?: array() as $d) $n += dir_bytes($d); foreach (glob(data_dir() . '/accounts/*/totems/*/files', GLOB_ONLYDIR) ?: array() as $d) $n += dir_bytes($d); return $n; }
function files_used($u) { $n = dir_bytes(acct_dir($u) . '/files'); foreach (glob(acct_dir($u) . '/totems/*/files', GLOB_ONLYDIR) ?: array() as $d) $n += dir_bytes($d); return $n; }
function act_blob_put($req) {
  list($u, $acct, $th) = auth($req);
  $tid = clean_tid(g($req, 'tid', '')); $id = blob_id(g($req, 'id', ''));
  $i = g($req, 'i'); $n = g($req, 'n');
  if (!is_int($i) || !is_int($n) || $n < 1 || $n > FILE_MAX_PIECES || $i < 0 || $i >= $n) fail(400, 'bad_piece', 'Bad file piece.');
  $raw = base64_decode((string) g($req, 'data', ''), true);
  if ($raw === false || strlen($raw) > PIECE_MAX) fail(400, 'bad_piece', 'Bad file piece.');
  if (files_used($u) + strlen($raw) > FILES_MAX_MB * 1024 * 1024) fail(413, 'files_full', 'Your Files space is full (' . FILES_MAX_MB . ' MB). Delete some files from the Discard pile first.');
  if (files_total() + strlen($raw) > FILES_TOTAL_MB * 1024 * 1024) fail(507, 'server_full', 'The server\'s file space is full. Tell KODNA (the server owner).');
  $dir = blob_dir($u, $tid, $id); if (!is_dir($dir)) @mkdir($dir, 0700, true);
  if (@file_put_contents("$dir/$i.bin", $raw) === false) fail(500, 'disk', 'The server could not save the file.');
  write_json("$dir/meta.json", array('n' => $n, 't' => now_ms()), true);
  $have = 0; for ($k = 0; $k < $n; $k++) if (is_file("$dir/$k.bin")) $have++;
  return array('ok' => true, 'have' => $have, 'n' => $n);
}
function act_blob_get($req) {
  list($u, $acct, $th) = auth($req);
  $tid = clean_tid(g($req, 'tid', '')); $id = blob_id(g($req, 'id', '')); $dir = blob_dir($u, $tid, $id);
  $meta = read_json("$dir/meta.json", null); $i = g($req, 'i', 0);
  if (!is_array($meta) || !is_int($i) || $i < 0 || $i >= (int) $meta['n'] || !is_file("$dir/$i.bin")) fail(404, 'no_file', 'That file is not on the server.');
  return array('ok' => true, 'n' => (int) $meta['n'], 'data' => base64_encode(file_get_contents("$dir/$i.bin")));
}
function act_blob_del($req) {
  list($u, $acct, $th) = auth($req);
  $tid = clean_tid(g($req, 'tid', '')); $id = blob_id(g($req, 'id', ''));
  rm_rf(blob_dir($u, $tid, $id));
  return array('ok' => true, 'used' => files_used($u), 'max' => FILES_MAX_MB * 1024 * 1024);
}
function act_blob_list($req) { // 2.6.0: what's on the server for this profile (the app tidies away files nothing points to)
  list($u, $acct, $th) = auth($req);
  $tid = clean_tid(g($req, 'tid', '')); $out = array();
  foreach (glob(totem_dir($u, $tid) . '/files/*', GLOB_ONLYDIR) ?: array() as $d) {
    $id = basename($d); if (!preg_match('/\A[a-z0-9]{12,40}\z/', $id)) continue;
    $m = read_json("$d/meta.json", array()); $n = isset($m['n']) ? (int) $m['n'] : 0; $have = 0; for ($k = 0; $k < $n; $k++) if (is_file("$d/$k.bin")) $have++;
    $out[] = array('id' => $id, 'n' => $n, 'have' => $have, 't' => isset($m['t']) ? (int) $m['t'] : 0);
  }
  return array('ok' => true, 'files' => $out, 'now' => now_ms());
}
function act_blob_usage($req) {
  list($u, $acct, $th) = auth($req);
  return array('ok' => true, 'used' => files_used($u), 'max' => FILES_MAX_MB * 1024 * 1024);
}

function act_shop() { // folders you upload by hand: aiu/shop/packs/<item>/item.json + item.png (the shop is on hold in the app)
  $items = array(); $problems = array(); $cats = array('hat', 'toy', 'backdrop', 'house', 'decor', 'activity');
  $dirs = glob(SHOP_DIR . '/packs/*') ?: array(); sort($dirs);
  foreach ($dirs as $dir) {
    $id = basename($dir);
    if ($id[0] === '_' || $id[0] === '.' || !is_dir($dir)) continue;
    if (!preg_match('/\A[a-z0-9][a-z0-9-]{0,39}\z/', $id)) { $problems[] = "$id: folder names must be lowercase letters, numbers and dashes"; continue; }
    $meta = read_json($dir . '/item.json', null);
    if (!is_array($meta)) { $problems[] = "$id: item.json is missing or not valid JSON"; continue; }
    $file = isset($meta['file']) ? (string) $meta['file'] : 'item.png';
    if (!preg_match('/\A[A-Za-z0-9_.-]+\.png\z/', $file) || !is_file($dir . '/' . $file)) { $problems[] = "$id: picture $file not found"; continue; }
    $cat = isset($meta['category']) ? (string) $meta['category'] : '';
    if (!in_array($cat, $cats, true)) { $problems[] = "$id: category must be one of " . implode(', ', $cats); continue; }
    $size = @getimagesize($dir . '/' . $file); $maxw = $cat === 'activity' ? 768 : 192;
    if (!$size || $size[0] > $maxw || $size[1] > 108) { $problems[] = "$id: picture must be a PNG no bigger than $maxw x 108"; continue; }
    $price = max(0, min(9999, (int) (isset($meta['price']) ? $meta['price'] : 0)));
    $item = array('id' => $id, 'name' => short_str(isset($meta['name']) ? $meta['name'] : $id, 40), 'category' => $cat, 'price' => $price, 'desc' => short_str(isset($meta['desc']) ? $meta['desc'] : '', 120),
      'file' => "packs/$id/$file", 'w' => $size[0], 'h' => $size[1], 'retired' => !empty($meta['retired']), 'v' => filemtime($dir . '/' . $file));
    if ($cat === 'activity') {
      $item['frames'] = max(1, min(12, (int) (isset($meta['frames']) ? $meta['frames'] : 1)));
      $item['fps'] = isset($meta['fps']) ? max(1, min(12, (int) $meta['fps'])) : 4;
      $item['label'] = short_str(isset($meta['label']) ? $meta['label'] : (isset($meta['name']) ? $meta['name'] : $id), 40);
      $item['where'] = in_array(isset($meta['where']) ? $meta['where'] : '', array('in', 'out', 'both'), true) ? $meta['where'] : 'both';
      $item['anchor'] = in_array(isset($meta['anchor']) ? $meta['anchor'] : '', array('side', 'front', 'above'), true) ? $meta['anchor'] : 'side';
      $item['keys'] = array_slice(array_values(array_filter(array_map(function ($k) { return strtolower(short_str($k, 30)); }, isset($meta['keys']) && is_array($meta['keys']) ? $meta['keys'] : array()))), 0, 12);
    }
    $items[] = $item;
  }
  return array('ok' => true, 'items' => $items, 'problems' => $problems, 'categories' => array('hat' => 'Hats', 'toy' => 'Toys', 'backdrop' => 'Views', 'house' => 'Houses', 'decor' => 'Room decor', 'activity' => 'Things to do'));
}

// ------------------------------------------------------------------ main
try {
  setup_data_dir();
  $method = strtoupper(isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET');
  if ($method === 'GET') {
    $a = isset($_GET['a']) ? $_GET['a'] : '';
    if ($a === 'confirm') { list($s, $t, $m) = act_confirm($_GET); respond_html($s, $t, $m); }
    elseif ($a === 'ping' || $a === '') respond(200, act_ping());
    elseif ($a === 'shop') respond(200, act_shop());
    else respond(405, array('ok' => false, 'code' => 'post_only', 'error' => 'Use POST.'));
  } elseif ($method === 'POST') {
    $len = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
    if ($len > MAX_BODY) fail(413, 'too_big', 'Request too big.');
    $body = file_get_contents('php://input');
    if (strlen($body) > MAX_BODY) fail(413, 'too_big', 'Request too big.');
    if (!mb_check_encoding($body, 'UTF-8')) fail(400, 'bad_text', 'Text must be UTF-8.');
    $req = $body === '' ? new stdClass() : json_decode($body, false, 64, JSON_BIGINT_AS_STRING);
    if (!is_object($req)) fail(400, 'bad_json', 'Bad request.');
    $acts = array('ping' => 'act_ping', 'signup' => 'act_signup', 'resend' => 'act_resend', 'login' => 'act_login', 'forgot' => 'act_forgot', 'reset' => 'act_reset',
      'sync' => 'act_sync', 'me' => 'act_me', 'profiles' => 'act_profiles', 'profile_set' => 'act_profile_set', 'profile_delete' => 'act_profile_delete', 'blob_put' => 'act_blob_put', 'blob_get' => 'act_blob_get', 'blob_del' => 'act_blob_del', 'blob_usage' => 'act_blob_usage', 'blob_list' => 'act_blob_list', 'password' => 'act_password', 'logout' => 'act_logout', 'delete_account' => 'act_delete_account', 'shop' => 'act_shop');
    $an = (string) g($req, 'a', '');
    if (!isset($acts[$an])) fail(404, 'unknown', 'Unknown action.');
    $res = call_user_func($acts[$an], $req);
    if (is_array($res) && isset($res['__raw'])) respond(200, null, $res['__raw']); else respond(200, $res);
  } else respond(405, array('ok' => false, 'code' => 'method', 'error' => 'Method not allowed.'));
} catch (ApiError $e) {
  respond($e->status, array('ok' => false, 'code' => $e->code2, 'error' => $e->getMessage()));
} catch (Throwable $e) {
  @file_put_contents(data_dir() . '/error.log', date('c') . ' ' . get_class($e) . ': ' . $e->getMessage() . ' @' . $e->getFile() . ':' . $e->getLine() . "\n", FILE_APPEND);
  respond(500, array('ok' => false, 'code' => 'server', 'error' => 'Server error. The details were saved in aiu_data/error.log.'));
}
