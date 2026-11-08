/* 홈 대시보드 — 저장된 기록을 모아서 보여줌 */
(function () {
  const M = window.MMSD;

  function widget(o) {
    return '<section class="card ' + (o.tape || 'tape') + ' ' + (o.cls || '') + '">' +
      '<h2 class="w-head"><span class="w-icon" aria-hidden="true">' + o.icon + '</span>' + o.title + '</h2>' +
      '<div class="w-body">' + o.body + '</div>' +
      (o.link ? '<a class="btn" href="#/' + o.link + '">' + o.linkLabel + '</a>' : '') +
      '</section>';
  }
  function emptyP(t) { return '<p class="empty">' + t + '</p>'; }

  M.mods.home = async function (el, sub, themeId) {
    const U = M.ui, esc = U.esc;
    const now = new Date();
    const today = U.today();
    const season = M.themes.seasons[M.themes.currentSeason(now)];
    const decor = M.themes.decor(themeId);

    const [profile, diaries, schedules, memories, friends, assess, fdiary, shows, exams, logs] = await Promise.all([
      U.loadProfile(), M.db.list('diary'), M.db.list('schedule'), M.db.list('memory'), M.db.list('friend'),
      M.db.list('assessment'), M.db.list('fandomDiary'), M.db.list('performance'), M.db.list('exam'), M.db.list('studyLog')
    ]);

    const todays = diaries.filter(function (d) { return d.date === today; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
    const pick = function (k) {
      for (let i = todays.length - 1; i >= 0; i--) if (todays[i].data[k]) return todays[i];
      return null;
    };
    const wRec = pick('weather'), mRec = pick('mood'), oRec = pick('oneLine');

    const upcoming = schedules.filter(function (s) { return !s.data.done && s.date && s.date >= today; })
      .map(function (s) { return { r: s, href: '#/school/schedule/edit/' + s.id }; })
      .concat(assess.filter(function (a) { return !a.data.done && a.date && a.date >= today; })
        .map(function (a) { return { r: a, href: '#/study/assess/edit/' + a.id, pre: '📋 ' }; }))
      .sort(function (a, b) { return a.r.date < b.r.date ? -1 : 1; }).slice(0, 5);

    /* 최근 덕질: 덕질 일기 + 공연 관람 */
    const fan = fdiary.map(function (d) { return { date: d.date, icon: '💖', title: d.title, href: '#/fandom/diary/edit/' + d.id }; })
      .concat(shows.map(function (s) { return { date: s.date, icon: '🎫', title: s.title, href: '#/fandom/shows/edit/' + s.id }; }))
      .sort(function (a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; }).slice(0, 4);

    /* 학업: 최근 시험 평균 · 이번 주 공부 시간 · 남은 수행평가 */
    const lastExam = exams.filter(function (e) { return M.study.avgOf(e) != null; }).sort(function (a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; })[0];
    const t0 = U.parse(today);
    const mon = new Date(t0); mon.setDate(t0.getDate() - ((t0.getDay() + 6) % 7));
    const weekMin = logs.filter(function (l) { const d = U.parse(l.date); return d && d >= mon && d <= t0; })
      .reduce(function (s, l) { return s + (Number(l.data.minutes) || 0); }, 0);
    const assessLeft = assess.filter(function (a) { return !a.data.done; }).length;
    const recentMem = memories.slice().sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; }).slice(0, 3);
    const bdays = friends.filter(function (f) { return f.data.birthday; })
      .map(function (f) { return { f: f, n: U.daysToBirthday(f.data.birthday) }; })
      .filter(function (x) { return x.n <= 30; })
      .sort(function (a, b) { return a.n - b.n; }).slice(0, 4);

    /* 프로필 카드 */
    let profileCard;
    if (profile && profile.title) {
      profileCard = '<section class="card tape span-2 profile-card home-profile">' +
        '<span class="sticker" style="top:-16px;right:14px" aria-hidden="true">' + decor[0] + '</span>' +
        M.profilePreview(profile) +
        '<a class="btn small pv-edit" href="#/profile">✏️ 수정</a></section>';
    } else {
      profileCard = '<section class="card tape span-2 profile-card">' +
        '<span class="sticker" style="top:-16px;right:14px" aria-hidden="true">' + decor[0] + '</span>' +
        '<div class="polaroid" aria-hidden="true"><div class="ph">🐣</div><div class="cap">my photo</div></div>' +
        '<div class="profile-text"><h2>나의 프로필 카드</h2>' +
        '<p>아직 프로필이 비어 있어요. 이름, 별명, MBTI, 장래희망을 적어서 나만의 프로필 카드를 만들어 보세요.</p>' +
        '<a class="btn primary" href="#/profile">프로필 꾸미러 가기</a></div></section>';
    }

    const diaryBody = todays.length
      ? '<ul class="mini-list">' + todays.map(function (d) {
          return '<li><a href="#/diary/edit/' + d.id + '">' + esc((d.data.mood || '📝').split(' ')[0]) + ' ' + esc(U.snippet(d.title, 26)) + '</a></li>';
        }).join('') + '</ul>'
      : emptyP('오늘 쓴 일기가 아직 없어요.');

    const schedBody = upcoming.length
      ? '<ul class="mini-list">' + upcoming.map(function (x) {
          return '<li><a href="' + x.href + '"><b class="dday">' + U.dday(U.daysUntil(x.r.date)) + '</b> ' + (x.pre || '') +
            esc(x.r.title) + ' <small>' + esc(U.fmtDate(x.r.date, false)) + '</small></a></li>';
        }).join('') + '</ul>'
      : emptyP('등록된 시험이나 수행평가 일정이 없어요.');

    const memBody = recentMem.length
      ? '<div class="mini-thumbs">' + recentMem.map(function (m) {
          return '<a href="#/memories/edit/' + m.id + '" class="mini-thumb">' + U.thumb(m, '📸') + '<span>' + esc(U.snippet(m.title, 12)) + '</span></a>';
        }).join('') + '</div>'
      : emptyP('아직 보관한 추억이 없어요. 특별한 순간을 사진과 함께 남겨 보세요.');

    const bdayBody = bdays.length
      ? '<ul class="mini-list">' + bdays.map(function (x) {
          return '<li><a href="#/friends/edit/' + x.f.id + '"><b class="dday">' + (x.n === 0 ? '🎉 오늘' : 'D-' + x.n) + '</b> ' + esc(x.f.title) + '</a></li>';
        }).join('') + '</ul>'
      : emptyP('30일 안에 생일인 친구가 없어요. 친구 수첩에 생일을 등록하면 알려 줘요.');

    el.innerHTML = '<div class="home-grid tilt-grid">' +
      profileCard +
      '<section class="card tape-left date-card">' +
        '<div class="date-month">' + now.getFullYear() + '. ' + (now.getMonth() + 1) + '월</div>' +
        '<div class="date-day">' + now.getDate() + '</div>' +
        '<div class="date-week">' + U.WEEK[now.getDay()] + '요일</div>' +
        '<span class="chip">' + season.emoji + ' ' + season.name + '</span>' +
      '</section>' +
      widget({ icon: '🌤️', title: '오늘의 날씨',
        body: wRec ? '<p class="big-emoji">' + esc(wRec.data.weather) + '</p>' : emptyP('오늘의 날씨를 아직 기록하지 않았어요. 일기에서 날씨를 골라 주세요.'),
        link: 'diary/new/' + today, linkLabel: wRec ? '일기 더 쓰기' : '일기에서 기록하기' }) +
      widget({ icon: '😊', title: '오늘의 기분', tape: 'tape-corner',
        body: mRec ? '<p class="big-emoji">' + esc(mRec.data.mood) + '</p>' : emptyP('오늘 기분은 어때요? 일기를 쓰면 여기에 기분 스티커가 붙어요.'),
        link: 'diary/new/' + today, linkLabel: '기분 기록하기' }) +
      widget({ icon: '💬', title: '오늘의 한마디', cls: 'note',
        body: oRec ? '<p class="one-line">“' + esc(oRec.data.oneLine) + '”</p>' : emptyP('오늘 나에게 해주고 싶은 한마디를 적어 보세요.'),
        link: oRec ? 'diary/edit/' + oRec.id : 'diary/new/' + today, linkLabel: oRec ? '일기 보기' : '한마디 쓰기' }) +
      widget({ icon: '📔', title: '오늘 작성한 일기', body: diaryBody, link: 'diary/new/' + today, linkLabel: '+ 일기 쓰기' }) +
      widget({ icon: '🗓️', title: '다가오는 일정', tape: 'tape-left', body: schedBody, link: 'school/schedule', linkLabel: '일정 확인하기' }) +
      widget({ icon: '📸', title: '최근 추억', body: memBody, link: 'memories', linkLabel: '추억 보관함 열기' }) +
      widget({ icon: '💖', title: '최근 덕질 기록', tape: 'tape-corner',
        body: fan.length ? '<ul class="mini-list">' + fan.map(function (f) {
          return '<li><a href="' + f.href + '">' + f.icon + ' ' + esc(U.snippet(f.title, 22)) + ' <small>' + esc(U.fmtDate(f.date, false)) + '</small></a></li>';
        }).join('') + '</ul>' : emptyP('덕질 일기나 공연 관람을 기록하면 여기에 보여요.'),
        link: 'fandom', linkLabel: '덕질노트 열기' }) +
      widget({ icon: '📚', title: '학업 진행 상황',
        body: '<div class="stat-grid mini-stats">' +
          '<div class="stat"><span class="n">' + (lastExam ? M.study.avgOf(lastExam) + '점' : '-') + '</span><span class="l">' + (lastExam ? esc(U.snippet(lastExam.title, 10)) + ' 평균' : '최근 시험') + '</span></div>' +
          '<div class="stat"><span class="n">' + M.study.fmtMin(weekMin) + '</span><span class="l">이번 주 공부</span></div>' +
          '<div class="stat"><span class="n">' + assessLeft + '</span><span class="l">남은 수행평가</span></div></div>',
        link: 'study', linkLabel: '학업 기록 열기' }) +
      widget({ icon: '🎂', title: '친구 생일 알림', tape: 'tape-left', body: bdayBody, link: 'friends/birthday', linkLabel: '생일 달력 보기' }) +
    '</div>' +
    '<p class="privacy-note">🔒 이 다이어리의 모든 기록은 지금 쓰는 기기의 브라우저 안에만 저장돼요. 인터넷으로 다른 곳에 보내지 않아요.</p>';
  };
})();
