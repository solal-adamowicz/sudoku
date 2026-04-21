import { mount } from 'svelte';
import Sudoku from '$lib/components/Sudoku.svelte';

mount(Sudoku, { target: document.getElementById('app')! });
