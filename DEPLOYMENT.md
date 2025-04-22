# Tiktoken 可视化工具部署指南

这个文档提供了将Tiktoken可视化工具部署到公网的多种方法，重点是Railway部署。

## 方法一：使用 Railway 部署（推荐）

Railway是一个现代化的应用部署平台，提供了简单的部署流程和免费套餐。

### 准备工作

1. **创建GitHub仓库**
   - 创建一个新的GitHub仓库
   - 将修改后的tiktoken-main文件夹内容上传到仓库

### 部署步骤

1. **注册Railway账号**
   - 访问 [Railway](https://railway.app/) 并注册账号
   - 可以直接使用GitHub账号登录（推荐）

2. **创建新项目**
   - 在Railway仪表板点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 授权Railway访问你的GitHub账号
   - 选择包含Tiktoken可视化工具的仓库

3. **项目将自动部署**
   - Railway会自动检测项目配置并开始部署过程
   - 你可以在"Deployments"标签页查看部署进度

4. **获取公共URL**
   - 部署成功后，点击"Settings" > "Domains"
   - 你将看到一个形如`https://your-app-name.up.railway.app`的URL
   - 这个URL即为你的应用公开地址

### 自定义设置（可选）

1. **环境变量**
   - 在"Variables"标签页添加环境变量
   - 添加`DEBUG=False`确保生产环境安全

2. **自定义域名**
   - 在"Settings" > "Domains"中添加自定义域名
   - 按照指引设置DNS记录
   - 需要Railway付费计划

## 方法二：使用 Docker 和 VPS 部署

如果你需要更多控制权或有特定需求，可以使用Docker部署到VPS。

### 步骤概述

1. **准备Docker文件**
   - 我们已经在项目中添加了Dockerfile

2. **租用VPS服务器**
   - 可以选择阿里云、腾讯云、AWS、DigitalOcean等服务商

3. **服务器配置**
   ```bash
   # 安装Docker
   curl -fsSL https://get.docker.com | sh
   
   # 克隆代码仓库
   git clone https://github.com/你的用户名/你的仓库名.git
   cd 你的仓库名
   
   # 构建Docker镜像
   docker build -t tiktoken-visualizer .
   
   # 运行容器
   docker run -d -p 80:8080 --restart always tiktoken-visualizer
   ```

4. **配置域名和SSL证书**
   - 购买域名并设置DNS指向你的服务器IP
   - 使用Certbot配置SSL证书：
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d 你的域名.com
   ```

## 方法三：使用 Render 部署

Render是另一个现代化的云平台，提供简单的部署体验。

### 步骤概述

1. **注册Render账号**
   - 访问 [Render](https://render.com/) 并创建账号

2. **创建Web服务**
   - 点击"New" > "Web Service"
   - 连接到你的GitHub仓库

3. **配置服务**
   - 名称: `tiktoken-visualizer`
   - 环境: `Python`
   - 构建命令: `pip install -r requirements.txt`
   - 启动命令: `python app.py`
   - 选择合适的实例类型（有免费选项）

4. **部署完成**
   - Render会自动构建并部署服务
   - 服务启动后会提供一个.onrender.com域名

## 故障排除

如果遇到部署问题，尝试以下步骤：

1. **检查日志**
   - 在部署平台上查看应用日志
   - 识别具体错误信息

2. **常见问题**
   - 端口配置问题：确保应用监听正确的端口
   - 依赖问题：检查requirements.txt是否包含所有依赖
   - 跨域问题：检查CORS设置

3. **特定问题解决方案**
   - 如果看到"Address already in use"：确保PORT环境变量设置正确
   - 如果静态文件不加载：检查app.py中的static_folder设置

## 更新应用

要更新已部署的应用：

1. **Railway/Render**: 只需推送更新到GitHub，平台会自动重新部署
2. **Docker/VPS**: 拉取最新代码，重新构建并运行Docker容器

## 补充信息

- **性能优化**: 对于生产环境，考虑添加缓存或CDN加速静态内容
- **安全考虑**: 确保禁用调试模式，考虑添加API速率限制
- **监控**: 设置监控工具如Uptime Robot来监控应用健康状态

如有任何问题，欢迎联系项目维护者获取支持。 