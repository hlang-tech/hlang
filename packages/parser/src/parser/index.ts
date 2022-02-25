import nunjucks = require('nunjucks');
import { ParamParser, ParamPattern } from '@hset/hit';
import { getEnv, Env, camelize } from '../utils';
import loadModule from '../module';

nunjucks.configure({ autoescape: false });
export interface IGraph {
  deps?: IPackageInfo[];
  connections: IConnections[];
  nodeList: INodeInfo[];
}
export interface IConnections {
  Input: {
    name: string;
    nodeId: string;
    portConfig: { [key: string]: any };
    type: string;
  };
  Output: {
    name: string;
    nodeId: string;
    portConfig: { [key: string]: any };
    type: string;
  };
}
export interface INodeInfo {
  id: string;
  name: string;
  type: string;
  group: string;
  bizData: { [key: string]: any };
  metaData: {
    portConf: { [key: string]: any };
    attrAsset: {
      markdownHref: string;
      scriptHref: string;
      styleHref: string;
    };
    npmInfo: IPackageInfo
  };
}
export interface IPackageInfo {
  name: string;
  version: string;
  local: boolean;
}
export interface IConfig {
  debugMode: boolean;
  env: Env;
  middleware: string[];
}

const paramParser = (new ParamParser()).getParser(ParamPattern.MUSTACHE);

const constants = `
  const IPC_COMMANDS = {
    MIDDEWARE_CALL: 'middleware_call',
    EXIT: 'exit'
  };

  const PROCESS_STATUS = {
      RUNING: 'running',
      ERROR: 'error',
  }

  const IPC_SIGNAL = {
    CLOSE: 'close',
    MIDDEWARE_CALLBACK: 'middleware_callback',
    Trigger: 'trigger'
  }
`;

const IPCTemplate = `
    const triggerQueue = new Map();
    const middlewareIPCQueue = new Map();
    {% if env === "BROWSER" %}
    const send = (messageType, payload = {}) => {
        postMessage({
            type: messageType,
            message: JSON.stringify(payload)
        })
    };
    {% elif env === "NODE" %}
    const processs = require('process');
    const send = (messageType, payload = {}) => {
      processs.send && processs.send({
            type: messageType,
            message: JSON.stringify(payload)
        })
    };
    {% endif %}


    const middleware = {
        {% for name in middleware %}
        {{name}}: middlewareCall('{{name}}'),
        {% endfor %}
        metaqSubscribe: function(params, callback) {
            const { topic } = params;

            triggerQueue.set(topic, callback)
        },
        logger: console.log
    };
    const middlewareCall = mw => (...arg) => {
        const messageId = mw + _.uniqueId();

        const promise = new Promise((resolve, reject) => {
          send(IPC_COMMANDS.MIDDEWARE_CALL, {
            flowId: {{flowId}},
            middlewareName: mw,
            arg,
            messageId
          })
          middlewareIPCQueue.set(messageId, {resolve,reject})
        })
        return promise;
    }
    {% if env === "BROWSER" %}
    onmessage = function(data) {
        const { id, message, type, error, topic } = data;
        console.log('Message received from main script', data);
        let parsed;

        try {
            parsed = JSON.parse(message);
        } catch (e) {
            parsed = message;
        }

        switch (type) {
            case IPC_SIGNAL.MIDDEWARE_CALLBACK:
                if (!middlewareIPCQueue.has(id)) console.warn('MIDDEWARE_CALLBACK recall occur error', msg);
                const { resolve, reject } = middlewareCaller.get(callToken);
                if (error) reject(error);
                resolve(parsed)
                middlewareIPCQueue.delete(id);
                break;
            case IPC_SIGNAL.Trigger:
                const { topic } = data;
                const invokeCallback = triggerQueue.get(topic);
                invokeCallback && invokeCallback(parsed);
                break;
            case IPC_SIGNAL.CLOSE:
                triggerQueue.forEach((_, key)=>{
                    triggerQueue.delete(key);
                });
                middlewareIPCQueue.forEach((_, key) => {
                    middlewareIPCQueue.delete(key);
                });
                send(IPC_COMMANDS.EXIT);
                self.close();
                break;

        }
    }
    {% elif env === "NODE" %}
    process.on("message", function(e) {
        const { id, message, type, error, topic } = data;
        console.log('Message received from main script', data);
        let parsed;

        try {
            parsed = JSON.parse(message);
        } catch (e) {
            parsed = message;
        }

        switch (type) {
            case IPC_SIGNAL.MIDDEWARE_CALLBACK:
                if (!middlewareIPCQueue.has(id)) console.warn('MIDDEWARE_CALLBACK recall occur error', msg);
                const { resolve, reject } = middlewareCaller.get(callToken);
                if (error) reject(error);
                resolve(parsed)
                middlewareIPCQueue.delete(id);
                break;
            case IPC_SIGNAL.Trigger:
                const { topic } = data;
                const invokeCallback = triggerQueue.get(topic);
                invokeCallback && invokeCallback(parsed);
                break;
            case IPC_SIGNAL.CLOSE:
                triggerQueue.forEach((_, key)=>{
                    triggerQueue.delete(key);
                });
                middlewareIPCQueue.forEach((_, key) => {
                    middlewareIPCQueue.delete(key);
                });
                send(IPC_COMMANDS.EXIT);
                self.close();
                break;

        }
    })
    {% endif %}


`;

const flowRunTemplate = `
    const run = () => {
        middleware.logger('forked chil process run')

        try{
            const { logger } = middleware;
            const { Flow } = Core;


            const flow = new Flow({});


            const nodeMap = {};

            {% for node in nodeList %}
            const {{node.nodeId}}_bizData = {{node.bizData}};
            const {{node.nodeId}} = new {{node.id}}({
                nodeId: "{{node.nodeId}}",
                flowId: {{flowId}},
                env: 'prod',
                middleware,
                config: {{node.nodeId}}_bizData
            });
            nodeMap.{{node.nodeId}} = {{node.nodeId}};
            {% endfor %}

            {% for connection in connections %}
            {{connection.Output.nodeId}}.O("{{connection.Output.portConf.id}}").connect({{connection.Input.nodeId}}.I("{{connection.Input.portConf.id}}"));
            {% endfor %}

            {% for read in ReadableNodes %}
                flow.run({{read.nodeId}});
            {% endfor %}
            send(PROCESS_STATUS.RUNNING)

        } catch(e) {
            middleware.logger('frun occur error',e.message,e.stack)
            send(PROCESS_STATUS.ERROR,{
                message: e.toString()
            })
            throw e;
        }
    }

    run();
`;

const template = `
    {{ loadModuleCode }}
    {{ constants }}
    {{ IPCCode }}

    {{ flowRunCode }}
`;
const generateRuntimeCode = (graphInfo, flowId, config: IConfig) => {
  const { deps, connections, nodeList } = graphInfo;
  const { env = Env.NODE, middleware = [] } = config || {};

  const parsedNodeList = nodeList.map(node => {
    const { nodeId, id, bizData = {} } = node;
    const { params = {} } = bizData;

    let paramsStr = JSON.stringify(params);
    if (new RegExp(/\{\{(FLOW_ENV\.[a-zA-Z0-9|._]+)\}\}/g).test(paramsStr)) {
      paramsStr = paramParser(paramsStr, graphInfo);
    }
    return {
      ...node,
      nodeId: camelize(nodeId),
      id: camelize(id),
      bizData: JSON.stringify({
        flowId: flowId,
        ...bizData,
        params: JSON.parse(paramsStr),
      }),
    };
  });
  const ReadableNodes = parsedNodeList.filter(node => node.type === 'R');

  if (ReadableNodes.length === 0) {
    throw new Error('ReadableNodes not allow empty');
  }
  const parsedConnections = connections.map(connection => {
    const { Input, Output } = connection;

    return {
      Input: {
        ...Input,
        nodeId: camelize(Input.nodeId),
      },
      Output: {
        ...Output,
        nodeId: camelize(Output.nodeId),
      },
    };
  });
  const loadModuleCode = loadModule(deps, env);
  const IPCCode = nunjucks.renderString(
    IPCTemplate,
    { middleware: middleware, flowId: flowId, env: env },
  );
  const flowRunCode = nunjucks.renderString(
    flowRunTemplate,
    {
      flowId: flowId, nodeList: parsedNodeList,
      connections: parsedConnections, ReadableNodes: ReadableNodes, env: env,
    });

  return nunjucks.renderString(template, {
    loadModuleCode: loadModuleCode,
    constants: constants, IPCCode: IPCCode, flowRunCode: flowRunCode,
  });
};

export default function (graphInfo: IGraph, flowId, opsConfig) {
  const env = getEnv();
  const { basePackageInfo = [] } = opsConfig;
  const { nodeList = [] } = graphInfo;
  const deps: IPackageInfo[] = [...nodeList, ...basePackageInfo]
    .reduce((ret: IPackageInfo[], el) => {
      const { metaData, id } = el;
      const { npmInfo = {}, cdnInfo = {} } = metaData;
      const { name, version, local } = npmInfo;
      const { url, version: cdnVersion } = cdnInfo;
      const packageInfo = env === Env.BROWSER ? {
        name: url,
        id: camelize(id),
        version: cdnVersion,
      } : {
        id: camelize(id),
        name: name,
        version: version,
        local: local,
      };
      const exist = ret.find(item => item.name === packageInfo.name);
      if (!exist) {
        return [
          ...ret,
          packageInfo,
        ];
      }
      return ret;
    },      []);
  graphInfo.deps = deps;

  return {
    target: generateRuntimeCode(graphInfo, flowId, { ...opsConfig, debugMode: false, env: env }),
    deps: deps.filter((el: IPackageInfo) => !el.local),
  };
}
