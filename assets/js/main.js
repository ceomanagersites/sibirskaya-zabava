/* Сибирская забава: поведение страницы.
   Контент виден и без этого файла; скрипт только добавляет удобство. */
(function () {
  'use strict';

  // Контакты — одно место для правки
  var CONTACT = {
    whatsapp: '79135387733',
    telegram: 'sib_zabava',
    lat: 56.022571,
    lon: 92.725206
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- шапка: прозрачная на первом экране ---------- */
  var top = $('[data-top]');
  var hero = $('.hero');
  if (top && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      top.classList.toggle('is-solid', !entries[0].isIntersecting);
    }, { rootMargin: '-80px 0px 0px 0px', threshold: 0 }).observe(hero);
  }

  /* ---------- панель звонка на телефоне: после первого экрана ---------- */
  var callbar = $('[data-callbar]');
  var heroActions = $('[data-hero-actions]');
  if (callbar && heroActions && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      callbar.classList.toggle('is-shown', !e.isIntersecting && e.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(heroActions);
  }

  /* ---------- меню ---------- */
  var menu = $('[data-menu]');
  var menuOpen = $('[data-menu-open]');
  if (menu && menuOpen && typeof menu.showModal === 'function') {
    menuOpen.addEventListener('click', function () {
      menu.showModal();
      menuOpen.setAttribute('aria-expanded', 'true');
    });
    $('[data-menu-close]', menu).addEventListener('click', function () { menu.close(); });
    menu.addEventListener('close', function () { menuOpen.setAttribute('aria-expanded', 'false'); });
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () { menu.close(); });
    });
    menu.addEventListener('click', function (e) { if (e.target === menu) menu.close(); });
  } else if (menuOpen) {
    menuOpen.addEventListener('click', function () { location.hash = '#kontakty'; });
  }

  /* ---------- сезоны на первом экране ---------- */
  var seasonBtns = $$('[data-season-btn]');
  var caption = $('[data-season-caption]');
  var current = document.documentElement.getAttribute('data-season') || 'winter';

  function hydrate(pic) {
    $$('[data-srcset]', pic).forEach(function (el) {
      el.srcset = el.getAttribute('data-srcset');
      el.removeAttribute('data-srcset');
    });
  }

  function markSeason(name) {
    seasonBtns.forEach(function (b) {
      var on = b.getAttribute('data-season-btn') === name;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on && caption) caption.innerHTML = b.getAttribute('data-caption');
    });
  }

  function showSeason(name) {
    if (name === current) return;
    var pic = $('.hero__pic[data-season="' + name + '"]');
    if (!pic) return;
    hydrate(pic);
    markSeason(name);
    current = name;
    var img = $('img', pic);
    var reveal = function () {
      if (current !== name) return; // посетитель уже выбрал другой сезон
      $$('.hero__pic').forEach(function (p) { p.classList.toggle('is-active', p === pic); });
    };
    if (img.complete && img.naturalWidth) reveal();
    else if (img.decode) img.decode().then(reveal, reveal);
    else img.addEventListener('load', reveal, { once: true });
  }

  markSeason(current);
  seasonBtns.forEach(function (b) {
    b.addEventListener('click', function () { showSeason(b.getAttribute('data-season-btn')); });
  });
  // остальные сезоны подгружаем, когда страница уже открылась
  window.addEventListener('load', function () {
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1500); };
    idle(function () { $$('.hero__pic').forEach(hydrate); });
  });

  /* ---------- «Что внутри»: указатель управляет фото ---------- */
  var roomBtns = $$('[data-room]');
  var roomFigs = $$('[data-room-fig]');
  function showRoom(i) {
    roomBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-room') === i ? 'true' : 'false'); });
    roomFigs.forEach(function (f) { f.classList.toggle('is-active', f.getAttribute('data-room-fig') === i); });
  }
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  roomBtns.forEach(function (b) {
    var i = b.getAttribute('data-room');
    b.addEventListener('click', function () { showRoom(i); });
    b.addEventListener('focus', function () { showRoom(i); });
    if (finePointer) b.addEventListener('mouseenter', function () { showRoom(i); });
  });

  /* ---------- сборщик заявки ---------- */
  var form = $('[data-planner]');
  if (form) {
    var guestsOut = $('#f-guests', form);
    var guests = 4;
    var MIN = 1, MAX = 8;
    var messageEl = $('[data-message]', form);
    var waBtn = $('[data-send="wa"]', form);
    var tgBtn = $('[data-send="tg"]', form);
    var copyBtn = $('[data-copy]', form);
    var copyStatus = $('[data-copy-status]', form);
    var copyDefault = copyStatus ? copyStatus.textContent : '';
    var dateInput = $('#f-date', form);

    // нельзя выбрать прошедшую дату
    var today = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    dateInput.min = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());

    var dayFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
    var weekdayFmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });

    function plural(n, one, few, many) {
      var m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return one;
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
      return many;
    }

    function val(name) {
      var el = form.elements[name];
      return el ? String(el.value || '').trim() : '';
    }

    function what() {
      var r = form.querySelector('input[name="what"]:checked');
      return r ? r.value : 'banya';
    }

    function niceDate() {
      if (!dateInput.value) return '';
      var p = dateInput.value.split('-');
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      return isNaN(d) ? '' : dayFmt.format(d) + ' (' + weekdayFmt.format(d) + ')';
    }

    function build() {
      var w = what();
      var date = niceDate();
      var time = val('time');
      var hours = +val('hours');
      var nights = +val('nights');
      var name = val('name');
      var wish = val('wish').replace(/[.!?…\s]+$/, '');

      var banyaTime = (time ? 'с ' + time : '') +
        (hours ? (time ? ' ' : '') + 'на ' + hours + ' ' + plural(hours, 'час', 'часа', 'часов') : '');
      var domPart = 'гостевой дом' + (nights ? ' на ' + nights + ' ' + plural(nights, 'сутки', 'суток', 'суток') : '') +
        (date ? ', заезд ' + date : '');

      var lines = [];
      lines.push('Здравствуйте!' + (name ? ' Меня зовут ' + name + '.' : ''));

      var subject;
      if (w === 'dom') subject = domPart;
      else if (w === 'both') subject = domPart + ', и баню' + (banyaTime ? ' ' + banyaTime : '');
      else subject = 'баню' + (date ? ' на ' + date : '') + (banyaTime ? (date ? ', ' : ' ') + banyaTime : '');

      lines.push('Хочу забронировать ' + subject + '.');
      lines.push('Нас будет ' + guests + ' ' + plural(guests, 'человек', 'человека', 'человек') + '.');
      if (wish) lines.push('Пожелания: ' + wish + '.');
      lines.push(date ? 'Подскажите, свободно ли и сколько это будет стоить?' : 'Дату ещё выбираем — подскажите, какие дни свободны и сколько это будет стоить?');
      return lines.join('\n');
    }

    function render() {
      var w = what();
      $$('[data-for]', form).forEach(function (row) {
        row.hidden = row.getAttribute('data-for').split(' ').indexOf(w) === -1;
      });
      var msg = build();
      messageEl.textContent = msg;
      var text = encodeURIComponent(msg);
      waBtn.href = 'https://wa.me/' + CONTACT.whatsapp + '?text=' + text;
      tgBtn.href = 'https://t.me/' + CONTACT.telegram + '?text=' + text;
      if (copyStatus) copyStatus.textContent = copyDefault;
    }

    function setGuests(n) {
      guests = Math.min(MAX, Math.max(MIN, n));
      guestsOut.value = guests;
      guestsOut.textContent = guests;
      $('[data-step="-1"]', form).disabled = guests <= MIN;
      $('[data-step="1"]', form).disabled = guests >= MAX;
      render();
    }

    $$('[data-step]', form).forEach(function (b) {
      b.addEventListener('click', function () { setGuests(guests + (+b.getAttribute('data-step'))); });
    });
    form.addEventListener('input', render);
    form.addEventListener('change', render);
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var msg = build();
        var done = function () { if (copyStatus) copyStatus.textContent = 'Текст скопирован. Вставьте его в чат с нами.'; };
        var fail = function () { if (copyStatus) copyStatus.textContent = 'Не получилось скопировать. Выделите текст сообщения выше вручную.'; };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(msg).then(done, fail);
        } else {
          try {
            var ta = document.createElement('textarea');
            ta.value = msg;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy') ? done() : fail();
            document.body.removeChild(ta);
          } catch (err) { fail(); }
        }
      });
    }

    // кнопки «Узнать свободное время» в карточках выбирают формат
    $$('[data-pick]').forEach(function (a) {
      a.addEventListener('click', function () {
        var radio = form.querySelector('input[name="what"][value="' + a.getAttribute('data-pick') + '"]');
        if (radio) { radio.checked = true; render(); }
      });
    });

    setGuests(guests);

    // все кнопки WhatsApp на странице ведут с коротким готовым текстом
    var hello = encodeURIComponent('Здравствуйте! Хочу узнать про свободное время в «Сибирской забаве».');
    $$('[data-wa]').forEach(function (a) { a.href = 'https://wa.me/' + CONTACT.whatsapp + '?text=' + hello; });
  }

  /* ---------- карта по нажатию ---------- */
  var mapBtn = $('[data-map-load]');
  if (mapBtn) {
    mapBtn.addEventListener('click', function () {
      var box = $('[data-map]');
      var f = document.createElement('iframe');
      f.title = 'Карта: Лесная поляна, ул. Елены Стасовой, 54 ст79';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.src = 'https://yandex.ru/map-widget/v1/?ll=' + CONTACT.lon + '%2C' + CONTACT.lat +
        '&z=15&pt=' + CONTACT.lon + '%2C' + CONTACT.lat + '%2Cpm2orl';
      box.appendChild(f);
      var bg = $('.map__bg', box);
      if (bg) bg.remove();
      var ph = $('.map__placeholder', box);
      if (ph) ph.remove();
      f.focus();
    });
  }
})();
