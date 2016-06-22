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
    var chatId = msg.chat.id;
    var text = msg.text;

    // Add new rule
    var match = /^@eric_mystic_bot( repeat \d|) if (@[a-z0-9_]{5,}|\/.+\/) (message) (.+)$/i.exec(text);
    if (match && match.length > 0) {
        var rule = new Rule();
        rule.method = match[3];
        rule.content = match[4];
        rule.count = match[1].substring(8) || 0;
        rule.createdBy = msg.chat.username;

        if (match[2][0] === '@') {
            rule.type = 'reply';
            rule.condition = match[2].substring(1);
        }

        if (match[2][0] === '/') {
            rule.type = 'send';
            rule.condition = match[2].substring(1, match[2].length - 1);
        }

        rule.save(function (error) {
            if (error) {
                console.log(error);
            }
            else {
                bot.sendSticker(chatId, 'BQADBQADPAADf47HAdmSv3VDIIAXAg',
                    {
                        reply_to_message_id: msg.message_id
                    });
            }
        });
    }
    else {
        Rule.find({type: 'reply', condition: msg.from.username, count: {$gte: 0}})
            .exec(function (error, results) {
                if (error) {
                    console.log(error);
                }
                else {
                    if (results.length > 0) {
                        var index = Math.floor(Math.random() * results.length);

                        results[index].count--;
                        results[index].save(function (error) {
                            if (error) {
                                console.log(error);
                            }
                            else {
                                bot.sendMessage(chatId, '*' + results[index].content + '*',
                                    {
                                        parse_mode: 'Markdown',
                                        reply_to_message_id: msg.message_id
                                    });
                            }
                        });
                    }
                }
            });

        Rule.find({type: 'send', count: {$gte: 0}})
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

                        candidates[index].count--;
                        candidates[index].save(function (error) {
                            if (error) {
                                console.log(error);
                            }
                            else {
                                bot.sendMessage(chatId, '*' + candidates[index].content + '*',
                                    {
                                        parse_mode: 'Markdown',
                                        reply_to_message_id: msg.message_id
                                    });
                            }
                        });
                    }
                }
            });
    }

    console.log(JSON.stringify(msg));
});