var Mongoose = require('mongoose');
var RuleSchema = new Mongoose.Schema({
    type: {type: String, required: true},
    condition: {type: String, required: true},
    method: {type: String, required: true},
    content: {type: String, required: true},
    count: {type: Number, required: true},
    createdBy: {type: String, required: true},

    dateCreated: {type: Date, default: Date.now}
});

module.exports = Mongoose.model('Rule', RuleSchema);