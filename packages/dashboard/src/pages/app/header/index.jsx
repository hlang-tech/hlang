import React from 'react';
// import { MyIcons } from '../js/page';
import './index.scss';

export default class Header extends React.Component {
  componentDidMount() {
    document.addEventListener('scroll', () => {
      const height = window.pageYOffset;
      const fixedHeader = document.getElementsByClassName('fixed-header')[0];
       if (height > 0) {
        fixedHeader.classList.add('active');
       } else {
        fixedHeader.classList.remove('active');
       }
    });
  }
  render() {
    const { data } = this.props;
    return (
      <div className="wrap-full fixed-header">
        <div className="wrap-fixed">
          <div className="header-left">
            <div className="logo"><img src="https://img.alicdn.com/tfs/TB1fe96h639YK4jSZPcXXXrUFXa-260-98.png" width="118" /></div>
            <ul className="menu">
              {
               data.map((item, index) => (<li key={`header${index}`}>
                <a href={item.url} target="_blank">
                  {item.title}
                </a>
              </li>))
              }
            </ul>
          </div>
          {/* <div className="search-wrap">
             <MyIcons type="icon-sousuo" className="search-icon" />
            <input type="text" className="search-input" />
          </div> */}
        </div>
      </div>
    );
  }
}
