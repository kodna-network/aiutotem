  M.quizOffer = function (ctx, force) {
    var S = ctx.S, L = ctx.local || {};
    if (!S.hatched || (S.ptype && S.ptype.answered) || (typeof window !== 'undefined' && window.AIU_TEST && window.AIU_TEST.noQuiz)) return null;
    if (!force && (L.pqAsked === ctx.today || (L.pqN || 0) >= 3)) return null;
    return { line: 'Hey ' + S.callMe + ', can I learn your personality? It\'s 12 quick either/or questions, and your type becomes mine. Want to do it now?',
      pending: { type: 'pq_offer', data: {} }, local: { pqAsked: ctx.today, pqN: (L.pqN || 0) + 1 } };
  };
