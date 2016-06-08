"use strict"

const gulp = require("gulp");

const chmod = require('gulp-chmod');
const filter = require('gulp-filter');
const gunzip = require("gulp-gunzip");
const rename = require("gulp-rename");
const request = require("request");
const source = require("vinyl-source-stream");
const untar = require("gulp-untar");
const zip = require("gulp-zip");

const bundle = {
    src: [
        ".env",
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

gulp.task("bundle", ["vendor"], function() {
    gulp.src(bundle.src, bundle.opts)
        .pipe(zip(bundle.output))
        .pipe(gulp.dest(bundle.dst));
});

gulp.task("vendor", ["vendor-weave", "vendor-docker"]);

gulp.task("vendor-weave", function() {
    return request("https://git.io/weave").
        pipe(source("weave")).
        pipe(chmod(755)).
        pipe(gulp.dest("vendor"));
});

gulp.task("vendor-docker", function() {
    return request("https://get.docker.com/builds/Linux/x86_64/docker-latest.tgz").
        pipe(source("docker-latest.tgz")).
        pipe(gunzip()).
        pipe(untar()).
        pipe(filter("docker/docker")).
        pipe(rename("docker")).
        pipe(chmod(755)).
        pipe(gulp.dest("vendor"));
});
