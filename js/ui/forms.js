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

/** Segmented control. */
export const segmented = (options, value, onPick) =>
  h(
    'div.segmented',
    ...options.map(([id, label]) =>
      h(
        'button',
        {
          class: id === value ? 'is-active' : '',
          'aria-pressed': String(id === value),
          onclick: () => onPick(id),
        },
        label
      )
    )
  );

/** Radio cards used for goals, activity, methods. */
export const radioCards = (options, value, onPick) =>
  h(
    'div.stack',
    ...options.map(([id, title, sub]) =>
      h(
        'button.radio-card',
        {
          'aria-pressed': String(id === value),
          onclick: () => onPick(id),
        },
        h('span.radio-card__dot'),
        h('div', h('div.setting__title', title), sub ? h('div.setting__sub', sub) : null)
      )
    )
  );

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
  h(
    'div.chips',
    ...days.map(([id, label]) =>
      h(
        'button.chip',
        {
          'aria-pressed': String(id === value),
          onclick: () => onPick(id),
        },
        label
      )
    )
  );
