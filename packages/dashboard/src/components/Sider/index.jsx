import React from 'react';
import { PageDialog, Form, Message, Loading } from '@alife/hippo';

import FlowItems from '../FlowItems';

import Service from '../../service/api';

import { GROUPING_ICON } from '../../model/const';

import { weakEqual } from '../../utils';

import {
  StyledSider,
  StyledSiderHeader,
  StyledSiderContainer,
} from './style';

const formItems = [{
  label: '场景名称',
  name: 'scene_name',
  component: 'input',
  required: true,
  requiredMessage: '请输入场景名称',
  placeholder: '请输入场景名称',
}, {
  label: '场景描述',
  name: 'scene_desc',
  component: 'input',
  required: true,
  requiredMessage: '请输入场景描述',
  placeholder: '请输入场景描述',
}, {
  label: 'Icon链接',
  name: 'iconUrl',
  component: 'input',
  required: true,
  requiredMessage: '请添加icon链接',
  placeholder: '请添加icon链接',
}];

export default class Sider extends React.Component {
  state = {
    sceneDialogVisible: false,
    sceneList: [],
    formLoading: false,
    formItemsValue: {
      scene_name: '',
      scene_desc: '',
      iconUrl: '',
    },
  }

  componentDidMount() {
    this.handleQuerySceneList();
  }

  handleGetId = () => {
    const { history: { location: { pathname } } } = this.props;
    return pathname.split('/scene/list/')[1];
  }

  // 查询场景
  handleQuerySceneList = () => {
    Service.querySceneList()
      .then(res => {
        this.setState({
          sceneList: res || [],
        });
        const routerId = this.handleGetId();
        if (res[0] && res[0].id && (!routerId || !res.some(item => weakEqual(item.id, routerId)))) {
          this.props.history.replace(`/scene/list/${res[0].id}`);
        }
      });
  }

  // 新增场景
  handleAddScene = ({ scene_name, scene_desc, iconUrl }) => {
    this.setState({
      formLoading: true,
    });
    Service.postScene({
      scene_name,
      scene_desc,
      // iconUrl,
      scene_config: {
        iconUrl,
      },
    })
      .then(() => {
        Message.success('新增成功!');
        this.setState({
          formLoading: false,
          sceneDialogVisible: false,
        }, () => {
          this.handleQuerySceneList();
        });
      }).catch(() => {
        Message.error('新增失败!');
        this.setState({
          formLoading: false,
        });
      });
  }

  handleCollapse = e => {
    const { onCollapse } = this.props;
    e.preventDefault();
    onCollapse();
  }

  handleOpenDialog = () => {
    this.setState({
      sceneDialogVisible: true,
    });
  }

  handleCloseDialog = () => {
    this.setState({
      sceneDialogVisible: false,
      formItemsValue: {},
    });
  }

  handleChangeInput = (name, value) => {
    const formItemsValue = { ...this.state.formItemsValue };
    formItemsValue[name] = value;
    this.setState({
      formItemsValue,
    });
  }

  formContentRef = content => {
    if (content) {
      this.formFields = content.field;
    } else {
      this.formFields = null;
    }
  }

  handleOk = () => {
    if (!this.formFields) return;
    this.formFields.validate((err, values) => {
      if (err) return;
      this.handleAddScene(values);
    });
  }

  RenderSceneDialog = () => {
    const { sceneDialogVisible, formItemsValue, formLoading } = this.state;
    return (
      <PageDialog
        title="新增场景"
        visible={sceneDialogVisible}
        onCancel={this.handleCloseDialog}
        onOk={this.handleOk}
        onClose={this.handleCloseDialog}
      >
        <Loading visible={formLoading} style={{ width: '100%' }}>
          <Form
            ref={this.formContentRef}
            onChange={(...args) => { this.handleChangeInput(...args); }}
            // onSubmit={values => { console.log('onSubmit:', values); this.handleAddScene(values); }}
            // onError={errors => console.error('onError:', errors)}
          >
            {
              formItems.map(item => (
                <Form.Item
                  key={item.name}
                  label={item.label}
                  name={item.name}
                  component={item.component}
                  required={item.required}
                  requiredMessage={item.requiredMessage}
                  placeholder={item.placeholder}
                  value={formItemsValue[item.name]}
                />
              ))
            }
          </Form>
        </Loading>
      </PageDialog>
    );
  }

  render() {
    const { relateStyle } = this.props;
    const { sceneList } = this.state;
    return (
      <StyledSider width={relateStyle.siderWidth}>
        <StyledSiderHeader
          height={relateStyle.headerHeight}
          onClick={this.handleCollapse}
        >
          <div>
            <img src={GROUPING_ICON} alt="grouping" />
          </div>
          <p>场景中心</p>
        </StyledSiderHeader>
        <StyledSiderContainer minusHeight={relateStyle.headerHeight}>
          <FlowItems
            sceneList={sceneList}
            history={this.props.history}
            addAction={this.handleOpenDialog}
          />
        </StyledSiderContainer>
        {this.RenderSceneDialog()}
      </StyledSider>
    );
  }
}
