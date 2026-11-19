#!/bin/sh
# 오르골당 배포: index.html을 다시 빌드하고 Firebase Hosting에 올린다.
# 사용법: sh tools/deploy.sh   (firebase CLI 로그인 필요)
set -e
cd "$(dirname "$0")/.."
python3 workroom/build.py
mkdir -p public
cp index.html public/index.html
cp music_box_lesson.pdf public/music_box_lesson.pdf
firebase deploy --only hosting --project mbworkroom-75288
