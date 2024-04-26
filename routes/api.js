const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

app.use(bodyParser.urlencoded({ extended: false }));

const Boards = require("../models").Board;
const Threads = require("../models").Thread;
const Replys = require("../models").Reply;

module.exports = function(app) {
  //threads routing
  app.route('/api/threads/:board')
    .post(async (req, res) => {
      const boardName = req.params.board;
      const { text, delete_password } = req.body;
      const date = new Date();
      const hashedPassword = await bcrypt.hash(delete_password, 10);

      try {
        let board = await Boards.findOne({ name: boardName }).exec();

        if (!board) {
          board = new Boards({
            name: boardName,
            threads: [],
          });
        }

        const newThread = new Threads({
          text,
          created_on: date,
          bumped_on: date,
          reported: false,
          delete_password: hashedPassword,
          replies: [],
        });

        board.threads.push(newThread);
        await board.save();
        res.json(newThread);
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to save the thread.' });
      }
    })
    .get(async (req, res) => {
      const boardName = req.params.board;
      try {
        const board = await Boards.findOne({ name: boardName }).exec();
        if (!board) {
          return res.status(404).json({ error: 'Board not found' });
        }

        const threads = board.threads
          .sort((a, b) => b.bumped_on - a.bumped_on)
          .slice(0, 10)
          .map(thread => ({
            _id: thread._id,
            text: thread.text,
            created_on: thread.created_on,
            bumped_on: thread.bumped_on,
            replies: thread.replies
              .sort((a, b) => b.created_on - a.created_on)
              .slice(0, 3)
              .map(reply => ({
                _id: reply._id,
                text: reply.text,
                created_on: reply.created_on,
              })),
          }));
        res.json(threads);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve threads.' });
      }
    })
    .delete(async (req, res) => {
      const boardName = req.params.board;
      const { thread_id, delete_password } = req.body;

      try {
        let board = await Boards.findOne({ name: boardName }).exec();

        if (!board) {
          return res.status(404).json({ error: 'Board not found' });
        }

        const thread = board.threads.find(t => t._id.toString() === thread_id);

        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }

        const isPasswordCorrect = await bcrypt.compare(delete_password, thread.delete_password);

        if (!isPasswordCorrect) {
          return res.send('incorrect password');
        } else {
          board.threads = board.threads.filter(t => t._id.toString() !== thread_id);
          await board.save();
          console.log('success', thread_id);
          res.send('success');
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete the thread.' });
      }
    })
    .put(async (req, res) => {
      const boardName = req.params.board;
      const { thread_id } = req.body;

      try {
        const board = await Boards.findOne({ name: boardName }).exec();

        if (!board) {
          return res.status(404).json({ error: 'Board not found' });
        }

        const thread = board.threads.find(t => t._id.toString() === thread_id);

        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }

        thread.reported = true;
        await board.save();
        console.log('reported', thread_id);
        res.send('reported');
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to mark the thread as reported.' });
      }
    });
  // replies routing
  app.route('/api/replies/:board')
  .get(async (req, res) => {
    const boardName = req.params.board;
    const threadId = req.query.thread_id;
  
    try {
      const board = await Boards.findOne({ name: boardName }).exec();
  
      if (!board) {
        return res.status(404).json({ error: 'Board not found' });
      }
  
      if (threadId) {
        const thread = board.threads.find(t => t._id.toString() === threadId);
  
        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }
  
        const { text, created_on, bumped_on, replies, _id } = thread;
  
        const formattedReplies = replies.map(reply => ({
          _id: reply._id,
          text: reply.text,
          created_on: reply.created_on,
        }));
  
        res.json({ _id, text, created_on, bumped_on, replies: formattedReplies });
      } else {
        res.status(400).json({ error: 'Thread ID is missing in the query parameters' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to retrieve thread.' });
    }
  })  
    .post(async (req, res) => {
      const boardName = req.params.board;
      const { text, delete_password, thread_id } = req.body;
      const date = new Date();

      try {
        const board = await Boards.findOne({ name: boardName }).exec();

        if (!board) {
          return res.status(404).json({ error: 'Board not found' });
        }

        const thread = board.threads.find(t => t._id.toString() === thread_id);
        let hashedPassword = await bcrypt.hash(delete_password, 10);

        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }

        const newReply = {
          _id: new mongoose.Types.ObjectId(),
          text,
          created_on: date,
          bumped_on: date,
          delete_password: hashedPassword,
          reported: false,
        };

        thread.bumped_on = date;
        thread.replies.push(newReply);
        await board.save();
        res.json({ message: 'Reply added successfully' });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add a reply.' });
      }
    })
    .delete(async (req, res) => {
      const boardName = req.params.board;
      const { thread_id, reply_id, delete_password } = req.body;

      try {
        const board = await Boards.findOne({ name: boardName }).exec();

        if (!board) {
          return res.status(404).json({ error: 'Board not found' });
        }

        const thread = board.threads.find(t => t._id.toString() === thread_id);

        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }

        const reply = thread.replies.find(r => r._id.toString() === reply_id);

        if (!reply) {
          return res.status(404).json({ error: 'Reply not found' });
        }

        const isPasswordCorrect = await bcrypt.compare(delete_password, reply.delete_password);

        if (!isPasswordCorrect) {
          res.send('incorrect password');
        } else {
          reply.text = '[deleted]';
          await board.save();
          console.log('success', reply_id);
          res.send('success');
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete the reply.' });
      }
    })
    .put(async (req, res) => {
      const boardName = req.params.board;
      const { thread_id, reply_id } = req.body;

      try {
        const board = await Boards.findOne({ name: boardName }).exec();

        if (!board) {
          return res.status(404).json({ error: 'Board not found' });
        }

        const thread = board.threads.find(t => t._id.toString() === thread_id);

        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }

        const reply = thread.replies.find(r => r._id.toString() === reply_id);

        if (!reply) {
          return res.status(404).json({ error: 'Reply not found' });
        }

        reply.reported = true;
        await board.save();
        console.log('reported', reply_id);
        res.send('reported');
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to mark the reply as reported.' });
      }
    });
}