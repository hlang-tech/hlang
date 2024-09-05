import React from 'react';
import './index.scss';

export default class Header extends React.Component {
  render() {
    const { data: { title, subtitle, btnList } } = this.props;
    return (
      <div className="wrap-full wrap-banner">
        <div className="banner-content">
          <div className="wrap-fixed">
            <div className="banner-font">
                <h2 className="title">{title}</h2>
                <p className="subtitle">{subtitle}</p>
                <p className="btn-control">
                  {
                    btnList.map((item, index) => <a target="_blank" className="btn-white" href={item.url} key={`btn${index}`}>{item.text}</a>)
                  }
                </p>
            </div>
            <div className="banner-video">
              <div>
                <div />
              </div>
              <video
                src="https://hset-imm.oss-cn-beijing.aliyuncs.com/source/What%20is%20Flow-based%20Programming-tBDjLXJw9Co.mp4"
                width="633"
                height="426"
                controls
                muted
              >
                <p>你的浏览器不支持 HTML5 视频。可点击<a href="https://hset-imm.oss-cn-beijing.aliyuncs.com/source/What%20is%20Flow-based%20Programming-tBDjLXJw9Co.mp4">此链接</a>观看</p>
              </video>
            </div>
            <div className="circle" />
          </div>
        </div>

      </div>
    );
  }
}
