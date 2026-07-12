import { useState } from 'react';
import { Board, StrumHit } from '../types';
import { useStore } from '../store/useStore';
import { createStrummingPattern } from '../store/factories';
import { StrummingDiagram } from './StrummingDiagram';

interface Props {
  board: Board;
}

type StrumTool = StrumHit | 'accent' | 'erase';

const TOOLS: { tool: StrumTool; label: string; glyph: string }[] = [
  { tool: 'down', label: 'Down', glyph: '↓' },
  { tool: 'up', label: 'Up', glyph: '↑' },
  { tool: 'bass', label: 'Bass', glyph: '↓•' },
  { tool: 'mute', label: 'Mute', glyph: '✕' },
  { tool: 'accent', label: 'Accent', glyph: '›' },
  { tool: 'erase', label: 'Erase', glyph: '⌫' },
];

/** Board-level strumming pattern editor: pick a tool, click slots to paint. */
export function StrummingEditor({ board }: Props) {
  const updateBoardMeta = useStore((s) => s.updateBoardMeta);
  const [tool, setTool] = useState<StrumTool>('down');

  const pattern = board.strumming;

  const applyTool = (index: number) => {
    if (!pattern) return;
    const slots = pattern.slots.map((s, i) => {
      if (i !== index) return s;
      if (tool === 'erase') return { hit: null };
      if (tool === 'accent') return s.hit ? { ...s, accent: !s.accent } : s;
      return { ...s, hit: tool };
    });
    updateBoardMeta(board.id, { strumming: { slots } });
  };

  if (!pattern) {
    return (
      <div className="strum strum--empty no-print">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => updateBoardMeta(board.id, { strumming: createStrummingPattern() })}
        >
          + Add strumming pattern
        </button>
      </div>
    );
  }

  return (
    <div className="strum no-print">
      <div className="strum__bar">
        <span className="strum__label">Strumming</span>
        <div className="strum__palette" role="group" aria-label="Strum tool">
          {TOOLS.map((t) => (
            <button
              key={t.tool}
              type="button"
              className={`strum-tool${tool === t.tool ? ' strum-tool--active' : ''}`}
              title={t.label}
              onClick={() => setTool(t.tool)}
            >
              <span className="strum-tool__glyph">{t.glyph}</span>
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => updateBoardMeta(board.id, { strumming: undefined })}
        >
          Clear
        </button>
      </div>

      <div className="strum__preview">
        <StrummingDiagram pattern={pattern} onSlotClick={applyTool} />
      </div>
    </div>
  );
}
