"use strict"

const gulp = require("gulp");
const zip = require("gulp-zip");

const bundle = {
    src: [
        "cert/**",
        "vendor/**",
        "ecs-docker-engine",
        "lambda.js",
        "node_modules/**",
        "!node_modules/gulp/",
        "!node_modules/gulp/**",
        "!node_modules/gulp-zip/",
        "!node_modules/gulp-zip/**",
        "package.json",
    ],
    dst: ".",
    output: "app.zip",
    opts: {
        base: "."
    }
};

gulp.task("bundle", function() {
    gulp.src(bundle.src, bundle.opts)
        .pipe(zip(bundle.output))
        .pipe(gulp.dest(bundle.dst));
});
