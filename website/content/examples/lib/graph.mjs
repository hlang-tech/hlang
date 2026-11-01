// The same program as data: an IGraph. A connection's Output is the upstream
// port and its Input is the downstream port.
export const graph = {
  nodeList: [
    { nodeId: 'a', code: 'greeting', name: 'Greeting', type: 'R' },
    { nodeId: 'b', code: 'uppercase', name: 'Uppercase', type: 'T' },
    { nodeId: 'c', code: 'print', name: 'Print', type: 'W' },
  ],
  connections: [
    { Output: { nodeId: 'a', portConf: { id: 'out' } }, Input: { nodeId: 'b', portConf: { id: 'in' } } },
    { Output: { nodeId: 'b', portConf: { id: 'out' } }, Input: { nodeId: 'c', portConf: { id: 'in' } } },
  ],
};
