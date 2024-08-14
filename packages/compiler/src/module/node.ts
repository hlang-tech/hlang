import nunjucks = require("nunjucks");

const template = `
  const module{{id}} = require("{{name}}");
  const {{id}} = module{{id}}.default || module{{id}};
`;

export default function (deps) {
  return deps
    .map((el) => {
      return nunjucks.renderString(template, el);
    })
    .join("\n");
}
