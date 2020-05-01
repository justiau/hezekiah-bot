const Discord = require('discord.js');
const sleepDur = 0;

const embedColour = '#3794be';
const footer = 'Made for Tehillah OTW - Hezekiah, 2020';

function sendEmbed(text, channel, title, fields) {
    let embed = new Discord.MessageEmbed().setDescription(text);
    if (title && title != "") embed.setTitle(title);
    if (fields) embed.addFields(fields);
    sendMsg(channel, embed);
}

function sendMsg(channel, messageEmbed) {
    messageEmbed.setColor(embedColour)
    messageEmbed.setFooter(footer);
    channel.send(messageEmbed);
}

function createStates(dicts) {
	let states = {}
	for (var dictKey in dicts) {
		let dict = dicts[dictKey];
		states[dict.name] = dict;
	}
	return states;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

module.exports = {
    sendEmbed: sendEmbed,
    createStates: createStates,
    sleep: sleep,
    sleepDur: sleepDur
}