import React from 'react';
import { message } from 'antd';
import { ProFormDigit, ProForm, FooterToolbar, PageContainer } from '@ant-design/pro-components';
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
            answer: "",
          };
        }}
      >
        <ProFormDigit
          width="md"
          name="answer"
          disabled
          label="答案"
          tooltip=""
          placeholder="请输入答案"
        />
      </ProForm>
    </PageContainer>
    );
}

