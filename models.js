const mongoose = require('mongoose')
const { Schema } = mongoose

const date = new Date()

const ReplySchema = new Schema({
  text: {type: String, required: true},
  delete_password: {type: String, required: true},
  created_on: {type: Date, default: date},
  bumped_on: {type: Date, default: date},
  reported: {type: Boolean, default: false}
})

const Reply = mongoose.model('Reply', ReplySchema)

const ThreadSchema = new Schema({
  text: {type: String, required: true},
  delete_password: {type: String, required: true},
  created_on: {type: Date, default: date},
  bumped_on: {type: Date, default: date},
  reported: {type: Boolean, default: false},
  replies: [ReplySchema]
})

const Thread = mongoose.model('Thread', ThreadSchema)

const BoardSchema = new Schema({
  name: {type: String, require: true},
  threads: [ThreadSchema]
})

const Board = mongoose.model('Board', BoardSchema)

exports.Reply = Reply
exports.Thread = Thread
exports.Board = Board