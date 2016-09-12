"use strict"

const chmod = require("gulp-chmod");
const del = require("del");
const filter = require("gulp-filter");
const gulp = require("gulp");
const gunzip = require("gulp-gunzip");
const lambda = require("gulp-awslambda");
const rename = require("gulp-rename");
const request = require("request");
const shell = require('gulp-shell')
const source = require("vinyl-source-stream");
const untar = require("gulp-untar");
const zip = require("gulp-zip");

const dest = {
    lambda: "dist"
};
const paths = {
    src: [
        ".env",
        "package.json",
        "lambda.js",
        "ecs-docker-engine",
    ]
};

gulp.task("clean", function () {
    return del([ dest.lambda ]);
});

gulp.task("lambda.cert", function() {
    return gulp.src(`${process.env.HOME}/.machine/*.pem`).
        pipe(gulp.dest(`${dest.lambda}/cert`));
});

gulp.task("lambda.vendor.docker", function() {
    return gulp.src("/usr/bin/docker").
        pipe(gulp.dest(`${dest.lambda}/vendor`));
});

gulp.task("lambda.vendor.machine", function() {
    return gulp.src("/usr/local/bin/machine").
        pipe(gulp.dest(`${dest.lambda}/vendor`));
});

gulp.task("lambda.vendor.weave", function() {
    return request("https://git.io/weave").
        pipe(source("weave")).
        pipe(chmod(755)).
        pipe(gulp.dest(`${dest.lambda}/vendor`));
});

gulp.task("lambda.vendor", [ "lambda.vendor.docker", "lambda.vendor.machine", "lambda.vendor.weave" ]);

gulp.task("lambda.npm.src", function () {
    return gulp.src(paths.src).
        pipe(gulp.dest(dest.lambda));
});

gulp.task("lambda.npm", [ "lambda.npm.src" ], shell.task([
    `cd ${dest.lambda} && npm install --production`
]));

gulp.task("lambda", [ "lambda.cert", "lambda.vendor", "lambda.npm" ], function() {
    gulp.src([ `${dest.lambda}/*`, `!${dest.lambda}/app.zip` ]).
        pipe(zip("app.zip")).
        pipe(gulp.dest(dest.lambda));
});

gulp.task("default", [ "lambda" ]);

gulp.task("deploy", [ "lambda" ], function () {
    let FunctionName = "lambda-ecs-docker-engine";
    gulp.src([ `${dest.lambda}/*`, `!${dest.lambda}/app.zip` ]).
        pipe(zip("app.zip")).
        pipe(lambda(FunctionName, { region: "ap-northeast-1" }));
});
