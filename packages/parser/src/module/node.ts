import nunjucks = require('nunjucks');

const template = `
    const {{id}} = require("{{name}}");
`;

export default function (deps) {
  return deps.map(el => {
    return nunjucks.renderString(template, el);
  }).join('\n');
}
