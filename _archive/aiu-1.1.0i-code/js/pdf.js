/* AIU TOTEM - a tiny PDF maker (our own code, no libraries, works offline and on a Pi).
   It writes real .pdf files with the PDF viewer's built-in Helvetica font (nothing embedded, nothing licensed).
   A document is a list of simple blocks; this file wraps the text, flows it onto Letter pages and numbers them.
     blocks: {t:'title'|'sub'|'h1'|'h2'|'h3'|'p'|'small'|'li'|'check'|'kv'|'quote'|'hr'|'gap'|'break'|'hex'|'sec'|'lr', text, done, k, v, vals, right, sub, center} */
(function () {
  'use strict';
  var PDF = AIU.pdf = {};
  var PW = 612, PH = 792, ML = 54, MR = 54, MT = 64, MB = 62, TW = PW - ML - MR;

  // Helvetica widths (1/1000 em) for characters 32..126; everything else counts as 556.
  var WR = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  var WB = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
    975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
    333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
  function cw(ch, bold) { var c = ch.charCodeAt(0); return c >= 32 && c <= 126 ? (bold ? WB : WR)[c - 32] : 556; }
  function width(s, size, bold) { var w = 0; for (var i = 0; i < s.length; i++) w += cw(s.charAt(i), bold); return w * size / 1000; }

  // Only characters the built-in font can show: smart quotes become plain ones, emoji are dropped.
  var MAP = { '‘': "'", '’': "'", '‚': "'", '“': '"', '”': '"', '–': '-', '—': ' - ', '…': '...', '→': '->', '←': '<-', '•': '-', '✓': 'x', '✔': 'x', '€': 'EUR', ' ': ' ', '−': '-', '≤': '<=', '≥': '>=' };
  PDF.clean = function (s) {
    s = String(s === undefined || s === null ? '' : s).replace(/[‘’‚“”–—…→←•✓✔€ −≤≥]/g, function (c) { return MAP[c]; });
    s = s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[​-‍️☀-➿]/g, '');
    var out = ''; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); out += c === 9 ? '    ' : c === 10 ? '\n' : (c >= 32 && c <= 126) || (c >= 160 && c <= 255) ? s.charAt(i) : c < 32 ? '' : '?'; }
    return out;
  };
  function esc(s) { return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
  // Wrap text to a width; keeps your line breaks; breaks very long words.
  function wrap(text, size, bold, w) {
    var lines = [];
    PDF.clean(text).split('\n').forEach(function (para) {
      var words = para.split(/ +/), line = '';
      if (!para.trim()) { lines.push(''); return; }
      words.forEach(function (word) {
        while (width(word, size, bold) > w) { // a word longer than the line
          var cut = word.length; while (cut > 1 && width(word.slice(0, cut), size, bold) > w) cut--;
          if (line) { lines.push(line); line = ''; }
          lines.push(word.slice(0, cut)); word = word.slice(cut);
        }
        var test = line ? line + ' ' + word : word;
        if (width(test, size, bold) <= w) line = test; else { if (line) lines.push(line); line = word; }
      });
      lines.push(line);
    });
    return lines;
  }
  var STY = { title: [20, 1, 0, 6, 8], sub: [10, 0, 0.35, 0, 10], h1: [15, 1, 0, 14, 6], h2: [12.5, 1, 0, 12, 4], h3: [11, 1, 0.15, 8, 3], p: [10.5, 0, 0, 2, 4],
    small: [9, 0, 0.4, 1, 3], li: [10.5, 0, 0, 1, 2], check: [10.5, 0, 0, 1, 3], kv: [10.5, 0, 0, 1, 2], quote: [11, 1, 0.1, 6, 8] }; // [size, bold, gray, space before, space after]

  // Lay the blocks out onto pages. Returns [{ops: [...]}]
  function layout(doc) {
    var pages = [], ops, y;
    function newPage() { ops = []; pages.push({ ops: ops }); y = PH - MT; }
    function need(h) { if (y - h < MB) newPage(); }
    function text(x, yy, s, size, bold, gray) { ops.push((gray ? gray.toFixed(2) : '0') + ' g BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf ' + x.toFixed(1) + ' ' + yy.toFixed(1) + ' Td (' + esc(s) + ') Tj ET'); }
    newPage();
    (doc.blocks || []).forEach(function (b) {
      if (!b) return;
      if (b.t === 'break') { if (y < PH - MT - 1) newPage(); return; }
      if (b.t === 'gap') { y -= (b.h || 8); return; }
      if (b.t === 'sec') { // a resume section heading with a rule under it
        need(30); y -= 12; text(ML, y - 12, PDF.clean(b.text).toUpperCase(), 10.5, true, 0.15); y -= 16;
        ops.push('0.25 G 0.9 w ' + ML + ' ' + y.toFixed(1) + ' m ' + (PW - MR) + ' ' + y.toFixed(1) + ' l S'); y -= 6; return;
      }
      if (b.t === 'lr') { // bold text on the left, gray text pushed to the right (a job and its dates)
        var rs = PDF.clean(b.right || ''), rw = width(rs, 9.5, false), ll = wrap(b.text, 11, true, TW - rw - 14), lh0 = 11 * 1.3;
        y -= 6;
        ll.forEach(function (ln, i) { need(lh0); y -= lh0; text(ML, y, ln, 11, true, 0); if (i === 0 && rs) text(PW - MR - rw, y, rs, 9.5, false, 0.4); });
        if (b.sub) { var sl = wrap(b.sub, 10, false, TW); sl.forEach(function (ln) { need(13); y -= 13; text(ML, y, ln, 10, false, 0.3); }); }
        y -= 2; return;
      }
      if (b.t === 'hr') { need(14); y -= 6; ops.push('0.75 G 0.6 w ' + ML + ' ' + y.toFixed(1) + ' m ' + (PW - MR) + ' ' + y.toFixed(1) + ' l S'); y -= 8; return; }
      if (b.t === 'hex') { // an I Ching hexagram: six bars, bottom line first
        var hh = 6 * 9; need(hh + 8); var x0 = ML, top = y - 4;
        (b.vals || []).slice().reverse().forEach(function (v, i) {
          var yy = top - i * 9 - 5, yang = v === 7 || v === 9, mv = v === 6 || v === 9, col = mv ? '0.69 0.24 0.33 rg' : '0 g';
          if (yang) ops.push(col + ' ' + x0 + ' ' + yy.toFixed(1) + ' 54 5 re f');
          else ops.push(col + ' ' + x0 + ' ' + yy.toFixed(1) + ' 23 5 re f ' + (x0 + 31) + ' ' + yy.toFixed(1) + ' 23 5 re f');
        });
        ops.push('0 g'); y -= hh + 8; return;
      }
      var st = STY[b.t] || STY.p, size = st[0], bold = !!st[1], gray = st[2], lh = size * 1.32, indent = 0, label = null;
      if (b.t === 'li') indent = 14;
      if (b.t === 'check') indent = 18;
      if (b.t === 'quote') indent = 12;
      var body = b.t === 'kv' ? (b.v === undefined || b.v === null || b.v === '' ? '-' : String(b.v)) : b.text;
      if (b.t === 'kv') { label = PDF.clean(b.k) + ': '; indent = Math.min(170, width(label, size, true) + 4); }
      var lines = wrap(body, size, bold, TW - indent);
      if (b.done) gray = 0.45;
      y -= st[3];
      lines.forEach(function (ln, i) {
        need(lh); y -= lh;
        if (i === 0) {
          if (b.t === 'li') text(ML + 3, y, '-', size, false, gray);
          if (b.t === 'check') { ops.push('0 G 0.8 w ' + (ML + 1) + ' ' + (y - 1).toFixed(1) + ' 9 9 re S'); if (b.done) ops.push('0 G 1.2 w ' + (ML + 2.5) + ' ' + (y + 3.5).toFixed(1) + ' m ' + (ML + 4.5) + ' ' + (y + 1).toFixed(1) + ' l ' + (ML + 8.5) + ' ' + (y + 7).toFixed(1) + ' l S'); }
          if (label) text(ML, y, label, size, true, 0.25);
          if (b.t === 'quote') ops.push('0.3 G 2 w ' + (ML + 2) + ' ' + (y - 3).toFixed(1) + ' m ' + (ML + 2) + ' ' + (y + size).toFixed(1) + ' l S');
        }
        if (b.t === 'quote' && i > 0) ops.push('0.3 G 2 w ' + (ML + 2) + ' ' + (y - 3).toFixed(1) + ' m ' + (ML + 2) + ' ' + (y + lh).toFixed(1) + ' l S');
        text(b.center ? (PW - width(ln, size, bold)) / 2 : ML + indent, y, ln, size, bold, gray);
        if (b.done && ln) { var wl = width(ln, size, bold); ops.push('0.45 G 0.7 w ' + (ML + indent) + ' ' + (y + size * 0.32).toFixed(1) + ' m ' + (ML + indent + wl).toFixed(1) + ' ' + (y + size * 0.32).toFixed(1) + ' l S'); }
      });
      y -= st[4];
    });
    return pages;
  }

  // Build the file. doc: {title, blocks}. Returns a Blob (application/pdf).
  PDF.make = function (doc) {
    var pages = layout(doc), n = pages.length, title = PDF.clean(doc.title || 'Aiu Totem');
    pages.forEach(function (pg, i) { // header + footer on every page
      var foot = '0.45 g BT /F1 8 Tf ' + ML + ' 34 Td (' + esc('Aiu Totem  |  ' + title) + ') Tj ET 0.45 g BT /F1 8 Tf ' + (PW - MR - 60) + ' 34 Td (' + esc('Page ' + (i + 1) + ' of ' + n) + ') Tj ET';
      pg.ops.push(foot, '0.8 G 0.5 w ' + ML + ' 46 m ' + (PW - MR) + ' 46 l S');
      if (i > 0) pg.ops.push('0.45 g BT /F1 8 Tf ' + ML + ' ' + (PH - 38) + ' Td (' + esc(title) + ') Tj ET');
    });
    var objs = [], out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', offs = [];
    function add(s) { objs.push(s); return objs.length; }
    var cat = add(''), pagesId = add(''), f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'), f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    var kids = [];
    pages.forEach(function (pg) {
      var stream = pg.ops.join('\n'), cid = add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
      kids.push(add('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R >> >> /Contents ' + cid + ' 0 R >>'));
    });
    objs[cat - 1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
    objs[pagesId - 1] = '<< /Type /Pages /Kids [' + kids.map(function (k) { return k + ' 0 R'; }).join(' ') + '] /Count ' + kids.length + ' >>';
    var d = new Date(), stamp = 'D:' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds());
    var info = add('<< /Title (' + esc(title) + ') /Producer (Aiu Totem by KODNA) /CreationDate (' + stamp + ') >>');
    objs.forEach(function (o, i) { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(function (o) { return ('0000000000' + o).slice(-10) + ' 00000 n \n'; }).join('');
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + cat + ' 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    var u8 = new Uint8Array(out.length); for (var i = 0; i < out.length; i++) u8[i] = out.charCodeAt(i) & 255;
    return new Blob([u8], { type: 'application/pdf' });
  };
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  PDF.fileName = function (s) { return String(s || 'aiu').replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'aiu'; };
})();
