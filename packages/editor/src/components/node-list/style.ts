// import { Grid } from '@material-ui/core';
import styled from 'styled-components';

const NodePanelWrapper = styled.div`
  background-color: rgb(51, 51, 51);
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  width: 240px;
  z-index: 1;
  transition: transform 0.3s linear;
  transform: translate(${props => (props.visible ? 0 : '-220px')}, 0);

  & > div.nodeLists {
    position: relative;
    left: 0;
    top: 0;
    height: 100%;
    padding: 0 20px 48px 20px;
    overflow: auto;
  }

  p.nodeTitle {
    height: 54px;
    font-size: 18px;
    color: #f2f2f2;
    font-weight: 500;
    margin: 0;
    line-height: 54px;
  }

  .group {
    width: 100%;
    border-radius: 4px;
    overflow: hidden;
    cursor: grab;
    margin-bottom: 10px;
  }

  .group-title {
    color: #bcc8e0;
    font-size: 14px;
    line-height: 14px;
    letter-spacing: 1px;
    font-weight: 300;
    margin-bottom: 12px;
    text-align: left;
  }

`;

const ToggleIconWrapper = styled.div`
  position: absolute;
  left: 240px;
  top: 50%;
  width: 16px;
  height: 100px;
  margin-top: -50px;
  cursor: pointer;

  & > div {
    position: relative;
    left: 0;

    &.uptriangle {
      border-top: 8px solid transparent;
      border-right: 8px solid transparent;
      border-left: 8px solid #222b3d;
      border-bottom: 8px solid #222b3d;
    }

    &.centerrect {
      height: 68px;
      background-color: #222b3d;
      display: flex;
    }

    &.lowtriangle {
      border-top: 8px solid #222b3d;
      border-right: 8px solid transparent;
      border-left: 8px solid #222b3d;
      border-bottom: 8px solid transparent;
    }
  }
`;

const RotateTriangle = styled.div`
  border: 8px solid transparent;
  border-right: ${props => (props.visible ? '8px solid #808fad' : 'none')};
  border-left: ${props => (props.visible ? 'none' : '8px solid #808fad')};
  margin: auto 0 auto;
  transition: all 0.3s;
`;

export default {
  NodePanelWrapper,
  ToggleIconWrapper,
  RotateTriangle,
};
