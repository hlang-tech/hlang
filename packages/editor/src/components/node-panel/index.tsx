import React, { useState, useEffect, useCallback } from 'react';
import ReactDom from 'react-dom';
import { importScript, importStyle } from 'runtime-import';
import { INodeInstance } from '../../App';
import { message } from 'antd';
import {
  Node,
} from '@xyflow/react';
import Style from './style';

const { AttributePanelWrapper, Content } = Style;

const loadCache = {};

const ATTR_PANEL_ID = 'spider-attribute-panel';


const loadSource = async(id, { scriptHref, styleHref }) => {
  if (!loadCache[id]) {
    await importStyle(styleHref);
    const script = await importScript(scriptHref);
    loadCache[id] = { script };
  }
};

export interface INodePanelProps {
  currentNode: Node;
  nodeList: Partial<INodeInstance>[];
  setLoading: (_: any) => void;
  flow_id: number;
}
function NodePanel(props: INodePanelProps) {
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const {
    currentNode,
    nodeList,
    setLoading
  } = props;

  const setAttributeConfig = ({ width: _width }) => {
    _width && setWidth(_width);
  };
  // const saveAttr = useCallback((attr) => {
  //   const { connections, nodeList } = state;
  //   const { nodeId } = target;

  //   const bizData = {
  //     nodeId,
  //     flowId: props.flow_id,
  //     params: attr
  //   };

  //   const result = nodeList.map((item) => {
  //     if (item.nodeId === nodeId) {
  //       item.bizData = bizData;
  //     }
  //     return item;
  //   });
  //   // dispatch({ type: graphAction.REFRESH, payload: {
  //   //   connections,
  //   //   nodeList: result
  //   // }});
  // }, [ state, dispatch ]);

  // const modifyPort = useCallback((portConf) => {
  //   const { connections, nodeList } = state;

  //   const { nodeId } = target;

  //   const result = nodeList.map((item) => {
  //     if (item.nodeId === nodeId) {
  //       if (!item.customMetaData) item.customMetaData = {};
  //       item.customMetaData.portConf = portConf;
  //     }
  //     return item;
  //   });

  //   // dispatch({ type: graphAction.REFRESH, payload: {
  //   //   connections,
  //   //   nodeList: result
  //   // }});

  //   message.success('Port变更完成!');
  // }, [ dispatch, state ]);

  const preLoadScriptSource = (node_dependencies) => {
    if (!node_dependencies.length) return;
    setLoading({
      visible: true,
      tip: '加载节点资源中'
    });

    Promise.all(node_dependencies.map((dependence) => new Promise((res) => {
      const { editorResource, code } = dependence;
      editorResource && loadSource(code, editorResource).then(() => res());
    }))).then(() => {
      setLoading({
        visible: false,
        tip: '加载节点资源完成',
      });
    });
  };


  useEffect(() => {
    const loadAttrPanel = async () => {
      if (!currentNode) {
        setVisible(false);
        return;
      }
      setVisible(true);
      const { editorResource, portInfo, bizData, code } = currentNode.data;

      if (!loadCache[code]) {
        await loadSource(code, editorResource);
      }

      const mountNode = window.document.getElementById(ATTR_PANEL_ID);

      ReactDom.render(<div />, mountNode, () => {
        setAttributeConfig({ width: 500 });
        loadCache[code].script({
          Elang: {
            Editor: {
              // save: saveAttr,
              utils: {
                // modifyPort,
              },
              bizData,
              metaData: portInfo,
              flowId: props.flow_id,
              env: 'production',
              setAttributeConfig
            }
          },
          mountNode
        });
      });
    };

    loadAttrPanel();
  }, [
    currentNode.id,
  ]);

  useEffect(() => {
    preLoadScriptSource(nodeList);
  }, [nodeList.length]);

  return (
    <AttributePanelWrapper visible={visible} width={width}>
      {/* <Title>
        {type === 'node' ? '节点属性编辑' : '节点连接属性'}
      </Title> */}
      <Content id={ATTR_PANEL_ID} />
    </AttributePanelWrapper>
  );
}


export default NodePanel;
