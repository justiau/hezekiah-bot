const Discord = require('discord.js');
const auth = require('./auth.json')
const client = new Discord.Client();

var scrape = require('./scrape')

const channels = {}
// id is for mr swaglord22
const adminID = '229426575731326976'

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', message => {
    if (message.author.bot || message.content.substr(0,1) != '!') return;
    if (message.author.id == adminID) handleAdmin(message);
    if (message.channel.id in channels) handleUser(message);
});

function handleAdmin(message) {
    let args = message.content.toLowerCase().substr(1).split(' ');
    switch(args[0]) {
        case 'start':
            let startStr = (Object.keys(channels).length === 0) ? 'game start' : 'game restart';
            sendEmbed(startStr,message.channel)
            message.guild.channels.cache.forEach(channel => {
                if (channel.type == "text") {
                    channels[channel.id] = {"section":"start","history":[],"checkpoint":0,"budget":0,"items":[]}
                }
            })
            break;
        case 'show':
            if (args.length > 1 && args[1] == 'all') {
                sendEmbed(JSON.stringify(channels),message.channel);
            } else {
                if (message.channel.id in channels) {
                    sendEmbed(JSON.stringify(channels[message.channel.id]),message.channel);
                } else {
                    sendEmbed("Current channel is not found in the channels dictionary.",message.channel);
                }
            }
            console.log(channels)
            break;
    }
}

async function handleUser(message) {
    let cState = channels[message.channel.id]
    let args = message.content.substr(1).split(' ');
    switch(args[0].toLowerCase()) {
        case 'ping':
            sendEmbed('justin is the best', message.channel)
            break;
        case 'buy':
            if (args.length < 2) {
                let title = "__Purchase Failed__";
                sendEmbed('User did not specify an Amazon product to purchase.', message.channel, title); return;
            }
            let item = await scrape.getItem(args[1]);
            if (item.error) {
                let title = "__Purchase Failed__";
                sendEmbed("The provided URL is not recognised as on www.amazon.com.au or www.amazon.com. Please try another one.", message.channel, title); return;
            }
            if (isNaN(item.price)) {
                let title = "__Purchase Failed__";
                let fields = [{ name: "Current Budget", value: "$"+cState.budget }]
                sendEmbed("Sorry, the price could not be calculated for this URL. Please try another one.", message.channel, title, fields); return;
            }
            if (item.price <= cState.budget) {
                let origBudget = cState.budget;
                cState.budget = Math.round((cState.budget - item.price + Number.EPSILON) * 100) / 100;
                cState.items.push(item);
                let title = "__Purchase Successful__";
                let fields = [
                    { name: "Title", value: item.title },
                    { name: "Price", value: "$" + item.price.toFixed(2) },
                    { name: "Initial Budget", value: "$" + origBudget.toFixed(2)},
                    { name: "Current Budget", value: "$" + cState.budget.toFixed(2) }
                ]
                sendEmbed("You have purchased " + item.title + " for $" + item.price + ".", message.channel, title, fields)
            } else {
                let title = "__Purchase Failed__";
                let fields = [
                    { name: "Item Cost", value: "$" + item.price.toFixed(2) },
                    { name: "Current Budget", value: "$" + cState.budget.toFixed(2) }
                ]
                sendEmbed("You have insufficient funds to purchase \"" + item.title + "\".", message.channel, title, fields)
            }
            break;
        case 'add':
            if (message.author.id != adminID) return;
            if (args.length > 1) {
                let amount = parseInt(args[1]);
                if (isNaN(amount)) {
                    sendEmbed("Invalid number specified.", message.channel)
                } else {
                    cState.budget+=amount;
                    sendEmbed('Added $' + amount + ' to budget.', message.channel)
                }
            }
            break;
        case 'items':
            let itemsCopy = cState.items;
            while (itemsCopy.length > 0) {
                let chunk = itemsCopy.slice(0,25);
                let fields = []
                chunk.forEach(item => {
                    fields.push({name:item.product,value:item.title})
                })
                sendEmbed('',message.channel, 'Items', fields)
                itemsCopy = itemsCopy.slice(25);
            }
    }
}

function sendEmbed(text, channel, title, fields) {
    const embed = new Discord.MessageEmbed()
        .setColor('#3794be')
        .setDescription(text)
        .setFooter('- HezekiahMAN')
    if (title) embed.setTitle(title);
    if (fields) embed.addFields(fields);
    channel.send(embed)
}

client.login(auth.token);