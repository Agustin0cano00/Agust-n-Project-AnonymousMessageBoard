'use strict';

var expect = require('chai').expect;
var mongoose = require('mongoose');

var Board = require('../models').Board;
var Thread = require('../models').Thread;
var Reply = require('../models').Reply;


module.exports = function (app) {

  app.route('/api/threads/:board')
    .get(function (req, res) {
      Board.findOne({ board_name: req.params.board })
        .populate({
          path: 'threads',
          select: '-reported -password',
          options: { limit: 10, sort: { bumped_on: -1 } },
          populate: {
            path: 'replies',
            model: 'Reply',
            options: { sort: { created_on: -1 } }
          }
        })
        .select('threads')
        .exec()
        .then(docs => {
          if (!docs)
            return res.status(500).json({ error: "Error while retrieving threads." });

          let threads = docs.threads.map(function (thread) {
            let replies = thread.replies ? thread.replies.slice(0, 3) : [];
            let threadReply = {
              _id: thread._id ? thread._id : null,
              text: thread.text ? thread.text : "",
              created_on: thread.created_on ? thread.created_on : null,
              bumped_on: thread.bumped_on ? thread.bumped_on : null,
              replies: replies,
              replycount: thread.replies ? thread.replies.length : 0
            }
            return threadReply;
          });

          return res.json(threads);
        })
        .catch(err => {
          return res.status(500).json({ error: err.message });
        });
    })
    .post(function (req, res) {
      if (!req.body.text || !req.body.delete_password) {
        return res.status(400).json({ error: "Text and delete password are required." });
      }

      let board;
      Board.findOne({ board_name: req.params.board })
        .then(doc => {
          if (doc)
            board = doc;
          else
            board = new Board({
              board_name: req.params.board
            });

          let newThread = new Thread({
            text: req.body.text,
            delete_password: req.body.delete_password,
            created_on: new Date(),
            bumped_on: new Date(),
            reported: false
          });

          board.threads.push(newThread);

          return Promise.all([newThread.save(), board.save()]);
        })
        .then(([newThread, board]) => {
          return res.redirect(`/b/${board.board_name}?_id=${newThread._id}`);
        })
        .catch(err => {
          return res.status(500).json({ error: err.message });
        });
    })
    .put(function (req, res) {
      if (!req.body.report_id) {
        return res.status(400).json({ error: "Report id is required." });
      }

      Thread.findOneAndUpdate(
        { _id: req.body.report_id },
        { $set: { reported: true } }
      )
        .then(doc => {
          if (!doc)
            return res.status(500).json({ error: "Couldn't report the thread." });
          return res.send('Report successful.');
        })
        .catch(err => {
          return res.status(500).json({ error: err.message });
        });
    })
    .delete(function (req, res) {
      if (!req.body.thread_id || !req.body.delete_password) {
        return res.status(400).json({ error: "Thread id and delete password are required." });
      }

      Board.findOne({ board_name: req.params.board })
        .populate({
          path: 'threads',
          match: {
            _id: req.body.thread_id,
            delete_password: req.body.delete_password
          }
        })
        .select('threads')
        .exec()
        .then(doc => {
          if (!doc || doc.threads.length === 0)
            return res.status(500).json({ error: 'Incorrect password.' });

          return Promise.all([
            Board.findOneAndUpdate({ board_name: req.params.board }, { $pull: { threads: req.body.thread_id } }),
            doc.threads[0].remove()
          ]);
        })
        .then(() => {
          return res.send('Delete successful.');
        })
        .catch(err => {
          return res.status(500).json({ error: err.message });
        });
    });

  app.route('/api/replies/:board')
    .get(function (req, res) {
      if (!req.query.thread_id) {
        return res.status(400).json({ error: "Thread id is required." });
      }

      Board.findOne({ board_name: req.params.board })
        .populate({
          path: 'threads',
          match: { _id: req.query.thread_id },
          populate: {
            path: 'replies',
            model: 'Reply',
            select: '-reported -password',
          }
        })
        .select('threads')
        .exec()
        .then(docs => {
          if (!docs || docs.threads.length === 0)
            return res.status(500).json({ error: "Thread not found." });

          return res.json(docs.threads[0]);
        })
        .catch(err => {
          return res.status(500).json({ error: err.message });
        });
    })
    .post(function (req, res) {
      if (!req.body.text || !req.body.delete_password || !req.body.thread_id) {
        return res.status(400).json({ error: "Text, delete password, and thread id are required." });
      }

      Board.findOne({ board_name: req.params.board })
        .populate({
          path: 'threads',
          match: { _id: req.body.thread_id }
        })
        .select('threads')
        .exec()
        .then(doc => {
          if (!doc || doc.threads.length === 0)
            return res.status(500).json({ error: "Thread not found." });

          let newReply = new Reply({
            text: req.body.text,
            delete_password: req.body.delete_password,
            created_on: new Date(),
            reported: false
          });

          doc.threads[0].bumped_on = new Date();
          doc.threads[0].replies.push(newReply);

          return Promise.all([newReply.save(), doc.threads[0].save()]);
        })
        .then(([newReply]) => {
          return res.redirect(`/b/${req.params.board}/${req.body.thread_id}`);
        })
        .catch(err => {
          return res.status(500).json({ error: err.message });
        });
    })
    .put(function (req, res) {
      if (!req.body.reply_id) {
        return res.status(400).json({ error: "Reply id is required." });
      }

      Reply.findOneAndUpdate(
        { _id: req.body.reply_id },
        { $set: { reported: true } }
      )
        .then(doc => {
          if (!doc)
            return res.status(500).json({ error: "Couldn't report the reply." });
          return res.send('Report successful.');
        })
        .catch(err => {
          return res.status(500).json({ error: err.message });
        });
    })
    .delete(function (req, res) {
      if (!req.body.thread_id || !req.body.reply_id || !req.body.delete_password) {
        return res.status(400).json({ error: "Thread id, reply id, and delete password are required." });
      }

      Board.findOne({ board_name: req.params.board })
        .populate({
          path: 'threads',
          match: { _id: req.body.thread_id },
          populate: {
            path: 'replies',
            model: 'Reply',
            match: {
              _id: req.body.reply_id,
              delete_password: req.body.delete_password
            }
          }
        })
        .select('replies')
        .exec()
        .then(doc => {
          if (!doc || doc.threads.length === 0 || doc.threads[0].replies.length === 0)
            return res.status(500).json({ error: 'Incorrect password.' });

          return Promise.all([
            Thread.findOneAndUpdate({ _id: req.body.thread_id }, { $pull: { replies: req.body.reply_id } }),
            doc.threads[0].replies[0].remove()
          ]);
        })
        .then(() => {
          return res.send('Delete successful.');
        })
        .catch(err => {
          return res.status(500).json({ error: err.message });
        });
    });

};
