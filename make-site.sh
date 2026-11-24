#!/bin/sh
# Copies only the files participants need into ./site, ready to upload to a
# static host (e.g. drag the folder onto https://app.netlify.com/drop).
# Left out on purpose: README.md, results.html, js/results.js, apps-script/,
# so the dashboard and the study notes are not published with the study.
set -e
cd "$(dirname "$0")"
# Refuse to build a participant site that would lose data or show placeholders.
# The endpoint may be set in config.js or, kept out of git, in config.local.js.
if grep -q 'endpoint: ""' config.js && ! grep -qs 'script.google.com' config.local.js; then
  echo "Stop: no data endpoint (config.js -> dataCollection.endpoint, or config.local.js), so answers would never reach you. See README (Collecting data remotely)."; exit 1
fi
if grep -q 'TEAM CONTACT EMAIL' config.js && ! grep -qs 'contact' config.local.js; then
  echo "Stop: set your contact email in config.js -> dataCollection.contact first."; exit 1
fi
rm -rf site
mkdir -p site/js
cp index.html config.js styles.css site/
if [ -f config.local.js ]; then cp config.local.js site/; fi
cp js/util.js js/data.js js/frames.js js/app.js js/review.js site/js/
echo "Made ./site with $(find site -type f | wc -l | tr -d ' ') files. Upload that folder to your host."
