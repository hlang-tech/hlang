'use strict';

import build from '../src/build';
import graph from './fixtures/graph';
import * as runScript from 'runscript';


test('test parser', async () => {
    const { graphInfo, id } = graph;
    const config = {
        basePackageInfo: [
            {
                id: "Core",
                metaData: {
                    npmInfo: {
                        id: 'Core',
                        name: '/Users/archersado/workspace/mygit/Hlang/packages/runtime/lib/index.js',
                        version: "latest",
                        local: true,
                    },
                    cdnInfo: {
                        id: 'Core',
                        url: 'https://g.alicdn.cn/xxx',
                    }
                }
            },
            {
                id: "_",
                metaData: {
                    npmInfo: {
                        id: '_',
                        name: 'lodash',
                        version: "latest"
                    },
                    cdnInfo: {
                        id: '_',
                        url: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',
                    }
                }
            }
        ]
    }
    const entry = await build({ graphInfo, id, options: config });

    await runScript(`node ${entry}`);
});
