import React, { MouseEventHandler, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { INodeGroup } from '../../App.tsx';
import FunctionIcon from '../node/FunctionIcon.tsx';
import Node from './node.tsx';
import Style from './style.ts';

const {
  NodePanelWrapper,
  ToggleIconWrapper,
  RotateTriangle,
} = Style;



const ToggleIcon = ({ visible, setVisible }: { visible: any, setVisible: MouseEventHandler<HTMLDivElement> }) => {
  return (
    <ToggleIconWrapper
      onClick={setVisible}
    >
      <div className="uptriangle" />
      <div className="centerrect">
        <RotateTriangle visible={visible} />
      </div>
      <div className="lowtriangle" />
    </ToggleIconWrapper>
  );
};

function NodePanel(props: { nodes: INodeGroup[] }) {
  const { nodes } = props;
  const { addNodes } = useReactFlow();
  const [visible, setVisible] = useState(true);
  const handleDrag = (params, e) => {
    const rect = window.document.querySelector('.react-flow').getBoundingClientRect();
    const { clientX, clientY } = e;


    const valid = clientX < (rect.x + rect.width) && clientY < (rect.y + rect.height) && clientX > rect.x && clientY > rect.y;

    const position = {
      x: clientX - 240,
      y: clientY,
    };

    if (valid) {
      addNodes({
        id: new Date().getTime().toString(),
        type: 'turbo',
        position,
        data: { icon: <FunctionIcon />, title: 'bundle', subline: 'apiContents' },
      })
    }
  };

  const genNodes = (nodeList: INodeGroup[]) => {
    return nodeList.filter(el => el.children.length > 0).map(el => {
      const { name, children = [] } = el;
      return (
        <div key={name} className='group'>
          <div className='group-title'>{name}</div>

          <div>
            {children.map(node => {
              const { name, type, code } = node;

              return <Node
                key={code}
                name={name}
                type={type}
                onDragEnd={handleDrag.bind(this, node)}
              />;
            })}
          </div>
        </div>
      )
    });
  };

  return (
    <NodePanelWrapper visible={visible}>
      <div className="nodeLists">
        <p className="nodeTitle">节点</p>
        {genNodes(nodes)}
      </div>
      <ToggleIcon
        visible={visible}
        setVisible={() => { setVisible(!visible); }}
      />
    </NodePanelWrapper>
  );
}

export default NodePanel;
