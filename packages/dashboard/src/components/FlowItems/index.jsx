import React from 'react';

import { withRouter } from 'react-router-dom';

import { weakEqual } from '../../utils';

import { ADD_ICON } from '../../model/const';

import {
  StyledFlowList,
} from './style';

class FlowItems extends React.Component {
  componentDidMount() {
  }

  handleToList = id => {
    this.props.history.push(`/scene/list/${id}`);
  }

  render() {
    const { sceneList } = this.props;

    console.log('natureless', 'sceneList', sceneList);

    const urlSplit = window.location.href.split('/');
    const urlLatest = urlSplit[urlSplit.length - 1];
    return (
      <StyledFlowList>
        {
          sceneList.map(item => (
            <li
              key={item.id}
              onClick={() => { this.handleToList(item.id); }}
              style={{ backgroundColor: weakEqual(urlLatest, item.id) ? 'rgba(255, 255, 255, 0.1)' : '' }}
            >
              <div>
                <img src={item.scene_config.iconUrl} alt="item.name" />
              </div>
              <p>{item.scene_name}</p>
            </li>
          ))
        }
        <li
          onClick={this.props.addAction}
        >
          <div>
            <img src={ADD_ICON} alt="item.name" />
          </div>
          <p>新增场景</p>
        </li>
      </StyledFlowList>
    );
  }
}

export default withRouter(FlowItems);
