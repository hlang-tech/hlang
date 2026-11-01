/**
 * `ParamForm` — renders a derived `ParamField[]` as compact, pro-tool form
 * controls. Text/number inputs commit on blur or Enter (not per keystroke, so
 * one edit is one undo entry); toggles commit immediately. `custom` fields are
 * a placeholder until the ParamFieldRegistry lands (M-UI-5).
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import type { ParamValue } from '@hlang-org/editor-core';
import type { ParamField } from '../schema/param-field';
import './ParamForm.css';

export interface ParamFormProps {
  readonly fields: readonly ParamField[];
  /** Commit a single field's new value (undoable, handled by the caller). */
  readonly onCommit: (key: string, value: ParamValue) => void;
}

export function ParamForm({ fields, onCommit }: ParamFormProps): ReactElement {
  return (
    <div className="hl-form">
      {fields.map(field => (
        <FieldRow key={field.key} field={field} onCommit={onCommit} />
      ))}
    </div>
  );
}

function FieldRow({
  field,
  onCommit,
}: {
  field: ParamField;
  onCommit: (key: string, value: ParamValue) => void;
}): ReactElement {
  return (
    <label className="hl-field">
      <span className="hl-field-label">{field.label}</span>
      <FieldControl field={field} onCommit={onCommit} />
    </label>
  );
}

function FieldControl({
  field,
  onCommit,
}: {
  field: ParamField;
  onCommit: (key: string, value: ParamValue) => void;
}): ReactElement {
  switch (field.type) {
    case 'toggle':
      return (
        <button
          type="button"
          role="switch"
          aria-checked={field.value}
          className={`hl-toggle${field.value ? ' is-on' : ''}`}
          disabled={field.disabled}
          onClick={() => onCommit(field.key, !field.value)}
        >
          <span className="hl-toggle-knob" />
        </button>
      );
    case 'number':
      return <NumberControl field={field} onCommit={onCommit} />;
    case 'textarea':
      return <TextControl field={field} onCommit={onCommit} multiline />;
    case 'text':
      return <TextControl field={field} onCommit={onCommit} />;
    case 'custom':
      return (
        <span className="hl-field-custom hl-mono" title={field.fieldType}>
          {describeCustom(field.value)}
        </span>
      );
  }
}

function TextControl({
  field,
  onCommit,
  multiline = false,
}: {
  field: ParamField & { type: 'text' | 'textarea' };
  onCommit: (key: string, value: ParamValue) => void;
  multiline?: boolean;
}): ReactElement {
  const [draft, setDraft] = useState(field.value);
  const commit = (): void => {
    if (draft !== field.value) {
      onCommit(field.key, draft);
    }
  };
  const shared = {
    className: 'hl-input',
    value: draft,
    disabled: field.disabled,
    spellCheck: false,
    onBlur: commit,
  };
  if (multiline) {
    return (
      <textarea
        {...shared}
        rows={4}
        onChange={e => setDraft(e.target.value)}
      />
    );
  }
  return (
    <input
      {...shared}
      type="text"
      onChange={e => setDraft(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function NumberControl({
  field,
  onCommit,
}: {
  field: ParamField & { type: 'number' };
  onCommit: (key: string, value: ParamValue) => void;
}): ReactElement {
  const [draft, setDraft] = useState(String(field.value));
  const commit = (): void => {
    const parsed = Number(draft);
    if (!Number.isNaN(parsed) && parsed !== field.value) {
      onCommit(field.key, parsed);
    }
  };
  return (
    <input
      className="hl-input hl-mono"
      type="number"
      inputMode="decimal"
      value={draft}
      disabled={field.disabled}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function describeCustom(value: ParamValue): string {
  if (Array.isArray(value)) {
    return `[${String(value.length)} items]`;
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'object') {
    return '{…}';
  }
  return String(value);
}
