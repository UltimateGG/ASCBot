require('dotenv').config();
const Discord = require('discord.js');
const bot = new Discord.Client();
const apps = require('./applications');
const tickets = require('./tickets');

// ========== SETTINGS ==========

// General Settings
const PREFIX = '.';
const GUILD_ID = '753423303707852960';
const APPLICATIONS_OPEN = true;
const OPEN_TICKET_CHANNEL = 'open-ticket';
const STAFF_APPLICATIONS_CHANNEL = 'staff-applications';

// Permission Settings
const STAFF_ROLE = 'Staff Team';
const MEMBER_ROLE = 'Member';

// Branding Settings
const BRAND = 'ASC';
const TYPE = 'Skyblock';
const SERVER_IP = '[UNKNOWN]';
const MAIN_COLOR = '#2a8ee0';
const BLUE = '#0377fc';
const LBLUE = '#0099ff';
const RED = '#e33232';
const GREEN = '#32e34f';


const NO_ACCESS = new Discord.MessageEmbed()
    .setTitle('No Permission')
    .setColor(RED)
    .setDescription('I\'m sorry, but you do not have permission to perform this command. Please contact the server administrator if you believe that this is an error.')
    .setTimestamp();

// System Variables
const RATELIMITS = [];

// Ready Event
bot.on('ready', () => {
    console.log('Bot logged in as: ' + bot.user.tag);

    bot.user.setActivity(`for ${PREFIX}help`, { type: 'WATCHING' });
});

// Join/Leave Events
bot.on('guildMemberAdd', member => {
    const welcome = new Discord.MessageEmbed()
        .setTitle(`Welcome to the ${BRAND} ${TYPE} server!`)
        .setColor(MAIN_COLOR)
        .setDescription(`Welcome, ${member} (**${member.user.tag}**) to the server!`)
        .setTimestamp()
        .setFooter(member.id, member.user.avatarURL());

    member.guild.systemChannel.send(welcome);
    member.roles.add(member.guild.roles.cache.find(r => r.name === MEMBER_ROLE));
});

bot.on('guildMemberRemove', member => {
    const goodbye = new Discord.MessageEmbed()
        .setTitle(`Goodbye`)
        .setColor(RED)
        .setDescription(`**${member.user.tag}** has left the server.`)
        .setTimestamp()
        .setFooter(member.id, member.user.avatarURL());
    
    member.guild.systemChannel.send(goodbye);
});


// Message Event
bot.on('message', message => {
    // Filter
    if (message.channel.type == 'dm') return apps.onMessage(message);
    if (!message.guild || message.guild.id !== GUILD_ID) return; 
    if (message.author.bot || !message.member) return;

    // Ratelimiting
    if (!message.member.roles.cache.find(r => r.name === STAFF_ROLE)) {
        if (RATELIMITS.some(rl => rl.user == message.author.id)) {
            const MIN_TIME = 2000; // X sec between each command
            if ((Date.now() - RATELIMITS.filter(rl => rl.user == message.author.id)[0].time) < MIN_TIME) return;
            RATELIMITS.filter(rl => rl.user == message.author.id)[0].time = Date.now();
        } else {
            RATELIMITS.push({
                user: message.author.id + '',
                time: Date.now()
            });
        }
    }


    /*
     * ===========================================
     *              STAFF COMMANDS
     * ===========================================
     */
    if (message.content.toLowerCase().startsWith(PREFIX+'purge')) {
        if (message.member.roles.cache.find(r => r.name === STAFF_ROLE)) {
            let amount = Number(message.content.split(' ')[1]);
            if (isNaN(amount)) return message.reply('Invalid use of this command, ' + PREFIX + 'purge <amount>');
            amount = Math.round(amount);
            amount = Math.max(1, amount);
            amount = Math.min(100, amount);

            message.channel.bulkDelete(amount).then(() => {
               message.reply(':white_check_mark: Deleted ' + amount + ' message(s)!').then(temp => {
                   temp.delete({ timeout: 2500 });
               }); 
            });
        } else {
            message.channel.send(NO_ACCESS);
        }
    }

    else if (message.content.toLowerCase().startsWith(PREFIX+'ban')) {
        if (message.member.roles.cache.find(r => r.name === STAFF_ROLE)) {
            let user = message.mentions.users.first() || message.guild.members.cache.get(message.content.split(' ')[1]).user;
            let reason = message.content.replace(message.content.split(' ')[0] + ' ' + message.content.split(' ')[1] + ' ', '') || '[No reason provided]';
            if (reason.toLowerCase().startsWith(PREFIX + 'ban')) reason = '[No reason provided]';
            if (!user) return message.reply(':x: Invalid use of this command, ' + PREFIX + 'ban <@user> [reason]');

            const guild_user = message.guild.members.cache.get(user.id);
            if (guild_user) {
                if (guild_user.hasPermission('BAN_MEMBERS') || guild_user.roles.cache.find(r => r.name === STAFF_ROLE)) return message.reply(':x: You cannot ban that member since they are staff!');

                const BAN_EMBED_S = new Discord.MessageEmbed()
                        .setTitle('You have been banned')
                        .setColor(RED)
                        .setDescription(`You have been banned from **${message.guild.name}** by ${message.author} (${message.author.tag}) for: "**${reason}**"!`)
                        .setTimestamp();

                try {
                    user.send(BAN_EMBED_S).then(() => {
                        execute();
                    });
                } catch (e) {
                    execute();
                }

                function execute() {
                    message.guild.members.ban(user.id, { reason }).then(() => {
                        const BAN_EMBED = new Discord.MessageEmbed()
                            .setTitle('User Banned')
                            .setColor(MAIN_COLOR)
                            .setDescription(`:white_check_mark: ${message.author} (${message.author.id}) has banned ${user} (${user.tag} - ${user.id}) for: "**${reason}**"!`)
                            .setTimestamp();
    
                        const LOGS = message.guild.channels.cache.find(c => c.name === 'logs');
                        if (LOGS) LOGS.send(BAN_EMBED);
                        return message.channel.send(BAN_EMBED);
                    });
                }
            } else {
                message.reply(':x: User not found in this server!');
            }
        } else {
            message.channel.send(NO_ACCESS);
        }
    }

    else if (message.content.startsWith(PREFIX + 'mute')) {
        if (message.member.roles.cache.find(r => r.name === STAFF_ROLE)) {
            let tagged = message.mentions.users.first();

            if (!tagged) {
                message.reply('Invalid use of this command, **/mute <@user>**');
            } else {
                message.channel.send(`${tagged} has been muted!`);
                message.guild.channels.cache.array().forEach(channel => {
                    channel.createOverwrite(tagged, {
                        SEND_MESSAGES: false,
                        ADD_REACTIONS: false
                    });
                });
            }
        } else {
            message.channel.send(NO_ACCESS);
        }
    }

    else if (message.content.startsWith(PREFIX + 'unmute')) {
        if (message.member.roles.cache.find(r => r.name === STAFF_ROLE)) {
            let tagged = message.guild.member(message.mentions.users.first());

            if (!tagged) {
                message.reply('Invalid use of this command, **/unmute <@user>**');
            } else {
                message.channel.send(`${tagged} has been unmuted!`);
                message.guild.channels.cache.array().forEach(channel => {
                    channel.createOverwrite(tagged, {
                        SEND_MESSAGES: null,
                        ADD_REACTIONS: null
                    });
                });
            }
        } else {
            message.channel.send(NO_ACCESS);
        }
    }


    /*
     * ===========================================
     *             GENERAL COMMANDS
     * ===========================================
     */
    else if (message.content.toLowerCase().startsWith(PREFIX+'ip') || message.content.toLowerCase().startsWith(PREFIX+'serverip') || message.content.toLowerCase().startsWith(PREFIX+'server-ip')) {
        const IP_EMBED = new Discord.MessageEmbed()
            .setTitle(BRAND + ' Server IP')
            .setDescription(`Join our ${TYPE} server at: \`${SERVER_IP}\`!`)
            .setColor(GREEN);
        
        message.channel.send(IP_EMBED);
    }

    else if (message.content.toLowerCase().startsWith(PREFIX+'poll')) {
        const msg = message.content.replace(message.content.split(' ')[0]+' ', '');

        if (!msg || message.content.split(' ').length < 2) return message.reply(':x: Invalid use of this command, ' + PREFIX + 'poll <message>');
        if (msg.length > 700) return message.reply(':x: Please limit your poll message to 700 characters or less!');

        const POLL_EMBED = new Discord.MessageEmbed()
            .setTitle('Vote')
            .setDescription(`${msg}`)
            .setColor(MAIN_COLOR)
            .setTimestamp()
            .setFooter(`Poll by ${message.author.tag} (${message.author.id})`, message.author.avatarURL());
        
        const channel = message.guild.channels.cache.find(c => c.name === 'polls');
        if (!channel) return message.reply(':x: Something went wrong, please try again later.');

        channel.send(POLL_EMBED).then(embed => {
            embed.react('✅').then(() => {
                embed.react('❌').then(() => {
                    message.reply(`:white_check_mark: Posted your poll in ${channel}!`);
                });
            });
        });
    }

    else if (message.content.toLowerCase().startsWith(PREFIX+'apply')) {
        if (APPLICATIONS_OPEN) {
            if (apps.apps.some(app => app.user.id == message.author.id)) return message.channel.send(`:x: ${message.author}, it appears you already have an application open!`);

            const START = new Discord.MessageEmbed()
                .setColor(MAIN_COLOR)
                .setTitle(BRAND + ' | Application Started')
                .setDescription('Application has been started.');
	
			message.author.send(START).then(() => {
                // Run application
                apps.beginApplication(message);
            }).catch(() => {
                message.reply(':x: Failed to start application, please update your privacy settings so I can DM you!');
            });
        } else {
            const embed = new Discord.MessageEmbed()
                .setTitle(BRAND + ' Applications')
                .setColor(RED)
                .setDescription(`Sorry, applications to **${BRAND}** are currently closed, please try again later!`);

            message.channel.send(embed);
        }
    }

    else if (message.content.toLowerCase().split(' ')[0] == PREFIX + 'close') {
        tickets.onClose(message);
    }

    // Embed creation util
    else if (message.content.toLowerCase().startsWith(PREFIX+'embed') && message.author.id === '853068341307506708') {
        const dab = new Discord.MessageEmbed()
            .setTitle(message.guild.name + ' | **Support**')
            .setColor(LBLUE)
            .setDescription(':lock: React to the emoji below to create a ticket.');
        
        message.channel.send(dab).then((dablit) => {
            dablit.react('🎟️'); // Ticket emoji
            console.log('Created new message with ID: ' + dablit.id);
        });
    }

    else if (message.content.toLowerCase().startsWith(PREFIX+'help')) {
        const help = new Discord.MessageEmbed()
            .setTitle(BRAND + ' Bot Commands')
            .setColor(MAIN_COLOR)
            .setDescription('**<>** means required, **[]** means optional parameter')
            .addField(PREFIX + 'ip', 'Get the Minecraft server IP')
            .addField(PREFIX + 'close [reason]', 'Close your support ticket if you have one open')
            .addField(PREFIX + 'poll <message>', 'Post a poll up for community vote')
            .addField(PREFIX + 'apply', 'Start a new application to apply for staff')
        
        message.channel.send(help);
    }
});


// Raw packet event for reactions
bot.on('raw', async raw => {
    if (raw.t == 'MESSAGE_REACTION_ADD') {
        if (raw.d.user_id == bot.user.id) return;
        const info = raw.d;
        const guild = bot.guilds.cache.get(GUILD_ID);

		if (guild.channels.cache.find(c => c.id == info.channel_id)) {
            const channel = guild.channels.cache.find(c => c.id == info.channel_id);

            channel.messages.fetch(info.message_id).then(msg => {
                if (channel.name === STAFF_APPLICATIONS_CHANNEL) onReactionApplications(info, guild, msg);
                else if (channel.name === OPEN_TICKET_CHANNEL) tickets.onReaction(info, guild, msg);
            });
        }
    }
});

function onReactionApplications(info, guild, msg) {
    if (!msg.embeds || msg.embeds.length < 1 || !msg.embeds[0].footer || !msg.embeds[0].footer.text) return; 
    let discordid = msg.embeds[0].footer.text.split('(')[1].replace(')', '');

    // Accepted
    if (info.emoji.name == '✅') {
        guild.members.fetch(discordid).then((member) => {
            let accepted = new Discord.MessageEmbed()
                .setTitle('**You Have Been Accepted**')
                .setColor(GREEN)
                .setThumbnail(bot.user.avatarURL())
                .addField('__Information:__', 'You have been given Pending-Interview Role... \nContinue on with the application process!');

            member.send(accepted).catch(console.error);
            member.roles.add(guild.roles.cache.find(r => r.name === 'Pending Interview'));
        }).catch(console.error);
    }
    
    // Denied
    if (info.emoji.name == '❌') {
        guild.members.fetch(discordid).then((member) => {
            let denied = new Discord.MessageEmbed()
                .setTitle('**You Have Been Denied**')
                .setColor('#FF0000')
                .setThumbnail(bot.user.avatarURL())
                .addField('__Information:__', `Your Application to ${BRAND} has been denied, \nFeel free to re-apply in 2 weeks.`);

            member.send(denied).catch(console.error);
        }).catch(console.error);
    }
}

// End
bot.login(process.env.TOKEN);

module.exports = {
    bot,
    GUILD_ID,
    MAIN_COLOR,
    RED,
    GREEN,
    BLUE,
    LBLUE,
    PREFIX,
    STAFF_ROLE,
    STAFF_APPLICATIONS_CHANNEL,
    OPEN_TICKET_CHANNEL,
    BRAND,
    TYPE
};
