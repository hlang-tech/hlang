import styled from 'styled-components';

const AttributePanelWrapper = styled.div`
  position: absolute;
  right: -${(props) => props.width || 348}px;
  top: 0;
  width: ${(props) => props.width || 348}px;
  height: 100%;
  flex: 1;
  background: #222b3d;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s linear;
  transform: translate(-${props => (props.visible ? props.width || 348 : 0)}px, 0);
`;

const Content = styled.div`
  width: 100%;
  height: 100%;
  flex: 1;
`;

const Title = styled.div`
  width: 100%;
  padding: 12px;
  background: #222B3D;
  color: #fff;
`;

export default {
  AttributePanelWrapper,
  Content,
  Title
};
