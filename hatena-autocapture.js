const moment = require('moment');
const puppeteer = require('puppeteer');
const cloudinary = require('cloudinary')
const fs = require('fs');

const viewPoint = {width:1000, height:800};
const captureOffset = {x:240, y:40};
const captureClipArea = { x:captureOffset.x, y:captureOffset.y, width:(viewPoint.width - captureOffset.x), height:viewPoint.height};

let baseFilename = moment().format('YYYYMMDD-HHmmss');
const captureTop = baseFilename + '_hatena-top.png';
const captureAccessLog = baseFilename + '_hatena-access-log.png';

let overlayText = moment().format('YYYY年M月D日');

const hatenaId = process.env.hatena_id;
const hatenaPass = process.env.hatena_pass;
const blogAdminUrl = process.env.blog_admin_url;
const blogAdminAccessLogUrl = blogAdminUrl + 'accesslog';
console.log(hatenaId,hatenaPass,blogAdminUrl);

const puppeteerOptions = process.env.DYNO ? { args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=ja-JP,ja'], slowMo:100 } : { headless: true, slowMo:100 };
const imageDir = './captures/';

if (!fs.existsSync(imageDir)){
    fs.mkdirSync(imageDir);
}


(async () => {
  const browser = await puppeteer.launch(puppeteerOptions);

  const page = (await browser.pages())[0];
  await page.setExtraHTTPHeaders({'Accept-Language': 'ja'});
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36');
  await page.setViewport({ width:viewPoint.width, height:viewPoint.height });

  await page.goto('https://www.hatena.ne.jp/login?location='+blogAdminUrl,{waitUntil: "domcontentloaded"});
  await page.type('input[name="name"]', hatenaId);
  await page.type('input[name="password"]', hatenaPass);

  await Promise.all([
    page.click('button#login-button'),
    page.waitForNavigation({timeout: 60000, waitUntil: "domcontentloaded"}),
  ]);
  await page.waitForTimeout(1000);

  console.info('open logged in & top');
  await page.screenshot({ path: imageDir + captureTop, clip:captureClipArea });

  await Promise.all([
    page.goto(blogAdminAccessLogUrl),
    page.waitForNavigation({timeout: 60000, waitUntil: "networkidle0"}),
  ]);
  console.info('open accesslog');

  await page.waitForTimeout(1000);
  await page.screenshot({ path: imageDir + captureAccessLog, clip:captureClipArea });
  browser.close()

  for(file of [captureTop, captureAccessLog] ){
    cloudinary.v2.uploader.upload(
      imageDir + file,
      {
        public_id: file, folder:'hatena',type:'private',
        transformation : [
          //最下部に余白をいれる
          { width: captureClipArea.width, height: (captureClipArea.height+60), crop:'pad', background:'pink',gravity:'north' }, 
          //余白にテキストを入れる
          { overlay: {font_family: 'Potta One.ttf', font_size: 20, text: overlayText} ,gravity:'south_east', x:15, y:15,}
        ],                                   
        
      },
      function (error, result) {
        if(error){
          console.error('error with cloudinary.upload');
          console.error(error);
        }
        if(result){
          console.info('uploaded to cloudinary as public_id = %s', result.public_id);
        }
      }
    );
  }
})();