  function listKind(S, L) { var m = (S.listMeta || {})[L]; return m ? m.kind : /^(shopping|grocery|groceries|store|market)$/.test(L) ? 'shopping' : 'todo'; }
