import styled from 'styled-components';
import { STYLE } from '../../constants';


const HeaderWrapper = styled.div`
  width: 100%;
  margin-left: 240px;
  background-color: rgb(34, 34, 34);
  height: 54px;
  position: fixed;
  padding: 10px;
  height: 50px;
  top: 0;
  left: 0;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
  z-index: 999;
  // overflow: hidden;
  .Logo {
    margin: 0;
    padding: 0;
    margin-left: 16px;
    display: flex;
    justify-content: center;
  }
  .Logo-Text {
    color: #ffffff;
    font-size: 16px;
    letter-spacing: 1px;
    line-height: 30px;
    font-weight: 600;
    margin: 0;
    padding: 0;
    margin-left: 10px;
  }
`;

const StatusTip = styled.div`
  color:${props => (props.value ? STYLE.STATUS_COLOR_MAP[props.value] : 'white')};
  font-size: 12px;
  height: 12px;
  padding: 0 12px 0 4px;
  display: flex;
  align-items: center;
  border-right: ${props => (props.value === 'deploying' ? 'none' : '1px solid #4e5d7a')};
  .status{
    margin: 8px;
    // box-shadow: #b0b0b0 0px 0px 10px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color:${props => (props.value ? STYLE.STATUS_COLOR_MAP[props.value] : 'white')};
  }
`;

const MenuContainer = styled.ul`
  width: 50%;
  display: flex;
  flex-direction: row;
  margin-left: 20px;
  padding: 0;
`;

const MenuItem = styled.li`
  width: 50px;
  height: 12px;
  display: flex;
  position: relative;
  justify-content: flex-end;
  align-items: center;
  font-size: 14px;
  color: #d5dff0;
  cursor: default;

  & > span {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 3px;
    user-select: none;

    &:hover {
      background-color: #3b4f75;
    }
  }

  &:first-child {
    border-left: 1px solid #d5dff0;
  }
`;

const SubMenuContainer = styled.ul`
  width: 120px;
  background-color: #2a3854;
  border-radius: 1px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 5px 0px rgba(0, 0, 0, 0.5);
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const SubMenuItems = styled.li`
  height: 30px;
  font-size: 14px;
  color: #ddd;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 15px;
  cursor: default;
  user-select: none;

  &:hover {
    background-color: #415782;
  }
`;

export default {
  HeaderWrapper,
  StatusTip,
  MenuContainer,
  MenuItem,
  SubMenuContainer,
  SubMenuItems,
};
