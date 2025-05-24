# CI/CD 设置指南

本文档详细说明如何为 ScreenShare 项目设置和使用 CI/CD 流水线。

## 概述

我们的 CI/CD 系统包含以下组件：

1. **GitHub Actions 工作流** - 自动化构建、测试和部署
2. **Docker 容器化** - 一致的部署环境
3. **自动化部署脚本** - 安全的服务器部署
4. **代码质量检查** - ESLint 和安全审计

## 工作流说明

### 1. 主 CI/CD 流水线 (`.github/workflows/ci.yml`)

**触发条件：**
- 推送到 `master` 或 `develop` 分支
- 创建 Pull Request 到 `master` 分支
- 发布新版本

**包含的任务：**
- 代码质量检查和 linting
- 安全审计
- 多平台 Electron 应用构建
- 自动部署到生产服务器

### 2. 手动部署工作流 (`.github/workflows/deploy.yml`)

**触发条件：**
- 手动触发 (workflow_dispatch)

**功能：**
- 支持选择部署环境 (production/staging)
- 可选择强制重启服务
- 包含部署验证和回滚机制

### 3. Docker 构建和部署 (`.github/workflows/docker.yml`)

**触发条件：**
- 推送到 `master` 分支
- 创建新标签

**功能：**
- 构建多架构 Docker 镜像
- 推送到 GitHub Container Registry
- 自动部署到服务器

## 设置步骤

### 1. GitHub Secrets 配置

在 GitHub 仓库设置中添加以下 Secrets：

```
SSH_PRIVATE_KEY     # 服务器 SSH 私钥
SERVER_HOST         # 服务器 IP 地址或域名
SERVER_USER         # 服务器用户名
SERVER_PATH         # 项目在服务器上的路径
GITHUB_TOKEN        # GitHub Token (自动提供)
```

### 2. 服务器准备

在服务器上执行以下步骤：

```bash
# 1. 安装必要软件
sudo apt update
sudo apt install -y git nodejs npm docker.io docker-compose

# 2. 安装 PM2
sudo npm install -g pm2

# 3. 克隆项目
git clone https://github.com/huskyhao/ScreenShare.git
cd ScreenShare

# 4. 配置服务器设置
cp config/server.example.json config/server.json
nano config/server.json  # 编辑配置

# 5. 初始部署
npm install
pm2 start src/server.js --name screenshare-signaling
pm2 save
pm2 startup  # 按提示设置开机自启
```

### 3. SSH 密钥配置

```bash
# 在本地生成 SSH 密钥对
ssh-keygen -t rsa -b 4096 -C "ci-cd@screenshare"

# 将公钥添加到服务器
ssh-copy-id user@your-server

# 将私钥内容添加到 GitHub Secrets 中的 SSH_PRIVATE_KEY
```

## 使用方法

### 自动部署

1. **推送到 master 分支**：
   ```bash
   git push origin master
   ```
   自动触发完整的 CI/CD 流水线

2. **创建新版本**：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
   触发版本构建和发布

### 手动部署

1. 在 GitHub 仓库页面，进入 "Actions" 标签
2. 选择 "Deploy to Server" 工作流
3. 点击 "Run workflow"
4. 选择部署环境和选项
5. 点击 "Run workflow" 确认

### 本地部署

使用提供的部署脚本：

```bash
# 基本部署
npm run deploy

# 跳过测试的快速部署
SKIP_TESTS=true npm run deploy

# 强制重启服务
FORCE_RESTART=true npm run deploy
```

### Docker 部署

```bash
# 构建镜像
npm run docker:build

# 运行容器
npm run docker:run

# 使用 Docker Compose
npm run docker:compose

# 停止服务
npm run docker:compose:down
```

## 监控和维护

### 查看服务状态

```bash
# PM2 状态
pm2 status

# 查看日志
pm2 logs screenshare-signaling

# Docker 状态
docker ps
docker logs screenshare-signaling
```

### 回滚部署

如果部署出现问题，可以使用以下方法回滚：

```bash
# 使用 PM2 回滚
pm2 restart screenshare-signaling

# 使用 Git 回滚
git reset --hard HEAD~1
npm install
pm2 restart screenshare-signaling
```

### 清理和维护

```bash
# 清理旧的备份
find backups/ -type d -mtime +30 -exec rm -rf {} \;

# 清理 Docker 镜像
docker image prune -f

# 更新依赖
npm run update-deps
```

## 故障排除

### 常见问题

1. **部署失败**：
   - 检查 GitHub Secrets 配置
   - 验证服务器 SSH 连接
   - 查看 GitHub Actions 日志

2. **服务启动失败**：
   - 检查 `config/server.json` 配置
   - 查看 PM2 日志：`pm2 logs screenshare-signaling`
   - 验证端口是否被占用

3. **Docker 部署问题**：
   - 检查 Docker 服务状态
   - 验证镜像是否正确构建
   - 查看容器日志：`docker logs screenshare-signaling`

### 调试技巧

1. **启用详细日志**：
   ```bash
   DEBUG=* npm run server
   ```

2. **测试配置**：
   ```bash
   curl -f http://localhost:3000/config
   ```

3. **检查网络连接**：
   ```bash
   netstat -tlnp | grep 3000
   ```

## 安全考虑

1. **配置文件安全**：
   - `config/server.json` 已添加到 `.gitignore`
   - 敏感信息通过环境变量管理

2. **SSH 安全**：
   - 使用专用的 CI/CD SSH 密钥
   - 定期轮换密钥

3. **Docker 安全**：
   - 使用非 root 用户运行容器
   - 定期更新基础镜像

4. **依赖安全**：
   - 定期运行 `npm audit`
   - 自动化安全更新

## 扩展和自定义

### 添加新环境

1. 在 GitHub 仓库设置中创建新环境
2. 配置环境特定的 Secrets
3. 修改部署工作流以支持新环境

### 自定义部署流程

1. 修改 `scripts/deploy.sh` 脚本
2. 更新 GitHub Actions 工作流
3. 测试新的部署流程

### 集成其他工具

- **监控**：集成 Prometheus/Grafana
- **日志**：集成 ELK Stack
- **通知**：集成 Slack/Discord 通知

## 最佳实践

1. **版本管理**：
   - 使用语义化版本号
   - 维护详细的 CHANGELOG

2. **测试**：
   - 在部署前运行测试
   - 使用 staging 环境验证

3. **监控**：
   - 设置健康检查
   - 监控关键指标

4. **备份**：
   - 定期备份配置文件
   - 保留部署历史

5. **文档**：
   - 保持文档更新
   - 记录变更和决策
