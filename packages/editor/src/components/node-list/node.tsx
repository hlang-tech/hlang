import React from 'react';
import styled from 'styled-components';
import { NodeType } from '../../App';

const FlowNodeWrapper = styled.div`
  width: 100%;
  height: 30px;
  background-color: #2f3c52;

  box-shadow: 0 1px 1px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  flex-direction: row;
  position: relative;
  border-radius: 2px;
  overflow: hidden;

  overflow: hidden;
  .node-name {
    padding: 14px;
    padding-left: 14px;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 14px;
    line-height: 14px;
    font-weight: 500;
    letter-spacing: 1px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 180px;
  }

  .node-color {
    height: 100%;
    width: 4px;
    position: absolute;
    left: 0;
    top: 0;
  }

  .node-type {
    position: absolute;
    right: 0px;
    top: 0;
    width: 30px;
    height: 100%;
    font-size: 15px;
    line-height: 30px;
    font-weight: 500;
    text-align: center;
    color: #838fab;
  }
`;

const COLOR_MAP = {
  T: '#d65656',
  W: '#407de6',
  R: '#44b38e'
};

export interface IFlowNode {
  name: string;
  type: NodeType;
  onDragEnd: any; 
}
function FlowNode(props: IFlowNode) {
  const { name, type, onDragEnd } = props;
  return (
    <FlowNodeWrapper draggable="true" onDragEnd={onDragEnd}>
      <div className='node-color' style={{
        backgroundColor: COLOR_MAP[type]
      }} />
      <div className='node-name' title={name}>{name}</div>
      <div className='node-type'>{type}</div>
    </FlowNodeWrapper>
  );
}

export default FlowNode;
