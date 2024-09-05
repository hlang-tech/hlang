import React from 'react';
import styled from 'styled-components';
import LoginCard from '../LoginCard';

const StyledHeader = styled('div')`
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: ${props => props.height}px;
  background-color: #000;
`;

export default class Header extends React.Component {
  componentDidMount() {
  }
  render() {
    console.log('window.USER_INFO', window.USER_INFO);
    const { style } = this.props;
    return (
      <StyledHeader height={style.height} >
        <LoginCard userInfo={window.USER_INFO} />
      </StyledHeader>
    );
  }
}
