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

export default function App({ socket: ss, player, emit }: Props) {
  const [asignation, _asignation] = useState(player);
  const socket: Socket = useMemo(() => ss, []);

  const turns = {
    [cellState.x]: useState<moves>([null, null, null]),
    [cellState.y]: useState<moves>([null, null, null]),
  }

  const [turn, _turn] = useState<player>(cellState.x);

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

  const handleClick = function(ev: React.MouseEvent<HTMLButtonElement>) {
    if (winner !== cellState.n || turn !== asignation) return;

    const target = ev.target as HTMLButtonElement;
    const i = Number(target.dataset['index']);

    if (isNaN(i) || i < 0 || i > 8) return;

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
      <main className='h-full flex-grow grid place-items-center'>
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
      </main>
      <BoardControls.BottomMenu handleMenu={handleMenu} handleRetry={handleRetry} winner={winner} />
    </>
  )
}
