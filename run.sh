export PATH="$PATH:/home/$USER/nodejs/share/nodejs/node-v16.17.0-linux-x64/bin"
export LANG="ja_JP.utf8"

export BLOG_ADMIN_URL="https://blog.hatena.ne.jp/xxx/domain/"
export HATENA_ID=""
export HATENA_PASS=""

export CLOUDINARY_URL="cloudinary://xx:yy@zz"

cd `dirname $0`
node hatena-autocapture.js