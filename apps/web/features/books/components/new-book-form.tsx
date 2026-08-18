'use client';

import { useActionState } from 'react';
import { createBookAction, type BookActionState } from '../actions';

const initialState: BookActionState = {};

export function NewBookForm() {
  const [state, action, pending] = useActionState(createBookAction, initialState);

  return (
    <form action={action} className="card" style={{ padding: 22, display: 'grid', gap: 14 }}>
      <div>
        <div className="eyebrow">New project</div>
        <h3 style={{ margin: '6px 0 4px', fontSize: 22 }}>Start a book</h3>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Set the authoring brief now; you can change it later.</p>
      </div>
      <div className="field" style={{ marginTop: 0 }}>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" required maxLength={200} placeholder="Working title" />
      </div>
      <div className="field" style={{ marginTop: 0 }}>
        <label htmlFor="subtitle">Subtitle</label>
        <input id="subtitle" name="subtitle" maxLength={240} placeholder="Optional" />
      </div>
      <div className="field" style={{ marginTop: 0 }}>
        <label htmlFor="audience">Primary audience</label>
        <input id="audience" name="audience" maxLength={500} placeholder="Who is this book for?" />
      </div>
      <div className="field" style={{ marginTop: 0 }}>
        <label htmlFor="purpose">Purpose</label>
        <textarea id="purpose" name="purpose" maxLength={1000} rows={3} placeholder="What should the reader understand or be able to do?" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, resize: 'vertical' }} />
      </div>
      <div className="field" style={{ marginTop: 0 }}>
        <label htmlFor="targetWordCount">Target word count</label>
        <input id="targetWordCount" name="targetWordCount" type="number" min={1} max={500000} placeholder="50000" />
      </div>
      {state.error ? <p role="alert" style={{ color: 'var(--danger)', margin: 0, fontSize: 13 }}>{state.error}</p> : null}
      <button className="button primary" type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create book'}</button>
    </form>
  );
}
