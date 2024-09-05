import build from '@hlang-org/compiler';
import { ChildProcess, spawn } from 'child_process';

export default class PM {
  cps: Map<number, ChildProcess>;

  constructor() {
    this.cps = new Map();
  }

  async deploy(graph) {
    try {
      const { graphInfo, id } = graph;
      const { connections, nodeDeps } = graphInfo;
      const deployInfo = {
        connections,
        nodeList: nodeDeps
      }
      const config = {
        basePackageInfo: [
            {
                code: "Core",
                runtimeResource: "@hlang-core/runtime@latest"
            },
            {
                code: "_",
                runtimeResource: "lodash@latest"
            }
        ],
        dirName: `HLANG_BUILD`
      }
      const entry = await build({ graphInfo: deployInfo, id, options: config });
      return entry
    } catch (e) {
      console.log(e.message || e);
    }

  }
  
  async cloudBuild(graph) {
    try {
      const { graphInfo, id } = graph;
      const { connections, nodeDeps } = graphInfo;
      const deployInfo = {
        connections,
        nodeList: nodeDeps
      }
      const config = {
        basePackageInfo: [
            {
                code: "Core",
                runtimeResource: "@hlang-org/runtime@latest"
            },
            {
                code: "_",
                runtimeResource: "lodash@latest"
            }
        ],
        dirName: `ELANG_BUILD`
      }
      const entry = await build({ graphInfo: deployInfo, id, options: config });
      // const child = spawn(`node ${entry}`, { stdio: [null, null, null, 'ipc'] });
  
      // this.cps.set(id, child);
      return entry
    } catch (e) {
      console.log(e.message || e);
    }
  }

  call(flowId, payload) {
    if (!this.cps.has(flowId)) throw new Error(`流程不存在!`);

    const cp = this.cps.get(flowId);
    cp.send(JSON.stringify(payload));
  }
}