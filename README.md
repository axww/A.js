# ASSBBS Web

ASSBBS Web 是一个基于 Bun + Hono 的轻量级论坛系统。

## 技术栈

- **RT**: [Bun](https://bun.sh/)
- **JS**: [Hono](https://hono.dev/)
- **DB**: [LibSQL](https://turso.tech/libsql)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **CSS**: [daisyUI](https://daisyui.com/)
- **Regex**: [XRegExp](https://xregexp.com/)
- **Editor**: [QuillJS](https://quilljs.com/)
- **Format**: [file-type](https://github.com/sindresorhus/file-type)

## 开发环境设置

1. 安装依赖:

```bash
bun install
```

2. 初始化数据库:

```bash
# 生成数据库迁移文件
bun run db:generate

# 应用数据库变更
bun run db:push

# 初始化基础数据
bun run db:init
```

3. 启动开发服务器:

```bash
bun run dev
```

服务器将在 http://localhost:3000 启动。

## 默认账号

系统初始化后会创建以下账号：

- 管理员账号

  - 邮箱：admin@example.com
  - 密码：admin123
  - 权限：管理员组（gid=1）

- 测试账号
  - 邮箱：test@example.com
  - 密码：test123
  - 权限：普通用户组（gid=0）

## 部署说明

### 生产环境部署

```bash
# 安装依赖
bun install

# 应用数据库迁移
bun run db:push

# 数据库初始化
bun run db:init

# 启动服务器
bun run app
```

### 数据库备份

建议定期备份 `app.db` 文件以保护数据安全。

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License
