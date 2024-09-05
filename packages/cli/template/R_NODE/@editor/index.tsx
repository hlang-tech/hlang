import React from 'react';
import { message } from 'antd';
import { ProForm, ProFormText, FooterToolbar, PageContainer } from '@ant-design/pro-components';
import './index.scss';

export default function () {
  return (
    <PageContainer>
      <ProForm<{
        name: string;
        company?: string;
        useMode?: string;
      }>
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 14 }}
        layout={{
          labelCol: { span: 4 },
          wrapperCol: { span: 14 },
        }}
        onFinish={async (values) => {
          console.log(values);
          message.success('提交成功');
        }}
        params={{}}
        submitter={{
          render: (_, dom) => <FooterToolbar>{dom}</FooterToolbar>,
        }}
        request={async () => {
          return {
            name: '蚂蚁设计有限公司',
            useMode: 'chapter',
          };
        }}
      >
        <ProFormText
          width="md"
          name="name"
          label="签约客户名称"
          tooltip="最长为 24 位"
          placeholder="请输入名称"
        />
        <ProFormText
          width="md"
          name="company"
          label="我方公司名称"
          placeholder="请输入名称"
        />
        <ProFormText
          name={['contract', 'name']}
          width="md"
          label="合同名称"
          placeholder="请输入名称"
        />
      </ProForm>
    </PageContainer>
    );
}

