import React from 'react';
import ReactDOM from 'react-dom/client';
import App, { NodeType } from './App';
import './index.scss';

const graph = {
  connections: [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
    }
  ],
  nodeList: [
    {
        "id": '2',
        "code": "advanced-function",
        "icon": "",
        "name": "自定义函数",
        "type": "T",
        "nodeId": "spider-e62d22a2-478d-4f32-8117-6f782a7ccec0",
        "bizData": {
            "flowId": "1",
            "nodeId": "spider-e62d22a2-478d-4f32-8117-6f782a7ccec0",
            "params": {
                "hackSend": false,
                "scriptCode": "// Type some code...\n\nconsole.log(input);"
            }
        },
        "version": 1,
        "portInfo": {
            "Input": [
                {
                    "id": "Input",
                    "dto": {
                        "name": "DTO_Input",
                        "children": [
                            {
                                "name": "_traceId",
                                "type": {
                                    "name": "string",
                                    "type": "intrinsic"
                                },
                                "flags": {
                                    "isExported": true
                                },
                                "sources": [
                                    {
                                        "line": 2,
                                        "fileName": "src/type/IO.ts",
                                        "character": 10
                                    }
                                ]
                            },
                            {
                                "name": "payload",
                                "type": {
                                    "name": "any",
                                    "type": "intrinsic"
                                },
                                "flags": {
                                    "isExported": true
                                },
                                "sources": [
                                    {
                                        "line": 3,
                                        "fileName": "src/type/IO.ts",
                                        "character": 9
                                    }
                                ]
                            }
                        ],
                        "kindString": "Interface"
                    },
                    "desc": "输入",
                    "name": "输入"
                }
            ],
            "Output": [
                {
                    "id": "Output",
                    "dto": {
                        "name": "DTO_Output",
                        "children": [
                            {
                                "name": "_traceId",
                                "type": {
                                    "name": "string",
                                    "type": "intrinsic"
                                },
                                "flags": {
                                    "isExported": true
                                },
                                "sources": [
                                    {
                                        "line": 7,
                                        "fileName": "src/type/IO.ts",
                                        "character": 10
                                    }
                                ]
                            },
                            {
                                "name": "payload",
                                "type": {
                                    "name": "any",
                                    "type": "intrinsic"
                                },
                                "flags": {
                                    "isExported": true
                                },
                                "sources": [
                                    {
                                        "line": 8,
                                        "fileName": "src/type/IO.ts",
                                        "character": 9
                                    }
                                ]
                            }
                        ],
                        "kindString": "Interface"
                    },
                    "desc": "输出",
                    "name": "输出"
                }
            ]
        },
        "position": {
            "x": 723,
            "y": 228.578125
        },
        "gmtCreate": "2024-05-27T10:32:16.839Z",
        "groupCode": "advanced",
        "description": "",
        "gmtModified": "2024-05-27T10:32:16.839Z",
        "editorResource": {
            "styleHref": "https://icomestatics.oss-cn-beijing.aliyuncs.com/Elang/node/%40ennew/elang-advanced-function/6/editor.css",
            "scriptHref": "https://icomestatics.oss-cn-beijing.aliyuncs.com/Elang/node/%40ennew/elang-advanced-function/6/editor.js"
        },
        "runtimeResource": "@hset/xlang-advanced-function@latest"
    },
    {
        "id": '1',
        "code": "trigger-http-request",
        "icon": "",
        "name": "http 请求",
        "type": "R",
        "nodeId": "spider-68a448a7-b6f7-46c7-8639-e37ed2c27f47",
        "bizData": {
            "flowId": "1",
            "nodeId": "spider-68a448a7-b6f7-46c7-8639-e37ed2c27f47",
            "params": {
                "url": "/test",
                "method": "GET"
            }
        },
        "version": 1,
        "portInfo": {
            "Output": [
                {
                    "id": "Output",
                    "desc": "输出",
                    "name": "输出"
                }
            ]
        },
        "position": {
            "x": 338,
            "y": 200.578125
        },
        "gmtCreate": "2024-05-27T10:26:37.379Z",
        "groupCode": "trigger",
        "description": "",
        "gmtModified": "2024-05-27T10:26:37.379Z",
        "editorResource": {
            "styleHref": "https://icomestatics.oss-cn-beijing.aliyuncs.com/Elang/node/%40ennew/elang-trigger-http-request/4/editor.css",
            "scriptHref": "https://icomestatics.oss-cn-beijing.aliyuncs.com/Elang/node/%40ennew/elang-trigger-http-request/4/editor.js"
        },
        "runtimeResource": "@hset/xlang-trigger-http-request@latest"
    }
  ]
}


graph.nodeList = graph.nodeList.map(el => {
  const { name, code, bizData, portInfo, editorResource } = el;

  return {
    ...el,
    nodeData: {
      ...bizData,
      ports: portInfo,
      editorResource,
      title: name,
      code,
    }
  }
})
const nodes = [
  {
    name: '基础节点',
    code: 'base',
    description: 'base',
    children: [
      {
        id: '1',
        version: 1,
        description: 'http 请求',
        name: 'http 请求',
        icon: '',
        code: 'http-request',
        type: NodeType.R,
        groupCode: 'base',
        editorResource: {"styleHref": "https://icomestatics.oss-cn-beijing.aliyuncs.com/Elang/node/%40ennew/elang-trigger-http-request/4/editor.css", "scriptHref": "https://icomestatics.oss-cn-beijing.aliyuncs.com/Elang/node/%40ennew/elang-trigger-http-request/4/editor.js"},
        runtimeResource: '@hset/xlang-trigger-http-request@latest',
        portInfo: {"Output": [{"id": "Output", "desc": "输出", "name": "输出"}]}
      },
      {
        id: '2',
        version: 1,
        description: '自定义函数',
        name: '自定义函数',
        icon: '',
        code: 'function',
        type: NodeType.T,
        groupCode: 'base',
        editorResource: {"styleHref": "https://icomestatics.oss-cn-beijing.aliyuncs.com/Elang/node/%40ennew/elang-advanced-function/6/editor.css", "scriptHref": "https://icomestatics.oss-cn-beijing.aliyuncs.com/Elang/node/%40ennew/elang-advanced-function/6/editor.js"},
        runtimeResource: '@hset/xlang-advanced-function@latest',
        portInfo: {"Input": [{"id": "Input", "dto": {"name": "DTO_Input", "children": [{"name": "_traceId", "type": {"name": "string", "type": "intrinsic"}, "flags": {"isExported": true}, "sources": [{"line": 2, "fileName": "src/type/IO.ts", "character": 10}]}, {"name": "payload", "type": {"name": "any", "type": "intrinsic"}, "flags": {"isExported": true}, "sources": [{"line": 3, "fileName": "src/type/IO.ts", "character": 9}]}], "kindString": "Interface"}, "desc": "输入", "name": "输入"}], "Output": [{"id": "Output", "dto": {"name": "DTO_Output", "children": [{"name": "_traceId", "type": {"name": "string", "type": "intrinsic"}, "flags": {"isExported": true}, "sources": [{"line": 7, "fileName": "src/type/IO.ts", "character": 10}]}, {"name": "payload", "type": {"name": "any", "type": "intrinsic"}, "flags": {"isExported": true}, "sources": [{"line": 8, "fileName": "src/type/IO.ts", "character": 9}]}], "kindString": "Interface"}, "desc": "输出", "name": "输出"}]}
      }
    ]
  }
]

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App graph={graph} nodes={nodes} flowId={1} />
  </React.StrictMode>
);
