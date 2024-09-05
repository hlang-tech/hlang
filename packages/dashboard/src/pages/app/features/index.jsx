import React from 'react';
import { MyIcons } from '../js/page';
import './index.scss';

export default class Header extends React.Component {
  render() {
    const { data: { title, subtitle, list } }  = this.props;
    return (
      <div className="features">
        <div className="wrap-fixed position-relative">
          <MyIcons type="icon-mark1" className="icon-mark-bottom" />
        </div>
        <div className="triangle" />
        <div className="wrap-fixed">
          <div className="custom-title white">
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
          <ul className="features-list">
            {
              list.map((item, index) => {
              const img = (
                <div className="features-image">
                  <MyIcons type={item.icon} className="icon-features1" />
                </div>
              );
              const content = (
                  <div className="features-content">
                  <div className="features-subtitle">{item.subtitle}</div>
                  <div className="features-title">{item.title}</div>
                  <div className="features-des">{item.des}</div>
                </div>
              );
                if ((index + 1) % 2 === 0) {
                  return (
                    <li className="features-item right" key={`features${index}`}>
                      {content}{img}
                    </li>
                  );
                }
                  return (
                    <li className={`${(index + 1) % 2 === 0 ? 'features-item right' : 'features-item'}`} key={`features${index}`}>
                      {img}{content}
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
