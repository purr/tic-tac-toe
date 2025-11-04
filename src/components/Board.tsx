import { useEffect, useMemo, useState } from 'react'
import * as BoardControls from './Board.controls';

import s from './Board.module.css';

import { Socket } from 'socket.io-client';

enum cellState { x = -1, n, y };

type player = cellState.x | cellState.y;
type moves = [number | null, number | null, number | null];

type Props = {
  socket: Socket,
  player: player,
  emit: (e?: unknown) => void;
}

// Inactivity timeout configuration (in milliseconds)
const INACTIVITY_CONFIG = {
  WARNING_START: 10000,           // Show warning after 10 seconds of inactivity
  WARNING_DURATION: 15000,        // Warning countdown duration (15 seconds)
  TOTAL_TIMEOUT: 25000,           // Total timeout: 10s + 15s = 25s before disconnect
  NOTIFICATION_DURATION: 3000,    // Show disconnect notification for 3 seconds before returning to menu
  CHECK_INTERVAL: 500,            // Check inactivity every 500ms for smooth countdown
};

export default function App({ socket: ss, player, emit }: Props) {
  const [asignation, _asignation] = useState(player);
  const socket: Socket = useMemo(() => ss, []);

  const turns = {
    [cellState.x]: useState<moves>([null, null, null]),
    [cellState.y]: useState<moves>([null, null, null]),
  }

  const [turn, _turn] = useState<player>(cellState.x);
  const [showDisconnectNotification, _showDisconnectNotification] = useState(false);
  const [inactivityWarning, _inactivityWarning] = useState(0); // Countdown in seconds for current player (0 = no warning)
  const [opponentInactivityWarning, _opponentInactivityWarning] = useState(0); // Countdown for opponent (0 = no warning)

  const cells = useMemo(() => {
    const r = Array(9).fill(cellState.n);

    for (const e of turns[cellState.x][0])
      if (e !== null) r[e] = cellState.x;

    for (const e of turns[cellState.y][0])
      if (e !== null) r[e] = cellState.y;

    return r;
  }, [turns[cellState.x], turns[cellState.y]]);

  const [winner, _winner] = useState(cellState.n);
  const toFade = useMemo(() => turns[turn][0][0], [turns[cellState.x], turns[cellState.y]]);

  useEffect(() => {
    socket.on('turn', p => {
      const { state, turn } = p;

      _turn(turn);

      turns[cellState.x][1](state[cellState.x]);
      turns[cellState.y][1](state[cellState.y]);
    });

    socket.on('rematch', p => {
      turns[cellState.x][1](p.state[cellState.x]);
      turns[cellState.y][1](p.state[cellState.y]);

      _asignation(a => -a as player);
      _winner(cellState.n);
    });

    socket.on('game_end', p => {
      const { state, winner } = p;

      _turn(winner);
      _winner(winner);

      turns[cellState.x][1](state[cellState.x]);
      turns[cellState.y][1](state[cellState.y]);
    });

    return () => {
      socket.off('turn');
      socket.off('rematch');
      socket.off('game_end');
    };
  }, []);

  // Inactivity monitoring system (frontend-based, no server ping/pong needed)
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout | null = null;
    let warningTimer: NodeJS.Timeout | null = null;
    let lastActivityTime = Date.now();
    let warningStartTime: number | null = null;

    const resetActivity = () => {
      lastActivityTime = Date.now();
      _inactivityWarning(0);
      _opponentInactivityWarning(0);
      warningStartTime = null;

      if (warningTimer) {
        clearInterval(warningTimer);
        warningTimer = null;
      }
    };

    // Monitor for inactivity
    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityTime;

      // If it's our turn (we're the active player)
      if (turn === asignation) {
        // Show warning after WARNING_START seconds (10s)
        if (timeSinceActivity >= INACTIVITY_CONFIG.WARNING_START && timeSinceActivity < INACTIVITY_CONFIG.TOTAL_TIMEOUT) {
          if (!warningStartTime) {
            warningStartTime = now;
          }
          // Calculate seconds remaining from total timeout
          const secondsRemaining = Math.ceil((INACTIVITY_CONFIG.TOTAL_TIMEOUT - timeSinceActivity) / 1000);
          _inactivityWarning(secondsRemaining);
          _opponentInactivityWarning(0); // Clear opponent warning
        } else if (timeSinceActivity >= INACTIVITY_CONFIG.TOTAL_TIMEOUT) {
          // Auto-disconnect after TOTAL_TIMEOUT (25s total: 10s silent + 15s warning)
          _inactivityWarning(0);
          _opponentInactivityWarning(0);
          _showDisconnectNotification(true);
          setTimeout(() => {
            emit();
          }, INACTIVITY_CONFIG.NOTIFICATION_DURATION);

          if (inactivityTimer) clearInterval(inactivityTimer);
          if (warningTimer) clearInterval(warningTimer);
        } else {
          _inactivityWarning(0);
          _opponentInactivityWarning(0);
        }
      } else {
        // It's opponent's turn - we're waiting
        // Show warning to us that opponent is taking too long (same timeline: 10s + 15s warning)
        if (timeSinceActivity >= INACTIVITY_CONFIG.WARNING_START && timeSinceActivity < INACTIVITY_CONFIG.TOTAL_TIMEOUT) {
          const secondsRemaining = Math.ceil((INACTIVITY_CONFIG.TOTAL_TIMEOUT - timeSinceActivity) / 1000);
          _opponentInactivityWarning(secondsRemaining);
          _inactivityWarning(0); // Clear our warning
        } else if (timeSinceActivity >= INACTIVITY_CONFIG.TOTAL_TIMEOUT) {
          // Opponent didn't move, disconnect both
          _inactivityWarning(0);
          _opponentInactivityWarning(0);
          _showDisconnectNotification(true);
          setTimeout(() => {
            emit();
          }, INACTIVITY_CONFIG.NOTIFICATION_DURATION);

          if (inactivityTimer) clearInterval(inactivityTimer);
          if (warningTimer) clearInterval(warningTimer);
        } else {
          _inactivityWarning(0);
          _opponentInactivityWarning(0);
        }
      }
    };

    // Check at regular intervals for smooth countdown
    inactivityTimer = setInterval(checkInactivity, INACTIVITY_CONFIG.CHECK_INTERVAL);

    // Reset activity on any game action
    socket.on('turn', resetActivity);
    socket.on('game_start', resetActivity);
    socket.on('game_end', resetActivity);

    // Handle explicit disconnect
    socket.on('disconnect', () => {
      _showDisconnectNotification(true);
      setTimeout(() => {
        emit();
      }, INACTIVITY_CONFIG.NOTIFICATION_DURATION);
    });

    // Cleanup
    return () => {
      if (inactivityTimer) clearInterval(inactivityTimer);
      if (warningTimer) clearInterval(warningTimer);
      socket.off('turn', resetActivity);
      socket.off('game_start', resetActivity);
      socket.off('game_end', resetActivity);
    };
  }, [socket, emit, turn, asignation]);

  const handleClick = function(ev: React.MouseEvent<HTMLButtonElement>) {
    if (winner !== cellState.n || turn !== asignation) return;

    const target = ev.target as HTMLButtonElement;
    const i = Number(target.dataset['index']);

    if (isNaN(i) || i < 0 || i > 8) return;

    // Reset inactivity warning when player makes a move
    _inactivityWarning(0);

    socket.emit('turn', { coord: i, turn: asignation });

    turns[turn][1](([_, ...t]) => [...t, i]);
    _turn(t => -t as player);
  };

  const [handleRetry, handleMenu] = useMemo(() => [
    () => socket.emit('rematch'),
    emit.bind(null),
  ], [socket, emit]);

  return (
    <>
      <main className='h-full flex-grow grid place-items-center relative'>
        <div>
          <div className={`${s.cell} mx-auto size-12 flex items-center justify-center my-6 rounded-full border-2 text-center filter ${(asignation !== turn) && 'saturate-0'}`} data-status={asignation}></div>

          <div className={`${s.board} grid grid-cols-3 grid-rows-3 size-64 gap-2 text-center ${winner !== cellState.n && 'filter saturate-50 brightness-75'}`}>
            { cells.map((c, i) => (
              <button
                key={i}
                onClick={handleClick}
                className={`${s.cell} border-2 rounded`}
                disabled={winner !== cellState.n || c !== cellState.n}
                data-limbo={winner !== cellState.n ? false : toFade === i}
                data-status={c}
                data-index={i}
              />
            ))}
          </div>
        </div>

        {/* Inactivity Warning - When it's YOUR turn (Fixed position, doesn't move board) */}
        {inactivityWarning > 0 && turn === asignation && winner === cellState.n && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 px-4 py-3 bg-rose-overlay border-2 border-rose-gold rounded-lg text-center animate-pulse shadow-2xl max-w-sm w-full mx-4">
            <p className="text-rose-gold font-bold">⚠ Make your move!</p>
            <p className="text-hierarchy-1 text-sm">Disconnecting in {inactivityWarning} second{inactivityWarning !== 1 ? 's' : ''}...</p>
          </div>
        )}

        {/* Opponent Inactivity Warning - When it's OPPONENT'S turn (Fixed position, doesn't move board) */}
        {opponentInactivityWarning > 0 && turn !== asignation && winner === cellState.n && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 px-4 py-3 bg-rose-overlay border-2 border-rose-foam rounded-lg text-center shadow-2xl max-w-sm w-full mx-4">
            <p className="text-rose-foam font-bold">⏳ Waiting for opponent...</p>
            <p className="text-hierarchy-1 text-sm">They will disconnect in {opponentInactivityWarning} second{opponentInactivityWarning !== 1 ? 's' : ''} if no move is made</p>
          </div>
        )}
      </main>
      <BoardControls.BottomMenu handleMenu={handleMenu} handleRetry={handleRetry} winner={winner} />

      {/* Disconnect Notification */}
      {showDisconnectNotification && (
        <div className="fixed inset-0 bg-rose-overlay bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-rose-surface border-2 border-rose-muted rounded-lg p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center">
              <div className="text-rose-love text-5xl mb-4">⚠</div>
              <h2 className="text-2xl font-bold text-hierarchy-0 mb-3">Connection Lost</h2>
              <p className="text-hierarchy-1 mb-2">The other player has disconnected or the connection was lost.</p>
              <p className="text-hierarchy-2 text-sm">Returning to menu...</p>
              <div className="mt-6 flex justify-center">
                <div className="w-8 h-8 border-4 border-rose-iris border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
