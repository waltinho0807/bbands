const WebSocket = require('ws');
const tulind = require('tulind');
const {promisify} = require('util');

const mongoose = require('mongoose');
const order = require("./model/Orders");

const ws = new WebSocket(`${STREAM_URL}/${SYMBOL.toLowerCase()}@ticker`);
const PROFIT = parseFloat(PROFITABLE);
let sellPrice = 0;

const bbands_async = promisify(tulind.indicators.bbands.indicator);
const rsi_async = promisify(tulind.indicators.rsi.indicator);

let response = 0
let klinedata = 0

connectDB()

ws.onmessage = async (event) =>  {
    //console.clear()
    obj = JSON.parse(event.data)
    console.log("Symbol:" + obj.s)
    console.log("Best ask:" + obj.a)
    
    
    response = await axios.get("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=30")
    
    let dados = response.data;
    
    klinedata = dados.map((d) => ({
        time: d[0] / 1000,
        open: d[1] * 1,
        high: d[2] * 1,
        low: d[3] * 1,
        close: d[4] * 1,
        volume: d[5] * 1
      }));
      
      klinedata = await bbands_inc(klinedata, 20, 2);
      klinedata = await rsi_inc(klinedata, 14)

      console.log(typeof(klinedata[klinedata.length - 1].bbands_fast))
      console.log(typeof(klinedata[klinedata.length - 1].rsi))

      let rsi = klinedata[klinedata.length - 1].rsi;
      let bbands_fast = parseFloat(klinedata[klinedata.length - 1].bbands_fast);


    const currentPrice = parseFloat(obj.a);
    
    if(sellPrice === 0 && currentPrice < bbands_fast && rsi <= 40) {
        console.log("bom para comprar");   
        newOrder("0.001", "BUY")
        sellPrice = currentPrice * PROFIT;

    }else if (sellPrice !== 0 && currentPrice >= sellPrice) {
        console.log("Bom para vender");
        newOrder("0.001", "SELL")
        sellPrice = 0;

    } else {
        console.log("Aguardando" + ' '+ sellPrice + ' ' + currentPrice)
    }
}

const axios = require('axios');
const crypto = require('crypto');
const { type } = require('os');

async function newOrder (quantity, side) {

   const data = {
    symbol: SYMBOL,
    type: 'MARKET',
    side,
    quantity
   };

   const timestamp = Date.now();
   const recvWindow = 60000;

   const signature = crypto
     .createHmac('sha256', SECRET_KEY)
     .update(`${new URLSearchParams({...data, timestamp, recvWindow})}`)
     .digest('hex');
    
    const newData = {...data, timestamp, recvWindow, signature} 
    const qs = `?${new URLSearchParams(newData)}`;

    try {
        const result = await axios({
            method: 'POST',
            url: `${API_URL}/v3/order${qs}`,
            headers: {'X-MBX-APIKEY': API_KEY}
        });

        

        let orderStruture = {
            orderId: result.data.orderId,
            symbol: result.data.symbol,
            quantity: result.data.origQty,
            side: result.data.side,
            price: result.data.fills[0].price
         }
         
         let newOrder = new order(orderStruture);

         await newOrder.save();

    } catch (error) {
        console.log(error)
    }
}

async function getCandles () {
    response = await axios.get("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=30")
    let dados = response.data;
    klinedata = dados.map((d) => ({
        time: d[0] / 1000,
        open: d[1] * 1,
        high: d[2] * 1,
        low: d[3] * 1,
        close: d[4] * 1,
        volume: d[5] * 1
      }));

    klinedata = await bbands_inc(klinedata, 20, 2);
    klinedata = await rsi_inc(klinedata, 14)

    return klinedata[klinedata.length - 1]
}

const bbands_inc = async (data, period, stddev) => {
    const d1 = data.map((d) => d.close);
    const results = await bbands_async([d1], [period, stddev]);
    const d2 = results[0];
    const diff = data.length - results[0].length;
    const emptyArray = [...new Array(diff)].map((d) => '');

    const bbands1 = [...emptyArray, ...results[0]];
    const bbands2 = [...emptyArray, ...results[1]];
    const bbands3 = [...emptyArray, ...results[2]];

    data = data.map((d, i) => ({
        ...d,
        bbands_fast: bbands1[i],
        bbands_slow: bbands2[i],
        bbands_histogram: bbands3[i],
    }));
    return data;

    
}

const rsi_inc = async (data,period) => {
    const d1 = data.map((d) => d.close);
    const results = await rsi_async([d1], [period]);
    const d2 = results[0];
    const diff = data.length - d2.length;
    const emptyArray = [...new Array(diff)].map((d) => '');
    const d3 = [...emptyArray, ...d2];
    data = data.map((d, i) => ({ ...d, rsi: d3[i] }));
    return data;
};

async function connectDB () {
    mongoose.connect(process.env.DATABASE_URL || DATABASE_URL).then(() => {
        console.log("conectado com o banco")
    });
}

