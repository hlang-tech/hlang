import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Pagination, Divider, ResponsiveGrid, Button, Box, Form, Input, Select, Icon, Loading } from '@alifd/next';
import CreateForm from './createForm';
import { useRequest } from '../../utils/request';
import service from '../../config/dataSource';
import styles from './index.module.scss';

const { Cell } = ResponsiveGrid;
const { Option } = Select;
const FormItem = Form.Item;

const tableColumn = [
  {
    title: '流程编码',
    key: 'code'
  },
  {
    title: '流程名称',
    key: 'name'
  },
  {
    title: '流程描述',
    key: 'description'
  },
  {
    title: '创建时间',
    key: 'gmtCreate'
  },
  {
    title: '修改时间',
    key: 'gmtModified'
  }
]

const TableList = props => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate(true);
  const [flowList, getFlowList, loading] = useRequest(service.getFlowList);

  useEffect(() => {
    getFlowList();
  }, []);

  const onOperation = () => {
    getFlowList();
  };

  const onPaginationChange = () => {
    getFlowList();
  };
  const goToEdit = (id) => {
    navigate(`#/flow?id=${id}`);
  }

  return (
    <>
      <Card free>
        <Card.Content>
          <Box padding={10}>
            <Form responsive fullWidth labelAlign="top">
              <FormItem colSpan={3} label="流程名称">
                <Input
                  placeholder="输入需求名称/编号进行搜索"
                  innerAfter={<Icon type="search" size="xs" className={styles.searchIcon} />}
                />
              </FormItem>
              <FormItem colSpan={3} label="需求方">
                <Input placeholder="输入需求方进行搜索" />
              </FormItem>
              <Cell colSpan={3} className={styles.btns}>
                <Box
                  spacing={8}
                  direction="row"
                  align="flex-end"
                  justify="center"
                  style={{ height: '100%' }}
                >
                  <Button type="primary" onClick={onOperation}>
                    查询
                  </Button>
                  <Form.Reset>重置</Form.Reset>
                </Box>
              </Cell>
            </Form>
          </Box>
          <Divider dashed />
          <div className={styles.main}>
            <Loading visible={loading} style={{ display: 'block' }}>
              <div className={styles.mainAdd}>
                <Button type="primary" onClick={() => setVisible(true)}>新增</Button>
              </div>
              <Table
                hasBorder={false}
                className={styles.table}
                dataSource={flowList}
                rowSelection={{ columnProps: () => ({ lock: 'left' }) }}
              >
                {tableColumn.map((col) => (
                  <Table.Column title={col.title} dataIndex={col.key} key={col.key} />
                ))}
                <Table.Column
                  title="操作"
                  cell={(_, _i, row) => (
                    <div className={styles.opt}>
                      <Button type="primary" onClick={() => goToEdit(row.id)} text>
                        编排
                      </Button>
                    </div>
                  )}
                />
              </Table>
              <Box margin={[15, 0, 0, 0]} direction="row" align="center" justify="space-between">
                <div className={styles.total}>
                  共<span>200</span>条需求
                </div>
                <Pagination onChange={onPaginationChange} />
              </Box>
            </Loading>
          </div>
          <CreateForm visible={visible} onVisibleChange={() => setVisible(false)} />
        </Card.Content>
      </Card>
    </>
  );
};

export default TableList;