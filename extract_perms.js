var dns = require('dns'),
    dnscache = require('dnscache')({
        "enable": true,
        "ttl": 300,
        "cachesize": 1000
    });

var fs = require("fs");
var config = JSON.parse(fs.readFileSync("config.json"));

var cheerio = require('cheerio')

var Client = require('node-rest-client').Client;
var options_auth = { user: config.user, password: config.password };
var client = new Client(options_auth);

var args = {
    parameters: { project: config.project, maxResults: 50, startAt: 1 }
};

getEpics(0);

function getEpics(startAt) {
    args.parameters.startAt += startAt;

    client.get(config.jamaHost + "/rest/v1/items", args, function(data, response) {
        data.data.forEach(
            function(element) {
                if (element.documentKey.startsWith(config.epicPrefix)) {
                    printRecord(element)
                }
            }
        );

        if (data.meta.pageInfo.resultCount === 50) {
            getEpics(50);
        }
    });
}

function printRecord(story) {
    // console.log(story.fields['documentKey'] + "," + extractPermissionText(story.fields['description']))
    console.log(extractPermissionText(story.fields['description']))
    // console.log(story.id + "," + story.fields[config.jiraKeyFieldName] + "," + story.fields.name + "," + (config.releaseMapping[story.fields.release] || "?") + "," + story.documentKey + "," + epic.documentKey + "," + epic.fields.name + "," + "https://w9o.jamacloud.com/perspective.req#/items/" + epic.id + "?projectId=" + config.project);
}

function extractPermissionText(description) {
    const $ = cheerio.load(description)
    return $('h4:contains("Perm")').next('ul').text()
}