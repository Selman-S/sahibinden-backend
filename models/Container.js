const mongoose = require('mongoose');

const ContainerSchema = new mongoose.Schema({
  name: String,
  scriptContent: String,
  containerId: { type: String, unique: true },
});

module.exports = mongoose.model('Container', ContainerSchema);