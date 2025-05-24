# 开发工作流指南

## 🌟 分支策略

### 分支类型

- **`master`** - 生产环境分支，始终保持稳定
- **`develop`** - 开发主分支，集成所有功能
- **`feature/*`** - 功能开发分支
- **`hotfix/*`** - 紧急修复分支
- **`release/*`** - 发布准备分支

## 🔄 开发流程

### 1. 新功能开发

```bash
# 1. 从develop创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/audio-balance-control

# 2. 开发功能
# ... 编码 ...

# 3. 提交代码
git add .
git commit -m "Add audio balance control slider"

# 4. 推送分支
git push origin feature/audio-balance-control

# 5. 创建Pull Request到develop分支
# 6. 代码审查
# 7. 合并到develop
# 8. 删除功能分支
git branch -d feature/audio-balance-control
git push origin --delete feature/audio-balance-control
```

### 2. 紧急修复

```bash
# 1. 从master创建hotfix分支
git checkout master
git pull origin master
git checkout -b hotfix/fix-audio-crash

# 2. 修复问题
# ... 修复代码 ...

# 3. 提交并推送
git add .
git commit -m "Fix audio crash when switching devices"
git push origin hotfix/fix-audio-crash

# 4. 创建PR到master和develop
# 5. 合并后删除分支
```

### 3. 发布流程

```bash
# 1. 从develop创建release分支
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# 2. 准备发布（更新版本号、文档等）
npm version patch  # 或 minor/major

# 3. 测试发布版本
# 4. 合并到master
# 5. 创建Git标签
git tag v1.2.0
git push origin v1.2.0

# 6. 合并回develop
```

## 🚀 CI/CD 触发规则

### 自动测试
- **所有分支推送** → 运行测试
- **Pull Request** → 运行完整测试套件

### 自动部署
- **`develop`分支** → 部署到开发环境
- **`master`分支** → 部署到生产环境
- **`feature/*`分支** → 仅测试，不部署

## 📝 提交信息规范

使用语义化提交信息：

```bash
feat: add audio balance control
fix: resolve connection timeout issue
docs: update API documentation
style: format code with prettier
refactor: simplify WebRTC connection logic
test: add unit tests for audio controls
chore: update dependencies
```

## 🔧 本地开发设置

### 初始设置
```bash
# 克隆仓库
git clone git@github.com:huskyhao/ScreenShare.git
cd ScreenShare

# 安装依赖
npm install

# 创建配置文件
cp config/server.example.json config/server.json
# 编辑 config/server.json

# 启动开发服务器
npm run dev
```

### 日常开发
```bash
# 更新develop分支
git checkout develop
git pull origin develop

# 创建功能分支
git checkout -b feature/your-feature-name

# 开发完成后推送
git push origin feature/your-feature-name
```

## 🧪 测试策略

### 本地测试
```bash
# 代码质量检查
npm run lint

# 安全审计
npm audit

# 启动测试
npm test

# 构建测试
npm run build
```

### 环境测试
- **开发环境** - 自动部署develop分支
- **生产环境** - 手动部署master分支

## 📋 代码审查清单

- [ ] 代码符合项目规范
- [ ] 添加了必要的注释
- [ ] 更新了相关文档
- [ ] 通过了所有测试
- [ ] 没有安全漏洞
- [ ] 性能影响可接受

## 🚨 紧急情况处理

### 生产环境问题
1. 立即创建hotfix分支
2. 快速修复问题
3. 直接合并到master
4. 立即部署
5. 同步到develop分支

### 回滚部署
```bash
# 使用GitHub Actions手动部署工作流
# 或在服务器上手动回滚
git reset --hard <previous-commit>
pm2 restart screenshare-signaling
```
