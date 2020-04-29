const Discord = require('discord.js');
const sleepDur = 0;

function sendEmbed(text, channel, title, fields) {
    const embed = new Discord.MessageEmbed()
        .setColor('#3794be')
        .setDescription(text)
        .setFooter('Made for Tehillah OTW - Hezekiah, 2020')
    if (title && title != "") embed.setTitle(title);
    if (fields) embed.addFields(fields);
    channel.send(embed);
}

async function sendReturnEmbed(stateDict, channel) {
    sendEmbed(stateDict.onEntry, channel);
    await sleep(sleepDur);
    let fields = []
    for (var choiceKey in stateDict.choices) {
        fields.push({"name":choiceKey,"value":stateDict.choices[choiceKey].description})
    }
    sendEmbed("Please choose an option below.\nFor example, to choose __Option A__ please type: `!choose a`",channel,"",fields)
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}   

module.exports = {
    sendEmbed: sendEmbed,
    sendReturnEmbed: sendReturnEmbed,
    sleep: sleep,
    sleepDur: sleepDur
}