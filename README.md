# Hlang
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

<br />
<br />

<p align="center">
  <img src="https://raw.githubusercontent.com/hlang-org/hlang/main/media/logo.png" width="256" height="256" />
</p>

<br />
<br />

<br />
<br />

<p align="center">
<b style="font-size: 32px;line-height: 32px;">A Flow-based programming language for universal applications.</b>
<br />
<br />
<br />
<em>Hlang aims to make programming easier, faster and more comfortable. It avoids coding, repetition and frustration.</em>
<br />
<br />
</p>

<br />
<br />

---

### Ecosystem

#### UI & Devtool

<p align="center">
  <img width="800" src="https://raw.githubusercontent.com/hlang-org/hlang/main/media/ui.png" alt="devtool">
</p>

### Feature

* 😊 Another FBP-Inspired System, totally `Reactive`.
* 🚀 Powerful ecosystem, abundant internal nodes.
* 👬 Just use Node-Like `Readable` | `Writable` | `Transform` Stream API to become a node developer.
* ✊ Production-ready and Enterprise-ready, High Performance.

### 🌰 Quick Start

```javascript
const {
  Flow,
  ReadableNode,
  WriteableNode,
  TransformNode,
  Port,
} = require("@hlang-org/runtime");

const flowIns = new Flow();

class OneReadableNode extends ReadableNode {
  constructor() {
    super();

    // dig a port named `out`
    Port.O("out").attach(this);
  }

  _read($o) {
    // send packet to `out` port
    $o("out").send({ payload: "hello, world" });
  }
}

class OneTransformNode extends TransformNode {
  constructor() {
    super();

    // dig `in` `out` port
    Port.I("in").attach(this);
    Port.O("out").attach(this);
  }

  _transform($i, $o) {
    $i("in").on((payload) => {
      $o("out").send(payload);
    });
  }
}

class OneWriteableNode extends WriteableNode {
  constructor() {
    super();
    Port.I("in").attach(this);
  }

  _write($i) {
    $i("in").on(console.log);
  }
}

const $R = new OneReadableNode();
const $T = new OneTransformNode();
const $W = new OneWriteableNode();

// connect
$R.O("out").connect($T.I("in"));
$T.O("out").connect($W.I("in"));

// for fun!
flowIns.run($R);
```

## Become a contributer ?

### Install

#### step-1

```bash
$ npm install
```

#### step-2

```bash
$ npm run pm_install
```

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/archersado"><img src="https://avatars.githubusercontent.com/u/17758281?v=4?s=100" width="100px;" alt="archersado"/><br /><sub><b>archersado</b></sub></a><br /><a href="#infra-archersado" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/hlang-org/hlang/commits?author=archersado" title="Tests">⚠️</a> <a href="https://github.com/hlang-org/hlang/commits?author=archersado" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://xiaoa.name"><img src="https://avatars.githubusercontent.com/u/773248?v=4?s=100" width="100px;" alt="Archer"/><br /><sub><b>Archer</b></sub></a><br /><a href="#infra-qddegtya" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/hlang-org/hlang/commits?author=qddegtya" title="Tests">⚠️</a> <a href="https://github.com/hlang-org/hlang/commits?author=qddegtya" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
