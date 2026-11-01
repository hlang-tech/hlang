import { Flow } from '@hlang-org/runtime';
import { Greeting, Uppercase, Print } from './lib/nodes.mjs';

const greeting = new Greeting();
const uppercase = new Uppercase();
const print = new Print();

// Wiring is always output to input.
greeting.O('out').connect(uppercase.I('in'));
uppercase.O('out').connect(print.I('in'));

// Run from the Readable root.
new Flow().run(greeting);
