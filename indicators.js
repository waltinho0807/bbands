const tulind = require('tulind');
const axios = require('axios');
const {promisify} = require('util');

const bbands_async = promisify(tulind.indicators.bbands.indicator);
const rsi_async = promisify(tulind.indicators.rsi.indicator);

async function testCandles (){
    const response = await axios.get("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=30");
    let dados = response.data;
    let klinedata = dados.map((d) => ({
        time: d[0] / 1000,
        open: d[1] * 1,
        high: d[2] * 1,
        low: d[3] * 1,
        close: d[4] * 1,
        volume: d[5] * 1
      }));

      klinedata = await bbands_inc(klinedata, 21, 2);
      klinedata = await rsi_inc(klinedata, 14)
      console.log(klinedata)
}

testCandles()




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