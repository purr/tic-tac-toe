type pBottomMenu = {
	handleMenu : () => void;
	handleRetry : () => void;
	winner : number,
};

export function BottomMenu({ handleMenu, handleRetry, winner } : pBottomMenu) {
	return (<aside className={`my-6 flex gap-2 justify-center`}>
			<button
				onClick={handleMenu}
				className='btn block p-2 w-32 border-2 rounded hover:bg-rose-overlay hover:text-hierarchy-0 transition-colors cursor-pointer'
				aria-label="Return to menu"
			>
				Menu
			</button>
			<button
				onClick={handleRetry}
				className={`btn block ${winner === 0 && 'invisible'} p-2 w-32 border-2 rounded hover:bg-rose-overlay hover:text-hierarchy-0 transition-colors cursor-pointer`}
				aria-label="Play again"
				aria-disabled={winner === 0}
			>
				Play Again
			</button>
	</aside>)
}