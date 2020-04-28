const cheerio = require('cheerio');
const axios = require('axios');
const urlLib = require('url');

// const acceptedHosts = ["www.amazon.com.au","www.amazon.com"];

async function getItem(url) {
    let urlObj = urlLib.parse(url);
    let hostname = urlObj.hostname;
    if (hostname !== "www.amazon.com.au" && hostname !== "www.amazon.com") {
        console.log("Provided: " + hostname)
        return { error: true, hostname: hostname }
    }
    let targetUrl = (url.indexOf('?') > -1) ? url.split('?')[0] : url;
    let item = await axios.get(targetUrl, {headers: { 'User-Agent': 'Mozilla/5.0'}})
    .then(res => {
        const $ = cheerio.load(res.data);
        let rtn = {error:false}
        rtn.title = $('#productTitle').text().trim();
        rtn.category = $('.a-unordered-list.a-horizontal.a-size-small > li:first-child').text().trim();
        rtn.product = $('.a-unordered-list.a-horizontal.a-size-small > li:last-child').text().trim();
        // rtn.price = $('#priceblock_ourprice').text().trim().replace('$','')
        let priceElem = $('.a-size-medium.a-color-price');
        if (priceElem.length == 0) {
            priceElem = $('.offer-price');
        }
        rtn.price = parseFloat(priceElem.text().trim().replace('$','').replace(',',''));
        // rtn.price = parseFloat($('.a-size-medium.a-color-price').text().trim().replace('$',''));
        if (isNaN(rtn.price)) {
            rtn.price = parseFloat($('.offer-price').text().trim().replace('$',''));
        }
        return rtn
    })
    .catch(err => console.log("error occurred"))
    return item;
}

module.exports.getItem = getItem;