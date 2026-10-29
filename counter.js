(() => {
  const limit = 100;
  let variant = 'limited';
  const editor = document.querySelector('.ce-redactor');
  const counter = document.querySelector('#character-counter');
  const publish = document.querySelector('.editor-control-bar__controls .button--type-primary');
  if (!editor || !counter) return;
  const textBlocks = [...editor.querySelectorAll('.editor-text-tool')];
  textBlocks.slice(1).forEach(field => field.closest('.ce-block').remove());
  const titleField = editor.querySelector('.editor-header-tool [contenteditable="true"]');
  if (titleField) titleField.textContent = '';
  if (textBlocks[0]) {
    textBlocks[0].textContent = '';
    textBlocks[0].dataset.placeholder = 'Текст';
  }
  const bar = document.querySelector('.editor-control-bar');
  const picker = document.querySelector('.editor-topic-picker');
  const pickerHome = picker.parentElement;
  const controls = document.querySelector('.editor-control-bar__controls');
  const back = document.createElement('button');
  back.className = 'editor-mobile-back';
  back.type = 'button';
  back.setAttribute('aria-label', 'Назад');
  back.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 3-9 9 9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  back.addEventListener('click', () => { document.querySelector('.modal-fullpage').hidden = true; });
  bar.prepend(back);
  const mobile = matchMedia('(max-width: 924px)');
  function layout() {
    if (mobile.matches) {
      bar.insertBefore(picker, controls);
      publish.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21V3m-8 8 8-8 8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      publish.setAttribute('aria-label', 'Опубликовать');
    } else {
      pickerHome.prepend(picker);
      publish.textContent = 'Опубликовать';
    }
  }
  const addBlock = document.createElement('button');
  addBlock.type = 'button';
  addBlock.className = 'editor-mobile-add';
  addBlock.setAttribute('aria-label', 'Добавить текстовый блок');
  addBlock.innerHTML = "<svg aria-hidden=\"true\" viewBox=\"0 0 20 20\" width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M10 3.333c.46 0 .833.373.833.834v5h5a.833.833 0 0 1 0 1.666h-5v5a.833.833 0 0 1-1.667 0v-5h-5a.833.833 0 0 1 0-1.666h5v-5c0-.46.373-.834.834-.834Z\"/></svg>";
  editor.after(addBlock);
  addBlock.addEventListener('click', () => {
    const block = editor.querySelector('.ce-block:last-child').cloneNode(true);
    block.removeAttribute('data-id');
    const field = block.querySelector('[contenteditable="true"]');
    field.textContent = '';
    editor.append(block);
    field.focus();
  });
  mobile.addEventListener('change', layout);
  layout();
  const switcher = document.createElement('div');
  switcher.className = 'variant-switcher';
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', 'Вариант счётчика');
  switcher.innerHTML = '<button type="button" data-variant="limited" aria-pressed="true">1 · С лимитом</button><button type="button" data-variant="unlimited" aria-pressed="false">2 · Без лимита</button>';
  document.body.append(switcher);
  switcher.addEventListener('click', event => {
    const button = event.target.closest('[data-variant]');
    if (!button) return;
    variant = button.dataset.variant;
    switcher.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    update();
  });
  const segmenter = new Intl.Segmenter('ru', { granularity: 'grapheme' });
  function update() {
    // Count visible article text, including title and spaces, but not editor UI.
    const fields = [...editor.querySelectorAll('[contenteditable="true"]')]
      .filter(field => !field.parentElement.closest('[contenteditable="true"]'));
    fields.forEach(field => {
      const empty = !field.textContent.replace(/[\u200b\n\r]/g, '').trim();
      field.dataset.empty = String(empty);
      if (field.classList.contains('editor-text-tool')) field.dataset.placeholder = 'Текст';
    });
    const text = fields.map(field => field.innerText.replace(/\u200b/g, '').replace(/\r\n/g, '\n').replace(/\n+$/, '')).join('');
    const count = [...segmenter.segment(text)].length;
    const remaining = limit - count;
    const limited = variant === 'limited';
    counter.textContent = limited ? `${count}/${limit}` : `Символов: ${count}`;
    counter.dataset.state = !limited ? 'normal' : remaining < 0 ? 'over' : remaining <= 5 ? 'warning' : 'normal';
    counter.title = !limited ? 'Учитываются заголовок и пробелы. Без ограничений.' : remaining < 0 ? `Лимит превышен на ${-remaining} символов` : `Осталось символов: ${remaining}. Учитываются заголовок и пробелы.`;
    counter.setAttribute('aria-label', limited ? `Использовано ${count} из ${limit} символов. ${counter.title}` : `Символов: ${count}. Без ограничений.`);
    if (publish) {
      publish.disabled = limited && remaining < 0;
      publish.title = limited && remaining < 0 ? 'Сократите статью до 100 символов' : 'Предпросмотр публикации';
    }
  }
  // Only the handle is draggable; editable text keeps native mouse selection.
  let draggedBlock = null;
  editor.querySelectorAll('.ce-block').forEach(block => {
    block.removeAttribute('draggable');
    const handle = block.querySelector('.ce-block-action__settings-toggler');
    if (handle) {
      handle.draggable = true;
      handle.title = 'Перетащить блок';
    }
  });
  editor.addEventListener('dragstart', event => {
    const handle = event.target.closest('.ce-block-action__settings-toggler');
    if (!handle) return;
    draggedBlock = handle.closest('.ce-block');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedBlock.dataset.id || 'block');
    event.dataTransfer.setDragImage(draggedBlock, 0, 0);
  });
  editor.addEventListener('dragover', event => {
    if (!draggedBlock) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });
  editor.addEventListener('drop', event => {
    if (!draggedBlock) return;
    event.preventDefault();
    const target = event.target.closest('.ce-block');
    if (target && target !== draggedBlock) {
      const bounds = target.getBoundingClientRect();
      target.insertAdjacentElement(event.clientY < bounds.top + bounds.height / 2 ? 'beforebegin' : 'afterend', draggedBlock);
    }
    draggedBlock = null;
  });
  editor.addEventListener('dragend', () => { draggedBlock = null; });
  editor.addEventListener('input', update);
  new MutationObserver(update).observe(editor, { childList: true, characterData: true, subtree: true });
  if (publish) publish.addEventListener('click', () => {
    alert('Это локальный прототип. Статья готова к публикации: ' + counter.textContent + ' символов.');
  });
  update();
})();
