/* P3 Science Flashcards
 *
 * Card data comes from cards.json (when served over http) or from cards.js,
 * which sets window.CARDS (used when index.html is opened straight from disk).
 * The single-file version has the data in its own <script id="app-data">.
 * Cards are always shown in topic order, then in the order they are listed.
 */
(function () {
  'use strict';

  // A copy of the page as it was loaded, before the app changes anything.
  // The teacher editor rebuilds the single-file app from it.
  var PRISTINE_PAGE = document.getElementById('app-data')
    ? document.documentElement.cloneNode(true)
    : null;

  var STORAGE_KEY = 'p3-science-flashcards:v1';
  var EDITS_KEY = 'p3-science-flashcards:edits';
  var PASSWORD_SALT = 'p3-flashcards:'; // must match build-cards.js

  // One colour per topic, in topic order. All pass WCAG AA with white text.
  var TOPIC_COLOURS = [
    '#1565C0', // blue
    '#2E7D32', // green
    '#A84B00', // burnt orange
    '#6A1B9A', // purple
    '#C62828', // red
    '#00796B', // teal
    '#5B6400', // olive
    '#AD1457', // magenta
    '#3F51B5', // indigo
    '#455A64'  // slate
  ];

  var SWIPE_MIN_DISTANCE = 50;
  var BANNER_MS = 2200;

  // ---------- State ----------

  var cards = [];   // every card, in study order
  var topics = [];  // { order, name, colour, cardIndexes }
  // status: card id -> 'known' | 'learning'; lastPos: deck -> card id;
  // cer: question id -> 'first' | 'solved' | 'shown'; tab: 'cards' | 'cer'.
  var store = { status: {}, lastPos: {}, cer: {}, tab: 'cards' };
  var storageOk = true;

  // The deck being studied.
  // scope: 'all' or a topic order number; review: only cards not marked known.
  var session = null;

  var currentScreen = 'home';
  var bannerTimer = null;
  var suppressClick = false;

  // ---------- Elements ----------

  function $(id) { return document.getElementById(id); }

  var el = {
    screens: {
      home: $('screen-home'),
      resume: $('screen-resume'),
      study: $('screen-study'),
      end: $('screen-end'),
      cer: $('screen-cer'),
      cerEnd: $('screen-cer-end'),
      unlock: $('screen-unlock'),
      editor: $('screen-editor'),
      cardForm: $('screen-card-form')
    },
    homeTitle: $('home-title'),
    overallProgress: $('overall-progress'),
    studyAll: $('study-all'),
    studyAllMeta: $('study-all-meta'),
    topicList: $('topic-list'),
    resetLink: $('reset-link'),
    resetConfirm: $('reset-confirm'),
    resetYes: $('reset-yes'),
    resetNo: $('reset-no'),
    resetDone: $('reset-done'),
    storageNote: $('storage-note'),

    resumeTitle: $('resume-title'),
    resumeText: $('resume-text'),
    resumeContinue: $('resume-continue'),
    resumeRestart: $('resume-restart'),
    resumeBack: $('resume-back'),

    studyBack: $('study-back'),
    studyTitle: $('study-title'),
    position: $('position'),
    cardStatus: $('card-status'),
    cardStage: $('card-stage'),
    banner: $('topic-banner'),
    card: $('card'),
    faceFront: $('face-front'),
    faceBack: $('face-back'),
    markRow: $('mark-row'),
    btnKnown: $('btn-known'),
    btnLearning: $('btn-learning'),
    btnPrev: $('btn-prev'),
    btnNext: $('btn-next'),

    endTitle: $('end-title'),
    endText: $('end-text'),
    endKnown: $('end-known'),
    endLearning: $('end-learning'),
    endUnmarked: $('end-unmarked'),
    endReview: $('end-review'),
    endNextTopic: $('end-next-topic'),
    endRestart: $('end-restart'),
    endBack: $('end-back'),

    tabCards: $('tab-cards'),
    tabCer: $('tab-cer'),
    panelCards: $('panel-cards'),
    panelCer: $('panel-cer'),
    cerStart: $('cer-start'),
    cerStartMeta: $('cer-start-meta'),
    cerList: $('cer-list'),

    cerBack: $('cer-back'),
    cerCount: $('cer-count'),
    cerQuestion: $('cer-question'),
    cerTopic: $('cer-topic'),
    cerSituation: $('cer-situation'),
    cerTitle: $('cer-title'),
    cerSource: $('cer-source'),
    cerBoard: document.querySelector('.cer-board'),
    poolHint: $('pool-hint'),
    chips: {
      pool: $('chips-pool'),
      C: $('chips-C'),
      E: $('chips-E'),
      R: $('chips-R')
    },
    cerFeedback: $('cer-feedback'),
    cerCheck: $('cer-check'),
    cerReveal: $('cer-reveal'),
    cerNext: $('cer-next'),

    cerEndTitle: $('cer-end-title'),
    cerEndText: $('cer-end-text'),
    cerEndFirst: $('cer-end-first'),
    cerEndMore: $('cer-end-more'),
    cerEndAgain: $('cer-end-again'),
    cerEndBack: $('cer-end-back'),

    editsNotice: $('edits-notice'),
    editsOpen: $('edits-open'),
    editorLink: $('editor-link'),
    unlockTitle: $('unlock-title'),
    unlockForm: $('unlock-form'),
    unlockPassword: $('unlock-password'),
    unlockError: $('unlock-error'),
    unlockBack: $('unlock-back'),
    editorBack: $('editor-back'),
    editorLock: $('editor-lock'),
    editorTitle: $('editor-title'),
    editorSaveText: $('editor-save-text'),
    exportHtml: $('export-html'),
    exportJson: $('export-json'),
    exportStatus: $('export-status'),
    editorAdd: $('editor-add'),
    editorList: $('editor-list'),
    passwordForm: $('password-form'),
    newPassword: $('new-password'),
    newPasswordAgain: $('new-password-again'),
    passwordMessage: $('password-message'),
    discardLink: $('discard-link'),
    discardConfirm: $('discard-confirm'),
    discardYes: $('discard-yes'),
    discardNo: $('discard-no'),
    cardFormBack: $('card-form-back'),
    cardFormTitle: $('card-form-title'),
    cardForm: $('card-form'),
    cardTopic: $('card-topic'),
    newTopicField: $('new-topic-field'),
    cardNewTopic: $('card-new-topic'),
    cardFront: $('card-front'),
    cardBack: $('card-back'),
    cardFormError: $('card-form-error'),
    cardFormCancel: $('card-form-cancel'),
    cardDeleteArea: $('card-delete-area'),
    cardDelete: $('card-delete'),
    cardDeleteConfirm: $('card-delete-confirm'),
    cardDeleteYes: $('card-delete-yes'),
    cardDeleteNo: $('card-delete-no'),

    srLive: $('sr-live')
  };

  // ---------- Storage (every access wrapped so blocked storage is fine) ----------

  function loadStore() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      storageOk = false;
      return;
    }
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.status && typeof parsed.status === 'object') store.status = parsed.status;
        if (parsed.lastPos && typeof parsed.lastPos === 'object') store.lastPos = parsed.lastPos;
        if (parsed.cer && typeof parsed.cer === 'object') store.cer = parsed.cer;
        if (parsed.tab === 'cer') store.tab = 'cer';
      }
    } catch (e) {
      // Corrupt data: start fresh.
    }
  }

  function saveStore() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      storageOk = true;
    } catch (e) {
      storageOk = false;
    }
    el.storageNote.hidden = storageOk;
  }

  function clearStore() {
    store = { status: {}, lastPos: {}, cer: {}, tab: store.tab };
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      storageOk = false;
    }
  }

  // ---------- Card data ----------

  // Reads a .json data file, falling back to the copy that its .js file puts
  // on window (e.g. cards.js sets window.CARDS).
  function loadData(fileName, globalName) {
    var fallback = function () {
      return Array.isArray(window[globalName]) ? window[globalName] : [];
    };
    // fetch() of a local file fails on file://, so go straight to the .js copy.
    // The single-file version has its data built in, so it never fetches.
    if (window.location.protocol === 'file:' || typeof window.fetch !== 'function' ||
        window.CARDS_INLINE) {
      return Promise.resolve(fallback());
    }
    return window.fetch(fileName, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        return Array.isArray(data) && data.length ? data : fallback();
      })
      .catch(fallback);
  }

  function prepareCards(data) {
    var valid = data.filter(function (c) {
      return c && typeof c.id === 'string' && typeof c.front === 'string' &&
        typeof c.back === 'string' && typeof c.topic === 'string' &&
        isFinite(Number(c.topicOrder));
    }).map(function (c, i) {
      return {
        id: c.id,
        topicOrder: Number(c.topicOrder),
        topic: c.topic,
        front: c.front,
        back: c.back,
        listIndex: i
      };
    });

    // Topic order first, then the order cards are listed in the file.
    valid.sort(function (a, b) {
      return a.topicOrder - b.topicOrder || a.listIndex - b.listIndex;
    });

    cards = valid;
    topics = [];
    var byOrder = {};
    cards.forEach(function (card, index) {
      var topic = byOrder[card.topicOrder];
      if (!topic) {
        topic = {
          order: card.topicOrder,
          name: card.topic,
          colour: TOPIC_COLOURS[topics.length % TOPIC_COLOURS.length],
          cardIndexes: []
        };
        byOrder[card.topicOrder] = topic;
        topics.push(topic);
      }
      card.topicIndex = topics.indexOf(topic);
      card.posInTopic = topic.cardIndexes.length + 1;
      card.overallPos = index + 1;
      topic.cardIndexes.push(index);
    });
  }

  function topicOf(card) { return topics[card.topicIndex]; }

  function topicByOrder(order) {
    for (var i = 0; i < topics.length; i++) {
      if (topics[i].order === order) return topics[i];
    }
    return null;
  }

  function scopeKey(scope) { return scope === 'all' ? 'all' : 'topic-' + scope; }

  function scopeIndexes(scope) {
    if (scope === 'all') return cards.map(function (_, i) { return i; });
    var topic = topicByOrder(scope);
    return topic ? topic.cardIndexes.slice() : [];
  }

  function scopeName(scope) {
    if (scope === 'all') return 'All topics';
    var topic = topicByOrder(scope);
    return topic ? topic.name : '';
  }

  function isKnown(index) { return store.status[cards[index].id] === 'known'; }

  function countKnown(indexes) {
    return indexes.filter(isKnown).length;
  }

  // ---------- Screens ----------

  function showScreen(name, focusTarget) {
    Object.keys(el.screens).forEach(function (key) {
      el.screens[key].hidden = key !== name;
    });
    currentScreen = name;
    window.scrollTo(0, 0);
    if (focusTarget) {
      try {
        focusTarget.focus({ preventScroll: true });
      } catch (e) {
        focusTarget.focus();
      }
    }
  }

  function announce(text) {
    el.srLive.textContent = '';
    window.setTimeout(function () { el.srLive.textContent = text; }, 50);
  }

  // ---------- Home ----------

  function updateLead() {
    if (store.tab === 'cer') {
      var done = cerQuestions.filter(function (q) { return store.cer[q.id]; }).length;
      el.overallProgress.textContent = !cerQuestions.length
        ? 'No CER questions found. Check that cer-questions.json and cer-questions.js are in the same folder as index.html.'
        : done > 0
          ? 'You have sorted ' + done + ' of ' + cerQuestions.length + ' CER questions.'
          : 'Practise writing answers with a Claim, Evidence and Reasoning.';
      return;
    }
    var known = countKnown(scopeIndexes('all'));
    el.overallProgress.textContent = known > 0
      ? 'You know ' + known + ' of ' + cards.length + ' cards. Keep going!'
      : 'Pick a topic to start revising.';
  }

  function setTab(tab, focus) {
    var isCer = tab === 'cer';
    if (store.tab !== tab) {
      store.tab = isCer ? 'cer' : 'cards';
      saveStore();
    }
    el.tabCards.setAttribute('aria-selected', isCer ? 'false' : 'true');
    el.tabCer.setAttribute('aria-selected', isCer ? 'true' : 'false');
    el.tabCards.tabIndex = isCer ? -1 : 0;
    el.tabCer.tabIndex = isCer ? 0 : -1;
    el.panelCards.hidden = isCer;
    el.panelCer.hidden = !isCer;
    updateLead();
    if (focus) (isCer ? el.tabCer : el.tabCards).focus();
  }

  function renderHome() {
    el.editsNotice.hidden = !hasEdits();
    // Inside the claude.ai viewer the page can't save files, so the editor
    // (which works by downloading an updated app) is left out there.
    el.editorLink.hidden = !!(window.claude && window.claude.use);
    var total = cards.length;
    var known = countKnown(scopeIndexes('all'));
    renderCerList();
    setTab(store.tab);
    el.studyAllMeta.textContent = total + ' cards · ' + known + ' known';

    el.topicList.textContent = '';
    topics.forEach(function (topic) {
      var count = topic.cardIndexes.length;
      var knownInTopic = countKnown(topic.cardIndexes);
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'topic-btn';
      btn.style.setProperty('--topic', topic.colour);
      btn.setAttribute('data-topic', String(topic.order));

      var num = document.createElement('span');
      num.className = 'topic-num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = String(topic.order);

      var main = document.createElement('span');
      main.className = 'topic-main';

      var name = document.createElement('span');
      name.className = 'topic-name';
      name.textContent = topic.name;

      var meta = document.createElement('span');
      meta.className = 'topic-meta';
      var countEl = document.createElement('span');
      countEl.textContent = count + (count === 1 ? ' card' : ' cards');
      var knownEl = document.createElement('span');
      knownEl.textContent = knownInTopic + ' of ' + count + ' known';
      meta.appendChild(countEl);
      meta.appendChild(knownEl);

      var resumeIndex = savedPosition(topic.order);
      if (resumeIndex > 0) {
        var resumeEl = document.createElement('span');
        resumeEl.className = 'topic-resume';
        resumeEl.textContent = 'Stopped at card ' + (resumeIndex + 1);
        meta.appendChild(resumeEl);
      }

      var bar = document.createElement('span');
      bar.className = 'bar';
      bar.setAttribute('aria-hidden', 'true');
      var fill = document.createElement('span');
      fill.className = 'bar-fill';
      fill.style.width = (count ? Math.round((knownInTopic / count) * 100) : 0) + '%';
      bar.appendChild(fill);

      var chevron = document.createElement('span');
      chevron.className = 'topic-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = '›';

      main.appendChild(name);
      main.appendChild(bar);
      main.appendChild(meta);
      btn.appendChild(num);
      btn.appendChild(main);
      btn.appendChild(chevron);
      li.appendChild(btn);
      el.topicList.appendChild(li);
    });

    el.storageNote.hidden = storageOk;
  }

  function goHome(tab) {
    hideResetConfirm();
    el.resetDone.textContent = '';
    session = null;
    cer = null;
    if (tab === 'cer' || tab === 'cards') store.tab = tab;
    renderHome();
    showScreen('home', el.homeTitle);
  }

  function hideResetConfirm() {
    el.resetConfirm.hidden = true;
    el.resetLink.setAttribute('aria-expanded', 'false');
  }

  // ---------- Starting a deck ----------

  // Index (within the scope's deck) of the card the student was last on, or -1.
  function savedPosition(scope) {
    var id = store.lastPos[scopeKey(scope)];
    if (!id) return -1;
    var indexes = scopeIndexes(scope);
    for (var i = 0; i < indexes.length; i++) {
      if (cards[indexes[i]].id === id) return i;
    }
    return -1;
  }

  function openScope(scope) {
    var resumeAt = savedPosition(scope);
    if (resumeAt > 0) {
      var total = scopeIndexes(scope).length;
      el.resumeText.textContent = 'Last time you stopped at card ' + (resumeAt + 1) + ' of ' +
        total + ' in ' + (scope === 'all' ? 'All topics' : '"' + scopeName(scope) + '"') + '.';
      el.resumeContinue.onclick = function () { startDeck(scope, false, resumeAt); };
      el.resumeRestart.onclick = function () { startDeck(scope, false, 0); };
      showScreen('resume', el.resumeTitle);
    } else {
      startDeck(scope, false, 0);
    }
  }

  function startDeck(scope, review, startAt) {
    var deck = scopeIndexes(scope);
    if (review) deck = deck.filter(function (i) { return !isKnown(i); });
    if (!deck.length) {
      goHome();
      return;
    }
    session = {
      scope: scope,
      review: review,
      deck: deck,
      pos: Math.min(Math.max(startAt || 0, 0), deck.length - 1),
      flipped: false,
      revealed: false
    };
    el.studyTitle.textContent = (review ? 'Review: ' : '') +
      (scope === 'all' ? 'All topics' : 'Topic ' + scope);
    hideBanner();
    showScreen('study', el.card);
    renderCard(null);
  }

  // ---------- Study ----------

  function currentCard() { return cards[session.deck[session.pos]]; }

  function setFace(face, topic, text) {
    face.querySelector('.face-topic').textContent = topic.name;
    face.querySelector('.face-text').textContent = text;
  }

  function renderCard(direction) {
    var card = currentCard();
    var topic = topicOf(card);
    var prevCard = direction === 'next' && session.pos > 0
      ? cards[session.deck[session.pos - 1]]
      : null;

    session.flipped = false;
    session.revealed = false;

    // Jump back to the question side without animating the turn.
    el.card.classList.add('no-anim');
    el.card.classList.remove('is-flipped');
    el.card.style.setProperty('--topic', topic.colour);
    setFace(el.faceFront, topic, card.front);
    setFace(el.faceBack, topic, card.back);
    void el.card.offsetWidth;
    el.card.classList.remove('no-anim');

    var position = 'Card ' + card.posInTopic + ' of ' + topic.cardIndexes.length +
      ' in this topic · ' + card.overallPos + ' of ' + cards.length + ' overall';
    if (session.review) {
      position += ' · Review ' + (session.pos + 1) + ' of ' + session.deck.length;
    }
    el.position.textContent = position;

    var isLast = session.pos === session.deck.length - 1;
    el.btnPrev.disabled = session.pos === 0;
    el.btnNext.querySelector('.btn-nav-text').textContent = isLast ? 'Finish' : 'Next';
    el.btnNext.setAttribute('aria-label', isLast ? 'Finish this deck' : 'Next card');

    if (!session.review) {
      store.lastPos[scopeKey(session.scope)] = card.id;
      saveStore();
    }

    updateCardState();
    fitAllText();

    if (direction) {
      el.cardStage.classList.remove('enter-next', 'enter-prev');
      void el.cardStage.offsetWidth;
      el.cardStage.classList.add(direction === 'next' ? 'enter-next' : 'enter-prev');
    }

    if (prevCard && prevCard.topicIndex !== card.topicIndex) {
      showBanner(topic);
    } else if (direction === 'prev') {
      hideBanner();
    }
  }

  function updateCardState() {
    var card = currentCard();
    var topic = topicOf(card);
    var flipped = session.flipped;

    el.card.classList.toggle('is-flipped', flipped);
    el.faceFront.setAttribute('aria-hidden', flipped ? 'true' : 'false');
    el.faceBack.setAttribute('aria-hidden', flipped ? 'false' : 'true');
    el.card.setAttribute('aria-label', flipped
      ? 'Showing the answer. ' + topic.name + '. Answer: ' + card.back.replace(/\n/g, '. ') +
        '. Press to see the question again.'
      : 'Showing the question. ' + topic.name + '. Question: ' + card.front +
        ' Press to see the answer.');

    el.markRow.classList.toggle('is-hidden', !session.revealed);
    el.markRow.setAttribute('aria-hidden', session.revealed ? 'false' : 'true');

    var status = store.status[card.id];
    el.cardStatus.textContent = status === 'known'
      ? 'You marked this: I knew it ✓'
      : status === 'learning' ? 'You marked this: Still learning ↻' : '';
  }

  function flip() {
    if (!session) return;
    session.flipped = !session.flipped;
    if (session.flipped) session.revealed = true;
    updateCardState();
    var card = currentCard();
    announce(session.flipped ? 'Answer: ' + card.back : 'Question: ' + card.front);
  }

  function mark(status) {
    if (!session || !session.revealed) return;
    store.status[currentCard().id] = status;
    saveStore();
    // The mark buttons hide on the next card, so keep focus on the card.
    if (document.activeElement === el.btnKnown || document.activeElement === el.btnLearning) {
      el.card.focus();
    }
    goNext();
  }

  function goNext() {
    if (!session) return;
    if (session.pos < session.deck.length - 1) {
      session.pos += 1;
      renderCard('next');
    } else {
      finishDeck();
    }
  }

  function goPrev() {
    if (!session || session.pos === 0) return;
    session.pos -= 1;
    renderCard('prev');
  }

  function showBanner(topic) {
    window.clearTimeout(bannerTimer);
    el.banner.style.setProperty('--topic', topic.colour);
    el.banner.textContent = 'Next topic: ' + topic.name;
    el.banner.classList.add('is-visible');
    bannerTimer = window.setTimeout(hideBanner, BANNER_MS);
  }

  function hideBanner() {
    window.clearTimeout(bannerTimer);
    el.banner.classList.remove('is-visible');
  }

  // Shrink long text a little to fit; if it still doesn't fit, the card scrolls.
  function fitText(face) {
    var body = face.querySelector('.face-body');
    var text = face.querySelector('.face-text');
    text.style.fontSize = '';
    if (!body.clientHeight) return;
    var base = parseFloat(window.getComputedStyle(text).fontSize);
    var min = Math.max(22, Math.floor(base * 0.8));
    var size = base;
    while (body.scrollHeight > body.clientHeight + 1 && size > min) {
      size -= 1;
      text.style.fontSize = size + 'px';
    }
    body.scrollTop = 0;
  }

  function fitAllText() {
    fitText(el.faceFront);
    fitText(el.faceBack);
  }

  // ---------- End of deck ----------

  function finishDeck() {
    var s = session;
    hideBanner();
    if (!s.review) {
      delete store.lastPos[scopeKey(s.scope)];
      saveStore();
    }

    var known = 0;
    var learning = 0;
    s.deck.forEach(function (i) {
      var st = store.status[cards[i].id];
      if (st === 'known') known += 1;
      else if (st === 'learning') learning += 1;
    });
    var unmarked = s.deck.length - known - learning;

    el.endTitle.textContent = learning === 0 && unmarked === 0 ? 'Brilliant, all done!' : 'Well done!';
    el.endText.textContent = (s.review ? 'You finished reviewing ' : 'You finished ') +
      (s.scope === 'all' ? 'all topics' : '"' + scopeName(s.scope) + '"') + '.';
    el.endKnown.textContent = String(known);
    el.endLearning.textContent = String(learning);
    el.endUnmarked.hidden = unmarked === 0;
    el.endUnmarked.textContent = unmarked === 1
      ? '1 card was not marked yet.'
      : unmarked + ' cards were not marked yet.';

    // Review covers the whole topic (or all topics), skipping known cards.
    var toReview = scopeIndexes(s.scope).filter(function (i) { return !isKnown(i); }).length;
    el.endReview.hidden = toReview === 0;
    el.endReview.textContent = "Review the ones I'm still learning (" + toReview + ')';
    el.endReview.onclick = function () { startDeck(s.scope, true, 0); };

    var nextTopic = null;
    if (s.scope !== 'all') {
      var idx = topics.indexOf(topicByOrder(s.scope));
      nextTopic = idx >= 0 && idx < topics.length - 1 ? topics[idx + 1] : null;
    }
    el.endNextTopic.hidden = !nextTopic;
    if (nextTopic) {
      el.endNextTopic.textContent = 'Go to next topic: ' + nextTopic.name;
      el.endNextTopic.onclick = function () { openScope(nextTopic.order); };
    }

    el.endRestart.textContent = s.scope === 'all' ? 'Start all topics again' : 'Start this topic again';
    el.endRestart.onclick = function () {
      delete store.lastPos[scopeKey(s.scope)];
      saveStore();
      startDeck(s.scope, false, 0);
    };

    session = null;
    showScreen('end', el.endTitle);
  }

  // ---------- CER practice ----------
  // Students sort statements into Claim, Evidence and Reasoning, by dragging
  // them or by tapping a statement and then a box.

  var CER_PARTS = { C: 'Claim', E: 'Evidence', R: 'Reasoning' };
  var CER_RANK = { shown: 1, solved: 2, first: 3 };
  var DRAG_THRESHOLD = 8;
  var DRAG_EDGE = 64;

  var cerQuestions = []; // { id, topicOrder, situation, question, statements: [{ text, part }] }

  // The run in progress. placement[i] is where statement i is ('pool', 'C',
  // 'E' or 'R'); marks[i] is 'right' / 'wrong' after checking.
  var cer = null;
  var drag = null;
  var suppressChipClick = false;

  function prepareCer(data) {
    cerQuestions = data.filter(function (q) {
      return q && typeof q.id === 'string' && typeof q.question === 'string' &&
        Array.isArray(q.statements) && topicByOrder(Number(q.topicOrder));
    }).map(function (q, i) {
      return {
        id: q.id,
        topicOrder: Number(q.topicOrder),
        situation: typeof q.situation === 'string' ? q.situation : '',
        source: typeof q.source === 'string' ? q.source : '',
        question: q.question,
        statements: q.statements.filter(function (st) {
          return st && typeof st.text === 'string' && CER_PARTS.hasOwnProperty(st.part);
        }),
        listIndex: i
      };
    }).filter(function (q) { return q.statements.length > 0; });

    // Same order as the flashcards: by topic, then as listed in the file.
    cerQuestions.sort(function (a, b) {
      return a.topicOrder - b.topicOrder || a.listIndex - b.listIndex;
    });
  }

  function cerResultText(result) {
    if (result === 'first') return '✓ Right first time';
    if (result === 'solved') return '✓ Done';
    if (result === 'shown') return 'Answer shown';
    return 'Not tried yet';
  }

  function renderCerList() {
    var done = cerQuestions.filter(function (q) { return store.cer[q.id]; }).length;
    el.cerStartMeta.textContent = cerQuestions.length + ' questions · ' + done + ' done';
    el.cerStart.disabled = !cerQuestions.length;
    el.cerList.textContent = '';
    cerQuestions.forEach(function (q, i) {
      var topic = topicByOrder(q.topicOrder);
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'topic-btn cer-item';
      btn.style.setProperty('--topic', topic.colour);
      btn.setAttribute('data-index', String(i));

      var num = document.createElement('span');
      num.className = 'topic-num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = String(i + 1);

      var main = document.createElement('span');
      main.className = 'topic-main';
      var name = document.createElement('span');
      name.className = 'topic-name';
      name.textContent = q.question;
      var meta = document.createElement('span');
      meta.className = 'topic-meta';
      var topicEl = document.createElement('span');
      topicEl.textContent = q.source || topic.name;
      var statusEl = document.createElement('span');
      statusEl.className = store.cer[q.id] ? 'topic-resume' : '';
      statusEl.textContent = cerResultText(store.cer[q.id]);
      meta.appendChild(topicEl);
      meta.appendChild(statusEl);
      main.appendChild(name);
      main.appendChild(meta);

      var chevron = document.createElement('span');
      chevron.className = 'topic-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = '›';

      btn.appendChild(num);
      btn.appendChild(main);
      btn.appendChild(chevron);
      li.appendChild(btn);
      el.cerList.appendChild(li);
    });
  }

  function startCer(startAt) {
    if (!cerQuestions.length) return;
    cer = { pos: Math.max(0, Math.min(startAt || 0, cerQuestions.length - 1)), results: [] };
    loadCerQuestion();
    showScreen('cer', el.cerTitle);
  }

  function currentCerQuestion() { return cerQuestions[cer.pos]; }

  function loadCerQuestion() {
    var q = currentCerQuestion();
    var topic = topicByOrder(q.topicOrder);
    cer.placement = q.statements.map(function () { return 'pool'; });
    cer.marks = q.statements.map(function () { return null; });
    cer.selected = null;
    cer.tries = 0;
    cer.solved = false;

    el.cerQuestion.style.setProperty('--topic', topic.colour);
    el.cerTopic.textContent = topic.name;
    el.cerSituation.textContent = q.situation;
    el.cerSituation.hidden = !q.situation;
    el.cerTitle.textContent = q.question;
    el.cerSource.textContent = q.source;
    el.cerSource.hidden = !q.source;
    el.cerCount.textContent = 'Question ' + (cer.pos + 1) + ' of ' + cerQuestions.length;
    setCerFeedback('', '');
    el.cerCheck.hidden = false;
    el.cerReveal.hidden = true;
    el.cerNext.hidden = true;
    var isLast = cer.pos === cerQuestions.length - 1;
    el.cerNext.firstChild.textContent = isLast ? 'Finish ' : 'Next question ';
    renderChips(null);
  }

  function setCerFeedback(text, tone) {
    el.cerFeedback.textContent = text;
    el.cerFeedback.className = 'cer-feedback' + (tone ? ' ' + tone : '');
  }

  function renderChips(focusIndex) {
    var q = currentCerQuestion();
    Object.keys(el.chips).forEach(function (zone) { el.chips[zone].textContent = ''; });

    q.statements.forEach(function (st, i) {
      var zone = cer.placement[i];
      var mark = cer.marks[i];
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cer-chip' +
        (cer.selected === i ? ' is-selected' : '') +
        (mark === 'right' ? ' is-right' : mark === 'wrong' ? ' is-wrong' : '') +
        (cer.solved ? ' is-locked' : '');
      chip.setAttribute('data-index', String(i));
      chip.setAttribute('aria-pressed', cer.selected === i ? 'true' : 'false');
      chip.setAttribute('aria-label', st.text +
        (zone === 'pool' ? '' : ' In ' + CER_PARTS[zone] + '.') +
        (mark === 'right' ? ' Correct.' : mark === 'wrong' ? ' Wrong box.' : ''));

      var grip = document.createElement('span');
      grip.className = 'chip-grip';
      grip.setAttribute('aria-hidden', 'true');
      var text = document.createElement('span');
      text.className = 'chip-text';
      text.textContent = st.text;
      chip.appendChild(grip);
      chip.appendChild(text);
      if (mark) {
        var markEl = document.createElement('span');
        markEl.className = 'chip-mark';
        markEl.setAttribute('aria-hidden', 'true');
        markEl.textContent = mark === 'right' ? '✓' : '✗';
        chip.appendChild(markEl);
      }
      el.chips[zone].appendChild(chip);
    });

    var inPool = cer.placement.filter(function (z) { return z === 'pool'; }).length;
    var movingBack = cer.selected !== null && cer.placement[cer.selected] !== 'pool';
    el.poolHint.textContent = movingBack
      ? 'Tap here to put it back'
      : inPool ? inPool + ' left to sort' : 'All sorted';
    el.cerBoard.classList.toggle('has-selection', cer.selected !== null);
    el.cerBoard.classList.toggle('is-solved', cer.solved);

    if (focusIndex !== null && focusIndex !== undefined) {
      var target = el.cerBoard.querySelector('.cer-chip[data-index="' + focusIndex + '"]');
      if (target) {
        try {
          target.focus({ preventScroll: true });
        } catch (e) {
          target.focus();
        }
      }
    }
  }

  function selectChip(index) {
    if (cer.solved) return;
    cer.selected = cer.selected === index ? null : index;
    renderChips(index);
    if (cer.selected !== null) announce('Chosen. Now choose Claim, Evidence or Reasoning.');
  }

  function moveStatement(index, zone) {
    if (cer.solved || !zone) return;
    cer.selected = null;
    if (cer.placement[index] === zone) {
      renderChips(index);
      return;
    }
    cer.placement[index] = zone;
    cer.marks[index] = null;
    renderChips(index);
    announce(zone === 'pool' ? 'Moved back to the statements.' : 'Moved to ' + CER_PARTS[zone] + '.');
  }

  function recordCer(result) {
    var q = currentCerQuestion();
    var previous = store.cer[q.id];
    if (!previous || CER_RANK[result] > CER_RANK[previous]) {
      store.cer[q.id] = result;
      saveStore();
    }
    cer.results.push(result);
  }

  function showCerSolved() {
    cer.solved = true;
    cer.selected = null;
    el.cerCheck.hidden = true;
    el.cerReveal.hidden = true;
    el.cerNext.hidden = false;
    renderChips(null);
    el.cerNext.focus();
  }

  function checkCer() {
    if (cer.solved) return;
    var q = currentCerQuestion();
    var unsorted = cer.placement.filter(function (z) { return z === 'pool'; }).length;
    if (unsorted) {
      setCerFeedback('Put every statement in a box first. ' +
        (unsorted === 1 ? '1 statement is' : unsorted + ' statements are') + ' still to sort.', 'is-info');
      return;
    }
    var wrong = 0;
    q.statements.forEach(function (st, i) {
      var right = cer.placement[i] === st.part;
      cer.marks[i] = right ? 'right' : 'wrong';
      if (!right) wrong += 1;
    });
    cer.selected = null;

    if (!wrong) {
      recordCer(cer.tries === 0 ? 'first' : 'solved');
      setCerFeedback(cer.tries === 0
        ? 'Well done! Every statement is in the right box.'
        : 'Well done! You got them all right this time.', 'is-good');
      showCerSolved();
      return;
    }
    cer.tries += 1;
    setCerFeedback(wrong === 1
      ? '1 statement is in the wrong box (marked ✗). Move it and check again.'
      : wrong + ' statements are in the wrong box (marked ✗). Move them and check again.', 'is-bad');
    el.cerReveal.hidden = false;
    renderChips(null);
  }

  function revealCer() {
    if (cer.solved) return;
    currentCerQuestion().statements.forEach(function (st, i) {
      cer.placement[i] = st.part;
      cer.marks[i] = 'right';
    });
    recordCer('shown');
    setCerFeedback('Here is the answer. Read each box to see why the statements belong there.', 'is-info');
    showCerSolved();
  }

  function nextCer() {
    if (cer.pos < cerQuestions.length - 1) {
      cer.pos += 1;
      loadCerQuestion();
      showScreen('cer', el.cerTitle);
    } else {
      finishCer();
    }
  }

  function finishCer() {
    var results = cer.results;
    var first = results.filter(function (r) { return r === 'first'; }).length;
    el.cerEndText.textContent = 'You sorted ' + results.length +
      (results.length === 1 ? ' question.' : ' questions.');
    el.cerEndFirst.textContent = String(first);
    el.cerEndMore.textContent = String(results.length - first);
    cer = null;
    showScreen('cerEnd', el.cerEndTitle);
  }

  // Dragging works with a mouse from anywhere on a statement, and with touch
  // from its grip handle (so swiping elsewhere still scrolls the page).
  function onChipPointerDown(e) {
    var chip = e.target.closest('.cer-chip');
    if (!chip || !cer || cer.solved || e.button > 0) return;
    if (e.pointerType !== 'mouse' && !e.target.closest('.chip-grip')) return;
    drag = {
      index: Number(chip.getAttribute('data-index')),
      chip: chip,
      x: e.clientX,
      y: e.clientY,
      active: false,
      ghost: null,
      over: null
    };
  }

  function startDrag() {
    var rect = drag.chip.getBoundingClientRect();
    drag.active = true;
    drag.offsetX = drag.x - rect.left;
    drag.offsetY = drag.y - rect.top;
    var ghost = drag.chip.cloneNode(true);
    ghost.classList.add('cer-ghost');
    ghost.classList.remove('is-selected');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.width = rect.width + 'px';
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    drag.chip.classList.add('is-dragging');
    document.body.classList.add('is-dragging-chip');
    if (cer.selected !== null) {
      cer.selected = null;
      el.cerBoard.classList.remove('has-selection');
    }
  }

  function onPointerMove(e) {
    if (!drag) return;
    if (!drag.active) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < DRAG_THRESHOLD) return;
      startDrag();
    }
    e.preventDefault();
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.ghost.style.transform = 'translate(' + (e.clientX - drag.offsetX) + 'px, ' +
      (e.clientY - drag.offsetY) + 'px)';
    updateDropTarget();
    if (!drag.scrolling) autoScroll();
  }

  function updateDropTarget() {
    var under = document.elementFromPoint(drag.lastX, drag.lastY);
    var zone = under ? under.closest('.dropzone') : null;
    if (zone !== drag.over) {
      if (drag.over) drag.over.classList.remove('is-over');
      if (zone) zone.classList.add('is-over');
      drag.over = zone;
    }
  }

  // Keep scrolling while a dragged statement is held near the top or bottom
  // edge, so boxes further down the page can be reached on a phone.
  function autoScroll() {
    if (!drag || !drag.active) return;
    var step = drag.lastY < DRAG_EDGE ? -12
      : drag.lastY > window.innerHeight - DRAG_EDGE ? 12 : 0;
    drag.scrolling = step !== 0;
    if (!step) return;
    window.scrollBy(0, step);
    updateDropTarget();
    window.requestAnimationFrame(autoScroll);
  }

  function endDrag(cancelled) {
    if (!drag) return;
    var d = drag;
    drag = null;
    if (!d.active) return;
    // The click that follows the drop must not also select a statement.
    suppressChipClick = true;
    window.setTimeout(function () { suppressChipClick = false; }, 0);
    d.ghost.parentNode.removeChild(d.ghost);
    d.chip.classList.remove('is-dragging');
    document.body.classList.remove('is-dragging-chip');
    if (d.over) d.over.classList.remove('is-over');
    if (!cancelled && d.over) moveStatement(d.index, d.over.getAttribute('data-zone'));
  }

  function onBoardClick(e) {
    if (!cer || suppressChipClick) return;
    var chip = e.target.closest('.cer-chip');
    if (chip) {
      selectChip(Number(chip.getAttribute('data-index')));
      return;
    }
    var zone = e.target.closest('[data-zone]');
    if (!zone || cer.solved) return;
    if (cer.selected === null) {
      if (e.target.closest('.zone-head')) setCerFeedback('Tap a statement first, then tap a box.', 'is-info');
      return;
    }
    moveStatement(cer.selected, zone.getAttribute('data-zone'));
  }

  function bindCerEvents() {
    function onTabKey(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        var toCer = e.key === 'End' || ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && store.tab !== 'cer');
        setTab(toCer ? 'cer' : 'cards', true);
      }
    }
    el.tabCards.addEventListener('click', function () { setTab('cards'); });
    el.tabCer.addEventListener('click', function () { setTab('cer'); });
    el.tabCards.addEventListener('keydown', onTabKey);
    el.tabCer.addEventListener('keydown', onTabKey);

    el.cerStart.addEventListener('click', function () { startCer(0); });
    el.cerList.addEventListener('click', function (e) {
      var btn = e.target.closest('.cer-item');
      if (btn) startCer(Number(btn.getAttribute('data-index')));
    });

    el.cerBack.addEventListener('click', function () { goHome('cer'); });
    el.cerEndBack.addEventListener('click', function () { goHome('cer'); });
    el.cerEndAgain.addEventListener('click', function () { startCer(0); });
    el.cerCheck.addEventListener('click', checkCer);
    el.cerReveal.addEventListener('click', revealCer);
    el.cerNext.addEventListener('click', nextCer);

    el.cerBoard.addEventListener('click', onBoardClick);
    el.cerBoard.addEventListener('pointerdown', onChipPointerDown);
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', function () { endDrag(false); });
    document.addEventListener('pointercancel', function () { endDrag(true); });

    document.addEventListener('keydown', function (e) {
      if (currentScreen === 'cer' && cer && e.key === 'Escape' && cer.selected !== null) {
        var index = cer.selected;
        cer.selected = null;
        renderChips(index);
      }
    });
  }

  // ---------- Teacher editor ----------
  // Teachers add, edit, reorder and delete flashcards after entering a
  // password. There is no server, so changes are kept in this browser and
  // shared by downloading an updated app file. The password only keeps
  // students out of the editor; it is not strong security.

  var builtInDeck = [];       // the cards that came with this app file
  var builtInHash = '';       // the password hash that came with this app file
  var rawCer = [];            // CER questions as loaded, kept for exports
  var deck = [];              // the cards in use: { id, topicOrder, topic, front, back }
  var edits = { cards: null, passwordHash: null }; // unsaved changes on this device
  var editorUnlocked = false;
  var editingId = null;       // card open in the form, or null for a new card
  var renamingTopic = null;   // topic order being renamed in the list

  function plainCard(c) {
    return { id: c.id, topicOrder: c.topicOrder, topic: c.topic, front: c.front, back: c.back };
  }

  // Puts a list of cards into use: sorts it the way the app shows it and
  // rebuilds the topics.
  function setDeck(list) {
    prepareCards(list);
    deck = cards.map(plainCard);
  }

  function sameDeck(a, b) {
    return JSON.stringify(a.map(plainCard)) === JSON.stringify(b.map(plainCard));
  }

  function hasEdits() {
    return !!(edits.cards || edits.passwordHash);
  }

  function currentPasswordHash() {
    return edits.passwordHash || builtInHash;
  }

  function loadEdits() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(EDITS_KEY);
    } catch (e) {
      return;
    }
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.cards) && parsed.cards.length) edits.cards = parsed.cards;
      if (parsed && typeof parsed.passwordHash === 'string') edits.passwordHash = parsed.passwordHash;
    } catch (e) {
      // Corrupt data: ignore it.
    }
    // Once the edits have been exported and that file is the one open, they
    // are no longer "unsaved", so forget them.
    if (edits.cards && sameDeck(edits.cards, builtInDeck)) edits.cards = null;
    if (edits.passwordHash === builtInHash) edits.passwordHash = null;
    saveEdits();
  }

  function saveEdits() {
    edits.cards = edits.cards && sameDeck(edits.cards, builtInDeck) ? null : edits.cards;
    try {
      if (hasEdits()) window.localStorage.setItem(EDITS_KEY, JSON.stringify(edits));
      else window.localStorage.removeItem(EDITS_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Applies a change to the cards and keeps it on this device.
  function commitDeck(list) {
    setDeck(list);
    edits.cards = deck.map(plainCard);
    saveEdits();
  }

  // SHA-256 as hex, so the password itself is never stored in the app.
  function sha256Hex(text) {
    var bytes = new TextEncoder().encode(text);
    var K = [];
    var H = [];
    var candidate = 2;
    while (K.length < 64) {
      var isPrime = true;
      for (var f = 2; f * f <= candidate; f++) {
        if (candidate % f === 0) { isPrime = false; break; }
      }
      if (isPrime) {
        if (H.length < 8) H.push((Math.pow(candidate, 1 / 2) * 4294967296) | 0);
        K.push((Math.pow(candidate, 1 / 3) * 4294967296) | 0);
      }
      candidate += 1;
    }
    var total = Math.ceil((bytes.length + 9) / 64) * 64;
    var msg = new Uint8Array(total);
    msg.set(bytes);
    msg[bytes.length] = 0x80;
    var view = new DataView(msg.buffer);
    view.setUint32(total - 8, Math.floor(bytes.length / 0x20000000));
    view.setUint32(total - 4, (bytes.length * 8) >>> 0);

    function ror(x, n) { return (x >>> n) | (x << (32 - n)); }
    var w = new Array(64);
    for (var off = 0; off < total; off += 64) {
      var i;
      for (i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
      for (i = 16; i < 64; i++) {
        var s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        var s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], g = H[5], h2 = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var t1 = (h + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & g) ^ (~e & h2)) + K[i] + w[i]) | 0;
        var t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = h2; h2 = g; g = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + g) | 0; H[6] = (H[6] + h2) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (x) { return ('0000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }

  function passwordHash(password) {
    return sha256Hex(PASSWORD_SALT + password);
  }

  function openEditor() {
    if (editorUnlocked) {
      showEditor();
      return;
    }
    el.unlockPassword.value = '';
    el.unlockError.textContent = '';
    showScreen('unlock', el.unlockPassword);
  }

  function showEditor(focusTarget) {
    renamingTopic = null;
    renderEditor();
    showScreen('editor', focusTarget || el.editorTitle);
  }

  function renderEditorSaveText() {
    var changed = !!edits.cards || !!edits.passwordHash;
    el.editorSaveText.textContent = !changed
      ? 'No changes yet. Changes you make are kept on this device until you download the updated app.'
      : PRISTINE_PAGE
        ? 'You have changes that are only on this device. Download the updated app and share that file with students.'
        : 'You have changes that are only on this device. Download cards.json, put it in the app folder and run "node build-cards.js".';
    el.exportHtml.hidden = !PRISTINE_PAGE;
  }

  function renderEditor() {
    renderEditorSaveText();
    var list = el.editorList;
    list.textContent = '';
    topics.forEach(function (topic) {
      var section = document.createElement('section');
      section.className = 'editor-topic';
      section.style.setProperty('--topic', topic.colour);

      var head = document.createElement('div');
      head.className = 'editor-topic-head';
      var num = document.createElement('span');
      num.className = 'topic-num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = String(topics.indexOf(topic) + 1);
      head.appendChild(num);

      if (renamingTopic === topic.order) {
        var form = document.createElement('form');
        form.className = 'rename-form';
        form.setAttribute('data-topic', String(topic.order));
        var label = document.createElement('label');
        label.className = 'visually-hidden';
        label.setAttribute('for', 'rename-input');
        label.textContent = 'Topic name';
        var input = document.createElement('input');
        input.id = 'rename-input';
        input.className = 'field-input';
        input.type = 'text';
        input.value = topic.name;
        var save = document.createElement('button');
        save.type = 'submit';
        save.className = 'btn btn-primary btn-small';
        save.textContent = 'Save';
        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'btn btn-ghost btn-small';
        cancel.setAttribute('data-action', 'rename-cancel');
        cancel.textContent = 'Cancel';
        form.appendChild(label);
        form.appendChild(input);
        form.appendChild(save);
        form.appendChild(cancel);
        head.appendChild(form);
      } else {
        var name = document.createElement('h3');
        name.className = 'editor-topic-name';
        name.textContent = topic.name;
        var rename = document.createElement('button');
        rename.type = 'button';
        rename.className = 'btn btn-ghost btn-small';
        rename.setAttribute('data-action', 'rename');
        rename.setAttribute('data-topic', String(topic.order));
        rename.setAttribute('aria-label', 'Rename topic: ' + topic.name);
        rename.textContent = 'Rename';
        head.appendChild(name);
        head.appendChild(rename);
      }
      section.appendChild(head);

      var ol = document.createElement('ol');
      ol.className = 'editor-cards';
      topic.cardIndexes.forEach(function (index, pos) {
        var card = cards[index];
        var li = document.createElement('li');
        li.className = 'editor-card';
        li.setAttribute('data-id', card.id);

        var text = document.createElement('div');
        text.className = 'editor-card-text';
        var front = document.createElement('p');
        front.className = 'editor-front';
        front.textContent = card.front;
        var back = document.createElement('p');
        back.className = 'editor-back';
        back.textContent = card.back;
        text.appendChild(front);
        text.appendChild(back);

        var actions = document.createElement('div');
        actions.className = 'editor-card-actions';
        [['up', '↑', 'Move up: '], ['down', '↓', 'Move down: ']].forEach(function (m) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn btn-secondary btn-icon';
          btn.setAttribute('data-action', m[0]);
          btn.setAttribute('data-id', card.id);
          btn.setAttribute('aria-label', m[2] + card.front);
          btn.textContent = m[1];
          btn.disabled = m[0] === 'up' ? pos === 0 : pos === topic.cardIndexes.length - 1;
          actions.appendChild(btn);
        });
        var edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'btn btn-secondary btn-small';
        edit.setAttribute('data-action', 'edit');
        edit.setAttribute('data-id', card.id);
        edit.setAttribute('aria-label', 'Edit: ' + card.front);
        edit.textContent = 'Edit';
        actions.appendChild(edit);

        li.appendChild(text);
        li.appendChild(actions);
        ol.appendChild(li);
      });
      section.appendChild(ol);

      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'btn btn-ghost btn-small editor-add-here';
      add.setAttribute('data-action', 'add');
      add.setAttribute('data-topic', String(topic.order));
      add.textContent = '+ Add a card to this topic';
      section.appendChild(add);
      list.appendChild(section);
    });
  }

  function focusInEditor(selector) {
    var target = el.editorList.querySelector(selector);
    if (target && !target.disabled) target.focus();
    else el.editorTitle.focus();
  }

  function moveCard(id, direction) {
    var index = deck.findIndex(function (c) { return c.id === id; });
    var card = deck[index];
    var step = direction === 'up' ? -1 : 1;
    var other = index + step;
    if (other < 0 || other >= deck.length || deck[other].topicOrder !== card.topicOrder) return;
    var list = deck.slice();
    list[index] = list[other];
    list[other] = card;
    commitDeck(list);
    renderEditor();
    focusInEditor('[data-action="' + direction + '"][data-id="' + id + '"]');
    announce('Moved ' + direction + '.');
  }

  function renameTopic(order, name) {
    name = name.trim();
    if (!name) return;
    commitDeck(deck.map(function (c) {
      return c.topicOrder === order
        ? { id: c.id, topicOrder: c.topicOrder, topic: name, front: c.front, back: c.back }
        : c;
    }));
    renamingTopic = null;
    renderEditor();
    focusInEditor('[data-action="rename"][data-topic="' + order + '"]');
  }

  function openCardForm(id, topicOrder) {
    editingId = id;
    var card = id ? deck.find(function (c) { return c.id === id; }) : null;
    el.cardFormTitle.textContent = card ? 'Edit card' : 'Add a card';

    el.cardTopic.textContent = '';
    topics.forEach(function (topic) {
      var option = document.createElement('option');
      option.value = String(topic.order);
      option.textContent = topic.name;
      el.cardTopic.appendChild(option);
    });
    var newOption = document.createElement('option');
    newOption.value = 'new';
    newOption.textContent = 'New topic…';
    el.cardTopic.appendChild(newOption);

    var selected = card ? card.topicOrder : topicOrder || (topics[0] && topics[0].order);
    el.cardTopic.value = selected ? String(selected) : 'new';
    el.cardNewTopic.value = '';
    el.newTopicField.hidden = el.cardTopic.value !== 'new';
    el.cardFront.value = card ? card.front : '';
    el.cardBack.value = card ? card.back : '';
    el.cardFormError.textContent = '';
    el.cardDeleteArea.hidden = !card;
    el.cardDeleteConfirm.hidden = true;
    el.cardDelete.setAttribute('aria-expanded', 'false');
    showScreen('cardForm', el.cardFormTitle);
  }

  function newCardId(topicOrder) {
    var prefix = (topicOrder < 10 ? '0' : '') + topicOrder + '-';
    var n = deck.filter(function (c) { return c.topicOrder === topicOrder; }).length + 1;
    var id;
    do {
      id = prefix + (n < 10 ? '0' : '') + n;
      n += 1;
    } while (deck.some(function (c) { return c.id === id; }));
    return id;
  }

  function saveCardForm() {
    var front = el.cardFront.value.trim();
    // Keep the teacher's line breaks, but drop spaces at the ends of lines.
    var back = el.cardBack.value.replace(/\r\n?/g, '\n').split('\n')
      .map(function (line) { return line.trim(); }).join('\n').trim();
    var topicValue = el.cardTopic.value;
    var topicOrder;
    var topicName;
    if (topicValue === 'new') {
      topicName = el.cardNewTopic.value.trim();
      if (!topicName) return showFormError('Type a name for the new topic.', el.cardNewTopic);
      topicOrder = deck.reduce(function (max, c) { return Math.max(max, c.topicOrder); }, 0) + 1;
    } else {
      topicOrder = Number(topicValue);
      topicName = topicByOrder(topicOrder).name;
    }
    if (!front) return showFormError('Type the question for the front of the card.', el.cardFront);
    if (!back) return showFormError('Type the answer for the back of the card.', el.cardBack);

    var list = deck.slice();
    var existing = editingId ? list.findIndex(function (c) { return c.id === editingId; }) : -1;
    var card = {
      id: existing >= 0 ? editingId : newCardId(topicOrder),
      topicOrder: topicOrder,
      topic: topicName,
      front: front,
      back: back
    };
    if (existing >= 0 && list[existing].topicOrder === topicOrder) {
      list[existing] = card;
    } else {
      // New cards, and cards moved to another topic, go to the end of the topic.
      if (existing >= 0) list.splice(existing, 1);
      list.push(card);
    }
    commitDeck(list);
    showEditor();
    focusInEditor('[data-action="edit"][data-id="' + card.id + '"]');
    announce(existing >= 0 ? 'Card saved.' : 'Card added.');
  }

  function showFormError(message, field) {
    el.cardFormError.textContent = message;
    field.focus();
  }

  function deleteCard() {
    if (!editingId) return;
    if (deck.length === 1) {
      el.cardDeleteConfirm.hidden = true;
      return showFormError('The app needs at least one card, so this card cannot be deleted.', el.cardFront);
    }
    commitDeck(deck.filter(function (c) { return c.id !== editingId; }));
    editingId = null;
    showEditor();
    announce('Card deleted.');
  }

  function changePassword() {
    var first = el.newPassword.value;
    var second = el.newPasswordAgain.value;
    el.passwordMessage.className = 'field-error';
    if (first.length < 4) {
      el.passwordMessage.textContent = 'Use at least 4 characters.';
      el.newPassword.focus();
      return;
    }
    if (first !== second) {
      el.passwordMessage.textContent = 'The two passwords are different. Type them again.';
      el.newPasswordAgain.value = '';
      el.newPasswordAgain.focus();
      return;
    }
    var hash = passwordHash(first);
    edits.passwordHash = hash === builtInHash ? null : hash;
    saveEdits();
    el.newPassword.value = '';
    el.newPasswordAgain.value = '';
    el.passwordMessage.className = 'field-ok';
    el.passwordMessage.textContent = PRISTINE_PAGE
      ? 'Password changed on this device. Download the updated app to keep it in the file.'
      : 'Password changed on this device. To keep it, run "node build-cards.js --set-password" with the new password.';
    renderEditorSaveText();
  }

  function discardEdits() {
    edits = { cards: null, passwordHash: null };
    saveEdits();
    setDeck(builtInDeck);
    el.discardConfirm.hidden = true;
    el.discardLink.setAttribute('aria-expanded', 'false');
    renderEditor();
    el.editorTitle.focus();
    announce('All changes undone.');
  }

  // The data script of the single-file app, in the format build-cards.js writes.
  function dataScriptText() {
    var json = function (data) { return JSON.stringify(data, null, 2).replace(/<\//g, '<\\/'); };
    return '\nwindow.CARDS_INLINE = true;\nwindow.CARDS = ' + json(deck.map(plainCard)) + ';\n' +
      'window.CER_QUESTIONS = ' + json(rawCer) + ';\n' +
      'window.EDITOR_PASSWORD_HASH = ' + JSON.stringify(currentPasswordHash()) + ';\n';
  }

  function saveFile(filename, text, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  function exportHtml() {
    var page = PRISTINE_PAGE.cloneNode(true);
    page.querySelector('#app-data').textContent = dataScriptText();
    saveFile('p3-science-flashcards.html', '<!doctype html>\n' + page.outerHTML + '\n',
      'text/html;charset=utf-8');
    el.exportStatus.textContent = 'Downloaded p3-science-flashcards.html. Share this file with students. ' +
      'Your changes stay on this device until you open the new file.';
  }

  function exportJson() {
    saveFile('cards.json', JSON.stringify(deck.map(plainCard), null, 2) + '\n', 'application/json');
    el.exportStatus.textContent = 'Downloaded cards.json.';
  }

  function bindEditorEvents() {
    el.editorLink.addEventListener('click', openEditor);
    el.editsOpen.addEventListener('click', openEditor);
    el.unlockBack.addEventListener('click', goHome);
    el.unlockForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (passwordHash(el.unlockPassword.value) === currentPasswordHash()) {
        editorUnlocked = true;
        el.unlockPassword.value = '';
        showEditor();
      } else {
        el.unlockError.textContent = 'That password is not right. Try again.';
        el.unlockPassword.value = '';
        el.unlockPassword.focus();
      }
    });

    el.editorBack.addEventListener('click', goHome);
    el.editorLock.addEventListener('click', function () {
      editorUnlocked = false;
      goHome();
    });
    el.editorAdd.addEventListener('click', function () { openCardForm(null, null); });
    el.exportHtml.addEventListener('click', exportHtml);
    el.exportJson.addEventListener('click', exportJson);

    el.editorList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var id = btn.getAttribute('data-id');
      var order = Number(btn.getAttribute('data-topic'));
      if (action === 'edit') openCardForm(id, null);
      else if (action === 'up' || action === 'down') moveCard(id, action);
      else if (action === 'add') openCardForm(null, order);
      else if (action === 'rename') {
        renamingTopic = order;
        renderEditor();
        var input = $('rename-input');
        input.focus();
        input.select();
      } else if (action === 'rename-cancel') {
        var was = renamingTopic;
        renamingTopic = null;
        renderEditor();
        focusInEditor('[data-action="rename"][data-topic="' + was + '"]');
      }
    });
    el.editorList.addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target.closest('.rename-form');
      if (form) renameTopic(Number(form.getAttribute('data-topic')), $('rename-input').value);
    });
    el.editorList.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && renamingTopic !== null) {
        var was = renamingTopic;
        renamingTopic = null;
        renderEditor();
        focusInEditor('[data-action="rename"][data-topic="' + was + '"]');
      }
    });

    el.passwordForm.addEventListener('submit', function (e) {
      e.preventDefault();
      changePassword();
    });
    el.discardLink.addEventListener('click', function () {
      var opening = el.discardConfirm.hidden;
      el.discardConfirm.hidden = !opening;
      el.discardLink.setAttribute('aria-expanded', opening ? 'true' : 'false');
      if (opening) el.discardNo.focus();
    });
    el.discardNo.addEventListener('click', function () {
      el.discardConfirm.hidden = true;
      el.discardLink.setAttribute('aria-expanded', 'false');
      el.discardLink.focus();
    });
    el.discardYes.addEventListener('click', discardEdits);

    el.cardTopic.addEventListener('change', function () {
      el.newTopicField.hidden = el.cardTopic.value !== 'new';
      if (!el.newTopicField.hidden) el.cardNewTopic.focus();
    });
    el.cardForm.addEventListener('input', function () { el.cardFormError.textContent = ''; });
    el.cardForm.addEventListener('submit', function (e) {
      e.preventDefault();
      saveCardForm();
    });
    el.cardFormBack.addEventListener('click', function () { showEditor(); });
    el.cardFormCancel.addEventListener('click', function () { showEditor(); });
    el.cardDelete.addEventListener('click', function () {
      var opening = el.cardDeleteConfirm.hidden;
      el.cardDeleteConfirm.hidden = !opening;
      el.cardDelete.setAttribute('aria-expanded', opening ? 'true' : 'false');
      if (opening) el.cardDeleteNo.focus();
    });
    el.cardDeleteNo.addEventListener('click', function () {
      el.cardDeleteConfirm.hidden = true;
      el.cardDelete.setAttribute('aria-expanded', 'false');
      el.cardDelete.focus();
    });
    el.cardDeleteYes.addEventListener('click', deleteCard);
  }

  // ---------- Events ----------

  function bindEvents() {
    bindCerEvents();
    bindEditorEvents();

    el.studyAll.addEventListener('click', function () { openScope('all'); });

    el.topicList.addEventListener('click', function (e) {
      var btn = e.target.closest('.topic-btn');
      if (btn) openScope(Number(btn.getAttribute('data-topic')));
    });

    el.resetLink.addEventListener('click', function () {
      var opening = el.resetConfirm.hidden;
      el.resetConfirm.hidden = !opening;
      el.resetLink.setAttribute('aria-expanded', opening ? 'true' : 'false');
      el.resetDone.textContent = '';
      if (opening) el.resetNo.focus();
    });
    el.resetNo.addEventListener('click', function () {
      hideResetConfirm();
      el.resetLink.focus();
    });
    el.resetYes.addEventListener('click', function () {
      clearStore();
      hideResetConfirm();
      renderHome();
      el.resetDone.textContent = 'Your progress has been reset.';
      el.resetLink.focus();
    });

    el.resumeBack.addEventListener('click', goHome);
    el.studyBack.addEventListener('click', goHome);
    el.endBack.addEventListener('click', goHome);

    el.card.addEventListener('click', function () {
      if (suppressClick) return;
      flip();
    });
    el.btnKnown.addEventListener('click', function () { mark('known'); });
    el.btnLearning.addEventListener('click', function () { mark('learning'); });
    el.btnPrev.addEventListener('click', goPrev);
    el.btnNext.addEventListener('click', goNext);

    // Swipe left/right on the card to move between cards.
    var touchStart = null;
    el.card.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) {
        touchStart = null;
        return;
      }
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    el.card.addEventListener('touchend', function (e) {
      if (!touchStart || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - touchStart.x;
      var dy = e.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) >= SWIPE_MIN_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
        suppressClick = true;
        window.setTimeout(function () { suppressClick = false; }, 400);
        if (dx < 0) goNext();
        else goPrev();
      }
    }, { passive: true });
    el.card.addEventListener('touchcancel', function () { touchStart = null; }, { passive: true });

    document.addEventListener('keydown', function (e) {
      if (currentScreen !== 'study' || !session) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var target = e.target;
      var onOtherControl = target && target !== el.card &&
        /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(target.tagName);

      switch (e.key) {
        case ' ':
        case 'Spacebar':
          // On the card (or any button) Space already "clicks" it natively.
          if (target === el.card || onOtherControl) return;
          e.preventDefault();
          flip();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goPrev();
          break;
        case '1':
          if (session.revealed) {
            e.preventDefault();
            mark('known');
          }
          break;
        case '2':
          if (session.revealed) {
            e.preventDefault();
            mark('learning');
          }
          break;
        default:
          break;
      }
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (currentScreen === 'study' && session) fitAllText();
      }, 120);
    });
  }

  // ---------- Start ----------

  function init() {
    loadStore();
    bindEvents();
    Promise.all([
      loadData('cards.json', 'CARDS'),
      loadData('cer-questions.json', 'CER_QUESTIONS')
    ]).then(function (data) {
      prepareCards(data[0]);
      builtInDeck = cards.map(plainCard);
      builtInHash = typeof window.EDITOR_PASSWORD_HASH === 'string' ? window.EDITOR_PASSWORD_HASH : '';
      rawCer = data[1];
      loadEdits();
      setDeck(edits.cards || builtInDeck);
      prepareCer(data[1]);
      if (!cards.length) {
        el.overallProgress.textContent =
          'No flashcards found. Check that cards.json and cards.js are in the same folder as index.html.';
        el.studyAll.disabled = true;
        return;
      }
      renderHome();
    });
  }

  init();
})();
