/* P3 Science Flashcards
 *
 * Card data comes from cards.json (when served over http) or from cards.js,
 * which sets window.CARDS (used when index.html is opened straight from disk).
 * Cards are always shown in topic order, then in the order they are listed.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'p3-science-flashcards:v1';

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
  var store = { status: {}, lastPos: {} }; // status: id -> 'known' | 'learning'
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
      end: $('screen-end')
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
    store = { status: {}, lastPos: {} };
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      storageOk = false;
    }
  }

  // ---------- Card data ----------

  function loadCardData() {
    var fallback = function () {
      return Array.isArray(window.CARDS) ? window.CARDS : [];
    };
    // fetch() of a local file fails on file://, so go straight to cards.js.
    // The single-file version has its cards built in, so it never fetches.
    if (window.location.protocol === 'file:' || typeof window.fetch !== 'function' ||
        window.CARDS_INLINE) {
      return Promise.resolve(fallback());
    }
    return window.fetch('cards.json', { cache: 'no-cache' })
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

  function renderHome() {
    var total = cards.length;
    var known = countKnown(scopeIndexes('all'));
    el.overallProgress.textContent = known > 0
      ? 'You know ' + known + ' of ' + total + ' cards. Keep going!'
      : 'Pick a topic to start revising.';
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

  function goHome() {
    hideResetConfirm();
    el.resetDone.textContent = '';
    session = null;
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

  // ---------- Events ----------

  function bindEvents() {
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
    loadCardData().then(function (data) {
      prepareCards(data);
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
