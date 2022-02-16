
import { Flow } from '../src/index';
import Console from './fixtures/base/console';
import TimestampNode from './fixtures/base/timestamp';

test("test base flow", (done) => {
  const flow = new Flow({
    traceManager: null,
  });
  
  
  const $time = new TimestampNode({
    config:{
      params:{
        interval: 500
      }
    },
  })
  
  const $console = new Console({
      config:{params:{}},
      middleware: {
          logger: console.log,
      },
  })
  
  $time.O('Output').connect($console.I('Input'))
  
  // run
  flow.run($time);

  setTimeout(() => {
    done();
  }, 3000)
});




