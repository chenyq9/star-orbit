#!/usr/bin/env bash
# Star Orbit · Capacitor 工程统一补丁脚本
# 在 npm install + npx cap add android 之后运行（本地与 CI 通用）
# 作用：
#  1. 同步最新游戏 HTML → www/index.html
#  2. :app 模块指定 buildToolsVersion 36.0.0
#  3. :capacitor-android 模块（node_modules 内）指定 buildToolsVersion 36.0.0
#  4. :capacitor-cordova-android-plugins 模块指定 buildToolsVersion 36.0.0
# 说明：AGP 8.13.0 默认要 Build Tools 35.0.0；统一钉到 36.0.0（本地 SDK 有该版本，
#       CI 用 setup-android 装对应版本，行为一致）

set -euo pipefail
cd "$(dirname "$0")"

# 1) 同步游戏
cp ../prototype/levels-v1.html www/index.html
echo "[patch] www/index.html 已同步（$(wc -c < www/index.html) bytes）"

# 2) :app 模块
if ! grep -q 'buildToolsVersion' android/app/build.gradle; then
  sed -i 's|compileSdk = rootProject.ext.compileSdkVersion|compileSdk = rootProject.ext.compileSdkVersion\n    buildToolsVersion = "36.0.0"|' android/app/build.gradle
  echo "[patch] android/app/build.gradle ← buildToolsVersion 36.0.0"
else
  echo "[patch] android/app/build.gradle 已含 buildToolsVersion，跳过"
fi

# 3) :capacitor-android 模块
CAPC="node_modules/@capacitor/android/capacitor/build.gradle"
if [ -f "$CAPC" ] && ! grep -q 'buildToolsVersion' "$CAPC"; then
  sed -i 's|compileSdk = project.hasProperty(.compileSdkVersion.) ? rootProject.ext.compileSdkVersion : 36|&\n    buildToolsVersion = "36.0.0"|' "$CAPC"
  echo "[patch] capacitor-android ← buildToolsVersion 36.0.0"
else
  echo "[patch] capacitor-android 已补或不存在，跳过"
fi

# 4) :capacitor-cordova-android-plugins 模块
CORD="android/capacitor-cordova-android-plugins/build.gradle"
if [ -f "$CORD" ] && ! grep -q 'buildToolsVersion' "$CORD"; then
  # 该模块 build.gradle 由 cap add 生成，android{} 块内含 compileSdk 行（无 rootProject.ext 前缀的写法两种都兼容）
  sed -i 's|^\(\s*\)compileSdk \(.*\)$|\1compileSdk \2\n\1buildToolsVersion "36.0.0"|' "$CORD"
  echo "[patch] cordova-plugins ← buildToolsVersion 36.0.0"
else
  echo "[patch] cordova-plugins 已补或不存在，跳过"
fi

echo "[patch] 完成"