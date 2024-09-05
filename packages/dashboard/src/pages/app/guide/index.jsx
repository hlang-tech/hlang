import React from 'react';
import { MyIcons } from '../js/page';
import './index.scss';
export default class Header extends React.Component {
  render() {
    const { data }  = this.props;
      return (
        <div className="wrap-full guide">
          {/* <div className="triangle" /> */}
          <div className="wrap-fixed">
            <ul className="guide-ul">
              <MyIcons type="icon-mark1" className="icon-mark-top" />

              {
                data.map((item, index) => (<li className="guide-item" key={`guide${index}`}>
                  <MyIcons type={item.icon} className={`icon-guide${index}`} />
                  <p className="guide-title">{ item.title }</p>
                  <div className="guide-des">{ item.subtitle }</div>
                  <a className="guide-update" href={item.btnLink} target="_blank">{ item.btnText }</a>
                </li>))
              }
            </ul>
          </div>
        </div>
      );
  }
}
