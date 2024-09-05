import styled from 'styled-components';

export const StyledFlowList = styled.ul`
display: flex;
justify-content: flex-start;
width: 100%;
flex-wrap: wrap;
transition: all 0.3s ease-in-out;

& > li {
  width: 110px;
  height: 110px;
  // margin: auto;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  & > div {
    width: 48px;
    height: 48px;
    margin: 10px auto 5px auto;

    & > img {
      max-wdith: 48px;
      max-height: 48px;
    }
  }

  & > p {
    color: #ddd;
    margin: 5px auto 10px auto;
    font-size: 12px;
  }
}
`;
