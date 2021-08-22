const OPEN_TICKET_ID = '868997731815927808';
const TICKETS_CATEGORY = 'TICKETS';
const TICKET_LOG = 'ticket-logs';
const Discord = require('discord.js');
const utils = require('./utils');
const fs = require('fs');
const path = require('path');

// Reaction in open ticket channel
const onReaction = (info, guild, msg) => {
    if (msg.id != OPEN_TICKET_ID) return;
    
    // Remove others reactions
    msg.reactions.cache.array().forEach(emoji => {
        emoji.users.fetch().then(users => {
            users.forEach(user => {
                if (user.bot) return;
                emoji.users.remove(user);
            });
        })
    });

    if (info.emoji.name === '🎟️') openTicket(info.member, guild);
}

const openTicket = (member, guild) => {
    const main = require('./main');
    const cat = guild.channels.cache.find(c => c.name === TICKETS_CATEGORY && c.type === 'category');
    if (!cat) return notifyInChannel(guild, 'Error Creating Ticket', `:x: <@${member.user.id}> something went wrong while trying to create your ticket, please try again shortly!`, main.RED);
    const staffRole = guild.roles.cache.find(r => r.name === main.STAFF_ROLE);

    if (guild.channels.cache.find(c => c.name === 't-' + member.user.id)) return notifyInChannel(guild, 'Error Creating Ticket', `:x: <@${member.user.id}>, it appears that you already have a support ticket open. Please use \`${main.PREFIX}close [reason]\` to close your ticket.`, main.RED, 8000);

    guild.channels.create('T-' + member.user.id, {
        type: 'text',
        parent: cat,
        permissionOverwrites: [
            {
                id: member.user.id,
                allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES', 'EMBED_LINKS']
            },
            {
                id: staffRole.id,
                allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES', 'EMBED_LINKS']
            },
            {
                id: guild.roles.everyone.id,
                deny: ['VIEW_CHANNEL', 'SEND_MESSAGES']
            },
        ]
    }).then(ticketChan => {
        notifyInChannel(guild, 'Ticket Opened', `:white_check_mark: <@${member.user.id}>, a new ticket has been opened for you in ${ticketChan}!`, main.GREEN);

        const ticketInfo = new Discord.MessageEmbed()
            .setTitle('New Ticket')
            .setColor(main.BLUE)
            .setDescription('Welcome to your ticket. Thank you for contacting support, please leave a detailed message explaining your issue. Use **'+ main.PREFIX +'close [reason]** to close this ticket at any time. This channel is a private conversation directly between you and the staff team.')
            .addField('Have a Question?', 'Please type a detailed question in this channel, and refrain from talking in public channels about ongoing conversations in tickets.')
            .addField('Buycraft/Purchase issue?', 'Please explain what you tried and what the problem is. **Note:** that buycraft purchases can take up to a few hours to go through, and an admin may have to refresh the queue for your purchase to go through, please be patient. If you have already purchased an item, please have your receipt or proof of purchase ready. Senior staff will take care of BuyCraft issues.')
            .addField('Found a bug or server issue?', 'If you found something that you believe to be unintentional behavior please leave a detailed message explaining what the bug is, **how to recreate it**, and the possible issues associated with this bug and/or the priority.')    
            .setFooter(guild.name + ' | Support', guild.iconURL());
        
        ticketChan.send(`Hello, <@${member.user.id}>.`, ticketInfo).catch(console.error);

        const ticketLog = new Discord.MessageEmbed()
            .setColor('#5de84a')
            .setTitle('New Ticket')
            .setDescription(`<@${member.user.id}> has opened a new ticket - ${ticketChan} (**${utils.getTime()}**)`);
        
        getLogsChan().send(`${guild.roles.cache.find(r => r.name === main.STAFF_ROLE)}`, ticketLog);
    });
}

const notifyInChannel = (guild, title, desc, color, timeAlive=5000) => {
    const notif = new Discord.MessageEmbed()
        .setTitle(title)
        .setColor(color && color.startsWith('#') ? color : `#${color}`)
        .setDescription(desc)
        .setTimestamp();
    
    guild.channels.cache.find(c => c.name === require('./main').OPEN_TICKET_CHANNEL).send(notif).then(msg => {
       msg.delete({ timeout: timeAlive }); 
    }).catch(console.error);
}

const onClose = (message) => {
    const reason = message.content.trim().split(' ').length < 2 ? 'No reason specified.' : message.content.replace(message.content.split(' ')[0]+' ', '');
    const main = require('./main');

    if (message.channel.name === TICKET_LOG) return message.reply(':x: To close a ticket, you must use this command in the ticket channel you want to close!');

    // If it is in ticket category and not ticket logs channel 
    if (message.guild.channels.cache.find(c => c.id == message.channel.parentID).name !== TICKETS_CATEGORY)
        return message.reply(':x: To close a ticket, you must use this command in the ticket channel you want to close!');

    message.channel.send(':red_square: Closing this ticket please wait...');
    const owner = message.guild.members.cache.get(message.channel.name.toLowerCase().replace('t-', ''));

    let transcript = '';
    message.channel.messages.fetch().then(messages => {
        messages = messages.array();
        messages.reverse();

        messages.forEach(msg => {
            try {
                transcript += `${msg.author.tag} (${msg.author.id}) [${utils.formatTime(msg.createdTimestamp)}]:\n${msg.content}\n\n`;
                msg.attachments.forEach(att => {
                    transcript += `${msg.author.tag} (${msg.author.id})\n [Attachment] [${utils.formatTime(msg.createdTimestamp)}]: URL: ${att.url}\n\n`;
                });
            } catch (e) {
                console.error(e);
            }
        });

        let fileName = `${message.channel.name} at ${Date.now()}.txt`;
        fs.writeFileSync(path.join(__dirname, '/transcripts/' + fileName), transcript);
        
        message.channel.delete();

        const ticketCloseLog = new Discord.MessageEmbed()
            .setColor('#e03434')
            .setTitle('Ticket Closed')
            .setDescription(`${message.author} has closed ticket \`${message.channel.name.trim()}\` (${owner}) (${utils.getTime()})\n**Reason:** ${reason}`);

        const logs = getLogsChan();
        logs.send(ticketCloseLog).then(() => {
            logs.send('Ticket Transcript:', { files: ['./transcripts/' + fileName] });
        });

        // DM user
        const transcriptOpt = !message.content.toLowerCase().includes('-nts');
        owner.send(`${message.author} has closed your **${main.BRAND}** support ticket \`${message.channel.name.trim()}\` (${utils.getTime()})\n**Reason:** ${reason.replace('-nts', '')}${transcriptOpt ? '\nTranscript:' : ''}`, {files: transcriptOpt ? ['./transcripts/'+fileName] : []}).catch(console.error);
    });
}

const getLogsChan = () => {
    const main = require('./main');
    return main.bot.guilds.cache.get(main.GUILD_ID).channels.cache.find(c => c.name === TICKET_LOG);
}

module.exports = {
    onReaction,
    onClose
}
