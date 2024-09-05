import styled from 'styled-components';
import { Style } from '@alife/deadpool';

const {
  RowFlex,
} = Style;

const LoginCardWrapper = styled(RowFlex)`
  position: relative;
  padding: 0px 12px;
  align-items: center;
  height: 100%;
  justify-content: flex-end;

  .login-img{
    width: 40px;
    border-radius: 50%;
  }
  &:before{
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    bottom: auto;
    right: auto;
    height: 12px;
    width: 1px;
    transform: translate(0%, -50%);
    background-color: #4e5d7a;
  }
  .user-name{
    margin-right: 12px;
  }
`;

export default {
  LoginCardWrapper,
};
