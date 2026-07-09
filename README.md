# Galalive-backend

Gala Live 直播平台的后端服务，基于 Node.js + Express 构建。

## 技术栈

- Node.js 20.x
- Express 4.x
- SQLite (文件数据库)
- bcrypt (密码哈希)
- JWT (身份认证)
- Socket.io (实时通信)
- CORS (跨域支持)

## 功能模块

| 模块 | 说明 |
|------|------|
| 用户认证 | 注册、登录、验证码 |
| 直播管理 | 创建直播、推流地址、状态管理 |
| 礼物系统 | 礼物配置、赠送记录 |
| 视频管理 | 视频上传、审核 |
| 资金管理 | 充值、提现、余额 |
| 消息系统 | 私信、通知 |
| 数据统计 | 会员统计、趋势数据 |

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器 (端口 3002)
npm run dev

# 启动生产服务器
npm start
```

## 环境变量

创建 `.env` 文件：

```
# JWT密钥
JWT_SECRET=your-secret-key-here

# 服务器端口
PORT=3002

# 数据库文件路径
DB_PATH=data.json
```

## 部署

### Vercel

1. 导入 GitHub 仓库 [Galalive-backend](https://github.com/harker1544525153-lang/Galalive-backend)
2. 配置环境变量 `JWT_SECRET`
3. 自动构建部署

访问地址: `https://galalive-backend-hgvmv6jjb-harker1544.vercel.app`

## Mock数据

后端启动时会自动初始化Mock数据，包含：

- 管理员账户: admin / admin123
- 普通用户: user1 / 123456
- 主播账户: host1 / 123456
- 直播数据、礼物数据、轮播图数据等

## GitHub上传操作说明

### 1. 确保代码最新

```bash
# 查看当前状态
git status

# 添加所有修改
git add .

# 提交修改
git commit -m "描述你的修改"
```

### 2. 推送代码到GitHub

```bash
# 推送主分支
git push origin main
```

### 3. 部署到Vercel

```bash
# 安装Vercel CLI (首次)
npm install -g vercel

# 登录Vercel
vercel login

# 部署
vercel --prod
```

### 4. 验证部署

```bash
# 检查健康状态
curl https://galalive-backend-hgvmv6jjb-harker1544.vercel.app/api/health
```

## API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/auth/login | POST | 用户登录 |
| /api/auth/admin/login | POST | 管理员登录 |
| /api/live/streams | GET | 获取直播列表 |
| /api/banners | GET | 获取轮播图 |
| /api/users | GET | 获取用户列表 |
| /api/gifts | GET | 获取礼物列表 |