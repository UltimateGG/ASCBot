const Discord = require('discord.js');

const questions = [
    {
        q: "What is your Minecraft username? (1/8)",
        color: "#FF0000",
        len: 3,
        weight: 1
    },
    {
        q: "How old are you? (2/8)",
        color: "#FF0000",
        len: 2,
        weight: 1
    },
    {
        q: "Do you have a microphone that you are willing to use? (3/8)",
        color: "#FF0000",
        len: 25,
        weight: 2
    },
    {
        q: "How many hours a day can you dedicate to staff duties? (4/8)",
        color: "#FF0000",
        len: 30,
        weight: 2
    },
    {
        q: "What is your past moderation experience? (5/8)",
        color: "#FF0000",
        len: 50,
        weight: 2
    },
    {
        q: "How did you find our server? (6/8)",
        color: "#FF0000",
        len: 60,
        weight: 3
    },
    {
        q: "In 3 or more sentences, explain why you want to be staff on our server. (7/8)",
        color: "#FF0000",
        len: 200,
        weight: 5
    },
    {
        q: "In 3 or more sentences, explain why we should pick you over other applicants. (8/8)",
        color: "#FF0000",
        len: 200,
        weight: 5
    }
];
const REC_SCORE = 20;
const CUSS_WORDS = ['fuck', 'shit', 'bitch', 'nigger', ' ass ', 'kill yourself'];

const apps = []; // Stores open aplications

const beginApplication = (message) => {
    if (apps.some(app => app.user.id == message.author.id)) return false;
    
    const app = {
        user: message.author,
        questions: JSON.parse(JSON.stringify(questions))
    };

    apps.push(app);

    const SENT = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setTitle('Application Started')
        .setDescription(`Hello ${message.author} I have started your application process in DMS.`);

    message.channel.send(SENT);
    nextQuestion(app, null, true);

    return true;
}

const nextQuestion = (app, answer, firstQ=false) => {
    let question;

    if (!firstQ) {
        const lquestion = app.questions.filter(q => !q.answered)[0]; // Find first unanswered question

        // App finished
        if (!lquestion) return endApp(app, 'All questions answered', true);

        lquestion.answered = true;
        lquestion.answer = answer;
    
        question = app.questions.filter(q => !q.answered)[0]; // Find next unanswered question

        if (!question) return endApp(app, 'All questions answered', true);
    } else {
        question = app.questions[0];
    }

    try {
        const questionEmbed = new Discord.MessageEmbed()
            .setTitle(question.q)
            .setColor(question.color);

        app.user.send(questionEmbed);
    } catch (e) {
        console.log('Error in application:');
        console.error(e);
        endApp(app, 'An internal error occured during this application');
    }
}

const onMessage = (message) => {
    // Check if any apps for this user open
    if (!apps.some(app => app.user.id == message.author.id) || message.channel.type !== 'dm') return;

    const found = apps.filter(app => app.user.id == message.author.id)[0];
    if (message.content && message.content.length > 1 && message.content.length < 1900) {
        // Answer received
        nextQuestion(found, message.content);
    } else {
        try {
            message.author.send(':x: Please provide a valid answer! (1-1,900 chars)');
        } catch (e) {}
    }
}

const endApp = (app, reason, cleanExit=false) => {
    try {
        const ended = new Discord.MessageEmbed()
            .setTitle('Application Complete')
            .setColor('#FF0000')
            .setDescription('Your application has been closed, reason: **' + reason + '**' + cleanExit ? '\nStaff will review your application shortly. You will be notified of the results.' : '')
            .setTimestamp();
        
        app.user.send(ended);
    } catch (e) {}

    if (!appComplete(app)) {
        try {
            app.user.send(':x: Error submitting your application, please contact an admin.');
        } catch (e) {}
    } 

    delete apps[apps.indexOf(app)];
}

const appComplete = (app) => {
    // Post to channel
    const main = require('./main');

    const finished = new Discord.MessageEmbed()
        .setTitle('New Staff Application')
        .setColor(main.MAIN_COLOR)
        .setFooter(`Application by: ${app.user.tag} (${app.user.id})`, app.user.avatarURL())
        .setTimestamp();

    
    const chan = main.bot.guilds.cache.get(main.GUILD_ID).channels.cache.find(c => c.name === main.STAFF_APPLICATIONS_CHANNEL);
    if (!chan) return false;

    let score = 0;

    app.questions.forEach((question, index) => {
        try {
            finished.addField(question.q, (question.answered ? question.answer : '[No answer provided]') + (index === 0 ? ` (https://namemc.com/search?q=${question.answer})` : ''));

            if (question.answered && question.answer.length >= question.len) score += question.weight;

            // Deduct for cuss words
            if (question.answered) {
                CUSS_WORDS.forEach(word => {
                    if (question.answer.toLowerCase().trim().includes(word)) score -= 3;
                });
            }
        } catch (e) {
            console.error(e)
        }
    });

    finished.addField('\u200b', '\u200b');
    finished.addField('Total Score', `**${score}/${REC_SCORE}** Recommended Choice: ` + ((score >= REC_SCORE) ? ':white_check_mark:' : ':x:'));

    chan.send(finished).then(embed => {
        embed.react('✅').then(() => {
            embed.react('❌');
        });
    });

    return true;
}

module.exports = {
    beginApplication,
    onMessage,
    apps
}
