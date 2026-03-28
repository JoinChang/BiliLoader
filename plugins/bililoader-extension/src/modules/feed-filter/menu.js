const MENU_CLASS = 'bl-filter-menu';
const SUBMENU_CLASS = 'bl-filter-submenu';

function getCardInfo(dropdown) {
  const cardInfo = dropdown.closest('.bili-video-card__info--right');
  if (!cardInfo) return null;

  const title = cardInfo.querySelector('.bili-video-card__info--tit')?.title || '';
  const ownerLink = cardInfo.querySelector('.bili-video-card__info--owner')?.href || '';
  const author = cardInfo.querySelector('.bili-video-card__info--author span')?.textContent?.trim() || '';
  const uid = ownerLink.match(/space\.bilibili\.com\/(\d+)/)?.[1] || '';

  return { title, uid, author };
}

function addFilterItem(config, key, value) {
  const current = config.get(key) || [];
  if (!current.includes(value)) {
    config.set(key, [...current, value]);
  }
}

const BLOCKED_CLASS = 'bl-filter-blocked';

function injectStyles() {
  if (document.getElementById('bl-filter-menu-style')) return;
  const style = document.createElement('style');
  style.id = 'bl-filter-menu-style';
  style.textContent = `
    .${SUBMENU_CLASS} {
      display: none;
      position: absolute;
      left: 100%;
      top: -12px;
      right: auto;
      bottom: auto;
      transform: none;
      width: 220px;
      white-space: normal;
    }
    .${MENU_CLASS}:hover .${SUBMENU_CLASS} { display: block; }
    .${SUBMENU_CLASS} .more_dropdown--dropdown--item {
      display: block;
      box-sizing: border-box;
      width: 100%;
      padding-right: 27px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 40px;
    }
    .${BLOCKED_CLASS} { border-radius: 8px; overflow: hidden; width: 100%; }
    .${BLOCKED_CLASS}--img { padding-top: 56.25%; }
    .${BLOCKED_CLASS}--blur { background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(20px); }
    .${BLOCKED_CLASS}--left { max-width: 60%; padding: 0 10px; }
    .${BLOCKED_CLASS}--left img { width: 36px; }
    .${BLOCKED_CLASS}--sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .${BLOCKED_CLASS}--right .undo-btn { background: rgba(255, 255, 255, 0.2); }
    .${BLOCKED_CLASS}--right .undo-btn:hover { background: rgba(255, 255, 255, 0.3); }
    .${BLOCKED_CLASS}--right .undo-btn svg { width: 16px; height: 16px; }
  `;
  document.head.appendChild(style);
}

const BLOCK_DESC = {
  'filter-title': '已屏蔽标题',
  'filter-uid': '已屏蔽 UID',
  'filter-upname': '已屏蔽 UP 主',
};

function showBlockedOverlay(dropdown, value, key) {
  const card = dropdown.closest('.bili-video-card');
  if (!card) return null;

  const videoItem = card.closest('.app_home--video-item');
  const coverImg = card.querySelector('.bili-video-card__cover img[src*="hdslb.com"]')?.src || '';
  const title = BLOCK_DESC[key] || '已屏蔽';

  const blocked = document.createElement('div');
  blocked.className = `${BLOCKED_CLASS} w_100 p_relative`;
  blocked.innerHTML = `
    <div class="${BLOCKED_CLASS}--img">
      <img class="p_cover p_absolute" style="width:100%;height:100%;object-fit:cover;" src="${coverImg}" alt="">
      <div class="${BLOCKED_CLASS}--blur p_cover w_100 h_100 flex_center text_white">
        <div class="${BLOCKED_CLASS}--left text_center">
          <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEkAAABICAMAAACN8ShLAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAA5UExURUxpcf///////////////////////////////////////////////////////////////////////9URaEsAAAASdFJOUwCfQDC/EHAg3+9ggK/QUH+Qj54khLwAAAH/SURBVHjarZjbloYgCEbxLB6qn/d/2GlmnItJxUr3Za2+AIElAIsKR8qeTjBrYaWBNxibkK7oQ8FDpKYOPrgn5njiEHe1QtGZ1XKabuADjLBI99C8WUbTbfzGeebpCTv0UEjP2HmheakiNC9VYjQvZTy9ozpBQS9Bd0lIeo3+HySk99jKtxX+bVSY9s/THBIKgWiRUZpojVGOpjk6BydsJgaMVTtE04x3AoBIXbwD2JruSbqQ2C6cTOsbAScHXQlMb4hwoqp32Dm5/UcqUwUGOAlIFQoAqMHHQCtYXsHJ3ik+2Qtr3SHy90OTqIXoJrhXVUCEYVprZs7bXmvbcc0emYYSryVp2G7fLTosqVDF7ugrMWGS2HhoHyll1/7GFkM5pbq0zYeYnGWUqj9n5rKTqKL1MFWZVOXs1lISTSVLXXBrvm5m5mf7EEfSzcwMtAQNoGgJAsDQEmzpdPOoUkjTeDiRNALznTCd4EAnmvHgsAGM3POnzjfSj5zj3fPh3mAkBjcMLDpGjrQc8EaFX50d/6Ywh4xJnFGy6JwULc+YxBmlXdH505IDk27nueejNH+Ljqtu9h7+kxZNG/MT0Hyo4qpJMa4aOuOqQTiumvLj7CqkgBJYIj3dhkx6iHbR1ugwSzZQeDi4z5aoQ44GnuFCa+MXJbxCbYcuW0g/2kJ+Ae9XCxlBoYrBAAAAAElFTkSuQmCC" alt="">
          <p class="mt_sm">${title}</p>
          <p class="${BLOCKED_CLASS}--sub opacity_d75 fs_6 mt_xs">${value}</p>
        </div>
        <div class="${BLOCKED_CLASS}--right">
          <div class="undo-btn mx_sm px_sm py_xs flex_start text_nowrap bd_radius cs_pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="mr_xs"><path d="M8.28 2.47a.75.75 0 0 1 0 1.06L4.81 7l3.47 3.47a.75.75 0 0 1-1.06 1.06L3.573 7.884a1.25 1.25 0 0 1 0-1.768L7.22 2.47a.75.75 0 0 1 1.06 0z"/><path d="M3.75 7a.75.75 0 0 1 .75-.75h9.75a6.75 6.75 0 1 1 0 13.5H7.5a.75.75 0 0 1 0-1.5h6.75a5.25 5.25 0 1 0 0-10.5H4.5A.75.75 0 0 1 3.75 7z"/></svg>
            <span class="fs_5">撤销</span>
          </div>
        </div>
      </div>
    </div>`;

  // 隐藏原卡片
  card.style.display = 'none';
  videoItem.insertBefore(blocked, card);

  return { blocked, card, videoItem };
}

function removeFilterItem(config, key, value) {
  const current = config.get(key) || [];
  const updated = current.filter(v => v !== value);
  config.set(key, updated);
}

function createSubmenu(dropdown, info, config) {
  if (dropdown.querySelector(`.${MENU_CLASS}`)) return;

  // 让菜单自适应宽度
  dropdown.style.width = 'auto';
  dropdown.style.whiteSpace = 'nowrap';
  for (const child of dropdown.querySelectorAll(':scope > .more_dropdown--dropdown--item')) {
    child.style.paddingRight = '27px';
  }

  // 主菜单项
  const container = document.createElement('div');
  container.className = `more_dropdown--dropdown--item p_relative ${MENU_CLASS}`;
  container.style.paddingRight = '27px';

  const label = document.createElement('span');
  label.textContent = '使用 BiliLoader 屏蔽';
  container.appendChild(label);

  // 子菜单
  const submenu = document.createElement('div');
  submenu.className = `more_dropdown--dropdown ${SUBMENU_CLASS}`;

  const subItems = [
    { label: `标题：${info.title}`, key: 'filter-title', value: info.title },
    { label: `UID：${info.uid}`, key: 'filter-uid', value: info.uid },
    { label: `UP 主：${info.author}`, key: 'filter-upname', value: info.author },
  ];

  for (const item of subItems) {
    if (!item.value) continue;
    const el = document.createElement('div');
    el.className = 'more_dropdown--dropdown--item';
    el.textContent = item.label;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      addFilterItem(config, item.key, item.value);
      dropdown.style.display = 'none';
      dropdown.closest('.more_dropdown')?.classList.add('hide');

      const result = showBlockedOverlay(dropdown, item.value, item.key);
      if (result) {
        result.blocked.querySelector('.undo-btn').addEventListener('click', () => {
          removeFilterItem(config, item.key, item.value);
          result.blocked.remove();
          result.card.style.display = '';
        });
      }
    });
    submenu.appendChild(el);
  }

  // 边界检测
  container.addEventListener('mouseenter', () => {
    const rect = submenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      submenu.style.left = 'auto';
      submenu.style.right = '100%';
    }
    if (rect.bottom > window.innerHeight) {
      submenu.style.top = 'auto';
      submenu.style.bottom = '-12px';
    }
  });

  container.appendChild(submenu);
  dropdown.appendChild(container);
}

let _menuObserver = null;

export function installContextMenu(config) {
  if (_menuObserver) _menuObserver.disconnect();

  injectStyles();

  _menuObserver = new MutationObserver(() => {
    const dropdowns = document.querySelectorAll(`.more_dropdown--dropdown:not(.${SUBMENU_CLASS})`);
    for (const dropdown of dropdowns) {
      if (dropdown.style.display === 'none') continue;
      if (dropdown.querySelector(`.${MENU_CLASS}`)) continue;

      const info = getCardInfo(dropdown);
      if (info) createSubmenu(dropdown, info, config);
    }
  });

  const target = document.querySelector('.scroll-content>.app_home--video') || document.body;
  _menuObserver.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style'],
  });
}
