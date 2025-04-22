/**
 * Tiktoken Visualizer - Main JavaScript
 * Handles all UI interactions and API calls
 */

// API base URL - 自动判断当前环境
const API_BASE_URL = window.location.origin;

// Global state
const state = {
    selectedEncoder: null,
    currentTokens: [],
    currentTokenTexts: [],
    specialTokens: [],
    allowSpecial: false,
    threeJsScene: null,
    threeJsRenderer: null,
    threeJsCamera: null,
    threeJsControls: null,
    threeJsAnimationId: null,
    threeJsParticles: null,
    threeJsAnimationActive: true,
    labelsVisible: true,
    labelSize: 12,
    labelOpacity: 0.8,
    labelDensity: 'high',
    vectorData: null,
};

// DOM elements
const elements = {
    // Encoder section
    encoderSelect: document.getElementById('encoder-select'),
    encoderInfoText: document.getElementById('encoder-info-text'),
    encoderDetailsBtn: document.getElementById('encoder-details-btn'),
    
    // Special tokens section
    allowSpecialToggle: document.getElementById('allow-special-toggle'),
    specialTokensInput: document.getElementById('special-tokens-input'),
    specialTokensContainer: document.getElementById('special-tokens-container'),
    tokensChipContainer: document.getElementById('tokens-chip-container'),
    
    // Text input/output
    inputText: document.getElementById('input-text'),
    tokensContainer: document.getElementById('tokens-container'),
    
    // Buttons
    encodeBtn: document.getElementById('encode-btn'),
    decodeBtn: document.getElementById('decode-btn'),
    clearTextBtn: document.getElementById('clear-text-btn'),
    sampleTextBtn: document.getElementById('sample-text-btn'),
    copyTokensBtn: document.getElementById('copy-tokens-btn'),
    visualizeBtn: document.getElementById('visualize-btn'),
    
    // Stats
    tokenCount: document.getElementById('token-count'),
    charCount: document.getElementById('char-count'),
    compressionRatio: document.getElementById('compression-ratio'),
    
    // Modals
    encoderModal: document.getElementById('encoder-modal'),
    visualizationModal: document.getElementById('visualization-modal'),
    tokenInfoModal: document.getElementById('token-info-modal'),
    
    // Modal contents
    encoderDetailsContainer: document.getElementById('encoder-details-container'),
    tokenInfoContainer: document.getElementById('token-info-container'),
    modalTitle: document.getElementById('modal-title'),
    
    // Visualization panels
    textViz: document.getElementById('text-viz'),
    blocksViz: document.getElementById('blocks-viz'),
    chartViz: document.getElementById('chart-viz'),
    tokenChart: document.getElementById('token-chart'),
    vector3dViz: document.getElementById('vector3d-viz'),
    vector3dContainer: document.getElementById('vector3d-container'),
    
    // 3D Viz Controls
    rotationSpeed: document.getElementById('rotation-speed'),
    particleSize: document.getElementById('particle-size'),
    resetCameraBtn: document.getElementById('reset-camera-btn'),
    toggleAnimationBtn: document.getElementById('toggle-animation-btn'),
};

// Chart instance
let tokenDistributionChart = null;

// Add this CSS style to the document for 3D labels
document.head.insertAdjacentHTML('beforeend', `
<style>
.token-label-3d {
    position: absolute;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 10px;
    background-color: rgba(0, 0, 0, 0.6);
    pointer-events: none;
    user-select: none;
    z-index: 1000;
    transform: translate(-50%, -50%);
    white-space: nowrap;
    text-shadow: 1px 1px 2px black;
    box-shadow: 0 0 5px rgba(0,0,0,0.5);
}

.token-hover-effect {
    position: absolute;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.8);
    pointer-events: none;
    user-select: none;
    z-index: 2000;
    max-width: 200px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.5);
}
</style>
`);

// Initialize the application
async function init() {
    // Load available encoders
    await loadEncoders();
    
    // Set up event listeners
    setupEventListeners();
    
    // Update UI state
    updateUIState();
    
    // Add welcome animation
    document.querySelector('.app-header').classList.add('animate__animated', 'animate__fadeIn');
    
    // Add hover animations to buttons
    addButtonAnimations();
}

// Load available encoders from the API
async function loadEncoders() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/encodings`);
        const encodings = await response.json();
        
        // Clear existing options
        elements.encoderSelect.innerHTML = '<option value="" disabled selected>Select an encoder</option>';
        
        // Add each encoding as an option
        encodings.forEach(encoding => {
            const option = document.createElement('option');
            option.value = encoding.name;
            option.text = encoding.name;
            option.dataset.vocabSize = encoding.vocab_size;
            if (encoding.eot_token) {
                option.dataset.eotToken = encoding.eot_token;
            }
            elements.encoderSelect.appendChild(option);
        });
        
        // Select cl100k_base by default if available
        const defaultEncoder = 'cl100k_base';
        const hasDefault = Array.from(elements.encoderSelect.options).some(option => option.value === defaultEncoder);
        if (hasDefault) {
            elements.encoderSelect.value = defaultEncoder;
            state.selectedEncoder = defaultEncoder;
            updateEncoderInfo();
        }
    } catch (error) {
        console.error('Error loading encoders:', error);
        showToast('Failed to load encoders. Please try refreshing the page.', 'error');
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Encoder selection
    elements.encoderSelect.addEventListener('change', () => {
        state.selectedEncoder = elements.encoderSelect.value;
        updateEncoderInfo();
    });
    
    // Encoder details button
    elements.encoderDetailsBtn.addEventListener('click', showEncoderDetails);
    
    // Special tokens toggle
    elements.allowSpecialToggle.addEventListener('change', () => {
        state.allowSpecial = elements.allowSpecialToggle.checked;
        elements.specialTokensInput.disabled = !state.allowSpecial;
        updateUIState();
    });
    
    // Special tokens input
    elements.specialTokensInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            addSpecialToken(e.target.value.trim());
            e.target.value = '';
        }
    });
    
    // Encode button
    elements.encodeBtn.addEventListener('click', encodeText);
    
    // Decode button
    elements.decodeBtn.addEventListener('click', decodeTokens);
    
    // Clear button
    elements.clearTextBtn.addEventListener('click', () => {
        elements.inputText.value = '';
        updateCharCount();
        // Clear tokens and decoded text
        state.currentTokens = [];
        state.currentTokenTexts = [];
        elements.tokensContainer.innerHTML = '<p class="placeholder-text">Tokens will appear here</p>';
        document.getElementById('decoded-display').innerHTML = '<p class="empty-message">Decoded text will appear here...</p>';
        // Reset stats
        elements.tokenCount.textContent = '0';
        elements.charCount.textContent = '0';
        elements.compressionRatio.textContent = '-';
        // Disable buttons
        elements.decodeBtn.disabled = true;
        elements.visualizeBtn.disabled = true;
        elements.copyTokensBtn.disabled = true;
    });
    
    // Clear decoded button
    document.getElementById('clear-decoded-btn').addEventListener('click', () => {
        document.getElementById('decoded-display').innerHTML = '<p class="empty-message">Decoded text will appear here...</p>';
        showToast('Decoded text cleared', 'info');
    });
    
    // Copy decoded button
    document.getElementById('copy-decoded-btn').addEventListener('click', () => {
        const decodedText = document.getElementById('decoded-display').textContent;
        if (decodedText && decodedText !== 'Decoded text will appear here...') {
            navigator.clipboard.writeText(decodedText)
                .then(() => {
                    showToast('Decoded text copied to clipboard', 'success');
                })
                .catch(err => {
                    console.error('Error copying decoded text:', err);
                    showToast('Failed to copy decoded text', 'error');
                });
        } else {
            showToast('No decoded text to copy', 'warning');
        }
    });
    
    // Sample text button
    elements.sampleTextBtn.addEventListener('click', loadSampleText);
    
    // Copy tokens button
    elements.copyTokensBtn.addEventListener('click', copyTokensToClipboard);
    
    // Visualize button
    elements.visualizeBtn.addEventListener('click', showVisualization);
    
    // Close modal buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal);
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
    
    // Visualization tab buttons
    document.querySelectorAll('.viz-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const vizType = e.target.dataset.viz;
            switchVisualizationTab(vizType);
        });
    });
    
    // Character count update on input
    elements.inputText.addEventListener('input', updateCharCount);
    
    // Input text also triggers encode on Enter + Ctrl
    elements.inputText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            encodeText();
            e.preventDefault();
        }
    });
    
    // Add input event listener to auto-encode after typing stops
    let typingTimer;
    elements.inputText.addEventListener('input', () => {
        clearTimeout(typingTimer);
        updateCharCount();
        
        // Auto-encode after 500ms of stopping typing
        typingTimer = setTimeout(() => {
            if (elements.inputText.value.trim() && state.selectedEncoder) {
                encodeText();
            }
        }, 500);
    });
    
    // 3D visualization controls
    elements.rotationSpeed.addEventListener('input', (e) => {
        // Update rotation speed in real-time
        // The actual speed will be applied in the animation loop
    });
    
    elements.particleSize.addEventListener('input', (e) => {
        if (state.threeJsParticles) {
            state.threeJsParticles.material.size = parseInt(e.target.value);
        }
    });
    
    elements.resetCameraBtn.addEventListener('click', () => {
        if (state.threeJsCamera && state.threeJsControls) {
            // Reset to initial position
            state.threeJsCamera.position.set(0, 0, 100);
            state.threeJsCamera.lookAt(0, 0, 0);
            state.threeJsControls.reset();
            showToast('Camera view reset', 'info');
        }
    });
    
    elements.toggleAnimationBtn.addEventListener('click', () => {
        state.threeJsAnimationActive = !state.threeJsAnimationActive;
        elements.toggleAnimationBtn.textContent = state.threeJsAnimationActive ? 'Pause Animation' : 'Resume Animation';
        showToast(state.threeJsAnimationActive ? 'Animation resumed' : 'Animation paused', 'info');
    });
    
    // 新增3D控制事件监听器
    
    // 标签显示/隐藏控制
    document.getElementById('show-labels-btn').addEventListener('click', () => {
        toggleLabelsVisibility(true);
    });
    
    document.getElementById('hide-labels-btn').addEventListener('click', () => {
        toggleLabelsVisibility(false);
    });
    
    // 标签大小控制
    document.getElementById('label-size').addEventListener('input', (e) => {
        updateLabelSize(parseInt(e.target.value));
    });
    
    // 标签透明度控制
    document.getElementById('label-opacity').addEventListener('input', (e) => {
        updateLabelOpacity(parseInt(e.target.value) / 100);
    });
    
    // 标签密度控制
    document.getElementById('label-density').addEventListener('change', (e) => {
        updateLabelDensity(e.target.value);
    });
    
    // 向量数据面板控制
    document.getElementById('show-vector-data-btn').addEventListener('click', () => {
        toggleVectorDataPanel(true);
    });
    
    document.getElementById('hide-vector-data-btn').addEventListener('click', () => {
        toggleVectorDataPanel(false);
    });
    
    document.getElementById('close-vector-data-btn').addEventListener('click', () => {
        toggleVectorDataPanel(false);
    });
    
    // 向量数据搜索功能
    document.getElementById('vector-search').addEventListener('input', (e) => {
        filterVectorData(e.target.value);
    });
}

// Update the encoder info display
function updateEncoderInfo() {
    if (!state.selectedEncoder) {
        elements.encoderInfoText.textContent = 'No encoder selected';
        return;
    }
    
    const selectedOption = Array.from(elements.encoderSelect.options).find(option => option.value === state.selectedEncoder);
    if (!selectedOption) return;
    
    const vocabSize = selectedOption.dataset.vocabSize;
    const eotToken = selectedOption.dataset.eotToken;
    
    let infoText = `Vocab size: ${vocabSize}`;
    if (eotToken) {
        infoText += ` | EOT: ${eotToken}`;
    }
    elements.encoderInfoText.textContent = infoText;
    updateUIState();
}

// Show encoder details in a modal
async function showEncoderDetails() {
    if (!state.selectedEncoder) {
        showToast('Please select an encoder first', 'warning');
        return;
    }
    
    // Show loading state
    elements.encoderDetailsContainer.innerHTML = '<div class="loader"></div>';
    elements.modalTitle.textContent = `Encoder: ${state.selectedEncoder}`;
    showModal(elements.encoderModal);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/encoding_info/${state.selectedEncoder}`);
        const info = await response.json();
        
        // Create details HTML
        let detailsHtml = `
            <div class="token-info-section">
                <h3>Basic Information</h3>
                <div class="token-info-grid">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${info.name}</span>
                    
                    <span class="info-label">Vocabulary Size:</span>
                    <span class="info-value">${info.vocab_size.toLocaleString()}</span>
        `;
        
        if (info.eot_token) {
            detailsHtml += `
                <span class="info-label">EOT Token:</span>
                <span class="info-value">${info.eot_token}</span>
                
                <span class="info-label">EOT Text:</span>
                <span class="info-value">${escapeHtml(info.eot_text || '')}</span>
            `;
        }
        
        detailsHtml += `</div></div>`;
        
        // Add special tokens section if available
        if (info.special_tokens_sample && Object.keys(info.special_tokens_sample).length > 0) {
            detailsHtml += `
                <div class="token-info-section">
                    <h3>Special Tokens Sample</h3>
                    <div class="token-info-grid">
            `;
            
            for (const [tokenText, tokenId] of Object.entries(info.special_tokens_sample)) {
                detailsHtml += `
                    <span class="info-label">${escapeHtml(tokenText)}:</span>
                    <span class="info-value">${tokenId}</span>
                `;
            }
            
            detailsHtml += `</div></div>`;
        }
        
        // Add usage section
        detailsHtml += `
            <div class="token-info-section">
                <h3>Usage</h3>
                <p>This encoder is used with the following models:</p>
                <ul class="model-list">
        `;
        
        // Model mapping (simplified)
        const modelMap = {
            'cl100k_base': ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'text-embedding-ada-002'],
            'p50k_base': ['text-davinci-003', 'text-davinci-002', 'code-davinci-002'],
            'r50k_base': ['davinci', 'curie', 'babbage', 'ada'],
            'gpt2': ['GPT-2 models']
        };
        
        const models = modelMap[info.name] || ['Unknown'];
        models.forEach(model => {
            detailsHtml += `<li>${model}</li>`;
        });
        
        detailsHtml += `</ul></div>`;
        
        // Update the container
        elements.encoderDetailsContainer.innerHTML = detailsHtml;
        
    } catch (error) {
        console.error('Error fetching encoder details:', error);
        elements.encoderDetailsContainer.innerHTML = `
            <div class="error-message">
                Failed to load encoder details. Please try again.
            </div>
        `;
    }
}

// Add a special token to the list
function addSpecialToken(token) {
    if (!token || state.specialTokens.includes(token)) return;
    
    state.specialTokens.push(token);
    renderSpecialTokens();
    showToast(`Special token "${token}" added`, 'success');
}

// Remove a special token from the list
function removeSpecialToken(token) {
    state.specialTokens = state.specialTokens.filter(t => t !== token);
    renderSpecialTokens();
    showToast(`Special token removed`, 'info');
}

// Render the special tokens chips
function renderSpecialTokens() {
    elements.tokensChipContainer.innerHTML = '';
    
    state.specialTokens.forEach(token => {
        const chip = document.createElement('div');
        chip.className = 'token-chip';
        chip.innerHTML = `
            ${escapeHtml(token)}
            <span class="remove-token" data-token="${escapeHtml(token)}">&times;</span>
        `;
        elements.tokensChipContainer.appendChild(chip);
    });
    
    // Add event listeners to remove buttons
    elements.tokensChipContainer.querySelectorAll('.remove-token').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const token = e.target.dataset.token;
            removeSpecialToken(token);
        });
    });
}

// Update stats with animation
function updateStatsWithAnimation() {
    const stats = [
        elements.tokenCount,
        elements.charCount,
        elements.compressionRatio
    ];
    
    stats.forEach(stat => {
        stat.classList.add('updated');
        setTimeout(() => {
            stat.classList.remove('updated');
        }, 1500);
    });
}

// Encode text using the selected encoder
async function encodeText() {
    if (!state.selectedEncoder) {
        showToast('Please select an encoder first', 'warning');
        return;
    }
    
    const text = elements.inputText.value.trim();
    if (!text) {
        showToast('Please enter text to encode', 'warning');
        return;
    }
    
    try {
        // Show loading indicator
        elements.tokensContainer.innerHTML = '<div class="loader"></div>';
        
        const response = await fetch(`${API_BASE_URL}/api/encode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                encoding: state.selectedEncoder,
                allow_special: state.allowSpecial,
                special_tokens: state.specialTokens
            })
        });
        
        const result = await response.json();
        
        if (result.error) {
            showToast(result.error, 'error');
            elements.tokensContainer.innerHTML = '<p class="placeholder-text">Encoding error, please try again</p>';
            return;
        }
        
        // Update state with tokens
        state.currentTokens = result.tokens;
        state.currentTokenTexts = result.token_texts;
        
        // Display tokens
        renderTokens();
        
        // Clear decoded display
        const decodedDisplay = document.getElementById('decoded-display');
        decodedDisplay.innerHTML = '<p class="empty-message">Click the "Decode" button to see the decoded text</p>';
        
        // Update stats with animation
        elements.tokenCount.textContent = result.token_count;
        updateCompressionRatio();
        updateStatsWithAnimation();
        
        // Enable visualization button
        elements.visualizeBtn.disabled = false;
        
        // Add button animations
        document.querySelectorAll('.action-btn, .btn-small').forEach(btn => {
            if (!btn.classList.contains('animate-button')) {
                btn.classList.add('animate-button');
            }
        });
        
        // Show success message
        showToast('Text encoded successfully', 'success');
        
    } catch (error) {
        console.error('Error encoding text:', error);
        showToast('Failed to encode text. Please try again.', 'error');
        elements.tokensContainer.innerHTML = '<p class="placeholder-text">Encoding error, please try again</p>';
    }
}

// Decode tokens back to text
async function decodeTokens() {
    if (!state.selectedEncoder) {
        showToast('Please select an encoder first', 'warning');
        return;
    }
    
    if (state.currentTokens.length === 0) {
        showToast('No tokens to decode', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/decode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tokens: state.currentTokens,
                encoding: state.selectedEncoder
            })
        });
        
        const result = await response.json();
        
        if (result.error) {
            showToast(result.error, 'error');
            return;
        }
        
        // Update decoded display
        const decodedDisplay = document.getElementById('decoded-display');
        decodedDisplay.innerHTML = '';
        
        const decodedText = document.createElement('div');
        decodedText.textContent = result.text;
        decodedDisplay.appendChild(decodedText);
        
        // Show success message
        showToast('Tokens decoded successfully', 'success');
        
    } catch (error) {
        console.error('Error decoding tokens:', error);
        showToast('Failed to decode tokens. Please try again.', 'error');
    }
}

// Render tokens in the tokens container
function renderTokens() {
    if (state.currentTokens.length === 0) {
        elements.tokensContainer.innerHTML = '<p class="placeholder-text">Tokens will appear here</p>';
        return;
    }
    
    elements.tokensContainer.innerHTML = '';
    
    // Create a container for token items with flex layout
    const tokenItemsContainer = document.createElement('div');
    tokenItemsContainer.className = 'token-items-container';
    
    state.currentTokens.forEach((token, index) => {
        const tokenElement = document.createElement('span');
        tokenElement.className = 'token-item';
        tokenElement.textContent = token;
        tokenElement.dataset.index = index;
        
        // 添加延迟出现动画
        tokenElement.style.animationDelay = `${index * 30}ms`;
        
        // Get the token text for display
        const tokenText = state.currentTokenTexts[index] || '[Special]';
        // Shorten token text display if needed
        const displayText = tokenText.length > 10 ? 
            tokenText.substring(0, 10) + '...' : 
            tokenText;
            
        tokenElement.title = displayText;
        
        // Add click event to show token info
        tokenElement.addEventListener('click', () => showTokenInfo(token));
        
        tokenItemsContainer.appendChild(tokenElement);
    });
    
    elements.tokensContainer.appendChild(tokenItemsContainer);
    
    // Enable token-related buttons
    elements.decodeBtn.disabled = false;
    elements.visualizeBtn.disabled = false;
    elements.copyTokensBtn.disabled = false;
}

// Show token info in a modal
async function showTokenInfo(token) {
    if (!state.selectedEncoder) return;
    
    // Show loading state
    elements.tokenInfoContainer.innerHTML = '<div class="loader"></div>';
    showModal(elements.tokenInfoModal);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/token_info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                encoding: state.selectedEncoder
            })
        });
        
        const info = await response.json();
        
        if (info.error) {
            elements.tokenInfoContainer.innerHTML = `
                <div class="error-message">
                    ${info.error}
                </div>
            `;
            return;
        }
        
        // Create info HTML
        let infoHtml = `
            <div class="token-info-section">
                <h3>Token Information</h3>
                <div class="token-info-grid">
                    <span class="info-label">Token ID:</span>
                    <span class="info-value">${info.token}</span>
                    
                    <span class="info-label">Text Representation:</span>
                    <span class="info-value">${escapeHtml(info.text)}</span>
                    
                    <span class="info-label">Byte Length:</span>
                    <span class="info-value">${info.byte_length} bytes</span>
                </div>
            </div>
            
            <div class="token-info-section">
                <h3>Byte Representation</h3>
                <div class="byte-grid">
        `;
        
        info.bytes.forEach(byte => {
            infoHtml += `
                <div class="byte-box">
                    ${byte} <small>(${byte.toString(16).padStart(2, '0')})</small>
                </div>
            `;
        });
        
        infoHtml += `</div></div>`;
        
        // Update the container
        elements.tokenInfoContainer.innerHTML = infoHtml;
        
    } catch (error) {
        console.error('Error fetching token info:', error);
        elements.tokenInfoContainer.innerHTML = `
            <div class="error-message">
                Failed to load token information. Please try again.
            </div>
        `;
    }
}

// Load sample text
function loadSampleText() {
    const sampleText = `Welcome to Tiktoken Visualizer!

Tiktoken is a fast BPE tokenizer developed by OpenAI for use with their language models.
It supports various encodings like cl100k_base (used by GPT-4), p50k_base (used by GPT-3.5), and more.

You can encode any text and see how it's broken down into tokens.
Try adding special tokens like <|endoftext|> by checking "Allow Special Tokens".

Explore different visualization options to understand how your text is tokenized! 😊`;

    elements.inputText.value = sampleText;
    updateCharCount();
}

// Update character count
function updateCharCount() {
    const text = elements.inputText.value;
    elements.charCount.textContent = text.length;
    updateCompressionRatio();
}

// Update compression ratio
function updateCompressionRatio() {
    const charCount = parseInt(elements.charCount.textContent);
    const tokenCount = parseInt(elements.tokenCount.textContent);
    
    if (charCount > 0 && tokenCount > 0) {
        const ratio = (charCount / tokenCount).toFixed(2);
        elements.compressionRatio.textContent = `${ratio}:1`;
    } else {
        elements.compressionRatio.textContent = '-';
    }
}

// Copy tokens to clipboard
function copyTokensToClipboard() {
    if (state.currentTokens.length === 0) {
        showToast('No tokens to copy', 'warning');
        return;
    }
    
    const tokensText = JSON.stringify(state.currentTokens);
    navigator.clipboard.writeText(tokensText)
        .then(() => {
            showToast('Tokens copied to clipboard', 'success');
        })
        .catch(err => {
            console.error('Error copying tokens:', err);
            showToast('Failed to copy tokens', 'error');
        });
}

// Show the visualization modal
function showVisualization() {
    showModal(elements.visualizationModal);
    
    // Clear existing visualizations
    elements.textViz.innerHTML = '';
    elements.blocksViz.innerHTML = '';
    
    // Destroy any existing chart
    if (tokenDistributionChart) {
        tokenDistributionChart.destroy();
        tokenDistributionChart = null;
    }
    
    // 默认隐藏3D控制面板
    document.querySelector('.viz-controls').style.display = 'none';
    
    // If we're viewing the 3D tab, initialize 3D visualization
    const activeTab = document.querySelector('.viz-btn.active').dataset.viz;
    
    if (activeTab === 'text') {
        generateTextVisualization();
    } else if (activeTab === 'blocks') {
        generateBlocksVisualization();
    } else if (activeTab === 'chart') {
        generateChartVisualization();
    } else if (activeTab === '3d') {
        // 只在3D视图中显示控制面板
        document.querySelector('.viz-controls').style.display = 'block';
        generateVector3DVisualization();
    }
}

// Switch between visualization tabs
function switchVisualizationTab(tabName) {
    // Update active button
    document.querySelectorAll('.viz-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.viz === tabName);
    });
    
    // Hide all panels
    document.querySelectorAll('.viz-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // 默认隐藏3D控制面板
    document.querySelector('.viz-controls').style.display = 'none';
    
    // Show the selected panel
    if (tabName === 'text') {
        elements.textViz.classList.add('active');
        if (elements.textViz.innerHTML === '') {
            generateTextVisualization();
        }
        // 停止3D动画
        if (state.threeJsAnimationId) {
            state.threeJsAnimationActive = false;
        }
    } else if (tabName === 'blocks') {
        elements.blocksViz.classList.add('active');
        if (elements.blocksViz.innerHTML === '') {
            generateBlocksVisualization();
        }
        // 停止3D动画
        if (state.threeJsAnimationId) {
            state.threeJsAnimationActive = false;
        }
    } else if (tabName === 'chart') {
        elements.chartViz.classList.add('active');
        if (!tokenDistributionChart) {
            generateChartVisualization();
        }
        // 停止3D动画
        if (state.threeJsAnimationId) {
            state.threeJsAnimationActive = false;
        }
    } else if (tabName === '3d') {
        elements.vector3dViz.classList.add('active');
        // 只在3D视图中显示控制面板
        document.querySelector('.viz-controls').style.display = 'block';
        
        if (!state.threeJsScene) {
            generateVector3DVisualization();
        } else {
            // 如果切换回3D视图并且渲染器已存在
            // 确保根据设置恢复动画
            resumeVector3DVisualization();
            state.threeJsAnimationActive = true;
        }
    }
}

// Generate text visualization
function generateTextVisualization() {
    if (state.currentTokens.length === 0) return;
    
    elements.textViz.innerHTML = '';
    
    const textContainer = document.createElement('div');
    textContainer.className = 'text-viz-container';
    
    state.currentTokens.forEach((token, index) => {
        const tokenText = state.currentTokenTexts[index] || '';
        const escapedText = escapeHtml(tokenText);
        
        const tokenSpan = document.createElement('span');
        tokenSpan.className = 'text-token-highlight';
        tokenSpan.dataset.tokenId = token;
        tokenSpan.innerHTML = escapedText || '&nbsp;'; // Use non-breaking space if empty
        tokenSpan.title = `Token ID: ${token}`;
        
        // Add click event listener
        tokenSpan.addEventListener('click', () => {
            showTokenInfo(token);
        });
        
        textContainer.appendChild(tokenSpan);
    });
    
    elements.textViz.appendChild(textContainer);
}

// Generate block-based visualization
function generateBlocksVisualization() {
    if (state.currentTokens.length === 0) return;
    
    elements.blocksViz.innerHTML = '';
    
    // Create a container with grid layout for token blocks
    const blocksContainer = document.createElement('div');
    blocksContainer.className = 'token-grid';
    
    state.currentTokens.forEach((token, index) => {
        const tokenText = state.currentTokenTexts[index] || '[SPECIAL]';
        const escapedText = escapeHtml(tokenText);
        
        // Create block element
        const blockElement = document.createElement('div');
        blockElement.className = 'token-block';
        blockElement.dataset.tokenId = token;
        
        // Create ID element
        const idElement = document.createElement('div');
        idElement.className = 'token-id';
        idElement.textContent = token;
        
        // Create text element
        const textElement = document.createElement('div');
        textElement.className = 'token-text';
        textElement.innerHTML = escapedText || '&nbsp;';
        
        // Append elements
        blockElement.appendChild(idElement);
        blockElement.appendChild(textElement);
        
        // Add click event
        blockElement.addEventListener('click', () => {
            showTokenInfo(token);
        });
        
        blocksContainer.appendChild(blockElement);
    });
    
    elements.blocksViz.appendChild(blocksContainer);
}

// Generate chart visualization
function generateChartVisualization() {
    if (state.currentTokens.length === 0) return;
    
    // Count token frequencies
    const tokenFrequency = {};
    state.currentTokens.forEach(token => {
        tokenFrequency[token] = (tokenFrequency[token] || 0) + 1;
    });
    
    // Sort by frequency
    const sortedTokens = Object.entries(tokenFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20); // Show top 20 tokens
    
    const tokenIds = sortedTokens.map(t => t[0]);
    const frequencies = sortedTokens.map(t => t[1]);
    
    // Get token texts for labels
    const tokenTexts = tokenIds.map(id => {
        const index = state.currentTokens.indexOf(parseInt(id));
        return index >= 0 ? state.currentTokenTexts[index] : 'unknown';
    });
    
    // Destroy previous chart if exists
    if (tokenDistributionChart) {
        tokenDistributionChart.destroy();
    }
    
    // Create the chart
    const ctx = elements.tokenChart.getContext('2d');
    tokenDistributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: tokenIds.map((id, idx) => `${id} (${tokenTexts[idx].substring(0, 10)}${tokenTexts[idx].length > 10 ? '...' : ''})`),
            datasets: [{
                label: 'Token Frequency',
                data: frequencies,
                backgroundColor: 'rgba(0, 191, 165, 0.6)',
                borderColor: 'rgba(0, 191, 165, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Frequency'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Token ID (Text Preview)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const idx = tooltipItems[0].dataIndex;
                            return `Token: ${tokenIds[idx]}`;
                        },
                        label: function(context) {
                            const idx = context.dataIndex;
                            return [
                                `Frequency: ${frequencies[idx]}`,
                                `Text: ${tokenTexts[idx]}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// Generate 3D vector visualization
async function generateVector3DVisualization() {
    // Show loading indicator
    elements.vector3dContainer.innerHTML = `
        <div class="vector-loading">
            <div class="spinner"></div>
            <span>Generating 3D visualization...</span>
        </div>
    `;
    
    try {
        // Convert tokens to vectors using our backend API
        const response = await fetch(`${API_BASE_URL}/api/tokens_to_vectors`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tokens: state.currentTokens,
                dimensions: 3,
                encoding: state.selectedEncoder // 传递当前选择的编码器名称
            })
        });
        
        const data = await response.json();
        
        if (!data.vectors || data.vectors.length === 0) {
            throw new Error('No vectors returned from the API');
        }
        
        // 保存原始向量数据供向量面板使用
        state.vectorData = data.vectors;
        
        // Clear the container
        elements.vector3dContainer.innerHTML = '';
        
        // Initialize Three.js
        initThreeJsScene(data.vectors);
        
        // 更新向量面板中的说明，提示用户这是基于语义的分布
        const vectorInfoElement = document.querySelector('.viz-info');
        if (vectorInfoElement) {
            vectorInfoElement.innerHTML = `
                <p>Use mouse to rotate, scroll to zoom, and right-click to pan</p>
                <p>Each colored sphere represents a token in 3D space</p>
                <p><strong>Note:</strong> Tokens with similar text characteristics are positioned closer together</p>
            `;
        }
        
    } catch (error) {
        console.error('Error generating 3D visualization:', error);
        elements.vector3dContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666;">
                <p>Error generating 3D visualization: ${error.message}</p>
                <p>Please try again with different text or fewer tokens.</p>
            </div>
        `;
    }
}

// Simple OrbitControls implementation to avoid dependency issues
class SimpleOrbitControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = new THREE.Vector3(0, 0, 0);
        this.enableDamping = false;
        this.dampingFactor = 0.05;
        this.enableZoom = true;
        this.enableRotate = true;
        
        // Initial position
        this.spherical = new THREE.Spherical(
            camera.position.distanceTo(this.target),
            Math.PI / 2,
            0
        );
        
        // State variables
        this.isMouseDown = false;
        this.mousePosition = { x: 0, y: 0 };
        this.rotateSpeed = 1.0;
        this.zoomSpeed = 1.0;
        
        // Event listeners
        this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.domElement.addEventListener('wheel', this.onMouseWheel.bind(this));
        
        // Initial update
        this.update();
    }
    
    onMouseDown(event) {
        this.isMouseDown = true;
        this.mousePosition.x = event.clientX;
        this.mousePosition.y = event.clientY;
    }
    
    onMouseMove(event) {
        if (!this.isMouseDown || !this.enableRotate) return;
        
        const deltaX = event.clientX - this.mousePosition.x;
        const deltaY = event.clientY - this.mousePosition.y;
        
        // Update spherical coordinates
        this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - deltaY * 0.005 * this.rotateSpeed));
        this.spherical.theta += deltaX * 0.005 * this.rotateSpeed;
        
        this.mousePosition.x = event.clientX;
        this.mousePosition.y = event.clientY;
        
        this.update();
    }
    
    onMouseUp() {
        this.isMouseDown = false;
    }
    
    onMouseWheel(event) {
        if (!this.enableZoom) return;
        
        event.preventDefault();
        
        // Zoom in/out
        this.spherical.radius += event.deltaY * 0.05 * this.zoomSpeed;
        this.spherical.radius = Math.max(1, Math.min(500, this.spherical.radius));
        
        this.update();
    }
    
    update() {
        // Convert spherical to cartesian
        const sinPhiRadius = Math.sin(this.spherical.phi) * this.spherical.radius;
        
        this.camera.position.x = sinPhiRadius * Math.sin(this.spherical.theta) + this.target.x;
        this.camera.position.y = Math.cos(this.spherical.phi) * this.spherical.radius + this.target.y;
        this.camera.position.z = sinPhiRadius * Math.cos(this.spherical.theta) + this.target.z;
        
        this.camera.lookAt(this.target);
    }
    
    reset() {
        this.spherical.set(100, Math.PI / 2, 0);
        this.update();
    }
}

// Initialize Three.js scene
function initThreeJsScene(vectors) {
    // Clean up existing scene if any
    if (state.threeJsAnimationId) {
        cancelAnimationFrame(state.threeJsAnimationId);
        state.threeJsAnimationId = null;
    }
    
    if (state.threeJsRenderer) {
        elements.vector3dContainer.removeChild(state.threeJsRenderer.domElement);
        state.threeJsRenderer.dispose();
    }
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    
    // Create camera
    const aspectRatio = elements.vector3dContainer.clientWidth / elements.vector3dContainer.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    camera.position.z = 100;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(elements.vector3dContainer.clientWidth, elements.vector3dContainer.clientHeight);
    elements.vector3dContainer.appendChild(renderer.domElement);
    
    // Create controls - use our SimpleOrbitControls
    const controls = new SimpleOrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10);
    scene.add(directionalLight);
    
    // Create particle geometry
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = [];
    const particleColors = [];
    const particleData = [];
    
    // Generate positions and colors for each vector
    vectors.forEach((vector, index) => {
        // Position from vector
        particlePositions.push(vector.vector[0] * 10, vector.vector[1] * 10, vector.vector[2] * 10);
        
        // Generate a unique color based on token
        const hue = (vector.token % 360) / 360;
        const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
        
        particleColors.push(color.r, color.g, color.b);
        
        // Store token data for interaction
        particleData.push({
            token: vector.token,
            position: new THREE.Vector3(vector.vector[0] * 10, vector.vector[1] * 10, vector.vector[2] * 10),
            text: state.currentTokenTexts[index] || "[Unknown]"
        });
    });
    
    // Set geometry attributes
    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(particleColors, 3));
    
    // Create particle material with custom shader for better-looking points
    const particleMaterial = new THREE.PointsMaterial({
        size: parseInt(elements.particleSize.value),
        vertexColors: true,
        map: createParticleTexture(),
        alphaTest: 0.5,
        transparent: true
    });
    
    // Create particle system
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    // Add token labels
    const tokenLabels = [];
    
    particleData.forEach((data, index) => {
        // Create HTML label element
        const label = document.createElement('div');
        label.className = 'token-label-3d';
        label.textContent = `${data.token}`;
        label.style.fontSize = `${state.labelSize}px`;
        label.style.opacity = '0';
        label.style.backgroundColor = `hsla(${(data.token % 360)}, 80%, 50%, 0.7)`;
        
        // 根据密度设置初始显示状态
        const shouldBeVisible = (index / vectors.length) < 
            (state.labelDensity === 'all' ? 1.0 :
            state.labelDensity === 'high' ? 0.75 :
            state.labelDensity === 'medium' ? 0.5 :
            state.labelDensity === 'low' ? 0.25 : 0);
        
        if (!shouldBeVisible) {
            label.style.display = 'none';
        }
        
        elements.vector3dContainer.appendChild(label);
        
        tokenLabels.push({
            element: label,
            position: data.position.clone(),
            token: data.token,
            text: data.text
        });
    });
    
    // Create a container for the hover info
    const hoverInfo = document.createElement('div');
    hoverInfo.className = 'token-hover-effect';
    hoverInfo.style.display = 'none';
    elements.vector3dContainer.appendChild(hoverInfo);
    
    // Raycaster for hover detection
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 5;
    
    // Mouse position for raycasting
    const mouse = new THREE.Vector2();
    
    // Event listeners for interaction
    let hoveredPoint = null;
    
    elements.vector3dContainer.addEventListener('mousemove', (event) => {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = elements.vector3dContainer.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update the hover info position
        hoverInfo.style.left = (event.clientX - rect.left + 15) + 'px';
        hoverInfo.style.top = (event.clientY - rect.top - 15) + 'px';
    });
    
    // Animation clock
    const clock = new THREE.Clock();
    
    // Animation loop
    function animate() {
        state.threeJsAnimationId = requestAnimationFrame(animate);
        
        // Update controls
        controls.update();
        
        // Rotate the particles if animation is active
        if (state.threeJsAnimationActive) {
            const rotationSpeed = parseInt(elements.rotationSpeed.value) / 5000;
            particles.rotation.y += rotationSpeed;
        }
        
        // Calculate elapsed time for animations
        const elapsedTime = clock.getElapsedTime();
        
        // Update raycaster
        raycaster.setFromCamera(mouse, camera);
        
        // Find intersections
        const intersects = raycaster.intersectObject(particles);
        
        if (intersects.length > 0) {
            // We have a hover
            const pointIndex = intersects[0].index;
            
            if (hoveredPoint !== pointIndex) {
                // 如果悬停点发生变化
                
                // 恢复之前的悬停点大小（如果有）
                if (hoveredPoint !== null) {
                    particleMaterial.size = parseInt(elements.particleSize.value);
                }
                
                hoveredPoint = pointIndex;
                
                // Show hover info
                const tokenText = state.currentTokenTexts[pointIndex] || "[Unknown]";
                hoverInfo.innerHTML = `
                    <div><strong>Token ID:</strong> ${state.currentTokens[pointIndex]}</div>
                    <div><strong>Text:</strong> ${escapeHtml(tokenText)}</div>
                `;
                hoverInfo.style.display = 'block';
                
                // 调整当前悬停点的大小，但仅调整一次
                const originalSize = particleMaterial.size;
                particleMaterial.size = originalSize * 1.5;
            }
        } else {
            if (hoveredPoint !== null) {
                // 鼠标离开点时，恢复原始大小
                particleMaterial.size = parseInt(elements.particleSize.value);
                hoveredPoint = null;
                hoverInfo.style.display = 'none';
            }
        }
        
        // 更新标签，考虑控制设置
        tokenLabels.forEach((label, index) => {
            // 根据密度设置确定是否应该显示
            const shouldBeVisible = (index / tokenLabels.length) < 
                (state.labelDensity === 'all' ? 1.0 :
                state.labelDensity === 'high' ? 0.75 :
                state.labelDensity === 'medium' ? 0.5 :
                state.labelDensity === 'low' ? 0.25 : 0);
            
            // 如果全局或密度设置为隐藏，则直接隐藏
            if (!state.labelsVisible || !shouldBeVisible) {
                label.element.style.display = 'none';
                return;
            }
            
            // Project position to screen space
            const screenPosition = label.position.clone();
            screenPosition.project(camera);
            
            // Convert to CSS coordinates
            const x = (screenPosition.x * 0.5 + 0.5) * elements.vector3dContainer.clientWidth;
            const y = (-screenPosition.y * 0.5 + 0.5) * elements.vector3dContainer.clientHeight;
            
            // Check if the label is in front of the camera
            const isBehindCamera = screenPosition.z > 1;
            
            if (isBehindCamera) {
                label.element.style.display = 'none';
            } else {
                // Calculate distance to camera to fade labels that are far away
                const distance = label.position.distanceTo(camera.position);
                const maxDistance = 100;
                const distanceFactor = 1 - Math.min(distance / maxDistance, 0.8);
                
                // 应用用户设置的透明度
                const finalOpacity = state.labelOpacity * distanceFactor;
                
                // Only show labels if they're close enough to be visible
                if (finalOpacity > 0.1) {
                    label.element.style.display = 'block';
                    label.element.style.opacity = finalOpacity.toString();
                    // Position the label
                    label.element.style.left = `${x}px`;
                    label.element.style.top = `${y}px`;
                    label.element.style.transform = 'translate(-50%, -50%)';
                } else {
                    label.element.style.display = 'none';
                }
            }
        });
        
        // Render scene
        renderer.render(scene, camera);
    }
    
    // Start animation
    animate();
    
    // Store references for cleanup and interaction
    state.threeJsScene = scene;
    state.threeJsRenderer = renderer;
    state.threeJsCamera = camera;
    state.threeJsControls = controls;
    state.threeJsParticles = particles;
    state.threeJsTokenLabels = tokenLabels;
    state.threeJsHoverInfo = hoverInfo;
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Show toast to indicate visualization is ready
    showToast('3D vector visualization ready. Use mouse to interact.', 'success');
}

// Create circular particle texture
function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2
    );
    
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Handle window resize
function handleResize() {
    if (state.threeJsCamera && state.threeJsRenderer) {
        // Update camera aspect ratio
        state.threeJsCamera.aspect = elements.vector3dContainer.clientWidth / elements.vector3dContainer.clientHeight;
        state.threeJsCamera.updateProjectionMatrix();
        
        // Update renderer size
        state.threeJsRenderer.setSize(
            elements.vector3dContainer.clientWidth,
            elements.vector3dContainer.clientHeight
        );
    }
}

// Resume 3D visualization
function resumeVector3DVisualization() {
    if (state.threeJsAnimationId === null && state.threeJsScene) {
        // Clean up any old labels
        if (state.threeJsTokenLabels) {
            state.threeJsTokenLabels.forEach(label => {
                if (label.element && label.element.parentNode) {
                    label.element.parentNode.removeChild(label.element);
                }
            });
        }
        
        // Remove hover info
        if (state.threeJsHoverInfo && state.threeJsHoverInfo.parentNode) {
            state.threeJsHoverInfo.parentNode.removeChild(state.threeJsHoverInfo);
        }
        
        // Get particles from the scene
        const particles = state.threeJsParticles;
        
        // Reset animation state
        state.threeJsAnimationActive = true;
        elements.toggleAnimationBtn.textContent = 'Pause Animation';
        
        // Set camera back to view the scene
        state.threeJsCamera.position.z = 100;
        state.threeJsControls.update();
        
        // Restart animation loop
        function animate() {
            // 只在3D视图处于激活状态时继续动画
            if (!elements.vector3dViz.classList.contains('active')) {
                state.threeJsAnimationId = null;
                return;
            }
            
            state.threeJsAnimationId = requestAnimationFrame(animate);
            
            // Update controls
            state.threeJsControls.update();
            
            // Rotate the particles if animation is active
            if (state.threeJsAnimationActive) {
                const rotationSpeed = parseInt(elements.rotationSpeed.value) / 5000;
                particles.rotation.y += rotationSpeed;
            }
            
            // Render scene
            state.threeJsRenderer.render(state.threeJsScene, state.threeJsCamera);
        }
        
        // Start animation
        animate();
    }
}

// Show modal
function showModal(modal) {
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('visible');
    }, 10);
}

// Close modal
function closeModal(modal) {
    modal.classList.remove('visible');
    setTimeout(() => {
        modal.style.display = 'none';
        
        // If closing visualization modal, clean up Three.js resources
        if (modal === elements.visualizationModal && state.threeJsAnimationId) {
            // Cancel animation frame
            cancelAnimationFrame(state.threeJsAnimationId);
            state.threeJsAnimationId = null;
            state.threeJsAnimationActive = false;
            
            // Remove event listener for resize
            window.removeEventListener('resize', handleResize);
            
            // Clean up token labels
            if (state.threeJsTokenLabels) {
                state.threeJsTokenLabels.forEach(label => {
                    if (label.element && label.element.parentNode) {
                        label.element.parentNode.removeChild(label.element);
                    }
                });
                state.threeJsTokenLabels = null;
            }
            
            // Remove hover info
            if (state.threeJsHoverInfo && state.threeJsHoverInfo.parentNode) {
                state.threeJsHoverInfo.parentNode.removeChild(state.threeJsHoverInfo);
                state.threeJsHoverInfo = null;
            }
            
            // Reset particle size to avoid size issues on next opening
            if (state.threeJsParticles && state.threeJsParticles.material) {
                state.threeJsParticles.material.size = parseInt(elements.particleSize.value);
            }
        }
    }, 300);
}

// Update UI state based on current state
function updateUIState() {
    // Enable/disable encode button
    elements.encodeBtn.disabled = !state.selectedEncoder;
    
    // Enable/disable decode button
    elements.decodeBtn.disabled = !state.selectedEncoder || state.currentTokens.length === 0;
    
    // Enable/disable visualize button
    elements.visualizeBtn.disabled = state.currentTokens.length === 0;
    
    // Enable/disable special tokens input
    elements.specialTokensInput.disabled = !state.allowSpecial;
}

// Show a toast notification
function showToast(message, type = 'info') {
    // Create toast if it doesn't exist
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
        
        // Add styles
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.color = 'white';
        toast.style.zIndex = '1000';
        toast.style.transition = 'opacity 0.3s, transform 0.3s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
    }
    
    // Set style based on type
    switch (type) {
        case 'success':
            toast.style.backgroundColor = 'var(--success-color)';
            break;
        case 'error':
            toast.style.backgroundColor = 'var(--error-color)';
            break;
        case 'warning':
            toast.style.backgroundColor = 'var(--warning-color)';
            break;
        default:
            toast.style.backgroundColor = 'var(--primary-color)';
    }
    
    // Set message
    toast.textContent = message;
    
    // Show toast
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    
    // Hide after 3 seconds
    clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
    }, 3000);
}

// Escape HTML characters
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Add hover animations to buttons
function addButtonAnimations() {
    // Add animate-button class to all action buttons
    document.querySelectorAll('.action-btn, .btn-small').forEach(btn => {
        if (!btn.classList.contains('animate-button')) {
            btn.classList.add('animate-button');
        }
    });
    
    // Add click ripple effect to all buttons
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', function(e) {
            const x = e.clientX - e.target.getBoundingClientRect().left;
            const y = e.clientY - e.target.getBoundingClientRect().top;
            
            const ripple = document.createElement('span');
            ripple.classList.add('ripple-effect');
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Add animation to panel headers
    document.querySelectorAll('.panel-header').forEach(header => {
        header.addEventListener('mouseenter', function() {
            const title = this.querySelector('h2') || this.querySelector('h3');
            if (title) {
                title.style.transform = 'translateX(5px)';
            }
        });
        
        header.addEventListener('mouseleave', function() {
            const title = this.querySelector('h2') || this.querySelector('h3');
            if (title) {
                title.style.transform = 'translateX(0)';
            }
        });
    });
}

// 切换标签显示/隐藏
function toggleLabelsVisibility(show) {
    // 更新按钮状态
    document.getElementById('show-labels-btn').classList.toggle('active', show);
    document.getElementById('hide-labels-btn').classList.toggle('active', !show);
    
    // 处理标签显示
    if (state.threeJsTokenLabels) {
        state.threeJsTokenLabels.forEach(label => {
            if (label.element) {
                label.element.style.display = show ? 'block' : 'none';
            }
        });
    }
    
    // 保存状态
    state.labelsVisible = show;
}

// 更新标签大小
function updateLabelSize(size) {
    if (state.threeJsTokenLabels) {
        state.threeJsTokenLabels.forEach(label => {
            if (label.element) {
                label.element.style.fontSize = `${size}px`;
            }
        });
    }
    
    // 保存状态
    state.labelSize = size;
}

// 更新标签透明度
function updateLabelOpacity(opacity) {
    // 只更新可见标签的透明度
    if (state.threeJsTokenLabels && state.labelsVisible) {
        state.threeJsTokenLabels.forEach(label => {
            if (label.element && label.element.style.display !== 'none') {
                // 保留原有的距离衰减效果，但基础透明度由滑块控制
                const distance = label.position.distanceTo(state.threeJsCamera.position);
                const maxDistance = 100;
                const distanceFactor = 1 - Math.min(distance / maxDistance, 0.8);
                const finalOpacity = opacity * distanceFactor;
                
                if (finalOpacity > 0.1) {
                    label.element.style.opacity = finalOpacity.toString();
                } else {
                    label.element.style.display = 'none';
                }
            }
        });
    }
    
    // 保存状态
    state.labelOpacity = opacity;
}

// 更新标签密度
function updateLabelDensity(density) {
    if (!state.threeJsTokenLabels) return;
    
    let visibilityThreshold;
    
    switch(density) {
        case 'all':
            visibilityThreshold = 1.0;
            break;
        case 'high':
            visibilityThreshold = 0.75;
            break;
        case 'medium':
            visibilityThreshold = 0.5;
            break;
        case 'low':
            visibilityThreshold = 0.25;
            break;
        case 'none':
            visibilityThreshold = 0;
            break;
        default:
            visibilityThreshold = 0.75;
    }
    
    state.threeJsTokenLabels.forEach((label, index) => {
        if (label.element) {
            // 根据索引和密度阈值确定是否显示
            const shouldShow = (index / state.threeJsTokenLabels.length) < visibilityThreshold;
            
            // 如果全局设置了隐藏标签，则忽略密度设置
            if (state.labelsVisible && shouldShow) {
                label.element.style.display = 'block';
            } else {
                label.element.style.display = 'none';
            }
        }
    });
    
    // 保存状态
    state.labelDensity = density;
}

// 切换显示/隐藏向量数据面板
function toggleVectorDataPanel(show) {
    const panel = document.getElementById('vector-data-panel');
    const showBtn = document.getElementById('show-vector-data-btn');
    const hideBtn = document.getElementById('hide-vector-data-btn');
    
    panel.style.display = show ? 'flex' : 'none';
    showBtn.classList.toggle('active', show);
    hideBtn.classList.toggle('active', !show);
    
    // 如果显示面板，则初始化或刷新数据
    if (show) {
        populateVectorData();
    }
}

// 填充向量数据表格 - 更新以显示更多信息
function populateVectorData() {
    const tbody = document.getElementById('vector-data-tbody');
    tbody.innerHTML = '';
    
    // 如果没有向量数据，则显示提示
    if (!state.threeJsTokenLabels || state.threeJsTokenLabels.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5" style="text-align:center;">No vector data available</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // 添加表头说明
    const headerInfo = document.createElement('tr');
    headerInfo.innerHTML = `
        <td colspan="5" style="text-align:center; background-color: #f0f8ff; padding: 8px; font-style: italic;">
            Using semantic-based distribution - similar tokens are positioned closer together
        </td>
    `;
    tbody.appendChild(headerInfo);
    
    // 填充数据
    state.threeJsTokenLabels.forEach(label => {
        const tr = document.createElement('tr');
        tr.dataset.tokenId = label.token;
        
        // 格式化向量坐标，保留3位小数
        const x = (label.position.x / 10).toFixed(3);
        const y = (label.position.y / 10).toFixed(3);
        const z = (label.position.z / 10).toFixed(3);
        
        // 显示token文本，限制长度避免表格过宽
        let displayText = label.text;
        if (displayText.length > 10) {
            displayText = displayText.substring(0, 10) + '...';
        }
        
        tr.innerHTML = `
            <td class="token-id-cell">${label.token}</td>
            <td title="${escapeHtml(label.text)}">${escapeHtml(displayText) || '<span style="color:#999;">[Symbol]</span>'}</td>
            <td class="vector-value">${x}</td>
            <td class="vector-value">${y}</td>
            <td class="vector-value">${z}</td>
        `;
        
        // 添加点击事件，点击行时高亮对应的点
        tr.addEventListener('click', () => {
            highlightToken(label.token);
        });
        
        tbody.appendChild(tr);
    });
}

// 根据搜索词过滤向量数据
function filterVectorData(searchTerm) {
    const tbody = document.getElementById('vector-data-tbody');
    const rows = tbody.querySelectorAll('tr');
    
    if (!searchTerm) {
        // 如果没有搜索词，显示所有行并移除高亮
        rows.forEach(row => {
            row.style.display = '';
            // 移除任何已有的高亮
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => {
                cell.innerHTML = cell.innerHTML.replace(/<mark class="search-highlight">(.*?)<\/mark>/g, '$1');
            });
        });
        return;
    }
    
    searchTerm = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const tokenId = row.dataset.tokenId;
        const text = row.cells[1].textContent.toLowerCase();
        
        // 检查是否匹配token ID或文本
        if (tokenId.includes(searchTerm) || text.includes(searchTerm)) {
            row.style.display = '';
            
            // 高亮匹配的内容
            if (tokenId.includes(searchTerm)) {
                const cell = row.cells[0];
                const content = cell.textContent;
                const regex = new RegExp(searchTerm, 'gi');
                cell.innerHTML = content.replace(regex, match => `<mark class="search-highlight">${match}</mark>`);
            }
            
            if (text.includes(searchTerm)) {
                const cell = row.cells[1];
                const content = cell.textContent;
                const regex = new RegExp(searchTerm, 'gi');
                cell.innerHTML = content.replace(regex, match => `<mark class="search-highlight">${match}</mark>`);
            }
        } else {
            row.style.display = 'none';
        }
    });
}

// 高亮特定token对应的点
function highlightToken(tokenId) {
    // 重置所有点的大小
    if (state.threeJsParticles && state.threeJsParticles.material) {
        const originalSize = parseInt(elements.particleSize.value);
        state.threeJsParticles.material.size = originalSize;
        
        // 找到对应token的点并放大它
        const index = state.currentTokens.findIndex(token => token === parseInt(tokenId));
        if (index !== -1) {
            // 创建临时大小的点来突出显示
            const geometry = state.threeJsParticles.geometry;
            const positions = geometry.attributes.position.array;
            
            // 放大点，突出显示2秒后恢复
            state.threeJsParticles.material.size = originalSize * 2;
            
            // 自动滚动到对应的标签
            if (state.threeJsTokenLabels && state.threeJsTokenLabels[index]) {
                const label = state.threeJsTokenLabels[index];
                if (label.element) {
                    // 确保标签可见
                    label.element.style.display = 'block';
                    // 设置更高的不透明度
                    label.element.style.opacity = '1';
                    // 稍微放大标签
                    const originalFontSize = label.element.style.fontSize;
                    label.element.style.fontSize = `${parseInt(originalFontSize) * 1.5}px`;
                    label.element.style.fontWeight = 'bold';
                    label.element.style.backgroundColor = 'rgba(255, 215, 0, 0.8)';
                    label.element.style.zIndex = '2000';
                    
                    // 2秒后恢复
                    setTimeout(() => {
                        state.threeJsParticles.material.size = originalSize;
                        label.element.style.fontSize = originalFontSize;
                        label.element.style.fontWeight = 'normal';
                        label.element.style.backgroundColor = `hsla(${(tokenId % 360)}, 80%, 50%, 0.7)`;
                        label.element.style.zIndex = '1000';
                    }, 2000);
                }
            }
            
            // 显示提示消息
            showToast(`Highlighted token: ${tokenId}`, 'info');
        }
    }
}

// Initialize the app when the document is loaded
document.addEventListener('DOMContentLoaded', init); 