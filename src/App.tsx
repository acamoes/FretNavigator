import { useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { Dashboard } from './components/Dashboard';
import { BoardView } from './components/BoardView';
import { ReportView } from './components/ReportView';
import { useBoard } from './store/useStore';

type View =
  | { name: 'dashboard' }
  | { name: 'board'; boardId: string }
  | { name: 'report'; boardId: string };

export default function App() {
  const [view, setView] = useState<View>({ name: 'dashboard' });

  const activeBoardId = view.name === 'dashboard' ? null : view.boardId;
  const activeBoard = useBoard(activeBoardId);
  const context =
    view.name === 'dashboard'
      ? undefined
      : view.name === 'report'
        ? `${activeBoard?.name ?? 'Board'} · Report`
        : activeBoard?.name;

  const viewKey = view.name === 'dashboard' ? 'dashboard' : `${view.name}:${view.boardId}`;

  return (
    <div className="app">
      <AppHeader context={context} onHome={() => setView({ name: 'dashboard' })} />

      <main className="app__main view-enter" key={viewKey}>
        {view.name === 'dashboard' && (
          <Dashboard onOpenBoard={(boardId) => setView({ name: 'board', boardId })} />
        )}
        {view.name === 'board' && (
          <BoardView
            boardId={view.boardId}
            onBack={() => setView({ name: 'dashboard' })}
            onReport={() => setView({ name: 'report', boardId: view.boardId })}
          />
        )}
        {view.name === 'report' && (
          <ReportView boardId={view.boardId} onBack={() => setView({ name: 'board', boardId: view.boardId })} />
        )}
      </main>
    </div>
  );
}
