// Dependencies
var gulp = require('gulp'),
   qunit = require('gulp-qunit'),
  jshint = require('gulp-jshint'),
    sass = require('gulp-sass'),
 connect = require('gulp-connect'),
     zip = require('gulp-zip');

gulp.task('qunit', function() {
    return gulp.src('test/*.html')
        .pipe(qunit());
}),

gulp.task('jshint', function() {
  return gulp.src('./js/reveal.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
}), 

gulp.task('connect', function() {
  connect.server({
    root: '',
    livereload: true
  });
}),

gulp.task('html', function () {
  gulp.src('./*.html')
    .pipe(connect.reload());
}),

gulp.task('sass', function () {
    gulp.src('./css/theme/source/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('./css/theme/'))
        .pipe(connect.reload());
}),

gulp.task('zip', function () {
    return gulp.src([
      'index.html',
      'css/**',
      'js/**',
      'lib/**',
      'images/**',
      'plugin/**'
      ])
        .pipe(zip('reveal-js-presentation.zip'))
        .pipe(gulp.dest('dist'));
}),

gulp.task('watch', function () {
  gulp.watch(['./app/*.html'], ['html']);
}),

// Default Task
gulp.task('default', [ 'jshint', 'cssmin', 'uglify', 'qunit' ]);

// Theme Task
gulp.task('themes', ['sass']);

// Package presentation to archive
gulp.task('package', ['default', 'zip']);

// Serve Presentation locally
gulp.task('serve', ['connect', 'watch']);

// Run test
gulp.task('test', ['jshint', 'qunit']);