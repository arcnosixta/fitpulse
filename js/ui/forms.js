/** Reusable form controls: multi-field prompt, settings row, segmented, switch. */

import { h, icon } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { openModal } from '../core/ui.js';

/**
 * Multi-field form in a modal.
 * @param {{title:string, fields:Array, onSubmit:(values:object)=>boolean|void,
 *          submitLabel?:string, onClose?:()=>void}} opts
 * @returns {{close:Function, values:object}}
 */
export function openPrompt({ title, fields, onSubmit, submitLabel, onClose }) {
  const values = {};
  const error = h('div.field__error.hidden');
  const inputs = new Map();

  const build = (field) => {
    // A native <select> in a WebView opens an opaque OS sheet and gives no
    // sense of what is currently picked, so a two-option field uses the same
    // segmented control as the onboarding.
    if (field.type === 'segmented') {
      values[field.key] = field.value ?? field.options[0]?.[0];
      const group = segmented(field.options, values[field.key], (id) => {
        values[field.key] = id;
        error.classList.add('hidden');
      });
      inputs.set(field.key, group);
      return h(
        'label.field',
        h('span.field__label', field.label),
        group,
        field.hint ? h('div.field__hint', field.hint) : null
      );
    }

    if (field.type === 'select') {
      const select = h(
        'select.input',
        {
          onchange: (e) => {
            values[field.key] = e.target.value;
          },
        },
        ...field.options.map(([value, label]) =>
          h('option', { value, selected: value === (field.value ?? field.options[0]?.[0]) }, label)
        )
      );
      values[field.key] = field.value ?? field.options[0]?.[0];
      inputs.set(field.key, select);
      return h('label.field', h('span.field__label', field.label), select, field.hint ? h('div.field__hint', field.hint) : null);
    }

    const input = h('input.input', {
      type: field.type ?? 'text',
      inputmode: field.type === 'number' ? 'decimal' : undefined,
      step: field.step ? String(field.step) : undefined,
      min: field.min != null ? String(field.min) : undefined,
      max: field.max != null ? String(field.max) : undefined,
      value: field.value != null ? String(field.value) : '',
      placeholder: field.placeholder ?? '',
      oninput: (e) => {
        values[field.key] = field.type === 'number' ? Number(e.target.value) : e.target.value;
        error.classList.add('hidden');
      },
    });
    values[field.key] = field.value != null ? field.value : field.type === 'number' ? null : '';
    inputs.set(field.key, input);

    const control = field.suffix
      ? h('div.input-group', input, h('span.input-group__suffix', field.suffix))
      : input;
    return h(
      'label.field',
      h('span.field__label', field.label),
      control,
      field.hint ? h('div.field__hint', field.hint) : null
    );
  };

  const submit = () => {
    const ok = onSubmit?.(values);
    if (ok === false) {
      error.textContent = t('common.apply');
      error.classList.remove('hidden');
      return;
    }
    close();
  };

  const { close: closeModal } = openModal({
    title,
    body: h('div.stack', ...fields.map(build), error),
    footer: [
      h('button.btn.btn--ghost', { onclick: () => closeModal() }, t('common.cancel')),
      h('button.btn.btn--primary', { onclick: submit }, submitLabel ?? t('common.save')),
    ],
    onClose,
  });

  function close() {
    closeModal();
  }

  return {
    close,
    values,
    focus: (key) => inputs.get(key)?.focus(),
  };
}

/** Settings row: icon, title/subtitle and a control on the right. */
export const settingRow = ({ glyph, title, sub, control, onClick }) =>
  h(
    onClick ? 'button.setting' : 'div.setting',
    onClick ? { onclick: onClick } : null,
    glyph ? h('span.setting__icon', typeof glyph === 'string' ? icon(glyph, 18) : glyph) : null,
    h('div.setting__body', h('div.setting__title', title), sub ? h('div.setting__sub', sub) : null),
    h('div.setting__ctrl', control ?? null)
  );

/** Pill switch bound to a boolean. */
export function toggleSwitch(checked, onChange) {
  const btn = h('button.switch', {
    role: 'switch',
    'aria-checked': String(!!checked),
    onclick: (e) => {
      e.stopPropagation();
      const next = btn.getAttribute('aria-checked') !== 'true';
      btn.setAttribute('aria-checked', String(next));
      onChange(next);
    },
  });
  return btn;
}

/**
 * Single-choice group built on the radiogroup pattern.
 *
 * The selected option is updated in place. This matters: the previous version
 * called back into the router's `refresh()`, which cleared the outlet and
 * rebuilt the whole screen, so every tap on "пол" or "цель" tore down the page
 * and replayed the view entrance animation. It felt like the tap was ignored.
 *
 * Keyboard: arrow keys move the selection, as the radiogroup pattern requires.
 */
export function choiceGroup({
  options,
  value,
  onPick,
  className = 'choices',
  optionClass = '',
  renderOption = ([id, label]) => label,
  label,
  onRender,
}) {
  const root = h('div.' + className, { role: 'radiogroup', 'aria-label': label });
  const buttons = new Map();
  let current = value;

  const paint = () => {
    for (const [id, btn] of buttons) {
      const on = id === current;
      btn.setAttribute('aria-checked', String(on));
      btn.classList.toggle('is-active', on);
      btn.tabIndex = on ? 0 : -1;
    }
    onRender?.(root, current, buttons.get(current));
  };

  const select = (id) => {
    if (id == null || !buttons.has(id) || id === current) return;
    current = id;
    paint();
    onPick(id);
  };

  for (const opt of options) {
    const id = opt[0];
    const btn = h(
      'button' + (optionClass ? '.' + optionClass.split(' ').join('.') : ''),
      {
        type: 'button',
        role: 'radio',
        onclick: () => select(id),
      },
      renderOption(opt)
    );
    buttons.set(id, btn);
    root.append(btn);
  }

  root.addEventListener('keydown', (e) => {
    const ids = options.map((o) => o[0]);
    const i = ids.indexOf(current);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = ids[(i + 1) % ids.length];
      select(next);
      buttons.get(next)?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = ids[(i - 1 + ids.length) % ids.length];
      select(prev);
      buttons.get(prev)?.focus();
    }
  });

  paint();
  return root;
}

/** Segmented control with a sliding pill under the active option. */
export const segmented = (options, value, onPick) => {
  const pill = h('span.segmented__pill', { 'aria-hidden': 'true' });
  const place = (btn) => {
    if (!btn || !pill.isConnected) return;
    // Rects rather than offsetLeft/offsetWidth: those are relative to the
    // button's offsetParent and to the border box, while the absolutely
    // positioned pill resolves against the padding box — the two disagreed by
    // the segment's border and the pill visibly sat a few px off its button.
    const box = root.getBoundingClientRect();
    const r = btn.getBoundingClientRect();
    if (!r.width) return;
    pill.style.width = `${r.width}px`;
    pill.style.height = `${r.height}px`;
    pill.style.transform = `translate(${r.left - box.left - root.clientLeft}px, ${r.top - box.top - root.clientTop}px)`;
  };

  const root = choiceGroup({
    options,
    value,
    onPick,
    className: 'segmented',
    renderOption: ([, label]) => label,
    onRender: (el, _id, btn) => {
      el.append(pill);
      // Layout is not settled on the first pass, and the segment also has to
      // re-place on resize and when a language swap changes label widths.
      requestAnimationFrame(() => place(btn));
    },
  });

  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => place(root.querySelector('[aria-checked="true"]')));
    ro.observe(root);
  }

  return root;
};

/** Radio cards used for goals, activity, methods. */
export const radioCards = (options, value, onPick) =>
  choiceGroup({
    options,
    value,
    onPick,
    className: 'stack choices--cards',
    optionClass: 'radio-card',
    renderOption: ([, title, sub]) => [
      h('span.radio-card__dot'),
      h('div', h('div.setting__title', title), sub ? h('div.setting__sub', sub) : null),
    ],
  });

/** Modal with a list of single-choice options. */
export function choiceModal({ title, options, value, onPick }) {
  const body = radioCards(
    options,
    value,
    (id) => {
      close();
      onPick(id);
    }
  );
  const { close } = openModal({ title, body });
  return { close };
}

/** Day-of-week chip row. */
export const dayChips = (days, value, onPick) =>
  choiceGroup({
    options: days,
    value,
    onPick,
    className: 'chips',
    optionClass: 'chip',
    renderOption: ([, label]) => label,
  });
