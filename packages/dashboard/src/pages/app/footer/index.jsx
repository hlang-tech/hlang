import React from 'react';
import './index.scss';

export default class Header extends React.Component {
  render() {
    const { data: { introduction, copyright, menu } }  = this.props;
    return (
      <div className="footer">
        <div className="wrap-fixed">
          <div className="footer-menu">
            {
              menu.map((item, index) => {
                return (
                  <dl className="footer-menu-item" key={`footer${index}`}>
                    <dt className="footer-menu-title">{item.title}</dt>
                    {
                      item.childrens.map((item1, index1) => {
                        return (
                          <dd className="footer-menu-subtitle" key={`footerMenu${index1}`}>
                            <a href={item1.url} target="_blank">{item1.title}</a>
                          </dd>
                        );
                      })
                    }
                  </dl>
                );
              })
            }
          </div>
          <div className="footer-introduce">
            <div className="footer-logo"><img src="https://img.alicdn.com/tfs/TB1fe96h639YK4jSZPcXXXrUFXa-260-98.png" width="120" /></div>
            <div className="introduce-font">{introduction}</div>
            <div className="copyright">{copyright}</div>
          </div>
          <div className="footer-qrcode">
            <p className="qrcode-img"><img src="https://img.alicdn.com/tfs/TB13TuEQpP7gK0jSZFjXXc5aXXa-751-751.jpg" width="114" /></p>
          </div>
        </div>
      </div>
    );
  }
}
