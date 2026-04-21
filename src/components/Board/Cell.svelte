<script>
	import Candidates from './Candidates.svelte';
	import { fade } from 'svelte/transition';
	import { SUDOKU_SIZE } from '@sudoku/constants';
	import { cursor } from '@sudoku/stores/cursor';

	export let value;
	export let cellX;
	export let cellY;
	export let candidates;

	export let disabled;
	export let conflictingNumber;
	export let userNumber;
	export let selected;
	export let sameArea;
	export let sameNumber;

	const borderRight = (cellX !== SUDOKU_SIZE && cellX % 3 !== 0);
	const borderRightBold = (cellX !== SUDOKU_SIZE && cellX % 3 === 0);
	const borderBottom = (cellY !== SUDOKU_SIZE && cellY % 3 !== 0);
	const borderBottomBold = (cellY !== SUDOKU_SIZE && cellY % 3 === 0);
</script>

<div class="cell row-start-{cellY} col-start-{cellX}"
     class:border-r={borderRight}
     class:border-r-4={borderRightBold}
     class:border-b={borderBottom}
     class:border-b-4={borderBottomBold}>

	{#if !disabled}
		<div class="cell-inner"
		     class:user-number={userNumber}
		     class:selected={selected}
		     class:same-area={sameArea}
		     class:same-number={sameNumber}
		     class:conflicting-number={conflictingNumber}>

			<button class="cell-btn" on:click={cursor.set(cellX - 1, cellY - 1)}>
				{#if candidates}
					<Candidates {candidates} />
				{:else}
					<span class="cell-text">{value || ''}</span>
				{/if}
			</button>

		</div>
	{/if}

</div>

<style>
	.cell {
		height: 100%;
		width: 100%;
		grid-row-end: auto;
		grid-column-end: auto;
	}

	.cell-inner {
		position: relative;
		height: 100%;
		width: 100%;
		color: #374151;
	}

	.cell-btn {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		height: 100%;
		width: 100%;
	}

	.cell-btn:focus {
		outline: none;
	}

	.cell-text {
		line-height: 1;
		font-size: 1rem;
	}

	@media (min-width: 300px) {
		.cell-text {
			font-size: 1.125rem;
		}
	}

	@media (min-width: 350px) {
		.cell-text {
			font-size: 1.25rem;
		}
	}

	@media (min-width: 400px) {
		.cell-text {
			font-size: 1.5rem;
		}
	}

	@media (min-width: 500px) {
		.cell-text {
			font-size: 1.875rem;
		}
	}

	@media (min-width: 600px) {
		.cell-text {
			font-size: 2.25rem;
		}
	}

	.user-number {
		color: #3b82f6;
	}

	.selected {
		background-color: #3b82f6;
		color: white;
	}

	.same-area {
		background-color: #dbeafe;
	}

	.same-number {
		background-color: #bfdbfe;
	}

	.conflicting-number {
		color: #dc2626;
	}
</style>