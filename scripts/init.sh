python3 -m venv venv

source venv/bin/activate

pip install --upgrade pip

pip install -r requirements.txt

sudo mkdir -p "$GEM_HOME"
sudo chmod -R 777 "$GEM_HOME"

gem install bundler -v 2.6.9

gem install jekyll

bundle _2.6.9_ install

bundle _2.6.9_ exec jekyll build