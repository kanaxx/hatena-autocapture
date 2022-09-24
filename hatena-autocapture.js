//prepare
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Tokyo'); 

const puppeteer = require('puppeteer');
const cloudinary = require('cloudinary')
const fs = require('fs');

// for pupetter
const viewPoint = {width:1000, height:800};
const captureOffset = {x:240, y:40};
const captureClipArea = { x:captureOffset.x, y:captureOffset.y, width:(viewPoint.width - captureOffset.x), height:viewPoint.height};
const puppeteerOptions = { headless: true, slowMo:100, ignoreHTTPSErrors: true };

// env 
const HATENA_ID = process.env.HATENA_ID;
const HATENA_PASS = process.env.HATENA_PASS;
const BLOG_ADMIN_URL = process.env.BLOG_ADMIN_URL;

// other
const retryMax = 5;
let loginSuccess = false;

//class 
class Hatena {
  static imageDir = './captures/';
  static fileFormat = 'png';

  constructor(url, name) {
    this.url = url;
    this.name = name;
    this.baseFileName = moment().format('YYYYMMDD-HHmmss');
  }
  getUrl(){
    return this.url;
  }
  getName(){
    return this.name;
  }
  getFileName(){
    return this.baseFileName + '_' + this.name + '.' + Hatena.fileFormat;
  }
  getFilePath(){
    return Hatena.imageDir + this.getFileName();
  }
}

//main start
console.info('%s > Start program', moment().format('YYYY-MM-DD HH:mm:ss'));

const hatenaTop = new Hatena(BLOG_ADMIN_URL, 'hatena-top');
const hatenaAccessLog = new Hatena(BLOG_ADMIN_URL+ 'accesslog', 'hatena-accesslog');


if( !HATENA_ID || !HATENA_PASS || !BLOG_ADMIN_URL){
  console.error('環境変数がセットされていません');
  process.exit(1);
}

if (!fs.existsSync(Hatena.imageDir)){
    fs.mkdirSync(Hatena.imageDir);
}

(async () => {
  const browser = await puppeteer.launch(puppeteerOptions);

  const page = (await browser.pages())[0];
  await page.setExtraHTTPHeaders({'Accept-Language': 'ja'});
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36');
  await page.setViewport({ width:viewPoint.width, height:viewPoint.height });

  console.info('%s > Hatena Login', moment().format('YYYY-MM-DD HH:mm:ss'));
  loginSuccess = await loginHatena(page, HATENA_ID, HATENA_PASS);
  
  if(!loginSuccess){
    console.error('exit because login failed');
    process.exit(1);
  }

  for(h of [hatenaTop, hatenaAccessLog] ){
    console.info('%s > %s', moment().format('YYYY-MM-DD HH:mm:ss'), h.getName());
    await navigate(page, h.getUrl());
    await takeScreenshot(page, h);
    //環境変数にCoudinaryがあるときだけ実施
    if( process.env.CLOUDINARY_URL ){
      await sendToCloudinary(h);
    }
  }

  browser.close();
  console.log('%s > End program', moment().format('YYYY-MM-DD HH:mm:ss'));
})();

//----------------

async function sleep(delay) {
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function loginHatena(page, id, password){
  await navigate(page, 'https://www.hatena.ne.jp/login?location='+BLOG_ADMIN_URL);

  for( let i=0; i<retryMax; i++){
    try{
      console.info(' input login information');
      await page.type('input[name="name"]', id);
      await page.type('input[name="password"]', password);

      await Promise.all([
        page.click('button#login-button'),
        page.waitForNavigation({timeout: 60000, waitUntil: "domcontentloaded"}),
      ]);
      console.info(' current url(%s) [%s]', i, page.url());

      await sleep(5000);

      console.info(' current url(%s) [%s]', i, page.url());

      if( page.url().indexOf(BLOG_ADMIN_URL)>=0 ){
        console.info(' login succeeded');
        return true;
      }
    }catch(e){
      console.error('error occurred.');
      console.error(e);
    }
    console.info(' login failed. wait 10 seconds and try again');
    await sleep(10000);
  }
  return false;
}

async function navigate(page, url){
  for( let i=0; i<retryMax; i++){
    try{
      console.info(' goto page(%s) [%s]', i, url);
      await Promise.all([
        response = page.goto(url),
        page.waitForNavigation({timeout: 60000, waitUntil: "domcontentloaded"}),
      ]);
      console.info(' reacged page(%s) [%s]', i, page.url());
      return;
    }catch(e){
      console.error('error occurred.');
      console.error(e);
    }
    console.info(' http failed. wait 10 seconds and try again');
    await sleep(10000);
  }
  throw new Error('HTTP ERROR:'+ url);
}

async function takeScreenshot(page, hatena){
  console.log(' take screenshot [%s]', hatena.getFilePath());
  await page.screenshot(
    { path: hatena.getFilePath(), clip:captureClipArea }
  );
}

async function sendToCloudinary(hatena){
  await cloudinary.v2.uploader.upload(
    hatena.getFilePath(),
    {
      public_id:hatena.getFileName(), folder:'hatena',type:'private',
      transformation : [
        //最下部に余白をいれる
        { width: captureClipArea.width, height: (captureClipArea.height+60), crop:'pad', background:'pink',gravity:'north' }, 
        //余白にテキストを入れる
        { overlay: {font_family: 'Potta One.ttf', font_size: 20, text: moment().format('YYYY年M月D日') } ,gravity:'south_east', x:15, y:15,}
      ],                                   
      
    },
    function (error, result) {
      if(error){
        console.error('error with cloudinary.upload');
        console.error(error);
      }
      if(result){
        console.info(' uploaded to cloudinary as public_id [%s]', result.public_id);
      }
    }
  );
}