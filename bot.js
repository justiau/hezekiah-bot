const Discord = require('discord.js');
const client = new Discord.Client();
const urlLib = require('url');

const auth = require('./auth.json');
var commands = require('./commands.json')
var util = require('./util');
var scrape = require('./scrape');

var {act1Factory, act2Factory, act3Factory} = require('./fsm');

let sendEmbed = util.sendEmbed;

var channelStates = {}
// id is for mr swaglord22
const adminID = '229426575731326976';

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', message => {
    if (message.author.bot || message.content.substr(0,1) != '!') return;
    if (message.author.id == adminID) handleAdmin(message);
    if (message.channel.id in channelStates) handleUser(message);
});

function handleAdmin(message) {
    let args = message.content.toLowerCase().substr(1).split(' ');
    switch(args[0]) {
        case 'start':
            message.guild.channels.cache.forEach(channel => {
                if (channel.type !== "text") return;
                channelStates[channel.id] = new act1Factory(channel);
            })
            break;
        case 'show':
            if (args.length > 1 && args[1] == 'all') {
                var fields = [];
                for (var key in channelStates) {
                    fields.push({name: key, value: channelStates[key].toString()})
                }
                sendEmbed("Showing states for all channels.",message.channel,"",fields);
            } else {
                if (message.channel.id in channelStates) {
                    sendEmbed(channelStates[message.channel.id].toString(),message.channel);
                } else {
                    sendEmbed("Current channel is not found in the channels dictionary.",message.channel);
                }
            }
            console.log(channelStates)
            break;
    }
}

async function handleUser(message) {
    let cState = channelStates[message.channel.id]
    let args = message.content.substr(1).split(' ');
    switch(args[0].toLowerCase()) {
        case 'ping':
            sendEmbed('justin is the best', message.channel);
            break;
        case 'begin':
            if (cState.state == "finish") {
                if (cState.act == 0) {
                    channelStates[message.channel.id] = new act2Factory(cState.channel, cState.budget, cState.items);
                } else if (cState.act == 1) {
                    channelStates[message.channel.id] = new act3Factory(cState.channel, cState.budget, cState.items);
                } else {
                    console.log("begin called in act 3 or unknown act");
                }
            } else if (cState.mode == "spam") {
                sendEmbed("Race has started! Type and send `!" + cState.spamState.keyword + "` as many times as you can!",message.channel,"RACE STARTED");
                cState.startSpam();
            } else {
                sendEmbed("This command is not available right now.")
            }
            break;
        case 'act':
            if (message.author.id != adminID) return;
            if (args.length < 2) sendEmbed('Please specify an Act to go to.');
            if (args[1] >= 1 && args[1] <= 3) {
                console.log("Going to act: " + args[1])
                switch(args[1]) {
                    case "1":
                        channelStates[message.channel.id] = new act1Factory(cState.channel);
                        break;
                    case "2":
                        channelStates[message.channel.id] = new act2Factory(cState.channel);
                        break;
                    case "3":
                        channelStates[message.channel.id] = new act3Factory(cState.channel);
                        break;
                }
            }
            break;
        case 'buy':
            if (args.length < 2) {
                let title = "Purchase Failed";
                sendEmbed('User did not specify an item to purchase.', message.channel, title); return;
            }
            let urlObj = urlLib.parse(args[1]);
            let queryStr;
            let item;
            let method;
            if (urlObj.hostname === null) {
                queryStr = args.slice(1).join(' ');
                item = cState.getShopItem(queryStr);
                method = "local";
            } else {
                if (cState.state != "internet" && cState.index != 1) {
                    sendEmbed("You aren't connected to the internet right now!",message.channel,"Purchase Failed");
                    return;
                }
                item = await scrape.getItem(args[1]);
                method = "online";
            }
            if (item === null) {
                let title = "Purchase Failed";
                let desc = (method == "local") ?
                    "The provided item: " + queryStr + " was not found in the shop.":
                    "The provided URL is not recognised as on www.amazon.com.au or www.amazon.com. Please try another one.";
                sendEmbed(desc, message.channel, title); return;
            } else if (isNaN(item.price)) {
                let title = "Purchase Failed";
                var fields = [{ name: "Current Budget", value: "$"+cState.budget }];
                let desc = (method == "local") ?
                    "The price for that item could not be calculated" :
                    "The price could not be calculated for this URL. Please try another one.";
                sendEmbed(desc, message.channel, title, fields); return;
            } else {
                cState.buyItem(item);
            }
            break;
        case 'add':
            if (message.author.id != adminID) return;
            if (args.length > 1) {
                let amount = parseFloat(args[1]);
                if (isNaN(amount)) {
                    sendEmbed("Invalid number specified.", message.channel);
                } else {
                    cState.updateBudget(amount);
                    sendEmbed('Added $' + amount.toFixed(2) + ' to budget.', message.channel);
                }
            }
            break;
        case 'items':
            cState.sendItems();
            break;
        case 'budget':
            cState.sendBudget();
            break;
        case 'choose':
            if (args.length > 1) {
                let choiceIndex = (args[1].length == 1) && (args[1].toLowerCase().charCodeAt(0) - 97);
                let choice = cState.options[choiceIndex];
                if (choice !== undefined) {
                    cState.choose(choice);
                } else {
                    sendEmbed('Provided command was not in list of options.', message.channel);
                    cState.sendOptions();
                }
            } else {
                sendEmbed('User did not specify an option to choose.', message.channel);
                cState.sendOptions();
            }
            break;
        case 'options':
            cState.sendOptions();
            break;
        case 'run':
            if (cState.mode == "spam") cState.spamState.count++;
            break;
        case 'help':
            console.log(fields)
            var fields = [];
            for (var commandKey in commands) {
                fields.push({name:commandKey,value:commands[commandKey]})
            }
            sendEmbed('List of user commands:',message.channel,"Help",fields)
            break;
        }
}

client.login(auth.token);