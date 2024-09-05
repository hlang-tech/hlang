import React from 'react';
import { MyIcons } from '../js/page';
import './index.scss';

export default class Header extends React.Component {
  render() {
    const { data: { title, subtitle, list } }  = this.props;
    return (
      <div className="case">
        <div className="triangle" />
        <div className="wrap-fixed">
          <div className="custom-title">
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
          <ul className="case-list">
            {
              list.map((item, index) => {
                return (
                  <li className="case-item" key={`case${index}`}>
                    <MyIcons type={item.icon} className="icon-case1" />
                    <div className="case-title">{item.title}</div>
                    <div className="case-subtitle">{item.subtitle}</div>
                  </li>
                );
              })
            }
          </ul>
        </div>

      </div>
    );
  }
}
