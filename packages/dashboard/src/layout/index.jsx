import React from 'react';
import { Switch, Route } from 'react-router-dom';

import List from '../pages/flowList';
import Header from '../components/Header';
import Sider from '../omponents/Sider';

const contentStyle = {
  margin: '10px 10px 0 340px',
  backgroundColor: '#fff',
  display: 'block',
  borderRadius: '4px',
  position: 'relative',
  transition: 'margin-left 0.3s ease-in-out',
  padding: '15px',
  boxSizing: 'border-box',
};

class BasicLayout extends React.Component {
  state = {
    headerStyle: { height: 50 },
    siderStyle: { width: 330 },
  };
  componentDidMount() {
    this.handleInitCollapse();
  }

  handleInitCollapse = () => {
    const collapsed = localStorage.getItem('collapsed');
    if (collapsed) {
      this.setState({
        siderStyle: { width: 110 },
      });
    }
  }

  handleCollapse = () => {
    if (this.state.siderStyle.width === 330) {
      localStorage.setItem('collapsed', 1);
    } else {
      localStorage.removeItem('collapsed');
    }
    this.setState({
      siderStyle: {
        width: this.state.siderStyle.width === 330 ? 110 : 330,
      },
    });
  }

  ListContent = props => {
    return (
      <List
        {...props}
      />
    );
  }

  render() {
    const { headerStyle, siderStyle } = this.state;
    return (
      <React.Fragment>
        <Header style={headerStyle} />
        <Sider
          relateStyle={{ headerHeight: headerStyle.height, siderWidth: siderStyle.width }}
          onCollapse={this.handleCollapse}
          history={this.props.history}
        />
        <content
          style={{
            ...contentStyle,
            marginLeft: `${siderStyle.width + 10}px`,
            top: `${headerStyle.height}px`,
            minHeight: `calc(100vh - ${headerStyle.height + 20}px)`,
          }}
        >
          <Switch>
            <Route path={`${this.props.match.path}/list/:id`} component={this.ListContent} />
          </Switch>
        </content>
      </React.Fragment>
    );
  }
}

export default BasicLayout;
