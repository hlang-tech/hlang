import { Flow, WriteableNode, Port } from '@hlang-org/runtime';
import RNode from '../lib/index.js';

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

test('base test case', () => {
  class Console extends WriteableNode {
    
    constructor(opts: Partial<OPTION>) {
      super(opts);
  
      Port.I('Input').attach(this);
    }
  
    _write($i) {  
      $i('Input').on((msg) => {
        expect(msg).toBe('hello world')
      });
    }
  };
  

  const myFlow = new Flow();

  const middleware = {
    logger:(...args)=> console.log(...args)
  }
  
  const $rnode = new RNode({
    nodeData: {
      param: 'hello world'
    },
    middleware
  })
  const $console = new Console({
    middleware
  });

  $rnode.O('Output').connect($console.I('Input'));
  myFlow.run($rnode);
})

