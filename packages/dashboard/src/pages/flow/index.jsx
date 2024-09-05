import React, { useEffect, useState, useCallback, useRef } from "react";
import service from '../../config/dataSource';
import { useRequest } from '../../utils/request';
import { Message } from '@alifd/next';
import getParam from '../../utils/location';
import * as Editor from '@hset/xlang-editor';
import "./index.scss";

export default function App() {
  const editorRef = useRef(null);
  const [flowId, setFlowId] = useState(); 
  const [nodes = [], getNode] = useRequest(service.getNode);
  const [flow = {}, getFlow] = useRequest(service.getFlow);
  const [_flowSave, save, _loading, flowResponse] = useRequest(service.saveFlow);
  const [_, deploy] = useRequest(service.deployFlow);
  const [__, updateVersion] = useRequest(service.updateNodeVersion);
  const { graph } = flow;
  const { connections = [], nodeDeps = [] } = graph || {};
  const graphInfo = { connections, nodeList: nodeDeps };

  useEffect(() => {
    if (flowResponse.success) {
      Message.show({
        type: "success",
        content:
          "流程保存成功",
      });
      getFlow({ id: flowId });
    }
  }, [flowResponse.success, flowId])

  useEffect(() => {
    const id = getParam(window.location, 'id');
    if (!id) {
      Message.show({
        type: "error",
        content:
          "必须指定流程 id",
      });
      return;
    }
    setFlowId(id);
    getNode()
    getFlow({ id })
  }, [ ]);

  const deployFlow = useCallback(async function() {
    deploy({ flowId })
  }, [ flowId ]);
  const updateNodeVersion = useCallback(async function() {
    updateVersion({ flowId })
  }, [ flowId ]);
  const saveFlow = useCallback(async function(graphInfo) {
    const { connections, nodeList } = graphInfo;
    await save({
      flowId,
      connections,
      nodeDeps: nodeList
    });
  }, [ flowId ]);
  return (
    <div
      style={{
        width: "100%",
        height: "100%", 
        position: "absolute",
        top: "0",
        right: "0",
        left: "0",
        bottom: "0"
      }}
    >
        (
          <Editor
            refExpose={editorRef}
            flow_id={flowId}
            graphInfo={graphInfo}
            runtime_info={{online_status: 'offline'}}
            nodes={nodes}
            runHook={deployFlow}
            saveHook={saveFlow}
            headerConfig={{
              actions: [{
                name: '更新节点版本',
                clickEvent: updateNodeVersion,
              }, {
                name: '构建',
                clickEvent: deployFlow,
              }],
            }}
          />
        ) 
    </div>
  );
}