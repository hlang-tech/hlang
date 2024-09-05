
import { Flow, WriteableNode, ReadableNode ,Port } from '@hlang-org/runtime';
import TNode from '../lib/index.js';

interface IMiddleware {
  logger: Function;
}
interface INodeProps {
  param: any;
}

interface OPTION {
  nodeId?: string;
  flowId?: string;
  env?: string;
  middleware?: IMiddleware;
  nodeData?: INodeProps;
}

test('base test case', (done) => {
  class Console extends WriteableNode {
    
    constructor(opts: Partial<OPTION>) {
      super(opts);
  
      Port.I('Input').attach(this);
    }
  
    _write($i) {  
      $i('Input').on((msg) => {
        expect(msg).toBe('hello world')
        done();
      });
    }
  };
  class Trigger extends ReadableNode {
    opts: OPTION;
    constructor(opts: OPTION) {

      super(opts);
      this.opts = opts;
      Port.O('Output').attach(this);
    }
  
    _read($o) {
      const { nodeData } = this.opts;
      const { param } = nodeData as INodeProps;
      $o('Output').send(param)
    }
  }
  

  const myFlow = new Flow();

  const middleware = {
    logger:(...args)=> console.log(...args)
  }
  
  const $tnode = new TNode({
    nodeData: {
      delayTime: 1
    },
    middleware
  })
  const $console = new Console({
    middleware
  });
  const $t= new Trigger({
    nodeData: {
      param: 'hello world'
    }
  })

  $t.O('Output').connect($tnode.I('Input'));
  $tnode.O('Output').connect($console.I('Input'));

  myFlow.run($t);
})