import React from 'react';

import Style from './style';

const {
  LoginCardWrapper,
} = Style;

class LoginCard extends React.Component {
  render() {
    const { userInfo: { name, workNumber } = {} } = this.props;

    return !name && !workNumber ? (
      <LoginCardWrapper>
        未登陆
      </LoginCardWrapper>
    ) : (
      <LoginCardWrapper>
        <div className="user-name">{ name }</div>
        <img
          className="login-img"
          src={`https://work.alibaba-inc.com/photo/${workNumber}.220x220.jpg`}
          onError="javascript:this.src='https://img.alicdn.com/tfs/TB1bT_TOuL2gK0jSZPhXXahvXXa-118-120.jpg'"
        />
      </LoginCardWrapper>
    );
  }
}

export default LoginCard;
