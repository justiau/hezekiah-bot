const Discord = require('discord.js');
const auth = require('./auth.json')
const client = new Discord.Client();

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
    let args = message.content.substr(1).split(' ');
    switch(args[0]) {
        case 'start':
            message.channel.send('game start')
            // console.log(message.guild.channels.cache)
            message.guild.channels.cache.forEach(channel => {
                if (channel.type == "text") {
                    channels[channel.id] = {"state":"start","history":[],"checkpoint":0}
                }
            })
            // message.guild.channels
            break;
        case 'show':
            if (args.length > 1 && args[1] == 'all') {
                message.channel.send(JSON.stringify(channels));
            } else {
                if (message.channel.id in channels) {
                    message.channel.send(JSON.stringify(channels[message.channel.id]))
                } else {
                    message.channel.send("Current channel is not found in the channels dictionary.")
                }
            }
            console.log(channels)
            break;
    }
}

function handleUser(message) {
    let args = message.content.substr(1).split(' ');
    switch(args[0]) {
        case 'ping':
            message.channel.send('justin is the best');
            break;
    }
}

client.login(auth.token);