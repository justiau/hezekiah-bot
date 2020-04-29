const Discord = require('discord.js')

function sendEmbed(text, channel, title, fields) {
    const embed = new Discord.MessageEmbed()
        .setColor('#3794be')
        .setDescription(text)
        .setFooter('- HezekiahMAN')
    if (title && title != "") embed.setTitle(title);
    if (fields) embed.addFields(fields);
    channel.send(embed);
}

function sendReturnEmbed(stateDict, channel) {
    sendEmbed(stateDict.onEntry, channel);
    let fields = []
    for (var choiceKey in stateDict.choices) {
        fields.push({"name":choiceKey,"value":stateDict.choices[choiceKey].description})
    }
    sendEmbed("Please choose an option below.\nFor example, to choose __Option A__ please type: `!choose a`",channel,"",fields)
}

module.exports.sendEmbed = sendEmbed;
module.exports.sendReturnEmbed = sendReturnEmbed;