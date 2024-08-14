import nunjucks = require("nunjucks");
import { ParamParser, ParamPattern } from "@hset/hit";
import { getEnv, Env, camelize } from "../utils";
import getTemplate from "../template";
import loadModule from "../module";

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
  code: string;
  name: string;
  type: string;
  group: string;
  bizData: { [key: string]: any };
  portInfo: {
    Input: { [key: string]: any };
    Output: { [key: string]: any };
  };
  runtimeResource: string;
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

const paramParser = new ParamParser().getParser(ParamPattern.MUSTACHE);

const template = `
  {{ initModuleCode }}
  init()
  .then((_xlang_middleware) => {
    {{ loadModuleCode }}
    {{ IPCCode }}
    {{ flowRunCode }}
  })
`;
const generateRuntimeCode = (graphInfo, flowId, config: IConfig) => {
  const { deps, connections, nodeList } = graphInfo;
  const { env = Env.NODE, middleware = [] } = config || {};

  const parsedNodeList = nodeList.map((node) => {
    const { nodeId, code, bizData = {} } = node;
    const { params = {} } = bizData;

    let paramsStr = JSON.stringify(params);
    if (new RegExp(/\{\{(FLOW_ENV\.[a-zA-Z0-9|._]+)\}\}/g).test(paramsStr)) {
      paramsStr = paramParser(paramsStr, graphInfo);
    }
    return {
      ...node,
      nodeId: camelize(nodeId),
      id: camelize(code),
      bizData: JSON.stringify({
        flowId: flowId,
        ...bizData,
        params: JSON.parse(paramsStr),
      }),
    };
  });
  const ReadableNodes = parsedNodeList.filter((node) => node.type === "R");

  if (ReadableNodes.length === 0) {
    throw new Error("ReadableNodes not allow empty");
  }
  const parsedConnections = connections.map((connection) => {
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
  const { IPCTemplate, RuntimeTemplate, InitTemplate } = getTemplate(env);
  const initModuleCode = nunjucks.renderString(InitTemplate, {
    middleware: middleware,
    flowId: flowId,
    env: env,
  });
  const IPCCode = nunjucks.renderString(IPCTemplate, {
    middleware: middleware,
    flowId: flowId,
    env: env,
  });
  const flowRunCode = nunjucks.renderString(RuntimeTemplate, {
    flowId: flowId,
    nodeList: parsedNodeList,
    connections: parsedConnections,
    ReadableNodes: ReadableNodes,
    env,
  });

  return nunjucks.renderString(template, {
    loadModuleCode: loadModuleCode,
    IPCCode: IPCCode,
    flowRunCode: flowRunCode,
    initModuleCode,
  });
};

export default function (graphInfo: IGraph, flowId, opsConfig) {
  const env = getEnv();
  const { basePackageInfo = [] } = opsConfig;
  const { nodeList = [] } = graphInfo;
  const deps: IPackageInfo[] = [...nodeList, ...basePackageInfo].reduce(
    (ret: IPackageInfo[], el) => {
      const { runtimeResource, code, local } = el;

      const match = runtimeResource.match(/(.+?)@(\d+\.\d+\.\d+|latest)/) || [];
      const [_, name, version] = match;
      const packageInfo =
        env === Env.BROWSER
          ? {
              name: name,
              id: camelize(code),
              version,
            }
          : {
              id: camelize(code),
              name: name,
              version: version,
              local: local,
            };
      const exist = ret.find((item) => item.name === packageInfo.name);
      if (!exist) {
        return [...ret, packageInfo];
      }
      return ret;
    },
    []
  );
  graphInfo.deps = deps;

  return {
    target: generateRuntimeCode(graphInfo, flowId, {
      ...opsConfig,
      debugMode: false,
      env: env,
    }),
    deps: deps.filter((el: IPackageInfo) => !el.local),
  };
}
