import { Col, Row, Button } from 'antd';
import Style from './style';

const {
  HeaderWrapper,
} = Style;

export interface INavProps {
  onSave: any;
  onPublish: any;
}

function Header(props: INavProps) {
  const { onSave, onPublish } = props;


  return (
    <HeaderWrapper className="Header">
      <Row>
        <Col span={8}>
          <h3 className="Logo-Text">Hlang</h3>
        </Col>
        <Col span={8} offset={8}>
          <Button onClick={onSave} style={{ marginLeft: '9px', marginRight: '9px' }}>保存</Button>
          <Button color="primary" onClick={onPublish} style={{ marginLeft: '9px', marginRight: '9px' }}>保存并部署</Button>
        </Col>
      </Row>
    </HeaderWrapper>
  );
}

export default Header;
