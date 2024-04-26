const mongoose = require('mongoose');

// Connect to MongoDB without deprecated options
mongoose.connect(process.env.DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
     

module.exports = mongoose.connection;
