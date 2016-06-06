"use strict"

const AWS = require("aws-sdk");
const ec2 = new AWS.EC2();
const child_process = require("child_process");
const Promise = require("bluebird");

const describeInstances = Promise.promisify(ec2.describeInstances, { context: ec2 });
const waitFor = Promise.promisify(ec2.waitFor, { context: ec2 });

function configure(data) {
    return new Promise(function (ok, grr) {
        // NOTE: one and only one instance
        const inst = data.Reservations[0].Instances[0];
        const args = [
            "--cluster",
            process.env.ECS_CLUSTER,
            "--public-ip",
            inst.PublicIpAddress,
            "--private-ip",
            inst.PrivateIpAddress,
            "--srv",
            process.env.SERVICE,
            "--zone",
            process.env.ZONE
        ];
        child_process.execFile("./ecs-docker-engine", args, (err, stdout, stderr) => {
            if (err) {
                console.log(stdout);
                console.log(stderr);
                grr(err);
            } else {
                console.log(stdout);
                ok();
            }
        });
    });
}

module.exports.handle = function (event, context, callback) {
    const msg = JSON.parse(event.Records[0].Sns.Message);
    const scalingEvent = msg.Event;
    const query = { InstanceIds: [ msg.EC2InstanceId ] };
    switch (scalingEvent) {
    case "autoscaling:EC2_INSTANCE_LAUNCH":
        waitFor("instanceRunning", query).
            then(() => {
                return describeInstances(query);
            }).
            then((data) => {
                return configure(data);
            }).
            then((result) => {
                callback(null, "success");
            }).
            catch((err) => {
                callback(err);
            });
        break;
    default:
        callback(null, scalingEvent);
        break;
    }
}
