var gulp = require("gulp");
var zip = require('gulp-zip');
var clean = require('gulp-clean');
var ts = require("gulp-typescript");
var runSeq = require('run-sequence');
var tsProject = ts.createProject("tsconfig.json");
var babili = require("gulp-babili");
var rename = require("gulp-rename");
gulp.task('compileTsFile', () => {
    return tsProject.src()
        .pipe(tsProject())
        .js.pipe(gulp.dest('./dist/zip/leaflet/widget'));
});
gulp.task('copyLibrary', () => {
    return gulp.src("./src/leaflet/libs/**/*")
        .pipe(gulp.dest("./dist/zip/leaflet/libs"))
});
gulp.task('copy', () => {
    gulp.src(['./src/package.xml'])
        .pipe(gulp.dest('./dist/zip'))
    gulp.src("./src/leaflet/Leaflet.xml")
        .pipe(gulp.dest("./dist/zip/leaflet"))
    gulp.src('./src/leaflet/widget/template/*.html')
        .pipe(gulp.dest("./dist/zip/leaflet/widget/template"))
    gulp.src("./src/leaflet/widget/ui/**/*")
        .pipe(gulp.dest("./dist/zip/leaflet/widget/ui"))
});
gulp.task('cleanDist', () => {
    return gulp.src('./dist')
        .pipe(clean())
});
gulp.task('copyMinifyLibrary', () => {
    gulp.src(["./src/leaflet/libs/leaflet-src.js"])
        .pipe(babili({
            mangle: {
                keepClassNames: true
            }
        }))
        .pipe(gulp.dest("./dist/zip/leaflet/libs"))
})
gulp.task('zip', () => {
    return gulp.src("./dist/zip/**/*")
        .pipe(zip('Leaflet.mpk'))
        .pipe(gulp.dest("C:/Users/HaBui/Documents/Mendix/Agrifarm1-main_2/widgets"))
});
gulp.task('zip2', () => {
    return gulp.src("./dist/zip/**/*")
        .pipe(zip('Leaflet.mpk'))
        .pipe(gulp.dest("C:/Users/HaBui/Documents/Mendix/LeafletMap2-main_2/widgets"))
});
gulp.task('zip3', () => {
    return gulp.src("./dist/zip/**/*")
        .pipe(zip('Leaflet.mpk'))
        .pipe(gulp.dest("C:/Users/HaBui/Documents/Mendix/TestLeafletCSS-main/widgets"))
});
gulp.task('default', (callback) => {
    runSeq(['cleanDist'], ['compileTsFile', 'copy', 'copyLibrary'], ['zip'], callback)
});
gulp.task('productWidget', (callback) => {
    runSeq(['cleanDist'], ['compileTsFile', 'copy', 'copyMinifyLibrary'], ['zip'], callback)
});