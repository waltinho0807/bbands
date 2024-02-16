const mongoose = require('mongoose');

const Order = mongoose.Schema(
    {
      orderId: Number,
      symbol: String,
      quantity: String,
      side: String,
      price: String,
    },
    {
      timestamps: true,
    }
  );
  
  module.exports =  mongoose.models.Order || mongoose.model("Order", Order);