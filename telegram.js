var Mongoose = require('mongoose');
var TelegramBot = require('node-telegram-bot-api');
var Config = require('./config.json');
var Rule = require('./model.js');

const NUMBER = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const IS_PROD = Config.is_production || Config.is_production === undefined;
const DB_CONNECTION = IS_PROD ? Config.mongodb : Config.dev_mongodb;
const API_KEY = IS_PROD ? Config.api_key : Config.dev_api_key;

Mongoose.connect(DB_CONNECTION);
var bot = new TelegramBot(API_KEY, {polling: true});

bot.on('message', function (msg) {
    if (!IS_PROD) {
        console.log(JSON.stringify(msg));
    }

    var chatId = msg.chat.id;
    var text = msg.text;

    // Add new rule
    if (text && /^@eric_mystic_bot/.test(text)) {
        try {
            var match = /^@eric_mystic_bot( repeat|) if (@[a-z0-9_]{5,}|\/.+\/) (message|sticker)( .+|)$/i.exec(text);
            if (match && match.length > 0) {
                var rule = new Rule();

                if (match[2][0] === '@') {
                    rule.type = 'username';
                    rule.condition = match[2].substring(1);
                }

                if (match[2][0] === '/') {
                    rule.type = 'word';
                    rule.condition = match[2].substring(1, match[2].length - 1);
                }

                rule.method = match[3];
                switch (rule.method) {
                    case 'message':
                        rule.content = match[4].substring(1);
                        break;
                    case 'sticker':
                        try {
                            rule.content = msg.reply_to_message.sticker.file_id;
                        }
                        catch (ex) {
                            respond(Config.rule_incomplete_sticker_id);
                            throw null;
                        }
                        break;
                    default:
                }

                rule.count = rule.type === 'word' && match[1] ? 1 : 0;
                rule.createdBy = msg.from.username;

                Rule.find(
                    {
                        type: rule.type,
                        condition: rule.condition,
                        method: rule.method,
                        content: rule.content,
                        count: rule.count
                    })
                    .exec(function (error, results) {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            if (results.length === 0) {
                                rule.save(function (error) {
                                    if (error) {
                                        console.log(error);
                                    }
                                    else {
                                        console.log('Rule added: ' + JSON.stringify(rule));
                                        respond(Config.rule_success_sticker_id);
                                    }
                                });
                            }
                            else respond(Config.rule_repeated_sticker_id);
                        }
                    });
            }
            else respond(Config.rule_failure_sticker_id);
        }
        catch (ex) {
            console.log(ex);
        }
    }
    else {
        if (msg.chat.type === 'group') {
            Rule.find(
                {
                    type: 'username',
                    condition: msg.from.username,
                    count: {$gte: 0}
                })
                .exec(function (error, results) {
                    if (error) {
                        console.log(error);
                    }
                    else {
                        if (results.length > 0) {
                            var index = Math.floor(Math.random() * results.length);

                            results[index].count = -1;
                            results[index].save(function (error) {
                                if (error) {
                                    console.log(error);
                                }
                                else {
                                    sendRule(results[index]);
                                }
                            });
                        }
                    }
                });

            Rule.find(
                {
                    type: 'word',
                    count: {$gte: 0}
                })
                .exec(function (error, results) {
                    if (error) {
                        console.log(error);
                    }
                    else {
                        var candidates = [];
                        for (var i = 0; i < results.length; i++) {
                            if (text && text.match(new RegExp(results[i].condition, 'i'))) {
                                candidates.push(results[i]);
                            }
                        }

                        if (candidates.length > 0) {
                            var index = Math.floor(Math.random() * candidates.length);

                            if (candidates[index].count === 0) {
                                candidates[index].count = -1;
                            }
                            candidates[index].save(function (error) {
                                if (error) {
                                    console.log(error);
                                }
                                else {
                                    sendRule(candidates[index]);
                                }
                            });
                        }
                    }
                });
        }
    }

    require('./secret.js')(bot, msg);

    // Helper
    function respond(stickerId) {
        bot.sendSticker(chatId, stickerId,
            {
                reply_to_message_id: msg.message_id
            });
    }

    function sendRule(rule) {
        switch (rule.method) {
            case 'message':
                var message = rule.content
                    .replace('{{creator}}', ' @' + rule.createdBy + ' ')
                    .replace('{{sender}}', ' @' + msg.from.username + ' ');

                bot.sendMessage(chatId, message,
                    {
                        reply_to_message_id: msg.message_id
                    });
                break;
            case 'sticker':
                bot.sendSticker(chatId, rule.content,
                    {
                        reply_to_message_id: msg.message_id
                    });
                break;
            default:
        }
    }
});