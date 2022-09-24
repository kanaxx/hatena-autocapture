# Hatena auto capture

はてなブログの管理画面をキャプチャーするツールです。

## How to use

```
$ cd ~
$ git clone https://github.com/kanaxx/hatena-autocapture.git
$ cd hatena-autocapture

# モジュールをインストール
$ npm install

# 設定を書き換える
$ vi run.sh

> export BLOG_ADMIN_URL="https://blog.hatena.ne.jp/xxx/domain/"
> export HATENA_ID=""
> export HATENA_PASS=""
> export CLOUDINARY_URL="cloudinary://xx:yy@zz"

$ sh run.sh
```

# 関連資料
ブログ管理画面のサマリーとアクセス解析を自動でキャプチャーする  
https://kanaxx.hatenablog.jp/entry/auto-capture-puppeteer

自動キャプチャーするスクリプトをConoHaへ移設。さよなら、ありがとうHeroku  
https://kanaxx.hatenablog.jp/entry/conoha-node