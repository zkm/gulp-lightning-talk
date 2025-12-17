## Gulp.js Lightning Talk

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
