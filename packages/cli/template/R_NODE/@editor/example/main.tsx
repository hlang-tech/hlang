import React from 'react';
import ReactDOM from 'react-dom';
import App from '../index';

// 创建一个根
const rootElement = document.getElementById('app');

// 使用 createRoot API 来挂载 App 组件
ReactDOM.createRoot(rootElement).render(<App />);