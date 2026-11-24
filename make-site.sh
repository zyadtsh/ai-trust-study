#!/bin/sh
# Copies only the files participants need into ./site, ready to upload to a
# static host (e.g. drag the folder onto https://app.netlify.com/drop).
# Left out on purpose: README.md, results.html, js/results.js, apps-script/,
# so the dashboard and the study notes are not published with the study.
set -e
cd "$(dirname "$0")"
# Refuse to build a participant site that would lose data or show placeholders.
if grep -q 'endpoint: ""' config.js; then
  echo "Stop: config.js -> dataCollection.endpoint is empty, so answers would never reach you. See README (Collecting data remotely)."; exit 1
fi
if grep -q 'TEAM CONTACT EMAIL' config.js; then
  echo "Stop: set your contact email in config.js -> dataCollection.contact first."; exit 1
fi
rm -rf site
mkdir -p site/js
cp index.html config.js styles.css site/
cp js/util.js js/data.js js/frames.js js/app.js js/review.js site/js/
echo "Made ./site with $(find site -type f | wc -l | tr -d ' ') files. Upload that folder to your host."
