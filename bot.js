const Discord = require('discord.js');
const client = new Discord.Client();

const auth = require('./auth.json');
var commands = require('./commands.json')

var util = require('./util');
var scrape = require('./scrape');
var fsmLib = require('./fsm');

let sendEmbed = util.sendEmbed;
let FSM = fsmLib.fsmFactory;

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
                channelStates[channel.id] = new FSM(channel);
            })
            break;
        case 'show':
            if (args.length > 1 && args[1] == 'all') {
                let fields = [];
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
        case 'buy':
            if (args.length < 2) {
                let title = "Purchase Failed";
                sendEmbed('User did not specify an Amazon product to purchase.', message.channel, title); return;
            }
            let item = await scrape.getItem(args[1]);
            if (item.error) {
                let title = "Purchase Failed";
                sendEmbed("The provided URL is not recognised as on www.amazon.com.au or www.amazon.com. Please try another one.", message.channel, title); return;
            } else if (isNaN(item.price)) {
                let title = "Purchase Failed";
                let fields = [{ name: "Current Budget", value: "$"+cState.budget }];
                sendEmbed("Sorry, the price could not be calculated for this URL. Please try another one.", message.channel, title, fields); return;
            } else if (item.price > cState.budget) {
                let title = "Purchase Failed";
                let fields = [
                    { name: "Item Cost", value: "$" + item.price.toFixed(2) },
                    { name: "Current Budget", value: "$" + cState.budget.toFixed(2) }
                ];
                sendEmbed("You have insufficient funds to purchase \"" + item.title + "\".", message.channel, title, fields);
            } else {
                let origBudget = cState.budget;
                cState.updateBudget(-item.price)
                cState.items.push(item);
                let title = "Purchase Successful";
                let fields = [
                    { name: "Title", value: item.title },
                    { name: "Price", value: "$" + item.price.toFixed(2) },
                    { name: "Initial Budget", value: "$" + origBudget.toFixed(2) },
                    { name: "Remaining Budget", value: "$" + cState.budget.toFixed(2) }
                ]
                sendEmbed("You have purchased " + item.title + " for $" + item.price.toFixed(2) + ".", message.channel, title, fields);
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
            let itemsCopy = cState.items;
            while (itemsCopy.length > 0) {
                let chunk = itemsCopy.slice(0,25);
                let fields = [];
                chunk.forEach(item => {
                    fields.push({name:item.product,value:item.title});
                })
                sendEmbed('',message.channel, 'Items', fields);
                itemsCopy = itemsCopy.slice(25);
            }
            break;
        case 'budget':
            sendEmbed('', message.channel, false, [{name: 'Current Budget', value:"$" + cState.budget}]);
            break;
        case 'choose':
            if (args.length > 1) {
                let choice = cState.dialogue[cState.index].options[args[1]];
                if (choice !== undefined) {
                    // ensure transition is valid
                    if (("transition" in choice) && (typeof(cState[choice.transition]) !== "function")) {
                        sendEmbed("Selection: \"" + args[1] + "\" caused invalid transition: \"" + choice.transition + "\" which is not in " + cState.state + "\'s transitions: " + cState.transitions(), message.channel);
                        cState.sendOptions();
                        return;
                    }
                    // if choice has a cost attached to it
                    if ("cost" in choice) {
                        if (choice["cost"] <= cState.budget) {
                            cState.updateBudget(-choice["cost"]);
                            sendEmbed("Remaining budget: $" + cState.budget.toFixed(2), message.channel);
                        } else {
                            let fields = [{ name: "Option Cost", value: "$" + choice["cost"].toFixed(2) },{ name: "Current Budget", value: "$" + cState.budget.toFixed(2) }];
                            sendEmbed("You have insufficient funds to select that option.", message.channel, "Selection Failed", fields);
                            cState.sendOptions();
                            return;
                        }
                    }
                    // if choice changes landing of other state
                    if ("updateDefaultLanding" in choice) {
                        for (var landingState in choice.updateDefaultLanding) {
                            // update fsm states dict to for new landing index for dialogue
                            cState.defaultLandings[landingState] = choice.updateDefaultLanding[landingState]
                        }
                    }
                    // if choice results in state transition
                    if ("transition" in choice) {
                        let resultVal = ("userSays" in choice) ? choice.userSays : choice.narrSays;
                        sendEmbed(resultVal,message.channel)
                        if ("landing" in choice) {
                            cState[choice.transition](choice.landing);
                        } else {
                            cState[choice.transition]();
                        }
                    } else if ("to" in choice) {
                        cState.choose(choice.to);
                    }
                } else {
                    sendEmbed('Provided command was not in list of options.', message.channel);
                    cState.sendOptions();
                }
            } else {
                sendEmbed('User did not specify an option to choose.', message.channel);
                cState.sendOptions();
            }
            break;
        case 'answer':
            if (args.length > 1) {

            } else {
                sendEmbed('User did not provide an answer.\nAnswer usage: `!answer thisismyanswer`', message.channel)
            }
            break;
        case 'help':
            let fields = [];
            for (var commandKey in commands) {
                fields.push({name:commandKey,value:commands[commandKey]})
            }
            sendEmbed('List of user commands:',message.channel,"Help",fields)
            break;
        }
}

client.login(auth.token);