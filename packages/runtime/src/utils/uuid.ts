import { v4 } from 'uuid';

/**
 * Random v4 ids for nodes and ports. A collision needs about 2^61 ids for even
 * odds, so ids are not recorded: a long-running host that builds graphs over
 * and over keeps no memory of the ids it used.
 */
export default {
  create(): string {
    return v4();
  },
};
