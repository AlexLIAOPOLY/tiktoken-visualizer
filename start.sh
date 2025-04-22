#!/bin/bash

echo "启动 Tiktoken Visualizer..."

# 检查是否安装了必要的依赖
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到Python。请确保已安装Python 3.x"
    exit 1
fi

# 检查是否安装了必要的Python包
python3 -c "import tiktoken" &> /dev/null
if [ $? -ne 0 ]; then
    echo "安装必要的Python依赖..."
    pip3 install -r requirements.txt
fi

# 检查是否安装了浏览器打开工具
if command -v open &> /dev/null; then
    # macOS
    OPEN_CMD="open"
elif command -v xdg-open &> /dev/null; then
    # Linux
    OPEN_CMD="xdg-open"
else
    echo "警告: 无法找到自动打开浏览器的命令，请手动访问 http://localhost:8080"
    OPEN_CMD=""
fi

# 启动Flask服务器
echo "启动后端服务器..."
python3 app.py &
SERVER_PID=$!

# 等待服务器启动
echo "等待服务器启动..."
sleep 3

# 打开浏览器（如果可用）
if [ -n "$OPEN_CMD" ]; then
    echo "正在打开浏览器..."
    $OPEN_CMD "http://localhost:8080"
fi

echo "----------------------------------------"
echo "Tiktoken Visualizer 正在运行!"
echo "后端服务器地址: http://localhost:8080"
echo "按 Ctrl+C 停止服务器"
echo "----------------------------------------"

# 等待用户按Ctrl+C
wait $SERVER_PID 