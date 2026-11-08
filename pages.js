/* 메뉴 정의와 각 페이지 화면 */
(function () {
  const M = window.MMSD;

  M.menu = [
    { id: 'home', icon: '🏠', title: '홈', sub: '오늘도 반가워! 나의 중학생활 스크랩북 ✨' },
    { id: 'profile', icon: '🙋', title: '나의 프로필', sub: '나를 소개하는 스크랩북 페이지', stage: 3,
      desc: '이름, 별명, 학년·반·번호 같은 기본 정보와 나만의 취향을 모아 프로필 카드를 만들어요.',
      items: ['기본 프로필 (이름·별명·생년월일·학년·반·번호·입학일·졸업 예정일)', 'MBTI·혈액형·키·신발 사이즈', '취미·특기·좋아하는/싫어하는 음식', '좋아하는 색깔·계절', '장래희망·좌우명·나를 표현하는 키워드', '요즘 관심사·TMI·자기소개 한마디', '캐릭터 아바타·프로필 사진'] },
    { id: 'growth', icon: '🌱', title: '성장 기록', sub: '1학년부터 3학년까지 달라진 나', stage: 3,
      desc: '몸과 마음이 어떻게 자랐는지 학년별로 기록하고 비교해요.',
      items: ['신체 성장 (키·몸무게·발 크기·옷 사이즈)', '외모 변화 (헤어·피부·패션·전신 사진)', '목소리와 능력', '내면의 성장 (성격·가치관·장래희망)', '1·2·3학년 비교', '입학 당시와 현재 비교', '전체 기간 그래프'] },
    { id: 'fandom', icon: '💖', title: '덕질노트', sub: '좋아하는 배우·작품·공연 기록', stage: 4,
      desc: '인물과 작품을 함께 관리하고, 배우마다 다른 테마로 꾸밀 수 있어요.',
      items: ['덕질노트 HOME', '인물 보관함 (인물별 테마·생일 카운트다운)', '작품 보관함 (작품별 테마)', '공연 관람 기록 (재관람 횟수 자동 계산)', '굿즈 및 소장품·위시리스트', '음악 보관함 (뮤지컬 넘버 구분)', '덕질 일기', '통계·검색·필터'] },
    { id: 'school', icon: '🏫', title: '학교생활 수첩', sub: '선생님·동아리·학교 행사 기록', stage: 3,
      desc: '선생님과 동아리, 시간표와 학교 행사까지 학교생활을 한곳에 모아요.',
      items: ['선생님 수첩 (학년별·과목별·담임 표시)', '선생님별 추억 타임라인·편지 보관', '동아리 기록장·변경 이력·사진첩', '반 정보 및 학급 구성', '시간표 보관', '학교 행사 기록', '수행평가 및 시험 일정', '상장 및 수상 기록', '학교에서 받은 특별한 편지'] },
    { id: 'friends', icon: '👭', title: '친구 수첩', sub: '3년 동안 함께한 친구들', stage: 3,
      desc: '친구 프로필과 함께한 추억, 관계의 변화를 기록해요.',
      items: ['학년별 친구 분류', '같은 반이었던 친구 모아보기', '즐겨찾는 친구', '친구별 프로필·사진첩', '친구 생일 달력', '관계 변화 기록', '친구별 추억 타임라인·메모·태그'] },
    { id: 'diary', icon: '📔', title: '일상 다이어리', sub: '오늘 하루를 기록해요', stage: 3,
      desc: '달력에서 날짜를 눌러 날씨·기분·사진과 함께 하루를 기록해요.',
      items: ['달력에서 날짜 눌러 쓰기', '하루에 여러 개 기록', '사진 여러 장 첨부', '날씨·기분 스티커', '오늘 만난 친구·선생님·먹은 음식·들은 노래', '태그 및 검색', '월별·학년별 모아보기', '비공개 메모'] },
    { id: 'memories', icon: '📸', title: '추억 보관함', sub: '특별한 날을 모아두는 앨범', stage: 3,
      desc: '일기와 따로, 오래 간직하고 싶은 특별한 순간을 스크랩북 앨범처럼 모아요.',
      items: ['카테고리 7종 (학교 행사·친구·선생님·문화생활 등)', '사진 갤러리·동영상 보관', '티켓·종이 자료 보관', '학년별·연도별 타임라인', '추억 장소 기록 (표시 방식은 확인 후 결정)', '즐겨찾기·태그·검색', '카드 꾸미기·표지 지정'] },
    { id: 'study', icon: '📚', title: '학업 기록', sub: '시험·수행평가·공부 시간 관리', stage: 4,
      desc: '시험 점수와 등급, 수행평가, 공부 시간을 기록하고 그래프로 봐요.',
      items: ['과목 추가·관리', '시험 기록 (점수·등급·성취도)', '평균 자동 계산', '학기별·학년별 성적 비교', '수행평가 관리 (마감일·진행 상태)', '공부 시간·범위·교재 기록', '주간·월간 통계 그래프'] },
    { id: 'decorate', icon: '🎀', title: '다이어리 꾸미기', sub: '스티커와 사진으로 페이지 꾸미기', stage: 5,
      desc: '모든 꾸미기 재료를 처음부터 자유롭게 쓸 수 있어요. 잠금이나 포인트는 없어요.',
      items: ['테마 6종', '꾸미기 재료 10종', '스티커 드래그·크기·회전', '사진 프레임·자르기·콜라주', '마스킹테이프·메모지 자유 배치', '페이지 복사 및 재사용', '나만의 스티커 등록', '꾸민 페이지 이미지로 저장'] },
    { id: 'settings', icon: '⚙️', title: '설정 및 데이터 관리', sub: '화면 · 백업 · 인쇄 · 휴지통 · 계정' },
    { id: 'search', icon: '🔍', title: '통합 검색', sub: '모든 메뉴의 기록을 한 번에 찾아요', hidden: true }
  ];

  M.findMenu = function (id) {
    return M.menu.find(function (m) { return m.id === id; });
  };

  /* ---------------- 공통 조각 ---------------- */
  function widget(o) {
    return '<section class="card ' + (o.tape || 'tape') + ' ' + (o.cls || '') + '">' +
      '<h2 class="w-head"><span class="w-icon" aria-hidden="true">' + o.icon + '</span>' + o.title + '</h2>' +
      '<div class="w-body">' + o.body + '</div>' +
      (o.link ? '<a class="btn" href="#/' + o.link + '">' + o.linkLabel + '</a>' : '') +
      '</section>';
  }
  function empty(text) { return '<p class="empty">' + text + '</p>'; }

  /* ---------------- 홈 ---------------- */
  M.pages = {};
  M.mods = M.mods || {};

  /* ---------------- 설정: 저장 공간 현황 ---------------- */
  M.pages.fillStorage = async function (el) {
    if (!el) return;
    const fmt = M.media.fmtSize;
    if (M.dbError) {
      el.innerHTML = '<p class="empty">⚠️ ' + M.dbError.message + '</p>';
      return;
    }
    let st, est = null, persisted = null;
    try {
      st = await M.db.stats();
    } catch (e) {
      el.innerHTML = '<p class="empty">⚠️ ' + M.db.friendly(e).message + '</p>';
      return;
    }
    try {
      if (navigator.storage && navigator.storage.estimate) est = await navigator.storage.estimate();
      if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted();
    } catch (e) { /* 지원하지 않는 브라우저 */ }
    if (!el.isConnected) return;

    const pct = est && est.quota ? Math.min(100, (est.usage / est.quota) * 100) : 0;
    const R = M.media.RULES;
    el.innerHTML =
      '<div class="stat-grid">' +
        '<div class="stat"><span class="n">' + st.records + '</span><span class="l">기록</span></div>' +
        '<div class="stat"><span class="n">' + st.images + '</span><span class="l">사진</span></div>' +
        '<div class="stat"><span class="n">' + st.videos + '</span><span class="l">동영상</span></div>' +
        '<div class="stat"><span class="n">' + fmt(st.mediaBytes) + '</span><span class="l">사진·동영상 용량</span></div>' +
      '</div>' +
      (est && est.quota
        ? '<div class="usage"><div class="usage-bar"><span style="width:' + Math.max(pct, 1).toFixed(1) + '%"></span></div>' +
          '<p class="desc">이 브라우저에서 쓸 수 있는 공간 ' + fmt(est.quota) + ' 중 ' + fmt(est.usage || 0) + ' 사용 중</p></div>'
        : '<p class="desc">이 브라우저는 남은 저장 공간을 알려주지 않아요.</p>') +
      '<ul class="todo-list">' +
        '<li>사진: 한 장에 <b>' + fmt(R.image.max) + '</b>까지 (' + R.image.ext + ')</li>' +
        '<li>동영상: 한 개에 <b>' + fmt(R.video.max) + '</b>까지 (' + R.video.ext + ')</li>' +
        '<li>같은 파일을 여러 번 올려도 한 번만 저장돼서 공간을 아껴요.</li>' +
      '</ul>' +
      (persisted === null ? '' :
        '<div class="persist-row">' +
          (persisted
            ? '<span class="chip">🛡️ 기록 보호 켜짐</span><span class="desc">저장 공간이 부족해도 브라우저가 기록을 자동으로 지우지 않아요.</span>'
            : '<button type="button" class="btn" id="persistBtn">🛡️ 기록 보호 요청하기</button>' +
              '<span class="desc">브라우저가 저장 공간이 부족할 때 기록을 자동으로 지우지 않도록 요청해요.</span>') +
        '</div>');

    const btn = document.getElementById('persistBtn');
    if (btn) btn.addEventListener('click', async function () {
      let ok = false;
      try { ok = await navigator.storage.persist(); } catch (e) { ok = false; }
      if (ok) M.toast('기록 보호가 켜졌어요 🛡️');
      else M.toast('브라우저가 요청을 받아들이지 않았어요. 즐겨찾기에 추가하거나 자주 열면 나중에 허용될 수 있어요. 백업 파일도 꼭 만들어 주세요.', true);
      M.pages.fillStorage(el);
    });
  };

  /* ---------------- 준비 중 메뉴 ---------------- */
  M.pages.placeholder = function (menu) {
    return '<section class="card tape plan-card">' +
      '<span class="stage-badge">' + menu.stage + '단계에서 만들어요</span>' +
      '<p>' + menu.desc + '</p>' +
      '<h3>이 메뉴에 들어갈 기능</h3>' +
      '<ul class="chip-list">' + menu.items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' +
      '</section>';
  };

  /* ---------------- 설정 ---------------- */
  M.pages.settings = function (themeOnly) {
    const s = M.settings.get();
    const themes = M.themes.list;
    const season = M.themes.seasons[M.themes.currentSeason()];

    const themeCards = themes.map(function (t) {
      const selected = s.defaultTheme === t.id;
      return '<button type="button" class="theme-card" data-theme="' + M.themes.resolve(t.id) + '" data-pick-default="' + t.id + '" aria-pressed="' + selected + '">' +
        '<span class="check" aria-hidden="true">✔️</span>' +
        '<span class="mini" aria-hidden="true"></span>' +
        '<span class="name">' + t.emoji + ' ' + t.name + '</span>' +
        '</button>';
    }).join('');

    const defaultName = M.themes.byId(s.defaultTheme).name;
    const pageRows = M.menu.filter(function (m) { return !m.hidden; }).map(function (m) {
      const own = s.pageThemes[m.id] || '';
      const opts = '<option value="">기본 테마 따르기 (' + defaultName + ')</option>' +
        themes.map(function (t) {
          return '<option value="' + t.id + '"' + (own === t.id ? ' selected' : '') + '>' + t.emoji + ' ' + t.name + '</option>';
        }).join('');
      return '<li><span class="lbl">' + m.icon + ' ' + m.title + '</span>' +
        '<select class="select" data-page-theme="' + m.id + '" aria-label="' + m.title + ' 페이지 테마">' + opts + '</select></li>';
    }).join('');

    const themeSections =
      '<section class="card tape">' +
        '<h2>🎨 전체 기본 테마</h2>' +
        '<p class="desc">따로 테마를 정하지 않은 모든 페이지에 적용돼요. 계절별 테마는 지금 달에 맞춰 바뀌어요 (지금은 ' + season.emoji + ' ' + season.name + ').</p>' +
        '<div class="theme-grid">' + themeCards + '</div>' +
      '</section>' +

      '<section class="card tape-left">' +
        '<h2>📄 페이지별 테마</h2>' +
        '<p class="desc">페이지마다 다른 테마를 쓸 수 있어요. 각 페이지 위쪽의 "이 페이지 테마"에서도 바꿀 수 있어요. 덕질노트의 인물·작품은 각 기록에서 따로 테마를 고를 수 있어요.</p>' +
        '<ul class="page-theme-list">' + pageRows + '</ul>' +
      '</section>';
    if (themeOnly) return '<div class="settings-stack">' + themeSections + '</div>';

    return '<div class="settings-stack">' + themeSections +

      '<section class="card tape">' +
        '<h2>💾 저장 공간</h2>' +
        '<p class="desc">글 기록과 사진·동영상을 따로 나눠서 이 기기 안에 저장해요.</p>' +
        '<div id="storageInfo"><p class="empty">확인하는 중…</p></div>' +
      '</section>' +

      '<section class="card tape-corner">' +
        '<h2>🔒 개인정보 보호</h2>' +
        '<p class="desc">이 다이어리는 인터넷 서버를 쓰지 않아요. 모든 기록은 이 기기의 브라우저 안에만 저장되고, 외부로 보내지 않아요.</p>' +
        '<ul class="todo-list">' +
          '<li>브라우저의 "사이트 데이터 삭제"를 하거나 기기를 바꾸면 기록이 사라질 수 있어요. 그래서 7단계에서 <b>백업 파일 만들기</b>를 넣을 거예요.</li>' +
          '<li>잠금 화면은 가족이나 친구가 무심코 여는 것을 막아 줘요. 하지만 기기를 잘 아는 사람까지 완벽하게 막지는 못해요.</li>' +
        '</ul>' +
      '</section>' +

      '<section class="card tape">' +
        '<h2>🛠️ 앞으로 추가될 설정</h2>' +
        '<ul class="todo-list">' +
          '<li><b>잠금 화면 · 휴지통 · 다크 모드 · 글자 크기</b>: 6단계</li>' +
          '<li><b>백업 · 복원 (사진·동영상 포함) · PDF · 졸업 포토북</b>: 7단계</li>' +
        '</ul>' +
      '</section>' +
    '</div>';
  };
})();
