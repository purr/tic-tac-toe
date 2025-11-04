import { io, type Socket } from 'socket.io-client';

import { useCallback, useRef, useState } from 'react';
import OnlineBoard from './components/Board';
import LocalBoard from './components/Board.local';
import ThemeToggle from './components/ThemeToggle';
import { serverUrl } from './config';

enum gameStates {
  waiting,
  playing,
  menu,
  local,
}

enum playType { local, online }

enum connectionStates {
  disconnected,
  connecting,
  connected,
  error,
  timeout,
}

function App() {

  const [gameState, _gameState] = useState(gameStates.menu);
  const [connectionState, _connectionState] = useState(connectionStates.disconnected);
  const [errorMessage, _errorMessage] = useState<string>('');
  const socket = useRef<Socket | null>(null);
  const player = useRef(0);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleQuit = useCallback((p? : any) => {
    CancelOnline();
  }, []);

  const handleMenu = useCallback(function (p : playType) {
    switch (p) {
      case playType.online:
        // Reset states
        _connectionState(connectionStates.connecting);
        _errorMessage('');
        _gameState(gameStates.waiting);

        // Set a connection timeout (15 seconds)
        connectionTimeoutRef.current = setTimeout(() => {
          if (connectionState === connectionStates.connecting) {
            _connectionState(connectionStates.timeout);
            _errorMessage('Connection timeout. The server might be down or unreachable.');
            socket.current?.disconnect();
          }
        }, 15000);

        const s = io(serverUrl, {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 3,
          timeout: 10000,
        });

        // Connection event handlers
        s.on('connect', () => {
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          _connectionState(connectionStates.connected);
          _errorMessage('');
        });

        s.on('connect_error', (error: Error) => {
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          _connectionState(connectionStates.error);
          
          // Check for specific error types
          if (error.message.includes('404')) {
            _errorMessage('Server not found (404). Please try again later.');
          } else if (error.message.includes('timeout')) {
            _errorMessage('Connection timeout. Please check your internet connection.');
          } else {
            _errorMessage(`Connection error: ${error.message}`);
          }
        });

        s.on('disconnect', (reason: string) => {
          if (gameState === gameStates.playing) {
            _errorMessage(`Disconnected: ${reason}`);
          }
        });

        // Game event handlers
        s.on('room_joined', (p: any) => {
          player.current = [-1, 1][p.players - 1];
        });

        s.on('game_start', () => {
          _gameState(gameStates.playing);
        });

        socket.current = s;
        break;

      case playType.local:
        _gameState(gameStates.local);
        break;
    }
  }, []);

  const CancelOnline = function() {
    _gameState(gameStates.menu);
    _connectionState(connectionStates.disconnected);
    _errorMessage('');
    player.current = 0;

    // Clear connection timeout if it exists
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    socket.current?.disconnect();
    socket.current = null;
  }

  return (
    <div className="h-full flex-grow grid place-items-center text-center">
      <ThemeToggle />
      <div>
        <hgroup className='text-left mb-12'>
          <h1 className='text-3xl'>Welcome to Infinite Tic-Tac-Toe</h1>
          <p className='text-hierarchy-1'>a <strong>clone</strong> game based on a <a className='text-rose-iris hover:text-rose-love hover:underline transition-colors' href="https://www.lo10m.com/products/giiker-tic-tac-toe-bolt-best-family-game-for-6-99yrs">toy</a></p>
        </hgroup>

        { gameState === gameStates.menu && <>
          <h2 className='my-4 text-lg'>how would you like to play?</h2>
          <ul className='flex flex-col gap-2 w-32 mx-auto items-stretch'>
            <li><button onClick={() => handleMenu(playType.online)} className="btn block p-2 w-full border-2 rounded hover:bg-rose-overlay hover:text-hierarchy-0 transition-colors cursor-pointer">Online</button></li>
            <li><button onClick={() => handleMenu(playType.local)} className="btn block p-2 w-full border-2 rounded hover:bg-rose-overlay hover:text-hierarchy-0 transition-colors cursor-pointer">Local</button></li>
          </ul>
        </>}

        { gameState === gameStates.waiting && <footer className="h-full text-left">
          <hgroup className='mb-6'>
            <h2 className='text-lg'>GameMode: Online</h2>
            
            {/* Connection Status */}
            {connectionState === connectionStates.connecting && (
              <div className='text-hierarchy-1 flex items-center gap-2'>
                <div className='inline-block w-4 h-4 border-2 border-t-transparent border-rose-iris rounded-full animate-spin'></div>
                <p>Attempting to connect to server...</p>
              </div>
            )}
            
            {connectionState === connectionStates.connected && (
              <div className='text-green-400'>
                <p>✓ Connected to server</p>
                <p className='text-hierarchy-1 mt-2'>Looking for an opponent...</p>
              </div>
            )}
            
            {connectionState === connectionStates.error && (
              <div className='text-red-400'>
                <p>✗ Connection failed</p>
                <p className='text-sm mt-1'>{errorMessage || 'Unable to connect to server'}</p>
                <p className='text-hierarchy-1 text-xs mt-2'>The server may be temporarily unavailable. Please try again later.</p>
              </div>
            )}
            
            {connectionState === connectionStates.timeout && (
              <div className='text-yellow-400'>
                <p>⚠ Connection timeout</p>
                <p className='text-sm mt-1'>{errorMessage || 'Server is not responding'}</p>
                <p className='text-hierarchy-1 text-xs mt-2'>Please check your internet connection or try again later.</p>
              </div>
            )}
          </hgroup>
          <button onClick={CancelOnline} className='btn block p-2 w-32 mx-auto border-2 rounded hover:bg-rose-overlay hover:text-hierarchy-0 transition-colors cursor-pointer'>
            {(connectionState === connectionStates.error || connectionState === connectionStates.timeout) ? 'Back to Menu' : 'Cancel'}
          </button>
        </footer> }

        { gameState === gameStates.playing && <OnlineBoard socket={socket.current!} player={player.current} emit={handleQuit} /> }
        { gameState === gameStates.local && <LocalBoard emit={handleQuit}/> }
      </div>
    </div>
  )
}

export default App;
