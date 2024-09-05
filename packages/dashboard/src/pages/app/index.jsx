import React from 'react';
import { content } from './js/page';
import Header from './header/index';
import Banner from './banner/index';
import Guide from './guide';
import Features from './features';
import Case from './case';
import Footer from './footer';

import './css/index.scss';
const { menu, banner, guide, features, cases, footer } = content;
export default class App extends React.Component {
  render() {
    return (
      <div>
        <div className="banner-bg" />
        <Header data={menu} />
        <Banner data={banner} />
        <Guide data={guide} />
        <Features data={features} />
        <Case data={cases} />
        <Footer data={footer} />
      </div>
    );
  }
}
