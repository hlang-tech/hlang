

import { ReadableNode, Port } from '../../../src/index';
import { interval } from 'rxjs';
import moment = require('moment');

export default class TimestampNode extends ReadableNode {
  constructor(opts) {
    super(opts)

    this.opts = opts

    Port.I('Input').attach(this)
    Port.O('Output').attach(this)
  }

  _read($o) {
    const { config = {} } = this.opts;
    const { params = {} } = config;

    const time: number = moment.duration(params.interval).asMilliseconds();

    const source = interval(time);

    source.subscribe(() => { 
      const timestamp = moment().toISOString();

      $o('Output').send(timestamp);
    });
  }
}