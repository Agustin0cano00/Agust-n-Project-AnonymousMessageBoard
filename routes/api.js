'use strict';

const ReplyModel = require('../models').Reply
const ThreadModel = require('../models').Thread
const BoardModel = require('../models').Board

module.exports = function (app) {
  
  app.route('/api/threads/:board').post((req, res) => {
    const { text, delete_password } = req.body
    let board = req.body.board
    if(!board){
      board = req.params.board
    }
    console.log('post', req.body)
    const newThread = new ThreadModel({
      text: text,
      delete_password: delete_password,
      replies: [],
    })
    console.log('newThread', newThread)
    BoardModel.findOne({ name: board}, (err, BoardData) => {
      if(!BoardData){
        const newBoard = new BoardModel({
          name: board,
          threads: [], 
        })
        console.log('newBoard', newBoard)
        newBoard.threads.push(newThread)
        newBoard.save((err, data) => {
        console.log('newBoardData', data)
        if(err || data) {
          console.log(err)
          res.send("there was an error saving in post")
        } else {
          res.json(newThread)
        }
      })
      } else {
        BoardData.threads.push(newThread)
        BoardData.save((err, data) => {
          if(err || data) {
            console.log(err)
            res.send("there was an error saving in post")
          } else {
            res.json(newThread)
          }
        })
      }
    })
  })
    
  app.route('/api/replies/:board');

};
