# mobile/ 目录说明（Capacitor 打包工程）

本目录是 Star Orbit 的 Android 打包工程（Capacitor 8 路线）。

**关键：`node_modules/` 和 `android/` 都不在 git 里，本地构建所需的全部自定义配置都在仓库内：**

- `capacitor.config.json` — Capacitor 工程配置（appId: com.chenyq9.starorbit）
- `www/index.html` — 游戏（从 `prototype/levels-v1.html` 复制）
- `node_modules/@capacitor/android/capacitor/build.gradle` 的 `buildToolsVersion = "36.0.0"` 补丁 → **由本目录 `apply_patches.sh` 统一应用（含游戏 HTML 同步与三模块补丁）**
- 根 `android/build.gradle` 的阿里云镜像替换（仅本地需要，CI 直连不需要）
- `.github/workflows/android.yml` — GitHub Actions 云编译（推荐路线）

## 如何构建

### 路线 A：GitHub Actions（推荐，公开仓库免费）

push 到 main 自动触发，或手动触发（workflow_dispatch）。产物：`StarOrbit-debug.apk`（Actions Artifacts）。
CI 上执行：`npm install` → `npx cap add android` → 应用 patches → `gradle assembleDebug`，全部在海外直连网络，无镜像需求。

### 路线 B：本地（proot Ubuntu，网络受限时兜底）

```bash
cd mobile
npm install --registry=https://registry.npmmirror.com
npx cap add android
bash apply_patches.sh          # 应用 buildToolsVersion 等补丁
echo 'sdk.dir=/opt/android-sdk' > android/local.properties
export ANDROID_HOME=/opt/android-sdk GRADLE_USER_HOME=/root/.gradle
cd android && /opt/gradle-8.14.3/bin/gradle assembleDebug --no-daemon -Dorg.gradle.jvmargs=-Xmx3g
# APK 在 app/build/outputs/apk/debug/
```

## 环境备忘（2026-09-18 本地探底结论）

- 本机：node 24.14.1 / JDK 17 / gradle 8.14.3 已装 /opt/gradle-8.14.3
- Android SDK：/opt/android-sdk（platforms 34/35/36/37.0 + build-tools 33.0.1/34.0.0/36.0/37.0，platform-36 从腾讯镜像补装）
- 网络实况：dl.google.com 不通（TLS 握手被断）；阿里云 Maven 镜像 200 可用（`/root/.gradle/init.d/mirror.gradle` 强制替换）
- AGP 8.13.0 要求 compileSdk 36 + build-tools 35.0.0（AGP 内置默认），本地指定 `buildToolsVersion = "36.0.0"` 规避（36.0.0 兼容 35.0.0 工作流）

## 已知问题

- `capacitor-cordova-android-plugins` 模块在本地构建报缺 Build Tools 35.0.0——该模块在 CI 直连环境可用 sdkmanager 自动装 35；本地需给该模块同样打 buildToolsVersion 补丁（见 patches/）
- 命令行 `npx cap add android` 在本机一次性成功；重复执行会因目录已存在报错，重建时先删 `android/`