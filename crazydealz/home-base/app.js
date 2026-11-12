(() => {
  'use strict';

  const tasks = [
    {
      id: 'reviews',
      title: 'Reply to reviews',
      why: 'Customers see that Crazy Dealz answers. Replies usually show up in about 10 minutes, but can take longer.',
      keywords: 'reply reviews review feedback rating comment respond thank',
      href: 'https://business.google.com/reviews',
      button: 'Open reviews in Google',
      linkStatus: 'official',
      linkNote: 'This opens Google’s reviews page.',
      helpUrl: 'https://support.google.com/business/answer/3474050',
      helpLabel: 'Google help: Manage customer reviews',
      wired: true,
      steps: [
        'Sign in with the Google account that owns or manages Crazy Dealz Tires.',
        'This button opens the reviews page at business.google.com/reviews.',
        'If you land on a general Business Profile page instead, select Read reviews.',
        'Next to the review, select Reply, type the reply, and select Reply again.',
        'The shop must already be verified before you can reply.'
      ]
    },
    {
      id: 'hours',
      title: 'Update hours',
      why: 'Wrong hours send people to a closed shop. Check everyday and holiday hours before saving.',
      keywords: 'hours open closed holiday schedule time monday sunday',
      href: 'https://business.google.com',
      button: 'Open Business Profile',
      linkStatus: 'official-home',
      linkNote: 'This opens your Business Profile. Then follow the steps to edit hours.',
      helpUrl: 'https://support.google.com/business/answer/15300403',
      helpLabel: 'Google help: Edit your business hours',
      steps: [
        'Sign in and open your Business Profile.',
        'Select Edit profile, then Hours.',
        'In Business hours, next to Hours, select Edit → Open with main hours.',
        'Check each day the shop is open and set times in the dropdowns, then Save.',
        'For a mid-day break, make two entries on the same day with different times.',
        'Use Special hours for holidays.'
      ]
    },
    {
      id: 'photos',
      title: 'Add photos',
      why: 'Clear photos of the sign, entrance, bays, and tire racks help people recognize the shop.',
      keywords: 'photo photos picture video logo cover image upload',
      href: 'https://business.google.com',
      button: 'Open Business Profile',
      linkStatus: 'official-home',
      linkNote: 'This opens your Business Profile. Then follow the steps to add photos.',
      helpUrl: 'https://support.google.com/business/answer/6103862',
      helpLabel: 'Google help: Manage photos & videos',
      steps: [
        'Sign in with the listing’s Google account.',
        'On a computer, open Google Search or Maps and search for the shop’s name and city.',
        'To add a cover photo or logo, select Photos, then Add a cover photo or Add a logo, and choose the file.',
        'You can also start from business.google.com and open Photos there if you see it.',
        'On a phone, you can add photos from the Google Maps app after opening the listing as the owner.'
      ]
    },
    {
      id: 'deal',
      title: 'Post a deal',
      why: 'Google posts can share an offer on Search and Maps. Only post a deal after the wording and fine print are set.',
      keywords: 'post deal offer coupon sale promo event update announcement buy get',
      href: 'https://business.google.com',
      button: 'Open Business Profile',
      linkStatus: 'official-home',
      linkNote: 'This opens your Business Profile. Then follow the steps to add a post.',
      helpUrl: 'https://support.google.com/business/answer/7342169',
      helpLabel: 'Google help: Create & manage posts',
      steps: [
        'Make sure the deal wording and fine print are final before you post.',
        'Open your Business Profile.',
        'Select Posts, then Add post.',
        'Select the post type: Update, Offer, or Event. A deal usually belongs under Offer.',
        'Add the details, optional button or coupon code, then select Post.',
        'Posts must follow Google’s posts content policy.'
      ]
    },
    {
      id: 'stats',
      title: 'Check calls / stats',
      why: 'Performance shows how people find the listing and whether they called, asked for directions, or visited the website.',
      keywords: 'calls stats statistics performance insights views clicks directions traffic report',
      href: 'https://business.google.com',
      button: 'Open Business Profile',
      linkStatus: 'official-home',
      linkNote: 'This opens your Business Profile. Then open Performance to see calls and visits.',
      helpUrl: 'https://support.google.com/business/answer/9918094',
      helpLabel: 'Google help: Performance & insights',
      steps: [
        'Open your Business Profile at business.google.com.',
        'Click Performance. At the top, select a time period, then Apply.',
        'If Insights appears on your profile, click Insights for extra recommendations (it may not be on every profile).',
        'On the Google Maps app: open the app, tap Business at the bottom right, then See more next to Performance.',
        'Performance data is only available on a verified profile.'
      ]
    },
    {
      id: 'nap',
      title: 'Fix phone / address',
      why: 'The public name, phone, and 3395 Macon Rd address must match what customers will actually use.',
      keywords: 'phone address nap name location pin contact number street macon',
      href: 'https://business.google.com',
      button: 'Open Business Profile',
      linkStatus: 'official-home',
      linkNote: 'This opens your Business Profile. Then follow the steps to edit your info.',
      helpUrl: 'https://support.google.com/business/answer/3039617',
      helpLabel: 'Google help: Edit your Business Profile',
      steps: [
        'Open your Business Profile at business.google.com.',
        'Select Edit profile. Change the phone, address, or other info, then Save.',
        'On the Google Maps app: tap Business at the bottom right, then Edit profile, then Save.',
        'Address changes can take extra review. Keep the pin at the real entrance.'
      ]
    },
    {
      id: 'manager',
      title: 'Add Joshua as manager',
      why: 'You stay the primary owner. Joshua can then help with approved edits. Do not share passwords or verification codes.',
      keywords: 'joshua manager owner invite access people admin share team joshua@ai901',
      href: 'https://business.google.com',
      button: 'Open Business Profile',
      linkStatus: 'official-home',
      linkNote: 'This opens your Business Profile. Then follow the steps to invite a manager.',
      helpUrl: 'https://support.google.com/business/answer/3403100',
      helpLabel: 'Google help: Manage owners & managers',
      wired: true,
      inviteEmail: 'qetuocb76@gmail.com',
      steps: [
        'Use the Google account that already owns the Crazy Dealz Tires listing. You stay the primary owner.',
        'Open your Business Profile.',
        'Select More, then Business Profile settings, then People and access.',
        'At the top left, select Add (Invite new users).',
        'Enter qetuocb76@gmail.com.',
        'Under Access, select Manager — not Owner.',
        'Select Invite. Joshua accepts from his email. Never share passwords or verification codes.',
        'New managers may have to wait 7 days before some features work.'
      ]
    }
  ];

  const list = document.getElementById('task-list');
  const search = document.getElementById('need');
  const empty = document.getElementById('empty');

  function badge(task) {
    if (task.linkStatus === 'official') {
      return '<span class="badge official">Reviews page</span><span class="badge">Opens in your Google account</span>';
    }
    return '<span class="badge official">Business Profile</span><span class="badge">Opens in your Google account</span>';
  }

  function steps(task) {
    const items = task.steps.map((s) => `<li>${s}</li>`).join('');
    let extra = '';
    if (task.id === 'manager') {
      extra = `<ul class="checklist">
        <li><input type="checkbox" data-check="manager-opened" id="chk-opened"><label for="chk-opened">I opened the Business Profile while signed in as the owner</label></li>
        <li><input type="checkbox" data-check="manager-invited" id="chk-invited"><label for="chk-invited">I invited <strong>qetuocb76@gmail.com</strong> as Manager (not Owner)</label></li>
      </ul>
      <p class="help">Checks stay on this phone only. Nothing is sent from this app.</p>`;
    }
    return `<details${task.wired ? ' open' : ''}>
      <summary>${task.wired ? 'How to do this' : 'If the link opens a general page'}</summary>
      <ol>${items}</ol>
      ${extra}
      <p class="help"><a href="${task.helpUrl}" target="_blank" rel="noopener">${task.helpLabel}</a></p>
    </details>`;
  }

  function render(filter) {
    const q = (filter || '').trim().toLowerCase();
    let shown = 0;
    let firstMatch = null;
    list.innerHTML = tasks.map((task) => {
      const hay = (task.title + ' ' + task.why + ' ' + task.keywords).toLowerCase();
      const match = !q || q.split(/\s+/).every((w) => hay.includes(w)) || hay.includes(q);
      if (match) {
        shown += 1;
        if (!firstMatch) firstMatch = task.id;
      }
      return `<article class="card${match && q ? ' is-match' : ''}" id="task-${task.id}" data-id="${task.id}" ${match ? '' : 'hidden'}>
        <div class="kicker">${task.wired ? 'Opens the right Google page' : 'Opens Google, then follow the steps'}</div>
        <h2>${task.title}</h2>
        <p class="why">${task.why}</p>
        <a class="btn" href="${task.href}" target="_blank" rel="noopener" data-task="${task.id}">${task.button}</a>
        <div class="meta"><div class="badges">${badge(task)}</div><div>${task.linkNote}</div></div>
        ${steps(task)}
      </article>`;
    }).join('');
    empty.classList.toggle('show', shown === 0);
    document.body.classList.toggle('is-filtered', !!q);
    restoreChecks();
    if (q && firstMatch) {
      const el = document.getElementById('task-' + firstMatch);
      if (el) {
        const header = document.querySelector('header');
        const minTop = header ? header.getBoundingClientRect().bottom + 8 : 92;
        const r = el.getBoundingClientRect();
        const titleCut = r.top < minTop - 4;
        const offscreen = r.top > window.innerHeight * 0.6;
        if (titleCut || offscreen) el.scrollIntoView({ block: 'start' });
      }
    }
  }

  function restoreChecks() {
    document.querySelectorAll('[data-check]').forEach((input) => {
      input.checked = localStorage.getItem('cd-home-' + input.getAttribute('data-check')) === '1';
      input.addEventListener('change', () => {
        localStorage.setItem('cd-home-' + input.getAttribute('data-check'), input.checked ? '1' : '0');
      });
    });
  }

  search.addEventListener('input', () => render(search.value));
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = list.querySelector('.card:not([hidden]) .btn');
      if (first) first.focus();
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: '/crazydealz/home-base/' }).catch(() => {});
    });
  }

  render('');
})();
