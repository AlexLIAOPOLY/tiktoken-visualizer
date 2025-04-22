"""
Flask backend for the tiktoken visualizer web application.
Provides API endpoints to handle tiktoken functionality.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import tiktoken
import os
import socket
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

app = Flask(__name__, static_folder='static')
CORS(app)  # Enable CORS for all routes

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('static', 'index.html')

# Add static file routes
@app.route('/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files"""
    return send_from_directory('static/css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files"""
    return send_from_directory('static/js', filename)

@app.route('/img/<path:filename>')
def serve_img(filename):
    """Serve image files"""
    return send_from_directory('static/img', filename)

@app.route('/api/encodings', methods=['GET'])
def get_encodings():
    """Get list of all available encodings"""
    encoding_names = tiktoken.list_encoding_names()
    
    # Get additional info for each encoding
    encodings_info = []
    for name in encoding_names:
        try:
            enc = tiktoken.get_encoding(name)
            info = {
                "name": name,
                "vocab_size": enc.n_vocab
            }
            if hasattr(enc, 'eot_token'):
                info["eot_token"] = enc.eot_token
            encodings_info.append(info)
        except Exception as e:
            encodings_info.append({
                "name": name,
                "error": str(e)
            })
    
    return jsonify(encodings_info)

@app.route('/api/encode', methods=['POST'])
def encode_text():
    """Encode text into tokens"""
    data = request.json
    
    if not data or 'text' not in data or 'encoding' not in data:
        return jsonify({"error": "Missing required parameters"}), 400
    
    text = data['text']
    encoding_name = data['encoding']
    allow_special = data.get('allow_special', False)
    special_tokens = data.get('special_tokens', [])
    
    try:
        encoding = tiktoken.get_encoding(encoding_name)
        
        if allow_special and special_tokens:
            # Allow specific special tokens
            tokens = encoding.encode(text, allowed_special=set(special_tokens))
        else:
            # Disable all special token checks, treat them as normal text
            tokens = encoding.encode(text, disallowed_special=())
        
        # Get token text representations for visualization
        token_texts = []
        for token in tokens:
            try:
                token_text = encoding.decode([token])
                token_texts.append(token_text)
            except:
                token_texts.append("[SPECIAL]")
        
        return jsonify({
            "tokens": tokens,
            "token_count": len(tokens),
            "token_texts": token_texts
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/decode', methods=['POST'])
def decode_tokens():
    """Decode tokens back to text"""
    data = request.json
    
    if not data or 'tokens' not in data or 'encoding' not in data:
        return jsonify({"error": "Missing required parameters"}), 400
    
    tokens = data['tokens']
    encoding_name = data['encoding']
    
    try:
        encoding = tiktoken.get_encoding(encoding_name)
        text = encoding.decode(tokens)
        
        return jsonify({
            "text": text
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/token_info', methods=['POST'])
def get_token_info():
    """Get information about a specific token"""
    data = request.json
    
    if not data or 'token' not in data or 'encoding' not in data:
        return jsonify({"error": "Missing required parameters"}), 400
    
    token = data['token']
    encoding_name = data['encoding']
    
    try:
        encoding = tiktoken.get_encoding(encoding_name)
        # Decode the token to get its text representation
        text = encoding.decode([token])
        
        # Get byte representation
        bytes_repr = []
        for byte in text.encode('utf-8'):
            bytes_repr.append(byte)
        
        return jsonify({
            "token": token,
            "text": text,
            "bytes": bytes_repr,
            "byte_length": len(bytes_repr)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/encoding_info/<encoding_name>', methods=['GET'])
def get_encoding_info(encoding_name):
    """Get detailed information about a specific encoding"""
    try:
        encoding = tiktoken.get_encoding(encoding_name)
        
        info = {
            "name": encoding_name,
            "vocab_size": encoding.n_vocab
        }
        
        if hasattr(encoding, 'eot_token'):
            info["eot_token"] = encoding.eot_token
            info["eot_text"] = encoding.decode([encoding.eot_token])
        
        # Get a sample of special tokens if available
        special_tokens = {}
        if hasattr(encoding, '_special_tokens'):
            for token_text, token_id in list(encoding._special_tokens.items())[:10]:  # Limit to 10 for brevity
                special_tokens[token_text] = token_id
        
        info["special_tokens_sample"] = special_tokens
        
        return jsonify(info)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 404

@app.route('/api/tokens_to_vectors', methods=['POST'])
def tokens_to_vectors():
    """
    Convert a list of token IDs to vectors for visualization in 3D or 2D space.
    
    Now uses semantic-based approach to group similar tokens together based on their
    textual representation rather than just token ID values.
    """
    data = request.json
    tokens = data.get('tokens')
    dimensions = data.get('dimensions', 3)
    encoding_name = data.get('encoding', 'cl100k_base')  # 默认使用cl100k_base
    
    if not tokens:
        return jsonify({'error': 'No tokens provided'})
    
    try:
        # 获取当前的编码器
        encoding = tiktoken.get_encoding(encoding_name)
        
        # 对每个token进行解码，获取其文本表示
        token_texts = []
        valid_tokens = []
        
        for token in tokens:
            try:
                # 将token ID转换为字节，然后解码为文本
                text = encoding.decode([token])
                token_texts.append(text)
                valid_tokens.append(token)
            except Exception as e:
                # 如果无法解码，使用空字符串
                print(f"Error decoding token {token}: {e}")
                token_texts.append("")
                valid_tokens.append(token)
        
        # 从token文本中提取特征
        features = []
        
        for i, text in enumerate(token_texts):
            token_features = []
            
            # 特征1: 文本长度 (归一化)
            length = len(text) / 10.0 if text else 0
            token_features.append(length)
            
            # 特征2: 字符类型比例
            if text:
                alpha_ratio = sum(c.isalpha() for c in text) / len(text)
                digit_ratio = sum(c.isdigit() for c in text) / len(text)
                space_ratio = sum(c.isspace() for c in text) / len(text)
                punct_ratio = sum(not c.isalnum() and not c.isspace() for c in text) / len(text)
            else:
                alpha_ratio, digit_ratio, space_ratio, punct_ratio = 0, 0, 0, 0
            
            token_features.extend([alpha_ratio, digit_ratio, space_ratio, punct_ratio])
            
            # 特征3: 字符ASCII值的平均值和标准差
            if text:
                ascii_values = [ord(c) for c in text]
                avg_ascii = sum(ascii_values) / len(ascii_values) / 255.0  # 归一化
                std_ascii = np.std(ascii_values) / 128.0 if len(ascii_values) > 1 else 0
            else:
                avg_ascii, std_ascii = 0, 0
            
            token_features.extend([avg_ascii, std_ascii])
            
            # 特征4: 是否为常见分词类型 (特殊字符、单词、数字等)
            is_single_char = len(text) == 1
            is_word = text.isalpha() and len(text) > 1
            is_number = text.isdigit()
            is_special = not text.isalnum() and len(text) > 0
            
            token_features.extend([
                float(is_single_char),
                float(is_word), 
                float(is_number),
                float(is_special)
            ])
            
            # 特征5: 首字符和尾字符的位置
            if text:
                first_char_pos = ord(text[0]) / 255.0
                last_char_pos = ord(text[-1]) / 255.0
            else:
                first_char_pos, last_char_pos = 0, 0
                
            token_features.extend([first_char_pos, last_char_pos])
            
            # 特征6: 语言特征 - 简单的启发式判断是否为英文、数字等
            has_uppercase = any(c.isupper() for c in text) if text else False
            all_uppercase = text.isupper() if text and text.isalpha() else False
            starts_uppercase = text[0].isupper() if text and text.isalpha() else False
            
            token_features.extend([
                float(has_uppercase),
                float(all_uppercase),
                float(starts_uppercase)
            ])
            
            # 将 token ID 作为辅助特征 (但权重较低)
            token_id_norm = float(valid_tokens[i]) / max(max(valid_tokens), 1) * 0.1
            token_features.append(token_id_norm)
            
            features.append(token_features)
        
        # 转换为numpy数组
        X = np.array(features)
        
        if X.shape[0] > 0:
            # 使用StandardScaler标准化特征
            X = StandardScaler().fit_transform(X)
            
            # 使用PCA降维到指定维度
            pca = PCA(n_components=dimensions)
            vectors_reduced = pca.fit_transform(X)
            
            # 将降维后的向量和原始token ID关联起来
            result = []
            for i, token in enumerate(valid_tokens):
                # 放大向量以便在3D空间中显示
                vector = vectors_reduced[i] * 10.0  # 放大10倍以便在视觉上更明显
                result.append({
                    'token': token,
                    'text': token_texts[i],
                    'vector': vector.tolist()
                })
            
            return jsonify({'vectors': result})
        else:
            return jsonify({'error': 'No valid features could be extracted'})
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    # 从环境变量获取端口，Railway会自动提供PORT环境变量
    port = int(os.environ.get('PORT', 8080))
    
    # 生产环境不需要调试模式
    debug_mode = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    print(f"Server started on port {port}")
    # 确保绑定到0.0.0.0以便在容器中访问
    app.run(host='0.0.0.0', port=port, debug=debug_mode) 