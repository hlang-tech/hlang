import styled from 'styled-components';

export const StyledSider = styled('div')`
  width: ${props => props.width}px;
  height: 100vh;
  background-color: #11151f;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 9;
  overflow: hidden;
  transition: width 0.3s ease-in-out;
`;

export const StyledSiderHeader = styled('title')`
  width: 110px;
  height: ${props => props.height}px;
  display: flex;
  cursor: pointer;

  & > div {
    width: 16px;
    height: 16px;
    margin: auto auto auto 10px;
    display: flex;

    & > img {
      width: 100%;
      margin: auto;
    }
  }

  & > p {
    margin: auto auto auto 10px;
    width: 100%;
    color: #fff;
  }
`;

export const StyledSiderContainer = styled.div`
  width: 100%;
  overflow: auto;
  height: calc(100vh - ${props => props.minusHeight}px);
`;
