#!/usr/bin/env ruby
# encoding: utf-8
#
# AIU TOTEM - sync server (one file, Ruby standard library only, no gems)
#
# The web app does all the thinking. This file only:
#   - creates accounts (username + email + password), confirms email, resets passwords
#   - keeps each account's Totem as a private folder of plain files (outside public_html)
#   - acts as the "mailbox": devices drop their new events here and pick up everyone else's
#
# There is one live copy of each Totem (no backups). Only "Delete my account" (password + typed phrase) removes it.
#
# 2.2.0: one account can hold several Aiu profiles (one Totem each). The first profile is the account folder itself
# (as before, so nothing moves). Every other profile is accounts/<user>/totems/<id>/ with the same files.
# profiles.json lists their names. Same files and answers as api.php, so either server can take over.
#
# 2.8.0: private. Each account has a data key, made on a device and kept in account.json only locked with the password
# (the 'dk' record: the server can't open it). Every event's contents, each profile's name and the Totem summary arrive
# already scrambled with it ("x1:..." text). What the server still sees: usernames, each event's id, time and type, and
# file sizes. Older plain events are scrambled in place by the first 2.8.0 device that syncs (act_reseal).
#
# ------------------------------------------------------------------ SETTINGS
# Change these if your server is different. Leave the ENV parts alone.
APP_URL   = ENV['AIU_APP_URL']   || 'https://kodna.net/aiu/'          # where index.html lives (used in emails)
DATA_DIR  = ENV['AIU_DATA_DIR']  || File.expand_path('../../aiu_data', __dir__)  # beside public_html by default
MAIL_FROM = ENV['AIU_MAIL_FROM'] || 'Aiu Totem <noreply@kodna.net>'
SENDMAIL  = ENV['AIU_SENDMAIL']  || '/usr/sbin/sendmail'
API_URL   = ENV['AIU_API_URL']   || (APP_URL.sub(%r{/*\z}, '/') + 'api.cgi')  # this file's web address (used in emails)
REQUIRE_EMAIL_CONFIRM = false  # 2.4.0: accounts are a username and a password. No email, no confirm link.
ALLOW_DEV = (ENV['AIU_ALLOW_DEV'] || '0') == '1'                   # 2.6.0: '1' only on a test server
SIGNUPS_OPEN = (ENV['AIU_SIGNUPS_OPEN'] || '1') == '1'              # '0' = nobody new can sign up
SHOP_DIR  = ENV['AIU_SHOP_DIR']  || File.expand_path('shop', __dir__) # shop folders (public): shop/packs/<item>/
MAX_ACCOUNT_MB = (ENV['AIU_MAX_ACCOUNT_MB'] || '50').to_i             # size limit for one Totem's event log
FILES_MAX_MB = (ENV['AIU_FILES_MAX_MB'] || '250').to_i               # 2.5.0: Files space for one account (all its profiles); 2.6.0: 250 MB
FILES_TOTAL_MB = (ENV['AIU_FILES_TOTAL_MB'] || '5000').to_i          # 2.6.0: Files space for the whole server, every account together
DELETE_INACTIVE_DAYS = (ENV['AIU_DELETE_INACTIVE_DAYS'] || '0').to_i  # 2.8.0: delete accounts nobody has used for this many days (0 = never)
# ---------------------------------------------------------------------------

require 'json'
require 'openssl'
require 'securerandom'
require 'fileutils'
require 'digest'

API_VERSION = 1
MAX_BODY    = 4 * 1024 * 1024
MAX_EVENTS_PER_PUSH = 1000
MAX_EVENTS_PER_PULL = 3000
MAX_EVENT_BYTES     = 16_000
MAX_PROFILES        = 24 # Aiu profiles per account (2.2.0)
PIECE_MAX           = 1024 * 1024 + 64 # 2.5.0: one piece of a file
FILE_MAX_PIECES     = 64 # so one file is at most about 64 MB (the app keeps it to 25)
PBKDF_ITER  = 60_000
RESET_TTL   = 3600          # seconds a reset link stays valid
LOCK_AFTER  = 10            # failed logins before a 15 minute lock
FUTURE_SLACK_MS = 10 * 60 * 1000

class ApiError < StandardError
  attr_reader :status, :code
  def initialize(status, code, msg)
    super(msg)
    @status = status
    @code = code
  end
end

# ------------------------------------------------------------------ helpers
def now_ms
  (Time.now.to_f * 1000).to_i
end

STATUS_TEXT = { 200 => 'OK', 400 => 'Bad Request', 401 => 'Unauthorized', 403 => 'Forbidden', 404 => 'Not Found',
                405 => 'Method Not Allowed', 409 => 'Conflict', 410 => 'Gone', 413 => 'Payload Too Large', 426 => 'Upgrade Required', 429 => 'Too Many Requests',
                500 => 'Internal Server Error' }.freeze

def status_line(status)
  "Status: #{status} #{STATUS_TEXT[status] || 'OK'}\r\n"
end

def respond(status, obj)
  body = JSON.generate(obj)
  $stdout.binmode
  $stdout.write(status_line(status) + "Content-Type: application/json; charset=utf-8\r\n" \
                "Cache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\n\r\n")
  $stdout.write(body)
end

def respond_html(status, title, message)
  esc = lambda { |s| s.to_s.gsub('&', '&amp;').gsub('<', '&lt;').gsub('>', '&gt;').gsub('"', '&quot;') }
  html = "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" \
         "<title>#{esc.call(title)}</title></head><body style=\"font-family:monospace;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5\">" \
         "<h1 style=\"font-size:1.2rem;border-bottom:3px solid #000;padding-bottom:.5rem\">AIU TOTEM</h1>" \
         "<p>#{esc.call(message)}</p><p><a href=\"#{esc.call(APP_URL)}\">Open Aiu Totem</a></p></body></html>"
  $stdout.binmode
  $stdout.write(status_line(status) + "Content-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\n\r\n")
  $stdout.write(html)
end

def fail!(status, code, msg)
  raise ApiError.new(status, code, msg)
end

def parse_query(qs)
  out = {}
  (qs || '').split('&').each do |pair|
    k, v = pair.split('=', 2)
    next if k.nil? || k.empty?
    dec = lambda { |s| s.to_s.tr('+', ' ').gsub(/%([0-9A-Fa-f]{2})/) { [$1.hex].pack('C') }.force_encoding('UTF-8') }
    out[dec.call(k)] = dec.call(v)
  end
  out
end

def secure_eq(a, b)
  a = a.to_s
  b = b.to_s
  return false if a.bytesize != b.bytesize
  r = 0
  a.bytes.zip(b.bytes) { |x, y| r |= x ^ y }
  r == 0
end

def sha256(s)
  Digest::SHA256.hexdigest(s.to_s)
end

def pbkdf2(pw, salt, iter)
  if defined?(OpenSSL::KDF) && OpenSSL::KDF.respond_to?(:pbkdf2_hmac)
    OpenSSL::KDF.pbkdf2_hmac(pw, salt: salt, iterations: iter, length: 32, hash: 'sha256').unpack('H*')[0]
  else
    OpenSSL::PKCS5.pbkdf2_hmac(pw, salt, iter, 32, OpenSSL::Digest::SHA256.new).unpack('H*')[0]
  end
end

def make_pw(pw)
  salt = SecureRandom.hex(16)
  { 'salt' => salt, 'iter' => PBKDF_ITER, 'hash' => pbkdf2(pw, salt, PBKDF_ITER) }
end

def check_pw(rec, pw)
  return false unless rec && rec['salt'] && rec['hash']
  secure_eq(pbkdf2(pw.to_s, rec['salt'], rec['iter'] || PBKDF_ITER), rec['hash'])
end

def read_json(path, default)
  return default unless File.exist?(path)
  JSON.parse(File.read(path, :encoding => 'UTF-8'))
rescue JSON::ParserError
  default
end

def write_json(path, obj)
  tmp = "#{path}.tmp#{Process.pid}"
  File.open(tmp, 'w', 0o600) { |f| f.write(JSON.pretty_generate(obj)) }
  File.rename(tmp, path)
end

def with_lock(path)
  File.open(path, File::RDWR | File::CREAT, 0o600) do |f|
    f.flock(File::LOCK_EX)
    yield
  end
end

def clean_user(u)
  u = u.to_s.strip.downcase
  fail!(400, 'bad_username', 'Usernames are 3-24 letters, numbers, - or _.') unless u =~ /\A[a-z0-9_-]{3,24}\z/
  u
end

def clean_email(e)
  e = e.to_s.strip
  fail!(400, 'bad_email', 'That email address does not look right.') unless e.bytesize <= 254 && e =~ /\A[^@\s<>,;"]+@[^@\s<>,;"]+\.[^@\s<>,;"]+\z/
  e
end

def clean_pw(pw)
  pw = pw.to_s
  fail!(400, 'weak_password', 'Passwords need at least 8 characters.') if pw.length < 8
  fail!(400, 'bad_password', 'That password is too long.') if pw.bytesize > 512
  pw
end

def short_str(s, max)
  s.to_s.gsub(/[\r\n\t]/, ' ')[0, max]
end

def acct_dir(u)
  File.join(DATA_DIR, 'accounts', u)
end

# 2.2.0: profiles. '' = the first profile (the account folder itself); others look like t + 5-23 letters/numbers
TID_RE = /\At[a-z0-9]{5,23}\z/
def clean_tid(t)
  t = t.to_s.strip.downcase
  return '' if t.empty? || t == 'main'
  fail!(400, 'bad_profile', 'That profile id does not look right.') unless t =~ TID_RE
  t
end

def totem_dir(u, tid)
  tid.empty? ? acct_dir(u) : File.join(acct_dir(u), 'totems', tid)
end

def profiles_path(u)
  File.join(acct_dir(u), 'profiles.json')
end

def read_profiles(u)
  p = read_json(profiles_path(u), {})
  p.is_a?(Hash) ? p : {}
end

def clean_kind(k)
  k.to_s == 'business' ? 'business' : 'personal'
end

def ensure_profile(u, tid, name, kind)
  with_lock(File.join(acct_dir(u), '.profiles.lock')) do
    all = read_profiles(u)
    key = tid.empty? ? 'main' : tid
    changed = false
    if !tid.empty? && !File.directory?(totem_dir(u, tid))
      n = all.count { |k, v| k != 'main' && v.is_a?(Hash) && !v['deleted'] }
      fail!(413, 'too_many_profiles', "This account has the most profiles it can hold (#{MAX_PROFILES}).") if n + 1 >= MAX_PROFILES
      FileUtils.mkdir_p(totem_dir(u, tid), :mode => 0o700)
      write_json(File.join(totem_dir(u, tid), 'meta.json'), { 'last_seq' => 0, 'count' => 0 })
      File.open(File.join(totem_dir(u, tid), 'events.jsonl'), 'a', 0o600) {}
    end
    rec = all[key].is_a?(Hash) ? all[key] : { 'created' => now_ms }
    fail!(410, 'profile_deleted', 'That profile was deleted.') if rec['deleted']
    if name && !name.empty? && rec['name'] != name
      rec['name'] = name
      changed = true
    end
    if kind && rec['kind'] != kind
      rec['kind'] = kind
      changed = true
    end
    changed = true unless all.key?(key)
    if changed
      all[key] = rec
      write_json(profiles_path(u), all)
    end
    rec
  end
end

def setup_data_dir
  %w[accounts rate outbox].each { |d| FileUtils.mkdir_p(File.join(DATA_DIR, d), :mode => 0o700) }
  ht = File.join(DATA_DIR, '.htaccess')
  File.open(ht, 'w', 0o644) { |f| f.write("Require all denied\nDeny from all\n") } unless File.exist?(ht)
end

def client_ip
  (ENV['REMOTE_ADDR'] || 'unknown').to_s
end

# Simple per-IP limiter: at most `max` calls of `action` in `window` seconds.
def rate_limit!(action, max, window)
  path = File.join(DATA_DIR, 'rate', sha256("#{client_ip}|#{action}")[0, 20] + '.json')
  with_lock(path + '.lock') do
    now = Time.now.to_i
    hits = read_json(path, []).select { |t| t.is_a?(Integer) && t > now - window }
    fail!(429, 'slow_down', 'Too many tries. Please wait a while and try again.') if hits.length >= max
    hits << now
    write_json(path, hits)
  end
end

def send_mail(to, subject, body)
  msg = "From: #{MAIL_FROM}\nTo: #{to}\nSubject: #{subject}\nMIME-Version: 1.0\n" \
        "Auto-Submitted: auto-generated\nX-Auto-Response-Suppress: All\n" \
        "Content-Type: text/plain; charset=utf-8\n\n#{body}\n--\nThis is an automatic no-reply message from Aiu Totem. Replies are not read.\n"
  sent = false
  if File.executable?(SENDMAIL)
    begin
      envelope = MAIL_FROM[/<([^>]+)>/, 1] || MAIL_FROM
      IO.popen([SENDMAIL, '-t', '-i', '-f', envelope], 'w') { |io| io.write(msg) }
      sent = $?.respond_to?(:success?) ? $?.success? : true
    rescue StandardError
      sent = false
    end
  end
  # Keep a copy for the server owner, so links can be found even if mail goes missing.
  begin
    name = Time.now.strftime('%Y%m%d-%H%M%S') + '-' + SecureRandom.hex(3) + '.txt'
    File.open(File.join(DATA_DIR, 'outbox', name), 'w', 0o600) { |f| f.write("sent=#{sent}\n#{msg}") }
  rescue StandardError
    nil
  end
  sent
end

def load_account(u)
  path = File.join(acct_dir(u), 'account.json')
  return nil unless File.exist?(path)
  read_json(path, nil)
end

def save_account(u, acct)
  write_json(File.join(acct_dir(u), 'account.json'), acct)
end

def tokens_path(u)
  File.join(acct_dir(u), 'tokens.json')
end

def auth!(req)
  u = clean_user(req['u'])
  acct = load_account(u)
  fail!(401, 'login', 'Please log in again.') unless acct
  tok = req['token'].to_s
  fail!(401, 'login', 'Please log in again.') if tok.empty?
  tokens = read_json(tokens_path(u), {})
  rec = tokens[sha256(tok)]
  fail!(401, 'login', 'Please log in again.') unless rec
  [u, acct, sha256(tok)]
end

def touch_token(u, th)
  with_lock(File.join(acct_dir(u), '.tokens.lock')) do
    tokens = read_json(tokens_path(u), {})
    if tokens[th]
      tokens[th]['last'] = now_ms
      write_json(tokens_path(u), tokens)
    end
  end
end

def new_token(u, dn)
  tok = SecureRandom.hex(32)
  with_lock(File.join(acct_dir(u), '.tokens.lock')) do
    tokens = read_json(tokens_path(u), {})
    tokens[sha256(tok)] = { 'dn' => short_str(dn, 40), 'created' => now_ms, 'last' => now_ms }
    write_json(tokens_path(u), tokens)
  end
  tok
end

def send_confirm(u, acct)
  key = SecureRandom.hex(24)
  acct['confirm_key'] = sha256(key)
  save_account(u, acct)
  link = "#{API_URL}?a=confirm&u=#{u}&k=#{key}"
  send_mail(acct['email'], 'Confirm your Aiu Totem account',
            "Hi #{u},\n\nYour egg is waiting! Confirm your email by opening this link:\n\n#{link}\n\n" \
            "If you did not sign up for Aiu Totem, you can ignore this message.\n")
end

# ------------------------------------------------------------------ events
ID_RE  = /\A[A-Za-z0-9_-]{8,64}\z/
DEV_RE = /\A[A-Za-z0-9_-]{4,64}\z/
TYPE_RE = /\A[a-z_]{2,24}\z/
DAY_RE = /\A\d{4}-\d{2}-\d{2}\z/
HM_RE  = /\A\d{2}:\d{2}\z/
LINE_RE = /\A\{"seq":(\d+),"rt":\d+,"id":"([A-Za-z0-9_-]+)"/
MIN_T = 1_577_836_800_000 # 2020-01-01

# 2.8.0: scrambled text from the app: "x1:" + base64 (the server never opens it)
SEALED_RE = %r{\Ax1:[A-Za-z0-9+/]+=*\z}
B64_RE = %r{\A[A-Za-z0-9+/]+=*\z}
def sealed?(v, max = 60_000)
  v.is_a?(String) && v.bytesize <= max && !!(v =~ SEALED_RE)
end

def sealed_obj?(o, max = 60_000)
  o.is_a?(Hash) && o.keys == ['$x'] && sealed?(o['$x'], max)
end

def clean_pname(pn) # a profile name: scrambled (2.8.0) or plain (older apps)
  sealed?(pn, 600) ? pn : short_str(pn, 40)
end

def clean_dk(dk) # the locked data key: { salt, rounds, iv, ct } (base64), made and opened only on devices
  return nil unless dk.is_a?(Hash)
  out = {}
  { 'salt' => 64, 'iv' => 64, 'ct' => 200 }.each do |k, max|
    v = dk[k]
    return nil unless v.is_a?(String) && v.bytesize <= max && v =~ B64_RE
    out[k] = v
  end
  r = dk['rounds']
  return nil unless r.is_a?(Integer) && r >= 100_000 && r <= 5_000_000
  out['rounds'] = r
  out
end

def account_sealed?(acct)
  acct.is_a?(Hash) && !acct['dk'].nil?
end

def need_update!
  fail!(426, 'update_app', 'This account keeps its data private (scrambled). Reload Aiu to get the newest version, then sync again.')
end

def last_used(u, acct) # 2.8.0: the last time anyone used an account (a log in or a sync from any device)
  t = acct['created'].to_i
  read_json(tokens_path(u), {}).each_value { |r| t = r['last'].to_i if r.is_a?(Hash) && r['last'].to_i > t }
  t = acct['last'].to_i if acct['last'].to_i > t
  t
end

def sweep_inactive # 2.8.0: with DELETE_INACTIVE_DAYS set, accounts nobody used for that long are deleted (checked at most once a day)
  return if DELETE_INACTIVE_DAYS <= 0
  mark = File.join(DATA_DIR, '.last_sweep')
  now = now_ms
  return if File.exist?(mark) && File.read(mark).to_i > now - 86_400_000
  File.write(mark, now.to_s)
  cut = now - DELETE_INACTIVE_DAYS * 86_400_000
  Dir.glob(File.join(DATA_DIR, 'accounts', '*')).each do |d|
    next unless File.directory?(d)
    u = File.basename(d)
    next unless u =~ /\A[a-z0-9_-]{3,24}\z/
    acct = load_account(u)
    next unless acct
    next unless last_used(u, acct) < cut
    with_lock(File.join(DATA_DIR, 'accounts', '.signup.lock')) { FileUtils.rm_rf(acct_dir(u)) }
  end
rescue StandardError
  nil
end

def clean_event(e, now, sealed = false)
  return nil unless e.is_a?(Hash)
  id = e['id'].to_s
  return nil unless id =~ ID_RE
  type = e['type'].to_s
  return nil unless type =~ TYPE_RE
  return nil if type == 'dev_growth' && !ALLOW_DEV # 2.6.0: test growth only on a test server
  t = e['t']
  return nil unless t.is_a?(Integer) && t >= MIN_T
  data = e['data'].is_a?(Hash) ? e['data'] : {}
  return nil if JSON.generate(data).bytesize > MAX_EVENT_BYTES
  ev = { 'seq' => 0, 'rt' => now, 'id' => id, 't' => t, 'type' => type }
  if t > now + FUTURE_SLACK_MS
    ev['t'] = now
    ev['tf'] = 1 # time fixed: the device clock was in the future
  end
  ev['d'] = e['d'].to_s if e['d'].to_s =~ DAY_RE
  ev['h'] = e['h'].to_s if e['h'].to_s =~ HM_RE
  ev['dev'] = e['dev'].to_s if e['dev'].to_s =~ DEV_RE
  ev['dn'] = short_str(e['dn'], 40) if e['dn'] && !sealed # 2.8.0: on a private account the device name travels inside the scrambled part
  ev['off'] = 1 if e['off'] == 1 # made while the device was offline
  ev['imp'] = 1 if e['imp'] == 1 # 2.2.0: brought in from a capsule or a device-only Totem
  ev['data'] = data
  ev
end

# ------------------------------------------------------------------ actions
def act_ping(_req)
  ok_dir = begin
    setup_data_dir
    test = File.join(DATA_DIR, '.write_test')
    File.open(test, 'w') { |f| f.write('ok') }
    File.delete(test)
    true
  rescue StandardError
    false
  end
  inside_web = File.expand_path(DATA_DIR).start_with?(File.expand_path(__dir__) + '/')
  shop_items = Dir.glob(File.join(SHOP_DIR, 'packs', '*', 'item.json')).reject { |f| File.basename(File.dirname(f)).start_with?('_') }.length
  { 'ok' => true, 'app' => 'aiu-totem', 'api' => API_VERSION, 'server' => 'ruby', 'version' => '3.2.0', 'profiles' => true, 'files' => true, 'files_max_mb' => FILES_MAX_MB, 'ruby' => RUBY_VERSION,
    'openssl' => defined?(OpenSSL) ? true : false, 'data_folder_ok' => ok_dir,
    'data_folder_private' => !inside_web, 'mail_program_found' => File.executable?(SENDMAIL),
    'shop_items' => shop_items, 'email_confirm_required' => REQUIRE_EMAIL_CONFIRM, 'signups_open' => SIGNUPS_OPEN, 'private' => true, 'rename' => true, 'inactive_days' => DELETE_INACTIVE_DAYS, 'now' => now_ms }
end

def act_signup(req)
  fail!(403, 'closed', 'New sign-ups are closed.') unless SIGNUPS_OPEN
  u = clean_user(req['u'])
  email = req['email'].to_s.strip.empty? ? '' : clean_email(req['email'])  # 2.4.0: email is optional
  pw = clean_pw(req['pw'])
  rate_limit!('signup', 6, 3600)
  sweep_inactive
  acct = nil
  with_lock(File.join(DATA_DIR, 'accounts', '.signup.lock')) do
    fail!(409, 'taken', 'That username is taken. Try another.') if File.exist?(acct_dir(u)) || File.exist?(acct_dir(u) + '.reserved')
    FileUtils.mkdir_p(acct_dir(u), :mode => 0o700)
    acct = { 'u' => u, 'email' => email, 'created' => now_ms, 'confirmed' => !REQUIRE_EMAIL_CONFIRM,
             'pw' => make_pw(pw), 'fails' => 0, 'lock_until' => 0 }
    save_account(u, acct)
    write_json(File.join(acct_dir(u), 'meta.json'), { 'last_seq' => 0, 'count' => 0 })
    File.open(File.join(acct_dir(u), 'events.jsonl'), 'a', 0o600) {}
  end
  if REQUIRE_EMAIL_CONFIRM
    sent = send_confirm(u, acct)
    { 'ok' => true, 'confirm_needed' => true, 'mail_sent' => sent }
  else
    { 'ok' => true, 'confirm_needed' => false }
  end
end

def act_resend(req)
  u = clean_user(req['u'])
  email = req['email'].to_s.strip.downcase
  rate_limit!('resend', 5, 3600)
  acct = load_account(u)
  if acct && !acct['confirmed'] && acct['email'].to_s.downcase == email
    send_confirm(u, acct)
  end
  { 'ok' => true }
end

def act_confirm(q)
  u = clean_user(q['u'])
  acct = load_account(u)
  if acct && acct['confirmed']
    return [200, 'Already confirmed', 'Your email is already confirmed. You can log in.']
  end
  if acct && acct['confirm_key'] && secure_eq(sha256(q['k']), acct['confirm_key'])
    acct['confirmed'] = true
    acct.delete('confirm_key')
    save_account(u, acct)
    return [200, 'Email confirmed', 'Email confirmed! Go back to Aiu Totem and log in to meet your egg.']
  end
  [400, 'Link not valid', 'That confirm link is not valid. Try "Resend confirm email" in the app.']
end

def act_login(req)
  u = clean_user(req['u'])
  rate_limit!('login', 30, 900)
  acct = load_account(u)
  fail!(401, 'bad_login', 'Username or password is wrong.') unless acct
  if acct['lock_until'].to_i > now_ms
    fail!(429, 'locked', 'Too many wrong passwords. Try again in 15 minutes.')
  end
  unless check_pw(acct['pw'], req['pw'])
    acct['fails'] = acct['fails'].to_i + 1
    if acct['fails'] >= LOCK_AFTER
      acct['lock_until'] = now_ms + 15 * 60 * 1000
      acct['fails'] = 0
    end
    save_account(u, acct)
    fail!(401, 'bad_login', 'Username or password is wrong.')
  end
  # 2.4.0: no email confirm (older accounts that never confirmed can log in now)
  if acct['fails'].to_i > 0
    acct['fails'] = 0
    save_account(u, acct)
  end
  acct['last'] = now_ms
  save_account(u, acct)
  sweep_inactive
  tok = new_token(u, req['dn'])
  { 'ok' => true, 'u' => u, 'email' => acct['email'], 'token' => tok, 'dk' => acct['dk'], 'private' => true }
end

def act_forgot(_req) # 2.7.0: no way back into an account without its password
  fail!(410, 'no_recovery', "Passwords can't be reset: no one can get into an account without its password. Start a new account.")
end

def act_reset(_req) # 2.7.0: no way back into an account without its password
  fail!(410, 'no_recovery', "Passwords can't be reset: no one can get into an account without its password. Start a new account.")
end

def act_sync(req)
  u, acct, th = auth!(req)
  tid = clean_tid(req['tid'])
  sealed = account_sealed?(acct)
  since = req['since'].is_a?(Integer) ? req['since'] : 0
  incoming = req['events'].is_a?(Array) ? req['events'] : []
  fail!(413, 'too_many', 'Too many events at once.') if incoming.length > MAX_EVENTS_PER_PUSH
  pn = req['pname']
  if sealed # 2.8.0: a private account takes only scrambled events, names and summaries
    incoming.each { |r| need_update! unless r.is_a?(Hash) && sealed_obj?(r['data']) }
    pn = nil unless pn.nil? || sealed?(pn, 600)
  end
  ensure_profile(u, tid, pn.nil? ? nil : clean_pname(pn), req['pkind'].nil? ? nil : clean_kind(req['pkind']))
  dir = totem_dir(u, tid)
  now = now_ms
  accepted = []
  result = nil
  with_lock(File.join(dir, '.events.lock')) do
    meta = read_json(File.join(dir, 'meta.json'), { 'last_seq' => 0, 'count' => 0 })
    path = File.join(dir, 'events.jsonl')
    if incoming.any? && File.exist?(path) && File.size(path) > MAX_ACCOUNT_MB * 1024 * 1024
      fail!(413, 'full', "This Totem reached the #{MAX_ACCOUNT_MB} MB limit on the server. Ask the server owner to raise MAX_ACCOUNT_MB.")
    end
    seen = {}
    if incoming.any?
      File.foreach(path, :encoding => 'UTF-8') { |line| seen[$2] = $1.to_i if line =~ LINE_RE }
    end
    rejected = 0
    known = {}
    File.open(path, 'a', 0o600) do |f|
      incoming.each do |raw|
        ev = clean_event(raw, now, sealed)
        if ev.nil?
          rejected += 1
          next
        end
        if seen[ev['id']]
          known[ev['id']] = seen[ev['id']] # already here: tell the device its number
          next
        end
        seen[ev['id']] = 0
        meta['last_seq'] = meta['last_seq'].to_i + 1
        meta['count'] = meta['count'].to_i + 1
        ev['seq'] = meta['last_seq']
        seen[ev['id']] = ev['seq']
        f.write(JSON.generate(ev) + "\n")
        accepted << ev['id']
      end
    end
    write_json(File.join(dir, 'meta.json'), meta)
    out = []
    more = false
    File.foreach(path, :encoding => 'UTF-8') do |line|
      next unless line =~ LINE_RE
      next unless $1.to_i > since
      if out.length >= MAX_EVENTS_PER_PULL
        more = true
        break
      end
      out << JSON.parse(line)
    end
    last = out.empty? ? since : out.last['seq']
    result = { 'ok' => true, 'events' => out, 'last_seq' => last, 'server_last_seq' => meta['last_seq'],
               'more' => more, 'accepted' => accepted.length, 'rejected' => rejected, 'known' => known,
               'plain' => !meta['sealed'] && meta['count'].to_i > 0, 'now' => now }
  end
  if req['snapshot'].is_a?(Hash) && JSON.generate(req['snapshot']).bytesize < 200_000 && (!sealed || sealed_obj?(req['snapshot'], 200_000))
    write_json(File.join(dir, 'totem.json'), req['snapshot'].merge('saved_at' => now))
  end
  touch_token(u, th)
  result
end

def act_me(req)
  u, acct, _th = auth!(req)
  tokens = read_json(tokens_path(u), {})
  devices = tokens.values.map { |r| { 'dn' => r['dn'], 'last' => r['last'] } }
  { 'ok' => true, 'u' => u, 'email' => acct['email'], 'confirmed' => acct['confirmed'], 'created' => acct['created'],
    'devices' => devices }
end

def act_password(req)
  u, acct, th = auth!(req)
  fail!(401, 'bad_password', 'Your current password is wrong.') unless check_pw(acct['pw'], req['old'])
  dk = clean_dk(req['dk'])
  need_update! if account_sealed?(acct) && !dk # 2.8.0: the data key is locked again with the new password, or nothing changes
  acct['pw'] = make_pw(clean_pw(req['pw']))
  acct['dk'] = dk if dk
  save_account(u, acct)
  with_lock(File.join(acct_dir(u), '.tokens.lock')) do
    tokens = read_json(tokens_path(u), {})
    write_json(tokens_path(u), tokens.select { |k, _v| k == th }) # other devices must log in again
  end
  { 'ok' => true }
end

def act_logout(req)
  u, _acct, th = auth!(req)
  with_lock(File.join(acct_dir(u), '.tokens.lock')) do
    tokens = read_json(tokens_path(u), {})
    tokens.delete(th)
    write_json(tokens_path(u), tokens)
  end
  { 'ok' => true }
end

def act_delete_account(req)
  u, acct, _th = auth!(req)
  fail!(401, 'bad_password', 'Your password is wrong.') unless check_pw(acct['pw'], req['pw'])
  fail!(400, 'bad_phrase', 'Type the confirmation phrase exactly.') unless req['phrase'].to_s == "DELETE #{u.upcase}"
  with_lock(File.join(DATA_DIR, 'accounts', '.signup.lock')) do
    FileUtils.rm_rf(acct_dir(u)) # one live copy only: deleting is permanent
  end
  { 'ok' => true }
end

# 2.8.0: the account's locked data key, set once by the first 2.8.0 device (whoever is first wins; the others use that one)
def act_dkey_set(req)
  u, _acct, _th = auth!(req)
  dk = clean_dk(req['dk'])
  fail!(400, 'bad_key', 'That data key does not look right.') unless dk
  acct = nil
  with_lock(File.join(acct_dir(u), '.account.lock')) do
    acct = load_account(u)
    if acct['dk'].nil?
      acct['dk'] = dk
      save_account(u, acct)
    end
  end
  { 'ok' => true, 'dk' => acct['dk'] }
end

# 2.8.0: scramble older plain events in place. The app sends each event's scrambled contents by id; a line that is already
# scrambled is left alone. When no plain line is left, the profile is marked private and its old plain copies go.
def act_reseal(req)
  u, acct, _th = auth!(req)
  fail!(409, 'no_key', 'This account has no data key yet.') unless account_sealed?(acct)
  tid = clean_tid(req['tid'])
  dir = totem_dir(u, tid)
  fail!(404, 'no_profile', 'That profile is not on the server.') unless File.directory?(dir)
  list = req['events']
  fail!(400, 'bad_request', 'Bad request.') unless list.is_a?(Array) && list.length <= MAX_EVENTS_PER_PUSH
  by = {}
  list.each { |r| by[r['id'].to_s] = r['data'] if r.is_a?(Hash) && r['id'].to_s =~ ID_RE && sealed_obj?(r['data']) }
  done = 0
  left = 0
  with_lock(File.join(dir, '.events.lock')) do
    path = File.join(dir, 'events.jsonl')
    if File.exist?(path)
      tmp = "#{path}.reseal#{Process.pid}"
      File.open(tmp, 'w', 0o600) do |out|
        File.foreach(path, :encoding => 'UTF-8') do |line|
          t = line.chomp
          next if t.empty?
          ev = begin
            JSON.parse(t)
          rescue JSON::ParserError
            nil
          end
          if !ev.is_a?(Hash) || sealed_obj?(ev['data'])
            out.write(t + "\n")
          elsif by[ev['id'].to_s]
            ev['data'] = by[ev['id'].to_s]
            ev.delete('dn')
            out.write(JSON.generate(ev) + "\n")
            done += 1
          else
            out.write(t + "\n")
            left += 1
          end
        end
      end
      File.rename(tmp, path)
    end
    if left.zero?
      meta = read_json(File.join(dir, 'meta.json'), { 'last_seq' => 0, 'count' => 0 })
      meta['sealed'] = true
      write_json(File.join(dir, 'meta.json'), meta)
      FileUtils.rm_rf(File.join(dir, 'journal')) # the old plain journal copy
      snap = read_json(File.join(dir, 'totem.json'), nil)
      File.delete(File.join(dir, 'totem.json')) if snap.is_a?(Hash) && !snap.key?('$x')
    end
  end
  { 'ok' => true, 'done' => done, 'left' => left }
end

# 2.8.0: a new username. The old one is free again right away. Needs the password. Other devices log in again with the new name.
def act_rename(req)
  u, acct, _th = auth!(req)
  fail!(401, 'bad_password', 'Your password is wrong.') unless check_pw(acct['pw'], req['pw'])
  nu = clean_user(req['nu'])
  fail!(400, 'same', 'That is already your username.') if nu == u
  rate_limit!('rename', 10, 3600)
  with_lock(File.join(DATA_DIR, 'accounts', '.signup.lock')) do
    fail!(409, 'taken', 'That username is taken. Try another.') if File.exist?(acct_dir(nu)) || File.exist?(acct_dir(nu) + '.reserved')
    File.rename(acct_dir(u), acct_dir(nu))
    a = load_account(nu)
    a['u'] = nu
    save_account(nu, a)
  end
  { 'ok' => true, 'u' => nu }
end

# 2.2.0: the account's profiles (name, kind, how far its Totem has grown)
def act_profiles(req)
  u, acct, _th = auth!(req)
  all = read_profiles(u)
  all['main'] ||= { 'created' => acct['created'] }
  out = []
  all.each do |k, v|
    next unless v.is_a?(Hash) && !v['deleted']
    tid = k == 'main' ? '' : k
    next unless tid.empty? || tid =~ TID_RE
    dir = totem_dir(u, tid)
    next unless File.directory?(dir)
    snap = read_json(File.join(dir, 'totem.json'), {})
    meta = read_json(File.join(dir, 'meta.json'), { 'count' => 0 })
    out << { 'tid' => tid, 'name' => v['name'] || '', 'kind' => v['kind'] || 'personal', 'created' => v['created'] || 0,
             'totem' => snap['name'] || '', 'stage' => snap['stage_name'] || '', 'snap' => snap['$x'], 'events' => meta['count'].to_i }
  end
  { 'ok' => true, 'profiles' => out }
end

def act_profile_set(req)
  u, acct, _th = auth!(req)
  tid = clean_tid(req['tid'])
  need_update! if !req['pname'].nil? && account_sealed?(acct) && !sealed?(req['pname'], 600)
  rec = ensure_profile(u, tid, req['pname'].nil? ? nil : clean_pname(req['pname']), req['pkind'].nil? ? nil : clean_kind(req['pkind']))
  { 'ok' => true, 'profile' => rec }
end

def act_profile_delete(req)
  u, acct, _th = auth!(req)
  tid = clean_tid(req['tid'])
  fail!(400, 'main_profile', 'The first profile is the account itself. Use Delete my account instead.') if tid.empty?
  fail!(401, 'bad_password', 'Your password is wrong.') unless check_pw(acct['pw'], req['pw'])
  fail!(400, 'bad_phrase', 'Type the confirmation phrase exactly.') unless req['phrase'].to_s == 'DELETE PROFILE'
  with_lock(File.join(acct_dir(u), '.profiles.lock')) do
    all = read_profiles(u)
    FileUtils.rm_rf(totem_dir(u, tid))
    all[tid] = { 'deleted' => now_ms }
    write_json(profiles_path(u), all)
  end
  { 'ok' => true }
end

# ------------------------------------------------------------------ 2.5.0: Docs (your files)
# The app scrambles each file on your device (AES-GCM) before it uploads, so these folders hold only scrambled bytes.
# A file goes up in pieces of 1 MB or less: <profile folder>/files/<id>/0.bin, 1.bin, ... plus a small meta.json.
def blob_id(s)
  s = s.to_s
  fail!(400, 'bad_file', 'That file id does not look right.') unless s =~ /\A[a-z0-9]{12,40}\z/
  s
end

def blob_dir(u, tid, id)
  File.join(totem_dir(u, tid), 'files', id)
end

def dir_bytes(p)
  return 0 unless File.directory?(p)
  Dir.glob(File.join(p, '**', '*')).select { |f| File.file?(f) }.sum { |f| File.size(f) }
end

def files_total
  (Dir.glob(File.join(DATA_DIR, 'accounts', '*', 'files')) + Dir.glob(File.join(DATA_DIR, 'accounts', '*', 'totems', '*', 'files'))).sum { |d| dir_bytes(d) }
end

def files_used(u)
  dir_bytes(File.join(acct_dir(u), 'files')) + Dir.glob(File.join(acct_dir(u), 'totems', '*', 'files')).sum { |d| dir_bytes(d) }
end

def act_blob_put(req)
  u, _acct, _th = auth!(req)
  tid = clean_tid(req['tid'])
  id = blob_id(req['id'])
  i = req['i']
  n = req['n']
  fail!(400, 'bad_piece', 'Bad file piece.') unless i.is_a?(Integer) && n.is_a?(Integer) && n >= 1 && n <= FILE_MAX_PIECES && i >= 0 && i < n
  raw = begin
    req['data'].to_s.unpack1('m0')
  rescue ArgumentError
    nil
  end
  fail!(400, 'bad_piece', 'Bad file piece.') if raw.nil? || raw.bytesize > PIECE_MAX
  fail!(413, 'files_full', "Your Files space is full (#{FILES_MAX_MB} MB). Delete some files from the Discard pile first.") if files_used(u) + raw.bytesize > FILES_MAX_MB * 1024 * 1024
  fail!(507, 'server_full', "The server's file space is full. Tell KODNA (the server owner).") if files_total + raw.bytesize > FILES_TOTAL_MB * 1024 * 1024
  dir = blob_dir(u, tid, id)
  FileUtils.mkdir_p(dir, mode: 0o700)
  File.binwrite(File.join(dir, "#{i}.bin"), raw)
  write_json(File.join(dir, 'meta.json'), { 'n' => n, 't' => now_ms })
  have = (0...n).count { |k| File.file?(File.join(dir, "#{k}.bin")) }
  { 'ok' => true, 'have' => have, 'n' => n }
end

def act_blob_get(req)
  u, _acct, _th = auth!(req)
  tid = clean_tid(req['tid'])
  dir = blob_dir(u, tid, blob_id(req['id']))
  meta = read_json(File.join(dir, 'meta.json'), nil)
  i = req['i'] || 0
  f = File.join(dir, "#{i}.bin")
  fail!(404, 'no_file', 'That file is not on the server.') unless meta.is_a?(Hash) && i.is_a?(Integer) && i >= 0 && i < meta['n'].to_i && File.file?(f)
  { 'ok' => true, 'n' => meta['n'].to_i, 'data' => [File.binread(f)].pack('m0') }
end

def act_blob_del(req)
  u, _acct, _th = auth!(req)
  FileUtils.rm_rf(blob_dir(u, clean_tid(req['tid']), blob_id(req['id'])))
  { 'ok' => true, 'used' => files_used(u), 'max' => FILES_MAX_MB * 1024 * 1024 }
end

def act_blob_list(req) # 2.6.0: what's on the server for this profile (the app tidies away files nothing points to)
  u, _acct, _th = auth!(req)
  tid = clean_tid(req['tid'])
  out = Dir.glob(File.join(totem_dir(u, tid), 'files', '*')).select { |d| File.directory?(d) && File.basename(d) =~ /\A[a-z0-9]{12,40}\z/ }.map do |d|
    m = read_json(File.join(d, 'meta.json'), {})
    n = m['n'].to_i
    { 'id' => File.basename(d), 'n' => n, 'have' => (0...n).count { |k| File.file?(File.join(d, "#{k}.bin")) }, 't' => m['t'].to_i }
  end
  { 'ok' => true, 'files' => out, 'now' => now_ms }
end

def act_blob_usage(req)
  u, _acct, _th = auth!(req)
  { 'ok' => true, 'used' => files_used(u), 'max' => FILES_MAX_MB * 1024 * 1024 }
end

# ------------------------------------------------------------------ shop (folders you upload by hand)
# Each shop item is a folder: aiu/shop/packs/<item-id>/item.json + item.png
# Folders that start with "_" (like shop/_templates) are ignored. Nothing here can be changed from the app.
SHOP_CATEGORIES = %w[hat toy backdrop house decor activity].freeze

def png_size_file(path)
  head = File.open(path, 'rb') { |f| f.read(24) }.to_s
  return nil unless head.bytesize == 24 && head[0, 8] == "\x89PNG\r\n\x1a\n".b && head[12, 4] == 'IHDR'
  head[16, 8].unpack('NN')
rescue StandardError
  nil
end

def act_shop(_req)
  items = []
  problems = []
  Dir.glob(File.join(SHOP_DIR, 'packs', '*')).sort.each do |dir|
    id = File.basename(dir)
    next if id.start_with?('_', '.') || !File.directory?(dir)
    unless id =~ /\A[a-z0-9][a-z0-9-]{0,39}\z/
      problems << "#{id}: folder names must be lowercase letters, numbers and dashes"
      next
    end
    meta = read_json(File.join(dir, 'item.json'), nil)
    unless meta.is_a?(Hash)
      problems << "#{id}: item.json is missing or not valid JSON"
      next
    end
    file = (meta['file'] || 'item.png').to_s
    unless file =~ /\A[A-Za-z0-9_.-]+\.png\z/ && File.file?(File.join(dir, file))
      problems << "#{id}: picture #{file} not found"
      next
    end
    cat = meta['category'].to_s
    unless SHOP_CATEGORIES.include?(cat)
      problems << "#{id}: category must be one of #{SHOP_CATEGORIES.join(', ')}"
      next
    end
    size = png_size_file(File.join(dir, file))
    max_w = cat == 'activity' ? 768 : 192
    unless size && size[0] <= max_w && size[1] <= 108
      problems << "#{id}: picture must be a PNG no bigger than #{max_w} x 108"
      next
    end
    price = meta['price'].to_i
    price = 0 if price < 0
    price = 9999 if price > 9999
    item = { 'id' => id, 'name' => short_str(meta['name'] || id, 40), 'category' => cat, 'price' => price,
             'desc' => short_str(meta['desc'], 120), 'file' => "packs/#{id}/#{file}", 'w' => size[0], 'h' => size[1],
             'retired' => meta['retired'] ? true : false, 'v' => File.mtime(File.join(dir, file)).to_i }
    if cat == 'activity'
      frames = [[meta['frames'].to_i, 1].max, 12].min
      item['frames'] = frames
      item['fps'] = [[meta['fps'].to_i, 1].max, 12].min
      item['fps'] = 4 if meta['fps'].nil?
      item['label'] = short_str(meta['label'] || meta['name'] || id, 40)
      item['where'] = %w[in out both].include?(meta['where'].to_s) ? meta['where'].to_s : 'both'
      item['anchor'] = %w[side front above].include?(meta['anchor'].to_s) ? meta['anchor'].to_s : 'side'
      item['keys'] = (meta['keys'].is_a?(Array) ? meta['keys'] : []).map { |k| short_str(k, 30).downcase }.reject(&:empty?)[0, 12]
    end
    items << item
  end
  { 'ok' => true, 'items' => items, 'problems' => problems,
    'categories' => { 'hat' => 'Hats', 'toy' => 'Toys', 'backdrop' => 'Views', 'house' => 'Houses', 'decor' => 'Room decor', 'activity' => 'Things to do' } }
end

ACTIONS = {
  'ping' => :act_ping, 'signup' => :act_signup, 'resend' => :act_resend, 'login' => :act_login,
  'forgot' => :act_forgot, 'reset' => :act_reset, 'sync' => :act_sync, 'me' => :act_me,
  'password' => :act_password, 'logout' => :act_logout, 'delete_account' => :act_delete_account,
  'profiles' => :act_profiles, 'profile_set' => :act_profile_set, 'profile_delete' => :act_profile_delete,
  'blob_put' => :act_blob_put, 'blob_get' => :act_blob_get, 'blob_del' => :act_blob_del, 'blob_usage' => :act_blob_usage, 'blob_list' => :act_blob_list,
  'dkey_set' => :act_dkey_set, 'reseal' => :act_reseal, 'rename' => :act_rename,
  'shop' => :act_shop
}.freeze

# ------------------------------------------------------------------ main
begin
  setup_data_dir
  method = (ENV['REQUEST_METHOD'] || 'GET').upcase
  query = parse_query(ENV['QUERY_STRING'])
  if method == 'GET'
    case query['a']
    when 'confirm'
      status, title, msg = act_confirm(query)
      respond_html(status, title, msg)
    when 'ping', nil, ''
      respond(200, act_ping({}))
    when 'shop'
      respond(200, act_shop({}))
    else
      respond(405, { 'ok' => false, 'code' => 'post_only', 'error' => 'Use POST.' })
    end
  elsif method == 'POST'
    len = ENV['CONTENT_LENGTH'].to_i
    fail!(413, 'too_big', 'Request too big.') if len > MAX_BODY
    $stdin.binmode
    body = len > 0 ? $stdin.read(len).to_s : ''
    body.force_encoding('UTF-8')
    fail!(400, 'bad_text', 'Text must be UTF-8.') unless body.valid_encoding?
    req = body.empty? ? {} : JSON.parse(body)
    fail!(400, 'bad_json', 'Bad request.') unless req.is_a?(Hash)
    act = ACTIONS[req['a'].to_s]
    fail!(404, 'unknown', 'Unknown action.') unless act
    respond(200, send(act, req))
  else
    respond(405, { 'ok' => false, 'code' => 'method', 'error' => 'Method not allowed.' })
  end
rescue ApiError => e
  respond(e.status, { 'ok' => false, 'code' => e.code, 'error' => e.message })
rescue JSON::ParserError
  respond(400, { 'ok' => false, 'code' => 'bad_json', 'error' => 'Bad request.' })
rescue StandardError => e
  begin
    File.open(File.join(DATA_DIR, 'error.log'), 'a') { |f| f.write("#{Time.now} #{e.class}: #{e.message}\n#{(e.backtrace || [])[0, 5].join("\n")}\n") }
  rescue StandardError
    nil
  end
  respond(500, { 'ok' => false, 'code' => 'server', 'error' => 'Server error. The details were saved in aiu_data/error.log.' })
end
