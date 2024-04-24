'use strict';

const ReplyModel = require('../models').Reply
const ThreadModel = require('../models').Thread
const BoardModel = require('../models').Board

module.exports = function (app) {
  
  app.route('/api/threads/:board').post(async (req, res) => {
    const { text, delete_password } = req.body;
    let board = req.body.board;
    if (!board) {
      board = req.params.board;
    }
  
    try {
      console.log('post', req.body);
      const newThread = new ThreadModel({
        text: text,
        delete_password: delete_password,
        replies: [],
      });
      console.log('newThread', newThread);
  
      let boardData = await BoardModel.findOne({ name: board });
      if (!boardData) {
        const newBoard = new BoardModel({
          name: board,
          threads: [newThread], 
        });
        console.log('newBoard', newBoard);
        await newBoard.save();
        console.log('newBoardData', newBoard);
        res.json(newThread);
      } else {
        boardData.threads.push(newThread);
        await boardData.save();
        res.json(newThread);
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("There was an error saving in post");
    }
  })
  .get((req, res) => {
    
  })
  
    
  app.route('/api/replies/:board');

};
