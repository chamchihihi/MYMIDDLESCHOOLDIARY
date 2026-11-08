/* 나의 프로필 */
(function () {
  const M = window.MMSD;

  const FIELDS = [
    { t: 'section', label: '🪪 기본 정보' },
    { k: 'name', label: '이름', t: 'text', top: 'title' },
    { k: 'nickname', label: '별명 / 애칭', t: 'text' },
    { k: 'birth', label: '생년월일', t: 'date' },
    { k: 'grade', label: '학년', t: 'grade', top: 'grade' },
    { k: 'classNo', label: '반', t: 'text', ph: '예: 3' },
    { k: 'number', label: '번호', t: 'text', ph: '예: 12' },
    { k: 'entryDate', label: '입학일', t: 'date', hint: '입력하면 일기·추억을 쓸 때 날짜에 맞춰 학년이 자동으로 정해져요.' },
    { k: 'gradDate', label: '졸업 예정일', t: 'date' },

    { t: 'section', label: '🎨 캐릭터 아바타와 사진' },
    { k: 'avatar', label: '캐릭터 아바타', t: 'choice', opts: M.forms.OPTS.avatar, full: true, big: true },
    { k: 'photos', label: '프로필 사진', t: 'media', top: 'mediaIds', full: true, hint: '사진을 넣으면 첫 번째 사진이 폴라로이드에 붙어요. 없으면 캐릭터 아바타가 보여요.' },

    { t: 'section', label: '💡 나에 대해' },
    { k: 'mbti', label: 'MBTI', t: 'text', ph: '예: ENFP' },
    { k: 'blood', label: '혈액형', t: 'select', opts: ['A형', 'B형', 'O형', 'AB형', '모름'] },
    { k: 'height', label: '키', t: 'number', unit: 'cm' },
    { k: 'shoe', label: '신발 사이즈', t: 'number', unit: 'mm' },
    { k: 'hobby', label: '취미', t: 'text' },
    { k: 'talent', label: '특기', t: 'text' },
    { k: 'likeFood', label: '좋아하는 음식', t: 'text' },
    { k: 'dislikeFood', label: '싫어하는 음식', t: 'text' },
    { k: 'color', label: '좋아하는 색깔', t: 'text' },
    { k: 'season', label: '좋아하는 계절', t: 'select', opts: ['봄', '여름', '가을', '겨울'] },
    { k: 'interests', label: '요즘 관심사', t: 'text', full: true },
    { k: 'keywords', label: '나를 표현하는 키워드', t: 'tags', top: 'tags', full: true },

    { t: 'section', label: '🌟 나의 꿈과 이야기' },
    { k: 'dream', label: '장래희망', t: 'text' },
    { k: 'motto', label: '나의 좌우명', t: 'text' },
    { k: 'tmi', label: '나의 TMI', t: 'textarea', full: true },
    { k: 'intro', label: '자기소개 한마디', t: 'textarea', full: true, rows: 2 }
  ];

  function previewHTML(rec) {
    const esc = M.ui.esc;
    const d = (rec && rec.data) || {};
    const photo = rec && (rec.mediaIds || [])[0];
    const cls = [rec && rec.grade ? rec.grade + '학년' : '', d.classNo ? d.classNo + '반' : '', d.number ? d.number + '번' : ''].filter(Boolean).join(' ');
    const tags = (rec && rec.tags) || [];
    return '<div class="polaroid big" aria-hidden="true"><div class="ph">' +
        (photo ? '<img data-media="' + esc(photo) + '" alt="">' : (d.avatar || '🐣')) +
      '</div><div class="cap">' + esc(d.nickname || 'my photo') + '</div></div>' +
      '<div class="pv-text">' +
        '<h2>' + esc((rec && rec.title) || '이름을 적어 주세요') + '</h2>' +
        (cls ? '<p class="pv-class">' + esc(cls) + '</p>' : '') +
        (d.intro ? '<p class="pv-intro">“' + esc(d.intro) + '”</p>' : '') +
        (tags.length ? '<ul class="tag-list">' + tags.map(function (t) { return '<li>#' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
        '<dl class="pv-facts">' +
          [['MBTI', d.mbti], ['장래희망', d.dream], ['좌우명', d.motto], ['좋아하는 계절', d.season]].filter(function (x) { return x[1]; })
            .map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') +
        '</dl>' +
      '</div>';
  }

  M.mods.profile = async function (el) {
    const rec = await M.ui.loadProfile();
    const ed = await M.forms.editor(el, {
      type: 'profile',
      fields: FIELDS,
      rec: rec || { type: 'profile', data: { avatar: '🐣' } },
      noBack: true,
      noDelete: true,
      before: '<section class="card tape profile-preview" id="pv">' + previewHTML(rec) + '</section>',
      onSaved: function (saved) {
        M.profile = saved;
        const pv = document.getElementById('pv');
        if (pv) { pv.innerHTML = previewHTML(saved); M.ui.hydrate(pv); }
      }
    });
    return ed;
  };

  M.profilePreview = previewHTML;
})();
