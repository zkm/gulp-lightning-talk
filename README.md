## Gulp.js Lightning Talk

[![CI](https://github.com/zkm/gulp-lightning-talk/actions/workflows/ci.yml/badge.svg)](https://github.com/zkm/gulp-lightning-talk/actions/workflows/ci.yml)
[![slides](https://img.shields.io/website?url=https%3A%2F%2Fzkm.github.io%2Fgulp-lightning-talk%2F&label=slides)](https://zkm.github.io/gulp-lightning-talk/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

![reveal.js custom fork](https://img.shields.io/badge/reveal.js-custom%20fork-F2E142?logo=revealdotjs&logoColor=white)
![Gulp](https://img.shields.io/badge/Gulp-CF4647?logo=gulp&logoColor=white)
![Babel](https://img.shields.io/badge/Babel-F9DC3E?logo=babel&logoColor=black)
![Rollup](https://img.shields.io/badge/Rollup-EC4A3F?logo=rollupdotjs&logoColor=white)
![Yarn 4](https://img.shields.io/badge/Yarn-4-2C8EBB?logo=yarn&logoColor=white)
![Node.js 22](https://img.shields.io/badge/Node.js-22-5FA04E?logo=nodedotjs&logoColor=white)

Slides for a 10-minute lightning talk about Gulp.js, built on a customized Reveal.js fork (not the upstream distribution). The live deck is published at http://zkm.github.io/gulp-lightning-talk/.

### Quick start

```bash
yarn install
yarn start   # serve slides with live reload
yarn test    # build, lint, and run slide tests
yarn build   # produce dist assets
```

### Notes

- This repo is a forked/customized Reveal.js build; metadata in `package.json` points here and the package is marked `private` to avoid npm publishes.
- Sass uses legacy `@import` for compatibility; deprecation warnings are silenced in the gulp build. Consider migrating to `@use`/`@forward` when convenient.
- License remains MIT, consistent with upstream Reveal.js.
