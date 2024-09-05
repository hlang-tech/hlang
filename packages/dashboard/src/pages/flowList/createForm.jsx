import * as React from 'react';
import { Dialog, Form, Field, Input } from '@alifd/next';
import service from '../../config/dataSource';

const DialogForm = props => {
  const {
    dataSource = {},
    visible = true,
    onVisibleChange = () => { },
  } = props;

  const field = Field.useField({
    values: dataSource,
  });

  const submit = async () => {
    const { errors } = await field.validatePromise();
    if (errors && errors.length > 0) {
      return;
    }
    await service.createFlow(field.getValues());
    onVisibleChange(false);
  };

  const close = () => {
    onVisibleChange(false);
  };
  return (
    <Dialog
      visible={visible}
      title="新增流程"
      style={{ width: 720 }}
      onOk={submit}
      onCancel={close}
    >
      <Form field={field} fullWidth style={{ paddingLeft: 40, paddingRight: 40 }}>
        <Form.Item label="流程名称" required requiredMessage="请输入流程名称">
          <Input name="name" placeholder="请输入流程名称" />
        </Form.Item>
        <Form.Item label="流程编码" required requiredMessage="请输入流程编码">
          <Input name="code" placeholder="请输入流程编码" />
        </Form.Item>
        <Form.Item label="流程简介" requiredMessage="请输入流程简介">
          <Input.TextArea name="description" placeholder="请输入流程简介" />
        </Form.Item>        
      </Form>
    </Dialog>
  );
};

export default DialogForm;