var gulp = require('gulp'),
    sass = require('gulp-sass'),
 connect = require('gulp-connect');

gulp.task('connect', function() {
  connect.server({
    root: '',
    livereload: true
  });
});

gulp.task('html', function () {
  gulp.src('./*.html')
    .pipe(connect.reload());
});

gulp.task('sass', function () {
    gulp.src('./css/theme/source/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('./css/theme/'))
        .pipe(connect.reload());
});

gulp.task('watch', function () {
  gulp.watch(['./app/*.html'], ['html']);
});

gulp.task('default', ['connect', 'watch', 'sass']);