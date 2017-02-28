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
                    getRequirement(element);
                }
            }
        );

        if (data.meta.pageInfo.resultCount === 50) {
            getStories(50);
        }
    });
}

function getRequirement(story) {
    var args = {
        path: { "id": story.id },
    };

    client.get(config.jamaHost + "/rest/v1/items/${id}/upstreamrelated", args, function(data, response) {
        if (data.data) {
            data.data.forEach(
                function(upstream) {
                    if (upstream.documentKey.startsWith(config.requirementPrefix)) {
                        getEpic(this, upstream.location.parent.item);
                    }
                },
                story
            );
        } else {
            console.log(story.id + " - " + story.documentKey);
        }
    });
}

function getEpic(story, parentId, lastFolder) {
    var args = {
        path: { "id": parentId },
    };

    client.get(config.jamaHost + "/rest/v1/items/${id}", args, function(data, response) {
        if (data.data.documentKey && data.data.documentKey.startsWith(config.folderPrefix)) {
            // This may not be the top folder, keep checking
            getEpic(story, data.data.location.parent.item, data);
        } else if (data.data.documentKey && data.data.documentKey === config.requirementSetName) {
            // We have reached the top, now step down to the last folder
            printRecord(story, lastFolder);
        } else {
            if (data.data.location.parent.item) {
                getEpic(story, data.data.location.parent.item, lastFolder);
            } else {
                printRecord(story);
            }
        }
    });
}

function printRecord(story, folder) {
    if (folder) {
        console.log(story.id + "," + story.fields[config.jiraKeyFieldName] + "," + (config.releaseMapping[story.fields.release] || "?") + "," + story.documentKey + "," + folder.data.fields.name);
    } else {
        console.log(story.id + "," + story.fields[config.jiraKeyFieldName] + "," + (config.releaseMapping[story.fields.release] || "?") + "," + story.documentKey);
    }
}