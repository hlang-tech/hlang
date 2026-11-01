// Three nodes, one of each kind. Each declares its ports in the constructor.
import { ReadableNode, TransformNode, WriteableNode, Port } from '@hlang-org/runtime';

/** R: sends one greeting on `out`. */
export class Greeting extends ReadableNode {
  constructor(opts) {
    super(opts);
    Port.O('out').attach(this);
  }
  _read($o) {
    $o('out').send('hello, hlang');
  }
}

/** T: upper-cases every text it receives on `in` and sends it on `out`. */
export class Uppercase extends TransformNode {
  constructor(opts) {
    super(opts);
    Port.I('in').attach(this);
    Port.O('out').attach(this);
  }
  _transform($i, $o) {
    $i('in').receive(text => $o('out').send(text.toUpperCase()));
  }
}

/** W: prints every text it receives on `in`. */
export class Print extends WriteableNode {
  constructor(opts) {
    super(opts);
    Port.I('in').attach(this);
  }
  _write($i) {
    $i('in').receive(text => console.log(text));
  }
}
