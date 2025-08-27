const pkg = require("./package.json");
const path = require("path");
const { pathToFileURL } = require("url");
const glob = require("glob");
const yargsFactory = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const colors = require("colors");
const through = require("through2");
const puppeteer = require("puppeteer");

const { rollup } = require("rollup");
const { terser } = require("rollup-plugin-terser");
const babel = require("@rollup/plugin-babel").default;
const commonjs = require("@rollup/plugin-commonjs");
const resolve = require("@rollup/plugin-node-resolve").default;
const sass = require("sass");

const gulp = require("gulp");
const tap = require("gulp-tap");
const zip = require("gulp-zip");
const eslint = require("gulp-eslint");
const minify = require("gulp-clean-css");
const connect = require("gulp-connect");
const _autoprefixer = require("gulp-autoprefixer");
const autoprefixer =
  _autoprefixer && _autoprefixer.default
    ? _autoprefixer.default
    : _autoprefixer;

const argv = yargsFactory(hideBin(process.argv)).argv;
const root = argv.root || ".";
const port = argv.port || 8000;
const host = argv.host || "localhost";

const banner = `/*!
* reveal.js ${pkg.version}
* ${pkg.homepage}
* MIT licensed
*
* Copyright (C) 2011-2022 Hakim El Hattab, https://hakim.se
*/\n`;

// Prevents warnings from opening too many test pages
process.setMaxListeners(20);

const babelConfig = {
  babelHelpers: "bundled",
  ignore: ["node_modules"],
  compact: false,
  extensions: [".js", ".html"],
  plugins: ["transform-html-import-to-string"],
  presets: [
    [
      "@babel/preset-env",
      {
        corejs: 3,
        useBuiltIns: "usage",
        modules: false,
      },
    ],
  ],
};

// Our ES module bundle only targets newer browsers with
// module support. Browsers are targeted explicitly instead
// of using the "esmodule: true" target since that leads to
// polyfilling older browsers and a larger bundle.
const babelConfigESM = JSON.parse(JSON.stringify(babelConfig));
babelConfigESM.presets[0][1].targets = {
  browsers: [
    "last 2 Chrome versions",
    "last 2 Safari versions",
    "last 2 iOS versions",
    "last 2 Firefox versions",
    "last 2 Edge versions",
  ],
};

let cache = {};

// Creates a bundle with broad browser support, exposed
// as UMD
gulp.task("js-es5", () => {
  return rollup({
    cache: cache.umd,
    input: "js/index.js",
    plugins: [resolve(), commonjs(), babel(babelConfig), terser()],
  }).then((bundle) => {
    cache.umd = bundle.cache;
    return bundle.write({
      name: "Reveal",
      file: "./dist/reveal.js",
      format: "umd",
      banner: banner,
      sourcemap: true,
    });
  });
});

// Creates an ES module bundle
gulp.task("js-es6", () => {
  return rollup({
    cache: cache.esm,
    input: "js/index.js",
    plugins: [resolve(), commonjs(), babel(babelConfigESM), terser()],
  }).then((bundle) => {
    cache.esm = bundle.cache;
    return bundle.write({
      file: "./dist/reveal.esm.js",
      format: "es",
      banner: banner,
      sourcemap: true,
    });
  });
});
gulp.task("js", gulp.parallel("js-es5", "js-es6"));

// Creates a UMD and ES module bundle for each of our
// built-in plugins
gulp.task("plugins", () => {
  return Promise.all(
    [
      {
        name: "RevealHighlight",
        input: "./plugin/highlight/plugin.js",
        output: "./plugin/highlight/highlight",
      },
      {
        name: "RevealMarkdown",
        input: "./plugin/markdown/plugin.js",
        output: "./plugin/markdown/markdown",
      },
      {
        name: "RevealSearch",
        input: "./plugin/search/plugin.js",
        output: "./plugin/search/search",
      },
      {
        name: "RevealNotes",
        input: "./plugin/notes/plugin.js",
        output: "./plugin/notes/notes",
      },
      {
        name: "RevealZoom",
        input: "./plugin/zoom/plugin.js",
        output: "./plugin/zoom/zoom",
      },
      {
        name: "RevealMath",
        input: "./plugin/math/plugin.js",
        output: "./plugin/math/math",
      },
    ].map((plugin) => {
      return rollup({
        cache: cache[plugin.input],
        input: plugin.input,
        plugins: [
          resolve(),
          commonjs(),
          babel({
            ...babelConfig,
            ignore: [/node_modules\/(?!(highlight\.js|marked)\/).*/],
          }),
          terser(),
        ],
      }).then((bundle) => {
        cache[plugin.input] = bundle.cache;
        bundle.write({
          file: plugin.output + ".esm.js",
          name: plugin.name,
          format: "es",
        });

        bundle.write({
          file: plugin.output + ".js",
          name: plugin.name,
          format: "umd",
        });
      });
    })
  );
});

// a custom pipeable step to transform Sass to CSS
function compileSass() {
  return through.obj((vinylFile, encoding, callback) => {
    const transformedFile = vinylFile.clone();
    try {
      const result = sass.compileString(transformedFile.contents.toString(), {
        loadPaths: ["css/", "css/theme/template"],
        style: "expanded",
        url: pathToFileURL(transformedFile.path),
      });
      transformedFile.extname = ".css";
      transformedFile.contents = Buffer.from(result.css);
      callback(null, transformedFile);
    } catch (err) {
      console.log(vinylFile.path);
      // Prefer formatted message if present
      console.log(err.formatted || err.message || String(err));
      callback(err);
    }
  });
}

// Prepend a banner to file contents without using gulp-header (avoids lodash.template)
function prependBanner(text) {
  return through.obj((file, enc, cb) => {
    if (file.isBuffer()) {
      const content = Buffer.concat([Buffer.from(text), file.contents]);
      file.contents = content;
    }
    cb(null, file);
  });
}

gulp.task("css-themes", () =>
  gulp
    .src(["./css/theme/source/*.{sass,scss}"])
    .pipe(compileSass())
    .pipe(gulp.dest("./dist/theme"))
);

gulp.task("css-core", () =>
  gulp
    .src(["css/reveal.scss"])
    .pipe(compileSass())
    .pipe(autoprefixer())
    .pipe(minify({ compatibility: "ie9" }))
    .pipe(prependBanner(banner))
    .pipe(gulp.dest("./dist"))
);

gulp.task("css", gulp.parallel("css-themes", "css-core"));

gulp.task("qunit", () => {
  let serverConfig = {
    root,
    port: 8009,
    host: "localhost",
    name: "test-server",
  };

  let server = connect.server(serverConfig);

  let testFiles = glob.sync("test/*.html");

  let totalTests = 0;
  let failingTests = 0;

  async function runQunitLegacy(url) {
    const browser = await puppeteer.launch({
      args: [
        "--allow-file-access-from-files",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    try {
      const page = await browser.newPage();
      // Forward browser console to node for debugging
      page.on("console", (msg) => {
        try {
          // Avoid noisy objects
          console.log(msg.text());
        } catch (_) {
          /* noop */
        }
      });

      // Aggregate results
      const deferred = {};
      const donePromise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
      });

      // Collect detailed assertion failures per test
      const pageFailures = [];
      await page.exposeFunction("__qunitDone", (context) => {
        deferred.resolve({ ...context, failures: pageFailures });
      });
      await page.exposeFunction("__qunitReportTest", (report) => {
        if (report && report.failed > 0 && Array.isArray(report.assertions)) {
          pageFailures.push(report);
        }
      });

      // Hook after load; QUnit 1.x registers callbacks later
      await page.evaluateOnNewDocument(() => {
        window.addEventListener("load", () => {
          const hook = () => {
            try {
              if (!window.QUnit) {
                setTimeout(hook, 25);
                return;
              }
              const handler = (ctx) => window.__qunitDone(ctx);
              // Capture per-test assertion failures and names
              const capture = () => {
                try {
                  if (typeof window.QUnit.testDone === "function") {
                    window.QUnit.testDone((details) => {
                      const assertions = (window.QUnit.config?.current?.assertions || [])
                        .filter((a) => a.result === false)
                        .map((a) => ({ message: a.message, expected: a.expected, actual: a.actual }));
                      window.__qunitReportTest({
                        name: details.name,
                        module: details.module,
                        failed: details.failed,
                        total: details.total,
                        assertions,
                      });
                    });
                  } else if (window.QUnit.config) {
                    // Fallback for very old QUnit: poll current after each test via log hook
                    window.QUnit.log && window.QUnit.log((a) => {
                      if (a.result === false) {
                        window.__qunitReportTest({ name: window.QUnit.config.current?.testName || "", module: window.QUnit.config.current?.module || "", failed: 1, total: window.QUnit.config.stats?.all || 0, assertions: [{ message: a.message, expected: a.expected, actual: a.actual }] });
                      }
                    });
                  }
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.error("QUnit capture hook error", e);
                }
              };
              capture();
              if (typeof window.QUnit.done === "function") {
                window.QUnit.done(handler);
              } else if (
                window.QUnit.config &&
                Array.isArray(window.QUnit.config.done)
              ) {
                window.QUnit.config.done.push(handler);
              } else {
                // Last resort: poll for completion (not ideal)
                const start = Date.now();
                const poll = () => {
                  const cfg = window.QUnit && window.QUnit.config;
                  if (cfg && cfg.queue && cfg.queue.length === 0) {
                    handler({
                      failed: cfg.stats?.bad || 0,
                      passed: cfg.stats?.all - (cfg.stats?.bad || 0) || 0,
                      total: cfg.stats?.all || 0,
                      runtime: Date.now() - (cfg.started || Date.now()),
                    });
                    return;
                  }
                  if (Date.now() - start < 60000) setTimeout(poll, 50);
                };
                poll();
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error("QUnit hook error", e);
            }
          };
          hook();
        });
      });

      await page.goto(url, { waitUntil: "load" });
      // Targeted debug for element-attributes test page
      if (url.endsWith("test/test-markdown-element-attributes.html")) {
        try {
          await page.waitForSelector(".reveal .slides", { timeout: 5000 });
          await page.evaluate(() => {
            const items = Array.from(
              document.querySelectorAll(".reveal .slides section li")
            ).map((li, idx) => ({
              idx,
              text: li.textContent.trim(),
              cls: li.className,
            }));
            // eslint-disable-next-line no-console
            console.log("DEBUG LIs:", JSON.stringify(items));
            const img = document.querySelector(
              ".reveal .slides section img"
            );
            // eslint-disable-next-line no-console
            console.log("DEBUG IMG class:", img ? img.className : null);
            // Inspect comment nodes for element attribute annotations
            const comments = [];
            const walker = document.createTreeWalker(
              document.querySelector('.reveal .slides'),
              NodeFilter.SHOW_COMMENT,
              null,
              false
            );
            let n;
            const re = /\{_\s*?([^}]+?)\}/m;
            while ((n = walker.nextNode())) {
              const txt = n.nodeValue || '';
              if (re.test(txt) || /\.element\s*?:/.test(txt)) {
                const prev = (function p(e){
                  let s = e.previousSibling;
                  while (s && (!(s.nodeType===1) || s.tagName==='BR')) s = s.previousSibling;
                  return s;
                })(n);
                comments.push({
                  txt: txt.trim(),
                  prevTag: prev && prev.tagName,
                  prevClass: prev && prev.className,
                  prevText: prev && prev.textContent && prev.textContent.trim()
                });
              }
            }
            // eslint-disable-next-line no-console
            console.log('DEBUG COMMENTS:', JSON.stringify(comments));
          });
        } catch (_) {
          // ignore
        }
      }

      const stats = await Promise.race([
        donePromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("QUnit timeout")), 60000)
        ),
      ]);

      return { stats };
    } finally {
      await browser.close();
    }
  }

  let tests = Promise.all(
    testFiles.map((filename) => {
      return new Promise((resolve, reject) => {
        runQunitLegacy(
          `http://${serverConfig.host}:${serverConfig.port}/${filename}`
        )
          .then((result) => {
            if (result.stats.failed > 0) {
              console.log(
                `${"!"} ${filename} [${result.stats.passed}/${result.stats.total}] in ${result.stats.runtime}ms`.red
              );
              // Print details for failing tests
              if (Array.isArray(result.stats.failures)) {
                result.stats.failures.forEach((t) => {
                  console.log(
                    `  ✖ ${t.module ? t.module + " - " : ""}${t.name}`.red
                  );
                  t.assertions?.forEach((a) => {
                    console.log(
                      `    • ${a.message || "assertion failed"} (expected: ${a.expected}, actual: ${a.actual})`.red
                    );
                  });
                });
              }
            } else {
              console.log(
                `${"✔"} ${filename} [${result.stats.passed}/${result.stats.total}] in ${result.stats.runtime}ms`.green
              );
            }

            totalTests += result.stats.total;
            failingTests += result.stats.failed;

            resolve();
          })
          .catch((error) => {
            console.error(error);
            reject();
          });
      });
    })
  );

  return new Promise((resolve, reject) => {
    tests
      .then(() => {
        if (failingTests > 0) {
          reject(new Error(`${failingTests}/${totalTests} tests failed`.red));
        } else {
          console.log(`${"✔"} Passed ${totalTests} tests`.green.bold);
          resolve();
        }
      })
      .catch(() => {
        reject();
      })
      .finally(() => {
        server.close();
      });
  });
});

gulp.task("eslint", () =>
  gulp.src(["./js/**", "gulpfile.js"]).pipe(eslint()).pipe(eslint.format())
);

gulp.task("test", gulp.series("eslint", "qunit"));

gulp.task(
  "default",
  gulp.series(gulp.parallel("js", "css", "plugins"), "test")
);

gulp.task("build", gulp.parallel("js", "css", "plugins"));

gulp.task(
  "package",
  gulp.series(() =>
    gulp
      .src(
        [
          "./index.html",
          "./dist/**",
          "./lib/**",
          "./images/**",
          "./plugin/**",
          "./**.md",
        ],
        { base: "./" }
      )
      .pipe(zip("reveal-js-presentation.zip"))
      .pipe(gulp.dest("./"))
  )
);

gulp.task("reload", () => gulp.src(["*.html", "*.md"]).pipe(connect.reload()));

gulp.task("serve", () => {
  connect.server({
    root: root,
    port: port,
    host: host,
    livereload: true,
  });

  gulp.watch(["*.html", "*.md"], gulp.series("reload"));

  gulp.watch(["js/**"], gulp.series("js", "reload", "eslint"));

  gulp.watch(
    ["plugin/**/plugin.js", "plugin/**/*.html"],
    gulp.series("plugins", "reload")
  );

  gulp.watch(
    ["css/theme/source/*.{sass,scss}", "css/theme/template/*.{sass,scss}"],
    gulp.series("css-themes", "reload")
  );

  gulp.watch(
    ["css/*.scss", "css/print/*.{sass,scss,css}"],
    gulp.series("css-core", "reload")
  );

  gulp.watch(["test/*.html"], gulp.series("test"));
});
