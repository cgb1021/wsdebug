const gulp = require('gulp');
const del = require('del');
const rollup = require('rollup');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
// const fs = require('fs')
// const util = require('gulp-util')
// const path = require("path")
// ===================================
gulp.task('clean', function (cb) {
  return del([
    './dist/**/*',
    './es/**/*',
    './lib/**/*'
  ], cb);
});
gulp.task('rollup', () => {
  return rollup.rollup({
    input: './src/index.js',
    plugins: [
    ]
  }).then(bundle => {
    return bundle.write({
      file: './dist/index.js',
      format: 'umd',
      name: 'wsdebug',
      globals: {
        espree: 'espree'
      }
    });
  });
});
gulp.task('babel', () => {
  return gulp.src('./dist/**/*')
    .pipe(babel({
      presets: [['@babel/preset-env', { 'modules': false }]],
      plugins: [['@babel/plugin-transform-runtime', {'regenerator': true}]]
    }))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));
});
gulp.task('lib', () => {
  return gulp.src('./src/**/*')
    .pipe(babel({
      presets: [['@babel/preset-env', { 'modules': 'commonjs' }]],
      plugins: [['@babel/plugin-transform-runtime', {'regenerator': true}]]
    }))
    .pipe(gulp.dest('./lib'));
});
gulp.task('es', () => {
  return gulp.src('./src/**/*')
    .pipe(gulp.dest('./es'));
});
gulp.task('build', gulp.series('clean', 'rollup', 'babel', gulp.parallel('lib', 'es')));
