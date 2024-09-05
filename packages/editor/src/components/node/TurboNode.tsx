import React, { memo, ReactNode } from 'react';
import { Handle, NodeProps, Position, Node } from '@xyflow/react';
import { FiCloud } from 'react-icons/fi';
import { PortInfo } from '../../App';

export type TurboNodeData = {
  title: string;
  icon?: ReactNode;
  description?: string;
  ports: PortInfo;
};

export default memo(({ data }: NodeProps<Node<TurboNodeData>>) => {
  const { ports } = data;
  const { Input = [], Output = [] } = ports
  

  return (
    <>
      <div className="cloud gradient">
        <div>
          <FiCloud />
        </div>
      </div>
      <div className="wrapper gradient">
        <div className="inner">
          <div className="body">
            {data.icon && <div className="icon">{data.icon}</div>}
            <div>
              <div className="title">{data.title}</div>
              {data.description && <div className="subline">{data.description}</div>}
            </div>
          </div>
          {
            Input.map(el => (
              <Handle type="target" position={Position.Left} id={el.id}>{el.name}</Handle>
            ))
          }
          {
            Output.map(el => (
              <Handle type="source" position={Position.Right} id={el.id}>{el.name}</Handle>
            ))
          }
        </div>
      </div>
    </>
  );
});
