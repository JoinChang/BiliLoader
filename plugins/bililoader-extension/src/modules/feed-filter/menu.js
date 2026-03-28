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
  `;
  document.head.appendChild(style);
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
