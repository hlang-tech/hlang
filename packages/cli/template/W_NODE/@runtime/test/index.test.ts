
import { Flow, ReadableNode ,Port } from '@hlang-org/runtime';
import WNode from '../lib/index.js';

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
  
  const $tnode = new Trigger({
    nodeData: {
      param: 'hello world',
    },
    middleware
  })
  const $wnode = new WNode({
    middleware
  });

  $tnode.O('Output').connect($wnode.I('Input'));

  myFlow.run($tnode);
})