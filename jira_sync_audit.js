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
                    client.get(config.jamaHost + "/rest/v1/items/" + element.id + "/versions", { project: config.project }, function(versionData, versionResponse) {
                        printRecord(element, versionData);
                    });
                }
            }
        );

        if (data.meta.pageInfo.resultCount === 50) {
            getStories(50);
        }
    });
}

function printRecord(story, version) {
    var lastSyncVersion = story.fields['SYS_JIRA_SYNC_VERSION$10454'];
    var latestVersion = version.data[0].versionNumber;

    if (lastSyncVersion !== latestVersion) {
        console.log(story.id + "," + story.fields[config.jiraKeyFieldName] + "," + "," + story.documentKey + "," + lastSyncVersion + "," + latestVersion);
    }
}