"use strict"

require("dotenv").config();

const child_process = require("child_process");
const path = require("path")

const AWS = require("aws-sdk");
const Promise = require("bluebird");

const ec2 = new AWS.EC2();
const describeInstances = Promise.promisify(ec2.describeInstances, { context: ec2 });
const waitFor = Promise.promisify(ec2.waitFor, { context: ec2 });

const sns = new AWS.SNS();
const publish = Promise.promisify(sns.publish, { context: sns });

function configure(clusterName, data) {
    return new Promise(function (ok, grr) {
        // NOTE: one and only one instance
        const inst = data.Reservations[0].Instances[0];
        const args = [
            "--cluster",
            clusterName,
            "--public-ip",
            inst.PublicIpAddress,
            "--private-ip",
            inst.PrivateIpAddress,
            "--srv",
            process.env.SERVICE,
            "--zone",
            process.env.ZONE
        ];
        const child = child_process.spawn("./ecs-docker-engine", args);
        child.stdout.on("data", (data) => process.stdout.write(`1: ${data}`));
        child.stderr.on("data", (data) => process.stderr.write(`2: ${data}`));
        child.on("close", (code) => {
            if (code === 0) {
                ok(inst);
            } else {
                grr(code);
            }
        });
    });
}

module.exports.handle = function (event, context, callback) {
    const msg = JSON.parse(event.Records[0].Sns.Message);

    const scalingEvent = msg.Event,
          clusterName = msg.AutoScalingGroupName,
          query = { InstanceIds: [ msg.EC2InstanceId ] };

    switch (scalingEvent) {
    case "autoscaling:EC2_INSTANCE_LAUNCH":
        waitFor("instanceRunning", query).
            then(() => {
                return describeInstances(query);
            }).
            then((data) => {
                return configure(clusterName, data);
            }).
            then((inst) => {
                const message = {
                    Instance: {
                        InstanceId: inst.InstanceId,
                        PublicIpAddress: inst.PublicIpAddress,
                        PrivateIpAddress: inst.PrivateIpAddress
                    },
                    ClusterName: clusterName,
                    ContainerSpec: {
                        Bucket: process.env.DEVOPS_BUCKET,
                        Key: path.join(clusterName, process.env.DEVOPS_VERSION || "latest.yml"),
                    }
                };
                const params = {
                    Message: JSON.stringify(message),
                    TopicArn: process.env.DEVOPS_WORKER_ARN,
                };
                return publish(params);
            }).
            then(() => {
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
