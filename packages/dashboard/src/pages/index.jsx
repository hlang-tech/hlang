import React from 'react';
import { render } from 'react-dom';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './app/index';
import Flow from './flow/index';
import FlowList from './flowList/index';


// 根组件
const App = () => {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/list" element={<FlowList />} />
          <Route path="/flow" element={<Flow />} />
        </Routes>
      </div>
    </Router>
  );
};




render(<App />, document.getElementById("container"));