var dns = require('dns'),
    dnscache = require('dnscache')({
        "enable": true,
        "ttl": 300,
        "cachesize": 1000
    });

var fs = require("fs");
var config = JSON.parse(fs.readFileSync("config.json"));

var Client = require('node-rest-client').Client;
var options_auth = { user: config.user, password: config.password };
var client = new Client(options_auth);

var args = {
    parameters: { project: config.project, maxResults: 50, startAt: 1 }
};

getStories(0);

function getStories(startAt) {
    args.parameters.startAt += startAt;

    client.get(config.jamaHost + "/rest/v1/items", args, function(data, response) {
        data.data.forEach(
            function(element) {
                if (element.documentKey.startsWith(config.storyPrefix)) {
                    getUpstream(element);
                }
            }
        );

        if (data.meta.pageInfo.resultCount === 50) {
            getStories(50);
        }
    });
}

function getUpstream(story) {
    var args = {
        path: { "id": story.id },
    };

    client.get(config.jamaHost + "/rest/v1/items/${id}/upstreamrelated", args, function(data, response) {
        if (data.data) {
            data.data.forEach(
                function(upstream) {
                    if (upstream.documentKey.startsWith(config.epicPrefix)) {
                        getEpic(this, upstream.id);

                        // TODO could possible drop a story off the list here if there isn't an upstream epic
                    }
                },
                story
            );
        } else {
            console.log(story.id + " - " + story.documentKey);
        }
    });
}

function getEpic(story, epicId) {
    var args = {
        path: { "id": epicId },
    };

    client.get(config.jamaHost + "/rest/v1/items/${id}", args, function(data, response) {
        printRecord(story, data.data);
    });
}

function printRecord(story, epic) {
    console.log(story.id + "," + story.fields[config.jiraKeyFieldName] + "," + story.fields.name + "," + (config.releaseMapping[story.fields.release] || "?") + "," + story.documentKey + "," + epic.documentKey + "," + epic.fields.name + "," + "https://w9o.jamacloud.com/perspective.req#/items/" + epic.id + "?projectId=" + config.project);
}