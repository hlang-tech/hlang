import nunjucks = require("nunjucks");

const template = `
  import {{ id }} from "{{ name }}";
`;

export default function (deps) {
  return deps
    .map((el) => {
      return nunjucks.renderString(template, el);
    })
    .join("\n");
}
