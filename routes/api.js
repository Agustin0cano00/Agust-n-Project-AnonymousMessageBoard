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
  .get(async (req, res) => {
    try {
      const board = req.params.board
      const threads = await ThreadModel.find({ board })
                                      .sort({ bumped_on: -1 })
                                      .limit(10)
                                      .select('-reported -delete_password')
                                      .populate({
                                        path: 'replies',
                                        options: {sort: { create_on: -1 }, limit: 3},
                                        select: '-reported -delete_password'
                                      })
                                      .exec()
      res.json(threads)
    } catch (err) {
      console.log(err)
      res.status(500).send("Error fetching threads")
    }
  })
  .put(async (req, res) => {
    try {
      const { board } = req.params
      const { thread_id } = req.body

      await ThreadModel.updateOne({ _id: thread_id, board }, { reported: true })

      res.send("reported")

    } catch (err) {
      console.error(err)
      res.status(500).send("Error updating thread")
    }
  })
  .delete(async (req, res) => {
    try {
      const { board } = req.params
      const { thread_id, delete_password } = req.body

      const deleteThread = await ThreadModel.findOneAndDelete({
        _id: thread_id,
        board,
        delete_password
      })

      if(!deleteThread) {
        res.send("incorrect password")
      } else {
        res.send("success")
      }

    } catch(err) {
      console.error(err)
      res.status(500).send("Error deleting thread")
    }
  })
  
    
  app.route('/api/replies/:board');

};
